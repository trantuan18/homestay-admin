import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  DollarSign,
  CalendarCheck,
  TrendingUp,
  XCircle,
  Building2,
  DoorOpen,
  BarChart3,
  Calendar,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { analyticsApi, propertiesApi } from "../dashboard/api";
import { BookingChart } from "../../components/ui/BookingChart";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";

const formatDateOnly = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function AnalyticsPage() {
  const { t } = useTranslation();

  // Date filters
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [from, setFrom] = useState(() => formatDateOnly(firstDayOfMonth));
  const [to, setTo] = useState(() => formatDateOnly(now));
  const [selectedPropertyId, setSelectedPropertyId] = useState("");
  const [activeTab, setActiveTab] = useState<"properties" | "rooms">("properties");
  const [chartMode, setChartMode] = useState<"bookings" | "revenue">("bookings");

  // Fetch properties for filter
  const propertiesQuery = useQuery({
    queryKey: ["admin-properties-for-analytics"],
    queryFn: () => propertiesApi.list({ offset: 0, limit: 100, status: "ACTIVE" }),
    staleTime: 60_000,
  });

  // Fetch analytics data
  const q = useQuery({
    queryKey: ["admin-analytics", from, to, selectedPropertyId],
    queryFn: () =>
      analyticsApi.get({
        from: from || undefined,
        to: to || undefined,
        property_id: selectedPropertyId || undefined,
      }),
    staleTime: 30_000,
  });

  // Presets
  const applyPreset = (preset: "7d" | "30d" | "this_month" | "last_month") => {
    const today = new Date();
    if (preset === "7d") {
      const past = new Date(today);
      past.setDate(today.getDate() - 7);
      setFrom(formatDateOnly(past));
      setTo(formatDateOnly(today));
    } else if (preset === "30d") {
      const past = new Date(today);
      past.setDate(today.getDate() - 30);
      setFrom(formatDateOnly(past));
      setTo(formatDateOnly(today));
    } else if (preset === "this_month") {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      setFrom(formatDateOnly(first));
      setTo(formatDateOnly(today));
    } else if (preset === "last_month") {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      setFrom(formatDateOnly(first));
      setTo(formatDateOnly(last));
    }
  };

  const summary = q.data?.summary || {};
  const properties = q.data?.property_performance || [];
  const rooms = (q.data?.room_performance || []) as Array<{
    room_id: string;
    name: string;
    property_id: string;
    status: string;
    bookings: number;
    revenue: number;
  }>;
  const daily = q.data?.daily || [];

  const totalRevenue = Number(summary.total_revenue || 0);
  const totalBookings = Number(summary.total_bookings || 0);
  const confirmedBookings = Number(summary.confirmed_bookings || 0);
  const cancelledBookings = Number(summary.cancelled_bookings || 0);
  const avgBookingValue = Number(summary.average_booking_value || 0);
  const cancelRate =
    totalBookings > 0
      ? Math.round((cancelledBookings / totalBookings) * 100)
      : 0;

  // Revenue chart data
  const revenueChartData = useMemo(() => {
    return daily.map((d) => ({
      key: d.date,
      label: new Date(d.date).toLocaleDateString(undefined, {
        day: "2-digit",
        month: "2-digit",
      }),
      revenue: Number(d.revenue || 0),
      bookings: Number(d.bookings || 0),
    }));
  }, [daily]);

  // Map property names for rooms
  const propertyNameMap = useMemo(() => {
    const map = new Map<string, string>();
    (propertiesQuery.data?.data || []).forEach((p) => {
      map.set(p.id, p.name);
    });
    properties.forEach((p) => {
      map.set(p.property_id, p.name);
    });
    return map;
  }, [propertiesQuery.data, properties]);

  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("nav.analytics").toUpperCase()}</p>
          <h1>{t("nav.analytics")}</h1>
          <p className="muted">{t("management.analyticsDesc")}</p>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="analytics-filter-bar panel" style={{ padding: "14px 18px", marginBottom: "18px" }}>
        <div className="analytics-filter-controls">
          <label className="booking-date-filter" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Calendar size={14} color="var(--color-muted)" />
            <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>Từ:</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
            />
          </label>

          <label className="booking-date-filter" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>Đến:</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
            />
          </label>

          <select
            className="status-inline-select"
            style={{ maxWidth: "220px", height: "34px", paddingRight: "24px" }}
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            aria-label="Lọc theo cơ sở"
          >
            <option value="">{t("analytics.allProperties", "Tất cả cơ sở lưu trú")}</option>
            {(propertiesQuery.data?.data || []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Presets */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="dashboard-preset-btn"
            onClick={() => applyPreset("7d")}
          >
            {t("analytics.preset7d", "7 ngày qua")}
          </button>
          <button
            type="button"
            className="dashboard-preset-btn"
            onClick={() => applyPreset("30d")}
          >
            {t("analytics.preset30d", "30 ngày qua")}
          </button>
          <button
            type="button"
            className="dashboard-preset-btn"
            onClick={() => applyPreset("this_month")}
          >
            {t("analytics.presetThisMonth", "Tháng này")}
          </button>
          <button
            type="button"
            className="dashboard-preset-btn"
            onClick={() => applyPreset("last_month")}
          >
            {t("analytics.presetLastMonth", "Tháng trước")}
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="stats">
        <div className="stat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{t("analytics.totalRevenue", "Tổng doanh thu")}</span>
            <DollarSign size={16} color="var(--color-success)" />
          </div>
          <strong style={{ color: "var(--color-text)" }}>
            {new Intl.NumberFormat("vi-VN").format(totalRevenue)} ₫
          </strong>
          <small className="muted">Doanh thu từ các đơn đã thanh toán</small>
        </div>

        <div className="stat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{t("analytics.totalBookings", "Tổng đặt phòng")}</span>
            <CalendarCheck size={16} color="var(--color-info)" />
          </div>
          <strong style={{ color: "var(--color-info)" }}>{totalBookings}</strong>
          <small className="muted">
            Xác nhận: <b>{confirmedBookings}</b> đơn
          </small>
        </div>

        <div className="stat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{t("analytics.averageBookingValue", "Giá trị TB / đơn")}</span>
            <TrendingUp size={16} color="var(--color-primary-strong)" />
          </div>
          <strong>
            {new Intl.NumberFormat("vi-VN").format(avgBookingValue)} ₫
          </strong>
          <small className="muted">Trung bình trên mỗi đơn xác nhận</small>
        </div>

        <div className="stat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{t("analytics.cancelledRate", "Tỷ lệ hủy")}</span>
            <XCircle size={16} color={cancelRate > 20 ? "var(--color-error)" : "var(--color-muted)"} />
          </div>
          <strong style={{ color: cancelRate > 20 ? "var(--color-error)" : "var(--color-text)" }}>
            {cancelRate}%
          </strong>
          <small className="muted">
            Đã hủy: <b>{cancelledBookings}</b> đơn
          </small>
        </div>
      </div>

      {/* CHART PANEL */}
      <div className="panel chart-panel" style={{ marginBottom: "18px" }}>
        <div className="panel-head" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3>
              {chartMode === "bookings"
                ? "Xu hướng đặt phòng theo ngày"
                : "Xu hướng doanh thu theo ngày"}
            </h3>
            <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
              Từ {from} đến {to}
            </span>
          </div>

          <div className="analytics-tabs">
            <button
              type="button"
              className={`analytics-tab-btn ${chartMode === "bookings" ? "active" : ""}`}
              onClick={() => setChartMode("bookings")}
            >
              Lượt đặt phòng
            </button>
            <button
              type="button"
              className={`analytics-tab-btn ${chartMode === "revenue" ? "active" : ""}`}
              onClick={() => setChartMode("revenue")}
            >
              Doanh thu (₫)
            </button>
          </div>
        </div>

        {chartMode === "bookings" ? (
          <BookingChart bookings={[]} daily={daily} days={daily.length || 30} />
        ) : (
          <div className="booking-chart" style={{ padding: "10px 0" }}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChartData} margin={{ top: 8, right: 8, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis
                  tickFormatter={(val) =>
                    val >= 1_000_000
                      ? `${(val / 1_000_000).toFixed(1)}Tr`
                      : val >= 1_000
                        ? `${(val / 1_000).toFixed(0)}k`
                        : `${val}`
                  }
                />
                <Tooltip
                  formatter={(val: any) => [
                    `${new Intl.NumberFormat("vi-VN").format(Number(val))} ₫`,
                    "Doanh thu",
                  ]}
                  labelFormatter={(lbl) => `Ngày ${lbl}`}
                />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-primary-strong, #b9e600)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* PERFORMANCE BREAKDOWN TABS */}
      <div className="panel">
        <div
          className="panel-head"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            borderBottom: "1px solid var(--color-border)",
            paddingBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <BarChart3 size={18} color="var(--color-primary-strong)" />
            <h3 style={{ margin: 0 }}>Báo cáo hiệu suất vận hành</h3>
          </div>

          <div className="analytics-tabs">
            <button
              type="button"
              className={`analytics-tab-btn ${activeTab === "properties" ? "active" : ""}`}
              onClick={() => setActiveTab("properties")}
            >
              <Building2 size={13} style={{ display: "inline", marginRight: "5px", verticalAlign: "-2px" }} />
              {t("analytics.propertyPerformance", "Theo cơ sở")} ({properties.length})
            </button>
            <button
              type="button"
              className={`analytics-tab-btn ${activeTab === "rooms" ? "active" : ""}`}
              onClick={() => setActiveTab("rooms")}
            >
              <DoorOpen size={13} style={{ display: "inline", marginRight: "5px", verticalAlign: "-2px" }} />
              {t("analytics.roomPerformance", "Theo phòng")} ({rooms.length})
            </button>
          </div>
        </div>

        <div className="table-wrap">
          {activeTab === "properties" ? (
            <table>
              <thead>
                <tr>
                  <th>{t("table.name", "Tên cơ sở")}</th>
                  <th>{t("table.city", "Thành phố")}</th>
                  <th>{t("table.booking", "Lượt đặt phòng")}</th>
                  <th>{t("table.total", "Doanh thu")}</th>
                  <th>{t("analytics.contribution", "Tỷ trọng")}</th>
                </tr>
              </thead>
              <tbody>
                {properties.length ? (
                  properties.map((property) => {
                    const rev = Number(property.revenue || 0);
                    const percent = totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;

                    return (
                      <tr key={String(property.property_id)}>
                        <td>
                          <b>{String(property.name || "—")}</b>
                        </td>
                        <td>{String(property.city || "—")}</td>
                        <td>
                          <span className="role-chip role-admin">
                            {property.bookings || 0} lượt
                          </span>
                        </td>
                        <td>
                          <b style={{ color: "var(--color-text)" }}>
                            {new Intl.NumberFormat("vi-VN").format(rev)} ₫
                          </b>
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, minWidth: "32px" }}>
                              {percent}%
                            </span>
                            <div className="contribution-bar-wrap">
                              <div
                                className="contribution-bar-fill"
                                style={{ width: `${Math.min(percent, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="empty-cell">
                      {t("common.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>{t("table.name", "Tên phòng")}</th>
                  <th>{t("table.property", "Cơ sở")}</th>
                  <th>{t("table.booking", "Lượt đặt phòng")}</th>
                  <th>{t("table.total", "Doanh thu")}</th>
                  <th>{t("common.status", "Trạng thái")}</th>
                  <th>{t("analytics.contribution", "Tỷ trọng")}</th>
                </tr>
              </thead>
              <tbody>
                {rooms.length ? (
                  rooms.map((room) => {
                    const rev = Number(room.revenue || 0);
                    const percent = totalRevenue > 0 ? Math.round((rev / totalRevenue) * 100) : 0;
                    const propName = propertyNameMap.get(room.property_id) || "—";

                    return (
                      <tr key={String(room.room_id)}>
                        <td>
                          <b>{String(room.name || "—")}</b>
                        </td>
                        <td>{propName}</td>
                        <td>
                          <span className="role-chip role-staff">
                            {room.bookings || 0} lượt
                          </span>
                        </td>
                        <td>
                          <b style={{ color: "var(--color-text)" }}>
                            {new Intl.NumberFormat("vi-VN").format(rev)} ₫
                          </b>
                        </td>
                        <td>
                          <StatusBadge status={room.status || "AVAILABLE"} />
                        </td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 600, minWidth: "32px" }}>
                              {percent}%
                            </span>
                            <div className="contribution-bar-wrap">
                              <div
                                className="contribution-bar-fill"
                                style={{
                                  width: `${Math.min(percent, 100)}%`,
                                  background: "var(--color-info, #60a5fa)",
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="empty-cell">
                      {t("common.empty")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
