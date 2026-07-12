import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// In-memory rate limiting map: userId -> { count, windowStart }
const rateLimitMap = new Map<string, { count: number; windowStart: number }>()

serve(async (req) => {
  // Handle CORS OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase Client to verify the token
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    })

    // Get user using the token
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid or expired Authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Rate Limiting: 10 requests per user per minute
    const userId = user.id
    const now = Date.now()
    const limit = 10
    const windowMs = 60 * 1000

    let rateLimit = rateLimitMap.get(userId)
    if (!rateLimit || now - rateLimit.windowStart > windowMs) {
      rateLimit = { count: 1, windowStart: now }
      rateLimitMap.set(userId, rateLimit)
    } else {
      rateLimit.count++
      if (rateLimit.count > limit) {
        return new Response(JSON.stringify({ error: 'Too many requests. Rate limit exceeded (10 reqs/min).' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    // Parse request body
    const body = await req.json()
    const { messages, systemPrompt, context } = body

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: 'Invalid or missing messages array' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Retrieve Groq API Key
    const groqApiKey = Deno.env.get('GROQ_API_KEY')
    if (!groqApiKey) {
      return new Response(JSON.stringify({ error: 'Groq API Key is not configured on the server' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call Groq API
    const formattedMessages = []
    
    // Inject system instructions + context
    const fullSystemInstruction = `${systemPrompt || 'You are an ESG AI Assistant.'}\n\nContext Details:\n${JSON.stringify(context || {})}`
    formattedMessages.push({ role: 'system', content: fullSystemInstruction })
    
    // Append actual conversation messages
    messages.forEach((m: any) => {
      formattedMessages.push({ role: m.role || (m.sender === 'user' ? 'user' : 'assistant'), content: m.text || m.content })
    })

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: formattedMessages,
        temperature: 0.2,
      }),
    })

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text()
      return new Response(JSON.stringify({ error: `Groq API responded with status ${groqResponse.status}: ${errorText}` }), {
        status: groqResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const groqData = await groqResponse.json()
    const content = groqData.choices?.[0]?.message?.content || ''
    const usage = groqData.usage || {}

    return new Response(JSON.stringify({ content, usage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
