import { fieldNumber, fieldText, readProductDemand } from '../shared/inputs';
import {
  BarChart,
  Field,
  Method,
  ModuleForm,
  ResultsTable,
  formatInventoryNumber as n,
} from '../shared/ui';
import { calculateXyz } from './calculate';
import type { XyzRow } from './calculate';

export function XyzPanel({ onResult }: { onResult?: (result: XyzRow[] | null) => void }) {
  return (
    <>
      <h2>XYZ analizi</h2>
      <p>Eşit uzunluktaki dönemlerde ürün talebinin ne kadar değiştiğini ölçün.</p>
      <ModuleForm
        compute={(form) =>
          calculateXyz(readProductDemand(fieldText(form, 'demand'), 'Dönemsel talep verilerini'), {
            maxX: fieldNumber(form, 'maxX', 'X üst sınırı'),
            maxY: fieldNumber(form, 'maxY', 'Y üst sınırı'),
          })
        }
        onResult={onResult}
        renderResult={(rows) => (
          <>
            <BarChart
              title="XYZ sınıflarına göre ürün sayısı"
              values={[
                ['X', rows.filter((row) => row.group === 'X').length],
                ['Y', rows.filter((row) => row.group === 'Y').length],
                ['Z', rows.filter((row) => row.group === 'Z').length],
                ['Talep yok', rows.filter((row) => row.group === null).length],
              ]}
              format={String}
            />
            <ResultsTable
              caption="Ürün bazında talep değişkenliği"
              columns={[
                'Ürün',
                'Ortalama (adet/dönem)',
                'Örneklem s (adet/dönem)',
                'CV (oran)',
                'Sınıf',
              ]}
              rows={rows.map((row) => [
                row.product,
                n(row.mean),
                n(row.deviation),
                row.cv === null ? 'Tanımsız' : n(row.cv),
                row.group ?? 'Talep yok',
              ])}
            />
          </>
        )}
      >
        <Field
          name="demand"
          label="Ürün ve dönemsel talep (adet)"
          multiline
          hint="Başlıksız her satıra ürün adı ve kronolojik talep değerlerini yazın. Sütunları noktalı virgül veya sekmeyle ayırın. En az iki eşit dönem kullanın. Talep olmayan döneme 0 yazın."
        />
        <Field name="maxX" label="X üst sınırı (CV oranı)" />
        <Field name="maxY" label="Y üst sınırı (CV oranı)" />
      </ModuleForm>
      <Method>
        <p>
          Ortalama μ = Σxᵢ/n, örneklem sapması s = √[Σ(xᵢ − μ)²/(n − 1)], değişim katsayısı CV =
          s/μ. CV birimsiz orandır. Örneğin %20 için 0,20 yazın.
        </p>
        <p>
          CV ≤ X sınırı ise X, X sınırı &lt; CV ≤ Y sınırı ise Y, diğer pozitif ortalamalarda Z. Tüm
          dönemler sıfırsa CV tanımsızdır. Eksik gözlemleri tamamlayın ve dönemlerin
          karşılaştırılabilir olduğundan emin olun.
        </p>
      </Method>
    </>
  );
}
