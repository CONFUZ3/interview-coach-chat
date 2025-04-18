
import { supabase } from "@/integrations/supabase/client";
import type { MessageType } from "@/components/Chat/ChatInterface";

export async function createConversation() {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session?.user) {
      throw new Error("Authentication required");
    }
    
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        user_id: sessionData.session.user.id
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Failed to create conversation:", error);
    throw error;
  }
}

export async function saveMessage(conversationId: string, message: MessageType) {
  try {
    // The format field is nullable, so we don't need to include it if not provided
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
    
    return true;
  } catch (error) {
    console.error("Failed to save message:", error);
    throw error;
  }
}

export async function saveResume(userId: string, conversationId: string, content: string) {
  try {
    const { error } = await supabase
      .from('resumes')
      .insert({
        user_id: userId,
        conversation_id: conversationId,
        content: content
      });
    
    if (error) {
      console.error("Error saving resume:", error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Failed to save resume:", error);
    throw error;
  }
}
