// src/pages/Analytics.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import Modal from "../components/Modal";
import ExportMenu from "../components/ExportMenu";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line,
} from "recharts";
import { TrendingUp, Package, ShoppingCart, AlertTriangle, Loader2, Calendar } from "lucide-react";

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 days" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom" },
];

function StatCard({ icon: Icon, label, value, accent, onClick }) {
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl border border-brand-50 shadow-card p-5 text-left hover:shadow-cardHover hover:border-brand-200 transition-all"
    >
      <div className={"w-9 h-9 rounded-lg flex items-center justify-center mb-3 " + accent}>
        <Icon size={17} className="text-white" />
      </div>
      <p className="text-xs text-brand-300 font-medium mb-1">{label}</p>
      <p className="font-display text-xl font-semibold text-brand-700">{value}</p>
      <p className="text-[11px] text-brand-300 mt-1">Click to view details</p>
    </button>
  );
}

const DETAIL_TITLES = {
  revenue: "Revenue breakdown",
  unitsSold: "Items sold",
  unitsRestocked: "Items restocked",
  lowStock: "Low stock items",
};

export default function Analytics() {
  const [range, setRange] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [groupBy, setGroupBy] = useState(""); // "" = auto, "day" or "month"
  const [data, setData] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailModal, setDetailModal] = useState(null); // { type, items }
  const [detailLoading, setDetailLoading] = useState(false);

  const buildQuery = () => {
    let q = "range=" + range;
    if (range === "custom" && customFrom && customTo) {
      q += "&from=" + customFrom + "&to=" + customTo;
    }
    if (groupBy) q += "&group=" + groupBy;
    return q;
  };

  const load = async () => {
    if (range === "custom" && (!customFrom || !customTo)) return;
    setLoading(true);
    try {
      const [summaryRes, lowStockRes] = await Promise.all([
        api.get("/analytics/summary?" + buildQuery()),
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

  useEffect(() => { load(); }, [range, groupBy]);

  const applyCustomRange = () => {
    if (customFrom && customTo) load();
  };

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

  const formatAxisNaira = (v) => {
    if (v >= 1000) return "\u20a6" + (v / 1000).toFixed(0) + "k";
    return "\u20a6" + v;
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold text-brand-700">Analytics</h1>
            <p className="text-sm text-brand-300 mt-0.5">Sales performance overview</p>
          </div>
          <ExportMenu
            filename="imextek-analytics-summary"
            title="ImEx-Tek Analytics Summary"
            columns={[{ key: "date", label: "Period" }, { key: "revenue", label: "Revenue (NGN)" }]}
            rows={data?.dailyBreakdown || []}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white border border-brand-100 rounded-lg p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={"px-3 py-1.5 text-xs font-medium rounded-md transition-colors " + (range === r.key ? "bg-brand-500 text-white" : "text-brand-400 hover:text-brand-600")}
              >
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
              <button onClick={applyCustomRange}
                className="text-xs font-medium bg-brand-500 hover:bg-brand-600 text-white rounded-md px-2.5 py-1 ml-1">
                Apply
              </button>
            </div>
          )}

          <div className="flex bg-white border border-brand-100 rounded-lg p-1">
            {[
              { key: "", label: "Auto" },
              { key: "day", label: "Daily" },
              { key: "month", label: "Monthly" },
            ].map((g) => (
              <button
                key={g.key}
                onClick={() => setGroupBy(g.key)}
                className={"px-3 py-1.5 text-xs font-medium rounded-md transition-colors " + (groupBy === g.key ? "bg-copper-500 text-white" : "text-brand-400 hover:text-brand-600")}
              >
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
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard icon={TrendingUp} label="Revenue" value={formatNaira(data.totalRevenue)} accent="bg-brand-500" onClick={() => openDetail("revenue")} />
            <StatCard icon={ShoppingCart} label="Units sold" value={data.unitsSold} accent="bg-copper-500" onClick={() => openDetail("unitsSold")} />
            <StatCard icon={Package} label="Units restocked" value={data.unitsRestocked} accent="bg-brand-400" onClick={() => openDetail("unitsRestocked")} />
            <StatCard icon={AlertTriangle} label="Low stock items" value={lowStock.length} accent="bg-red-500" onClick={() => openDetail("lowStock")} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4 mb-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-brand-50 shadow-card p-5">
              <h3 className="font-display text-sm font-semibold text-brand-700 mb-4">
                Revenue over time {data.groupBy === "month" ? "(monthly)" : "(daily)"}
              </h3>
              {data.dailyBreakdown.length === 0 ? (
                <p className="text-sm text-brand-300 py-10 text-center">No sales recorded in this period yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={data.dailyBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF2" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6696B2" }} tickLine={false} axisLine={{ stroke: "#CCDCE5" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#6696B2" }} tickLine={false} axisLine={false} tickFormatter={formatAxisNaira} />
                    <Tooltip formatter={(v) => formatNaira(v)} contentStyle={{ borderRadius: 8, border: "1px solid #E6EEF2", fontSize: 12 }} />
                    <Line type="monotone" dataKey="revenue" stroke="#FF8C42" strokeWidth={2.5} dot={{ r: 3, fill: "#FF8C42" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-brand-50 shadow-card p-5">
              <h3 className="font-display text-sm font-semibold text-brand-700 mb-4">Low stock alerts</h3>
              {lowStock.length === 0 ? (
                <p className="text-sm text-brand-300 py-10 text-center">All products are well stocked.</p>
              ) : (
                <div className="space-y-3">
                  {lowStock.slice(0, 6).map((p) => (
                    <div key={p.productId} className="flex items-center justify-between text-sm">
                      <span className="text-brand-600 truncate">{p.name}</span>
                      <span className="text-copper-600 font-medium font-mono text-xs">{p.quantity} left</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-brand-50 shadow-card p-5">
            <h3 className="font-display text-sm font-semibold text-brand-700 mb-4">Top products by revenue</h3>
            {data.topProducts.length === 0 ? (
              <p className="text-sm text-brand-300 py-10 text-center">No sales recorded in this period yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.topProducts} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E6EEF2" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#6696B2" }} tickLine={false} axisLine={{ stroke: "#CCDCE5" }} tickFormatter={formatAxisNaira} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#01283A" }} tickLine={false} axisLine={false} width={120} />
                  <Tooltip formatter={(v) => formatNaira(v)} contentStyle={{ borderRadius: 8, border: "1px solid #E6EEF2", fontSize: 12 }} />
                  <Bar dataKey="revenue" fill="#014260" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

      <Modal open={!!detailModal} onClose={() => setDetailModal(null)} title={detailModal ? DETAIL_TITLES[detailModal.type] : ""}>
        {detailLoading ? (
          <div className="flex items-center justify-center py-10 text-brand-300">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : detailModal?.items?.length === 0 ? (
          <p className="text-sm text-brand-300 text-center py-6">Nothing to show for this period.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-2.5">
            {detailModal?.type === "lowStock"
              ? detailModal.items.map((p) => (
                  <div key={p.productId} className="flex items-center justify-between text-sm border-b border-brand-50 pb-2 last:border-0">
                    <span className="text-brand-700">{p.name}</span>
                    <span className="text-copper-600 font-mono text-xs">{p.quantity} left (threshold {p.lowStockThreshold})</span>
                  </div>
                ))
              : detailModal?.items.map((t) => (
                  <div key={t.transactionId} className="flex items-center justify-between text-sm border-b border-brand-50 pb-2 last:border-0">
                    <div>
                      <span className="text-brand-700">{t.productName}</span>
                      <p className="text-[11px] text-brand-300">{new Date(t.timestamp).toLocaleString("en-NG")}</p>
                    </div>
                    <span className="text-brand-600 font-mono text-xs">{t.quantity} units &middot; {formatNaira(t.total)}</span>
                  </div>
                ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
