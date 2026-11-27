import type { Cell, InputTable, Targets, Analysis } from '../core/abc';
import { calculateAbc, DEFAULT_TARGETS, FIELDS } from '../core/abc';
import data from './file-decoding-data.json';
import unicode from '../core/unicode-data.json';
import type { CellValue, Worksheet } from 'exceljs';

export const FILE_LIMITS = Object.freeze({ bytes: 20 * 1024 * 1024, inflatedBytes: 100 * 1024 * 1024, rows: 100_000, columns: 1000, cells: 1_000_000 });
const CSV_ERROR = 'CSV dosyası okunamadı. Sütun ayraçlarını ve satır uzunluklarını kontrol edin.';
const XLSX_ERROR = 'Excel dosyası okunamadı. Geçerli ve parola koruması olmayan bir .xlsx dosyası seçin.';
const EMPTY_ERROR = 'Dosya boş. Başlıkları ve en az bir ürün satırını ekleyin.';
const naValues = new Set(data.na_values);
const pythonWhitespace = new Set(unicode.whitespace);

export class FileImportError extends Error {
  constructor(message: string) { super(message); this.name = 'FileImportError'; }
}

export class CsvStructureError extends FileImportError {
  constructor() { super(CSV_ERROR); }
}

export function strip(value: string): string {
  const chars = Array.from(value);
  let first = 0, last = chars.length;
  while (first < last && pythonWhitespace.has(chars[first])) first++;
  while (last > first && pythonWhitespace.has(chars[last-1])) last--;
  return chars.slice(first,last).join('');
}

function headers(values: Cell[]): string[] {
  const names = values.map((value, index) => value == null || value === '' ? `Unnamed: ${index}` : String(value));
  const normalized = names.map(strip);
  if (new Set(normalized).size !== names.length) throw new FileImportError('Tekrarlanan sütun başlıkları var.');
  const missing = FIELDS.filter(field => !normalized.includes(field));
  if (missing.length) throw new FileImportError('Eksik sütunlar: ' + missing.join(', '));
  return names;
}

function checkDimensions(rows: number, columns: number): void {
  if (rows > FILE_LIMITS.rows || columns > FILE_LIMITS.columns || rows * columns > FILE_LIMITS.cells) {
    throw new FileImportError('Dosyada çok fazla satır veya sütun var. Daha küçük bir dosya seçin.');
  }
}

function decodeCsv(bytes: Uint8Array): string {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch {
    const chars: string[] = [];
    for (const byte of bytes) {
      const char = data.cp1254[byte];
      if (char == null) throw new FileImportError('CSV dosyasını UTF-8 olarak kaydedin.');
      chars.push(char);
    }
    return chars.join('');
  }
}

/** Detect only the three advertised separators, outside quoted header fields. */
function delimiter(text: string, flexible = false): string {
  let quoted = false;
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  const start = text.search(/[^\r\n \t]/);
  if (start < 0) throw new FileImportError(EMPTY_ERROR);
  // pandas' sep=None sniffer fails on a blank line before the header.
  if (!flexible && /[\r\n]/.test(text.slice(0, start))) throw new CsvStructureError();
  const evidence = { ',': 0, ';': 0, '\t': 0 } as Record<string, number>;
  let lines = 0;
  for (let i = start; i <= text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (char === '\n' || char === '\r' || char === undefined) {
        if (!flexible) break;
        for (const key of Object.keys(counts)) {
          if (counts[key] >= 2) evidence[key]++;
          counts[key] = 0;
        }
        if (char === '\r' && text[i + 1] === '\n') i++;
        if (++lines === 30) break;
      }
      if (char in counts) counts[char]++;
    }
  }
  const scores = flexible ? evidence : counts;
  const selected = Object.keys(scores).sort((a, b) => scores[b] - scores[a])[0];
  if (scores[selected] === 0 || (!flexible && quoted)) throw new CsvStructureError();
  return selected;
}

/** Strict state machine: escaped quotes/newlines stay in their original field. */
function csvRecords(text: string, separator: string, headerOnly = false): string[][] {
  const records: string[][] = [];
  let width = 0;
  let row: string[] = [], field = '', quoted = false, closedQuote = false, touched = false;
  const pushField = () => {
    checkDimensions(records.length, row.length + 1);
    row.push(field); field = ''; closedQuote = false;
  };
  const pushRow = () => {
    // pandas skips physically blank/whitespace-only records, not delimiter-only rows.
    if (touched || row.length || field.trim()) {
      pushField();
      width = Math.max(width, row.length);
      checkDimensions(records.length, width);
      records.push(row);
    }
    row = []; field = ''; touched = false; closedQuote = false;
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { quoted = false; closedQuote = true; }
      } else field += char;
      continue;
    }
    if (char === separator) { pushField(); touched = true; }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      pushRow();
      if (headerOnly && records.length) return records;
    } else if (closedQuote) throw new CsvStructureError();
    else if (char === '"' && field === '') { quoted = true; touched = true; }
    else { field += char; if (!/\s/.test(char)) touched = true; }
  }
  if (quoted) throw new CsvStructureError();
  pushRow();
  return records;
}

function readCsvRecords(bytes: Uint8Array, flexible = false, separator?: string): string[][] {
  const text = decodeCsv(bytes);
  if (text.includes('\0')) throw new FileImportError('CSV dosyasında geçersiz NUL karakteri var. Dosyayı yeniden kaydedin.');
  if (separator) return csvRecords(text, separator);
  if (flexible) {
    // Keep legacy delimiter selection for exact templates, including mixed decimal styles.
    let legacy: string | undefined;
    try {
      const detected = delimiter(text);
      headers(csvRecords(text, detected, true)[0] ?? []);
      legacy = detected;
    } catch (error) {
      if (!(error instanceof FileImportError)) throw error;
    }
    if (legacy) return csvRecords(text, legacy);
  }
  return csvRecords(text, delimiter(text, flexible));
}

function readCsv(bytes: Uint8Array): InputTable {
  const records = readCsvRecords(bytes);
  if (!records.length) throw new FileImportError(EMPTY_ERROR);
  const columns = headers(records[0]);
  checkDimensions(records.length - 1, columns.length);
  const rows = records.slice(1).map(record => {
    if (record.length > columns.length) throw new CsvStructureError();
    return columns.map((_, index) => {
      const cell = record[index];
      return cell === undefined || naValues.has(cell) ? null : cell;
    });
  });
  return { columns, rows };
}

/** Bound declared and actual decompressed sizes before ExcelJS allocates worksheet XML.
 * ZIP64 and encrypted ZIP entries are intentionally outside this reader's scope.
 */
async function checkZip(bytes: Uint8Array): Promise<void> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50 && i + 22 + view.getUint16(i + 20, true) === bytes.length) { end = i; break; }
  }
  if (end < 0) throw new FileImportError(XLSX_ERROR);
  const count = view.getUint16(end + 10, true);
  if (count > 10000 || view.getUint16(end + 4, true) || view.getUint16(end + 6, true)) throw new FileImportError(XLSX_ERROR);
  let offset = view.getUint32(end + 16, true), inflated = 0, actualTotal = 0;
  const directoryStart=offset;
  if (offset === 0xffffffff) throw new FileImportError(XLSX_ERROR);
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50 || (view.getUint16(offset + 8, true) & 1)) throw new FileImportError(XLSX_ERROR);
    inflated += view.getUint32(offset + 24, true);
    if (inflated > FILE_LIMITS.inflatedBytes) throw new FileImportError('Excel dosyasının açılmış boyutu çok büyük. Daha küçük bir dosya seçin.');
    const compressedSize=view.getUint32(offset+20,true),declaredSize=view.getUint32(offset+24,true);
    const method=view.getUint16(offset+10,true),local=view.getUint32(offset+42,true);
    if(local+30>directoryStart||view.getUint32(local,true)!==0x04034b50
      ||(view.getUint16(local+6,true)&1)||view.getUint16(local+8,true)!==method)throw new FileImportError(XLSX_ERROR);
    const start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
    if(start+compressedSize>directoryStart)throw new FileImportError(XLSX_ERROR);
    if(method===0){
      if(compressedSize!==declaredSize)throw new FileImportError(XLSX_ERROR);
      actualTotal+=compressedSize;
    }else if(method===8){
      if(typeof DecompressionStream==='undefined')throw new FileImportError('Güvenli Excel okuma için güncel bir tarayıcı kullanın.');
      const reader=new Blob([bytes.slice(start,start+compressedSize).buffer]).stream()
        .pipeThrough(new DecompressionStream('deflate-raw')).getReader();
      let actualSize=0;
      try{
        while(true){
          const chunk=await reader.read();if(chunk.done)break;
          actualSize+=chunk.value.byteLength;actualTotal+=chunk.value.byteLength;
          if(actualTotal>FILE_LIMITS.inflatedBytes)throw new FileImportError('Excel dosyasının açılmış boyutu çok büyük. Daha küçük bir dosya seçin.');
          if(actualSize>declaredSize)throw new FileImportError(XLSX_ERROR);
        }
      }catch(error){await reader.cancel().catch(()=>{});throw error;}
      finally{reader.releaseLock();}
      if(actualSize!==declaredSize)throw new FileImportError(XLSX_ERROR);
    }else throw new FileImportError(XLSX_ERROR);
    offset += 46 + view.getUint16(offset + 28, true) + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    if (offset > end) throw new FileImportError(XLSX_ERROR);
  }
}

function excelValue(value: CellValue | undefined): Cell {
  if (value == null) return null;
  if (value instanceof Date) {
    // Pandas gives Timestamp to parse_number; never silently treat a date as a serial number.
    if (!Number.isFinite(value.getTime())) return null;
    return value.toISOString().replace('T', ' ').replace(/\.000Z$/, '').replace(/Z$/, '000');
  }
  if (typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value) return excelValue(value.result);
    if ('error' in value) return null; // pandas maps Excel error cells to NaN.
    if ('richText' in value) return excelValue(value.richText.map(part => part.text).join(''));
    if ('text' in value) return excelValue(value.text); // hyperlink display only; never follow URL.
    return null;
  }
  return typeof value === 'string' && naValues.has(value) ? null : value;
}

async function readXlsx(bytes: Uint8Array, selected = 0, header = 1, selectable = false): Promise<{
  sheets: string[]; matrix: Cell[][]; codeOverrides: Map<string, string>; issue?: string;
}> {
  try {
    await checkZip(bytes);
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    // No fetch/readFile/URL method: user bytes are parsed in memory only.
    await workbook.xlsx.load(bytes.slice().buffer);
    const sheets = workbook.worksheets.map(sheet => sheet.name);
    if (!sheets.length) throw new FileImportError(XLSX_ERROR);
    const sheet = workbook.worksheets[selected];
    if (!sheet) throw new FileImportError('Seçilen Excel çalışma sayfası bulunamadı.');
    try {
      return { sheets, ...readWorksheet(sheet, header) };
    } catch (error) {
      if (selectable && sheets.length > 1 && error instanceof FileImportError) {
        return { sheets, matrix: [], codeOverrides: new Map(), issue: error.message };
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof FileImportError) throw error;
    throw new FileImportError(XLSX_ERROR);
  }
}

function readWorksheet(sheet: Worksheet, header: number) {
  const populated: { index: number; values: Cell[] }[] = [];
  const dates = new Map<string, Date>();
  const codeOverrides = new Map<string, string>();
  let width = 0, lastRow = 0;
  sheet.eachRow((row, index) => {
    const values: Cell[] = [];
    row.eachCell((cell, column) => {
      const value = excelValue(cell.value);
      // NA markers and Excel errors still occupy a real row; only genuinely
      // empty cells (including formulas without a stored result) trim the tail.
      const raw = cell.value;
      if (raw instanceof Date) dates.set(`${index-1}:${column-1}`, raw);
      const present = raw != null && raw !== '' && !(typeof raw === 'object'
        && ('formula' in raw || 'sharedFormula' in raw) && raw.result == null);
      if (present) {
        checkDimensions(index, column);
        values[column - 1] = value;
        const code = typeof raw === 'string' ? raw :
          typeof raw === 'object' && raw && 'result' in raw && typeof raw.result === 'string' ? raw.result : null;
        if (code && value === null) codeOverrides.set(`${index-1}:${column-1}`, code);
        if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
            && /^0{2,40}$/.test(cell.numFmt ?? '')) {
          codeOverrides.set(`${index-1}:${column-1}`, String(value).padStart(cell.numFmt.length, '0'));
        }
        width = Math.max(width, column);
        lastRow = Math.max(lastRow, index);
      }
    });
    populated.push({ index, values });
  });
  checkDimensions(lastRow, width);
  const matrix: Cell[][] = Array.from({ length: lastRow }, () => Array<Cell>(width).fill(null));
  for (const row of populated) if (row.index <= lastRow) {
    row.values.forEach((value, index) => { matrix[row.index - 1][index] = value; });
  }
  // pandas infers a homogeneous date column and formats astype(str) by column:
  // all-midnight -> date only; a fractional time -> milliseconds for every row.
  for (let column = 0; column < width; column++) {
    const members = matrix.slice(header).map((row, index) => ({ value: row[column], date: dates.get(`${index+header}:${column}`) }))
      .filter(member => member.value != null);
    if (members.length && members.every(member => member.date)) {
      const fractional = members.some(member => member.date!.getUTCMilliseconds() !== 0);
      const midnight = members.every(member => member.date!.toISOString().slice(11) === '00:00:00.000Z');
      for (let row = header; row < matrix.length; row++) {
        const date = dates.get(`${row}:${column}`);
        if (date) matrix[row][column] = midnight ? date.toISOString().slice(0,10)
          : date.toISOString().replace('T',' ').slice(0, fractional ? 23 : 19);
      }
    }
  }
  return { matrix, codeOverrides };
}

function checkedBytes(input: Uint8Array | ArrayBuffer): Uint8Array {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (bytes.length > FILE_LIMITS.bytes) throw new FileImportError('Dosya boyutu 20 MB sınırını aşıyor. Daha küçük bir dosya seçin.');
  if (!bytes.length || bytes.every(byte => [9, 10, 11, 12, 13, 32].includes(byte))) throw new FileImportError(EMPTY_ERROR);
  return bytes;
}

/** Decode bytes and validate headers; value validation is shared with the ABC core. */
export async function readInventoryFile(input: Uint8Array | ArrayBuffer, filename: string): Promise<InputTable> {
  const bytes = checkedBytes(input);
  if (/\.xlsx$/i.test(filename)) {
    const { matrix } = await readXlsx(bytes);
    return { columns: headers(matrix[0] ?? []), rows: matrix.slice(1) };
  }
  if (/\.csv$/i.test(filename)) return readCsv(bytes);
  throw new FileImportError('Yalnızca Excel ve CSV dosyaları desteklenir.');
}

export type CsvSeparator = ',' | ';' | '\t';
export interface SheetSelection { sheet: number; header: number; separator?: CsvSeparator }

export async function readImportSheet(input: ArrayBuffer, filename: string, selection: SheetSelection) {
  const bytes = checkedBytes(input);
  if (/\.xlsx$/i.test(filename)) return { ...await readXlsx(bytes, selection.sheet, selection.header, true), csv: false };
  if (/\.csv$/i.test(filename)) {
    const records = readCsvRecords(bytes, true, selection.separator);
    return {
      sheets: ['CSV'], csv: true, issue: undefined, recordWidths: records.map(row => row.length),
      matrix: records.map(row => row.map(cell => naValues.has(cell) ? null : cell)),
      codeOverrides: new Map(records.flatMap((row, rowIndex) =>
        row.flatMap((cell, column) => cell && naValues.has(cell) ? [[`${rowIndex}:${column}`, cell] as const] : []))),
    };
  }
  throw new FileImportError('Yalnızca Excel ve CSV dosyaları desteklenir.');
}

/** Browser File entry point. Nothing is uploaded or persisted. */
export async function analyzeInventoryFile(
  file: Pick<File, 'name' | 'size' | 'arrayBuffer'>,
  targets: Targets = DEFAULT_TARGETS,
): Promise<Analysis> {
  if (file.size > FILE_LIMITS.bytes) throw new FileImportError('Dosya boyutu 20 MB sınırını aşıyor. Daha küçük bir dosya seçin.');
  const source = await readInventoryFile(await file.arrayBuffer(), file.name);
  return calculateAbc(source, targets);
}
