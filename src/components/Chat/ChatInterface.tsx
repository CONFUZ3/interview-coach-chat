
import ChatInputArea from "./ChatInputArea";
import MessageList from "./MessageList";
import { useChat } from "@/hooks/useChat";

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
}

export default function ChatInterface({ mode }: ChatInterfaceProps) {
  const {
    messages,
    isProcessing,
    conversationId,
    profileData,
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
