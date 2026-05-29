import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

// GET /api/referrals?code=FDT-XXXX
// Public: returns how many clients a given code has referred (viral loop stats).
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.toUpperCase()
  if (!code || !/^FDT-\d{4}$/.test(code)) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  const db = createServerClient()
  const { count } = await db
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('referred_by_code', code)

  return NextResponse.json({
    code,
    referred_count: count ?? 0,
    share_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://logistic-six-alpha.vercel.app'}/registro?ref=${code}`,
  })
}
