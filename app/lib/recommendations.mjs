import {SAFETY_STEPS_CONTRACT,normalizeSafetyStep,validStepCount} from './safety-steps.mjs';
// Research/design candidates; traceability validation is not scientific approval.
import {literalSourceProvenance} from './research-source-context.mjs';
export const RECOMMENDATION_CONTRACT=SAFETY_STEPS_CONTRACT;

export function recommendationContext(value){
 if(!Array.isArray(value))return [];
 return value.slice(0,12).filter(x=>x&&typeof x==='object').map(x=>{
  const out=Object.fromEntries(['title','text','relevance','sourceId','priority','limitation'].filter(k=>x[k]!=null).map(k=>[k,String(x[k]||'').slice(0,['text','relevance','limitation'].includes(k)?1600:180)]));
  const normalized=normalizeSafetyStep(x.step);if(normalized.ok&&normalized.step)out.step=normalized.step;return out;
 });
}

export function validateRecommendations(value,corpus,request){
 // Review flags are server-owned; model output cannot manufacture approval.
 const {recommendationReview:untrustedReview,recommendationsReviewed:untrustedReviewed,...clean}=value;
 const update=clean.recommendations;
 // Leave an omitted section absent: turning it into an explicit keep would
 // incorrectly look like a completed review when a cached answer is validated.
 if(update===undefined)return {...clean,recommendationsReviewed:false};
 const action=['keep','replace','clear'].includes(update?.action)?update.action:'invalid';
 const count=Array.isArray(update?.items)?update.items.length:null;
 const preserve=issues=>({...clean,recommendations:{action:'keep',items:[]},recommendationsReviewed:false,recommendationReview:{action,suppliedCount:count,issues}});
 const validText=(s,max=1600)=>typeof s==='string'&&s.trim()&&s.length<=max;
 if(!update||typeof update!=='object'||Array.isArray(update)||action==='invalid')return preserve([{code:'invalid_action',field:'recommendations.action'}]);
 if(!Array.isArray(update.items))return preserve([{code:'invalid_items',field:'recommendations.items'}]);
 if(!validStepCount(update.items))return preserve([{code:'too_many_items',field:'recommendations.items'}]);
 if(action!=='replace'&&count)return preserve([{code:'action_items_conflict',field:'recommendations.items'}]);
 if(action==='replace'&&!count)return preserve([{code:'empty_replacement',field:'recommendations.items'}]);
 if(action==='keep'&&(request.previousRecommendations||[]).some(item=>!request.ids.includes(item.sourceId)||!corpus.records.some(r=>r.id===item.sourceId)))return preserve([{code:'prior_source_not_supplied',field:'recommendations.action'}]);
 const items=[],issues=[];
 for(const [index,item] of update.items.entries()){
  const normalizedStep=normalizeSafetyStep(item?.step);
  if(!normalizedStep.ok){issues.push({code:normalizedStep.reason,field:"recommendations.items.step",index});continue;}
  // MAT sidecar context cannot become a scientific citation even if a future
  // caller accidentally merges a support profile into the record collection.
  const source=corpus.records.find(r=>/^(?:PSI|REF)-\d+$/.test(r.id)&&r.id===item?.sourceId&&request.ids.includes(r.id));
  if(!source||!validText(item.title,180)||!validText(item.text)||!validText(item.limitation)||(item.relevance!==undefined&&!validText(item.relevance,600))||!['high','medium','low'].includes(item.priority)||!validText(item.quote,4000)||item.quote.length<18||!source.content?.[item.field]?.includes(item.quote)){issues.push({code:'unverified_item',field:'recommendations.items',index,...(source?{sourceId:source.id}:{})});continue;}
  const provenance=item.field==='fileText'?literalSourceProvenance(source,item.quote):null;
  items.push({title:item.title,text:item.text,...(item.relevance!==undefined?{relevance:item.relevance}:{}),priority:item.priority,sourceId:item.sourceId,field:item.field,quote:item.quote,limitation:item.limitation,evidenceType:'inference',...(normalizedStep.step?{step:normalizedStep.step}:{}),...(provenance?{evidenceProvenance:provenance}:{})});
 }
 // replace describes the complete set. Applying only a valid subset could
 // silently erase earlier candidates; preserve the prior set if any item fails.
 if(issues.length)return preserve(issues);
 return {...clean,recommendations:{action,items},recommendationsReviewed:true};
}
