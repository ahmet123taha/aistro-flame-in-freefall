import test from 'node:test';
import assert from 'node:assert/strict';
import {createBrowserIncidentPeer,validateIncidentSession,createIncidentController,installIncidentVoice,mergeTranscript,incidentLanguage,INCIDENT_COPY,boundedIncidentHistory} from '../public/incident-voice.mjs';
const SDP='v=0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n';
const validSession=()=>({sdp:SDP,model:'gpt-realtime-2.1-mini',transport:'webrtc'});
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture({prepare=async()=>SDP,post,language='en'}={}){
 const peers=[],calls=[],messages=[],notices=[],diagnostics=[],timers=new Map();let timerId=0;
 const controller=createIncidentController({language,onDiagnostic:d=>diagnostics.push(d),post:async(path,payload,options)=>{calls.push({path,payload,options});return post?post(path,payload,options):path.endsWith('session')?validSession():{text:'Keep a safe distance. Alert your crew.'};},peerFactory:callbacks=>{const peer={callbacks,sent:[],closed:0,prepare,connect:async sdp=>{peer.answer=sdp;},send:event=>peer.sent.push(event),mute:value=>peer.muted=value,close:()=>peer.closed++};peers.push(peer);return peer;},onMessage:m=>messages.push(m),onNotice:n=>notices.push(n),setTimer:(fn,ms)=>{const id=++timerId;fn.ms=ms;timers.set(id,fn);return id;},clearTimer:id=>timers.delete(id)});
 return {controller,peers,calls,messages,notices,diagnostics,timers};
}
async function connected(f){f.controller.open();await settle();const peer=f.peers.at(-1);peer.callbacks.onReady();return peer;}

test('native negotiation sends only SDP and locale; OpenAI events drive transcripts, mute and response status',async()=>{
 const f=fixture(),peer=await connected(f);assert.deepEqual(f.calls[0].payload,{sdp:SDP,language:'en'});assert.equal(peer.answer,SDP);assert.equal(peer.sent[0].type,'conversation.item.create');assert.equal(peer.sent[1].type,'response.create');
 peer.callbacks.onEvent({type:'conversation.item.input_audio_transcription.completed',item_id:'u',transcript:'Smoke here'});
 peer.callbacks.onEvent({type:'response.output_audio_transcript.delta',item_id:'a',delta:'Move away'});peer.callbacks.onEvent({type:'response.output_audio_transcript.done',item_id:'a',transcript:'Move away from smoke.'});
 assert.deepEqual(f.messages.at(-1),{role:'assistant',id:2,text:'Move away from smoke.',final:true});f.controller.mute();assert.equal(peer.muted,true);
 peer.callbacks.onEvent({type:'response.done',response:{status:'completed'}});await f.controller.send('I am safe');assert.equal(f.controller.snapshot.busy,true);peer.callbacks.onEvent({type:'response.done',response:{status:'completed'}});assert.equal(f.controller.snapshot.busy,false);f.controller.close();assert.equal(peer.closed,1);assert.equal(f.timers.size,0);
});

test('late permission and late session response cannot revive ended conversation; HTTP is aborted',async()=>{
 const permission=deferred(),f=fixture({prepare:()=>permission.promise});f.controller.open();f.controller.close();permission.resolve(SDP);await settle();assert.equal(f.calls.length,0);assert.ok(f.peers[0].closed>=1);
 const reply=deferred(),g=fixture({post:()=>reply.promise});g.controller.open();await settle();g.controller.close();assert.equal(g.calls[0].options.signal.aborted,true);reply.resolve(validSession());await settle();assert.equal(g.peers[0].answer,undefined);g.peers[0].callbacks.onReady();assert.equal(g.controller.snapshot.ready,false);
});

test('permission denial permits explicit text only; history remains bounded and resets on reopen',async()=>{
 const f=fixture({prepare:async()=>{throw Object.assign(Error(),{name:'NotAllowedError'});}});f.controller.open();await settle();assert.equal(f.calls.length,0);assert.match(f.notices.at(-1),/denied/);await f.controller.send('Help');assert.deepEqual(f.calls[0].payload.history,[]);await f.controller.send('I am safe');assert.equal(f.calls[1].payload.history.length,2);assert.equal(f.calls[1].payload.conditions,undefined);f.controller.close();f.controller.open();await settle();await f.controller.send('New incident');assert.deepEqual(f.calls.at(-1).payload.history,[]);f.controller.close();
});

test('voice failure/timeout does not issue billed retry or text request; stale callbacks are ignored',async()=>{
 for(const event of ['error','timeout','provider']){const f=fixture(),peer=await connected(f);if(event==='timeout'){peer.callbacks.onEvent({type:'response.done',response:{status:'completed'}});await f.controller.send('Help');[...f.timers.values()].find(fn=>fn.ms===45000)();}else if(event==='error')peer.callbacks.onError();else peer.callbacks.onEvent({type:'session.expired'});assert.equal(f.controller.snapshot.state,'fallback');assert.equal(f.calls.filter(c=>c.path.endsWith('session')).length,1);assert.equal(peer.closed,1);peer.callbacks.onEvent({type:'response.output_audio_transcript.done',transcript:'stale'});assert.ok(!f.messages.some(m=>m.text==='stale'));f.controller.close();}
});

test('text fallback rejects duplicates, aborts pending request and discards late response',async()=>{
 const reply=deferred(),f=fixture({post:()=>reply.promise});f.controller.open();f.controller.useText();await settle();const pending=f.controller.send('Help');assert.equal(await f.controller.send('Again'),false);f.controller.close();assert.equal(f.calls[0].options.signal.aborted,true);reply.resolve({text:'Late'});await pending;assert.equal(f.messages.filter(m=>m.role==='assistant').length,0);
});

test('reconnection seeds current whole incident turns before continuation and never research state',async()=>{
 const f=fixture();await connected(f);f.controller.useText();await f.controller.send('Smoke in corridor; I am outside');await f.controller.startVoice();const peer=f.peers.at(-1);peer.callbacks.onReady();assert.deepEqual(peer.sent.slice(0,2).map(e=>e.item.role),['user','assistant']);assert.equal(peer.sent[1].item.content[0].type,'output_text');assert.match(peer.sent[2].item.content[0].text,/Continue this incident/);f.controller.close();
});

test('native WebRTC owns media tracks/data channel; all resources stop even after late permission',async()=>{
 const permission=deferred(),tracks=[{stopCount:0,stop(){this.stopCount++;}}];let pc,channel,output;const order=[];
 class Peer{constructor(){pc=this;this.localDescription={sdp:SDP};}addTrack(){order.push('track');}createDataChannel(name){assert.equal(name,'oai-events');order.push('channel');channel={readyState:'open',bufferedAmount:0,sent:[],send(x){this.sent.push(JSON.parse(x));},close(){this.closed=true;}};return channel;}async createOffer(){order.push('offer');return {sdp:SDP,type:'offer'};}async setLocalDescription(){}async setRemoteDescription(value){this.answer=value;}close(){this.closed=true;}}
 class Audio{constructor(){output=this;}play(){return Promise.resolve();}pause(){this.paused=true;}}
 const callbacks=[],peer=createBrowserIncidentPeer({Peer,Audio,navigator:{mediaDevices:{getUserMedia:()=>permission.promise}},onEvent:e=>callbacks.push(e)});const pending=peer.prepare();peer.close();permission.resolve({getTracks:()=>tracks,getAudioTracks:()=>tracks});assert.equal(await pending,null);assert.equal(tracks[0].stopCount,1);assert.equal(pc.closed,true);assert.equal(output.paused,true);
 const ready=createBrowserIncidentPeer({Peer,Audio,navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>tracks,getAudioTracks:()=>tracks})}},onEvent:e=>callbacks.push(e)});assert.equal(await ready.prepare(),SDP);assert.ok(order.indexOf('channel')<order.indexOf('offer'));await ready.connect(SDP);assert.equal(pc.answer.type,'answer');channel.onmessage({data:JSON.stringify({type:'session.created'})});assert.equal(callbacks.at(-1).type,'session.created');ready.mute(true);assert.equal(tracks[0].enabled,false);ready.send({type:'response.create'});assert.equal(channel.sent[0].type,'response.create');ready.close();assert.equal(channel.closed,true);assert.equal(output.srcObject,null);
});

test('voice validates bounded SDP rather than accepting client credentials or arbitrary destinations',()=>{assert.equal(validateIncidentSession(validSession()),SDP);for(const value of [{token:'secret'}, {...validSession(),model:'other'},{...validSession(),sdp:'x'.repeat(65537)}])assert.throws(()=>validateIncidentSession(value));});

test('dialog is inert until clicked; text submits clear composer and Escape restores focus without retaining transcript',async()=>{
  const original=Object.fromEntries(['document','window','navigator'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  const doc={activeElement:null};
  class Element {
    constructor(tag){this.tag=tag;this.children=[];this.listeners={};this.attributes={};this.dataset={};this.value='';this.disabled=false;this.isConnected=true;this.scrollHeight=100;this.clientHeight=100;this.scrollTop=0;}
    setAttribute(k,v){this.attributes[k]=v;}
    append(...items){for(const item of items){this.children.push(item);item.parent=this;}}
    replaceChildren(...items){this.children=items;}
    addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);}
    fire(type,event={}){for(const fn of this.listeners[type]||[])fn(event);}
    focus(){doc.activeElement=this;}
    showModal(){this.open=true;}
    close(){this.open=false;this.fire('close');}
    requestSubmit(){this.fire('submit',{preventDefault(){}});}
    setRangeText(text){this.value+=text;}
    remove(){this.parent.children=this.parent.children.filter(n=>n!==this);}
  }
  doc.createElement=tag=>new Element(tag);doc.body=new Element('body');const win=new Element('window'),posts=[];
  const find=(node,test)=>test(node)?node:node.children.map(child=>find(child,test)).find(Boolean);
  try {
    for(const [key,value] of Object.entries({document:doc,window:win,navigator:{language:'en'}}))Object.defineProperty(globalThis,key,{configurable:true,value});
    const opener=new Element('button');opener.focus();let openCount=0,closeCount=0;
    const installed=installIncidentVoice({post:async(path,payload)=>{posts.push({path,payload});return {text:'<img src=x onerror=bad()>'};},onOpen:()=>openCount++,onClose:()=>closeCount++});
    assert.equal(posts.length,0);const dialog=doc.body.children[0];assert.equal(dialog.id,'incident-dialog');assert.equal(dialog.open,undefined);
    installed.open();await settle();assert.equal(openCount,1);assert.equal(posts.length,0);assert.equal(dialog.open,true);
    const input=find(dialog,n=>n.tag==='textarea'),form=find(dialog,n=>n.tag==='form');input.value='Smoke';let prevented=false;
    input.fire('keydown',{key:'Enter',ctrlKey:true,preventDefault(){prevented=true;}});assert.equal(prevented,true);assert.match(input.value,/\n/);assert.equal(posts.length,0);
    input.fire('keydown',{key:'Enter',ctrlKey:false,preventDefault(){prevented=true;}});assert.equal(input.value,'');await settle();assert.equal(posts.length,1);
    const output=find(dialog,n=>n.textContent==='<img src=x onerror=bad()>');assert.ok(output);assert.equal(output.innerHTML,undefined);
    dialog.fire('cancel',{preventDefault(){}});assert.equal(dialog.open,false);assert.equal(closeCount,1);assert.equal(doc.activeElement,opener);assert.equal(find(dialog,n=>n.textContent==='<img src=x onerror=bad()>'),undefined);
    installed.open();await settle();win.fire('pagehide');assert.equal(dialog.open,false);assert.equal(closeCount,2);assert.ok(form);
  } finally {
    for(const [key,descriptor] of Object.entries(original))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
  }
});
test('transcription strings remain data and English/Turkish notice does not imply dispatch',()=>{
  assert.equal(mergeTranscript('Move away','Move away from smoke'),'Move away from smoke');assert.equal(mergeTranscript('a','<img src=x>'),'a<img src=x>');assert.equal(mergeTranscript('', 'x'.repeat(15000)).length,12000);
  assert.equal(incidentLanguage('tr-TR'),'tr');assert.equal(incidentLanguage('en-US'),'en');assert.match(INCIDENT_COPY.en.boundary,/not emergency dispatch/);assert.match(INCIDENT_COPY.tr.notice,/beklemeyin/);
});

test('bounded history keeps whole final turns without clipping meaningful endings',()=>{
  const history=[{role:'user',text:'old',final:true},{role:'assistant',text:'A'.repeat(5990)+' DO NOT ENTER',final:true},{role:'user',text:'latest',final:true},{role:'assistant',text:'unfinished',final:false}];
  assert.deepEqual(boundedIncidentHistory(history),[{role:'user',text:'latest'}]);
  const turns=Array.from({length:12},(_,i)=>({role:i%2?'assistant':'user',text:'turn '+i,final:true}));
  assert.deepEqual(boundedIncidentHistory(turns),turns.slice(-8).map(({role,text})=>({role,text})));
});


test('two-minute/30-second idle guard stops microphone and requests server hangup without retry',async()=>{
 for(const ms of [120000,30000]){const f=fixture(),peer=await connected(f);assert.ok([...f.timers.values()].some(fn=>fn.ms===120000));assert.ok([...f.timers.values()].some(fn=>fn.ms===30000));[...f.timers.values()].find(fn=>fn.ms===ms)();await settle();assert.equal(peer.closed,1);assert.equal(f.controller.snapshot.ready,false);assert.equal(f.controller.snapshot.state,'fallback');assert.match(f.notices.at(-1),/limit/);assert.equal(f.calls.filter(c=>c.path.endsWith('session')).length,1);assert.equal(f.calls.filter(c=>c.path.endsWith('/end')).length,1);assert.equal(f.timers.size,0);f.controller.close();}
});

test('voice activity refreshes idle timer but cannot extend total session timer',async()=>{
 const f=fixture(),peer=await connected(f);const hard=[...f.timers.entries()].find(([,fn])=>fn.ms===120000),idle=[...f.timers.entries()].find(([,fn])=>fn.ms===30000);peer.callbacks.onEvent({type:'input_audio_buffer.speech_started'});assert.equal(f.timers.has(idle[0]),false);assert.equal(f.timers.get(hard[0]),hard[1]);f.controller.close();assert.equal(f.timers.size,0);
});


test('incomplete token cutoff preserves connection and partial transcript; next user turn works without retry',async()=>{
 const f=fixture(),peer=await connected(f);
 peer.callbacks.onEvent({type:'response.created',response:{id:'r1'}});
 peer.callbacks.onEvent({type:'response.output_audio_transcript.done',response_id:'r1',item_id:'a1',transcript:'If you are part of a crew,'});
 peer.callbacks.onEvent({type:'response.done',response:{id:'r1',status:'incomplete',status_details:{reason:'max_output_tokens'}}});
 assert.equal(f.controller.snapshot.ready,true);assert.equal(f.controller.snapshot.busy,false);assert.equal(peer.closed,0);
 assert.equal(f.messages.at(-1).final,false);assert.deepEqual(f.diagnostics.at(-1),{code:'RESPONSE_TOKEN_LIMIT'});
 assert.equal(peer.sent.filter(e=>e.type==='response.create').length,1);
 await f.controller.send('I am outside');assert.equal(peer.sent.filter(e=>e.type==='response.create').length,2);
 peer.callbacks.onEvent({type:'response.done',response:{status:'completed'}});
 f.controller.useText();await f.controller.send('What next?');
 assert.ok(!f.calls.at(-1).payload.history.some(t=>t.text.includes('part of a crew')));f.controller.close();
});

test('nonfatal Realtime errors and failed responses keep session; diagnostics never echo provider text',async()=>{
 const f=fixture(),peer=await connected(f);
 peer.callbacks.onEvent({type:'error',error:{code:'response_cancel_not_active',message:'SECRET transcript SDP'}});
 assert.equal(peer.closed,0);
 peer.callbacks.onEvent({type:'response.done',response:{status:'failed',status_details:{error:{code:'server_error',message:'SECRET'}}}});
 assert.equal(f.controller.snapshot.ready,true);assert.equal(f.controller.snapshot.busy,false);
 assert.ok(!JSON.stringify(f.diagnostics).includes('SECRET'));assert.ok(!JSON.stringify(f.notices).includes('SECRET'));
 assert.equal(peer.sent.filter(e=>e.type==='response.create').length,1);
 peer.callbacks.onEvent({type:'error',error:{code:'insufficient_quota'}});assert.equal(peer.closed,1);assert.equal(f.controller.snapshot.ready,false);f.controller.close();
});

test('greeting, text and committed VAD input serialize responses and duplicate commits never replay',async()=>{
 const f=fixture({language:'tr-TR'}),peer=await connected(f);
 assert.equal(f.controller.snapshot.busy,true);assert.equal(await f.controller.send('too early'),false);
 assert.match(peer.sent[0].item.content[0].text,/Türkçe/);
 peer.callbacks.onEvent({type:'input_audio_buffer.speech_started'});
 peer.callbacks.onEvent({type:'response.done',response:{status:'cancelled'}});
 peer.callbacks.onEvent({type:'input_audio_buffer.speech_stopped'});
 peer.callbacks.onEvent({type:'input_audio_buffer.committed',item_id:'u1'});
 peer.callbacks.onEvent({type:'input_audio_buffer.committed',item_id:'u1'});
 assert.equal(peer.sent.filter(e=>e.type==='response.create').length,2);
 peer.callbacks.onEvent({type:'input_audio_buffer.committed',item_id:'u2'});
 assert.equal(peer.sent.filter(e=>e.type==='response.create').length,2);
 peer.callbacks.onEvent({type:'response.done',response:{status:'completed'}});
 assert.equal(peer.sent.filter(e=>e.type==='response.create').length,3);f.controller.close();
});

test('native transport survives transient disconnect and blocked playback; terminal paths clean up',async()=>{
 let pc,output,blocked=true;const timers=new Map(),errors=[],warnings=[];let id=0;
 const track={stop(){this.stopped=true;}};
 class Peer{constructor(){pc=this;this.localDescription={sdp:SDP};}addTrack(){}createDataChannel(){return {close(){},readyState:'open'};}async createOffer(){return {sdp:SDP};}async setLocalDescription(){}close(){this.closed=true;}}
 class Audio{constructor(){output=this;}play(){return blocked?Promise.reject(Error('autoplay')):Promise.resolve();}pause(){this.paused=true;}}
 const peer=createBrowserIncidentPeer({Peer,Audio,navigator:{mediaDevices:{getUserMedia:async()=>({getTracks:()=>[track],getAudioTracks:()=>[track]})}},onError:c=>errors.push(c),onWarning:c=>warnings.push(c),setTimer:(fn,ms)=>{const key=++id;timers.set(key,{fn,ms});return key;},clearTimer:key=>timers.delete(key)});
 await peer.prepare();pc.ontrack({streams:[{}]});await settle();assert.equal(warnings.at(-1),'AUDIO_PLAYBACK_BLOCKED');assert.equal(errors.length,0);
 blocked=false;assert.equal(await peer.resumeAudio(),true);assert.equal(warnings.at(-1),null);
 pc.connectionState='disconnected';pc.onconnectionstatechange();assert.equal(errors.length,0);assert.equal([...timers.values()][0].ms,8000);
 pc.connectionState='connected';pc.onconnectionstatechange();assert.equal(timers.size,0);
 pc.connectionState='disconnected';pc.onconnectionstatechange();[...timers.values()][0].fn();assert.deepEqual(errors,['RTC_DISCONNECTED']);
 peer.close();assert.equal(track.stopped,true);assert.equal(output.paused,true);assert.equal(timers.size,0);
});
