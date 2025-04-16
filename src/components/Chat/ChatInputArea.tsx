
import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatInputAreaProps {
  onSubmit: (message: string) => void;
  isProcessing: boolean;
  disabled: boolean;
  placeholder: string;
}

export default function ChatInputArea({ 
  onSubmit, 
  isProcessing, 
  disabled, 
  placeholder 
}: ChatInputAreaProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing || disabled) return;
    
    onSubmit(input);
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        disabled={isProcessing || disabled}
        className="flex-grow"
      />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="submit" size="icon" disabled={isProcessing || !input.trim() || disabled}>
              {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Send message</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </form>
  );
}
