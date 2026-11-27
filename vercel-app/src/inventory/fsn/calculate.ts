import { normalizeProduct } from '../../core/abc';
import { nonNegative, validateAlignedDemand, validateProducts } from '../shared/validation';
import type { PeriodDemand } from '../shared/validation';

export function calculateFsn(rows: readonly PeriodDemand[], fastThreshold: number) {
  if (nonNegative(fastThreshold, 'Hızlı hareket eşiği') === 0 || fastThreshold > 1) {
    throw new Error('Hızlı hareket eşiği %0’dan büyük ve en fazla %100 olmalıdır.');
  }
  validateProducts(rows, (name) => normalizeProduct(name.trim()));
  validateAlignedDemand(rows, 1);
  return rows.map(({ product, demand }) => {
    const activePeriods = demand.filter((quantity) => quantity > 0).length;
    const rate = activePeriods / demand.length;
    const group = activePeriods === 0 ? 'N' : rate >= fastThreshold ? 'F' : 'S';
    return { product: product.trim(), periods: demand.length, activePeriods, rate, group } as const;
  });
}
