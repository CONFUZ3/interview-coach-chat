
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";

interface ResumeUploadProps {
  onUpload: (resumeText: string) => void;
}

export default function ResumeUpload({ onUpload }: ResumeUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadStatus(null);
    
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
      'application/x-latex',
      'application/octet-stream' // For .tex files sometimes
    ];
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isValidExt = ['pdf', 'doc', 'docx', 'txt', 'tex'].includes(fileExt || '');
    
    if (!validTypes.includes(file.type) && !isValidExt) {
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
      if (file.type === 'text/plain' || file.type === 'application/x-latex' || 
          fileExt === 'tex' || fileExt === 'txt') {
        const text = await file.text();
        onUpload(text);
        setUploadStatus(`Resume uploaded: ${file.name}`);
      } else if (file.type === 'application/pdf' || fileExt === 'pdf') {
        // For PDFs, we just capture the file info
        onUpload(`Previous resume uploaded: ${file.name} (PDF)`);
        setUploadStatus(`Resume uploaded: ${file.name}`);
      } else {
        // For DOC/DOCX files
        onUpload(`Previous resume uploaded: ${file.name} (Word document)`);
        setUploadStatus(`Resume uploaded: ${file.name}`);
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
          {isUploading ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload Previous Resume
            </>
          )}
        </Button>
      </div>
      
      {uploadStatus && (
        <Alert className="mt-2 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
          <AlertDescription className="text-green-700 dark:text-green-400">{uploadStatus}</AlertDescription>
        </Alert>
      )}
      
      {uploadError && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
