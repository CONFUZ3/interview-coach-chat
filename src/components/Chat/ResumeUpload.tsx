
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ResumeUploadProps {
  onUpload: (resumeText: string) => void;
}

export default function ResumeUpload({ onUpload }: ResumeUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }
    
    const file = e.target.files[0];
    
    // Check file type
    if (
      file.type !== 'application/pdf' && 
      file.type !== 'text/plain' && 
      file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
      file.type !== 'application/msword' &&
      file.type !== 'application/x-latex'
    ) {
      setUploadError("Please upload a PDF, DOC, DOCX, TXT or LaTeX file");
      return;
    }
    
    // Check file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError("File size should be less than 10MB");
      return;
    }
    
    setIsUploading(true);
    
    try {
      // For simplicity, we're just reading text files directly
      // In a production app, you would use a library to extract text from PDFs and DOCs
      if (file.type === 'text/plain' || file.type === 'application/x-latex') {
        const text = await file.text();
        onUpload(text);
      } else {
        // For this demo, we'll just use a simple placeholder text for other file types
        // In production, you would use a proper document text extraction service
        onUpload(`Content extracted from ${file.name}`);
        
        // Show a warning if it's not a text file
        if (file.type !== 'text/plain') {
          setUploadError("Note: For non-text files, proper text extraction would require server-side processing.");
        }
      }
    } catch (error) {
      console.error("Error reading file:", error);
      setUploadError("Error reading the file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="file"
          accept=".pdf,.doc,.docx,.txt,.tex"
          id="resume-upload"
          className="hidden"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => document.getElementById("resume-upload")?.click()}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? "Uploading..." : "Upload Previous Resume"}
        </Button>
      </div>
      
      {uploadError && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
