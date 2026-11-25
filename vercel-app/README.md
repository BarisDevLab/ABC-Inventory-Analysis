# ABC Stok Analiz Sistemi — Tarayıcı Sürümü

React + TypeScript + Vite tabanlı, tamamen tarayıcıda çalışan Türkçe stok analiz uygulaması. **ABC Analiz Paneli** ve **ABC Rehberi** sayfaları; CSV/Excel yükleme, dinamik hedefler, altı KPI, etkileşimli Pareto/halka grafikleri, veri temelli yorumlar, sonuç tabloları ve Excel/PNG indirmeyi bir araya getirir. İlk açılış boştur; demo yalnızca kullanıcı seçtiğinde yüklenir. Mevcut Streamlit uygulamasından bağımsızdır; üst klasördeki dosyaları değiştirmez. Uygulamada API, veri yükleyen ağ isteği, hesap sistemi veya kalıcı veri deposu yoktur.

## Güncel kalite ve güvenlik durumu — 25 Kasım 2026

Aşağıdaki sonuçlar önceki aşamalardaki tarihli ölçümlerin yerini alır; eski sonuçlar ve dosya uyumluluğu sınırlamaları geçmiş kayıt olarak korunmuştur. Mevcut ABC algoritması, Excel rapor içeriği ve görsel tasarım değiştirilmedi.

### Güvenlik ve ExcelJS derlemesi

- Vitest **3.2.7 → 4.1.12** yükseltildi. Eski `tinypool` zinciri kaldırıldı; güncel mocker ile kritik/orta bildirimler giderildi.
- ExcelJS **4.4.0** korundu; yalnızca ona uygulanan npm override ve doğrudan sabitlenmiş **uuid 11.1.1** kullanılır. Eski hazır ExcelJS tarayıcı paketi gömülü uuid 8 içerdiğinden yalnızca override yeterli değildir.
- `scripts/build-exceljs.mjs`, ExcelJS kaynaklarını değiştirmeden proje içindeki geçici çalışma alanında tarayıcı için yeniden derler. Vite'ın ortak alias'ı sayfa, worker ve testlerde aynı çıktıyı kullanır. UUID'nin tarayıcı sürümü seçilir; eski Browserify ayrıştırıcısı için yalnızca UUID sözdizimi esbuild ile dönüştürülür. `scripts/excel-crypto.cjs`, ExcelJS'in kullandığı hash/rastgele bayt işlemlerini mevcut `create-hash` ve `randombytes` uygulamalarıyla sağlar; özel kriptografik algoritma yazılmaz.
- Derleme ExcelJS/UUID sürümlerini, kaynak ve çıktı SHA-256 değerlerini kontrol eder. İncelenen sürümler değişirse sessizce devam etmez. `elliptic`, `crypto-browserify`, `browserify-sign` ve `create-ecdh` modüllerinin tarayıcı paketine girmediği ayrıca doğrulanır. Sayfa korumasının SHA-512 davranışı ve dosyayı yeniden açma testi korunur.
- `src/generated/` Git'e alınmaz; `predev`, `pretest`, `pretypecheck` ve `prebuild` adımları çıktıyı gerektiğinde üretir. Temiz ortamda **geliştirme bağımlılıklarını da içeren `npm ci`** gerekir. Derleme sırasında internetten kaynak alınmaz. Kaynak değişiklikleri önbellek anahtarına dahildir. Paket lisans metinleri `public/third-party/ExcelJS-NOTICES.txt` içinde sunulur.

| npm audit kapsamı | Önce | Son doğrulama |
|---|---|---|
| Tüm bağımlılıklar | 2 kritik, 3 orta | **0 kritik, 0 yüksek, 0 orta; 4 düşük** |
| Üretim (`--omit=dev`) | 2 orta | **0 bildirim** |

Kalan dört düşük bildirim Browserify geliştirme zincirindeki `elliptic@6.6.1`, `browserify-sign`, `create-ecdh` ve `crypto-browserify` kayıtlarıdır. Ortak kaynak [GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84) olup incelenen npm kayıtlarında yamalı elliptic sürümü bulunmadı. Bu modüller kurulu derleme araçlarının bağımlılık ağında bulunur, uygulama çıktısına eklenmez. Bu durum sıfır risk garantisi değildir; araç zinciri güncellemeleri izlenmelidir. Bildirimler gizlenmedi, uyumsuz sürüm zorlaması ve `npm audit fix --force` kullanılmadı.

### Performans karşılaştırması

Türkçe sayı biçimlendiricileri tekrar kullanılır. Grafik modeli önbelleğe alınır; envanter boyutu değiştiğinde eski aralıkla gereksiz ilk çizim yapılmaz. Plotly işlemleri sıraya alınır, geçersizleşmiş çizimler atlanır; yalnızca gezinme modu değiştiğinde veri tekrar çizilmez. Plotly'nin nesneleri değiştirmesine karşı çizime kopya gönderilir; böylece sıfırlamanın başlangıç eksenlerini koruduğu regresyon testiyle doğrulanır. Tablo sayfalaması ve bütün ürünleri koruyan grafik davranışı sürer.

| Ürün | Dosyadan grafiğe önce → sonra | En uzun ana iş parçacığı görevi önce → sonra | En büyük zamanlayıcı gecikmesi önce → sonra |
|---|---|---|---|
| 500 | 226 → **192 ms** | 61 → **69 ms** | 77,2 → **68,4 ms** |
| 2.000 | 526 → **182 ms** | 201 → **83 ms** | 157,8 → **50,1 ms** |
| 5.000 | 1.075 → **259 ms** | 498 → **147 ms** | 606,3 → **178,9 ms** |

Ölçümler aynı yerel üretim tarayıcı akışındaki sıcak CSV yüklemeleridir; istatistiksel kıyaslama veya cihazlar arası garanti değildir. 500 ürünün tek uzun görevi azalmadı. 5.000 üründe yaklaşık %70,5 azalsa da 147 ms ana iş parçacığı görevi hâlâ hissedilebilir; SVG grafiği tamamen worker'a taşınmış değildir. Son koşuda sayfa JS yığını 5.000 üründen sonra yaklaşık 24,3 MB idi (önce yaklaşık 29,0 MB); bu değer worker/GPU belleğini kapsamaz.

İlk uygulama JS'i **269,53 kB / 84,38 kB gzip**, ortak veri parçası **32,72 kB / 14,75 kB gzip**, CSS **21,22 kB / 5,81 kB gzip**. Geç yüklenen ExcelJS parçası yaklaşık **940 → 712 kB**, gzip **271,33 → 198,13 kB** oldu. Plotly **1.130,02 kB / 377,51 kB gzip**; Vite'ın büyük parça uyarısı sürer. İlk boş açılışta iki kütüphanenin de yüklenmediği, worker dahil isteklerin yerel kaldığı ve eski hazır ExcelJS paketinin hiç istenmediği Chrome'da doğrulandı.

### Son doğrulamalar

- **299 otomatik test başarılı, 0 başarısız**; mevcut testler korunarak güvenli UUID, kaynak paket doğrulaması, sayfa koruması, Türkçe biçimlendirme ve grafik yaşam döngüsü testleri eklendi. Önceki 290 teste iki ZIP sınır testi ve yedi güvenlik/grafik testi eklenmiştir.
- TypeScript kontrolü ve Vite üretim derlemesi başarılı. Python referanslarıyla çekirdek/dosya/rapor testleri geçti; **17 Excel dosyası** ayrıca openpyxl ile değer, tür ve biçimleri açısından yeniden doğrulandı. Önceki beş dosya davranışı farkı aşağıda geçerliliğini korur.
- Gerçek Chrome üretim koşusu: **48 kontrol başarılı, 0 başarısız**. İlk açılış, demo, CSV/CP1254/XLSX, geçersiz dosya, hedefler ve sayfalar arası koruma, dört rehber sekmesi, fare/tekerlek ile yakınlaştırma, kaydırma/sıfırlama, Türkçe bilgi kutuları, iki gerçek PNG, Excel raporu ve boş şablon indirmeleri sınandı. İndirilen iki Excel openpyxl ile ayrıca açıldı: beş ürün, 304.000 TL toplam, üç rapor sayfası ve %80/%15/%5 hedefleri; şablonda yalnızca üç başlık.
- Masaüstü 1440×1000, tablet 820×1180, telefon 390×844 ve 360×800: sayfa taşması, menü/klavye ve rehber kontrolleri başarılı. Ayrı geçici profil kullanıldı; kişisel profile erişilmedi. Sayfa çalışma zamanı hatası veya dış uygulama isteği görülmedi. Mobil kontrol masaüstü emülasyonudur; gerçek telefon/Safari testi değildir.
- Başarılı koşu ve ekran görüntüleri `.tmp/ui-review/2026-11-25T19-10-17-908Z/` içindedir. Başarısız erken sıfırlama testi kaydı da korunur; sorun düzeltilip otomatik ve tarayıcı testleri tekrar çalıştırıldı. Güvenlik taramaları `.tmp/security-improvements/`, değişiklik öncesi yedek `.tmp/improvements-backup-20261125/` içindedir; bu yerel kayıtlar Git'e alınmaz.

### Vercel hazırlığı ve yayımlanacak kapsam

Yayın öncesi temiz doğrulama, depo yapısı korunarak ayrı bir yerel kopyada tekrarlandı: `abc_core.py` depo kökünde, React uygulaması `vercel-app/` altında tutuldu. `npm ci` ardından ExcelJS paketi sıfırdan üretildi; **299 test, TypeScript kontrolü ve üretim derlemesi başarılı** oldu. İlk, yalnızca React klasörünü içeren kopyada üç kaynak-hash testi Python dosyasını bulamadığı için başarısız olmuştu; hiçbir test kapatılmadan dizin düzeni düzeltilerek tekrarlandı. Kaynak-hash testleri Python dosyasının ham baytlarını karşılaştırır; LF/CRLF dönüşümü yapılan farklı işletim sistemlerinde bu referans kontrolünün ayrıca değerlendirilmesi gerekir. Bu yerel temiz kurulum Windows/Node 24.11.1 doğrulamasıdır; Vercel'in Linux ortamında çalışmış bir dağıtımın yerine geçmez.

Root Directory: **`vercel-app`**; Framework Preset: **Vite**; Node.js: **24.x**; kurulum: **`npm ci`**; Build Command: **`npm run build`**; Output Directory: **`dist`**. `engines` alanı `>=24.11.1 <25` olarak sınırlandırıldı. `#analiz`/`#rehber` yönlendirmeleri sunucuda ek SPA rewrite gerektirmez. Node 24 desteği resmî belgelerden kontrol edildi; gerçek Vercel derlemesi/dağıtımı yapılmadı.

Kaynaklar, testler, `package.json`, kilit dosyası, Vite yapılandırması, derleme betikleri ve lisans bildirimleri birlikte takip edilmelidir. `.tools/`, `.npm-cache/`, `.tmp/`, `node_modules/`, `src/generated/`, `dist/` ve `.vercel/` Git dışında kalır. Mevcut Streamlit dosyaları ve GitHub Actions yapılandırmasının koruma hash'leri değişmedi. Git commit/push veya dağıtım yapılmadı.

## Yapı

```text
src/main.tsx                        React başlangıç noktası
src/App.tsx                         İki sayfa, bellek içi veri/hedef durumu ve ana yerleşim
src/style.css                       Küçük koyu tema
src/core/abc.ts                     Saf hesaplama ve doğrulama fonksiyonları
src/core/python-unicode.json        Python Unicode dönüşüm tabloları
src/io/read-file.ts                 CSV/XLSX okuma ve tarayıcı File giriş noktası
src/io/python-file-data.json        Python CP1254 ve eksik değer eşlemeleri
src/export/excel-report.ts          Tam analiz raporu ve boş şablon üretimi
src/export/excel.worker.ts          Tarayıcı Web Worker giriş noktası
src/export/report-worker.ts         Test edilebilir worker mesaj işleyicisi
src/export/download.ts              Worker yaşam döngüsü, Blob ve yerel indirme
src/components/ReportDownload.tsx    Küçük rapor/şablon indirme bileşeni
src/components/UploadWorkspace.tsx   Dosya seçme, sürükle-bırak, demo ve temizleme
src/components/TargetSettings.tsx    Taslak/geçerli ABC hedefleri
src/components/KpiOverview.tsx       Altı KPI kartı
src/components/ChartsPanel.tsx       Pareto filtreleri ve dağılım paneli
src/components/AnalysisInsights.tsx  Veriye dayalı mühendislik yorumları
src/components/ResultsTables.tsx     Ürün ve grup tabloları, 50 satırlık sayfalama
src/components/GuidePage.tsx         Dört sekmeli rehber, hesaplanan örnekler
src/components/TemplateDownload.tsx  İlk açılışta da kullanılabilen boş şablon
src/charts/                         Saf grafik modelleri ve geç yüklenen Plotly
src/processing/                     Dosya okuma/yeniden hesaplama worker'ı ve istemcisi
src/ui/format.ts                    Türkçe gösterim ve güvenli grafik metinleri
tests/abc.test.ts                   Python karşılaştırmaları ve sözleşme testleri
tests/files.test.ts                 Dosya uyumluluğu, sınırlar ve gizlilik testleri
tests/reports.test.ts               Rapor, şablon, formül güvenliği ve indirme testleri
tests/interface.test.tsx            React sayfa/bileşen entegrasyonu
tests/chart-models.test.ts          Grafik verisi, filtre, eşik ve hassas gösterim testleri
tests/fixtures/python-reference.json Python'dan üretilen gerçek referans sonuçları
tests/fixtures/file-reference.json  Python dosya okuma referansları ve bilinen farklar
tests/fixtures/files/              Sentetik CSV/XLSX ve bozuk dosya örnekleri
tests/fixtures/report-reference.json Python rapor hücreleri, türleri ve biçim referansları
tests/fixtures/reports/             Python'dan üretilen sentetik rapor/şablon dosyaları
scripts/generate_reference.py       Referans/Unicode verisi üretimi
scripts/generate_file_reference.py  Python dosya referanslarının üretimi
scripts/report_reference.py        Rapor referansları ve bağımsız openpyxl doğrulaması
scripts/browser_review.mjs          Onayla çalışan localhost Chrome/Edge otomasyonu
vite.config.ts                     Vite ve Vitest yapılandırması
tsconfig.json                      Sıkı TypeScript kontrolü
package.json / package-lock.json    Bağımlılıklar ve sabitlenmiş çözüm
```

`.tools/`, `.npm-cache/`, `.tmp/`, `node_modules/` ve `dist/` yerel çıktılardır ve bu klasörün `.gitignore` dosyasında dışlanır. Taşınabilir Node ZIP'i ve SHA-256 listesi silinmeden `.tools/` içinde tutulur. Sistem kurulumu veya kalıcı PATH değişikliği yapılmaz.

## Çalıştırma

Node.js **24.11.1 veya üzeri** gerekir. Standart geliştirme ortamında bu klasörden:

```sh
npm ci --cache .npm-cache --no-audit --no-fund
npm test
npm run typecheck
npm run build
npm run dev
```

`npm ci` ağ erişimi ve paket kurulumu yapar; yalnızca ilgili izinlerle çalıştırılmalıdır. Bu ortamda onayla kullanılan taşınabilir Node konumu `.tools/node-v24.11.1-win-x64/` dizinidir. Yerel testlerde npm önbelleği ve geçici dosyalar bu klasörde tutuldu; kullanıcı npm yapılandırması kullanılmadı. Ortam değişkenleri yalnızca ilgili komut süreçlerinde ayarlandı.

Yapılandırma için `--configLoader native` kullanılır. Böylece Node.js TypeScript yapılandırmasını doğrudan yükler; varsayılan esbuild yapılandırma paketleyicisinin kısıtlı Windows ortamında üst dizin erişimine takılması önlenir.

Statik üretim çıktısı `dist/` dizinine yazılır. Vercel hesabına bağlanılmadı, dağıtım yapılmadı ve Vercel ayar dosyası eklenmedi.

## Çekirdek sözleşmesi

- `calculateAbc({ columns, rows }, { a, b, c })` saf fonksiyondur; girdiyi değiştirmez. Sütun listesi özellikle korunur: böylece yinelenen başlıklar nesne anahtarlarına dönüşürken kaybolmaz.
- Gerekli başlıklar `Ürün`, `Yıllık Tüketim`, `Birim Fiyat (TL)`; ek sütunlar hesaplamaya alınmaz.
- `parseNumber` Türkçe/İngilizce ayraçları, TL/₺, boşlukları ve Python'ın bütün metni doğrulayan sayı gramerini izler. `parseFloat` ile kısmi metin kabulü yapılmaz. Python'ın Unicode ondalık rakamları, sayısal alt çizgileri ve özel boşluk karakterleri ele alınır.
- Ürün adlarında Python NFC → Türkçe İ/I dönüşümü → `casefold` sırası korunur. `casefold`, Unicode ondalık rakam ve boşluk tabloları mevcut Python'dan üretilir; yalnızca JavaScript küçük harf dönüşümüne güvenilmez.
- Ürün değerleri tüketim × fiyat olarak hesaplanır; eşit değerlerde giriş sırası korunur.
- Sınıflandırma, ürün eklenmeden önceki kümülatif paya göre yapılır; `1e-10` yüzde puanı mutlak toleransı kullanılır. Eşiği aşan ürün başladığı grupta kalır. Sıfır değerli ürünler C'dir. Toplam sıfır veya sonlu değilse analiz reddedilir.
- Gösterilen kümülatif sütun en fazla 100'dür; sınıflandırma için sınırlanmamış birikim kullanılır. Ara değerler yuvarlanmaz.
- A/B/C toplamı 100 olmalıdır (ondalıklı hedeflerde kayan nokta kaynaklı hata için `1e-12` mutlak toplam toleransı). Python çekirdeği yalnızca A/B alırken bu fonksiyon mevcut arayüz sözleşmesini tamamlayarak C'yi de doğrular.
- `pythonSum`, NumPy'nin float64 ikili toplama düzenini; grup özeti ise Pandas grup toplamındaki telafili toplama yaklaşımını izler. Kümülatif hesaplama sıralı toplama olarak kalır.
- `analysisInsights`, `summarizeGroups` ve `engineeringCommentary` gerçek sonuçlardan türetilir; harici servis veya üretken yapay zekâ kullanılmaz.

## Python referansları ve test sonuçları

Referans verisi üst klasördeki gerçek `abc_core.py` içe aktarılarak üretildi. Python bayt kodu yazımı kapatıldı. Üretim yalnızca bu uygulamanın JSON dosyalarına yazar:

```sh
python -B scripts/generate_reference.py
```

Bu komut mevcut Python bağımlılıklarının bulunduğu yorumlayıcıyla çalıştırılmalıdır; paket kurmaz. Kaynak SHA-256, Python/Pandas/Unicode sürümleri referans JSON'unda bulunur. Bir test, referansların mevcut Python kaynak özetiyle eşleşmesini zorunlu kılar. Python çekirdeği değişirse referanslar incelenerek yeniden üretilmelidir.

Aşama 2 — 18 Kasım 2026 doğrulaması (tarihsel kayıt):

- **148 test geçti:** 113 Python analiz senaryosu, 29 sayı ayrıştırma örneği, 5 TypeScript sözleşme testi ve 1 kaynak özeti testi.
- Demo: **304.000 TL**, **A/A/A/B/C**, A/B/C ürün sayıları **3/1/1**.
- Tam %80/%95 sınırları, toleransın iki tarafı, eşit değerler, sıfır hedef/değer/toplam, Türkçe sayılar, Unicode yinelenen adlar, negatif/geçersiz girdiler, çok küçük/subnormal değerler, büyük değer ve taşma, değişik hedefler ve 1000 ürüne kadar sabit tohumlu veriler sınandı.
- Grup/sıra/metin/hata sonuçları tam eşitlik; sayısal sonuçlar `1e-13` göreli toleransla (en küçük temsil edilebilir sayı tabanıyla) karşılaştırıldı. Test edilen örneklerde uyumsuzluk bulunmadı; bütün olası girdiler için bit düzeyinde eşitlik iddiası yoktur.
- `tsc --noEmit` ve Vite üretim derlemesi başarılı. Son test eklemesinden sonra TypeScript kontrolü yeniden geçti.
- Üretim önizlemesi: yerel HTTP ana sayfa ve iki statik kaynak **200**. Tarayıcıyla görsel veya etkileşim testi yapılmadı; yerel önizleme süreci kapatıldı.
- Önceki koruma kaydındaki 15 dosyanın SHA-256 değerleri değişmedi: Streamlit kaynakları, tema, rehber, mevcut testler, README, bağımlılıklar, eski örnek ve ekran görüntüleri korundu.
- Kullanılan sürümler: Node.js 24.11.1 (resmî ZIP ve SHA-256 kontrolü), React/React DOM 19.3.1, Vite 6.4.6, TypeScript 5.9.3, Vitest 3.2.7.

## Aşama 3 — CSV ve Excel dosya okuma

### Desteklenen dosyalar ve giriş noktaları

- Yalnızca `.csv` ve `.xlsx` desteklenir; `.xls`, `.xlsm`, `.ods` veya başka biçimler destekleniyormuş gibi sunulmaz.
- CSV: UTF-8, UTF-8 BOM ve Python ile eşleşen Windows Türkçe CP1254 çözümlemesi; virgül, noktalı virgül ve sekme ayracı; tırnaklı ayraçlar, çift tırnak kaçırma ve tırnak içindeki satır sonları. UTF-8 çözümlenemezse CP1254 denenir. CP1254'te de tanımsız baytlar Türkçe kodlama hatası verir.
- Kısa CSV satırları boş hücrelerle tamamlanır; fazla alanlı veya bozuk tırnaklı satırlar reddedilir. Başlıktan sonraki boş satırlar atlanır. Başlıktan önce boş satır bulunması, mevcut Python `sep=None` davranışıyla uyumlu şekilde dosya okuma hatasıdır.
- XLSX: ilk çalışma sayfası okunur; sonraki sayfalar analize katılmaz. Sayısal hücreler sayı olarak, metin hücreleri metin olarak korunur. Yalnızca biçimlendirilmiş boş son hücreler veri sayılmaz.
- Formüller çalıştırılmaz. Varsa dosyada kayıtlı sonuç okunur; sonuç yoksa boş hücre kabul edilir. Excel hata hücreleri de Python gibi eksik değere dönüşür. Tarihler sayısal tüketim/fiyat olarak kabul edilmez; ürün adı alanındaki tarihlerin metin gösterimi referanslarla karşılaştırılmıştır.
- Bağlantılı hücrelerde yalnızca görünen metin okunur; bağlantı adresine istek yapılmaz.
- `readInventoryFile(bytes, filename)` dosyayı çözümler ve başlıkları doğrular. Hücre/ürün/sayı doğrulaması ortak `calculateAbc` çekirdeğindedir. `analyzeInventoryFile(file, targets)` bu iki adımı tarayıcının `File.arrayBuffer()` girişiyle birlikte uygular.
- Eksik/yinelenen başlıklar, boş/yinelenen ürünler, negatif/geçersiz/sonlu olmayan sayılar Türkçe mesajlarla reddedilir. Fazla sütunlar analize alınmaz. Okuyucu giriş sırasını korur; yıllık değere göre sıralama yalnızca hesaplama çekirdeğinde yapılır.

### Python ile bilinen beş dosya davranışı farkı

Bu farklar testlerde açıkça işaretlenmiştir; Python ile tam eşdeğerlik olarak raporlanmaz.

| Referans dosyası | Mevcut Python davranışı | Yeni okuyucunun davranışı |
|---|---|---|
| `csv-consistent-long-row.csv` | Sürekli fazla alanlı satırlarda ilk alanı örtük indeks yapabilir. | Sütunların sessizce kaymasını önlemek için dosyayı reddeder. |
| `csv-exact-duplicate-header.csv` | Birebir yinelenen başlığı `.1` gibi bir ekle yeniden adlandırır. | Yinelenen başlık hatası verir. |
| `csv-nul.csv` | Ürün metnindeki NUL karakterini bu örnekte kabul eder. | NUL karakterini açık hata mesajıyla reddeder. |
| `xlsx-exact-duplicate-header.xlsx` | Birebir yinelenen başlığı yeniden adlandırır. | Yinelenen başlık hatası verir. |
| `xlsx-leading-zero-code.xlsx` | Tamamen sayısal metinlerden oluşan ürün sütununda `001`/`002` değerlerini `1`/`2` olarak yorumlar. | Metin ürün kodlarındaki baştaki sıfırları korur. Hesaplanan parasal değer değişmez. |

### Sınırlar ve gizlilik

- Dosya boyutu: **20 MiB** (arayüz hata metninde 20 MB).
- XLSX merkezi ZIP dizininde bildirilen toplam açılmış boyut: en fazla **100 MiB**; en fazla 10.000 ZIP girdisi.
- Satır/sütun kontrolü: 100.000 satır, 1.000 sütun ve 1.000.000 hücre üst sınırları birlikte uygulanır. XLSX kontrolünde başlık satırı da sayılır; izin verilen veri satırı sayısı bu nedenle CSV ile bir satır farklı olabilir.
- ZIP64, çok parçalı veya şifreli ZIP girişleri desteklenmez. Bozuk, kesilmiş ve çalışma kitabı olmayan dosyalar güvenli Türkçe hatayla reddedilir. Parola çözme özelliği yoktur.
- Kullanıcı dosyaları yalnızca bellekte işlenir; sunucuya, analitik servise veya kalıcı tarayıcı deposuna gönderilmez/yazılmaz. ExcelJS yerel uygulama paketinden dinamik yüklenir; CDN kullanılmaz.
- Testlerde `fetch`, `XMLHttpRequest` ve `WebSocket` çağrıları engellenerek CSV, Excel ve bağlantılı hücre örnekleri işlendi; dış bağlantı çağrısı oluşmadı.
- Bu kontroller sınırsız büyüklükte veya tüm kötü niyetli dosyalarda bellek/zaman garantisi sağlamaz. ZIP boyutu kontrolü bildirilen merkezi dizin bilgisine dayanır; gerçek tarayıcı performansı ve ek kaynak sınırları ayrı kabul çalışması gerektirir.

### Son doğrulama — 19 Kasım 2026

| Kontrol | Sonuç |
|---|---|
| Mevcut hesaplama testleri | **148 başarılı, 0 başarısız** |
| Yeni dosya/gizlilik testleri | **86 başarılı, 0 başarısız** |
| Toplam | **234 başarılı, 0 başarısız** |
| TypeScript `tsc --noEmit` | Başarılı |
| Vite üretim derlemesi | Başarılı; paket boyutu uyarısı aşağıda açıklanmıştır |

Dosya testleri 75 Python referans örneğini, kaynak SHA-256 doğrulamasını ve 10 giriş/gizlilik/sınır kontrolünü içerir. Referansların 70'inde Python sonuçları veya hata mesajları karşılaştırılır; beşinde yukarıdaki bilinçli fark doğrulanır. Excel testleri Vite'ın seçtiği **ExcelJS tarayıcı dağıtımıyla**, Node test ortamında çalışır. Bu, gerçek tarayıcı veya telefon üzerinde yapılmış bir test değildir.

UTF-8/BOM/CP1254 ve üç ayraç; Türkçe karakterler; tırnaklar; boş/kısa/uzun satırlar; eksik/yinelenen başlıklar; sayı biçimleri; boş/negatif/geçersiz değerler; ilk Excel sayfası; kayıtlı/kayıtsız formüller; tarihler; bağlantılı hücreler; bozuk/kesilmiş dosyalar karşılaştırıldı. Gerçek parolalı Office dosyası sağlanmadı: şifreli ZIP bayrağı ve geçersiz OLE başlığıyla ret davranışı sınandı; gerçek şifreli çalışma kitabıyla doğrulama yapılmış sayılmaz.

Python referanslarını yeniden üretmek gerekirse mevcut Python ortamıyla bu klasörden aşağıdaki komut kullanılır; paket kurmaz ve yalnızca `vercel-app/` içindeki test verilerine yazar. Son doğrulamada referanslar yeniden üretilmedi; mevcut kayıtlar kullanıldı.

```sh
python -B scripts/generate_file_reference.py
```

### ExcelJS ve bağımlılık değerlendirmesi

ExcelJS **4.4.0**, **MIT** lisansıyla kurulu ve sürümü kilitlidir. CSV okuyucusu ek paket kullanmaz. React/React DOM ekran için; Vite/TypeScript/Vitest ve tip paketleri derleme/test için kullanılır. İncelenen doğrudan bağımlılıklar içinde güvenle kaldırılabilecek gereksiz bir paket bulunmadı.

ExcelJS tarayıcı çıktısı yaklaşık **940,37 kB**, gzip ile **271,39 kB** boyutundadır. 500 kB Vite uyarısı korunur; sınır yükseltilerek gizlenmedi. Paket ayrı bir dinamik parçadır; okuyucu ihtiyaç duyduğunda yüklenir. Derlemede dosya okuyucusu ayrı giriş olarak da doğrulanır; demo ekranı henüz dosya seçimi yapmaz.

Önceki kurulumdaki kullanımdan kaldırılma uyarıları şu geçişli bağımlılıklardan gelir: `inflight@1.0.6`, `lodash.isequal@4.5.0`, `rimraf@2.7.1`, `glob@7.2.3`, `fstream@1.0.12`, `uuid@8.3.2`. Yerel kilit dosyasında örneğin `ExcelJS → archiver → archiver-utils → glob → inflight`, `ExcelJS → unzipper → fstream → rimraf`, `fast-csv → @fast-csv/format → lodash.isequal` ve `ExcelJS → uuid` ilişkileri görüldü.

Bunlar doğrudan kullanılmasa da ExcelJS'in ilan ettiği bağımlılıklardır; elle silmek veya doğrulanmamış sürüm zorlaması uygulamak güvenli bir kaldırma değildir. Bu nedenle paketler ve kilit dosyası değiştirilmedi. Node'a yönelik alt paketlerin kurulu olması, hepsinin tarayıcı çıktısına eklendiği anlamına gelmez; Vite tarayıcı dağıtımını seçer. Önceden paketlenmiş ExcelJS içeriğindeki uyarılar, yalnızca üst düzey npm bağımlılığını değiştirerek giderilmiş sayılamaz.

Bu son doğrulamada internet, yeni paket kurulumu veya çevrim içi güvenlik taraması kullanılmadı; güncel güvenlik açığı bulunmadığı iddia edilmez. ExcelJS bakım/sürüm ve güvenlik değerlendirmesi, gerekiyorsa ayrı internet/kurulum onayıyla yapılmalıdır.

## Aşama 4 — Excel raporu ve boş şablon

### Rapor içeriği ve indirme

`createExcelReport(analysis)` mevcut ExcelJS 4.4.0 bağımlılığıyla rapor, `createExcelTemplate()` boş şablon üretir. Yeni paket kurulmadı. Demo ekranındaki iki düğme bu dosyaları tarayıcıda hazırlayıp yerel Blob bağlantısıyla indirir:

- `abc_stok_analiz_raporu.xlsx`: **ABC Analizi**, **Grup Özeti**, **Analiz Ayarları** sayfaları.
- `stok_sablonu.xlsx`: yalnızca **Stok Şablonu** sayfası ve `Ürün`, `Yıllık Tüketim`, `Birim Fiyat (TL)` başlıkları; örnek ürün satırı yoktur.

Rapor, filtrelenmemiş tam `Analysis` nesnesini alır. Ürün sayısı, toplam ve hesaplanan satırlar yeniden doğrulanır; grafik için kesilmiş ürün dizisi veya değiştirilmiş sonuçlar kabul edilmez. Grup özeti tam veriden hesaplanır; uygulanmış A/B/C hedefleri ayar sayfasında korunur. Boş analiz ve geçersiz hedefler Türkçe hata verir. Mevcut ABC çekirdeği değiştirilmedi.

Python raporundaki sütun sırası, metin/sayı türleri, A/B/C dolguları, başlık yazı tipi/rengi/hizası, dönüşümlü satır dolguları, sütun genişlikleri, 30 punto başlık yüksekliği, gizli kılavuz çizgileri, `A2` sabit başlık ve tüm kullanılan aralığı kapsayan otomatik filtreler korunur. Para biçimi `#,##0.00 "TL"`, pay biçimi `0.00"%"`, miktar biçimi `#,##0.##` şeklindedir. Paylar 0–100 sayılarıdır; Excel'in oranı 100 ile çarpan standart yüzde biçimine dönüştürülmez.

### Formül güvenliği ve gizlilik

Ürün adları ExcelJS'e formül nesnesi olarak değil, **metin hücresi** olarak yazılır. `=`, `+`, `-`, `@` ile başlayan adlar ve özgün kesme işaretleri test edildi. Başına ek kesme işareti konmaz; hesaplama çekirdeğinin mevcut baş/son boşluk temizliği dışında adlar değiştirilmez. Üretilen dosyalar openpyxl ile tekrar açılarak da ürün hücrelerinin `s` türünde olduğu doğrulandı.

Rapor/şablon üretimi dış bağlantı, dosya yükleme veya kalıcı depolama yapmaz. Bağlantı ve formül çalıştırılmaz. Ağ API'lerinin engellendiği üretim testleri geçti. Bu turda internet veya yeni paket kurulumu yapılmadı.

### Büyük analizler ve worker

Rapor hazırlığı ana arayüz iş parçacığı yerine **Web Worker** içinde yapılır. Son XLSX tamponu aktarılabilir mesajla ana iş parçacığına döner. İndirme sırasında düğmeler devre dışıdır; hata ve durum mesajları Türkçedir. İş bitince, hata alınca veya bileşen kaldırılınca worker sonlandırılır. 120 saniyelik zaman aşımı ve 100.000 ürün sınırı vardır. Worker desteği olmayan tarayıcıda ana iş parçacığına sessiz geçiş yapılmaz; anlaşılır hata gösterilir. Blob URL'si indirme başlatıldıktan sonra serbest bırakılır.

Bu yaklaşım sıfır gecikme/bellek garantisi değildir: analizin worker'a kopyalanması ve ExcelJS'in çalışma kitabını bellekte tutması kaynak tüketir. En büyük karşılaştırmalı rapor örneği 500 sentetik üründür; 100.000 ürün veya gerçek telefon üzerinde performans ölçümü yapılmadı.

### Karşılaştırmalı doğrulama — 19 Kasım 2026

| Kontrol | Sonuç |
|---|---|
| Önceki çekirdek ve dosya testleri | **234 başarılı, 0 başarısız** |
| Yeni rapor/şablon/indirme testleri | **32 başarılı, 0 başarısız** |
| Toplam | **266 başarılı, 0 başarısız** |
| TypeScript tip kontrolü | Başarılı |
| Vite üretim derlemesi | Başarılı; paket boyutu uyarısı devam ediyor |
| Bağımsız Python/openpyxl açma | **17/17 TypeScript dosyası doğrulandı** |

17 Python referansı demo, değişen/ondalıklı/sıfır hedefler, tam sınırlar, eşit değerler, sıfır stok, tek ürün, `= + - @` adları, kesirli miktarlar, çok küçük/subnormal değerler, büyük değerler, 500 ürün ve boş şablonu kapsar. Denetimler hücre değer/türleri, başlık sırası, grup özeti, hedefler, sayı biçimleri, dolgular, fontlar, hizalar, kenarlıklar, gerçek sütun genişlikleri, filtre ve sabitleme üzerindedir. Sayısal karşılaştırma `1e-13` göreli tolerans ve en küçük temsil edilebilir sayı tabanıyla yapılır; metin ve biçim özellikleri eşitlikle denetlenir.

Referans üretimi ve bağımsız doğrulama, mevcut Python ortamıyla bu klasörde çalıştırılabilir. Testlerin yazdığı `.tmp/report-validation/` dosyaları yalnızca sentetik veridir:

```sh
python -B scripts/report_reference.py
npm test
python -B scripts/report_reference.py --verify
```

`--verify`, TypeScript dosyalarını ExcelJS yerine openpyxl ile açar ve Python'un gerçek `create_excel` çıktılarından çıkarılan referanslarla karşılaştırır. Kaynak SHA-256 referanslarda saklanır. Hiçbir Python kaynak dosyasına yazılmaz.

### Bilinen biçim farkları ve kalan riskler

- XLSX arşivleri bayt düzeyinde aynı değildir: ZIP meta verileri, ortak metin kayıtları ve stil kimlikleri üreticiye göre değişebilir. ExcelJS eşit genişlikteki bitişik sütunları tek XML aralığına birleştirebilir; bağımsız doğrulayıcı bu aralıkların gerçek sütun genişliğini kontrol eder.
- Varsayılan font/stil 0 gibi eşdeğer özellikler ExcelJS'te açık hücre stili yerine varsayılan olarak temsil edilebilir. İncelenen özelliklerde kalan bir görsel biçim uyuşmazlığı bulunmadı; bütün Excel uygulamalarında piksel eşitliği iddia edilmez.
- Python ile aynı iki ondalıklı para/pay gösterimi korunur. Çok küçük değer hücrede sıfıra yuvarlanmış görünebilir; gerçek sayısal değer değiştirilmez. Excel ve JavaScript kayan nokta hassasiyeti/büyük sayı gösterimi sınırlamaları sürer.
- Rapor hedefleri mevcut TypeScript çekirdeğinin daha sıkı toplam doğrulamasını kullanır; Python `create_excel` fonksiyonunun daha gevşek `math.isclose` toleransına genişletilmez. Aşama 3'teki beş dosya okuma farkı da yukarıda korunmuştur.
- ExcelJS'in ayrı tarayıcı parçası yaklaşık 940 kB / 271 kB gzip boyutundadır. Vite, worker ve ana uygulamayı ayrı derlediğinden worker için de ayrı ExcelJS parçası üretir. Rapor indirmede worker sürümü, dosya okumada ana uygulama sürümü yüklenebilir; birlikte kullanıldığında indirilen/bellekte tutulan toplam boyut artabilir. Worker giriş parçası yaklaşık 33 kB'dir. Boyut uyarısı gizlenmedi.
- Önceki alt bağımlılık kullanımdan kaldırılma uyarıları geçerlidir. Paket/lock dosyası değiştirilmedi; güncel çevrim içi güvenlik açığı taraması yapılmadı.
- Aşama 4 kapanışındaki testler ExcelJS tarayıcı dağıtımı, worker mesaj işleyicisi ve taklit tarayıcı indirme/worker API'leriyle yapıldı. O aşamada gerçek tarayıcıda düğmeye basma veya gerçek Worker testi yapılmamıştı; Aşama 5'teki ek gerçek tarayıcı kontrolleri aşağıdadır. Excel/LibreOffice ve gerçek telefon açılış testi hâlâ yapılmadı; openpyxl bağımsız doğrulaması bunların yerine geçmez.

## Aşama 5 — React arayüzü, grafikler ve rehber

### Tamamlanan ekranlar ve iş akışları

- **Ortak uygulama kabuğu:** koyu lacivert tema, masaüstünde sabit yan menü, tablet/telefonda açılır gezinme, belirgin klavye odağı, içeriğe geç bağlantısı ve mobil menüde Escape/Tab yönetimi. Yazı tipleri sistemden alınır; uzak font, ikon veya CDN isteği yoktur.
- **Veri alanı:** `.csv`/`.xlsx` seçimi, sürükle-bırak, dosya adı, Türkçe durum/hata mesajları, kullanıcı isteğiyle demo, temizleme/iptal ve boş Excel şablonu. Hatalı yeni dosya önceki geçerli analizi silmez. Devam eden işlem temizlenirse geç sonucu uygulamaya geri yazılmaz.
- **Hedefler:** A/B/C için 0–100 tam sayı hedefleri, ayrı taslak/geçerli değerler ve toplam %100 kontrolü. Geçersiz toplam hesaplama başlatmaz. Başarılı uygulamada tam analiz mevcut çekirdekle yeniden hesaplanır; hedef ve gerçekleşen pay ayrı etiketlenir.
- **KPI:** toplam yıllık tüketim değeri, ürün sayısı, A gerçekleşen payı ve üç grubun ürün sayısı. Türkçe sayı/TL/yüzde gösterimi korunur; yalnızca gösterimde negatif sıfır `0,00` olarak normalleştirilir.
- **Pareto:** grup renkli sütunlar, mercan kümülatif çizgi, çift eksen, dinamik A/B ve B/C sınırları, ürün adı/grup/miktar/fiyat/değer/pay/kümülatif pay bilgi kutuları. Grup ve sıralama aralığı filtreleri, alan seçimi/tekerlek ile yakınlaştırma, kaydırma, eksen sıfırlama, kompakt görünüm ve PNG indirme vardır. Sıfırlama filtreleri değiştirmez. Küçük sıfır olmayan değerler bilgi kutusunda gerektiğinde bilimsel gösterimle korunur.
- **Dağılım:** halka dilimleri parasal değerleri, merkez tam ürün sayısını gösterir. Küçük dilim etiketleri gizlenebilse de bilgi kutusu ve grup tablosunda değerleri bulunur. Dağılım PNG olarak da indirilebilir.
- **Mühendislik özeti:** gerçek analizden en yüksek değerli ürün, ilk en fazla üç ürünün payı, A yoğunlaşması ve grup bazlı kontrol politikaları; sabit/rastgele sonuç veya yapay zekâ servisi kullanılmaz.
- **Sonuçlar:** Türkçe ürün tablosu ve grup özeti, renkli grup işaretleri, uzun ürün adlarında satır kırılması ve kontrollü yatay kaydırma. **Yeni özellik:** büyük tablolar 50 ürünlük sayfalarda gösterilir. Veri atılmaz; Excel raporu tüm ürünleri içerir.
- **Rehber:** Genel Bakış, Hesaplama Adımları, Çözümlü Örnekler ve Mühendislik Uygulamaları sekmeleri. Tanım, Pareto ilkesi, üç grup ve politikaları, beş hesaplama adımı/formüller, %80/15/5 ve %70/20/10 örnekleri, grafik okuma, beş uygulama alanı ve sınırlamalar taşındı. İki örnek de mevcut TypeScript çekirdeğiyle hesaplanır. Sekmeler ok/Home/End tuşlarıyla kullanılabilir.
- **İndirme:** önceki Excel motoru ve rapor worker'ı korunur. Üç sayfalı rapor tam analiz ve uygulanmış hedeflerle oluşturulur; Pareto seçimi, tablo sekmesi veya sayfalama raporu etkilemez. PNG boyutu 1440×800, ölçek 2; indirilen dosya 2880×1600 pikseldir.

### Veri durumu, performans ve gizlilik

Analiz ve kaynak tablo sayfaların üzerinde, yalnızca React belleğinde tutulur. `#analiz` / `#rehber` geçişinde veriler ve uygulanmış hedefler korunur; tarayıcı yenilenmesi/yeni sekme için kalıcılık vaadi yoktur. Kullanıcı izni olmadan localStorage, sessionStorage veya IndexedDB'ye dosya içeriği yazılmaz.

CSV/Excel okuma ve hedef değişikliğinden sonraki hesaplama ayrı **analysis worker** içinde yapılır. Dosya tamponu worker'a aktarılır; başarıyla çözümlenen kaynak tablo ve analiz belleğe döner. İş bitişi, iptal ve hata durumunda worker kapatılır; 120 saniyelik zaman aşımı vardır. Küçük demo doğrudan mevcut çekirdekle hesaplanır. Excel raporunun önceki worker akışı korunur. İşlemler dış sunucuya kullanıcı verisi göndermez.

Plotly yalnızca analiz grafikleri gerektiğinde dinamik yüklenir; ilk boş açılışta istenmediği gerçek tarayıcıda doğrulandı. ExcelJS de ihtiyaç halinde yüklenir. Tablolarda sayfalama DOM yükünü azaltır; grafikler görünür aralıktaki bütün ürünleri çizer, veriyi sessizce örneklemez. Bu yüzden dosya üst sınırındaki çok büyük SVG grafiklerin tümünü birden göstermek hâlâ ana iş parçacığında maliyetli olabilir; worker bunu ortadan kaldırmaz. Kullanıcı aralık/grup filtrelerini daraltabilir. 100.000 ürün grafiği için performans garantisi verilmez.

### Doğrulama sonuçları — 19 Kasım 2026

| Kontrol | Sonuç |
|---|---|
| Önceki çekirdek/dosya/rapor testleri | **266 başarılı, 0 başarısız** |
| Yeni React entegrasyon testleri | **17 başarılı, 0 başarısız** |
| Yeni grafik modeli testleri | **7 başarılı, 0 başarısız** |
| Toplam otomatik test | **290 başarılı, 0 başarısız** |
| TypeScript kontrolü | Başarılı |
| Vite üretim derlemesi | Başarılı; boyut uyarıları gizlenmedi |
| Önceki bağımsız openpyxl kontrolü | **17/17 rapor/şablon yeniden doğrulandı** |

React testleri ilk boş açılışı, demo/KPI'ları, CSV yükleme akışını, XLSX worker dönüşünü, hataları, sürükle-bırak, hedefler, filtrelerden bağımsız rapor girdisi, temizleme/iptal, PNG/şablon çağrıları, mobil gezinme, rehber klavye kullanımı ve sayfalamayı kapsar. Bu bileşen testlerinde worker ve Plotly çizimi taklit edilir; CSV okuyucu gerçek kullanılır, XLSX ayrıştırması mevcut 86 dosya testi ve aşağıdaki gerçek tarayıcı koşusunda ayrıca doğrulanır. PNG çağrı testi tek başına dosya indirildiği anlamına gelmez; indirme gerçek tarayıcıda da sınandı.

Gerçek tarayıcı kontrolü, onayla yüklü **Chrome 157** kullanılarak yalnızca localhost üzerinde, yeni ve ayrı bir profille yapıldı. Kişisel profil kullanılmadı; tarayıcı indirilmedi. Dış site istekleri engellendi. Masaüstü **1440×1000**, tablet **820×1180**, telefon **390×844** ve küçük telefon **360×800** ölçülerinde ekran görüntüleri ve taşma ölçümleri alındı. İlk açılış, KPI, Pareto, halka/yorumlar, tablolar, rapor, mobil menü ve rehberin dört sekmesi incelendi. Mobil bölüm başlangıcının sabit başlık altında kalması, uzayan politika rozetleri ve örnekler arasındaki boşluk düzeltildi.

Başarılı yerel tarayıcı koşusunda 38 kontrol bulunur: gerçek CSV/CP1254 ve XLSX yükleme, hatalı dosyada önceki analizin korunması, sürükle-bırak olayı, geçerli/geçersiz hedefler, sayfalar arası koruma, filtrelerin pay/KPI üzerindeki etkisizliği, gerçek fare alan seçimi/tekerlek zoom/kaydırma/sıfırlama, Türkçe hover, iki grafikte gerçek PNG indirme, gerçek rapor worker'ıyla Excel/şablon indirme, 500 ürün çizimi, üç dar ekran ölçüsünde gezinme/taşma, çok küçük değer ve zararlı görünümlü ürün adının metin olarak kalması. Sayfa çalışma zamanı hatası ve dış sayfa isteği görülmedi. Telefon kontrolleri masaüstü tarayıcı emülasyonudur; gerçek telefon veya Safari/Firefox testi değildir.

Son başarılı üretim koşusu `.tmp/ui-review/2026-11-19T17-17-50-712Z/` altında kayıtlıdır. Bu koşuda Chrome'un indirdiği gerçek Excel raporu ve şablon openpyxl ile ayrıca açıldı: rapor Pareto filtresinden bağımsız beş ürünü, 304.000 TL toplamı, üç sayfayı ve %80/%15/%5 ayarlarını içeriyor; şablonda yalnızca üç başlık var.

500 sentetik ürünün dosya seçimi sonrası analiz ve grafikte görünmesi yerel başarılı koşularda yaklaşık **0,18–0,22 saniye** olarak ölçüldü. Bu sıcak/küçük yerel ölçüm bir kıyaslama standardı veya diğer cihazlar için garanti değildir; daha büyük dosyalar, ilk kütüphane yüklemesi ve düşük güçlü cihazlar ayrıca ölçülmelidir.

Yerel ekran görüntüleri, sentetik indirmeler, ölçümler ve `review.json` kayıtları `.tmp/ui-review/` altında korunur. Bu dizin Git'e alınmaz; burada yayımlanmayan dosyalara kırık GitHub bağlantısı verilmez. Başarısız erken otomasyon kayıtları da silinmedi. `scripts/browser_review.mjs`, yalnızca önceden izin verilen yerel tarayıcıyla yeniden çalıştırılmalıdır; profili/indirmeleri proje içinde tutar ve çalıştırdığı tarayıcıyı kapatır.

### Paket boyutları ve teknik riskler

Onayla eklenen paketler: `plotly.js-basic-dist-min@3.7.0`, `@types/plotly.js@3.0.15`, `@testing-library/react@16.3.3`, `@testing-library/dom@10.4.2`, `jsdom@26.1.0`; kurulu paket meta verilerinde lisansları MIT olarak doğrulandı. İlk paket uygulama bağımlılığı, diğerleri geliştirme/test bağımlılığıdır. npm önbelleği ve geçici dosyalar yalnızca bu uygulamanın içindedir; kalıcı PATH veya sistem Node kurulumu yapılmadı.

| Üretim parçası | Yaklaşık boyut |
|---|---|
| Ana uygulama JS | 269 kB / **84 kB gzip** |
| Ortak veri/çekirdek parçası | 33 kB / **15 kB gzip** |
| CSS | 21 kB / **5,8 kB gzip** |
| Plotly temel dağıtımı (geç yüklenen) | 1.130 kB / **378 kB gzip** |
| ExcelJS (geç yüklenen) | 940 kB / **271 kB gzip** |
| Analiz worker giriş parçası | 37 kB |
| Rapor worker giriş parçası | 33 kB |

Vite'ın 500 kB parça uyarısı sürer. ExcelJS worker ve ana giriş için ayrı çıktılara sahip olabilir; bütün parçalar ilk açılışta indirilmez. Plotly temel dağıtımı yalnızca gereken sütun/çizgi/halka türlerini içerir; yine de küçük bir kütüphane değildir. Önceki ExcelJS alt bağımlılık uyarılarına ek olarak jsdom'un geliştirme bağımlılığı `whatwg-encoding@3.1.1` için kullanımdan kaldırılma uyarısı alındı. Bu uyarı üretim koduna jsdom eklendiği anlamına gelmez. Çevrim içi güvenlik açığı taraması yapılmadı; uyarılar kapatılmadı ve doğrulanmamış sürüm zorlaması uygulanmadı.

## Kalan kapsam ve sonraki aşama

Yerel React arayüzü mevcut hesaplama, dosya okuma ve rapor modülleriyle birleştirilmiştir. Önceki beş dosya davranışı farkı, Excel XML/biçim farklılıkları, çok küçük değerlerin iki ondalıklı KPI/Excel görünümünde yuvarlanması ve Unicode sürüm sınırları geçerlidir. JavaScript sayıları Python'ın int/float tür ayrımını taşımaz; burada belgelenen karşılaştırmalar bütün olası çalışma kitapları için tam eşdeğerlik garantisi değildir.

Unicode tabloları referans Python sürümüne bağlıdır; NFC normalleştirmesi tarayıcının Unicode uygulamasını kullanır. Hedef tarayıcılar ve farklı Unicode sürümleri için ilave uç durum testleri sonraki aşamada yapılmalıdır. Gelecekte Pandas/NumPy sürümü değişirse toplama davranışı referanslarla tekrar kontrol edilmelidir.

Sonraki olası çalışma: gerçek telefon/diğer tarayıcı kabul testleri, daha büyük veri ve bellek ölçümleri, izin verilirse güncel bağımlılık güvenlik değerlendirmesi ve ayrı bir aşamada dağıtım hazırlığı. Yayın ve Git işlemleri ayrıca onay gerektirir. Mevcut Streamlit dosyalarına müdahale edilmedi, GitHub bağlantısı/commit/push veya Vercel dağıtımı yapılmadı.
