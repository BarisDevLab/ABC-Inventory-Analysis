
import io
import math
import streamlit as st
import pandas as pd
import plotly.graph_objects as go

from plotly.subplots import make_subplots
from openpyxl.styles import PatternFill, Font, Alignment
from openpyxl.utils import get_column_letter

# ==========================================
# ABC STOK ANALİZ SİSTEMİ
# Sürüm 0.7 - BarisDevLab
# ==========================================

st.set_page_config(
    page_title="ABC Stok Analizi",
    page_icon="📊",
    layout="wide"
)

RENK = {
    "A": "#3B82F6",
    "B": "#F59E0B",
    "C": "#10B981"
}

GEREKLI = [
    "Ürün",
    "Yıllık Tüketim",
    "Birim Fiyat (TL)"
]

MIME = (
    "application/vnd.openxmlformats-officedocument."
    "spreadsheetml.sheet"
)


# ==========================================
# EXCEL OLUŞTURMA
# ==========================================

def excel_dosyasi(tablo, sayfa_adi):
    bellek = io.BytesIO()

    with pd.ExcelWriter(
        bellek,
        engine="openpyxl"
    ) as yazici:

        tablo.to_excel(
            yazici,
            sheet_name=sayfa_adi,
            index=False
        )

        sayfa = yazici.sheets[sayfa_adi]
        sayfa.freeze_panes = "A2"
        sayfa.auto_filter.ref = sayfa.dimensions

        # Başlıkların biçimlendirilmesi
        for hucre in sayfa[1]:
            hucre.fill = PatternFill(
                "solid",
                fgColor="193453"
            )
            hucre.font = Font(
                color="FFFFFF",
                bold=True
            )
            hucre.alignment = Alignment(
                horizontal="center"
            )

        # Sütun genişlikleri ve sayı biçimleri
        for no, baslik in enumerate(
            tablo.columns, 1
        ):
            uzunluk = max(
                [len(str(baslik))]
                + [
                    len(str(v))
                    for v in tablo[baslik].head(200)
                ]
            )

            harf = get_column_letter(no)

            sayfa.column_dimensions[harf].width = min(
                max(uzunluk + 3, 17),
                32
            )

            for hucreler in sayfa.iter_cols(
                min_col=no,
                max_col=no,
                min_row=2
            ):
                for hucre in hucreler:

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

                    elif (
                        baslik == "ABC Grubu"
                        and hucre.value in RENK
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


# ==========================================
# DOSYA OKUMA
# ==========================================

def veri_oku(dosya):

    if dosya.name.lower().endswith(".xlsx"):
        return pd.read_excel(dosya)

    ham = dosya.getvalue()

    for kodlama in ("utf-8-sig", "cp1254"):
        try:
            return pd.read_csv(
                io.BytesIO(ham),
                encoding=kodlama,
                sep=None,
                engine="python"
            )
        except UnicodeDecodeError:
            continue

    raise ValueError(
        "CSV dosyasının metin kodlaması okunamadı."
    )


# ==========================================
# VERİ DOĞRULAMA VE ABC ANALİZİ
# ==========================================

def analiz_yap(veriler, a_esigi, b_esigi):

    eksik = [
        sutun for sutun in GEREKLI
        if sutun not in veriler.columns
    ]

    if eksik:
        raise ValueError(
            "Eksik sütunlar: " + ", ".join(eksik)
        )

    df = veriler[GEREKLI].copy()

    if df.empty:
        raise ValueError(
            "Dosyada analiz edilecek ürün bulunmuyor."
        )

    if df.isna().any().any():
        raise ValueError(
            "Dosyada boş hücreler var. "
            "Lütfen doldurun."
        )

    df["Ürün"] = (
        df["Ürün"].astype(str).str.strip()
    )

    if (df["Ürün"] == "").any():
        raise ValueError(
            "Ürün adları boş olamaz."
        )

    if df["Ürün"].duplicated().any():
        raise ValueError(
            "Aynı ürün birden fazla satırda bulunuyor. "
            "Ürünleri tek satırda birleştirin."
        )

    # Sayısal verileri kontrol et
    for sutun in GEREKLI[1:]:

        df[sutun] = pd.to_numeric(
            df[sutun],
            errors="coerce"
        )

        if not df[sutun].notna().all():
            raise ValueError(
                f"{sutun} sütununda "
                "sayısal olmayan değer var."
            )

        if not df[sutun].map(math.isfinite).all():
            raise ValueError(
                f"{sutun} sütununda geçersiz sayı var."
            )

        if (df[sutun] < 0).any():
            raise ValueError(
                f"{sutun} negatif olamaz."
            )

    # Yıllık tüketim değeri
    df["Yıllık Değer (TL)"] = (
        df["Yıllık Tüketim"]
        * df["Birim Fiyat (TL)"]
    )

    if not df["Yıllık Değer (TL)"].map(
        math.isfinite
    ).all():
        raise ValueError(
            "Hesaplanan değerlerden biri çok büyük."
        )

    # Büyükten küçüğe sıralama
    df = df.sort_values(
        "Yıllık Değer (TL)",
        ascending=False,
        kind="stable"
    ).reset_index(drop=True)

    toplam = float(
        df["Yıllık Değer (TL)"].sum()
    )

    if not math.isfinite(toplam) or toplam <= 0:
        raise ValueError(
            "Toplam yıllık tüketim değeri "
            "sıfırdan büyük ve geçerli olmalıdır."
        )

    # Yüzde hesaplamaları
    df["Değer Payı (%)"] = (
        df["Yıllık Değer (TL)"]
        / toplam * 100
    )

    df["Kümülatif Pay (%)"] = (
        df["Değer Payı (%)"]
        .cumsum()
        .clip(upper=100)
    )

    onceki = (
        df["Kümülatif Pay (%)"]
        - df["Değer Payı (%)"]
    )

    # ABC sınıflandırması
    def grup_belirle(pay):
        if pay < a_esigi:
            return "A"
        elif pay < b_esigi:
            return "B"
        return "C"

    df["ABC Grubu"] = onceki.map(grup_belirle)

    return df, toplam


# ==========================================
# ANA SAYFA
# ==========================================

st.title("📊 ABC Stok Analiz Sistemi")

st.caption(
    "Endüstri Mühendisliği · "
    "Envanter Yönetimi ve Karar Destek · v0.7"
)

# Yan menü
with st.sidebar:

    st.header("⚙️ Analiz Ayarları")

    a_esigi = st.slider(
        "A grubu sınırı (%)",
        50, 90, 80
    )

    b_esigi = st.slider(
        "B grubu bitiş sınırı (%)",
        a_esigi + 1,
        100,
        max(95, a_esigi + 1)
    )

    st.caption(
        "Eşiği aşan ürün başladığı grupta "
        "tutulur. Gerçekleşen grup payları "
        "eşiklerden farklı olabilir."
    )


# ==========================================
# VERİ YÜKLEME
# ==========================================

st.subheader("📁 Veri Yükleme")

# Boş Excel şablonu
sablon = pd.DataFrame(columns=GEREKLI)

st.download_button(
    label="📥 Boş Excel şablonunu indir",
    data=excel_dosyasi(
        sablon,
        "Stok Şablonu"
    ),
    file_name="stok_sablonu.xlsx",
    mime=MIME
)

dosya = st.file_uploader(
    "Analiz için Excel (.xlsx) "
    "veya CSV (.csv) yükleyin",
    type=["xlsx", "csv"]
)

# Dosya yoksa burada dur.
# Henüz analiz, KPI veya grafik gösterme.
if dosya is None:

    st.info(
        "Henüz veri yüklenmedi. "
        "Boş Excel şablonunu indirip "
        "doldurabilir veya kendi "
        "stok dosyanı yükleyebilirsin."
    )

    st.stop()


# ==========================================
# DOSYAYI ANALİZ ET
# ==========================================

try:
    veriler = veri_oku(dosya)

    df, toplam = analiz_yap(
        veriler,
        a_esigi,
        b_esigi
    )

except Exception as hata:
    st.error(
        f"Dosya analiz edilemedi: {hata}"
    )
    st.stop()

st.success(
    f"{dosya.name} yüklendi; "
    f"{len(df)} ürün analiz edildi."
)


# ==========================================
# KPI GÖSTERGELERİ
# ==========================================

st.divider()
st.subheader("📈 Genel Stok Özeti")

kolonlar = st.columns(5)

kolonlar[0].metric(
    "Toplam Yıllık Değer",
    f"{toplam:,.2f} TL"
)

kolonlar[1].metric(
    "Ürün Sayısı",
    len(df)
)

for kolon, grup in zip(
    kolonlar[2:],
    ("A", "B", "C")
):
    sayi = int(
        (df["ABC Grubu"] == grup).sum()
    )

    kolon.metric(
        f"{grup} Grubu",
        sayi
    )


# ==========================================
# ABC SINIFLANDIRMA TABLOSU
# ==========================================

st.divider()
st.subheader("📋 ABC Sınıflandırma Tablosu")

st.dataframe(
    df,
    hide_index=True,
    width="stretch",
    column_config={
        "Birim Fiyat (TL)":
            st.column_config.NumberColumn(
                "Birim Fiyat (TL)",
                format="%.2f"
            ),

        "Yıllık Değer (TL)":
            st.column_config.NumberColumn(
                "Yıllık Değer (TL)",
                format="%.2f"
            ),

        "Değer Payı (%)":
            st.column_config.NumberColumn(
                "Değer Payı (%)",
                format="%.2f"
            ),

        "Kümülatif Pay (%)":
            st.column_config.NumberColumn(
                "Kümülatif Pay (%)",
                format="%.2f"
            )
    }
)


# ==========================================
# ETKİLEŞİMLİ PARETO GRAFİĞİ
# ==========================================

st.divider()
st.subheader("📊 Etkileşimli Pareto Grafiği")

fig = make_subplots(
    specs=[[{"secondary_y": True}]]
)

konumlar = list(range(len(df)))

# ABC gruplarına göre renkli sütunlar
fig.add_trace(
    go.Bar(
        x=konumlar,
        y=df["Yıllık Değer (TL)"],
        marker_color=(
            df["ABC Grubu"]
            .map(RENK)
            .tolist()
        ),
        customdata=df[
            ["Ürün", "ABC Grubu"]
        ].to_numpy(),
        name="Yıllık tüketim değeri",
        hovertemplate=(
            "<b>%{customdata[0]}</b><br>"
            "Değer: %{y:,.2f} TL<br>"
            "Grup: %{customdata[1]}"
            "<extra></extra>"
        )
    ),
    secondary_y=False
)

# Kümülatif yüzde çizgisi
fig.add_trace(
    go.Scatter(
        x=konumlar,
        y=df["Kümülatif Pay (%)"],
        mode="lines+markers",
        line=dict(
            color="#EF4444",
            width=3
        ),
        marker=dict(size=8),
        name="Kümülatif pay",
        customdata=df["Ürün"],
        hovertemplate=(
            "%{customdata}: %{y:.2f}%"
            "<extra></extra>"
        )
    ),
    secondary_y=True
)

# A ve B eşik çizgileri
for esik, renk, etiket in (
    (a_esigi, "#F59E0B", "A sınırı"),
    (b_esigi, "#10B981", "B sınırı")
):
    fig.add_hline(
        y=esik,
        line_dash="dash",
        line_color=renk,
        annotation_text=f"{etiket}: %{esik}",
        annotation_position="top left",
        secondary_y=True
    )

# Genel grafik tasarımı
fig.update_layout(
    template="plotly_dark",
    height=540,
    hovermode="x unified",
    margin=dict(
        l=35,
        r=35,
        t=45,
        b=95
    ),
    legend=dict(
        orientation="h",
        y=-0.24,
        x=0.5,
        xanchor="center"
    )
)

# Ürün isimleri
fig.update_xaxes(
    tickmode="array",
    tickvals=konumlar,
    ticktext=df["Ürün"].tolist(),
    tickangle=-25,
    title_text="Ürünler"
)

# Sol eksen: otomatik sayı aralığı
fig.update_yaxes(
    title_text="Yıllık Tüketim Değeri (TL)",
    rangemode="tozero",
    nticks=6,
    tickformat=",.0f",
    secondary_y=False
)

# Sağ eksen: yüzde
fig.update_yaxes(
    title_text="Kümülatif Pay (%)",
    range=[0, 110],
    dtick=20,
    ticksuffix="%",
    secondary_y=True
)

st.plotly_chart(
    fig,
    width="stretch"
)


# ==========================================
# ABC GRUP DAĞILIMI
# ==========================================

st.divider()
st.subheader("📦 ABC Grup Dağılımı")

ozet = df.groupby(
    "ABC Grubu",
    as_index=False
).agg(**{
    "Ürün Sayısı": (
        "Ürün", "count"
    ),
    "Toplam Değer (TL)": (
        "Yıllık Değer (TL)", "sum"
    )
})

ozet["Değer Payı (%)"] = (
    ozet["Toplam Değer (TL)"]
    / toplam * 100
)

st.dataframe(
    ozet,
    hide_index=True,
    width="stretch"
)


# ==========================================
# MÜHENDİSLİK DEĞERLENDİRMESİ
# ==========================================

st.divider()

st.subheader(
    "🔎 Mühendislik Değerlendirmesi"
)

a_grubu = df[
    df["ABC Grubu"] == "A"
]

a_payi = (
    a_grubu["Yıllık Değer (TL)"].sum()
    / toplam * 100
)

st.info(
    f"A grubunda {len(a_grubu)} ürün bulunuyor. "
    f"Bu ürünler yıllık toplam değerin "
    f"%{a_payi:.2f} kısmını oluşturuyor."
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


# ==========================================
# EXCEL RAPORU
# ==========================================

st.divider()
st.subheader("📥 Analiz Raporu")

st.download_button(
    label="📗 Biçimlendirilmiş Excel raporunu indir",
    data=excel_dosyasi(
        df,
        "ABC Analizi"
    ),
    file_name="abc_analiz_raporu.xlsx",
    mime=MIME
)

st.caption(
    "BarisDevLab · ABC Stok Analizi v0.7"
)
