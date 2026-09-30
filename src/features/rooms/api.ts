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

export const roomsCrudApi = {
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
