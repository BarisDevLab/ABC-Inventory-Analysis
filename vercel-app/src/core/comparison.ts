import { UserInputError } from './user-error';
import { GROUPS, normalizeProduct } from './abc';
import type { Analysis, AnalysisRow, Group } from './abc';

export interface ProductChange {
  previous?: AnalysisRow;
  current?: AnalysisRow;
  difference: number;
  percent: number | null;
}
export interface Comparison {
  identity: 'sku' | 'product';
  matrix: Record<Group, Record<Group, number>>;
  changes: ProductChange[];
  added: number;
  removed: number;
  moved: number;
  previousTotal: number;
  currentTotal: number;
  difference: number;
  percent: number | null;
}

function percentage(previous: number, current: number): number | null {
  if (previous === 0) return null;
  const result = (current - previous) / previous * 100;
  return Number.isFinite(result) ? result : null;
}

export function compareAnalyses(previous: Analysis, current: Analysis): Comparison {
  const bySku = previous.rows.every(row => row.sku !== undefined) && current.rows.every(row => row.sku !== undefined);
  const index = (rows: AnalysisRow[]) => {
    const products = new Map<string, AnalysisRow>();
    for (const row of rows) {
      const id = bySku ? row.sku! : normalizeProduct(row.product);
      if (products.has(id)) {
        throw new UserInputError('Dönemler adla eşleştirilemiyor. Yinelenen ürün adları için her iki dönemde de benzersiz ürün kodu seçin.');
      }
      products.set(id, row);
    }
    return products;
  };
  const before = index(previous.rows), after = index(current.rows);
  const transitions = new Map(GROUPS.map(group => [group, new Map(GROUPS.map(destination => [destination, 0]))]));
  let added = 0, removed = 0, moved = 0;
  const changes: ProductChange[] = [];
  for (const id of new Set([...after.keys(), ...before.keys()])) {
    const previous = before.get(id), current = after.get(id);
    if (!previous) added++;
    else if (!current) removed++;
    else {
      const destinations = transitions.get(previous.group);
      const count = destinations?.get(current.group);
      if (destinations === undefined || count === undefined) {
        throw new UserInputError('Karşılaştırmada geçersiz ABC grubu var.');
      }
      destinations.set(current.group, count + 1);
      if (previous.group !== current.group) moved++;
    }
    const oldValue = previous?.value ?? 0, newValue = current?.value ?? 0;
    changes.push({ previous, current, difference: newValue - oldValue, percent: percentage(oldValue, newValue) });
  }
  changes.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
  const counts = (group: Group) => {
    const destinations = transitions.get(group)!;
    return { A: destinations.get('A')!, B: destinations.get('B')!, C: destinations.get('C')! };
  };
  const matrix = { A: counts('A'), B: counts('B'), C: counts('C') };
  return {
    identity: bySku ? 'sku' : 'product', matrix, changes, added, removed, moved,
    previousTotal: previous.total, currentTotal: current.total,
    difference: current.total - previous.total, percent: percentage(previous.total, current.total),
  };
}

export function summarizeScenario(previous: Analysis, current: Analysis) {
  const { matrix, moved } = compareAnalyses(previous, current);
  return {
    matrix, moved, classes: GROUPS.map((group, index) => ({
      group, previous: previous.summary[index], current: current.summary[index],
    })),
  };
}
