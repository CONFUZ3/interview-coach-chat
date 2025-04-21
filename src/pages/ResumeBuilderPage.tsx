import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/Layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/use-toast";
import { Info, FileText, Download, Copy, ArrowRight, UserCog } from "lucide-react";
import { getUserProfile, saveResume, ProfileData } from "@/services/profileService";
import { supabase } from "@/integrations/supabase/client";
import { compileLatexToPDF, downloadLatexSource } from "@/services/latexService";
import { generateResumeWithAI } from "@/services/resumeGenerationService";
import { CheckCircle } from "lucide-react";

const ResumeBuilderPage = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [resumeContent, setResumeContent] = useState("");
  const [latexSource, setLatexSource] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [activeTab, setActiveTab] = useState("editor");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pastedResumeText, setPastedResumeText] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        toast({
          title: "Authentication required",
          description: "Please sign in to use this feature.",
          variant: "destructive",
        });
        navigate('/');
      }
    };
    
    checkSession();
  }, [navigate, toast]);

  useEffect(() => {
    const fetchProfile = async () => {
      setIsProfileLoading(true);
      try {
        const profile = await getUserProfile();
        if (profile) {
          setProfileData(profile);
          setPastedResumeText(profile.resumeText || "");
        } else {
          setPastedResumeText("");
        }
      } catch (error) {
        setProfileData(null);
        setPastedResumeText("");
        toast({
          title: "Error",
          description: "Failed to load your profile. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsProfileLoading(false);
      }
    };
    fetchProfile();
  }, [toast]);

  const handleGenerateResume = async () => {
    if (!jobDescription) {
      toast({
        title: "Job description required",
        description: "Please enter a job description to generate a resume.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSaveSuccess(false);
    try {
      const previousResumeText = pastedResumeText || profileData?.resumeText || "";
      const { resumeText, resumeLatex } = await generateResumeWithAI(
        jobDescription,
        previousResumeText
      );
      setResumeContent(resumeText || "");
      setLatexSource(resumeLatex || "");
      setActiveTab("preview");

      const success = await saveResume(resumeText, jobTitle, company);
      if (success) {
        setSaveSuccess(true);
        toast({
          title: "Resume saved",
          description: "Your resume has been generated and saved successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!latexSource && !resumeContent) {
      toast({
        title: "No content",
        description: "Please generate a resume first before downloading.",
        variant: "destructive",
      });
      return;
    }
    try {
      toast({
        title: "Preparing PDF",
        description: "Your resume is being formatted as PDF...",
      });
      let pdfBlob;
      if (latexSource) {
        pdfBlob = await compileLatexToPDF(latexSource);
      } else {
        toast({
          title: "Using basic formatting",
          description: "LaTeX source not available, using simplified PDF formatting.",
        });
        return;
      }
      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resume-${jobTitle.toLowerCase().replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "PDF Downloaded",
        description: "Your resume has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadLatex = () => {
    if (!latexSource) {
      toast({
        title: "No LaTeX content",
        description: "Please generate a resume first before downloading LaTeX.",
        variant: "destructive",
      });
      return;
    }
    try {
      const filename = `resume-${jobTitle.toLowerCase().replace(/\s+/g, '-')}.tex`;
      downloadLatexSource(latexSource, filename);
      toast({
        title: "LaTeX Downloaded",
        description: "Your resume LaTeX source has been downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download LaTeX source. Please try again.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Resume content has been copied to your clipboard.",
    });
  };

  const downloadAsTxt = (content: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (isProfileLoading) {
    return (
      <AppLayout>
        <div className="container py-6 md:py-8 flex justify-center items-center" style={{ minHeight: "50vh" }}>
          <div className="text-center">
            <Spinner className="h-10 w-10 mx-auto mb-4" />
            <p className="text-muted-foreground">Loading your profile data...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!profileData) {
    return (
      <AppLayout>
        <div className="container py-6 md:py-8 flex justify-center items-center" style={{ minHeight: "50vh" }}>
          <Card className="max-w-md text-center">
            <CardHeader>
              <CardTitle className="flex justify-center">
                <UserCog className="h-12 w-12 mb-2 text-primary opacity-70" />
              </CardTitle>
              <CardTitle>Profile Required</CardTitle>
              <CardDescription>
                Please complete your profile before using the resume builder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6">
                The resume builder needs your personal information to create a personalized resume.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={() => navigate('/profile')}>
                Complete Profile
              </Button>
            </CardFooter>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Resume Builder</h1>
          <p className="text-muted-foreground mt-2">
            Create professional resumes tailored to specific job descriptions using AI
          </p>
        </div>
        <Alert className="mb-6 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-sm">How to Use the Resume Builder</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Enter a job description and details, then click "Generate Resume". Our AI will create a resume tailored to the job using your profile information.
            For better results, first use the Career Coach AI to get advice on your resume content.
          </AlertDescription>
        </Alert>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Job Details</CardTitle>
              <CardDescription>
                Enter the details for the job you're applying to
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input 
                  id="jobTitle" 
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="Software Engineer, Project Manager, etc."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input 
                  id="company" 
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="previousResume">Previous Resume</Label>
                <Textarea
                  id="previousResume"
                  value={pastedResumeText}
                  onChange={(e) => setPastedResumeText(e.target.value)}
                  placeholder="Paste your existing resume text here (optional)..."
                  className="min-h-[150px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste your existing resume to help the AI better understand your experience and skills
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea 
                  id="jobDescription" 
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job description here..."
                  className="min-h-[200px]"
                />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button 
                variant="outline"
                onClick={() => navigate('/resume')}
              >
                Get Advice First
              </Button>
              <Button 
                onClick={handleGenerateResume}
                disabled={isLoading || !jobDescription}
                className={saveSuccess ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Generating...
                  </>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Generated & Saved
                  </>
                ) : (
                  <>
                    Generate Resume <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex justify-between items-center">
                <CardTitle>Generated Resume</CardTitle>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[200px]">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="editor">Editor</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <CardDescription>
                Your AI-generated resume based on the job description
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {activeTab === "editor" ? (
                  <Textarea 
                    value={resumeContent}
                    onChange={(e) => {
                      setResumeContent(e.target.value);
                      setSaveSuccess(false);
                    }}
                    placeholder="Your generated resume will appear here..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                ) : (
                  <div className="border rounded-md p-4 min-h-[400px] whitespace-pre-wrap">
                    {resumeContent ? (
                      <div className="prose dark:prose-invert max-w-none">
                        {resumeContent.split('\n').map((line, i) => (
                          <div key={i} className={line.trim() === '' ? 'my-3' : ''}>
                            {line}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-muted-foreground text-center py-10">
                        <FileText className="mx-auto h-10 w-10 mb-2 opacity-20" />
                        <p>Generate a resume to preview it here</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadLatex()}
                disabled={!latexSource}
              >
                <FileText className="mr-2 h-4 w-4" />
                Download LaTeX
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadPDF()}
                disabled={!latexSource && !resumeContent}
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(resumeContent)}
                disabled={!resumeContent}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default ResumeBuilderPage;
