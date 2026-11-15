from html.parser import HTMLParser
from urllib.request import urlopen
from pathlib import Path
import re,json,csv,hashlib,datetime
ROOT=Path(__file__).resolve().parents[1]
URL='https://nodis3.gsfc.nasa.gov/displayDir.cfm?Internal_ID=N_PR_7150_002D_&page_name=AppendixC'
class Table(HTMLParser):
    def __init__(self):super().__init__();self.rows=[];self.row=[];self.cell=None
    def handle_starttag(self,tag,attrs):
        if tag=='tr':self.row=[]
        if tag in ('td','th'):self.cell=[]
    def handle_data(self,data):
        if self.cell is not None:self.cell.append(data)
    def handle_endtag(self,tag):
        if tag in ('td','th') and self.cell is not None:self.row.append(' '.join(' '.join(self.cell).split()));self.cell=None
        if tag=='tr' and self.row:self.rows.append(self.row);self.row=[]
raw=urlopen(URL,timeout=30).read(); parser=Table()
try: html=raw.decode('utf-8');encoding='utf-8'
except UnicodeDecodeError:html=raw.decode('cp1252');encoding='cp1252'
parser.feed(html)
rows=[r for r in parser.rows if len(r)>2 and re.fullmatch(r'\d{3}',r[1])]
print(json.dumps({'count':len(rows),'lengths':sorted(set(map(len,rows))),'first':rows[:2]}))
out=ROOT/'docs'/'standards';out.mkdir(parents=True,exist_ok=True)
(out/'NPR_7150_2D_AppendixC.html').write_bytes(raw)
(out/'matrix-raw-rows.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
assert len(rows)==100 and all(len(row)==12 for row in rows)
groups={
 '033':'docs/ENGINEERING_BASELINE.md#architecture',
 '013 024 034 036 037 039 040 042 016 018 046 017':'docs/ENGINEERING_BASELINE.md#lifecycle',
 '139 121 125 020 176 022 205 023 134 219 220':'docs/ENGINEERING_BASELINE.md#classification',
 '027 146 206 147 148 136 070 211':'docs/ENGINEERING_BASELINE.md#dependencies',
 '156 154 157 159 207 185 210 184':'docs/ENGINEERING_BASELINE.md#security',
 '052 050 051 053 054 055 057 143 058 060 061':'docs/requirements.json',
 '135 062 186 063 065 066 187 068 071 073 189 190 191 192 077 194':'docs/ENGINEERING_BASELINE.md#verification',
 '075 195 196 079 080 081 082 083 084 085 045':'docs/ENGINEERING_BASELINE.md#configuration',
 '086 087 088 089 090 093 094 199 201 202 203':'docs/risks-and-gaps.json'
}
evidence={id:location for ids,location in groups.items() for id in ids.split()}
matrix=[]
for r in rows:
    item={'section':r[0],'id':'SWE-'+r[1],'requirement':r[2],'authority':r[3],'class_c_marker':r[6],'status':'OPEN' if r[6]=='X' else 'NOT_INVOKED_BY_CLASS_C_MATRIX','baseline_evidence':evidence.get(r[1],''),'tailoring':'No approved tailoring recorded','remaining_action':'Review the complete requirement and conditional clauses; collect missing evidence and independent approval.','source':URL}
    if r[6]=='X' and item['baseline_evidence']:item['status']='PARTIAL_BASELINE_NOT_CLOSED'
    if r[6]!='X':item['remaining_action']='Check project-specific and conditional invocation; blank is not an approved waiver.'
    matrix.append(item)
(out/'class-c-matrix.json').write_text(json.dumps(matrix,ensure_ascii=False,indent=2),encoding='utf-8')
with (out/'class-c-matrix.csv').open('w',encoding='utf-8-sig',newline='') as handle:
    writer=csv.DictWriter(handle,fieldnames=matrix[0].keys());writer.writeheader();writer.writerows(matrix)
pdf=Path.home()/'Desktop'/'Spaceapps'/'Documents'/'NASA NPR 7.pdf'
meta={'document':'NPR 7150.2D','effective':'2022-03-08','expires':'2027-03-08','captured_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pdf_path':str(pdf),'pdf_sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'html_sha256':hashlib.sha256(raw).hexdigest(),'html_encoding':encoding,'total_matrix_rows':len(matrix),'class_c_invoked':sum(x['class_c_marker']=='X' for x in matrix),'completed_compliance_requirements':0,'note':'Source-preserving initial applicability register, not a compliance certificate; chapters and conditional requirements still require review.'}
(out/'source-record.json').write_text(json.dumps(meta,indent=2),encoding='utf-8')
print(json.dumps(meta))
