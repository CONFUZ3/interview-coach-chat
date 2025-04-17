
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
    const validTypes = [
      'application/pdf', 
      'text/plain', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/x-latex'
    ];
    
    if (!validTypes.includes(file.type)) {
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
      // For text-based files, we can extract content directly
      if (file.type === 'text/plain' || file.type === 'application/x-latex') {
        const text = await file.text();
        onUpload(text);
      } else if (file.type === 'application/pdf') {
        // For PDFs, we'd ideally use a PDF extraction service
        // For now, we'll use a simple placeholder message
        onUpload(`Previous resume uploaded: ${file.name} (PDF)`);
        
        setUploadError("Note: For better results with PDF files, consider extracting and pasting the text manually.");
      } else {
        // For DOC/DOCX files
        onUpload(`Previous resume uploaded: ${file.name} (Word document)`);
        
        setUploadError("Note: For better results with Word documents, consider extracting and pasting the text manually.");
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
