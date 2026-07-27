const Groq = require("groq-sdk");

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is accepted.' });
  }

  try {
    // Safely parse the body
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } 
      catch (e) { body = {}; }
    }

    const { jobDesc, userSkills, targetIndustry } = body || {};
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY is missing in Vercel Environment Variables." });
    }

    if (!jobDesc || !userSkills) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const ai = new Groq({ apiKey });

    const chatCompletion = await ai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are an expert technical recruiter and career coach. Given a job description, user skills/experience, and a target industry, provide: 1) Tailored resume bullet points optimized for ATS systems, 2) Recommended keywords to include, and 3) A professional cover letter draft."
        },
        {
          role: "user",
          content: "Target Industry: " + (targetIndustry || "General") + "\n\nJob Description / Role:\n" + jobDesc + "\n\nMy Skills & Experience:\n" + userSkills
        }
      ]
    });

    const resultText = chatCompletion.choices[0]?.message?.content || "No response generated.";
    return res.status(200).json({ result: resultText });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to generate materials." });
  }
};