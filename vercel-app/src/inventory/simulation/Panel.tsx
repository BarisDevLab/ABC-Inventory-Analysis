import type { Translate } from '../../ui/locale';
import { useLocale } from '../../ui/locale';
import { fieldNumber, fieldText, inputNumber, readRows, readSeries } from '../shared/inputs';
import { BarChart, Field, Method, ModuleForm, ResultsTable } from '../shared/ui';
import { compareStockPolicies } from './calculate';
import type { StockPolicy } from './calculate';

function readPolicies(raw: string, t: Translate): StockPolicy[] {
  const rows = readRows(raw, t('Stok politikalarını', 'Stock policies'));
  if (rows.length < 2)
    throw new Error(
      t(
        'Karşılaştırma için en az iki stok politikası girin.',
        'Enter at least two inventory policies to compare.',
      ),
    );
  return rows.map(({ columns, line }) => {
    if (columns.length !== 4)
      throw new Error(
        t(
          `${line}. politika satırında dört sütun olmalıdır.`,
          `Policy row ${line} must contain four columns.`,
        ),
      );
    const [name, code, first, second] = columns;
    const position = t(`${line}. politika satırı`, `Policy row ${line}`);
    if (code.toUpperCase() === 'Q') {
      return {
        name,
        kind: 'fixed-lot',
        reorderPoint: inputNumber(
          first,
          t(`${position}, yeniden sipariş noktası`, `${position}, reorder point`),
        ),
        orderQuantity: inputNumber(
          second,
          t(`${position}, parti miktarı`, `${position}, batch size`),
        ),
      };
    }
    if (code.toUpperCase() === 'R') {
      return {
        name,
        kind: 'order-up-to',
        reviewInterval: inputNumber(
          first,
          t(`${position}, gözden geçirme aralığı`, `${position}, review interval`),
        ),
        targetStock: inputNumber(second, `${position}, hedef stok`),
      };
    }
    throw new Error(
      t(
        `${line}. politika satırında yöntem kodu Q veya R olmalıdır.`,
        `Policy row ${line} must use method code Q or R.`,
      ),
    );
  });
}

function optionalFactors(form: FormData, name: string, label: string) {
  const text = fieldText(form, name);
  return text.trim() ? readSeries(text, label) : [];
}

export function SimulationPanel() {
  const { t, detail: n, percent } = useLocale();
  const fill = (rate: number | null) =>
    rate === null ? t('Talep yok', 'No demand') : percent(rate * 100);
  return (
    <>
      <h2>{t('Stok maliyeti simülasyonu', 'Inventory cost simulation')}</h2>
      <p>
        {t(
          'Tek bir ürün için aynı talep geçmişiyle en az iki sipariş politikasını karşılaştırın.',
          'Compare at least two ordering policies for one product using the same demand history.',
        )}
      </p>
      <ModuleForm
        compute={(form) =>
          compareStockPolicies(
            {
              demand: readSeries(
                fieldText(form, 'demand'),
                t('Dönemsel talep değerlerini', 'Periodic demand values'),
              ),
              initialStock: fieldNumber(form, 'initial', t('Başlangıç stoku', 'Initial stock')),
              leadTime: fieldNumber(form, 'lead', t('Tedarik süresi', 'Lead time')),
              orderingCost: fieldNumber(form, 'order', t('Sipariş maliyeti', 'Ordering cost')),
              holdingCost: fieldNumber(form, 'holding', 'Elde bulundurma maliyeti'),
              shortageCost: fieldNumber(
                form,
                'shortage',
                t('Karşılanamayan talep maliyeti', 'Unfilled demand cost'),
              ),
            },
            readPolicies(fieldText(form, 'policies'), t),
            {
              demandFactors: optionalFactors(
                form,
                'demandFactors',
                t('Talep çarpanlarını', 'Demand multipliers'),
              ),
              holdingCostFactors: optionalFactors(
                form,
                'holdingFactors',
                t('Elde bulundurma maliyeti çarpanlarını', 'Holding cost multipliers'),
              ),
            },
          )
        }
        renderResult={({ baseline, changes }) => (
          <>
            <BarChart
              title={t(
                'Politika bazında toplam dönem maliyeti (TL)',
                'Total cost over the horizon by policy (TL)',
              )}
              values={baseline.map((row) => [row.name, row.total])}
            />
            <ResultsTable
              caption={t('Politika karşılaştırması', 'Policy comparison')}
              columns={[
                t('Politika', 'Policy'),
                t('Sipariş sayısı', 'Order count'),
                t('Sipariş (TL)', 'Ordering (TL)'),
                t('Elde bulundurma (TL)', 'Holding (TL)'),
                t('Eksik karşılama (TL)', 'Shortage (TL)'),
                'Toplam (TL)',
                t('Karşılanamayan (adet)', 'Unfilled (units)'),
                t('Karşılama oranı', 'Fill rate'),
                t('Ort. dönem sonu stok (adet)', 'Mean ending stock (units)'),
                t('Son stok (adet)', 'Final stock (units)'),
                t('Açık sipariş (adet)', 'Open orders (units)'),
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
                caption={t(
                  'Duyarlılık · Her seferinde tek girdi değişir',
                  'Sensitivity · One input changes at a time',
                )}
                columns={[
                  t('Değişen girdi', 'Changed input'),
                  t('Çarpan', 'Multiplier'),
                  t('Politika', 'Policy'),
                  t('Baz maliyet (TL)', 'Baseline cost (TL)'),
                  t('Senaryo maliyeti (TL)', 'Scenario cost (TL)'),
                  t('Baz maliyete fark (TL)', 'Difference from baseline (TL)'),
                  t('Karşılama oranı', 'Fill rate'),
                ]}
                rows={changes.flatMap(({ driver, factor, results }) =>
                  results.map((row, index) => [
                    driver === 'demand'
                      ? t('Talep', 'Demand')
                      : t('Elde bulundurma maliyeti', 'Holding cost'),
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
                {t(
                  'Duyarlılık tablosu için en az bir talep veya elde bulundurma maliyeti çarpanı girin. 1, baz senaryodur.',
                  'Enter at least one demand or holding cost multiplier for the sensitivity table. A value of 1 is the baseline.',
                )}
              </p>
            )}
            <p>
              {t(
                'Politika seçeneklerini maliyet, karşılanan talep ve dönem sonunda kalan stok ve açık siparişlerle birlikte değerlendirin.',
                'Compare policies using cost, fulfilled demand, final stock, and open orders.',
              )}
            </p>
          </>
        )}
      >
        <Field
          name="demand"
          label={t('Dönemsel talep (adet/dönem)', 'Periodic demand (units/period)')}
          multiline
          hint={t(
            'Kronolojik eşit dönemleri satır sonu, noktalı virgül veya sekmeyle ayırın. Talebi olmayan döneme 0 yazın.',
            'Separate equal periods in chronological order with a newline, semicolon, or tab. Enter 0 for periods without demand.',
          )}
        />
        <Field name="initial" label={t('Başlangıç stoku (adet)', 'Initial stock (units)')} />
        <Field
          name="lead"
          label={t('Sabit tedarik süresi (tam dönem)', 'Fixed lead time (whole periods)')}
        />
        <Field
          name="order"
          label={t('Sipariş maliyeti (TL/sipariş)', 'Ordering cost (TL/order)')}
        />
        <Field
          name="holding"
          label={t('Elde bulundurma maliyeti (TL/adet/dönem)', 'Holding cost (TL/unit/period)')}
        />
        <Field
          name="shortage"
          label={t('Karşılanamayan talep maliyeti (TL/adet)', 'Unfilled demand cost (TL/unit)')}
        />
        <Field
          name="policies"
          label={t('Karşılaştırılacak stok politikaları', 'Inventory policies to compare')}
          multiline
          hint={t(
            'Başlıksız her satırda dört sütun kullanın. Q için ad; Q; yeniden sipariş noktası (adet); parti miktarı (adet). R için ad; R; gözden geçirme aralığı (tam dönem); hedef stok (adet). Sütunları noktalı virgül veya sekmeyle ayırın.',
            'Use four columns per row without a header. For Q, enter name, Q, reorder point (units), and batch size (units). For R, enter name, R, review interval (whole periods), and target stock (units). Separate columns with a semicolon or tab.',
          )}
        />
        <Field
          name="demandFactors"
          label={t('Talep çarpanları', 'Demand multipliers')}
          optional
          hint={t(
            'Çarpanları noktalı virgülle ayırın. %10 artış için 1,10 girin.',
            'Separate multipliers with semicolons. Enter 1.10 for a 10% increase.',
          )}
        />
        <Field
          name="holdingFactors"
          label={t('Elde bulundurma maliyeti çarpanları', 'Holding cost multipliers')}
          optional
          hint={t(
            'Çarpanları noktalı virgülle ayırın. %10 azalış için 0,90 girin.',
            'Separate multipliers with semicolons. Enter 0.90 for a 10% decrease.',
          )}
        />
      </ModuleForm>
      <Method>
        <p>
          {t(
            'Her dönemin başında teslimatlar alınır ve stok pozisyonu hesaplanır: eldeki stok + açık sipariş. Q politikası pozisyon eşiğe eşit veya altındaysa bir sabit parti verir. R politikası ilk dönemden başlayarak her R dönemde pozisyonu hedefe tamamlar. Sıfır tedarik süresinde sipariş talep gerçekleşmeden gelir.',
            'At the start of each period, deliveries arrive and inventory position is calculated as on-hand stock plus open orders. Policy Q orders a fixed batch at or below the threshold. Policy R orders up to the target every R periods starting in period one. Zero lead time delivers before demand occurs.',
          )}
        </p>
        <p>
          {t(
            'Talep dönem içinde karşılanır. Eksik talep kayıp satış sayılır. Başlangıçta açık sipariş yoktur. Toplam maliyet = sipariş sayısı × sipariş maliyeti + dönem sonu stoklarının toplamı × dönemsel birim elde bulundurma maliyeti + karşılanamayan adet × eksik karşılama maliyeti. Satın alma ve dönem sonu değerleri hesaba katılmaz. Karşılama oranı = karşılanan adet / talep adedi.',
            'Demand is fulfilled during each period. Unfilled demand is a lost sale. There are no open orders initially. Total cost = order count × cost per order + sum of ending stocks × holding cost per unit per period + unfilled units × shortage cost. Purchase and terminal values are outside the model. Fill rate = fulfilled units / demanded units.',
          )}
        </p>
        <p>
          {t(
            'Duyarlılık, tüm talep dönemlerini veya elde bulundurma maliyetini seçtiğiniz çarpanla ayrı ayrı değiştirir. Diğer girdiler sabit kalır. Tarihsel seri ve sabit teslim süresi gelecekteki koşulları kapsamayabilir.',
            'Sensitivity analysis applies your multiplier to every demand period or to holding cost, one at a time. Other inputs are fixed. Historical demand and fixed lead time may differ from future conditions.',
          )}
        </p>
      </Method>
    </>
  );
}
