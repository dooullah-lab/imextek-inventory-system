// src/pages/Reports.jsx
import { useState } from "react";
import api from "../api/client";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  FileText, FileSpreadsheet, FileType, Loader2,
  Calendar, TrendingUp, TrendingDown, Package,
  ShoppingCart, Warehouse, DollarSign,
} from "lucide-react";

const formatNaira = (n) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Last 7 days" },
  { key: "month", label: "Last 30 days" },
  { key: "year", label: "This year" },
  { key: "custom", label: "Custom range" },
];

const REPORT_TYPES = [
  { key: "full", label: "Full Business Report", desc: "Revenue, expenses, profit, inventory, top products, and all transactions" },
  { key: "sales", label: "Sales Report", desc: "All sales transactions with product, quantity, price, and revenue" },
  { key: "expenses", label: "Operating Expenses Report", desc: "All recorded operating expenses with categories and totals" },
  { key: "inventory", label: "Inventory Report", desc: "Current stock levels, purchase price, selling price, and margin" },
  { key: "profit", label: "Profit & Loss Report", desc: "Revenue vs cost of goods vs operating expenses vs net profit" },
];

export default function Reports() {
  const [range, setRange] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [reportType, setReportType] = useState("full");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");

  const buildQuery = () => {
    let q = "range=" + range;
    if (range === "custom" && customFrom && customTo) q += "&from=" + customFrom + "&to=" + customTo;
    return q;
  };

  const getRangeLabel = () => {
    if (range === "custom" && customFrom && customTo) return `${customFrom} to ${customTo}`;
    return RANGES.find((r) => r.key === range)?.label || range;
  };

  const generatePreview = async () => {
    if (range === "custom" && (!customFrom || !customTo)) {
      setError("Please select both a start and end date.");
      return;
    }
    setLoading(true);
    setError("");
    setPreview(null);
    try {
      const [summaryRes, txRes, expRes, prodRes] = await Promise.all([
        api.get("/analytics/summary?" + buildQuery()),
        api.get("/transactions?" + (range === "custom" ? `from=${customFrom}&to=${customTo}` : `sort=newest`)),
        api.get("/expenses?" + (range === "custom" ? `from=${customFrom}&to=${customTo}` : "")),
        api.get("/products"),
      ]);
      setPreview({
        summary: summaryRes.data,
        transactions: txRes.data.filter((t) => t.type === "sale"),
        expenses: expRes.data,
        products: prodRes.data,
        generatedAt: new Date().toLocaleString("en-NG"),
        rangeLabel: getRangeLabel(),
        reportType,
      });
    } catch (err) {
      setError("Could not load report data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = () => {
    if (!preview) return;
    const wb = XLSX.utils.book_new();
    addSheetsToWorkbook(wb, preview);
    XLSX.writeFile(wb, `ImExTek_Report_${preview.rangeLabel.replace(/\s/g, "_")}.csv`);
  };

  const downloadExcel = () => {
    if (!preview) return;
    const wb = XLSX.utils.book_new();
    addSheetsToWorkbook(wb, preview);
    XLSX.writeFile(wb, `ImExTek_Report_${preview.rangeLabel.replace(/\s/g, "_")}.xlsx`);
  };

  const addSheetsToWorkbook = (wb, data) => {
    const { summary, transactions, expenses, products } = data;

    if (reportType === "full" || reportType === "profit") {
      const summaryRows = [
        { Metric: "Revenue", Value: summary.totalRevenue },
        { Metric: "Cost of Goods Sold", Value: summary.totalCostOfGoods },
        { Metric: "Gross Profit", Value: summary.grossProfit },
        { Metric: "Operating Expenses", Value: summary.operatingExpenses },
        { Metric: "Net Profit", Value: summary.netProfit },
        { Metric: "Units Sold", Value: summary.unitsSold },
        { Metric: "Units Restocked", Value: summary.unitsRestocked },
        { Metric: "Inventory Cost (current stock)", Value: summary.totalInventoryCost },
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), "Summary");
    }

    if (reportType === "full" || reportType === "sales") {
      const salesRows = transactions.map((t) => ({
        Date: new Date(t.timestamp).toLocaleDateString("en-NG"),
        Time: new Date(t.timestamp).toLocaleTimeString("en-NG"),
        Product: t.productName,
        Quantity: t.quantity,
        "Unit Price (NGN)": t.unitPrice || 0,
        "Revenue (NGN)": t.total || 0,
        "Cost of Goods (NGN)": t.costOfGoods || 0,
        "Profit (NGN)": t.profit || 0,
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesRows.length ? salesRows : [{ Note: "No sales in this period" }]), "Sales");
    }

    if (reportType === "full" || reportType === "expenses") {
      const expRows = expenses.map((e) => ({
        Date: e.date,
        Title: e.title,
        Category: e.category,
        "Amount (NGN)": e.amount,
        Notes: e.notes || "",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expRows.length ? expRows : [{ Note: "No expenses in this period" }]), "Operating Expenses");
    }

    if (reportType === "full" || reportType === "inventory") {
      const invRows = products.map((p) => ({
        Product: p.name,
        Category: p.category || "Uncategorized",
        "Stock Qty": p.quantity,
        "Purchase Price (NGN)": p.purchasePrice || 0,
        "Selling Price (NGN)": p.sellingPrice || p.price || 0,
        "Margin (NGN)": (p.sellingPrice || p.price || 0) - (p.purchasePrice || 0),
        "Stock Value at Cost (NGN)": (p.purchasePrice || 0) * p.quantity,
        "Low Stock Threshold": p.lowStockThreshold,
        Status: p.quantity <= p.lowStockThreshold ? "Low Stock" : "OK",
      }));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(invRows), "Inventory");
    }
  };

  const downloadPDF = () => {
    if (!preview) return;
    const { summary, transactions, expenses, products } = preview;
    const doc = new jsPDF();
    const BRAND = [1, 66, 96];
    const COPPER = [255, 140, 66];

    let y = 15;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(...BRAND);
    doc.setFont("helvetica", "bold");
    doc.text("ImEx-Tek Global Ltd", 14, y);
    y += 8;
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.text(`${REPORT_TYPES.find((r) => r.key === reportType)?.label} — ${preview.rangeLabel}`, 14, y);
    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Generated: ${preview.generatedAt}`, 14, y);
    y += 8;

    // Summary section
    if (reportType === "full" || reportType === "profit") {
      doc.setFontSize(12);
      doc.setTextColor(...BRAND);
      doc.setFont("helvetica", "bold");
      doc.text("Financial Summary", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["Metric", "Amount"]],
        body: [
          ["Revenue", formatNaira(summary.totalRevenue)],
          ["Cost of Goods Sold", formatNaira(summary.totalCostOfGoods)],
          ["Gross Profit", formatNaira(summary.grossProfit)],
          ["Operating Expenses", formatNaira(summary.operatingExpenses)],
          ["Net Profit", formatNaira(summary.netProfit)],
          ["Units Sold", summary.unitsSold],
          ["Units Restocked", summary.unitsRestocked],
          ["Inventory Value at Cost", formatNaira(summary.totalInventoryCost)],
        ],
        headStyles: { fillColor: BRAND },
        bodyStyles: { fontSize: 9 },
        columnStyles: { 1: { halign: "right" } },
        didParseCell: (data) => {
          if (data.row.index === 4 && data.column.index === 1) {
            data.cell.styles.textColor = summary.netProfit >= 0 ? [34, 197, 94] : [239, 68, 68];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Top products
    if ((reportType === "full" || reportType === "sales") && summary.topProducts?.length > 0) {
      if (y > 230) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.setTextColor(...BRAND);
      doc.setFont("helvetica", "bold");
      doc.text("Top Products by Revenue", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Product", "Units Sold", "Revenue", "Profit"]],
        body: summary.topProducts.map((p) => [
          p.name, p.unitsSold, formatNaira(p.revenue), formatNaira(p.profit || 0),
        ]),
        headStyles: { fillColor: BRAND },
        bodyStyles: { fontSize: 9 },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Sales transactions
    if ((reportType === "full" || reportType === "sales") && transactions.length > 0) {
      if (y > 200) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.setTextColor(...BRAND);
      doc.setFont("helvetica", "bold");
      doc.text("Sales Transactions", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Date", "Product", "Qty", "Unit Price", "Revenue", "Profit"]],
        body: transactions.slice(0, 100).map((t) => [
          new Date(t.timestamp).toLocaleDateString("en-NG"),
          t.productName,
          t.quantity,
          formatNaira(t.unitPrice || 0),
          formatNaira(t.total || 0),
          formatNaira(t.profit || 0),
        ]),
        headStyles: { fillColor: BRAND },
        bodyStyles: { fontSize: 8 },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Operating Expenses
    if ((reportType === "full" || reportType === "expenses") && expenses.length > 0) {
      if (y > 200) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.setTextColor(...BRAND);
      doc.setFont("helvetica", "bold");
      doc.text("Operating Expenses", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Date", "Title", "Category", "Amount"]],
        body: expenses.map((e) => [e.date, e.title, e.category, formatNaira(e.amount)]),
        headStyles: { fillColor: [239, 68, 68] },
        bodyStyles: { fontSize: 8 },
        columnStyles: { 3: { halign: "right" } },
        foot: [["", "", "Total", formatNaira(expenses.reduce((s, e) => s + e.amount, 0))]],
        footStyles: { fillColor: [254, 242, 242], textColor: [239, 68, 68], fontStyle: "bold" },
      });
      y = doc.lastAutoTable.finalY + 8;
    }

    // Inventory
    if ((reportType === "full" || reportType === "inventory") && products.length > 0) {
      if (y > 180) { doc.addPage(); y = 15; }
      doc.setFontSize(12);
      doc.setTextColor(...BRAND);
      doc.setFont("helvetica", "bold");
      doc.text("Current Inventory", 14, y);
      y += 4;
      autoTable(doc, {
        startY: y,
        head: [["Product", "Category", "Stock", "Purchase ₦", "Selling ₦", "Margin ₦", "Status"]],
        body: products.map((p) => {
          const margin = (p.sellingPrice || p.price || 0) - (p.purchasePrice || 0);
          const low = p.quantity <= p.lowStockThreshold;
          return [
            p.name, p.category || "—", p.quantity,
            formatNaira(p.purchasePrice || 0),
            formatNaira(p.sellingPrice || p.price || 0),
            formatNaira(margin),
            low ? "Low Stock" : "OK",
          ];
        }),
        headStyles: { fillColor: BRAND },
        bodyStyles: { fontSize: 7.5 },
        didParseCell: (data) => {
          if (data.column.index === 6 && data.cell.raw === "Low Stock") {
            data.cell.styles.textColor = [255, 140, 66];
            data.cell.styles.fontStyle = "bold";
          }
        },
      });
    }

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(180);
      doc.text(
        `ImEx-Tek Global Ltd · Confidential · Page ${i} of ${pageCount}`,
        doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 8,
        { align: "center" }
      );
    }

    doc.save(`ImExTek_Report_${preview.rangeLabel.replace(/\s/g, "_")}.pdf`);
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-semibold text-brand-700 flex items-center gap-2">
          <FileText size={22} className="text-brand-500" /> Reports
        </h1>
        <p className="text-sm text-brand-300 mt-0.5">
          Generate and download a full business report for any date range
        </p>
      </div>

      <div className="bg-white rounded-xl border border-brand-50 shadow-card p-6 space-y-6">

        {/* Report type */}
        <div>
          <p className="text-sm font-semibold text-brand-700 mb-3">1. Choose report type</p>
          <div className="space-y-2">
            {REPORT_TYPES.map((r) => (
              <label key={r.key}
                className={"flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors " +
                  (reportType === r.key ? "border-brand-400 bg-brand-50" : "border-brand-100 hover:border-brand-200")}>
                <input type="radio" name="reportType" value={r.key}
                  checked={reportType === r.key}
                  onChange={(e) => { setReportType(e.target.value); setPreview(null); }}
                  className="mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-brand-700">{r.label}</p>
                  <p className="text-xs text-brand-300 mt-0.5">{r.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Date range */}
        <div>
          <p className="text-sm font-semibold text-brand-700 mb-3">2. Choose date range</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {RANGES.map((r) => (
              <button key={r.key} onClick={() => { setRange(r.key); setPreview(null); }}
                className={"px-3.5 py-1.5 text-sm font-medium rounded-lg border transition-colors " +
                  (range === r.key ? "bg-brand-500 text-white border-brand-500" : "border-brand-100 text-brand-500 hover:border-brand-300")}>
                {r.label}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-3 bg-brand-50 rounded-lg px-4 py-3">
              <Calendar size={15} className="text-brand-400 shrink-0" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-brand-400">From</span>
                <input type="date" value={customFrom} onChange={(e) => { setCustomFrom(e.target.value); setPreview(null); }}
                  className="text-sm border border-brand-100 rounded-md px-2 py-1 outline-none focus:border-brand-400 bg-white" />
                <span className="text-xs text-brand-400">To</span>
                <input type="date" value={customTo} onChange={(e) => { setCustomTo(e.target.value); setPreview(null); }}
                  className="text-sm border border-brand-100 rounded-md px-2 py-1 outline-none focus:border-brand-400 bg-white" />
              </div>
            </div>
          )}
        </div>

        {/* Generate button */}
        <div>
          <p className="text-sm font-semibold text-brand-700 mb-3">3. Generate & download</p>
          {error && (
            <div className="mb-3 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}
          <button onClick={generatePreview} disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg py-2.5 text-sm
                       flex items-center justify-center gap-2 disabled:opacity-60 mb-4">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
            {loading ? "Loading report data..." : "Generate Report Preview"}
          </button>

          {preview && (
            <div className="space-y-4">
              {/* Summary preview */}
              <div className="bg-brand-50 rounded-xl p-4">
                <p className="text-xs font-semibold text-brand-500 uppercase tracking-wide mb-3">
                  {REPORT_TYPES.find((r) => r.key === reportType)?.label} · {preview.rangeLabel}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(reportType === "full" || reportType === "sales" || reportType === "profit") && (
                    <>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-brand-300">Revenue</p>
                        <p className="font-semibold text-brand-700 text-sm">{formatNaira(preview.summary.totalRevenue)}</p>
                      </div>
                      <div className="bg-white rounded-lg p-3">
                        <p className="text-xs text-brand-300">Sales</p>
                        <p className="font-semibold text-brand-700 text-sm">{preview.transactions.length} transactions</p>
                      </div>
                    </>
                  )}
                  {(reportType === "full" || reportType === "expenses") && (
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-brand-300">Op. Expenses</p>
                      <p className="font-semibold text-brand-700 text-sm">{formatNaira(preview.summary.operatingExpenses)}</p>
                    </div>
                  )}
                  {(reportType === "full" || reportType === "profit") && (
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-brand-300">Net Profit</p>
                      <p className={"font-semibold text-sm " + (preview.summary.netProfit >= 0 ? "text-green-600" : "text-red-500")}>
                        {formatNaira(preview.summary.netProfit)}
                      </p>
                    </div>
                  )}
                  {(reportType === "full" || reportType === "inventory") && (
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-brand-300">Products</p>
                      <p className="font-semibold text-brand-700 text-sm">{preview.products.length} items</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Download buttons */}
              <div className="grid grid-cols-3 gap-3">
                <button onClick={downloadPDF}
                  className="flex flex-col items-center gap-2 bg-white border border-brand-100 hover:border-brand-300
                             hover:shadow-card rounded-xl p-4 transition-all group">
                  <div className="w-10 h-10 bg-red-50 group-hover:bg-red-100 rounded-lg flex items-center justify-center transition-colors">
                    <FileType size={20} className="text-red-500" />
                  </div>
                  <span className="text-sm font-medium text-brand-700">PDF</span>
                  <span className="text-xs text-brand-300 text-center">Formatted report with tables</span>
                </button>

                <button onClick={downloadExcel}
                  className="flex flex-col items-center gap-2 bg-white border border-brand-100 hover:border-brand-300
                             hover:shadow-card rounded-xl p-4 transition-all group">
                  <div className="w-10 h-10 bg-green-50 group-hover:bg-green-100 rounded-lg flex items-center justify-center transition-colors">
                    <FileSpreadsheet size={20} className="text-green-600" />
                  </div>
                  <span className="text-sm font-medium text-brand-700">Excel</span>
                  <span className="text-xs text-brand-300 text-center">Multiple sheets per section</span>
                </button>

                <button onClick={downloadCSV}
                  className="flex flex-col items-center gap-2 bg-white border border-brand-100 hover:border-brand-300
                             hover:shadow-card rounded-xl p-4 transition-all group">
                  <div className="w-10 h-10 bg-blue-50 group-hover:bg-blue-100 rounded-lg flex items-center justify-center transition-colors">
                    <FileText size={20} className="text-blue-500" />
                  </div>
                  <span className="text-sm font-medium text-brand-700">CSV</span>
                  <span className="text-xs text-brand-300 text-center">Raw data, importable anywhere</span>
                </button>
              </div>

              <p className="text-xs text-brand-300 text-center">
                Generated at {preview.generatedAt} · ImEx-Tek Global Ltd · Confidential
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
