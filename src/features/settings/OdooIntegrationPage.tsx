/**
 * EcoSphere AI — Odoo ERP Integration Page
 *
 * Implements settings, webhook configs, RPC credentials setup, category mapping
 * to emission factors, historical backfills, sync logs, and activity feeds.
 * Fully functional in mock mode using dbService.
 *
 * @module features/settings/OdooIntegrationPage
 */

import { useState, useMemo } from 'react'
import { dbService } from '@/lib/dbService'
import { supabase } from '@/lib/supabase'
import {
  Link,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Database,
  Calendar,
  Layers,
  FileText,
  Activity,
  ArrowRight,
  Settings
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

export function OdooIntegrationPage() {
  const [refreshKey, setRefreshKey] = useState(0)

  // Config State
  const config = useMemo(() => dbService.getOdooConfig(), [refreshKey])
  const factors = useMemo(() => dbService.getEmissionFactors(), [refreshKey])
  const odooLogs = useMemo(() => dbService.getOdooLogs(), [refreshKey])
  
  // Filtered transactions for Odoo feed
  const transactions = useMemo(() => {
    const list = dbService.getCarbonTransactions()
    return list.filter(t => t.notes?.includes('Odoo')).slice(0, 10)
  }, [refreshKey])

  // Form State
  const [odooUrl, setOdooUrl] = useState(config?.odooUrl || '')
  const [dbName, setDbName] = useState(config?.dbName || '')
  const [apiKey, setApiKey] = useState(config?.apiKey || '')
  
  // Backfill Range State
  const [startDate, setStartDate] = useState('2026-07-01')
  const [endDate, setEndDate] = useState('2026-07-12')

  // Connection State
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
  const [testResult, setTestResult] = useState<string | null>(null)
  
  // Syncing State
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')
  const [syncResult, setSyncResult] = useState<string | null>(null)

  // Actions
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    dbService.saveOdooConfig({
      ...config,
      odooUrl,
      dbName,
      apiKey,
      lastSync: new Date().toISOString()
    })
    setRefreshKey(prev => prev + 1)
    alert('Odoo configuration saved successfully.')
  }

  const handleTestConnection = async () => {
    setTestStatus('testing')
    setTestResult(null)

    // Simulate JSON-RPC verification for 1.2 seconds
    setTimeout(async () => {
      try {
        const isPlaceholder = import.meta.env.VITE_SUPABASE_URL === undefined ||
                              import.meta.env.VITE_SUPABASE_URL === '' ||
                              import.meta.env.VITE_SUPABASE_URL.includes('placeholder-project')

        if (isPlaceholder) {
          // Mock mode: Success simulation
          setTestStatus('success')
          setTestResult('Successfully connected to Odoo v17.2 (Enterprise Edition). Models "purchase.order", "mrp.production", "account.move" found.')
          dbService.addOdooLog('Manual connection test', 'Tested Odoo JSON-RPC connection successfully. v17.2', 'success')
        } else {
          // Live Supabase Edge Function call
          const { data, error } = await supabase.functions.invoke('test-odoo-connection', {
            body: { odoo_url: odooUrl, db_name: dbName, api_key: apiKey }
          })
          if (error) throw new Error(error.message)
          if (data.success) {
            setTestStatus('success')
            setTestResult(`Connected. Odoo version: ${data.odooVersion}. Models: ${data.availableModels.join(', ')}`)
          } else {
            throw new Error(data.error || 'Connection failed')
          }
        }
      } catch (err: any) {
        setTestStatus('error')
        setTestResult(err.message || 'Connection failed. Please check your credentials and network settings.')
        dbService.addOdooLog('Manual connection test', `Failed to connect: ${err.message}`, 'error')
      } finally {
        setRefreshKey(prev => prev + 1)
      }
    }, 1200)
  }

  const handleRunBackfill = () => {
    setSyncStatus('syncing')
    setSyncResult(null)

    setTimeout(async () => {
      try {
        const isPlaceholder = import.meta.env.VITE_SUPABASE_URL === undefined ||
                              import.meta.env.VITE_SUPABASE_URL === '' ||
                              import.meta.env.VITE_SUPABASE_URL.includes('placeholder-project')

        if (isPlaceholder) {
          // Mock sync backfill
          const res = dbService.runOdooSync(startDate, endDate)
          setSyncStatus('success')
          setSyncResult(`Sync completed. Automatically generated ${res.transactionsCreated} carbon transaction records. Total emissions processed: ${Math.round(res.totalEmissions).toLocaleString()} kg CO₂e.`)
        } else {
          // Live Supabase Edge Function call
          const { data, error } = await supabase.functions.invoke('odoo-backfill', {
            body: { odoo_url: odooUrl, db_name: dbName, api_key: apiKey, org_id: 'org-greentech-123', start_date: startDate, end_date: endDate }
          })
          if (error) throw new Error(error.message)
          if (data.success) {
            setSyncStatus('success')
            setSyncResult(`Synced ${data.transactionsCreated} records. Total: ${data.totalEmissions} kg CO₂e.`)
          } else {
            throw new Error(data.error || 'Sync failed')
          }
        }
      } catch (err: any) {
        setSyncStatus('error')
        setSyncResult(err.message || 'Sync failed.')
      } finally {
        setSyncStatus('idle')
        setRefreshKey(prev => prev + 1)
      }
    }, 1500)
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 flex-shrink-0 mt-0.5">
            <Link className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Odoo ERP Data Pipeline</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xl">
              Connect Odoo modules to automate Scope 1, 2, and 3 emission auditing. Confirmed purchases, finished production orders, and utility invoices trigger automatic carbon ledger updates.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground bg-muted border border-border px-3 py-1.5 rounded-lg h-fit">
          Webhook Endpoint active
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Config Credentials */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-2xl shadow-sm p-6 space-y-6">
            <h3 className="font-bold text-base flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-primary" /> Odoo RPC Credentials
            </h3>
            
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">Odoo Server URL</label>
                  <input
                    type="url"
                    required
                    placeholder="https://company.odoo.com"
                    value={odooUrl}
                    onChange={(e) => setOdooUrl(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">Database Name</label>
                  <input
                    type="text"
                    required
                    placeholder="company_prod"
                    value={dbName}
                    onChange={(e) => setDbName(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1.5">Odoo API Key / Token</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••••••••••"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testStatus === 'testing' || !odooUrl || !dbName}
                  className="flex items-center gap-1.5 py-2 px-4 border border-border hover:bg-muted text-foreground text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${testStatus === 'testing' ? 'animate-spin' : ''}`} />
                  Test Connection
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-colors"
                >
                  Save Integration settings
                </button>
              </div>
            </form>

            {/* Test Connection Result Box */}
            {testStatus !== 'idle' && (
              <div className={`p-4 border rounded-xl flex items-start gap-3 text-xs animate-fade-in
                ${testStatus === 'success' 
                  ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' 
                  : testStatus === 'testing'
                  ? 'bg-muted/50 border-border text-muted-foreground'
                  : 'bg-red-500/10 border-red-500/20 text-red-600'
                }`}
              >
                {testStatus === 'success' ? (
                  <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-green-500" />
                ) : testStatus === 'testing' ? (
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" />
                )}
                <div>
                  <p className="font-bold">
                    {testStatus === 'success' ? 'Odoo Connection Verified' : testStatus === 'testing' ? 'Testing Connection...' : 'Connection Failed'}
                  </p>
                  <p className="mt-1 opacity-90 leading-relaxed">
                    {testResult || 'Contacting Odoo servers via JSON-RPC. Verification takes up to 5 seconds.'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Model Mapping Configuration */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base flex items-center gap-1.5">
              <Layers className="w-4.5 h-4.5 text-primary" /> Category-to-Emission Factor Mappings
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Odoo product categories mapped to EcoSphere's emission factors to compute CO₂e dynamically.
            </p>

            <div className="overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground">Odoo Product Category</th>
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground">EcoSphere Emission Factor</th>
                    <th className="py-2.5 px-4 font-semibold text-muted-foreground text-right">Scope</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  <tr className="hover:bg-muted/5">
                    <td className="py-3 px-4 font-medium">All / Saleable / Manufacturing</td>
                    <td className="py-3 px-4">Manufacturing Facility Output (2.5 kg/unit)</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">Scope 1</td>
                  </tr>
                  <tr className="hover:bg-muted/5">
                    <td className="py-3 px-4 font-medium">Utilities / Electricity</td>
                    <td className="py-3 px-4">Grid Electricity (0.82 kg/kWh)</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">Scope 2</td>
                  </tr>
                  <tr className="hover:bg-muted/5">
                    <td className="py-3 px-4 font-medium">All / Service / Transport</td>
                    <td className="py-3 px-4">Logistics Transit (0.21 kg/km)</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">Scope 3</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Side: Backfills & Webhook Feed */}
        <div className="space-y-6">
          {/* Historical Backfill Form */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4 shadow-sm bg-gradient-to-b from-card to-muted/10">
            <h4 className="font-bold text-sm flex items-center gap-1.5 border-b border-border pb-3">
              <Calendar className="w-4 h-4 text-primary" /> Historical Sync
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Pull historical purchase orders and finished production jobs to seed environmental logs.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-muted-foreground block mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg p-2 text-xs"
                />
              </div>
            </div>

            <button
              onClick={handleRunBackfill}
              disabled={syncStatus === 'syncing' || !odooUrl}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/95 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
              Sync Historical Data
            </button>

            {syncResult && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-400 rounded-xl text-[11px] leading-relaxed">
                {syncResult}
              </div>
            )}
          </div>

          {/* Odoo Webhook Activity Feed */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-border bg-muted/20">
              <h3 className="font-bold text-sm flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-500" /> Webhook Activity Feed
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Real-time ERP auto-audited logs.</p>
            </div>

            <div className="divide-y divide-border/60 max-h-72 overflow-y-auto">
              {transactions.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground italic">
                  No Odoo ERP events recorded yet. Run a historical backfill to populate records.
                </div>
              ) : (
                transactions.map((tx) => (
                  <div key={tx.id} className="p-4 hover:bg-muted/5 transition-colors space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-foreground flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        {tx.notes?.split(' | ')[0] || 'Odoo Transaction'}
                      </span>
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">
                        Auto
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {tx.notes?.split(' | ').slice(1).join(' | ') || tx.notes}
                    </p>
                    <div className="text-[10px] text-muted-foreground flex justify-between pt-1">
                      <span>Date: {formatDate(tx.date)}</span>
                      <span className="font-bold text-emerald-600">+{Math.round(tx.calculated_emission_kg)} kg CO₂e</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
