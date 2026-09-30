import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
import {
  bookingsApi,
  propertiesApi,
  roomsApi,
  usersApi,
} from "../dashboard/api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";

const getDefaultBookingForm = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(now.getHours() + 1, 0, 0, 0);
  const date = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
  return {
    user_id: "",
    property_id: "",
    room_id: "",
    booking_date: date,
    start_time: `${String(start.getHours()).padStart(2, "0")}:00`,
    duration_hours: 1,
    guest_count: 1,
    guest_name: "",
    guest_phone: "",
    guest_email: "",
    notes: "",
  };
};

export function BookingsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState(getDefaultBookingForm);
  const q = useQuery({
    queryKey: ["admin-bookings"],
    queryFn: () => bookingsApi.list({ offset: 0, limit: 50 }),
  });
  const updateStatus = useMutation({
    mutationFn: ({
      id,
      next,
    }: {
      id: string;
      next: Parameters<typeof bookingsApi.updateStatus>[1];
    }) => bookingsApi.updateStatus(id, next),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      toast.success(t("bookings.statusSaved"));
    },
    onError: () => toast.error(t("bookings.statusError")),
  });
  const users = useQuery({
    queryKey: ["admin-users-for-booking"],
    queryFn: () => usersApi.list({ offset: 0, limit: 100 }),
    enabled: createOpen,
  });
  const properties = useQuery({
    queryKey: ["admin-properties-for-booking"],
    queryFn: () => propertiesApi.list({ offset: 0, limit: 100 }),
    enabled: createOpen,
  });
  const rooms = useQuery({
    queryKey: ["admin-rooms-for-booking", bookingForm.property_id],
    queryFn: () =>
      roomsApi.list({
        offset: 0,
        limit: 100,
        property_id: bookingForm.property_id,
        status: "AVAILABLE",
      }),
    enabled: createOpen && Boolean(bookingForm.property_id),
  });
  const selectedProperty = properties.data?.data.find(
    (property) => property.id === bookingForm.property_id,
  );
  const selectedRoom = rooms.data?.data.find(
    (room) => room.id === bookingForm.room_id,
  );
  const intervalMinutes = selectedProperty?.booking_interval_minutes || 60;
  const minimumMinutes =
    selectedProperty?.minimum_booking_minutes || intervalMinutes;
  const maximumMinutes = selectedProperty?.maximum_booking_minutes || 24 * 60;
  const minimumHours = minimumMinutes / 60;
  const maximumHours = maximumMinutes / 60;
  const durationStepHours = intervalMinutes / 60;
  const createBooking = useMutation({
    mutationFn: () => {
      const start = new Date(
        `${bookingForm.booking_date}T${bookingForm.start_time}:00`,
      );
      const end = new Date(
        start.getTime() + bookingForm.duration_hours * 60 * 60 * 1000,
      );
      return bookingsApi.create({
        user_id: bookingForm.user_id,
        room_id: bookingForm.room_id,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        guest_count: bookingForm.guest_count,
        guest_name: bookingForm.guest_name || undefined,
        guest_phone: bookingForm.guest_phone || undefined,
        guest_email: bookingForm.guest_email || undefined,
        notes: bookingForm.notes || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      setCreateOpen(false);
      setBookingForm(getDefaultBookingForm());
      toast.success(t("bookings.created"));
    },
    onError: () => toast.error(t("bookings.createError")),
  });
  const data = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (q.data?.data || []).filter(
      (booking) =>
        (!status || booking.status === status) &&
        (!term ||
          [booking.booking_code, booking.guest_name, booking.guest_email].some(
            (value) => value?.toLowerCase().includes(term),
          )),
    );
  }, [q.data, search, status]);
  const submitBooking = (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !bookingForm.user_id ||
      !bookingForm.property_id ||
      !bookingForm.room_id ||
      !bookingForm.booking_date ||
      !bookingForm.start_time ||
      !Number.isFinite(bookingForm.duration_hours) ||
      bookingForm.duration_hours <= 0
    ) {
      toast.error(t("bookings.required"));
      return;
    }
    const durationMinutes = bookingForm.duration_hours * 60;
    const [startHour, startMinute] = bookingForm.start_time
      .split(":")
      .map(Number);
    const startMinutes = startHour * 60 + startMinute;
    if (startMinutes % intervalMinutes !== 0) {
      toast.error(
        t("bookings.startTimeInvalid", { interval: intervalMinutes }),
      );
      return;
    }
    if (
      durationMinutes < minimumMinutes ||
      durationMinutes > maximumMinutes ||
      durationMinutes % intervalMinutes !== 0
    ) {
      toast.error(
        t("bookings.durationInvalid", {
          min: minimumHours,
          max: maximumHours,
          interval: durationStepHours,
        }),
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
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">{t("common.all")}</option>
            <option value="PENDING">PENDING</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CHECKED_IN">CHECKED_IN</option>
            <option value="CHECKED_OUT">CHECKED_OUT</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
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
                <th>{t("table.payment")}</th>
                <th>{t("table.total")}</th>
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
                      <StatusBadge status={b.status} />
                      <select
                        aria-label={t("bookings.changeStatus")}
                        value={b.status}
                        disabled={updateStatus.isPending}
                        onChange={(event) =>
                          updateStatus.mutate({
                            id: b.id,
                            next: event.target.value as Parameters<
                              typeof bookingsApi.updateStatus
                            >[1],
                          })
                        }
                      >
                        {[
                          "PENDING",
                          "CONFIRMED",
                          "CHECKED_IN",
                          "CHECKED_OUT",
                          "CANCELLED",
                          "EXPIRED",
                          "NO_SHOW",
                        ].map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <StatusBadge status={b.payment_status} />
                    </td>
                    <td>{new Intl.NumberFormat("vi-VN").format(b.total)} ₫</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="empty-cell">
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
              disabled={createBooking.isPending}
            >
              {createBooking.isPending ? t("common.loading") : t("common.save")}
            </button>
          </>
        }
      >
        {users.isLoading ||
        properties.isLoading ||
        (Boolean(bookingForm.property_id) && rooms.isLoading) ? (
          <Loading />
        ) : users.isError ? (
          <ErrorState error={users.error} onRetry={() => users.refetch()} />
        ) : properties.isError ? (
          <ErrorState
            error={properties.error}
            onRetry={() => properties.refetch()}
          />
        ) : bookingForm.property_id && rooms.isError ? (
          <ErrorState error={rooms.error} onRetry={() => rooms.refetch()} />
        ) : (
          <form
            id="booking-create-form"
            className="form-grid"
            onSubmit={submitBooking}
          >
            <label>
              <span>{t("table.guest")}</span>
              <select
                value={bookingForm.user_id}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    user_id: event.target.value,
                  })
                }
              >
                <option value="">{t("bookings.selectUser")}</option>
                {(users.data?.data || []).map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email || user.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("form.property")}</span>
              <select
                value={bookingForm.property_id}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    property_id: event.target.value,
                    room_id: "",
                  })
                }
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
              <span>{t("table.room")}</span>
              <select
                value={bookingForm.room_id}
                disabled={!bookingForm.property_id || rooms.isLoading}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    room_id: event.target.value,
                  })
                }
              >
                <option value="">{t("bookings.selectRoom")}</option>
                {(rooms.data?.data || []).map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} ·{" "}
                    {new Intl.NumberFormat("vi-VN").format(
                      room.base_hourly_price,
                    )}{" "}
                    ₫/{t("common.hourShort")}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("bookings.bookingDate")}</span>
              <input
                type="date"
                value={bookingForm.booking_date}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    booking_date: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>{t("bookings.startTime")}</span>
              <input
                type="time"
                step={intervalMinutes * 60}
                value={bookingForm.start_time}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    start_time: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>{t("bookings.durationHours")}</span>
              <input
                type="number"
                min={minimumHours}
                max={maximumHours}
                step={durationStepHours}
                value={bookingForm.duration_hours}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    duration_hours: Number(event.target.value),
                  })
                }
              />
            </label>
            <div className="span-2 muted booking-duration-hint">
              {selectedProperty && (
                <span>
                  {t("bookings.durationLimits", {
                    min: minimumHours,
                    max: maximumHours,
                    interval: durationStepHours,
                  })}
                </span>
              )}
              {selectedRoom && (
                <b>
                  {t("bookings.estimatedPrice", {
                    amount: new Intl.NumberFormat("vi-VN").format(
                      selectedRoom.base_hourly_price *
                        bookingForm.duration_hours,
                    ),
                  })}
                </b>
              )}
            </div>
            <label>
              <span>{t("bookings.guestCount")}</span>
              <input
                type="number"
                min="1"
                value={bookingForm.guest_count}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    guest_count: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              <span>{t("form.name")}</span>
              <input
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
              <span>{t("table.email")}</span>
              <input
                type="email"
                value={bookingForm.guest_email}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    guest_email: event.target.value,
                  })
                }
              />
            </label>
            <label>
              <span>{t("bookings.phone")}</span>
              <input
                value={bookingForm.guest_phone}
                onChange={(event) =>
                  setBookingForm({
                    ...bookingForm,
                    guest_phone: event.target.value,
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
          </form>
        )}
      </Modal>
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
