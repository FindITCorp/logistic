import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'

const schema = z.object({
  name: z.string().min(2),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  origin_city: z.enum(['shanghai', 'guangzhou', 'shenzhen']).optional(),
  monthly_volume_m3: z.number().positive().optional(),
  product_type: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)
    const db = createServerClient()
    const { data, error } = await db.from('leads').insert(input).select().single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ lead: data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}

export async function GET() {
  const db = createServerClient()
  const { data } = await db
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json({ leads: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  const db = createServerClient()
  await db.from('leads').update({ status }).eq('id', id)
  return NextResponse.json({ ok: true })
}
