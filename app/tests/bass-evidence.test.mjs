import test from 'node:test';
import assert from 'node:assert/strict';
import {BASS_CALIBRATION,BASS_REPORT,bassReportRows} from '../lib/bass-evidence.mjs';
import {normalizeTable} from '../lib/experiment-tables.mjs';
import {compareExperiment,validateWeights,matchExperiments} from '../lib/numeric-matching.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {renderNumericDetails} from '../public/numeric-card.mjs';
const report={id:BASS_REPORT.fileId,sha256:BASS_REPORT.sha256,name:'NASA BASS-II Summary.pdf'};
const rows=bassReportRows(report);
const csv='Test #,Fuel Sample Material,Calibrated  initial O2 % by vol,Air display,Fan display\nB1,PMMA film,22.2,5,62\nB2,PMMA film,22.2,"5, 10",62\nB3,PMMA film,22.2,,62\n';
test('Verified calibration alone does not make AIR a local specimen velocity; retain separate centerline estimate',()=>{
 const file={id:'f24946',sha256:'test',name:'BASS.csv'};
 assert.equal(normalizeTable('PSI-25',file,csv).rows[0].values.airflow,undefined);
 const r=normalizeTable('PSI-25',file,csv,{bassCalibrationVerified:true}).rows;
 assert.equal(r[0].values.airflow,undefined);
 assert.ok(Math.abs(r[0].instrumentReadings.centerlineEstimate.value-5.033)<1e-12);
 assert.equal(r[0].instrumentReadings.centerlineEstimate.calibration.fileId,BASS_CALIBRATION.fileId);
 assert.equal(r[0].instrumentReadings.centerlineEstimate.usableForSpecimenMatching,false);
 assert.equal(r[1].values.airflow,undefined);assert.equal(r[2].values.airflow,undefined);
});
test('Report identity and all 20 trials remain source-bound, with untracked outcomes null',()=>{
 assert.deepEqual(bassReportRows({...report,sha256:'changed'}),[]);
 assert.equal(rows.length,20);assert.equal(new Set(rows.map(r=>r.runId)).size,20);
 assert.equal(rows.filter(r=>r.values.airflow!==undefined).length,5);
 for(const r of rows){assert.equal(r.provenance.page,65);assert.equal(r.provenance.table,'5.1');assert.equal(r.values.material,'pmma');assert.equal(r.flowDirection,'opposed');assert.equal(r.evidence.material.page,64);assert.ok(r.observations.stages.every(x=>x.airflow>0));}
 assert.equal(rows[5].observations.stages[0].spreadRateMmS,null);
 assert.equal(rows[11].observations.stages[1].spreadRateMmS,null);
 assert.equal(rows[0].values.widthMm,22);assert.equal(rows[0].observations.stages[0].spreadRateMmS,.071);
});
test('Multi-stage trials do not acquire averaged velocity or stage-specific oxygen',()=>{
 const m7=rows.find(r=>r.runId==='M7');
 assert.equal(m7.values.airflow,undefined);assert.equal(m7.evidence.oxygen.basis,'whole_trial_initial');
 assert.equal(m7.observations.stages.length,4);
 assert.ok(m7.observations.stages.every(x=>!('oxygen' in x)));
 const c=compareExperiment(m7,{material:'pmma',specimenKind:'sheet',airflow:10},validateWeights({airflow:100}));
 assert.equal(c.similarity,null);assert.equal(c.comparableWeight,0);
});
test('Same material without specimen identity does not receive a complete percentage',()=>{
 const r=rows[0],w=validateWeights({thicknessMm:100});
 assert.equal(compareExperiment(r,{material:'pmma',thicknessMm:1},w).similarity,null);
 assert.equal(compareExperiment(r,{material:'pmma',specimenKind:'sheet',thicknessMm:.9},w).similarity,90);
});
test('Burning sides is an exact experiment filter, not a numerical 1-vs-2 half match',()=>{
 const corpus={hash:'h',experiments:{rows}};
 const q={ids:['PSI-25'],conditions:{material:'pmma',specimenKind:'sheet',burningSides:1,oxygen:22.2,thicknessMm:1,airflow:9},weights:{oxygen:20,thicknessMm:40,airflow:40}};
 const one=matchExperiments(corpus,q).matches[0];assert.equal(one.experimentId,'M1');assert.equal(one.similarity,100);
 const two=matchExperiments(corpus,{...q,conditions:{...q.conditions,burningSides:2}}).matches[0];assert.notEqual(two.experimentId,'M1');assert.equal(two.experiment.burningSides,2);assert.ok(two.similarity<100);
});
test('Burning-side input validation rejects impossible types and non-sheet use',()=>{
 const q={ids:['PSI-107'],question:'x',conditions:{gravity:'other',specimenKind:'sheet',burningSides:2}};
 assert.equal(validateRequest(q).conditions.burningSides,2);
 for(const patch of [{burningSides:3},{burningSides:'1'},{specimenKind:'gas'}])assert.throws(()=>validateRequest({...q,conditions:{...q.conditions,...patch}}));
});
test('Observed spread is labelled separately from proximity, with source page and missing result visible',()=>{
 const experiment=compareExperiment(rows[5],{material:'pmma',specimenKind:'sheet',thicknessMm:1},validateWeights({thicknessMm:100}));
 const html=renderNumericDetails({experiment});assert.match(html,/PDF page 65/);assert.match(html,/Not tracked/);assert.match(html,/not a prediction/);assert.match(html,/Initial O₂/);assert.ok(!html.includes("CSV row"));
});
