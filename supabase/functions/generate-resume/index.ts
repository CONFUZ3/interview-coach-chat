// This is the Supabase Edge Function that generates resumes using the Gemini API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// LaTeX template based on the provided Python code
const LATEX_TEMPLATE = `
\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\input{glyphtounicode}

%----------FONT OPTIONS----------
% sans-serif
% \\usepackage[sfdefault]{FiraSans}
% \\usepackage[sfdefault]{roboto}
% \\usepackage[sfdefault]{noto-sans}
% \\usepackage[default]{sourcesanspro}

% serif
% \\usepackage{CormorantGaramond}
% \\usepackage{charter}

\\pagestyle{fancy}
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Ensure PDF is machine readable/ATS parsable
\\pdfgentounicode=1

%-------------------------
% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubSubheading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textit{\\small#1} & \\textit{\\small #2} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}

\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}
`;

// Function to escape special LaTeX characters in user input
function escapeLatex(text: string): string {
  if (!text) return "";
  
  const latexSpecialChars: {[key: string]: string} = {
    "&": "\\&", 
    "%": "\\%", 
    "$": "\\$", 
    "#": "\\#",
    "_": "\\_", 
    "{": "\\{", 
    "}": "\\}", 
    "~": "\\textasciitilde{}",
    "^": "\\textasciicircum{}", 
    "\\": "\\textbackslash{}"
  };
  
  // Remove excessive new lines
  let safeText = text.replace(/\n+/g, '\n');
  
  // Escape special characters
  for (const [char, escape] of Object.entries(latexSpecialChars)) {
    safeText = safeText.split(char).join(escape);
  }
  
  return safeText.trim();
}

// Extract only the LaTeX code from LLM response
function extractLatex(response: string): string | null {
  const match = response.match(/\\documentclass.*?\\end{document}/s);
  return match ? match[0] : null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the Gemini API key from environment variable
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set');
    }

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const { jobDescription, userProfile, previousResume } = await req.json();

    // Ensure we have necessary data
    if (!jobDescription) {
      return new Response(
        JSON.stringify({ error: "Job description is required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }
    
    // PROFILE BUILDING LOGIC:
    // Build a rich candidate profile summary for the prompt
    let fullName = userProfile?.fullName || "Your Name";
    let email = userProfile?.email || "email@example.com";
    let phone = userProfile?.phone || "(123) 456-7890";
    let linkedin = userProfile?.linkedin || "";
    let github = userProfile?.github || "";
    let summary = userProfile?.summary || ""; // Expecting a "summary" or similar field for career/professional summary
    let resumeText = previousResume || userProfile?.resumeText || "";

    // Combine links nicely
    let contactLine =
      [
        escapeLatex(phone),
        email ? `\\href{mailto:${escapeLatex(email)}}{\\underline{${escapeLatex(email)}}}` : "",
        linkedin ? `\\href{${escapeLatex(linkedin)}}{\\underline{${escapeLatex(linkedin)}}}` : "",
        github ? `\\href{${escapeLatex(github)}}{\\underline{${escapeLatex(github)}}}` : "",
      ]
        .filter(Boolean)
        .join(" $|$ ");

    // PROMPT for Gemini LLM:
    const prompt = `
You are an expert LaTeX formatter specializing in professional resumes. Generate a complete, fully-compilable LaTeX resume using only the template provided.

**Must-Keep Formatting and Sections (do NOT deviate):**
- Use this template exactly:
${LATEX_TEMPLATE}

- The output must:
  - Start with \\begin{document} and end with \\end{document}
  - BE 100% pure valid LaTeX with no extra explanations or comments.
  - Use the AT&T/ATS-friendly format.
  - INLCUDE ALL recommended \section{} and command styles. Add any new custom commands you need only using the pattern style in the template.
  - NEVER write "STAR technique" or similar in your output.
  - Do not change the font or documentclass/geometry.

**Populate the following sections & structure:**

\\begin{document}
\\begin{center}
  \\textbf{\\Huge \\scshape ${escapeLatex(fullName)}} \\\\ \\vspace{1pt}
  \\small ${contactLine}
\\end{center}

1. \\section{Career Summary}
  - Write a succinct, 2-5 line summary describing the candidate’s background, skills, industry, and motivation for the job.
  - Base this summary on the data below and the job description. You *MUST* synthesize from both current profile, resume, and described skills.

2. \\section{Education}
  - List all degrees, schools, and timeframes in most recent first order.

3. \\section{Experience}
  - For each job, list:
    * Title, Dates, Company, Location (using \\resumeSubheading)
    * 2-5 resume bullet points (\\resumeItem), following STAR principles, tailored to the job.

4. \\section{Projects} (optional; include if present)
  - Major relevant academic/personal projects.

5. \\section{Technical Skills}
  - Group technical skills, frameworks, tools, and languages in neat lines.

**CANDIDATE PROFILE (All values escaped for LaTeX):**
Name: ${escapeLatex(fullName)}
Email: ${escapeLatex(email)}
Phone: ${escapeLatex(phone)}
Linkedin: ${escapeLatex(linkedin)}
Github: ${escapeLatex(github)}

Current Summary: ${escapeLatex(summary)}
Paste of previous resume/profile content (free text):
${escapeLatex(resumeText)}

**FOR THE JOB BELOW, fully tailor the resume:**
Job Description: 
${escapeLatex(jobDescription)}

\\end{document}

Return ONLY valid LaTeX code starting at \\documentclass.
`;

    console.log("Calling Gemini API with prompt");
    
    // Call Gemini API with the prompt
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract LaTeX code from Gemini response
    let latexContent = "";
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      latexContent = data.candidates[0].content.parts[0].text;
      
      // Clean the LaTeX content to remove any non-LaTeX formatting that might have been included
      latexContent = latexContent.replace(/\*\*/g, ''); // Remove markdown bold
      latexContent = latexContent.replace(/\*/g, '');   // Remove markdown italic
      latexContent = latexContent.replace(/STAR technique/gi, ''); // Remove any STAR mentions
      latexContent = latexContent.replace(/Using the STAR format/gi, ''); // Additional STAR mention cleanup
      latexContent = latexContent.replace(/Situation, Task, Action, Result/gi, '');
      
      // Extract only the LaTeX portion if needed
      const extracted = extractLatex(latexContent);
      if (extracted) {
        latexContent = extracted;
      } else if (!latexContent.trim().startsWith("\\documentclass")) {
        // Try to find just the document part if we can't find the whole latex document
        const match = latexContent.match(/\\begin\{document\}.*?\\end\{document\}/s);
        if (match) {
          latexContent = LATEX_TEMPLATE + '\n' + match[0];
        }
      }
    } else {
      console.error("Unexpected response format:", JSON.stringify(data));
      throw new Error("Unexpected response format from Gemini API");
    }

    console.log("LaTeX resume generated successfully");
    
    // Return the generated LaTeX with profile data
    return new Response(
      JSON.stringify({ 
        resumeLatex: latexContent,
        profile: userProfile
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
    
  } catch (error) {
    console.error("Error in generate-resume function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate resume" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
