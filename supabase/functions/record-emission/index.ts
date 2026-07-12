import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "npm:zod@3.22.4"
import { verifyJWT, errorResponse, successResponse, corsHeaders, stripHtml } from "../_shared/auth.ts"

// ─── Zod Validation Schema ────────────────────────────────────────────────────
const EmissionSchema = z.object({
  department_id: z.string().uuid({ message: "department_id must be a valid UUID" }),
  emission_factor_id: z.string().uuid({ message: "emission_factor_id must be a valid UUID" }),
  quantity: z
    .number({ invalid_type_error: "quantity must be a number" })
    .positive({ message: "quantity must be positive" })
    .max(1_000_000, { message: "quantity exceeds the maximum of 1,000,000 tCO2e per transaction" }),
  source_type: z.enum(['purchase', 'manufacturing', 'expense', 'fleet', 'other'], {
    errorMap: () => ({ message: "source_type must be one of: purchase, manufacturing, expense, fleet, other" })
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "date must be in YYYY-MM-DD format" }),
  notes: z.string().max(500, { message: "notes must not exceed 500 characters" }).optional(),
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

    const parseResult = EmissionSchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]
      return errorResponse(
        firstError.message,
        'VALIDATION_ERROR',
        400,
        firstError.path.join('.')
      )
    }

    const { department_id, emission_factor_id, quantity, source_type, date, notes } = parseResult.data

    // 3. Validate date — cannot be more than 30 days in the future
    const txDate = new Date(date)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    if (txDate > thirtyDaysFromNow) {
      return errorResponse(
        'date cannot be more than 30 days in the future',
        'VALIDATION_ERROR',
        400,
        'date'
      )
    }

    // 4. Verify department belongs to caller's org
    const { data: dept, error: deptError } = await supabase
      .from('departments')
      .select('id, org_id')
      .eq('id', department_id)
      .eq('org_id', orgId)
      .single()

    if (deptError || !dept) {
      return errorResponse(
        'department_id does not belong to your organization or does not exist',
        'INVALID_DEPARTMENT',
        400,
        'department_id'
      )
    }

    // 5. Verify emission_factor_id exists in the emission_factors table
    const { data: factor, error: factorError } = await supabase
      .from('emission_factors')
      .select('id, factor_value')
      .eq('id', emission_factor_id)
      .single()

    if (factorError || !factor) {
      return errorResponse(
        'emission_factor_id does not exist',
        'INVALID_EMISSION_FACTOR',
        400,
        'emission_factor_id'
      )
    }

    // 6. Sanitize notes — strip HTML tags
    const sanitizedNotes = notes ? stripHtml(notes) : null

    // 7. Calculate emission
    const calculated_emission_kg = quantity * factor.factor_value

    // 8. Insert validated transaction
    const { data: insertedTx, error: insertError } = await supabase
      .from('carbon_transactions')
      .insert({
        org_id: orgId,
        department_id,
        emission_factor_id,
        quantity,
        calculated_emission_kg,
        auto_calculated: true,
        source_type,
        date,
        notes: sanitizedNotes,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return errorResponse('Failed to record emission transaction', 'DB_ERROR', 500)
    }

    return successResponse(insertedTx, 201)

  } catch (err: any) {
    const status = err.status ?? 500
    return errorResponse(err.message ?? 'Internal Server Error', 'SERVER_ERROR', status)
  }
})
