import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
import { propertiesCrudApi, type PropertyPayload } from "./api";
import { pricingPlansApi } from "../dashboard/api";
import type { Property, PricingPlan } from "../../types/api";
import { apiError } from "../../services/http";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";

const emptyForm: PropertyPayload = {
  name: "",
  address: "",
  description: "",
  city: "",
  country: "Vietnam",
  pricing_plan_id: "",
};

export function PropertiesPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | Property["status"]>(
    "ACTIVE",
  );
  const [page, setPage] = useState(0);
  const pageSize = 100;
  const [editing, setEditing] = useState<Property | null>(null);
  const [open, setOpen] = useState(false);

  const pricingPlans = useQuery({
    queryKey: ["admin-pricing-plans"],
    queryFn: () => pricingPlansApi.list(),
  });

  const q = useQuery({
    queryKey: ["admin-properties", page],
    queryFn: () =>
      propertiesCrudApi.list({ offset: page * pageSize, limit: pageSize }),
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: PropertyPayload }) =>
      id
        ? propertiesCrudApi.update(id, payload)
        : propertiesCrudApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
      setOpen(false);
      setEditing(null);
      toast.success(t("properties.saved"));
    },
    onError: (error) =>
      toast.error(`${t("properties.saveError")} ${apiError(error)}`),
  });

  const remove = useMutation({
    mutationFn: propertiesCrudApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
      toast.success(t("properties.deleted"));
    },
    onError: (error) =>
      toast.error(`${t("properties.deleteError")} ${apiError(error)}`),
  });

  const data = useMemo(() => {
    const rows = q.data?.data || [];
    const s = search.trim().toLowerCase();
    return rows.filter((p) => {
      const matchesSearch = [
        p.name,
        p.address,
        p.city,
        p.country,
        p.description,
      ].some((v) => (v || "").toLowerCase().includes(s));
      return (
        matchesSearch && (statusFilter === "ALL" || p.status === statusFilter)
      );
    });
  }, [q.data, search, statusFilter]);

  const startCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const startEdit = (p: Property) => {
    setEditing(p);
    setOpen(true);
  };

  const handleDelete = (p: Property) => {
    if (window.confirm(t("properties.confirmDelete", { name: p.name })))
      remove.mutate(p.id);
  };

  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("nav.properties").toUpperCase()}</p>
          <h1>{t("nav.properties")}</h1>
          <p className="muted">{t("management.propertiesDesc")}</p>
        </div>
        <button className="primary" onClick={startCreate}>
          <Plus size={17} /> {t("common.create")}
        </button>
      </div>

      <div className="panel">
        <div className="toolbar">
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder={t("common.search")}
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(0);
            }}
            aria-label={t("common.status")}
          >
            <option value="ACTIVE">{t("status.ACTIVE", "Đang hoạt động")}</option>
            <option value="ALL">{t("common.all", "Tất cả")}</option>
            <option value="INACTIVE">{t("status.INACTIVE", "Không hoạt động")}</option>
            <option value="SUSPENDED">{t("status.SUSPENDED", "Tạm ngưng")}</option>
          </select>
          <button
            className="ghost icon-btn"
            onClick={() => q.refetch()}
            disabled={q.isFetching}
            aria-label={t("common.refresh")}
            title={t("common.refresh")}
          >
            <RefreshCw size={16} />
          </button>
          <span className="toolbar-meta">
            {data.length} · {page + 1} /{" "}
            {Math.max(1, Math.ceil((q.data?.total ?? 0) / pageSize))}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("table.name")}</th>
                <th>{t("properties.pricingPlan", "Bảng giá")}</th>
                <th>{t("properties.owner", "Chủ sở hữu")}</th>
                <th>{t("form.address", "Địa chỉ")}</th>
                <th>{t("table.city")}</th>
                <th>{t("form.country", "Quốc gia")}</th>
                <th>{t("common.status")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.length ? (
                data.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <b>{p.name}</b>
                      {p.description && (
                        <small
                          className="subline"
                          style={{
                            maxWidth: 220,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            display: "block",
                          }}
                        >
                          {p.description}
                        </small>
                      )}
                    </td>
                    <td>
                      {p.pricing_plan?.name ? (
                        <span className="badge badge-info" title={p.pricing_plan.name}>
                          {p.pricing_plan.name}
                        </span>
                      ) : (
                        <span className="muted text-sm">—</span>
                      )}
                    </td>
                    <td>
                      <b>{p.profiles?.full_name || "—"}</b>
                      {p.profiles?.phone && (
                        <small className="subline">{p.profiles.phone}</small>
                      )}
                    </td>
                    <td>{p.address || "—"}</td>
                    <td>{p.city || "—"}</td>
                    <td>{p.country || "—"}</td>
                    <td>
                      <StatusBadge status={p.status} />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button className="ghost" onClick={() => startEdit(p)}>
                          <Pencil size={15} />
                          {t("common.edit")}
                        </button>
                        <button
                          className="danger ghost"
                          disabled={remove.isPending}
                          onClick={() => handleDelete(p)}
                        >
                          <Trash2 size={15} />
                          {t("common.delete")}
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

        {(q.data?.total ?? 0) > pageSize && (
          <div className="toolbar pagination">
            <span className="muted">
              {page * pageSize + 1}–
              {Math.min((page + 1) * pageSize, q.data?.total ?? 0)} /{" "}
              {q.data?.total}
            </span>
            <div className="row-actions">
              <button
                className="ghost"
                disabled={page === 0 || q.isFetching}
                onClick={() => setPage((current) => current - 1)}
              >
                {t("common.previous")}
              </button>
              <button
                className="ghost"
                disabled={
                  (page + 1) * pageSize >= (q.data?.total ?? 0) || q.isFetching
                }
                onClick={() => setPage((current) => current + 1)}
              >
                {t("common.next")}
              </button>
            </div>
          </div>
        )}
      </div>

      <PropertyForm
        open={open}
        property={editing}
        pricingPlans={pricingPlans.data || []}
        busy={mutation.isPending}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSubmit={(payload) => mutation.mutate({ id: editing?.id, payload })}
      />
    </>
  );
}

function PropertyForm({
  open,
  property,
  pricingPlans = [],
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  property: Property | null;
  pricingPlans?: PricingPlan[];
  busy: boolean;
  onClose: () => void;
  onSubmit: (payload: PropertyPayload) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<PropertyPayload>(emptyForm);

  useEffect(() => {
    if (open) {
      setForm(
        property
          ? {
              name: property.name || "",
              address: property.address || "",
              description: property.description || "",
              city: property.city || "",
              country: property.country || "Vietnam",
              pricing_plan_id: property.pricing_plan_id || "",
            }
          : emptyForm,
      );
    }
  }, [open, property]);

  const set = (key: keyof PropertyPayload, value: string) =>
    setForm((v) => ({ ...v, [key]: value }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("properties.nameRequired", "Vui lòng nhập tên cơ sở"));
      return;
    }
    onSubmit({
      name: form.name.trim(),
      address: form.address?.trim() || "",
      description: form.description?.trim() || "",
      city: form.city?.trim() || "",
      country: form.country?.trim() || "Vietnam",
      pricing_plan_id: form.pricing_plan_id || null,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={property ? t("properties.editTitle") : t("properties.createTitle")}
      description={t("properties.formDesc")}
      footer={
        <>
          <button className="ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="primary" form="property-form" disabled={busy}>
            {busy ? t("common.loading") : t("common.save")}
          </button>
        </>
      }
    >
      <form id="property-form" className="form-grid" onSubmit={submit}>
        <label className="span-2">
          <span>{t("form.name", "Tên cơ sở lưu trú")} *</span>
          <input
            required
            autoFocus
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder={t("form.namePlaceholder", "Nhập tên cơ sở")}
          />
        </label>
        <label className="span-2">
          <span>{t("properties.pricingPlan", "Bảng giá áp dụng")}</span>
          <select
            value={form.pricing_plan_id || ""}
            onChange={(e) => set("pricing_plan_id", e.target.value)}
          >
            <option value="">-- Chưa gán bảng giá (Dùng mặc định) --</option>
            {pricingPlans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} {plan.is_default ? " (Mặc định)" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="span-2">
          <span>{t("form.address", "Địa chỉ")}</span>
          <input
            value={form.address || ""}
            onChange={(e) => set("address", e.target.value)}
            placeholder={t("form.addressPlaceholder", "Nhập địa chỉ cơ sở")}
          />
        </label>
        <label className="span-2">
          <span>{t("form.description", "Mô tả")}</span>
          <textarea
            rows={3}
            value={form.description || ""}
            onChange={(e) => set("description", e.target.value)}
            placeholder={t("form.descriptionPlaceholder", "Nhập mô tả cơ sở")}
          />
        </label>
        <label>
          <span>{t("form.city", "Thành phố")}</span>
          <input
            value={form.city || ""}
            onChange={(e) => set("city", e.target.value)}
            placeholder={t("form.cityPlaceholder", "Nhập thành phố")}
          />
        </label>
        <label>
          <span>{t("form.country", "Quốc gia")}</span>
          <input
            value={form.country || ""}
            onChange={(e) => set("country", e.target.value)}
            placeholder={t("form.countryPlaceholder", "Nhập quốc gia")}
          />
        </label>
      </form>
    </Modal>
  );
}
