import { useLocale } from '../../ui/locale';
import { useId, useState } from 'react';
import { fieldNumber, fieldText, readSeries } from '../shared/inputs';
import { BarChart, Field, Method, Metrics, ModuleForm } from '../shared/ui';
import { calculateSafetyStock } from './calculate';
import type { SafetyStockInput } from './calculate';

export function SafetyStockPanel() {
  const { t, detail: n } = useLocale();
  const [model, setModel] = useState<SafetyStockInput['model'] | ''>('');
  const modelId = useId();
  return (
    <>
      <h2>Emniyet stoku</h2>
      <p>
        {t(
          'Bir ikmal çevriminde stoksuzluk yaşamama hedefi için talep tamponunu inceleyin.',
          'Estimate the inventory buffer for a target probability of avoiding stockouts during a replenishment cycle.',
        )}
      </p>
      <ModuleForm
        onReset={() => setModel('')}
        compute={(form) => {
          if (!model)
            throw new Error(t('Emniyet stoku modelini seçin.', 'Select a safety stock model.'));
          const serviceLevel =
            fieldNumber(form, 'service', t('Çevrim servis seviyesi', 'Cycle service level')) / 100;
          if (model === 'empirical') {
            return calculateSafetyStock({
              model,
              serviceLevel,
              leadTimeDemand: readSeries(
                fieldText(form, 'leadDemand'),
                t('Tedarik süresi talep gözlemlerini', 'Lead-time demand observations'),
              ),
            });
          }
          const demand = readSeries(
            fieldText(form, 'demand'),
            t('Dönemsel talep değerlerini', 'Periodic demand values'),
          );
          if (model === 'fixed') {
            return calculateSafetyStock({
              model,
              serviceLevel,
              demand,
              leadTime: fieldNumber(form, 'lead', t('Sabit tedarik süresi', 'Fixed lead time')),
            });
          }
          return calculateSafetyStock({
            model,
            serviceLevel,
            demand,
            leadTimes: readSeries(
              fieldText(form, 'leadTimes'),
              t('Tedarik süresi gözlemlerini', 'Lead-time observations'),
            ),
          });
        }}
        renderResult={(result) => (
          <>
            <Metrics
              values={[
                [
                  t('Beklenen tedarik süresi talebi', 'Expected lead-time demand'),
                  t(`${n(result.expectedDemand)} adet`, `${n(result.expectedDemand)} units`),
                ],
                [
                  t('Tedarik süresi talep sapması', 'Lead-time demand deviation'),
                  t(`${n(result.leadTimeDeviation)} adet`, `${n(result.leadTimeDeviation)} units`),
                ],
                [
                  'Emniyet stoku',
                  t(`${n(result.safetyStock)} adet`, `${n(result.safetyStock)} units`),
                ],
                [
                  t('Yukarı yuvarlanmış tampon', 'Buffer rounded up'),
                  t(
                    `${n(result.wholeUnitSafetyStock)} adet`,
                    `${n(result.wholeUnitSafetyStock)} units`,
                  ),
                ],
                result.model === 'empirical'
                  ? [
                      t('Ampirik persentil', 'Empirical percentile'),
                      t(
                        `${n(result.quantile)} adet · ${result.rank}/${result.sampleSize}. sıra`,
                        `${n(result.quantile)} units · rank ${result.rank}/${result.sampleSize}`,
                      ),
                    ]
                  : [t('Normal dağılım katsayısı z', 'Normal distribution factor z'), n(result.z)],
              ]}
            />
            {result.model === 'empirical' && result.rank === result.sampleSize && (
              <p>
                {t(
                  'Hedef yüzdelik, gözlenen en büyük talebe denk geliyor. Daha fazla bağımsız çevrimle üst kuyruğu değerlendirin.',
                  'The target percentile equals the largest observed demand. Use more independent cycles to assess the upper tail.',
                )}
              </p>
            )}
            <BarChart
              title={t(
                'Tedarik süresi talebi ve tampon (adet)',
                'Lead-time demand and buffer (units)',
              )}
              values={[
                [t('Beklenen talep', 'Expected demand'), result.expectedDemand],
                [t('Emniyet stoku', 'Safety stock'), result.safetyStock],
              ]}
            />
          </>
        )}
      >
        <label className="inventory-field" htmlFor={modelId}>
          <span>{t('İstatistiksel model', 'Statistical model')}</span>
          <select
            id={modelId}
            value={model}
            onChange={(event) => setModel(event.target.value as typeof model)}
          >
            <option value="">{t('Model seçin', 'Select a model')}</option>
            <option value="fixed">
              {t('Normal · Sabit tedarik süresi', 'Normal · Fixed lead time')}
            </option>
            <option value="variable">
              {t('Normal · Değişken tedarik süresi', 'Normal · Variable lead time')}
            </option>
            <option value="empirical">
              {t(
                'Gözlenen tedarik süresi talebi · Ampirik',
                'Observed lead-time demand · Empirical',
              )}
            </option>
          </select>
        </label>
        <Field
          name="service"
          label={t('Çevrim servis seviyesi (%)', 'Cycle service level (%)')}
          hint={t(
            '%50 dâhil, %100 hariç. Yüzde için 95 biçimini kullanın.',
            'Enter a percentage from 50 inclusive to 100 exclusive, for example 95.',
          )}
        />
        {(model === 'fixed' || model === 'variable') && (
          <Field
            name="demand"
            label={t('Dönemsel talep (adet/dönem)', 'Periodic demand (units/period)')}
            multiline
            hint={t(
              'Kronolojik, eşit uzunluktaki en az iki dönemi yazın. Değerleri satır sonu, noktalı virgül veya sekmeyle ayırın.',
              'Enter at least two equal periods in chronological order. Separate values with a newline, semicolon, or tab.',
            )}
          />
        )}
        {model === 'fixed' && (
          <Field
            name="lead"
            label={t('Sabit tedarik süresi L (dönem)', 'Fixed lead time L (periods)')}
          />
        )}
        {model === 'variable' && (
          <Field
            name="leadTimes"
            label={t('Tedarik süresi gözlemleri (dönem)', 'Lead-time observations (periods)')}
            multiline
            hint={t(
              'Taleple aynı zaman biriminde en az iki gözlem girin. Değerleri satır sonu, noktalı virgül veya sekmeyle ayırın.',
              'Enter at least two observations in the same time unit as demand. Separate them with a newline, semicolon, or tab.',
            )}
          />
        )}
        {model === 'empirical' && (
          <Field
            name="leadDemand"
            label={t(
              'Tedarik süresi talep gözlemleri (adet/çevrim)',
              'Lead-time demand observations (units/cycle)',
            )}
            multiline
            hint={t(
              'En az iki tamamlanmış ikmal çevriminin toplam talebini satır sonu, noktalı virgül veya sekmeyle ayırın.',
              'Enter total demand from at least two completed replenishment cycles, separated by a newline, semicolon, or tab.',
            )}
          />
        )}
      </ModuleForm>
      <Method>
        <p>
          {t(
            'Sabit süre: SS = zₚ · s_d · √L. Beklenen talep = μ_d · L. s_d dönemsel talebin örneklem sapmasıdır.',
            'Fixed lead time: SS = zₚ · s_d · √L. Expected demand = μ_d · L. Here s_d is the sample deviation of periodic demand.',
          )}
        </p>
        <p>
          {t(
            'Değişken süre: SS = zₚ · √(μ_L · s_d² + μ_d² · s_L²). Beklenen talep = μ_d · μ_L. Dönemsel talep bağımsız ve özdeş dağılımlıdır. Tedarik süresi talepten bağımsızdır. Normal yaklaşım, tedarik süresi talebi yaklaşık normalse uygundur.',
            'Variable lead time: SS = zₚ · √(μ_L · s_d² + μ_d² · s_L²). Expected demand = μ_d · μ_L. Periodic demand is independent and identically distributed. Lead time is independent of demand. Use the normal approximation when lead-time demand is approximately normal.',
          )}
        </p>
        <p>
          {t(
            'Ampirik: Qₚ, sıralı çevrim taleplerinde ⌈pn⌉. gözlemdir. SS = max(0, Qₚ − gözlenen ortalama). Temsil edici bağımsız çevrimlere ihtiyaç vardır.',
            'Empirical: Qₚ is the ⌈pn⌉th sorted observation. SS = max(0, Qₚ − the observed mean). Use representative independent cycles.',
          )}
        </p>
        <p>
          {t(
            'Servis seviyesi çevrim olasılığıdır. Simülasyondaki adet bazında karşılama oranından farklı bir ölçüdür. Hesaplanan tamponun gerçekleşen servis seviyesini kontrol edin.',
            'The service level measures probability per cycle. The simulation fill rate measures fulfillment per unit. Verify the actual service level achieved with the calculated buffer.',
          )}
        </p>
      </Method>
    </>
  );
}
