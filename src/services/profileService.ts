
import { supabase } from "@/integrations/supabase/client";

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string[];
}

export interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  graduationDate: string;
}

export interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

export async function getUserProfile(): Promise<ProfileData | null> {
  // Try to get profile from localStorage first
  const savedProfile = localStorage.getItem("careerAI-profile");
  if (savedProfile) {
    try {
      return JSON.parse(savedProfile);
    } catch (error) {
      console.error("Failed to parse profile data", error);
    }
  }
  return null;
}
