export type UserRole = 'admin' | 'guard' | 'homeowner'
export type UserStatus = 'pending' | 'active' | 'rejected'
export type VisitorStatus = 'registered' | 'pending' | 'approved' | 'denied'
export type NotificationType =
  | 'visitor_at_gate'
  | 'visitor_approved'
  | 'visitor_denied'
  | 'visitor_exited'
  | 'registration_approved'
  | 'registration_rejected'

export interface Profile {
  id: string
  email: string
  full_name: string
  phone: string | null
  role: UserRole
  status: UserStatus
  block: string | null
  lot: string | null
  proof_of_id_urls: string[]
  avatar_url: string | null
  email_confirmed: boolean
  created_at: string
  updated_at: string
}

export interface Visitor {
  id: string
  name: string
  phone: string | null
  purpose: string
  vehicle_plate: string | null
  homeowner_id: string
  qr_code: string
  proof_urls: string[]
  status: VisitorStatus
  denial_reason: string | null
  expires_at: string
  created_at: string
}

export interface VisitLog {
  id: string
  visitor_id: string
  guard_id: string
  entry_time: string | null
  exit_time: string | null
  created_at: string
}

export interface BlockLot {
  id: string
  block: string
  lot: string
  is_occupied: boolean
  occupied_by: string | null
  created_at: string
}

export interface GuardShift {
  id: string
  guard_id: string
  clocked_in_at: string
  clocked_out_at: string | null
  auto_closed: boolean
  created_at: string
}

export interface GuardShiftWithGuard extends GuardShift {
  guard: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType
  related_visitor_id: string | null
  is_read: boolean
  created_at: string
}

// Joined types for queries
export interface VisitorWithHomeowner extends Visitor {
  homeowner: Pick<Profile, 'id' | 'full_name' | 'block' | 'lot' | 'phone'>
}

export interface VisitLogWithDetails extends VisitLog {
  visitor: Pick<Visitor, 'id' | 'name' | 'purpose' | 'vehicle_plate' | 'status'>
  guard: Pick<Profile, 'id' | 'full_name'>
}

export interface NotificationWithVisitor extends Notification {
  visitor: Pick<Visitor, 'id' | 'name' | 'purpose' | 'vehicle_plate' | 'homeowner_id'> | null
}
