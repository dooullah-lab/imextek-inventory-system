// src/pages/ActivityLog.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import ExportMenu from "../components/ExportMenu";
import { ArrowDownCircle, ArrowUpCircle, Loader2, Search, SlidersHorizontal } from "lucide-react";

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "amount_desc", label: "Highest amount" },
  { value: "amount_asc", label: "Lowest amount" },
];

export default function ActivityLog() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (type) params.set("type", type);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (sort) params.set("sort", sort);
      const res = await api.get("/transactions?" + params.toString());
      setTransactions(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(load, 300); // debounce search typing
    return () => clearTimeout(timeout);
  }, [search, type, from, to, sort]);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-700">Activity Log</h1>
          <p className="text-sm text-brand-300 mt-0.5">Search, filter, and review every sale and restock</p>
        </div>
        <ExportMenu
          filename="imextek-activity-log"
          title="ImEx-Tek Activity Log"
          columns={[
            { key: "productName", label: "Product" },
            { key: "type", label: "Type" },
            { key: "quantity", label: "Quantity" },
            { key: "total", label: "Total (NGN)" },
            { key: "timestamp", label: "Date/Time" },
          ]}
          rows={transactions}
        />
      </div>

      <div className="flex flex-col gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-300" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by product name..."
              className="w-full rounded-lg border border-brand-100 pl-9 pr-3 py-2 text-sm
                         focus:border-brand-400 focus:ring-1 focus:ring-brand-400 outline-none bg-white"
            />
          </div>

          <div className="flex bg-white border border-brand-100 rounded-lg p-1">
            {[
              { key: "", label: "All" },
              { key: "sale", label: "Sales" },
              { key: "restock", label: "Restocks" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={"px-3 py-1.5 text-xs font-medium rounded-md transition-colors " + (type === t.key ? "bg-brand-500 text-white" : "text-brand-400 hover:text-brand-600")}
              >
                {t.label}
              </button>
            ))}
          </div>

          <select value={sort} onChange={(e) => setSort(e.target.value)}
            className="text-sm border border-brand-100 rounded-lg px-3 py-2 text-brand-600 bg-white outline-none focus:border-brand-400">
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>

          <button
            onClick={() => setFiltersOpen((o) => !o)}
            className={"flex items-center gap-1.5 text-sm font-medium rounded-lg px-3 py-2 border transition-colors " + (filtersOpen || from || to ? "border-brand-400 text-brand-600 bg-brand-50" : "border-brand-100 text-brand-400 bg-white")}
          >
            <SlidersHorizontal size={14} /> Date range
          </button>
        </div>

        {filtersOpen && (
          <div className="flex flex-wrap items-center gap-2 bg-white border border-brand-100 rounded-lg p-3">
            <label className="text-xs text-brand-400">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="text-sm border border-brand-100 rounded-md px-2 py-1.5 outline-none focus:border-brand-400" />
            <label className="text-xs text-brand-400 ml-2">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="text-sm border border-brand-100 rounded-md px-2 py-1.5 outline-none focus:border-brand-400" />
            {(from || to) && (
              <button onClick={() => { setFrom(""); setTo(""); }}
                className="text-xs text-brand-300 hover:text-red-500 ml-2">Clear</button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-300">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-50 p-12 text-center">
          <p className="text-brand-400 text-sm">No activity matches your filters.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-brand-50 shadow-card divide-y divide-brand-50">
          {transactions.map((t) => (
            <div key={t.transactionId} className="flex items-center gap-4 px-5 py-4">
              <div className={"w-9 h-9 rounded-full flex items-center justify-center shrink-0 " + (t.type === "sale" ? "bg-brand-50" : "bg-copper-50")}>
                {t.type === "sale" ? (
                  <ArrowDownCircle size={18} className="text-brand-500" />
                ) : (
                  <ArrowUpCircle size={18} className="text-copper-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-brand-700 truncate">
                  {t.type === "sale" ? "Sold" : "Restocked"} {t.quantity} of {t.productName}
                </p>
                <p className="text-xs text-brand-300">{new Date(t.timestamp).toLocaleString("en-NG")}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={"text-sm font-mono font-medium " + (t.type === "sale" ? "text-brand-600" : "text-copper-600")}>
                  {t.type === "sale" ? "+" : "-"}{formatNaira(t.total)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
