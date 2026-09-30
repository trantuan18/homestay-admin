import { http } from "../../services/http";
import type { Paginated, Property } from "../../types/api";

export type PropertyPayload = {
  owner_id: string;
  name: string;
  slug: string;
  description?: string;
  address?: string;
  city: string;
  country: string;
  timezone: string;
  booking_interval_minutes: number;
  minimum_booking_minutes: number;
  maximum_booking_minutes: number;
  cancellation_deadline_hours: number;
  cancellation_fee_percent: number;
  status: Property["status"];
};
const normalizeList = (response: unknown): Paginated<Property> => {
  const value = response as {
    data?: Property[];
    pagination?: { total?: number; limit?: number; offset?: number };
  };
  if (!Array.isArray(value.data)) {
    throw new Error("Invalid properties response from server");
  }
  const limit = (value.pagination?.limit ?? value.data.length) || 1;
  const offset = value.pagination?.offset ?? 0;
  return {
    data: value.data,
    total: value.pagination?.total ?? value.data.length,
    limit,
    offset,
    page: Math.floor(offset / limit) + 1,
  };
};

export const propertiesCrudApi = {
  list: async (params: Record<string, unknown> = {}) =>
    normalizeList(
      (await http.get<unknown>("/api/admin/properties", { params })).data,
    ),
  create: async (payload: PropertyPayload) =>
    (await http.post("/api/admin/properties", payload)).data,
  update: async (id: string, payload: Partial<PropertyPayload>) =>
    (await http.patch(`/api/admin/properties/${id}`, payload)).data,
  remove: async (id: string) =>
    (await http.delete(`/api/admin/properties/${id}`)).data,
};
