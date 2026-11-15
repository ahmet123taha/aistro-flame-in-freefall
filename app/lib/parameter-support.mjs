import {numericCloseness} from './proximity.mjs';
import {materialRelation} from './research-coverage.mjs';
import {canonicalMaterial} from './material-identity.mjs';

// Diagnostics and scoring deliberately use the same source-candidate rules.
export function sourceParameterCandidates(corpus,sourceId,conditions,key,{sameMaterialOnly=true}={}){
 const rows=(corpus.experiments?.rows||[]).filter(r=>r.sourceId===sourceId),fragments=(corpus.experiments?.studyEvidence||[]).filter(r=>r.sourceId===sourceId);
 const eligible=material=>!sameMaterialOnly||!conditions.material?.trim()||materialRelation(conditions.material,material)==='same_family',candidates=[];
 for(const row of rows){
  if(!eligible(row.values.material)||!Number.isFinite(row.values[key]))continue;
  candidates.push({kind:'reported_value',observed:row.values[key],score:numericCloseness(conditions[key],row.values[key]),evidence:row.evidence?.[key]||null,provenance:row.evidence?.[key]?.provenance||row.provenance,runId:row.runId,physicalTrialKey:row.physicalTrialKey||null,jointlyTested:row.jointlyTested!==false,stageTemporalBasis:row.stageTemporalBasis||null,material:row.values.material});
 }
 for(const f of fragments){
  const p=f.parameters[key];if(!p||!eligible(f.material))continue;
  if(p.kind==='set')for(const v of p.values)candidates.push({kind:f.scope==='individual_run_header'?'reported_value':'reported_setting',observed:v,score:numericCloseness(conditions[key],v),evidence:{...p,value:v},provenance:f.provenance,material:f.material,approximate:Boolean(p.approximate),physicalTrialKey:f.physicalTrialKey||null,jointlyTested:false,stageTemporalBasis:f.stageTemporalBasis||null});
  else if(p.kind==='range'&&Number.isFinite(p.min)&&Number.isFinite(p.max)&&p.min>=0&&p.max>=p.min){
   const inside=conditions[key]>=p.min&&conditions[key]<=p.max,nearest=conditions[key]<p.min?p.min:p.max;
   candidates.push({kind:'reported_marginal_span',observed:null,range:[p.min,p.max],withinSpan:inside,score:inside?100:numericCloseness(conditions[key],nearest),evidence:p,provenance:f.provenance,material:f.material});
  }
 }
 return candidates.filter(c=>Number.isFinite(c.score)).sort((a,b)=>b.score-a.score||Number(a.kind==='reported_marginal_span')-Number(b.kind==='reported_marginal_span'));
}

// Discovery across source fragments. Values never become a fabricated joint run.
export function parameterSupport(corpus,sourceId,conditions,fields){
 const provided=fields.filter(k=>Number.isFinite(conditions[k]));
 const byParameter=new Map(provided.map(key=>[key,sourceParameterCandidates(corpus,sourceId,conditions,key).filter(c=>Boolean(conditions.material?.trim())||Boolean(canonicalMaterial(c.material)))]));
 // With no input material, do not assemble a perfect score from different fuels.
 // Retain environmental discovery, but choose one explicitly named source family.
 const families=[...new Set([...byParameter.values()].flat().map(c=>canonicalMaterial(c.material)))];
 let selectedSourceMaterial=null;
 if(!conditions.material?.trim()&&families.length){
  const ranked=families.map(material=>{const best=provided.map(key=>byParameter.get(key).find(c=>canonicalMaterial(c.material)===material));return {material,points:best.reduce((n,c)=>n+(c?.score||0),0),coverage:best.filter(Boolean).length};}).sort((a,b)=>b.points-a.points||b.coverage-a.coverage||a.material.localeCompare(b.material));
  selectedSourceMaterial=ranked[0].material;
 }
 const contributions=provided.map(key=>{
  const candidates=byParameter.get(key).filter(c=>selectedSourceMaterial===null||canonicalMaterial(c.material)===selectedSourceMaterial);
  const best=candidates[0],weight=60/provided.length;
  return {key,input:conditions[key],weight,...(best?{...best,points:best.score/100*weight}:{score:null,points:0,observed:null,kind:'unassessed',unavailableReason:conditions.material?'no_supported_same_material_value':'source_value_not_reported'})};
 });
 const compared=contributions.filter(c=>c.score!==null).length,points=contributions.reduce((n,c)=>n+c.points,0),assessedBudget=provided.length?60*compared/provided.length:0;
 const keys=new Set(contributions.filter(c=>c.score!==null).map(c=>c.runId&&c.provenance?.fileId?JSON.stringify([c.provenance.fileId,c.provenance.sha256||'',c.runId]):null));
 return {contributions,provided:provided.length,compared,points,assessedBudget,selectedSourceMaterial,percent:assessedBudget?points/assessedBudget*100:null,jointlyTested:compared>0&&keys.size===1&&!keys.has(null)&&contributions.filter(c=>c.score!==null).every(c=>c.jointlyTested!==false),basis:'parameter_wise_source_proximity',materialGate:conditions.material?'same_material_family_required':'material_not_supplied',limitation:'Parameter-wise proximity is a discovery aid, not equivalent burning or fire probability. Separate rows/spans may support different parameters within one source material family; they are not merged into a tested experimental tuple. With no input material, the selected source family is shown and does not identify your material. A reported span does not prove every combination or intermediate outcome was measured. Missing source fields remain unassessed; grade/composition and physical transfer still require review.'};
}
