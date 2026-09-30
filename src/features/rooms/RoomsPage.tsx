import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Plus } from "lucide-react";
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
  const create = useMutation({
    mutationFn: () => roomsCrudApi.create(propertyId, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
      setOpen(false);
      setPropertyId("");
      setForm(emptyForm);
      toast.success(t("rooms.saved"));
    },
    onError: () => toast.error(t("rooms.saveError")),
  });
  const startCreate = () => {
    setPropertyId("");
    setForm(emptyForm);
    setOpen(true);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!propertyId || !form.name.trim() || !form.slug.trim()) {
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
                      <button className="ghost">{t("common.edit")}</button>
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
        onClose={() => setOpen(false)}
        title={t("rooms.createTitle")}
        description={t("rooms.formDesc")}
        footer={
          <>
            <button className="ghost" onClick={() => setOpen(false)}>
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
      <button className="primary">
        + {useTranslation().t("common.create")}
      </button>
    </div>
  );
}
