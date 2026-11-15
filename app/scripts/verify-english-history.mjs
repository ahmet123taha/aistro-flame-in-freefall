import assert from 'node:assert/strict';import {readFile,writeFile,mkdir,mkdtemp,cp,rm,readdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';import {once} from 'node:events';import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
import {fixture} from '../tests/dataset-fixture.mjs';
const plan=JSON.parse(await readFile('qa/english-migration/history-plan.json','utf8'));
const delay=ms=>new Promise(r=>setTimeout(r,ms)),sha=b=>createHash('sha256').update(b).digest('hex');
for(const record of plan){
 if(process.argv[2]&&record.version!==process.argv[2])continue;
 const root=path.resolve(record.sourceRoot,'..'),manifest=JSON.parse(await readFile(path.join(root,'build/build-manifest.json'))),source=path.join(root,'package/SpaceApps1/SpaceApps1.exe');
 const b=await readFile(source);assert.equal(sha(b),manifest.sha256);
 const temp=await mkdtemp(path.join(os.tmpdir(),'spaceapps-en-')),profile=path.join(temp,'profile'),exe=path.join(temp,'English portable.exe');await cp(source,exe);
 let child,base,token;const checks=[];
 async function launch(){child=spawn(exe,['--no-open','--profile-dir',profile],{cwd:temp,env:{...process.env,PATH:''},stdio:'ignore',windowsHide:true});child.on('error',()=>{});for(let i=0;i<100;i++){try{const s=JSON.parse(await readFile(path.join(profile,'instance.json')));base='http://127.0.0.1:'+s.port;const res=await fetch(base+'/api/catalog');assert.equal(res.status,200);const c=await res.json();token=c.sessionToken;return c;}catch{await delay(100);}}throw Error('Launch timeout '+record.version);}
 async function post(url,body){const res=await fetch(base+url,{method:'POST',headers:{'Content-Type':'application/json','X-Flame-Session':token},body:JSON.stringify(body)});assert.equal(res.status,200,url);return res.json();}
 async function stop(){const done=once(child,'exit');await post('/api/shutdown',{});await done;}
 try{
  let c=await launch();assert.equal(c.status.version,record.version);assert.equal(c.status.dataset.state,'missing');assert.equal(c.records.length,0);await stop();checks.push('missing dataset handled; correct version; empty PATH');
  await fixture(temp);c=await launch();assert.equal(c.status.dataset.state,'ready');assert.equal(c.records.length,2);assert.equal(c.status.requests,0);assert.equal(c.status.configured,false);checks.push('adjacent fixture dataset loads; no stored credentials; zero provider calls');
  const html=await(await fetch(base+'/')).text();assert.match(html,/lang="en"/);assert.ok(!/[çğıöşüÇĞİÖŞÜ]/.test(html),'Untranslated HTML text');
  for(const name of await readdir(path.join(root,'english/public'))){if(!/\.(m?js|css|html)$/.test(name))continue;const res=await fetch(base+'/'+(name==='index.html'?'':name));assert.equal(res.status,200,name);assert.equal(await res.text(),await readFile(path.join(root,'english/public',name),'utf8'),name);}
  checks.push('embedded browser assets match translated source bytes; English document language');
  const files=await(await fetch(base+'/api/files?accession=PSI-25')).json();assert.equal(files.total,1);assert.match((await(await fetch(base+'/api/files/f0/preview')).json()).text,/oxygen,pressure/);checks.push('indexed CSV read and verified');
  const key='TEST_ONLY_NOT_A_PROVIDER_KEY_123456789012345';assert.equal((await post('/api/settings/key',{key})).configured,true);assert.equal((await readFile(path.join(profile,'credentials.dpapi'))).includes(Buffer.from(key)),false);await stop();c=await launch();assert.equal(c.status.configured,true);assert.equal(c.status.requests,0);await post('/api/settings/key',{clear:true});await stop();checks.push('dummy key encrypted; survives restart; explicit removal; clean shutdown; no live request');
  const evidence={version:record.version,passed:true,exeSha256:manifest.sha256,at:new Date().toISOString(),providerCalls:0,checks,limitations:['Same Windows machine; no clean second-device acceptance.','Historical defects remain; English translation is not a scientific redesign.','Browser layout and full real-dataset checks recorded separately.']};
  await writeFile(path.join(root,'build/portable-verification.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({version:record.version,passed:true,sha256:manifest.sha256}));
 }catch(e){await writeFile(path.join(root,'build/portable-verification.json'),JSON.stringify({version:record.version,passed:false,error:e.message,checks},null,2));console.log(JSON.stringify({version:record.version,passed:false,error:e.message}));}
 finally{if(child&&child.exitCode===null)child.kill();await delay(250);await rm(temp,{recursive:true,force:true});}
}
