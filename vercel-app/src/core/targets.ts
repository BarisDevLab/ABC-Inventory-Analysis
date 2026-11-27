export interface Targets {
  a: number;
  b: number;
  c: number;
}

export const DEFAULT_TARGETS: Readonly<Targets> = { a: 80, b: 15, c: 5 };
export const TARGETS_TOLERANCE = 1e-12;

export function validateTargets(targets: Targets): Targets {
  const { a, b, c } = targets;
  if (![a, b, c].every(x => typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 100)
      || a + b > 100) {
    throw new Error("Hedef paylar 0–100 arasında olmalı; A ve B toplamı %100'ü aşmamalıdır.");
  }
  // UI contract: do not silently accept an invalid C share (Python core takes A/B only).
  if (Math.abs(a + b + c - 100) > TARGETS_TOLERANCE) throw new Error('Hedeflerin toplamı %100 olmalıdır.');
  return { a, b, c };
}
