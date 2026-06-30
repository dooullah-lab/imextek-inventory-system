// utils/createFirstAdmin.js
// Run this ONCE after your DynamoDB tables exist, to create your first login.
// Usage: node utils/createFirstAdmin.js

require("dotenv").config();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { ddbDocClient, TABLES } = require("../config/dynamoClient");

async function createFirstAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || "Admin";

  if (!email || !password) {
    console.log("Usage: node utils/createFirstAdmin.js <email> <password> <name>");
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const admin = {
    userId: uuidv4(),
    email: email.toLowerCase(),
    hashedPassword,
    name,
    role: "admin",
    createdAt: new Date().toISOString(),
  };

  await ddbDocClient.send(new PutCommand({ TableName: TABLES.USERS, Item: admin }));
  console.log(`Admin account created for ${email}. You can now log in.`);
}

createFirstAdmin().catch((err) => {
  console.error("Failed to create admin:", err);
  process.exit(1);
});
