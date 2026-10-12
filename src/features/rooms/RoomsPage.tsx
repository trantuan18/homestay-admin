import { useState, useRef } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Star,
  Check,
} from "lucide-react";
import {
  roomsApi,
  propertiesApi,
  roomImagesApi,
  pricingRulesApi,
  blockedPeriodsApi,
  amenitiesApi,
  reviewsApi,
} from "../dashboard/api";
import { roomsCrudApi, type RoomPayload } from "./api";
import type { Room } from "../../types/api";
import { apiError } from "../../services/http";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";

const emptyForm: RoomPayload = {
  name: "",
  slug: "",
  description: "",
  capacity: 2,
  status: "AVAILABLE",
};

export function RoomsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [detailRoom, setDetailRoom] = useState<Room | null>(null);
  const [detailTab, setDetailTab] = useState<
    "images" | "pricing" | "blocked" | "amenities" | "reviews"
  >("images");
  const [propertyId, setPropertyId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Room["status"] | "ALL">(
    "AVAILABLE",
  );
  const [form, setForm] = useState<RoomPayload>(emptyForm);

  // States for tab forms
  const [showAddPricing, setShowAddPricing] = useState(false);
  const [pricingForm, setPricingForm] = useState({
    rule_name: "",
    price: 0,
    day_of_week: null as number | null,
    start_time: "",
    end_time: "",
    min_duration_minutes: null as number | null,
    max_duration_minutes: null as number | null,
    priority: 1,
    active: true,
  });

  const [showAddBlocked, setShowAddBlocked] = useState(false);
  const [blockedForm, setBlockedForm] = useState({
    start_at: "",
    end_at: "",
    reason: "",
  });

  const [selectedAmenityId, setSelectedAmenityId] = useState("");

  const q = useQuery({
    queryKey: ["admin-rooms"],
    queryFn: () => roomsApi.list({ offset: 0, limit: 100 }),
  });

  const properties = useQuery({
    queryKey: ["admin-properties-for-room"],
    queryFn: () => propertiesApi.list({ offset: 0, limit: 100, status: "ACTIVE" }),
    enabled: open,
  });

  const detail = useQuery({
    queryKey: ["admin-room-detail", detailRoom?.id],
    queryFn: () => roomsCrudApi.detail(detailRoom!.id),
    enabled: Boolean(detailRoom),
  });

  const allAmenities = useQuery({
    queryKey: ["all-amenities"],
    queryFn: () => amenitiesApi.listAll(),
    enabled: Boolean(detailRoom && detailTab === "amenities"),
  });

  const reviews = useQuery({
    queryKey: ["room-reviews", detailRoom?.id],
    queryFn: () => reviewsApi.listForRoom(detailRoom!.id),
    enabled: Boolean(detailRoom && detailTab === "reviews"),
  });

  // Mutations
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
    onError: (error) =>
      toast.error(`${t("rooms.saveError")} ${apiError(error)}`),
  });

  const remove = useMutation({
    mutationFn: roomsCrudApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-rooms"] });
      toast.success(t("rooms.deleted"));
    },
    onError: (error) =>
      toast.error(`${t("rooms.deleteError")} ${apiError(error)}`),
  });

  // Images mutations
  const uploadImage = useMutation({
    mutationFn: ({ file, isPrimary }: { file: File; isPrimary: boolean }) =>
      roomImagesApi.upload(detailRoom!.id, file, isPrimary),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-room-detail", detailRoom?.id] });
      toast.success(t("rooms.imageUploaded", "Tải ảnh lên thành công"));
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (error) =>
      toast.error(`Lỗi tải ảnh: ${apiError(error)}`),
  });

  const setPrimaryImage = useMutation({
    mutationFn: (imageId: string) =>
      roomImagesApi.setPrimary(detailRoom!.id, imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-room-detail", detailRoom?.id] });
      toast.success(t("rooms.primaryImageSet", "Đã đặt làm ảnh chính"));
    },
    onError: (error) =>
      toast.error(`Lỗi cập nhật ảnh: ${apiError(error)}`),
  });

  const deleteImage = useMutation({
    mutationFn: (imageId: string) =>
      roomImagesApi.delete(detailRoom!.id, imageId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-room-detail", detailRoom?.id] });
      toast.success(t("rooms.imageDeleted", "Đã xóa ảnh"));
    },
    onError: (error) =>
      toast.error(`Lỗi xóa ảnh: ${apiError(error)}`),
  });

  // Pricing rules mutations
  const createPricingRule = useMutation({
    mutationFn: () =>
      pricingRulesApi.create(detailRoom!.id, {
        rule_name: pricingForm.rule_name,
        price: Number(pricingForm.price),
        day_of_week: pricingForm.day_of_week,
        start_time: pricingForm.start_time || null,
        end_time: pricingForm.end_time || null,
        min_duration_minutes: pricingForm.min_duration_minutes,
        max_duration_minutes: pricingForm.max_duration_minutes,
        priority: Number(pricingForm.priority) || 1,
        active: pricingForm.active,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-room-detail", detailRoom?.id] });
      setShowAddPricing(false);
      setPricingForm({
        rule_name: "",
        price: 0,
        day_of_week: null,
        start_time: "",
        end_time: "",
        min_duration_minutes: null,
        max_duration_minutes: null,
        priority: 1,
        active: true,
      });
      toast.success("Đã thêm quy tắc giá");
    },
    onError: (error) => toast.error(`Lỗi thêm quy tắc: ${apiError(error)}`),
  });

  const deletePricingRule = useMutation({
    mutationFn: (ruleId: string) =>
      pricingRulesApi.delete(detailRoom!.id, ruleId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-room-detail", detailRoom?.id] });
      toast.success("Đã xóa quy tắc giá");
    },
    onError: (error) => toast.error(`Lỗi xóa quy tắc: ${apiError(error)}`),
  });

  // Blocked periods mutations
  const createBlockedPeriod = useMutation({
    mutationFn: () =>
      blockedPeriodsApi.create(detailRoom!.id, {
        start_at: new Date(blockedForm.start_at).toISOString(),
        end_at: new Date(blockedForm.end_at).toISOString(),
        reason: blockedForm.reason || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-room-detail", detailRoom?.id] });
      setShowAddBlocked(false);
      setBlockedForm({ start_at: "", end_at: "", reason: "" });
      toast.success("Đã thêm khoảng thời gian chặn");
    },
    onError: (error) => toast.error(`Lỗi chặn phòng: ${apiError(error)}`),
  });

  const deleteBlockedPeriod = useMutation({
    mutationFn: (blockedId: string) =>
      blockedPeriodsApi.delete(detailRoom!.id, blockedId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-room-detail", detailRoom?.id] });
      toast.success("Đã hủy chặn phòng");
    },
    onError: (error) => toast.error(`Lỗi: ${apiError(error)}`),
  });

  // Amenities mutations
  const addAmenity = useMutation({
    mutationFn: (amenityId: string) =>
      amenitiesApi.addToRoom(detailRoom!.id, amenityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-room-detail", detailRoom?.id] });
      setSelectedAmenityId("");
      toast.success("Đã thêm tiện nghi");
    },
    onError: (error) => toast.error(`Lỗi thêm tiện nghi: ${apiError(error)}`),
  });

  const removeAmenity = useMutation({
    mutationFn: (amenityId: string) =>
      amenitiesApi.removeFromRoom(detailRoom!.id, amenityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-room-detail", detailRoom?.id] });
      toast.success("Đã gỡ tiện nghi");
    },
    onError: (error) => toast.error(`Lỗi gỡ tiện nghi: ${apiError(error)}`),
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

  const normalizedSearch = search.trim().toLowerCase();
  const data = (q.data?.data || []).filter((room) => {
    const matchesSearch = [
      room.name,
      room.slug,
      room.properties?.name,
      room.properties?.city,
    ].some((value) => (value || "").toLowerCase().includes(normalizedSearch));
    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : room.status === statusFilter &&
          (room.properties?.status ? room.properties.status === "ACTIVE" : true);
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <PageHead title={t("nav.rooms")} desc={t("management.roomsDesc")} />
      <div className="panel">
        <div className="toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("common.search")}
          />
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as Room["status"] | "ALL")
            }
            aria-label={t("common.status")}
          >
            <option value="AVAILABLE">
              {t("status.AVAILABLE", "Đang hoạt động")}
            </option>
            <option value="ALL">{t("common.all", "Tất cả")}</option>
            <option value="MAINTENANCE">
              {t("status.MAINTENANCE", "Bảo trì")}
            </option>
            <option value="INACTIVE">
              {t("status.INACTIVE", "Không hoạt động")}
            </option>
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
                <th>{t("table.dailyPrice", "Giá ngày")}</th>
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
                      {new Intl.NumberFormat("vi-VN").format(
                        r.base_daily_price,
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
                        <button
                          className="danger ghost"
                          disabled={remove.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                t("rooms.confirmDelete", { name: r.name }),
                              )
                            )
                              remove.mutate(r.id);
                          }}
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
                  <td colSpan={7} className="empty-cell">
                    {t("common.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT ROOM MODAL */}
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
                {(properties.data?.data || [])
                  .filter(
                    (property) =>
                      property.status === "ACTIVE" || property.id === propertyId,
                  )
                  .map((property) => (
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
            <label className="span-2">
              <span>{t("form.status")}</span>
              <select
                value={form.status}
                onChange={(e) =>
                  setForm({ ...form, status: e.target.value as Room["status"] })
                }
              >
                <option value="AVAILABLE">
                  {t("status.AVAILABLE", "Đang hoạt động")}
                </option>
                <option value="MAINTENANCE">
                  {t("status.MAINTENANCE", "Bảo trì")}
                </option>
                <option value="INACTIVE">
                  {t("status.INACTIVE", "Không hoạt động")}
                </option>
              </select>
            </label>
            <div
              className="span-2"
              style={{
                padding: "10px 14px",
                background: "var(--color-surface-2)",
                borderRadius: "var(--radius-sm)",
                fontSize: "13px",
                color: "var(--color-muted)",
                lineHeight: "1.5",
                border: "1px dashed var(--color-border)",
              }}
            >
              💡 Giá theo giờ và giá theo ngày sẽ được tự động áp dụng theo bảng giá của cơ sở lưu trú.
            </div>
          </form>
        )}
      </Modal>

      {/* DETAIL MODAL WITH 5 TABS */}
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
              style={{ overflowX: "auto" }}
            >
              {(
                [
                  "images",
                  "pricing",
                  "blocked",
                  "amenities",
                  "reviews",
                ] as const
              ).map((tab) => (
                <button
                  key={tab}
                  className={detailTab === tab ? "primary" : "ghost"}
                  role="tab"
                  aria-selected={detailTab === tab}
                  onClick={() => setDetailTab(tab)}
                >
                  {tab === "amenities"
                    ? "Tiện nghi"
                    : tab === "reviews"
                      ? "Đánh giá"
                      : t(`rooms.tabs.${tab}`)}
                </button>
              ))}
            </div>

            {/* TAB 1: IMAGES */}
            {detailTab === "images" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <p className="muted" style={{ margin: 0 }}>
                    {detail.data?.room_images.length || 0} hình ảnh
                  </p>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const isPrimary = (detail.data?.room_images.length ?? 0) === 0;
                          uploadImage.mutate({ file, isPrimary });
                        }
                      }}
                    />
                    <button
                      className="primary"
                      disabled={uploadImage.isPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={15} style={{ marginRight: "4px" }} />
                      {uploadImage.isPending ? "Đang tải lên..." : "Tải ảnh lên"}
                    </button>
                  </div>
                </div>

                {detail.data?.room_images.length ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: "1rem",
                    }}
                  >
                    {detail.data.room_images.map((image) => (
                      <div
                        key={image.id}
                        style={{
                          position: "relative",
                          border: image.is_primary
                            ? "2px solid var(--color-primary-strong)"
                            : "1px solid var(--color-border)",
                          borderRadius: "8px",
                          overflow: "hidden",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <img
                          src={image.image_url}
                          alt="Room"
                          style={{
                            width: "100%",
                            height: "120px",
                            objectFit: "cover",
                          }}
                        />
                        {image.is_primary && (
                          <span
                            style={{
                              position: "absolute",
                              top: "6px",
                              left: "6px",
                              background: "var(--color-primary-strong)",
                              color: "var(--color-on-primary)",
                              fontSize: "0.65rem",
                              fontWeight: "bold",
                              padding: "2px 6px",
                              borderRadius: "4px",
                            }}
                          >
                            Ảnh chính
                          </span>
                        )}
                        <div
                          style={{
                            padding: "6px",
                            display: "flex",
                            justifyContent: "space-between",
                            background: "var(--color-surface)",
                          }}
                        >
                          {!image.is_primary && (
                            <button
                              className="ghost"
                              style={{ fontSize: "0.75rem", padding: "2px 6px" }}
                              onClick={() => setPrimaryImage.mutate(image.id)}
                              disabled={setPrimaryImage.isPending}
                              title="Đặt làm ảnh chính"
                            >
                              <Check size={12} style={{ marginRight: "2px" }} />
                              Chính
                            </button>
                          )}
                          <button
                            className="danger ghost"
                            style={{ fontSize: "0.75rem", padding: "2px 6px", marginLeft: "auto" }}
                            onClick={() => {
                              if (window.confirm("Bạn có chắc muốn xóa ảnh này?")) {
                                deleteImage.mutate(image.id);
                              }
                            }}
                            disabled={deleteImage.isPending}
                            title="Xóa ảnh"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">{t("common.empty")}</p>
                )}
              </div>
            )}

            {/* TAB 2: PRICING RULES */}
            {detailTab === "pricing" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b>Quy tắc định giá linh hoạt</b>
                  <button
                    className="primary"
                    onClick={() => setShowAddPricing(!showAddPricing)}
                  >
                    <Plus size={15} style={{ marginRight: "4px" }} />
                    {showAddPricing ? "Đóng form" : "Thêm quy tắc"}
                  </button>
                </div>

                {showAddPricing && (
                  <div
                    className="panel"
                    style={{ padding: "1rem", background: "var(--color-surface-2)" }}
                  >
                    <div className="form-grid">
                      <label>
                        <span>Tên quy tắc</span>
                        <input
                          placeholder="Ví dụ: Cuối tuần, Giờ cao điểm"
                          value={pricingForm.rule_name}
                          onChange={(e) =>
                            setPricingForm({ ...pricingForm, rule_name: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        <span>Giá áp dụng (VNĐ)</span>
                        <input
                          type="number"
                          min="0"
                          value={pricingForm.price}
                          onChange={(e) =>
                            setPricingForm({ ...pricingForm, price: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        <span>Thứ trong tuần</span>
                        <select
                          value={pricingForm.day_of_week ?? ""}
                          onChange={(e) =>
                            setPricingForm({
                              ...pricingForm,
                              day_of_week: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        >
                          <option value="">Tất cả các ngày</option>
                          <option value="1">Thứ 2</option>
                          <option value="2">Thứ 3</option>
                          <option value="3">Thứ 4</option>
                          <option value="4">Thứ 5</option>
                          <option value="5">Thứ 6</option>
                          <option value="6">Thứ 7</option>
                          <option value="0">Chủ nhật</option>
                        </select>
                      </label>
                      <label>
                        <span>Thời lượng tối thiểu (phút)</span>
                        <input
                          type="number"
                          placeholder="Tùy chọn"
                          value={pricingForm.min_duration_minutes ?? ""}
                          onChange={(e) =>
                            setPricingForm({
                              ...pricingForm,
                              min_duration_minutes:
                                e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
                        <button
                          className="primary"
                          disabled={!pricingForm.rule_name.trim() || pricingForm.price <= 0 || createPricingRule.isPending}
                          onClick={() => createPricingRule.mutate()}
                        >
                          Lưu quy tắc
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("rooms.rule")}</th>
                        <th>{t("form.status")}</th>
                        <th>{t("table.total")}</th>
                        <th>{t("rooms.duration")}</th>
                        <th>{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.data?.pricing_rules.length ? (
                        detail.data.pricing_rules.map((rule) => (
                          <tr key={rule.id}>
                            <td>
                              <b>{rule.rule_name}</b>
                              {rule.day_of_week !== null && (
                                <small className="subline">
                                  Thứ {rule.day_of_week === 0 ? "CN" : rule.day_of_week + 1}
                                </small>
                              )}
                            </td>
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
                            <td>
                              <button
                                className="danger ghost"
                                onClick={() => {
                                  if (window.confirm("Xóa quy tắc này?")) {
                                    deletePricingRule.mutate(rule.id);
                                  }
                                }}
                                disabled={deletePricingRule.isPending}
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="empty-cell">
                            {t("common.empty")}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: BLOCKED PERIODS */}
            {detailTab === "blocked" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <b>Thời gian khóa phòng (Bảo trì / Sửa chữa)</b>
                  <button
                    className="primary"
                    onClick={() => setShowAddBlocked(!showAddBlocked)}
                  >
                    <Plus size={15} style={{ marginRight: "4px" }} />
                    {showAddBlocked ? "Đóng form" : "Chặn phòng"}
                  </button>
                </div>

                {showAddBlocked && (
                  <div
                    className="panel"
                    style={{ padding: "1rem", background: "var(--color-surface-2)" }}
                  >
                    <div className="form-grid">
                      <label>
                        <span>Thời gian bắt đầu</span>
                        <input
                          type="datetime-local"
                          value={blockedForm.start_at}
                          onChange={(e) =>
                            setBlockedForm({ ...blockedForm, start_at: e.target.value })
                          }
                        />
                      </label>
                      <label>
                        <span>Thời gian kết thúc</span>
                        <input
                          type="datetime-local"
                          value={blockedForm.end_at}
                          onChange={(e) =>
                            setBlockedForm({ ...blockedForm, end_at: e.target.value })
                          }
                        />
                      </label>
                      <label className="span-2">
                        <span>Lý do chặn</span>
                        <input
                          placeholder="Ví dụ: Vệ sinh, Sơn sửa, Hỏng điều hòa"
                          value={blockedForm.reason}
                          onChange={(e) =>
                            setBlockedForm({ ...blockedForm, reason: e.target.value })
                          }
                        />
                      </label>
                      <div>
                        <button
                          className="primary"
                          disabled={
                            !blockedForm.start_at ||
                            !blockedForm.end_at ||
                            createBlockedPeriod.isPending
                          }
                          onClick={() => createBlockedPeriod.mutate()}
                        >
                          Xác nhận chặn
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("bookings.startAt")}</th>
                        <th>{t("bookings.endAt")}</th>
                        <th>{t("bookings.notes")}</th>
                        <th>{t("common.actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.data?.blocked_periods.length ? (
                        detail.data.blocked_periods.map((period) => (
                          <tr key={period.id}>
                            <td>{new Date(period.start_at).toLocaleString()}</td>
                            <td>{new Date(period.end_at).toLocaleString()}</td>
                            <td>{period.reason || "—"}</td>
                            <td>
                              <button
                                className="danger ghost"
                                onClick={() => {
                                  if (window.confirm("Bỏ chặn thời gian này?")) {
                                    deleteBlockedPeriod.mutate(period.id);
                                  }
                                }}
                                disabled={deleteBlockedPeriod.isPending}
                              >
                                <Trash2 size={14} />
                              </button>
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
              </div>
            )}

            {/* TAB 4: AMENITIES */}
            {detailTab === "amenities" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <select
                    value={selectedAmenityId}
                    onChange={(e) => setSelectedAmenityId(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">-- Chọn tiện nghi để thêm vào phòng --</option>
                    {(allAmenities.data || [])
                      .filter(
                        (a) =>
                          !(detail.data?.room_amenities || []).some(
                            (ra) => ra.amenity_id === a.id,
                          ),
                      )
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} {a.category ? `(${a.category})` : ""}
                        </option>
                      ))}
                  </select>
                  <button
                    className="primary"
                    disabled={!selectedAmenityId || addAmenity.isPending}
                    onClick={() => addAmenity.mutate(selectedAmenityId)}
                  >
                    <Plus size={15} style={{ marginRight: "4px" }} />
                    Thêm tiện nghi
                  </button>
                </div>

                {detail.data?.room_amenities?.length ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "0.5rem",
                    }}
                  >
                    {detail.data.room_amenities.map((ra) => (
                      <div
                        key={ra.amenity_id}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          background: "var(--color-surface-2)",
                          border: "1px solid var(--color-border)",
                          padding: "6px 12px",
                          borderRadius: "20px",
                          fontSize: "0.85rem",
                        }}
                      >
                        <b>{ra.amenities?.name || "Tiện nghi"}</b>
                        <button
                          className="ghost icon-btn"
                          style={{ padding: "2px", width: "18px", height: "18px" }}
                          onClick={() => removeAmenity.mutate(ra.amenity_id)}
                          disabled={removeAmenity.isPending}
                          title="Gỡ tiện nghi"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Chưa có tiện nghi nào được thiết lập cho phòng này.</p>
                )}
              </div>
            )}

            {/* TAB 5: REVIEWS */}
            {detailTab === "reviews" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {reviews.isLoading ? (
                  <Loading />
                ) : reviews.data?.length ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {reviews.data.map((rev) => (
                      <div
                        key={rev.id}
                        style={{
                          padding: "0.75rem",
                          border: "1px solid var(--color-border)",
                          borderRadius: "8px",
                          background: "var(--color-surface)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "4px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                size={14}
                                fill={star <= rev.rating ? "#eab308" : "none"}
                                color={star <= rev.rating ? "#eab308" : "var(--color-muted)"}
                              />
                            ))}
                            <b style={{ marginLeft: "6px" }}>
                              {rev.profiles?.full_name || "Khách hàng"}
                            </b>
                          </div>
                          <small className="muted">
                            {new Date(rev.created_at).toLocaleDateString()}
                          </small>
                        </div>
                        <p style={{ margin: 0, fontSize: "0.85rem" }}>
                          {rev.comment || "Không có bình luận"}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="muted">Chưa có đánh giá nào cho phòng này.</p>
                )}
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
