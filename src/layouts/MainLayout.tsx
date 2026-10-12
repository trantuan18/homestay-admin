import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  CalendarDays,
  CreditCard,
  Users,
  BarChart3,
  History,
  Settings,
  Bell,
  Sun,
  Moon,
  Menu,
  LogOut,
  Globe,
  Check,
  Tag,
} from "lucide-react";
import { useUIStore } from "../store/ui";
import { logout } from "../features/auth/api";
import { notificationsApi } from "../features/dashboard/api";

const nav = [
  ["/admin", "nav.dashboard", LayoutDashboard],
  ["/admin/properties", "nav.properties", Building2],
  ["/admin/rooms", "nav.rooms", DoorOpen],
  ["/admin/pricing-plans", "nav.pricingPlans", Tag],
  ["/admin/bookings", "nav.bookings", CalendarDays],
  // ["/admin/payments", "nav.payments", CreditCard],
  ["/admin/users", "nav.users", Users],
  ["/admin/analytics", "nav.analytics", BarChart3],
  ["/admin/audit-logs", "nav.auditLogs", History],
] as const;

export function MainLayout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { sidebarCollapsed, dark, toggleSidebar, toggleDark } = useUIStore();
  const loc = useLocation();
  const navigate = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const userName = localStorage.getItem("user_name") || "Admin";
  const userRole = localStorage.getItem("user_role") || "ADMIN";
  const userInitials = userName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AD";

  const notifQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list({ limit: 20 }),
    refetchInterval: 30_000,
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const notifications = notifQuery.data?.data || [];
  const unreadCount =
    notifQuery.data?.unread_count ??
    notifications.filter((n) => !n.read_at).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [notifOpen]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.body.classList.toggle("dark", dark);
    return () => {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    };
  }, [dark]);

  const changeLang = () =>
    i18n.changeLanguage(i18n.language === "vi" ? "en" : "vi");

  const signOut = async () => {
    try {
      await logout();
    } finally {
      localStorage.clear();
      navigate("/login");
    }
  };

  return (
    <div className={`app ${dark ? "dark" : ""}`}>
      <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
        <div className="brand">
          <div className="brandmark">H</div>
          <div className="brand-copy">
            <b>{t("brand")}</b>
            <span>{t("adminConsole")}</span>
          </div>
        </div>
        <button className="collapse" onClick={toggleSidebar} aria-label="menu">
          <Menu size={18} />
        </button>
        <nav>
          {nav.map(([to, key, Icon]) => (
            <button
              key={to}
              className={loc.pathname === to ? "active" : ""}
              onClick={() => navigate(to)}
              title={sidebarCollapsed ? t(key) : undefined}
            >
              <Icon size={18} />
              <span>{t(key)}</span>
            </button>
          ))}
        </nav>
        {!sidebarCollapsed && (
          <div className="sidebar-bottom">
            <button onClick={() => navigate("/admin/audit-logs")}>
              <Settings size={18} />
              {t("nav.settings")}
            </button>
            <div className="user-mini">
              <div className="avatar">{userInitials}</div>
              <div>
                <b>{userName}</b>
                <span>{userRole}</span>
              </div>
              <button className="icon-btn" onClick={signOut} title={t("auth.logout", "Đăng xuất")}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
        )}
      </aside>
      <main className="main">
        <header>
          <div className="crumb">
            {t("brand")} <span>/</span>{" "}
            {nav.find((n) => n[0] === loc.pathname)
              ? t(nav.find((n) => n[0] === loc.pathname)![1])
              : t("nav.dashboard")}
          </div>
          <div className="header-actions">
            <div className="notif-wrapper" ref={notifRef} style={{ position: "relative" }}>
              <button
                className="icon-btn"
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label="Notifications"
                title={t("notifications.title", "Thông báo")}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      right: "2px",
                      background: "var(--danger, #ef4444)",
                      color: "white",
                      fontSize: "0.65rem",
                      fontWeight: "bold",
                      borderRadius: "10px",
                      padding: "1px 5px",
                      minWidth: "16px",
                      textAlign: "center",
                      lineHeight: "14px",
                    }}
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div
                  className="notif-dropdown panel"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: "340px",
                    maxHeight: "420px",
                    overflowY: "auto",
                    zIndex: 1000,
                    boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
                    padding: "0.75rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid var(--border)",
                      paddingBottom: "0.5rem",
                    }}
                  >
                    <b>{t("notifications.title", "Thông báo")}</b>
                    {unreadCount > 0 && (
                      <button
                        className="ghost"
                        style={{ fontSize: "0.75rem", padding: "2px 6px" }}
                        onClick={() => markAllRead.mutate()}
                        disabled={markAllRead.isPending}
                      >
                        <Check size={13} style={{ marginRight: "3px" }} />
                        {t("notifications.markAllRead", "Đọc tất cả")}
                      </button>
                    )}
                  </div>

                  {notifications.length ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.read_at) markRead.mutate(n.id);
                          }}
                          style={{
                            padding: "0.5rem",
                            borderRadius: "6px",
                            background: n.read_at
                              ? "transparent"
                              : "var(--accent-subtle, rgba(99,102,241,0.08))",
                            cursor: "pointer",
                            borderLeft: n.read_at ? "none" : "3px solid var(--accent)",
                            transition: "background 0.2s",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
                            <b>{n.title}</b>
                            <small className="muted" style={{ fontSize: "0.7rem" }}>
                              {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </small>
                          </div>
                          <p style={{ margin: "3px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {n.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted" style={{ textAlign: "center", padding: "1.5rem 0", margin: 0 }}>
                      {t("notifications.empty", "Không có thông báo mới")}
                    </p>
                  )}
                </div>
              )}
            </div>

            <button className="icon-btn" onClick={changeLang} title="Ngôn ngữ / Language">
              <Globe size={18} />
              <small>{i18n.language.toUpperCase()}</small>
            </button>
            <button className="icon-btn" onClick={toggleDark} title="Đổi giao diện Sáng / Tối">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="avatar" title={userName}>{userInitials}</div>
          </div>
        </header>
        <section className="content">{children}</section>
      </main>
    </div>
  );
}

