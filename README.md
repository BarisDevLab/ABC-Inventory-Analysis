# ABC Stok Analiz Sistemi

Streamlit ile Excel/CSV verilerinden ABC stok sınıflandırması, Pareto analizi ve biçimlendirilmiş Excel raporu.

## Çalıştırma

Proje klasöründe, bağımlılıkların mevcut olduğu Python ortamıyla:

```powershell
python -m streamlit run app.py
```

`app.py` web uygulamasıdır. `main.py` özgün konsol/Matplotlib örneğidir ve korunmuştur. `modernize.py` ile `polish.py` dönüşüm kayıtlarıdır; çalıştırma giriş noktaları değildir.

## Özellikler

- İşleve göre ayrışan koyu yüzeyler, kompakt üst bölüm ve duyarlı özel KPI ızgarası.
- Dört sekmeli bilgi merkezi: yöntem, beş hesaplama adımı, iki çözümlü örnek ve mühendislik uygulama kartları.
- Excel (.xlsx) ve CSV yükleme; boş Excel şablonu ve örnek veri.
- Aynı oturumda rehbere geçişte dosyanın ve uygulanmış hedeflerin korunması.
- A/B/C hedeflerini ayrı ayarlama; toplam %100 doğrulaması.
- Pareto grafiği; grup ve ürün aralığı filtresi; yakınlaştırma, kaydırma, sıfırlama ve PNG kamera düğmesi.
- ABC parasal değer dağılımı, ürün/grup tabloları, mühendislik değerlendirmesi.
- SVG ikon, ikincil bilgi ve gerçek grup paylarını gösteren çubuklarla altı özel KPI kartı; standart `st.metric` kullanılmaz.
- Gerçek veriden otomatik yorum: en değerli ürün, ilk üç ürün payı, A gerçekleşen payı ve grup sayıları.
- Her iki sayfada hedef kontrolleri, geçerli sınırlar ve yüklü veri durumu.
- Numara etiketli rehber panelleri, belirgin dört sekme ve klavye odağı; rolüne göre mavi/mor/turkuaz/amber vurgular.
- Yedi bilgi alanlı Pareto kutuları; 7/60+ ürün ve küçük değerler için seyrek etiketler ve hassas eksen gösterimi.
- Biçimlendirilmiş Excel raporunda analiz, grup özeti ve hedef ayarları.
- Eksik, boş, hatalı, negatif ve tekrar eden kayıtların Türkçe mesajlarla reddedilmesi.

## Veri biçimi

| Ürün | Yıllık Tüketim | Birim Fiyat (TL) |
|---|---:|---:|
| Motor | 100 | 1500 |
| Rulman | 500 | 120 |
| Sensör | 150 | 400 |

Her ürün tek satırda olmalıdır. Negatif değerler kabul edilmez; toplam yıllık değer pozitif olmalıdır. CSV için UTF-8 veya Windows Türkçe; virgül, noktalı virgül veya sekme ayracı desteklenir. Ondalık sayılar `1234.56` ya da `1.234,56` yazılabilir. Tek virgül ondalık ayracıdır: `1,234` → 1.234. Tek nokta da ondalık ayracıdır; binlik gruplama için `1 234` veya `1.234,00` kullanın. Excel'de sayısal hücreler tercih edilir.

## Hesaplama

Yıllık değer = yıllık tüketim × birim fiyat. Ürünler azalan yıllık değere göre sıralanır; eşit değerlerde giriş sırası korunur. Değer payı, ürün değerinin toplam değere oranıdır.

Varsayılan hedefler A %80, B %15, C %5'tir. Ürün kendi değeri eklenmeden önceki kümülatif paya göre sınıflandırılır. Sınırı aşan ürün başladığı grupta kalır; sıfır değerli ürün C'dedir. Bu nedenle gerçekleşen grup payları hedeflerle tam örtüşmeyebilir.

Pareto filtreleri kümülatif payları yeniden hesaplamaz. ABC dağılımı, tablolar ve Excel raporu tüm analizi gösterir. Aynı oturumdaki sayfa geçişleri veriyi korur; kalıcı disk kaydı yapılmaz.

## Kod yapısı

- `app.py`: analiz paneli ve oturum akışı.
- `abc_core.py`: dosya okuma, doğrulama, ABC hesabı, yorum göstergeleri ve Excel üretimi.
- `abc_charts.py`: grafikler ve yerel Türkçe Plotly sözlüğü.
- `ui.py`, `assets/theme.css`, `.streamlit/config.toml`: ortak arayüz, güvenli HTML kartları ve duyarlı tema.
- `pages/1_ABC_Rehberi.py`: formüller, çözümlü örnekler ve uygulamalar.
- `test_app.py`: hesaplama, dosya ve Streamlit testleri.
- `browser_check.py`: yalnızca izinli yerel Chrome/Edge ile CDP ekran görüntüsü ve etkileşim kontrolü.

## Testler ve bilinen sınırlar

```powershell
python -m unittest test_app -v
```

Ayrıntılı kapsam, tarayıcıda doğrulanmamış noktalar ve üçüncü taraf bileşenlerde İngilizce kalabilecek metinler [TEST_SONUCLARI.md](TEST_SONUCLARI.md) dosyasındadır.

Son hedefli revizyonda **44 otomatik test geçti**. Yüklü Chrome ile 1440×1000 masaüstü ve 390×844 mobil emülasyonda **38 ekran görüntüsü** incelendi. 7 ürün, uzun adlarla 60 ürün ve küçük değerli CSV yüklemeleri; grup filtresi, yedi alanlı bilgi kutusu, klavye odağı, yakınlaştırma/kaydırma/sıfırlama ve PNG indirme doğrulandı. Son görseller `artifacts/targeted-review/`, önceki tur görselleri `artifacts/visual-review/` altındadır. Gerçek telefon ve diğer tarayıcılar ayrıca denenmedi.

Düzenleme öncesi dosyaların yedekleri `backups/before_modernization_20261114/`, ilk UI/UX yenilemesi `backups/before_ui_redesign_20261114/`, son kapsamlı revizyon öncesi sürüm ise `backups/before_visual_revision_20261114/` klasöründedir. Git geçmişi korunmuştur.

Hedefli v2.3 revizyonu öncesi yedek: `backups/before_targeted_revision_20261114/`. Bu turda ABC hesaplama, yükleme/saklama, hedef ayarları ve Excel mantığı değiştirilmedi.
