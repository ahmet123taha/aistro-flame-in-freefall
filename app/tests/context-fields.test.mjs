import {providerResponse} from './provider-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanContextField,cleanContextState,cleanContextUpdate,receiveContextFields,editContextValue,contextForModel,contextSearchText,contextValueError,contextMaterialUi} from '../public/context-fields.mjs';
import {contextFieldHtml} from '../public/context-fields-panel.mjs';
import {validateConversations} from '../lib/conversations.mjs';
import {newConversationContext} from '../public/conversation-panel.mjs';
import {payloadFor,createAnalyzer} from '../lib/gemini.mjs';
import {createApp} from '../server.mjs';
import {queryTokens} from '../lib/source-content-terms.mjs';
import {makeChunks,retrieve} from '../lib/source-content-index.mjs';
import {researchCandidates} from '../lib/research-candidates.mjs';
const field={id:'flame_interest',label:'Flame regime of interest',kind:'choice',reason:'Focus the literature on the behavior you want to study.',unit:'',options:['Cool flames','Hot flames','Either / unsure']};
const geometry={id:'storage_shape',label:'Material form and storage',kind:'text',reason:'Describe the shape and packing if known.',unit:'',options:[]};
const mass={id:'stored_mass',label:'Stored mass',kind:'number',reason:'Optional description of the amount stored.',unit:'g',options:[]};
const req={scenario:'Study ignition',flow:{updateResearch:true}};
const category={...field,id:'fuel_configuration',label:'Fuel configuration',options:['Solid fuel','Liquid fuel','Hybrid','Other / unsure']};
const oxidizer={...geometry,id:'oxidizer_identity',label:'Oxidizer of interest',showWhen:{fieldId:'fuel_configuration',oneOf:['Hybrid']}};
const branch={action:'replace',fields:[category,oxidizer],material:{role:'fuel',hints:[{showWhen:{fieldId:'fuel_configuration',oneOf:['Solid fuel']},options:['PMMA']},{showWhen:{fieldId:'fuel_configuration',oneOf:['Liquid fuel']},options:['Ethanol']},{showWhen:{fieldId:'fuel_configuration',oneOf:['Hybrid']},options:['Paraffin']}]}};
test('AI-authored branch changes immediately, restores answers, and excludes inactive values from retrieval',()=>{
 let state=receiveContextFields({},branch).state;assert.deepEqual(state.active,['fuel_configuration']);assert.deepEqual(contextMaterialUi(state),{label:'Fuel material',options:[]});
 state=editContextValue(state,'fuel_configuration','Solid fuel');assert.deepEqual(contextMaterialUi(state).options,['PMMA']);
 state=editContextValue(state,'fuel_configuration','Hybrid');assert.deepEqual(state.active,['fuel_configuration','oxidizer_identity']);assert.deepEqual(contextMaterialUi(state).options,['Paraffin']);
 state=editContextValue(state,'oxidizer_identity','Known oxidizer description ');assert.equal(state.values.oxidizer_identity,'Known oxidizer description ');assert.ok(contextSearchText(state).includes('Known oxidizer'));
 state=editContextValue(state,'fuel_configuration','Liquid fuel');assert.equal(state.values.oxidizer_identity,'Known oxidizer description ');assert.ok(!contextSearchText(state).includes('Known oxidizer'));assert.deepEqual(contextMaterialUi(state).options,['Ethanol']);
 state=editContextValue(state,'fuel_configuration','  hybrid  ');assert.ok(state.active.includes('oxidizer_identity'));assert.ok(contextSearchText(state).includes('Known oxidizer'));
 const restored=cleanContextState(JSON.parse(JSON.stringify(state)));assert.deepEqual(restored,state);
 state=editContextValue(state,'fuel_configuration','A new category');assert.deepEqual(state.active,['fuel_configuration']);assert.deepEqual(contextMaterialUi(state).options,[]);
 state=cleanContextState({...state,values:{...state.values,fuel_configuration:''},unavailable:['fuel_configuration']});assert.deepEqual(state.active,['fuel_configuration']);
 state=receiveContextFields(state,{action:'replace',fields:[geometry]}).state;assert.equal(contextMaterialUi(state).label,'Material');assert.ok(!contextSearchText(state).includes('Known oxidizer'));
});
test('branch schema rejects cycles, dangling conditions, unknown parent options and too many simultaneous fields',()=>{
 const keep={action:'keep',fields:[]};
 for(const fields of [[{...category,showWhen:{fieldId:category.id,oneOf:['Hybrid']}}],[oxidizer],[category,{...oxidizer,showWhen:{fieldId:category.id,oneOf:['Not an option']}}],[{...category,showWhen:{fieldId:'child',oneOf:['A']}},{...field,id:'child',label:'Child',options:['A'],showWhen:{fieldId:category.id,oneOf:['Hybrid']}}],[category,...Array.from({length:6},(_,i)=>({...oxidizer,id:'child_'+i,label:'Child '+i}))]])assert.deepEqual(cleanContextUpdate({action:'replace',fields},req),keep);
 assert.deepEqual(cleanContextUpdate({...branch,material:{role:'fuel',hints:[{showWhen:{fieldId:'missing',oneOf:['X']},options:['A']}] }},req),keep);
 // More than six definitions are allowed when no selection exposes over six.
 const alternatives=Array.from({length:9},(_,i)=>({...geometry,id:'choice_'+i,label:'Detail '+i,showWhen:{fieldId:category.id,oneOf:[i<3?'Solid fuel':i<6?'Liquid fuel':'Hybrid']}}));
 assert.equal(cleanContextUpdate({action:'replace',fields:[category,...alternatives]},req).action,'replace');
});
test('multi-level branches require an active ancestor; model replacement cannot reinterpret an answered dependency',()=>{
 const second={...field,id:'oxidizer_form',label:'Oxidizer form of interest',options:['Gas','Liquid'],showWhen:{fieldId:category.id,oneOf:['Hybrid']}};
 const third={...geometry,id:'gas_description',label:'Gas description',showWhen:{fieldId:second.id,oneOf:['Gas']}};
 let state=receiveContextFields({},{action:'replace',fields:[category,second,third]}).state;
 state=editContextValue(state,category.id,'Hybrid');state=editContextValue(state,second.id,'Gas');state=editContextValue(state,third.id,'A user description');assert.equal(state.active.length,3);
 state=editContextValue(state,category.id,'Solid fuel');assert.equal(state.active.length,1);assert.ok(!contextSearchText(state).includes('A user description'));
 const replacement=cleanContextUpdate({action:'replace',fields:[category,{...second,label:'Changed meaning',showWhen:{fieldId:category.id,oneOf:['Solid fuel']}},third]},{...req,contextDetails:state});assert.deepEqual(replacement.fields[1],second);
});
test('declarative field allowlist discards executable behavior and defaults; limits options',()=>{
 assert.deepEqual(cleanContextField({...field,value:'Hot flames',required:true,onchange:'evil',url:'https://evil.example'}),field);
 for(const id of ['__proto__','constructor','pressure','gravity_ms2','bad id','BadId','x'.repeat(49)])assert.equal(cleanContextField({...field,id}),null);
 for(const kind of ['html','script','file','password','url'])assert.equal(cleanContextField({...field,kind}),null);
 assert.equal(cleanContextField({...mass,unit:''}),null);
 assert.equal(cleanContextField({...field,options:[]}),null);
 assert.equal(cleanContextField({...field,options:Array.from({length:40},(_,i)=>'Option '+i)}).options.length,12);
});
test('invalid replace is atomic and cannot erase a valid form or reject the scientific answer',()=>{
 const keep={action:'keep',fields:[]};
 for(const value of [null,'bad',{action:'replace',fields:[field,{...field,id:'constructor'}]},{action:'replace',fields:[field,field]},{action:'replace',fields:Array(7).fill(field)},{action:'clear'}])assert.deepEqual(cleanContextUpdate(value,req),keep);
 assert.deepEqual(cleanContextUpdate({action:'replace',fields:[]},req),{action:'replace',fields:[]});
 assert.deepEqual(cleanContextUpdate({action:'replace',fields:[field]},{...req,emergency:true}),keep);
 assert.deepEqual(cleanContextUpdate({action:'replace',fields:[field]},{...req,flow:{updateResearch:false}}),keep);
 assert.deepEqual(cleanContextUpdate({action:'replace',fields:[field]},{...req,scenario:''}),keep);
});
test('answered field definitions are immutable; changed topic archives but never reuses saved values',()=>{
 let state=receiveContextFields({}, {action:'replace',fields:[field]}).state;
 state=editContextValue(state,field.id,'Cool flames');
 const update=cleanContextUpdate({action:'replace',fields:[{...field,label:'A different quantity',kind:'number',unit:'K'}]},{...req,contextDetails:state});
 assert.deepEqual(update.fields[0],field);
 state=receiveContextFields(state,{action:'replace',fields:[geometry]}).state;
 assert.equal(state.values.flame_interest,'Cool flames');assert.deepEqual(state.active,['storage_shape']);
 assert.ok(!contextSearchText(state).includes('Cool flames'));
 assert.equal(contextForModel(state).find(f=>f.id===field.id).value,null);
 assert.equal(contextForModel(state).find(f=>f.id===field.id).status,'saved_not_active');
});
test('unknown and repeated requests never reopen the panel; user edits can recover unknown',()=>{
 let next=receiveContextFields({}, {action:'replace',fields:[field]});assert.deepEqual(next.newRequests,['flame_interest']);
 next=receiveContextFields({...next.state,unavailable:['flame_interest']},{action:'replace',fields:[field]});assert.deepEqual(next.newRequests,[]);
 const edited=editContextValue(next.state,'flame_interest','A custom mixed regime');assert.deepEqual(edited.unavailable,[]);assert.ok(contextSearchText(edited).includes('A custom mixed regime'));
 assert.deepEqual(receiveContextFields(edited,{action:'replace',fields:[geometry]},false).state,edited);
});
test('numerical custom descriptions accept zero and decimal comma but never execute expressions or imply unit conversion',()=>{
 for(const value of ['0','-1','12,5','1.2e3',''])assert.equal(contextValueError(mass,value),'');
 for(const value of ['NaN','Infinity','12 g','1/2','<script>'])assert.ok(contextValueError(mass,value));
 let state=receiveContextFields({}, {action:'replace',fields:[mass]}).state;
 state=editContextValue(state,mass.id,'Infinity');assert.equal(contextSearchText(state),'');
 state=editContextValue(state,mass.id,'0');assert.match(contextSearchText(state),/0 g/);
});
test('model labels/options and user values render as escaped text; no HTML or script injection',()=>{
 const malicious={...field,label:'<img src=x onerror=alert(1)>',reason:'<script>bad</script>',options:['" onfocus="evil']};
 const html=contextFieldHtml(malicious,{values:{flame_interest:'<svg onload=evil>'},unavailable:[]});
 assert.ok(html.includes('&lt;img'));assert.ok(html.includes('&lt;script&gt;'));assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<svg'));assert.ok(!html.includes(' onfocus="evil'));
});
test('adaptive state survives store roundtrip and stays out of both new-chat modes',()=>{
 let state=receiveContextFields({}, {action:'replace',fields:[field,geometry]}).state;state=editContextValue(state,field.id,'Cool flames');state.unavailable=['storage_shape'];
 const value=validateConversations({revision:0,activeId:'a',conversations:[{id:'a',title:'Test',messages:[],context:{contextDetails:state}}]});
 assert.deepEqual(value.conversations[0].context.contextDetails,state);
 assert.equal(newConversationContext().contextDetails,undefined);assert.equal(newConversationContext({contextDetails:state}).contextDetails,undefined);
});
test('saved detail capacity stops new schema replacement instead of deleting user answers',()=>{
 const fields=Array.from({length:24},(_,i)=>({...geometry,id:'detail_'+i,label:'Detail '+i}));
 const state=cleanContextState({fields,active:[],values:Object.fromEntries(fields.map(f=>[f.id,'Answer']))});
 assert.deepEqual(cleanContextUpdate({action:'replace',fields:[field]},{...req,contextDetails:state}),{action:'keep',fields:[]});
});
test('active answers refine actual document retrieval; unselected options and archived answers do not',()=>{
 let state=receiveContextFields({}, {action:'replace',fields:[field]}).state;state=editContextValue(state,field.id,'Cool flames');
 const request={question:'Review',scenario:'Study',ids:['PSI-1','PSI-2'],conditions:{},contextDetails:state};
 const terms=queryTokens(request);assert.ok(terms.has('cool'));assert.ok(!terms.has('hot'));
 const chunks=makeChunks({id:'f1',sha256:'a'.repeat(64),accessions:['PSI-1'],name:'cool.txt'},[{text:'Cool flames ignition experiments and diffusion conditions.',location:{line:1}}]).concat(makeChunks({id:'f2',sha256:'b'.repeat(64),accessions:['PSI-2'],name:'hot.txt'},[{text:'Hot flames unrelated observations.',location:{line:1}}]));
 assert.equal(retrieve({chunks},request).chunks[0].fileId,'f1');
 const corpus={records:[{id:'PSI-1',content:{approach:'cool flames'}},{id:'PSI-2',content:{approach:'hot flames'}}],sourceContentRetrieval:{sourceCandidateIds:['PSI-1']}};
 assert.deepEqual(researchCandidates(corpus,request,1),['PSI-1']);
 state=receiveContextFields(state,{action:'replace',fields:[]}).state;assert.ok(!queryTokens({...request,contextDetails:state}).has('cool'));
});
const quote='A controlled local test investigates cool flames and material storage conditions.';
const corpus={hash:'context-test',records:[{id:'PSI-1',title:'Controlled offline fixture',content:{approach:quote}}]};
const dims=['objective','material','geometry','storage','atmosphere','gravity','flow','mechanism'];
function reply(evidenceId,update){return {stage:'rank',summary:'TEST ONLY source discovery, not a scientific conclusion.',questions:[],assessments:[{sourceId:'PSI-1',evidenceId,rubric:Object.fromEntries(dims.map(k=>[k,.5])),rubricReasons:Object.fromEntries(dims.map(k=>[k,'Synthetic source relevance for '+k])),reason:'TEST ONLY controlled fixture.',limitation:'Offline protocol test.'}],contextFields:update,conditionRequests:[],conditionSuggestions:[],unknowns:[],evidenceGaps:[],nextStep:'Review source evidence.',emergency:false,recommendations:{action:'keep',items:[]}};}
test('prompt preserves adaptive vocabulary as untrusted descriptions and no tools or numerical evidence',()=>{
 let state=receiveContextFields({}, {action:'replace',fields:[mass]}).state;state=editContextValue(state,mass.id,'100');
 const p=payloadFor(corpus,{...req,mode:'research',ids:['PSI-1'],question:'Find studies',conditions:{},contextDetails:state}),data=JSON.parse(p.input[0].content[0].text),system=p.instructions;
 assert.equal(data.contextDetails[0].value,'100');assert.equal(data.conditions.stored_mass,undefined);assert.equal(p.tools,undefined);
 for(const word of ['OPTIONAL DETAILS','never create measured condition support','Never infer engineering qualifications','saved_not_active','PREVENTION:','ACTIVE INCIDENT:'])assert.ok(system.includes(word),word);
});
test('real HTTP/analyzer accepts model-generated forms, keeps malformed optional forms local, and does not change numerical scoring',async()=>{
 let calls=0;const sent=[];
 const analyzer=createAnalyzer({corpus,key:'TEST_ONLY',fetchImpl:async(_url,options)=>{
  calls++;const data=JSON.parse(JSON.parse(options.body).input[0].content[0].text);sent.push(data);
  const update=calls===2?{action:'replace',fields:[{id:'pressure',kind:'script'}]}:{action:'replace',fields:[field,mass]};
  return Response.json({...providerResponse(reply(data.evidence[0].id,update)),id:'OFFLINE_CONTEXT_'+calls,model:'TEST_ONLY'});
 }});
 const app=createApp({corpus,analyzer,sessionToken:'context-test'});await new Promise(r=>app.listen(0,'127.0.0.1',r));
 const post=async body=>{const r=await fetch('http://127.0.0.1:'+app.address().port+'/api/research',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':'context-test'},body:JSON.stringify(body)});const b=await r.json();assert.equal(r.status,200,JSON.stringify(b));return b;};
 try{
  const a=await post({scenario:'',question:'I want to study ignition',conditions:{}});assert.equal(a.analysis.contextFields.fields.length,2);
  let state=receiveContextFields({},a.analysis.contextFields).state;state=editContextValue(state,field.id,'Cool flames');state=editContextValue(state,mass.id,'100');
  const b=await post({scenario:'I want to study ignition',question:'Refine my search',conditions:{},contextDetails:state});
  assert.deepEqual(b.analysis.contextFields,{action:'keep',fields:[]});assert.equal(b.ranking.matches[0].numericBudget,0);assert.equal(b.ranking.matches[0].total,a.ranking.matches[0].total);assert.equal(sent[1].contextDetails[1].value,'100');
  assert.equal(calls,2);
 }finally{await new Promise(r=>app.close(r));}
});
