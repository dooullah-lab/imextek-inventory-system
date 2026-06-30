// routes/transactions.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, UpdateCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// Shared helper: record a sale or restock, then adjust the product's stock count.
async function recordTransaction({ productId, type, quantity, userId }) {
  // 1. Get the current product so we know its price and current quantity
  const productResult = await ddbDocClient.send(
    new GetCommand({ TableName: TABLES.PRODUCTS, Key: { productId } })
  );
  const product = productResult.Item;
  if (!product) {
    const err = new Error("Product not found.");
    err.status = 404;
    throw err;
  }

  const change = type === "sale" ? -Math.abs(quantity) : Math.abs(quantity);
  const newQuantity = product.quantity + change;

  if (newQuantity < 0) {
    const err = new Error(`Not enough stock. Only ${product.quantity} left.`);
    err.status = 400;
    throw err;
  }

  // 2. Update product quantity
  await ddbDocClient.send(
    new UpdateCommand({
      TableName: TABLES.PRODUCTS,
      Key: { productId },
      UpdateExpression: "SET quantity = :q, updatedAt = :u",
      ExpressionAttributeValues: { ":q": newQuantity, ":u": new Date().toISOString() },
    })
  );

  // 3. Write the transaction log entry (this feeds the Analytics tab)
  const transaction = {
    transactionId: uuidv4(),
    productId,
    productName: product.name,
    type,
    quantity: Math.abs(quantity),
    unitPrice: product.price,
    total: product.price * Math.abs(quantity),
    performedBy: userId,
    timestamp: new Date().toISOString(),
  };

  await ddbDocClient.send(new PutCommand({ TableName: TABLES.TRANSACTIONS, Item: transaction }));

  return { transaction, newQuantity };
}

// POST /transactions/sale
router.post("/sale", requireAuth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ error: "productId and quantity are required." });
    }
    const result = await recordTransaction({
      productId, type: "sale", quantity, userId: req.user.userId,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error("Sale error:", err);
    res.status(err.status || 500).json({ error: err.message || "Could not record sale." });
  }
});

// POST /transactions/restock
router.post("/restock", requireAuth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    if (!productId || !quantity) {
      return res.status(400).json({ error: "productId and quantity are required." });
    }
    const result = await recordTransaction({
      productId, type: "restock", quantity, userId: req.user.userId,
    });
    res.status(201).json(result);
  } catch (err) {
    console.error("Restock error:", err);
    res.status(err.status || 500).json({ error: err.message || "Could not record restock." });
  }
});

// GET /transactions - activity log with search, filter, and sort
// Query params: search, type (sale|restock), from, to, sort (newest|oldest|amount_desc|amount_asc)
router.get("/", requireAuth, async (req, res) => {
  try {
    const { search, type, from, to, sort } = req.query;
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.TRANSACTIONS }));
    let items = result.Items || [];

    if (type && (type === "sale" || type === "restock")) {
      items = items.filter((t) => t.type === type);
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((t) => (t.productName || "").toLowerCase().includes(q));
    }
    if (from) {
      const fromDate = new Date(from);
      items = items.filter((t) => new Date(t.timestamp) >= fromDate);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      items = items.filter((t) => new Date(t.timestamp) <= toDate);
    }

    switch (sort) {
      case "oldest":
        items.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        break;
      case "amount_desc":
        items.sort((a, b) => (b.total || 0) - (a.total || 0));
        break;
      case "amount_asc":
        items.sort((a, b) => (a.total || 0) - (b.total || 0));
        break;
      case "newest":
      default:
        items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }

    res.json(items.slice(0, 500));
  } catch (err) {
    console.error("Get transactions error:", err);
    res.status(500).json({ error: "Could not load transaction history." });
  }
});

module.exports = router;
