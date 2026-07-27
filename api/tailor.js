const Groq = require("groq-sdk");

module.exports = async function handler(req, res) {
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

    if (!userName || !jobDesc || !docType) {
      return res.status(400).json({ error: "Missing mandatory fields: Name or Job/Project Description." });
    }

    const safeIndustry = targetIndustry ? targetIndustry : "General Technology / Software";
    const safeSkills = userSkills ? userSkills : "Entry-level / Fresher. Highly motivated to learn and execute with precision.";

    const ai = new Groq({ apiKey: apiKey });

    // Determine requested output format and inject ATS instruction if needed
    let typeInstruction = "";
    let prefixInstruction = "";

    if (docType === "resume" || docType === "cv") {
        prefixInstruction = "IMPORTANT: You MUST calculate an estimated ATS Match Score (0-100%) based on the keyword alignment between the user's skills and the job description. Your response MUST start EXACTLY with this string on the very first line: `ATS_SCORE: XX%` (replace XX with your calculated number). Do not put any text before this. ";
    }

    switch(docType) {
        case "resume": typeInstruction = "Tailored resume bullet points optimized for ATS systems and recommended keywords."; break;
        case "cv": typeInstruction = "A comprehensive academic and professional CV structure with distinct sections."; break;
        case "cover_letter": typeInstruction = "A professional, persuasive, and ready-to-use cover letter."; break;
        case "interview": typeInstruction = "5 highly likely technical/behavioral interview questions with suggested answers."; break;
        case "star_case": typeInstruction = "Reformat the skills and experience into strict STAR method (Situation, Task, Action, Result) case studies."; break;
        case "linkedin": typeInstruction = "An optimized LinkedIn profile headline, an engaging 'About' summary, and bullet points for the experience section."; break;
        case "cold_email": typeInstruction = "A compelling cold outreach networking email directed at department heads or business owners to secure an interview or meeting."; break;
        case "freelance_pitch": typeInstruction = "A comprehensive freelance business proposal. Include a professional greeting, proposed scope of work, technical architecture recommendations, and project timeline estimations."; break;
        default: typeInstruction = "Tailored professional materials.";
    }

    const messages = [
      {
        role: "system",
        content: `You are an elite technical recruiter and business strategist. Format your output strictly using Markdown. Use clear headings, bullet points, and bold text. 
        
        CRITICAL RULE: DO NOT invent, guess, or hallucinate contact information (emails, phone numbers, LinkedIn, GitHub). If the user does not provide it, you MUST strictly use placeholders exactly like this: [Enter Email Here], [Enter Phone Number Here], [Enter LinkedIn URL Here].
        
        Do not include conversational filler like "Here is your document". Output ONLY the requested document.`
      },
      {
        role: "user",
        content: `${prefixInstruction}\n\nName: ${userName}\nTarget Industry: ${safeIndustry}\nJob/Project Description:\n${jobDesc}\n\nMy Skills & Experience:\n${safeSkills}\n\nRequired Output: ${typeInstruction}`
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
