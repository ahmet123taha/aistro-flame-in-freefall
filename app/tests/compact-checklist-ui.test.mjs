import test from 'node:test';
import assert from 'node:assert/strict';
import {safetyStepsHtml} from '../public/safety-steps-panel.mjs';
import {safetyStepKey} from '../public/safety-workspace.mjs';
import {contextFieldHtml} from '../public/context-fields-panel.mjs';
import {cleanContextState,receiveContextFields,editContextValue,contextForModel} from '../public/context-fields.mjs';

function item(phase,n){return {sourceId:'PSI-'+n,title:'TEST ONLY heading '+n,text:'TEST ONLY complete action '+n+'; retain the conditional limitation in this sentence.',priority:'medium',field:'fileText',quote:'TEST ONLY full source passage '+n,limitation:'TEST ONLY full limit '+n,relevance:'TEST ONLY reason '+n,step:{phase,when:'TEST ONLY condition '+n,ifUnknown:'TEST ONLY unknown branch '+n,check:'TEST ONLY verification '+n}};}

test('step numbers continue across phases and map to the same bottom evidence records',()=>{
 const prevention=item('prevention',1),response=item('response',2),avoid=item('avoid',3);
 const html=safetyStepsHtml({items:[avoid,prevention,response],reviewed:[safetyStepKey(response)]});
 const appendix=html.indexOf('id="safety-sources-title"'),front=html.slice(0,appendix),back=html.slice(appendix);
 for(const [i,step] of [prevention,response,avoid].entries()){
  const number=i+1,key=safetyStepKey(step);
  assert.ok(front.includes(`<li value="${number}"`));assert.ok(front.includes(step.text));
  assert.ok(front.includes(`href="#safety-source-${key}"`));assert.ok(back.includes(`id="safety-source-${key}"`));
  assert.ok(back.includes(`<strong>${number}.</strong> ${step.sourceId}`));
  for(const detail of [step.quote,step.limitation,step.relevance,step.step.when,step.step.ifUnknown,step.step.check]){
   assert.ok(!front.includes(detail),detail);assert.ok(back.includes(detail),detail);
  }
 }
 assert.match(front,new RegExp(`data-safety-review="${safetyStepKey(response)}"[^>]*checked`));
 assert.doesNotMatch(front,/step-heading|<h4>|Why it matters/);
});

test('stale reading marks remain disabled and scientific action text is never clipped',()=>{
 const step=item('prevention',1);step.text+=' Do not generalize to untested conditions.'.repeat(20);
 const html=safetyStepsHtml({items:[step],stale:true});
 assert.ok(html.includes(step.text));assert.match(html,/data-safety-review="[^"]+"[^>]*disabled/);
 assert.match(html,/current situation/);
});

test('optional contextual fields have one editable input with no unknown button or duplicate unknown prompt',()=>{
 const field={id:'storage_arrangement',label:'Storage arrangement',kind:'text',reason:'How the material is arranged.',unit:'',options:[]};
 let state=receiveContextFields({}, {action:'replace',fields:[field]}).state;
 const empty=contextFieldHtml(field,state);
 assert.match(empty,/placeholder="Optional"/);assert.doesNotMatch(empty,/I do not know|data-context-unknown|<button/);
 assert.equal(contextForModel(state)[0].value,null);assert.equal(contextForModel(state)[0].status,'not_supplied');
 state=editContextValue(state,field.id,'Folded layers');assert.equal(contextForModel(state)[0].value,'Folded layers');
 state=cleanContextState({...state,values:{},unavailable:[field.id]});assert.equal(contextForModel(state)[0].status,'unknown');
 assert.doesNotMatch(contextFieldHtml(field,state),/data-context-unknown|disabled/);
 state=editContextValue(state,field.id,'Rolled');assert.equal(contextForModel(state)[0].status,'user_reported');
});


test('the empty Safety panel invites a scenario without presenting placeholder steps as advice',()=>{
 const html=safetyStepsHtml({items:[]});
 assert.match(html,/Start with your situation/);assert.match(html,/Measurements are optional/);
 assert.match(html,/Prevention actions to review/);assert.match(html,/Response planning questions/);
 assert.match(html,/No scenario-specific steps have been established yet/);
 assert.doesNotMatch(html,/safety-step-list|data-safety-review|data-safety-copy|class="safety-phase/);
});

test('review priority and freshness remain distinguishable from measured risk and completed actions',()=>{
 const html=safetyStepsHtml({items:[item('avoid',1)],updatedAt:'2026-11-15T09:30:00.000Z',stale:true});
 assert.match(html,/medium review/);assert.match(html,/Last source review/);assert.match(html,/Earlier context/);
 assert.match(html,/Marks track reading, not completed safety actions/);assert.match(html,/does not measure fire severity/);
 assert.match(html,/data-open="PSI-1"/);assert.doesNotMatch(html,/data-open="PSI-1"[^>]*disabled/);
});


test('mixed priorities sort stably within each phase and legacy, with exact action/evidence numbering',()=>{
 const fixture=(phase,n,priority)=>{const value={...item(phase,n),priority};if(phase==='legacy')delete value.step;return value;};
 const pLow=fixture('prevention',1,'low'),legacyLow=fixture('legacy',2,'low'),aHigh=fixture('avoid',3,'high');
 const pHighFirst=fixture('prevention',4,'high'),rLow=fixture('response',5,'low'),pMedium=fixture('prevention',6,'medium');
 const aLow=fixture('avoid',7,'low'),rHigh=fixture('response',8,'high'),legacyHigh=fixture('legacy',9,'high'),pHighSecond=fixture('prevention',10,'high');
 const input=[pLow,legacyLow,aHigh,pHighFirst,rLow,pMedium,aLow,rHigh,legacyHigh,pHighSecond],original=structuredClone(input);
 const expected=[pHighFirst,pHighSecond,pMedium,pLow,rHigh,rLow,aHigh,aLow,legacyHigh,legacyLow];
 const html=safetyStepsHtml({items:input}),appendix=html.indexOf('id="safety-sources-title"');
 const front=html.slice(0,appendix),back=html.slice(appendix),rows=[...front.matchAll(/<li value="(\d+)"[^>]*>([\s\S]*?)<\/li>/g)];
 assert.equal(rows.length,expected.length);
 const evidenceKeys=[...back.matchAll(/class="safety-step-source" id="safety-source-([^"]+)"/g)].map(match=>match[1]);
 assert.deepEqual(evidenceKeys,expected.map(safetyStepKey));
 for(const [index,value] of expected.entries()){
  const number=index+1,key=safetyStepKey(value),row=rows[index];
  assert.equal(Number(row[1]),number);assert.ok(row[2].includes(value.text));
  assert.ok(row[2].includes(`href="#safety-source-${key}"`));assert.ok(row[2].includes(`>[${number}]</a>`));
  const detail=back.slice(back.indexOf(`id="safety-source-${key}"`));
  assert.ok(detail.startsWith(`id="safety-source-${key}" data-safety-detail="${key}"><summary><strong>${number}.</strong> ${value.sourceId}`));
 }
 assert.deepEqual(input,original,'display sorting must not mutate saved conversation order');
});
