// Incident audio is transient: no recorder, file, storage, or research-state dependency.
export class PcmResampler {
  constructor(inputRate, outputRate = 16000) {
    if (!Number.isFinite(inputRate) || inputRate < 8000 || inputRate > 192000 || outputRate !== 16000) throw new Error('Unsupported sample rate');
    this.step = inputRate / outputRate; this.tail = new Float32Array(0); this.position = 0;
  }
  push(input) {
    const samples = new Float32Array(this.tail.length + input.length);
    samples.set(this.tail); samples.set(input, this.tail.length);
    const result = [];
    while (this.position + 1 < samples.length) {
      const i = Math.floor(this.position), fraction = this.position - i;
      result.push(samples[i] * (1 - fraction) + samples[i + 1] * fraction); this.position += this.step;
    }
    const consumed = Math.min(Math.floor(this.position), Math.max(0, samples.length - 1));
    this.tail = samples.slice(consumed); this.position -= consumed;
    return Float32Array.from(result);
  }
}

export function floatToPcm16(samples) {
  const bytes = new Uint8Array(samples.length * 2), view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) {
    const value = Number.isFinite(samples[i]) ? Math.max(-1, Math.min(1, samples[i])) : 0;
    view.setInt16(i * 2, Math.round(value * (value < 0 ? 32768 : 32767)), true);
  }
  return bytes;
}

export function encodePcm(bytes) {
  if (!(bytes instanceof Uint8Array) || !bytes.length || bytes.length % 2 || bytes.length > 64000) throw new Error('Invalid PCM input');
  let binary = ''; for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodePcmAudio(data, mimeType) {
  if (typeof data !== 'string' || !data.length || data.length > 512000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data) || data.length % 4) throw new Error('Invalid audio payload');
  if (!/^audio\/pcm\s*;\s*rate=24000$/i.test(String(mimeType))) throw new Error('Unsupported output audio');
  const binary = atob(data);
  if (!binary.length || binary.length % 2) throw new Error('Invalid PCM length');
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0)), view = new DataView(bytes.buffer), samples = new Float32Array(bytes.length / 2);
  for (let i = 0; i < samples.length; i++) samples[i] = view.getInt16(i * 2, true) / 32768;
  return {samples, sampleRate: 24000};
}

export function createPcmPlayer(context, {maxSeconds = 60, onSpeaking = () => {}} = {}) {
  // 60 seconds of decoded mono float32 at 24 kHz is bounded to 5.76 MB.
  let until = 0, closed = false; const sources = new Set();
  function interrupt() {
    for (const source of sources) { source.onended = null; try { source.stop(); } catch {} try { source.disconnect(); } catch {} }
    sources.clear(); until = 0; onSpeaking(false);
  }
  return {
    play(data, mimeType) {
      if (closed) return;
      const {samples, sampleRate} = decodePcmAudio(data, mimeType), duration = samples.length / sampleRate;
      const start = Math.max(context.currentTime, until);
      if (start - context.currentTime + duration > maxSeconds) throw new Error('Audio queue limit');
      const buffer = context.createBuffer(1, samples.length, sampleRate); buffer.copyToChannel(samples, 0);
      const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination); sources.add(source);
      source.onended = () => { sources.delete(source); source.disconnect(); if (!sources.size) onSpeaking(false); };
      source.start(start); until = start + duration; onSpeaking(true);
    },
    interrupt,
    close() { closed = true; interrupt(); },
    get queuedSeconds() { return Math.max(0, until - context.currentTime); },
  };
}

export function createBrowserIncidentAudio({navigator: nav = globalThis.navigator, AudioContext: Context = globalThis.AudioContext || globalThis.webkitAudioContext, AudioWorkletNode: Worklet = globalThis.AudioWorkletNode, onSpeaking = () => {}, onError = () => {}} = {}) {
  let context, stream, node, source, silent, player, closed = false, muted = false;
  async function close() {
    closed = true;
    if (stream) for (const track of stream.getTracks()) { track.onended = null; track.stop(); }
    if (node) { node.port.onmessage = null; node.port.postMessage({stop:true}); node.port.close(); }
    for (const resource of [node, source, silent]) { try { resource?.disconnect(); } catch {} }
    player?.close();
    if (context && context.state !== 'closed') { try { await context.close(); } catch {} }
  }
  return {
    async start(onPcm) {
      if (!nav?.mediaDevices?.getUserMedia || !Context || !Worklet) throw new Error('VOICE_UNSUPPORTED');
      try {
        context = new Context();
        // Resume in the user gesture, before awaiting microphone permission.
        const resume = context.resume();
        resume.catch(() => {});
        const acquired = await nav.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
        if (closed) { for (const track of acquired.getTracks()) track.stop(); return false; }
        stream = acquired;
        for (const track of stream.getTracks()) track.onended = () => { if (!closed) onError('MICROPHONE_ENDED'); };
        await resume;
        if (!context.audioWorklet) throw new Error('VOICE_UNSUPPORTED');
        await context.audioWorklet.addModule(new URL('./incident-capture-worklet.mjs', import.meta.url));
        if (closed) return false;
        player = createPcmPlayer(context, {onSpeaking});
        source = context.createMediaStreamSource(stream); node = new Worklet(context, 'incident-pcm-capture', {numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
        silent = context.createGain(); silent.gain.value = 0;
        source.connect(node); node.connect(silent); silent.connect(context.destination);
        node.port.onmessage = event => { if (!closed && !muted && event.data instanceof ArrayBuffer) onPcm(new Uint8Array(event.data)); };
        return true;
      } catch (error) { await close(); throw error; }
    },
    mute(value) { muted = Boolean(value); for (const track of stream?.getAudioTracks() || []) track.enabled = !muted; node?.port.postMessage({muted}); },
    play(data, mimeType) { player?.play(data, mimeType); },
    interrupt() { player?.interrupt(); },
    close,
  };
}
