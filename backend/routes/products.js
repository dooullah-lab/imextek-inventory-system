// routes/products.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand, UpdateCommand, DeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /products - list everything in the notebook
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.PRODUCTS }));
    res.json(result.Items || []);
  } catch (err) {
    console.error("Get products error:", err);
    res.status(500).json({ error: "Could not load products." });
  }
});

// POST /products - add a new product page to the notebook
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, category, quantity, price, lowStockThreshold } = req.body;
    if (!name || quantity === undefined || price === undefined) {
      return res.status(400).json({ error: "Name, quantity, and price are required." });
    }

    const product = {
      productId: uuidv4(),
      name,
      category: category || "Uncategorized",
      quantity: Number(quantity),
      price: Number(price),
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

// PATCH /products/:id - edit a product's details (not stock - that's done via transactions)
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { name, category, price, lowStockThreshold } = req.body;

    const updates = [];
    const values = { ":updatedAt": new Date().toISOString() };
    const names = { "#updatedAt": "updatedAt" };
    updates.push("#updatedAt = :updatedAt");

    if (name !== undefined) { updates.push("#name = :name"); values[":name"] = name; names["#name"] = "name"; }
    if (category !== undefined) { updates.push("category = :category"); values[":category"] = category; }
    if (price !== undefined) { updates.push("price = :price"); values[":price"] = Number(price); }
    if (lowStockThreshold !== undefined) {
      updates.push("lowStockThreshold = :lst"); values[":lst"] = Number(lowStockThreshold);
    }

    const result = await ddbDocClient.send(
      new UpdateCommand({
        TableName: TABLES.PRODUCTS,
        Key: { productId: req.params.id },
        UpdateExpression: "SET " + updates.join(", "),
        ExpressionAttributeValues: values,
        ExpressionAttributeNames: names,
        ReturnValues: "ALL_NEW",
      })
    );

    res.json(result.Attributes);
  } catch (err) {
    console.error("Update product error:", err);
    res.status(500).json({ error: "Could not update product." });
  }
});

// DELETE /products/:id - admin only, removes a page from the notebook
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
