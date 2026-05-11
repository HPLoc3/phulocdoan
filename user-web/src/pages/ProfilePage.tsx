import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon, Mail, Phone, Shield, Settings, Lock, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { apiFetch, ApiError } from "../lib/api";

export const ProfilePage = () => {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "info";

  // Edit Info State
  const [editName, setEditName] = useState(user?.full_name || "");
  const [editPhone, setEditPhone] = useState(user?.phone || "");
  
  // Password State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  // Common State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sync state when user loads
  useEffect(() => {
    if (user) {
      setEditName(user.full_name);
      setEditPhone(user.phone || "");
    }
  }, [user]);

  // Clear messages when changing tabs
  useEffect(() => {
    setError(null);
    setSuccess(null);
  }, [activeTab]);

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="text-gray-400">Vui lòng đăng nhập để xem thông tin cá nhân.</p>
      </div>
    );
  }

  const handleUpdateInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      await apiFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify({ full_name: editName, phone: editPhone }),
      });
      await refreshUser();
      setSuccess("Cập nhật thông tin thành công!");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Có lỗi xảy ra khi cập nhật");
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "PUT",
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      setSuccess("Đổi mật khẩu thành công!");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mật khẩu hiện tại không đúng hoặc có lỗi");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        
        {/* Sidebar */}
        <div className="md:col-span-1 space-y-2">
          <button
            onClick={() => setSearchParams({ tab: "info" })}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
              activeTab === "info" 
                ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/30" 
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5"
            }`}
          >
            <UserIcon size={20} />
            <span>Thông tin chung</span>
          </button>
          
          <button
            onClick={() => setSearchParams({ tab: "edit" })}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
              activeTab === "edit" 
                ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/30" 
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5"
            }`}
          >
            <Settings size={20} />
            <span>Chỉnh sửa thông tin</span>
          </button>
          
          <button
            onClick={() => setSearchParams({ tab: "password" })}
            className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${
              activeTab === "password" 
                ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] font-bold border border-[var(--color-primary)]/30" 
                : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5"
            }`}
          >
            <Lock size={20} />
            <span>Đổi mật khẩu</span>
          </button>
        </div>

        {/* Content */}
        <div className="md:col-span-3">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="glass rounded-3xl p-8 border border-white/10 relative overflow-hidden min-h-[400px]"
          >
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-[var(--color-primary)] rounded-full blur-[100px] opacity-10 pointer-events-none" />

            {/* ERROR & SUCCESS MESSAGES */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2"
                >
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }} 
                  animate={{ opacity: 1, height: 'auto' }} 
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-start gap-2"
                >
                  <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                  <span>{success}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* TAB: INFO */}
            {activeTab === "info" && (
              <div className="relative z-10">
                <div className="flex flex-col items-center mb-8">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-orange-500 flex items-center justify-center text-white shadow-xl shadow-[var(--color-primary)]/30 mb-4 border-4 border-[var(--color-dark-bg)]">
                    <UserIcon size={48} />
                  </div>
                  <h1 className="text-3xl font-black text-white">{user.full_name}</h1>
                  <div className="px-3 py-1 mt-2 rounded-full bg-white/10 border border-white/20 text-xs text-gray-300 flex items-center gap-1.5 uppercase tracking-wider font-bold">
                    <Shield size={12} />
                    {user.role}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-dark-bg)] flex items-center justify-center text-[var(--color-primary)]">
                      <Mail size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-0.5">Địa chỉ Email</p>
                      <p className="text-white font-medium">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-dark-bg)] flex items-center justify-center text-green-400">
                      <Phone size={20} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-0.5">Số điện thoại</p>
                      <p className="text-white font-medium">{user.phone || "Chưa cập nhật"}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: EDIT */}
            {activeTab === "edit" && (
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Settings className="text-[var(--color-primary)]" />
                  Chỉnh sửa thông tin
                </h2>
                <form onSubmit={handleUpdateInfo} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Họ và tên</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Số điện thoại</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                      placeholder="Nhập số điện thoại..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email (Không thể thay đổi)</label>
                    <input
                      type="email"
                      disabled
                      value={user.email}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-gray-500 cursor-not-allowed opacity-70"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="py-3 px-8 rounded-xl font-bold text-base bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : "Lưu thay đổi"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB: PASSWORD */}
            {activeTab === "password" && (
              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Lock className="text-[var(--color-primary)]" />
                  Đổi mật khẩu
                </h2>
                <form onSubmit={handleChangePassword} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Mật khẩu hiện tại</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Mật khẩu mới</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                      placeholder="••••••••"
                    />
                  </div>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="py-3 px-8 rounded-xl font-bold text-base bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : "Cập nhật mật khẩu"}
                    </button>
                  </div>
                </form>
              </div>
            )}

          </motion.div>
        </div>
      </div>
    </div>
  );
};
