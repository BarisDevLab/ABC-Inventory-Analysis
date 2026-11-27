import { useLocale } from '../../ui/locale';
import { fieldNumber } from '../shared/inputs';
import { BarChart, Field, Method, Metrics, ModuleForm } from '../shared/ui';
import { calculateRop } from './calculate';

export function RopPanel() {
  const { t, detail: n } = useLocale();
  return (
    <>
      <h2>{t('Yeniden sipariş noktası (ROP)', 'Reorder point (ROP)')}</h2>
      <p>
        {t(
          'Tedarik süresi talebi ve emniyet stokundan bir sipariş eşiği hesaplayın.',
          'Calculate an order trigger from lead-time demand and safety stock.',
        )}
      </p>
      <ModuleForm
        compute={(form) => {
          const safetyStock = fieldNumber(form, 'safety', 'Emniyet stoku');
          return {
            ...calculateRop({
              demandPerPeriod: fieldNumber(
                form,
                'demand',
                t('Dönem başına ortalama talep', 'Mean demand per period'),
              ),
              leadTimePeriods: fieldNumber(form, 'lead', t('Tedarik süresi', 'Lead time')),
              safetyStock,
            }),
            safetyStock,
          };
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
                  t('Yeniden sipariş noktası', 'Reorder point'),
                  t(`${n(result.reorderPoint)} adet`, `${n(result.reorderPoint)} units`),
                ],
                [
                  t('Yukarı yuvarlanmış eşik', 'Threshold rounded up'),
                  t(
                    `${n(result.wholeUnitReorderPoint)} adet`,
                    `${n(result.wholeUnitReorderPoint)} units`,
                  ),
                ],
              ]}
            />
            <BarChart
              title={t(
                'Sipariş eşiğinin bileşenleri (adet)',
                'Components of the reorder point (units)',
              )}
              values={[
                ['Beklenen talep', result.expectedDemand],
                ['Emniyet stoku', result.safetyStock],
              ]}
            />
          </>
        )}
      >
        <Field
          name="demand"
          label={t('Ortalama talep d (adet/dönem)', 'Mean demand d (units/period)')}
        />
        <Field
          name="lead"
          label={t(
            'Ortalama veya sabit tedarik süresi L (dönem)',
            'Mean or fixed lead time L (periods)',
          )}
          hint={t(
            'Talep ve tedarik süresi için aynı zaman birimini kullanın.',
            'Use the same time unit for demand and lead time.',
          )}
        />
        <Field
          name="safety"
          label="Emniyet stoku SS (adet)"
          hint={t(
            'Tampon kullanmayan bir politikayı değerlendirmek için 0 girin.',
            'Enter 0 to evaluate a policy without a buffer.',
          )}
        />
      </ModuleForm>
      <Method>
        <p>
          {t(
            'Beklenen tedarik süresi talebi = d × L. ROP = d × L + SS. Kesikli adetlerle planlamada eşik yukarı yuvarlanabilir.',
            'Expected lead-time demand = d × L. ROP = d × L + SS. Round the result up when planning in whole units.',
          )}
        </p>
        <p>
          {t(
            'Sürekli gözden geçirmede stok pozisyonu (eldeki stok + açık siparişler − karşılanmayı bekleyen talep) eşik seviyesine indiğinde sipariş değerlendirilir. Talep hızı sabit kabul edilir. Belirsizlik için seçtiğiniz tamponu ayrıca girin.',
            'Under continuous review, consider reordering when inventory position (on-hand stock + open orders − backorders) reaches the threshold. Demand is assumed constant. Enter a separate safety buffer for uncertainty.',
          )}
        </p>
      </Method>
    </>
  );
}
