import { GROUPS, normalizeProduct } from '../../core/abc';
import type { Group } from '../../core/abc';
import { validateProducts } from '../shared/validation';
import type { ProductInput } from '../shared/validation';
import type { XyzClass } from '../xyz/calculate';

export type AbcXyzClass = `${Group}${XyzClass}`;
export interface AbcItem extends ProductInput {
  readonly group: Group;
  readonly sku?: string;
}
export interface XyzItem extends ProductInput {
  readonly group: XyzClass | null;
}
export interface MatrixCell {
  readonly category: AbcXyzClass;
  readonly products: string[];
  readonly rationale: string;
  readonly option: string;
}

const xyzClasses = ['X', 'Y', 'Z'] as const;
const advice: Record<AbcXyzClass, readonly [string, string]> = {
  AX: [
    'Yüksek tüketim değeri ve istikrarlı talep.',
    'Sık stok kontrolü ve küçük, düzenli partiler değerlendirilebilir.',
  ],
  AY: [
    'Yüksek tüketim değeri ve orta düzeyde değişkenlik.',
    'Talep tahmini sık güncellenebilir. Sezon etkisi ve servis hedefi birlikte incelenebilir.',
  ],
  AZ: [
    'Yüksek tüketim değeri ve oynak talep.',
    'Yüksek stok bağlamadan önce esnek tedarik ve senaryo bazlı emniyet stoku karşılaştırılabilir.',
  ],
  BX: [
    'Orta tüketim değeri ve istikrarlı talep.',
    'Düzenli ikmal ve standart sipariş miktarı değerlendirilebilir.',
  ],
  BY: [
    'Orta tüketim değeri ve orta düzeyde değişkenlik.',
    'Periyodik gözden geçirme ve talebe göre güncellenen sipariş noktası karşılaştırılabilir.',
  ],
  BZ: [
    'Orta tüketim değeri ve oynak talep.',
    'Daha kısa tedarik süresi veya talebe bağlı ikmal seçenekleri incelenebilir.',
  ],
  CX: [
    'Düşük tüketim değeri ve istikrarlı talep.',
    'İşlem maliyetini düşürmek için birleştirilmiş sipariş veya iki kutu yöntemi değerlendirilebilir.',
  ],
  CY: [
    'Düşük tüketim değeri ve orta düzeyde değişkenlik.',
    'Daha seyrek kontrol ve basit min–maks sınırları denenebilir.',
  ],
  CZ: [
    'Düşük tüketim değeri ve oynak talep.',
    'Fazla stok riskine karşı siparişe bağlı tedarik değerlendirilebilir. Kritiklik ayrıca kontrol edilmelidir.',
  ],
};

const englishAdvice: typeof advice = {
  AX: ['High usage value and stable demand.', 'Consider frequent inventory checks and small, regular batches.'],
  AY: ['High usage value and moderate demand variability.', 'Update the forecast frequently and review seasonality alongside the service target.'],
  AZ: ['High usage value and volatile demand.', 'Compare flexible sourcing and safety stock scenarios before committing to a large buffer.'],
  BX: ['Moderate usage value and stable demand.', 'Consider regular replenishment and a standard order quantity.'],
  BY: ['Moderate usage value and demand variability.', 'Compare periodic review with a reorder point updated from demand.'],
  BZ: ['Moderate usage value and volatile demand.', 'Review shorter lead times or demand-driven replenishment.'],
  CX: ['Low usage value and stable demand.', 'Consider consolidated orders or a two-bin system to reduce transaction costs.'],
  CY: ['Low usage value and moderate demand variability.', 'Consider less frequent checks and simple minimum and maximum levels.'],
  CZ: ['Low usage value and volatile demand.', 'Consider ordering against demand to limit excess inventory. Check operational criticality separately.'],
};

export function buildAbcXyz(abc: readonly AbcItem[], xyz: readonly XyzItem[], language: 'tr' | 'en' = 'tr') {
  const hasSku = abc.some((row) => row.sku !== undefined);
  const identity = hasSku ? (code: string) => code.trim() : normalizeProduct;
  if (abc.length) validateProducts(abc.map((row) => ({
    product: hasSku ? (row.sku ?? '') : row.product,
  })), identity);
  if (xyz.length) validateProducts(xyz, identity);
  const cells = GROUPS.flatMap((a) =>
    xyzClasses.map((x): MatrixCell => {
      const category = `${a}${x}` as const;
      const [rationale, option] = (language === 'en' ? englishAdvice : advice)[category];
      return { category, products: [], rationale, option };
    }),
  );
  const byCategory = new Map(cells.map((cell) => [cell.category, cell]));
  const xyzByProduct = new Map(
    xyz.map((row) => {
      if (row.group !== null && !xyzClasses.includes(row.group)) {
        throw new Error(`Geçersiz XYZ sınıfı: ${row.product}`);
      }
      return [identity(row.product), row] as const;
    }),
  );
  const missingXyz: string[] = [];
  const unclassifiedXyz: string[] = [];
  for (const row of abc) {
    if (!GROUPS.includes(row.group)) throw new Error(`Geçersiz ABC sınıfı: ${row.product}`);
    const key = identity(row.sku ?? row.product);
    const label = row.sku ? `${row.product} · ${row.sku}` : row.product;
    const variability = xyzByProduct.get(key);
    xyzByProduct.delete(key);
    if (!variability) missingXyz.push(label);
    else if (variability.group === null) unclassifiedXyz.push(label);
    else {
      byCategory.get(`${row.group}${variability.group}`)!.products.push(label);
    }
  }
  return {
    cells,
    missingXyz,
    unclassifiedXyz,
    missingAbc: [...xyzByProduct.values()].map((row) => row.product),
  };
}
