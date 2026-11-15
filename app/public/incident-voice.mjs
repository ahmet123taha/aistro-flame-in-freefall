export const INCIDENT_COPY = {
  en: {
    title:'Incident support', boundary:'AI incident support · not emergency dispatch',
    notice:'Move away from fire or smoke if you can do so safely. Alert your crew or local emergency service now. Follow your site or vehicle emergency procedure; do not wait for AI.',
    privacy:'Microphone audio goes to OpenAI only while voice is active. Microphone permission is required. This conversation is not saved on this device. Voice: up to 2 minutes, disconnects after 30 seconds idle. Transcription has a separate cost. These limits do not cap your account spending.',
    question:'Describe what is happening', send:'Send', mute:'Mute microphone', unmute:'Unmute microphone', end:'End and return', restart:'Start voice', textOnly:'Continue by text', you:'You', ai:'OpenAI',
    connecting:'Connecting voice…', permission:'Waiting for microphone permission…', listening:'Voice active · listening', speaking:'OpenAI is speaking', muted:'Microphone muted', fallback:'Voice unavailable · continue by text', closed:'Session ended', sending:'Sending…',
    denied:'Microphone access was denied. You can type below, or allow access and start voice again.', unsupported:'Voice is not supported here. Use a supported browser over HTTPS or localhost; text remains available.',
    failed:'Voice could not connect or was interrupted. The microphone is off. Continue by text, or start voice again.', textFailed:'The message could not be delivered. Try again when connected. Do not wait for AI in an emergency.',
    playback:'Audio playback needs your permission. Select Enable audio; voice remains connected.', resume:'Enable audio', partial:'Partial response', recoverable:'The last voice response was interrupted. You can continue speaking or type.',
    budget:'Voice stopped at the session or idle limit. The microphone is off. Start voice again explicitly or continue by text.',
    empty:'You can type instead of speaking. Unknown conditions can stay unknown.', hint:'Enter to send · Ctrl+Enter for a new line',
  },
  tr: {
    title:'Acil durum desteği', boundary:'Yapay zekâ desteği · acil çağrı merkezi değildir',
    notice:'Güvenle yapabiliyorsanız yangın ve dumandan uzaklaşın. Ekibinizi veya yerel acil yardım birimini hemen haberdar edin. Bulunduğunuz yerin ya da aracın acil durum prosedürünü izleyin; yapay zekâyı beklemeyin.',
    privacy:'Mikrofon sesi yalnız sesli görüşme açıkken OpenAI’ye gider. Mikrofon izni gerekir. Bu görüşme cihazınıza kaydedilmez.',
    question:'Neler olduğunu anlatın', send:'Gönder', mute:'Mikrofonu kapat', unmute:'Mikrofonu aç', end:'Bitir ve geri dön', restart:'Sesli görüşmeyi başlat', textOnly:'Yazarak devam et', you:'Siz', ai:'OpenAI',
    connecting:'Sesli bağlantı kuruluyor…', permission:'Mikrofon izni bekleniyor…', listening:'Sesli görüşme açık · dinleniyor', speaking:'OpenAI konuşuyor', muted:'Mikrofon kapalı', fallback:'Sesli bağlantı yok · yazarak devam edin', closed:'Görüşme bitti', sending:'Gönderiliyor…',
    denied:'Mikrofon izni verilmedi. Aşağıya yazabilir veya izin verip sesli görüşmeyi yeniden başlatabilirsiniz.', unsupported:'Burada sesli görüşme desteklenmiyor. HTTPS veya localhost üzerinde desteklenen bir tarayıcı kullanın; yazarak devam edebilirsiniz.',
    failed:'Sesli bağlantı kurulamadı veya kesildi. Mikrofon kapalı. Yazarak devam edin veya sesli görüşmeyi yeniden başlatın.', textFailed:'Mesaj iletilemedi. Bağlantı sağlandığında yeniden deneyin. Acil durumda yapay zekâyı beklemeyin.',
    playback:'Ses çalmak için izniniz gerekiyor. Sesi etkinleştir düğmesine basın; bağlantı açık.', resume:'Sesi etkinleştir', partial:'Kısmi yanıt', recoverable:'Son sesli yanıt kesildi. Konuşmaya veya yazmaya devam edebilirsiniz.',
    budget:'Sesli görüşme süre veya 30 saniyelik hareketsizlik sınırında durdu. Mikrofon kapalı. Yeniden başlatabilir veya yazarak devam edebilirsiniz.',
    empty:'Konuşmak yerine yazabilirsiniz. Bilmediğiniz koşulları belirtmeniz gerekmez.', hint:'Enter: gönder · Ctrl+Enter: yeni satır',
  },
};

export function incidentLanguage(value) { return String(value || '').toLowerCase().startsWith('tr') ? 'tr' : 'en'; }

export function validateIncidentSession(session) {
  if (session?.transport !== 'webrtc' || session.model !== 'gpt-realtime-2.1-mini' || typeof session.sdp !== 'string' || session.sdp.length > 65536 || !session.sdp.startsWith('v=0') || !session.sdp.includes('m=audio')) throw new Error('Invalid incident SDP answer');
  return session.sdp;
}

// Native WebRTC owns audio encoding/playback; no PCM/socket credentials reach the UI.
export function createBrowserIncidentPeer({onReady=()=>{},onEvent=()=>{},onError=()=>{},onWarning=()=>{},setTimer=setTimeout,clearTimer=clearTimeout, navigator:nav=globalThis.navigator, Peer=globalThis.RTCPeerConnection, Audio:AudioClass=globalThis.Audio}={}) {
  let peer,channel,stream,output,disconnectTimer,closed=false;
  const play=async()=>{try{await output.play();if(!closed)onWarning(null);return true;}catch{if(!closed)onWarning('AUDIO_PLAYBACK_BLOCKED');return false;}};
  const close=()=>{
    if(closed)return; closed=true;clearTimer(disconnectTimer);
    stream?.getTracks().forEach(track=>{track.onended=null;track.stop();});
    if(channel){channel.onopen=channel.onmessage=channel.onerror=channel.onclose=null;try{channel.close();}catch{}}
    if(peer){peer.ontrack=peer.onconnectionstatechange=null;try{peer.close();}catch{}}
    if(output){output.pause();output.srcObject=null;}
  };
  return {
    async prepare(){
      if(!nav?.mediaDevices?.getUserMedia||!Peer||!AudioClass)throw new Error('VOICE_UNSUPPORTED');
      peer=new Peer(); output=new AudioClass(); output.autoplay=true;
      peer.ontrack=event=>{if(closed)return;output.srcObject=event.streams[0];void play();};
      peer.onconnectionstatechange=()=>{if(closed)return;clearTimer(disconnectTimer);if(['failed','closed'].includes(peer.connectionState))onError('RTC_FAILED');else if(peer.connectionState==='disconnected')disconnectTimer=setTimer(()=>{if(!closed&&peer.connectionState==='disconnected')onError('RTC_DISCONNECTED');},8000);};
      stream=await nav.mediaDevices.getUserMedia({audio:true});
      if(closed){stream.getTracks().forEach(track=>track.stop());return null;}
      stream.getAudioTracks().forEach(track=>{track.onended=()=>{if(!closed)onError('MICROPHONE_ENDED');};peer.addTrack(track,stream);});
      channel=peer.createDataChannel('oai-events');
      channel.onopen=()=>{if(!closed)onReady();};
      channel.onmessage=event=>{if(closed)return;try{if(typeof event.data!=='string'||event.data.length>65536)throw Error();onEvent(JSON.parse(event.data));}catch{onWarning('EVENT_FORMAT');}};
      channel.onerror=channel.onclose=()=>{if(!closed)onError('DATA_CHANNEL_CLOSED');};
      const offer=await peer.createOffer(); if(closed)return null;
      await peer.setLocalDescription(offer);if(closed)return null;
      return peer.localDescription.sdp;
    },
    async connect(sdp){if(!closed)await peer.setRemoteDescription({type:'answer',sdp});},
    send(event){if(closed||channel?.readyState!=='open'||channel.bufferedAmount>128000)throw Error('Voice disconnected');channel.send(JSON.stringify(event));},
    resumeAudio:play,
    mute(value){stream?.getAudioTracks().forEach(track=>{track.enabled=!value;});},close
  };
}

export function mergeTranscript(previous, chunk) {
  if (typeof chunk !== 'string') return previous;
  const next = chunk.startsWith(previous) ? chunk : previous.endsWith(chunk) ? previous : previous + chunk;
  return next.slice(0, 12000);
}

// Preserve complete final incident turns; never clip a sentence to fill the budget.
export function boundedIncidentHistory(history, budget = 6000) {
  const selected = []; let remaining = Math.max(0, budget);
  for (const item of history.filter(item => item.final && item.text?.trim() && ['user','assistant'].includes(item.role)).slice(-8).reverse()) {
    if (item.text.length > remaining) break;
    selected.unshift({role:item.role,text:item.text}); remaining -= item.text.length;
  }
  return selected;
}

// Incident state and history are local to this controller; no research context.
export function createIncidentController({post,language='en',peerFactory=callbacks=>createBrowserIncidentPeer(callbacks),onState=()=>{},onMessage=()=>{},onNotice=()=>{},onDiagnostic=()=>{},setTimer=setTimeout,clearTimer=clearTimeout}) {
  let active=false,generation=0,peer,ready=false,muted=false,speaking=false,busy=false,state='closed',timer,textTimer,sessionTimer,idleTimer,sequence=0,pendingRequest,negotiated=false,ending=Promise.resolve();
  let lang,copy,responsePending=false,userSpeaking=false,playbackBlocked=false,responseId;const history=[],transcripts=new Map(),responseTurns=new Map(),committed=new Set();
  // Only fixed diagnostic labels leave this controller. Never copy provider messages or IDs.
  const diagnostic=code=>onDiagnostic({code});
  function update(next=state){state=next;onState({state,active,ready,muted,speaking,busy,playbackBlocked});}
  function message(role,text,id=++sequence,final=true){const old=history.find(item=>item.id===id);if(old)Object.assign(old,{text,final});else history.push({role,text,id,final});if(history.length>50)history.shift();onMessage({role,text,id,final});}
  function dispose(){for(const ids of responseTurns.values())for(const id of ids){const turn=history.find(item=>item.id===id);if(turn)message(turn.role,turn.text,turn.id,false);}if(negotiated){negotiated=false;ending=post('/api/incident/end',{}, {keepalive:true}).catch(()=>{});}pendingRequest?.abort();pendingRequest=undefined;clearTimer(timer);clearTimer(textTimer);clearTimer(sessionTimer);clearTimer(idleTimer);timer=textTimer=sessionTimer=idleTimer=undefined;ready=speaking=muted=false;const old=peer;peer=undefined;old?.close();transcripts.clear();responseTurns.clear();committed.clear();responsePending=userSpeaking=playbackBlocked=false;responseId=undefined;}
  function fallback(reason='failed',code='VOICE_INTERRUPTED'){if(!active)return;generation++;dispose();busy=false;diagnostic(code);onNotice((copy[reason]||copy.failed)+' ['+code+']');update('fallback');}
  function resetIdle(){clearTimer(idleTimer);if(active&&ready)idleTimer=setTimer(()=>fallback('budget','IDLE_LIMIT'),30000);}
  function sendEvent(event){peer.send(event);}
  function requestResponse(){if(!responsePending||busy||userSpeaking||!ready)return;responsePending=false;busy=true;try{sendEvent({type:'response.create'});clearTimer(textTimer);const version=generation;textTimer=setTimer(()=>{if(active&&version===generation)fallback('failed','RESPONSE_TIMEOUT');},45000);}catch{fallback('failed','DATA_CHANNEL_SEND');}}
  function item(role,text){return {type:'conversation.item.create',item:{type:'message',role,content:[{type:role==='assistant'?'output_text':'input_text',text}]}};}
  function transcript(event,role,final){const key=role+':'+(event.item_id||event.response_id||'current');let turn=transcripts.get(key);if(!turn){turn={id:++sequence,text:''};transcripts.set(key,turn);}turn.text=final&&typeof event.transcript==='string'?event.transcript:mergeTranscript(turn.text,event.delta||'');message(role,turn.text,turn.id,final);if(role==='assistant'){const id=event.response_id||responseId||'current';if(!responseTurns.has(id))responseTurns.set(id,new Set());responseTurns.get(id).add(turn.id);}if(final)transcripts.delete(key);}
  async function startVoice(){
    if(!active||busy||ready||['permission','connecting'].includes(state))return;
    const version=++generation;dispose();update('permission');const current=()=>active&&version===generation;
    try{
      const local=peerFactory({onReady(){if(!current()||ready)return;try{clearTimer(timer);ready=true;sessionTimer=setTimer(()=>{if(current())fallback('budget','SESSION_LIMIT');},120000);resetIdle();update('listening');const previous=boundedIncidentHistory(history);for(const turn of previous)sendEvent(item(turn.role,turn.text));sendEvent(item('user',lang==='tr'?(previous.length?'Bu acil durum görüşmesine Türkçe devam et. Daha önce verilen bilgileri tekrar sorma.':'Türkçe acil durum desteğini başlat. Kısaca güvende olup olmadığımı ve ne olduğunu sor.'):(previous.length?'Continue this incident conversation from where we left off. Do not ask again for information already provided.':'Start incident support. Briefly ask whether I am safe and what is happening.')));responsePending=true;requestResponse();update();}catch{fallback();}},onEvent(event){
        if(!current()||!event||typeof event.type!=='string')return;
        if(['input_audio_buffer.speech_started','input_audio_buffer.speech_stopped','conversation.item.input_audio_transcription.completed','response.output_audio_transcript.delta','output_audio_buffer.started','output_audio_buffer.stopped'].includes(event.type))resetIdle();
        if(event.type==='session.expired'){fallback('failed','SESSION_EXPIRED');return;}
        if(event.type==='error'){
          const code=event.error?.code;
          if(['session_expired','session_timeout','invalid_api_key','authentication_error','insufficient_quota','rate_limit_exceeded'].includes(code)){fallback('failed','PROVIDER_UNAVAILABLE');return;}
          diagnostic('REALTIME_EVENT_ERROR');
          // Rejected individual events do not mean the Realtime session closed.
          // Never replay the event or silently create a replacement response.
          if(!responseId&&code!=='conversation_already_has_active_response'&&code!=='response_cancel_not_active'){busy=false;responsePending=false;clearTimer(textTimer);onNotice(copy.recoverable);}
          update();return;
        }
        if(event.type==='input_audio_buffer.speech_started')userSpeaking=true;
        if(event.type==='input_audio_buffer.speech_stopped'){userSpeaking=false;requestResponse();}
        if(event.type==='input_audio_buffer.committed'&&typeof event.item_id==='string'&&!committed.has(event.item_id)){
          if(committed.size>=100)committed.delete(committed.values().next().value);
          committed.add(event.item_id);responsePending=true;requestResponse();
        }
        if(event.type==='conversation.item.input_audio_transcription.failed'){diagnostic('TRANSCRIPTION_FAILED');onNotice(copy.recoverable);}

        if(event.type==='conversation.item.input_audio_transcription.completed')transcript(event,'user',true);
        if(event.type==='response.output_audio_transcript.delta')transcript(event,'assistant',false);
        if(event.type==='response.output_audio_transcript.done')transcript(event,'assistant',true);
        if(event.type==='response.created'){busy=true;responseId=event.response?.id;}
        if(event.type==='output_audio_buffer.started')speaking=true;
        if(['output_audio_buffer.stopped','output_audio_buffer.cleared'].includes(event.type))speaking=false;
        if(event.type==='response.done'){
          const status=event.response?.status,id=event.response?.id||responseId||'current';
          if(['session_expired','session_timeout','invalid_api_key','authentication_error','insufficient_quota','rate_limit_exceeded'].includes(event.response?.status_details?.error?.code)){fallback('failed','PROVIDER_UNAVAILABLE');return;}
          if(status!=='completed'){
            for(const turnId of responseTurns.get(id)||[]){const turn=history.find(item=>item.id===turnId);if(turn)message(turn.role,turn.text,turn.id,false);}
            diagnostic(status==='cancelled'?'RESPONSE_CANCELLED':event.response?.status_details?.reason==='max_output_tokens'?'RESPONSE_TOKEN_LIMIT':status==='failed'?'RESPONSE_FAILED':'RESPONSE_INCOMPLETE');
            if(status!=='cancelled')onNotice(copy.recoverable);
          }
          responseTurns.delete(id);busy=false;responseId=undefined;clearTimer(textTimer);requestResponse();
        }
        update();
      },onWarning(code){if(!current())return;if(code==='AUDIO_PLAYBACK_BLOCKED'||code===null)playbackBlocked=code==='AUDIO_PLAYBACK_BLOCKED';if(code)diagnostic(code);if(code==='AUDIO_PLAYBACK_BLOCKED'||code===null)onNotice(playbackBlocked?copy.playback:'');update();},onError(code){if(current())fallback('failed',['RTC_FAILED','RTC_DISCONNECTED','MICROPHONE_ENDED','DATA_CHANNEL_CLOSED'].includes(code)?code:'VOICE_INTERRUPTED');}});peer=local;
      const sdp=await local.prepare();if(!current()||!sdp){local.close();return;}
      await ending;if(!current())return;
      update('connecting');timer=setTimer(()=>{if(current())fallback();},20000);
      const request=new AbortController();pendingRequest=request;
      const session=await post('/api/incident/session',{sdp,language:lang},{signal:request.signal});
      if(pendingRequest===request)pendingRequest=undefined;if(!current()){ending=post('/api/incident/end',{}, {keepalive:true}).catch(()=>{});return;}negotiated=true;
      await local.connect(validateIncidentSession(session));
    }catch(error){if(current())fallback(error?.name==='NotAllowedError'||error?.name==='PermissionDeniedError'?'denied':error?.message==='VOICE_UNSUPPORTED'?'unsupported':'failed');}
  }
  return {
    open(){if(active)return;lang=incidentLanguage(typeof language==='function'?language():language);copy=INCIDENT_COPY[lang];active=true;history.length=0;sequence=0;busy=false;state='idle';onNotice('');void startVoice();},
    close(){if(!active)return;active=false;generation++;dispose();history.length=0;busy=false;update('closed');},startVoice,
    useText(){if(!active)return;generation++;dispose();busy=false;onNotice('');update('fallback');},
    async resumeAudio(){if(ready&&playbackBlocked)await peer.resumeAudio?.();},
    mute(){if(!ready)return;muted=!muted;peer.mute(muted);update();},
    async send(text){const value=String(text||'').trim().slice(0,2000);if(!active||busy||userSpeaking||!value||['permission','connecting'].includes(state))return false;
      const previous=boundedIncidentHistory(history,6000-value.length);message('user',value);busy=true;update();const version=generation;
      try{if(ready){resetIdle();sendEvent(item('user',value));busy=false;responsePending=true;requestResponse();}
      else{const request=new AbortController();pendingRequest=request;const answer=await post('/api/incident/message',{message:value,history:previous,language:lang},{signal:request.signal});if(pendingRequest===request)pendingRequest=undefined;if(!active||version!==generation)return true;if(typeof answer?.text!=='string'||!answer.text.trim())throw Error();message('assistant',answer.text);busy=false;update();}}
      catch{if(active&&version===generation){if(ready)fallback();else{busy=false;onNotice(copy.textFailed);update('fallback');}}}return true;
    },get snapshot(){return {active,ready,muted,busy,state};}
  };
}

export function installIncidentVoice({post, language, onOpen = () => {}, onClose = () => {}}) {
  const getLanguage = () => incidentLanguage((typeof language === 'function' ? language() : language) || navigator.language);
  let lang = getLanguage(), copy = INCIDENT_COPY[lang];
  const dialog = document.createElement('dialog'); dialog.id = 'incident-dialog'; dialog.className = 'incident-dialog'; dialog.setAttribute('aria-labelledby','incident-title'); dialog.setAttribute('aria-describedby','incident-protective');
  const make = (tag, className, value) => { const node = document.createElement(tag); if (className) node.className = className; if (value) node.textContent = value; return node; };
  const heading = make('div','incident-heading'), title = make('h2','',copy.title); title.id = 'incident-title';
  const titleGroup = make('div'), boundary = make('p','incident-boundary',copy.boundary); titleGroup.append(title,boundary);
  const end = make('button','incident-end',copy.end); end.type = 'button'; heading.append(titleGroup,end);
  const notice = make('p','incident-protective',copy.notice), status = make('p','incident-status',copy.connecting); notice.id = 'incident-protective'; status.setAttribute('role','status'); status.setAttribute('aria-live','polite');
  const diagnostics = make('small','incident-privacy');diagnostics.setAttribute('role','status');
  const privacy = make('p','incident-privacy',copy.privacy), controls = make('div','incident-controls');
  const resume = make('button','',copy.resume);resume.type='button';resume.hidden=true;
  const mute = make('button','',copy.mute), restart = make('button','',copy.restart), textOnly = make('button','',copy.textOnly); mute.type = restart.type = textOnly.type = 'button'; controls.append(mute,restart,textOnly,resume);
  const error = make('p','incident-error'); error.setAttribute('role','alert'); error.hidden = true;
  const log = make('div','incident-log'); log.setAttribute('role','log'); log.setAttribute('aria-label',copy.title); log.setAttribute('aria-live','polite'); log.tabIndex = 0;
  const empty = make('p','incident-empty',copy.empty); log.append(empty);
  const form = make('form','incident-composer'), label = make('label','',copy.question), input = make('textarea'); input.id = 'incident-text'; input.rows = 2; input.maxLength = 2000; label.htmlFor = input.id;
  const send = make('button','primary',copy.send); send.type = 'submit'; const row = make('div','incident-compose-row'), hint = make('small','incident-privacy',copy.hint); row.append(input,send); form.append(label,row,hint);
  dialog.append(heading,notice,status,controls,privacy,error,diagnostics,log,form); document.body.append(dialog);
  let opener, isOpen = false; const nodes = new Map();
  const controller = createIncidentController({post,language:getLanguage,onState(snapshot) {
    const pending = ['permission','connecting'].includes(snapshot.state);
    status.textContent = snapshot.busy && !snapshot.ready ? copy.sending : copy[snapshot.speaking ? 'speaking' : snapshot.ready && snapshot.muted ? 'muted' : snapshot.state] || copy.connecting;
    status.dataset.state = snapshot.state; mute.disabled = !snapshot.ready; mute.textContent = snapshot.muted ? copy.unmute : copy.mute; mute.setAttribute('aria-pressed',String(snapshot.muted));
    restart.hidden = snapshot.ready || pending; restart.disabled = snapshot.busy; send.disabled = snapshot.busy || pending; input.disabled = pending;
    textOnly.hidden = snapshot.state === 'fallback';resume.hidden=!snapshot.playbackBlocked;
  },onDiagnostic({code}){diagnostics.textContent=code;},onNotice(text) { error.textContent = text; error.hidden = !text; },onMessage(item) {
    empty.hidden = true; const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 90;
    let entry = nodes.get(item.id);
    if (!entry) { const article = make('article',`incident-message incident-${item.role}`), speaker = make('strong','',item.role === 'user' ? copy.you : copy.ai), body = make('p'); article.append(speaker,body); log.append(article); entry = {article,body}; nodes.set(item.id,entry); }
    entry.body.textContent = item.text;entry.article.dataset.final=String(item.final);entry.article.dataset.partial=copy.partial;entry.article.setAttribute('aria-label',item.final?'':copy.partial);
    if (nodes.size > 50) { const oldest = nodes.keys().next().value; nodes.get(oldest).article.remove(); nodes.delete(oldest); }
    if (nearBottom) log.scrollTop = log.scrollHeight;
  }});
  function close() {
    if (!isOpen) return; isOpen = false; controller.close(); dialog.close(); input.value = ''; log.replaceChildren(empty); nodes.clear(); empty.hidden = false;
    onClose(); if (opener?.isConnected) opener.focus({preventScroll:true});
  }
  function open() {
    if (isOpen) return;
    lang = getLanguage(); copy = INCIDENT_COPY[lang]; dialog.lang = lang;
    title.textContent = copy.title; boundary.textContent = copy.boundary; end.textContent = copy.end; notice.textContent = copy.notice; privacy.textContent = copy.privacy;
    resume.textContent=copy.resume;restart.textContent = copy.restart; textOnly.textContent = copy.textOnly; empty.textContent = copy.empty; label.textContent = copy.question; send.textContent = copy.send; hint.textContent = copy.hint; log.setAttribute('aria-label',copy.title);
    diagnostics.textContent='';opener = document.activeElement; isOpen = true; dialog.showModal(); end.focus({preventScroll:true}); onOpen(); controller.open();
  }
  end.addEventListener('click',close); dialog.addEventListener('cancel',event => { event.preventDefault(); close(); });
  dialog.addEventListener('close',() => { if (isOpen) close(); }); window.addEventListener('pagehide',close);
  resume.addEventListener('click',()=>void controller.resumeAudio());
  mute.addEventListener('click',() => controller.mute()); restart.addEventListener('click',() => void controller.startVoice());
  textOnly.addEventListener('click',() => { controller.useText(); input.focus(); });
  form.addEventListener('submit',event => {
    event.preventDefault(); if (!input.value.trim() || send.disabled) return;
    const text = input.value; input.value = ''; input.focus(); void controller.send(text);
  });
  input.addEventListener('keydown',event => {
    if (event.key !== 'Enter' || event.isComposing) return;
    event.preventDefault();
    if (event.ctrlKey) {
      if (input.value.length < input.maxLength || input.selectionEnd > input.selectionStart) input.setRangeText('\n',input.selectionStart,input.selectionEnd,'end');
    } else form.requestSubmit();
  });
  return {open,close};
}
