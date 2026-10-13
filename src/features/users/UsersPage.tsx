import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Users, ShieldAlert, Home, UserCheck, Search } from "lucide-react";
import { usersApi } from "../dashboard/api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";

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
    onError: () =>
      toast.error(t("users.roleError") || "Không thể cập nhật vai trò người dùng"),
  });

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
      <PageHead title={t("nav.users")} desc={t("management.usersDesc")} />

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
                        ) : (
                          <select
                            className="status-inline-select"
                            aria-label={t("users.changeRole")}
                            value={u.role}
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
