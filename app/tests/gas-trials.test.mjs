import test from 'node:test';
import assert from 'node:assert/strict';
import {cfigTrial,CFIG_TABLES} from '../lib/gas-trials.mjs';
import {normalizeTable,materialId} from '../lib/experiment-tables.mjs';
import {compareExperiment,validateWeights,matchExperiments} from '../lib/numeric-matching.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {renderObservations} from '../public/numeric-card.mjs';
import {describeOutcome,comparisonWarnings} from '../public/experiment-comparison.mjs';
import {SYSTEM} from '../lib/gemini.mjs';
const file=kind=>({id:CFIG_TABLES[kind].fileId,sha256:CFIG_TABLES[kind].sha256,name:kind+'.csv'});
const normal={'Flame Type':'Normal',Test:'N1',Fuel:'30% propane','approx p (bar)':'1','XO2 before test':'0.4',Xf:'0.3','Hot ignition':'No','Cool flame?':'yes, PCI-A','burn time (sec)':'35','Self-ext or flow term':'FT',Comments:'direct cool - no hot ignition'};
const inverse={'Flame Type':'Inverse',Test:'I1',Fuel:'butane','approx p (bar)':'1','Xf  before test':'.3',XO2:'.21','Hot ignition':'flash','burn time (sec)':'0','Self -ext or flow term':'SE'};
const csv=c=>Object.keys(c).join(',')+'\n'+Object.values(c).map(v=>'"'+v.replaceAll('"','""')+'"').join(',')+'\n';
const row=kind=>normalizeTable('PSI-159',file(kind),csv(kind==='normal'?normal:inverse)).rows[0];
const conditions={material:'propane',specimenKind:'gas',gasConfiguration:'normal',oxygen:40,fuelPercent:30,pressure:100};
test('Normal CFI-G assigns ambient oxidizer and burner fuel only; initial not final',()=>{
 const r=row('normal');assert.equal(r.values.oxygen,40);assert.equal(r.values.fuelPercent,30);assert.equal(r.values.ambientFuelPercent,undefined);assert.equal(r.values.oxidizerOxygenPercent,undefined);assert.equal(r.evidence.oxygen.basis,'ambient_oxidizer_before_test');assert.equal(r.values.temperatureK,undefined);
});
test('Inverse CFI-G never assigns burner oxygen to ambient oxygen or ambient fuel to supply fuel',()=>{
 const r=row('inverse');assert.equal(r.values.ambientFuelPercent,30);assert.equal(r.values.oxidizerOxygenPercent,21);assert.equal(r.values.oxygen,undefined);assert.equal(r.values.fuelPercent,undefined);assert.equal(r.values.material,'butane');assert.equal(materialId('butane and propane'),null);
});
test('Reviewed source hashes and configuration gate column semantics; invalid fractions stay unknown',()=>{
 assert.equal(cfigTrial(normal,{...file('normal'),sha256:'changed'},2),null);
 assert.equal(cfigTrial({...normal,'Flame Type':'Inverse'},file('normal'),2),null);
 const g=cfigTrial({...normal,Xf:'RAMP','XO2 before test':'1.5'},file('normal'),2);assert.deepEqual(g.values,{});
});
test('Same pressure/fuel family cannot yield general100 with missing configuration or mixture composition',()=>{
 const r=row('normal');assert.equal(compareExperiment(r,conditions,validateWeights({pressure:100})).similarity,null);
 const w=validateWeights({oxygen:50,fuelPercent:50});assert.equal(compareExperiment(r,conditions,w).similarity,100);
 for(const c of [{...conditions,gasConfiguration:''},{...conditions,gasConfiguration:'inverse'},{...conditions,fuelPercent:null}])assert.equal(compareExperiment(r,c,w).similarity,null);
 const near=compareExperiment(r,{...conditions,fuelPercent:15},w);assert.equal(near.similarity,75);
});
test('Explicit arrangement excludes opposite and unreviewed gas arrangements',()=>{
 const a=row('normal'),b=row('inverse');const c={...a,runId:'unknown',gasConfiguration:''};
 const r=matchExperiments({experiments:{rows:[a,b,c]}},{ids:['PSI-159'],conditions,weights:{oxygen:50,fuelPercent:50}});assert.equal(r.matches[0].candidateCount,1);
});
test('Hot no does not mean cool no; blank observation stays unknown and source codes survive',()=>{
 const a=row('normal').observations,b=row('inverse').observations;
 assert.equal(a.hotIgnition,false);assert.equal(a.coolFlame,true);assert.equal(a.terminationCode,'FT');assert.equal(b.hotIgnition,'flash');assert.equal(b.coolFlame,null);assert.equal(b.burnTimeSeconds,0);
 const empty=cfigTrial({...normal,'burn time (sec)':'','Cool flame?':''},file('normal'),2);assert.equal(empty.observations.burnTimeSeconds,null);assert.equal(empty.observations.coolFlame,null);
});
test('CFI-G observations render both in cards and comparison without PMMA stages assumptions; HTML escaped',()=>{
 const r=row('normal');r.observations.sourceComment='<script>alert(1)</script>';assert.match(renderObservations(r),/&lt;script&gt;/);assert.doesNotMatch(renderObservations(r),/<script>/);assert.equal(describeOutcome(r).kind,'reported_cfig_trial');assert.match(describeOutcome(r).label,/Cool flame: Reported/);assert.match(comparisonWarnings([r,row('inverse')]).join(' '),/Normal\/inverse/);
});
test('New concentration fields and uncertainty validate without clipping; bad arrangement rejected',()=>{
 const base={question:'CFI-G',ids:['PSI-159'],conditions:{gravity:'other',gasConfiguration:'inverse',ambientFuelPercent:30,oxidizerOxygenPercent:21,numericUncertainty:{ambientFuelPercent:1,oxidizerOxygenPercent:.5}}};
 const c=validateRequest(base,['PSI-159']).conditions;assert.equal(c.ambientFuelPercent,30);assert.equal(c.numericUncertainty.oxidizerOxygenPercent,.5);
 for(const change of [{ambientFuelPercent:101},{oxidizerOxygenPercent:-1},{gasConfiguration:'premixed'},{numericUncertainty:{ambientFuelPercent:31}}])assert.throws(()=>validateRequest({...base,conditions:{...base.conditions,...change}},['PSI-159']));
});
test('Model contract forbids conflating streams or hot/cool outcomes and supplies concentration units',()=>{
 assert.match(SYSTEM,/Hot ignition false does not mean no cool flame/);assert.match(SYSTEM,/Never exchange ambient and burner concentrations/);
});
