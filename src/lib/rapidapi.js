/**
 * HypeX Match Data & RapidAPI Service
 * 
 * Manages active matches and fetches scoreboards. Connects to RapidAPI's Cricbuzz or similar cricket APIs
 * if credentials are provided, otherwise automatically operates a local state simulator with multi-match support.
 */

const RAPIDAPI_KEY = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;
const RAPIDAPI_HOST = process.env.NEXT_PUBLIC_RAPIDAPI_HOST || "cricbuzz-cricket-official-apis.p.rapidapi.com";

// High-fidelity seeded match data
const defaultMatches = {
  "ind-pak-2026": {
    id: "ind-pak-2026",
    team1: "India",
    team1Abbr: "IND",
    team2: "Pakistan",
    team2Abbr: "PAK",
    score: "152/3",
    overs: "17.2",
    status: "In Progress (1st Innings)",
    venue: "Melbourne Cricket Ground",
    target: "N/A",
    recentEvents: [
      { event: "SINGLE", desc: "V. Kohli takes a quick single to mid-off.", overs: "17.1" },
      { event: "DOT", desc: "Dot ball. Excellent delivery, beating the batsman on the outside edge.", overs: "17.2" }
    ],
    batsmen: [
      { name: "V. Kohli", runs: 74, balls: 48, fours: 6, sixes: 3, strikeRate: 154.2 },
      { name: "H. Pandya", runs: 12, balls: 8, fours: 1, sixes: 0, strikeRate: 150.0 }
    ],
    bowler: { name: "Shaheen Afridi", overs: "3.2", maidens: 0, runs: 28, wickets: 2, econ: 8.4 }
  },
  "aus-eng-2026": {
    id: "aus-eng-2026",
    team1: "Australia",
    team1Abbr: "AUS",
    team2: "England",
    team2Abbr: "ENG",
    score: "188/6",
    overs: "20.0",
    status: "Innings Completed",
    venue: "The Lord's, London",
    target: "189 runs off 120 balls",
    recentEvents: [
      { event: "WICKET", desc: "OUT! Glenn Maxwell is caught at long-on! End of the final over!", overs: "20.0" },
      { event: "FOUR", desc: "Maxwell drives it past extra cover for boundary!", overs: "19.5" }
    ],
    batsmen: [
      { name: "T. Head", runs: 58, balls: 32, fours: 5, sixes: 4, strikeRate: 181.25 },
      { name: "M. Stoinis", runs: 34, balls: 20, fours: 2, sixes: 2, strikeRate: 170.0 }
    ],
    bowler: { name: "Mark Wood", overs: "4.0", maidens: 0, runs: 42, wickets: 3, econ: 10.5 }
  },
  "ind-aus-2026": {
    id: "ind-aus-2026",
    team1: "India",
    team1Abbr: "IND",
    team2: "Australia",
    team2Abbr: "AUS",
    score: "42/1",
    overs: "4.4",
    status: "In Progress (Powerplay)",
    venue: "Narendra Modi Stadium, Ahmedabad",
    target: "N/A",
    recentEvents: [
      { event: "FOUR", desc: "Y. Jaiswal drives it through the cover boundary!", overs: "4.3" },
      { event: "DOT", desc: "Jaiswal plays it safely back to the bowler.", overs: "4.4" }
    ],
    batsmen: [
      { name: "Y. Jaiswal", runs: 28, balls: 16, fours: 4, sixes: 1, strikeRate: 175.0 },
      { name: "S. Gill", runs: 12, balls: 11, fours: 1, sixes: 0, strikeRate: 109.1 }
    ],
    bowler: { name: "Pat Cummins", overs: "2.0", maidens: 0, runs: 18, wickets: 1, econ: 9.0 }
  }
};

/**
 * Loads matches from LocalStorage or returns default seeds
 */
function loadActiveMatches() {
  if (typeof window === "undefined") return defaultMatches;
  try {
    const stored = localStorage.getItem("hypex_live_matches");
    if (stored) {
      return JSON.parse(stored);
    } else {
      localStorage.setItem("hypex_live_matches", JSON.stringify(defaultMatches));
      return defaultMatches;
    }
  } catch (e) {
    return defaultMatches;
  }
}

/**
 * Pushes updated matches state to LocalStorage
 */
function saveActiveMatches(matches) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("hypex_live_matches", JSON.stringify(matches));
  } catch (e) {
    console.warn("Could not save live matches to storage", e);
  }
}

/**
 * Fetches all live cricket scorecards.
 * Attempts to hit RapidAPI cricbuzz if keys are present, falling back to local simulator.
 */
export async function getLiveMatches() {
  let apiStatus = "offline";
  if (RAPIDAPI_KEY && RAPIDAPI_KEY.trim() !== "") {
    try {
      const response = await fetch(`https://${RAPIDAPI_HOST}/matches/live`, {
        method: "GET",
        headers: {
          "X-RapidAPI-Key": RAPIDAPI_KEY,
          "X-RapidAPI-Host": RAPIDAPI_HOST
        }
      });
      if (response.ok) {
        const data = await response.json();
        console.log("Fetched live RapidAPI matches successfully!", data);
        apiStatus = "online";
        
        // Parse matches from nested structure
        const extractedMatches = [];
        // Standard Cricbuzz response usually groups matches under typeMatches -> seriesMatches -> matches
        const rawMatches = data.matches || (data.typeMatches ? data.typeMatches.flatMap(tm => tm.seriesMatches ? tm.seriesMatches.flatMap(sm => sm.seriesAdWrapper ? sm.seriesAdWrapper.matches : (sm.matches || [])) : []) : []);
        
        if (rawMatches && rawMatches.length > 0) {
          rawMatches.forEach(rawM => {
            const info = rawM.matchInfo || rawM;
            const scoreObj = rawM.matchScore || {};
            
            if (info && info.team1 && info.team2) {
              const team1Name = info.team1.teamName || info.team1.name || "Team 1";
              const team2Name = info.team2.teamName || info.team2.name || "Team 2";
              const status = info.status || info.statusFormat || "Live";
              const venue = info.venueInfo?.ground || info.venue || "Stadium";
              const id = String(info.matchId || info.id || `live-${Math.random()}`);
              
              // Safely extract scores & overs
              let scoreStr = "0/0";
              let oversStr = "0.0";
              
              if (scoreObj.team1Score?.inngs1) {
                const inn = scoreObj.team1Score.inngs1;
                scoreStr = `${inn.runs}/${inn.wickets || 0}`;
                oversStr = String(inn.overs || "0.0");
              } else if (scoreObj.team2Score?.inngs1) {
                const inn = scoreObj.team2Score.inngs1;
                scoreStr = `${inn.runs}/${inn.wickets || 0}`;
                oversStr = String(inn.overs || "0.0");
              } else if (info.score) {
                scoreStr = info.score;
                oversStr = info.overs || "0.0";
              }
              
              extractedMatches.push({
                id,
                team1: team1Name,
                team1Abbr: info.team1.teamSName || team1Name.substring(0, 3).toUpperCase(),
                team2: team2Name,
                team2Abbr: info.team2.teamSName || team2Name.substring(0, 3).toUpperCase(),
                score: scoreStr,
                overs: oversStr,
                status: status,
                venue: venue,
                target: info.target || "N/A",
                recentEvents: [
                  { event: "SINGLE", desc: "Live match update synchronized from Cricbuzz API.", overs: oversStr }
                ],
                batsmen: [
                  { name: "Active Batsman 1", runs: 42, balls: 28, fours: 4, sixes: 1, strikeRate: 150.0 },
                  { name: "Active Batsman 2", runs: 18, balls: 12, fours: 2, sixes: 0, strikeRate: 150.0 }
                ],
                bowler: { name: "Active Bowler", overs: "2.1", maidens: 0, runs: 18, wickets: 1, econ: 8.5 }
              });
            }
          });
        }
        
        if (extractedMatches.length > 0) {
          const current = loadActiveMatches();
          extractedMatches.forEach(m => {
            current[m.id] = { ...defaultMatches[m.id], ...m };
          });
          saveActiveMatches(current);
        }
      }
    } catch (e) {
      console.warn("RapidAPI fetch failed, falling back to mock database:", e);
    }
  }

  const matches = loadActiveMatches();
  // Store the API status on the window object if in browser for UI validation!
  if (typeof window !== "undefined") {
    window.hypex_api_status = apiStatus;
  }
  return Object.values(matches);
}

/**
 * Retrieves the specific match scorecard details by match ID.
 */
export async function getMatchDetails(matchId) {
  const matches = loadActiveMatches();
  const match = matches[matchId];
  if (!match) {
    return defaultMatches["ind-pak-2026"]; // Fallback to Ind vs Pak
  }
  return match;
}

/**
 * Updates a specific match scorecard details manually (Wicket, Six, Four, Last Over).
 * Mutates state locally inside LocalStorage so updates persist across pages!
 */
export function triggerSimulatedEvent(matchId, eventType) {
  const matches = loadActiveMatches();
  const match = matches[matchId];
  if (!match) return null;

  const currentWickets = parseInt(match.score.split("/")[1]) || 0;
  const currentRuns = parseInt(match.score.split("/")[0]) || 0;
  const currentOversFloat = parseFloat(match.overs) || 0.0;

  let nextRuns = currentRuns;
  let nextWickets = currentWickets;
  let nextOvers = (currentOversFloat + 0.1).toFixed(1);
  
  if (nextOvers.endsWith(".6")) {
    nextOvers = (parseInt(nextOvers) + 1).toFixed(1).replace(".0", ".0");
  }

  let eventDesc = "";
  
  if (eventType === "SIX") {
    nextRuns += 6;
    eventDesc = `SIX! Hammered cleanly! Smashed high and handsome over the boundary fence!`;
    match.batsmen[0].runs += 6;
    match.batsmen[0].sixes += 1;
  } else if (eventType === "FOUR") {
    nextRuns += 4;
    eventDesc = `FOUR! Perfectly timed shot races through the field and hits the boundary rope!`;
    match.batsmen[0].runs += 4;
    match.batsmen[0].fours += 1;
  } else if (eventType === "WICKET") {
    nextWickets += 1;
    eventDesc = `OUT! Clean Bowled! Stumps cartwheeling out of the turf! Monumental breakthrough!`;
    match.bowler.wickets += 1;
    // Rotate batsmen
    match.batsmen[0] = {
      name: "R. Jadeja",
      runs: 0,
      balls: 0,
      fours: 0,
      sixes: 0,
      strikeRate: 0.0
    };
  } else if (eventType === "LAST OVER") {
    nextOvers = "19.0";
    eventDesc = `LAST OVER THRILLER! High tension fills the air! End of the 19th over, final 6 balls to play!`;
  }

  // Update batsmen ball counts
  if (eventType !== "LAST OVER" && eventType !== "WICKET") {
    match.batsmen[0].balls += 1;
    match.batsmen[0].strikeRate = Math.round((match.batsmen[0].runs / match.batsmen[0].balls) * 1000) / 10;
  }

  // Update bowler overs
  match.bowler.overs = nextOvers;
  match.bowler.runs += (eventType === "SIX" ? 6 : eventType === "FOUR" ? 4 : 0);
  match.bowler.econ = Math.round((match.bowler.runs / parseFloat(match.bowler.overs)) * 10) / 10;

  // Compile scorecard
  match.score = `${nextRuns}/${nextWickets}`;
  match.overs = nextOvers;
  match.event = eventType;
  match.eventDesc = eventDesc;
  
  // Push into Timeline
  match.recentEvents.unshift({
    event: eventType,
    desc: eventDesc,
    overs: nextOvers
  });

  // Limit timeline to 6 items
  if (match.recentEvents.length > 6) {
    match.recentEvents.pop();
  }

  matches[matchId] = match;
  saveActiveMatches(matches);
  
  return match;
}

/**
 * Resets all simulated matches back to original seeds
 */
export function resetSimulatedMatches() {
  saveActiveMatches(defaultMatches);
  return Object.values(defaultMatches);
}
