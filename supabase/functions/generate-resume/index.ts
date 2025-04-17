
// This is the Supabase Edge Function that generates resumes using the Gemini API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    let fullName = "Your Name";
    let email = "email@example.com";
    let phone = "(123) 456-7890";
    let profileText = "Resume information will be extracted from your uploaded document";
    
    if (userProfile && userProfile.fullName) {
      fullName = userProfile.fullName;
      email = userProfile.email || email;
      phone = userProfile.phone || phone;
      
      // Format user profile if available
      if (userProfile.education || userProfile.experience || userProfile.skills) {
        const { education, experience, skills } = userProfile;
        
        const educationText = education && education.length > 0
          ? education.map(edu => `${edu.degree} from ${edu.institution}, ${edu.graduationDate}`).join("\n")
          : "No education information provided";
        
        const experienceText = experience && experience.length > 0
          ? experience.map(exp => 
            `${exp.position} at ${exp.company}, ${exp.startDate} to ${exp.endDate}\n${exp.description}`
          ).join("\n\n")
          : "No work experience provided";
        
        const skillsText = skills && skills.length > 0
          ? skills.join(", ")
          : "No skills provided";
        
        profileText = `
Education:
${educationText}

Work Experience:
${experienceText}

Skills:
${skillsText}`;
      }
    }

    // LaTeX template for article class (ATS-friendly)
    const latexTemplate = `
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
\\usepackage[scale=0.75]{geometry}
\\input{glyphtounicode}

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
`;

    // Improved LaTeX-focused prompt for Gemini
    const prompt = `
You are an expert LaTeX formatter specializing in professional resumes. Your job is to transform the provided 
personal information and job description into a structured, well-formatted LaTeX resume.

### Formatting Rules:
1. Output must be 100% valid LaTeX code. No explanations, comments, or additional text.
2. Ensure correct syntax and escaping. Escape any LaTeX special characters in user data.
3. The output must be directly compilable.
4. Use the article class with the resumeItem and resumeSubheading commands provided in the template.
5. Follow the provided template EXACTLY - do NOT substitute with moderncv or any other package.

### Resume Bullet Points:
• Each bullet point must reflect a specific achievement or contribution.
• Make each point unique, impactful, and measurable.
• Use strong action verbs and quantify results where possible (e.g., 'Boosted efficiency by 30%').
• NEVER mention "STAR technique" anywhere in the output.

### TEMPLATE TO USE (DO NOT MODIFY THE TEMPLATE STRUCTURE):
${latexTemplate}

### CANDIDATE INFORMATION:
Name: ${fullName}
Contact: ${email} | ${phone}

${profileText}

### JOB DESCRIPTION:
${jobDescription}

${previousResume ? `### PREVIOUS RESUME CONTENT (use this as reference):\n${previousResume}` : ''}

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
    \\textbf{\\Huge \\scshape Full Name} \\\\ \\vspace{1pt}
    \\small City, State $\\cdot$
    \\small Phone  $\\cdot$
    \\small Email
    \\linebreak
    \\small LinkedIn
\\end{center}

%-----------EXPERIENCE-----------
\\section{Experience}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Job Title}{Date}
      {Company}{Location}
      \\resumeItemListStart
        \\resumeItem{Achievement with metrics}
        \\resumeItem{Another achievement with metrics}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

%-----------EDUCATION-----------
\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {University Name}{Location}
      {Degree}{Date}
  \\resumeSubHeadingListEnd

%-----------SKILLS-----------
\\section{Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     Skill1 | Skill2 | Skill3
    }}
 \\end{itemize}

\\end{document}
`;

    console.log("Calling Gemini API with prompt");
    
    // Updated Gemini API endpoint and request format
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
      latexContent = latexContent.replace(/Situation:/gi, '');
      latexContent = latexContent.replace(/Task:/gi, '');
      latexContent = latexContent.replace(/Action:/gi, '');
      latexContent = latexContent.replace(/Result:/gi, '');
      
      // If the response doesn't start with \documentclass, extract only the LaTeX portion
      if (!latexContent.trim().startsWith("\\documentclass")) {
        const match = latexContent.match(/\\documentclass.*?\\end{document}/s);
        if (match) {
          latexContent = match[0];
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
