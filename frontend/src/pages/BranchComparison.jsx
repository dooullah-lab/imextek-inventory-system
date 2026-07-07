// src/pages/BranchComparison.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import ExportMenu from "../components/ExportMenu";
import { Loader2, TrendingUp, TrendingDown, GitBranch } from "lucide-react";

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "7 days" },
  { key: "month", label: "30 days" },
  { key: "year", label: "This year" },
];

export default function BranchComparison() {
  const [range, setRange] = useState("month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await api.get(`/analytics/branch-comparison?range=${range}`);
        setData(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    }
    load();
  }, [range]);

  const exportRows = data?.branches?.map((b) => ({
    branch: b.branchName,
    location: b.location,
    revenue: b.totalRevenue,
    costOfGoods: b.totalCostOfGoods,
    grossProfit: b.grossProfit,
    operatingExpenses: b.operatingExpenses,
    netProfit: b.netProfit,
    unitsSold: b.unitsSold,
    products: b.productCount,
    lowStock: b.lowStockCount,
  })) || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold text-brand-700 flex items-center gap-2">
            <GitBranch size={22} className="text-brand-500" /> Branch Comparison
          </h1>
          <p className="text-sm text-brand-300 mt-0.5">All branches side by side</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white border border-brand-100 rounded-lg p-1">
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => setRange(r.key)}
                className={"px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
                  (range === r.key ? "bg-brand-500 text-white" : "text-brand-400 hover:text-brand-600")}>
                {r.label}
              </button>
            ))}
          </div>
          <ExportMenu filename="imextek-branch-comparison" title="ImEx-Tek Branch Comparison"
            columns={[
              { key: "branch", label: "Branch" }, { key: "location", label: "Location" },
              { key: "revenue", label: "Revenue (NGN)" }, { key: "costOfGoods", label: "Cost of Goods (NGN)" },
              { key: "grossProfit", label: "Gross Profit (NGN)" },
              { key: "operatingExpenses", label: "Op. Expenses (NGN)" },
              { key: "netProfit", label: "Net Profit (NGN)" },
              { key: "unitsSold", label: "Units Sold" },
            ]}
            rows={exportRows} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-300">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : !data || data.branches.length === 0 ? (
        <div className="bg-white rounded-xl border border-brand-50 p-12 text-center">
          <GitBranch size={32} className="text-brand-100 mx-auto mb-3" />
          <p className="text-brand-400 text-sm">No active branches found. Add branches first from the Branches page.</p>
        </div>
      ) : (
        <>
          {/* Summary totals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total Revenue", value: formatNaira(data.totals.totalRevenue), color: "text-brand-700" },
              { label: "Total Op. Expenses", value: formatNaira(data.totals.operatingExpenses), color: "text-red-600" },
              { label: "Total Net Profit", value: formatNaira(data.totals.netProfit), color: data.totals.netProfit >= 0 ? "text-green-600" : "text-red-600" },
              { label: "Total Units Sold", value: data.totals.unitsSold, color: "text-brand-700" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-brand-50 shadow-card p-4">
                <p className="text-xs text-brand-300 mb-1">{s.label}</p>
                <p className={`font-display text-lg font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-brand-300 mt-1">All {data.branches.length} branches</p>
              </div>
            ))}
          </div>

          {/* Branch table */}
          <div className="bg-white rounded-xl border border-brand-50 shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-50 text-left text-brand-300 text-xs uppercase tracking-wide">
                    <th className="px-5 py-3 font-medium">Branch</th>
                    <th className="px-5 py-3 font-medium text-right">Revenue</th>
                    <th className="px-5 py-3 font-medium text-right">Cost of Goods</th>
                    <th className="px-5 py-3 font-medium text-right">Op. Expenses</th>
                    <th className="px-5 py-3 font-medium text-right">Net Profit</th>
                    <th className="px-5 py-3 font-medium text-right">Units Sold</th>
                    <th className="px-5 py-3 font-medium text-right">Products</th>
                    <th className="px-5 py-3 font-medium text-right">Low Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {data.branches.map((b, i) => (
                    <tr key={b.branchId} className={"border-b border-brand-50 last:border-0 " +
                      (i === 0 ? "bg-green-50/30" : "hover:bg-brand-50/30")}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {i === 0 && <TrendingUp size={14} className="text-green-500 shrink-0" />}
                          {i === data.branches.length - 1 && data.branches.length > 1 && (
                            <TrendingDown size={14} className="text-red-400 shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-brand-700">{b.branchName}</p>
                            {b.location && <p className="text-xs text-brand-300">{b.location}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-[13px] text-brand-600">
                        {formatNaira(b.totalRevenue)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-[13px] text-brand-400">
                        {formatNaira(b.totalCostOfGoods)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono text-[13px] text-red-500">
                        {formatNaira(b.operatingExpenses)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className={"font-mono text-[13px] font-semibold " +
                          (b.netProfit >= 0 ? "text-green-600" : "text-red-500")}>
                          {formatNaira(b.netProfit)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right text-brand-600">{b.unitsSold}</td>
                      <td className="px-5 py-4 text-right text-brand-600">{b.productCount}</td>
                      <td className="px-5 py-4 text-right">
                        <span className={b.lowStockCount > 0 ? "text-copper-600 font-medium" : "text-brand-300"}>
                          {b.lowStockCount}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-brand-50 border-t-2 border-brand-100">
                    <td className="px-5 py-4 font-semibold text-brand-700">All Branches</td>
                    <td className="px-5 py-4 text-right font-mono text-[13px] font-semibold text-brand-700">
                      {formatNaira(data.totals.totalRevenue)}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-[13px] font-semibold text-brand-500">
                      {formatNaira(data.totals.totalCostOfGoods)}
                    </td>
                    <td className="px-5 py-4 text-right font-mono text-[13px] font-semibold text-red-600">
                      {formatNaira(data.totals.operatingExpenses)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className={"font-mono text-[13px] font-bold " +
                        (data.totals.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                        {formatNaira(data.totals.netProfit)}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-brand-700">{data.totals.unitsSold}</td>
                    <td className="px-5 py-4 text-right font-semibold text-brand-700">{data.totals.productCount}</td>
                    <td className="px-5 py-4 text-right font-semibold text-copper-600">{data.totals.lowStockCount}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-brand-300 mt-3 text-center">
            🏆 Top branch highlighted in green · branches sorted by net profit
          </p>
        </>
      )}
    </div>
  );
}
