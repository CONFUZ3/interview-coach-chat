
import { supabase } from "@/integrations/supabase/client";
import { getUserProfile } from "./profileService";
import type { ProfileData } from "./profileService";

export async function generateResumeWithAI(jobDescription: string, previousResume?: string): Promise<{ resumeText: string, resumeLatex: string, profileData: ProfileData }> {
  const userProfile = await getUserProfile();
  
  if (!userProfile) {
    throw new Error("User profile is required to generate a resume");
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-resume', {
      body: { jobDescription, userProfile, previousResume },
    });

    if (error) {
      console.error("Error generating resume:", error);
      throw error;
    }

    if (!data || (!data.resume && !data.resumeLatex)) {
      throw new Error("Invalid response format from resume generation");
    }

    return {
      resumeText: data.resume || data.resumeLatex,
      resumeLatex: data.resumeLatex || "",
      profileData: userProfile
    };
  } catch (error) {
    console.error("Failed to generate resume:", error);
    throw new Error("Failed to generate resume. Please try again later.");
  }
}
