"""Etkileşimli analiz grafikleri."""
import math
from html import escape
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from abc_core import COLORS, tr_number

def _detail_number(value):
    """Küçük, sıfır olmayan değerler bilgi kutusunda sıfıra yuvarlanmaz."""
    value = float(value)
    digits = max(2, math.ceil(-math.log10(abs(value))) + 1) if 0 < abs(value) < .01 else 2
    if digits > 10:
        return f"{value:.2e}".replace(".", ",")
    return tr_number(value, digits)


def _value_ticks(maximum, compact):
    """Görsel eksen ölçeği; yıllık değerleri veya hesaplamayı değiştirmez."""
    if maximum == 0:
        step, ceiling = .2, 1.0
        ticks = [0, .2, .4, .6, .8, 1]
    else:
        rough = maximum / 5
        magnitude = 10 ** math.floor(math.log10(rough)) if rough > 0 else 0
        if magnitude == 0:
            return [0, maximum], ["0", _detail_number(maximum)], maximum, "TL"
        step = next(factor * magnitude for factor in (1, 2, 2.5, 5, 10) if factor * magnitude >= rough)
        count = math.ceil(maximum / step)
        ceiling = step * count
        if not math.isfinite(ceiling):
            ceiling = maximum
        ticks = [i * step for i in range(count + 1) if math.isfinite(i * step)]
    scale = 1000 if compact and maximum >= 1000 else 1
    small_power = math.floor(math.log10(maximum)) if compact and 0 < maximum < .001 else None
    if small_power is not None and 10 ** small_power > 0:
        scale = 10 ** small_power
    normalized = step / scale
    precision = max(0, -math.floor(math.log10(normalized)))
    for _ in range(3):
        if math.isclose(normalized, round(normalized, precision), rel_tol=1e-9, abs_tol=0):
            break
        precision += 1
    precision = max(precision, 0 if compact else 2)
    labels = [tr_number(v / scale, precision) if precision <= 10 else _detail_number(v / scale) for v in ticks]
    upper = ceiling * 1.08
    if not math.isfinite(upper):
        upper = ceiling
    title = f"×10<sup>{small_power}</sup> TL" if small_power is not None and scale != 1 else "Bin TL" if scale == 1000 else "TL" if compact else "Yıllık tüketim değeri (TL)"
    return ticks, labels, upper, title


def pareto_chart(df, a_share, b_share, dragmode="zoom", compact=False):
    if df.empty:
        raise ValueError("Grafikte gösterilecek ürün bulunamadı.")
    positions = list(range(len(df)))
    details = [
        [escape(str(name)), group, _detail_number(value), _detail_number(share),
         _detail_number(cumulative), tr_number(quantity, 0) if float(quantity).is_integer() else _detail_number(quantity),
         _detail_number(price)]
        for name, group, value, share, cumulative, quantity, price in zip(
            df["Ürün"], df["ABC Grubu"], df["Yıllık Değer (TL)"],
            df["Değer Payı (%)"], df["Kümülatif Pay (%)"], df["Yıllık Tüketim"], df["Birim Fiyat (TL)"],
        )
    ]
    tooltip = (
        "<b>%{customdata[0]}</b><br>ABC grubu: %{customdata[1]}<br><br>"
        "Yıllık tüketim miktarı: %{customdata[5]}<br>"
        "Birim fiyat: %{customdata[6]} TL<br>"
        "Yıllık değer: %{customdata[2]} TL<br>"
        "Değer payı: %{customdata[3]}%<br>"
        "Kümülatif pay: %{customdata[4]}%<extra></extra>"
    )
    fig = make_subplots(specs=[[{"secondary_y": True}]])
    fig.add_trace(go.Bar(
        x=positions, y=df["Yıllık Değer (TL)"], name="Yıllık değer", width=.66,
        marker={"color": df["ABC Grubu"].map(COLORS).tolist(), "line": {"color": "#263B54", "width": .5}},
        customdata=details, hovertemplate=tooltip,
    ), secondary_y=False)
    fig.add_trace(go.Scatter(
        x=positions, y=df["Kümülatif Pay (%)"], name="Kümülatif pay",
        mode="lines+markers" if len(df) <= 35 else "lines", cliponaxis=False,
        line={"color": "#FB7185", "width": 3},
        marker={"size": 5, "color": "#FB7185", "line": {"color": "#0D1B2E", "width": 1}},
        customdata=details, hovertemplate=tooltip,
    ), secondary_y=True)
    for threshold, color, label in [
        (a_share, COLORS["B"], "A/B"), (a_share + b_share, COLORS["C"], "B/C"),
    ]:
        fig.add_trace(go.Scatter(
            x=[-.5, len(df)-.5], y=[threshold, threshold], mode="lines",
            line={"color": color, "width": 1.25, "dash": "dash"},
            name=f"{label} · %{threshold}", hoverinfo="skip", cliponaxis=False,
        ), secondary_y=True)
    maximum = float(df["Yıllık Değer (TL)"].max())
    ticks, labels, upper, title = _value_ticks(maximum, compact)
    limit = 4 if compact else 8
    interval = max(1, math.ceil(len(df) / limit))
    shown = list(range(0, len(df), interval))
    max_label = 10 if compact else 14
    names = [escape(str(df.iloc[i]["Ürün"])[:max_label] + ("…" if len(str(df.iloc[i]["Ürün"])) > max_label else "")) for i in shown]
    fig.update_layout(
        template="plotly_dark", height=440 if compact else 475,
        paper_bgcolor="#0D1B2E", plot_bgcolor="#0D1B2E", separators=",.",
        font={"color": "#B4C6DF", "family": "Segoe UI, sans-serif", "size": 12},
        margin={"l": 8, "r": 8, "t": 52, "b": 105} if compact else {"l": 20, "r": 24, "t": 44, "b": 60},
        hovermode="closest", hoverlabel={"bgcolor": "#152B49", "bordercolor": "#4F8CFF", "font": {"color": "#F0F6FF", "size": 13}, "namelength": -1},
        dragmode=dragmode, bargap=.26,
        legend={"orientation": "h", "x": 0, "y": -.24 if compact else 1.02,
                "yanchor": "top" if compact else "bottom", "entrywidthmode": "fraction" if compact else "pixels",
                "entrywidth": .5 if compact else 125, "font": {"size": 11}, "bgcolor": "rgba(0,0,0,0)"},
    )
    fig.update_xaxes(
        tickmode="array", tickvals=shown, ticktext=names, tickangle=-35 if compact else -28,
        title_text=None if compact else "Ürünler · Azalan yıllık değer", showgrid=False,
        range=[-.6, len(df)-.4], automargin=True, fixedrange=False,
    )
    fig.update_yaxes(
        title_text=title, range=[0, upper], tickmode="array", tickvals=ticks, ticktext=labels,
        gridcolor="#263B54", gridwidth=1, zerolinecolor="#263B54", automargin=True, secondary_y=False,
    )
    fig.update_yaxes(
        title_text=None if compact else "Kümülatif pay (%)", range=[0, 100],
        tickmode="array", tickvals=[0, 20, 40, 60, 80, 100], ticktext=[f"%{x}" for x in [0, 20, 40, 60, 80, 100]],
        showgrid=False, automargin=True, secondary_y=True,
    )
    return fig



def distribution_chart(summary):

    total = float(summary["Toplam Değer (TL)"].sum())
    shares = summary["Toplam Değer (TL)"] / total * 100
    product_count = int(summary["Ürün Sayısı"].sum())

    fig = go.Figure(
        go.Pie(
            labels=summary["ABC Grubu"],
            values=summary["Toplam Değer (TL)"],
            hole=0.76,
            direction="clockwise",
            rotation=90,
            sort=False,
            marker={
                "colors": [
                    COLORS[group]
                    for group in summary["ABC Grubu"]
                ],
                "line": {"color": "#10233D", "width": 3},
            },
            textinfo="text",
            text=[f"{g} · %{tr_number(p)}" if p >= 4 else "" for g, p in zip(summary['ABC Grubu'], shares)],
            textposition="inside",
            insidetextorientation="horizontal",
            textfont={"color": "#071120", "size": 13},
            customdata=[[tr_number(v), int(n), tr_number(p)] for v, n, p in zip(summary['Toplam Değer (TL)'], summary['Ürün Sayısı'], shares)],
            hovertemplate=(
                "Grup %{label}<br>"
                "Yıllık değer: %{customdata[0]} TL<br>Ürün sayısı: %{customdata[1]}<br>Değer payı: %{customdata[2]}%"
                "<extra></extra>"
            )
        )
    )

    fig.update_layout(
        template="plotly_dark",
        height=260,
        paper_bgcolor="#10233D",
        font={"color": "#F0F6FF", "family": "Segoe UI, sans-serif"},
        uniformtext={"minsize": 12, "mode": "hide"},
        hoverlabel={"bgcolor": "#12243D", "bordercolor": "#29415F", "font": {"color": "#EAF2FF", "size": 13}},
        margin={
            "l": 6,
            "r": 6,
            "t": 8,
            "b": 8
        },
        showlegend=False,
        annotations=[{
            "text": f"<b>{tr_number(product_count, 0)}</b><br><span style='font-size:13px'>toplam ürün</span>",
            "x": 0.5,
            "y": 0.5,
            "showarrow": False,
            "font": {
                "size": 30,
                "color": "#EAF2FF"
            }
        }]
    )

    return fig


def plot_options(filename="abc_stok_grafigi"):
    return {
        "displaylogo": False,
        "displayModeBar": True,
        "scrollZoom": True,
        "responsive": True,
        "doubleClick": "reset",
        "locale": "tr",
        "locales": {
            "tr": {
                "dictionary": {
                    "Download plot as a PNG": "Grafiği PNG olarak indir",
                    "Zoom": "Yakınlaştır",
                    "Pan": "Kaydır",
                    "Zoom in": "Yakınlaştır",
                    "Zoom out": "Uzaklaştır",
                    "Autoscale": "Otomatik ölçekle",
                    "Reset axes": "Eksenleri sıfırla",
                    "Reset": "Sıfırla",
                    "Toggle Spike Lines": "İzleme çizgilerini aç/kapat",
                    "Show closest data on hover": "En yakın veriyi göster",
                    "Compare data on hover": "Verileri karşılaştır",
                    "Double-click to zoom back out": "Uzaklaştırmak için çift tıklayın",
                    "Double-click on legend to isolate one trace": "Tek seriyi göstermek için açıklamaya çift tıklayın",
                    "Taking snapshot - this may take a few seconds": "Grafik hazırlanıyor; birkaç saniye sürebilir",
                    "Taking snapshot - this may take a few seconds.": "Grafik hazırlanıyor; birkaç saniye sürebilir.",
                    "Preparing image - this may take a few seconds": "Görsel hazırlanıyor; birkaç saniye sürebilir",
                    "Image download succeeded - %s": "Görsel indirildi - %s",
                    "Image download succeeded - ": "Görsel indirildi - ",
                    "Image download succeeded -": "Görsel indirildi -",
                    "Image download succeeded - abc_pareto_analizi.png": "Görsel indirildi - abc_pareto_analizi.png",
                    "Image download succeeded - abc_deger_dagilimi.png": "Görsel indirildi - abc_deger_dagilimi.png",
                    "Snapshot succeeded": "Grafik hazırlandı",
                    "Sorry, there was a problem downloading your snapshot!": "Grafik indirilemedi",
                },
                "format": {"decimal": ",", "thousands": ".", "grouping": [3]},
            }
        },
        "modeBarButtonsToRemove": ["lasso2d", "select2d"],
        "toImageButtonOptions": {
            "format": "png",
            "filename": filename,
            "scale": 2,
            "width": 1440,
            "height": 800,
        }
    }

