
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Send, FileText, Copy, DownloadCloud, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ChatMessage from "./ChatMessage";
import { useNavigate } from "react-router-dom";

export type MessageType = {
  id: string;
  content: string;
  type: "user" | "ai";
  timestamp: Date;
  isTyping?: boolean;
  category?: "general" | "resume" | "interview";
  format?: "text" | "resume" | "feedback";
};

const generateId = () => Math.random().toString(36).substring(2, 11);

interface ChatInterfaceProps {
  mode: "resume" | "interview";
}

export default function ChatInterface({ mode }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Check if user is authenticated
  useEffect(() => {
    const user = localStorage.getItem("careerAI-user");
    if (!user) {
      navigate("/");
    }
  }, [navigate]);

  // Initial greeting message
  useEffect(() => {
    const initialMessage = {
      id: generateId(),
      content: mode === "resume" 
        ? "Hello! I'm your AI resume builder. To generate a resume, please provide a job description and I'll create a customized resume based on your profile information."
        : "Hello! I'm your AI interview coach. To start a mock interview, please provide a job description and I'll simulate an interview for that position.",
      type: "ai",
      timestamp: new Date(),
      category: "general"
    };
    
    setMessages([initialMessage]);
  }, [mode]);

  // Auto-scroll to the bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message
    const userMessage: MessageType = {
      id: generateId(),
      content: input,
      type: "user",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsProcessing(true);
    
    // Add typing indicator
    const typingIndicatorId = generateId();
    setMessages(prev => [...prev, { 
      id: typingIndicatorId, 
      content: "",
      type: "ai", 
      timestamp: new Date(),
      isTyping: true 
    }]);
    
    try {
      // Simulate API call to AI service
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId));
      
      // Build response based on mode
      let aiResponse = "";
      let responseFormat: "text" | "resume" | "feedback" = "text";
      
      if (mode === "resume") {
        if (input.toLowerCase().includes("job description") || input.toLowerCase().includes("position")) {
          aiResponse = `Based on the job description you provided, I've generated a customized resume that highlights your relevant skills and experience. Here's a preview:

## PROFESSIONAL SUMMARY
Dedicated professional with 5+ years of experience in software development and project management. Proven track record of delivering high-quality solutions while meeting tight deadlines. Expert in JavaScript, React, and Node.js with strong communication and leadership skills.

## WORK EXPERIENCE
**Senior Software Developer | ABC Tech | 2020-Present**
- Led a team of 5 developers to deliver a customer-facing web application that increased user engagement by 40%
- Implemented CI/CD pipelines that reduced deployment time by 60%
- Mentored junior developers, contributing to 30% improvement in team productivity

**Software Developer | XYZ Solutions | 2017-2020**
- Developed and maintained multiple web applications using React, Node.js, and MongoDB
- Collaborated with UX/UI designers to implement responsive designs that improved user experience
- Reduced application load time by 45% through code optimization and implementing lazy loading

## EDUCATION
**Master of Computer Science | University of Technology | 2017**
**Bachelor of Computer Science | State University | 2015**

## SKILLS
JavaScript, TypeScript, React, Node.js, Express, MongoDB, AWS, Docker, Git, Agile Methodologies`;
          responseFormat = "resume";
        } else {
          aiResponse = "To create a customized resume, please provide a job description. For example: 'I need a resume for a Senior Software Developer position at a tech startup.'";
        }
      } else if (mode === "interview") {
        if (input.toLowerCase().includes("job description") || input.toLowerCase().includes("position")) {
          aiResponse = "Great! I'll be your interviewer for this mock interview session. Let's get started with the first question:\n\nCan you walk me through your background and how it relates to this position?";
        } else if (input.length > 50) {
          aiResponse = "Thank you for your detailed response. Here's my next question:\n\nDescribe a challenging project you worked on and how you overcame obstacles to deliver successful results.";
        } else {
          aiResponse = "Could you elaborate a bit more? Providing detailed answers showcases your experience and communication skills to interviewers.";
          responseFormat = "feedback";
        }
      }
      
      // Add AI response
      const aiMessage: MessageType = {
        id: generateId(),
        content: aiResponse,
        type: "ai",
        timestamp: new Date(),
        format: responseFormat
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsProcessing(false);
      
    } catch (error) {
      // Remove typing indicator
      setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId));
      
      // Add error message
      setMessages(prev => [...prev, {
        id: generateId(),
        content: "Sorry, I encountered an error. Please try again.",
        type: "ai",
        timestamp: new Date()
      }]);
      
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
      
      setIsProcessing(false);
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard.",
    });
  };

  const downloadAsText = (content: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Download started",
      description: `${filename} is being downloaded.`,
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="chat-container p-4 flex-grow">
        {messages.map((message) => (
          <ChatMessage 
            key={message.id} 
            message={message} 
            onCopy={() => copyToClipboard(message.content)}
            onDownload={() => downloadAsText(message.content, `${mode === "resume" ? "resume" : "interview"}_${new Date().toISOString().split('T')[0]}.txt`)}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleMessageSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "resume" 
              ? "Describe the job you're applying for..." 
              : "Type your interview response..."}
            disabled={isProcessing}
            className="flex-grow"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button type="submit" size="icon" disabled={isProcessing || !input.trim()}>
                  {isProcessing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Send message</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </form>
    </div>
  );
}
