import { finiteResult, nonNegative, validateDemand, wholeNumber } from '../shared/validation';

export type StockPolicy =
  | {
      readonly name: string;
      readonly kind: 'fixed-lot';
      readonly reorderPoint: number;
      readonly orderQuantity: number;
    }
  | {
      readonly name: string;
      readonly kind: 'order-up-to';
      readonly reviewInterval: number;
      readonly targetStock: number;
    };

export interface SimulationInput {
  readonly demand: readonly number[];
  readonly initialStock: number;
  readonly leadTime: number;
  readonly orderingCost: number;
  readonly holdingCost: number;
  readonly shortageCost: number;
}

export const SIMULATION_LIMITS = { periods: 5000, policies: 12, factorsPerDriver: 8 } as const;

function validateSimulation(input: SimulationInput, policies: readonly StockPolicy[]) {
  if (input.demand.length > SIMULATION_LIMITS.periods)
    throw new Error('En fazla 5.000 talep dönemi girin.');
  validateDemand(input.demand, 1);
  nonNegative(input.initialStock, 'Başlangıç stoku');
  wholeNumber(input.leadTime, 'Tedarik süresi');
  nonNegative(input.orderingCost, 'Sipariş maliyeti');
  nonNegative(input.holdingCost, 'Elde bulundurma maliyeti');
  nonNegative(input.shortageCost, 'Karşılanamayan talep maliyeti');
  if (policies.length < 1 || policies.length > SIMULATION_LIMITS.policies) {
    throw new Error('Bir ila 12 stok politikası girin.');
  }
  const names = new Set<string>();
  for (const policy of policies) {
    const name = policy.name.trim();
    if (!name || names.has(name))
      throw new Error('Her stok politikasına farklı ve boş olmayan bir ad verin.');
    names.add(name);
    if (policy.kind === 'fixed-lot') {
      nonNegative(policy.reorderPoint, 'Yeniden sipariş noktası');
      if (nonNegative(policy.orderQuantity, 'Sipariş miktarı') === 0)
        throw new Error('Sipariş miktarı sıfırdan büyük olmalıdır.');
    } else if (policy.kind === 'order-up-to') {
      wholeNumber(policy.reviewInterval, 'Gözden geçirme aralığı', 1);
      nonNegative(policy.targetStock, 'Hedef stok');
    } else {
      throw new Error('Geçersiz stok politikası.');
    }
  }
}

function runPolicy(input: SimulationInput, policy: StockPolicy) {
  const receipts = new Map<number, number>();
  let stock = input.initialStock;
  let onOrder = 0;
  let orders = 0;
  let demandTotal = 0;
  let fulfilledTotal = 0;
  let unfilled = 0;
  let stockTotal = 0;

  for (const [period, demand] of input.demand.entries()) {
    const receipt = receipts.get(period) ?? 0;
    stock = finiteResult(stock + receipt);
    onOrder = receipt === 0 ? onOrder : Math.max(0, onOrder - receipt);
    const position = finiteResult(stock + onOrder);
    const quantity =
      policy.kind === 'fixed-lot'
        ? position <= policy.reorderPoint
          ? policy.orderQuantity
          : 0
        : period % policy.reviewInterval === 0
          ? Math.max(0, policy.targetStock - position)
          : 0;
    if (quantity > 0) {
      orders++;
      if (input.leadTime === 0) stock = finiteResult(stock + quantity);
      else {
        onOrder = finiteResult(onOrder + quantity);
        if (input.leadTime < input.demand.length - period)
          receipts.set(period + input.leadTime, quantity);
      }
    }
    const fulfilled = Math.min(stock, demand);
    stock -= fulfilled;
    demandTotal = finiteResult(demandTotal + demand);
    fulfilledTotal = finiteResult(fulfilledTotal + fulfilled);
    unfilled = finiteResult(unfilled + (demand - fulfilled));
    stockTotal = finiteResult(stockTotal + stock);
  }

  const ordering = finiteResult(orders * input.orderingCost);
  const holding = finiteResult(stockTotal * input.holdingCost);
  const shortage = finiteResult(unfilled * input.shortageCost);
  return {
    name: policy.name.trim(),
    orders,
    averageEndingStock: stockTotal / input.demand.length,
    endingStock: stock,
    endingOnOrder: onOrder,
    unfilled,
    fillRate: demandTotal === 0 ? null : fulfilledTotal / demandTotal,
    ordering,
    holding,
    shortage,
    total: finiteResult(ordering + holding + shortage),
  };
}

export interface SensitivityInput {
  readonly demandFactors?: readonly number[];
  readonly holdingCostFactors?: readonly number[];
}

export function compareStockPolicies(
  input: SimulationInput,
  policies: readonly StockPolicy[],
  sensitivity: SensitivityInput = {},
) {
  validateSimulation(input, policies);
  const drivers = [
    ['demand', sensitivity.demandFactors ?? []],
    ['holding', sensitivity.holdingCostFactors ?? []],
  ] as const;
  for (const [, factors] of drivers) {
    if (factors.length > SIMULATION_LIMITS.factorsPerDriver)
      throw new Error('Her duyarlılık girdisi için en fazla sekiz çarpan girin.');
    for (const factor of factors) nonNegative(factor, 'Duyarlılık çarpanı');
  }
  const baseline = policies.map((policy) => runPolicy(input, policy));
  const changes = drivers.flatMap(([driver, factors]) =>
    [...new Set(factors)]
      .filter((factor) => factor !== 1)
      .map((factor) => {
        const scenario: SimulationInput =
          driver === 'demand'
            ? { ...input, demand: input.demand.map((demand) => finiteResult(demand * factor)) }
            : { ...input, holdingCost: finiteResult(input.holdingCost * factor) };
        return { driver, factor, results: policies.map((policy) => runPolicy(scenario, policy)) };
      }),
  );
  return { baseline, changes };
}
