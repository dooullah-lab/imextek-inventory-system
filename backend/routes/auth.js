// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

const ALLOWED_ROLES = ["admin", "manager", "staff"];

// Helper: find a user by email (since email isn't the partition key)
async function findUserByEmail(email) {
  const result = await ddbDocClient.send(
    new ScanCommand({
      TableName: TABLES.USERS,
      FilterExpression: "email = :email",
      ExpressionAttributeValues: { ":email": email.toLowerCase() },
    })
  );
  return result.Items && result.Items[0];
}

// POST /auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const passwordMatches = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatches) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.json({
      token,
      user: { userId: user.userId, email: user.email, role: user.role, name: user.name },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Something went wrong while logging in." });
  }
});

// POST /auth/register  (admin-only: adds new staff accounts)
router.post("/register", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "Name, email, and password are required." });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const finalRole = ALLOWED_ROLES.includes(role) ? role : "staff";

    const newUser = {
      userId: uuidv4(),
      email: email.toLowerCase(),
      hashedPassword,
      name,
      role: finalRole,
      createdAt: new Date().toISOString(),
    };

    await ddbDocClient.send(new PutCommand({ TableName: TABLES.USERS, Item: newUser }));

    res.status(201).json({
      message: "Staff account created.",
      user: { userId: newUser.userId, email: newUser.email, name: newUser.name, role: newUser.role },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Something went wrong while creating the account." });
  }
});

// GET /auth/users - admin only, lists every staff account (for the Users management page)
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.USERS }));
    const users = (result.Items || []).map(({ hashedPassword, ...safe }) => safe);
    res.json(users);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ error: "Could not load user accounts." });
  }
});

// PATCH /auth/users/:id - admin only, change a user's role
router.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ error: "Role must be admin, manager, or staff." });
    }
    const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
    const result = await ddbDocClient.send(
      new UpdateCommand({
        TableName: TABLES.USERS,
        Key: { userId: req.params.id },
        UpdateExpression: "SET #role = :role",
        ExpressionAttributeNames: { "#role": "role" },
        ExpressionAttributeValues: { ":role": role },
        ReturnValues: "ALL_NEW",
      })
    );
    const { hashedPassword, ...safe } = result.Attributes;
    res.json(safe);
  } catch (err) {
    console.error("Update role error:", err);
    res.status(500).json({ error: "Could not update role." });
  }
});

// DELETE /auth/users/:id - admin only, remove a staff account
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: "You can't delete your own account." });
    }
    const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
    await ddbDocClient.send(new DeleteCommand({ TableName: TABLES.USERS, Key: { userId: req.params.id } }));
    res.json({ message: "User removed." });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Could not remove user." });
  }
});

// GET /auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await ddbDocClient.send(
      new GetCommand({ TableName: TABLES.USERS, Key: { userId: req.user.userId } })
    );
    if (!result.Item) return res.status(404).json({ error: "User not found." });

    const { hashedPassword, ...safeUser } = result.Item;
    res.json(safeUser);
  } catch (err) {
    console.error("Me error:", err);
    res.status(500).json({ error: "Could not fetch user details." });
  }
});

module.exports = router;
