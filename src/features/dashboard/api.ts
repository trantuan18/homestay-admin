import axios from "axios";
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
  if (!data || typeof data !== "object") {
    throw new Error("Invalid dashboard response from server");
  }
  if (record.success === false) {
    throw new Error(typeof record.message === "string" ? record.message : "Dashboard API error");
  }
  if (!record.revenue || !record.bookings || !record.rooms) {
    throw new Error("Dashboard response missing required fields");
  }
  return data as AdminDashboard;
};
export const dashboardApi = {
  get: async (
    params: { from?: string; to?: string; property_id?: string } = {},
  ) =>
    parseDashboard(
      (await http.get<AdminDashboard>("/api/admin/dashboard", { params })).data,
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
      from?: string;
      to?: string;
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
    user_id?: string;
    room_id: string;
    start_at: string;
    end_at: string;
    guest_count: number;
    guest_name?: string;
    guest_phone?: string;
    guest_email?: string;
    notes?: string;
  }) => (await http.post("/api/admin/bookings", payload)).data,
  calculatePrice: async (params: {
    room_id: string;
    start_at: string;
    end_at: string;
    guest_count?: number;
  }) =>
    (
      await http.get<{
        success: boolean;
        data: {
          room_id: string;
          duration_minutes: number;
          hourly_price: number;
          subtotal: number;
          room_price?: number;
          standard_guest_count?: number;
          extra_guest_count?: number;
          extra_guest_fee?: number;
          extra_guest_unit_price?: number;
          holiday_surcharge?: number;
          discount: number;
          tax: number;
          total: number;
          currency: string;
          pricing_rule_id?: string | null;
          pricing_rule_name?: string | null;
        };
      }>("/api/admin/bookings/price", { params })
    ).data,
  updateStatus: async (
    id: string,
    status:
      | "PENDING"
      | "CONFIRMED"
      | "CANCELLED"
      | "EXPIRED"
      | "CHECKED_IN"
      | "NO_SHOW"
      | "CHECKED_OUT",
    reason = "Admin status update",
  ) => {
    const attempts = [
      {
        method: "patch",
        url: `/api/admin/bookings/${id}/status`,
        data: { status, reason },
      },
      {
        method: "patch",
        url: `/api/admin/bookings/${id}`,
        data: { status, reason },
      },
      {
        method: "put",
        url: `/api/admin/bookings/${id}/status`,
        data: { status, reason },
      },
      {
        method: "put",
        url: `/api/admin/bookings/${id}`,
        data: { status, reason },
      },
    ] as const;

    let lastError: unknown;
    for (const attempt of attempts) {
      try {
        const response = await http.request({
          method: attempt.method,
          url: attempt.url,
          data: attempt.data,
        });
        return response.data;
      } catch (error) {
        lastError = error;
        if (!axios.isAxiosError(error) || error.response?.status !== 404) {
          throw error;
        }
      }
    }

    throw lastError;
  },
  updateCleaningStatus: async (
    id: string,
    cleaning_status: "UNCLEANED" | "CLEANED",
  ) => {
    return (
      await http.patch<{ success: boolean; data: { id: string; cleaning_status: string } }>(
        `/api/admin/bookings/${id}/cleaning-status`,
        { cleaning_status },
      )
    ).data;
  },
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
      phone?: string | null;
      role: string;
      full_name: string;
      created_at?: string;
      avatar_url?: string | null;
    }>(
      (
        await http.get<
          Paginated<{
            id: string;
            email?: string | null;
            phone?: string | null;
            role: string;
            full_name: string;
            created_at?: string;
            avatar_url?: string | null;
          }>
        >("/api/admin/users", { params })
      ).data,
    ),
  create: async (payload: {
    email: string;
    password: string;
    full_name?: string;
    phone?: string;
    role?: "CUSTOMER" | "HOST" | "STAFF" | "ADMIN" | "SUPER_ADMIN";
  }) =>
    (
      await http.post<{
        success: boolean;
        message?: string;
        data: {
          id: string;
          email: string;
          full_name: string;
          phone?: string | null;
          role: string;
          created_at: string;
        };
      }>("/api/admin/users", payload)
    ).data,
  updateRole: async (
    id: string,
    role: "CUSTOMER" | "HOST" | "STAFF" | "ADMIN" | "SUPER_ADMIN",
  ) => (await http.patch(`/api/admin/users/${id}/role`, { role })).data,
};
export const analyticsApi = {
  get: async (params: Record<string, unknown> = {}) =>
    (await http.get<AdminAnalytics>("/api/admin/analytics", { params })).data,
};

export const notificationsApi = {
  list: async (params: { unread_only?: string; limit?: number } = {}) => {
    const res = await http.get<{
      success: boolean;
      data: import("../../types/api").Notification[];
      unread_count?: number;
    }>("/api/notifications", { params });
    return res.data;
  },
  markAsRead: async (id: string) => {
    return (await http.patch(`/api/notifications/${id}/read`)).data;
  },
  markAllAsRead: async () => {
    return (await http.patch("/api/notifications/read-all")).data;
  },
};

export const auditLogsApi = {
  list: async (params: {
    action?: string;
    entity_type?: string;
    user_id?: string;
    limit?: number;
    offset?: number;
  } = {}) => {
    return parseList<import("../../types/api").AuditLog>(
      (await http.get("/api/admin/audit-logs", { params })).data,
    );
  },
};

export const amenitiesApi = {
  listAll: async () => {
    const res = await http.get<{
      success: boolean;
      data: import("../../types/api").Amenity[];
    }>("/api/amenities");
    return res.data?.data || [];
  },
  listForRoom: async (roomId: string) => {
    const res = await http.get<{
      success: boolean;
      data: import("../../types/api").RoomAmenity[];
    }>(`/api/rooms/${roomId}/amenities`);
    return res.data?.data || [];
  },
  addToRoom: async (roomId: string, amenityId: string) => {
    return (
      await http.post(`/api/rooms/${roomId}/amenities`, { amenity_id: amenityId })
    ).data;
  },
  removeFromRoom: async (roomId: string, amenityId: string) => {
    return (await http.delete(`/api/rooms/${roomId}/amenities/${amenityId}`)).data;
  },
};

export const reviewsApi = {
  listForRoom: async (roomId: string) => {
    const res = await http.get<{
      success: boolean;
      data: import("../../types/api").Review[];
    }>(`/api/rooms/${roomId}/reviews`);
    return res.data?.data || [];
  },
};

export const pricingRulesApi = {
  list: async (roomId: string) => {
    const res = await http.get<{
      success: boolean;
      data: import("../../types/api").PricingRule[];
    }>(`/api/rooms/${roomId}/pricing-rules`);
    return res.data?.data || [];
  },
  create: async (
    roomId: string,
    payload: Omit<import("../../types/api").PricingRule, "id">,
  ) => {
    return (await http.post(`/api/rooms/${roomId}/pricing-rules`, payload)).data;
  },
  update: async (
    roomId: string,
    ruleId: string,
    payload: Partial<import("../../types/api").PricingRule>,
  ) => {
    return (
      await http.patch(`/api/rooms/${roomId}/pricing-rules/${ruleId}`, payload)
    ).data;
  },
  delete: async (roomId: string, ruleId: string) => {
    return (await http.delete(`/api/rooms/${roomId}/pricing-rules/${ruleId}`))
      .data;
  },
};

export const blockedPeriodsApi = {
  list: async (roomId: string) => {
    const res = await http.get<{
      success: boolean;
      data: import("../../types/api").BlockedPeriod[];
    }>(`/api/rooms/${roomId}/blocked-periods`);
    return res.data?.data || [];
  },
  create: async (
    roomId: string,
    payload: { start_at: string; end_at: string; reason?: string },
  ) => {
    return (await http.post(`/api/rooms/${roomId}/blocked-periods`, payload)).data;
  },
  delete: async (roomId: string, blockedId: string) => {
    return (await http.delete(`/api/rooms/${roomId}/blocked-periods/${blockedId}`))
      .data;
  },
};

export const roomImagesApi = {
  upload: async (roomId: string, file: File, isPrimary = false) => {
    const formData = new FormData();
    formData.append("file", file);
    if (isPrimary) formData.append("is_primary", "true");
    const res = await http.post(
      `/api/admin/rooms/${roomId}/images/upload`,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      },
    );
    return res.data;
  },
  setPrimary: async (roomId: string, imageId: string) => {
    return (
      await http.patch(`/api/admin/rooms/${roomId}/images/${imageId}`, {
        is_primary: true,
      })
    ).data;
  },
  delete: async (roomId: string, imageId: string) => {
    return (await http.delete(`/api/admin/rooms/${roomId}/images/${imageId}`))
      .data;
  },
};

export const pricingPlansApi = {
  list: async () => {
    const res = await http.get<{
      success: boolean;
      data: import("../../types/api").PricingPlan[];
    }>("/api/admin/pricing-plans");
    return res.data?.data || [];
  },
  get: async (id: string) => {
    const res = await http.get<{
      success: boolean;
      data: import("../../types/api").PricingPlan;
    }>(`/api/admin/pricing-plans/${id}`);
    return res.data?.data;
  },
  create: async (payload: Partial<import("../../types/api").PricingPlan>) => {
    const res = await http.post<{
      success: boolean;
      data: import("../../types/api").PricingPlan;
    }>("/api/admin/pricing-plans", payload);
    return res.data?.data;
  },
  update: async (
    id: string,
    payload: Partial<import("../../types/api").PricingPlan>,
  ) => {
    const res = await http.put<{
      success: boolean;
      data: import("../../types/api").PricingPlan;
    }>(`/api/admin/pricing-plans/${id}`, payload);
    return res.data?.data;
  },
  delete: async (id: string) => {
    return (await http.delete(`/api/admin/pricing-plans/${id}`, { data: {} })).data;
  },
};

