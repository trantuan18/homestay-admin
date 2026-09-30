import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { bookingsApi, paymentsApi } from "../dashboard/api";
import type { Booking } from "../../types/api";
import { Loading } from "../../components/ui/Loading";
import { ErrorState } from "../../components/ui/ErrorState";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Modal } from "../../components/ui/Modal";

export function PaymentsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Booking | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "UNPAID" | "PARTIAL" | "PAID" | "FAILED" | "REFUNDED"
  >("PAID");
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const q = useQuery({
    queryKey: ["admin-payments-bookings"],
    queryFn: () => bookingsApi.list({ offset: 0, limit: 50 }),
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
        provider: "MANUAL",
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
  if (q.isLoading) return <Loading />;
  if (q.isError)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const data = q.data?.data || [];
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
              {data.length ? (
                data.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <b>{booking.booking_code}</b>
                    </td>
                    <td>{booking.guest_name || "—"}</td>
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
        description={selected?.booking_code}
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
            <p>
              <b>{t("payments.history")}</b>
            </p>
            {history.data?.data.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>{t("table.payment")}</th>
                      <th>{t("table.total")}</th>
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
                          {new Intl.NumberFormat("vi-VN").format(
                            payment.amount,
                          )}{" "}
                          ₫
                        </td>
                        <td>
                          {payment.paid_at
                            ? new Date(payment.paid_at).toLocaleString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted">{t("common.empty")}</p>
            )}
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
                <span>{t("table.total")}</span>
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
              <label className="span-2">
                <span>{t("payments.transactionId")}</span>
                <input
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
