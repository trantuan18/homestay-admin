import { http } from "../../services/http";
import type { Paginated, Property } from "../../types/api";

const ensureSuccessful = <T>(response: T): T => {
  if (
    response &&
    typeof response === "object" &&
    "success" in response &&
    response.success === false
  ) {
    const message = "message" in response ? response.message : undefined;
    throw new Error(typeof message === "string" ? message : "Request failed");
  }
  return response;
};

export type PropertyPayload = {
  name: string;
  address?: string;
  description?: string;
  city?: string;
  country?: string;
  pricing_plan_id?: string | null;
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
    ensureSuccessful((await http.post("/api/admin/properties", payload)).data),
  update: async (id: string, payload: PropertyPayload) =>
    ensureSuccessful(
      (await http.patch(`/api/admin/properties/${id}`, payload)).data,
    ),
  remove: async (id: string) =>
    ensureSuccessful((await http.delete(`/api/admin/properties/${id}`)).data),
};
