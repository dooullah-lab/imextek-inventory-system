// routes/products.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand, UpdateCommand, DeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Helper: filter items by branch unless user is admin
function filterByBranch(items, user) {
  if (user.role === "admin") return items;
  return items.filter((item) => item.branchId === user.branchId);
}

// GET /products/barcode/:barcode
router.get("/barcode/:barcode", requireAuth, async (req, res) => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({
      TableName: TABLES.PRODUCTS,
      FilterExpression: "barcode = :b",
      ExpressionAttributeValues: { ":b": req.params.barcode },
    }));
    let items = result.Items || [];
    items = filterByBranch(items, req.user);
    if (items.length === 0) return res.status(404).json({ error: "No product found with that barcode." });
    res.json(items[0]);
  } catch (err) {
    console.error("Barcode lookup error:", err);
    res.status(500).json({ error: "Could not look up barcode." });
  }
});

// GET /products
router.get("/", requireAuth, async (req, res) => {
  try {
    const { branchId } = req.query;
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS }));
    let items = result.Items || [];

    if (req.user.role === "admin" && branchId) {
      items = items.filter((p) => p.branchId === branchId);
    } else if (req.user.role !== "admin") {
      items = items.filter((p) => p.branchId === req.user.branchId);
    }

    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Could not load products." });
  }
});

// POST /products
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, category, quantity, purchasePrice, sellingPrice, lowStockThreshold, barcode } = req.body;
    if (!name || quantity === undefined || sellingPrice === undefined)
      return res.status(400).json({ error: "Name, quantity, and selling price are required." });

    const product = {
      productId: uuidv4(),
      name,
      category: category || "Uncategorized",
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice),
      price: Number(sellingPrice),
      lowStockThreshold: Number(lowStockThreshold) || 5,
      barcode: barcode || "",
      branchId: req.user.role === "admin" ? (req.body.branchId || "main") : req.user.branchId,
      branchName: req.user.branchName || req.body.branchName || "Main",
      updatedAt: new Date().toISOString(),
    };

    await ddbDocClient.send(new PutCommand({ TableName: TABLES.PRODUCTS, Item: product }));
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: "Could not add product." });
  }
});

// POST /products/bulk-upload
router.post("/bulk-upload", requireAuth, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0)
      return res.status(400).json({ error: "No rows provided." });

    const results = { created: 0, skipped: 0, errors: [] };
    const branchId = req.user.role === "admin" ? (req.body.branchId || "main") : req.user.branchId;
    const branchName = req.user.branchName || req.body.branchName || "Main";

    for (const row of rows) {
      try {
        const name = (row.name || row.Name || "").toString().trim();
        if (!name) { results.skipped++; continue; }

        const product = {
          productId: uuidv4(),
          name,
          category: (row.category || row.Category || "Uncategorized").toString().trim(),
          quantity: Number(row.quantity || row.Quantity || 0),
          purchasePrice: Number(row.purchasePrice || row["Purchase Price"] || 0),
          sellingPrice: Number(row.sellingPrice || row["Selling Price"] || row.price || 0),
          price: Number(row.sellingPrice || row["Selling Price"] || row.price || 0),
          lowStockThreshold: Number(row.lowStockThreshold || row["Low Stock"] || 5),
          barcode: (row.barcode || row.Barcode || "").toString().trim(),
          branchId, branchName,
          updatedAt: new Date().toISOString(),
        };

        await ddbDocClient.send(new PutCommand({ TableName: TABLES.PRODUCTS, Item: product }));
        results.created++;
      } catch (rowErr) {
        results.errors.push(row.name || "unknown");
      }
    }
    res.status(201).json(results);
  } catch (err) {
    res.status(500).json({ error: "Could not process bulk upload." });
  }
});

// PATCH /products/:id
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { name, category, purchasePrice, sellingPrice, lowStockThreshold, barcode } = req.body;
    const updates = [];
    const values = { ":updatedAt": new Date().toISOString() };
    const names = { "#updatedAt": "updatedAt" };
    updates.push("#updatedAt = :updatedAt");

    if (name !== undefined) { updates.push("#name = :name"); values[":name"] = name; names["#name"] = "name"; }
    if (category !== undefined) { updates.push("category = :category"); values[":category"] = category; }
    if (sellingPrice !== undefined) { updates.push("sellingPrice = :sp, price = :sp2"); values[":sp"] = Number(sellingPrice); values[":sp2"] = Number(sellingPrice); }
    if (purchasePrice !== undefined) { updates.push("purchasePrice = :pp"); values[":pp"] = Number(purchasePrice); }
    if (lowStockThreshold !== undefined) { updates.push("lowStockThreshold = :lst"); values[":lst"] = Number(lowStockThreshold); }
    if (barcode !== undefined) { updates.push("barcode = :bc"); values[":bc"] = barcode; }

    const result = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLES.PRODUCTS,
      Key: { productId: req.params.id },
      UpdateExpression: "SET " + updates.join(", "),
      ExpressionAttributeValues: values,
      ExpressionAttributeNames: names,
      ReturnValues: "ALL_NEW",
    }));
    res.json(result.Attributes);
  } catch (err) {
    res.status(500).json({ error: "Could not update product." });
  }
});

// DELETE /products/:id
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await ddbDocClient.send(new DeleteCommand({ TableName: TABLES.PRODUCTS, Key: { productId: req.params.id } }));
    res.json({ message: "Product deleted." });
  } catch (err) {
    res.status(500).json({ error: "Could not delete product." });
  }
});

module.exports = router;
