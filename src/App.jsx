import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Upload, Music2, Film, Mic, Waves, Sparkles,
  MessageSquare, Download, Play, Pause, X, Volume2, ChevronRight
} from 'lucide-react';
import { processAudio } from './audioProcessor.js';

const PRESETS = [
  {
    id: 'cinematic',
    name: 'Cinematic',
    icon: Film,
    desc: 'Epic reverb halls, rich EQ, dramatic dynamics',
    color: '#7c3aed',
    tag: 'Dramatic',
  },
  {
    id: 'rich',
    name: 'Rich & Masculine',
    icon: Mic,
    desc: 'Heavy lows, warm saturation, broadcast-ready',
    color: '#d97706',
    tag: 'Powerful',
  },
  {
    id: 'dolby',
    name: 'Dolby Atmos',
    icon: Waves,
    desc: 'Spatial, theatrical, wide stereo soundstage',
    color: '#0284c7',
    tag: 'Theatrical',
  },
  {
    id: 'auto',
    name: 'Auto Magic',
    icon: Sparkles,
    desc: 'Intelligently optimizes your audio automatically',
    color: '#059669',
    tag: 'Smart AI',
  },
  {
    id: 'custom',
    name: 'Custom Prompt',
    icon: MessageSquare,
    desc: "Describe your sound — we'll craft it precisely",
    color: '#e11d48',
    tag: 'Your Vision',
  },
];

const ACCEPTED = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.aiff', '.wma', '.opus'];

const PROCESS_STEPS = [
  { pct: 5,  label: 'Reading audio file...' },
  { pct: 15, label: 'Decoding audio...' },
  { pct: 30, label: 'Applying EQ...' },
  { pct: 45, label: 'Compressing dynamics...' },
  { pct: 58, label: 'Adding harmonic saturation...' },
  { pct: 72, label: 'Rendering reverb space...' },
  { pct: 85, label: 'Mastering output...' },
  { pct: 93, label: 'Encoding WAV...' },
];

const QUICK_TAGS = ['reverb', 'echo', 'deep bass', 'cinematic', 'masculine', 'bright highs', 'warm', 'wide stereo'];

export default function App() {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState('cinematic');
  const [customPrompt, setCustomPrompt] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [processStep, setProcessStep] = useState('');
  const [outputUrl, setOutputUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);

  const waveformRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioRef = useRef(null);
  const timerRef = useRef(null);
  const prevOutputUrl = useRef(null);

  const drawWaveform = useCallback(async (f) => {
    const canvas = waveformRef.current;
    if (!canvas) return;
    try {
      const ctx = new AudioContext();
      const buf = await f.arrayBuffer();
      const decoded = await ctx.decodeAudioData(buf);
      await ctx.close();

      const data = decoded.getChannelData(0);
      const c = canvas.getContext('2d');
      const W = canvas.width;
      const H = canvas.height;
      c.clearRect(0, 0, W, H);

      const step = Math.ceil(data.length / W);
      const amp = H / 2;

      c.strokeStyle = 'rgba(255,255,255,0.04)';
      c.lineWidth = 1;
      c.beginPath(); c.moveTo(0, amp); c.lineTo(W, amp); c.stroke();

      const grad = c.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, '#7c3aed');
      grad.addColorStop(0.4, '#a855f7');
      grad.addColorStop(0.7, '#c084fc');
      grad.addColorStop(1, '#06b6d4');

      c.strokeStyle = grad;
      c.lineWidth = 1.5;
      c.globalAlpha = 0.9;
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
    } catch { /* unsupported format waveform */ }
  }, []);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (prevOutputUrl.current) { URL.revokeObjectURL(prevOutputUrl.current); prevOutputUrl.current = null; }
    setOutputUrl(null);
    setError(null);
    setIsPlaying(false);
    setFile(f);
    setFileInfo({ name: f.name, size: (f.size / 1048576).toFixed(2) });
    setTimeout(() => drawWaveform(f), 80);
  }, [drawWaveform]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const clearFile = (e) => {
    e.stopPropagation();
    setFile(null); setFileInfo(null);
    if (prevOutputUrl.current) { URL.revokeObjectURL(prevOutputUrl.current); prevOutputUrl.current = null; }
    setOutputUrl(null); setError(null); setIsPlaying(false);
  };

  const handleProcess = async () => {
    if (!file) return;
    if (selectedPreset === 'custom' && !customPrompt.trim()) {
      setError('Please describe the sound you want in the prompt field.');
      return;
    }
    setProcessing(true);
    setProgress(0);
    setProcessStep('Starting...');
    setError(null);
    if (prevOutputUrl.current) { URL.revokeObjectURL(prevOutputUrl.current); prevOutputUrl.current = null; }
    setOutputUrl(null);
    setIsPlaying(false);

    let idx = 0;
    timerRef.current = setInterval(() => {
      if (idx < PROCESS_STEPS.length) {
        setProgress(PROCESS_STEPS[idx].pct);
        setProcessStep(PROCESS_STEPS[idx].label);
        idx++;
      }
    }, 450);

    try {
      const blob = await processAudio(file, selectedPreset, customPrompt);
      clearInterval(timerRef.current);
      setProgress(100);
      setProcessStep('Complete!');
      const url = URL.createObjectURL(blob);
      prevOutputUrl.current = url;
      setOutputUrl(url);
    } catch (err) {
      clearInterval(timerRef.current);
      console.error(err);
      setError('Processing failed. Make sure your browser supports this audio format (Chrome recommended).');
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!outputUrl) return;
    const a = document.createElement('a');
    a.href = outputUrl;
    a.download = (file?.name.replace(/\.[^.]+$/, '') || 'audio') + '_sonix.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { audioRef.current.play(); setIsPlaying(true); }
  };

  useEffect(() => () => {
    if (prevOutputUrl.current) URL.revokeObjectURL(prevOutputUrl.current);
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  return (
    <div className="min-h-screen text-white" style={{ background: '#05050f' }}>
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-8%', left: '20%',
          width: '480px', height: '480px',
          background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute', bottom: '-5%', right: '15%',
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)'
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '-5%',
          width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(168,85,247,0.07) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(30px)'
        }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 py-14">

        {/* Header */}
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-5">
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 24px rgba(124,58,237,0.5)'
            }}>
              <Volume2 size={22} />
            </div>
            <h1 style={{
              fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.03em', margin: 0,
              background: 'linear-gradient(90deg, #a78bfa, #c084fc, #67e8f9)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              SONIX
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.95rem', fontWeight: 500 }}>
            Professional audio enhancement — cinematic, rich &amp; theatrical
          </p>
        </header>

        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !file && fileInputRef.current?.click()}
          className="mb-8"
          style={{
            borderRadius: 20,
            border: `2px ${isDragging ? 'solid' : 'dashed'} ${isDragging ? '#7c3aed' : file ? 'rgba(124,58,237,0.35)' : 'rgba(255,255,255,0.1)'}`,
            background: isDragging ? 'rgba(124,58,237,0.08)' : file ? 'rgba(124,58,237,0.04)' : 'transparent',
            cursor: file ? 'default' : 'pointer',
            transition: 'all 0.25s ease',
            boxShadow: isDragging ? '0 0 0 1px #7c3aed, 0 0 40px rgba(124,58,237,0.2)' : 'none',
            overflow: 'hidden',
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
            <div style={{ padding: '52px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 18,
                background: isDragging ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 20,
                transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                transition: 'all 0.2s ease',
              }}>
                <Upload size={28} color={isDragging ? '#a78bfa' : '#475569'} />
              </div>
              <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '1.05rem', margin: '0 0 8px' }}>
                {isDragging ? 'Release to upload' : 'Drop your audio here'}
              </p>
              <p style={{ color: '#475569', fontSize: '0.85rem', margin: '0 0 20px' }}>or click to browse files</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                {ACCEPTED.map(f => (
                  <span key={f} style={{
                    fontSize: '0.72rem', padding: '3px 10px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.04)', color: '#475569',
                    fontFamily: 'monospace', border: '1px solid rgba(255,255,255,0.06)'
                  }}>{f}</span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Music2 size={16} color="#a78bfa" />
                  </div>
                  <div>
                    <p style={{ color: '#e2e8f0', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{fileInfo?.name}</p>
                    <p style={{ color: '#475569', fontSize: '0.75rem', margin: 0 }}>{fileInfo?.size} MB</p>
                  </div>
                </div>
                <button onClick={clearFile} style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)', border: 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748b'
                }}>
                  <X size={14} />
                </button>
              </div>

              <canvas
                ref={waveformRef}
                width={800}
                height={72}
                style={{
                  width: '100%', height: 72, borderRadius: 12,
                  background: 'rgba(0,0,0,0.25)', display: 'block'
                }}
              />

              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                style={{
                  marginTop: 12, background: 'none', border: 'none', cursor: 'pointer',
                  color: '#475569', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 4,
                  padding: 0,
                }}
              >
                <Upload size={12} /> Replace file
              </button>
            </div>
          )}
        </div>

        {/* Preset Selector */}
        <div className="mb-8">
          <p style={{ color: '#475569', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
            Choose Your Sound
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}
            className="preset-grid">
            {PRESETS.map((p) => {
              const Icon = p.icon;
              const active = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPreset(p.id)}
                  style={{
                    padding: '18px 16px',
                    borderRadius: 18,
                    border: `1.5px solid ${active ? p.color + '60' : 'rgba(255,255,255,0.07)'}`,
                    background: active ? p.color + '14' : 'rgba(255,255,255,0.02)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s ease',
                    transform: active ? 'scale(1.02)' : 'scale(1)',
                    boxShadow: active ? `0 0 20px ${p.color}18` : 'none',
                    position: 'relative',
                  }}
                >
                  {active && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 20, height: 20, borderRadius: '50%',
                      background: p.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, marginBottom: 12,
                    background: active ? p.color + '25' : 'rgba(255,255,255,0.06)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={17} color={active ? p.color : '#475569'} />
                  </div>
                  <p style={{ color: active ? '#f1f5f9' : '#cbd5e1', fontWeight: 700, fontSize: '0.85rem', margin: '0 0 5px' }}>
                    {p.name}
                  </p>
                  <p style={{ color: active ? '#94a3b8' : '#475569', fontSize: '0.75rem', margin: '0 0 10px', lineHeight: 1.4 }}>
                    {p.desc}
                  </p>
                  <span style={{
                    display: 'inline-block',
                    fontSize: '0.67rem', fontWeight: 700,
                    padding: '3px 9px', borderRadius: 999,
                    background: active ? p.color + '28' : 'rgba(255,255,255,0.05)',
                    color: active ? p.color : '#334155',
                  }}>
                    {p.tag}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Prompt */}
        {selectedPreset === 'custom' && (
          <div className="mb-8 animate-fade-in">
            <p style={{ color: '#475569', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 14 }}>
              Describe Your Sound
            </p>
            <div style={{ position: 'relative' }}>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder='e.g. "Deep reverb, boost the bass heavily, cinematic feel, masculine and warm"'
                rows={3}
                style={{
                  width: '100%', padding: '14px 16px',
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.03)',
                  border: `1.5px solid ${customPrompt ? 'rgba(225,29,72,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  color: '#e2e8f0', fontSize: '0.9rem',
                  outline: 'none', resize: 'vertical',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {QUICK_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => setCustomPrompt(p => p ? `${p}, ${tag}` : tag)}
                  style={{
                    fontSize: '0.75rem', padding: '5px 12px', borderRadius: 999,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.07)',
                    color: '#64748b', cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit',
                  }}
                  onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(225,29,72,0.4)'; e.currentTarget.style.color = '#fda4af'; }}
                  onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = '#64748b'; }}
                >
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginBottom: 24, padding: '14px 18px', borderRadius: 14,
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            color: '#f87171', fontSize: '0.875rem',
          }}>
            {error}
          </div>
        )}

        {/* Process Button / Progress */}
        <div className="mb-8">
          {processing ? (
            <div>
              <div style={{
                height: 56, borderRadius: 16,
                background: 'rgba(255,255,255,0.03)',
                border: '1.5px solid rgba(255,255,255,0.07)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                marginBottom: 12,
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%',
                  border: '2.5px solid rgba(124,58,237,0.3)',
                  borderTopColor: '#a78bfa',
                  animation: 'spin 0.9s linear infinite',
                }} />
                <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>{processStep}</span>
              </div>
              <div style={{ height: 5, borderRadius: 9, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 9,
                  background: 'linear-gradient(90deg, #7c3aed, #06b6d4)',
                  width: `${progress}%`,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <p style={{ textAlign: 'right', color: '#334155', fontSize: '0.75rem', marginTop: 6 }}>
                {Math.round(progress)}%
              </p>
            </div>
          ) : (
            <button
              onClick={handleProcess}
              disabled={!file}
              style={{
                width: '100%', height: 56, borderRadius: 16,
                border: 'none', cursor: file ? 'pointer' : 'not-allowed',
                background: file
                  ? 'linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #06b6d4 100%)'
                  : 'rgba(255,255,255,0.05)',
                color: file ? '#fff' : '#334155',
                fontWeight: 700, fontSize: '1rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.2s ease',
                boxShadow: file ? '0 0 30px rgba(124,58,237,0.3)' : 'none',
                fontFamily: 'inherit',
              }}
              onMouseOver={e => { if (file) { e.currentTarget.style.transform = 'scale(1.01)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(124,58,237,0.45)'; } }}
              onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = file ? '0 0 30px rgba(124,58,237,0.3)' : 'none'; }}
            >
              {file ? (
                <>
                  <Sparkles size={18} />
                  Process Audio
                  <ChevronRight size={18} />
                </>
              ) : (
                'Upload audio to continue'
              )}
            </button>
          )}
        </div>

        {/* Output */}
        {outputUrl && !processing && (
          <div style={{
            borderRadius: 20,
            border: '1.5px solid rgba(16,185,129,0.2)',
            background: 'rgba(16,185,129,0.04)',
            padding: 24,
            animation: 'fadeIn 0.35s ease-out',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'rgba(16,185,129,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10.5L8 14.5L16 6" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p style={{ color: '#34d399', fontWeight: 700, margin: 0, fontSize: '0.95rem' }}>Processing Complete</p>
                <p style={{ color: '#334155', fontSize: '0.8rem', margin: 0 }}>Your enhanced audio is ready to download</p>
              </div>
            </div>

            {/* Player */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 18px', borderRadius: 14,
              background: 'rgba(0,0,0,0.25)', marginBottom: 16,
            }}>
              <button
                onClick={togglePlay}
                style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(16,185,129,0.15)',
                  border: '1px solid rgba(16,185,129,0.25)',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#34d399',
                }}
              >
                {isPlaying
                  ? <Pause size={16} color="#34d399" />
                  : <Play size={16} color="#34d399" style={{ marginLeft: 2 }} />
                }
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: '#e2e8f0', fontWeight: 500, fontSize: '0.85rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {(file?.name.replace(/\.[^.]+$/, '') || 'audio') + '_sonix.wav'}
                </p>
                <p style={{ color: '#334155', fontSize: '0.75rem', margin: 0 }}>WAV · 44.1 kHz · Stereo</p>
              </div>
              <audio
                ref={audioRef}
                src={outputUrl}
                onEnded={() => setIsPlaying(false)}
                style={{ display: 'none' }}
              />
            </div>

            <button
              onClick={handleDownload}
              style={{
                width: '100%', height: 48, borderRadius: 14,
                background: '#10b981',
                border: 'none', cursor: 'pointer',
                color: '#fff', fontWeight: 700, fontSize: '0.95rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s ease',
                boxShadow: '0 0 24px rgba(16,185,129,0.25)',
                fontFamily: 'inherit',
              }}
              onMouseOver={e => { e.currentTarget.style.background = '#059669'; e.currentTarget.style.transform = 'scale(1.01)'; }}
              onMouseOut={e => { e.currentTarget.style.background = '#10b981'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Download size={18} />
              Download WAV
            </button>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', color: '#1e293b', fontSize: '0.78rem', marginTop: 48 }}>
          All processing happens locally in your browser — your audio never leaves your device
        </p>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @media (min-width: 640px) { .preset-grid { grid-template-columns: repeat(5, 1fr) !important; } }
      `}</style>
    </div>
  );
}
