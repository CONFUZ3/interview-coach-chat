
import AppLayout from "@/components/Layout/AppLayout";
import ChatInterface from "@/components/Chat/ChatInterface";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ArrowDown, FileText, Info, Download, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ResumePage = () => {
  return (
    <AppLayout>
      <div className="container h-full py-4 md:py-8 flex flex-col">
        <div className="mb-4 md:mb-6 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Resume Builder</h1>
            <p className="text-muted-foreground mt-1">
              Chat with our AI to generate customized LaTeX resumes tailored to specific job descriptions.
            </p>
          </div>
          <Badge variant="outline" className="bg-accent">
            <FileText className="h-3 w-3 mr-1" /> LaTeX Enhanced
          </Badge>
        </div>
        
        <Alert className="mb-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle>How to use the LaTeX resume builder</AlertTitle>
          <AlertDescription className="text-sm mt-1">
            1. Complete your profile information from the dashboard first.<br />
            2. Upload a previous resume (optional) to use as reference.<br />
            3. Type a job description in the chat below.<br />
            4. Our AI will create a professionally formatted LaTeX resume.<br />
            5. Download your resume as a PDF file or LaTeX source code.
          </AlertDescription>
        </Alert>
        
        <Card className="mb-4 bg-accent/50">
          <CardContent className="pt-6 pb-4">
            <CardDescription className="flex flex-wrap justify-between gap-2">
              <div className="flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                <span>Upload a previous resume (optional)</span>
              </div>
              <div className="flex items-center">
                <ArrowDown className="h-4 w-4 animate-bounce mr-2" />
                <span>Type a job description</span>
              </div>
              <div className="flex items-center">
                <Download className="h-4 w-4 mr-2" />
                <span>Download PDF or LaTeX source</span>
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
}

export default ResumePage;
