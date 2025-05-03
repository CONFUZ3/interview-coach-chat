
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { ChatOpenAI } from "npm:@langchain/openai";
import { ConversationChain } from "npm:langchain/chains";
import { BufferMemory } from "npm:langchain/memory";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, conversationId, profileData } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    console.log("Processing chat request with conversation ID:", conversationId);
    
    // Enhanced resume processing
    let resumeContext = '';
    if (profileData) {
      console.log("Profile data available:", {
        name: profileData.fullName,
        hasResume: profileData.resumeText !== undefined && profileData.resumeText !== ''
      });
      
      // If resume text is available, use it for context
      if (profileData.resumeText && profileData.resumeText.trim().length > 0) {
        console.log("Resume available, length:", profileData.resumeText.length);
        resumeContext = `
        The user has uploaded a resume. Here are the key details:
        ---
        ${profileData.resumeText.length > 1000 
          ? profileData.resumeText.substring(0, 1000) + "... [resume content truncated for brevity]" 
          : profileData.resumeText}
        ---
        Please reference specific details from their resume when providing career advice or answering questions.`;
      } else {
        console.log("No resume uploaded by user");
        resumeContext = 'The user has not uploaded a resume yet.';
      }
    } else {
      console.log("No profile data provided");
    }

    const llm = new ChatOpenAI({
      openAIApiKey,
      modelName: "gpt-4o-mini",
      temperature: 0.7,
    });

    // Configure memory to retain conversation history
    const memory = new BufferMemory({
      returnMessages: true,
      memoryKey: "history",
    });

    // Load previous messages into memory
    if (messages && messages.length > 0) {
      console.log(`Loading ${messages.length} previous messages into memory`);
      for (const msg of messages) {
        await memory.saveContext(
          { input: msg.content },
          { output: msg.type === 'ai' ? msg.content : '' }
        );
      }
    }

    const chain = new ConversationChain({
      llm,
      memory,
      verbose: true,
    });

    const lastMessage = messages[messages.length - 1];
    
    // Always include profile context for better personalization
    let contextAwareInput = lastMessage.content;
    
    // Add profile context if available with special emphasis on resume
    if (profileData) {
      // Create comprehensive user profile context
      const profileContext = `
      User Profile Information:
      Name: ${profileData.fullName || 'not provided'}
      Email: ${profileData.email || 'not provided'}
      Phone: ${profileData.phone || 'not provided'}
      ${resumeContext}
      
      Based on this profile information, provide personalized career advice for the following query: ${lastMessage.content}
      `;
      
      // For the first few messages, include the profile context explicitly
      if (messages.length <= 3) {
        contextAwareInput = profileContext;
      } else {
        // For later messages, just append a reminder about personalization
        contextAwareInput = `Remember to reference specific details from ${profileData.fullName || 'the user'}'s resume when responding. Query: ${lastMessage.content}`;
      }
    }

    console.log("Sending to LLM with context-aware input");
    const response = await chain.call({
      input: contextAwareInput,
    });

    console.log("Response received from LLM");
    return new Response(JSON.stringify({
      reply: response.response,
      conversationId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in career-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
