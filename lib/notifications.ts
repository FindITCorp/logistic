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
