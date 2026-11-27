import { useMemo } from 'react';
import { Plot } from '../../charts/Plot';
import type { Data, Layout } from 'plotly.js';
import { fieldNumber } from '../shared/inputs';
import { Field, Method, Metrics, ModuleForm, formatInventoryNumber as n } from '../shared/ui';
import { calculateEoq, sampleEoqCosts } from './calculate';
import type { EoqInput } from './calculate';

const layout: Partial<Layout> = {
  margin: { l: 75, r: 18, b: 85, t: 18 },
  xaxis: { title: { text: 'Sipariş miktarı (adet)' }, automargin: true },
  yaxis: { title: { text: 'Yıllık maliyet (TL/yıl)' }, automargin: true },
  legend: { orientation: 'h', y: -0.25 },
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: { color: '#8392a7' },
};

function CostCurve({ input, optimum }: { input: EoqInput; optimum: number }) {
  const data = useMemo<Data[]>(() => {
    const points = sampleEoqCosts(input, optimum);
    return [
      ['ordering', 'Sipariş', '#4f8cff'],
      ['holding', 'Elde bulundurma', '#f59e0b'],
      ['total', 'Toplam', '#159a8c'],
    ].map(([key, name, color]) => ({
      type: 'scatter',
      mode: 'lines+markers',
      name,
      x: points.map((point) => point.quantity),
      y: points.map((point) => point[key as 'ordering' | 'holding' | 'total']),
      marker: { size: 4, color },
    }));
  }, [input, optimum]);
  return (
    <Plot
      data={data}
      layout={layout}
      label="EOQ yıllık sipariş, elde bulundurma ve toplam maliyet eğrileri"
    />
  );
}

export function EoqPanel() {
  return (
    <>
      <h2>Ekonomik sipariş miktarı (EOQ)</h2>
      <p>
        Sipariş ve elde bulundurma maliyetlerinin yıllık toplamını en aza indiren teorik parti
        büyüklüğünü inceleyin.
      </p>
      <ModuleForm
        compute={(form) => {
          const input = {
            annualDemand: fieldNumber(form, 'demand', 'Yıllık talep'),
            orderingCost: fieldNumber(form, 'ordering', 'Sipariş maliyeti'),
            holdingCost: fieldNumber(form, 'holding', 'Elde bulundurma maliyeti'),
          };
          return { input, result: calculateEoq(input) };
        }}
        renderResult={({ input, result }) => {
          if (result.kind === 'all-lots')
            return <p>Tüm pozitif parti büyüklüklerinde ilgili yıllık maliyet 0 TL’dir.</p>;
          if (result.kind === 'zero-ordering')
            return (
              <p>
                Sipariş maliyeti sıfırdır. Modelde Q sıfıra yaklaştıkça maliyet azalır. En küçük
                uygulanabilir parti büyüklüğünü değerlendirin.
              </p>
            );
          if (result.kind === 'zero-holding')
            return (
              <p>
                Elde bulundurma maliyeti sıfırdır. Modelde parti büyüdükçe maliyet azalır.
                Uygulanabilir üst sınır için kapasite ve raf ömrünü değerlendirin.
              </p>
            );
          return (
            <>
              {result.kind === 'no-demand' && (
                <p>Yıllık talep sıfırdır. Modelin sonucu sipariş vermemektir.</p>
              )}
              <Metrics
                values={[
                  ['Ekonomik sipariş miktarı', `${n(result.quantity)} adet`],
                  ['Yıllık sipariş maliyeti', `${n(result.costs.ordering)} TL/yıl`],
                  ['Yıllık elde bulundurma maliyeti', `${n(result.costs.holding)} TL/yıl`],
                  ['Toplam ilgili maliyet', `${n(result.costs.total)} TL/yıl`],
                ]}
              />
              {result.kind === 'optimum' && <CostCurve input={input} optimum={result.quantity} />}
            </>
          );
        }}
      >
        <Field name="demand" label="Yıllık talep D (adet/yıl)" />
        <Field name="ordering" label="Sipariş maliyeti S (TL/sipariş)" />
        <Field name="holding" label="Elde bulundurma maliyeti H (TL/adet/yıl)" />
      </ModuleForm>
      <Method>
        <p>
          Q* = √(2DS/H). Q adette yıllık sipariş maliyeti DS/Q, elde bulundurma maliyeti HQ/2,
          toplam ilgili maliyet bu iki kalemin toplamıdır.
        </p>
        <p>
          Talep ve birim fiyat sabit, sipariş tek seferde teslim edilir. Model stoksuzluk, miktar
          indirimi, satın alma maliyeti, asgari lot ve kapasite kısıtlarını kapsamaz. Uygulanabilir
          partileri seçmeden önce komşu lotların maliyetini ve kısıtları inceleyin.
        </p>
      </Method>
    </>
  );
}
