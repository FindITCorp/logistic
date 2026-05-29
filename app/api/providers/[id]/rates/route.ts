import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken } from '@/lib/adminAuth'

const schema = z.object({
  origin_city: z.enum(['shanghai', 'guangzhou', 'shenzhen']),
  min_volume_m3: z.number().min(0),
  max_volume_m3: z.number().positive().nullable(),
  rate_per_m3: z.number().positive(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifyAdminToken(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await req.json()
    const input = schema.parse(body)
    const db = createServerClient()
    const { data, error } = await db
      .from('provider_rates')
      .insert({ ...input, provider_id: params.id })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ rate: data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await verifyAdminToken(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const rateId = req.nextUrl.searchParams.get('rate_id')
  if (!rateId) return NextResponse.json({ error: 'rate_id requerido' }, { status: 400 })
  const db = createServerClient()
  await db.from('provider_rates').delete().eq('id', rateId).eq('provider_id', params.id)
  return NextResponse.json({ ok: true })
}
