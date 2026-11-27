import { finiteResult, nonNegative } from '../shared/validation';

export interface EoqInput {
  readonly annualDemand: number;
  readonly orderingCost: number;
  readonly holdingCost: number;
}

function multiplyAndDivide(left: number, right: number, divisor: number) {
  if (left === 0 || right === 0) return 0;
  const product = left * right;
  const direct = product / divisor;
  const minimumNormal = 2 ** -1022;
  if (product >= minimumNormal && direct > 0 && Number.isFinite(direct)) return direct;
  // A subnormal intermediate product can lose significant bits before division.
  const ratio = left / divisor;
  const reordered = ratio * right;
  if (ratio >= minimumNormal && reordered > 0 && Number.isFinite(reordered)) return reordered;
  return finiteResult(Math.exp(Math.log(left) + Math.log(right) - Math.log(divisor)));
}

export function annualEoqCosts(input: EoqInput, quantity: number) {
  nonNegative(input.annualDemand, 'Yıllık talep');
  nonNegative(input.orderingCost, 'Sipariş maliyeti');
  nonNegative(input.holdingCost, 'Elde bulundurma maliyeti');
  if (nonNegative(quantity, 'Sipariş miktarı') === 0) {
    if (input.annualDemand !== 0)
      throw new Error('Pozitif talep için sipariş miktarı sıfır olamaz.');
    return { ordering: 0, holding: 0, total: 0 };
  }
  const ordering = multiplyAndDivide(input.annualDemand, input.orderingCost, quantity);
  const holding = multiplyAndDivide(quantity, input.holdingCost, 2);
  return { ordering, holding, total: finiteResult(ordering + holding) };
}

export function calculateEoq(input: EoqInput) {
  const demand = nonNegative(input.annualDemand, 'Yıllık talep');
  const ordering = nonNegative(input.orderingCost, 'Sipariş maliyeti');
  const holding = nonNegative(input.holdingCost, 'Elde bulundurma maliyeti');
  if (demand === 0)
    return { kind: 'no-demand', quantity: 0, costs: annualEoqCosts(input, 0) } as const;
  if (!ordering && !holding) return { kind: 'all-lots' } as const;
  if (!ordering) return { kind: 'zero-ordering' } as const;
  if (!holding) return { kind: 'zero-holding' } as const;
  const square = (2 * demand * ordering) / holding;
  const quantity = finiteResult(
    square > 0 && Number.isFinite(square)
      ? Math.sqrt(square)
      : Math.exp((Math.LN2 + Math.log(demand) + Math.log(ordering) - Math.log(holding)) / 2),
  );
  if (quantity === 0) throw new Error('EOQ hesaplanabilir miktar aralığının altında.');
  return { kind: 'optimum', quantity, costs: annualEoqCosts(input, quantity) } as const;
}

export function sampleEoqCosts(input: EoqInput, optimum: number) {
  if (nonNegative(optimum, 'Ekonomik sipariş miktarı') === 0) {
    throw new Error('Maliyet eğrisi için pozitif bir sipariş miktarı girin.');
  }
  annualEoqCosts(input, optimum);
  // Include Q* exactly and sample logarithmically from Q*/4 to 4Q*.
  return Array.from({ length: 25 }, (_, index) => {
    const quantity = optimum * 2 ** ((index - 12) / 6);
    if (!Number.isFinite(quantity) || quantity === 0) return null;
    try {
      return { quantity, ...annualEoqCosts(input, quantity) };
    } catch {
      // Extremely large costs outside the representable range are left off the curve.
      return null;
    }
  }).filter((point) => point !== null);
}
