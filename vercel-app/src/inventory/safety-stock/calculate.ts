import { demandMoments, upperNormalQuantile } from '../shared/statistics';
import { finiteResult, nonNegative, validateDemand } from '../shared/validation';

export type SafetyStockInput =
  | {
      readonly model: 'fixed';
      readonly serviceLevel: number;
      readonly demand: readonly number[];
      readonly leadTime: number;
    }
  | {
      readonly model: 'variable';
      readonly serviceLevel: number;
      readonly demand: readonly number[];
      readonly leadTimes: readonly number[];
    }
  | {
      readonly model: 'empirical';
      readonly serviceLevel: number;
      readonly leadTimeDemand: readonly number[];
    };

export function calculateSafetyStock(input: SafetyStockInput) {
  const p = input.serviceLevel;
  if (!Number.isFinite(p) || p < 0.5 || p >= 1) {
    throw new Error('Çevrim servis seviyesi en az %50 ve %100’ün altında olmalıdır.');
  }

  if (input.model === 'empirical') {
    validateDemand(input.leadTimeDemand, 2);
    const samples = [...input.leadTimeDemand].sort((a, b) => a - b);
    const { mean, deviation } = demandMoments(samples);
    const index = p * samples.length;
    const lower = Math.floor(index);
    // Undo multiplication noise when p denotes an exact empirical rank (e.g. 55% of 100).
    const rank = p === lower / samples.length ? lower : Math.ceil(index);
    const quantile = samples[rank - 1];
    const safetyStock = Math.max(0, quantile - mean);
    return {
      model: input.model,
      expectedDemand: mean,
      leadTimeDeviation: deviation,
      safetyStock,
      quantile,
      rank,
      sampleSize: samples.length,
      wholeUnitSafetyStock: Math.ceil(safetyStock),
    } as const;
  }
  validateDemand(input.demand, 2);
  const { mean, deviation } = demandMoments(input.demand);
  let leadMean: number;
  let leadDeviation = 0;
  if (input.model === 'fixed') {
    leadMean = nonNegative(input.leadTime, 'Sabit tedarik süresi');
  } else {
    if (input.leadTimes.length < 2) throw new Error('En az iki tedarik süresi gözlemi girin.');
    for (const leadTime of input.leadTimes) nonNegative(leadTime, 'Tedarik süresi gözlemi');
    const lead = demandMoments(input.leadTimes);
    leadMean = lead.mean;
    leadDeviation = lead.deviation;
  }
  const expectedDemand = finiteResult(leadMean * mean);
  const leadTimeDeviation = finiteResult(
    Math.hypot(Math.sqrt(leadMean) * deviation, mean * leadDeviation),
  );
  const z = upperNormalQuantile(p);
  const safetyStock = finiteResult(z * leadTimeDeviation);
  return {
    model: input.model,
    expectedDemand,
    leadTimeDeviation,
    safetyStock,
    z,
    wholeUnitSafetyStock: Math.ceil(safetyStock),
  } as const;
}
