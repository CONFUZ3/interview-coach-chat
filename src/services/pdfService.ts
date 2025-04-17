
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import type { ProfileData } from "./profileService";
import { compileLatexToPDF } from "./latexService";

export async function generatePDF(resumeContent: string, profileData: ProfileData, isLatex: boolean = false): Promise<Blob> {
  if (isLatex) {
    try {
      return await compileLatexToPDF(resumeContent);
    } catch (error) {
      console.error("Error compiling LaTeX:", error);
      // Fall back to basic PDF if LaTeX compilation fails
      return generateBasicPDF(resumeContent, profileData);
    }
  } else {
    return generateBasicPDF(resumeContent, profileData);
  }
}

function generateBasicPDF(resumeContent: string, profileData: ProfileData): Blob {
  const doc = new jsPDF();
  
  // Header with name and contact info
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(profileData.fullName, 105, 20, { align: "center" });
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const contactInfo = `${profileData.email} | ${profileData.phone}`;
  doc.text(contactInfo, 105, 28, { align: "center" });
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(20, 32, 190, 32);
  
  // Resume content
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  
  const splitContent = doc.splitTextToSize(resumeContent, 170);
  doc.text(splitContent, 20, 40);
  
  return doc.output("blob");
}
