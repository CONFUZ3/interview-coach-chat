
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
import { Info, FileText, Download, Copy, ArrowRight } from "lucide-react";
import { getUserProfile, ProfileData } from "@/services/profileService";
import { supabase } from "@/integrations/supabase/client";

const ResumeBuilderPage = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [resumeContent, setResumeContent] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [activeTab, setActiveTab] = useState("editor");
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getUserProfile();
        if (profile) {
          setProfileData(profile);
        } else {
          toast({
            title: "Profile required",
            description: "Please complete your profile before using the resume builder.",
            variant: "destructive",
          });
          navigate("/profile");
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        toast({
          title: "Error",
          description: "Failed to load your profile. Please try again.",
          variant: "destructive",
        });
      }
    };
    
    fetchProfile();
  }, [navigate, toast]);

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
    try {
      // Call the career-chat function with a specific prompt for resume
      const resumePrompt = `Based on my profile information, please create a professional resume for a ${jobTitle} position at ${company}. 
      The job description is: ${jobDescription}
      
      Please format the result as a clean, professional resume with clear sections for contact information, summary, experience, skills, and education.`;

      const response = await supabase.functions.invoke('career-chat', {
        body: { 
          messages: [{ content: resumePrompt, type: "user" }], 
          conversationId: null, // Don't save this as part of chat history
          profileData 
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setResumeContent(response.data.reply);
      setActiveTab("preview");
      
      // Save the generated resume to the database
      await supabase.from('resumes').insert({
        user_id: (await supabase.auth.getSession()).data.session?.user.id,
        content: response.data.reply,
        job_title: jobTitle,
        company: company
      });

    } catch (error) {
      console.error("Error generating resume:", error);
      toast({
        title: "Error",
        description: "Failed to generate resume. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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
              >
                {isLoading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Generating...
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
              <TabsContent value="editor" className="mt-0">
                <Textarea 
                  value={resumeContent}
                  onChange={(e) => setResumeContent(e.target.value)}
                  placeholder="Your generated resume will appear here..."
                  className="min-h-[400px] font-mono text-sm"
                />
              </TabsContent>
              <TabsContent value="preview" className="mt-0">
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
              </TabsContent>
            </CardContent>
            <CardFooter className="justify-end space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(resumeContent)}
                disabled={!resumeContent}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadAsTxt(resumeContent, `resume-${jobTitle.toLowerCase().replace(/\s+/g, '-')}.txt`)}
                disabled={!resumeContent}
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
};

export default ResumeBuilderPage;
