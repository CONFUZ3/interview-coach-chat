
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
    const { messages, conversationId } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not found');
    }

    const llm = new ChatOpenAI({
      openAIApiKey,
      modelName: "gpt-4o-mini",
      temperature: 0.7,
    });

    const memory = new BufferMemory({
      returnMessages: true,
      memoryKey: "history",
    });

    // Load previous messages into memory
    if (messages && messages.length > 0) {
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
    const response = await chain.call({
      input: lastMessage.content,
    });

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
