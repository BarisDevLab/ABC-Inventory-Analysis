# Envanter Zekâsı güvenlik ve gizlilik denetimi

Denetim tarihi 27 Kasım 2026. Başlangıç noktası `main` dalındaki `c99c478` sürümü. Canlı sistemde yalnızca herkese açık statik yanıtlar ve HTTP başlıkları incelendi. Dosya, Worker, depolama ve tarayıcı kontrolleri yerel üretim derlemesinde örnek verilerle yürütüldü.

## Bulgular

| Önem | Bulgu | Durum |
| --- | --- | --- |
| Kritik | İncelenen kaynak, Git geçmişi, dağıtım dosyaları ve bağımlılıklarda kritik bulgu saptanmadı. | İncelenen kapsam için geçerli |
| Yüksek | GitHub API, `main` için koruma olmadığını ve uygulanabilir dal kuralı bulunmadığını bildirdi. Yazma yetkili bir hesabın inceleme ve CI şartı olmadan canlıya değişiklik gönderebilmesi tedarik zinciri riskidir. | Hesap yöneticisi kontrolü gerekli |
| Orta | XLSX ön doğrulaması, ZIP dizininin bildirilen sınırlarıyla okunan kayıtların tamamını karşılaştırmıyordu. | Dizin boyutu ve kayıt sayısı, yerel başlık tutarlılığı ve tekrar eden kayıt konumları doğrulanıyor. Sıkıştırılmış ve açılmış veri sınırları korundu. |
| Orta | Worker ve rapor sınırlarında beklenmeyen kütüphane hatalarının metni kullanıcı arayüzüne aktarılabiliyordu. | Uygulamanın güvenli doğrulama mesajları korunuyor. Beklenmeyen hata ayrıntıları yerine genel mesaj veriliyor. |
| Orta | Canlı sayfada diğer sitelerle açıcı pencere ilişkisini ve kaynakların siteler arası gömülmesini kısıtlayan başlıklar eksikti. | PR, COOP ve CORP için `same-origin` ekliyor. |
| Düşük | Geçmişi topluca temizlemek kayıtları siliyor, IndexedDB veritabanı kalıyordu. | Toplu silme veritabanını kaldırıyor. Listeleme boş veritabanı oluşturmuyor. Mühendislik formlarında otomatik doldurma kapatma isteği veriliyor. |
| Düşük | Canlı `/.vite/manifest.json` derleme girişlerini, kaynak yollarını ve paket grafiğini yayımlıyordu. İncelenen içerikte kimlik bilgisi saptanmadı. | Vercel dağıtım derlemesi manifesti çıkarmıyor. Yerel derlemede CI doğrulaması için manifest üretiliyor. Source map üretimi açıkça kapatıldı. |
| Düşük | Git yazar ve kaydeden meta verilerinde GitHub noreply biçimi dışında iki e-posta tanımlayıcısı var. Eski bir doküman sürümünde bir yerel yol eşleşmesi bulundu. | Değerler rapora alınmadı. Yerel yol güncel kaynakta ve taranan üretim JavaScript’inde görülmedi. Geçmiş korunuyor. |
| Düşük | npm taramasında geliştirme ağacında tek düşük önem düzeyli `elliptic` bildirimi ve ona bağlı dört paket kaydı bulundu. | Düzeltme yayımlanmamış. Etkilenen zincir tarayıcı ExcelJS paketinden çıkarılıyor ve derleme bunu denetliyor. [GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84) |

## Hassas veri ve dağıtım dosyaları

- Yerel dallar, uzak dallar, etiketler ve erişilebilir PR başları tarandı. Gitleaks v8.28.0, geçmiş değişiklikleri ve güncel kaynakları taradı. Ayrı bir meta veri taraması Git’te erişilebilir 28 commit’teki 413 benzersiz dosya nesnesini, commit mesajlarını, yazar ve kaydeden alanlarını ve XLSX içindeki metin/XML parçalarını kapsadı. Silinmiş ve artık Git referanslarından erişilemeyen nesneler, kişisel fork’lar ve hesap içi kayıtlar kapsam dışındadır.
- API anahtarı, erişim tokenı, parola, özel anahtar veya Git’te izlenen gerçek bir `.env` için bulgu çıkmadı. Kaynakta ortam değişkenine bağlı bir üretim servisi saptanmadı. Örnek çalışma kitaplarında üretici kütüphane adı, bağımlılık lisansı ve kilit dosyalarında üçüncü taraf iletişim bilgileri görüldü. Kişisel değerler, ham tarama çıktıları ve e-posta adresleri bu rapora alınmadı. Doğrulanmış bir erişim anahtarı sızıntısı bulunursa anahtar ilgili sağlayıcıda iptal edilmeli, yenilenmeli ve kullanım kayıtları incelenmeli.
- Canlı girişten erişilen 20 JavaScript paketi ve yerel dağıtım çıktısı tarandı. Hassas değer bulgusu veya source map referansı saptanmadı. Kontrol edilen 20 canlı `.map` adresi 404 döndü. `/api`, `/admin`, `/.env`, `/.git/config`, `/src/App.tsx` ve `/vercel.json` da 404 döndü. Manifestin kaldırılması dağıtım modunda yerel olarak doğrulandı ve PR yayımlanana kadar canlıdaki bulgu geçerlidir.

## Web güvenliği ve veri işleme

- Ürün, SKU, dosya ve sayfa adları arayüzde metin olarak işleniyor. Plotly’ye verilen etiketler ve bilgi kutularındaki ürün adları HTML için kaçışlanıyor. Dosyadaki Excel bağlantıları takip edilmiyor. Uygulama gezinmesi sabit, uygulama içi rotalarla çalışıyor. React, grafik ve indirme akışları kaynak ve tarayıcı düzeyinde incelendi.
- JSON paketleri boyut, sürüm, satır sayısı, sütun türleri ve sonlu sayılarla sınırlandırılıyor. Hedef alanlarının paketin kendi alanları olması doğrulanıyor. Paket içindeki hazır sonuçlar kullanılmıyor ve uygulama prototipleriyle birleştirme yapılmıyor. Sonuçlar girdilerden tekrar hesaplanıyor.
- Excel ve CSV için 20 MiB dosya, 100.000 satır, 1.000 sütun ve 1.000.000 hücre sınırları var. XLSX açılmış veri sınırı 100 MiB. Arşivde hem bildirilen hem akışta açılan boyut denetleniyor. Excel formülleri çalıştırılmıyor ve yalnızca varsa kaydedilmiş sonuç okunuyor. Dışa aktarılan ürün/SKU hücreleri metin. Dosya işlemleri aynı kaynak modül Worker’larında, aktarılabilir tamponlar ve zaman aşımıyla yürütülüyor. Tarayıcı ve XML ayrıştırıcısının bellek maliyeti sınırlar içinde de artabilir. Özellikle büyük dosyalarda düşük bellekli cihazlar için bu risk sürüyor.
- Canlı HTTPS yanıtında CSP, HSTS, MIME denetimi, referans bilgisi denetimi, izin politikası ve çerçeve engeli doğrulandı. Vercel iki yıllık HSTS uyguluyor. CSP ağ bağlantılarını, form gönderimini, çerçeve ve eklentileri engelliyor. Betikler ve Worker’lar aynı kaynakla sınırlı. Grafik için gerekli mevcut stil öznitelikleri korundu. PR’daki yeni COOP ve CORP başlıkları yerel üretim derlemesinde doğrulandı. COEP eklenmedi çünkü uygulama kaynaklarını sayfalar arası izolasyon modunda çalıştıran bir API kullanmıyor.

## Gizlilik doğrulaması

- Chromium 156 masaüstü incelemesinde 59 kontrol geçti. DevTools sayfa ile Worker’lardan gelen 218 HTTP isteği kaydetti. Her istek aynı kaynaktaki statik bir kaynağa gitti. Dosya veya analiz içeriği taşıyan istek gövdesi, yükleme yöntemi, sorgu dizgesi, harici kaynak isteği, CSP ihlali veya konsol hatası görülmedi. CSV/XLSX okuma, Excel/JSON/PNG indirme, karşılaştırma, senaryo ve geçmiş işlemleri örnek verilerle test edildi.
- Fontlar yerel sunuluyor. Kaynakta ve ölçülen trafikte üçüncü taraf reklam, izleme, analitik, harici font veya görsel servisi görülmedi. Vercel normal HTTPS isteği ve statik dosya erişim meta verilerini işletir. Platform tarafındaki log içeriği, erişim ve saklama ayarları hesap yetkisi gerektirir.
- Dosya okuma ve dışa aktarma sonrası otomatik geçmiş kaydı oluşmadı. Açık kaydetme, sayfa yenilemesinden sonra geri yükleme, toplu silme ve yenileme sonrası boş geçmiş doğrulandı. `localStorage` tema ve dil tercihlerine ayrılmış. Test profilinde oturum deposu, çerez, Cache Storage veya service worker kaydı görülmedi. Geçmiş veritabanını silmek indirilmiş dosyaları, cihaz yedeklerini veya işletim sistemi düzeyindeki geri kazanılabilir kopyaları etkilemez. Aynı tarayıcı profiline veya tarayıcı eklentilerine erişimi olan kişiler yerel verilere erişebilir.

## Bağımlılıklar, CI ve sürüm doğrulaması

- Çevrimiçi `npm audit` ve `npm audit --omit=dev` çalıştırıldı. Üretim bağımlılıklarında bulgu yok. Geliştirme zincirindeki düşük bulgu için uyumlu bir düzeltme bulunmadığı için sürüm zorlanmadı. ExcelJS ve UUID sabitlemeleri, npm kilit bütünlükleri ve Action commit sabitlemeleri korundu.
- GitHub Actions yalnızca `contents: read` kullanıyor, checkout kimlik bilgilerini saklamıyor ve PR denetimini `pull_request` ile çalıştırıyor. CI ve Vercel paket kurulumunda bağımlılık yaşam döngüsü betikleri devre dışı. Projenin kendi incelenen derleme adımları çalışmaya devam ediyor. Temiz kurulum bu seçenekle doğrulandı.
- 380 otomatik test, TypeScript, ESLint, Prettier, üretim ve Vercel dağıtım modu derlemeleri, derlenmiş Worker ve paket grafiği doğrulaması geçti. Regresyon testleri tutarsız ZIP meta verileri, beklenmeyen hata ayrıntılarının gizlenmesi, cross-origin başlıkları ve tarayıcı geçmişinin kalıcı olarak silinmesini kapsıyor. Vite’ın mevcut paket boyutu uyarıları sürüyor.

## Hesap yöneticisi kontrol listesi

- [ ] GitHub’da `main` için zorunlu PR incelemesi ve başarılı CI şartı ekleyin. Zorla gönderme ve dal silmeyi kapatın. Ruleset atlama yetkilerini sınırlayın.
- [ ] GitHub’da varsayılan Actions izinlerini, dış katkı onaylarını, izinli Action listesini, secret scanning ve push protection durumunu doğrulayın. Hesap düzeyi Actions API’si bu oturumda 403 döndü.
- [ ] GitHub yazma yetkilerini, uygulama kurulumlarını, bot erişimlerini ve 2FA durumunu kontrol edin. Yeni commit’lerde kişisel e-posta yerine GitHub noreply adresi kullanın.
- [ ] Vercel’de Production, Preview ve Development ortam değişkenlerini ve entegrasyonları denetleyin. Bu statik uygulamanın ihtiyaç duymadığı değişkenleri kaldırın. Hassas değişkenlerin istemciye açılmadığını, Preview erişim korumasını ve yönetim üyeliklerini doğrulayın.
- [ ] Vercel Analytics, Speed Insights, Toolbar, log drain, saklama süresi ve erişim yetkilerini panelden doğrulayın. Test edilen canlı JavaScript’te ve yerel tarayıcı akışında veri gönderimi görülmedi. Vercel proje ve ekip panellerinin iç ayarlarına bu denetimde erişilemedi.
