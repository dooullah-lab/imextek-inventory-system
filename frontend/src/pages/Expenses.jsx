// src/pages/Expenses.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import ExportMenu from "../components/ExportMenu";
import { Plus, Pencil, Trash2, Loader2, Receipt } from "lucide-react";

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const EMPTY = { title: "", amount: "", category: "", date: new Date().toISOString().slice(0, 10), notes: "" };

// Defined OUTSIDE component — prevents React unmount/remount on every keystroke
function ExpenseFormFields({ data, setData, categories }) {
  return (
    <div className="space-y-3">
      <input required placeholder="Expense title (e.g. Office rent)" value={data.title}
        onChange={(e) => setData({ ...data, title: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
      <div className="grid grid-cols-2 gap-3">
        <input required type="number" min="0" placeholder="Amount (₦)" value={data.amount}
          onChange={(e) => setData({ ...data, amount: e.target.value })}
          className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
        <input type="date" value={data.date}
          onChange={(e) => setData({ ...data, date: e.target.value })}
          className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
      </div>
      <select required value={data.category} onChange={(e) => setData({ ...data, category: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white">
        <option value="">Select category</option>
        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <textarea placeholder="Notes (optional)" value={data.notes}
        onChange={(e) => setData({ ...data, notes: e.target.value })} rows={2}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none resize-none" />
    </div>
  );
}

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [expRes, catRes] = await Promise.all([
        api.get("/expenses"),
        api.get("/expenses/categories"),
      ]);
      setExpenses(expRes.data);
      setCategories(catRes.data);
    } catch (err) {
      showToast("Could not load expenses.", "error");
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
    setSubmitting(true);
    try {
      await api.post("/expenses", form);
      setAddOpen(false);
      setForm(EMPTY);
      showToast("Expense recorded.");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not add expense.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/expenses/${editItem.expenseId}`, editItem);
      setEditItem(null);
      showToast("Expense updated.");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not update.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this expense record?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      showToast("Expense deleted.");
      load();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not delete.", "error");
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-700 flex items-center gap-2">
            <Receipt size={22} className="text-brand-500" /> Operating Expenses
          </h1>
          <p className="text-sm text-brand-300 mt-0.5">
            Total recorded: <span className="font-medium text-copper-600">{formatNaira(totalExpenses)}</span>
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <ExportMenu
            filename="imextek-expenses"
            title="ImEx-Tek Expenses Report"
            columns={[
              { key: "date", label: "Date" },
              { key: "title", label: "Title" },
              { key: "category", label: "Category" },
              { key: "amount", label: "Amount (NGN)" },
              { key: "notes", label: "Notes" },
            ]}
            rows={expenses}
          />
          <button onClick={() => { setForm(EMPTY); setAddOpen(true); }}
            className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white
                       text-sm font-medium rounded-lg px-4 py-2.5 transition-colors flex-1 sm:flex-none">
            <Plus size={16} /> Add expense
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-300">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : expenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-50 p-12 text-center">
          <p className="text-brand-400 text-sm">No expenses recorded yet. Add your first expense to track costs.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-50 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-50 text-left text-brand-300 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.expenseId} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/40">
                    <td className="px-5 py-3.5 text-brand-400 text-xs">{e.date}</td>
                    <td className="px-5 py-3.5 font-medium text-brand-700">
                      {e.title}
                      {e.notes && <p className="text-xs text-brand-300 font-normal mt-0.5">{e.notes}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs bg-brand-50 text-brand-500 px-2 py-1 rounded-md">{e.category}</span>
                    </td>
                    <td className="px-5 py-3.5 text-copper-600 font-mono font-medium text-[13px]">
                      {formatNaira(e.amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setEditItem({ ...e })}
                          className="text-brand-300 hover:text-brand-600 p-1.5 transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(e.expenseId)}
                          className="text-brand-300 hover:text-red-500 p-1.5 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Record new operating expense">
        <form onSubmit={handleAdd} className="space-y-3">
          <ExpenseFormFields data={form} setData={setForm} categories={categories} />
          <button disabled={submitting} type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60">
            {submitting ? "Adding..." : "Add expense"}
          </button>
        </form>
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit operating expense">
        {editItem && (
          <form onSubmit={handleEdit} className="space-y-3">
            <ExpenseFormFields data={editItem} setData={setEditItem} categories={categories} />
            <button disabled={submitting} type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60">
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </form>
        )}
      </Modal>

      {toast && (
        <div className={"fixed bottom-5 right-5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white " + (toast.type === "error" ? "bg-red-500" : "bg-brand-600")}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
