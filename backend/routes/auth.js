// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const {
  PutCommand, GetCommand, ScanCommand, UpdateCommand, DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { sendPasswordResetEmail } = require("../utils/mailer");

const router = express.Router();
const ALLOWED_ROLES = ["admin", "manager", "staff"];

// Find user by email OR username
async function findUser(identifier) {
  const emailResult = await ddbDocClient.send(new ScanCommand({
    TableName: TABLES.USERS,
    FilterExpression: "email = :v",
    ExpressionAttributeValues: { ":v": identifier.toLowerCase() },
  }));
  if (emailResult.Items && emailResult.Items[0]) return emailResult.Items[0];

  // Try username
  const usernameResult = await ddbDocClient.send(new ScanCommand({
    TableName: TABLES.USERS,
    FilterExpression: "username = :v",
    ExpressionAttributeValues: { ":v": identifier.toLowerCase() },
  }));
  return usernameResult.Items && usernameResult.Items[0];
}

async function findUserByEmail(email) {
  const result = await ddbDocClient.send(new ScanCommand({
    TableName: TABLES.USERS,
    FilterExpression: "email = :email",
    ExpressionAttributeValues: { ":email": email.toLowerCase() },
  }));
  return result.Items && result.Items[0];
}

// POST /auth/login — accepts email or username
router.post("/login", async (req, res) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = identifier || email;
    if (!loginId || !password)
      return res.status(400).json({ error: "Email/username and password are required." });

    const user = await findUser(loginId);
    if (!user) return res.status(401).json({ error: "Incorrect email/username or password." });

    const passwordMatches = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatches) return res.status(401).json({ error: "Incorrect email/username or password." });

    const token = jwt.sign(
      { userId: user.userId, email: user.email, role: user.role, branchId: user.branchId || null },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );
    res.json({
      token,
      user: {
        userId: user.userId, email: user.email, role: user.role,
        name: user.name, username: user.username || null,
        branchId: user.branchId || null, branchName: user.branchName || null,
        avatar: user.avatar || null,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Something went wrong while logging in." });
  }
});

// POST /auth/register — admin only, now with username and branchId
router.post("/register", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { email, password, name, role, username, branchId, branchName } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: "Name, email and password are required." });

    const existing = await findUserByEmail(email);
    if (existing) return res.status(409).json({ error: "An account with this email already exists." });

    // Check username uniqueness if provided
    if (username) {
      const existingUsername = await ddbDocClient.send(new ScanCommand({
        TableName: TABLES.USERS,
        FilterExpression: "username = :u",
        ExpressionAttributeValues: { ":u": username.toLowerCase() },
      }));
      if (existingUsername.Items && existingUsername.Items[0]) {
        return res.status(409).json({ error: "This username is already taken." });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const finalRole = ALLOWED_ROLES.includes(role) ? role : "staff";

    const newUser = {
      userId: uuidv4(),
      email: email.toLowerCase(),
      hashedPassword, name,
      role: finalRole,
      username: username ? username.toLowerCase() : null,
      branchId: branchId || null,
      branchName: branchName || null,
      createdAt: new Date().toISOString(),
    };

    await ddbDocClient.send(new PutCommand({ TableName: TABLES.USERS, Item: newUser }));
    res.status(201).json({
      message: "Account created.",
      user: {
        userId: newUser.userId, email: newUser.email, name: newUser.name,
        role: newUser.role, username: newUser.username,
        branchId: newUser.branchId, branchName: newUser.branchName,
      },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Something went wrong while creating the account." });
  }
});

// GET /auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await ddbDocClient.send(
      new GetCommand({ TableName: TABLES.USERS, Key: { userId: req.user.userId } })
    );
    if (!result.Item) return res.status(404).json({ error: "User not found." });
    const { hashedPassword, resetToken, resetTokenExpiry, ...safeUser } = result.Item;
    res.json(safeUser);
  } catch (err) {
    res.status(500).json({ error: "Could not fetch user details." });
  }
});

// GET /auth/users — admin only
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await ddbDocClient.send(new ScanCommand({ TableName: TABLES.USERS }));
    const users = (result.Items || []).map(({ hashedPassword, resetToken, resetTokenExpiry, ...safe }) => safe);
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Could not load user accounts." });
  }
});

// PATCH /auth/users/:id — admin updates role, branch, username
router.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const { role, branchId, branchName, username } = req.body;
    const updates = [];
    const values = {};
    const names = {};

    if (role && ALLOWED_ROLES.includes(role)) {
      updates.push("#role = :role"); values[":role"] = role; names["#role"] = "role";
    }
    if (branchId !== undefined) { updates.push("branchId = :bid"); values[":bid"] = branchId; }
    if (branchName !== undefined) { updates.push("branchName = :bname"); values[":bname"] = branchName; }
    if (username !== undefined) { updates.push("username = :un"); values[":un"] = username ? username.toLowerCase() : null; }

    if (updates.length === 0) return res.status(400).json({ error: "Nothing to update." });

    const result = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { userId: req.params.id },
      UpdateExpression: "SET " + updates.join(", "),
      ExpressionAttributeValues: values,
      ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
      ReturnValues: "ALL_NEW",
    }));
    const { hashedPassword, ...safe } = result.Attributes;
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: "Could not update user." });
  }
});

// DELETE /auth/users/:id
router.delete("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.user.userId)
      return res.status(400).json({ error: "You can't delete your own account." });
    await ddbDocClient.send(new DeleteCommand({ TableName: TABLES.USERS, Key: { userId: req.params.id } }));
    res.json({ message: "User removed." });
  } catch (err) {
    res.status(500).json({ error: "Could not remove user." });
  }
});

// PATCH /auth/profile
router.patch("/profile", requireAuth, async (req, res) => {
  try {
    const { name, currentPassword, newPassword } = req.body;
    const userResult = await ddbDocClient.send(
      new GetCommand({ TableName: TABLES.USERS, Key: { userId: req.user.userId } })
    );
    const user = userResult.Item;
    if (!user) return res.status(404).json({ error: "User not found." });

    const updates = [];
    const values = {};
    const names = {};

    if (name) { updates.push("#name = :name"); values[":name"] = name; names["#name"] = "name"; }
    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: "Current password is required." });
      const matches = await bcrypt.compare(currentPassword, user.hashedPassword);
      if (!matches) return res.status(401).json({ error: "Current password is incorrect." });
      const hashed = await bcrypt.hash(newPassword, 10);
      updates.push("hashedPassword = :hp");
      values[":hp"] = hashed;
    }
    if (updates.length === 0) return res.status(400).json({ error: "Nothing to update." });

    const result = await ddbDocClient.send(new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { userId: req.user.userId },
      UpdateExpression: "SET " + updates.join(", "),
      ExpressionAttributeValues: values,
      ...(Object.keys(names).length > 0 && { ExpressionAttributeNames: names }),
      ReturnValues: "ALL_NEW",
    }));
    const { hashedPassword: _, resetToken: __, resetTokenExpiry: ___, ...safe } = result.Attributes;
    res.json({ message: "Profile updated.", user: safe });
  } catch (err) {
    res.status(500).json({ error: "Could not update profile." });
  }
});

// PATCH /auth/profile/picture
router.patch("/profile/picture", requireAuth, async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar) return res.status(400).json({ error: "No image data provided." });
    if (avatar.length > 200000) return res.status(400).json({ error: "Image too large." });
    await ddbDocClient.send(new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { userId: req.user.userId },
      UpdateExpression: "SET avatar = :a",
      ExpressionAttributeValues: { ":a": avatar },
    }));
    res.json({ message: "Profile picture updated.", avatar });
  } catch (err) {
    res.status(500).json({ error: "Could not update profile picture." });
  }
});

// POST /auth/forgot-password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required." });
    const user = await findUserByEmail(email);
    if (!user) return res.json({ message: "If that email exists, a reset link has been sent." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await ddbDocClient.send(new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { userId: user.userId },
      UpdateExpression: "SET resetToken = :t, resetTokenExpiry = :e",
      ExpressionAttributeValues: { ":t": resetToken, ":e": resetTokenExpiry },
    }));

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&id=${user.userId}`;
    if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      await sendPasswordResetEmail(user.email, resetLink, user.name);
    } else {
      console.log("RESET LINK (dev):", resetLink);
    }
    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong." });
  }
});

// POST /auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { userId, token, newPassword } = req.body;
    if (!userId || !token || !newPassword) return res.status(400).json({ error: "All fields are required." });

    const result = await ddbDocClient.send(new GetCommand({ TableName: TABLES.USERS, Key: { userId } }));
    const user = result.Item;
    if (!user || user.resetToken !== token) return res.status(400).json({ error: "Invalid or expired reset link." });
    if (new Date(user.resetTokenExpiry) < new Date()) return res.status(400).json({ error: "Reset link has expired." });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await ddbDocClient.send(new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { userId },
      UpdateExpression: "SET hashedPassword = :hp REMOVE resetToken, resetTokenExpiry",
      ExpressionAttributeValues: { ":hp": hashedPassword },
    }));
    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ error: "Something went wrong." });
  }
});

module.exports = router;
