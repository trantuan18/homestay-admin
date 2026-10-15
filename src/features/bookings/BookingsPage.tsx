import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Plus, Eye, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { BookingReceiptModal } from "./BookingReceiptModal";
import {
  bookingsApi,
  paymentsApi,
  propertiesApi,
  roomsApi,
} from "../dashboard/api";
import { apiError } from "../../services/http";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";
import type { Booking } from "../../types/api";

const formatDateOnly = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const getTodayStr = () => formatDateOnly(new Date());
const getTomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDateOnly(d);
};

const toDateTimeInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
const parseDateTimeInput = (value: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};
const getDefaultBookingForm = () => {
  const start = new Date();
  start.setHours(start.getHours() + 1, 0, 0, 0);
  return {
    property_id: "",
    room_id: "",
    start_at: toDateTimeInput(start),
    end_at: "",
    guest_count: 1,
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    notes: "",
  };
};

const FORWARD_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["PENDING", "CONFIRMED", "CANCELLED"],
  CONFIRMED: ["CONFIRMED", "CHECKED_IN", "CANCELLED", "NO_SHOW"],
  CHECKED_IN: ["CHECKED_IN", "CHECKED_OUT", "CANCELLED"],
  CHECKED_OUT: ["CHECKED_OUT"],
  CANCELLED: ["CANCELLED"],
  EXPIRED: ["EXPIRED"],
  NO_SHOW: ["NO_SHOW"],
};

const getAvailableStatusOptions = (currentStatus: string) => {
  return FORWARD_STATUS_TRANSITIONS[currentStatus] || [currentStatus];
};

const isStatusTerminal = (status: string) => {
  const allowed = FORWARD_STATUS_TRANSITIONS[status];
  return !allowed || allowed.length <= 1;
};

export function BookingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const statusWrapRef = useRef<HTMLDivElement>(null);
  const [from, setFrom] = useState(getTodayStr);
  const [to, setTo] = useState(getTomorrowStr);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [receiptBooking, setReceiptBooking] = useState<Booking | null>(null);
  const [bookingForm, setBookingForm] = useState(getDefaultBookingForm);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        statusWrapRef.current &&
        !statusWrapRef.current.contains(e.target as Node)
      ) {
        setStatusDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getStatusReason = (nextStatus: string) => {
    if (nextStatus === "CANCELLED") return "Booking cancelled by admin";
    if (nextStatus === "NO_SHOW") return "Guest no-show";
    if (nextStatus === "EXPIRED") return "Booking expired";
    if (nextStatus === "CHECKED_IN") return "Checked in";
    if (nextStatus === "CHECKED_OUT") return "Checked out";
    return "Admin status update";
  };

  const statusParam =
    selectedStatuses.length > 0 ? selectedStatuses.join(",") : undefined;

  const q = useQuery({
    queryKey: ["admin-bookings", from, to, statusParam],
    queryFn: () =>
      bookingsApi.list({
        offset: 0,
        limit: 100,
        from: from || undefined,
        to: to || undefined,
        status: statusParam,
      }),
  });
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
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      setDetailBooking((current) =>
        current && current.id === variables.id
          ? { ...current, status: variables.next }
          : current,
      );
      toast.success(t("bookings.statusSaved"));
    },
    onError: (error) =>
      toast.error(`${t("bookings.statusError")} ${apiError(error)}`),
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

      // If marked as PAID and booking was PENDING, auto confirm
      if (next === "PAID" && currentBookingStatus === "PENDING") {
        try {
          await bookingsApi.updateStatus(id, "CONFIRMED", "Tự động xác nhận sau khi thanh toán");
        } catch {
          // Handled or already auto-confirmed by backend
        }
      }

      return res;
    },
    onSuccess: (_, variables) => {
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
          ? "Đã thanh toán & tự động xác nhận đơn đặt phòng (CONFIRMED)"
          : (t("payments.saved") || "Đã cập nhật trạng thái thanh toán"),
      );
    },
    onError: (error) =>
      toast.error(`${t("payments.saveError") || "Lỗi lưu thanh toán:"} ${apiError(error)}`),
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
  const properties = useQuery({
    queryKey: ["admin-properties-for-booking"],
    queryFn: () => propertiesApi.list({ offset: 0, limit: 100, status: "ACTIVE" }),
    staleTime: 60_000,
  });
  const allRooms = useQuery({
    queryKey: ["admin-all-rooms-for-booking"],
    queryFn: () =>
      roomsApi.list({
        offset: 0,
        limit: 100,
        status: "AVAILABLE",
      }),
    staleTime: 60_000,
  });

  const availableRooms = useMemo(() => {
    if (!bookingForm.property_id) return [];
    return (allRooms.data?.data || []).filter(
      (room) => room.property_id === bookingForm.property_id,
    );
  }, [allRooms.data?.data, bookingForm.property_id]);

  useEffect(() => {
    if (!createOpen) return;
    if (!bookingForm.property_id && properties.data?.data?.length) {
      const firstProp =
        properties.data.data.find((p) => p.status === "ACTIVE") ||
        properties.data.data[0];
      if (firstProp) {
        const firstRoom = (allRooms.data?.data || []).find(
          (r) => r.property_id === firstProp.id,
        );
        setBookingForm((prev) => ({
          ...prev,
          property_id: firstProp.id,
          room_id: firstRoom ? firstRoom.id : prev.room_id,
        }));
      }
    }
  }, [createOpen, properties.data, allRooms.data, bookingForm.property_id]);

  useEffect(() => {
    if (!bookingForm.property_id || !availableRooms.length) return;
    setBookingForm((current) => {
      if (
        !current.room_id ||
        !availableRooms.some((r) => r.id === current.room_id)
      ) {
        return { ...current, room_id: availableRooms[0].id };
      }
      return current;
    });
  }, [bookingForm.property_id, availableRooms]);

  const selectedProperty = properties.data?.data.find(
    (property) => property.id === bookingForm.property_id,
  );
  const startDate = parseDateTimeInput(bookingForm.start_at);
  const endDate = parseDateTimeInput(bookingForm.end_at);

  const canCalculatePrice =
    Boolean(bookingForm.room_id) &&
    Boolean(bookingForm.start_at) &&
    Boolean(bookingForm.end_at) &&
    Boolean(startDate) &&
    Boolean(endDate) &&
    startDate! < endDate! &&
    bookingForm.guest_count > 0;

  const priceEstimate = useQuery({
    queryKey: [
      "booking-price-estimate",
      bookingForm.room_id,
      bookingForm.start_at,
      bookingForm.end_at,
      bookingForm.guest_count,
    ],
    queryFn: () =>
      bookingsApi.calculatePrice({
        room_id: bookingForm.room_id,
        start_at: new Date(bookingForm.start_at).toISOString(),
        end_at: new Date(bookingForm.end_at).toISOString(),
        guest_count: bookingForm.guest_count,
      }),
    enabled: createOpen && canCalculatePrice,
    staleTime: 10_000,
  });

  const createBooking = useMutation({
    mutationFn: () => {
      return bookingsApi.create({
        room_id: bookingForm.room_id,
        start_at: new Date(bookingForm.start_at).toISOString(),
        end_at: new Date(bookingForm.end_at).toISOString(),
        guest_count: bookingForm.guest_count,
        guest_name: bookingForm.guest_name || undefined,
        guest_phone: bookingForm.guest_phone || undefined,
        guest_email: bookingForm.guest_email || undefined,
        notes: bookingForm.notes || undefined,
      });
    },
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      setCreateOpen(false);
      setBookingForm(getDefaultBookingForm());
      const total = response?.data?.total;
      toast.success(
        typeof total === "number"
          ? t("bookings.createdWithTotal", {
              amount: new Intl.NumberFormat("vi-VN").format(total),
            })
          : t("bookings.created"),
      );
    },
    onError: (error) =>
      toast.error(`${t("bookings.createError")} ${apiError(error)}`),
  });
  const data = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (q.data?.data || []).filter(
      (booking) =>
        (!term ||
          [booking.booking_code, booking.guest_name, booking.guest_email].some(
            (value) => value?.toLowerCase().includes(term),
          )),
    );
  }, [q.data, search]);
  const submitBooking = (event: React.FormEvent) => {
    event.preventDefault();

    const startAt = new Date(bookingForm.start_at);
    const endAt = new Date(bookingForm.end_at);

    if (
      !bookingForm.property_id ||
      !bookingForm.room_id ||
      !bookingForm.start_at ||
      !bookingForm.end_at ||
      Number.isNaN(startAt.getTime()) ||
      Number.isNaN(endAt.getTime()) ||
      startAt >= endAt
    ) {
      toast.error(t("bookings.required"));
      return;
    }

    if (
      !Number.isInteger(bookingForm.guest_count) ||
      bookingForm.guest_count <= 0
    ) {
      toast.error(
        t("bookings.guestCount") || "Guest count must be a positive integer",
      );
      return;
    }

    createBooking.mutate();
  };
  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  return (
    <>
      <PageHead title={t("nav.bookings")} desc={t("management.bookingsDesc")} />
      <div className="panel">
        <div className="toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("common.search")}
          />
          <label className="booking-date-filter">
            <span>{t("bookings.fromDate")}</span>
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="booking-date-filter">
            <span>{t("bookings.toDate")}</span>
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          <div className="status-multiselect-wrap" ref={statusWrapRef}>
            <button
              type="button"
              className="status-multiselect-btn"
              onClick={() => setStatusDropdownOpen((open) => !open)}
            >
              <span>
                {selectedStatuses.length === 0
                  ? "Trạng thái: Tất cả"
                  : `Trạng thái: ${selectedStatuses.length} đã chọn`}
              </span>
              <span style={{ fontSize: 10, color: "var(--color-muted)" }}>▼</span>
            </button>
            {statusDropdownOpen && (
              <div className="status-multiselect-dropdown">
                <label
                  className={`status-option-item ${selectedStatuses.length === 0 ? "active" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.length === 0}
                    onChange={() => setSelectedStatuses([])}
                  />
                  <span>Tất cả (All)</span>
                </label>
                <div className="status-dropdown-divider" />
                {[
                  "PENDING",
                  "CONFIRMED",
                  "CHECKED_IN",
                  "CHECKED_OUT",
                  "CANCELLED",
                  "EXPIRED",
                  "NO_SHOW",
                ].map((st) => {
                  const isChecked = selectedStatuses.includes(st);
                  return (
                    <label
                      key={st}
                      className={`status-option-item ${isChecked ? "active" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setSelectedStatuses(
                              selectedStatuses.filter((s) => s !== st),
                            );
                          } else {
                            setSelectedStatuses([...selectedStatuses, st]);
                          }
                        }}
                      />
                      <StatusBadge status={st} />
                    </label>
                  );
                })}
              </div>
            )}
          </div>
          <button className="primary" onClick={() => setCreateOpen(true)}>
            <Plus size={17} />
            {t("dashboard.createBooking")}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("table.booking")}</th>
                <th>{t("table.guest")}</th>
                <th>{t("table.time")}</th>
                <th>{t("common.status")}</th>
                <th>Dọn phòng</th>
                <th>{t("table.payment")}</th>
                <th>{t("table.total")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.length ? (
                data.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <b>{b.booking_code}</b>
                    </td>
                    <td>{b.guest_name || "—"}</td>
                    <td>{new Date(b.start_at).toLocaleString()}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div>
                          <StatusBadge status={b.status} />
                        </div>
                        <select
                          aria-label={t("bookings.changeStatus")}
                          value={b.status}
                          disabled={updateStatus.isPending || isStatusTerminal(b.status)}
                          className="status-inline-select"
                          onChange={(event) =>
                            updateStatus.mutate({
                              id: b.id,
                              next: event.target.value as Parameters<
                                typeof bookingsApi.updateStatus
                              >[1],
                              reason: getStatusReason(event.target.value),
                            })
                          }
                        >
                          {getAvailableStatusOptions(b.status).map((value) => (
                            <option key={value} value={value}>
                              {t(`status.${value}`, value)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div>
                          {b.cleaning_status === "CLEANED" ? (
                            <span
                              className="badge badge-success"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600 }}
                            >
                              <CheckCircle2 size={12} /> Đã dọn
                            </span>
                          ) : (
                            <span
                              className="badge badge-warning"
                              style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600 }}
                            >
                              <AlertCircle size={12} /> Chưa dọn
                            </span>
                          )}
                        </div>
                        <select
                          aria-label="Đổi trạng thái dọn phòng"
                          value={b.cleaning_status || "UNCLEANED"}
                          disabled={updateCleaningStatus.isPending}
                          className="status-inline-select"
                          onChange={(event) =>
                            updateCleaningStatus.mutate({
                              id: b.id,
                              cleaning_status: event.target.value as "UNCLEANED" | "CLEANED",
                            })
                          }
                        >
                          <option value="UNCLEANED">Chưa dọn</option>
                          <option value="CLEANED">Đã dọn</option>
                        </select>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <div>
                          <StatusBadge status={b.payment_status} />
                        </div>
                        <select
                          aria-label="Đổi trạng thái thanh toán"
                          value={b.payment_status}
                          disabled={updatePaymentStatus.isPending}
                          className="status-inline-select"
                          onChange={(event) => {
                            const next = event.target.value as
                              | "UNPAID"
                              | "PARTIAL"
                              | "PAID"
                              | "FAILED"
                              | "REFUNDED";
                            if (next === b.payment_status) return;
                            let payAmount: number | undefined = b.total;
                            if (next === "PARTIAL") {
                              const input = window.prompt(
                                "Nhập số tiền đã thanh toán (₫):",
                                String(Math.round(b.total / 2)),
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
                              id: b.id,
                              next,
                              amount: payAmount,
                              currentBookingStatus: b.status,
                            });
                          }}
                        >
                          {[
                            "UNPAID",
                            "PARTIAL",
                            "PAID",
                            "REFUNDED",
                            "FAILED",
                          ].map((value) => (
                            <option key={value} value={value}>
                              {t(`status.${value}`, value)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td>{new Intl.NumberFormat("vi-VN").format(b.total)} ₫</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button
                          className="ghost icon-btn"
                          onClick={() => setDetailBooking(b)}
                          title={t("common.viewAll")}
                        >
                          <Eye size={15} />
                        </button>
                        <button
                          className="ghost icon-btn"
                          onClick={() => setReceiptBooking(b)}
                          title="Xuất biên lai"
                          style={{ color: "var(--color-primary)" }}
                        >
                          <FileText size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="empty-cell">
                    {t("common.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("bookings.createTitle")}
        description={t("management.bookingsDesc")}
        footer={
          <>
            <button className="ghost" onClick={() => setCreateOpen(false)}>
              {t("common.cancel")}
            </button>
            <button
              className="primary"
              form="booking-create-form"
              disabled={createBooking.isPending || !bookingForm.end_at}
            >
              {createBooking.isPending ? t("common.loading") : t("common.save")}
            </button>
          </>
        }
      >
        {properties.isLoading || allRooms.isLoading ? (
          <Loading />
        ) : properties.isError ? (
          <ErrorState
            error={properties.error}
            onRetry={() => properties.refetch()}
          />
        ) : allRooms.isError ? (
          <ErrorState error={allRooms.error} onRetry={() => allRooms.refetch()} />
        ) : (
          <form
            id="booking-create-form"
            className="form-grid"
            onSubmit={submitBooking}
          >
            <label>
              <span>{t("form.property")}</span>
              <select
                value={bookingForm.property_id}
                onChange={(event) => {
                  const nextPropId = event.target.value;
                  const nextRooms = (allRooms.data?.data || []).filter(
                    (room) => room.property_id === nextPropId,
                  );
                  setBookingForm({
                    ...bookingForm,
                    property_id: nextPropId,
                    room_id: nextRooms[0]?.id || "",
                  });
                }}
              >
                <option value="">{t("form.selectProperty")}</option>
                {(properties.data?.data || [])
                  .filter((property) => property.status === "ACTIVE")
                  .map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>{t("table.room", "Phòng")}</span>
              <select
                value={bookingForm.room_id}
                disabled={!bookingForm.property_id || allRooms.isLoading}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    room_id: event.target.value,
                  })
                }
              >
                <option value="">{t("bookings.selectRoom", "Chọn phòng")}</option>
                {availableRooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("bookings.startAt")}</span>
              <DatePicker
                selected={startDate}
                onChange={(date: Date | null) =>
                  setBookingForm({
                    ...bookingForm,
                    start_at: date ? toDateTimeInput(date) : "",
                  })
                }
                selectsStart
                startDate={startDate}
                endDate={endDate}
                maxDate={endDate ?? undefined}
                showTimeSelect
                timeIntervals={selectedProperty?.booking_interval_minutes || 60}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText={t("bookings.startAt")}
                className="booking-datetime-picker"
                isClearable
              />
            </label>
            <label>
              <span>{t("bookings.endAt")}</span>
              <DatePicker
                selected={endDate}
                onChange={(date: Date | null) =>
                  setBookingForm({
                    ...bookingForm,
                    end_at: date ? toDateTimeInput(date) : "",
                  })
                }
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate ?? undefined}
                showTimeSelect
                timeIntervals={selectedProperty?.booking_interval_minutes || 60}
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText={t("bookings.endAt")}
                className="booking-datetime-picker"
                isClearable
              />
            </label>
            <label>
              <span>{t("bookings.guestCount")}</span>
              <input
                type="number"
                min="1"
                value={bookingForm.guest_count}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    guest_count: Math.max(1, Number(event.target.value) || 1),
                  })
                }
              />
            </label>
            <label>
              <span>{t("form.name")}</span>
              <input
                placeholder="Tùy chọn"
                value={bookingForm.guest_name}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    guest_name: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>{t("bookings.phone")}</span>
              <input
                placeholder="Tùy chọn"
                value={bookingForm.guest_phone}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    guest_phone: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>{t("table.email")}</span>
              <input
                type="email"
                placeholder="Tùy chọn"
                value={bookingForm.guest_email}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    guest_email: event.target.value,
                  })
                }
              />
            </label>
            <label className="span-2">
              <span>{t("bookings.notes")}</span>
              <textarea
                rows={2}
                value={bookingForm.notes}
                onChange={(event) =>
                  setBookingForm({ ...bookingForm, notes: event.target.value })
                }
              />
            </label>
            <div className="span-2 price-estimate-card">
              {!canCalculatePrice ? (
                <div className="price-estimate-placeholder">
                  <span>💡 Vui lòng chọn thời gian bắt đầu, kết thúc và số lượng khách để xem số tiền tạm tính</span>
                </div>
              ) : priceEstimate.isLoading ? (
                <div className="price-estimate-loading">
                  <span>Đang tính số tiền tạm tính theo bảng giá...</span>
                </div>
              ) : priceEstimate.isError ? (
                <div className="price-estimate-error">
                  <span>Không thể tính giá tạm tính ({apiError(priceEstimate.error)})</span>
                </div>
              ) : priceEstimate.data?.data ? (
                (() => {
                  const p = priceEstimate.data.data;
                  const standardCount = p.standard_guest_count ?? 2;
                  const extraCount = p.extra_guest_count ?? Math.max(0, bookingForm.guest_count - standardCount);
                  const extraFee = p.extra_guest_fee ?? 0;
                  const roomPrice = p.room_price ?? p.subtotal;

                  return (
                    <div className="price-breakdown-container">
                      <div className="price-estimate-header">
                        <span className="price-breakdown-title">Chi tiết các khoản phí:</span>
                        {p.pricing_rule_name && (
                          <span className="price-estimate-badge">
                            {p.pricing_rule_name}
                          </span>
                        )}
                      </div>

                      <div className="price-breakdown-list">
                        <div className="price-breakdown-item">
                          <span className="price-item-label">
                            • Tiền phòng ({Math.round((p.duration_minutes / 60) * 10) / 10} giờ):
                          </span>
                          <span className="price-item-value">
                            {new Intl.NumberFormat("vi-VN").format(roomPrice)} ₫
                          </span>
                        </div>

                        <div className="price-breakdown-item">
                          <span className="price-item-label">
                            • Phụ thu khách thêm
                            {extraCount > 0 ? (
                              <span className="price-item-sub">
                                ({extraCount} khách, từ người thứ {standardCount + 1}):
                              </span>
                            ) : (
                              <span className="price-item-sub">
                                (tiêu chuẩn {standardCount} khách):
                              </span>
                            )}
                          </span>
                          <span
                            className="price-item-value"
                            style={{
                              color: extraFee > 0 ? "var(--color-warning)" : "var(--color-muted)",
                            }}
                          >
                            {extraFee > 0
                              ? `+${new Intl.NumberFormat("vi-VN").format(extraFee)} ₫`
                              : "0 ₫"}
                          </span>
                        </div>

                        {Number(p.holiday_surcharge) > 0 && (
                          <div className="price-breakdown-item">
                            <span className="price-item-label">• Phụ thu lễ tết:</span>
                            <span className="price-item-value">
                              +{new Intl.NumberFormat("vi-VN").format(p.holiday_surcharge!)} ₫
                            </span>
                          </div>
                        )}

                        {Number(p.discount) > 0 && (
                          <div className="price-breakdown-item">
                            <span className="price-item-label">• Giảm giá:</span>
                            <span className="price-item-value" style={{ color: "var(--color-success)" }}>
                              -{new Intl.NumberFormat("vi-VN").format(p.discount)} ₫
                            </span>
                          </div>
                        )}

                        {Number(p.tax) > 0 && (
                          <div className="price-breakdown-item">
                            <span className="price-item-label">• Thuế / Phí:</span>
                            <span className="price-item-value">
                              +{new Intl.NumberFormat("vi-VN").format(p.tax)} ₫
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="price-breakdown-total-row">
                        <div>
                          <div className="price-total-label">Tổng cộng tạm tính:</div>
                          <div className="price-total-sub">
                            Thời gian: {Math.round((p.duration_minutes / 60) * 10) / 10} giờ ({p.duration_minutes} phút) · Tổng {bookingForm.guest_count} khách
                          </div>
                        </div>
                        <div className="price-estimate-amount">
                          {new Intl.NumberFormat("vi-VN").format(p.total)} {p.currency || "₫"}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </div>
          </form>
        )}
      </Modal>

      {/* BOOKING DETAIL MODAL */}
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
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <button
              type="button"
              className="primary"
              onClick={() => setReceiptBooking(detailBooking)}
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <FileText size={16} /> Xuất biên lai
            </button>
            <button className="ghost" onClick={() => setDetailBooking(null)}>
              {t("common.cancel")}
            </button>
          </div>
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
                    aria-label={t("bookings.changeStatus")}
                    value={detailBooking.status}
                    disabled={updateStatus.isPending || isStatusTerminal(detailBooking.status)}
                    className="status-inline-select"
                    onChange={(event) =>
                      updateStatus.mutate({
                        id: detailBooking.id,
                        next: event.target.value as Parameters<
                          typeof bookingsApi.updateStatus
                        >[1],
                        reason: getStatusReason(event.target.value),
                      })
                    }
                  >
                    {getAvailableStatusOptions(detailBooking.status).map((value) => (
                      <option key={value} value={value}>
                        {t(`status.${value}`, value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
                    {[
                      "UNPAID",
                      "PARTIAL",
                      "PAID",
                      "REFUNDED",
                      "FAILED",
                    ].map((value) => (
                      <option key={value} value={value}>
                        {t(`status.${value}`, value)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
                      <CheckCircle2 size={13} /> Đã dọn phòng
                    </span>
                  ) : (
                    <span
                      className="badge badge-warning"
                      style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
                    >
                      <AlertCircle size={13} /> Chưa dọn phòng
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
                  Số lượng khách
                </p>
                <b>{detailBooking.guest_count} khách</b>
                {detailBooking.created_at && (
                  <div style={{ fontSize: "0.85rem", color: "var(--color-muted)" }}>
                    Tạo lúc: {new Date(detailBooking.created_at).toLocaleString()}
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                borderTop: "1px solid var(--color-border)",
                paddingTop: "0.75rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
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

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "4px" }}>
                <span>• Tiền phòng cơ bản:</span>
                <span>
                  {new Intl.NumberFormat("vi-VN").format(
                    detailBooking.price_breakdown?.room_price !== undefined
                      ? detailBooking.price_breakdown.room_price
                      : (detailBooking.subtotal || detailBooking.total) -
                          (detailBooking.price_breakdown?.extra_guest_fee || 0),
                  )}{" "}
                  ₫
                </span>
              </div>

              {Number(detailBooking.price_breakdown?.extra_guest_fee || 0) > 0 ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.9rem",
                    marginBottom: "4px",
                    color: "var(--color-warning)",
                  }}
                >
                  <span>
                    • Phụ thu khách thêm ({detailBooking.price_breakdown?.extra_guest_count} khách, từ người thứ{" "}
                    {(detailBooking.price_breakdown?.standard_guest_count ?? 2) + 1}):
                  </span>
                  <span>
                    +{new Intl.NumberFormat("vi-VN").format(detailBooking.price_breakdown!.extra_guest_fee!)} ₫
                  </span>
                </div>
              ) : detailBooking.guest_count > 2 ? (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "0.9rem",
                    marginBottom: "4px",
                    color: "var(--color-warning)",
                  }}
                >
                  <span>
                    • Phụ thu khách thêm ({detailBooking.guest_count - 2} khách, từ người thứ 3):
                  </span>
                  <span>
                    +{new Intl.NumberFormat("vi-VN").format((detailBooking.guest_count - 2) * 100000)} ₫
                  </span>
                </div>
              ) : null}

              {Number(detailBooking.discount) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "4px", color: "var(--color-success)" }}>
                  <span>• Giảm giá:</span>
                  <span>-{new Intl.NumberFormat("vi-VN").format(detailBooking.discount)} ₫</span>
                </div>
              )}

              {Number(detailBooking.tax) > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", marginBottom: "4px" }}>
                  <span>• Thuế / Phí dịch vụ:</span>
                  <span>+{new Intl.NumberFormat("vi-VN").format(detailBooking.tax)} ₫</span>
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
                <span>Tổng cộng:</span>
                <span style={{ color: "var(--color-text)" }}>
                  {new Intl.NumberFormat("vi-VN").format(detailBooking.total)} ₫
                </span>
              </div>
            </div>

            {detailBooking.notes && (
              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "0.75rem" }}>
                <p className="muted" style={{ margin: "0 0 4px", fontSize: "0.8rem" }}>
                  Ghi chú
                </p>
                <p style={{ margin: 0, fontSize: "0.85rem" }}>{detailBooking.notes}</p>
              </div>
            )}
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
function PageHead({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">{title.toUpperCase()}</p>
        <h1>{title}</h1>
        <p className="muted">{desc}</p>
      </div>
    </div>
  );
}
