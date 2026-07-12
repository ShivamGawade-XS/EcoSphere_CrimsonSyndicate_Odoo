import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-odoo-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Emission factors by Odoo product category (kg CO₂e per unit) ──────────────
const EMISSION_FACTORS: Record<string, { factor: number; unit: string; scope: 1 | 2 | 3 }> = {
  'All / Saleable / Manufacturing':  { factor: 2.5,  unit: 'kg',  scope: 1 },
  'All / Consumable / Chemicals':    { factor: 3.8,  unit: 'kg',  scope: 3 },
  'All / Service / Transport':       { factor: 0.21, unit: 'km',  scope: 3 },
  'All / Saleable / Electronics':    { factor: 25.0, unit: 'unit',scope: 3 },
  'Utilities / Electricity':         { factor: 0.82, unit: 'kWh', scope: 2 },
  'Utilities / Natural Gas':         { factor: 2.04, unit: 'kWh', scope: 1 },
  'Utilities / Water':               { factor: 0.34, unit: 'm3',  scope: 3 },
  'All / Fuel':                      { factor: 2.68, unit: 'L',   scope: 1 },
  default:                           { factor: 1.0,  unit: 'unit',scope: 3 },
}

function getEmissionFactor(category: string) {
  return EMISSION_FACTORS[category] ?? EMISSION_FACTORS['default']
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // ── Validate shared secret ─────────────────────────────────────────────
    const webhookSecret = Deno.env.get('ODOO_WEBHOOK_SECRET')
    const incomingSecret = req.headers.get('x-odoo-secret') ??
      new URL(req.url).searchParams.get('secret')

    if (!webhookSecret || incomingSecret !== webhookSecret) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid webhook secret' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse Odoo event payload ───────────────────────────────────────────
    const payload = await req.json()
    const { model, event_type, data, org_id } = payload

    if (!model || !event_type || !data || !org_id) {
      return new Response(JSON.stringify({ error: 'Missing required fields: model, event_type, data, org_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Initialize Supabase service role client ────────────────────────────
    const supabaseUrl     = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRoleKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase        = createClient(supabaseUrl, serviceRoleKey)

    const transactions: any[] = []
    let totalEmissionsKg = 0

    // ── Handle Odoo event types ────────────────────────────────────────────
    if (model === 'purchase.order' && event_type === 'confirmed') {
      // Purchase order confirmed → calculate transport/manufacturing emissions
      const { order_lines = [], partner_id, name: poName } = data
      for (const line of order_lines) {
        const { product_category, qty, product_uom, department_id: lineDepId } = line
        const ef = getEmissionFactor(product_category)
        const emissionKg = qty * ef.factor

        transactions.push({
          org_id,
          department_id: lineDepId ?? null,
          source_type:   'purchase',
          calculated_emission_kg: emissionKg,
          quantity:      qty,
          auto_calculated: true,
          date:          new Date().toISOString().split('T')[0],
          notes:         `Auto-recorded from Odoo PO: ${poName} | Supplier: ${partner_id} | Category: ${product_category}`,
          odoo_ref:      poName,
          odoo_model:    'purchase.order',
        })
        totalEmissionsKg += emissionKg
      }
    } else if (model === 'mrp.production' && event_type === 'done') {
      // Manufacturing order done → calculate production emissions
      const { name: moName, department_id: depId, energy_kwh = 0, qty_produced = 0 } = data
      const ef = getEmissionFactor('Utilities / Electricity')
      const emissionKg = energy_kwh * ef.factor

      if (emissionKg > 0) {
        transactions.push({
          org_id,
          department_id: depId ?? null,
          source_type:   'manufacturing',
          calculated_emission_kg: emissionKg,
          quantity:      energy_kwh,
          auto_calculated: true,
          date:          new Date().toISOString().split('T')[0],
          notes:         `Auto-recorded from Odoo MO: ${moName} | Qty produced: ${qty_produced} units | Energy: ${energy_kwh} kWh`,
          odoo_ref:      moName,
          odoo_model:    'mrp.production',
        })
        totalEmissionsKg += emissionKg
      }
    } else if (model === 'account.move' && event_type === 'posted') {
      // Vendor bill for utilities → energy-based emissions
      const { name: billName, invoice_line_ids = [], department_id: depId } = data
      for (const line of invoice_line_ids) {
        const { product_category, quantity, product_uom } = line
        if (!product_category?.startsWith('Utilities')) continue

        const ef = getEmissionFactor(product_category)
        const emissionKg = quantity * ef.factor

        transactions.push({
          org_id,
          department_id: depId ?? null,
          source_type:   'expense',
          calculated_emission_kg: emissionKg,
          quantity,
          auto_calculated: true,
          date:          new Date().toISOString().split('T')[0],
          notes:         `Auto-recorded from Odoo Bill: ${billName} | Category: ${product_category} | Scope ${ef.scope}`,
          odoo_ref:      billName,
          odoo_model:    'account.move',
        })
        totalEmissionsKg += emissionKg
      }
    } else {
      return new Response(JSON.stringify({
        received: true,
        transactionsCreated: 0,
        totalEmissions: 0,
        message: `Model '${model}' with event '${event_type}' is not handled.`,
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Bulk insert transactions ───────────────────────────────────────────
    if (transactions.length > 0) {
      const { error: insertError } = await supabase
        .from('carbon_transactions')
        .insert(transactions)

      if (insertError) {
        console.error('Failed to insert carbon transactions:', insertError)
        return new Response(JSON.stringify({ error: insertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({
      received:            true,
      transactionsCreated: transactions.length,
      totalEmissions:      Math.round(totalEmissionsKg * 100) / 100,
      unit:                'kg CO₂e',
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
