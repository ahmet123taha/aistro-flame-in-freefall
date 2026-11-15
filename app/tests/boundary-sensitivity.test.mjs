import test from 'node:test';
import assert from 'node:assert/strict';
import {boundarySensitivity,boundaryMatch,boundaryValue,normalizedRodStretch,MINIMUM_STRETCH,PMMA_BOUNDARY_SOURCE as S} from '../lib/pmma-boundary.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {renderBoundaryDetails} from '../public/boundary-card.mjs';
import {payloadFor} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
const c={gravity:'other',material:'pmma',materialVariant:'cast-pmma',specimenKind:'rod',tipShape:'hemispherical',flowDirection:'concurrent',gravityRegime:'microgravity',flameState:'established',oxidizerDiluent:'nitrogen',oxygenBasis:'boundary_state',rodDiameterMm:9.52,airflow:.5,oxygen:15,boundaryProbePercent:1};
const corpus={hash:'test',records:[{id:'PSI-25'}],experiments:{boundaryReference:{id:S.fileId,sha256:S.sha256,name:'BASS.pdf'}}};
const request=(p={})=>({ids:['PSI-25'],question:"Parameter etkilerini incele.",method:'pmma-rod-boundary',conditions:{...c,...p}});
const near=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
test('Equal relative probes produce exact dimensional output changes and normalized shares, not preset weights',()=>{
 const s=boundarySensitivity(c);assert.equal(s.status,'calculated');near(s.rows.reduce((n,r)=>n+r.sharePercent,0),100);
 const o=s.rows[0];near(o.changesPp.increase,.15);near(o.changesPp.decrease,-.15);near(o.endpointLinearErrorPp,0);
 assert.ok(s.rows[1].sharePercent>s.rows[2].sharePercent);assert.ok(s.rows.every(r=>r.maxExcursionPp>0));
 assert.equal(s.stepOrigin,'analyst_relative_probe');assert.equal(s.jointProbe.modelErrorIncluded,false);
});
test('Flow response reverses between the quenching and blowoff sides; local shares are not universal',()=>{
 const a=boundarySensitivity(c),b=boundarySensitivity({...c,airflow:10});
 assert.ok(a.rows[1].changesPp.increase>0);assert.ok(b.rows[1].changesPp.increase<0);
 assert.ok(a.rows[2].changesPp.increase<0);assert.ok(b.rows[2].changesPp.increase>0);
 assert.notEqual(a.rows[1].sharePercent,b.rows[1].sharePercent);
});
test('Finite perturbations detect curvature at a stationary point where the linear derivative is zero',()=>{
 const inputs={...c,airflow:MINIMUM_STRETCH/normalizedRodStretch(1,c.rodDiameterMm),boundaryProbePercent:10};
 const s=boundarySensitivity(inputs),flow=s.rows[1];near(flow.marginDerivative,0,1e-12);
 assert.ok(flow.maxExcursionPp>0);assert.ok(flow.sharePercent>0);assert.equal(flow.stationaryPointIncluded,true);
 assert.ok(flow.changesPp.decrease<0&&flow.changesPp.increase<0);near(flow.deltaBoundsPp[1],0);
 assert.ok(flow.endpointLinearErrorPp>.001);
});
test('Analytic one-at-a-time and simultaneous bounds enclose a deterministic independent grid',()=>{
 const inputs={...c,airflow:2.7,boundaryProbePercent:10},s=boundarySensitivity(inputs);
 for(const row of s.rows)for(let i=0;i<=100;i++){
  const p={...inputs,[row.key]:row.inputBounds[0]+i*(row.inputBounds[1]-row.inputBounds[0])/100};
  const v=boundaryValue(p.airflow,p.rodDiameterMm,p.oxygen).oxygenMarginPp;
  assert.ok(v>=row.marginBoundsPp[0]-1e-12&&v<=row.marginBoundsPp[1]+1e-12);
 }
 const b=s.jointProbe.marginBoundsPp;
 for(let i=0;i<=12;i++)for(let j=0;j<=12;j++)for(let k=0;k<=12;k++){
  const val=(key,t)=>inputs[key]*(.9+.2*t/12);
  const v=boundaryValue(val('airflow',j),val('rodDiameterMm',k),val('oxygen',i)).oxygenMarginPp;
  assert.ok(v>=b[0]-1e-12&&v<=b[1]+1e-12);
 }
});
test('A probe outside the source window is never clipped or reweighted onto the remaining parameters',()=>{
 const s=boundarySensitivity({...c,rodDiameterMm:6.35});assert.equal(s.status,'partial');assert.equal(s.sharesAvailable,false);
 assert.equal(s.rows[2].status,'outside_window');assert.equal(s.rows[0].status,'calculated');
 assert.ok(s.rows.every(r=>r.sharePercent===null));assert.equal(s.jointProbe.status,'outside_window');
});
test('Probe size is explicit and does not overwrite measured error bounds or invent missing errors',()=>{
 const original={...c,oxygenUncertaintyPp:.02,airflowUncertaintyCmS:null,diameterUncertaintyMm:.1},copy=structuredClone(original);
 const s=boundarySensitivity(original),t=boundarySensitivity({...original,boundaryProbePercent:10});
 assert.deepEqual(original,copy);assert.notEqual(s.rows[1].sharePercent,t.rows[1].sharePercent);
 const b=boundaryMatch(corpus,{...request(),conditions:original}).matches[0].experiment.boundary;
 assert.equal(b.uncertainty.status,'unknown');assert.equal(b.sensitivity.status,'calculated');
});
test('Applicability and pinned source gates still precede all effect calculations',()=>{
 assert.equal(boundarySensitivity({...c,material:'nomex'}).status,'not_applicable');
 const bad={...corpus,experiments:{boundaryReference:{id:S.fileId,sha256:'bad'}}};
 assert.equal(boundaryMatch(bad,request()).matches.length,0);
 assert.equal(boundarySensitivity({...c,boundaryProbePercent:0}).status,'invalid_probe');
});
test('API contract rejects nonnumeric, zero, tiny and oversized probes; omitted probe is explicitly1 percent',()=>{
 for(const n of [-1,0,.001,10.1,Infinity,'1',false])assert.throws(()=>validateRequest(request({boundaryProbePercent:n}),['PSI-25']));
 const r=request();delete r.conditions.boundaryProbePercent;near(validateRequest(r,['PSI-25']).conditions.boundaryProbePercent,1);
 assert.equal(validateRequest(request({boundaryProbePercent:10}),['PSI-25']).conditions.boundaryProbePercent,10);
});
test('UI and AI payload separate exact effects, linear approximation, measurement errors and fire risk',()=>{
 const b=boundaryMatch(corpus,request()).matches[0].experiment,html=renderBoundaryDetails(b);
 assert.match(html,/Parameter effects for equal relative changes/);assert.match(html,/full-equation/);assert.match(html,/Linear/);assert.match(html,/not measurement error/);
 const p=payloadFor({records:[]},validateRequest(request(),['PSI-25']));
 assert.match(p.instructions,/analyst-chosen relative probe/);assert.equal(p.tools,undefined);
 assert.equal(JSON.parse(p.input[0].content[0].text).conditions.boundaryProbePercent,1);
});
test('HTTP computes source-model effects deterministically without invoking a provider',async()=>{
 let calls=0;const analyzer={status:()=>({requests:calls}),analyze:()=>{calls++;throw Error('Unexpected call');}};
 const server=createApp({corpus,analyzer,sessionToken:'test'});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try{
  const post=body=>fetch(`http://127.0.0.1:${server.address().port}/api/match`,{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'test'},body:JSON.stringify(body)});
  const ok=await post(request());assert.equal(ok.status,200);assert.equal((await ok.json()).matches[0].experiment.boundary.sensitivity.status,'calculated');
  assert.equal((await post(request({boundaryProbePercent:11}))).status,400);assert.equal(calls,0);
 }finally{await new Promise(r=>server.close(r));}
});
