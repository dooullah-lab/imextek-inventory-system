# ImEx-Tek Inventory & Sales Analytics System

A full-stack inventory management and sales analytics web application, built for ImEx-Tek Global Ltd. Built like a real business tool: when a sale happens, stock goes down automatically and the sale shows up on the analytics dashboard at the same time — both screens read from the same data, the same way a real point-of-sale system works.

## What it does

- Secure login (JWT + bcrypt) — no one gets in without an account
- Inventory management — add products, track stock, get low-stock warnings
- Sell / Restock actions — one click updates stock AND logs the transaction
- Analytics dashboard — revenue charts, top products, daily breakdown, filterable by today/week/month/year
- Activity log — a running history of every sale and restock, with who did it and when

## Tech stack

**Frontend:** React (Vite) + Tailwind CSS + Recharts + React Router, hosted on Netlify
**Backend:** Node.js + Express, hosted on Render
**Database:** AWS DynamoDB (3 tables: Users, Products, Transactions)
**Auth:** JWT + bcrypt
**Security:** Scoped AWS IAM user with DynamoDB-only permissions (least privilege)

## Why this architecture (cost-conscious choices)

This project deliberately avoids AWS Lambda, API Gateway, CloudFront, and EC2/RDS to keep AWS charges close to zero. Instead:

- The backend runs as a regular Express server on Render's free tier (same pattern as the ImEx-Tek Business Suite)
- The frontend is static-hosted on Netlify's free tier
- The only AWS service in active use is DynamoDB, which has a generous free tier well beyond what a project like this would consume
- IAM is used (it's always free) to make sure the backend's AWS credentials can only touch these 3 tables — nothing else in the AWS account is exposed

## Project structure

```
inventory-system/
├── backend/                 Express API server
│   ├── config/               DynamoDB connection
│   ├── middleware/            JWT auth checks
│   ├── routes/                 auth, products, transactions, analytics
│   ├── utils/                  one-time admin account creator
│   └── server.js
└── frontend/                React app
    ├── src/
    │   ├── api/                 axios client with token handling
    │   ├── context/             auth state
    │   ├── components/          layout, modal, route guard
    │   ├── pages/                Login, Inventory, Analytics, ActivityLog
    │   └── assets/                logo
    └── index.html
```

## Setup instructions

### 1. Create the DynamoDB tables (AWS Console)

Create 3 tables in `eu-north-1` (or your preferred region), all with **On-demand** capacity mode (pay only for what you use):

| Table name | Partition key |
|---|---|
| `ImExTek_Users` | `userId` (String) |
| `ImExTek_Products` | `productId` (String) |
| `ImExTek_Transactions` | `transactionId` (String) |

### 2. Create a scoped IAM user

Create an IAM user with **programmatic access only**, and attach a custom policy that only allows DynamoDB actions on these 3 tables (not "AmazonDynamoDBFullAccess" — scope it down). Save the Access Key ID and Secret Access Key.

### 3. Backend setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your AWS keys, table names, and a random JWT_SECRET in .env
node utils/createFirstAdmin.js you@imextek.com yourpassword "Your Name"
npm start
```

### 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# Set VITE_API_BASE_URL to your backend URL (localhost:5000 for local dev)
npm run dev
```

### 5. Deploy

- Backend → push to GitHub, connect to Render, add the same environment variables from `.env` in Render's dashboard
- Frontend → push to GitHub, connect to Netlify, set `VITE_API_BASE_URL` to your live Render backend URL, build command `npm run build`, publish directory `dist`

## Cost summary

Everything in this stack runs on free tiers (Render, Netlify, DynamoDB free tier) for portfolio-scale usage. The only thing to monitor is DynamoDB if usage ever grows significantly — the Cost Optimization Dashboard project (from your roadmap) pairs naturally with this one for tracking that.
