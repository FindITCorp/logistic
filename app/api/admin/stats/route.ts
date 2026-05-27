import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken, requireAdmin } from '@/lib/adminAuth'

// GET /api/admin/stats — dashboard KPIs for admin
export async function GET(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const db = createServerClient()

  const [
    { count: totalClients },
    { count: totalLeads },
    { data: pools },
    { data: recentShipments },
    { data: pendingInvoices },
    { data: payments },
  ] = await Promise.all([
    db.from('clients').select('id', { count: 'exact', head: true }),
    db.from('leads').select('id', { count: 'exact', head: true }),
    db.from('pools').select('id, status, current_volume_m3, participants, day_number, origin_city, pool_number').order('pool_number', { ascending: false }).limit(20),
    db.from('shipments')
      .select('id, client_code, weight_kg, volume_m3, status, origin_city, created_at, advance_paid, final_paid, price_per_m3')
      .order('created_at', { ascending: false })
      .limit(10),
    db.from('invoices')
      .select('id, client_code, status, declared_value_usd, pool_id')
      .in('status', ['pending', 'uploaded']),
    db.from('payments')
      .select('amount_usd, stage, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const activePools = (pools ?? []).filter(p => p.status === 'active')
  const inTransitPools = (pools ?? []).filter(p => ['closed', 'in_transit', 'at_colon', 'at_tocumen'].includes(p.status))

  const totalVolumeActive = activePools.reduce((s, p) => s + (p.current_volume_m3 ?? 0), 0)

  // Revenue from payments
  const advanceRevenue = (payments ?? []).filter(p => p.stage === 'advance').reduce((s, p) => s + (p.amount_usd ?? 0), 0)
  const finalRevenue = (payments ?? []).filter(p => p.stage === 'final').reduce((s, p) => s + (p.amount_usd ?? 0), 0)
  const totalRevenue = advanceRevenue + finalRevenue

  // Estimated pipeline revenue (shipments with price_per_m3 not yet final_paid)
  const pipelineRevenue = (recentShipments ?? [])
    .filter(s => s.price_per_m3 && !s.final_paid)
    .reduce((s, sh) => s + ((sh.price_per_m3 ?? 0) * (sh.volume_m3 ?? 0)), 0)

  const invoicesPending = (pendingInvoices ?? []).filter(i => i.status === 'pending').length
  const invoicesUploaded = (pendingInvoices ?? []).filter(i => i.status === 'uploaded').length

  return NextResponse.json({
    clients: { total: totalClients ?? 0 },
    leads: { total: totalLeads ?? 0 },
    pools: {
      active: activePools.length,
      in_transit: inTransitPools.length,
      total_volume_active_m3: +totalVolumeActive.toFixed(2),
      list: activePools.slice(0, 6),
    },
    revenue: {
      advance_usd: +advanceRevenue.toFixed(2),
      final_usd: +finalRevenue.toFixed(2),
      total_usd: +totalRevenue.toFixed(2),
      pipeline_usd: +pipelineRevenue.toFixed(2),
    },
    invoices: {
      pending: invoicesPending,
      uploaded: invoicesUploaded,
      action_required: invoicesPending + invoicesUploaded,
    },
    shipments: {
      recent: recentShipments ?? [],
    },
  })
}
