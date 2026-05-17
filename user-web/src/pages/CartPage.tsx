import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart } from "../cart/CartContext";

const formatVND = (n: number) =>
  new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(n);

export const CartPage = () => {
  const { items, itemCount, totalAmount, updateQuantity, removeItem, clearCart } = useCart();
  const navigate = useNavigate();

  return (
    <div className="py-10 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-black mb-3">Giỏ hàng</h1>
          <p className="text-gray-400">{itemCount} vé đang chọn</p>
        </div>

        {items.length === 0 ? (
          <div className="glass rounded-3xl p-12 text-center border border-white/10">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Giỏ hàng trống</h3>
            <p className="text-gray-400 mb-6">Chọn vé từ một sự kiện để bắt đầu thanh toán.</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:opacity-90 transition-opacity"
            >
              Khám phá sự kiện
            </Link>
          </div>
        ) : (
          <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.ticketCategoryId} className="glass rounded-2xl border border-white/10 p-5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-white mb-1">{item.eventTitle}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(item.eventDate).toLocaleString("vi-VN")}
                        </span>
                        <span>{item.ticketCategoryName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-3 bg-black/30 rounded-full p-1 border border-white/10">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.ticketCategoryId, item.quantity - 1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10"
                          disabled={item.quantity <= 1}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-5 text-center font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.ticketCategoryId, item.quantity + 1)}
                          className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20"
                          disabled={item.quantity >= item.maxPerBooking}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <div className="w-32 text-right font-black text-[var(--color-primary)]">
                        {formatVND(item.price * item.quantity)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.ticketCategoryId)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Xóa"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="glass rounded-2xl border border-white/10 p-6 sticky top-28">
              <h2 className="text-xl font-bold mb-5">Tóm tắt</h2>
              <div className="space-y-3 text-sm border-b border-white/10 pb-5 mb-5">
                <div className="flex justify-between text-gray-400">
                  <span>Số vé</span>
                  <span>{itemCount}</span>
                </div>
                <div className="flex justify-between text-white font-bold text-lg">
                  <span>Tổng cộng</span>
                  <span>{formatVND(totalAmount)}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/checkout")}
                className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:opacity-90 transition-opacity"
              >
                Thanh toán
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="w-full mt-3 py-3 rounded-xl font-bold bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-gray-300"
              >
                Xóa giỏ hàng
              </button>
            </aside>
          </div>
        )}
      </motion.div>
    </div>
  );
};
