# Envanter Zekâsı güvenlik ve gizlilik denetimi

Denetim tarihi 27 Kasım 2026. Başlangıç noktası `main` dalındaki `c99c478` sürümü. Canlı sistemde yalnızca herkese açık statik yanıtlar ve HTTP başlıkları incelendi. Dosya, Worker, depolama ve tarayıcı kontrolleri yerel üretim derlemesinde örnek verilerle yürütüldü.

## Bulgular

| Önem | Bulgu | Durum |
| --- | --- | --- |
| Kritik | İncelenen kaynak, Git geçmişi, dağıtım dosyaları ve bağımlılıklarda kritik bulgu saptanmadı. | İncelenen kapsam için geçerli |
| Yüksek (ilk denetim) | İlk denetimde `main` dalında koruma bulunmuyordu. | Düzeltildi. GitHub API dal korumasının etkin olduğunu ve `main` için PR, zorunlu durum kontrolleri, force push engeli ve dal silme engeli kurallarının uygulandığını doğruladı. |
| Orta | XLSX ön doğrulaması, ZIP dizininin bildirilen sınırlarıyla okunan kayıtların tamamını karşılaştırmıyordu. | Dizin boyutu ve kayıt sayısı, yerel başlık tutarlılığı ve tekrar eden kayıt konumları doğrulanıyor. Sıkıştırılmış ve açılmış veri sınırları korundu. |
| Orta | Worker ve rapor sınırlarında beklenmeyen kütüphane hatalarının metni kullanıcı arayüzüne aktarılabiliyordu. | Uygulamanın güvenli doğrulama mesajları korunuyor. Beklenmeyen hata ayrıntıları yerine genel mesaj veriliyor. |
| Orta | Canlı sayfada diğer sitelerle açıcı pencere ilişkisini ve kaynakların siteler arası gömülmesini kısıtlayan başlıklar eksikti. | PR, COOP ve CORP için `same-origin` ekliyor. |
| Düşük | Geçmişi topluca temizlemek kayıtları siliyor, IndexedDB veritabanı kalıyordu. | Toplu silme veritabanını kaldırıyor. Listeleme boş veritabanı oluşturmuyor. Mühendislik formlarında otomatik doldurma kapatma isteği veriliyor. |
| Düşük | Canlı `/.vite/manifest.json` derleme girişlerini, kaynak yollarını ve paket grafiğini yayımlıyordu. İncelenen içerikte kimlik bilgisi saptanmadı. | Vercel dağıtım derlemesi manifesti çıkarmıyor. Yerel derlemede CI doğrulaması için manifest üretiliyor. Source map üretimi açıkça kapatıldı. |
| Düşük | 16 eski commit’in `author` ve `committer` alanlarında depo sahibinden farklı bir hesapla ilişkilendirilen bir e-posta var. Diğer eşleşme GitHub’ın iki imzalı birleştirmede kullandığı hizmet adresi. | Eski commit meta verileri herkese açık. Bu çalışma ortamında yeni commit’ler için doğrulanmış BarisDevLab noreply kimliği yapılandırıldı ve her iki alanı denetleyen yerel Git kancası kuruldu. |
| Düşük | npm taramasında geliştirme ağacında tek düşük önem düzeyli `elliptic` bildirimi ve ona bağlı dört paket kaydı bulundu. | Düzeltme yayımlanmamış. Etkilenen zincir tarayıcı ExcelJS paketinden çıkarılıyor ve derleme bunu denetliyor. [GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84) |

## Hassas veri ve dağıtım dosyaları

- Yerel dallar, uzak dallar, etiketler ve erişilebilir PR başları tarandı. Gitleaks v8.28.0, geçmiş değişiklikleri ve güncel kaynakları taradı. Ayrı bir meta veri taraması Git’te erişilebilir 28 commit’teki 413 benzersiz dosya nesnesini, commit mesajlarını, yazar ve kaydeden alanlarını ve XLSX içindeki metin/XML parçalarını kapsadı. Silinmiş ve artık Git referanslarından erişilemeyen nesneler, kişisel fork’lar ve hesap içi kayıtlar kapsam dışındadır.
- Yerel yol eşleşmesi yanlış pozitifti. `vercel-app/README.md` dosyasında `0586c9fbfec7` ve `079fa28ca908` commit’lerinin 290. satırı ile `549eec05b20e` commit’inin 304. satırı `Home/End` klavye kısayolunu anlatıyor.
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

- [x] GitHub’da `main` için PR ve zorunlu durum kontrolleri ile force push ve dal silme engellerinin etkin olduğu API üzerinden doğrulandı.
- [ ] Zorunlu onay sayısı, kontrol adları ve kural atlama yetkilerini GitHub panelinde gözden geçirin. Ayrıntılı dal koruması API’si bu oturumda 403 döndü.
- [ ] GitHub’da varsayılan Actions izinlerini, dış katkı onaylarını, izinli Action listesini, secret scanning ve push protection durumunu doğrulayın. Hesap düzeyi Actions API’si bu oturumda 403 döndü.
- [x] Bu çalışma ortamının depo düzeyindeki Git kimliği, GitHub’ın BarisDevLab hesabına bağladığı noreply adresine ayarlandı. Yerel kanca farklı `author` veya `committer` kimliği kullanan commit’leri reddediyor.
- [ ] GitHub yazma yetkilerini, uygulama kurulumlarını, bot erişimlerini ve 2FA durumunu kontrol edin. Diğer klonların Git kimliklerini ayrıca doğrulayın.
- [ ] Vercel’de Production, Preview ve Development ortam değişkenlerini ve entegrasyonları denetleyin. Bu statik uygulamanın ihtiyaç duymadığı değişkenleri kaldırın. Hassas değişkenlerin istemciye açılmadığını, Preview erişim korumasını ve yönetim üyeliklerini doğrulayın.
- [ ] Vercel Analytics, Speed Insights, Toolbar, log drain, saklama süresi ve erişim yetkilerini panelden doğrulayın. Test edilen canlı JavaScript’te ve yerel tarayıcı akışında veri gönderimi görülmedi. Vercel proje ve ekip panellerinin iç ayarlarına bu denetimde erişilemedi.

## CodeQL Extended bulgularının takibi

Bu inceleme `main` dalında bildirilen on uyarıyı ve PR #6’daki kaynak düzeltmelerini kapsar. CodeQL uyarı API’si bu oturumda 403 döndü. Aşağıdaki değerlendirmeler bildirilen dosya ve satırlar ile kaynak veri akışına dayanır. GitHub’ın PR taramasının başarılı tamamlanması, `main` üzerindeki uyarıların kapandığı anlamına gelmez.

| Uyarı | Veri akışı, kök neden ve etki | Sonuç |
| --- | --- | --- |
| #7 · Remote property injection | Geçmiş ve güncel analizin grup alanları iki seviyeli nesne özelliğine yazılıyordu. Uygulamanın normal akışında grupları ABC hesabı A/B/C ile sınırlar. Yazma noktasının kendi çalışma zamanı doğrulaması yoktu. Geçersiz grup bir programlama hatasında veya bozuk Worker iletisinde matrisi bozabilirdi. | Geçişler, geçerli A/B/C anahtarlarıyla önceden doldurulan `Map` içinde sayılıyor. Sonuç matrisi sabit alanlarla kuruluyor. Geçersiz kaynak ve hedef grup ayrı ayrı test edildi. |
| #6 · Prototype-polluting assignment | ExcelJS’in satır ve sütun koordinatları önce seyrek diziye, sonra çalışma sayfası matrisine yazılıyordu. Koordinatlar normal ExcelJS akışında sayısal. Bir çalışma kitabındaki metin doğrudan prototip anahtarına dönüşmüyordu. İşaretlenen noktada açık tamsayı ve alt sınır kontrolü bulunmuyordu. | Pozitif güvenli tamsayı ve mevcut boyut sınırları denetleniyor. Koordinatlar `Map` anahtarı olarak saklanıyor ve matris sayısal sayaçlarla oluşturuluyor. |
| #5 · Improper code sanitization | Sabit sentetik sürükle-bırak CSV’si, `JSON.stringify` ile DevTools JavaScript ifadesine giriyordu. Uygulama veya ağ verisinin bu girdiyi belirlediği bir yol bulunmadı. | CSV, sabit callback’e ayrı CDP argümanı olarak veriliyor. |
| #4 · Improper code sanitization | Form alanı seçicisi, kod dizgesindeki `querySelector` çağrısına ekleniyordu. Çağıranlar seçicileri test kodunda oluşturuyor. | Seçici callback’e veri olarak veriliyor. |
| #3 · Improper code sanitization | Form değeri, aynı kod dizgesindeki DOM setter çağrısına ekleniyordu. Girdiler testteki örnek değerlerden geliyor. | Değer, setter callback’ine ayrı CDP argümanı olarak veriliyor. |
| #2 · Improper code sanitization | Düğme etiketi, oluşturulan JavaScript’te metin karşılaştırmasının parçasıydı. Etiketleri test akışı seçiyor. | Düğme metni ve erişilebilir ad, callback içindeki parametreyle karşılaştırılıyor. |
| #1 · Improper code sanitization | Aynı etiket ayrıca oluşturulan hata ifadesine yerleştiriliyordu. DevTools hata ayrıntılarının günlüğe taşınması veri görünürlüğünü artırabiliyordu. | Hata metni sabit. Etiket kaynak koduna ve günlüğe yazılmıyor. |
| #10 · Missing origin verification | Analiz Worker’ı, `Worker.postMessage` ile kendisini oluşturan bağlamın özel kanalından veri alıyor. Bu, bir pencerenin harici kaynaklardan ileti kabul eden `window.postMessage` dinleyicisi değil. Gerçek Dedicated Worker iletisinin `origin` alanı boş ve `source` alanı `null`. | Bu iki alan, tarayıcı tarafından teslim edilen olay işareti ve aktarılmış port bulunmaması doğrulanıyor. İşlem türü ve gerekli veri şekli denetlenmeden analiz başlatılmıyor. |
| #9 · Missing origin verification | Excel Worker’ı da aynı sahip kanalından şablon ve rapor komutları alıyor. Harici pencerelere açık bir ileti uç noktası yok. | Aynı taşıma kontrolleri ile şablon/rapor türü ve rapor veri şekli doğrulanıyor. |
| #8 · Network data written to file | DevTools yanıt başlıkları, URL’ler ve hata anındaki DOM, test raporuna aktarılıyordu. Yanıt içeriğine bağlı olarak çerez başlığı, sorgu verisi veya analiz metni diskte kalabilirdi. | Ham başlıklar, URL’ler, DOM, ekran görüntüleri ve tarayıcı hata metinleri kalıcı günlüklere yazılmıyor. Çıktı sayaçlardan ve test kodundaki sabit kontrol adlarından oluşuyor. Test profili, geçici indirmeler ve örnek dosyalar süreç sonunda kaldırılıyor. |

Tarayıcı aracındaki #1–#5 için mevcut test girdileri sabitti veya yerel test kodunda belirleniyordu. Gözlenen akışlar üretim sayfasında uzaktan kod çalıştırmaya izin vermiyordu. Yine de dinamik kod dizgeleri tamamen kaldırıldı. CDP ile yürütülen callback’ler test kaynak kodunda tanımlı. Değişken değerler ayrı argüman alanında iletiliyor. CodeQL yapılandırması, kapsamı ve uyarı durumu değiştirilmedi.

Bu takipte 384 otomatik test geçti. TypeScript, ESLint, Prettier, üretim derlemesi ve derlenmiş Worker doğrulaması başarılı. Yerel masaüstü Chromium akışında 59 kontrol ve 221 HTTP isteği değerlendirildi. Harici istek, yükleme, CSP ihlali ve tarayıcı hatası görülmedi. Testler geçersiz ABC gruplarını, seyrek XLSX koordinatlarını, iki Worker’ın ileti sınırını ve ağ verisinin test tanılarına aktarılmamasını kapsıyor. GitHub tarama sonucu PR kontrollerinden izlenebilir. [PR #6 kontrolleri](https://github.com/BarisDevLab/ABC-Inventory-Analysis/pull/6/checks)
