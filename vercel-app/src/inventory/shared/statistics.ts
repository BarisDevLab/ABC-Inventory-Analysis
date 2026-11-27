/** Scale first to keep moments accurate when squaring very large or very small quantities. */
export function demandMoments(values: readonly number[]) {
  const scale = values.reduce((largest, value) => Math.max(largest, value), 0);
  if (scale === 0) return { mean: 0, deviation: 0, cv: null };
  let mean = 0;
  let squaredDifferences = 0;
  values.forEach((value, index) => {
    const scaled = value / scale;
    const delta = scaled - mean;
    mean += delta / (index + 1);
    squaredDifferences += delta * (scaled - mean);
  });
  const sampleDeviation = Math.sqrt(squaredDifferences / (values.length - 1));
  return { mean: mean * scale, deviation: sampleDeviation * scale, cv: sampleDeviation / mean };
}

/** Acklam rational approximation, evaluated on the upper half of the normal distribution. */
export function upperNormalQuantile(probability: number) {
  if (probability > 0.97575) {
    const q = Math.sqrt(-2 * Math.log1p(-probability));
    const numerator =
      ((((-0.007784894002430293 * q - 0.3223964580411365) * q - 2.400758277161838) * q -
        2.549732539343734) *
        q +
        4.374664141464968) *
        q +
      2.938163982698783;
    const denominator =
      (((0.007784695709041462 * q + 0.3224671290700398) * q + 2.445134137142996) * q +
        3.754408661907416) *
        q +
      1;
    return -numerator / denominator;
  }
  const q = probability - 0.5;
  const r = q * q;
  const numerator =
    (((((-39.69683028665376 * r + 220.9460984245205) * r - 275.9285104469687) * r +
      138.357751867269) *
      r -
      30.66479806614716) *
      r +
      2.506628277459239) *
    q;
  const denominator =
    ((((-54.47609879822406 * r + 161.5858368580409) * r - 155.6989798598866) * r +
      66.80131188771972) *
      r -
      13.28068155288572) *
      r +
    1;
  return numerator / denominator;
}
