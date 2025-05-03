
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
    let systemPrompt = `You are a helpful career coach AI assistant specializing in career advice, resume feedback, and job search strategies. 
    Respond clearly and concisely, and provide actionable advice. When appropriate, reference specific details from the user's background.`;
    
    if (profileData) {
      console.log("Profile data available:", {
        name: profileData.fullName,
        hasResume: profileData.resumeText !== undefined && profileData.resumeText !== ''
      });
      
      // If resume text is available, use it for context
      if (profileData.resumeText && profileData.resumeText.trim().length > 0) {
        console.log("Resume available, length:", profileData.resumeText.length);
        
        // Process resume text - truncate if necessary but still provide useful context
        const resumeLength = profileData.resumeText.length;
        const truncatedResume = resumeLength > 2000 
          ? profileData.resumeText.substring(0, 2000) + "... [resume content truncated]"
          : profileData.resumeText;
          
        resumeContext = `
        USER RESUME:
        ---
        ${truncatedResume}
        ---
        
        When answering, refer to specific details from the user's resume when relevant. 
        For example, mention their skills, experience, or education when providing advice.`;
        
        // Enhance system prompt with resume knowledge
        systemPrompt += `\n\nThe user has shared their resume with you. Use the resume details to provide personalized advice. 
        Refer to specific elements of their background when appropriate.`;
      } else {
        console.log("No resume uploaded by user");
        resumeContext = 'Note: The user has not uploaded a resume yet.';
        
        // Modify system prompt to encourage resume sharing
        systemPrompt += `\n\nThe user has not shared a resume yet. Where appropriate, you may suggest they upload a resume for more personalized advice.`;
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
        if (msg.type === 'user' || msg.type === 'ai') {
          await memory.saveContext(
            { input: msg.type === 'user' ? msg.content : '' },
            { output: msg.type === 'ai' ? msg.content : '' }
          );
        }
      }
    }

    const chain = new ConversationChain({
      llm,
      memory,
      verbose: true,
    });

    // Get the last user message
    const lastMessage = messages[messages.length - 1];
    
    // Combine user query with context
    let userInput = lastMessage.content;
    
    // For very first user message, add the resume context
    if (resumeContext && messages.filter(m => m.type === 'user').length <= 1) {
      userInput = `${resumeContext}\n\nUser query: ${lastMessage.content}`;
      
      // Add system message directly to the LLM call
      llm.invocationParams.messages = [
        {
          role: "system",
          content: systemPrompt
        }
      ];
    } 
    // For subsequent messages, add a reminder of context if available
    else if (profileData?.resumeText) {
      userInput = `Remember to reference my background when relevant. My query is: ${lastMessage.content}`;
    }

    console.log("Sending to LLM with context-aware input");
    const response = await chain.call({
      input: userInput,
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
