
// This is the Supabase Edge Function that generates resumes using the Gemini API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// The exact LaTeX template provided by the user
const LATEX_TEMPLATE = `\\documentclass[letterpaper,11pt]{article}

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

% Ensure that generate pdf is machine readable/ATS parsable
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

%-------------------------------------------
%%%%%%  RESUME STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%`;

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
    let summary = userProfile?.summary || "";
    let resumeText = previousResume || userProfile?.resumeText || "";

    // Combine links nicely
    let contactLine =
      [
        escapeLatex(phone),
        email ? `\\href{mailto:${escapeLatex(email)}}{\\underline{${escapeLatex(email)}}}` : "",
        linkedin ? `\\href{${escapeLatex(linkedin)}}{\\underline{${escapeLatex(linkedin.replace(/https?:\/\/(www\.)?/i, ''))}}}` : "",
        github ? `\\href{${escapeLatex(github)}}{\\underline{${escapeLatex(github.replace(/https?:\/\/(www\.)?/i, ''))}}}` : "",
      ]
        .filter(Boolean)
        .join(" $|$ ");

    // PROMPT for Gemini LLM with enhanced instructions for proper LaTeX:
    const prompt = `
You are an expert LaTeX formatter specializing in professional resumes. Generate a complete, fully-compilable LaTeX resume using only the template provided.

**Required Structure and Content:**
- Generate a proper LaTeX resume using this template:
${LATEX_TEMPLATE}

- The output MUST:
  - Begin with \\begin{document}
  - End with \\end{document}
  - Be 100% compilable LaTeX with NO comments or explanations
  - Include a "Career Summary" section at the beginning
  - Follow the exact formatting style from the template
  - Use the exact command structure shown in the template (resumeSubHeadingListStart, resumeItem, etc.)

**LaTeX Resume Structure:**

\\begin{document}

\\begin{center}
  \\textbf{\\Huge \\scshape ${escapeLatex(fullName)}} \\\\ \\vspace{1pt}
  \\small ${contactLine}
\\end{center}

1. \\section{Career Summary}
  - Add a concise 2-3 line professional summary tailored to the job description
  - Use \\resumeItemListStart, \\resumeItem{...}, and \\resumeItemListEnd

2. \\section{Education}
  - Format using \\resumeSubHeadingListStart and \\resumeSubheading command:
    * \\resumeSubheading{School/University}{Location}{Degree}{Date Range}

3. \\section{Experience}
  - For each job position:
    * \\resumeSubheading{Position}{Date Range}{Company}{Location}
    * \\resumeItemListStart
    * Use \\resumeItem{...} for each bullet point achievement 
    * \\resumeItemListEnd

4. \\section{Projects} (if applicable)
  - Format using \\resumeProjectHeading{Project Title | Technologies}{Date}
  - List details with \\resumeItemListStart, \\resumeItem, and \\resumeItemListEnd

5. \\section{Technical Skills}
  - Use the format in the template with itemized lists organized by category

**Candidate Profile:**
Name: ${escapeLatex(fullName)}
Email: ${escapeLatex(email)}
Phone: ${escapeLatex(phone)}
${linkedin ? `LinkedIn: ${escapeLatex(linkedin)}` : ''}
${github ? `GitHub: ${escapeLatex(github)}` : ''}

${summary ? `Current Summary: ${escapeLatex(summary)}` : ''}
${resumeText ? `Resume Content: ${escapeLatex(resumeText)}` : ''}

**Target Job:**
${escapeLatex(jobDescription)}

IMPORTANT: Return ONLY the compilable LaTeX code that matches EXACTLY the format in the template. Do not include any explanations or markdown formatting.
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
      
      // Clean the LaTeX content
      latexContent = latexContent.replace(/```latex|```/g, ''); // Remove markdown code blocks
      latexContent = latexContent.replace(/\*\*/g, ''); // Remove markdown bold
      latexContent = latexContent.replace(/\*/g, '');   // Remove markdown italic
      
      // Extract only the LaTeX portion
      const extracted = extractLatex(latexContent);
      if (extracted) {
        latexContent = extracted;
      } else if (!latexContent.trim().startsWith("\\documentclass")) {
        // Find document part
        const match = latexContent.match(/\\begin\{document\}.*?\\end\{document\}/s);
        if (match) {
          latexContent = LATEX_TEMPLATE + '\n' + match[0];
        }
      }
    }

    console.log("LaTeX resume generated successfully");
    
    // Return the generated LaTeX
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
