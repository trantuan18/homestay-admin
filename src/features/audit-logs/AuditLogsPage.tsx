import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { RefreshCw, Eye } from "lucide-react";
import { auditLogsApi } from "../dashboard/api";
import type { AuditLog } from "../../types/api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { Modal } from "../../components/ui/Modal";

export function AuditLogsPage() {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const q = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => auditLogsApi.list({ limit: 100 }),
    staleTime: 15_000,
  });

  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  const logs = q.data?.data || [];

  const filteredLogs = logs.filter((log) => {
    const s = search.trim().toLowerCase();
    const matchesSearch =
      !s ||
      [log.action, log.entity_type, log.entity_id, log.user_id, log.profiles?.full_name].some(
        (v) => (v || "").toLowerCase().includes(s),
      );
    const matchesAction = actionFilter === "ALL" || log.action === actionFilter;
    const matchesEntity = entityFilter === "ALL" || log.entity_type === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  const actions = Array.from(new Set(logs.map((l) => l.action))).filter(Boolean);
  const entities = Array.from(new Set(logs.map((l) => l.entity_type))).filter(Boolean);

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("nav.auditLogs", "NHẬT KÝ HỆ THỐNG").toUpperCase()}</p>
          <h1>{t("nav.auditLogs", "Nhật ký hệ thống")}</h1>
          <p className="muted">{t("auditLogs.desc", "Theo dõi và kiểm tra lịch sử thao tác của quản trị viên và hệ thống.")}</p>
        </div>
      </div>

      <div className="panel">
        <div className="toolbar">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search")}
          />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            aria-label="Filter Action"
          >
            <option value="ALL">{t("common.all")} Hành động</option>
            {actions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
          <select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            aria-label="Filter Entity"
          >
            <option value="ALL">{t("common.all")} Đối tượng</option>
            {entities.map((ent) => (
              <option key={ent} value={ent}>
                {ent}
              </option>
            ))}
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
            {filteredLogs.length} / {logs.length}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("auditLogs.action", "Hành động")}</th>
                <th>{t("auditLogs.entity", "Đối tượng")}</th>
                <th>{t("auditLogs.actor", "Người thực hiện")}</th>
                <th>{t("auditLogs.time", "Thời gian")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length ? (
                filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <span className="role-chip" style={{ background: "var(--accent-muted, rgba(99,102,241,0.1))", color: "var(--accent)" }}>
                        {log.action}
                      </span>
                    </td>
                    <td>
                      <b>{log.entity_type}</b>
                      {log.entity_id && (
                        <small className="subline" title={log.entity_id}>
                          {log.entity_id.slice(0, 8)}...
                        </small>
                      )}
                    </td>
                    <td>
                      {log.profiles?.full_name ? (
                        <span>{log.profiles.full_name}</span>
                      ) : (
                        <span className="muted">{log.user_id ? `${log.user_id.slice(0, 8)}...` : "Hệ thống"}</span>
                      )}
                    </td>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>
                      <button
                        className="ghost icon-btn"
                        onClick={() => setSelectedLog(log)}
                        title={t("common.viewAll")}
                      >
                        <Eye size={15} />
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

      <Modal
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={selectedLog?.action || "Chi tiết Audit Log"}
        description={`${selectedLog?.entity_type} · ${selectedLog?.entity_id}`}
        footer={
          <button className="primary" onClick={() => setSelectedLog(null)}>
            {t("common.cancel")}
          </button>
        }
      >
        {selectedLog && (
          <div className="audit-detail-content" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Thời gian thực hiện
              </p>
              <b>{new Date(selectedLog.created_at).toLocaleString()}</b>
            </div>
            <div>
              <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                Người thực hiện (Actor ID)
              </p>
              <code>{selectedLog.user_id}</code>
              {selectedLog.profiles?.full_name && <span> ({selectedLog.profiles.full_name})</span>}
            </div>
            {selectedLog.old_value && (
              <div>
                <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Giá trị trước (Old Value)
                </p>
                <pre
                  style={{
                    background: "var(--surface-sunken, #0f172a)",
                    padding: "0.75rem",
                    borderRadius: "6px",
                    overflowX: "auto",
                    fontSize: "0.8rem",
                  }}
                >
                  {JSON.stringify(selectedLog.old_value, null, 2)}
                </pre>
              </div>
            )}
            {selectedLog.new_value && (
              <div>
                <p className="muted" style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                  Giá trị sau (New Value)
                </p>
                <pre
                  style={{
                    background: "var(--surface-sunken, #0f172a)",
                    padding: "0.75rem",
                    borderRadius: "6px",
                    overflowX: "auto",
                    fontSize: "0.8rem",
                  }}
                >
                  {JSON.stringify(selectedLog.new_value, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
