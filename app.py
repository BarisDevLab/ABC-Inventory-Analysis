
import io
import math
import streamlit as st
import pandas as pd
import plotly.graph_objects as go

from plotly.subplots import make_subplots
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

# ==========================================
# ABC STOK ANALİZ SİSTEMİ - v0.8
# BarisDevLab
# ==========================================

st.set_page_config(
    page_title="ABC Stok Analiz Sistemi",
    page_icon="📊",
    layout="wide"
)

SUTUNLAR = [
    "Ürün",
    "Yıllık Tüketim",
    "Birim Fiyat (TL)"
]

RENKLER = {
    "A": "#3B82F6",
    "B": "#F59E0B",
    "C": "#10B981"
}

MIME = (
    "application/vnd.openxmlformats-officedocument."
    "spreadsheetml.sheet"
)


# TÜRKÇE SAYI BİÇİMLENDİRME

def tr_sayi(sayi, basamak=2):
    sonuc = f"{sayi:,.{basamak}f}"
    return (
        sonuc.replace(",", "X")
        .replace(".", ",")
        .replace("X", ".")
    )


# ==========================================
# EXCEL RAPORU
# ==========================================

def excel_uret(tablo, sayfa_adi):
    bellek = io.BytesIO()

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
        sayfa.sheet_view.showGridLines = False

        for hucre in sayfa[1]:
            hucre.fill = PatternFill(
                "solid",
                fgColor="193453"
            )
            hucre.font = Font(
                name="Calibri",
                bold=True,
                color="FFFFFF"
            )
            hucre.alignment = Alignment(
                horizontal="center",
                vertical="center"
            )

        sayfa.row_dimensions[1].height = 28

        genislikler = {
            "Ürün": 30,
            "Yıllık Tüketim": 20,
            "Birim Fiyat (TL)": 23,
            "Yıllık Değer (TL)": 25,
            "Değer Payı (%)": 20,
            "Kümülatif Pay (%)": 22,
            "ABC Grubu": 17,
            "Ürün Sayısı": 19,
            "Toplam Değer (TL)": 25
        }

        for no, baslik in enumerate(
            tablo.columns, start=1
        ):
            harf = get_column_letter(no)

            sayfa.column_dimensions[harf].width = (
                genislikler.get(baslik, 23)
            )

            for satir in range(2, len(tablo) + 2):
                hucre = sayfa.cell(
                    row=satir,
                    column=no
                )

                hucre.alignment = Alignment(
                    vertical="center"
                )

                if satir % 2 == 0:
                    hucre.fill = PatternFill(
                        "solid",
                        fgColor="F4F7FB"
                    )

                if baslik in (
                    "Birim Fiyat (TL)",
                    "Yıllık Değer (TL)",
                    "Toplam Değer (TL)"
                ):
                    hucre.number_format = (
                        '#,##0.00 "TL"'
                    )

                elif baslik in (
                    "Değer Payı (%)",
                    "Kümülatif Pay (%)"
                ):
                    hucre.number_format = '0.00"%"'

                elif baslik in (
                    "Yıllık Tüketim",
                    "Ürün Sayısı"
                ):
                    hucre.number_format = '#,##0.##'

                elif (
                    baslik == "ABC Grubu"
                    and hucre.value in RENKLER
                ):
                    arka = {
                        "A": "DBEAFE",
                        "B": "FEF3C7",
                        "C": "D1FAE5"
                    }

                    hucre.fill = PatternFill(
                        "solid",
                        fgColor=arka[hucre.value]
                    )
                    hucre.font = Font(
                        bold=True,
                        color="17233B"
                    )

    return bellek.getvalue()


# ==========================================
# DOSYA OKUMA
# ==========================================

def dosya_oku(yukleme):

    if yukleme.name.lower().endswith(".xlsx"):
        return pd.read_excel(yukleme)

    ham = yukleme.getvalue()

    for kodlama in ("utf-8-sig", "cp1254"):
        try:
            metin = ham.decode(kodlama)
            return pd.read_csv(
                io.StringIO(metin),
                sep=None,
                engine="python"
            )
        except UnicodeDecodeError:
            continue

    raise ValueError(
        "CSV karakter kodlaması okunamadı."
    )


# ==========================================
# ABC HESAPLAMA
# ==========================================

def abc_analizi(veri, a_sinir, b_sinir):

    eksikler = [
        s for s in SUTUNLAR
        if s not in veri.columns
    ]

    if eksikler:
        raise ValueError(
            "Gerekli sütunlar eksik: "
            + ", ".join(eksikler)
        )

    df = veri[SUTUNLAR].copy()

    if df.empty:
        raise ValueError(
            "Dosyada analiz edilecek satır bulunamadı."
        )

    if df.isna().any().any():
        raise ValueError(
            "Dosyada boş hücre var. "
            "Lütfen boş alanları doldurun."
        )

    df["Ürün"] = (
        df["Ürün"].astype(str).str.strip()
    )

    if (df["Ürün"] == "").any():
        raise ValueError(
            "Ürün adı boş bırakılamaz."
        )

    if df["Ürün"].str.casefold().duplicated().any():
        raise ValueError(
            "Aynı ürün adı tekrar ediyor. "
            "Her ürünü tek satırda belirtin."
        )

    for sutun in SUTUNLAR[1:]:

        df[sutun] = pd.to_numeric(
            df[sutun],
            errors="coerce"
        )

        if (
            df[sutun].isna().any()
            or not df[sutun].map(math.isfinite).all()
        ):
            raise ValueError(
                f"'{sutun}' sütununda geçersiz sayı var. "
                "Sayısal hücre kullanın."
            )

        if (df[sutun] < 0).any():
            raise ValueError(
                f"'{sutun}' sütununda negatif değer var."
            )

    df["Yıllık Değer (TL)"] = (
        df["Yıllık Tüketim"]
        * df["Birim Fiyat (TL)"]
    )

    if not df["Yıllık Değer (TL)"].map(
        math.isfinite
    ).all():
        raise ValueError(
            "Yıllık değer hesaplamasında "
            "geçersiz veya çok büyük sayı var."
        )

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
            "sıfırdan büyük olmalıdır."
        )

    df["Değer Payı (%)"] = (
        df["Yıllık Değer (TL)"] / toplam * 100
    )

    df["Kümülatif Pay (%)"] = (
        df["Değer Payı (%)"]
        .cumsum()
        .clip(upper=100)
    )

    onceki = (
        df["Değer Payı (%)"]
        .cumsum()
        .shift(fill_value=0)
    )

    df["ABC Grubu"] = [
        (
            "C" if deger == 0
            else "A" if pay < a_sinir
            else "B" if pay < b_sinir
            else "C"
        )
        for deger, pay in zip(
            df["Yıllık Değer (TL)"],
            onceki
        )
    ]

    return df, toplam


# ==========================================
# ETKİLEŞİMLİ PARETO GRAFİĞİ
# ==========================================

def pareto_grafigi(df, a_sinir, b_sinir):

    n = len(df)
    konum = list(range(n))

    fig = make_subplots(
        specs=[[{"secondary_y": True}]]
    )

    detay = [
        [
            ad,
            grup,
            tr_sayi(deger),
            tr_sayi(pay)
        ]
        for ad, grup, deger, pay in zip(
            df["Ürün"],
            df["ABC Grubu"],
            df["Yıllık Değer (TL)"],
            df["Kümülatif Pay (%)"]
        )
    ]

    # Sütun grafiği
    fig.add_trace(
        go.Bar(
            x=konum,
            y=df["Yıllık Değer (TL)"],
            marker_color=(
                df["ABC Grubu"]
                .map(RENKLER)
                .tolist()
            ),
            customdata=detay,
            name="Yıllık tüketim değeri",
            hovertemplate=(
                "<b>%{customdata[0]}</b><br>"
                "Yıllık değer: %{customdata[2]} TL<br>"
                "ABC grubu: %{customdata[1]}"
                "<extra></extra>"
            )
        ),
        secondary_y=False
    )

    # Kümülatif yüzde
    fig.add_trace(
        go.Scatter(
            x=konum,
            y=df["Kümülatif Pay (%)"],
            mode="lines+markers",
            line=dict(
                color="#EF4444",
                width=3
            ),
            marker=dict(size=8),
            customdata=detay,
            name="Kümülatif pay",
            hovertemplate=(
                "<b>%{customdata[0]}</b><br>"
                "Kümülatif pay: %%{customdata[3]}"
                "<extra></extra>"
            )
        ),
        secondary_y=True
    )

    # Eşikler - üst üste binen etiket yok
    for esik, renk, ad in (
        (a_sinir, "#F59E0B", "A eşiği"),
        (b_sinir, "#10B981", "B eşiği")
    ):
        fig.add_trace(
            go.Scatter(
                x=[0, max(n - 1, 0)],
                y=[esik, esik],
                mode="lines",
                line=dict(
                    color=renk,
                    width=2,
                    dash="dash"
                ),
                name=f"{ad} (%{esik})",
                hoverinfo="skip"
            ),
            secondary_y=True
        )

    # Çok ürün varsa eksen etiketlerini seyrekleştir
    adim = max(1, math.ceil(n / 18))
    gosterilen = list(range(0, n, adim))

    # Sol eksen için okunaklı sayı aralıkları
    en_buyuk = float(
        df["Yıllık Değer (TL)"].max()
    )

    ham_adim = max(en_buyuk / 5, 0.01)

    derece = 10 ** math.floor(
        math.log10(ham_adim)
    )

    guzel_adim = next(
        (
            f * derece
            for f in (1, 2, 2.5, 5, 10)
            if f * derece >= ham_adim
        ),
        10 * derece
    )

    ust = math.ceil(
        en_buyuk / guzel_adim
    ) * guzel_adim

    tikler = [
        i * guzel_adim
        for i in range(
            int(round(ust / guzel_adim)) + 1
        )
    ]

    fig.update_layout(
        template="plotly_dark",
        height=540,
        hovermode="closest",
        margin=dict(
            l=55,
            r=60,
            t=35,
            b=95
        ),
        legend=dict(
            orientation="h",
            x=0,
            y=-0.27
        ),
        bargap=0.22
    )

    fig.update_xaxes(
        tickmode="array",
        tickvals=gosterilen,
        ticktext=[
            df.loc[i, "Ürün"]
            for i in gosterilen
        ],
        tickangle=-25,
        title_text="Ürünler"
    )

    fig.update_yaxes(
        title_text="Yıllık tüketim değeri (TL)",
        range=[0, ust * 1.08],
        tickmode="array",
        tickvals=tikler,
        ticktext=[
            tr_sayi(x, 0) for x in tikler
        ],
        secondary_y=False
    )

    fig.update_yaxes(
        title_text="Kümülatif pay (%)",
        range=[0, 110],
        tickmode="array",
        tickvals=[0, 20, 40, 60, 80, 100],
        ticktext=[
            f"%{x}"
            for x in (0, 20, 40, 60, 80, 100)
        ],
        secondary_y=True
    )

    return fig


# ==========================================
# ANA SAYFA
# ==========================================

st.title("📊 ABC Stok Analiz Sistemi")

st.caption(
    "Envanter Yönetimi ve Karar Destek "
    "| BarisDevLab · v0.8"
)

with st.sidebar:

    st.header("⚙️ Analiz Ayarları")

    a_sinir = st.slider(
        "A grubu sınırı (%)",
        50, 90, 80
    )

    b_sinir = st.slider(
        "B grubu bitiş sınırı (%)",
        a_sinir + 1,
        100,
        max(95, a_sinir + 1)
    )

    st.info(
        "Sınırı aşan ürün başladığı grupta kalır. "
        "Grup payları eşiklerle birebir aynı "
        "olmayabilir."
    )


# ==========================================
# ABC ANALİZİ TANITIMI
# ==========================================

st.subheader("📖 ABC Analizi Nedir?")

st.write(
    "ABC analizi, stok kalemlerini "
    "**yıllık tüketim değerlerine** göre "
    "önceliklendiren bir envanter yönetimi "
    "yöntemidir. Amaç, yönetim zamanını ve "
    "kontrol kaynaklarını ekonomik etkisi "
    "daha yüksek ürünlere yönlendirmektir."
)

c1, c2, c3 = st.columns(3)

with c1:
    st.info(
        "**A grubu — yüksek öncelik**\n\n"
        "Toplam yıllık değerin yaklaşık "
        "ilk %80'ine katkı yapan ürünler."
    )

with c2:
    st.warning(
        "**B grubu — orta öncelik**\n\n"
        "Kümülatif değerde yaklaşık "
        "%80–95 arasındaki ürünler."
    )

with c3:
    st.success(
        "**C grubu — düşük öncelik**\n\n"
        "Kümülatif değerin son yaklaşık "
        "%5'lik kısmındaki ürünler."
    )

with st.expander(
    "Hesaplama yöntemi ve sonuçları nasıl yorumlamalıyım?"
):
    st.markdown(
        "**Yıllık tüketim değeri = "
        "Yıllık tüketim miktarı × Birim fiyat.** "
        "Ürünler bu değere göre büyükten küçüğe "
        "sıralanır, toplam içindeki payları ve "
        "kümülatif yüzdeleri hesaplanır. "
        "Varsayılan sınıflandırma sınırları "
        "%80 ve %95'tir; soldaki panelden "
        "değiştirebilirsiniz. Sınırı aşan ürün "
        "başladığı grupta tutulur. "
        "ABC analizi tek başına stok miktarını "
        "veya sipariş zamanını belirlemez; "
        "kritiklik, talep değişkenliği ve "
        "tedarik süresi ayrıca değerlendirilmelidir."
    )


# ==========================================
# VERİ YÜKLEME
# ==========================================

st.divider()
st.subheader("📁 Veri Yükleme")

st.caption(
    "Excel şablonundaki sütun adlarını "
    "değiştirmeyin. Miktar ve fiyat "
    "alanlarına sayı girin."
)

bos_sablon = pd.DataFrame(columns=SUTUNLAR)

st.download_button(
    "📥 Boş Excel şablonunu indir",
    data=excel_uret(
        bos_sablon,
        "Stok Şablonu"
    ),
    file_name="stok_sablonu.xlsx",
    mime=MIME
)

dosya = st.file_uploader(
    "Excel (.xlsx) veya CSV (.csv) "
    "dosyanızı yükleyin",
    type=["xlsx", "csv"]
)

# Veri yüklenmemişse sonuç gösterme
if dosya is None:
    st.info(
        "Henüz veri yüklenmedi. "
        "Analize başlamak için "
        "stok dosyanızı yükleyin."
    )
    st.stop()

try:
    df, toplam = abc_analizi(
        dosya_oku(dosya),
        a_sinir,
        b_sinir
    )

except (
    ValueError,
    KeyError,
    pd.errors.ParserError,
    OSError
) as hata:
    st.error(
        f"Dosya analiz edilemedi: {hata}"
    )
    st.stop()

except Exception as hata:
    st.error(
        "Dosya işlenirken beklenmeyen "
        f"bir sorun oluştu: {hata}"
    )
    st.stop()

st.success(
    f"{len(df)} ürün analiz edildi. "
    f"Veri kaynağı: {dosya.name}"
)


# ==========================================
# GENEL STOK ÖZETİ
# ==========================================

st.divider()
st.subheader("📈 Genel Stok Özeti")

kartlar = st.columns(5)

kartlar[0].metric(
    "Toplam yıllık değer",
    f"{tr_sayi(toplam)} TL"
)

kartlar[1].metric(
    "Ürün sayısı",
    len(df)
)

for kart, grup in zip(
    kartlar[2:],
    ("A", "B", "C")
):
    kart.metric(
        f"{grup} grubu",
        int((df["ABC Grubu"] == grup).sum())
    )


# ==========================================
# SINIFLANDIRMA TABLOSU
# ==========================================

st.divider()
st.subheader("📋 ABC Sınıflandırma Tablosu")

st.dataframe(
    df.style.format({
        "Yıllık Tüketim": (
            lambda x: (
                tr_sayi(x, 0)
                if float(x).is_integer()
                else tr_sayi(x)
            )
        ),
        "Birim Fiyat (TL)":
            lambda x: tr_sayi(x),
        "Yıllık Değer (TL)":
            lambda x: tr_sayi(x),
        "Değer Payı (%)":
            lambda x: f"%{tr_sayi(x)}",
        "Kümülatif Pay (%)":
            lambda x: f"%{tr_sayi(x)}"
    }),
    hide_index=True,
    width="stretch"
)


# ==========================================
# PARETO GRAFİĞİ
# ==========================================

st.divider()
st.subheader("📊 Etkileşimli Pareto Grafiği")

st.caption(
    "Mavi: A · Turuncu: B · Yeşil: C. "
    "Sütunlara veya çizgiye gelerek "
    "değerleri inceleyebilirsiniz."
)

st.plotly_chart(
    pareto_grafigi(df, a_sinir, b_sinir),
    width="stretch",
    theme=None
)


# ==========================================
# GRUP DAĞILIMI
# ==========================================

st.divider()
st.subheader("📦 ABC Grup Dağılımı")

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
        "Toplam Değer (TL)":
            lambda x: tr_sayi(x),
        "Değer Payı (%)":
            lambda x: f"%{tr_sayi(x)}"
    }),
    hide_index=True,
    width="stretch"
)


# ==========================================
# MÜHENDİSLİK DEĞERLENDİRMESİ
# ==========================================

st.divider()
st.subheader("🔎 Mühendislik Değerlendirmesi")

a_urunler = df.loc[
    df["ABC Grubu"] == "A"
]

a_oran = (
    a_urunler["Yıllık Değer (TL)"].sum()
    / toplam * 100
)

st.info(
    f"A grubunda {len(a_urunler)} ürün "
    f"bulunuyor. Bu ürünlerin toplam "
    f"yıllık değer payı %{tr_sayi(a_oran)}."
)

st.write(
    "**A grubu:** Sıkı kontrol, talep ve "
    "tedarik takibi.\n\n"
    "**B grubu:** Periyodik kontrol.\n\n"
    "**C grubu:** Daha basit kontrol politikaları."
)

st.caption(
    "Bu öneriler genel niteliktedir; "
    "kritik parçalarda tedarik riski ve "
    "duruş maliyeti de değerlendirilmelidir."
)


# ==========================================
# RAPOR İNDİRME
# ==========================================

st.divider()
st.subheader("📥 Raporu İndir")

st.download_button(
    "📗 Biçimlendirilmiş Excel analiz raporunu indir",
    data=excel_uret(df, "ABC Analizi"),
    file_name="abc_analiz_raporu.xlsx",
    mime=MIME
)

st.caption(
    "BarisDevLab · ABC Stok Analiz Sistemi · v0.8"
)
