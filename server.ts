import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Parse JSON bodies
app.use(express.json());

// API route for AI Caddy Recommendations
app.post("/api/gemini/caddy", async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return res.status(400).json({
      error: "Gemini API key is not configured. Please add GEMINI_API_KEY to your Secrets panel in Google AI Studio Settings."
    });
  }

  try {
    const { conditions, clubs, profile } = req.body;

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });

    const systemPrompt = `You are an elite, professional PGA Golf Tour Caddy and golf simulator adjustment expert.
Your job is to provide precise, highly detailed tactical recommendations for a player.
Analyze the provided environmental conditions, user clubs, and profile, then suggest:
1. The absolute best club to use from their club list.
2. The recommended swing power percentage (e.g., "Full 100%", "93% punch", etc.).
3. The adjusted aim (how many yards or cups to aim left/right for wind, uphill/downhill drifts).
4. Explanations for how temperature, altitude, and lie type affect the carry, spin, and roll of the ball.
5. A concise "Caddy Wisdom" sentence of mental imagery.

Return your response in a structured JSON format containing:
{
  "recommendedClub": "Club Name",
  "recommendedPower": "e.g., 95%",
  "aimAdjustment": "e.g., Aim 8 yards left",
  "adjustedYards": 168,
  "factorsExplanation": "A short, beautiful paragraph summarizing how temperature, wind, and lie altered the physics of this shot.",
  "caddyWisdom": "One-sentence mental visualization tip."
}`;

    const prompt = `
Environmental Conditions:
- Target Distance: ${conditions.targetDistance} yards
- Elevation Difference: ${conditions.elevation} feet (${conditions.elevation >= 0 ? 'Uphill' : 'Downhill'})
- Wind Speed: ${conditions.windSpeed} mph
- Wind Angle: ${conditions.windAngle}° (${conditions.windLabel || 'Direct Wind'})
- Lie Type: ${conditions.lieType}
- Shot Type: ${conditions.shotType}
- Temperature: ${conditions.temperature || 70}°F
- Altitude: ${conditions.altitude || 0} feet

Player Profile:
- Skill Level: ${profile.skillLevel || 'Intermediate'}
- Distance Unit: ${profile.preferredUnits || 'Yards'}

Player's Available Clubs:
${JSON.stringify(clubs.map((c: any) => ({ name: c.name, loft: c.loft, carry: c.carry, total: c.total, confidence: c.confidence })), null, 2)}

Provide your calculation and adjustment analysis in the exact requested JSON format. Ensure valid JSON string response.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.7,
      },
    });

    const text = response.text || "{}";
    const data = JSON.parse(text);
    return res.json(data);
  } catch (error: any) {
    console.error("Gemini API Error in backend:", error);
    return res.status(500).json({
      error: "Failed to generate AI Caddy recommendation.",
      details: error.message
    });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
