
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DownloadCloud, FileText, Code } from "lucide-react";
import ResumeUpload from "./ResumeUpload";
import { saveUserProfile, getUserProfile } from "@/services/profileService";
import { compileLatexToPDF, downloadLatexSource } from "@/services/latexService";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";

interface ResumeActionsProps {
  hasResume: boolean;
  isLatex: boolean;
  onDownloadPDF: () => void;
  onDownloadLatex?: () => void;
  onUploadResume: (resumeText: string) => void;
}

export default function ResumeActions({ 
  hasResume, 
  isLatex, 
  onDownloadPDF, 
  onDownloadLatex,
  onUploadResume
}: ResumeActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  
  if (!hasResume && !onUploadResume) return null;
  
  const handleResumeUpload = async (resumeText: string) => {
    try {
      setIsUpdating(true);
      
      // First, get the current profile
      const currentProfile = await getUserProfile();
      if (!currentProfile) {
        throw new Error("Could not load profile");
      }
      
      // Update the profile with the new resume text
      await saveUserProfile({
        ...currentProfile,
        resumeText
      });
      
      // Call the parent handler if provided
      if (onUploadResume) {
        onUploadResume(resumeText);
      }
      
      toast({
        title: "Resume uploaded",
        description: "Your resume has been saved to your profile and will be used for personalized advice.",
      });
      
      // Reload the page to refresh the chat with the new resume context
      window.location.reload();
      
    } catch (error) {
      console.error("Failed to update profile with resume:", error);
      toast({
        title: "Error",
        description: "Failed to save resume to your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };
  
  return (
    <div className="mb-3">
      <Tabs defaultValue="download" className="w-full">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="download">Downloads</TabsTrigger>
          <TabsTrigger value="upload">Upload Resume</TabsTrigger>
        </TabsList>
        
        <TabsContent value="download" className="space-y-2 py-2">
          {hasResume ? (
            <div className="flex flex-wrap gap-2 justify-end">
              <Button
                variant="outline"
                onClick={onDownloadPDF}
                className="flex items-center"
              >
                <DownloadCloud className="h-4 w-4 mr-2" /> 
                Download PDF
              </Button>
              
              {isLatex && onDownloadLatex && (
                <Button
                  variant="outline"
                  onClick={onDownloadLatex}
                  className="flex items-center"
                >
                  <Code className="h-4 w-4 mr-2" /> 
                  Download LaTeX Source
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground text-sm p-2">
              Generate a resume to enable downloads
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="upload" className="py-2">
          <ResumeUpload onUpload={handleResumeUpload} isLoading={isUpdating} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
