import { http } from "../../services/http";
import type {
  Room,
  RoomImage,
  RoomAmenity,
  PricingRule,
  BlockedPeriod,
} from "../../types/api";

const unwrapResponse = <T>(response: {
  success?: boolean;
  data?: T;
  message?: string;
}) => {
  if (response.success === false)
    throw new Error(response.message || "Request failed");
  return response.data ?? response;
};

export type RoomPayload = {
  name: string;
  slug: string;
  description?: string;
  capacity?: number;
  base_hourly_price?: number;
  base_daily_price?: number;
  status: Room["status"];
};

export type RoomDetail = Room & {
  room_images: RoomImage[];
  room_amenities: RoomAmenity[];
  pricing_rules: PricingRule[];
  blocked_periods: BlockedPeriod[];
};

export const roomsCrudApi = {
  detail: async (id: string) =>
    unwrapResponse(
      (
        await http.get<{ success: boolean; data: RoomDetail }>(
          `/api/admin/rooms/${id}`,
        )
      ).data,
    ) as RoomDetail,
  create: async (propertyId: string, payload: RoomPayload) =>
    unwrapResponse(
      (
        await http.post<{ success: boolean; data: Room }>(
          `/api/admin/properties/${propertyId}/rooms`,
          payload,
        )
      ).data,
    ) as Room,
  update: async (id: string, payload: Partial<RoomPayload>) =>
    unwrapResponse(
      (
        await http.patch<{ success: boolean; data: Room }>(
          `/api/admin/rooms/${id}`,
          payload,
        )
      ).data,
    ) as Room,
  remove: async (id: string) => {
    try {
      return unwrapResponse(
        (
          await http.delete<{
            success?: boolean;
            data?: Room;
            message?: string;
          }>(`/api/admin/rooms/${id}`)
        ).data,
      ) as Room;
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404 || status === 405) {
        return unwrapResponse(
          (
            await http.patch<{
              success?: boolean;
              data?: Room;
              message?: string;
            }>(`/api/admin/rooms/${id}`, { status: "INACTIVE" })
          ).data,
        ) as Room;
      }
      throw error;
    }
  },
};
