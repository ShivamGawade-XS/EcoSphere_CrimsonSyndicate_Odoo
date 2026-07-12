import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

export interface AuthResult {
  userId: string
  orgId: string | null
  role: string | null
  supabase: ReturnType<typeof createClient>
}

/**
 * Verifies the Supabase JWT from the Authorization header and extracts user context.
 * Throws an error with an appropriate HTTP status if auth fails.
 */
export async function verifyJWT(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw Object.assign(new Error('Missing or malformed Authorization header'), { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  // Verify the token signature by calling getUser
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    throw Object.assign(new Error('Invalid or expired token'), { status: 401 })
  }

  // Decode JWT payload for custom claims without needing the secret
  const token = authHeader.replace('Bearer ', '')
  let orgId: string | null = null
  let role: string | null = null

  try {
    const payloadBase64 = token.split('.')[1]
    const paddedPayload = payloadBase64 + '='.repeat((4 - payloadBase64.length % 4) % 4)
    const payload = JSON.parse(atob(paddedPayload))
    orgId = payload.org_id
      ?? payload.user_metadata?.org_id
      ?? user.user_metadata?.org_id
      ?? null
    role = payload.role
      ?? payload.user_metadata?.role
      ?? user.user_metadata?.role
      ?? null
  } catch {
    // Non-critical: org_id will be fetched from DB if needed
  }

  return { userId: user.id, orgId, role, supabase }
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** Build a standardised error JSON response */
export function errorResponse(
  message: string,
  code: string,
  status: number,
  field?: string
) {
  return new Response(
    JSON.stringify({ success: false, error: { code, message, ...(field ? { field } : {}) } }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/** Build a success JSON response */
export function successResponse(data: unknown, status = 200) {
  return new Response(
    JSON.stringify({ success: true, data }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

/** Strip basic HTML tags from a string */
export function stripHtml(raw: string): string {
  return raw.replace(/<[^>]*>/g, '').trim()
}
