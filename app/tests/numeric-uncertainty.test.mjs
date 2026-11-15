import test from 'node:test';
import assert from 'node:assert/strict';
import {closenessBounds,validateNumericUncertainty} from '../lib/numeric-uncertainty.mjs';
import {numericCloseness,compareExperiment,matchExperiments,validateWeights} from '../lib/numeric-matching.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {renderNumericCard} from '../public/numeric-card.mjs';
import {payloadFor} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
const near=(x,y)=>assert.ok(Math.abs(x-y)<1e-10,`${x} != ${y}`);
const row={sourceId:'PSI-25',runId:'test',values:{material:'pmma',gravityMs2:4,oxygen:20},evidence:{},specimenKind:'sheet',provenance:{fileId:'fixture',name:'test fixture',row:2}};
const conditions={gravity:'other',material:'pmma',specimenKind:'sheet',gravityMs2:3.9,oxygen:20};
const weights=validateWeights({gravityMs2:20,oxygen:80});
const req=c=>({question:'Compare source values',ids:['PSI-25'],conditions:{...conditions,...c},weights});

test('3.9 versus4: nominal97.5, +/-0.2 includes exact match and97.5 is not a guaranteed lower bound',()=>{
 const b=closenessBounds(3.9,4,.2);near(b.min,92.5);assert.equal(b.max,100);
 const r=compareExperiment(row,{...conditions,numericUncertainty:{gravityMs2:.2,oxygen:0}},weights);
 near(r.similarity,99.5);near(r.inputUncertainty.range.min,98.5);near(r.inputUncertainty.range.max,100);
 near(r.contributions.find(c=>c.key==='gravityMs2').points,19.5);
});
test('Bounds attain correct extrema below above and across the source value, including zero discontinuity',()=>{
 assert.deepEqual(closenessBounds(2,4,1),{inputMin:1,inputMax:3,min:25,max:75});
 near(closenessBounds(8,4,2).min,40);near(closenessBounds(8,4,2).max,100*4/6);
 assert.deepEqual(closenessBounds(1,0,1),{inputMin:0,inputMax:2,min:0,max:100});
 assert.equal(closenessBounds(0,0,0).min,100);assert.equal(closenessBounds(2,0,1).max,0);
 for(const args of [[1,4,2],[1,4,-1],[1,4,Infinity],[NaN,4,1]])assert.equal(closenessBounds(...args),null);
});
test("Analytical bounds enclose a dense deterministic grid and are inpresentiant to common unit scaling",()=>{
 for(const source of [0,.1,4,20])for(const input of [.2,1,4,15])for(const fraction of [0,.1,.7,1]){
  const error=input*fraction,b=closenessBounds(input,source,error);
  for(let i=0;i<=1000;i++){
   const value=b.inputMin+(b.inputMax-b.inputMin)*i/1000,s=numericCloseness(value,source);
   assert.ok(s>=b.min-1e-10&&s<=b.max+1e-10);
  }
  const scaled=closenessBounds(input*1000,source*1000,error*1000);near(b.min,scaled.min);near(b.max,scaled.max);
 }
});
test('Unknown errors do not become zero; zero-weight parameters do not block the conditional interval',()=>{
 assert.equal(compareExperiment(row,conditions,weights).inputUncertainty.range,null);
 const partial=compareExperiment(row,{...conditions,numericUncertainty:{gravityMs2:.1}},weights);
 assert.deepEqual(partial.inputUncertainty.missing,['oxygen']);assert.equal(partial.inputUncertainty.range,null);
 const explicit=compareExperiment(row,{...conditions,numericUncertainty:{gravityMs2:0,oxygen:0}},weights);
 near(explicit.inputUncertainty.range.min,99.5);near(explicit.inputUncertainty.range.max,99.5);
 assert.equal(explicit.inputUncertainty.sourceUncertainty,'not_quantified');
});
test('Missing source values, product gates and partial weights still suppress a full interval',()=>{
 const c={...conditions,numericUncertainty:{gravityMs2:.1,oxygen:1}};
 for(const [r,con,w] of [[{...row,values:{material:'pmma',oxygen:20}},c,weights],[row,{...c,material:''},weights],[row,c,validateWeights({gravityMs2:20})]]){
  const m=compareExperiment(r,con,w);assert.equal(m.similarity,null);assert.equal(m.inputUncertainty.range,null);
 }
});
test('Request rejects negative, string, orphan, percent-overflow and nonpositive physical intervals without clipping',()=>{
 for(const e of [{gravityMs2:-1},{gravityMs2:'0.1'},{gravityMs2:Infinity},{madeUp:1},{material:1},{thicknessMm:1},{gravityMs2:5},{oxygen:81}])assert.throws(()=>validateRequest(req({numericUncertainty:e}),['PSI-25']));
 for(const c of [{temperatureK:300,numericUncertainty:{temperatureK:300}},{pressure:10,numericUncertainty:{pressure:10}},{thicknessMm:1,numericUncertainty:{thicknessMm:1}}])assert.throws(()=>validateRequest(req(c),['PSI-25']));
 const good=validateRequest(req({numericUncertainty:{gravityMs2:.1,oxygen:0,airflow:null}}),['PSI-25']);assert.deepEqual(good.conditions.numericUncertainty,{gravityMs2:.1,oxygen:0});
 assert.deepEqual(validateNumericUncertainty(null,conditions),{});
});
test('Changing errors cannot change nominal ordering or turn interval overlap into critical classification',()=>{
 const corpus={hash:'fixture',experiments:{rows:[row,{...row,sourceId:'PSI-69',values:{...row.values,gravityMs2:3}}]}};
 const base={...req({}),ids:['PSI-25','PSI-69']};
 const a=matchExperiments(corpus,base),b=matchExperiments(corpus,{...base,conditions:{...base.conditions,numericUncertainty:{gravityMs2:.5,oxygen:2}}});
 assert.deepEqual(a.matches.map(m=>[m.id,m.similarity,m.level]),b.matches.map(m=>[m.id,m.similarity,m.level]));
 assert.ok(b.matches.every(m=>m.experiment.inputUncertainty.range));
});
test('Card labels distinguish input-error intervals from confidence, fire risk and missing-source ranges',()=>{
 const experiment=compareExperiment(row,{...conditions,numericUncertainty:{gravityMs2:.2,oxygen:0}},weights);
 const html=renderNumericCard({id:'PSI-25',name:'Fixture',match:{experiment}});
 assert.match(html,/98\.5–100/);assert.match(html,/source measurement errors remain unknown/);assert.match(html,/not a confidence interval, probability or fire risk/);
});
test('AI payload preserves units and unknown source uncertainty rules without webtools',()=>{
 const parsed=validateRequest(req({numericUncertainty:{gravityMs2:.2,oxygen:0}}),['PSI-25']);
 const p=payloadFor({records:[]},parsed),body=JSON.parse(p.input[0].content[0].text);
 assert.equal(body.conditions.numericUncertainty.gravityMs2,.2);assert.equal(body.conditions.units.gravityMs2,'m/s2');
 assert.match(p.instructions,/Missing input errors are unknown/);assert.equal(p.tools,undefined);
});
test('HTTP matching passes valid uncertainty to the deterministic calculator and rejects invalid intervals without provider calls',async()=>{
 let calls=0;const corpus={hash:'fixture',records:[{id:'PSI-25'}],experiments:{rows:[row]}};
 const analyzer={status:()=>({requests:calls}),analyze:()=>{calls++;throw Error('Unexpected provider call');}};
 const server=createApp({corpus,analyzer,sessionToken:'test'});await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const post=body=>fetch(`http://127.0.0.1:${server.address().port}/api/match`,{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test'},body:JSON.stringify(body)});
  const good=await post(req({numericUncertainty:{gravityMs2:.2,oxygen:0}}));assert.equal(good.status,200);near((await good.json()).matches[0].experiment.inputUncertainty.range.min,98.5);
  assert.equal((await post(req({numericUncertainty:{oxygen:99}}))).status,400);assert.equal(calls,0);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
