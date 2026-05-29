// Simple in-memory rate limiter (per serverless instance).
// Limits by IP to prevent obvious abuse on public endpoints.
// Not a substitute for WAF/CDN rate limiting in production.

interface Entry { count: number; resetAt: number }

const store = new Map<string, Entry>()

export function checkRateLimit(
  ip: string,
  key: string,
  max: number,
  windowMs: number,
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const storeKey = `${key}:${ip}`
  let entry = store.get(storeKey)

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs }
    store.set(storeKey, entry)
  }

  entry.count++
  const allowed = entry.count <= max
  return { allowed, remaining: Math.max(0, max - entry.count) }
}

export function getClientIp(req: Request): string {
  return (
    (req.headers as Headers).get('x-forwarded-for')?.split(',')[0]?.trim() ||
    (req.headers as Headers).get('x-real-ip') ||
    'unknown'
  )
}
