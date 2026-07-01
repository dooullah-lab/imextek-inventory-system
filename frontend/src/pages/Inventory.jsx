// src/pages/Inventory.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import ExportMenu from "../components/ExportMenu";
import Receipt from "../components/Receipt";
import { useAuth } from "../context/AuthContext";
import {
  Plus, Minus, PackagePlus, AlertTriangle, Search,
  Loader2, Pencil, Trash2,
} from "lucide-react";

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const EMPTY_PRODUCT = { name: "", category: "", quantity: "", price: "", lowStockThreshold: "5" };

export default function Inventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionModal, setActionModal] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [actionQty, setActionQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [newProduct, setNewProduct] = useState(EMPTY_PRODUCT);
  const [receipt, setReceipt] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        api.get("/products"),
        api.get("/categories"),
      ]);
      setProducts(prodRes.data);
      setCategories(catRes.data);
    } catch (err) {
      showToast("Could not load inventory.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/products", {
        ...newProduct,
        quantity: Number(newProduct.quantity),
        price: Number(newProduct.price),
        lowStockThreshold: Number(newProduct.lowStockThreshold),
      });
      setAddModalOpen(false);
      setNewProduct(EMPTY_PRODUCT);
      showToast("Product added.");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not add product.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/products/${editModal.productId}`, {
        name: editModal.name,
        category: editModal.category,
        price: Number(editModal.price),
        lowStockThreshold: Number(editModal.lowStockThreshold),
      });
      setEditModal(null);
      showToast("Product updated.");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not update product.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (productId) => {
    setSubmitting(true);
    try {
      await api.delete(`/products/${productId}`);
      setDeleteConfirm(null);
      showToast("Product deleted.");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not delete product.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = actionModal.type === "sale" ? "/transactions/sale" : "/transactions/restock";
      const res = await api.post(endpoint, {
        productId: actionModal.product.productId,
        quantity: Number(actionQty),
      });
      if (actionModal.type === "sale") {
        setReceipt(res.data.transaction);
      } else {
        showToast("Stock restocked.");
      }
      setActionModal(null);
      setActionQty(1);
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Action failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const CategorySelect = ({ value, onChange, className }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className={className || "w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white"}>
      <option value="">Select category</option>
      {categories.map((c) => (
        <option key={c.categoryId} value={c.name}>{c.name}</option>
      ))}
      <option value="Uncategorized">Uncategorized</option>
    </select>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-700">Inventory</h1>
          <p className="text-sm text-brand-300 mt-0.5">{products.length} products tracked</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <ExportMenu
            filename="imextek-inventory"
            title="ImEx-Tek Inventory Report"
            columns={[
              { key: "name", label: "Product" },
              { key: "category", label: "Category" },
              { key: "price", label: "Price (NGN)" },
              { key: "quantity", label: "Stock" },
              { key: "lowStockThreshold", label: "Low Stock Threshold" },
            ]}
            rows={products}
          />
          <button
            onClick={() => setAddModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white
                       text-sm font-medium rounded-lg px-4 py-2.5 transition-colors flex-1 sm:flex-none"
          >
            <Plus size={16} /> Add product
          </button>
        </div>
      </div>

      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-lg border border-brand-100 pl-9 pr-3 py-2 text-sm
                     focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-300">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-50 p-12 text-center">
          <p className="text-brand-400 text-sm">
            {products.length === 0 ? "No products yet. Add your first product to get started." : "No products match your search."}
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
                  <th className="px-5 py-3 font-medium">Price</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const low = p.quantity <= p.lowStockThreshold;
                  return (
                    <tr key={p.productId} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/40">
                      <td className="px-5 py-3.5 font-medium text-brand-700">{p.name}</td>
                      <td className="px-5 py-3.5 text-brand-400">{p.category || "—"}</td>
                      <td className="px-5 py-3.5 text-brand-600 font-mono text-[13px]">{formatNaira(p.price)}</td>
                      <td className="px-5 py-3.5">
                        <span className={"inline-flex items-center gap-1 font-medium " + (low ? "text-copper-600" : "text-brand-600")}>
                          {low && <AlertTriangle size={13} />}
                          {p.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => setActionModal({ type: "sale", product: p })}
                            className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-700
                                       border border-brand-100 hover:border-brand-300 rounded-md px-2.5 py-1.5 transition-colors">
                            <Minus size={12} /> Sell
                          </button>
                          <button onClick={() => setActionModal({ type: "restock", product: p })}
                            className="flex items-center gap-1 text-xs font-medium text-copper-600
                                       border border-copper-100 hover:border-copper-400 rounded-md px-2.5 py-1.5 transition-colors">
                            <PackagePlus size={12} /> Restock
                          </button>
                          <button onClick={() => setEditModal({ ...p })}
                            className="text-brand-300 hover:text-brand-600 p-1.5 transition-colors">
                            <Pencil size={14} />
                          </button>
                          {user?.role === "admin" && (
                            <button onClick={() => setDeleteConfirm(p)}
                              className="text-brand-300 hover:text-red-500 p-1.5 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      <Modal open={addModalOpen} onClose={() => setAddModalOpen(false)} title="Add new product">
        <form onSubmit={handleAddProduct} className="space-y-3">
          <input required placeholder="Product name" value={newProduct.name}
            onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
          <CategorySelect value={newProduct.category}
            onChange={(val) => setNewProduct({ ...newProduct, category: val })} />
          <div className="grid grid-cols-2 gap-3">
            <input required type="number" min="0" placeholder="Quantity" value={newProduct.quantity}
              onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })}
              className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
            <input required type="number" min="0" placeholder="Price (₦)" value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
          </div>
          <input type="number" min="0" placeholder="Low stock alert threshold (default 5)" value={newProduct.lowStockThreshold}
            onChange={(e) => setNewProduct({ ...newProduct, lowStockThreshold: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
          <button disabled={submitting} type="submit"
            className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg py-2.5 mt-2 disabled:opacity-60">
            {submitting ? "Adding..." : "Add product"}
          </button>
        </form>
      </Modal>

      {/* Edit Product Modal */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit product">
        {editModal && (
          <form onSubmit={handleEditProduct} className="space-y-3">
            <input required placeholder="Product name" value={editModal.name}
              onChange={(e) => setEditModal({ ...editModal, name: e.target.value })}
              className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
            <CategorySelect value={editModal.category}
              onChange={(val) => setEditModal({ ...editModal, category: val })} />
            <input required type="number" min="0" placeholder="Price (₦)" value={editModal.price}
              onChange={(e) => setEditModal({ ...editModal, price: e.target.value })}
              className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
            <input type="number" min="0" placeholder="Low stock threshold" value={editModal.lowStockThreshold}
              onChange={(e) => setEditModal({ ...editModal, lowStockThreshold: e.target.value })}
              className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
            <p className="text-xs text-brand-300">Note: to adjust stock quantity, use the Sell or Restock buttons — this keeps the activity log accurate.</p>
            <button disabled={submitting} type="submit"
              className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60">
              {submitting ? "Saving..." : "Save changes"}
            </button>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete product">
        {deleteConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-brand-600">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>?
              This can't be undone. Transaction history for this product will be kept.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-brand-100 text-brand-600 text-sm font-medium rounded-lg py-2.5 hover:bg-brand-50">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteConfirm.productId)} disabled={submitting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60">
                {submitting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Sell / Restock Modal */}
      <Modal open={!!actionModal} onClose={() => setActionModal(null)}
        title={actionModal?.type === "sale" ? "Record a sale" : "Restock product"}>
        <form onSubmit={handleAction} className="space-y-3">
          <p className="text-sm text-brand-500">
            {actionModal?.product?.name} &middot; currently {actionModal?.product?.quantity} in stock
          </p>
          <input required type="number" min="1" value={actionQty}
            onChange={(e) => setActionQty(e.target.value)}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
            placeholder="Quantity" />
          <button disabled={submitting} type="submit"
            className={"w-full text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60 " +
              (actionModal?.type === "sale" ? "bg-brand-500 hover:bg-brand-600" : "bg-copper-500 hover:bg-copper-600")}>
            {submitting ? "Saving..." : actionModal?.type === "sale" ? "Confirm sale" : "Confirm restock"}
          </button>
        </form>
      </Modal>

      {/* Receipt */}
      <Receipt open={!!receipt} onClose={() => setReceipt(null)} transaction={receipt} />

      {toast && (
        <div className={"fixed bottom-5 right-5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white " +
          (toast.type === "error" ? "bg-red-500" : "bg-brand-600")}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
