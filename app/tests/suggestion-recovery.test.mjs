import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {validateResearch} from '../lib/research.mjs';
import {createAnalyzer} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
const corpus={hash:'recovery-fixture',records:[]};
const answer={stage:'clarify',summary:'Please describe the situation you want to investigate.',questions:['Where are you and what would you like to learn?'],assessments:[],unknowns:[],nextStep:'Describe your scenario.',emergency:false,conditionSuggestions:[]};
const q={mode:'research',scenario:'',question:'Use my optional environment information and ask about the scenario if it is not yet known.',conditions:{gravityMs2:8,temperatureK:300,oxygen:30,pressure:100,airflow:0},ids:[]};
const rawSuggestions=Object.entries(q.conditions).map(([key,value])=>({key,value,unit:({gravityMs2:'m/s²',temperatureK:'K',oxygen:'% vol',pressure:'kPa',airflow:'cm/s'})[key],basis:'user_reported',quote:`${key}: ${value}`}));
test('screenshot form values do not block initial scenario question when model repeats them',()=>{
 const before=structuredClone(q);const out=validateResearch({...answer,conditionSuggestions:rawSuggestions},corpus,q);
 assert.equal(out.summary,answer.summary);assert.deepEqual(out.questions,answer.questions);assert.deepEqual(out.conditionSuggestions,[]);assert.equal(out.conditionSuggestionReview.rejected.length,5);assert.ok(out.conditionSuggestionReview.rejected.every(x=>x.reason==='already_entered'));assert.deepEqual(q,before);
});
test('one invalid optional extraction cannot discard a valid peer or the conversation',()=>{
 const request={...q,conditions:{},scenario:'Pressure is 100 kPa; gravity is unknown.'};
 const good={key:'pressure',value:100,unit:'kPa',basis:'user_reported',quote:'Pressure is 100 kPa'};
 const out=validateResearch({...answer,conditionSuggestions:[{key:'gravityMs2',value:8,unit:'m/s2',basis:'estimated',quote:'8 m/s2'},good]},corpus,request);
 assert.deepEqual(out.conditionSuggestions,[good]);assert.equal(out.questions[0],answer.questions[0]);assert.equal(out.conditionSuggestionReview.rejected[0].reason,'untraceable');
});
test('malformed optional items and collections are contained; duplicate fields are not chosen arbitrarily',()=>{
 for(const raw of [null,{},[null,5,{}]]){const out=validateResearch({...answer,conditionSuggestions:raw},corpus,q);assert.equal(out.stage,'clarify');assert.deepEqual(out.conditionSuggestions,[]);}
 const s={key:'pressure',value:100,unit:'kPa',basis:'user_reported',quote:'100 kPa'};
 const out=validateResearch({...answer,conditionSuggestions:[s,{...s,value:90}]},corpus,{...q,conditions:{},scenario:'100 kPa, maybe 90 kPa'});assert.deepEqual(out.conditionSuggestions,[]);assert.ok(out.conditionSuggestionReview.rejected.every(x=>x.reason==='duplicate_field'));
});
test('display-unit spelling normalization does not convert measurements or accept fabricated quotations',()=>{
 const s={key:'gravityMs2',value:3.9,unit:'m/s²',basis:'estimated',quote:'3.9 m/s²'};
 const out=validateResearch({...answer,conditionSuggestions:[s]},corpus,{...q,conditions:{},scenario:'I estimate 3.9 m/s²'});assert.equal(out.conditionSuggestions[0].unit,'m/s2');assert.equal(out.conditionSuggestions[0].value,3.9);
 const invalid=validateResearch({...answer,conditionSuggestions:[s]},corpus,{...q,conditions:{},scenario:'unknown',question:s.quote});assert.deepEqual(invalid.conditionSuggestions,[]);
});
test('optional recovery does not weaken mandatory source quotation validation',()=>{
 assert.throws(()=>validateResearch({...answer,stage:'rank',assessments:[{sourceId:'PSI-FAKE',quote:'A source that does not exist.',field:'approach',reason:'test',limitation:'test',rubric:{objective:1,setting:1,material:1,mechanism:1}}],conditionSuggestions:[null]},corpus,{...q,scenario:'Storage fire research.'}),/quotation/);
});
test('HTTP research + actual analyzer returns 200 and question, with one mocked provider call and no retries',async()=>{
 let calls=0;const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async(url,options)=>{calls++;const sent=JSON.parse(options.body);assert.match(sent.instructions,/NEVER from the supplied form/);return new Response(JSON.stringify({...providerResponse({...answer,conditionSuggestions:[...rawSuggestions,{key:'thicknessMm',value:2,unit:'mm',basis:'estimated',quote:'not actually said'}]})}));}});
 const app=createApp({corpus,analyzer,sessionToken:'test-only'});await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 try{const r=await fetch(`http://127.0.0.1:${app.address().port}/api/research`,{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test-only'},body:JSON.stringify(q)});assert.equal(r.status,200);const result=await r.json();assert.equal(result.analysis.stage,'clarify');assert.deepEqual(result.analysis.conditionSuggestions,[]);assert.equal(result.analysis.questions[0],answer.questions[0]);assert.equal(result.ranking.matches.length,0);assert.equal(calls,1);}finally{await new Promise(resolve=>app.close(resolve));}
});
