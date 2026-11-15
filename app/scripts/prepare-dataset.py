"""Create the read-only portable index; preserve all existing scientific payloads."""
import csv,gzip,hashlib,json,re,shutil,sys
from pathlib import Path
from html.parser import HTMLParser
from datetime import datetime,timezone

ROOT=Path(sys.argv[1]); DATA=ROOT/'Veri_Seti'; AUDIT=Path(sys.argv[2])
APP=DATA/'_app'; APP.mkdir(exist_ok=True); (APP/'metadata').mkdir(exist_ok=True)
SUP=DATA/'Destek_Kaynaklar'; SUP.mkdir(exist_ok=True)
def sha(b):return hashlib.sha256(b).hexdigest()
def write(p,d):p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
files={}; byhash={}
with gzip.open(DATA/'_manifests/library_manifest_current.csv.gz','rt',encoding='utf-8-sig',newline='') as f:
 for r in csv.DictReader(f):
  rel=r.get('dataset_relative_path',''); h=r.get('sha256','')
  if not rel:continue
  if not (DATA/rel).is_file():raise RuntimeError('Missing indexed payload: '+rel)
  if rel not in files:files[rel]={'path':rel,'name':Path(rel).name,'bytes':int(r['output_bytes']),'sha256':h,'category':r['content_category'],'accessions':[],'url':r.get('landing_url',''),'quality':r.get('final_qa_outcome','')};byhash[h]=rel
  if r['accession'] not in files[rel]['accessions']:files[rel]['accessions'].append(r['accession'])
def register(source,accession,category,url):
 b=source.read_bytes();h=sha(b)
 if h in byhash:rel=byhash[h]
 else:
  target=SUP/source.name
  if target.exists() and sha(target.read_bytes())!=h:target=SUP/(h[:12]+'__'+source.name)
  if not target.exists():shutil.copyfile(source,target)
  rel=target.relative_to(DATA).as_posix();files[rel]={'path':rel,'name':source.name,'bytes':len(b),'sha256':h,'category':category,'accessions':[],'url':url,'quality':'source_document'};byhash[h]=rel
 if accession not in files[rel]['accessions']:files[rel]['accessions'].append(accession)
 return rel,h
class Text(HTMLParser):
 def __init__(self):super().__init__();self.skip=0;self.main=0;self.parts=[];self.mainparts=[]
 def handle_starttag(self,t,a):
  if t in ['script','style','nav','header','footer','svg','button']:self.skip+=1
  if t in ['main','article']:self.main+=1
  if t in ['p','h1','h2','h3','h4','li','br']:self.handle_data('\n')
 def handle_endtag(self,t):
  if t in ['script','style','nav','header','footer','svg','button']:self.skip=max(0,self.skip-1)
  if t in ['main','article']:self.main=max(0,self.main-1)
 def handle_data(self,d):
  if not self.skip:self.parts.append(d);self.mainparts.extend([d] if self.main else [])
 def result(self):return re.sub(r'\n\s*\n+', '\n', re.sub(r'[ \t\r]+',' ',''.join(self.mainparts or self.parts))).strip()
links=json.loads((AUDIT/'live_resource_links.json').read_text(encoding='utf-8'))
live=json.loads((AUDIT/'linked_sources_live.json').read_text());liveby={r['url']:r for r in live}
official=[(u,t) for u,t in links if 'youtube.com' not in u and 'psi.nasa.gov' not in u]
for key,title in [('flammability-of-materials-on-the-moon-fm2','FM2 — Flammability of Materials on the Moon'),('solid-fuel-ignition-and-extinction-sofie','SoFIE — Solid Fuel Ignition and Extinction'),('flammability-limits-at-reduced-g-experiment-flare','FLARE — Flammability Limits At Reduced-g Experiment')]:
 official.append(('https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/'+key+'/',title))
records=[];sources=[];docmanifest=json.loads((ROOT/'documents_manifest.json').read_text(encoding='utf-8'))['records']
for n,(url,title) in enumerate(official,1):
 rid=f'REF-{n:02d}'; fetched=liveby[url]
 if fetched.get('status')!=200:raise RuntimeError('Support source not fetched: '+url)
 body=(AUDIT/fetched['file']).read_bytes();parser=Text();parser.feed(body.decode('utf-8',errors='replace'));txt=parser.result()
 snapshot=SUP/(rid+'.html');snapshot.write_bytes(body);plain=SUP/(rid+'.txt');plain.write_text(txt,encoding='utf-8')
 rel,h=register(snapshot,rid,'Destek/Raporlar',url);register(plain,rid,'Destek/Okunabilir_Metin',url)
 for r in docmanifest:
  if r.get('file') and (r.get('url')==url or r.get('source_page')==url):
   source=Path(r['file']);b=source.read_bytes()
   if r.get('sha256') and sha(b)!=r['sha256']:raise RuntimeError('Support hash mismatch: '+str(source))
   register(source,rid,'Destek/Raporlar',r.get('url',url))
 content=txt[:16000]
 records.append({'id':rid,'name':title,'title':title,'subtitle':'Resmî bağlantıdan alınan destek belgesi','kind':'Destek kaynağı','filename':rel,'sha256':h,'bytes':len(body),'url':url,'version':'2026.11.14-v1','material':'Belgedeki kapsamı inceleyin','parameters':'Sayısal deney tablosu olarak normalize edilmedi','aliases':[x.lower() for x in re.findall(r'[A-Za-z0-9]+',title) if len(x)>3],'publications':[],'tableReferences':[],'rowCount':0,'content':{'documentText':content},'textTruncated':len(txt)>len(content),'textScope':'Web sayfası metni. Ekli PDFlerin tam metni bu alana dahil değildir.'})
 sources.append({'id':rid,'url':url,'title':title,'checked':fetched['checked_utc'],'sha256':h,'textSha256':sha(txt.encode()),'tls_verified':fetched.get('tls_verified')})
# Preserve additional previously collected technical papers and recovered PDF links.
for r in docmanifest:
 if r.get('file') and Path(r['file']).suffix.lower() in ['.pdf','.txt','.html']:
  register(Path(r['file']),'REFERANSLAR','Destek/Raporlar',r.get('url',''))
index=json.loads((DATA/'DENEY_INDEKSI.json').read_text(encoding='utf-8-sig'));ids=[x['accession'] for x in index['investigations']];metadata={}
for id in ids:
 name=id+'_investigation_metadata.json';b=(ROOT/'Inventory_PSI'/name).read_bytes();(APP/'metadata'/name).write_bytes(b);metadata[name]=sha(b)
write(APP/'support-records.json',records);write(SUP/'KAYNAKLAR.json',sources)
rows=sorted(files.values(),key=lambda r:r['path'])
for i,r in enumerate(rows):r['id']='f'+str(i)
packed=gzip.compress(json.dumps(rows,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=6,mtime=0);(APP/'files.json.gz').write_bytes(packed)
manifest={'schema':1,'version':'2026.11.14-v1','frozenAt':datetime.now(timezone.utc).isoformat(),'applicationCompatibility':'0.0.1','investigations':ids,'metadataHashes':metadata,'supportHash':sha((APP/'support-records.json').read_bytes()),'filesHash':sha(packed),'fileCount':len(rows),'payloadBytes':sum(r['bytes'] for r in rows),'knownMissing':67,'reviewNeeded':2269,'limitations':['40 excluded source archives are outside the selected scope.','Some files need format/role review; file integrity is not scientific validation.','Numerical measurement files are browsable but not all parsed into uniform input/output rows.','AI consumes selected metadata and support webpage text, not every PDF/Excel automatically.']}
write(DATA/'DATASET.json',manifest)
shutil.copyfile(AUDIT/'KAYNAK_KAPSAMI_RAPORU.txt',SUP/'KAPSAM_DENETIMI.txt')
(DATA/'KULLANIM.txt').write_text('VERI SETI 2026.11.14-v1\nBu Veri_Seti klasörünü SpaceApps1.exe ile aynı klasöre koyun ve uygulamayı açın.\nKlasörü yeniden adlandırmayın; iç içe Veri_Seti/Veri_Seti oluşturmayın.\nPaket salt okunur bilimsel kaynak havuzudur. Sayısal deneylerin tümü normalize edilmemiştir.\n67 eksik/atlanmış kaynak kaydı ve 2269 sınıflandırma incelemesi korunur.\nUygulama açılışta indeksleri, erişimde dosya hashlerini doğrular.\nPSI kaynakları PSI klasöründe; diğer NASA belgeleri Destek_Kaynaklar içindedir.\n',encoding='utf-8-sig')
print(json.dumps({'files':len(rows),'bytes':manifest['payloadBytes'],'investigations':len(ids),'support':len(records)}))
