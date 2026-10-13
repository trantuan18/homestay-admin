import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Users,
  ShieldAlert,
  Home,
  UserCheck,
  Search,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import { usersApi } from "../dashboard/api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { Modal } from "../../components/ui/Modal";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Quản trị viên cấp cao",
  ADMIN: "Quản trị viên",
  STAFF: "Nhân viên",
  HOST: "Chủ homestay",
  CUSTOMER: "Khách hàng",
};

export function UsersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  const currentUserId = localStorage.getItem("user_id");
  const currentUserRole = localStorage.getItem("user_role") || "ADMIN";
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  // Modal create user state (SUPER_ADMIN only)
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [createForm, setCreateForm] = useState<{
    email: string;
    password: string;
    full_name: string;
    phone: string;
    role: "CUSTOMER" | "HOST" | "STAFF" | "ADMIN" | "SUPER_ADMIN";
  }>({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "CUSTOMER",
  });

  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => usersApi.list({ offset: 0, limit: 100 }),
  });

  const updateRole = useMutation({
    mutationFn: ({
      id,
      role,
    }: {
      id: string;
      role: "CUSTOMER" | "HOST" | "STAFF" | "ADMIN" | "SUPER_ADMIN";
    }) => usersApi.updateRole(id, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t("users.roleSaved") || "Đã cập nhật vai trò người dùng thành công");
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message;
      if (msg === "CANNOT_CHANGE_OWN_ROLE") {
        toast.error("Bạn không thể tự thay đổi vai trò của chính mình.");
      } else if (msg === "SUPER_ADMIN_REQUIRED") {
        toast.error("Chỉ Quản trị viên cấp cao (Super Admin) mới có quyền cấp vai trò này.");
      } else {
        toast.error(t("users.roleError") || "Không thể cập nhật vai trò người dùng");
      }
    },
  });

  const createUser = useMutation({
    mutationFn: (payload: typeof createForm) => usersApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t("users.createSuccess", "Tạo tài khoản người dùng thành công!"));
      setIsCreateOpen(false);
      setCreateForm({
        email: "",
        password: "",
        full_name: "",
        phone: "",
        role: "CUSTOMER",
      });
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message;
      if (msg === "INVALID_EMAIL") {
        toast.error("Email không hợp lệ.");
      } else if (msg === "PASSWORD_MIN_6_CHARS") {
        toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      } else if (
        msg?.includes("already registered") ||
        msg?.includes("already exists") ||
        msg === "EMAIL_EXISTS"
      ) {
        toast.error("Email này đã được sử dụng trong hệ thống.");
      } else if (msg === "SUPER_ADMIN_REQUIRED") {
        toast.error("Chỉ Super Admin mới có quyền tạo tài khoản.");
      } else {
        toast.error(msg || t("users.createError", "Không thể tạo tài khoản."));
      }
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.email.trim()) {
      toast.error("Vui lòng nhập email.");
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    createUser.mutate(createForm);
  };

  const allUsers = q.data?.data || [];

  // Summary statistics
  const stats = useMemo(() => {
    const total = allUsers.length;
    const adminStaff = allUsers.filter((u) =>
      ["SUPER_ADMIN", "ADMIN", "STAFF"].includes(u.role),
    ).length;
    const hosts = allUsers.filter((u) => u.role === "HOST").length;
    const customers = allUsers.filter((u) => u.role === "CUSTOMER").length;
    return { total, adminStaff, hosts, customers };
  }, [allUsers]);

  // Filtered users list
  const filteredUsers = useMemo(() => {
    const s = search.trim().toLowerCase();
    return allUsers.filter((u) => {
      const matchSearch =
        !s ||
        (u.full_name && u.full_name.toLowerCase().includes(s)) ||
        (u.email && u.email.toLowerCase().includes(s)) ||
        (u.phone && u.phone.toLowerCase().includes(s));

      const matchRole = roleFilter === "ALL" || u.role === roleFilter;

      return matchSearch && matchRole;
    });
  }, [allUsers, search, roleFilter]);

  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const allowedAssignRoles = [
    "CUSTOMER",
    "HOST",
    "STAFF",
    "ADMIN",
    ...(currentUserRole === "SUPER_ADMIN" ? ["SUPER_ADMIN"] : []),
  ];

  return (
    <>
      <PageHead
        title={t("nav.users")}
        desc={t("management.usersDesc")}
        action={
          isSuperAdmin ? (
            <button
              className="primary"
              style={{ display: "flex", alignItems: "center", gap: "6px" }}
              onClick={() => setIsCreateOpen(true)}
            >
              <UserPlus size={16} />
              {t("users.createUser", "Tạo tài khoản")}
            </button>
          ) : undefined
        }
      />

      {/* Summary KPI Cards */}
      <div className="stats">
        <div className="stat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{t("users.totalUsers", "Tổng người dùng")}</span>
            <Users size={16} color="var(--color-muted)" />
          </div>
          <strong>{stats.total}</strong>
          <small className="muted">Tài khoản trên toàn hệ thống</small>
        </div>
        <div className="stat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{t("users.adminStaff", "Quản trị & Nhân viên")}</span>
            <ShieldAlert size={16} color="var(--color-info)" />
          </div>
          <strong style={{ color: "var(--color-info)" }}>{stats.adminStaff}</strong>
          <small className="muted">Super Admin, Admin, Staff</small>
        </div>
        <div className="stat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{t("users.hosts", "Chủ homestay")}</span>
            <Home size={16} color="var(--color-warning)" />
          </div>
          <strong style={{ color: "var(--color-warning)" }}>{stats.hosts}</strong>
          <small className="muted">Đối tác quản lý cơ sở</small>
        </div>
        <div className="stat">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{t("users.customers", "Khách hàng")}</span>
            <UserCheck size={16} color="var(--color-success)" />
          </div>
          <strong style={{ color: "var(--color-success)" }}>{stats.customers}</strong>
          <small className="muted">Người dùng đặt phòng</small>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar" style={{ flexWrap: "wrap", justifyContent: "space-between", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
            <div style={{ position: "relative", width: "100%", maxWidth: "320px" }}>
              <input
                style={{ width: "100%", paddingLeft: "32px", boxSizing: "border-box" }}
                placeholder={t("common.search") + " theo tên, email, SĐT..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Search
                size={14}
                style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--color-muted)" }}
              />
            </div>

            <select
              className="status-inline-select"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              aria-label="Lọc theo vai trò"
            >
              <option value="ALL">Tất cả vai trò ({allUsers.length})</option>
              <option value="SUPER_ADMIN">Quản trị cấp cao</option>
              <option value="ADMIN">Quản trị viên</option>
              <option value="STAFF">Nhân viên</option>
              <option value="HOST">Chủ homestay</option>
              <option value="CUSTOMER">Khách hàng</option>
            </select>
          </div>

          <div style={{ fontSize: "12px", color: "var(--color-muted)", alignSelf: "center" }}>
            Hiển thị <b>{filteredUsers.length}</b> / {allUsers.length} người dùng
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("table.name", "Người dùng")}</th>
                <th>{t("table.email", "Email")}</th>
                <th>{t("users.phone", "Số điện thoại")}</th>
                <th>{t("table.role", "Vai trò")}</th>
                <th>{t("users.joinedAt", "Ngày tham gia")}</th>
                <th>{t("common.actions", "Thao tác")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length ? (
                filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const initials = (u.full_name || u.email || "U")
                    .trim()
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={u.id}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar-circle">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.full_name} />
                            ) : (
                              initials
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600 }}>
                              {u.full_name || "Chưa đặt tên"}
                              {isSelf && (
                                <span
                                  style={{
                                    marginLeft: "6px",
                                    fontSize: "10px",
                                    color: "var(--color-primary-strong)",
                                    fontWeight: 700,
                                  }}
                                >
                                  (Bạn)
                                </span>
                              )}
                            </div>
                            <small className="muted" style={{ fontSize: "11px" }}>
                              ID: {u.id.slice(0, 8)}...
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        {u.email ? (
                          <span style={{ fontSize: "12px" }}>{u.email}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        {u.phone ? (
                          <span style={{ fontSize: "12px" }}>{u.phone}</span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`role-chip role-${(u.role || "customer").toLowerCase()}`}>
                          {ROLE_LABELS[u.role] || u.role}
                        </span>
                      </td>
                      <td>
                        {u.created_at ? (
                          <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
                            {new Date(u.created_at).toLocaleDateString("vi-VN")}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {isSelf ? (
                          <span
                            className="role-chip"
                            style={{ opacity: 0.65, cursor: "not-allowed" }}
                            title="Bạn không thể tự đổi vai trò của chính mình"
                          >
                            Tài khoản hiện tại
                          </span>
                        ) : u.role === "SUPER_ADMIN" && !isSuperAdmin ? (
                          <span
                            className="role-chip role-super_admin"
                            style={{ opacity: 0.85, cursor: "not-allowed" }}
                            title="Chỉ Super Admin mới có quyền thay đổi vai trò tài khoản Super Admin"
                          >
                            Quản trị viên cấp cao
                          </span>
                        ) : (
                          <select
                            className="status-inline-select"
                            aria-label={t("users.changeRole", "Đổi vai trò")}
                            value={u.role || "CUSTOMER"}
                            disabled={updateRole.isPending}
                            onChange={(event) => {
                              const newRole = event.target.value as Parameters<
                                typeof usersApi.updateRole
                              >[1];
                              if (newRole === u.role) return;
                              updateRole.mutate({
                                id: u.id,
                                role: newRole,
                              });
                            }}
                          >
                            {allowedAssignRoles.map((role) => (
                              <option key={role} value={role}>
                                {ROLE_LABELS[role] || role}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="empty-cell">
                    {search || roleFilter !== "ALL"
                      ? "Không tìm thấy người dùng nào phù hợp với bộ lọc."
                      : t("common.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL (SUPER_ADMIN ONLY) */}
      <Modal
        open={isCreateOpen}
        onClose={() => {
          if (!createUser.isPending) setIsCreateOpen(false);
        }}
        title="Tạo tài khoản người dùng"
        description="Chức năng dành riêng cho Quản trị viên cấp cao. Tài khoản sẽ được kích hoạt ngay lập tức."
      >
        <form
          onSubmit={handleCreateSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "14px" }}
        >
          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                marginBottom: "5px",
              }}
            >
              Email <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              type="email"
              required
              placeholder="nguoidung@homestay.com"
              value={createForm.email}
              onChange={(e) =>
                setCreateForm((f) => ({ ...f, email: e.target.value }))
              }
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                marginBottom: "5px",
              }}
            >
              Mật khẩu <span style={{ color: "var(--color-error)" }}>*</span> (tối thiểu 6 ký tự)
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Nhập mật khẩu..."
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, password: e.target.value }))
                }
                style={{
                  width: "100%",
                  paddingRight: "40px",
                  boxSizing: "border-box",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "8px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-muted)",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                }}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "5px",
                }}
              >
                Họ và tên
              </label>
              <input
                type="text"
                placeholder="Nguyễn Văn A"
                value={createForm.full_name}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, full_name: e.target.value }))
                }
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "12px",
                  fontWeight: 600,
                  marginBottom: "5px",
                }}
              >
                Số điện thoại
              </label>
              <input
                type="tel"
                placeholder="0912 345 678"
                value={createForm.phone}
                onChange={(e) =>
                  setCreateForm((f) => ({ ...f, phone: e.target.value }))
                }
                style={{ width: "100%", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                fontWeight: 600,
                marginBottom: "5px",
              }}
            >
              Vai trò (Role)
            </label>
            <select
              value={createForm.role}
              onChange={(e) =>
                setCreateForm((f) => ({
                  ...f,
                  role: e.target.value as typeof createForm.role,
                }))
              }
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                background: "var(--color-bg)",
                color: "var(--color-text)",
                boxSizing: "border-box",
              }}
            >
              <option value="CUSTOMER">Khách hàng (CUSTOMER)</option>
              <option value="HOST">Chủ homestay (HOST)</option>
              <option value="STAFF">Nhân viên (STAFF)</option>
              <option value="ADMIN">Quản trị viên (ADMIN)</option>
              <option value="SUPER_ADMIN">Quản trị viên cấp cao (SUPER_ADMIN)</option>
            </select>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "8px",
              marginTop: "8px",
              paddingTop: "12px",
              borderTop: "1px solid var(--color-border)",
            }}
          >
            <button
              type="button"
              className="ghost"
              onClick={() => setIsCreateOpen(false)}
              disabled={createUser.isPending}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="primary"
              disabled={createUser.isPending}
            >
              {createUser.isPending ? "Đang tạo..." : "Xác nhận tạo tài khoản"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function PageHead({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        <p className="eyebrow">{title.toUpperCase()}</p>
        <h1>{title}</h1>
        <p className="muted">{desc}</p>
      </div>
      {action}
    </div>
  );
}
