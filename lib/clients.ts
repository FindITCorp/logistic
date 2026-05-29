import { createServerClient } from './supabase/client'
import type { Client, AssignmentMode, NotifyBy } from './supabase/database.types'

function generateClientCode(): string {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `FDT-${num}`
}

export interface RegisterClientInput {
  name: string
  whatsapp?: string
  email?: string
  assignment_mode: AssignmentMode
  notify_by: NotifyBy
  referred_by_code?: string
}

export async function registerClient(input: RegisterClientInput): Promise<Client> {
  const db = createServerClient()

  // Ensure code is unique — retry up to 5 times
  let client_code = generateClientCode()
  for (let i = 0; i < 5; i++) {
    const { data } = await db.from('clients').select('id').eq('client_code', client_code).maybeSingle()
    if (!data) break
    client_code = generateClientCode()
  }

  // referral_code = the client's own code (what they share). referred_by_code
  // links to whoever invited them (viral growth loop).
  const { data, error } = await db
    .from('clients')
    .insert({ ...input, client_code, referral_code: client_code })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getClientByCode(client_code: string): Promise<Client | null> {
  const db = createServerClient()
  const { data } = await db.from('clients').select('*').eq('client_code', client_code).maybeSingle()
  return data
}

export async function getAllClients(): Promise<Client[]> {
  const db = createServerClient()
  const { data } = await db.from('clients').select('*').order('created_at', { ascending: false })
  return data ?? []
}

// Shipping address shown to client after registration
export const WAREHOUSE_CHINA = {
  name: 'FINDIT Logistics — Bodega China',
  address: 'No. 123, Tianhe North Road',
  city: 'Guangzhou, Guangdong',
  country: 'China 510620',
  phone: '+86 XXX XXXX XXXX',
}

export function buildShippingAddress(client: Client): string {
  return [
    `${client.name} | ${client.client_code}`,
    WAREHOUSE_CHINA.name,
    WAREHOUSE_CHINA.address,
    WAREHOUSE_CHINA.city,
    WAREHOUSE_CHINA.country,
    `Tel: ${WAREHOUSE_CHINA.phone}`,
  ].join('\n')
}
