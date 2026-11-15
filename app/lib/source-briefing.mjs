import {literalSourceProvenance} from './research-source-context.mjs';

export const BRIEFING_GUIDANCE=`SOURCE BRIEFING: Finding a paper is only the first step. Answer the latest question using the supplied passages before directing the user to the full papers. For rank turns return sourceBriefs for the most useful sources (normally 2-4, maximum 6). Give each a short finding, its meaning for THIS question, and a concrete limitation. Do not merely repeat a paper's title, abstract or relevance score. If the supplied text contains no result, describe the study scope honestly; do not invent a finding to fill the panel. Cover prevention, detection, suppression and transfer cautions when relevant evidence actually exists. Do not make every card say 'read this paper'.
Each brief selects sourceId and an exact supplied evidenceId. basis=reported_result is allowed ONLY for a literal fileText fragment with original-file provenance that actually reports the observation. Objectives, hypotheses, future benefits and source-index descriptions use basis=study_scope. topic is ignition, spread, detection, suppression, limitation or other. finding describes what that passage says; application is your clearly bounded interpretation for the user's question; limitation identifies the specific difference or missing evidence. Preserve the tested material, configuration and measured outcome; do not equate disappearance of a visible flame with absence of combustion. A shared catalog document does not establish which investigation performed a particular test.
The short summary leads with the answer or evidence gap, not an input recap. Cite source IDs in it and expand the support in sourceBriefs. Keep the top-level answer concise and accessible; explain unfamiliar terms on first use. Offer deeper source inspection, not mandatory homework. Normal greetings need no sources. Do not re-ask already unavailable information. Summaries are grounded interpretations, not verified operational instructions.
When incidentMode=true, return emergency=true even if the latest message is a follow-up. During an active incident keep the immediate emergency handoff short and first. Up to three sourceBriefs may explain relevant EXPERIMENTAL findings as read-only background for a responsible reviewer, never as a firefighting script. Do not embed imperative suppressant, equipment, ventilation or atmosphere instructions in finding/application/limitation. Do not guess equipment or wait for measurements. The panel separates this background from the applicable approved emergency procedure, which is not supplied by this application.`;
export const BRIEFING_OUTPUT='sourceBriefs:[{sourceId:string,evidenceId:string,basis:"reported_result"|"study_scope",topic:"ignition"|"spread"|"detection"|"suppression"|"limitation"|"other",finding:string,application:string,limitation:string}]';

// Optional interpretation is isolated from rankings. Citation checks establish
// traceability, not semantic entailment or procedural authorization.
export function validateSourceBriefs(value,corpus,request){
 const {sourceBriefs:raw,briefingReview:untrusted,...clean}=value;
 if(raw===undefined)return clean;
 if(value.stage!=='rank'||request.flow?.updateResearch===false)return {...clean,sourceBriefs:[]};
 const issues=[],items=[],seen=new Set();
 const reject=(index,reason)=>issues.push({index,reason});
 const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 if(!Array.isArray(raw))reject(null,'invalid_collection');
 else{
  if(raw.length>6)reject(null,'too_many_briefs');
  for(const [i,b] of raw.slice(0,6).entries()){
   const source=corpus.records.find(r=>/^(PSI|REF)-\d+$/.test(r.id)&&r.id===b?.sourceId&&request.ids.includes(r.id));
   if(!source||!text(b.finding,700)||!text(b.application,700)||!text(b.limitation,700)||!['reported_result','study_scope'].includes(b.basis)||!['ignition','spread','detection','suppression','limitation','other'].includes(b.topic)){reject(i,'invalid_brief');continue;}
   if(!text(b.quote,4000)||b.quote.length<18||!source.content?.[b.field]?.includes(b.quote)){reject(i,'unverified_passage');continue;}
   const provenance=b.field==='fileText'?literalSourceProvenance(source,b.quote):null;
   if(b.basis==='reported_result'&&!provenance){reject(i,'result_requires_original_passage');continue;}
   const id=b.sourceId+'|'+b.quote+'|'+b.finding;
   if(seen.has(id)){reject(i,'duplicate_brief');continue;}seen.add(id);
   items.push({sourceId:b.sourceId,sourceTitle:String(source.title||source.name||b.sourceId),basis:b.basis,topic:b.topic,finding:b.finding.trim(),application:b.application.trim(),limitation:b.limitation.trim(),field:b.field,quote:b.quote,...(provenance?{evidenceProvenance:provenance}:{})});
  }
 }
 return {...clean,sourceBriefs:items,...(issues.length?{briefingReview:{accepted:items.length,issues}}:{})};
}
