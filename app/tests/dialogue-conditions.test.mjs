import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {extractDialogueConditions,applyDialogueConditions} from '../lib/dialogue-conditions.mjs';
import {createApp} from '../server.mjs';
const values=q=>Object.fromEntries(extractDialogueConditions({question:q}).updates.map(s=>[s.key,s.value]));
test('latest Turkish conditions normalize every main field with exact quote and conversion receipts',()=>{
 const question='Malzeme PMMA; sıcaklık yaklaşık 25 °C; yerçekimi 0,1 g; basınç 1 bar; oksijen %21; hava akışı 0.2 m/s; kalınlık 0.3 cm';
 const receipt=extractDialogueConditions({question});
 assert.deepEqual(Object.fromEntries(receipt.updates.map(x=>[x.key,x.value])),{material:'pmma',temperatureK:298.15,gravityMs2:.980665,pressure:100,oxygen:21,airflow:20,thicknessMm:3});
 for(const update of receipt.updates){assert.ok(question.includes(update.quote));assert.ok(update.unit);}
 assert.equal(receipt.updates.find(x=>x.key==='temperatureK').basis,'estimated');assert.equal(receipt.updates.find(x=>x.key==='gravityMs2').conversion,'g * 9.80665');
});
test('English measurements, custom material, Fahrenheit, Pascal, atmosphere and exact zeros',()=>{
 assert.deepEqual(values('My material is titanium; temperature 68 F; pressure 101325 Pa; gravity 0 m/s²; oxygen 0%; airflow 0 cm/s; thickness 2 mm'),{material:'titanium',temperatureK:293.15,pressure:101.325,gravityMs2:0,oxygen:0,airflow:0,thicknessMm:2});
 assert.equal(values('pressure 1 atm').pressure,101.325);assert.equal(values('temperature 300 K').temperatureK,300);assert.equal(values('pressure 99 kPa').pressure,99);
 assert.equal(values('malzeme ahşap').material,'wood');assert.equal(values('cam elyafı kullanıyorum').material,'fiberglass');
});
test('ranges, comparisons, hypothetical/source/assistant statements and unitless measurements do not manufacture values',()=>{
 for(const question of ['temperature 20-30 C','temperature between 20 and 30 C','temperature 300 +/- 10 K','pressure > 100 kPa','if temperature is 300 K','What if pressure is 1 bar?','Varsayalım sıcaklık 20 C','The paper reports temperature 300 K','According to the article, temperature 300 K','Makalede basınç 1 bar','"temperature 300 K"',"'temperature 300 K'",'assistant said temperature 300 K','temperature 30','oxygen not 21%','PMMA or wood','temperature 20 C and 30 C'])assert.deepEqual(values(question),{},question);
 assert.deepEqual(values('temperature unknown'),{temperatureK:null});assert.deepEqual(values('material is unknown'),{material:null});
 assert.deepEqual(values('room air'),{});assert.deepEqual(values('25 g of wood'),{material:'wood'});
 for(const question of ['I am an engineer reviewing material selection. I have no sensor readings.','I want to learn about material storage.','I have just changed my question to material fire detection.','I am comparing PMMA and fabric studies for design review.','What are the properties of PMMA?'])assert.deepEqual(values(question),{},question);
 assert.equal(values('I only know the material is cotton. Help me find useful papers.').material,'cotton');
});
test('explicit corrections replace old values while clearing and absent fields preserve current intent',()=>{
 const original={question:'Actually temperature 30 C; pressure 2 bar',conditions:{temperatureK:280,pressure:100,gravityMs2:8},conditionBasis:{temperatureK:'estimated'},history:[{role:'assistant',text:'oxygen 100%'}],scenario:'temperature 200 K; oxygen 50%'};
 const changed=applyDialogueConditions(original);assert.equal(changed.request.conditions.temperatureK,303.15);assert.equal(changed.request.conditions.pressure,200);assert.equal(changed.request.conditions.gravityMs2,8);assert.equal(changed.request.conditions.oxygen,undefined);assert.equal(original.conditions.temperatureK,280);
 const cleared=applyDialogueConditions({...original,question:'Clear temperature'});assert.equal(cleared.request.conditions.temperatureK,null);assert.equal(cleared.request.conditionBasis.temperatureK,undefined);
 assert.deepEqual(extractDialogueConditions({...original,question:'pressure 100 kPa',trigger:'environment'}).updates,[]);
 assert.deepEqual(extractDialogueConditions({...original,question:'pressure 100 kPa',flow:{updateResearch:false}}).updates,[]);
 assert.deepEqual(applyDialogueConditions({...original,question:'hello',conditions:{temperatureK:null}}).request.conditions,{temperatureK:null});
});
test('server sends normalized current dialogue to analyzer and same-turn numeric ranking without another call',async()=>{
 const fields={material:'pmma',gravityMs2:.980665,temperatureK:298.15,pressure:100,oxygen:21,airflow:20,thicknessMm:3};
 const quote='The study reports flame spread over PMMA sheets in an experimental chamber.';
 const corpus={hash:'autofill-test',records:[{id:'PSI-1',content:{approach:quote},tableReferences:[]}],experiments:{rows:[{sourceId:'PSI-1',runId:'r1',values:fields,evidence:Object.fromEntries(Object.keys(fields).map(k=>[k,{fileId:'f1'}])),provenance:{fileId:'f1'}}]}};
 const analysis={stage:'rank',summary:'TEST ONLY',questions:[],assessments:[{sourceId:'PSI-1',field:'approach',quote,reason:'Fixture',limitation:'Fixture only',rubric:{objective:1,setting:.5,material:1,mechanism:1}}],unknowns:[],nextStep:'Review',emergency:false};
 let calls=0,received;
 const analyzer={status:()=>({configured:true,busy:false}),async analyze(request){calls++;received=request;return {analysis,request,provider:{name:'TEST ONLY'}};}};
 const app=createApp({corpus,analyzer,sessionToken:'test'});await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 try{const response=await fetch(`http://127.0.0.1:${app.address().port}/api/research`,{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test'},body:JSON.stringify({scenario:'',question:'I use PMMA; temperature 25 C; gravity 0.1 g; pressure 1 bar; oxygen 21%; airflow 0.2 m/s; thickness 0.3 cm. Find a relevant study.',trigger:'chat',conditions:{temperatureK:100},history:[{role:'assistant',text:'pressure 999 kPa'}]})});
 assert.equal(response.status,200);const body=await response.json();assert.equal(calls,1);for(const [key,value] of Object.entries(fields))assert.equal(received.conditions[key],value,key);assert.equal(body.ranking.matches[0].numericPoints,60);assert.equal(body.ranking.matches[0].numericStatus,'complete');assert.equal(body.conditionUpdates.length,7);assert.deepEqual(body.analysis.conditionAutofill.updates,body.conditionUpdates);assert.equal(body.request.conditions.temperatureK,298.15);
 }finally{await new Promise(resolve=>app.close(resolve));}
});
test('UI applies automatic receipt behind revision/focus guard without reopening panes or invalidating ranking',async()=>{
 const source=await readFile(new URL('../public/environment-panel.mjs',import.meta.url),'utf8');
 assert.ok(source.includes('if(!current)return;applyAutomaticConditions(r.conditionUpdates);recommendations.apply(r.analysis);'));
 const helper=source.slice(source.indexOf(' function applyAutomaticConditions('),source.indexOf(' function restore('));
 for(const forbidden of ['panel.expand','onInvalidate','result=null','revision++','.focus(','.scroll','dispatchEvent'])assert.ok(!helper.includes(forbidden),forbidden);
 assert.ok(helper.includes('persist()'));
 assert.ok(source.includes('if(current)applyAutomaticConditions(e.conditionUpdates);'));
});
test('provider failure retains explicit user condition updates without a scientific answer or another call',async()=>{
 let calls=0;const analyzer={status:()=>({configured:true,busy:false}),async analyze(request){calls++;assert.equal(request.conditions.temperatureK,293.15);throw Object.assign(Error('TEST ONLY provider unavailable'),{code:'OPENAI_503',status:502});}};
 const app=createApp({corpus:{hash:'failure-test',records:[]},analyzer,sessionToken:'test'});await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
 try{const response=await fetch(`http://127.0.0.1:${app.address().port}/api/research`,{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test'},body:JSON.stringify({scenario:'',question:'temperature 20 C',trigger:'chat',conditions:{}})});assert.equal(response.status,502);const body=await response.json();assert.equal(calls,1);assert.equal(body.analysis,undefined);assert.equal(body.conditionUpdates[0].value,293.15);assert.equal(body.conditionUpdates[0].quote,'temperature 20 C');
 }finally{await new Promise(resolve=>app.close(resolve));}
});
