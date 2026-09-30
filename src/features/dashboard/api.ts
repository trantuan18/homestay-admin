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
  list: async (params = {}) =>
    parseList<Booking>(
      (await http.get<Paginated<Booking>>("/api/admin/bookings", { params }))
        .data,
    ),
};
export const paymentsApi = {
  list: async (params = {}) =>
    parseList<Payment>(
      (
        await http.get<Paginated<Payment>>("/api/admin/bookings/payments", {
          params,
        })
      ).data,
    ),
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
};
export const analyticsApi = {
  get: async (params: Record<string, unknown> = {}) =>
    (await http.get<AdminAnalytics>("/api/admin/analytics", { params })).data,
};
