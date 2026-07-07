// src/pages/POS.jsx
import { useEffect, useState, useCallback } from "react";
import api from "../api/client";
import Receipt from "../components/Receipt";
import ScanModeToggle from "../components/ScanModeToggle";
import useBarcodeScanner from "../hooks/useBarcodeScanner";
import useOfflineQueue from "../hooks/useOfflineQueue";
import { ShoppingCart, Plus, Minus, Trash2, Search, Loader2, AlertTriangle, CheckCircle, WifiOff, RefreshCw } from "lucide-react";

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

export default function POS() {
  const [products, setProducts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]); // [{ product, quantity }]
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null); // multi-item receipt
  const [toast, setToast] = useState(null);
  const [scanMode, setScanMode] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const { isOnline, queue, addToQueue, syncQueue, syncing, pendingCount } = useOfflineQueue(); // { message, type }

  const load = async () => {
    setLoading(true);
    try {
      const [prodRes, lowRes] = await Promise.all([
        api.get("/products"),
        api.get("/analytics/low-stock"),
      ]);
      setProducts(prodRes.data);
      setLowStock(lowRes.data);
    } catch (err) {
      showToast("Could not load products.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Called by the barcode scanner hook when a barcode is detected
  const handleBarcodeScan = useCallback(async (barcode) => {
    if (!scanMode) return;
    try {
      const res = await api.get(`/products/barcode/${encodeURIComponent(barcode)}`);
      const product = res.data;
      if (product.quantity === 0) {
        setScanFeedback({ message: `${product.name} is out of stock`, type: "error" });
        setTimeout(() => setScanFeedback(null), 2500);
        return;
      }
      addToCart(product);
      setScanFeedback({ message: `Added: ${product.name}`, type: "success" });
      setTimeout(() => setScanFeedback(null), 1500);
    } catch (err) {
      setScanFeedback({ message: `Barcode not found: ${barcode}`, type: "error" });
      setTimeout(() => setScanFeedback(null), 2500);
    }
  }, [scanMode]);

  useBarcodeScanner(handleBarcodeScan, scanMode);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category || "").toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.product.productId === product.productId);
      if (existing) {
        return prev.map((c) =>
          c.product.productId === product.productId
            ? { ...c, quantity: c.quantity + 1 }
            : c
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQty = (productId, qty) => {
    if (qty < 1) { removeFromCart(productId); return; }
    setCart((prev) => prev.map((c) =>
      c.product.productId === productId ? { ...c, quantity: qty } : c
    ));
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((c) => c.product.productId !== productId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + (c.product.sellingPrice || c.product.price || 0) * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const handleConfirmSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const items = cart.map((c) => ({ productId: c.product.productId, quantity: c.quantity }));
      const groupId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

      if (!isOnline) {
        // Save to offline queue
        const entry = addToQueue(items, groupId, cart, cartTotal);
        setReceipt({ items: [], groupId: entry.offlineId, total: cartTotal, cart, offline: true });
        setCart([]);
        showToast("Offline — sale saved locally. Will sync when connected.");
        return;
      }

      const res = await api.post("/transactions/sale", { items });
      setReceipt({ items: res.data.items, groupId: res.data.groupId, total: cartTotal, cart });
      setCart([]);
      showToast("Sale recorded successfully.");
      load();
    } catch (err) {
      // If request failed due to network, save offline
      if (!navigator.onLine || err.message === "Network Error") {
        const items = cart.map((c) => ({ productId: c.product.productId, quantity: c.quantity }));
        const groupId = Date.now().toString();
        const entry = addToQueue(items, groupId, cart, cartTotal);
        setReceipt({ items: [], groupId: entry.offlineId, total: cartTotal, cart, offline: true });
        setCart([]);
        showToast("Network error — sale saved offline. Will sync when connected.");
      } else {
        showToast(err.response?.data?.error || "Could not record sale.", "error");
      }
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-700 flex items-center gap-2">
            <ShoppingCart size={22} className="text-brand-500" /> Point of Sale
          </h1>
          <p className="text-sm text-brand-300 mt-0.5">Add items to cart then confirm the sale</p>
        </div>
        <ScanModeToggle enabled={scanMode} onToggle={() => setScanMode((s) => !s)} />
      </div>

      {/* Scan mode feedback banner */}
      {scanMode && (
        <div className={"mb-4 rounded-xl px-4 py-3 flex items-center gap-3 transition-all " +
          (scanFeedback
            ? scanFeedback.type === "success"
              ? "bg-green-50 border border-green-100"
              : "bg-red-50 border border-red-100"
            : "bg-brand-50 border border-brand-100")}>
          <div className={"w-2.5 h-2.5 rounded-full shrink-0 " +
            (scanFeedback
              ? scanFeedback.type === "success" ? "bg-green-500" : "bg-red-500"
              : "bg-brand-400 animate-pulse")}>
          </div>
          <p className={"text-sm font-medium " +
            (scanFeedback
              ? scanFeedback.type === "success" ? "text-green-700" : "text-red-700"
              : "text-brand-600")}>
            {scanFeedback
              ? scanFeedback.message
              : "Scanner ready — point your scanner at any product barcode"}
          </p>
        </div>
      )}

      {/* Offline banner */}
      {!isOnline && (
        <div className="mb-4 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <WifiOff size={16} className="text-orange-500 shrink-0" />
          <p className="text-sm text-orange-700 flex-1">
            You are offline. Sales will be saved locally and synced automatically when you reconnect.
          </p>
        </div>
      )}

      {/* Pending sync banner */}
      {isOnline && pendingCount > 0 && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
          <RefreshCw size={16} className={"text-blue-500 shrink-0 " + (syncing ? "animate-spin" : "")} />
          <p className="text-sm text-blue-700 flex-1">
            {syncing ? "Syncing offline sales..." : `${pendingCount} offline sale${pendingCount > 1 ? "s" : ""} waiting to sync.`}
          </p>
          {!syncing && (
            <button onClick={syncQueue} className="text-xs font-medium text-blue-600 hover:text-blue-800">
              Sync now
            </button>
          )}
        </div>
      )}
      {lowStock.length > 0 && (
        <div className="mb-4 bg-copper-50 border border-copper-100 rounded-xl px-4 py-3 flex items-start gap-3">
          <AlertTriangle size={16} className="text-copper-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-copper-600">Low stock alert</p>
            <p className="text-xs text-copper-500 mt-0.5">
              {lowStock.map((p) => `${p.name} (${p.quantity} left)`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Product picker */}
        <div className="lg:col-span-2">
          <div className="relative mb-3">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" />
            <input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-brand-100 pl-9 pr-3 py-2 text-sm
                         focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white" />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-brand-300">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filtered.map((p) => {
                const inCart = cart.find((c) => c.product.productId === p.productId);
                const outOfStock = p.quantity === 0;
                return (
                  <button key={p.productId} onClick={() => !outOfStock && addToCart(p)} disabled={outOfStock}
                    className={"text-left bg-white rounded-xl border p-4 transition-all " +
                      (outOfStock ? "opacity-50 cursor-not-allowed border-brand-50" :
                        inCart ? "border-brand-400 shadow-cardHover" : "border-brand-50 shadow-card hover:shadow-cardHover hover:border-brand-200")}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-brand-700 leading-tight">{p.name}</p>
                      {inCart && (
                        <span className="text-[11px] bg-brand-500 text-white rounded-full px-1.5 py-0.5 ml-1 shrink-0">
                          {inCart.quantity}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-brand-300 mb-2">{p.category}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-brand-600 font-mono">
                        {formatNaira(p.sellingPrice || p.price)}
                      </p>
                      <span className={"text-xs font-medium " + (p.quantity <= p.lowStockThreshold ? "text-copper-600" : "text-brand-300")}>
                        {outOfStock ? "Out of stock" : `${p.quantity} left`}
                      </span>
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && !loading && (
                <div className="col-span-3 bg-white rounded-xl border border-brand-50 p-10 text-center">
                  <p className="text-sm text-brand-300">No products match your search.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-brand-50 shadow-card sticky top-4">
            <div className="px-4 py-3 border-b border-brand-50 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold text-brand-700">
                Cart {cartCount > 0 && <span className="text-brand-400 font-normal">({cartCount} items)</span>}
              </h3>
              {cart.length > 0 && (
                <button onClick={() => setCart([])} className="text-xs text-brand-300 hover:text-red-500">
                  Clear all
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <ShoppingCart size={28} className="text-brand-100 mx-auto mb-2" />
                <p className="text-sm text-brand-300">Cart is empty</p>
                <p className="text-xs text-brand-200 mt-1">Click a product to add it</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-brand-50 max-h-72 overflow-y-auto">
                  {cart.map((c) => (
                    <div key={c.product.productId} className="px-4 py-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-brand-700 truncate">{c.product.name}</p>
                          <p className="text-xs text-brand-300">{formatNaira(c.product.sellingPrice || c.product.price)} each</p>
                        </div>
                        <button onClick={() => removeFromCart(c.product.productId)}
                          className="text-brand-200 hover:text-red-400 p-1 ml-2 shrink-0">
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQty(c.product.productId, c.quantity - 1)}
                            className="w-6 h-6 rounded-md border border-brand-100 flex items-center justify-center text-brand-500 hover:bg-brand-50">
                            <Minus size={11} />
                          </button>
                          <span className="text-sm font-medium text-brand-700 w-5 text-center">{c.quantity}</span>
                          <button
                            onClick={() => updateQty(c.product.productId, c.quantity + 1)}
                            disabled={c.quantity >= c.product.quantity}
                            className="w-6 h-6 rounded-md border border-brand-100 flex items-center justify-center text-brand-500 hover:bg-brand-50 disabled:opacity-40">
                            <Plus size={11} />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-brand-600 font-mono">
                          {formatNaira((c.product.sellingPrice || c.product.price || 0) * c.quantity)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-brand-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-brand-700">Total</p>
                    <p className="font-display text-lg font-bold text-brand-700">{formatNaira(cartTotal)}</p>
                  </div>
                  <button onClick={handleConfirmSale} disabled={submitting || cart.length === 0}
                    className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg
                               py-2.5 text-sm transition-colors flex items-center justify-center gap-2
                               disabled:opacity-60">
                    {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />}
                    {submitting ? "Processing..." : "Confirm Sale"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Multi-item Receipt */}
      {receipt && (
        <MultiReceipt receipt={receipt} onClose={() => setReceipt(null)} />
      )}

      {toast && (
        <div className={"fixed bottom-5 right-5 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white " +
          (toast.type === "error" ? "bg-red-500" : "bg-brand-600")}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

// Multi-item receipt modal
function MultiReceipt({ receipt, onClose }) {
  const { useRef } = require("react");
  const printRef = useRef(null);
  const formatNairaLocal = (n) =>
    new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open("", "_blank", "width=420,height=650");
    win.document.write(`<!DOCTYPE html><html><head><title>ImEx-Tek Receipt</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
      <style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Inter,sans-serif;padding:24px;color:#01283A;font-size:13px;}
      .receipt{max-width:340px;margin:0 auto;}.header{text-align:center;border-bottom:1px dashed #CCDCE5;padding-bottom:12px;margin-bottom:12px;}
      .logo{width:110px;height:auto;margin-bottom:6px;}.company{font-size:15px;font-weight:600;color:#014260;}
      .sub{font-size:11px;color:#6696B2;margin-top:2px;}.row{display:flex;justify-content:space-between;margin-bottom:6px;}
      .label{color:#6696B2;}.value{font-weight:500;}.divider{border-top:1px dashed #CCDCE5;margin:10px 0;}
      .item{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #f0f0f0;}
      .item:last-child{border-bottom:none;}.total-row{display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:#014260;margin-top:8px;}
      .footer{text-align:center;font-size:11px;color:#6696B2;margin-top:14px;padding-top:10px;border-top:1px dashed #CCDCE5;}
      </style></head><body>${content}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const date = new Date();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-brand-700">Sale Receipt</h3>
          <button onClick={onClose} className="text-brand-300 hover:text-brand-600 text-xl">&times;</button>
        </div>

        <div ref={printRef}>
          <div className="receipt">
            <div className="header">
              <img src={`${window.location.origin}/assets/logo.png`} alt="ImEx-Tek" className="logo" />
              <div className="company">ImEx-Tek Global Ltd</div>
              <div className="sub">Katsina, Nigeria</div>
            </div>
            <div className="row"><span className="label">Receipt No.</span><span className="value">#{receipt.groupId?.slice(0, 8).toUpperCase()}</span></div>
            <div className="row"><span className="label">Date</span><span className="value">{date.toLocaleDateString("en-NG")}</span></div>
            <div className="row"><span className="label">Time</span><span className="value">{date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}</span></div>
            <div className="divider" />
            {receipt.cart.map((c) => (
              <div key={c.product.productId} className="item">
                <span>{c.product.name} x{c.quantity}</span>
                <span>{formatNairaLocal((c.product.sellingPrice || c.product.price || 0) * c.quantity)}</span>
              </div>
            ))}
            <div className="divider" />
            <div className="total-row"><span>Total</span><span>{formatNairaLocal(receipt.total)}</span></div>
            <div className="footer">Thank you for your business!<br />ImEx-Tek Global Ltd</div>
          </div>
        </div>

        <button onClick={handlePrint}
          className="w-full mt-5 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium rounded-lg py-2.5">
          🖨 Print Receipt
        </button>
      </div>
    </div>
  );
}
