import {sourceBriefingHtml,sourceBriefingText,briefingReviewHtml} from './source-briefing.mjs';
import {ensureTurnCapacity} from './dialogue-flow.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// An environment transfer deliberately excludes dialogue, results and prior advice.
export function newConversationContext(environment){
 const fields=['gravityMs2','temperatureK','oxygen','pressure','airflow','thicknessMm'];
 const context={scenario:'',conditions:{},conditionBasis:{},material:'',atmosphere:'',recommendations:{items:[],stale:false}};
 if(!environment)return context;
 context.material=String(environment.material||'');context.atmosphere=String(environment.atmosphere||'');
 if(typeof environment.gravityInput==='string')context.gravityInput=environment.gravityInput.slice(0,80);
 context.conditions={gravity:'other',material:String(environment.conditions?.material||''),...Object.fromEntries(fields.map(k=>[k,typeof environment.conditions?.[k]==='number'&&Number.isFinite(environment.conditions[k])?environment.conditions[k]:null]))};
 context.conditionBasis=Object.fromEntries(Object.entries(environment.conditionBasis||{}).filter(([k,v])=>(fields.includes(k)||k==='material')&&['user_reported','estimated'].includes(v)));
 return context;
}
export function modelHistory(messages){return messages.filter(m=>m.role!=='application'&&m.text!=='Environment submitted').slice(-8).map(m=>({role:m.role==='assistant'?'assistant':'user',text:m.role==='assistant'?[m.response?.analysis?.summary,...(m.response?.analysis?.questions||[])].join(' ').slice(0,1400):m.text.slice(0,1400)}));}

export function providerName(p){
 if(/openai/i.test(p?.name||p?.requestedModel||'')||/^gpt-|^o[1-9]/.test(p?.requestedModel||p?.modelVersion||''))return 'OpenAI';
 if(/gemini|google/i.test([p?.name,p?.requestedModel,p?.modelVersion].join(' ')))return 'Gemini';
 return 'AI provider';
}

export function providerDetails(p){
 if(!p)return '<small class="origin-label">Provider receipt unavailable for this older message.</small>';
 const name=providerName(p);
 const label=p.delivery==='cache'?`Cached ${name} response · no new API call`:p.httpStatus===200?`${name} API · response received`:`${name} API request · no verified answer`;
 return `<details class="provider-details"><summary>${esc(label)}</summary><dl><dt>Requested model</dt><dd>${esc(p.requestedModel)}</dd><dt>Returned model</dt><dd>${esc(p.modelVersion||'Not supplied by provider')}</dd><dt>Response ID</dt><dd>${esc(p.responseId||'Not supplied by provider')}</dd><dt>HTTP status</dt><dd>${esc(p.httpStatus??'No response')}</dd><dt>Received</dt><dd>${esc(p.receivedAt||'Not received')}</dd><dt>Source validation</dt><dd>${esc(p.validation)}</dd>${p.agentSkills?.length?`<dt>Application skills</dt><dd>${p.agentSkills.map(s=>esc(s.id)+" · "+esc(s.version)).join("<br>")}</dd>`:""}<dt>Tokens (input / output)</dt><dd>${esc(p.usage?.promptTokenCount??'unknown')} / ${esc(p.usage?.candidatesTokenCount??'unknown')}</dd></dl><p>These are transport and validation records, not proof that a scientific conclusion is correct.</p></details>`;
}

export function recommendationReviewHtml(review){
 if(!review)return '';
 const conflict=review.issues?.some(i=>i.code==='action_items_conflict');
 const missingPrior=review.issues?.some(i=>i.code==='prior_source_not_supplied');
 return '<div class="evidence-gap" role="status"><strong>Recommendation update not applied</strong><p>'+ (conflict?'The model combined a keep/clear action with a new recommendation list.':missingPrior?'A previous candidate’s source was not included in the current evidence, so it could not be marked reviewed.':'The recommendation update was incomplete or could not be verified.')+' Your reply and validated research results are retained. Previous fire-safety recommendations were not replaced or cleared and still await review.</p></div>';
}

export function assessmentReviewHtml(a){
 if(!a.assessmentReview?.unscored?.length)return '';
 const recommendations=a.recommendationsReviewed===true&&a.recommendations?.action==='replace'?'Source-traceable research/design candidates were updated separately.':'Previous recommendations remain pending review.';
 return '<div class="evidence-gap" role="status"><strong>Some source scores are unavailable</strong><p>Sources without complete scoring explanations are listed without a score; other validated scores remain available. '+recommendations+'</p><ul>'+a.assessmentReview.unscored.map(x=>'<li>'+esc(x.sourceId)+': explanation unavailable for '+x.dimensions.map(d=>esc(d.dimension)).join(', ')+'.</li>').join('')+'</ul></div>';
}

function answerHtml(m){
 const a=m.response?.analysis;if(!a)return `<p>${esc(m.text)}</p>`;
 let html=(m.response.displayNotice?'<p class="emergency-note">'+esc(m.response.displayNotice)+'</p>':'')+(a.emergency?'<p class="emergency-note">Active incident: follow applicable site/crew emergency procedures. Do not wait for this research tool.</p>':'')+`<p>${esc(a.summary)}</p>`;
 html+=(a.questions||[]).map(q=>`<p class="research-question">${esc(q)}</p>`).join('');
 html+=sourceBriefingHtml(a.sourceBriefs,{compact:true,incident:a.emergency})+briefingReviewHtml(a.briefingReview);
 html+=assessmentReviewHtml(a);
 if(a.assessmentReview?.zeroExplanations?.length)html+='<details><summary>Zero-point scoring notes</summary><p>No score was changed. Some zero-point dimensions had no usable model explanation; an administrative note is shown instead.</p></details>';
 html+=recommendationReviewHtml(a.recommendationReview);
 html+=(a.items||[]).map(i=>`<div class="answer-item"><strong>${esc(i.sourceId)} · ${esc(i.evidenceType)}</strong><p>${esc(i.text)}</p><details><summary>Evidence and limitations</summary><blockquote>${esc(i.quote)}</blockquote><p>${esc(i.limitation)}</p><button data-open="${esc(i.sourceId)}">Open source</button></details></div>`).join('');
 if(a.conditionSuggestionReview?.rejected?.length)html+='<details><summary>Input suggestions</summary><p>Unverified or redundant suggestions were skipped. Your entered conditions are unchanged.</p></details>';
 if(a.conditionAutofill?.updates?.length)html+='<details><summary>Conditions copied from your message</summary><p class="muted">User-provided conditions, not source measurements. These values were used for this turn.</p>'+a.conditionAutofill.updates.map(s=>`<p>${esc(s.key)}: ${s.value===null?'cleared':esc(s.value)+' '+esc(s.unit)} · ${esc(s.basis)}<br><small>“${esc(s.quote)}”${s.conversion&&s.conversion!=='identity'?' · '+esc(s.conversion):''}</small></p>`).join('')+'</details>';
 if(a.conditionSuggestions?.length)html+='<details><summary>Additional details needing review</summary>'+a.conditionSuggestions.map((s,i)=>`<p>${esc(s.key)}: ${esc(s.value)} ${esc(s.unit)} · ${esc(s.basis)}<br><small>“${esc(s.quote)}”</small> <button data-suggestion-message="${esc(m.id)}" data-suggestion-index="${i}" ${m.applied?.includes(i)?'disabled':''}>${m.applied?.includes(i)?'Applied':'Apply to optional fields'}</button></p>`).join('')+'</details>';
 if(a.evidenceGaps?.length)html+='<details open><summary>Evidence gaps and useful details</summary>'+a.evidenceGaps.map(g=>'<div class="evidence-gap"><strong>'+esc(g.topic)+'</strong><p>'+esc(g.missing)+'</p><p>'+esc(g.whyItMatters)+'</p><p>'+esc(g.howToProvide)+'</p></div>').join('')+'</details>';
 if(!a.evidenceGaps?.length&&a.unknowns?.length)html+='<details><summary>Evidence gaps</summary><ul>'+a.unknowns.map(s=>`<li>${esc(s)}</li>`).join('')+'</ul></details>';
 return html+`<p>${esc(a.nextStep||'')}</p>`;
}

export async function installConversationPanel({post,sessionToken,hosted=false}){
 const $=s=>document.querySelector(s);
 const savedLabel=hosted?'Saved for this browser on the server':'Saved on this device';
 let state={revision:0,activeId:null,conversations:[]},queue=Promise.resolve(),loadFailed=false,locked=false,onSwitch=()=>{},onApply=()=>false;
 const shell=document.createElement('div');shell.className='conversation-toolbar';shell.innerHTML='<label>Conversation <select id="conversation-select" aria-label="Saved conversations"></select></label><small id="conversation-save" role="status">Loading conversation history…</small>';
 $('.chat-transcript').before(shell);
 const actions=document.createElement('div');actions.className='chat-navigation';actions.innerHTML='<button type="button" id="new-research" title="Start with empty inputs and no previous conversation">New chat</button><button type="button" id="chat-history-open" aria-haspopup="dialog">Chat history</button>';shell.append(actions);
 const history=document.createElement('dialog');history.id='chat-history';history.setAttribute('aria-labelledby','chat-history-title');history.innerHTML='<div class="section-head"><h2 id="chat-history-title">Chat history</h2><button type="button" id="chat-history-close">Close</button></div><p class="muted">Each chat has its own environment, messages and recommendations. Opening an earlier chat restores that chat\'s inputs.</p><input id="chat-history-search" aria-label="Search chat history" placeholder="Search conversations"><div id="chat-history-list"></div>';document.body.append(history);
 const log=document.createElement('div');log.id='conversation-log';log.setAttribute('role','log');log.setAttribute('aria-label','Conversation history');$('.chat-transcript').prepend(log);
 $('#user-message').hidden=true;$('#answer').setAttribute('aria-label','Application status');
 const current=()=>state.conversations.find(c=>c.id===state.activeId);
 function create(context={}){if(state.conversations.length>=50)throw Error('Local history is full (50 conversations). Export your history before continuing.');const c={id:crypto.randomUUID(),title:'New conversation',updatedAt:new Date().toISOString(),messages:[],context:structuredClone(context)};state.conversations.push(c);state.activeId=c.id;return c;}
 function renderHistory(){const q=$('#chat-history-search').value.trim().toLowerCase();$('#chat-history-list').innerHTML=state.conversations.slice().sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).filter(c=>(c.title+' '+c.context?.material).toLowerCase().includes(q)).map(c=>`<button type="button" class="history-entry" data-conversation="${esc(c.id)}" ${locked?'disabled':''}><strong>${esc(c.title)}${c.id===state.activeId?' · Current':''}</strong><small>${esc(new Date(c.updatedAt).toLocaleString())} · ${c.messages.length} messages${c.context?.material?' · '+esc(c.context.material):''}</small></button>`).join('')||'<p>No matching chats.</p>';}
 function render(){
  const c=current();$('#conversation-select').innerHTML=state.conversations.slice().reverse().map(c=>`<option value="${esc(c.id)}" ${c.id===state.activeId?'selected':''}>${esc(c.title)}</option>`).join('');
  log.innerHTML=(c?.messages||[]).map(m=>`<article class="conversation-message ${esc(m.role)}" data-message-id="${esc(m.id)}"><div class="message-author">${m.role==='user'?'You':m.role==='application'?'Application notice':m.response?.provider?esc(providerName(m.response.provider)):'Assistant · origin not recorded'} <time>${esc(new Date(m.at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}))}</time></div>${m.role==='assistant'?answerHtml(m):`<p>${esc(m.text)}</p>`}${m.role!=='user'?providerDetails(m.response?.provider||m.provider):''}</article>`).join('');
  $('#copy-answer').hidden=!(c?.messages.some(m=>m.role==='assistant'));$('.chat-transcript').scrollTop=$('.chat-transcript').scrollHeight;
  if(history.open)renderHistory();
 }
 async function save(){
  if(loadFailed){$('#conversation-save').textContent='History unavailable; this session is not saved.';return;}
  queue=queue.catch(()=>{}).then(async()=>{const copy=structuredClone(state);$('#conversation-save').textContent=hosted?'Saving conversation…':'Saving locally…';try{const r=await post('/api/conversations',copy);state.revision=r.revision;$('#conversation-save').textContent=savedLabel;}catch(e){$('#conversation-save').textContent='Not saved: '+e.message;}});return queue;
 }
 function append(m){const c=current()||create();if(c.messages.length>=500)throw Error('This conversation is full. Start a new conversation; existing messages are retained.');m={id:crypto.randomUUID(),at:new Date().toISOString(),...m};c.messages.push(m);c.updatedAt=m.at;if(m.role==='user'&&c.title==='New conversation')c.title=m.text.slice(0,80);render();save();return m;}
 try{const response=await fetch('/api/conversations',{headers:{'X-Flame-Session':sessionToken}});const data=await response.json();if(!response.ok)throw Error(data.error);state=data;$('#conversation-save').textContent=savedLabel;}catch(e){loadFailed=true;$('#conversation-save').textContent='History unavailable: '+e.message;}
 if(!current())create();render();
 function switchConversation(id){if(locked||!state.conversations.some(c=>c.id===id))return;state.activeId=id;$('#answer').textContent='';render();onSwitch(structuredClone(current().context));save();history.close();}
 $('#conversation-select').onchange=()=>switchConversation($('#conversation-select').value);
 $('#chat-history-open').onclick=()=>{renderHistory();history.showModal();};$('#chat-history-close').onclick=()=>history.close();$('#chat-history-search').oninput=renderHistory;
 $('#chat-history-list').onclick=e=>{const b=e.target.closest('[data-conversation]');if(b)switchConversation(b.dataset.conversation);};
 log.onclick=e=>{const b=e.target.closest('[data-suggestion-message]');if(!b||locked)return;const m=current().messages.find(m=>m.id===b.dataset.suggestionMessage),i=Number(b.dataset.suggestionIndex),s=m?.response?.analysis?.conditionSuggestions?.[i];if(s&&onApply(s)){m.applied=[...(m.applied||[]),i];render();save();}};
 return {
  get busy(){return locked;},
  ensureTurn(){ensureTurnCapacity(current()?.messages||[]);},
  get context(){return structuredClone(current()?.context||{});},
  setHandlers(handlers){onSwitch=handlers.onSwitch;onApply=handlers.onApply;},
  setContext(ctx){current().context=structuredClone(ctx);return save();},
  user(text,mode='chat'){return append({role:'user',text,mode});},
  response(r,mode='chat'){return append({role:'assistant',text:r.analysis.summary,mode,response:{analysis:r.analysis,provider:r.provider,model:r.model,cached:r.cached,createdAt:r.createdAt,displayNotice:r.displayNotice}});},
  error(e){return append({role:'application',text:(e.provider?.httpStatus===200?providerName(e.provider)+' responded, but the application could not validate the answer. No scientific results were applied. ':'')+e.message+(e.code?' ['+e.code+']':''),provider:e.provider,failed:true});},
  notice(text){return append({role:'application',text});},
  pending(text=''){locked=Boolean(text);$('#conversation-select').disabled=locked;for(const id of ['new-research','new-environment-chat'])$('#'+id)?.toggleAttribute('disabled',locked);$('#answer').textContent=text;if(history.open)renderHistory();},
  history(){return modelHistory(current()?.messages||[]);},
  newConversation({environment}={}){if(locked)return false;try{const c=create(newConversationContext(environment));$('#answer').textContent='';render();onSwitch(structuredClone(c.context));save();history.close();return true;}catch(e){$('#conversation-save').textContent=e.message;return false;}},
  lastText(){const m=[...(current()?.messages||[])].reverse().find(m=>m.role==='assistant');return [m?.text,sourceBriefingText(m?.response?.analysis?.sourceBriefs||[])].filter(Boolean).join('\n\n');},
  flush:()=>queue
 };
}
