
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  createConversation, 
  saveMessage, 
  getUserProfile,
} from "@/services/resumeService";
import type { MessageType } from "@/components/Chat/ChatInterface";

const generateId = () => Math.random().toString(36).substring(2, 11);

export function useChat(mode: "resume" | "interview") {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Improved authentication handling
  const { data: sessionData, isLoading: isSessionLoading } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error);
        throw error;
      }
      return data;
    },
  });

  // Setup auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (event === 'SIGNED_OUT') {
          navigate("/");
        }
      }
    );
    
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (isSessionLoading) return;
    
    if (!sessionData?.session) {
      navigate("/");
      toast({
        title: "Authentication required",
        description: "Please sign in to use this feature.",
        variant: "destructive",
      });
    }
  }, [sessionData, isSessionLoading, navigate, toast]);

  useEffect(() => {
    if (sessionData?.session) {
      async function initConversation() {
        try {
          const conversation = await createConversation();
          if (conversation && conversation.id) {
            setConversationId(conversation.id);
          }
        } catch (error) {
          console.error("Failed to create conversation:", error);
          toast({
            title: "Error",
            description: "Failed to initialize chat. Please try again.",
            variant: "destructive",
          });
        }
      }
      
      initConversation();
    }
  }, [sessionData, toast]);

  useEffect(() => {
    const initialMessage: MessageType = {
      id: generateId(),
      content: mode === "resume" 
        ? "Hello! I'm your AI career coach. I can help with resume advice, interview preparation, career transitions, and more. What career guidance can I provide for you today?"
        : "Hello! I'm your AI interview coach. To start a mock interview, please provide a job description and I'll simulate an interview for that position.",
      type: "ai",
      timestamp: new Date(),
      category: "general"
    };
    
    setMessages([initialMessage]);
    
    if (conversationId) {
      saveMessage(conversationId, initialMessage).catch(error => {
        console.error("Failed to save initial message:", error);
      });
    }
  }, [mode, conversationId]);

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to clipboard",
      description: "Content has been copied to your clipboard.",
    });
  };

  const handleMessageSubmit = async (messageContent: string) => {
    if (!conversationId) return;
    
    const userMessage: MessageType = {
      id: generateId(),
      content: messageContent,
      type: "user",
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      await saveMessage(conversationId, userMessage);
    } catch (error) {
      console.error("Failed to save user message:", error);
    }
    
    const typingIndicatorId = generateId();
    setMessages(prev => [...prev, { 
      id: typingIndicatorId, 
      content: "",
      type: "ai", 
      timestamp: new Date(),
      isTyping: true 
    }]);
    
    try {
      if (mode === "resume") {
        const profile = await getUserProfile();
        
        // Generate career coaching response
        let aiResponse = "";
        
        if (messageContent.toLowerCase().includes("resume") || messageContent.toLowerCase().includes("cv")) {
          aiResponse = "When improving your resume, focus on quantifiable achievements rather than just listing duties. Use the STAR method (Situation, Task, Action, Result) to highlight your impact. Tailor your resume for each job application by matching keywords from the job description. What specific part of your resume would you like help with?";
        } else if (messageContent.toLowerCase().includes("interview")) {
          aiResponse = "Preparing for interviews involves researching the company, practicing common questions, and preparing your own questions to ask. The STAR method is useful here too for structuring answers about your experience. Would you like specific interview tips for your industry or role?";
        } else if (messageContent.toLowerCase().includes("career change") || messageContent.toLowerCase().includes("transition")) {
          aiResponse = "Career transitions can be challenging but rewarding. Start by identifying transferable skills from your current role. Consider what additional skills or certifications you might need. Networking is crucial - connect with professionals in your target field. What specific career change are you considering?";
        } else {
          aiResponse = "That's a great question about your career development. To provide more tailored advice, could you share a bit more about your current role, experience level, and specific career goals? This will help me give you more relevant guidance.";
        }
        
        setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId));
        
        const aiMessage: MessageType = {
          id: generateId(),
          content: aiResponse,
          type: "ai",
          timestamp: new Date(),
          format: "text"
        };
        
        setMessages(prev => [...prev, aiMessage]);
        await saveMessage(conversationId, aiMessage);
      } else if (mode === "interview") {
        setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId));
        
        let aiResponse = "";
        let responseFormat: "text" | "feedback" = "text";
        
        if (messageContent.toLowerCase().includes("job description") || messageContent.toLowerCase().includes("position")) {
          aiResponse = "Great! I'll be your interviewer for this mock interview session. Let's get started with the first question:\n\nCan you walk me through your background and how it relates to this position?";
        } else if (messageContent.length > 50) {
          aiResponse = "Thank you for your detailed response. Here's my next question:\n\nDescribe a challenging project you worked on and how you overcame obstacles to deliver successful results.";
        } else {
          aiResponse = "Could you elaborate a bit more? Providing detailed answers showcases your experience and communication skills to interviewers.";
          responseFormat = "feedback";
        }
        
        const aiMessage: MessageType = {
          id: generateId(),
          content: aiResponse,
          type: "ai",
          timestamp: new Date(),
          format: responseFormat
        };
        
        setMessages(prev => [...prev, aiMessage]);
        await saveMessage(conversationId, aiMessage);
      }
      
      setIsProcessing(false);
    } catch (error) {
      console.error("Error processing message:", error);
      
      setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId));
      
      const errorMessage: MessageType = {
        id: generateId(),
        content: "Sorry, I encountered an error. Please try again.",
        type: "ai",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      try {
        await saveMessage(conversationId, errorMessage);
      } catch (saveError) {
        console.error("Failed to save error message:", saveError);
      }
      
      toast({
        title: "Error",
        description: "Failed to process your request. Please try again.",
        variant: "destructive",
      });
      
      setIsProcessing(false);
    }
  };

  return {
    messages,
    isProcessing,
    conversationId,
    handleMessageSubmit,
    copyToClipboard: (content: string) => {
      navigator.clipboard.writeText(content);
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied to your clipboard.",
      });
    },
  };
}
