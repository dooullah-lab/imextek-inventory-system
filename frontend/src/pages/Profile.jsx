// src/pages/Profile.jsx
import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/client";
import { User, Lock, Loader2, CheckCircle, Camera } from "lucide-react";

const roleBadge = {
  admin: "bg-brand-500 text-white",
  manager: "bg-copper-500 text-white",
  staff: "bg-brand-50 text-brand-500",
};

// Compress and resize image to max 200x200px, returned as base64 JPEG
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = 200;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");

        // Crop square from center
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { user, login } = useAuth();
  const fileRef = useRef(null);

  const storedUser = JSON.parse(sessionStorage.getItem("imextek_user") || "{}");
  const [avatar, setAvatar] = useState(storedUser.avatar || null);

  const [nameForm, setNameForm] = useState({ name: user?.name || "" });
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [nameLoading, setNameLoading] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);
  const [avatarMsg, setAvatarMsg] = useState(null);

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarMsg({ type: "error", text: "Please select an image file." });
      return;
    }
    setAvatarLoading(true);
    setAvatarMsg(null);
    try {
      const compressed = await compressImage(file);
      await api.patch("/auth/profile/picture", { avatar: compressed });
      setAvatar(compressed);
      const updatedUser = { ...storedUser, avatar: compressed };
      sessionStorage.setItem("imextek_user", JSON.stringify(updatedUser));
      setAvatarMsg({ type: "success", text: "Profile picture updated." });
    } catch (err) {
      setAvatarMsg({ type: "error", text: err.response?.data?.error || "Could not upload picture." });
    } finally {
      setAvatarLoading(false);
    }
  };

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
        <p className="text-sm text-brand-300 mt-0.5">Update your photo, name, or password</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white rounded-xl border border-brand-50 shadow-card p-5 mb-4">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center overflow-hidden border-2 border-brand-50">
              {avatar ? (
                <img src={avatar} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User size={32} className="text-brand-400" />
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarLoading}
              className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-500 hover:bg-brand-600 text-white
                         rounded-full flex items-center justify-center shadow-sm transition-colors disabled:opacity-60"
            >
              {avatarLoading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1">
            <p className="font-medium text-brand-700">{user?.name}</p>
            <p className="text-sm text-brand-300">{user?.email}</p>
            <span className={"inline-block mt-2 text-xs font-medium rounded-md px-2.5 py-1 capitalize " + roleBadge[user?.role]}>
              {user?.role}
            </span>
          </div>
        </div>
        {avatarMsg && (
          <div className={"mt-3 rounded-lg px-3 py-2 text-sm " + (avatarMsg.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700 flex items-center gap-2")}>
            {avatarMsg.type === "success" && <CheckCircle size={14} />}
            {avatarMsg.text}
          </div>
        )}
        <p className="text-xs text-brand-300 mt-3">Click the camera icon to upload a photo. Images are automatically cropped to a square and compressed.</p>
      </div>

      {/* Name card */}
      <div className="bg-white rounded-xl border border-brand-50 shadow-card p-5 mb-4">
        <h3 className="font-display text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
          <User size={16} /> Display Name
        </h3>
        <form onSubmit={handleNameUpdate} className="space-y-3">
          <input required value={nameForm.name} onChange={(e) => setNameForm({ name: e.target.value })}
            placeholder="Your full name"
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
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

      {/* Password card */}
      <div className="bg-white rounded-xl border border-brand-50 shadow-card p-5">
        <h3 className="font-display text-sm font-semibold text-brand-700 mb-4 flex items-center gap-2">
          <Lock size={16} /> Change Password
        </h3>
        <form onSubmit={handlePasswordUpdate} className="space-y-3">
          <input required type="password" value={pwForm.currentPassword}
            onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
            placeholder="Current password"
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
          <input required type="password" value={pwForm.newPassword}
            onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
            placeholder="New password (min 8 characters)"
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
          <input required type="password" value={pwForm.confirmPassword}
            onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
            placeholder="Confirm new password"
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
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
