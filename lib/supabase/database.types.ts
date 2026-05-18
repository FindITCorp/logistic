export type AssignmentMode = 'auto' | 'manual'
export type NotifyBy = 'whatsapp' | 'email' | 'both'
export type PoolStatus = 'active' | 'closed' | 'shipped'
export type ShipmentStatus = 'received' | 'assigned' | 'shipped'
export type OriginCity = 'shanghai' | 'guangzhou' | 'shenzhen'

export interface Client {
  id: string
  client_code: string        // FDT-XXXX — shown in shipping address
  name: string
  whatsapp: string | null
  email: string | null
  assignment_mode: AssignmentMode
  notify_by: NotifyBy
  created_at: string
}

export interface Pool {
  id: string
  pool_number: number        // human-readable: Pool #001
  origin_city: OriginCity
  destination: string
  current_volume_m3: number
  participants: number
  day_number: number         // 1–10
  status: PoolStatus
  carrier_rate: number
  created_at: string
}

export interface Shipment {
  id: string
  client_id: string
  client_code: string
  weight_kg: number
  volume_m3: number
  origin_city: OriginCity
  status: ShipmentStatus
  pool_id: string | null
  price_per_m3: number | null
  arrived_at: string
  assigned_at: string | null
  created_at: string
  // joined relations
  client?: Client
  pool?: Pool
}

export interface PoolMember {
  id: string
  pool_id: string
  shipment_id: string
  client_id: string
  volume_m3: number
  price_per_m3: number
  joined_at: string
}

export interface Database {
  public: {
    Tables: {
      clients: { Row: Client; Insert: Omit<Client, 'id' | 'created_at'>; Update: Partial<Client> }
      pools: { Row: Pool; Insert: Omit<Pool, 'id' | 'created_at'>; Update: Partial<Pool> }
      shipments: { Row: Shipment; Insert: Omit<Shipment, 'id' | 'created_at'>; Update: Partial<Shipment> }
      pool_members: { Row: PoolMember; Insert: Omit<PoolMember, 'id'>; Update: Partial<PoolMember> }
    }
  }
}
