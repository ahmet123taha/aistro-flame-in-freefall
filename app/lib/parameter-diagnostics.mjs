import {sourceParameterCandidates} from './parameter-support.mjs';
import {materialRelation} from './research-coverage.mjs';
import {sourceMaterialReview} from './material-evidence-review.mjs';
import {canonicalMaterial} from './material-identity.mjs';
const units={gravityMs2:'m/s2',temperatureK:'K',oxygen:'% vol',pressure:'kPa',airflow:'cm/s',thicknessMm:'mm'};
const compact=(candidate,input,credited)=>candidate?{kind:candidate.kind,value:candidate.observed??null,range:candidate.range||null,withinSpan:candidate.withinSpan??null,material:candidate.material||null,runId:candidate.runId||null,evidence:candidate.evidence||null,provenance:candidate.provenance,approximate:Boolean(candidate.approximate),credited,absoluteDifference:Number.isFinite(candidate.observed)?Math.abs(input-candidate.observed):null,arithmeticProximity:credited?candidate.score:null}:null;
export function parameterDiagnostics(corpus,sourceId,conditions,fields,support){
 const rows=(corpus.experiments?.rows||[]).filter(r=>r.sourceId===sourceId),fragments=(corpus.experiments?.studyEvidence||[]).filter(r=>r.sourceId===sourceId);
 const materials=[...new Set([...rows.map(r=>r.values.material),...fragments.map(r=>r.material)].filter(Boolean))];
 const sameMaterialRows=rows.filter(r=>!conditions.material?.trim()||materialRelation(conditions.material,r.values.material)==='same_family');
 const materialReview=sourceMaterialReview(corpus,sourceId,conditions);
 const sourceGravityContext=fragments.filter(f=>f.parameters?.gravityMs2?.sourceRole==='nominal_gravity_setting').map(f=>({material:f.material,nominalSettingsMs2:f.parameters.gravityMs2.values,raw:f.parameters.gravityMs2.raw,provenance:f.provenance,meaning:'Explicit source figure labels, not measured residual acceleration; no identical burning behavior is implied.'}));
 const preferred=sameMaterialRows.length?sameMaterialRows:rows;
 const comparisons=fields.filter(key=>Number.isFinite(conditions[key])).map(key=>{
  const accepted=sourceParameterCandidates(corpus,sourceId,conditions,key).filter(c=>(Boolean(conditions.material?.trim())||Boolean(canonicalMaterial(c.material)))&&(support.selectedSourceMaterial==null||canonicalMaterial(c.material)===support.selectedSourceMaterial)),all=sourceParameterCandidates(corpus,sourceId,conditions,key,{sameMaterialOnly:false});
  const related=all.filter(c=>materialReview.compositeReferences.some(r=>canonicalMaterial(r.material)===canonicalMaterial(c.material)));
  const used=accepted[0],discrete=accepted.find(c=>c.kind!=='reported_marginal_span'),context=used?null:(related[0]||all[0]),contribution=support.contributions.find(c=>c.key===key);
  const raw=[];let reasonCode='comparable',reason='A supported same-material source reference is used by the existing matching rule.';
  if(used&&!conditions.material?.trim()){reasonCode='material_not_supplied';reason='The source value is compared, but material identity was not supplied and remains unverified.';}
  if(used?.evidence?.sourceRole==='nominal_gravity_setting'){reasonCode='nominal_setting';reason='Compared with the explicit 0-g / 1-g figure labels. This is nominal gravity-setting proximity, not a measured residual acceleration or demonstrated equivalent burning behavior.';if(!conditions.material?.trim())reason+=' Your material was not supplied and its identity remains unverified.';}
  if(!used){
   reasonCode='source_value_not_indexed';reason='No comparable value for this parameter is indexed for this study. This is not proof that the entire report lacks the information.';
   if(all.length){reasonCode=all.every(c=>!c.material)?'source_material_unidentified':'material_not_matched';reason=related.includes(context)?`The closest indexed reference within the verified related composite is SIBAL, a cotton–fiberglass composite. Its ${materialReview.canonical} content makes this related literature, but it is not a pure-${materialReview.canonical} measurement. The value is shown for review, without transferring its score.`:'Indexed parameter values belong to another or unidentified source material. They are shown as context only and earn no points for the supplied material.';if(context?.evidence?.sourceRole==='nominal_gravity_setting')reason+=' The source labels this as a nominal gravity setting, not measured residual acceleration.';}
   else if(key==='oxygen'){
    for(const r of preferred){const x=r.unscoredSourceValues?.oxygen;if(x&&raw.length<2&&!raw.some(y=>y.raw===String(x.raw)))raw.push({kind:'unresolved_unit',raw:String(x.raw),unit:x.heading||'unresolved',material:r.values.material||r.materialLabel||null,reason:'The stored oxygen scale is unresolved; this is a raw example, not a nearest physical value.',provenance:r.provenance,cell:x.cell});}
    for(const f of fragments.filter(f=>!conditions.material?.trim()||materialRelation(conditions.material,f.material)==='same_family')){const x=f.unscoredParameters?.oxygen;if(x&&raw.length<2&&!raw.some(y=>y.raw===String(x.raw)))raw.push({kind:'unresolved_unit',raw:String(x.raw),unit:x.sourceUnit||'unresolved oxygen basis',material:f.material,reason:f.text,provenance:f.provenance});}
    if(raw.length){reasonCode='source_unit_unresolved';reason='Oxygen entries exist, but their unit scale, fraction basis or synchronization is unresolved. No nearest percentage or proximity can be computed.';}
   }else if(key==='airflow'){
    for(const r of preferred){const x=r.instrumentReadings;if(x?.airDisplay!=null&&raw.length<2&&!raw.some(y=>y.raw===String(x.airDisplay)))raw.push({kind:'instrument_setting',raw:String(x.airDisplay),unit:'AIR instrument display, not cm/s',material:r.values.material||r.materialLabel||null,reason:'Not verified local specimen gas velocity. This is a raw example, not a nearest velocity.',provenance:r.provenance});}
    if(raw.length){reasonCode='instrument_setting_not_velocity';reason='AIR instrument readings exist, but are not verified velocity around the specimen. They are not compared with your cm/s input.';}
   }else if(key==='gravityMs2'){
    reasonCode='numeric_gravity_not_indexed';reason='No numerical gravitational acceleration is indexed. A qualitative microgravity description cannot be converted to zero g or another acceleration.';
   }else if(key==='temperatureK'){
    reasonCode='ambient_temperature_not_indexed';reason='No source ambient-temperature input is indexed. Specimen/heating/third-party property temperatures do not replace an ambient measurement.';
   }
   const quarantined=preferred.flatMap(r=>(r.normalizationIssues||[]).filter(x=>x.parameter===key&&x.status==='quarantined').map(x=>({...x,material:r.values.material||null})));
   if(quarantined.length){const x=quarantined[0];reasonCode='source_value_quarantined';reason=x.reason;raw.push({kind:'quarantined_source_value',raw:String(x.raw),unit:units[key],material:x.material,reason:x.reason,provenance:x.provenance});}
  }
  return {key,unit:units[key],input:conditions[key],status:used?'compared':'unassessed',reasonCode,reason,usedReference:compact(used,conditions[key],true),nearestReportedReference:compact(discrete,conditions[key],false),contextOnlyReference:compact(context,conditions[key],false),rawExamples:raw,weight:contribution?.weight||0,awardedPoints:contribution?.points||0};
 });
 const blankInputs=fields.filter(k=>!Number.isFinite(conditions[k]));
 const unusedSourceParameters=blankInputs.flatMap(key=>{const values=[...rows.map(r=>r.values[key]),...fragments.flatMap(f=>{const p=f.parameters[key];return p?.kind==='set'?p.values:p?.kind==='range'?[p.min,p.max]:[];})].filter(Number.isFinite);return values.length?[{key,unit:units[key],min:Math.min(...values),max:Math.max(...values),sourceValues:values.length}]:[];});
 return {sourceId,inputMaterial:conditions.material||null,indexedSourceMaterials:materials,materialReview,sourceGravityContext,compared:support.compared,provided:support.provided,unassessedPoints:support.provided?60-support.assessedBudget:0,comparisons,blankInputs,unusedSourceParameters,selectionRule:'Closest indexed reference under the existing min/max proximity rule; an explicit marginal span has discovery-coverage credit. It is not a physical tolerance. A span without a discrete point is not a measured intermediate value. Explicit nominal gravity settings remain marked as nominal, not residual-acceleration measurements.',meaning:'Unassessed evidence is not zero-percent similarity. Context-only and raw entries do not earn numerical points. References remain separate source records, not a combined experimental trial.'};
}
