import { finiteResult, nonNegative } from '../shared/validation';

export interface RopInput {
  readonly demandPerPeriod: number;
  readonly leadTimePeriods: number;
  readonly safetyStock: number;
}

export function calculateRop(input: RopInput) {
  const demand = nonNegative(input.demandPerPeriod, 'Dönem başına ortalama talep');
  const lead = nonNegative(input.leadTimePeriods, 'Tedarik süresi');
  const safety = nonNegative(input.safetyStock, 'Emniyet stoku');
  const expectedDemand = finiteResult(demand * lead);
  const reorderPoint = finiteResult(expectedDemand + safety);
  return { expectedDemand, reorderPoint, wholeUnitReorderPoint: Math.ceil(reorderPoint) };
}
