export type AssignmentMode = 'auto' | 'manual'
export type NotifyBy = 'whatsapp' | 'email' | 'both'
export type PoolStatus = 'active' | 'closed' | 'in_transit' | 'at_colon' | 'at_tocumen' | 'completed'
export type ShipmentStatus = 'received' | 'assigned' | 'in_transit' | 'at_tocumen' | 'delivered'
export type OriginCity = 'shanghai' | 'guangzhou' | 'shenzhen'

export interface Client {
  id: string
  client_code: string
  name: string
  whatsapp: string | null
  email: string | null
  assignment_mode: AssignmentMode
  notify_by: NotifyBy
  created_at: string
}

export interface Pool {
  id: string
  pool_number: number
  origin_city: OriginCity
  destination: string
  current_volume_m3: number
  participants: number
  day_number: number
  status: PoolStatus
  carrier_rate: number
  provider_id: string | null
  reference_price_m3: number
  departure_date: string | null
  created_at: string
  dispatched_at: string | null
  arrived_colon_at: string | null
  arrived_tocumen_at: string | null
  completed_at: string | null
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
  declared_value: number | null
  invoice_received: boolean
  advance_paid: boolean
  advance_amount: number | null
  final_paid: boolean
  final_amount: number | null
  pickup_at: string | null
  notes: string | null
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
