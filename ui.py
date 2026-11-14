"""Ortak tasarım sistemi: yerel kontroller ve kaçırılmış metinli HTML kartları."""
from html import escape
from base64 import b64encode
from pathlib import Path

import streamlit as st

VERSION = "2.3"

CSS = (Path(__file__).resolve().parent / "assets" / "theme.css").read_text(encoding="utf-8")


def apply_theme():
    # Yalnızca sabit CSS; kullanıcı girdisi veya içerik HTML'e eklenmez.
    st.html("<style>" + CSS + "</style>")


def sidebar_navigation():
    """İki sayfada aynı, oturumdan bağımsız anahtarlarla korunan kontrol alanı."""
    st.session_state.setdefault("saved_upload", None)
    st.session_state.setdefault("upload_revision", 0)
    st.session_state.setdefault("abc_targets", (80, 15, 5))
    st.html('<div class="abc-brand"><div class="abc-brand-mark">' + icon("chart") + '</div><div><strong>ABC Stok Analizi</strong><small>ENVANTER / KARAR DESTEK</small></div></div>')
    st.page_link("app.py", label="Analiz Paneli", icon=":material/space_dashboard:")
    st.page_link("pages/1_ABC_Rehberi.py", label="ABC Analizi Rehberi", icon=":material/menu_book:")
    st.divider()
    st.markdown("#### Hedef değer payları")
    st.caption("Ürün sayısını değil, parasal değeri ifade eder. Toplam %100 olmalıdır.")
    a, b, c = st.session_state.abc_targets
    with st.form("target_form"):
        a_input = st.slider("A grubu hedefi (%)", 0, 100, a, key="target_a")
        b_input = st.slider("B grubu hedefi (%)", 0, 100, b, key="target_b")
        c_input = st.slider("C grubu hedefi (%)", 0, 100, c, key="target_c")
        apply = st.form_submit_button("Hedefleri uygula", type="primary", width="stretch")
    if apply:
        total = a_input + b_input + c_input
        if total != 100:
            st.error(f"Hedeflerin toplamı %100 olmalı. Şu an %{total}. Önceki geçerli hedefler korunuyor.")
        else:
            st.session_state.abc_targets = (a_input, b_input, c_input)
            st.success("Hedefler güncellendi.")
    a, b, c = st.session_state.abc_targets
    with st.container(border=True):
        st.caption("GEÇERLİ SINIFLANDIRMA SINIRLARI")
        st.write(f"A/B **%{a}**  ·  B/C **%{a + b}**")
        st.caption(f"A %{a}  /  B %{b}  /  C %{c}")
    st.caption("Sınırı aşan ürün başladığı grupta kalır.")
    st.divider()
    st.markdown("#### Veri durumu")
    stored = st.session_state.saved_upload
    if stored:
        st.badge("Dosya yüklü", icon=":material/task_alt:", color="green")
        st.text(stored["name"])
        st.caption("Sayfalar arasında veriniz korunur.")
    else:
        st.badge("Dosya bekleniyor", icon=":material/upload_file:", color="blue")
        st.caption("Analize başlamak için Excel veya CSV yükleyin.")
    st.caption(f"BarisDevLab · v{VERSION}")


def hero(eyebrow, title, description, *, features=False):
    subtitle = '<p class="subtitle">Envanter Analitiği ve Karar Destek</p>' if features else ''
    tags = ''
    if features:
        tags = '<div class="abc-features">' + ''.join(
            f'<span>{icon(name)}{escape(label)}</span>' for name, label in [
                ('layers', 'ABC Sınıflandırması'), ('chart', 'Etkileşimli Grafikler'), ('download', 'Excel Raporlama'),
            ]
        ) + '</div>'
    st.html(f'<header class="abc-hero"><div class="abc-hero-top"><span class="abc-live-dot" aria-hidden="true"></span>{escape(eyebrow)}</div><h1>{escape(title)}</h1>{subtitle}<p class="description">{escape(description)}</p>{tags}</header>')


def section_header(number, title, description=None):
    detail = f'<p>{escape(description)}</p>' if description else ''
    st.html(f'<div class="abc-section"><span>{escape(str(number))}</span><div><h2>{escape(title)}</h2>{detail}</div></div>')


def guide_heading(number, title, color="blue"):
    """Rehber başlıkları: küçük numara etiketi ve bağımsız, yerel başlık."""
    st.badge(str(number), color=color)
    st.header(title)


def icon(name):
    """Ağ veya harici font gerektirmeyen yerel SVG simgeleri."""
    paths = {
        'chart': '<path d="M4 19V5m0 14h16M8 15v-4m5 4V7m5 8v-7"/>',
        'layers': '<path d="m3 8 9-5 9 5-9 5-9-5Zm0 5 9 5 9-5M3 18l9 5 9-5"/>',
        'download': '<path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5"/>',
        'value': '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 10h18m-7 5h4"/>',
        'products': '<path d="m3 7 9-4 9 4v10l-9 4-9-4V7Zm0 0 9 5 9-5M12 12v9"/>',
        'share': '<circle cx="12" cy="12" r="9"/><path d="M12 3v9h9"/>',
        'priority': '<path d="m4 16 5-5 4 3 7-10m-6 0h6v6"/>',
        'check': '<path d="m5 12 4 4L19 6"/>',
        'plan': '<rect x="4" y="4" width="16" height="17" rx="2"/><path d="M8 2v4m8-4v4M4 10h16m-11 4h6m-6 3h4"/>',
    }
    # st.html'nin HTML profili satır içi SVG'yi temizler. Sabit, yerel SVG'yi
    # bir veri görseli olarak sun; kişisel veri veya uzak görsel kullanılmaz.
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#A7CAFF" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + paths.get(name, paths['chart']) + '</svg>'
    encoded = b64encode(svg.encode('utf-8')).decode('ascii')
    return f'<img class="abc-icon" alt="" aria-hidden="true" src="data:image/svg+xml;base64,{encoded}">'


def metric_card_html(key, label, value, note='', share=None):
    """Bütün metinler HTML'den kaçırılır; kullanıcı verisi işaretleme olamaz."""
    symbol = {'total': 'value', 'products': 'products', 'a_share': 'share'}.get(key, 'layers')
    rail = ''
    if share is not None:
        percent = min(100.0, max(0.0, float(share)))
        rail = f'<div class="abc-kpi-rail" aria-hidden="true"><span style="width:{percent:.4f}%"></span></div>'
    return f'<article class="abc-kpi" data-kpi="{escape(str(key), quote=True)}" data-value="{escape(str(value), quote=True)}"><div class="abc-kpi-head"><span class="abc-kpi-icon">{icon(symbol)}</span><span class="abc-kpi-label">{escape(str(label))}</span></div><div class="abc-kpi-value">{escape(str(value))}</div><div class="abc-kpi-note">{escape(str(note))}</div>{rail}</article>'


def metric_card(key, label, value, note='', share=None):
    st.html(metric_card_html(key, label, value, note, share))


def kpi_grid(cards):
    """Tek, duyarlı CSS ızgarası; mobilde kartlar içerik sırasını korur."""
    st.html('<section class="abc-kpi-grid" aria-label="Envanter göstergeleri">' + ''.join(metric_card_html(**card) for card in cards) + '</section>')


def group_card(group, share, importance, description, strategy):
    st.html(group_card_html(group, share, importance, description, strategy))


def group_card_html(group, share, importance, description, strategy):
    if group not in ('A', 'B', 'C'):
        raise ValueError('Grup A, B veya C olmalıdır.')
    return f'<article class="abc-group group-{group}"><div class="abc-group-top"><span class="abc-group-letter">{group}</span><span class="abc-group-share">Hedef %{escape(str(share))}</span></div><h3>{escape(importance)} ekonomik öncelik</h3><p>{escape(description)}</p><p class="strategy"><strong>STOK KONTROL STRATEJİSİ</strong>{escape(strategy)}</p></article>'


def group_cards(cards):
    st.html('<section class="abc-group-grid" aria-label="ABC grupları">' + ''.join(group_card_html(*card) for card in cards) + '</section>')


def policy_block(title, description, note='', symbol='plan'):
    st.html(f'<article class="abc-policy"><div class="abc-policy-icon">{icon(symbol)}</div><div><h3>{escape(title)}</h3><p>{escape(description)}</p><small>{escape(note)}</small></div></article>')


def styled_table(data, formats, group_column=None):
    """Veriyi değiştirmeden aynı renk eşlemesini tüm sonuç tablolarına uygular."""
    styled = data.style.format(formats)
    if group_column and group_column in data.columns:
        tones = {'A': ('#183B6C', '#B7D2FF'), 'B': ('#423119', '#FFCF7B'), 'C': ('#103B48', '#89ECF7')}
        def group_style(value):
            background, foreground = tones.get(value, ('#10233D', '#F0F6FF'))
            return f'background-color: {background}; color: {foreground}; font-weight: 650'
        styled = styled.map(group_style, subset=[group_column])
    return styled


def footer(label="ABC STOK ANALİZİ"):
    with st.container(key="footer"):
        st.caption(f"BARISDEVLAB · {label} · v{VERSION}")
