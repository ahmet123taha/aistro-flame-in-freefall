import test from 'node:test';
import assert from 'node:assert/strict';
import {numericCloseness,validateWeights,compareExperiment,matchExperiments,DEFAULT_WEIGHTS} from '../lib/numeric-matching.mjs';
import {normalizeTable,parseCsv,materialId} from '../lib/experiment-tables.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {renderNumericCard} from '../public/numeric-card.mjs';
const file={id:'f1',name:'Experimental table.csv',sha256:'a'.repeat(64)};
const row=(values,runId='run-1')=>({sourceId:'PSI-25',runId,values,evidence:{},provenance:{...file,row:2},specimenKind:'sheet',flowDirection:'opposed'});
const request=(conditions,weights)=>({ids:['PSI-25'],conditions,weights});
test('Numerical proximity and weighted contribution use actual values: 3.9 vs 4, weight 20',()=>{
 assert.equal(numericCloseness(3.9,4),97.5);assert.equal(numericCloseness(4,3.9),97.5);
 const r=compareExperiment(row({gravityMs2:4}),{gravityMs2:3.9},DEFAULT_WEIGHTS);
 assert.equal(r.contributions[0].points,19.5);assert.equal(r.similarity,null);
 assert.equal(numericCloseness(0,0),100);assert.equal(numericCloseness(0,4),0);
 for(const x of [NaN,Infinity,-1])assert.equal(numericCloseness(x,4),null);
});
test('Full weighted score requires material and every weighted measurement, never renormalizes missing data',()=>{
 const weights=validateWeights({gravityMs2:20,oxygen:80});
 const r=row({material:'pmma',gravityMs2:4,oxygen:20});
 assert.equal(compareExperiment(r,{material:'pmma',specimenKind:'sheet',gravityMs2:3.9,oxygen:20},weights).similarity,99.5);
 const incomplete=compareExperiment(r,{material:'pmma',specimenKind:'sheet',gravityMs2:3.9},weights);
 assert.equal(incomplete.similarity,null);assert.equal(incomplete.comparableWeight,20);assert.deepEqual(incomplete.scoreRange,{min:19.5,max:99.5});
 assert.equal(compareExperiment(r,{gravityMs2:3.9,oxygen:20},weights).similarity,null);
 assert.throws(()=>validateWeights({oxygen:90,pressure:20}));assert.throws(()=>validateWeights({oxygen:NaN}));assert.throws(()=>validateWeights({unknown:10}));
});
test('Material, geometry and flow gates reject incompatible rows; metadata topics never count',()=>{
 const corpus={hash:'hash',experiments:{rows:[row({material:'pmma',oxygen:20})]},records:[{content:{approach:'temperature gravity oxygen'}}]};
 for(const c of [{material:'nomex',oxygen:20},{material:'pmma',specimenKind:'sheet',oxygen:20,specimenKind:'droplet'},{material:'pmma',specimenKind:'sheet',oxygen:20,flowDirection:'concurrent'},{gravityMs2:3,temperatureK:.001}])assert.equal(matchExperiments(corpus,request(c,{oxygen:100})).matches.length,0);
 const match=matchExperiments(corpus,request({material:'pmma',specimenKind:'sheet',oxygen:10},{oxygen:100})).matches[0];assert.equal(match.similarity,50);
 assert.equal(matchExperiments(corpus,request({material:'pmma',specimenKind:'sheet',oxygen:20},{oxygen:100})).matches[0].similarity,100);
});
test('Ranking never combines values from different runs into a fabricated perfect match',()=>{
 const corpus={hash:'h',experiments:{rows:[row({material:'pmma',oxygen:20,pressure:50},'a'),row({material:'pmma',oxygen:10,pressure:100},'b')]}};
 const m=matchExperiments(corpus,request({material:'pmma',specimenKind:'sheet',oxygen:20,pressure:100},{oxygen:50,pressure:50}));assert.equal(m.matches[0].similarity,75);assert.equal(m.matches.length,1);
});
test('CSV provenance retains physical line numbers, escaped quotes and multiline fields',()=>{
 const parsed=parseCsv('\uFEFFid,text\r\n1,"a\nb"\r\n2,"say ""hi"""\r\n');assert.equal(parsed[0].line,2);assert.equal(parsed[1].line,4);assert.equal(parsed[1].cells.text,'say "hi"');assert.throws(()=>parseCsv('x\n"bad'));
});
test('BASS inputs preserve calibrated oxygen and thickness; fan display and microgravity are not invented measurements',()=>{
 const r=normalizeTable('PSI-25',file,'Test #,Fuel Sample Material,Calibrated  initial O2 % by vol,Initial CO2 % by vol,Air display\nB1,100 micron PMMA film 2 cm wide,22.2,0.44,70\n').rows[0];
 assert.equal(r.values.thicknessMm,.1);assert.equal(r.values.oxygen,22.2);assert.equal(r.values.material,'pmma');assert.equal(r.specimenKind,'sheet');assert.equal(r.values.gravityMs2,undefined);assert.equal(r.values.airflow,undefined);assert.equal(r.provenance.row,2);assert.equal(r.evidence.oxygen.raw,'22.2');
 assert.equal(materialId('PMMA with cotton'),null);assert.equal(materialId('unknown'),null);
});
test('Explicit pressure and mole fraction conversions do not misuse flame temperature as ambient temperature',()=>{
 const flex=normalizeTable('PSI-69',file,'FLEX Test #,Fuel,Ambient pressure; mmHg,O initial ambient composition; mole fraction,Droplet initial diameter; mm\n1,Heptane,760,0.21,3\n').rows[0];assert.ok(Math.abs(flex.values.pressure-101.325)<.001);assert.equal(flex.values.oxygen,21);assert.equal(flex.specimenKind,'droplet');
 const gas=normalizeTable('PSI-10',file,'Test,Flame Type,Fuel,pinit (atm),Xfuel,Tad\n1,Normal,CH4,1,0.5,2100\n').rows[0];assert.equal(gas.values.pressure,101.325);assert.equal(gas.values.fuelPercent,50);assert.equal(gas.values.temperatureK,undefined);
 const approximate=normalizeTable('PSI-159',file,'Test,Fuel,approx p (bar),Peak burner T\n1,CH4,1,1200\n').rows[0];assert.equal(approximate.values.pressure,100);assert.equal(approximate.evidence.pressure.approximate,true);assert.equal(approximate.values.temperatureK,undefined);
 const range=normalizeTable('PSI-159',file,'Test,Fuel,approx p (bar)\n1,CH4,1-2\n');assert.equal(range.rows.length,0);
});
test('Request dimensions cannot be zero; specimen categories and extra units are validated',()=>{
 const q={question:'x',ids:['PSI-107'],conditions:{gravity:'other',material:'pmma',specimenKind:'sheet',specimenKind:'sheet',diameterMm:2}};assert.equal(validateRequest(q).conditions.specimenKind,'sheet');
 for(const c of [{diameterMm:0},{specimenKind:'invented'},{nozzleDiameterMm:-1}])assert.throws(()=>validateRequest({...q,conditions:{...q.conditions,...c}}));
});
test('Numerical card exposes actual input/source/contribution and escapes source text',()=>{
 const experiment=compareExperiment(row({material:'pmma',oxygen:20}),{material:'pmma',specimenKind:'sheet',oxygen:10},validateWeights({oxygen:100}));
 const html=renderNumericCard({id:'PSI-25',name:'<script>x</script>',match:{experiment}});
 assert.match(html,/50%/);assert.match(html,/Contribution/);assert.match(html,/Open source table/);assert.ok(!html.includes('<script>'));assert.ok(!html.includes("Topic relevance"));
});
