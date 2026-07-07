// routes/masterCatalogue.js
// Super Admin manages a central product template library.
// Branch managers can copy from here into their own branch inventory.
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /master-catalogue — all users can view (to copy from)
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.MASTER_CATALOGUE }));
    const items = (result.Items || []).sort((a, b) => a.name.localeCompare(b.name));
    res.json(items);
  } catch (err) {
    console.error("Get master catalogue error:", err);
    res.status(500).json({ error: "Could not load master catalogue." });
  }
});

// POST /master-catalogue — admin only
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, category, defaultPurchasePrice, defaultSellingPrice } = req.body;
    if (!name) return res.status(400).json({ error: "Product name is required." });

    const item = {
      catalogueId: uuidv4(),
      name: name.trim(),
      category: category || "Uncategorized",
      defaultPurchasePrice: Number(defaultPurchasePrice) || 0,
      defaultSellingPrice: Number(defaultSellingPrice) || 0,
      createdBy: req.user.userId,
      createdAt: new Date().toISOString(),
    };

    await ddbDocClient.send(new PutCommand({ TableName: TABLES.MASTER_CATALOGUE, Item: item }));
    res.status(201).json(item);
  } catch (err) {
    console.error("Create catalogue item error:", err);
    res.status(500).json({ error: "Could not add to master catalogue." });
  }
});

// PATCH /master-catalogue/:id — admin only
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, category, defaultPurchasePrice, defaultSellingPrice } = req.body;
    const updates = [];
    const values = {};
    const names = {};

    if (name) { updates.push("#name = :n"); values[":n"] = name.trim(); names["#name"] = "name"; }
    if (category) { updates.push("category = :c"); values[":c"] = category; }
    if (defaultPurchasePrice !== undefined) { updates.push("defaultPurchasePrice = :pp"); values[":pp"] = Number(defaultPurchasePrice); }
    if (defaultSellingPrice !== undefined) { updates.push("defaultSellingPrice = :sp"); values[":sp"] = Number(defaultSellingPrice); }

    if (updates.length === 0) return res.status(400).json({ error: "Nothing to update." });

    const result = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLES.MASTER_CATALOGUE,
      Key: { catalogueId: req.params.id },
      UpdateExpression: "SET " + updates.join(", "),
      ExpressionAttributeValues: values,
      ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
      ReturnValues: "ALL_NEW",
    }));
    res.json(result.Attributes);
  } catch (err) {
    res.status(500).json({ error: "Could not update catalogue item." });
  }
});

// DELETE /master-catalogue/:id — admin only
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    await ddbDocClient.send(new DeleteCommand({ TableName: TABLES.MASTER_CATALOGUE, Key: { catalogueId: req.params.id } }));
    res.json({ message: "Removed from master catalogue." });
  } catch (err) {
    res.status(500).json({ error: "Could not remove item." });
  }
});

module.exports = router;
