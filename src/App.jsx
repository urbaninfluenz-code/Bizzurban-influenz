import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  Upload, Music2, Film, Mic2, Waves, Sparkles, MessageSquare, Download,
  Play, Pause, X, Volume2, ChevronRight, Smartphone, Radio, Activity,
  Wand2, Settings2, RotateCcw, CheckCircle2, Music3, Scissors,
} from 'lucide-react';
import {
  decodeFile, analyzeAudio, buildRealtimeEngine, renderMaster,
  PRESETS as ENGINE_PRESETS, PLATFORM_TARGETS,
} from './audioProcessor.js';

// ------------------------------------------------------------
// Preset UI metadata (the underlying configs live in audioProcessor.js)
// ------------------------------------------------------------
const PRESET_META = [
  { id: 'cinematic', icon: Film,       color: '#a855f7', tag: 'Pro' },
  { id: 'rich',      icon: Mic2,       color: '#f59e0b', tag: 'Voice' },
  { id: 'dolby',     icon: Waves,      color: '#0ea5e9', tag: 'Pro' },
  { id: 'instagram', icon: Music3, color: '#ec4899', tag: 'Social' },
  { id: 'phone',     icon: Smartphone, color: '#10b981', tag: 'Mobile' },
  { id: 'auto',      icon: Sparkles,   color: '#22d3ee', tag: 'AI' },
];

const PLATFORM_META = [
  { id: 'instagram', icon: Music3, short: 'Instagram' },
  { id: 'tiktok',    icon: Activity,   short: 'TikTok' },
  { id: 'youtube',   icon: Play,       short: 'YouTube' },
  { id: 'phone',     icon: Smartphone, short: 'Phone' },
  { id: 'broadcast', icon: Radio,      short: 'Broadcast' },
];

const QUICK_TAGS = [
  'cinematic reverb', 'deep bass', 'warm vintage', 'crisp',
  'podcast voice', 'boxy phone', 'lo-fi',
];

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function fmtTime(s) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

function fmtDb(v, digits = 1) {
  if (!Number.isFinite(v)) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(digits)}`;
}

function fmtLufs(v) {
  if (!Number.isFinite(v) || v <= -69) return '—';
  return v.toFixed(1);
}

// ------------------------------------------------------------
// Small UI components
// ------------------------------------------------------------
function StatTile({ label, value, sub, accent = '#a78bfa' }) {
  return (
    <div className="glass-soft" style={{ padding: '14px 16px', minWidth: 0 }}>
      <p style={{
        color: '#64748b', fontSize: '0.65rem', fontWeight: 700,
        letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px'
      }}>
        {label}
      </p>
      <p className="mono" style={{
        color: '#f1f5f9', fontSize: '1.35rem', fontWeight: 700, margin: 0, lineHeight: 1.1
      }}>
        {value}
      </p>
      {sub && (
        <p style={{ color: accent, fontSize: '0.7rem', margin: '4px 0 0', fontWeight: 500 }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function VerticalSlider({ label, icon: Icon, value, min, max, step, onChange, displayValue, accent = '#a855f7' }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '10px 6px', minWidth: 0,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 10, marginBottom: 8,
        background: `${accent}1f`, display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: accent,
      }}>
        <Icon size={15} />
      </div>
      <p style={{
        color: '#cbd5e1', fontSize: '0.72rem', margin: '0 0 4px',
        fontWeight: 600, textAlign: 'center'
      }}>
        {label}
      </p>
      <p className="mono" style={{
        color: '#f1f5f9', fontSize: '0.8rem', margin: '0 0 10px', fontWeight: 700
      }}>
        {displayValue}
      </p>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%' }}
        aria-label={label}
      />
      <div style={{
        marginTop: 6, width: '100%', height: 3,
        background: 'rgba(255,255,255,0.04)', borderRadius: 2,
        position: 'relative', overflow: 'hidden'
      }}>
        <div style={{
          width: `${pct}%`, height: '100%',
          background: `linear-gradient(90deg, ${accent}, #06b6d4)`,
          transition: 'width 0.08s linear',
        }} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// App
// ------------------------------------------------------------
export default function App() {
  // ----- State -----
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [audioBuffer, setAudioBuffer] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const [preset, setPreset] = useState('cinematic');
  const [platform, setPlatform] = useState('instagram');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const [reverbAmount, setReverbAmount] = useState(0.4);
  const [bassBoost, setBassBoost] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [warmth, setWarmth] = useState(0.3);
  const [compression, setCompression] = useState(0.5);
  const [noiseReduction, setNoiseReduction] = useState(0.3);
  const [autoTrim, setAutoTrim] = useState(true);

  const [isPlaying, setIsPlaying] = useState(false);
  const [meter, setMeter] = useState({ peakDb: -60, rmsDb: -60 });
  const [position, setPosition] = useState(0);

  const [isDragging, setIsDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressStep, setProgressStep] = useState('');
  const [outputBlob, setOutputBlob] = useState(null);
  const [outputUrl, setOutputUrl] = useState(null);
  const [outputAnalysis, setOutputAnalysis] = useState(null);
  const [outputPlaying, setOutputPlaying] = useState(false);
  const [error, setError] = useState(null);

  // ----- Refs -----
  const fileInputRef = useRef(null);
  const waveformRef = useRef(null);
  const engineRef = useRef(null);
  const positionTimerRef = useRef(null);
  const outputAudioRef = useRef(null);
  const prevOutputUrlRef = useRef(null);

  // ----- Derived -----
  const platformTarget = PLATFORM_TARGETS[platform];
  const currentPresetMeta = PRESET_META.find(p => p.id === preset);
  const currentPresetCfg = ENGINE_PRESETS[preset === 'custom' ? 'auto' : preset];

  // Map peakDb (-60..0) → percentage on the meter (0..100)
  const meterPct = useMemo(() => {
    const p = (meter.peakDb + 60) / 60 * 100;
    return Math.max(0, Math.min(100, p));
  }, [meter.peakDb]);
  const ceilingPct = useMemo(() => {
    const c = (platformTarget.peak + 60) / 60 * 100;
    return Math.max(0, Math.min(100, c));
  }, [platformTarget.peak]);

  // ----- Waveform drawing -----
  const drawWaveform = useCallback((buf) => {
    const canvas = waveformRef.current;
    if (!canvas || !buf) return;
    const data = buf.getChannelData(0);
    const c = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    c.clearRect(0, 0, W, H);

    const amp = H / 2;
    c.strokeStyle = 'rgba(255,255,255,0.04)';
    c.lineWidth = 1;
    c.beginPath(); c.moveTo(0, amp); c.lineTo(W, amp); c.stroke();

    const grad = c.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#a855f7');
    grad.addColorStop(0.5, '#c084fc');
    grad.addColorStop(1, '#06b6d4');
    c.strokeStyle = grad;
    c.lineWidth = 1.4;
    c.globalAlpha = 0.9;

    const step = Math.max(1, Math.floor(data.length / W));
    c.beginPath();
    for (let i = 0; i < W; i++) {
      let mn = 1, mx = -1;
      for (let j = 0; j < step; j++) {
        const v = data[i * step + j] || 0;
        if (v < mn) mn = v;
        if (v > mx) mx = v;
      }
      c.moveTo(i, (1 + mn) * amp);
      c.lineTo(i, (1 + mx) * amp);
    }
    c.stroke();
    c.globalAlpha = 1;
  }, []);

  // ----- File handling -----
  const teardownEngine = useCallback(() => {
    if (positionTimerRef.current) {
      clearInterval(positionTimerRef.current);
      positionTimerRef.current = null;
    }
    if (engineRef.current) {
      try { engineRef.current.destroy(); } catch (_) { /* ignore */ }
      engineRef.current = null;
    }
    setIsPlaying(false);
    setMeter({ peakDb: -60, rmsDb: -60 });
    setPosition(0);
  }, []);

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setError(null);
    setOutputBlob(null);
    setOutputAnalysis(null);
    if (prevOutputUrlRef.current) {
      URL.revokeObjectURL(prevOutputUrlRef.current);
      prevOutputUrlRef.current = null;
    }
    setOutputUrl(null);
    teardownEngine();

    setFile(f);
    setFileInfo({ name: f.name, size: (f.size / 1048576).toFixed(2) });
    setAnalysis(null);
    setAudioBuffer(null);

    try {
      const buf = await decodeFile(f);
      setAudioBuffer(buf);
      setFileInfo(prev => ({
        ...prev,
        durationStr: fmtTime(buf.duration),
      }));
      setTimeout(() => drawWaveform(buf), 30);

      const a = await analyzeAudio(buf);
      setAnalysis(a);

      // Build engine but don't start
      const eng = buildRealtimeEngine(buf);
      engineRef.current = eng;
      eng.onMeter((m) => setMeter(m));
      eng.setPreset(preset);
      eng.setReverb(reverbAmount);
      eng.setBass(bassBoost);
      eng.setBrightness(brightness);
      eng.setWarmth(warmth);
      eng.setCompression(compression);
    } catch (err) {
      console.error(err);
      setError('Could not decode this file. Try a different format (mp3, wav, m4a, flac).');
    }
  }, [drawWaveform, preset, reverbAmount, bassBoost, brightness, warmth, compression, teardownEngine]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const clearFile = () => {
    teardownEngine();
    setFile(null);
    setFileInfo(null);
    setAudioBuffer(null);
    setAnalysis(null);
    setOutputBlob(null);
    setOutputAnalysis(null);
    if (prevOutputUrlRef.current) {
      URL.revokeObjectURL(prevOutputUrlRef.current);
      prevOutputUrlRef.current = null;
    }
    setOutputUrl(null);
    setError(null);
  };

  // ----- Preset change → tell engine + nudge defaults -----
  const handlePresetChange = (id) => {
    setPreset(id);
    if (id === 'custom') {
      setShowCustom(true);
      // Use auto config in the live engine for custom (prompt is applied at render)
      engineRef.current?.setPreset('auto');
    } else {
      setShowCustom(false);
      engineRef.current?.setPreset(id);
    }
  };

  // ----- Slider changes drive the engine in real time -----
  useEffect(() => { engineRef.current?.setReverb(reverbAmount); }, [reverbAmount]);
  useEffect(() => { engineRef.current?.setBass(bassBoost); }, [bassBoost]);
  useEffect(() => { engineRef.current?.setBrightness(brightness); }, [brightness]);
  useEffect(() => { engineRef.current?.setWarmth(warmth); }, [warmth]);
  useEffect(() => { engineRef.current?.setCompression(compression); }, [compression]);

  // ----- Playback control for live preview -----
  const togglePlayback = async () => {
    if (!engineRef.current) return;
    if (isPlaying) {
      engineRef.current.pause();
      setIsPlaying(false);
      if (positionTimerRef.current) {
        clearInterval(positionTimerRef.current);
        positionTimerRef.current = null;
      }
    } else {
      try { await engineRef.current.play(); } catch (e) { console.error(e); return; }
      setIsPlaying(true);
      positionTimerRef.current = setInterval(() => {
        const t = engineRef.current ? engineRef.current.getTime() : 0;
        setPosition(t);
        if (engineRef.current && !engineRef.current.isPlaying()) {
          setIsPlaying(false);
          clearInterval(positionTimerRef.current);
          positionTimerRef.current = null;
        }
      }, 100);
    }
  };

  const handleSeek = (e) => {
    const newPos = parseFloat(e.target.value);
    setPosition(newPos);
    engineRef.current?.seek(newPos);
  };

  // ----- Render / Master -----
  const handleRender = async () => {
    if (!audioBuffer) return;
    if (preset === 'custom' && !customPrompt.trim()) {
      setError('Please describe the sound you want in the prompt field.');
      return;
    }
    setError(null);
    setProcessing(true);
    setProgress(0);
    setProgressStep('Preparing...');
    if (prevOutputUrlRef.current) {
      URL.revokeObjectURL(prevOutputUrlRef.current);
      prevOutputUrlRef.current = null;
    }
    setOutputBlob(null);
    setOutputUrl(null);
    setOutputAnalysis(null);

    // Pause live preview during render to free CPU
    if (isPlaying) {
      engineRef.current?.pause();
      setIsPlaying(false);
      if (positionTimerRef.current) {
        clearInterval(positionTimerRef.current);
        positionTimerRef.current = null;
      }
    }

    try {
      const config = {
        preset,
        customPrompt,
        platform,
        reverbAmount,
        bassBoost,
        brightness,
        warmth,
        compression,
        noiseReduction,
        autoTrim,
        trimRange: autoTrim ? (analysis?.suggestedTrim || null) : null,
      };
      const blob = await renderMaster(audioBuffer, config, (pct, label) => {
        setProgress(pct);
        if (label) setProgressStep(label);
      });
      const url = URL.createObjectURL(blob);
      prevOutputUrlRef.current = url;
      setOutputBlob(blob);
      setOutputUrl(url);
      setOutputAnalysis({
        lufs: blob.__lufs,
        peak: blob.__peak,
      });
      setProgress(100);
      setProgressStep('Done');
    } catch (err) {
      console.error(err);
      setError('Mastering failed. ' + (err?.message || 'Please try again.'));
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = (file?.name.replace(/\.[^.]+$/, '') || 'audio') + '_mastered.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const toggleOutputPlayback = () => {
    if (!outputAudioRef.current) return;
    if (outputPlaying) {
      outputAudioRef.current.pause();
      setOutputPlaying(false);
    } else {
      outputAudioRef.current.play();
      setOutputPlaying(true);
    }
  };

  const resetForAnother = () => {
    if (prevOutputUrlRef.current) {
      URL.revokeObjectURL(prevOutputUrlRef.current);
      prevOutputUrlRef.current = null;
    }
    setOutputBlob(null);
    setOutputUrl(null);
    setOutputAnalysis(null);
  };

  // ----- Cleanup on unmount -----
  useEffect(() => () => {
    if (positionTimerRef.current) clearInterval(positionTimerRef.current);
    if (prevOutputUrlRef.current) URL.revokeObjectURL(prevOutputUrlRef.current);
    if (engineRef.current) try { engineRef.current.destroy(); } catch (_) { /* ignore */ }
  }, []);

  // ----- Auto-trim suggestion text -----
  const trimSuggestion = useMemo(() => {
    if (!analysis || !audioBuffer) return null;
    const headSec = analysis.suggestedTrim.start;
    const tailSec = audioBuffer.duration - analysis.suggestedTrim.end;
    if (headSec < 0.2 && tailSec < 0.2) return null;
    const parts = [];
    if (headSec >= 0.2) parts.push(`${headSec.toFixed(1)}s at start`);
    if (tailSec >= 0.2) parts.push(`${tailSec.toFixed(1)}s at end`);
    return parts.join(', ');
  }, [analysis, audioBuffer]);

  // ===================================================================
  // Render
  // ===================================================================
  return (
    <div className="min-h-screen text-white" style={{ background: '#05050f', minHeight: '100vh' }}>
      {/* ----- Background orbs ----- */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="orb-1" style={{
          position: 'absolute', top: '-8%', left: '20%',
          width: 520, height: 520,
          background: 'radial-gradient(circle, rgba(168,85,247,0.18) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(50px)'
        }} />
        <div className="orb-2" style={{
          position: 'absolute', bottom: '-5%', right: '12%',
          width: 460, height: 460,
          background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)'
        }} />
        <div className="orb-3" style={{
          position: 'absolute', top: '38%', left: '-8%',
          width: 380, height: 380,
          background: 'radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)'
        }} />
      </div>

      <div className="relative" style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px 60px' }}>

        {/* ----- Header ----- */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'linear-gradient(135deg, #a855f7, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 28px rgba(168,85,247,0.5)'
            }}>
              <Volume2 size={22} />
            </div>
            <div>
              <h1 className="gradient-text" style={{
                fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0, lineHeight: 1
              }}>
                SONIX
              </h1>
              <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '4px 0 0', fontWeight: 500 }}>
                Pro-grade audio mastering, in your browser
              </p>
            </div>
          </div>
          <div style={{
            padding: '6px 12px', borderRadius: 999,
            background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.25)',
            color: '#c4b5fd', fontSize: '0.7rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span className="pulse-dot" /> v2.0 · Pro
          </div>
        </header>

        {/* ----- Upload Zone ----- */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          style={{
            borderRadius: 20,
            border: `2px ${isDragging ? 'solid' : 'dashed'} ${
              isDragging ? '#a855f7' : file ? 'rgba(168,85,247,0.3)' : 'rgba(255,255,255,0.1)'}`,
            background: isDragging ? 'rgba(168,85,247,0.08)' : file ? 'rgba(168,85,247,0.04)' : 'transparent',
            cursor: file ? 'default' : 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: isDragging ? '0 0 0 1px #a855f7, 0 0 40px rgba(168,85,247,0.25)' : 'none',
            marginBottom: 24,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
          />

          {!file ? (
            <div style={{ padding: '48px 28px', textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 18, margin: '0 auto 16px',
                background: isDragging ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s ease',
              }}>
                <Upload size={26} color={isDragging ? '#c4b5fd' : '#475569'} />
              </div>
              <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '1rem', margin: '0 0 6px' }}>
                {isDragging ? 'Release to upload' : 'Drop your audio here'}
              </p>
              <p style={{ color: '#475569', fontSize: '0.82rem', margin: 0 }}>
                or click to browse · mp3, wav, m4a, flac, ogg
              </p>
            </div>
          ) : (
            <div style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'rgba(168,85,247,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Music2 size={16} color="#c4b5fd" />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{
                      color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem', margin: 0,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }}>
                      {fileInfo?.name}
                    </p>
                    <p style={{ color: '#475569', fontSize: '0.72rem', margin: 0 }}>
                      {fileInfo?.size} MB{fileInfo?.durationStr ? ` · ${fileInfo.durationStr}` : ''}
                    </p>
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); clearFile(); }} style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b',
                }}>
                  <X size={14} />
                </button>
              </div>

              <canvas
                ref={waveformRef}
                width={800}
                height={68}
                style={{
                  width: '100%', height: 68, borderRadius: 10,
                  background: 'rgba(0,0,0,0.3)', display: 'block',
                }}
              />
            </div>
          )}
        </div>

        {/* ----- Analysis card ----- */}
        {analysis && audioBuffer && (
          <div className="glass animate-fade-in" style={{ padding: 20, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <p style={{
                color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0,
                display: 'flex', alignItems: 'center', gap: 8
              }}>
                <Activity size={12} /> Source Analysis
              </p>
              <span style={{ color: '#475569', fontSize: '0.7rem' }}>
                Analyzed in {(analysis.analysisMs / 1000).toFixed(2)}s
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
              <StatTile
                label="Loudness"
                value={`${fmtLufs(analysis.lufs)} LUFS`}
                sub={`Target: ${platformTarget.lufs} LUFS`}
                accent={Math.abs(analysis.lufs - platformTarget.lufs) < 2 ? '#34d399' : '#fb923c'}
              />
              <StatTile
                label="True Peak"
                value={`${fmtDb(analysis.truePeakDbtp)} dBTP`}
                sub={analysis.truePeakDbtp > platformTarget.peak ? 'Will be limited' : 'Headroom OK'}
                accent={analysis.truePeakDbtp > platformTarget.peak ? '#fb923c' : '#34d399'}
              />
              <StatTile
                label="Noise Floor"
                value={`${analysis.noiseFloorDb.toFixed(1)} dB`}
                sub={analysis.noiseFloorDb > -40 ? 'Noisy — denoise on' : 'Clean'}
                accent={analysis.noiseFloorDb > -40 ? '#fb923c' : '#34d399'}
              />
            </div>

            {trimSuggestion && (
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 12,
                background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.15)',
                cursor: 'pointer',
              }}>
                <Scissors size={14} color="#c4b5fd" />
                <span style={{ color: '#cbd5e1', fontSize: '0.82rem', flex: 1 }}>
                  We found {trimSuggestion} of silence — auto-trim {autoTrim ? 'ON' : 'OFF'}
                </span>
                <input
                  type="checkbox"
                  checked={autoTrim}
                  onChange={(e) => setAutoTrim(e.target.checked)}
                  style={{ accentColor: '#a855f7', cursor: 'pointer' }}
                />
              </label>
            )}
          </div>
        )}

        {/* ----- Preset Grid ----- */}
        <div style={{ marginBottom: 24 }}>
          <p style={{
            color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Wand2 size={12} /> Choose your sound
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
            gap: 10,
          }}>
            {PRESET_META.map((p) => {
              const cfg = ENGINE_PRESETS[p.id];
              if (!cfg) return null;
              const Icon = p.icon;
              const active = preset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => handlePresetChange(p.id)}
                  className="lift"
                  style={{
                    padding: '14px 12px',
                    borderRadius: 16,
                    border: `1.5px solid ${active ? p.color + '70' : 'rgba(255,255,255,0.07)'}`,
                    background: active ? p.color + '14' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'all 0.2s ease',
                    boxShadow: active ? `0 0 26px ${p.color}26` : 'none',
                    position: 'relative',
                    fontFamily: 'inherit',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 9,
                      background: active ? p.color + '28' : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={15} color={active ? p.color : '#64748b'} />
                    </div>
                    {(p.tag === 'Pro' || p.tag === 'AI') && (
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700,
                        padding: '2px 7px', borderRadius: 999,
                        background: p.color + '20', color: p.color,
                      }}>
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <p style={{
                    color: active ? '#f1f5f9' : '#cbd5e1', fontWeight: 700,
                    fontSize: '0.82rem', margin: '0 0 4px',
                  }}>
                    {cfg.name}
                  </p>
                  <p style={{
                    color: '#64748b', fontSize: '0.7rem', margin: 0, lineHeight: 1.35,
                  }}>
                    {cfg.desc}
                  </p>
                </button>
              );
            })}

            {/* Custom prompt card */}
            <button
              onClick={() => handlePresetChange('custom')}
              className="lift"
              style={{
                padding: '14px 12px', borderRadius: 16,
                border: `1.5px solid ${preset === 'custom' ? 'rgba(244,114,182,0.5)' : 'rgba(255,255,255,0.07)'}`,
                background: preset === 'custom' ? 'rgba(244,114,182,0.08)' : 'rgba(255,255,255,0.02)',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                boxShadow: preset === 'custom' ? '0 0 26px rgba(244,114,182,0.2)' : 'none',
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: 9, marginBottom: 10,
                background: preset === 'custom' ? 'rgba(244,114,182,0.25)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MessageSquare size={15} color={preset === 'custom' ? '#f472b6' : '#64748b'} />
              </div>
              <p style={{ color: '#cbd5e1', fontWeight: 700, fontSize: '0.82rem', margin: '0 0 4px' }}>
                Custom Prompt
              </p>
              <p style={{ color: '#64748b', fontSize: '0.7rem', margin: 0, lineHeight: 1.35 }}>
                Describe the sound you want
              </p>
            </button>
          </div>
        </div>

        {/* ----- Platform target ----- */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <p style={{
              color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Settings2 size={12} /> Platform target
            </p>
            <span className="mono" style={{ color: '#c4b5fd', fontSize: '0.78rem', fontWeight: 600 }}>
              {platformTarget.lufs} LUFS · {platformTarget.peak} dBTP
            </span>
          </div>
          <div className="segmented">
            {PLATFORM_META.map(p => {
              const Icon = p.icon;
              return (
                <button
                  key={p.id}
                  className={platform === p.id ? 'active' : ''}
                  onClick={() => setPlatform(p.id)}
                  title={PLATFORM_TARGETS[p.id].label}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Icon size={12} /> <span>{p.short}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ----- Real-time control panel ----- */}
        <div className="glass" style={{ padding: 20, marginBottom: 24 }}>
          <p style={{
            color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 16px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Activity size={12} /> Real-time preview & shape
          </p>

          {/* Transport */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
            <button
              onClick={togglePlayback}
              disabled={!audioBuffer}
              className={isPlaying ? 'animate-pulse-ring' : ''}
              style={{
                width: 50, height: 50, borderRadius: '50%', flexShrink: 0,
                background: audioBuffer
                  ? 'linear-gradient(135deg, #a855f7, #06b6d4)'
                  : 'rgba(255,255,255,0.05)',
                border: 'none',
                cursor: audioBuffer ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff',
                boxShadow: audioBuffer ? '0 0 22px rgba(168,85,247,0.4)' : 'none',
              }}
              title={audioBuffer ? 'Play / Pause' : 'Upload audio first'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 3 }} />}
            </button>

            <div style={{ flex: 1, minWidth: 0 }}>
              <input
                type="range"
                min={0}
                max={audioBuffer ? audioBuffer.duration : 1}
                step={0.05}
                value={position}
                onChange={handleSeek}
                disabled={!audioBuffer}
                style={{ width: '100%' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="mono" style={{ color: '#64748b', fontSize: '0.72rem' }}>
                  {fmtTime(position)}
                </span>
                <span className="mono" style={{ color: '#64748b', fontSize: '0.72rem' }}>
                  {fmtTime(audioBuffer?.duration || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Meter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <div className="meter-track">
                <div className="meter-fill" style={{ width: `${meterPct}%` }} />
                <div className="meter-ceiling" style={{ left: `${ceilingPct}%` }} title={`${platformTarget.peak} dBTP ceiling`} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span className="mono" style={{ color: '#475569', fontSize: '0.66rem' }}>-60</span>
                <span className="mono" style={{ color: '#475569', fontSize: '0.66rem' }}>-30</span>
                <span className="mono" style={{ color: '#475569', fontSize: '0.66rem' }}>-12</span>
                <span className="mono" style={{ color: '#475569', fontSize: '0.66rem' }}>-3</span>
                <span className="mono" style={{ color: '#475569', fontSize: '0.66rem' }}>0 dB</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', minWidth: 90 }}>
              <p className="mono" style={{
                color: '#f1f5f9', fontSize: '1.3rem', fontWeight: 700, margin: 0, lineHeight: 1,
              }}>
                {fmtDb(meter.peakDb)} dB
              </p>
              <p style={{ color: '#64748b', fontSize: '0.66rem', margin: '2px 0 0', fontWeight: 600 }}>
                Live peak
              </p>
            </div>
          </div>

          {/* 5 vertical sliders */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6,
            padding: '12px 6px',
            background: 'rgba(0,0,0,0.2)', borderRadius: 14, marginBottom: 12,
          }}>
            <VerticalSlider
              label="Reverb" icon={Waves}
              value={reverbAmount} min={0} max={1} step={0.01}
              onChange={setReverbAmount}
              displayValue={`${Math.round(reverbAmount * 100)}%`}
              accent="#a855f7"
            />
            <VerticalSlider
              label="Bass" icon={Volume2}
              value={bassBoost} min={-6} max={10} step={0.5}
              onChange={setBassBoost}
              displayValue={`${fmtDb(bassBoost, 1)} dB`}
              accent="#ec4899"
            />
            <VerticalSlider
              label="Brightness" icon={Sparkles}
              value={brightness} min={-6} max={8} step={0.5}
              onChange={setBrightness}
              displayValue={`${fmtDb(brightness, 1)} dB`}
              accent="#22d3ee"
            />
            <VerticalSlider
              label="Warmth" icon={Film}
              value={warmth} min={0} max={1} step={0.01}
              onChange={setWarmth}
              displayValue={`${Math.round(warmth * 100)}%`}
              accent="#f59e0b"
            />
            <VerticalSlider
              label="Punch" icon={Activity}
              value={compression} min={0} max={1} step={0.01}
              onChange={setCompression}
              displayValue={`${Math.round(compression * 100)}%`}
              accent="#10b981"
            />
          </div>

          {/* Noise reduction row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '12px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9, flexShrink: 0,
              background: 'rgba(34,211,238,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mic2 size={14} color="#67e8f9" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 600 }}>
                  Noise Reduction
                </span>
                <span className="mono" style={{ color: '#67e8f9', fontSize: '0.75rem', fontWeight: 700 }}>
                  {Math.round(noiseReduction * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0} max={1} step={0.01}
                value={noiseReduction}
                onChange={(e) => setNoiseReduction(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>

        {/* ----- Custom prompt (collapsible) ----- */}
        {showCustom && (
          <div className="glass animate-fade-in" style={{ padding: 18, marginBottom: 24 }}>
            <p style={{
              color: '#94a3b8', fontSize: '0.72rem', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <MessageSquare size={12} /> Describe your sound
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder='e.g. "Deep cinematic reverb, warm vintage tape, punchy podcast voice"'
              rows={3}
              style={{
                width: '100%', padding: '12px 14px', borderRadius: 12,
                background: 'rgba(0,0,0,0.25)',
                border: '1.5px solid rgba(244,114,182,0.25)',
                color: '#e2e8f0', fontSize: '0.85rem',
                outline: 'none', resize: 'vertical',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {QUICK_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setCustomPrompt(p => p ? `${p}, ${tag}` : tag)}
                  style={{
                    fontSize: '0.72rem', padding: '4px 10px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: '#94a3b8', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ----- Error ----- */}
        {error && (
          <div style={{
            marginBottom: 20, padding: '12px 16px', borderRadius: 12,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#fca5a5', fontSize: '0.85rem',
          }}>
            {error}
          </div>
        )}

        {/* ----- Master & Download button (or progress) ----- */}
        <div style={{ marginBottom: 24 }}>
          {processing ? (
            <div className="glass" style={{ padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  border: '2.5px solid rgba(168,85,247,0.25)',
                  borderTopColor: '#c4b5fd',
                  animation: 'spin 0.9s linear infinite',
                }} />
                <span style={{ color: '#e2e8f0', fontSize: '0.92rem', fontWeight: 600 }}>
                  {progressStep}
                </span>
                <span className="mono" style={{
                  marginLeft: 'auto', color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600
                }}>
                  {Math.round(progress)}%
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 9, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 9,
                  background: 'linear-gradient(90deg, #a855f7, #06b6d4)',
                  width: `${progress}%`,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          ) : (
            <button
              onClick={handleRender}
              disabled={!audioBuffer}
              style={{
                width: '100%', padding: '16px 20px', borderRadius: 16,
                border: 'none', cursor: audioBuffer ? 'pointer' : 'not-allowed',
                background: audioBuffer
                  ? 'linear-gradient(135deg, #a855f7 0%, #ec4899 50%, #06b6d4 100%)'
                  : 'rgba(255,255,255,0.05)',
                color: audioBuffer ? '#fff' : '#334155',
                fontFamily: 'inherit', fontWeight: 700, fontSize: '1rem',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                transition: 'all 0.2s ease',
                boxShadow: audioBuffer ? '0 0 32px rgba(168,85,247,0.35)' : 'none',
              }}
              onMouseOver={e => { if (audioBuffer) e.currentTarget.style.transform = 'scale(1.005)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Sparkles size={18} />
                Master & Download
                <ChevronRight size={18} />
              </span>
              <span style={{ fontSize: '0.72rem', fontWeight: 500, opacity: 0.85 }}>
                Renders to .wav · LUFS-normalized · True-peak limited
              </span>
            </button>
          )}
        </div>

        {/* ----- Output ----- */}
        {outputBlob && outputAnalysis && !processing && (
          <div className="glass animate-fade-in" style={{
            padding: 22, marginBottom: 24,
            border: '1.5px solid rgba(16,185,129,0.25)',
            background: 'rgba(16,185,129,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: 'rgba(16,185,129,0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <CheckCircle2 size={20} color="#34d399" />
              </div>
              <div>
                <p style={{ color: '#34d399', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                  Master Complete
                </p>
                <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '2px 0 0' }}>
                  Optimized for {platformTarget.label}
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              <StatTile
                label="Final LUFS"
                value={fmtLufs(outputAnalysis.lufs)}
                sub={
                  Math.abs(outputAnalysis.lufs - platformTarget.lufs) < 0.7
                    ? `Matches ${platformTarget.label}`
                    : `Target ${platformTarget.lufs}`
                }
                accent="#34d399"
              />
              <StatTile
                label="True Peak"
                value={`${fmtDb(outputAnalysis.peak)} dBTP`}
                sub={outputAnalysis.peak <= platformTarget.peak + 0.1 ? 'Within ceiling' : 'Above ceiling'}
                accent={outputAnalysis.peak <= platformTarget.peak + 0.1 ? '#34d399' : '#fb923c'}
              />
              <StatTile
                label="Status"
                value="Ready"
                sub="Click download"
                accent="#34d399"
              />
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', borderRadius: 12,
              background: 'rgba(0,0,0,0.25)', marginBottom: 14,
            }}>
              <button
                onClick={toggleOutputPlayback}
                style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(16,185,129,0.18)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {outputPlaying
                  ? <Pause size={15} color="#34d399" />
                  : <Play size={15} color="#34d399" style={{ marginLeft: 2 }} />}
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  color: '#e2e8f0', fontWeight: 500, fontSize: '0.85rem', margin: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                }}>
                  {(file?.name.replace(/\.[^.]+$/, '') || 'audio') + '_mastered.wav'}
                </p>
                <p style={{ color: '#64748b', fontSize: '0.72rem', margin: 0 }}>
                  WAV · 16-bit · LUFS-normalized
                </p>
              </div>
              <audio
                ref={outputAudioRef}
                src={outputUrl}
                onEnded={() => setOutputPlaying(false)}
                style={{ display: 'none' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDownload}
                style={{
                  flex: 1, padding: '12px 16px', borderRadius: 12,
                  background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                  border: 'none', cursor: 'pointer',
                  color: '#fff', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: '0 0 22px rgba(16,185,129,0.3)',
                }}
              >
                <Download size={16} />
                Download .wav
              </button>
              <button
                onClick={resetForAnother}
                style={{
                  padding: '12px 16px', borderRadius: 12,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer', color: '#cbd5e1',
                  fontWeight: 600, fontSize: '0.85rem', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <RotateCcw size={14} /> Re-master
              </button>
            </div>
          </div>
        )}

        {/* ----- Footer ----- */}
        <p style={{
          textAlign: 'center', color: '#334155', fontSize: '0.76rem', marginTop: 40,
        }}>
          All processing in your browser. No uploads. No tracking.
        </p>
      </div>
    </div>
  );
}
