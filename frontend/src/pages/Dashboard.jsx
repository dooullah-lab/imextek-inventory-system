// src/pages/Dashboard.jsx
import { useEffect, useState } from "react";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Package, ShoppingCart, AlertTriangle,
  ArrowDownCircle, ArrowUpCircle, Loader2, ArrowRight,
  TrendingDown, Warehouse,
} from "lucide-react";

function NairaIcon({ size = 17, className = "" }) {
  return (
    <span className={className} style={{ fontSize: size, fontWeight: 700, lineHeight: 1 }}>₦</span>
  );
}

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

function StatCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div className="bg-white rounded-xl border border-brand-50 shadow-card p-5">
      <div className={"w-9 h-9 rounded-lg flex items-center justify-center mb-3 " + accent}>
        <Icon size={17} className="text-white" />
      </div>
      <p className="text-xs text-brand-300 font-medium mb-1">{label}</p>
      <p className="font-display text-xl font-semibold text-brand-700">{value}</p>
      {sub && <p className="text-xs text-brand-300 mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [summaryRes, activityRes, lowStockRes] = await Promise.all([
          api.get("/analytics/summary?range=today"),
          api.get("/transactions?sort=newest"),
          api.get("/analytics/low-stock"),
        ]);
        setSummary(summaryRes.data);
        setRecentActivity(activityRes.data.slice(0, 8));
        setLowStock(lowStockRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <div className="mb-7">
        <h1 className="font-display text-2xl font-semibold text-brand-700">
          {greeting}, {user?.name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-sm text-brand-300 mt-0.5">Here's what's happening at ImEx-Tek today.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-brand-300">
          <Loader2 className="animate-spin" size={24} />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            <StatCard icon={TrendingUp} label="Today's Revenue" value={formatNaira(summary?.totalRevenue)} accent="bg-brand-500" sub="From sales today" />
            <StatCard icon={ShoppingCart} label="Units Sold Today" value={summary?.unitsSold || 0} accent="bg-copper-500" />
            <StatCard icon={TrendingDown} label="Operating Expenses" value={formatNaira(summary?.operatingExpenses)} accent="bg-red-500" sub="Today" />
            <StatCard
              icon={NairaIcon}
              label="Net Profit Today"
              value={formatNaira(summary?.netProfit)}
              accent={(summary?.netProfit || 0) >= 0 ? "bg-green-500" : "bg-red-500"}
              sub={(summary?.netProfit || 0) >= 0 ? "Profitable" : "Loss today"}
            />
            <StatCard icon={Package} label="Units Restocked" value={summary?.unitsRestocked || 0} accent="bg-brand-400" sub="Today" />
            <StatCard icon={Warehouse} label="Cost of Purchase" value={formatNaira(summary?.totalInventoryCost)} accent="bg-brand-600" sub="Current stock value" />
            <StatCard icon={AlertTriangle} label="Low Stock Items" value={lowStock.length}
              accent={lowStock.length > 0 ? "bg-orange-400" : "bg-green-500"}
              sub={lowStock.length === 0 ? "All good" : "Needs attention"} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-brand-50 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-brand-50">
                <h3 className="font-display text-sm font-semibold text-brand-700">Recent Activity</h3>
                <button onClick={() => navigate("/activity")}
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-600">
                  View all <ArrowRight size={13} />
                </button>
              </div>
              {recentActivity.length === 0 ? (
                <p className="text-sm text-brand-300 text-center py-10">No activity recorded yet today.</p>
              ) : (
                <div className="divide-y divide-brand-50">
                  {recentActivity.map((t) => (
                    <div key={t.transactionId} className="flex items-center gap-3 px-5 py-3">
                      <div className={"w-8 h-8 rounded-full flex items-center justify-center shrink-0 " +
                        (t.type === "sale" ? "bg-brand-50" : "bg-copper-50")}>
                        {t.type === "sale"
                          ? <ArrowDownCircle size={15} className="text-brand-500" />
                          : <ArrowUpCircle size={15} className="text-copper-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-brand-700 truncate">
                          {t.type === "sale" ? "Sold" : "Restocked"} {t.quantity} of {t.productName}
                        </p>
                        <p className="text-xs text-brand-300">
                          {new Date(t.timestamp).toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                      <span className={"text-xs font-mono font-medium " + (t.type === "sale" ? "text-brand-600" : "text-copper-600")}>
                        {t.type === "sale" ? "+" : "-"}{formatNaira(t.total)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-brand-50 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-brand-50">
                <h3 className="font-display text-sm font-semibold text-brand-700">Low Stock Alerts</h3>
                <button onClick={() => navigate("/inventory")}
                  className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-600">
                  View all <ArrowRight size={13} />
                </button>
              </div>
              {lowStock.length === 0 ? (
                <p className="text-sm text-brand-300 text-center py-10">All products well stocked.</p>
              ) : (
                <div className="divide-y divide-brand-50">
                  {lowStock.map((p) => (
                    <div key={p.productId} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm text-brand-700">{p.name}</p>
                        <p className="text-xs text-brand-300">{p.category}</p>
                      </div>
                      <span className="text-xs font-mono font-medium text-copper-600 bg-copper-50 px-2 py-1 rounded-md">
                        {p.quantity} left
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
