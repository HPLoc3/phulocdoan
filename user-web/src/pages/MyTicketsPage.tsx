import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Calendar,
  ChevronDown,
  ChevronUp,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  CreditCard,
  XCircle,
} from "lucide-react";
import { apiFetch, ApiError } from "../lib/api";
import { useAuth } from "../auth/AuthContext";

type BookingItem = {
  id: number;
  ticket_category_id: number;
  ticket_category_name: string | null;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type MyBooking = {
  id: number;
  event_id: number;
  event_title: string | null;
  event_date: string | null;
  status: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  expires_at: string | null;
  created_at: string;
  items: BookingItem[];
};

type BookingAction = "pay" | "cancel";
type BusyAction = { id: number; action: BookingAction } | null;

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const statusMeta: Record<string, { label: string; cls: string; Icon: typeof Clock }> = {
  pending: { label: "Đang chờ", cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", Icon: Clock },
  payment_pending: { label: "Chờ thanh toán", cls: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30", Icon: Clock },
  confirmed: { label: "Đã xác nhận", cls: "bg-green-500/20 text-green-300 border-green-500/30", Icon: CheckCircle2 },
  paid: { label: "Đã thanh toán", cls: "bg-green-500/20 text-green-300 border-green-500/30", Icon: CheckCircle2 },
  cancelled: { label: "Đã huỷ", cls: "bg-red-500/20 text-red-300 border-red-500/30", Icon: XCircle },
  failed: { label: "Thất bại", cls: "bg-red-500/20 text-red-300 border-red-500/30", Icon: XCircle },
};

const useCountdown = (expiresAt: string | null) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!expiresAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return "Hết hạn";
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const BookingCard = ({
  booking,
  busyAction,
  onPay,
  onCancel,
}: {
  booking: MyBooking;
  busyAction: BusyAction;
  onPay: (id: number) => void;
  onCancel: (id: number) => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const meta = statusMeta[booking.status] ?? {
    label: booking.status,
    cls: "bg-white/10 text-white border-white/20",
    Icon: Ticket,
  };
  const StatusIcon = meta.Icon;
  const isPending =
    booking.status === "pending" ||
    booking.status === "payment_pending" ||
    (booking.status === "confirmed" && !!booking.expires_at);
  const countdown = useCountdown(isPending ? booking.expires_at : null);
  const isBusy = busyAction?.id === booking.id;

  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-5 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-500 font-mono">#{booking.id}</span>
              <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full border ${meta.cls}`}>
                <StatusIcon size={12} />
                {meta.label}
              </span>
              {countdown && (
                <span className="inline-flex items-center gap-1 text-xs font-mono px-2 py-1 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  <Clock size={12} />
                  {countdown}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white truncate">
              {booking.event_title ?? `Event #${booking.event_id}`}
            </h3>
            <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-400">
              {booking.event_date && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(booking.event_date).toLocaleString("vi-VN")}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Ticket size={14} />
                {booking.items.reduce((a, i) => a + i.quantity, 0)} vé
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <div className="text-xs text-gray-500">Tổng</div>
              <div className="text-lg font-black text-[var(--color-primary)]">
                {formatVND(booking.total_amount)}
              </div>
            </div>
            {expanded ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/10"
          >
            <div className="p-5 space-y-3">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">Chi tiết vé</div>
              {booking.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-3 border border-white/5"
                >
                  <div>
                    <div className="font-medium text-white">
                      {item.ticket_category_name ?? `Loại #${item.ticket_category_id}`}
                    </div>
                    <div className="text-sm text-gray-400">
                      {item.quantity} × {formatVND(item.unit_price)}
                    </div>
                  </div>
                  <div className="font-bold text-white">{formatVND(item.line_total)}</div>
                </div>
              ))}
              <div className="border-t border-white/10 pt-3 mt-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-400">
                  <span>Tạm tính</span>
                  <span>{formatVND(booking.subtotal)}</span>
                </div>
                {booking.discount_amount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Giảm giá</span>
                    <span>- {formatVND(booking.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white font-bold pt-2">
                  <span>Tổng cộng</span>
                  <span>{formatVND(booking.total_amount)}</span>
                </div>
              </div>
              {isPending && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => onPay(booking.id)}
                    disabled={isBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[var(--color-primary)] to-orange-500 px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isBusy && busyAction?.action === "pay" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <CreditCard size={16} />
                    )}
                    Thanh toán
                  </button>
                  <button
                    type="button"
                    onClick={() => onCancel(booking.id)}
                    disabled={isBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-gray-200 hover:bg-white/10 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isBusy && busyAction?.action === "cancel" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    Hủy giữ vé
                  </button>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 text-xs text-gray-500">
                <span>Đặt lúc {new Date(booking.created_at).toLocaleString("vi-VN")}</span>
                <Link
                  to={`/events/${booking.event_id}`}
                  className="text-[var(--color-primary)] hover:underline font-medium"
                >
                  Xem sự kiện →
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export const MyTicketsPage = () => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<MyBooking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const loadBookings = useCallback(async () => {
    const data = await apiFetch<MyBooking[]>("/bookings/me");
    setBookings(data);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/my-tickets" }, replace: true });
      return;
    }
    loadBookings()
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Lỗi tải vé");
        setBookings([]);
      });
  }, [isAuthenticated, authLoading, loadBookings, navigate]);

  const runBookingAction = async (id: number, action: BookingAction) => {
    setError(null);
    setBusyAction({ id, action });
    try {
      await apiFetch(`/bookings/${id}/${action === "pay" ? "pay" : "cancel"}`, {
        method: "POST",
      });
      await loadBookings();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Khong the cap nhat don hang");
    } finally {
      setBusyAction(null);
    }
  };

  if (authLoading || bookings === null) {
    return (
      <div className="mt-32 flex justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="py-10">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-3">Vé của tôi</h1>
          <p className="text-gray-400">Tổng {bookings.length} đơn hàng</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {bookings.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center border border-white/10">
            <Ticket className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Chưa có vé nào</h3>
            <p className="text-gray-400 mb-6">Đặt vé cho sự kiện đầu tiên của bạn</p>
            <Link
              to="/"
              className="inline-block px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:opacity-90 transition-opacity"
            >
              Khám phá sự kiện
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                busyAction={busyAction}
                onPay={(id) => runBookingAction(id, "pay")}
                onCancel={(id) => runBookingAction(id, "cancel")}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};
