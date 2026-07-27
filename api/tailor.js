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

    const { userName, jobDesc, userSkills, targetIndustry, docType } = body || {};
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API Key is missing in Vercel Environment Variables." });
    }

    if (!userName || !jobDesc || !userSkills) {
      return res.status(400).json({ error: "Missing required fields: Name, Job Description, or Skills." });
    }

    // Initialize SDK. 
    // NOTE: If using OpenRouter to access the specific models in your screenshot, uncomment the baseURL line.
    const ai = new Groq({ 
      apiKey: apiKey,
      // baseURL: "https://openrouter.ai/api/v1" 
    });

    let typeInstruction = "";
    if (docType === "resume") typeInstruction = "Tailored resume bullet points optimized for ATS systems and recommended keywords.";
    else if (docType === "cv") typeInstruction = "A comprehensive academic and professional CV structure with distinct sections.";
    else if (docType === "cover_letter") typeInstruction = "A professional, persuasive, and ready-to-use cover letter.";
    else if (docType === "interview") typeInstruction = "5 highly likely technical/behavioral interview questions with suggested answers.";
    else typeInstruction = "Tailored professional materials.";

    const messages = [
      {
        role: "system",
        content: "You are an expert technical recruiter and career coach. Format your output strictly using Markdown. Use clear ## and ### headings, bullet points, and bold text for emphasis. Ensure the output is structured, highly readable, and professional. Do not output giant walls of plain text."
      },
      {
        role: "user",
        content: `Applicant Name: ${userName}\nTarget Industry: ${targetIndustry || "General"}\nJob Description / Role:\n${jobDesc}\n\nMy Skills & Experience:\n${userSkills}\n\nRequired Output: ${typeInstruction}`
      }
    ];

    // Requested Cascading Fallback Array
    const fallbackModels = [
      "llama-3.3-70b-versatile",
      "qwen/qwen3-32b",
      "openai/gpt-oss-120b"
    ];

    let chatCompletion = null;
    let lastError = null;

    // Loop through the models and break on the first successful response
    for (const model of fallbackModels) {
      try {
        chatCompletion = await ai.chat.completions.create({
          model: model,
          messages: messages
        });
        break; // Exit the loop immediately if the request succeeds
      } catch (error) {
        console.warn(`Model [${model}] failed. Initiating fallback...`, error.message);
        lastError = error;
      }
    }

    // If all models in the array fail, return the last caught error
    if (!chatCompletion) {
      return res.status(500).json({ error: "All AI models failed to respond. Last error: " + (lastError?.message || "Unknown API error.") });
    }

    const resultText = chatCompletion.choices[0]?.message?.content || "No response generated.";
    return res.status(200).json({ result: resultText });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({ error: error.message || "Failed to process request." });
  }
};
