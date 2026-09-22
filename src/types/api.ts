export type Role = "CUSTOMER" | "HOST" | "STAFF" | "ADMIN" | "SUPER_ADMIN";
export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "EXPIRED"
  | "NO_SHOW";
export type PaymentStatus =
  | "UNPAID"
  | "PARTIAL"
  | "PAID"
  | "REFUNDED"
  | "FAILED";
export interface Profile {
  id: string;
  full_name: string;
  phone?: string | null;
  avatar_url?: string | null;
}
export interface AuthUser {
  id: string;
  email?: string;
}
export interface AuthResponse {
  success: boolean;
  user: AuthUser;
  profile: Profile;
  role: Role;
}
export interface Property {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  timezone: string;
  booking_interval_minutes: number;
  minimum_booking_minutes: number;
  maximum_booking_minutes: number;
  cancellation_deadline_hours: number;
  cancellation_fee_percent: number;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  created_at?: string;
  updated_at?: string;
}
export interface Room {
  id: string;
  property_id: string;
  name: string;
  slug: string;
  description?: string | null;
  capacity: number;
  base_hourly_price: number;
  base_daily_price: number;
  status: "AVAILABLE" | "MAINTENANCE" | "INACTIVE";
}
export interface Booking {
  id: string;
  booking_code: string;
  user_id: string;
  property_id: string;
  room_id: string;
  start_at: string;
  end_at: string;
  guest_count: number;
  guest_name?: string | null;
  guest_phone?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  notes?: string | null;
  created_at?: string;
}
export interface Payment {
  id: string;
  booking_id: string;
  user_id: string;
  provider: string;
  transaction_id?: string | null;
  amount: number;
  currency: string;
  status: "PENDING" | "PROCESSING" | "SUCCESS" | "FAILED" | "REFUNDED";
  paid_at?: string | null;
}
export interface AdminDashboard {
  revenue: {
    booking_revenue: number;
    paid_revenue: number;
    partial_revenue: number;
    currency: string;
  };
  bookings: {
    total: number;
    pending: number;
    confirmed: number;
    checked_in: number;
    checked_out: number;
    cancelled: number;
    expired: number;
    no_show: number;
  };
  rooms: {
    total: number;
    available: number;
    maintenance: number;
    inactive: number;
  };
  properties: {
    total: number;
    active: number;
    inactive: number;
    suspended: number;
  };
  payments: {
    total: number;
    pending: number;
    processing: number;
    success: number;
    failed: number;
    refunded: number;
    success_amount: number;
    refunded_amount: number;
  };
  period: { from: string; to: string };
  filters: { property_id: string | null };
}
export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}
