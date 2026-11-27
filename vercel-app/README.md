# Vercel uygulaması

React + TypeScript + Vite ile derlenen statik Inventory Intelligence uygulaması. [Kullanım, veri biçimi ve hesaplama yöntemi](../README.md)

## Yerel geliştirme

Node.js 24.x (en az 24.11.1) kullanın. Bu dizinde çalıştırın.

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run preview
```

`npm run format` TSX ve CSS dosyalarını Prettier ile biçimlendirir. `npm audit` tüm bağımlılıkları, `npm audit --omit=dev` çalışma zamanı bağımlılıklarını tarar. CI tüm bağımlılıkları tarar ve orta veya daha yüksek önem düzeyindeki bulgularda başarısız olur.

## Vercel yapılandırması

Vercel proje kökü `vercel-app` olarak kalır. Vite derlemesi `npm run build` ile `dist/` dizinine yazılır. Uygulama API, sunucu tarafı veri deposu veya ortam değişkeni gerektirmez. Üretim başlıkları `vercel.json` dosyasındadır. `npm run preview` yerel üretim önizlemesine aynı başlıkları ekler.

## Hesaplama ve test verileri

- Analiz çekirdeği girdiyi değiştirmeden değer, pay, grup özeti ve kümülatif pay hesaplar. Sınır karşılaştırmasında `1e-10` yüzde puanı, A/B/C hedef toplamında `1e-12` mutlak tolerans kullanılır. Ara değerler yuvarlanmaz. Gösterilen kümülatif pay %100 ile sınırlanır.
- Toplam değer ikili toplama, grup toplamları telafili toplama, kümülatif paylar sıralı toplama ile hesaplanır. Ürün adları NFC normalleştirmesi, Türkçe İ/I dönüşümü ve Unicode case folding ile karşılaştırılır. Unicode 15.0.0 karakter ve sayı tabloları uygulamayla birlikte saklanır.
- `tests/fixtures/*-golden.json` sentetik hesaplama, dosya okuma ve Excel rapor sonuçlarını sabit test girdileri olarak içerir. Hesaplama ve Excel beklentileri, geçişten önce bağımsız bir hesaplama ve çalışma kitabı uygulamasından alınmıştır. Rapor referans dosyaları `tests/fixtures/reports/` altında, CSV/XLSX girişleri `tests/fixtures/files/` altında bulunur. Test edilen TypeScript kodu beklenen sonuçları üretmez. Beklentileri güncellerken örneğin girdisini ve değişen sonucu yöntem veya dosya sözleşmesine göre inceleyin.
- Davranış testleri tam ve toleranslı eşikleri, sıfır değerleri, Türkçe sayı ve ürün adlarını, CSV/XLSX hata koşullarını, rapor hücre değer ve türlerini, worker yaşam döngüsünü ve güvenlik başlıklarını kapsar.

## Dosya okuma ve rapor

CSV’de tırnaklı alanlar ve satır sonları desteklenir. Fazla alanlı veri satırları ve NUL karakterleri reddedilir. Özel sütunlar konumlarına göre eşleştirilir. CSV başlık satırı numarası, fiziksel olarak boş satırları atlayarak mantıksal CSV kayıtlarını sayar. XLSX ilk sayfayla açılır ve başka bir sayfa seçilebilir. Metin SKU’larında ve basit sıfır dolgulu Excel kodlarında baştaki sıfırlar korunur. Formüller çalıştırılmaz. Dosyaya kaydedilmiş bir formül sonucu varsa o değer okunur. Tarihler tüketim veya birim fiyat olarak kullanılmaz.

Excel raporu **ABC Analizi**, **Grup Özeti** ve **Analiz Ayarları** sayfalarını içerir. SKU eşleştirilirse **ABC Analizi** sayfasına metin olarak eklenir. Boş şablonda yalnızca giriş başlıkları vardır. Rapor tam analizden üretilir. Para ve pay hücrelerinin görünümü iki ondalıkla sınırlıdır. Çok küçük değerlerin hücrede sıfır görünmesi sayısal değeri değiştirmez.

## Güvenlik ve gizlilik

- Dosya üst sınırı 20 MiB’dir. Satır, sütun ve hücre üst sınırları sırasıyla 100.000, 1.000 ve 1.000.000’dur. XLSX satır sınırı başlığı da içerir.
- XLSX, ExcelJS’ye verilmeden önce en fazla 10.000 ZIP girdisi ve hem bildirilen hem açılan veri için 100 MiB üst sınırı kontrol edilir. ZIP64, çok parçalı ve şifreli arşivler desteklenmez.
- Analiz ve Excel üretimi ayrı Web Worker’larda çalışır. İptalde ve 120 saniyelik zaman aşımında ilgili worker sonlandırılır.
- Kullanıcı dosyaları sunucuya gönderilmez. Yalnızca açıkça kaydedilen analizler, tarayıcıya ve siteye özgü IndexedDB geçmişinde saklanır. Geçmiş 10 kayıtla sınırlıdır ve tek tek veya tümüyle silinebilir. Excel ve sürümlü JSON paketleri yerel Blob bağlantısıyla indirilir. JSON paketleri en fazla 20 MiB olabilir. Excel çıktısında ürün adları ve SKU’lar metin hücresi olarak yazılır.
- CSP, `connect-src 'none'` ile ağ bağlantılarını engeller ve script ile worker kaynaklarını uygulamanın kendi kaynağıyla sınırlar. Üretim yanıtları ayrıca çerçeveleme, MIME koklama, yönlendiren bilgisi ve tarayıcı izinlerini sınırlar.
- Derleme, ExcelJS tarayıcı paketini sabit sürümlü kaynaktan oluşturur. Kullanılmayan eliptik eğri modüllerinin pakete girmesi derlemede engellenir. [Lisans bildirimleri](public/third-party/ExcelJS-NOTICES.txt)

## Dashboard

- Masaüstü ve dar ekranlarda aynı analiz, hedefler, stok dökümü ve Excel dışa aktarımı kullanılabilir. Mobil gezinme Escape ile kapanır ve odak menü düğmesine döner. Rehber sekmeleri ok tuşlarıyla çalışır.
- Dil ve tema tercihleri tarayıcıda saklanır. İngilizce arayüz yerelleştirilmiş sayı gösterimi kullanır. Giriş başlıkları ve Excel rapor şeması Türkçe kalır.
- Gezinme `WorkspaceNav` içinde tanımlanır. `App.tsx` güncel veri, ABC hedefleri ve arayüz tercihlerini paylaşır. Sunum dili `ui/locale.ts`, renkler `style.css` tema değişkenleri üzerinden yönetilir.

## Performans

`npm run build` ardından `npm run verify:production` çalıştırın. Kontrol derlenen modül worker'larıyla CSV, XLSX ve Excel şablonu akışını sınar. Paket manifestinde Plotly ve ExcelJS'nin ilk açılış yolunda olmadığını ve XLSX okuma ile Excel üretiminin aynı ExcelJS dosyasına yöneldiğini doğrular.

`npm run benchmark` sentetik CSV girdileriyle yükleme, hesaplama, Pareto model hazırlığı ve model kopyalama sürelerini ölçer. `npm run benchmark -- /yol/eski-checkout/vercel-app` önceden derlenmiş bir checkout'u ölçer. Her boyut beş ayrı sürecin medyanıyla raporlanır. Tepe RSS tüm süreci, grafik belleği model hazırlığı sonrasındaki ek JavaScript heap’ini gösterir. Bu ölçüme tarayıcı çizimi dahil değildir.

Paket manifesti, Vite’ın 500 kB uyarısını aşan ExcelJS ve Plotly dosyalarının başlangıçta yüklenmediğini doğrular. Pareto grafiği bir seferde 500 sıra gösterir. Kümülatif paylar, stok dökümü ve Excel raporu tam analizden gelir.

Yerel üretim tarayıcı kontrolü için bir terminalde `npm run preview -- --port 4175`, diğerinde `node scripts/browser_review.mjs /usr/bin/chromium` çalıştırın. Kontrol sentetik dosyalarla gerçek yükleme, indirme, grafik, hesaplama ve depolama akışlarını sınar.
