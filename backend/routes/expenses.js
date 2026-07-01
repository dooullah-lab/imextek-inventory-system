// routes/expenses.js
const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, ScanCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const EXPENSE_CATEGORIES = [
  "Salaries", "Rent", "Utilities", "Supplies", "Transport",
  "Marketing", "Maintenance", "Equipment", "Other"
];

// GET /expenses
router.get("/", requireAuth, async (req, res) => {
  try {
    const { from, to } = req.query;
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.EXPENSES }));
    let items = result.Items || [];

    if (from) items = items.filter((e) => new Date(e.timestamp) >= new Date(from));
    if (to) {
      const toDate = new Date(to);
      toDate.setUTCHours(23, 59, 59, 999);
      items = items.filter((e) => new Date(e.timestamp) <= toDate);
    }

    items.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json(items);
  } catch (err) {
    console.error("Get expenses error:", err);
    res.status(500).json({ error: "Could not load expenses." });
  }
});

// GET /expenses/categories
router.get("/categories", requireAuth, (req, res) => {
  res.json(EXPENSE_CATEGORIES);
});

// POST /expenses
router.post("/", requireAuth, async (req, res) => {
  try {
    const { title, amount, category, date, notes } = req.body;
    if (!title || !amount || !category) {
      return res.status(400).json({ error: "Title, amount, and category are required." });
    }

    const expense = {
      expenseId: uuidv4(),
      title,
      amount: Number(amount),
      category,
      date: date || new Date().toISOString().slice(0, 10),
      notes: notes || "",
      recordedBy: req.user.userId,
      timestamp: new Date().toISOString(),
    };

    await ddbDocClient.send(new PutCommand({ TableName: TABLES.EXPENSES, Item: expense }));
    res.status(201).json(expense);
  } catch (err) {
    console.error("Create expense error:", err);
    res.status(500).json({ error: "Could not add expense." });
  }
});

// PATCH /expenses/:id
router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const { title, amount, category, date, notes } = req.body;
    const result = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLES.EXPENSES,
      Key: { expenseId: req.params.id },
      UpdateExpression: "SET title = :t, amount = :a, category = :c, #date = :d, notes = :n",
      ExpressionAttributeNames: { "#date": "date" },
      ExpressionAttributeValues: {
        ":t": title, ":a": Number(amount), ":c": category,
        ":d": date, ":n": notes || "",
      },
      ReturnValues: "ALL_NEW",
    }));
    res.json(result.Attributes);
  } catch (err) {
    res.status(500).json({ error: "Could not update expense." });
  }
});

// DELETE /expenses/:id (admin/manager only)
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    if (!["admin", "manager"].includes(req.user.role)) {
      return res.status(403).json({ error: "Only admins and managers can delete expenses." });
    }
    await ddbDocClient.send(new DeleteCommand({ TableName: TABLES.EXPENSES, Key: { expenseId: req.params.id } }));
    res.json({ message: "Expense deleted." });
  } catch (err) {
    res.status(500).json({ error: "Could not delete expense." });
  }
});

module.exports = router;
