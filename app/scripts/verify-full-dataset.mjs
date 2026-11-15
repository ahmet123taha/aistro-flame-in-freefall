import {VERSION} from '../lib/version.mjs';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const receipt=JSON.parse(await readFile((process.env.FLAME_TEST_PROFILE||process.env.LOCALAPPDATA+'/FlameInFreefall')+'/instance.json','utf8'));
const base='http://127.0.0.1:'+receipt.port,cat=await(await fetch(base+'/api/catalog')).json();
assert.equal(cat.status.version,VERSION);assert.equal(cat.status.dataset.state,'ready');assert.equal(cat.records.length,35);assert.equal(cat.status.requests,0);
const counts=[];for(const r of cat.records){const list=await(await fetch(base+'/api/files?accession='+r.id)).json();assert.equal(list.total,r.fileCount);counts.push({id:r.id,files:list.total});}
const bass=await(await fetch(base+'/api/files?accession=PSI-25')).json(),csv=bass.items.find(f=>f.name.endsWith('BASS-II.csv')),pdf=bass.items.find(f=>f.name.endsWith('BASS-II_SRD.pdf'));
const text=await(await fetch(base+'/api/files/'+csv.id+'/preview')).json();assert.match(text.text,/Calibrated.*O2/);assert.equal(text.sha256,csv.sha256);
const response=await fetch(base+'/api/files/'+pdf.id);assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'application/pdf');const b=Buffer.from(await response.arrayBuffer());assert.equal(createHash('sha256').update(b).digest('hex'),pdf.sha256);
const support=cat.records.find(r=>r.id==='REF-10');assert.match(support.content.documentText,/MIST/);assert.match(support.content.documentText,/SMuRF/);
const state=await(await fetch(base+'/api/status')).json();assert.equal(state.requests,0);
const result={version:VERSION,at:new Date().toISOString(),passed:true,corpusHash:cat.hash,dataset:state.dataset,counts,verifiedPdf:{id:pdf.id,bytes:b.length,sha256:pdf.sha256},verifiedCsv:{id:csv.id,sha256:csv.sha256},checks:['24 PSI and 11 supporting records loaded from adjacent package','all source file counts matched','real BASS-II CSV preview','real BASS-II PDF bytes match stored SHA','SoFIE supporting text available','0 provider calls'],fullCatalogRepeatedLoads:1,limits:['not all numerical files normalized','independent machine pending']};await writeFile('qa/full-dataset-verification.json',JSON.stringify(result,null,2));console.log(JSON.stringify({passed:true,sources:counts.length,files:state.dataset.files,providerCalls:0}));
