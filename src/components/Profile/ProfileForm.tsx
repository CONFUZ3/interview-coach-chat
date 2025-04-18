
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload } from "lucide-react";
import { getUserProfile, saveUserProfile, ProfileData } from "@/services/profileService";

export default function ProfileForm() {
  const [profile, setProfile] = useState<ProfileData>({
    fullName: "",
    email: "",
    phone: "",
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
      'application/octet-stream'
    ];
    
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const isValidExt = ['pdf', 'doc', 'docx', 'txt', 'tex'].includes(fileExt || '');
    
    if (!validTypes.includes(file.type) && !isValidExt) {
      setUploadError("Please upload a PDF, DOC, DOCX, TXT or LaTeX file");
      return;
    }
    
    setIsUploading(true);
    
    try {
      if (file.type === 'text/plain' || fileExt === 'txt' || fileExt === 'tex') {
        const text = await file.text();
        setProfile(prev => ({
          ...prev,
          resumeText: text
        }));
        setUploadStatus(`Resume uploaded: ${file.name}`);
      } else {
        setProfile(prev => ({
          ...prev,
          resumeText: `Previous resume uploaded: ${file.name}`
        }));
        setUploadStatus(`Resume uploaded: ${file.name}`);
      }
    } catch (error) {
      console.error("Error reading file:", error);
      setUploadError("Error reading the file. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      const success = await saveUserProfile(profile);
      
      if (success) {
        toast({
          title: "Profile saved",
          description: "Your profile has been updated successfully.",
        });
        navigate("/resume");
      } else {
        toast({
          title: "Error saving profile",
          description: "There was an error saving your profile. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error saving profile",
        description: "There was an error saving your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Enter your basic information and upload your existing resume to get started.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
            <Input 
              id="fullName" 
              value={profile.fullName}
              onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
              placeholder="John Doe"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input 
              id="email" 
              type="email"
              value={profile.email}
              onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
              placeholder="john.doe@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
            <Input 
              id="phone" 
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
              placeholder="(123) 456-7890"
            />
          </div>
        </div>
        
        <div className="space-y-4">
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
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveProfile} disabled={isLoading} className="ml-auto">
          {isLoading ? "Saving..." : "Save Profile"}
        </Button>
      </CardFooter>
    </Card>
  );
}
