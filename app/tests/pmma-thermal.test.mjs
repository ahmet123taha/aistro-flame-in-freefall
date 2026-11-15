import test from 'node:test';
import assert from 'node:assert/strict';
import {rodThermalEvidence,PMMA_THERMAL_PROFILE as p,surfaceGradientMagnitude as F} from '../lib/pmma-thermal.mjs';
import {pmmaRodReferences,physicalMatch,PMMA_ROD_SOURCE} from '../lib/pmma-rod-model.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {renderThermalEvidence} from '../public/thermal-card.mjs';
const c={thermalAnalysis:true,quasiSteady:true,material:'pmma',materialVariant:'cast-pmma',specimenKind:'rod',temperatureK:300,regressionRateMmS:.01,solidLengthMm:59};
const close=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);

test('Source profile retains original constants, source length and no silent SI correction',()=>{
 assert.equal(p.sigmaWcm2K4,5.729e-12);assert.equal(p.surfaceTemperatureK,573.15);assert.equal(p.sourceIllustrationLengthMm,59);assert.deepEqual(p.sourcePages,[4,8,9]);
});
test('Thermal gradient satisfies source ODE boundary derivative and zero limit',()=>{
 for(const pe of [0,1e-12,.1,1,5,20]){
  assert.ok(Number.isFinite(F(pe)));assert.ok(F(pe)>=1);
  if(pe>1e-6){const theta=y=>(Math.exp(-pe*y)-Math.exp(-pe))/(1-Math.exp(-pe));const h=1e-6;close(-(theta(h)-theta(-h))/(2*h),F(pe),1e-7);}
 }
 close(F(0),1);assert.equal(F(-1),null);assert.equal(F(NaN),null);
});
test('Heat flux dimensional conversions agree with independent SI calculation',()=>{
 const r=rodThermalEvidence(c),L=.059,V=.00001,alpha=1.2e-7,pe=L*V/alpha;
 close(r.peclet,pe);
 const cond=.209*(573.15-300)/L*(pe/(1-Math.exp(-pe)))/10000;
 const rad=.85*5.729e-8*(573.15**4-300**4)/10000;
 const vap=1190*V*1700000/10000;
 close(r.heatFluxWcm2.conduction,cond);close(r.heatFluxWcm2.radiation,rad);close(r.heatFluxWcm2.vaporization,vap);
 close(r.heatFluxWcm2.netRequired,cond+rad+vap);
 close(r.fractions.conduction+r.fractions.radiation+r.fractions.vaporization,1);
});
test('Zero measured regression is a finite mathematical limit, not proof of extinction',()=>{
 const r=rodThermalEvidence({...c,regressionRateMmS:0});assert.equal(r.status,'calculated');assert.equal(r.equilibriumLimit,true);assert.equal(r.fractions.combinedLoss,1);assert.equal(r.heatFluxWcm2.vaporization,0);assert.equal(r.sensitivities[0].net,null);assert.equal(r.sourceThreshold.classificationEnabled,false);
});
test('Independent log differences validate analytical thermal input elasticities',()=>{
 const r=rodThermalEvidence(c),h=1e-5;
 for(const s of r.sensitivities){
  const plus=rodThermalEvidence({...c,[s.key]:c[s.key]*Math.exp(h)}).heatFluxWcm2,minus=rodThermalEvidence({...c,[s.key]:c[s.key]*Math.exp(-h)}).heatFluxWcm2;
  for(const [key,field] of [['conduction','conduction'],['radiation','radiation'],['vaporization','vaporization'],['net','netRequired']])close(s[key],(Math.log(plus[field])-Math.log(minus[field]))/(2*h),1e-8);
 }
});
test('Thermal scope rejects missing measurements, wrong material and violated assumptions',()=>{
 assert.equal(rodThermalEvidence({...c,thermalAnalysis:false}).status,'not_requested');
 for(const patch of [{material:'nomex'},{materialVariant:'extruded-pmma'},{specimenKind:'sheet'},{quasiSteady:false},{temperatureK:null},{temperatureK:0},{temperatureK:574},{regressionRateMmS:null},{regressionRateMmS:-1},{solidLengthMm:0}])assert.equal(rodThermalEvidence({...c,...patch}).status,'unavailable');
 assert.equal(rodThermalEvidence({...c,regressionRateMmS:1}).status,'outside_source_illustration');
});
test('Higher regression requires higher heat, while source-model relative losses fall',()=>{
 const low=rodThermalEvidence({...c,regressionRateMmS:.001}),high=rodThermalEvidence({...c,regressionRateMmS:.03});
 assert.ok(high.heatFluxWcm2.netRequired>low.heatFluxWcm2.netRequired);assert.ok(high.fractions.combinedLoss<low.fractions.combinedLoss);assert.equal(high.heatFluxWcm2.radiation,low.heatFluxWcm2.radiation);
});
test('API preserves explicit thermal observations and rejects boolean strings or invalid numbers',()=>{
 const q={question:'test',ids:['PSI-25'],conditions:{...c,gravity:'other'}};
 assert.equal(validateRequest(q,['PSI-25']).conditions.regressionRateMmS,.01);
 for(const patch of [{thermalAnalysis:'true'},{quasiSteady:1},{regressionRateMmS:Infinity},{regressionRateMmS:-1},{solidLengthMm:0}])assert.throws(()=>validateRequest({...q,conditions:{...q.conditions,...patch}},['PSI-25']));
});
test('Thermal calculation does not inflate similarity and retains source-gated provenance',()=>{
 const corpus={hash:'h',experiments:{physicalRows:pmmaRodReferences({id:'f45',sha256:PMMA_ROD_SOURCE.sha256,name:'PMMA.pdf'})}},conditions={...c,gravityRegime:'microgravity',tipShape:'hemispherical',flowDirection:'concurrent',airflow:.5,rodDiameterMm:6.36};
 const q={conditions,ids:['PSI-25'],method:'pmma-rod-forced'},r=physicalMatch(corpus,q).matches[0];
 assert.equal(r.experiment.physics.thermal.status,'calculated');assert.equal(r.similarity,physicalMatch(corpus,{...q,conditions:{...conditions,thermalAnalysis:false}}).matches[0].similarity);
 assert.equal(physicalMatch({...corpus,experiments:{physicalRows:[]}},q).matches.length,0);
});
test('Thermal view labels required heat, assumptions and unvalidated threshold without risk colors',()=>{
 const html=renderThermalEvidence(rodThermalEvidence(c),PMMA_ROD_SOURCE);
 assert.match(html,/Required net flux/);assert.match(html,/not measured properties of the user specimen/);assert.match(html,/not an independently validated decision threshold/);assert.ok(!html.includes('score-'));assert.match(renderThermalEvidence(rodThermalEvidence({...c,temperatureK:null}),PMMA_ROD_SOURCE),/unavailable/);
});
