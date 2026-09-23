"use client";

export type Ambience = "off" | "day" | "night" | "cyber" | "menu";
export type Sfx =
  | "shoot"
  | "enemyShoot"
  | "jump"
  | "land"
  | "hit"
  | "ricochet"
  | "enemyDown"
  | "boom"
  | "hurt"
  | "alarm"
  | "lockOk"
  | "lockBad"
  | "success"
  | "gate"
  | "car"
  | "terminal"
  | "click"
  | "fanfare"
  | "honk"
  | "siren"
  | "pickup"
  | "scream";

export type At = { pan?: number; vol?: number };
export type EngineVoice = { gain: number; pan: number; rpm: number };

type Settings = { sfx: boolean };

const KEY = "porto-seco-audio-v2";
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
const VOWELS: [number, number][] = [
  [800, 1200],
  [500, 1900],
  [320, 2300],
  [500, 900],
  [350, 800],
];
const VOICE_PITCH: Record<string, number> = { leo: 150, dani: 235, rui: 105, bia: 250, vidal: 118, caveira: 95, baiano: 110, brito: 125, tanque: 85, marreta: 90 };

class Sound {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private sfxBus!: GainNode;
  private verb!: GainNode;
  private noise!: AudioBuffer;
  private brown!: AudioBuffer;
  private amb: { rumble: GainNode; hiss: GainNode; hum: GainNode; humOsc: OscillatorNode; birds: boolean } | null = null;
  private engines: { osc: OscillatorNode; osc2: OscillatorNode; filter: BiquadFilterNode; gain: GainNode; pan: StereoPannerNode; tire: GainNode }[] = [];
  private ambience: Ambience = "off";
  private ambTimer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private alarmUntil = 0;
  settings: Settings = { sfx: true };

  constructor() {
    if (typeof window === "undefined") return;
    try {
      this.settings = { ...this.settings, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
    } catch {}
    const unlock = () => this.unlock();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  }

  subscribe(l: () => void) {
    this.listeners.add(l);
    return () => {
      this.listeners.delete(l);
    };
  }

  getSettings = () => this.settings;

  set(patch: Partial<Settings>) {
    this.settings = { ...this.settings, ...patch };
    localStorage.setItem(KEY, JSON.stringify(this.settings));
    if (this.ctx) this.master.gain.setTargetAtTime(this.settings.sfx ? 0.9 : 0, this.ctx.currentTime, 0.05);
    this.listeners.forEach((l) => l());
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.settings.sfx ? 0.9 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = 0.7;
    this.sfxBus.connect(this.master);

    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    this.brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const w = this.noise.getChannelData(0);
    const b = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      w[i] = Math.random() * 2 - 1;
      last = (last + 0.02 * w[i]) / 1.02;
      b[i] = last * 3.5;
    }

    const ir = ctx.createBuffer(2, ctx.sampleRate * 1.6, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3.2);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    this.verb = ctx.createGain();
    this.verb.gain.value = 0.35;
    this.verb.connect(conv).connect(this.master);

    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc.type = "sawtooth";
      osc2.type = "square";
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 400;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      const pan = ctx.createStereoPanner();
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const tf = ctx.createBiquadFilter();
      tf.type = "bandpass";
      tf.frequency.value = 900;
      tf.Q.value = 0.6;
      const tire = ctx.createGain();
      tire.gain.value = 0;
      const o2g = ctx.createGain();
      o2g.gain.value = 0.4;
      osc.connect(filter);
      osc2.connect(o2g).connect(filter);
      filter.connect(gain);
      src.connect(tf).connect(tire).connect(pan);
      gain.connect(pan).connect(this.sfxBus);
      osc.start();
      osc2.start();
      src.start(0, Math.random());
      this.engines.push({ osc, osc2, filter, gain, pan, tire });
    }
    this.startAmbience();
  }

  setAmbience(a: Ambience) {
    if (a === this.ambience) return;
    this.ambience = a;
    if (this.ctx) this.applyAmbience();
  }

  private loopNoise(buf: AudioBuffer, type: BiquadFilterType, freq: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(this.master);
    src.start(0, Math.random());
    return g;
  }

  private startAmbience() {
    const ctx = this.ctx!;
    const rumble = this.loopNoise(this.brown, "lowpass", 380);
    const hiss = this.loopNoise(this.noise, "bandpass", 2600);
    const humOsc = ctx.createOscillator();
    humOsc.type = "sine";
    humOsc.frequency.value = 55;
    const hum = ctx.createGain();
    hum.gain.value = 0;
    humOsc.connect(hum).connect(this.master);
    humOsc.start();
    this.amb = { rumble, hiss, hum, humOsc, birds: false };
    this.applyAmbience();
    this.ambTimer = setInterval(() => this.ambientEvent(), 1800);
  }

  private applyAmbience() {
    const ctx = this.ctx;
    if (!ctx || !this.amb) return;
    const a = this.ambience;
    const t = ctx.currentTime;
    const city = a === "day" || a === "night";
    this.amb.rumble.gain.setTargetAtTime(city ? 0.16 : a === "menu" ? 0.07 : 0, t, 0.6);
    this.amb.hiss.gain.setTargetAtTime(city ? (a === "night" ? 0.012 : 0.02) : 0, t, 0.6);
    this.amb.hum.gain.setTargetAtTime(a === "cyber" ? 0.08 : 0, t, 0.3);
    if (a !== "day" && a !== "night") this.setEngines([]);
  }

  private ambientEvent() {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx) return;
    const a = this.ambience;
    const r = Math.random();
    const pan = Math.random() * 1.6 - 0.8;
    if (a === "day" || a === "night") {
      if (r < 0.1) this.sfx("honk", { pan, vol: 0.15 });
      else if (r < 0.15) this.sfx("siren", { pan, vol: 0.12 });
      else if (r < 0.4 && a === "day") this.bird(pan);
      else if (r < 0.55) this.babble(90 + Math.random() * 170, 3 + Math.floor(Math.random() * 5), pan, 0.05);
      else if (r < 0.62 && a === "night") this.dog(pan);
    } else if (a === "cyber" && r < 0.5) {
      this.tone(ctx.currentTime, 2000 + Math.random() * 3000, 0.04, "sine", 0.03, this.sfxBus);
    }
  }

  setEngines(voices: EngineVoice[]) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    this.engines.forEach((e, i) => {
      const v = voices[i];
      const g = v ? v.gain : 0;
      e.gain.gain.setTargetAtTime(g * 0.2, t, 0.08);
      e.tire.gain.setTargetAtTime(g * 0.05 * (v ? Math.min(1, v.rpm) : 0), t, 0.08);
      if (v) {
        const f = 38 + v.rpm * 34;
        e.osc.frequency.setTargetAtTime(f, t, 0.1);
        e.osc2.frequency.setTargetAtTime(f * 0.5, t, 0.1);
        e.filter.frequency.setTargetAtTime(260 + v.rpm * 500, t, 0.1);
        e.pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, v.pan)), t, 0.05);
      }
    });
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private out(pan = 0, wet = 0) {
    const ctx = this.ctx!;
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    p.connect(this.sfxBus);
    if (wet > 0) {
      const s = ctx.createGain();
      s.gain.value = wet;
      p.connect(s).connect(this.verb);
    }
    return p;
  }

  private tone(t: number, freq: number, dur: number, type: OscillatorType, vol: number, bus: AudioNode, cutoff = 4000, endFreq?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    f.type = "lowpass";
    f.frequency.value = cutoff;
    this.env(g, t, vol, 0.004, dur);
    o.connect(f).connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseHit(t: number, dur: number, vol: number, type: BiquadFilterType, freq: number, bus: AudioNode, endFreq?: number, buf?: AudioBuffer) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf ?? this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = ctx.createGain();
    this.env(g, t, vol, 0.002, dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 1.5);
    src.stop(t + dur + 0.05);
  }

  /** Syllable babble through vowel formants: sounds like distant speech without words. */
  babble(pitch: number, syllables: number, pan = 0, vol = 0.1) {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx) return;
    const bus = this.out(pan, 0.15);
    let t = ctx.currentTime + 0.02;
    for (let i = 0; i < syllables; i++) {
      const dur = 0.07 + Math.random() * 0.1;
      const [f1, f2] = VOWELS[Math.floor(Math.random() * VOWELS.length)];
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      const p = pitch * (0.9 + Math.random() * 0.25) * (i === syllables - 1 ? 0.85 : 1);
      o.frequency.setValueAtTime(p, t);
      o.frequency.linearRampToValueAtTime(p * (0.92 + Math.random() * 0.14), t + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.02);
      g.gain.linearRampToValueAtTime(vol * 0.7, t + dur * 0.7);
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
      for (const [f, q, k] of [
        [f1, 6, 1],
        [f2, 9, 0.5],
      ]) {
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = f * (pitch > 190 ? 1.15 : 1);
        bp.Q.value = q;
        const kg = ctx.createGain();
        kg.gain.value = k * 3;
        o.connect(bp).connect(kg).connect(g);
      }
      g.connect(bus);
      o.start(t);
      o.stop(t + dur + 0.02);
      if (Math.random() < 0.3) this.noiseHit(t, 0.03, vol * 0.4, "highpass", 5000, bus);
      t += dur + (Math.random() < 0.2 ? 0.12 : 0.015);
    }
  }

  speak(who: string, text: string) {
    const syl = Math.max(2, Math.min(9, Math.round(text.length / 9)));
    this.babble(VOICE_PITCH[who] ?? 150, syl, 0, 0.09);
  }

  step(pan = 0, vol = 0.12, run = false) {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx) return;
    const t = ctx.currentTime;
    const bus = this.out(pan);
    this.noiseHit(t, run ? 0.06 : 0.05, vol, "bandpass", 700 + Math.random() * 500, bus);
    this.tone(t, 90 + Math.random() * 20, 0.05, "sine", vol * 0.8, bus, 400);
  }

  private bird(pan: number) {
    const ctx = this.ctx!;
    const bus = this.out(pan, 0.3);
    let t = ctx.currentTime;
    const n = 2 + Math.floor(Math.random() * 4);
    const base = 2600 + Math.random() * 1500;
    for (let i = 0; i < n; i++) {
      this.tone(t, base, 0.07, "sine", 0.025, bus, 9000, base * (1.2 + Math.random() * 0.4));
      t += 0.09 + Math.random() * 0.05;
    }
  }

  private dog(pan: number) {
    const ctx = this.ctx!;
    const bus = this.out(pan, 0.5);
    const t = ctx.currentTime;
    for (let i = 0; i < 2; i++) {
      this.tone(t + i * 0.28, 520, 0.12, "sawtooth", 0.035, bus, 1400, 300);
      this.noiseHit(t + i * 0.28, 0.1, 0.02, "bandpass", 900, bus);
    }
  }

  sfx(name: Sfx, at: At = {}) {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx) return;
    const t = ctx.currentTime + 0.005;
    const v = at.vol ?? 1;
    const pan = at.pan ?? 0;
    switch (name) {
      case "shoot": {
        const b = this.out(pan, 0.9);
        this.noiseHit(t, 0.09, 0.9 * v, "highpass", 1800, b, 600);
        this.noiseHit(t, 0.25, 0.6 * v, "lowpass", 1400, b, 120, this.brown);
        this.tone(t, 160, 0.14, "sine", 0.7 * v, b, 800, 45);
        this.noiseHit(t + 0.05, 0.02, 0.1 * v, "highpass", 6000, b);
        break;
      }
      case "enemyShoot": {
        const b = this.out(pan, 1.1);
        this.noiseHit(t, 0.07, 0.55 * v, "bandpass", 1300, b, 400);
        this.tone(t, 120, 0.12, "sine", 0.45 * v, b, 600, 40);
        break;
      }
      case "ricochet": {
        const b = this.out(pan, 0.6);
        this.noiseHit(t, 0.03, 0.25 * v, "highpass", 4000, b);
        this.tone(t, 3200 + Math.random() * 1200, 0.22, "sine", 0.05 * v, b, 9000, 1600);
        break;
      }
      case "jump": {
        const b = this.out(pan);
        this.noiseHit(t, 0.05, 0.12 * v, "bandpass", 600, b);
        this.babble(150, 1, pan, 0.03 * v);
        break;
      }
      case "land":
        this.noiseHit(t, 0.08, 0.2 * v, "lowpass", 500, this.out(pan), 120, this.brown);
        break;
      case "hit": {
        const b = this.out(pan, 0.2);
        this.noiseHit(t, 0.07, 0.35 * v, "lowpass", 1200, b, 200);
        this.tone(t, 110, 0.08, "sine", 0.3 * v, b, 500);
        break;
      }
      case "enemyDown": {
        const b = this.out(pan, 0.3);
        this.babble(95 + Math.random() * 30, 1, pan, 0.12 * v);
        this.noiseHit(t + 0.35, 0.18, 0.35 * v, "lowpass", 400, b, 80, this.brown);
        break;
      }
      case "scream":
        this.babble(260 + Math.random() * 90, 2, pan, 0.08 * v);
        break;
      case "boom": {
        const b = this.out(pan, 1.2);
        this.noiseHit(t, 1.1, 0.9 * v, "lowpass", 1800, b, 60, this.brown);
        this.noiseHit(t, 0.3, 0.4 * v, "highpass", 900, b);
        this.tone(t, 70, 0.8, "sine", 0.7 * v, b, 300, 25);
        break;
      }
      case "hurt": {
        const b = this.out(pan, 0.2);
        this.babble(140, 1, pan, 0.12 * v);
        this.noiseHit(t, 0.12, 0.3 * v, "lowpass", 700, b, 100, this.brown);
        break;
      }
      case "alarm": {
        if (ctx.currentTime < this.alarmUntil) return;
        this.alarmUntil = ctx.currentTime + 3;
        const b = this.out(pan, 0.8);
        for (let i = 0; i < 6; i++) this.tone(t + i * 0.45, 650, 0.42, "square", 0.08 * v, b, 1600, 1050);
        break;
      }
      case "siren": {
        const b = this.out(pan, 1.4);
        const o = ctx.createOscillator();
        o.type = "triangle";
        const g = ctx.createGain();
        o.frequency.setValueAtTime(700, t);
        for (let i = 0; i < 6; i++) {
          o.frequency.linearRampToValueAtTime(1100, t + i * 0.7 + 0.35);
          o.frequency.linearRampToValueAtTime(700, t + i * 0.7 + 0.7);
        }
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.06 * v, t + 1);
        g.gain.linearRampToValueAtTime(0.0001, t + 4.2);
        o.connect(g).connect(b);
        o.start(t);
        o.stop(t + 4.3);
        break;
      }
      case "honk": {
        const b = this.out(pan, 0.6);
        const dur = 0.25 + Math.random() * 0.3;
        this.tone(t, 415, dur, "square", 0.12 * v, b, 1800);
        this.tone(t, 523, dur, "square", 0.1 * v, b, 1800);
        break;
      }
      case "lockOk": {
        const b = this.out(pan, 0.3);
        this.noiseHit(t, 0.03, 0.3 * v, "highpass", 3000, b);
        this.tone(t + 0.02, 1760, 0.12, "sine", 0.12 * v, b);
        break;
      }
      case "lockBad": {
        const b = this.out(pan, 0.3);
        this.tone(t, 110, 0.35, "square", 0.14 * v, b, 700);
        this.tone(t, 116, 0.35, "square", 0.1 * v, b, 700);
        break;
      }
      case "success": {
        const b = this.out(pan, 0.5);
        [72, 79, 84].forEach((n, i) => this.tone(t + i * 0.08, midi(n), 0.3, "sine", 0.14 * v, b));
        break;
      }
      case "pickup": {
        const b = this.out(pan, 0.3);
        this.noiseHit(t, 0.05, 0.2 * v, "bandpass", 2500, b);
        this.tone(t + 0.04, 1200, 0.1, "sine", 0.1 * v, b, 6000, 1800);
        break;
      }
      case "gate": {
        const b = this.out(pan, 0.8);
        this.noiseHit(t, 0.08, 0.5 * v, "bandpass", 1500, b);
        this.noiseHit(t + 0.05, 1.6, 0.3 * v, "lowpass", 260, b, 500, this.brown);
        this.tone(t + 0.05, 60, 1.6, "sawtooth", 0.06 * v, b, 280, 75);
        this.noiseHit(t + 1.7, 0.12, 0.5 * v, "bandpass", 900, b);
        break;
      }
      case "car": {
        const b = this.out(pan, 0.4);
        this.noiseHit(t, 0.08, 0.3 * v, "bandpass", 1200, b);
        this.tone(t + 0.1, 40, 0.4, "sawtooth", 0.2 * v, b, 500, 70);
        this.tone(t + 0.5, 60, 2.2, "sawtooth", 0.28 * v, b, 900, 200);
        this.noiseHit(t + 0.6, 1.2, 0.2 * v, "bandpass", 1500, b, 700);
        break;
      }
      case "terminal": {
        const b = this.out(pan, 0.2);
        for (let i = 0; i < 5; i++) this.noiseHit(t + i * 0.05 + Math.random() * 0.02, 0.02, 0.18 * v, "bandpass", 3500, b);
        this.tone(t + 0.28, 1320, 0.06, "sine", 0.06 * v, b);
        break;
      }
      case "click":
        this.noiseHit(t, 0.015, 0.12 * v, "highpass", 4000, this.out(pan));
        break;
      case "fanfare": {
        const b = this.out(pan, 0.8);
        [60, 64, 67, 72].forEach((n, i) => this.tone(t + i * 0.1, midi(n), 0.6, "triangle", 0.12 * v, b, 3000));
        this.noiseHit(t, 1.2, 0.08 * v, "highpass", 5000, b, 9000);
        break;
      }
    }
  }
}

export const sound = new Sound();
