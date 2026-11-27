import { useId, useState } from 'react';
import { fieldNumber, fieldText, readSeries } from '../shared/inputs';
import {
  BarChart,
  Field,
  Method,
  Metrics,
  ModuleForm,
  formatInventoryNumber as n,
} from '../shared/ui';
import { calculateSafetyStock } from './calculate';
import type { SafetyStockInput } from './calculate';

export function SafetyStockPanel() {
  const [model, setModel] = useState<SafetyStockInput['model'] | ''>('');
  const modelId = useId();
  return (
    <>
      <h2>Emniyet stoku</h2>
      <p>Bir ikmal çevriminde stoksuzluk yaşamama hedefi için talep tamponunu inceleyin.</p>
      <ModuleForm
        onReset={() => setModel('')}
        compute={(form) => {
          if (!model) throw new Error('Emniyet stoku modelini seçin.');
          const serviceLevel = fieldNumber(form, 'service', 'Çevrim servis seviyesi') / 100;
          if (model === 'empirical') {
            return calculateSafetyStock({
              model,
              serviceLevel,
              leadTimeDemand: readSeries(
                fieldText(form, 'leadDemand'),
                'Tedarik süresi talep gözlemlerini',
              ),
            });
          }
          const demand = readSeries(fieldText(form, 'demand'), 'Dönemsel talep değerlerini');
          if (model === 'fixed') {
            return calculateSafetyStock({
              model,
              serviceLevel,
              demand,
              leadTime: fieldNumber(form, 'lead', 'Sabit tedarik süresi'),
            });
          }
          return calculateSafetyStock({
            model,
            serviceLevel,
            demand,
            leadTimes: readSeries(fieldText(form, 'leadTimes'), 'Tedarik süresi gözlemlerini'),
          });
        }}
        renderResult={(result) => (
          <>
            <Metrics
              values={[
                ['Beklenen tedarik süresi talebi', `${n(result.expectedDemand)} adet`],
                ['Tedarik süresi talep sapması', `${n(result.leadTimeDeviation)} adet`],
                ['Emniyet stoku', `${n(result.safetyStock)} adet`],
                ['Yukarı yuvarlanmış tampon', `${n(result.wholeUnitSafetyStock)} adet`],
                result.model === 'empirical'
                  ? [
                      'Ampirik persentil',
                      `${n(result.quantile)} adet · ${result.rank}/${result.sampleSize}. sıra`,
                    ]
                  : ['Normal dağılım katsayısı z', n(result.z)],
              ]}
            />
            {result.model === 'empirical' && result.rank === result.sampleSize && (
              <p>
                Hedef yüzdelik, gözlenen en büyük talebe denk geliyor. Daha fazla bağımsız çevrimle
                üst kuyruğu değerlendirin.
              </p>
            )}
            <BarChart
              title="Tedarik süresi talebi ve tampon (adet)"
              values={[
                ['Beklenen talep', result.expectedDemand],
                ['Emniyet stoku', result.safetyStock],
              ]}
            />
          </>
        )}
      >
        <label className="inventory-field" htmlFor={modelId}>
          <span>İstatistiksel model</span>
          <select
            id={modelId}
            value={model}
            onChange={(event) => setModel(event.target.value as typeof model)}
          >
            <option value="">Model seçin</option>
            <option value="fixed">Normal · Sabit tedarik süresi</option>
            <option value="variable">Normal · Değişken tedarik süresi</option>
            <option value="empirical">Gözlenen tedarik süresi talebi · Ampirik</option>
          </select>
        </label>
        <Field
          name="service"
          label="Çevrim servis seviyesi (%)"
          hint="%50 dâhil, %100 hariç. Yüzde için 95 biçimini kullanın."
        />
        {(model === 'fixed' || model === 'variable') && (
          <Field
            name="demand"
            label="Dönemsel talep (adet/dönem)"
            multiline
            hint="Kronolojik, eşit uzunluktaki en az iki dönemi yazın. Değerleri satır sonu, noktalı virgül veya sekmeyle ayırın."
          />
        )}
        {model === 'fixed' && <Field name="lead" label="Sabit tedarik süresi L (dönem)" />}
        {model === 'variable' && (
          <Field
            name="leadTimes"
            label="Tedarik süresi gözlemleri (dönem)"
            multiline
            hint="Taleple aynı zaman biriminde en az iki gözlem girin. Değerleri satır sonu, noktalı virgül veya sekmeyle ayırın."
          />
        )}
        {model === 'empirical' && (
          <Field
            name="leadDemand"
            label="Tedarik süresi talep gözlemleri (adet/çevrim)"
            multiline
            hint="En az iki tamamlanmış ikmal çevriminin toplam talebini satır sonu, noktalı virgül veya sekmeyle ayırın."
          />
        )}
      </ModuleForm>
      <Method>
        <p>
          <strong>Sabit süre:</strong> SS = zₚ · s<sub>d</sub> √L. Beklenen talep = μ<sub>d</sub>L.
          s<sub>d</sub> dönemsel talebin örneklem sapmasıdır.
        </p>
        <p>
          <strong>Değişken süre:</strong> SS = zₚ √(μ<sub>L</sub>s<sub>d</sub>² + μ<sub>d</sub>²s
          <sub>L</sub>²). Beklenen talep = μ<sub>d</sub>μ<sub>L</sub>. Dönem talepleri özdeş
          dağılımlı ve bağımsız, tedarik süresi de talepten bağımsız kabul edilir. Normal yaklaşım
          tedarik süresi talebinin yaklaşık normal olduğu serilere uygundur.
        </p>
        <p>
          <strong>Ampirik:</strong> Qₚ, sıralı çevrim taleplerinde ⌈pn⌉. gözlemdir. SS = en büyük(0,
          Qₚ − gözlenen ortalama). Ayrık veya çarpık talepte yeterli sayıda temsil edici bağımsız
          çevrim varsa değerlendirilebilir.
        </p>
        <p>
          Servis seviyesi çevrim olasılığıdır. Simülasyondaki adet bazında karşılama oranından
          farklı bir ölçüdür. Hesaplanan tamponun gerçekleşen servis seviyesini kontrol edin.
        </p>
      </Method>
    </>
  );
}
