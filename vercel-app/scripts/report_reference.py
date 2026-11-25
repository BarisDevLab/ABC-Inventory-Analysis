"""Python report reference generator and independent openpyxl verifier.

Only writes synthetic files inside vercel-app. Run with python -B.
"""
import hashlib
import io
import json
import math
from pathlib import Path
import random
import sys

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))
import pandas as pd
from openpyxl import load_workbook
from abc_core import FIELDS, calculate_abc, create_excel, sample_data


def color(value):
    return None if value is None else {'type':value.type,'value':value.value}


def snapshot(raw):
    book = load_workbook(io.BytesIO(raw), data_only=False)
    sheets=[]
    for sheet in book.worksheets:
        cells=[]
        for row in sheet.iter_rows():
            for cell in row:
                cells.append({
                    'coordinate':cell.coordinate,'value':cell.value,'type':cell.data_type,
                    'format':cell.number_format,
                    'fill':{'pattern':cell.fill.patternType,'color':color(cell.fill.fgColor)},
                    'font':{'name':cell.font.name,'size':cell.font.sz,'bold':cell.font.b,'color':color(cell.font.color)},
                    'alignment':{'horizontal':cell.alignment.horizontal,'vertical':cell.alignment.vertical},
                    'border':{side:getattr(cell.border,side).style if getattr(cell.border,side) else None for side in ['left','right','top','bottom']},
                })
        sheets.append({'name':sheet.title,'rows':sheet.max_row,'columns':sheet.max_column,
                       'freeze':sheet.freeze_panes,'filter':sheet.auto_filter.ref,
                       'gridlines':sheet.sheet_view.showGridLines,'header_height':sheet.row_dimensions[1].height,
                       'widths':[next((dimension.width for dimension in sheet.column_dimensions.values()
                                       if dimension.min <= index <= dimension.max),sheet.sheet_format.defaultColWidth or 13)
                                 for index in range(1,sheet.max_column+1)],
                       'cells':cells})
    return sheets


def compare(actual, expected, path=''):
    if isinstance(expected,(float,int)) and not isinstance(expected,bool):
        if not isinstance(actual,(float,int)) or not math.isclose(actual,expected,rel_tol=1e-13,abs_tol=5e-324):
            raise AssertionError(f'{path}: {actual!r} != {expected!r}')
    elif isinstance(expected,list):
        assert len(actual)==len(expected),path
        for index,(value,reference) in enumerate(zip(actual,expected)):
            compare(value,reference,f'{path}[{index}]')
    elif isinstance(expected,dict):
        for key,value in expected.items():
            compare(actual[key],value,f'{path}.{key}')
    else:
        assert actual==expected,f'{path}: {actual!r} != {expected!r}'


if '--verify' in sys.argv:
    reference=json.loads((HERE/'tests/fixtures/report-reference.json').read_text(encoding='utf-8'))
    count=0
    for case in reference['cases']:
        filename=HERE/'.tmp/report-validation'/f"{case['name']}.xlsx"
        assert filename.is_file(),f'Missing generated report: {filename.name}'
        compare(snapshot(filename.read_bytes()),case['sheets'],case['name'])
        count+=1
    print(f'Independent openpyxl verification: {count} TypeScript files match Python values/types/styles.')
    sys.exit(0)

destination=HERE/'tests/fixtures/reports'
destination.mkdir(parents=True,exist_ok=True)
cases=[]


def add(name,rows=None,targets=None,template=False):
    a,b,c=(80,15,5) if targets is None else targets
    source={'columns':list(FIELDS),'rows':[] if rows is None else rows}
    if template:
        raw=create_excel(pd.DataFrame(columns=FIELDS),template=True)
    else:
        analysis,_=calculate_abc(pd.DataFrame(rows,columns=FIELDS),a,b)
        raw=create_excel(analysis,a,b,c)
    (destination/f'{name}.xlsx').write_bytes(raw)
    cases.append({'name':name,'template':template,'source':source,'targets':{'a':a,'b':b,'c':c},'sheets':snapshot(raw)})


demo=sample_data().values.tolist()
add('demo',demo)
add('dynamic-targets',demo,(70,20,10))
add('fractional-targets',demo,(70.5,20.25,9.25))
add('no-a',demo,(0,100,0))
add('all-c',demo,(0,0,100))
add('all-a-with-zero',demo+[['Sıfır stok',0,2]],(100,0,0))
add('exact-boundaries',[['a',80,1],['b',15,1],['c',5,1]])
add('stable-order',[['z',10,1],['a',10,1],['m',10,1],['b',10,1]])
add('formula-prefixes',[[name,1,index+1] for index,name in enumerate(['=1+1','+SUM(A1:A2)','-1+2','@SUM(A1:A2)',"'Özgün ad",' Türkçe ürün '])])
add('tiny-values',[['Hassas parça',1,2e-10],['İkinci',1,4e-11],['Üçüncü',1,3e-12]])
add('extremely-tiny',[['Küçük',1,2e-300],['Diğer',1,4e-301]])
add('subnormal',[['En küçük',1,5e-324],['İkinci',1,1e-323]])
add('huge-values',[['Büyük',1e100,1e100],['Diğer',1e99,1e100]])
add('fractional-quantity',[['Motor',12.34567,5.4321],['Vida',0.125,0.25]])
add('single-product',[['Tek ürün',1,100]])
add('blank-template',template=True)
randomizer=random.Random(20261119)
add('large-synthetic',[[f'Sentetik ürün {i}',randomizer.randint(1,10000),randomizer.uniform(.01,100)] for i in range(500)])
reference={'metadata':{'core_sha256':hashlib.sha256((ROOT/'abc_core.py').read_bytes()).hexdigest(),'pandas':pd.__version__},'cases':cases}
(HERE/'tests/fixtures/report-reference.json').write_text(json.dumps(reference,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
print(f'Generated {len(cases)} Python report/template references.')
