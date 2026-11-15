import {readFile,realpath,stat} from 'node:fs/promises';
import path from 'node:path';
import {gunzip} from 'node:zlib';
import {promisify} from 'node:util';
const unzip=promisify(gunzip);
import {createHash} from 'node:crypto';
import {canonicalMaterial} from './material-identity.mjs';
import {phraseFeatures} from './source-content-ranking.mjs';
import {rankFileShards} from './source-content-candidates.mjs';

export const sha=value=>createHash('sha256').update(value).digest('hex');
import {tokens,lexicalTerms,queryTokens,questionTokens,literalMaterialMention} from './source-content-terms.mjs';
export {tokens,lexicalTerms,queryTokens};

// Offsets refer to this exact extracted unit (page/row/line), not PDF byte positions.
export function makeChunks(file,units,{maxChars=1400,overlap=180}={}){
 if(!Number.isSafeInteger(maxChars)||maxChars<200||overlap<0||overlap>=maxChars)throw Error('Invalid chunk limits');
 return units.flatMap(unit=>{
  const text=String(unit.text||''),chunks=[];
  for(let start=0;start<text.length;start+=maxChars-overlap){
   const quote=text.slice(start,start+maxChars);if(!quote.trim())continue;
   const location={...unit.location,start,end:start+quote.length};
   const id='C-'+sha(JSON.stringify([file.sha256,location,quote])).slice(0,24);
   chunks.push({id,fileId:file.id,sourceIds:file.accessions.filter(x=>/^(PSI|REF)-\d+$/.test(x)),name:file.name,sha256:file.sha256,location,quote,scope:'literal_extracted_text_not_reviewed_numerical_evidence'});
   if(start+maxChars>=text.length)break;
  }
  return chunks;
 });
}

export function retrieve(index,request,{maxChars=10000,maxChunks=10,perSource=3,sourceDiversity=true}={}){
 const q=queryTokens(request),question=questionTokens(request),allowed=new Set(request.ids||[]),frequency=new Map(),materialWords=tokens(canonicalMaterial(request.conditions?.material)),wanted=new Set([...q,...materialWords]),candidates=[];let eligibleCount=0;
 for(const chunk of index.chunks){
  if(!chunk.sourceIds.some(id=>allowed.has(id)))continue;eligibleCount++;
  const words=new Set(tokens(chunk.quote).filter(t=>wanted.has(t)));
  for(const word of words)if(q.has(word))frequency.set(word,(frequency.get(word)||0)+1);
  if([...words].some(t=>q.has(t)))candidates.push({chunk,words});
 }
 const ranked=candidates.map(({chunk,words})=>{const phrase=phraseFeatures(chunk.quote,request);return {chunk,phrase,questionMention:[...question].some(t=>words.has(t)),materialMention:literalMaterialMention(request.conditions?.material,chunk.quote,words),score:[...q].reduce((n,t)=>n+(words.has(t)?Math.log(1+eligibleCount/(frequency.get(t)||1)):0),0)+phrase.bonus};});
 const selected=[],counts=new Map(),fileCounts=new Map(),seen=new Set();let chars=0,materialSelected=false;
 while(ranked.length){
  const adjusted=item=>item.score/(sourceDiversity?1+.45*(fileCounts.get(item.chunk.sha256)||0)+.25*Math.min(...item.chunk.sourceIds.map(id=>counts.get(id)||0)):1);
  let kept=0;for(const item of ranked){const c=item.chunk,key=c.sha256+':'+JSON.stringify(c.location);if(!seen.has(key)&&chars+c.quote.length<=maxChars&&c.sourceIds.some(id=>allowed.has(id)&&((counts.get(id)||0)<perSource)))ranked[kept++]=item;}ranked.length=kept;if(!kept)break;
  // Keep the strongest question passage first, then reserve one explicit
  // material passage when the existing source/character budgets permit it.
  const reserveMaterial=selected.length===1&&!materialSelected&&ranked.some(item=>item.materialMention);
  let best=reserveMaterial?ranked.findIndex(item=>item.materialMention):0;for(let i=0;i<ranked.length;i++){if(i===best||reserveMaterial&&!ranked[i].materialMention)continue;const a=ranked[i],b=ranked[best],comparison=Number(b.questionMention)-Number(a.questionMention)||adjusted(b)-adjusted(a)||Number(b.materialMention)-Number(a.materialMention)||a.chunk.id.localeCompare(b.chunk.id);if(comparison<0)best=i;}
  const {chunk,score,phrase,materialMention}=ranked.splice(best,1)[0];
  // Reused file bytes across records do not become independent replications.
  const duplicate=chunk.sha256+':'+JSON.stringify(chunk.location);if(seen.has(duplicate))continue;
  const sources=chunk.sourceIds.filter(id=>allowed.has(id)&&((counts.get(id)||0)<perSource));if(!sources.length)continue;
  if(chars+chunk.quote.length>maxChars)continue;
  selected.push({...chunk,sourceIds:sources,retrievalScore:score,phraseFeatures:phrase});materialSelected||=materialMention;seen.add(duplicate);chars+=chunk.quote.length;fileCounts.set(chunk.sha256,(fileCounts.get(chunk.sha256)||0)+1);
  for(const id of sources)counts.set(id,(counts.get(id)||0)+1);
  if(selected.length>=maxChunks)break;
 }
 return {chunks:selected,characters:chars,matchedChunks:candidates.length,queryTerms:[...q],limitations:['Text retrieval relevance is not scientific validity, numerical support, safety or a fire-risk score.','PDF text extraction does not read graph coordinates, images, handwriting or scanned pages.','Formula cells preserve source formula/cache and are not recalculated.','Raw tabular rows preserve literal cells; headers/units require review before scientific interpretation.']};
}

// Integration must supply dataset.file as verifyFile. Its full hash check is the
// trust boundary; an index stamp alone never proves current bytes are unchanged.
export async function retrieveVerified(index,request,verifyFile,options={}){
 if(typeof verifyFile!=='function')throw Error('Current source integrity verifier required');
 const initial=retrieve(index,request,options),verified=new Map(),excluded=[],chunks=[];
 for(const chunk of initial.chunks){
  const aliases=(chunk.fileAliases?.length?chunk.fileAliases:[{fileId:chunk.fileId,name:chunk.name,accessions:chunk.sourceIds}]).map(a=>({...a,accessions:Array.isArray(a.accessions)?a.accessions:a.fileId===chunk.fileId?chunk.sourceIds:[]})),validSources=new Set();let selectedAlias=null;
  for(const alias of aliases){if(!alias.accessions?.some(id=>chunk.sourceIds.includes(id)&&!validSources.has(id)))continue;
   const key=alias.fileId+':'+chunk.sha256;if(!verified.has(key)){let source;try{source=await verifyFile(alias.fileId);if(source.row.sha256!==chunk.sha256)throw Error('Index/source hash mismatch');verified.set(key,true);}catch{verified.set(key,false);excluded.push({fileId:alias.fileId,reason:'source_integrity_failed'});}finally{if(source?.handle)await source.handle.close();}}
   if(verified.get(key)){selectedAlias??=alias;for(const id of alias.accessions)if(chunk.sourceIds.includes(id))validSources.add(id);}if(validSources.size===chunk.sourceIds.length)break;
  }
  if(selectedAlias&&validSources.size)chunks.push({...chunk,fileId:selectedAlias.fileId,name:selectedAlias.name||chunk.name,sourceIds:chunk.sourceIds.filter(id=>validSources.has(id))});
 }
 return {...initial,chunks,characters:chunks.reduce((n,c)=>n+c.quote.length,0),excluded};
}


// Pure Node runtime: no PDF parser, Python process or model call. The caller
// authenticates the manifest hash, confines shard reads, and verifies raw sources.
export async function retrieveManifest(manifest,request,loadShard,{maxShardFiles=48,maxShardBytes=32*1024*1024,...options}={}){
 const allowed=new Set(request.ids||[]),q=queryTokens(request),material=tokens(canonicalMaterial(request.conditions?.material));
 const candidatePlan=rankFileShards(manifest,request,maxShardFiles),candidates=candidatePlan.plan;
 const chunks=[],excluded=[],loaded=[];
 for(const {shard} of candidates){
  try{
   if(!/^[a-f0-9]{64}$/.test(shard.sha256)||!validShardPath(shard)||!/^[a-f0-9]{64}$/.test(shard.shardSha256))throw Error('Invalid shard identity');
   if(shard.shardBytes>maxShardBytes)throw Error('Shard exceeds runtime read limit');
   const bytes=await loadShard(shard);if(bytes.length!==shard.shardBytes||sha(bytes)!==shard.shardSha256)throw Error('Shard integrity failed');
   const part=shard.path.startsWith('parts/'),decodedLimit=part?512*1024:128*1024*1024;
   if(part&&shard.decodedBytes!==undefined&&shard.decodedBytes>decodedLimit)throw Error('Stream part decoded size exceeds 512 KiB');
   const decoded=await unzip(bytes,{maxOutputLength:decodedLimit});if(shard.decodedBytes!==undefined&&decoded.length!==shard.decodedBytes)throw Error('Decoded size does not match pinned descriptor');const parsed=JSON.parse(decoded.toString('utf8'));
   if(parsed.sha256!==shard.sha256||parsed.extractorVersion!==(shard.extractorVersion||manifest.extractorVersion))throw Error('Shard source/version mismatch');
   for(const chunk of parsed.chunks){
    if(chunk.sha256!==shard.sha256||chunk.quote.length>1400||chunk.scope!=='literal_extracted_text_not_reviewed_numerical_evidence')throw Error('Invalid raw chunk');
   }
   for(const chunk of parsed.chunks){chunk.fileId=shard.fileId;chunk.fileAliases=shard.fileAliases;chunk.sourceIds=shard.sourceIds;}
   const scoped=parsed.chunks;
   const local=retrieve({chunks:scoped},request,{...options,maxChunks:Math.max(12,options.maxChunks||10),maxChars:Math.max(20000,options.maxChars||10000),perSource:Math.max(6,options.perSource||3)});
   const explicit=(parsed.headerContext||[]).flatMap(unit=>makeChunks({id:shard.fileId,name:shard.fileAliases?.[0]?.name||'',sha256:shard.sha256,accessions:shard.sourceIds},[unit]));
   for(const chunk of local.chunks){
    if(Number.isSafeInteger(chunk.location.row)){
     const sameSheet=scoped.filter(c=>Number.isSafeInteger(c.location.row)&&c.location.sheet===chunk.location.sheet);
     const first=sameSheet.slice(0,5),previous=sameSheet.filter(c=>c.location.row<chunk.location.row).slice(-2);
     chunk.supportingContext=[...new Map([...first,...previous].filter(c=>c.id!==chunk.id).map(c=>[c.id,c])).values()].slice(0,7);
    }
    if(explicit.length)chunk.supportingContext=explicit.slice(0,7);
    chunks.push(chunk);
   }loaded.push(shard.fileId);
  }catch(error){excluded.push({fileId:shard.fileId,reason:String(error.message).slice(0,120)});}
 }
 const result=retrieve({chunks},request,options),contextChunks=[],seen=new Set(result.chunks.map(c=>c.id));let characters=result.characters;
 for(const hit of result.chunks)for(const context of hit.supportingContext||[]){if(seen.has(context.id)||characters+context.quote.length>(options.maxChars||10000)||contextChunks.length>=6)continue;seen.add(context.id);characters+=context.quote.length;contextChunks.push({...context,retrievalRole:'first_or_preceding_raw_row_not_inferred_column_header',contextFor:hit.id});}
 const cleanChunks=result.chunks.map(({supportingContext,...chunk})=>chunk);
 return {...result,chunks:cleanChunks,contextChunks,characters,queryStatus:!q.size?'no_search_terms':[...q].some(t=>/\p{L}/u.test(t))?'lexical_search':'numeric_only_query_not_indexed',numericTokensIgnored:[...q].some(t=>! /\p{L}/u.test(t)),tableContextWarnings:cleanChunks.some(c=>Number.isSafeInteger(c.location.row)||Number.isSafeInteger(c.location.rowStart))?['Additional literal first/preceding rows may contain labels or units; their role is not inferred. Header completeness is unverified; no values are forward-filled or normalized.']:[],loadedShardFiles:loaded,candidateShardFiles:candidatePlan.matchingParts,candidateFiles:candidatePlan.files.length,omittedCandidateShardFiles:Math.max(0,candidatePlan.matchingParts-candidates.length),excluded,coverage:{selectedFiles:manifest.selectedFiles,totalCatalogFiles:manifest.totalCatalogFiles,coverageComplete:manifest.coverageComplete,...manifest.coverageSummary},sourceCandidateIds:[...new Set(result.chunks.flatMap(c=>c.sourceIds))],candidateSourceIds:candidatePlan.candidateSourceIds};
}

export async function retrieveVerifiedManifest(manifest,request,loadShard,verifyFile,options={}){
 const indexed=await retrieveManifest(manifest,request,loadShard,options),current=await retrieveVerified({chunks:indexed.chunks},request,verifyFile,options);
 const bySha=new Map();for(const chunk of current.chunks){const item=bySha.get(chunk.sha256)||{fileId:chunk.fileId,name:chunk.name,sources:new Set()};for(const id of chunk.sourceIds)item.sources.add(id);bySha.set(chunk.sha256,item);}
 const contextChunks=indexed.contextChunks.flatMap(c=>{const valid=bySha.get(c.sha256),sources=c.sourceIds.filter(id=>valid?.sources.has(id));return sources.length?[{...c,fileId:valid.fileId,name:valid.name||c.name,sourceIds:sources}]:[];});
 return {...indexed,...current,contextChunks,characters:current.characters+contextChunks.reduce((n,c)=>n+c.quote.length,0),excluded:[...indexed.excluded,...current.excluded],sourceCandidateIds:[...new Set(current.chunks.flatMap(c=>c.sourceIds))]};
}

const HASH=/^[a-f0-9]{64}$/;
export function isConfined(base,target,paths=path){const relative=paths.relative(base,target);return !relative.startsWith('..')&&!paths.isAbsolute(relative);}
function validShardPath(shard){return shard.path==='checkpoints/'+shard.sha256+'.json.gz'||new RegExp('^parts/'+shard.sha256+'/part-\\d{5}\\.json\\.gz$').test(shard.path);}
const EMPTY={chunks:[],sourceCandidateIds:[],candidateSourceIds:[],characters:0,excluded:[],loadedShardFiles:[]};
export async function loadSourceContent(datasetRoot,{expectedManifestSha256,expectedCatalogSha256,verifyFile,indexRelativePath='Research_Content'}={}){
 const unavailable=(state,reason)=>({available:false,hash:null,status:{state,reason},async retrieve(){return {...EMPTY,indexUnavailable:true,status:{state,reason}};}});
 if(!HASH.test(expectedManifestSha256||'')||!HASH.test(expectedCatalogSha256||''))return unavailable('invalid','trusted_index_or_catalog_hash_missing');
 if(typeof verifyFile!=='function')return unavailable('invalid','current_source_integrity_verifier_missing');
 if(typeof indexRelativePath!=='string'||indexRelativePath.includes('\\')||indexRelativePath.includes(':')||path.posix.isAbsolute(indexRelativePath)||indexRelativePath.split('/').some(x=>!x||x==='.'||x==='..'))return unavailable('invalid','invalid_index_path');
 try{
  const dataset=await realpath(datasetRoot),directory=await realpath(path.join(dataset,...indexRelativePath.split('/'))),relative=path.relative(dataset,directory);
  if(!isConfined(dataset,directory))return unavailable('invalid','index_outside_dataset');
  const manifestFile=await realpath(path.join(directory,'content-manifest.json.gz'));
  if(!isConfined(directory,manifestFile))return unavailable('invalid','manifest_outside_index');
  if((await stat(manifestFile)).size>32*1024*1024)return unavailable('invalid','manifest_size_limit');
  const bytes=await readFile(manifestFile),hash=sha(bytes);
  if(hash!==expectedManifestSha256)return unavailable('invalid','manifest_integrity_failed');
  const manifest=JSON.parse((await unzip(bytes,{maxOutputLength:128*1024*1024})).toString('utf8'));
  if(![1,2].includes(manifest.schema)||manifest.catalogSha256!==expectedCatalogSha256||!Array.isArray(manifest.shards)||typeof manifest.extractorVersion!=='string')return unavailable('invalid','manifest_schema_or_catalog_mismatch');
  if(manifest.lexicon&&(!Array.isArray(manifest.lexicon)||manifest.lexicon.length>1000000||manifest.lexicon.some(t=>typeof t!=='string'||t.length>128)))return unavailable('invalid','invalid_lexicon');
  if(manifest.shards.some(s=>!HASH.test(s.sha256)||!HASH.test(s.shardSha256)||!validShardPath(s)||!Number.isSafeInteger(s.shardBytes)||s.shardBytes<0||!Array.isArray(s.terms)||s.terms.some(t=>typeof t!=='string'&&!(Number.isSafeInteger(t)&&t>=0&&t<(manifest.lexicon?.length||0)))||!Array.isArray(s.sourceIds)||s.sourceIds.some(id=>! /^(PSI|REF)-\d+$/.test(id))||(s.fileAliases||[]).length>64||(s.fileAliases||[]).some(a=>! /^f\d+$/.test(a.fileId)||(!Array.isArray(a.accessions)&&!(manifest.schema===1&&a.fileId===s.fileId&&a.accessions===undefined))||(a.accessions||[]).some(id=>typeof id!=='string')||/material[_ -]?sensitivity|third[_ -]?party/i.test(a.path||''))))return unavailable('invalid','invalid_source_shard_descriptor');
  const status={state:'ready',selectedFiles:manifest.selectedFiles,totalCatalogFiles:manifest.totalCatalogFiles,coverageComplete:manifest.coverageComplete,shards:manifest.shards.length,rawTextChunks:manifest.chunkCount,coverage:manifest.coverageSummary||{},catalogAssociationOnly:true,lexicalPolicy:'Unicode words and chemical/run alphanumerics; pure numbers and synthetic spreadsheet addresses are not lexical lookup terms. Literal rows remain unchanged.'};
  const loadShard=async shard=>{
   if(shard.shardBytes>32*1024*1024)throw Error('Shard exceeds runtime read limit');
   const file=await realpath(path.join(directory,...shard.path.split('/'))),rel=path.relative(directory,file);
   if(!isConfined(directory,file))throw Error('Shard outside index');
   if((await stat(file)).size!==shard.shardBytes)throw Error('Shard size changed');
   return readFile(file);
  };
  return {available:true,hash,status,async retrieve(request,options={}){
   const clamp=(value,min,max,fallback)=>Number.isSafeInteger(value)?Math.min(max,Math.max(min,value)):fallback;
   const limits={maxChars:clamp(options.maxChars,500,20000,10000),maxChunks:clamp(options.maxChunks,1,20,10),perSource:clamp(options.perSource,1,5,3),maxShardFiles:clamp(options.maxShardFiles,1,48,48),maxShardBytes:32*1024*1024,sourceDiversity:options.sourceDiversity!==false};
   const result=await retrieveVerifiedManifest(manifest,request,loadShard,verifyFile,limits);
   return {...result,indexHash:hash,limits,catalogAssociationOnly:true};
  }};
 }catch(error){return unavailable(error.code==='ENOENT'?'missing':'invalid',error.code==='ENOENT'?'content_index_missing':'content_index_unreadable');}
}
