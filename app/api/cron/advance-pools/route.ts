import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { calculateClientPrice } from '@/lib/pricing'
import { notify } from '@/lib/notify'
import { notifyPoolMembers } from '@/lib/lifecycleNotify'
import { isEnabled } from '@/lib/settings'
import type { OriginCity } from '@/lib/supabase/database.types'

// ─── FINDIT Autopilot ─────────────────────────────────────────────────────────
// Daily self-management cron (Vercel Cron 00:00 UTC). Runs the whole operation
// without human intervention:
//   1. Self-heal pool volume drift (recompute from members)
//   2. Advance pool day (derived from opened_at — robust against missed runs)
//   3. Close pools past day 10 and lock final member prices
//   4. Guarantee every origin always has one active pool to join
//   5. Sync shipment lifecycle status to pool status
//   6. Process due lead follow-ups (autonomous nurture)
// Protected by CRON_SECRET.

const ORIGINS: OriginCity[] = ['shanghai', 'guangzhou', 'shenzhen']
const DAY_MS = 86_400_000
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://logistic-six-alpha.vercel.app'

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS)
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServerClient()
  const now = new Date().toISOString()
  const report: Record<string, string[]> = {
    healed: [], advanced: [], closed: [], created: [], synced: [], nurtured: [],
  }

  // ── 1+2+3. Active pools: self-heal, advance day, close if expired ──────────
  const { data: activePools, error } = await db.from('pools').select('*').eq('status', 'active')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const pool of activePools ?? []) {
    try {
      // Self-heal: recompute volume + participants from the member ledger.
      await db.rpc('recompute_pool_volume', { p_pool_id: pool.id })

      // Derive the true day from opened_at (resilient to missed/double runs).
      const openedAt = pool.opened_at ?? pool.created_at
      const trueDay = Math.min(daysSince(openedAt) + 1, 11)

      if (trueDay > 10) {
        // Expired → close and lock final prices at the final pool volume.
        const { data: fresh } = await db.from('pools').select('current_volume_m3').eq('id', pool.id).single()
        const finalVolume = fresh?.current_volume_m3 ?? pool.current_volume_m3

        await db.from('pools').update({ status: 'closed' }).eq('id', pool.id)

        const { data: members } = await db.from('pool_members').select('*').eq('pool_id', pool.id)
        for (const m of members ?? []) {
          const { clientPrice } = calculateClientPrice(m.day_joined ?? 1, finalVolume)
          await db.from('pool_members').update({ price_per_m3: clientPrice, locked_at: now }).eq('id', m.id)
          await db.from('shipments').update({ price_per_m3: clientPrice }).eq('id', m.shipment_id)
        }
        // Notify members the pool closed + their locked-in price (gated/safe).
        const notified = await notifyPoolMembers(db, pool.id, pool.pool_number, 'closed')
        report.closed.push(`#${pool.pool_number} (${members?.length ?? 0} miembros, ${finalVolume}m³, avisados ${notified.sent})`)
      } else if (trueDay !== pool.day_number) {
        await db.from('pools').update({ day_number: trueDay }).eq('id', pool.id)
        report.advanced.push(`#${pool.pool_number} → día ${trueDay}`)
      }
    } catch (e) {
      report.healed.push(`ERROR #${pool.pool_number}: ${e instanceof Error ? e.message : 'desconocido'}`)
    }
  }

  // ── 4. Guarantee one active pool per origin ────────────────────────────────
  for (const origin of ORIGINS) {
    const { count } = await db
      .from('pools')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('origin_city', origin)

    if ((count ?? 0) === 0) {
      const { error: insErr } = await db.from('pools').insert({
        origin_city: origin,
        status: 'active',
        current_volume_m3: 0,
        participants: 0,
        day_number: 1,
        carrier_rate: 121,
        opened_at: now,
      })
      if (!insErr) report.created.push(`Nuevo pool ${origin}`)
    }
  }

  // ── 5. Sync shipment lifecycle to pool status ──────────────────────────────
  const statusMap: Record<string, string> = {
    in_transit: 'in_transit', at_tocumen: 'at_tocumen', completed: 'delivered',
  }
  const { data: movingPools } = await db
    .from('pools')
    .select('id, pool_number, status')
    .in('status', ['in_transit', 'at_tocumen', 'completed'])
  for (const pool of movingPools ?? []) {
    const shipStatus = statusMap[pool.status]
    if (!shipStatus) continue
    const { count } = await db
      .from('shipments')
      .update({ status: shipStatus }, { count: 'exact' })
      .eq('pool_id', pool.id)
      .neq('status', shipStatus)
    if ((count ?? 0) > 0) report.synced.push(`#${pool.pool_number}: ${count} envíos → ${shipStatus}`)
  }

  // ── 6. Autonomous lead nurture ─────────────────────────────────────────────
  // Gated behind the nurture_enabled flag (app_settings, with NURTURE_ENABLED
  // env fallback) so outbound outreach stays OFF until the owner turns it on
  // from the admin UI. Everything else in the autopilot runs regardless.
  if (!(await isEnabled('nurture_enabled'))) {
    return NextResponse.json({ ok: true, date: now, report, nurture: 'disabled' })
  }

  const { data: dueFollowups } = await db
    .from('lead_followups')
    .select('*, lead:leads(*)')
    .eq('status', 'pending')
    .lte('due_at', now)
    .limit(50)

  for (const f of dueFollowups ?? []) {
    const lead = f.lead as { id: string; name: string; whatsapp: string | null; email: string | null; origin_city: string | null; status: string; opted_out?: boolean; optout_token?: string | null } | null
    // Skip converted leads and anyone who opted out (respect unsubscribe).
    if (!lead || lead.status === 'converted' || lead.opted_out) {
      await db.from('lead_followups').update({ status: 'skipped' }).eq('id', f.id)
      continue
    }
    const optoutUrl = lead.optout_token ? `${SITE}/api/leads/optout?token=${lead.optout_token}` : null
    const { subject, body } = nurtureMessage(f.step, lead.name, lead.origin_city, optoutUrl)
    const res = await notify({ whatsapp: lead.whatsapp, email: lead.email, name: lead.name }, subject, body)
    await db.from('lead_followups').update({
      status: res.ok ? 'sent' : 'failed',
      sent_at: res.ok ? now : null,
    }).eq('id', f.id)
    if (res.ok) {
      await db.from('leads').update({ last_contacted_at: now }).eq('id', lead.id)
      // Schedule next step (up to 3) if not yet contacted enough.
      if (f.step < 3) {
        await db.from('lead_followups').insert({
          lead_id: lead.id, channel: 'whatsapp', step: f.step + 1,
          due_at: new Date(Date.now() + (f.step === 1 ? 2 : 3) * DAY_MS).toISOString(),
        })
      }
      report.nurtured.push(`Lead ${lead.name} (paso ${f.step}, ${res.channel})`)
    }
  }

  return NextResponse.json({ ok: true, date: now, report })
}

function nurtureMessage(step: number, name: string, origin: string | null, optoutUrl: string | null): { subject: string; body: string } {
  const city = origin ? origin.charAt(0).toUpperCase() + origin.slice(1) : 'China'
  const unsub = optoutUrl ? `\n\nPara dejar de recibir mensajes: ${optoutUrl}` : ''
  if (step === 1) {
    return {
      subject: 'Tu ahorro en FINDIT te espera',
      body: `Hola ${name} 👋 Gracias por tu interés en FINDIT.\n\nConsolidando tu carga ${city} → Panamá pagas desde $180/m³ — hasta 40% menos que un casillero ($420/m³).\n\n¿Cuánto volumen mueves al mes? Te armamos tu cotización.\n\n_FINDIT Logistics_${unsub}`,
    }
  }
  if (step === 2) {
    return {
      subject: 'Tu pool está por cerrar',
      body: `Hola ${name} 👋 El pool ${city} → Panamá está sumando volumen. Mientras más rápido entras, mayor tu descuento (día 1 = 90% del ahorro).\n\nReserva tu espacio: ${SITE}/registro\n\n_FINDIT Logistics_${unsub}`,
    }
  }
  return {
    subject: 'Última llamada — ahorra hasta 40%',
    body: `Hola ${name} 👋 Última oportunidad de este ciclo para consolidar ${city} → Panamá y ahorrar hasta 40% vs el casillero.\n\nEscríbenos y te ayudamos a empezar hoy.\n\n_FINDIT Logistics_${unsub}`,
  }
}
