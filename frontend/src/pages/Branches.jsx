// src/pages/Branches.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import ExportMenu from "../components/ExportMenu";
import { Plus, Pencil, Archive, Loader2, GitBranch } from "lucide-react";

const EMPTY = { name: "", location: "", phone: "", address: "" };

// Defined OUTSIDE component — prevents typing lag
function BranchForm({ data, setData, onSubmit, label, submitting }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input required placeholder="Branch name (e.g. Lagos Main)" value={data.name}
        onChange={(e) => setData({ ...data, name: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
      <input placeholder="City / Location" value={data.location}
        onChange={(e) => setData({ ...data, location: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
      <input placeholder="Phone number" value={data.phone}
        onChange={(e) => setData({ ...data, phone: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
      <textarea placeholder="Address" value={data.address} rows={2}
        onChange={(e) => setData({ ...data, address: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none resize-none" />
      <button disabled={submitting} type="submit"
        className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60">
        {submitting ? "Saving..." : label}
      </button>
    </form>
  );
}

export default function Branches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/branches");
      setBranches(res.data);
    } catch { showToast("Could not load branches.", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/branches", form);
      setAddOpen(false);
      setForm(EMPTY);
      showToast("Branch created.");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not create branch.", "error");
    } finally { setSubmitting(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/branches/${editItem.branchId}`, editItem);
      setEditItem(null);
      showToast("Branch updated.");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not update.", "error");
    } finally { setSubmitting(false); }
  };

  const handleArchive = async (branch) => {
    if (!confirm(`Archive "${branch.name}"? All data will be preserved but the branch will be hidden from active use.`)) return;
    try {
      await api.delete(`/branches/${branch.branchId}`);
      showToast("Branch archived.");
      load();
    } catch { showToast("Could not archive branch.", "error"); }
  };

  const handleUnarchive = async (branch) => {
    try {
      await api.patch(`/branches/${branch.branchId}`, { status: "active" });
      showToast("Branch restored to active.");
      load();
    } catch { showToast("Could not restore branch.", "error"); }
  };

  const handleDelete = async (branch) => {
    if (!confirm(`Permanently delete "${branch.name}"? This cannot be undone. All historical data (transactions, products) will remain but the branch record will be gone.`)) return;
    try {
      await api.delete(`/branches/${branch.branchId}?force=true`);
      showToast("Branch permanently deleted.");
      load();
    } catch { showToast("Could not delete branch.", "error"); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-700 flex items-center gap-2">
            <GitBranch size={22} className="text-brand-500" /> Branches
          </h1>
          <p className="text-sm text-brand-300 mt-0.5">{branches.filter((b) => b.status === "active").length} active branches</p>
        </div>
        <div className="flex gap-2">
          <ExportMenu filename="imextek-branches" title="ImEx-Tek Branches"
            columns={[
              { key: "name", label: "Branch" }, { key: "location", label: "Location" },
              { key: "phone", label: "Phone" }, { key: "address", label: "Address" }, { key: "status", label: "Status" },
            ]}
            rows={branches} />
          <button onClick={() => { setForm(EMPTY); setAddOpen(true); }}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg px-4 py-2.5">
            <Plus size={15} /> Add branch
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-300"><Loader2 className="animate-spin" size={24} /></div>
      ) : branches.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-50 p-12 text-center">
          <GitBranch size={32} className="text-brand-100 mx-auto mb-3" />
          <p className="text-brand-400 text-sm">No branches yet. Add your first branch to get started.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {branches.map((b) => (
            <div key={b.branchId} className={"bg-white rounded-xl border shadow-card p-5 " +
              (b.status === "archived" ? "opacity-60 border-brand-50" : "border-brand-50")}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-display text-sm font-semibold text-brand-700">{b.name}</p>
                  {b.location && <p className="text-xs text-brand-300 mt-0.5">{b.location}</p>}
                </div>
                <span className={"text-xs font-medium px-2 py-0.5 rounded-full " +
                  (b.status === "archived" ? "bg-brand-50 text-brand-300" : "bg-green-50 text-green-600")}>
                  {b.status === "archived" ? "Archived" : "Active"}
                </span>
              </div>
              {b.phone && <p className="text-xs text-brand-400 mb-1">📞 {b.phone}</p>}
              {b.address && <p className="text-xs text-brand-400 mb-3">📍 {b.address}</p>}
              <p className="text-[11px] text-brand-200 font-mono mb-3">ID: {b.branchId.slice(0, 8)}...</p>
              {b.status === "active" ? (
                <div className="flex gap-2">
                  <button onClick={() => setEditItem({ ...b })}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-brand-100 text-brand-500 hover:border-brand-300 rounded-lg py-1.5">
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => handleArchive(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-brand-100 text-brand-400 hover:border-orange-200 hover:text-orange-500 rounded-lg py-1.5">
                    <Archive size={12} /> Archive
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => handleUnarchive(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-green-100 text-green-600 hover:border-green-300 rounded-lg py-1.5">
                    ✓ Restore
                  </button>
                  <button onClick={() => handleDelete(b)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium border border-red-100 text-red-500 hover:border-red-300 rounded-lg py-1.5">
                    🗑 Delete
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add new branch">
        <BranchForm data={form} setData={setForm} onSubmit={handleAdd} label="Create branch" submitting={submitting} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit branch">
        {editItem && <BranchForm data={editItem} setData={setEditItem} onSubmit={handleEdit} label="Save changes" submitting={submitting} />}
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
