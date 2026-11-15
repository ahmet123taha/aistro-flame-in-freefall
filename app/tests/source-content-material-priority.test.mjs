import test from 'node:test';
import assert from 'node:assert/strict';
import {makeChunks,retrieve,sha} from '../lib/source-content-index.mjs';
import {rankFileShards} from '../lib/source-content-candidates.mjs';
const question='might actually make the flame worse through the entrainment of oxygen';
test('a material-only mention cannot suppress a directly relevant general mechanism passage',()=>{
 const unrelated=makeChunks({id:'f1',sha256:sha('one'),name:'Material.txt',accessions:['PSI-1']},[{location:{line:1},text:'SIBAL material storage was described in this document.'}]);
 const direct=makeChunks({id:'f2',sha256:sha('two'),name:'Mechanism.txt',accessions:['REF-2']},[{location:{line:4},text:'The extinguishing stream might actually make the flame worse through the entrainment of oxygen.'}]);
 for(const material of ['sibal','pmma']){
  const result=retrieve({chunks:[...unrelated,...direct]},{ids:['PSI-1','REF-2'],question,conditions:{material}},{maxChunks:1});
  assert.equal(result.chunks[0].fileId,'f2');assert.equal(result.chunks[0].quote,direct[0].quote);
 }
});
test('bounded file planning compares question relevance before a material-only tie-break',()=>{
 const shards=[{fileId:'f1',sha256:sha('one'),sourceIds:['PSI-1'],path:'one',terms:['sibal','storage']},{fileId:'f2',sha256:sha('two'),sourceIds:['REF-2'],path:'two',terms:['extinguishing','stream','might','actually','make','flame','worse','through','entrainment','oxygen']}];
 const result=rankFileShards({shards},{ids:['PSI-1','REF-2'],question,conditions:{material:'sibal'}},1);
 assert.equal(result.plan[0].shard.fileId,'f2');
});
test('generic competing sections retain an explicit material limitation within the existing budget',()=>{
 const file={id:'f1',sha256:sha('one'),name:'Report.pdf',accessions:['PSI-1']},units=Array.from({length:20},(_,i)=>({location:{page:i+1},text:'Ignition propagation flame spread observed in this general section.'}));
 units.push({location:{page:54},text:'Nomex exhibited brief ignition, followed by extinction.'});
 const result=retrieve({chunks:makeChunks(file,units)},{ids:['PSI-1'],question:'ignition propagation',conditions:{material:'nomex'}},{maxChunks:3,perSource:3,maxChars:1000});
 assert.ok(result.chunks.some(c=>c.location.page===54));assert.equal(result.chunks.length,3);assert.ok(result.characters<=1000);assert.ok(result.chunks.every(c=>c.parameters===undefined));
});
test('file allocation reserves material context without displacing the strongest question file',()=>{
 const shards=Array.from({length:10},(_,i)=>({fileId:'f'+i,sha256:sha('file'+i),sourceIds:['PSI-1'],path:'part'+i,terms:['entrainment','oxygen']}));
 shards.push({fileId:'f99',sha256:sha('material'),sourceIds:['PSI-2'],path:'material',terms:['sibal']});
 const result=rankFileShards({shards},{ids:['PSI-1','PSI-2'],question:'entrainment oxygen',conditions:{material:'sibal'}},2);
 assert.equal(result.plan.length,2);assert.equal(result.plan[0].shard.sourceIds[0],'PSI-1');assert.equal(result.plan[1].shard.fileId,'f99');
});
