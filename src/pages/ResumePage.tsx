
import AppLayout from "@/components/Layout/AppLayout";
import ChatInterface from "@/components/Chat/ChatInterface";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { ArrowDown, FileText, Info, Download } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ResumePage = () => {
  return (
    <AppLayout>
      <div className="container h-full py-4 md:py-8 flex flex-col">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Resume Builder</h1>
          <p className="text-muted-foreground mt-1">
            Chat with our AI to generate customized PDF resumes tailored to specific job descriptions. First, ensure your profile information is complete, then provide a job description to get started.
          </p>
        </div>
        
        <Alert className="mb-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle>How to use the resume builder</AlertTitle>
          <AlertDescription className="text-sm mt-1">
            1. Complete your profile information from the dashboard first.<br />
            2. Type a job description in the chat below.<br />
            3. Our AI will analyze your profile and the job requirements to create a tailored resume.<br />
            4. Download your professional resume as a formatted PDF file with a single click.
          </AlertDescription>
        </Alert>
        
        <Card className="mb-4 bg-accent/50">
          <CardContent className="pt-6 pb-4">
            <CardDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
              <div className="flex items-center">
                <ArrowDown className="h-4 w-4 animate-bounce mr-2" />
                <span>Type a job description in the chat below</span>
              </div>
              <div className="flex items-center mt-2 sm:mt-0 sm:ml-auto">
                <Download className="h-4 w-4 mr-2" />
                <span>Download a professionally formatted PDF resume</span>
              </div>
            </CardDescription>
          </CardContent>
        </Card>
        
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-card">
          <ChatInterface mode="resume" />
        </div>
      </div>
    </AppLayout>
  );
};

export default ResumePage;
