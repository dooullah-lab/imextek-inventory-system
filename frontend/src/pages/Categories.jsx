// src/pages/Categories.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Plus, Pencil, Trash2, Check, X, Loader2, Tag } from "lucide-react";

export default function Categories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (err) {
      showToast("Could not load categories.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.post("/categories", { name: newName.trim() });
      setNewName("");
      showToast("Category added.");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not add category.", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleEdit = async (id) => {
    if (!editName.trim()) return;
    try {
      await api.patch(`/categories/${id}`, { name: editName.trim() });
      setEditingId(null);
      showToast("Category updated.");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not update category.", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this category? Products using it will keep the category name but won't appear in the dropdown for new products.")) return;
    try {
      await api.delete(`/categories/${id}`);
      showToast("Category deleted.");
      load();
    } catch (err) {
      showToast("Could not delete category.", "error");
    }
  };

  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-brand-700 flex items-center gap-2">
          <Tag size={22} className="text-brand-500" /> Categories
        </h1>
        <p className="text-sm text-brand-300 mt-0.5">Manage product categories used across inventory</p>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2 mb-5">
        <input
          value={newName} onChange={(e) => setNewName(e.target.value)}
          placeholder="New category name..."
          className="flex-1 rounded-lg border border-brand-100 px-3 py-2 text-sm
                     focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white"
        />
        <button type="submit" disabled={adding || !newName.trim()}
          className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium
                     rounded-lg px-4 py-2 disabled:opacity-60 transition-colors">
          <Plus size={15} /> Add
        </button>
      </form>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-brand-300">
          <Loader2 className="animate-spin" size={22} />
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-50 p-10 text-center">
          <p className="text-brand-400 text-sm">No categories yet. Add one above to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-50 shadow-card divide-y divide-brand-50">
          {categories.map((c) => (
            <div key={c.categoryId} className="flex items-center gap-3 px-4 py-3">
              {editingId === c.categoryId ? (
                <>
                  <input autoFocus value={editName} onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 rounded-md border border-brand-200 px-2.5 py-1.5 text-sm outline-none focus:border-brand-400" />
                  <button onClick={() => handleEdit(c.categoryId)}
                    className="text-green-600 hover:text-green-700 p-1.5"><Check size={15} /></button>
                  <button onClick={() => setEditingId(null)}
                    className="text-brand-300 hover:text-brand-600 p-1.5"><X size={15} /></button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-brand-700">{c.name}</span>
                  {user?.role === "admin" && (
                    <>
                      <button onClick={() => { setEditingId(c.categoryId); setEditName(c.name); }}
                        className="text-brand-300 hover:text-brand-600 p-1.5 transition-colors"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(c.categoryId)}
                        className="text-brand-300 hover:text-red-500 p-1.5 transition-colors"><Trash2 size={14} /></button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className={"fixed bottom-5 right-5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white " + (toast.type === "error" ? "bg-red-500" : "bg-brand-600")}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
