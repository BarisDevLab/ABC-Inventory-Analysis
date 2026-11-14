
import streamlit as st
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from io import BytesIO

# ==========================================
# ABC STOK ANALİZ SİSTEMİ - SÜRÜM 0.6
# ==========================================

st.set_page_config(
    page_title="ABC Stok Analizi",
    page_icon="📊",
    layout="wide"
)

plt.rcParams["font.family"] = "DejaVu Sans"
plt.rcParams["axes.unicode_minus"] = False

# MODERN ARAYÜZ

st.markdown("""
<style>
.block-container {
    padding-top: 2rem;
    max-width: 1450px;
}
h1, h2, h3 {
    letter-spacing: -0.025em;
}
div[data-testid="stMetric"] {
    background: #15243b;
    padding: 18px;
    border: 1px solid #29415f;
    border-radius: 14px;
}
div[data-testid="stMetricLabel"] {
    color: #cbd5e1;
}
div[data-testid="stMetricValue"] {
    color: #f8fafc;
}
</style>
""", unsafe_allow_html=True)

# ÖRNEK VERİLER

ORNEK = pd.DataFrame({
    "Ürün": ["Rulman", "Vida", "Motor", "Kayış", "Sensör"],
    "Yıllık Tüketim": [500, 2000, 100, 300, 150],
    "Birim Fiyat (TL)": [120, 5, 1500, 80, 400]
})

ZORUNLU = [
    "Ürün",
    "Yıllık Tüketim",
    "Birim Fiyat (TL)"
]

RENKLER = {
    "A": "#3b82f6",
    "B": "#f59e0b",
    "C": "#10b981"
}

# PROFESYONEL EXCEL OLUŞTURMA

def excel_hazirla(tablo, sayfa_adi="ABC Analizi"):
    bellek = BytesIO()

    with pd.ExcelWriter(
        bellek, engine="openpyxl"
    ) as yazici:

        tablo.to_excel(
            yazici,
            sheet_name=sayfa_adi,
            index=False
        )

        sayfa = yazici.sheets[sayfa_adi]
        sayfa.freeze_panes = "A2"
        sayfa.auto_filter.ref = sayfa.dimensions

        # Başlık tasarımı
        for hucre in sayfa[1]:
            hucre.fill = PatternFill(
                "solid", fgColor="17365D"
            )
            hucre.font = Font(
                color="FFFFFF", bold=True
            )
            hucre.alignment = Alignment(
                horizontal="center"
            )

        # Sütun genişlikleri ve sayı biçimleri
        for sutun_no, baslik in enumerate(
            tablo.columns, start=1
        ):
            uzunluk = max(
                [len(str(baslik))]
                + [
                    len(str(x))
                    for x in tablo[baslik].head(100)
                ]
            )

            genislik = min(
                max(uzunluk + 3, 17), 36
            )

            harf = get_column_letter(sutun_no)
            sayfa.column_dimensions[harf].width = genislik

            for satir in range(2, len(tablo) + 2):
                hucre = sayfa.cell(
                    row=satir,
                    column=sutun_no
                )

                if baslik in (
                    "Değer Payı (%)",
                    "Kümülatif Pay (%)"
                ):
                    hucre.number_format = '0.00"%"'

                elif baslik in (
                    "Birim Fiyat (TL)",
                    "Yıllık Değer (TL)",
                    "Toplam Değer (TL)"
                ):
                    hucre.number_format = '#,##0.00 "TL"'

                elif baslik in (
                    "Yıllık Tüketim",
                    "Ürün Sayısı"
                ):
                    hucre.number_format = '#,##0.##'

                # ABC gruplarını renklendir
                if (
                    baslik == "ABC Grubu"
                    and hucre.value in RENKLER
                ):
                    arka_plan = {
                        "A": "DBEAFE",
                        "B": "FEF3C7",
                        "C": "D1FAE5"
                    }

                    hucre.fill = PatternFill(
                        "solid",
                        fgColor=arka_plan[hucre.value]
                    )
                    hucre.font = Font(
                        bold=True,
                        color="111827"
                    )

    return bellek.getvalue()


# UYGULAMA BAŞLIĞI

st.title("📊 ABC Stok Analiz Sistemi")

st.caption(
    "Endüstri Mühendisliği • "
    "Envanter Yönetimi ve Karar Destek • v0.6"
)

# KONTROL PANELİ

with st.sidebar:
    st.header("⚙️ Kontrol Paneli")

    a_esik = st.slider(
        "A grubu sınırı (%)",
        50, 90, 80
    )

    b_esik = st.slider(
        "B grubu bitiş sınırı (%)",
        a_esik + 1,
        100,
        max(95, a_esik + 1)
    )

    st.info(
        "Eşiği aşan ürün, başladığı grupta "
        "kalır. Gerçekleşen grup payları "
        "eşiklerden farklı olabilir."
    )

    st.caption("Proje sürümü: 0.6")

# VERİ YÖNETİMİ

st.subheader("📁 Veri Yönetimi")

st.download_button(
    "📥 Excel şablonunu indir",
    excel_hazirla(ORNEK, "Stok Şablonu"),
    file_name="stok_sablonu.xlsx",
    mime=(
        "application/vnd.openxmlformats-officedocument."
        "spreadsheetml.sheet"
    )
)

dosya = st.file_uploader(
    "Excel veya CSV dosyanızı yükleyin",
    type=["xlsx", "csv"]
)

if dosya is None:
    df = ORNEK.copy()
    st.info("Örnek stok verileri kullanılıyor.")

else:
    try:
        if dosya.name.lower().endswith(".csv"):
            df = pd.read_csv(
                dosya,
                encoding="utf-8-sig",
                sep=None,
                engine="python"
            )
        else:
            df = pd.read_excel(dosya)

    except Exception as hata:
        st.error(f"Dosya okunamadı: {hata}")
        st.stop()

    st.success(
        "Dosya okundu. Analiz için kontroller yapılıyor."
    )

# VERİ DOĞRULAMA

if not all(
    sutun in df.columns for sutun in ZORUNLU
):
    st.error(
        "Gerekli sütunlar: " + ", ".join(ZORUNLU)
    )
    st.stop()

df = df[ZORUNLU].copy()

if df.empty or df.isna().any().any():
    st.error(
        "Dosya boş veya eksik hücre içeriyor."
    )
    st.stop()

df["Ürün"] = df["Ürün"].astype(str).str.strip()

if (df["Ürün"] == "").any():
    st.error("Ürün adları boş olamaz.")
    st.stop()

for sutun in ZORUNLU[1:]:
    df[sutun] = pd.to_numeric(
        df[sutun],
        errors="coerce"
    )

    if (
        df[sutun].isna().any()
        or (df[sutun] < 0).any()
    ):
        st.error(
            f"{sutun}: Geçerli, sıfır veya "
            "pozitif sayılar girilmeli."
        )
        st.stop()

# ABC ANALİZİ

df["Yıllık Değer (TL)"] = (
    df["Yıllık Tüketim"]
    * df["Birim Fiyat (TL)"]
)

df = df.sort_values(
    "Yıllık Değer (TL)",
    ascending=False,
    kind="stable"
).reset_index(drop=True)

toplam = df["Yıllık Değer (TL)"].sum()

if toplam <= 0:
    st.error(
        "Toplam yıllık tüketim değeri "
        "sıfırdan büyük olmalıdır."
    )
    st.stop()

df["Değer Payı (%)"] = (
    df["Yıllık Değer (TL)"] / toplam * 100
)

df["Kümülatif Pay (%)"] = (
    df["Değer Payı (%)"].cumsum().clip(upper=100)
)

onceki = (
    df["Kümülatif Pay (%)"]
    - df["Değer Payı (%)"]
)

df["ABC Grubu"] = onceki.apply(
    lambda x:
        "A" if x < a_esik
        else ("B" if x < b_esik else "C")
)

# KPI GÖSTERGELERİ

st.divider()
st.subheader("📈 Genel Stok Özeti")

k1, k2, k3, k4, k5 = st.columns(5)

k1.metric(
    "Yıllık Tüketim Değeri",
    f"{toplam:,.0f} TL"
)

k2.metric("Ürün Sayısı", len(df))

for kart, grup in zip(
    (k3, k4, k5),
    ("A", "B", "C")
):
    kart.metric(
        f"{grup} Grubu",
        int((df["ABC Grubu"] == grup).sum())
    )

# ANALİZ TABLOSU

st.divider()
st.subheader("📋 ABC Sınıflandırma Tablosu")

st.dataframe(
    df.style.format({
        "Birim Fiyat (TL)": "{:,.2f}",
        "Yıllık Değer (TL)": "{:,.2f}",
        "Değer Payı (%)": "{:.2f}",
        "Kümülatif Pay (%)": "{:.2f}"
    }),
    width="stretch",
    hide_index=True
)

# PARETO GRAFİĞİ

st.divider()
st.subheader("📊 Pareto Analizi")

fig, ax = plt.subplots(figsize=(12, 5.5))

konum = list(range(len(df)))

fig.patch.set_facecolor("white")

ax.bar(
    konum,
    df["Yıllık Değer (TL)"],
    color=df["ABC Grubu"].map(RENKLER)
)

ax.set_ylabel("Yıllık Tüketim Değeri (TL)")

ax.set_xticks(konum)

ax.set_xticklabels(
    df["Ürün"],
    rotation=30,
    ha="right"
)

ax.yaxis.set_major_formatter(
    FuncFormatter(
        lambda x, pos: f"{x:,.0f}"
    )
)

ax.grid(axis="y", alpha=0.15)
ax.set_axisbelow(True)

ax2 = ax.twinx()

ax2.plot(
    konum,
    df["Kümülatif Pay (%)"],
    color="#ef4444",
    marker="o",
    linewidth=2.4,
    label="Kümülatif pay"
)

ax2.axhline(
    a_esik,
    color="#f59e0b",
    linestyle="--",
    label=f"A sınırı (%{a_esik})"
)

ax2.axhline(
    b_esik,
    color="#10b981",
    linestyle="--",
    label=f"B sınırı (%{b_esik})"
)

ax2.set_ylim(0, 115)
ax2.set_ylabel("Kümülatif Pay (%)")

if len(df) <= 25:
    for i, pay in enumerate(
        df["Kümülatif Pay (%)"]
    ):
        ax2.annotate(
            f"%{pay:.1f}",
            (i, pay),
            xytext=(0, 7),
            textcoords="offset points",
            ha="center",
            fontsize=8
        )

ax2.legend(loc="lower right")

ax.set_title(
    "ABC Stok Analizi — Pareto Grafiği",
    weight="bold"
)

fig.tight_layout()

st.pyplot(fig)
plt.close(fig)

# GRUP DAĞILIMI

st.divider()
st.subheader("📦 Grup Dağılımı")

ozet = df.groupby(
    "ABC Grubu",
    as_index=False
).agg(**{
    "Ürün Sayısı": ("Ürün", "count"),
    "Toplam Değer (TL)": (
        "Yıllık Değer (TL)", "sum"
    )
})

ozet["Değer Payı (%)"] = (
    ozet["Toplam Değer (TL)"]
    / toplam * 100
)

st.dataframe(
    ozet.style.format({
        "Toplam Değer (TL)": "{:,.2f}",
        "Değer Payı (%)": "{:.2f}"
    }),
    width="stretch",
    hide_index=True
)

# MÜHENDİSLİK DEĞERLENDİRMESİ

st.divider()
st.subheader("🔎 Mühendislik Değerlendirmesi")

a_grubu = df[df["ABC Grubu"] == "A"]

a_payi = (
    a_grubu["Yıllık Değer (TL)"].sum()
    / toplam * 100
)

st.info(
    f"A grubunda {len(a_grubu)} ürün var. "
    f"Yıllık toplam değerin %{a_payi:.2f} "
    "kısmını oluşturuyorlar."
)

st.write(
    "**A grubu:** Daha sık kontrol "
    "ve ayrıntılı tedarik planlaması."
)

st.write(
    "**B grubu:** Orta düzey stok takibi."
)

st.write(
    "**C grubu:** Daha basit stok kontrolü."
)

# EXCEL RAPORU

st.divider()
st.subheader("📥 Raporu İndir")

st.download_button(
    "📗 Biçimlendirilmiş Excel analiz raporunu indir",
    excel_hazirla(df),
    file_name="abc_analiz_raporu.xlsx",
    mime=(
        "application/vnd.openxmlformats-officedocument."
        "spreadsheetml.sheet"
    )
)

st.caption(
    "ABC Stok Analiz Sistemi • "
    "Endüstri Mühendisliği • v0.6"
)
