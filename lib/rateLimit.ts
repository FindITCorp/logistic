// Durable rate limiter backed by Postgres (function rate_limit_hit in 012).
// Works across serverless instances — unlike an in-memory Map, which resets
// per cold start and lets abuse through on Vercel. Fails OPEN on DB error so
// a transient DB hiccup never blocks legitimate traffic.

import { createServerClient } from '@/lib/supabase/client'

export async function checkRateLimit(
  ip: string,
  key: string,
  max: number,
  windowMs: number,
): Promise<{ allowed: boolean }> {
  try {
    const db = createServerClient()
    const { data, error } = await db.rpc('rate_limit_hit', {
      p_key: `${key}:${ip}`,
      p_max: max,
      p_window_s: Math.ceil(windowMs / 1000),
    })
    if (error) return { allowed: true } // fail open
    return { allowed: data === true }
  } catch {
    return { allowed: true } // fail open
  }
}

export function getClientIp(req: Request): string {
  const h = req.headers as Headers
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  )
}
