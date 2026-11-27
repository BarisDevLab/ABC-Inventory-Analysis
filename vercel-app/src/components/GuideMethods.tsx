import { Icon } from '../ui/Icon';
import type { IconName } from '../ui/Icon';
import { useLocale } from '../ui/locale';
import { workspacePages } from './WorkspaceNav';
import type { Page } from './WorkspaceNav';

export function GuideMethods() {
  const { t } = useLocale();
  const methods = [
    {
      name: 'XYZ / ABC-XYZ',
      icon: 'wave',
      page: 'xyz',
      formula: 'CV = s / μ',
      description: t(
        'XYZ, eşit dönemlerdeki örneklem standart sapmasını ortalamaya böler. Tamamen sıfır talep CV üretmez. ABC-XYZ, geçerli değişkenlik sınıfını yıllık değer sınıfıyla SKU veya ürün adı üzerinden eşleştirir.',
        'XYZ divides the sample standard deviation by the mean across equal periods. All-zero demand has undefined CV. ABC-XYZ joins a valid variability class to the annual value class by SKU or product name.',
      ),
    },
    {
      name: t('Dönemsel karşılaştırma', 'Period comparison'),
      icon: 'compare',
      page: 'period',
      formula: 'ΔV = V₂ − V₁',
      description: t(
        'İki dönem aynı ABC hedefleriyle sınıflandırılır. Kod eşleşmesi büyük/küçük harfe duyarlıdır. Yüzde farkı önceki değere göre hesaplanır ve önceki değer sıfırsa tanımsızdır.',
        'Apply the same ABC targets to both periods. SKU matching is case-sensitive. Percentage change uses the previous value as its base and is undefined when that value is zero.',
      ),
    },
    {
      name: t('Senaryo analizi', 'Scenario analysis'),
      icon: 'branch',
      page: 'scenario',
      formula: 'A + B + C = 100%',
      description: t(
        'Aynı envantere alternatif değer hedefleri uygulayın. Geçiş matrisi sınıf değiştiren ürünleri gösterir. Değişim sınıfları ve payları etkiler, yıllık tüketim değerlerini korur.',
        'Apply alternative value targets to the same inventory. The transition matrix shows class changes. Target changes affect classes and shares while retaining annual usage values.',
      ),
    },
    {
      name: t('Ekonomik sipariş miktarı', 'Economic order quantity'),
      icon: 'calculator',
      page: 'optimization',
      formula: 'Q* = √(2DS / H)',
      description: t(
        'Sabit yıllık talep D için sipariş maliyeti S ve birim yıllık elde bulundurma maliyeti H kullanılır. Sipariş ve stokta tutma eğrileri ilgili toplam maliyetin minimumunu gösterir.',
        'For constant annual demand D, use cost per order S and annual holding cost per unit H. The ordering and holding curves show the minimum relevant total cost.',
      ),
    },
    {
      name: t('Sipariş noktası ve emniyet stoku', 'Reorder point and safety stock'),
      icon: 'sliders',
      page: 'optimization',
      formula: 'ROP = d × L + SS',
      description: t(
        'Talep hızı d ve tedarik süresi L aynı dönem biriminde olmalıdır. Tampon için sabit veya değişken süreli normal model ya da gözlenen çevrim talebinden ampirik model seçilebilir.',
        'Demand rate d and lead time L must use the same period unit. Choose a fixed- or variable-lead-time normal model or an empirical model based on observed cycle demand.',
      ),
    },
    {
      name: 'FSN / VED',
      icon: 'box',
      page: 'movement',
      formula: t('FSN → sıklık · VED → kritiklik', 'FSN → frequency · VED → criticality'),
      description: t(
        'FSN, stok çıkışı olan dönemlerin oranını değerlendirir. VED, güvenlik ve operasyon etkilerinin en yükseğini kullanarak ürünü hayati, gerekli veya isteğe bağlı olarak sınıflandırır.',
        'FSN uses the share of periods with positive issues. VED classifies an item as vital, essential, or desirable using the greater of its safety and operational impacts.',
      ),
    },
    {
      name: t('Maliyet simülasyonu', 'Cost simulation'),
      icon: 'coins',
      page: 'simulation',
      formula: t('Sipariş + elde bulundurma + eksik karşılama', 'Ordering + holding + shortage'),
      description: t(
        'Sabit parti ve hedefe tamamlama politikalarını aynı talep serisinde karşılaştırın. Dönem sonunda kalan stok ve açık siparişleri maliyet ve karşılama oranıyla birlikte okuyun.',
        'Compare fixed-lot and order-up-to policies using the same demand history. Read ending stock and open orders alongside total cost and fill rate.',
      ),
    },
  ] satisfies { name: string; icon: IconName; page: Page; formula: string; description: string }[];
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>{t('Analiz yöntemleri', 'Analysis methods')}</h2>
          <p>
            {t(
              'Her modelin girdilerini, çalışma ilkesini ve kullanım alanını karşılaştırın.',
              'Compare the inputs, logic, and application of each model.',
            )}
          </p>
        </div>
      </div>
      <div className="guide-method-grid">
        {methods.map(({ name, icon, page, formula, description }) => (
          <article className="guide-method-card" key={name}>
            <span className="section-icon">
              <Icon name={icon} />
            </span>
            <h3>{name}</h3>
            <p className="formula">{formula}</p>
            <p>{description}</p>
            <a href={workspacePages[page][0]}>
              {t('Modülü aç', 'Open module')} <Icon name="arrow" />
            </a>
          </article>
        ))}
      </div>
    </>
  );
}
