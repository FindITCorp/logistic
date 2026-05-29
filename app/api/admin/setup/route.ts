import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export async function POST(req: NextRequest) {
  try {
    const { key, email, password } = await req.json()

    if (!key || key !== process.env.ADMIN_SETUP_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminEmail = email ?? process.env.ADMIN_EMAIL
    if (!adminEmail || !password) {
      return NextResponse.json({ error: 'email and password required' }, { status: 400 })
    }

    const { default: bcrypt } = await import('bcryptjs')
    const passwordHash = await bcrypt.hash(password, 12)

    const db = createServerClient()

    // Check if admin already exists
    const { data: existing } = await db
      .from('admin_users')
      .select('id')
      .eq('email', adminEmail)
      .maybeSingle()

    if (existing) {
      // Update password hash
      await db
        .from('admin_users')
        .update({ password_hash: passwordHash })
        .eq('email', adminEmail)
      return NextResponse.json({ ok: true, action: 'password_updated', email: adminEmail })
    }

    const { error } = await db.from('admin_users').insert({
      email: adminEmail,
      password_hash: passwordHash,
      role: 'admin',
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, action: 'created', email: adminEmail })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
