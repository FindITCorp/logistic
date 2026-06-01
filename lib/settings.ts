import { createServerClient } from './supabase/client'

// ─── Runtime feature flags ────────────────────────────────────────────────────
// Lee toggles desde app_settings (controlable por el admin sin redeploy).
// Orden de resolución: DB → env var → default. Cachea 30s para no martillar
// la DB en cada invocación del cron / request.

type SettingKey = 'nurture_enabled' | 'notifications_enabled' | 'optimizer_auto_apply'

// Mapeo a la env var histórica (fallback si la fila no existe en DB).
const ENV_FALLBACK: Record<SettingKey, string | undefined> = {
  nurture_enabled: process.env.NURTURE_ENABLED,
  notifications_enabled: process.env.NOTIFICATIONS_ENABLED,
  optimizer_auto_apply: process.env.OPTIMIZER_AUTO_APPLY,
}

const CACHE_TTL_MS = 30_000
let cache: { at: number; values: Record<string, string> } | null = null

async function loadAll(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.values
  const values: Record<string, string> = {}
  try {
    const db = createServerClient()
    const { data } = await db.from('app_settings').select('key, value')
    for (const row of data ?? []) values[row.key] = row.value
  } catch {
    // DB inaccesible → caemos a env/default abajo.
  }
  cache = { at: Date.now(), values }
  return values
}

/** Lee un flag booleano. DB gana sobre env; ambos sobre el default (false). */
export async function isEnabled(key: SettingKey): Promise<boolean> {
  const all = await loadAll()
  if (key in all) return all[key] === 'true'
  const env = ENV_FALLBACK[key]
  if (env !== undefined) return env === 'true'
  return false
}

/** Escribe un flag (admin). Invalida la caché. */
export async function setSetting(key: SettingKey, value: boolean, updatedBy?: string): Promise<void> {
  const db = createServerClient()
  await db.from('app_settings').upsert(
    { key, value: value ? 'true' : 'false', updated_at: new Date().toISOString(), updated_by: updatedBy ?? null },
    { onConflict: 'key' },
  )
  cache = null
}

/** Snapshot de todos los flags para la UI de admin. */
export async function getAllSettings(): Promise<Record<SettingKey, boolean>> {
  const [nurture, notifications, optimizer] = await Promise.all([
    isEnabled('nurture_enabled'),
    isEnabled('notifications_enabled'),
    isEnabled('optimizer_auto_apply'),
  ])
  return { nurture_enabled: nurture, notifications_enabled: notifications, optimizer_auto_apply: optimizer }
}
