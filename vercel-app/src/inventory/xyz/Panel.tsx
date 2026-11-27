import { useLocale } from '../../ui/locale';
import { fieldNumber, fieldText, readProductDemand } from '../shared/inputs';
import { BarChart, Field, Method, ModuleForm, ResultsTable } from '../shared/ui';
import { calculateXyz } from './calculate';
import type { XyzRow } from './calculate';

export function XyzPanel({
  onResult,
  withSku = false,
}: {
  onResult?: (result: XyzRow[] | null) => void;
  withSku?: boolean;
}) {
  const { t, detail: n } = useLocale();
  return (
    <>
      <h2>{t('XYZ analizi', 'XYZ analysis')}</h2>
      <p>
        {t(
          'Eşit uzunluktaki dönemlerde ürün talebinin ne kadar değiştiğini ölçün.',
          'Measure demand variability across equal-length periods.',
        )}
      </p>
      <ModuleForm
        compute={(form) =>
          calculateXyz(
            readProductDemand(
              fieldText(form, 'demand'),
              t('Dönemsel talep verilerini', 'Periodic demand data'),
            ),
            {
              maxX: fieldNumber(form, 'maxX', t('X üst sınırı', 'X upper limit')),
              maxY: fieldNumber(form, 'maxY', t('Y üst sınırı', 'Y upper limit')),
            },
            withSku,
          )
        }
        onResult={onResult}
        renderResult={(rows) => (
          <>
            <BarChart
              title={t('XYZ sınıflarına göre ürün sayısı', 'Product count by XYZ class')}
              values={[
                ['X', rows.filter((row) => row.group === 'X').length],
                ['Y', rows.filter((row) => row.group === 'Y').length],
                ['Z', rows.filter((row) => row.group === 'Z').length],
                [t('Talep yok', 'No demand'), rows.filter((row) => row.group === null).length],
              ]}
              format={String}
            />
            <ResultsTable
              caption={t('Ürün bazında talep değişkenliği', 'Demand variability by product')}
              columns={[
                t('Ürün', 'Product'),
                t('Ortalama (adet/dönem)', 'Mean (units/period)'),
                t('Örneklem s (adet/dönem)', 'Sample s (units/period)'),
                'CV (oran)',
                t('Sınıf', 'Class'),
              ]}
              rows={rows.map((row) => [
                row.product,
                n(row.mean),
                n(row.deviation),
                row.cv === null ? t('Tanımsız', 'Undefined') : n(row.cv),
                row.group ?? t('Talep yok', 'No demand'),
              ])}
            />
          </>
        )}
      >
        <Field
          name="demand"
          label={
            withSku
              ? t('Ürün kodu ve dönemsel talep (adet)', 'SKU and periodic demand (units)')
              : t('Ürün ve dönemsel talep (adet)', 'Product and periodic demand (units)')
          }
          multiline
          hint={t(
            'Başlıksız her satıra ürün adı (ABC dosyasında kod varsa ürün kodu) ve kronolojik talep değerlerini yazın. Sütunları noktalı virgül veya sekmeyle ayırın. En az iki eşit dönem kullanın. Talep olmayan döneme 0 yazın.',
            'On each row enter the product name (or SKU if the ABC file includes codes) and demand values in chronological order. Use a semicolon or tab between columns. Include at least two equal periods and enter 0 for periods without demand.',
          )}
        />
        <Field name="maxX" label={t('X üst sınırı (CV oranı)', 'X upper limit (CV ratio)')} />
        <Field name="maxY" label={t('Y üst sınırı (CV oranı)', 'Y upper limit (CV ratio)')} />
      </ModuleForm>
      <Method>
        <p>
          {t(
            'Ortalama μ = Σxᵢ/n, örneklem sapması s = √[Σ(xᵢ − μ)²/(n − 1)], değişim katsayısı CV = s/μ. CV birimsiz orandır. Örneğin %20 için 0,20 yazın.',
            'Mean μ = Σxᵢ/n, sample deviation s = √[Σ(xᵢ − μ)²/(n − 1)], and coefficient of variation CV = s/μ. CV is unitless. Enter 0.20 for 20%.',
          )}
        </p>
        <p>
          {t(
            'CV ≤ X sınırı ise X, X sınırı < CV ≤ Y sınırı ise Y, diğer pozitif ortalamalarda Z. Tüm dönemler sıfırsa CV tanımsızdır. Eksik gözlemleri tamamlayın ve dönemlerin karşılaştırılabilir olduğundan emin olun.',
            'X applies when CV ≤ X limit, Y when X limit < CV ≤ Y limit, and Z above Y. With zero demand in every period, CV is undefined. Fill missing observations and ensure the periods are comparable.',
          )}
        </p>
      </Method>
    </>
  );
}
