// routes/transactions.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, UpdateCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Record one item in a sale or restock, returns transaction record
async function recordSingleItem({ productId, type, quantity, userId, groupId }) {
  const productResult = await ddbDocClient.send(
    new GetCommand({ TableName: TABLES.PRODUCTS, Key: { productId } })
  );
  const product = productResult.Item;
  if (!product) {
    const err = new Error(`Product not found: ${productId}`);
    err.status = 404;
    throw err;
  }

  const change = type === "sale" ? -Math.abs(quantity) : Math.abs(quantity);
  const newQuantity = product.quantity + change;

  if (newQuantity < 0) {
    const err = new Error(`Not enough stock for "${product.name}". Only ${product.quantity} left.`);
    err.status = 400;
    throw err;
  }

  // Update stock
  await ddbDocClient.send(new UpdateCommand({
    TableName: TABLES.PRODUCTS,
    Key: { productId },
    UpdateExpression: "SET quantity = :q, updatedAt = :u",
    ExpressionAttributeValues: { ":q": newQuantity, ":u": new Date().toISOString() },
  }));

  const sellingPrice = product.sellingPrice || product.price || 0;
  const purchasePrice = product.purchasePrice || 0;

  const transaction = {
    transactionId: uuidv4(),
    groupId: groupId || null, // links multi-item transactions together
    productId,
    productName: product.name,
    type,
    quantity: Math.abs(quantity),
    unitPrice: sellingPrice,
    purchasePrice,
    total: sellingPrice * Math.abs(quantity),
    costOfGoods: purchasePrice * Math.abs(quantity),
    profit: (sellingPrice - purchasePrice) * Math.abs(quantity),
    performedBy: userId,
    timestamp: new Date().toISOString(),
  };

  await ddbDocClient.send(new PutCommand({ TableName: TABLES.TRANSACTIONS, Item: transaction }));
  return { transaction, newQuantity };
}

// POST /transactions/sale
// Supports single: { productId, quantity }
// Supports multi:  { items: [{ productId, quantity }, ...] }
router.post("/sale", requireAuth, async (req, res) => {
  try {
    const { productId, quantity, items } = req.body;
    const groupId = uuidv4(); // ties multi-item receipts together

    // Multi-item sale
    if (items && Array.isArray(items)) {
      if (items.length === 0) return res.status(400).json({ error: "No items provided." });

      const results = [];
      for (const item of items) {
        if (!item.productId || !item.quantity) continue;
        const result = await recordSingleItem({
          productId: item.productId,
          type: "sale",
          quantity: item.quantity,
          userId: req.user.userId,
          groupId,
        });
        results.push(result);
      }
      return res.status(201).json({ groupId, items: results });
    }

    // Single item sale (backward compatible)
    if (!productId || !quantity) return res.status(400).json({ error: "productId and quantity are required." });
    const result = await recordSingleItem({ productId, type: "sale", quantity, userId: req.user.userId, groupId });
    res.status(201).json(result);
  } catch (err) {
    console.error("Sale error:", err);
    res.status(err.status || 500).json({ error: err.message || "Could not record sale." });
  }
});

// POST /transactions/restock
// Supports single: { productId, quantity }
// Supports multi:  { items: [{ productId, quantity }, ...] }
router.post("/restock", requireAuth, async (req, res) => {
  try {
    const { productId, quantity, items } = req.body;
    const groupId = uuidv4();

    if (items && Array.isArray(items)) {
      if (items.length === 0) return res.status(400).json({ error: "No items provided." });
      const results = [];
      for (const item of items) {
        if (!item.productId || !item.quantity) continue;
        const result = await recordSingleItem({
          productId: item.productId,
          type: "restock",
          quantity: item.quantity,
          userId: req.user.userId,
          groupId,
        });
        results.push(result);
      }
      return res.status(201).json({ groupId, items: results });
    }

    if (!productId || !quantity) return res.status(400).json({ error: "productId and quantity are required." });
    const result = await recordSingleItem({ productId, type: "restock", quantity, userId: req.user.userId, groupId });
    res.status(201).json(result);
  } catch (err) {
    console.error("Restock error:", err);
    res.status(err.status || 500).json({ error: err.message || "Could not record restock." });
  }
});

// GET /transactions
router.get("/", requireAuth, async (req, res) => {
  try {
    const { search, type, from, to, sort } = req.query;
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.TRANSACTIONS }));
    let items = result.Items || [];

    if (type && (type === "sale" || type === "restock")) items = items.filter((t) => t.type === type);
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((t) => (t.productName || "").toLowerCase().includes(q));
    }
    if (from) items = items.filter((t) => new Date(t.timestamp) >= new Date(from));
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      items = items.filter((t) => new Date(t.timestamp) <= toDate);
    }

    switch (sort) {
      case "oldest": items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); break;
      case "amount_desc": items.sort((a, b) => (b.total || 0) - (a.total || 0)); break;
      case "amount_asc": items.sort((a, b) => (a.total || 0) - (b.total || 0)); break;
      default: items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    res.json(items.slice(0, 500));
  } catch (err) {
    console.error("Get transactions error:", err);
    res.status(500).json({ error: "Could not load transaction history." });
  }
});

module.exports = router;
