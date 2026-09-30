import { useEffect, useMemo, useRef } from "react";
import { Timeline } from "vis-timeline/standalone";
import type { DataGroup, DataItem } from "vis-timeline/standalone";
import { useTranslation } from "react-i18next";
import type { Booking, Room } from "../../types/api";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";

type Props = {
  bookings: Booking[];
  rooms: Room[];
  date: string;
};

export function RoomBookingGantt({ bookings, rooms, date }: Props) {
  const { t } = useTranslation();
  const timelineElement = useRef<HTMLDivElement>(null);
  const timeline = useRef<Timeline | null>(null);
  const range = useMemo(() => {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }, [date]);
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
          const start = new Date(
            Math.max(
              new Date(booking.start_at).getTime(),
              range.start.getTime(),
            ),
          );
          const end = new Date(
            Math.min(new Date(booking.end_at).getTime(), range.end.getTime()),
          );
          return {
            id: booking.id,
            group: booking.room_id,
            content: booking.guest_name?.startsWith("TEST DATA")
              ? "DEMO"
              : booking.booking_code,
            start,
            end,
            className: `room-gantt-item room-gantt-${booking.status.toLowerCase()}`,
            title: `${booking.booking_code} · ${booking.guest_name || ""} · ${new Date(booking.start_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}–${new Date(booking.end_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${t(`status.${booking.status}`)}`,
          };
        })
        .filter(
          (item) =>
            new Date(item.start).getTime() < new Date(item.end!).getTime(),
        ),
    [bookings, range, rooms, t],
  );

  useEffect(() => {
    if (!timelineElement.current) return;
    const instance = new Timeline(timelineElement.current, items, groups, {
      start: range.start,
      end: range.end,
      min: range.start,
      max: range.end,
      zoomable: false,
      moveable: false,
      horizontalScroll: true,
      verticalScroll: true,
      selectable: false,
      stack: false,
      groupHeightMode: "fixed",
      orientation: "top",
      showCurrentTime: true,
      showMajorLabels: false,
      showMinorLabels: true,
      timeAxis: { scale: "hour", step: window.innerWidth <= 640 ? 4 : 2 },
      height: Math.max(180, rooms.length * 54 + 60),
      margin: { item: { horizontal: 2, vertical: 8 }, axis: 6 },
      tooltip: { followMouse: true, overflowMethod: "cap" },
      format: {
        minorLabels: { hour: "HH:mm" },
        majorLabels: { hour: "ddd D MMM" },
      },
    });
    timeline.current = instance;
    return () => {
      instance.destroy();
      timeline.current = null;
    };
  }, [groups, items, range, rooms.length]);

  useEffect(() => {
    timeline.current?.setWindow(range.start, range.end, { animation: false });
  }, [range]);

  return (
    <div
      className="room-booking-gantt"
      aria-label={t("bookingChart.ganttLabel")}
    >
      {rooms.length ? (
        <div ref={timelineElement} />
      ) : (
        <p className="muted gantt-empty">{t("bookingChart.noRooms")}</p>
      )}
    </div>
  );
}
