import { lazy, Suspense, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dashboardApi, bookingsApi, propertiesApi, roomsApi } from "./api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import type { Booking } from "../../types/api";

const RoomBookingGantt = lazy(() =>
  import("../../components/ui/RoomBookingGantt").then((module) => ({
    default: module.RoomBookingGantt,
  })),
);

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
  const chartStart = new Date(`${dashboardFrom}T00:00:00`);
  const chartEnd = new Date(`${dashboardTo}T23:59:59`);

  const bookings = useQuery({
    queryKey: ["admin-booking-chart", dashboardFrom, dashboardTo, propertyId],
    queryFn: () =>
      bookingsApi.list({
        limit: 500,
        overlap_start: chartStart.toISOString(),
        overlap_end: chartEnd.toISOString(),
        ...(propertyId ? { property_id: propertyId } : {}),
      }),
    staleTime: 30_000,
  });

  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const d = q.data!;
  const occupancy = d.rooms.total
    ? Math.round(((d.rooms.total - d.rooms.available) / d.rooms.total) * 100)
    : 0;

  const visibleRooms = (rooms.data?.data || []).filter(
    (room) =>
      room.status === "AVAILABLE" &&
      (room.properties?.status ? room.properties.status === "ACTIVE" : true) &&
      (selectedRoomIds.length === 0 || selectedRoomIds.includes(room.id)),
  );
  const visibleRoomIds = new Set(visibleRooms.map((room) => room.id));

  // Filter bookings in range by search query
  const filteredBookings = (bookings.data?.data || [])
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
    .sort((a, b) => b.start_at.localeCompare(a.start_at));

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
          <Suspense fallback={<Loading />}>
            <RoomBookingGantt
              bookings={bookings.data?.data || []}
              rooms={visibleRooms}
              startDate={dashboardFrom}
              endDate={dashboardTo}
              onSelectBooking={(b) => setDetailBooking(b)}
            />
          </Suspense>
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
          <button className="primary" onClick={() => setDetailBooking(null)}>
            Đóng
          </button>
        }
      >
        {detailBooking && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                padding: "0.75rem",
                background: "var(--color-surface-2)",
                borderRadius: "8px",
              }}
            >
              <div>
                <p className="muted" style={{ margin: "0 0 4px", fontSize: "0.8rem" }}>
                  Trạng thái đơn
                </p>
                <StatusBadge status={detailBooking.status} />
              </div>
              <div>
                <p className="muted" style={{ margin: "0 0 4px", fontSize: "0.8rem" }}>
                  Thanh toán
                </p>
                <StatusBadge status={detailBooking.payment_status} />
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.05rem",
                  fontWeight: "bold",
                }}
              >
                <span>Tổng tiền:</span>
                <span>{money(detailBooking.total)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
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
