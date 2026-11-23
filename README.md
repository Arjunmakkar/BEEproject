# FinPulse — Personal Finance Tracker & Wealth Operating System

[![React 19](https://img.shields.io/badge/React-19.0-61dafb?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.3-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas%20Ready-47a248?logo=mongodb&logoColor=white)](https://www.mongodb.com/cloud/atlas)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

FinPulse is an institutional-grade, human-crafted personal wealth, budgeting, and financial ledger system. Built with an **Express + React 19** stack and a **dual-mode MongoDB Atlas & in-memory JSON engine**, FinPulse departs from generic AI templates with a grounded, dual-tier personal finance tracker layout, purposeful typography, and realistic fintech workflows.

---

## ⚡ Instant Quick Start

### 1-Click Launch (Windows)
Double-click `start-finpulse.bat` in the root folder. Both the backend (Port 5000) and frontend (Port 3000) will start automatically in separate terminal sessions.

### Manual Terminal Setup

```powershell
# 1. Clone repository
git clone https://github.com/Arjunmakkar/BEEproject.git
cd BEEproject

# 2. Start Backend Server (Terminal 1)
cd server
npm install
npm start
# -> Backend active on http://localhost:5000

# 3. Start Frontend Client (Terminal 2)
cd ../client
npm install
npm run dev
# -> Frontend active on http://localhost:3000
```

### 🔑 Instant Demo Account
No MongoDB or database configuration required to get started immediately:
* **Email:** `demo@finpulse.app`
* **Password:** `password123`
* *(Or click the **Explore Demo Ledger** action on the sign-in screen)*.

---

## 🎨 Human-Made SaaS Design System

FinPulse replaces standard AI visual tropes (neon glows, generic blue pills, centered card soup) with a structured, authentic personal finance tracker layout:

1. **Dual-Tier Navigation Shell**:
   * **Tier 1 (Top Utility Bar - Pure White `#ffffff`):**
     * Brand logo glyph and `"Personal Finance Tracker"` application header.
     * Viewport Switcher (Desktop, Tablet, Mobile) for responsive previewing.
     * Integrated Month Picker (`YYYY-MM`) and Account Currency Switcher (`$ USD`, `₹ INR`, `€ EUR`, `£ GBP`).
     * Quick links: Subscription badge, Application editor, Help documentation, Notification center, and User Profile with instant Sign Out.
   * **Tier 2 (Sub-Navigation Bar - Dark Charcoal `#2b303c`):**
     * Horizontal dark navigation tab strip: `Transactions`, `Accounts`, `Incomes`, `Expenses`, `Amount Transfers`, `Reminders`.
     * Active tab contrast indicator (clean white active tab with dark text and blue highlight underline).
     * Quick-action toolbar: Muted slate-blue **`PDF`** button and dark-slate **`+ Record`** button.

2. **The 4 Hero KPI Cards**:
   * **Current Balance:** Green circular badge with `$` &rarr; bold green amount (`$ 108,000.00`).
   * **Liabilities:** Coral-red circular badge with card icon &rarr; bold red amount (`$ 4,000.00`).
   * **This Month's Income:** Royal-blue circular badge with money bag &rarr; bold blue amount (`$ 49,000.00`).
   * **This Month's Expense:** Warm-orange circular badge with pie chart &rarr; bold orange amount (`$ 21,000.00`).

3. **Two-Column Dashboard Grid (68% Left / 32% Right)**:
   * **Left Column (Primary Analytics):**
     * **Balance And Liabilities Card:** Multi-account comparison bar chart (Bank Account, My Wallet, PayPal) using custom coral (`#d9534f`) and gold (`#d4a359`) series.
     * **Income Flow Card:** Cash flow trajectory with a `"Regenerate"` utility action to process recurring commitments.
     * **Expense Distribution:** Donut visualization with category breakdown and progress meters.
   * **Right Column (Sidebar KPIs & Activity Feed):**
     * **Active Accounts:** Black circular checkmark badge with count (`3`).
     * **Archive Accounts / Subscriptions:** Gray circular refresh badge with count (`1`).
     * **Recent Incomes Feed:** Clean ledger rows with vertical blue indicator bars, formatted amounts, dates, and account paths (`My Wallet > Dividend Income`).

4. **Tasteful, Purposeful Buttons**:
   * **PDF Export Button:** Slate-blue (`#527699` / `#436280`) with soft rectangular corners (`border-radius: 4px`).
   * **Primary Actions:** Solid dark slate (`#2b303c`) with crisp hover transitions.
   * **Secondary Actions:** Pure white with subtle hairline dividers (`#cbd5e1`).
   * **Regenerate Button:** Clean outline control matching institutional software standards.

---

## 🏛️ Core Features & Capabilities

### 1. 🔐 Personal Authentication & Multi-Tenant Isolation
* **Dedicated Auth Screen:** Clean, edge-aligned portal supporting both **Sign In** and **Create Account**.
* **1-Click Demo Ledger:** Instant preview access pre-loaded with realistic accounts, transactions, goals, and recurring bills.
* **Tenant Isolation:** Every user's ledger, categories, vaults, and subscriptions are scoped strictly by `userId`.
* **Security & Tokens:** Stateless JSON Web Token (`jsonwebtoken`) authentication with passwords hashed using `bcryptjs`.
* **Quick Access Routes:** Direct `?login` / `?logout` parameter routing to easily inspect or switch accounts.

### 2. 🧾 Transaction Ledger & Digital Receipts
* **Universal Search & Filtering:** Filter by keyword, category, transaction type (`income` / `expense`), and date range.
* **Receipt & Invoice Attachments:** Upload image/PDF receipts directly to transactions with preview and download modal.
* **Inline Ledger Actions:** Rapid recording, editing, and deletion with instant balance recalculation.

### 3. 🎯 Savings Vaults ("Piggy Banks")
* **Milestone Vaults:** Dedicated savings targets for *Emergency Reserve*, *Travel Fund*, *Tech Equipment*, or *Investments*.
* **Pace & Target Deadlines:** Real-time calculation of remaining balance, days left, and required monthly contribution rate.
* **Deposit & Withdraw Modals:** Full contribution history with audit timestamps.

### 4. 📅 Recurring Bill & Subscription Calendar
* **31-Day Interactive Grid:** Visual monthly calendar marking due dates for utilities, rent, streaming, and subscriptions.
* **Burden Metric:** Real-time aggregation of total monthly committed overhead.
* **1-Click "Mark as Paid":** Automatically logs recurring expenses into the ledger upon confirmation.

### 5. 🔮 Compound Interest & Wealth Simulator
* **Configurable Variables:** Starting principal, monthly contribution (SIP), annual return rate, and investment horizon (1 to 30 years).
* **Benchmark Presets:** 1-click presets for *Fixed Deposit (7%)*, *Index Funds (12%)*, and *Midcap Growth (15%)*.
* **Inflation Adjustment Toggle:** Optional 6% inflation drag calculation to forecast true purchasing power.
* **Trajectory Chart:** Visual area chart contrasting invested principal against compounding gains.

### 6. 📄 Statements, CSV Import & Export
* **Bank-Grade Statement (PDF):** Clean `@media print` layout engineered for 1-click "Save as PDF" directly from the browser.
* **CSV Import Engine:** Upload bank and UPI CSV statements with automated column parsing and batch entry.
* **CSV Export:** Download your complete ledger formatted for spreadsheet analysis.

---

## 🍃 Database Engine: Online MongoDB Atlas & Local Fallback

FinPulse is architected for zero-friction setup with automated dual-mode persistence:

1. **Online MongoDB Atlas (`SKIP_MONGODB=false`)**:
   * Connects to any cloud MongoDB Atlas cluster (M0 Free or dedicated).
   * 10-second server selection timeout with automatic TLS handshake handling.
   * Auto-seeds initial accounts and demo datasets on first connection if empty.
   * Safe credential masking in logs (`mongodb+srv://user:****@cluster...`).

2. **Local In-Memory Engine (`SKIP_MONGODB=true`)**:
   * Operates completely standalone with zero database installation required.
   * Runs directly from memory with seed data, ideal for offline development and testing.

### Configuring MongoDB Atlas

In your `server/.env` file:
```env
PORT=5000
SKIP_MONGODB=false
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/finpulse?retryWrites=true&w=majority
JWT_SECRET=finpulse_jwt_secret_dev_key_89234823489
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 19, Vite 8.3 |
| **Icons & Visuals** | Lucide React, Recharts (Area, Bar, Donut) |
| **Styling** | Custom CSS3 Design System, Tabular Numerals, Print Styles |
| **Backend API** | Node.js, Express, CORS |
| **Authentication** | JWT (`jsonwebtoken`), `bcryptjs` |
| **Database** | MongoDB Atlas, Mongoose 9.11, In-Memory JSON Engine |

---

## 🌐 API Endpoints Reference

### Authentication (`/api/auth`)
* `POST /api/auth/register` — Register a new account with initialized budget categories.
* `POST /api/auth/login` — Authenticate and receive a JWT access token.
* `GET /api/auth/me` — Get current user profile (`requireAuth`).
* `PUT /api/auth/profile` — Update user details or currency setting (`requireAuth`).

### Transactions & Budgets
* `GET /api/transactions` — Fetch filtered transactions (`type`, `categoryId`, `search`, `page`).
* `POST /api/transactions` — Record a new transaction (supports receipt URL/base64).
* `PUT /api/transactions/:id` — Update an existing transaction.
* `DELETE /api/transactions/:id` — Delete a transaction entry.
* `GET /api/categories` — Fetch all categories with real-time budget spending.
* `PUT /api/budgets` — Update category budget limits.

### Goals & Recurring Subscriptions
* `GET /api/goals` — List all savings vaults.
* `POST /api/goals` — Create a new savings vault.
* `POST /api/goals/:id/contribute` — Deposit or withdraw funds from a vault.
* `GET /api/subscriptions` — Fetch active recurring bills and billing schedules.
* `POST /api/subscriptions/:id/pay` — Mark subscription as paid and log transaction.

### Reports & Export
* `GET /api/reports/dashboard` — Aggregated net worth, cash flow trends, and category distribution.
* `GET /api/reports/statement` — Formatted monthly statement summary for PDF generation.

---

## 📂 Project Directory Structure

```
BEEproject/
├── client/                     # Frontend Application (React 19 + Vite)
│   ├── src/
│   │   ├── App.jsx             # Main Application, Views & State Management
│   │   ├── index.css           # Personal Finance Tracker Design System
│   │   └── main.jsx            # React Entrypoint
│   ├── index.html              # HTML Shell
│   ├── package.json            # Frontend Dependencies
│   └── vite.config.ts          # Vite Configuration & Backend Proxy
│
├── server/                     # Backend API (Node.js + Express)
│   ├── data/                   # Default In-Memory Seed Datasets
│   │   ├── categories.json     # Budget Categories
│   │   ├── goals.json          # Savings Vaults
│   │   ├── subscriptions.json  # Recurring Bills
│   │   └── transactions.json   # Seed Ledger Records
│   ├── models/                 # Mongoose Schemas
│   │   ├── Category.js         # Category Schema
│   │   ├── Goal.js             # Savings Vault Schema
│   │   ├── Subscription.js     # Recurring Bill Schema
│   │   ├── Transaction.js      # Ledger Transaction Schema
│   │   └── User.js             # User & Auth Schema
│   ├── .env.example            # Environment Configuration Template
│   ├── index.js                # Express API & MongoDB Atlas Engine
│   └── package.json            # Backend Dependencies
│
├── .gitignore                  # Git Ignore Rules
├── README.md                   # Comprehensive Documentation
└── start-finpulse.bat          # 1-Click Windows Launcher Script
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
