import { useState, useRef, useEffect } from "react";
import { Outlet, Link, NavLink, useNavigate } from "react-router-dom";
import { LogOut, Ticket, User as UserIcon, Settings, Lock, ChevronDown } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export const Layout = () => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    navigate("/login");
  };

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
            {isLoading ? (
              <div className="h-8 w-32 rounded-full bg-white/5 animate-pulse" />
            ) : isAuthenticated && user ? (
              <>
                <NavLink
                  to="/my-tickets"
                  className={({ isActive }) =>
                    `inline-flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-full transition-colors ${
                      isActive
                        ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                        : "text-gray-300 hover:text-white"
                    }`
                  }
                >
                  <Ticket size={16} />
                  Vé của tôi
                </NavLink>

                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-orange-500 flex items-center justify-center text-white">
                      <UserIcon size={16} />
                    </div>
                    <span className="text-sm font-medium text-white max-w-[100px] truncate">{user.full_name}</span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-[#242526] border border-white/10 shadow-2xl py-3 px-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      
                      {/* Dropdown Header: Profile Link */}
                      <div className="p-2 mb-2">
                        <Link 
                          to="/profile" 
                          onClick={() => setIsDropdownOpen(false)}
                          className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group"
                        >
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-orange-500 flex items-center justify-center text-white group-hover:scale-105 transition-transform shrink-0">
                            <UserIcon size={24} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-bold text-white truncate">{user.full_name}</p>
                            <p className="text-sm text-gray-400">Xem tất cả trang cá nhân</p>
                          </div>
                        </Link>
                      </div>

                      <div className="h-px bg-white/10 mx-2 mb-2" />

                      {/* Dropdown Body: Actions */}
                      <Link 
                        to="/profile?tab=edit"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group mx-1"
                      >
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-colors">
                          <Settings size={18} />
                        </div>
                        <span className="text-[15px] font-medium text-gray-200 flex-1">Chỉnh sửa thông tin</span>
                      </Link>

                      <Link 
                        to="/profile?tab=password"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group mx-1"
                      >
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-colors">
                          <Lock size={18} />
                        </div>
                        <span className="text-[15px] font-medium text-gray-200 flex-1">Đổi mật khẩu</span>
                      </Link>

                      <button 
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors group mx-1 text-left mt-1"
                      >
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 group-hover:bg-white/20 transition-colors">
                          <LogOut size={18} />
                        </div>
                        <span className="text-[15px] font-medium text-gray-200 flex-1">Đăng xuất</span>
                      </button>

                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Log in</Link>
                <Link to="/register" className="text-sm font-bold bg-white text-black px-5 py-2.5 rounded-full hover:bg-gray-200 transition-colors">Sign up</Link>
              </>
            )}
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
