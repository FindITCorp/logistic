import QRCode from 'qrcode'

export async function generateQRDataURL(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  })
}

export function buildWhatsAppLink(phone: string, message: string): string {
  const clean = phone.replace(/\D/g, '')
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`
}

export function buildAssignmentMessage(params: {
  clientName: string
  clientCode: string
  originCity: string
  poolDay: number
  pricePerM3: number
  volumeM3: number
}): string {
  const total = (params.pricePerM3 * params.volumeM3).toFixed(2)
  return `Hola ${params.clientName} 👋

Tu mercancía con código *${params.clientCode}* llegó a nuestra bodega en ${params.originCity.charAt(0).toUpperCase() + params.originCity.slice(1)}.

✅ *Asignada al pool activo*
📦 Volumen: ${params.volumeM3} m³
💰 Tu precio: $${params.pricePerM3}/m³
💵 Total estimado: $${total}

Recibirás otra notificación cuando el barco zarpe (aproximadamente 10 días).

_FINDIT Logistics — China → Panamá_`
}

export function buildArrivalMessage(params: {
  clientName: string
  clientCode: string
  originCity: string
  volumeM3: number
  selectUrl: string
}): string {
  return `Hola ${params.clientName} 👋

Tu mercancía *${params.clientCode}* llegó a nuestra bodega en ${params.originCity.charAt(0).toUpperCase() + params.originCity.slice(1)}.

📦 Volumen registrado: ${params.volumeM3} m³

Elige el pool donde quieres consolidar tu carga:
👉 ${params.selectUrl}

_FINDIT Logistics — China → Panamá_`
}

// ─── Mensajes por transición de ciclo de vida del pool ────────────────────────
// Uno por cada estado al que avanza un pool. Se envían a todos los miembros
// automáticamente cuando el pool cambia de estado (manual o por el autopilot).

export interface LifecycleParams {
  clientName: string
  clientCode: string
  poolNumber: number
  pricePerM3?: number | null
  volumeM3?: number | null
  trackUrl?: string
}

const SIGNATURE = '_FINDIT Logistics — China → Panamá_'

export function buildLifecycleMessage(
  status: 'closed' | 'in_transit' | 'at_colon' | 'at_tocumen' | 'completed',
  p: LifecycleParams,
): { subject: string; body: string } | null {
  const hi = `Hola ${p.clientName} 👋`
  const ref = `Pool #${p.poolNumber} · ${p.clientCode}`
  const track = p.trackUrl ? `\n\nSigue tu carga:\n👉 ${p.trackUrl}` : ''

  switch (status) {
    case 'closed': {
      const price = p.pricePerM3 != null ? `\n💰 Tu precio final quedó en *$${p.pricePerM3}/m³*.` : ''
      return {
        subject: `Tu pool #${p.poolNumber} cerró — precio final confirmado`,
        body: `${hi}\n\nEl ${ref} cerró y ya está listo para zarpar.${price}\n\nTe avisamos cuando el barco salga de China.${track}\n\n${SIGNATURE}`,
      }
    }
    case 'in_transit':
      return {
        subject: `Tu carga zarpó — Pool #${p.poolNumber} en tránsito`,
        body: `${hi}\n\n🚢 El ${ref} zarpó de China rumbo a Panamá. El tránsito marítimo toma aproximadamente 40 días.${track}\n\n${SIGNATURE}`,
      }
    case 'at_colon':
      return {
        subject: `Tu carga llegó a Colón — Pool #${p.poolNumber}`,
        body: `${hi}\n\n⚓ El ${ref} llegó al puerto de Colón. Estamos coordinando el despacho aduanal y el traslado a nuestra bodega en Panamá.${track}\n\n${SIGNATURE}`,
      }
    case 'at_tocumen':
      return {
        subject: `Casi listo — Pool #${p.poolNumber} en aduana`,
        body: `${hi}\n\n📋 El ${ref} está en proceso aduanal en Panamá. Pronto recibirás el detalle de impuestos y la coordinación de entrega.${track}\n\n${SIGNATURE}`,
      }
    case 'completed':
      return {
        subject: `Tu carga está lista para retiro — Pool #${p.poolNumber}`,
        body: `${hi}\n\n✅ El ${ref} completó el proceso. Tu mercancía está lista para retiro/entrega.\n\nCoordina con nosotros para recibir tu carga.${track}\n\n${SIGNATURE}`,
      }
    default:
      return null
  }
}
