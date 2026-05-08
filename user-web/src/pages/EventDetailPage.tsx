import React, { useState } from "react";
import { useParams } from "react-router-dom";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, MapPin, CheckCircle2, AlertCircle, Ticket, Loader2, Star } from "lucide-react";

export const EventDetailPage = () => {
  const { id } = useParams();
  
  // Polling every 2s for flash sale updates
  const { data: event, error, mutate } = useSWR(`http://127.0.0.1:8000/api/v1/events/${id}`, { refreshInterval: 2000 });
  
  const [selectedTickets, setSelectedTickets] = useState<Record<number, number>>({});
  const [isBooking, setIsBooking] = useState(false);
  const [bookingResult, setBookingResult] = useState<{success: boolean, message: string} | null>(null);

  if (error) return <div className="text-red-500 mt-10 text-center">Failed to load event details.</div>;
  if (!event) return <div className="mt-32 flex justify-center"><Loader2 className="animate-spin text-[var(--color-primary)] w-10 h-10" /></div>;

  const totalSelected = Object.values(selectedTickets).reduce((a, b) => a + b, 0);
  const totalPrice = event.ticket_categories?.reduce((acc: number, cat: any) => acc + (cat.price * (selectedTickets[cat.id] || 0)), 0) || 0;

  const handleTicketChange = (catId: number, delta: number, max: number) => {
    setSelectedTickets(prev => {
      const current = prev[catId] || 0;
      const next = Math.max(0, Math.min(max, current + delta));
      return { ...prev, [catId]: next };
    });
  };

  const handleBook = async () => {
    if (totalSelected === 0) return;
    
    setIsBooking(true);
    setBookingResult(null);

    const items = Object.entries(selectedTickets)
      .filter(([_, qty]) => qty > 0)
      .map(([catId, qty]) => ({
        ticket_category_id: parseInt(catId),
        quantity: qty
      }));

    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/bookings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: parseInt(id!),
          idempotency_key: crypto.randomUUID(),
          items: items
        })
      });

      const data = await res.json();

      if (res.ok) {
        setBookingResult({ success: true, message: `Thành công! Mã đơn hàng: #${data.id}` });
        setSelectedTickets({});
        mutate(); // Cập nhật lại số vé ngay
      } else {
        setBookingResult({ success: false, message: data.detail || "Có lỗi xảy ra" });
      }
    } catch (err) {
      setBookingResult({ success: false, message: "Lỗi kết nối mạng" });
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <div className="py-10 lg:py-20 grid lg:grid-cols-[1fr_400px] gap-12 items-start">
      {/* Left Col - Event Info */}
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
              <p className="font-medium text-white">{new Date(event.event_date).toLocaleString('vi-VN')}</p>
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

      {/* Right Col - Booking Panel */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-3xl p-6 lg:p-8 sticky top-28"
      >
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Ticket className="text-[var(--color-primary)]" />
          Chọn vé
        </h3>

        <div className="space-y-4 mb-8">
          {event.ticket_categories?.map((cat: any) => {
            const isSoldOut = cat.remaining_quantity === 0;
            const currentQty = selectedTickets[cat.id] || 0;

            return (
              <div key={cat.id} className={`p-4 rounded-2xl border ${isSoldOut ? 'bg-white/5 border-white/5 opacity-50' : currentQty > 0 ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30' : 'bg-white/5 border-white/10'} transition-colors`}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg">{cat.name}</h4>
                    <p className="text-sm text-gray-400">Còn lại: {cat.remaining_quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[var(--color-primary)]">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cat.price)}
                    </p>
                  </div>
                </div>

                {!isSoldOut ? (
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-sm text-gray-400">Số lượng</span>
                    <div className="flex items-center gap-4 bg-black/40 rounded-full p-1 border border-white/10">
                      <button 
                        onClick={() => handleTicketChange(cat.id, -1, cat.remaining_quantity)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors disabled:opacity-50"
                        disabled={currentQty === 0}
                      >-</button>
                      <span className="w-4 text-center font-bold">{currentQty}</span>
                      <button 
                        onClick={() => handleTicketChange(cat.id, 1, Math.min(cat.remaining_quantity, 4))}
                        className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-50"
                        disabled={currentQty >= Math.min(cat.remaining_quantity, 4)}
                      >+</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 text-sm font-bold text-red-400 uppercase tracking-wider text-right">
                    Hết vé
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-white/10 pt-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-gray-400">Tổng cộng ({totalSelected} vé)</span>
            <span className="text-2xl font-black">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalPrice)}
            </span>
          </div>

          <button 
            onClick={handleBook}
            disabled={totalSelected === 0 || isBooking}
            className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isBooking ? <><Loader2 className="animate-spin" /> Đang xử lý...</> : 'Thanh toán ngay'}
          </button>
        </div>

        <AnimatePresence>
          {bookingResult && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              exit={{ opacity: 0, height: 0 }}
              className={`p-4 rounded-xl flex items-start gap-3 ${bookingResult.success ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
            >
              {bookingResult.success ? <CheckCircle2 className="shrink-0" /> : <AlertCircle className="shrink-0" />}
              <p className="text-sm font-medium">{bookingResult.message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
