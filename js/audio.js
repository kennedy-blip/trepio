/* =====================================================================
   audio.js — tiny WebAudio beatbox with two moods:
   'ambient' (gentle candy-world music) and 'dance' (upbeat party beat)
   ===================================================================== */
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

const PATTERNS = {
  ambient: {
    bpm: 84,
    bass:  { 0: 45, 12: 41, 16: 43, 28: 40 },
    pluck: { 0: 69, 4: 72, 8: 76, 12: 74, 16: 72, 20: 76, 24: 79, 28: 74 },
    kick:  (s) => s % 8 === 0,
    snare: () => false,
    hat:   (s) => s % 4 === 2,
    hatVol: 0.05, kickVol: 0.5,
  },
  dance: {
    bpm: 112,
    bass:  [45, 45, 48, 45, 43, 43, 48, 50, 45, 45, 48, 45, 41, 43, 50, 52],
    pluck: { 0: 69, 3: 72, 6: 76, 10: 74, 12: 72, 16: 69, 19: 72, 22: 79, 26: 77, 28: 76, 30: 74 },
    kick:  (s) => s % 4 === 0,
    snare: (s) => s % 8 === 4,
    hat:   (s) => s % 2 === 0,
    hatVol: 0.11, kickVol: 0.9,
  },
};

export class Beatbox {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.muted = false;
    this.mode = 'ambient';
    this.step = 0;
    this.nextT = 0;
    this.timer = null;
    this.t0 = 0;
  }
  ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    this.master.connect(comp);
    comp.connect(this.ctx.destination);
    this.echo = this.ctx.createDelay(0.5);
    this.echo.delayTime.value = 0.42;
    const fb = this.ctx.createGain(); fb.gain.value = 0.32;
    const wet = this.ctx.createGain(); wet.gain.value = 0.4;
    this.echo.connect(fb); fb.connect(this.echo);
    this.echo.connect(wet); wet.connect(this.master);
    const len = this.ctx.sampleRate * 0.3;
    this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  start(mode = this.mode) {
    this.ensure();
    this.ctx.resume();
    const modeChanged = mode !== this.mode;
    this.mode = mode;
    if (this.playing && !modeChanged) return;
    this.stop();
    this.playing = true;
    this.step = 0;
    this.echo.delayTime.value = 60 / PATTERNS[this.mode].bpm * 0.75;
    this.t0 = this.nextT = this.ctx.currentTime + 0.06;
    this.timer = setInterval(() => this.tick(), 30);
  }
  stop() {
    this.playing = false;
    if (this.timer) { clearInterval(this.timer); this.timer = null; }
  }
  tick() {
    if (document.hidden) {
      this.nextT = Math.max(this.nextT, this.ctx.currentTime + 0.05);
      return;
    }
    while (this.nextT < this.ctx.currentTime + 0.12) {
      this.schedule(this.step, this.nextT);
      this.nextT += 60 / PATTERNS[this.mode].bpm / 4;
      this.step = (this.step + 1) % 32;
    }
  }
  schedule(s, t) {
    const P = PATTERNS[this.mode];
    if (P.kick(s)) this.kick(t, P.kickVol);
    if (P.snare(s)) this.snare(t);
    if (P.hat(s)) this.hat(t, s % 4 === 2 ? P.hatVol * 1.4 : P.hatVol);
    const bassNote = Array.isArray(P.bass) ? (s % 2 === 0 ? P.bass[(s / 2) | 0] : undefined) : P.bass[s];
    if (bassNote !== undefined) this.bass(t, midi(bassNote - 12));
    const pl = P.pluck[s];
    if (pl !== undefined) this.pluck(t, midi(pl));
  }
  kick(t, vol = 0.9) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.18);
  }
  hat(t, vol) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 7500;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.1); src.stop(t + 0.06);
  }
  snare(t) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.32, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t, Math.random() * 0.1); src.stop(t + 0.18);
    const o = this.ctx.createOscillator(), og = this.ctx.createGain();
    o.type = 'triangle'; o.frequency.value = 185;
    og.gain.setValueAtTime(0.12, t);
    og.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    o.connect(og); og.connect(this.master);
    o.start(t); o.stop(t + 0.1);
  }
  bass(t, f0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.value = f0;
    f.type = 'lowpass'; f.frequency.value = 380; f.Q.value = 1.1;
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.21);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.24);
  }
  pluck(t, f0) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    o.type = 'square'; o.frequency.value = f0;
    f.type = 'lowpass'; f.frequency.value = 1500; f.Q.value = 2;
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(f); f.connect(g);
    g.connect(this.master); g.connect(this.echo);
    o.start(t); o.stop(t + 0.22);
  }
  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.05);
  }
  beatPhase() {
    if (!this.playing || !this.ctx) return (performance.now() / 1000 * 1.9) % 1;
    const bpm = PATTERNS[this.mode].bpm;
    return ((this.ctx.currentTime - this.t0) * bpm / 60) % 1;
  }
}
