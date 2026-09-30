import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { usersApi } from "../dashboard/api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
export function UsersPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [roles, setRoles] = useState<Record<string, string>>({});
  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => usersApi.list({ offset: 0, limit: 50 }),
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
      toast.success(t("users.roleSaved"));
    },
    onError: () => toast.error(t("users.roleError")),
  });
  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const data = q.data?.data || [];
  return (
    <>
      <PageHead title={t("nav.users")} desc={t("management.usersDesc")} />
      <div className="panel">
        <div className="toolbar">
          <input placeholder={t("common.search")} />
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("table.name")}</th>
                <th>{t("table.email")}</th>
                <th>{t("table.role")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.length ? (
                data.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name || "—"}</td>
                    <td>{u.email || "—"}</td>
                    <td>
                      <span className="role-chip">{u.role}</span>
                    </td>
                    <td>
                      <select
                        aria-label={t("users.changeRole")}
                        value={roles[u.id] ?? u.role}
                        disabled={updateRole.isPending}
                        onChange={(event) =>
                          setRoles((current) => ({
                            ...current,
                            [u.id]: event.target.value,
                          }))
                        }
                      >
                        {[
                          "CUSTOMER",
                          "HOST",
                          "STAFF",
                          "ADMIN",
                          ...(localStorage.getItem("user_role") ===
                          "SUPER_ADMIN"
                            ? ["SUPER_ADMIN"]
                            : []),
                        ].map((role) => (
                          <option key={role}>{role}</option>
                        ))}
                      </select>
                      <button
                        className="ghost"
                        disabled={
                          updateRole.isPending ||
                          (roles[u.id] ?? u.role) === u.role
                        }
                        onClick={() =>
                          updateRole.mutate({
                            id: u.id,
                            role: (roles[u.id] ?? u.role) as
                              | "CUSTOMER"
                              | "HOST"
                              | "STAFF"
                              | "ADMIN"
                              | "SUPER_ADMIN",
                          })
                        }
                      >
                        {t("common.save")}
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
