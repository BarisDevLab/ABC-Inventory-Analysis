import { FIELDS, SKU_FIELD, calculateAbc, normalizeNumberDigits, parseNumber } from '../core/abc';
import type { Analysis, Cell, InputTable, Targets } from '../core/abc';
import { CsvStructureError, FileImportError, readImportSheet, strip } from './read-file';
import type { SheetSelection } from './read-file';

export type NumberFormat = 'auto' | 'tr' | 'international';
export type ColumnMapping = [product: number, quantity: number, price: number, sku: number];
export interface ImportConfiguration extends SheetSelection {
  mapping?: ColumnMapping;
  numbers: NumberFormat;
}
export const DEFAULT_IMPORT: ImportConfiguration = { sheet: 0, header: 1, numbers: 'auto' };
export interface ImportPreview {
  sheets: string[];
  rowCount: number;
  columns: string[];
  rows: { number: number; cells: Cell[] }[];
  suggested: ColumnMapping;
}
export interface NumberWarnings {
  count: number;
  examples: { row: number; field: string; text: string }[];
}
export interface ImportedAnalysis {
  source: InputTable;
  analysis: Analysis;
  warnings: NumberWarnings;
}
export interface ImportResult {
  preview: ImportPreview;
  result?: ImportedAnalysis;
  message?: string;
}

const aliases = [
  ['ürün', 'ürün adı', 'product', 'product name', 'item', 'item name', 'malzeme'],
  ['yıllık tüketim', 'tüketim', 'miktar', 'quantity', 'annual quantity', 'annual usage', 'demand'],
  ['birim fiyat (tl)', 'birim fiyat', 'birim maliyet', 'unit price', 'unit cost', 'price'],
  ['sku', 'ürün kodu', 'item code', 'product code', 'malzeme kodu', 'stok kodu'],
];

function legacyMapping(header: string[]): ColumnMapping | undefined {
  const columns = header.map(strip);
  const [product, quantity, price] = FIELDS.map(field => columns.indexOf(field));
  if ([product, quantity, price].includes(-1) || new Set(columns).size !== columns.length) return;
  return [product, quantity, price, -1];
}

function potentialAmbiguity(text: string): boolean {
  return /^[+-]?[0-9]{1,3}[.,][0-9]{3}$/.test(text);
}

function asNumber(value: Cell, format: NumberFormat): { value: Cell; ambiguous?: string } {
  if (typeof value !== 'string') return { value };
  const text = normalizeNumberDigits(value.trim().replace(/^(₺|TL)\s*|\s*(₺|TL)$/g, '')
    .replace(/[\u00a0\u202f]/g, ' '));
  if (format === 'auto') {
    const compact = text.replaceAll(' ', '');
    if (potentialAmbiguity(compact)) return { value: parseNumber(compact), ambiguous: value };
    if (/^[+-]?[0-9]{1,3}([.,])[0-9]{3}(?:\1[0-9]{3})+$/.test(compact)) {
      return { value: Number(compact.replace(/[.,]/g, '')) };
    }
    return { value: parseNumber(text) };
  }
  // In explicit modes allow a decimal mark after a plain or consistently grouped integer.
  const integer = format === 'tr' ? /^(?:[0-9]+|[0-9]{1,3}(?:\.[0-9]{3})+|[0-9]{1,3}(?: [0-9]{3})+)$/ :
    /^(?:[0-9]+|[0-9]{1,3}(?:,[0-9]{3})+|[0-9]{1,3}(?: [0-9]{3})+)$/;
  const decimal = format === 'tr' ? ',' : '.';
  const [unsigned, exponent, ...extraExponents] = text.replace(/^[+-]/, '').split(/[eE]/);
  if (extraExponents.length || (exponent !== undefined && !/^[+-]?[0-9]+$/.test(exponent))) return { value };
  const [whole, fraction, ...extra] = unsigned.split(decimal);
  if (extra.length || !(whole ? integer.test(whole) : fraction)
      || (fraction !== undefined && !/^[0-9]*$/.test(fraction))) return { value };
  const normalized = (text.startsWith('-') ? '-' : '') + whole.replace(/[., ]/g, '') +
    (fraction === undefined ? '' : '.' + fraction) + (exponent === undefined ? '' : 'e' + exponent);
  return { value: Number(normalized) };
}

function mappedNumber(cell: Cell, config: ImportConfiguration, row: number, field: string, warnings: NumberWarnings): Cell {
  const parsed = asNumber(cell, config.numbers);
  if (typeof parsed.value === 'string' || (typeof parsed.value === 'number' && !Number.isFinite(parsed.value))) {
    throw new FileImportError(`${row}. satırda “${field}” için geçersiz sayı var.`);
  }
  if (parsed.ambiguous) {
    warnings.count++;
    if (warnings.examples.length < 6) warnings.examples.push({ row, field, text: parsed.ambiguous.slice(0, 80) });
  }
  return parsed.value;
}

export async function prepareImport(
  bytes: ArrayBuffer, name: string, config: ImportConfiguration, targets: Targets,
  intent: 'open' | 'preview' | 'apply',
): Promise<ImportResult> {
  if (!Number.isInteger(config.header) || config.header < 1 || !Number.isInteger(config.sheet) || config.sheet < 0) {
    throw new FileImportError('Geçerli bir çalışma sayfası ve başlık satırı seçin.');
  }
  const sheet = await readImportSheet(bytes, name, config).catch(error => {
    if (error instanceof CsvStructureError && intent === 'open') {
      return {
        matrix: [], sheets: ['CSV'], csv: true, codeOverrides: new Map<string, string>(),
        recordWidths: [], issue: 'CSV ayracı otomatik belirlenemedi veya satırlar okunamadı. Ayıracı seçip yeniden deneyin.',
      };
    }
    throw error;
  });
  const { matrix, sheets, csv, recordWidths, codeOverrides, issue } = sheet;
  const header = matrix[config.header - 1] ?? [];
  // Limit what reaches the UI. Full mapping options stay available by column number.
  const width = csv ? header.length : (matrix[0]?.length ?? 0);
  const columns = Array.from({ length: width }, (_, index) => String(header[index] ?? '').slice(0, 150));
  const fullHeaders = Array.from({ length: width }, (_, index) => String(header[index] ?? `Unnamed: ${index}`));
  const legacy = legacyMapping(fullHeaders);
  const labels = fullHeaders.map(strip);
  const suggested = aliases.map(names => labels.findIndex(label =>
    names.includes(label.toLocaleLowerCase('tr-TR')) || names.includes(label.toLowerCase()))) as ColumnMapping;
  if (legacy) suggested.splice(0, 3, ...legacy.slice(0, 3));
  const previewStart = config.header === 1 ? 0 : config.header - 2;
  const preview: ImportPreview = {
    sheets, rowCount: matrix.length, columns, suggested,
    rows: matrix.slice(previewStart, previewStart + 7).map((row, index) => ({
      number: index + previewStart + 1,
      cells: row.slice(0, 12).map((cell, column) => {
        const value = codeOverrides.get(`${index + previewStart}:${column}`) ?? cell;
        return typeof value === 'string' ? value.slice(0, 150) : value;
      }),
    })),
  };
  if (issue) return { preview, message: issue };
  if (intent === 'preview') return { preview };
  const mapping = intent === 'open' ? legacy && suggested[3] < 0 ? legacy : undefined : config.mapping;
  if (!mapping) return { preview };
  try {
    const selected = mapping.filter(column => column !== -1);
    if (mapping.slice(0, 3).includes(-1) || new Set(selected).size !== selected.length
        || selected.some(column => !Number.isInteger(column) || column < 0 || column >= width)) {
      throw new FileImportError('Ürün, tüketim ve fiyat için ayrı sütunlar seçin. Ürün kodu isteğe bağlıdır.');
    }
    const warnings: NumberWarnings = { count: 0, examples: [] };
    const [product, quantity, price, sku] = mapping;
    const source: InputTable = {
      columns: sku < 0 ? [...FIELDS] : [...FIELDS, SKU_FIELD],
      ...(sku >= 0 ? { hasSku: true } : {}),
      rows: matrix.slice(config.header).map((row, index) => {
        const offset = config.header + index;
        if (recordWidths && recordWidths[offset] > width) {
          throw new FileImportError(`${offset + 1}. CSV kaydında başlıktan fazla alan var. Ayıracı veya başlık satırını kontrol edin.`);
        }
        const cells = [
          row[product] ?? null,
          mappedNumber(row[quantity] ?? null, config, offset + 1, FIELDS[1], warnings),
          mappedNumber(row[price] ?? null, config, offset + 1, FIELDS[2], warnings),
        ];
        if (sku >= 0) cells.push(codeOverrides.get(`${offset}:${sku}`) ?? row[sku] ?? null);
        return cells;
      }),
    };
    return { preview, result: { source, analysis: calculateAbc(source, targets), warnings } };
  } catch (error) {
    return { preview, message: error instanceof Error ? error.message : 'Dosya analiz edilemedi.' };
  }
}
