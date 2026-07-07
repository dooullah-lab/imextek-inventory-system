// src/pages/Analytics.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import ExportMenu from "../components/ExportMenu";
import { useAuth } from "../context/AuthContext";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, LineChart, Line, Legend,
} from "recharts";
import {
  TrendingUp, Package, ShoppingCart, AlertTriangle,
  Loader2, Calendar, TrendingDown, Warehouse,
} from "lucide-react";

// Custom Naira icon since lucide doesn't have one
function NairaIcon({ size = 17, className = "" }) {
  return (
    <span className={className} style={{ fontSize: size, fontWeight: 700, lineHeight: 1 }}>₦</span>
  );
}

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 days" },
  { key: "month", label: "30 days" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

function StatCard({ icon: Icon, label, value, accent, onClick, sub }) {
  return (
    <button onClick={onClick}
      className="bg-white rounded-xl border border-brand-50 shadow-card p-5 text-left hover:shadow-cardHover hover:border-brand-200 transition-all w-full">
      <div className={"w-9 h-9 rounded-lg flex items-center justify-center mb-3 " + accent}>
        <Icon size={17} className="text-white" />
      </div>
      <p className="text-xs text-brand-300 font-medium mb-1">{label}</p>
      <p className="font-display text-xl font-semibold text-brand-700">{value}</p>
      {sub && <p className="text-[11px] text-brand-300 mt-1">{sub}</p>}
      <p className="text-[11px] text-brand-300 mt-0.5">Click to view details</p>
    </button>
  );
}

const DETAIL_TITLES = {
  revenue: "Revenue breakdown",
  unitsSold: "Items sold",
  unitsRestocked: "Items restocked",
  lowStock: "Low stock items",
  operatingExpenses: "Operating Expenses breakdown",
  costOfPurchase: "Cost of purchase — current stock",
  profit: "Profit breakdown",
};

const DETAIL_COLUMNS = {
  revenue: [
    { key: "productName", label: "Product" },
    { key: "quantity", label: "Qty" },
    { key: "unitPrice", label: "Selling Price (NGN)" },
    { key: "total", label: "Revenue (NGN)" },
    { key: "timestamp", label: "Date" },
  ],
  unitsSold: [
    { key: "productName", label: "Product" },
    { key: "quantity", label: "Qty" },
    { key: "total", label: "Total (NGN)" },
    { key: "timestamp", label: "Date" },
  ],
  unitsRestocked: [
    { key: "productName", label: "Product" },
    { key: "quantity", label: "Qty" },
    { key: "timestamp", label: "Date" },
  ],
  lowStock: [
    { key: "name", label: "Product" },
    { key: "category", label: "Category" },
    { key: "quantity", label: "Stock" },
    { key: "lowStockThreshold", label: "Threshold" },
  ],
  operatingExpenses: [
    { key: "date", label: "Date" },
    { key: "title", label: "Title" },
    { key: "category", label: "Category" },
    { key: "amount", label: "Amount (NGN)" },
  ],
  costOfPurchase: [
    { key: "name", label: "Product" },
    { key: "category", label: "Category" },
    { key: "purchasePrice", label: "Purchase Price (NGN)" },
    { key: "quantity", label: "Stock" },
  ],
  profit: [
    { key: "productName", label: "Product" },
    { key: "quantity", label: "Qty" },
    { key: "total", label: "Revenue (NGN)" },
    { key: "costOfGoods", label: "Cost of Goods (NGN)" },
    { key: "profit", label: "Profit (NGN)" },
    { key: "timestamp", label: "Date" },
  ],
};

export default function Analytics() {
  const [range, setRange] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [groupBy, setGroupBy] = useState("");
  const [data, setData] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState("");

  const { user } = useAuth();

  useEffect(() => {
    if (user?.role === "admin") {
      api.get("/branches").then((r) => setBranches(r.data.filter((b) => b.status === "active"))).catch(() => {});
    }
  }, [user]);

  const buildQuery = (r, f, t, g) => {
    let q = "range=" + r;
    if (r === "custom" && f && t) q += "&from=" + f + "&to=" + t;
    if (g) q += "&group=" + g;
    if (selectedBranch) q += "&branchId=" + selectedBranch;
    return q;
  };

  const load = async (r, f, t, g) => {
    if (r === "custom" && (!f || !t)) return;
    setLoading(true);
    try {
      const [summaryRes, lowStockRes] = await Promise.all([
        api.get("/analytics/summary?" + buildQuery(r, f, t, g)),
        api.get("/analytics/low-stock"),
      ]);
      setData(summaryRes.data);
      setLowStock(lowStockRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(range, customFrom, customTo, groupBy); }, [range, groupBy, selectedBranch]);

  const openDetail = async (type) => {
    setDetailModal({ type, items: [] });
    setDetailLoading(true);
    try {
      let q = "type=" + type + "&range=" + range;
      if (range === "custom" && customFrom && customTo) q += "&from=" + customFrom + "&to=" + customTo;
      const res = await api.get("/analytics/details?" + q);
      setDetailModal({ type, items: res.data.items });
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatAxis = (v) => v >= 1000 ? "\u20a6" + (v / 1000).toFixed(0) + "k" : "\u20a6" + v;

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-brand-700">Analytics</h1>
            <p className="text-sm text-brand-300 mt-0.5">Revenue, cost, net expenses, and profit overview</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {user?.role === "admin" && branches.length > 0 && (
              <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)}
                className="text-sm border border-brand-100 rounded-lg px-3 py-2 text-brand-600 bg-white outline-none focus:border-brand-400">
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b.branchId} value={b.branchId}>{b.name}</option>)}
              </select>
            )}
            <ExportMenu
              filename="imextek-analytics"
              title="ImEx-Tek Analytics"
              columns={[
                { key: "date", label: "Period" },
                { key: "revenue", label: "Revenue (NGN)" },
                { key: "costOfGoods", label: "Cost of Goods (NGN)" },
                { key: "expenses", label: "Operating Expenses (NGN)" },
                { key: "profit", label: "Profit (NGN)" },
              ]}
              rows={data?.dailyBreakdown || []}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white border border-brand-100 rounded-lg p-1">
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={"px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
                  (range === r.key ? "bg-brand-500 text-white" : "text-brand-400 hover:text-brand-600")}>
                {r.label}
              </button>
            ))}
          </div>

          {range === "custom" && (
            <div className="flex items-center gap-2 bg-white border border-brand-100 rounded-lg px-2 py-1">
              <Calendar size={14} className="text-brand-300 ml-1" />
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                className="text-xs text-brand-600 outline-none" />
              <span className="text-brand-300 text-xs">to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                className="text-xs text-brand-600 outline-none" />
              <button onClick={() => load("custom", customFrom, customTo, groupBy)}
                className="text-xs font-medium bg-brand-500 text-white rounded-md px-2.5 py-1 ml-1">
                Apply
              </button>
            </div>
          )}

          <div className="flex bg-white border border-brand-100 rounded-lg p-1">
            {[{ key: "", label: "Auto" }, { key: "day", label: "Daily" }, { key: "month", label: "Monthly" }].map((g) => (
              <button key={g.key} onClick={() => setGroupBy(g.key)}
                className={"px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
                  (groupBy === g.key ? "bg-copper-500 text-white" : "text-brand-400 hover:text-brand-600")}>
                {g.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading || !data ? (
        <div className="flex items-center justify-center py-20 text-brand-300">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <>
          {/* 7 stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={TrendingUp} label="Revenue" value={formatNaira(data.totalRevenue)} accent="bg-brand-500" onClick={() => openDetail("revenue")} />
            <StatCard icon={ShoppingCart} label="Units Sold" value={data.unitsSold} accent="bg-copper-500" onClick={() => openDetail("unitsSold")} />
            <StatCard icon={Package} label="Restocked" value={data.unitsRestocked} accent="bg-brand-400" onClick={() => openDetail("unitsRestocked")} />
            <StatCard icon={Warehouse} label="Cost of Purchase" value={formatNaira(data.totalInventoryCost)} accent="bg-brand-600" sub="Current stock value" onClick={() => openDetail("costOfPurchase")} />
            <StatCard icon={TrendingDown} label="Operating Expenses" value={formatNaira(data.operatingExpenses)} accent="bg-red-500" onClick={() => openDetail("operatingExpenses")} />
            <StatCard icon={NairaIcon} label="Gross Profit" value={formatNaira(data.grossProfit)}
              accent={data.grossProfit >= 0 ? "bg-green-500" : "bg-red-500"}
              sub="Revenue minus cost of goods"
              onClick={() => openDetail("profit")} />
            <StatCard icon={NairaIcon} label="Net Profit" value={formatNaira(data.netProfit)}
              accent={data.netProfit >= 0 ? "bg-green-600" : "bg-red-600"}
              sub={data.netProfit >= 0 ? "After all expenses" : "Running at a loss"}
              onClick={() => openDetail("profit")} />
            <StatCard icon={AlertTriangle} label="Low Stock" value={lowStock.length} accent="bg-orange-400" onClick={() => openDetail("lowStock")} />
          </div>

          {/* Revenue vs Expenses chart */}
          <div className="grid lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-brand-50 shadow-card p-5">
              <h3 className="font-display text-sm font-semibold text-brand-700 mb-4">
                Revenue vs Operating Expenses {data.groupBy === "month" ? "(monthly)" : "(daily)"}
              </h3>
              {data.dailyBreakdown.length === 0 ? (
                <p className="text-sm text-brand-300 py-10 text-center">No data in this period yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.dailyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF2" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6696B2" }} tickLine={false} axisLine={{ stroke: "#CCDCE5" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6696B2" }} tickLine={false} axisLine={false} tickFormatter={formatAxis} />
                    <Tooltip formatter={(v) => formatNaira(v)} contentStyle={{ borderRadius: 8, border: "1px solid #E6EEF2", fontSize: 12 }} />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#FF8C42" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="expenses" name="Operating Expenses" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
                    <Line type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="6 2" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-brand-50 shadow-card p-5">
              <h3 className="font-display text-sm font-semibold text-brand-700 mb-4">Operating Expenses by category</h3>
              {data.expensesByCategory.length === 0 ? (
                <p className="text-sm text-brand-300 py-10 text-center">No expenses in this period.</p>
              ) : (
                <div className="space-y-3">
                  {data.expensesByCategory.map((e) => (
                    <div key={e.category} className="flex items-center justify-between text-sm">
                      <span className="text-brand-600 truncate">{e.category}</span>
                      <span className="text-red-500 font-mono text-xs font-medium">{formatNaira(e.amount)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top products */}
          <div className="bg-white rounded-xl border border-brand-50 shadow-card p-5">
            <h3 className="font-display text-sm font-semibold text-brand-700 mb-4">Top products by revenue</h3>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-brand-300 py-10 text-center">No sales recorded in this period yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF2" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6696B2" }} tickLine={false} axisLine={{ stroke: "#CCDCE5" }} tickFormatter={formatAxis} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#01283A" }} tickLine={false} axisLine={false} width={120} />
                  <Tooltip formatter={(v, name) => [formatNaira(v), name]} contentStyle={{ borderRadius: 8, border: "1px solid #E6EEF2", fontSize: 12 }} />
                  <Legend />
                  <Bar dataKey="revenue" name="Revenue" fill="#014260" radius={[0, 3, 3, 0]} />
                  <Bar dataKey="profit" name="Profit" fill="#22c55e" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {/* Detail Modal with Download */}
      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal ? DETAIL_TITLES[detailModal.type] : ""}>
        {detailLoading ? (
          <div className="flex items-center justify-center py-10 text-brand-300">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : (
          <>
            {detailModal?.items?.length > 0 && (
              <div className="flex justify-end mb-3">
                <ExportMenu
                  filename={"imextek-" + (detailModal?.type || "detail")}
                  title={DETAIL_TITLES[detailModal?.type] || "Details"}
                  columns={DETAIL_COLUMNS[detailModal?.type] || []}
                  rows={detailModal?.items || []}
                />
              </div>
            )}
            {detailModal?.items?.length === 0 ? (
              <p className="text-sm text-brand-300 text-center py-6">Nothing to show for this period.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2.5">
                {detailModal?.type === "lowStock" && detailModal.items.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between text-sm border-b border-brand-50 pb-2 last:border-0">
                    <span className="text-brand-700">{p.name}</span>
                    <span className="text-copper-600 font-mono text-xs">{p.quantity} left (min {p.lowStockThreshold})</span>
                  </div>
                ))}
                {detailModal?.type === "operatingExpenses" && detailModal.items.map((e) => (
                  <div key={e.expenseId} className="flex items-center justify-between text-sm border-b border-brand-50 pb-2 last:border-0">
                    <div>
                      <span className="text-brand-700">{e.title}</span>
                      <p className="text-[11px] text-brand-300">{e.category} · {e.date}</p>
                    </div>
                    <span className="text-red-500 font-mono text-xs font-medium">{formatNaira(e.amount)}</span>
                  </div>
                ))}
                {detailModal?.type === "costOfPurchase" && detailModal.items.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between text-sm border-b border-brand-50 pb-2 last:border-0">
                    <div>
                      <span className="text-brand-700">{p.name}</span>
                      <p className="text-[11px] text-brand-300">{p.category}</p>
                    </div>
                    <span className="text-brand-600 font-mono text-xs">
                      {p.quantity} × {formatNaira(p.purchasePrice)} = {formatNaira((p.purchasePrice || 0) * p.quantity)}
                    </span>
                  </div>
                ))}
                {(detailModal?.type === "revenue" || detailModal?.type === "unitsSold" || detailModal?.type === "profit") &&
                  detailModal.items.map((t) => (
                    <div key={t.transactionId} className="flex items-center justify-between text-sm border-b border-brand-50 pb-2 last:border-0">
                      <div>
                        <span className="text-brand-700">{t.productName}</span>
                        <p className="text-[11px] text-brand-300">{new Date(t.timestamp).toLocaleString("en-NG")}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-brand-600 font-mono text-xs">{t.quantity} × {formatNaira(t.unitPrice)}</p>
                        {detailModal.type === "profit" && (
                          <p className="text-green-600 font-mono text-xs">profit: {formatNaira(t.profit)}</p>
                        )}
                      </div>
                    </div>
                  ))}
                {detailModal?.type === "unitsRestocked" && detailModal.items.map((t) => (
                  <div key={t.transactionId} className="flex items-center justify-between text-sm border-b border-brand-50 pb-2 last:border-0">
                    <div>
                      <span className="text-brand-700">{t.productName}</span>
                      <p className="text-[11px] text-brand-300">{new Date(t.timestamp).toLocaleString("en-NG")}</p>
                    </div>
                    <span className="text-brand-600 font-mono text-xs">{t.quantity} units</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
