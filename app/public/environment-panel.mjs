import {sourceBriefingHtml,sourceBriefHtml} from './source-briefing.mjs';
import {sourceReferenceHtml} from './source-reference.mjs';
import {ENVIRONMENT_QUESTION,planDialogueTurn,cleanScenario,appliesToCurrentTurn} from './dialogue-flow.mjs';
import {readConditionInput,parseGravityInput,gravityInputMessage} from './gravity-input.mjs';
import {renderMaterialSupport} from './material-support-card.mjs';
import {renderParameterComparison} from './parameter-comparison.mjs';
import {installContextFields} from './context-fields-panel.mjs';
import {installScenarioPanel} from './scenario-panel.mjs';
import {CONDITION_LABELS} from './condition-requests.mjs';
import {workspaceEntryHtml} from './workspace-entry.mjs';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fields=['gravityMs2','temperatureK','oxygen','pressure','airflow','thicknessMm'];
export function unscoredResearchCards(items,records){
 return items.map(m=>{const r=records.find(r=>r.id===m.id),a=m.assessment;return '<article class="research-card unscored-source"><div class="research-score">—<small>Score unavailable</small></div><div><h3>'+esc(r?.title||m.id)+' <small>'+esc(m.id)+'</small></h3><p>'+esc(a.reason)+'</p><p>Scoring explanation unavailable: '+a.scoringIssues.map(x=>esc(x.dimension)).join(', ')+'. No total was assigned to this source.</p><details><summary>Source evidence and scoring limitation</summary><blockquote>'+esc(a.quote)+'</blockquote>'+sourceReferenceHtml(a.evidenceProvenance)+'<p>'+esc(a.limitation)+'</p></details><button data-open="'+esc(m.id)+'">Open report</button> <button data-data="'+esc(m.id)+'">Data / conditions</button> <button data-ai="'+esc(m.id)+'">✦ Continue with AI</button></div></article>';}).join('');
}
const conditionNames={gravityMs2:'Gravity',temperatureK:'Temperature',oxygen:'Oxygen',pressure:'Pressure',airflow:'Gas velocity',thicknessMm:'Thickness'};
const materialNote=t=>t?.materialRelation==='different_material'?'Different source material: '+t.sourceMaterial+'. Environment proximity does not establish equivalent burning.':t?.materialRelation==='source_not_identified'?'Source material not identified; material transfer is unverified.':t?.materialRelation==='not_specified'?'No material supplied; material transfer has not been assessed.':'';
export function conditionSummaryHtml(m){
 const status=m.numericStatus||(m.coverage.compared?'partial':m.coverage.provided?'unavailable':'not_requested');
 const numeric=status==='unavailable'?'not comparable (60 points unassessed)':status==='not_requested'?'not supplied':m.numericPoints.toFixed(1)+' / '+(status==='partial'?(m.numericBudget-m.unscoredPoints).toFixed(1)+' assessed':m.numericBudget);
 return '<p>Conditions: '+numeric+' · Scenario: '+(m.scenarioPoints===null?'unavailable (AI request failed)':m.scenarioPoints.toFixed(1)+' / 40')+(m.estimated.length?' · Includes your estimates':'')+'</p>';
}
export function sourceCoverageHtml(m){
 const c=m.conditionCoverage;if(!c)return '';
 const positions={reported_value:'A reported value; not necessarily an exact joint trial',between_reported_values:'Between reported values; no interpolation applied',below_reported_span:'Below reported span',above_reported_span:'Above reported span',not_supplied:'Input not supplied'};
 const label={same_material_evidence:'Same-material experimental series / reviewed graphs',other_material_context:'Other-material context; transfer needs review',literature_review:'Literature to review; numerical coverage not indexed'}[c.usability.status];
 let html='<p class="source-usability"><strong>Usefulness:</strong> '+esc(label)+'.</p>';
 html+='<details class="source-coverage"><summary>Study series, graphs and physical basis</summary><p>'+esc(c.usability.meaning)+'</p><p>'+esc(c.limitation)+'</p>';
 html+=c.series.map(g=>'<section><h4>'+esc(g.material||'Material not identified')+' · '+g.sourceRowCount+' source rows'+(g.materialRelation==='same_family'?' · same material family':' · material transfer unverified')+'</h4><ul>'+g.ranges.map(r=>'<li>'+esc(conditionNames[r.key])+': '+esc(r.min)+'–'+esc(r.max)+' '+esc(r.unit)+' · '+r.distinctValues+' reported values. '+esc(positions[r.position])+'. <small>Source '+esc(r.lower.provenance.fileId)+', trial '+esc(r.lower.runId)+(r.lower.provenance.page?', PDF page '+esc(r.lower.provenance.page):', row '+esc(r.lower.provenance.row))+'; upper end '+esc(r.upper.provenance.fileId)+', trial '+esc(r.upper.runId)+'.</small></li>').join('')+'</ul></section>').join('');
 if(!c.series.length)html+='<p>No normalized condition series is indexed. This does not mean the report has no useful findings or graphs; review the original source.</p>';
 html+=c.figures.map(f=>'<section><h4>'+esc(f.title)+' · '+esc(f.material)+'</h4><p>'+esc(f.caption)+'</p><p>'+esc(f.fidelity)+'</p><small>Verified file '+esc(f.fileId)+' · PDF page '+esc(f.page)+'. '+(f.materialRelation==='same_family'?'Same material family; geometry and regime still need review.':'Not a material-equivalence claim for your specimen.')+'</small></section>').join('');
 html+='<h4>Physical / material / thermodynamic support</h4><p>'+esc(c.physics.limitation)+'</p><p><strong>Parameter tolerance:</strong> '+esc(c.physics.tolerance.meaning)+'</p>';
 html+=c.physics.models.map(model=>'<section><strong>'+esc(model.title)+'</strong><p>'+esc(model.formula)+'</p><p>'+esc(model.mechanism)+'</p>'+(model.properties?'<p>Source PMMA assumptions: conductivity '+esc(model.properties.conductivityWcmK)+' W/(cm K), diffusivity '+esc(model.properties.diffusivityCm2S)+' cm²/s, density '+esc(model.properties.densityGcm3)+' g/cm³, vaporization energy '+esc(model.properties.latentHeatJg)+' J/g, emissivity '+esc(model.properties.emissivity)+'. Source pages '+esc(model.properties.sourcePages.join(', '))+'.</p>':'')+(model.comparison?'<p>'+esc(model.comparison.meaning)+': '+model.comparison.closeness.toFixed(1)+'%.</p>':'')+(model.evaluation?.status==='calculated'?'<p>Source energy balance: Pe '+model.evaluation.peclet.toFixed(3)+', required heat flux '+model.evaluation.heatFluxWcm2.netRequired.toFixed(4)+' W/cm². This is required heat, not measured flame heat.</p><ul>'+model.evaluation.sensitivities.map(x=>'<li>'+esc(x.key)+': local net-flux elasticity '+esc(x.net===null?'not defined':x.net.toFixed(4))+'</li>').join('')+'</ul><p>'+esc(model.evaluation.limitation)+'</p>':'')+'<ul>'+(model.applicability?.reasons||model.evaluation?.reasons||[]).map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></section>').join('');
 html+=(c.studySummaries||[]).filter(e=>e.materialRelation==='same_family').slice(0,4).map(e=>'<section><h4>Reviewed local source fragment</h4><p>'+esc(e.text)+'</p><small>'+esc(e.provenance.fileId)+' / '+esc(e.scope)+'</small></section>').join('');
 return html+'<button data-data="'+esc(m.id)+'">View source series / graphs</button></details>'+renderMaterialSupport(c.materialApplicability);
}
export function researchScoreHtml(m){
 const assessed=m.assessedMaxPoints??m.maxPoints-(m.unscoredPoints||0),partial=assessed<m.maxPoints,denominator=Number(assessed.toFixed(1));
 const points=m.total.toFixed(1)+' / '+denominator+' assessed points';
 if(m.parameterSupport?.percent!=null)return m.parameterSupport.percent.toFixed(1)+'%<small>Parameter proximity<br>'+m.coverage.compared+' / '+m.coverage.provided+' inputs supported<br>'+points+'<br>'+(m.mode==='local_discovery'?'Local search · AI unavailable':partial?'Overall match incomplete':'Research relevance, not burn equivalence')+'</small>';
 if(m.parameterSupport&&m.conditionCoverage?.usability.sameMaterialSeries)return '<span class="material-source-label">Same-material source</span><small>'+(assessed?points:'No numerical inputs')+'<br>No numerical condition percentage'+(m.mode==='local_discovery'?'<br>AI unavailable':'')+'</small>';
 return m.total.toFixed(1)+'<small>/ '+denominator+' assessed points<br>'+(partial?'Overall match incomplete':'Research relevance')+'</small>';
}
export function parameterEvidenceHtml(m){
 const p=m.parameterSupport;if(!p)return '';
 const location=c=>[c.provenance?.fileId,c.provenance?.page?'PDF page '+c.provenance.page:null,c.evidence?.sheet||c.provenance?.sheet,c.evidence?.cell,c.provenance?.row?'row '+c.provenance.row:null].filter(Boolean).map(esc).join(' / ');
 const items=p.contributions.map(c=>'<li><strong>'+esc(conditionNames[c.key])+': '+esc(c.input)+'</strong> · '+(c.score===null?'unassessed: no supported indexed value':c.score.toFixed(2)+'% proximity to '+(c.kind==='reported_marginal_span'?'reported span '+c.range.map(esc).join(' to ')+(c.withinSpan?' (inside span; no joint-trial claim)':''):esc(c.observed))+' · '+esc(c.kind.replaceAll('_',' '))+' · '+location(c)+(c.approximate?' · approximate source setting':''))+'</li>').join('');
 return '<h4>Source-backed parameter evidence</h4><ul>'+items+'</ul><p>'+esc(p.limitation)+'</p><p>'+(p.jointlyTested?'The compared values share one reported source row.':'Parameters may be supported by different source fragments. No combined experiment or burning outcome was created.')+'</p>';
}
export function researchCards(result,records){
 return sourceBriefingHtml(result.sourceBriefs,{title:'Findings for your scenario'})+(result.notice?'<p class="local-discovery-notice">'+esc(result.notice)+'</p>':'')+result.matches.map(m=>{
  const r=records.find(r=>r.id===m.id);
  const coverage=m.coverage.provided?m.coverage.compared+' / '+m.coverage.provided+' inputs assessed from indexed source values.'+(m.unscoredPoints?' '+m.unscoredPoints.toFixed(1)+' points remain unassessed; not a measured mismatch.':''):m.mode==='local_discovery'?'No numerical inputs supplied; AI scenario assessment is unavailable.':'No numerical inputs supplied: scenario-only score.';
  const trial=m.trial?'<details><summary>Nearest individual run (separate check)</summary><p>'+esc(m.trial.runId)+' / '+esc(m.trial.sourceMaterial||'not identified')+' / '+esc(m.trial.provenance?.fileId)+'</p><p>This single row has '+m.trial.numericPoints.toFixed(2)+' numerical points. It is distinct from parameter-wise source support above.</p>'+((m.trial.comparisonWarnings||[]).map(w=>'<p>'+esc(w)+'</p>').join(''))+'</details>':'';
  return `<article class="research-card" data-source-id="${esc(m.id)}"><div class="research-score">${researchScoreHtml(m)}</div><div><h3>${esc(r?.title||m.id)} <small>${esc(m.id)}</small></h3><p>${esc(m.assessment.reason)}</p>${(result.sourceBriefs||[]).some(b=>b.sourceId===m.id)?'<details class="paper-takeaways"><summary>What we extracted for your question</summary>'+(result.sourceBriefs||[]).filter(b=>b.sourceId===m.id).map(b=>sourceBriefHtml(b,{compact:true})).join('')+'</details>':''}${conditionSummaryHtml(m)}<p class="muted">${esc(coverage)}</p>${renderParameterComparison(m.parameterDiagnostics)}${sourceCoverageHtml(m)}<details><summary>Why this source?</summary><p>${esc(m.assessment.limitation)}</p>${m.mode==='local_discovery'?'<p>AI scenario assessment is unavailable. No AI interpretation, scenario score or recommendation has been assigned.</p>':`<blockquote>${esc(m.assessment.quote)}</blockquote>${sourceReferenceHtml(m.assessment.evidenceProvenance)}<h4>Scenario relevance</h4><ul>${m.scenarioBreakdown.map(c=>`<li><strong>${esc(c.key)}: ${c.points.toFixed(2)} / ${c.max}</strong> ${esc(c.reason)}${c.origin?' [Source index; raw model value '+esc(c.modelValue)+']':''}</li>`).join('')}</ul>`}${parameterEvidenceHtml(m)}${trial}<p>Blank inputs excluded: ${m.coverage.excluded.map(k=>esc(conditionNames[k])).join(', ')||'none'}.</p><p>Numerical point proximity uses 100 × min(input, source) / max(input, source). A value inside an explicitly reported marginal span receives full span-coverage credit for discovery, without interpolating outcomes. Only the same source material family is credited when a material is supplied. Parameter proximity, coverage, research usefulness and physical transfer are distinct.</p></details><button data-open="${esc(m.id)}">Open report</button> <button data-data="${esc(m.id)}">Data / conditions</button> <button data-ai="${esc(m.id)}">✦ Continue with AI</button></div></article>`;
 }).join('')+unscoredResearchCards(result.unscored||[],records)||'<p class="empty">No supported source was found for this scenario. Review the evidence gaps in the conversation.</p>';
}

export function installEnvironmentPanel({catalog,post,collapse,status,onInvalidate,onResults,onConversationChange,getContext,setSourceContext=()=>{},getContextRevision=()=>0,conversation,recommendations}){
 const $=s=>document.querySelector(s),form=$('#inputs'),method=$('#matching-method');
 const oldSubmit=form.onsubmit,oldInput=form.oninput,oldReset=$('#reset').onclick,oldChat=$('#ask-form').onsubmit;
 const legacy=document.createElement('details');legacy.id='laboratory-options';legacy.innerHTML='<summary>Specialist experimental comparison inputs</summary>';
 for(const child of [...form.children])legacy.append(child);
 form.append(legacy);
 const core=document.createElement('div');core.id='environment-inputs';
 core.innerHTML='<label class="condition-field"><span class="condition-field-heading"><span class="condition-title">Material used</span></span><small class="condition-field-help" id="material-help">The material you want to investigate, such as fabric, plastic, wood or a fuel. Type a name or choose a suggestion.</small><input id="material-query" maxlength="140" placeholder="Optional · e.g. cotton fabric" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="material-suggestions" aria-labelledby="material-field-title" aria-describedby="material-help material-origin"></label><div id="material-suggestions" role="listbox" hidden></div><small id="material-origin"></small><label class="condition-field"><span class="condition-field-heading"><span class="condition-title" id="atmosphere-field-title">Other known gases</span></span><small class="condition-field-help" id="atmosphere-help">Name other gases only if known. You can write “air” if that is all you know; no composition is assumed. Add concentrations only if known.</small><input id="atmosphere-description" maxlength="1000" placeholder="Optional · air, nitrogen, CO₂…" aria-labelledby="atmosphere-field-title" aria-describedby="atmosphere-help"></label>';
 core.querySelector('.condition-title').id='material-field-title';
 form.prepend(core);
 for(const key of fields){const label=$('#'+key).closest('label');label.hidden=false;core.append(label);}
 const gravityField=$('#gravityMs2'),gravityLabel=gravityField.closest('label');
 function describeField(key,title,help){
  const input=$('#'+key),label=input.closest('label'),unit=label.querySelector('span'),heading=document.createElement('span'),name=document.createElement('span');
  label.classList.add('condition-field');heading.className='condition-field-heading';name.className='condition-title';name.id=key+'-field-title';name.textContent=title;
  if(label.firstChild?.nodeType===3)label.firstChild.remove();
  heading.append(name);if(unit){unit.className='condition-unit';heading.append(unit);}label.prepend(heading);
  input.setAttribute('aria-labelledby',name.id);input.setAttribute('aria-label',title);
  if(help){const hint=document.createElement('small');hint.id=key+'-field-help';hint.className='condition-field-help';hint.textContent=help;label.insertBefore(hint,input);input.setAttribute('aria-describedby',hint.id);}
 }
 describeField('gravityMs2','Gravity (acceleration)');
 describeField('temperatureK','Environment temperature','Temperature around the material, in kelvin (K). For example, 20 °C is 293.15 K.');
 describeField('oxygen','Oxygen concentration','Oxygen in the surrounding gas, as a percentage by volume. Leave blank if unknown.');
 describeField('pressure','Pressure','Pressure of the surrounding gas, in kilopascals (kPa). Leave blank if unknown.');
 describeField('airflow','Ventilation / air movement','Air or gas moving past the material, for example from ventilation or a fan. Enter its speed if known; otherwise describe the airflow in chat.');
 describeField('thicknessMm','Material thickness','Thickness of the material or one layer, in millimetres (mm). Describe a stack or multiple layers in chat.');
 $('#question').setAttribute('aria-label','Describe your situation or ask a research question');
 gravityField.type='text';gravityField.inputMode='text';gravityField.maxLength=80;gravityField.placeholder='e.g. 1.96 or 0.2 g';
 for(const attr of ['min','max','step'])gravityField.removeAttribute(attr);
 gravityField.setAttribute('aria-describedby','gravity-input-hint');gravityLabel.querySelector('.condition-unit').textContent='m/s² or g';
 const gravityHint=document.createElement('small');gravityHint.id='gravity-input-hint';gravityHint.className='condition-field-help';gravityHint.setAttribute('aria-live','polite');gravityLabel.insertBefore(gravityHint,gravityField);
 function syncGravity(){const valid=!Number.isNaN(parseGravityInput(gravityField.value));gravityHint.textContent=gravityInputMessage(gravityField.value);gravityField.setCustomValidity(valid?'':gravityHint.textContent);gravityField.setAttribute('aria-invalid',String(!valid));return valid;}
 const methodLabel=method.closest('label');methodLabel.hidden=true;
 method.insertAdjacentHTML('afterbegin','<option value="research">Environment + scenario research</option>');method.value='research';
 const optional=document.createElement('section');optional.id='optional-conditions';
 const guidance=document.createElement('section');guidance.id='conditions-guidance';guidance.setAttribute('role','note');guidance.setAttribute('aria-labelledby','conditions-guidance-title');
 guidance.innerHTML='<h3 id="conditions-guidance-title">Fill only what you know</h3><p>Every field is optional. Add details that apply to your situation. Leave anything you do not know or do not want to share blank.</p><p>More missing information can limit how specific or well-supported the comparison and advice can be. It does not automatically mean a poor match.</p><p>You can explain everything in chat instead. AI can interpret what you tell it and ask useful questions; it will not invent measurements to fill the gaps.</p>';
 const priorIntroduction=$('#conditions-body h2').nextElementSibling;if(priorIntroduction?.matches('p.muted'))priorIntroduction.replaceWith(guidance);else $('#conditions-body h2').after(guidance);
 form.insertBefore(optional,core);optional.append(core);
 const submit=form.querySelector('button[type=submit]'),reset=$('#reset');form.append(submit,reset);
 const policy=document.createElement('p');policy.className='muted';policy.id='research-policy';policy.textContent='Research can start without any numerical conditions. Add known values later to refine source comparisons.';optional.append(policy);
 optional.append(submit,reset);
 $('#material').closest('label').hidden=true;$('#custom-material-label').hidden=true;
 form.noValidate=true;
 let scenario='',replyLanguage='',inFlight=false,revision=0,basis={},started=false,result=null,panel,contextPanel;
 const guide=document.createElement('section');guide.id='scenario-guide';guide.setAttribute('role','note');guide.innerHTML=workspaceEntryHtml();
 $('.chat-transcript').prepend(guide);
 const savedContext=()=>({focusSourceId:getContext()||null,recommendations:recommendations.snapshot(),scenario,replyLanguage,conditions:conditions(),gravityInput:gravityField.value,conditionBasis:basis,conditionPanel:panel?.snapshot(),contextDetails:contextPanel?.snapshot(),material:query.value,atmosphere:$('#atmosphere-description').value});
 const persist=()=>conversation.setContext(savedContext());
 recommendations.setOnChange(persist);
 const materials=catalog.materialSuggestions||[];
 const query=$('#material-query'),list=$('#material-suggestions');
 let materialGuidance={label:'Material',options:[]};
 const materialNote=document.createElement('small');materialNote.id='material-adaptive-note';list.after(materialNote);
 const canonical=()=>{const q=query.value.trim();return materials.find(m=>m.label.toLowerCase()===q.toLowerCase()||m.id===q.toLowerCase())?.id||q.toLowerCase();};
 const conditions=()=>({gravity:'other',material:canonical(),...Object.fromEntries(fields.map(k=>[k,readConditionInput(k,$('#'+k).value)]))});
 function syncMaterial(){const id=canonical(),option=[...$('#material').options].find(o=>o.value===id);$('#material').value=option?id:'__other__';$('#custom-material').value=query.value.trim();}
 function sourceHint(){if(!query.value.trim()){$('#material-origin').textContent='';return;}const m=materials.find(m=>m.label.toLowerCase()===query.value.trim().toLowerCase()||m.id===query.value.trim().toLowerCase());$('#material-origin').textContent=m?'Indexed source mentions: '+m.sources.map(s=>s.sourceId).filter((v,i,a)=>a.indexOf(v)===i).join(', '):query.value?'Free-text material; source coverage is not confirmed.':'';}
 function suggest(){const q=query.value.trim().toLowerCase(),hinted=materialGuidance.options.map(label=>({label,id:label.toLowerCase(),hint:true}));const pool=hinted.length?hinted:materials;const hits=pool.filter(m=>m.label.toLowerCase().includes(q)||m.id.includes(q)||(q.length>=2&&m.label.toLowerCase().startsWith(q.replace(/^vo/,'wo')))).slice(0,12);list.innerHTML=hits.map((m,i)=>`<button type="button" role="option" data-material-index="${i}">${esc(m.label)}${m.hint?' <small>Suggested search term</small>':''}</button>`).join('');list.hidden=(!q&&!hinted.length)||!hits.length||document.activeElement!==query;query.setAttribute('aria-expanded',String(!list.hidden));list.onclick=e=>{const b=e.target.closest('[data-material-index]');if(!b)return;query.value=hits[Number(b.dataset.materialIndex)].label;list.hidden=true;query.setAttribute('aria-expanded','false');query.dispatchEvent(new Event('input',{bubbles:true}));query.focus();list.hidden=true;query.setAttribute('aria-expanded','false');};sourceHint();}
 query.addEventListener('input',suggest);
 query.addEventListener('focus',suggest);
 query.addEventListener('keydown',e=>{if(e.key==='Escape'){list.hidden=true;query.setAttribute('aria-expanded','false');}if(e.key==='ArrowDown'&&!list.hidden){e.preventDefault();list.querySelector('button')?.focus();}});
 list.onkeydown=e=>{const buttons=[...list.querySelectorAll('button')],i=buttons.indexOf(document.activeElement);if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length]?.focus();}if(e.key==='Escape'){list.hidden=true;query.focus();}};
 function applyMode(){method.value='research';methodLabel.hidden=true;legacy.hidden=true;legacy.open=false;policy.hidden=false;submit.textContent='Update research with known conditions';for(const k of fields)$('#'+k).closest('label').hidden=false;$('#material').closest('label').hidden=true;$('#custom-material-label').hidden=true;}
 form.oninput=e=>{if(e.target.dataset.contextInput)return;syncGravity();recommendations.invalidate();revision++;result=null;syncMaterial();if(fields.includes(e.target.id))delete basis[e.target.id];if(e.target===query)delete basis.material;panel.edited(e.target===query?'material':e.target.id==='atmosphere-description'?'atmosphere':e.target.id);if(method.value!=='research')oldInput(e);else onInvalidate();applyMode();persist();$('#input-state').textContent=started?'Environment changed. Continue in chat to refresh the research.':'';};
 const researchRequest=(question,trigger)=>({incidentMode:recommendations.snapshot().manualIncident,previousRecommendations:recommendations.brief(),question,trigger,scenario,replyLanguage,focusSourceId:getContext(),history:conversation.history(),conditions:conditions(),conditionBasis:basis,contextDetails:contextPanel.snapshot(),unavailableConditions:panel.snapshot().unavailable,atmosphere:$('#atmosphere-description').value});
 function applySuggestion(s){if(inFlight)return false;const entered=s.key==='material'?query.value:$('#'+s.key).value;if(entered!==''){conversation.notice('This field already has a value. Clear it first to apply an extracted suggestion.');return false;}if(s.key==='material')query.value=String(s.value);else $('#'+s.key).value=String(s.value);panel.expand(true);syncGravity();basis[s.key]=s.basis;recommendations.invalidate();syncMaterial();sourceHint();revision++;result=null;onInvalidate();persist();$('#input-state').textContent='Extracted information applied. Continue in chat to refresh results.';return true;}
 function applyAutomaticConditions(updates){
  // The response revision/focus guard runs first. Do not dispatch input events:
  // these values already drove this response's ranking and need no second call.
  for(const s of updates||[]){
   if(!['material',...fields].includes(s.key))continue;
   if(s.key==='material')query.value=s.value??'';else $('#'+s.key).value=s.value??'';
   if(s.value===null)delete basis[s.key];else basis[s.key]=s.basis;
   panel.edited(s.key);
  }
  syncGravity();syncMaterial();sourceHint();persist();
 }
 function restore(ctx){oldReset();recommendations.restore(ctx.recommendations);scenario=cleanScenario(ctx.scenario);guide.hidden=Boolean(scenario);panel.restore(ctx.conditionPanel);contextPanel.restore(ctx.contextDetails);replyLanguage=ctx.replyLanguage||'';basis=ctx.conditionBasis||{};query.value=ctx.material||'';$('#atmosphere-description').value=ctx.atmosphere||'';for(const key of fields)$('#'+key).value=ctx.conditions?.[key]??'';gravityField.value=ctx.gravityInput??ctx.conditions?.gravityMs2??'';syncGravity();method.value='research';applyMode();syncMaterial();sourceHint();result=null;started=Boolean(scenario);revision++;onConversationChange?.();setSourceContext(ctx.focusSourceId||null);onInvalidate();$('#question').value='';$('#input-state').textContent=started?'Chat restored with its saved environment.':'Start by describing your situation or research question. Conditions are optional.';}
 panel=installScenarioPanel({onChange:()=>persist(),focusConversation:()=>$('#question').focus({preventScroll:true}),onSkip:keys=>{if(inFlight||conversation.busy)return false;send('I do not know these optional details: '+keys.map(k=>CONDITION_LABELS[k]).join(', ')+'. Please continue with the research using what I have already described.',true,false);return true;}});
 const contextual=document.createElement('section');contextual.id='context-details';core.before(contextual);
 contextPanel=installContextFields({container:contextual,onExpand:()=>panel.expand(true),onMaterial:guidance=>{const changed=JSON.stringify(guidance)!==JSON.stringify(materialGuidance);materialGuidance=guidance;query.closest('label').querySelector('.condition-title').textContent=guidance.label==='Material'?'Material used':guidance.label;materialNote.textContent=guidance.options.length?'Suggestions follow your selected category; they do not confirm dataset coverage. Changing categories preserves your entered material.':'';if(changed)suggest();},onEdit:()=>{recommendations.invalidate();revision++;result=null;onInvalidate();persist();$('#input-state').textContent='Details changed. Continue in chat or update research when ready.';}});
 conversation.setHandlers({onSwitch:ctx=>{restore(ctx);collapse(false);$('#main-scroll').scrollTop=0;},onApply:applySuggestion});
 restore(conversation.context);
 async function send(question,append,clearDraft=true){if(inFlight||conversation.busy||(!append&&!contextPanel.validate()))return;const c=conditions();if(fields.some(k=>c[k]!==null&&!Number.isFinite(c[k]))){$('#input-state').textContent=gravityField.validationMessage||'Check numerical values.';return;}
  let flow;
  const trigger=append?'chat':'environment';
  try{conversation.ensureTurn();flow=planDialogueTurn({scenario,question,trigger,replyLanguage});}catch(e){$('#input-state').textContent=e.message;return;}
  const body=researchRequest(question,trigger),token=revision+':'+getContextRevision(),focus=getContext();
  scenario=flow.scenario;guide.hidden=Boolean(scenario);replyLanguage=flow.replyLanguage;
  if(flow.updateResearch){recommendations.invalidate();if(!focus){result=null;onInvalidate();}}
  conversation.user(append?question:'Environment submitted','research');if(append&&clearDraft)$('#question').value='';persist();
  inFlight=true;panel.busy(true);started=true;collapse(false);$('#question').focus();$('#ask').disabled=true;submit.disabled=true;conversation.pending('Waiting for OpenAI API…');
  try{const r=await post('/api/research',body);const current=appliesToCurrentTurn(token,revision+':'+getContextRevision(),focus,getContext());conversation.response({...r,displayNotice:!current?'Environment or source focus changed during this request. This answer is retained in history; its research results were not applied.':r.storageWarning},'research');if(!current)return;applyAutomaticConditions(r.conditionUpdates);recommendations.apply(r.analysis);panel.receive(r.analysis.conditionRequests,flow.updateResearch&&!r.analysis.emergency);contextPanel.receive(r.analysis.contextFields,flow.updateResearch&&!r.analysis.emergency); if(flow.updateResearch&&!focus){if(r.analysis.stage==='rank'){result={...r.ranking,sourceBriefs:r.analysis.sourceBriefs||[]};onResults(result);}else{result=null;onInvalidate();}}$('#input-state').textContent=!flow.updateResearch?'Conversation updated. Existing research results are unchanged.':r.analysis.stage==='rank'?'Research sources updated.':'Continue the conversation above; numerical inputs are optional.';}
  catch(e){conversation.error(e);const current=appliesToCurrentTurn(token,revision+':'+getContextRevision(),focus,getContext());if(current)applyAutomaticConditions(e.conditionUpdates);if(current&&flow.updateResearch&&!focus&&e.localDiscovery?.matches?.length){result=e.localDiscovery;onResults(result);$('#input-state').textContent='Local source matches are available. OpenAI scenario interpretation and safety recommendations are unavailable.';}else $('#input-state').textContent='No new research results were applied. Continue the conversation or review the application notice.';}
  finally{inFlight=false;panel.busy(false);conversation.pending();$('#ask').disabled=false;submit.disabled=false;persist();try{await status();}catch{$('#input-state').textContent+=' Application status could not be refreshed.';}}
 }
 function discussScenario(){collapse(false);$('#question').focus();$('#input-state').textContent=scenario?'Continue describing your question. Known conditions are optional.':'Describe your situation and what you want to learn in the conversation. Measurements are optional.';}
 guide.onclick=e=>{const button=e.target.closest('[data-example]');if(button){$('#question').value=button.dataset.example;discussScenario();}};
 form.onsubmit=e=>{e.preventDefault();if(!syncGravity()){$('#input-state').textContent=gravityField.validationMessage;gravityField.focus();return;}if(!scenario){discussScenario();return;}send(ENVIRONMENT_QUESTION,false);};
 $('#ask-form').onsubmit=e=>{if(!syncGravity()){e.preventDefault();$('#input-state').textContent=gravityField.validationMessage;gravityField.focus();return;}if(method.value!=='research')return oldChat(e);e.preventDefault();const q=$('#question').value.trim();if(q)send(q,true);};
 const resetScenario=$('#new-research');
 function startChat(keepEnvironment){if(inFlight||conversation.busy)return;const environment=keepEnvironment?savedContext():undefined;if(conversation.newConversation({environment})){collapse(false);$('#main-scroll').scrollTop=0;$('#question').focus();}}
 resetScenario.onclick=()=>startChat(false);
 const environmentChat=document.createElement('button');environmentChat.type='button';environmentChat.id='new-environment-chat';environmentChat.textContent='New chat with these inputs';environmentChat.title='Keep only the current environment. Start without previous messages, source focus, results or recommendations.';submit.after(environmentChat);environmentChat.onclick=()=>startChat(true);
 reset.textContent='Clear known conditions';
 reset.onclick=()=>{if(inFlight||conversation.busy)return;oldReset();method.value='research';query.value='';$('#atmosphere-description').value='';basis={};panel.restore({expanded:true});contextPanel.restore({});syncGravity();sourceHint();recommendations.invalidate();revision++;result=null;onInvalidate();applyMode();persist();$('#input-state').textContent='Known conditions cleared. Your conversation is retained; continue in chat to refine the research.';};
 applyMode();collapse(false);
 return {get result(){return result;},get active(){return method.value==='research';},snapshot:()=>({scenario,history:conversation.history(),conditions:conditions(),conditionBasis:basis,ranking:result}),conditions,discussSource:()=>send("Discuss the selected study for my current question. Give its most useful supported finding and the main limitation; use only this study’s supplied evidence.",true,false),persistFocus:persist};
}
