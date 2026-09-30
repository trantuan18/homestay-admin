import { http } from "../../services/http";
import type {
  AdminDashboard,
  Paginated,
  Property,
  Room,
  Booking,
  Payment,
  AdminAnalytics,
} from "../../types/api";
const parseList = <T>(data: unknown): Paginated<T> => {
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray((data as { data?: unknown }).data)
  ) {
    throw new Error("Invalid paginated response from server");
  }
  const response = data as {
    data: T[];
    pagination?: { total?: number; limit?: number; offset?: number };
  };
  return {
    data: response.data,
    total: response.pagination?.total ?? response.data.length,
    limit: response.pagination?.limit ?? response.data.length,
    offset: response.pagination?.offset ?? 0,
    page:
      Math.floor(
        (response.pagination?.offset ?? 0) / (response.pagination?.limit || 1),
      ) + 1,
  };
};
const parseDashboard = (data: unknown): AdminDashboard => {
  const record = data as Record<string, unknown>;
  if (
    !data ||
    typeof data !== "object" ||
    !record.revenue ||
    !record.bookings ||
    !record.rooms ||
    typeof record.revenue !== "object" ||
    typeof record.bookings !== "object" ||
    typeof record.rooms !== "object"
  ) {
    throw new Error("Invalid dashboard response from server");
  }
  return data as AdminDashboard;
};
export const dashboardApi = {
  get: async () =>
    parseDashboard(
      (await http.get<AdminDashboard>("/api/admin/dashboard")).data,
    ),
};
export const propertiesApi = {
  list: async (params = {}) =>
    parseList<Property>(
      (await http.get<Paginated<Property>>("/api/admin/properties", { params }))
        .data,
    ),
};
export const roomsApi = {
  list: async (params = {}) =>
    parseList<Room>(
      (await http.get<Paginated<Room>>("/api/admin/rooms", { params })).data,
    ),
};
export const bookingsApi = {
  list: async (
    params: {
      offset?: number;
      limit?: number;
      property_id?: string;
      room_id?: string;
      status?: string;
      payment_status?: string;
      start_date?: string;
      end_date?: string;
      overlap_start?: string;
      overlap_end?: string;
    } = {},
  ) =>
    parseList<Booking>(
      (await http.get<Paginated<Booking>>("/api/admin/bookings", { params }))
        .data,
    ),
  create: async (payload: {
    user_id: string;
    room_id: string;
    start_at: string;
    end_at: string;
    guest_count: number;
    guest_name?: string;
    guest_phone?: string;
    guest_email?: string;
    notes?: string;
  }) => (await http.post("/api/admin/bookings", payload)).data,
  updateStatus: async (
    id: string,
    status:
      | "CONFIRMED"
      | "CANCELLED"
      | "EXPIRED"
      | "CHECKED_IN"
      | "NO_SHOW"
      | "CHECKED_OUT",
  ) => (await http.patch(`/api/admin/bookings/${id}/status`, { status })).data,
};
export const paymentsApi = {
  list: async (bookingId: string) =>
    (
      await http.get<{ success: boolean; data: Payment[] }>(
        `/api/admin/bookings/${bookingId}/payments`,
      )
    ).data,
  record: async (
    bookingId: string,
    payload: {
      payment_status: "UNPAID" | "PARTIAL" | "PAID" | "FAILED" | "REFUNDED";
      amount?: number;
      provider?: string;
      transaction_id?: string;
      notes?: string;
    },
  ) =>
    (await http.patch(`/api/admin/bookings/${bookingId}/payment`, payload))
      .data,
};
export const usersApi = {
  list: async (params = {}) =>
    parseList<{
      id: string;
      email?: string | null;
      role: string;
      full_name: string;
    }>(
      (
        await http.get<
          Paginated<{
            id: string;
            email?: string | null;
            role: string;
            full_name: string;
          }>
        >("/api/admin/users", { params })
      ).data,
    ),
  updateRole: async (
    id: string,
    role: "CUSTOMER" | "HOST" | "STAFF" | "ADMIN" | "SUPER_ADMIN",
  ) => (await http.patch(`/api/admin/users/${id}/role`, { role })).data,
};
export const analyticsApi = {
  get: async (params: Record<string, unknown> = {}) =>
    (await http.get<AdminAnalytics>("/api/admin/analytics", { params })).data,
};
