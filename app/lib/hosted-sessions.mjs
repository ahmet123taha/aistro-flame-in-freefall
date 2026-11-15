import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

export function hostedOrigin(value){
  const url=new URL(value);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error('PUBLIC_ORIGIN must be an HTTP(S) origin without a path.');
  return url.origin;
}

async function sessionSecret(directory){
  await mkdir(directory,{recursive:true,mode:0o700});
  const file=path.join(directory,'session-secret');
  try{await writeFile(file,randomBytes(32),{flag:'wx',mode:0o600});}catch(error){if(error.code!=='EEXIST')throw error;}
  const secret=await readFile(file);
  if(secret.length!==32)throw Error('The hosted session secret is invalid; existing visitor identities were preserved.');
  return secret;
}

// Cookie identity is an anonymous browser credential, not a user account. A
// separate purpose-bound token protects mutations; neither value is logged.
export async function createHostedSessions({directory,origin,createContext,now=Date.now,idleMs=15*60*1000,maxIdleContexts=8}){
  origin=hostedOrigin(origin);
  const root=path.resolve(directory),secret=await sessionSecret(root),contexts=new Map();
  const cookieName=new URL(origin).protocol==='https:'?'__Host-spaceapps':'spaceapps_session';
  const mac=(purpose,id)=>createHmac('sha256',secret).update(purpose+'\0'+id).digest('hex');
  const valid=value=>{
    if(!/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(value||''))return false;
    const [id,signature]=value.split('.');
    return timingSafeEqual(Buffer.from(signature,'hex'),Buffer.from(mac('cookie',id),'hex'));
  };
  function prune(){
    const idle=[...contexts.entries()].filter(([,c])=>c.active===0&&!c.isBusy()).sort((a,b)=>a[1].lastUsed-b[1].lastUsed);
    for(const [id,c] of idle){
      if(now()-c.lastUsed<idleMs&&contexts.size<=maxIdleContexts)continue;
      c.app.removeAllListeners();contexts.delete(id);
    }
  }
  const timer=setInterval(prune,Math.min(idleMs,60000));timer.unref();
  return {
    cookieName,
    get size(){return contexts.size;},
    prune,
    async acquire(req,res){
      const cookies=String(req.headers.cookie||'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(cookieName+'='));
      let value=cookies.length===1?cookies[0].slice(cookieName.length+1):'';
      if(!valid(value)){
        const id=randomBytes(32).toString('hex');value=id+'.'+mac('cookie',id);
        res.setHeader('Set-Cookie',`${cookieName}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${origin.startsWith('https:')?'; Secure':''}`);
      }
      const id=value.split('.')[0];
      let context=contexts.get(id);
      if(!context){
        // Only server-issued hexadecimal identifiers reach the filesystem.
        const visitorDirectory=path.join(root,'visitors',id);
        const created=createContext({directory:visitorDirectory,sessionToken:mac('csrf',id)});
        context={app:created.app||created,isBusy:created.isBusy||(()=>false),active:0,lastUsed:now()};contexts.set(id,context);
      }
      context.active++;context.lastUsed=now();let released=false;
      const release=()=>{if(released)return;released=true;context.active--;context.lastUsed=now();prune();};
      res.once('finish',release);res.once('close',release);prune();
      return context.app;
    },
    close(){clearInterval(timer);for(const context of contexts.values())if(!context.active)context.app.removeAllListeners();contexts.clear();}
  };
}

// Core analyzers cache complete research responses in a Map. Keep the disk
// cache and diagnostics isolated, but release that Map after every hosted turn.
export function hostedAnalyzer({factory,options}){
  let busy=false;
  const stats={requests:0,successes:0,cacheHits:0,promptTokens:0,outputTokens:0,persistenceWarnings:0};
  return {
    status:()=>({provider:'OpenAI',configured:Boolean(options.key),model:options.model,busy,...stats}),
    async analyze(request){
      if(busy)throw Object.assign(Error('An analysis is already running in this browser session. No new request was sent.'),{status:409,code:'BUSY'});
      if(!options.key)throw Object.assign(Error('The AI service is not configured on the server. Source browsing remains available.'),{status:503,code:'NO_KEY'});
      busy=true;let analyzer;
      try{analyzer=factory(options);return await analyzer.analyze(request);}
      finally{if(analyzer){const state=analyzer.status();for(const name of Object.keys(stats))stats[name]+=Number(state[name])||0;}busy=false;}
    }
  };
}
