import { useState } from "react";
import { Printer, X, CheckCircle2, Clock, MapPin, Phone, User, QrCode, Copy, Check, ShieldCheck, Building2 } from "lucide-react";
import type { Booking } from "../../types/api";

interface Props {
  booking: Booking | null;
  onClose: () => void;
}

const formatVND = (num?: number) =>
  new Intl.NumberFormat("vi-VN").format(num ?? 0) + " ₫";

export function BookingReceiptModal({ booking, onClose }: Props) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!booking) return null;

  const durationHours = (() => {
    if (!booking.start_at || !booking.end_at) return 0;
    const s = new Date(booking.start_at).getTime();
    const e = new Date(booking.end_at).getTime();
    const diff = Math.max(0, (e - s) / (1000 * 60 * 60));
    return Math.round(diff * 10) / 10;
  })();

  const durationDays = Math.max(1, Math.round(durationHours / 24));

  const standardGuests = booking.price_breakdown?.standard_guest_count ?? 2;
  const extraGuests =
    booking.price_breakdown?.extra_guest_count ??
    Math.max(0, (booking.guest_count || 1) - standardGuests);
  const extraGuestFee = booking.price_breakdown?.extra_guest_fee ?? 0;
  const roomPrice =
    booking.price_breakdown?.room_price !== undefined
      ? booking.price_breakdown.room_price
      : (booking.subtotal || booking.total) - extraGuestFee;

  // VietQR standard URL (BIDV - 8814357336)
  const accountNumber = "8814357336";
  const bankName = "BIDV - PGD Vân Phong (Ngân hàng TMCP Đầu tư và Phát triển Việt Nam)";
  const accountHolder = "NGUYEN HOA DIEU LINH";
  const transferContent = booking.booking_code;
  const vietQrUrl = `https://img.vietqr.io/image/970418-${accountNumber}-compact2.png?amount=${booking.total}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accountHolder)}`;

  const handlePrint = () => {
    window.print();
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const isPaid = booking.payment_status === "PAID";
  const isPartial = booking.payment_status === "PARTIAL";

  return (
    <div
      className="modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 23, 42, 0.72)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="receipt-modal-container"
        style={{
          background: "var(--color-surface, #ffffff)",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "780px",
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          overflow: "hidden",
        }}
      >
        {/* Modal Action Header (hidden on print) */}
        <div
          className="no-print"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "14px 20px",
            borderBottom: "1px solid var(--color-border, #e2e8f0)",
            background: "var(--color-surface-2, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "14px" }}>
            <Printer size={18} color="var(--color-primary-strong, #2563eb)" />
            <span>Biên lai đặt phòng & Thanh toán (Receipt)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              className="primary"
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 14px",
                borderRadius: "8px",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              <Printer size={16} /> In biên lai (Print)
            </button>
            <button
              type="button"
              className="ghost icon-btn"
              onClick={onClose}
              title="Đóng"
              aria-label="Close"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "6px",
                borderRadius: "6px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINTABLE RECEIPT CONTENT AREA */}
        <div
          id="booking-receipt-print-area"
          style={{
            padding: "32px 36px",
            overflowY: "auto",
            color: "#0f172a",
            background: "#ffffff",
            fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          }}
        >
          {/* 1. Header with Brand & Receipt Identity */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              borderBottom: "2px solid #e2e8f0",
              paddingBottom: "18px",
              marginBottom: "20px",
              gap: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {/* Enterprise Brand Logo */}
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #1e40af, #3b82f6)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  boxShadow: "0 6px 14px rgba(37, 99, 235, 0.28)",
                  flexShrink: 0,
                }}
              >
                <Building2 size={32} />
              </div>
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "20px",
                    fontWeight: 900,
                    color: "#0f172a",
                    letterSpacing: "-0.5px",
                    textTransform: "uppercase",
                  }}
                >
                  Joyfun Homestay
                </h1>
                <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                  Hệ thống Căn hộ dịch vụ & Nghỉ dưỡng cao cấp
                </p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                  📍 Hotline: <b>+84 888 366 395</b>
                </p>
              </div>
            </div>

            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div
                style={{
                  fontSize: "19px",
                  fontWeight: 900,
                  color: "#1e40af",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                BIÊN LAI THANH TOÁN
              </div>
              <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                MÃ ĐƠN: <b style={{ color: "#0f172a", fontSize: "15px", letterSpacing: "0.5px" }}>{booking.booking_code}</b>
              </div>
              <div style={{ fontSize: "11.5px", color: "#64748b", marginTop: "2px" }}>
                Ngày xuất: {new Date().toLocaleDateString("vi-VN")} {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>

          {/* 2. HERO SECTION: QR CODE PAYMENT CENTER (TRUNG TÂM MÃ QR CHUYỂN KHOẢN) */}
          <div
            style={{
              background: "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)",
              border: "2px solid #cbd5e1",
              borderRadius: "14px",
              padding: "20px 24px",
              marginBottom: "24px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Top decorative stripe */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "4px",
                background: isPaid ? "#10b981" : "linear-gradient(90deg, #2563eb, #3b82f6, #06b6d4)",
              }}
            />

            {/* Header of QR Center */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
                borderBottom: "1px dashed #cbd5e1",
                paddingBottom: "10px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <QrCode size={20} color="#2563eb" />
                <span style={{ fontWeight: 800, fontSize: "14px", textTransform: "uppercase", color: "#1e293b", letterSpacing: "0.3px" }}>
                  MÃ QR THANH TOÁN CHUYỂN KHOẢN
                </span>
              </div>

              {/* Status Badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 12px",
                  borderRadius: "999px",
                  fontSize: "12px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  background: isPaid ? "#dcfce7" : isPartial ? "#fef3c7" : "#fee2e2",
                  color: isPaid ? "#15803d" : isPartial ? "#b45309" : "#b91c1c",
                  border: `1px solid ${isPaid ? "#86efac" : isPartial ? "#fcd34d" : "#fca5a5"}`,
                }}
              >
                {isPaid ? (
                  <>
                    <CheckCircle2 size={14} />
                    <span>✓ ĐÃ THANH TOÁN (PAID)</span>
                  </>
                ) : isPartial ? (
                  <>
                    <Clock size={14} />
                    <span>ĐÃ CỌC MỘT PHẦN</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={14} />
                    <span>CHỜ THANH TOÁN</span>
                  </>
                )}
              </div>
            </div>

            {/* QR Card Body: Center QR with Structured Bank Details */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "170px 1fr",
                gap: "24px",
                alignItems: "center",
              }}
            >
              {/* VietQR Box */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  textAlign: "center",
                  background: "#ffffff",
                  padding: "10px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.06)",
                }}
              >
                <img
                  src={vietQrUrl}
                  alt="VietQR Mã chuyển khoản ngân hàng"
                  style={{
                    width: "148px",
                    height: "148px",
                    borderRadius: "8px",
                    display: "block",
                  }}
                />
                <div style={{ fontSize: "10.5px", fontWeight: 700, color: "#2563eb", marginTop: "6px", textTransform: "uppercase" }}>
                  VietQR 24/7 · BIDV
                </div>
                <div style={{ fontSize: "9.5px", color: "#64748b", marginTop: "2px" }}>
                  Quét bằng mọi App Ngân hàng
                </div>
              </div>

              {/* Bank Transfer Specifications */}
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {/* Total amount highlight */}
                <div
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "10px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      SỐ TIỀN CẦN THANH TOÁN
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 900, color: "#1e40af", letterSpacing: "-0.5px" }}>
                      {formatVND(booking.total)}
                    </div>
                  </div>
                  {isPaid ? (
                    <span style={{ fontSize: "12px", color: "#16a34a", fontWeight: 700 }}>
                      Hóa đơn đã hoàn tất
                    </span>
                  ) : (
                    <span style={{ fontSize: "11.5px", color: "#dc2626", fontWeight: 600 }}>
                      Vui lòng thanh toán khi nhận phòng
                    </span>
                  )}
                </div>

                {/* Account details grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "10px",
                    fontSize: "12.5px",
                  }}
                >
                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px" }}>
                    <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600 }}>NGÂN HÀNG THỤ HƯỞNG</div>
                    <div style={{ fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{bankName}</div>
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px" }}>
                    <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600 }}>CHỦ TÀI KHOẢN</div>
                    <div style={{ fontWeight: 800, color: "#0f172a", marginTop: "2px" }}>{accountHolder}</div>
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px" }}>
                    <div style={{ fontSize: "10.5px", color: "#64748b", fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>SỐ TÀI KHOẢN</span>
                      <button
                        type="button"
                        className="no-print"
                        onClick={() => copyToClipboard(accountNumber, "stk")}
                        style={{ border: "none", background: "transparent", color: "#2563eb", cursor: "pointer", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "3px", padding: 0 }}
                      >
                        {copiedField === "stk" ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                        {copiedField === "stk" ? "Đã chép" : "Sao chép"}
                      </button>
                    </div>
                    <div style={{ fontWeight: 800, color: "#1e40af", fontSize: "14px", marginTop: "2px" }}>{accountNumber}</div>
                  </div>

                  <div style={{ background: "#ffffff", border: "1.5px solid #2563eb", borderRadius: "8px", padding: "8px 12px" }}>
                    <div style={{ fontSize: "10.5px", color: "#2563eb", fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span>NỘI DUNG CHUYỂN KHOẢN (MEMO)</span>
                      <button
                        type="button"
                        className="no-print"
                        onClick={() => copyToClipboard(transferContent, "memo")}
                        style={{ border: "none", background: "transparent", color: "#2563eb", cursor: "pointer", fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "3px", padding: 0 }}
                      >
                        {copiedField === "memo" ? <Check size={12} color="#16a34a" /> : <Copy size={12} />}
                        {copiedField === "memo" ? "Đã chép" : "Sao chép"}
                      </button>
                    </div>
                    <div style={{ fontWeight: 900, color: "#0f172a", fontSize: "14px", marginTop: "2px", letterSpacing: "0.5px" }}>
                      {transferContent}
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
                  💡 Ghi chú: Hệ thống tự động nhận diện thanh toán ngay khi giao dịch thành công qua mã QR hoặc đúng nội dung <b>{transferContent}</b>.
                </div>
              </div>
            </div>
          </div>

          {/* 3. Customer & Stay Details Information Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
              marginBottom: "22px",
            }}
          >
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "14px 16px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                THÔNG TIN KHÁCH HÀNG
              </div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>
                👤 {booking.guest_name || "Khách lẻ (Chưa cập nhật tên)"}
              </div>
              <div style={{ fontSize: "13px", color: "#334155", marginBottom: "3px" }}>
                📞 Số điện thoại: <b>{booking.guest_phone || "—"}</b>
              </div>
              <div style={{ fontSize: "13px", color: "#334155", marginBottom: "3px" }}>
                ✉️ Email liên hệ: {booking.guest_email || "—"}
              </div>
              <div style={{ fontSize: "13px", color: "#334155" }}>
                👥 Số lượng khách: <b>{booking.guest_count} khách</b> (Tiêu chuẩn: {standardGuests} người)
              </div>
            </div>

            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                padding: "14px 16px",
              }}
            >
              <div style={{ fontSize: "11px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
                THÔNG TIN PHÒNG NGHỈ & THỜI GIAN
              </div>
              <div style={{ fontSize: "14px", fontWeight: 800, color: "#0f172a", marginBottom: "4px" }}>
                🏠 {booking.rooms?.name || "Phòng nghỉ tiêu chuẩn"}
              </div>
              <div style={{ fontSize: "13px", color: "#334155", marginBottom: "3px" }}>
                📍 Check-in: <b>{new Date(booking.start_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}</b>
              </div>
              <div style={{ fontSize: "13px", color: "#334155", marginBottom: "3px" }}>
                🏁 Check-out: <b>{new Date(booking.end_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}</b>
              </div>
              <div style={{ fontSize: "13px", color: "#1e40af", fontWeight: 700 }}>
                ⏳ Thời lượng: {durationHours >= 24 ? `${durationDays} ngày (${durationHours}h)` : `${durationHours} giờ`}
              </div>
            </div>
          </div>

          {/* 4. Itemized Price Breakdown Table */}
          <div style={{ marginBottom: "22px" }}>
            <div style={{ fontSize: "12px", fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: "8px" }}>
              BẢNG KÊ CHI TIẾT TIỀN PHÒNG & DỊCH VỤ
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #cbd5e1", textAlign: "left" }}>
                  <th style={{ padding: "10px 14px", fontWeight: 700, color: "#334155" }}>Hạng mục chi phí</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, color: "#334155" }}>Diễn giải / Đơn giá</th>
                  <th style={{ padding: "10px 14px", fontWeight: 700, color: "#334155", textAlign: "right" }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <b>Tiền phòng cơ bản</b>
                    {booking.price_breakdown?.pricing_rule_name && (
                      <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                        Quy tắc áp dụng: {booking.price_breakdown.pricing_rule_name}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#64748b" }}>
                    {durationHours >= 24 ? `${durationDays} ngày (${durationHours}h)` : `${durationHours} giờ`}
                  </td>
                  <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                    {formatVND(roomPrice)}
                  </td>
                </tr>

                {extraGuestFee > 0 && (
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <b>Phụ thu khách thêm</b>
                      <div style={{ fontSize: "11px", color: "#64748b" }}>
                        Vượt mức tiêu chuẩn {standardGuests} người (+{extraGuests} người)
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>
                      +{extraGuests} khách × {formatVND(booking.price_breakdown?.extra_guest_unit_price || 100000)}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#d97706" }}>
                      +{formatVND(extraGuestFee)}
                    </td>
                  </tr>
                )}

                {Number(booking.price_breakdown?.holiday_surcharge) > 0 && (
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 14px" }}><b>Phụ thu ngày lễ / sự kiện</b></td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>Theo quy định ngày lễ</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#d97706" }}>
                      +{formatVND(booking.price_breakdown?.holiday_surcharge)}
                    </td>
                  </tr>
                )}

                {Number(booking.discount) > 0 && (
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 14px" }}><b>Khuyến mãi / Giảm trừ ưu đãi</b></td>
                    <td style={{ padding: "10px 14px", color: "#16a34a" }}>Ưu đãi áp dụng</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700, color: "#16a34a" }}>
                      -{formatVND(booking.discount)}
                    </td>
                  </tr>
                )}

                {Number(booking.tax) > 0 && (
                  <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 14px" }}><b>Thuế GTGT / Phí dịch vụ</b></td>
                    <td style={{ padding: "10px 14px", color: "#64748b" }}>Theo quy định</td>
                    <td style={{ padding: "10px 14px", textAlign: "right", fontWeight: 700 }}>
                      +{formatVND(booking.tax)}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr style={{ background: "#f8fafc", borderTop: "2px solid #cbd5e1" }}>
                  <td colSpan={2} style={{ padding: "12px 14px", fontSize: "15px", fontWeight: 900 }}>
                    TỔNG CỘNG THANH TOÁN (TOTAL AMOUNT):
                  </td>
                  <td
                    style={{
                      padding: "12px 14px",
                      fontSize: "20px",
                      fontWeight: 900,
                      textAlign: "right",
                      color: "#1e40af",
                    }}
                  >
                    {formatVND(booking.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 5. Signatures & Confirmation */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              textAlign: "center",
              marginTop: "24px",
              paddingTop: "14px",
              fontSize: "13px",
            }}
          >
            <div>
              <div style={{ fontWeight: 800, color: "#334155" }}>NGƯỜI ĐẶT PHÒNG / KHÁCH HÀNG</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>(Ký và ghi rõ họ tên)</div>
              <div style={{ height: "65px" }} />
              <div style={{ fontWeight: 700, color: "#0f172a" }}>{booking.guest_name || "Khách hàng"}</div>
            </div>

            <div>
              <div style={{ fontWeight: 800, color: "#334155" }}>ĐẠI DIỆN BỘ PHẬN LỄ TÂN</div>
              <div style={{ fontSize: "11px", color: "#94a3b8", fontStyle: "italic" }}>(Xác nhận & Đóng dấu)</div>
              <div style={{ height: "65px" }} />
              <div style={{ fontWeight: 700, color: "#1e40af" }}>Bộ phận Quản lý & Thu ngân</div>
            </div>
          </div>

          {/* Footer Note */}
          <div
            style={{
              textAlign: "center",
              marginTop: "24px",
              paddingTop: "16px",
              borderTop: "1px dashed #cbd5e1",
              fontSize: "12px",
              color: "#64748b",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: "#334155" }}>
              Cảm ơn Quý khách đã lựa chọn dịch vụ của Homestay! Kính chúc Quý khách một kỳ nghỉ tuyệt vời!
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94a3b8" }}>
              Biên lai điện tử có giá trị xác nhận dịch vụ lưu trú và đối soát thanh toán hợp lệ.
            </p>
          </div>
        </div>
      </div>

      {/* Embedded print CSS */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #booking-receipt-print-area, #booking-receipt-print-area * {
            visibility: visible !important;
          }
          #booking-receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 24px !important;
            box-shadow: none !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
