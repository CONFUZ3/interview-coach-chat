
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
  const { data, error } = await supabase
    .from('conversations')
    .insert([{}])
    .select();

  if (error) {
    console.error("Error creating conversation:", error);
    throw error;
  }

  return data[0];
}

export async function saveMessage(conversationId: string, message: MessageType) {
  const { error } = await supabase
    .from('messages')
    .insert([{
      conversation_id: conversationId,
      content: message.content,
      type: message.type,
      format: message.format || 'text'
    }]);

  if (error) {
    console.error("Error saving message:", error);
    throw error;
  }
}

export async function saveResume(userId: string, conversationId: string, content: string, jobTitle?: string, company?: string) {
  const { error } = await supabase
    .from('resumes')
    .insert([{
      user_id: userId,
      conversation_id: conversationId,
      content,
      job_title: jobTitle,
      company
    }]);

  if (error) {
    console.error("Error saving resume:", error);
    throw error;
  }
}

export async function generateResumeWithAI(jobDescription: string): Promise<string> {
  const userProfile = await getUserProfile();
  
  const { data, error } = await supabase.functions.invoke('generate-resume', {
    body: { jobDescription, userProfile },
  });

  if (error) {
    console.error("Error generating resume:", error);
    throw error;
  }

  return data.resume;
}
