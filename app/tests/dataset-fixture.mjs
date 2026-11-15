import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
const hash=b=>createHash('sha256').update(b).digest('hex');
export async function fixture(base){
 const root=path.join(base,'Veri_Seti');await mkdir(path.join(root,'_app','metadata'),{recursive:true});await mkdir(path.join(root,'PSI','PSI-25'),{recursive:true});
 const payload=Buffer.from('oxygen,pressure\n21,101.3\n');await writeFile(path.join(root,'PSI/PSI-25/table.csv'),payload);
 const meta=Buffer.from(JSON.stringify({accession:'PSI-25',title:'Fixture BASS-II',objective:'A traceable research objective for an isolated fixture.',approach:'A traceable description of experimental conditions.'}));await writeFile(path.join(root,'_app/metadata/PSI-25_investigation_metadata.json'),meta);
 const support=Buffer.from(JSON.stringify([{id:'REF-01',title:'Fixture support',name:'Fixture support',content:{documentText:'A support document excerpt with exact evidence for verification.'},aliases:['support'],publications:[],tableReferences:[]}]));await writeFile(path.join(root,'_app/support-records.json'),support);
 const files=gzipSync(Buffer.from(JSON.stringify([{id:'f0',name:'table.csv',path:'PSI/PSI-25/table.csv',bytes:payload.length,sha256:hash(payload),accessions:['PSI-25'],category:'Data',quality:'fixture'}])));await writeFile(path.join(root,'_app/files.json.gz'),files);
 const manifest={schema:1,version:'2026.11.14-v1',investigations:['PSI-25'],metadataHashes:{'PSI-25_investigation_metadata.json':hash(meta)},supportHash:hash(support),filesHash:hash(files),fileCount:1,payloadBytes:payload.length,knownMissing:0,reviewNeeded:0};await writeFile(path.join(root,'DATASET.json'),JSON.stringify(manifest));return {root,manifest,payload};
}
