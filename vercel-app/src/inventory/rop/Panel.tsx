import { fieldNumber } from '../shared/inputs';
import {
  BarChart,
  Field,
  Method,
  Metrics,
  ModuleForm,
  formatInventoryNumber as n,
} from '../shared/ui';
import { calculateRop } from './calculate';

export function RopPanel() {
  return (
    <>
      <h2>Yeniden sipariş noktası (ROP)</h2>
      <p>Tedarik süresi talebi ve emniyet stokundan bir sipariş eşiği hesaplayın.</p>
      <ModuleForm
        compute={(form) => {
          const safetyStock = fieldNumber(form, 'safety', 'Emniyet stoku');
          return {
            ...calculateRop({
              demandPerPeriod: fieldNumber(form, 'demand', 'Dönem başına ortalama talep'),
              leadTimePeriods: fieldNumber(form, 'lead', 'Tedarik süresi'),
              safetyStock,
            }),
            safetyStock,
          };
        }}
        renderResult={(result) => (
          <>
            <Metrics
              values={[
                ['Beklenen tedarik süresi talebi', `${n(result.expectedDemand)} adet`],
                ['Yeniden sipariş noktası', `${n(result.reorderPoint)} adet`],
                ['Yukarı yuvarlanmış eşik', `${n(result.wholeUnitReorderPoint)} adet`],
              ]}
            />
            <BarChart
              title="Sipariş eşiğinin bileşenleri (adet)"
              values={[
                ['Beklenen talep', result.expectedDemand],
                ['Emniyet stoku', result.safetyStock],
              ]}
            />
          </>
        )}
      >
        <Field name="demand" label="Ortalama talep d (adet/dönem)" />
        <Field
          name="lead"
          label="Ortalama veya sabit tedarik süresi L (dönem)"
          hint="Talep ve tedarik süresi için aynı zaman birimini kullanın."
        />
        <Field
          name="safety"
          label="Emniyet stoku SS (adet)"
          hint="Tampon kullanmayan bir politikayı değerlendirmek için 0 girin."
        />
      </ModuleForm>
      <Method>
        <p>
          Beklenen tedarik süresi talebi = d × L. ROP = d × L + SS. Kesikli adetlerle planlamada
          eşik yukarı yuvarlanabilir.
        </p>
        <p>
          Sürekli gözden geçirmede stok pozisyonu (eldeki stok + açık siparişler − karşılanmayı
          bekleyen talep) eşik seviyesine indiğinde sipariş değerlendirilir. Talep hızı sabit kabul
          edilir. Belirsizlik için seçtiğiniz tamponu ayrıca girin.
        </p>
      </Method>
    </>
  );
}
