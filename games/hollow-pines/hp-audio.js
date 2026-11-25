'use strict';
/* Hollow Pines — every sound is synthesised with Web Audio */
const SND = (() => {
  let AC = null, MG = null, NB = null, vol = 0.9;
  const L = {};
  const clampP = p => Math.max(-1, Math.min(1, p || 0));
  function init() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return; }
    MG = AC.createGain(); MG.gain.value = vol;
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4;
    MG.connect(comp); comp.connect(AC.destination);
    NB = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate);
    const d = NB.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // forest bed
    L.wind = loopNoise('lowpass', 380, 0.7, 0.13);
    lfo(L.wind.f.frequency, 0.07, 220);
    L.leaves = loopNoise('bandpass', 3200, 0.6, 0.025);
    lfo(L.leaves.g.gain, 0.13, 0.02);
    L.drone = tone([55, 58.3, 82.4, 110.6], 'sawtooth', 520, 0);
    L.menu = tone([41.2, 43.6, 61.7], 'sawtooth', 300, 0);
    L.hum = tone([50, 100, 150], 'sawtooth', 240, 0);
    L.stat = loopNoise('bandpass', 2400, 0.8, 0);
    L.heli = (() => { const n = loopNoise('lowpass', 220, 1, 0); const am = AC.createGain(); am.gain.value = 0.5;
      n.f.disconnect(); n.f.connect(am); am.connect(n.g);
      const o = AC.createOscillator(); o.type = 'square'; o.frequency.value = 12; const og = AC.createGain(); og.gain.value = 0.5; o.connect(og); og.connect(am.gain); o.start(); return n; })();
    L.tunnel = loopNoise('lowpass', 140, 1.5, 0);
    L.breath = loopNoise('bandpass', 900, 1.2, 0); lfo(L.breath.f.frequency, 0.9, 300);
    L.rain = (() => {
      // real rain: a soft wash underneath + thousands of individual droplets (each a tiny ringing tick at its own pitch),
      // heavier drips off branches and splats in puddles, spread left/right — pre-rendered once into a 6 s stereo loop
      const sr = AC.sampleRate, len = Math.floor(sr * 6), buf = AC.createBuffer(2, len, sr);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch); let lp = 0, lp2 = 0, hp = 0, prev = 0;
        for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; lp += (w - lp) * 0.08; lp2 += (lp - lp2) * 0.08; hp = 0.97 * (hp + w - prev); prev = w; d[i] = lp2 * 0.55 + hp * 0.045; }
        // each drop is a tiny burst of filtered static (not a pitched ping): soft ticks on leaves, duller taps on the ground
        const drop = (t0, bright, amp, decay) => { const n = Math.floor(sr * decay * 5); let y1 = 0, y2 = 0, px = 0; for (let k = 0; k < n; k++) { const j = (t0 + k) % len, e = Math.exp(-k / (sr * decay)), w = Math.random() * 2 - 1; y1 += (w - y1) * bright; y2 += (y1 - y2) * bright; const hpv = y1 - px * 0.6; px = y1; d[j] += (bright > 0.5 ? hpv : y2) * e * amp; } };
        for (let k = 0; k < 14000; k++) drop(Math.floor(Math.random() * len), 0.55 + Math.random() * 0.4, 0.025 + Math.random() * 0.05, 0.0006 + Math.random() * 0.0012);
        for (let k = 0; k < 900; k++) drop(Math.floor(Math.random() * len), 0.12 + Math.random() * 0.2, 0.08 + Math.random() * 0.12, 0.002 + Math.random() * 0.004);
        for (let k = 0; k < 50; k++) drop(Math.floor(Math.random() * len), 0.05 + Math.random() * 0.06, 0.25 + Math.random() * 0.15, 0.01 + Math.random() * 0.008);
        const fade = Math.floor(sr * 0.25); for (let i = 0; i < fade; i++) { const k = i / fade; d[i] = d[i] * k + d[len - fade + i] * (1 - k); } for (let i = 0; i < len; i++) d[i] *= 2.6;
      }
      const src = AC.createBufferSource(); src.buffer = buf; src.loop = true; src.loopEnd = 6 - 0.25;
      const tone = AC.createBiquadFilter(); tone.type = 'highshelf'; tone.frequency.value = 3000; tone.gain.value = -3;
      const g = AC.createGain(); g.gain.value = 0; src.connect(tone); tone.connect(g); g.connect(MG); src.start(); return { g, tone };
    })();
    // night chorus: a field of crickets + katydids, each chirping in its own rhythm and place
    L.chorus = { g: AC.createGain() }; L.chorus.g.gain.value = 0; L.chorus.g.connect(MG);
    const pulse = (param, f, depth, type) => { const o = AC.createOscillator(); o.type = type || 'square'; o.frequency.value = f; const g = AC.createGain(); g.gain.value = depth; o.connect(g); g.connect(param); o.start(); };
    for (let i = 0; i < 9; i++) {
      const o = AC.createOscillator(); o.type = 'sine'; o.frequency.value = 3900 + Math.random() * 1500;
      const g1 = AC.createGain(); g1.gain.value = 0.5; pulse(g1.gain, 24 + Math.random() * 16, 0.5);
      const g2 = AC.createGain(); g2.gain.value = 0.5; pulse(g2.gain, 0.6 + Math.random() * 1.6, 0.5);
      const g3 = AC.createGain(); g3.gain.value = 0.012 + Math.random() * 0.018;
      o.connect(g1); g1.connect(g2); g2.connect(g3);
      let outN = g3; if (AC.createStereoPanner) { const pn = AC.createStereoPanner(); pn.pan.value = Math.random() * 2 - 1; g3.connect(pn); outN = pn; }
      outN.connect(L.chorus.g); o.start();
    }
    for (let i = 0; i < 2; i++) {
      const n = AC.createBufferSource(); n.buffer = NB; n.loop = true; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 6200 + i * 900; f.Q.value = 9;
      const g1 = AC.createGain(); g1.gain.value = 0.5; pulse(g1.gain, 2.6 + i * 0.9, 0.5);
      const g2 = AC.createGain(); g2.gain.value = 0.5; pulse(g2.gain, 0.25 + i * 0.1, 0.5);
      const g3 = AC.createGain(); g3.gain.value = 0.05; n.connect(f); f.connect(g1); g1.connect(g2); g2.connect(g3);
      let outN = g3; if (AC.createStereoPanner) { const pn = AC.createStereoPanner(); pn.pan.value = i ? 0.7 : -0.6; g3.connect(pn); outN = pn; }
      outN.connect(L.chorus.g); n.start(0, Math.random());
    }
    L.siren = (() => { const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 620; const l = AC.createOscillator(); l.frequency.value = 0.35; const lg = AC.createGain(); lg.gain.value = 260; l.connect(lg); lg.connect(o.frequency); l.start(); const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.2; const g = AC.createGain(); g.gain.value = 0; o.connect(f); f.connect(g); g.connect(MG); o.start(); return { g }; })();
    L.sizzle = loopNoise('highpass', 2600, 0.6, 0); lfo(L.sizzle.f.frequency, 7, 900);
    L.crickets = { g: AC.createGain() }; L.crickets.g.gain.value = 0.5; L.crickets.g.connect(MG);
  }
  function lfo(param, f, depth) { const o = AC.createOscillator(); o.frequency.value = f; const g = AC.createGain(); g.gain.value = depth; o.connect(g); g.connect(param); o.start(); }
  function loopNoise(type, freq, q, v) { const s = AC.createBufferSource(); s.buffer = NB; s.loop = true; const f = AC.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = AC.createGain(); g.gain.value = v; s.connect(f); f.connect(g); g.connect(MG); s.start(); return { s, f, g }; }
  function tone(fr, type, lp, v) { const g = AC.createGain(); g.gain.value = v; const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; f.connect(g); g.connect(MG); fr.forEach(x => { const o = AC.createOscillator(); o.type = type; o.frequency.value = x; const og = AC.createGain(); og.gain.value = 0.28; o.connect(og); og.connect(f); o.start(); }); return { g, f }; }
  function out(pan) { if (AC.createStereoPanner) { const s = AC.createStereoPanner(); s.pan.value = clampP(pan); s.connect(MG); return s; } return MG; }
  function burst({ dur = 0.1, type = 'lowpass', freq = 800, q = 1, v = 0.3, pan = 0, att = 0.002, delay = 0, f2 = 0 }) {
    if (!AC) return; const t = AC.currentTime + delay;
    const s = AC.createBufferSource(); s.buffer = NB; const f = AC.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur); f.Q.value = q;
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(out(pan)); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }
  function osc({ f = 440, f2 = 0, type = 'sine', dur = 0.3, v = 0.2, pan = 0, delay = 0, att = 0.005, vib = 0, vibF = 6, dest = null }) {
    if (!AC) return; const t = AC.currentTime + delay;
    const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    if (vib) { const l = AC.createOscillator(); l.frequency.value = vibF; const lg = AC.createGain(); lg.gain.value = vib; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest || out(pan)); o.start(t); o.stop(t + dur + 0.05);
  }
  function shaper(amt) { const ws = AC.createWaveShaper(); const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * amt); } ws.curve = c; return ws; }
  function scream(v = 1, dur = 1.9, base = 300) {
    if (!AC) return; const t = AC.currentTime; const ws = shaper(7); const g = AC.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.03); g.gain.setValueAtTime(v, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    ws.connect(g); g.connect(MG);
    [1, 1.07, 1.5, 2.03, 0.5, 2.9].forEach((m, i) => {
      const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(base * m, t); o.frequency.exponentialRampToValueAtTime(base * 5 * m, t + 0.14); o.frequency.linearRampToValueAtTime(base * 3.4 * m, t + dur);
      const l = AC.createOscillator(); l.frequency.value = 8 + i * 2.7; const lg = AC.createGain(); lg.gain.value = 70 * m; l.connect(lg); lg.connect(o.frequency);
      const og = AC.createGain(); og.gain.value = 0.13; o.connect(og); og.connect(ws); o.start(t); l.start(t); o.stop(t + dur); l.stop(t + dur);
    });
    const n = AC.createBufferSource(); n.buffer = NB; const nf = AC.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 2600; nf.Q.value = 0.6; const ng = AC.createGain(); ng.gain.value = 0.55; n.connect(nf); nf.connect(ng); ng.connect(ws); n.start(t); n.stop(t + dur);
    osc({ f: 70, f2: 30, dur: 1.2, v: 0.9, type: 'sine' });
  }
  // ---------- home screen horror score ----------
  const MU = { on: false, next: 0, step: 0, timer: null, bus: null, rev: null };
  function musicInit() {
    if (MU.bus) return;
    MU.bus = AC.createGain(); MU.bus.gain.value = 0; MU.bus.connect(MG);
    MU.rev = AC.createConvolver(); const len = AC.sampleRate * 4, ir = AC.createBuffer(2, len, AC.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    MU.rev.buffer = ir; MU.wet = AC.createGain(); MU.wet.gain.value = 0.9; MU.rev.connect(MU.wet); MU.wet.connect(MU.bus);
  }
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  function mNote(t, f, dur, { type = 'sine', v = 0.1, att = 0.01, wet = 0.5, det = 0, lp = 0 } = {}) {
    const o = AC.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
    const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o; if (lp) { const f2 = AC.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = lp; o.connect(f2); n = f2; }
    n.connect(g); g.connect(MU.bus); const w = AC.createGain(); w.gain.value = wet; g.connect(w); w.connect(MU.rev); o.start(t); o.stop(t + dur + 0.1);
  }
  // A minor: Am – F – Dm – E (8 s each), music box phrases on top
  const CHORDS = [[45, 48, 52], [41, 45, 48], [38, 41, 45], [40, 44, 47]];
  const BOX = [[81, 0, 84, 83, 0, 79, 76, 0], [77, 0, 76, 72, 0, 74, 76, 0], [74, 0, 77, 76, 74, 0, 72, 0], [71, 0, 72, 74, 0, 68, 71, 0]];
  function musicTick() {
    if (!MU.on) return;
    while (MU.next < AC.currentTime + 0.6) {
      const t = MU.next, bar = Math.floor(MU.step / 8) % 4, beat = MU.step % 8;
      if (beat === 0) {
        CHORDS[bar].forEach((m, i) => { mNote(t, hz(m), 8.6, { type: 'sawtooth', v: 0.035, att: 2.2, wet: 0.7, det: (i - 1) * 7, lp: 520 }); mNote(t, hz(m + 12), 8.6, { type: 'triangle', v: 0.018, att: 3, wet: 0.9, det: -9 + i * 6 }); });
        mNote(t, hz(CHORDS[bar][0] - 12), 7.8, { type: 'sine', v: 0.16, att: 1.5, wet: 0.2 });
        if (bar === 0 || bar === 2) { mNote(t, 34, 3.5, { v: 0.4, att: 0.01, wet: 0.5 }); }
        if (bar === 3) { const f = hz(76); mNote(t + 1, f, 6, { type: 'sawtooth', v: 0.02, att: 4, wet: 1, det: 0, lp: 2400 }); mNote(t + 1, f * Math.pow(2, 1 / 12), 6, { type: 'sawtooth', v: 0.02, att: 4, wet: 1, det: 12, lp: 2400 }); }
      }
      if (beat % 2 === 0) { mNote(t, 55, 0.35, { v: beat === 0 ? 0.22 : 0.12, att: 0.005, wet: 0.1 }); mNote(t + 0.24, 50, 0.3, { v: beat === 0 ? 0.14 : 0.07, att: 0.005, wet: 0.1 }); }
      const bn = BOX[bar][beat];
      if (bn && Math.random() < 0.92) { const det = (Math.random() - 0.5) * 30; mNote(t + Math.random() * 0.04, hz(bn), 2.2, { type: 'sine', v: 0.06, att: 0.004, wet: 0.85, det }); mNote(t, hz(bn) * 2.01, 0.9, { type: 'sine', v: 0.015, att: 0.003, wet: 0.9, det }); }
      if (Math.random() < 0.03) { const s = AC.createBufferSource(); s.buffer = NB; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(3000, t + 2.5); f.Q.value = 2; const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 2.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6); s.connect(f); f.connect(g); g.connect(MU.rev); s.start(t); s.stop(t + 2.7); }
      MU.next += 1; MU.step++;
    }
  }
  function music(on) {
    if (!AC) return; musicInit();
    if (on && !MU.on) { MU.on = true; MU.next = AC.currentTime + 0.2; MU.step = 0; MU.bus.gain.cancelScheduledValues(AC.currentTime); MU.bus.gain.setTargetAtTime(0.9, AC.currentTime, 1.5); MU.timer = setInterval(musicTick, 120); musicTick(); }
    else if (!on && MU.on) { MU.on = false; clearInterval(MU.timer); MU.bus.gain.cancelScheduledValues(AC.currentTime); MU.bus.gain.setTargetAtTime(0, AC.currentTime, 0.6); }
  }
  const S = {
    music,
    init, get ok() { return !!AC; },
    setVol(v) { vol = v; if (MG) MG.gain.value = v; },
    set(name, v, tc = 0.3) { if (!AC || !L[name]) return; L[name].g.gain.setTargetAtTime(v, AC.currentTime, tc); },
    step(run, wood) { burst({ dur: run ? 0.11 : 0.09, freq: wood ? 380 : (run ? 760 : 520), q: wood ? 3 : 0.6, v: run ? 0.17 : 0.1 }); if (!wood && Math.random() < 0.35) burst({ dur: 0.03, type: 'highpass', freq: 3500, v: 0.05, delay: 0.02 }); },
    cstep(pan, v) { osc({ f: 75, f2: 38, dur: 0.22, v: v * 0.55, pan }); burst({ dur: 0.14, freq: 420, v: v * 0.3, pan }); },
    crawl(pan, v) { burst({ dur: 0.18, type: 'bandpass', freq: 1200 + Math.random() * 600, q: 2, v: v * 0.25, pan }); osc({ f: 50, f2: 35, dur: 0.12, v: v * 0.4, pan, delay: 0.05 }); },
    snap(pan) { burst({ dur: 0.04, type: 'highpass', freq: 2600, v: 0.35, pan }); burst({ dur: 0.07, type: 'bandpass', freq: 1300, q: 3, v: 0.22, pan, delay: 0.05 }); },
    splash(run) { burst({ dur: run ? 0.35 : 0.28, type: 'bandpass', freq: 700 + Math.random() * 300, q: 0.8, v: run ? 0.3 : 0.2 }); burst({ dur: 0.2, type: 'highpass', freq: 2500, v: 0.08, delay: 0.05 }); },
    bigSplash() { burst({ dur: 1.4, type: 'lowpass', freq: 1800, f2: 200, v: 0.9, att: 0.005 }); osc({ f: 80, f2: 30, dur: 0.6, v: 0.8 }); burst({ dur: 2.5, type: 'bandpass', freq: 900, q: 0.6, v: 0.25, delay: 0.2, att: 0.1 }); },
    whoosh() { burst({ dur: 1.6, type: 'bandpass', freq: 500, f2: 2500, q: 0.7, v: 0.5, att: 0.3 }); },
    alarm() { osc({ f: 880, dur: 0.18, v: 0.09, type: 'square' }); osc({ f: 660, dur: 0.18, v: 0.09, type: 'square', delay: 0.22 }); },
    boom() { burst({ dur: 3, type: 'lowpass', freq: 600, f2: 60, v: 1, att: 0.005 }); osc({ f: 60, f2: 22, dur: 2, v: 1 }); burst({ dur: 1.5, type: 'highpass', freq: 1500, v: 0.2, delay: 0.05 }); },
    hiss(pan) { burst({ dur: 0.9, type: 'highpass', freq: 3000, v: 0.12, pan, att: 0.15 }); burst({ dur: 0.7, type: 'bandpass', freq: 220, q: 2, v: 0.12, pan, delay: 0.1 }); },
    chomp(pan) { osc({ f: 140, f2: 60, dur: 0.18, v: 0.6, pan }); burst({ dur: 0.08, type: 'highpass', freq: 1800, v: 0.4, pan }); burst({ dur: 0.5, type: 'bandpass', freq: 700, q: 0.8, v: 0.35, pan, delay: 0.05 }); },
    bell(pan) { [220, 330, 523].forEach((f, i) => osc({ f, dur: 4, v: 0.05 / (i + 1), pan, type: 'sine' })); osc({ f: 233, dur: 3.5, v: 0.02, pan }); },
    bullfrog(pan) { for (let i = 0; i < 2; i++) osc({ f: 62, f2: 52, type: 'sawtooth', dur: 0.5, v: 0.12, pan, delay: i * 0.7, att: 0.05, vib: 6, vibF: 18 }); },
    buzz(pan) { osc({ f: 230, type: 'sawtooth', dur: 2.2, v: 0.025, pan, att: 0.6, vib: 14, vibF: 9 }); burst({ dur: 2, type: 'bandpass', freq: 5200, q: 6, v: 0.04, pan, att: 0.5 }); },
    plop(pan) { osc({ f: 900, f2: 300, dur: 0.12, v: 0.08, pan }); burst({ dur: 0.25, type: 'bandpass', freq: 1200, q: 1, v: 0.12, pan, delay: 0.03 }); },
    frog(pan) { const n = 2 + Math.floor(Math.random() * 3), f0 = 95 + Math.random() * 40; for (let i = 0; i < n; i++) osc({ f: f0, f2: f0 * 0.8, type: 'sawtooth', dur: 0.22, v: 0.05, pan, delay: i * 0.32, att: 0.02, vib: 25, vibF: 32 }); },
    owl(pan) { [0, 0.45, 0.62].forEach((d, i) => osc({ f: 410 - i * 25, f2: 370 - i * 25, dur: i ? 0.22 : 0.38, v: 0.06, pan, delay: d, att: 0.04 })); },
    howl(pan) { osc({ f: 380, f2: 720, dur: 1.4, v: 0.06, pan, att: 0.3, vib: 8, vibF: 5 }); osc({ f: 720, f2: 480, dur: 1.6, v: 0.05, pan, delay: 1.3, att: 0.1, vib: 10, vibF: 5 }); },
    creak(pan) { if (!AC) return; const t = AC.currentTime; const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(70, t); o.frequency.linearRampToValueAtTime(95, t + 1.2); const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 12; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(1100, t + 1.2); const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3); o.connect(f); f.connect(g); g.connect(out(pan)); o.start(t); o.stop(t + 1.4); },
    cricket() { if (!AC) return; const f = 4200 + Math.random() * 900, pan = Math.random() * 2 - 1; for (let i = 0; i < 3; i++) osc({ f, dur: 0.05, v: 0.018, pan, delay: i * 0.07, dest: null }); },
    whisper(pan) { for (let i = 0; i < 7; i++) burst({ dur: 0.2, type: 'bandpass', freq: 2200 + Math.random() * 2800, q: 7, v: 0.07, pan, delay: i * 0.15 }); },
    clink() { osc({ f: 880, dur: 0.25, v: 0.12 }); osc({ f: 1320, dur: 0.18, v: 0.08, delay: 0.03 }); },
    pickup() { osc({ f: 520, dur: 0.12, v: 0.1, type: 'triangle' }); osc({ f: 780, dur: 0.18, v: 0.1, type: 'triangle', delay: 0.07 }); },
    pour() { for (let i = 0; i < 11; i++) burst({ dur: 0.15, type: 'bandpass', freq: 280 + Math.random() * 520, q: 4, v: 0.17, delay: i * 0.13 }); },
    sputter() { for (let i = 0; i < 9; i++) burst({ dur: 0.12, freq: 220, v: 0.45, delay: i * 0.17 + Math.random() * 0.05 }); },
    door() { [0, 0.2, 0.4].forEach(d => { osc({ f: 130, f2: 90, type: 'square', dur: 0.1, v: 0.12, delay: d }); burst({ dur: 0.08, type: 'highpass', freq: 2000, v: 0.12, delay: d }); }); },
    unlock() { osc({ f: 1500, dur: 0.05, v: 0.12, type: 'square' }); osc({ f: 900, dur: 0.08, v: 0.12, type: 'square', delay: 0.12 }); burst({ dur: 0.3, freq: 600, v: 0.15, delay: 0.25 }); },
    obj() { osc({ f: 196, dur: 1.4, v: 0.07, type: 'triangle' }); osc({ f: 293, dur: 1.3, v: 0.05, type: 'triangle', delay: 0.12 }); },
    heart(v) { osc({ f: 58, f2: 40, dur: 0.16, v: 0.55 * v }); osc({ f: 52, f2: 38, dur: 0.18, v: 0.38 * v, delay: 0.22 }); },
    stinger() { [1046, 1108, 1174, 1244, 1318].forEach(f => osc({ f, f2: f * 0.96, type: 'sawtooth', dur: 2.4, v: 0.045, att: 0.02, vib: 12, vibF: 7 })); osc({ f: 46, f2: 28, dur: 2.2, v: 0.75 }); burst({ dur: 1.4, type: 'highpass', freq: 3200, v: 0.14, att: 0.01 }); },
    shriek() { scream(0.45, 0.7, 380); },
    scream() { scream(1, 1.9, 300); },
    growl(pan, v = 1) { if (!AC) return; const t = AC.currentTime; const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(85, t); o.frequency.linearRampToValueAtTime(70, t + 1); const am = AC.createGain(); am.gain.value = 0.5; const l = AC.createOscillator(); l.frequency.value = 23; const lg = AC.createGain(); lg.gain.value = 0.5; l.connect(lg); lg.connect(am.gain); const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 1.5; const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.22 * v, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1); o.connect(am); am.connect(f); f.connect(g); g.connect(out(pan)); o.start(t); l.start(t); o.stop(t + 1.2); l.stop(t + 1.2); },
    bite(pan) { burst({ dur: 0.12, type: 'bandpass', freq: 900, q: 1, v: 0.4, pan }); osc({ f: 260, f2: 120, type: 'sawtooth', dur: 0.25, v: 0.15, pan }); },
    yelp(pan) { osc({ f: 1100, f2: 500, type: 'triangle', dur: 0.35, v: 0.16, pan }); },
    bleat(pan) { osc({ f: 620, f2: 420, type: 'sawtooth', dur: 0.4, v: 0.05, pan, vib: 30, vibF: 18 }); },
    hurt() { burst({ dur: 0.25, type: 'bandpass', freq: 500, q: 1, v: 0.35 }); osc({ f: 210, f2: 140, type: 'triangle', dur: 0.3, v: 0.18 }); },
    splat(pan) { burst({ dur: 0.18, type: 'lowpass', freq: 600, f2: 120, v: 0.35, pan }); },
    pistol() { burst({ dur: 0.09, type: 'highpass', freq: 1200, v: 0.7, att: 0.001 }); burst({ dur: 0.5, type: 'lowpass', freq: 1800, f2: 200, v: 0.55, att: 0.001 }); osc({ f: 140, f2: 45, dur: 0.22, v: 0.8 }); burst({ dur: 1.2, type: 'lowpass', freq: 500, v: 0.08, delay: 0.1, att: 0.05 }); },
    shotgun() { burst({ dur: 0.14, type: 'highpass', freq: 800, v: 0.9, att: 0.001 }); burst({ dur: 0.8, type: 'lowpass', freq: 1400, f2: 120, v: 0.85, att: 0.001 }); osc({ f: 100, f2: 32, dur: 0.35, v: 1 }); burst({ dur: 1.6, type: 'lowpass', freq: 400, v: 0.12, delay: 0.12, att: 0.08 }); burst({ dur: 0.1, type: 'bandpass', freq: 1500, q: 4, v: 0.18, delay: 0.55 }); burst({ dur: 0.1, type: 'bandpass', freq: 1100, q: 4, v: 0.18, delay: 0.7 }); },
    dry() { burst({ dur: 0.03, type: 'highpass', freq: 3000, v: 0.2 }); },
    reload() { burst({ dur: 0.05, type: 'bandpass', freq: 2200, q: 5, v: 0.2 }); burst({ dur: 0.06, type: 'bandpass', freq: 1500, q: 5, v: 0.22, delay: 0.45 }); burst({ dur: 0.05, type: 'bandpass', freq: 2600, q: 6, v: 0.25, delay: 0.85 }); },
    flare() { burst({ dur: 0.5, type: 'highpass', freq: 2500, v: 0.6 }); osc({ f: 120, f2: 40, dur: 0.3, v: 0.6 }); burst({ dur: 3.2, type: 'bandpass', freq: 900, q: 0.5, v: 0.22, att: 0.08 }); },
    gate() { if (!AC) return; const t = AC.currentTime; const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.linearRampToValueAtTime(260, t + 1.4); const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 9; f.frequency.setValueAtTime(900, t); f.frequency.linearRampToValueAtTime(1600, t + 1.4); const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.1); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5); o.connect(f); f.connect(g); g.connect(MG); o.start(t); o.stop(t + 1.6); },
    clang() { osc({ f: 320, dur: 1.2, v: 0.2, type: 'triangle' }); osc({ f: 471, dur: 1, v: 0.12, type: 'triangle' }); burst({ dur: 0.2, type: 'highpass', freq: 1800, v: 0.3 }); },
    rung() { osc({ f: 160 + Math.random() * 40, dur: 0.1, v: 0.1, type: 'triangle' }); burst({ dur: 0.06, type: 'bandpass', freq: 700, q: 2, v: 0.1 }); },
    thud() { osc({ f: 90, f2: 40, dur: 0.4, v: 0.6 }); burst({ dur: 0.3, freq: 300, v: 0.3 }); },
    radioBlip() { osc({ f: 1200, dur: 0.06, v: 0.06, type: 'square' }); burst({ dur: 0.25, type: 'bandpass', freq: 2500, q: 0.7, v: 0.15, delay: 0.05 }); },
    hollowScream(v = 1) { if (!AC) return; const t = AC.currentTime; const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(140, t); o.frequency.linearRampToValueAtTime(260, t + 0.3); o.frequency.exponentialRampToValueAtTime(70, t + 2); const ws = shaper(6), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400; const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.45 * v, t + 0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1); o.connect(ws); ws.connect(lp); lp.connect(g); g.connect(MG); o.start(t); o.stop(t + 2.2); burst({ dur: 1.8, type: 'bandpass', freq: 1800, f2: 500, q: 1, v: 0.5 * v, att: 0.05 }); scream(0.5 * v, 1.6, 420); },
    mireRoar(v = 1) { if (!AC) return; const t = AC.currentTime; const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(65, t); o.frequency.linearRampToValueAtTime(115, t + 0.4); o.frequency.exponentialRampToValueAtTime(48, t + 2.4); const ws = shaper(7), lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const gur = AC.createGain(); gur.gain.value = 0.6; const am = AC.createOscillator(), amg = AC.createGain(); am.frequency.value = 23; amg.gain.value = 0.4; am.connect(amg); amg.connect(gur.gain); const g = AC.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.6 * v, t + 0.12); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4); o.connect(ws); ws.connect(lp); lp.connect(gur); gur.connect(g); g.connect(MG); o.start(t); am.start(t); o.stop(t + 2.6); am.stop(t + 2.6); burst({ dur: 2.2, type: 'bandpass', freq: 700, f2: 250, v: 0.45 * v, att: 0.08 }); },
    rip() { burst({ dur: 0.9, type: 'bandpass', freq: 900, f2: 300, q: 0.7, v: 0.7, att: 0.01 }); burst({ dur: 0.5, type: 'highpass', freq: 2500, v: 0.25, delay: 0.05 }); for (let i = 0; i < 6; i++) burst({ dur: 0.05, type: 'highpass', freq: 1800, v: 0.35, delay: 0.05 + i * 0.07 + Math.random() * 0.04 }); osc({ f: 110, f2: 50, dur: 0.4, v: 0.5 }); },
    crunch(pan = 0) { for (let i = 0; i < 4; i++) burst({ dur: 0.06, type: 'bandpass', freq: 1400 + Math.random() * 1200, q: 2, v: 0.45, pan, delay: i * 0.045 }); burst({ dur: 0.25, type: 'lowpass', freq: 500, f2: 150, v: 0.4, pan }); },
    gore() { burst({ dur: 0.8, type: 'lowpass', freq: 1200, f2: 120, v: 1, att: 0.003 }); osc({ f: 80, f2: 30, dur: 0.6, v: 0.9 }); for (let i = 0; i < 10; i++) burst({ dur: 0.12, type: 'lowpass', freq: 700, f2: 150, v: 0.3, delay: 0.3 + Math.random() * 1.3, pan: Math.random() * 2 - 1 }); burst({ dur: 0.15, type: 'highpass', freq: 3000, v: 0.5 }); },
    quake() { burst({ dur: 2.6, type: 'lowpass', freq: 300, f2: 40, v: 1, att: 0.004 }); osc({ f: 45, f2: 18, dur: 2.2, v: 1 }); burst({ dur: 1.2, type: 'bandpass', freq: 900, f2: 200, v: 0.35, delay: 0.03 }); },
    stomp(v = 1, pan = 0) { osc({ f: 70, f2: 30, dur: 0.3, v: 0.7 * v, pan }); burst({ dur: 0.25, type: 'lowpass', freq: 350, v: 0.5 * v, pan }); },
    bubble(pan = 0) { osc({ f: 200 + Math.random() * 150, f2: 700 + Math.random() * 300, dur: 0.08, v: 0.12, pan }); },
    giggle(n = 7, v = 0.2) { if (!AC) return; const t0 = AC.currentTime; for (let i = 0; i < n; i++) { const s = t0 + i * (0.09 + Math.random() * 0.05), f = 560 + Math.random() * 200; const o = AC.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, s); o.frequency.exponentialRampToValueAtTime(f * 0.7, s + 0.09); const ws = shaper(3), bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1300; bp.Q.value = 1.5; const g = AC.createGain(); g.gain.setValueAtTime(0, s); g.gain.linearRampToValueAtTime(v * (1 - i / n * 0.5), s + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.11); o.connect(ws); ws.connect(bp); bp.connect(g); g.connect(MG); o.start(s); o.stop(s + 0.15); } },
    ui() { osc({ f: 330, dur: 0.12, v: 0.06, type: 'triangle' }); },
    thunder() { burst({ dur: 3.5, type: 'lowpass', freq: 220, v: 0.5, att: 0.05 }); osc({ f: 50, f2: 30, dur: 2.5, v: 0.3 }); }
  };
  return S;
})();
