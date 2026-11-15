import test from 'node:test';
import assert from 'node:assert/strict';
import {BASS_ASRUN_SOURCE,bassAsRunRows} from '../lib/bass-asrun.mjs';
import {normalizeTable} from '../lib/experiment-tables.mjs';
import {scoreResearch} from '../lib/research-scoring.mjs';
import {researchCards} from '../public/environment-panel.mjs';
const file={id:BASS_ASRUN_SOURCE.fileId,sha256:BASS_ASRUN_SOURCE.sha256,name:'As Run_Test Matrix.xlsx'};
const rows=bassAsRunRows(file),assessment={sourceId:'PSI-26',reason:'TEST ONLY source relevance.',quote:'TEST',limitation:'Not a burn prediction.',rubric:{objective:1,setting:1,material:1,mechanism:.5}};
const corpus={records:[{id:'PSI-26',title:'BASS'}],experiments:{rows}},fields=['gravityMs2','temperatureK','oxygen','pressure','airflow','thicknessMm'];
const rank=conditions=>scoreResearch(corpus,{conditions},{assessments:[assessment]},fields).matches[0];

test('PSI-26 pressure rows retain run/cell provenance and atmosphere conversion',()=>{
 assert.equal(rows.length,121);assert.equal(new Set(rows.map(r=>r.runId)).size,121);
 const r=rows.find(r=>r.provenance.row===4);assert.equal(r.sourceRun,'1');assert.equal(r.values.material,'sibal');assert.equal(r.values.pressure,98.28525);
 assert.equal(r.evidence.pressure.raw,'0.97');assert.equal(r.evidence.pressure.factor,101.325);assert.equal(r.evidence.pressure.cell,'AB4');assert.equal(r.provenance.sheet,'as run matrix');
 const f=rows.find(r=>r.provenance.row===12);assert.equal(f.evidence.pressure.sourceFormula,'752.5/760');assert.equal(f.evidence.pressure.cacheChecked,true);assert.ok(Math.abs(f.values.pressure-752.5/760*101.325)<1e-11);
});
test('PSI-26 does not turn fractional oxygen, camera values or AIR settings into scored conditions',()=>{
 for(const r of rows){assert.deepEqual(Object.keys(r.values).filter(k=>k!=='material'),['pressure']);assert.equal(r.instrumentReadings.specimenFlowVerified,false);assert.equal(r.unscoredSourceValues.oxygen.status,'unit_scale_unresolved');}
 assert.equal(rows[0].unscoredSourceValues.oxygen.raw,'0.221');assert.equal(rows[0].instrumentReadings.airDisplay,'10, 5');
 assert.equal(rows.some(r=>r.values.gravityMs2===.16),false);
});
test('PSI-26 derivative cannot activate with a different source hash or planned workbook',()=>{
 assert.deepEqual(bassAsRunRows({...file,sha256:'0'.repeat(64)}),[]);assert.deepEqual(bassAsRunRows({...file,id:'f24959'}),[]);
 assert.ok(rows.every(r=>r.provenance.worksheet==='xl/worksheets/sheet1.xml'));
});
test('PSI-26 sample inventory is not falsely reported as rejected numerical measurements',()=>{
 const p=normalizeTable('PSI-26',{id:'f24956'},'Date,As Run Test #,Fuel Sample Material\n2012,1,SIBAL 2 cm\n');
 assert.equal(p.inputRows,1);assert.equal(p.rejected,0);assert.deepEqual(p.rows,[]);assert.match(p.disposition,/inventory/);
});
test('PSI-26 exact reported pressure compares without inventing gravity, temperature or oxygen',()=>{
 const m=rank({material:'sibal',pressure:98.28525,gravityMs2:.2,temperatureK:300,oxygen:22.1});
 assert.equal(m.coverage.provided,4);assert.equal(m.coverage.compared,1);assert.ok(Math.abs(m.numericPoints-15)<1e-10);assert.equal(m.numericStatus,'partial');assert.equal(m.unscoredPoints,45);assert.equal(m.assessedMaxPoints,55);
 assert.equal(m.trial.contributions.find(c=>c.key==='gravityMs2').score,null);assert.equal(m.trial.contributions.find(c=>c.key==='oxygen').score,null);
 const html=researchCards({matches:[m]},corpus.records);assert.match(html,/\/ 55 assessed points/);assert.match(html,/Overall match incomplete/);assert.match(html,/Oxygen heading says/);assert.doesNotMatch(html,/\/ 100 points/);
});
test('scenario-only evidence is shown out of 40 assessed points, not a low full physical match',()=>{
 const m=rank({gravityMs2:.2,temperatureK:300,oxygen:22.1,airflow:0});assert.equal(m.coverage.compared,0);assert.equal(m.assessedMaxPoints,40);assert.equal(m.total,35);
 const html=researchCards({matches:[m]},corpus.records);assert.match(html,/35.0<small>\/ 40 assessed points/);assert.match(html,/60.0 points remain unassessed/);
});
test('blank inputs are excluded, while actual zero-proximity measurements keep their assessed budget',()=>{
 assert.ok(Math.abs(rank({pressure:98.28525,gravityMs2:null}).numericPoints-60)<1e-10);assert.equal(rank({pressure:98.28525}).assessedMaxPoints,100);
 const c={...corpus,experiments:{rows:[{...rows[0],values:{material:'sibal',airflow:2}}]}};
 const m=scoreResearch(c,{conditions:{airflow:0}},{assessments:[assessment]},fields).matches[0];assert.equal(m.numericPoints,0);assert.equal(m.assessedMaxPoints,100);assert.equal(m.numericStatus,'complete');
});
test('0.16 to 0.2 m/s2 is computed only if a row really reports numeric gravity',()=>{
 const c={...corpus,experiments:{rows:[{...rows[0],values:{gravityMs2:.16,temperatureK:300,oxygen:21,pressure:100}}]}};
 const m=scoreResearch(c,{conditions:{gravityMs2:.2,temperatureK:300,oxygen:21,pressure:100}},{assessments:[assessment]},fields).matches[0];assert.ok(Math.abs(m.numericPoints-57)<1e-10);assert.equal(m.trial.contributions.find(c=>c.key==='gravityMs2').score,80);assert.equal(m.numericStatus,'complete');
 // This synthetic row tests arithmetic, not the actual PSI-26 gravity or physical transfer.
});
