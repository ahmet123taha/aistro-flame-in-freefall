import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm,realpath,symlink,rename} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {loadPreparedGraphs} from '../lib/prepared-graphs.mjs';
import {confinedPath} from '../lib/dataset.mjs';
import {libraryList} from '../lib/file-library.mjs';
import {BASS_FIGURE_SHA} from '../public/figure-models.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
async function fixture(t){
 const parent=await realpath(os.tmpdir()),base=await mkdtemp(path.join(parent,'flame-prepared-test-')),root=path.join(base,'dataset');
 await mkdir(path.join(root,'Prepared_Graphs/v1/data'),{recursive:true});
 t.after(async()=>{const target=await realpath(base),relative=path.relative(parent,target);assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));await rm(target,{recursive:true,force:true});});
 const files=[{id:'f-table',name:'original.csv',sha256:sha('original source bytes'),accessions:['PSI-25'],path:'private/original.csv',category:'Tables'},{id:'f-image',name:'documented.jpg',sha256:sha('original image bytes'),accessions:['PSI-25'],path:'private/documented.jpg',category:'Images'}];
 const graph={id:'g-table',title:'Exact synthetic table points',kind:'generated',origin:'source_table',caption:'Offline loader fixture.',limitations:['Not a scientific result.'],source:{fileId:files[0].id,name:files[0].name,sha256:files[0].sha256,sheet:'CSV'},x:{label:'Time',unit:'s'},y:{label:'Value',unit:''},series:[{id:'one',label:'One',points:[{x:1,y:2,row:2,xCell:'A2',yCell:'B2',xRaw:'1.000',yRaw:'2.000'}]}]};
 const compressed=gzipSync(JSON.stringify(graph));
 const generated={id:graph.id,kind:'generated',title:graph.title,sourceId:files[0].id,sourceSha256:files[0].sha256,dataPath:'data/g-table.json.gz',dataSha256:sha(compressed),bytes:compressed.length};
 const documented={id:'g-image',kind:'documented',title:'Original documented image',sourceId:files[1].id,sourceSha256:files[1].sha256};
 const manifest={schema:1,version:'test-v1',graphs:[generated,documented]},baseline={path:'Prepared_Graphs/v1/manifest.json',sha256:''};
 let verified=0,closed=0,currentSourceHash=files[0].sha256;
 const options={baseline,resolve:confinedPath,verifyFile:async id=>{assert.equal(id,files[0].id);verified++;return {row:{sha256:currentSourceHash},handle:{async close(){closed++;}}};}};
 async function saveManifest(){const bytes=Buffer.from(JSON.stringify(manifest));baseline.sha256=sha(bytes);await writeFile(path.join(root,baseline.path),bytes);}
 async function savePayload(value){const bytes=Buffer.isBuffer(value)?value:gzipSync(JSON.stringify(value));generated.bytes=bytes.length;generated.dataSha256=sha(bytes);await writeFile(path.join(root,'Prepared_Graphs/v1/data/g-table.json.gz'),bytes);await saveManifest();}
 await savePayload(compressed);
 return {base,root,files,graph,manifest,generated,documented,baseline,options,saveManifest,savePayload,counters:()=>({verified,closed}),changeSource:hash=>{currentSourceHash=hash;}};
}

test('missing optional add-on returns a missing state without opening source files',async t=>{
 const f=await fixture(t);const store=await loadPreparedGraphs(f.root,f.files,{...f.options,baseline:{path:'Absent/manifest.json',sha256:sha('absent')}});
 assert.equal(store.status.state,'missing');assert.deepEqual(store.entries,[]);await assert.rejects(store.get('g-table'),e=>e.status===404);assert.deepEqual(f.counters(),{verified:0,closed:0});
});

test('trusted manifest and exact payload authenticate generated data and close each verified source handle',async t=>{
 const f=await fixture(t),store=await loadPreparedGraphs(f.root,f.files,f.options);
 assert.deepEqual(store.status,{state:'ready',generated:1,documented:1,version:'test-v1'});assert.deepEqual(await store.get(f.graph.id),f.graph);
 assert.deepEqual(f.counters(),{verified:1,closed:1});assert.deepEqual(await store.get(f.graph.id),f.graph);assert.deepEqual(f.counters(),{verified:2,closed:2});
 await assert.rejects(store.get('g-image'),e=>e.status===404);await assert.rejects(store.get('g-unknown'),e=>e.status===404);assert.deepEqual(f.counters(),{verified:2,closed:2});
});

test('manifest tampering, unsupported schema, duplicate IDs and stale source SHA fail closed',async t=>{
 const f=await fixture(t);let store=await loadPreparedGraphs(f.root,f.files,{...f.options,baseline:{...f.baseline,sha256:sha('wrong')}});assert.equal(store.status.state,'invalid');assert.deepEqual(store.entries,[]);
 for(const mutate of [()=>{f.manifest.schema=2;},()=>{f.manifest.graphs.push({...f.generated});},()=>{f.generated.sourceSha256=sha('stale');},()=>{f.generated.kind='original';}]){
  const original=structuredClone(f.manifest);mutate();await f.saveManifest();store=await loadPreparedGraphs(f.root,f.files,f.options);assert.equal(store.status.state,'invalid');assert.deepEqual(store.entries,[]);Object.assign(f.manifest,original);
  // Preserve fixture references after restoring nested objects.
  f.manifest.graphs=[f.generated,f.documented];f.generated.sourceSha256=f.files[0].sha256;f.generated.kind='generated';f.manifest.schema=1;
 }
 assert.deepEqual(f.counters(),{verified:0,closed:0});
});

test('data reference traversal and oversized declared payload are rejected before any source read',async t=>{
 const f=await fixture(t);
 for(const dataPath of ['../outside.json.gz','data/../../outside.json.gz','data\\outside.json.gz','/outside.json.gz']){f.generated.dataPath=dataPath;await f.saveManifest();const store=await loadPreparedGraphs(f.root,f.files,f.options);assert.equal(store.status.state,'invalid');}
 f.generated.dataPath='data/g-table.json.gz';f.generated.bytes=32e6+1;await f.saveManifest();assert.equal((await loadPreparedGraphs(f.root,f.files,f.options)).status.state,'invalid');assert.deepEqual(f.counters(),{verified:0,closed:0});
});

test('actual confined resolver refuses a prepared-data symlink escaping the dataset',async t=>{
 const f=await fixture(t),outside=path.join(f.base,'outside');await mkdir(outside);await writeFile(path.join(outside,'payload.json.gz'),gzipSync(JSON.stringify(f.graph)));
 await symlink(outside,path.join(f.root,'Prepared_Graphs/v1/escape'),process.platform==='win32'?'junction':'dir');
 // A baseline path traversing a symlink is resolved through the production guard.
 const escaped=await loadPreparedGraphs(f.root,f.files,{...f.options,baseline:{path:'Prepared_Graphs/v1/escape/payload.json.gz',sha256:sha('unused')}});assert.equal(escaped.status.state,'invalid');assert.deepEqual(escaped.entries,[]);assert.deepEqual(f.counters(),{verified:0,closed:0});
 await writeFile(path.join(outside,'g-table.json.gz'),gzipSync(JSON.stringify(f.graph)));
 await rename(path.join(f.root,'Prepared_Graphs/v1/data'),path.join(f.root,'Prepared_Graphs/v1/data-saved'));
 await symlink(outside,path.join(f.root,'Prepared_Graphs/v1/data'),process.platform==='win32'?'junction':'dir');
 const store=await loadPreparedGraphs(f.root,f.files,f.options);assert.equal(store.status.state,'ready');await assert.rejects(store.get(f.graph.id),/outside the dataset/);assert.deepEqual(f.counters(),{verified:1,closed:1});
});

test('fresh original-source SHA mismatch prevents data return and still closes its handle',async t=>{
 const f=await fixture(t),store=await loadPreparedGraphs(f.root,f.files,f.options);f.changeSource(sha('source changed after index load'));
 await assert.rejects(store.get(f.graph.id),/Graph source changed/);assert.deepEqual(f.counters(),{verified:1,closed:1});
});

test('compressed payload byte count/hash and malformed gzip/JSON are independently rejected',async t=>{
 const f=await fixture(t),store=await loadPreparedGraphs(f.root,f.files,f.options);
 await writeFile(path.join(f.root,'Prepared_Graphs/v1/data/g-table.json.gz'),Buffer.from('tampered'));await assert.rejects(store.get(f.graph.id),/integrity/);
 const sameLength=gzipSync(JSON.stringify(f.graph));sameLength[sameLength.length-9]^=1;await writeFile(path.join(f.root,'Prepared_Graphs/v1/data/g-table.json.gz'),sameLength);await assert.rejects(store.get(f.graph.id),/integrity/);
 await f.savePayload(Buffer.from('not a gzip stream'));let loaded=await loadPreparedGraphs(f.root,f.files,f.options);await assert.rejects(loaded.get(f.graph.id));
 await f.savePayload(gzipSync(Buffer.from('{bad json')));loaded=await loadPreparedGraphs(f.root,f.files,f.options);await assert.rejects(loaded.get(f.graph.id));assert.deepEqual(f.counters(),{verified:4,closed:4});
});

test('trusted payload bytes cannot substitute a different graph ID, source, hash or origin',async t=>{
 const f=await fixture(t);
 for(const mutate of [g=>g.id='g-other',g=>g.source.fileId='f-image',g=>g.source.sha256=sha('foreign'),g=>g.kind='documented',g=>g.origin='digitized_pixels']){
  const graph=structuredClone(f.graph);mutate(graph);await f.savePayload(graph);const store=await loadPreparedGraphs(f.root,f.files,f.options);assert.equal(store.status.state,'ready');await assert.rejects(store.get(f.graph.id),/provenance mismatch/);
 }
 assert.deepEqual(f.counters(),{verified:5,closed:5});
});

test('documented images and generated table plots stay separate and accession/hash bound in library lists',async t=>{
 const f=await fixture(t),store=await loadPreparedGraphs(f.root,f.files,f.options),generated=libraryList(f.files,{accession:'PSI-25',kind:'plotted'},store.entries),documented=libraryList(f.files,{accession:'PSI-25',kind:'documented'},store.entries);
 assert.equal(generated.total,1);assert.equal(generated.items[0].preparedGraphId,'g-table');assert.equal(generated.items[0].origin,'source_table');assert.equal(generated.items[0].id,'f-table');assert.ok(!Object.hasOwn(generated.items[0],'path'));
 assert.equal(documented.total,1);assert.equal(documented.items[0].origin,'original_source_image');assert.equal(documented.items[0].preparedGraphId,undefined);assert.equal(documented.items[0].id,'f-image');
 assert.equal(libraryList(f.files,{accession:'PSI-99',kind:'plotted'},store.entries).total,0);assert.equal(libraryList(f.files,{kind:'plotted',q:'synthetic'},store.entries).total,1);assert.equal(libraryList(f.files,{kind:'plotted',offset:50},store.entries).items.length,0);
 const changed=f.files.map(file=>({...file,sha256:sha('replaced')}));assert.equal(libraryList(changed,{kind:'plotted'},store.entries).total,0);assert.equal(libraryList(changed,{kind:'documented'},store.entries).total,0);
 assert.equal(libraryList(f.files,{kind:'figure'},store.entries).total,1);assert.equal(libraryList(f.files,{kind:'table'},store.entries).total,1);
});

test('unsupported documented-image formats are not promoted by the prepared manifest',async t=>{
 const f=await fixture(t);f.files[1].name='unknown.svg';const store=await loadPreparedGraphs(f.root,f.files,f.options);assert.equal(store.status.state,'invalid');assert.deepEqual(store.entries,[]);
});

test('existing BASS original figures retain original classification beside regenerated equation curves',()=>{
 const file={id:'bass',name:'BASS-II Summary Report.pdf',sha256:BASS_FIGURE_SHA,accessions:['PSI-25'],path:'private/bass.pdf'};
 const originals=libraryList([file],{kind:'documented'}),curves=libraryList([file],{kind:'plotted'});assert.equal(originals.total,3);assert.ok(originals.items.every(item=>item.origin==='original_source_figure'&&!item.preparedGraphId));assert.equal(curves.total,2);assert.ok(curves.items.every(item=>item.origin==='published_equation'));
 assert.ok(originals.items.some(item=>item.plot.number==='6.7'&&item.plot.model===null));assert.equal(libraryList([{...file,sha256:sha('different source')}],{kind:'documented'}).total,0);
});
