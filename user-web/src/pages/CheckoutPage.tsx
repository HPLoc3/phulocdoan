import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, CreditCard, Loader2, ShieldCheck, ShoppingCart } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useCart, type CartItem } from "../cart/CartContext";
import { apiFetch, ApiError } from "../lib/api";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

const groupByEvent = (items: CartItem[]) => {
  const map = new Map<number, CartItem[]>();
  for (const item of items) {
    const group = map.get(item.eventId) ?? [];
    group.push(item);
    map.set(item.eventId, group);
  }
  return Array.from(map.entries()).map(([eventId, groupItems]) => ({
    eventId,
    eventTitle: groupItems[0]?.eventTitle ?? `Event #${eventId}`,
    eventDate: groupItems[0]?.eventDate,
    items: groupItems,
    total: groupItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
  }));
};

export const CheckoutPage = () => {
  const { items, itemCount, totalAmount, clearCart } = useCart();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const groups = useMemo(() => groupByEvent(items), [items]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/checkout" }, replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  const handlePay = async () => {
    if (items.length === 0 || isPaying) return;
    setError(null);
    setSuccess(null);
    setIsPaying(true);

    try {
      const paidBookingIds: number[] = [];
      for (const group of groups) {
        const booking = await apiFetch<{ id: number }>("/bookings/", {
          method: "POST",
          body: JSON.stringify({
            event_id: group.eventId,
            idempotency_key: crypto.randomUUID(),
            items: group.items.map((item) => ({
              ticket_category_id: item.ticketCategoryId,
              quantity: item.quantity,
            })),
            payment_method: "ewallet",
          }),
        });
        await apiFetch(`/bookings/${booking.id}/pay`, { method: "POST" });
        paidBookingIds.push(booking.id);
      }

      clearCart();
      setSuccess(`Thanh toán thành công ${paidBookingIds.length} đơn hàng.`);
      setTimeout(() => navigate("/my-tickets", { replace: true }), 900);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể thanh toán đơn hàng");
    } finally {
      setIsPaying(false);
    }
  };

  if (authLoading) {
    return (
      <div className="mt-32 flex justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)] w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="py-10 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-3">Thanh toán</h1>
          <p className="text-gray-400">Kiểm tra đơn hàng trước khi thanh toán.</p>
        </div>

        {items.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center border border-white/10">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Chưa có vé để thanh toán</h3>
            <p className="text-gray-400 mb-6">Giỏ hàng của bạn đang trống.</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:opacity-90 transition-opacity"
            >
              Chọn sự kiện
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6 items-start">
            <div className="space-y-4">
              {groups.map((group) => (
                <section key={group.eventId} className="glass rounded-2xl border border-white/10 p-5">
                  <div className="mb-4">
                    <h2 className="text-xl font-bold">{group.eventTitle}</h2>
                    <p className="text-sm text-gray-400">{new Date(group.eventDate).toLocaleString("vi-VN")}</p>
                  </div>
                  <div className="space-y-3">
                    {group.items.map((item) => (
                      <div
                        key={item.ticketCategoryId}
                        className="flex justify-between items-center bg-white/5 rounded-xl px-4 py-3 border border-white/5"
                      >
                        <div>
                          <div className="font-medium text-white">{item.ticketCategoryName}</div>
                          <div className="text-sm text-gray-400">
                            {item.quantity} x {formatVND(item.price)}
                          </div>
                        </div>
                        <div className="font-bold">{formatVND(item.price * item.quantity)}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <aside className="glass rounded-2xl border border-white/10 p-6 sticky top-28">
              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck className="text-green-400" />
                <h2 className="text-xl font-bold">Thanh toán mock</h2>
              </div>
              <div className="space-y-3 text-sm border-b border-white/10 pb-5 mb-5">
                <div className="flex justify-between text-gray-400">
                  <span>Số vé</span>
                  <span>{itemCount}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Phương thức</span>
                  <span>Ví điện tử</span>
                </div>
                <div className="flex justify-between text-white font-bold text-lg">
                  <span>Tổng cộng</span>
                  <span>{formatVND(totalAmount)}</span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30 flex items-start gap-2 text-sm">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="mb-4 p-3 rounded-xl bg-green-500/20 text-green-300 border border-green-500/30 flex items-start gap-2 text-sm">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{success}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handlePay}
                disabled={isPaying}
                className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPaying ? <Loader2 className="animate-spin" /> : <CreditCard size={18} />}
                Thanh toán ngay
              </button>
              <Link
                to="/cart"
                className="block w-full mt-3 py-3 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gray-300 text-center"
              >
                Quay lại giỏ hàng
              </Link>
            </aside>
          </div>
        )}
      </motion.div>
    </div>
  );
};
