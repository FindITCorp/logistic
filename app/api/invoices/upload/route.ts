import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/client'

const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']

// POST /api/invoices/upload — client uploads invoice file (token-authenticated)
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const token = formData.get('token') as string | null

    if (!file || !token) {
      return NextResponse.json({ error: 'file y token son requeridos' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Solo se aceptan PDF, JPG o PNG' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo no puede superar 5 MB' }, { status: 400 })
    }

    const db = createServerClient()

    // Validate upload token
    const { data: shipment } = await db
      .from('shipments')
      .select('id, client_code')
      .eq('invoice_token', token)
      .gt('invoice_token_exp', new Date().toISOString())
      .single()

    if (!shipment) {
      return NextResponse.json({ error: 'Token inválido o expirado' }, { status: 401 })
    }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'pdf'
    const storagePath = `${shipment.client_code}/${Date.now()}.${ext}`

    const bytes = await file.arrayBuffer()

    const { data: upload, error: uploadError } = await db.storage
      .from('invoices')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Almacenamiento no configurado aún. Envía la factura por WhatsApp.' },
          { status: 503 },
        )
      }
      throw new Error(uploadError.message)
    }

    const { data: { publicUrl } } = db.storage.from('invoices').getPublicUrl(upload.path)

    return NextResponse.json({ url: publicUrl, name: file.name, path: upload.path })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al subir archivo' },
      { status: 500 },
    )
  }
}
