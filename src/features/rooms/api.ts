import { http } from "../../services/http";
import type { Room } from "../../types/api";

export type RoomPayload = {
  name: string;
  slug: string;
  description?: string;
  capacity: number;
  base_hourly_price: number;
  base_daily_price: number;
  status: Room["status"];
};

export type RoomDetail = Room & {
  room_images: Array<{ id: string; image_url: string; sort_order?: number }>;
  pricing_rules: Array<{
    id: string;
    rule_name: string;
    day_of_week: number | null;
    start_time: string | null;
    end_time: string | null;
    min_duration_minutes: number | null;
    max_duration_minutes: number | null;
    price: number;
    priority: number;
    active: boolean;
  }>;
  blocked_periods: Array<{
    id: string;
    start_at: string;
    end_at: string;
    reason: string | null;
    created_at: string;
  }>;
};

export const roomsCrudApi = {
  detail: async (id: string) =>
    (
      await http.get<{ success: boolean; data: RoomDetail }>(
        `/api/admin/rooms/${id}`,
      )
    ).data.data,
  create: async (propertyId: string, payload: RoomPayload) =>
    (
      await http.post<{ success: boolean; data: Room }>(
        `/api/admin/properties/${propertyId}/rooms`,
        payload,
      )
    ).data,
  update: async (id: string, payload: Partial<RoomPayload>) =>
    (
      await http.patch<{ success: boolean; data: Room }>(
        `/api/admin/rooms/${id}`,
        payload,
      )
    ).data,
};
