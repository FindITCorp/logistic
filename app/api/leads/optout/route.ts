import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

// GET /api/leads/optout?token=xxx — baja de nurture (unsubscribe) por token.
// Link público sin auth: el token estable identifica al lead. Marca opted_out
// y cancela cualquier followup pendiente. Respuesta HTML simple para el cliente.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token')
  const html = (msg: string) =>
    new NextResponse(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FINDIT</title><body style="font-family:system-ui;max-width:480px;margin:80px auto;padding:0 20px;text-align:center;color:#1e293b"><h2>FINDIT Logistics</h2><p>${msg}</p></body>`,
      { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
    )

  if (!token) return html('Enlace inválido.')

  try {
    const db = createServerClient()
    const { data: lead } = await db
      .from('leads')
      .select('id')
      .eq('optout_token', token)
      .maybeSingle()

    if (!lead) return html('Enlace inválido o expirado.')

    await db.from('leads').update({ opted_out: true, status: 'lost' }).eq('id', lead.id)
    await db.from('lead_followups').update({ status: 'skipped' }).eq('lead_id', lead.id).eq('status', 'pending')

    return html('Listo ✅ No volverás a recibir mensajes nuestros. Si fue un error, escríbenos cuando quieras.')
  } catch {
    return html('Ocurrió un error. Intenta de nuevo más tarde.')
  }
}
