import {PDF_ASSETS} from '../lib/pdf-assets.mjs';
import {VERSION} from '../lib/version.mjs';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { once } from 'node:events';
import { fixture } from '../tests/dataset-fixture.mjs';
import { createHash } from 'node:crypto';
const root=process.cwd();
const version=VERSION;
const source=process.argv[2] || path.join(process.env.USERPROFILE,'Desktop','Spaceapps','Releases',version,'SpaceApps1','SpaceApps1.exe');
const binary=await readFile(source);const sha256=createHash('sha256').update(binary).digest('hex');
const manifest=JSON.parse(await readFile(path.join(path.dirname(source),'release-manifest.json'),'utf8'));assert.equal(manifest.sha256,sha256);assert.equal(manifest.bytes,binary.length);
const dir=await mkdtemp(path.join(os.tmpdir(),'flame-portable-'));
const executable=path.join(dir,'Taşınabilir deneme.exe');await cp(source,executable);
const profile=path.join(dir,'Windows kullanıcı profili');
let child,base,session;
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function launch(){child=spawn(executable,['--no-open','--profile-dir',profile],{cwd:dir,env:{...process.env,PATH:''},windowsHide:true,stdio:'ignore'});child.on('error',()=>{});for(let i=0;i<70;i++){try{const state=JSON.parse(await readFile(path.join(profile,'instance.json'),'utf8'));base=`http://127.0.0.1:${state.port}`;const catalog=await(await fetch(base+'/api/catalog')).json();session=catalog.sessionToken;return catalog;}catch{await delay(100);}}throw new Error('Portable launch timeout');}
async function post(route,body){const response=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':session},body:JSON.stringify(body)});assert.equal(response.status,200);return response.json();}
async function stop(){const exited=once(child,'exit');await post('/api/shutdown',{});await exited;}
try{
  const missing=await launch();assert.equal(missing.status.dataset.state,'missing');assert.equal(missing.records.length,0);await stop();await fixture(dir);
  const catalog=await launch();assert.equal(catalog.records.length,2);assert.equal(catalog.status.version,version);assert.equal(catalog.status.dataset.state,'ready');const files=await(await fetch(base+'/api/files?accession=PSI-25')).json();assert.equal(files.total,1);assert.match((await(await fetch(base+'/api/files/f0/preview')).json()).text,/oxygen,pressure/);assert.equal(catalog.status.configured,false);assert.equal(catalog.status.requests,0);assert.equal((await fetch(base+'/')).status,200);assert.equal((await fetch(base+'/app.js')).status,200);assert.equal((await fetch(base+'/workspace-state.mjs')).status,200);assert.match(await(await fetch(base+'/')).text(),/chat-composer/);const matchResponse=await fetch(base+'/api/match',{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':session},body:JSON.stringify({ids:catalog.records.map(r=>r.id),question:'Test matching request',conditions:{gravity:'other'}})});assert.equal(matchResponse.status,200);assert.equal((await matchResponse.json()).mode,'numeric_conditions');assert.equal((await fetch(base+'/credentials.openai.dpapi')).status,404);
  // Check every shipped browser module, including its MIME and exact source bytes.
  for(const name of ['condition-guidance.css','workspace-entry.mjs','workspace-entry.css','incident-voice.mjs','incident-audio.mjs','incident-capture-worklet.mjs','incident-voice.css','pdf-flow-reader.mjs','document-reader.css','context-fields.mjs','context-fields-panel.mjs','context-fields.css','condition-requests.mjs','scenario-panel.mjs','source-content-status.mjs','source-reference.mjs','parameter-comparison.mjs','material-support-card.mjs','gravity-input.mjs','dialogue-flow.mjs','figure-models.mjs','figure-reader.mjs','source-library.mjs','table-preview.mjs','recommendations-panel.mjs','source-briefing.mjs','safety-workspace.mjs','safety-steps-panel.mjs','safety-steps.css','app.js','environment-panel.mjs','conversation-panel.mjs','workspace-state.mjs','result-card.mjs','experiment-comparison.mjs','numeric-card.mjs','physical-card.mjs','thermal-card.mjs','gas-physics-card.mjs','gas-observations.mjs','boundary-card.mjs','transition-card.mjs']){
    const asset=await fetch(base+'/'+name);assert.equal(asset.status,200,name);assert.match(asset.headers.get('content-type'),name.endsWith('.css')?/^text\/css/:/^text\/javascript/,name);
    assert.equal(await asset.text(),await readFile(path.join(root,'public',name),'utf8'),name);
  }
  for(const name of PDF_ASSETS){const asset=await fetch(base+'/'+name);assert.equal(asset.status,200,name);assert.deepEqual(Buffer.from(await asset.arrayBuffer()),await readFile(path.join(root,'public',name)),name);}
  const request={ids:catalog.records.map(r=>r.id),question:catalog.defaultQuestion,conditions:catalog.defaultConditions};assert.equal((await post('/api/rank',request)).ranked.length,2);
  const key='AQ.TEST_ONLY.'+'a'.repeat(300)+'-._';assert.equal((await post('/api/settings/key',{key})).configured,true);assert.equal((await readFile(path.join(profile,'credentials.openai.dpapi'))).includes(Buffer.from(key)),false);
  await post('/api/conversations',{revision:0,activeId:'portable-test',conversations:[{id:'portable-test',title:'Portable history test',messages:[{id:'m1',role:'user',text:'TEST ONLY persisted conversation',at:new Date().toISOString()}],context:{conditions:{airflow:0}}}]});
  await stop();const restarted=await launch();const restoredHistory=await(await fetch(base+'/api/conversations',{headers:{'X-Flame-Session':session}})).json();assert.equal(restoredHistory.conversations[0].messages[0].text,'TEST ONLY persisted conversation');assert.equal(restoredHistory.conversations[0].context.conditions.airflow,0);assert.equal(restarted.status.configured,true);assert.equal(restarted.status.requests,0);
  const second=spawn(executable,['--no-open','--profile-dir',profile],{cwd:dir,env:{...process.env,PATH:''},windowsHide:true,stdio:'ignore'});const [exit]=await once(second,'exit');assert.equal(exit,0);assert.equal(JSON.parse(await readFile(path.join(profile,'instance.json'),'utf8')).pid,child.pid);
  assert.equal((await post('/api/settings/key',{clear:true})).configured,false);await stop();
  const evidence={passed:true,at:new Date().toISOString(),sha256,bytes:binary.length,checks:['release manifest hash matches tested EXE','relocated EXE with spaces and Turkish characters','PATH empty; no external Node runtime','missing folder shows setup UI without phantom embedded data','adjacent dataset loaded after restart','PSI and non-PSI source cards load','indexed numerical CSV opens with SHA verification','assets available','0 provider calls','DPAPI encrypted key','key survives full process restart','conversation and zero-valued environment survive full process restart','repeat launch reuses existing instance','explicit key removal','shutdown stops process','no credential file HTTP access'],limitations:['same Windows machine; clean second-machine test pending','OS SmartScreen/signing not verified'],providerCalls:0};await writeFile(path.join(root,'qa','portable-verification.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{if(child && child.exitCode===null)child.kill();await delay(200);const target=path.resolve(dir);assert.ok(target.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(target).startsWith('flame-portable-'),'Cleanup must remain inside the isolated test temporary directory');await rm(target,{recursive:true,force:true});}
