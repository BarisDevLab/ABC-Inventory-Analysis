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
