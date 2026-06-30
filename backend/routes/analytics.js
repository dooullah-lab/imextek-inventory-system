// routes/analytics.js
const express = require("express");
const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Works out the start/end window for a given range, OR a fully custom range
// if "from" and "to" query params are supplied.
function resolveRange(range, from, to) {
  const now = new Date();

  if (range === "custom" && from && to) {
    const start = new Date(from);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  let start;
  switch (range) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      start = d;
      break;
    }
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case "month":
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

// GET /analytics/summary?range=today|week|month|year|custom&from=&to=&group=day|month
router.get("/summary", requireAuth, async (req, res) => {
  try {
    const { range = "month", from, to, group } = req.query;
    const { start, end } = resolveRange(range, from, to);

    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.TRANSACTIONS }));
    const all = result.Items || [];

    const inRange = all.filter((t) => {
      const ts = new Date(t.timestamp);
      return ts >= start && ts <= end;
    });
    const sales = inRange.filter((t) => t.type === "sale");
    const restocks = inRange.filter((t) => t.type === "restock");

    const totalRevenue = sales.reduce((sum, t) => sum + (t.total || 0), 0);
    const unitsSold = sales.reduce((sum, t) => sum + t.quantity, 0);
    const unitsRestocked = restocks.reduce((sum, t) => sum + t.quantity, 0);

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

    // Decide whether to group the chart by day or by month.
    // Auto-decides: if the range spans more than 60 days, group by month automatically.
    const spanDays = (end - start) / (1000 * 60 * 60 * 24);
    const groupBy = group || (spanDays > 60 ? "month" : "day");

    const bucketMap = {};
    sales.forEach((t) => {
      const key = groupBy === "month" ? t.timestamp.slice(0, 7) : t.timestamp.slice(0, 10); // YYYY-MM or YYYY-MM-DD
      bucketMap[key] = (bucketMap[key] || 0) + (t.total || 0);
    });
    const dailyBreakdown = Object.entries(bucketMap)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    res.json({
      range,
      groupBy,
      totalRevenue,
      unitsSold,
      unitsRestocked,
      transactionCount: inRange.length,
      topProducts,
      dailyBreakdown,
    });
  } catch (err) {
    console.error("Analytics summary error:", err);
    res.status(500).json({ error: "Could not generate analytics summary." });
  }
});

// GET /analytics/details?type=revenue|unitsSold|unitsRestocked|lowStock&range=&from=&to=
// Powers the "click a stat card to see what's behind the number" drill-down.
router.get("/details", requireAuth, async (req, res) => {
  try {
    const { type, range = "month", from, to } = req.query;

    if (type === "lowStock") {
      const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS }));
      const lowStock = (result.Items || []).filter((p) => p.quantity <= p.lowStockThreshold);
      return res.json({ type, items: lowStock });
    }

    const { start, end } = resolveRange(range, from, to);
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.TRANSACTIONS }));
    const all = result.Items || [];
    const inRange = all.filter((t) => {
      const ts = new Date(t.timestamp);
      return ts >= start && ts <= end;
    });

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

// GET /analytics/low-stock - products under their warning threshold
router.get("/low-stock", requireAuth, async (req, res) => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS }));
    const lowStock = (result.Items || []).filter((p) => p.quantity <= p.lowStockThreshold);
    res.json(lowStock);
  } catch (err) {
    console.error("Low stock error:", err);
    res.status(500).json({ error: "Could not check low stock items." });
  }
});

module.exports = router;
