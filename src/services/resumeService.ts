
import { supabase } from "@/integrations/supabase/client";
import type { MessageType } from "@/components/Chat/ChatInterface";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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

export function generatePDF(resumeContent: string, profileData?: ProfileData): Blob {
  const doc = new jsPDF();
  const profile = profileData || {
    fullName: "Name not provided",
    email: "Email not provided",
    phone: "Phone not provided",
    education: [],
    experience: [],
    skills: []
  };
  
  // Set font size and add title
  doc.setFontSize(24);
  doc.text(profile.fullName, 105, 20, { align: 'center' });
  
  // Contact information
  doc.setFontSize(10);
  doc.text(`${profile.email} | ${profile.phone}`, 105, 30, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text("EDUCATION", 20, 45);
  doc.line(20, 47, 190, 47);
  
  let yPos = 55;
  
  // Add education details
  if (profile.education && profile.education.length > 0) {
    profile.education.forEach(edu => {
      doc.setFont('helvetica', 'bold');
      doc.text(edu.institution, 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(edu.graduationDate, 170, yPos, { align: 'right' });
      yPos += 6;
      doc.text(edu.degree, 20, yPos);
      yPos += 10;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text("No education information provided", 20, yPos);
    yPos += 10;
  }
  
  // Add experience section
  doc.setFont('helvetica', 'bold');
  doc.text("EXPERIENCE", 20, yPos);
  doc.line(20, yPos + 2, 190, yPos + 2);
  yPos += 10;
  
  // Add work experience
  if (profile.experience && profile.experience.length > 0) {
    profile.experience.forEach(exp => {
      doc.setFont('helvetica', 'bold');
      doc.text(exp.company, 20, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${exp.startDate} - ${exp.endDate}`, 170, yPos, { align: 'right' });
      yPos += 6;
      doc.setFont('helvetica', 'italic');
      doc.text(exp.position, 20, yPos);
      yPos += 6;
      
      // Format the description with proper text wrapping
      const descriptionLines = doc.splitTextToSize(exp.description, 170);
      doc.setFont('helvetica', 'normal');
      
      descriptionLines.forEach(line => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(line, 20, yPos);
        yPos += 6;
      });
      
      yPos += 5;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text("No work experience provided", 20, yPos);
    yPos += 10;
  }
  
  // Add skills section
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.text("SKILLS", 20, yPos);
  doc.line(20, yPos + 2, 190, yPos + 2);
  yPos += 10;
  
  // Add skills
  if (profile.skills && profile.skills.length > 0) {
    doc.setFont('helvetica', 'normal');
    const skillsText = profile.skills.join(", ");
    const skillsLines = doc.splitTextToSize(skillsText, 170);
    
    skillsLines.forEach(line => {
      doc.text(line, 20, yPos);
      yPos += 6;
    });
  } else {
    doc.setFont('helvetica', 'normal');
    doc.text("No skills provided", 20, yPos);
  }
  
  // Add the resume content as an additional page
  if (resumeContent) {
    doc.addPage();
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const contentLines = doc.splitTextToSize(resumeContent, 170);
    let contentYPos = 20;
    
    contentLines.forEach(line => {
      if (contentYPos > 270) {
        doc.addPage();
        contentYPos = 20;
      }
      doc.text(line, 20, contentYPos);
      contentYPos += 5;
    });
  }
  
  return doc.output('blob');
}

