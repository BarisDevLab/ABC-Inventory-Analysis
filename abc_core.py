"""Dosya okuma, doğrulama, ABC hesaplama ve Excel raporlama."""
import io
import math
import re
import unicodedata
import pandas as pd
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

FIELDS = [
    "Ürün",
    "Yıllık Tüketim",
    "Birim Fiyat (TL)"
]

COLORS = {
    "A": "#4F8CFF",
    "B": "#F59E0B",
    "C": "#22D3EE"
}

EXCEL_MIME = (
    "application/vnd.openxmlformats-officedocument."
    "spreadsheetml.sheet"
)


def tr_number(value, digits=2):
    result = f"{value:,.{digits}f}"

    return (
        result.replace(",", "_")
        .replace(".", ",")
        .replace("_", ".")
    )


def parse_number(value):
    if pd.isna(value):
        return float("nan")

    if isinstance(value, (int, float)):
        return float(value)

    text = str(value).strip()

    text = (
        text.replace("\u00a0", "")
        .replace(" ", "")
        .replace("₺", "")
        .replace("TL", "")
    )

    if not text:
        return float("nan")

    if "." in text and "," in text:
        if text.rfind(",") > text.rfind("."):
            text = text.replace(".", "").replace(",", ".")
        else:
            text = text.replace(",", "")

    elif "," in text:
        text = text.replace(",", ".")

    try:
        return float(text)
    except ValueError:
        return float("nan")


def read_file(raw, filename):
    if not raw or not raw.strip():
        raise ValueError("Dosya boş. Başlıkları ve en az bir ürün satırını ekleyin.")
    if filename.lower().endswith(".xlsx"):
        try:
            return pd.read_excel(io.BytesIO(raw))
        except Exception as error:
            raise ValueError("Excel dosyası okunamadı. Geçerli ve parola koruması olmayan bir .xlsx dosyası seçin.") from error

    if not filename.lower().endswith(".csv"):
        raise ValueError(
            "Yalnızca Excel ve CSV dosyaları desteklenir."
        )

    for encoding in ("utf-8-sig", "cp1254"):
        try:
            text = raw.decode(encoding)

            return pd.read_csv(
                io.StringIO(text),
                sep=None,
                engine="python",
                dtype=str
            )

        except UnicodeDecodeError:
            continue
        except Exception as error:
            raise ValueError("CSV dosyası okunamadı. Sütun ayraçlarını ve satır uzunluklarını kontrol edin.") from error

    raise ValueError(
        "CSV dosyasını UTF-8 olarak kaydedin."
    )


def sample_data():
    """Rehber ve deneme akışında kullanılan ortak örnek."""
    return pd.DataFrame([
        ["Motor", 100, 1500],
        ["Rulman", 500, 120],
        ["Sensör", 150, 400],
        ["Kayış", 300, 80],
        ["Vida", 2000, 5],
    ], columns=FIELDS)


def analysis_insights(data):
    """Tam analizden türetilen göstergeler; grafik filtreleri sonucu değiştirmez."""
    total = float(data["Yıllık Değer (TL)"].sum())
    if data.empty or total <= 0:
        raise ValueError("Yorum oluşturmak için pozitif toplam değerli analiz gereklidir.")
    ranked = data.sort_values("Yıllık Değer (TL)", ascending=False, kind="stable")
    return {
        "top_product": str(ranked.iloc[0]["Ürün"]),
        "top_value": float(ranked.iloc[0]["Yıllık Değer (TL)"]),
        "top_count": min(3, len(ranked)),
        "top_share": float(ranked.head(3)["Yıllık Değer (TL)"].sum() / total * 100),
        "a_share": float(data.loc[data["ABC Grubu"].eq("A"), "Yıllık Değer (TL)"].sum() / total * 100),
        "counts": {group: int(data["ABC Grubu"].eq(group).sum()) for group in ("A", "B", "C")},
    }


def calculate_abc(source, a_share, b_share):

    if not all(math.isfinite(float(x)) for x in (a_share, b_share)) or not (0 <= a_share <= 100 and 0 <= b_share <= 100 and a_share + b_share <= 100):
        raise ValueError("Hedef paylar 0–100 arasında olmalı; A ve B toplamı %100'ü aşmamalıdır.")

    source = source.rename(
        columns=lambda col: str(col).strip()
    )

    if source.columns.duplicated().any():
        raise ValueError("Tekrarlanan sütun başlıkları var.")

    missing = [
        col for col in FIELDS
        if col not in source.columns
    ]

    if missing:
        raise ValueError(
            "Eksik sütunlar: " + ", ".join(missing)
        )

    df = source[FIELDS].copy()

    if df.empty:
        raise ValueError(
            "Dosyada ürün bulunamadı."
        )

    if df.isna().any().any():
        raise ValueError(
            "Boş hücreler var. "
            "Lütfen bütün alanları doldurun."
        )

    df["Ürün"] = (
        df["Ürün"].astype(str).str.strip()
    )

    if df["Ürün"].eq("").any():
        raise ValueError(
            "Ürün adı boş bırakılamaz."
        )

    if df["Ürün"].map(lambda x: unicodedata.normalize("NFC", x).replace("İ", "i").replace("I", "ı").casefold()).duplicated().any():
        raise ValueError(
            "Tekrarlanan ürün adları var. "
            "Her ürünü tek satırda belirtin."
        )

    for col in FIELDS[1:]:
        df[col] = df[col].map(parse_number)

        if (
            df[col].isna().any()
            or not df[col].map(math.isfinite).all()
        ):
            raise ValueError(
                f"'{col}' sütununda geçersiz sayı var."
            )

        if df[col].lt(0).any():
            raise ValueError(
                f"'{col}' negatif olamaz."
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
            "çok büyük bir sayı oluştu."
        )

    df = df.sort_values(
        "Yıllık Değer (TL)",
        ascending=False,
        kind="stable"
    ).reset_index(drop=True)

    total = float(
        df["Yıllık Değer (TL)"].sum()
    )

    if not math.isfinite(total) or total <= 0:
        raise ValueError(
            "Toplam yıllık değer sıfırdan "
            "büyük olmalıdır."
        )

    df["Değer Payı (%)"] = (
        df["Yıllık Değer (TL)"]
        / total * 100
    )

    df["Kümülatif Pay (%)"] = (
        df["Değer Payı (%)"]
        .cumsum()
        .clip(upper=100)
    )

    previous = (
        df["Değer Payı (%)"]
        .cumsum()
        .shift(fill_value=0)
    )

    b_end = a_share + b_share

    df["ABC Grubu"] = [
        (
            "C" if value == 0
            else "A" if before < a_share and not math.isclose(before, a_share, abs_tol=1e-10, rel_tol=0)
            else "B" if before < b_end and not math.isclose(before, b_end, abs_tol=1e-10, rel_tol=0)
            else "C"
        )

        for value, before in zip(
            df["Yıllık Değer (TL)"],
            previous
        )
    ]

    return df, total


def create_excel(
    data,
    a=80,
    b=15,
    c=5,
    template=False
):

    if not template and (not all(math.isfinite(float(x)) and 0 <= x <= 100 for x in (a, b, c)) or not math.isclose(a + b + c, 100)):
        raise ValueError("Excel raporu için hedef payların toplamı %100 olmalıdır.")
    output = io.BytesIO()

    with pd.ExcelWriter(
        output,
        engine="openpyxl"
    ) as writer:

        sheet_name = (
            "Stok Şablonu"
            if template else "ABC Analizi"
        )

        data.to_excel(
            writer,
            sheet_name=sheet_name,
            index=False
        )

        if not template:
            group_summary = data.groupby(
                "ABC Grubu",
                as_index=False
            ).agg(**{
                "Ürün Sayısı": ("Ürün", "count"),
                "Toplam Değer (TL)": (
                    "Yıllık Değer (TL)", "sum"
                )
            })

            group_summary = group_summary.set_index("ABC Grubu").reindex(["A", "B", "C"], fill_value=0).reset_index()
            total = group_summary[
                "Toplam Değer (TL)"
            ].sum()

            group_summary["Değer Payı (%)"] = (
                group_summary["Toplam Değer (TL)"]
                / total * 100
            )

            group_summary.to_excel(
                writer,
                sheet_name="Grup Özeti",
                index=False
            )

            settings = pd.DataFrame({
                "Ayar": [
                    "A hedef payı",
                    "B hedef payı",
                    "C hedef payı",
                    "Sınıflandırma kuralı"
                ],
                "Değer": [
                    f"%{a}",
                    f"%{b}",
                    f"%{c}",
                    "Sınırı aşan ürün başladığı grupta kalır."
                ]
            })

            settings.to_excel(
                writer,
                sheet_name="Analiz Ayarları",
                index=False
            )

        for ws in writer.book.worksheets:
            ws.sheet_view.showGridLines = False
            ws.freeze_panes = "A2"
            ws.auto_filter.ref = ws.dimensions
            ws.row_dimensions[1].height = 30

            # Ürün adlarının Excel formülü olarak yürütülmesini engelle.
            for row in ws.iter_rows():
                for cell in row:
                    if cell.data_type == "f":
                        cell.data_type = "s"

            for cell in ws[1]:
                cell.fill = PatternFill(
                    "solid",
                    fgColor="243959"
                )
                cell.font = Font(
                    name="Calibri",
                    bold=True,
                    color="FFFFFF"
                )
                cell.alignment = Alignment(
                    horizontal="center",
                    vertical="center"
                )

            for index, column in enumerate(
                ws.columns, start=1
            ):
                heading = str(
                    column[0].value or ""
                )

                widths = {
                    "Ürün": 30,
                    "Yıllık Tüketim": 20,
                    "Birim Fiyat (TL)": 22,
                    "Yıllık Değer (TL)": 24,
                    "Toplam Değer (TL)": 24,
                    "Değer Payı (%)": 20,
                    "Kümülatif Pay (%)": 22,
                    "ABC Grubu": 17
                }

                ws.column_dimensions[
                    get_column_letter(index)
                ].width = widths.get(heading, 26)

                for cell in column[1:]:
                    if cell.row % 2 == 0:
                        cell.fill = PatternFill(
                            "solid",
                            fgColor="F1F5FB"
                        )

                    if heading in (
                        "Birim Fiyat (TL)",
                        "Yıllık Değer (TL)",
                        "Toplam Değer (TL)"
                    ):
                        cell.number_format = '#,##0.00 "TL"'

                    elif heading in (
                        "Değer Payı (%)",
                        "Kümülatif Pay (%)"
                    ):
                        cell.number_format = '0.00"%"'

                    elif heading == "Yıllık Tüketim":
                        cell.number_format = '#,##0.##'

                    elif (
                        heading == "ABC Grubu"
                        and cell.value in COLORS
                    ):
                        fill_color = {
                            "A": "DCE2FF",
                            "B": "FFF0D6",
                            "C": "D7F8EE"
                        }

                        cell.fill = PatternFill(
                            "solid",
                            fgColor=fill_color[cell.value]
                        )

                        cell.font = Font(
                            bold=True,
                            color="17243A"
                        )

    return output.getvalue()

