import { useEffect, useMemo, useRef, useCallback } from "react";
import { Timeline } from "vis-timeline/standalone";
import type { DataGroup, DataItem } from "vis-timeline/standalone";
import { useTranslation } from "react-i18next";
import type { Booking, Room } from "../../types/api";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";

const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

type Props = {
  bookings: Booking[];
  rooms: Room[];
  startDate?: string;
  endDate?: string;
  date?: string;
  onSelectBooking?: (booking: Booking) => void;
};

export function RoomBookingGantt({
  bookings,
  rooms,
  startDate,
  endDate,
  date,
  onSelectBooking,
}: Props) {
  const { t } = useTranslation();
  const timelineElement = useRef<HTMLDivElement>(null);
  const timeline = useRef<Timeline | null>(null);

  const range = useMemo(() => {
    const fromStr = startDate || date || localDate(new Date());
    const toStr = endDate || fromStr;
    const start = new Date(`${fromStr}T00:00:00`);
    const end = new Date(`${toStr}T23:59:59`);
    if (end <= start) {
      end.setDate(start.getDate() + 1);
    }
    return { start, end };
  }, [startDate, endDate, date]);

  const groups = useMemo<DataGroup[]>(
    () =>
      rooms.map((room) => ({
        id: room.id,
        content: room.name,
        title: room.properties?.name || "",
        className: "room-gantt-group",
      })),
    [rooms],
  );

  const items = useMemo<DataItem[]>(
    () =>
      bookings
        .filter((booking) => rooms.some((room) => room.id === booking.room_id))
        .filter(
          (booking) =>
            !["CANCELLED", "EXPIRED", "NO_SHOW"].includes(booking.status),
        )
        .map((booking) => {
          const start = new Date(booking.start_at);
          const end = new Date(booking.end_at);
          const label = booking.guest_name?.startsWith("TEST DATA")
            ? "DEMO"
            : `${booking.booking_code}${booking.guest_name ? ` · ${booking.guest_name}` : ""}`;
          return {
            id: booking.id,
            group: booking.room_id,
            content: label,
            start,
            end,
            className: `room-gantt-item room-gantt-${booking.status.toLowerCase()}`,
            title: `${booking.booking_code} · ${booking.guest_name || "Khách"} · ${new Date(booking.start_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} – ${new Date(booking.end_at).toLocaleString([], { dateStyle: "short", timeStyle: "short" })} · ${t(`status.${booking.status}`, booking.status)}`,
          };
        })
        .filter(
          (item) =>
            new Date(item.start).getTime() < new Date(item.end!).getTime(),
        ),
    [bookings, rooms, t],
  );

  // Interaction handlers
  const handlePan = useCallback((direction: "left" | "right") => {
    if (!timeline.current) return;
    const windowRange = timeline.current.getWindow();
    const interval = windowRange.end.getTime() - windowRange.start.getTime();
    const step = interval * 0.35;
    const delta = direction === "left" ? -step : step;
    timeline.current.setWindow(
      new Date(windowRange.start.getTime() + delta),
      new Date(windowRange.end.getTime() + delta),
      { animation: { duration: 300, easingFunction: "easeInOutQuad" } },
    );
  }, []);

  const handleZoom = useCallback((type: "in" | "out") => {
    if (!timeline.current) return;
    if (type === "in") {
      timeline.current.zoomIn(0.4, { animation: { duration: 300 } });
    } else {
      timeline.current.zoomOut(0.4, { animation: { duration: 300 } });
    }
  }, []);

  const handleGoToday = useCallback(() => {
    if (!timeline.current) return;
    const now = new Date();
    const windowRange = timeline.current.getWindow();
    const interval = windowRange.end.getTime() - windowRange.start.getTime();
    const half = interval / 2;
    timeline.current.setWindow(
      new Date(now.getTime() - half),
      new Date(now.getTime() + half),
      { animation: { duration: 400, easingFunction: "easeInOutQuad" } },
    );
  }, []);

  const handleResetWindow = useCallback(() => {
    if (!timeline.current) return;
    timeline.current.setWindow(range.start, range.end, {
      animation: { duration: 400, easingFunction: "easeInOutQuad" },
    });
  }, [range]);

  useEffect(() => {
    if (!timelineElement.current) return;
    const instance = new Timeline(timelineElement.current, items, groups, {
      start: range.start,
      end: range.end,
      moveable: true,
      zoomable: true,
      horizontalScroll: true,
      verticalScroll: true,
      zoomMin: 1000 * 60 * 60 * 2,
      zoomMax: 1000 * 60 * 60 * 24 * 180,
      selectable: true,
      stack: false,
      groupHeightMode: "fixed",
      orientation: "top",
      showCurrentTime: true,
      showMajorLabels: true,
      showMinorLabels: true,
      height: Math.max(220, rooms.length * 56 + 70),
      margin: { item: { horizontal: 2, vertical: 8 }, axis: 6 },
      tooltip: { followMouse: true, overflowMethod: "cap" },
      format: {
        minorLabels: {
          minute: "HH:mm",
          hour: "HH:mm",
          day: "D/M",
          week: "w",
          month: "MM/yyyy",
          year: "yyyy",
        },
        majorLabels: {
          minute: "D/M/yyyy",
          hour: "ddd, D/M",
          day: "MM/yyyy",
          week: "MM/yyyy",
          month: "yyyy",
          year: "",
        },
      },
    });

    instance.on("select", (properties) => {
      if (properties.items?.length && onSelectBooking) {
        const selectedId = properties.items[0];
        const found = bookings.find((b) => b.id === selectedId);
        if (found) onSelectBooking(found);
      }
    });

    timeline.current = instance;
    return () => {
      instance.destroy();
      timeline.current = null;
    };
  }, [groups, items, range, rooms.length]);

  useEffect(() => {
    if (timeline.current) {
      timeline.current.setData({ items, groups });
    }
  }, [items, groups]);

  useEffect(() => {
    timeline.current?.setWindow(range.start, range.end, {
      animation: { duration: 300, easingFunction: "easeInOutQuad" },
    });
  }, [range.start.getTime(), range.end.getTime()]);

  return (
    <div
      className="room-booking-gantt"
      aria-label={t("bookingChart.ganttLabel")}
    >
      {rooms.length ? (
        <>
          <div className="gantt-interaction-bar">
            <div className="gantt-nav-btns">
              <button
                type="button"
                onClick={() => handlePan("left")}
                title="Lùi thời gian (◀)"
              >
                ◀ Trước
              </button>
              <button
                type="button"
                onClick={handleGoToday}
                title="Nhảy về thời điểm hiện tại"
              >
                Hôm nay
              </button>
              <button
                type="button"
                onClick={() => handlePan("right")}
                title="Tiến thời gian (▶)"
              >
                Sau ▶
              </button>
              <span className="gantt-nav-divider" />
              <button
                type="button"
                onClick={() => handleZoom("in")}
                title="Phóng to theo giờ (+)"
              >
                🔍+ Phóng to
              </button>
              <button
                type="button"
                onClick={() => handleZoom("out")}
                title="Thu nhỏ theo ngày (-)"
              >
                🔍- Thu nhỏ
              </button>
              <button
                type="button"
                onClick={handleResetWindow}
                title="Xem toàn bộ khoảng ngày đã chọn"
              >
                Xem trọn vẹn
              </button>
            </div>
            <div className="gantt-scroll-hint">
              💡 Kéo chuột hoặc lăn chuột để cuộn timeline
            </div>
          </div>
          <div ref={timelineElement} />
        </>
      ) : (
        <p className="muted gantt-empty">{t("bookingChart.noRooms")}</p>
      )}
    </div>
  );
}
