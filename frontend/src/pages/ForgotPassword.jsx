// src/pages/ForgotPassword.jsx
import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import logo from "../assets/logo.png";
import { ArrowLeft, Loader2, CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-100 opacity-40 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-copper-100 opacity-40 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card border border-brand-50 p-8 sm:p-10">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="ImEx-Tek Global Ltd" className="h-14 w-auto" />
          </div>

          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={24} className="text-green-600" />
              </div>
              <h2 className="font-display text-xl font-semibold text-brand-700 mb-2">Check your email</h2>
              <p className="text-sm text-brand-400 mb-6">
                If <strong>{email}</strong> is registered, you'll receive a reset link shortly. Check your spam folder if you don't see it.
              </p>
              <Link to="/login" className="text-sm text-brand-500 hover:text-brand-700 flex items-center justify-center gap-1.5">
                <ArrowLeft size={14} /> Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-semibold text-brand-700 text-center mb-1">Forgot password?</h1>
              <p className="text-sm text-brand-400 text-center mb-8">Enter your email and we'll send a reset link</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-brand-700 mb-1.5">Email</label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@imex-tek.com"
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
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-sm text-brand-400 hover:text-brand-600 flex items-center justify-center gap-1.5">
                  <ArrowLeft size={14} /> Back to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
