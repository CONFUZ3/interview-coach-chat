
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProfileData } from "./profileService";

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
