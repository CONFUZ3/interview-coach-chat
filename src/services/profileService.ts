
import { supabase } from "@/integrations/supabase/client";

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  resumeFile?: File | null;
  resumeText?: string;
}

export async function getUserProfile(): Promise<ProfileData | null> {
  try {
    // First check session
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return null;
    }
    
    const userId = sessionData.session.user.id;
    
    // Try to get profile from Supabase
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is the "no rows returned" error
      console.error("Error fetching profile:", error);
      // Fall back to localStorage
      return getProfileFromLocalStorage();
    }
    
    if (data) {
      return {
        fullName: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        resumeText: data.resume_text || ''
      };
    }
    
    // If no data in Supabase, try localStorage
    return getProfileFromLocalStorage();
  } catch (error) {
    console.error("Failed to fetch profile data:", error);
    return getProfileFromLocalStorage();
  }
}

function getProfileFromLocalStorage(): ProfileData | null {
  const savedProfile = localStorage.getItem("careerAI-profile");
  if (savedProfile) {
    try {
      return JSON.parse(savedProfile);
    } catch (error) {
      console.error("Failed to parse profile data from localStorage", error);
    }
  }
  return null;
}

export async function saveUserProfile(profileData: ProfileData): Promise<boolean> {
  try {
    // Save to localStorage as backup
    localStorage.setItem("careerAI-profile", JSON.stringify(profileData));
    
    // Get current user
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return false;
    }
    
    const userId = sessionData.session.user.id;
    
    // Save to Supabase
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        full_name: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        resume_text: profileData.resumeText,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error("Error saving profile to Supabase:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to save profile data:", error);
    return false;
  }
}
