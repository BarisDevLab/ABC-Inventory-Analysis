# Yerel doğrulama raporu

Tarih: 14 Kasım 2026

Güncel durum: **v2.3 — 44 otomatik test geçti; 38 gerçek Chrome ekran görüntüsü incelendi.** En son hedefli revizyonun ayrıntıları bu dosyanın son bölümündedir. Önceki bölümlerdeki test sayıları ilgili turun tarihsel kaydıdır.

## Çalıştırma

```powershell
python -m unittest test_app -v
python -m compileall -q app.py abc_core.py abc_charts.py ui.py pages test_app.py
```

Testler internete bağlanmadan, paket yüklemeden çalıştırıldı. Ortamda Streamlit 1.67.0, pandas 3.1.1 ve Plotly 7.1.0 mevcut. Plotly üst sürüm sınırı kurulu ve test edilen 7.x sürümünü de kapsayacak şekilde güncellendi; paket kurulmadı.

## Kapsam

- 44 otomatik test; önceki 40 test korunmuş, hedefli rehber/grafik revizyonunda 4 yeni test eklenmiştir. Bazı testler çok sayıda alt senaryo içerir.
- Referans veri: toplam 304.000 TL; varsayılan sınıflar A, A, A, B, C.
- Tam %80 ve %95 sınırları; sıfır hedefler; sıfır değerli ürün; geçersiz hedefler.
- Boş tablo, eksik başlık, yinelenen başlık, boş hücre, metin içeren sayısal alan, negatif miktar/fiyat, sonsuz sayı ve hesaplama taşması.
- Büyük/küçük harf ve Türkçe karakter içeren tekrar eden ürün adları.
- UTF-8 ve Windows Türkçe CSV; virgül, noktalı virgül ve sekme ayraçları.
- CSV ve Excel üzerinden boş, tekrar eden, negatif, eksik sütunlu ve hatalı sayısal veriler.
- Bozuk Excel, boş dosya, desteklenmeyen uzantı ve tutarsız CSV satırları.
- Boş Excel şablonu; rapor sayfaları, başlık biçimi, sabit başlık satırı, otomatik filtre ve grup toplamları.
- Formül gibi başlayan ürün adlarının Excel'e metin olarak aktarılması.
- Pareto veri dizileri, hedef çizgileri, tek ürün, sıfır değerli filtre sonucu, Türkçe bilgi kutuları ve PNG yapılandırması.
- ABC dağılımı, Türkçe yüzde biçimi ve toplam değeri.
- Streamlit açılışı, örnek veri, geçerli/geçersiz hedef güncelleme, rehbere gidiş ve dönüş, verinin/hedeflerin korunması.
- Boş grup seçimi, ürün aralığı, kaydırma modu, görünümü sıfırlama ve oturum verisini temizleme.
- Özel veri kümesinden en değerli ürün, ilk üç ürün payı, A gerçekleşen payı ve grup sayılarının doğrulanması; tek ürün ve A grubunun boş olduğu durum.
- 500 ürünlü grafikte verinin korunması ve seyreltilmiş/kısaltılmış etiketler; ürün adlarındaki HTML karakterlerinin kaçırılması.
- Yeni A/B/C renkleri, Türkçe para biçimi, tek üründe de görünür eşik çizgileri ve ayrı PNG dosya adları.
- Küçük halka dilimlerinde etiketin gizlenmesi, ayrıntıların bilgi kutusunda korunması ve merkezde toplam ürün sayısı.
- Rehberin dört sekmesi, formüller, rehberden hedef değiştirme ve Excel dosyasının sayfa geçişlerinde bayt düzeyinde korunması.

## Sınırlar

Streamlit AppTest uygulamanın bileşenlerini ve oturum akışını denetler. Son turda ayrıca kullanıcının açık izniyle yüklü Chrome kullanılarak gerçek tarayıcı ekran görüntüleri incelendi. Masaüstü 1440×1000 ve mobil emülasyon 390×844 doğrulandı; ayrıntılar aşağıdaki **Gerçek tarayıcı incelemesi** bölümündedir. Önceki turlardaki tarayıcı testi yapılmadığına ilişkin kayıtlar tarihsel durumdur.

Bu kontrol gerçek telefon donanımı, Edge/Firefox/Safari, bütün ekran genişlikleri, işletim sisteminin dosya seçme penceresi veya kapsamlı erişilebilirlik denetimi yerine geçmez. Fare tekerleği ve gerçek dokunmatik yakınlaştırma ayrıca denenmedi. Grafik üzerinde fareyle alan seçimi, kaydırma, sıfırlama ve PNG indirme gerçek Chrome oturumunda denendi.

Uygulamanın metinleri Türkçedir. Plotly araç çubuğu için yerel Türkçe sözlük sağlanmıştır. Streamlit'in yerleşik dosya yükleyicisindeki “Upload”, boyut/uzantı açıklamaları, veri tablosu menüleri ve bazı Plotly indirme bildirimleri İngilizce kalabilir. İşletim sisteminin dosya seçme/kaydetme pencereleri de uygulamanın denetiminde değildir. Bu metinler kırılgan CSS ile gizlenmedi.

Veriler aynı Streamlit oturumunda sayfa geçişlerinde korunur. Tarayıcı yenilemesiyle yeni oturum oluşması, sunucunun yeniden başlaması veya başka bir tarayıcıda açılması kalıcı saklama sağlamaz.

## Koruma

Değişiklik öncesi mevcut dosyalar `backups/before_modernization_20261114/` altında saklandı. Git geçmişi, `main.py`, `app_v05.py` ve mevcut PNG korunmuştur. Dosya silme, commit, push veya canlı site güncellemesi yapılmadı. `modernize.py` ve `polish.py` tek seferlik dönüşüm kayıtlarıdır; uygulamayı başlatmak için çalıştırılmamalıdır.

UI/UX yenilemesi öncesindeki dokuz dosyanın ayrı yedeği `backups/before_ui_redesign_20261114/` altındadır; ilk yedekler değiştirilmemiştir.

## UI/UX yenilemesi · v2.1

Değişen dosyalar: `app.py`, `ui.py`, `abc_charts.py`, `abc_core.py`, `pages/1_ABC_Rehberi.py`, `.streamlit/config.toml`, `test_app.py`, `README.md`, `TEST_SONUCLARI.md`.

- Verilen palete dayalı ortak tema, kompakt gradient üst bölüm ve özellik etiketleri.
- Birleşik dosya yükleme kartı, belirgin Excel şablonu, isteğe bağlı örnek veri ve temizleme.
- İki satırda altı gerçek KPI: toplam yıllık değer, ürün sayısı, A gerçekleşen payı ve üç grubun ürün sayıları.
- Tek Pareto kontrol alanı, Türkçe bilgi kutuları, seyreltilmiş etiketler ve grafik altında veriden türeyen yorumlar.
- Merkezinde ürün sayısı olan halka grafik ve tam yüzdeleri gösteren karşılaştırma tablosu.
- Tüm eğitim içeriğini koruyan dört sekmeli rehber; üç grup kartı, beş hesaplama adımı, iki örnek, beş mühendislik uygulama kartı ve sınırlamalar.
- İki sayfada da ortak hedef kontrolleri, geçerli sınırlar, veri durumu ve sürüm bilgisi.

ABC sınıflandırma algoritması, dosya doğrulaması ve Excel üretimi korunmuştur. `abc_core.py` içindeki değişiklikler ortak grup renkleri ve analizden yorum göstergeleri türeten yeni yardımcı işlevle sınırlıdır.

## Import hatası incelemesi ve açılış doğrulaması

`analysis_insights` mevcut `abc_core.py` içinde doğru adla, modül seviyesinde tanımlıdır. Yeni Python sürecinde `app.py`, `abc_core.py`, `abc_charts.py`, `ui.py` ve rehberin bütün yerel `from ... import ...` ifadeleri doğrulandı; modüllerin bu proje klasöründen yüklendiği kontrol edildi. Yeni süreçte bildirilen hata tekrarlanmadı. Kullanıcının hatayı gördüğü sürecin kesin durumu belirlenmedi; eski modülün bellekte kalması olası bir açıklamadır.

Streamlit bir sayfayı yeniden çalıştırırken yardımcı Python modülleri bellekte kalabilir. `app.py` artık bellekteki `abc_core` modülünde `analysis_insights` yoksa modülü diskten yeniden yükler ve ardından normal importlarını yapar. Otomatik analiz kaldırılmadı, başka yere kopyalanmadı ve import hatasını gizleyen boş bir sonuç kullanılmadı. Arayüz ve hesaplama işlevleri değiştirilmedi.

Eklenen iki test:

1. Temiz alt süreçte tüm yerel import sözleşmeleri, örnek veri hesabı, otomatik analiz ve iki Streamlit sayfasının birlikte yüklenmesi.
2. Bellekteki modülden `analysis_insights` kaldırılarak aynı `ImportError` durumunun oluşturulması; uygulamanın modülü yenileyerek açılması ve örnek veriyle otomatik analizin çalışması.

Sonuç: **37 test geçti**. Sözdizimi denetimi de geçti.

Gerçek sunucu şu komutla başlatıldı:

```powershell
python -m streamlit run app.py --server.headless true --server.address 127.0.0.1 --server.port 58678 --browser.gatherUsageStats false
```

`8503` kullanılamadığı için işletim sisteminden alınan boş yerel port kullanıldı; başka bir sunucu durdurulmadı.

- `http://127.0.0.1:58678/`: HTTP 200, HTML yanıtı.
- `http://127.0.0.1:58678/_stcore/health`: HTTP 200, `ok`.
- Gerçek sunucuya WebSocket oturumu açılıp ana sayfanın çalıştırılması istendi. 48 arayüz iletisi alındı; sayfa başlığı görüldü ve betik `script_finished` ile tamamlandı. Streamlit istisna bileşeni oluşmadı. Bu kontrol yalnızca boş HTML kabuğunun servis edildiğini değil, uygulama betiğinin de çalıştığını doğrular.

Bu bir görsel tarayıcı testi değildir; mobil yerleşim ve fiziksel PNG indirme hakkındaki önceki sınırlar devam eder. Yalnızca yerel HTTP/WebSocket kullanıldı; internete erişilmedi, paket yüklenmedi.

Bu turda değiştirilen dosyalar: `app.py`, `test_app.py`, `TEST_SONUCLARI.md`. Önceki sürümleri `backups/before_import_fix_20261114/` altında saklandı. Git commit/push veya canlı site güncellemesi yapılmadı.

## Kapsamlı görsel revizyon · v2.2

Bu bölüm en son revizyonun durumudur; yukarıdaki bölümler önceki turların kayıtlarını da içerir.

- Tasarım kuralları `assets/theme.css` içinde merkezileştirildi. Giriş, ana analiz, otomatik yorum, tablo ve dışa aktarma yüzeyleri farklı görsel roller kullanır. Tek tip kutu ve her yerde aynı gradient kaldırıldı.
- Üst bölüm kompakt, kutusuz bir başlık; dosya yükleme alanı hemen altındadır. Kontroller yerel Streamlit bileşenleridir.
- Ana panelde standart `st.metric` yerine altı özel HTML kartı kullanılır. SVG ikonlar, açıklayıcı etiketler, ikincil bilgiler ve gerçek grup paylarını gösteren çubuklar bulunur. Büyük ekran, orta ekran ve mobil için CSS ızgarası tanımlıdır.
- HTML yalnızca `st.html` ile gönderilir. Kart metinleri/öznitelikleri kaçırılır; JavaScript etkinleştirilmez. Yeni test kötü amaçlı etiketlerin metin olarak kalmasını denetler. Markdown içine HTML yerleştirilmez.
- Pareto filtreleri tek kontrol çubuğundadır. Çizim yüksekliği, kenar boşlukları, açıklama düzeni, etiket sıklığı ve işaretçi yoğunluğu yenilendi. Grafik başına en fazla altı ürün etiketi kullanılır; tam adlar bilgi kutusunda kalır.
- Halka grafik ve grup karşılaştırması tek geniş bölümde yan yanadır. Mühendislik politikaları ayrı, ikonlu kısa bilgi bloklarıdır. Gerçek veriden otomatik yorumlar korunmuştur.
- Rehberin ilk iki açıklaması tam genişlikte, üst üste makale bölümleridir. Üç grup kartı tek duyarlı ızgaradadır. Formül panelleri, iki örnek, beş mühendislik alanı ve sınırlamalar korunur; dört sekme devam eder.
- Ana panelin sonuç tabloları ve ikinci eğitim örneği ortak grup renklerini kullanır. Excel üretimi ve ABC hesaplama algoritması değiştirilmemiştir.
- Açık Streamlit sürecinde eski tasarım modüllerinin kalmaması için `ui` ve grafik modülleri sayfa başlangıcında yeniden yüklenir. Önceki `analysis_insights` import düzeltmesi korunmuştur.

Önceki **37 testin işlevsel kapsamı korunmuştur**. `st.metric` değerlerine bakan kontroller artık kartların `data-kpi`/`data-value` özniteliklerini gerçek bileşen çıktısından okur. Testler kaldırılmamış veya beklenen hesaplama sonuçları değiştirilmemiştir. İki yeni test: HTML metin/öznitelik kaçırma ve tüm KPI/grafik/tablo/rehber bileşenlerinin birlikte yüklenmesi. Sonuç: **39 test geçti**.

Değiştirilen dosyalar: `app.py`, `ui.py`, `abc_charts.py`, `pages/1_ABC_Rehberi.py`, `.streamlit/config.toml`, `test_app.py`, `README.md`, `TEST_SONUCLARI.md`. Eklenen dosya: `assets/theme.css`. Önceki sekiz dosya `backups/before_visual_revision_20261114/` altında korunur. Hesaplama modülü `abc_core.py` bu turda değiştirilmemiştir.

Ek kontroller:

- Rehberin revizyon öncesi sürümündeki 26 açıklama/formül metni normalize edilerek yeni kaynakla karşılaştırıldı; eksik metin bulunmadı.
- Yerel Streamlit sunucusu `http://127.0.0.1:58678/` ve sağlık uç noktası HTTP 200 döndürdü.
- Gerçek WebSocket oturumunda önce veri yüklenmemiş ekran çalıştırıldı; örnek veri düğmesi tetiklendikten sonra altı özel KPI, 304.000,00 TL sonucu ve iki Plotly grafik hatasız üretildi.
- Bu kontroller HTML/CSS'nin tarayıcıda görsel olarak doğru yerleştiğini kanıtlamaz. Proje dışındaki kurulu tarayıcıya erişim için ayrıca izin istendi; izin olmadan tarayıcı aranmadı veya çalıştırılmadı. Masaüstü/mobil ekran görüntüleri, gerçek font/kontrast görünümü, taşmalar ve fiziksel PNG indirme henüz görsel olarak doğrulanmadı.

## Gerçek tarayıcı incelemesi · izin sonrası son durum

Kullanıcı yalnızca yüklü Edge/Chrome ile localhost testi için açık izin verdi. Yüklü Chrome, yeni ve tek kullanımlık `artifacts/visual-review/temporary-profile-*` profilleriyle çalıştırıldı. Kişisel tarayıcı profili, geçmiş veya kayıtlı hesaplar kullanılmadı. Tüm ekran görüntüleri ve indirilen PNG proje içinde tutuldu. Dış adresler kapalı yerel proxy/DNS kurallarıyla engellendi; sayfa isteklerine de yalnızca localhost/veri görselleri için izin verildi. Paket yüklenmedi, internet veya Git işlemi yapılmadı. Test tarayıcı oturumları kapatıldı; dosya silinmedi.

### Görülüp düzeltilen sorunlar

1. Mobilde `expanded` sol menü uygulamayı örtüyordu. Her iki sayfada `initial_sidebar_state="auto"` kullanılarak mobil başlangıç kapalı, masaüstü başlangıç açık hâle getirildi.
2. Sabit Streamlit üst çubuğu üst başlıkları/kontrol alanlarını örtüyordu. Başlangıç boşluğu ve bölüm/grafik kaydırma payları düzeltildi.
3. `st.html` temizleyicisi satır içi SVG simgelerini kaldırıyordu. Güvenilir sabit SVG'ler yerel `data:image/svg+xml` görselleri olarak sunuldu. Son DOM denetiminde simgeler yüklü ve görünür.
4. Rehberde Streamlit'in daha güçlü stil kuralları bazı başlıkları fazla büyütüyordu. Gerçek başlık bileşenine yönelik boyut kuralları eklendi.
5. Mobil Pareto açıklamaları araç çubuğuyla çakışıyordu; tam para etiketleri çizimi daraltıyordu. Mobil tarayıcıda otomatik seçilen, kullanıcı tarafından da açılıp kapatılabilen **Kompakt grafik** eklendi. Açıklamalar altta, parasal eksen `Bin TL`; veri dizileri ve bilgi kutularındaki tam değerler korunur.
6. Grafik araç simgelerinin koyu zemindeki kontrastı artırıldı; bildirim yüzeyi ortak temaya uyarlandı.

### Sonuç ve kanıtlar

- **40 otomatik test geçti**, Python sözdizimi denetimi geçti. Yeni test kompakt grafiğin değerleri ve tam bilgi kutularını değiştirmediğini doğrular.
- **21 ekran görüntüsü**: boş/dolu ana sayfa, KPI, Pareto, halka/karşılaştırma, tablolar/rapor, grup kartları ve rehberin dört sekmesi; hem masaüstü hem mobil emülasyon.
- İncelenen kart/grafik/tablo kapsayıcılarında sayfa dışına yatay taşma görülmedi. Geniş veri tabloları mobilde kendi içinde yatay kaydırılır.
- CDP kaydında yakalanmamış JavaScript istisnası: **0**. Sayfadan dış alan adına istek: **0**.
- Yükleme alanının üstü masaüstünde yaklaşık 354 px, mobilde 382 px; her iki görünümde ilk ekrandan dosya seçilebilir.
- Gerçek fareyle yakınlaştırmada x aralığı `[-0.6, 4.6]` → yaklaşık `[0.435, 1.997]`; kaydırmada yaklaşık `[-2.162, 3.038]`; sıfırlama başlangıç aralığına döndürdü. Sayısal kayıt: [interactions.json](artifacts/visual-review/interactions.json).
- Kamera düğmesinden indirilen [PNG](artifacts/visual-review/downloads/abc_pareto_analizi.png) dosyası okunup doğrulandı: **2880×1600**, geçerli PNG.

Örnek görüntüler:

- [Masaüstü ana panel](artifacts/visual-review/02-desktop-loaded.png)
- [Masaüstü Pareto](artifacts/visual-review/03-desktop-pareto.png)
- [Mobil başlangıç](artifacts/visual-review/10-mobile-empty.png)
- [Mobil kompakt Pareto](artifacts/visual-review/13b-mobile-pareto-plot.png)
- [Rehber grup kartları](artifacts/visual-review/09b-desktop-group-cards.png)

Önceki ekran görüntüleri `artifacts/visual-review/before/` altında; son ölçümler [audit.json](artifacts/visual-review/audit.json) dosyasında. Görsel testin tekrar çalıştırılabilir kaydı `browser_check.py` içindedir; harici tarayıcı çalıştırdığı için kullanıcının verdiği izin kapsamına tabidir.

Bu turda değişen uygulama dosyaları: `app.py`, `ui.py`, `abc_charts.py`, `assets/theme.css`, `pages/1_ABC_Rehberi.py`, `test_app.py`. Belgeler güncellendi; `browser_check.py` ve proje içi test çıktıları eklendi. Önceki uygulama/belge dosyaları `backups/before_browser_fixes_20261114/` ve önceki revizyon yedeklerinde korunur. ABC hesaplamaları ve Excel raporlama değiştirilmedi.

## Hedefli rehber ve Pareto revizyonu · v2.3

### Değiştirilen dosyalar

- `ui.py`: numara etiketiyle bağımsız başlığı birleştiren yerel `guide_heading` bileşeni ve sürüm bilgisi.
- `assets/theme.css`: çerçeveli rehber panelleri, role göre renk vurguları, sekmeler, formül kutuları, bilgi notları ve kontrol hizalaması.
- `pages/1_ABC_Rehberi.py`: native `st.container(border=True)` panelleri, dört sekmenin sunumu, özetler, formül/örnek/uygulama alanları.
- `abc_charts.py`: yalnızca Pareto sunumu, bilgi kutuları, etiketler ve sayısal eksen biçimlendirmesi.
- `app.py`: yalnızca grafik başlığı, kontrol panelinin yerleşimi ve grafik altı açıklamanın sunumu.
- `test_app.py`: dört yeni regresyon testi; önceki 40 test korunmuştur.
- `browser_check.py`: gerçek CSV yükleme, yerel tarayıcıda filtre/tooltip/klavye kontrolleri ve yeni ekran görüntüleri.
- `README.md`, `TEST_SONUCLARI.md`: çalıştırma ve doğrulama kayıtları.

Önceki dosyalar `backups/before_targeted_revision_20261114/` altında saklandı. Önceki turların yedekleri ve ekran görüntüleri değiştirilmedi. Yeni tarayıcı çıktıları `artifacts/targeted-review/` altındadır.

### Rehberde yapılanlar

İlk iki konu ayrı, tam genişlikte, çerçeveli panellerdir. Numara başlıktan ayrılıp küçük renkli etikete taşındı; başlıklar **ABC Analizi Nedir?** ve **Pareto İlkesi** oldu. Başlıklar 24 px ve güçlü ağırlıktadır. Bilgilendirme paneli mavi, Pareto/hesaplama paneli mor, çözümlü örnek turkuaz, sınırlamalar amber vurgu kullanır. Metin genişliği yaklaşık 86 karakter birimiyle sınırlanır; paragraflar ve özetler korunur. Paneller arasında yaklaşık 22 px boşluk vardır.

Dört sekme 15 px yarı kalın yazı, yaklaşık 51,5 px masaüstü yüksekliği, yuvarlatılmış çerçeve, mavi-mor aktif yüzey ve görünür odak kullanır. Mobilde yatay sekme kaydırması ve tam etiketler korunur. Klavyede sağ okla **Hesaplama Adımları** sekmesine geçiş denendi; odak çizgisi `2px solid rgb(34,211,238)` olarak doğrulandı. Kayıt: [tabs.json](artifacts/targeted-review/tabs.json).

Formüller mor çerçeveli KaTeX kutularında, adımlar yerel açılır panellerde sunulur. İki çözümlü örnek, beş ikonlu mühendislik paneli ve amber sınırlama paneli korunmuştur. Eski 26 açıklama/formül metni normalize edilerek yeni kaynakla karşılaştırıldı; eksik içerik bulunmadı.

### Pareto ve çevresi

- A/B/C renkleri `#4F8CFF` / `#F59E0B` / `#22D3EE`; kümülatif çizgi `#FB7185`, yüzey `#0D1B2E`, ızgara `#263B54`.
- Sağ eksen 0–100; eşik çizgileri ince ve kesiklidir. Açıklamalar normal görünümde üstte, kompakt görünümde alttadır. Araç çubuğu için ayrılmış boşluk vardır.
- 7 üründe bütün etiketler; çok sayıda üründe seyreltilmiş/kısaltılmış etiketler kullanılır. Ürünlerin tamamı grafikte kalır; uzun adlar bilgi kutusunda eksiksizdir.
- Hem sütun hem çizgi bilgi kutusu ürün adı, ABC grubu, tüketim miktarı, birim fiyat, yıllık değer, değer payı ve kümülatif payı gösterir. Türkçe sayı biçimi kullanılır.
- Küçük değerler normal grafikte bilimsel gösterimle, kompakt grafikte gerektiğinde `×10ⁿ TL` ekseniyle sunulur. Bilgi kutusunda sıfır olmayan çok küçük değerler `0,00` olarak kaybolmaz. Bu, gösterim ölçeğidir; veri dizileri değiştirilmez.
- Grup ve sıra aralığı filtreleri üst sırada, hareket/kompakt/sıfırlama araçları alt sırada aynı kontrol panelindedir. Grafik altı filtre notu, kullanım rehberi ve otomatik analiz ayrı yüzeylerdir.

### Testler ve gerçek Chrome kontrolü

**44 testin tamamı geçti.** Dört yeni test: başlık/sekme/özetlerin birlikte yüklenmesi; yedi bilgi alanı ve renk/yüzde ekseni; küçük sayılarda doğru ölçek ve bilgi kutusu; 7 ve 60 üründe tüm verinin korunması. Temiz alt süreçte import ve Streamlit açılış testleri de geçti. Python sözdizimi kontrolü temizdir.

Kullanıcının önceki açık tarayıcı izni kapsamında, kişisel profilden bağımsız yeni Chrome profiliyle yalnızca localhost test edildi. Dış ağ engelleri korundu; paket yüklenmedi. Masaüstü **1440×1000**, mobil emülasyon **390×844** kullanıldı. Dört rehber sekmesi, ikinci örneğin açık hâli, uygulama/uyarı panelleri, tooltip ve grafikler ekran görüntülerinden incelendi.

**38 ekran görüntüsü** üretildi. Son kayıtta yakalanmamış JavaScript istisnası **0**; incelenen panel/kart/grafik/tablo kapsayıcılarında sayfa dışına yatay taşma **0**. Mobilde geniş veri tabloları kendi içinde yatay kaydırılır.

7 ürünlü, uzun adlar içeren 60 ürünlü ve 2×10⁻¹⁰ TL düzeyindeki küçük değerli CSV'ler gerçek dosya yükleme bileşeninden yüklendi; her biri hem masaüstünde hem mobilde incelendi. Test dosyaları `artifacts/targeted-review/fixtures/` içindedir ve kullanıcı verisi içermez.

Gerçek fareyle yakınlaştırma, kaydırma, sıfırlama ve kamera düğmesinden PNG indirme tekrar doğrulandı. PNG **2880×1600** boyutunda geçerli bir dosyadır. A grubu gerçek kaldırma düğmesinden filtrelendiğinde kalan kümülatif paylar yaklaşık **%96,71** ve **%100** kaldı; yeniden normalize edilmedi. Kayıtlar: [interactions.json](artifacts/targeted-review/interactions.json), [filter.json](artifacts/targeted-review/filter.json), [audit.json](artifacts/targeted-review/audit.json).

Örnek görüntüler:

- [Rehber panelleri ve belirgin sekmeler](artifacts/targeted-review/06-desktop-guide-1.png)
- [Klavye odağı ve formül kutusu](artifacts/targeted-review/06c-desktop-keyboard-focus.png)
- [Yedi alanlı bilgi kutusu](artifacts/targeted-review/03a-desktop-tooltip.png)
- [60 ürünlü masaüstü Pareto](artifacts/targeted-review/20-desktop-sixty.png)
- [60 ürünlü mobil Pareto](artifacts/targeted-review/21-mobile-sixty.png)
- [Küçük değerli mobil Pareto](artifacts/targeted-review/21-mobile-tiny.png)

### Korunanlar ve kalan sınırlar

`abc_core.py` ve bağımlılık dosyası SHA-256 karşılaştırmasında değişmemiştir. `app.py` yükleme/saklama bloğu ve `ui.py` hedef/oturum menüsü AST karşılaştırmasında aynıdır. ABC algoritması, doğrulama, Excel üretimi, kaydedilmiş hedefler ve sayfalar arası veri koruma değiştirilmemiştir.

Gerçek telefon donanımı ve Chrome dışındaki tarayıcılar denenmedi; bütün ekran genişlikleri için garanti verilmez. Yerleşik yükleyici/tablo menüleri ve bazı Plotly bildirimleri İngilizce kalabilir. KPI ve Excel'in mevcut iki ondalıklı para gösterimi korunduğundan çok küçük tutarlar oralarda yuvarlanabilir; bu revizyondaki hassas gösterim düzeltmesi grafikleri kapsar. Bu turda kalan bir import hatası, grafik çakışması veya ölçülen kapsayıcı taşması bulunmadı.

Git işlemi, commit/push, canlı site güncellemesi, dosya silme veya paket kurulumu yapılmadı. Kişisel tarayıcı profili kullanılmadı; test tarayıcı oturumu kapatıldı.
