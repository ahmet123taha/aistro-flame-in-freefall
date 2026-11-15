import {safetyStepsHtml,displayedSafetyCount} from './safety-steps-panel.mjs';
import {cleanSafetyWorkspace,safetyStepKey,safetyWorkspaceText,incidentActive,createSafetyAttention} from './safety-workspace.mjs';
export function reduceRecommendations(previous,analysis){
 const old=previous||{items:[],stale:false};
 const update=analysis.recommendations;
 if(analysis.recommendationsReviewed!==true)return {...old,emergency:Boolean(old.emergency||analysis.emergency)};
 if(!update||update.action==='keep')return {...old,stale:false,emergency:Boolean(analysis.emergency)};
 const items=update.action==='clear'?[]:update.items;
 const retained=new Set(items.filter(item=>old.items?.some(prior=>safetyStepKey(prior)===safetyStepKey(item)&&prior.priority===item.priority)).map(safetyStepKey));
 return {...old,items,reviewed:(old.reviewed||[]).filter(key=>retained.has(key)),stale:false,emergency:Boolean(analysis.emergency)};
}
export function recommendationHtml(state){return safetyStepsHtml(state);}
// One state transition for manual toggles and automatic incident expansion.
// The control stays inside the panel's left edge; its icon is never replaced.
export function setRecommendationsExpanded(expanded,root=document){
 const layout=root.querySelector('.layout'),button=root.querySelector('#recommend-toggle'),body=root.querySelector('#recommend-body');
 if(!expanded&&body.contains(root.activeElement))button.focus({preventScroll:true});
 layout.classList.toggle('narrow-right',!expanded);
 button.setAttribute('aria-expanded',String(expanded));
 root.querySelector('#incident-access')?.setAttribute('aria-expanded',String(expanded));
 button.setAttribute('aria-label',expanded?'Collapse Safety review':'Expand Safety review');
 body.hidden=!expanded;body.inert=!expanded;body.setAttribute('aria-hidden',String(!expanded));
}
export function installRecommendationsPanel(){
 let state=cleanSafetyWorkspace(),onChange=()=>{};
 const attention=createSafetyAttention();let cueTimer,updateNumber=0;
 const content=document.querySelector('#recommend-content'),count=document.querySelector('#recommend-count'),aside=document.querySelector('.recommendations');
 const updateStatus=document.querySelector('#safety-update-status');
 function clearCue(){clearTimeout(cueTimer);aside.classList.remove('safety-needs-attention');}
 function announceUpdate(change){
  if(!change.changed)return;
  updateNumber++;
  if(updateStatus)updateStatus.textContent=change.important?`Safety update ${updateNumber}: ${change.important} new or higher-priority source-supported finding${change.important===1?'':'s'} to review in Safety. Priority is not a fire-risk measurement.`:`Safety update ${updateNumber}: source-based review updated.`;
  if(change.important){clearCue();aside.classList.add('safety-needs-attention');cueTimer=setTimeout(clearCue,4200);}
 }
 function render({restore=false}={}){
  const scroll=restore?0:aside.scrollTop,open=new Map([...(restore?[]:content.querySelectorAll('details[data-safety-detail]'))].map(d=>[d.dataset.safetyDetail,d.open]));
  count.textContent=String(displayedSafetyCount(state));content.innerHTML=recommendationHtml(state);
  for(const d of content.querySelectorAll('details[data-safety-detail]'))if(open.has(d.dataset.safetyDetail))d.open=open.get(d.dataset.safetyDetail);
  aside.scrollTop=scroll;
 }
 function expand(){setRecommendationsExpanded(true);}
 const toggle=document.querySelector('#recommend-toggle');
 toggle.onclick=()=>setRecommendationsExpanded(document.querySelector('.layout').classList.contains('narrow-right'));
 document.querySelector('#recommend-body').addEventListener('keydown',e=>{if(e.key==='Escape'&&!e.defaultPrevented){e.preventDefault();setRecommendationsExpanded(false);}});
 setRecommendationsExpanded(!document.querySelector('.layout').classList.contains('narrow-right'));
 // Opening Safety is navigation only: preserve the current review and conversation.
 document.querySelector('#incident-access').onclick=expand;
 document.addEventListener('click',e=>{if(e.target.closest('[data-open-safety]'))expand();});
 content.addEventListener('click',async e=>{
  const sourceLink=e.target.closest('.step-source-link');if(sourceLink){const detail=document.getElementById(sourceLink.getAttribute('href')?.slice(1));if(detail){e.preventDefault();detail.open=true;detail.scrollIntoView({block:'nearest'});}}
  if(e.target.closest('[data-safety-planning]')){state.manualIncident=false;state.emergency=false;state.stale=Boolean(state.items.length||state.briefs.length);render();onChange();}
  if(e.target.closest('[data-safety-copy]')){const status=content.querySelector('[data-safety-copy-status]');try{await navigator.clipboard.writeText(safetyWorkspaceText(state));status.textContent='Copied with sources and limitations.';}catch{status.textContent='Clipboard unavailable. Select the text to copy it.';}}
 });
 content.addEventListener('change',e=>{const key=e.target.dataset.safetyReview;if(!key||state.stale)return;if(!state.items.some(i=>safetyStepKey(i)===key))return;state.reviewed=e.target.checked?[...new Set([...state.reviewed,key])]:state.reviewed.filter(k=>k!==key);render();content.querySelector(`[data-safety-review="${key}"]`)?.focus({preventScroll:true});onChange();});
 render();
 return {openSafety:expand,setOnChange(fn){onChange=fn;},apply(a){
   state=cleanSafetyWorkspace(reduceRecommendations(state,a));
   if(a.stage==='rank')state.briefs=Array.isArray(a.sourceBriefs)?a.sourceBriefs:[];
   if(a.recommendationsReviewed===true)state.updatedAt=new Date().toISOString();
   const change=attention.apply(state,a);
   if(incidentActive(state))expand();render();announceUpdate(change);
  },restore(s){clearCue();updateNumber=0;if(updateStatus)updateStatus.textContent='';state=cleanSafetyWorkspace(s);attention.seed(state);if(incidentActive(state))expand();render({restore:true});},invalidate(){clearCue();if(updateStatus)updateStatus.textContent='';state.stale=Boolean(state.items.length||state.briefs.length);render();},snapshot:()=>structuredClone(state),brief:()=>state.items.map(({title,text,relevance,sourceId,priority,limitation,step})=>({title,text,...(relevance?{relevance}:{}),sourceId,priority,limitation,...(step?{step}:{})}))};
}
