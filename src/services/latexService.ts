
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// This function uses a third-party service to compile LaTeX to PDF
export async function compileLatexToPDF(latexCode: string): Promise<Blob> {
  try {
    // First method: Try to use an online LaTeX compilation service
    try {
      // We'll try a fetch to a LaTeX compilation service
      const response = await fetch("https://latexonline.cc/compile", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `code=${encodeURIComponent(latexCode)}`,
        signal: AbortSignal.timeout(15000), // 15 seconds timeout
      });

      if (response.ok) {
        return await response.blob();
      }
    } catch (serviceError) {
      console.warn("LaTeX online service failed, trying fallback method", serviceError);
    }

    // Fallback: Basic PDF rendering with LaTeX-like formatting
    return generateBasicPDF(latexCode);
  } catch (error) {
    console.error("Error compiling LaTeX:", error);
    return generateBasicPDF(latexCode);
  }
}

// Fallback function that creates a basic PDF from LaTeX code
function generateBasicPDF(latexCode: string): Blob {
  const doc = new jsPDF();
  
  // Extract the content from the LaTeX code
  const content = extractContentFromLatex(latexCode);
  const parsedContent = parseLatexContent(latexCode);
  
  if (parsedContent.name) {
    // Use the parsed content for better formatting
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(parsedContent.name, 105, 20, { align: "center" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    if (parsedContent.contact) {
      doc.text(parsedContent.contact, 105, 30, { align: "center" });
    }
    
    let yPosition = 40;
    
    // Add sections
    for (const section of parsedContent.sections) {
      yPosition += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text(section.title, 20, yPosition);
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(20, yPosition + 2, 190, yPosition + 2);
      
      yPosition += 10;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      
      for (const item of section.items) {
        // Handle line breaks
        const itemLines = doc.splitTextToSize(item, 170);
        for (const line of itemLines) {
          doc.text(line, 20, yPosition);
          yPosition += 6;
          
          // Check if we need a new page
          if (yPosition > 280) {
            doc.addPage();
            yPosition = 20;
          }
        }
        
        // Add some space after each item
        yPosition += 2;
      }
    }
  } else {
    // Fallback to basic extraction if parsing fails
    doc.text("Resume", 105, 15, { align: "center" });
    doc.setFontSize(12);
    
    const textLines = content.split("\n").filter(line => line.trim() !== "");
    let y = 25;
    
    textLines.forEach(line => {
      if (line.startsWith("\\section") || line.startsWith("\\subsection")) {
        y += 5;
        doc.setFont("helvetica", "bold");
        const sectionName = line.match(/\{([^}]+)\}/)?.[1] || "";
        doc.text(sectionName, 20, y);
        doc.setFont("helvetica", "normal");
        y += 5;
      } else {
        const processedLine = line.replace(/\\textbf\{([^}]+)\}/g, "$1")
                               .replace(/\\textit\{([^}]+)\}/g, "$1")
                               .replace(/\\\\/, "")
                               .replace(/\\item/, "•")
                               .replace(/\{|\}/g, "");
        
        if (processedLine.trim() !== "") {
          doc.text(processedLine, 20, y);
          y += 5;
        }
      }
      
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
    });
  }
  
  return doc.output("blob");
}

// Helper function to extract content from LaTeX code
function extractContentFromLatex(latexCode: string): string {
  // Simple extraction - in a real implementation, this would be more sophisticated
  const documentMatch = latexCode.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
  if (documentMatch && documentMatch[1]) {
    return documentMatch[1];
  }
  return latexCode;
}

// More sophisticated parsing of LaTeX for better PDF generation
function parseLatexContent(latexCode: string): {
  name?: string;
  contact?: string;
  sections: { title: string; items: string[] }[];
} {
  const result = {
    sections: [] as { title: string; items: string[] }[]
  };
  
  // Extract name (usually in \textbf{\Huge \scshape ...} or similar)
  const nameMatch = latexCode.match(/\\textbf\{\\Huge[^{]*\{([^}]+)\}\}/);
  if (nameMatch) {
    result.name = nameMatch[1];
  } else {
    // Alternative pattern in moderncv
    const cvNameMatch = latexCode.match(/\\name\{([^}]+)\}/);
    if (cvNameMatch) {
      result.name = cvNameMatch[1];
    }
  }
  
  // Extract contact info
  const contactMatches = latexCode.match(/\\email\{([^}]+)\}|\\phone\{([^}]+)\}/g);
  if (contactMatches) {
    const contactParts = contactMatches.map(match => {
      const content = match.match(/\{([^}]+)\}/);
      return content ? content[1] : "";
    }).filter(Boolean);
    result.contact = contactParts.join(" | ");
  }
  
  // Extract sections
  const sectionMatches = latexCode.match(/\\section\{([^}]+)\}([\s\S]*?)(?=\\section\{|\\end\{document\})/g);
  if (sectionMatches) {
    sectionMatches.forEach(sectionContent => {
      const titleMatch = sectionContent.match(/\\section\{([^}]+)\}/);
      if (titleMatch) {
        const title = titleMatch[1];
        const content = sectionContent.replace(/\\section\{[^}]+\}/, "").trim();
        
        // Extract items from this section
        const items: string[] = [];
        
        // Look for items
        const itemMatches = content.match(/\\item[^\\]*(?:\\[^item][^\\]*)*|\\cventry\{[^}]*\}\{[^}]*\}\{[^}]*\}\{[^}]*\}\{[^}]*\}\{[^}]*\}/g);
        if (itemMatches) {
          itemMatches.forEach(item => {
            // Clean up LaTeX commands
            let cleanItem = item.replace(/\\item/g, "")
                              .replace(/\\textbf\{([^}]+)\}/g, "$1")
                              .replace(/\\textit\{([^}]+)\}/g, "$1")
                              .replace(/\\\\/g, " ")
                              .replace(/\{|\}/g, "")
                              .trim();
            
            if (cleanItem) {
              items.push(cleanItem);
            }
          });
        } else if (content.trim()) {
          // If no items found but section has content, add it as plain text
          items.push(content.replace(/\\textbf\{([^}]+)\}/g, "$1")
                           .replace(/\\textit\{([^}]+)\}/g, "$1")
                           .replace(/\\\\/g, " ")
                           .replace(/\{|\}/g, "")
                           .trim());
        }
        
        result.sections.push({ title, items });
      }
    });
  }
  
  return result;
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
