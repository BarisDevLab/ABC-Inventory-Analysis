import unicode from './unicode-data.json';
import { DEFAULT_TARGETS, validateTargets } from './targets';
import type { Targets } from './targets';

export const FIELDS = ['Ürün', 'Yıllık Tüketim', 'Birim Fiyat (TL)'] as const;
export const SKU_FIELD = 'SKU';
export const GROUPS = ['A', 'B', 'C'] as const;
export type Group = typeof GROUPS[number];
export type Cell = string | number | boolean | null;
export interface InputTable { columns: string[]; rows: Cell[][]; hasSku?: true }
export { DEFAULT_TARGETS, TARGETS_TOLERANCE, validateTargets } from './targets';
export type { Targets } from './targets';
export const BOUNDARY_TOLERANCE = 1e-10;
export interface AnalysisRow {
  product: string; sku?: string; quantity: number; price: number; value: number;
  share: number; cumulative: number; group: Group;
}
export interface GroupSummary { group: Group; count: number; value: number; share: number }
export interface Insights {
  top_product: string; top_value: number; top_count: number; top_share: number;
  a_share: number; counts: Record<Group, number>;
}
export interface Analysis {
  rows: AnalysisRow[]; total: number; targets: Targets;
  summary: GroupSummary[]; insights: Insights; commentary: string[];
}

const casefold: Record<string, string> = unicode.casefold;
const digits: Record<string, string> = unicode.decimal;
const whitespace = new Set(unicode.whitespace);

// Python str.strip includes control separators U+001C..001F, unlike JS trim.
function pythonStrip(value: string): string {
  const chars = Array.from(value);
  let first = 0, last = chars.length;
  while (first < last && whitespace.has(chars[first])) first++;
  while (last > first && whitespace.has(chars[last - 1])) last--;
  return chars.slice(first, last).join('');
}

function pythonString(value: Cell): string {
  return value === true ? 'True' : value === false ? 'False' : String(value);
}

export function normalizeProduct(value: string): string {
  return Array.from(value.normalize('NFC').replaceAll('İ', 'i').replaceAll('I', 'ı'))
    .map(char => casefold[char] ?? char).join('');
}

export function normalizeNumberDigits(value: string): string {
  return Array.from(value).map(char => digits[char] ?? char).join('');
}

/** Parses the inventory number format and validates the entire string. */
export function parseNumber(value: Cell | undefined): number {
  if (value == null) return NaN;
  if (typeof value === 'number') return value;
  if (typeof value === 'boolean') return Number(value); // Python bool is an int.
  let text = pythonStrip(value).replaceAll('\u00a0', '').replaceAll(' ', '')
    .replaceAll('₺', '').replaceAll('TL', '');
  if (!text) return NaN;
  if (text.includes('.') && text.includes(',')) {
    text = text.lastIndexOf(',') > text.lastIndexOf('.')
      ? text.replaceAll('.', '').replaceAll(',', '.') : text.replaceAll(',', '');
  } else if (text.includes(',')) text = text.replaceAll(',', '.');
  text = pythonStrip(text);
  text = normalizeNumberDigits(text);
  if (/^[+-]?(inf(inity)?|nan)$/i.test(text)) {
    return /nan/i.test(text) ? NaN : text.startsWith('-') ? -Infinity : Infinity;
  }
  // float() accepts single underscores between decimal digits, not hex or suffixes.
  if (!/^[+-]?(?:[0-9](?:_?[0-9])*(?:\.(?:[0-9](?:_?[0-9])*)?)?|\.[0-9](?:_?[0-9])*)(?:[eE][+-]?[0-9](?:_?[0-9])*)?$/.test(text)) return NaN;
  return Number(text.replaceAll('_', ''));
}

/** NumPy's contiguous float64 pairwise summation (8 lanes, 128 block size).
 * Plain reduce() differs near classification thresholds and on long inventories.
 */
export function pythonSum(values: readonly number[], start = 0, length = values.length): number {
  if (length < 8) {
    let result = -0;
    for (let i = 0; i < length; i++) result += values[start + i];
    return result;
  }
  if (length <= 128) {
    const lane = values.slice(start, start + 8);
    let i = 8;
    for (; i < length - (length % 8); i += 8) {
      for (let j = 0; j < 8; j++) lane[j] += values[start + i + j];
    }
    let result = ((lane[0] + lane[1]) + (lane[2] + lane[3])) + ((lane[4] + lane[5]) + (lane[6] + lane[7]));
    for (; i < length; i++) result += values[start + i];
    return result;
  }
  let split = Math.floor(length / 2);
  split -= split % 8;
  return pythonSum(values, start, split) + pythonSum(values, start + split, length - split);
}

export function sampleData(): InputTable {
  return { columns: [...FIELDS], rows: [
    ['Motor', 100, 1500], ['Rulman', 500, 120], ['Sensör', 150, 400],
    ['Kayış', 300, 80], ['Vida', 2000, 5],
  ] };
}

export function summarizeGroups(rows: readonly AnalysisRow[], total: number): GroupSummary[] {
  return GROUPS.map(group => {
    const members = rows.filter(row => row.group === group);
    // Pandas groupby uses compensated summation, unlike Series.sum.
    let value = 0, compensation = 0;
    for (const row of members) {
      const adjusted = row.value - compensation;
      const next = value + adjusted;
      compensation = (next - value) - adjusted;
      value = next;
    }
    return { group, count: members.length, value, share: value / total * 100 };
  });
}

export function analysisInsights(rows: readonly AnalysisRow[]): Insights {
  const total = pythonSum(rows.map(row => row.value));
  if (!rows.length || total <= 0 || !Number.isFinite(total)) {
    throw new Error('Yorum oluşturmak için pozitif toplam değerli analiz gereklidir.');
  }
  const ranked = [...rows].sort((a, b) => b.value - a.value);
  return {
    top_product: ranked[0].product, top_value: ranked[0].value,
    top_count: Math.min(3, ranked.length),
    top_share: pythonSum(ranked.slice(0, 3).map(row => row.value)) / total * 100,
    a_share: pythonSum(rows.filter(row => row.group === 'A').map(row => row.value)) / total * 100,
    counts: { A: rows.filter(r => r.group === 'A').length, B: rows.filter(r => r.group === 'B').length, C: rows.filter(r => r.group === 'C').length },
  };
}

export function engineeringCommentary(insights: Insights): string[] {
  const percent = (value: number) => value.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return [
    `En yüksek yıllık tüketim değerine sahip ürün: ${insights.top_product}.`,
    `İlk ${insights.top_count} ürün toplam değerin %${percent(insights.top_share)} bölümünü oluşturuyor.`,
    insights.counts.A
      ? `Sık kontrol ve ayrıntılı tedarik planlamasını A grubundaki ${insights.counts.A} ürüne öncelik vererek planlayın. Bu ürünler yıllık değerin %${percent(insights.a_share)} bölümünü oluşturuyor.`
      : 'Seçili hedeflerle A grubunda ürün bulunmuyor. Kontrol önceliklerini mevcut B/C dağılımı ve operasyonel kritiklikle birlikte değerlendirin.',
    'Düşük ekonomik değere sahip kritik parçalar ayrıca değerlendirilmelidir.',
  ];
}

export function calculateAbc(source: InputTable, selected: Targets = DEFAULT_TARGETS): Analysis {
  const targets = validateTargets(selected);
  const columns = source.columns.map(pythonStrip);
  if (new Set(columns).size !== columns.length) throw new Error('Tekrarlanan sütun başlıkları var.');
  const missing = FIELDS.filter(field => !columns.includes(field));
  if (missing.length) throw new Error('Eksik sütunlar: ' + missing.join(', '));
  if (!source.rows.length) throw new Error('Dosyada ürün bulunamadı.');
  const indices = FIELDS.map(field => columns.indexOf(field));
  const cells = source.rows.map(row => indices.map(index => row[index]));
  if (cells.some(row => row.some(value => value == null || (typeof value === 'number' && Number.isNaN(value))))) {
    throw new Error('Boş hücreler var. Lütfen bütün alanları doldurun.');
  }
  const products = cells.map(row => pythonStrip(pythonString(row[0])));
  if (products.some(name => !name)) throw new Error('Ürün adı boş bırakılamaz.');
  const skuIndex = source.hasSku ? columns.indexOf(SKU_FIELD) : -1;
  if (source.hasSku && skuIndex === -1) throw new Error('Ürün kodu sütunu bulunamadı.');
  const codes = skuIndex < 0 ? null : source.rows.map(row => {
    const code = row[skuIndex];
    return code == null ? '' : pythonStrip(pythonString(code));
  });
  if (codes?.some(code => !code)) throw new Error('SKU eşleştirildiğinde tüm ürün kodları doldurulmalıdır.');
  if (codes && new Set(codes).size !== codes.length) throw new Error('Tekrarlanan ürün kodları var.');
  if (!codes && new Set(products.map(normalizeProduct)).size !== products.length) {
    throw new Error('Tekrarlanan ürün adları var. Her ürünü tek satırda belirtin.');
  }
  const numeric = [1, 2].map(index => {
    const values = cells.map(row => parseNumber(row[index]));
    if (values.some(value => !Number.isFinite(value))) throw new Error(`'${FIELDS[index]}' sütununda geçersiz sayı var.`);
    if (values.some(value => value < 0)) throw new Error(`'${FIELDS[index]}' negatif olamaz.`);
    return values;
  });
  const ranked = products.map((product, index) => ({
    product, ...(codes ? { sku: codes[index] } : {}), quantity: numeric[0][index], price: numeric[1][index],
    value: numeric[0][index] * numeric[1][index], index,
  }));
  if (ranked.some(row => !Number.isFinite(row.value))) throw new Error('Yıllık değer hesaplamasında çok büyük bir sayı oluştu.');
  ranked.sort((a, b) => b.value - a.value || a.index - b.index);
  const total = pythonSum(ranked.map(row => row.value));
  if (!Number.isFinite(total) || total <= 0) throw new Error('Toplam yıllık değer sıfırdan büyük olmalıdır.');
  let cumulative = 0;
  const below = (before: number, threshold: number) => before < threshold && Math.abs(before - threshold) > BOUNDARY_TOLERANCE;
  const rows: AnalysisRow[] = ranked.map(({ index: _index, ...row }) => {
    const share = row.value / total * 100;
    const group: Group = row.value === 0 ? 'C' : below(cumulative, targets.a) ? 'A'
      : below(cumulative, targets.a + targets.b) ? 'B' : 'C';
    cumulative += share;
    return { ...row, share, cumulative: Math.min(100, cumulative), group };
  });
  const insights = analysisInsights(rows);
  return { rows, total, targets, summary: summarizeGroups(rows, total), insights, commentary: engineeringCommentary(insights) };
}

/** Rebuild inputs in ranked order, preserving the original order of equal values. */
export function analysisSource(rows: readonly AnalysisRow[]): InputTable {
  const hasSku = rows.some(row => row.sku !== undefined);
  return {
    columns: hasSku ? [...FIELDS, SKU_FIELD] : [...FIELDS],
    ...(hasSku ? { hasSku: true } : {}),
    rows: rows.map(row => hasSku ? [row.product, row.quantity, row.price, row.sku ?? null]
      : [row.product, row.quantity, row.price]),
  };
}
