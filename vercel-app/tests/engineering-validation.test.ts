import ExcelJS from 'exceljs';
import { expect, it } from 'vitest';
import { calculateAbc, FIELDS } from '../src/core/abc';
import { compareAnalyses, summarizeScenario } from '../src/core/comparison';
import { paretoModel } from '../src/charts/models';
import { createExcelReport } from '../src/export/excel-report';
import { annualEoqCosts } from '../src/inventory/eoq/calculate';
import { calculateSafetyStock } from '../src/inventory/safety-stock/calculate';
import { compareStockPolicies } from '../src/inventory/simulation/calculate';

it('ampirik kantilde CDF eşiğinin hemen üzerindeki olasılığı üst sıraya geçirir', () => {
  const input = { model: 'empirical', leadTimeDemand: [1, 4, 10] } as const;
  expect(calculateSafetyStock({ ...input, serviceLevel: 2 / 3 })).toMatchObject({ rank: 2, safetyStock: 0 });
  expect(calculateSafetyStock({ ...input, serviceLevel: 0.6666666666666667 })).toMatchObject({
    rank: 3, quantile: 10, expectedDemand: 5, safetyStock: 5,
  });
});

it('EOQ maliyetinde ara çarpımın çok küçük olması anlamlı basamakları kaybettirmez', () => {
  const { ordering } = annualEoqCosts({ annualDemand: 1e-200, orderingCost: 5e-124, holdingCost: 0 }, 1e-200);
  expect(ordering / 5e-124).toBeCloseTo(1, 14);
});

it('Pareto ekseni temsil edilebilen en küçük yıllık değeri de işaretler', () => {
  const { rows, targets } = calculateAbc({ columns: [...FIELDS], rows: [['Örnek', 1, Number.MIN_VALUE]] });
  expect(paretoModel(rows, targets, false, 'zoom', 0).layout.yaxis?.tickvals).toEqual([0, Number.MIN_VALUE]);
});

it('ABC sınırı, Pareto kümülatifi, senaryo, dönem ve Excel aynı girdilerle eşleşir', async () => {
  const columns = [...FIELDS];
  const rows = [['Bir', 80, 1], ['İki', 15, 1], ['Üç', 5, 1]];
  const base = calculateAbc({ columns, rows });
  expect(base.rows.map(row => row.group)).toEqual(['A', 'B', 'C']);
  expect(paretoModel(base.rows, base.targets, false, 'zoom', 0).data[1]).toMatchObject({ y: [80, 95, 100] });
  const scenario = summarizeScenario(base, calculateAbc({ columns, rows }, { a: 85, b: 10, c: 5 }));
  expect(scenario).toMatchObject({ moved: 1, matrix: { B: { A: 1 } } });

  const current = calculateAbc({ columns, rows: [['Bir', 100, 1], ...rows.slice(1)] });
  expect(compareAnalyses(base, current).changes[0]).toMatchObject({ difference: 20, percent: 25 });

  const book = new ExcelJS.Workbook();
  await book.xlsx.load((await createExcelReport(current)).slice().buffer);
  expect(book.getWorksheet('ABC Analizi')?.getColumn(6).values.slice(2)).toEqual(current.rows.map(row => row.cumulative));
  const decimal = calculateAbc({ columns, rows: [0.6, 0.5, 0.4, 0.3, 0.2, 0.119, 0.1]
    .map((value, index) => [String(index), 1, value]) });
  // Regrouping the already summed values differs by one floating-point step.
  expect(decimal.summary.reduce((total, group) => total + group.value, 0)).not.toBe(decimal.total);
  const decimalBook = new ExcelJS.Workbook();
  await decimalBook.xlsx.load((await createExcelReport(decimal)).slice().buffer);
  expect(decimalBook.getWorksheet('Grup Özeti')?.getColumn(4).values.slice(2)).toEqual(decimal.summary.map(group => group.share));
});

it('dönem başı teslimat, kayıp satış ve dönem sonu stok maliyetini ayrı hesaplar', () => {
  const result = compareStockPolicies({
    demand: [4, 6, 3], initialStock: 4, leadTime: 1, orderingCost: 4, holdingCost: 1, shortageCost: 2,
  }, [{ name: 'Q', kind: 'fixed-lot', reorderPoint: 2, orderQuantity: 5 }]).baseline[0];
  expect(result).toMatchObject({ orders: 1, unfilled: 6, endingStock: 2, total: 18, fillRate: 7 / 13 });
});
