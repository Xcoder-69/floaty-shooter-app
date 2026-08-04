const GEMINI_API_KEY = "AIzaSyD6tl4raO-HD4D53bKw9RNKKMNNv9WoUNo";
const GEMINI_MODEL = "gemini-1.5-flash";

async function fetchGeminiBriefing(chapter, level, missionDesc) {
    const prompt = `
        You are A.U.R.A (Advanced Utility Recon Assistant), a tactical AI in a 2D cyberpunk shooter game called 'Floaty Shooter'. 
        Give a short tactical briefing (max 150 characters) for:
        Chapter: ${chapter}
        Level: ${level}
        Mission: ${missionDesc}
        Style: Cyberpunk, electronic, mission-critical, slightly mysterious.
        Combat Tip: Include a short combat tip for this mission.
        Requirement: Only output the dialogue text. No meta-talk.
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }]
            })
        });

        if (!response.ok) throw new Error('API request failed');
        
        const data = await response.json();
        return data.candidates[0].content.parts[0].text.trim();

    } catch (error) {
        console.error("AI Briefing Error:", error);
        return `[OFFLINE] Sector ${chapter}-${level} unstable. Combat protocols engaged. Pilot, proceed with caution.`;
    }
}
