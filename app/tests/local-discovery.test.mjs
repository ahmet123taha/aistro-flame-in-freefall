import test from 'node:test';
import assert from 'node:assert/strict';
import {localDiscovery,canKeepLocalDiscovery} from '../lib/local-discovery.mjs';
import {sourceScenarioBreakdown} from '../lib/research-scoring.mjs';
import {createAnalyzer} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
import {researchCards} from '../public/environment-panel.mjs';
const corpus={hash:'local-recovery',records:[{id:'PSI-1',title:'PMMA study',content:{approach:'The source reports PMMA material trials and environmental values.'},tableReferences:[]}],experiments:{rows:[{sourceId:'PSI-1',runId:'r1',values:{material:'pmma',pressure:100},evidence:{pressure:{fileId:'f1',row:2,raw:'100',unit:'kPa'}},provenance:{fileId:'f1',row:2,sha256:'a'.repeat(64)}}]}};
const request={ids:['PSI-1'],conditions:{material:'pmma',pressure:101},flow:{canRank:true}};
test('local discovery retains verified source matches without an AI scenario score',()=>{
 const r=localDiscovery(corpus,request);assert.equal(r.mode,'local_discovery');assert.equal(r.matches.length,1);assert.ok(r.matches[0].parameterSupport.percent>99);assert.equal(r.matches[0].scenarioPoints,null);assert.deepEqual(r.matches[0].scenarioBreakdown,[]);assert.equal(r.matches[0].assessment.quote,'');
 const html=researchCards(r,corpus.records);assert.match(html,/Local source search/);assert.match(html,/AI scenario assessment is unavailable/);assert.doesNotMatch(html,/Scenario: 0|AI assessment<\/h4>/);
});
test('local discovery does not manufacture a material from chat text or missing provenance',()=>{
 assert.equal(localDiscovery(corpus,{...request,conditions:{pressure:101}}),null);
 assert.equal(localDiscovery(corpus,{...request,flow:{canRank:false}}),null);
 assert.equal(localDiscovery(corpus,{...request,conditions:{material:'fiberglass',pressure:101}}).matches.length,0);
 const c={...corpus,experiments:{rows:[{...corpus.experiments.rows[0],provenance:{fileId:'f1'}}]}};assert.equal(localDiscovery(c,request).matches.length,0);
});
test('provider outages allow local discovery while invalid scientific responses stay rejected',()=>{
 for(const code of ['NO_KEY','OPENAI_429','OPENAI_503','OPENAI_504'])assert.equal(canKeepLocalDiscovery({code}),true);
 for(const code of ['RESEARCH_QUOTE_INVALID','MODEL_JSON_INVALID','OPENAI_400','OPENAI_401','RESEARCH_RUBRIC_INVALID'])assert.equal(canKeepLocalDiscovery({code}),false);
});
test('verified material-family relevance is factual and preserves the raw model value',()=>{
 const a={sourceId:'PSI-1',rubric:{objective:.5,material:.1,geometry:.5,storage:.5,atmosphere:.5,gravity:.5,flow:.5,mechanism:.5},rubricReasons:{material:'The model supplied a low subjective value.'}};
 const material=sourceScenarioBreakdown(corpus,request,a).find(x=>x.key==='material');assert.equal(material.value,1);assert.equal(material.modelValue,.1);assert.equal(material.points,8);assert.equal(material.origin,'verified_source_material_family');assert.equal(material.sourceReferences[0].fileId,'f1');assert.match(material.reason,/not equal grade/);assert.equal(a.rubric.material,.1);
 assert.equal(sourceScenarioBreakdown(corpus,{conditions:{material:'fiberglass'}},a).find(x=>x.key==='material').value,.1);
});
test('an actual HTTP provider 503 stays visible and returns local source matches with one attempt',async()=>{
 let calls=0;const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async()=>{calls++;return Response.json({error:{message:'Service unavailable',code:503}},{status:503});}});
 const app=createApp({corpus,analyzer,sessionToken:'local-test'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 try{const response=await fetch('http://127.0.0.1:'+app.address().port+'/api/research',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'local-test'},body:JSON.stringify({question:'I want PMMA pressure and fire research.',scenario:'I store PMMA sheets.',conditions:request.conditions,trigger:'chat'})});
 const body=await response.json();assert.equal(response.status,502);assert.equal(body.code,'OPENAI_503');assert.equal(body.provider.httpStatus,503);assert.equal(body.provider.validation,'not_performed');assert.equal(body.analysis,undefined);assert.equal(body.localDiscovery.matches[0].id,'PSI-1');assert.equal(body.localDiscovery.matches[0].scenarioPoints,null);assert.equal(calls,1);assert.equal(analyzer.status().requests,1);
 }finally{await new Promise(r=>app.close(r));}
});
test('a no-key source search performs no provider request and never fabricates an AI answer',async()=>{
 let calls=0;const analyzer=createAnalyzer({corpus,key:'',fetchImpl:async()=>{calls++;throw Error('Must not be called');}});const app=createApp({corpus,analyzer,sessionToken:'local-test'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 try{const response=await fetch('http://127.0.0.1:'+app.address().port+'/api/research',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'local-test'},body:JSON.stringify({question:'I want PMMA fire research.',scenario:'I store PMMA.',conditions:request.conditions,trigger:'chat'})});const body=await response.json();assert.equal(body.code,'NO_KEY');assert.equal(body.localDiscovery.matches[0].id,'PSI-1');assert.equal(body.analysis,undefined);assert.equal(calls,0);}finally{await new Promise(r=>app.close(r));}
});
