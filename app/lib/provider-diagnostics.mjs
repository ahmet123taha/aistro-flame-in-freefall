import {createHash} from 'node:crypto';

export const REQUEST_CONTRACT='json-local-validation-v1';
function inputTextBlocks(payload){
 return Array.isArray(payload.input)?payload.input.flatMap(item=>Array.isArray(item?.content)?item.content.filter(part=>part?.type==='input_text'&&typeof part.text==='string').map(part=>part.text):typeof item?.content==='string'?[item.content]:[]):typeof payload.input==='string'?[payload.input]:[];
}
export function validateJsonModeInput(payload){
 if(payload.text?.format?.type==='json_object'&&!inputTextBlocks(payload).some(text=>/\bjson\b/i.test(text)))throw Object.assign(Error('The JSON request is missing an explicit JSON instruction in its input. No provider request was sent.'),{status:400,code:'REQUEST_JSON_INSTRUCTION_MISSING'});
}
export function requestDiagnostic(payload,serialized){
 return {contract:REQUEST_CONTRACT,mimeType:['json_object','json_schema'].includes(payload.text?.format?.type)?'application/json':null,
  hasResponseSchema:payload.text?.format?.type==='json_schema',
  hasResponseJsonSchema:payload.text?.format?.type==='json_schema',
  hasJsonInstructionInInput:inputTextBlocks(payload).some(text=>/\bjson\b/i.test(text)),
  inputMessageCount:Array.isArray(payload.input)?payload.input.length:typeof payload.input==='string'?1:0,
  inputTextBlockCount:inputTextBlocks(payload).length,
  bytes:Buffer.byteLength(serialized),sha256:createHash('sha256').update(serialized).digest('hex')};
}
export function providerErrorDiagnostic(body,key=''){
 const redact=value=>{
  let text=typeof value==='string'?value:'';
  if(key)text=text.replaceAll(key,'[redacted]').replaceAll(encodeURIComponent(key),'[redacted]');
  return text.replace(/AIza[\w-]{20,}|sk-[\w-]{8,}/g,'[redacted]').slice(0,1000);
 };
 const error=body?.error||{};
 const status=['invalid_request_error','authentication_error','permission_error','not_found_error','rate_limit_error','insufficient_quota','server_error','api_error'].includes(error.type)?error.type:null;
 // Do not retain arbitrary detail objects, echoed prompts or key values.
 const knownFields=['model','input','instructions','reasoning','reasoning.effort','text','text.format','text.format.type','text.verbosity','max_output_tokens','store','prompt_cache_options'];
 const fields=[redact(error.param)].filter(x=>knownFields.includes(x));
 // Error messages can echo arbitrary submitted text, not just credentials. Keep
 // structural diagnostics only; never persist provider-authored error prose.
 const code=['invalid_value','unsupported_value','unsupported_parameter','missing_required_parameter','invalid_json','context_length_exceeded','rate_limit_exceeded','insufficient_quota','invalid_api_key','model_not_found'].includes(error.code)?error.code:null;
 return {message:'The provider rejected the request.',providerStatus:status,invalidFields:[...new Set(fields)].slice(0,10),...(code?{providerCode:code}:{})};
}
