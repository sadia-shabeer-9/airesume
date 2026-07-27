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

    // Relaxed Validation: Only Name, Job/Project Desc, and Doc Type are mandatory
    if (!userName || !jobDesc || !docType) {
      return res.status(400).json({ error: "Missing mandatory fields: Name or Job/Project Description." });
    }

    // Handle Freshers/Empty Fields
    const safeIndustry = targetIndustry ? targetIndustry : "General Technology / Software";
    const safeSkills = userSkills ? userSkills : "Entry-level / Fresher. Highly motivated to learn and execute with precision. Focus on foundational concepts and strong work ethic.";

    const ai = new Groq({ apiKey: apiKey });

    // Determine requested output format including the new Freelance Pitch
    let typeInstruction = "";
    switch(docType) {
        case "resume": typeInstruction = "Tailored resume bullet points optimized for ATS systems and recommended keywords."; break;
        case "cv": typeInstruction = "A comprehensive academic and professional CV structure with distinct sections."; break;
        case "cover_letter": typeInstruction = "A professional, persuasive, and ready-to-use cover letter."; break;
        case "interview": typeInstruction = "5 highly likely technical/behavioral interview questions with suggested answers."; break;
        case "ats_score": typeInstruction = "An ATS Match Score percentage, followed by a list of missing critical keywords and gap analysis."; break;
        case "star_case": typeInstruction = "Reformat the skills and experience into strict STAR method (Situation, Task, Action, Result) case studies."; break;
        case "linkedin": typeInstruction = "An optimized LinkedIn profile headline, an engaging 'About' summary, and bullet points for the experience section."; break;
        case "cold_email": typeInstruction = "A compelling cold outreach networking email directed at department heads or business owners to secure an interview or meeting."; break;
        case "freelance_pitch": typeInstruction = "A comprehensive freelance business proposal. Include a professional greeting, proposed scope of work, technical architecture recommendations, project timeline estimations, and a closing call to action."; break;
        default: typeInstruction = "Tailored professional materials.";
    }

    const messages = [
      {
        role: "system",
        content: `You are an elite technical recruiter, business strategist, and career coach. Format your output strictly using Markdown. Use clear ## and ### headings, bullet points, and bold text for emphasis. Apply industry-specific terminology appropriately. If the user indicates they are a fresher or entry-level, highlight their ambition, foundational knowledge, and problem-solving mindset.`
      },
      {
        role: "user",
        content: `Name: ${userName}\nTarget Industry: ${safeIndustry}\nJob/Project Description:\n${jobDesc}\n\nMy Skills, Education & Experience:\n${safeSkills}\n\nRequired Output: ${typeInstruction}`
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
