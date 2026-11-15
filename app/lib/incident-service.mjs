import {extractResponseText, OPENAI_ENDPOINT} from './openai-response.mjs';
const MODEL = 'gpt-6.1-sol';
import {incidentPrompt} from './incident-prompt.mjs';

export const INCIDENT_VOICE_MODEL = 'gpt-realtime-2.1-mini';
export const INCIDENT_CALLS_URL = 'https://api.openai.com/v1/realtime/calls';
const MAX_RESPONSE_BYTES = 65536;
const MAX_HISTORY_TURNS = 8;
const MAX_CONTEXT_CHARS = 6000;

class IncidentError extends Error {
  constructor(message, status, code) { super(message); this.status = status; this.code = code; }
}
const invalid = message => new IncidentError(message, 400, 'INCIDENT_INPUT');

function languageCode(value = '') {
  if (typeof value !== 'string' || value.length > 35 || (value && !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value))) {
    throw invalid('Language must be an optional language code, for example en or tr-TR.');
  }
  return value;
}

function conversation({message, history = []}) {
  if (typeof message !== 'string' || !message.trim() || message.length > 2000) throw invalid('Enter a short incident message, up to 2000 characters.');
  if (!Array.isArray(history) || history.length > MAX_HISTORY_TURNS) throw invalid('Incident history may contain up to 8 turns.');
  let size = message.length;
  const contents = history.map(turn => {
    if (!turn || !['user', 'assistant'].includes(turn.role) || typeof turn.text !== 'string' || !turn.text.trim() || turn.text.length > MAX_CONTEXT_CHARS) {
      throw invalid('Each history turn must contain a user or assistant role and text within the 6000-character conversation limit.');
    }
    size += turn.text.length;
    return {role: turn.role, content: turn.text.trim()};
  });
  if (size > MAX_CONTEXT_CHARS) throw invalid('The incident message and history exceed 6000 characters.');
  contents.push({role: 'user', content: message.trim()});
  return contents;
}

function providerFailure(status) {
  if (status === 401 || status === 403) return new IncidentError('OpenAI access was denied. Check the configured key and model access. No automatic retry was made.', 502, 'INCIDENT_PROVIDER_AUTH');
  if (status === 429) return new IncidentError('OpenAI is at its usage or rate limit. No automatic retry was made.', 429, 'INCIDENT_PROVIDER_LIMIT');
  if (status === 400 || status === 404) return new IncidentError('OpenAI did not accept this incident request or model. No automatic retry or model change was made.', 502, 'INCIDENT_PROVIDER_REQUEST');
  return new IncidentError('OpenAI incident support is unavailable. No automatic retry was made.', 502, 'INCIDENT_PROVIDER_UNAVAILABLE');
}

async function readProviderBody(response, json = true) {
  // Do not retain or log provider error bodies: they may echo credentials or
  // private incident text. The successful body is bounded before JSON parsing.
  if (!response.ok) {
    try { await response.body?.cancel(); } catch { /* Never expose raw errors. */ }
    throw providerFailure(response.status);
  }
  if (Number(response.headers?.get('content-length')) > MAX_RESPONSE_BYTES) {
    try { await response.body?.cancel(); } catch { /* Never expose raw errors. */ }
    throw new IncidentError('OpenAI returned an oversized incident response.', 502, 'INCIDENT_PROVIDER_FORMAT');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new IncidentError('OpenAI returned an empty incident response.', 502, 'INCIDENT_PROVIDER_FORMAT');
  let bytes = 0;
  const parts = [];
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new IncidentError('OpenAI returned an oversized incident response.', 502, 'INCIDENT_PROVIDER_FORMAT');
      }
      parts.push(Buffer.from(value));
    }
    const text = Buffer.concat(parts).toString('utf8');
    return json ? JSON.parse(text) : text;
  } catch (error) {
    if (error instanceof IncidentError) throw error;
    throw new IncidentError('OpenAI returned an unreadable incident response.', 502, 'INCIDENT_PROVIDER_FORMAT');
  } finally { reader.releaseLock(); }
}

/** Ephemeral incident transport; never saves audio, text, tokens or credentials. */
export function createIncidentService({key = '', fetchImpl = fetch, now = Date.now, timeoutMs = 15000, textModel = MODEL, setTimer = setTimeout, clearTimer = clearTimeout} = {}) {
  if (!/^[a-zA-Z0-9._-]{1,120}$/.test(textModel)) throw new Error('Invalid incident text model configuration.');
  if (!Number.isFinite(timeoutMs) || timeoutMs < 1 || timeoutMs > 60000) throw new Error('Invalid incident timeout configuration.');
  let currentKey = typeof key === 'string' ? key : '';
  let busy = false, activeCall;
  async function stopVoiceSession(call = activeCall) {
    if (!call) return {ended:true, confirmed:true};
    if (call.closing) return call.closing;
    clearTimer(call.timer);
    call.closing = (async () => {
      const controller = new AbortController(); let timer;
      try {
        const response = await Promise.race([
          fetchImpl(`${INCIDENT_CALLS_URL}/${call.id}/hangup`, {method:'POST',redirect:'error',headers:{Authorization:`Bearer ${call.key}`},signal:controller.signal}),
          new Promise((_,reject)=>{timer=setTimer(()=>{controller.abort();reject(Error('Hangup timeout'));},5000);timer.unref?.();})
        ]);
        try { await response.body?.cancel(); } catch {}
        const confirmed = response.ok || response.status === 404;
        if (confirmed && activeCall === call) activeCall = undefined;
        return {ended:confirmed,confirmed};
      } catch { return {ended:false,confirmed:false}; }
      finally {clearTimer(timer);call.closing=undefined;}
    })();
    return call.closing;
  }
  function trackCall(response, key, signal) {
    if (!response.ok) return;
    const location = response.headers?.get('location');
    if (!location) return; // Client limits remain, without a confirmed server handle.
    let url; try { url=new URL(location,'https://api.openai.com'); } catch { return; }
    const match = /^\/v1\/realtime\/calls\/([A-Za-z0-9_-]{1,200})$/.exec(url.pathname);
    if (url.origin!=='https://api.openai.com'||!match||url.search||url.hash) return;
    const call={id:match[1],key};
    if(signal.aborted || activeCall){void stopVoiceSession(call);return call;}
    activeCall=call;
    call.timer=setTimer(()=>{void stopVoiceSession(call);},120000);call.timer.unref?.();
    return call;
  }

  async function request(url, payload, signal, multipart = false) {
    if (!currentKey) throw new IncidentError('OpenAI incident support is not configured. Contact real emergency assistance when needed.', 503, 'INCIDENT_NO_KEY');
    if (busy) throw new IncidentError('An incident request is already in progress.', 409, 'INCIDENT_BUSY');
    if (signal?.aborted) throw new IncidentError('The incident request was cancelled.', 499, 'INCIDENT_CANCELLED');
    busy = true;
    const requestKey = currentKey; let requestCall;
    const controller = new AbortController();
    let timer, rejectAbort;
    const interrupted = new Promise((_, reject) => { rejectAbort = reject; });
    const cancel = () => {
      controller.abort();
      rejectAbort(new IncidentError('The incident request was cancelled.', 499, 'INCIDENT_CANCELLED'));
    };
    signal?.addEventListener('abort', cancel, {once: true});
    timer = setTimer(() => {
      controller.abort();
      rejectAbort(new IncidentError('OpenAI incident support timed out. No automatic retry was made.', 504, 'INCIDENT_TIMEOUT'));
    }, timeoutMs);
    try {
      return await Promise.race([
        (async () => {
          const response = await fetchImpl(url, {
            method: 'POST', redirect: 'error', signal: controller.signal,
            headers: {Authorization: `Bearer ${requestKey}`, ...(!multipart ? {'Content-Type': 'application/json'} : {})},
            body: multipart ? payload : JSON.stringify(payload)
          });
          if(multipart)requestCall=trackCall(response,requestKey,controller.signal);
          return await readProviderBody(response, !multipart);
        })(), interrupted
      ]);
    } catch (error) {
      // Stop any remaining provider transport before releasing the busy guard,
      // including when a response is rejected before its body is consumed.
      controller.abort();
      if(multipart && requestCall)void stopVoiceSession(requestCall);
      if (error instanceof IncidentError) throw error;
      throw new IncidentError('OpenAI incident support could not be reached. No automatic retry was made.', 502, 'INCIDENT_NETWORK');
    } finally {
      clearTimer(timer);
      signal?.removeEventListener('abort', cancel);
      busy = false;
    }
  }

  return {
    status: () => ({configured: Boolean(currentKey), model: INCIDENT_VOICE_MODEL, textModel, busy}),
    stopVoiceSession,
    setKey(value) {
      if (busy) throw new IncidentError('Wait for the incident request to finish before changing the key.', 409, 'INCIDENT_BUSY');
      currentKey = typeof value === 'string' ? value : '';
    },
    async createVoiceSession({sdp, language = '', signal} = {}) {
      language = languageCode(language);
      if (typeof sdp !== 'string' || !sdp.startsWith('v=0') || sdp.length > 65536 || !sdp.includes('m=audio')) throw invalid('A bounded audio SDP offer is required.');
      if(activeCall && !(await stopVoiceSession()).confirmed)throw new IncidentError('The previous voice call has not confirmed termination. No new call was started.',409,'INCIDENT_VOICE_ACTIVE');
      const form = new FormData();
      form.set('sdp', sdp);
      // Initial configuration is negotiated by the server. WebRTC clients can
      // send session.update; this is not an immutable policy/security boundary.
      form.set('session', JSON.stringify({type:'realtime', model:INCIDENT_VOICE_MODEL,
        instructions:incidentPrompt(language), tools:[], output_modalities:['audio'], max_output_tokens:512,
        audio:{input:{transcription:{model:'gpt-4o-mini-transcribe',...(/^(tr|en)(-|$)/i.test(language)?{language:language.toLowerCase().split('-')[0]}:{})},turn_detection:{type:'server_vad',create_response:false,interrupt_response:true}},output:{voice:'marin'}}}));
      const answer = await request(INCIDENT_CALLS_URL, form, signal, true);
      if (typeof answer !== 'string' || !answer.startsWith('v=0') || !answer.includes('m=audio') || answer.includes(currentKey)) throw new IncidentError('OpenAI returned an invalid audio SDP answer.',502,'INCIDENT_SDP_FORMAT');
      return {sdp:answer,model:INCIDENT_VOICE_MODEL,provider:'OpenAI',transport:'webrtc',limits:{maxSessionSeconds:120,idleSeconds:30,serverWatchdog:Boolean(activeCall)}};
    },
    async respond({message, history = [], language = '', signal} = {}) {
      const contents = conversation({message, history});
      language = languageCode(language);
      const result = await request(OPENAI_ENDPOINT, {
        model:textModel, instructions:incidentPrompt(language), input:contents, tools:[],
        store:false, reasoning:{effort:'medium'}, text:{verbosity:'low'}, max_output_tokens:4096
      }, signal);
      let text;
      try { text = extractResponseText(result).trim(); }
      catch { throw new IncidentError('OpenAI did not return a complete incident answer. No automatic retry was made.',502,'INCIDENT_ANSWER_FORMAT'); }
      // Never truncate an emergency instruction: its final qualifier may be
      // essential. Reject incomplete/oversized content instead of clipping it.
      if (!text || text.length > 2400 || text.split(/\s+/u).length > 160 || (currentKey && text.includes(currentKey))) {
        throw new IncidentError('OpenAI did not return a complete, short incident answer. No automatic retry was made.', 502, 'INCIDENT_ANSWER_FORMAT');
      }
      const returnedModel = typeof result.model === 'string' && /^[a-zA-Z0-9._-]{1,120}$/.test(result.model) && !result.model.includes(currentKey) ? result.model : null;
      return {text, model: textModel, provider: {name: 'OpenAI API', requestedModel: textModel, returnedModel, httpStatus: 200, receivedAt: new Date(now()).toISOString(), delivery: 'live'}};
    }
  };
}
