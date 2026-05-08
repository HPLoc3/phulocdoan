import React from "react";
import { Outlet, Link } from "react-router-dom";
import { Ticket } from "lucide-react";

export const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-[var(--color-dark-bg)]">
      {/* Background gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] rounded-full bg-purple-500/20 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-orange-500 flex items-center justify-center text-white shadow-lg shadow-[var(--color-primary)]/30 group-hover:scale-105 transition-transform">
              <Ticket size={24} />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">TicketX</span>
          </Link>

          <div className="flex items-center gap-4 ml-auto">
            <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Log in</Link>
            <Link to="/register" className="text-sm font-bold bg-white text-black px-5 py-2.5 rounded-full hover:bg-gray-200 transition-colors">Sign up</Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 max-w-6xl w-full mx-auto p-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 mt-auto relative z-10">
        <div className="max-w-6xl mx-auto p-6 text-center text-gray-500 text-sm">
          &copy; 2026 TicketX. Built for Flash Sales.
        </div>
      </footer>
    </div>
  );
};
