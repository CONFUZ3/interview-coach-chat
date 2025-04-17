
import { jsPDF } from "jspdf";
import "jspdf-autotable";

// This function uses a third-party service to compile LaTeX to PDF
// For now, we're using an open API, but this could be replaced with a more robust solution
export async function compileLatexToPDF(latexCode: string): Promise<Blob> {
  try {
    // Attempt to use an external LaTeX compilation service
    // This is a placeholder - in production, you'd use a more reliable service
    const response = await fetch("https://latexonline.cc/compile", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `code=${encodeURIComponent(latexCode)}`,
    });

    if (response.ok) {
      return await response.blob();
    } else {
      console.warn("LaTeX compilation service failed, falling back to basic PDF");
      return generateBasicPDF(latexCode);
    }
  } catch (error) {
    console.error("Error compiling LaTeX:", error);
    // Fallback to basic PDF rendering if the service fails
    return generateBasicPDF(latexCode);
  }
}

// Fallback function that creates a basic PDF from LaTeX code
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
