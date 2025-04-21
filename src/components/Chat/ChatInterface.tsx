
import ChatInputArea from "./ChatInputArea";
import MessageList from "./MessageList";
import { useChat } from "@/hooks/useChat";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { UserCog } from "lucide-react";

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
  userProfile?: any; // Add this prop to the interface
}

export default function ChatInterface({ mode, userProfile }: ChatInterfaceProps) {
  const {
    messages,
    isProcessing,
    conversationId,
    profileData,
    isProfileLoading,
    handleMessageSubmit,
    copyToClipboard,
  } = useChat(mode);

  const handleDownloadMessage = (content: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `career-advice-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

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
      <MessageList 
        messages={messages} 
        onCopyMessage={copyToClipboard}
        onDownloadMessage={handleDownloadMessage}
      />
      
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
