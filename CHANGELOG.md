# Değişiklik günlüğü / Changelog

## [1.0.0] · Yayına hazırlık / Release preparation

İlk kararlı sürüm adayı. Yayın tarihi, etiket ve GitHub Release, yayın onayı sonrasında belirlenecek.

### Türkçe sürüm notları

**Envanter Zekâsı — Bütünleşik Stok Karar Destek Sistemi**

- **Altyapı.** Önceki Python tabanlı uygulamadan React, TypeScript ve Vite tabanlı statik tarayıcı uygulamasına geçiş tamamlandı. Dosya okuma, analiz ve Excel raporlama işlerinin ilgili bölümleri Web Worker’da yürütülüyor. Plotly ile ExcelJS ihtiyaç duyulduğunda yükleniyor.
- **Sınıflandırma.** ABC ve Pareto yıllık tüketim değerini sıralıyor. XYZ dönemsel talebin değişkenliğini ölçüyor. ABC-XYZ, ekonomik önem ile değişkenliği birleştiriyor. FSN hareket sıklığını, VED ise operasyon ve güvenlik kritikliğini sınıflandırıyor.
- **Karşılaştırma ve senaryolar.** Dönemsel karşılaştırma değer farklarını, eklenen ve çıkan ürünleri ve sınıf geçişlerini gösteriyor. Senaryo analizi aynı envanterde alternatif ABC hedeflerini karşılaştırıyor.
- **İkmal ve maliyet.** EOQ teorik sipariş miktarını ve yıllık maliyet eğrilerini gösteriyor. Yeniden sipariş noktası beklenen tedarik süresi talebini emniyet stokuyla topluyor. Emniyet stoku sabit/değişken teslim süresi için normal modeller ve ampirik bir seçenek sunuyor. Stok maliyeti simülasyonu sabit parti ve hedefe tamamlama politikalarını aynı talep serisinde karşılaştırıyor.
- **Veri yönetimi.** CSV/XLSX içe aktarma, ABC Excel raporu, PNG grafik çıktısı ve sürümlü JSON paketleri destekleniyor. Analiz geçmişi kullanıcı açıkça kaydettiğinde yerel IndexedDB’ye yazılıyor ve silinebiliyor.
- **Güvenlik ve gizlilik.** CSP ve kaynaklar arası güvenlik başlıkları, XLSX/ZIP sınırları, Worker ileti doğrulaması, güvenli hata mesajları ve test günlüğü veri minimizasyonu uygulanıyor. Browserify ve elliptic zinciri kaldırıldı. Yüklenen stok verileri uygulama tarafından harici servise gönderilmiyor.
- **Akademik doğrulama.** Formüller, varsayımlar, bağımsız örnekler ve yöntem sınırları belgeleniyor. Ampirik kantil sınırı, EOQ’nun çok küçük ara değerleri, Pareto eksen işaretleri ve Excel grup payları için sayısal düzeltmeler yapıldı.
- **Marka.** Envanter Zekâsı / Inventory Intelligence adı, onaylanan SVG logo ve favicon, Türkçe ve İngilizce uygulama metinleri, açık/koyu tema ve sentetik veriyle hazırlanmış iki dilli README sunuluyor.

**Geçiş notu.** Python uygulamasının çalıştırma ve otomasyon akışları tarayıcı uygulamasından farklıdır. Ana veri alışverişi Excel/CSV ve sürüm 1 JSON analiz paketidir. Kayıtlı geçmiş tarayıcı profiline ve siteye bağlıdır. Karşılaştırılan dönemlerin kapsamı, ölçü birimi ve para birimi tutarlı olmalıdır.

### English release notes

**Inventory Intelligence — Integrated Inventory Decision Support System**

- **Infrastructure.** The former Python application has moved to a static browser application built with React, TypeScript, and Vite. Web Workers handle file processing, selected analyses, and Excel reporting. Plotly and ExcelJS load on demand.
- **Classification.** ABC and Pareto rank annual usage value. XYZ measures variation in periodic demand. ABC-XYZ combines economic importance with demand variability. FSN classifies movement frequency, and VED assesses operational and safety criticality.
- **Comparison and scenarios.** Period comparison reports value changes, additions, removals, and class transitions. Scenario analysis compares alternative ABC targets on the same inventory.
- **Replenishment and cost.** EOQ shows the theoretical order quantity and annual cost curves. The reorder point adds safety stock to expected lead-time demand. Safety stock supports normal models for fixed and variable lead times and an empirical option. Stock cost simulation compares fixed-lot and order-up-to policies against the same demand series.
- **Data management.** The application imports CSV/XLSX, exports ABC Excel reports and chart images, and supports versioned JSON packages. Analysis history uses local IndexedDB when explicitly saved and can be deleted.
- **Security and privacy.** CSP and cross-origin headers, XLSX/ZIP limits, Worker message validation, safe errors, and reduced diagnostic data exposure are in place. The Browserify and elliptic chain was removed. The application processes uploaded inventory data locally.
- **Academic validation.** Formulas, assumptions, independent worked examples, and model limitations are documented. Numerical fixes cover empirical quantile boundaries, very small EOQ intermediate values, Pareto axis ticks, and Excel group shares.
- **Brand identity.** This release introduces the Envanter Zekâsı / Inventory Intelligence identity, approved SVG logo and favicon, Turkish and English application text, light and dark themes, and bilingual documentation with synthetic screenshots.

**Migration note.** Python launch commands and automation do not carry over to the browser application. Use Excel/CSV and version 1 JSON analysis packages to exchange data. Saved history is tied to the browser profile and site. Use consistent scope, units, and currency when comparing periods.

[Akademik doğrulama / Engineering validation](ENGINEERING_VALIDATION.md) · [Güvenlik denetimi / Security audit](SECURITY_AUDIT.md) · [Yayın ve lisans değerlendirmesi / Release and license review](RELEASE_READINESS.md)
