import { fieldNumber, fieldText, inputNumber, readRows, readSeries } from '../shared/inputs';
import {
  BarChart,
  Field,
  Method,
  ModuleForm,
  ResultsTable,
  formatInventoryNumber as n,
  formatInventoryPercent,
} from '../shared/ui';
import { compareStockPolicies } from './calculate';
import type { StockPolicy } from './calculate';

function readPolicies(raw: string): StockPolicy[] {
  const rows = readRows(raw, 'Stok politikalarını');
  if (rows.length < 2) throw new Error('Karşılaştırma için en az iki stok politikası girin.');
  return rows.map(({ columns, line }) => {
    if (columns.length !== 4) throw new Error(`${line}. politika satırında dört sütun olmalıdır.`);
    const [name, code, first, second] = columns;
    const position = `${line}. politika satırı`;
    if (code.toUpperCase() === 'Q') {
      return {
        name,
        kind: 'fixed-lot',
        reorderPoint: inputNumber(first, `${position}, yeniden sipariş noktası`),
        orderQuantity: inputNumber(second, `${position}, parti miktarı`),
      };
    }
    if (code.toUpperCase() === 'R') {
      return {
        name,
        kind: 'order-up-to',
        reviewInterval: inputNumber(first, `${position}, gözden geçirme aralığı`),
        targetStock: inputNumber(second, `${position}, hedef stok`),
      };
    }
    throw new Error(`${line}. politika satırında yöntem kodu Q veya R olmalıdır.`);
  });
}

function optionalFactors(form: FormData, name: string, label: string) {
  const text = fieldText(form, name);
  return text.trim() ? readSeries(text, label) : [];
}

function fill(rate: number | null) {
  return rate === null ? 'Talep yok' : formatInventoryPercent(rate);
}

export function SimulationPanel() {
  return (
    <>
      <h2>Stok maliyeti simülasyonu</h2>
      <p>Tek bir ürün için aynı talep geçmişiyle en az iki sipariş politikasını karşılaştırın.</p>
      <ModuleForm
        compute={(form) =>
          compareStockPolicies(
            {
              demand: readSeries(fieldText(form, 'demand'), 'Dönemsel talep değerlerini'),
              initialStock: fieldNumber(form, 'initial', 'Başlangıç stoku'),
              leadTime: fieldNumber(form, 'lead', 'Tedarik süresi'),
              orderingCost: fieldNumber(form, 'order', 'Sipariş maliyeti'),
              holdingCost: fieldNumber(form, 'holding', 'Elde bulundurma maliyeti'),
              shortageCost: fieldNumber(form, 'shortage', 'Karşılanamayan talep maliyeti'),
            },
            readPolicies(fieldText(form, 'policies')),
            {
              demandFactors: optionalFactors(form, 'demandFactors', 'Talep çarpanlarını'),
              holdingCostFactors: optionalFactors(
                form,
                'holdingFactors',
                'Elde bulundurma maliyeti çarpanlarını',
              ),
            },
          )
        }
        renderResult={({ baseline, changes }) => (
          <>
            <BarChart
              title="Politika bazında toplam dönem maliyeti (TL)"
              values={baseline.map((row) => [row.name, row.total])}
            />
            <ResultsTable
              caption="Politika karşılaştırması"
              columns={[
                'Politika',
                'Sipariş sayısı',
                'Sipariş (TL)',
                'Elde bulundurma (TL)',
                'Eksik karşılama (TL)',
                'Toplam (TL)',
                'Karşılanamayan (adet)',
                'Karşılama oranı',
                'Ort. dönem sonu stok (adet)',
                'Son stok (adet)',
                'Açık sipariş (adet)',
              ]}
              rows={baseline.map((row) => [
                row.name,
                row.orders,
                n(row.ordering),
                n(row.holding),
                n(row.shortage),
                n(row.total),
                n(row.unfilled),
                fill(row.fillRate),
                n(row.averageEndingStock),
                n(row.endingStock),
                n(row.endingOnOrder),
              ])}
            />
            {changes.length > 0 ? (
              <ResultsTable
                caption="Duyarlılık · Her seferinde tek girdi değişir"
                columns={[
                  'Değişen girdi',
                  'Çarpan',
                  'Politika',
                  'Baz maliyet (TL)',
                  'Senaryo maliyeti (TL)',
                  'Baz maliyete fark (TL)',
                  'Karşılama oranı',
                ]}
                rows={changes.flatMap(({ driver, factor, results }) =>
                  results.map((row, index) => [
                    driver === 'demand' ? 'Talep' : 'Elde bulundurma maliyeti',
                    n(factor),
                    row.name,
                    n(baseline[index].total),
                    n(row.total),
                    n(row.total - baseline[index].total),
                    fill(row.fillRate),
                  ]),
                )}
              />
            ) : (
              <p>
                Duyarlılık tablosu için en az bir talep veya elde bulundurma maliyeti çarpanı girin.
                1, baz senaryodur.
              </p>
            )}
            <p>
              Politika seçeneklerini maliyet, karşılanan talep ve dönem sonunda kalan stok ve açık
              siparişlerle birlikte değerlendirin.
            </p>
          </>
        )}
      >
        <Field
          name="demand"
          label="Dönemsel talep (adet/dönem)"
          multiline
          hint="Kronolojik eşit dönemleri satır sonu, noktalı virgül veya sekmeyle ayırın. Talebi olmayan döneme 0 yazın."
        />
        <Field name="initial" label="Başlangıç stoku (adet)" />
        <Field name="lead" label="Sabit tedarik süresi (tam dönem)" />
        <Field name="order" label="Sipariş maliyeti (TL/sipariş)" />
        <Field name="holding" label="Elde bulundurma maliyeti (TL/adet/dönem)" />
        <Field name="shortage" label="Karşılanamayan talep maliyeti (TL/adet)" />
        <Field
          name="policies"
          label="Karşılaştırılacak stok politikaları"
          multiline
          hint="Başlıksız her satırda dört sütun kullanın. Q için ad; Q; yeniden sipariş noktası (adet); parti miktarı (adet). R için ad; R; gözden geçirme aralığı (tam dönem); hedef stok (adet). Sütunları noktalı virgül veya sekmeyle ayırın."
        />
        <Field
          name="demandFactors"
          label="Talep çarpanları"
          optional
          hint="Çarpanları noktalı virgülle ayırın. %10 artış için 1,10 girin."
        />
        <Field
          name="holdingFactors"
          label="Elde bulundurma maliyeti çarpanları"
          optional
          hint="Çarpanları noktalı virgülle ayırın. %10 azalış için 0,90 girin."
        />
      </ModuleForm>
      <Method>
        <p>
          Her dönemin başında teslimatlar alınır ve stok pozisyonu hesaplanır: eldeki stok + açık
          sipariş. Q politikası pozisyon eşiğe eşit veya altındaysa bir sabit parti verir. R
          politikası ilk dönemden başlayarak her R dönemde pozisyonu hedefe tamamlar. Sıfır tedarik
          süresinde sipariş talep gerçekleşmeden gelir.
        </p>
        <p>
          Talep dönem içinde karşılanır. Eksik talep kayıp satış sayılır. Başlangıçta açık sipariş
          yoktur. Toplam maliyet = sipariş sayısı × sipariş maliyeti + dönem sonu stoklarının
          toplamı × dönemsel birim elde bulundurma maliyeti + karşılanamayan adet × eksik karşılama
          maliyeti. Satın alma ve dönem sonu değerleri hesaba katılmaz. Karşılama oranı = karşılanan
          adet / talep adedi.
        </p>
        <p>
          Duyarlılık, tüm talep dönemlerini veya elde bulundurma maliyetini seçtiğiniz çarpanla ayrı
          ayrı değiştirir. Diğer girdiler sabit kalır. Tarihsel seri ve sabit teslim süresi
          gelecekteki koşulları kapsamayabilir.
        </p>
      </Method>
    </>
  );
}
