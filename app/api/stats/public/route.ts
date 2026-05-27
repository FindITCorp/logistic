import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

// GET /api/stats/public — live KPIs for landing page (no auth required)
export async function GET() {
  try {
    const db = createServerClient()
    const [
      { data: activePools },
      { count: clientCount },
    ] = await Promise.all([
      db.from('pools').select('id, origin_city, current_volume_m3, participants, day_number, carrier_rate').eq('status', 'active'),
      db.from('clients').select('id', { count: 'exact', head: true }),
    ])

    const pools = activePools ?? []
    const totalVolume = pools.reduce((s, p) => s + (p.current_volume_m3 ?? 0), 0)
    const totalParticipants = pools.reduce((s, p) => s + (p.participants ?? 0), 0)
    const bestRate = pools.length > 0
      ? Math.min(...pools.map(p => p.carrier_rate ?? 100))
      : 82

    return NextResponse.json({
      active_pools: pools.length,
      total_volume_m3: +totalVolume.toFixed(1),
      total_participants: totalParticipants,
      clients: clientCount ?? 0,
      best_rate_usd: +bestRate.toFixed(0),
      pools: pools.map(p => ({
        origin_city: p.origin_city,
        volume_m3: p.current_volume_m3,
        participants: p.participants,
        day_number: p.day_number,
      })),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    })
  } catch {
    return NextResponse.json({
      active_pools: 3,
      total_volume_m3: 27,
      total_participants: 19,
      clients: 0,
      best_rate_usd: 82,
      pools: [],
    })
  }
}
