
import { supabase } from "@/integrations/supabase/client";
import type { MessageType } from "@/components/Chat/ChatInterface";

export async function createConversation() {
  const { data } = await supabase.auth.getSession();
  const userId = data?.session?.user?.id;
  
  if (!userId) {
    throw new Error("User must be logged in to create a conversation");
  }
  
  const result = await supabase
    .from('conversations')
    .insert([{ user_id: userId }])
    .select();

  if (result.error) {
    console.error("Error creating conversation:", result.error);
    throw result.error;
  }

  return result.data[0];
}

export async function saveMessage(conversationId: string, message: MessageType) {
  const result = await supabase
    .from('messages')
    .insert([{
      conversation_id: conversationId,
      content: message.content,
      type: message.type,
      format: message.format || 'text'
    }]);

  if (result.error) {
    console.error("Error saving message:", result.error);
    throw result.error;
  }
}

export async function saveResume(userId: string, conversationId: string, content: string, jobTitle?: string, company?: string) {
  const result = await supabase
    .from('resumes')
    .insert([{
      user_id: userId,
      conversation_id: conversationId,
      content,
      job_title: jobTitle,
      company
    }]);

  if (result.error) {
    console.error("Error saving resume:", result.error);
    throw result.error;
  }
}
