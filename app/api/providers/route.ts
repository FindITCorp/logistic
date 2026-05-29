import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken } from '@/lib/adminAuth'

export async function GET() {
  const db = createServerClient()
  const { data } = await db
    .from('providers')
    .select('*, rates:provider_rates(*)')
    .order('name')
  return NextResponse.json({ providers: data ?? [] })
}

const schema = z.object({
  name: z.string().min(2),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  contact_whatsapp: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await verifyAdminToken(req)
  if (!session) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  try {
    const body = await req.json()
    const input = schema.parse(body)
    const db = createServerClient()
    const { data, error } = await db.from('providers').insert(input).select().single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ provider: data }, { status: 201 })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}
