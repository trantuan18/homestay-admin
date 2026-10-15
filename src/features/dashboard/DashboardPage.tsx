import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { dashboardApi, bookingsApi, propertiesApi, roomsApi, paymentsApi } from "./api";
import { apiError } from "../../services/http";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import { RoomBookingGantt } from "../../components/ui/RoomBookingGantt";
import { BookingReceiptModal } from "../bookings/BookingReceiptModal";
import type { Booking } from "../../types/api";

const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);

const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function DashboardPage() {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

  const today = localDate(new Date());
  const defaultToDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return localDate(d);
  };

  const [dashboardFrom, setDashboardFrom] = useState(today);
  const [dashboardTo, setDashboardTo] = useState(defaultToDate);
  const [propertyId, setPropertyId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null);
  const qc = useQueryClient();

  // Quick preset helper
  const handlePreset = (preset: "today" | "next7days" | "thisMonth") => {
    const now = new Date();
    if (preset === "today") {
      const t = localDate(now);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDashboardFrom(t);
      setDashboardTo(localDate(tomorrow));
    } else if (preset === "next7days") {
      const t = localDate(now);
      const plus7 = new Date(now);
      plus7.setDate(plus7.getDate() + 7);
      setDashboardFrom(t);
      setDashboardTo(localDate(plus7));
    } else if (preset === "thisMonth") {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setDashboardFrom(localDate(firstDay));
      setDashboardTo(localDate(lastDay));
    }
  };

  const now = new Date();
  const isPresetToday =
    dashboardFrom === localDate(now) &&
    dashboardTo ===
      localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const isPresetNext7Days =
    dashboardFrom === localDate(now) &&
    dashboardTo ===
      localDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
  const isPresetThisMonth =
    dashboardFrom === localDate(new Date(now.getFullYear(), now.getMonth(), 1)) &&
    dashboardTo ===
      localDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));

  // Dashboard Overview Query
  const q = useQuery({
    queryKey: ["admin-dashboard", dashboardFrom, dashboardTo, propertyId],
    queryFn: () =>
      dashboardApi.get({
        from: dashboardFrom,
        to: dashboardTo,
        property_id: propertyId || undefined,
      }),
  });

  const properties = useQuery({
    queryKey: ["admin-dashboard-properties"],
    queryFn: () =>
      propertiesApi.list({ offset: 0, limit: 100, status: "ACTIVE" }),
    staleTime: 60_000,
  });

  const rooms = useQuery({
    queryKey: ["admin-dashboard-rooms", propertyId],
    queryFn: () =>
      roomsApi.list({
        offset: 0,
        limit: 100,
        status: "AVAILABLE",
        ...(propertyId ? { property_id: propertyId } : {}),
      }),
    staleTime: 60_000,
  });

  // Master date range bounds for chart and list
  const getSafeIso = (dateStr: string, timeStr: string, fallbackDays: number) => {
    if (!dateStr) {
      const d = new Date();
      d.setDate(d.getDate() + fallbackDays);
      return d.toISOString();
    }
    const d = new Date(`${dateStr}T${timeStr}`);
    if (Number.isNaN(d.getTime())) {
      const fb = new Date();
      fb.setDate(fb.getDate() + fallbackDays);
      return fb.toISOString();
    }
    return d.toISOString();
  };

  const bookings = useQuery({
    queryKey: ["admin-booking-chart", dashboardFrom, dashboardTo, propertyId],
    queryFn: () =>
      bookingsApi.list({
        limit: 500,
        overlap_start: getSafeIso(dashboardFrom, "00:00:00", 0),
        overlap_end: getSafeIso(dashboardTo, "23:59:59", 7),
        ...(propertyId ? { property_id: propertyId } : {}),
      }),
    staleTime: 30_000,
  });

  const getStatusReason = (nextStatus: string) => {
    if (nextStatus === "CANCELLED") return "Booking cancelled by admin";
    if (nextStatus === "NO_SHOW") return "Guest no-show";
    if (nextStatus === "EXPIRED") return "Booking expired";
    if (nextStatus === "CHECKED_IN") return "Checked in";
    if (nextStatus === "CHECKED_OUT") return "Checked out";
    return "Admin status update";
  };

  const updateStatus = useMutation({
    mutationFn: ({
      id,
      next,
      reason,
    }: {
      id: string;
      next: Parameters<typeof bookingsApi.updateStatus>[1];
      reason?: string;
    }) => bookingsApi.updateStatus(id, next, reason ?? getStatusReason(next)),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-booking-chart"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      setDetailBooking((current) =>
        current && current.id === variables.id
          ? { ...current, status: variables.next }
          : current,
      );
      toast.success(t("bookings.statusSaved", "Đã cập nhật trạng thái đơn"));
    },
    onError: (error) =>
      toast.error(`${t("bookings.statusError", "Lỗi cập nhật trạng thái:")} ${apiError(error)}`),
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async ({
      id,
      next,
      amount,
      currentBookingStatus,
    }: {
      id: string;
      next: "UNPAID" | "PARTIAL" | "PAID" | "FAILED" | "REFUNDED";
      amount?: number;
      currentBookingStatus?: string;
    }) => {
      const res = await paymentsApi.record(id, {
        payment_status: next,
        amount: next === "PAID" || next === "PARTIAL" ? amount : undefined,
      });

      if (next === "PAID" && currentBookingStatus === "PENDING") {
        try {
          await bookingsApi.updateStatus(id, "CONFIRMED", "Tự động xác nhận sau khi thanh toán");
        } catch {
          // Handled or already auto-confirmed
        }
      }

      return res;
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-booking-chart"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      setDetailBooking((current) =>
        current && current.id === variables.id
          ? {
              ...current,
              payment_status: variables.next,
              ...(variables.next === "PAID" && current.status === "PENDING"
                ? { status: "CONFIRMED" }
                : {}),
            }
          : current,
      );
      toast.success(
        variables.next === "PAID" && variables.currentBookingStatus === "PENDING"
          ? "Đã thanh toán & tự động xác nhận đơn đặt phòng"
          : "Đã cập nhật trạng thái thanh toán",
      );
    },
    onError: (error) =>
      toast.error(`Lỗi cập nhật thanh toán: ${apiError(error)}`),
  });

  const updateCleaningStatus = useMutation({
    mutationFn: ({
      id,
      cleaning_status,
    }: {
      id: string;
      cleaning_status: "UNCLEANED" | "CLEANED";
    }) => bookingsApi.updateCleaningStatus(id, cleaning_status),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ["admin-booking-chart"] });
      qc.invalidateQueries({ queryKey: ["admin-dashboard"] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      setDetailBooking((current) =>
        current && current.id === variables.id
          ? { ...current, cleaning_status: variables.cleaning_status }
          : current,
      );
      toast.success(
        variables.cleaning_status === "CLEANED"
          ? "Đã đánh dấu ĐÃ DỌN PHÒNG"
          : "Đã đánh dấu CHƯA DỌN PHÒNG",
      );
    },
    onError: (error) =>
      toast.error(`Lỗi cập nhật dọn phòng: ${apiError(error)}`),
  });

  const visibleRooms = useMemo(
    () =>
      (rooms.data?.data || []).filter(
        (room) =>
          room.status === "AVAILABLE" &&
          (room.properties?.status ? room.properties.status === "ACTIVE" : true) &&
          (selectedRoomIds.length === 0 || selectedRoomIds.includes(room.id)),
      ),
    [rooms.data?.data, selectedRoomIds],
  );

  const visibleRoomIds = useMemo(
    () => new Set(visibleRooms.map((room) => room.id)),
    [visibleRooms],
  );

  // Filter bookings in range by search query
  const filteredBookings = useMemo(
    () =>
      (bookings.data?.data || [])
        .filter((b) => {
          const matchRoom =
            selectedRoomIds.length === 0 || visibleRoomIds.has(b.room_id);
          if (!matchRoom) return false;
          const term = search.trim().toLowerCase();
          if (!term) return true;
          return (
            b.booking_code?.toLowerCase().includes(term) ||
            b.guest_name?.toLowerCase().includes(term) ||
            b.guest_phone?.toLowerCase().includes(term) ||
            b.guest_email?.toLowerCase().includes(term) ||
            b.rooms?.name?.toLowerCase().includes(term)
          );
        })
        .sort((a, b) => (b.start_at || "").localeCompare(a.start_at || "")),
    [bookings.data?.data, selectedRoomIds, visibleRoomIds, search],
  );

  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const d = q.data!;
  const occupancy = d.rooms.total
    ? Math.round(((d.rooms.total - d.rooms.available) / d.rooms.total) * 100)
    : 0;

  const dashboardPeriod = `${dashboardFrom} – ${dashboardTo}`;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1>{t(`dashboard.greeting.${greeting}`, { name: "Admin" })}</h1>
          <p className="muted">{t("dashboard.description")}</p>
        </div>
        <button
          className="primary"
          onClick={() => window.location.assign("/admin/bookings")}
        >
          + {t("dashboard.createBooking")}
        </button>
      </div>

      {/* MASTER DATE & SEARCH FILTER BAR */}
      <div className="dashboard-filter-bar">
        <div className="dashboard-filter-group" style={{ maxWidth: 170 }}>
          <label>{t("bookings.fromDate", "Từ ngày")}</label>
          <input
            type="date"
            value={dashboardFrom}
            max={dashboardTo || undefined}
            onChange={(event) => setDashboardFrom(event.target.value)}
          />
        </div>
        <div className="dashboard-filter-group" style={{ maxWidth: 170 }}>
          <label>{t("bookings.toDate", "Đến ngày")}</label>
          <input
            type="date"
            value={dashboardTo}
            min={dashboardFrom || undefined}
            onChange={(event) => setDashboardTo(event.target.value)}
          />
        </div>
        <div className="dashboard-filter-group" style={{ maxWidth: 220 }}>
          <label>{t("bookingChart.propertyFilter", "Cơ sở lưu trú")}</label>
          <select
            value={propertyId}
            onChange={(event) => {
              setPropertyId(event.target.value);
              setSelectedRoomIds([]);
            }}
          >
            <option value="">{t("common.allProperties", "Tất cả cơ sở hoạt động")}</option>
            {(properties.data?.data || [])
              .filter((property) => property.status === "ACTIVE")
              .map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
          </select>
        </div>
        <div className="dashboard-filter-group" style={{ minWidth: 200, flex: 2 }}>
          <label>Tìm kiếm đặt phòng</label>
          <input
            type="search"
            placeholder="Tìm theo mã đơn, tên khách, SĐT..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="dashboard-quick-presets" style={{ paddingBottom: 2 }}>
          <button
            type="button"
            className={`dashboard-preset-btn ${isPresetToday ? "active" : ""}`}
            onClick={() => handlePreset("today")}
          >
            Hôm nay
          </button>
          <button
            type="button"
            className={`dashboard-preset-btn ${isPresetNext7Days ? "active" : ""}`}
            onClick={() => handlePreset("next7days")}
          >
            7 ngày tới
          </button>
          <button
            type="button"
            className={`dashboard-preset-btn ${isPresetThisMonth ? "active" : ""}`}
            onClick={() => handlePreset("thisMonth")}
          >
            Tháng này
          </button>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="stats" role="region" aria-label={t("dashboard.stats")}>
        <Stat
          label={t("dashboard.revenue")}
          value={money(d.revenue.paid_revenue)}
          delta="—"
          sub={dashboardPeriod}
        />
        <Stat
          label={t("dashboard.bookings")}
          value={String(d.bookings.total)}
          delta="—"
          sub={dashboardPeriod}
        />
        <Stat
          label={t("dashboard.occupancy")}
          value={`${occupancy}%`}
          delta="—"
          sub={t("dashboard.vsLastMonth")}
        />
        <Stat
          label={t("dashboard.activeRooms")}
          value={`${d.rooms.available} / ${d.rooms.total}`}
          delta=""
          sub={t("dashboard.online")}
        />
      </div>

      {/* GANTT TIMELINE CHART */}
      <div className="panel chart-panel">
        <div className="panel-head hourly-chart-heading">
          <div>
            <h3>{t("bookingChart.hourlyTitle", "Lịch đặt phòng theo giờ & ngày")}</h3>
            <span>
              {dashboardPeriod} · {visibleRooms.length} phòng đang hoạt động
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <details className="gantt-room-picker" style={{ minWidth: 180 }}>
              <summary>
                {t("bookingChart.roomFilter", "Chọn phòng")} ·{" "}
                {selectedRoomIds.length || visibleRooms.length}
              </summary>
              {rooms.isLoading ? (
                <p className="muted">{t("common.loading")}</p>
              ) : (
                <div className="gantt-room-options">
                  {visibleRooms.map((room) => (
                    <label key={room.id}>
                      <input
                        type="checkbox"
                        checked={
                          selectedRoomIds.length === 0 ||
                          selectedRoomIds.includes(room.id)
                        }
                        onChange={(event) =>
                          setSelectedRoomIds((selected) => {
                            const current =
                              selected.length === 0
                                ? (rooms.data?.data || []).map(
                                    (entry) => entry.id,
                                  )
                                : selected;
                            const next = event.target.checked
                              ? [...current, room.id]
                              : current.filter((id) => id !== room.id);
                            return next.length === (rooms.data?.data.length || 0)
                              ? []
                              : next;
                          })
                        }
                      />
                      <span>{room.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </details>
            <span className="chart-note">
              {bookings.isError
                ? t("bookingChart.unavailable")
                : `${bookings.data?.data?.length || 0} đơn đặt`}
            </span>
          </div>
        </div>

        {bookings.isLoading ? (
          <Loading />
        ) : bookings.isError ? (
          <ErrorState
            error={bookings.error}
            onRetry={() => bookings.refetch()}
          />
        ) : (
          <RoomBookingGantt
            bookings={bookings.data?.data || []}
            rooms={visibleRooms}
            startDate={dashboardFrom}
            endDate={dashboardTo}
            onSelectBooking={(b) => setDetailBooking(b)}
          />
        )}
      </div>

      {/* BOTTOM GRID: OCCUPANCY & BOOKINGS TABLE */}
      <div className="grid2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>{t("dashboard.roomOccupancy")}</h3>
              <span>{dashboardPeriod}</span>
            </div>
          </div>
          <div className="donut">
            <div>
              <strong>{occupancy}%</strong>
              <span>{t("dashboard.occupied")}</span>
            </div>
          </div>
          <div className="legend">
            <span>
              <i className="dot fill" />
              {t("dashboard.occupied")} <b>{occupancy}%</b>
            </span>
            <span>
              <i className="dot" />
              {t("dashboard.available")} <b>{100 - occupancy}%</b>
            </span>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>
                {t("dashboard.recent", "Đơn đặt phòng")} ({filteredBookings.length})
              </h3>
              <span>
                {search ? `Tìm kiếm: "${search}"` : `Khoảng: ${dashboardPeriod}`}
              </span>
            </div>
          </div>
          <div className="table-wrap">
            {filteredBookings.length === 0 ? (
              <p
                className="muted"
                style={{ padding: "20px", textAlign: "center" }}
              >
                Không có đơn đặt phòng nào phù hợp trong khoảng thời gian này.
              </p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{t("table.booking", "Mã đơn")}</th>
                    <th>{t("table.guest", "Khách hàng")}</th>
                    <th>Phòng</th>
                    <th>{t("table.time", "Thời gian")}</th>
                    <th>{t("common.status", "Trạng thái")}</th>
                    <th>{t("table.total", "Tổng tiền")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.slice(0, 15).map((b) => (
                    <tr
                      key={b.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => setDetailBooking(b)}
                    >
                      <td>
                        <b>{b.booking_code}</b>
                      </td>
                      <td>
                        <div>{b.guest_name || "—"}</div>
                        {b.guest_phone && (
                          <small className="muted">{b.guest_phone}</small>
                        )}
                      </td>
                      <td>{b.rooms?.name || "—"}</td>
                      <td style={{ fontSize: "12px" }}>
                        <div>
                          {new Date(b.start_at).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                          })}{" "}
                          {new Date(b.start_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="muted">
                          đến{" "}
                          {new Date(b.end_at).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                          })}{" "}
                          {new Date(b.end_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={b.status} />
                      </td>
                      <td>
                        <b>{money(b.total)}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* QUICK BOOKING DETAIL MODAL */}
      <Modal
        open={Boolean(detailBooking)}
        onClose={() => setDetailBooking(null)}
        title={detailBooking?.booking_code || "Chi tiết đặt phòng"}
        description={
          detailBooking
            ? `${new Date(detailBooking.start_at).toLocaleString()} – ${new Date(detailBooking.end_at).toLocaleString()}`
            : ""
        }
        footer={
          detailBooking ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
              <button
                type="button"
                className="primary"
                onClick={() => setReceiptBooking(detailBooking)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <FileText size={16} /> Xuất biên lai
              </button>
              <button className="ghost" onClick={() => setDetailBooking(null)}>
                Đóng
              </button>
            </div>
          ) : (
            <button className="primary" onClick={() => setDetailBooking(null)}>
              Đóng
            </button>
          )
        }
      >
        {detailBooking && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                padding: "14px",
                background: "var(--color-surface-2)",
                borderRadius: "10px",
                border: "1px solid var(--color-border)",
              }}
            >
              {/* 1. Trạng thái đơn */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid var(--color-border)",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "110px" }}>
                  Trạng thái đơn
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <StatusBadge status={detailBooking.status} />
                  <select
                    aria-label="Đổi trạng thái đơn"
                    value={detailBooking.status}
                    disabled={updateStatus.isPending}
                    className="status-inline-select"
                    onChange={(event) =>
                      updateStatus.mutate({
                        id: detailBooking.id,
                        next: event.target.value as Parameters<typeof bookingsApi.updateStatus>[1],
                      })
                    }
                  >
                    {[
                      "PENDING",
                      "CONFIRMED",
                      "CHECKED_IN",
                      "CHECKED_OUT",
                      "CANCELLED",
                      "NO_SHOW",
                    ].map((value) => (
                      <option key={value} value={value}>
                        {t(`status.${value}`, value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 2. Thanh toán */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid var(--color-border)",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "110px" }}>
                  Thanh toán
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <StatusBadge status={detailBooking.payment_status} />
                  <select
                    aria-label="Đổi trạng thái thanh toán"
                    value={detailBooking.payment_status}
                    disabled={updatePaymentStatus.isPending}
                    className="status-inline-select"
                    onChange={(event) => {
                      const next = event.target.value as
                        | "UNPAID"
                        | "PARTIAL"
                        | "PAID"
                        | "FAILED"
                        | "REFUNDED";
                      if (next === detailBooking.payment_status) return;
                      let payAmount: number | undefined = detailBooking.total;
                      if (next === "PARTIAL") {
                        const input = window.prompt(
                          "Nhập số tiền đã thanh toán (₫):",
                          String(Math.round(detailBooking.total / 2)),
                        );
                        if (input === null) return;
                        const num = Number(input.replace(/[^0-9]/g, ""));
                        if (!num || num <= 0) {
                          toast.error("Số tiền không hợp lệ");
                          return;
                        }
                        payAmount = num;
                      }
                      updatePaymentStatus.mutate({
                        id: detailBooking.id,
                        next,
                        amount: payAmount,
                        currentBookingStatus: detailBooking.status,
                      });
                    }}
                  >
                    {["UNPAID", "PARTIAL", "PAID", "REFUNDED", "FAILED"].map((value) => (
                      <option key={value} value={value}>
                        {t(`status.${value}`, value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Dọn phòng */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontSize: "0.85rem", fontWeight: 700, minWidth: "110px" }}>
                  Dọn phòng
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  {detailBooking.cleaning_status === "CLEANED" ? (
                    <span
                      className="badge badge-success"
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <CheckCircle2 size={13} /> Đã dọn
                    </span>
                  ) : (
                    <span
                      className="badge badge-warning"
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <AlertCircle size={13} /> Chưa dọn
                    </span>
                  )}
                  <select
                    aria-label="Cập nhật trạng thái dọn phòng"
                    value={detailBooking.cleaning_status || "UNCLEANED"}
                    disabled={updateCleaningStatus.isPending}
                    className="status-inline-select"
                    onChange={(event) =>
                      updateCleaningStatus.mutate({
                        id: detailBooking.id,
                        cleaning_status: event.target.value as "UNCLEANED" | "CLEANED",
                      })
                    }
                  >
                    <option value="UNCLEANED">Chưa dọn</option>
                    <option value="CLEANED">Đã dọn</option>
                  </select>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <p className="muted" style={{ margin: "0 0 4px", fontSize: "0.8rem" }}>
                  Khách hàng
                </p>
                <b>{detailBooking.guest_name || "—"}</b>
                {detailBooking.guest_phone && (
                  <div style={{ fontSize: "0.85rem" }}>SĐT: {detailBooking.guest_phone}</div>
                )}
                {detailBooking.guest_email && (
                  <div style={{ fontSize: "0.85rem" }}>Email: {detailBooking.guest_email}</div>
                )}
              </div>
              <div>
                <p className="muted" style={{ margin: "0 0 4px", fontSize: "0.8rem" }}>
                  Phòng & Khách
                </p>
                <b>{detailBooking.rooms?.name || "Phòng"}</b>
                <div style={{ fontSize: "0.85rem" }}>{detailBooking.guest_count} khách</div>
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--color-border)",
                paddingTop: "0.75rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600 }}>
                  Chi tiết các khoản phí
                </p>
                {detailBooking.price_breakdown?.pricing_rule_name && (
                  <span
                    style={{
                      fontSize: "11px",
                      background: "var(--color-surface)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-muted)",
                    }}
                  >
                    {detailBooking.price_breakdown.pricing_rule_name}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                <span>• Tiền phòng cơ bản:</span>
                <span>
                  {money(
                    detailBooking.price_breakdown?.room_price !== undefined
                      ? detailBooking.price_breakdown.room_price
                      : (detailBooking.subtotal || detailBooking.total) -
                          (detailBooking.price_breakdown?.extra_guest_fee || 0),
                  )}
                </span>
              </div>

              {Number(detailBooking.price_breakdown?.extra_guest_fee || 0) > 0 ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    marginBottom: "4px",
                    color: "var(--color-warning)",
                  }}
                >
                  <span>
                    • Phụ thu khách thêm ({detailBooking.price_breakdown?.extra_guest_count} khách, từ người thứ{" "}
                    {(detailBooking.price_breakdown?.standard_guest_count ?? 2) + 1}):
                  </span>
                  <span>+{money(detailBooking.price_breakdown!.extra_guest_fee!)}</span>
                </div>
              ) : detailBooking.guest_count > 2 ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                    marginBottom: "4px",
                    color: "var(--color-warning)",
                  }}
                >
                  <span>
                    • Phụ thu khách thêm ({detailBooking.guest_count - 2} khách, từ người thứ 3):
                  </span>
                  <span>+{money((detailBooking.guest_count - 2) * 100000)}</span>
                </div>
              ) : null}

              {Number(detailBooking.discount) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px", color: "var(--color-success)" }}>
                  <span>• Giảm giá:</span>
                  <span>-{money(detailBooking.discount)}</span>
                </div>
              )}

              {Number(detailBooking.tax) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "4px" }}>
                  <span>• Thuế / Phí dịch vụ:</span>
                  <span>+{money(detailBooking.tax)}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.05rem",
                  fontWeight: "bold",
                  borderTop: "1px dashed var(--color-border)",
                  paddingTop: "6px",
                  marginTop: "6px",
                }}
              >
                <span>Tổng tiền:</span>
                <span>{money(detailBooking.total)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* BOOKING RECEIPT MODAL */}
      {receiptBooking && (
        <BookingReceiptModal
          booking={receiptBooking}
          onClose={() => setReceiptBooking(null)}
        />
      )}
    </>
  );
}

function Stat({
  label,
  value,
  delta,
  sub,
}: {
  label: string;
  value: string;
  delta: string;
  sub: string;
}) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <div>
        <em>{delta}</em>
        <small>{sub}</small>
      </div>
    </div>
  );
}
