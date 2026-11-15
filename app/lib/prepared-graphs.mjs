import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {PREPARED_GRAPH_BASELINE} from './prepared-graph-baseline.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const fail=(message,status=409)=>Object.assign(Error(message),{status});
// Optional additive dataset index. Original NASA files/catalog are never rewritten.
export async function loadPreparedGraphs(root,files,{resolve,verifyFile,baseline=PREPARED_GRAPH_BASELINE}={}){
 const absent={entries:[],status:{state:'missing',message:'Prepared graph add-on is not installed.'},async get(){throw fail('Graph not installed.',404);}};
 let bytes;
 try{bytes=await readFile(await resolve(root,baseline.path));}catch(e){if(e.code==='ENOENT')return absent;return {...absent,status:{state:'invalid',message:'Prepared graph index could not be read.'}};}
 try{
  if(bytes.length>8e6||sha(bytes)!==baseline.sha256)throw Error('Prepared graph manifest hash mismatch.');
  const manifest=JSON.parse(bytes),byFile=new Map(files.map(f=>[f.id,f]));
  if(manifest.schema!==1||!Array.isArray(manifest.graphs)||manifest.graphs.length>10000)throw Error('Invalid graph manifest.');
  const entries=manifest.graphs,byId=new Map();
  for(const e of entries){
   const f=byFile.get(e.sourceId);
   if(!/^g[\w-]+$/.test(e.id)||byId.has(e.id)||!f||f.sha256!==e.sourceSha256||!['generated','documented'].includes(e.kind)||typeof e.title!=='string'||e.title.length>500)throw Error('Invalid graph provenance.');
   if(e.kind==='generated'&&(!/^[a-f0-9]{64}$/.test(e.dataSha256)||!/^data\/[\w-]+\.json\.gz$/.test(e.dataPath)||!Number.isSafeInteger(e.bytes)||e.bytes<1||e.bytes>32e6))throw Error('Invalid prepared data reference.');
   if(e.kind==='documented'&&!/\.(png|jpe?g|webp)$/i.test(f.name))throw Error('Unsupported documented image.');
   byId.set(e.id,e);
  }
  return {entries,status:{state:'ready',generated:entries.filter(e=>e.kind==='generated').length,documented:entries.filter(e=>e.kind==='documented').length,version:manifest.version},async get(id){
   const e=byId.get(id);if(!e||e.kind!=='generated')throw fail('Prepared graph not found.',404);
   const source=await verifyFile(e.sourceId);try{if(source.row.sha256!==e.sourceSha256)throw fail('Graph source changed.');}finally{await source.handle.close();}
   const relative=baseline.path.slice(0,baseline.path.lastIndexOf('/')+1)+e.dataPath;
   const compressed=await readFile(await resolve(root,relative));
   if(compressed.length!==e.bytes||sha(compressed)!==e.dataSha256)throw fail('Prepared graph data integrity check failed.');
   const graph=JSON.parse(gunzipSync(compressed,{maxOutputLength:32*1024*1024}));
   if(graph.id!==e.id||graph.source?.fileId!==e.sourceId||graph.source?.sha256!==e.sourceSha256||graph.kind!=='generated'||graph.origin!=='source_table')throw fail('Prepared graph provenance mismatch.');
   return graph;
  }};
 }catch(e){return {...absent,status:{state:'invalid',message:e.message}};}
}
