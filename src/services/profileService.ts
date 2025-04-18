
import { supabase } from "@/integrations/supabase/client";

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  resumeText?: string;
}

export async function getUserProfile(): Promise<ProfileData | null> {
  try {
    // First check session
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return null;
    }
    
    // Try to get profile from Supabase
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', sessionData.session.user.id)
      .single();
    
    if (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
    
    if (data) {
      return {
        fullName: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        resumeText: data.resume_text || ''
      };
    }
    
    return null;
  } catch (error) {
    console.error("Failed to fetch profile data:", error);
    return null;
  }
}

export async function saveUserProfile(profileData: ProfileData): Promise<boolean> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return false;
    }
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: sessionData.session.user.id,
        full_name: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        resume_text: profileData.resumeText,
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error("Error saving profile:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to save profile data:", error);
    return false;
  }
}
