"""ABC envanter analizi: yükleme, inceleme ve raporlama paneli."""
from __future__ import annotations

from importlib import reload

import pandas as pd
import streamlit as st

import abc_core
import abc_charts
import ui

# Streamlit yalnızca sayfa betiğini yeniden çalıştırabilir; önceden içe
# aktarılmış yardımcı modül sys.modules içinde eski sürümüyle kalabilir.
# Diskteki gerçek tanımı yükle; hesaplamayı kopyalayan bir yedek yol kullanma.
if not hasattr(abc_core, "analysis_insights"):
    reload(abc_core)
# Yerel sunucu açıkken tasarım modüllerinin eski sürümleri bellekte kalmasın.
reload(abc_charts)
reload(ui)

from abc_core import (
    FIELDS, EXCEL_MIME, tr_number, read_file, calculate_abc,
    create_excel, sample_data, analysis_insights,
)
from abc_charts import pareto_chart, distribution_chart, plot_options
from ui import apply_theme, sidebar_navigation, hero, kpi_grid, policy_block, styled_table, section_header, footer

st.set_page_config(
    page_title="ABC Stok Analizi | BarisDevLab", page_icon="📊",
    layout="wide", initial_sidebar_state="auto",
)
apply_theme()
with st.sidebar:
    sidebar_navigation()
a_share, b_share, c_share = st.session_state.abc_targets

hero(
    "STOK YÖNETİMİNDE EKONOMİK ÖNCELİK",
    "ABC Stok Analiz Sistemi",
    "Stoklarınızı yıllık parasal tüketim değerine göre A, B ve C gruplarına ayırın. "
    "Ekonomik öncelikleri görün, kontrol kaynaklarınızı planlayın.",
    features=True,
)

with st.container(border=True, key="upload_panel"):
    st.subheader("Veri çalışma alanı")
    left, right = st.columns([2.3, 1], gap="large")
    with left:
        uploaded_file = st.file_uploader(
            "Excel veya CSV yükleyin", type=["xlsx", "csv"],
            key=f"upload_{st.session_state.upload_revision}",
            help="Ürün, Yıllık Tüketim ve Birim Fiyat (TL) sütunlarını içermelidir.",
        )
        if uploaded_file is not None:
            incoming = {"name": uploaded_file.name, "bytes": uploaded_file.getvalue()}
            if incoming != st.session_state.saved_upload:
                st.session_state.saved_upload = incoming
                st.rerun()
        st.caption("EXCEL / CSV  ·  Ürün · Yıllık Tüketim · Birim Fiyat (TL)")
    with right:
        st.download_button(
            "⬇️ Boş Excel şablonu", create_excel(pd.DataFrame(columns=FIELDS), template=True),
            file_name="stok_sablonu.xlsx", mime=EXCEL_MIME, type="primary", width="stretch",
        )
        if st.button("Örnek veriyle dene", width="stretch"):
            st.session_state.saved_upload = {
                "name": "ornek_stok.csv", "bytes": sample_data().to_csv(index=False).encode("utf-8-sig"),
            }
            st.session_state.upload_revision += 1
            st.rerun()
        if st.session_state.saved_upload and st.button("🗑️ Yüklenen veriyi temizle", width="stretch"):
            st.session_state.saved_upload = None
            st.session_state.upload_revision += 1
            st.rerun()
    with st.expander("Dosya biçimi ve sayı yazımı"):
        st.write("Her ürün tek satırda olmalıdır. Boş, negatif, hatalı sayısal değerler ve yinelenen ürünler kabul edilmez.")
        st.write("Sayılar: 1234.56 veya 1.234,56. Virgül tek başına ondalık ayracıdır (1,234 = 1.234). Binlik gruplama için 1 234 veya 1.234,00 yazın.")
        st.caption("CSV: UTF-8 / Windows Türkçe; virgül, noktalı virgül veya sekme ayracı. Excel'de sayısal hücreler önerilir.")

stored = st.session_state.saved_upload
if stored is None:
    st.info("Analize hazır. Dosyanızı yükleyin veya örnek veriyle başlayın. Veriler aynı oturumda rehbere geçip döndüğünüzde korunur.", icon="📂")
    footer()
    st.stop()

try:
    df, total = calculate_abc(read_file(stored["bytes"], stored["name"]), a_share, b_share)
except (ValueError, KeyError) as error:
    st.error(f"Dosya analiz edilemedi: {error}")
    st.stop()
except Exception:
    st.error("Dosya okunamadı. Dosyanın bozulmamış bir .xlsx veya UTF-8 / Windows Türkçe kodlamalı .csv olduğundan emin olun.")
    st.stop()

st.success(f"{stored['name']} yüklendi. {len(df)} ürün analiz edildi.", icon="✅")
insights = analysis_insights(df)
summary = (
    df.groupby("ABC Grubu", as_index=False)
    .agg(**{"Ürün Sayısı": ("Ürün", "count"), "Toplam Değer (TL)": ("Yıllık Değer (TL)", "sum")})
    .set_index("ABC Grubu").reindex(["A", "B", "C"], fill_value=0).reset_index()
)
summary["Değer Payı (%)"] = summary["Toplam Değer (TL)"] / total * 100

section_header("01", "Envanterinize genel bakış", "Hedeflerden bağımsız olarak, yüklenen tüm verinin gerçekleşen sonuçları.")
cards = [
    {"key": "total", "label": "Toplam yıllık tüketim değeri", "value": f"{tr_number(total)} TL", "note": "Yıllık tüketim × birim fiyat · Tüm ürünler"},
    {"key": "products", "label": "Analiz edilen ürün", "value": str(len(df)), "note": "Benzersiz stok kalemi"},
    {"key": "a_share", "label": "A grubunun gerçekleşen payı", "value": f"%{tr_number(insights['a_share'])}", "note": f"Hedef %{a_share} · Parasal değer payı"},
]
for group in ['A', 'B', 'C']:
    share = float(summary.loc[summary['ABC Grubu'].eq(group), 'Değer Payı (%)'].iloc[0])
    cards.append({"key": group, "label": f"{group} grubu ürün sayısı", "value": str(insights['counts'][group]), "note": f"Toplam parasal değerin %{tr_number(share)} bölümü", "share": share})
kpi_grid(cards)

section_header("02", "Pareto analizi", "Stok değerinin yoğunlaştığı ürünler · Ekonomik öncelik sınırları")
with st.container(border=True, key="pareto_panel"):
    st.subheader("Ürün değeri ve kümülatif pay")
    with st.container(key="chart_controls"):
        filter_col, range_col = st.columns([1, 1.6], gap="large", vertical_alignment="bottom")
        with filter_col:
            selected_groups = st.multiselect("Gösterilecek ABC grupları", ["A", "B", "C"], default=["A", "B", "C"])
        with range_col:
            if len(df) > 1:
                first, last = st.slider("Ürün sıralama aralığı", 1, len(df), (1, len(df)))
            else:
                first, last = 1, 1
                st.caption("Tek ürün mevcut.")
        mode_col, compact_col, reset_col = st.columns([1.2, 1, 1], gap="medium", vertical_alignment="bottom")
        mode = mode_col.radio("Grafik hareketi", ["Yakınlaştır", "Kaydır"], horizontal=True)
        mobile_agent = any(token in st.context.headers.get("User-Agent", "") for token in ["Android", "iPhone", "Mobile"])
        compact_chart = compact_col.checkbox("Kompakt grafik", value=mobile_agent, help="Dar ekranlarda eksenleri kısaltır. Bilgi kutuları tam TL değerini gösterir.")
        st.session_state.setdefault("chart_revision", 0)
        if reset_col.button("Görünümü sıfırla", width="stretch"):
            st.session_state.chart_revision += 1
        st.caption("Yakınlaştır: alan seçin veya fare tekerleğini kullanın · Kaydır: sürükleyin · PNG indir: kamera simgesi")
    filtered = df.iloc[first - 1:last]
    filtered = filtered[filtered["ABC Grubu"].isin(selected_groups)].copy()
    if filtered.empty:
        st.warning("Bu seçimde gösterilecek ürün yok. Filtreleri değiştirin.")
    else:
        st.plotly_chart(
            pareto_chart(filtered, a_share, b_share, dragmode="pan" if mode == "Kaydır" else "zoom", compact=compact_chart),
            key=f"pareto_{st.session_state.chart_revision}", width="stretch",
            config=plot_options("abc_pareto_analizi"),
        )
        with st.container(key="pareto_note"):
            st.caption(f"{len(filtered)} / {len(df)} ürün gösteriliyor. Kümülatif değer payları filtrelerle yeniden hesaplanmaz; orijinal veri kümesindeki paylar korunur.")
    with st.expander("🔎 Grafik inceleme araçları nasıl kullanılır?"):
        st.markdown("""
- **Yakınlaştır:** Grafikte fareyle alan seçin veya fare tekerleğini kullanın.
- **Kaydır:** Yukarıdaki Kaydır seçeneğini seçip grafiği sürükleyin.
- **Görünümü sıfırla:** Yukarıdaki düğmeyi ya da araç çubuğundaki sıfırlama simgesini kullanın.
- **Veriyi incele:** Sütunların veya mercan renkli çizginin üzerine gelin.
- **PNG kaydet:** Grafiğin araç çubuğundaki kamera simgesine tıklayın.
- **Aralık ve gruplar:** Yukarıdaki seçimler yalnızca Pareto grafiğini etkiler.
""")

with st.container(key="automatic_analysis"):
    st.subheader("Verinin anlattıkları")
    st.caption("Otomatik analiz · Tüm veri kümesi · Seçilen hedefler")
    top_col, concentration_col = st.columns([1.2, 1])
    with top_col:
        st.markdown("**En yüksek yıllık tüketim değeri**")
        st.text(insights["top_product"])
        st.write(f"**{tr_number(insights['top_value'])} TL**")
    with concentration_col:
        st.markdown(f"**İlk {insights['top_count']} ürünün toplam değer payı**")
        st.write(f"**%{tr_number(insights['top_share'])}**")
        st.caption(f"A grubu gerçekleşen değer payı: %{tr_number(insights['a_share'])}")
    st.write("Ürün sayısı dağılımı: " + " · ".join(f"{g}: {insights['counts'][g]} ürün" for g in ["A", "B", "C"]))
    if insights["counts"]["A"]:
        st.info(f"Sık kontrol ve ayrıntılı tedarik planlamasını A grubundaki {insights['counts']['A']} ürüne öncelik vererek planlayın. Bu ürünler yıllık değerin %{tr_number(insights['a_share'])} bölümünü oluşturuyor.")
    else:
        st.info("Seçili hedeflerle A grubunda ürün bulunmuyor. Kontrol önceliklerini mevcut B/C dağılımı ve operasyonel kritiklikle birlikte değerlendirin.")

section_header("03", "Grup dağılımı ve kontrol politikası", "Halka ve karşılaştırma tablosu tam veri kümesini gösterir; Pareto filtrelerinden etkilenmez.")
with st.container(border=True, key="distribution_panel"):
    chart_col, comparison_col = st.columns([1, 1.3], gap="large", vertical_alignment="center")
    with chart_col:
        st.plotly_chart(distribution_chart(summary), width="stretch", config=plot_options("abc_deger_dagilimi"))
    with comparison_col:
        st.subheader("ABC grup karşılaştırması")
        st.caption("Parasal değer payı ve ürün sayısını birlikte değerlendirin.")
        comparison = summary.rename(columns={"ABC Grubu": "Grup", "Ürün Sayısı": "Ürün", "Değer Payı (%)": "Pay (%)", "Toplam Değer (TL)": "Yıllık değer (TL)"})
        st.dataframe(styled_table(comparison, {"Ürün": "{:.0f}", "Yıllık değer (TL)": tr_number, "Pay (%)": lambda x: f"%{tr_number(x)}"}, 'Grup'), hide_index=True, width="stretch")
        st.caption(f"A %{a_share} / B %{b_share} / C %{c_share} hedefleri ürünler bölünmeden uygulanır; gerçekleşen paylar farklı olabilir.")
with st.container(key="assessment_panel"):
    for col, (group, title, strategy) in zip(st.columns(3, gap="large"), [
        ("A", "Yüksek öncelik", "Ayrıntılı tedarik planlama ve sık stok kontrolü."),
        ("B", "Dengeli kontrol", "Düzenli gözden geçirme ve dengeli sipariş politikaları."),
        ("C", "Yalın takip", "Daha basit, düşük maliyetli stok izleme."),
    ]):
        with col:
            policy_block(f"{group} · {title}", strategy, f"Bu analizde {insights['counts'][group]} ürün", symbol={'A': 'priority', 'B': 'plan', 'C': 'check'}[group])
    st.warning("Düşük ekonomik değere sahip kritik parçalar ayrıca değerlendirilmelidir.", icon="⚠️")

section_header("04", "Detaylı analiz tabloları", "Tablolar ve Excel raporu filtrelenmemiş tam analizi içerir.")
with st.container(border=True, key="results_panel"):
    tab1, tab2 = st.tabs(["📋 Ürün Bazlı Sonuçlar", "📦 Grup Özeti"])
    with tab1:
        st.dataframe(styled_table(df, {
            "Yıllık Tüketim": lambda x: tr_number(x, 0) if float(x).is_integer() else tr_number(x),
            "Birim Fiyat (TL)": tr_number, "Yıllık Değer (TL)": tr_number,
            "Değer Payı (%)": lambda x: f"%{tr_number(x)}", "Kümülatif Pay (%)": lambda x: f"%{tr_number(x)}",
        }, 'ABC Grubu'), hide_index=True, width="stretch")
    with tab2:
        st.dataframe(styled_table(summary, {
            "Ürün Sayısı": "{:.0f}", "Toplam Değer (TL)": tr_number,
            "Değer Payı (%)": lambda x: f"%{tr_number(x)}",
        }, 'ABC Grubu'), hide_index=True, width="stretch")

with st.container(border=True, key="report_panel"):
    report_col, action_col = st.columns([2, 1], vertical_alignment="center")
    with report_col:
        st.subheader("Analiz tamamlandı. Raporunuz hazır.")
        st.caption("Excel raporu · Ürün analizi · Grup özeti · Uygulanan ABC hedefleri")
    with action_col:
        st.download_button(
            "📥 Excel Analiz Raporunu İndir", create_excel(df, a_share, b_share, c_share),
            file_name="abc_stok_analiz_raporu.xlsx", mime=EXCEL_MIME, type="primary", width="stretch",
        )
footer()
