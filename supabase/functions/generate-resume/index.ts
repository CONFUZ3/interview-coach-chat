
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobDescription, userProfile } = await req.json();

    // Construct the prompt with user profile and job description
    const prompt = `
    As an expert resume writer, create a professional resume based on the following:

    JOB DESCRIPTION:
    ${jobDescription}

    USER PROFILE:
    ${JSON.stringify(userProfile, null, 2)}

    Create a resume that highlights the most relevant skills and experiences that match the job description.
    Format the resume with clear sections for:
    - Professional Summary
    - Work Experience
    - Education
    - Skills
    - Additional Qualifications (if applicable)

    Make sure to emphasize achievements with quantifiable results when possible.
    `;

    // Make API request to Gemini
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        },
      }),
    });

    const data = await response.json();
    console.log("Gemini API response received:", JSON.stringify(data, null, 2).substring(0, 200) + "...");

    let generatedResume = "";
    if (data.candidates && data.candidates[0]?.content?.parts?.length > 0) {
      generatedResume = data.candidates[0].content.parts[0].text;
    } else if (data.promptFeedback?.blockReason) {
      throw new Error(`Content blocked: ${data.promptFeedback.blockReason}`);
    } else {
      throw new Error("Failed to generate resume: Unexpected response format");
    }

    return new Response(JSON.stringify({ resume: generatedResume }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in generate-resume function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
