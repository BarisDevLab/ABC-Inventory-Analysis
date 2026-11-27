import { useLocale } from '../../ui/locale';
import type { Theme } from '../../ui/locale';
import { chartStyle } from '../../charts/models';
import { COLORS, detail } from '../../ui/format';
import { useMemo } from 'react';
import { Plot } from '../../charts/Plot';
import type { Data, Layout } from 'plotly.js';
import { fieldNumber } from '../shared/inputs';
import { Field, Method, Metrics, ModuleForm } from '../shared/ui';
import { calculateEoq, sampleEoqCosts } from './calculate';
import type { EoqInput } from './calculate';

function CostCurve({ input, optimum, theme }: { input: EoqInput; optimum: number; theme: Theme }) {
  const { t, language } = useLocale();
  const { palette, axis, layout: base } = chartStyle(language, theme);
  const layout: Partial<Layout> = {
    ...base,
    height: 385,
    margin: { l: 81, r: 24, b: 80, t: 48 },
    xaxis: {
      ...axis,
      title: { text: t('Sipariş miktarı (adet)', 'Order quantity (units)') },
      automargin: true,
      gridcolor: palette.grid,
    },
    yaxis: {
      ...axis,
      title: { text: t('Yıllık maliyet (TL/yıl)', 'Annual cost (TL/year)') },
      automargin: true,
      gridcolor: palette.grid,
    },
    legend: { orientation: 'h', x: 0, y: 1.04, yanchor: 'bottom' },
    hovermode: 'closest',
    shapes: [
      {
        type: 'line',
        x0: optimum,
        x1: optimum,
        xref: 'x',
        y0: 0,
        y1: 1,
        yref: 'paper',
        layer: 'below',
        line: { color: palette.axis, dash: 'dot', width: 1.5 },
      },
    ],
  };

  const data = useMemo<Data[]>(() => {
    const points = sampleEoqCosts(input, optimum);
    return (
      [
        ['ordering', t('Sipariş', 'Ordering'), 'A', 'dash'],
        ['holding', t('Elde bulundurma', 'Holding'), 'B', 'dot'],
        ['total', t('Toplam', 'Total'), 'C', 'solid'],
      ] as const
    ).map(([key, name, series, dash]) => ({
      type: 'scatter',
      mode: 'lines+markers',
      name,
      x: points.map((point) => point.quantity),
      y: points.map((point) => point[key]),
      customdata: points.map((point) => [
        detail(point.quantity, language),
        detail(point[key], language),
      ]),
      line: {
        color: theme === 'dark' ? COLORS[series] : palette.edges[series],
        dash,
        width: key === 'total' ? 3.2 : 2.2,
      },
      marker: {
        color: COLORS[series],
        size: points.map((point) => (point.quantity === optimum ? 9 : 4)),
        line: { color: palette.surface, width: 1 },
      },
      hovertemplate: `<b>${name}</b><br>${t('Sipariş miktarı', 'Order quantity')} · %{customdata[0]}<br>${t('Yıllık maliyet', 'Annual cost')} · %{customdata[1]} TL<extra></extra>`,
    }));
  }, [input, optimum, t, language, theme, palette.edges, palette.surface]);
  return (
    <Plot
      data={data}
      layout={layout}
      label={t(
        'EOQ yıllık sipariş, elde bulundurma ve toplam maliyet eğrileri',
        'EOQ annual ordering, holding, and total cost curves',
      )}
    />
  );
}

export function EoqPanel({ theme = 'light' }: { theme?: Theme }) {
  const { t, detail: n } = useLocale();
  return (
    <>
      <h2>{t('Ekonomik sipariş miktarı (EOQ)', 'Economic order quantity (EOQ)')}</h2>
      <p>
        {t(
          'Sipariş ve elde bulundurma maliyetlerinin yıllık toplamını en aza indiren teorik parti büyüklüğünü inceleyin.',
          'Find the theoretical batch size that minimizes annual ordering and holding costs.',
        )}
      </p>
      <ModuleForm
        compute={(form) => {
          const input = {
            annualDemand: fieldNumber(form, 'demand', t('Yıllık talep', 'Annual demand')),
            orderingCost: fieldNumber(form, 'ordering', t('Sipariş maliyeti', 'Ordering cost')),
            holdingCost: fieldNumber(form, 'holding', 'Elde bulundurma maliyeti'),
          };
          return { input, result: calculateEoq(input) };
        }}
        renderResult={({ input, result }) => {
          if (result.kind === 'all-lots')
            return (
              <p>
                {t(
                  'Tüm pozitif parti büyüklüklerinde ilgili yıllık maliyet 0 TL’dir.',
                  'All positive batch sizes have zero relevant annual cost.',
                )}
              </p>
            );
          if (result.kind === 'zero-ordering')
            return (
              <p>
                {t(
                  'Sipariş maliyeti sıfırdır. Modelde Q sıfıra yaklaştıkça maliyet azalır. En küçük uygulanabilir parti büyüklüğünü değerlendirin.',
                  'The ordering cost is zero. Modelled costs fall as Q approaches zero. Consider the smallest feasible batch.',
                )}
              </p>
            );
          if (result.kind === 'zero-holding')
            return (
              <p>
                {t(
                  'Elde bulundurma maliyeti sıfırdır. Modelde parti büyüdükçe maliyet azalır. Uygulanabilir üst sınır için kapasite ve raf ömrünü değerlendirin.',
                  'The holding cost is zero. Modelled costs fall as batch size increases. Check capacity and shelf life to determine a feasible maximum.',
                )}
              </p>
            );
          return (
            <>
              {result.kind === 'no-demand' && (
                <p>
                  {t(
                    'Yıllık talep sıfırdır. Modelin sonucu sipariş vermemektir.',
                    'Annual demand is zero. The model calls for zero orders.',
                  )}
                </p>
              )}
              <Metrics
                values={[
                  [
                    t('Ekonomik sipariş miktarı', 'Economic order quantity'),
                    t(`${n(result.quantity)} adet`, `${n(result.quantity)} units`),
                  ],
                  [
                    t('Yıllık sipariş maliyeti', 'Annual ordering cost'),
                    t(`${n(result.costs.ordering)} TL/yıl`, `${n(result.costs.ordering)} TL/year`),
                  ],
                  [
                    t('Yıllık elde bulundurma maliyeti', 'Annual holding cost'),
                    t(`${n(result.costs.holding)} TL/yıl`, `${n(result.costs.holding)} TL/year`),
                  ],
                  [
                    t('Toplam ilgili maliyet', 'Total relevant cost'),
                    t(`${n(result.costs.total)} TL/yıl`, `${n(result.costs.total)} TL/year`),
                  ],
                ]}
              />
              {result.kind === 'optimum' && (
                <CostCurve input={input} optimum={result.quantity} theme={theme} />
              )}
            </>
          );
        }}
      >
        <Field
          name="demand"
          label={t('Yıllık talep D (adet/yıl)', 'Annual demand D (units/year)')}
        />
        <Field
          name="ordering"
          label={t('Sipariş maliyeti S (TL/sipariş)', 'Ordering cost S (TL/order)')}
        />
        <Field
          name="holding"
          label={t('Elde bulundurma maliyeti H (TL/adet/yıl)', 'Holding cost H (TL/unit/year)')}
        />
      </ModuleForm>
      <Method>
        <p>
          {t(
            'Q* = √(2DS/H). Q adette yıllık sipariş maliyeti DS/Q, elde bulundurma maliyeti HQ/2, toplam ilgili maliyet bu iki kalemin toplamıdır.',
            'Q* = √(2DS/H). For quantity Q, annual ordering cost is DS/Q and holding cost is HQ/2. Their sum gives the total relevant cost.',
          )}
        </p>
        <p>
          {t(
            'Talep ve birim fiyat sabit, sipariş tek seferde teslim edilir. Model stoksuzluk, miktar indirimi, satın alma maliyeti, asgari lot ve kapasite kısıtlarını kapsamaz. Uygulanabilir partileri seçmeden önce komşu lotların maliyetini ve kısıtları inceleyin.',
            'Demand and unit price are constant, with each order arriving in one delivery. Stockouts, quantity discounts, purchase costs, minimum batches and capacity constraints are outside the model. Check nearby feasible batch sizes and costs before choosing one.',
          )}
        </p>
      </Method>
    </>
  );
}
