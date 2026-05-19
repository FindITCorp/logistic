import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET(_req: NextRequest, { params }: { params: { pool_number: string } }) {
  const db = createServerClient()
  const num = parseInt(params.pool_number)
  if (isNaN(num)) return NextResponse.json({ error: 'Número de pool inválido' }, { status: 400 })

  const { data: pool } = await db
    .from('pools')
    .select('*')
    .eq('pool_number', num)
    .single()

  if (!pool) return NextResponse.json({ error: `Pool #${String(num).padStart(3,'0')} no encontrado` }, { status: 404 })

  const { data: members } = await db
    .from('pool_members')
    .select(`
      *,
      client:clients(name, client_code, whatsapp, email),
      shipment:shipments(id, volume_m3, weight_kg, origin_city, status, arrived_at,
        declared_value, invoice_received, advance_paid, advance_amount,
        final_paid, final_amount, pickup_at, notes)
    `)
    .eq('pool_id', pool.id)
    .order('joined_at', { ascending: true })

  return NextResponse.json({ pool, members: members ?? [] })
}
