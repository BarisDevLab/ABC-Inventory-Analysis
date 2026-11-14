"""Çevrimdışı hesaplama, dosya ve Streamlit regresyon testleri."""
import io
import importlib
import subprocess
import sys
import unittest
from pathlib import Path
from html.parser import HTMLParser

import pandas as pd
from openpyxl import load_workbook
from streamlit.testing.v1 import AppTest

from abc_core import COLORS, FIELDS, analysis_insights, calculate_abc, create_excel, parse_number, read_file, sample_data
from abc_charts import pareto_chart, distribution_chart, plot_options

ROOT = Path(__file__).resolve().parent


def read_kpis(app):
    """Özel kartların ekranda gösterdiği gerçek değerleri semantik HTML'den oku."""
    class CardParser(HTMLParser):
        def __init__(self):
            super().__init__()
            self.values = {}

        def handle_starttag(self, tag, attrs):
            attributes = dict(attrs)
            if tag == 'article' and 'data-kpi' in attributes:
                self.values[attributes['data-kpi']] = attributes['data-value']
    parser = CardParser()
    for element in app.get('html'):
        parser.feed(element.proto.body)
    return parser.values


class ImportIntegrationTests(unittest.TestCase):
    def test_all_local_imports_in_fresh_process(self):
        # Ana panel/rehber henüz çalışmadan bütün yerel import sözleşmelerini
        # yeni süreçte denetle; mevcut test sürecinin modül önbelleğine güvenme.
        script = '''
import ast
import importlib
from pathlib import Path

root = Path.cwd().resolve()
local_names = {"abc_core", "abc_charts", "ui"}
for filename in ["app.py", "abc_core.py", "abc_charts.py", "ui.py", "pages/1_ABC_Rehberi.py"]:
    tree = ast.parse((root / filename).read_text(encoding="utf-8-sig"))
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module in local_names:
            module = importlib.import_module(node.module)
            assert Path(module.__file__).resolve() == root / (node.module + ".py")
            for alias in node.names:
                assert hasattr(module, alias.name), f"{filename}: {node.module}.{alias.name} eksik"
from abc_core import analysis_insights, calculate_abc, sample_data
data, total = calculate_abc(sample_data(), 80, 15)
assert total == 304000
assert analysis_insights(data)["top_product"] == "Motor"
from streamlit.testing.v1 import AppTest
app = AppTest.from_file(str(root / "app.py"), default_timeout=30).run()
assert not app.exception, str(app.exception)
app.switch_page("pages/1_ABC_Rehberi.py").run()
assert not app.exception, str(app.exception)
print("Yerel importlar, otomatik analiz ve iki Streamlit sayfasi: OK")
'''
        result = subprocess.run(
            [sys.executable, '-c', script], cwd=ROOT,
            capture_output=True, text=True, encoding='utf-8', errors='replace', timeout=60,
        )
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn('Streamlit sayfasi: OK', result.stdout)

    def test_stale_core_module_is_refreshed_on_start(self):
        core = importlib.import_module('abc_core')
        original = core.analysis_insights
        # Eski sunucu sürecinde henüz eklenmemiş fonksiyonun yokluğunu taklit et.
        del core.analysis_insights
        try:
            with self.assertRaises(ImportError):
                exec('from abc_core import analysis_insights', {})
            app = AppTest.from_file(str(ROOT / 'app.py'), default_timeout=30).run()
            self.assertFalse(app.exception)
            self.assertTrue(callable(core.analysis_insights))
            next(b for b in app.button if b.label == 'Örnek veriyle dene').click().run()
            self.assertFalse(app.exception)
            self.assertEqual(read_kpis(app)['total'], '304.000,00 TL')
            self.assertTrue(any('İlk 3 ürünün' in item.value for item in app.markdown))
        finally:
            core.analysis_insights = original


class RenderingTests(unittest.TestCase):
    def test_guide_titles_tabs_and_summaries(self):
        app = AppTest.from_file(str(ROOT / 'app.py'), default_timeout=30).run()
        app.switch_page('pages/1_ABC_Rehberi.py').run()
        self.assertFalse(app.exception)
        headings = [heading.value for heading in app.header]
        self.assertIn('ABC Analizi Nedir?', headings)
        self.assertIn('Pareto İlkesi', headings)
        self.assertFalse(any(title.startswith(('01 /', '02 /')) for title in headings))
        self.assertEqual([tab.label for tab in app.tabs], ['Genel Bakış', 'Hesaplama Adımları', 'Çözümlü Örnekler', 'Mühendislik Uygulamaları'])
        self.assertTrue(any('Temel yaklaşım' in item.value for item in app.info))
        self.assertTrue(any('Önemli bilgi' in item.value for item in app.info))

    def test_custom_card_escapes_text_and_attributes(self):
        from ui import metric_card_html, group_card_html
        payload = '\"><img src=x onerror=alert(1)><script>alert(1)</script>'
        class Tags(HTMLParser):
            def __init__(self):
                super().__init__()
                self.tags = []
                self.attributes = []
            def handle_starttag(self, tag, attrs):
                self.tags.append(tag)
                self.attributes.extend(attrs)
        parser = Tags()
        parser.feed(metric_card_html('total', payload, payload, payload))
        parser.feed(group_card_html('A', 80, 'Yüksek', payload, payload))
        self.assertNotIn('script', parser.tags)
        self.assertTrue(all(value.startswith('data:image/svg+xml;base64,') for name, value in parser.attributes if name == 'src'))
        self.assertFalse(any(name.startswith('on') for name, _ in parser.attributes))
        self.assertIn(('data-value', payload), parser.attributes)

    def test_all_cards_graphs_and_tables_render_together(self):
        app = AppTest.from_file(str(ROOT / 'app.py'), default_timeout=30).run()
        next(b for b in app.button if b.label == 'Örnek veriyle dene').click().run()
        self.assertFalse(app.exception)
        cards = read_kpis(app)
        self.assertEqual(cards, {'total': '304.000,00 TL', 'products': '5', 'a_share': '%88,82', 'A': '3', 'B': '1', 'C': '1'})
        self.assertEqual(len(app.metric), 0)
        self.assertEqual(len(app.get('plotly_chart')), 2)
        self.assertEqual(len(app.dataframe), 3)
        app.switch_page('pages/1_ABC_Rehberi.py').run()
        self.assertFalse(app.exception)
        self.assertEqual(len(app.tabs), 4)
        self.assertEqual(len(app.dataframe), 2)
        self.assertEqual(read_kpis(app)['example_total'], '304.000 TL')
        html = ''.join(e.proto.body for e in app.get('html'))
        for name in ['Stok Yönetimi', 'Satın Alma Yönetimi', 'Depo Yönetimi', 'Üretim Planlama', 'Tedarik Zinciri Yönetimi']:
            self.assertIn(name, html)


class CalculationTests(unittest.TestCase):
    def test_insights_use_actual_data(self):
        source = pd.DataFrame([
            ['Küçük', 10, 10], ['Kritik motor', 4, 100],
            ['Parça', 30, 10], ['Takım', 20, 10],
        ], columns=FIELDS)
        df, _ = calculate_abc(source, 80, 15)
        result = analysis_insights(df)
        self.assertEqual(result['top_product'], 'Kritik motor')
        self.assertEqual(result['top_value'], 400)
        self.assertEqual(result['top_share'], 90)
        self.assertEqual(result['a_share'], 90)
        self.assertEqual(result['counts'], {'A': 3, 'B': 1, 'C': 0})
        # Yorum yalnızca sıraya değil değerlere dayanmalıdır.
        self.assertEqual(analysis_insights(df.iloc[::-1]), result)

    def test_insights_small_inventory_and_no_a(self):
        source = pd.DataFrame([['Tek ürün', 10, 25]], columns=FIELDS)
        df, _ = calculate_abc(source, 0, 0)
        result = analysis_insights(df)
        self.assertEqual(result['top_count'], 1)
        self.assertEqual(result['top_share'], 100)
        self.assertEqual(result['a_share'], 0)
        self.assertEqual(result['counts'], {'A': 0, 'B': 0, 'C': 1})

    def test_reference_result(self):
        df, total = calculate_abc(sample_data(), 80, 15)
        self.assertEqual(total, 304000)
        self.assertEqual(df['ABC Grubu'].tolist(), ['A', 'A', 'A', 'B', 'C'])
        self.assertAlmostEqual(df['Kümülatif Pay (%)'].iloc[-1], 100)

    def test_exact_boundaries(self):
        source = pd.DataFrame([['a', 80, 1], ['b', 15, 1], ['c', 5, 1]], columns=FIELDS)
        self.assertEqual(calculate_abc(source, 80, 15)[0]['ABC Grubu'].tolist(), ['A', 'B', 'C'])

    def test_zero_targets(self):
        for a, b, expected in [(0, 0, 'C'), (0, 100, 'B'), (100, 0, 'A')]:
            with self.subTest(a=a, b=b):
                self.assertEqual(set(calculate_abc(sample_data(), a, b)[0]['ABC Grubu']), {expected})

    def test_zero_value_is_c(self):
        source = pd.concat([sample_data(), pd.DataFrame([['Boş stok', 0, 4]], columns=FIELDS)])
        self.assertEqual(calculate_abc(source, 100, 0)[0].iloc[-1]['ABC Grubu'], 'C')

    def test_number_formats(self):
        for text, expected in [('1.234,56 TL', 1234.56), ('1,234.56', 1234.56), ('1,234', 1.234), ('1.234', 1.234), ('1 234,56', 1234.56)]:
            with self.subTest(text=text):
                self.assertAlmostEqual(parse_number(text), expected)

    def test_invalid_tables(self):
        cases = [pd.DataFrame(columns=FIELDS), pd.DataFrame({'Yanlış': [1]})]
        for column, value in [('Ürün', ''), ('Ürün', None), ('Yıllık Tüketim', -1), ('Birim Fiyat (TL)', -2), ('Yıllık Tüketim', 'hatalı'), ('Birim Fiyat (TL)', float('inf')), ('Yıllık Tüketim', float('nan'))]:
            df = sample_data().astype(object)
            df.loc[0, column] = value
            cases.append(df)
        duplicate = sample_data()
        duplicate.loc[1, 'Ürün'] = ' MOTOR '
        cases.append(duplicate)
        turkish_duplicate = sample_data()
        turkish_duplicate.loc[0, 'Ürün'] = 'VİDA'
        cases.append(turkish_duplicate)
        zero = sample_data()
        zero['Yıllık Tüketim'] = 0
        cases.append(zero)
        overflow = sample_data().astype(object)
        overflow.loc[0, FIELDS[1:]] = [1e308, 1e308]
        cases.append(overflow)
        for index, df in enumerate(cases):
            with self.subTest(index=index), self.assertRaises(ValueError):
                calculate_abc(df, 80, 15)

    def test_invalid_targets(self):
        for a, b in [(-1, 15), (90, 20), (float('nan'), 0), (float('inf'), 0)]:
            with self.subTest(a=a, b=b), self.assertRaises(ValueError):
                calculate_abc(sample_data(), a, b)

    def test_duplicate_headers(self):
        df = sample_data()
        df[' Ürün '] = df['Ürün']
        with self.assertRaisesRegex(ValueError, 'sütun'):
            calculate_abc(df, 80, 15)


class FileTests(unittest.TestCase):
    def test_csv_encodings_and_delimiters(self):
        for encoding in ['utf-8-sig', 'cp1254']:
            for sep in [',', ';', '\t']:
                with self.subTest(encoding=encoding, sep=sep):
                    raw = sample_data().to_csv(index=False, sep=sep).encode(encoding)
                    self.assertEqual(calculate_abc(read_file(raw, 'stok.csv'), 80, 15)[1], 304000)

    def test_excel_roundtrip(self):
        raw = create_excel(sample_data(), template=True)
        self.assertEqual(calculate_abc(read_file(raw, 'stok.xlsx'), 80, 15)[1], 304000)

    def test_empty_and_corrupt_files(self):
        for raw, name in [(b'', 'stok.csv'), (b'  ', 'stok.csv'), (b'broken', 'stok.xlsx'), (b'abc', 'stok.txt')]:
            with self.subTest(name=name, raw=raw), self.assertRaises(ValueError):
                read_file(raw, name)

    def test_invalid_csv_rows(self):
        raw = ('Ürün;Yıllık Tüketim;Birim Fiyat (TL)\na;1;2\nb;3;4;5\n').encode()
        with self.assertRaises(ValueError):
            read_file(raw, 'stok.csv')

    def test_invalid_file_values(self):
        for kind in ['empty', 'duplicate', 'negative', 'missing', 'text']:
            df = sample_data().astype(object)
            if kind == 'empty':
                df = df.iloc[:0]
            elif kind == 'duplicate':
                df.loc[1, 'Ürün'] = 'Motor'
            elif kind == 'negative':
                df.loc[0, 'Yıllık Tüketim'] = -1
            elif kind == 'missing':
                df = df.drop(columns=['Birim Fiyat (TL)'])
            else:
                df.loc[0, 'Yıllık Tüketim'] = 'hatalı'
            for extension in ['csv', 'xlsx']:
                raw = df.to_csv(index=False).encode() if extension == 'csv' else create_excel(df, template=True)
                with self.subTest(kind=kind, extension=extension), self.assertRaises(ValueError):
                    calculate_abc(read_file(raw, 'stok.' + extension), 80, 15)

    def test_blank_template(self):
        wb = load_workbook(io.BytesIO(create_excel(pd.DataFrame(columns=FIELDS), template=True)))
        ws = wb.active
        self.assertEqual([c.value for c in ws[1]], FIELDS)
        self.assertEqual(ws.max_row, 1)
        self.assertEqual(ws.freeze_panes, 'A2')

    def test_formatted_report(self):
        df, total = calculate_abc(sample_data(), 80, 15)
        wb = load_workbook(io.BytesIO(create_excel(df)))
        self.assertEqual(wb.sheetnames, ['ABC Analizi', 'Grup Özeti', 'Analiz Ayarları'])
        self.assertEqual(wb.active['A1'].fill.fgColor.rgb, '00243959')
        self.assertEqual(wb.active.auto_filter.ref, 'A1:G6')
        self.assertEqual(sum(wb['Grup Özeti'].cell(i, 3).value for i in [2, 3, 4]), total)

    def test_excel_formula_name(self):
        df = sample_data()
        df.loc[0, 'Ürün'] = '=1+1'
        result, _ = calculate_abc(df, 80, 15)
        ws = load_workbook(io.BytesIO(create_excel(result))).active
        self.assertEqual(ws['A2'].data_type, 's')
        self.assertEqual(ws['A2'].value, '=1+1')

    def test_report_invalid_targets(self):
        df, _ = calculate_abc(sample_data(), 80, 15)
        with self.assertRaises(ValueError):
            create_excel(df, 80, 15, 10)


class ChartTests(unittest.TestCase):
    def test_tooltip_contains_all_seven_details(self):
        df, _ = calculate_abc(sample_data(), 80, 15)
        fig = pareto_chart(df, 80, 15)
        details = list(fig.data[0].customdata[0])
        self.assertEqual(details, ['Motor', 'A', '150.000,00', '49,34', '49,34', '100', '1.500,00'])
        for trace in fig.data[:2]:
            for label in ['ABC grubu', 'Yıllık tüketim miktarı', 'Birim fiyat', 'Yıllık değer', 'Değer payı', 'Kümülatif pay']:
                self.assertIn(label, trace.hovertemplate)
        self.assertEqual(fig.data[1].line.color, '#FB7185')
        self.assertEqual(tuple(fig.layout.yaxis2.range), (0, 100))

    def test_small_value_axis_and_tooltips_do_not_round_to_zero(self):
        source = pd.DataFrame([['Hassas parça', 1, 2e-10], ['İkinci parça', 1, 4e-11], ['Üçüncü parça', 1, 3e-12]], columns=FIELDS)
        df, _ = calculate_abc(source, 80, 15)
        for compact in [False, True]:
            with self.subTest(compact=compact):
                fig = pareto_chart(df, 80, 15, compact=compact)
                self.assertEqual(list(fig.data[0].y), df['Yıllık Değer (TL)'].tolist())
                self.assertGreater(fig.layout.yaxis.range[1], 2e-10)
                self.assertEqual(len(set(fig.layout.yaxis.ticktext)), len(fig.layout.yaxis.ticktext))
                self.assertNotEqual(fig.data[0].customdata[0][2], '0,00')
                self.assertNotEqual(fig.data[0].customdata[-1][6], '0,00')

    def test_seven_and_sixty_product_charts_keep_all_data(self):
        for count in [7, 60]:
            with self.subTest(count=count):
                source = pd.DataFrame([[f'Uzun mühendislik ürün adı {i}', (count-i)*7, 12.5] for i in range(count)], columns=FIELDS)
                df, _ = calculate_abc(source, 80, 15)
                fig = pareto_chart(df, 80, 15)
                self.assertEqual(len(fig.data[0].y), count)
                self.assertEqual(list(fig.data[1].y), df['Kümülatif Pay (%)'].tolist())
                self.assertLessEqual(len(fig.layout.xaxis.tickvals), 8)
                if count == 7:
                    self.assertEqual(len(fig.layout.xaxis.tickvals), 7)
                self.assertIn('Uzun mühendislik ürün adı', fig.data[0].customdata[0][0])

    def test_compact_chart_preserves_values_and_full_tooltips(self):
        df, _ = calculate_abc(sample_data(), 80, 15)
        standard = pareto_chart(df, 80, 15)
        compact = pareto_chart(df, 80, 15, compact=True)
        self.assertEqual(list(compact.data[0].y), list(standard.data[0].y))
        self.assertEqual(list(compact.data[1].y), list(standard.data[1].y))
        self.assertEqual(list(compact.data[0].customdata), list(standard.data[0].customdata))
        self.assertEqual(compact.layout.yaxis.title.text, 'Bin TL')
        self.assertLess(compact.layout.legend.y, 0)

    def test_many_products_readable_labels(self):
        source = pd.DataFrame([[f'Uzun ürün açıklaması {i}', 501-i, 10] for i in range(500)], columns=FIELDS)
        df, _ = calculate_abc(source, 80, 15)
        fig = pareto_chart(df, 80, 15)
        self.assertLessEqual(len(fig.layout.xaxis.ticktext), 10)
        self.assertTrue(all(len(label) <= 18 for label in fig.layout.xaxis.ticktext))
        self.assertEqual(fig.data[1].mode, 'lines')
        self.assertEqual(len(fig.data[0].y), 500)

    def test_palette_and_currency(self):
        df, _ = calculate_abc(sample_data(), 80, 15)
        fig = pareto_chart(df, 80, 15)
        self.assertEqual(COLORS, {'A': '#4F8CFF', 'B': '#F59E0B', 'C': '#22D3EE'})
        self.assertEqual(list(fig.data[0].marker.color), [COLORS[g] for g in df['ABC Grubu']])
        self.assertIn('150.000,00', fig.data[0].customdata[0])
        self.assertEqual(fig.data[2].line.dash, 'dash')
        self.assertEqual(fig.layout.yaxis.ticktext[0], '0,00')
        self.assertEqual(plot_options('pareto')['toImageButtonOptions']['filename'], 'pareto')

    def test_html_product_name_is_escaped(self):
        source = pd.DataFrame([['<b>Ürün</b>', 1, 10]], columns=FIELDS)
        df, _ = calculate_abc(source, 80, 15)
        fig = pareto_chart(df, 80, 15)
        self.assertEqual(fig.data[0].customdata[0][0], '&lt;b&gt;Ürün&lt;/b&gt;')

    def test_tiny_distribution_group_has_table_fallback(self):
        summary = pd.DataFrame({
            'ABC Grubu': ['A', 'B', 'C'], 'Ürün Sayısı': [5, 2, 1],
            'Toplam Değer (TL)': [99900, 99, 1],
        })
        fig = distribution_chart(summary)
        self.assertEqual(fig.data[0].text[-1], '')
        self.assertIn('8', fig.layout.annotations[0].text)
        self.assertEqual(fig.data[0].customdata[-1][2], '0,00')
        self.assertEqual(sum(fig.data[0].values), 100000)

    def test_single_product_thresholds_span_chart(self):
        df, _ = calculate_abc(sample_data().head(1), 80, 0)
        fig = pareto_chart(df, 80, 0)
        self.assertLess(fig.data[2].x[0], fig.data[2].x[1])
        self.assertNotEqual(fig.data[2].name, fig.data[3].name)

    def test_distribution_chart(self):
        df, _ = calculate_abc(sample_data(), 80, 15)
        summary = df.groupby('ABC Grubu', as_index=False).agg(**{
            'Toplam Değer (TL)': ('Yıllık Değer (TL)', 'sum'),
            'Ürün Sayısı': ('Ürün', 'count'),
        })
        fig = distribution_chart(summary)
        self.assertEqual(sum(fig.data[0].values), 304000)
        self.assertIn('Yıllık değer', fig.data[0].hovertemplate)
        self.assertIn('88,82', fig.data[0].text[0])

    def test_pareto_and_filter_semantics(self):
        df, _ = calculate_abc(sample_data(), 80, 15)
        filtered = df.iloc[2:4].reset_index(drop=True)
        fig = pareto_chart(filtered, 80, 15, 'pan')
        self.assertEqual(fig.layout.dragmode, 'pan')
        self.assertEqual(list(fig.data[1].y), filtered['Kümülatif Pay (%)'].tolist())
        self.assertEqual(fig.data[2].y, (80, 80))
        self.assertEqual(fig.data[3].y, (95, 95))
        self.assertIn('Yıllık değer', fig.data[0].hovertemplate)
        self.assertEqual(plot_options()['toImageButtonOptions']['format'], 'png')

    def test_single_and_zero_value_chart(self):
        df, _ = calculate_abc(sample_data(), 80, 15)
        self.assertEqual(len(pareto_chart(df.iloc[:1], 80, 15).data), 4)
        zero = df.iloc[:1].copy()
        zero['Yıllık Değer (TL)'] = 0
        self.assertEqual(len(pareto_chart(zero, 80, 15).data), 4)


class StreamlitTests(unittest.TestCase):
    def app(self):
        return AppTest.from_file(str(ROOT / 'app.py'), default_timeout=30).run()

    def button(self, app, label):
        return next(b for b in app.button if label in b.label)

    def test_start_and_no_html_content(self):
        app = self.app()
        self.assertFalse(app.exception)
        self.assertEqual(len(app.get('file_uploader')), 1)
        self.assertEqual(read_kpis(app), {})
        self.assertEqual(len(app.metric), 0)
        self.assertIsNone(app.session_state['saved_upload'])
        self.assertFalse(any('<div' in m.value or '<h1' in m.value for m in app.markdown))

    def test_example_navigation_and_targets(self):
        app = self.app()
        self.button(app, 'Örnek veriyle dene').click().run()
        self.assertFalse(app.exception)
        self.assertEqual(read_kpis(app)['total'], '304.000,00 TL')
        saved = app.session_state['saved_upload'].copy()
        app.sidebar.slider[0].set_value(70)
        app.sidebar.slider[1].set_value(20)
        app.sidebar.slider[2].set_value(10)
        self.button(app, 'Hedefleri uygula').click().run()
        self.assertEqual(app.session_state['abc_targets'], (70, 20, 10))
        app.switch_page('pages/1_ABC_Rehberi.py').run()
        self.assertFalse(app.exception)
        self.assertFalse(any('<div' in m.value for m in app.markdown))
        app.switch_page('app.py').run()
        self.assertFalse(app.exception)
        self.assertEqual(app.session_state['saved_upload'], saved)
        self.assertEqual(app.session_state['abc_targets'], (70, 20, 10))
        self.assertEqual(read_kpis(app)['total'], '304.000,00 TL')

    def test_invalid_targets_preserve_applied_values(self):
        app = self.app()
        app.sidebar.slider[0].set_value(90)
        self.button(app, 'Hedefleri uygula').click().run()
        self.assertTrue(app.error)
        self.assertEqual(app.session_state['abc_targets'], (80, 15, 5))

    def test_filters_reset_and_clear(self):
        app = self.app()
        self.button(app, 'Örnek veriyle dene').click().run()
        app.multiselect[0].set_value([]).run()
        self.assertTrue(app.warning)
        self.assertFalse(app.exception)
        app.multiselect[0].set_value(['B']).run()
        next(s for s in app.slider if s.label == 'Ürün sıralama aralığı').set_value((1, 4)).run()
        self.assertFalse(app.exception)
        app.radio[0].set_value('Kaydır').run()
        self.button(app, 'Görünümü sıfırla').click().run()
        self.assertEqual(app.session_state['chart_revision'], 1)
        self.button(app, 'Yüklenen veriyi temizle').click().run()
        self.assertIsNone(app.session_state['saved_upload'])
        self.assertFalse(app.exception)

    def test_bad_upload_message(self):
        app = self.app()
        app.session_state['saved_upload'] = {'name': 'hata.xlsx', 'bytes': b'broken'}
        app.run()
        self.assertFalse(app.exception)
        self.assertIn('Excel dosyası okunamadı', app.error[0].value)

    def test_custom_inventory_insights(self):
        app = self.app()
        source = pd.DataFrame([['Özel ürün', 20, 100], ['Diğer', 10, 50]], columns=FIELDS)
        app.session_state['saved_upload'] = {'name': 'ozel.csv', 'bytes': source.to_csv(index=False).encode('utf-8-sig')}
        app.run()
        self.assertFalse(app.exception)
        self.assertEqual(read_kpis(app)['total'], '2.500,00 TL')
        self.assertEqual(read_kpis(app)['a_share'], '%80,00')
        self.assertIn('Özel ürün', [item.value for item in app.text])
        self.assertTrue(any('İlk 2 ürünün' in item.value for item in app.markdown))
        app.multiselect[0].set_value(['C']).run()
        self.assertFalse(app.exception)
        self.assertTrue(app.warning)
        self.assertEqual(read_kpis(app)['total'], '2.500,00 TL')

    def test_guide_change_targets_and_return(self):
        app = self.app()
        self.button(app, 'Örnek veriyle dene').click().run()
        saved = app.session_state['saved_upload'].copy()
        app.switch_page('pages/1_ABC_Rehberi.py').run()
        self.assertEqual(len(app.tabs), 4)
        self.assertGreaterEqual(len(app.latex), 3)
        self.assertEqual(len(app.sidebar.slider), 3)
        app.sidebar.slider[0].set_value(0)
        app.sidebar.slider[1].set_value(0)
        app.sidebar.slider[2].set_value(100)
        self.button(app, 'Hedefleri uygula').click().run()
        app.switch_page('app.py').run()
        self.assertFalse(app.exception)
        self.assertEqual(app.session_state['saved_upload'], saved)
        self.assertEqual(app.session_state['abc_targets'], (0, 0, 100))
        self.assertEqual(read_kpis(app)['a_share'], '%0,00')
        self.assertTrue(any('A grubunda ürün bulunmuyor' in item.value for item in app.info))

    def test_excel_navigation_preserves_bytes(self):
        app = self.app()
        payload = {'name': 'stok.xlsx', 'bytes': create_excel(sample_data(), template=True)}
        app.session_state['saved_upload'] = payload
        app.run().switch_page('pages/1_ABC_Rehberi.py').run().switch_page('app.py').run()
        self.assertFalse(app.exception)
        self.assertEqual(app.session_state['saved_upload'], payload)
        self.assertEqual(read_kpis(app)['total'], '304.000,00 TL')


if __name__ == '__main__':
    unittest.main(verbosity=2)
