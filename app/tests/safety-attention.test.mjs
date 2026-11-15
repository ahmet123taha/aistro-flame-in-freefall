import test from 'node:test';
import assert from 'node:assert/strict';
import {createSafetyAttention,safetyStepKey} from '../public/safety-workspace.mjs';
import {installRecommendationsPanel,reduceRecommendations} from '../public/recommendations-panel.mjs';

const item=(priority='medium',phase='prevention',text='TEST ONLY: review the recorded specimen configuration.')=>({sourceId:'PSI-TEST',title:'TEST ONLY controlled finding',text,priority,quote:'TEST ONLY controlled passage.',limitation:'TEST ONLY: no operational procedure.',step:{phase,when:'TEST ONLY planning condition',ifUnknown:'TEST ONLY retain the uncertainty.',check:'TEST ONLY record the review gap.'}});
const accepted=items=>({stage:'rank',recommendationsReviewed:true,recommendations:{action:'replace',items},emergency:false});

test('only validated new cautions or priority escalation request important attention',()=>{
 const tracker=createSafetyAttention();const medium=item(),high=item('high'),caution=item('low','avoid');
 assert.deepEqual(tracker.apply({items:[high]},{}),{changed:0,important:0});
 assert.deepEqual(tracker.apply({items:[medium]},accepted([medium])),{changed:1,important:0});
 assert.deepEqual(tracker.apply({items:[high]},accepted([high])),{changed:1,important:1});
 assert.deepEqual(tracker.apply({items:[high]},accepted([high])),{changed:0,important:0});
 assert.deepEqual(tracker.apply({items:[caution]},accepted([caution])),{changed:1,important:1});
 assert.deepEqual(tracker.apply({items:[caution],stale:true},accepted([caution])),{changed:0,important:0});
 assert.deepEqual(tracker.apply({items:[high],emergency:true},accepted([high])),{changed:0,important:0});
});

test('restore seeds seen findings, isolates chats and never persists attention metadata',()=>{
 const high=item('high'),tracker=createSafetyAttention({items:[high]});
 assert.deepEqual(tracker.apply({items:[high]},accepted([high])),{changed:0,important:0});
 tracker.seed({items:[]});assert.deepEqual(tracker.apply({items:[high]},accepted([high])),{changed:1,important:1});
 tracker.apply({items:[]},{recommendationsReviewed:true,recommendations:{action:'clear'}});
 assert.deepEqual(tracker.apply({items:[high]},accepted([high])),{changed:0,important:0});
});

test('reading marks survive identical replacements while changed priority requires fresh reading',()=>{
 const medium=item(),key=safetyStepKey(medium),old={items:[medium],reviewed:[key],stale:true};
 assert.deepEqual(reduceRecommendations(old,accepted([medium])).reviewed,[key]);
 assert.deepEqual(reduceRecommendations(old,accepted([item('high')])).reviewed,[]);
 assert.deepEqual(reduceRecommendations(old,accepted([item('medium','prevention','TEST ONLY changed condition')])).reviewed,[]);
});

function mockDocument(){
 const classes=new Set(['narrow-right']),listeners={},attributes={};let html='',details=[],focusCount=0;
 const content={addEventListener:(type,fn)=>listeners[type]=fn,querySelectorAll:()=>details,querySelector:()=>({focus:()=>focusCount++}),get innerHTML(){return html;},set innerHTML(value){html=value;details=[...value.matchAll(/<details([^>]*)data-safety-detail="([^"]+)"[^>]*>/g)].map(match=>({dataset:{safetyDetail:match[2]},open:/\bopen\b/.test(match[1])}));}};
 const classList={add:name=>classes.add(name),remove:name=>classes.delete(name),contains:name=>classes.has(name),toggle:(name,on)=>on?classes.add(name):classes.delete(name)};
 const aside={scrollTop:0,classList},button={setAttribute:(k,v)=>attributes[k]=v,focus:()=>focusCount++},body={contains:()=>false,setAttribute(){},addEventListener(){}},status={textContent:''},incident={setAttribute(){}},count={textContent:''};
 const document={activeElement:null,addEventListener(){},querySelector:selector=>({'#recommend-content':content,'#recommend-count':count,'.recommendations':aside,'#recommend-toggle':button,'#recommend-body':body,'.layout':{classList},'#incident-access':incident,'#safety-update-status':status})[selector]};
 return {document,aside,content,status,classes,button,listeners,get details(){return details;},get focusCount(){return focusCount;}};
}

test('apply owns finite attention; review rerenders preserve evidence and scroll without replay or forced focus',()=>{
 const originalDocument=globalThis.document,originalSetTimeout=globalThis.setTimeout,originalClearTimeout=globalThis.clearTimeout;
 const ui=mockDocument(),timers=new Map();let timerId=0;
 globalThis.document=ui.document;globalThis.setTimeout=(fn,ms)=>{timers.set(++timerId,{fn,ms});return timerId;};globalThis.clearTimeout=id=>timers.delete(id);
 try{
  const panel=installRecommendationsPanel(),high=item('high');panel.apply(accepted([high]));
  assert.equal(ui.classes.has('safety-needs-attention'),true);assert.equal(ui.classes.has('narrow-right'),true);
  assert.match(ui.status.textContent,/not a fire-risk measurement/);assert.equal(ui.focusCount,0);assert.equal(timers.size,1);
  const key=safetyStepKey(high),evidence=ui.details.find(d=>d.dataset.safetyDetail===key);evidence.open=true;ui.aside.scrollTop=143;
  const notice=ui.status.textContent;panel.apply(accepted([high]));
  assert.equal(ui.status.textContent,notice);assert.equal(timers.size,1);assert.equal(ui.aside.scrollTop,143);assert.equal(ui.details.find(d=>d.dataset.safetyDetail===key).open,true);assert.equal(ui.focusCount,0);
  ui.listeners.change({target:{dataset:{safetyReview:key},checked:true}});
  assert.deepEqual(panel.snapshot().reviewed,[key]);assert.equal(ui.status.textContent,notice);assert.equal(timers.size,1);
  const timer=[...timers.values()][0];assert.equal(timer.ms,4200);timer.fn();assert.equal(ui.classes.has('safety-needs-attention'),false);
  panel.restore({items:[high],reviewed:[key]});assert.equal(ui.status.textContent,'');assert.equal(ui.aside.scrollTop,0);assert.equal(ui.details.find(d=>d.dataset.safetyDetail===key).open,false);
  panel.apply(accepted([high]));assert.equal(ui.classes.has('safety-needs-attention'),false);assert.equal(ui.status.textContent,'');
  panel.invalidate();assert.equal(panel.snapshot().stale,true);assert.deepEqual(panel.snapshot().reviewed,[key]);
 }finally{globalThis.document=originalDocument;globalThis.setTimeout=originalSetTimeout;globalThis.clearTimeout=originalClearTimeout;}
});
