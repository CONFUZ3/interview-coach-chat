
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle } from "lucide-react";
import { getUserProfile, saveUserProfile, ProfileData } from "@/services/profileService";
import { supabase } from "@/integrations/supabase/client";

export default function ProfileForm() {
  const [profile, setProfile] = useState<ProfileData>({
    fullName: "",
    email: "",
    phone: "",
    resumeText: ""
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch existing profile data on component mount
  useEffect(() => {
    async function fetchProfile() {
      setIsFetching(true);
      try {
        const sessionData = await supabase.auth.getSession();
        if (!sessionData.data.session) {
          navigate('/');
          return;
        }
        const profileData = await getUserProfile();
        if (profileData) {
          setProfile(profileData);
        } else {
          setProfile({
            fullName: "",
            email: "",
            phone: "",
            resumeText: ""
          });
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load your profile. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsFetching(false);
      }
    }
    fetchProfile();
  }, [navigate, toast]);

  // Remove file upload logic completely, use textarea instead

  const handleSaveProfile = async () => {
    setIsLoading(true);
    setSaveSuccess(false);

    try {
      const success = await saveUserProfile(profile);

      if (success) {
        setSaveSuccess(true);
        toast({
          title: "Profile saved",
          description: "Your profile has been updated successfully.",
        });
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

  if (isFetching) {
    return (
      <Card className="w-full max-w-xl">
        <CardContent className="flex justify-center items-center py-10">
          <Spinner className="h-8 w-8" />
          <span className="ml-2">Loading profile data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>
          Enter your basic information and paste your resume text below.
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
          <div className="space-y-2">
            <label htmlFor="resumeText" className="text-sm font-medium">Resume Text</label>
            <Textarea
              id="resumeText"
              value={profile.resumeText || ""}
              onChange={(e) => setProfile(prev => ({ ...prev, resumeText: e.target.value }))}
              placeholder="Paste your resume text here. This will help the AI personalize your experience and generate resumes tailored to you."
              className="min-h-[150px] resize-y"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Paste your full resume text so your advice and generated resumes are based on your real strengths!
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={() => navigate("/resume")}
          disabled={isLoading}
        >
          Back to Career Coach
        </Button>
        <Button 
          onClick={handleSaveProfile} 
          disabled={isLoading}
          className={saveSuccess ? "bg-green-600 hover:bg-green-700" : ""}
        >
          {isLoading ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              Saving...
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Saved!
            </>
          ) : (
            "Save Profile"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
