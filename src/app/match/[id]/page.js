"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getMatchDetails, triggerSimulatedEvent } from "../../../lib/rapidapi";
import { generateHypeContent } from "../../../lib/gemini";
import { 
  subscribeToReactions, 
  incrementReaction, 
  subscribeToPredictions, 
  castPredictionVote,
  subscribeToCheerBattle,
  incrementCheer,
  addHighlight
} from "../../../lib/firebase";
import CricketPitch from "../../../components/CricketPitch";

export default function MatchCenter() {
  const params = useParams();
  const router = useRouter();
  const matchId = params.id;

  // --- Dynamic Scorecard State ---
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("live"); // Tabbed interface controller: live, composer, arena

  // --- AI Generator Options ---
  const [fanMode, setFanMode] = useState("casual");
  const [autoHype, setAutoHype] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiOutput, setAiOutput] = useState(null);
  const [error, setError] = useState(null);

  // --- Interaction States ---
  const [reactions, setReactions] = useState({ "🔥": 0, "😮": 0, "🙌": 0, "😂": 0, "👑": 0 });
  const [predictions, setPredictions] = useState({ team1: 15, team2: 12, draw: 3 });
  const [cheers, setCheers] = useState({ team1: 120, team2: 110 });
  const [hasVoted, setHasVoted] = useState(false);
  const [copiedSection, setCopiedSection] = useState(null);
  const [shareStatus, setShareStatus] = useState(false);

  // Get Moment Impact Meter attributes based on event type
  const getImpactDetails = (event) => {
    switch (event) {
      case "WICKET":
        return { score: 95, label: "CRITICAL BREAKTHROUGH!", color: "var(--color-danger)", shadow: "var(--color-danger-glow)" };
      case "SIX":
        return { score: 85, label: "MONUMENTAL BOUNDARY!", color: "var(--accent-violet)", shadow: "var(--accent-violet-glow)" };
      case "FOUR":
        return { score: 65, label: "TACTICAL PRECISION!", color: "var(--accent-emerald)", shadow: "var(--accent-emerald-glow)" };
      case "LAST OVER":
        return { score: 90, label: "CLIMACTIC PRESSURE!", color: "var(--accent-orange)", shadow: "var(--accent-orange-glow)" };
      default:
        return { score: 25, label: "STEADY BUILD-UP", color: "var(--accent-violet)", shadow: "var(--accent-violet-glow)" };
    }
  };

  const impact = match ? getImpactDetails(match.event) : { score: 20, label: "STEADY", color: "var(--accent-violet)", shadow: "var(--accent-violet-glow)" };

  // --- Load Scorecard & Subscriptions ---
  useEffect(() => {
    async function loadMatch() {
      const details = await getMatchDetails(matchId);
      setMatch(details);
      setLoading(false);
    }
    loadMatch();

    // Auto-refresh match scoreboard every 10 seconds as required
    const refreshTimer = setInterval(() => {
      loadMatch();
    }, 10000);

    // Live reactions stream
    const unsubReactions = subscribeToReactions((data) => setReactions(data));
    
    // Live predictions poll
    const unsubPredictions = subscribeToPredictions((data) => setPredictions(data));

    // Live cheer battle
    const unsubCheers = subscribeToCheerBattle((data) => setCheers(data));

    // Load User voted state from localStorage
    try {
      const savedVote = localStorage.getItem("hypex_user_prediction_vote");
      if (savedVote) {
        setHasVoted(true);
      }
    } catch {}

    return () => {
      clearInterval(refreshTimer);
      unsubReactions();
      unsubPredictions();
      unsubCheers();
    };
  }, [matchId]);

  // --- Auto Hype trigger mechanism ---
  useEffect(() => {
    if (autoHype && match && match.eventDesc) {
      handleGenerateHype(match.eventDesc);
    }
  }, [match?.event, match?.score, autoHype]);

  // --- Event Triggers ---
  const handleTriggerSimulatedEvent = (type) => {
    const updated = triggerSimulatedEvent(matchId, type);
    if (updated) {
      setMatch({ ...updated });
    }
  };

  // --- AI Generator ---
  const handleGenerateHype = async (momentText) => {
    const activeText = typeof momentText === "string" ? momentText : (match?.eventDesc || "India vs Pakistan live action");
    setIsGenerating(true);
    setError(null);
    setShareStatus(false);

    try {
      const output = await generateHypeContent(activeText, fanMode);
      setAiOutput(output);
      
      // Auto-save generated highlight to Firebase shared gallery collection as required!
      await addHighlight(activeText, output.commentary, output.meme, output.reel, fanMode);
    } catch (e) {
      setError(e.message || "Failed to contact Gemini Pro.");
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Interaction increments ---
  const handleEmojiClick = (emoji) => {
    incrementReaction(emoji, (updated) => setReactions(updated));
  };

  const handleVote = (selection) => {
    if (hasVoted) return;
    castPredictionVote(selection, (updated) => setPredictions(updated));
    setHasVoted(true);
    try {
      localStorage.setItem("hypex_user_prediction_vote", selection);
    } catch {}
  };

  const handleCheer = (team) => {
    incrementCheer(team, (updated) => setCheers(updated));
  };

  // Predictions percentage helper
  const totalVotes = predictions.team1 + predictions.team2 + predictions.draw;
  const getPct = (votes) => {
    if (totalVotes === 0) return 33;
    return Math.round((votes / totalVotes) * 100);
  };

  // Cheers calculations for visual tug-of-war meter
  const totalCheers = cheers.team1 + cheers.team2;
  const cheerPct1 = totalCheers === 0 ? 50 : Math.round((cheers.team1 / totalCheers) * 100);

  // Copy helper
  const handleCopyText = (text, key) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedSection(key);
      setTimeout(() => setCopiedSection(null), 2000);
    }
  };

  // Share popup mock
  const handleShareCard = () => {
    setShareStatus(true);
    setTimeout(() => setShareStatus(false), 2500);
  };

  if (loading || !match) {
    return (
      <div className="flex-1 flex justify-center items-center py-24 select-none bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-[var(--card-border)] border-t-[var(--accent-emerald)] rounded-full animate-spin"></div>
          <span className="text-[10px] font-black text-[var(--text-muted)] tracking-widest uppercase animate-pulse">
            LOADING MATCH ARENA...
          </span>
        </div>
      </div>
    );
  }

  // Segmented Tabs
  const tabsList = [
    { id: "live", label: "🏏 Live Simulation", icon: "🏟️" },
    { id: "composer", label: "🤖 AI Hype Composer", icon: "⚡" },
    { id: "arena", label: "⚔️ Fan Arena", icon: "🔥" }
  ];

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 select-none py-8 animate-fade-in min-h-screen">
      
      {/* Navigation & Back Button */}
      <div className="flex items-center justify-between w-full">
        <button 
          onClick={() => router.push("/dashboard")}
          className="pill-btn text-xs font-bold py-2 px-4 rounded-full border-[var(--card-border)] hover:bg-[var(--card-bg-hover)] cursor-pointer"
        >
          ← Back to Dashboard
        </button>
      </div>

      {/* 🔝 UPGRADED SCOREBOARD: Centred, Large, Modern */}
      <section className="stadium-card flex flex-col justify-center items-center gap-6 p-8 relative overflow-hidden">
        
        {/* Subtle horizontal gradient overlay */}
        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[var(--card-border)] to-transparent"></div>

        {/* Metadata Ticker */}
        <div className="flex items-center gap-4 text-[10px]">
          <div className="relative">
            <span className="live-indicator font-extrabold tracking-widest text-[9px] px-2 py-0.5">
              <span className="live-dot mr-1"></span>
              LIVE MATCH
            </span>
          </div>
          <span className="text-[var(--card-border)] font-bold">•</span>
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
          
          {/* Team 1 */}
          <div className="flex-1 text-right">
            <h3 className="text-xl md:text-3xl font-bold text-[var(--text-primary)] font-outfit tracking-tight">
              {match.team1Abbr || (match.team1 ? match.team1.substring(0, 3).toUpperCase() : "IND")}
            </h3>
            <p className="text-[10px] font-bold text-[var(--text-secondary)] tracking-wider uppercase mt-0.5">
              {match.team1 || "India"}
            </p>
          </div>

          {/* Divider */}
          <div className="w-[1px] h-12 bg-[var(--card-border)]"></div>

          {/* Giant Centered Score */}
          <div className="text-center min-w-[140px] md:min-w-[200px]">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-[var(--text-primary)] font-outfit leading-none">
              {match.score}
            </h2>
            <span className="text-[11px] font-extrabold text-[var(--text-muted)] tracking-widest uppercase block mt-2">
              Overs {match.overs} • Target {match.target || "150"}
            </span>
          </div>

          {/* Divider */}
          <div className="w-[1px] h-12 bg-[var(--card-border)]"></div>

          {/* Team 2 */}
          <div className="flex-1 text-left">
            <h3 className="text-xl md:text-3xl font-bold text-[var(--text-secondary)] font-outfit tracking-tight">
              {match.team2Abbr || (match.team2 ? match.team2.substring(0, 3).toUpperCase() : "PAK")}
            </h3>
            <p className="text-[10px] font-medium text-[var(--text-muted)] tracking-wider uppercase mt-0.5">
              {match.team2 || "Pakistan"}
            </p>
          </div>
        </div>

        {/* Active Batsmen and Bowler Ticker Banners */}
        {match.batsmen && match.bowler && (
          <div className="w-full border-t border-[var(--card-border)] pt-5 mt-1 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-[8px] text-[var(--text-muted)] font-black uppercase tracking-wider bg-[var(--card-bg-hover)] border border-[var(--card-border)] px-2 py-0.5 rounded">BATSMAN</span>
              <span className="font-extrabold text-[var(--text-primary)]">
                {match.batsmen[0]?.name || "V. Kohli"}
              </span>
              <span className="text-[var(--text-secondary)] font-medium">
                <strong className="text-[var(--accent-emerald)] font-black">{match.batsmen[0]?.runs || 0}</strong> ({match.batsmen[0]?.balls || 0}b) • SR: {match.batsmen[0]?.strikeRate || 0}
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
        )}
      </section>

      {/* 🎛️ PORTAL NAVIGATION SYSTEM */}
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

      {/* 🏟️ TAB VIEWPORT PORTS */}
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
                  Ball Trajectory Simulator
                </h3>
                <p className="text-xs text-[var(--text-secondary)]">
                  Watch live deliveries roll across the boundary or knock wickets out. Trigger event buttons to animate paths.
                </p>
              </div>

              {/* Pitch Component */}
              <CricketPitch event={match.event} eventDesc={match.eventDesc} />

              {/* Match Deciders Card (Pill Actions) */}
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

            {/* Timeline */}
            <div className="lg:col-span-5">
              <article className="stadium-card bg-[var(--card-bg)] flex flex-col gap-5 min-h-[500px]">
                <div className="flex flex-col gap-1 pb-3 border-b border-[var(--card-border)]">
                  <h3 className="text-xs font-black tracking-widest text-[var(--accent-emerald)] uppercase">
                    📋 EVENT TIMELINE
                  </h3>
                  <p className="text-[10px] text-[var(--text-muted)] font-bold">
                    Dynamic stream of live events. Tap "Hype" to load into Gemini.
                  </p>
                </div>

                <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                  {match.recentEvents.map((evt, idx) => (
                    <div 
                      key={idx} 
                      onClick={() => {
                        setActiveTab("composer");
                        handleGenerateHype(evt.desc);
                      }}
                      className="group bg-[var(--bg-input)] hover:bg-[var(--card-bg-hover)] p-3 rounded-xl border border-[var(--card-border)] hover:border-[var(--card-border-hover)] flex justify-between items-start gap-4 cursor-pointer transition-all duration-200"
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
                          <span className="text-[9px] text-[var(--text-muted)] font-bold">Over {evt.overs}</span>
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
                      🤖 AI HYPE LAB
                    </h3>
                    <p className="text-[9px] text-[var(--text-muted)] font-bold">Google Gemini Pro API</p>
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

                {/* Moment Impact Meter */}
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

                {/* Generate Action Button */}
                <button
                  onClick={() => handleGenerateHype()}
                  disabled={isGenerating}
                  className="action-btn w-full text-xs py-3.5 cursor-pointer rounded-full"
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                      GENERATING HYPE...
                    </span>
                  ) : (
                    <>⚡ GENERATE LIVE AI HYPE</>
                  )}
                </button>

                {error && <span className="text-[9px] text-red-400 font-semibold uppercase">⚠️ {error}</span>}
              </article>
            </div>

            {/* Generated Outputs Display Cards */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              {aiOutput ? (
                <div className="flex flex-col gap-4 animate-fade-in">
                  
                  {/* Commentary Card */}
                  <div className="stadium-card bg-[var(--card-bg)] border-[var(--accent-emerald)]/10 flex flex-col justify-between p-6 relative overflow-hidden ai-output-stagger" style={{ animationDelay: "0ms" }}>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] font-black text-[var(--accent-emerald)] uppercase tracking-wider">🎙️ AI Commentary</span>
                        <button 
                          onClick={() => handleCopyText(aiOutput.commentary, "comm")}
                          className="text-[9px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 bg-[var(--bg-input)] rounded-full border border-[var(--card-border)] transition-all font-bold cursor-pointer"
                        >
                          {copiedSection === "comm" ? "✓ COPIED" : "📋 COPY"}
                        </button>
                      </div>
                      <p className="text-[var(--text-primary)] text-xs font-semibold italic leading-relaxed border-l-2 border-[var(--accent-emerald)] pl-3 py-0.5">
                        "{aiOutput.commentary}"
                      </p>
                    </div>
                  </div>

                  {/* Meme Card */}
                  <div className="stadium-card bg-[var(--card-bg)] border-[var(--accent-violet)]/10 flex flex-col justify-between p-6 relative overflow-hidden ai-output-stagger" style={{ animationDelay: "100ms" }}>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] font-black text-[var(--accent-violet)] uppercase tracking-wider">😂 Meme Idea</span>
                        <button 
                          onClick={() => handleCopyText(aiOutput.meme, "meme")}
                          className="text-[9px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 bg-[var(--bg-input)] rounded-full border border-[var(--card-border)] transition-all font-bold cursor-pointer"
                        >
                          {copiedSection === "meme" ? "✓ COPIED" : "📋 COPY"}
                        </button>
                      </div>
                      <p className="text-[var(--text-secondary)] text-xs font-semibold leading-relaxed bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--card-border)] italic">
                        "{aiOutput.meme}"
                      </p>
                    </div>
                  </div>

                  {/* Reel Card */}
                  <div className="stadium-card bg-[var(--card-bg)] border-[var(--accent-orange)]/10 flex flex-col justify-between p-6 relative overflow-hidden ai-output-stagger" style={{ animationDelay: "200ms" }}>
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[9px] font-black text-[var(--accent-orange)] uppercase tracking-wider">📱 Reel Caption</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleCopyText(aiOutput.reel, "reel")}
                            className="text-[9px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 bg-[var(--bg-input)] rounded-full border border-[var(--card-border)] transition-all font-bold cursor-pointer"
                          >
                            {copiedSection === "reel" ? "✓ COPIED" : "📋 COPY"}
                          </button>
                          <button 
                            onClick={handleShareCard}
                            className="text-[9px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2.5 py-1 bg-[var(--bg-input)] rounded-full border border-[var(--card-border)] transition-all font-bold cursor-pointer"
                          >
                            {shareStatus ? "✓ SHARED" : "🔗 SHARE"}
                          </button>
                        </div>
                      </div>
                      <div className="text-[var(--text-secondary)] text-xs font-semibold leading-relaxed bg-[var(--bg-input)] p-3 rounded-xl border border-[var(--card-border)]">
                        {aiOutput.reel}
                      </div>
                    </div>
                  </div>

                  {shareStatus && (
                    <span className="text-[8px] text-center text-[var(--accent-emerald)] font-black tracking-wider uppercase animate-pulse">
                      ✓ Dynamic Highlight Shared dynamically to public gallery!
                    </span>
                  )}
                </div>
              ) : (
                <div className="stadium-card bg-[var(--card-bg)] p-20 flex flex-col items-center justify-center text-center gap-3 border-dashed border-[var(--card-border)]">
                  <span className="text-3xl opacity-20">⚡</span>
                  <span className="text-[9px] font-black uppercase tracking-widest leading-relaxed text-[var(--text-muted)] max-w-xs">
                    Click match deciders or timeline items to activate the AI Studio and yield premium commentary blocks.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: FAN INTERACTION ARENA PORTAL */}
        {activeTab === "arena" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            {/* Reaction Cheering Card (Circular Emojis) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Crowd Reactions Bar (Circular icons) */}
              <article className="stadium-card bg-[var(--card-bg)] flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-black tracking-widest text-[var(--accent-emerald)] uppercase">
                    📢 LIVE STADIUM CROWD
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] font-bold">
                    Interact with the crowd in real-time.
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

              {/* Cheering Tug-of-war balance */}
              <article className="stadium-card bg-[var(--card-bg)] flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-black tracking-widest text-[var(--accent-violet)] uppercase">
                    ⚔️ CHEER CLASH BATTLE
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] font-bold">
                    Clash in the real-time stadium cheering battle.
                  </p>
                </div>

                {/* Visual sliding cheer bar */}
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex justify-between items-center text-[9px] font-black text-[var(--text-secondary)] font-bold">
                    <span className="text-[var(--accent-emerald)]">{match.team1Abbr || "IND"} ( {cheers.team1} )</span>
                    <span className="text-[var(--accent-violet)]">{match.team2Abbr || "PAK"} ( {cheers.team2} )</span>
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
                    onClick={() => handleCheer("team1")}
                    className="flex-1 pill-btn justify-center py-2.5 text-xs font-black text-[var(--accent-emerald)] border-[var(--accent-emerald)]/30 hover:bg-[var(--accent-emerald)]/5 cursor-pointer rounded-full"
                  >
                    📣 CHEER {match.team1Abbr || "IND"}
                  </button>
                  <button 
                    onClick={() => handleCheer("team2")}
                    className="flex-1 pill-btn justify-center py-2.5 text-xs font-black text-[var(--accent-violet)] border-[var(--accent-violet)]/30 hover:bg-[var(--accent-violet)]/5 cursor-pointer rounded-full"
                  >
                    📣 CHEER {match.team2Abbr || "PAK"}
                  </button>
                </div>
              </article>
            </div>

            {/* Predictions Poll */}
            <div className="lg:col-span-4">
              <article className="stadium-card bg-[var(--card-bg)] flex flex-col gap-5">
                <div className="flex flex-col gap-1">
                  <h3 className="text-xs font-black tracking-widest text-[var(--accent-orange)] uppercase">
                    🗳️ PREDICTIONS POOL
                  </h3>
                  <p className="text-[10px] text-[var(--text-secondary)] font-bold">
                    Who takes the win? Lock in your vote.
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  {/* IND */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-[9px] font-black uppercase">
                      <span className={predictions.team1 > predictions.team2 ? "text-[var(--accent-emerald)] font-black" : "text-[var(--text-primary)]"}>{match.team1Abbr || "IND"}</span>
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
                      <span className={predictions.team2 > predictions.team1 ? "text-[var(--accent-violet)] font-black" : "text-[var(--text-primary)]"}>{match.team2Abbr || "PAK"}</span>
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
                    onClick={() => handleVote("team1")}
                    disabled={hasVoted}
                    className={`flex-1 py-2.5 rounded-full border text-[10px] font-black uppercase transition-all cursor-pointer ${
                      hasVoted 
                        ? "bg-transparent border-[var(--card-border)] text-[var(--text-muted)] cursor-not-allowed" 
                        : "bg-[var(--accent-emerald-glow)] border-[var(--accent-emerald)]/20 text-[var(--accent-emerald)] hover:bg-[var(--accent-emerald-glow)] hover:scale-[1.03]"
                    }`}
                  >
                    🗳️ VOTE {match.team1Abbr || "IND"}
                  </button>
                  <button
                    onClick={() => handleVote("team2")}
                    disabled={hasVoted}
                    className={`flex-1 py-2.5 rounded-full border text-[10px] font-black uppercase transition-all cursor-pointer ${
                      hasVoted 
                        ? "bg-transparent border-[var(--card-border)] text-[var(--text-muted)] cursor-not-allowed" 
                        : "bg-[var(--accent-violet-glow)] border-[var(--accent-violet)]/20 text-[var(--accent-violet)] hover:bg-[var(--accent-violet-glow)] hover:scale-[1.03]"
                    }`}
                  >
                    🗳️ VOTE {match.team2Abbr || "PAK"}
                  </button>
                </div>

                {hasVoted && (
                  <span className="text-[8px] text-center text-[var(--accent-emerald)] font-black tracking-wider uppercase animate-pulse">
                    ✓ Live Prediction Saved!
                  </span>
                )}
              </article>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
