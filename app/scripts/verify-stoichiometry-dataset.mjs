import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {loadDataset} from '../lib/dataset.mjs';
import {matchExperiments} from '../lib/numeric-matching.mjs';
import {gasStoichiometry,GAS_METHOD,GAS_FORMULA_SOURCE,CFIG_REPORT} from '../lib/gas-stoichiometry.mjs';
import {VERSION} from '../lib/version.mjs';
const ds=await loadDataset(process.argv[2]);assert.ok(ds.corpus.experiments.gasModelSources.verified);
const rows=ds.corpus.experiments.rows.filter(r=>r.sourceId==='PSI-159'),checks=[];
for(const r of rows){
 const [fk,ok]=r.gasConfiguration==='normal'?['fuelPercent','oxygen']:['ambientFuelPercent','oxidizerOxygenPercent'];
 const model=gasStoichiometry(r.values.material,r.values[fk],r.values[ok]);
 const reported=r.gasChemistry.reportedZst;
 if(model&&reported!==null)checks.push({run:r.runId,row:r.provenance.row,fileId:r.provenance.fileId,reported,calculated:model.zst,difference:model.zst-reported});
 else assert.equal(r.values[fk],0);
}
assert.equal(checks.length,331);assert.equal(rows.length-checks.length,2);
const maxAbsDifference=Math.max(...checks.map(r=>Math.abs(r.difference)));assert.ok(maxAbsDifference<.00004); // Snapshot consistency, not a physical accuracy tolerance.
const conditions={gravity:'other',material:'butane',specimenKind:'gas',gasConfiguration:'normal',gasDiluent:'nitrogen',fuelPercent:25,oxygen:39.57};
const q={method:GAS_METHOD,ids:['PSI-159'],conditions,question:'Bütan karışım yapısını ve derişimlerin etkisini açıkla.'};
const m=matchExperiments(ds.corpus,q);assert.equal(m.matches[0].experimentId,'21102A1');assert.ok(Math.abs(m.matches[0].similarity-100)<1e-10);
const model=m.matches[0].experiment.gasPhysics.calculated;assert.ok(model.elasticities.fuelPercent<0&&model.elasticities.oxygenPercent>0);
const unknown=matchExperiments(ds.corpus,{...q,conditions:{...conditions,gasDiluent:''}});assert.equal(unknown.matches.length,0);
const c=await ds.context(q),r=c.records[0];assert.match(r.content.fileText,/"gasPhysics":/);assert.match(r.content.fileText,/"reportedZst":0.226286935/);assert.match(r.content.fileText,/"sourceCalculation":/);assert.ok([GAS_FORMULA_SOURCE,CFIG_REPORT].every(s=>r.fileSources.some(f=>f.id===s.fileId&&f.sha256===s.sha256&&f.gasModelSource)));
const result={version:VERSION,passed:true,at:new Date().toISOString(),sourceDocuments:[GAS_FORMULA_SOURCE,CFIG_REPORT],sourceRows:333,recomputedAndReported:331,excludedNoFuel:2,maxAbsDifference,comparisonMeaning:'nominal N2 recomputation vs reported source Zst; consistency, not independent validation',example:{run:m.matches[0].experimentId,similarity:m.matches[0].similarity,model},providerCalls:0,checks:['331 source Zst values compared with independent chemistry conversion','2 zero-fuel rows excluded, no inventedZst','butane25pct/oxygen39.57pct selects21102A1','unknown diluent prevents physical matching','formula and dilution report readback hashes verified in context','reported and recomputed values remain separate'],sourceComparison:checks};
await writeFile('qa/stoichiometry-dataset-verification-'+VERSION+'.json',JSON.stringify(result,null,2));console.log(JSON.stringify({...result,sourceComparison:undefined}));
