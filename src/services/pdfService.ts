
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import type { ProfileData } from "./profileService";
import { compileLatexToPDF } from "./latexService";

export async function generatePDF(resumeContent: string, profileData: ProfileData, isLatex: boolean = false): Promise<Blob> {
  try {
    if (isLatex) {
      // If it's LaTeX content, use the LaTeX compiler
      console.log("Generating PDF from LaTeX content");
      return await compileLatexToPDF(resumeContent);
    } else {
      console.log("Generating basic PDF from text content");
      return generateBasicPDF(resumeContent, profileData);
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
    // Fall back to basic PDF if there's any error
    return generateBasicPDF(resumeContent, profileData);
  }
}

function generateBasicPDF(resumeContent: string, profileData: ProfileData): Blob {
  const doc = new jsPDF();
  
  try {
    // Header with name and contact info
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text(profileData.fullName || "Resume", 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    
    if (profileData.email || profileData.phone) {
      const contactInfo = `${profileData.email || ''} ${profileData.email && profileData.phone ? '|' : ''} ${profileData.phone || ''}`;
      doc.text(contactInfo, 105, 28, { align: "center" });
    }
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(20, 32, 190, 32);
    
    // Resume content - clean up any markup or non-printable characters
    const cleanedContent = resumeContent
      .replace(/\*\*/g, '') // Remove bold markdown
      .replace(/\*/g, '')   // Remove italic markdown
      .replace(/STAR technique/gi, '') // Remove STAR mentions
      .replace(/\\textbf\{([^}]+)\}/g, "$1") // Clean LaTeX formatting
      .replace(/\\textit\{([^}]+)\}/g, "$1")
      .replace(/Using the STAR format/gi, '') // Additional STAR mention cleanup
      .replace(/Situation, Task, Action, Result/gi, '')
      .replace(/Situation:/gi, '')
      .replace(/Task:/gi, '')
      .replace(/Action:/gi, '')
      .replace(/Result:/gi, '');
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    
    // Add the content
    const splitContent = doc.splitTextToSize(cleanedContent, 170);
    
    let yPosition = 40;
    const maxY = 280; // Max height before starting a new page
    
    // Process content line by line for better pagination
    for (let i = 0; i < splitContent.length; i++) {
      const line = splitContent[i];
      
      // Check if we need to start a new page
      if (yPosition > maxY) {
        doc.addPage();
        yPosition = 20;
      }
      
      // Check if this is a section heading (assume lines with few characters and all caps could be headings)
      if (line.length < 30 && line === line.toUpperCase() && line.trim() !== '') {
        doc.setFont("helvetica", "bold");
        yPosition += 5; // Add some space before section
        doc.text(line, 20, yPosition);
        doc.setFont("helvetica", "normal");
        yPosition += 5;
      } else {
        doc.text(line, 20, yPosition);
        yPosition += 6;
      }
    }
    
    return doc.output("blob");
  } catch (error) {
    console.error("Error in PDF generation:", error);
    
    // Super basic fallback if anything fails
    const doc = new jsPDF();
    doc.text("Resume content could not be properly formatted", 20, 20);
    doc.text("Please try again or use the LaTeX source option", 20, 30);
    return doc.output("blob");
  }
}
