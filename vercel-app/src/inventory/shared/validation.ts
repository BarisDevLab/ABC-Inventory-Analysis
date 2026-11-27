export interface ProductInput {
  product: string;
}

export function nonNegative(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} sonlu ve negatif olmayan bir sayı olmalıdır.`);
  }
  return value;
}

export function wholeNumber(value: number, label: string, minimum = 0): number {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${label} en az ${minimum} olan güvenli bir tam sayı olmalıdır.`);
  }
  return value;
}

export function finiteResult(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error(
      'Sonuç hesaplama aralığını aşıyor. Girdi birimlerini veya ölçeğini gözden geçirin.',
    );
  }
  return value;
}

export function validateProducts(
  rows: readonly ProductInput[],
  identify: (name: string) => string,
) {
  if (!rows.length) throw new Error('En az bir ürün girin.');
  const seen = new Set<string>();
  for (const { product } of rows) {
    const key = identify(product);
    if (!key) throw new Error('Ürün adı boş olamaz.');
    if (seen.has(key)) throw new Error(`Ürün birden fazla kez girildi: ${product}`);
    seen.add(key);
  }
}

export interface PeriodDemand extends ProductInput {
  readonly demand: readonly number[];
}

export function validateDemand(demand: readonly number[], minimum: number) {
  if (demand.length < minimum) throw new Error(`En az ${minimum} dönem değeri girin.`);
  for (const value of demand) nonNegative(value, 'Talep');
}

export function validateAlignedDemand(rows: readonly PeriodDemand[], minimum: number) {
  for (const row of rows) {
    validateDemand(row.demand, minimum);
    if (row.demand.length !== rows[0].demand.length) {
      throw new Error('Tüm ürünler için aynı sayıda dönem girin.');
    }
  }
}
