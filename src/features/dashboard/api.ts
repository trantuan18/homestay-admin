import { http } from "../../services/http";
import type {
  AdminDashboard,
  Paginated,
  Property,
  Room,
  Booking,
  Payment,
} from "../../types/api";
const parsePaginated = <T>(data: unknown): Paginated<T> => {
  if (
    !data ||
    typeof data !== "object" ||
    !Array.isArray((data as { data?: unknown }).data)
  ) {
    throw new Error("Invalid paginated response from server");
  }
  return data as Paginated<T>;
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
    parsePaginated<Property>(
      (await http.get<Paginated<Property>>("/api/admin/properties", { params }))
        .data,
    ),
};
export const roomsApi = {
  list: async (params = {}) =>
    parsePaginated<Room>(
      (await http.get<Paginated<Room>>("/api/admin/rooms", { params })).data,
    ),
};
export const bookingsApi = {
  list: async (params = {}) =>
    parsePaginated<Booking>(
      (await http.get<Paginated<Booking>>("/api/admin/bookings", { params }))
        .data,
    ),
};
export const paymentsApi = {
  list: async (params = {}) =>
    parsePaginated<Payment>(
      (
        await http.get<Paginated<Payment>>("/api/admin/bookings/payments", {
          params,
        })
      ).data,
    ),
};
export const usersApi = {
  list: async (params = {}) =>
    parsePaginated<{
      id: string;
      email: string;
      role: string;
      full_name: string;
    }>(
      (
        await http.get<
          Paginated<{
            id: string;
            email: string;
            role: string;
            full_name: string;
          }>
        >("/api/admin/users", { params })
      ).data,
    ),
};
