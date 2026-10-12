import { useState, useMemo } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { RefreshCw } from "lucide-react";
import { bookingsApi, paymentsApi } from "../dashboard/api";
import type { Booking } from "../../types/api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";

export function PaymentsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const [selected, setSelected] = useState<Booking | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "UNPAID" | "PARTIAL" | "PAID" | "FAILED" | "REFUNDED"
  >("PAID");
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("MANUAL");
  const [transactionId, setTransactionId] = useState("");

  const q = useQuery({
    queryKey: ["admin-payments-bookings"],
    queryFn: () => bookingsApi.list({ offset: 0, limit: 100 }),
  });

  const history = useQuery({
    queryKey: ["admin-payment-history", selected?.id],
    queryFn: () => paymentsApi.list(selected!.id),
    enabled: Boolean(selected),
  });

  const record = useMutation({
    mutationFn: () =>
      paymentsApi.record(selected!.id, {
        payment_status: paymentStatus,
        ...(paymentStatus === "PAID" || paymentStatus === "PARTIAL"
          ? { amount: Number(amount) }
          : {}),
        provider: provider || "MANUAL",
        transaction_id: transactionId || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payments-bookings"] });
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      qc.invalidateQueries({
        queryKey: ["admin-payment-history", selected?.id],
      });
      toast.success(t("payments.saved"));
      setSelected(null);
    },
    onError: () => toast.error(t("payments.saveError")),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (
      (paymentStatus === "PAID" || paymentStatus === "PARTIAL") &&
      (!Number(amount) || Number(amount) <= 0)
    ) {
      toast.error(t("payments.amountRequired"));
      return;
    }
    record.mutate();
  };

  const filteredData = useMemo(() => {
    const list = q.data?.data || [];
    const s = search.trim().toLowerCase();
    return list.filter((b) => {
      const matchSearch =
        !s ||
        [b.booking_code, b.guest_name, b.guest_phone, b.guest_email].some((v) =>
          (v || "").toLowerCase().includes(s),
        );
      const matchStatus =
        filterStatus === "ALL" || b.payment_status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [q.data, search, filterStatus]);

  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;

  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">{t("nav.payments").toUpperCase()}</p>
          <h1>{t("nav.payments")}</h1>
          <p className="muted">{t("management.paymentsDesc")}</p>
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
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            aria-label="Filter payment status"
          >
            <option value="ALL">{t("common.all")} Trạng thái</option>
            <option value="UNPAID">Chưa thanh toán (UNPAID)</option>
            <option value="PARTIAL">Thanh toán một phần (PARTIAL)</option>
            <option value="PAID">Đã thanh toán (PAID)</option>
            <option value="REFUNDED">Hoàn tiền (REFUNDED)</option>
            <option value="FAILED">Thất bại (FAILED)</option>
          </select>
          <button
            className="ghost icon-btn"
            onClick={() => q.refetch()}
            disabled={q.isFetching}
            title={t("common.refresh")}
          >
            <RefreshCw size={16} />
          </button>
          <span className="toolbar-meta">
            {filteredData.length} / {q.data?.data?.length || 0}
          </span>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t("table.booking")}</th>
                <th>{t("table.guest")}</th>
                <th>{t("table.total")}</th>
                <th>{t("table.payment")}</th>
                <th>{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length ? (
                filteredData.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <b>{booking.booking_code}</b>
                      {booking.created_at && (
                        <small className="subline">
                          {new Date(booking.created_at).toLocaleDateString()}
                        </small>
                      )}
                    </td>
                    <td>
                      <b>{booking.guest_name || "—"}</b>
                      {booking.guest_phone && (
                        <small className="subline">{booking.guest_phone}</small>
                      )}
                    </td>
                    <td>
                      {new Intl.NumberFormat("vi-VN").format(booking.total)} ₫
                    </td>
                    <td>
                      <StatusBadge status={booking.payment_status} />
                    </td>
                    <td>
                      <button
                        className="ghost"
                        onClick={() => {
                          setSelected(booking);
                          setPaymentStatus(
                            booking.payment_status === "PARTIAL"
                              ? "PARTIAL"
                              : "PAID",
                          );
                          setAmount(String(Math.max(booking.total, 0)));
                          setProvider("MANUAL");
                          setTransactionId("");
                        }}
                      >
                        {t("payments.manage")}
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
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={t("payments.manageTitle")}
        description={`${selected?.booking_code} · Khách: ${selected?.guest_name || "Khách vãng lai"}`}
        footer={
          <>
            <button className="ghost" onClick={() => setSelected(null)}>
              {t("common.cancel")}
            </button>
            <button
              className="primary"
              form="payment-form"
              disabled={record.isPending}
            >
              {record.isPending ? t("common.loading") : t("common.save")}
            </button>
          </>
        }
      >
        {history.isLoading ? (
          <Loading />
        ) : history.isError ? (
          <ErrorState error={history.error} onRetry={() => history.refetch()} />
        ) : (
          <>
            <p style={{ margin: "0 0 0.5rem" }}>
              <b>{t("payments.history")}</b>
            </p>
            {history.data?.data?.length ? (
              <div className="table-wrap" style={{ marginBottom: "1rem" }}>
                <table>
                  <thead>
                    <tr>
                      <th>{t("table.payment")}</th>
                      <th>{t("table.total")}</th>
                      <th>Cổng</th>
                      <th>Mã GD</th>
                      <th>{t("table.time")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.data.data.map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          <StatusBadge status={payment.status} />
                        </td>
                        <td>
                          <b>
                            {new Intl.NumberFormat("vi-VN").format(
                              payment.amount,
                            )}{" "}
                            ₫
                          </b>
                        </td>
                        <td>{payment.provider}</td>
                        <td>
                          <small>{payment.transaction_id || "—"}</small>
                        </td>
                        <td>
                          {payment.paid_at || payment.created_at
                            ? new Date(
                                (payment.paid_at || payment.created_at)!,
                              ).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted" style={{ marginBottom: "1rem" }}>
                Chưa có giao dịch thanh toán nào được ghi nhận.
              </p>
            )}

            <p style={{ margin: "0 0 0.5rem" }}>
              <b>Cập nhật / Ghi nhận thanh toán</b>
            </p>
            <form id="payment-form" className="form-grid" onSubmit={submit}>
              <label>
                <span>{t("common.status")}</span>
                <select
                  value={paymentStatus}
                  onChange={(event) =>
                    setPaymentStatus(event.target.value as typeof paymentStatus)
                  }
                >
                  {["UNPAID", "PARTIAL", "PAID", "FAILED", "REFUNDED"].map(
                    (value) => (
                      <option key={value}>{value}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                <span>Phương thức / Cổng</span>
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                >
                  <option value="MANUAL">Thủ công (MANUAL)</option>
                  <option value="CASH">Tiền mặt (CASH)</option>
                  <option value="BANK_TRANSFER">Chuyển khoản (BANK_TRANSFER)</option>
                  <option value="CREDIT_CARD">Thẻ (CREDIT_CARD)</option>
                </select>
              </label>
              <label>
                <span>{t("table.total")} (VNĐ)</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  disabled={
                    paymentStatus !== "PAID" && paymentStatus !== "PARTIAL"
                  }
                />
              </label>
              <label>
                <span>{t("payments.transactionId")}</span>
                <input
                  placeholder="Mã tham chiếu ngân hàng..."
                  value={transactionId}
                  onChange={(event) => setTransactionId(event.target.value)}
                />
              </label>
            </form>
          </>
        )}
      </Modal>
    </>
  );
}
