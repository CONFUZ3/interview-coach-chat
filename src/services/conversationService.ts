import { supabase } from "@/integrations/supabase/client";
import type { MessageType } from "@/components/Chat/ChatInterface";

export async function createConversation(mode: "resume" | "interview" = "resume") {
  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error("Session error:", sessionError);
      throw new Error("Authentication error");
    }
    
    if (!sessionData.session?.user) {
      console.error("No active session found");
      throw new Error("Authentication required");
    }
    
    console.log("Creating new conversation for user:", sessionData.session.user.id);
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: sessionData.session.user.id,
        type: mode
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating conversation:", error);
      throw error;
    }
    
    console.log("Conversation created with ID:", data.id);
    return data;
  } catch (error) {
    console.error("Failed to create conversation:", error);
    throw error;
  }
}

export async function saveMessage(conversationId: string, message: MessageType) {
  try {
    console.log(`Saving ${message.type} message to conversation ${conversationId}`);
    
    const messageData: any = {
      conversation_id: conversationId,
      type: message.type,
      content: message.content
    };
    
    // Only add format if it exists
    if (message.format) {
      messageData.format = message.format;
    }
    
    const { error } = await supabase
      .from('messages')
      .insert(messageData);
    
    if (error) {
      console.error("Error saving message:", error);
      throw error;
    }
    
    console.log("Message saved successfully");
    return true;
  } catch (error) {
    console.error("Failed to save message:", error);
    throw error;
  }
}

export async function getConversationMessages(conversationId: string): Promise<MessageType[]> {
  try {
    console.log(`Fetching messages for conversation ${conversationId}`);
    
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }
    
    console.log(`Retrieved ${data.length} messages`);
    
    // Convert to MessageType format
    return data.map(msg => ({
      id: msg.id,
      content: msg.content,
      type: msg.type as 'user' | 'ai',
      timestamp: new Date(msg.created_at),
      format: msg.format as 'text' | 'feedback' | undefined
    }));
  } catch (error) {
    console.error("Failed to fetch conversation messages:", error);
    throw error;
  }
}

export async function getUserConversations(mode: "resume" | "interview" = "resume"): Promise<any[]> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      throw new Error("Authentication required");
    }
    
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', sessionData.session.user.id)
      .eq('type', mode)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching conversations:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return [];
  }
}

export async function getOrCreateConversation(mode: "resume" | "interview" = "resume"): Promise<string> {
  try {
    // Try to get existing conversations
    const conversations = await getUserConversations(mode);
    
    // If there's a recent conversation, use it
    if (conversations && conversations.length > 0) {
      return conversations[0].id;
    }
    
    // Otherwise create a new conversation
    const newConversation = await createConversation(mode);
    return newConversation.id;
  } catch (error) {
    console.error("Failed to get or create conversation:", error);
    throw error;
  }
}
