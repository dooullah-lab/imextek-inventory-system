// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const transactionRoutes = require("./routes/transactions");
const analyticsRoutes = require("./routes/analytics");
const categoryRoutes = require("./routes/categories");
const expenseRoutes = require("./routes/expenses");

const app = express();

app.use(cors()); // allows the Netlify frontend to talk to this backend
app.use(express.json());

// Health check - visit this URL to confirm the server is alive
app.get("/", (req, res) => {
  res.json({ status: "ImEx-Tek Inventory API is running." });
});

app.use("/auth", authRoutes);
app.use("/products", productRoutes);
app.use("/transactions", transactionRoutes);
app.use("/analytics", analyticsRoutes);
app.use("/categories", categoryRoutes);
app.use("/expenses", expenseRoutes);

// Catch-all for unknown routes
app.use((req, res) => {
  res.status(404).json({ error: "Route not found." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`ImEx-Tek Inventory API running on port ${PORT}`);
});
