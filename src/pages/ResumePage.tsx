
import AppLayout from "@/components/Layout/AppLayout";
import ChatInterface from "@/components/Chat/ChatInterface";

const ResumePage = () => {
  return (
    <AppLayout>
      <div className="container h-full py-4 md:py-8 flex flex-col">
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">AI Resume Builder</h1>
          <p className="text-muted-foreground mt-1">
            Chat with our AI to generate customized resumes based on job descriptions.
          </p>
        </div>
        
        <div className="flex-1 flex flex-col border rounded-lg overflow-hidden bg-card">
          <ChatInterface mode="resume" />
        </div>
      </div>
    </AppLayout>
  );
};

export default ResumePage;
