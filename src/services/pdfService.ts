
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import type { ProfileData } from "./profileService";

export async function generatePDF(resumeContent: string, profileData: ProfileData, isLatex: boolean = false): Promise<Blob> {
  try {
    // For all resumes, we'll use our basic PDF generator
    // The LaTeX content will be formatted more nicely than plain text
    return generateBasicPDF(resumeContent, profileData, isLatex);
  } catch (error) {
    console.error("Error generating PDF:", error);
    return generateBasicPDF(resumeContent, profileData, false);
  }
}

function generateBasicPDF(resumeContent: string, profileData: ProfileData, isLatex: boolean = false): Blob {
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
    
    // Clean up any LaTeX markup or non-printable characters
    let cleanedContent = resumeContent;
    
    if (isLatex) {
      // Use a more reliable function to extract content from LaTeX
      cleanedContent = cleanLaTeXContent(resumeContent);
    } else {
      // Just remove some basic markdown
      cleanedContent = resumeContent
        .replace(/\*\*/g, '') // Remove bold markdown
        .replace(/\*/g, '')   // Remove italic markdown
        .replace(/STAR technique/gi, '') // Remove STAR mentions
        .replace(/Using the STAR format/gi, ''); // Additional STAR mention cleanup
    }
    
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

// Helper function to extract just the text content from LaTeX
function cleanLaTeXContent(latexCode: string): string {
  if (!latexCode) return "";
  
  try {
    // Basic initial cleanup
    let content = latexCode
      .replace(/\\textbf\{([^}]+)\}/g, "$1") // Remove \textbf
      .replace(/\\textit\{([^}]+)\}/g, "$1") // Remove \textit
      .replace(/\\\\+/g, "\n") // Replace \\ with newlines
      .replace(/\\begin\{document\}([\s\S]*?)\\end\{document\}/g, "$1") // Extract content between begin/end document
      .replace(/\\section\{([^}]+)\}/g, "\n\n$1\n") // Sections to plain text
      .replace(/\\subsection\{([^}]+)\}/g, "\n$1\n") // Subsections to plain text
      .replace(/\\begin\{itemize\}([\s\S]*?)\\end\{itemize\}/g, "$1") // Remove itemize environment
      .replace(/\\begin\{enumerate\}([\s\S]*?)\\end\{enumerate\}/g, "$1") // Remove enumerate environment
      .replace(/\\item\s*/g, "\n• ") // Item to bullet points
      .replace(/\\documentclass.*?\{.*?\}/g, "") // Remove document class
      .replace(/\\usepackage.*?\{.*?\}/g, "") // Remove packages
      .replace(/\\maketitle/g, "") // Remove title command
      .replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, "$1") // Remove center environment
      .replace(/\\href\{([^}]+)\}\{([^}]+)\}/g, "$2 ($1)") // Convert hyperlinks
      .replace(/\{|\}/g, "") // Remove any remaining braces
      .replace(/\\\w+(\[.*?\])?(\{.*?\})?/g, "") // Remove other LaTeX commands
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Normalize spacing
      .trim();
    
    // Additional cleaning
    content = content
      .replace(/\n +/g, "\n") // Remove leading spaces after newlines
      .replace(/\\documentclass[^]*?\\begin\{document\}/s, "") // Remove preamble
      .replace(/\\end\{document\}[^]*/s, "") // Remove anything after \end{document}
      .trim();

    return content || "Error processing LaTeX content";
  } catch (error) {
    console.error("Error cleaning LaTeX content:", error);
    return "Error processing LaTeX content";
  }
}
