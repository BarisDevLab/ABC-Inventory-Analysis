import { fieldText, readRows } from '../shared/inputs';
import { ClassChart, Field, Method, ModuleForm, ResultsTable } from '../shared/ui';
import { calculateVed } from './calculate';
import type { Impact } from './calculate';

const labels: Record<Impact, string> = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };
const groupLabels = { V: 'V · Hayati', E: 'E · Gerekli', D: 'D · İsteğe bağlı' } as const;

function readImpact(raw: string, line: number): Impact {
  const value = raw.toLocaleLowerCase('tr-TR');
  if (value === 'yüksek') return 'high';
  if (value === 'orta') return 'medium';
  if (value === 'düşük') return 'low';
  throw new Error(`${line}. satırda her etki düzeyi yüksek, orta veya düşük olmalıdır.`);
}

export function VedPanel() {
  return (
    <>
      <h2>VED analizi</h2>
      <p>
        Stoksuzluğun operasyon ve güvenlik açısından yaratacağı sonuçlara göre kritiklik sınıfını
        belirleyin.
      </p>
      <ModuleForm
        compute={(form) =>
          calculateVed(
            readRows(fieldText(form, 'items'), 'Kritiklik kayıtlarını').map(({ columns, line }) => {
              if (columns.length !== 4)
                throw new Error(
                  `${line}. satırda ürün, operasyon etkisi, güvenlik etkisi ve gerekçe olmalıdır.`,
                );
              return {
                product: columns[0],
                operations: readImpact(columns[1], line),
                safety: readImpact(columns[2], line),
                rationale: columns[3],
              };
            }),
          )
        }
        renderResult={(rows) => (
          <>
            <ClassChart
              title="Kritiklik sınıfına göre ürün sayısı"
              groups={['V', 'E', 'D']}
              rows={rows}
            />
            <ResultsTable
              caption="Ürün bazında kritiklik değerlendirmesi"
              columns={['Ürün', 'Operasyon etkisi', 'Güvenlik etkisi', 'Sınıf', 'Gerekçe']}
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
          label="Ürün, operasyon etkisi, güvenlik etkisi ve gerekçe"
          multiline
          hint="Başlıksız her satıra bu dört alanı sırayla yazın. Sütunları sekme veya noktalı virgülle ayırın. Etkiler için yüksek, orta veya düşük yazın. Gerekçede ikame olanağını ve stoksuzluğun sonucunu belirtin."
        />
      </ModuleForm>
      <Method>
        <p>
          Etki düzeyleri düşük = 0, orta = 1, yüksek = 2 olarak kodlanır. Sınıfı, iki boyuttaki en
          yüksek etki belirler. 2 → V (hayati), 1 → E (gerekli), 0 → D (isteğe bağlı). Puanlar
          sıralı ve birimsizdir.
        </p>
        <p>
          Yüksek etki; ciddi güvenlik sonucu veya temel faaliyetin durması. Orta etki; güvenli
          biçimde yönetilebilir aksama veya gecikme. Düşük etki; kolay ikame veya sınırlı sonuç. V
          ürünlerde tedarik sürekliliğini, E ürünlerde tampon seçeneklerini, D ürünlerde daha düşük
          stokla çalışma olanağını değerlendirin.
        </p>
      </Method>
    </>
  );
}
