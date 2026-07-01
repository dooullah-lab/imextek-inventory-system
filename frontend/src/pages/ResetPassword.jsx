// src/pages/ResetPassword.jsx
import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../api/client";
import logo from "../assets/logo.png";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const userId = searchParams.get("id");
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/reset-password", { userId, token, newPassword });
      setDone(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  if (!token || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div className="bg-white rounded-xl border border-brand-50 p-8 text-center max-w-sm">
          <p className="text-sm text-red-600 mb-4">Invalid reset link. Please request a new one.</p>
          <Link to="/forgot-password" className="text-sm text-brand-500 hover:text-brand-700">Request new link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-100 opacity-40 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-copper-100 opacity-40 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card border border-brand-50 p-8 sm:p-10">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="ImEx-Tek Global Ltd" className="h-14 w-auto" />
          </div>

          {done ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <h2 className="font-display text-xl font-semibold text-brand-700 mb-2">Password reset!</h2>
              <p className="text-sm text-brand-400">Redirecting you to login...</p>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-brand-700 text-center mb-1">Set new password</h1>
              <p className="text-sm text-brand-400 text-center mb-8">Choose a strong password for your account</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1.5">New password</label>
                  <div className="relative">
                    <input
                      type={showPw ? "text" : "password"} required
                      value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 characters"
                      className="w-full rounded-lg border border-brand-100 px-3.5 py-2.5 pr-10 text-sm
                                 focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                    />
                    <button type="button" onClick={() => setShowPw((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-300 hover:text-brand-500" tabIndex={-1}>
                      {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1.5">Confirm new password</label>
                  <input
                    type="password" required
                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm
                               focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                  />
                </div>
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">{error}</div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg
                             py-2.5 text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? "Resetting..." : "Reset password"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
