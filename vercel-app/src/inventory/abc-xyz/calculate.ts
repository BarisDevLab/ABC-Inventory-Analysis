import { GROUPS, normalizeProduct } from '../../core/abc';
import type { Group } from '../../core/abc';
import { validateProducts } from '../shared/validation';
import type { ProductInput } from '../shared/validation';
import type { XyzClass } from '../xyz/calculate';

export type AbcXyzClass = `${Group}${XyzClass}`;
export interface AbcItem extends ProductInput {
  readonly group: Group;
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

export function buildAbcXyz(abc: readonly AbcItem[], xyz: readonly XyzItem[]) {
  if (abc.length) validateProducts(abc, normalizeProduct);
  if (xyz.length) validateProducts(xyz, normalizeProduct);
  const cells = GROUPS.flatMap((a) =>
    xyzClasses.map((x): MatrixCell => {
      const category = `${a}${x}` as const;
      const [rationale, option] = advice[category];
      return { category, products: [], rationale, option };
    }),
  );
  const byCategory = new Map(cells.map((cell) => [cell.category, cell]));
  const xyzByProduct = new Map(
    xyz.map((row) => {
      if (row.group !== null && !xyzClasses.includes(row.group)) {
        throw new Error(`Geçersiz XYZ sınıfı: ${row.product}`);
      }
      return [normalizeProduct(row.product), row] as const;
    }),
  );
  const missingXyz: string[] = [];
  const unclassifiedXyz: string[] = [];
  for (const row of abc) {
    if (!GROUPS.includes(row.group)) throw new Error(`Geçersiz ABC sınıfı: ${row.product}`);
    const key = normalizeProduct(row.product);
    const variability = xyzByProduct.get(key);
    xyzByProduct.delete(key);
    if (!variability) missingXyz.push(row.product);
    else if (variability.group === null) unclassifiedXyz.push(row.product);
    else {
      byCategory.get(`${row.group}${variability.group}`)!.products.push(row.product);
    }
  }
  return {
    cells,
    missingXyz,
    unclassifiedXyz,
    missingAbc: [...xyzByProduct.values()].map((row) => row.product),
  };
}
