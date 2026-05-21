"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getFirebaseStatus } from "../lib/firebase";

export default function Navbar() {
  const pathname = usePathname();
  const [firebaseActive, setFirebaseActive] = useState(false);
  
  // Theme Switching Logic
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    setFirebaseActive(getFirebaseStatus());

    // Load theme from localStorage
    const savedTheme = localStorage.getItem("hypex_theme") || "dark";
    setTheme(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const applyTheme = (t) => {
    if (t === "light") {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    } else {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("hypex_theme", nextTheme);
    applyTheme(nextTheme);
  };

  const navLinks = [
    { name: "🏟️ Dashboard", path: "/dashboard" },
    { name: "🤖 AI Lab", path: "/ai-studio" },
    { name: "⚔️ Fan Arena", path: "/fan-arena" },
    { name: "✨ Highlights", path: "/highlights" }
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[var(--card-bg)] backdrop-blur-xl border-b border-[var(--card-border)] px-4 md:px-8 py-3.5 flex items-center justify-between transition-all duration-300">
      
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <span className="text-xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-300 to-violet-400 group-hover:scale-[1.02] transition-transform duration-200">
          ⚡ HYPEX
        </span>
      </Link>

      {/* Nav Actions */}
      <div className="hidden md:flex items-center gap-2">
        {navLinks.map((link) => {
          const isActive = pathname === link.path || (link.path !== "/" && pathname.startsWith(link.path));
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`text-xs font-semibold tracking-wide transition-all duration-200 px-4 py-1.5 rounded-full border ${
                isActive
                  ? "text-[var(--accent-violet)] bg-[rgba(167,139,250,0.08)] border-[rgba(167,139,250,0.2)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-transparent hover:bg-[var(--card-bg-hover)]"
              }`}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* Dynamic Controls Side Block */}
      <div className="flex items-center gap-3">
        
        {/* Day/Night Match Theme Toggle (Cricket Centric) */}
        <button
          onClick={toggleTheme}
          className="pill-btn text-[10px] py-1.5 px-3 rounded-full uppercase border font-extrabold tracking-wider flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95 transition-all"
          title="Toggle Stadium Lights / Day Match Theme"
        >
          {theme === "dark" ? (
            <>
              <span>🏟️ Stadium Lights</span>
            </>
          ) : (
            <>
              <span>☀️ Day Match</span>
            </>
          )}
        </button>

        {/* Database Status Indicator Tag */}
        <div className="hidden sm:flex items-center gap-2 bg-[var(--card-bg-hover)] px-3.5 py-1.5 rounded-full border border-[var(--card-border)] text-[9px] font-bold tracking-wider uppercase">
          <span className={`w-1.5 h-1.5 rounded-full ${firebaseActive ? 'bg-[var(--accent-emerald)] shadow-[0_0_6px_var(--accent-emerald)]' : 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.5)]'}`}></span>
          <span className="text-[var(--text-secondary)]">
            {firebaseActive ? "Firebase Connected" : "Local Database"}
          </span>
        </div>

      </div>
    </nav>
  );
}
