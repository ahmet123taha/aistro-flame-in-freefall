// Provider JSON mode handles syntax only. Scientific structure, source IDs,
// quotes and numerical bounds remain enforced locally by validateResearch.
export function responseShape(value){
 return {stage:['clarify','rank','conversation'].includes(value?.stage)?value.stage:'missing_or_invalid',assessmentsType:Array.isArray(value?.assessments)?'array':value?.assessments===null?'null':typeof value?.assessments,assessmentCount:Array.isArray(value?.assessments)?value.assessments.length:null,recommendationAction:['keep','replace','clear'].includes(value?.recommendations?.action)?value.recommendations.action:'missing_or_invalid',recommendationCount:Array.isArray(value?.recommendations?.items)?value.recommendations.items.length:null};
}
export function normalizeResearchShape(value,request){
 if(!value||typeof value!=='object'||Array.isArray(value))return value;
 const copy={...value};
 // Missing empty collections in a non-ranking answer are a harmless shape repair.
 // Never manufacture a citation, rubric, missing rank list or scientific result.
 if(['clarify','conversation'].includes(copy.stage))for(const k of ['assessments','questions','unknowns','conditionSuggestions','evidenceGaps'])if(copy[k]==null)copy[k]=[];
 if(request.flow?.requiredStage==='conversation'&&copy.stage==='clarify'&&Array.isArray(copy.assessments)&&!copy.assessments.length)copy.stage='conversation';
 if(['clarify','conversation'].includes(copy.stage)&&copy.nextStep==null)copy.nextStep='';
 return copy;
}
