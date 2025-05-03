
import { supabase } from "@/integrations/supabase/client";
import { getUserProfile, ProfileData } from "./profileService";

export async function generateResumeWithAI(jobDescription: string, previousResume?: string): Promise<{ resumeText: string, resumeLatex: string, profileData: ProfileData }> {
  try {
    // Get user profile data
    const userProfile = await getUserProfile();
    
    if (!userProfile) {
      throw new Error("User profile is required to generate a resume");
    }
    
    // Get the current session to include authentication token
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Error getting session:", sessionError);
      throw new Error("Authentication error");
    }
    
    if (!sessionData.session) {
      throw new Error("Authentication required to generate resume");
    }

    console.log("Calling Supabase function with job description and profile data");
    console.log("Previous resume provided:", !!previousResume);
    
    // Use the user's profile resume text if available and no specific resume is provided
    const resumeToUse = previousResume || userProfile.resumeText || null;
    
    // Pass the previousResume to the generate-resume function if available
    const { data, error } = await supabase.functions.invoke('generate-resume', {
      body: { 
        jobDescription, 
        userProfile, 
        previousResume: resumeToUse
      },
    });

    if (error) {
      console.error("Error generating resume:", error);
      throw error;
    }

    if (!data) {
      throw new Error("No response received from resume generation service");
    }
    
    // Extract the plain text version from LaTeX for display
    let plainTextResume = "";
    if (data.resumeLatex) {
      // Improved LaTeX to plain text conversion for better display
      plainTextResume = convertLatexToPlainText(data.resumeLatex);
    }
    
    // Return the response data
    return {
      resumeText: plainTextResume || data.resume || "",
      resumeLatex: data.resumeLatex || "",
      profileData: userProfile
    };
  } catch (error) {
    console.error("Failed to generate resume:", error);
    throw new Error("Failed to generate resume. Please try again later.");
  }
}

// Helper function to convert LaTeX to plain text
function convertLatexToPlainText(latexCode: string): string {
  try {
    let text = latexCode;
    
    // Extract content between \begin{document} and \end{document}
    const documentMatch = text.match(/\\begin\{document\}([\s\S]*?)\\end\{document\}/);
    if (documentMatch) {
      text = documentMatch[1];
    }
    
    // Process section headings
    text = text.replace(/\\section\{([^}]+)\}/g, "\n\n$1\n");
    
    // Process center environment
    text = text.replace(/\\begin\{center\}([\s\S]*?)\\end\{center\}/g, "$1");
    
    // Process resume items
    text = text.replace(/\\resumeItem\{([^}]+)\}/g, "• $1\n");
    
    // Process resume subheadings
    text = text.replace(/\\resumeSubheading\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}\{([^}]+)\}/g, 
      "$1 - $3\n$2 - $4\n");
    
    // Process resume project headings
    text = text.replace(/\\resumeProjectHeading\{([^}]+)\}\{([^}]+)\}/g, "$1 ($2)\n");
    
    // Remove LaTeX environments
    text = text.replace(/\\begin\{[^}]+\}|\\end\{[^}]+\}/g, "");
    
    // Remove LaTeX commands for formatting
    text = text.replace(/\\textbf\{([^}]+)\}/g, "$1");
    text = text.replace(/\\textit\{([^}]+)\}/g, "$1");
    text = text.replace(/\\underline\{([^}]+)\}/g, "$1");
    text = text.replace(/\\emph\{([^}]+)\}/g, "$1");
    text = text.replace(/\\scshape\s/g, "");
    text = text.replace(/\\Huge\s/g, "");
    text = text.replace(/\\small\s/g, "");
    
    // Handle line breaks and spacing
    text = text.replace(/\\\\/g, "\n");
    text = text.replace(/\\vspace\{[^}]+\}/g, "");
    
    // Clean up links
    text = text.replace(/\\href\{([^}]+)\}\{\\underline\{([^}]+)\}\}/g, "$2 ($1)");
    
    // Remove other LaTeX commands
    text = text.replace(/\\\w+(\{[^}]*\})*/g, "");
    
    // Clean up remaining LaTeX artifacts
    text = text.replace(/\{|\}/g, "");
    text = text.replace(/\$\|\$/g, " | ");
    
    // Fix spacing issues
    text = text.replace(/\n\s*\n\s*\n/g, "\n\n");
    text = text.replace(/[ \t]+/g, " ");
    
    return text.trim();
  } catch (error) {
    console.error("Error converting LaTeX to plain text:", error);
    return "Error processing resume content";
  }
}
