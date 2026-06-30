// config/dynamoClient.js
// This file is the single "wire" connecting our backend to AWS DynamoDB.
// Every other file borrows this same wire instead of creating new connections.

const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// DocumentClient lets us work with plain JS objects instead of
// DynamoDB's clunky {"S": "value"} format. Much easier to read/write.
const ddbDocClient = DynamoDBDocumentClient.from(client);

const TABLES = {
  USERS: process.env.USERS_TABLE || "ImExTek_Users",
  PRODUCTS: process.env.PRODUCTS_TABLE || "ImExTek_Products",
  TRANSACTIONS: process.env.TRANSACTIONS_TABLE || "ImExTek_Transactions",
};

module.exports = { ddbDocClient, TABLES };
