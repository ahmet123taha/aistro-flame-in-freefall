import {readFile,writeFile,rename} from 'node:fs/promises';
import {gunzip,gzipSync} from 'node:zlib';
import {promisify} from 'node:util';
import path from 'node:path';
import {sha,lexicalTerms} from '../lib/source-content-index.mjs';
const [directory,reuseFile]=process.argv.slice(2),unzip=promisify(gunzip);
if(!directory)throw Error('Usage: finalize-manifest.mjs OUTPUT');
const file=path.join(directory,'content-manifest.json.gz'),manifest=JSON.parse((await unzip(await readFile(file))).toString('utf8'));
const reuseBytes=reuseFile?await readFile(reuseFile):null,reuse=reuseBytes?JSON.parse((await unzip(reuseBytes)).toString('utf8')):null;
if(reuse&&reuse.catalogSha256!==manifest.catalogSha256)throw Error('Reusable manifest belongs to a different catalog');
const oldShards=new Map((reuse?.shards||[]).map(s=>[s.sha256,s])),oldAudits=new Map((reuse?.audit||[]).map(a=>[a.sha256,a]));
for(const shard of manifest.shards){const bytes=await readFile(path.join(directory,shard.path));shard.shardSha256=sha(bytes);shard.shardBytes=bytes.length;
 const audit=manifest.audit.find(x=>x.sha256===shard.sha256),previous=oldShards.get(shard.sha256);
 let cached;
 if(previous?.shardSha256===shard.shardSha256){shard.terms=previous.terms;const old=oldAudits.get(shard.sha256);if(audit&&old){audit.emptyPageNumbers=old.emptyPageNumbers;audit.unitKind=old.unitKind;}}
 else if(reuse&&audit?.extension!=='.xlsx')shard.terms=shard.terms.filter(t=>/\p{L}/u.test(t)&&!/^\d+(?:e\d*)?$/i.test(t));
 else{cached=JSON.parse((await unzip(bytes)).toString('utf8'));shard.terms=[...new Set(cached.chunks.flatMap(c=>lexicalTerms(c.quote,audit?.extension==='.xlsx')))];}
 if(audit?.extension==='.pdf'&&!audit.emptyPageNumbers){cached??=JSON.parse((await unzip(bytes)).toString('utf8'));const readable=new Set(cached.chunks.map(c=>c.location.page));audit.emptyPageNumbers=Array.from({length:audit.units},(_,i)=>i+1).filter(p=>!readable.has(p));audit.unitKind='PDF_page';}
 else if(audit)audit.unitKind=audit.extension==='.xlsx'?'nonempty_sheet_row':['.csv','.tsv'].includes(audit.extension)?'CSV_record':'nonempty_text_line';
}
manifest.coverageSummary={fileStatuses:manifest.audit.reduce((o,a)=>(o[a.status]=(o[a.status]||0)+1,o),{}),rawTextChunks:manifest.chunkCount,pdfPages:manifest.audit.filter(a=>a.extension==='.pdf'&&a.units).reduce((n,a)=>n+a.units,0),pdfPagesWithNoExtractableText:manifest.audit.filter(a=>a.extension==='.pdf').reduce((n,a)=>n+(a.emptyPages||0),0),nonemptySheetRows:manifest.audit.filter(a=>a.extension==='.xlsx').reduce((n,a)=>n+(a.units||0),0),textLines:manifest.audit.filter(a=>['.txt','.log','.md'].includes(a.extension)).reduce((n,a)=>n+(a.units||0),0)};
const bytes=gzipSync(JSON.stringify(manifest),{mtime:0});await writeFile(file+'.tmp',bytes);await rename(file+'.tmp',file);
const receipt={manifestSha256:sha(bytes),manifestBytes:bytes.length,shards:manifest.shards.length,shardBytes:manifest.shards.reduce((n,s)=>n+s.shardBytes,0),coverageComplete:manifest.coverageComplete,coverageSummary:manifest.coverageSummary,...(reuseBytes?{reusedVerifiedManifestSha256:sha(reuseBytes)}:{})};await writeFile(path.join(directory,'manifest-receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
