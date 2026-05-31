import type { SupabaseClient } from '@supabase/supabase-js'
import { notify } from './notify'
import { buildLifecycleMessage } from './notifications'
import { isEnabled } from './settings'
import type { PoolStatus } from './supabase/database.types'

// ─── Notificación automática de ciclo de vida del pool ────────────────────────
// Cuando un pool cambia de estado, avisa a todos sus miembros por su canal
// preferido (WhatsApp → email → GitHub fallback vía notify()).
//
// Doble candado de seguridad:
//   1. notify() ya retorna 'none' si no hay credenciales configuradas.
//   2. notifications_enabled (app_settings) debe estar en true.
// Así el outreach real queda APAGADO hasta que el dueño lo active explícitamente.

interface ClientRel {
  name: string
  client_code: string
  whatsapp: string | null
  email: string | null
}

const NOTIFIABLE: PoolStatus[] = ['closed', 'in_transit', 'at_colon', 'at_tocumen', 'completed']

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://logistic-six-alpha.vercel.app'

export interface LifecycleNotifyResult {
  attempted: number
  sent: number
  skipped: 'disabled' | 'not_notifiable' | null
  channels: Record<string, number>
}

/**
 * Notifica a los miembros de un pool sobre su nuevo estado.
 * No lanza: los errores por miembro se cuentan pero no abortan el lote.
 */
export async function notifyPoolMembers(
  db: SupabaseClient,
  poolId: string,
  poolNumber: number,
  newStatus: PoolStatus,
): Promise<LifecycleNotifyResult> {
  const empty = (skipped: LifecycleNotifyResult['skipped']): LifecycleNotifyResult =>
    ({ attempted: 0, sent: 0, skipped, channels: {} })

  if (!NOTIFIABLE.includes(newStatus)) return empty('not_notifiable')
  if (!(await isEnabled('notifications_enabled'))) return empty('disabled')

  const { data: members } = await db
    .from('pool_members')
    .select('volume_m3, price_per_m3, client:clients(name, client_code, whatsapp, email)')
    .eq('pool_id', poolId)

  const result: LifecycleNotifyResult = { attempted: 0, sent: 0, skipped: null, channels: {} }

  for (const m of members ?? []) {
    // Supabase tipa la relación to-one como array; normalizamos a objeto.
    const rel = (m as unknown as { client?: ClientRel | ClientRel[] }).client
    const client = Array.isArray(rel) ? rel[0] : rel
    if (!client) continue

    const msg = buildLifecycleMessage(newStatus as Parameters<typeof buildLifecycleMessage>[0], {
      clientName: client.name,
      clientCode: client.client_code,
      poolNumber,
      pricePerM3: m.price_per_m3,
      volumeM3: m.volume_m3,
      trackUrl: `${SITE}/seguimiento?code=${encodeURIComponent(client.client_code)}`,
    })
    if (!msg) continue

    result.attempted++
    const res = await notify(
      { whatsapp: client.whatsapp, email: client.email, name: client.name },
      msg.subject,
      msg.body,
    )
    if (res.ok) {
      result.sent++
      result.channels[res.channel] = (result.channels[res.channel] ?? 0) + 1
    }
  }

  return result
}
