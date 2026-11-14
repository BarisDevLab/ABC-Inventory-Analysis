# ABC Stok Analiz Sistemi

**Python ve Streamlit ile stok önceliklendirme ve karar desteği.**

Excel veya CSV biçimindeki stok verilerinizi ABC sınıflandırmasına dönüştürün, yıllık tüketim değerini hangi ürünlerin oluşturduğunu inceleyin ve biçimlendirilmiş bir Excel raporu hazırlayın. Endüstri mühendisliği alanında bir portföy projesi olarak geliştirilen bu uygulama, etkileşimli analizi yöntemi açıklayan eğitici bir rehberle birleştirir.

**[Canlı uygulamayı aç](https://barisdevlab-abc-analysis.streamlit.app)** · **[GitHub deposunu incele](https://github.com/BarisDevLab/ABC-Inventory-Analysis)**

Arayüz ve öğrenme rehberi **Türkçedir**; Türkçe sayı biçimleri kullanılır ve fiyatlar Türk lirası (TL) cinsinden gösterilir. Dosya hazırlamadan uygulamayı incelemek için canlı uygulamayı açıp hazır örnek veri setini yükleyen **Örnek veriyle dene** seçeneğini kullanın.

## Özellikler

- **Excel ve CSV yükleme:** `.xlsx` veya `.csv` dosyası yükleyin, boş Excel şablonunu indirin ya da uygulamanın örnek veri setini kendi seçiminizle yükleyin.
- **Veri doğrulama:** Eksik sütunlar, boş alanlar, yinelenen ürünler, geçersiz sayılar ve negatif tüketim miktarları veya fiyatlar reddedilir. Toplam yıllık değer sıfırdan büyük olmalıdır.
- **Ayarlanabilir sınıflandırma:** A, B ve C gruplarının hedef değer paylarını değiştirin; toplamlarının %100 olduğu doğrulanır.
- **Stok özeti:** Altı temel performans göstergesi (KPI) kartında toplam yıllık değer, ürün sayısı, A grubunun gerçekleşen değer payı ve A/B/C gruplarının ürün sayıları gösterilir.
- **Etkileşimli Pareto analizi:** Gruba veya ürün sıralama aralığına göre filtreleyin; yakınlaştırın, kaydırın, görünümü sıfırlayın, kompakt grafiğe geçin ve PNG indirin. Bilgi kutuları tüketim miktarını, birim fiyatı, yıllık değeri, değer payını, kümülatif payı ve grubu gösterir.
- **Karar desteği:** Grup dağılımını, ürün ve grup tablolarını; en yüksek değerli ürün, ilk üç ürünün toplam değer payı ve A grubundaki yoğunlaşma hakkında veriden hesaplanan özetleri inceleyin.
- **Excel raporlama:** Ürün bazlı sonuçları, grup özetini ve uygulanan sınıflandırma hedeflerini biçimlendirilmiş bir Excel çalışma kitabına aktarın.
- **ABC öğrenme rehberi:** Formülleri, beş hesaplama adımını, iki çözümlü örneği, mühendislik uygulamalarını ve yöntemin sınırlamalarını dört sekmede inceleyin.

Yüklenen veriler ve uygulanan hedefler, **aynı Streamlit oturumu içinde** analiz paneli ile rehber arasında geçiş yaparken korunur. Bu, kalıcı depolama değil, oturum durumudur; yeni bir oturum açılması veya sunucunun yeniden başlatılması bu bilgileri sıfırlayabilir.

## Ekran görüntüleri

Görüntüler, örnek stok verileriyle yapılan yerel Chrome testlerinde alınmıştır. Bu depoda saklanırlar ve harici bir görsel barındırma hizmetine bağlı değildirler.

### Analiz paneli

Ortak koyu arayüzde veri yükleme, sınıflandırma hedefleri ve stok performans göstergeleri.

<img src="assets/screenshots/analysis-dashboard.png" alt="Veri yükleme alanını, ayarlanabilir hedefleri ve örnek stok performans göstergelerini gösteren ABC analiz paneli" width="960">

### Pareto analizi

Yıllık değerleri, kümülatif değer payını, grup eşiklerini ve grafik kontrollerini gösteren yedi ürünlü örnek.

<img src="assets/screenshots/pareto-analysis.png" alt="Mavi A, kehribar B ve turkuaz C grubu sütunlarını ve kümülatif yüzde çizgisini gösteren etkileşimli Pareto grafiği" width="960">

### ABC öğrenme rehberi

Yöntem, hesaplamalar, çözümlü örnekler ve mühendislik uygulamaları için konu panelleri ve sekmeler içeren ayrı öğrenme alanı.

<img src="assets/screenshots/abc-guide.png" alt="Dört gezinme sekmesini ve çerçeveli açıklama panellerini gösteren Türkçe ABC öğrenme rehberi" width="960">

## Kullanılan teknolojiler

| Teknoloji | Kullanım amacı |
|---|---|
| **Python** | Uygulama mantığı, doğrulama ve ABC hesaplamaları |
| **Streamlit** | Web arayüzü, sayfalar arası gezinme, dosya yükleme ve oturum durumu |
| **Pandas** | Verileri okuma, sıralama, değer hesaplamaları ve grup özetleri |
| **Plotly** | Etkileşimli Pareto ve dağılım grafikleri, bilgi kutuları ve PNG dışa aktarma |
| **openpyxl** | Excel okuma ve biçimlendirilmiş çalışma kitabı oluşturma |

Matplotlib, `main.py` içindeki bağımsız konsol örneği için korunmuştur; web uygulamasının grafikleri Plotly ile oluşturulur.

## Yerel kurulum ve çalıştırma

Yerel doğrulamada kullanılan Python **3.12** sürümüyle birlikte pip paket yöneticisini kullanın. Bağımlılık sürüm aralıkları [`requirements.txt`](requirements.txt) dosyasında tanımlıdır.

### 1. Depoyu klonlayın ve sanal ortam oluşturun

```bash
git clone https://github.com/BarisDevLab/ABC-Inventory-Analysis.git
cd ABC-Inventory-Analysis
python -m venv .venv
```

Sisteminizde Python'a `python3` komutuyla erişiliyorsa `python` yerine `python3` kullanın.

### 2. Sanal ortamı etkinleştirin

Windows PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS / Linux:

```bash
source .venv/bin/activate
```

### 3. Bağımlılıkları yükleyin ve Streamlit'i başlatın

```bash
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

Streamlit'in terminalde gösterdiği yerel adresi açın. **Web uygulamasının giriş dosyası `app.py` dosyasıdır**; `main.py` ayrı bir konsol/Matplotlib örneğidir.

## Kullanım

1. **Verilerinizi hazırlayın.** Boş Excel şablonunu indirin veya aşağıdaki sütun başlıklarını aynen kullanın. Alternatif olarak **Örnek veriyle dene** seçeneğiyle hazır örneği inceleyin.
2. **Dosya yükleyin.** Analiz panelinin veri çalışma alanından bir Excel veya CSV dosyası seçin.
3. **Hedefleri belirleyin.** Sol menüde A/B/C değer paylarını ayarlayın ve **Hedefleri uygula** düğmesine basın. Toplam %100 olmalıdır.
4. **Sonuçları inceleyin.** Performans göstergelerini ve tabloları gözden geçirin, Pareto grafiğini filtreleyin ve ürünleri tek tek inceleyin. Dar ekranlarda kompakt görünümü kullanın.
5. **Dışa aktarın veya ayrıntıları öğrenin.** Excel raporunu ya da grafiği PNG olarak indirin. Yöntem ve çözümlü örnekler için **ABC Analizi Rehberi** sayfasını açın.

### Veri biçimi

Aşağıdaki Türkçe sütun adlarını değiştirmeden kullanın:

| Ürün | Yıllık Tüketim | Birim Fiyat (TL) |
|---|---:|---:|
| Motor | 100 | 1500 |
| Rulman | 500 | 120 |
| Sensör | 150 | 400 |
| Kayış | 300 | 80 |
| Vida | 2000 | 5 |

- Her ürün tek satırda yer almalıdır. Tüketim miktarları ve fiyatlar sonlu, negatif olmayan sayılar olmalıdır.
- CSV dosyalarında UTF-8 ve Windows Türkçe kodlamaları; virgül, noktalı virgül veya sekme ayraçları desteklenir.
- Ondalık sayı örnekleri: `1234.56` veya `1.234,56`. Tek başına kullanılan virgül veya nokta ondalık ayracı kabul edilir: `1,234`, **1.234** anlamına gelir; bin iki yüz otuz dört birim anlamına gelmez. Binlik gruplama için `1 234` veya `1.234,00` kullanın. Excel'de sayısal hücreler kullanmak bu belirsizliği önler.

## ABC sınıflandırması nasıl çalışır?

Her ürün için:

```text
Yıllık tüketim değeri = Yıllık tüketim miktarı × Birim fiyat
Değer payı (%) = Ürünün yıllık değeri / Toplam yıllık değer × 100
```

Ürünler, yıllık tüketim değeri en yüksek olandan en düşük olana doğru sıralanır. Eşit değerli ürünlerde giriş sırası korunur. Varsayılan hedefler ürün sayısını değil, **yıllık parasal değeri** böler:

| Grup | Hedef değer payı | Varsayılan kümülatif sınır |
|---|---:|---:|
| A | %80 | %80 |
| B | %15 | %95 |
| C | %5 | %100'e kadar kalan değer |

Sınıflandırmada her ürünün değer payı eklenmeden **önceki** kümülatif pay kullanılır. Eşiği aşan ürün, başladığı grupta kalır; sıfır değerli ürünler C grubuna atanır. Ürünler bölünmediği için gerçekleşen grup payları hedeflerden farklı olabilir.

Pareto filtreleri, tam analizdeki kümülatif yüzdeleri korur; sınıflandırmayı yeniden hesaplamaz. Dağılım grafiği, sonuç tabloları ve Excel raporu veri kümesinin tamamını göstermeye devam eder.

ABC analizi ekonomik önemi ölçer. Stok kararlarında tedarik süreleri, talep değişkenliği ve operasyonel kritiklik de değerlendirilmelidir.

## Proje yapısı

```text
app.py                      # Streamlit analiz paneli ve oturum akışı
abc_core.py                 # Veri doğrulama, sınıflandırma, yorumlar ve Excel çıktısı
abc_charts.py               # Plotly grafikleri ve grafik ayarları
ui.py                       # Ortak arayüz bileşenleri
pages/1_ABC_Rehberi.py       # ABC öğrenme rehberi
assets/theme.css            # Ortak duyarlı tema
assets/screenshots/         # Depoda saklanan ekran görüntüleri
.streamlit/config.toml      # Streamlit tema ayarları
test_app.py                 # Birim testleri ve Streamlit entegrasyon testleri
requirements.txt            # Çalışma zamanı bağımlılıkları
main.py                     # Bağımsız konsol/Matplotlib örneği
```

## Test ve doğrulama

Mevcut test paketini proje kök klasöründe çalıştırın:

```bash
python -m unittest test_app -v
```

Test paketi; sınıflandırma sınırlarını, geçersiz girdileri, CSV/Excel işlemlerini, çalışma kitabı çıktılarını, grafik verilerinin bütünlüğünü, modül içe aktarımlarını ve Streamlit'in sayfa geçişi/oturum davranışını kapsayan **44 test** içerir.

Önceki yerel Chrome kontrollerinde masaüstü ve mobil emülasyon, yedi ürünlü ve 60 ürünlü veri kümeleri, küçük değerler, klavye odağı, filtreleme, yakınlaştırma, kaydırma, sıfırlama ve PNG indirme de incelenmiştir. Mobil emülasyon, gerçek cihazlarda veya diğer tarayıcılarda yapılan testlerin yerini tutmaz. Kapsam ve sınırlamalar için [ayrıntılı doğrulama raporunu](TEST_SONUCLARI.md) inceleyin.

---

**[BarisDevLab](https://github.com/BarisDevLab)** tarafından bir endüstri mühendisliği portföy projesi olarak geliştirilmiştir.
