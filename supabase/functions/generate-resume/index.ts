
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

    // Construct prompt for Gemini
    const prompt = `
Generate a professional resume for ${fullName} (${email}, ${phone}) applying for the following job:

JOB DESCRIPTION:
${jobDescription}

CANDIDATE INFORMATION:
Education:
${educationText}

Work Experience:
${experienceText}

Skills:
${skillsText}

Please format the resume professionally with appropriate sections. Focus on highlighting the most relevant experience and skills for this specific job. The resume should be ATS-friendly and no longer than one page.

Format each experience using the STAR format (Situation, Task, Action, Result) to make achievements measurable and impactful.

For each work experience, provide 2-4 bullet points that highlight specific achievements rather than just job duties.

Make sure the content is well-structured so it can be easily formatted into a PDF document.
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
    
    // Return the generated resume
    return new Response(
      JSON.stringify({ resume: resumeText }),
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
