import test from 'node:test';
import assert from 'node:assert/strict';
import {literalMaterialMention} from '../lib/source-content-terms.mjs';
import {retrieve,makeChunks,sha} from '../lib/source-content-index.mjs';
test('scholarly paper wording remains searchable but is not promoted as paper fuel',()=>{
 assert.equal(literalMaterialMention('paper','This paper reports methane flames.',new Set(['paper','methane'])),false);
 for(const text of ['Paper strips burned in the source.','Filter paper specimens were tested.','["Material","Paper"]'])assert.equal(literalMaterialMention('paper',text,new Set(['paper'])),true);
 const file={id:'f1',sha256:sha('methane'),name:'Study.pdf',accessions:['PSI-1']},chunks=[...makeChunks(file,[{location:{page:1},text:'This paper reports methane flames and oxygen gravity flow.'}]),...makeChunks({...file,id:'f2',sha256:sha('paper fuel'),accessions:['PSI-2']},[{location:{page:2},text:'Paper strips burned with a flame.'}])],result=retrieve({chunks},{ids:['PSI-1','PSI-2'],question:'flame oxygen gravity flow',conditions:{material:'paper'}});
 // The explicit flow/oxygen question may retrieve a useful other-material
 // mechanism first. Material identity must not override question relevance.
 assert.equal(result.chunks[0].sourceIds[0],'PSI-1');assert.ok(result.chunks.some(c=>c.sourceIds.includes('PSI-2')));assert.ok(result.chunks.every(c=>c.parameters===undefined));
 const focused=retrieve({chunks},{ids:['PSI-1','PSI-2'],question:'Paper strips burned with a flame',conditions:{material:'paper'}});
 assert.equal(focused.chunks[0].sourceIds[0],'PSI-2');
});
