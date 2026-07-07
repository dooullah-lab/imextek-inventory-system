// src/pages/Users.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { UserPlus, Trash2, ShieldCheck, Loader2 } from "lucide-react";

const ROLES = [
  { value: "admin", label: "Admin", desc: "Full access — manages everything including branches", adminOnly: true },
  { value: "manager", label: "Manager", desc: "Manages their assigned branch — inventory, analytics, expenses" },
  { value: "staff", label: "Staff", desc: "POS only — can sell products in their branch" },
];

const roleBadge = {
  admin: "bg-brand-500 text-white",
  manager: "bg-copper-500 text-white",
  staff: "bg-brand-50 text-brand-500",
};

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", username: "", password: "", role: "staff", branchId: "", branchName: "" });

  const load = async () => {
    setLoading(true);
    try {
      const [usersRes, branchesRes] = await Promise.all([
        api.get("/auth/users"),
        api.get("/branches"),
      ]);
      setUsers(usersRes.data);
      setBranches(branchesRes.data.filter((b) => b.status === "active"));
    } catch (err) {
      showToast(err.response?.data?.error || "Could not load users.", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (currentUser?.role !== "admin" && currentUser?.role !== "manager") {
    return (
      <div className="bg-white rounded-xl border border-brand-50 p-12 text-center">
        <ShieldCheck size={28} className="text-brand-200 mx-auto mb-3" />
        <p className="text-brand-400 text-sm">Only admins and managers can manage users.</p>
      </div>
    );
  }

  const isAdmin = currentUser?.role === "admin";
  const visibleUsers = isAdmin
    ? users
    : users.filter((u) => u.branchId === currentUser?.branchId);
  const visibleRoles = ROLES.filter((r) => !r.adminOnly || isAdmin);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const selected = branches.find((b) => b.branchId === form.branchId);
      // Managers can only add users to their own branch
      const branchId = isAdmin ? form.branchId : currentUser.branchId;
      const branchName = isAdmin
        ? (selected?.name || "")
        : currentUser.branchName || "";
      await api.post("/auth/register", {
        ...form,
        branchId,
        branchName,
      });
      setAddOpen(false);
      setForm({ name: "", email: "", username: "", password: "", role: "staff", branchId: "", branchName: "" });
      showToast("User added.");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not add user.", "error");
    } finally { setSubmitting(false); }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.patch(`/auth/users/${userId}`, { role });
      showToast("Role updated.");
      load();
    } catch { showToast("Could not update role.", "error"); }
  };

  const handleBranchChange = async (userId, branchId) => {
    const selected = branches.find((b) => b.branchId === branchId);
    try {
      await api.patch(`/auth/users/${userId}`, {
        branchId: branchId || null,
        branchName: selected?.name || null,
      });
      showToast("Branch updated.");
      load();
    } catch { showToast("Could not update branch.", "error"); }
  };

  const handleDelete = async (userId) => {
    if (!confirm("Remove this user?")) return;
    try {
      await api.delete(`/auth/users/${userId}`);
      showToast("User removed.");
      load();
    } catch { showToast("Could not remove user.", "error"); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-700 flex items-center gap-2">
            <ShieldCheck size={22} className="text-brand-500" /> Users & Roles
          </h1>
          <p className="text-sm text-brand-300 mt-0.5">Manage who can access the system and what they can do</p>
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white
                     text-sm font-medium rounded-lg px-4 py-2.5 transition-colors w-full sm:w-auto">
          <UserPlus size={16} /> Add user
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-300">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-50 shadow-card divide-y divide-brand-50">
          {visibleUsers.map((u) => (
            <div key={u.userId} className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-700">{u.name}</p>
                <p className="text-xs text-brand-300">{u.email}
                  {u.username && <span className="ml-2 font-mono bg-brand-50 text-brand-400 px-1.5 py-0.5 rounded text-[11px]">@{u.username}</span>}
                </p>
                {u.branchName && (
                  <p className="text-xs text-copper-600 mt-0.5">📍 {u.branchName}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Branch selector */}
                <select
                  value={u.branchId || ""}
                  disabled={u.userId === currentUser?.userId || u.role === "admin"}
                  onChange={(e) => handleBranchChange(u.userId, e.target.value)}
                  className="text-xs border border-brand-100 rounded-md px-2 py-1.5 text-brand-600 bg-white outline-none focus:border-brand-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">No branch</option>
                  {branches.map((b) => (
                    <option key={b.branchId} value={b.branchId}>{b.name}</option>
                  ))}
                </select>
                {/* Role selector */}
                <select
                  value={u.role}
                  disabled={u.userId === currentUser?.userId}
                  onChange={(e) => handleRoleChange(u.userId, e.target.value)}
                  className={"text-xs font-medium rounded-md px-2.5 py-1.5 border-0 cursor-pointer " +
                    roleBadge[u.role] + " disabled:cursor-not-allowed disabled:opacity-70"}>
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value} className="bg-white text-brand-700">{r.label}</option>
                  ))}
                </select>
                {u.userId !== currentUser?.userId && (
                  <button onClick={() => handleDelete(u.userId)}
                    className="text-brand-300 hover:text-red-500 p-1.5 transition-colors">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add a new user">
        <form onSubmit={handleAdd} className="space-y-3">
          <input required placeholder="Full name" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
          <input required type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
          <div>
            <input placeholder="Username (optional — for login without email)" value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none font-mono" />
            <p className="text-xs text-brand-300 mt-1">If set, staff can log in with this username instead of email</p>
          </div>
          <input required type="password" placeholder="Temporary password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
          {isAdmin ? (
            <select value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white">
              <option value="">No branch assigned</option>
              {branches.map((b) => (
                <option key={b.branchId} value={b.branchId}>{b.name}{b.location ? ` — ${b.location}` : ""}</option>
              ))}
            </select>
          ) : (
            <div>
              <label className="block text-xs text-brand-400 mb-1">Branch</label>
              <select value={form.branchId || currentUser?.branchId || ""}
                onChange={(e) => setForm({ ...form, branchId: e.target.value })}
                className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white">
                <option value="">No branch assigned</option>
                {branches.filter((b) => b.branchId === currentUser?.branchId).map((b) => (
                  <option key={b.branchId} value={b.branchId}>{b.name}</option>
                ))}
              </select>
              <p className="text-xs text-brand-300 mt-1">As a manager you can only assign users to your branch</p>
            </div>
          )}
          <div className="space-y-2 pt-1">
            {visibleRoles.map((r) => (
              <label key={r.value} className={"flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors " +
                (form.role === r.value ? "border-brand-400 bg-brand-50" : "border-brand-100")}>
                <input type="radio" name="role" value={r.value} checked={form.role === r.value}
                  onChange={(e) => setForm({ ...form, role: e.target.value })} className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-brand-700">{r.label}</p>
                  <p className="text-xs text-brand-300">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
          <button disabled={submitting} type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg py-2.5 mt-2 disabled:opacity-60">
            {submitting ? "Adding..." : "Add user"}
          </button>
        </form>
      </Modal>

      {toast && (
        <div className={"fixed bottom-5 right-5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white " +
          (toast.type === "error" ? "bg-red-500" : "bg-brand-600")}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
