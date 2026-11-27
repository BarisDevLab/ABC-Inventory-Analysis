import { useLocale } from '../../ui/locale';
import { fieldNumber, fieldText, readProductDemand } from '../shared/inputs';
import { ClassChart, Field, Method, ModuleForm, ResultsTable } from '../shared/ui';
import { calculateFsn } from './calculate';

export function FsnPanel() {
  const { t, percent } = useLocale();
  return (
    <>
      <h2>{t('FSN analizi', 'FSN analysis')}</h2>
      <p>
        {t(
          'Ürünleri düzenli, seyrek veya hiç çıkış yapmadıkları gözlem dönemlerine göre sınıflandırın.',
          'Classify items by how often stock moves out during the observation periods.',
        )}
      </p>
      <ModuleForm
        compute={(form) =>
          calculateFsn(
            readProductDemand(
              fieldText(form, 'movement'),
              t('Dönemsel stok çıkışlarını', 'Periodic stock issues'),
            ),
            fieldNumber(form, 'threshold', t('Hızlı hareket eşiği', 'Fast-moving threshold')) / 100,
          )
        }
        renderResult={(rows) => (
          <>
            <ClassChart
              title={t('Hareket sınıfına göre ürün sayısı', 'Product count by movement class')}
              groups={['F', 'S', 'N']}
              rows={rows}
            />
            <ResultsTable
              caption={t('Ürün bazında stok çıkış sıklığı', 'Stock issue frequency by product')}
              columns={[
                t('Ürün', 'Product'),
                t('Toplam dönem', 'Total periods'),
                t('Çıkış olan dönem', 'Periods with issues'),
                t('Hareket sıklığı', 'Movement frequency'),
                t('Sınıf', 'Class'),
              ]}
              rows={rows.map((row) => [
                row.product,
                row.periods,
                row.activePeriods,
                percent(row.rate * 100),
                row.group,
              ])}
            />
          </>
        )}
      >
        <Field
          name="movement"
          label={t(
            'Ürün ve dönemsel stok çıkışı (adet)',
            'Product and periodic stock issues (units)',
          )}
          multiline
          hint={t(
            'Başlıksız her satıra ürün adı ve eşit uzunluktaki dönemlerin brüt çıkış miktarlarını yazın. Sütunları noktalı virgül veya sekmeyle ayırın. Çıkış olmayan döneme 0 yazın.',
            'Enter one product name and gross issue quantity per equal period on each row, with no header. Separate columns with a semicolon or tab. Use 0 for a period without issues.',
          )}
        />
        <Field
          name="threshold"
          label={t('Hızlı hareket eşiği (%)', 'Fast-moving threshold (%)')}
          hint={t(
            '%0’dan büyük ve en fazla %100. Yüzde için 75 biçimini kullanın.',
            'Enter a percentage above 0 and at most 100, for example 75.',
          )}
        />
      </ModuleForm>
      <Method>
        <p>
          {t(
            'Hareket sıklığı = pozitif çıkış olan dönem sayısı / toplam dönem sayısı. Çıkış yoksa N (hareketsiz), sıklık eşikte veya üstündeyse F (hızlı), diğer pozitif sıklıklarda S (yavaş).',
            'Movement frequency is the share of periods with positive issues. Zero issues gives N (non-moving). The threshold or above gives F (fast-moving). Other positive frequencies give S (slow-moving).',
          )}
        </p>
        <p>
          {t(
            'Bu yöntem hareketin sıklığını ölçer. Çıkış hacmini ve stok devir hızını ayrıca değerlendirin. Stoksuz kalınan veya ürünün henüz satışta olmadığı dönemler sınıfı etkileyebilir. N için gözlem aralığını ve kritiklik kaydını inceleyin.',
            'The model measures frequency. Evaluate issue volumes and stock turnover separately. Stockouts and periods before launch may affect the class. Review the observation window and criticality record for N products.',
          )}
        </p>
      </Method>
    </>
  );
}
