import {sourceReferenceHtml} from './source-reference.mjs';
import {sourceBriefingHtml} from './source-briefing.mjs';
import {safetyStepKey,incidentActive} from './safety-workspace.mjs';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const phases=[['prevention','Prevent a fire','No source-supported prevention step yet.'],['response','Response planning','Response planning is unresolved until the applicable procedure and equipment are known.'],['avoid','Critical things to avoid','No scenario-specific caution has been established from the supplied evidence.']];
const basis=field=>({objective:'Study objective',hypothesis:'Study hypothesis',researchImpacts:'Prospective impact',approach:'Study description',fileText:'Local document excerpt',documentText:'Supporting document'}[field]||'Local source passage');
// Keep source order for equal priorities; review priority never changes phase meaning.
function priorityOrder(items){
 const rank={high:3,medium:2,low:1};
 return items.map((item,index)=>({item,index})).sort((a,b)=>(rank[b.item.priority]||0)-(rank[a.item.priority]||0)||a.index-b.index).map(entry=>entry.item);
}
export function displayedSafetyCount(state){return incidentActive(state)?0:(state.items||[]).length;}
function checklistItem(item,state,number){
 const key=safetyStepKey(item),reviewed=state.reviewed?.includes(key);
 // Never shorten a scientific instruction by clipping characters or sentences.
 // Brevity belongs in the generation contract; source details remain below.
 return `<li value="${number}" class="safety-step${reviewed?' is-reviewed':''}"><div class="safety-checkline"><p class="step-action"><small class="step-priority">${esc(item.priority)} review</small>${esc(item.text)} <a class="step-source-link" href="#safety-source-${key}" aria-label="Sources and limits for step ${number}">[${number}]</a></p><label class="safety-review-label"><input type="checkbox" data-safety-review="${key}" aria-label="Mark step ${number} as reviewed" ${reviewed?'checked':''} ${state.stale?'disabled':''}><span class="safety-visually-hidden">Marked as reviewed</span></label></div></li>`;
}
function sourceDetail(item,number){
 const s=item.step,key=safetyStepKey(item);
 return `<details class="safety-step-source" id="safety-source-${key}" data-safety-detail="${key}"><summary><strong>${number}.</strong> ${esc(item.sourceId)} <span>${esc(item.title)}</span></summary>${s?`<p><strong>When:</strong> ${esc(s.when)}</p>`:''}<p><strong>Limit:</strong> ${esc(item.limitation)}</p>${item.relevance?`<p><strong>Why it matters:</strong> ${esc(item.relevance)}</p>`:''}${s?`<p><strong>If unknown:</strong> ${esc(s.ifUnknown)}</p><p><strong>Check:</strong> ${esc(s.check)}</p>`:''}<p class="muted">${esc(item.priority)} review priority · Source basis: ${esc(basis(item.field))} · AI interpretation</p><details data-safety-detail="${key}-source"><summary>Source passage</summary><blockquote>${esc(item.quote)}</blockquote>${sourceReferenceHtml(item.evidenceProvenance,{showHash:true})}</details><div class="step-source-actions"><button data-open="${esc(item.sourceId)}">${esc(item.sourceId)} · Open source</button><button data-ai="${esc(item.sourceId)}">Discuss this step</button></div></details>`;
}
export function safetyStepsHtml(state={}){
 const items=Array.isArray(state.items)?state.items:[];
 const stale=state.stale?'<p class="safety-stale" role="status">Context changed. These earlier candidates need review for the current situation.</p>':'';
 if(incidentActive(state))return `<section class="safety-incident" aria-labelledby="safety-incident-title"><small>AVAILABLE WITHOUT AN AI RESPONSE</small><h3 id="safety-incident-title">Incident support</h3><ol><li><strong>Use the applicable emergency procedure.</strong> Follow the approved crew/site emergency procedures and notify the responsible emergency authority.</li><li><strong>Do not wait for this tool.</strong> Do not delay for sensors, research or material identification.</li><li><strong>Keep research separate from intervention.</strong> Do not choose a suppressant or change equipment/atmosphere settings from an AI guess.</li></ol><p>No verified site-specific firefighting procedure is configured here. Generated instructions are hidden during the incident.</p><button type="button" data-safety-planning>Return to planning view</button></section>${sourceBriefingHtml(state.briefs,{compact:true,incident:true,stale:state.stale,title:'Source findings for the responsible reviewer'})}${!state.briefs?.length?'<p class="muted">No source briefing is available in this conversation yet. Do not postpone emergency action to obtain one.</p>':''}`;
 const reviewed=state.reviewed?.length||0;
 const timestamp=state.updatedAt&&!Number.isNaN(Date.parse(state.updatedAt))?`<small class="safety-updated">Last source review: <time datetime="${esc(state.updatedAt)}">${esc(new Date(state.updatedAt).toLocaleString())}</time>${state.stale?' · Earlier context':' · Current context'}</small>`:'';
 if(!items.length)return `${stale}<section class="safety-empty" aria-labelledby="safety-empty-title"><small>YOUR SOURCE-BASED SAFETY REVIEW</small><h3 id="safety-empty-title">Start with your situation</h3><p>Tell AI Astro where you are, what material or activity concerns you, and what you want to understand. Measurements are optional.</p><p>As relevant evidence is reviewed, this space brings together:</p><ul><li>Prevention actions to review</li><li>Response planning questions</li><li>Source-supported cautions and things to avoid</li></ul><p>Each candidate includes its source, conditions and limits. No scenario-specific steps have been established yet.</p>${timestamp}</section>`;
 const toolbar=`<div class="safety-overview"><strong>${items.length} source-based review steps</strong><p>${reviewed} reviewed · Marks track reading, not completed safety actions. Conditions and limits are in Steps with sources below.</p>${timestamp}<button type="button" data-safety-copy>Copy review brief</button><small data-safety-copy-status role="status"></small></div>`;
 const phaseGroups=phases.map(([phase,title,empty])=>({phase,title,empty,items:priorityOrder(items.filter(i=>i.step?.phase===phase))}));
 const legacy=priorityOrder(items.filter(i=>!i.step));
 // Reuse the exact front-panel order for the numbered evidence appendix.
 const ordered=[...phaseGroups.flatMap(group=>group.items),...legacy];
 let number=0;
 const groups=phaseGroups.map(({phase,title,empty,items:group})=>{
  return `<details open class="safety-phase safety-${phase}" data-safety-detail="phase-${phase}"><summary><h3>${title}</h3><small>${group.length}</small></summary>${phase==='response'?'<p class="safety-scope">Preparation only; not an approved firefighting procedure.</p>':''}${group.length?`<ol class="safety-step-list">${group.map(i=>checklistItem(i,state,++number)).join('')}</ol>`:`<p class="muted">${empty}</p>`}</details>`;
 }).join('');
 return `${stale}${toolbar}${groups}${legacy.length?`<section class="safety-legacy"><h3>Earlier unclassified candidates (${legacy.length})</h3><ol>${legacy.map(i=>checklistItem(i,state,++number)).join('')}</ol></section>`:''}${ordered.length?`<section class="safety-sources" aria-labelledby="safety-sources-title"><h3 id="safety-sources-title">Steps with sources</h3>${ordered.map((i,n)=>sourceDetail(i,n+1)).join('')}</section>`:''}<small>Priority orders review; it does not measure fire severity or prove that a measure will work.</small>`;
}
