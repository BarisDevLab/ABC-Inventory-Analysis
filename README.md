# ABC Stok Analizi

Yıllık tüketim değerine göre stokları A, B ve C gruplarına ayıran Türkçe bir React, TypeScript ve Vite uygulaması. CSV ve Excel dosyalarından analiz yapabilir, Pareto grafiğini inceleyebilir ve Excel raporu indirebilirsiniz. Dosyalar tarayıcıda işlenir ve sunucuya gönderilmez.

[Canlı uygulama](https://abc-inventory-analysis.vercel.app) · [Geliştirme ve Vercel yapılandırması](vercel-app/README.md)

## Kurulum ve doğrulama

Node.js 24.x (en az 24.11.1) ve npm gerekir. Depo kökünden başlayın.

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
npm audit
```

GitHub Actions, `main` dalını hedefleyen PR’larda ve `main` güncellemelerinde bu kontrolleri çalıştırır. Vercel proje kökü `vercel-app`, statik derleme çıktısı `dist` dizinidir.

## Kullanım

1. **Örnek veriyle dene** düğmesini kullanın veya Excel şablonunu indirip doldurun.
2. CSV ya da `.xlsx` dosyanızı seçin. Sütun başlıklarını aşağıdaki gibi yazın.
3. A/B/C değer hedeflerini ayarlayın. Hedeflerin toplamı %100 olmalıdır.
4. Sonuç tablolarını ve Pareto grafiğini inceleyin. Excel raporunu veya grafiği PNG olarak indirebilirsiniz. Uygulamadaki **ABC Analizi Rehberi** çözülmüş örnekler içerir.

| Ürün | Yıllık Tüketim | Birim Fiyat (TL) |
| --- | ---: | ---: |
| Motor | 100 | 1500 |
| Rulman | 500 | 120 |
| Sensör | 150 | 400 |
| Kayış | 300 | 80 |
| Vida | 2000 | 5 |

Her ürün tek satırda olmalıdır. Tüketim ve birim fiyat sonlu, negatif olmayan sayılardır. CSV için UTF-8 ve Windows Türkçe (CP1254) kodlamaları ile virgül, noktalı virgül ve sekme ayraçları desteklenir. `1234.56` ve `1.234,56` aynı değeri ifade eder. Tek başına kullanılan virgül veya nokta ondalık ayıracıdır. Binlik gruplaması için `1 234` veya `1.234,00` yazın. Excel’de sayısal hücreler kullanabilirsiniz.

## ABC hesaplama yöntemi

Her ürünün yıllık değeri tüketim miktarı ile birim fiyatın çarpımıdır. Ürün payı, yıllık değerin genel toplama bölünüp 100 ile çarpılmasıyla bulunur. Genel toplam pozitif ve sonlu olmalıdır.

Ürünler yıllık değere göre azalan sırada sıralanır. Eşit değerlerde giriş sırası korunur. Varsayılan hedefler A için %80, B için %15 ve C için %5’tir. Bir ürünün grubu, o ürün eklenmeden önceki kümülatif payla belirlenir. Tam %80’den başlanıyorsa ürün B’ye, tam %95’ten başlanıyorsa C’ye girer. Eşiği aşan ürün başladığı grupta kalır ve sıfır değerli ürünler C’ye atanır. Bu nedenle gerçekleşen grup payları hedeflerden farklı olabilir.

Pareto filtresi hesaplanmış kümülatif yüzdeleri korur. Tablolar, dağılım grafiği ve Excel raporu tam analizi kullanır. Stok kararlarında ekonomik önemin yanı sıra tedarik süresi, talep değişkenliği ve operasyonel kritiklik de değerlendirilmelidir.

## Güvenlik ve gizlilik

Dosyalar yalnızca tarayıcı belleğinde işlenir. Uygulama kullanıcı dosyalarını yüklemez, kalıcı olarak saklamaz veya analitik servise iletmez. Üretimde CSP, `connect-src 'none'` ve diğer güvenlik başlıkları uygulanır. Dosya boyutu, çalışma sayfası boyutları ve açılmış ZIP verisi sınırlandırılır. Excel çıktısında ürün adları metin hücresi olarak yazılır. [Sınırlar ve teknik ayrıntılar](vercel-app/README.md#güvenlik-ve-gizlilik)
