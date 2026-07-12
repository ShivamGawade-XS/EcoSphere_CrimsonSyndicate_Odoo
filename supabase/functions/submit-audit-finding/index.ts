import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { z } from "npm:zod@3.22.4"
import { verifyJWT, errorResponse, successResponse, corsHeaders } from "../_shared/auth.ts"

// ─── Zod Validation Schema ────────────────────────────────────────────────────
const AuditFindingSchema = z.object({
  title: z.string().min(3, { message: "title must be at least 3 characters" }).max(200),
  description: z.string().max(2000, { message: "description must not exceed 2000 characters" }).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: "severity must be one of: low, medium, high, critical" })
  }),
  owner_id: z.string().uuid({ message: "owner_id must be a valid UUID" }),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "due_date must be in YYYY-MM-DD format" }),
  department_id: z.string().uuid().optional(),
  audit_id: z.string().uuid().optional(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Verify JWT and extract auth context
    const { orgId, role, supabase } = await verifyJWT(req)

    if (!orgId) {
      return errorResponse('User does not belong to an organization', 'NO_ORG', 403)
    }

    // 2. Check caller role — only admin, esg_manager, dept_head can raise findings
    const allowedRoles = ['admin', 'esg_manager', 'dept_head']
    if (role && !allowedRoles.includes(role)) {
      return errorResponse(
        'Insufficient permissions. Required role: admin, esg_manager, or dept_head',
        'FORBIDDEN',
        403
      )
    }

    // 3. Parse and validate request body
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return errorResponse('Invalid JSON body', 'INVALID_BODY', 400)
    }

    const parseResult = AuditFindingSchema.safeParse(body)
    if (!parseResult.success) {
      const firstError = parseResult.error.errors[0]
      return errorResponse(
        firstError.message,
        'VALIDATION_ERROR',
        400,
        firstError.path.join('.')
      )
    }

    const { title, description, severity, owner_id, due_date, department_id, audit_id } = parseResult.data

    // 4. Validate due_date — must be in the future
    const dueDate = new Date(due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (dueDate <= today) {
      return errorResponse(
        'due_date must be a future date',
        'VALIDATION_ERROR',
        400,
        'due_date'
      )
    }

    // 5. Verify owner_id is a valid user in the same org
    const { data: owner, error: ownerError } = await supabase
      .from('profiles')
      .select('id, org_id')
      .eq('id', owner_id)
      .eq('org_id', orgId)
      .single()

    if (ownerError || !owner) {
      return errorResponse(
        'owner_id does not match a valid user in your organization',
        'INVALID_OWNER',
        400,
        'owner_id'
      )
    }

    // 6. Insert validated compliance issue
    const { data: insertedIssue, error: insertError } = await supabase
      .from('compliance_issues')
      .insert({
        org_id: orgId,
        title,
        description: description ?? null,
        severity,
        status: 'open',
        owner_id,
        due_date,
        department_id: department_id ?? null,
        audit_id: audit_id ?? null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return errorResponse('Failed to submit audit finding', 'DB_ERROR', 500)
    }

    return successResponse(insertedIssue, 201)

  } catch (err: any) {
    const status = err.status ?? 500
    return errorResponse(err.message ?? 'Internal Server Error', 'SERVER_ERROR', status)
  }
})
