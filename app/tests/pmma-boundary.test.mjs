import test from 'node:test';
import assert from 'node:assert/strict';
import {BOUNDARY_METHOD,PMMA_BOUNDARY_SOURCE as S,MINIMUM_STRETCH,normalizedRodStretch,oxygenBoundary,boundaryValue,boundaryUncertainty,boundaryMatch} from '../lib/pmma-boundary.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {renderNumericCard,renderNumericDetails} from '../public/numeric-card.mjs';
const c={gravity:'other',material:'pmma',materialVariant:'cast-pmma',specimenKind:'rod',tipShape:'hemispherical',flowDirection:'concurrent',gravityRegime:'microgravity',flameState:'established',oxidizerDiluent:'nitrogen',oxygenBasis:'boundary_state',rodDiameterMm:6.36,airflow:2.2048,oxygen:13.61,oxygenUncertaintyPp:.05,airflowUncertaintyCmS:.05,diameterUncertaintyMm:.01};
const corpus={hash:'h',experiments:{boundaryReference:{id:S.fileId,sha256:S.sha256,name:'BASS-II.pdf'}}};
const q=(conditions=c)=>({question:"Source sınırını incele.",conditions,method:BOUNDARY_METHOD,ids:['PSI-25']});
const near=(a,b,t=1e-9)=>assert.ok(Math.abs(a-b)<t,`${a} vs ${b}`);
test('2021 boundary uses radius-normalized stretch, not the earlier unnormalized quantity',()=>{
 near(normalizedRodStretch(1,6.36),30/6.36);
 near(normalizedRodStretch(1,25.44),15/6.36);
 near(normalizedRodStretch(2,25.44),normalizedRodStretch(1,6.36));
 assert.equal(normalizedRodStretch(0,6.36),null);
});
test('Printed empirical coefficients reproduce linear and exponential branches without forcing the prose minimum',()=>{
 near(oxygenBoundary(1),6*Math.exp(-.5)+.0167+13.4);near(oxygenBoundary(100),15.07);
 assert.ok(MINIMUM_STRETCH>10&&MINIMUM_STRETCH<11);
 assert.ok(oxygenBoundary(MINIMUM_STRETCH)>13.6&&oxygenBoundary(MINIMUM_STRETCH)<13.61);
 assert.ok(oxygenBoundary(MINIMUM_STRETCH-1)>oxygenBoundary(MINIMUM_STRETCH));
 assert.ok(oxygenBoundary(MINIMUM_STRETCH+1)>oxygenBoundary(MINIMUM_STRETCH));
});
test('Signed margin derivatives match independent central differences and change flow sign at minimum',()=>{
 for(const U of [.5,2.2048,10]){
  const b=boundaryValue(U,c.rodDiameterMm,c.oxygen),inputs={...c,airflow:U};
  for(const row of b.derivatives){const h=inputs[row.key]*1e-5,plus={...inputs,[row.key]:inputs[row.key]+h},minus={...inputs,[row.key]:inputs[row.key]-h};const derivative=(boundaryValue(plus.airflow,plus.rodDiameterMm,plus.oxygen).oxygenMarginPp-boundaryValue(minus.airflow,minus.rodDiameterMm,minus.oxygen).oxygenMarginPp)/(2*h);near(derivative,row.marginDerivative,1e-8);}
 }
 assert.ok(boundaryValue(.5,6.36,15).derivatives[1].marginDerivative>0);assert.ok(boundaryValue(10,6.36,15).derivatives[1].marginDerivative<0);
});
test('Uncertainty box includes the interior U-shaped minimum instead of only endpoint fits',()=>{
 const x={...c,airflowUncertaintyCmS:.5,diameterUncertaintyMm:.01},u=boundaryUncertainty(x);
 assert.equal(u.status,'bounded');near(u.boundaryOxygenBounds[0],oxygenBoundary(MINIMUM_STRETCH));assert.equal(u.relation,'overlaps_fit');
 for(let i=0;i<=20;i++)for(let j=0;j<=20;j++){
  const U=u.inputBounds.airflow[0]+i*(u.inputBounds.airflow[1]-u.inputBounds.airflow[0])/20,D=u.inputBounds.rodDiameterMm[0]+j*(u.inputBounds.rodDiameterMm[1]-u.inputBounds.rodDiameterMm[0])/20,b=oxygenBoundary(normalizedRodStretch(U,D));
  assert.ok(b>=u.boundaryOxygenBounds[0]-1e-12&&b<=u.boundaryOxygenBounds[1]+1e-12);
 }
});
test('Missing uncertainty stays unknown; out-of-window intervals are not silently clipped',()=>{
 assert.equal(boundaryUncertainty({...c,oxygenUncertaintyPp:null}).status,'unknown');
 assert.equal(boundaryUncertainty({...c,airflowUncertaintyCmS:3}).status,'outside_window');
 assert.equal(boundaryUncertainty({...c,diameterUncertaintyMm:.1}).status,'outside_window');
 const u=boundaryUncertainty({...c,oxygenUncertaintyPp:0,airflowUncertaintyCmS:0,diameterUncertaintyMm:0});assert.equal(u.status,'bounded');assert.equal(u.modelErrorIncluded,false);near(u.marginBoundsPp[0],u.marginBoundsPp[1]);
});
test('Both sides of the fit are reported as positions, never a fire probability',()=>{
 const above=boundaryMatch(corpus,q({...c,oxygen:18})),below=boundaryMatch(corpus,q({...c,oxygen:13.1}));
 assert.equal(above.matches[0].experiment.boundary.nominalPosition,'above_fit');assert.equal(below.matches[0].experiment.boundary.nominalPosition,'below_fit');
 assert.equal(above.matches[0].similarity,null);assert.equal(below.matches[0].similarity,null);
 assert.equal(above.method.weightOrigin,'empirical_boundary_not_weighted_similarity');
});
test('Source, material, established-flame, dilution, oxygen-time and geometry guards reject unsupported use',()=>{
 assert.equal(boundaryMatch(corpus,q()).matches.length,1);
 for(const patch of [{material:'cotton'},{materialVariant:'extruded-pmma'},{flameState:'unignited'},{oxygenBasis:'initial_only'},{oxidizerDiluent:'other'},{flowDirection:'opposed'},{gravityRegime:'earth'},{gravityMs2:3.9},{rodDiameterMm:4},{oxygen:21},{oxygen:null},{airflow:.01}])assert.equal(boundaryMatch(corpus,q({...c,...patch})).matches.length,0,JSON.stringify(patch));
 assert.equal(boundaryMatch({hash:'h',experiments:{boundaryReference:{id:S.fileId,sha256:'changed'}}},q()).matches.length,0);
});
test('Boundary request validates error bounds and semantically distinct state selectors',()=>{
 const r=validateRequest(q(),['PSI-25']);assert.equal(r.method,BOUNDARY_METHOD);assert.equal(r.conditions.oxygenUncertaintyPp,.05);
 for(const patch of [{oxygenUncertaintyPp:-1},{diameterUncertaintyMm:'1'},{flameState:'maybe'},{oxygenBasis:'average'},{oxidizerDiluent:'argon'}])assert.throws(()=>validateRequest(q({...c,...patch}),['PSI-25']));
});
test('Boundary card shows signed distance and review overlap, without similarity risk color',()=>{
 const match=boundaryMatch(corpus,q()).matches[0],card=renderNumericCard({id:'PSI-25',name:'BASS',match});
 assert.match(card,/ΔO₂ percentage points/);assert.match(card,/Boundary overlap/);assert.match(card,/log scale/);assert.ok(!card.includes('score-10'));
 const details=renderNumericDetails(match);assert.match(details,/model uncertainty are excluded/);assert.match(details,/not an ignition or safety decision/);assert.match(details,/not the same/);
});
