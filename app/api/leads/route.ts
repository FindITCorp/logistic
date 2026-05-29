import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerClient } from '@/lib/supabase/client'
import { verifyAdminToken, requireAdmin } from '@/lib/adminAuth'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

const schema = z.object({
  name: z.string().min(2),
  whatsapp: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  origin_city: z.enum(['shanghai', 'guangzhou', 'shenzhen']).optional(),
  monthly_volume_m3: z.number().positive().optional(),
  product_type: z.string().optional(),
  notes: z.string().optional(),
  pool_id: z.string().uuid().optional(),
  source: z.string().optional(),
})

async function notifyViaGitHubIssue(lead: Record<string, unknown>) {
  const token = process.env.GITHUB_TOKEN_NOTIFY
  if (!token) return
  await fetch('https://api.github.com/repos/FindITCorp/logistic/issues', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `[LEAD] ${lead.name} — ${lead.origin_city ?? 'ciudad ?'} — ${lead.monthly_volume_m3 ?? '?'}m³`,
      body: `**Nuevo lead del formulario de landing**\n\n` +
        `- **Nombre:** ${lead.name}\n` +
        `- **WhatsApp:** ${lead.whatsapp ?? '—'}\n` +
        `- **Email:** ${lead.email ?? '—'}\n` +
        `- **Ciudad origen:** ${lead.origin_city ?? '—'}\n` +
        `- **Volumen mensual:** ${lead.monthly_volume_m3 ?? '—'} m³\n` +
        `- **Productos:** ${lead.product_type ?? '—'}\n\n` +
        `> Registrado automáticamente desde logistic-six-alpha.vercel.app`,
      labels: ['lead', 'new'],
    }),
  }).catch(() => null)
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const { allowed } = checkRateLimit(ip, 'leads', 5, 60_000) // 5 per minute per IP
  if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  try {
    const body = await req.json()
    const input = schema.parse(body)

    // Try Supabase first
    try {
      const db = createServerClient()
      const { data, error } = await db.from('leads').insert(input).select().single()
      if (!error) {
        notifyViaGitHubIssue(input).catch(() => null) // async, don't block
        return NextResponse.json({ lead: data }, { status: 201 })
      }
      console.error('Supabase error:', error.message)
    } catch (dbErr) {
      console.error('DB connection failed:', dbErr)
    }

    // Fallback: notify via GitHub issue so no lead is lost
    await notifyViaGitHubIssue({ ...input, _fallback: true })
    return NextResponse.json({ lead: { ...input, id: crypto.randomUUID(), fallback: true } }, { status: 201 })

  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}

export async function GET(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  try {
    const db = createServerClient()
    const { data } = await db
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
    return NextResponse.json({ leads: data ?? [] })
  } catch {
    return NextResponse.json({ leads: [] })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  try {
    const { id, status } = await req.json()
    const db = createServerClient()
    await db.from('leads').update({ status }).eq('id', id)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
