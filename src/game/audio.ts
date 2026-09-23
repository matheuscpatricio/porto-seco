"use client";

export type MusicMode = "off" | "menu" | "play" | "hack" | "boss";
export type Sfx =
  | "shoot"
  | "enemyShoot"
  | "jump"
  | "hit"
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
  | "fanfare";

type Settings = { music: boolean; sfx: boolean };

const KEY = "porto-seco-audio";
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

type Song = { bpm: number; bars: number[][]; kick: number[]; snare: number[]; hat: number[]; bass: number[]; arp: boolean; pad: boolean; bassWave: OscillatorType; drive: number };

const SONGS: Record<Exclude<MusicMode, "off">, Song> = {
  menu: { bpm: 78, bars: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], kick: [0, 10], snare: [], hat: [4, 12], bass: [0, 8], arp: true, pad: true, bassWave: "triangle", drive: 500 },
  play: { bpm: 94, bars: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], kick: [0, 6, 8, 11], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14, 15], bass: [0, 3, 6, 8, 11, 14], arp: false, pad: true, bassWave: "sawtooth", drive: 700 },
  hack: { bpm: 84, bars: [[50, 53, 57], [46, 50, 53], [48, 51, 55], [45, 49, 52]], kick: [0, 8], snare: [12], hat: [2, 6, 10, 14], bass: [0, 7, 10], arp: true, pad: true, bassWave: "square", drive: 450 },
  boss: { bpm: 132, bars: [[52, 55, 59], [52, 55, 59], [48, 52, 55], [50, 54, 57]], kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], bass: [0, 2, 4, 6, 8, 10, 12, 14], arp: true, pad: false, bassWave: "sawtooth", drive: 1100 },
};

class Sound {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private noise!: AudioBuffer;
  private mode: MusicMode = "off";
  private step = 0;
  private nextTime = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<() => void>();
  private alarmUntil = 0;
  settings: Settings = { music: true, sfx: true };

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
    if (this.ctx) {
      this.musicBus.gain.setTargetAtTime(this.settings.music ? 0.32 : 0, this.ctx.currentTime, 0.05);
      this.sfxBus.gain.setTargetAtTime(this.settings.sfx ? 0.55 : 0, this.ctx.currentTime, 0.02);
    }
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
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.settings.music ? 0.32 : 0;
    this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.settings.sfx ? 0.55 : 0;
    this.sfxBus.connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (this.mode !== "off") this.startLoop();
  }

  setMusic(mode: MusicMode) {
    if (mode === this.mode) return;
    this.mode = mode;
    if (!this.ctx) return;
    if (mode === "off") this.stopLoop();
    else this.startLoop();
  }

  private startLoop() {
    if (!this.ctx) return;
    if (this.timer) return;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), 25);
  }

  private stopLoop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || this.mode === "off") return;
    const song = SONGS[this.mode];
    const sixteenth = 60 / song.bpm / 4;
    while (this.nextTime < ctx.currentTime + 0.12) {
      const s = this.step % 16;
      const bar = Math.floor(this.step / 16) % song.bars.length;
      const chord = song.bars[bar];
      const t = this.nextTime;
      if (song.kick.includes(s)) this.kick(t);
      if (song.snare.includes(s)) this.snare(t);
      if (song.hat.includes(s)) this.hat(t, s % 4 === 2 ? 0.09 : 0.05);
      if (song.bass.includes(s)) this.tone(t, midi(chord[0] - 24), sixteenth * 1.6, song.bassWave, 0.22, this.musicBus, song.drive);
      if (song.pad && s === 0) chord.forEach((n) => this.pad(t, midi(n), sixteenth * 16));
      if (song.arp && s % 2 === 0) this.tone(t, midi(chord[(s / 2) % 3] + 12), sixteenth * 0.9, "triangle", 0.05, this.musicBus, 3000);
      this.nextTime += sixteenth;
      this.step++;
    }
  }

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private tone(t: number, freq: number, dur: number, type: OscillatorType, vol: number, bus: GainNode, cutoff = 4000, endFreq?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    f.type = "lowpass";
    f.frequency.value = cutoff;
    this.env(g, t, vol, 0.005, dur);
    o.connect(f).connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private noiseHit(t: number, dur: number, vol: number, type: BiquadFilterType, freq: number, bus: GainNode, endFreq?: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
    const g = ctx.createGain();
    this.env(g, t, vol, 0.003, dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  private kick(t: number) {
    this.tone(t, 150, 0.28, "sine", 0.9, this.musicBus, 20000, 42);
  }

  private snare(t: number) {
    this.noiseHit(t, 0.16, 0.35, "highpass", 1400, this.musicBus);
    this.tone(t, 190, 0.08, "triangle", 0.15, this.musicBus);
  }

  private hat(t: number, vol: number) {
    this.noiseHit(t, 0.04, vol, "highpass", 7500, this.musicBus);
  }

  private pad(t: number, freq: number, dur: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.value = freq;
    o.detune.value = (Math.random() - 0.5) * 12;
    f.type = "lowpass";
    f.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.035, t + 0.4);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(this.musicBus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  sfx(name: Sfx) {
    const ctx = this.ctx;
    if (!ctx || !this.settings.sfx) return;
    const t = ctx.currentTime + 0.005;
    const b = this.sfxBus;
    switch (name) {
      case "shoot":
        this.tone(t, 1400, 0.12, "square", 0.18, b, 5000, 220);
        this.noiseHit(t, 0.05, 0.12, "bandpass", 3000, b);
        break;
      case "enemyShoot":
        this.tone(t, 500, 0.14, "sawtooth", 0.12, b, 2500, 120);
        break;
      case "jump":
        this.tone(t, 260, 0.14, "square", 0.1, b, 2000, 620);
        break;
      case "hit":
        this.noiseHit(t, 0.08, 0.3, "bandpass", 1800, b);
        this.tone(t, 320, 0.06, "square", 0.08, b);
        break;
      case "enemyDown":
        this.tone(t, 420, 0.4, "sawtooth", 0.2, b, 1500, 55);
        break;
      case "boom":
        this.noiseHit(t, 0.7, 0.6, "lowpass", 2000, b, 80);
        this.tone(t, 90, 0.5, "sine", 0.5, b, 400, 30);
        break;
      case "hurt":
        this.tone(t, 220, 0.25, "square", 0.22, b, 1200, 80);
        this.noiseHit(t, 0.1, 0.2, "lowpass", 900, b);
        break;
      case "alarm": {
        if (ctx.currentTime < this.alarmUntil) return;
        this.alarmUntil = ctx.currentTime + 2.4;
        for (let i = 0; i < 6; i++) this.tone(t + i * 0.4, i % 2 ? 960 : 720, 0.38, "sawtooth", 0.13, b, 2500);
        break;
      }
      case "lockOk":
        this.tone(t, 880, 0.08, "sine", 0.25, b);
        this.tone(t + 0.08, 1320, 0.14, "sine", 0.25, b);
        break;
      case "lockBad":
        this.tone(t, 150, 0.3, "square", 0.2, b, 900);
        break;
      case "success":
        [60, 64, 67, 72].forEach((n, i) => this.tone(t + i * 0.09, midi(n + 12), 0.25, "triangle", 0.22, b));
        break;
      case "gate":
        this.noiseHit(t, 1.1, 0.25, "lowpass", 200, b, 1600);
        this.tone(t, 70, 1.1, "sawtooth", 0.08, b, 300, 110);
        break;
      case "car":
        this.tone(t, 55, 2.2, "sawtooth", 0.25, b, 700, 190);
        this.noiseHit(t, 0.5, 0.2, "lowpass", 600, b);
        break;
      case "terminal":
        this.tone(t, 1200, 0.05, "square", 0.08, b);
        this.tone(t + 0.07, 1800, 0.06, "square", 0.08, b);
        break;
      case "click":
        this.tone(t, 900, 0.03, "square", 0.05, b);
        break;
      case "fanfare":
        [67, 72, 76, 79, 84].forEach((n, i) => this.tone(t + i * 0.12, midi(n), i === 4 ? 0.8 : 0.2, "square", 0.14, b, 3000));
        [48, 55, 60].forEach((n) => this.tone(t + 0.48, midi(n), 0.9, "triangle", 0.2, b));
        break;
    }
  }
}

export const sound = new Sound();
