# Sürüm ve lisans değerlendirmesi

## Sürüm kararı

GitHub Release listesi ve uzak Git etiketleri boş. Hazırlıktan önce uygulama paketi `0.1.0` sürümündeydi. Python tabanlı uygulamadan statik tarayıcı uygulamasına geçilmiş olsa da daha önce yayımlanmış `1.x`, `2.x` veya `3.x` sürüm çizgisi tespit edilmedi. Bu nedenle ilk kararlı sürüm için `1.0.0` seçildi. npm paket sürümü ve kilit dosyasındaki kök sürüm aynı. Git etiketi yayımlanacağı zaman karşılığı `v1.0.0` olacak. JSON analiz paketinin biçim sürümü ayrı bir sözleşmedir ve `1` olarak kaldı. [Semantic Versioning 2.0.0](https://semver.org/)

## Proje lisansı

Depo kökünde proje lisans metni, npm paketinde proje lisans alanı ve GitHub lisans bilgisinde bir lisans kaydı bulunamadı. Paket özel olarak işaretli. Herkese açık depo görünürlüğü, proje kaynak kodu için genel bir açık kaynak lisansı verildiği anlamına gelmez. Açık kaynak dağıtımı hedefleniyorsa depo sahibi uygun lisansı seçmeli ve katkılar için gerekli hakları doğrulamalı. Bu hazırlık proje lisansı atamaz. [GitHub lisans rehberi](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository)

## Üçüncü taraf bileşenler

- React, React DOM, Scheduler, Plotly ve ExcelJS MIT olarak dağıtılıyor. React ailesi ve Plotly’nin lisans metinleri dağıtımın statik bildirimlerine eklendi. ExcelJS ve içindeki bağımlılıkların bildirimleri mevcut derleme çıktısından, Geist bildirimi mevcut OFL dosyasından geliyor.
- npm kilit grafiği kurulan paketlerin envanteridir. Tarayıcıya giren bileşenler için Vite üretim çıktısı ve yeniden paketlenen ExcelJS’in girdi grafiği incelendi. JSZip’in MIT veya GPL-3.0-or-later seçeneklerinden MIT koşullarıyla dağıtımı mümkündür. pako’nun MIT ve Zlib bildirimleri gözetilir. Paket metadata’sında lisansı belirtilmeyen `buffers` için kurulu arşivde ayrı bir lisans dosyası bulunamadı. Bu paket ExcelJS tarayıcı paketinin girdi grafiğinde yer almıyor. npm kurulum ağacının tamamı ayrıca dağıtılacaksa bu paketin lisans kaynağı doğrulanmalı.
- Hazır Plotly dağıtımının gömülü üçüncü taraf bileşenleri npm kilidinde tek tek görünmez. Mevcut dağıtımın içerdiği bildirimler korunuyor. Üretim ağacına ilişkin bu inceleme, tüm gömülü bileşenlerin ayrı bir hukuk onayı yerine geçmez.

[Uygulama çalışma zamanı bildirimleri](vercel-app/public/third-party/APP-NOTICES.txt) · [ExcelJS bildirimleri](vercel-app/public/third-party/ExcelJS-NOTICES.txt) · [Geist OFL](vercel-app/public/fonts/geist-LICENSE.txt)

## Yayın öncesi durum

Sürüm notları [CHANGELOG.md](CHANGELOG.md) dosyasında. Bu çalışma etiketi, GitHub Release’i veya canlı dağıtımı yayımlamaz. Açık kaynak lisans kararı yayın öncesinde depo sahibine aittir.
