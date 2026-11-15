export const PINNED_TAB={key:'results',id:'results',type:'results',title:"Matching results",pinned:true};
export function addTab(tabs,tab){return tabs.some(t=>t.key===tab.key)?tabs:[...tabs,tab];}
export function closeTab(tabs,active,key){if(key==='results')return {tabs,active};const next=tabs.filter(t=>t.key!==key);return {tabs:next,active:active===key?(next.at(-1)?.key||'results'):active};}
export function usablePolicy(policy,{preview=false,datasetHash=null}={}){
 if(!policy||policy.scoreKind!=='condition_similarity')return false;
 const t=policy.thresholds;
 if(!t||!Number.isFinite(t.medium)||!Number.isFinite(t.critical)||t.medium<0||t.critical>100||t.medium>=t.critical)return false;
 if(policy.synthetic===true)return preview===true;
 return policy.validationStatus==='validated'&&typeof policy.validationReference==='string'&&policy.validationReference.length>0&&typeof policy.datasetHash==='string'&&/^[a-f0-9]{64}$/.test(policy.datasetHash)&&datasetHash===policy.datasetHash;
}
export function partitionMatches(response,options={}){
 const valid=usablePolicy(response?.policy,options), visible=[],low=[],unknown=[];
 for(const match of response?.matches||[]){
  if(!valid||!Number.isFinite(match.similarity)||match.similarity<0||match.similarity>100||match.evidenceType!=='numeric'||!Array.isArray(match.sourceRows)||!match.sourceRows.length){unknown.push({...match,similarity:null,level:'unknown'});continue;}
  const level=match.similarity>=response.policy.thresholds.critical?'critical':match.similarity>=response.policy.thresholds.medium?'medium':'low';
  (level==='low'?low:visible).push({...match,level});
 }
 visible.sort((a,b)=>b.similarity-a.similarity);
 return {valid,visible,low,unknown,synthetic:response?.policy?.synthetic===true};
}
