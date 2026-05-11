import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, ArrowRight, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { apiFetch, ApiError } from "../lib/api";

export const ForgotPasswordPage = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRequestOtp = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      const res = await apiFetch<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSuccessMsg(res.message);
      setStep(2);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await apiFetch<{ message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ email, otp, new_password: newPassword }),
      });
      setSuccessMsg("Đổi mật khẩu thành công! Bạn có thể đăng nhập ngay.");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Mã OTP không đúng hoặc có lỗi xảy ra");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="glass rounded-3xl p-8 border border-white/10 relative overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[var(--color-primary)] rounded-full blur-[80px] opacity-20 pointer-events-none" />

          <div className="text-center mb-8 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-orange-500 flex items-center justify-center text-white shadow-lg shadow-[var(--color-primary)]/30 mx-auto mb-4">
              <Ticket size={28} />
            </div>
            <h2 className="text-3xl font-black mb-2">Quên mật khẩu</h2>
            <p className="text-gray-400">
              {step === 1 ? "Nhập email của bạn để nhận mã khôi phục" : "Nhập mã OTP đã được gửi và mật khẩu mới"}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleRequestOtp} className="space-y-5 relative z-10">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all"
                  placeholder="you@example.com"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <>Gửi mã OTP <ArrowRight size={20} /></>}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5 relative z-10">
              {successMsg && !error && (
                <div className="p-3 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm flex items-start gap-2 mb-4">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Mã OTP (6 số)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-all text-center tracking-widest font-mono text-lg"
                  placeholder="••••••"
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

              {error && (
                <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-[var(--color-primary)] to-orange-500 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 mt-4 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : <>Đổi mật khẩu <ArrowRight size={20} /></>}
              </button>
            </form>
          )}

          <div className="mt-8 text-center text-gray-400 text-sm relative z-10">
            Nhớ mật khẩu rồi? <Link to="/login" className="text-white font-bold hover:text-[var(--color-primary)] transition-colors">Đăng nhập ngay</Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
