
import { supabase } from "@/integrations/supabase/client";
import { getUserProfile, ProfileData } from "./profileService";

export async function generateResumeWithAI(jobDescription: string, previousResume?: string): Promise<{ resumeText: string, resumeLatex: string, profileData: ProfileData }> {
  try {
    // Get user profile data
    const userProfile = await getUserProfile();
    
    if (!userProfile) {
      throw new Error("User profile is required to generate a resume");
    }
    
    // Get the current session to include authentication token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      throw new Error("Authentication error");
    }
    
    if (!sessionData.session) {
      throw new Error("Authentication required to generate resume");
    }

    console.log("Calling Supabase function with job description and profile data");
    console.log("Previous resume provided:", !!previousResume);
    
    // Pass the previousResume to the generate-resume function if available
    const { data, error } = await supabase.functions.invoke('generate-resume', {
      body: { 
        jobDescription, 
        userProfile, 
        previousResume: previousResume || null
      },
    });

    if (error) {
      console.error("Error generating resume:", error);
      throw error;
    }

    if (!data) {
      throw new Error("No response received from resume generation service");
    }
    
    // Return the response data
    return {
      resumeText: data.resume || "",
      resumeLatex: data.resumeLatex || "",
      profileData: userProfile
    };
  } catch (error) {
    console.error("Failed to generate resume:", error);
    throw new Error("Failed to generate resume. Please try again later.");
  }
}
