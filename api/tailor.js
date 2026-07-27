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

    const safeIndustry = targetIndustry ? targetIndustry : "Software Engineering";
    const safeSkills = userSkills ? userSkills : "Entry-level professional with strong foundational computer science knowledge, problem-solving skills, and a drive to build scalable software solutions.";

    const ai = new Groq({ apiKey: apiKey });

    let prefixInstruction = "";
    if (docType === "resume" || docType === "cv") {
        prefixInstruction = "IMPORTANT: Calculate an estimated ATS Match Score (0-100%) based on keyword alignment. Your response MUST start EXACTLY with this string on the very first line: `ATS_SCORE: XX%`. ";
    }

    let typeInstruction = "";
    switch(docType) {
        case "resume": typeInstruction = "Write a complete, professional, highly tailored resume formatted in Markdown. Do not use bracketed placeholders for experience, skills, or projects; instead, write professional, realistic bullet points based on the user's provided background and target job description."; break;
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
        content: `You are an elite technical writer and career coach. Your task is to WRITE the actual document for the user, not a blank template. 
        - Fully write out professional summaries, skill sets, project descriptions, and bullet points tailored to the target job.
        - NEVER use brackets like '[Enter Job Description Here]' for experience or projects. Synthesize professional content based on the user's input.
        - ONLY use brackets for private contact info if unprovided (e.g., [Enter Email Here], [Enter Phone Here]).
        - Format strictly in clean Markdown with clear headings.`
      },
      {
        role: "user",
        content: `${prefixInstruction}\n\nApplicant Name: ${userName}\nTarget Industry: ${safeIndustry}\nJob Description / Target Role:\n${jobDesc}\n\nUser Background & Skills:\n${safeSkills}\n\nRequired Output: ${typeInstruction}`
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
        lastError = error;
      }
    }

    if (!chatCompletion) {
      return res.status(500).json({ error: "All AI models failed." });
    }

    const resultText = chatCompletion.choices[0]?.message?.content || "No response generated.";
    return res.status(200).json({ result: resultText });

  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to process request." });
  }
};
