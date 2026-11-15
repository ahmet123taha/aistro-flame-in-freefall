"""Offline, reviewed Saffire sensor columns -> exact source-cell graph data.
No workbook editing, model calls, digitization, smoothing or cross-trial joins.
Run with --dataset; source bytes and original catalog remain unchanged.
"""
from pathlib import Path
import argparse,zipfile,xml.etree.ElementTree as ET,json,gzip,hashlib,re,math
N={'s':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
S='{'+N['s']+'}'
def sha(b):return hashlib.sha256(b).hexdigest()
def xlsx_rows(p):
 z=zipfile.ZipFile(p)
 strings=[]
 if 'xl/sharedStrings.xml' in z.namelist():
  for _,e in ET.iterparse(z.open('xl/sharedStrings.xml'),events=('end',)):
   if e.tag==S+'si':strings.append(''.join(n.text or '' for n in e.iter(S+'t')));e.clear()
 rels={e.attrib['Id']:e.attrib['Target'] for e in ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))}
 sheets=[]
 for e in ET.fromstring(z.read('xl/workbook.xml')).find(S+'sheets'):
  name=e.attrib['name'];target=rels[e.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']]
  target=target.lstrip('/') if target.startswith('/') else 'xl/'+target
  sheets.append((name,target))
 def rows(target):
  for _,e in ET.iterparse(z.open(target),events=('end',)):
   if e.tag==S+'row':
    cells={}
    for c in e:
     if c.tag!=S+'c':continue
     key=re.sub(r'\d','',c.attrib['r']);v=c.find(S+'v');raw=v.text if v is not None else None;t=c.attrib.get('t')
     if t=='s' and raw is not None:raw=strings[int(raw)]
     elif t=='inlineStr':raw=''.join(v.text or '' for v in c.iter(S+'t'))
     elif t in ('e','b'):raw=None
     cells[key]=raw
    yield int(e.attrib['r']),cells
    e.clear()
 return z,sheets,rows
def finite(v):
 try:n=float(v);return n if math.isfinite(n) else None
 except (ValueError,TypeError):return None
def main():
 ap=argparse.ArgumentParser();ap.add_argument('--dataset',required=True);ap.add_argument('--qa',required=True);a=ap.parse_args();root=Path(a.dataset);qa=Path(a.qa);qa.mkdir(parents=True,exist_ok=True)
 catalog_bytes=(root/'_app/files.json.gz').read_bytes();files=json.loads(gzip.decompress(catalog_bytes));byid={f['id']:f for f in files}
 target=root/'Prepared_Graphs/v1';(target/'data').mkdir(parents=True,exist_ok=True)
 ids=['f3292','f3293','f51114','f51117','f51124','f51129','f51130','f51133','f51135','f51136','f51137','f51139','f51140']
 manifest={'schema':1,'version':'0.4.10','catalogSha256':sha(catalog_bytes),'graphs':[]};audit=[]
 # These named columns have directly declared units in row2 of source-calibrated sheets.
 accepted=re.compile(r'^(CO2|O2|Ambient Pressure|Anemometer [12]|Radiometer [1-4]|Humidity|Test Section Inlet Temp|Plume Temp [1-6](?: \(TC[1-6]\))?)$',re.I)
 allowed={'%','cm/sec','cm/s','PSIA','psia','mw/cm^2','mW/cm^2','Degrees C','deg C','C'}
 for fid in ids:
  f=byid[fid];p=root/f['path'];b=p.read_bytes();assert sha(b)==f['sha256'];z,sheets,rows=xlsx_rows(p)
  record={'fileId':fid,'sha256':f['sha256'],'sheets':[],'generated':0};print('Reading',fid,f['name'],flush=True)
  for name,part in sheets:
   if not re.search('calibrated',name,re.I):continue
   it=rows(part);headrow,head=next(it);unitrow,units=next(it);xcol=next((c for c,h in head.items() if h and h.strip().lower()=='elapsed time (s)'),None)
   selected={c:h for c,h in head.items() if h and accepted.fullmatch(h.strip()) and (units.get(c) or '').strip() in allowed}
   review={'sheet':name,'headers':head,'units':units,'includedColumns':selected,'reason':'Explicit elapsed seconds and named calibrated sensor quantities; all other columns excluded from this reviewed recipe.'};record['sheets'].append(review)
   if not xcol or not selected:review['excluded']='No exact reviewed header/unit pair';continue
   columns={c:[] for c in selected};invalid={c:0 for c in selected};lastx=None
   for row,cells in it:
    xraw=cells.get(xcol);x=finite(xraw)
    for c in selected:
     yraw=cells.get(c);y=finite(yraw);points=columns[c]
     if x is None or y is None:
      invalid[c]+=1
      if points and points[-1] is not None:points.append(None)
      continue
     if lastx is not None and x<lastx and points and points[-1] is not None:points.append(None)
     points.append({'x':x,'y':y,'row':row,'xCell':xcol+str(row),'yCell':c+str(row),'xRaw':xraw,'yRaw':yraw})
    if x is not None:lastx=x
   for c,points in columns.items():
    actual=[p for p in points if p];unique={p['x'] for p in actual}
    if len(actual)<3 or len(unique)<3 or len(points)>100000:review.setdefault('skipped',{})[c]='Insufficient unique times or exceeds100000-point reader bound';continue
    if len({p['y'] for p in actual})<2:review.setdefault('skipped',{})[c]='Constant channel; no curve variation';continue
    gid='g-'+fid+'-'+c.lower();label=selected[c].strip();sample=re.search(r'(?:Sample\s*\d+)',f['name'],re.I);title=f['accessions'][0]+' · '+(sample.group(0) if sample else 'Saffire sensor series')+' · '+label
    limits=['Source-calibrated sensor output, not a reconstructed original report figure.','All finite source rows are retained; no smoothing, interpolation, new fit or resampling.','Calibration quality, negative offsets, instrument saturation and measurement uncertainty are not independently certified. Values are not converted into fire probability.']
    if invalid[c]:limits.append(str(invalid[c])+' rows lack a finite x/y pair; gaps are preserved.')
    graph={'id':gid,'kind':'generated','origin':'source_table','title':title,'caption':'Time history of '+label+' from the source workbook, sheet '+name+'. Each point links to its original cells.','limitations':limits,'connect':False,'source':{'fileId':fid,'name':f['name'],'sha256':f['sha256'],'sheet':name},'x':{'label':'Elapsed time','unit':'s'},'y':{'label':label,'unit':units[c].strip()},'series':[{'id':c,'label':label,'points':points}]}
    data=gzip.compress(json.dumps(graph,ensure_ascii=False,separators=(',',':'),allow_nan=False).encode(),mtime=0);rel='data/'+gid+'.json.gz';(target/rel).write_bytes(data)
    manifest['graphs'].append({'id':gid,'kind':'generated','title':title,'sourceId':fid,'sourceSha256':f['sha256'],'dataPath':rel,'dataSha256':sha(data),'bytes':len(data),'points':len(actual),'sheet':name,'xColumn':xcol,'yColumn':c});record['generated']+=1
  z.close();audit.append(record);(qa/'graph-preparation-progress.json').write_text(json.dumps(audit,ensure_ascii=False,indent=1),encoding='utf8')
 # Original Saffire-III analysis graphs: native JPG bytes, reviewed separately.
 for f in files:
  if 'PSI-100' in f['accessions'] and re.search(r'Mapped_[SF][12]C[12]-__(?:GreenLayerMeanIntensity|MeanIntensity|dt)\.jpg$',f['name'],re.I):
   assert sha((root/f['path']).read_bytes())==f['sha256']
   title='Saffire-III · '+f['name'].split('__',1)[-1].replace('Mapped_','').replace('__',' ').removesuffix('.jpg')
   manifest['graphs'].append({'id':'g-original-'+f['id'],'kind':'documented','title':title,'sourceId':f['id'],'sourceSha256':f['sha256'],'caption':'Original author-supplied image-analysis graph. Read quantities and units from the original axes; no pixel-derived numerical values or material-property inference.'})
 (qa/'graph-preparation-audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=1),encoding='utf8')
 payload=json.dumps(manifest,ensure_ascii=False,indent=1).encode();(target/'manifest.json').write_bytes(payload)
 Path('lib/prepared-graph-baseline.mjs').write_text('// Hash-pinned offline graph add-on; original source files remain immutable.\nexport const PREPARED_GRAPH_BASELINE='+json.dumps({'path':'Prepared_Graphs/v1/manifest.json','sha256':sha(payload)})+';\n',encoding='utf8')
 receipt={'generated':sum(e['kind']=='generated' for e in manifest['graphs']),'documented':sum(e['kind']=='documented' for e in manifest['graphs']),'sourceWorkbooks':len(ids),'points':sum(e.get('points',0) for e in manifest['graphs']),'compressedBytes':sum(e.get('bytes',0) for e in manifest['graphs'])+len(payload),'manifestSha256':sha(payload),'originalCatalogSha256':sha(catalog_bytes),'originalsModified':False,'liveModelCalls':0}
 (qa/'graph-preparation.json').write_text(json.dumps(receipt,indent=2),encoding='utf8');print(json.dumps(receipt),flush=True)
if __name__=='__main__':main()
