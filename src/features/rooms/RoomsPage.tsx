import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Eye, Pencil, Plus } from "lucide-react";
import { roomsApi, propertiesApi } from "../dashboard/api";
import { roomsCrudApi, type RoomPayload } from "./api";
import type { Room } from "../../types/api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";

const emptyForm: RoomPayload = {
  name: "",
  slug: "",
  description: "",
  capacity: 2,
  base_hourly_price: 0,
  base_daily_price: 0,
  status: "AVAILABLE",
};

export function RoomsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [detailTab, setDetailTab] = useState<"images" | "pricing" | "blocked">(
    "images",
  );
  const [propertyId, setPropertyId] = useState("");
  const [form, setForm] = useState<RoomPayload>(emptyForm);
  const q = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: () => roomsApi.list({ offset: 0, limit: 50 }),
  });
  const properties = useQuery({
    queryKey: ["admin-properties-for-room"],
    queryFn: () => propertiesApi.list({ offset: 0, limit: 100 }),
    enabled: open,
  });
  const detail = useQuery({
    queryKey: ["admin-room-detail", detailRoom?.id],
    queryFn: () => roomsCrudApi.detail(detailRoom!.id),
    enabled: Boolean(detailRoom),
  });
  const create = useMutation({
    mutationFn: () =>
      editingRoom
        ? roomsCrudApi.update(editingRoom.id, form)
        : roomsCrudApi.create(propertyId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
      setOpen(false);
      setPropertyId("");
      setEditingRoom(null);
      setForm(emptyForm);
      toast.success(t("rooms.saved"));
    },
    onError: () => toast.error(t("rooms.saveError")),
  });
  const startCreate = () => {
    setEditingRoom(null);
    setPropertyId("");
    setForm(emptyForm);
    setOpen(true);
  };
  const startEdit = (room: Room) => {
    setEditingRoom(room);
    setPropertyId(room.property_id);
    setForm({
      name: room.name,
      slug: room.slug,
      description: room.description || "",
      capacity: room.capacity,
      base_hourly_price: room.base_hourly_price,
      base_daily_price: room.base_daily_price,
      status: room.status,
    });
    setOpen(true);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (
      (!propertyId && !editingRoom) ||
      !form.name.trim() ||
      !form.slug.trim()
    ) {
      toast.error(t("rooms.required"));
      return;
    }
    create.mutate();
  };
  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const data = q.data?.data || [];
  return (
    <>
      <PageHead title={t("nav.rooms")} desc={t("management.roomsDesc")} />
      <div className="panel">
        <div className="toolbar">
          <input placeholder={t("common.search")} />
          <button className="primary" onClick={startCreate}>
            <Plus size={17} /> {t("common.create")}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("table.name")}</th>
                <th>{t("table.property")}</th>
                <th>{t("table.capacity")}</th>
                <th>{t("table.hourlyPrice")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.length ? (
                data.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <b>{r.name}</b>
                      <small className="subline">{r.slug}</small>
                    </td>
                    <td>
                      <b>{r.properties?.name || "—"}</b>
                      {r.properties?.city && (
                        <small className="subline">{r.properties.city}</small>
                      )}
                    </td>
                    <td>{r.capacity}</td>
                    <td>
                      {new Intl.NumberFormat("vi-VN").format(
                        r.base_hourly_price,
                      )}{" "}
                      ₫
                    </td>
                    <td>
                      <StatusBadge status={r.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="ghost"
                          onClick={() => {
                            setDetailRoom(r);
                            setDetailTab("images");
                          }}
                        >
                          <Eye size={15} />
                          {t("common.viewAll")}
                        </button>
                        <button className="ghost" onClick={() => startEdit(r)}>
                          <Pencil size={15} />
                          {t("common.edit")}
                        </button>
                      </div>
                    </td>
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
        open={open}
        onClose={() => {
          setOpen(false);
          setEditingRoom(null);
        }}
        title={editingRoom ? t("rooms.editTitle") : t("rooms.createTitle")}
        description={t("rooms.formDesc")}
        footer={
          <>
            <button
              className="ghost"
              onClick={() => {
                setOpen(false);
                setEditingRoom(null);
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              className="primary"
              form="room-form"
              disabled={create.isPending}
            >
              {create.isPending ? t("common.loading") : t("common.save")}
            </button>
          </>
        }
      >
        {properties.isLoading ? (
          <Loading />
        ) : properties.isError ? (
          <ErrorState
            error={properties.error}
            onRetry={() => properties.refetch()}
          />
        ) : (
          <form id="room-form" className="form-grid" onSubmit={submit}>
            <label className="span-2">
              <span>{t("form.property")}</span>
              <select
                value={propertyId}
                disabled={Boolean(editingRoom)}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                <option value="">{t("form.selectProperty")}</option>
                {(properties.data?.data || []).map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} {property.city ? `· ${property.city}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{t("form.name")}</span>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label>
              <span>{t("form.slug")}</span>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </label>
            <label className="span-2">
              <span>{t("form.description")}</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </label>
            <label>
              <span>{t("form.capacity")}</span>
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) =>
                  setForm({ ...form, capacity: Number(e.target.value) })
                }
              />
            </label>
            <label>
              <span>{t("form.status")}</span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Room["status"] })
                }
              >
                <option value="AVAILABLE">AVAILABLE</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
                <option value="INACTIVE">INACTIVE</option>
              </select>
            </label>
            <label>
              <span>{t("form.hourlyPrice")}</span>
              <input
                type="number"
                min="0"
                value={form.base_hourly_price}
                onChange={(e) =>
                  setForm({
                    ...form,
                    base_hourly_price: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              <span>{t("form.dailyPrice")}</span>
              <input
                type="number"
                min="0"
                value={form.base_daily_price}
                onChange={(e) =>
                  setForm({ ...form, base_daily_price: Number(e.target.value) })
                }
              />
            </label>
          </form>
        )}
      </Modal>
      <Modal
        open={Boolean(detailRoom)}
        onClose={() => setDetailRoom(null)}
        title={detailRoom?.name || t("rooms.detailTitle")}
        description={detailRoom?.properties?.name || detailRoom?.slug}
      >
        {detail.isLoading ? (
          <Loading />
        ) : detail.isError ? (
          <ErrorState error={detail.error} onRetry={() => detail.refetch()} />
        ) : (
          <>
            <div
              className="toolbar"
              role="tablist"
              aria-label={t("rooms.detailTitle")}
            >
              {(["images", "pricing", "blocked"] as const).map((tab) => (
                <button
                  key={tab}
                  className={detailTab === tab ? "primary" : "ghost"}
                  role="tab"
                  aria-selected={detailTab === tab}
                  onClick={() => setDetailTab(tab)}
                >
                  {t(`rooms.tabs.${tab}`)}
                </button>
              ))}
            </div>
            {detailTab === "images" &&
              (detail.data?.room_images.length ? (
                <div className="room-image-grid">
                  {detail.data.room_images.map((image) => (
                    <a
                      key={image.id}
                      href={image.image_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src={image.image_url}
                        alt={detailRoom?.name || t("rooms.detailTitle")}
                        loading="lazy"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="muted">{t("common.empty")}</p>
              ))}
            {detailTab === "pricing" && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("rooms.rule")}</th>
                      <th>{t("form.status")}</th>
                      <th>{t("table.total")}</th>
                      <th>{t("rooms.duration")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data?.pricing_rules.length ? (
                      detail.data.pricing_rules.map((rule) => (
                        <tr key={rule.id}>
                          <td>{rule.rule_name}</td>
                          <td>
                            <StatusBadge
                              status={rule.active ? "ACTIVE" : "INACTIVE"}
                            />
                          </td>
                          <td>
                            {new Intl.NumberFormat("vi-VN").format(rule.price)}{" "}
                            ₫
                          </td>
                          <td>
                            {rule.min_duration_minutes ?? "—"}–
                            {rule.max_duration_minutes ?? "—"}{" "}
                            {t("common.minutes")}
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
            )}
            {detailTab === "blocked" && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("bookings.startAt")}</th>
                      <th>{t("bookings.endAt")}</th>
                      <th>{t("bookings.notes")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data?.blocked_periods.length ? (
                      detail.data.blocked_periods.map((period) => (
                        <tr key={period.id}>
                          <td>{new Date(period.start_at).toLocaleString()}</td>
                          <td>{new Date(period.end_at).toLocaleString()}</td>
                          <td>{period.reason || "—"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="empty-cell">
                          {t("common.empty")}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
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
