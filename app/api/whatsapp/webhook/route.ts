import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'
import { calculateClientPrice } from '@/lib/pricing'

// ─── WhatsApp Bot — FINDIT Logistics ─────────────────────────────────────────
// Canal primario para micro-importadores: cotizar, tracking y unirse a pools
// sin salir de WhatsApp. Webhook de la WhatsApp Business Cloud API.
//
// Setup en Meta Developer Console:
//   Webhook URL: https://logistic-six-alpha.vercel.app/api/whatsapp/webhook
//   Verify Token: WHATSAPP_VERIFY_TOKEN (env var)
//   Subscribed fields: messages

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://logistic-six-alpha.vercel.app'
const ORIGINS = ['guangzhou', 'shanghai', 'shenzhen']
const CITY_LABEL: Record<string, string> = {
  guangzhou: 'Guangzhou', shanghai: 'Shanghai', shenzhen: 'Shenzhen',
}
const STATUS_EMOJI: Record<string, string> = {
  received: '📦 En bodega China',
  assigned: '✅ Consolidado en pool',
  in_transit: '🚢 En tránsito',
  at_colon: '🇵🇦 Llegó a Colón',
  at_tocumen: '🏛️ Aduana Tocumen',
  delivered: '🎉 Listo para retirar',
}

// ── GET — Verificación del webhook ────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  if (
    p.get('hub.mode') === 'subscribe' &&
    p.get('hub.verify_token') === process.env.WHATSAPP_VERIFY_TOKEN
  ) {
    return new Response(p.get('hub.challenge') ?? '', { status: 200 })
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

// ── POST — Mensajes entrantes ─────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
    if (!message?.text?.body) return NextResponse.json({ ok: true })

    const from: string = message.from
    const text: string = message.text.body.toLowerCase().trim()

    const db = createServerClient()
    const reply = await handleMessage(db, text, from)

    if (reply && process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID) {
      await fetch(
        `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            type: 'text',
            text: { body: reply },
          }),
        },
      )
    }

    return NextResponse.json({ ok: true })
  } catch {
    // WhatsApp espera siempre 200 — nunca dejar que falle el ACK
    return NextResponse.json({ ok: true })
  }
}

// ── Dispatcher de comandos ────────────────────────────────────────────────────

type DB = ReturnType<typeof createServerClient>

async function handleMessage(db: DB, text: string, _from: string): Promise<string> {
  // precio [volumen] [origen] — cotización inmediata
  if (/^(precio|cotizar|cuanto|cuánto|quote)/.test(text)) {
    return handlePrecio(db, text)
  }

  // tracking [código] — estado de la carga
  if (/^(tracking|seguimiento|donde|dónde|carga|envio|envío)/.test(text)) {
    return handleTracking(db, text)
  }

  // pools — ver pools activos y precios
  if (/^(pools?|ver pool|pools activos|disponible)/.test(text)) {
    return handlePools(db)
  }

  // unirse [pool_number] — cómo unirse
  if (/^(unirse|unirme|unir|join|registro|registrar)/.test(text)) {
    return `🌏 Para unirte a un pool:\n\n1️⃣ Regístrate aquí:\n${SITE}/registro\n\n2️⃣ Tu código FDT llega en segundos\n3️⃣ Elige tu pool en:\n${SITE}/pools\n\n_FINDIT Logistics — China → Panamá_`
  }

  // ayuda / start
  return helpMessage()
}

async function handlePrecio(db: DB, text: string): Promise<string> {
  const parts = text.split(/\s+/)
  const vol = parseFloat(parts[1] ?? '1') || 1
  const originRaw = parts.slice(2).join(' ')
  const origin = ORIGINS.find(o => originRaw.includes(o) || text.includes(o)) ?? 'guangzhou'

  const { data: pool } = await db
    .from('pools')
    .select('current_volume_m3, day_number, pool_number')
    .eq('status', 'active')
    .eq('origin_city', origin)
    .order('day_number', { ascending: false })
    .limit(1)
    .single()

  if (!pool) {
    return `No hay pool activo para ${CITY_LABEL[origin]} ahora.\n\nRegístrate para que te avisemos cuando abra:\n${SITE}/registro`
  }

  const { clientPrice, finditMargin } = calculateClientPrice(pool.day_number, pool.current_volume_m3 + vol)
  const totalCliente = clientPrice * vol
  const ahorroVsCasillero = (420 - clientPrice) * vol
  const city = CITY_LABEL[origin]

  return (
    `💰 *Cotización FINDIT*\n\n` +
    `📦 ${vol} m³ desde ${city} → Panamá\n` +
    `🏷️ Precio: *$${clientPrice.toFixed(0)}/m³*\n` +
    `💵 Total estimado: *$${totalCliente.toFixed(0)}*\n` +
    `✅ Ahorro vs casillero: *$${ahorroVsCasillero.toFixed(0)}* (${((ahorroVsCasillero / (420 * vol)) * 100).toFixed(0)}% menos)\n\n` +
    `📅 Pool #${pool.pool_number} · Día ${pool.day_number}/10\n` +
    `   _(precio baja a medida que el pool llena)_\n\n` +
    `👉 Únete ahora: ${SITE}/pools/${pool.pool_number}\n\n` +
    `_FINDIT Logistics — ${finditMargin.toFixed(0)}%+ de ahorro garantizado_`
  )
}

async function handleTracking(db: DB, text: string): Promise<string> {
  const match = text.match(/fdt[-\s]?(\d{4})/i)
  const code = match ? `FDT-${match[1]}` : text.split(/\s+/).find(w => /^fdt/i.test(w))?.toUpperCase()

  if (!code) {
    return `Para rastrear tu carga escribe:\n\n*tracking FDT-1234*\n\nO visita:\n${SITE}/seguimiento`
  }

  const { data: shipments } = await db
    .from('shipments')
    .select('status, volume_m3, origin_city, pool:pools(pool_number, status, day_number)')
    .eq('client_code', code)
    .order('created_at', { ascending: false })
    .limit(3)

  if (!shipments?.length) {
    return `No encontré envíos para *${code}*.\n\nVerifica tu código en:\n${SITE}/seguimiento`
  }

  let reply = `📍 *Tracking ${code}*\n\n`
  for (const s of shipments) {
    const poolRaw = s.pool
    const pool = Array.isArray(poolRaw) ? poolRaw[0] : poolRaw
    reply += `${STATUS_EMOJI[s.status] ?? s.status}\n`
    reply += `${s.volume_m3} m³ · ${CITY_LABEL[s.origin_city] ?? s.origin_city}\n`
    if (pool && s.status !== 'delivered') {
      reply += `Pool #${pool.pool_number} · Día ${pool.day_number}/10\n`
    }
    reply += '\n'
  }
  reply += `🔗 Ver detalle completo:\n${SITE}/seguimiento?code=${code}`
  return reply
}

async function handlePools(db: DB): Promise<string> {
  const { data: pools } = await db
    .from('pools')
    .select('pool_number, origin_city, current_volume_m3, day_number, participants')
    .eq('status', 'active')
    .order('day_number', { ascending: true })

  if (!pools?.length) return `No hay pools activos en este momento.\n\nRegístrate para que te avisemos:\n${SITE}/registro`

  let reply = `🚢 *Pools activos FINDIT*\n\n`
  for (const p of pools) {
    const { clientPrice } = calculateClientPrice(p.day_number, p.current_volume_m3 + 1)
    const pct = Math.round((p.current_volume_m3 / 20) * 100)
    const bar = '█'.repeat(Math.floor(pct / 10)) + '░'.repeat(10 - Math.floor(pct / 10))
    reply += `*Pool #${p.pool_number}* — ${CITY_LABEL[p.origin_city] ?? p.origin_city}\n`
    reply += `${bar} ${pct}%\n`
    reply += `📦 ${p.current_volume_m3}m³ · 👥 ${p.participants} · 📅 Día ${p.day_number}/10\n`
    reply += `💰 Desde *$${clientPrice.toFixed(0)}/m³*\n\n`
  }
  reply += `Ver todos: ${SITE}/pools`
  return reply
}

function helpMessage(): string {
  return (
    `🌏 *FINDIT Logistics — China → Panamá*\n\n` +
    `Consolidamos tu carga al mejor precio.\n\n` +
    `*Comandos:*\n` +
    `📊 *precio [m³] [ciudad]*\n` +
    `   _ej: precio 3 guangzhou_\n\n` +
    `📍 *tracking FDT-1234*\n` +
    `   _rastrear tu carga_\n\n` +
    `🚢 *pools*\n` +
    `   _ver disponibilidad y precios_\n\n` +
    `✅ *unirse*\n` +
    `   _cómo registrarte_\n\n` +
    `_Ahorra hasta 57% vs casillero ($420/m³)_\n` +
    `${SITE}`
  )
}
