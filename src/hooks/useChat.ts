
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  createConversation, 
  saveMessage 
} from "@/services/resumeService";
import { getUserProfile, ProfileData } from "@/services/profileService";
import type { MessageType } from "@/components/Chat/ChatInterface";

const generateId = () => Math.random().toString(36).substring(2, 11);

export function useChat(mode: "resume" | "interview") {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
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

  // Fetch user profile data
  useEffect(() => {
    if (sessionData?.session) {
      const fetchProfile = async () => {
        try {
          const profile = await getUserProfile();
          if (profile) {
            setProfileData(profile);
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        }
      };
      
      fetchProfile();
    }
  }, [sessionData]);

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
    const greetingName = profileData?.fullName ? `, ${profileData.fullName.split(' ')[0]}` : '';
    
    const initialMessage: MessageType = {
      id: generateId(),
      content: mode === "resume" 
        ? `Hello${greetingName}! I'm your AI career coach powered by LangChain. I can help you with resume writing, career transitions, and professional development. How can I assist you today?`
        : `Hello${greetingName}! I'm your AI interview coach powered by LangChain. I can help you prepare for interviews and provide feedback on your responses. Would you like to start a mock interview?`,
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
  }, [mode, conversationId, profileData]);

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
      
      const typingIndicatorId = generateId();
      setMessages(prev => [...prev, { 
        id: typingIndicatorId, 
        content: "",
        type: "ai", 
        timestamp: new Date(),
        isTyping: true 
      }]);

      const response = await supabase.functions.invoke('career-chat', {
        body: { 
          messages: [...messages, userMessage], 
          conversationId,
          profileData 
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setMessages(prev => prev.filter(msg => msg.id !== typingIndicatorId));
      
      const aiMessage: MessageType = {
        id: generateId(),
        content: response.data.reply,
        type: "ai",
        timestamp: new Date(),
        format: "text"
      };
      
      setMessages(prev => [...prev, aiMessage]);
      await saveMessage(conversationId, aiMessage);
      
    } catch (error) {
      console.error("Error processing message:", error);
      setMessages(prev => 
        prev.filter(msg => !msg.isTyping)
      );
      
      toast({
        title: "Error",
        description: "Failed to process your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    messages,
    isProcessing,
    conversationId,
    profileData,
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
