
import AppLayout from "@/components/Layout/AppLayout";
import ChatInterface from "@/components/Chat/ChatInterface";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { getUserProfile } from "@/services/profileService";
import { useToast } from "@/components/ui/use-toast";

const ResumePage = () => {
  const [userName, setUserName] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profile = await getUserProfile();
        if (profile && profile.fullName) {
          setUserName(profile.fullName.split(' ')[0]); // Get first name
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };
    
    fetchProfile();
  }, [toast]);

  return (
    <AppLayout>
      <div className="container h-full py-4 md:py-8 flex flex-col">
        <div className="mb-4 md:mb-6 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Career Coach AI</h1>
            <p className="text-muted-foreground mt-1">
              {userName ? `Hello ${userName}, get personalized career advice tailored to your profile` : 
                "Get personalized career advice tailored to your profile"}
            </p>
          </div>
          <Badge variant="outline" className="bg-accent">
            <MessageSquare className="h-3 w-3 mr-1" /> AI Powered
          </Badge>
        </div>
        
        <Alert className="mb-4 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Info className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-sm">How to Use the Career Coach</AlertTitle>
          <AlertDescription className="text-xs mt-1">
            Ask about interview tips, resume improvement, career transitions, or any other career-related questions. The AI coach will provide personalized guidance based on your profile and industry best practices.
          </AlertDescription>
        </Alert>
        
        <Card className="mb-2 bg-accent/50">
          <CardContent className="py-2">
            <CardDescription className="flex gap-2 text-xs text-center justify-center">
              Your profile information is used to provide more relevant career advice
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
