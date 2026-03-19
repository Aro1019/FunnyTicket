export type UserRole = 'user' | 'admin'
export type TicketStatus = 'pending' | 'active' | 'expired' | 'cancelled'
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected'
export type PaymentMethod = 'mvola' | 'orange_money' | 'airtel_money' | 'cash'

export interface Profile {
  id: string
  identifiant: string
  full_name: string
  phone: string
  email: string | null
  role: UserRole
  created_at: string
}

export interface Pack {
  id: string
  name: string
  duration_hours: number
  price: number
  description: string | null
  is_active: boolean
  created_at: string
}

export interface VendorPaymentMethod {
  id: string
  admin_id: string
  method_type: Exclude<PaymentMethod, 'cash'>
  phone_number: string
  account_name: string
  is_active: boolean
  created_at: string
}

export interface Ticket {
  id: string
  user_id: string
  pack_id: string
  login_hotspot: string
  password_hotspot: string
  status: TicketStatus
  created_at: string
  activated_at: string | null
  expires_at: string | null
  pack?: Pack
  user?: Profile
  payment?: Payment[]
}

export interface Payment {
  id: string
  ticket_id: string
  user_id: string
  amount: number
  payment_method: PaymentMethod
  payment_method_id: string | null
  reference: string | null
  screenshot_url: string | null
  status: PaymentStatus
  confirmed_by: string | null
  confirmed_at: string | null
  created_at: string
  ticket?: Ticket
  user?: Profile
  vendor_payment?: VendorPaymentMethod
}
