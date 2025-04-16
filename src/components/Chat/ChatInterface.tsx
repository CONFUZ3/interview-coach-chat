
import ChatInputArea from "./ChatInputArea";
import MessageList from "./MessageList";
import ResumeActions from "./ResumeActions";
import { useChat } from "@/hooks/useChat";

export type MessageType = {
  id: string;
  content: string;
  type: "user" | "ai";
  timestamp: Date;
  isTyping?: boolean;
  category?: "general" | "resume" | "interview";
  format?: "text" | "resume" | "feedback";
};

interface ChatInterfaceProps {
  mode: "resume" | "interview";
}

export default function ChatInterface({ mode }: ChatInterfaceProps) {
  const {
    messages,
    isProcessing,
    lastGeneratedResume,
    conversationId,
    handleMessageSubmit,
    copyToClipboard,
    downloadAsText,
    downloadAsPDF
  } = useChat(mode);

  return (
    <div className="flex flex-col h-full">
      <MessageList 
        messages={messages} 
        onCopyMessage={copyToClipboard}
        onDownloadMessage={(content) => 
          downloadAsText(
            content, 
            `${mode === "resume" ? "resume" : "interview"}_${new Date().toISOString().split('T')[0]}.txt`
          )
        }
      />
      
      <div className="p-4 border-t">
        {mode === "resume" && (
          <ResumeActions 
            hasResume={!!lastGeneratedResume} 
            onDownloadPDF={downloadAsPDF} 
          />
        )}
        
        <ChatInputArea 
          onSubmit={handleMessageSubmit}
          isProcessing={isProcessing}
          disabled={!conversationId}
          placeholder={mode === "resume" 
            ? "Describe the job you're applying for..." 
            : "Type your interview response..."}
        />
      </div>
    </div>
  );
}
