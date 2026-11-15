import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {PDF_ASSETS} from '../lib/pdf-assets.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function collectThirdPartyNotices(root){
 const sources=[{name:'Node.js runtime and bundled dependency notices',file:'docs/standards/NODE_LICENSE.txt'},
 {name:'Lucide icons / applicable Feather notices',file:'docs/standards/LUCIDE_LICENSE.txt'},
 ...PDF_ASSETS.filter(file=>/(?:^|\/)LICENSE(?:_[^/]*)?$/.test(file)).sort().map(file=>({name:'PDF.js vendored component: '+file,file:'public/'+file})),
 ...['acorn','acorn-walk','esbuild'].map(name=>({name:name+' build/source tooling (MIT)',file:'node_modules/'+name+'/'+(name==='esbuild'?'LICENSE.md':'LICENSE')}))];
 const parts=[Buffer.from('SPACEAPPS1 / AISTRO THIRD-PARTY NOTICES\n\nThese notices apply to their identified components. They do not license all application code or NASA/third-party source data under one blanket license. Exact version-specific vendored texts are retained below; font exceptions and composite component terms remain applicable.\n')];
 const records=[];
 for(const source of sources){const bytes=await readFile(path.join(root,source.file));parts.push(Buffer.from('\n\n===== '+source.name+' =====\nSource: '+source.file+'\n\n'),bytes);records.push({...source,bytes:bytes.length,sha256:sha(bytes)});}
 const bytes=Buffer.concat(parts);return {bytes,sources:records,sha256:sha(bytes)};
}
export async function writeThirdPartyNotices(root){const result=await collectThirdPartyNotices(root);await writeFile(path.join(root,'public/THIRD_PARTY_NOTICES.txt'),result.bytes);return result;}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const result=await writeThirdPartyNotices(root);console.log(JSON.stringify({sources:result.sources.length,bytes:result.bytes.length,sha256:result.sha256}));}
