"use client";

import { useState, useEffect } from "react";
import { 
  subscribeToReactions, 
  incrementReaction, 
  subscribeToPredictions, 
  castPredictionVote, 
  subscribeToCheerBattle, 
  incrementCheer 
} from "../../lib/firebase";

export default function FanArena() {
  // Reaction states
  const [reactions, setReactions] = useState({ "🔥": 0, "😮": 0, "🙌": 0, "😂": 0, "👑": 0 });
  const [activeReaction, setActiveReaction] = useState(null);

  // Cheer states
  const [cheers, setCheers] = useState({ team1: 120, team2: 110 });
  const [activeCheer, setActiveCheer] = useState(null);

  // Prediction states
  const [predictions, setPredictions] = useState({ team1: 15, team2: 12, draw: 3 });
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);

  // Equalizer active state for micro-animations
  const [isAtmosphereHigh, setIsAtmosphereHigh] = useState(false);

  // Subscriptions to Real-Time Data (Firebase/LocalStorage)
  useEffect(() => {
    // 1. Reactions sync
    const unsubReactions = subscribeToReactions((data) => {
      if (data) setReactions(data);
    });

    // 2. Predictions sync
    const unsubPredictions = subscribeToPredictions((data) => {
      if (data) setPredictions(data);
    });

    // 3. Cheers battle sync
    const unsubCheers = subscribeToCheerBattle((data) => {
      if (data) setCheers(data);
    });

    // Load user vote from local storage to prevent multiple voting
    try {
      const savedVote = localStorage.getItem("hypex_user_prediction_vote");
      if (savedVote) {
        setHasVoted(true);
        setUserVote(savedVote);
      }
    } catch {}

    return () => {
      unsubReactions();
      unsubPredictions();
      unsubCheers();
    };
  }, []);

  // Reactions Incrementor
  const handleEmojiReact = async (emoji) => {
    setActiveReaction(emoji);
    setTimeout(() => setActiveReaction(null), 800);

    // Dynamic equalizer atmosphere trigger
    setIsAtmosphereHigh(true);
    setTimeout(() => setIsAtmosphereHigh(false), 2000);

    await incrementReaction(emoji, (newReactions) => {
      setReactions(newReactions);
    });
  };

  // Cheers Battle Incrementor
  const handleCheerTap = async (team) => {
    setActiveCheer(team);
    setTimeout(() => setActiveCheer(null), 800);

    setIsAtmosphereHigh(true);
    setTimeout(() => setIsAtmosphereHigh(false), 2500);

    await incrementCheer(team, (newCheers) => {
      setCheers(newCheers);
    });
  };

  // Prediction Vote Trigger
  const handleVote = async (selection) => {
    if (hasVoted) return;

    setHasVoted(true);
    setUserVote(selection);

    try {
      localStorage.setItem("hypex_user_prediction_vote", selection);
    } catch {}

    await castPredictionVote(selection, (newPredictions) => {
      setPredictions(newPredictions);
    });
  };

  // Calculation utilities
  const totalCheers = (cheers.team1 || 0) + (cheers.team2 || 0);
  const indPercent = totalCheers > 0 ? Math.round(((cheers.team1 || 0) / totalCheers) * 100) : 50;
  const pakPercent = totalCheers > 0 ? Math.round(((cheers.team2 || 0) / totalCheers) * 100) : 50;

  const totalVotes = (predictions.team1 || 0) + (predictions.team2 || 0) + (predictions.draw || 0);
  const getVotePercent = (votes) => {
    return totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
  };

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 select-none py-10">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="live-indicator mb-2 font-extrabold tracking-wider">
            ⚡ LIVE CROWD ATMOSPHERE
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] font-outfit uppercase tracking-tight">
            ⚔️ HypeX Fan Arena
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-semibold tracking-wider uppercase mt-1">
            Join the battle: Cheer, React, and predict in real-time with other fans
          </p>
        </div>

        {/* Dynamic Equalizer Visualizer */}
        <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] px-4 py-2 rounded-full">
          <div className="flex items-end gap-1.5 h-6 w-20">
            <span className={`eq-bar ${isAtmosphereHigh ? "active" : ""}`} style={{ height: "40%" }}></span>
            <span className={`eq-bar ${isAtmosphereHigh ? "active" : ""}`} style={{ height: "70%" }}></span>
            <span className={`eq-bar ${isAtmosphereHigh ? "active" : ""}`} style={{ height: "50%" }}></span>
            <span className={`eq-bar ${isAtmosphereHigh ? "active" : ""}`} style={{ height: "90%" }}></span>
            <span className={`eq-bar ${isAtmosphereHigh ? "active" : ""}`} style={{ height: "30%" }}></span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">Stadium</span>
            <span className="text-[10px] font-extrabold text-[var(--accent-emerald)] uppercase tracking-wide">
              {isAtmosphereHigh ? "🔥 ROARING" : "🔊 ENGAGED"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Fan Arena Sections Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Column 1 & 2: Tug-of-war Cheer Battle & Emojis reactions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Section A: IND vs PAK Cheering Tug-of-War */}
          <div className="stadium-card flex flex-col gap-6 relative overflow-hidden">
            {/* Background Light Glows */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-emerald-500/5 blur-2xl pointer-events-none"></div>
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-rose-500/5 blur-2xl pointer-events-none"></div>

            <div>
              <span className="live-indicator bg-indigo-950/50 border-indigo-900 text-indigo-400 font-extrabold text-[9px] mb-1">
                ⚔️ LIVE CHEERING WAR
              </span>
              <h3 className="text-md font-black text-[var(--text-primary)] uppercase tracking-wider">
                India vs Pakistan Tug-of-War
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Tap your team button repeatedly to pull the cheer balance in your direction!</p>
            </div>

            {/* Tug-of-War Progress Bar */}
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex justify-between items-center text-xs font-bold tracking-wide">
                <span className="text-[var(--accent-emerald)]">🇮🇳 INDIA ({cheers.team1.toLocaleString()})</span>
                <span className="text-[var(--color-danger)]">PAKISTAN ({cheers.team2.toLocaleString()}) 🇵🇰</span>
              </div>

              {/* Progress Slider Track */}
              <div className="h-4 w-full rounded-full bg-[var(--bg-input)] border border-[var(--border-input)] overflow-hidden flex relative p-[1px]">
                <div 
                  className="h-full bg-[var(--accent-emerald)] transition-all duration-500 shadow-[0_0_8px_rgba(74,222,128,0.2)]"
                  style={{ width: `${indPercent}%` }}
                ></div>
                <div 
                  className="h-full bg-[var(--color-danger)] transition-all duration-500 shadow-[0_0_8px_rgba(248,113,113,0.2)]"
                  style={{ width: `${pakPercent}%` }}
                ></div>
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-white/70 shadow-lg"></div>
              </div>

              <div className="flex justify-between items-center text-[10px] font-black text-slate-500 tracking-wider">
                <span>{indPercent}% CHEERS</span>
                <span>{pakPercent}% CHEERS</span>
              </div>
            </div>

            {/* Click Cheer Buttons */}
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => handleCheerTap("team1")}
                className="flex-1 pill-btn justify-center py-3 text-xs font-black text-[var(--accent-emerald)] border-[var(--accent-emerald)]/30 hover:bg-[var(--accent-emerald)]/5 rounded-full"
              >
                📣 CHEER INDIA
              </button>
              <button 
                onClick={() => handleCheerTap("team2")}
                className="flex-1 pill-btn justify-center py-3 text-xs font-black text-[var(--color-danger)] border-[var(--color-danger)]/30 hover:bg-[var(--color-danger)]/5 rounded-full"
              >
                📣 CHEER PAKISTAN
              </button>
            </div>
          </div>

          {/* Section B: Global Emoji reactions Deck */}
          <div className="stadium-card flex flex-col gap-6">
            <div>
              <span className="live-indicator bg-emerald-950/50 border-emerald-900 text-emerald-400 font-extrabold text-[9px] mb-1">
                📣 CROWD NOISE DECK
              </span>
              <h3 className="text-md font-black text-[var(--text-primary)] uppercase tracking-wider">
                Instant Emoji Reactions board
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Tap standard cricket emojis to express reaction, synced in real-time across users!</p>
            </div>

            <div className="flex justify-center items-center gap-4 mt-4 flex-wrap">
              {Object.keys(reactions).map((emoji) => {
                const count = reactions[emoji] || 0;
                const isTapped = activeReaction === emoji;

                return (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiReact(emoji)}
                    className={`circular-react-btn group ${
                      isTapped 
                        ? "bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.3)] text-[var(--accent-emerald)]" 
                        : ""
                    }`}
                  >
                    <span className="text-xl mb-0.5 group-hover:scale-110 transition-transform">
                      {emoji}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 group-hover:text-[var(--accent-violet)]">
                      {count.toLocaleString()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Column 3: Live Predictions Pool */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="stadium-card flex flex-col gap-6">
            <div>
              <span className="live-indicator bg-orange-950/50 border-orange-900 text-orange-400 font-extrabold text-[9px] mb-1">
                📊 FANS PREDICTIONS POOL
              </span>
              <h3 className="text-md font-black text-[var(--text-primary)] uppercase tracking-wider">
                Live Match Verdict
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Vote for the final match outcome. You can lock in only one prediction!</p>
            </div>

            {/* Prediction Question Prompt */}
            <div className="bg-[var(--bg-input)] border border-[var(--border-input)] rounded-2xl p-4 text-center flex flex-col gap-1.5">
              <span className="text-[9px] text-[var(--accent-orange)] font-extrabold tracking-widest uppercase">SUPER 8 SHOWDOWN</span>
              <h4 className="text-xs md:text-sm font-black text-[var(--text-primary)] leading-relaxed uppercase">
                Who will claim victory in India vs Pakistan?
              </h4>
            </div>

            {/* Poll options card */}
            <div className="flex flex-col gap-4 mt-4">
              {[
                { key: "team1", label: "India 🇮🇳" },
                { key: "team2", label: "Pakistan 🇵🇰" },
                { key: "draw", label: "Match Draw 🤝" }
              ].map((opt) => {
                const votes = predictions[opt.key] || 0;
                const percent = getVotePercent(votes);
                const isSelected = userVote === opt.key;

                return (
                  <div key={opt.key} className="flex flex-col gap-1.5">
                    <button
                      disabled={hasVoted}
                      onClick={() => handleVote(opt.key)}
                      className={`w-full py-3.5 px-5 rounded-full border text-xs font-bold tracking-wide transition-all relative overflow-hidden group select-none flex items-center justify-between ${
                        isSelected 
                          ? "bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.25)] text-[var(--text-primary)] font-black" 
                          : hasVoted
                            ? "bg-transparent border-[var(--card-border)] text-slate-600 cursor-not-allowed"
                            : "bg-[var(--bg-input)] border border-[var(--border-input)] hover:border-[var(--card-border-hover)] hover:bg-[var(--card-bg-hover)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <span>{opt.label}</span>
                      
                      <span className={`text-[11px] font-black ${isSelected ? 'text-[var(--accent-violet)]' : 'text-slate-400'}`}>
                        {hasVoted ? `${percent}%` : "VOTE"}
                      </span>
                    </button>

                    {/* Progress Fill Bar (if voted) */}
                    {hasVoted && (
                      <div className="h-1.5 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--card-border)] p-[1px]">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${isSelected ? 'from-[var(--accent-violet)] to-[#8B5CF6]' : 'from-slate-700 to-slate-800'} transition-all duration-1000 ease-out`}
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {hasVoted && (
              <span className="text-[10px] text-center text-[var(--accent-violet)] font-extrabold tracking-wider uppercase animate-pulse mt-2">
                ✓ Your prediction has been registered globally!
              </span>
            )}
          </div>

          {/* Quick Match Facts Box */}
          <div className="stadium-card flex flex-col gap-3">
            <h4 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider pb-2 border-b border-[var(--card-border)]">
              ⚡ FAN ARENA INSIGHTS
            </h4>
            <div className="flex flex-col gap-3.5 mt-1 text-[11px] leading-relaxed text-[var(--text-secondary)] font-semibold">
              <div className="flex justify-between items-start">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Total cheers</span>
                <span className="text-[var(--text-primary)] font-extrabold">{totalCheers.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Predictions locked</span>
                <span className="text-[var(--text-primary)] font-extrabold">{totalVotes.toLocaleString()} fans</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Match location</span>
                <span className="text-[var(--accent-violet)] font-extrabold">Melbourne Cricket Ground</span>
              </div>
            </div>
          </div>
        </div>

      </section>
    </main>
  );
}

