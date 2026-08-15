class MicCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.sampleRate = sampleRate;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];
    const pcm = new Int16Array(channel.length);
    let peak = 0;
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      peak = Math.max(peak, Math.abs(s));
      pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    this.port.postMessage({ pcm, peak, rate: this.sampleRate });
    return true;
  }
}

registerProcessor("mic-capture", MicCaptureProcessor);