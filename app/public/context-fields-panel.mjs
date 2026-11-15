import {cleanContextState,receiveContextFields,editContextValue,contextValueError,contextMaterialUi,CONTEXT_LIMITS} from './context-fields.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function contextFieldHtml(field,state){
 const id='context-'+field.id,value=state.values[field.id]||'';
 return `<section class="context-field" data-field-id="${field.id}"><label for="${id}">${esc(field.label)}${field.unit?` <span>${esc(field.unit)}</span>`:''}</label><input id="${id}" data-context-input="${field.id}" type="text" ${field.kind==='number'?'inputmode="decimal"':''} ${field.kind==='choice'?`list="${id}-options"`:''} maxlength="${CONTEXT_LIMITS.value}" value="${esc(value)}" placeholder="${field.kind==='choice'?'Choose or type your answer':'Optional'}" aria-describedby="${id}-reason ${id}-error">${field.kind==='choice'?`<datalist id="${id}-options">${field.options.map(v=>`<option value="${esc(v)}"></option>`).join('')}</datalist>`:''}<small id="${id}-reason">${esc(field.reason)}</small><small class="context-error" id="${id}-error" role="status">${esc(contextValueError(field,value))}</small></section>`;
}
export function installContextFields({container,onEdit=()=>{},onExpand=()=>{},onMaterial=()=>{}}){
 let state=cleanContextState();
 container.innerHTML='<div class="context-heading"><small>FOR YOUR QUESTION</small><h3>Helpful details</h3><p>Optional. Leave unknown details blank.</p></div><div class="context-active"></div><div class="context-footer"></div>';
 const activeRoot=container.querySelector('.context-active'),footer=container.querySelector('.context-footer');
 function render(){
  state=cleanContextState(state);
  const scroll=container.closest('aside')?.scrollTop,active=state.fields.filter(f=>state.active.includes(f.id)),saved=state.fields.filter(f=>!state.active.includes(f.id)&&(state.values[f.id]||state.unavailable.includes(f.id)));
  container.hidden=!state.fields.length;
  // Reconcile field nodes: a branch change must not recreate the parent input,
  // move its caret, or reset the user's sidebar scroll.
  for(const node of [...activeRoot.children])if(!state.active.includes(node.dataset.fieldId))node.remove();
  active.forEach((f,i)=>{let node=activeRoot.querySelector('[data-field-id="'+f.id+'"]'),signature=JSON.stringify(f);if(!node||node._definition!==signature){const holder=document.createElement('div');holder.innerHTML=contextFieldHtml(f,state);const next=holder.firstElementChild;next._definition=signature;if(node)node.replaceWith(next);node=next;}if(activeRoot.children[i]!==node)activeRoot.insertBefore(node,activeRoot.children[i]||null);
   const input=node.querySelector('input'),value=state.values[f.id]||'',error=contextValueError(f,value);if(input.value!==value)input.value=value;input.setCustomValidity(error);input.setAttribute('aria-invalid',String(Boolean(error)));node.querySelector('.context-error').textContent=error;});
  const wasOpen=footer.querySelector('details')?.open;
  footer.innerHTML=saved.length?'<details class="saved-context"'+(wasOpen?' open':'')+'><summary>Saved details · '+saved.length+'</summary><p>Inactive answers are retained in this chat and excluded from the current search. Conditional answers return when their branch is selected.</p>'+saved.map(f=>'<p><strong>'+esc(f.label)+'</strong>: '+esc(state.values[f.id]||'Unknown')+' '+esc(f.unit)+(f.showWhen?'':' <button type="button" data-context-restore="'+f.id+'">Use again</button>')+' <button type="button" data-context-remove="'+f.id+'">Remove</button></p>').join('')+'</details>':'';
  onMaterial(contextMaterialUi(state));
  if(scroll!=null)container.closest('aside').scrollTop=scroll;
 }
 container.addEventListener('input',e=>{const id=e.target.dataset.contextInput;if(!id)return;state=editContextValue(state,id,e.target.value);render();onEdit();});
 container.addEventListener('click',e=>{
  const restore=e.target.closest('[data-context-restore]'),remove=e.target.closest('[data-context-remove]');
  if(restore){const offered=[...new Set([...state.offered,restore.dataset.contextRestore])],next=cleanContextState({...state,offered});if(next.offered.length!==offered.length){container.querySelector('h3').textContent='Six details are already active. Continue in chat to change them.';return;}state=next;}
  else if(remove){const id=remove.dataset.contextRemove;delete state.values[id];state.unavailable=state.unavailable.filter(k=>k!==id);if(!state.offered.includes(id))state.fields=state.fields.filter(f=>f.id!==id);}
  else return;
  render();onEdit();
 });
 render();
 return {snapshot:()=>cleanContextState(state),restore(value){state=cleanContextState(value);render();},receive(update,canGuide=true){const next=receiveContextFields(state,update,canGuide);state=next.state;render();if(next.newRequests.length)onExpand();},validate(){for(const field of state.fields.filter(f=>state.active.includes(f.id))){const error=contextValueError(field,state.values[field.id]);if(error){const input=container.querySelector('#context-'+field.id);onExpand();input.focus({preventScroll:true});input.reportValidity();return false;}}return true;}};
}
