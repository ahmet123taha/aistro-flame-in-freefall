import {createConversationStore} from './lib/conversations.mjs';
import { isSea, getAsset } from 'node:sea';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { loadDataset } from './lib/dataset.mjs';
import { VERSION } from './lib/version.mjs';
import { createAnalyzer, MODEL } from './lib/openai.mjs';
import { createCredentialStore, profileDirectory } from './lib/credentials.mjs';
import { createApp } from './server.mjs';
import { runtimeProfiles } from './lib/runtime-profile.mjs';

async function main(){
  if(!isSea())throw new Error("This entry point is for the single-executable package.");
  const override=process.argv.indexOf('--profile-dir');
  const locations=runtimeProfiles(profileDirectory(),VERSION,override>=0?process.argv[override+1]:null);
  const profile=locations.profile;
  await mkdir(profile,{recursive:true});
  const receipt=path.join(profile,'instance.json');
  const applicationDirectory=path.dirname(process.execPath);
  let dataset;
  try{dataset=await loadDataset(applicationDirectory);}catch(error){await writeFile(path.join(profile,'dataset-error.txt'),String(error.message).slice(0,1000));dataset={available:false,status:{state:'invalid',message:"The Veri_Seti package is incompatible or its indexes are damaged. Extract the original ZIP again and restart the application."}};}
  const corpus=dataset.corpus || {records:[],hash:'no-dataset-'+dataset.status.state};
  function open(url){if(process.argv.includes('--no-open'))return;const browser=spawn(path.join(process.env.SystemRoot || 'C:\\Windows','System32','rundll32.exe'),['url.dll,FileProtocolHandler',url],{detached:true,windowsHide:true,stdio:'ignore'});browser.on('error',()=>{});browser.unref();}
  try{const previous=JSON.parse(await readFile(receipt,'utf8'));if(Number.isInteger(previous.port) && previous.port>0 && previous.port<65536){const url=`http://127.0.0.1:${previous.port}`;const response=await fetch(url+'/api/status',{signal:AbortSignal.timeout(1000)});const state=await response.json();if(state.applicationId==='flame-in-freefall' && state.version===VERSION && state.applicationDirectory===applicationDirectory && state.corpusHash===corpus.hash){open(url);return;}}}catch{/* Stale or other-folder instance: start a new loopback listener. */}
  const credentialStore=createCredentialStore(locations.credentials);
  let key='';
  try{key=await credentialStore.load();}catch{await writeFile(path.join(profile,'credential-status.txt'),"The stored key cannot be decrypted in this Windows account. Save it again in API settings.\n");}
  const analyzer=createAnalyzer({corpus,key,contextProvider:dataset.available?r=>dataset.context(r):undefined,model:MODEL,runtimeDir:path.join(profile,'cache')});
  let stopping=false;
  const stop=async()=>{if(stopping)return;stopping=true;app.closeAllConnections();await new Promise(resolve=>app.close(resolve));try{const current=JSON.parse(await readFile(receipt,'utf8'));if(current.pid===process.pid)await unlink(receipt);}catch{}process.exitCode=0;};
  const app=createApp({corpus,analyzer,dataset,applicationDirectory,credentialStore,conversationStore:createConversationStore(profile),onShutdown:stop,readAsset:file=>Buffer.from(getAsset('public/'+file))});
  await new Promise((resolve,reject)=>{app.once('error',reject);app.listen(0,'127.0.0.1',resolve);});
  const port=app.address().port;
  await writeFile(receipt,JSON.stringify({pid:process.pid,port,version:VERSION,applicationDirectory,startedAt:new Date().toISOString()}));
  process.on('SIGINT',stop);process.on('SIGTERM',stop);
  open(`http://127.0.0.1:${port}`);
}
main().catch(async()=>{try{await mkdir(profileDirectory(),{recursive:true});await writeFile(path.join(profileDirectory(),'startup-error.txt'),"The application could not start. Download the executable to a local folder and try again.\n");}catch{}process.exitCode=1;});
