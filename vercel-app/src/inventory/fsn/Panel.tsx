import { fieldNumber, fieldText, readProductDemand } from '../shared/inputs';
import {
  ClassChart,
  Field,
  Method,
  ModuleForm,
  ResultsTable,
  formatInventoryPercent,
} from '../shared/ui';
import { calculateFsn } from './calculate';

export function FsnPanel() {
  return (
    <>
      <h2>FSN analizi</h2>
      <p>
        Ürünleri düzenli, seyrek veya hiç çıkış yapmadıkları gözlem dönemlerine göre sınıflandırın.
      </p>
      <ModuleForm
        compute={(form) =>
          calculateFsn(
            readProductDemand(fieldText(form, 'movement'), 'Dönemsel stok çıkışlarını'),
            fieldNumber(form, 'threshold', 'Hızlı hareket eşiği') / 100,
          )
        }
        renderResult={(rows) => (
          <>
            <ClassChart
              title="Hareket sınıfına göre ürün sayısı"
              groups={['F', 'S', 'N']}
              rows={rows}
            />
            <ResultsTable
              caption="Ürün bazında stok çıkış sıklığı"
              columns={['Ürün', 'Toplam dönem', 'Çıkış olan dönem', 'Hareket sıklığı', 'Sınıf']}
              rows={rows.map((row) => [
                row.product,
                row.periods,
                row.activePeriods,
                formatInventoryPercent(row.rate),
                row.group,
              ])}
            />
          </>
        )}
      >
        <Field
          name="movement"
          label="Ürün ve dönemsel stok çıkışı (adet)"
          multiline
          hint="Başlıksız her satıra ürün adı ve eşit uzunluktaki dönemlerin brüt çıkış miktarlarını yazın. Sütunları noktalı virgül veya sekmeyle ayırın. Çıkış olmayan döneme 0 yazın."
        />
        <Field
          name="threshold"
          label="Hızlı hareket eşiği (%)"
          hint="%0’dan büyük ve en fazla %100. Yüzde için 75 biçimini kullanın."
        />
      </ModuleForm>
      <Method>
        <p>
          Hareket sıklığı = pozitif çıkış olan dönem sayısı / toplam dönem sayısı. Çıkış yoksa N
          (hareketsiz), sıklık eşikte veya üstündeyse F (hızlı), diğer pozitif sıklıklarda S
          (yavaş).
        </p>
        <p>
          Bu yöntem hareketin sıklığını ölçer. Çıkış hacmini ve stok devir hızını ayrıca
          değerlendirin. Stoksuz kalınan veya ürünün henüz satışta olmadığı dönemler sınıfı
          etkileyebilir. N için gözlem aralığını ve kritiklik kaydını inceleyin.
        </p>
      </Method>
    </>
  );
}
