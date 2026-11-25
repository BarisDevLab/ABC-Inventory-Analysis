"""Generate fixtures from the unchanged Python core; writes only within vercel-app.

Run from vercel-app: python -B scripts/generate_reference.py
Requires the existing project's Python dependencies; never installs packages.
"""
import hashlib
import json
import math
from pathlib import Path
import random
import sys
import unicodedata

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))
import pandas as pd
from abc_core import FIELDS, analysis_insights, calculate_abc, parse_number, sample_data


def write(relative, value):
    target = HERE / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n', encoding='utf-8')


def tagged(value):
    if math.isnan(value):
        return 'NaN'
    if math.isinf(value):
        return 'Infinity' if value > 0 else '-Infinity'
    return value


casefold, decimal, whitespace = {}, {}, []
for code in range(sys.maxunicode + 1):
    char = chr(code)
    if char.casefold() != char:
        casefold[char] = char.casefold()
    if char.isdecimal() and char not in '0123456789':
        decimal[char] = str(unicodedata.decimal(char))
    if char.isspace():
        whitespace.append(char)
write('src/core/python-unicode.json', {
    'unicode_version': unicodedata.unidata_version,
    'casefold': casefold, 'decimal': decimal, 'whitespace': whitespace,
})

cases = []


def add(name, rows, a=80, b=15, columns=None):
    columns = list(FIELDS) if columns is None else columns
    case = {'name': name, 'source': {'columns': columns, 'rows': rows},
            'targets': {'a': a, 'b': b, 'c': 100-a-b}}
    try:
        data, total = calculate_abc(pd.DataFrame(rows, columns=columns), a, b)
        mapping = {'Ürün': 'product', 'Yıllık Tüketim': 'quantity', 'Birim Fiyat (TL)': 'price',
                   'Yıllık Değer (TL)': 'value', 'Değer Payı (%)': 'share',
                   'Kümülatif Pay (%)': 'cumulative', 'ABC Grubu': 'group'}
        summary = []
        grouped = data.groupby('ABC Grubu', as_index=False).agg(**{
            'count': ('Ürün', 'count'), 'value': ('Yıllık Değer (TL)', 'sum')
        }).set_index('ABC Grubu').reindex(['A', 'B', 'C'], fill_value=0)
        for group, row in grouped.iterrows():
            summary.append({'group': group, 'count': int(row['count']),
                            'value': float(row['value']), 'share': float(row['value']/total*100)})
        case['expected'] = {'rows': data.rename(columns=mapping).to_dict(orient='records'),
                            'total': total, 'insights': analysis_insights(data), 'summary': summary}
    except ValueError as error:
        case['error'] = str(error)
    cases.append(case)


demo = sample_data().values.tolist()
add('demo', demo)
add('exact-boundaries', [['a',80,1],['b',15,1],['c',5,1]])
add('stable-ties', [['z',10,1],['a',10,1],['m',10,1],['b',10,1]])
add('zero-row', demo + [['Sıfır',0,5]],100,0)
add('zero-total', [['a',0,1]])
add('underflow-total', [['a',1e-300,1e-300]])
add('tiny-values', [['a',1,2e-300],['b',1,4e-301],['c',1,3e-302]])
add('subnormal-values', [['a',1,5e-324],['b',1,1e-323]])
add('huge-values', [['a',1e150,1e150],['b',1e149,1e150],['c',1,1]])
add('product-overflow', [['a',1e308,1e308]])
add('total-overflow', [['a',1,1e308],['b',1,1e308]])
add('turkish-numbers', [['a','1.234,56 TL','2,5'],['b','1 234','1,234'],['c','1,234.56','₺2']])
add('python-numeric-grammar', [['a','١٢,٥','1_000'],['b',True,True],['c','\x1c2\x1f',2]])
for a,b in [(70,20),(0,0),(0,100),(100,0),(80,0),(33.3,33.3),(-1,15),(90,20)]:
    add(f'target-{a}-{b}',demo,a,b)
for delta in [-2e-10,-5e-11,0,5e-11,2e-10]:
    add(f'near-a-{delta}',[['a',80+delta,1],['b',15-delta,1],['c',5,1]])
    add(f'near-b-{delta}',[['a',80,1],['b',15+delta,1],['c',5-delta,1]])
for name, rows in [
    ('empty', []), ('null', [['a',None,1]]), ('blank-name', [[' ',1,1]]),
    ('negative-quantity', [['a',-1,1]]), ('negative-price', [['a',1,-1]]),
    ('invalid-suffix', [['a','12xyz',1]]), ('hex', [['a','0x10',1]]),
    ('infinity', [['a','Infinity',1]]), ('nan-text', [['a','NaN',1]]),
    ('blank-number', [['a','',1]]),
    ('turkish-duplicate', [['VİDA',1,1],['vida',1,2]]),
    ('dotless-duplicate', [['ISIK',1,1],['ısık',1,2]]),
    ('distinct-i', [['I',1,1],['i',1,2]]),
    ('casefold-sharp-s', [['Straße',1,1],['STRASSE',1,1]]),
    ('casefold-sigma', [['ς',1,1],['Σ',1,1]]),
    ('nfc-duplicate', [['é',1,1],['e\u0301',1,1]]),
    ('trim-duplicate', [[' Motor ',1,1],['MOTOR',1,1]]),
]:
    add(name,rows)
add('missing-column', [['a',1]],columns=FIELDS[:2])
add('duplicate-columns', [['a',1,1,'b']],columns=list(FIELDS)+[' Ürün '])
add('extra-column', [['a',1,1,'ignored']],columns=[' Ürün ',FIELDS[1],FIELDS[2],'Diğer'])
randomizer = random.Random(20261118)
for count in [8,16,127,128,129,255,500,1000]:
    for run in range(4):
        rows = [[f'Ürün-{i}',10**randomizer.uniform(-12,12),randomizer.uniform(0,100)] for i in range(count)]
        add(f'pairwise-{count}-{run}',rows)
for i in range(30):
    a=randomizer.randint(0,100)
    b=randomizer.randint(0,100-a)
    add(f'random-target-{i}',[[f'Ürün-{j}',randomizer.randint(0,10000),randomizer.randint(0,100)] for j in range(20)],a,b)

texts = ['1.234,56 TL','1,234.56','1,234','1.234','1 234,56','', ' ', '12xyz',
         '0x10','1_234.5','1__2','١٢,٥','１２.５','1e3','1e-400','1e400',
         'nan','-Infinity','₺ 12 TL','\x1c2\x1f','\ufeff12','1\t2','tl12','1,2,3']
parse_cases = [{'input':value,'expected':tagged(parse_number(value))} for value in texts + [None,True,False,0,1.5]]
write('tests/fixtures/python-reference.json', {
    'metadata': {'python': sys.version.split()[0], 'pandas': pd.__version__,
                 'unicode': unicodedata.unidata_version,
                 'core_sha256': hashlib.sha256((ROOT/'abc_core.py').read_bytes()).hexdigest()},
    'cases': cases, 'parse_cases': parse_cases,
})
print(f'Python references generated: {len(cases)} analysis cases, {len(parse_cases)} number cases.')
