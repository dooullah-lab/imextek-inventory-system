// routes/categories.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand, DeleteCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /categories
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.CATEGORIES }));
    const items = (result.Items || []).sort((a, b) => a.name.localeCompare(b.name));
    res.json(items);
  } catch (err) {
    console.error("Get categories error:", err);
    res.status(500).json({ error: "Could not load categories." });
  }
});

// POST /categories (admin/manager only)
router.post("/", requireAuth, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required." });

    // Check for duplicate
    const existing = await ddbDocClient.send(new ScanCommand({
      TableName: TABLES.CATEGORIES,
      FilterExpression: "#name = :name",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: { ":name": name.trim() },
    }));
    if (existing.Items && existing.Items.length > 0)
      return res.status(409).json({ error: "Category already exists." });

    const category = {
      categoryId: uuidv4(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    await ddbDocClient.send(new PutCommand({ TableName: TABLES.CATEGORIES, Item: category }));
    res.status(201).json(category);
  } catch (err) {
    console.error("Create category error:", err);
    res.status(500).json({ error: "Could not create category." });
  }
});

// PATCH /categories/:id
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Category name is required." });
    const result = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLES.CATEGORIES,
      Key: { categoryId: req.params.id },
      UpdateExpression: "SET #name = :name",
      ExpressionAttributeNames: { "#name": "name" },
      ExpressionAttributeValues: { ":name": name.trim() },
      ReturnValues: "ALL_NEW",
    }));
    res.json(result.Attributes);
  } catch (err) {
    res.status(500).json({ error: "Could not update category." });
  }
});

// DELETE /categories/:id (admin only)
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await ddbDocClient.send(new DeleteCommand({ TableName: TABLES.CATEGORIES, Key: { categoryId: req.params.id } }));
    res.json({ message: "Category deleted." });
  } catch (err) {
    res.status(500).json({ error: "Could not delete category." });
  }
});

module.exports = router;
