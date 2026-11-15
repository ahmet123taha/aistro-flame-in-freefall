import {readFile,writeFile,mkdir,realpath,stat,rename} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzip,gzipSync} from 'node:zlib';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {makeChunks,sha,lexicalTerms} from '../lib/source-content-index.mjs';
import {randomUUID} from 'node:crypto';
const exec=promisify(execFile),unzip=promisify(gunzip),here=path.dirname(fileURLToPath(import.meta.url));
const EXTRACTOR_VERSION='prototype-2';
const SUPPORTED=new Set(['.pdf','.xlsx','.csv','.tsv','.txt','.md','.log']);
export function coreSource(file){return !/material[_ -]?sensitivity|third[_ -]?party/i.test(file.path+' '+file.name+' '+file.category)&&file.accessions.some(id=>/^(PSI|REF)-\d+$/.test(id));}
async function atomic(filename,bytes){await writeFile(filename+'.tmp',bytes);for(let attempt=0;;attempt++){try{await rename(filename+'.tmp',filename);return;}catch(error){if(!['EPERM','EBUSY','EACCES'].includes(error.code)||attempt>=20)throw error;await new Promise(resolve=>setTimeout(resolve,50));}}}
export async function build(root,output,{ids=[],maxFileBytes=64*1024*1024,maxPages=600,onProgress=()=>{},diskOnly=false}={}){
 const runId=randomUUID(),startedAt=new Date().toISOString();
 const base=await realpath(root),manifestBytes=await readFile(path.join(base,'DATASET.json')),manifest=JSON.parse(manifestBytes);
 const catalogBytes=await readFile(path.join(base,'_app/files.json.gz'));if(sha(catalogBytes)!==manifest.filesHash)throw Error('Catalog hash mismatch');
 const files=JSON.parse((await unzip(catalogBytes,{maxOutputLength:64*1024*1024})).toString('utf8')),selected=ids.length?files.filter(f=>ids.includes(f.id)):files;
 const priority={'.pdf':0,'.xlsx':1,'.log':2};selected.sort((a,b)=>(priority[path.extname(a.name).toLowerCase()]??3)-(priority[path.extname(b.name).toLowerCase()]??3)||a.id.localeCompare(b.id,undefined,{numeric:true}));
 if(ids.some(id=>!selected.some(f=>f.id===id)))throw Error('Unknown requested file ID');
 await mkdir(path.join(output,'checkpoints'),{recursive:true});
 const groups=new Map();for(const file of selected){const key=coreSource(file)?file.sha256:'excluded-'+file.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(file);}
 const chunks=[],audit=[],shards=[];let pdfjs,chunkCount=0;
 function retain(extracted,entry){chunkCount+=extracted.length;if(!diskOnly)chunks.push(...extracted);shards.push({fileId:entry.fileId,fileAliases:entry.fileAliases,sourceIds:entry.sourceIds.filter(x=>/^(PSI|REF)-\d+$/.test(x)),sha256:entry.sha256,path:'checkpoints/'+entry.sha256+'.json.gz',chunks:extracted.length,terms:[...new Set(extracted.flatMap(c=>lexicalTerms(c.quote,entry.extension==='.xlsx')))]});}
 async function checkpoint(entry){audit.push(entry);const progress={runId,startedAt,extractorVersion:EXTRACTOR_VERSION,totalSelectedFiles:selected.length,totalHashGroups:groups.size,completedHashGroups:audit.length,rawTextChunks:chunkCount,resumedFiles:audit.filter(x=>x.resumed).length,last:entry};await atomic(path.join(output,'progress.json'),JSON.stringify(progress));onProgress({...progress,chunks:chunkCount});}
 for(const aliases of groups.values()){
  const started=performance.now(),file={...aliases[0],accessions:[...new Set(aliases.flatMap(f=>f.accessions))]},ext=path.extname(file.name).toLowerCase();
  const entry={fileId:file.id,fileAliases:aliases.map(({id,name,accessions,path})=>({fileId:id,name,accessions,path})),sha256:file.sha256,sourceIds:file.accessions,extension:ext};
  if(!coreSource(file)){await checkpoint({...entry,status:'excluded_non_core_or_third_party'});continue;}
  if(!SUPPORTED.has(ext)){await checkpoint({...entry,status:'unsupported_format'});continue;}
  if(file.bytes>maxFileBytes){await checkpoint({...entry,status:'size_limit',bytes:file.bytes});continue;}
  try{
   if(file.path.includes('\\')||path.posix.isAbsolute(file.path)||file.path.split('/').some(s=>!s||s==='.'||s==='..')||file.path.includes(':'))throw Error('Invalid file path');
   const filename=await realpath(path.join(base,...file.path.split('/'))),relative=path.relative(base,filename);if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('File escapes dataset');
   if((await stat(filename)).size!==file.bytes)throw Error('File size changed');const bytes=await readFile(filename);if(sha(bytes)!==file.sha256)throw Error('File hash changed');
   let cached;const shard=path.join(output,'checkpoints',file.sha256+'.json.gz');
   try{cached=JSON.parse((await unzip(await readFile(shard))).toString('utf8'));if(cached.extractorVersion!==EXTRACTOR_VERSION||cached.sha256!==file.sha256)cached=null;}catch{cached=null;}
   if(cached){retain(cached.chunks.map(c=>({...c,fileId:file.id,sourceIds:file.accessions.filter(x=>/^(PSI|REF)-\d+$/.test(x)),fileAliases:entry.fileAliases})),entry);await checkpoint({...entry,...cached.audit,resumed:true,milliseconds:performance.now()-started});continue;}
   let units=[],emptyPages=0;
   if(ext==='.pdf'){
    pdfjs??=await import('pdfjs-dist/legacy/build/pdf.mjs');const task=pdfjs.getDocument({data:new Uint8Array(bytes),isEvalSupported:false,useSystemFonts:true,disableFontFace:true});
    try{const doc=await task.promise;if(doc.numPages>maxPages)throw Error('PDF page limit');for(let page=1;page<=doc.numPages;page++){const p=await doc.getPage(page),content=await p.getTextContent(),text=content.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('');units.push({location:{page},text});if(!text.trim())emptyPages++;p.cleanup();}}finally{await task.destroy();}
   }else{const {stdout}=await exec('python',[path.join(here,'extract-source-tabular.py'),filename],{encoding:'utf8',maxBuffer:128*1024*1024,timeout:60000,windowsHide:true});units=JSON.parse(stdout);}
   const extracted=makeChunks(file,units).map(c=>({...c,fileAliases:entry.fileAliases}));retain(extracted,entry);
   const summary={status:extracted.length?'extracted_unreviewed':'no_extractable_text',units:units.length,emptyPages,chunks:extracted.length,milliseconds:performance.now()-started};
   await atomic(shard,gzipSync(JSON.stringify({extractorVersion:EXTRACTOR_VERSION,sha256:file.sha256,chunks:extracted,audit:summary}),{mtime:0}));await checkpoint({...entry,...summary});
  }catch(error){await checkpoint({...entry,status:'excluded_error',reason:String(error.stderr||error.message).slice(-500),milliseconds:performance.now()-started});}
 }
 const result={schema:1,runId,startedAt,completedAt:new Date().toISOString(),extractorVersion:EXTRACTOR_VERSION,scope:'isolated_read_only_prototype_not_application_index',datasetVersion:manifest.version,datasetManifestSha256:sha(manifestBytes),catalogSha256:manifest.filesHash,selectedFiles:selected.length,uniqueFileHashes:groups.size,totalCatalogFiles:files.length,coverageComplete:selected.length===files.length,chunkCount,audit,shards,...(!diskOnly?{chunks}:{})};
 await atomic(path.join(output,diskOnly?'content-manifest.json.gz':'content-index.json.gz'),gzipSync(JSON.stringify(result),{mtime:0}));await atomic(path.join(output,'extraction-audit.json'),JSON.stringify({...result,chunks:undefined,shards:undefined},null,2));return result;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const [root,output,...ids]=process.argv.slice(2);if(!root||!output)throw Error('Usage: node build-content-index.mjs DATASET OUTPUT [file IDs]');
 const result=await build(root,output,{ids,onProgress:p=>{if(p.completedHashGroups%100===0)console.error(JSON.stringify({completed:p.completedHashGroups,total:p.totalHashGroups,chunks:p.chunks}));}});
 console.log(JSON.stringify({files:result.selectedFiles,chunks:result.chunks.length,auditCounts:result.audit.reduce((o,x)=>(o[x.status]=(o[x.status]||0)+1,o),{})}));
}
