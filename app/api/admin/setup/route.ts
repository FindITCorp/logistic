import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  setup_key: z.string(),
})

// POST /api/admin/setup — create first admin account
// Only works if no admin accounts exist yet AND setup_key matches env var
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, setup_key } = schema.parse(body)

    const expectedKey = process.env.ADMIN_SETUP_KEY
    if (!expectedKey || setup_key !== expectedKey) {
      return NextResponse.json({ error: 'Clave de configuración inválida' }, { status: 403 })
    }

    const db = createServerClient()

    // Only allow if no admins exist
    const { count } = await db.from('admin_users').select('id', { count: 'exact', head: true })
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: 'Ya existe al menos un administrador. Usa el panel para agregar más.' },
        { status: 409 },
      )
    }

    const { default: bcrypt } = await import('bcryptjs')
    const hash = await bcrypt.hash(password, 12)

    const { data, error } = await db
      .from('admin_users')
      .insert({ email, password_hash: hash, role: 'admin' })
      .select('id, email, role')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ ok: true, admin: data }, { status: 201 })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error' },
      { status: 400 },
    )
  }
}
