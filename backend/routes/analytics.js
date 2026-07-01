// routes/analytics.js
const express = require("express");
const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function resolveRange(range, from, to) {
  const now = new Date();

  if (range === "custom" && from && to) {
    const start = new Date(from);
    const end = new Date(to);
    end.setUTCHours(23, 59, 59, 999);
    return { start, end };
  }

  let start;
  const end = new Date(now);

  switch (range) {
    case "today":
      // Midnight UTC today
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      break;
    case "week":
      start = new Date(now);
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      // Last 30 days — matches the "7 days" pattern so results are never empty by accident
      start = new Date(now);
      start.setDate(start.getDate() - 30);
      break;
    case "year":
      start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
      break;
    default:
      start = new Date(now);
      start.setDate(start.getDate() - 30);
  }

  return { start, end };
}

// GET /analytics/summary
router.get("/summary", requireAuth, async (req, res) => {
  try {
    const { range = "month", from, to, group } = req.query;
    const { start, end } = resolveRange(range, from, to);

    const [txResult, expResult] = await Promise.all([
      ddbDocClient.send(new ScanCommand({ TableName: TABLES.TRANSACTIONS })),
      ddbDocClient.send(new ScanCommand({ TableName: TABLES.EXPENSES })),
    ]);

    const allTx = txResult.Items || [];
    const allExp = expResult.Items || [];

    const inRange = allTx.filter((t) => {
      const ts = new Date(t.timestamp);
      return ts >= start && ts <= end;
    });

    const expInRange = allExp.filter((e) => {
      const ts = new Date(e.timestamp);
      return ts >= start && ts <= end;
    });

    const sales = inRange.filter((t) => t.type === "sale");
    const restocks = inRange.filter((t) => t.type === "restock");

    const totalRevenue = sales.reduce((sum, t) => sum + (t.total || 0), 0);
    const unitsSold = sales.reduce((sum, t) => sum + t.quantity, 0);
    const unitsRestocked = restocks.reduce((sum, t) => sum + t.quantity, 0);
    const totalExpenses = expInRange.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;

    // Top products by revenue
    const byProduct = {};
    sales.forEach((t) => {
      if (!byProduct[t.productId]) {
        byProduct[t.productId] = { productId: t.productId, name: t.productName, unitsSold: 0, revenue: 0 };
      }
      byProduct[t.productId].unitsSold += t.quantity;
      byProduct[t.productId].revenue += t.total || 0;
    });
    const topProducts = Object.values(byProduct).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Expenses by category
    const expByCategory = {};
    expInRange.forEach((e) => {
      const cat = e.category || "Other";
      expByCategory[cat] = (expByCategory[cat] || 0) + (e.amount || 0);
    });
    const expensesByCategory = Object.entries(expByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Auto-group by day or month
    const spanDays = (end - start) / (1000 * 60 * 60 * 24);
    const groupBy = group || (spanDays > 60 ? "month" : "day");

    const revMap = {};
    const expMap = {};
    sales.forEach((t) => {
      const key = groupBy === "month" ? t.timestamp.slice(0, 7) : t.timestamp.slice(0, 10);
      revMap[key] = (revMap[key] || 0) + (t.total || 0);
    });
    expInRange.forEach((e) => {
      const key = groupBy === "month" ? e.timestamp.slice(0, 7) : e.timestamp.slice(0, 10);
      expMap[key] = (expMap[key] || 0) + (e.amount || 0);
    });

    // Merge revenue and expense timelines
    const allKeys = new Set([...Object.keys(revMap), ...Object.keys(expMap)]);
    const dailyBreakdown = Array.from(allKeys)
      .map((date) => ({ date, revenue: revMap[date] || 0, expenses: expMap[date] || 0 }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    res.json({
      range, groupBy, totalRevenue, unitsSold, unitsRestocked,
      totalExpenses, netProfit, transactionCount: inRange.length,
      topProducts, expensesByCategory, dailyBreakdown,
    });
  } catch (err) {
    console.error("Analytics summary error:", err);
    res.status(500).json({ error: "Could not generate analytics summary." });
  }
});

// GET /analytics/details
router.get("/details", requireAuth, async (req, res) => {
  try {
    const { type, range = "month", from, to } = req.query;

    if (type === "lowStock") {
      const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS }));
      const lowStock = (result.Items || []).filter((p) => p.quantity <= p.lowStockThreshold);
      return res.json({ type, items: lowStock });
    }

    if (type === "expenses") {
      const { start, end } = resolveRange(range, from, to);
      const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.EXPENSES }));
      const items = (result.Items || [])
        .filter((e) => { const ts = new Date(e.timestamp); return ts >= start && ts <= end; })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return res.json({ type, items });
    }

    const { start, end } = resolveRange(range, from, to);
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.TRANSACTIONS }));
    const all = result.Items || [];
    const inRange = all.filter((t) => { const ts = new Date(t.timestamp); return ts >= start && ts <= end; });

    let items = [];
    if (type === "revenue" || type === "unitsSold") {
      items = inRange.filter((t) => t.type === "sale");
    } else if (type === "unitsRestocked") {
      items = inRange.filter((t) => t.type === "restock");
    } else {
      return res.status(400).json({ error: "Unknown detail type." });
    }

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ type, items });
  } catch (err) {
    console.error("Analytics details error:", err);
    res.status(500).json({ error: "Could not load details." });
  }
});

// GET /analytics/low-stock
router.get("/low-stock", requireAuth, async (req, res) => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS }));
    const lowStock = (result.Items || []).filter((p) => p.quantity <= p.lowStockThreshold);
    res.json(lowStock);
  } catch (err) {
    res.status(500).json({ error: "Could not check low stock items." });
  }
});

module.exports = router;
