
import { Card } from "@/components/ui/card";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MessageType } from "./ChatInterface";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatMessageProps {
  message: MessageType;
  onCopy?: (content: string) => void;
}

export default function ChatMessage({ message, onCopy }: ChatMessageProps) {
  if (message.isTyping) {
    return (
      <div className="flex justify-start mb-4">
        <Card className="chat-message-ai">
          <div className="typing-indicator">
            <div className="typing-indicator-dot"></div>
            <div className="typing-indicator-dot"></div>
            <div className="typing-indicator-dot"></div>
          </div>
        </Card>
      </div>
    );
  }

  const isAI = message.type === "ai";
  const isFeedback = message.format === "feedback";

  return (
    <div className={`flex ${isAI ? "justify-start" : "justify-end"} mb-4`}>
      <Card className={isAI ? "chat-message-ai" : "chat-message-user"}>
        <div className="flex justify-between items-start">
          <div className={`${isFeedback ? "prose prose-sm dark:prose-invert max-w-none" : ""}`}>
            {message.content.split("\n").map((line, index) => (
              <p key={index} className={`${index > 0 ? "mt-2" : ""} ${isFeedback ? "italic text-amber-600 dark:text-amber-400" : ""}`}>
                {line}
              </p>
            ))}
          </div>
          
          {isAI && message.content.length > 20 && (
            <div className="ml-4 flex flex-col space-y-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => onCopy?.(message.content)} 
                      className="h-8 w-8"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy to clipboard</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>
        
        <div className="text-xs text-muted-foreground mt-2">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </Card>
    </div>
  );
}
