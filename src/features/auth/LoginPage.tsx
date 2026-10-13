import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { login, getMe } from "./api";
import { apiError } from "../../services/http";
import { queryClient } from "../../services/query";

export function LoginPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@admin.com");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error(t("auth.required"));
      return;
    }
    setLoading(true);
    try {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      const data = await login({ email, password });
      const accessToken = data.session?.access_token || data.access_token;
      const refreshToken = data.session?.refresh_token || data.refresh_token;

      if (!accessToken) {
        throw new Error("Missing access token in login response");
      }
      localStorage.setItem("access_token", accessToken);
      if (refreshToken) {
        localStorage.setItem("refresh_token", refreshToken);
      }

      const me = await getMe();
      if (me.user?.id) localStorage.setItem("user_id", me.user.id);
      localStorage.setItem("user_role", me.role || "CUSTOMER");
      if (me.profile?.full_name) {
        localStorage.setItem("user_name", me.profile.full_name);
      }

      if (!["ADMIN", "SUPER_ADMIN"].includes(me.role)) {
        localStorage.clear();
        toast.error(t("auth.invalidRole"));
        return;
      }

      // Clear all cached query errors from previous sessions
      queryClient.clear();
      toast.success(t("common.success"));
      nav("/admin");
    } catch (error) {
      toast.error(`${t("auth.loginFailed")}: ${apiError(error)}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="login">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">
          <div className="brandmark">H</div>
          <div>
            <b>{t("brand")}</b>
            <span>{t("adminConsole")}</span>
          </div>
        </div>
        <p className="eyebrow">{t("auth.welcome")}</p>
        <h1>{t("auth.title")}</h1>
        <p className="muted">{t("auth.description")}</p>
        <label>
          {t("auth.email")}
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
          />
        </label>
        <label>
          {t("auth.password")}
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </label>
        <button className="primary wide" disabled={loading}>
          {loading ? t("common.loading") : t("auth.signIn")}
        </button>
      </form>
    </div>
  );
}
