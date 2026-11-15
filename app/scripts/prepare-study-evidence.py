"""Build a bounded, source-hash-pinned discovery index. Never edit NASA data.

Study spans are marginal evidence, not fabricated joint trials or burn predictions.
Only explicitly labelled environmental columns enter numerical support.
"""
from pathlib import Path
import csv, hashlib, json, re, sys, xml.etree.ElementTree as E, zipfile

root=Path(sys.argv[1]); sources=json.loads((root/'verified-supplemental-sources.json').read_text(encoding='utf-8'))
byid={s['id']:s for s in sources}; result=[]
def original(id):
    s=byid[id];p=root/'sources'/(id+Path(s['name']).suffix)
    b=p.read_bytes()
    if hashlib.sha256(b).hexdigest()!=s['sha256']:raise ValueError('Source changed: '+id)
    return p
def rows(id):return [{k.strip():v for k,v in r.items()} for r in csv.DictReader(original(id).read_text(encoding='utf-8-sig').splitlines())]
def base(id,source,row,material,text,parameters=None,**extra):
    s=byid[id]
    return {'sourceId':source,'material':material,'parameters':parameters or {},'scope':'marginal_study_summary','text':text,'provenance':{'fileId':id,'name':s['name'],'sha256':s['sha256'],'row':row},**extra}
def parameter(kind,raw,column,unit,values=None,low=None,high=None,**extra):
    return {'kind':kind,'raw':raw,'column':column,'unit':unit,**({'values':values} if values is not None else {}),**({'min':low,'max':high} if low is not None else {}),**extra}
def plain_numbers(text):
    parts=re.split(r';|\bor\b',text)
    vals=[]
    for part in parts:
        if not part.strip():continue
        m=re.fullmatch(r'\s*(\d+(?:\.\d+)?)\s*%?\s*',part)
        if not m:return None
        vals.append(float(m[1]))
    return vals or None

for i,r in enumerate(rows('f15150'),2):
    raw=r['Oxygen Conc (percent)'];vals=plain_numbers(raw)
    if not vals or any(v>100 for v in vals):continue
    if 'C2H4' not in r['Fuel Bottle']:continue
    result.append(base('f15150','PSI-20',i,'ethylene','BRE summary: ethylene flame burning-rate emulation; approximate oxygen settings '+raw+'. Chamber pressures varied but are not identified in this summary.',{'oxygen':parameter('set',raw,'Oxygen Conc (percent)','% vol',values=vals,approximate=True)}))
for i,r in enumerate(rows('f17650'),2):
    # Keep only valid explicit bottle formulae. Do not silently repair CH5, CH6...
    material='methane' if 'CH4' in r['Fuel Bottle'] else 'ethylene' if 'C2H4' in r['Fuel Bottle'] else None
    if material:result.append(base('f17650','PSI-21',i,material,'Coflow laminar diffusion-flame study. Fuel bottle: '+r['Fuel Bottle']+'. Fuel concentration range (burner fuel diluted with nitrogen, NOT ambient oxygen): '+r['Fuel conc. Range']+'. MFC labels are controller maximum nitrogen-basis flow capacities, not local ambient velocity.',scope='material_and_fuel_stream_context'))
for i,r in enumerate(rows('f20515'),2):
    material='methane' if 'CH4' in r['Fuel Bottle'] else 'ethylene' if 'C2H4' in r['Fuel Bottle'] else None
    if material:result.append(base('f20515','PSI-22',i,material,'Electric-field diffusion flame study. Mesh polarity: '+r['Mesh Polarity']+'. Fuel bottle: '+r['Fuel Bottle']+'. Fuel stream concentration: '+r['Fuel Conc']+'. Fuel-stream concentration is not ambient oxygen.',scope='material_and_fuel_stream_context'))
for i,r in enumerate(rows('f22719'),2):
    material='ethylene' if 'C2H4' in r['Fuel Bottle'] else 'methane' if 'CH4' in r['Fuel Bottle'] else None
    if not material:continue
    raw=r['Atmosphere*'];m=re.fullmatch(r'~(\d+(?:\.\d+)?)% O2 with N2',raw.strip())
    params={'oxygen':parameter('set',raw,'Atmosphere*','% vol',values=[float(m[1])],approximate=True)} if m else {}
    result.append(base('f22719','PSI-23',i,material,'Spherical diffusion-flame structure and response. Atmosphere: '+raw+'. Fuel bottle: '+r['Fuel Bottle']+'. Summary notes pressure rises and oxygen falls with vitiation; nominal oxygen is not a constant synchronized run value.',params,scope='nominal_atmosphere_summary'))

# FLEX-1393: read pressure only. YO2's Y symbol has no explicit fraction basis here.
original('f34162');text=(root/'sources/f34162.txt').read_text(encoding='utf-8')
m=re.search(r'P\s*=\s*([\d.]+)\s*mmHg',text)
if not m or 'Farnesane' not in text:raise ValueError('Reviewed FLEX header differs')
raw=m[1]
result.append(base('f34162','PSI-39',None,'farnesane','FLEX-1393 / F240B02: Farnesane. Source header pressure P = '+raw+' mmHg. Hot/cool flame and droplet-history plots are reported; plotted burn/extinction values are outputs, not ambient inputs.',{'pressure':parameter('set',raw+' mmHg','P','kPa',values=[float(raw)*.133322387415],sourceUnit='mmHg',factor=.133322387415)},scope='individual_run_header',page=1))

materials={'IsoOctane (pure)':'iso-octane','n-Octane (pure)':'n-octane','Heptane (pure)':'heptane','Decane (pure)':'decane (isomer unspecified)','Ethanol (pure)':'ethanol'}
for i,r in enumerate(rows('f36766'),2):
    label=r['Sample (Fuel Type)'];material=materials.get(label,label.lower())
    o=plain_numbers(r['Oxygen Mole Fraction']);p=plain_numbers(r['Ambient Pressure (atm)'])
    low,high=map(float,re.fullmatch(r'\s*([\d.]+)\s*-\s*([\d.]+)\s*',r['Flow Velocity (cm/s)']).groups())
    result.append(base('f36766','PSI-68',i,material,'FLEX-2 experimental summary for '+label+'. Gas mixture '+r['Ambient Gas Mixture']+'. These are separate reported parameter sets/ranges, not proof that every combination was tested. Pure fuels and mixtures remain distinct.',{
        'oxygen':parameter('set',r['Oxygen Mole Fraction'],'Oxygen Mole Fraction','% vol',values=[v*100 for v in o],sourceUnit='mole fraction',factor=100),
        'pressure':parameter('set',r['Ambient Pressure (atm)'],'Ambient Pressure (atm)','kPa',values=[v*101.325 for v in p],sourceUnit='atm',factor=101.325),
        'temperatureK':parameter('set',r['Ambient Temperature (C)'],'Ambient Temperature (C)','K',values=[float(r['Ambient Temperature (C)'])+273.15],sourceUnit='C',offset=273.15),
        'airflow':parameter('range',r['Flow Velocity (cm/s)'],'Flow Velocity (cm/s)','cm/s',low=low,high=high)}))
for i,r in enumerate(rows('f4106'),2):
    label=r['Fuel Type'];material='methane' if 'CH4' in label else 'ethylene' if 'C2H4' in label else None
    if material:result.append(base('f4106','PSI-106',i,material,'SLICE structure/liftoff study. Fuel Type: '+label+'. The table reports test date and fuel type, not actual ambient pressure, temperature or specimen flow.',scope='material_and_fuel_stream_context'))

# Positional CSV reading is required: repeated P headers belong to separate
# experimental, model and uncertainty columns. Never overwrite duplicate headers.
raw=list(csv.reader(original('f11554').read_text(encoding='utf-8-sig').splitlines()))
if raw[0][0]!='P (atm)' or raw[0][1]!='Dext_HF_EXPT':raise ValueError('Experimental pressure header differs')
for i,r in enumerate(raw[1:],2):
    if not r[0] or not r[1]:continue
    p=float(r[0]);result.append(base('f11554','PSI-117',i,'dodecane','n-alkane C12 extinction-diameter pressure series: leftmost experimental P (atm) and Dext_HF_EXPT columns only. Parallel model and error-bar columns are not extra experiments. Extinction diameter is an output, not initial droplet size.',{'pressure':parameter('set',r[0],'P (atm) [experimental block, column A]','kPa',values=[p*101.325],sourceUnit='atm',factor=101.325)},scope='experimental_curve_parameter'))

# The workbook provides nC14 / Yf / extinction-stretch data. Yf unit semantics
# have not been reconciled, so retain the scientific fragment without a percentage.
s=byid['f11568'];original('f11568')
result.append(base('f11568','PSI-142',None,'n-tetradecane','Workbook data ID 1: source label nC14; columns Yf and aCFE (1/s). The first printed values are Yf=0.12067508387328092, aCFE=85.09 1/s. Data summary calls this cool-flame extinction with ozone. Yf fraction basis is unresolved and aCFE is an extinction output; neither is an ambient-oxygen input.',scope='material_and_curve_context',sheet='data ID 1',cells='C4:E5'))

used={e['provenance']['fileId'] for e in result};pins=[{'fileId':s['id'],'sha256':s['sha256']}for s in sources if s['id'] in used]
output='// Generated by scripts/prepare-study-evidence.py; source data stay read-only.\nexport const STUDY_EVIDENCE_SOURCES = '+json.dumps(pins,separators=(',',':'))+';\nexport const STUDY_EVIDENCE_DATA = '+json.dumps(result,separators=(',',':'))+';\n'
Path(sys.argv[2]).write_text(output,encoding='utf-8')
print(json.dumps({'sources':len(pins),'fragments':len(result),'investigations':len({r['sourceId'] for r in result}),'numericalInvestigations':len({r['sourceId']for r in result if r['parameters']})}))
