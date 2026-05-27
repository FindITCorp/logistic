import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { calculateClientPrice } from '@/lib/pricing'

// Vercel Cron: runs daily at 00:00 UTC
// vercel.json: { "crons": [{ "path": "/api/cron/advance-pools", "schedule": "0 0 * * *" }] }
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const db = createServerClient()
  const now = new Date().toISOString()
  const results: string[] = []

  // 1. Fetch all active pools
  const { data: activePools, error } = await db
    .from('pools')
    .select('*')
    .eq('status', 'active')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  for (const pool of activePools ?? []) {
    const newDay = pool.day_number + 1

    if (newDay > 10) {
      // Pool expired — close it and auto-recalculate final prices
      await db.from('pools').update({ status: 'closed' }).eq('id', pool.id)

      // Recalculate and lock in final prices for each pool_member
      const { data: members } = await db
        .from('pool_members')
        .select('*')
        .eq('pool_id', pool.id)

      for (const member of members ?? []) {
        const { clientPrice } = calculateClientPrice(
          member.day_joined ?? 1,
          pool.current_volume_m3,
        )
        await db
          .from('pool_members')
          .update({ price_per_m3: clientPrice, locked_at: now })
          .eq('id', member.id)
        await db
          .from('shipments')
          .update({ price_per_m3: clientPrice })
          .eq('id', member.shipment_id)
      }

      results.push(`Pool #${pool.pool_number} closed (was day ${pool.day_number})`)
    } else {
      // Advance day counter and recalculate carrier_rate at new volume
      const { clientPrice } = calculateClientPrice(1, pool.current_volume_m3)
      await db
        .from('pools')
        .update({ day_number: newDay, carrier_rate: clientPrice })
        .eq('id', pool.id)

      results.push(`Pool #${pool.pool_number} → day ${newDay}`)
    }
  }

  // 2. Auto-create replacement pools for origins that went from active→closed
  const { data: originsClosed } = await db
    .from('pools')
    .select('origin_city')
    .eq('status', 'closed')
    .gte('updated_at', new Date(Date.now() - 86400000).toISOString())

  const closedOrigins = new Set((originsClosed ?? []).map((p) => p.origin_city))

  for (const origin of closedOrigins) {
    // Check if there's already an active pool for this origin
    const { data: existing } = await db
      .from('pools')
      .select('id')
      .eq('status', 'active')
      .eq('origin_city', origin)
      .limit(1)

    if (!existing || existing.length === 0) {
      await db.from('pools').insert({
        origin_city: origin,
        destination_city: 'colon',
        status: 'active',
        reference_price_m3: 100,
        current_volume_m3: 0,
        participants: 0,
        day_number: 1,
      })
      results.push(`Auto-created new pool for ${origin}`)
    }
  }

  return NextResponse.json({ ok: true, date: now, actions: results })
}
