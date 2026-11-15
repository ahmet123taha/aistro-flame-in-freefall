import {cleanSafetyWorkspace} from '../public/safety-workspace.mjs';
import {mkdir,readFile,writeFile,rename,copyFile} from 'node:fs/promises';
import path from 'node:path';
import {cleanContextState} from '../public/context-fields.mjs';
import {cleanPanelState} from '../public/condition-requests.mjs';
import {REPLY_LANGUAGES} from '../public/dialogue-flow.mjs';

export const CONVERSATION_BYTES=4*1024*1024;
const empty=()=>({revision:0,activeId:null,conversations:[]});
export function validateConversations(value){
  const fail=()=>{throw Object.assign(new Error('Conversation history is invalid or full. Existing history was preserved.'),{status:400});};
  if(!value||!Number.isSafeInteger(value.revision)||value.revision<0||!Array.isArray(value.conversations)||value.conversations.length>50)fail();
  if(Buffer.byteLength(JSON.stringify(value))>CONVERSATION_BYTES)fail();
  const ids=new Set();
  const conversations=value.conversations.map(c=>{
    if(!c||!/^[-a-zA-Z0-9]{1,80}$/.test(c.id)||ids.has(c.id)||typeof c.title!=='string'||c.title.length>160||!Array.isArray(c.messages)||c.messages.length>500)fail();
    ids.add(c.id);
    const messages=c.messages.map(m=>{
      if(!m||!['user','assistant','application'].includes(m.role)||typeof m.text!=='string'||m.text.length>20000||typeof m.id!=='string')fail();
      // Explicit allowlist: no HTML, credentials, URLs or arbitrary profile paths.
      return {id:m.id,role:m.role,text:m.text,at:String(m.at||'').slice(0,40),mode:m.mode==='research'?'research':'chat',...(m.response?{response:{analysis:m.response.analysis,provider:m.response.provider,model:m.response.model,cached:m.response.cached,createdAt:m.response.createdAt,displayNotice:typeof m.response.displayNotice==='string'?m.response.displayNotice.slice(0,600):undefined}}:{}),...(m.provider?{provider:m.provider}:{}),...(m.applied?{applied:m.applied}:{}),...(m.failed?{failed:true}:{})};
    });
    return {id:c.id,title:c.title,updatedAt:String(c.updatedAt||'').slice(0,40),messages,context:{focusSourceId:/^(PSI|REF)-[0-9]+$/.test(c.context?.focusSourceId||'')?c.context.focusSourceId:null,contextDetails:cleanContextState(c.context?.contextDetails),conditionPanel:cleanPanelState(c.context?.conditionPanel),recommendations:cleanSafetyWorkspace(c.context?.recommendations),replyLanguage:REPLY_LANGUAGES.includes(c.context?.replyLanguage)?c.context.replyLanguage:'',scenario:String(c.context?.scenario||'').slice(0,8000),conditions:c.context?.conditions||{},...(typeof c.context?.gravityInput==='string'?{gravityInput:c.context.gravityInput.slice(0,80)}:{}),conditionBasis:c.context?.conditionBasis||{},material:String(c.context?.material||'').slice(0,140),atmosphere:String(c.context?.atmosphere||'').slice(0,1000)}};
  });
  if(value.activeId!==null&&!ids.has(value.activeId))fail();
  return {revision:value.revision,activeId:value.activeId,conversations};
}

export function createConversationStore(directory){
  let queue=Promise.resolve(),memory=empty();
  const file=directory?path.join(directory,'conversations.json'):null;
  async function read(){
    if(!file)return structuredClone(memory);
    try{return validateConversations(JSON.parse(await readFile(file,'utf8')));}
    catch(e){if(e.code==='ENOENT')return empty();throw Object.assign(new Error('Saved conversation history could not be read. The file has been preserved.'),{status:500});}
  }
  return {read,save(value){
    const next=validateConversations(value);
    const operation=queue.then(async()=>{
      const current=await read();
      if(next.revision!==current.revision)throw Object.assign(new Error('History changed in another window. Reload before saving; no history was overwritten.'),{status:409});
      next.revision++;
      if(file){await mkdir(directory,{recursive:true});await writeFile(file+'.tmp',JSON.stringify(next));try{await copyFile(file,file+'.bak');}catch(e){if(e.code!=='ENOENT')throw e;}await rename(file+'.tmp',file);}
      else memory=structuredClone(next);
      return {revision:next.revision,saved:true};
    });
    queue=operation.catch(()=>{});return operation;
  }};
}
