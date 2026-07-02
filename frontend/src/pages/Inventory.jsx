// src/pages/Inventory.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import ExportMenu from "../components/ExportMenu";
import BulkUpload from "../components/BulkUpload";
import ProductForm from "../components/ProductForm";
import { useAuth } from "../context/AuthContext";
import {
  Plus, PackagePlus, AlertTriangle, Search,
  Loader2, Pencil, Trash2, Upload,
} from "lucide-react";

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const EMPTY = { name: "", category: "", quantity: "", purchasePrice: "", sellingPrice: "", lowStockThreshold: "5" };

export default function Inventory() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [restockModal, setRestockModal] = useState(null); // multi-item restock
  const [restockItems, setRestockItems] = useState([]); // [{ product, quantity }]
  const [bulkOpen, setBulkOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [newProduct, setNewProduct] = useState(EMPTY);

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

  const handleAdd = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/products", {
        ...newProduct,
        quantity: Number(newProduct.quantity),
        purchasePrice: Number(newProduct.purchasePrice),
        sellingPrice: Number(newProduct.sellingPrice),
        lowStockThreshold: Number(newProduct.lowStockThreshold),
      });
      setAddOpen(false);
      setNewProduct(EMPTY);
      showToast("Product added.");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not add product.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.patch(`/products/${editModal.productId}`, {
        name: editModal.name, category: editModal.category,
        purchasePrice: Number(editModal.purchasePrice),
        sellingPrice: Number(editModal.sellingPrice),
        lowStockThreshold: Number(editModal.lowStockThreshold),
      });
      setEditModal(null);
      showToast("Product updated.");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not update.", "error");
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
      showToast(err.response?.data?.error || "Could not delete.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Multi-item restock
  const addToRestock = (product) => {
    setRestockItems((prev) => {
      const existing = prev.find((r) => r.product.productId === product.productId);
      if (existing) return prev.map((r) => r.product.productId === product.productId ? { ...r, quantity: r.quantity + 1 } : r);
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleConfirmRestock = async () => {
    if (restockItems.length === 0) return;
    setSubmitting(true);
    try {
      await api.post("/transactions/restock", {
        items: restockItems.map((r) => ({ productId: r.product.productId, quantity: r.quantity })),
      });
      setRestockItems([]);
      setRestockModal(false);
      showToast("Restock recorded.");
      loadData();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not restock.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const CategorySelect = ({ value, onChange }) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white">
      <option value="">Select category</option>
      {categories.map((c) => <option key={c.categoryId} value={c.name}>{c.name}</option>)}
      <option value="Uncategorized">Uncategorized</option>
    </select>
  );

  const ProductFormInline = ({ data, setData, onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-3">
      <input required placeholder="Product name" value={data.name}
        onChange={(e) => setData({ ...data, name: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
      <CategorySelect value={data.category} onChange={(val) => setData({ ...data, category: val })} />
      {data.quantity !== undefined && (
        <input required type="number" min="0" placeholder="Initial quantity" value={data.quantity}
          onChange={(e) => setData({ ...data, quantity: e.target.value })}
          className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-brand-400 mb-1">Purchase Price (₦)</label>
          <input required type="number" min="0" placeholder="Cost price" value={data.purchasePrice}
            onChange={(e) => setData({ ...data, purchasePrice: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
        </div>
        <div>
          <label className="block text-xs text-brand-400 mb-1">Selling Price (₦)</label>
          <input required type="number" min="0" placeholder="Sale price" value={data.sellingPrice}
            onChange={(e) => setData({ ...data, sellingPrice: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
        </div>
      </div>
      {data.purchasePrice && data.sellingPrice && (
        <div className={"rounded-lg px-3 py-2 text-xs " +
          (Number(data.sellingPrice) > Number(data.purchasePrice) ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
          Margin: {formatNaira(Number(data.sellingPrice) - Number(data.purchasePrice))} per unit
          {" "}({Number(data.purchasePrice) > 0 ? (((Number(data.sellingPrice) - Number(data.purchasePrice)) / Number(data.purchasePrice)) * 100).toFixed(1) : 0}%)
        </div>
      )}
      <input type="number" min="0" placeholder="Low stock threshold (default 5)" value={data.lowStockThreshold}
        onChange={(e) => setData({ ...data, lowStockThreshold: e.target.value })}
        className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
      <button disabled={submitting} type="submit"
        className="w-full bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60">
        {submitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-700">Inventory</h1>
          <p className="text-sm text-brand-300 mt-0.5">{products.length} products tracked</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <ExportMenu
            filename="imextek-inventory"
            title="ImEx-Tek Inventory Report"
            columns={[
              { key: "name", label: "Product" },
              { key: "category", label: "Category" },
              { key: "purchasePrice", label: "Purchase Price (NGN)" },
              { key: "sellingPrice", label: "Selling Price (NGN)" },
              { key: "quantity", label: "Stock" },
              { key: "lowStockThreshold", label: "Low Stock Threshold" },
            ]}
            rows={products}
          />
          <button onClick={() => setRestockModal(true)}
            className="flex items-center gap-2 border border-brand-100 hover:border-brand-300 text-brand-600
                       text-sm font-medium rounded-lg px-3.5 py-2 transition-colors">
            <PackagePlus size={15} /> Restock
          </button>
          <button onClick={() => setBulkOpen(true)}
            className="flex items-center gap-2 border border-brand-100 hover:border-brand-300 text-brand-600
                       text-sm font-medium rounded-lg px-3.5 py-2 transition-colors">
            <Upload size={15} /> Import
          </button>
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white
                       text-sm font-medium rounded-lg px-4 py-2 transition-colors">
            <Plus size={15} /> Add product
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
      ) : (
        <div className="bg-white rounded-xl border border-brand-50 shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-50 text-left text-brand-300 text-xs uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">Product</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Purchase ₦</th>
                  <th className="px-5 py-3 font-medium">Selling ₦</th>
                  <th className="px-5 py-3 font-medium">Margin</th>
                  <th className="px-5 py-3 font-medium">Stock</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-sm text-brand-300">
                    {products.length === 0 ? "No products yet." : "No products match your search."}
                  </td></tr>
                ) : filtered.map((p) => {
                  const low = p.quantity <= p.lowStockThreshold;
                  const margin = (p.sellingPrice || p.price || 0) - (p.purchasePrice || 0);
                  return (
                    <tr key={p.productId} className="border-b border-brand-50 last:border-0 hover:bg-brand-50/40">
                      <td className="px-5 py-3.5 font-medium text-brand-700">{p.name}</td>
                      <td className="px-5 py-3.5 text-brand-400">{p.category || "—"}</td>
                      <td className="px-5 py-3.5 text-brand-500 font-mono text-[13px]">{formatNaira(p.purchasePrice || 0)}</td>
                      <td className="px-5 py-3.5 text-brand-600 font-mono text-[13px]">{formatNaira(p.sellingPrice || p.price)}</td>
                      <td className="px-5 py-3.5">
                        <span className={"text-xs font-medium " + (margin > 0 ? "text-green-600" : "text-red-500")}>
                          {formatNaira(margin)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={"inline-flex items-center gap-1 font-medium " + (low ? "text-copper-600" : "text-brand-600")}>
                          {low && <AlertTriangle size={13} />}
                          {p.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => { addToRestock(p); setRestockModal(true); }}
                            className="text-xs font-medium text-copper-600 border border-copper-100
                                       hover:border-copper-400 rounded-md px-2.5 py-1.5 transition-colors flex items-center gap-1">
                            <PackagePlus size={12} /> Restock
                          </button>
                          <button onClick={() => setEditModal({ ...p, sellingPrice: p.sellingPrice || p.price })}
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

      {/* Add Product */}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add new product">
        <ProductForm
          data={newProduct}
          setData={setNewProduct}
          onSubmit={handleAdd}
          submitLabel="Add product"
          submitting={submitting}
          categories={categories}
          showQuantity={true}
        />
      </Modal>

      {/* Edit Product */}
      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit product">
        {editModal && (
          <ProductForm
            data={{ ...editModal, sellingPrice: editModal.sellingPrice || editModal.price }}
            setData={setEditModal}
            onSubmit={handleEdit}
            submitLabel="Save changes"
            submitting={submitting}
            categories={categories}
            showQuantity={false}
          />
        )}
      </Modal>

      {/* Delete Confirmation */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete product">
        {deleteConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-brand-600">
              Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This can't be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 border border-brand-100 text-brand-600 text-sm font-medium rounded-lg py-2.5">
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

      {/* Multi-item Restock Modal */}
      <Modal open={!!restockModal} onClose={() => { setRestockModal(false); setRestockItems([]); }} title="Restock products">
        <div className="space-y-3">
          <p className="text-sm text-brand-400">Select products from the inventory table to add them here, or search below.</p>
          <div className="max-h-52 overflow-y-auto space-y-2 border border-brand-50 rounded-lg p-2">
            {products.map((p) => {
              const item = restockItems.find((r) => r.product.productId === p.productId);
              return (
                <div key={p.productId} className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-brand-50">
                  <div>
                    <span className="font-medium text-brand-700">{p.name}</span>
                    <span className="text-brand-300 text-xs ml-2">{p.quantity} in stock</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item ? (
                      <>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => {
                            const val = Math.max(1, Number(e.target.value) || 1);
                            setRestockItems((prev) => prev.map((r) =>
                              r.product.productId === p.productId ? { ...r, quantity: val } : r
                            ));
                          }}
                          className="w-20 rounded-md border border-brand-100 px-2 py-1 text-sm text-center focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
                        />
                        <button
                          onClick={() => setRestockItems((prev) => prev.filter((r) => r.product.productId !== p.productId))}
                          className="text-brand-200 hover:text-red-400 text-xs px-1">
                          ✕
                        </button>
                      </>
                    ) : (
                      <button onClick={() => addToRestock(p)}
                        className="text-xs text-brand-500 border border-brand-100 hover:border-brand-300 rounded px-2.5 py-1">
                        Add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {restockItems.length > 0 && (
            <div className="bg-brand-50 rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-brand-600 mb-2">Restocking {restockItems.length} product(s):</p>
              {restockItems.map((r) => (
                <div key={r.product.productId} className="flex justify-between text-xs text-brand-600">
                  <span>{r.product.name}</span>
                  <span>+{r.quantity} units</span>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleConfirmRestock} disabled={submitting || restockItems.length === 0}
            className="w-full bg-copper-500 hover:bg-copper-600 text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60">
            {submitting ? "Saving..." : `Confirm Restock (${restockItems.length} items)`}
          </button>
        </div>
      </Modal>

      {/* Bulk Upload */}
      <BulkUpload open={bulkOpen} onClose={() => setBulkOpen(false)} onSuccess={() => { loadData(); showToast("Products imported successfully."); }} />

      {toast && (
        <div className={"fixed bottom-5 right-5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white " +
          (toast.type === "error" ? "bg-red-500" : "bg-brand-600")}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
