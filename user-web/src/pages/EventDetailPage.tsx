import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CreditCard,
  Loader2,
  MapPin,
  ShoppingCart,
  Star,
  Ticket,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useCart, type CartItem } from "../cart/CartContext";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addItems, replaceItems } = useCart();

  const { data: event, error } = useSWR(`http://127.0.0.1:8000/api/v1/events/${id}`, {
    refreshInterval: 2000,
  });

  const [selectedTickets, setSelectedTickets] = useState<Record<number, number>>({});
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!event) return;
    if (event.status !== "published") {
      setSelectedTickets({});
      return;
    }
    setSelectedTickets((prev) => {
      const next: Record<number, number> = {};
      for (const cat of event.ticket_categories ?? []) {
        const current = prev[cat.id] || 0;
        const maxQuantity = Math.min(cat.remaining_quantity, cat.max_per_booking ?? 4);
        if (current > 0 && maxQuantity > 0) {
          next[cat.id] = Math.min(current, maxQuantity);
        }
      }
      return next;
    });
  }, [event]);

  if (error) return <div className="text-red-500 mt-10 text-center">Failed to load event details.</div>;
  if (!event) {
    return (
      <div className="mt-32 flex justify-center">
        <Loader2 className="animate-spin text-[var(--color-primary)] w-10 h-10" />
      </div>
    );
  }

  const totalSelected = Object.values(selectedTickets).reduce((a, b) => a + b, 0);
  const now = Date.now();
  const saleStart = event.sale_start_at ? new Date(event.sale_start_at).getTime() : null;
  const saleEnd = event.sale_end_at ? new Date(event.sale_end_at).getTime() : null;
  const isOnSale =
    event.status === "published" &&
    (!saleStart || saleStart <= now) &&
    (!saleEnd || saleEnd >= now);
  const totalPrice =
    event.ticket_categories?.reduce(
      (acc: number, cat: any) => acc + Number(cat.price) * (selectedTickets[cat.id] || 0),
      0
    ) || 0;

  const handleTicketChange = (catId: number, delta: number, max: number) => {
    setSelectedTickets((prev) => {
      const current = prev[catId] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [catId]: next };
    });
  };

  const buildCartItems = (): CartItem[] =>
    Object.entries(selectedTickets)
      .filter(([, qty]) => qty > 0)
      .map(([catId, qty]) => {
        const category = event.ticket_categories?.find((cat: any) => cat.id === Number(catId));
        return {
          eventId: Number(id),
          eventTitle: event.title,
          eventDate: event.event_date,
          ticketCategoryId: Number(catId),
          ticketCategoryName: category?.name ?? `Loại #${catId}`,
          price: Number(category?.price ?? 0),
          quantity: qty,
          maxPerBooking: Number(category?.max_per_booking ?? 4),
        };
      });

  const handleAddToCart = () => {
    const items = buildCartItems();
    if (items.length === 0) return;
    addItems(items);
    setSelectedTickets({});
    setActionResult({ success: true, message: "Đã thêm vé vào giỏ hàng." });
  };

  const handleCheckoutNow = () => {
    const items = buildCartItems();
    if (items.length === 0) return;
    replaceItems(items);
    if (!isAuthenticated) {
      navigate("/login", { state: { from: "/checkout" } });
      return;
    }
    navigate("/checkout");
  };

  return (
    <div className="py-10 lg:py-20 grid lg:grid-cols-[1fr_400px] gap-12 items-start">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
        <div className="rounded-3xl overflow-hidden aspect-[21/9] bg-gradient-to-br from-gray-800 to-gray-900 relative mb-8 border border-white/10 flex items-center justify-center">
          <Star className="w-32 h-32 text-white/5 absolute" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-transparent to-transparent" />
        </div>

        <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">{event.title}</h1>

        <div className="flex flex-wrap gap-6 mb-10 text-gray-300">
          <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-2xl border border-white/5">
            <Calendar className="text-[var(--color-primary)]" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Thời gian</p>
              <p className="font-medium text-white">{new Date(event.event_date).toLocaleString("vi-VN")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-2xl border border-white/5">
            <MapPin className="text-[var(--color-primary)]" />
            <div>
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Địa điểm</p>
              <p className="font-medium text-white">Sân vận động Quốc Gia</p>
            </div>
          </div>
        </div>

        <div className="prose prose-invert max-w-none">
          <p className="text-gray-400 leading-relaxed text-lg">{event.description}</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-6 lg:p-8 sticky top-28"
      >
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Ticket className="text-[var(--color-primary)]" />
          Chọn vé
        </h3>

        {!isOnSale && (
          <div className="mb-5 p-4 rounded-xl bg-yellow-500/15 text-yellow-200 border border-yellow-500/30 flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" />
            <div className="text-sm font-medium">
              Sự kiện hiện chưa mở bán hoặc đã bị tạm dừng bán.
            </div>
          </div>
        )}

        <div className="space-y-4 mb-8">
          {event.ticket_categories?.length === 0 && (
            <div className="p-4 rounded-xl bg-white/5 text-gray-400 border border-white/10 text-sm">
              Sự kiện này chưa có hạng vé để bán.
            </div>
          )}
          {event.ticket_categories?.map((cat: any) => {
            const isSoldOut = cat.remaining_quantity === 0;
            const currentQty = selectedTickets[cat.id] || 0;
            const maxQuantity = Math.min(cat.remaining_quantity, cat.max_per_booking ?? 4);
            const canSelect = isOnSale && !isSoldOut;

            return (
              <div
                key={cat.id}
                className={`p-4 rounded-2xl border ${
                  isSoldOut
                    ? "bg-white/5 border-white/5 opacity-50"
                    : currentQty > 0
                      ? "bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30"
                      : "bg-white/5 border-white/10"
                } transition-colors`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg">{cat.name}</h4>
                    <p className="text-sm text-gray-400">Còn lại: {cat.remaining_quantity}</p>
                  </div>
                  <p className="font-bold text-[var(--color-primary)]">{formatVND(Number(cat.price))}</p>
                </div>

                {canSelect ? (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-400">Số lượng</span>
                    <div className="flex items-center gap-4 bg-black/40 rounded-full p-1 border border-white/10">
                      <button
                        onClick={() => handleTicketChange(cat.id, -1, maxQuantity)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
                        disabled={currentQty === 0}
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-bold">{currentQty}</span>
                      <button
                        onClick={() => handleTicketChange(cat.id, 1, maxQuantity)}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                        disabled={currentQty >= maxQuantity}
                      >
                        +
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-sm font-bold text-red-400 uppercase tracking-wider text-right">
                    {isSoldOut ? "Hết vé" : "Tạm dừng bán"}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/10 pt-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-400">Tổng cộng ({totalSelected} vé)</span>
            <span className="text-2xl font-black">{formatVND(totalPrice)}</span>
          </div>

          <div className="grid gap-3">
            <button
              onClick={handleCheckoutNow}
              disabled={totalSelected === 0 || !isOnSale}
              className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <CreditCard size={20} />
              Thanh toán ngay
            </button>
            <button
              onClick={handleAddToCart}
              disabled={totalSelected === 0 || !isOnSale}
              className="w-full py-3 rounded-xl font-bold text-base bg-white/10 border border-white/10 hover:bg-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <ShoppingCart size={18} />
              Thêm vào giỏ hàng
            </button>
          </div>
        </div>

        <AnimatePresence>
          {actionResult && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-4 rounded-xl flex items-start gap-3 ${
                actionResult.success
                  ? "bg-green-500/20 text-green-400 border border-green-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/30"
              }`}
            >
              {actionResult.success ? <CheckCircle2 className="shrink-0" /> : <AlertCircle className="shrink-0" />}
              <div className="text-sm font-medium">
                <p>{actionResult.message}</p>
                {actionResult.success && (
                  <button
                    type="button"
                    onClick={() => navigate("/cart")}
                    className="mt-1 underline text-green-300 hover:text-green-200"
                  >
                    Xem giỏ hàng
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
