
import { jsPDF } from "jspdf";
import "jspdf-autotable";

/**
 * Improved LaTeX to PDF converter using PDF.js
 * This approach focuses on properly handling LaTeX tabular environments
 */
export async function compileLatexToPDF(latexCode: string): Promise<Blob> {
  try {
    // Create a new PDF document
    const doc = new jsPDF();
    const parsedContent = parseLatexContent(latexCode);
    
    // Set up the document with proper formatting
    doc.setFont("helvetica", "normal");
    
    // Add the name with larger font size
    if (parsedContent.name) {
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text(parsedContent.name, 105, 20, { align: "center" });
    }
    
    // Add contact information
    if (parsedContent.contact) {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(parsedContent.contact, 105, 30, { align: "center" });
    }
    
    let yPosition = 40;
    
    // Process all sections
    for (const section of parsedContent.sections) {
      // Add section header
      yPosition += 5;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(section.title, 20, yPosition);
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(20, yPosition + 2, 190, yPosition + 2);
      
      // Process all section items
      yPosition += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      
      for (const item of section.content) {
        if (item.type === "subheading") {
          // Handle subheadings (e.g., education/experience entries)
          doc.setFont("helvetica", "bold");
          doc.text(item.title, 20, yPosition);
          doc.setFont("helvetica", "normal");
          
          // Right-aligned date/location
          if (item.right) {
            doc.text(item.right, 190, yPosition, { align: "right" });
          }
          
          yPosition += 5;
          
          // Second line of subheading (institution/position)
          if (item.subtitle) {
            doc.setFont("helvetica", "italic");
            doc.text(item.subtitle, 20, yPosition);
            
            if (item.subtitleRight) {
              doc.text(item.subtitleRight, 190, yPosition, { align: "right" });
            }
            
            doc.setFont("helvetica", "normal");
            yPosition += 5;
          }
        } else if (item.type === "bullet") {
          // Handle bullet points
          doc.text("• " + item.text, 25, yPosition);
          yPosition += 5;
        } else {
          // Handle plain text
          doc.text(item.text, 20, yPosition);
          yPosition += 5;
        }
        
        // Check if we need a new page
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
      }
      
      yPosition += 5; // Space after section
    }
    
    return doc.output("blob");
  } catch (error) {
    console.error("Error compiling LaTeX:", error);
    return generateBasicPDF(latexCode);
  }
}

/**
 * Improved LaTeX parser that handles tabular environments correctly
 * Specifically fixes the [t]l@r issue by properly parsing tabular environments
 */
function parseLatexContent(latexCode: string): {
  name?: string;
  contact?: string;
  sections: { 
    title: string; 
    content: Array<{
      type: "subheading" | "bullet" | "text";
      title?: string;
      subtitle?: string;
      right?: string;
      subtitleRight?: string;
      text?: string;
    }>;
  }[];
} {
  const result = {
    name: undefined as string | undefined,
    contact: undefined as string | undefined,
    sections: [] as {
      title: string;
      content: Array<{
        type: "subheading" | "bullet" | "text";
        title?: string;
        subtitle?: string;
        right?: string;
        subtitleRight?: string;
        text?: string;
      }>;
    }[]
  };
  
  try {
    // Extract name from document
    const nameMatch = latexCode.match(/\\begin\{center\}\s*\\textbf\{\\Huge\s*\\scshape\s*([^}]+)\}\s*\\\\/);
    if (nameMatch) {
      result.name = nameMatch[1].trim();
    }
    
    // Extract contact information from the document
    const contactMatch = latexCode.match(/\\begin\{center\}[\s\S]*?\\small\s*(.*?)\\end\{center\}/);
    if (contactMatch) {
      // Clean up contact info by removing LaTeX commands
      let contactText = contactMatch[1]
        .replace(/\$\|\$/g, " | ")
        .replace(/\\href\{[^}]*\}\{\\underline\{([^}]+)\}\}/g, "$1")
        .replace(/\\href\{[^}]*\}\{([^}]+)\}/g, "$1")
        .trim();
      result.contact = contactText;
    }
    
    // Extract sections using a more robust pattern
    const sectionPattern = /\\section\{([^}]+)\}([\s\S]*?)(?=\\section\{|\\end\{document\})/g;
    let sectionMatch;
    
    while ((sectionMatch = sectionPattern.exec(latexCode)) !== null) {
      const sectionTitle = sectionMatch[1].trim();
      const sectionContent = sectionMatch[2].trim();
      const sectionData = {
        title: sectionTitle,
        content: [] as Array<{
          type: "subheading" | "bullet" | "text";
          title?: string;
          subtitle?: string;
          right?: string;
          subtitleRight?: string;
          text?: string;
        }>
      };
      
      // Process resumeSubheading entries - This specifically fixes the [t]l@r issue
      // by properly handling the tabular environment within resumeSubheading
      const subheadingPattern = /\\resumeSubheading\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g;
      let subheadingMatch;
      
      while ((subheadingMatch = subheadingPattern.exec(sectionContent)) !== null) {
        sectionData.content.push({
          type: "subheading",
          title: subheadingMatch[1].trim(),
          right: subheadingMatch[2].trim(),
          subtitle: subheadingMatch[3].trim(),
          subtitleRight: subheadingMatch[4].trim()
        });
      }
      
      // Process resumeProjectHeading entries
      const projectHeadingPattern = /\\resumeProjectHeading\{([^}]*)\}\{([^}]*)\}/g;
      let projectMatch;
      
      while ((projectMatch = projectHeadingPattern.exec(sectionContent)) !== null) {
        sectionData.content.push({
          type: "subheading",
          title: projectMatch[1].trim(),
          right: projectMatch[2].trim()
        });
      }
      
      // Process individual resume items (bullet points)
      const itemPattern = /\\resumeItem\{([^}]*)\}/g;
      let itemMatch;
      
      while ((itemMatch = itemPattern.exec(sectionContent)) !== null) {
        sectionData.content.push({
          type: "bullet",
          text: itemMatch[1].trim()
        });
      }
      
      // If no content was found with the specific extractors,
      // try a more general approach to get something useful
      if (sectionData.content.length === 0) {
        // For sections like "Technical Skills" that have custom formatting
        const lines = sectionContent
          .replace(/\\begin\{itemize\}.*?\\end\{itemize\}/gs, (match) => {
            // Extract text from itemize environment
            const itemMatches = match.match(/\\item\{([^}]*)\}/g);
            if (itemMatches) {
              return itemMatches.map(item => item.replace(/\\item\{([^}]*)\}/g, "$1")).join("\n");
            }
            return match;
          })
          .split(/\\\\|\\item/).filter(line => line.trim().length > 0);
        
        lines.forEach(line => {
          // Clean up any remaining LaTeX commands
          const cleanedText = line
            .replace(/\\textbf\{([^}]+)\}/g, "$1")
            .replace(/\\textit\{([^}]+)\}/g, "$1")
            .trim();
          
          if (cleanedText.length > 0) {
            sectionData.content.push({
              type: "text",
              text: cleanedText
            });
          }
        });
      }
      
      result.sections.push(sectionData);
    }
    
    return result;
  } catch (error) {
    console.error("Error parsing LaTeX:", error);
    // Return a minimal structure to avoid errors
    return {
      name: "Resume",
      contact: "",
      sections: [{
        title: "Content",
        content: [{
          type: "text",
          text: "Error parsing resume. Please try again."
        }]
      }]
    };
  }
}

// Fallback basic PDF generation if parsing fails
function generateBasicPDF(latexCode: string): Blob {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text("Resume", 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.text("The LaTeX resume could not be properly rendered.", 20, 40);
  doc.text("You can download the LaTeX source code instead.", 20, 50);
  
  return doc.output("blob");
}

// Function to download LaTeX source code
export function downloadLatexSource(latexCode: string, filename: string): void {
  const blob = new Blob([latexCode], { type: "application/x-latex" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
