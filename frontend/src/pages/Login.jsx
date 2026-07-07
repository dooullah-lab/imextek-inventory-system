// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logo from "../assets/logo.png";
import { Eye, EyeOff, Loader2 } from "lucide-react";

export default function Login() {
  const { login, loading, error } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(identifier, password);
    if (success) navigate("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-canvas relative overflow-hidden px-4">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-brand-100 opacity-40 blur-3xl" />
      <div className="absolute -bottom-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-copper-100 opacity-40 blur-3xl" />

      <div className="relative w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-card border border-brand-50 p-8 sm:p-10">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="ImEx-Tek Global Ltd" className="h-16 w-auto" />
          </div>

          <h1 className="font-display text-2xl font-semibold text-brand-700 text-center mb-1">
            Inventory & Sales
          </h1>
          <p className="text-sm text-brand-400 text-center mb-8 font-body">
            Sign in to manage stock and view your sales activity
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-brand-700 mb-1.5">
                Email or Username
              </label>
              <input
                id="identifier"
                type="text"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="you@imex-tek.com or username"
                className="w-full rounded-lg border border-brand-100 px-3.5 py-2.5 text-sm
                           focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none
                           transition-colors placeholder:text-brand-200"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-brand-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-brand-100 px-3.5 py-2.5 pr-10 text-sm
                             focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none
                             transition-colors placeholder:text-brand-200"
                />
                <button type="button" onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-300 hover:text-brand-500" tabIndex={-1}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg
                         py-2.5 text-sm transition-colors flex items-center justify-center gap-2
                         disabled:opacity-60 disabled:cursor-not-allowed mt-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>

            <div className="text-center">
              <Link to="/forgot-password" className="text-xs text-brand-300 hover:text-brand-500 transition-colors">
                Forgot your password?
              </Link>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-brand-300 mt-6 font-body">
          ImEx-Tek Global Ltd &middot; Cloud Services Division
        </p>
      </div>
    </div>
  );
}
