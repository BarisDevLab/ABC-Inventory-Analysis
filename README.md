# Inventory Intelligence

Inventory Intelligence, stok değerini, talep değişkenliğini ve ikmal kararlarını aynı çalışma alanında inceleyen bir tarayıcı uygulamasıdır. Türkçe ve İngilizce arayüz, açık ve koyu tema, klavyeyle gezinme ve mobil ekran desteği sunar.

[Canlı uygulama](https://abc-inventory-analysis.vercel.app) · [Teknik kılavuz](vercel-app/README.md)

## İşlevler

- **Genel bakış ve ABC analizi.** Excel veya CSV yükleyin. Çalışma sayfasını, başlık satırını, sütunları ve sayı biçimini seçin. Değer yoğunlaşmasını Pareto grafiğinde, ürün dökümünde ve Excel raporunda inceleyin.
- **XYZ ve ABC-XYZ.** Eşit dönemlerin talebinden değişkenlik sınıfını hesaplayın. Güncel ABC sınıfıyla ürün kodu veya ürün adı üzerinden eşleştirin.
- **Dönemsel karşılaştırma ve senaryo analizi.** İki dönemin değerlerini, ürün ekleme ve çıkarmalarını, sınıf geçişlerini görün. Alternatif ABC eşiklerini güncel veri üzerinde deneyin.
- **Stok optimizasyonu.** EOQ, yeniden sipariş noktası ve emniyet stokunu işletme girdilerinizden hesaplayın.
- **FSN, VED ve maliyet simülasyonu.** Hareket sıklığını ve operasyonel kritiklik düzeyini sınıflandırın. Sabit parti ve hedefe tamamlama politikalarını aynı talep serisiyle karşılaştırın.
- **Analiz geçmişi ve rehber.** Sürümlü JSON analiz paketi aktarın, dilediğiniz analizi tarayıcı geçmişine kaydedin ve örneklerle hesaplama yöntemlerini inceleyin.

## Kurulum

Node.js 24.x (en az 24.11.1) ve npm gerekir.

```sh
cd vercel-app
npm ci
npm run dev
```

```sh
npm test
npm run typecheck
npm run lint
npm run format:check
npm run build
npm run verify:production
npm audit --audit-level=moderate
```

React, TypeScript ve Vite ile derlenen statik uygulamada hesaplama modülleri arayüzden bağımsızdır. Dosya okuma, ABC, dönem ve senaryo hesapları, JSON paketleme ve Excel üretimi Web Worker’da çalışır. Ekranlar gerektiğinde yüklenir. Excel okuma ve üretim worker’ları aynı ExcelJS dosyasını paylaşır. Plotly, grafik görünüm alanına yaklaşınca yüklenir. GitHub Actions kalite kontrollerini çalıştırır. Vercel proje kökü `vercel-app`, derleme çıktısı `dist` dizinidir.

## Hesaplama yöntemleri

| Modül | Yöntem |
| --- | --- |
| ABC | Yıllık tüketim × birim fiyat. Azalan değer sırasındaki önceki kümülatif pay, ürünün sınıfını belirler. %80 ve %95’e tam eşit başlangıç, varsayılan eşiklerde sırasıyla B ve C’ye girer. Eşiği geçen ürün başlangıç grubunda kalır. Sıfır değerli ürünler C’ye atanır. |
| XYZ / ABC-XYZ | CV = örneklem standart sapması / ortalama. X ve Y üst sınırları ilgili sınıfa dahildir. Sıfır talepli serinin CV’si tanımsızdır. Matris iki geçerli sınıfı birleştirir. |
| Dönem / senaryo | Her iki dönem güncel ABC hedefleriyle sınıflandırılır. Eşleştirme iki dosyada da SKU varsa büyük/küçük harfe duyarlı kodla, aksi durumda benzersiz normalleştirilmiş adla yapılır. Senaryo, aynı veri üzerinde alternatif A/B/C hedefleriyle hesaplanır. |
| EOQ / ROP | EOQ = √(2DS/H). İlgili yıllık maliyet DS/Q + HQ/2’dir. ROP = dönemsel ortalama talep × aynı birimdeki tedarik süresi + emniyet stoku. |
| Emniyet stoku | Sabit ve bağımsız değişken tedarik süresi için normal modeller ve gözlenen çevrim talebine dayalı ampirik model. |
| FSN / VED | FSN, pozitif stok çıkışı görülen dönemlerin oranını kullanır. VED, operasyon ve güvenlik etkilerinin en yükseğini kullanır. |
| Simülasyon | Dönem başında teslimat ve sipariş, ardından talep. Eksik talep kayıp satış olarak sayılır. Maliyet, sipariş, dönem sonu stok ve eksik karşılama kalemlerinden oluşur. |

[Model varsayımları ve girdi birimleri](vercel-app/src/inventory/README.md)

## Veri ve gizlilik

ABC dosyasının temel alanları ürün, yıllık tüketim ve TL birim fiyatıdır. İsteğe bağlı SKU her satırda benzersiz olmalıdır. Karşılaştırılan dönemlerde aynı para birimi, miktar birimi ve dönem uzunluğunu kullanın. Uygulama döviz veya ölçü birimi dönüşümü yapmaz. Talep geçmişi, tedarik süresi, maliyet ve kritiklik verilerini ilgili formlara girin. Gerçek sıfırları belirtin ve eksik gözlemleri tamamlayın.

Dosyalar tarayıcıda işlenir. Uygulama stok kayıtlarını sunuculara göndermez. Tema ve dil tercihleri cihazda hatırlanır. Analiz verileri, kullanıcı açıkça kaydettiğinde, bu siteye ait tarayıcı geçmişinde saklanır. En fazla 10 kaydı tek tek veya topluca silebilirsiniz. JSON indirilen dosyayı, kullandığınız cihazda sakladığınız diğer iş dosyaları gibi koruyun. JSON paketi güncel ABC kaynağı ve hedeflerini kapsar. Diğer modüllerin form verileri sayfa yenilenince temizlenir.

Giriş dosyaları 20 MiB ve 100.000 satırla sınırlıdır. Tam sınırlar ve ZIP doğrulama kuralları teknik kılavuzda yer alır. EOQ ve emniyet stoku modelleri seçilen varsayımlara duyarlıdır. Simülasyon tarihsel bir talep serisi ve sabit tedarik süresi kullanır. Excel şablonu ve rapor başlıkları mevcut dosyalarla uyumluluk için Türkçedir.

[Sınırlar ve güvenlik başlıkları](vercel-app/README.md#güvenlik-ve-gizlilik)
