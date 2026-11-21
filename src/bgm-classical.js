// =============================================================================
// src/bgm-classical.js - Dual 3-Minute (180s) Classical Orchestral BGM
// Mode 1 ("peace"): 96 BPM 4-Movement Pastoral Fantasy Symphony (180s)
// Mode 2 ("battle"): 128 BPM Dramatic Minor Classical Battle Symphony (180s)
// =============================================================================

(function () {
  "use strict";

  const MASTER_VOL = 0.50; // 2x louder master volume

  function m2f(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // 1) Peace Mode: 96 BPM (1 beat = 0.625s, 72 bars * 4 beats = 180.0s)
  const PEACE_BEAT = 0.625;
  const PEACE_BARS = 72;
  const PEACE_MOVEMENTS = [
    [
      [48, 60, 64, 67], [55, 59, 62, 67], [57, 60, 64, 69], [52, 59, 64, 67],
      [53, 60, 65, 69], [48, 60, 64, 67], [50, 62, 65, 69], [55, 59, 62, 67],
      [48, 60, 64, 67], [55, 59, 62, 67], [57, 60, 64, 69], [52, 59, 64, 67],
      [53, 60, 65, 69], [55, 60, 64, 67], [50, 57, 62, 66], [55, 59, 62, 67],
      [53, 60, 65, 69], [55, 59, 62, 67],
    ],
    [
      [45, 57, 60, 64], [52, 56, 59, 64], [53, 57, 60, 65], [48, 55, 60, 64],
      [50, 57, 62, 65], [45, 57, 60, 64], [52, 56, 59, 64], [45, 57, 60, 64],
      [50, 57, 62, 65], [55, 59, 62, 67], [48, 60, 64, 67], [53, 57, 60, 65],
      [50, 57, 62, 65], [52, 56, 59, 64], [45, 57, 60, 64], [50, 57, 62, 65],
      [52, 56, 59, 64], [45, 57, 60, 64],
    ],
    [
      [53, 60, 65, 69], [48, 60, 64, 67], [50, 58, 62, 65], [53, 60, 65, 69],
      [55, 60, 64, 67], [57, 60, 64, 69], [58, 62, 65, 70], [48, 60, 64, 67],
      [53, 60, 65, 69], [48, 60, 64, 67], [50, 57, 62, 65], [57, 60, 64, 69],
      [58, 62, 65, 70], [53, 60, 65, 69], [55, 60, 64, 67], [48, 60, 64, 67],
      [53, 60, 65, 69], [55, 59, 62, 67],
    ],
    [
      [48, 60, 64, 67], [55, 59, 62, 67], [57, 60, 64, 69], [53, 60, 65, 69],
      [48, 60, 64, 67], [50, 57, 62, 65], [55, 59, 62, 67], [48, 60, 64, 67],
      [53, 60, 65, 69], [55, 59, 62, 67], [52, 59, 64, 67], [57, 60, 64, 69],
      [50, 57, 62, 66], [55, 59, 62, 67], [53, 60, 65, 69], [55, 59, 62, 67],
      [48, 60, 64, 67], [48, 60, 64, 72],
    ],
  ];

  // 2) Battle Mode: 128 BPM (1 beat = 0.46875s, 96 bars * 4 beats = 180.0s)
  // D minor -> G minor -> Bb major -> Heroic A7->Dm Finale
  const BATTLE_BEAT = 0.46875;
  const BATTLE_BARS = 96;
  const BATTLE_MOVEMENTS = [
    [
      [38, 50, 53, 57], [38, 50, 53, 57], [46, 53, 58, 62], [45, 52, 57, 61],
      [43, 55, 58, 62], [38, 50, 53, 57], [40, 52, 55, 58], [45, 52, 57, 61],
      [38, 50, 53, 57], [41, 53, 57, 60], [43, 55, 58, 62], [45, 52, 57, 61],
      [46, 53, 58, 62], [43, 55, 58, 62], [45, 52, 57, 61], [38, 50, 53, 57],
    ],
    [
      [43, 55, 58, 62], [48, 55, 60, 63], [41, 53, 57, 60], [46, 53, 58, 62],
      [39, 51, 55, 58], [43, 55, 58, 62], [45, 52, 57, 61], [38, 50, 53, 57],
      [43, 55, 58, 62], [48, 55, 60, 63], [41, 53, 57, 60], [46, 53, 58, 62],
      [40, 52, 55, 58], [45, 52, 57, 61], [38, 50, 53, 57], [45, 52, 57, 61],
    ],
    [
      [46, 53, 58, 62], [41, 53, 57, 60], [43, 55, 58, 62], [38, 50, 53, 57],
      [48, 55, 60, 63], [41, 53, 57, 60], [46, 53, 58, 62], [45, 52, 57, 61],
      [38, 50, 53, 57], [46, 53, 58, 62], [43, 55, 58, 62], [45, 52, 57, 61],
      [38, 50, 53, 57], [45, 52, 57, 61], [38, 50, 53, 57], [38, 50, 57, 62],
    ],
  ];

  const MELODY_PATTERNS = [
    [12, 16, 19, 16, 14, 12, 11, 12],
    [19, 17, 16, 14, 12, 14, 16, 12],
    [12, 14, 16, 19, 21, 19, 16, 14],
    [24, 21, 19, 16, 17, 16, 14, 12],
  ];

  const BATTLE_MELODIES = [
    [12, 12, 15, 14, 12, 10, 12, 19],
    [19, 15, 14, 12, 15, 14, 11, 12],
    [24, 22, 19, 17, 15, 17, 19, 24],
  ];

  let ctx = null;
  let masterGain = null;
  let reverbNode = null;
  let isPlaying = false;
  let isMuted = false;
  let currentMode = "peace"; // "peace" | "battle"
  let nextBarTime = 0;
  let currentBar = 0;
  let timerId = null;

  function ensureContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    masterGain = ctx.createGain();
    masterGain.gain.value = isMuted ? 0 : MASTER_VOL;
    masterGain.connect(ctx.destination);

    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.25;
    const fb = ctx.createGain();
    fb.gain.value = 0.26;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1900;

    delay.connect(filter);
    filter.connect(fb);
    fb.connect(delay);
    filter.connect(masterGain);
    reverbNode = delay;
    return ctx;
  }

  function playVoice(freq, startTime, dur, type, gainPeak, attack = 0.025, sendReverb = 0.35, lowpassHz = 0) {
    if (!ctx || !masterGain) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(gainPeak, startTime + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    if (lowpassHz > 0) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = lowpassHz;
      osc.connect(lp);
      lp.connect(g);
    } else {
      osc.connect(g);
    }

    g.connect(masterGain);
    if (reverbNode && sendReverb > 0) {
      const rg = ctx.createGain();
      rg.gain.value = sendReverb;
      g.connect(rg);
      rg.connect(reverbNode);
    }
    osc.start(startTime);
    osc.stop(startTime + dur + 0.05);
  }

  function schedulePeaceBar(barIdx, t0) {
    const movIdx = Math.floor(barIdx / 18) % 4;
    const barInMov = barIdx % 18;
    const chord = PEACE_MOVEMENTS[movIdx][barInMov];
    const barDur = PEACE_BEAT * 4;

    playVoice(m2f(chord[0]), t0, barDur * 0.96, "triangle", 0.22, 0.16, 0.25);
    playVoice(m2f(chord[1]), t0, barDur * 0.96, "sine", 0.13, 0.20, 0.35);

    const arpOrder = [0, 1, 2, 3, 2, 1, 2, 3];
    for (let i = 0; i < 8; i++) {
      const nt = chord[arpOrder[i]];
      playVoice(m2f(nt + 12), t0 + i * (PEACE_BEAT * 0.5), PEACE_BEAT * 0.65, "sine", 0.12, 0.015, 0.45);
    }

    const pat = MELODY_PATTERNS[(movIdx + Math.floor(barInMov / 2)) % MELODY_PATTERNS.length];
    const leadType = movIdx === 1 || movIdx === 2 ? "sine" : "triangle";
    const stepCount = movIdx === 2 ? 8 : 4;
    const stepDur = barDur / stepCount;
    for (let i = 0; i < stepCount; i++) {
      if (barInMov % 4 === 3 && i === stepCount - 1) continue;
      const semitone = pat[(i + barInMov) % pat.length];
      const freq = m2f(chord[0] + 12 + (semitone % 12));
      playVoice(freq, t0 + i * stepDur, stepDur * 1.15, leadType, movIdx === 3 ? 0.17 : 0.13, 0.035, 0.5);
    }
  }

  function scheduleBattleBar(barIdx, t0) {
    const movIdx = Math.floor(barIdx / 16) % BATTLE_MOVEMENTS.length;
    const barInMov = barIdx % 16;
    const chord = BATTLE_MOVEMENTS[movIdx][barInMov];
    const barDur = BATTLE_BEAT * 4;

    // 1. Driving Staccato String Bass (8 eighth-notes)
    for (let i = 0; i < 8; i++) {
      const accent = i % 2 === 0 ? 0.24 : 0.14;
      playVoice(m2f(chord[0]), t0 + i * (BATTLE_BEAT * 0.5), BATTLE_BEAT * 0.42, "sawtooth", accent, 0.01, 0.15, 650);
    }

    // 2. Urgent Harpsichord / Strings Arpeggio (8 eighth-notes)
    const arpOrder = [1, 2, 3, 2, 1, 2, 3, 2];
    for (let i = 0; i < 8; i++) {
      playVoice(m2f(chord[arpOrder[i]] + 12), t0 + i * (BATTLE_BEAT * 0.5), BATTLE_BEAT * 0.45, "triangle", 0.14, 0.01, 0.35);
    }

    // 3. Heroic Brass/Violin Lead Melody
    const pat = BATTLE_MELODIES[(movIdx + Math.floor(barInMov / 2)) % BATTLE_MELODIES.length];
    for (let i = 0; i < 4; i++) {
      const nt = chord[0] + 24 + (pat[(i + barInMov) % pat.length] % 12);
      playVoice(m2f(nt), t0 + i * BATTLE_BEAT, BATTLE_BEAT * 0.88, "sawtooth", 0.16, 0.02, 0.45, 2200);
    }
  }

  function scheduler() {
    if (!isPlaying || !ctx) return;
    const beat = currentMode === "battle" ? BATTLE_BEAT : PEACE_BEAT;
    const totalBars = currentMode === "battle" ? BATTLE_BARS : PEACE_BARS;
    while (nextBarTime < ctx.currentTime + 1.0) {
      if (currentMode === "battle") scheduleBattleBar(currentBar, nextBarTime);
      else schedulePeaceBar(currentBar, nextBarTime);
      nextBarTime += beat * 4;
      currentBar = (currentBar + 1) % totalBars;
    }
  }

  function setMode(mode) {
    const next = mode === "battle" ? "battle" : "peace";
    if (currentMode === next) return;
    currentMode = next;
    currentBar = 0;
    if (ctx && isPlaying) {
      nextBarTime = ctx.currentTime + 0.05;
      scheduler();
    }
  }

  function start() {
    const c = ensureContext();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    if (isPlaying) return;
    isPlaying = true;
    nextBarTime = c.currentTime + 0.06;
    timerId = setInterval(scheduler, 250);
    scheduler();
  }

  function setMuted(muted) {
    isMuted = !!muted;
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(isMuted ? 0 : MASTER_VOL, ctx.currentTime, 0.05);
    }
  }

  window.ClassicalBGM = { start, setMuted, setMode };
})();
