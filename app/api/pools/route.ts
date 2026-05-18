import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function GET() {
  try {
    const db = createServerClient()
    const { data: pools, error } = await db
      .from('pools')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ pools })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
