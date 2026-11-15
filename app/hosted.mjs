import http from 'node:http';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApp} from './server.mjs';
import {loadDataset} from './lib/dataset.mjs';
import {createAnalyzer,MODEL} from './lib/openai.mjs';
import {createConversationStore} from './lib/conversations.mjs';
import {createHostedSessions,hostedAnalyzer,hostedOrigin} from './lib/hosted-sessions.mjs';
import {VERSION} from './lib/version.mjs';

export async function createHostedServer({dataset,key='',model=MODEL,publicOrigin,stateDirectory,analyzerFactory=createAnalyzer,readAsset,sessionOptions={}}){
  if(!dataset?.available||!dataset.corpus)throw Error('The verified Veri_Seti dataset is required for hosted operation.');
  const origin=hostedOrigin(publicOrigin),expectedHost=new URL(origin).host;
  const sessions=await createHostedSessions({...sessionOptions,directory:stateDirectory,origin,createContext:({directory,sessionToken})=>{
    const analyzer=hostedAnalyzer({factory:analyzerFactory,options:{corpus:dataset.corpus,key,model,contextProvider:request=>dataset.context(request),runtimeDir:path.join(directory,'analysis')}});
    return {app:createApp({corpus:dataset.corpus,dataset,analyzer,conversationStore:createConversationStore(directory),sessionToken,publicOrigin:origin,hosted:true,...(readAsset?{readAsset}:{})}),isBusy:()=>analyzer.status().busy};
  }});
  const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
  const server=http.createServer(async(req,res)=>{
    if(req.headers.host!==expectedHost)return json(res,403,{error:'This host is not configured for SpaceApps.'});
    if(req.headers.origin&&req.headers.origin!==origin)return json(res,403,{error:'Cross-origin access is not allowed.'});
    if(req.method==='GET'&&req.url==='/healthz')return json(res,200,{state:'ready',applicationId:'flame-in-freefall',version:VERSION,dataset:dataset.status?.state||'ready'});
    try{const app=await sessions.acquire(req,res);app.emit('request',req,res);}
    catch{if(!res.headersSent)json(res,503,{error:'The application session could not be opened. Please try again.'});else res.destroy();}
  });
  server.on('close',()=>sessions.close());
  // Local diagnostics/test hook only; never exposed through an HTTP route.
  server.hostedSessions=sessions;
  return server;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const applicationDirectory=path.resolve(process.env.SPACEAPPS_DATA_ROOT||process.env.APPLICATION_DIRECTORY||path.dirname(fileURLToPath(import.meta.url)));
  const stateDirectory=path.resolve(process.env.SPACEAPPS_STATE_DIR||path.join(applicationDirectory,'.hosted-state'));
  const publicOrigin=process.env.PUBLIC_ORIGIN;
  if(!publicOrigin)throw Error('Set PUBLIC_ORIGIN to the public SpaceApps origin.');
  const dataset=await loadDataset(applicationDirectory);
  // The pinned indexes retain parsed records, not the temporary compressed and
  // decoded buffers. On small hosted machines, release completed async reads
  // before serving visitors. This optional startup-only GC is enabled by the
  // service's --expose-gc flag; ordinary Node execution remains supported.
  if(typeof global.gc==='function'){
    await new Promise(resolve=>setImmediate(resolve));global.gc();
    await new Promise(resolve=>setImmediate(resolve));global.gc();
  }
  const server=await createHostedServer({dataset,key:process.env.OPENAI_API_KEY?.trim()||'',model:process.env.OPENAI_MODEL?.trim()||MODEL,publicOrigin,stateDirectory});
  const port=Number(process.env.PORT||8770);
  if(!Number.isInteger(port)||port<1||port>65535)throw Error('PORT must be an integer from 1 to 65535.');
  server.listen(port,'127.0.0.1',()=>console.log(`SpaceApps ${VERSION} ready on loopback port ${port}; public origin ${hostedOrigin(publicOrigin)}. No startup model request was sent.`));
  const stop=()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),15000).unref();};
  process.once('SIGTERM',stop);process.once('SIGINT',stop);
}
