"use client";

import { useState, useEffect } from "react";
import { generateHypeContent } from "../../lib/gemini";
import { addHighlight } from "../../lib/firebase";

export default function AIStudio() {
  const [moment, setMoment] = useState("");
  const [fanMode, setFanMode] = useState("casual");
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState(null);
  const [error, setError] = useState(null);
  
  // Custom states
  const [history, setHistory] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const [shareStatus, setShareStatus] = useState(false);

  // Load history from LocalStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("hypex_ai_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Could not load AI history from storage", e);
    }
  }, []);

  // Save history helper
  const saveToHistory = (item) => {
    const updated = [item, ...history].slice(0, 10); // Keep top 10
    setHistory(updated);
    try {
      localStorage.setItem("hypex_ai_history", JSON.stringify(updated));
    } catch {}
  };

  const handleGenerate = async (e) => {
    if (e) e.preventDefault();
    if (!moment.trim()) return;

    setIsGenerating(true);
    setError(null);
    setShareStatus(false);

    try {
      const parsed = await generateHypeContent(moment, fanMode);
      setOutput(parsed);

      // Save to local history
      saveToHistory({
        id: "hist_" + Date.now(),
        moment: moment,
        fanMode: fanMode,
        timestamp: Date.now(),
        data: parsed
      });

      // Pushes into the shared Highlights Gallery as required!
      await addHighlight(moment, parsed.commentary, parsed.meme, parsed.reel, fanMode);
    } catch (err) {
      setError(err.message || "Failed to call Gemini Pro.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = (text, key) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }
  };

  const handleShareHighlight = () => {
    setShareStatus(true);
    setTimeout(() => setShareStatus(false), 2500);
  };

  const handleLoadHistory = (item) => {
    setMoment(item.moment);
    setFanMode(item.fanMode);
    setOutput(item.data);
    setError(null);
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem("hypex_ai_history");
    } catch {}
  };

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 select-none py-10">
      {/* Header Banner */}
      <header>
        <span className="live-indicator mb-2 font-extrabold tracking-wider">CREATIVE AI HUB</span>
        <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] font-outfit tracking-tight">
          🤖 AI HYPE STUDIO LAB
        </h1>
        <p className="text-xs text-[var(--text-secondary)] font-semibold tracking-wider uppercase mt-1">
          Compose viral sports commentary, memes, and reel captions using Google Gemini Pro
        </p>
      </header>

      {/* Main Form + History Panel Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Custom event details and parameters */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          {/* Main Input Form */}
          <div className="stadium-card flex flex-col gap-6">
            <div>
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-wider">Moment Composer</h3>
              <p className="text-[11px] text-[var(--text-secondary)] mt-1">Describe a cricket play and see Gemini spin viral captions</p>
            </div>

            <form onSubmit={handleGenerate} className="flex flex-col gap-4">
              {/* Event Description Input */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wide">Cricket Moment</label>
                <textarea
                  value={moment}
                  onChange={(e) => setMoment(e.target.value)}
                  placeholder="e.g., MS Dhoni finishes off the innings with his trademark helicopter shot for a massive SIX!"
                  className="bg-[var(--bg-input)] border border-[var(--border-input)] rounded-xl p-3 text-[var(--text-primary)] text-xs font-semibold focus:outline-none focus:border-[var(--accent-violet)] focus:ring-1 focus:ring-[var(--accent-violet)] min-h-[110px] placeholder:text-[var(--text-muted)] transition-all duration-200"
                />
              </div>

              {/* Fan Mode Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] text-[var(--text-secondary)] font-extrabold uppercase tracking-wide">Commentary Personality</label>
                <div className="grid grid-cols-3 gap-1 bg-[var(--bg-input)] p-1 rounded-full border border-[var(--border-input)]">
                  {["casual", "hardcore", "meme"].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFanMode(mode)}
                      className={`text-[10px] py-1.5 px-3 rounded-full font-bold transition-all uppercase ${
                        fanMode === mode 
                          ? "bg-[rgba(167,139,250,0.08)] border border-[rgba(167,139,250,0.15)] text-[var(--accent-violet)]" 
                          : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Trigger Button */}
              <button
                type="submit"
                disabled={isGenerating || !moment.trim()}
                className="action-btn w-full text-xs font-bold py-3 mt-2 rounded-full"
              >
                {isGenerating ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4.5 h-4.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Igniting Gemini Pro...
                  </span>
                ) : (
                  <>🚀 Generate Custom Hype</>
                )}
              </button>
            </form>

            {error && <span className="text-xs text-rose-400 font-semibold mt-2">⚠️ {error}</span>}
          </div>

          {/* History Deck Panel */}
          <div className="stadium-card flex flex-col gap-5">
            <div className="flex justify-between items-center pb-2 border-b border-[var(--card-border)]">
              <h3 className="text-xs font-black text-[var(--text-primary)] uppercase tracking-wider">Laboratory History</h3>
              {history.length > 0 && (
                <button 
                  onClick={handleClearHistory}
                  className="text-[9px] text-[var(--color-danger)] hover:underline font-bold uppercase tracking-wider"
                >
                  Clear All
                </button>
              )}
            </div>

            {history.length === 0 ? (
              <div className="text-center p-6 text-[var(--text-secondary)] text-xs">
                No generated entries in current laboratory session.
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[300px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleLoadHistory(item)}
                    className="p-3 bg-[var(--bg-input)] hover:bg-[var(--card-bg-hover)] border border-[var(--card-border)] hover:border-[var(--card-border-hover)] rounded-xl cursor-pointer transition-all flex flex-col gap-1.5 group"
                  >
                    <div className="flex justify-between items-center text-[8px] font-black uppercase text-[var(--text-secondary)] tracking-wider">
                      <span className="text-[var(--accent-violet)]">Tone: {item.fanMode}</span>
                      <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-[var(--text-secondary)] text-xs truncate font-semibold group-hover:text-[var(--text-primary)] transition-colors">
                      "{item.moment}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center & Right Column: Styled AI Displays */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {output ? (
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider">
                  🔥 INSTAGRAM-STYLE HYPE CARDS
                </h2>
                <span className="text-[10px] text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-violet-400 font-extrabold tracking-wide uppercase">
                  ✨ Powered by Google Gemini Pro
                </span>
              </div>

              {/* Card 1: Commentary */}
              <article className="stadium-card flex flex-col justify-between p-6 ai-output-stagger" style={{ animationDelay: "50ms" }}>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-extrabold text-[var(--accent-emerald)] uppercase tracking-wider">🎙️ AI Fan Commentary</span>
                    <button 
                      onClick={() => handleCopyToClipboard(output.commentary, "comm")}
                      className="pill-btn text-[9px] py-1 px-3.5 rounded-full border"
                    >
                      {copiedKey === "comm" ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>
                  <p className="text-[var(--text-primary)] text-base font-black leading-relaxed italic border-l-2 border-[var(--accent-emerald)] pl-4 py-1">
                    "{output.commentary}"
                  </p>
                </div>
              </article>

              {/* Card 2: Meme */}
              <article className="stadium-card flex flex-col justify-between p-6 ai-output-stagger" style={{ animationDelay: "150ms" }}>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-extrabold text-[var(--accent-violet)] uppercase tracking-wider">😂 Meme Chamber Ideas</span>
                    <button 
                      onClick={() => handleCopyToClipboard(output.meme, "meme")}
                      className="pill-btn text-[9px] py-1 px-3.5 rounded-full border"
                    >
                      {copiedKey === "meme" ? "✓ Copied!" : "📋 Copy"}
                    </button>
                  </div>
                  <div className="bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--card-border)] text-xs font-semibold leading-relaxed text-[var(--text-secondary)]">
                    "{output.meme}"
                  </div>
                </div>
              </article>

              {/* Card 3: Reel */}
              <article className="stadium-card flex flex-col justify-between p-6 ai-output-stagger" style={{ animationDelay: "250ms" }}>
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-extrabold text-[var(--accent-orange)] uppercase tracking-wider">📱 Instagram Reel Caption</span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleCopyToClipboard(output.reel, "reel")}
                        className="pill-btn text-[9px] py-1 px-3.5 rounded-full border"
                      >
                        {copiedKey === "reel" ? "✓ Copied!" : "📋 Copy"}
                      </button>
                      <button 
                        onClick={handleShareHighlight}
                        className="pill-btn text-[9px] py-1 px-3.5 rounded-full border"
                      >
                        {shareStatus ? "✓ Shared!" : "🔗 Share"}
                      </button>
                    </div>
                  </div>
                  <div className="bg-[var(--bg-input)] p-4 rounded-xl border border-[var(--card-border)] text-xs font-semibold leading-relaxed text-[var(--text-secondary)]">
                    {output.reel}
                  </div>
                </div>
              </article>

              {shareStatus && (
                <span className="text-[10px] text-center text-[var(--accent-emerald)] font-bold tracking-wide animate-pulse mt-2">
                  ✓ Dynamic card shared in real-time to Highlights Gallery!
                </span>
              )}
            </div>
          ) : (
            <div className="stadium-card p-24 flex flex-col items-center justify-center text-[var(--text-secondary)] text-center gap-4">
              <span className="text-4xl opacity-50">🤖</span>
              <span className="text-xs font-black uppercase tracking-widest leading-relaxed">
                Describe a moment inside the composer and click "Generate Custom Hype" <br />
                to yield customized commentary formats!
              </span>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

