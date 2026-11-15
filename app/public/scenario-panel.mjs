import {CONDITION_LABELS,cleanPanelState,receiveConditionRequests} from './condition-requests.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// Owns the panel, not the research state. No network calls or value assignment here.
export function installScenarioPanel({onChange=()=>{},onSkip=()=>false,focusConversation=()=>{}}){
 const $=s=>document.querySelector(s),layout=$('.layout'),body=$('#conditions-body'),toggle=$('#conditions-toggle'),notice=$('#condition-request-notice');
 let state=cleanPanelState(),busy=false;
 function render(){
  layout.classList.toggle('conditions-collapsed',!state.expanded);body.inert=!state.expanded;body.setAttribute('aria-hidden',String(!state.expanded));toggle.setAttribute('aria-expanded',String(state.expanded));toggle.setAttribute('aria-label',state.expanded?'Collapse optional conditions':'Open optional conditions');
  toggle.querySelector('[data-condition-arrow]').textContent=state.expanded?'‹':'›';
  $('#conditions-count').textContent=state.requests.length?String(state.requests.length):'';
  for(const el of document.querySelectorAll('.condition-request-hint'))el.remove();
  for(const label of document.querySelectorAll('#environment-inputs label'))label.classList.remove('condition-requested');
  notice.hidden=!state.requests.length;
  notice.innerHTML=state.requests.length?'<strong>Helpful, if you know them</strong><p>You can leave these blank and continue with the research.</p><ul>'+state.requests.map(r=>'<li><button type="button" data-focus-condition="'+r.key+'">'+esc(CONDITION_LABELS[r.key])+'</button><small>'+esc(r.reason)+'</small></li>').join('')+'</ul><button id="skip-conditions" type="button" '+(busy?'disabled':'')+'>Continue without these details</button>':'';
  for(const r of state.requests){const input=$('#'+(r.key==='material'?'material-query':r.key==='atmosphere'?'atmosphere-description':r.key)),label=input?.closest('label');if(!label)continue;label.classList.add('condition-requested');const hint=document.createElement('small');hint.className='condition-request-hint';hint.textContent=r.reason;label.append(hint);}
 }
 function expand(value,focus=false){if(!value&&body.contains(document.activeElement))toggle.focus({preventScroll:true});state.expanded=value;render();onChange();if(focus&&value)$('#material-query')?.focus({preventScroll:true});}
 toggle.onclick=()=>expand(!state.expanded);
 notice.onclick=e=>{const target=e.target.closest('[data-focus-condition]');if(target){const key=target.dataset.focusCondition;$('#'+(key==='material'?'material-query':key==='atmosphere'?'atmosphere-description':key))?.focus({preventScroll:false});return;}if(e.target.closest('#skip-conditions')&&!busy){const keys=state.requests.map(r=>r.key);if(!keys.length)return;const prior=structuredClone(state);state.unavailable=[...new Set([...state.unavailable,...keys])];state.requests=[];state.expanded=false;render();if(onSkip(keys)===false){state=prior;render();}else{onChange();focusConversation();}}};
 body.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();expand(false);}});
 render();
 return {
  snapshot:()=>structuredClone(state),
  restore(value){state=cleanPanelState(value);render();},
  receive(requests,canGuide=true){state=receiveConditionRequests(state,requests,canGuide);render();onChange();},
  edited(key){state.unavailable=state.unavailable.filter(k=>k!==key);state.requests=state.requests.filter(r=>r.key!==key);render();},
  expand,
  busy(value){busy=value;const button=$('#skip-conditions');if(button)button.disabled=value;}
 };
}
