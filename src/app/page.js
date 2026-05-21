"use client";

import { useState, useEffect, useRef } from "react";
import { getLiveMatches, getMatchDetails, triggerSimulatedEvent } from "../lib/rapidapi";
import { generateHypeContent, chatWithGemini } from "../lib/gemini";
import { 
  subscribeToReactions, 
  incrementReaction, 
  subscribeToPredictions, 
  castPredictionVote,
  subscribeToCheerBattle,
  incrementCheer
} from "../lib/firebase";
import CricketPitch from "../components/CricketPitch";

export default function SinglePageDashboard() {
  const matchId = "ind-pak-2026"; // Default focus match

  // --- Core State ---
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [apiOnline, setApiOnline] = useState(false);
  const [activeTab, setActiveTab] = useState("live"); // Tabbed interface controller: live, composer, arena, assistant

  // --- Score Change / Event Detection State ---
  const prevScoreRef = useRef({ runs: 152, wickets: 3 });
  const [alertEvent, setAlertEvent] = useState(null); // Triggers visual score flash alerts

  // --- AI Hype Generator State ---
  const [fanMode, setFanMode] = useState("casual");
  const [autoHype, setAutoHype] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hypeInput, setHypeInput] = useState("");
  const [aiOutput, setAiOutput] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // --- Real-time Fan Arena States ---
  const [reactions, setReactions] = useState({ "🔥": 0, "😮": 0, "🙌": 0, "😂": 0, "👑": 0 });
  const [predictions, setPredictions] = useState({ team1: 15, team2: 12, draw: 3 });
  const [cheers, setCheers] = useState({ team1: 120, team2: 110 });
  const [hasVoted, setHasVoted] = useState(false);

  // --- Chat Bot Q&A States ---
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      sender: "bot",
      text: "👋 Cricket fan! I am your AI Match Assistant. I'm connected to Gemini Pro and have access to the live score! Ask me anything about the match, e.g. 'What is the score?' or 'Who is batting?'"
    }
  ]);
  const chatEndRef = useRef(null);

  // --- Excitement / Moment Impact Gauge Helper ---
  const getImpactDetails = (event) => {
    switch (event) {
      case "WICKET":
        return { score: 95, label: "CRITICAL BREAKTHROUGH!", color: "var(--color-danger)", bgGlow: "var(--color-danger-glow)" };
      case "SIX":
        return { score: 90, label: "MONUMENTAL BOUNDARY!", color: "var(--accent-violet)", bgGlow: "var(--accent-violet-glow)" };
      case "FOUR":
        return { score: 70, label: "TACTICAL BOUNDARY!", color: "var(--accent-emerald)", bgGlow: "var(--accent-emerald-glow)" };
      case "LAST OVER":
        return { score: 85, label: "CLIMACTIC PRESSURE!", color: "var(--accent-orange)", bgGlow: "var(--accent-orange-glow)" };
      default:
        return { score: 35, label: "STEADY BUILD-UP", color: "var(--accent-violet)", bgGlow: "var(--accent-violet-glow)" };
    }
  };

  const impact = match ? getImpactDetails(match.event) : { score: 30, label: "STEADY", color: "var(--accent-violet)", bgGlow: "var(--accent-violet-glow)" };

  // --- Polling and Live API Connection ---
  useEffect(() => {
    async function fetchMatches() {
      try {
        const matches = await getLiveMatches();
        const activeMatch = matches.find(m => m.id === matchId) || matches[0];
        
        if (activeMatch) {
          // Score change and event detection logic
          const currentRuns = parseInt(activeMatch.score.split("/")[0]) || 0;
          const currentWickets = parseInt(activeMatch.score.split("/")[1]) || 0;
          
          const prevRuns = prevScoreRef.current.runs;
          const prevWickets = prevScoreRef.current.wickets;
          
          if (currentWickets > prevWickets) {
            triggerVisualAlert("WICKET");
          } else if (currentRuns - prevRuns === 6) {
            triggerVisualAlert("SIX");
          } else if (currentRuns - prevRuns === 4) {
            triggerVisualAlert("FOUR");
          }
          
          prevScoreRef.current = { runs: currentRuns, wickets: currentWickets };
          setMatch({ ...activeMatch });
        }
        
        if (typeof window !== "undefined") {
          setApiOnline(window.hypex_api_status === "online");
        }
        setLoading(false);
      } catch (err) {
        console.error("Dashboard score polling failed:", err);
      }
    }

    fetchMatches();
    
    // Auto-refresh match scoreboard every 10 seconds as required
    const interval = setInterval(() => {
      fetchMatches();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  // --- Real-time Local & Firebase Sync ---
  useEffect(() => {
    // Reactions listener
    const unsubReactions = subscribeToReactions((data) => setReactions(data));
    
    // Predictions listener
    const unsubPredictions = subscribeToPredictions((data) => setPredictions(data));

    // Cheer Battle listener
    const unsubCheers = subscribeToCheerBattle((data) => setCheers(data));

    // Load hasVoted state from localStorage if available
    try {
      const savedVote = localStorage.getItem("hypex_user_prediction_vote");
      if (savedVote) {
        setHasVoted(true);
      }
    } catch {}

    return () => {
      unsubReactions();
      unsubPredictions();
      unsubCheers();
    };
  }, []);

  // Auto Scroll Chat to Bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages, chatLoading]);

  // Trigger auto-hype when events update
  useEffect(() => {
    if (autoHype && match && match.eventDesc) {
      setHypeInput(match.eventDesc);
      handleGenerateHype(match.eventDesc);
    }
  }, [match?.event, match?.score, autoHype]);

  // --- Handlers ---
  
  const triggerVisualAlert = (type) => {
    setAlertEvent(type);
    setTimeout(() => {
      setAlertEvent(null);
    }, 3000);
  };

  // Demo Score Event Simulator (Six, Wicket, Four, Last Over)
  const handleTriggerSimulatedEvent = (type) => {
    const updated = triggerSimulatedEvent(matchId, type);
    if (updated) {
      // Score change alerts
      triggerVisualAlert(type);
      
      const currentRuns = parseInt(updated.score.split("/")[0]) || 0;
      const currentWickets = parseInt(updated.score.split("/")[1]) || 0;
      prevScoreRef.current = { runs: currentRuns, wickets: currentWickets };
      
      setMatch({ ...updated });
      setHypeInput(updated.eventDesc);
    }
  };

  // Hype Generation Trigger
  const handleGenerateHype = async (momentText) => {
    const activeText = momentText || hypeInput || (match?.eventDesc || "India vs Pakistan thriller");
    if (!activeText) return;
    
    setIsGenerating(true);
    setAiError(null);
    try {
      const result = await generateHypeContent(activeText, fanMode);
      setAiOutput(result);
    } catch (err) {
      setAiError(err.message || "Failed to contact Gemini Engine.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Chat Q&A Submission
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsgText = chatInput;
    setChatInput("");
    setChatMessages(prev => [...prev, { sender: "user", text: userMsgText }]);
    setChatLoading(true);

    try {
      const response = await chatWithGemini(userMsgText, match);
      setChatMessages(prev => [...prev, { sender: "bot", text: response }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: "bot", text: "Oops, the crowd roared too loud! I couldn't hear Gemini. Check your connection or API key!" }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Copy Content Helper
  const handleCopy = (text, key) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Cheer Battle incrementer
  const handleCheerIncrement = (team) => {
    incrementCheer(team, (updated) => setCheers(updated));
  };

  // Predictions Vote casting
  const handleCastVote = (selection) => {
    if (hasVoted) return;
    castPredictionVote(selection, (updated) => setPredictions(updated));
    setHasVoted(true);
    try {
      localStorage.setItem("hypex_user_prediction_vote", selection);
    } catch {}
  };

  // Reactions emoji increments
  const handleEmojiClick = (emoji) => {
    incrementReaction(emoji, (updated) => setReactions(updated));
  };

  // Predictions percentages
  const totalVotes = predictions.team1 + predictions.team2 + predictions.draw;
  const getPct = (votes) => {
    if (totalVotes === 0) return 33;
    return Math.round((votes / totalVotes) * 100);
  };

  // Cheer battle calculations
  const totalCheers = cheers.team1 + cheers.team2;
  const cheerPct1 = totalCheers === 0 ? 50 : Math.round((cheers.team1 / totalCheers) * 100);

  if (loading || !match) {
    return (
      <div className="flex-1 flex justify-center items-center py-32 bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--card-border)] border-t-[var(--accent-emerald)] rounded-full animate-spin"></div>
          <span className="text-[10px] font-black text-[var(--text-muted)] tracking-widest uppercase animate-pulse">
            LOADING STADIUM FEED...
          </span>
        </div>
      </div>
    );
  }

  // Determine Prediction Winner
  const indVotes = predictions.team1;
  const pakVotes = predictions.team2;
  const indLeading = indVotes > pakVotes;
  const pakLeading = pakVotes > indVotes;

  // Tabs for the Arena Cockpit Console
  const tabsList = [
    { id: "live", label: "🏏 Live Play & Simulator", icon: "🏟️" },
    { id: "composer", label: "🤖 AI Hype Composer", icon: "⚡" },
    { id: "arena", label: "⚔️ Fan Interaction Arena", icon: "🔥" },
    { id: "assistant", label: "💬 AI Match Assistant", icon: "🤖" }
  ];

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 select-none py-10">
      
      {/* Full-Screen Score Event Neon Flash Alert Overlays */}
      {alertEvent && (
        <div className="fixed inset-0 bg-black/75 alert-backdrop flex flex-col items-center justify-center z-50 pointer-events-none">
          <div className={`p-8 md:p-12 rounded-2xl border text-center flex flex-col items-center gap-4 max-w-md alert-card-animate ${
            alertEvent === "WICKET" ? "border-red-500/20 bg-red-950/40 shadow-[0_0_40px_rgba(248,113,113,0.15)]" :
            alertEvent === "SIX" ? "border-[var(--accent-violet)]/20 bg-[var(--accent-violet-glow)] shadow-[0_0_40px_var(--accent-violet-glow)]" :
            "border-[var(--accent-emerald)]/20 bg-[var(--accent-emerald-glow)] shadow-[0_0_40px_var(--accent-emerald-glow)]"
          }`}>
            <span className={`text-[9px] font-black tracking-[0.2em] uppercase px-3 py-1 rounded-full border ${
              alertEvent === "WICKET" ? "bg-red-950/40 border-red-500/30 text-red-400" :
              alertEvent === "SIX" ? "bg-[var(--accent-violet-glow)] border-[var(--accent-violet)]/30 text-[var(--accent-violet)]" :
              "bg-[var(--accent-emerald-glow)] border-[var(--accent-emerald)]/30 text-[var(--accent-emerald)]"
            }`}>
              {alertEvent} ALERT!
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] leading-tight font-outfit tracking-tight">
              {alertEvent === "WICKET" ? "Partnership broken!" : 
               alertEvent === "SIX" ? "Cleared the boundary!" : 
               "Hit the fence!"}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-medium max-w-xs leading-relaxed italic">
              "{match.eventDesc}"
            </p>
          </div>
        </div>
      )}

      {/* Header Info */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="live-indicator mb-2 font-extrabold tracking-wider">
            <span className="live-dot mr-1"></span>
            LIVE MATCH COCKPIT
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] font-outfit uppercase tracking-tight">
            ⚡ Stadium Command Arena
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-semibold tracking-wider uppercase mt-1">
            Day/Stadium match-ready console with interactive pitch and real-time AI
          </p>
        </div>

        {/* Dynamic status indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[var(--card-bg-hover)] border border-[var(--card-border)] px-4 py-2 rounded-full text-[10px] font-extrabold text-[var(--text-secondary)] uppercase tracking-wider">
            <span className={`w-1.5 h-1.5 rounded-full ${apiOnline ? 'bg-[var(--accent-emerald)] shadow-[0_0_6px_var(--accent-emerald)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'}`}></span>
            <span>{apiOnline ? "Cricbuzz RapidAPI Online" : "Simulating Real Match"}</span>
          </div>
        </div>
      </header>

      {/* 🔝 LIVE SCOREBOARD HEADER (Centred, Modern, Extremely legible) */}
      <section className="stadium-card flex flex-col justify-center items-center gap-6 p-8 relative overflow-hidden">
        
        {/* Outfield gradient styling overlay */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--card-border)] to-transparent"></div>

        {/* Venue & Metadata Ticker */}
        <div className="flex items-center gap-4 text-[10px]">
          <span className="text-[var(--text-muted)] font-black">VENUE</span>
          <div className="text-[var(--text-secondary)] font-bold uppercase tracking-wider">
            📍 {match.venue.split(",")[0]}
          </div>
          <span className="text-[var(--card-border)] font-bold">•</span>
          <div className="text-[var(--text-secondary)] font-bold uppercase tracking-wider">
            🏆 WORLD CHALLENGE
          </div>
        </div>

        {/* Centered Scoreboard Digit Grid */}
        <div className="w-full max-w-4xl flex items-center justify-center gap-8 md:gap-16 select-none my-2">
          
          {/* Team 1 IND */}
          <div className="flex-1 text-right">
            <h3 className="text-xl md:text-3xl font-black text-[var(--text-primary)] font-outfit tracking-tight">
              {match.team1Abbr}
            </h3>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase mt-0.5">
              India
            </p>
          </div>

          {/* Divider */}
          <div className="w-[1px] h-12 bg-[var(--card-border)]"></div>

          {/* Giant Score display */}
          <div className="text-center min-w-[150px] md:min-w-[220px]">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-[var(--text-primary)] font-outfit leading-none">
              {match.score}
            </h2>
            <span className="text-[11px] font-extrabold text-[var(--text-muted)] tracking-widest uppercase block mt-2">
              Overs {match.overs} • Target {match.target}
            </span>
          </div>

          {/* Divider */}
          <div className="w-[1px] h-12 bg-[var(--card-border)]"></div>

          {/* Team 2 PAK */}
          <div className="flex-1 text-left">
            <h3 className="text-xl md:text-3xl font-black text-[var(--text-secondary)] font-outfit tracking-tight">
              {match.team2Abbr}
            </h3>
            <p className="text-[10px] font-medium text-[var(--text-muted)] tracking-wider uppercase mt-0.5">
              Pakistan
            </p>
          </div>
        </div>

        {/* Batsmen vs Bowler stats display */}
        <div className="w-full border-t border-[var(--card-border)] pt-5 mt-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-wider bg-[var(--card-bg-hover)] border border-[var(--card-border)] px-2 py-0.5 rounded">BATSMAN</span>
            <span className="font-extrabold text-[var(--text-primary)]">
              {match.batsmen?.[0]?.name || "V. Kohli"}
            </span>
            <span className="text-[var(--text-secondary)] font-medium">
              <strong className="text-[var(--accent-emerald)] font-black">{match.batsmen?.[0]?.runs || 0}</strong> ({match.batsmen?.[0]?.balls || 0}b) • SR: {match.batsmen?.[0]?.strikeRate || 0}
            </span>
          </div>

          <div className="hidden md:block w-1.5 h-1.5 bg-[var(--card-border)] rounded-full"></div>

          <div className="flex items-center gap-2.5">
            <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-wider bg-[var(--card-bg-hover)] border border-[var(--card-border)] px-2 py-0.5 rounded">BOWLER</span>
            <span className="font-extrabold text-[var(--text-primary)]">
              {match.bowler?.name || "Shaheen Afridi"}
            </span>
            <span className="text-[var(--text-secondary)] font-medium">
              <strong className="text-[var(--accent-violet)] font-black">{match.bowler?.wickets || 0}</strong> Wkts • Econ: {match.bowler?.econ || 0}
            </span>
          </div>
        </div>
      </section>

      {/* 🎛️ PORTAL NAVIGATION SYSTEM: Clean segmented controls to prevent screen clutter */}
      <div className="flex justify-start border-b border-[var(--card-border)] overflow-x-auto gap-2 pb-2">
        {tabsList.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-full border transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.25)] text-[var(--accent-violet)]"
                : "border-transparent text-[var(--text-secondary)] hover:bg-[var(--card-bg-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 🏟️ TAB VIEWPORT PORTS CONTAINER */}
      <div className="w-full">
        
        {/* TAB 1: LIVE SIMULATION PORTAL */}
        {activeTab === "live" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Interactive Pitch simulator deck */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <div className="flex flex-col gap-1.5">
                <span className="text-[9px] text-[var(--accent-violet)] font-black uppercase tracking-widest">
                  🏏 STADIUM GRAPHICS
                </span>
                <h3 className="text-lg font-black text-[var(--text-primary)] font-outfit uppercase">
                  Ball Trajectory & Wickets simulation
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Watch live deliveries roll across the boundary or knock wickets out. Trigger event buttons to animate paths.
                </p>
              </div>

              {/* Pitch Component */}
              <CricketPitch event={match.event} eventDesc={match.eventDesc} />

              {/* Demo controller */}
              <article className="stadium-card bg-[var(--card-bg)]">
                <div className="flex flex-col gap-1 mb-5">
                  <h3 className="text-xs font-black tracking-widest text-[var(--accent-violet)] uppercase">
                    🏟️ MATCH DECIDERS (DEMO FEED CONTROLLER)
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold">
                    Inject match event scenarios to update the live dashboard data instantly.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button 
                    onClick={() => handleTriggerSimulatedEvent("WICKET")}
                    className="flex items-center justify-center gap-1.5 text-[9px] font-black py-3 px-3 bg-red-950/10 hover:bg-red-950/20 text-red-400 border border-red-900/30 rounded-full transition-all uppercase active:scale-95 cursor-pointer hover:scale-[1.03]"
                  >
                    🔴 OUT! WICKET
                  </button>
                  <button 
                    onClick={() => handleTriggerSimulatedEvent("SIX")}
                    className="flex items-center justify-center gap-1.5 text-[9px] font-black py-3 px-3 bg-indigo-950/10 hover:bg-indigo-950/20 text-[var(--accent-violet)] border border-indigo-900/30 rounded-full transition-all uppercase active:scale-95 cursor-pointer hover:scale-[1.03]"
                  >
                    🚀 SIXER BLAST
                  </button>
                  <button 
                    onClick={() => handleTriggerSimulatedEvent("FOUR")}
                    className="flex items-center justify-center gap-1.5 text-[9px] font-black py-3 px-3 bg-emerald-950/10 hover:bg-emerald-950/20 text-[var(--accent-emerald)] border border-emerald-900/30 rounded-full transition-all uppercase active:scale-95 cursor-pointer hover:scale-[1.03]"
                  >
                    ⚡ FOUR BOUNDARY
                  </button>
                  <button 
                    onClick={() => handleTriggerSimulatedEvent("LAST OVER")}
                    className="flex items-center justify-center gap-1.5 text-[9px] font-black py-3 px-3 bg-orange-950/10 hover:bg-orange-950/20 text-[var(--accent-orange)] border border-orange-900/30 rounded-full transition-all uppercase active:scale-95 cursor-pointer hover:scale-[1.03]"
                  >
                    🏁 FINAL OVER
                  </button>
                </div>
              </article>
            </div>

            {/* Timeline Stream */}
            <div className="lg:col-span-5">
              <article className="stadium-card bg-[var(--card-bg)] flex flex-col gap-5 min-h-[500px]">
                <div className="flex flex-col gap-1 pb-3 border-b border-[var(--card-border)]">
                  <h3 className="text-xs font-black tracking-widest text-[var(--accent-emerald)] uppercase">
                    📋 TIMELINE FEED
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold">
                    Chronological scoreboard feed logs. Click any record to sync tone settings.
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {match.recentEvents.map((evt, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setHypeInput(evt.desc);
                        setActiveTab("composer");
                        handleGenerateHype(evt.desc);
                      }}
                      className="group bg-[var(--bg-input)] hover:bg-[var(--card-bg-hover)] p-3.5 rounded-xl border border-[var(--card-border)] hover:border-[var(--card-border-hover)] flex justify-between items-start gap-4 cursor-pointer transition-all duration-200"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase ${
                            evt.event === "WICKET" ? "bg-red-950/30 border-red-900/40 text-red-400" :
                            evt.event === "SIX" ? "bg-violet-950/30 border-violet-900/40 text-violet-400" :
                            evt.event === "FOUR" ? "bg-emerald-950/30 border-emerald-900/40 text-emerald-400" :
                            "bg-slate-900/50 border-[var(--card-border)] text-[var(--text-secondary)]"
                          }`}>
                            {evt.event}
                          </span>
                          <span className="text-[9px] text-[var(--text-muted)] font-bold">
                            Over {evt.overs}
                          </span>
                        </div>
                        <p className="text-[var(--text-primary)] text-xs font-semibold leading-relaxed">
                          {evt.desc}
                        </p>
                      </div>
                      <span className="text-[8px] text-[var(--text-muted)] group-hover:text-[var(--accent-violet)] font-extrabold uppercase whitespace-nowrap self-center bg-[var(--bg-primary)] border border-[var(--card-border)] px-2 py-1 rounded transition-all">
                        ⚡ HYPE
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            </div>
          </div>
        )}

        {/* TAB 2: AI HYPE COMPOSER PORTAL */}
        {activeTab === "composer" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Input Composer details */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <article className="stadium-card bg-[var(--card-bg)] flex flex-col gap-5">
                <div className="flex justify-between items-center pb-3 border-b border-[var(--card-border)]">
                  <div className="flex flex-col gap-0.5">
                    <h3 className="text-xs font-black tracking-widest text-[var(--accent-violet)] uppercase flex items-center gap-1.5">
                      🤖 AI HYPE STUDIO ENGINE
                    </h3>
                    <p className="text-[9px] text-[var(--text-muted)] font-bold">Powered by Gemini Pro</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase">Auto-Hype:</span>
                    <button 
                      onClick={() => setAutoHype(!autoHype)}
                      className={`text-[8px] py-1 px-2.5 rounded-full border font-black transition-all cursor-pointer ${
                        autoHype 
                          ? "bg-[rgba(74,222,128,0.08)] border-[var(--accent-emerald)]/30 text-[var(--accent-emerald)]" 
                          : "bg-[var(--bg-primary)] border-[var(--card-border)] text-[var(--text-muted)]"
                      }`}
                    >
                      {autoHype ? "ACTIVE" : "OFF"}
                    </button>
                  </div>
                </div>

                {/* Prompt textarea */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-[var(--text-secondary)] font-extrabold tracking-wider uppercase">Active Match Moment</span>
                  <textarea
                    value={hypeInput}
                    onChange={(e) => setHypeInput(e.target.value)}
                    placeholder="Describe a play moment here (e.g. 'Kohli smashes the Shaheen delivery for a massive SIX!')"
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-input)] focus:border-[var(--accent-violet)]/50 focus:ring-1 focus:ring-[var(--accent-violet)]/20 p-4 rounded-xl text-xs font-semibold text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none min-h-[100px] resize-none transition-all duration-200"
                  />
                </div>

                {/* Personality choice */}
                <div className="flex flex-col gap-2">
                  <span className="text-[9px] text-[var(--text-secondary)] font-extrabold tracking-wider uppercase">Commentary Personality</span>
                  <div className="grid grid-cols-3 gap-1 bg-[var(--bg-input)] p-1 rounded-full border border-[var(--border-input)]">
                    {["casual", "hardcore", "meme"].map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setFanMode(mode)}
                        className={`text-[9px] py-2 px-1 rounded-full font-black transition-all uppercase cursor-pointer ${
                          fanMode === mode 
                            ? "bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.15)] text-[var(--accent-violet)]" 
                            : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent"
                        }`}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Excitement gauge dial */}
                <div className="bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--border-input)] flex flex-col gap-3">
                  <div className="flex justify-between items-center text-[9px] font-black uppercase">
                    <span className="text-[var(--text-muted)] tracking-wide">Excitement Dial</span>
                    <span style={{ color: impact.color }}>{impact.score} / 100</span>
                  </div>
                  
                  <div className="w-full bg-[var(--bg-primary)] h-1.5 rounded-full overflow-hidden border border-[var(--card-border)] p-[1px]">
                    <div 
                      className="h-full rounded-full transition-all duration-700"
                      style={{ 
                        width: `${impact.score}%`, 
                        backgroundColor: impact.color
                      }}
                    ></div>
                  </div>
                  <span className="text-[8px] font-black uppercase text-center tracking-widest animate-pulse" style={{ color: impact.color }}>
                    {impact.label}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateHype()}
                    disabled={isGenerating || !hypeInput.trim()}
                    className="flex-1 action-btn text-xs py-3.5 cursor-pointer rounded-full"
                  >
                    {isGenerating ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                        GENERATING HYPE...
                      </span>
                    ) : (
                      <>⚡ GENERATE HYPE</>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setHypeInput("");
                      setAiOutput(null);
                    }}
                    className="pill-btn justify-center text-xs py-3.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] border-[var(--card-border)] cursor-pointer rounded-full"
                  >
                    🗑️ CLEAR
                  </button>
                </div>

                {aiError && <span className="text-[9px] text-red-400 font-semibold uppercase">⚠️ {aiError}</span>}
              </article>
            </div>

            {/* Generated results cards */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {aiOutput ? (
                <div className="flex flex-col gap-4">
                  {/* Commentary */}
                  <div className="stadium-card bg-[var(--card-bg)] border-[var(--accent-emerald)]/10 flex flex-col justify-between p-6 relative overflow-hidden ai-output-stagger" style={{ animationDelay: "0ms" }}>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] font-black text-[var(--accent-emerald)] uppercase tracking-wider">🎙️ AI Stadium Commentary</span>
                        <button 
                          onClick={() => handleCopy(aiOutput.commentary, "comm")}
                          className="text-[9px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 bg-[var(--bg-input)] rounded-full border border-[var(--card-border)] transition-all font-bold cursor-pointer"
                        >
                          {copiedKey === "comm" ? "✓ COPIED" : "📋 COPY"}
                        </button>
                      </div>
                      <p className="text-[var(--text-primary)] text-xs font-semibold italic leading-relaxed border-l-2 border-[var(--accent-emerald)] pl-3 py-0.5">
                        "{aiOutput.commentary}"
                      </p>
                    </div>
                  </div>

                  {/* Meme */}
                  <div className="stadium-card bg-[var(--card-bg)] border-[var(--accent-violet)]/10 flex flex-col justify-between p-6 relative overflow-hidden ai-output-stagger" style={{ animationDelay: "100ms" }}>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] font-black text-[var(--accent-violet)] uppercase tracking-wider">😂 Viral Meme Pitch</span>
                        <button 
                          onClick={() => handleCopy(aiOutput.meme, "meme")}
                          className="text-[9px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 bg-[var(--bg-input)] rounded-full border border-[var(--card-border)] transition-all font-bold cursor-pointer"
                        >
                          {copiedKey === "meme" ? "✓ COPIED" : "📋 COPY"}
                        </button>
                      </div>
                      <p className="text-[var(--text-secondary)] text-xs font-semibold leading-relaxed bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--card-border)] italic">
                        "{aiOutput.meme}"
                      </p>
                    </div>
                  </div>

                  {/* Caption */}
                  <div className="stadium-card bg-[var(--card-bg)] border-[var(--accent-orange)]/10 flex flex-col justify-between p-6 relative overflow-hidden ai-output-stagger" style={{ animationDelay: "200ms" }}>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] font-black text-[var(--accent-orange)] uppercase tracking-wider">📱 Reel Caption Ideas</span>
                        <button 
                          onClick={() => handleCopy(aiOutput.reel, "reel")}
                          className="text-[9px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 bg-[var(--bg-input)] rounded-full border border-[var(--card-border)] transition-all font-bold cursor-pointer"
                        >
                          {copiedKey === "reel" ? "✓ COPIED" : "📋 COPY"}
                        </button>
                      </div>
                      <div className="text-[var(--text-secondary)] text-xs font-semibold leading-relaxed bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--card-border)]">
                        {aiOutput.reel}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="stadium-card bg-[var(--card-bg)] p-20 flex flex-col items-center justify-center text-center gap-3 border-dashed border-[var(--card-border)]">
                  <span className="text-4xl opacity-35">⚡</span>
                  <span className="text-[10px] font-black uppercase tracking-widest leading-relaxed text-[var(--text-muted)] max-w-xs">
                    Write cricket events or click "HYPE" on the live timeline to generate dynamic social media contents instantly.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FAN INTERACTION ARENA PORTAL */}
        {activeTab === "arena" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Audience Crowd noise and cheers */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Crowd Reactions Bar (Circular icons) */}
              <article className="stadium-card bg-[var(--card-bg)] flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-black tracking-widest text-[var(--accent-emerald)] uppercase">
                    📢 LIVE STADIUM CROWD FEEDBACK
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] font-bold">
                    Interact in real-time with standard stadium expressions.
                  </p>
                </div>

                <div className="flex justify-between items-center px-2">
                  {Object.keys(reactions).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleEmojiClick(emoji)}
                      className="circular-react-btn group cursor-pointer"
                    >
                      <span className="text-xl mb-0.5 group-hover:scale-110 transition-transform">
                        {emoji}
                      </span>
                      <span className="text-[9px] font-black text-[var(--text-muted)] group-hover:text-[var(--accent-violet)]">
                        {reactions[emoji]}
                      </span>
                    </button>
                  ))}
                </div>
              </article>

              {/* Tug-of-war */}
              <article className="stadium-card bg-[var(--card-bg)] flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-black tracking-widest text-[var(--accent-violet)] uppercase">
                    ⚔️ CHEER BALANCE TUG-OF-WAR
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] font-bold">
                    Join the stadium battle! Keep cheering to shift the live team balance meter.
                  </p>
                </div>

                {/* Progress bar */}
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex justify-between items-center text-[9px] font-black text-[var(--text-secondary)]">
                    <span className="text-[var(--accent-emerald)]">IND ( {cheers.team1} )</span>
                    <span className="text-[var(--accent-violet)]">PAK ( {cheers.team2} )</span>
                  </div>
                  
                  <div className="w-full bg-[var(--bg-input)] h-4 rounded-full overflow-hidden border border-[var(--border-input)] flex relative p-[1px]">
                    <div 
                      className="h-full bg-[var(--accent-emerald)] transition-all duration-500 shadow-[0_0_8px_rgba(74,222,128,0.2)]"
                      style={{ width: `${cheerPct1}%` }}
                    ></div>
                    <div 
                      className="h-full bg-[var(--accent-violet)] transition-all duration-500 shadow-[0_0_8px_rgba(167,139,250,0.2)]"
                      style={{ width: `${100 - cheerPct1}%` }}
                    ></div>
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/70 shadow-lg"></div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => handleCheerIncrement("team1")}
                    className="flex-1 pill-btn justify-center py-2.5 text-xs font-black text-[var(--accent-emerald)] border-[var(--accent-emerald)]/30 hover:bg-[var(--accent-emerald)]/5 cursor-pointer rounded-full"
                  >
                    📣 CHEER IND
                  </button>
                  <button 
                    onClick={() => handleCheerIncrement("team2")}
                    className="flex-1 pill-btn justify-center py-2.5 text-xs font-black text-[var(--accent-violet)] border-[var(--accent-violet)]/30 hover:bg-[var(--accent-violet)]/5 cursor-pointer rounded-full"
                  >
                    📣 CHEER PAK
                  </button>
                </div>
              </article>
            </div>

            {/* Prediction Poll */}
            <div className="lg:col-span-4">
              <article className="stadium-card bg-[var(--card-bg)] flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-black tracking-widest text-[var(--accent-orange)] uppercase">
                    🗳️ PREDICTION POOL
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] font-bold">
                    Who will win today's game? Lock your choice in.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {/* IND */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase">
                      <span className={indLeading ? "text-[var(--accent-emerald)] font-black" : "text-[var(--text-primary)]"}>India</span>
                      <span className="text-[var(--accent-emerald)]">{getPct(predictions.team1)}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-input)] h-1.5 rounded-full border border-[var(--border-input)]">
                      <div 
                        className="h-full bg-[var(--accent-emerald)] rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${getPct(predictions.team1)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* PAK */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase">
                      <span className={pakLeading ? "text-[var(--accent-violet)] font-black" : "text-[var(--text-primary)]"}>Pakistan</span>
                      <span className="text-[var(--accent-violet)]">{getPct(predictions.team2)}%</span>
                    </div>
                    <div className="w-full bg-[var(--bg-input)] h-1.5 rounded-full border border-[var(--border-input)]">
                      <div 
                        className="h-full bg-[var(--accent-violet)] rounded-full transition-all duration-700 ease-out" 
                        style={{ width: `${getPct(predictions.team2)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => handleCastVote("team1")}
                    disabled={hasVoted}
                    className={`flex-1 py-2.5 rounded-full border text-[10px] font-black uppercase transition-all cursor-pointer ${
                      hasVoted 
                        ? "bg-transparent border-[var(--card-border)] text-[var(--text-muted)] cursor-not-allowed" 
                        : "bg-[var(--accent-emerald-glow)] border-[var(--accent-emerald)]/20 text-[var(--accent-emerald)] hover:bg-[var(--accent-emerald-glow)] hover:scale-[1.03]"
                    }`}
                  >
                    🗳️ VOTE IND
                  </button>
                  <button
                    onClick={() => handleCastVote("team2")}
                    disabled={hasVoted}
                    className={`flex-1 py-2.5 rounded-full border text-[10px] font-black uppercase transition-all cursor-pointer ${
                      hasVoted 
                        ? "bg-transparent border-[var(--card-border)] text-[var(--text-muted)] cursor-not-allowed" 
                        : "bg-[var(--accent-violet-glow)] border-[var(--accent-violet)]/20 text-[var(--accent-violet)] hover:bg-[var(--accent-violet-glow)] hover:scale-[1.03]"
                    }`}
                  >
                    🗳️ VOTE PAK
                  </button>
                </div>

                {hasVoted && (
                  <span className="text-[8px] text-center text-[var(--accent-emerald)] font-black tracking-wider uppercase animate-pulse">
                    ✓ Your prediction has been registered!
                  </span>
                )}
              </article>
            </div>
          </div>
        )}

        {/* TAB 4: PREMIUM FULL-HEIGHT CHATBOT CONTAINER */}
        {activeTab === "assistant" && (
          <article className="stadium-card bg-[var(--card-bg)] w-full h-[550px] flex flex-col overflow-hidden relative backdrop-blur-2xl animate-fade-in p-0">
            <div className="absolute top-0 right-0 w-36 h-36 bg-[var(--accent-violet-glow)] blur-[45px] pointer-events-none rounded-full"></div>
            
            {/* Header */}
            <div className="bg-[var(--bg-input)] border-b border-[var(--card-border)] p-4 flex justify-between items-center z-10">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">🤖</span>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-none font-outfit uppercase">HypeX Match Assistant</h4>
                  <span className="text-[8px] text-[var(--accent-emerald)] font-extrabold uppercase tracking-wider">Gemini Pro API Live Score Sync Active</span>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-[rgba(0,0,0,0.02)] z-10">
              {chatMessages.map((msg, index) => (
                <div 
                  key={index}
                  className={`flex flex-col max-w-[80%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"}`}
                >
                  <span className={`text-[11px] px-4 py-3 rounded-2xl leading-relaxed font-semibold shadow-sm ${
                    msg.sender === "user"
                      ? "bg-[#6366F1] text-white rounded-br-none"
                      : "bg-[var(--bg-input)] text-[var(--text-primary)] border border-[var(--card-border)] rounded-bl-none"
                  }`}>
                    {msg.text}
                  </span>
                </div>
              ))}
              
              {chatLoading && (
                <div className="self-start flex flex-col max-w-[80%] items-start">
                  <div className="bg-[var(--bg-input)] border border-[var(--card-border)] rounded-2xl rounded-bl-none p-3.5 shadow-sm flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Submission Footer Form */}
            <form onSubmit={handleChatSubmit} className="p-4 bg-[var(--bg-input)] border-t border-[var(--card-border)] flex gap-2 z-10">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about live score details, target calculations, batsmen rates, or bowler metrics..."
                className="flex-1 bg-[var(--bg-primary)] border border-[var(--card-border)] focus:border-[var(--accent-violet)]/50 rounded-xl px-4 py-3 text-xs font-semibold text-[var(--text-primary)] focus:outline-none transition-colors"
              />
              <button 
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="bg-[var(--accent-violet)] hover:bg-violet-500 disabled:opacity-30 disabled:hover:bg-[var(--accent-violet)] text-black px-5 py-3 rounded-xl text-xs font-black transition-colors uppercase cursor-pointer"
              >
                ASK GEMINI
              </button>
            </form>
          </article>
        )}

      </div>
      
    </div>
  );
}
