"""Read-only raw text/cell extraction; no unit inference or scientific scoring."""
import csv, io, json, posixpath, sys, zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

NS = {'m': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
REL = '{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id'
MAX_XML = 64 * 1024 * 1024

def xml(z, name):
    if z.getinfo(name).file_size > MAX_XML:
        raise ValueError('XML entry exceeds bounded extraction size')
    return ET.fromstring(z.read(name))

def extract(filename):
    p = Path(filename)
    if p.suffix.lower() == '.xlsx':
        with zipfile.ZipFile(p) as z:
            if sum(i.file_size for i in z.infolist()) > 128 * 1024 * 1024:
                raise ValueError('Expanded workbook exceeds extraction limit')
            strings = []
            if 'xl/sharedStrings.xml' in z.namelist():
                strings = [''.join(s.itertext()) for s in xml(z, 'xl/sharedStrings.xml').findall('m:si', NS)]
            rels = {r.attrib['Id']: r.attrib['Target'] for r in xml(z, 'xl/_rels/workbook.xml.rels')}
            units = []
            for sheet in xml(z, 'xl/workbook.xml').findall('m:sheets/m:sheet', NS):
                target = rels[sheet.attrib[REL]]
                name = posixpath.normpath(target.lstrip('/') if target.startswith('/') else 'xl/' + target)
                if not name.startswith('xl/') or '..' in name.split('/'):
                    raise ValueError('Unsafe workbook relationship')
                for row in xml(z, name).findall('m:sheetData/m:row', NS):
                    cells = []
                    for cell in row.findall('m:c', NS):
                        typ = cell.attrib.get('t', '')
                        value = cell.find('m:v', NS)
                        raw = value.text if value is not None and value.text is not None else ''
                        if typ == 's': raw = strings[int(raw)] if raw else ''
                        if typ == 'inlineStr': raw = ''.join(cell.find('m:is', NS).itertext())
                        formula = cell.find('m:f', NS)
                        if formula is not None:
                            raw = '[FORMULA ' + (formula.text or '') + '; cached=' + raw + '; NOT recalculated]'
                        if raw: cells.append(cell.attrib.get('r', '') + '=' + raw)
                    if cells:
                        units.append({'location': {'sheet': sheet.attrib['name'], 'row': int(row.attrib['r']), 'cells': [c.split('=', 1)[0] for c in cells]}, 'text': '\t'.join(cells)})
            return units
    data = p.read_bytes()
    encoding = 'utf-8-sig'
    if data.startswith((b'\xff\xfe', b'\xfe\xff')): encoding = 'utf-16'
    text = data.decode(encoding, errors='strict')
    if '\x00' in text: raise ValueError('Binary/NUL text excluded')
    if p.suffix.lower() in ['.csv', '.tsv']:
        return [{'location': {'row': n, 'columnCount': len(row)}, 'text': json.dumps(row, ensure_ascii=False)} for n, row in enumerate(csv.reader(io.StringIO(text, newline=''), delimiter='\t' if p.suffix.lower() == '.tsv' else ','), 1) if any(row)]
    return [{'location': {'line': n}, 'text': line} for n, line in enumerate(text.splitlines(), 1) if line.strip()]

if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    print(json.dumps(extract(sys.argv[1]), ensure_ascii=False))
