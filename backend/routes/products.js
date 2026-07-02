// routes/products.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const {
  PutCommand, ScanCommand, UpdateCommand, DeleteCommand, GetCommand
} = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /products
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS }));
    res.json(result.Items || []);
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Could not load products." });
  }
});

// POST /products - add single product
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, category, quantity, purchasePrice, sellingPrice, lowStockThreshold } = req.body;
    if (!name || quantity === undefined || sellingPrice === undefined) {
      return res.status(400).json({ error: "Name, quantity, and selling price are required." });
    }

    const product = {
      productId: uuidv4(),
      name,
      category: category || "Uncategorized",
      quantity: Number(quantity),
      purchasePrice: Number(purchasePrice) || 0,
      sellingPrice: Number(sellingPrice),
      price: Number(sellingPrice), // keep backward compat
      lowStockThreshold: Number(lowStockThreshold) || 5,
      updatedAt: new Date().toISOString(),
    };

    await ddbDocClient.send(new PutCommand({ TableName: TABLES.PRODUCTS, Item: product }));
    res.status(201).json(product);
  } catch (err) {
    console.error("Create product error:", err);
    res.status(500).json({ error: "Could not add product." });
  }
});

// POST /products/bulk-upload - import from parsed CSV/Excel rows
router.post("/bulk-upload", requireAuth, async (req, res) => {
  try {
    const { rows } = req.body;
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "No rows provided." });
    }

    const results = { created: 0, skipped: 0, errors: [] };

    for (const row of rows) {
      try {
        const name = (row.name || row.Name || row.NAME || "").toString().trim();
        const category = (row.category || row.Category || "Uncategorized").toString().trim();
        const quantity = Number(row.quantity || row.Quantity || row.qty || row.Qty || 0);
        const purchasePrice = Number(row.purchasePrice || row["Purchase Price"] || row.purchase_price || 0);
        const sellingPrice = Number(row.sellingPrice || row["Selling Price"] || row.selling_price || row.price || row.Price || 0);
        const lowStockThreshold = Number(row.lowStockThreshold || row["Low Stock"] || 5);

        if (!name) { results.skipped++; continue; }

        const product = {
          productId: uuidv4(),
          name,
          category,
          quantity,
          purchasePrice,
          sellingPrice,
          price: sellingPrice,
          lowStockThreshold,
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
    console.error("Bulk upload error:", err);
    res.status(500).json({ error: "Could not process bulk upload." });
  }
});

// PATCH /products/:id
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { name, category, purchasePrice, sellingPrice, lowStockThreshold } = req.body;
    const updates = [];
    const values = { ":updatedAt": new Date().toISOString() };
    const names = { "#updatedAt": "updatedAt" };
    updates.push("#updatedAt = :updatedAt");

    if (name !== undefined) { updates.push("#name = :name"); values[":name"] = name; names["#name"] = "name"; }
    if (category !== undefined) { updates.push("category = :category"); values[":category"] = category; }
    if (sellingPrice !== undefined) {
      updates.push("sellingPrice = :sp, price = :sp2");
      values[":sp"] = Number(sellingPrice);
      values[":sp2"] = Number(sellingPrice);
    }
    if (purchasePrice !== undefined) {
      updates.push("purchasePrice = :pp");
      values[":pp"] = Number(purchasePrice);
    }
    if (lowStockThreshold !== undefined) { updates.push("lowStockThreshold = :lst"); values[":lst"] = Number(lowStockThreshold); }

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
    console.error("Update product error:", err);
    res.status(500).json({ error: "Could not update product." });
  }
});

// DELETE /products/:id (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await ddbDocClient.send(new DeleteCommand({ TableName: TABLES.PRODUCTS, Key: { productId: req.params.id } }));
    res.json({ message: "Product deleted." });
  } catch (err) {
    console.error("Delete product error:", err);
    res.status(500).json({ error: "Could not delete product." });
  }
});

module.exports = router;
