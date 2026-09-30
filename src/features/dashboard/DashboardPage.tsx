import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { dashboardApi, bookingsApi } from "./api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { BookingChart } from "../../components/ui/BookingChart";
const money = (n: number) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(n);
export function DashboardPage() {
  const { t } = useTranslation();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
  const q = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: dashboardApi.get,
  });
  const bookings = useQuery({
    queryKey: ["admin-booking-chart"],
    queryFn: () => bookingsApi.list({ offset: 0, limit: 200 }),
    staleTime: 30_000,
  });
  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const d = q.data!;
  const occupancy = d.rooms.total
    ? Math.round(((d.rooms.total - d.rooms.available) / d.rooms.total) * 100)
    : 0;
  const recentBookings = bookings.data?.data || [];
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("dashboard.eyebrow")}</p>
          <h1>{t(`dashboard.greeting.${greeting}`, { name: "Admin" })}</h1>
          <p className="muted">{t("dashboard.description")}</p>
        </div>
        <button className="primary">+ {t("dashboard.createBooking")}</button>
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
        <div className="panel-head">
          <div>
            <h3>{t("bookingChart.title")}</h3>
            <span>{t("bookingChart.subtitle")}</span>
          </div>
          <span className="chart-note">
            {bookings.isError
              ? t("bookingChart.unavailable")
              : t("bookingChart.loaded")}
          </span>
        </div>
        {bookings.isLoading ? (
          <Loading />
        ) : bookings.isError ? (
          <ErrorState
            error={bookings.error}
            onRetry={() => bookings.refetch()}
          />
        ) : (
          <BookingChart bookings={bookings.data?.data || []} days={14} />
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
