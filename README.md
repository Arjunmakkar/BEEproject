# FinPulse — Personal Finance & Budget Tracker

FinPulse is a full-stack personal finance dashboard for tracking income and
expenses, understanding spending patterns, and managing monthly budgets. It
provides a dark-themed React interface with financial summaries, charts,
transaction management, category budgets, recurring transactions, and CSV
export.

## Features

- Dashboard metrics for lifetime balance, monthly income, monthly expenses,
  net savings, and savings rate
- Month-over-month income and expense charts
- Category-based expense breakdown with a donut chart
- Add and delete income or expense transactions
- Search, filter, and paginate transactions by type and category
- Category budgets with spending progress, remaining amounts, and exceeded or
  warning status
- Update budget limits for expense categories
- Mark transactions as recurring and process scheduled recurring entries
- Export transactions as CSV
- MongoDB persistence with a local JSON/in-memory fallback when MongoDB is
  unavailable

## Technology

- **Frontend:** React 19, Vite, Recharts, and Lucide React
- **Backend:** Node.js and Express
- **Database:** MongoDB with Mongoose
- **Fallback storage:** JSON seed files loaded into memory

## Project Structure

```text
client/                 React/Vite frontend
  src/App.jsx           Dashboard UI and API integration
  src/index.css         Application styling
server/                 Express backend
  index.js              API routes and storage initialization
  models/               Mongoose schemas
  data/                 Default categories and transactions
```

## Quick Start

### Prerequisites

- Node.js 18 or newer
- npm
- MongoDB running locally at `mongodb://127.0.0.1:27017`, or a MongoDB
  connection string supplied through `MONGODB_URI`

### Start the backend

```bash
cd server
npm install
npm start
```

The API runs at `http://localhost:5000`. When MongoDB is available, the
backend seeds the database with the JSON data if the collections are empty.

### Start the frontend

In a second terminal:

```bash
cd client
npm install
npm run dev
```

The Vite development server runs at `http://localhost:3000` and proxies `/api`
requests to the backend.

### Run without MongoDB

The backend automatically falls back to local in-memory JSON mode if MongoDB
cannot be reached. To explicitly skip the MongoDB connection attempt:

```bash
cd server
SKIP_MONGODB=true npm start
```

On Windows PowerShell, use:

```powershell
$env:SKIP_MONGODB="true"; npm start
```

Changes made in fallback mode are held in memory and are lost when the server
stops.

## Backend API

The Express server exposes these main endpoints:

- `GET /api/categories` — list categories
- `PUT /api/categories/:id` — update category details or budget limit
- `GET /api/budgets?month=YYYY-MM` — calculate budget usage
- `PUT /api/budgets/:categoryId` — update an expense-category budget
- `GET /api/transactions` — list, filter, search, and paginate transactions
- `POST /api/transactions` — create a transaction
- `DELETE /api/transactions/:id` — delete a transaction
- `GET /api/reports/summary?month=YYYY-MM` — calculate monthly and lifetime
  financial metrics
- `GET /api/reports/by-category?month=YYYY-MM` — summarize expenses by category
- `GET /api/reports/monthly-trend?year=YYYY` — return monthly cash-flow data
- `GET /api/reports/export` — download transactions as CSV
- `POST /api/recurring/process` — create due recurring transactions

## MongoDB Implementation

- `server/models/Category.js` defines categories and monthly budget limits.
- `server/models/Transaction.js` defines income and expense records.
- Transactions use the compound index
  `{ date: -1, type: 1, categoryId: 1 }` for chronological and category
  queries.
- Aggregation pipelines calculate category totals, monthly trends, budget
  spending, and report summaries.
- `$facet` retrieves paginated transaction items and the total count in one
  database request.

## Seed Data

Default data is stored in:

- `server/data/categories.json` — income and expense categories with budget
  limits
- `server/data/transactions.json` — example income, expenses, and recurring
  transactions
