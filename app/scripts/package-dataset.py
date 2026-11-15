"""ZIP64 package, source SHA verification and full decompressed readback."""
from pathlib import Path
import sys,json,gzip,hashlib,zipfile,os,time
root=Path(sys.argv[1]).resolve(); dest=Path(sys.argv[2]).resolve();dest.parent.mkdir(parents=True,exist_ok=True)
partial=dest.with_suffix('.zip.partial'); receipt=dest.with_suffix('.verification.json');log=dest.with_suffix('.members.jsonl')
files=sorted(f for f in root.rglob('*') if f.is_file());total=sum(f.stat().st_size for f in files)
expected={r['path']:(r['sha256'],r['bytes']) for r in json.loads(gzip.decompress((root/'_app/files.json.gz').read_bytes()))}
rows=[];done=0;threshold=10;start=time.time()
def progress(stage,done,total):
 state={'stage':stage,'completedBytes':done,'totalBytes':total,'percent':round(done/total*100,2),'elapsedSeconds':round(time.time()-start,1)}
 tmp=receipt.with_suffix('.tmp');tmp.write_text(json.dumps(state),encoding='utf-8');os.replace(tmp,receipt);print(json.dumps(state),flush=True)
with zipfile.ZipFile(partial,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=1,allowZip64=True) as z,log.open('w',encoding='utf-8') as l:
 for f in files:
  relative=f.relative_to(root).as_posix();name='Veri_Seti/'+relative
  if f.is_symlink():raise RuntimeError('Unexpected symlink '+relative)
  info=zipfile.ZipInfo.from_file(f,name);info.compress_type=zipfile.ZIP_DEFLATED;info._compresslevel=1
  h=hashlib.sha256();size=0
  with f.open('rb') as source,z.open(info,'w',force_zip64=True) as target:
   while chunk:=source.read(1024*1024):target.write(chunk);h.update(chunk);size+=len(chunk);done+=len(chunk)
  row={'path':name,'bytes':size,'sha256':h.hexdigest()}
  if relative in expected and expected[relative]!=(row['sha256'],size):raise RuntimeError('Canonical hash mismatch '+relative)
  rows.append(row);l.write(json.dumps(row,ensure_ascii=False)+'\n')
  if done/total*100>=threshold:progress('compressing',done,total);threshold+=10
progress('readback',0,total);done=0;threshold=10
with zipfile.ZipFile(partial) as z:
 assert len(z.infolist())==len(rows)==len(set(z.namelist()))
 for row in rows:
  h=hashlib.sha256();size=0
  with z.open(row['path']) as f:
   while chunk:=f.read(1024*1024):h.update(chunk);size+=len(chunk);done+=len(chunk)
  if h.hexdigest()!=row['sha256'] or size!=row['bytes']:raise RuntimeError('Archive readback mismatch '+row['path'])
  if done/total*100>=threshold:progress('readback',done,total);threshold+=10
os.replace(partial,dest)
h=hashlib.sha256()
with dest.open('rb') as f:
 while chunk:=f.read(8*1024*1024):h.update(chunk)
result={'passed':True,'stage':'complete','archive':str(dest),'archiveBytes':dest.stat().st_size,'uncompressedBytes':total,'members':len(rows),'indexedPayloadFiles':len(expected),'sha256':h.hexdigest(),'fullMemberSha256Readback':True,'canonicalPayloadSha256Verified':True,'elapsedSeconds':round(time.time()-start,1)}
receipt.write_text(json.dumps(result,indent=2),encoding='utf-8');dest.with_suffix('.sha256').write_text(h.hexdigest()+'  '+dest.name+'\n');print(json.dumps(result),flush=True)
