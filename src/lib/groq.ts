import { supabase } from './supabase'

export interface AIChatMessage {
  role?: 'system' | 'user' | 'assistant'
  sender?: string
  text: string
  sources?: string[]
}

export interface AIResponse {
  content: string
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

/**
 * Sends a query to the secure server-side Groq proxy (ai-query Supabase Edge Function).
 * Falls back to throwing an error if Supabase is not configured, which can be caught to trigger local simulation.
 */
export async function queryAI(
  messages: AIChatMessage[],
  systemPrompt?: string,
  context?: Record<string, any>
): Promise<AIResponse> {
  // If Supabase Url is the placeholder (meaning not configured locally), fail immediately to trigger local mock response.
  const isPlaceholder = import.meta.env.VITE_SUPABASE_URL === undefined || 
                        import.meta.env.VITE_SUPABASE_URL === '' || 
                        import.meta.env.VITE_SUPABASE_URL.includes('placeholder-project')

  if (isPlaceholder) {
    throw new Error('Supabase client is not configured. Running in offline/demo mode.')
  }

  // Call Supabase Edge Function proxy
  const { data, error } = await supabase.functions.invoke('ai-query', {
    body: {
      messages: messages.map(m => ({
        role: m.role || (m.sender === 'user' ? 'user' : 'assistant'),
        content: m.text
      })),
      systemPrompt,
      context
    }
  })

  if (error) {
    throw new Error(error.message || 'Failed to query AI copilot proxy')
  }

  if (!data || typeof data.content !== 'string') {
    throw new Error('Invalid response received from AI copilot proxy')
  }

  return data as AIResponse;
}
