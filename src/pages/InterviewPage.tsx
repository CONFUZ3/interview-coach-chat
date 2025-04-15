
import AppLayout from "@/components/Layout/AppLayout";
import ChatInterface from "@/components/Chat/ChatInterface";

const InterviewPage = () => {
  return (
    <AppLayout>
      <div className="container h-full py-4 md:py-8 flex flex-col">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Mock Interview Coach</h1>
          <p className="text-muted-foreground mt-1">
            Practice interviewing with our AI coach and receive real-time feedback.
          </p>
        </div>
        
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-card">
          <ChatInterface mode="interview" />
        </div>
      </div>
    </AppLayout>
  );
};

export default InterviewPage;
