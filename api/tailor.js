const Groq = require("groq-sdk");

module.exports = async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Only POST is accepted.' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } 
      catch (e) { body = {}; }
    }

    const { userName, jobDesc, userSkills, targetIndustry, docType, webhookUrl } = body || {};
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API Key is missing in Vercel Environment Variables." });
    }

    if (!userName || !jobDesc || !userSkills || !docType) {
      return res.status(400).json({ error: "Missing mandatory fields." });
    }

    const ai = new Groq({ 
      apiKey: apiKey,
      // baseURL: "https://openrouter.ai/api/v1" // Uncomment if using OpenRouter
    });

    // Determine requested output format
    let typeInstruction = "";
    switch(docType) {
        case "resume": typeInstruction = "Tailored resume bullet points optimized for ATS systems and recommended keywords."; break;
        case "cv": typeInstruction = "A comprehensive academic and professional CV structure with distinct sections."; break;
        case "cover_letter": typeInstruction = "A professional, persuasive, and ready-to-use cover letter."; break;
        case "interview": typeInstruction = "5 highly likely technical/behavioral interview questions with suggested answers."; break;
        case "ats_score": typeInstruction = "An ATS Match Score percentage, followed by a list of missing critical keywords and gap analysis."; break;
        case "star_case": typeInstruction = "Reformat the user's skills and experience into 3 strict STAR method (Situation, Task, Action, Result) case studies."; break;
        case "linkedin": typeInstruction = "An optimized LinkedIn profile headline, an engaging 'About' summary, and bullet points for the experience section."; break;
        case "cold_email": typeInstruction = "A compelling cold outreach networking email directed at department heads or business owners to secure an interview or meeting."; break;
        default: typeInstruction = "Tailored professional materials.";
    }

    const messages = [
      {
        role: "system",
        content: `You are an elite technical recruiter and career strategist. Format your output strictly using Markdown. Use clear ## and ### headings, bullet points, and bold text for emphasis. Apply industry-specific terminology appropriately. Ensure the output is highly readable and professional.`
      },
      {
        role: "user",
        content: `Applicant Name: ${userName}\nTarget Industry: ${targetIndustry || "General"}\nJob Description / Target Role:\n${jobDesc}\n\nMy Skills, Education & Experience:\n${userSkills}\n\nRequired Output: ${typeInstruction}`
      }
    ];

    const fallbackModels = [
      "llama-3.3-70b-versatile",
      "qwen/qwen3-32b",
      "openai/gpt-oss-120b"
    ];

    let chatCompletion = null;
    let lastError = null;

    for (const model of fallbackModels) {
      try {
        chatCompletion = await ai.chat.completions.create({
          model: model,
          messages: messages
        });
        break; 
      } catch (error) {
        console.warn(`Model [${model}] failed. Fallback initiated.`, error.message);
        lastError = error;
      }
    }

    if (!chatCompletion) {
      return res.status(500).json({ error: "All AI models failed. Last error: " + (lastError?.message || "Unknown error.") });
    }

    const resultText = chatCompletion.choices[0]?.message?.content || "No response generated.";

    // Optional Webhook Execution (Fire and Forget)
    if (webhookUrl && webhookUrl.startsWith('http')) {
        try {
            fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applicant: userName, type: docType, content: resultText, timestamp: new Date().toISOString() })
            }).catch(err => console.error("Webhook trigger failed:", err));
        } catch (e) {
            console.error("Webhook processing error:", e);
        }
    }

    return res.status(200).json({ result: resultText });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process request." });
  }
};
