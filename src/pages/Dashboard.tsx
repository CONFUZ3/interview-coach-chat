import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, MessageSquare, User, ArrowRight, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import AppLayout from "@/components/Layout/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getUserProfile } from "@/services/resumeService";

const Dashboard = () => {
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string>("");
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const { data } = await supabase.auth.getSession();
      
      if (!data.session) {
        navigate("/");
        return;
      }

      const user = data.session.user;
      const name = user.user_metadata?.name || user.email?.split('@')[0] || "User";
      setUserName(name);
      
      const profile = await getUserProfile();
      setHasProfile(!!profile && !!profile.fullName);
      
      setIsLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

  const features = [
    {
      title: "AI Resume Builder",
      description: "Generate customized resumes tailored to specific job descriptions based on your profile information.",
      icon: FileText,
      path: "/resume",
      color: "text-blue-500",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
    },
    {
      title: "Mock Interview Coach",
      description: "Practice interviews with our AI coach and receive real-time feedback to improve your interview skills.",
      icon: MessageSquare,
      path: "/interview",
      color: "text-purple-500",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
    },
    {
      title: "Profile Management",
      description: "Update your professional information to get better results from our AI-powered tools.",
      icon: User,
      path: "/profile",
      color: "text-emerald-500",
      bgColor: "bg-emerald-100 dark:bg-emerald-900/20",
    },
  ];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container py-8 flex justify-center items-center min-h-[60vh]">
          <div className="text-center">
            <div className="inline-block">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <p className="mt-2 text-muted-foreground">Loading your dashboard...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {userName}!</h1>
          <p className="text-muted-foreground mt-2">
            Use our AI-powered tools to boost your job search and career development.
          </p>
        </div>

        {!hasProfile && (
          <Card className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 mb-8">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-800">
                  <User className="h-6 w-6 text-amber-600 dark:text-amber-300" />
                </div>
                <div>
                  <h3 className="font-medium text-amber-800 dark:text-amber-300">Complete Your Profile</h3>
                  <p className="text-amber-700 dark:text-amber-400 text-sm mt-1">
                    For the best experience, please complete your professional profile to get personalized resumes and interview coaching.
                  </p>
                </div>
                <Button
                  className="sm:ml-auto mt-3 sm:mt-0"
                  onClick={() => navigate("/profile")}
                >
                  Setup Profile
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <Card key={index} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className={`p-3 rounded-full w-fit ${feature.bgColor}`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="mt-4">{feature.title}</CardTitle>
                <CardDescription>{feature.description}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-3">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={() => navigate(feature.path)}
                >
                  Get Started <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
