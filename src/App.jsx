import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Upload, Music2, Film, Mic2, Waves, Sparkles, MessageSquare, Download,
  Play, Pause, X, Volume2, ChevronRight, Smartphone, Radio, Activity,
  Wand2, Settings2, RotateCcw, CheckCircle2, Music3, Scissors, Zap,
  Mic, MicOff, Circle, Square, Headphones, Sliders,
} from 'lucide-react';
import {
  decodeFile, analyzeAudio, buildRealtimeEngine, renderMaster,
  buildLiveMicEngine, PRESETS as ENGINE_PRESETS, PLATFORM_TARGETS,
  GENRE_CURVES, VOICE_MORPHS, parseVoiceMorphPrompt,
} from './audioProcessor.js';

// ── Preset UI metadata ────────────────────────────────────────
const PRESET_META = [
  { id:'cinematic', icon:Film,       color:'#a855f7', tag:'Pro'    },
  { id:'rich',      icon:Mic2,       color:'#f59e0b', tag:'Voice'  },
  { id:'dolby',     icon:Waves,      color:'#0ea5e9', tag:'Pro'    },
  { id:'instagram', icon:Music3,     color:'#ec4899', tag:'Social' },
  { id:'phone',     icon:Smartphone, color:'#10b981', tag:'Mobile' },
  { id:'auto',      icon:Sparkles,   color:'#22d3ee', tag:'AI'     },
];
const PLATFORM_META = [
  { id:'spotify',   icon:Music2,     short:'Spotify'   },
  { id:'apple',     icon:Music3,     short:'Apple'     },
  { id:'youtube',   icon:Play,       short:'YouTube'   },
  { id:'instagram', icon:Activity,   short:'Instagram' },
  { id:'tiktok',    icon:Waves,      short:'TikTok'    },
  { id:'cd',        icon:Radio,      short:'CD'        },
  { id:'phone',     icon:Smartphone, short:'Phone'     },
  { id:'broadcast', icon:Radio,      short:'Broadcast' },
];
const PRESET_SLIDER_DEFAULTS = {
  cinematic: { reverb:0.55, bass:2,  brightness:1,   warmth:0.30, compression:0.50, nr:0.30 },
  rich:      { reverb:0.22, bass:3,  brightness:0,   warmth:0.50, compression:0.75, nr:0.35 },
  dolby:     { reverb:0.60, bass:1,  brightness:2,   warmth:0.15, compression:0.35, nr:0.25 },
  instagram: { reverb:0.20, bass:1,  brightness:1.5, warmth:0.25, compression:0.70, nr:0.40 },
  phone:     { reverb:0.12, bass:0,  brightness:1,   warmth:0.20, compression:0.80, nr:0.40 },
  auto:      { reverb:0.35, bass:1,  brightness:0.5, warmth:0.25, compression:0.55, nr:0.30 },
  custom:    { reverb:0.35, bass:1,  brightness:0.5, warmth:0.25, compression:0.55, nr:0.30 },
};
const PLATFORM_PRESET_HINT = { spotify:'cinematic', apple:'cinematic', youtube:'cinematic', instagram:'instagram', tiktok:'instagram', cd:'rich', phone:'phone', broadcast:'rich' };
const QUICK_TAGS = ['cinematic reverb','deep bass','warm vintage','crisp','podcast voice','boxy phone','lo-fi'];

// ── Helpers ────────────────────────────────────────────────────
function fmtTime(s){ if(!Number.isFinite(s)||s<0)s=0; return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`; }
function fmtDb(v,d=1){ if(!Number.isFinite(v))return'—'; return`${v>=0?'+':''}${v.toFixed(d)}`; }
function fmtLufs(v){ if(!Number.isFinite(v)||v<=-69)return'—'; return v.toFixed(1); }
function approxEq(a,b){ return Math.abs(a-b)<0.06; }
function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }

// ── StatTile ──────────────────────────────────────────────────
function StatTile({label,value,sub,accent='#a78bfa'}){
  return(
    <div className="glass-soft" style={{padding:'14px 16px',minWidth:0}}>
      <p style={{color:'#64748b',fontSize:'0.65rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',margin:'0 0 6px'}}>{label}</p>
      <p className="mono" style={{color:'#f1f5f9',fontSize:'1.35rem',fontWeight:700,margin:0,lineHeight:1.1}}>{value}</p>
      {sub&&<p style={{color:accent,fontSize:'0.7rem',margin:'4px 0 0',fontWeight:500}}>{sub}</p>}
    </div>
  );
}

// ── VerticalSlider ────────────────────────────────────────────
function VerticalSlider({label,icon:Icon,value,min,max,step,onChange,displayValue,accent='#a855f7',modified=false,disabled=false}){
  const pct=((value-min)/(max-min))*100;
  return(
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'10px 6px',minWidth:0,opacity:disabled?0.4:1,transition:'opacity 0.2s ease'}}>
      <div style={{position:'relative',width:32,height:32,borderRadius:10,marginBottom:8,background:`${accent}1f`,display:'flex',alignItems:'center',justifyContent:'center',color:accent}}>
        <Icon size={15}/>
        {modified&&<div style={{position:'absolute',top:-3,right:-3,width:8,height:8,borderRadius:'50%',background:accent,boxShadow:`0 0 6px ${accent}`,border:'1.5px solid #05050f'}}/>}
      </div>
      <p style={{color:'#cbd5e1',fontSize:'0.72rem',margin:'0 0 4px',fontWeight:600,textAlign:'center'}}>{label}</p>
      <p className="mono" style={{color:'#f1f5f9',fontSize:'0.8rem',margin:'0 0 10px',fontWeight:700}}>{displayValue}</p>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e=>!disabled&&onChange(parseFloat(e.target.value))} disabled={disabled} style={{width:'100%',cursor:disabled?'not-allowed':'pointer'}} aria-label={label}/>
      <div style={{marginTop:6,width:'100%',height:3,background:'rgba(255,255,255,0.04)',borderRadius:2,overflow:'hidden'}}>
        <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${accent},#06b6d4)`,transition:'width 0.35s cubic-bezier(0.25,1,0.5,1)'}}/>
      </div>
    </div>
  );
}

// ── Error Boundary ────────────────────────────────────────────
class ErrorBoundary extends React.Component{
  constructor(p){super(p);this.state={err:null};}
  static getDerivedStateFromError(e){return{err:e};}
  render(){
    if(this.state.err){
      return(
        <div style={{minHeight:'100vh',background:'#05050f',display:'flex',alignItems:'center',justifyContent:'center',padding:24}}>
          <div style={{maxWidth:520,padding:28,borderRadius:16,background:'rgba(239,68,68,0.07)',border:'1px solid rgba(239,68,68,0.3)',color:'#f1f5f9'}}>
            <p style={{color:'#f87171',fontWeight:800,fontSize:'1.1rem',margin:'0 0 12px'}}>SONIX — something went wrong</p>
            <pre style={{color:'#94a3b8',fontSize:'0.75rem',whiteSpace:'pre-wrap',wordBreak:'break-all',margin:'0 0 16px'}}>{this.state.err?.message||String(this.state.err)}</pre>
            <button onClick={()=>{this.setState({err:null});window.location.reload();}} style={{padding:'9px 18px',borderRadius:9,background:'rgba(239,68,68,0.18)',border:'1px solid rgba(239,68,68,0.4)',color:'#fca5a5',cursor:'pointer',fontFamily:'inherit',fontWeight:700}}>Reload app</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Toast ─────────────────────────────────────────────────────
function Toast({message,color}){
  return(
    <div className="animate-fade-in" style={{position:'fixed',bottom:28,left:'50%',transform:'translateX(-50%)',padding:'10px 20px',borderRadius:999,zIndex:9999,background:'rgba(10,10,25,0.95)',backdropFilter:'blur(14px)',border:`1px solid ${color}40`,color:'#f1f5f9',fontSize:'0.82rem',fontWeight:600,whiteSpace:'nowrap',boxShadow:`0 0 24px ${color}30,0 8px 32px rgba(0,0,0,0.5)`,display:'flex',alignItems:'center',gap:8,pointerEvents:'none'}}>
      <span style={{width:8,height:8,borderRadius:'50%',background:color,display:'inline-block',boxShadow:`0 0 8px ${color}`}}/>
      {message}
    </div>
  );
}

// ── ModeTab ───────────────────────────────────────────────────
function ModeTab({id,label,icon:Icon,active,onClick,color}){
  return(
    <button onClick={()=>onClick(id)} style={{flex:1,padding:'10px 8px',borderRadius:12,border:`1.5px solid ${active?color+'50':'rgba(255,255,255,0.07)'}`,background:active?color+'12':'transparent',cursor:'pointer',fontFamily:'inherit',color:active?color:'#64748b',fontWeight:700,fontSize:'0.8rem',display:'flex',alignItems:'center',justifyContent:'center',gap:7,transition:'all 0.2s ease',boxShadow:active?`0 0 20px ${color}20`:'none'}}>
      <Icon size={14}/>{label}
    </button>
  );
}

// ── App ────────────────────────────────────────────────────────
function App(){
  const [mode,setMode]=useState('master'); // 'master' | 'live'

  // ── Master mode state ──────────────────────────────────────
  const [file,setFile]=useState(null);
  const [fileInfo,setFileInfo]=useState(null);
  const [audioBuffer,setAudioBuffer]=useState(null);
  const [analysis,setAnalysis]=useState(null);
  const [preset,setPreset]=useState('cinematic');
  const [platform,setPlatform]=useState('spotify');
  const [genre,setGenre]=useState('auto');
  const [customPrompt,setCustomPrompt]=useState('');
  const [showCustom,setShowCustom]=useState(false);
  const [reverbAmount,setReverbAmount]=useState(PRESET_SLIDER_DEFAULTS.cinematic.reverb);
  const [bassBoost,setBassBoost]=useState(PRESET_SLIDER_DEFAULTS.cinematic.bass);
  const [brightness,setBrightness]=useState(PRESET_SLIDER_DEFAULTS.cinematic.brightness);
  const [warmth,setWarmth]=useState(PRESET_SLIDER_DEFAULTS.cinematic.warmth);
  const [compression,setCompression]=useState(PRESET_SLIDER_DEFAULTS.cinematic.compression);
  const [noiseReduction,setNoiseReduction]=useState(PRESET_SLIDER_DEFAULTS.cinematic.nr);
  const [autoTrim,setAutoTrim]=useState(true);
  const [isPlaying,setIsPlaying]=useState(false);
  const [meter,setMeter]=useState({peakDb:-60,rmsDb:-60});
  const [position,setPosition]=useState(0);
  const [isDragging,setIsDragging]=useState(false);
  const [processing,setProcessing]=useState(false);
  const [progress,setProgress]=useState(0);
  const [progressStep,setProgressStep]=useState('');
  const [outputBlob,setOutputBlob]=useState(null);
  const [outputUrl,setOutputUrl]=useState(null);
  const [outputAnalysis,setOutputAnalysis]=useState(null);
  const [outputPlaying,setOutputPlaying]=useState(false);
  const [error,setError]=useState(null);

  // ── Live Mic state ──────────────────────────────────────────
  const [liveActive,setLiveActive]=useState(false);
  const [liveMeter,setLiveMeter]=useState({peakDb:-60,rmsDb:-60});
  const [liveRecording,setLiveRecording]=useState(false);
  const [liveRecUrl,setLiveRecUrl]=useState(null);
  const [liveMorph,setLiveMorph]=useState(null); // selected morph id or null
  const [liveMorphPrompt,setLiveMorphPrompt]=useState('');
  const [liveMonitor,setLiveMonitor]=useState(true);
  const [liveError,setLiveError]=useState(null);
  const [liveReverb,setLiveReverb]=useState(0.25);
  const [liveBass,setLiveBass]=useState(0);
  const [liveBrightness,setLiveBrightness]=useState(0);
  const [liveCompression,setLiveCompression]=useState(0.5);
  const [livePitch,setLivePitch]=useState(0);

  // ── Toast ───────────────────────────────────────────────────
  const [toast,setToast]=useState(null);
  const toastRef=useRef(null);

  // ── Refs ────────────────────────────────────────────────────
  const fileInputRef=useRef(null);
  const waveformRef=useRef(null);
  const engineRef=useRef(null);
  const posTimerRef=useRef(null);
  const outputAudioRef=useRef(null);
  const liveRecAudioRef=useRef(null);
  const prevOutUrlRef=useRef(null);
  const outputCardRef=useRef(null);
  const liveEngineRef=useRef(null);

  // ── Derived ─────────────────────────────────────────────────
  const platformTarget=PLATFORM_TARGETS[platform];
  const currentPresetMeta=PRESET_META.find(p=>p.id===preset);
  const currentPresetCfg=ENGINE_PRESETS[preset==='custom'?'auto':preset];
  const meterPct=useMemo(()=>Math.max(0,Math.min(100,(meter.peakDb+60)/60*100)),[meter.peakDb]);
  const ceilingPct=useMemo(()=>Math.max(0,Math.min(100,(platformTarget.peak+60)/60*100)),[platformTarget.peak]);
  const liveMeterPct=useMemo(()=>Math.max(0,Math.min(100,(liveMeter.peakDb+60)/60*100)),[liveMeter.peakDb]);
  const isClipping=meter.peakDb>-3;
  const isLiveClipping=liveMeter.peakDb>-3;
  const defs=PRESET_SLIDER_DEFAULTS[preset]||PRESET_SLIDER_DEFAULTS.auto;
  const anyModified=!approxEq(reverbAmount,defs.reverb)||!approxEq(bassBoost,defs.bass)||!approxEq(brightness,defs.brightness)||!approxEq(warmth,defs.warmth)||!approxEq(compression,defs.compression);

  // ── Toast helper ─────────────────────────────────────────────
  const showToast=useCallback((msg,color='#a855f7')=>{
    setToast({message:msg,color});
    if(toastRef.current)clearTimeout(toastRef.current);
    toastRef.current=setTimeout(()=>setToast(null),2200);
  },[]);

  // ── Keyboard shortcuts ────────────────────────────────────────
  useEffect(()=>{
    const h=(e)=>{
      const tag=e.target.tagName;
      if(tag==='INPUT'||tag==='TEXTAREA'||e.target.isContentEditable)return;
      if(e.code==='Space'||e.code==='KeyK'){e.preventDefault();if(audioBuffer)togglePlayback();}
      if(e.code==='Escape'){setError(null);setLiveError(null);}
    };
    window.addEventListener('keydown',h);
    return()=>window.removeEventListener('keydown',h);
  });

  // ── Auto-scroll to output ─────────────────────────────────────
  useEffect(()=>{if(outputBlob&&outputCardRef.current)setTimeout(()=>outputCardRef.current?.scrollIntoView({behavior:'smooth',block:'nearest'}),120);},[outputBlob]);

  // ── Cleanup ───────────────────────────────────────────────────
  useEffect(()=>()=>{
    if(posTimerRef.current)clearInterval(posTimerRef.current);
    if(prevOutUrlRef.current)URL.revokeObjectURL(prevOutUrlRef.current);
    if(engineRef.current)try{engineRef.current.destroy();}catch(_){}
    if(liveEngineRef.current)try{liveEngineRef.current.destroy();}catch(_){}
    if(toastRef.current)clearTimeout(toastRef.current);
  },[]);

  // ── Waveform ─────────────────────────────────────────────────
  const drawWaveform=useCallback((buf,posSec=-1)=>{
    const canvas=waveformRef.current;
    if(!canvas||!buf)return;
    const d=buf.getChannelData(0),ctx=canvas.getContext('2d');
    const W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);
    const amp=H/2;
    ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(0,amp);ctx.lineTo(W,amp);ctx.stroke();
    const g=ctx.createLinearGradient(0,0,W,0);
    g.addColorStop(0,'#a855f7');g.addColorStop(0.5,'#c084fc');g.addColorStop(1,'#06b6d4');
    ctx.strokeStyle=g;ctx.lineWidth=1.4;ctx.globalAlpha=0.9;
    const step=Math.max(1,Math.floor(d.length/W));
    ctx.beginPath();
    for(let i=0;i<W;i++){
      let mn=1,mx=-1;
      for(let j=0;j<step;j++){const v=d[i*step+j]||0;if(v<mn)mn=v;if(v>mx)mx=v;}
      ctx.moveTo(i,(1+mn)*amp);ctx.lineTo(i,(1+mx)*amp);
    }
    ctx.stroke();ctx.globalAlpha=1;
    if(posSec>=0&&buf.duration>0){
      const x=(posSec/buf.duration)*W;
      ctx.strokeStyle='rgba(255,255,255,0.65)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
      ctx.fillStyle='#a855f7';ctx.beginPath();ctx.arc(x,amp,4,0,Math.PI*2);ctx.fill();
    }
  },[]);

  useEffect(()=>{if(audioBuffer&&isPlaying)drawWaveform(audioBuffer,position);},[position,isPlaying,audioBuffer,drawWaveform]);

  // ── Engine teardown ───────────────────────────────────────────
  const teardownEngine=useCallback(()=>{
    if(posTimerRef.current){clearInterval(posTimerRef.current);posTimerRef.current=null;}
    if(engineRef.current){try{engineRef.current.destroy();}catch(_){};engineRef.current=null;}
    setIsPlaying(false);setMeter({peakDb:-60,rmsDb:-60});setPosition(0);
  },[]);

  // ── Apply slider defaults ────────────────────────────────────
  const applySliderDefaults=useCallback((id,silent=false)=>{
    const d=PRESET_SLIDER_DEFAULTS[id]||PRESET_SLIDER_DEFAULTS.auto;
    setReverbAmount(d.reverb);setBassBoost(d.bass);setBrightness(d.brightness);
    setWarmth(d.warmth);setCompression(d.compression);setNoiseReduction(d.nr);
    const eng=engineRef.current;
    if(eng){eng.setReverb(d.reverb);eng.setBass(d.bass);eng.setBrightness(d.brightness);eng.setWarmth(d.warmth);eng.setCompression(d.compression);}
    if(!silent){const cfg=ENGINE_PRESETS[id==='custom'?'auto':id];showToast(`${cfg?.name||'Custom'} defaults loaded`,PRESET_META.find(p=>p.id===id)?.color||'#a855f7');}
  },[showToast]);

  // ── File handling (master) ────────────────────────────────────
  const handleFile=useCallback(async(f)=>{
    if(!f)return;
    setError(null);setOutputBlob(null);setOutputAnalysis(null);
    if(prevOutUrlRef.current){URL.revokeObjectURL(prevOutUrlRef.current);prevOutUrlRef.current=null;}
    setOutputUrl(null);teardownEngine();
    setFile(f);setFileInfo({name:f.name,size:(f.size/1048576).toFixed(2)});
    setAnalysis(null);setAudioBuffer(null);
    try{
      const buf=await decodeFile(f);
      setAudioBuffer(buf);
      setFileInfo(prev=>({...prev,durationStr:fmtTime(buf.duration)}));
      setTimeout(()=>drawWaveform(buf),30);
      const a=await analyzeAudio(buf);setAnalysis(a);
      const eng=buildRealtimeEngine(buf);
      engineRef.current=eng;
      eng.onMeter(m=>setMeter(m));
      eng.setPreset(preset);eng.setReverb(reverbAmount);eng.setBass(bassBoost);
      eng.setBrightness(brightness);eng.setWarmth(warmth);eng.setCompression(compression);
    }catch(err){console.error(err);setError('Could not decode this file. Try mp3, wav, m4a, flac, ogg.');}
  },[drawWaveform,preset,reverbAmount,bassBoost,brightness,warmth,compression,teardownEngine]);

  const handleDrop=useCallback((e)=>{e.preventDefault();setIsDragging(false);const f=e.dataTransfer.files[0];if(f)handleFile(f);},[handleFile]);
  const clearFile=()=>{
    teardownEngine();setFile(null);setFileInfo(null);setAudioBuffer(null);setAnalysis(null);
    setOutputBlob(null);setOutputAnalysis(null);
    if(prevOutUrlRef.current){URL.revokeObjectURL(prevOutUrlRef.current);prevOutUrlRef.current=null;}
    setOutputUrl(null);setError(null);
  };

  // ── Preset / platform change ──────────────────────────────────
  const handlePresetChange=useCallback((id)=>{
    setPreset(id);applySliderDefaults(id,false);
    if(id==='custom'){setShowCustom(true);engineRef.current?.setPreset('auto');}
    else{setShowCustom(false);engineRef.current?.setPreset(id);}
  },[applySliderDefaults]);

  const handlePlatformChange=useCallback((id)=>{
    setPlatform(id);
    const s=PLATFORM_PRESET_HINT[id];
    if(s&&s!==preset)showToast(`Tip: Try "${ENGINE_PRESETS[s]?.name}" for ${PLATFORM_TARGETS[id].label}`,'#64748b');
  },[preset,showToast]);

  // ── Slider → engine live ──────────────────────────────────────
  useEffect(()=>{engineRef.current?.setReverb(reverbAmount);},[reverbAmount]);
  useEffect(()=>{engineRef.current?.setBass(bassBoost);},[bassBoost]);
  useEffect(()=>{engineRef.current?.setBrightness(brightness);},[brightness]);
  useEffect(()=>{engineRef.current?.setWarmth(warmth);},[warmth]);
  useEffect(()=>{engineRef.current?.setCompression(compression);},[compression]);

  // ── Playback ──────────────────────────────────────────────────
  const togglePlayback=async()=>{
    if(!engineRef.current)return;
    if(isPlaying){
      engineRef.current.pause();setIsPlaying(false);
      if(posTimerRef.current){clearInterval(posTimerRef.current);posTimerRef.current=null;}
      if(audioBuffer)drawWaveform(audioBuffer,position);
    }else{
      try{await engineRef.current.play();}catch(e){console.error(e);return;}
      setIsPlaying(true);
      posTimerRef.current=setInterval(()=>{
        const t=engineRef.current?engineRef.current.getTime():0;
        setPosition(t);
        if(engineRef.current&&!engineRef.current.isPlaying()){
          setIsPlaying(false);clearInterval(posTimerRef.current);posTimerRef.current=null;
          if(audioBuffer)drawWaveform(audioBuffer,0);
        }
      },60);
    }
  };

  const handleSeek=(e)=>{
    const p=parseFloat(e.target.value);setPosition(p);
    engineRef.current?.seek(p);if(audioBuffer)drawWaveform(audioBuffer,p);
  };

  // ── Render master ─────────────────────────────────────────────
  const handleRender=async()=>{
    if(!audioBuffer)return;
    if(preset==='custom'&&!customPrompt.trim()){setError('Please describe the sound you want.');return;}
    setError(null);setProcessing(true);setProgress(0);setProgressStep('Preparing...');
    if(prevOutUrlRef.current){URL.revokeObjectURL(prevOutUrlRef.current);prevOutUrlRef.current=null;}
    setOutputBlob(null);setOutputUrl(null);setOutputAnalysis(null);
    if(isPlaying){engineRef.current?.pause();setIsPlaying(false);if(posTimerRef.current){clearInterval(posTimerRef.current);posTimerRef.current=null;}}
    try{
      const cfg={preset,customPrompt,platform,genre,reverbAmount,bassBoost,brightness,warmth,compression,noiseReduction,autoTrim,trimRange:autoTrim?(analysis?.suggestedTrim||null):null};
      const blob=await renderMaster(audioBuffer,cfg,(p,l)=>{setProgress(p);if(l)setProgressStep(l);});
      const url=URL.createObjectURL(blob);prevOutUrlRef.current=url;
      setOutputBlob(blob);setOutputUrl(url);setOutputAnalysis({lufs:blob.__lufs,peak:blob.__peak});
      setProgress(100);setProgressStep('Done');showToast('Master complete — ready to download','#10b981');
    }catch(err){console.error(err);setError('Mastering failed. '+(err?.message||'Please try again.'));}
    finally{setProcessing(false);}
  };

  const handleDownload=()=>{
    if(!outputUrl)return;
    const a=document.createElement('a');a.href=outputUrl;
    a.download=(file?.name.replace(/\.[^.]+$/,'')||'audio')+'_mastered.wav';
    document.body.appendChild(a);a.click();document.body.removeChild(a);
  };

  // ── Live Mic ──────────────────────────────────────────────────
  const startLive=async()=>{
    setLiveError(null);
    try{
      const eng=await buildLiveMicEngine(m=>setLiveMeter(m));
      liveEngineRef.current=eng;
      eng.setMonitor(liveMonitor);
      setLiveActive(true);
      showToast('Live mic active','#10b981');
      if(!eng.hasPitch)showToast('Pitch shift requires modern browser','#f59e0b');
    }catch(err){
      console.error(err);
      setLiveError('Could not access microphone. Please allow microphone permission and try again.');
    }
  };

  const stopLive=async()=>{
    if(liveRecording)await handleStopRecord();
    if(liveEngineRef.current){try{liveEngineRef.current.destroy();}catch(_){};liveEngineRef.current=null;}
    setLiveActive(false);setLiveMeter({peakDb:-60,rmsDb:-60});setLiveRecording(false);
  };

  const handleStartRecord=()=>{
    if(!liveEngineRef.current)return;
    liveEngineRef.current.startRecord();setLiveRecording(true);
    showToast('Recording started','#ef4444');
  };

  const handleStopRecord=async()=>{
    if(!liveEngineRef.current)return;
    const blob=await liveEngineRef.current.stopRecord();
    setLiveRecording(false);
    if(blob){
      if(liveRecUrl)URL.revokeObjectURL(liveRecUrl);
      setLiveRecUrl(URL.createObjectURL(blob));
      showToast('Recording saved','#10b981');
    }
  };

  const applyLiveMorph=(id)=>{
    const eng=liveEngineRef.current;
    if(!eng)return;
    if(id===liveMorph){
      setLiveMorph(null);eng.clearMorph();showToast('Morph cleared','#64748b');return;
    }
    setLiveMorph(id);
    const cfg=VOICE_MORPHS[id];
    eng.applyMorph(cfg);
    showToast(`${cfg.emoji} ${cfg.name} active`,cfg.color||'#a855f7');
  };

  const applyLivePromptMorph=()=>{
    if(!liveMorphPrompt.trim()||!liveEngineRef.current)return;
    const cfg=parseVoiceMorphPrompt(liveMorphPrompt);
    liveEngineRef.current.applyMorph(cfg);
    setLiveMorph('custom');
    showToast('Custom morph applied','#22d3ee');
  };

  // Live slider → engine
  useEffect(()=>{liveEngineRef.current?.setReverb(liveReverb);},[liveReverb]);
  useEffect(()=>{liveEngineRef.current?.setBass(liveBass);},[liveBass]);
  useEffect(()=>{liveEngineRef.current?.setBrightness(liveBrightness);},[liveBrightness]);
  useEffect(()=>{liveEngineRef.current?.setCompression(liveCompression);},[liveCompression]);
  useEffect(()=>{liveEngineRef.current?.setPitch(livePitch);},[livePitch]);
  useEffect(()=>{if(liveEngineRef.current)liveEngineRef.current.setMonitor(liveMonitor);},[liveMonitor]);

  // Trim suggestion
  const trimSuggestion=useMemo(()=>{
    if(!analysis||!audioBuffer)return null;
    const head=analysis.suggestedTrim.start, tail=audioBuffer.duration-analysis.suggestedTrim.end;
    if(head<0.2&&tail<0.2)return null;
    const parts=[];
    if(head>=0.2)parts.push(`${head.toFixed(1)}s start`);
    if(tail>=0.2)parts.push(`${tail.toFixed(1)}s end`);
    return parts.join(', ');
  },[analysis,audioBuffer]);

  // ── Render ────────────────────────────────────────────────────
  return(
    <div className="min-h-screen text-white" style={{background:'#05050f',minHeight:'100vh'}}>
      {toast&&<Toast message={toast.message} color={toast.color}/>}

      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="orb-1" style={{position:'absolute',top:'-8%',left:'20%',width:520,height:520,background:'radial-gradient(circle,rgba(168,85,247,0.18) 0%,transparent 70%)',borderRadius:'50%',filter:'blur(50px)'}}/>
        <div className="orb-2" style={{position:'absolute',bottom:'-5%',right:'12%',width:460,height:460,background:'radial-gradient(circle,rgba(6,182,212,0.14) 0%,transparent 70%)',borderRadius:'50%',filter:'blur(40px)'}}/>
        <div className="orb-3" style={{position:'absolute',top:'38%',left:'-8%',width:380,height:380,background:'radial-gradient(circle,rgba(236,72,153,0.12) 0%,transparent 70%)',borderRadius:'50%',filter:'blur(40px)'}}/>
      </div>

      <div className="relative" style={{maxWidth:900,margin:'0 auto',padding:'36px 18px 60px'}}>

        {/* Header */}
        <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:14,background:'linear-gradient(135deg,#a855f7,#06b6d4)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 0 28px rgba(168,85,247,0.5)'}}>
              <Volume2 size={22}/>
            </div>
            <div>
              <h1 className="gradient-text" style={{fontSize:'1.9rem',fontWeight:900,letterSpacing:'-0.03em',margin:0,lineHeight:1}}>SONIX</h1>
              <p style={{color:'#64748b',fontSize:'0.75rem',margin:'3px 0 0',fontWeight:500}}>Studio-grade AI audio mastering & live mic processing</p>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {liveActive&&<div className="animate-fade-in" style={{padding:'5px 10px',borderRadius:999,background:'rgba(239,68,68,0.15)',border:'1px solid rgba(239,68,68,0.4)',color:'#f87171',fontSize:'0.68rem',fontWeight:700,display:'flex',alignItems:'center',gap:5}}><span style={{width:6,height:6,borderRadius:'50%',background:'#ef4444',display:'inline-block',animation:'pulse-ring 1.2s infinite'}}/>LIVE</div>}
            {audioBuffer&&!liveActive&&<div className="animate-fade-in" style={{padding:'5px 10px',borderRadius:999,background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',color:'#34d399',fontSize:'0.68rem',fontWeight:600,display:'flex',alignItems:'center',gap:5}}><span style={{width:6,height:6,borderRadius:'50%',background:'#34d399',display:'inline-block'}}/>Ready</div>}
            <div style={{padding:'6px 12px',borderRadius:999,background:'rgba(168,85,247,0.12)',border:'1px solid rgba(168,85,247,0.25)',color:'#c4b5fd',fontSize:'0.7rem',fontWeight:700,display:'flex',alignItems:'center',gap:6}}>
              <span className="pulse-dot"/>v3.0 · Pro
            </div>
          </div>
        </header>

        {/* Mode tabs */}
        <div style={{display:'flex',gap:8,marginBottom:24}}>
          <ModeTab id="master" label="Master"   icon={Sliders} active={mode==='master'} onClick={setMode} color="#a855f7"/>
          <ModeTab id="live"   label="Live Mic" icon={Mic}     active={mode==='live'}   onClick={setMode} color="#10b981"/>
        </div>

        {/* ══════════════════════════════════ MASTER MODE ══════════════════════════════════ */}
        {mode==='master'&&(
          <>
            {/* Upload Zone */}
            <div onDragOver={e=>{e.preventDefault();setIsDragging(true);}} onDragLeave={()=>setIsDragging(false)} onDrop={handleDrop} onClick={()=>!file&&fileInputRef.current?.click()} style={{borderRadius:20,border:`2px ${isDragging?'solid':'dashed'} ${isDragging?'#a855f7':file?'rgba(168,85,247,0.3)':'rgba(255,255,255,0.1)'}`,background:isDragging?'rgba(168,85,247,0.08)':file?'rgba(168,85,247,0.04)':'transparent',cursor:file?'default':'pointer',transition:'all 0.25s ease',boxShadow:isDragging?'0 0 0 1px #a855f7,0 0 40px rgba(168,85,247,0.25)':'none',marginBottom:24}}>
              <input ref={fileInputRef} type="file" accept="audio/*" style={{display:'none'}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
              {!file?(
                <div style={{padding:'44px 28px',textAlign:'center'}}>
                  <div style={{width:60,height:60,borderRadius:18,margin:'0 auto 16px',background:isDragging?'rgba(168,85,247,0.25)':'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center',transform:isDragging?'scale(1.1)':'scale(1)',transition:'all 0.2s ease'}}>
                    <Upload size={26} color={isDragging?'#c4b5fd':'#475569'}/>
                  </div>
                  <p style={{color:'#e2e8f0',fontWeight:600,fontSize:'1rem',margin:'0 0 6px'}}>{isDragging?'Release to upload':'Drop your audio here'}</p>
                  <p style={{color:'#475569',fontSize:'0.82rem',margin:0}}>or click to browse · mp3, wav, m4a, flac, ogg, aac</p>
                </div>
              ):(
                <div style={{padding:20}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                    <div style={{display:'flex',alignItems:'center',gap:12,minWidth:0}}>
                      <div style={{width:36,height:36,borderRadius:10,flexShrink:0,background:'rgba(168,85,247,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}><Music2 size={16} color="#c4b5fd"/></div>
                      <div style={{minWidth:0}}>
                        <p style={{color:'#e2e8f0',fontWeight:600,fontSize:'0.9rem',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{fileInfo?.name}</p>
                        <p style={{color:'#475569',fontSize:'0.72rem',margin:0}}>{fileInfo?.size} MB{fileInfo?.durationStr?` · ${fileInfo.durationStr}`:''}{analysis&&<span style={{color:'#a855f7',marginLeft:8}}>· analyzed</span>}</p>
                      </div>
                    </div>
                    <button onClick={e=>{e.stopPropagation();clearFile();}} style={{width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,0.05)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',color:'#64748b',transition:'all 0.15s ease'}} onMouseOver={e=>{e.currentTarget.style.background='rgba(239,68,68,0.15)';e.currentTarget.style.color='#f87171';}} onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,0.05)';e.currentTarget.style.color='#64748b';}}><X size={14}/></button>
                  </div>
                  <canvas ref={waveformRef} width={800} height={68} style={{width:'100%',height:68,borderRadius:10,background:'rgba(0,0,0,0.3)',display:'block',cursor:'pointer'}} onClick={e=>{if(!audioBuffer)return;const r=e.currentTarget.getBoundingClientRect();const p=(e.clientX-r.left)/r.width;const t=p*audioBuffer.duration;setPosition(t);engineRef.current?.seek(t);drawWaveform(audioBuffer,t);}}/>
                  <p style={{color:'#334155',fontSize:'0.66rem',margin:'6px 0 0',textAlign:'center'}}>Click waveform to seek · Space to play/pause</p>
                </div>
              )}
            </div>

            {/* Analysis */}
            {analysis&&audioBuffer&&(
              <div className="glass animate-fade-in" style={{padding:20,marginBottom:24}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                  <p style={{color:'#94a3b8',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',margin:0,display:'flex',alignItems:'center',gap:8}}><Activity size={12}/>Source Analysis</p>
                  <span style={{color:'#475569',fontSize:'0.7rem'}}>Analyzed in {(analysis.analysisMs/1000).toFixed(2)}s</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:14}}>
                  <StatTile label="Loudness" value={`${fmtLufs(analysis.lufs)} LUFS`} sub={`Target: ${platformTarget.lufs} LUFS`} accent={Math.abs(analysis.lufs-platformTarget.lufs)<2?'#34d399':'#fb923c'}/>
                  <StatTile label="True Peak" value={`${fmtDb(analysis.truePeakDbtp)} dBTP`} sub={analysis.truePeakDbtp>platformTarget.peak?'Will be limited':'Headroom OK'} accent={analysis.truePeakDbtp>platformTarget.peak?'#fb923c':'#34d399'}/>
                  <StatTile label="Noise Floor" value={`${analysis.noiseFloorDb.toFixed(1)} dB`} sub={analysis.noiseFloorDb>-40?'Noisy — denoise on':'Clean'} accent={analysis.noiseFloorDb>-40?'#fb923c':'#34d399'}/>
                </div>
                {trimSuggestion&&(
                  <label style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,background:'rgba(168,85,247,0.06)',border:'1px solid rgba(168,85,247,0.15)',cursor:'pointer'}}>
                    <Scissors size={14} color="#c4b5fd"/>
                    <span style={{color:'#cbd5e1',fontSize:'0.82rem',flex:1}}>Found {trimSuggestion} of silence — auto-trim {autoTrim?'ON':'OFF'}</span>
                    <input type="checkbox" checked={autoTrim} onChange={e=>setAutoTrim(e.target.checked)} style={{accentColor:'#a855f7',cursor:'pointer'}}/>
                  </label>
                )}
              </div>
            )}

            {/* Preset Grid */}
            <div style={{marginBottom:24}}>
              <p style={{color:'#94a3b8',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:8}}><Wand2 size={12}/>Choose your sound</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(138px,1fr))',gap:10}}>
                {PRESET_META.map(p=>{
                  const cfg=ENGINE_PRESETS[p.id]; if(!cfg)return null;
                  const Icon=p.icon,active=preset===p.id;
                  return(
                    <button key={p.id} onClick={()=>handlePresetChange(p.id)} className="lift" style={{padding:'14px 12px',borderRadius:16,border:`1.5px solid ${active?p.color+'70':'rgba(255,255,255,0.07)'}`,background:active?p.color+'14':'rgba(255,255,255,0.02)',cursor:'pointer',textAlign:'left',transition:'all 0.2s ease',boxShadow:active?`0 0 26px ${p.color}26`:'none',position:'relative',fontFamily:'inherit'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                        <div style={{width:32,height:32,borderRadius:9,background:active?p.color+'28':'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center'}}><Icon size={15} color={active?p.color:'#64748b'}/></div>
                        <span style={{fontSize:'0.6rem',fontWeight:700,padding:'2px 7px',borderRadius:999,background:p.color+'20',color:p.color}}>{p.tag}</span>
                      </div>
                      <p style={{color:active?'#f1f5f9':'#cbd5e1',fontWeight:700,fontSize:'0.82rem',margin:'0 0 4px'}}>{cfg.name}</p>
                      <p style={{color:'#64748b',fontSize:'0.7rem',margin:0,lineHeight:1.35}}>{cfg.desc}</p>
                      {active&&<div style={{position:'absolute',bottom:10,right:10,width:6,height:6,borderRadius:'50%',background:p.color,boxShadow:`0 0 8px ${p.color}`}}/>}
                    </button>
                  );
                })}
                <button onClick={()=>handlePresetChange('custom')} className="lift" style={{padding:'14px 12px',borderRadius:16,border:`1.5px solid ${preset==='custom'?'rgba(244,114,182,0.5)':'rgba(255,255,255,0.07)'}`,background:preset==='custom'?'rgba(244,114,182,0.08)':'rgba(255,255,255,0.02)',cursor:'pointer',textAlign:'left',fontFamily:'inherit',boxShadow:preset==='custom'?'0 0 26px rgba(244,114,182,0.2)':'none'}}>
                  <div style={{width:32,height:32,borderRadius:9,marginBottom:10,background:preset==='custom'?'rgba(244,114,182,0.25)':'rgba(255,255,255,0.05)',display:'flex',alignItems:'center',justifyContent:'center'}}><MessageSquare size={15} color={preset==='custom'?'#f472b6':'#64748b'}/></div>
                  <p style={{color:'#cbd5e1',fontWeight:700,fontSize:'0.82rem',margin:'0 0 4px'}}>Custom Prompt</p>
                  <p style={{color:'#64748b',fontSize:'0.7rem',margin:0,lineHeight:1.35}}>Describe the sound you want</p>
                </button>
              </div>
            </div>

            {/* Platform target */}
            <div style={{marginBottom:24}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <p style={{color:'#94a3b8',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',margin:0,display:'flex',alignItems:'center',gap:8}}><Settings2 size={12}/>Platform target</p>
                <span className="mono" style={{color:'#c4b5fd',fontSize:'0.78rem',fontWeight:600,transition:'all 0.2s ease'}}>{platformTarget.lufs} LUFS · {platformTarget.peak} dBTP</span>
              </div>
              <div className="segmented" style={{flexWrap:'wrap'}}>
                {PLATFORM_META.map(p=>{
                  const Icon=p.icon,active=platform===p.id;
                  return<button key={p.id} className={active?'active':''} onClick={()=>handlePlatformChange(p.id)} title={`${PLATFORM_TARGETS[p.id].label} — ${PLATFORM_TARGETS[p.id].lufs} LUFS`}><span style={{display:'inline-flex',alignItems:'center',gap:5}}><Icon size={11}/><span>{p.short}</span></span></button>;
                })}
              </div>
            </div>

            {/* Genre EQ Curve */}
            <div style={{marginBottom:24}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <p style={{color:'#94a3b8',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',margin:0,display:'flex',alignItems:'center',gap:8}}><Music2 size={12}/>Genre EQ curve</p>
                <span style={{color:'#c4b5fd',fontSize:'0.72rem',fontWeight:600}}>{GENRE_CURVES[genre]?.emoji} {GENRE_CURVES[genre]?.name}</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:6}}>
                {Object.entries(GENRE_CURVES).map(([id,g])=>{
                  const active=genre===id;
                  return(
                    <button key={id} onClick={()=>setGenre(id)} style={{padding:'8px 6px',borderRadius:10,border:`1.5px solid ${active?'rgba(34,211,238,0.55)':'rgba(255,255,255,0.07)'}`,background:active?'rgba(34,211,238,0.10)':'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all 0.15s ease',boxShadow:active?'0 0 14px rgba(34,211,238,0.2)':'none'}}>
                      <div style={{fontSize:'1.1rem',marginBottom:2}}>{g.emoji}</div>
                      <p style={{color:active?'#67e8f9':'#94a3b8',fontWeight:700,fontSize:'0.62rem',margin:0,lineHeight:1.2}}>{g.name}</p>
                    </button>
                  );
                })}
              </div>
              {genre!=='auto'&&(
                <div style={{marginTop:8,padding:'6px 10px',borderRadius:8,background:'rgba(34,211,238,0.06)',border:'1px solid rgba(34,211,238,0.12)'}}>
                  <p style={{color:'#67e8f9',fontSize:'0.7rem',margin:0}}>
                    <strong>{GENRE_CURVES[genre].name}</strong>
                    {GENRE_CURVES[genre].sub>0&&` · Sub +${GENRE_CURVES[genre].sub}dB`}
                    {GENRE_CURVES[genre].bass>0&&` · Bass +${GENRE_CURVES[genre].bass}dB`}
                    {GENRE_CURVES[genre].loMid<0&&` · LoMid ${GENRE_CURVES[genre].loMid}dB`}
                    {GENRE_CURVES[genre].mid!==0&&` · Mid ${GENRE_CURVES[genre].mid>0?'+':''}${GENRE_CURVES[genre].mid}dB`}
                    {GENRE_CURVES[genre].pres>0&&` · Pres +${GENRE_CURVES[genre].pres}dB`}
                    {GENRE_CURVES[genre].air>0&&` · Air +${GENRE_CURVES[genre].air}dB`}
                  </p>
                </div>
              )}
            </div>

            {/* Real-time panel */}
            <div className="glass" style={{padding:20,marginBottom:24}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,flexWrap:'wrap',gap:8}}>
                <p style={{color:'#94a3b8',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',margin:0,display:'flex',alignItems:'center',gap:8}}><Activity size={12}/>Real-time preview & shape</p>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  {anyModified&&<span className="animate-fade-in" style={{fontSize:'0.66rem',fontWeight:600,padding:'2px 8px',borderRadius:999,background:'rgba(251,146,60,0.12)',color:'#fb923c',border:'1px solid rgba(251,146,60,0.2)'}}>Modified</span>}
                  <span style={{fontSize:'0.68rem',fontWeight:600,padding:'3px 10px',borderRadius:999,background:(currentPresetMeta?.color||'#a855f7')+'18',color:currentPresetMeta?.color||'#c4b5fd',border:`1px solid ${(currentPresetMeta?.color||'#a855f7')}30`}}>{currentPresetCfg?.name||'Custom'}</span>
                  <button onClick={()=>applySliderDefaults(preset,false)} title="Reset to preset defaults" style={{width:26,height:26,borderRadius:8,border:'none',background:'rgba(255,255,255,0.04)',color:'#64748b',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.15s ease'}} onMouseOver={e=>{e.currentTarget.style.background='rgba(255,255,255,0.1)';e.currentTarget.style.color='#c4b5fd';}} onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='#64748b';}}><RotateCcw size={12}/></button>
                </div>
              </div>

              {!audioBuffer&&<div style={{textAlign:'center',padding:'12px 0 4px',color:'#334155',fontSize:'0.8rem',display:'flex',alignItems:'center',justifyContent:'center',gap:8}}><Upload size={14} color="#334155"/>Upload audio to enable live preview</div>}

              {/* Transport */}
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
                <button onClick={togglePlayback} disabled={!audioBuffer} className={isPlaying?'animate-pulse-ring':''} style={{width:50,height:50,borderRadius:'50%',flexShrink:0,background:audioBuffer?'linear-gradient(135deg,#a855f7,#06b6d4)':'rgba(255,255,255,0.05)',border:'none',cursor:audioBuffer?'pointer':'not-allowed',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',boxShadow:audioBuffer?'0 0 22px rgba(168,85,247,0.4)':'none',transition:'all 0.2s ease'}} title={audioBuffer?'Play / Pause (Space)':'Upload audio first'}>
                  {isPlaying?<Pause size={20}/>:<Play size={20} style={{marginLeft:3}}/>}
                </button>
                <div style={{flex:1,minWidth:0}}>
                  <input type="range" min={0} max={audioBuffer?audioBuffer.duration:1} step={0.05} value={position} onChange={handleSeek} disabled={!audioBuffer} style={{width:'100%',cursor:audioBuffer?'pointer':'default'}}/>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                    <span className="mono" style={{color:'#64748b',fontSize:'0.72rem'}}>{fmtTime(position)}</span>
                    <span className="mono" style={{color:'#64748b',fontSize:'0.72rem'}}>{fmtTime(audioBuffer?.duration||0)}</span>
                  </div>
                </div>
              </div>

              {/* Meter */}
              <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:18}}>
                <div style={{flex:1}}>
                  <div className="meter-track">
                    <div className="meter-fill" style={{width:`${meterPct}%`}}/>
                    <div className="meter-ceiling" style={{left:`${ceilingPct}%`}} title={`${platformTarget.peak} dBTP ceiling`}/>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                    {['-60','-30','-12','-3','0 dB'].map(l=><span key={l} className="mono" style={{color:'#475569',fontSize:'0.66rem'}}>{l}</span>)}
                  </div>
                </div>
                <div style={{textAlign:'right',minWidth:90}}>
                  <p className="mono" style={{color:isClipping?'#ef4444':'#f1f5f9',fontSize:'1.3rem',fontWeight:700,margin:0,lineHeight:1,transition:'color 0.1s ease',textShadow:isClipping?'0 0 12px rgba(239,68,68,0.6)':'none'}}>{fmtDb(meter.peakDb)} dB</p>
                  <p style={{color:isClipping?'#ef4444':'#64748b',fontSize:'0.66rem',margin:'2px 0 0',fontWeight:600,transition:'color 0.1s ease'}}>{isClipping?'Clipping!':'Live peak'}</p>
                </div>
              </div>

              {/* Sliders */}
              <div className="slider-grid" style={{padding:'12px 6px',background:'rgba(0,0,0,0.2)',borderRadius:14,marginBottom:12}}>
                <VerticalSlider label="Reverb"     icon={Waves}    value={reverbAmount} min={0}  max={1}  step={0.01} onChange={setReverbAmount} displayValue={`${Math.round(reverbAmount*100)}%`}     accent="#a855f7" modified={!approxEq(reverbAmount,defs.reverb)} disabled={!audioBuffer}/>
                <VerticalSlider label="Bass"       icon={Volume2}  value={bassBoost}    min={-6} max={10} step={0.5}  onChange={setBassBoost}    displayValue={`${fmtDb(bassBoost,1)} dB`}            accent="#ec4899" modified={!approxEq(bassBoost,defs.bass)}   disabled={!audioBuffer}/>
                <VerticalSlider label="Brightness" icon={Sparkles} value={brightness}   min={-6} max={8}  step={0.5}  onChange={setBrightness}   displayValue={`${fmtDb(brightness,1)} dB`}          accent="#22d3ee" modified={!approxEq(brightness,defs.brightness)} disabled={!audioBuffer}/>
                <VerticalSlider label="Warmth"     icon={Film}     value={warmth}       min={0}  max={1}  step={0.01} onChange={setWarmth}       displayValue={`${Math.round(warmth*100)}%`}          accent="#f59e0b" modified={!approxEq(warmth,defs.warmth)}   disabled={!audioBuffer}/>
                <VerticalSlider label="Punch"      icon={Zap}      value={compression}  min={0}  max={1}  step={0.01} onChange={setCompression}  displayValue={`${Math.round(compression*100)}%`}     accent="#10b981" modified={!approxEq(compression,defs.compression)} disabled={!audioBuffer}/>
              </div>

              {/* Noise reduction */}
              <div style={{display:'flex',alignItems:'center',gap:14,padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.025)',border:'1px solid rgba(255,255,255,0.05)',opacity:audioBuffer?1:0.4,transition:'opacity 0.2s ease'}}>
                <div style={{width:32,height:32,borderRadius:9,flexShrink:0,background:'rgba(34,211,238,0.15)',display:'flex',alignItems:'center',justifyContent:'center'}}><Mic2 size={14} color="#67e8f9"/></div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                    <span style={{color:'#cbd5e1',fontSize:'0.78rem',fontWeight:600}}>Noise Reduction</span>
                    <span className="mono" style={{color:'#67e8f9',fontSize:'0.75rem',fontWeight:700}}>{Math.round(noiseReduction*100)}%</span>
                  </div>
                  <input type="range" min={0} max={1} step={0.01} value={noiseReduction} onChange={e=>setNoiseReduction(parseFloat(e.target.value))} disabled={!audioBuffer} style={{width:'100%',cursor:audioBuffer?'pointer':'default'}}/>
                </div>
              </div>
            </div>

            {/* Custom prompt */}
            {showCustom&&(
              <div className="glass animate-fade-in" style={{padding:18,marginBottom:24}}>
                <p style={{color:'#94a3b8',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:8}}><MessageSquare size={12}/>Describe your sound</p>
                <textarea value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)} placeholder='"Deep cinematic reverb, warm vintage tape, punchy podcast voice"' rows={3} style={{width:'100%',padding:'12px 14px',borderRadius:12,background:'rgba(0,0,0,0.25)',border:'1.5px solid rgba(244,114,182,0.25)',color:'#e2e8f0',fontSize:'0.85rem',outline:'none',resize:'vertical',fontFamily:'inherit',boxSizing:'border-box'}}/>
                <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:10}}>
                  {QUICK_TAGS.map(t=><button key={t} onClick={()=>setCustomPrompt(p=>p?`${p}, ${t}`:t)} style={{fontSize:'0.72rem',padding:'4px 10px',borderRadius:999,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.08)',color:'#94a3b8',cursor:'pointer',fontFamily:'inherit'}}>+ {t}</button>)}
                </div>
              </div>
            )}

            {/* Error */}
            {error&&<div className="animate-fade-in" style={{marginBottom:20,padding:'12px 16px',borderRadius:12,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',color:'#fca5a5',fontSize:'0.85rem',display:'flex',alignItems:'center',gap:10}}><span style={{flex:1}}>{error}</span><button onClick={()=>setError(null)} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer'}}><X size={14}/></button></div>}

            {/* Master button / progress */}
            <div style={{marginBottom:24}}>
              {processing?(
                <div className="glass" style={{padding:18}}>
                  <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:12}}>
                    <div style={{width:22,height:22,borderRadius:'50%',border:'2.5px solid rgba(168,85,247,0.25)',borderTopColor:'#c4b5fd',animation:'spin 0.9s linear infinite',flexShrink:0}}/>
                    <span style={{color:'#e2e8f0',fontSize:'0.92rem',fontWeight:600}}>{progressStep}</span>
                    <span className="mono" style={{marginLeft:'auto',color:'#94a3b8',fontSize:'0.82rem',fontWeight:600}}>{Math.round(progress)}%</span>
                  </div>
                  <div style={{height:5,borderRadius:9,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:9,background:'linear-gradient(90deg,#a855f7,#06b6d4)',width:`${progress}%`,transition:'width 0.4s ease'}}/>
                  </div>
                </div>
              ):(
                <button onClick={handleRender} disabled={!audioBuffer} className={audioBuffer?'btn-process':''} style={{width:'100%',padding:'16px 20px',borderRadius:16,border:'none',cursor:audioBuffer?'pointer':'not-allowed',background:audioBuffer?'linear-gradient(135deg,#a855f7 0%,#ec4899 50%,#06b6d4 100%)':'rgba(255,255,255,0.05)',color:audioBuffer?'#fff':'#334155',fontFamily:'inherit',fontWeight:700,fontSize:'1rem',display:'flex',flexDirection:'column',alignItems:'center',gap:4,boxShadow:audioBuffer?'0 0 32px rgba(168,85,247,0.35)':'none',transition:'all 0.2s ease'}}>
                  <span style={{display:'flex',alignItems:'center',gap:10}}>
                    <Sparkles size={18}/>{audioBuffer?'Master & Download':'Upload audio first'}{audioBuffer&&<ChevronRight size={18}/>}
                  </span>
                  {audioBuffer&&<span style={{fontSize:'0.72rem',fontWeight:500,opacity:0.85}}>{currentPresetCfg?.name} · {GENRE_CURVES[genre]?.name} · {platformTarget.label} · {platformTarget.lufs} LUFS · TPDF dithered</span>}
                </button>
              )}
            </div>

            {/* Output */}
            {outputBlob&&outputAnalysis&&!processing&&(
              <div ref={outputCardRef} className="glass animate-fade-in" style={{padding:22,marginBottom:24,border:'1.5px solid rgba(16,185,129,0.25)',background:'rgba(16,185,129,0.04)'}}>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
                  <div style={{width:40,height:40,borderRadius:12,background:'rgba(16,185,129,0.18)',display:'flex',alignItems:'center',justifyContent:'center'}}><CheckCircle2 size={20} color="#34d399"/></div>
                  <div>
                    <p style={{color:'#34d399',fontWeight:700,fontSize:'0.95rem',margin:0}}>Master Complete</p>
                    <p style={{color:'#64748b',fontSize:'0.78rem',margin:'2px 0 0'}}>Optimized for {platformTarget.label} · TPDF dithered 16-bit WAV</p>
                  </div>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:16}}>
                  <StatTile label="Final LUFS" value={fmtLufs(outputAnalysis.lufs)} sub={Math.abs(outputAnalysis.lufs-platformTarget.lufs)<0.7?`Matches ${platformTarget.label}`:`Target ${platformTarget.lufs}`} accent="#34d399"/>
                  <StatTile label="True Peak" value={`${fmtDb(outputAnalysis.peak)} dBTP`} sub={outputAnalysis.peak<=platformTarget.peak+0.1?'Within ceiling':'Above ceiling'} accent={outputAnalysis.peak<=platformTarget.peak+0.1?'#34d399':'#fb923c'}/>
                  <StatTile label="Quality" value="Studio" sub={`${GENRE_CURVES[genre]?.name} · TPDF · 16-bit`} accent="#34d399"/>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:12,padding:'12px 16px',borderRadius:12,background:'rgba(0,0,0,0.25)',marginBottom:14}}>
                  <button onClick={()=>{if(outputAudioRef.current){if(outputPlaying){outputAudioRef.current.pause();setOutputPlaying(false);}else{outputAudioRef.current.play();setOutputPlaying(true);}}}} style={{width:38,height:38,borderRadius:'50%',flexShrink:0,background:'rgba(16,185,129,0.18)',border:'1px solid rgba(16,185,129,0.3)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    {outputPlaying?<Pause size={15} color="#34d399"/>:<Play size={15} color="#34d399" style={{marginLeft:2}}/>}
                  </button>
                  <div style={{flex:1,minWidth:0}}>
                    <p style={{color:'#e2e8f0',fontWeight:500,fontSize:'0.85rem',margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(file?.name.replace(/\.[^.]+$/,'')||'audio')+'_mastered.wav'}</p>
                    <p style={{color:'#64748b',fontSize:'0.72rem',margin:0}}>WAV · 16-bit · TPDF dithered · LUFS-normalized</p>
                  </div>
                  <audio ref={outputAudioRef} src={outputUrl} onEnded={()=>setOutputPlaying(false)} style={{display:'none'}}/>
                </div>
                <div style={{display:'flex',gap:10}}>
                  <button onClick={handleDownload} style={{flex:1,padding:'12px 16px',borderRadius:12,background:'linear-gradient(135deg,#10b981,#06b6d4)',border:'none',cursor:'pointer',color:'#fff',fontWeight:700,fontSize:'0.9rem',fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:8,boxShadow:'0 0 22px rgba(16,185,129,0.3)'}}><Download size={16}/>Download .wav</button>
                  <button onClick={()=>{if(prevOutUrlRef.current){URL.revokeObjectURL(prevOutUrlRef.current);prevOutUrlRef.current=null;}setOutputBlob(null);setOutputUrl(null);setOutputAnalysis(null);}} style={{padding:'12px 16px',borderRadius:12,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',cursor:'pointer',color:'#cbd5e1',fontWeight:600,fontSize:'0.85rem',fontFamily:'inherit',display:'flex',alignItems:'center',gap:6}}><RotateCcw size={14}/>Re-master</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════════ LIVE MIC MODE ══════════════════════════════════ */}
        {mode==='live'&&(
          <div className="animate-fade-in">
            {/* On/Off */}
            <div className="glass" style={{padding:24,marginBottom:20,textAlign:'center'}}>
              <div style={{width:64,height:64,borderRadius:'50%',margin:'0 auto 16px',background:liveActive?'rgba(239,68,68,0.15)':'rgba(16,185,129,0.1)',border:`2px solid ${liveActive?'rgba(239,68,68,0.5)':'rgba(16,185,129,0.4)'}`,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:liveActive?'0 0 30px rgba(239,68,68,0.4)':'0 0 20px rgba(16,185,129,0.2)',transition:'all 0.3s ease'}}>
                {liveActive?<MicOff size={26} color="#f87171"/>:<Mic size={26} color="#34d399"/>}
              </div>
              <p style={{color:liveActive?'#f87171':'#34d399',fontWeight:700,fontSize:'1rem',margin:'0 0 6px'}}>{liveActive?'Live — Mic Active':'Ready to Go Live'}</p>
              <p style={{color:'#64748b',fontSize:'0.8rem',margin:'0 0 18px'}}>{liveActive?'Real-time effects active · pitch shift · voice morph':'Connect mic → apply live effects → record'}</p>
              <div style={{display:'flex',gap:10,justifyContent:'center',flexWrap:'wrap'}}>
                <button onClick={liveActive?stopLive:startLive} style={{padding:'12px 28px',borderRadius:999,border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:'0.9rem',background:liveActive?'linear-gradient(135deg,#ef4444,#dc2626)':'linear-gradient(135deg,#10b981,#06b6d4)',color:'#fff',display:'flex',alignItems:'center',gap:8,boxShadow:liveActive?'0 0 20px rgba(239,68,68,0.4)':'0 0 20px rgba(16,185,129,0.4)',transition:'all 0.2s ease'}}>
                  {liveActive?<><MicOff size={16}/>Stop Mic</>:<><Mic size={16}/>Start Live</>}
                </button>
                {liveActive&&(
                  <>
                    <button onClick={liveRecording?handleStopRecord:handleStartRecord} style={{padding:'12px 20px',borderRadius:999,border:`1px solid ${liveRecording?'rgba(239,68,68,0.4)':'rgba(255,255,255,0.1)'}`,cursor:'pointer',fontFamily:'inherit',fontWeight:700,fontSize:'0.9rem',background:liveRecording?'rgba(239,68,68,0.15)':'rgba(255,255,255,0.06)',color:liveRecording?'#f87171':'#cbd5e1',display:'flex',alignItems:'center',gap:8}}>
                      {liveRecording?<><Square size={14}/>Stop Rec</>:<><Circle size={14}/>Record</>}
                    </button>
                    <button onClick={()=>setLiveMonitor(!liveMonitor)} style={{padding:'12px 16px',borderRadius:999,border:`1px solid ${liveMonitor?'rgba(16,185,129,0.4)':'rgba(255,255,255,0.1)'}`,background:liveMonitor?'rgba(16,185,129,0.1)':'rgba(255,255,255,0.04)',color:liveMonitor?'#34d399':'#64748b',fontWeight:600,fontSize:'0.85rem',fontFamily:'inherit',cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                      <Headphones size={14}/>{liveMonitor?'Monitor ON':'Monitor OFF'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {liveError&&<div className="animate-fade-in" style={{marginBottom:16,padding:'12px 16px',borderRadius:12,background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',color:'#fca5a5',fontSize:'0.85rem',display:'flex',alignItems:'center',gap:10}}><span style={{flex:1}}>{liveError}</span><button onClick={()=>setLiveError(null)} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer'}}><X size={14}/></button></div>}

            {liveActive&&(
              <>
                {/* Live meter */}
                <div className="glass" style={{padding:18,marginBottom:20}}>
                  <div style={{display:'flex',alignItems:'center',gap:14}}>
                    <div style={{flex:1}}>
                      <div className="meter-track"><div className="meter-fill" style={{width:`${liveMeterPct}%`}}/></div>
                      <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                        {['-60','-30','-12','-3','0 dB'].map(l=><span key={l} className="mono" style={{color:'#475569',fontSize:'0.66rem'}}>{l}</span>)}
                      </div>
                    </div>
                    <div style={{textAlign:'right',minWidth:80}}>
                      <p className="mono" style={{color:isLiveClipping?'#ef4444':'#f1f5f9',fontSize:'1.2rem',fontWeight:700,margin:0,lineHeight:1,textShadow:isLiveClipping?'0 0 12px rgba(239,68,68,0.6)':'none'}}>{fmtDb(liveMeter.peakDb)} dB</p>
                      <p style={{color:isLiveClipping?'#ef4444':'#64748b',fontSize:'0.66rem',margin:'2px 0 0',fontWeight:600}}>{isLiveClipping?'Clipping!':'Live peak'}</p>
                    </div>
                  </div>
                  {liveRecording&&<div style={{marginTop:10,display:'flex',alignItems:'center',gap:8,justifyContent:'center'}}><span style={{width:8,height:8,borderRadius:'50%',background:'#ef4444',display:'inline-block',animation:'pulse-ring 1.2s infinite'}}/><span style={{color:'#f87171',fontSize:'0.8rem',fontWeight:600}}>Recording in progress</span></div>}
                </div>

                {/* Live morph grid */}
                <p style={{color:'#94a3b8',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:8}}><Wand2 size={12}/>Live Voice Morph — instant apply</p>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:7,marginBottom:18}}>
                  {Object.entries(VOICE_MORPHS).slice(0,12).map(([id,m])=>{
                    const active=liveMorph===id;
                    return(
                      <button key={id} onClick={()=>applyLiveMorph(id)} style={{padding:'10px 8px',borderRadius:12,border:`1.5px solid ${active?'rgba(34,211,238,0.55)':'rgba(255,255,255,0.07)'}`,background:active?'rgba(34,211,238,0.12)':'rgba(255,255,255,0.02)',cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all 0.15s ease',boxShadow:active?'0 0 16px rgba(34,211,238,0.25)':'none'}}>
                        <div style={{fontSize:'1.3rem',marginBottom:4}}>{m.emoji}</div>
                        <p style={{color:active?'#67e8f9':'#94a3b8',fontWeight:700,fontSize:'0.7rem',margin:0}}>{m.name}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Live prompt */}
                <div className="glass" style={{padding:16,marginBottom:18}}>
                  <p style={{color:'#94a3b8',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:10,display:'flex',alignItems:'center',gap:8}}><Sparkles size={12}/>Prompt any sound · live</p>
                  <div style={{display:'flex',gap:8}}>
                    <input type="text" value={liveMorphPrompt} onChange={e=>setLiveMorphPrompt(e.target.value)} onKeyDown={e=>e.key==='Enter'&&applyLivePromptMorph()} placeholder='"monster alien" · "helium robot" · "demon cave"' style={{flex:1,padding:'10px 14px',borderRadius:10,background:'rgba(0,0,0,0.25)',border:'1.5px solid rgba(34,211,238,0.2)',color:'#e2e8f0',fontSize:'0.85rem',outline:'none',fontFamily:'inherit'}}/>
                    <button onClick={applyLivePromptMorph} style={{padding:'10px 16px',borderRadius:10,background:'linear-gradient(135deg,#22d3ee,#a855f7)',border:'none',cursor:'pointer',color:'#fff',fontWeight:700,fontSize:'0.82rem',fontFamily:'inherit',flexShrink:0}}>Apply</button>
                  </div>
                </div>

                {/* Live pitch + sliders */}
                <div className="glass" style={{padding:18,marginBottom:16}}>
                  <p style={{color:'#94a3b8',fontSize:'0.72rem',fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',marginBottom:14,display:'flex',alignItems:'center',gap:8}}><Activity size={12}/>Live effect controls</p>
                  <div style={{marginBottom:14}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{color:'#cbd5e1',fontSize:'0.78rem',fontWeight:600}}>Pitch Shift</span>
                      <span className="mono" style={{color:'#c4b5fd',fontSize:'0.75rem',fontWeight:700}}>{livePitch>0?'+':''}{livePitch} st</span>
                    </div>
                    <input type="range" min={-12} max={12} step={0.5} value={livePitch} onChange={e=>setLivePitch(parseFloat(e.target.value))} style={{width:'100%'}}/>
                    <div style={{display:'flex',justifyContent:'space-between',marginTop:3}}>
                      <span style={{color:'#334155',fontSize:'0.65rem'}}>−12st</span>
                      <span style={{color:'#334155',fontSize:'0.65rem'}}>0</span>
                      <span style={{color:'#334155',fontSize:'0.65rem'}}>+12st</span>
                    </div>
                  </div>
                  <div className="slider-grid" style={{padding:'10px 4px',background:'rgba(0,0,0,0.2)',borderRadius:12}}>
                    <VerticalSlider label="Reverb"     icon={Waves}    value={liveReverb}     min={0}  max={1}  step={0.01} onChange={setLiveReverb}     displayValue={`${Math.round(liveReverb*100)}%`}     accent="#a855f7"/>
                    <VerticalSlider label="Bass"       icon={Volume2}  value={liveBass}       min={-6} max={10} step={0.5}  onChange={setLiveBass}       displayValue={`${fmtDb(liveBass,1)} dB`}            accent="#ec4899"/>
                    <VerticalSlider label="Brightness" icon={Sparkles} value={liveBrightness} min={-6} max={8}  step={0.5}  onChange={setLiveBrightness} displayValue={`${fmtDb(liveBrightness,1)} dB`}      accent="#22d3ee"/>
                    <VerticalSlider label="Punch"      icon={Zap}      value={liveCompression}min={0}  max={1}  step={0.01} onChange={setLiveCompression}displayValue={`${Math.round(liveCompression*100)}%`} accent="#10b981"/>
                  </div>
                  <button onClick={()=>{liveEngineRef.current?.clearMorph();setLiveMorph(null);setLivePitch(0);setLiveReverb(0.25);setLiveBass(0);setLiveBrightness(0);setLiveCompression(0.5);showToast('All effects cleared','#64748b');}} style={{marginTop:10,width:'100%',padding:'9px 16px',borderRadius:10,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',color:'#64748b',fontWeight:600,fontSize:'0.78rem',fontFamily:'inherit',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:7,transition:'all 0.15s ease'}} onMouseOver={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)';e.currentTarget.style.color='#cbd5e1';}} onMouseOut={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)';e.currentTarget.style.color='#64748b';}}><RotateCcw size={12}/>Clear All Effects</button>
                </div>

                {/* Recording download */}
                {liveRecUrl&&(
                  <div className="glass animate-fade-in" style={{padding:16,border:'1.5px solid rgba(239,68,68,0.25)',background:'rgba(239,68,68,0.04)'}}>
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:36,height:36,borderRadius:10,background:'rgba(239,68,68,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><CheckCircle2 size={18} color="#f87171"/></div>
                      <div style={{flex:1}}>
                        <p style={{color:'#f87171',fontWeight:700,fontSize:'0.88rem',margin:0}}>Recording Ready</p>
                        <p style={{color:'#64748b',fontSize:'0.72rem',margin:'2px 0 0'}}>Live processed audio · WebM format</p>
                      </div>
                      <audio ref={liveRecAudioRef} src={liveRecUrl} controls style={{height:36,maxWidth:160}}/>
                      <a href={liveRecUrl} download="sonix_live_recording.webm" style={{padding:'8px 14px',borderRadius:10,background:'linear-gradient(135deg,#ef4444,#dc2626)',border:'none',color:'#fff',fontWeight:700,fontSize:'0.82rem',textDecoration:'none',display:'flex',alignItems:'center',gap:6}}><Download size={14}/>Save</a>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <p style={{textAlign:'center',color:'#334155',fontSize:'0.76rem',marginTop:40}}>
          All processing in your browser · No uploads · No tracking · Space to play
        </p>
      </div>
    </div>
  );
}

// ── Root export wrapped in error boundary ─────────────────────
export default function AppWithBoundary(){
  return <ErrorBoundary><App/></ErrorBoundary>;
}
