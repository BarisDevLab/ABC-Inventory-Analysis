import { normalizeProduct } from '../../core/abc';
import { validateProducts } from '../shared/validation';
import type { ProductInput } from '../shared/validation';

export type Impact = 'high' | 'medium' | 'low';
export interface VedInput extends ProductInput {
  readonly operations: Impact;
  readonly safety: Impact;
  readonly rationale: string;
}

const impactRank: Record<Impact, number> = { low: 0, medium: 1, high: 2 };
const classes = ['D', 'E', 'V'] as const;

export function calculateVed(rows: readonly VedInput[]) {
  validateProducts(rows, (name) => normalizeProduct(name.trim()));
  return rows.map((row) => {
    const { operations, safety } = row;
    if (!Object.hasOwn(impactRank, operations) || !Object.hasOwn(impactRank, safety)) {
      throw new Error(
        `İşletim ve güvenlik etkisini yüksek, orta veya düşük olarak girin: ${row.product}`,
      );
    }
    const rationale = row.rationale.trim();
    if (!rationale) throw new Error(`Kritiklik gerekçesi girin: ${row.product}`);
    const group = classes[Math.max(impactRank[operations], impactRank[safety])];
    return { ...row, product: row.product.trim(), rationale, group };
  });
}
