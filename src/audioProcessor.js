// Synthetic convolution reverb impulse response
function generateImpulseResponse(ctx, duration, decay, roomSize) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * duration);
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const env = Math.pow(Math.max(0, 1 - t / duration), decay);
      // Slight L/R difference for stereo width
      d[i] = (Math.random() * 2 - 1) * env * roomSize * (ch === 0 ? 1.0 : 0.97);
    }
  }
  return buf;
}

// Soft-clip saturation curve (tube warmth)
function makeSatCurve(amount) {
  const n = 256;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = ((1 + amount) * x) / (1 + amount * Math.abs(x));
  }
  return curve;
}

// PCM float to 16-bit WAV
function encodeWAV(buf) {
  const ch = buf.numberOfChannels;
  const sr = buf.sampleRate;
  const len = buf.length;
  const ab = new ArrayBuffer(44 + len * ch * 2);
  const v = new DataView(ab);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, 'RIFF'); v.setUint32(4, 36 + len * ch * 2, true);
  ws(8, 'WAVE'); ws(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true);
  v.setUint16(22, ch, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true);
  v.setUint16(34, 16, true); ws(36, 'data');
  v.setUint32(40, len * ch * 2, true);
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, buf.getChannelData(c)[i]));
      v.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      off += 2;
    }
  }
  return ab;
}

const PRESETS = {
  cinematic: {
    eq: { subFreq:50, subGain:4, lowFreq:100, lowGain:8, midFreq:350, midGain:-3, presFreq:3000, presGain:2.5, highFreq:8000, highGain:3 },
    comp: { threshold:-20, ratio:4, knee:8, attack:0.005, release:0.2 },
    sat: 0.18,
    rev: { dur:4.0, decay:2.0, room:0.9, wet:0.38, pre:0.025 },
    dly: { time:0, fb:0, wet:0 },
    gain: 1.2,
  },
  rich: {
    eq: { subFreq:60, subGain:7, lowFreq:100, lowGain:10, midFreq:400, midGain:-4, presFreq:2500, presGain:3, highFreq:10000, highGain:2 },
    comp: { threshold:-24, ratio:6, knee:6, attack:0.003, release:0.15 },
    sat: 0.3,
    rev: { dur:1.8, decay:2.8, room:0.6, wet:0.2, pre:0.015 },
    dly: { time:0, fb:0, wet:0 },
    gain: 1.35,
  },
  dolby: {
    eq: { subFreq:40, subGain:3, lowFreq:80, lowGain:6, midFreq:300, midGain:-2, presFreq:3500, presGain:4, highFreq:12000, highGain:5 },
    comp: { threshold:-18, ratio:3, knee:12, attack:0.008, release:0.25 },
    sat: 0.08,
    rev: { dur:5.5, decay:1.8, room:1.0, wet:0.48, pre:0.03 },
    dly: { time:0.08, fb:0.25, wet:0.1 },
    gain: 1.25,
  },
  auto: {
    eq: { subFreq:55, subGain:3, lowFreq:90, lowGain:5, midFreq:380, midGain:-2, presFreq:3000, presGain:2, highFreq:9000, highGain:2.5 },
    comp: { threshold:-18, ratio:4, knee:10, attack:0.006, release:0.2 },
    sat: 0.12,
    rev: { dur:2.5, decay:2.2, room:0.7, wet:0.28, pre:0.02 },
    dly: { time:0, fb:0, wet:0 },
    gain: 1.15,
  },
};

function parsePrompt(text) {
  const s = JSON.parse(JSON.stringify(PRESETS.auto));
  const t = text.toLowerCase();

  // Reverb
  if (/cathedral|church|huge room|massive/.test(t)) { s.rev.dur=6; s.rev.wet=0.52; s.rev.room=1.0; }
  else if (/long reverb|hall|epic reverb|concert/.test(t)) { s.rev.dur=4; s.rev.wet=0.42; s.rev.room=0.9; }
  else if (/reverb|space|ambient/.test(t)) { s.rev.dur=3; s.rev.wet=0.35; s.rev.room=0.8; }
  else if (/room|small reverb/.test(t)) { s.rev.dur=1.2; s.rev.wet=0.22; s.rev.room=0.5; }
  if (/no reverb|dry/.test(t)) { s.rev.wet=0; }

  // Echo/Delay
  if (/slapback/.test(t)) { s.dly={time:0.07, fb:0.18, wet:0.22}; }
  else if (/echo|delay/.test(t)) { s.dly={time:0.3, fb:0.42, wet:0.28}; }

  // Bass
  if (/sub bass|sub-bass|subwoofer/.test(t)) { s.eq.subGain+=7; s.eq.lowGain+=4; }
  else if (/bass|deep|heavy|masculine|low end|thick/.test(t)) { s.eq.subGain+=4; s.eq.lowGain+=6; }

  // Treble/Highs
  if (/crisp|sparkle|air|airy|brilliant/.test(t)) { s.eq.highGain+=5; s.eq.presGain+=3; }
  else if (/bright|clear|treble|sharp/.test(t)) { s.eq.highGain+=3; s.eq.presGain+=2; }

  // Saturation/warmth
  if (/very warm|tube|tape saturate|overdriven/.test(t)) { s.sat=0.45; }
  else if (/warm|analog|vintage|saturate|harmonic/.test(t)) { s.sat=0.3; }

  // Cinematic
  if (/cinematic|movie|film|epic|dramatic/.test(t)) {
    s.rev.dur = Math.max(s.rev.dur, 4.0);
    s.rev.wet = Math.max(s.rev.wet, 0.38);
    s.eq.lowGain = Math.max(s.eq.lowGain, 8);
  }

  // Compression
  if (/heavy compress|squash/.test(t)) { s.comp.ratio=10; s.comp.threshold=-28; }
  else if (/compress|punchy|tight/.test(t)) { s.comp.ratio=6; s.comp.threshold=-22; }

  // Masculine/broadcast
  if (/masculine|broadcast|radio|manly/.test(t)) {
    s.eq.subGain+=3; s.eq.lowGain+=5; s.eq.midGain-=1;
    s.comp.ratio=5; s.sat=Math.max(s.sat, 0.22);
  }

  return s;
}

export async function processAudio(file, preset, prompt = '') {
  const ab = await file.arrayBuffer();
  const tmpCtx = new AudioContext();
  let src;
  try { src = await tmpCtx.decodeAudioData(ab.slice(0)); }
  finally { await tmpCtx.close(); }

  const cfg = preset === 'custom' ? parsePrompt(prompt) : (PRESETS[preset] || PRESETS.auto);
  const SR = 44100;
  const outLen = Math.floor((src.duration + cfg.rev.dur * 1.5) * SR);
  const oc = new OfflineAudioContext(2, outLen, SR);

  const source = oc.createBufferSource();
  source.buffer = src;
  let n = source;

  const connect = (node) => { n.connect(node); n = node; return node; };

  // EQ chain
  const sub = connect(oc.createBiquadFilter());
  sub.type = 'peaking'; sub.frequency.value = cfg.eq.subFreq; sub.Q.value = 0.6; sub.gain.value = cfg.eq.subGain;

  const ls = connect(oc.createBiquadFilter());
  ls.type = 'lowshelf'; ls.frequency.value = cfg.eq.lowFreq; ls.gain.value = cfg.eq.lowGain;

  const hp = connect(oc.createBiquadFilter());
  hp.type = 'highpass'; hp.frequency.value = 20; hp.Q.value = 0.5;

  const mid = connect(oc.createBiquadFilter());
  mid.type = 'peaking'; mid.frequency.value = cfg.eq.midFreq; mid.Q.value = 1.2; mid.gain.value = cfg.eq.midGain;

  const pres = connect(oc.createBiquadFilter());
  pres.type = 'peaking'; pres.frequency.value = cfg.eq.presFreq; pres.Q.value = 1.0; pres.gain.value = cfg.eq.presGain;

  const hs = connect(oc.createBiquadFilter());
  hs.type = 'highshelf'; hs.frequency.value = cfg.eq.highFreq; hs.gain.value = cfg.eq.highGain;

  const lp = connect(oc.createBiquadFilter());
  lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = 0.5;

  // Compressor
  const comp = connect(oc.createDynamicsCompressor());
  comp.threshold.value = cfg.comp.threshold; comp.ratio.value = cfg.comp.ratio;
  comp.knee.value = cfg.comp.knee; comp.attack.value = cfg.comp.attack; comp.release.value = cfg.comp.release;

  // Saturation
  if (cfg.sat > 0) {
    const ws = connect(oc.createWaveShaper());
    ws.curve = makeSatCurve(cfg.sat); ws.oversample = '4x';
    const sg = connect(oc.createGain()); sg.gain.value = 0.85;
  }

  // Reverb (parallel wet/dry)
  const pd = oc.createDelay(0.1); pd.delayTime.value = cfg.rev.pre;
  const conv = oc.createConvolver();
  conv.buffer = generateImpulseResponse(oc, cfg.rev.dur, cfg.rev.decay, cfg.rev.room);
  const dryG = oc.createGain(); dryG.gain.value = 1 - cfg.rev.wet;
  const wetG = oc.createGain(); wetG.gain.value = cfg.rev.wet;
  const revMix = oc.createGain();
  n.connect(dryG); n.connect(pd); pd.connect(conv); conv.connect(wetG);
  dryG.connect(revMix); wetG.connect(revMix);
  n = revMix;

  // Delay/Echo (optional parallel)
  if (cfg.dly && cfg.dly.wet > 0) {
    const dly = oc.createDelay(5.0); dly.delayTime.value = cfg.dly.time;
    const fb = oc.createGain(); fb.gain.value = cfg.dly.fb;
    const dlpf = oc.createBiquadFilter(); dlpf.type = 'lowpass'; dlpf.frequency.value = 5000;
    const dlyW = oc.createGain(); dlyW.gain.value = cfg.dly.wet;
    const dlyD = oc.createGain(); dlyD.gain.value = 1 - cfg.dly.wet;
    const dlyMix = oc.createGain();
    n.connect(dlyD); n.connect(dly); dly.connect(dlpf); dlpf.connect(fb); fb.connect(dly); dly.connect(dlyW);
    dlyD.connect(dlyMix); dlyW.connect(dlyMix);
    n = dlyMix;
  }

  // Limiter + master gain
  const lim = connect(oc.createDynamicsCompressor());
  lim.threshold.value = -1; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.05;
  const mg = connect(oc.createGain()); mg.gain.value = cfg.gain;
  n.connect(oc.destination);

  source.start(0);
  const rendered = await oc.startRendering();
  return new Blob([encodeWAV(rendered)], { type: 'audio/wav' });
}
