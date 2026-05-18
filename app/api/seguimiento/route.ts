import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) return NextResponse.json({ error: 'Código requerido' }, { status: 400 })

  const db = createServerClient()

  const { data: client } = await db
    .from('clients')
    .select('id, name')
    .eq('client_code', code.toUpperCase())
    .maybeSingle()

  if (!client) return NextResponse.json({ error: `Código ${code} no encontrado` }, { status: 404 })

  const { data: shipments } = await db
    .from('shipments')
    .select('*, pool:pools(origin_city, destination, day_number, status)')
    .eq('client_id', client.id)
    .order('arrived_at', { ascending: false })

  return NextResponse.json({ client_name: client.name, shipments: shipments ?? [] })
}
