export const OPENAI_ENDPOINT='https://api.openai.com/v1/responses';
// Explicitly reviewed model policy. Unknown overrides fail locally, never fall back.
export const SUPPORTED_OPENAI_MODELS=Object.freeze(['gpt-6.1-sol']);
export const MAX_OPENAI_RESPONSE_BYTES=1024*1024;
// Never let malformed provider JSON become a raw SyntaxError containing input.
// Count decoded streaming bytes rather than trusting Content-Length.
export async function readOpenAIResponse(response,{maxBytes=MAX_OPENAI_RESPONSE_BYTES}={}){
  const invalid=()=>Object.assign(Error('OpenAI returned an invalid response body. No automatic retry was made.'),{status:502,code:'PROVIDER_RESPONSE_INVALID'});
  const oversized=()=>Object.assign(Error('OpenAI returned an oversized response body. No automatic retry was made.'),{status:502,code:'PROVIDER_RESPONSE_TOO_LARGE'});
  if(!Number.isSafeInteger(maxBytes)||maxBytes<1)throw invalid();
  const reader=response.body?.getReader?.();
  if(!reader)throw invalid();
  let bytes=0;const chunks=[];
  try{
    const declared=response.headers?.get?.('content-length');
    if(declared&&/^\d+$/.test(declared)&&Number(declared)>maxBytes)throw oversized();
    while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>maxBytes)throw oversized();chunks.push(value);}
    let parsed;
    try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks,bytes)));}catch{throw invalid();}
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw invalid();
    return parsed;
  }catch(error){
    try{await reader.cancel();}catch{}
    if(error?.name==='TimeoutError'||error?.name==='AbortError')throw error;
    if(['PROVIDER_RESPONSE_INVALID','PROVIDER_RESPONSE_TOO_LARGE'].includes(error?.code))throw error;
    throw invalid();
  }finally{reader.releaseLock();}
}
export function responseState(raw){
  const status=['completed','failed','incomplete','cancelled','queued','in_progress'].includes(raw?.status)?raw.status:'invalid';
  const reason=['max_output_tokens','content_filter'].includes(raw?.incomplete_details?.reason)?raw.incomplete_details.reason:null;
  return {status,...(status==='incomplete'?{incompleteReason:reason}:{}),...(status==='failed'?{failureCode:['server_error','rate_limit_exceeded','invalid_prompt'].includes(raw?.error?.code)?raw.error.code:null}:{})};
}
export function responseRequestOptions(model,effort='medium'){
  if(!SUPPORTED_OPENAI_MODELS.includes(model))throw Object.assign(Error('Unsupported OPENAI_MODEL. Use gpt-6.1-sol.'),{code:'MODEL_UNSUPPORTED'});
  if(!['low','medium','high','xhigh','max'].includes(effort))throw Object.assign(Error('Unsupported OpenAI reasoning effort.'),{code:'REASONING_UNSUPPORTED'});
  // The application has several variable scientific response contracts. JSON mode
  // preserves them; exact evidence, bounds and semantics are validated locally.
  return {store:false,reasoning:{effort},text:{format:{type:'json_object'},verbosity:'low'}};
}
export function extractResponseText(raw){
  const fail=(message,code)=>{throw Object.assign(Error(message),{code});};
  if(raw?.status==='failed')fail('The model response failed; no retry was sent.','MODEL_FAILED');
  if(!raw||raw.status!=='completed')fail('The model response was incomplete; no retry was sent.','MODEL_INCOMPLETE');
  if(!Array.isArray(raw.output))fail('The model returned no readable output; no retry was sent.','MODEL_JSON_INVALID');
  let text='';
  for(const item of raw.output){
    if(item?.type==='reasoning')continue;
    if(item?.type!=='message'||item.role!=='assistant')fail('The model returned an unsupported output type; no retry was sent.','MODEL_OUTPUT_INVALID');
    if(item.status&&item.status!=='completed')fail('The model response was incomplete; no retry was sent.','MODEL_INCOMPLETE');
    if(!Array.isArray(item.content))fail('The model returned no readable output; no retry was sent.','MODEL_JSON_INVALID');
    for(const part of item.content){
      if(part?.type==='refusal')fail('The model declined the request; no retry was sent.','MODEL_REFUSAL');
      if(part?.type!=='output_text'||typeof part.text!=='string')fail('The model returned an unsupported output type; no retry was sent.','MODEL_OUTPUT_INVALID');
      text+=part.text;
    }
  }
  if(!text.trim())fail('The model returned no readable output; no retry was sent.','MODEL_JSON_INVALID');
  return text;
}
export function responseUsage(raw){
  const value=raw?.usage||{},usage={};
  const valid=v=>Number.isSafeInteger(v)&&v>=0;
  for(const [field,alias] of [['input_tokens','promptTokenCount'],['output_tokens','candidatesTokenCount'],['total_tokens','totalTokenCount']])if(valid(value[field])){usage[field]=value[field];usage[alias]=value[field];}
  for(const [field,keys] of [['input_tokens_details',['cached_tokens','cache_write_tokens']],['output_tokens_details',['reasoning_tokens']]]){
    const details=Object.fromEntries(keys.filter(key=>valid(value[field]?.[key])).map(key=>[key,value[field][key]]));
    if(Object.keys(details).length)usage[field]=details;
  }
  return usage;
}
