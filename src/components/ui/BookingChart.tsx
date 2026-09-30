import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Booking } from "../../types/api";

export function BookingChart({
  bookings,
  daily,
  days = 14,
  hourlyDate,
}: {
  bookings: Booking[];
  daily?: Array<{
    date: string;
    confirmed: number;
    bookings: number;
    cancelled: number;
    checked_in: number;
    checked_out: number;
  }>;
  days?: number;
  hourlyDate?: string;
}) {
  const { t } = useTranslation();
  const data = useMemo(() => {
    if (hourlyDate) {
      const rows = Array.from({ length: 24 }, (_, hour) => {
        return {
          key: String(hour),
          label: `${String(hour).padStart(2, "0")}:00`,
          pending: 0,
          confirmed: 0,
          completed: 0,
        };
      });
      bookings.forEach((booking) => {
        if (["CANCELLED", "EXPIRED", "NO_SHOW"].includes(booking.status))
          return;
        const start = new Date(booking.start_at);
        const end = new Date(booking.end_at);
        rows.forEach((row, hour) => {
          const slotStart = new Date(
            `${hourlyDate}T${String(hour).padStart(2, "0")}:00:00`,
          );
          const slotEnd = new Date(slotStart.getTime() + 60 * 60 * 1000);
          if (start < slotEnd && end > slotStart) {
            if (booking.status === "PENDING") row.pending++;
            else if (booking.status === "CHECKED_OUT") row.completed++;
            else row.confirmed++;
          }
        });
      });
      return rows;
    }
    if (daily?.length) {
      return daily.map((row) => ({
        key: row.date,
        label: new Date(row.date).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "2-digit",
        }),
        confirmed: row.confirmed + row.checked_in,
        pending: Math.max(
          row.bookings -
            row.confirmed -
            row.cancelled -
            row.checked_in -
            row.checked_out,
          0,
        ),
        completed: row.checked_out,
        cancelled: row.cancelled,
      }));
    }
    const now = new Date();
    const rows = Array.from({ length: days }, (_, i) => {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(now.getDate() - (days - 1 - i));
      return {
        key: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, {
          day: "2-digit",
          month: "2-digit",
        }),
        confirmed: 0,
        pending: 0,
        completed: 0,
        cancelled: 0,
      };
    });
    const map = new Map(rows.map((r) => [r.key, r]));
    bookings.forEach((b) => {
      const key = new Date(b.start_at).toISOString().slice(0, 10);
      const row = map.get(key);
      if (!row) return;
      if (b.status === "PENDING") row.pending++;
      else if (b.status === "CONFIRMED" || b.status === "CHECKED_IN")
        row.confirmed++;
      else if (b.status === "CHECKED_OUT") row.completed++;
      else if (
        b.status === "CANCELLED" ||
        b.status === "EXPIRED" ||
        b.status === "NO_SHOW"
      )
        row.cancelled++;
    });
    return rows;
  }, [bookings, daily, days, hourlyDate]);
  return (
    <div className="booking-chart">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" interval={hourlyDate ? 2 : 0} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar
            dataKey="confirmed"
            name={t("bookingChart.confirmed")}
            stackId="bookings"
          />
          <Bar
            dataKey="pending"
            name={t("bookingChart.pending")}
            stackId="bookings"
          />
          <Bar
            dataKey="completed"
            name={t("bookingChart.completed")}
            stackId="bookings"
          />
          {!hourlyDate && (
            <Bar
              dataKey="cancelled"
              name={t("bookingChart.cancelled")}
              stackId="bookings"
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
