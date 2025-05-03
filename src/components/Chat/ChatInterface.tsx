
import ChatInputArea from "./ChatInputArea";
import MessageList from "./MessageList";
import { useChat } from "@/hooks/useChat";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { UserCog, MessageSquare } from "lucide-react";
import ResumeActions from "./ResumeActions";

export type MessageType = {
  id: string;
  content: string;
  type: "user" | "ai";
  timestamp: Date;
  isTyping?: boolean;
  category?: "general" | "resume" | "interview";
  format?: "text" | "feedback";
};

interface ChatInterfaceProps {
  mode: "resume" | "interview";
  userProfile?: any;
}

export default function ChatInterface({ mode, userProfile }: ChatInterfaceProps) {
  const {
    messages,
    isProcessing,
    conversationId,
    profileData,
    isProfileLoading,
    isMessagesLoading,
    handleMessageSubmit,
    copyToClipboard,
  } = useChat(mode, userProfile);

  const handleDownloadMessage = (content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `career-advice-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const hasResume = !!(profileData?.resumeText && profileData.resumeText.trim().length > 0);

  if (isProfileLoading) {
    return (
      <div className="flex flex-col h-full justify-center items-center">
        <Spinner className="h-8 w-8 mb-4" />
        <p className="text-sm text-muted-foreground">Loading your profile data...</p>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="flex flex-col h-full justify-center items-center p-6">
        <Card className="max-w-md">
          <CardContent className="pt-6 pb-4 text-center">
            <UserCog className="h-12 w-12 mx-auto mb-4 text-primary opacity-70" />
            <h3 className="text-lg font-medium mb-2">Profile Recommended</h3>
            <CardDescription className="mb-4">
              To get personalized career advice, please complete your profile information first.
            </CardDescription>
            <Link 
              to="/profile" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Complete Profile
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {mode === "resume" && (
        <div className="px-4 pt-3">
          <ResumeActions 
            hasResume={hasResume}
            isLatex={false}
            onDownloadPDF={() => {}}
            onUploadResume={(resumeText) => {
              // This will be handled by the ResumeUpload component
            }}
          />
        </div>
      )}
      
      {isMessagesLoading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="text-center">
            <Spinner className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading conversation...</p>
          </div>
        </div>
      ) : messages.length === 0 ? (
        <div className="flex-1 flex justify-center items-center p-4">
          <div className="text-center max-w-md">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium mb-2">Start a conversation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ask about career advice, resume feedback, or job interview preparation.
            </p>
          </div>
        </div>
      ) : (
        <MessageList 
          messages={messages} 
          onCopyMessage={copyToClipboard}
          onDownloadMessage={handleDownloadMessage}
        />
      )}
      
      <div className="p-4 border-t">
        <ChatInputArea 
          onSubmit={handleMessageSubmit}
          isProcessing={isProcessing}
          disabled={!conversationId}
          placeholder={mode === "resume" 
            ? "Ask for career advice or resume tips..." 
            : "Type your interview question..."}
        />
      </div>
    </div>
  );
}
