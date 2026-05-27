import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { z } from 'zod'
import crypto from 'crypto'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

// POST /api/admin/auth — login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = loginSchema.parse(body)

    const db = createServerClient()
    const { data: admin } = await db
      .from('admin_users')
      .select('*')
      .eq('email', email)
      .single()

    if (!admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Compare password hash (bcrypt stored in admin_users.password_hash)
    const { default: bcrypt } = await import('bcryptjs')
    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create session token (24h)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 86400000).toISOString()

    await db.from('admin_sessions').insert({
      token,
      admin_id: admin.id,
      email: admin.email,
      role: admin.role,
      expires_at: expiresAt,
    })

    const res = NextResponse.json({ ok: true, role: admin.role })
    res.cookies.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(expiresAt),
      path: '/',
    })
    return res
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 400 },
    )
  }
}

// DELETE /api/admin/auth — logout
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (token) {
    const db = createServerClient()
    await db.from('admin_sessions').delete().eq('token', token)
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('admin_token')
  return res
}
