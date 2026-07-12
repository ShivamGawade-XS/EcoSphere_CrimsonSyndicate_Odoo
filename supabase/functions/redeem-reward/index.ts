import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "npm:zod@3.22.4"
import { verifyJWT, errorResponse, successResponse, corsHeaders } from "../_shared/auth.ts"

// ─── Zod Validation Schema ────────────────────────────────────────────────────
const RedeemSchema = z.object({
  reward_id: z.string().uuid({ message: "reward_id must be a valid UUID" }),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify JWT and extract auth context
    const { userId, orgId, supabase } = await verifyJWT(req)

    if (!orgId) {
      return errorResponse('User does not belong to an organization', 'NO_ORG', 403)
    }

    // 2. Parse and validate request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_BODY', 400)
    }

    const parseResult = RedeemSchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]
      return errorResponse(firstError.message, 'VALIDATION_ERROR', 400, firstError.path.join('.'))
    }

    const { reward_id } = parseResult.data

    // 3. Check for existing pending/fulfilled redemption (prevent duplicate redemption)
    const { data: existingRedemption } = await supabase
      .from('reward_redemptions')
      .select('id, status')
      .eq('employee_id', userId)
      .eq('reward_id', reward_id)
      .in('status', ['pending', 'fulfilled'])
      .maybeSingle()

    if (existingRedemption) {
      return errorResponse(
        `You have already redeemed this reward (status: ${existingRedemption.status})`,
        'ALREADY_REDEEMED',
        409
      )
    }

    // 4. Execute atomic redemption using database function
    // This PostgreSQL function atomically:
    //   - Verifies reward exists and has stock
    //   - Verifies user has sufficient points
    //   - Deducts points from profiles.total_points
    //   - Decrements rewards.stock
    //   - Inserts the reward_redemptions record
    //   - Logs a notification
    const { data: result, error: rpcError } = await supabase.rpc('redeem_reward_atomic', {
      p_employee_id: userId,
      p_reward_id: reward_id,
      p_org_id: orgId,
    })

    if (rpcError) {
      console.error('RPC error:', rpcError)
      return errorResponse('Failed to process reward redemption', 'DB_ERROR', 500)
    }

    // 5. Interpret result from the database function
    const rpcResult = result as { success: boolean; error?: string; redemption_id?: string }

    if (!rpcResult.success) {
      const msg = rpcResult.error ?? 'Redemption failed'
      const code =
        msg.includes('stock') ? 'OUT_OF_STOCK'
        : msg.includes('points') ? 'INSUFFICIENT_POINTS'
        : msg.includes('not found') ? 'NOT_FOUND'
        : 'REDEMPTION_FAILED'
      return errorResponse(msg, code, 400)
    }

    return successResponse({ redemption_id: rpcResult.redemption_id }, 201)

  } catch (err: any) {
    const status = err.status ?? 500
    return errorResponse(err.message ?? 'Internal Server Error', 'SERVER_ERROR', status)
  }
})
