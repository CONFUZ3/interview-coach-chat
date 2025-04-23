
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DownloadCloud, FileText, Code } from "lucide-react";
import ResumeUpload from "./ResumeUpload";

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
  if (!hasResume && !onUploadResume) return null;
  
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
          <ResumeUpload onUpload={onUploadResume} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
