import type { Translate } from '../../ui/locale';
import { useLocale } from '../../ui/locale';
import { fieldText, readRows } from '../shared/inputs';
import { ClassChart, Field, Method, ModuleForm, ResultsTable } from '../shared/ui';
import { calculateVed } from './calculate';
import type { Impact } from './calculate';

function readImpact(raw: string, line: number, t: Translate): Impact {
  const value = raw.toLocaleLowerCase('tr-TR');
  const english = raw.toLowerCase();
  if (value === 'yüksek' || english === 'high') return 'high';
  if (value === 'orta' || english === 'medium') return 'medium';
  if (value === 'düşük' || english === 'low') return 'low';
  throw new Error(
    t(
      `${line}. satırda her etki düzeyi yüksek, orta veya düşük olmalıdır.`,
      `Each impact in row ${line} must be high, medium, or low.`,
    ),
  );
}

export function VedPanel() {
  const { t } = useLocale();
  const labels: Record<Impact, string> = {
    high: t('Yüksek', 'High'),
    medium: t('Orta', 'Medium'),
    low: t('Düşük', 'Low'),
  };
  const groupLabels = {
    V: t('V · Hayati', 'V · Vital'),
    E: t('E · Gerekli', 'E · Essential'),
    D: t('D · İsteğe bağlı', 'D · Desirable'),
  } as const;

  return (
    <>
      <h2>{t('VED analizi', 'VED analysis')}</h2>
      <p>
        {t(
          'Stoksuzluğun operasyon ve güvenlik açısından yaratacağı sonuçlara göre kritiklik sınıfını belirleyin.',
          'Classify products by the operational and safety effects of a stockout.',
        )}
      </p>
      <ModuleForm
        compute={(form) =>
          calculateVed(
            readRows(
              fieldText(form, 'items'),
              t('Kritiklik kayıtlarını', 'Criticality records'),
            ).map(({ columns, line }) => {
              if (columns.length !== 4)
                throw new Error(
                  t(
                    `${line}. satırda ürün, operasyon etkisi, güvenlik etkisi ve gerekçe olmalıdır.`,
                    `Row ${line} must include the product, operations impact, safety impact, and rationale.`,
                  ),
                );
              return {
                product: columns[0],
                operations: readImpact(columns[1], line, t),
                safety: readImpact(columns[2], line, t),
                rationale: columns[3],
              };
            }),
          )
        }
        renderResult={(rows) => (
          <>
            <ClassChart
              title={t('Kritiklik sınıfına göre ürün sayısı', 'Product count by criticality class')}
              groups={['V', 'E', 'D']}
              rows={rows}
            />
            <ResultsTable
              caption={t(
                'Ürün bazında kritiklik değerlendirmesi',
                'Criticality assessment by product',
              )}
              columns={[
                t('Ürün', 'Product'),
                t('Operasyon etkisi', 'Operations impact'),
                t('Güvenlik etkisi', 'Safety impact'),
                t('Sınıf', 'Class'),
                t('Gerekçe', 'Rationale'),
              ]}
              rows={rows.map((row) => [
                row.product,
                labels[row.operations],
                labels[row.safety],
                groupLabels[row.group],
                row.rationale,
              ])}
            />
          </>
        )}
      >
        <Field
          name="items"
          label={t(
            'Ürün, operasyon etkisi, güvenlik etkisi ve gerekçe',
            'Product, operations impact, safety impact, and rationale',
          )}
          multiline
          hint={t(
            'Başlıksız her satıra bu dört alanı sırayla yazın. Sütunları sekme veya noktalı virgülle ayırın. Etkiler için yüksek, orta veya düşük yazın. Gerekçede ikame olanağını ve stoksuzluğun sonucunu belirtin.',
            'Enter those four fields per row in order, without a header. Separate columns with a tab or semicolon. Enter high, medium, or low for impacts. Explain substitutes and stockout consequences in the rationale.',
          )}
        />
      </ModuleForm>
      <Method>
        <p>
          {t(
            'Etki düzeyleri düşük = 0, orta = 1, yüksek = 2 olarak kodlanır. Sınıfı, iki boyuttaki en yüksek etki belirler. 2 → V (hayati), 1 → E (gerekli), 0 → D (isteğe bağlı). Puanlar sıralı ve birimsizdir.',
            'Impact scores are low = 0, medium = 1, high = 2. The highest of the two determines the class. 2 → V (vital), 1 → E (essential), 0 → D (desirable). Scores are ordinal and unitless.',
          )}
        </p>
        <p>
          {t(
            'Yüksek etki; ciddi güvenlik sonucu veya temel faaliyetin durması. Orta etki; güvenli biçimde yönetilebilir aksama veya gecikme. Düşük etki; kolay ikame veya sınırlı sonuç. V ürünlerde tedarik sürekliliğini, E ürünlerde tampon seçeneklerini, D ürünlerde daha düşük stokla çalışma olanağını değerlendirin.',
            'High impact means serious safety consequences or disruption of a core operation. Medium means a safely manageable interruption or delay. Low means easy substitution or limited consequences. Review supply continuity for V, buffers for E, and lower-stock options for D.',
          )}
        </p>
      </Method>
    </>
  );
}
