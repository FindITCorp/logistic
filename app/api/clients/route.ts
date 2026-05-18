import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { registerClient } from '@/lib/clients'

const schema = z.object({
  name: z.string().min(2).max(100),
  whatsapp: z.string().min(7).max(20).optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  assignment_mode: z.enum(['auto', 'manual']),
  notify_by: z.enum(['whatsapp', 'email', 'both']),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const input = schema.parse(body)

    const client = await registerClient({
      name: input.name,
      whatsapp: input.whatsapp || undefined,
      email: input.email || undefined,
      assignment_mode: input.assignment_mode,
      notify_by: input.notify_by,
    })

    return NextResponse.json({ client }, { status: 201 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error al registrar cliente'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
