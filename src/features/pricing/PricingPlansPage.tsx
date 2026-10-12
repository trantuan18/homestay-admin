import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Moon,
  CalendarDays,
  Users,
  Tag,
} from "lucide-react";
import { pricingPlansApi } from "../dashboard/api";
import type { PricingPlan } from "../../types/api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { Modal } from "../../components/ui/Modal";
import { apiError } from "../../services/http";

const defaultFormData: Partial<PricingPlan> = {
  name: "",
  description: "",
  is_default: false,
  hourly_first_hours: 2,
  hourly_first_price: 249000,
  hourly_next_price: 69000,
  combo_4h_price: 359000,
  combo_8h_price: 489000,
  overnight_check_in: "22:00",
  overnight_check_out: "09:00",
  overnight_weekday_price: 429000,
  overnight_weekend_price: 499000,
  daily_check_in: "14:00",
  daily_check_out: "11:00",
  daily_weekday_price: 599000,
  daily_weekend_price: 699000,
  standard_guest_count: 2,
  extra_guest_fee: 100000,
  holiday_surcharge: 100000,
};

const formatVND = (num?: number) =>
  new Intl.NumberFormat("vi-VN").format(num ?? 0) + " ₫";

export function PricingPlansPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PricingPlan | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<PricingPlan>>(defaultFormData);

  const q = useQuery({
    queryKey: ["admin-pricing-plans"],
    queryFn: () => pricingPlansApi.list(),
  });

  const saveMutation = useMutation({
    mutationFn: (data: Partial<PricingPlan>) =>
      editing ? pricingPlansApi.update(editing.id, data) : pricingPlansApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pricing-plans"] });
      setModalOpen(false);
      setEditing(null);
      toast.success(editing ? "Đã cập nhật bảng giá" : "Đã tạo bảng giá mới");
    },
    onError: (err) => {
      toast.error(`Lỗi lưu bảng giá: ${apiError(err)}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pricingPlansApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pricing-plans"] });
      toast.success("Đã xóa bảng giá");
    },
    onError: (err) => {
      toast.error(`Lỗi xóa bảng giá: ${apiError(err)}`);
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (plan: PricingPlan) =>
      pricingPlansApi.update(plan.id, { ...plan, is_default: true }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pricing-plans"] });
      toast.success("Đã đặt làm bảng giá mặc định");
    },
    onError: (err) => {
      toast.error(`Lỗi: ${apiError(err)}`);
    },
  });

  const plans = useMemo(() => {
    const list = q.data || [];
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        (p.description && p.description.toLowerCase().includes(term)),
    );
  }, [q.data, search]);

  const startCreate = () => {
    setEditing(null);
    setFormData(defaultFormData);
    setModalOpen(true);
  };

  const startEdit = (plan: PricingPlan) => {
    setEditing(plan);
    setFormData(plan);
    setModalOpen(true);
  };

  const handleDelete = (plan: PricingPlan) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa bảng giá "${plan.name}"?`)) {
      deleteMutation.mutate(plan.id);
    }
  };

  if (q.isLoading) return <Loading />;
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("nav.pricingPlans", "BẢNG GIÁ TIỀN")}</p>
          <h1>{t("pricing.title", "Quản lý Bảng giá")}</h1>
          <p className="muted">
            {t(
              "pricing.subtitle",
              "Thiết lập chi tiết giá theo giờ lẻ, combo lẻ, giá qua đêm, ngày đêm và phụ thu khách thêm",
            )}
          </p>
        </div>
        <button className="primary" onClick={startCreate}>
          <Plus size={17} /> {t("pricing.createBtn", "Tạo bảng giá mới")}
        </button>
      </div>

      <div className="panel">
        <div className="toolbar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search", "Tìm kiếm bảng giá...")}
            style={{ maxWidth: 320 }}
          />
          <span className="toolbar-meta">
            Tổng số: <b>{plans.length}</b> bảng giá
          </span>
        </div>

        <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {plans.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-muted)" }}>
              {t("common.empty", "Chưa có bảng giá nào")}
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                style={{
                  border: plan.is_default
                    ? "2px solid var(--color-primary)"
                    : "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  background: "var(--color-surface)",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {/* Header card */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    borderBottom: "1px solid var(--color-border)",
                    paddingBottom: "14px",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Tag size={19} color="var(--color-primary)" />
                      <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
                        {plan.name}
                      </h3>
                      {plan.is_default ? (
                        <span className="badge badge-success" style={{ fontWeight: 600 }}>
                          Mặc định
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="ghost text-sm"
                          style={{ padding: "2px 8px", fontSize: "12px", height: "auto" }}
                          disabled={setDefaultMutation.isPending}
                          onClick={() => setDefaultMutation.mutate(plan)}
                        >
                          Đặt làm mặc định
                        </button>
                      )}
                    </div>
                    {plan.description && (
                      <p
                        style={{
                          margin: "6px 0 0",
                          fontSize: "13px",
                          color: "var(--color-muted)",
                        }}
                      >
                        {plan.description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="ghost" onClick={() => startEdit(plan)} title="Chỉnh sửa">
                      <Pencil size={15} /> Sửa
                    </button>
                    {!plan.is_default && (
                      <button
                        className="danger ghost"
                        onClick={() => handleDelete(plan)}
                        disabled={deleteMutation.isPending}
                        title="Xóa"
                      >
                        <Trash2 size={15} /> Xóa
                      </button>
                    )}
                  </div>
                </div>

                {/* Grid chi tiết giá */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "16px",
                  }}
                >
                  {/* Cột 1: Giờ lẻ & Combo lẻ */}
                  <div
                    style={{
                      background: "var(--color-surface-2)",
                      borderRadius: "var(--radius-sm)",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 600,
                        fontSize: "13px",
                        marginBottom: "10px",
                        color: "var(--color-primary)",
                      }}
                    >
                      <Clock size={16} /> Giờ lẻ & Combo lẻ
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="muted">{plan.hourly_first_hours}h đầu tiên:</span>
                        <b>{formatVND(plan.hourly_first_price)}</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="muted">Mỗi giờ tiếp theo:</span>
                        <b>{formatVND(plan.hourly_next_price)}/h</b>
                      </div>
                      <div style={{ borderTop: "1px dashed var(--color-border)", margin: "4px 0" }} />
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="muted">Combo 4 giờ:</span>
                        <b>{formatVND(plan.combo_4h_price)}</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="muted">Combo 8 giờ:</span>
                        <b>{formatVND(plan.combo_8h_price)}</b>
                      </div>
                    </div>
                  </div>

                  {/* Cột 2: Giá qua đêm */}
                  <div
                    style={{
                      background: "var(--color-surface-2)",
                      borderRadius: "var(--radius-sm)",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 600,
                        fontSize: "13px",
                        marginBottom: "10px",
                        color: "#8b5cf6",
                      }}
                    >
                      <Moon size={16} /> Giá qua đêm ({plan.overnight_check_in || "22h"} – {plan.overnight_check_out || "9h"})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="muted">Thứ 2 – Thứ 5:</span>
                        <b>{formatVND(plan.overnight_weekday_price)}</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="muted">Thứ 6 – Chủ Nhật:</span>
                        <b style={{ color: "var(--color-primary)" }}>{formatVND(plan.overnight_weekend_price)}</b>
                      </div>
                    </div>
                  </div>

                  {/* Cột 3: Combo ngày đêm */}
                  <div
                    style={{
                      background: "var(--color-surface-2)",
                      borderRadius: "var(--radius-sm)",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 600,
                        fontSize: "13px",
                        marginBottom: "10px",
                        color: "#f59e0b",
                      }}
                    >
                      <CalendarDays size={16} /> Combo ngày đêm ({plan.daily_check_in || "14h"} – {plan.daily_check_out || "11h"})
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="muted">Thứ 2 – Thứ 5:</span>
                        <b>{formatVND(plan.daily_weekday_price)}</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="muted">Thứ 6 – Chủ Nhật:</span>
                        <b style={{ color: "var(--color-primary)" }}>{formatVND(plan.daily_weekend_price)}</b>
                      </div>
                    </div>
                  </div>

                  {/* Cột 4: Phụ thu & Số người */}
                  <div
                    style={{
                      background: "var(--color-surface-2)",
                      borderRadius: "var(--radius-sm)",
                      padding: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontWeight: 600,
                        fontSize: "13px",
                        marginBottom: "10px",
                        color: "#10b981",
                      }}
                    >
                      <Users size={16} /> Chính sách phụ thu
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", fontSize: "13px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="muted">Tiêu chuẩn:</span>
                        <b>{plan.standard_guest_count || 2} người lớn</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="muted">Từ người thứ {Number(plan.standard_guest_count || 2) + 1}:</span>
                        <b>+{formatVND(plan.extra_guest_fee)}/người</b>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span className="muted">Phụ thu lễ tết:</span>
                        <b>+{formatVND(plan.holiday_surcharge)}/phòng/đêm</b>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL TẠO / SỬA BẢNG GIÁ */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Chỉnh sửa Bảng giá" : "Tạo Bảng giá mới"}
        description="Điền thông tin chi tiết các mức giá giờ lẻ, qua đêm, ngày đêm và phụ thu"
        footer={
          <>
            <button className="ghost" onClick={() => setModalOpen(false)}>
              {t("common.cancel", "Hủy")}
            </button>
            <button
              className="primary"
              form="pricing-plan-form"
              disabled={saveMutation.isPending}
            >
              {saveMutation.isPending ? t("common.loading", "Đang lưu...") : t("common.save", "Lưu bảng giá")}
            </button>
          </>
        }
      >
        <form
          id="pricing-plan-form"
          className="form-grid"
          onSubmit={(e) => {
            e.preventDefault();
            if (!formData.name?.trim()) {
              toast.error("Vui lòng nhập tên bảng giá");
              return;
            }
            saveMutation.mutate(formData);
          }}
        >
          {/* Section 1: Thông tin cơ bản */}
          <div className="span-2" style={{ fontWeight: 600, fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: "4px", color: "var(--color-primary)" }}>
            1. THÔNG TIN CƠ BẢN
          </div>
          <label className="span-2">
            <span>Tên bảng giá *</span>
            <input
              required
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ví dụ: Bảng giá tiêu chuẩn, Bảng giá mùa lễ..."
            />
          </label>
          <label className="span-2">
            <span>Mô tả</span>
            <input
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ghi chú thêm về bảng giá"
            />
          </label>
          <label className="span-2" style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={Boolean(formData.is_default)}
              onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
              style={{ width: "16px", height: "16px" }}
            />
            <span>Đặt làm bảng giá mặc định</span>
          </label>

          {/* Section 2: Giờ lẻ & combo lẻ */}
          <div className="span-2" style={{ fontWeight: 600, fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: "4px", marginTop: "10px", color: "var(--color-primary)" }}>
            2. GIỜ LẺ VÀ COMBO LẺ
          </div>
          <label>
            <span>Số giờ đầu tiên (h)</span>
            <input
              type="number"
              min="1"
              value={formData.hourly_first_hours ?? 2}
              onChange={(e) => setFormData({ ...formData, hourly_first_hours: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>Giá cho số giờ đầu tiên (₫)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.hourly_first_price ?? 249000}
              onChange={(e) => setFormData({ ...formData, hourly_first_price: Number(e.target.value) })}
            />
          </label>
          <label className="span-2">
            <span>Giá mỗi giờ tiếp theo (₫/h)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.hourly_next_price ?? 69000}
              onChange={(e) => setFormData({ ...formData, hourly_next_price: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>Combo 4 giờ (₫)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.combo_4h_price ?? 359000}
              onChange={(e) => setFormData({ ...formData, combo_4h_price: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>Combo 8 giờ (₫)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.combo_8h_price ?? 489000}
              onChange={(e) => setFormData({ ...formData, combo_8h_price: Number(e.target.value) })}
            />
          </label>

          {/* Section 3: Giá qua đêm */}
          <div className="span-2" style={{ fontWeight: 600, fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: "4px", marginTop: "10px", color: "var(--color-primary)" }}>
            3. GIÁ QUA ĐÊM (Mặc định 22h – 9h)
          </div>
          <label>
            <span>Khung giờ nhận phòng</span>
            <input
              value={formData.overnight_check_in || "22:00"}
              onChange={(e) => setFormData({ ...formData, overnight_check_in: e.target.value })}
              placeholder="22:00"
            />
          </label>
          <label>
            <span>Khung giờ trả phòng</span>
            <input
              value={formData.overnight_check_out || "09:00"}
              onChange={(e) => setFormData({ ...formData, overnight_check_out: e.target.value })}
              placeholder="09:00"
            />
          </label>
          <label>
            <span>Giá qua đêm T2 – T5 (₫)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.overnight_weekday_price ?? 429000}
              onChange={(e) => setFormData({ ...formData, overnight_weekday_price: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>Giá qua đêm T6 – CN (₫)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.overnight_weekend_price ?? 499000}
              onChange={(e) => setFormData({ ...formData, overnight_weekend_price: Number(e.target.value) })}
            />
          </label>

          {/* Section 4: Combo ngày đêm */}
          <div className="span-2" style={{ fontWeight: 600, fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: "4px", marginTop: "10px", color: "var(--color-primary)" }}>
            4. COMBO NGÀY ĐÊM (Mặc định 14h – 11h)
          </div>
          <label>
            <span>Khung giờ nhận phòng</span>
            <input
              value={formData.daily_check_in || "14:00"}
              onChange={(e) => setFormData({ ...formData, daily_check_in: e.target.value })}
              placeholder="14:00"
            />
          </label>
          <label>
            <span>Khung giờ trả phòng</span>
            <input
              value={formData.daily_check_out || "11:00"}
              onChange={(e) => setFormData({ ...formData, daily_check_out: e.target.value })}
              placeholder="11:00"
            />
          </label>
          <label>
            <span>Combo ngày đêm T2 – T5 (₫)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.daily_weekday_price ?? 599000}
              onChange={(e) => setFormData({ ...formData, daily_weekday_price: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>Combo ngày đêm T6 – CN (₫)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.daily_weekend_price ?? 699000}
              onChange={(e) => setFormData({ ...formData, daily_weekend_price: Number(e.target.value) })}
            />
          </label>

          {/* Section 5: Phụ thu & Số người */}
          <div className="span-2" style={{ fontWeight: 600, fontSize: "14px", borderBottom: "1px solid var(--color-border)", paddingBottom: "4px", marginTop: "10px", color: "var(--color-primary)" }}>
            5. CHÍNH SÁCH PHỤ THU
          </div>
          <label>
            <span>Số người lớn tiêu chuẩn</span>
            <input
              type="number"
              min="1"
              value={formData.standard_guest_count ?? 2}
              onChange={(e) => setFormData({ ...formData, standard_guest_count: Number(e.target.value) })}
            />
          </label>
          <label>
            <span>Phụ thu khách thêm từ người thứ {Number(formData.standard_guest_count || 2) + 1} (₫/người)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.extra_guest_fee ?? 100000}
              onChange={(e) => setFormData({ ...formData, extra_guest_fee: Number(e.target.value) })}
            />
          </label>
          <label className="span-2">
            <span>Phụ thu ngày lễ tết (₫/phòng/đêm)</span>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.holiday_surcharge ?? 100000}
              onChange={(e) => setFormData({ ...formData, holiday_surcharge: Number(e.target.value) })}
            />
          </label>
        </form>
      </Modal>
    </>
  );
}
