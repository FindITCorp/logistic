import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken } from '@/lib/adminAuth'
import { notifyPoolMembers } from '@/lib/lifecycleNotify'
import type { PoolStatus, ShipmentStatus } from '@/lib/supabase/database.types'

// Valid forward-only transitions
const TRANSITIONS: Record<string, PoolStatus> = {
  active:     'closed',
  closed:     'in_transit',
  in_transit: 'at_colon',
  at_colon:   'at_tocumen',
  at_tocumen: 'completed',
}

// Shipment status synced when pool advances
const SHIPMENT_STATUS_FOR_POOL: Partial<Record<PoolStatus, ShipmentStatus>> = {
  in_transit: 'in_transit',
  at_tocumen: 'at_tocumen',
  completed:  'delivered',
}

const schema = z.object({
  action: z.enum(['advance']),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { pool_number: string } }) {
  const session = await verifyAdminToken(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await req.json()
    const input = schema.parse(body)
    if (input.action !== 'advance') return NextResponse.json({ error: 'Unknown action' }, { status: 400 })

    const db = createServerClient()
    const poolNum = parseInt(params.pool_number, 10)

    const { data: pool, error: pErr } = await db
      .from('pools')
      .select('id, status, pool_number')
      .eq('pool_number', poolNum)
      .single()
    if (pErr || !pool) return NextResponse.json({ error: 'Pool no encontrado' }, { status: 404 })

    const nextStatus = TRANSITIONS[pool.status]
    if (!nextStatus) {
      return NextResponse.json({ error: `Pool en estado '${pool.status}' no puede avanzar` }, { status: 400 })
    }

    // Timestamps for each transition
    const timestampField: Partial<Record<PoolStatus, string>> = {
      in_transit: 'dispatched_at',
      at_colon:   'arrived_colon_at',
      at_tocumen: 'arrived_tocumen_at',
      completed:  'completed_at',
    }
    const tsField = timestampField[nextStatus]
    const poolUpdate: Record<string, unknown> = { status: nextStatus }
    if (tsField) poolUpdate[tsField] = new Date().toISOString()

    const { data: updatedPool, error: uErr } = await db
      .from('pools')
      .update(poolUpdate)
      .eq('id', pool.id)
      .select()
      .single()
    if (uErr) throw new Error(uErr.message)

    // Sync shipment statuses when relevant
    const shipmentStatus = SHIPMENT_STATUS_FOR_POOL[nextStatus]
    if (shipmentStatus) {
      await db
        .from('shipments')
        .update({ status: shipmentStatus })
        .eq('pool_id', pool.id)
    }

    // Auto-notify members of the transition (no-op unless notifications_enabled
    // + a channel credential are set — outreach stays OFF by default).
    const notified = await notifyPoolMembers(db, pool.id, pool.pool_number, nextStatus)

    return NextResponse.json({ pool: updatedPool, previousStatus: pool.status, newStatus: nextStatus, notified })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}
