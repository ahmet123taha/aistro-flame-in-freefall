import test from 'node:test';
import assert from 'node:assert/strict';
import {nomexReportRows,NOMEX_SOURCE,NOMEX_CSV,linkNomexTrials} from '../lib/nomex-evidence.mjs';
import {normalizeTable} from '../lib/experiment-tables.mjs';
import {compareExperiment,matchExperiments,validateWeights} from '../lib/numeric-matching.mjs';
import {validateRequest} from '../lib/corpus.mjs';
import {renderNumericDetails,renderObservations} from '../public/numeric-card.mjs';
const report={id:NOMEX_SOURCE.fileId,sha256:NOMEX_SOURCE.sha256,name:'BASS-II report'};
const csvFile={id:NOMEX_CSV.fileId,sha256:NOMEX_CSV.sha256,name:'BASS-II.csv'};
const csv='Test #,Sample #,Fuel Sample Material,Calibrated  initial O2 % by vol,Initial CO2 % by vol,Air display,Flow restrictor\nF1,227,Nomex natural (nomex III),22.2,0.46,9.5,2\nF2,228m,Nomex natural (nomex III),21,0.37,15,2\nF3,229m,Nomex natural (nomex III),21.7,0.36,8,1\n';
const pdf=()=>nomexReportRows(report),tab=()=>normalizeTable('PSI-25',csvFile,csv,{bassCalibrationVerified:true}).rows;
const c={gravity:'other',material:'nomex',materialSpecification:'nomex-iii-natural',specimenKind:'sheet',oxygen:22.2,co2Percent:.46};
const w=validateWeights({oxygen:80,co2Percent:20});
test('Nomex adapter is pinned and retains three source sample identities without invented dimensions',()=>{
 assert.equal(pdf().length,3);assert.deepEqual(nomexReportRows({...report,sha256:'bad'}),[]);
 assert.deepEqual(pdf().map(r=>r.sampleId),['227','228m','229m']);
 for(const r of pdf()){assert.equal(r.provenance.page,113);assert.equal(r.provenance.table,'A.2');for(const k of ['airflow','thicknessMm','temperatureK','gravityMs2','pressure','arealDensityMgCm2'])assert.equal(r.values[k],undefined);}
});
test('Nomex no-sustained-flame preserves brief ignition, unknowns, and conflicting summary',()=>{
 const r=pdf();assert.ok(r.every(x=>x.observations.outcome==='no_sustained_flame'));
 assert.deepEqual(r.map(x=>x.observations.briefIgnition),[true,null,true]);
 assert.equal(r[0].observations.spread,false);assert.equal(r[0].observations.igniterOnAtExtinction,true);
 assert.match(r[0].observations.sourceDiscrepancy,/PDF 54/);assert.match(r[0].observations.sourceDiscrepancy,/PDF 113/);
});
test('F3 printed final O2 is retained as disputed text, not measurement or extinction limit',()=>{
 const r=pdf()[2];assert.equal(r.values.oxygen,21.7);assert.equal(r.evidence.oxygen.basis,'whole_trial_initial');
 assert.equal(r.observations.finalOxygen,null);assert.equal(r.observations.printedFinalOxygen,.9);
 assert.match(r.observations.limitations.join(' '),/CSV also says none/);
 assert.match(renderObservations(r),/Not measured/);
});
test('Nomex needs source product name; unknown grade and differing material cannot yield full score',()=>{
 const r=pdf()[0];assert.equal(compareExperiment(r,c,w).similarity,100);
 assert.equal(compareExperiment(r,{...c,oxygen:21},w).similarity,80*21/22.2+20);
 for(const change of [{materialSpecification:''},{materialSpecification:'other'},{material:'pmma'}])assert.equal(compareExperiment(r,{...c,...change},w).similarity,null);
 assert.throws(()=>validateRequest({ids:['PSI-25'],question:'x',conditions:{...c,materialSpecification:'invented'}},['PSI-25']),/materialSpecification/);
 assert.equal(validateRequest({ids:['PSI-25'],question:'x',conditions:c},['PSI-25']).conditions.materialSpecification,'nomex-iii-natural');
});
test('Nomex identical CSV and report are linked only with exact source and sample identity',()=>{
 const rows=[...tab(),...pdf()],links=linkNomexTrials(rows);assert.equal(links.length,3);
 assert.equal(new Set(rows.map(x=>x.physicalTrialKey)).size,3);
 const changed=[...tab(),...pdf()];changed[0].sampleId='different';assert.equal(linkNomexTrials(changed).length,2);
 const bad=[...tab(),...pdf()];bad[0].provenance.sha256='different';assert.equal(linkNomexTrials(bad).length,2);
});
test('Conflicting document values are not silently linked or merged',()=>{
 const rows=[...tab(),...pdf()];rows[0].values.oxygen=20;
 const links=linkNomexTrials(rows);assert.equal(links[0].status,'values_disagree_not_linked');assert.equal(rows[0].physicalTrialKey,undefined);assert.equal(rows[3].physicalTrialKey,undefined);
});
test('Matching chooses detailed observation once per physical trial, keeps other provenance separately',()=>{
 const rows=[...tab(),...pdf()];linkNomexTrials(rows);
 const m=matchExperiments({hash:'h',experiments:{rows}},{ids:['PSI-25'],conditions:c,weights:w}).matches[0];
 assert.equal(m.candidateCount,3);assert.equal(m.relatedExperiments.length,2);assert.equal(m.experimentId,'F1');
 assert.equal(m.experiment.provenance.fileId,NOMEX_SOURCE.fileId);assert.equal(m.experiment.linkedSourceRows[0].provenance.fileId,NOMEX_CSV.fileId);
 assert.equal(m.experiment.observations.briefIgnition,true);
 const filtered=matchExperiments({hash:'h',experiments:{rows}},{ids:['PSI-25'],conditions:{...c,flowDirection:'concurrent'},weights:w}).matches[0];
 assert.equal(filtered.experiment.linkedSourceRows.length,1);assert.equal(filtered.experiment.linkedSourceRows[0].provenance.fileId,NOMEX_CSV.fileId);
 const html=renderNumericDetails(m);assert.match(html,/same physical trial/);assert.match(html,/independent repeats/);assert.match(html,/Instrument readings/);assert.match(html,/PDF page 113/);
});
test('Unverified AIR conversion cannot close missing weighted coverage or create a flow-only match',()=>{
 const r=tab()[0],q={...c,airflow:9.5627};
 const m=compareExperiment(r,q,validateWeights({oxygen:60,airflow:40}));assert.equal(m.comparableWeight,60);assert.equal(m.similarity,null);
 assert.equal(r.instrumentReadings.centerlineEstimate.value,9.5627);
 assert.equal(matchExperiments({hash:'h',experiments:{rows:tab()}},{ids:['PSI-25'],conditions:q,weights:{airflow:100}}).matches.length,0);
});
