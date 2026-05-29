import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken } from '@/lib/adminAuth'
import { joinPoolAtomic, mapJoinError } from '@/lib/poolAssignment'

const schema = z.object({ pool_id: z.string().uuid() })

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifyAdminToken(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const { pool_id } = schema.parse(await req.json())
    const db = createServerClient()

    // Atomic, race-free assignment via the join_pool() SQL function.
    const { data, error } = await joinPoolAtomic(db, pool_id, params.id)
    if (error) {
      const { message, status } = mapJoinError(error)
      return NextResponse.json({ error: message }, { status })
    }

    return NextResponse.json({ price_per_m3: data!.price_per_m3, pool_id })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
