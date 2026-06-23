class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private ambientOsc: OscillatorNode | null = null;
  private ambientOsc2: OscillatorNode | null = null;
  private ambientGain: GainNode | null = null;
  private started = false;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -18;
      this.compressor.knee.value = 12;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.18;
      this.compressor.connect(this.ctx.destination);
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.22;
      this.masterGain.connect(this.compressor);
    }
    return this.ctx;
  }

  start() {
    if (this.started) return;
    this.started = true;
    const ctx = this.getCtx();
    if (ctx.state === "suspended") ctx.resume();
    this.startAmbient();
  }

  private startAmbient() {
    const ctx = this.getCtx();
    if (this.ambientOsc) return;

    this.ambientGain = ctx.createGain();
    this.ambientGain.gain.value = 0;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 180;
    filter.Q.value = 1.2;

    this.ambientOsc = ctx.createOscillator();
    this.ambientOsc.type = "sine";
    this.ambientOsc.frequency.value = 55;

    this.ambientOsc2 = ctx.createOscillator();
    this.ambientOsc2.type = "sine";
    this.ambientOsc2.frequency.value = 110.4;

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.35;

    this.ambientOsc.connect(filter);
    this.ambientOsc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(this.ambientGain);
    this.ambientGain.connect(this.masterGain!);

    this.ambientOsc.start();
    this.ambientOsc2.start();
    this.ambientGain.gain.linearRampToValueAtTime(0.28, ctx.currentTime + 4);
  }

  private makeReverb(ctx: AudioContext, destination: AudioNode, wet = 0.18) {
    const convLen = Math.floor(ctx.sampleRate * 1.2);
    const buf = ctx.createBuffer(2, convLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < convLen; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / convLen, 2.5);
      }
    }
    const conv = ctx.createConvolver();
    conv.buffer = buf;
    const wetGain = ctx.createGain();
    wetGain.gain.value = wet;
    conv.connect(wetGain);
    wetGain.connect(destination);
    return conv;
  }

  hover() {
    if (!this.started) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 1180 + i * 22;
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(this.masterGain!);
      gain.gain.linearRampToValueAtTime(0.1 - i * 0.03, t + 0.006);
      gain.gain.linearRampToValueAtTime(0, t + 0.075);
      osc.frequency.exponentialRampToValueAtTime(880 + i * 18, t + 0.075);
      osc.start(t);
      osc.stop(t + 0.09);
    }
  }

  click() {
    if (!this.started) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;

    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();
    const gain2 = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.value = 560;
    osc2.type = "sine";
    osc2.frequency.value = 840;

    gain2.gain.value = 0.18;

    osc.connect(gain);
    osc2.connect(gain2);
    gain2.connect(this.masterGain!);
    gain.connect(this.masterGain!);

    gain.gain.setValueAtTime(0.42, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    osc.frequency.exponentialRampToValueAtTime(280, t + 0.16);

    gain2.gain.setValueAtTime(0.18, t);
    gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.start(t); osc.stop(t + 0.18);
    osc2.start(t); osc2.stop(t + 0.1);
  }

  bubblePop(pitch = 0) {
    if (!this.started) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;

    const reverb = this.makeReverb(ctx, this.masterGain!, 0.22);

    const noiseLen = Math.floor(ctx.sampleRate * 0.12);
    const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
    const noiseData = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
      noiseData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / noiseLen, 1.6);
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;

    const bandpass = ctx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 900 + pitch * 400;
    bandpass.Q.value = 3.5;

    const highpass = ctx.createBiquadFilter();
    highpass.type = "highpass";
    highpass.frequency.value = 300;

    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.75, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.11);

    noise.connect(highpass);
    highpass.connect(bandpass);
    bandpass.connect(ng);
    ng.connect(this.masterGain!);
    ng.connect(reverb);

    noise.start(t);
    noise.stop(t + 0.13);

    const baseFreq = 660 + pitch * 220;
    for (let h = 0; h < 3; h++) {
      const osc = ctx.createOscillator();
      const og = ctx.createGain();
      const vol = [0.38, 0.2, 0.1][h]!;
      const freqMul = [1, 2.01, 3.04][h]!;
      osc.type = h === 0 ? "sine" : "triangle";
      osc.frequency.value = baseFreq * freqMul;
      osc.connect(og);
      og.connect(this.masterGain!);
      if (h === 0) og.connect(reverb);
      og.gain.setValueAtTime(vol, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.09 - h * 0.02);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * freqMul * 0.55, t + 0.09);
      osc.start(t);
      osc.stop(t + 0.12);
    }

    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.type = "sine";
    click.frequency.value = 2400 + pitch * 600;
    click.connect(clickGain);
    clickGain.connect(this.masterGain!);
    clickGain.gain.setValueAtTime(0.22, t);
    clickGain.gain.exponentialRampToValueAtTime(0.001, t + 0.018);
    click.start(t);
    click.stop(t + 0.02);
  }

  uiTone(freq = 660, duration = 0.1) {
    if (!this.started) return;
    const ctx = this.getCtx();
    const t = ctx.currentTime;

    const freqs = [freq, freq * 1.5];
    const vols = [0.28, 0.12];

    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 0 ? "sine" : "triangle";
      osc.frequency.value = f;
      osc.connect(gain);
      gain.connect(this.masterGain!);
      gain.gain.setValueAtTime(vols[i]!, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration + i * 0.04);
      osc.start(t);
      osc.stop(t + duration + i * 0.05 + 0.02);
    });
  }
}

export const soundEngine = new SoundEngine();
