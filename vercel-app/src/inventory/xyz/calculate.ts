import { normalizeProduct } from '../../core/abc';
import { demandMoments } from '../shared/statistics';
import { nonNegative, validateAlignedDemand, validateProducts } from '../shared/validation';
import type { PeriodDemand } from '../shared/validation';

export type XyzClass = 'X' | 'Y' | 'Z';
export interface XyzThresholds {
  readonly maxX: number;
  readonly maxY: number;
}
export interface XyzRow {
  readonly product: string;
  readonly mean: number;
  readonly deviation: number;
  readonly cv: number | null;
  readonly group: XyzClass | null;
}

export function calculateXyz(
  rows: readonly PeriodDemand[],
  { maxX, maxY }: XyzThresholds,
  withSku = false,
): XyzRow[] {
  nonNegative(maxX, 'X üst sınırı');
  nonNegative(maxY, 'Y üst sınırı');
  if (maxY <= maxX) throw new Error('Y üst sınırı X üst sınırından büyük olmalıdır.');
  validateProducts(rows, withSku ? (code) => code.trim() : normalizeProduct);
  validateAlignedDemand(rows, 2);
  return rows.map(({ product, demand }) => {
    const statistics = demandMoments(demand);
    const { cv } = statistics;
    return {
      product: product.trim(),
      ...statistics,
      group: cv === null ? null : cv <= maxX ? 'X' : cv <= maxY ? 'Y' : 'Z',
    };
  });
}
