# 💻 AI Resume Maker

## 📖 a. About the Application
**App Name:** AI Resume Maker

**What it does:** AI Resume Maker is an intelligent, multi-step web application that leverages advanced Large Language Models (LLMs) to dynamically generate highly optimized, tailored career documents. It processes user skills against specific job descriptions to instantly produce customized resumes, CVs, cover letters, freelance pitches, and interview preparation guides.

**The real problem it solves:** Applying for modern tech jobs with a generic resume often results in automatic rejection by Applicant Tracking Systems (ATS). However, manually tailoring documents for every single application is overwhelmingly time-consuming. AI Resume Maker solves this by automating the tailoring process, extracting keyword gaps, and formatting the output perfectly in seconds.

**For whom:** Professionals, students, freshers entering the industry, and independent freelance developers looking to optimize their application materials.

---

## 🔗 b. Live Deployment
**Live URL:** [https://airesume-git-main-sadia16.vercel.app/](https://airesume-git-main-sadia16.vercel.app/)  
*Deployed via Vercel using Serverless Edge Functions.*

---

## ✨ c. Comprehensive Features List
*   **Dynamic 3-Step UI Wizard:** A clean, progressive interface that guides the user through Profile Setup, Experience Input, and Tool Selection without overwhelming them.
*   **ATS Match Scoring Engine:** Automatically calculates an estimated ATS compatibility percentage and extracts it into a dedicated visual side-panel, keeping the main document clean.
*   **9 Professional AI Modules:**
    1. Targeted Resume Bullet Points
    2. Comprehensive Academic/Professional CV
    3. Persuasive Cover Letter Draft
    4. STAR Method Case Study Builder (Situation, Task, Action, Result)
    5. LinkedIn Profile Optimizer
    6. Cold Outreach Networking Emails
    7. Technical Interview Prep Guide
    8. Freelance Project Pitch / Proposal
*   **Fresher / Entry-Level Failsafe:** Intelligent validation that allows users with zero experience to leave the skills field blank; the app automatically formats their profile as a highly-motivated fresher to prevent AI hallucinations.
*   **Native Browser PDF Export:** Utilizes `html2pdf.js` to convert the styled HTML/Markdown directly into a cleanly formatted, presentation-ready PDF document.
*   **Automated Webhook Integration:** Users can optionally input a webhook URL to push their generated documents as JSON payloads directly to external workflows (like n8n, Zapier, or Discord).

---

## 🧠 d. The AI Feature & System Prompt
**What the AI does:** The AI acts as an elite technical recruiter. It cross-references the user's provided skills with the target job description to rewrite and optimize their experience. It maps keyword gaps, structures the data into the requested document format (e.g., STAR method or Cover Letter), and returns the data in strict Markdown for frontend rendering. 

**The Core Instructions / System Prompt:**
The application utilizes a strict system prompt to enforce formatting and prevent data hallucination. The exact prompt injected into the backend is:

> *"You are an elite technical recruiter and business strategist. Format your output strictly using Markdown. Use clear headings, bullet points, and bold text.*
>
> *CRITICAL RULE: DO NOT invent, guess, or hallucinate contact information (emails, phone numbers, LinkedIn, GitHub). If the user does not provide it, you MUST strictly use placeholders exactly like this: [Enter Email Here], [Enter Phone Number Here], [Enter LinkedIn URL Here].*
>
> *Do not include conversational filler like 'Here is your document'. Output ONLY the requested document."*

Additionally, for Resume/CV generation, a programmatic prefix instruction is injected to enforce the ATS scoring logic:
> *"IMPORTANT: You MUST calculate an estimated ATS Match Score (0-100%) based on the keyword alignment between the user's skills and the job description. Your response MUST start EXACTLY with this string on the very first line: `ATS_SCORE: XX%`..."*

---

## 🛠️ e. Tools, Services, and AI Models Used
**Frontend Architecture:**
*   **HTML5 / Vanilla JavaScript:** Core structure and DOM manipulation for the UI Wizard.
*   **Tailwind CSS (via CDN):** Rapid, responsive, utility-first styling.
*   **Tailwind Typography (`prose` plugin):** For rendering the AI's Markdown output beautifully.
*   **Marked.js:** Parsing engine to convert AI Markdown responses into HTML.
*   **html2pdf.js:** Client-side PDF generation.

**Backend Architecture:**
*   **Node.js:** Runtime environment.
*   **Vercel Serverless Functions:** Hosted API routing (`/api/tailor`).

**AI & Machine Learning:**
*   **Groq SDK / API:** High-speed inference engine powering the backend requests.
*   **Cascading Model Fallback Array:** 
    1. Primary: `llama-3.3-70b-versatile` (Meta Llama 3.3)
    2. Fallback 1: `qwen/qwen3-32b` (Qwen)
    3. Fallback 2: `openai/gpt-oss-120b` (Routing fallback)

---

## 📸 f. Screenshots
*(Note: Ensure your image files are located in your GitHub repository, such as in an `assets` folder, and replace the `./assets/` paths below with your actual file names).*

### 1. Step 1: User Profile & Target Industry
![Profile Setup](./assets/screenshot1.png)
*The clean, modern UI wizard collecting the user's basic information.*

### 2. Step 3: Tool Selection & Webhook Configuration
![Tool Selection](./assets/screenshot2.png)
*Users can select from over 8 professional career modules and configure automation payloads.*

### 3. Generated Result & ATS Gap Analysis Side Panel
![Result and ATS Score](./assets/screenshot3.png)
*The generated Markdown document beautifully rendered alongside the extracted ATS Match Score.*

---

## ⚙️ g. How to Run the Project

### Local Development Setup
1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/your-username/your-repo-name.git
   cd your-repo-name
   ```
2. Because this project uses Vercel Serverless Functions (`api/tailor.js`), you must use the Vercel CLI to run it locally. Install the CLI:
   ```bash
   npm i -g vercel
   ```
3. Link the project to your Vercel account and pull the environment variables (this requires you to have a Vercel account setup):
   ```bash
   vercel link
   vercel env pull
   ```
4. Start the local development server:
   ```bash
   vercel dev
   ```
5. Open your browser and navigate to `http://localhost:3000`.

### Deployment to Vercel (Production)
1. Push your code to a public GitHub repository.
2. Log into **Vercel** and click **Add New -> Project**.
3. Import your GitHub repository.
4. **CRITICAL:** Under the **Build & Development Settings**, change the **Framework Preset** to **Other**.
5. In the **Environment Variables** section, add your Groq API Key:
   * **Key:** `GROQ_API_KEY`
   * **Value:** `gsk_your_actual_api_key_here`
6. Click **Deploy**. Vercel will automatically route the `api/tailor.js` file as a functional backend endpoint.
