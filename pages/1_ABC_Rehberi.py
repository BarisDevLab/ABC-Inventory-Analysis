"""ABC bilgi merkezi: eğitim içeriği, iki örnek ve uygulama alanları."""
import streamlit as st
import ui
from importlib import reload

reload(ui)
from ui import apply_theme, sidebar_navigation, hero, guide_heading, group_cards, metric_card, policy_block, styled_table, footer

st.set_page_config(
    page_title="ABC Analizi Rehberi | BarisDevLab", page_icon="📚",
    layout="wide", initial_sidebar_state="auto",
)
apply_theme()
with st.sidebar:
    sidebar_navigation()
    st.caption("Bu sayfa eğitim amaçlıdır. Veri yüklemek ve analiz yapmak için Analiz Paneli'ne geçebilirsiniz.")

hero("ABC ANALİZİ / EĞİTİM MERKEZİ", "ABC Analizi Rehberi", "Formüller, çözümlü örnekler ve mühendislik uygulamalarıyla stok yönetimini öğrenin.")
st.caption("Öğrenme rotası: Yöntemi tanıyın → Hesaplamayı inceleyin → Örnekleri çözün → Kontrol politikanızı belirleyin.")
with st.container(key="guide_navigation"):
    overview, calculation, examples, applications_tab = st.tabs([
        "Genel Bakış", "Hesaplama Adımları", "Çözümlü Örnekler", "Mühendislik Uygulamaları",
    ])

with overview:
    with st.container(border=True, key="guide_definition"):
        guide_heading("01", "ABC Analizi Nedir?")

        st.markdown("""
        **ABC analizi**, stok kalemlerinin
        yıllık parasal tüketim değerlerine göre
        sınıflandırılmasını sağlayan bir
        envanter yönetimi yöntemidir.

        İşletmelerde bütün stok kalemleri
        aynı ekonomik öneme sahip değildir.

        Bazı ürünler toplam yıllık tüketim
        değerinin büyük kısmını oluştururken,
        çok sayıda ürün daha küçük bir
        değer payına sahip olabilir.

        ABC analizinin temel amacı,
        **sınırlı yönetim ve kontrol kaynaklarını
        ekonomik etkisi yüksek stoklara
        öncelik verecek şekilde kullanmaktır.**
        """)

        st.info('Temel yaklaşım: Her stok kalemini aynı sıklıkta kontrol etmek yerine, ürünleri ekonomik önemlerine göre farklı stok yönetimi politikalarıyla takip etmek.', icon=":material/lightbulb:")
    with st.container(border=True, key="guide_principle"):
        guide_heading("02", "Pareto İlkesi", "violet")

        st.markdown("""
        ABC analizi, **Pareto ilkesi**
        ile ilişkilidir.

        Pareto yaklaşımı, birçok sistemde
        sonuçların önemli bir bölümünün
        sınırlı sayıdaki etkenden
        kaynaklanabileceğini ifade eder.

        Stok yönetiminde bu yaklaşım,
        az sayıdaki ürünün toplam parasal
        tüketim değerinin büyük kısmına
        sahip olabileceğini gösterir.

        Ancak **%80–20 dağılımı kesin bir
        matematiksel zorunluluk değildir.**

        İşletmenin sektörüne, ürün yapısına
        ve tüketim özelliklerine göre
        farklı dağılımlar ortaya çıkabilir.
        """)
        st.info("Önemli bilgi: %80–20 bir başlangıç yaklaşımıdır; gerçekleşen dağılımı işletmenizin verileri belirler.", icon=":material/insights:")
    guide_heading("03", "ABC Grupları")

    group_cards([('A', 80, 'Yüksek', "Toplam yıllık parasal değerin yaklaşık ilk %80'lik bölümüne karşılık gelen yüksek ekonomik öncelikli ürünler.", 'Sık stok kontrolü, ayrıntılı tedarik ve sipariş planlaması.'), ('B', 15, 'Orta', "Toplam yıllık parasal değerin yaklaşık sonraki %15'lik bölümüne karşılık gelen orta öncelikli ürünler.", 'Düzenli gözden geçirme, periyodik sayım ve dengeli sipariş politikası.'), ('C', 5, 'Düşük', "Toplam yıllık parasal değerin yaklaşık son %5'lik bölümüne karşılık gelen düşük ekonomik öncelikli ürünler.", 'Düşük maliyetli, basit takip ve uygun aralıklarla stok kontrolü.')])

    st.caption(
        "Bu değerler varsayılan hedef paylardır. "
        "Ürün sayısını değil, parasal tüketim "
        "değerini ifade eder."
    )

    st.subheader("Grup Bazlı Kontrol Politikaları")

    st.markdown("""
    | Grup | Kontrol düzeyi | Önerilen yaklaşım |
    |---|---|---|
    | A | Yüksek | Sık takip, ayrıntılı planlama |
    | B | Orta | Düzenli kontrol, periyodik sayım |
    | C | Daha basit | Düşük maliyetli kontrol politikaları |
    """)

with calculation:
    with st.container(border=True, key="guide_calculation"):
        guide_heading("04", "ABC Analizi Nasıl Yapılır?", "violet")

        with st.expander(
            "Adım 1 — Yıllık tüketim değeri",
            expanded=True
        ):

            st.write(
                "Her stok kaleminin yıllık kullanım "
                "miktarı ile birim fiyatı çarpılır."
            )

            st.latex(r"D_i = Q_i \times P_i")

            st.markdown("""
            - **D:** Yıllık parasal tüketim değeri
            - **Q:** Yıllık tüketim miktarı
            - **P:** Birim fiyat
            """)

            st.info(
                "Örnek: 500 adet rulman × 120 TL "
                "= 60.000 TL"
            )

        with st.expander(
            "Adım 2 — Ürünleri sıralama"
        ):

            st.write(
                "Ürünlerin yıllık tüketim değerleri "
                "büyükten küçüğe sıralanır. "
                "Böylece en yüksek değerli ürünler "
                "listenin başında bulunur."
            )

        with st.expander(
            "Adım 3 — Değer payını hesaplama"
        ):

            st.latex(
                r"Pay_i(\%)="
                r"\frac{D_i}{\sum_j D_j}\times100"
            )

            st.write(
                "Bir ürünün yıllık değeri 60.000 TL, "
                "toplam değer 300.000 TL ise "
                "ürünün değer payı %20 olur."
            )

        with st.expander(
            "Adım 4 — Kümülatif pay"
        ):

            st.latex(r"K_i=\sum_{j=1}^{i} Pay_j")

            st.write(
                "Sıralanmış ürünlerin değer payları "
                "sırayla toplanır. Her ürün için "
                "toplam içindeki birikimli oran "
                "hesaplanır."
            )

        with st.expander(
            "Adım 5 — ABC sınıflandırması"
        ):

            st.markdown("""
            Varsayılan hedefler:

            - **A:** %80
            - **B:** %15
            - **C:** %5

            Buna göre A/B sınırı %80,
            B/C sınırı ise %95 olur.

            Uygulamada bir ürün, kendi değer
            payı eklenmeden önceki kümülatif
            değere göre sınıflandırılır.

            Bu nedenle bir ürün sınırı aşsa
            da başladığı grupta kalabilir.

            Sıfır yıllık tüketim değerine
            sahip ürünler C grubuna alınır.
            """)

with examples:
    with st.container(border=True, key="guide_examples"):
        guide_heading("05", "Çözümlü ABC Analizi Örneği", "green")

        st.write(
            "Bir işletmenin aşağıdaki beş stok "
            "kalemine sahip olduğunu düşünelim."
        )

        st.dataframe({
            "Ürün": [
                "Motor",
                "Rulman",
                "Sensör",
                "Kayış",
                "Vida"
            ],
            "Yıllık değer": [
                "150.000 TL",
                "60.000 TL",
                "60.000 TL",
                "24.000 TL",
                "10.000 TL"
            ],
            "Değer payı": [
                "%49,34",
                "%19,74",
                "%19,74",
                "%7,89",
                "%3,29"
            ],
            "Kümülatif pay": [
                "%49,34",
                "%69,08",
                "%88,82",
                "%96,71",
                "%100,00"
            ],
            "ABC grubu": [
                "A", "A", "A", "B", "C"
            ]
        }, hide_index=True, width="stretch")

        metric_card("example_total", "Örnek 1 · Toplam yıllık tüketim değeri", "304.000 TL", "Bu değer eğitim örneğine aittir.")

        st.info(
            "Sensör, kümülatif değeri %80'in "
            "üzerine çıkarsa da önceki kümülatif "
            "pay %69,08 olduğu için A grubunda kalır."
        )

        with st.expander("İkinci çözümlü örnek: Hedefler değişirse ne olur?"):
            st.write("A/B/C hedeflerini %70 / %20 / %10 seçelim. Sınırlar %70 ve %90 olur. Aynı veriyle hesaplanan sonuç:")
            from abc_core import calculate_abc, sample_data, tr_number
            example, _ = calculate_abc(sample_data(), 70, 20)
            st.dataframe(styled_table(example, {
                "Yıllık Tüketim": tr_number,
                "Birim Fiyat (TL)": tr_number,
                "Yıllık Değer (TL)": tr_number,
                "Değer Payı (%)": tr_number,
                "Kümülatif Pay (%)": tr_number,
            }, "ABC Grubu"), hide_index=True, width="stretch")
            st.write("Sensör %69,08'de başladığı için A'da kalır. Kayış %88,82'de başladığı için B'dedir; Vida %96,71'de başladığı için C'dedir. Hedefler kesindir; gerçekleşen grup payları ürünler bölünmediği için farklı olabilir.")
            st.caption("Bu eğitim örneği analiz panelindeki kayıtlı verinizi veya eşiklerinizi değiştirmez.")

with applications_tab:
    with st.container(border=True, key="guide_chart_reading"):
        guide_heading("06", "Pareto Grafiği Nasıl Okunur?")

        st.markdown("""
        Pareto grafiği, stokların ekonomik
        önemini görsel olarak incelememize
        yardımcı olur.

        - **Sütunlar:** Ürünlerin yıllık tüketim değerleri
        - **Sütun renkleri:** A, B ve C grupları
        - **Kırmızı çizgi:** Kümülatif değer payı
        - **Kesikli çizgiler:** ABC eşik sınırları

        Ürünler soldan sağa doğru yüksek
        değerden düşük değere sıralanır.

        Kümülatif çizgi ise ürünlerin toplam
        değer içindeki birikimli payını gösterir.
        """)

        st.subheader("Etkileşimli Grafik Araçları")

        st.markdown("""
        Ana analiz panelinde:

        1. Fareyle alan seçerek yakınlaştırabilirsiniz.
        2. Fare tekerleğiyle grafiği büyütebilirsiniz.
        3. Ürün gruplarını filtreleyebilirsiniz.
        4. Sıralama aralığı belirleyebilirsiniz.
        5. Değerlerin üzerine gelerek ayrıntıları görebilirsiniz.
        6. Grafiği PNG formatında kaydedebilirsiniz.
        """)
    guide_heading("07", "Endüstri Mühendisliğinde Kullanımı", "green")
    applications = [('Stok Yönetimi', 'Stok kontrol sıklığının ürünlerin\nekonomik önemlerine göre belirlenmesi.'), ('Satın Alma Yönetimi', 'Yüksek değerli ürünlerin\ntedarik süreçlerinin önceliklendirilmesi.'), ('Depo Yönetimi', 'Sayım ve takip yöntemlerinin\nABC gruplarına göre farklılaştırılması.'), ('Üretim Planlama', 'Önemli malzemelerin tüketim ve\nmaliyet bilgilerinin takip edilmesi.'), ('Tedarik Zinciri Yönetimi', 'Kontrol kaynaklarının ekonomik\nönceliği yüksek ürünlere yönlendirilmesi.')]
    for index in range(0, len(applications), 2):
        columns = st.columns(2, gap="medium")
        for column, (title, description) in zip(columns, applications[index:index + 2]):
            with column, st.container(border=True, key=f"guide_application_{index}_{title}"):
                policy_block(title, description, symbol="products" if "Depo" in title else "plan")

    with st.container(border=True, key="guide_limitations"):
        guide_heading("08", "ABC Analizinin Sınırlamaları", "orange")

        st.warning(
            "ABC analizi yalnızca yıllık parasal "
            "tüketim değerine dayanır. "
            "Ekonomik değeri düşük bir ürün, "
            "üretim için kritik olabilir."
        )

        st.markdown("""
        Bu nedenle stok yönetiminde aşağıdaki
        faktörler de dikkate alınmalıdır:

        - Tedarik süresi
        - Talep değişkenliği
        - Stok tükenme riski
        - Üretim için kritiklik
        - Tedarikçi güvenilirliği
        - Güvenlik ve kalite gereksinimleri

        ABC analizi, diğer stok yönetimi
        yöntemleriyle birlikte kullanıldığında
        daha kapsamlı karar desteği sağlayabilir.
        """)

st.page_link("app.py", label="Analiz Paneline Dön", icon="📊")
footer("ABC ANALİZİ REHBERİ")
