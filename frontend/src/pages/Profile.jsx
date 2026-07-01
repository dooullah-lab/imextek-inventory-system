// src/pages/Profile.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { User, Lock, Loader2, CheckCircle } from "lucide-react";

const roleBadge = {
  admin: "bg-brand-500 text-white",
  manager: "bg-copper-500 text-white",
  staff: "bg-brand-50 text-brand-500",
};

export default function Profile() {
  const { user, login } = useAuth();
  const [nameForm, setNameForm] = useState({ name: user?.name || "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [nameLoading, setNameLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);

  const handleNameUpdate = async (e) => {
    e.preventDefault();
    setNameLoading(true);
    setNameMsg(null);
    try {
      const res = await api.patch("/auth/profile", { name: nameForm.name });
      sessionStorage.setItem("imextek_user", JSON.stringify(res.data.user));
      setNameMsg({ type: "success", text: "Name updated successfully." });
    } catch (err) {
      setNameMsg({ type: "error", text: err.response?.data?.error || "Could not update name." });
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMsg({ type: "error", text: "New passwords don't match." });
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      await api.patch("/auth/profile", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
      });
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPwMsg({ type: "success", text: "Password changed successfully." });
    } catch (err) {
      setPwMsg({ type: "error", text: err.response?.data?.error || "Could not change password." });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-brand-700">My Profile</h1>
        <p className="text-sm text-brand-300 mt-0.5">Update your name or change your password</p>
      </div>

      <div className="bg-white rounded-xl border border-brand-50 shadow-card p-5 mb-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center shrink-0">
          <User size={22} className="text-brand-500" />
        </div>
        <div>
          <p className="font-medium text-brand-700">{user?.name}</p>
          <p className="text-sm text-brand-300">{user?.email}</p>
        </div>
        <span className={"ml-auto text-xs font-medium rounded-md px-2.5 py-1.5 capitalize " + roleBadge[user?.role]}>
          {user?.role}
        </span>
      </div>

      <div className="bg-white rounded-xl border border-brand-50 shadow-card p-5 mb-4">
        <h3 className="font-display text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
          <User size={16} /> Display Name
        </h3>
        <form onSubmit={handleNameUpdate} className="space-y-3">
          <input
            required
            value={nameForm.name}
            onChange={(e) => setNameForm({ name: e.target.value })}
            placeholder="Your full name"
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
          {nameMsg && (
            <div className={"rounded-lg px-3 py-2 text-sm " + (nameMsg.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700 flex items-center gap-2")}>
              {nameMsg.type === "success" && <CheckCircle size={14} />}
              {nameMsg.text}
            </div>
          )}
          <button disabled={nameLoading} type="submit"
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-60 flex items-center gap-2">
            {nameLoading && <Loader2 size={14} className="animate-spin" />}
            {nameLoading ? "Saving..." : "Update name"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl border border-brand-50 shadow-card p-5">
        <h3 className="font-display text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
          <Lock size={16} /> Change Password
        </h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-3">
          <input
            required type="password"
            value={pwForm.currentPassword}
            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            placeholder="Current password"
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
          <input
            required type="password"
            value={pwForm.newPassword}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            placeholder="New password (min 8 characters)"
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
          <input
            required type="password"
            value={pwForm.confirmPassword}
            onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
          />
          {pwMsg && (
            <div className={"rounded-lg px-3 py-2 text-sm " + (pwMsg.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700 flex items-center gap-2")}>
              {pwMsg.type === "success" && <CheckCircle size={14} />}
              {pwMsg.text}
            </div>
          )}
          <button disabled={pwLoading} type="submit"
            className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg px-4 py-2 disabled:opacity-60 flex items-center gap-2">
            {pwLoading && <Loader2 size={14} className="animate-spin" />}
            {pwLoading ? "Updating..." : "Change password"}
          </button>
        </form>
      </div>
    </div>
  );
}
