import test from 'node:test';
import assert from 'node:assert/strict';
import {rodStretch,rodApplicability,physicalMatch,pmmaRodReferences,PMMA_ROD_SOURCE} from '../lib/pmma-rod-model.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {renderNumericCard,renderNumericDetails} from '../public/numeric-card.mjs';
const c={material:'pmma',materialVariant:'cast-pmma',specimenKind:'rod',flowDirection:'concurrent',tipShape:'hemispherical',gravityRegime:'microgravity',airflow:.5,rodDiameterMm:6.36,flameRadiusMm:5.6};
const rows=pmmaRodReferences({id:'f45',sha256:PMMA_ROD_SOURCE.sha256,name:'PMMA.pdf'});
const corpus={hash:'h',experiments:{physicalRows:rows}};
const req=(conditions=c,method='pmma-rod-forced')=>({ids:['PSI-25'],conditions,method});
test('Forced stretch respects cm/s and mm units and analytical U/R scaling',()=>{
 const a=rodStretch(c);assert.ok(Math.abs(a.value-2.358490566037736)<1e-12);
 assert.equal(rodStretch({...c,airflow:1}).value,2*a.value);
 assert.equal(rodStretch({...c,rodDiameterMm:12.72}).value,a.value/2);
 assert.equal(rodStretch({...c,airflow:1,rodDiameterMm:12.72}).value,a.value);
 assert.equal(rodStretch({...c,airflow:0}),null);assert.equal(rodStretch({...c,rodDiameterMm:0}),null);
});
test('Total stretch keeps curvature and exposes no invented flame radius',()=>{
 const a=rodStretch(c,true),forced=rodStretch(c).value;
 assert.ok(a.curvature>forced);assert.ok(Math.abs(a.total-forced*(4*c.flameRadiusMm/c.rodDiameterMm-1))<1e-12);
 assert.equal(rodStretch({...c,flameRadiusMm:null},true),null);
 assert.equal(rodStretch({...c,flameRadiusMm:c.rodDiameterMm/2},true),null);
 assert.equal(rodStretch({...c,flameRadiusMm:null}).curvature,null);
});
test('Analytical elasticities agree with independent central log differences',()=>{
 for(const total of [false,true]){
  const model=rodStretch(c,total),h=1e-5;
  for(const [key,E] of Object.entries(model.elasticities)){
   const plus=rodStretch({...c,[key]:c[key]*Math.exp(h)},total).value,minus=rodStretch({...c,[key]:c[key]*Math.exp(-h)},total).value;
   assert.ok(Math.abs((Math.log(plus)-Math.log(minus))/(2*h)-E)<1e-8,key);
  }
 }
});
test('Applicability rejects unknown grade, wrong regime, geometry, direction and unsupported positive g',()=>{
 assert.equal(rodApplicability(c,'pmma-rod-forced').applicable,true);
 for(const patch of [{material:'nomex'},{materialVariant:''},{materialVariant:'extruded-pmma'},{specimenKind:'sheet'},{flowDirection:'opposed'},{tipShape:'flat'},{gravityRegime:'earth'},{gravityMs2:3.9},{rodDiameterMm:2},{rodDiameterMm:13},{airflow:-1}]){
  const result=physicalMatch(corpus,req({...c,...patch}));assert.deepEqual(result.matches,[]);assert.equal(result.applicability.applicable,false);assert.ok(result.applicability.reasons.length>0);
 }
});
test('Only pinned report estimates can match; reported rounded total is not silently corrected',()=>{
 assert.equal(rows.length,3);assert.equal(rows[2].values.totalStretch,8.68);assert.ok(rows.every(r=>r.values.oxygen===undefined&&r.values.airflow===undefined));
 assert.deepEqual(pmmaRodReferences({id:'f45',sha256:'changed'}),[]);
 assert.equal(physicalMatch({hash:'h',experiments:{physicalRows:[]}},req()).matches.length,0);
 const m=physicalMatch(corpus,req()).matches[0];assert.equal(m.experimentId,'PMMA-Figure2-a');assert.ok(m.similarity>99&&m.similarity<100);
 assert.deepEqual(m.experiment.physics.sensitivity.map(s=>s.relativeSensitivityPercent),[50,50]);
});
test('Geometry compensation is not hidden, and total-mode percentages concern a single feature',()=>{
 const r=physicalMatch(corpus,req({...c,airflow:1,rodDiameterMm:12.7})).matches[0];assert.equal(r.experiment.physics.diameterDifferent,true);assert.equal(r.experiment.weightedParameters,1);
 const total=physicalMatch(corpus,req(c,'pmma-rod-total')).matches[0];assert.equal(total.experiment.physics.curvatureOmitted,false);assert.ok(Math.abs(total.experiment.physics.sensitivity.reduce((n,x)=>n+x.relativeSensitivityPercent,0)-100)<1e-12);
});
test('Request methods and physical dimensions are validated without accepting hidden preset weights',()=>{
 const q={...req(),question:'test',conditions:{...c,gravity:'other'}};
 assert.equal(validateRequest(q,['PSI-25']).method,'pmma-rod-forced');
 assert.throws(()=>validateRequest({...q,method:'invented'},['PSI-25']));
 for(const patch of [{rodDiameterMm:0},{flameRadiusMm:-1},{materialVariant:'paper'}])assert.throws(()=>validateRequest({...q,conditions:{...q.conditions,...patch}},['PSI-25']));
 assert.equal(validateRequest({...q,weights:{notAParameter:1000}},['PSI-25']).weights.gravityMs2,20);
});
test('Physical UI states the metric and scope without showing the generic weighted-condition formula',()=>{
 const match=physicalMatch(corpus,req()).matches[0],html=renderNumericDetails(match);
 assert.match(html,/30U\/D/);assert.match(html,/not fire-risk weights/);assert.match(html,/curvature was omitted/);assert.ok(!html.includes("Contribution = yakınlık"));
 assert.match(renderNumericCard({id:'PSI-25',name:'BASS',match}),/Stretch closeness/);
});
