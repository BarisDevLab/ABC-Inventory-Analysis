import type { Cell, InputTable, Targets, Analysis } from '../core/abc';
import { calculateAbc, DEFAULT_TARGETS, FIELDS } from '../core/abc';
import data from './file-decoding-data.json';
import unicode from '../core/unicode-data.json';
import type { CellValue } from 'exceljs';

export const FILE_LIMITS = Object.freeze({ bytes: 20 * 1024 * 1024, inflatedBytes: 100 * 1024 * 1024, rows: 100_000, columns: 1000, cells: 1_000_000 });
const CSV_ERROR = 'CSV dosyası okunamadı. Sütun ayraçlarını ve satır uzunluklarını kontrol edin.';
const XLSX_ERROR = 'Excel dosyası okunamadı. Geçerli ve parola koruması olmayan bir .xlsx dosyası seçin.';
const EMPTY_ERROR = 'Dosya boş. Başlıkları ve en az bir ürün satırını ekleyin.';
const naValues = new Set(data.na_values);
const pythonWhitespace = new Set(unicode.whitespace);

export class FileImportError extends Error {
  constructor(message: string) { super(message); this.name = 'FileImportError'; }
}

function strip(value: string): string {
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
function delimiter(text: string): string {
  let quoted = false;
  const counts: Record<string, number> = { ',': 0, ';': 0, '\t': 0 };
  const start = text.search(/[^\r\n \t]/);
  if (start < 0) throw new FileImportError(EMPTY_ERROR);
  // pandas' sep=None sniffer fails on a blank line before the header.
  if (/[\r\n]/.test(text.slice(0, start))) throw new FileImportError(CSV_ERROR);
  for (let i = start; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (char === '\n' || char === '\r') break;
      if (char in counts) counts[char]++;
    }
  }
  const selected = Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0];
  if (counts[selected] === 0 || quoted) throw new FileImportError(CSV_ERROR);
  return selected;
}

/** Strict state machine: escaped quotes/newlines stay in their original field. */
function csvRecords(text: string, separator: string): string[][] {
  const records: string[][] = [];
  let row: string[] = [], field = '', quoted = false, closedQuote = false, touched = false;
  const pushField = () => { row.push(field); field = ''; closedQuote = false; };
  const pushRow = () => {
    // pandas skips physically blank/whitespace-only records, not delimiter-only rows.
    if (touched || row.length || field.trim()) {
      pushField();
      checkDimensions(records.length, row.length);
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
    } else if (closedQuote) throw new FileImportError(CSV_ERROR);
    else if (char === '"' && field === '') { quoted = true; touched = true; }
    else { field += char; if (!/\s/.test(char)) touched = true; }
  }
  if (quoted) throw new FileImportError(CSV_ERROR);
  pushRow();
  return records;
}

function readCsv(bytes: Uint8Array): InputTable {
  const text = decodeCsv(bytes);
  if (text.includes('\0')) throw new FileImportError('CSV dosyasında geçersiz NUL karakteri var. Dosyayı yeniden kaydedin.');
  const records = csvRecords(text, delimiter(text));
  if (!records.length) throw new FileImportError(EMPTY_ERROR);
  const columns = headers(records[0]);
  checkDimensions(records.length - 1, columns.length);
  const rows = records.slice(1).map(record => {
    if (record.length > columns.length) throw new FileImportError(CSV_ERROR);
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

async function readXlsx(bytes: Uint8Array): Promise<InputTable> {
  try {
    await checkZip(bytes);
    const { default: ExcelJS } = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    // No fetch/readFile/URL method: user bytes are parsed in memory only.
    await workbook.xlsx.load(bytes.slice().buffer);
    const sheet = workbook.worksheets[0];
    if (!sheet) throw new FileImportError(XLSX_ERROR);
    const populated: { index: number; values: Cell[] }[] = [];
    const dates = new Map<string, Date>();
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
      const members = matrix.slice(1).map((row, index) => ({ value: row[column], date: dates.get(`${index+1}:${column}`) }))
        .filter(member => member.value != null);
      if (members.length && members.every(member => member.date)) {
        const fractional = members.some(member => member.date!.getUTCMilliseconds() !== 0);
        const midnight = members.every(member => member.date!.toISOString().slice(11) === '00:00:00.000Z');
        for (let row = 1; row < matrix.length; row++) {
          const date = dates.get(`${row}:${column}`);
          if (date) matrix[row][column] = midnight ? date.toISOString().slice(0,10)
            : date.toISOString().replace('T',' ').slice(0, fractional ? 23 : 19);
        }
      }
    }
    const columns = headers(matrix[0] ?? []);
    return { columns, rows: matrix.slice(1) };
  } catch (error) {
    if (error instanceof FileImportError) throw error;
    throw new FileImportError(XLSX_ERROR);
  }
}

/** Decode bytes and validate headers; value validation is shared with the ABC core. */
export async function readInventoryFile(input: Uint8Array | ArrayBuffer, filename: string): Promise<InputTable> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  if (!bytes.length || bytes.every(byte => [9, 10, 11, 12, 13, 32].includes(byte))) throw new FileImportError(EMPTY_ERROR);
  if (bytes.length > FILE_LIMITS.bytes) throw new FileImportError('Dosya boyutu 20 MB sınırını aşıyor. Daha küçük bir dosya seçin.');
  if (filename.toLowerCase().endsWith('.xlsx')) return readXlsx(bytes);
  if (filename.toLowerCase().endsWith('.csv')) return readCsv(bytes);
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
