// =============================================================================
// src/bgm-classical.js - 3-Minute (180s) Multi-Movement Classical Fantasy BGM
// 4 Movements (Sonata-Rondo in C Major / A Minor / F Major / Grand Finale)
// Pure WebAudio Polyphonic Orchestral Synthesizer (Harp, Flute, Celesta, Cello)
// =============================================================================

(function () {
  "use strict";

  // 180 seconds exact loop: 96 BPM -> 1 beat = 0.625s -> 288 beats = 180.0s (72 bars of 4/4)
  const BEAT_SEC = 0.625;
  const TOTAL_BARS = 72; // 72 bars * 4 beats * 0.625s = 180.0 seconds (3:00)

  // Note frequency helper (MIDI -> Hz)
  function m2f(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Chord progressions per 18-bar Movement (4 movements * 18 bars = 72 bars = 3:00)
  // Movement 1 (Bars 0..17): Pastoral Prelude in C Major (Gentle Harp + Flute)
  // Movement 2 (Bars 18..35): Enchanted Alchemy Waltz/Adagio in A Minor (Celesta + Strings)
  // Movement 3 (Bars 36..53): Starlight Scherzo in F Major (Bright Arpeggios + Counter-melody)
  // Movement 4 (Bars 54..71): Royal Golden Finale in C Major -> Cadence
  const MOVEMENTS = [
    // M1: C Major Pastoral (18 bars)
    [
      [48, 60, 64, 67], [55, 59, 62, 67], [57, 60, 64, 69], [52, 59, 64, 67],
      [53, 60, 65, 69], [48, 60, 64, 67], [50, 62, 65, 69], [55, 59, 62, 67],
      [48, 60, 64, 67], [55, 59, 62, 67], [57, 60, 64, 69], [52, 59, 64, 67],
      [53, 60, 65, 69], [55, 60, 64, 67], [50, 57, 62, 66], [55, 59, 62, 67],
      [53, 60, 65, 69], [55, 59, 62, 67],
    ],
    // M2: A Minor Nocturne (18 bars)
    [
      [45, 57, 60, 64], [52, 56, 59, 64], [53, 57, 60, 65], [48, 55, 60, 64],
      [50, 57, 62, 65], [45, 57, 60, 64], [52, 56, 59, 64], [45, 57, 60, 64],
      [50, 57, 62, 65], [55, 59, 62, 67], [48, 60, 64, 67], [53, 57, 60, 65],
      [50, 57, 62, 65], [52, 56, 59, 64], [45, 57, 60, 64], [50, 57, 62, 65],
      [52, 56, 59, 64], [45, 57, 60, 64],
    ],
    // M3: F Major Starlight (18 bars)
    [
      [53, 60, 65, 69], [48, 60, 64, 67], [50, 58, 62, 65], [53, 60, 65, 69],
      [55, 60, 64, 67], [57, 60, 64, 69], [58, 62, 65, 70], [48, 60, 64, 67],
      [53, 60, 65, 69], [48, 60, 64, 67], [50, 57, 62, 65], [57, 60, 64, 69],
      [58, 62, 65, 70], [53, 60, 65, 69], [55, 60, 64, 67], [48, 60, 64, 67],
      [53, 60, 65, 69], [55, 59, 62, 67],
    ],
    // M4: Grand Golden Finale (18 bars)
    [
      [48, 60, 64, 67], [55, 59, 62, 67], [57, 60, 64, 69], [53, 60, 65, 69],
      [48, 60, 64, 67], [50, 57, 62, 65], [55, 59, 62, 67], [48, 60, 64, 67],
      [53, 60, 65, 69], [55, 59, 62, 67], [52, 59, 64, 67], [57, 60, 64, 69],
      [50, 57, 62, 66], [55, 59, 62, 67], [53, 60, 65, 69], [55, 59, 62, 67],
      [48, 60, 64, 67], [48, 60, 64, 72],
    ],
  ];

  // Expressive classical melody motifs (offsets in semitones above chord root/octave)
  const MELODY_PATTERNS = [
    [12, 16, 19, 16, 14, 12, 11, 12],
    [19, 17, 16, 14, 12, 14, 16, 12],
    [12, 14, 16, 19, 21, 19, 16, 14],
    [24, 21, 19, 16, 17, 16, 14, 12],
  ];

  let ctx = null;
  let masterGain = null;
  let reverbNode = null;
  let isPlaying = false;
  let isMuted = false;
  let nextBarTime = 0;
  let currentBar = 0;
  let timerId = null;

  function ensureContext() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();

    masterGain = ctx.createGain();
    masterGain.gain.value = isMuted ? 0 : 0.24;
    masterGain.connect(ctx.destination);

    // Subtle lush delay-reverb bus
    const delay = ctx.createDelay(1.0);
    delay.delayTime.value = 0.28;
    const fb = ctx.createGain();
    fb.gain.value = 0.28;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1800;

    delay.connect(filter);
    filter.connect(fb);
    fb.connect(delay);
    filter.connect(masterGain);
    reverbNode = delay;
    return ctx;
  }

  function playVoice(freq, startTime, dur, type, gainPeak, attack = 0.03, sendReverb = 0.35) {
    if (!ctx || !masterGain) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(gainPeak, startTime + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);

    osc.connect(g);
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

  function scheduleBar(barIdx, t0) {
    const movIdx = Math.floor(barIdx / 18) % 4;
    const barInMov = barIdx % 18;
    const chord = MOVEMENTS[movIdx][barInMov];
    const barDur = BEAT_SEC * 4;

    // 1. Warm Cello / String Pad (root + 5th)
    playVoice(m2f(chord[0]), t0, barDur * 0.96, "triangle", 0.14, 0.18, 0.25);
    playVoice(m2f(chord[1]), t0, barDur * 0.96, "sine", 0.08, 0.22, 0.35);

    // 2. Harp Arpeggio (8 eighth-notes per bar)
    const arpOrder = [0, 1, 2, 3, 2, 1, 2, 3];
    for (let i = 0; i < 8; i++) {
      const nt = chord[arpOrder[i]];
      playVoice(m2f(nt + 12), t0 + i * (BEAT_SEC * 0.5), BEAT_SEC * 0.65, "sine", 0.08, 0.015, 0.45);
    }

    // 3. Lead Flute / Celesta Melody (4 or 8 notes depending on movement)
    const pat = MELODY_PATTERNS[(movIdx + Math.floor(barInMov / 2)) % MELODY_PATTERNS.length];
    const leadType = movIdx === 1 || movIdx === 2 ? "sine" : "triangle";
    const stepCount = movIdx === 2 ? 8 : 4;
    const stepDur = barDur / stepCount;
    for (let i = 0; i < stepCount; i++) {
      // Rest on some beats for natural phrasing
      if (barInMov % 4 === 3 && i === stepCount - 1) continue;
      const semitone = pat[(i + barInMov) % pat.length];
      const freq = m2f(chord[0] + 12 + (semitone % 12));
      playVoice(freq, t0 + i * stepDur, stepDur * 1.15, leadType, movIdx === 3 ? 0.11 : 0.085, 0.04, 0.5);
    }
  }

  function scheduler() {
    if (!isPlaying || !ctx) return;
    while (nextBarTime < ctx.currentTime + 1.2) {
      scheduleBar(currentBar, nextBarTime);
      nextBarTime += BEAT_SEC * 4;
      currentBar = (currentBar + 1) % TOTAL_BARS;
    }
  }

  function start() {
    const c = ensureContext();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    if (isPlaying) return;
    isPlaying = true;
    nextBarTime = c.currentTime + 0.08;
    timerId = setInterval(scheduler, 300);
    scheduler();
  }

  function setMuted(muted) {
    isMuted = !!muted;
    if (masterGain && ctx) {
      masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.24, ctx.currentTime, 0.05);
    }
  }

  window.ClassicalBGM = { start, setMuted };
})();
