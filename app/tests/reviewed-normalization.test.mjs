import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import {normalizeTable,materialId} from '../lib/experiment-tables.mjs';
import {compareExperiment,matchExperiments,validateWeights} from '../lib/numeric-matching.mjs';
import {renderNumericCard} from '../public/numeric-card.mjs';
import {bassAsRunRows,BASS_ASRUN_SOURCE} from '../lib/bass-asrun.mjs';
import {psi26ReportRows,PSI26_REPORT_SOURCE} from '../lib/psi26-report-evidence.mjs';
import {NORMALIZATION_REVIEW_SOURCES} from '../lib/reviewed-normalization-evidence.mjs';
import {reviewedStudyEvidence} from '../lib/study-evidence.mjs';
import {sourceParameterCandidates,parameterSupport} from '../lib/parameter-support.mjs';
const root=process.env.NORMALIZATION_DATASET_ROOT||'C:/Users/Ahmet Taha/Desktop/Spaceapps/Veri_Seti';
const files=JSON.parse(zlib.gunzipSync(fs.readFileSync(root+'/_app/files.json.gz'))),byId=new Map(files.map(f=>[f.id,f]));
const verified=NORMALIZATION_REVIEW_SOURCES.map(s=>{
 const f=byId.get(s.fileId),bytes=fs.readFileSync(root+'/'+f.path);
 assert.equal(f.sha256,s.sha256);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),s.sha256);return f;
});
const source=id=>byId.get(id),csv=id=>fs.readFileSync(root+'/'+source(id).path,'utf8');
const report=psi26ReportRows(verified),asrun=bassAsRunRows(source('f24955'));
test('exact named SIBAL composite alias preserves Cotton and multi-material adverse cases',()=>{
 assert.equal(materialId('Cotton-Fiberglass (SIBAL)'),'sibal');
 assert.equal(materialId('Cotton'),'cotton');assert.equal(materialId('SIBAL'),'sibal');
 for(const raw of ['PMMA & Nomex','PMMA with cotton','Cotton-Fiberglass (SIBAL) with PMMA','Cotton-Fiberglass'])assert.equal(materialId(raw),null);
});
test('known037mm source ambiguity is quarantined with exact raw source and visible reason',()=>{
 const rows=normalizeTable('PSI-99',source('f51147'),csv('f51147')).rows;
 for(const id of ['2-4','2-5','2-6']){
  const r=rows.find(r=>r.runId===id);assert.equal(r.values.thicknessMm,undefined);assert.equal(r.evidence.thicknessMm,undefined);
  assert.equal(r.normalizationIssues[0].raw,'037 mm');assert.equal(r.normalizationIssues[0].status,'quarantined');
  assert.equal(r.normalizationIssues[0].provenance.fileId,'f51147');
  const compared=compareExperiment(r,{material:r.values.material||'sibal',specimenKind:'sheet',airflow:20,thicknessMm:.37},validateWeights({airflow:50,thicknessMm:50}));
  assert.equal(compared.contributions.find(c=>c.key==='thicknessMm').score,null);
  assert.ok(compared.comparisonWarnings.some(w=>w.includes('037 mm')));
  assert.match(renderNumericCard({id:'PSI-99',name:'TEST',match:{experiment:compared}}),/037 mm/);
 }
 assert.equal(rows.find(r=>r.runId==='2-1').values.thicknessMm,.27);
 assert.equal(rows.find(r=>r.runId==='2-5').values.material,'sibal');
 assert.equal(rows.find(r=>r.runId==='2-7').values.material,undefined);
});
test('PSI26 report is activated only with both exact source hashes and source identities',()=>{
 assert.equal(report.length,11);
 assert.deepEqual(psi26ReportRows(verified.filter(f=>f.id!==PSI26_REPORT_SOURCE.fileId)),[]);
 assert.deepEqual(psi26ReportRows(verified.map(f=>f.id===PSI26_REPORT_SOURCE.fileId?{...f,sha256:'0'.repeat(64)}:f)),[]);
 assert.deepEqual(psi26ReportRows(verified.filter(f=>f.id!==BASS_ASRUN_SOURCE.fileId)),[]);
});
test('report flows are source settings, not AIR conversions or independent stages',()=>{
 assert.equal(new Set(report.map(r=>r.physicalTrialKey)).size,11);
 assert.equal(report.filter(r=>r.values.airflow!==undefined).length,6);
 assert.deepEqual(report.find(r=>r.testId==='5').observations.flowSequenceCmS,[5,3,1.5,1]);
 assert.equal(report.find(r=>r.testId==='5').values.airflow,undefined);
 assert.equal(asrun.find(r=>r.provenance.row===41).instrumentReadings.airDisplay,'5.75, ');
 for(const r of report){
  assert.equal(r.values.material,'sibal');assert.equal(r.jointlyTested,false);
  for(const key of ['oxygen','gravityMs2','temperatureK','arealDensityMgCm2','exposedLengthMm'])assert.equal(r.values[key],undefined);
  assert.equal(r.observations.oxygenPerStage,null);
 }
});
test('linked pressure retains XLSX cell provenance while flow and width retain DOCX provenance',()=>{
 const r=report.find(r=>r.testId==='7');assert.equal(r.values.airflow,10);
 assert.equal(r.evidence.pressure.provenance.fileId,'f24955');assert.equal(r.evidence.pressure.cell,'AB7');
 assert.equal(r.evidence.airflow.provenance.fileId,'f34124');assert.equal(r.evidence.airflow.provenance.xmlRow,3);
 assert.equal(r.evidence.widthMm.sourceUnit,'cm');assert.equal(r.evidence.widthMm.value,20);
 assert.equal(r.originalConstruction.exposedLengthMm,85);assert.equal(r.originalConstruction.arealDensityMgCm2,18);
});
test('22 source records remain11 physical trials in numeric result candidate counts',()=>{
 const keys=new Set(report.map(r=>r.physicalTrialKey));const linked=asrun.filter(r=>keys.has(r.physicalTrialKey));
 assert.equal(linked.length,11);
 const result=matchExperiments({experiments:{rows:[...linked,...report]}},{ids:['PSI-26'],conditions:{material:'sibal',fabricConstruction:'sibal-75-25',specimenKind:'sheet',pressure:98.28525},weights:{pressure:100}});
 assert.equal(result.matches[0].candidateCount,11);assert.equal(result.matches[0].relatedExperiments.length,10);
 assert.equal(result.matches[0].experiment.sourceRecordCount,2);
 assert.ok(Math.abs(result.matches[0].similarity-100)<1e-10);
});
test('PSI68 initial diameter range is marginal and source pinned; model/output diameters are not substituted',()=>{
 const fragments=reviewedStudyEvidence(verified),iso=fragments.find(f=>f.sourceId==='PSI-68'&&f.provenance.row===2);
 assert.deepEqual([iso.parameters.diameterMm.min,iso.parameters.diameterMm.max],[1.5,5]);
 assert.equal(iso.parameters.diameterMm.sourceRole,'initial_condition');assert.equal(iso.parameters.diameterMm.jointlyTested,false);
 const c={experiments:{rows:[],studyEvidence:fragments}};
 const support=parameterSupport(c,'PSI-68',{material:'iso-octane',diameterMm:3},['diameterMm']);
 assert.equal(support.percent,100);assert.equal(support.jointlyTested,false);
 assert.equal(sourceParameterCandidates(c,'PSI-68',{material:'cotton',diameterMm:3},'diameterMm').length,0);
 const wrong=reviewedStudyEvidence(verified.map(f=>f.id==='f36766'?{...f,sha256:'0'.repeat(64)}:f));
 assert.equal(wrong.some(f=>f.sourceId==='PSI-68'),false);
});
test('PSI98 raw O2 range and approximation are retained without unresolved fraction-basis scoring',()=>{
 const fragments=reviewedStudyEvidence(verified),rows=fragments.filter(f=>f.sourceId==='PSI-98');assert.equal(rows.length,2);
 assert.equal(rows[0].unscoredParameters.oxygen.raw,'21.5 - 21.7');assert.equal(rows[1].unscoredParameters.oxygen.approximate,true);
 const c={experiments:{rows:[],studyEvidence:fragments}};assert.equal(sourceParameterCandidates(c,'PSI-98',{material:'sibal',oxygen:21.6},'oxygen').length,0);
});
test('PSI99 derived/time oxygen and PSI10 XO2/Tad remain unscored',()=>{
 const s2=normalizeTable('PSI-99',source('f51147'),csv('f51147')).rows;
 assert.equal(s2.find(r=>r.runId==='2-8').values.oxygen,undefined);
 const gas=normalizeTable('PSI-10',source('f896'),csv('f896')).rows[0];
 assert.equal(gas.values.oxygen,undefined);assert.equal(gas.values.temperatureK,undefined);
});
