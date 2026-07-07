// routes/branches.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand, UpdateCommand, DeleteCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// GET /branches — all branches (admin sees all, others see their own)
router.get("/", requireAuth, async (req, res) => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.BRANCHES }));
    let branches = result.Items || [];

    // Non-admin only sees their own branch
    if (req.user.role !== "admin") {
      branches = branches.filter((b) => b.branchId === req.user.branchId);
    }

    branches.sort((a, b) => (a.name > b.name ? 1 : -1));
    res.json(branches);
  } catch (err) {
    console.error("Get branches error:", err);
    res.status(500).json({ error: "Could not load branches." });
  }
});

// POST /branches — admin only
router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, location, phone, address } = req.body;
    if (!name) return res.status(400).json({ error: "Branch name is required." });

    const branch = {
      branchId: uuidv4(),
      name: name.trim(),
      location: location || "",
      phone: phone || "",
      address: address || "",
      status: "active",
      createdAt: new Date().toISOString(),
    };

    await ddbDocClient.send(new PutCommand({ TableName: TABLES.BRANCHES, Item: branch }));
    res.status(201).json(branch);
  } catch (err) {
    console.error("Create branch error:", err);
    res.status(500).json({ error: "Could not create branch." });
  }
});

// PATCH /branches/:id — admin only
router.patch("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, location, phone, address, status } = req.body;
    const updates = [];
    const values = {};
    const names = {};

    if (name) { updates.push("#name = :name"); values[":name"] = name.trim(); names["#name"] = "name"; }
    if (location !== undefined) { updates.push("loc = :loc"); values[":loc"] = location; }
    if (phone !== undefined) { updates.push("phone = :phone"); values[":phone"] = phone; }
    if (address !== undefined) { updates.push("address = :address"); values[":address"] = address; }
    if (status) { updates.push("#status = :status"); values[":status"] = status; names["#status"] = "status"; }

    if (updates.length === 0) return res.status(400).json({ error: "Nothing to update." });

    const result = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLES.BRANCHES,
      Key: { branchId: req.params.id },
      UpdateExpression: "SET " + updates.join(", "),
      ExpressionAttributeValues: values,
      ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
      ReturnValues: "ALL_NEW",
    }));
    res.json(result.Attributes);
  } catch (err) {
    console.error("Update branch error:", err);
    res.status(500).json({ error: "Could not update branch." });
  }
});

// DELETE /branches/:id — admin only, archives instead of hard delete
router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { force } = req.query;

    if (force === "true") {
      await ddbDocClient.send(new DeleteCommand({ TableName: TABLES.BRANCHES, Key: { branchId: req.params.id } }));
      return res.json({ message: "Branch permanently deleted." });
    }

    // Default: archive (data preserved, branch hidden from active use)
    await ddbDocClient.send(new UpdateCommand({
      TableName: TABLES.BRANCHES,
      Key: { branchId: req.params.id },
      UpdateExpression: "SET #status = :status",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: { ":status": "archived" },
    }));
    res.json({ message: "Branch archived. All data is preserved." });
  } catch (err) {
    console.error("Delete branch error:", err);
    res.status(500).json({ error: "Could not archive branch." });
  }
});

module.exports = router;
