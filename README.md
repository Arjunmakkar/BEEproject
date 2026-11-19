# FinPulse — Intelligent Personal Finance & Wealth Operating System

[![React 19](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/Database-MongoDB%20Dual--Mode-47a248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

FinPulse is an enterprise-grade, human-crafted personal wealth, budgeting, and financial management application. Designed from first principles to eliminate AI-generated visual cliches, FinPulse features a modern, tactile design system paired with a high-performance **Express + React 19** stack and a **dual-mode MongoDB aggregation & in-memory JSON engine**.

---

## ⚡ Instant Quick Start (Windows & Cross-Platform)

### Option 1: 1-Click Launch (Windows)
Double-click `start-finpulse.bat` in the root folder. Both backend (Port 5000) and frontend (Port 3000) will start in separate terminal windows.

### Option 2: Manual Terminal Setup

```powershell
# 1. Clone repository
git clone https://github.com/Arjunmakkar/BEEproject.git
cd BEEproject

# 2. Start Backend (Terminal 1)
cd server
npm install
npm start
# -> Backend active on http://localhost:5000

# 3. Start Frontend (Terminal 2)
cd ../client
npm install
npm run dev
# -> Frontend active on http://localhost:3000
```

### 🔑 Instant Demo Account
No MongoDB or database configuration required to get started! FinPulse operates in dual mode with instant zero-friction evaluation:
* **Email:** `demo@finpulse.app`
* **Password:** `password123`
* *(Or click the **1-Click Demo Login** pill on the sign-in screen)*.

---

## ✨ Features & Architecture Breakdown

### 1. 🔐 Personal Authentication & Multi-Tenant Ledger Isolation
* **Dedicated Authentication Portal**: Polished Sign In and Account Registration flows with client & server-side validation.
* **1-Click Demo Account**: Instant zero-friction demo access loaded with realistic data, receipts, goals, and recurring bills.
* **Strict Multi-Tenant Scoping**: All transactions, categories, budgets, vaults, and subscriptions are indexed and scoped by `userId`. Every new registrant begins with an isolated, personal ledger.
* **Password Security & JWT**: Secure cryptographic password hashing via `bcryptjs` and stateless session verification using `jsonwebtoken` (`Authorization: Bearer <token>`).
* **Profile Management & Currency Picker**: User initials avatar menu allowing one-click switching between **₹ INR**, **$ USD**, **€ EUR**, and **£ GBP**. All dashboards, charts, interest simulators, and export files recalculate instantaneously.

---

### 2. 📊 Executive Financial Dashboard
* **Real-Time KPIs**: Lifetime Net Worth, Monthly Inflows, Monthly Outflows, and Net Savings Rate with dynamic threshold color coding.
* **Cash Flow Analytics**: Interactive Month-over-Month Cash Flow trajectory chart powered by Recharts.
* **Expense Distribution Breakdown**: Donut visualization showing spending share across active budget categories.
* **Recent Activity Feed**: Chronological list of latest transactions with category badges and receipt indicators.

---

### 3. 🧾 Ledger & Receipt / Invoice Attachment Engine
* **Universal Search & Filtering**: Instant search across keywords, category IDs, transaction types (`income` / `expense`), and date ranges.
* **Receipt & Invoice Upload**: Attach digital receipts, bills, and invoices directly to any ledger entry (supports image and PDF previews).
* **Receipt Inspector Modal**: High-resolution receipt viewer with zoom and direct download capabilities.
* **Inline Transaction Management**: Quick add, edit, and deletion with instant balance recalculation.

---

### 4. 🎯 Financial Goals & Savings Vaults ("Piggy Banks")
* **Targeted Goal Creation**: Set up dedicated vaults for *Emergency Funds*, *Travel*, *Tech Upgrades*, or *Real Estate*.
* **Progress Tracking**: Real-time pace tracking, target deadlines, days remaining, and required monthly contributions.
* **Interactive Vault Modals**: One-click **Deposit** and **Withdraw** functions complete with chronological contribution logs.

---

### 5. 📅 Recurring Bill & Subscription Calendar
* **31-Day Visual Grid**: Clean monthly calendar grid marking upcoming billing dates for utilities, streaming, gym, rent, and SaaS.
* **Subscription Burden Metric**: Calculates total monthly fixed overhead committed to subscriptions.
* **1-Click "Mark as Paid"**: Instantly records the recurring charge into the transaction ledger and logs payment confirmation.

---

### 6. 🔮 Net Worth Growth & Compound Interest Simulator
* **Interactive Parameter Controls**: Principal investment, Monthly SIP additions, Expected annual rate of return, and Investment horizon (1 to 30 years).
* **Market Presets**: 1-click benchmarks for *Fixed Deposit (7%)*, *Nifty / Index Fund (12%)*, and *Midcap Growth (15%)*.
* **Inflation Adjustment**: Optional 6% inflation drag toggle to evaluate real future purchasing power.
* **Trajectory Chart & Milestone Roadmap**: Visual area chart mapping total invested capital vs. compound interest earnings, plus year-by-year schedule breakdown.

---

### 7. 📄 Bank-Grade Statement (PDF) & CSV Engine
* **Official Printable Statement (PDF)**: Generates an executive monthly financial statement with dedicated `@media print` styling for 1-click "Save as PDF" directly from the browser.
* **Bank Statement CSV Import**: Drag-and-drop bank and UPI CSV statements to auto-parse and batch import entries.
* **Filtered CSV Export**: Export your complete transactional history formatted for Excel or Google Sheets.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 19, Vite, Recharts, Lucide Icons, Modern CSS3 Design System |
| **Backend API** | Node.js, Express, CORS, Multer |
| **Authentication** | JWT (`jsonwebtoken`), Password Hashing (`bcryptjs`) |
| **Database & Engine** | Dual Mode: MongoDB + Mongoose **OR** High-Speed In-Memory JSON Engine |
| **Tooling & Deploy** | npm, Windows batch launcher, ESLint, Git |

---

## 🍃 Database Engine & Dual-Mode Architecture

FinPulse includes an automated fallback mechanism:
1. **MongoDB Mode (`SKIP_MONGODB=false`)**: Connects to MongoDB, utilizes compound indexing, and runs native aggregation pipelines.
2. **Local Engine Mode (`SKIP_MONGODB=true`)**: Runs completely in memory with zero database dependencies. Seeds default demo data and saves new changes during the session.

### Mongoose Schemas & Data Models (`server/models/`)
* **`User.js`**: `name`, `email`, `passwordHash`, `currency`, `createdAt`.
* **`Category.js`**: `name`, `type`, `color`, `icon`, `monthlyBudget`, `userId`.
* **`Transaction.js`**: `title`, `amount`, `type`, `categoryId`, `date`, `receiptUrl`, `userId`.
* **`Goal.js`**: `title`, `targetAmount`, `currentAmount`, `deadline`, `color`, `contributions[]`, `userId`.
* **`Subscription.js`**: `name`, `amount`, `billingCycle`, `billingDay`, `category`, `isActive`, `userId`.

### High-Speed Indexing & Aggregations
* **Compound Indexing**: `{ userId: 1, date: -1, type: 1 }` for high-throughput user-isolated chronological queries.
* **Aggregation Pipelines**:
  * `$match` + `$group` + `$sum`: Real-time category spending sums against budget thresholds.
  * `$substr` + `$group`: Multi-month cash inflow/outflow trend analysis.
  * `$facet`: Paginated retrieval and total record count in a single database roundtrip.

---

## 🌐 REST API Specification

### Authentication (`/api/auth`)
* `POST /api/auth/register` — Create new user account with seeded default budget categories.
* `POST /api/auth/login` — Authenticate user and issue JWT token.
* `GET /api/auth/me` — Retrieve current authenticated user profile (`requireAuth`).
* `PUT /api/auth/profile` — Update user profile and currency preference (`requireAuth`).

### Transactions & Categories
* `GET /api/transactions` — Fetch filtered transactions (query: `type`, `categoryId`, `search`, `page`).
* `POST /api/transactions` — Create a new transaction entry.
* `PUT /api/transactions/:id` — Update transaction details or receipt attachment.
* `DELETE /api/transactions/:id` — Remove transaction and update balances.
* `GET /api/categories` — Fetch all categories with real-time budget spending.
* `PUT /api/budgets` — Update monthly budget limit for a category.

### Goals & Subscriptions
* `GET /api/goals` — List all savings vaults.
* `POST /api/goals` — Create a new savings vault.
* `POST /api/goals/:id/contribute` — Deposit or withdraw funds from a vault.
* `GET /api/subscriptions` — Fetch active recurring bills and calendar schedules.
* `POST /api/subscriptions/:id/pay` — Mark subscription as paid and log transaction.

### Analytics & Reports
* `GET /api/reports/dashboard` — Aggregated net worth, cash flow trends, and category distribution.
* `GET /api/reports/statement` — Formatted monthly statement summary for PDF generation.

---

## 📂 Project Directory Structure

```
BEEproject/
├── client/                     # Frontend Application (React 19 + Vite)
│   ├── src/
│   │   ├── App.jsx             # Main Application & View Router
│   │   ├── index.css           # Tactile Design System & Print Styles
│   │   └── main.jsx            # React Root Entrypoint
│   ├── index.html              # HTML5 Shell
│   ├── package.json            # Frontend Dependencies & Scripts
│   └── vite.config.js          # Vite Configuration
│
├── server/                     # Backend API (Node.js + Express)
│   ├── data/                   # Fallback In-Memory Seed Data
│   │   ├── categories.json     # Default Budget Categories
│   │   ├── goals.json          # Seed Savings Vaults
│   │   ├── subscriptions.json  # Seed Subscriptions
│   │   └── transactions.json   # Seed Ledger Records
│   ├── models/                 # Mongoose Data Schemas
│   │   ├── Category.js         # Category Schema
│   │   ├── Goal.js             # Savings Vault Schema
│   │   ├── Subscription.js     # Subscription Schema
│   │   ├── Transaction.js      # Ledger Transaction Schema
│   │   └── User.js             # User & Auth Schema
│   ├── .env.example            # Environment Variable Template
│   ├── index.js                # Express Server, Routes, & Local Engine
│   └── package.json            # Server Dependencies & Scripts
│
├── .gitignore                  # Git Ignore Configuration
├── README.md                   # Comprehensive Project Documentation
└── start-finpulse.bat          # 1-Click Windows Launcher Script
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
