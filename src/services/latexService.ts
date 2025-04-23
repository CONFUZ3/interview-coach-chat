
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as latexjs from "latex.js";

// This function uses latex.js to properly compile LaTeX to PDF
export async function compileLatexToPDF(latexCode: string): Promise<Blob> {
  try {
    // First method: Try to use latex.js for proper LaTeX compilation
    try {
      const generator = new latexjs.HtmlGenerator({ hyphenate: false });
      const document = latexjs.parse(latexCode, { generator: generator });
      
      // Convert the HTML representation to PDF using jsPDF
      const doc = new jsPDF();
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();
      
      // Create a temporary element to render the HTML
      const tempElement = document.domFragment();
      const tempContainer = document.createElement('div');
      tempContainer.appendChild(tempElement);
      tempContainer.style.width = width + 'pt';
      document.body.appendChild(tempContainer);
      
      // Capture the rendered LaTeX as PDF
      doc.html(tempContainer, {
        callback: function(pdf) {
          // Clean up
          document.body.removeChild(tempContainer);
        },
        x: 0,
        y: 0,
        width: width,
        windowWidth: width
      });
      
      return doc.output("blob");
    } catch (latexError) {
      console.warn("LaTeX.js compilation failed, trying online service", latexError);
      
      // Second method: Try to use an online LaTeX compilation service
      try {
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
    }

    // Fallback: Enhanced PDF rendering with better LaTeX-like formatting
    return generateEnhancedPDF(latexCode);
  } catch (error) {
    console.error("Error compiling LaTeX:", error);
    return generateBasicPDF(latexCode);
  }
}

// Enhanced fallback function that creates a better LaTeX-styled PDF
function generateEnhancedPDF(latexCode: string): Blob {
  const doc = new jsPDF();
  
  // Parse the LaTeX content more thoroughly
  const parsedContent = parseLatexContent(latexCode);
  
  // Check if we successfully parsed content
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
    return doc.output("blob");
  } else {
    // Fallback to basic extraction if parsing fails
    return generateBasicPDF(latexCode);
  }
}

// Basic fallback function if all else fails
function generateBasicPDF(latexCode: string): Blob {
  const doc = new jsPDF();
  
  // Extract the content from the LaTeX code
  const content = extractContentFromLatex(latexCode);
  
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
      const processedLine = line
        .replace(/\\textbf\{([^}]+)\}/g, "$1")
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
    name: undefined as string | undefined,
    contact: undefined as string | undefined,
    sections: [] as { title: string; items: string[] }[]
  };

  // Extract name from article class format
  const articleNameMatch = latexCode.match(/\\textbf\{\\Huge\s*\\scshape\s*([^}]+)\s*\}/);
  if (articleNameMatch) {
    result.name = articleNameMatch[1];
  } else {
    // Try alternative patterns
    const nameMatch = latexCode.match(/\\name\{([^}]+)\}\{([^}]+)\}/);
    if (nameMatch) {
      result.name = `${nameMatch[1]} ${nameMatch[2]}`;
    } else {
      // Another format
      const simpleName = latexCode.match(/\\begin\{center\}[\s\S]*?\\textbf\{\\Huge\s*\\scshape\s*([^}]+)\s*\}/);
      if (simpleName) {
        result.name = simpleName[1];
      }
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
  } else {
    // Look for contact info in center environment
    const centerMatch = latexCode.match(/\\begin\{center\}([\s\S]*?)\\end\{center\}/);
    if (centerMatch) {
      const centerText = centerMatch[1];
      const contactLine = centerText.match(/\\small ([^\\]+)/);
      if (contactLine) {
        result.contact = contactLine[1].replace(/\$\|\$/g, " | ").trim();
      }
    }
  }
  
  // Extract sections from article class format
  const sectionMatches = latexCode.match(/\\section\{([^}]+)\}([\s\S]*?)(?=\\section\{|\\end\{document\})/g);
  if (sectionMatches) {
    sectionMatches.forEach(sectionContent => {
      const titleMatch = sectionContent.match(/\\section\{([^}]+)\}/);
      if (titleMatch) {
        const title = titleMatch[1];
        const content = sectionContent.replace(/\\section\{[^}]+\}/, "").trim();
        
        // Extract items from this section
        const items: string[] = [];
        
        // Look for different item types (resumeItem, resumeSubheading, etc.)
        const itemPatterns = [
          /\\resumeItem\{([^}]*)\}/g,
          /\\resumeSubheading\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g,
          /\\cventry\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g,
          /\\item\s+(.*?)(?=\\item|\\end\{itemize\}|$)/gs
        ];
        
        let foundItems = false;
        
        for (const pattern of itemPatterns) {
          const matches = content.matchAll(pattern);
          for (const match of matches) {
            foundItems = true;
            if (pattern.source.includes("resumeItem")) {
              items.push(match[1]);
            } else if (pattern.source.includes("resumeSubheading")) {
              items.push(`${match[1]} - ${match[3]} (${match[4]})`);
            } else if (pattern.source.includes("cventry")) {
              items.push(`${match[2]} at ${match[3]}, ${match[1]}`);
              if (match[6] && match[6] !== "{}") {
                items.push(match[6]);
              }
            } else if (pattern.source.includes("item")) {
              items.push(match[1].trim());
            }
          }
        }
        
        // If no structured items found but there's content, add it as plain text
        if (!foundItems && content.trim()) {
          items.push(content
            .replace(/\\begin\{itemize\}|\\\end\{itemize\}|\\\begin\{enumerate\}|\\\end\{enumerate\}/g, "")
            .replace(/\\resumeSubHeadingListStart|\\\resumeSubHeadingListEnd|\\\resumeItemListStart|\\\resumeItemListEnd/g, "")
            .trim());
        }
        
        // Clean up the items
        const cleanItems = items.map(item => 
          item.replace(/\\textbf\{([^}]+)\}/g, "$1")
              .replace(/\\textit\{([^}]+)\}/g, "$1")
              .replace(/\\\\/g, " ")
              .replace(/\{|\}/g, "")
              .trim()
        ).filter(item => item.length > 0);
        
        result.sections.push({ title, items: cleanItems });
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
