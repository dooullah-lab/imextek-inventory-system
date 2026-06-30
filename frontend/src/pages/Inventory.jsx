// src/pages/Inventory.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import ExportMenu from "../components/ExportMenu";
import { Plus, Minus, PackagePlus, AlertTriangle, Search, Loader2 } from "lucide-react";

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionModal, setActionModal] = useState(null); // { type: 'sale'|'restock', product }
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [actionQty, setActionQty] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [newProduct, setNewProduct] = useState({ name: "", category: "", quantity: "", price: "", lowStockThreshold: "5" });

  const loadProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/products");
      setProducts(res.data);
    } catch (err) {
      showToast(err.response?.data?.error || "Could not load products.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProducts(); }, []);

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
      setNewProduct({ name: "", category: "", quantity: "", price: "", lowStockThreshold: "5" });
      showToast("Product added.");
      loadProducts();
    } catch (err) {
      showToast(err.response?.data?.error || "Could not add product.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const endpoint = actionModal.type === "sale" ? "/transactions/sale" : "/transactions/restock";
      await api.post(endpoint, { productId: actionModal.product.productId, quantity: Number(actionQty) });
      showToast(actionModal.type === "sale" ? "Sale recorded." : "Stock restocked.");
      setActionModal(null);
      setActionQty(1);
      loadProducts();
    } catch (err) {
      showToast(err.response?.data?.error || "Action failed.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
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
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products..."
          className="w-full rounded-lg border border-brand-100 pl-9 pr-3 py-2 text-sm
                     focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white"
        />
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
                      <td className="px-5 py-3.5 text-brand-400">{p.category}</td>
                      <td className="px-5 py-3.5 text-brand-600 font-mono text-[13px]">{formatNaira(p.price)}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 font-medium ${low ? "text-copper-600" : "text-brand-600"}`}>
                          {low && <AlertTriangle size={13} />}
                          {p.quantity}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActionModal({ type: "sale", product: p })}
                            className="flex items-center gap-1 text-xs font-medium text-brand-500 hover:text-brand-700
                                       border border-brand-100 hover:border-brand-300 rounded-md px-2.5 py-1.5 transition-colors"
                          >
                            <Minus size={12} /> Sell
                          </button>
                          <button
                            onClick={() => setActionModal({ type: "restock", product: p })}
                            className="flex items-center gap-1 text-xs font-medium text-copper-600 hover:text-copper-600
                                       border border-copper-100 hover:border-copper-400 rounded-md px-2.5 py-1.5 transition-colors"
                          >
                            <PackagePlus size={12} /> Restock
                          </button>
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
          <input placeholder="Category" value={newProduct.category}
            onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none" />
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

      {/* Sell / Restock Modal */}
      <Modal open={!!actionModal} onClose={() => setActionModal(null)} title={actionModal?.type === "sale" ? "Record a sale" : "Restock product"}>
        <form onSubmit={handleAction} className="space-y-3">
          <p className="text-sm text-brand-500">
            {actionModal?.product?.name} &middot; currently {actionModal?.product?.quantity} in stock
          </p>
          <input required type="number" min="1" value={actionQty}
            onChange={(e) => setActionQty(e.target.value)}
            className="w-full rounded-lg border border-brand-100 px-3 py-2 text-sm focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none"
            placeholder="Quantity" />
          <button disabled={submitting} type="submit"
            className={`w-full text-white text-sm font-medium rounded-lg py-2.5 disabled:opacity-60 ${
              actionModal?.type === "sale" ? "bg-brand-500 hover:bg-brand-600" : "bg-copper-500 hover:bg-copper-600"
            }`}>
            {submitting ? "Saving..." : actionModal?.type === "sale" ? "Confirm sale" : "Confirm restock"}
          </button>
        </form>
      </Modal>

      {toast && (
        <div className={`fixed bottom-5 right-5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white
          ${toast.type === "error" ? "bg-red-500" : "bg-brand-600"}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
