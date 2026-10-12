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
  latitude?: number | null;
  longitude?: number | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  profiles?: Profile | null;
  pricing_plan_id?: string | null;
  pricing_plan?: PricingPlan | null;
  created_at?: string;
  updated_at?: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description?: string;
  is_default?: boolean;
  hourly_first_hours: number;
  hourly_first_price: number;
  hourly_next_price: number;
  combo_4h_price: number;
  combo_8h_price: number;
  overnight_check_in: string;
  overnight_check_out: string;
  overnight_weekday_price: number;
  overnight_weekend_price: number;
  daily_check_in: string;
  daily_check_out: string;
  daily_weekday_price: number;
  daily_weekend_price: number;
  standard_guest_count: number;
  extra_guest_fee: number;
  holiday_surcharge: number;
  created_at: string;
  updated_at: string;
}
export interface RoomImage {
  id: string;
  room_id: string;
  image_url: string;
  public_id?: string | null;
  sort_order?: number;
  is_primary?: boolean;
  created_at?: string;
}

export interface Amenity {
  id: string;
  name: string;
  icon?: string | null;
  category?: string | null;
}

export interface RoomAmenity {
  amenity_id: string;
  amenities: Amenity;
}

export interface PricingRule {
  id: string;
  room_id?: string;
  rule_name: string;
  day_of_week: number | null;
  start_time: string | null;
  end_time: string | null;
  min_duration_minutes: number | null;
  max_duration_minutes: number | null;
  price: number;
  priority: number;
  active: boolean;
}

export interface BlockedPeriod {
  id: string;
  room_id?: string;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_at?: string;
}

export interface Review {
  id: string;
  booking_id?: string;
  room_id?: string;
  user_id?: string;
  rating: number;
  comment?: string | null;
  created_at: string;
  profiles?: Profile | null;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read_at?: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  old_value?: Record<string, unknown> | null;
  new_value?: Record<string, unknown> | null;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string | null;
  } | null;
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
  created_at?: string;
  updated_at?: string;
  properties?: {
    id: string;
    name: string;
    city?: string | null;
    status: string;
    owner_id?: string;
  } | null;
  room_images?: RoomImage[];
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
  guest_email?: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  currency: string;
  status: BookingStatus;
  payment_status: PaymentStatus;
  notes?: string | null;
  created_at?: string;
  profiles?: Profile | null;
  properties?: {
    id: string;
    name: string;
    city?: string | null;
  } | null;
  rooms?: {
    id: string;
    name: string;
    base_hourly_price?: number;
  } | null;
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
  created_at?: string;
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
  offset?: number;
}

export interface AdminAnalytics {
  period: { from: string; to: string };
  summary: Record<string, number>;
  daily: Array<{
    date: string;
    bookings: number;
    confirmed: number;
    cancelled: number;
    checked_in: number;
    checked_out: number;
    revenue: number;
  }>;
  property_performance: Array<{
    property_id: string;
    name: string;
    city?: string | null;
    status: string;
    bookings: number;
    revenue: number;
  }>;
  room_performance: Array<Record<string, string | number>>;
}
