// src/pages/MasterCatalogue.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { Plus, Pencil, Trash2, Loader2, BookOpen } from "lucide-react";

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const EMPTY = { name: "", category: "", defaultPurchasePrice: "", defaultSellingPrice: "" };

// Defined OUTSIDE component — prevents typing lag
function CatalogueForm({ data, setData, onSubmit, label, submitting }) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input required placeholder="Product name" value={data.name}
        onChange={(e) => setData({ ...data, name: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
      <input placeholder="Category" value={data.category}
        onChange={(e) => setData({ ...data, category: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-brand-400 mb-1">Default Purchase Price (₦)</label>
          <input type="number" min="0" placeholder="0" value={data.defaultPurchasePrice}
            onChange={(e) => setData({ ...data, defaultPurchasePrice: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs text-brand-400 mb-1">Default Selling Price (₦)</label>
          <input type="number" min="0" placeholder="0" value={data.defaultSellingPrice}
            onChange={(e) => setData({ ...data, defaultSellingPrice: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
        </div>
      </div>
      <p className="text-xs text-brand-300">Branch managers can override these prices when they add the product to their branch.</p>
      <button disabled={submitting} type="submit"
        className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60">
        {submitting ? "Saving..." : label}
      </button>
    </form>
  );
}

export default function MasterCatalogue() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/master-catalogue");
      setItems(res.data);
    } catch { showToast("Could not load catalogue.", "error"); }
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
      await api.post("/master-catalogue", form);
      setAddOpen(false);
      setForm(EMPTY);
      showToast("Product added to catalogue.");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not add product.", "error");
    } finally { setSubmitting(false); }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/master-catalogue/${editItem.catalogueId}`, editItem);
      setEditItem(null);
      showToast("Updated.");
      load();
    } catch (err) {
      showToast("Could not update.", "error");
    } finally { setSubmitting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Remove this product from the master catalogue?")) return;
    try {
      await api.delete(`/master-catalogue/${id}`);
      showToast("Removed.");
      load();
    } catch { showToast("Could not remove.", "error"); }
  };

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.category || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-700 flex items-center gap-2">
            <BookOpen size={22} className="text-brand-500" /> Master Catalogue
          </h1>
          <p className="text-sm text-brand-300 mt-0.5">
            {user?.role === "admin"
              ? "Central product templates — branch managers copy from here and set their own prices"
              : "Browse the master catalogue to add products to your branch inventory"}
          </p>
        </div>
        {user?.role === "admin" && (
          <button onClick={() => { setForm(EMPTY); setAddOpen(true); }}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg px-4 py-2.5">
            <Plus size={15} /> Add to catalogue
          </button>
        )}
      </div>

      <div className="relative mb-5 max-w-sm">
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search catalogue..."
          className="w-full rounded-lg border border-brand-100 pl-4 pr-3 py-2 text-sm
                     focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-300">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-50 p-12 text-center">
          <BookOpen size={28} className="text-brand-100 mx-auto mb-3" />
          <p className="text-brand-400 text-sm">
            {items.length === 0 ? "Master catalogue is empty. Add products to get started." : "No products match your search."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-50 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-50 text-left text-brand-300 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Default Purchase ₦</th>
                  <th className="px-5 py-3 font-medium">Default Selling ₦</th>
                  {user?.role === "admin" && <th className="px-5 py-3 font-medium text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.catalogueId} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/30">
                    <td className="px-5 py-3.5 font-medium text-brand-700">{item.name}</td>
                    <td className="px-5 py-3.5 text-brand-400">{item.category}</td>
                    <td className="px-5 py-3.5 text-brand-500 font-mono text-[13px]">{formatNaira(item.defaultPurchasePrice)}</td>
                    <td className="px-5 py-3.5 text-brand-600 font-mono text-[13px]">{formatNaira(item.defaultSellingPrice)}</td>
                    {user?.role === "admin" && (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setEditItem({ ...item })}
                            className="text-brand-300 hover:text-brand-600 p-1.5">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(item.catalogueId)}
                            className="text-brand-300 hover:text-red-500 p-1.5">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add to master catalogue">
        <CatalogueForm data={form} setData={setForm} onSubmit={handleAdd} label="Add product" submitting={submitting} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit catalogue item">
        {editItem && <CatalogueForm data={editItem} setData={setEditItem} onSubmit={handleEdit} label="Save changes" submitting={submitting} />}
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
