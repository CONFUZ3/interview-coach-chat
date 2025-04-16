
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

    const { jobDescription, userProfile } = await req.json();

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

    // Improved prompt for Gemini with clearer structure and LaTeX-like formatting
    const prompt = `
You are an expert resume writer. Create a professional, ATS-optimized resume for ${fullName} who is applying for this job:

JOB DESCRIPTION:
${jobDescription}

CANDIDATE INFORMATION:
Name: ${fullName}
Contact: ${email} | ${phone}

Education:
${educationText}

Work Experience:
${experienceText}

Skills:
${skillsText}

Format requirements:
1. Create a clear, concise, professional resume that's optimized for ATS systems
2. Focus only on relevant experience and skills that match the job description
3. Use the STAR format (Situation, Task, Action, Result) for achievements
4. For each experience, provide 2-4 bullet points with quantifiable achievements
5. Organize the resume in clear sections with proper formatting
6. Make every word count - the resume should be concise and impactful
7. Include a professional summary at the top that matches the candidate's experience with the job requirements

Return ONLY the formatted resume content with proper section headers (EDUCATION, EXPERIENCE, SKILLS, etc.). The content will be used to generate a PDF, so ensure proper formatting with clear section breaks.
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
          maxOutputTokens: 2048,
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Extract resume text from Gemini response (updated format)
    let resumeText = "";
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      resumeText = data.candidates[0].content.parts[0].text;
    } else {
      console.error("Unexpected response format:", JSON.stringify(data));
      throw new Error("Unexpected response format from Gemini API");
    }

    console.log("Resume generated successfully");
    
    // Return the generated resume with profile data for integrated PDF creation
    return new Response(
      JSON.stringify({ 
        resume: resumeText,
        profile: userProfile  // Include profile data in the response
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
