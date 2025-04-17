
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
  format?: "text" | "resume" | "feedback" | "latex";
};

interface ChatInterfaceProps {
  mode: "resume" | "interview";
}

export default function ChatInterface({ mode }: ChatInterfaceProps) {
  const {
    messages,
    isProcessing,
    lastGeneratedResume,
    lastGeneratedLatex,
    conversationId,
    handleMessageSubmit,
    copyToClipboard,
    downloadAsText,
    downloadAsPDF,
    downloadLatexSource,
    handleResumeUpload
  } = useChat(mode);

  return (
    <div className="flex flex-col h-full">
      <MessageList 
        messages={messages} 
        onCopyMessage={copyToClipboard}
        onDownloadMessage={(content) => 
          downloadAsPDF(content, !!lastGeneratedLatex)
        }
        onDownloadLatex={lastGeneratedLatex ? 
          (content) => downloadLatexSource(content) : undefined}
      />
      
      <div className="p-4 border-t">
        {mode === "resume" && (
          <ResumeActions 
            hasResume={!!lastGeneratedResume || !!lastGeneratedLatex} 
            isLatex={!!lastGeneratedLatex}
            onDownloadPDF={() => downloadAsPDF(lastGeneratedLatex || lastGeneratedResume || "", !!lastGeneratedLatex)}
            onDownloadLatex={lastGeneratedLatex ? () => downloadLatexSource(lastGeneratedLatex) : undefined}
            onUploadResume={handleResumeUpload}
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
