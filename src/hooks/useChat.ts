
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  createConversation, 
  saveMessage,
  getConversationMessages,
  getOrCreateConversation
} from "@/services/conversationService";
import { getUserProfile, ProfileData } from "@/services/profileService";
import type { MessageType } from "@/components/Chat/ChatInterface";

const generateId = () => Math.random().toString(36).substring(2, 11);

export function useChat(mode: "resume" | "interview", externalProfile?: ProfileData) {
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(externalProfile || null);
  const [isProfileLoading, setIsProfileLoading] = useState(!externalProfile);
  const [isMessagesLoading, setIsMessagesLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Fetch session data
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

  // Check authentication
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

  // Fetch user profile data if not provided externally
  useEffect(() => {
    if (externalProfile) {
      // If profile is provided externally, use it directly
      setProfileData(externalProfile);
      setIsProfileLoading(false);
      return;
    }
    
    if (!isSessionLoading && sessionData?.session) {
      const fetchProfile = async () => {
        setIsProfileLoading(true);
        try {
          const profile = await getUserProfile();
          if (profile) {
            console.log("Profile loaded for chat:", profile.fullName);
            setProfileData(profile);
          } else {
            console.log("No profile data available");
            toast({
              title: "Profile recommended",
              description: "For personalized advice, please complete your profile.",
            });
          }
        } catch (error) {
          console.error("Failed to fetch profile:", error);
        } finally {
          setIsProfileLoading(false);
        }
      };
      
      fetchProfile();
    }
  }, [sessionData, isSessionLoading, toast, externalProfile]);

  // Initialize conversation and load messages
  useEffect(() => {
    if (isSessionLoading || !sessionData?.session || isProfileLoading) return;
    
    async function initConversationAndMessages() {
      try {
        setIsMessagesLoading(true);
        console.log("Getting or creating conversation");
        
        // Get existing conversation or create new one
        const convoId = await getOrCreateConversation(mode);
        setConversationId(convoId);
        console.log("Using conversation ID:", convoId);
        
        // Load existing messages
        const existingMessages = await getConversationMessages(convoId);
        
        if (existingMessages && existingMessages.length > 0) {
          console.log("Loaded existing messages:", existingMessages.length);
          setMessages(existingMessages);
          setIsMessagesLoading(false);
          return;
        }
        
        // Otherwise, create initial greeting message
        setIsMessagesLoading(false);
        createInitialGreeting(convoId);
        
      } catch (error) {
        console.error("Failed during conversation initialization:", error);
        toast({
          title: "Error",
          description: "Failed to initialize chat. Please try again.",
          variant: "destructive",
        });
        setIsMessagesLoading(false);
      }
    }
    
    initConversationAndMessages();
  }, [sessionData, isSessionLoading, isProfileLoading, mode]);

  // Helper function to create initial greeting
  const createInitialGreeting = async (convoId: string) => {
    if (!profileData) return;
    
    const greetingName = profileData.fullName ? `, ${profileData.fullName.split(' ')[0]}` : '';
    const resumeStatus = profileData.resumeText ? " I see you've uploaded a resume, which I'll reference in my advice." : "";
    
    const initialMessage: MessageType = {
      id: generateId(),
      content: mode === "resume" 
        ? `Hello${greetingName}! I'm your AI career coach.${resumeStatus} I can help you with resume writing, career transitions, and professional development. How can I assist you today?`
        : `Hello${greetingName}! I'm your AI interview coach.${resumeStatus} I can help you prepare for interviews and provide feedback on your responses. Would you like to start a mock interview?`,
      type: "ai",
      timestamp: new Date(),
      format: "text"
    };
    
    console.log("Setting initial message with greeting");
    setMessages([initialMessage]);
    
    if (convoId) {
      saveMessage(convoId, initialMessage).catch(error => {
        console.error("Failed to save initial message:", error);
      });
    }
  };

  const handleMessageSubmit = async (messageContent: string) => {
    if (!conversationId) {
      console.error("No conversation ID available");
      toast({
        title: "Error",
        description: "Chat session not initialized. Please refresh the page.",
        variant: "destructive",
      });
      return;
    }
    
    const userMessage: MessageType = {
      id: generateId(),
      content: messageContent,
      type: "user",
      timestamp: new Date(),
      format: "text"
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      console.log("Saving user message to conversation:", conversationId);
      await saveMessage(conversationId, userMessage);
      
      const typingIndicatorId = generateId();
      setMessages(prev => [...prev, { 
        id: typingIndicatorId, 
        content: "",
        type: "ai", 
        timestamp: new Date(),
        isTyping: true 
      }]);

      console.log("Sending to career-chat with profile data:", !!profileData);
      const response = await supabase.functions.invoke('career-chat', {
        body: { 
          messages: [...messages, userMessage], 
          conversationId,
          profileData 
        }
      });

      if (response.error) {
        console.error("Error from career-chat function:", response.error);
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
      
      console.log("Received AI response, updating messages");
      setMessages(prev => [...prev, aiMessage]);
      
      // Save AI response to the conversation
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
    isProfileLoading,
    isMessagesLoading,
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
