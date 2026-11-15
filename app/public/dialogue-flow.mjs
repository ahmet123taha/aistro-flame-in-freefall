// Shared deterministic routing for unambiguous conversation controls only.
// Unrecognized or mixed scientific messages remain research, never guessed safe.
export const ENVIRONMENT_QUESTION='Use my optional environment information and ask about the scenario if it is not yet known.';
const normalized=s=>String(s||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replaceAll('ı','i').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();
const languageNames={turkce:'tr',turkish:'tr',ingilizce:'en',english:'en',deutsch:'de',german:'de',almanca:'de',francais:'fr',french:'fr',fransizca:'fr',espanol:'es',spanish:'es',ispanyolca:'es'};
export const REPLY_LANGUAGES=Object.freeze(['','tr','en','de','fr','es']);
const turkishReply=/^(?:(?:cevap|yanit) (?:ver|verir misin(?:iz)?|verebilir misin(?:iz)?)|konus(?:ur musun(?:uz)?|abilir misin(?:iz)?)?|yaz(?:ar misin(?:iz)?|abilir misin(?:iz)?)?|anlat(?:ir misin(?:iz)?|abilir misin(?:iz)?)?|yanitla|soyle)$/;
export function classifyMessage(text){
 const raw=normalized(text),t=raw.replace(/^(please|lutfen) /,'').replace(/ (please|lutfen|ya)$/,'');
 for(const [name,replyLanguage] of Object.entries(languageNames)){
  const command=t.replace(/^bana /,'').replace(/^(?:can|could|would) you /,'');
  const suffix=command.startsWith(name+' ')?command.slice(name.length+1).replace(/^olarak /,''):'';
  if(turkishReply.test(suffix)||[name,`in ${name}`,`speak ${name}`,`reply in ${name}`,`answer in ${name}`,`respond in ${name}`,`translate to ${name}`,`translate into ${name}`].includes(command))return {intent:'presentation',replyLanguage};
 }
 if(/^(daha kisa|kisa yaz|kisa cevap ver|ozetle|kisalt|madde madde yaz|daha basit anlat|shorter|be brief|summarize|summarise|use bullet points|explain more simply)$/.test(t))return {intent:'presentation',replyLanguage:''};
 if(/^(hi|hello|hey|merhaba|selam|selamlar|gunaydin|iyi aksamlar|tesekkurler|tesekkur ederim|sag ol|sagol|thanks|thank you|tamam|ok|okay|anladim|got it)$/.test(t))return {intent:'conversation',replyLanguage:''};
 return {intent:'research',replyLanguage:''};
}
export function cleanScenario(scenario){
 return String(scenario||'').split('\n').map(x=>x.trim()).filter(x=>x&&x!==ENVIRONMENT_QUESTION&&x!=='Environment submitted'&&classifyMessage(x).intent==='research').join('\n');
}
export function planDialogueTurn({scenario='',question='',trigger,replyLanguage=''}){
 const previous=cleanScenario(scenario),environment=trigger==='environment'||question===ENVIRONMENT_QUESTION;
 const classification=environment?{intent:'environment',replyLanguage:''}:classifyMessage(question);
 const language=classification.replyLanguage||(REPLY_LANGUAGES.includes(replyLanguage)?replyLanguage:'');
 let next=previous;
 if(!environment&&classification.intent==='research'&&question.trim()&&!previous.split('\n').includes(question.trim()))next+=(next?'\n':'')+question.trim();
 if(next.length>8000)throw Object.assign(Error('Research context is full. Start a new chat; the existing transcript is retained.'),{code:'SCENARIO_LIMIT',status:400});
 const updateResearch=classification.intent==='research'||environment;
 return {scenario:next,replyLanguage:language,intent:classification.intent,updateResearch,canRank:updateResearch&&Boolean(next),requiredStage:!updateResearch?'conversation':next?null:'clarify'};
}
export function ensureTurnCapacity(messages){
 // Reserve one user message and one response/application notice before any API call.
 if(messages.length>498)throw Error('This conversation is full. Start a new chat; existing messages are retained.');
}
export function appliesToCurrentTurn(startRevision,currentRevision,startFocus,currentFocus){return startRevision===currentRevision&&startFocus===currentFocus;}
