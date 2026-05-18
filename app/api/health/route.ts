import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET() {
  const db = createServerClient()
  const checks: Record<string, boolean> = {}

  for (const table of ['clients', 'pools', 'shipments', 'orders', 'providers', 'leads']) {
    const { error } = await db.from(table as 'clients').select('id').limit(1)
    checks[table] = !error
  }

  const allOk = Object.values(checks).every(Boolean)
  return NextResponse.json({ ok: allOk, tables: checks }, { status: allOk ? 200 : 503 })
}
