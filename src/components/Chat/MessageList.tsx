
import { useRef, useEffect } from "react";
import ChatMessage from "./ChatMessage";
import type { MessageType } from "./ChatInterface";

interface MessageListProps {
  messages: MessageType[];
  onCopyMessage: (content: string) => void;
  onDownloadMessage: (content: string) => void;
}

export default function MessageList({ messages, onCopyMessage, onDownloadMessage }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  return (
    <div className="chat-container p-4 flex-grow overflow-auto">
      {messages.map((message) => (
        <ChatMessage 
          key={message.id} 
          message={message} 
          onCopy={() => onCopyMessage(message.content)}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
