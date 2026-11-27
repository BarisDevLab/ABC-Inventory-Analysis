# Envanter Zekâsı matematiksel ve akademik doğrulaması

İnceleme güncel `main` tabanı `53eead9` üzerinde yürütüldü. Kaynak kod, TR/EN yöntem metinleri, grafik modelleri ve sayısal Excel hücreleri incelendi. El hesabı, formülden bağımsız beklenen değerler ve mevcut regresyon veri setleri kullanıldı. Para birimi arayüzde TL olarak etiketleniyor. Modeller otomatik kur, enflasyon ve ölçü birimi dönüşümü yapmıyor.

| Modül | Formül ve bağımsız örnek | Varsayım, sonuç ve sınır |
| --- | --- | --- |
| ABC ve Pareto | Yıllık değer Vᵢ = Dᵢ × cᵢ, pay = 100Vᵢ/ΣV, kümülatif pay azalan değer sırasındaki toplamdır. 80, 15, 5 TL için toplam 100, kümülatif %80, %95, %100 ve sınıflar A, B, C. [1, 2] | Eşikte başlayan ürün sonraki gruba geçer. Eşiği aşan ürün başladığı grupta kalır. Eşit değerler giriş sırasını korur, sıfır değer C, tümü sıfır ise analiz reddedilir. %80/%15/%5 işletme varsayılanıdır. Ekonomik öncelik operasyonel kritiklikten ayrı değerlendirilir. |
| XYZ | CV = s/μ ve s² = Σ(xᵢ−μ)²/(n−1). [8, 10, 12] için μ=10, s=2, CV=0,20. X üst sınırı 0,25 ise X. [3] | Eşit uzunluklu, karşılaştırılabilir en az iki dönem gerekir. X ve Y sınırları kapsayıcı ve işletmeye özgüdür. Sıfır ortalamada CV ve sınıf tanımsızdır. CV trendi, sezonu veya tahmin hatasını tek başına ölçmez. |
| ABC-XYZ | Geçerli ABC ve XYZ etiketlerinin Kartezyen çarpımı. Örneğin 80 TL paylı A ürününün CV’si 0,20 ve XYZ sınıfı X ise eşleşme AX. [1, 2, 3] | SKU varsa boşluk temizlenir, baştaki sıfırlar ve büyük/küçük harf korunur. Diğer durumda normalize ad kullanılır. Eksik ve sınıfsız XYZ kayıtları ayrı gösterilir. Öneriler servis, kritiklik, tedarik süresi ve sipariş kısıtlarıyla birlikte değerlendirilmesi gereken seçeneklerdir. |
| EOQ | Yıllık ilgili maliyet DS/Q + HQ/2, Q* = √(2DS/H). D=1000 adet/yıl, S=40 TL/sipariş, H=2 TL/adet/yıl ise Q*=200 ve iki bileşen 200’er TL/yıl. [1, 4] | Sabit talep ve birim maliyet, tek seferde teslimat, stoksuzluk ve miktar indirimi bulunmaması gerekir. D=0 ise sipariş yok. S veya H sıfır olduğunda ilgili sınır durumu gösterilir. Kesirli Q teoriktir. Aşırı küçük ara çarpımlarda hassasiyet düzeltildi. |
| ROP | dL + SS. 7,5 adet/dönem × 2,5 dönem + 3 adet = 21,75 adet; tam adet için 22. [1] | d ve L aynı dönem birimine çevrilmeli. Eşik stok pozisyonuna uygulanır. L=0 ise eşik SS’ye eşit. Sürekli gözden geçirme mantığıdır. Periyodik gözden geçirmede koruma süresi gözden geçirme aralığını da kapsar. |
| Emniyet stoku | Normal modellerde SS=zₚσₗ. Sabit L=4 ve [8,10,12] için σₗ=4, %95 için SS≈6,58. Bağımsız değişken L=[2,3,4] için Var(Dₗ)=3×4+10²×1=112. Ampirik [0,10,10,30] ve p=0,90 için sıra 4, Q=30, ortalama 12,5, SS=17,5. [1, 5] | Normal modeller bağımsız dönem talepleri ve değişken süre için talepten bağımsız teslim süresi varsayar. Kesirli sürede varyans ölçeklemesi bir yaklaşımdır. Ampirik model sıralı ⌈pn⌉ gözlemini ve max(0,Q−μ) kullanır. Küçük örneklemde kuyruk tahmini zayıftır. Çevrim servis olasılığı adet karşılama oranından farklıdır. Ampirik sınırda sıra yuvarlama hatası düzeltildi. |
| FSN | Pozitif çıkışlı dönem / dönem sayısı. [0,8,0,1] için 2/4=%50. %50 eşiğinde F, daha yüksek eşikte S. Tümü sıfır ise N. [6] | Uygulama sıklık kullanır. Literatürde devir hızı ve bekleme süresi kullanan FSN sürümleri de vardır. Eşik ve dönem uzunluğu iş bağlamına bağlıdır. Stok yokluğu nedeniyle gözlenmeyen talep sonucu etkileyebilir. |
| VED | Sıralı etki sınıflarının maksimumu. Operasyon düşük ve güvenlik yüksek ise V. Gerekçe zorunlu. [7] | Bu iki ölçütü birleştiren kural uygulama tercihidir. Uzman değerlendirmesi, yedek tedarik ve kesinti etkisi ayrıca incelenmeli. Fiyat, hareket sıklığı veya CV kritiklik yerine kullanılmamalı. |
| Stok maliyeti simülasyonu | Sipariş sayısı × TL/sipariş + Σdönem sonu stok × TL/adet/dönem + kayıp adet × TL/adet. [4,6,3] talep; başlangıç 4, L=1, s=2, Q=5 için stok 0/0/2, kayıp 6, sipariş 1. Birim maliyetler sırasıyla 4/1/2 ise toplam 18 TL, karşılama 7/13. [1] | Dönem başında teslimat ve sipariş, ardından talep. Sabit parti dönem başında en fazla bir sipariş açar. Hedefe tamamlama yalnızca gözden geçirme gününde stok pozisyonundan hesaplanır. L=0 teslimat aynı dönem talebinden önce alınır. Açık siparişler dönem sonunda gösterilir. Kayıp satış var, geriye sipariş yok. Satın alma ve kalan stok değeri maliyet dışında. Geçmiş seri geleceğin dağılımı değildir. |
| Dönemsel karşılaştırma | ΔV=V₂−V₁, yüzde=100ΔV/V₁. 80→100 TL için 20 TL, %25. Çıkan ve giren ürünler sınıf geçiş matrisine girmez. [1] | İki dönem aynı ABC hedefleriyle hesaplanır. Önceki değer sıfırsa yüzde tanımsız. Eşit kapsam, para birimi, ölçü birimi ve tutarlı SKU gerekir. Nominal fark fiyat, miktar ve enflasyon etkilerini ayrıştırmaz. |
| Senaryo analizi | Sabit 80/15/5 TL verisine %85/%10/%5 hedefi uygulanınca ikinci ürün B→A geçer. Ürün değerleri ve tekil payları sabit. [1, 2] | Eşik duyarlılığı ölçülür. Talep, fiyat, servis veya maliyet tahmini yapılmaz. Grup bazındaki değer payları değişebilir. |

## Grafikler, rapor ve rehber

Pareto sütunları yıllık değeri, sağdaki 0–100 ölçekli çizgi tam analizin kümülatif payını kullanıyor. Filtre ve 500 satırlık pencere görüntülenen ürünleri sınırlar ve payları yeniden hesaplamaz. Eşik çizgileri hedef A ve A+B değerleridir. Kompakt grafikte bin TL etiketi ile ölçek birlikte değişir. Çok küçük pozitif değerlerde yinelenen ölçek işaretleri kaldırıldı ve maksimum değer korunuyor. EOQ eğrisi optimumu içerir ve tablodaki maliyet fonksiyonunu kullanır. Halka grafik grup değerlerinden, mühendislik sütunları ilgili modül sonuçlarından beslenir.

Excel raporundaki ürün satırları, kümülatif yüzdeler, sınıflar ve hedefler testlerde kontrol edildi. Grup özeti artık ekrandaki aynı payı sayısal hücreye yazar. Eski Excel payı grup toplamlarının ayrıca toplanmasıyla ikinci kez hesaplanıyordu ve kayan nokta hassasiyetinde ayrışabiliyordu. Excel çıktısı ABC analizini kapsar.

Rehberdeki iki ABC örneği bağımsız kontrol edildi. 150.000, 60.000, 60.000, 24.000 ve 10.000 TL toplam 304.000 TL eder. Sensör, Kayış ve Vida için başlangıç yüzdeleri sırasıyla %69,08, %88,82 ve %96,71. Verilen iki hedef setinde de A/A/A/B/C elde edilir. TR/EN rehberine kaynaklar, eşik seçimi, karşılaştırılabilir dönemler ve senaryoda sabit kalan paylar eklendi.

## Sayısal sınırlar ve güvenlik

Mevcut testler geçersiz ve eksik değerleri, negatifleri, sıfır durumlarını, tam eşikleri, aşırı değerleri ve eşleşme kurallarını kapsıyor. İşlem yuvarlaması görüntü biçiminden ayrıdır. JavaScript ikili kayan nokta kullanır. En uç ölçeklerde ara değer kaybı, eşik toleransı ve tam adet için muhafazakâr yukarı yuvarlama dikkate alınmalıdır. Eşit sıralı ABC ürünleri eşik civarında giriş sırasından etkilenebilir. Akademik dayanaklar yöntem ailesini destekler. İşletmeye özel eşik veya önerileri tek bir evrensel kural olarak doğrulamaz.

CSP, güvenlik başlıkları, dosya işleme sınırları ve yerel veri akışı korunmuştur. Rehberdeki akademik bağlantılar yalnızca kullanıcı açarsa ziyaret edilir. Yeni bağımlılık veya servis eklenmedi.

## Kaynaklar

1. Silver, Pyke ve Thomas, *Inventory and Production Management in Supply Chains*. [Yayınevi kaydı](https://doi.org/10.1201/9781315374406)
2. Flores ve Whybark, *Multiple Criteria ABC Analysis*. [Makale](https://doi.org/10.1108/eb054765)
3. NIST Dataplot, *Coefficient of Variation*. [Tanım](https://www.itl.nist.gov/div898/software/dataplot/refman2/auxillar/coefvari.htm)
4. Harris, *How Many Parts to Make at Once*. [Operations Research yeniden basımı](https://doi.org/10.1287/opre.38.6.947)
5. Hyndman ve Fan, *Sample Quantiles in Statistical Packages*. [Makale](https://doi.org/10.1080/00031305.1996.10473566)
6. *Storage design using Fast moving, Slow moving and Non moving (FSN) analysis*. [Konferans makalesi](https://doi.org/10.1051/matecconf/201819714005)
7. *ABC and VED Analysis of the Pharmacy Store of a Tertiary Care Teaching, Research and Referral Healthcare Institute of India*. [Makale](https://doi.org/10.4103/0975-1483.63170)
