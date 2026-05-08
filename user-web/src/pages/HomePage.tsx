import React from "react";
import useSWR from "swr";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Calendar, MapPin, Music } from "lucide-react";

export const HomePage = () => {
  const { data: events, error } = useSWR("http://127.0.0.1:8000/api/v1/events/");

  if (error) return <div className="text-red-500 mt-10">Failed to load events.</div>;
  if (!events) return <div className="mt-10 flex justify-center"><div className="w-8 h-8 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="py-10">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-16"
      >
        <h1 className="text-5xl md:text-7xl font-black mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-500 tracking-tight">
          Unmissable <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-primary)] to-orange-500">Experiences</span>
        </h1>
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto">
          Secure your tickets to the most anticipated events. Fast, reliable, and built for the hype.
        </p>
      </motion.div>

      <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
        Trending Now
        <div className="h-1 flex-1 bg-gradient-to-r from-white/10 to-transparent rounded-full" />
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((event: any, i: number) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link to={`/events/${event.id}`} className="block group">
              <div className="glass rounded-3xl overflow-hidden h-full border border-white/5 hover:border-[var(--color-primary)]/50 transition-colors duration-300">
                <div className="aspect-[4/3] bg-gradient-to-br from-gray-800 to-gray-900 relative overflow-hidden flex items-center justify-center">
                  <Music className="w-24 h-24 text-white/10 group-hover:text-white/20 group-hover:scale-110 transition-all duration-700 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c24] via-transparent to-transparent opacity-80" />
                  
                  {event.status === 'published' && (
                    <div className="absolute top-4 right-4 bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/30 backdrop-blur-md">
                      ON SALE
                    </div>
                  )}
                </div>
                
                <div className="p-6 relative">
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-[var(--color-primary)] transition-colors">{event.title}</h3>
                  
                  <div className="flex flex-col gap-2 text-gray-400 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar size={16} className="text-[var(--color-primary)]" />
                      {new Date(event.event_date).toLocaleString('vi-VN')}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-[var(--color-primary)]" />
                      {event.venue_id === 1 ? 'Sân vận động Mỹ Đình' : 'Nhà hát Hoà Bình'}
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
