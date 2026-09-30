import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { login, getMe } from "./api";
import { apiError } from "../../services/http";
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
      localStorage.setItem(
        "access_token",
        data.session?.access_token || data.access_token,
      );
      if (data.session?.refresh_token)
        localStorage.setItem("refresh_token", data.session.refresh_token);
      const me = await getMe();
      localStorage.setItem("user_id", me.user.id);
      localStorage.setItem("user_role", me.role);
      if (!["ADMIN", "SUPER_ADMIN"].includes(me.role)) {
        localStorage.clear();
        toast.error(t("auth.invalidRole"));
        return;
      }
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
