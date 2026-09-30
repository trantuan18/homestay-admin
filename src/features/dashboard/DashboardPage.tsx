import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dashboardApi, bookingsApi, propertiesApi, roomsApi } from "./api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatusBadge } from "../../components/ui/StatusBadge";
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
  const [selectedDate, setSelectedDate] = useState(() => localDate(new Date()));
  const [propertyId, setPropertyId] = useState("");
  const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
  const q = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: dashboardApi.get,
  });
  const properties = useQuery({
    queryKey: ["admin-dashboard-properties"],
    queryFn: () => propertiesApi.list({ offset: 0, limit: 100 }),
    staleTime: 60_000,
  });
  const rooms = useQuery({
    queryKey: ["admin-dashboard-rooms", propertyId],
    queryFn: () =>
      roomsApi.list({
        offset: 0,
        limit: 100,
        ...(propertyId ? { property_id: propertyId } : {}),
      }),
    staleTime: 60_000,
  });
  const chartStart = new Date(`${selectedDate}T00:00:00`);
  const chartEnd = new Date(chartStart);
  chartEnd.setDate(chartEnd.getDate() + 1);
  const bookings = useQuery({
    queryKey: ["admin-booking-chart", selectedDate, propertyId],
    queryFn: () =>
      bookingsApi.list({
        limit: 200,
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
    (room) => selectedRoomIds.length === 0 || selectedRoomIds.includes(room.id),
  );
  const visibleRoomIds = new Set(visibleRooms.map((room) => room.id));
  const recentBookings = [...(bookings.data?.data || [])]
    .filter(
      (booking) =>
        selectedRoomIds.length === 0 || visibleRoomIds.has(booking.room_id),
    )
    .sort((a, b) => b.start_at.localeCompare(a.start_at))
    .slice(0, 8);
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
      <div className="stats" role="region" aria-label={t("dashboard.stats")}>
        <Stat
          label={t("dashboard.revenue")}
          value={money(d.revenue.paid_revenue)}
          delta="—"
          sub={t("dashboard.vsLastMonth")}
        />
        <Stat
          label={t("dashboard.bookings")}
          value={String(d.bookings.total)}
          delta="—"
          sub={t("dashboard.thisMonth")}
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
      <div className="panel chart-panel">
        <div className="panel-head hourly-chart-heading">
          <div>
            <h3>{t("bookingChart.hourlyTitle")}</h3>
            <span>{t("bookingChart.hourlySubtitle")}</span>
          </div>
          <span className="chart-note">
            {bookings.isError
              ? t("bookingChart.unavailable")
              : t("bookingChart.loaded")}
          </span>
        </div>
        <div className="hourly-chart-filters">
          <label>
            <span>{t("bookingChart.dateFilter")}</span>
            <input
              aria-label={t("bookingChart.dateFilter")}
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <label>
            <span>{t("bookingChart.propertyFilter")}</span>
            <select
              value={propertyId}
              onChange={(event) => {
                setPropertyId(event.target.value);
                setSelectedRoomIds([]);
              }}
            >
              <option value="">{t("common.allProperties")}</option>
              {(properties.data?.data || []).map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
          <details className="gantt-room-picker" open>
            <summary>
              {t("bookingChart.roomFilter")} ·{" "}
              {selectedRoomIds.length || (rooms.data?.data.length ?? 0)}
            </summary>
            {rooms.isLoading ? (
              <p className="muted">{t("common.loading")}</p>
            ) : (
              <div className="gantt-room-options">
                {(rooms.data?.data || []).map((room) => (
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
              date={selectedDate}
            />
          </Suspense>
        )}
      </div>
      <div className="grid2">
        <div className="panel">
          <div className="panel-head">
            <div>
              <h3>{t("dashboard.roomOccupancy")}</h3>
              <span>{t("dashboard.todayAll")}</span>
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
              <h3>{t("dashboard.recent")}</h3>
              <span>{t("dashboard.latestActivity")}</span>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{t("table.booking")}</th>
                  <th>{t("table.guest")}</th>
                  <th>{t("table.time")}</th>
                  <th>{t("common.status")}</th>
                  <th>{t("table.total")}</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.booking_code}</td>
                    <td>{b.guest_name || "—"}</td>
                    <td>
                      {new Date(b.start_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      –{" "}
                      {new Date(b.end_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>
                      <StatusBadge status={b.status} />
                    </td>
                    <td>{money(b.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
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
