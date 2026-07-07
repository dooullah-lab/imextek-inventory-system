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
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      break;
    case "week":
      start = new Date(now); start.setDate(start.getDate() - 7); break;
    case "year":
      start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)); break;
    case "month":
    default:
      start = new Date(now); start.setDate(start.getDate() - 30);
  }
  return { start, end };
}

router.get("/summary", requireAuth, async (req, res) => {
  try {
    const { range = "month", from, to, group, branchId } = req.query;
    const { start, end } = resolveRange(range, from, to);

    const [txResult, expResult, prodResult] = await Promise.all([
      ddbDocClient.send(new ScanCommand({ TableName: TABLES.TRANSACTIONS })),
      ddbDocClient.send(new ScanCommand({ TableName: TABLES.EXPENSES })),
      ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS })),
    ]);

    let allTx = txResult.Items || [];
    let allExp = expResult.Items || [];
    let allProducts = prodResult.Items || [];

    // Filter by branch if specified (admin filtering by a specific branch)
    // Also filter by user's branch if not admin
    const effectiveBranchId = branchId || (req.user.role !== "admin" ? req.user.branchId : null);
    if (effectiveBranchId) {
      allTx = allTx.filter((t) => t.branchId === effectiveBranchId);
      allExp = allExp.filter((e) => e.branchId === effectiveBranchId);
      allProducts = allProducts.filter((p) => p.branchId === effectiveBranchId);
    }

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
    const totalCostOfGoods = sales.reduce((sum, t) => sum + (t.costOfGoods || 0), 0);
    const operatingExpenses = expInRange.reduce((sum, e) => sum + (e.amount || 0), 0);
    const grossProfit = totalRevenue - totalCostOfGoods;
    const netProfit = grossProfit - operatingExpenses;

    // Total cost of purchase for current stock
    const totalInventoryCost = allProducts.reduce(
      (sum, p) => sum + ((p.purchasePrice || 0) * (p.quantity || 0)), 0
    );

    // Top products by revenue
    const byProduct = {};
    sales.forEach((t) => {
      if (!byProduct[t.productId]) {
        byProduct[t.productId] = {
          productId: t.productId, name: t.productName,
          unitsSold: 0, revenue: 0, costOfGoods: 0, profit: 0,
        };
      }
      byProduct[t.productId].unitsSold += t.quantity;
      byProduct[t.productId].revenue += t.total || 0;
      byProduct[t.productId].costOfGoods += t.costOfGoods || 0;
      byProduct[t.productId].profit += t.profit || 0;
    });
    const topProducts = Object.values(byProduct)
      .sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Expenses by category
    const expByCategory = {};
    expInRange.forEach((e) => {
      const cat = e.category || "Other";
      expByCategory[cat] = (expByCategory[cat] || 0) + (e.amount || 0);
    });
    const expensesByCategory = Object.entries(expByCategory)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);

    // Revenue vs expenses timeline
    const spanDays = (end - start) / (1000 * 60 * 60 * 24);
    const groupBy = group || (spanDays > 60 ? "month" : "day");

    const revMap = {}, expMap = {}, cogMap = {};
    sales.forEach((t) => {
      const key = groupBy === "month" ? t.timestamp.slice(0, 7) : t.timestamp.slice(0, 10);
      revMap[key] = (revMap[key] || 0) + (t.total || 0);
      cogMap[key] = (cogMap[key] || 0) + (t.costOfGoods || 0);
    });
    expInRange.forEach((e) => {
      const key = groupBy === "month" ? e.timestamp.slice(0, 7) : e.timestamp.slice(0, 10);
      expMap[key] = (expMap[key] || 0) + (e.amount || 0);
    });

    const allKeys = new Set([...Object.keys(revMap), ...Object.keys(expMap)]);
    const dailyBreakdown = Array.from(allKeys)
      .map((date) => ({
        date,
        revenue: revMap[date] || 0,
        expenses: expMap[date] || 0,
        costOfGoods: cogMap[date] || 0,
        profit: (revMap[date] || 0) - (cogMap[date] || 0) - (expMap[date] || 0),
      }))
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    res.json({
      range, groupBy,
      totalRevenue, unitsSold, unitsRestocked,
      totalCostOfGoods, operatingExpenses, grossProfit, netProfit,
      totalInventoryCost, transactionCount: inRange.length,
      topProducts, expensesByCategory, dailyBreakdown,
    });
  } catch (err) {
    console.error("Analytics summary error:", err);
    res.status(500).json({ error: "Could not generate analytics summary." });
  }
});

router.get("/details", requireAuth, async (req, res) => {
  try {
    const { type, range = "month", from, to } = req.query;

    if (type === "lowStock") {
      const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS }));
      const lowStock = (result.Items || []).filter((p) => p.quantity <= p.lowStockThreshold);
      return res.json({ type, items: lowStock });
    }
    if (type === "expenses" || type === "operatingExpenses") {
      const { start, end } = resolveRange(range, from, to);
      const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.EXPENSES }));
      const items = (result.Items || [])
        .filter((e) => { const ts = new Date(e.timestamp); return ts >= start && ts <= end; })
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      return res.json({ type, items });
    }
    if (type === "costOfPurchase") {
      const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS }));
      return res.json({ type, items: result.Items || [] });
    }

    const { start, end } = resolveRange(range, from, to);
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.TRANSACTIONS }));
    const all = result.Items || [];
    const inRange = all.filter((t) => {
      const ts = new Date(t.timestamp);
      return ts >= start && ts <= end;
    });

    let items = [];
    if (type === "revenue" || type === "unitsSold" || type === "profit") {
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

router.get("/low-stock", requireAuth, async (req, res) => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS }));
    let products = result.Items || [];
    if (req.user.role !== "admin") {
      products = products.filter((p) => p.branchId === req.user.branchId);
    } else if (req.query.branchId) {
      products = products.filter((p) => p.branchId === req.query.branchId);
    }
    const lowStock = products.filter((p) => p.quantity <= p.lowStockThreshold);
    res.json(lowStock);
  } catch (err) {
    res.status(500).json({ error: "Could not check low stock items." });
  }
});

module.exports = router;

// GET /analytics/branch-comparison — admin only, all branches side by side
router.get("/branch-comparison", requireAuth, async (req, res) => {
  try {
    if (req.user.role !== "admin") return res.status(403).json({ error: "Admin only." });

    const { range = "month", from, to } = req.query;
    const { start, end } = resolveRange(range, from, to);

    const [txResult, expResult, prodResult, branchResult] = await Promise.all([
      ddbDocClient.send(new ScanCommand({ TableName: TABLES.TRANSACTIONS })),
      ddbDocClient.send(new ScanCommand({ TableName: TABLES.EXPENSES })),
      ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS })),
      ddbDocClient.send(new ScanCommand({ TableName: TABLES.BRANCHES })),
    ]);

    const branches = (branchResult.Items || []).filter((b) => b.status === "active");
    const allTx = (txResult.Items || []).filter((t) => {
      const ts = new Date(t.timestamp);
      return ts >= start && ts <= end;
    });
    const allExp = (expResult.Items || []).filter((e) => {
      const ts = new Date(e.timestamp);
      return ts >= start && ts <= end;
    });
    const allProd = prodResult.Items || [];

    const comparison = branches.map((branch) => {
      const branchTx = allTx.filter((t) => t.branchId === branch.branchId);
      const branchExp = allExp.filter((e) => e.branchId === branch.branchId);
      const branchProd = allProd.filter((p) => p.branchId === branch.branchId);

      const sales = branchTx.filter((t) => t.type === "sale");
      const totalRevenue = sales.reduce((s, t) => s + (t.total || 0), 0);
      const totalCostOfGoods = sales.reduce((s, t) => s + (t.costOfGoods || 0), 0);
      const operatingExpenses = branchExp.reduce((s, e) => s + (e.amount || 0), 0);
      const grossProfit = totalRevenue - totalCostOfGoods;
      const netProfit = grossProfit - operatingExpenses;
      const unitsSold = sales.reduce((s, t) => s + t.quantity, 0);
      const lowStockCount = branchProd.filter((p) => p.quantity <= p.lowStockThreshold).length;

      return {
        branchId: branch.branchId,
        branchName: branch.name,
        location: branch.location || "",
        totalRevenue, totalCostOfGoods,
        grossProfit, operatingExpenses, netProfit,
        unitsSold, productCount: branchProd.length, lowStockCount,
      };
    });

    // Sort by net profit descending
    comparison.sort((a, b) => b.netProfit - a.netProfit);

    // Totals row
    const totals = comparison.reduce((acc, b) => ({
      totalRevenue: acc.totalRevenue + b.totalRevenue,
      totalCostOfGoods: acc.totalCostOfGoods + b.totalCostOfGoods,
      grossProfit: acc.grossProfit + b.grossProfit,
      operatingExpenses: acc.operatingExpenses + b.operatingExpenses,
      netProfit: acc.netProfit + b.netProfit,
      unitsSold: acc.unitsSold + b.unitsSold,
      productCount: acc.productCount + b.productCount,
      lowStockCount: acc.lowStockCount + b.lowStockCount,
    }), { totalRevenue: 0, totalCostOfGoods: 0, grossProfit: 0, operatingExpenses: 0, netProfit: 0, unitsSold: 0, productCount: 0, lowStockCount: 0 });

    res.json({ branches: comparison, totals, range });
  } catch (err) {
    console.error("Branch comparison error:", err);
    res.status(500).json({ error: "Could not generate branch comparison." });
  }
});
