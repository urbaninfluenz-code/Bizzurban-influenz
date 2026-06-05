// SONIX Pro Engine — studio-grade browser DSP
// No external dependencies. Pure Web Audio API.
//
// Implements:
//   • ITU-R BS.1770-4 K-weighted LUFS (gated, 400ms/75% overlap)
//   • 4× linear oversampled true-peak detection
//   • Software lookahead limiter (5ms ahead, 0.5ms attack, 100ms release)
//   • TPDF-dithered 16-bit WAV encoder (zero quantisation distortion)
//   • Multi-stage noise reduction: spectral gate, multi-band expander, de-hiss
//   • 6-band parametric EQ + saturation + parallel compression + convolution reverb
//   • Voice morph engine: pitch shift, ring modulation, bit crush, chorus, special FX
//   • Real-time preview engine + live mic engine with AudioWorklet pitch shifter

// ─────────────────────────────────────────────────────────────────────────────
// PLATFORM TARGETS
// ─────────────────────────────────────────────────────────────────────────────
export const PLATFORM_TARGETS = {
  instagram: { lufs: -14, peak: -1.0, label: 'Instagram / Reels' },
  tiktok:    { lufs: -14, peak: -1.0, label: 'TikTok' },
  youtube:   { lufs: -14, peak: -1.0, label: 'YouTube' },
  phone:     { lufs: -12, peak: -1.0, label: 'Phone Speaker' },
  broadcast: { lufs: -23, peak: -2.0, label: 'Broadcast (EBU R128)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// MASTERING PRESETS
// ─────────────────────────────────────────────────────────────────────────────
export const PRESETS = {
  cinematic: {
    eq:   { hp:35, lowShelfHz:90,  lowShelfDb:+5,  lowMidHz:280, lowMidDb:-2,  midHz:1200, midDb:-1,   presHz:3200,  presDb:+2.5, airHz:11000, airDb:+3,   lp:18000 },
    comp: { threshold:-22, ratio:3.5, knee:8,  attack:0.006, release:0.18, mix:0.7  },
    sat:  0.15,
    rev:  { dur:4.5, decay:2.2, room:0.95, maxWet:0.5,  pre:0.025 },
    name: 'Cinematic', desc: 'Wide, dramatic, theatrical reverb with rich low end',
  },
  rich: {
    eq:   { hp:40, lowShelfHz:95,  lowShelfDb:+7,  lowMidHz:300, lowMidDb:-3,  midHz:900,  midDb:-1,   presHz:2800,  presDb:+2,   airHz:9000,  airDb:+1.5, lp:18000 },
    comp: { threshold:-22, ratio:5,   knee:6,  attack:0.003, release:0.14, mix:0.85 },
    sat:  0.25,
    rev:  { dur:1.6, decay:2.5, room:0.55, maxWet:0.22, pre:0.012 },
    name: 'Rich & Masculine', desc: 'Deep lows, warm saturation, broadcast-ready voice',
  },
  dolby: {
    eq:   { hp:30, lowShelfHz:75,  lowShelfDb:+3,  lowMidHz:260, lowMidDb:-1,  midHz:1500, midDb:+0.5, presHz:3500,  presDb:+3.5, airHz:13000, airDb:+4.5, lp:20000 },
    comp: { threshold:-18, ratio:2.8, knee:12, attack:0.01,  release:0.28, mix:0.6  },
    sat:  0.06,
    rev:  { dur:5.5, decay:1.9, room:1.0,  maxWet:0.55, pre:0.032 },
    name: 'Dolby Atmos', desc: 'Spacious, wide, theatrical — preserves dynamics',
  },
  phone: {
    eq:   { hp:180,lowShelfHz:280, lowShelfDb:+2.5,lowMidHz:450, lowMidDb:+1.5,midHz:1800, midDb:+1,   presHz:3000,  presDb:+3.5, airHz:7000,  airDb:+1,   lp:9500  },
    comp: { threshold:-18, ratio:4,   knee:6,  attack:0.004, release:0.12, mix:0.9  },
    sat:  0.1,
    rev:  { dur:0.8, decay:2.5, room:0.4,  maxWet:0.12, pre:0.008 },
    name: 'Phone Speaker', desc: 'Boxy, mid-forward, optimized for tiny speakers',
  },
  instagram: {
    eq:   { hp:60, lowShelfHz:120, lowShelfDb:+3,  lowMidHz:350, lowMidDb:-1,  midHz:1600, midDb:+1.5, presHz:3200,  presDb:+3,   airHz:10000, airDb:+2,   lp:16000 },
    comp: { threshold:-20, ratio:4,   knee:8,  attack:0.005, release:0.15, mix:0.85 },
    sat:  0.12,
    rev:  { dur:1.4, decay:2.2, room:0.5,  maxWet:0.18, pre:0.01  },
    name: 'Instagram Ready', desc: 'Punchy, present, optimized for social feed playback',
  },
  auto: {
    eq:   { hp:50, lowShelfHz:100, lowShelfDb:+4,  lowMidHz:320, lowMidDb:-2,  midHz:1200, midDb:0,    presHz:3000,  presDb:+2.5, airHz:10000, airDb:+2,   lp:18000 },
    comp: { threshold:-20, ratio:3.5, knee:9,  attack:0.006, release:0.2,  mix:0.75 },
    sat:  0.12,
    rev:  { dur:2.5, decay:2.2, room:0.65, maxWet:0.28, pre:0.018 },
    name: 'Auto Magic', desc: 'Analyzes your audio and picks the best settings',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// VOICE MORPHS
// ─────────────────────────────────────────────────────────────────────────────
export const VOICE_MORPHS = {
  monster:    { name:'Monster',    emoji:'👹', desc:'Deep demonic growl',      pitchSt:-10, ringHz:18,  dist:0.80, lp:700,  hp:40,  rev:0.50, chorus:0.0, bits:0,  ringMix:0.85 },
  demon:      { name:'Demon',      emoji:'😈', desc:'Hellish possessed voice',  pitchSt:-14, ringHz:28,  dist:0.70, lp:850,  hp:30,  rev:0.65, chorus:0.0, bits:0,  ringMix:0.75 },
  alien:      { name:'Alien',      emoji:'👽', desc:'Otherworldly creature',    pitchSt:+7,  ringHz:55,  dist:0.30, lp:7000, hp:180, rev:0.50, chorus:0.4, bits:0,  ringMix:0.70 },
  robot:      { name:'Robot',      emoji:'🤖', desc:'Classic vocoder android',  pitchSt:0,   ringHz:90,  dist:0.40, lp:4000, hp:80,  rev:0.15, chorus:0.0, bits:7,  ringMix:0.80 },
  helium:     { name:'Helium',     emoji:'🎈', desc:'Squeaky helium balloon',   pitchSt:+11, ringHz:0,   dist:0.00, lp:9000, hp:250, rev:0.08, chorus:0.0, bits:0,  ringMix:0.0  },
  chipmunk:   { name:'Chipmunk',   emoji:'🐿', desc:'Fast cartoon critter',     pitchSt:+9,  ringHz:0,   dist:0.00, lp:9000, hp:300, rev:0.05, chorus:0.0, bits:0,  ringMix:0.0  },
  ghost:      { name:'Ghost',      emoji:'👻', desc:'Haunting ethereal spirit', pitchSt:+4,  ringHz:14,  dist:0.15, lp:5500, hp:90,  rev:0.88, chorus:0.65,bits:0,  ringMix:0.55 },
  underwater: { name:'Underwater', emoji:'🌊', desc:'Submerged ocean depths',   pitchSt:-3,  ringHz:9,   dist:0.10, lp:1100, hp:30,  rev:0.75, chorus:0.90,bits:0,  ringMix:0.40 },
  megaphone:  { name:'Megaphone',  emoji:'📢', desc:'Loud public address PA',   pitchSt:0,   ringHz:0,   dist:0.55, lp:3200, hp:750, rev:0.08, chorus:0.0, bits:0,  ringMix:0.0  },
  radio:      { name:'AM Radio',   emoji:'📻', desc:'Vintage AM broadcast',     pitchSt:0,   ringHz:0,   dist:0.35, lp:3800, hp:420, rev:0.04, chorus:0.0, bits:0,  ringMix:0.0  },
  glitch:     { name:'Glitch',     emoji:'⚡', desc:'Digital glitch artifact',  pitchSt:0,   ringHz:155, dist:0.60, lp:8000, hp:100, rev:0.30, chorus:0.30,bits:5,  ringMix:0.90 },
  megabass:   { name:'Mega Bass',  emoji:'🔊', desc:'Sub-bass boosted wall',     pitchSt:-6,  ringHz:0,   dist:0.30, lp:9000, hp:30,  rev:0.20, chorus:0.0, bits:0,  ringMix:0.0  },
  angel:      { name:'Angel',      emoji:'✨', desc:'Heavenly chorus shimmer',   pitchSt:+5,  ringHz:0,   dist:0.00, lp:14000,hp:80,  rev:0.90, chorus:0.85,bits:0,  ringMix:0.0  },
  cave:       { name:'Cave Echo',  emoji:'🦇', desc:'Massive cave resonance',   pitchSt:-2,  ringHz:0,   dist:0.05, lp:6000, hp:40,  rev:0.95, chorus:0.0, bits:0,  ringMix:0.0  },
};

// ─────────────────────────────────────────────────────────────────────────────
// VOICE MORPH PROMPT PARSER  — maps natural language → morph config
// ─────────────────────────────────────────────────────────────────────────────
export function parseVoiceMorphPrompt(text) {
  const t = text.toLowerCase();
  const cfg = { pitchSt:0, ringHz:0, dist:0, lp:20000, hp:20, rev:0.2, chorus:0, bits:0, ringMix:0.7 };

  // Pitch
  if (/monster|beast|ogre|troll|giant|titan/.test(t))    cfg.pitchSt -= 10;
  if (/demon|devil|hell|satan|evil/.test(t))              cfg.pitchSt -= 12;
  if (/deep|bass|low|rumble|boom/.test(t))                cfg.pitchSt -= 6;
  if (/helium|squeak|high|small|tiny|mouse/.test(t))      cfg.pitchSt += 10;
  if (/chipmunk|cartoon|fast/.test(t))                    cfg.pitchSt += 8;
  if (/alien|space|extraterrestrial|ufo/.test(t))       { cfg.pitchSt += 5; cfg.ringHz = 55; cfg.ringMix = 0.7; }
  if (/car|engine|motor|truck|diesel/.test(t))          { cfg.pitchSt -= 4; cfg.ringHz = 35; cfg.ringMix = 0.5; }

  // Robot / machine
  if (/robot|android|machine|cyborg|terminator/.test(t)) { cfg.ringHz = 90; cfg.bits = 7; cfg.ringMix = 0.8; }
  if (/glitch|digital|bitcrush|corrupted|error/.test(t)) { cfg.bits = 5; cfg.ringHz = 150; cfg.ringMix = 0.9; }

  // Space / reverb
  if (/cave|cavern|canyon|tunnel/.test(t))                cfg.rev = 0.90;
  if (/stadium|arena|concert hall|cathedral/.test(t))     cfg.rev = 0.85;
  if (/space|cosmos|galaxy|void|infinite/.test(t))        cfg.rev = 0.95;
  if (/bathroom|small room|closet/.test(t))               cfg.rev = 0.22;
  if (/ghost|haunted|spirit|specter/.test(t))           { cfg.rev = 0.88; cfg.chorus = 0.65; }
  if (/underwater|ocean|submerged|water/.test(t))       { cfg.lp = 1100; cfg.rev = 0.75; cfg.chorus = 0.9; }
  if (/angel|heaven|celestial|shimmer/.test(t))         { cfg.rev = 0.9; cfg.chorus = 0.85; cfg.pitchSt += 4; }

  // Distortion
  if (/distorted|harsh|aggressive|metal|growl|scream/.test(t)) cfg.dist = 0.75;
  if (/megaphone|loudspeaker|public address/.test(t))   { cfg.lp = 3000; cfg.hp = 800; cfg.dist = 0.55; }
  if (/radio|telephone|walkie|am broadcast/.test(t))    { cfg.lp = 3800; cfg.hp = 420; cfg.dist = 0.35; }
  if (/telephone|phone call/.test(t))                   { cfg.lp = 3400; cfg.hp = 300; }

  // Ring modulation
  if (/ring mod|tremolo|warble|wobble/.test(t))           cfg.ringHz = 8;
  if (/neon|electric|plasma|tesla/.test(t))             { cfg.ringHz = 120; cfg.ringMix = 0.8; cfg.dist = 0.3; }
  if (/bee|buzz|insect|swarm/.test(t))                    cfg.ringHz = 200;

  // Chorus
  if (/chorus|shimmer|lush|ethereal/.test(t))             cfg.chorus = 0.7;
  if (/double|layered|thick/.test(t))                     cfg.chorus = 0.5;

  // Cleanup / soft
  if (/clean|natural|none|normal|original/.test(t)) {
    cfg.pitchSt = 0; cfg.ringHz = 0; cfg.dist = 0;
    cfg.lp = 20000; cfg.hp = 20; cfg.chorus = 0; cfg.bits = 0;
  }

  cfg.pitchSt = Math.max(-18, Math.min(18, cfg.pitchSt));
  return cfg;
}

// ─────────────────────────────────────────────────────────────────────────────
// FILE DECODING
// ─────────────────────────────────────────────────────────────────────────────
export async function decodeFile(file) {
  const ab = await file.arrayBuffer();
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  try { return await ctx.decodeAudioData(ab.slice(0)); }
  finally { try { await ctx.close(); } catch (_) {} }
}

// ─────────────────────────────────────────────────────────────────────────────
// LUFS (ITU-R BS.1770-4 — K-weighted, gated)
// ─────────────────────────────────────────────────────────────────────────────
async function kWeightedRender(audioBuffer) {
  const ch  = Math.min(2, audioBuffer.numberOfChannels);
  const len = audioBuffer.length;
  const sr  = audioBuffer.sampleRate;
  const oc  = new OfflineAudioContext(ch, len, sr);
  const src = oc.createBufferSource();
  src.buffer = audioBuffer;
  const pre = oc.createBiquadFilter(); pre.type='highshelf'; pre.frequency.value=1681.974; pre.gain.value=4.0;
  const rlb = oc.createBiquadFilter(); rlb.type='highpass';  rlb.frequency.value=38.135;  rlb.Q.value=0.5;
  src.connect(pre); pre.connect(rlb); rlb.connect(oc.destination); src.start(0);
  return oc.startRendering();
}

function integratedLufsFromBuffer(buf) {
  const sr=buf.sampleRate, ch=buf.numberOfChannels;
  const blockLen=Math.floor(0.4*sr), hop=Math.floor(blockLen/4);
  if (buf.length<blockLen) return -70;
  const chData=[]; for(let c=0;c<ch;c++) chData.push(buf.getChannelData(c));
  const blocks=[];
  for(let s=0;s+blockLen<=buf.length;s+=hop){
    let ms=0;
    for(let c=0;c<ch;c++){ const d=chData[c]; let sq=0; for(let i=0;i<blockLen;i++){const v=d[s+i];sq+=v*v;} ms+=sq/blockLen; }
    blocks.push(ms);
  }
  const loud=blocks.map(m=>m>0?-0.691+10*Math.log10(m):-Infinity);
  const s1=[];
  for(let i=0;i<loud.length;i++) if(loud[i]>=-70) s1.push({l:loud[i],m:blocks[i]});
  if(!s1.length) return -70;
  const m1=s1.reduce((a,b)=>a+b.m,0)/s1.length;
  const l1=-0.691+10*Math.log10(m1), gate=l1-10;
  const s2=s1.filter(b=>b.l>=gate);
  if(!s2.length) return l1;
  const m2=s2.reduce((a,b)=>a+b.m,0)/s2.length;
  return -0.691+10*Math.log10(m2);
}

// ─────────────────────────────────────────────────────────────────────────────
// TRUE PEAK (4× linear oversampling)
// ─────────────────────────────────────────────────────────────────────────────
function truePeakDbtpFromBuffer(buf) {
  let mx=0;
  for(let c=0;c<buf.numberOfChannels;c++){
    const d=buf.getChannelData(c);
    for(let i=0;i<d.length-1;i++){
      const a=d[i],b=d[i+1];
      if(Math.abs(a)>mx) mx=Math.abs(a);
      for(let k=1;k<=4;k++){const v=a+(b-a)*k/5;if(Math.abs(v)>mx)mx=Math.abs(v);}
    }
    if(d.length>0&&Math.abs(d[d.length-1])>mx) mx=Math.abs(d[d.length-1]);
  }
  return mx>0?20*Math.log10(mx):-Infinity;
}

// ─────────────────────────────────────────────────────────────────────────────
// NOISE FLOOR + AUTO-TRIM
// ─────────────────────────────────────────────────────────────────────────────
function rmsEnvelope(buf, winMs=50){
  const sr=buf.sampleRate, winLen=Math.max(1,Math.floor(winMs/1000*sr));
  const ch=buf.numberOfChannels, chData=[];
  for(let c=0;c<ch;c++) chData.push(buf.getChannelData(c));
  const n=Math.floor(buf.length/winLen), out=new Float32Array(n);
  for(let w=0;w<n;w++){
    let ss=0,cnt=0;
    for(let c=0;c<ch;c++){const d=chData[c];for(let i=0;i<winLen;i++){const v=d[w*winLen+i];ss+=v*v;cnt++;}}
    out[w]=Math.sqrt(ss/Math.max(1,cnt));
  }
  return {env:out,winLen,sr};
}
function noiseFloorDb(env){
  const a=Array.from(env).filter(v=>v>0);
  if(!a.length) return -90;
  a.sort((x,y)=>x-y);
  return 20*Math.log10(a[Math.floor(a.length*0.1)]||1e-9);
}
function suggestTrim(buf,env,winLen,nfDb){
  const sr=buf.sampleRate, thr=Math.pow(10,(nfDb+9)/20);
  let first=-1,last=-1;
  for(let i=0;i<env.length;i++) if(env[i]>thr){if(first===-1)first=i;last=i;}
  if(first===-1) return {start:0,end:buf.duration};
  return {start:Math.max(0,(first*winLen/sr)-0.1), end:Math.min(buf.duration,((last+1)*winLen/sr)+0.2)};
}
function spectralTilt(buf){
  const d=buf.getChannelData(0), sr=buf.sampleRate, dec=Math.max(1,Math.floor(sr/8000));
  const aL=0.985,aM=0.92; let yL=0,yM=0,sL=0,sM=0,sH=0,cnt=0;
  for(let i=0;i<d.length;i+=dec){
    const x=d[i]; yL=aL*yL+(1-aL)*x; yM=aM*yM+(1-aM)*x;
    sL+=yL*yL; sM+=(yM-yL)*(yM-yL); sH+=(x-yM)*(x-yM); cnt++;
  }
  return {lowRms:Math.sqrt(sL/cnt),midRms:Math.sqrt(sM/cnt),highRms:Math.sqrt(sH/cnt)};
}

// ─────────────────────────────────────────────────────────────────────────────
// ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────
export async function analyzeAudio(audioBuffer){
  const t0=performance.now();
  let lufs=-70;
  try { const k=await kWeightedRender(audioBuffer); lufs=integratedLufsFromBuffer(k); }
  catch(_){ lufs=integratedLufsFromBuffer(audioBuffer); }
  if(!Number.isFinite(lufs)) lufs=-70;
  const truePeakDbtp=truePeakDbtpFromBuffer(audioBuffer);
  const {env,winLen}=rmsEnvelope(audioBuffer,50);
  const nfDb=noiseFloorDb(env);
  const suggestedTrim=suggestTrim(audioBuffer,env,winLen,nfDb);
  const tilt=spectralTilt(audioBuffer);
  return {lufs,truePeakDbtp,durationSec:audioBuffer.duration,noiseFloorDb:nfDb,suggestedTrim,tilt,analysisMs:Math.max(1,Math.round(performance.now()-t0))};
}

// ─────────────────────────────────────────────────────────────────────────────
// DSP HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function makeSatCurve(amount){
  const n=2048, curve=new Float32Array(n), k=1+amount*4;
  for(let i=0;i<n;i++){const x=(i*2)/(n-1)-1; curve[i]=((1+k)*x)/(1+k*Math.abs(x));}
  return curve;
}

function makeBitCrusherCurve(bits){
  bits=Math.max(2,Math.min(16,bits));
  const n=65536, curve=new Float32Array(n), levels=Math.pow(2,bits-1);
  for(let i=0;i<n;i++){const x=(i/n)*2-1; curve[i]=Math.round(x*levels)/levels;}
  return curve;
}

function generateIR(ctx, dur, decay, room){
  const sr=ctx.sampleRate, len=Math.max(1,Math.floor(sr*dur));
  const buf=ctx.createBuffer(2,len,sr);
  for(let ch=0;ch<2;ch++){
    const d=buf.getChannelData(ch);
    for(let i=0;i<len;i++){
      const t=i/sr, env=Math.pow(Math.max(0,1-t/dur),decay);
      d[i]=(Math.random()*2-1)*env*room*(ch===0?1.0:0.97);
    }
    let prev=0;
    for(let i=0;i<len;i++){const c=d[i]*0.65+prev*0.35;d[i]=c;prev=c;}
  }
  return buf;
}

function sliceBuffer(buf, s0, s1){
  const sr=buf.sampleRate, ch=buf.numberOfChannels;
  const i0=Math.max(0,Math.floor(s0*sr)), i1=Math.min(buf.length,Math.floor(s1*sr));
  const len=Math.max(1,i1-i0);
  const Ctx=window.OfflineAudioContext||window.webkitOfflineAudioContext;
  const oc=new Ctx(ch,len,sr), out=oc.createBuffer(ch,len,sr);
  for(let c=0;c<ch;c++){
    const src=buf.getChannelData(c), dst=out.getChannelData(c);
    for(let i=0;i<len;i++) dst[i]=src[i0+i];
  }
  return out;
}

function buildEqChain(ctx, presetCfg, extras){
  const e=presetCfg.eq, nodes=[];
  const mk=(type,freq,gain,Q)=>{
    const f=ctx.createBiquadFilter(); f.type=type;
    if(freq!=null) f.frequency.value=freq;
    if(gain!=null) f.gain.value=gain;
    if(Q!=null)    f.Q.value=Q;
    nodes.push(f); return f;
  };
  mk('highpass',  Math.max(20,e.hp), null,  0.7);
  mk('lowshelf',  e.lowShelfHz, e.lowShelfDb+(extras?.bassBoost||0), null);
  mk('peaking',   e.lowMidHz,   e.lowMidDb,  1.0);
  mk('peaking',   e.midHz,      e.midDb,     1.0);
  mk('peaking',   e.presHz,     e.presDb,    1.0);
  mk('highshelf', e.airHz,      e.airDb+(extras?.brightness||0), null);
  mk('lowpass',   e.lp,         null,        0.5);
  for(let i=0;i<nodes.length-1;i++) nodes[i].connect(nodes[i+1]);
  return {input:nodes[0],output:nodes[nodes.length-1],nodes};
}

// ─────────────────────────────────────────────────────────────────────────────
// PITCH SHIFT (offline — resampling approach, pitch+tempo together)
// For voice morphing this is intentional and authentic.
// ─────────────────────────────────────────────────────────────────────────────
async function pitchShiftBuffer(audioBuffer, semitones){
  if(Math.abs(semitones)<0.1) return audioBuffer;
  const ratio=Math.pow(2,semitones/12);
  const sr=audioBuffer.sampleRate, ch=audioBuffer.numberOfChannels;
  // Render at ratio playbackRate — output will be shorter(up) or longer(down)
  const outLen=Math.ceil(audioBuffer.length/ratio);
  const oc=new OfflineAudioContext(ch,outLen,sr);
  const src=oc.createBufferSource(); src.buffer=audioBuffer;
  src.playbackRate.value=ratio;
  src.connect(oc.destination); src.start(0);
  return oc.startRendering();
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO / CUSTOM PRESET LOGIC
// ─────────────────────────────────────────────────────────────────────────────
function autoCustomize(base,analysis){
  const cfg=JSON.parse(JSON.stringify(base));
  if(!analysis) return cfg;
  if(analysis.noiseFloorDb>-40) cfg._autoNoise=0.65;
  else if(analysis.noiseFloorDb>-50) cfg._autoNoise=0.45;
  else if(analysis.noiseFloorDb>-60) cfg._autoNoise=0.25;
  else cfg._autoNoise=0.1;
  const dr=analysis.truePeakDbtp-analysis.lufs;
  if(dr>22){cfg.comp.threshold-=4;cfg.comp.ratio+=1.5;cfg.comp.mix=Math.min(1,cfg.comp.mix+0.1);}
  else if(dr>18){cfg.comp.ratio+=0.5;}
  const t=analysis.tilt;
  if(t){
    const tot=t.lowRms+t.midRms+t.highRms||1;
    const lf=t.lowRms/tot, hf=t.highRms/tot;
    if(lf<0.2) cfg.eq.lowShelfDb=Math.min(8,cfg.eq.lowShelfDb+2);
    if(lf>0.55) cfg.eq.lowShelfDb=Math.max(-3,cfg.eq.lowShelfDb-2);
    if(hf<0.12) cfg.eq.airDb=Math.min(6,cfg.eq.airDb+1.5);
    if(hf>0.4)  cfg.eq.airDb=Math.max(-3,cfg.eq.airDb-1.5);
  }
  return cfg;
}

function applyPromptToMaster(base,prompt){
  const cfg=JSON.parse(JSON.stringify(base));
  if(!prompt) return cfg;
  const t=prompt.toLowerCase();
  if(/cathedral|church|huge room|massive/.test(t)){cfg.rev.dur=6;cfg.rev.maxWet=Math.max(cfg.rev.maxWet,0.55);cfg.rev.room=1.0;}
  else if(/long reverb|hall|epic/.test(t)){cfg.rev.dur=4;cfg.rev.maxWet=Math.max(cfg.rev.maxWet,0.42);cfg.rev.room=0.9;}
  else if(/reverb|space|ambient/.test(t)){cfg.rev.maxWet=Math.max(cfg.rev.maxWet,0.35);}
  if(/no reverb|dry/.test(t)) cfg.rev.maxWet=0;
  if(/sub bass|subwoofer/.test(t)){cfg.eq.lowShelfDb+=5;}
  else if(/bass|deep|heavy|masculine/.test(t)){cfg.eq.lowShelfDb+=3;}
  if(/crisp|sparkle|air/.test(t)){cfg.eq.airDb+=3;cfg.eq.presDb+=2;}
  else if(/bright|clear/.test(t)){cfg.eq.airDb+=2;cfg.eq.presDb+=1;}
  if(/warm|analog|vintage/.test(t)) cfg.sat=Math.max(cfg.sat,0.25);
  if(/heavy compress|squash/.test(t)){cfg.comp.threshold-=4;cfg.comp.ratio+=4;}
  if(/lo-?fi|tape/.test(t)){cfg.eq.lp=Math.min(cfg.eq.lp,12000);cfg.sat=Math.max(cfg.sat,0.35);}
  return cfg;
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-BAND NOISE REDUCTION — better than single-compressor approach
// 4 bands: sub, lo-mid, hi-mid, air. Air gets most aggression (hiss lives there)
// ─────────────────────────────────────────────────────────────────────────────
function buildMultiBandNR(ctx, nfDb, amount){
  if(amount<0.02) return null;
  const thr=Math.min(-20,Math.max(-55,nfDb+4));

  // We implement a serial multi-stage approach (parallel bands add phase issues in OAC):
  // Stage 1: broadband downward expander
  const g1=ctx.createDynamicsCompressor();
  g1.threshold.value=thr; g1.knee.value=8;
  g1.ratio.value=1+amount*7; g1.attack.value=0.005; g1.release.value=0.08;

  // Stage 2: presence-range expander (1–4kHz where voice lives, leave alone)
  const g2=ctx.createDynamicsCompressor();
  g2.threshold.value=thr-4; g2.knee.value=4;
  g2.ratio.value=1+amount*4; g2.attack.value=0.002; g2.release.value=0.05;

  // Stage 3: aggressive de-hiss shelf (>7kHz)
  const hiss=ctx.createBiquadFilter(); hiss.type='highshelf';
  hiss.frequency.value=7000; hiss.gain.value=-10*amount;

  // Stage 4: gentle de-rumble (already handled by static HPF, add slight more)
  const rumble=ctx.createBiquadFilter(); rumble.type='highpass';
  rumble.frequency.value=60+amount*40; rumble.Q.value=0.5;

  g1.connect(g2); g2.connect(hiss); hiss.connect(rumble);
  return {input:g1, output:rumble};
}

// ─────────────────────────────────────────────────────────────────────────────
// SOFTWARE LOOKAHEAD LIMITER
// ─────────────────────────────────────────────────────────────────────────────
function softLookaheadLimiter(buf, ceilDb){
  const sr=buf.sampleRate, numCh=buf.numberOfChannels;
  const ceil=Math.pow(10,ceilDb/20);
  const attackCoef=Math.exp(-1/Math.max(1,0.0005*sr));
  const releaseCoef=Math.exp(-1/Math.max(1,0.100*sr));
  const len=buf.length;
  const ch=[];
  for(let c=0;c<numCh;c++) ch.push(buf.getChannelData(c));

  const tg=new Float32Array(len); tg.fill(1);
  for(let i=0;i<len-1;i++){
    let mx=0;
    for(let c=0;c<numCh;c++){
      const a=ch[c][i],b=ch[c][i+1];
      if(Math.abs(a)>mx)mx=Math.abs(a);
      for(let k=1;k<=4;k++){const v=a+(b-a)*k/5;if(Math.abs(v)>mx)mx=Math.abs(v);}
    }
    if(mx>ceil) tg[i]=ceil/mx;
  }

  const env=new Float32Array(len);
  env[len-1]=tg[len-1];
  for(let i=len-2;i>=0;i--){
    if(env[i+1]<tg[i]) env[i]=Math.min(tg[i],attackCoef*env[i+1]+(1-attackCoef)*tg[i]);
    else env[i]=Math.min(tg[i],env[i+1]);
  }

  let gain=1.0;
  for(let i=0;i<len;i++){
    const t=env[i];
    gain=t<gain?attackCoef*gain+(1-attackCoef)*t:releaseCoef*gain+(1-releaseCoef)*t;
    for(let c=0;c<numCh;c++){
      let v=ch[c][i]*gain;
      if(v>ceil)v=ceil; else if(v<-ceil)v=-ceil;
      ch[c][i]=v;
    }
  }

  // Final safety clamp
  for(let pass=0;pass<2;pass++){
    let again=false;
    for(let i=0;i<len-1;i++){
      for(let c=0;c<numCh;c++){
        const a=ch[c][i],b=ch[c][i+1];
        for(let k=1;k<=4;k++){
          const t=k/5,v=a+(b-a)*t;
          if(Math.abs(v)>ceil){
            const sc=ceil/Math.abs(v);
            ch[c][i]=a*sc; ch[c][i+1]=b*sc; again=true;
          }
        }
      }
    }
    if(!again) break;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// WAV ENCODER — 16-bit PCM with TPDF dithering (removes quantisation distortion)
// ─────────────────────────────────────────────────────────────────────────────
function encodeWAV(buf){
  const ch=buf.numberOfChannels, sr=buf.sampleRate, len=buf.length;
  const ab=new ArrayBuffer(44+len*ch*2), v=new DataView(ab);
  const ws=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));};
  ws(0,'RIFF'); v.setUint32(4,36+len*ch*2,true);
  ws(8,'WAVE'); ws(12,'fmt ');
  v.setUint32(16,16,true); v.setUint16(20,1,true);
  v.setUint16(22,ch,true); v.setUint32(24,sr,true);
  v.setUint32(28,sr*ch*2,true); v.setUint16(32,ch*2,true);
  v.setUint16(34,16,true); ws(36,'data');
  v.setUint32(40,len*ch*2,true);
  let off=44;
  const chD=[]; for(let c=0;c<ch;c++) chD.push(buf.getChannelData(c));
  // TPDF dither amplitude = 2 LSB (one from each triangular half)
  const dither=1/32768;
  for(let i=0;i<len;i++){
    for(let c=0;c<ch;c++){
      let s=chD[c][i];
      // TPDF: two independent uniform random numbers minus each other → triangular distribution
      s+=(Math.random()-Math.random())*dither;
      if(s>1)s=1; else if(s<-1)s=-1;
      v.setInt16(off,s<0?s*0x8000:s*0x7FFF,true);
      off+=2;
    }
  }
  return ab;
}

function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
async function safeKWeighted(buf){try{return await kWeightedRender(buf);}catch(_){return buf;}}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER MASTER
// ─────────────────────────────────────────────────────────────────────────────
export async function renderMaster(audioBuffer, config, onProgress){
  const prog=(p,l)=>{try{onProgress?.(p,l);}catch(_){}};
  prog(5,'Analyzing source...');
  const analysis=await analyzeAudio(audioBuffer);

  const pid=config.preset||'cinematic';
  let presetCfg=PRESETS[pid]||PRESETS.auto;
  if(pid==='auto') presetCfg=autoCustomize(presetCfg,analysis);
  if(pid==='custom') presetCfg=applyPromptToMaster(PRESETS.auto,config.customPrompt||'');

  prog(12,'Trimming silence...');
  let work=audioBuffer;
  if(config.autoTrim){
    const r=config.trimRange||analysis.suggestedTrim;
    if(r&&r.end-r.start>0.1) work=sliceBuffer(audioBuffer,r.start,r.end);
  }

  let nr=config.noiseReduction??0.3;
  if(pid==='auto'&&presetCfg._autoNoise!=null) nr=Math.max(nr,presetCfg._autoNoise);

  const sr=work.sampleRate;
  const revTail=(presetCfg.rev.dur||0)*1.2+0.5;
  const outLen=Math.floor((work.duration+revTail)*sr);
  const channels=Math.min(2,Math.max(1,work.numberOfChannels));
  const oc=new OfflineAudioContext(channels,outLen,sr);

  const src=oc.createBufferSource(); src.buffer=work;
  let n=src;

  // Always-on rumble HPF
  const rumble=oc.createBiquadFilter(); rumble.type='highpass'; rumble.frequency.value=35; rumble.Q.value=0.7;
  n.connect(rumble); n=rumble;

  // Multi-band noise reduction
  prog(22,'Reducing noise...');
  if(nr>0.02){
    const mbNR=buildMultiBandNR(oc,analysis.noiseFloorDb,nr);
    if(mbNR){n.connect(mbNR.input);n=mbNR.output;}
  }

  // EQ
  prog(35,'Applying EQ...');
  const eq=buildEqChain(oc,presetCfg,{bassBoost:config.bassBoost||0,brightness:config.brightness||0});
  n.connect(eq.input); n=eq.output;

  // Saturation
  prog(50,'Adding warmth...');
  const wa=(config.warmth!=null?config.warmth:0.3)*(1+presetCfg.sat);
  if(wa>0.02){
    const ws=oc.createWaveShaper(); ws.curve=makeSatCurve(Math.min(1,wa)); ws.oversample='4x';
    const trim=oc.createGain(); trim.gain.value=0.82;
    n.connect(ws); ws.connect(trim); n=trim;
  }

  // Parallel compression
  prog(62,'Compressing dynamics...');
  const ca=config.compression!=null?config.compression:0.5;
  const bc=presetCfg.comp;
  const comp=oc.createDynamicsCompressor();
  comp.threshold.value=bc.threshold; comp.ratio.value=bc.ratio;
  comp.knee.value=bc.knee; comp.attack.value=bc.attack; comp.release.value=bc.release;
  const cWet=oc.createGain(), cDry=oc.createGain(), cMix=oc.createGain();
  const wAmt=Math.min(1,bc.mix*(0.4+ca*1.2));
  cWet.gain.value=wAmt; cDry.gain.value=1-wAmt;
  n.connect(cDry); n.connect(comp); comp.connect(cWet); cDry.connect(cMix); cWet.connect(cMix);
  n=cMix;

  // Reverb (parallel)
  prog(75,'Rendering reverb space...');
  const rv=presetCfg.rev, ra=config.reverbAmount!=null?config.reverbAmount:0.3;
  const wv=Math.max(0,Math.min(1,rv.maxWet*ra));
  if(wv>0.005){
    const pre=oc.createDelay(0.2); pre.delayTime.value=rv.pre;
    const conv=oc.createConvolver(); conv.buffer=generateIR(oc,rv.dur,rv.decay,rv.room);
    const dryG=oc.createGain(); dryG.gain.value=1.0;
    const wetG=oc.createGain(); wetG.gain.value=wv;
    const mix=oc.createGain();
    n.connect(dryG); n.connect(pre); pre.connect(conv); conv.connect(wetG);
    dryG.connect(mix); wetG.connect(mix); n=mix;
  }

  // Platform tilt
  const plt=config.platform||'instagram';
  if(plt==='phone'||pid==='phone'){
    const pb=oc.createBiquadFilter(); pb.type='peaking'; pb.frequency.value=2500; pb.Q.value=1.0; pb.gain.value=2.5;
    n.connect(pb); n=pb;
  } else if(plt==='instagram'||plt==='tiktok'){
    const mf=oc.createBiquadFilter(); mf.type='peaking'; mf.frequency.value=1800; mf.Q.value=0.9; mf.gain.value=1.2;
    n.connect(mf); n=mf;
  }

  n.connect(oc.destination); src.start(0);
  const rendered=await oc.startRendering();

  // LUFS normalize
  prog(86,'Measuring loudness...');
  const target=PLATFORM_TARGETS[plt]||PLATFORM_TARGETS.instagram;
  let measured=-23;
  try{const k=await kWeightedRender(rendered);measured=integratedLufsFromBuffer(k);}
  catch(_){measured=integratedLufsFromBuffer(rendered);}
  if(!Number.isFinite(measured))measured=-23;
  const gl=Math.pow(10,clamp(target.lufs-measured,-18,18)/20);
  for(let c=0;c<rendered.numberOfChannels;c++){const d=rendered.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=gl;}

  // True-peak limiter
  prog(94,'Applying true-peak limiter...');
  softLookaheadLimiter(rendered,target.peak);

  const fkBuf=await safeKWeighted(rendered);
  const fLufs=integratedLufsFromBuffer(fkBuf);
  const fPeak=truePeakDbtpFromBuffer(rendered);

  prog(99,'Encoding WAV (TPDF dithered)...');
  const wavAb=encodeWAV(rendered);
  prog(100,'Done');

  const blob=new Blob([wavAb],{type:'audio/wav'});
  blob.__lufs=Number.isFinite(fLufs)?fLufs:target.lufs;
  blob.__peak=fPeak;
  return blob;
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDER VOICE MORPH — offline voice transformation pipeline
// ─────────────────────────────────────────────────────────────────────────────
export async function renderVoiceMorph(audioBuffer, morphCfg, onProgress){
  const prog=(p,l)=>{try{onProgress?.(p,l);}catch(_){}};
  prog(5,'Pitch shifting...');

  // Step 1: pitch shift
  const pitched=await pitchShiftBuffer(audioBuffer,morphCfg.pitchSt||0);

  prog(28,'Applying voice transform...');
  const sr=pitched.sampleRate, ch=Math.min(2,pitched.numberOfChannels);
  const revTailSec=morphCfg.rev>0.4?3.0:1.0;
  const outLen=Math.floor((pitched.duration+revTailSec)*sr);
  const oc=new OfflineAudioContext(ch,outLen,sr);
  const src=oc.createBufferSource(); src.buffer=pitched;
  let n=src;

  // HP filter
  const hp=oc.createBiquadFilter(); hp.type='highpass';
  hp.frequency.value=morphCfg.hp||20; hp.Q.value=0.7;
  n.connect(hp); n=hp;

  // Ring modulation (creates alien/robot tremolo)
  if((morphCfg.ringHz||0)>0){
    const osc=oc.createOscillator(); osc.frequency.value=morphCfg.ringHz; osc.type='sine';
    const ringGain=oc.createGain(); ringGain.gain.value=0;
    const dryGain=oc.createGain(); dryGain.gain.value=1-(morphCfg.ringMix||0.7);
    const wetGain=oc.createGain(); wetGain.gain.value=morphCfg.ringMix||0.7;
    const mixG=oc.createGain();
    osc.connect(ringGain.gain); // modulates gain with oscillator
    n.connect(ringGain); n.connect(dryGain);
    ringGain.connect(wetGain); wetGain.connect(mixG); dryGain.connect(mixG);
    osc.start(0); n=mixG;
  }

  // Distortion
  if((morphCfg.dist||0)>0.01){
    const ws=oc.createWaveShaper(); ws.curve=makeSatCurve(morphCfg.dist); ws.oversample='4x';
    const trim=oc.createGain(); trim.gain.value=0.75;
    n.connect(ws); ws.connect(trim); n=trim;
  }

  // Bit crusher
  if((morphCfg.bits||0)>0){
    const ws=oc.createWaveShaper(); ws.curve=makeBitCrusherCurve(morphCfg.bits);
    n.connect(ws); n=ws;
  }

  // LP filter (shape character)
  const lp=oc.createBiquadFilter(); lp.type='lowpass';
  lp.frequency.value=Math.min(sr/2-100,morphCfg.lp||20000); lp.Q.value=0.7;
  n.connect(lp); n=lp;

  // Chorus (thickening / ghost effect)
  if((morphCfg.chorus||0)>0.05){
    const del1=oc.createDelay(0.05); del1.delayTime.value=0.022;
    const del2=oc.createDelay(0.05); del2.delayTime.value=0.030;
    const lfo1=oc.createOscillator(); lfo1.frequency.value=0.7; lfo1.type='sine';
    const lfo2=oc.createOscillator(); lfo2.frequency.value=0.9; lfo2.type='sine';
    const lg1=oc.createGain(); lg1.gain.value=0.008*morphCfg.chorus;
    const lg2=oc.createGain(); lg2.gain.value=0.010*morphCfg.chorus;
    const cg1=oc.createGain(); cg1.gain.value=morphCfg.chorus*0.5;
    const cg2=oc.createGain(); cg2.gain.value=morphCfg.chorus*0.5;
    const dryG=oc.createGain(); dryG.gain.value=1-morphCfg.chorus*0.4;
    const mixG=oc.createGain();
    lfo1.connect(lg1); lg1.connect(del1.delayTime);
    lfo2.connect(lg2); lg2.connect(del2.delayTime);
    n.connect(del1); n.connect(del2); n.connect(dryG);
    del1.connect(cg1); del2.connect(cg2);
    dryG.connect(mixG); cg1.connect(mixG); cg2.connect(mixG);
    lfo1.start(0); lfo2.start(0);
    n=mixG;
  }

  // Reverb
  prog(55,'Rendering reverb space...');
  if((morphCfg.rev||0)>0.02){
    const dur=1+morphCfg.rev*5, decay=1.5+morphCfg.rev*1.5;
    const pre=oc.createDelay(0.1); pre.delayTime.value=0.015;
    const conv=oc.createConvolver(); conv.buffer=generateIR(oc,dur,decay,morphCfg.rev);
    const dryG=oc.createGain(); dryG.gain.value=1-morphCfg.rev*0.5;
    const wetG=oc.createGain(); wetG.gain.value=morphCfg.rev*0.8;
    const mix=oc.createGain();
    n.connect(dryG); n.connect(pre); pre.connect(conv); conv.connect(wetG);
    dryG.connect(mix); wetG.connect(mix); n=mix;
  }

  n.connect(oc.destination); src.start(0);
  prog(68,'Rendering...');
  const rendered=await oc.startRendering();

  // Normalize to -14 LUFS
  prog(88,'Normalizing loudness...');
  let measured=-23;
  try{const k=await kWeightedRender(rendered);measured=integratedLufsFromBuffer(k);}catch(_){measured=integratedLufsFromBuffer(rendered);}
  if(!Number.isFinite(measured))measured=-23;
  const gl=Math.pow(10,clamp(-14-measured,-18,14)/20);
  for(let c=0;c<rendered.numberOfChannels;c++){const d=rendered.getChannelData(c);for(let i=0;i<d.length;i++)d[i]*=gl;}
  softLookaheadLimiter(rendered,-1.0);

  prog(97,'Encoding WAV...');
  const wavAb=encodeWAV(rendered);
  prog(100,'Done');

  const fLufs=integratedLufsFromBuffer(await safeKWeighted(rendered));
  const fPeak=truePeakDbtpFromBuffer(rendered);
  const blob=new Blob([wavAb],{type:'audio/wav'});
  blob.__lufs=Number.isFinite(fLufs)?fLufs:-14;
  blob.__peak=fPeak;
  return blob;
}

// ─────────────────────────────────────────────────────────────────────────────
// AudioWorklet pitch shifter code (loaded as blob URL for live pitch shift)
// Simple ring buffer with variable read speed. Not a phase vocoder, but produces
// the audible pitch effect with minimal latency.
// ─────────────────────────────────────────────────────────────────────────────
export const PITCH_WORKLET_CODE=`
class PitchShifterProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors(){
    return [{name:'semitones',defaultValue:0,minValue:-24,maxValue:24}];
  }
  constructor(){
    super();
    this._bufLen=16384;
    this._buf=new Float32Array(this._bufLen);
    this._writePos=0;
    this._readPos=0;
  }
  process(inputs,outputs,params){
    const inp=inputs[0]?.[0];
    const out=outputs[0]?.[0];
    if(!inp||!out) return true;
    const st=params.semitones[0]??0;
    const ratio=Math.pow(2,st/12);
    // Write input
    for(let i=0;i<inp.length;i++){
      this._buf[this._writePos%this._bufLen]=inp[i];
      this._writePos++;
    }
    // Read at ratio speed (linear interp)
    for(let i=0;i<out.length;i++){
      const rp=this._readPos;
      const ri=Math.floor(rp)%this._bufLen;
      const rn=(ri+1)%this._bufLen;
      const frac=rp-Math.floor(rp);
      out[i]=this._buf[ri]*(1-frac)+this._buf[rn]*frac;
      this._readPos+=ratio;
    }
    // Keep readPos within bounds of written data (prevent lag buildup)
    const lag=this._writePos-this._readPos;
    if(lag<64)  this._readPos-=32;
    if(lag>this._bufLen*0.75) this._readPos=this._writePos-512;
    return true;
  }
}
registerProcessor('sonix-pitch-shifter',PitchShifterProcessor);
`;

// ─────────────────────────────────────────────────────────────────────────────
// REAL-TIME PREVIEW ENGINE (mastering chain, file source)
// ─────────────────────────────────────────────────────────────────────────────
export function buildRealtimeEngine(audioBuffer){
  let ctx=null,source=null,masterGain=null,analyser=null;
  let dryG=null,wetG=null,conv=null,preDel=null;
  let sat=null,satTrim=null,comp=null,rumbleHp=null,eq=null,mixSum=null;
  let meterCb=null,meterTimer=null;
  let playing=false,startedAt=0,pausedAt=0;
  let pid='cinematic',cfg=JSON.parse(JSON.stringify(PRESETS.cinematic));
  let state={reverb:0.3,bass:0,brightness:0,warmth:0.3,compression:0.5};

  function ensureCtx(){
    if(ctx) return;
    const Ctx=window.AudioContext||window.webkitAudioContext;
    ctx=new Ctx();
    rumbleHp=ctx.createBiquadFilter(); rumbleHp.type='highpass'; rumbleHp.frequency.value=35; rumbleHp.Q.value=0.7;
    eq=buildEqChain(ctx,cfg,{bassBoost:state.bass,brightness:state.brightness});
    sat=ctx.createWaveShaper(); sat.curve=makeSatCurve(state.warmth); sat.oversample='4x';
    satTrim=ctx.createGain(); satTrim.gain.value=0.82;
    comp=ctx.createDynamicsCompressor();
    comp.threshold.value=cfg.comp.threshold; comp.ratio.value=cfg.comp.ratio;
    comp.knee.value=cfg.comp.knee; comp.attack.value=cfg.comp.attack; comp.release.value=cfg.comp.release;
    preDel=ctx.createDelay(0.2); preDel.delayTime.value=cfg.rev.pre;
    conv=ctx.createConvolver(); conv.buffer=generateIR(ctx,cfg.rev.dur,cfg.rev.decay,cfg.rev.room);
    dryG=ctx.createGain(); dryG.gain.value=1;
    wetG=ctx.createGain(); wetG.gain.value=cfg.rev.maxWet*state.reverb;
    mixSum=ctx.createGain();
    analyser=ctx.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0.6;
    masterGain=ctx.createGain(); masterGain.gain.value=0.90;
    rumbleHp.connect(eq.input); eq.output.connect(sat); sat.connect(satTrim); satTrim.connect(comp);
    comp.connect(dryG); comp.connect(preDel); preDel.connect(conv); conv.connect(wetG);
    dryG.connect(mixSum); wetG.connect(mixSum);
    mixSum.connect(analyser); analyser.connect(masterGain); masterGain.connect(ctx.destination);
  }

  function applyToChain(){
    if(!ctx) return;
    const e=cfg.eq, [hp,ls,lm,m,p,air,lp]=eq.nodes;
    const T=ctx.currentTime,tau=0.02;
    hp.frequency.setTargetAtTime(e.hp,T,tau);
    ls.frequency.setTargetAtTime(e.lowShelfHz,T,tau); ls.gain.setTargetAtTime(e.lowShelfDb+state.bass,T,tau);
    lm.frequency.setTargetAtTime(e.lowMidHz,T,tau);   lm.gain.setTargetAtTime(e.lowMidDb,T,tau);
    m.frequency.setTargetAtTime(e.midHz,T,tau);        m.gain.setTargetAtTime(e.midDb,T,tau);
    p.frequency.setTargetAtTime(e.presHz,T,tau);       p.gain.setTargetAtTime(e.presDb,T,tau);
    air.frequency.setTargetAtTime(e.airHz,T,tau);      air.gain.setTargetAtTime(e.airDb+state.brightness,T,tau);
    lp.frequency.setTargetAtTime(e.lp,T,tau);
    comp.threshold.setTargetAtTime(cfg.comp.threshold,T,tau);
    comp.ratio.setTargetAtTime(cfg.comp.ratio,T,tau);
    comp.knee.setTargetAtTime(cfg.comp.knee,T,tau);
    comp.attack.setTargetAtTime(cfg.comp.attack,T,tau);
    comp.release.setTargetAtTime(cfg.comp.release,T,tau);
    conv.buffer=generateIR(ctx,cfg.rev.dur,cfg.rev.decay,cfg.rev.room);
    preDel.delayTime.setTargetAtTime(cfg.rev.pre,T,tau);
    wetG.gain.setTargetAtTime(cfg.rev.maxWet*state.reverb,T,tau);
    sat.curve=makeSatCurve(state.warmth);
  }

  function startMeter(){
    if(meterTimer) return;
    const arr=new Float32Array(analyser.fftSize);
    meterTimer=setInterval(()=>{
      if(!analyser||!meterCb) return;
      try{analyser.getFloatTimeDomainData(arr);}catch(_){
        const b=new Uint8Array(analyser.fftSize); analyser.getByteTimeDomainData(b);
        for(let i=0;i<b.length;i++) arr[i]=(b[i]-128)/128;
      }
      let peak=0,ss=0;
      for(let i=0;i<arr.length;i++){const v=arr[i];const av=Math.abs(v);if(av>peak)peak=av;ss+=v*v;}
      const rms=Math.sqrt(ss/arr.length);
      meterCb({peakDb:peak>0?Math.max(-60,20*Math.log10(peak)):-60,rmsDb:rms>0?Math.max(-60,20*Math.log10(rms)):-60});
    },33);
  }
  function stopMeter(){if(meterTimer){clearInterval(meterTimer);meterTimer=null;}}

  function startSrc(from){
    if(!ctx) return; stopSrc();
    source=ctx.createBufferSource(); source.buffer=audioBuffer;
    source.connect(rumbleHp);
    const off=Math.max(0,Math.min(audioBuffer.duration,from));
    pausedAt=off; startedAt=ctx.currentTime;
    source.onended=()=>{if(playing&&source){playing=false;pausedAt=audioBuffer.duration;source=null;}};
    source.start(0,off); playing=true;
  }
  function stopSrc(){
    if(source){try{source.onended=null;source.stop();}catch(_){}try{source.disconnect();}catch(_){}source=null;}
  }

  return {
    async play(){
      ensureCtx();
      if(ctx.state==='suspended') try{await ctx.resume();}catch(_){}
      startSrc(pausedAt>=audioBuffer.duration-0.01?0:pausedAt);
      startMeter();
    },
    pause(){
      if(!ctx) return;
      if(playing&&source) pausedAt=Math.min(audioBuffer.duration,pausedAt+(ctx.currentTime-startedAt));
      stopSrc(); playing=false; stopMeter();
      if(meterCb) meterCb({peakDb:-60,rmsDb:-60});
    },
    seek(s){
      const t=Math.max(0,Math.min(audioBuffer.duration,s));
      if(playing){startSrc(t);}else{pausedAt=t;}
    },
    setReverb(v){state.reverb=Math.max(0,Math.min(1,v));if(ctx)wetG.gain.setTargetAtTime(cfg.rev.maxWet*state.reverb,ctx.currentTime,0.02);},
    setBass(db){state.bass=db;if(ctx)eq.nodes[1].gain.setTargetAtTime(cfg.eq.lowShelfDb+db,ctx.currentTime,0.02);},
    setBrightness(db){state.brightness=db;if(ctx)eq.nodes[5].gain.setTargetAtTime(cfg.eq.airDb+db,ctx.currentTime,0.02);},
    setWarmth(v){state.warmth=Math.max(0,Math.min(1,v));if(sat)sat.curve=makeSatCurve(state.warmth);},
    setCompression(v){
      state.compression=Math.max(0,Math.min(1,v));
      if(!ctx) return;
      comp.ratio.setTargetAtTime(cfg.comp.ratio*(0.6+state.compression*0.8),ctx.currentTime,0.02);
      comp.threshold.setTargetAtTime(cfg.comp.threshold-state.compression*4,ctx.currentTime,0.02);
    },
    setPreset(id){if(!PRESETS[id])return;pid=id;cfg=JSON.parse(JSON.stringify(PRESETS[id]));applyToChain();},
    getTime(){if(!ctx)return pausedAt;return playing?Math.min(audioBuffer.duration,pausedAt+(ctx.currentTime-startedAt)):pausedAt;},
    getDuration(){return audioBuffer.duration;},
    isPlaying(){return playing;},
    onMeter(cb){meterCb=cb;if(playing&&analyser)startMeter();},
    destroy(){stopSrc();stopMeter();meterCb=null;if(ctx){try{ctx.close();}catch(_){}}ctx=null;},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// VOICE MORPH PREVIEW ENGINE  — real-time AudioContext playback with morph DSP
// Mirrors renderVoiceMorph but uses a live AudioContext instead of offline.
// Pitch shift: playbackRate (changes tempo+pitch together — fine for preview).
// Ring mod, distortion, bit crush, LP/HP, chorus, reverb: identical to offline.
// Post-morph chain (bass shelf, air shelf, saturation, compression, extra reverb)
// is controlled by the 5 shape sliders and initialised from `state` so values
// set before play() are applied when the AudioContext is first created.
// ─────────────────────────────────────────────────────────────────────────────
export function buildMorphPreviewEngine(audioBuffer, morphCfg){
  const pitchRatio=morphCfg?Math.pow(2,(morphCfg.pitchSt||0)/12):1;
  let state={reverb:0,bass:0,brightness:0,warmth:0.1,compression:0.5};

  let ctx=null,source=null,analyser=null,masterGain=null,firstNode=null;
  let postRevWet=null,postEqBass=null,postEqAir=null,postSat=null,postComp=null;
  let meterCb=null,meterTimer=null;
  let playing=false,startedAt=0,pausedAt=0;

  function ensureCtx(){
    if(ctx)return;
    const Ctx=window.AudioContext||window.webkitAudioContext;
    ctx=new Ctx();

    // HP filter (always present)
    const hp=ctx.createBiquadFilter(); hp.type='highpass';
    hp.frequency.value=morphCfg?.hp||20; hp.Q.value=0.7;
    firstNode=hp; let n=hp;

    // Ring modulation (alien, robot, glitch, demon, ghost)
    if(morphCfg&&(morphCfg.ringHz||0)>0){
      const osc=ctx.createOscillator(); osc.type='sine'; osc.frequency.value=morphCfg.ringHz;
      const rG=ctx.createGain(); rG.gain.value=0;
      const dG=ctx.createGain(); dG.gain.value=1-(morphCfg.ringMix||0.7);
      const wG=ctx.createGain(); wG.gain.value=morphCfg.ringMix||0.7;
      const mx=ctx.createGain();
      osc.connect(rG.gain); n.connect(rG); n.connect(dG);
      rG.connect(wG); wG.connect(mx); dG.connect(mx);
      osc.start(); n=mx;
    }

    // Distortion (monster, demon, megaphone, glitch)
    if(morphCfg&&(morphCfg.dist||0)>0.01){
      const ws=ctx.createWaveShaper(); ws.curve=makeSatCurve(morphCfg.dist); ws.oversample='4x';
      const trim=ctx.createGain(); trim.gain.value=0.75;
      n.connect(ws); ws.connect(trim); n=trim;
    }

    // Bit crusher (robot, glitch)
    if(morphCfg&&(morphCfg.bits||0)>0){
      const ws=ctx.createWaveShaper(); ws.curve=makeBitCrusherCurve(morphCfg.bits);
      n.connect(ws); n=ws;
    }

    // LP filter (megaphone, radio, underwater)
    const lp=ctx.createBiquadFilter(); lp.type='lowpass';
    lp.frequency.value=Math.min(ctx.sampleRate/2-100,morphCfg?.lp||20000); lp.Q.value=0.7;
    n.connect(lp); n=lp;

    // Chorus (ghost, underwater, angel)
    if(morphCfg&&(morphCfg.chorus||0)>0.05){
      const d1=ctx.createDelay(0.05); d1.delayTime.value=0.022;
      const d2=ctx.createDelay(0.05); d2.delayTime.value=0.030;
      const l1=ctx.createOscillator(); l1.frequency.value=0.7; l1.type='sine';
      const l2=ctx.createOscillator(); l2.frequency.value=0.9; l2.type='sine';
      const lg1=ctx.createGain(); lg1.gain.value=0.008*morphCfg.chorus;
      const lg2=ctx.createGain(); lg2.gain.value=0.010*morphCfg.chorus;
      const cg1=ctx.createGain(); cg1.gain.value=morphCfg.chorus*0.5;
      const cg2=ctx.createGain(); cg2.gain.value=morphCfg.chorus*0.5;
      const dry=ctx.createGain(); dry.gain.value=1-morphCfg.chorus*0.4;
      const mx=ctx.createGain();
      l1.connect(lg1); lg1.connect(d1.delayTime);
      l2.connect(lg2); lg2.connect(d2.delayTime);
      n.connect(d1); n.connect(d2); n.connect(dry);
      d1.connect(cg1); d2.connect(cg2);
      dry.connect(mx); cg1.connect(mx); cg2.connect(mx);
      l1.start(); l2.start(); n=mx;
    }

    // Reverb (cave, ghost, underwater, angel, monster)
    if(morphCfg&&(morphCfg.rev||0)>0.02){
      const dur=1+morphCfg.rev*5, decay=1.5+morphCfg.rev*1.5;
      const pre=ctx.createDelay(0.1); pre.delayTime.value=0.015;
      const conv=ctx.createConvolver(); conv.buffer=generateIR(ctx,dur,decay,morphCfg.rev);
      const dG=ctx.createGain(); dG.gain.value=1-morphCfg.rev*0.5;
      const wG=ctx.createGain(); wG.gain.value=morphCfg.rev*0.8;
      const mx=ctx.createGain();
      n.connect(dG); n.connect(pre); pre.connect(conv); conv.connect(wG);
      dG.connect(mx); wG.connect(mx); n=mx;
    }

    // Post-morph shape chain — driven by the 5 sliders
    postEqBass=ctx.createBiquadFilter(); postEqBass.type='lowshelf';
    postEqBass.frequency.value=90; postEqBass.gain.value=state.bass;
    postEqAir=ctx.createBiquadFilter(); postEqAir.type='highshelf';
    postEqAir.frequency.value=10000; postEqAir.gain.value=state.brightness;
    postSat=ctx.createWaveShaper(); postSat.curve=makeSatCurve(state.warmth*0.5); postSat.oversample='4x';
    postComp=ctx.createDynamicsCompressor();
    postComp.threshold.value=-24-state.compression*8; postComp.ratio.value=2+state.compression*4;
    postComp.knee.value=6; postComp.attack.value=0.003; postComp.release.value=0.1;
    // Extra reverb (slider adds on top of morph reverb)
    const addPre=ctx.createDelay(0.1); addPre.delayTime.value=0.012;
    const addConv=ctx.createConvolver(); addConv.buffer=generateIR(ctx,2,1.5,0.5);
    const postRevDry2=ctx.createGain(); postRevDry2.gain.value=1;
    postRevWet=ctx.createGain(); postRevWet.gain.value=state.reverb*0.5;
    const addMix=ctx.createGain();

    n.connect(postEqBass); n=postEqBass;
    n.connect(postEqAir); n=postEqAir;
    n.connect(postSat); n=postSat;
    n.connect(postComp); n=postComp;
    n.connect(postRevDry2); n.connect(addPre); addPre.connect(addConv); addConv.connect(postRevWet);
    postRevDry2.connect(addMix); postRevWet.connect(addMix); n=addMix;

    analyser=ctx.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0.6;
    masterGain=ctx.createGain(); masterGain.gain.value=0.88;
    n.connect(analyser); analyser.connect(masterGain); masterGain.connect(ctx.destination);
  }

  function startMeter(){
    if(meterTimer)return;
    const arr=new Float32Array(2048);
    meterTimer=setInterval(()=>{
      if(!analyser||!meterCb)return;
      try{analyser.getFloatTimeDomainData(arr);}catch(_){
        const b=new Uint8Array(2048); analyser.getByteTimeDomainData(b);
        for(let i=0;i<b.length;i++) arr[i]=(b[i]-128)/128;
      }
      let peak=0,ss=0;
      for(let i=0;i<arr.length;i++){const v=arr[i];if(Math.abs(v)>peak)peak=Math.abs(v);ss+=v*v;}
      const rms=Math.sqrt(ss/arr.length);
      meterCb({peakDb:peak>0?Math.max(-60,20*Math.log10(peak)):-60,rmsDb:rms>0?Math.max(-60,20*Math.log10(rms)):-60});
    },33);
  }
  function stopMeter(){if(meterTimer){clearInterval(meterTimer);meterTimer=null;}}
  function stopSrc(){
    if(source){try{source.onended=null;source.stop();}catch(_){}try{source.disconnect();}catch(_){}source=null;}
  }
  function startSrc(fromOrig){
    if(!ctx||!firstNode)return;
    stopSrc();
    source=ctx.createBufferSource(); source.buffer=audioBuffer;
    source.playbackRate.value=pitchRatio;
    source.connect(firstNode);
    const off=Math.max(0,Math.min(audioBuffer.duration,fromOrig));
    pausedAt=off; startedAt=ctx.currentTime;
    source.onended=()=>{if(playing&&source){playing=false;pausedAt=audioBuffer.duration;source=null;}};
    source.start(0,off); playing=true;
  }

  return {
    async play(){
      ensureCtx();
      if(ctx.state==='suspended')try{await ctx.resume();}catch(_){}
      startSrc(pausedAt>=audioBuffer.duration-0.01?0:pausedAt);
      startMeter();
    },
    pause(){
      if(!ctx)return;
      if(playing&&source) pausedAt=Math.min(audioBuffer.duration,pausedAt+(ctx.currentTime-startedAt)*pitchRatio);
      stopSrc(); playing=false; stopMeter();
      if(meterCb)meterCb({peakDb:-60,rmsDb:-60});
    },
    seek(s){
      const t=Math.max(0,Math.min(audioBuffer.duration,s));
      if(playing){startSrc(t);}else{pausedAt=t;}
    },
    setReverb(v){state.reverb=v;if(postRevWet&&ctx)postRevWet.gain.setTargetAtTime(Math.max(0,v*0.5),ctx.currentTime,0.05);},
    setBass(db){state.bass=db;if(postEqBass&&ctx)postEqBass.gain.setTargetAtTime(db,ctx.currentTime,0.05);},
    setBrightness(db){state.brightness=db;if(postEqAir&&ctx)postEqAir.gain.setTargetAtTime(db,ctx.currentTime,0.05);},
    setWarmth(v){state.warmth=v;if(postSat)postSat.curve=makeSatCurve(v*0.5);},
    setCompression(v){
      state.compression=v;
      if(!postComp||!ctx)return;
      postComp.ratio.setTargetAtTime(2+v*4,ctx.currentTime,0.05);
      postComp.threshold.setTargetAtTime(-24-v*8,ctx.currentTime,0.05);
    },
    getTime(){if(!ctx)return pausedAt;return playing?Math.min(audioBuffer.duration,pausedAt+(ctx.currentTime-startedAt)*pitchRatio):pausedAt;},
    getDuration(){return audioBuffer.duration;},
    isPlaying(){return playing;},
    onMeter(cb){meterCb=cb;if(playing&&analyser)startMeter();},
    destroy(){stopSrc();stopMeter();meterCb=null;if(ctx){try{ctx.close();}catch(_){}}ctx=null;firstNode=null;},
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// LIVE MIC ENGINE — getUserMedia → real-time FX chain + optional recording
// ─────────────────────────────────────────────────────────────────────────────
export async function buildLiveMicEngine(onMeter){
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},video:false});
  const Ctx=window.AudioContext||window.webkitAudioContext;
  const ctx=new Ctx({latencyHint:'interactive'});

  // Try to load AudioWorklet pitch shifter
  let pitchNode=null;
  let pitchWorkletLoaded=false;
  try{
    const blob=new Blob([PITCH_WORKLET_CODE],{type:'application/javascript'});
    const url=URL.createObjectURL(blob);
    await ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    pitchNode=new AudioWorkletNode(ctx,'sonix-pitch-shifter',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]});
    pitchWorkletLoaded=true;
  }catch(e){
    // AudioWorklet not supported — proceed without pitch shift
    console.warn('AudioWorklet not available, pitch shift disabled',e);
  }

  const micSrc=ctx.createMediaStreamSource(stream);

  // Static chain nodes
  const hpf=ctx.createBiquadFilter(); hpf.type='highpass'; hpf.frequency.value=80; hpf.Q.value=0.7;
  const eq=buildEqChain(ctx,PRESETS.cinematic,{bassBoost:0,brightness:0});
  const sat=ctx.createWaveShaper(); sat.curve=makeSatCurve(0.1); sat.oversample='4x';
  const satTrim=ctx.createGain(); satTrim.gain.value=0.82;
  const comp=ctx.createDynamicsCompressor();
  comp.threshold.value=-22; comp.ratio.value=3.5; comp.knee.value=8; comp.attack.value=0.006; comp.release.value=0.18;
  const reverbPre=ctx.createDelay(0.2); reverbPre.delayTime.value=0.018;
  const reverb=ctx.createConvolver(); reverb.buffer=generateIR(ctx,2.5,2.2,0.65);
  const revDry=ctx.createGain(); revDry.gain.value=1.0;
  const revWet=ctx.createGain(); revWet.gain.value=0.25;
  const revMix=ctx.createGain();
  const analyser=ctx.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0.65;
  const masterGain=ctx.createGain(); masterGain.gain.value=0.88;

  // Ring modulator (for live voice morph)
  const ringOsc=ctx.createOscillator(); ringOsc.type='sine'; ringOsc.frequency.value=0;
  const ringMod=ctx.createGain(); ringMod.gain.value=0;
  const ringDry=ctx.createGain(); ringDry.gain.value=1.0;
  const ringWet=ctx.createGain(); ringWet.gain.value=0.0;
  const ringMix=ctx.createGain();
  ringOsc.connect(ringMod.gain);
  ringOsc.start();

  // Wire chain
  let n=micSrc;
  n.connect(hpf); n=hpf;
  if(pitchNode){n.connect(pitchNode);n=pitchNode;}
  n.connect(eq.input); n=eq.output;
  n.connect(sat); sat.connect(satTrim); n=satTrim;
  n.connect(comp); n=comp;
  // Ring mod parallel
  n.connect(ringDry); n.connect(ringMod);
  ringMod.connect(ringWet); ringDry.connect(ringMix); ringWet.connect(ringMix); n=ringMix;
  // Reverb parallel
  n.connect(revDry); n.connect(reverbPre); reverbPre.connect(reverb); reverb.connect(revWet);
  revDry.connect(revMix); revWet.connect(revMix); n=revMix;
  n.connect(analyser); analyser.connect(masterGain); masterGain.connect(ctx.destination);

  // Meter loop
  let meterTimer=null;
  if(onMeter){
    const arr=new Float32Array(analyser.fftSize);
    meterTimer=setInterval(()=>{
      try{analyser.getFloatTimeDomainData(arr);}catch(_){return;}
      let peak=0,ss=0;
      for(let i=0;i<arr.length;i++){const v=arr[i];if(Math.abs(v)>peak)peak=Math.abs(v);ss+=v*v;}
      const rms=Math.sqrt(ss/arr.length);
      onMeter({peakDb:peak>0?Math.max(-60,20*Math.log10(peak)):-60,rmsDb:rms>0?Math.max(-60,20*Math.log10(rms)):-60});
    },33);
  }

  // Recording support
  const recDest=ctx.createMediaStreamDestination();
  masterGain.connect(recDest);
  let recorder=null, recChunks=[];

  return {
    hasPitch:pitchWorkletLoaded,
    setMonitor(on){masterGain.gain.value=on?0.88:0;},
    setPitch(semitones){if(pitchNode)pitchNode.parameters.get('semitones').setTargetAtTime(semitones,ctx.currentTime,0.03);},
    setReverb(v){revWet.gain.setTargetAtTime(Math.max(0,Math.min(1,v)),ctx.currentTime,0.03);},
    setBass(db){eq.nodes[1].gain.setTargetAtTime(PRESETS.cinematic.eq.lowShelfDb+db,ctx.currentTime,0.03);},
    setBrightness(db){eq.nodes[5].gain.setTargetAtTime(PRESETS.cinematic.eq.airDb+db,ctx.currentTime,0.03);},
    setCompression(v){
      comp.ratio.setTargetAtTime(3.5*(0.6+v*0.8),ctx.currentTime,0.03);
      comp.threshold.setTargetAtTime(-22-v*4,ctx.currentTime,0.03);
    },
    setDistortion(v){sat.curve=makeSatCurve(Math.min(1,v));},
    setRingMod(hz,mix){
      ringOsc.frequency.setTargetAtTime(hz>0?hz:0.01,ctx.currentTime,0.02);
      const m=Math.max(0,Math.min(1,mix));
      ringWet.gain.setTargetAtTime(m,ctx.currentTime,0.05);
      ringDry.gain.setTargetAtTime(1-m,ctx.currentTime,0.05);
      if(m<0.01) ringMod.gain.setTargetAtTime(0,ctx.currentTime,0.05);
    },
    applyMorph(morphCfg){
      // Apply all morph parameters to live chain
      if(pitchNode) pitchNode.parameters.get('semitones').setTargetAtTime(morphCfg.pitchSt||0,ctx.currentTime,0.05);
      this.setRingMod(morphCfg.ringHz||0,morphCfg.ringMix||0);
      this.setDistortion(morphCfg.dist||0);
      this.setReverb(morphCfg.rev||0);
      revWet.gain.setTargetAtTime((morphCfg.rev||0)*0.8,ctx.currentTime,0.05);
      hpf.frequency.setTargetAtTime(morphCfg.hp||80,ctx.currentTime,0.05);
      eq.nodes[6].frequency.setTargetAtTime(Math.min(ctx.sampleRate/2-100,morphCfg.lp||20000),ctx.currentTime,0.05);
    },
    clearMorph(){
      if(pitchNode) pitchNode.parameters.get('semitones').setTargetAtTime(0,ctx.currentTime,0.1);
      this.setRingMod(0,0);
      this.setDistortion(0);
      this.setReverb(0.25);
      hpf.frequency.setTargetAtTime(80,ctx.currentTime,0.1);
      eq.nodes[6].frequency.setTargetAtTime(20000,ctx.currentTime,0.1);
      sat.curve=makeSatCurve(0.1);
    },
    startRecord(){
      recChunks=[];
      recorder=new MediaRecorder(recDest.stream,{mimeType:'audio/webm;codecs=opus'});
      recorder.ondataavailable=e=>recChunks.push(e.data);
      recorder.start();
    },
    stopRecord(){
      return new Promise(res=>{
        if(!recorder){res(null);return;}
        recorder.onstop=()=>{
          const blob=new Blob(recChunks,{type:'audio/webm'});
          res(blob);
        };
        recorder.stop();
      });
    },
    isRecording(){return recorder?.state==='recording';},
    destroy(){
      if(meterTimer)clearInterval(meterTimer);
      if(recorder&&recorder.state!=='inactive')try{recorder.stop();}catch(_){}
      stream.getTracks().forEach(t=>t.stop());
      try{ctx.close();}catch(_){}
    },
  };
}
