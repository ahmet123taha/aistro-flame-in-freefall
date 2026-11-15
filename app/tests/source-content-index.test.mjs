import test from 'node:test';
import assert from 'node:assert/strict';
import {makeChunks,retrieve,retrieveVerified,sha,lexicalTerms} from '../lib/source-content-index.mjs';
import {coreSource} from '../scripts/build-source-content-index.mjs';

const file={id:'f12',sha256:sha('canonical bytes'),name:'Research.pdf',accessions:['PSI-25','REFERANSLAR']};
test('finding after objective/front matter is retrieved with exact page+hash, not title',()=>{
 const units=[{location:{page:1},text:'Objective: investigate broad combustion behavior.'},{location:{page:59},text:'Observed smoke agglomeration changed optical detector response. This finding is not in the paper title.'}];
 const index={chunks:makeChunks(file,units)},answer=retrieve(index,{ids:['PSI-25'],question:'duman detector response'});
 assert.equal(answer.chunks[0].location.page,59);assert.equal(answer.chunks[0].sha256,file.sha256);assert.equal(answer.chunks[0].quote,units[1].text);
 assert.deepEqual(answer.chunks[0].sourceIds,['PSI-25']);
});
test('multi-source selection never reattributes a different study and excludes third-party profile',()=>{
 const index={chunks:[...makeChunks(file,[{location:{page:1},text:'Cotton smoke detection observed.'}]),...makeChunks({...file,id:'f13',sha256:sha('other'),accessions:['PSI-26']},[{location:{page:1},text:'Cotton smoke observed in another study.'}]),...makeChunks({...file,id:'profile',accessions:['MAT-PMMA']},[{location:{line:1},text:'Cotton smoke measured.'}])]};
 const result=retrieve(index,{ids:['PSI-25'],question:'cotton smoke'});assert.equal(result.chunks.length,1);assert.deepEqual(result.chunks[0].sourceIds,['PSI-25']);
});
test('bounded text preserves literal chunk substring and deterministic IDs',()=>{
 const text='smoke '.repeat(1500),units=[{location:{page:3},text}],chunks=makeChunks(file,units,{maxChars:500,overlap:80});
 assert.deepEqual(chunks,makeChunks(file,units,{maxChars:500,overlap:80}));
 const result=retrieve({chunks},{ids:['PSI-25'],question:'smoke'},{maxChars:1000,maxChunks:2});
 assert.equal(result.chunks.length,2);assert.ok(result.characters<=1000);
 for(const chunk of result.chunks)assert.equal(chunk.quote,text.slice(chunk.location.start,chunk.location.end));
});
test('query-time full source verification excludes changed/absent bytes and closes handles',async()=>{
 const index={chunks:makeChunks(file,[{location:{page:4},text:'Optical smoke detection result.'}])};
 let closed=0;
 const out=await retrieveVerified(index,{ids:['PSI-25'],question:'smoke'},async()=>({row:{sha256:sha('changed')},handle:{async close(){closed++;}}}));
 assert.equal(out.chunks.length,0);assert.equal(out.excluded[0].reason,'source_integrity_failed');assert.equal(closed,1);
 await assert.rejects(()=>retrieveVerified(index,{ids:['PSI-25']},null),/integrity verifier/);
});
test('source aliases do not count identical file bytes as independent evidence',()=>{
 const unit=[{location:{page:4},text:'Measured smoke observations.'}],chunks=[...makeChunks({...file,accessions:['PSI-25','REF-01']},unit),...makeChunks({...file,id:'duplicate'},unit)];
 const result=retrieve({chunks},{ids:['PSI-25','REF-01'],question:'smoke'});assert.equal(result.chunks.length,1);assert.equal(result.chunks[0].fileId,'f12');
});
test('material mentions survive generic ignition/propagation competition without assigning numerical support',()=>{
 const units=[{location:{page:1},text:'Ignition propagation flame spread observed.'},{location:{page:54},text:'Nomex exhibited brief ignition, followed by extinction.'}],index={chunks:makeChunks(file,units)};
 const result=retrieve(index,{ids:['PSI-25'],question:'ignition propagation',conditions:{material:'Nomex'}});
 assert.equal(result.chunks[0].location.page,1);const material=result.chunks.find(c=>c.location.page===54);assert.ok(material);assert.equal(material.scope,'literal_extracted_text_not_reviewed_numerical_evidence');assert.equal(material.parameters,undefined);
});
test('third-party sidecar paths are excluded even if a PSI alias is accidentally present',()=>{
 for(const directory of ['Material_Sensitivity','Third_Party'])assert.equal(coreSource({...file,path:directory+'/test.pdf'}),false);
 assert.equal(coreSource({...file,path:'PSI/PSI-25/report.pdf'}),true);
});
test('compact lexical index excludes synthetic cell addresses while retaining value identities',()=>{
 const terms=lexicalTerms('A123=Nomex B456=nC14 C789=M1001 D987=0.000E+00',true);
 assert.ok(terms.includes('nomex'));assert.ok(terms.includes('nc14'));assert.ok(terms.includes('m1001'));assert.ok(!terms.includes('a123'));assert.ok(!terms.includes('b456'));assert.ok(!terms.includes('000e'));
});
test('query filtering preserves full eligible-chunk denominator and query-term document frequency',()=>{
 const chunks=makeChunks(file,[{location:{page:1},text:'Smoke observation one.'},{location:{page:2},text:'Smoke observation two.'},{location:{page:3},text:'Unrelated material section.'},{location:{page:4},text:'Separate experimental apparatus.'},{location:{page:5},text:'Acknowledgements and funding.'}]);
 const result=retrieve({chunks},{ids:['PSI-25'],question:'smoke'},{perSource:5});assert.equal(result.chunks.length,2);for(const chunk of result.chunks)assert.equal(chunk.retrievalScore,Math.log(1+5/2));
});
