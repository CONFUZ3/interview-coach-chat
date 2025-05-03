
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
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Session error:", sessionError);
      return null;
    }
    
    if (!sessionData.session?.user) {
      console.log("No active session found");
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
      console.log("Profile data retrieved successfully:", data);
      return {
        fullName: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        resumeText: data.resume_text || ''
      };
    }
    
    console.log("No profile data found for user");
    return null;
  } catch (error) {
    console.error("Failed to fetch profile data:", error);
    return null;
  }
}

export async function saveUserProfile(profileData: ProfileData): Promise<boolean> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Session error:", sessionError);
      return false;
    }
    
    if (!sessionData.session?.user) {
      console.error("No active session found");
      return false;
    }
    
    console.log("Saving profile data:", profileData);
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: sessionData.session.user.id,
        full_name: profileData.fullName,
        email: profileData.email,
        phone: profileData.phone,
        resume_text: profileData.resumeText,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });
    
    if (error) {
      console.error("Error saving profile:", error);
      return false;
    }
    
    console.log("Profile saved successfully");
    return true;
  } catch (error) {
    console.error("Failed to save profile data:", error);
    return false;
  }
}

export async function saveResume(resumeContent: string, jobTitle?: string, company?: string): Promise<boolean> {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session?.user) {
      console.error("Session error or no user:", sessionError);
      return false;
    }
    
    const { error } = await supabase
      .from('resumes')
      .insert({
        user_id: sessionData.session.user.id,
        content: resumeContent,
        job_title: jobTitle || null,
        company: company || null
      });
    
    if (error) {
      console.error("Error saving resume:", error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to save resume:", error);
    return false;
  }
}

export async function getUserResumes(): Promise<any[] | null> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('resumes')
      .select('*')
      .eq('user_id', sessionData.session.user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching resumes:", error);
      return null;
    }
    
    return data || [];
  } catch (error) {
    console.error("Failed to fetch resume data:", error);
    return null;
  }
}
