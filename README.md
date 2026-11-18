# FinPulse — Intelligent Personal Finance & Wealth Operating System

FinPulse is an enterprise-grade, human-crafted personal wealth, budgeting, and financial management application built with **React 19**, **Vite**, **Express**, and a dual-mode **MongoDB Aggregation & In-Memory JSON Engine**.

---

## ✨ Features Implemented

### 1. 📊 Executive Financial Dashboard
- **Key Metrics**: Lifetime Net Worth, Monthly Inflows, Monthly Outflows, and Net Savings Rate with dynamic threshold badges.
- **Cash Flow Analytics**: Interactive Month-over-Month Cash Flow chart powered by Recharts.
- **Category Expense Distribution**: Donut breakdown with real-time percentage shares.

### 2. 🧾 Ledger & Receipt / Invoice Attachment
- Searchable and filterable ledger (by category, type, date, or keywords).
- **Receipt & Invoice Upload**: Attach bill/receipt images or PDFs directly to any transaction.
- **Receipt Inspector Modal**: Preview and download receipts from within the ledger.

### 3. 🎯 Financial Goals & Savings Vaults ("Piggy Banks")
- Create targeted savings vaults (*Emergency Fund*, *New Tech Setup*, *Travel*, *Health*).
- Track funding percentage, target date, days remaining, and required monthly pace.
- Interactive **Deposit** and **Withdraw** modal with full contribution history.

### 4. 📅 Recurring Bill & Subscription Calendar
- 31-Day visual billing calendar highlighting upcoming due dates for active subscriptions (Rent, Fiber, Gym, Streaming, Cloud tools).
- Monthly subscription burden calculation.
- **1-Click "Mark as Paid"**: Automatically logs the expense entry directly into your ledger.

### 5. 🔮 Net Worth Growth & Compound Interest Simulator
- Sliders for Initial Principal, Monthly SIP, Expected Annual Return (presets for FD 7%, Nifty 12%, Midcap 15%), and Time Horizon (up to 30 years).
- **Inflation Adjustment**: Calculates real purchasing power using 6% inflation drag.
- Compounding trajectory area chart and year-by-year schedule breakdown.

### 6. 📄 Official Monthly Statement (PDF) & Bank Statement CSV Engine
- **Printable Account Statement**: Generates a clean, bank-grade monthly statement with `@media print` styling for 1-click "Save as PDF".
- **Bank Statement CSV Import**: Drag-and-drop your bank/UPI CSV statement to parse and bulk-import into the ledger.
- **Filtered CSV Export**: Export your entire transaction history.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, Vite, Recharts, Lucide React
- **Backend:** Node.js, Express
- **Database:** MongoDB with Mongoose (with automated local fallback mode)
- **Styling:** Custom modern tactile design system

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- (Optional) MongoDB running locally on `mongodb://127.0.0.1:27017` *(Runs seamlessly in local offline mode if MongoDB is not connected)*.

### 2. Start Both Servers
On Windows, double-click:
```powershell
start-finpulse.bat
```

Or manually:
```powershell
# Terminal 1: Backend
cd server
npm install
npm start

# Terminal 2: Frontend
cd client
npm install
npm run dev
```

* **Frontend UI:** `http://localhost:3000`
* **Backend API:** `http://localhost:5000`

---

## 🍃 MongoDB Features & Architecture

1. **Mongoose Schemas & Models**:
   - `server/models/Category.js`: Category definitions and monthly budget limits.
   - `server/models/Transaction.js`: Transaction records with compound indexing.
   - `server/models/Goal.js`: Targeted savings vaults with deposit/withdraw ledger.
   - `server/models/Subscription.js`: Recurring billing calendar tracking.
2. **Compound Indexing**:
   - `{ date: -1, type: 1, categoryId: 1 }` for high-speed chronological range and category filtering.
3. **MongoDB Aggregation Pipelines**:
   - `$match` + `$group` + `$sum`: Real-time category expense summarization.
   - `$substr` + `$group`: Month-over-month trend analytics.
   - `$facet`: Single-roundtrip execution of paginated items (`$skip`, `$limit`) and total record counting (`$count`).
