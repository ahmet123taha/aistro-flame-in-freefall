import {numericCloseness} from './proximity.mjs';
import {materialRelation,sourceConditionCoverage} from './research-coverage.mjs';
import {parameterSupport} from './parameter-support.mjs';
import {parameterDiagnostics} from './parameter-diagnostics.mjs';
export const SCENARIO_CRITERIA={objective:6,material:8,geometry:5,storage:5,atmosphere:5,gravity:4,flow:4,mechanism:3};
const legacy={objective:10,setting:10,material:10,mechanism:10};
export function scenarioBreakdown(assessment){
 const weights=Object.hasOwn(assessment.rubric||{},'setting')?legacy:SCENARIO_CRITERIA;
 return Object.entries(weights).map(([key,max])=>({key,max,value:assessment.rubric[key],points:assessment.rubric[key]*max,reason:assessment.rubricReasons?.[key]||''}));
}
export function validRubric(a){
 const weights=Object.hasOwn(a.rubric||{},'setting')?legacy:SCENARIO_CRITERIA;
 return a.rubric&&Object.keys(a.rubric).length===Object.keys(weights).length&&Object.keys(weights).every(k=>typeof a.rubric[k]==='number'&&Number.isFinite(a.rubric[k])&&a.rubric[k]>=0&&a.rubric[k]<=1);
}
export function sourceScenarioBreakdown(corpus,request,assessment){
 const breakdown=scenarioBreakdown(assessment),material=request.conditions.material;
 if(!material?.trim())return breakdown;
 const references=[...(corpus.experiments?.rows||[]).filter(r=>r.sourceId===assessment.sourceId&&materialRelation(material,r.values.material)==='same_family').map(r=>r.provenance),...(corpus.experiments?.studyEvidence||[]).filter(r=>r.sourceId===assessment.sourceId&&materialRelation(material,r.material)==='same_family').map(r=>r.provenance)].filter(p=>p?.fileId&&/^[a-f0-9]{64}$/.test(p.sha256));
 if(!references.length)return breakdown;
 return breakdown.map(b=>b.key==='material'?{...b,modelValue:b.value,value:1,points:b.max,origin:'verified_source_material_family',sourceReferences:references.slice(0,3),reason:'The supplied material family is explicitly present in hash-verified local source evidence. This is family relevance, not equal grade, composition or burning behavior. The raw model value is retained separately.'}:b);
}
export function scoreResearch(corpus,request,analysis,fields){
 const provided=fields.filter(k=>typeof request.conditions[k]==='number'&&Number.isFinite(request.conditions[k]));
 const matches=analysis.assessments.map(a=>{
  const breakdown=sourceScenarioBreakdown(corpus,request,a),scenarioPoints=breakdown.reduce((n,c)=>n+c.points,0);
  const rows=(corpus.experiments?.rows||[]).filter(r=>r.sourceId===a.sourceId&&(!request.conditions.material?.trim()||materialRelation(request.conditions.material,r.values.material)==='same_family'));
  const trials=rows.map(row=>{
   const contributions=provided.map(key=>{
    const observed=row.values[key],relation=materialRelation(request.conditions.material,row.values.material);
    const specimenAllowed=key!=='thicknessMm'||relation==='same_family';
    const available=specimenAllowed&&typeof observed==='number'&&Number.isFinite(observed),weight=60/provided.length;
    const score=available?numericCloseness(request.conditions[key],observed):null;
    return {key,input:request.conditions[key],observed:available?observed:null,score,weight,points:score===null?0:score/100*weight,evidence:available?row.evidence?.[key]||null:null,unavailableReason:available?null:!specimenAllowed?'specimen_material_not_matched':'source_value_not_reported'};
   });
   return {runId:row.runId,sourceMaterial:row.values.material||row.materialLabel||null,materialRelation:materialRelation(request.conditions.material,row.values.material),provenance:row.provenance,comparisonWarnings:row.comparisonWarnings||[],contributions,jointlyTested:row.jointlyTested!==false,complete:provided.length>0&&contributions.every(c=>c.score!==null)&&row.jointlyTested!==false,numericPoints:contributions.reduce((n,c)=>n+c.points,0),coverage:contributions.filter(c=>c.score!==null).length};
  });
  trials.sort((a,b)=>b.numericPoints-a.numericPoints||b.coverage-a.coverage||Number(b.materialRelation==='same_family')-Number(a.materialRelation==='same_family'));
  const trial=provided.length?trials.find(t=>t.coverage>0)||null:null,support=parameterSupport(corpus,a.sourceId,request.conditions,fields),numericPoints=support.points,compared=support.compared;
  return {id:a.sourceId,total:numericPoints+scenarioPoints,maxPoints:provided.length?100:40,assessedMaxPoints:40+support.assessedBudget,numericBudget:provided.length?60:0,numericPoints,scenarioPoints,scenarioBreakdown:breakdown,trial,parameterSupport:support,parameterDiagnostics:parameterDiagnostics(corpus,a.sourceId,request.conditions,fields,support),assessment:a,
   numericStatus:!provided.length?'not_requested':!compared?'unavailable':compared<provided.length?'partial':'complete',conditionCoverage:sourceConditionCoverage(corpus,a.sourceId,request.conditions),
   coverage:{provided:provided.length,compared,excluded:fields.filter(k=>!provided.includes(k)),unavailable:provided.filter(k=>!support.contributions.find(c=>c.key===k&&c.score!==null))},
   unscoredPoints:provided.length?60*(provided.length-compared)/provided.length:0,
   estimated:Object.entries(request.conditionBasis||{}).filter(([k,v])=>provided.includes(k)&&v==='estimated').map(([k])=>k)};
 }).sort((a,b)=>b.total-a.total||b.coverage.compared-a.coverage.compared);
 return {mode:'scenario_research',matches,unscored:(analysis.unscoredAssessments||[]).map(a=>({id:a.sourceId,assessment:a})),datasetHash:corpus.hash,scorePolicy:{numeric:60,scenario:40,numericDistribution:'Only user-supplied finite measurements share 60 points. Blank inputs are excluded. Supplied materials require the same source material family for numerical discovery. Other-material studies remain contextual evidence, without numerical credit. Missing source measurements earn no evidence points, never a fabricated match. Each parameter may be supported by a separate same-material source row or reviewed study span. These fragments do not constitute a jointly tested tuple. A separate nearest single row is retained.',meaning:'Evidence-backed retrieval points, not fire likelihood. A partial score is not a complete physical similarity estimate.',scenarioDescription:'Eight source-relevance dimensions with continuous 0..1 assessments; subjective precision, not scientific calibration. Relevant material series and graphs remain useful without an exact condition match.',materialCriterion:'Verified indexed material-family presence has full family relevance; the raw model value remains separately recorded. This does not establish equal grade or burning behavior.',criteria:SCENARIO_CRITERIA}};
}
