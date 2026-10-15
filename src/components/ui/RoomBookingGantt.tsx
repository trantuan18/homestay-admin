import { useEffect, useMemo, useRef, useCallback, useState } from "react";
import { Timeline } from "vis-timeline/standalone";
import type { DataGroup, DataItem } from "vis-timeline/standalone";
import { useTranslation } from "react-i18next";
import { Maximize2, Minimize2, Lock, Unlock } from "lucide-react";
import type { Booking, Room } from "../../types/api";
import "vis-timeline/styles/vis-timeline-graph2d.min.css";

const localDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
  const bookingsRef = useRef(bookings);
  bookingsRef.current = bookings;
  const onSelectBookingRef = useRef(onSelectBooking);
  onSelectBookingRef.current = onSelectBooking;

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lockToSearchRange, setLockToSearchRange] = useState(true);

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

  const items = useMemo<DataItem[]>(() => {
    const now = Date.now();
    return bookings
      .filter((booking) => rooms.some((room) => room.id === booking.room_id))
      .filter(
        (booking) =>
          !["CANCELLED", "EXPIRED", "NO_SHOW"].includes(booking.status),
      )
      .map((booking) => {
        const start = new Date(booking.start_at);
        const end = new Date(booking.end_at);

        // Classification rules requested by user:
        // 1. Cam: đã qua thời gian checkout và chưa dọn phòng
        // 2. Xanh lá: đã thanh toán
        // 3. Xám: chưa thanh toán
        const isPastCheckout = end.getTime() < now;
        const isUncleaned = booking.cleaning_status !== "CLEANED";

        let colorClass = "room-gantt-gray";
        let statusBadge = "Chưa thanh toán";
        let fullStatus = "Chưa thanh toán";

        if (isPastCheckout && isUncleaned) {
          colorClass = "room-gantt-orange";
          statusBadge = "Quá giờ & Chưa dọn";
          fullStatus = "Đã qua checkout & Chưa dọn phòng";
        } else if (booking.payment_status === "PAID") {
          colorClass = "room-gantt-green";
          statusBadge = "Đã thanh toán";
          fullStatus = "Đã thanh toán";
        } else {
          colorClass = "room-gantt-gray";
          statusBadge = "Chưa thanh toán";
          fullStatus = "Chưa thanh toán";
        }

        const guestText = booking.guest_name?.startsWith("TEST DATA")
          ? "DEMO"
          : (booking.guest_name || "");

        const contentHtml = `
          <div class="gantt-item-pill">
            <span class="gantt-item-code">${escapeHtml(booking.booking_code)}</span>
            ${guestText ? `<span class="gantt-item-guest">· ${escapeHtml(guestText)}</span>` : ""}
            <span class="gantt-item-tag">${escapeHtml(statusBadge)}</span>
          </div>
        `.trim();

        return {
          id: booking.id,
          group: booking.room_id,
          content: contentHtml,
          start,
          end,
          className: `room-gantt-item ${colorClass}`,
          title: `${booking.booking_code || ""} · ${guestText || "Khách"} · ${fullStatus} · ${start.toLocaleDateString("vi-VN")} – ${end.toLocaleDateString("vi-VN")}`,
        };
      })
      .filter(
        (item) =>
          new Date(item.start).getTime() < new Date(item.end!).getTime(),
      );
  }, [bookings, rooms]);

  // Interaction handlers
  const handlePan = useCallback(
    (direction: "left" | "right") => {
      if (!timeline.current) return;
      const windowRange = timeline.current.getWindow();
      const interval = windowRange.end.getTime() - windowRange.start.getTime();
      const step = interval * 0.35;
      const delta = direction === "left" ? -step : step;

      let newStart = new Date(windowRange.start.getTime() + delta);
      let newEnd = new Date(windowRange.end.getTime() + delta);

      if (lockToSearchRange) {
        if (newStart < range.start) {
          newStart = new Date(range.start);
          newEnd = new Date(
            Math.min(range.end.getTime(), range.start.getTime() + interval),
          );
        }
        if (newEnd > range.end) {
          newEnd = new Date(range.end);
          newStart = new Date(
            Math.max(range.start.getTime(), range.end.getTime() - interval),
          );
        }
      }

      timeline.current.setWindow(newStart, newEnd, {
        animation: { duration: 300, easingFunction: "easeInOutQuad" },
      });
    },
    [lockToSearchRange, range],
  );

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

    let targetStart = new Date(now.getTime() - half);
    let targetEnd = new Date(now.getTime() + half);

    if (lockToSearchRange) {
      if (now < range.start) {
        targetStart = new Date(range.start);
        targetEnd = new Date(
          Math.min(range.end.getTime(), range.start.getTime() + interval),
        );
      } else if (now > range.end) {
        targetEnd = new Date(range.end);
        targetStart = new Date(
          Math.max(range.start.getTime(), range.end.getTime() - interval),
        );
      } else {
        if (targetStart < range.start) {
          targetStart = new Date(range.start);
          targetEnd = new Date(
            Math.min(range.end.getTime(), range.start.getTime() + interval),
          );
        }
        if (targetEnd > range.end) {
          targetEnd = new Date(range.end);
          targetStart = new Date(
            Math.max(range.start.getTime(), range.end.getTime() - interval),
          );
        }
      }
    }

    timeline.current.setWindow(targetStart, targetEnd, {
      animation: { duration: 400, easingFunction: "easeInOutQuad" },
    });
  }, [lockToSearchRange, range]);

  const handleResetWindow = useCallback(() => {
    if (!timeline.current) return;
    timeline.current.setWindow(range.start, range.end, {
      animation: { duration: 400, easingFunction: "easeInOutQuad" },
    });
  }, [range]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Initialize Timeline once when container is mounted
  const hasRooms = rooms.length > 0;
  useEffect(() => {
    if (!timelineElement.current) return;
    const initialHeight = isFullscreen
      ? Math.max(300, window.innerHeight - 130)
      : Math.max(220, rooms.length * 56 + 70);

    const rangeDuration = Math.max(
      1000 * 60 * 60 * 2,
      range.end.getTime() - range.start.getTime() + 1000,
    );

    const instance = new Timeline(timelineElement.current, items, groups, {
      moveable: true,
      zoomable: true,
      horizontalScroll: true,
      verticalScroll: true,
      min: lockToSearchRange ? range.start : undefined,
      max: lockToSearchRange ? range.end : undefined,
      zoomMin: 1000 * 60 * 30,
      zoomMax: lockToSearchRange ? rangeDuration : 1000 * 60 * 60 * 24 * 180,
      selectable: true,
      stack: false,
      groupHeightMode: "fixed",
      orientation: "top",
      showCurrentTime: true,
      showMajorLabels: true,
      showMinorLabels: true,
      height: initialHeight,
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

    instance.setWindow(range.start, range.end, { animation: false });

    const triggerSelect = (selectedId: string | number | undefined) => {
      if (!selectedId || !onSelectBookingRef.current) return;
      const found = bookingsRef.current.find((b) => String(b.id) === String(selectedId));
      if (found) onSelectBookingRef.current(found);
    };

    instance.on("select", (properties) => {
      if (properties.items?.length) {
        triggerSelect(properties.items[0]);
      }
    });

    instance.on("click", (properties) => {
      if (properties.item) {
        triggerSelect(properties.item);
      }
    });

    timeline.current = instance;
    return () => {
      instance.destroy();
      timeline.current = null;
    };
  }, [hasRooms]);

  // Update items & groups without resetting viewport/zoom
  useEffect(() => {
    if (timeline.current) {
      timeline.current.setData({ items, groups });
    }
  }, [items, groups]);

  // Fullscreen height & overflow management
  useEffect(() => {
    if (!timeline.current) return;
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
      const fsHeight = Math.max(300, window.innerHeight - 130);
      timeline.current.setOptions({ height: fsHeight });
      setTimeout(() => {
        timeline.current?.redraw();
      }, 50);
    } else {
      document.body.style.overflow = "";
      const normalHeight = Math.max(220, rooms.length * 56 + 70);
      timeline.current.setOptions({ height: normalHeight });
      setTimeout(() => {
        timeline.current?.redraw();
      }, 50);
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen, rooms.length]);

  // Window resize handler (handles device rotation or window resizing)
  useEffect(() => {
    const handleResize = () => {
      if (!timeline.current) return;
      if (isFullscreen) {
        const fsHeight = Math.max(300, window.innerHeight - 130);
        timeline.current.setOptions({ height: fsHeight });
        timeline.current.redraw();
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isFullscreen]);

  // Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Update timeline boundaries & window when search date range or lock mode changes
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!timeline.current) return;

    const rangeDuration = Math.max(
      1000 * 60 * 60 * 2,
      range.end.getTime() - range.start.getTime() + 1000,
    );

    if (lockToSearchRange) {
      // Loosen bounds first to allow setWindow cleanly without range boundary conflict
      timeline.current.setOptions({
        min: undefined,
        max: undefined,
        zoomMax: 1000 * 60 * 60 * 24 * 365,
      });
      timeline.current.setWindow(range.start, range.end, {
        animation: { duration: 300, easingFunction: "easeInOutQuad" },
      });
      timeline.current.setOptions({
        min: range.start,
        max: range.end,
        zoomMax: rangeDuration,
        zoomMin: 1000 * 60 * 30,
      });
    } else {
      timeline.current.setOptions({
        min: undefined,
        max: undefined,
        zoomMax: 1000 * 60 * 60 * 24 * 180,
        zoomMin: 1000 * 60 * 30,
      });
    }
  }, [lockToSearchRange, range]);

  return (
    <div
      className={`room-booking-gantt ${isFullscreen ? "is-fullscreen" : ""}`}
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

            <div className="gantt-actions-right">
              <button
                type="button"
                className={`gantt-btn-lock ${lockToSearchRange ? "active" : ""}`}
                onClick={() => setLockToSearchRange((prev) => !prev)}
                title={
                  lockToSearchRange
                    ? "Mặc định: Giới hạn thu phóng trong khoảng thời gian tìm kiếm. Bấm để mở rộng tự do"
                    : "Đang mở rộng tự do. Bấm để giới hạn lại trong khoảng thời gian tìm kiếm"
                }
              >
                {lockToSearchRange ? <Lock size={13} /> : <Unlock size={13} />}
                <span>{lockToSearchRange ? "Khóa khoảng tìm kiếm" : "Mở rộng tự do"}</span>
              </button>

              <button
                type="button"
                className={`gantt-btn-fullscreen ${isFullscreen ? "active" : ""}`}
                onClick={toggleFullscreen}
                title={isFullscreen ? "Thu nhỏ (Esc)" : "Xem toàn màn hình (Hỗ trợ tốt di động)"}
              >
                {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                <span>{isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}</span>
              </button>
            </div>
          </div>

          <div className="gantt-legend-bar">
            <div className="gantt-legend-list">
              <span className="gantt-legend-title">Phân loại màu:</span>
              <div className="gantt-legend-item">
                <span className="gantt-legend-badge gantt-badge-gray" />
                <span className="gantt-legend-text">Xám: Chưa thanh toán</span>
              </div>
              <div className="gantt-legend-item">
                <span className="gantt-legend-badge gantt-badge-green" />
                <span className="gantt-legend-text">Xanh lá: Đã thanh toán</span>
              </div>
              <div className="gantt-legend-item">
                <span className="gantt-legend-badge gantt-badge-orange" />
                <span className="gantt-legend-text">Cam: Quá checkout & chưa dọn</span>
              </div>
            </div>
            <div className="gantt-scroll-hint">
              💡 Lướt chuột để xem timeline · Nhấp đơn để xem chi tiết
            </div>
          </div>

          <div ref={timelineElement} className="gantt-timeline-container" />
        </>
      ) : (
        <p className="muted gantt-empty">{t("bookingChart.noRooms")}</p>
      )}
    </div>
  );
}
