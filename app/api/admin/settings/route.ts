import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAdminToken, requireAdmin } from '@/lib/adminAuth'
import { getAllSettings, setSetting } from '@/lib/settings'

// GET /api/admin/settings — snapshot de feature flags de autonomía
export async function GET(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  const settings = await getAllSettings()
  return NextResponse.json({ settings })
}

const patchSchema = z.object({
  nurture_enabled: z.boolean().optional(),
  notifications_enabled: z.boolean().optional(),
  optimizer_auto_apply: z.boolean().optional(),
  pool_alerts_enabled: z.boolean().optional(),
})

// PATCH /api/admin/settings — encender/apagar flags en runtime (sin redeploy)
export async function PATCH(req: NextRequest) {
  const session = await verifyAdminToken(req)
  const authError = requireAdmin(session)
  if (authError) return authError

  try {
    const input = patchSchema.parse(await req.json())
    if (input.nurture_enabled !== undefined)
      await setSetting('nurture_enabled', input.nurture_enabled, session!.email)
    if (input.notifications_enabled !== undefined)
      await setSetting('notifications_enabled', input.notifications_enabled, session!.email)
    if (input.optimizer_auto_apply !== undefined)
      await setSetting('optimizer_auto_apply', input.optimizer_auto_apply, session!.email)
    if (input.pool_alerts_enabled !== undefined)
      await setSetting('pool_alerts_enabled', input.pool_alerts_enabled, session!.email)

    const settings = await getAllSettings()
    return NextResponse.json({ ok: true, settings })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 400 })
  }
}
