
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

export async function generateResumeWithAI(jobDescription: string): Promise<{ resumeText: string, profileData: ProfileData }> {
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

    return {
      resumeText: data.resume,
      profileData: userProfile
    };
  } catch (error) {
    console.error("Failed to generate resume:", error);
    throw new Error("Failed to generate resume. Please try again later.");
  }
}

export function generatePDF(resumeContent: string, profileData: ProfileData): Blob {
  const doc = new jsPDF();
  
  // Set up document
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(profileData.fullName, 105, 20, { align: 'center' });
  
  // Contact information
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${profileData.email} | ${profileData.phone}`, 105, 28, { align: 'center' });
  
  // Add horizontal line
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(20, 32, 190, 32);
  
  // Parse and format the AI-generated resume
  const sections = parseResumeContent(resumeContent);
  let yPos = 40;
  
  // Render each section of the resume
  for (const section of sections) {
    // Section header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(section.title, 20, yPos);
    yPos += 4;
    
    // Underline the section header
    doc.line(20, yPos, 190, yPos);
    yPos += 8;
    
    // Section content
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    if (section.content.length > 0) {
      for (const line of section.content) {
        // Check if we need a new page
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        
        if (line.startsWith('* ')) {
          // This is a bullet point
          const bulletText = line.substring(2);
          const textLines = doc.splitTextToSize(bulletText, 165);
          
          doc.text('•', 22, yPos);
          doc.text(textLines, 26, yPos);
          yPos += 5 * textLines.length;
        } else if (line.startsWith('**')) {
          // This is a subheader (bold text)
          const boldText = line.replace(/\*\*/g, '');
          doc.setFont('helvetica', 'bold');
          doc.text(boldText, 20, yPos);
          doc.setFont('helvetica', 'normal');
          yPos += 5;
        } else {
          // Regular text
          const textLines = doc.splitTextToSize(line, 170);
          doc.text(textLines, 20, yPos);
          yPos += 5 * textLines.length;
        }
        
        // Add a small space between lines
        yPos += 1;
      }
    } else {
      doc.text("No information provided", 20, yPos);
      yPos += 5;
    }
    
    // Add space between sections
    yPos += 5;
  }
  
  return doc.output('blob');
}

// Helper function to parse the resume content into sections
function parseResumeContent(content: string): Array<{title: string, content: string[]}> {
  const sections: Array<{title: string, content: string[]}> = [];
  const lines = content.split('\n').filter(line => line.trim() !== '');
  
  let currentSection: {title: string, content: string[]} | null = null;
  
  for (const line of lines) {
    // Check if this is a section header (all caps or has a colon at the end)
    if (line.toUpperCase() === line && line.trim().length > 0 || 
        /^#+ /.test(line) || 
        /^[A-Z][A-Za-z\s]+:$/.test(line)) {
      
      // Save the previous section if it exists
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Create a new section
      const title = line.replace(/^#+\s+/, '').replace(/:$/, '');
      currentSection = { title, content: [] };
    } 
    // If not a section header and we have a current section, add to content
    else if (currentSection) {
      currentSection.content.push(line);
    }
    // If we haven't found a section header yet, create a default one
    else {
      currentSection = { title: "SUMMARY", content: [line] };
    }
  }
  
  // Add the last section
  if (currentSection) {
    sections.push(currentSection);
  }
  
  return sections;
}

// Helper function to convert markdown bullet points to proper bullet points
function processMarkdownContent(content: string): string {
  // Replace markdown bullet points with Unicode bullets
  return content.replace(/^\s*-\s+/gm, '• ');
}
