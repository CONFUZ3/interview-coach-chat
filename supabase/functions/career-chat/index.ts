
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
    
    // Log profile data availability for debugging
    if (profileData) {
      console.log("Profile data available:", {
        name: profileData.fullName,
        email: profileData.email !== undefined,
        phone: profileData.phone !== undefined,
        hasResume: profileData.resumeText !== undefined && profileData.resumeText !== ''
      });
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
      let resumeContext = '';
      
      // If resume text is available, include a summary
      if (profileData.resumeText && profileData.resumeText.trim().length > 0) {
        resumeContext = `
        The user has previously uploaded a resume with the following content:
        ---
        ${profileData.resumeText.length > 500 
          ? profileData.resumeText.substring(0, 500) + "... [resume content truncated]" 
          : profileData.resumeText}
        ---
        Please provide advice that takes into account their resume information.`;
      } else {
        resumeContext = 'No resume has been uploaded yet.';
      }
      
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
        contextAwareInput = `Remember to personalize your response for ${profileData.fullName || 'the user'} based on their profile and resume information. Query: ${lastMessage.content}`;
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
