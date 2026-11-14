# FinPulse — Intelligent Personal Finance & Budget Tracker

A modern personal wealth and expense tracker application powered by **React 18** on the frontend, **Node.js (Express)** on the backend, and **MongoDB** with real-time **Aggregation Pipelines**.

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- Node.js (v18+)
- MongoDB (Running locally on `mongodb://127.0.0.1:27017` or configured via `MONGODB_URI` in `.env`)

### 2. Start Backend API Server
```powershell
cd server
npm start
```
*Backend runs at:* `http://localhost:5000`  
*(Auto-seeds default categories & transactions into MongoDB if the database is empty).*

### 3. Start Frontend Client
In a new terminal window:
```powershell
cd client
npm run dev
```
*Frontend runs at:* `http://localhost:3000` (proxies `/api` to backend)

---

## 🍃 MongoDB Features Implemented

1. **Mongoose Schemas & Models**:
   - `models/Category.js`: Category definitions and monthly budget limits.
   - `models/Transaction.js`: Transaction records with compound indexing.
2. **Compound Index**:
   - `{ date: -1, type: 1, categoryId: 1 }` for high-speed chronological range and category filtering.
3. **MongoDB Aggregation Pipelines**:
   - `$match` + `$group` + `$sum`: Real-time category expense summarization.
   - `$substr` + `$group`: Month-over-month trend analytics.
   - `$facet`: Single-roundtrip execution of paginated items (`$skip`, `$limit`) and total record counting (`$count`).
