# Vercel uygulaması

React + TypeScript + Vite ile derlenen statik ABC stok analiz uygulaması. [Kullanım, veri biçimi ve hesaplama yöntemi](../README.md)

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

Vercel proje kökü `vercel-app` olarak kalır. Vite derlemesi `npm run build` ile `dist/` dizinine yazılır. Uygulama API, veri deposu veya ortam değişkeni gerektirmez. Üretim başlıkları `vercel.json` dosyasındadır. `npm run preview` yerel üretim önizlemesine aynı başlıkları ekler.

## Hesaplama ve test verileri

- Analiz çekirdeği girdiyi değiştirmeden değer, pay, grup özeti ve kümülatif pay hesaplar. Sınır karşılaştırmasında `1e-10` yüzde puanı, A/B/C hedef toplamında `1e-12` mutlak tolerans kullanılır. Ara değerler yuvarlanmaz. Gösterilen kümülatif pay %100 ile sınırlanır.
- Toplam değer ikili toplama, grup toplamları telafili toplama, kümülatif paylar sıralı toplama ile hesaplanır. Ürün adları NFC normalleştirmesi, Türkçe İ/I dönüşümü ve Unicode case folding ile karşılaştırılır. Unicode 15.0.0 karakter ve sayı tabloları uygulamayla birlikte saklanır.
- `tests/fixtures/*-golden.json` sentetik hesaplama, dosya okuma ve Excel rapor sonuçlarını sabit test girdileri olarak içerir. Hesaplama ve Excel beklentileri, geçişten önce bağımsız bir hesaplama ve çalışma kitabı uygulamasından alınmıştır. Rapor referans dosyaları `tests/fixtures/reports/` altında, CSV/XLSX girişleri `tests/fixtures/files/` altında bulunur. Test edilen TypeScript kodu beklenen sonuçları üretmez. Beklentileri güncellerken örneğin girdisini ve değişen sonucu yöntem veya dosya sözleşmesine göre inceleyin.
- Davranış testleri tam ve toleranslı eşikleri, sıfır değerleri, Türkçe sayı ve ürün adlarını, CSV/XLSX hata koşullarını, rapor hücre değer ve türlerini, worker yaşam döngüsünü ve güvenlik başlıklarını kapsar.

## Dosya okuma ve rapor

CSV’de tırnaklı alanlar ve satır sonları desteklenir. Yinelenen başlıklar, fazla alanlı satırlar ve NUL karakterleri reddedilir. XLSX’te ilk çalışma sayfası okunur. Metin ürün kodlarının baştaki sıfırları korunur. Formüller çalıştırılmaz. Dosyaya kaydedilmiş bir formül sonucu varsa o değer okunur. Tarihler tüketim veya birim fiyat olarak kullanılmaz.

Excel raporu **ABC Analizi**, **Grup Özeti** ve **Analiz Ayarları** sayfalarını içerir. Boş şablonda yalnızca giriş başlıkları vardır. Rapor tam analizden üretilir. Para ve pay hücrelerinin görünümü iki ondalıkla sınırlıdır. Çok küçük değerlerin hücrede sıfır görünmesi sayısal değeri değiştirmez.

## Güvenlik ve gizlilik

- Dosya üst sınırı 20 MiB’dir. Satır, sütun ve hücre üst sınırları sırasıyla 100.000, 1.000 ve 1.000.000’dur. XLSX satır sınırı başlığı da içerir.
- XLSX, ExcelJS’ye verilmeden önce en fazla 10.000 ZIP girdisi ve hem bildirilen hem açılan veri için 100 MiB üst sınırı kontrol edilir. ZIP64, çok parçalı ve şifreli arşivler desteklenmez.
- Analiz ve Excel üretimi ayrı Web Worker’larda çalışır. İptalde ve 120 saniyelik zaman aşımında ilgili worker sonlandırılır.
- Kullanıcı verisi tarayıcı belleğinde kalır. Harici servis, CDN veya kalıcı tarayıcı deposu kullanılmaz. Excel indirmeleri yerel Blob bağlantısıyla yapılır. Formül tetikleyebilecek önekler içeren ürün adları dâhil tüm ürün adları açıkça metin hücresi olarak yazılır.
- CSP, `connect-src 'none'` ile ağ bağlantılarını engeller ve script ile worker kaynaklarını uygulamanın kendi kaynağıyla sınırlar. Üretim yanıtları ayrıca çerçeveleme, MIME koklama, yönlendiren bilgisi ve tarayıcı izinlerini sınırlar.
- Derleme, ExcelJS tarayıcı paketini sabit sürümlü kaynaktan oluşturur. Kullanılmayan eliptik eğri modüllerinin pakete girmesi derlemede engellenir. [Lisans bildirimleri](public/third-party/ExcelJS-NOTICES.txt)

## Dashboard

- Masaüstü ve dar ekranlarda aynı analiz, hedefler, stok dökümü ve Excel dışa aktarımı kullanılabilir. Mobil gezinme Escape ile kapanır ve odak menü düğmesine döner. Rehber sekmeleri ok tuşlarıyla çalışır.
- Dil ve tema tercihleri tarayıcıda saklanır. İngilizce arayüz yerelleştirilmiş sayı gösterimi kullanır. Giriş başlıkları ve Excel rapor şeması Türkçe kalır.
- Rota eklemek için `WorkspaceNav`, sonuç bölümü eklemek için `App.tsx` içindeki dashboard bileşenleri kullanılır. Sunum dili `ui/locale.ts`, renkler `style.css` tema değişkenleri üzerinden paylaşılır.

## Performans

`npm run build` ardından `npm run verify:production` çalıştırın. Kontrol derlenen modül worker'larıyla CSV, XLSX ve Excel şablonu akışını sınar. Paket manifestinde Plotly ve ExcelJS'nin ilk açılış yolunda olmadığını ve XLSX okuma ile Excel üretiminin aynı ExcelJS dosyasına yöneldiğini doğrular.

`npm run benchmark` sentetik CSV girdileriyle yükleme, hesaplama, Pareto model hazırlığı ve model kopyalama sürelerini ölçer. `npm run benchmark -- /yol/eski-checkout/vercel-app` önceden derlenmiş bir checkout'u ölçer. Her veri boyutu beş ayrı Node 24.22.3 sürecinde ölçüldü ve medyan raporlandı. Tepe RSS tüm süreci, grafik belleği ise model ve kopyası için GC sonrası ek JavaScript heap'ini gösterir. Ölçümler tarayıcı çizim süresini içermez.

| Ürün | Grafik hazırlığı önce / sonra (ms) | Grafik belleği önce / sonra (MiB) | Tepe RSS önce / sonra (MiB) |
| ---: | ---: | ---: | ---: |
| 1.000 | 4,54 / 3,65 | 0,63 / 0,35 | 43,25 / 42,81 |
| 10.000 | 32,62 / 3,56 | 6,06 / 0,35 | 66,18 / 63,56 |
| 50.000 | 155,12 / 3,42 | 30,78 / 0,36 | 167,71 / 148,64 |
| 100.000 | 343,93 / 3,83 | 61,79 / 0,36 | 265,49 / 261,28 |

100.000 satırda CSV okuma ve hesaplama sonrasında elde tutulan ek heap her iki sürümde 17,98 MiB oldu. Hesaplanan toplamlar tüm boyutlarda eşleşti. Pareto grafiği bir seferde en çok 500 sıra çizer. Kümülatif paylar, stok dökümü ve Excel raporu tam analizden gelir.

ExcelJS'nin iki ayrı çıktısı toplam 1.424 kB (gzip 396 kB) tutuyordu. Modül worker'ları tek üretim grafiğinde birleştirerek ve güncel tarayıcılarda gerekmeyen global polyfill'leri çıkararak bunu ortak bir 625 kB (gzip 175 kB) dosyaya indirdik. CSV ve örnek veri ExcelJS isteği göndermez. XLSX okuma ve Excel dışa aktarımı modülü gerektiğinde yükler. Plotly Basic 1.130 kB (gzip 378 kB) tutuyor ve grafik görünüm alanına yaklaşınca yükleniyor. Her iki paket de Vite'ın mevcut 500 kB uyarı sınırını aşıyor.
