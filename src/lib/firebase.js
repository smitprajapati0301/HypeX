import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc, updateDoc, increment, collection, addDoc, getDocs, limit, query, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "hypex-fan-dashboard",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const isFirebaseConfigured = typeof window !== 'undefined' && 
  !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY.trim() !== "";

let app;
let db = null;

if (isFirebaseConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    console.log("🔥 Upgraded Firebase Firestore connected!");
  } catch (error) {
    console.error("Failed to initialize Firebase App:", error);
  }
}

// Seeded local fallback collections
const defaultReactions = { "🔥": 0, "😮": 0, "🙌": 0, "😂": 0, "👑": 0 };
const defaultPredictions = { "team1": 15, "team2": 12, "draw": 3 };
const defaultCheers = { "team1": 120, "team2": 110 }; // Live IND vs PAK cheer counts

const defaultHighlights = [
  {
    id: "h1",
    moment: "Dhoni hits a last-over six to seal the final match",
    commentary: "🔥 FINISHED IN STYLE! Dhoni has launched Shaheen Afridi into the Melbourne sky! A historic T20 World Cup Super 8 moment! Ravi Shastri is losing his absolute mind!",
    meme: "Shaheen Afridi watching the ball cross the state border. 🥺✈️",
    reel: "DHONI FINISHES IT IN STYLE! 💥 Absolute legendary scenes! 👑🏏 #Dhoni #T20WorldCup #IndVsPak #HypeX",
    fanMode: "hardcore",
    upvotes: 42,
    timestamp: Date.now() - 3600000
  },
  {
    id: "h2",
    moment: "Virat Kohli cover drives Pat Cummins for a glorious four",
    commentary: " Timing, placement, and absolute royalty. Kohli paints the Narendra Modi Stadium grass with a picture-perfect drive.",
    meme: "Pat Cummins preparing his apology letter to the bowler's association. 📝🙌",
    reel: "Perfection in motion! 🏏 The signature Virat Kohli cover drive that stops time! #KingKohli #ClassicFour #BorderGavaskar #HypeX",
    fanMode: "casual",
    upvotes: 28,
    timestamp: Date.now() - 7200000
  }
];

// --- 1. Crowd Reactions Deck ---

export function subscribeToReactions(callback) {
  if (!db) {
    const getLocal = () => {
      try {
        const stored = localStorage.getItem("hypex_reactions");
        return stored ? JSON.parse(stored) : defaultReactions;
      } catch {
        return defaultReactions;
      }
    };
    callback(getLocal());
    const handleStorage = (e) => {
      if (e.key === "hypex_reactions") callback(getLocal());
    };
    if (typeof window !== 'undefined') window.addEventListener("storage", handleStorage);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener("storage", handleStorage);
    };
  }

  try {
    return onSnapshot(doc(db, "hypex", "reactions"), (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        setDoc(doc(db, "hypex", "reactions"), defaultReactions);
        callback(defaultReactions);
      }
    });
  } catch (e) {
    callback(defaultReactions);
    return () => {};
  }
}

export async function incrementReaction(emoji, localCallback) {
  if (!db) {
    try {
      const stored = localStorage.getItem("hypex_reactions");
      const current = stored ? JSON.parse(stored) : defaultReactions;
      current[emoji] = (current[emoji] || 0) + 1;
      localStorage.setItem("hypex_reactions", JSON.stringify(current));
      localCallback(current);
    } catch {}
    return;
  }
  try {
    const ref = doc(db, "hypex", "reactions");
    await updateDoc(ref, { [emoji]: increment(1) }).catch(async () => {
      await setDoc(ref, { ...defaultReactions, [emoji]: 1 }, { merge: true });
    });
  } catch {}
}

// --- 2. Live Match Predictions Pool ---

export function subscribeToPredictions(callback) {
  if (!db) {
    const getLocal = () => {
      try {
        const stored = localStorage.getItem("hypex_predictions");
        return stored ? JSON.parse(stored) : defaultPredictions;
      } catch {
        return defaultPredictions;
      }
    };
    callback(getLocal());
    const handleStorage = (e) => {
      if (e.key === "hypex_predictions") callback(getLocal());
    };
    if (typeof window !== 'undefined') window.addEventListener("storage", handleStorage);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener("storage", handleStorage);
    };
  }

  try {
    return onSnapshot(doc(db, "hypex", "predictions"), (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        setDoc(doc(db, "hypex", "predictions"), defaultPredictions);
        callback(defaultPredictions);
      }
    });
  } catch (e) {
    callback(defaultPredictions);
    return () => {};
  }
}

export async function castPredictionVote(selection, localCallback) {
  if (!db) {
    try {
      const stored = localStorage.getItem("hypex_predictions");
      const current = stored ? JSON.parse(stored) : defaultPredictions;
      current[selection] = (current[selection] || 0) + 1;
      localStorage.setItem("hypex_predictions", JSON.stringify(current));
      localCallback(current);
    } catch {}
    return;
  }
  try {
    const ref = doc(db, "hypex", "predictions");
    await updateDoc(ref, { [selection]: increment(1) }).catch(async () => {
      await setDoc(ref, { ...defaultPredictions, [selection]: defaultPredictions[selection] + 1 }, { merge: true });
    });
  } catch {}
}

// --- 3. Fan Cheer Battle (IND vs PAK Cheer Metrics) ---

export function subscribeToCheerBattle(callback) {
  if (!db) {
    const getLocal = () => {
      try {
        const stored = localStorage.getItem("hypex_cheers");
        return stored ? JSON.parse(stored) : defaultCheers;
      } catch {
        return defaultCheers;
      }
    };
    callback(getLocal());
    const handleStorage = (e) => {
      if (e.key === "hypex_cheers") callback(getLocal());
    };
    if (typeof window !== 'undefined') window.addEventListener("storage", handleStorage);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener("storage", handleStorage);
    };
  }

  try {
    return onSnapshot(doc(db, "hypex", "cheers"), (snap) => {
      if (snap.exists()) {
        callback(snap.data());
      } else {
        setDoc(doc(db, "hypex", "cheers"), defaultCheers);
        callback(defaultCheers);
      }
    });
  } catch (e) {
    callback(defaultCheers);
    return () => {};
  }
}

export async function incrementCheer(team, localCallback) {
  if (!db) {
    try {
      const stored = localStorage.getItem("hypex_cheers");
      const current = stored ? JSON.parse(stored) : defaultCheers;
      current[team] = (current[team] || 0) + 1;
      localStorage.setItem("hypex_cheers", JSON.stringify(current));
      localCallback(current);
    } catch {}
    return;
  }
  try {
    const ref = doc(db, "hypex", "cheers");
    await updateDoc(ref, { [team]: increment(1) }).catch(async () => {
      await setDoc(ref, { ...defaultCheers, [team]: defaultCheers[team] + 1 }, { merge: true });
    });
  } catch {}
}

// --- 4. Shared AI Highlights Gallery ---

export function subscribeToHighlights(callback) {
  if (!db) {
    const getLocal = () => {
      try {
        const stored = localStorage.getItem("hypex_highlights");
        return stored ? JSON.parse(stored) : defaultHighlights;
      } catch {
        return defaultHighlights;
      }
    };
    callback(getLocal());
    const handleStorage = (e) => {
      if (e.key === "hypex_highlights") callback(getLocal());
    };
    if (typeof window !== 'undefined') window.addEventListener("storage", handleStorage);
    return () => {
      if (typeof window !== 'undefined') window.removeEventListener("storage", handleStorage);
    };
  }

  try {
    // Listen to top highlights sorted by timestamp
    const q = query(collection(db, "highlights"), orderBy("timestamp", "desc"), limit(30));
    return onSnapshot(q, (snap) => {
      const results = [];
      snap.forEach((docSnap) => {
        results.push({ id: docSnap.id, ...docSnap.data() });
      });
      if (results.length === 0) {
        // Doc empty, seed it
        defaultHighlights.forEach(async (hl) => {
          await addDoc(collection(db, "highlights"), {
            moment: hl.moment,
            commentary: hl.commentary,
            meme: hl.meme,
            reel: hl.reel,
            fanMode: hl.fanMode,
            upvotes: hl.upvotes,
            timestamp: hl.timestamp
          });
        });
        callback(defaultHighlights);
      } else {
        callback(results);
      }
    }, (error) => {
      console.warn("Firestore highlights snap failed, fallback to local:", error);
      callback(defaultHighlights);
    });
  } catch (e) {
    console.error("Error subscribing to highlights:", e);
    callback(defaultHighlights);
    return () => {};
  }
}

export async function addHighlight(moment, commentary, meme, reel, fanMode) {
  const newHighlight = {
    moment,
    commentary,
    meme,
    reel,
    fanMode,
    upvotes: 0,
    timestamp: Date.now()
  };

  if (!db) {
    try {
      const stored = localStorage.getItem("hypex_highlights");
      const current = stored ? JSON.parse(stored) : defaultHighlights;
      newHighlight.id = "h_" + Date.now();
      current.unshift(newHighlight);
      localStorage.setItem("hypex_highlights", JSON.stringify(current));
    } catch {}
    return;
  }

  try {
    await addDoc(collection(db, "highlights"), newHighlight);
  } catch (e) {
    console.error("Failed to add highlight to Firestore:", e);
  }
}

export async function upvoteHighlight(highlightId, localCallback) {
  if (!db) {
    try {
      const stored = localStorage.getItem("hypex_highlights");
      const current = stored ? JSON.parse(stored) : defaultHighlights;
      const target = current.find(h => h.id === highlightId);
      if (target) {
        target.upvotes = (target.upvotes || 0) + 1;
        localStorage.setItem("hypex_highlights", JSON.stringify(current));
        localCallback(current);
      }
    } catch {}
    return;
  }

  try {
    const ref = doc(db, "highlights", highlightId);
    await updateDoc(ref, {
      upvotes: increment(1)
    });
  } catch (e) {
    console.error("Failed to upvote highlight:", e);
  }
}

export function getFirebaseStatus() {
  return isFirebaseConfigured;
}
