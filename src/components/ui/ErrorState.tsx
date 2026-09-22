import { useTranslation } from "react-i18next";
import { apiError } from "../../services/http";
export function ErrorState({
  error,
  message,
  onRetry,
}: {
  error?: unknown;
  message?: string;
  onRetry?: () => void;
}) {
  const { t } = useTranslation();
  const detail = message || (error ? apiError(error) : "");
  return (
    <div className="state-card">
      <h3>{t("common.error")}</h3>
      {detail && <p className="muted">{detail}</p>}
      {onRetry && (
        <button className="secondary" onClick={onRetry}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
