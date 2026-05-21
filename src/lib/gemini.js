const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "AIzaSyDBvKR1ToPtLbqnp5LHqOI5h5lq7vGj9a4"; // Replace with your API key

/**
 * Parses Gemini output into structured commentary, meme, and reel caption sections.
 * @param {string} text - Raw string output from Gemini
 * @returns {{commentary: string, meme: string, reel: string}} Parsed sections
 */
export function parseHypeOutput(text) {
  const result = {
    commentary: "",
    meme: "",
    reel: ""
  };
  
  if (!text) return result;

  const cleanedText = text.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();

  // Try regex extraction
  const commentaryMatch = cleanedText.match(/(?:Commentary|🎙️?\s*Commentary):\s*([\s\S]*?)(?=(?:Meme|😂?\s*Meme|Reel|📱?\s*Reel|Reel Caption|$))/i);
  const memeMatch = cleanedText.match(/(?:Meme|😂?\s*Meme):\s*([\s\S]*?)(?=(?:Reel|📱?\s*Reel|Reel Caption|$))/i);
  const reelMatch = cleanedText.match(/(?:Reel Caption|Reel|📱?\s*Reel Caption|📱?\s*Reel):\s*([\s\S]*?)$/i);
  
  result.commentary = commentaryMatch ? commentaryMatch[1].trim() : "";
  result.meme = memeMatch ? memeMatch[1].trim() : "";
  result.reel = reelMatch ? reelMatch[1].trim() : "";

  // Line-by-line fallback parsing if regex failed to capture everything
  if (!result.commentary || !result.meme || !result.reel) {
    const lines = cleanedText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let activeKey = "";
    
    lines.forEach(line => {
      const cleanLine = line.replace(/\*\*/g, '').trim();
      const lower = cleanLine.toLowerCase();
      
      if (lower.startsWith("commentary:")) {
        activeKey = "commentary";
        result.commentary = cleanLine.substring(11).trim();
      } else if (lower.startsWith("meme:")) {
        activeKey = "meme";
        result.meme = cleanLine.substring(5).trim();
      } else if (lower.startsWith("reel caption:") || lower.startsWith("reel:")) {
        activeKey = "reel";
        const idx = cleanLine.indexOf(":");
        result.reel = cleanLine.substring(idx + 1).trim();
      } else if (activeKey) {
        result[activeKey] += (result[activeKey] ? "\n" : "") + cleanLine;
      }
    });
  }

  // Clean any remaining markdown bold markers from keys
  result.commentary = result.commentary.replace(/\*\*/g, '').trim();
  result.meme = result.meme.replace(/\*\*/g, '').trim();
  result.reel = result.reel.replace(/\*\*/g, '').trim();

  // Absolute Fallbacks for fields that failed to parse
  if (!result.commentary) {
    result.commentary = "WHAT A MOMENT! Absolute cricket madness! The stadium has gone totally chaotic!";
  }
  if (!result.meme) {
    result.meme = "Me pretending to study while keeping the live score tab minimized. 🤫🏏";
  }
  if (!result.reel) {
    result.reel = "Pure entertainment! Cricket at its absolute finest! 🏏💥 #HypeX #CricketLover #MatchDay #EpicGame";
  }

  return result;
}

/**
 * Invokes the Google Gemini API with custom prompt engines tailored for different Fan Modes.
 * 
 * @param {string} eventText - Cricket moment description
 * @param {string} fanMode - "casual" | "hardcore" | "meme"
 * @returns {Promise<{commentary: string, meme: string, reel: string}>} structured content output
 */
export async function generateHypeContent(eventText, fanMode = "casual") {
  if (!eventText) {
    throw new Error("Event description is required to generate hype.");
  }

  // Compose dynamic prompt variants depending on the selected Fan Mode
  let promptStyleGuide = "";
  if (fanMode === "hardcore") {
    promptStyleGuide = `You are a legendary, high-octane subcontinent cricket commentator like Ravi Shastri or Danny Morrison. Your energy is absolute fire!
Your commentary must be screaming with dramatic intensity, capital letters, exclamation marks, and raw sports excitement. Avoid formal descriptions; make it feel like a stadium eruption!`;
  } else if (fanMode === "meme") {
    promptStyleGuide = `You are a hilarious, sarcastic, Gen-Z cricket meme lord. Use popular internet slang, sarcastic punchlines, and terms like 'let him cook', 'no cap', 'absolute cinema', 'main character energy', 'unreal', and 'we are eating good'. 
Your commentary and meme captions must be funny, witty, and highly relatable to modern fans online.`;
  } else {
    // Casual
    promptStyleGuide = `You are a positive, exciting, and professional cricket commentator and content creator. 
Your tone is fun, highly engaging, descriptive, and fan-friendly. Perfect balance of sports energy and viral captions.`;
  }

  const prompt = `You are an energetic cricket commentator and viral content creator.
${promptStyleGuide}

Given this cricket moment: "${eventText}",

Generate output in EXACT format:

Commentary:
(2 lines, high energy, matching your assigned style)

Meme:
(1 short funny caption matching your assigned style)

Reel Caption:
(1 catchy caption + 4 hashtags matching your assigned style)

Keep it short, exciting, and fan-friendly. Do not include markdown code block formatting wrappers, only the headers and text.`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned HTTP status ${response.status}`);
    }

    const data = await response.json();
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textOutput) {
      throw new Error("Empty content returned from Gemini API.");
    }

    return parseHypeOutput(textOutput);
  } catch (error) {
    console.warn(`Gemini API error for mode: ${fanMode}. Fetching custom offline mock fallback data...`, error);
    
    const lowerEvent = eventText.toLowerCase();
    const isWicket = lowerEvent.includes("wicket") || lowerEvent.includes("out");
    const isSix = lowerEvent.includes("six") || lowerEvent.includes("launched") || lowerEvent.includes("hit");
    const isFour = lowerEvent.includes("four") || lowerEvent.includes("boundary");
    const isLastOver = lowerEvent.includes("last over") || lowerEvent.includes("final");

    // Mode-specific fallback mock dictionary
    if (fanMode === "hardcore") {
      if (isWicket) {
        return {
          commentary: "💥 OH MY WORD! HE'S SENT THE STUMPS CARTWHEELING! ABSOLUTE DEVASTATION IN THE STADIUM! SHAKEEN AFRIDI HAS SHATTERED THE TIMBER! WHAT A PEACH!",
          meme: "The batsman walking back like he left his stove on. ABSOLUTE SHAMBLES! 🚪🚶‍♂️",
          reel: "STUMPS RIPPED OUT OF THE GROUND! 💥 Absolute thunderbolt from the speedster! Turn the volume UP! 🏏🔥 #CleanBowled #HardcoreCricket #Thunderbolt #HypeX"
        };
      } else if (isSix) {
        return {
          commentary: "🚀 INTO THE HEAVENS! THAT HAS GONE OUT OF THE COLOSSEUM! MONUMENTAL! DHONI HAS LAUNCHED IT INTO THE STRATOSPHERE! THAT IS A 110-METER MONSTER!",
          meme: "The umpire looking for the ball in the nearby parking lot like he lost his car keys. 🗺️🔍",
          reel: "HE LAUNCHED IT INTO ORBIT! 🚀 Absolute raw power from the captain! That is colossal! 🏏💥 #MonsterSix #MaximumPower #AbsoluteStadiumScreamer #HypeX"
        };
      } else if (isLastOver) {
        return {
          commentary: "😱 NAIL-BITING THRILLER! HEARTS ARE POUNDING! PALMS ARE SWEATING! THE PRESSURE IS SO THICK YOU CAN CUT IT WITH A KNIFE! WHO WILL BE THE HERO?!",
          meme: "My cardiologist watching my heart rate graph during the final over of an Ind-Pak match. 📈🚑",
          reel: "THE CLIMAX OF A LIFETIME! 😱 Ultimate final over drama right here! You cannot blink! 🏏🏁 #NailBiter #FinalOverThriller #AbsoluteChaos #HypeX"
        };
      }
      return {
        commentary: "🔥 ELECTRICITY AT ITS MAXIMUM! THE CROWD IS ROARING! THE STADIUM IS ROCKING! THIS IS CRICKET AT ITS ABSOLUTE ZENITH!",
        meme: "Me when I call in sick to work but get spotted cheering on live television. 😷🤫",
        reel: "RAW STADIUM EXCITEMENT! 🔥 Feel the energy! Unstoppable drama on the field! 🏏⚡ #StadiumEruption #PureClass #EpicHighlight #HypeX"
      };
    } else if (fanMode === "meme") {
      if (isWicket) {
        return {
          commentary: "💀 Stumps left the chat. Afridi really said 'not on my watch' and packed him home in 4K. Absolute main character behavior.",
          meme: "The stumps: 'Guess I will just lie down and die then.' 🪵☠️",
          reel: "Stumps really got disconnected from the server. 💀 Pat Cummins showing no mercy, no cap! 🏏🔥 #CleanBowled #LetHimCook #MainCharacter #HypeX"
        };
      } else if (isSix) {
        return {
          commentary: "📈 Bro really said let me cook! Launched that ball so far it has its own zip code now. We are eating good tonight, no cap!",
          meme: "The ball flying over the roof: 'Change of plans, I live in Melbourne now.' 🗺️✈️",
          reel: "He really launched it into another dimension! 🚀 Absolute cinema right here! 🏏💥 #HugeSix #LetHimCook #NoCap #HypeX"
        };
      }
      return {
        commentary: "👁️👄👁️ Absolute cinema. Bro did the thing and now the stadium is completely losing it. You love to see it.",
        meme: "Me pretending I know what an LBW is just to vibe with the boys during the live match. 🫡🤷‍♂️",
        reel: "This match is giving main character energy! ⚡ We are absolutely eating good tonight! 🏏✨ #BroCooked #NoCap #AbsoluteCinema #HypeX"
      };
    } else {
      // Casual Fallbacks (Standard)
      if (isWicket) {
        return {
          commentary: "💥 WICKET! The bails are flying! Brilliant bowling under pressure breaks this dangerous partnership!",
          meme: "The face you make when the main batsman gets out on a duck. 🥺🤦‍♂️",
          reel: "What a massive breakthrough! 💥 Excellent delivery shatters the stumps! The fans are going wild! 🏏🔥 #Wicket #MatchTurnaround #LiveCricket #HypeX"
        };
      } else if (isSix) {
        return {
          commentary: "🚀 SIX! Clean strike! Right out of the middle of the bat and sails over the deep mid-wicket boundary!",
          meme: "The cricket ball calling its family to tell them it's never coming home. 😂🔭",
          reel: "That is huge! 🚀 High and handsome into the stands! What a sensational shot! 🏏💥 #HugeSix #StadiumVibes #CricketFever #HypeX"
        };
      }
      return {
        commentary: `🔥 AWESOME HIGHLIGHT! "${eventText}" has sent the crowd into a state of sheer joy! Truly a moment to remember!`,
        meme: `When you tuned in for a casual watch but ended up witnessing a classic game. 📺🤯`,
        reel: `Unbelievable action! This is why we love the sport! 🏏✨ #HypeX #Unstoppable #CricketPassion #MatchDay`
      };
    }
  }
}

/**
 * Chats with Gemini Pro, feeding it the current match state for context-aware cricket dialogue.
 * 
 * @param {string} userMessage - User's chat query
 * @param {object} match - Current live match state
 * @returns {Promise<string>} Gemini response text
 */
export async function chatWithGemini(userMessage, match) {
  if (!userMessage) return "Please say something!";
  
  let matchContext = "No active match details currently available.";
  if (match) {
    matchContext = `
- Teams: ${match.team1} vs ${match.team2}
- Score: ${match.score}
- Overs: ${match.overs}
- Status: ${match.status}
- Venue: ${match.venue}
- Active Batsmen:
  1. ${match.batsmen?.[0]?.name || "N/A"} (${match.batsmen?.[0]?.runs || 0} runs, ${match.batsmen?.[0]?.balls || 0} balls, ${match.batsmen?.[0]?.sixes || 0} sixes, Strike Rate: ${match.batsmen?.[0]?.strikeRate || 0})
  2. ${match.batsmen?.[1]?.name || "N/A"} (${match.batsmen?.[1]?.runs || 0} runs)
- Active Bowler: ${match.bowler?.name || "N/A"} (Overs: ${match.bowler?.overs || "0.0"}, Wickets: ${match.bowler?.wickets || 0}, Econ: ${match.bowler?.econ || 0})
- Recent match timeline events:
  ${match.recentEvents?.map(e => `[${e.event} at Over ${e.overs}] ${e.desc}`).join("\n  ") || "No events recorded."}
`;
  }

  const prompt = `You are HypeX Assistant, a knowledgeable, witty, and energetic second-screen cricket companion. You help fans during live cricket matches.

Here is the current live match state:
${matchContext}

User's message: "${userMessage}"

Please answer the user's message using the live match details above if relevant. Keep your answer highly engaging, concise (maximum 3 sentences), and full of cricket fever. Be conversational, direct, and fun!`;

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return textOutput || "I'm experiencing a stadium blackout! Could you try asking that again?";
  } catch (error) {
    console.error("Gemini Chatbot error:", error);
    
    // Friendly, highly personalized offline responses based on user query keywords!
    const msg = userMessage.toLowerCase();
    if (msg.includes("score") || msg.includes("wicket") || msg.includes("runs")) {
      return `Right now, the score stands at ${match?.score || "152/3"} in ${match?.overs || "17.2"} overs. ${match?.batsmen?.[0]?.name || "Virat Kohli"} is playing like a champion on ${match?.batsmen?.[0]?.runs || 74} runs! 🏏🔥`;
    } else if (msg.includes("who") && (msg.includes("batting") || msg.includes("batsman"))) {
      return `${match?.batsmen?.[0]?.name || "V. Kohli"} is at the crease batting on ${match?.batsmen?.[0]?.runs || 74} runs alongside ${match?.batsmen?.[1]?.name || "H. Pandya"}. They are looking in solid form! ⚡`;
    } else if (msg.includes("bowling") || msg.includes("bowler")) {
      return `The bowler currently steaming in is ${match?.bowler?.name || "Shaheen Afridi"}, who has claimed ${match?.bowler?.wickets || 2} wickets in his spell. 🎯🔥`;
    } else if (msg.includes("win") || msg.includes("predict")) {
      return `It is an absolute nail-biter here! With India at ${match?.score || "152/3"}, both teams have a massive fighting chance. Who are you backing in the Cheer Battle? ⚔️`;
    }
    
    return `Stadium roaring! HypeX Assistant here - ${match?.team1 || "India"} and ${match?.team2 || "Pakistan"} are locked in an epic clash! Let me know what you want to know about the match! 🏟️⚡`;
  }
}

export function getFirebaseStatusCheck() {
  return GEMINI_API_KEY !== "AIzaSyDBvKR1ToPtLbqnp5LHqOI5h5lq7vGj9a4";
}
