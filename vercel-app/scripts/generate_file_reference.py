"""Write browser-reader fixtures only under vercel-app; import Python core read-only."""
import hashlib
import io
import json
import math
from pathlib import Path
import re
import sys
import zipfile
from datetime import datetime

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parents[1]
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))
import pandas as pd
from openpyxl import Workbook
from pandas._libs.parsers import STR_NA_VALUES
from abc_core import FIELDS, read_file, calculate_abc

DEST = HERE / 'tests/fixtures/files'
DEST.mkdir(parents=True, exist_ok=True)
cases = []


def add(name, raw, extension, difference=None):
    filename = name + extension
    (DEST / filename).write_bytes(raw)
    case = {'name': name, 'filename': filename}
    if difference:
        case['intentional_difference'] = difference
    try:
        frame = read_file(raw, filename)
        data, total = calculate_abc(frame, 80, 15)
        case['expected'] = {
            'total': total,
            'products': data['Ürün'].tolist(),
            'groups': data['ABC Grubu'].tolist(),
            'values': data['Yıllık Değer (TL)'].tolist(),
        }
    except (ValueError, KeyError) as error:
        case['error'] = str(error)
    cases.append(case)


demo = [['Motor',100,1500],['Rulman',500,120],['Sensör',150,400],['Kayış',300,80],['Vida',2000,5]]
for encoding in ['utf-8','utf-8-sig','cp1254']:
    for separator,label in [(',', 'comma'),(';','semicolon'),('\t','tab')]:
        raw=pd.DataFrame(demo,columns=FIELDS).to_csv(index=False,sep=separator).encode(encoding)
        add(f'csv-{encoding}-{label}',raw,'.csv')


def csv(name, lines, difference=None):
    add(name,lines.encode('utf-8'),'.csv',difference)


header=';'.join(FIELDS)+'\n'
csv('csv-quotes',header+'"Rulman; büyük";2;3\n"Sensör ""özel""";1;5\n')
csv('csv-quoted-newline',header+'"İki\nsatır";2;3\nDiğer;1;2\n')
csv('csv-crlf',header.replace('\n','\r\n')+'Motor;1;2\r\nVida;2;1\r\n')
csv('csv-blank-lines','\n\n'+header+'\nMotor;1;2\n\n')
csv('csv-internal-blank-lines',header+'\nMotor;1;2\n\nVida;2;1\n')
csv('csv-missing-cell',header+'a;1;\n')
csv('csv-short-row',header+'a;1;2\nb;3\n')
csv('csv-late-long-row',header+'a;1;2\nb;3;4;5\n')
csv('csv-consistent-long-row',header+'a;1;2;3\nb;4;5;6\n','long-row')
csv('csv-unclosed-quote',header+'"a;1;2\n')
csv('csv-quote-junk',header+'"a"x;1;2\n')
csv('csv-missing-header','Ürün;Yıllık Tüketim\na;1\n')
csv('csv-exact-duplicate-header',header.rstrip('\n')+';Ürün\na;1;2;b\n','duplicate-header')
csv('csv-trimmed-duplicate-header',header.rstrip('\n')+'; Ürün \na;1;2;b\n')
csv('csv-trimmed-headers',' Ürün ; Yıllık Tüketim ; Birim Fiyat (TL) \na;1;2\n')
csv('csv-extra-column',header.rstrip('\n')+';Not\na;1;2;\nb;2;3;metin\n')
csv('csv-negative',header+'a;-1;2\n')
csv('csv-inf',header+'a;1;Infinity\n')
csv('csv-invalid-number',header+'a;12xyz;2\n')
csv('csv-blank-name',header+'   ;1;2\n')
csv('csv-duplicate-product',header+'VİDA;1;2\nvida;2;3\n')
csv('csv-formats',header+'a;1.234,56;2,5\nb;1 234;1,234\nc;1,234.56;2\n')
csv('csv-header-only',header)
csv('csv-NA-values',header+'NA;1;2\n')
csv('csv-literal-formula',header+'=1+1;1;2\n')
csv('csv-nul',header+'a\x00b;1;2\n','nul')
add('empty',b'','.csv')
add('whitespace',b' \t\r\n','.csv')
add('invalid-encoding',b'\x81\x81','.csv')
add('unsupported',b'not an xlsx','.xls')
add('unsupported-text',b'abc','.txt')


def xlsx(name, rows, headers=None, prepare=None, cached=False, difference=None):
    workbook=Workbook()
    sheet=workbook.active
    sheet.append(FIELDS if headers is None else headers)
    for row in rows:
        sheet.append(row)
    if prepare:
        prepare(workbook,sheet)
    output=io.BytesIO()
    workbook.save(output)
    raw=output.getvalue()
    if cached:
        output=io.BytesIO()
        with zipfile.ZipFile(io.BytesIO(raw)) as source,zipfile.ZipFile(output,'w') as dest:
            for item in source.infolist():
                content=source.read(item.filename)
                if item.filename=='xl/worksheets/sheet1.xml':
                    content=content.replace(b'<f>1+1</f><v></v>',b'<f>1+1</f><v>2</v>')
                dest.writestr(item,content)
        raw=output.getvalue()
    add(name,raw,'.xlsx',difference)


xlsx('xlsx-demo',demo)
xlsx('xlsx-numbers',[['Motor',100.5,20.25],['Vida',2,3]])
xlsx('xlsx-numeric-strings',[['Motor','1234.56','2.5'],['Vida','2','3']])
xlsx('xlsx-turkish-strings',[['Motor','1.234,56','2,5'],['Vida','1 234','1,234']])
xlsx('xlsx-missing-cell',[['Motor',None,3]])
xlsx('xlsx-empty-name',[[None,2,3]])
xlsx('xlsx-blank-name',[[' ',2,3]])
xlsx('xlsx-header-only',[])
xlsx('xlsx-missing-header',[['Motor',2]],headers=FIELDS[:2])
xlsx('xlsx-exact-duplicate-header',[['Motor',2,3,'a']],headers=list(FIELDS)+['Ürün'],difference='duplicate-header')
xlsx('xlsx-trimmed-duplicate-header',[['Motor',2,3,'a']],headers=list(FIELDS)+[' Ürün '])
xlsx('xlsx-extra-column',[['Motor',2,3,None]],headers=list(FIELDS)+['Not'])
xlsx('xlsx-duplicate-product',[['VİDA',2,3],['vida',3,4]])
xlsx('xlsx-negative',[['Motor',-2,3]])
xlsx('xlsx-NA',[['NA',2,3]])
xlsx('xlsx-only-na-row',[['NA',None,None]])
xlsx('xlsx-date-fraction',[[datetime(2024,1,2,13,14,15,123000),2,3]])
xlsx('xlsx-date-midnight',[[datetime(2024,1,2),2,3]])
xlsx('xlsx-date-mixed-text',[[datetime(2024,1,2,13,14,15,123000),2,3],['Motor',1,2]])
xlsx('xlsx-date-mixed-precision',[[datetime(2024,1,2,13,14,15,123000),2,3],[datetime(2024,1,3),1,2]])
xlsx('xlsx-formula-no-cache',[['Motor','=1+1',3]])
xlsx('xlsx-formula-cached',[['Motor','=1+1',3]],cached=True)
xlsx('xlsx-formula-name-no-cache',[['=1+1',2,3]])
xlsx('xlsx-date-number',[['Motor',datetime(2024,1,2),3]])
xlsx('xlsx-date-name',[[datetime(2024,1,2,13,14,15),2,3]])
xlsx('xlsx-error',[['Motor','#DIV/0!',3]])
xlsx('xlsx-leading-zero-code',[['001',2,3],['002',3,4]],difference='product-code-inference')
xlsx('xlsx-mixed-numeric-name',[[1,2,3],['Motor',3,4]])


def second_sheet(workbook,sheet):
    second=workbook.create_sheet('İkinci')
    second.append(FIELDS)
    second.append(['Yanlış sayfa',10000,10000])


xlsx('xlsx-first-sheet-only',demo,prepare=second_sheet)


def hyperlink(workbook,sheet):
    sheet['A2'].hyperlink='https://example.invalid/do-not-request'


xlsx('xlsx-hyperlink',demo,prepare=hyperlink)


def styles(workbook,sheet):
    sheet['H100'].number_format='0.00'


xlsx('xlsx-trailing-styles',demo,prepare=styles)
add('xlsx-corrupt',b'broken','.xlsx')
add('xlsx-fake-ole',bytes.fromhex('d0cf11e0a1b11ae1')+b'not-an-encrypted-workbook','.xlsx')
add('xlsx-truncated',(DEST/'xlsx-demo.xlsx').read_bytes()[:100],'.xlsx')
# Same filename extension, but not an XLSX workbook.
output=io.BytesIO()
with zipfile.ZipFile(output,'w') as archive:
    archive.writestr('plain.txt','not a workbook')
add('xlsx-non-workbook-zip',output.getvalue(),'.xlsx')

cp1254=[]
for code in range(256):
    try:
        cp1254.append(bytes([code]).decode('cp1254'))
    except UnicodeDecodeError:
        cp1254.append(None)
data={'metadata':{'core_sha256':hashlib.sha256((ROOT/'abc_core.py').read_bytes()).hexdigest(),
                  'pandas':pd.__version__},'cases':cases}
(HERE/'tests/fixtures/file-reference.json').write_text(json.dumps(data,ensure_ascii=False,indent=2,allow_nan=False)+'\n',encoding='utf-8')
(HERE/'src/io/python-file-data.json').parent.mkdir(parents=True,exist_ok=True)
(HERE/'src/io/python-file-data.json').write_text(json.dumps({'cp1254':cp1254,'na_values':sorted(STR_NA_VALUES)},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Generated {len(cases)} Python file cases; intentional differences:',[(c['name'],c['intentional_difference']) for c in cases if 'intentional_difference' in c])
