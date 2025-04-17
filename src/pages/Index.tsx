
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthForm from "@/components/Auth/AuthForm";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is already authenticated with Supabase
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking auth session:", error);
          setIsLoading(false);
          return;
        }
        
        if (data.session) {
          navigate("/dashboard");
        }
      } catch (e) {
        console.error("Authentication check failed:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
        navigate("/dashboard");
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-lavender to-white dark:from-brand-darkBlue dark:to-background flex flex-col items-center justify-center p-4">
      <div className="max-w-5xl w-full mx-auto grid gap-8 lg:grid-cols-2 items-center">
        <div className="text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-brand-purple mb-6">
            Unlock Your Career Potential with AI
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Generate tailored resumes and practice interviews with our AI coach. Get personalized feedback and maximize your job search success.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
            <div className="flex items-center justify-center gap-2 bg-secondary rounded-lg p-4">
              <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-left">
                <p className="font-medium">AI Resume Builder</p>
                <p className="text-sm text-muted-foreground">Customized for each job</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 bg-secondary rounded-lg p-4">
              <svg className="h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              <div className="text-left">
                <p className="font-medium">Mock Interviews</p>
                <p className="text-sm text-muted-foreground">Real-time feedback</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-card p-1 rounded-lg shadow-lg">
          <AuthForm />
        </div>
      </div>
    </div>
  );
};

export default Index;
