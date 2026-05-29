// Unified notification dispatcher — the autonomy layer's outbound channel.
//
// Tries drivers in order of preference and returns which one fired. Becomes
// fully autonomous the moment a channel credential is set in env; until then
// it falls back to a GitHub Issue (same pattern as the lead capture fallback)
// so NOTHING is ever silently lost.
//
// Channels (auto-detected by env vars):
//   WhatsApp Cloud API  → WHATSAPP_TOKEN + WHATSAPP_PHONE_ID
//   Email (Resend)      → RESEND_API_KEY + NOTIFY_EMAIL_FROM
//   Fallback            → GITHUB_TOKEN_NOTIFY (creates an Issue as an inbox)

export type NotifyChannel = 'whatsapp' | 'email' | 'github' | 'none'

export interface NotifyTarget {
  whatsapp?: string | null
  email?: string | null
  name?: string | null
}

export interface NotifyResult {
  channel: NotifyChannel
  ok: boolean
  detail?: string
}

async function sendWhatsApp(phone: string, body: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID
  if (!token || !phoneId) return false
  const clean = phone.replace(/\D/g, '')
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: clean,
        type: 'text',
        text: { body },
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.NOTIFY_EMAIL_FROM
  if (!key || !from) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, text: body }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function sendGitHubFallback(subject: string, body: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN_NOTIFY
  if (!token) return false
  try {
    const res = await fetch('https://api.github.com/repos/FindITCorp/logistic/issues', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `[NOTIFY] ${subject}`, body, labels: ['notification'] }),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * Dispatch a message to a target through the best available channel.
 * `subject` is used for email/GitHub; WhatsApp uses `body` only.
 */
export async function notify(
  target: NotifyTarget,
  subject: string,
  body: string,
): Promise<NotifyResult> {
  if (target.whatsapp && (await sendWhatsApp(target.whatsapp, body)))
    return { channel: 'whatsapp', ok: true }

  if (target.email && (await sendEmail(target.email, subject, body)))
    return { channel: 'email', ok: true }

  if (await sendGitHubFallback(subject, `**Para:** ${target.name ?? target.whatsapp ?? target.email ?? '—'}\n\n${body}`))
    return { channel: 'github', ok: true }

  return { channel: 'none', ok: false, detail: 'No notification channel configured' }
}
