import {cleanContextState} from './public/context-fields.mjs';
import {applyDialogueConditions} from './lib/dialogue-conditions.mjs';
import {PDF_ASSETS} from './lib/pdf-assets.mjs';
import {planDialogueTurn} from './public/dialogue-flow.mjs';
import {recommendationContext} from './lib/recommendations.mjs';
import {unavailableKeys} from './public/condition-requests.mjs';
import {createConversationStore,CONVERSATION_BYTES} from './lib/conversations.mjs';
import {materialCatalog,researchRanking} from './lib/research.mjs';
import {localDiscovery,canKeepLocalDiscovery} from './lib/local-discovery.mjs';
import {materialApplicability} from './lib/material-applicability.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { loadCorpus, validateRequest, rankRecords, DEFAULT_QUESTION, DEFAULT_CONDITIONS } from './lib/corpus.mjs';
import { createAnalyzer, MODEL } from './lib/openai.mjs';
import { createCredentialStore, profileDirectory, normalizeApiKey } from './lib/credentials.mjs';
import { matchSources, retrieveRecords } from './lib/retrieval.mjs';
import { VERSION } from './lib/version.mjs';
import {matchExperiments,PARAMETERS,DEFAULT_WEIGHTS} from './lib/numeric-matching.mjs';
import {serveDatasetFile} from './lib/file-response.mjs';

const ROOT=path.dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR=process.env.PSI_METADATA_DIR || 'C:\\Users\\Ahmet Taha\\Desktop\\Spaceapps\\Inventory_PSI';

async function readSecret() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY.trim();
  if (!process.argv.includes('--key-stdin')) return '';
  process.stdout.write('Enter your OpenAI API key (hidden; this session only), then Enter: ');
  return new Promise(resolve=>{
    let value='';
    if(process.stdin.isTTY) process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8'); process.stdin.resume();
    const done=()=>{process.stdin.off('data',onData); if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();process.stdout.write('\n');resolve(value.trim());};
    const onData=chunk=>{for(const char of chunk){if(char==='\u0003')process.exit(0);if(char==='\r'||char==='\n'){done();return;}if(char==='\u007f'||char==='\b')value=value.slice(0,-1);else if(char>=' ')value+=char;}};
    process.stdin.on('data',onData);
  });
}

export function createApp({corpus,analyzer,dataset,applicationDirectory='',conversationStore=createConversationStore(),credentialStore,onShutdown,readAsset=file=>readFile(path.join(ROOT,'public',file)),sessionToken=randomBytes(24).toString('hex'),publicOrigin='',hosted=false}) {
  let configuring=false,analyzing=false;
  const allowedOrigin=publicOrigin?new URL(publicOrigin).origin:'';
  const status=()=>({...analyzer.status(),applicationId:'flame-in-freefall',version:VERSION,...(!hosted?{applicationDirectory}:{}),hosted,historyStorage:hosted?'server':'device',dataset:dataset?.status || {state:'demo'},corpusHash:corpus.hash,canSaveKey:!hosted&&Boolean(credentialStore),canShutdown:!hosted&&Boolean(onShutdown)});
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data));};
  const assets={'/':['index.html','text/html; charset=utf-8'],'/index.html':['index.html','text/html; charset=utf-8'],'/styles.css':['styles.css','text/css; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/favicon.svg':['favicon.svg','image/svg+xml']};
  for(const name of ['prepared-graph-reader.mjs','prepared-graphs.css','branding.css','branding/aistro-bee.jpeg','branding/astrobee-wordmark.jpeg'])assets['/'+name]=[name,name.endsWith('.css')?'text/css; charset=utf-8':name.endsWith('.mjs')?'text/javascript; charset=utf-8':'image/jpeg'];
  for(const name of ['source-content-status.mjs','source-reference.mjs','parameter-comparison.mjs','material-support-card.mjs','gravity-input.mjs','dialogue-flow.mjs','figure-models.mjs','figure-reader.mjs','source-library.mjs','table-preview.mjs','recommendations-panel.mjs','source-briefing.mjs','safety-workspace.mjs','safety-steps-panel.mjs',...PDF_ASSETS])assets['/'+name]=[name,/\.m?js$/.test(name)?'text/javascript; charset=utf-8':name.endsWith('.wasm')?'application/wasm':'application/octet-stream'];
  for(const name of ['context-fields.mjs','context-fields-panel.mjs','context-fields.css','condition-requests.mjs','scenario-panel.mjs'])assets['/'+name]=[name,name.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'];
  assets['/conversation-panel.mjs']=['conversation-panel.mjs','text/javascript; charset=utf-8'];
  assets['/safety-steps.css']=['safety-steps.css','text/css; charset=utf-8'];
  for(const name of ['condition-guidance.css','pdf-flow-reader.mjs','document-reader.css','workspace-entry.mjs','workspace-entry.css'])assets['/'+name]=[name,name.endsWith('.css')?'text/css; charset=utf-8':'text/javascript; charset=utf-8'];
  assets['/environment-panel.mjs']=['environment-panel.mjs','text/javascript; charset=utf-8'];
  assets['/physical-card.mjs']=['physical-card.mjs','text/javascript; charset=utf-8'];
  assets['/thermal-card.mjs']=['thermal-card.mjs','text/javascript; charset=utf-8'];
  assets['/boundary-card.mjs']=['boundary-card.mjs','text/javascript; charset=utf-8'];
  assets['/gas-physics-card.mjs']=['gas-physics-card.mjs','text/javascript; charset=utf-8'];
  assets['/gas-observations.mjs']=['gas-observations.mjs','text/javascript; charset=utf-8'];
  assets['/transition-card.mjs']=['transition-card.mjs','text/javascript; charset=utf-8'];
  assets['/experiment-comparison.mjs']=['experiment-comparison.mjs','text/javascript; charset=utf-8'];
  assets['/numeric-card.mjs']=['numeric-card.mjs','text/javascript; charset=utf-8'];
  assets['/result-card.mjs']=['result-card.mjs','text/javascript; charset=utf-8'];
  assets['/workspace-state.mjs']=['workspace-state.mjs','text/javascript; charset=utf-8'];
  assets['/THIRD_PARTY_NOTICES.txt']=['THIRD_PARTY_NOTICES.txt','text/plain; charset=utf-8'];
  return http.createServer(async(req,res)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data: blob:; worker-src 'self'; font-src 'self' blob: data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    const host=req.headers.host || '';
    if (allowedOrigin?host!==new URL(allowedOrigin).host:!/^(127\.0\.0\.1|localhost):\d+$/.test(host)) return json(res,403,{error:hosted?'This host is not configured for SpaceApps.':"Local access is required."});
    const pathname=new URL(req.url,`http://${host}`).pathname;
    try {
      // Retired emergency transport: reject before reading a body or creating provider state.
      if(['/api/incident/session','/api/incident/message','/api/incident/end'].includes(pathname))return json(res,410,{error:'Incident voice and text support has been removed. Use the Safety workspace.',code:'INCIDENT_REMOVED'});
      if(hosted&&['/api/settings/key','/api/shutdown'].includes(pathname))return json(res,404,{error:'Not found.'});
      if(req.method==='GET' && assets[pathname]) {const [file,mime]=assets[pathname];res.writeHead(200,{'Content-Type':mime});return res.end(await readAsset(file));}
      if(req.method==='GET' && pathname==='/api/material-support'){const params=new URL(req.url,`http://${host}`).searchParams;const material=params.get('material')||'',sourceId=params.get('sourceId');if(material.length>140||(sourceId&&!corpus.records.some(r=>r.id===sourceId)))return json(res,400,{error:'Invalid material-support query.'});return json(res,200,{datasetStatus:corpus.materialSupport?.status||{state:'missing'},support:materialApplicability(corpus,{material},sourceId)});}
      if(req.method==='GET' && pathname==='/api/catalog') return json(res,200,{records:corpus.records,hash:corpus.hash,sessionToken,defaultQuestion:DEFAULT_QUESTION,defaultConditions:DEFAULT_CONDITIONS,status:status(),materialSuggestions:materialCatalog(corpus),numeric:{parameters:PARAMETERS,defaultWeights:DEFAULT_WEIGHTS,materials:corpus.experiments?.materials||[],summary:corpus.experiments?.summary||{rows:0,sources:0}}});
      if(req.method==='GET' && pathname==='/api/status') return json(res,200,status());
      if(req.method==='GET' && pathname==='/api/files') {
        if(!dataset?.available)return json(res,409,{error:"The Veri_Seti folder has not been loaded."});
        const params=new URL(req.url,`http://${host}`).searchParams;
        return json(res,200,dataset.list({kind:params.get('kind') || '',accession:params.get('accession') || '',q:params.get('q') || '',offset:Number(params.get('offset') || 0)}));
      }
      const graphMatch=pathname.match(/^\/api\/graphs\/(g[\w-]+)$/);
      if(req.method==='GET'&&graphMatch){if(!dataset?.preparedGraphs)return json(res,409,{error:'Prepared graph add-on is not loaded.'});return json(res,200,await dataset.preparedGraphs.get(graphMatch[1]));}
      const fileMatch=pathname.match(/^\/api\/files\/(f\d+)(\/preview)?$/);
      if((req.method==='GET'||(req.method==='HEAD'&&!fileMatch?.[2])) && fileMatch) {
        if(!dataset?.available)return json(res,409,{error:"The Veri_Seti folder has not been loaded."});
        return await serveDatasetFile(req,res,dataset,fileMatch[1],{preview:Boolean(fileMatch[2])});
      }
      const sourceMatch=pathname.match(/^\/api\/sources\/((?:PSI|REF)-\d+)$/);
      if(req.method==='GET' && sourceMatch) {
        const record=corpus.records.find(r=>r.id===sourceMatch[1]);
        return record ? json(res,200,record) : json(res,404,{error:"The source is not on the allowlist."});
      }
      if(req.method==='GET' && pathname==='/api/conversations') {
        if(req.headers['x-flame-session']!==sessionToken)return json(res,403,{error:'Session required.'});
        return json(res,200,await conversationStore.read());
      }
      if(req.method==='POST' && ['/api/conversations','/api/rank','/api/match','/api/research','/api/chat','/api/analyze','/api/settings/key','/api/shutdown'].includes(pathname)) {
        if(req.headers['x-flame-session']!==sessionToken || (req.headers.origin && req.headers.origin!==(allowedOrigin||`http://${host}`))) return json(res,403,{error:"The session could not be verified; refresh the page."});
        if(!req.headers['content-type']?.startsWith('application/json')) return json(res,415,{error:'JSON gerekli.'});
        const chunks=[];let bytes=0;
        for await(const chunk of req) {bytes+=chunk.length;if(bytes>(pathname==='/api/conversations'?CONVERSATION_BYTES:['/api/chat','/api/research'].includes(pathname)?98304:16384))return json(res,413,{error:"Request is too large."});chunks.push(chunk);}
        let body;
        try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{return json(res,400,{error:"Valid JSON is required."});}
        if(!body||typeof body!=='object'||Array.isArray(body))return json(res,400,{error:'The request must be a JSON object.',code:'REQUEST_SHAPE'});
        if(pathname==='/api/conversations')return json(res,200,await conversationStore.save(body));
        if(pathname==='/api/settings/key') {
          if(!credentialStore)return json(res,503,{error:"API-key storage is disabled in this run."});
          if(analyzing || analyzer.status().busy || configuring)return json(res,409,{error:"Change the API key after the current operation finishes."});
          let key='';
          try{if(body?.clear!==true)key=normalizeApiKey(body?.key);}catch(error){return json(res,400,{error:error.message});}
          configuring=true;
          try{if(body?.clear===true)await credentialStore.clear();else await credentialStore.save(key);analyzer.setKey(key);}
          catch{return json(res,500,{error:"The key could not be saved to the Windows user vault. The existing setting was preserved."});}
          finally{configuring=false;}
          return json(res,200,{...status(),saved:body?.clear!==true});
        }
        if(pathname==='/api/shutdown') {
          if(!onShutdown)return json(res,409,{error:"Shutdown is disabled in this run."});
          if(analyzing || analyzer.status().busy || configuring)return json(res,409,{error:"The application cannot stop while an operation is running."});
          json(res,200,{closing:true});setTimeout(onShutdown,150);return;
        }
        if(pathname==='/api/research') {
          if(typeof body.scenario!=='string'||body.scenario.length>8000)return json(res,400,{error:'Scenario must be text, up to 8000 characters.'});
          let research;
          try{research=validateRequest({mode:'chat',ids:corpus.records.map(r=>r.id),question:body.question||'Ask about my scenario.',history:body.history,conditions:{gravity:'other',...body.conditions}},corpus.records.map(r=>r.id));}catch(error){return json(res,400,{error:error.message});}
          research={...research,incidentMode:body.incidentMode===true,previousRecommendations:recommendationContext(body.previousRecommendations),mode:'research',contextDetails:cleanContextState(body.contextDetails),unavailableConditions:unavailableKeys(body.unavailableConditions),scenario:body.scenario,atmosphere:String(body.atmosphere||'').slice(0,1000),conditionBasis:Object.fromEntries(Object.entries(body.conditionBasis||{}).filter(([k,v])=>['user_reported','estimated'].includes(v)))};
          // Recompute routing here; never trust a client-provided scientific mode.
          const flow=planDialogueTurn({...research,trigger:body.trigger,replyLanguage:body.replyLanguage});
          research={...research,flow,scenario:flow.scenario,replyLanguage:flow.replyLanguage};
          // Only the latest actual user message may supply automatic updates.
          // Normalize before retrieval, provider context and same-turn scoring.
          const dialogue=applyDialogueConditions({...research,trigger:body.trigger});
          research=dialogue.request;
          if(body.focusSourceId!=null&&!corpus.records.some(r=>r.id===body.focusSourceId))return json(res,400,{error:'The focused source is not in the local catalog.',code:'SOURCE_FOCUS_INVALID'});
          research.focusSourceId=body.focusSourceId||null;
          if(!flow.canRank)research.ids=[];
          else if(body.focusSourceId)research.ids=[body.focusSourceId];
          if(configuring||analyzing||analyzer.status().busy)return json(res,409,{error:'Wait for the current operation to finish.'});
          analyzing=true;
          try{const result=await analyzer.analyze(research);return json(res,200,{...result,analysis:{...result.analysis,conditionAutofill:dialogue.receipt},conditionUpdates:dialogue.receipt.updates,ranking:researchRanking(corpus,research,result.analysis)});}catch(error){error.conditionUpdates=dialogue.receipt.updates;if(canKeepLocalDiscovery(error))error.localDiscovery=localDiscovery(corpus,research);throw error;}finally{analyzing=false;}
        }
        let request;
        try{request=validateRequest(pathname==='/api/chat'?{...body,mode:'chat',ids:Array.isArray(body.ids)&&body.ids.length?body.ids:corpus.records.map(r=>r.id),conditions:{gravity:'other',...body.conditions}}:body,corpus.records.map(r=>r.id));}catch(error){return json(res,400,{error:error.message});}
        if(pathname==='/api/match')return json(res,200,matchExperiments(corpus,request));
        if(pathname==='/api/chat'){request.previousRecommendations=recommendationContext(body.previousRecommendations);request.mode='chat';request.ids=retrieveRecords(corpus,request,{limit:6}).matches.map(r=>r.id);}
        if(pathname==='/api/rank')return json(res,200,{ranked:rankRecords(corpus.records,request),request});
        if(request.ids.length>6)return json(res,400,{error:"Select up to 6 sources per AI review. Review additional sources separately."});
        if(configuring)return json(res,409,{error:"Key storage is in progress; no analysis request was sent."});
        if(analyzing)return json(res,409,{error:"An analysis is already running."});
        analyzing=true;
        try{return json(res,200,await analyzer.analyze(request));}finally{analyzing=false;}
      }
      json(res,404,{error:"Not found."});
    }catch(error){if(res.destroyed)return;const privateStorageError=hosted&&['ENOENT','EACCES','EPERM','ENOSPC','EIO','ENOTDIR'].includes(error.code);json(res,error.status || 502,{error:privateStorageError?'A required server file could not be accessed. Existing data was preserved.':error.message || "The operation could not be completed.",code:error.code || 'ANALYSIS_INVALID',...(error.provider?{provider:error.provider}:{}),...(error.validation?{validation:error.validation}:{}),...(error.localDiscovery?{localDiscovery:error.localDiscovery}:{}),...(Array.isArray(error.conditionUpdates)?{conditionUpdates:error.conditionUpdates}:{})});}
  });
}

if(process.env.FLAME_PORTABLE_BUILD!=='1' && process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const corpus=await loadCorpus(SOURCE_DIR);
  const credentialStore=createCredentialStore(profileDirectory());
  const key=await readSecret() || await credentialStore.load();
  const analyzer=createAnalyzer({corpus,key,model:MODEL,runtimeDir:path.join(ROOT,'.runtime')});
  const app=createApp({corpus,analyzer,credentialStore,conversationStore:createConversationStore(profileDirectory())});
  const port=Number(process.env.PORT || 8770);
  app.listen(port,'127.0.0.1',()=>console.log(`Flame in Freefall: http://127.0.0.1:${port}\n${corpus.records.length} metadata sources loaded. OpenAI: ${key?'configured':'waiting for key'}. No startup API request was sent.`));
}
