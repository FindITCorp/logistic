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

    const db = createServerClient()

    // Create admin user in Supabase Auth using service role
    const { data, error } = await db.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin', name: 'FINDIT Admin' },
    })

    if (error) {
      // User already exists — try to update password instead
      if (error.message?.includes('already been registered') || error.code === 'email_exists') {
        const { data: users } = await db.auth.admin.listUsers()
        const existing = users?.users?.find(u => u.email === adminEmail)
        if (existing) {
          await db.auth.admin.updateUserById(existing.id, { password })
          return NextResponse.json({ ok: true, action: 'password_updated', email: adminEmail })
        }
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true, action: 'created', email: data.user?.email })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 })
  }
}
