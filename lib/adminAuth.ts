import { NextRequest } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

export interface AdminSession {
  id: string
  email: string
  role: 'admin' | 'operator'
  expires_at: string
}

// Verify admin token from Authorization header or cookie.
// Returns null if invalid/expired.
export async function verifyAdminToken(req: NextRequest): Promise<AdminSession | null> {
  const token =
    req.headers.get('authorization')?.replace('Bearer ', '') ||
    req.cookies.get('admin_token')?.value

  if (!token) return null

  try {
    const db = createServerClient()
    const { data, error } = await db
      .from('admin_sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (error || !data) return null
    return data as AdminSession
  } catch {
    return null
  }
}

export function requireAdmin(session: AdminSession | null): Response | null {
  if (!session) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  return null
}
