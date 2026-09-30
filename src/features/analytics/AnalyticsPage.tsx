import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { analyticsApi } from "../dashboard/api";
import { BookingChart } from "../../components/ui/BookingChart";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";

export function AnalyticsPage() {
  const { t } = useTranslation();
  const q = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => analyticsApi.get(),
    staleTime: 30_000,
  });
  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const summary = q.data?.summary || {};
  const properties = q.data?.property_performance || [];
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("nav.analytics").toUpperCase()}</p>
          <h1>{t("nav.analytics")}</h1>
          <p className="muted">{t("management.analyticsDesc")}</p>
        </div>
      </div>
      <div className="panel chart-panel">
        <div className="panel-head">
          <div>
            <h3>{t("bookingChart.title")}</h3>
            <span>{t("bookingChart.analyticsSubtitle")}</span>
          </div>
        </div>
        <BookingChart bookings={[]} daily={q.data?.daily} days={30} />
      </div>
      <div className="stats analytics-stats">
        <div className="stat">
          <span>{t("bookingChart.loadedBookings")}</span>
          <strong>{summary.total_bookings || 0}</strong>
          <small>{t("bookingChart.loadedBookingsHint")}</small>
        </div>
        <div className="stat">
          <span>{t("bookingChart.confirmed")}</span>
          <strong>{summary.confirmed_bookings || 0}</strong>
        </div>
        <div className="stat">
          <span>{t("bookingChart.pending")}</span>
          <strong>{summary.pending_bookings || 0}</strong>
        </div>
        <div className="stat">
          <span>{t("bookingChart.cancelled")}</span>
          <strong>{summary.cancelled_bookings || 0}</strong>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>{t("nav.properties")}</h3>
            <span>{t("management.analyticsDesc")}</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("table.name")}</th>
                <th>{t("table.city")}</th>
                <th>{t("table.booking")}</th>
                <th>{t("table.total")}</th>
              </tr>
            </thead>
            <tbody>
              {properties.length ? (
                properties.map((property) => (
                  <tr key={String(property.property_id)}>
                    <td>{String(property.name || "—")}</td>
                    <td>{String(property.city || "—")}</td>
                    <td>{String(property.bookings || 0)}</td>
                    <td>
                      {new Intl.NumberFormat("vi-VN").format(
                        Number(property.revenue || 0),
                      )}{" "}
                      ₫
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    {t("common.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
