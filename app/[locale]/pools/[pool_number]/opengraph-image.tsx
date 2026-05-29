import { ImageResponse } from 'next/og'
import { createServerClient } from '@/lib/supabase/client'

// Shareable card for each pool — designed to be dropped into WhatsApp groups
// of Panamanian importers (the real acquisition channel). Renders live pool
// volume + savings so the link sells itself. This is the organic viral loop.

export const runtime = 'nodejs'
export const alt = 'Pool de carga FINDIT China → Panamá'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const CITY: Record<string, string> = { guangzhou: 'Guangzhou', shanghai: 'Shanghai', shenzhen: 'Shenzhen' }

export default async function Image({ params }: { params: { pool_number: string } }) {
  let origin = 'China'
  let volume = 0
  let day = 1
  try {
    const db = createServerClient()
    const { data } = await db
      .from('pools')
      .select('origin_city, current_volume_m3, day_number')
      .eq('pool_number', Number(params.pool_number))
      .maybeSingle()
    if (data) {
      origin = CITY[data.origin_city] ?? 'China'
      volume = Number(data.current_volume_m3 ?? 0)
      day = data.day_number ?? 1
    }
  } catch {
    // fall through to defaults
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
          background: 'linear-gradient(135deg, #0b1220 0%, #0f2744 100%)',
          color: 'white', padding: 70, justifyContent: 'space-between',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, fontWeight: 800 }}>F</div>
          <div style={{ fontSize: 34, fontWeight: 700 }}>FINDIT Logistic</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 30, color: '#7dd3fc' }}>Pool #{params.pool_number} · Día {day}/10</div>
          <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.05 }}>{origin} → Colón, Panamá</div>
          <div style={{ fontSize: 38, color: '#34d399' }}>{volume.toFixed(1)} m³ acumulados · ahorra hasta 40% vs casillero</div>
        </div>

        <div style={{ fontSize: 30, color: '#94a3b8' }}>Únete al pool y baja tu precio por m³ →  logistic-six-alpha.vercel.app</div>
      </div>
    ),
    size,
  )
}
