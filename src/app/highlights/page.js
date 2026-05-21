"use client";

import { useState, useEffect } from "react";
import { subscribeToHighlights, upvoteHighlight } from "../../lib/firebase";

export default function HighlightsGallery() {
  const [highlights, setHighlights] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [upvotedIds, setUpvotedIds] = useState([]);

  // Sync with Firebase/LocalStorage highlights feed
  useEffect(() => {
    const unsubscribe = subscribeToHighlights((data) => {
      if (data) {
        // Sort highlights by timestamp descending
        const sorted = [...data].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setHighlights(sorted);
      }
    });

    // Load upvoted items from LocalStorage
    try {
      const stored = localStorage.getItem("hypex_upvoted_highlights");
      if (stored) {
        setUpvotedIds(JSON.parse(stored));
      }
    } catch {}

    return () => unsubscribe();
  }, []);

  // Copy to clipboard helper
  const handleCopyToClipboard = (text, key) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  // Upvote increment trigger
  const handleUpvote = async (id) => {
    if (upvotedIds.includes(id)) return; // Prevent duplicate upvoting locally

    const newUpvoted = [...upvotedIds, id];
    setUpvotedIds(newUpvoted);
    try {
      localStorage.setItem("hypex_upvoted_highlights", JSON.stringify(newUpvoted));
    } catch {}

    await upvoteHighlight(id, (newFeed) => {
      // Offline fallback callback updates state directly
      const sorted = [...newFeed].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      setHighlights(sorted);
    });
  };

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 select-none py-10">
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="live-indicator mb-2 font-extrabold tracking-wider">
            📢 PUBLIC FAN ZONE
          </span>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] font-outfit uppercase tracking-tight">
            ✨ Shared Highlights Gallery
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-semibold tracking-wider uppercase mt-1">
            Top viral sports commentaries, memes, and reel captions shared by the community
          </p>
        </div>

        {/* Global Stats Tag */}
        <div className="flex items-center gap-3 bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)] px-4 py-2.5 rounded-full">
          <span className="text-2xl">📊</span>
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none">DATABASE FEED</span>
            <span className="text-[10px] font-extrabold text-[var(--accent-emerald)] uppercase tracking-wide">
              {highlights.length} MOMENTS SYNCED
            </span>
          </div>
        </div>
      </header>

      {/* Masonry or multi-column responsive grid */}
      {highlights.length === 0 ? (
        <div className="stadium-card p-24 flex flex-col items-center justify-center text-[var(--text-secondary)] text-center gap-4">
          <span className="text-4xl opacity-50">✨</span>
          <span className="text-xs font-black uppercase tracking-widest leading-relaxed">
            No highlights shared yet. <br />
            Go to the AI Lab or Match Center to generate and share new moments!
          </span>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
          {highlights.map((hl) => {
            const hasUpvoted = upvotedIds.includes(hl.id);
            const commentaryKey = `comm_${hl.id}`;
            const memeKey = `meme_${hl.id}`;
            const reelKey = `reel_${hl.id}`;

            // Determine tone accent colors
            let toneLabel = hl.fanMode || "casual";
            let toneClass = "text-[var(--accent-emerald)] bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.15)]";
            let cardGlow = "glow-emerald";
            if (hl.fanMode === "hardcore") {
              toneClass = "text-[var(--color-danger)] bg-[rgba(248,113,113,0.08)] border-[rgba(248,113,113,0.15)]";
              cardGlow = "glow-violet";
            } else if (hl.fanMode === "meme") {
              toneClass = "text-[var(--accent-violet)] bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.15)]";
              cardGlow = "glow-orange";
            }

            return (
              <article 
                key={hl.id} 
                className={`stadium-card ${cardGlow} flex flex-col justify-between gap-5 p-6 relative group transition-all duration-300`}
              >
                {/* Moment Title Header */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-[8px] font-black tracking-widest uppercase px-2.5 py-1 rounded-full border ${toneClass}`}>
                      {toneLabel} MODE
                    </span>
                    <span className="text-[9px] text-slate-500 font-extrabold uppercase">
                      {hl.timestamp ? new Date(hl.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just Now"}
                    </span>
                  </div>

                  <h3 className="text-xs font-black text-[var(--text-primary)] leading-relaxed uppercase group-hover:text-[var(--accent-violet)] transition-colors">
                    "{hl.moment}"
                  </h3>
                </div>

                {/* Shared Output Blocks */}
                <div className="flex flex-col gap-4">
                  {/* Commentary block */}
                  {hl.commentary && (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <span>🎙️ Commentary</span>
                        <button 
                          onClick={() => handleCopyToClipboard(hl.commentary, commentaryKey)}
                          className="hover:text-[var(--text-primary)] transition-colors"
                        >
                          {copiedKey === commentaryKey ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-input)] border border-[var(--card-border)] p-3 rounded-xl leading-relaxed italic">
                        "{hl.commentary}"
                      </p>
                    </div>
                  )}

                  {/* Meme ideas block */}
                  {hl.meme && (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <span>😂 Meme Idea</span>
                        <button 
                          onClick={() => handleCopyToClipboard(hl.meme, memeKey)}
                          className="hover:text-[var(--text-primary)] transition-colors"
                        >
                          {copiedKey === memeKey ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-[11px] font-extrabold text-[var(--text-secondary)] bg-[var(--bg-input)] border border-[var(--card-border)] p-3 rounded-xl leading-relaxed">
                        "{hl.meme}"
                      </p>
                    </div>
                  )}

                  {/* Reel caption block */}
                  {hl.reel && (
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center text-[8px] font-extrabold uppercase text-slate-400 tracking-wider">
                        <span>📱 Reel Caption</span>
                        <button 
                          onClick={() => handleCopyToClipboard(hl.reel, reelKey)}
                          className="hover:text-[var(--text-primary)] transition-colors"
                        >
                          {copiedKey === reelKey ? "Copied!" : "Copy"}
                        </button>
                      </div>
                      <p className="text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-input)] border border-[var(--card-border)] p-3 rounded-xl leading-relaxed truncate">
                        {hl.reel}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Interaction elements (Upvotes + Copy buttons block) */}
                <div className="flex items-center justify-between border-t border-[var(--card-border)] pt-3 mt-1.5">
                  {/* Upvote Button */}
                  <button
                    disabled={hasUpvoted}
                    onClick={() => handleUpvote(hl.id)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-[10px] font-black transition-all ${
                      hasUpvoted
                        ? "bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.15)] text-[var(--accent-emerald)] scale-95 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                        : "bg-[var(--bg-input)] border border-[var(--border-input)] hover:border-[var(--card-border-hover)] text-slate-400 hover:text-[var(--text-primary)] active:scale-95"
                    }`}
                  >
                    <span className="text-xs">👍</span>
                    <span className="uppercase tracking-wider">
                      {hasUpvoted ? "UPVOTED" : "UPVOTE"}
                    </span>
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-[var(--bg-input)] border border-[var(--card-border)] font-black text-[var(--text-primary)]">
                      {hl.upvotes || 0}
                    </span>
                  </button>

                  <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-widest">
                    ⚡ HYPEX ENGINE
                  </span>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </main>
  );
}

