import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fixture } from './dataset-fixture.mjs';
import { loadDataset, confinedPath } from '../lib/dataset.mjs';
import { createApp } from '../server.mjs';
import { createAnalyzer } from '../lib/gemini.mjs';
import { validateRequest, validateAnalysis } from '../lib/corpus.mjs';

test('Adjacent portable dataset loads PSI and supporting sources, never a hardcoded Desktop path',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-dataset-'));try{
  assert.equal((await loadDataset(dir)).status.state,'missing');await fixture(dir);const d=await loadDataset(dir);
  assert.equal(d.status.state,'ready');assert.deepEqual(d.corpus.records.map(r=>r.id),['PSI-25','REF-01']);assert.equal(d.list({accession:'PSI-25',q:'table'}).total,1);assert.equal(d.list({offset:900}).items.length,0);
  const request=validateRequest({ids:['REF-01'],question:'Explain the supporting evidence.',conditions:{gravity:'other'}},d.corpus.records.map(r=>r.id));
  const analysis={summary:'A cited support finding.',items:[{kind:'finding',text:'Support text.',sourceId:'REF-01',field:'documentText',quote:d.corpus.records[1].content.documentText,evidenceType:'reported',limitation:'Fixture only.'}],unknowns:['No observations.'],nextStep:'Read full report.'};assert.deepEqual(validateAnalysis(analysis,d.corpus,request),{...analysis,recommendationsReviewed:false});
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('Dataset rejects changed indexes, incompatible versions and changed payload bytes',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-dataset-'));try{
  const {root,manifest}=await fixture(dir);const d=await loadDataset(dir);const file=await d.file('f0');await file.handle.close();
  const p=path.join(root,'PSI/PSI-25/table.csv');const b=await readFile(p);b[0]=88;await writeFile(p,b);await assert.rejects(()=>d.file('f0'),/hash/);
  await writeFile(path.join(root,'_app/support-records.json'),'[]');await assert.rejects(()=>loadDataset(dir),/integrity/);
  await writeFile(path.join(root,'DATASET.json'),JSON.stringify({...manifest,version:'future'}));await assert.rejects(()=>loadDataset(dir),/Incompatible/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('File access rejects traversal and junction escape; HTTP serves only indexed verified data',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'flame-dataset-'));let app;try{
  const {root,payload}=await fixture(dir);await writeFile(path.join(dir,'private.txt'),'not public');
  for(const bad of ['../private.txt','C:/private.txt','PSI\\file','PSI/../private.txt','/private.txt'])await assert.rejects(()=>confinedPath(root,bad));
  await symlink(dir,path.join(root,'escape'),'junction');await assert.rejects(()=>confinedPath(root,'escape/private.txt'),/outside/);
  const d=await loadDataset(dir),analyzer=createAnalyzer({corpus:d.corpus});app=createApp({corpus:d.corpus,analyzer,dataset:d});await new Promise(r=>app.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.address().port;
  assert.equal((await fetch(base+'/api/files/f999')).status,404);assert.equal((await fetch(base+'/private.txt')).status,404);
  const preview=await(await fetch(base+'/api/files/f0/preview')).json();assert.equal(preview.text,payload.toString());assert.equal(Buffer.from(await(await fetch(base+'/api/files/f0')).arrayBuffer()).equals(payload),true);
  assert.equal(analyzer.status().requests,0);
 }finally{if(app)await new Promise(r=>app.close(r));await rm(dir,{recursive:true,force:true});}
});
