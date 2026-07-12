import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { odoo_url, db_name, api_key } = await req.json()

    if (!odoo_url || !db_name || !api_key) {
      return new Response(JSON.stringify({ error: 'Missing odoo_url, db_name, or api_key' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const baseUrl = odoo_url.replace(/\/$/, '')

    // ── Step 1: Authenticate (get uid) ────────────────────────────────────
    const authResp = await fetch(`${baseUrl}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method:  'call',
        id:      1,
        params: {
          model:  'res.users',
          method: 'authenticate',
          args:   [db_name, 'admin', api_key, {}],
          kwargs: {},
        },
      }),
    })

    if (!authResp.ok) {
      return new Response(JSON.stringify({ error: `Odoo returned HTTP ${authResp.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const authData = await authResp.json()
    const uid = authData?.result

    if (!uid || typeof uid !== 'number') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication failed — check credentials',
        odooResponse: authData?.error?.data?.message,
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Step 2: Fetch server version ──────────────────────────────────────
    const versionResp = await fetch(`${baseUrl}/web/webclient/version_info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: 2, params: {} }),
    })

    const versionData = await versionResp.json()
    const version = versionData?.result?.server_version ?? 'Unknown'

    // ── Step 3: Check available models ────────────────────────────────────
    const modelResp = await fetch(`${baseUrl}/web/dataset/call_kw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        id: 3,
        params: {
          model:  'ir.model',
          method: 'search_read',
          args:   [[['model', 'in', ['purchase.order', 'mrp.production', 'account.move']]]],
          kwargs: { fields: ['name', 'model'], limit: 10 },
        },
      }),
    })

    const modelData = await modelResp.json()
    const availableModels: string[] = (modelData?.result ?? []).map((m: any) => m.model)

    return new Response(JSON.stringify({
      success:         true,
      uid,
      odooVersion:     version,
      availableModels,
      requiredModels:  ['purchase.order', 'mrp.production', 'account.move'],
      allModelsPresent: ['purchase.order', 'mrp.production', 'account.move']
        .every(m => availableModels.includes(m)),
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
