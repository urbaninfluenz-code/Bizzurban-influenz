import React, { useState, useEffect } from 'react';
import { 
  Zap, Brain, TrendingUp, ShieldCheck, Rocket, 
  ChevronDown, ChevronUp, BarChart3, Cpu, ArrowRight, 
  CheckCircle2, Lock, Music, DollarSign, X, Mail, Instagram, 
  Youtube, AlertTriangle, Briefcase, Mic2, LineChart, 
  Menu, Terminal, Activity
} from 'lucide-react';

/**
 * --- CUSTOM CSS STYLES FOR ANIMATIONS & VISUALS ---
 * Injected directly to ensure functionality without external Tailwind plugins.
 */
const customStyles = `
  @keyframes marquee {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-marquee {
    display: inline-flex;
    animation: marquee 20s linear infinite;
  }
  
  @keyframes fade-in-up {
    0% { opacity: 0; transform: translateY(20px); }
    100% { opacity: 1; transform: translateY(0); }
  }
  .animate-fade-in-up {
    animation: fade-in-up 0.8s ease-out forwards;
  }
  
  @keyframes spin-slow {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .animate-spin-slow {
    animation: spin-slow 12s linear infinite;
  }
  
  @keyframes reverse-spin {
    from { transform: rotate(360deg); }
    to { transform: rotate(0deg); }
  }
  .animate-reverse-spin {
    animation: reverse-spin 15s linear infinite;
  }

  @keyframes pulse-glow {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.05); }
  }
  .animate-pulse-glow {
    animation: pulse-glow 3s ease-in-out infinite;
  }
  
  @keyframes scan-vertical {
    0% { top: 0%; opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { top: 100%; opacity: 0; }
  }
  .animate-scan {
    animation: scan-vertical 3s linear infinite;
  }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0; }
  }
  .animate-blink {
    animation: blink 1s step-end infinite;
  }
  
  @keyframes grow-height {
    from { height: 0; }
    to { height: var(--target-height); }
  }
  .animate-grow {
    animation: grow-height 1.5s ease-out forwards;
  }

  /* Custom Scrollbar */
  ::-webkit-scrollbar {
    width: 8px;
  }
  ::-webkit-scrollbar-track {
    background: #050507; 
  }
  ::-webkit-scrollbar-thumb {
    background: #334155; 
    border-radius: 4px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background: #06b6d4; 
  }

  /* Noise Background Pattern (Pure CSS) */
  .bg-noise {
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
  }
`;

/**
 * URBAN INFLUENZ - MASTER DATA OBJECT
 */
const DATA = {
  meta: {
    brandName: "UrbanInfluenZ",
    logoPath: "Dark Logo Transparent.png", // USER UPLOADED LOGO
    tagline: "Algorithmic Authenticity",
    mission: "Operationalizing 'Create, Educate, Propagate' in the Age of Agentic AI.",
    founder: "Piyush Gurha",
    founderBio: "Music Producer (Releases like 'Tum Yaar') meets Robotics & Cognitive Scientist. A rare polymath connecting Art with Algorithms.",
    coreThesis: "The Z Capital Thesis: Transitioning from Service Provider to Asset Holder."
  },
  personas: {
    artist: {
      label: "Indie Artist",
      icon: <Mic2 className="w-4 h-4"/>,
      hook: "Don't Let Bots Kill Your Career.",
      valueProp: "Safe, organic growth that triggers Spotify's algorithm without getting you banned.",
      pain: "Fear of artificial streaming penalties (Spotify 2025 Policy).",
      gain: "Real fans, retention data, and long-term asset value."
    },
    investor: {
      label: "Investor / Partner",
      icon: <LineChart className="w-4 h-4"/>,
      hook: "Invest in the Asset Class of 2030.",
      valueProp: "A venture studio model (Z Capital) capturing equity in high-velocity creator IP.",
      pain: "Traditional agencies have capped upside (Service Fees only).",
      gain: "Exponential returns via Royalty Participation & Equity."
    },
    brand: {
      label: "Brand / Agency",
      icon: <Briefcase className="w-4 h-4"/>,
      hook: "Stop Paying for Fake Engagement.",
      valueProp: "Neural targeting ensures your ad spend reaches cognitive states, not just demographics.",
      pain: "Vanity metrics (likes) that don't convert to sales.",
      gain: "Auditable, transparent ROI and deep psychographic alignment."
    }
  },
  market: {
    stats: [
      { label: "India Market 2025", value: "$12.28B", trend: "+25% YoY" },
      { label: "Projected 2032", value: "$49.83B", trend: "CAGR 22.2%" },
      { label: "Creators in India", value: "100M+", trend: "Tier 2/3 Domination" },
      { label: "Streaming Vol", value: "1.03T", trend: "2nd Largest Global Market" }
    ],
    growthGraph: [
      { year: '2025', val: 30, label: '$12B', tag: 'Baseline' },
      { year: '2026', val: 45, label: '$18B', tag: '5G Boom' },
      { year: '2028', val: 65, label: '$28B', tag: 'AI Era' },
      { year: '2030', val: 80, label: '$39B', tag: 'Creator IPOs' },
      { year: '2032', val: 100, label: '$50B', tag: 'Market Maturation' },
    ]
  },
  problem: {
    title: "The Crisis: The Collapse of Vanity Metrics",
    stat: "Spotify 2025 Policy: <1k streams = ₹0 Revenue + Fines",
    context: "The global creator economy is undergoing a violent correction. Spotify & YouTube are penalizing artificial streaming. Artists using bot farms face immediate bans.",
    painPoints: [
      { icon: AlertTriangle, title: "Trust Collapse", desc: "Bot farms and fake followers are destroying account credibility. Brands now demand audit reports." },
      { icon: ShieldCheck, title: "Platform Penalties", desc: "Spotify's 2025 crackdown means artificial streams result in track takedowns and fines." },
      { icon: CheckCircle2, title: "Discovery Deficit", desc: "100k tracks uploaded daily. Without 'Neural Targeting', good music is lost in the noise." }
    ]
  },
  solution: {
    title: "The Solution: Neural Targeting™",
    subtitle: "We don't just market to demographics. We market to cognitive states.",
    methodology: [
      { 
        phase: "Phase 1", 
        title: "Auditory Analysis", 
        desc: "AI scans track for BPM, mood, and timbre (e.g., 'Melancholic Lo-Fi').",
        detail: "Using tools like Cyanite.ai to extract sonic signatures."
      },
      { 
        phase: "Phase 2", 
        title: "Psychographic Mapping", 
        desc: "Mapping sonic traits to listener emotional states.",
        detail: "Example: 'Sad Lo-Fi' maps to Gen Z Night Owls (11 PM - 3 AM)."
      },
      { 
        phase: "Phase 3", 
        title: "Stimulus Injection", 
        desc: "Ad creatives designed to trigger specific dopamine-retention loops.",
        detail: "High-retention visuals that match the song's energy curve."
      }
    ]
  },
  flywheel: {
    title: "The Growth Engine",
    steps: [
      { id: "create", title: "Create", subtitle: "The Studio", icon: Music, desc: "High-fidelity production leveraged by AI. Sonic Branding, AI Visuals, Portfolio Sites.", color: "text-cyan-400", border: "border-cyan-400" },
      { id: "educate", title: "Educate", subtitle: "The Academy", icon: Brain, desc: "Democratizing the 'science of growth'. Building a funnel of high-potential talent via courses & tools.", color: "text-lime-400", border: "border-lime-400" },
      { id: "propagate", title: "Propagate", subtitle: "The Catalyst", icon: Rocket, desc: "Agentic AI distribution. Automated pitching, hyper-targeted ads, zero bots.", color: "text-rose-400", border: "border-rose-400" }
    ]
  },
  zCapital: {
    title: "Z Capital: The Venture Model",
    concept: "From Service Provider to Asset Holder",
    logic: "Instead of just taking fees, we invest services (sweat equity) in the top 1% of talent for long-term royalty participation.",
    comparison: [
      { feature: "Revenue Model", agency: "Fee for Service", zcap: "Equity / Royalties" },
      { feature: "Growth Potential", agency: "Linear (Capped)", zcap: "Exponential (100x)" },
      { feature: "Client Relationship", agency: "Vendor", zcap: "Partner" },
      { feature: "Asset Value", agency: "Low (Cash Flow only)", zcap: "High (IP Portfolio)" }
    ],
    risks: [
      { title: "Platform Risk", mitigation: "Diversification across YouTube, Spotify, and Owned Data (Email/SMS)." },
      { title: "Brand Trust", mitigation: "Radical Transparency Reports showing exact ad spend and traffic sources." },
      { title: "Scalability", mitigation: "Agentic AI automates 80% of pitching and reporting." }
    ]
  },
  pricing: [
    { 
      title: "Growth Starter", 
      price: "₹2,999", 
      period: "/ kit",
      type: "Educate / DIY", 
      features: ["Growth Strategy Audit", "AI Tools Guide (E-Book)", "Community Access"], 
      color: "bg-slate-800",
      cta: "Start Learning"
    },
    { 
      title: "Core Campaign", 
      price: "₹15,000", 
      period: "/ month",
      type: "Propagate / Managed", 
      features: ["Spotify Pitching (Agentic AI)", "Meta Ad Setup (Neural Target)", "Weekly Performance Report"], 
      color: "bg-slate-700",
      cta: "Launch Campaign"
    },
    { 
      title: "Partner (Z-Cap)", 
      price: "Equity %", 
      period: "Royalty Share",
      type: "Create / Venture", 
      features: ["Full Studio Production", "360 Marketing Management", "Incubation Deal"], 
      color: "bg-gradient-to-br from-cyan-900 to-blue-900 border border-cyan-500",
      cta: "Apply for Incubation"
    }
  ],
  roadmap: [
    { 
      time: "Days 1-30", 
      phase: "Foundation", 
      desc: "Tech stack setup, Agentic workflow config, Academy launch.",
      kpis: ["5 Beta Clients", "Website Traffic: 5k", "Content Pipeline: Live"]
    },
    { 
      time: "Days 31-60", 
      phase: "Validation", 
      desc: "Beta cohort of 10 artists. A/B testing 'Neural Targeting' ads.",
      kpis: ["₹1 Lakh Revenue", "30% Stream Growth", "100 Webinar Attendees"]
    },
    { 
      time: "Days 61-90", 
      phase: "Scaling", 
      desc: "Launch Z Capital. Sign first 2 incubation artists. Scale ads.",
      kpis: ["₹5 Lakh Revenue", "4x Ad ROI", "Global Client Test"]
    }
  ]
};

/**
 * HOOKS
 */
const useScroll = () => {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  return scrolled;
};

// Hook for typing effect or terminal log
const useTerminalLog = () => {
  const [logs, setLogs] = useState(["Initializing Neural Core..."]);
  
  useEffect(() => {
    const messages = [
      "Scanning Audio Fingerprint...",
      "BPM Detected: 120 (Deep House)",
      "Analyzing Mood: Melancholic/Focus",
      "Mapping Psychographics...",
      "Target Found: Gen Z (Night Owls)",
      "Optimizing Ad Creative V4...",
      "Injecting Stimulus: High Retention",
      "Campaign Ready. Awaiting Launch."
    ];
    let i = 0;
    const interval = setInterval(() => {
      if (i < messages.length) {
        setLogs(prev => [...prev.slice(-4), messages[i]]);
        i++;
      } else {
        i = 0; // Loop logs
        setLogs(["Re-calibrating Neural Core..."]);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, []);
  
  return logs;
};

/**
 * UI COMPONENTS
 */
const Badge = ({ children, color = "bg-cyan-500/20 text-cyan-300" }) => (
  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${color}`}>
    {children}
  </span>
);

const SectionHeading = ({ children, subtitle, align = "center" }) => (
  <div className={`mb-12 px-4 ${align === "left" ? "text-left" : "text-center"}`}>
    <h2 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-4 leading-tight">
      {children}
    </h2>
    {subtitle && <p className="text-slate-400 text-lg max-w-2xl mx-auto leading-relaxed">{subtitle}</p>}
  </div>
);

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in-up">
      <div className="bg-[#121214] border border-white/10 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl shadow-cyan-900/20">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors">
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-2xl font-bold text-white mb-4 pr-8">{title}</h3>
        {children}
      </div>
    </div>
  );
};

const Calculator = () => {
  const [budget, setBudget] = useState(5000);
  const costPerView = 0.5; // ₹0.50 organic CPV approx
  const conversionRate = 0.05; // 5% conversion to fan

  return (
    <div className="bg-slate-900/50 rounded-xl p-6 border border-white/10 w-full max-w-md mx-auto lg:mx-0">
      <h4 className="text-white font-bold mb-4 flex items-center gap-2">
        <Cpu className="w-4 h-4 text-cyan-400"/> Impact Simulator
      </h4>
      <div className="mb-6">
        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Monthly Ad Budget (₹)</label>
        <input 
          type="range" 
          min="1000" 
          max="50000" 
          step="1000" 
          value={budget} 
          onChange={(e) => setBudget(Number(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
        <div className="flex justify-between mt-2 text-sm font-mono text-cyan-400">
          <span>₹1k</span>
          <span className="font-bold">₹{budget.toLocaleString()}</span>
          <span>₹50k</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-black/40 rounded-lg border border-white/5">
          <div className="text-xs text-slate-500 mb-1">Organic Views</div>
          <div className="text-xl font-bold text-white">~{(budget / costPerView).toLocaleString()}</div>
        </div>
        <div className="p-3 bg-black/40 rounded-lg border border-white/5">
          <div className="text-xs text-slate-500 mb-1">Potential Superfans</div>
          <div className="text-xl font-bold text-lime-400">~{Math.floor((budget / costPerView) * conversionRate).toLocaleString()}</div>
        </div>
      </div>
      <p className="text-[10px] text-slate-500 mt-4 italic">*Estimates based on Meta/Google Discovery average CPV for music categories.</p>
    </div>
  );
};

/**
 * MAIN APP
 */
export default function UrbanInfluenZApp() {
  const scrolled = useScroll();
  const logs = useTerminalLog();
  const [userPersona, setUserPersona] = useState('artist');
  const [modalOpen, setModalOpen] = useState(false);
  const [activeRoadmap, setActiveRoadmap] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const personaData = DATA.personas[userPersona];

  // --- FAVICON EFFECT ---
  useEffect(() => {
    // Dynamically set the favicon to the uploaded logo
    const link = document.querySelector("link[rel~='icon']");
    if (!link) {
      const newLink = document.createElement('link');
      newLink.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(newLink);
    }
    const favicon = document.querySelector("link[rel~='icon']");
    if(favicon) {
      favicon.href = DATA.meta.logoPath;
    }
  }, []);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setModalOpen(true);
  };

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if(el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050507] text-slate-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <style>{customStyles}</style>

      {/* --- TRUTH TICKER --- */}
      <div className="bg-cyan-950/30 border-b border-cyan-900/20 py-2 overflow-hidden whitespace-nowrap z-50 relative">
        <div className="animate-marquee inline-block whitespace-nowrap">
          {[...Array(8)].map((_, i) => (
            <span key={i} className="inline-flex items-center mx-6 text-[10px] md:text-xs font-bold uppercase tracking-widest text-cyan-400/80">
              <Zap className="w-3 h-3 mr-1 inline"/> Zero Bots
              <span className="mx-4 text-slate-700">|</span>
              <Brain className="w-3 h-3 mr-1 inline"/> Neural Targeting
              <span className="mx-4 text-slate-700">|</span>
              <Lock className="w-3 h-3 mr-1 inline"/> Spotify Safe
              <span className="mx-4 text-slate-700">|</span>
              <TrendingUp className="w-3 h-3 mr-1 inline"/> Agentic AI
            </span>
          ))}
        </div>
      </div>

      {/* --- NAVBAR --- */}
      <nav className={`sticky top-0 w-full z-40 transition-all duration-300 border-b ${scrolled ? 'bg-[#050507]/95 backdrop-blur-xl border-white/10 py-3' : 'bg-transparent border-transparent py-5'}`}>
        <div className="container mx-auto px-6 flex justify-between items-center">
          {/* Logo - UPDATED */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => scrollTo('hero')}>
            {/* NO FALLBACK BOX */}
            <img 
              src={DATA.meta.logoPath} 
              alt="" 
              className="w-10 h-10 object-contain drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0"
              onError={(e) => {
                e.target.style.display='none';
              }}
            />
            <span className="font-bold text-xl tracking-tight text-white hidden sm:block">{DATA.meta.brandName}</span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
            <button onClick={() => scrollTo('engine')} className="hover:text-white transition-colors">The Engine</button>
            <button onClick={() => scrollTo('market')} className="hover:text-white transition-colors">Market Data</button>
            <button onClick={() => scrollTo('pricing')} className="hover:text-white transition-colors">Pricing</button>
            <button onClick={() => { setUserPersona('investor'); scrollTo('z-capital'); }} className="text-cyan-400 hover:text-cyan-300 transition-colors">Investor Deck</button>
          </div>

          {/* Action & Mobile Menu Toggle */}
          <div className="flex items-center gap-3">
             <button onClick={() => setModalOpen(true)} className="hidden sm:block px-4 py-2 bg-white text-black text-xs font-bold rounded hover:bg-slate-200 transition-colors">
               Get Started
             </button>
             <button className="md:hidden text-white" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
               {mobileMenuOpen ? <X /> : <Menu />}
             </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#0a0a0c] border-b border-white/10 p-6 flex flex-col gap-4 shadow-2xl animate-fade-in-up">
            <button onClick={() => scrollTo('engine')} className="text-left text-slate-300 py-2 border-b border-white/5">The Engine</button>
            <button onClick={() => scrollTo('market')} className="text-left text-slate-300 py-2 border-b border-white/5">Market Data</button>
            <button onClick={() => scrollTo('pricing')} className="text-left text-slate-300 py-2 border-b border-white/5">Pricing</button>
            <button onClick={() => { setUserPersona('investor'); scrollTo('z-capital'); }} className="text-left text-cyan-400 py-2 font-bold">Investor Deck</button>
            <button onClick={() => { setModalOpen(true); setMobileMenuOpen(false); }} className="mt-2 w-full py-3 bg-white text-black font-bold rounded">Get Started</button>
          </div>
        )}
      </nav>

      {/* --- PERSONA SELECTOR (Floating) --- */}
      <div className="container mx-auto px-6 mt-8 flex justify-center sticky top-20 z-30">
        <div className="inline-flex bg-black/80 backdrop-blur-md rounded-full p-1 border border-white/20 shadow-2xl overflow-x-auto max-w-full">
          {Object.entries(DATA.personas).map(([key, data]) => (
            <button
              key={key}
              onClick={() => setUserPersona(key)}
              className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all duration-300 ${userPersona === key ? 'bg-cyan-500/20 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/50' : 'text-slate-500 hover:text-slate-300'}`}
            >
              {data.icon} {data.label}
            </button>
          ))}
        </div>
      </div>

      {/* --- HERO SECTION --- */}
      <header id="hero" className="relative pt-12 pb-24 overflow-hidden">
        {/* CSS Background Effects */}
        <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-cyan-600/10 rounded-full blur-[120px] -z-10 opacity-50"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[100px] -z-10 opacity-50"></div>
        <div className="absolute inset-0 bg-noise z-0 pointer-events-none"></div>

        <div className="container mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center relative z-10">
          <div className="text-center lg:text-left">
            <div className="inline-block mb-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <Badge>{DATA.meta.coreThesis}</Badge>
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.1] mb-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              Create. Educate. <br />
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                Propagate.
              </span>
            </h1>
            
            {/* Dynamic Hook based on Persona */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8 backdrop-blur-sm lg:mr-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <h3 className="text-cyan-400 font-bold mb-2 flex items-center gap-2 justify-center lg:justify-start">
                {personaData.icon} {personaData.hook}
              </h3>
              <p className="text-slate-300 text-lg leading-relaxed">
                {personaData.valueProp}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <button onClick={() => scrollTo('engine')} className="px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2 animate-pulse-glow">
                Explore Strategy <ArrowRight className="w-4 h-4" />
              </button>
              <button onClick={() => scrollTo('z-capital')} className="px-8 py-4 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-colors">
                View Business Model
              </button>
            </div>
          </div>

          {/* Interactive Calculator in Hero */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            <Calculator />
            {/* Founder Quote */}
            <div className="mt-6 flex items-start gap-4 p-4 bg-gradient-to-r from-slate-900 to-transparent rounded-xl border-l-4 border-cyan-500 max-w-md mx-auto lg:mx-0">
              <div className="shrink-0 w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center font-bold text-slate-500">PG</div>
              <div>
                <p className="text-sm text-slate-300 italic mb-1">"{DATA.meta.founderBio}"</p>
                <p className="text-xs text-slate-500 uppercase font-bold">- {DATA.meta.founder}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* --- MARKET DATA DASHBOARD --- */}
      <section id="market" className="py-20 bg-white/[0.02] border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <Badge color="bg-lime-500/20 text-lime-400">Macro Trends</Badge>
              <h2 className="text-3xl font-bold text-white mt-4">The Data Story</h2>
              <p className="text-slate-400 mt-2">Why now is the perfect time for UrbanInfluenZ.</p>
            </div>
            <div className="text-right hidden md:block">
              <div className="text-sm text-slate-500">Source: Industry Reports 2025</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 lg:col-span-1">
              {DATA.market.stats.map((stat, i) => (
                <div key={i} className="bg-slate-900/50 p-6 rounded-2xl border border-white/5">
                  <div className="text-xs text-slate-500 uppercase mb-2">{stat.label}</div>
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs font-bold text-cyan-400">{stat.trend}</div>
                </div>
              ))}
            </div>

            {/* LIVE Growth Chart Simulation */}
            <div className="lg:col-span-2 bg-slate-900/50 p-8 rounded-2xl border border-white/5 flex flex-col justify-end relative overflow-hidden min-h-[340px]">
               <h3 className="text-white font-bold mb-6 flex items-center gap-2"><Activity className="w-5 h-5 text-cyan-400 animate-pulse"/> Creator Economy Velocity</h3>
               
               {/* Trend Line (Visual SVG Overlay) */}
               <svg className="absolute bottom-0 left-0 w-full h-full pointer-events-none opacity-30" preserveAspectRatio="none">
                  <path d="M0,340 C100,320 200,280 400,100 L800,0" stroke="url(#gradient)" strokeWidth="4" fill="none" />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="transparent" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
               </svg>

               {/* Responsive Graph Container */}
               <div className="flex justify-between items-end h-56 w-full gap-2 md:gap-8 px-4 relative z-10 overflow-x-auto">
                 {DATA.market.growthGraph.map((item, i) => (
                   <div key={i} className="flex flex-col items-center gap-2 w-full min-w-[60px] group cursor-pointer relative">
                     {/* Floating Badge on Hover/Focus */}
                     <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-cyan-900/80 text-cyan-300 text-[10px] px-2 py-1 rounded border border-cyan-500/30 whitespace-nowrap z-20">
                       {item.tag}
                     </div>

                     <div className="text-xs font-bold text-cyan-400 opacity-60 group-hover:opacity-100 transition-opacity mb-1">{item.label}</div>
                     <div 
                        className="w-full bg-gradient-to-t from-cyan-900 to-cyan-500 rounded-t-lg transition-all duration-1000 group-hover:to-cyan-300 relative group-hover:shadow-[0_0_20px_rgba(34,211,238,0.5)]"
                        style={{ height: `${item.val}%`, '--target-height': `${item.val}%` }}
                     >
                        {/* Animated Strip inside Bar */}
                        <div className="absolute inset-0 bg-white/10 w-full h-1 animate-scan"></div>
                     </div>
                     <div className="text-xs text-slate-500 font-mono">{item.year}</div>
                   </div>
                 ))}
               </div>
               
               {/* Grid Lines */}
               <div className="absolute inset-0 border-b border-white/5 pointer-events-none" style={{ top: '25%' }}></div>
               <div className="absolute inset-0 border-b border-white/5 pointer-events-none" style={{ top: '50%' }}></div>
               <div className="absolute inset-0 border-b border-white/5 pointer-events-none" style={{ top: '75%' }}></div>
            </div>
          </div>
        </div>
      </section>

      {/* --- THE CRISIS --- */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <SectionHeading subtitle={DATA.problem.context}>The Crisis of Trust</SectionHeading>
          
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {DATA.problem.painPoints.map((pain, i) => (
              <div key={i} className="p-8 rounded-2xl bg-gradient-to-br from-red-950/30 to-slate-900/50 border border-red-500/10 hover:border-red-500/30 transition-all group">
                <div className="w-12 h-12 bg-red-900/20 rounded-lg flex items-center justify-center text-red-400 mb-6 group-hover:scale-110 transition-transform duration-300">
                  <pain.icon className="w-6 h-6"/>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{pain.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{pain.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- CORE ENGINE (FLYWHEEL) --- */}
      <section id="engine" className="py-24 bg-[#08080a] relative scroll-mt-20">
        <div className="absolute inset-0 bg-noise opacity-20 z-0"></div>
        <div className="container mx-auto px-6 relative z-10">
          <SectionHeading subtitle="A closed-loop ecosystem. Creation feeds Education. Education builds Community. Community powers Propagation.">
             The Urban Engine
          </SectionHeading>

          <div className="grid md:grid-cols-3 gap-6">
            {DATA.flywheel.steps.map((step) => (
              <div 
                key={step.id} 
                className={`relative p-8 rounded-2xl border bg-gradient-to-b from-white/5 to-transparent backdrop-blur-sm transition-all duration-500 hover:scale-[1.02] hover:bg-white/10 ${step.border} group`}
              >
                <div className={`absolute -top-4 left-8 px-4 py-1 rounded-full text-xs font-bold uppercase bg-[#050507] border ${step.border} ${step.color}`}>
                  {step.subtitle}
                </div>
                <step.icon className={`w-10 h-10 mb-6 ${step.color} transition-transform group-hover:scale-110`} />
                <h3 className="text-2xl font-bold text-white mb-4">{step.title}</h3>
                <p className="text-slate-400 mb-6 min-h-[80px] text-sm leading-relaxed">{step.desc}</p>
                
                {/* Expandable Details based on Persona */}
                <div className="pt-6 border-t border-white/10 mt-auto">
                   <h4 className="text-xs font-bold text-white mb-2 uppercase flex items-center gap-2">
                     {userPersona === 'investor' ? <DollarSign className="w-3 h-3 text-green-400"/> : <CheckCircle2 className="w-3 h-3 text-cyan-400"/>}
                     {userPersona === 'investor' ? 'Revenue Stream' : 'Creator Benefit'}
                   </h4>
                   <p className="text-xs text-slate-500">
                     {userPersona === 'investor' && step.id === 'create' && "Retainer Contracts (₹50k+) & Asset Production Fees."}
                     {userPersona === 'investor' && step.id === 'educate' && "High-margin digital products (Courses, E-books)."}
                     {userPersona === 'investor' && step.id === 'propagate' && "Recurring Ad Management Fees & Subscription Models."}
                     {userPersona === 'artist' && step.id === 'create' && "Professional Studio Quality assets that labels respect."}
                     {userPersona === 'artist' && step.id === 'educate' && "Learn to hack the algorithm yourself."}
                     {userPersona === 'artist' && step.id === 'propagate' && "Real fans who stay. No drop-offs."}
                   </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- NEURAL TARGETING (Deep Dive & Visualizer) --- */}
      <section className="py-20 bg-slate-900/30 border-y border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge color="bg-indigo-500/20 text-indigo-300">Proprietary Tech</Badge>
              <h2 className="text-4xl font-bold text-white mt-4 mb-6">Neural Targeting™</h2>
              <p className="text-xl text-slate-300 mb-8">
                Algorithms are just math trying to predict emotion. We speak the language of emotion.
              </p>
              
              <div className="space-y-4">
                 {DATA.solution.methodology.map((method, i) => (
                   <div key={i} className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:border-indigo-500/50 transition-all cursor-default">
                     <div className="flex items-start gap-4">
                       <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm shrink-0 mt-1">
                         {i + 1}
                       </div>
                       <div>
                         <h4 className="text-white font-bold mb-1">{method.title}</h4>
                         <p className="text-sm text-slate-400">{method.desc}</p>
                         <div className="h-0 overflow-hidden group-hover:h-auto group-hover:mt-2 transition-all">
                           <p className="text-xs text-indigo-300 pt-2 border-t border-white/5">{method.detail}</p>
                         </div>
                       </div>
                     </div>
                   </div>
                 ))}
              </div>
            </div>
            
            {/* ACTIVE AI VISUALIZER */}
            <div className="relative h-[450px] bg-black rounded-2xl border border-white/10 p-4 flex flex-col overflow-hidden group">
               {/* Background Radar Effect */}
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent"></div>
               <div className="absolute inset-0 border-t border-indigo-500/10 animate-scan pointer-events-none"></div>

               {/* Header */}
               <div className="flex justify-between items-center border-b border-white/10 pb-2 mb-4 relative z-10">
                 <div className="flex items-center gap-2">
                   <Terminal className="w-4 h-4 text-indigo-400"/>
                   <span className="text-xs font-mono text-indigo-300">AI_AGENT_ACTIVE</span>
                 </div>
                 <div className="flex gap-1">
                   <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                   <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                   <div className="w-2 h-2 rounded-full bg-green-500"></div>
                 </div>
               </div>

               {/* Visual Core */}
               <div className="flex-1 flex items-center justify-center relative">
                  <div className="relative w-48 h-48 rounded-full border border-indigo-500/30 flex items-center justify-center animate-spin-slow">
                     <div className="absolute top-0 left-1/2 w-1 h-2 bg-indigo-500 shadow-[0_0_10px_#6366f1]"></div>
                     <div className="w-32 h-32 rounded-full border border-cyan-500/30 flex items-center justify-center animate-reverse-spin border-dashed"></div>
                  </div>
                  {/* Glowing Core */}
                  <div className="absolute w-16 h-16 bg-indigo-500/20 rounded-full blur-xl animate-pulse-glow"></div>
                  <Cpu className="absolute w-8 h-8 text-white/80 animate-pulse"/>
               </div>

               {/* Live Terminal Log */}
               <div className="mt-4 h-32 bg-slate-900/50 rounded p-3 font-mono text-[10px] text-green-400 overflow-hidden relative border border-white/5 shadow-inner">
                 <div className="flex flex-col justify-end h-full gap-1">
                   {logs.map((log, i) => (
                     <div key={i} className="opacity-80 animate-fade-in-up">
                       <span className="text-slate-500 mr-2">{new Date().toLocaleTimeString()} &gt;</span>
                       {log}
                     </div>
                   ))}
                   <div className="animate-blink">_</div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- Z CAPITAL (The Big Business) --- */}
      <section id="z-capital" className="py-24 bg-[#0a0a0c] scroll-mt-20">
        <div className="container mx-auto px-6">
          <SectionHeading subtitle="The transition from Linear Agency to Exponential Venture Studio.">
            The Z Capital Thesis
          </SectionHeading>

          <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-1 border border-white/10 max-w-5xl mx-auto">
            <div className="bg-[#0b0b0d] rounded-[20px] p-8 md:p-12">
               <div className="grid md:grid-cols-2 gap-12 mb-12">
                 <div>
                   <h3 className="text-2xl font-bold text-white mb-4">The Incubation Model</h3>
                   <p className="text-slate-400 leading-relaxed mb-6">
                     We identify top 1% talent using our agency data. We invest services (Sweat Equity) in exchange for royalty participation.
                   </p>
                   <div className="space-y-3">
                     <div className="flex items-center gap-3 text-sm text-slate-300">
                       <CheckCircle2 className="w-5 h-5 text-lime-400"/> Zero upfront cost for verified talent
                     </div>
                     <div className="flex items-center gap-3 text-sm text-slate-300">
                       <CheckCircle2 className="w-5 h-5 text-lime-400"/> Skin in the game partnership
                     </div>
                     <div className="flex items-center gap-3 text-sm text-slate-300">
                       <CheckCircle2 className="w-5 h-5 text-lime-400"/> Asset portfolio generation
                     </div>
                   </div>
                 </div>

                 <div className="bg-slate-900 rounded-xl border border-white/10 p-6">
                    <h4 className="text-sm font-bold text-slate-500 uppercase mb-4">Model Comparison</h4>
                    <div className="space-y-4">
                      {DATA.zCapital.comparison.map((row, i) => (
                        <div key={i} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                          <span className="text-slate-500">{row.feature}</span>
                          <div className="text-right">
                             <div className="text-red-400/70 text-[10px] md:text-xs line-through">{row.agency}</div>
                             <div className="text-lime-400 font-bold text-xs md:text-sm">{row.zcap}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
               </div>

               {/* Risk Mitigation (Investor Only) */}
               {userPersona === 'investor' && (
                 <div className="border-t border-white/10 pt-8 animate-fade-in-up">
                   <h4 className="text-white font-bold mb-4 flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-cyan-400"/> Risk Mitigation Framework</h4>
                   <div className="grid md:grid-cols-3 gap-6">
                     {DATA.zCapital.risks.map((risk, i) => (
                       <div key={i}>
                         <h5 className="text-sm font-bold text-slate-400 mb-1">{risk.title}</h5>
                         <p className="text-xs text-slate-500 leading-relaxed">{risk.mitigation}</p>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
            </div>
          </div>
        </div>
      </section>

      {/* --- PRICING & TIERS --- */}
      <section id="pricing" className="py-24 scroll-mt-20">
         <div className="container mx-auto px-6">
           <SectionHeading>Strategic Tiers</SectionHeading>
           <div className="grid md:grid-cols-3 gap-8">
             {DATA.pricing.map((tier, i) => (
               <div key={i} className={`flex flex-col p-8 rounded-2xl border ${tier.color === 'bg-slate-800' ? 'border-white/10 bg-slate-900/50' : tier.color.includes('gradient') ? 'border-cyan-500/50' : 'border-white/10 bg-slate-800/50'} relative group hover:-translate-y-2 transition-transform duration-300 shadow-xl`}>
                  {tier.type.includes('Venture') && (
                    <div className="absolute top-0 right-0 bg-cyan-500 text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                      HIGH GROWTH
                    </div>
                  )}
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{tier.type}</div>
                  <h3 className="text-2xl font-bold text-white mb-2">{tier.title}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-3xl font-bold text-white">{tier.price}</span>
                    <span className="text-sm text-slate-500">{tier.period}</span>
                  </div>
                  <ul className="space-y-4 mb-8 flex-1">
                    {tier.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5"/>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <button 
                    onClick={() => handlePlanSelect(tier)}
                    className={`w-full py-4 rounded-lg font-bold text-sm transition-all ${tier.color.includes('gradient') ? 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-lg shadow-cyan-900/50' : 'bg-white/10 hover:bg-white/20 text-white'}`}
                  >
                    {tier.cta}
                  </button>
               </div>
             ))}
           </div>
         </div>
      </section>

      {/* --- ROADMAP (Interactive Accordion) --- */}
      <section className="py-20 bg-white/[0.02] border-t border-white/5">
        <div className="container mx-auto px-6 max-w-4xl">
           <SectionHeading>Execution Roadmap (90-Day Launch)</SectionHeading>
           <div className="space-y-4">
             {DATA.roadmap.map((item, i) => (
               <div key={i} className="border border-white/10 rounded-xl bg-slate-900/40 overflow-hidden">
                 <div 
                   onClick={() => setActiveRoadmap(activeRoadmap === i ? null : i)}
                   className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                 >
                    <div className="flex items-center gap-6">
                      <div className="w-24 shrink-0 text-cyan-400 font-bold font-mono text-sm">{item.time}</div>
                      <div className="text-white font-bold text-lg">{item.phase}</div>
                    </div>
                    {activeRoadmap === i ? <ChevronUp className="w-5 h-5 text-slate-500"/> : <ChevronDown className="w-5 h-5 text-slate-500"/>}
                 </div>
                 {activeRoadmap === i && (
                   <div className="px-6 pb-6 md:pl-32 border-t border-white/5 pt-4 animate-fade-in-up">
                     <p className="text-slate-400 mb-4">{item.desc}</p>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                       {item.kpis.map((kpi, k) => (
                         <div key={k} className="bg-black/40 p-2 rounded text-xs text-slate-300 border border-white/5 text-center">
                           {kpi}
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             ))}
           </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-[#020203] pt-20 pb-10 border-t border-white/10">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
             <div className="col-span-1 md:col-span-2">
               <div className="flex items-center gap-2 mb-6">
                  {/* Footer Logo - UPDATED */}
                  {/* REMOVED Z ICON & Image - Text Only */}
                 <span className="text-xl font-bold text-white tracking-tight">{DATA.meta.brandName}</span>
               </div>
               <p className="text-slate-500 leading-relaxed max-w-sm">
                 {DATA.meta.mission} <br/>
                 Founded by {DATA.meta.founder}.
               </p>
             </div>
             
             <div>
               <h4 className="text-white font-bold mb-6">Platform</h4>
               <ul className="space-y-4 text-sm text-slate-500">
                 <li><button onClick={() => scrollTo('engine')} className="hover:text-cyan-400 transition-colors">The Engine</button></li>
                 <li><button onClick={() => scrollTo('pricing')} className="hover:text-cyan-400 transition-colors">Pricing</button></li>
                 <li><button onClick={() => {setUserPersona('investor'); scrollTo('z-capital')}} className="hover:text-cyan-400 transition-colors">For Investors</button></li>
                 <li><button onClick={() => scrollTo('market')} className="hover:text-cyan-400 transition-colors">Market Data</button></li>
               </ul>
             </div>

             <div>
               <h4 className="text-white font-bold mb-6">Connect</h4>
               <ul className="space-y-4 text-sm text-slate-500">
                 <li><a href="#" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><Instagram className="w-4 h-4"/> Instagram</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><Youtube className="w-4 h-4"/> YouTube</a></li>
                 <li><a href="#" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><Mail className="w-4 h-4"/> Contact Team</a></li>
               </ul>
             </div>
          </div>
          
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600">
            <p>© 2026 Z Capital Group. All rights reserved.</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-slate-400">Privacy Policy</a>
              <a href="#" className="hover:text-slate-400">Terms of Service</a>
              <a href="#" className="hover:text-slate-400">Compliance</a>
            </div>
          </div>
        </div>
      </footer>

      {/* --- LEAD GEN MODAL --- */}
      <Modal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        title={selectedPlan ? `Request Access: ${selectedPlan.title}` : "Join the Movement"}
      >
        <p className="text-slate-400 mb-6">
          {selectedPlan 
            ? "Our team will review your profile to ensure you're a fit for our Neural Targeting protocol."
            : "Get the 'Anti-Bot Growth Guide' and early access to our Academy."}
        </p>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert("Request Received. Welcome to UrbanInfluenZ."); setModalOpen(false); }}>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Name</label>
            <input type="text" className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors" placeholder="Full Name" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
            <input type="email" className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors" placeholder="email@domain.com" required />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
            <select className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-cyan-500 focus:outline-none transition-colors">
              <option>Artist / Creator</option>
              <option>Investor</option>
              <option>Brand Manager</option>
            </select>
          </div>
          <button type="submit" className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-cyan-900/20">
            Submit Application
          </button>
        </form>
      </Modal>

    </div>
  );
}
