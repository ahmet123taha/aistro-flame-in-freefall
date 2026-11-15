import test from 'node:test';
import assert from 'node:assert/strict';
import {gasStoichiometry,gasStoichiometricMatch,GAS_METHOD,GAS_FORMULA_SOURCE,CFIG_REPORT,ATOMIC_MASS} from '../lib/gas-stoichiometry.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {normalizeTable} from '../lib/experiment-tables.mjs';
import {CFIG_TABLES} from '../lib/gas-trials.mjs';
import {renderGasPhysics} from '../public/gas-physics-card.mjs';
import {renderNumericCard} from '../public/numeric-card.mjs';
import {SYSTEM} from '../lib/gemini.mjs';
const near=(a,b,e=1e-9)=>assert.ok(Math.abs(a-b)<=e,`${a} != ${b}`);
const file={id:'f12313',sha256:CFIG_TABLES.normal.sha256,name:'CFI-G.csv'};
const row=normalizeTable('PSI-159',file,'Flame Type,Test,Fuel,Xf,XO2 before test,approx p (bar),Zst\nNormal,N1,ethane,.3,.4,1,.27\n').rows[0];
const corpus={hash:'local',experiments:{rows:[row],gasModelSources:{verified:true,sources:[GAS_FORMULA_SOURCE,CFIG_REPORT]}}};
const q={method:GAS_METHOD,ids:['PSI-159'],question:'CFI-G',conditions:{gravity:'other',material:'ethane',specimenKind:'gas',gasConfiguration:'normal',gasDiluent:'nitrogen',fuelPercent:30,oxygen:40}};
test('Zst equals independent mass balance of stoichiometric stream quantities',()=>{
 for(const [id,c,h] of [['ethane',2,6],['propane',3,8],['butane',4,10]])for(const xf of [.12,.5,1])for(const xo of [.15,.4,1]){
  const fuelMoles=1,oxygenMoles=c+h/4,mf=c*ATOMIC_MASS.C+h*ATOMIC_MASS.H,mn=2*ATOMIC_MASS.N,mo=2*ATOMIC_MASS.O;
  const fuelStreamMass=fuelMoles*mf+(1/xf-1)*mn,oxidizerStreamMass=oxygenMoles*(mo+(1/xo-1)*mn);
  near(gasStoichiometry(id,100*xf,100*xo).zst,fuelStreamMass/(fuelStreamMass+oxidizerStreamMass));
 }
});
test('Source formula derivatives match central finite differences and concentration directions',()=>{
 for(const id of ['ethane','propane','butane'])for(const x of [10,30,75]){
  const z=gasStoichiometry(id,x,40),eps=1e-5;
  const ef=(gasStoichiometry(id,x+eps,40).zst-gasStoichiometry(id,x-eps,40).zst)/(2*eps)*x/z.zst;
  const eo=(gasStoichiometry(id,x,40+eps).zst-gasStoichiometry(id,x,40-eps).zst)/(2*eps)*40/z.zst;
  near(z.elasticities.fuelPercent,ef,1e-7);near(z.elasticities.oxygenPercent,eo,1e-7);assert.ok(ef<0&&eo>0);near(Object.values(z.effectShares).reduce((a,b)=>a+b),100);
 }
});
test('Zero, absent, out-of-domain and unsupported material never produce physical match',()=>{
 for(const [f,o] of [[0,20],[20,0],[101,20],[-1,20],[null,20],[20,NaN]])assert.equal(gasStoichiometry('ethane',f,o),null);
 assert.equal(gasStoichiometry('pmma',10,20),null);
 for(const change of [{gasDiluent:''},{gasDiluent:'other'},{specimenKind:'sheet'},{gasConfiguration:''},{fuelPercent:0}])assert.equal(gasStoichiometricMatch(corpus,{...q,conditions:{...q.conditions,...change}}).matches.length,0);
 assert.equal(gasStoichiometricMatch({...corpus,experiments:{...corpus.experiments,gasModelSources:{verified:false}}},q).matches.length,0);
});
test('Calculated source feature and reported source Zst stay separate, with provenance',()=>{
 const r=gasStoichiometricMatch(corpus,q).matches[0].experiment;near(r.similarity,100);assert.equal(r.gasPhysics.reportedZst,.27);assert.notEqual(r.gasPhysics.sourceCalculation.zst,.27);assert.equal(r.gasChemistry.evidence.row,2);assert.equal(r.contributions[0].status,'derived');
 assert.ok(gasStoichiometricMatch(corpus,{...q,conditions:{...q.conditions,fuelPercent:15}}).matches[0].similarity<100);
});
test('Equal Zst with different concentrations is not full condition equivalence',()=>{
 const base=gasStoichiometry('ethane',30,40),fuel=gasStoichiometry('ethane',15,40),targetYo=fuel.stoichiometricOxygenMassRatio*fuel.fuelMassFraction*base.zst/(1-base.zst);
 const xo=targetYo*(2*ATOMIC_MASS.N)/(2*ATOMIC_MASS.O-targetYo*(2*ATOMIC_MASS.O-2*ATOMIC_MASS.N));
 const alt=gasStoichiometry('ethane',15,100*xo);near(base.zst,alt.zst);assert.notEqual(100*xo,40);
 const r=gasStoichiometricMatch(corpus,{...q,conditions:{...q.conditions,fuelPercent:15,oxygen:100*xo}}).matches[0].experiment;near(r.similarity,100);assert.ok(r.contributions[1].score<100);assert.match(r.gasPhysics.limitation,/Different compositions/);
});
test('Normal and inverse arrangement map correct stream columns; no ambient/burner swap',()=>{
 const inv={...row,gasConfiguration:'inverse',values:{material:'ethane',ambientFuelPercent:30,oxidizerOxygenPercent:40}};
 const r=gasStoichiometricMatch({...corpus,experiments:{...corpus.experiments,rows:[inv]}},{...q,conditions:{...q.conditions,gasConfiguration:'inverse',ambientFuelPercent:30,oxidizerOxygenPercent:40,fuelPercent:99,oxygen:1}}).matches[0];near(r.similarity,100);assert.deepEqual(r.experiment.gasPhysics.keys,['ambientFuelPercent','oxidizerOxygenPercent']);
});
test('New method validates independently from irrelevant numerical weights and unknown diluent',()=>{
 const valid=validateRequest({...q,weights:{oxygen:200}},['PSI-159']);assert.equal(valid.method,GAS_METHOD);assert.equal(valid.conditions.gasDiluent,'nitrogen');
 assert.throws(()=>validateRequest({...q,conditions:{...q.conditions,gasDiluent:'argon'}},['PSI-159']));
});
test('Gas card and model context label composition feature, local effects and unknown physics',()=>{
 const match=gasStoichiometricMatch(corpus,q).matches[0];assert.match(renderGasPhysics(match.experiment),/Stoichiometric|stoichiometric/);assert.match(renderNumericCard({id:'PSI-159',name:'CFI-G',match}),/Zst closeness/);assert.match(SYSTEM,/Equal Zst can occur with different feed compositions/);assert.match(SYSTEM,/NOT general risk weights/);
});
