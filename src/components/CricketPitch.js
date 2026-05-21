"use client";

import { useEffect, useState } from "react";

export default function CricketPitch({ event, eventDesc }) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (event) {
      setAnimate(true);
      const timer = setTimeout(() => setAnimate(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [event, eventDesc]);

  // Determine path properties based on the play event
  const renderTrajectory = () => {
    if (!event || !animate) return null;

    switch (event) {
      case "SIX":
        return (
          <g>
            {/* Arching High-Trajectory Path */}
            <path
              d="M 200,320 Q 200,100 200,40"
              fill="none"
              stroke="var(--accent-violet)"
              strokeWidth="4"
              strokeLinecap="round"
              className="ball-path-six"
            />
            {/* Boundary Impact Ring */}
            <circle
              cx="200"
              cy="40"
              r="6"
              fill="var(--accent-violet)"
              className="animate-ping"
              style={{ animationDuration: "1s" }}
            />
            <circle
              cx="200"
              cy="40"
              r="4"
              fill="var(--accent-violet)"
            />
            {/* Sparkles */}
            <g className="animate-pulse">
              <path d="M 200,30 L 200,50 M 190,40 L 210,40" stroke="var(--accent-violet)" strokeWidth="1.5" />
            </g>
          </g>
        );
      case "FOUR":
        return (
          <g>
            {/* Ground-Skimming Bounday Path */}
            <path
              d="M 200,320 Q 280,260 330,220"
              fill="none"
              stroke="var(--accent-emerald)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="ball-path-four"
            />
            {/* Boundary hit ring */}
            <circle
              cx="330"
              cy="220"
              r="5"
              fill="var(--accent-emerald)"
              className="animate-ping"
            />
            <circle
              cx="330"
              cy="220"
              r="3.5"
              fill="var(--accent-emerald)"
            />
          </g>
        );
      case "WICKET":
        return (
          <g>
            {/* Strike stumps fast path */}
            <path
              d="M 200,320 L 200,180"
              fill="none"
              stroke="var(--color-danger)"
              strokeWidth="4"
              strokeLinecap="round"
              className="ball-path-wicket"
            />
            {/* Crash Glow overlay */}
            <circle
              cx="200"
              cy="180"
              r="10"
              fill="rgba(239, 68, 68, 0.15)"
              className="animate-pulse"
            />
            {/* Flying Stumps & Bails Representation */}
            <line
              x1="192"
              y1="180"
              x2="182"
              y2="140"
              stroke="var(--color-danger)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="wicket-flying-left"
            />
            <line
              x1="208"
              y1="180"
              x2="218"
              y2="140"
              stroke="var(--color-danger)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className="wicket-flying-right"
            />
            <rect
              x="193"
              y="170"
              width="14"
              height="3"
              rx="1.5"
              fill="#F59E0B"
              className="bail-flying"
            />
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <article className="stadium-card bg-[var(--card-bg)] border-[var(--card-border)] flex flex-col items-center justify-center p-6 gap-4 w-full h-[400px] select-none relative overflow-hidden">
      
      {/* Dynamic Background Stadium glow (Adapts to Light/Dark Mode) */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-primary)] to-[var(--card-bg-hover)] opacity-40 pointer-events-none"></div>

      {/* SVG Canvas */}
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full max-h-[340px] drop-shadow-md z-10"
      >
        {/* Outfield Grass Circle */}
        <circle
          cx="200"
          cy="200"
          r="165"
          fill="none"
          stroke="var(--card-border)"
          strokeWidth="3"
          strokeDasharray="8 6"
        />
        
        {/* Outfield Grass shading boundary */}
        <circle
          cx="200"
          cy="200"
          r="162"
          fill="rgba(16, 185, 129, 0.02)"
        />

        {/* Outer Boundary Rope Line */}
        <circle
          cx="200"
          cy="200"
          r="175"
          fill="none"
          stroke="var(--accent-emerald)"
          strokeWidth="2"
          opacity="0.25"
        />

        {/* 🏏 Visual 22-Yard Cricket Pitch Corridor */}
        <rect
          x="185"
          y="150"
          width="30"
          height="190"
          rx="4"
          fill="var(--bg-primary)"
          stroke="var(--card-border)"
          strokeWidth="1.5"
        />

        {/* Crease Markings (Bowling End) */}
        <line
          x1="180"
          y1="180"
          x2="220"
          y2="180"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
        />
        <line
          x1="185"
          y1="170"
          x2="185"
          y2="185"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />
        <line
          x1="215"
          y1="170"
          x2="215"
          y2="185"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />

        {/* Crease Markings (Batting End) */}
        <line
          x1="180"
          y1="310"
          x2="220"
          y2="310"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1.5"
        />
        <line
          x1="185"
          y1="305"
          x2="185"
          y2="320"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />
        <line
          x1="215"
          y1="305"
          x2="215"
          y2="320"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="1"
        />

        {/* Stumps (Bowling End Wickets) */}
        <g opacity="0.6">
          <circle cx="194" cy="180" r="1.5" fill="var(--text-secondary)" />
          <circle cx="200" cy="180" r="1.5" fill="var(--text-secondary)" />
          <circle cx="206" cy="180" r="1.5" fill="var(--text-secondary)" />
          <line x1="193" y1="180" x2="207" y2="180" stroke="var(--text-secondary)" strokeWidth="1" />
        </g>

        {/* Stumps (Batting End Wickets) */}
        <g opacity="0.6">
          <circle cx="194" cy="310" r="1.5" fill="var(--text-secondary)" />
          <circle cx="200" cy="310" r="1.5" fill="var(--text-secondary)" />
          <circle cx="206" cy="310" r="1.5" fill="var(--text-secondary)" />
          <line x1="193" y1="310" x2="207" y2="310" stroke="var(--text-secondary)" strokeWidth="1" />
        </g>

        {/* Trajectory Animates */}
        {renderTrajectory()}

        {/* Default Standby Ball & Batsmen Indicators */}
        {!animate && (
          <g>
            {/* Small Cricket Ball resting at crease */}
            <circle
              cx="200"
              cy="318"
              r="4.5"
              fill="var(--color-danger)"
              className="ball-impact-pulse"
            />
            {/* Dynamic excitation glow ring */}
            <circle
              cx="200"
              cy="318"
              r="8"
              fill="none"
              stroke="var(--color-danger)"
              strokeWidth="0.8"
              opacity="0.3"
              className="animate-ping"
              style={{ animationDuration: "2s" }}
            />
          </g>
        )}
      </svg>

      {/* Ticker Banner overlay */}
      <div className="absolute bottom-4 inset-x-4 flex justify-between items-center bg-[var(--card-bg)] border border-[var(--card-border)] py-2 px-4 rounded-xl z-20">
        <span className="text-[9px] font-black text-slate-500 tracking-wider uppercase">
          🏟️ Stadium Visualizer
        </span>
        <span className="text-[10px] font-bold text-[var(--accent-violet)] truncate max-w-[200px]">
          {animate ? `Visualizing ${event || "Play"}...` : eventDesc || "Waiting for Play event..."}
        </span>
      </div>
      
    </article>
  );
}
