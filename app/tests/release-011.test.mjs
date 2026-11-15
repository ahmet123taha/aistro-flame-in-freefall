import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeApiKey} from '../lib/credentials.mjs';
import {matchSources} from '../lib/retrieval.mjs';
import {cardScore,renderStudyCard} from '../public/result-card.mjs';
import {createAnalyzer} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';

test('opaque dotted and long keys survive; pasted wrappers removed; unsafe headers rejected',()=>{
 const key='AQ.TEST_ONLY.'+'x'.repeat(300)+'+/=_-';
 assert.equal(normalizeApiKey('\u200b "'+key+'" \n'),key);
 for(const bad of ['',null,'abc def','abc\nX-Test: injected','abc\u200bdef','x'.repeat(4097)])assert.throws(()=>normalizeApiKey(bad));
});
test('long dotted key saves without provider request; rejected replacement leaves key intact',async()=>{
 let saved='',calls=0;
 const analyzer=createAnalyzer({corpus:{hash:'test',records:[]},fetchImpl:()=>{calls++;throw Error('unexpected');}});
 const app=createApp({corpus:{hash:'test',records:[]},analyzer,credentialStore:{save:async k=>saved=k,clear:async()=>saved=''},sessionToken:'session'});
 await new Promise(r=>app.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.address().port;
 const post=key=>fetch(base+'/api/settings/key',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'session'},body:JSON.stringify({key})});
 try{const key='AQ.TEST_ONLY.'+'x'.repeat(300);let r=await post(key);assert.equal(r.status,200);assert.equal((await r.text()).includes(key),false);assert.equal(saved,key);r=await post('bad\r\nkey');assert.equal(r.status,400);assert.equal(saved,key);assert.equal(calls,0);assert.equal((await fetch(base+'/result-card.mjs')).status,200);}finally{await new Promise(r=>app.close(r));}
});
const corpus={hash:'test',records:[{id:'A',title:'Oxygen microgravity',content:{objective:'oxygen O2 temperature'}},{id:'B',title:'Oxygen',content:{}},{id:'C',title:'CO2 sensor',content:{}}]};
const req={ids:['A','B','C'],question:'',conditions:{oxygen:21,temperatureK:300,gravityMs2:0}};
test('coverage uses distinct requested topics, not synonym counts or numeric values',()=>{
 const r=matchSources(corpus,req);assert.equal(r.matches[0].topicCoverage,100);assert.equal(r.matches[1].topicCoverage,33);assert.equal(r.matches[0].matchedTopicCount,3);assert.equal(r.matches[0].similarity,null);assert.equal(r.numericComparisonAvailable,false);assert.equal(r.scoreDefinition.calibrated,false);
 assert.deepEqual(r.matches.map(x=>x.topicCoverage),matchSources(corpus,{...req,conditions:{oxygen:99,temperatureK:5000,gravityMs2:100}}).matches.map(x=>x.topicCoverage));
 assert.ok(!r.matches.some(x=>x.id==='C'));assert.deepEqual(r.matches[0].reasonTags,["Oxygen","Temperature","Gravity"]);
});
test('no input/topic means unavailable, never fake zero or critical',()=>{
 const r=matchSources(corpus,{...req,conditions:{}});assert.equal(r.matches[0].topicCoverage,null);assert.equal(cardScore(r.matches[0],true).text,'—');assert.equal(cardScore({topicCoverage:100,level:'critical'},true).critical,false);
});
test('card has left score, short reasons, checkbox after badge; escaping protects source text',()=>{
 const match=matchSources(corpus,req).matches[0],html=renderStudyCard({id:'A',name:'<script>',match,subtitle:"Local PSI research collection"},{retrieval:true,selected:true});
 assert.ok(html.indexOf('match-score')<html.indexOf('study-content'));assert.ok(html.indexOf("Relevant source")<html.indexOf('type="checkbox"'));assert.match(html,/100%/);assert.match(html,/Topic relevance/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|Yerel PSI|kritik-label|Sayısal triall eşitliği doğrulanmadı/);
 assert.equal(cardScore({similarity:90,level:'critical'},false).critical,true);
});
