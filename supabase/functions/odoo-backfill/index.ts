import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const EMISSION_FACTORS: Record<string, number> = {
  'purchase.order':  2.5,
  'mrp.production': 0.82,
  'default':         1.0,
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { odoo_url, db_name, api_key, org_id, start_date, end_date } = await req.json()

    if (!odoo_url || !db_name || !api_key || !org_id || !start_date || !end_date) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const baseUrl = odoo_url.replace(/\/$/, '')

    // ── Authenticate with Odoo ────────────────────────────────────────────
    const authResp = await fetch(`${baseUrl}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'call', id: 1,
        params: {
          model: 'res.users', method: 'authenticate',
          args:  [db_name, 'admin', api_key, {}], kwargs: {},
        },
      }),
    })
    const { result: uid } = await authResp.json()
    if (!uid) {
      return new Response(JSON.stringify({ error: 'Odoo authentication failed' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const transactions: any[] = []

    // ── Fetch historical purchase orders ──────────────────────────────────
    const poResp = await fetch(`${baseUrl}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'call', id: 2,
        params: {
          model: 'purchase.order', method: 'search_read',
          args: [[
            ['state', '=', 'purchase'],
            ['date_approve', '>=', start_date],
            ['date_approve', '<=', end_date],
          ]],
          kwargs: { fields: ['name', 'date_approve', 'order_line'], limit: 500 },
        },
      }),
    })
    const { result: pos = [] } = await poResp.json()

    for (const po of pos) {
      const emissionKg = (po.order_line?.length ?? 1) * EMISSION_FACTORS['purchase.order']
      transactions.push({
        org_id,
        source_type:   'purchase',
        calculated_emission_kg: emissionKg,
        quantity:      po.order_line?.length ?? 1,
        auto_calculated: true,
        date:          (po.date_approve ?? start_date).split(' ')[0],
        notes:         `[Backfill] Odoo PO: ${po.name}`,
        odoo_ref:      po.name,
        odoo_model:    'purchase.order',
      })
    }

    // ── Fetch historical manufacturing orders ─────────────────────────────
    const moResp = await fetch(`${baseUrl}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', method: 'call', id: 3,
        params: {
          model: 'mrp.production', method: 'search_read',
          args: [[
            ['state', '=', 'done'],
            ['date_finished', '>=', start_date],
            ['date_finished', '<=', end_date],
          ]],
          kwargs: { fields: ['name', 'date_finished', 'qty_production'], limit: 500 },
        },
      }),
    })
    const { result: mos = [] } = await moResp.json()

    for (const mo of mos) {
      const emissionKg = (mo.qty_production ?? 1) * EMISSION_FACTORS['mrp.production']
      transactions.push({
        org_id,
        source_type:   'manufacturing',
        calculated_emission_kg: emissionKg,
        quantity:      mo.qty_production ?? 1,
        auto_calculated: true,
        date:          (mo.date_finished ?? start_date).split(' ')[0],
        notes:         `[Backfill] Odoo MO: ${mo.name}`,
        odoo_ref:      mo.name,
        odoo_model:    'mrp.production',
      })
    }

    // ── Bulk insert into Supabase ─────────────────────────────────────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let inserted = 0
    if (transactions.length > 0) {
      const { data, error } = await supabase
        .from('carbon_transactions')
        .insert(transactions)
        .select('id')

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      inserted = data?.length ?? 0
    }

    const totalEmissions = transactions.reduce((s, t) => s + t.calculated_emission_kg, 0)

    return new Response(JSON.stringify({
      success:            true,
      transactionsCreated: inserted,
      totalEmissions:     Math.round(totalEmissions * 100) / 100,
      unit:               'kg CO₂e',
      dateRange:          { start: start_date, end: end_date },
    }), {
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
