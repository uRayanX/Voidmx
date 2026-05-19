import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

export const Welcome: React.FC = () => {
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Add a slight delay for dramatic staggering effect upon mount
    setTimeout(() => setMounted(true), 100);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#030303] text-white overflow-hidden selection:bg-white/20 flex flex-col justify-center">
      {/* ── Background Effects ── */}

      {/* 1. Animated Musical Background (Audio Visualizer Bars) */}
      <div 
        className={`absolute bottom-0 left-0 w-full h-[60vh] flex items-end justify-center gap-[4px] sm:gap-2 opacity-20 pointer-events-none z-0 transition-opacity duration-[3000ms] ${mounted ? "opacity-20" : "opacity-0"}`}
        style={{ perspective: "1000px" }}
      >
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="w-1.5 sm:w-3 bg-gradient-to-t from-emerald-500 via-white to-transparent rounded-t-full origin-bottom animate-music-bar opacity-40 mix-blend-screen"
            style={{
              height: `${40 + Math.random() * 60}%`,
              animationDelay: `${Math.random() * 1.5}s`,
              animationDuration: `${0.8 + Math.random() * 1.2}s`,
            }}
          />
        ))}
      </div>

      {/* 2. Soft Vignette / Radial Gradient masking the visualizer edges */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_#030303_80%)] pointer-events-none" />

      {/* 3. Animated Glowing Orbs */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-[1200px] max-h-[1200px] pointer-events-none z-0 transition-opacity duration-1000 ${mounted ? "opacity-100" : "opacity-0"}`}>
        <div className="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-white/5 rounded-full mix-blend-screen filter blur-[120px] animate-blob" />
        <div className="absolute top-[20%] right-[20%] w-[400px] h-[400px] bg-emerald-500/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob" style={{ animationDelay: "2s" }} />
        <div className="absolute bottom-[10%] left-[30%] w-[600px] h-[600px] bg-blue-500/10 rounded-full mix-blend-screen filter blur-[120px] animate-blob" style={{ animationDelay: "4s" }} />
      </div>

      {/* ── Nav Header (Absolute top) ── */}
      <div className={`absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-8 transition-all duration-[1500ms] ${mounted ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"}`}>
        <span className="text-white/60 text-xs tracking-[0.5em] uppercase font-bold" style={{ fontFamily: "Montserrat, sans-serif" }}>
          Void
        </span>
        <button className="text-xs tracking-widest uppercase text-white/40 hover:text-white transition-colors" onClick={() => navigate("/home")}>
          Skip To App
        </button>
      </div>

      {/* ── Main Content ── */}
      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 flex flex-col items-center justify-center -mt-8">
        
        {/* Hero Section */}
        <div className="text-center flex flex-col items-center">

          {/* Headline */}
          <h1 className={`text-7xl sm:text-9xl md:text-[12rem] font-black tracking-tighter opacity-0 ${mounted ? "animate-fade-in-up" : ""} leading-[0.85]`} style={{ fontFamily: "Montserrat, sans-serif", animationDelay: "200ms", animationFillMode: "forwards" }}>
            Enter The <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/20 relative inline-block pb-4">
              Void
              <span className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/20 blur-[30px] opacity-40 mix-blend-screen pointer-events-none pb-4">Void</span>
            </span>
          </h1>

          {/* Subtitle */}
          <p className={`text-lg sm:text-2xl text-neutral-400 max-w-2xl mx-auto leading-relaxed font-light mt-8 opacity-0 ${mounted ? "animate-fade-in-up" : ""}`} style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
            A boundless ecosystem of lossless music designed for the purest listening sessions.
          </p>

          {/* Animated Hero Button */}
          <div className={`mt-16 opacity-0 ${mounted ? "animate-fade-in-up" : ""}`} style={{ animationDelay: "600ms", animationFillMode: "forwards" }}>
            <button 
              onClick={() => navigate("/home")}
              className="group relative inline-flex items-center justify-center p-[1px] overflow-hidden rounded-full font-medium transition-all duration-300 hover:scale-[1.05] active:scale-[0.95]"
            >
              {/* Spinning gradient border */}
              <span className="absolute inset-[-1000%] animate-[spin_3s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#000000_0%,#00FFFF_50%,#000000_100%)] opacity-80" />
              
              <div className="relative inline-flex h-16 w-full items-center justify-center rounded-full bg-black/90 backdrop-blur-xl px-12 text-lg text-white font-bold tracking-wide transition-colors group-hover:bg-black/50">
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer transition-all rounded-full" />
                <span className="relative flex items-center gap-3">
                  Initiate Playback
                  <svg className="w-5 h-5 group-hover:translate-x-1.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </div>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
