
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

    if (!userProfile || !userProfile.fullName) {
      return new Response(
        JSON.stringify({ error: "User profile is incomplete" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Format user profile for the prompt
    const { fullName, email, phone, education, experience, skills } = userProfile;
    
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

    // Improved LaTeX-focused prompt for Gemini based on the Python template
    const prompt = `
You are an expert LaTeX formatter specializing in professional resumes. Your job is to transform the provided 
personal information and job description into a structured, well-formatted LaTeX resume.

### Formatting Rules:
1. Output must be 100% valid LaTeX code. No explanations, comments, or additional text.
2. Ensure correct syntax and escaping. Escape any LaTeX special characters in user data.
3. The output must be directly compilable.
4. Use the moderncv package with classic style for formatting.

### Resume Bullet Points:
• Each bullet point must reflect a specific achievement or contribution.
• Make each point unique, impactful, and measurable.
• Use strong action verbs and quantify results where possible (e.g., 'Boosted efficiency by 30%').
• NEVER mention "STAR technique" anywhere in the output.

### Good Examples of Bullet Points:
- "Led a team of 5 engineers to develop a machine learning model, reducing data processing time by 40%."
- "Revamped customer support system, decreasing resolution time from 48 to 12 hours."

### Bad Examples to Avoid:
- "Worked on various machine learning projects."
- "Helped improve company performance."

### CANDIDATE INFORMATION:
Name: ${fullName}
Contact: ${email} | ${phone}

Education:
${educationText}

Work Experience:
${experienceText}

Skills:
${skillsText}

### JOB DESCRIPTION:
${jobDescription}

${previousResume ? `### PREVIOUS RESUME CONTENT (use this as reference):\n${previousResume}` : ''}

Create a complete, compilable LaTeX document using the moderncv package that contains only LaTeX code.
Return ONLY valid LaTeX code starting with \\documentclass and ending with \\end{document}.
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
