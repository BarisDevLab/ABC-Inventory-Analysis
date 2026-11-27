import { describe, expect, it } from 'vitest';
import { buildAbcXyz } from '../src/inventory/abc-xyz/calculate';
import { annualEoqCosts, calculateEoq, sampleEoqCosts } from '../src/inventory/eoq/calculate';
import { calculateFsn } from '../src/inventory/fsn/calculate';
import { calculateRop } from '../src/inventory/rop/calculate';
import { calculateSafetyStock } from '../src/inventory/safety-stock/calculate';
import { readProductDemand, readSeries } from '../src/inventory/shared/inputs';
import { compareStockPolicies } from '../src/inventory/simulation/calculate';
import type { StockPolicy } from '../src/inventory/simulation/calculate';
import { calculateVed } from '../src/inventory/ved/calculate';
import type { VedInput } from '../src/inventory/ved/calculate';
import { calculateXyz } from '../src/inventory/xyz/calculate';

const row = (product: string, ...demand: number[]) => ({ product, demand });
const thresholds = { maxX: 0.25, maxY: 0.75 };

describe('Dönemsel girdiler ve sınıflandırma', () => {
  it('ondalık virgülü ve sekmeyi okur, atlanan dönemleri sıfıra dönüştürmez', () => {
    expect(readSeries('0; 1,5\r\n2\t3', 'Talep')).toEqual([0, 1.5, 2, 3]);
    expect(readProductDemand('Ürün A\t1,5\t0\nÜrün B;2;3', 'Talep')).toEqual([
      row('Ürün A', 1.5, 0),
      row('Ürün B', 2, 3),
    ]);
    expect(() => readSeries('1;;3', 'Talep')).toThrow(/boş/);
    expect(() => readProductDemand('Ürün A\t1\t', 'Talep')).toThrow(/boş/);
  });

  it('XYZ örneklem sapmasını, değişim katsayısını ve sıfır talebi hesaplar', () => {
    const result = calculateXyz(
      [row('Sabit', 5, 5), row('Orta', 2, 4), row('Oynak', 0, 4), row('Sıfır', 0, 0)],
      thresholds,
    );
    expect(result.map((item) => item.group)).toEqual(['X', 'Y', 'Z', null]);
    expect(result[1].mean).toBe(3);
    expect(result[1].deviation).toBeCloseTo(Math.SQRT2);
    expect(result[1].cv).toBeCloseTo(Math.SQRT2 / 3);
    expect(result[3]).toMatchObject({ mean: 0, deviation: 0, cv: null });
  });

  it('XYZ eşikleri dâhildir ve ölçek CV’yi değiştirmez', () => {
    const input = [row('Ürün', 2, 4)];
    const cv = calculateXyz(input, thresholds)[0].cv!;
    expect(calculateXyz(input, { maxX: cv, maxY: 1 })[0].group).toBe('X');
    expect(calculateXyz(input, { maxX: 0, maxY: cv })[0].group).toBe('Y');
    expect(calculateXyz([row('Ürün', 2e250, 4e250)], thresholds)[0].cv).toBeCloseTo(cv);
    expect(calculateXyz([row('Ürün', 2e-250, 4e-250)], thresholds)[0].cv).toBeCloseTo(cv);
  });

  it('XYZ eksik, tutarsız, tekrar eden ve geçersiz veriyi reddeder', () => {
    expect(() => calculateXyz([], thresholds)).toThrow(/ürün/);
    expect(() => calculateXyz([row('A', 1)], thresholds)).toThrow(/iki|2/);
    expect(() => calculateXyz([row('A', 1, 2), row('B', 1, 2, 3)], thresholds)).toThrow(
      /aynı sayıda/,
    );
    expect(() => calculateXyz([row('İplik', 0, 1), row('iplik', 1, 1)], thresholds)).toThrow(
      /birden fazla/,
    );
    expect(() => calculateXyz([row('A', 1, NaN)], thresholds)).toThrow(/sonlu/);
    expect(() => calculateXyz([row('A', 1, -1)], thresholds)).toThrow(/negatif/);
    expect(() => calculateXyz([row('A', 1, 2)], { maxX: 1, maxY: 1 })).toThrow(/büyük/);
  });

  it('ABC-XYZ dokuz hücre üretir, ABC anahtarıyla eşleştirir ve eksik sınıfları ayırır', () => {
    const result = buildAbcXyz(
      [
        { product: 'İplik', group: 'A' },
        { product: 'Motor', group: 'B' },
        { product: 'Conta', group: 'C' },
        { product: 'Rulman', group: 'C' },
      ],
      [
        { product: 'iplik', group: 'X' },
        { product: 'mOtOr', group: 'Z' },
        { product: 'Conta', group: null },
        { product: 'Pompa', group: 'Y' },
      ],
    );
    expect(result.cells.map((cell) => cell.category)).toEqual([
      'AX',
      'AY',
      'AZ',
      'BX',
      'BY',
      'BZ',
      'CX',
      'CY',
      'CZ',
    ]);
    expect(result.cells[0].products).toEqual(['İplik']);
    expect(result.cells[5].products).toEqual(['Motor']);
    expect(result.missingXyz).toEqual(['Rulman']);
    expect(result.unclassifiedXyz).toEqual(['Conta']);
    expect(result.missingAbc).toEqual(['Pompa']);
    expect(result.cells.every((cell) => cell.option.length > 0 && cell.rationale.length > 0)).toBe(
      true,
    );
    expect(buildAbcXyz([], []).cells.every((cell) => cell.products.length === 0)).toBe(true);
    expect(() => buildAbcXyz([], [{ product: 'X', group: 'A' as never }])).toThrow(/XYZ sınıfı/);
    expect(() =>
      buildAbcXyz(
        [
          { product: 'X', group: 'A' },
          { product: 'x', group: 'B' },
        ],
        [],
      ),
    ).toThrow(/birden fazla/);
  });

  it('FSN miktar yerine sıklığı ölçer ve eşik değerini hızlı sayar', () => {
    const results = calculateFsn(
      [row('A', 1, 0, 1, 0), row('B', 0, 1000, 0, 0), row('C', 0, 0, 0, 0)],
      0.5,
    );
    expect(results.map(({ activePeriods, rate, group }) => [activePeriods, rate, group])).toEqual([
      [2, 0.5, 'F'],
      [1, 0.25, 'S'],
      [0, 0, 'N'],
    ]);
    expect(calculateFsn([row('Tek dönem', 1)], 1)[0].group).toBe('F');
    expect(() => calculateFsn([row('A', -1)], 1)).toThrow(/negatif/);
    expect(() => calculateFsn([row('A', 1)], 0)).toThrow(/eşiği/i);
    expect(() => calculateFsn([row('A', 1)], 1.01)).toThrow(/eşiği/i);
  });

  it('VED iki boyuttaki en yüksek etkiyi esas alır ve gerekçe ister', () => {
    const high: VedInput = {
      product: 'A',
      operations: 'low',
      safety: 'high',
      rationale: 'Kritik işlev',
    };
    expect(
      calculateVed([
        high,
        { ...high, product: 'B', operations: 'medium', safety: 'low' },
        { ...high, product: 'C', operations: 'low', safety: 'low' },
      ]).map((item) => item.group),
    ).toEqual(['V', 'E', 'D']);
    expect(calculateVed([{ ...high, operations: 'high', safety: 'medium' }])[0].group).toBe('V');
    expect(() => calculateVed([{ ...high, rationale: '  ' }])).toThrow(/gerekçesi/);
    expect(() => calculateVed([{ ...high, safety: 'unknown' as never }])).toThrow(/güvenlik/);
  });
});

describe('Sipariş miktarı, sipariş noktası ve emniyet stoku', () => {
  const eoq = { annualDemand: 1000, orderingCost: 40, holdingCost: 2 };

  it('EOQ optimumunda iki maliyeti eşitler ve eğri en düşük maliyeti gösterir', () => {
    const result = calculateEoq(eoq);
    expect(result).toEqual({
      kind: 'optimum',
      quantity: 200,
      costs: { ordering: 200, holding: 200, total: 400 },
    });
    const curve = sampleEoqCosts(eoq, 200);
    expect(curve[0].quantity).toBe(50);
    expect(curve.at(-1)?.quantity).toBe(800);
    expect(Math.min(...curve.map((point) => point.total))).toBe(400);
    expect(curve[12]).toMatchObject({ quantity: 200, total: 400 });
  });

  it('EOQ sıfır maliyetleri, sıfır talebi ve geçersiz girdileri ele alır', () => {
    expect(calculateEoq({ ...eoq, annualDemand: 0 })).toMatchObject({
      kind: 'no-demand',
      quantity: 0,
    });
    expect(calculateEoq({ ...eoq, orderingCost: 0 }).kind).toBe('zero-ordering');
    expect(calculateEoq({ ...eoq, holdingCost: 0 }).kind).toBe('zero-holding');
    expect(calculateEoq({ ...eoq, orderingCost: 0, holdingCost: 0 }).kind).toBe('all-lots');
    expect(() => calculateEoq({ ...eoq, orderingCost: -1 })).toThrow(/negatif/);
    expect(() => annualEoqCosts(eoq, 0)).toThrow(/sıfır/);
    expect(() => sampleEoqCosts(eoq, Infinity)).toThrow(/sonlu/);
    expect(
      annualEoqCosts({ annualDemand: 1e300, orderingCost: 1e-300, holdingCost: 0 }, 1e-20).ordering,
    ).toBeCloseTo(1e20, -6);
    expect(
      calculateEoq({ annualDemand: 1e300, orderingCost: 1e-300, holdingCost: 2 }),
    ).toMatchObject({ quantity: 1 });
  });

  it('ROP kesirli süreyi ve sıfır tedarik süresini destekler', () => {
    const input = { demandPerPeriod: 7.5, leadTimePeriods: 2.5, safetyStock: 3 };
    expect(calculateRop(input)).toEqual({
      expectedDemand: 18.75,
      reorderPoint: 21.75,
      wholeUnitReorderPoint: 22,
    });
    expect(calculateRop({ ...input, leadTimePeriods: 0 }).reorderPoint).toBe(3);
    expect(
      calculateRop({ demandPerPeriod: 0, leadTimePeriods: 1, safetyStock: 0 }).reorderPoint,
    ).toBe(0);
    expect(() => calculateRop({ ...input, safetyStock: Infinity })).toThrow(/sonlu/);
    expect(() => calculateRop({ ...input, demandPerPeriod: Number.MAX_VALUE })).toThrow(
      /aralığını/,
    );
  });

  it('sabit ve bağımsız değişken teslim süresinde bilinen normal sonuçları verir', () => {
    const fixed = calculateSafetyStock({
      model: 'fixed',
      serviceLevel: 0.95,
      demand: [8, 10, 12],
      leadTime: 4,
    });
    expect(fixed).toMatchObject({ expectedDemand: 40, wholeUnitSafetyStock: 7 });
    expect(fixed.leadTimeDeviation).toBeCloseTo(4);
    expect(fixed.safetyStock).toBeCloseTo(6.5794145, 6);
    const variable = calculateSafetyStock({
      model: 'variable',
      serviceLevel: 0.99,
      demand: [8, 10, 12],
      leadTimes: [2, 3, 4],
    });
    expect(variable.expectedDemand).toBeCloseTo(30);
    expect(variable.leadTimeDeviation).toBeCloseTo(Math.sqrt(112));
    expect(variable.safetyStock).toBeCloseTo(2.326347874 * Math.sqrt(112), 6);
    const fixedAsVariable = calculateSafetyStock({
      model: 'variable',
      serviceLevel: 0.95,
      demand: [8, 10, 12],
      leadTimes: [4, 4],
    });
    expect(fixedAsVariable.safetyStock).toBeCloseTo(fixed.safetyStock);
  });

  it('ampirik sıra, alt tampon sınırı ve yüzdelik kenarlarını hesaplar', () => {
    const input = { model: 'empirical', leadTimeDemand: [30, 0, 10, 10] } as const;
    expect(calculateSafetyStock({ ...input, serviceLevel: 0.75 })).toMatchObject({
      quantile: 10,
      rank: 3,
      safetyStock: 0,
    });
    expect(calculateSafetyStock({ ...input, serviceLevel: 0.9 })).toMatchObject({
      quantile: 30,
      rank: 4,
      safetyStock: 17.5,
      wholeUnitSafetyStock: 18,
    });
    const numbers = Array.from({ length: 100 }, (_, index) => index + 1);
    expect(
      calculateSafetyStock({ ...input, leadTimeDemand: numbers, serviceLevel: 0.55 }),
    ).toMatchObject({ rank: 55, quantile: 55 });
    expect(input.leadTimeDemand).toEqual([30, 0, 10, 10]);
  });

  it('sabit modelde sıfır varyansı ve süreyi kabul eder, eksik veya geçersiz gözlemi reddeder', () => {
    const base = { model: 'fixed', serviceLevel: 0.5, demand: [5, 5], leadTime: 0 } as const;
    expect(calculateSafetyStock(base)).toMatchObject({ safetyStock: 0, expectedDemand: 0 });
    expect(calculateSafetyStock({ ...base, serviceLevel: 0.999999, leadTime: 3 }).safetyStock).toBe(
      0,
    );
    expect(calculateSafetyStock({ ...base, demand: [4, 6], leadTime: 3 }).safetyStock).toBe(0);
    expect(() => calculateSafetyStock({ ...base, serviceLevel: 1 })).toThrow(/servis/);
    expect(() => calculateSafetyStock({ ...base, serviceLevel: 0.49 })).toThrow(/servis/);
    expect(() => calculateSafetyStock({ ...base, demand: [5] })).toThrow(/2 dönem/);
    expect(() => calculateSafetyStock({ ...base, model: 'variable', leadTimes: [1, -1] })).toThrow(
      /negatif/,
    );
  });
});

describe('Stok maliyeti simülasyonu', () => {
  const input = {
    demand: [3, 4, 7, 2],
    initialStock: 2,
    leadTime: 1,
    orderingCost: 2,
    holdingCost: 1,
    shortageCost: 3,
  };
  const q = { kind: 'fixed-lot', name: 'Q', reorderPoint: 2, orderQuantity: 5 } as const;
  const r = { kind: 'order-up-to', name: 'R', reviewInterval: 2, targetStock: 8 } as const;

  it('iki politika için teslimat, kayıp satış, stok ve maliyetleri elle izlenen sonuçlarla eşler', () => {
    const result = compareStockPolicies(input, [q, r]);
    expect(result.baseline[0]).toMatchObject({
      orders: 2,
      ordering: 4,
      holding: 4,
      shortage: 21,
      total: 29,
      endingStock: 3,
      endingOnOrder: 0,
      averageEndingStock: 1,
      unfilled: 7,
      fillRate: 9 / 16,
    });
    expect(result.baseline[1]).toMatchObject({
      orders: 2,
      ordering: 4,
      holding: 6,
      shortage: 18,
      total: 28,
      endingStock: 4,
      endingOnOrder: 0,
      averageEndingStock: 1.5,
      unfilled: 6,
      fillRate: 10 / 16,
    });
  });

  it('sıfır süreli teslimatı anında alır ve ufuk sonrasına kalan siparişleri sayar', () => {
    const instant = compareStockPolicies({ ...input, demand: [5], initialStock: 0, leadTime: 0 }, [
      q,
    ]).baseline[0];
    expect(instant).toMatchObject({ unfilled: 0, total: 2, endingStock: 0, endingOnOrder: 0 });
    const late = compareStockPolicies(
      { ...input, demand: [5, 5, 5], initialStock: 0, leadTime: 20 },
      [q, r],
    ).baseline;
    expect(
      late.map(({ orders, endingOnOrder, unfilled }) => [orders, endingOnOrder, unfilled]),
    ).toEqual([
      [1, 5, 15],
      [1, 8, 15],
    ]);
  });

  it('duyarlılıkta yalnızca ilgili girdiyi değiştirir, tekrar eden ve baz çarpanlarını tekrar etmez', () => {
    const result = compareStockPolicies(input, [q, r], {
      demandFactors: [0, 0, 1],
      holdingCostFactors: [2],
    });
    expect(result.changes.map(({ driver, factor }) => [driver, factor])).toEqual([
      ['demand', 0],
      ['holding', 2],
    ]);
    expect(result.changes[0].results[0]).toMatchObject({ fillRate: null, total: 25, unfilled: 0 });
    expect(result.changes[1].results[0]).toMatchObject({
      fillRate: 9 / 16,
      total: 33,
      unfilled: 7,
    });
    expect(result.baseline[0].total).toBe(29);
  });

  it('simülasyon hatalı ufuk, politika ve çarpanları reddeder', () => {
    expect(() => compareStockPolicies({ ...input, demand: [] }, [q])).toThrow(/1 dönem/);
    expect(() => compareStockPolicies({ ...input, leadTime: 0.5 }, [q])).toThrow(/tam sayı/);
    expect(() => compareStockPolicies(input, [q, { ...r, name: q.name }])).toThrow(/farklı/);
    expect(() => compareStockPolicies(input, [{ ...q, orderQuantity: 0 }])).toThrow(
      /sıfırdan büyük/,
    );
    expect(() => compareStockPolicies(input, [{ ...r, reviewInterval: 0 }])).toThrow(/tam sayı/);
    expect(() =>
      compareStockPolicies(input, [{ ...r, kind: 'unknown' } as unknown as StockPolicy]),
    ).toThrow(/Geçersiz/);
    expect(() => compareStockPolicies(input, [r], { holdingCostFactors: [-1] })).toThrow(/negatif/);
  });
});
