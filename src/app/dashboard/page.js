"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getLiveMatches, resetSimulatedMatches } from "../../lib/rapidapi";

export default function MatchesDashboard() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadMatches() {
      const data = await getLiveMatches();
      setMatches(data);
      setLoading(false);
    }
    loadMatches();

    // Auto-refresh match scorecards every 10 seconds as required
    const interval = setInterval(() => {
      loadMatches();
      setRefreshKey(prev => prev + 1);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleResetMatches = async () => {
    const fresh = resetSimulatedMatches();
    setMatches(fresh);
  };

  return (
    <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8 select-none py-10">
      {/* Dashboard Sub-Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[var(--text-primary)] font-outfit tracking-tight flex items-center gap-2">
            🏟️ LIVE MATCHES
          </h1>
          <p className="text-xs text-[var(--text-secondary)] font-semibold tracking-wider uppercase mt-1">
            Track and enter live fan-engagement centers
          </p>
        </div>

        {/* Live indicator and controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[rgba(74,222,128,0.06)] py-1.5 px-3.5 rounded-full border border-[rgba(74,222,128,0.15)] text-[10px] font-extrabold text-[var(--accent-emerald)] uppercase tracking-wider">
            <span className="live-dot"></span>
            Syncing Live Data
          </div>

          <button
            onClick={handleResetMatches}
            className="pill-btn text-[10px] py-1.5 px-3.5 rounded-full uppercase border font-extrabold tracking-wider"
          >
            🔄 Reset Scores
          </button>
        </div>
      </header>

      {/* Matches Grid */}
      {loading ? (
        /* Skeletons loader */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="stadium-card flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="skeleton h-5 w-24"></div>
                  <div className="skeleton h-5 w-16"></div>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <div className="skeleton h-4 w-full"></div>
                  <div className="skeleton h-4 w-5/6"></div>
                </div>
              </div>
              <div className="skeleton h-9 w-full mt-6"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((match) => {
            const isCompleted = match.status.toLowerCase().includes("completed") || match.status.toLowerCase().includes("won");
            return (
              <article 
                key={match.id} 
                className={`stadium-card flex flex-col justify-between min-h-[250px] group ${
                  isCompleted ? "glow-violet" : "glow-emerald"
                }`}
              >
                <div>
                  {/* Card Header (Live Badge + Venue) */}
                  <div className="flex justify-between items-center mb-4 border-b border-[var(--card-border)] pb-3">
                    <span className={`text-[9px] font-bold tracking-wider px-2.5 py-1 rounded-full uppercase border ${
                      isCompleted 
                        ? "bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.15)] text-[var(--accent-violet)]" 
                        : "bg-[rgba(74,222,128,0.08)] border-[rgba(74,222,128,0.15)] text-[var(--accent-emerald)]"
                    }`}>
                      {isCompleted ? "✓ Completed" : "⚡ LIVE MATCH"}
                    </span>
                    <span className="text-[10px] font-medium text-[var(--text-secondary)] truncate max-w-[150px]">
                      📍 {match.venue.split(",")[0]}
                    </span>
                  </div>

                  {/* Team Names & Scoreboard Block */}
                  <div className="flex flex-col gap-3 my-4">
                    {/* Team 1 */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                        <span className="w-2 h-2 bg-[var(--accent-emerald)] rounded-full"></span>
                        {match.team1}
                      </span>
                      <span className="text-base font-black text-[var(--text-primary)] font-outfit">
                        {match.score}
                      </span>
                    </div>

                    {/* Team 2 */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-extrabold text-[var(--text-secondary)] flex items-center gap-2">
                        <span className="w-2 h-2 bg-[var(--accent-violet)] rounded-full"></span>
                        {match.team2}
                      </span>
                      <span className="text-xs font-semibold text-[var(--text-secondary)]">
                        {match.target !== "N/A" ? "To Bat" : "Yet to bat"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer (Status + CTA) */}
                <div className="mt-4 flex flex-col gap-3">
                  <div className="text-[11px] text-[var(--text-secondary)] font-medium italic truncate">
                    {match.status}
                  </div>
                  
                  <Link 
                    href={`/match/${match.id}`}
                    className="action-btn text-xs py-2.5 text-center flex justify-center items-center w-full rounded-full font-bold"
                  >
                    ⚔️ ENTER MATCH CENTER
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

