"use client";

import { useState, useEffect, useRef } from "react";

export default function AegisDashboard() {
  const [trustScore, setTrustScore] = useState(98);
  const [similarityScore, setSimilarityScore] = useState(0.99);
  const [isHacked, setIsHacked] = useState(false);
  const [cognitiveLogs, setCognitiveLogs] = useState<{ id: number; time: string; state: string }[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  
  const cognitiveStates = ["FOCUSED", "CALM", "ENGAGED", "FOCUSED", "RELAXED", "FOCUSED"];
  const hackedStates = ["HESITANT", "ERRATIC_TYPING", "DISTRESSED", "HIGH_COGNITIVE_LOAD", "COERCION_DETECTED"];

  // Simulation Loop
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate trust score fluctuations
      if (!isHacked) {
        setTrustScore((prev) => Math.min(100, Math.max(90, prev + (Math.random() * 4 - 2))));
        setSimilarityScore((prev) => Math.min(1.0, Math.max(0.95, prev + (Math.random() * 0.02 - 0.01))));
        
        // Add normal cognitive log periodically
        if (Math.random() > 0.6) {
          addLog(cognitiveStates[Math.floor(Math.random() * cognitiveStates.length)]);
        }
      } else {
        // Hacked state: drastically drop metrics
        setTrustScore((prev) => Math.max(0, prev - (Math.random() * 15 + 5)));
        setSimilarityScore((prev) => Math.max(0, prev - (Math.random() * 0.15 + 0.05)));
        
        // Add hacked cognitive log
        addLog(hackedStates[Math.floor(Math.random() * hackedStates.length)]);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isHacked]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [cognitiveLogs]);

  const addLog = (state: string) => {
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setCognitiveLogs((prev) => [...prev, { id: Date.now(), time: timeString, state }].slice(-25)); // Keep last 25 lines
  };

  const handleSimulateHack = () => {
    setIsHacked(true);
    addLog("WARNING: SEVERE BIOMETRIC DRIFT DETECTED");
    addLog("SYSTEM: INITIATING KILL-SWITCH PROTOCOL");
    
    // Auto-restore after 8 seconds for hackathon demo loop purposes
    setTimeout(() => {
      setIsHacked(false);
      setTrustScore(98);
      setSimilarityScore(0.99);
      setCognitiveLogs([]);
      addLog("SYSTEM: SECURE BASELINE RESTORED. SESSION SAFE.");
    }, 8000);
  };

  // Dynamic colors for the gauge
  const getScoreColor = (score: number) => {
    if (score > 80) return "text-emerald-500";
    if (score > 40) return "text-amber-500";
    return "text-rose-500";
  };
  
  const getScoreStroke = (score: number) => {
    if (score > 80) return "stroke-emerald-500";
    if (score > 40) return "stroke-amber-500";
    return "stroke-rose-500";
  };

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (trustScore / 100) * circumference;

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-orange-50 p-8 font-sans text-slate-800 flex flex-col items-center justify-center">
      
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-pink-600 mb-3 drop-shadow-sm">
          AEGIS-X
        </h1>
        <p className="text-slate-600 text-xl font-medium tracking-wide">Continuous Mathematical Trust Infrastructure</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 w-full max-w-6xl">
        
        {/* Left Column: Gauge & Stats */}
        <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-2xl shadow-pink-200/50 rounded-[2rem] p-10 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-500">
          
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-300 to-rose-400 opacity-50"></div>

          <h2 className="text-2xl font-bold text-slate-700 mb-8 w-full text-center tracking-tight">Live Trust Verdict</h2>
          
          {/* Circular Gauge */}
          <div className="relative flex items-center justify-center w-72 h-72 mb-10">
            <svg className="transform -rotate-90 w-full h-full drop-shadow-md" viewBox="0 0 160 160">
              <circle
                cx="80" cy="80" r={radius}
                className="stroke-slate-100"
                strokeWidth="14" fill="transparent"
              />
              <circle
                cx="80" cy="80" r={radius}
                className={`${getScoreStroke(trustScore)} transition-all duration-1000 ease-out`}
                strokeWidth="14" fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className={`text-7xl font-black tracking-tighter ${getScoreColor(trustScore)} transition-colors duration-500`}>
                {Math.round(trustScore)}
              </span>
              <span className="text-slate-400 font-bold uppercase tracking-widest text-sm mt-2">dT/dt Score</span>
            </div>
          </div>

          {/* Similarity Metric */}
          <div className="w-full bg-white/80 rounded-2xl p-5 flex items-center justify-between border border-pink-100 shadow-sm">
            <span className="font-semibold text-slate-600">Embedding Similarity</span>
            <span className={`font-mono text-2xl font-bold transition-colors duration-300 ${similarityScore > 0.8 ? 'text-emerald-500' : 'text-rose-500'}`}>
              {(similarityScore * 100).toFixed(1)}%
            </span>
          </div>

        </div>

        {/* Right Column: Terminal & Controls */}
        <div className="flex flex-col gap-10">
          
          {/* Terminal Window */}
          <div className="bg-slate-900 rounded-[2rem] p-7 shadow-2xl flex-1 flex flex-col relative overflow-hidden border-2 border-slate-800">
            <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-800/80">
              <div className="w-3.5 h-3.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
              <span className="ml-3 text-slate-400 font-mono text-xs tracking-widest uppercase opacity-70">aegis_telemetry_stream</span>
            </div>
            
            <div className="flex-1 overflow-y-auto font-mono text-[15px] space-y-3 h-[300px] scrollbar-thin scrollbar-thumb-slate-700 pr-3">
              {cognitiveLogs.map((log) => (
                <div key={log.id} className="flex gap-4 items-start animate-fade-in">
                  <span className="text-slate-600 shrink-0">[{log.time}]</span>
                  <span className={`${
                    log.state.includes("WARNING") || log.state.includes("KILL-SWITCH") 
                      ? "text-rose-400 font-bold drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]" 
                      : log.state.includes("NORMAL") || log.state.includes("FOCUSED") || log.state.includes("SECURE") || log.state.includes("CALM") || log.state.includes("ENGAGED")
                        ? "text-emerald-400"
                        : "text-amber-400"
                  }`}>
                    {log.state}
                  </span>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </div>

          {/* Action Panel */}
          <div className="bg-white/70 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2rem] p-8 relative overflow-hidden">
             {/* Decorative background glow for button area */}
             <div className="absolute inset-0 bg-gradient-to-t from-rose-50/50 to-transparent pointer-events-none"></div>

            <h3 className="text-xl font-bold text-slate-800 mb-5 relative z-10">Simulation Controls</h3>
            <button 
              onClick={handleSimulateHack}
              disabled={isHacked}
              className={`w-full py-5 rounded-2xl font-black text-lg tracking-widest uppercase transition-all duration-300 transform shadow-xl relative z-10
                ${isHacked 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none scale-[0.98]' 
                  : 'bg-gradient-to-r from-rose-500 to-red-600 text-white hover:shadow-rose-500/50 hover:scale-[1.02] active:scale-[0.98] border border-rose-400/50'
                }`}
            >
              {isHacked ? 'Kill-Switch Engaged...' : '🚨 Simulate Hack'}
            </button>
            <p className="text-sm text-slate-500 mt-5 text-center font-medium leading-relaxed relative z-10 px-4">
              Injects cognitive load & erratic biometrics into the telemetry stream to demonstrate real-time session rejection.
            </p>
          </div>

        </div>
      </div>
      
      {/* Add a tiny bit of custom CSS for the fade-in animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}} />
    </main>
  );
}
