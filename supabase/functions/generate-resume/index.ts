
// This is the Supabase Edge Function that generates resumes using the Gemini API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// LaTeX template based on the provided Python code
const LATEX_TEMPLATE = `
\\documentclass[a4paper,12pt]{article}
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
\\usepackage[left=0.5in,top=0.6in,right=0.5in,bottom=0.6in]{geometry}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Ensure enough space at the bottom
\\setlength{\\footskip}{4.5pt}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{{#1 \\vspace{-2pt}}}
}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}[leftmargin=0.15in, itemsep=0pt]}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}}
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

    // Format basic user information - allow using just uploaded resume instead of full profile
    let fullName = userProfile?.fullName || "Your Name";
    let email = userProfile?.email || "email@example.com";
    let phone = userProfile?.phone || "(123) 456-7890";
    
    // Set up profile text from the previous resume or minimal profile info
    let profileText = previousResume || "Minimal profile information provided";
    
    // Create a conversational prompt for better resume generation, inspired by the Python code you provided
    const prompt = `
You are an expert LaTeX formatter specializing in professional resumes. Your job is to transform the provided 
personal information and job description into a structured, well-formatted LaTeX resume.

### Formatting Rules:
1. Output must be 100% valid LaTeX code. No explanations, comments, or additional text.
2. Ensure correct syntax and escaping. Escape any LaTeX special characters in user data.
3. The output must be directly compilable.
4. Use the article class with the resumeItem and resumeSubheading commands provided in the template.
5. Follow the provided template EXACTLY - do NOT substitute with moderncv or any other package.

### Resume Bullet Points (STAR Format):
• Use the STAR (Situation, Task, Action, Result) technique to write human-like bullet points.
• Each bullet point must reflect a specific achievement or contribution.
• Make each point unique, impactful, and measurable.
• Use strong action verbs and quantify results where possible (e.g., 'Boosted efficiency by 30%').
• NEVER mention "STAR technique" anywhere in the output.

### TEMPLATE TO USE (DO NOT MODIFY THE TEMPLATE STRUCTURE):
${LATEX_TEMPLATE}

### CANDIDATE INFORMATION:
Name: ${escapeLatex(fullName)}
Contact: ${escapeLatex(email)} | ${escapeLatex(phone)}

${escapeLatex(profileText)}

### JOB DESCRIPTION:
${escapeLatex(jobDescription)}

Create a complete, compilable LaTeX document using the provided template above. The document should start with the template, include a proper \\begin{document} after the template, and end with \\end{document}.
Return ONLY valid LaTeX code.

The basic structure of the resume should be:
1. Name and contact at the top (centered)
2. Professional summary or objective
3. Work experience section with bullet points
4. Education section
5. Skills section

Structure the resume using article class following this pattern:

\\begin{document}

%----------HEADING----------
\\begin{center}
    \\textbf{\\Huge \\scshape ${escapeLatex(fullName)}} \\\\ \\vspace{1pt}
    \\small ${escapeLatex(email)}  $\\cdot$
    \\small ${escapeLatex(phone)}
    \\linebreak
\\end{center}

%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeItemListStart
    \\resumeSubheading
      {Job Title}{Date}
      {Company}{Location}
      \\resumeItemListStart
        \\resumeItem{Achievement with metrics}
        \\resumeItem{Another achievement with metrics}
      \\resumeItemListEnd
  \\resumeItemListEnd

%-----------EDUCATION-----------
\\section{Education}
  \\resumeItemListStart
    \\resumeSubheading
      {University Name}{Location}
      {Degree}{Date}
  \\resumeItemListEnd

%-----------SKILLS-----------
\\section{Skills}
 \\resumeItemListStart
    \\resumeItem{Skill1, Skill2, Skill3}
 \\resumeItemListEnd

\\end{document}
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
