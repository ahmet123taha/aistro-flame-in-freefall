// Per-chat display state. A review mark is not completion of a safety action.
export function safetyStepKey(item){
 const s=JSON.stringify([item.sourceId,item.title,item.text,item.quote,item.limitation,item.step]);let h=2166136261;
 for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return 'step-'+(h>>>0).toString(16);
}
export function cleanSafetyWorkspace(value={}){
 value=value&&typeof value==='object'?value:{};
 const items=Array.isArray(value.items)?value.items.filter(i=>i&&typeof i==='object').slice(0,12):[];
 const valid=new Set(items.map(safetyStepKey));
 return {items,stale:Boolean(value.stale),emergency:Boolean(value.emergency),manualIncident:Boolean(value.manualIncident),briefs:Array.isArray(value.briefs)?value.briefs.filter(b=>b&&typeof b==='object').slice(0,6):[],reviewed:Array.isArray(value.reviewed)?[...new Set(value.reviewed.filter(k=>valid.has(k)))]:[],updatedAt:typeof value.updatedAt==='string'?value.updatedAt.slice(0,40):''};
}
export function incidentActive(state){return Boolean(state.emergency||state.manualIncident);}
export function safetyWorkspaceText(state){
 if(incidentActive(state))return 'INCIDENT MODE\nFollow the applicable approved crew/site emergency procedure and notify the responsible emergency authority. Do not wait for this research application. No verified site-specific firefighting procedure is configured here.';
 const groups=[['prevention','PREVENTION'],['response','RESPONSE PREPARATION'],['avoid','CRITICAL CAUTIONS']];
 return ['SOURCE-BASED RESEARCH REVIEW — not an approved emergency procedure',state.stale?'STALE: context changed; reassessment pending.':'',...groups.flatMap(([p,label])=>[label,...state.items.filter(i=>i.step?.phase===p).map((i,n)=>`${n+1}. ${i.title}\n${i.text}\nWhen: ${i.step.when}\nIf unknown: ${i.step.ifUnknown}\nReview check: ${i.step.check}\nWhy: ${i.relevance||''}\nLimit: ${i.limitation}\nSource: ${i.sourceId}\nPassage: ${i.quote}`)])].filter(Boolean).join('\n\n');
}

// Ephemeral per-controller history. Restore seeds it so saved chats never replay cues.
// Review priority is an attention order, never a measured fire-risk level.
export function createSafetyAttention(initial={}){
 const seen=new Map();
 const rank=item=>({low:1,medium:2,high:3}[item.priority]||0);
 function seed(state){seen.clear();for(const item of state.items||[])seen.set(safetyStepKey(item),rank(item));}
 seed(initial);
 return {seed,apply(state,analysis){
  if(analysis.recommendationsReviewed!==true||analysis.recommendations?.action!=='replace'||state.stale||incidentActive(state))return {changed:0,important:0};
  let changed=0,important=0;
  for(const item of state.items||[]){
   const key=safetyStepKey(item),priority=rank(item),previous=seen.get(key);
   if(previous===undefined||priority>previous){changed++;if(item.priority==='high'||item.step?.phase==='avoid')important++;}
   seen.set(key,Math.max(previous||0,priority));
  }
  return {changed,important};
 }};
}
