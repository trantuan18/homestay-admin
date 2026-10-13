import axios from "axios";
const baseURL = import.meta.env.DEV
  ? ""
  : import.meta.env.VITE_API_URL || "http://localhost:3000";
export const http = axios.create({
  baseURL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  const lang =
    localStorage.getItem("language") ||
    ((navigator.language || "vi").toLowerCase().startsWith("en") ? "en" : "vi");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers["Accept-Language"] = lang;
  return config;
});
let refreshing = false;
let queue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  config: any;
}> = [];

const flush = (token: string) => {
  queue.forEach(({ resolve, config }) => {
    config.headers.Authorization = `Bearer ${token}`;
    resolve(http(config));
  });
  queue = [];
};

const rejectQueue = (err: unknown) => {
  queue.forEach(({ reject }) => reject(err));
  queue = [];
};

const redirectToLogin = () => {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  if (window.location.pathname !== "/login") window.location.assign("/login");
};

http.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    const isLoginRequest = original?.url?.includes("/api/auth/login");
    if (error.response?.status !== 401 || isLoginRequest) throw error;
    if (original?._retry || !localStorage.getItem("refresh_token")) {
      redirectToLogin();
      throw error;
    }
    original._retry = true;
    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({ resolve, reject, config: original });
      });
    }
    refreshing = true;
    try {
      const { data } = await axios.post(`${baseURL}/api/auth/refresh`, {
        refresh_token: localStorage.getItem("refresh_token"),
      });
      const nextAccess = data.session?.access_token || data.access_token;
      const nextRefresh = data.session?.refresh_token || data.refresh_token;
      if (!nextAccess) throw new Error("No access token in refresh response");
      localStorage.setItem("access_token", nextAccess);
      if (nextRefresh)
        localStorage.setItem("refresh_token", nextRefresh);
      flush(nextAccess);
      original.headers.Authorization = `Bearer ${nextAccess}`;
      return http(original);
    } catch (e) {
      rejectQueue(e);
      redirectToLogin();
      throw e;
    } finally {
      refreshing = false;
    }
  },
);
export const apiError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const response = error.response?.data as
      | {
          message?: unknown;
          error?: unknown;
          errors?: unknown;
        }
      | undefined;
    const message = response?.message ?? response?.error ?? response?.errors;
    if (typeof message === "string") return message;
    if (Array.isArray(message))
      return message
        .map((item) =>
          typeof item === "string"
            ? item
            : item && typeof item === "object" && "message" in item
              ? String(item.message)
              : JSON.stringify(item),
        )
        .join("; ");
    if (message && typeof message === "object" && "message" in message)
      return String(message.message);
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Unknown error";
};
