import {FIGURES} from '../public/figure-models.mjs';
import {PMMA_ROD_SOURCE,physicalMatch,rodApplicability} from './pmma-rod-model.mjs';
import {PMMA_THERMAL_PROFILE,rodThermalEvidence} from './pmma-thermal.mjs';
import {canonicalMaterial} from './material-identity.mjs';
import {materialApplicability} from './material-applicability.mjs';
import {prioritizeStudyFragments} from './study-evidence-sorting.mjs';
import {sourceMaterialReview} from './material-evidence-review.mjs';
export {canonicalMaterial} from './material-identity.mjs';
export const CONDITION_FIELDS=['gravityMs2','temperatureK','oxygen','pressure','airflow','thicknessMm'];
export const CONDITION_UNITS={gravityMs2:'m/s2',temperatureK:'K',oxygen:'% vol',pressure:'kPa',airflow:'cm/s',thicknessMm:'mm'};
export function materialRelation(input,source){
 const a=canonicalMaterial(input),b=canonicalMaterial(source);
 return !a?'not_specified':!b?'source_not_identified':a===b?'same_family':'different_material';
}
export function sourcePhysicsSupport(corpus,sourceId,conditions={}){
 const verified=(corpus.experiments?.summary?.documentAudit||[]).some(d=>d.status==='verified'&&d.fileId===PMMA_ROD_SOURCE.fileId&&d.sha256===PMMA_ROD_SOURCE.sha256);
 if(sourceId!=='PSI-25'||!verified)return {status:'no_reviewed_model',models:[],tolerance:{status:'not_established',excludesSource:false,meaning:'No source-calibrated tolerance for ignition, spread or extinction has been indexed. A raw temperature/pressure/composition difference alone does not disqualify the study.'},limitation:'No quantitative physical/material/thermal model is indexed for this source. Its literature can still be useful; no physics percentage is inferred from metadata.'};
 const c={...conditions,material:canonicalMaterial(conditions.material)},applicability=rodApplicability(c,'pmma-rod-forced');
 const comparison=applicability.applicable?physicalMatch(corpus,{ids:[sourceId],method:'pmma-rod-forced',conditions:c}):null;
 return {status:canonicalMaterial(c.material)==='pmma'?'source_model_requires_scope_review':'different_material_model',source:PMMA_ROD_SOURCE,models:[
  {id:'pmma-forced-stretch',title:'PMMA rod: flow and geometry',formula:'a_f = 30 U / D (U: cm/s, D: mm; a_f: 1/s)',mechanism:'Flow stretch couples gas velocity to rod geometry. Comparing U alone misses this source-defined coupling.',applicability,...(comparison?.matches.length?{comparison:{closeness:comparison.matches[0].similarity,meaning:'Forced-stretch closeness only; not overall combustion similarity',runId:comparison.matches[0].experimentId}}:{})},
  {id:'pmma-energy-balance',title:'PMMA rod: source energy balance',formula:'Pe = L Vr / alpha; q_required = q_conduction + q_radiation + q_vaporization',properties:{...PMMA_THERMAL_PROFILE},evaluation:rodThermalEvidence({...c,thermalAnalysis:true}),mechanism:'Source conductivity, diffusivity, density, emissivity and vaporization energy enter the balance. These are PMMA-specific source assumptions and cannot be transferred to paper or fiberglass.'}
 ],tolerance:{status:'source_models_only',excludesSource:false,meaning:'Stretch closeness concerns one coupled physical feature. The energy balance concerns required heat flux. Neither defines a universal tolerable temperature gap or allowable change in ignition/spread/extinction. Source applicability, an output-specific error criterion and model validation are needed before accepting a tolerance.'},limitation:'Source equations have material, geometry, gravity and thermal assumptions. No universal burning-similarity percentage or ignition probability is produced. Missing qualifications remain missing; constants are not assigned to another material.'};
}
// These are marginal spans of existing source rows, never a joint test domain,
// interpolated burn state, unique-trial count or inferred measurement.
export function sourceConditionCoverage(corpus,sourceId,conditions={}){
 const rows=(corpus.experiments?.rows||[]).filter(r=>r.sourceId===sourceId),groups=new Map();
 for(const row of rows){const key=canonicalMaterial(row.values.material);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);}
 const series=[...groups].map(([material,items])=>({material:material||null,materialRelation:materialRelation(conditions.material,material),sourceRowCount:items.length,ranges:CONDITION_FIELDS.flatMap(key=>{
  const known=items.filter(r=>Number.isFinite(r.values[key])).sort((a,b)=>a.values[key]-b.values[key]);if(!known.length)return [];
  const first=known[0],last=known.at(-1),input=conditions[key];
  const reference=row=>({runId:row.runId,value:row.values[key],evidence:row.evidence?.[key]||null,provenance:row.evidence?.[key]?.provenance||row.provenance});
  return [{key,unit:CONDITION_UNITS[key],min:first.values[key],max:last.values[key],sourceRowCount:known.length,distinctValues:new Set(known.map(r=>r.values[key])).size,position:!Number.isFinite(input)?'not_supplied':known.some(r=>r.values[key]===input)?'reported_value':input<first.values[key]?'below_reported_span':input>last.values[key]?'above_reported_span':'between_reported_values',lower:reference(first),upper:reference(last)}];
 })})).sort((a,b)=>Number(b.materialRelation==='same_family')-Number(a.materialRelation==='same_family')||b.sourceRowCount-a.sourceRowCount);
 const documents=corpus.experiments?.summary?.documentAudit||[];
 const figures=sourceId==='PSI-25'?FIGURES.flatMap(f=>{const source=documents.find(d=>d.status==='verified'&&d.sha256===f.sha256);return source?[{id:f.id,title:f.title,material:'pmma',materialRelation:materialRelation(conditions.material,'pmma'),fileId:source.fileId,sha256:f.sha256,page:f.page,caption:f.caption,fidelity:f.fidelity,model:f.model}]:[];}):[];
 const studySummaries=(corpus.experiments?.studyEvidence||[]).filter(e=>e.sourceId===sourceId).map(e=>({...e,materialRelation:materialRelation(conditions.material,e.material)}));
 const sameMaterialSeries=series.some(g=>g.materialRelation==='same_family')||studySummaries.some(e=>e.materialRelation==='same_family'),sameMaterialFigures=figures.some(g=>g.materialRelation==='same_family');
 return {materialReview:sourceMaterialReview(corpus,sourceId,conditions),materialApplicability:materialApplicability(corpus,conditions,sourceId),sourceWarnings:[...new Set(rows.flatMap(r=>r.comparisonWarnings||[]))],sourceRowCount:rows.length,studySummaries,series,figures,usability:{status:sameMaterialSeries||sameMaterialFigures?'same_material_evidence':rows.length||figures.length||studySummaries.length?'other_material_context':'literature_review',sameMaterialSeries,sameMaterialFigures,meaning:'Material identity, reaction/degradation information and source properties may support initial literature discovery across environments. Numerical proximity and transfer of a burn outcome are separate reviews; geometry, atmosphere, gravity and transport still matter.'},physics:sourcePhysicsSupport(corpus,sourceId,conditions),limitation:'Reported spans are separate per material and parameter, not a jointly tested region or a burn prediction. A value between rows is not an exact tested condition. CSV/PDF rows may describe the same physical trial. No generic interpolation or extrapolation is performed.'};
}
export function researchContext(corpus,request){
 return {...corpus,records:corpus.records.filter(r=>request.ids.includes(r.id)).map(r=>{
  const coverage=sourceConditionCoverage(corpus,r.id,request.conditions);
  coverage.studySummaries=prioritizeStudyFragments(coverage.studySummaries,request);
  const compact={scope:'SERVER INDEX of hash-verified local source rows and reviewed figures; arithmetic coverage, not newly observed findings.',sourceRowCount:coverage.sourceRowCount,sourceWarnings:coverage.sourceWarnings,materialReview:coverage.materialReview,studySummaries:coverage.studySummaries.slice(0,6),usability:coverage.usability,series:coverage.series.slice(0,6).map(g=>({...g,ranges:g.ranges.map(x=>({key:x.key,unit:x.unit,min:x.min,max:x.max,sourceRowCount:x.sourceRowCount,distinctValues:x.distinctValues,position:x.position,lower:{runId:x.lower.runId,...x.lower.provenance},upper:{runId:x.upper.runId,...x.upper.provenance}}))})),omittedMaterialGroups:Math.max(0,coverage.series.length-6),figures:coverage.figures,physics:coverage.physics,limitation:coverage.limitation};
  const hasFragments=Boolean(r.sourceFragments?.length);
  const reviewedText=String(hasFragments?r.sourceIndexText||'':r.content?.fileText||'').slice(0,6000);
  const coverageText=coverage.sourceRowCount||coverage.studySummaries.length||coverage.figures.length||coverage.physics.models.length?JSON.stringify(compact):'';
  const sourceIndexText=[reviewedText,coverageText].filter(Boolean).join('\n\n');
  const fileText=[...(hasFragments?r.sourceFragments.map(c=>c.quote):[]),sourceIndexText].filter(Boolean).join('\n\n');
  return {...r,...(hasFragments?{sourceIndexText}:{}),content:{...Object.fromEntries(Object.entries(r.content||{}).map(([k,v])=>[k,String(v).slice(0,4000)])),...(fileText?{fileText}:{})},contextWarnings:[...(r.contextWarnings||[]),'Discovery uses bounded literal document passages, metadata and a reviewed source-row/figure coverage index. Extraction/retrieval coverage is incomplete; no absent-result claim follows from an omitted passage.']};
 })};
}
