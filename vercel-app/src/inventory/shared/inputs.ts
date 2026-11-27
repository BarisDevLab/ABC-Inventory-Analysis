import { parseNumber } from '../../core/abc';

export function fieldText(data: FormData, key: string) {
  return String(data.get(key) ?? '');
}

export function inputNumber(text: string, label: string) {
  const value = parseNumber(text);
  if (!Number.isFinite(value)) throw new Error(`${label} için geçerli bir sayı girin.`);
  return value;
}

export function fieldNumber(data: FormData, key: string, label: string) {
  return inputNumber(fieldText(data, key), label);
}

export function readSeries(text: string, label: string) {
  if (!text.trim()) throw new Error(`${label} girin.`);
  const entries = text
    .trim()
    .replaceAll('\r\n', '\n')
    .split(/[;\t\r\n]/)
    .map((entry) => entry.trim());
  if (entries.some((entry) => !entry)) throw new Error(`${label} içinde boş değer var.`);
  return entries.map((entry, index) => inputNumber(entry, `${label}, değer ${index + 1}`));
}

export function readRows(text: string, label: string) {
  const rows = text.split(/\r\n|\n|\r/);
  if (rows.length > 2000) throw new Error('En fazla 2.000 veri satırı girin.');
  const result = rows.flatMap((row, index) => {
    if (!row.trim()) return [];
    const columns = row.split(row.includes('\t') ? '\t' : ';').map((cell) => cell.trim());
    if (columns.some((cell) => !cell)) throw new Error(`${index + 1}. satırda boş sütun var.`);
    return [{ columns, line: index + 1 }];
  });
  if (!result.length) throw new Error(`${label} girin.`);
  return result;
}

export function readProductDemand(text: string, label: string) {
  return readRows(text, label).map(({ columns: [product, ...demand], line }) => ({
    product,
    demand: demand.map((value, index) => inputNumber(value, `${line}. satır, ${index + 1}. dönem`)),
  }));
}
