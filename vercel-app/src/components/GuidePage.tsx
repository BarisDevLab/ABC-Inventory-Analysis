import { Icon } from '../ui/Icon';
import { GuideMethods } from './GuideMethods';
import './guide.css';
import { useMemo, useRef, useState } from 'react';
import { calculateAbc, sampleData } from '../core/abc';
import { useLocale } from '../ui/locale';
import { groupPolicies } from './AnalysisInsights';
import { ProductTable } from './ResultsTables';

function GuideExamples() {
  const { t, money } = useLocale();
  const [first, second] = useMemo(
    () => [calculateAbc(sampleData()), calculateAbc(sampleData(), { a: 70, b: 20, c: 10 })],
    [],
  );
  return (
    <article className="panel guide-panel">
      <h2>{t('Çözümlü ABC Analizi Örneği', 'Worked ABC example')}</h2>
      <h3>{t('Örnek 1 · %80 / %15 / %5', 'Example 1 · 80% / 15% / 5%')}</h3>
      <ProductTable
        rows={first.rows}
        caption={t('Birinci çözümlü örnek', 'First worked example')}
      />
      <p>
        {t('Toplam yıllık tüketim değeri', 'Total annual usage value')}{' '}
        <strong>{money(first.total)}</strong>
      </p>
      <p className="callout">
        {t(
          'Sensör %69,08’de başladığı için kümülatif değeri %80’in üzerine çıkarsa da A grubunda kalır.',
          'Sensör starts at 69.08%, so it stays in group A even though it pushes the cumulative share above 80%.',
        )}
      </p>
      <h3>
        {t('Örnek 2 · Hedefler değişirse ne olur?', 'Example 2 · What if we change the targets?')}
      </h3>
      <p>
        {t(
          'A/B/C hedefleri %70 / %20 / %10, sınırlar %70 ve %90 olur.',
          'A/B/C targets are 70% / 20% / 10%, giving thresholds of 70% and 90%.',
        )}
      </p>
      <ProductTable
        rows={second.rows}
        caption={t('İkinci çözümlü örnek', 'Second worked example')}
      />
      <p>
        {t(
          'Sensör %69,08’de başlar ve A’da kalır. Kayış %88,82 ile B’de, Vida %96,71 ile C’dedir. Bu örnekte ürünler aynı gruplarda kalır.',
          'Sensör starts at 69.08% and remains in A. Kayış starts at 88.82% in B and Vida starts at 96.71% in C. The groups stay the same in this example.',
        )}
      </p>
      <p className="caption">
        {t(
          'Örnekler yüklediğiniz veriyi ve hedeflerinizi değiştirmez.',
          'The examples leave your uploaded inventory and targets unchanged.',
        )}
      </p>
    </article>
  );
}

export function GuidePage({ onReturn }: { onReturn: () => void }) {
  const { t, percent } = useLocale();
  const [tab, setTab] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const topics = [
    t('Genel Bakış', 'Overview'),
    t('Hesaplama Adımları', 'Calculation'),
    t('Çözümlü Örnekler', 'Worked examples'),
    t('Analiz Yöntemleri', 'Analysis methods'),
    t('Mühendislik Uygulamaları', 'Applications'),
  ];
  const policies = groupPolicies(t);
  const tabIcons = ['layers', 'calculator', 'bars', 'book', 'box'] as const;
  const applications = [
    [
      t('Stok yönetimi', 'Stock management'),
      t(
        'Ekonomik öneme göre stok kontrolü sıklığını belirleyin.',
        'Set review frequency by economic importance.',
      ),
    ],
    [
      t('Satın alma', 'Purchasing'),
      t(
        'Yüksek değerli kalemlerin ikmalini önceliklendirin.',
        'Prioritise replenishment of high-value items.',
      ),
    ],
    [
      t('Depo yönetimi', 'Warehouse management'),
      t(
        'Sayım ve takip yöntemini ABC grubuna göre seçin.',
        'Set counting and monitoring policies by ABC group.',
      ),
    ],
    [
      t('Üretim planlama', 'Production planning'),
      t(
        'Önemli malzemelerin tüketimini ve maliyetini izleyin.',
        'Track usage and cost of important materials.',
      ),
    ],
    [
      t('Tedarik zinciri', 'Supply chain'),
      t(
        'Kontrol kaynaklarını ekonomik etkisi yüksek ürünlere yönlendirin.',
        'Focus control resources on products with the highest economic impact.',
      ),
    ],
  ];
  const steps = [
    [
      t('Yıllık tüketim değerini hesaplayın', 'Calculate annual usage value'),
      t(
        'Yıllık tüketim miktarını birim fiyatla çarpın. Örneğin 500 adet rulman × 120 TL = 60.000 TL.',
        'Multiply annual usage by unit price. For example, 500 bearings × 120 TL = 60,000 TL.',
      ),
      'Dᵢ = Qᵢ × Pᵢ',
    ],
    [
      t('Ürünleri sıralayın', 'Rank the products'),
      t(
        'Yıllık değere göre azalan sırada dizin. Eşit değerde giriş sırası korunur.',
        'Rank products by descending value. Equal values retain their input order.',
      ),
    ],
    [
      t('Değer payını bulun', 'Calculate value share'),
      t(
        'Ürün değerini toplam değere bölüp 100 ile çarpın. 60.000 TL, 300.000 TL toplamın %20’sidir.',
        'Divide the product’s value by the total and multiply by 100. 60,000 TL is 20% of 300,000 TL.',
      ),
      'Sᵢ (%) = (Dᵢ / ΣDⱼ) × 100',
    ],
    [
      t('Kümülatif payı bulun', 'Calculate cumulative share'),
      t(
        'Azalan değer sırasındaki ürün paylarını sırayla toplayın.',
        'Add the product shares in descending value order.',
      ),
      'Kᵢ = Σⱼ₌₁…ᵢ Sⱼ',
    ],
    [
      t('ABC grubunu atayın', 'Assign an ABC group'),
      t(
        'Varsayılan hedefler %80, %15 ve %5’tir. Gruplar, ürün eklenmeden önceki kümülatif paya göre belirlenir. Sınırı aşan ürün başladığı grupta kalır. Sıfır değerli ürünler C grubuna atanır.',
        'Default targets are 80%, 15%, and 5%. Assign the group using the cumulative share before adding the product. A product that crosses a threshold stays in its starting group. Zero-value products belong to C.',
      ),
    ],
  ];
  return (
    <div className="guide-page">
      <header className="page-hero guide-hero">
        <div>
          <span className="section-icon">
            <Icon name="book" />
          </span>
          <h1>{t('Kullanım ve yöntem rehberi', 'User and methodology guide')}</h1>
          <p>
            {t(
              'ABC’nin hesaplama adımlarını, çözümlü örnekleri ve stok karar modellerini inceleyin.',
              'Explore ABC calculations, worked examples, and decision models for stock management.',
            )}
          </p>
        </div>
        <div className="guide-hero-visual" aria-hidden="true">
          <div className="guide-hero-bars">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="guide-hero-key">
            <i>A</i>
            <i>B</i>
            <i>C</i>
          </div>
        </div>
      </header>
      <div className="guide-tabs" role="tablist" aria-label={t('Rehber konuları', 'Guide topics')}>
        {topics.map((topic, index) => (
          <button
            ref={(element) => {
              buttons.current[index] = element;
            }}
            key={index}
            id={`guide-tab-${index}`}
            role="tab"
            tabIndex={tab === index ? 0 : -1}
            aria-selected={tab === index}
            aria-controls={`guide-panel-${index}`}
            onClick={() => setTab(index)}
            onKeyDown={(event) => {
              const last = topics.length - 1;
              const positions: Record<string, number> = {
                ArrowRight: (index + 1) % topics.length,
                ArrowLeft: (index + last) % topics.length,
                Home: 0,
                End: last,
              };
              const next = positions[event.key];
              if (typeof next === 'number') {
                event.preventDefault();
                setTab(next);
                buttons.current[next]?.focus();
              }
            }}
          >
            <Icon name={tabIcons[index]} /> {topic}
          </button>
        ))}
      </div>
      {topics.map((_, index) => (
        <section
          key={index}
          role="tabpanel"
          id={`guide-panel-${index}`}
          aria-labelledby={`guide-tab-${index}`}
          className="guide-content"
          tabIndex={0}
          hidden={index !== tab}
        >
          {index === tab && (
            <>
              {tab === 0 && (
                <>
                  <div className="guide-intro-grid">
                    <article className="guide-feature">
                      <span className="section-icon">
                        <Icon name="layers" />
                      </span>
                      <h2>{t('ABC Analizi Nedir?', 'What is ABC analysis?')}</h2>
                      <p>
                        {t(
                          'ABC analizi, stok kalemlerini yıllık parasal tüketim değerine göre sınıflandırır. Böylece sınırlı stok kontrolü kaynakları ekonomik etkisi yüksek ürünlere ayrılabilir.',
                          'ABC analysis classifies inventory by annual usage value so that stock control effort can focus on products with greater economic impact.',
                        )}
                      </p>
                      <p className="callout">
                        {t(
                          'Kontrol sıklığını ürünün ekonomik önemiyle uyumlu hale getirin.',
                          'Align the frequency of stock checks with economic importance.',
                        )}
                      </p>
                    </article>
                    <article className="guide-feature pareto-feature">
                      <span className="section-icon">
                        <Icon name="signal" />
                      </span>
                      <h2>{t('Pareto İlkesi', 'The Pareto principle')}</h2>
                      <p>
                        {t(
                          'Az sayıda ürün toplam değerin büyük bölümünü oluşturabilir. %80–20 bir başlangıç yaklaşımıdır. Gerçek dağılımı verileriniz belirler.',
                          'A small number of products may account for most of the value. The 80/20 split is a starting point. Your data determines the actual distribution.',
                        )}
                      </p>
                      <figure className="guide-target">
                        <div className="value-spectrum" aria-hidden="true">
                          <span className="tone-A" />
                          <span className="tone-B" />
                          <span className="tone-C" />
                        </div>
                        <figcaption>
                          {t('Varsayılan ABC değer hedefleri', 'Default ABC value targets')} ·{' '}
                          {percent(80, 0)} / {percent(15, 0)} / {percent(5, 0)}
                        </figcaption>
                      </figure>
                    </article>
                  </div>
                  <div className="section-heading">
                    <h2>{t('Grup bazlı kontrol politikaları', 'Stock control by group')}</h2>
                  </div>
                  <div className="group-cards">
                    {policies.map((policy, index) => (
                      <article key={policy.group} className={`guide-class tone-${policy.group}`}>
                        <span className={`group-badge group-${policy.group}`}>{policy.group}</span>
                        <h3>{policy.title}</h3>
                        <small>
                          {t('Varsayılan hedef', 'Default target')} {percent([80, 15, 5][index], 0)}
                        </small>
                        <p>{policy.description}</p>
                      </article>
                    ))}
                  </div>
                  <p className="caption guide-target-note">
                    {t(
                      'Hedefler ürün sayısını değil, yıllık parasal değeri ifade eder.',
                      'Targets describe annual usage value across products.',
                    )}
                  </p>
                </>
              )}
              {tab === 1 && (
                <article className="panel guide-panel">
                  <h2>{t('ABC Analizi Nasıl Yapılır?', 'How is ABC analysis calculated?')}</h2>
                  {steps.map(([title, text, formula], index) => (
                    <details className="guide-step" key={title} open={index === 0}>
                      <summary>
                        <span className="step-count">{index + 1}</span> {title}
                        <Icon name="chevron" />
                      </summary>
                      {formula && <p className="formula">{formula}</p>}
                      <p>{text}</p>
                    </details>
                  ))}
                </article>
              )}
              {tab === 2 && <GuideExamples />}
              {tab === 3 && <GuideMethods />}
              {tab === 4 && (
                <article className="panel guide-panel">
                  <h2>{t('Pareto Grafiği Nasıl Okunur?', 'How to read the Pareto chart')}</h2>
                  <p>
                    {t(
                      'Sütunlar yıllık tüketim değerini, renkler A/B/C gruplarını, çizgi kümülatif payı, kesikli çizgiler hedef sınırlarını gösterir. Ürünler yüksekten düşük değere sıralanır.',
                      'Bars show annual usage value, colours show A/B/C groups, the line shows cumulative share, and dashed lines mark target thresholds. Products run from highest to lowest value.',
                    )}
                  </p>
                  <p>
                    {t(
                      'Yakınlaştırın, kaydırın veya ürün grubu ve sıra aralığını seçin. Ayrıntılar için grafiğin üzerine gelin veya mobilde dokunun. Görünümü sıfırlayabilir ya da PNG olarak indirebilirsiniz. Filtreler tam analizi değiştirmez.',
                      'Zoom, pan, or select product groups and a rank range. Hover or tap for details. Reset the view or download it as a PNG. Filters leave the full analysis unchanged.',
                    )}
                  </p>
                  <h3>
                    {t('Endüstri Mühendisliğinde Kullanımı', 'Industrial engineering applications')}
                  </h3>
                  <div className="guide-applications">
                    {applications.map(([title, detail], index) => (
                      <div className="guide-application" key={title}>
                        <span className="section-icon">
                          <Icon
                            name={(['sliders', 'coins', 'box', 'bars', 'compare'] as const)[index]}
                          />
                        </span>
                        <h4>{title}</h4>
                        <p>{detail}</p>
                      </div>
                    ))}
                  </div>
                  <aside className="guide-limits">
                    <h3>{t('ABC Analizinin Sınırlamaları', 'Limitations of ABC analysis')}</h3>
                    <p>
                      {t(
                        'Yıllık tüketim değeri operasyonel kritiklik hakkında tek başına bilgi vermez. Tedarik süresi, talep değişkenliği, stok tükenme riski, tedarikçi güvenilirliği, güvenlik ve kalite gereksinimlerini ayrıca değerlendirin.',
                        'Annual usage value alone cannot describe operational criticality. Also consider lead time, demand variability, stockout risk, supplier reliability, safety, and quality requirements.',
                      )}
                    </p>
                  </aside>
                </article>
              )}
            </>
          )}
        </section>
      ))}
      <button className="button secondary back-button" onClick={onReturn}>
        {t('Analiz paneline dön', 'Return to dashboard')}
      </button>
    </div>
  );
}
