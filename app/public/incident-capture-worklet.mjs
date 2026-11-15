import {PcmResampler, floatToPcm16} from './incident-audio.mjs';

class IncidentPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super(); this.resampler = new PcmResampler(sampleRate); this.pending = []; this.muted = false; this.stopped = false;
    this.port.onmessage = ({data}) => {
      if (data?.stop) this.stopped = true;
      if (typeof data?.muted === 'boolean') this.muted = data.muted;
      this.pending = []; this.resampler = new PcmResampler(sampleRate);
    };
  }
  process(inputs) {
    if (this.stopped) return false;
    const channels = inputs[0];
    if (!this.muted && channels?.length && channels[0].length) {
      const mono = new Float32Array(channels[0].length);
      for (const channel of channels) for (let i = 0; i < mono.length; i++) mono[i] += channel[i] / channels.length;
      for (const sample of this.resampler.push(mono)) this.pending.push(sample);
      while (this.pending.length >= 1600) {
        const bytes = floatToPcm16(this.pending.splice(0, 1600)); this.port.postMessage(bytes.buffer, [bytes.buffer]);
      }
    }
    // Output remains silent; microphone input is never routed back to speakers.
    return true;
  }
}
registerProcessor('incident-pcm-capture', IncidentPcmCapture);
