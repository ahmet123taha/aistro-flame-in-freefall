import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {loadDataset} from '../lib/dataset.mjs';
import {matchExperiments} from '../lib/numeric-matching.mjs';
import {comparisonCandidates,createComparisonSnapshot,describeOutcome,renderExperimentComparison} from '../public/experiment-comparison.mjs';
import {VERSION} from '../lib/version.mjs';
const dataset=await loadDataset(process.argv[2]);
const request={ids:['PSI-25'],conditions:{gravity:'other',material:'sibal',specimenKind:'sheet',fabricConstruction:'sibal-75-25',oxygen:17.4},weights:{oxygen:100}};
const result=matchExperiments(dataset.corpus,request),candidates=comparisonCandidates(result);
const chosen=['GMT175-T18','GMT175-T9','GMT178-T17'];
const keys=chosen.map(id=>[...candidates].find(([,r])=>r.runId===id)?.[0]);assert.ok(keys.every(Boolean));
const snapshot=createComparisonSnapshot({keys,response:result,request,records:dataset.corpus.records});
assert.deepEqual(snapshot.rows.map(r=>describeOutcome(r).kind),['quenching','no_ignition','no_blowoff']);
assert.equal(snapshot.rows[0].values.airflow,undefined);assert.equal(snapshot.rows[1].values.airflow,10);assert.equal(snapshot.rows[2].values.airflow,undefined);
assert.equal(snapshot.rows[0].similarity,100);assert.ok(snapshot.rows[1].similarity<100);
for(const row of snapshot.rows){const source=await dataset.file(row.provenance.fileId);try{assert.equal(source.row.sha256,row.provenance.sha256);}finally{await source.handle.close();}}
assert.match(renderExperimentComparison(snapshot),/initial → final/);
const record={version:VERSION,at:new Date().toISOString(),passed:true,providerCalls:0,chosenRows:chosen,observations:snapshot.rows.map(r=>describeOutcome(r).kind),snapshot,checks:['source files rehashed','same investigation supports separate trial selection','different observed mechanisms preserved','changing flow has no fabricated single velocity','source nominal oxygen semantics visible','full inputs/weights/dataset identity retained','no provider call'],limits:['selected rows not independent risk-validation sample','snapshot is source-backed descriptive comparison, not causal test','unknown source errors and unresolved duplicate identities outside pinned pairs']};
await writeFile('qa/comparison-dataset-verification-'+VERSION+'.json',JSON.stringify(record,null,2));console.log(JSON.stringify({passed:true,runs:chosen,outcomes:record.observations,providerCalls:0}));
