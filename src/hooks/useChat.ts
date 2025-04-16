
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  generateResumeWithAI, 
  createConversation, 
  saveMessage, 
  saveResume, 
  getUserProfile,
  generatePDF
} from "@/services/resumeService";
import type { MessageType } from "@/components/Chat/ChatInterface";

const generateId = () => Math.random().toString(36).substring(2, 11);

export function useChat(mode: "resume" | "interview") {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [lastGeneratedResume, setLastGeneratedResume] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { data: session } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/");
        toast({
          title: "Authentication required",
          description: "Please sign in to use this feature.",
          variant: "destructive",
        });
      }
    };
    
    checkAuth();
  }, [navigate, toast]);

  useEffect(() => {
    if (session?.user) {
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
  }, [session, toast]);

  useEffect(() => {
    const initialMessage: MessageType = {
      id: generateId(),
      content: mode === "resume" 
        ? "Hello! I'm your AI resume builder. To generate a resume, please provide a job description and I'll create a customized resume based on your profile information. You can download your resume as a PDF file when it's ready."
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

  const downloadAsPDF = async () => {
    if (!lastGeneratedResume) {
      toast({
        title: "No resume to download",
        description: "Please generate a resume first before downloading as PDF.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const profile = await getUserProfile();
      if (!profile) {
        toast({
          title: "Profile information missing",
          description: "Please complete your profile information before downloading a PDF.",
          variant: "destructive",
        });
        return;
      }
      
      const pdfBlob = generatePDF(lastGeneratedResume, profile);
      
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const element = document.createElement("a");
      element.href = pdfUrl;
      element.download = `${profile.fullName.replace(/\s+/g, '_')}_resume_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      
      toast({
        title: "PDF download started",
        description: "Your customized resume is being downloaded as a PDF file.",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "PDF Generation Error",
        description: "There was a problem generating your PDF. Please try again.",
        variant: "destructive",
      });
    }
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
        if (!profile || !profile.fullName) {
          setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId));
          
          const noProfileMessage: MessageType = {
            id: generateId(),
            content: "I notice that your profile information is incomplete. To create the best resume, please complete your profile first. Go to the Profile page to add your education, experience, and skills.",
            type: "ai",
            timestamp: new Date(),
            category: "general"
          };
          
          setMessages(prev => [...prev, noProfileMessage]);
          await saveMessage(conversationId, noProfileMessage);
          setIsProcessing(false);
          return;
        }
        
        const result = await generateResumeWithAI(messageContent);
        const resumeContent = result.resumeText;
        
        setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId));
        setLastGeneratedResume(resumeContent);
        
        const aiMessage: MessageType = {
          id: generateId(),
          content: resumeContent,
          type: "ai",
          timestamp: new Date(),
          format: "resume"
        };
        
        setMessages(prev => [...prev, aiMessage]);
        await saveMessage(conversationId, aiMessage);
        
        if (session?.user) {
          await saveResume(session.user.id, conversationId, resumeContent);
        }
      } else if (mode === "interview") {
        setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId));
        
        let aiResponse = "";
        let responseFormat: "text" | "resume" | "feedback" = "text";
        
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
    lastGeneratedResume,
    conversationId,
    handleMessageSubmit,
    copyToClipboard,
    downloadAsText,
    downloadAsPDF
  };
}
