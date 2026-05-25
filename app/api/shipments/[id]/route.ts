import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'

const updateSchema = z.object({
  invoice_received: z.boolean().optional(),
  declared_value: z.number().positive().optional(),
  advance_paid: z.boolean().optional(),
  advance_amount: z.number().positive().optional(),
  final_paid: z.boolean().optional(),
  final_amount: z.number().positive().optional(),
  notes: z.string().optional(),
  status: z.enum(['at_tocumen', 'delivered']).optional(),
})

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const db = createServerClient()
  const { data, error } = await db
    .from('shipments')
    .select('*, client:clients(*), pool:pools(*)')
    .eq('id', params.id)
    .single()
  if (error || !data) return NextResponse.json({ error: 'Envío no encontrado' }, { status: 404 })
  return NextResponse.json({ shipment: data })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const input = updateSchema.parse(body)
    const db = createServerClient()

    const updates: Record<string, unknown> = { ...input }
    if (input.status === 'delivered') {
      updates.pickup_at = new Date().toISOString()
    }

    const { data, error } = await db
      .from('shipments')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json({ shipment: data })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}
