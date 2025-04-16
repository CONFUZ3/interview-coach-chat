
import { supabase } from "@/integrations/supabase/client";
import type { MessageType } from "@/components/Chat/ChatInterface";

export interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string[];
}

interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  graduationDate: string;
}

interface ExperienceEntry {
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

export async function createConversation() {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  
  if (!userId) {
    throw new Error("User must be logged in to create a conversation");
  }
  
  const result = await supabase
    .from('conversations')
    .insert([{ user_id: userId }])
    .select();

  if (result.error) {
    console.error("Error creating conversation:", result.error);
    throw result.error;
  }

  return result.data[0];
}

export async function saveMessage(conversationId: string, message: MessageType) {
  const result = await supabase
    .from('messages')
    .insert([{
      conversation_id: conversationId,
      content: message.content,
      type: message.type,
      format: message.format || 'text'
    }]);

  if (result.error) {
    console.error("Error saving message:", result.error);
    throw result.error;
  }
}

export async function saveResume(userId: string, conversationId: string, content: string, jobTitle?: string, company?: string) {
  const result = await supabase
    .from('resumes')
    .insert([{
      user_id: userId,
      conversation_id: conversationId,
      content,
      job_title: jobTitle,
      company
    }]);

  if (result.error) {
    console.error("Error saving resume:", result.error);
    throw result.error;
  }
}

export async function generateResumeWithAI(jobDescription: string): Promise<string> {
  const userProfile = await getUserProfile();
  
  if (!userProfile) {
    throw new Error("User profile is required to generate a resume");
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('generate-resume', {
      body: { jobDescription, userProfile },
    });

    if (error) {
      console.error("Error generating resume:", error);
      throw error;
    }

    if (!data || !data.resume) {
      throw new Error("Invalid response format from resume generation");
    }

    return data.resume;
  } catch (error) {
    console.error("Failed to generate resume:", error);
    throw new Error("Failed to generate resume. Please try again later.");
  }
}
