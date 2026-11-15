import test from 'node:test';
import assert from 'node:assert/strict';
import {setRecommendationsExpanded,installRecommendationsPanel} from '../public/recommendations-panel.mjs';
import {safetyStepKey} from '../public/safety-workspace.mjs';
import {workspaceEntryHtml} from '../public/workspace-entry.mjs';
import {readFile} from 'node:fs/promises';

function panel(){
 const classes=new Set(['narrow-right']),buttonAttributes={},bodyAttributes={},incidentAttributes={},readingState={reviewed:['source-step-1'],detailsOpen:true};
 const child={name:'focused source button'};
 const button={innerHTML:'persistent shield / arrow icons',setAttribute:(k,v)=>buttonAttributes[k]=v,focus:()=>{root.activeElement=button;}};
 const body={hidden:true,inert:true,setAttribute:(k,v)=>bodyAttributes[k]=v,contains:element=>element===child,readingState};
 const layout={classList:{toggle:(name,enabled)=>enabled?classes.add(name):classes.delete(name)}};
 const incident={setAttribute:(k,v)=>incidentAttributes[k]=v};
 const root={activeElement:null,querySelector:s=>({'.layout':layout,'#recommend-toggle':button,'#recommend-body':body,'#incident-access':incident})[s]};
 return {root,classes,button,body,buttonAttributes,bodyAttributes,incidentAttributes,child,readingState};
}

test('Safety visibility has one accessible state and retains icons, reading marks and evidence',()=>{
 const p=panel(),icons=p.button.innerHTML;
 setRecommendationsExpanded(true,p.root);
 assert.equal(p.classes.has('narrow-right'),false);assert.equal(p.buttonAttributes['aria-expanded'],'true');assert.equal(p.incidentAttributes['aria-expanded'],'true');assert.equal(p.buttonAttributes['aria-label'],'Collapse Safety review');assert.equal(p.body.hidden,false);assert.equal(p.body.inert,false);assert.equal(p.bodyAttributes['aria-hidden'],'false');
 setRecommendationsExpanded(false,p.root);
 assert.equal(p.classes.has('narrow-right'),true);assert.equal(p.buttonAttributes['aria-expanded'],'false');assert.equal(p.incidentAttributes['aria-expanded'],'false');assert.equal(p.buttonAttributes['aria-label'],'Expand Safety review');assert.equal(p.body.hidden,true);assert.equal(p.body.inert,true);assert.equal(p.bodyAttributes['aria-hidden'],'true');
 assert.equal(p.button.innerHTML,icons);assert.deepEqual(p.body.readingState,{reviewed:['source-step-1'],detailsOpen:true});
});

test('collapsing focused Safety content returns focus to its control without stealing outside focus',()=>{
 const p=panel();setRecommendationsExpanded(true,p.root);p.root.activeElement=p.child;setRecommendationsExpanded(false,p.root);assert.equal(p.root.activeElement,p.button);
 const outside={name:'chat composer'};p.root.activeElement=outside;setRecommendationsExpanded(true,p.root);setRecommendationsExpanded(false,p.root);assert.equal(p.root.activeElement,outside);
});


function installedPanel(){
 const classes=new Set(['narrow-right']),listeners={},attributes={};
 const node=name=>({hidden:false,inert:false,textContent:'',innerHTML:'',scrollTop:0,
  setAttribute:(key,value)=>(attributes[name]??={})[key]=value,
  addEventListener:(type,fn)=>listeners[name+':'+type]=fn,
  querySelectorAll:()=>[],contains:()=>false,focus(){}});
 const content=node('content'),body=node('body'),toggle=node('toggle'),incident=node('incident'),aside=node('aside'),count=node('count'),status=node('status');
 const classList={contains:name=>classes.has(name),toggle:(name,on)=>on?classes.add(name):classes.delete(name),remove:name=>classes.delete(name)};
 aside.classList=classList;
 const root={activeElement:null,addEventListener:(type,fn)=>listeners['document:'+type]=fn,querySelector:selector=>({'.layout':{classList},'#recommend-toggle':toggle,'#incident-access':incident,'#recommend-body':body,'#recommend-content':content,'#recommend-count':count,'.recommendations':aside,'#safety-update-status':status})[selector]};
 return {root,classes,listeners,attributes,content,body,toggle,incident,aside,count};
}

test('header and workspace entry open ordinary Safety repeatedly without creating an incident or session',()=>{
 const originalDocument=globalThis.document,originalFetch=globalThis.fetch,originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const ui=installedPanel();let requests=0,microphones=0,changes=0;
 globalThis.document=ui.root;
 globalThis.fetch=()=>{requests++;throw Error('Navigation must not request a provider or conversation session.');};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia(){microphones++;throw Error('Navigation must not request a microphone.');}}}});
 try{
  const panel=installRecommendationsPanel();panel.setOnChange(()=>changes++);
  assert.equal(ui.body.hidden,true);assert.equal(ui.attributes.incident['aria-expanded'],'false');
  const sample={sourceId:'PSI-TEST',title:'TEST ONLY stored finding',text:'Review the recorded source configuration.',quote:'TEST ONLY controlled passage.',limitation:'TEST ONLY no operational procedure.',priority:'medium',step:{phase:'prevention',when:'During a source review',ifUnknown:'Keep the gap visible.',check:'Record the source limits.'}};
  panel.restore({items:[sample],reviewed:[safetyStepKey(sample)],updatedAt:'2026-11-15T00:00:00Z'});
  const before=panel.snapshot(),html=ui.content.innerHTML;ui.aside.scrollTop=145;
  const openHeader=()=>ui.incident.onclick();
  const openCard=()=>ui.listeners['document:click']({target:{closest:selector=>selector==='[data-open-safety]'?{}:null}});
  for(const open of [openHeader,openCard]){
   ui.toggle.onclick();if(!ui.body.hidden)ui.toggle.onclick();
   assert.equal(ui.body.hidden,true);open();open();
   assert.equal(ui.body.hidden,false);assert.equal(ui.body.inert,false);assert.equal(ui.classes.has('narrow-right'),false);
   assert.equal(ui.attributes.toggle['aria-expanded'],'true');assert.equal(ui.attributes.incident['aria-expanded'],'true');
   assert.deepEqual(panel.snapshot(),before);assert.equal(panel.snapshot().emergency,false);assert.equal(panel.snapshot().manualIncident,false);
   assert.equal(ui.content.innerHTML,html);assert.equal(ui.aside.scrollTop,145);assert.equal(ui.count.textContent,'1');
  }
  ui.listeners['body:keydown']({key:'Escape',preventDefault(){}});
  assert.equal(ui.attributes.incident['aria-expanded'],'false');assert.equal(ui.attributes.toggle['aria-expanded'],'false');
  assert.equal(changes,0);assert.equal(requests,0);assert.equal(microphones,0);
  panel.restore({});openCard();assert.match(ui.content.innerHTML,/Start with your situation/);assert.doesNotMatch(ui.content.innerHTML,/safety-incident/);
 }finally{
  globalThis.document=originalDocument;globalThis.fetch=originalFetch;
  if(originalNavigator)Object.defineProperty(globalThis,'navigator',originalNavigator);else delete globalThis.navigator;
 }
});

test('active application loads Safety navigation and AI Astro chat without legacy incident voice UI',async()=>{
 const app=await readFile(new URL('../public/app.js',import.meta.url),'utf8'),index=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
 assert.doesNotMatch(app,/incident-voice|installIncidentVoice|incidentVoice/);
 assert.doesNotMatch(index,/incident-voice|incident-dialog|aria-haspopup="dialog"/);
 assert.match(index,/<button id="incident-access"[^>]*aria-expanded="false"[^>]*aria-controls="recommend-body"/);
 assert.match(index,/0\.5\.2/);
 assert.match(app,/installConversationPanel/);assert.match(app,/post\('\/api\/chat'/);
 assert.ok(app.indexOf('recommendations=installRecommendationsPanel()')<app.indexOf('async function init()'));
 const entry=workspaceEntryHtml();assert.match(entry,/data-open-safety aria-controls="recommend-body"/);assert.match(entry,/Open the Safety sidebar/);assert.doesNotMatch(entry,/voice or text|data-open-incident/);
});
