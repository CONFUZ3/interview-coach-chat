
import { supabase } from "@/integrations/supabase/client";
import type { MessageType } from "@/components/Chat/ChatInterface";

export async function createConversation() {
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
        user_id: sessionData.session.user.id
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
    
    const messageData = {
      conversation_id: conversationId,
      type: message.type,
      content: message.content
    };
    
    // Only add format if it exists
    if (message.format) {
      Object.assign(messageData, { format: message.format });
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
