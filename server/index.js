import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { Category } from './models/Category.js';
import { Transaction } from './models/Transaction.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finpulse';

app.use(cors());
app.use(express.json());

// In-memory fallback state for standalone offline operation
let isMongoConnected = false;
let memCategories = [];
let memTransactions = [];

async function loadLocalData() {
  try {
    const rawCategories = await fs.readFile(path.join(__dirname, 'data', 'categories.json'), 'utf-8');
    memCategories = JSON.parse(rawCategories);
    const rawTransactions = await fs.readFile(path.join(__dirname, 'data', 'transactions.json'), 'utf-8');
    memTransactions = JSON.parse(rawTransactions);
    console.log(`[Local Mode] Loaded ${memCategories.length} categories and ${memTransactions.length} transactions from JSON.`);
  } catch (err) {
    console.error('Failed to load local fallback data:', err.message);
  }
}

// Connect to MongoDB if available, otherwise cleanly use in-memory store
async function initStorage() {
  await loadLocalData();

  if (process.env.SKIP_MONGODB === 'true') {
    console.log('[FinPulse] SKIP_MONGODB is true. Running purely in local JSON mode.');
    return;
  }

  try {
    // Attempt MongoDB connection with 1.5 second timeout
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 1500,
    });
    isMongoConnected = true;
    console.log(`[MongoDB] Connected successfully to ${MONGODB_URI}`);

    // Seed Categories from JSON if empty
    const catCount = await Category.countDocuments();
    if (catCount === 0 && memCategories.length > 0) {
      await Category.insertMany(memCategories);
      console.log(`[MongoDB] Seeded ${memCategories.length} default categories into MongoDB.`);
    }

    // Seed Transactions from JSON if empty
    const txCount = await Transaction.countDocuments();
    if (txCount === 0 && memTransactions.length > 0) {
      await Transaction.insertMany(memTransactions);
      console.log(`[MongoDB] Seeded ${memTransactions.length} initial transactions into MongoDB.`);
    }
  } catch (err) {
    isMongoConnected = false;
    console.log(`[MongoDB] Notice: MongoDB not connected (${err.message}). FinPulse is running seamlessly in local JSON mode.`);
  }
}

// ==========================================
// 1. Categories API
// ==========================================
app.get('/api/categories', async (req, res) => {
  try {
    if (isMongoConnected) {
      const categories = await Category.find().lean();
      return res.json(categories);
    }
    res.json(memCategories);
  } catch (err) {
    res.json(memCategories);
  }
});

app.put('/api/categories/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, color, budgetLimit } = req.body;

    if (isMongoConnected) {
      const updated = await Category.findOneAndUpdate(
        { id },
        {
          ...(name !== undefined && { name }),
          ...(icon !== undefined && { icon }),
          ...(color !== undefined && { color }),
          ...(budgetLimit !== undefined && { budgetLimit: Number(budgetLimit) }),
        },
        { new: true }
      );
      if (updated) return res.json(updated);
    }

    const index = memCategories.findIndex((c) => c.id === id);
    if (index === -1) return res.status(404).json({ error: 'Category not found' });
    if (name !== undefined) memCategories[index].name = name;
    if (icon !== undefined) memCategories[index].icon = icon;
    if (color !== undefined) memCategories[index].color = color;
    if (budgetLimit !== undefined) memCategories[index].budgetLimit = Number(budgetLimit);
    res.json(memCategories[index]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// ==========================================
// 2. Budgets API (with aggregation)
// ==========================================
app.get('/api/budgets', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    let categories = [];
    let spendMap = {};

    if (isMongoConnected) {
      categories = await Category.find({ type: 'expense' }).lean();
      const categoryExpenses = await Transaction.aggregate([
        {
          $match: {
            type: 'expense',
            date: { $regex: `^${month}` },
          },
        },
        {
          $group: {
            _id: '$categoryId',
            totalSpent: { $sum: '$amount' },
          },
        },
      ]);
      for (const item of categoryExpenses) {
        spendMap[item._id] = item.totalSpent;
      }
    } else {
      categories = memCategories.filter((c) => c.type === 'expense');
      for (const t of memTransactions) {
        if (t.type === 'expense' && t.date && t.date.startsWith(month)) {
          spendMap[t.categoryId] = (spendMap[t.categoryId] || 0) + Number(t.amount);
        }
      }
    }

    const budgets = categories.map((cat) => {
      const spent = spendMap[cat.id] || 0;
      const limit = Number(cat.budgetLimit || 0);
      const remaining = limit > 0 ? limit - spent : 0;
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      let status = 'safe';
      if (percentage >= 100) status = 'exceeded';
      else if (percentage >= 80) status = 'warning';

      return {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        budgetLimit: limit,
        spent,
        remaining,
        percentage,
        status,
        month,
      };
    });

    res.json(budgets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate budgets' });
  }
});

app.put('/api/budgets/:categoryId', async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { budgetLimit } = req.body;

    if (isMongoConnected) {
      const updated = await Category.findOneAndUpdate(
        { id: categoryId },
        { budgetLimit: Number(budgetLimit || 0) },
        { new: true }
      );
      if (updated) return res.json(updated);
    }

    const cat = memCategories.find((c) => c.id === categoryId);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    cat.budgetLimit = Number(budgetLimit || 0);
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update budget limit' });
  }
});

// ==========================================
// 3. Transactions CRUD & Paginated Query
// ==========================================
app.get('/api/transactions', async (req, res) => {
  try {
    const { from, to, type, category, search, page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));

    if (isMongoConnected) {
      const query = {};
      if (from || to) {
        query.date = {};
        if (from) query.date.$gte = from;
        if (to) query.date.$lte = to;
      }
      if (type && type !== 'all') {
        query.type = type;
      }
      if (category && category !== 'all') {
        query.$or = [{ categoryId: category }, { categoryName: category }];
      }
      if (search) {
        const regex = new RegExp(search, 'i');
        query.$or = [{ note: regex }, { paymentMode: regex }, { categoryName: regex }];
      }

      const [result] = await Transaction.aggregate([
        { $match: query },
        {
          $facet: {
            items: [
              { $sort: { date: -1 } },
              { $skip: (pageNum - 1) * pageSize },
              { $limit: pageSize },
            ],
            totalCount: [{ $count: 'count' }],
          },
        },
      ]);

      const total = result.totalCount[0] ? result.totalCount[0].count : 0;
      const totalPages = Math.ceil(total / pageSize) || 1;

      return res.json({
        transactions: result.items || [],
        pagination: { total, page: pageNum, limit: pageSize, totalPages },
      });
    }

    // Local in-memory filtering
    let filtered = [...memTransactions];

    if (from) filtered = filtered.filter((t) => t.date >= from);
    if (to) filtered = filtered.filter((t) => t.date <= to);
    if (type && type !== 'all') filtered = filtered.filter((t) => t.type === type);
    if (category && category !== 'all') {
      filtered = filtered.filter((t) => t.categoryId === category || t.categoryName === category);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.note && t.note.toLowerCase().includes(s)) ||
          (t.paymentMode && t.paymentMode.toLowerCase().includes(s)) ||
          (t.categoryName && t.categoryName.toLowerCase().includes(s))
      );
    }

    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize) || 1;
    const paginatedItems = filtered.slice((pageNum - 1) * pageSize, pageNum * pageSize);

    res.json({
      transactions: paginatedItems,
      pagination: { total, page: pageNum, limit: pageSize, totalPages },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', async (req, res) => {
  try {
    const { type, amount, categoryId, categoryName, date, paymentMode, note, isRecurring, recurrence } = req.body;
    if (!type || !amount || (!categoryId && !categoryName)) {
      return res.status(400).json({ error: 'Missing required transaction fields' });
    }

    const matchedCat = memCategories.find((c) => c.id === categoryId || c.name === categoryName);

    const newTxData = {
      id: `tx-${Date.now()}`,
      type,
      amount: Number(amount),
      categoryId: matchedCat ? matchedCat.id : (categoryId || 'cat-custom'),
      categoryName: matchedCat ? matchedCat.name : (categoryName || 'Other'),
      date: date || new Date().toISOString().slice(0, 10),
      paymentMode: paymentMode || 'UPI',
      note: note || '',
      isRecurring: Boolean(isRecurring),
      recurrence: recurrence || (isRecurring ? 'monthly' : 'none'),
    };

    if (isMongoConnected) {
      const newTx = new Transaction(newTxData);
      await newTx.save();
      return res.status(201).json(newTx);
    }

    memTransactions.unshift(newTxData);
    res.status(201).json(newTxData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      const deleted = await Transaction.findOneAndDelete({ id });
      if (!deleted) return res.status(404).json({ error: 'Transaction not found' });
      return res.json({ message: 'Transaction deleted successfully', id });
    }

    const idx = memTransactions.findIndex((t) => t.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Transaction not found' });
    memTransactions.splice(idx, 1);
    res.json({ message: 'Transaction deleted successfully', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete transaction' });
  }
});

// ==========================================
// 4. Reports & Summaries
// ==========================================
app.get('/api/reports/summary', async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    if (isMongoConnected) {
      const [currentMonthAgg] = (await Transaction.aggregate([
        { $match: { date: { $regex: `^${month}` } } },
        {
          $group: {
            _id: null,
            totalIncome: {
              $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] },
            },
            totalExpense: {
              $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] },
            },
            transactionCount: { $sum: 1 },
          },
        },
      ])) || [];

      const totalIncome = currentMonthAgg?.totalIncome || 0;
      const totalExpense = currentMonthAgg?.totalExpense || 0;
      const netSavings = totalIncome - totalExpense;
      const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;

      const [lifetimeAgg] = (await Transaction.aggregate([
        {
          $group: {
            _id: null,
            income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
            expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
          },
        },
      ])) || [];

      const lifetimeBalance = (lifetimeAgg?.income || 0) - (lifetimeAgg?.expense || 0);

      return res.json({
        month,
        totalIncome,
        totalExpense,
        netSavings,
        savingsRate,
        lifetimeBalance,
        transactionCount: currentMonthAgg?.transactionCount || 0,
      });
    }

    // Local in-memory summary
    let totalIncome = 0;
    let totalExpense = 0;
    let txCount = 0;
    let lifeIncome = 0;
    let lifeExpense = 0;

    for (const t of memTransactions) {
      const amt = Number(t.amount || 0);
      if (t.type === 'income') lifeIncome += amt;
      if (t.type === 'expense') lifeExpense += amt;

      if (t.date && t.date.startsWith(month)) {
        txCount++;
        if (t.type === 'income') totalIncome += amt;
        if (t.type === 'expense') totalExpense += amt;
      }
    }

    const netSavings = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0;
    const lifetimeBalance = lifeIncome - lifeExpense;

    res.json({
      month,
      totalIncome,
      totalExpense,
      netSavings,
      savingsRate,
      lifetimeBalance,
      transactionCount: txCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute report summary' });
  }
});

// Category Breakdown Report
app.get('/api/reports/by-category', async (req, res) => {
  try {
    const { from, to, month } = req.query;

    let aggResult = [];
    if (isMongoConnected) {
      const matchQuery = { type: 'expense' };
      if (month) {
        matchQuery.date = { $regex: `^${month}` };
      } else if (from || to) {
        matchQuery.date = {};
        if (from) matchQuery.date.$gte = from;
        if (to) matchQuery.date.$lte = to;
      }

      aggResult = await Transaction.aggregate([
        { $match: matchQuery },
        {
          $group: {
            _id: '$categoryId',
            categoryName: { $first: '$categoryName' },
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]);
    } else {
      const map = {};
      for (const t of memTransactions) {
        if (t.type !== 'expense') continue;
        if (month && (!t.date || !t.date.startsWith(month))) continue;
        if (from && t.date < from) continue;
        if (to && t.date > to) continue;

        if (!map[t.categoryId]) {
          map[t.categoryId] = {
            _id: t.categoryId,
            categoryName: t.categoryName,
            total: 0,
            count: 0,
          };
        }
        map[t.categoryId].total += Number(t.amount || 0);
        map[t.categoryId].count += 1;
      }
      aggResult = Object.values(map).sort((a, b) => b.total - a.total);
    }

    const catMap = {};
    for (const c of memCategories) catMap[c.id] = c;

    const totalExpense = aggResult.reduce((sum, item) => sum + item.total, 0);

    const formatted = aggResult.map((item) => {
      const catInfo = catMap[item._id];
      const limit = catInfo?.budgetLimit || 0;
      return {
        categoryId: item._id,
        categoryName: item.categoryName,
        color: catInfo?.color || '#94A3B8',
        icon: catInfo?.icon || 'Tag',
        budgetLimit: limit,
        total: item.total,
        count: item.count,
        percentage: totalExpense > 0 ? Math.round((item.total / totalExpense) * 100) : 0,
        isOverBudget: limit > 0 && item.total > limit,
      };
    });

    res.json({
      totalExpense,
      categories: formatted,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to aggregate by category' });
  }
});

// Monthly Trend Report (Month-over-month cashflow)
app.get('/api/reports/monthly-trend', async (req, res) => {
  try {
    const year = req.query.year || '2026';
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const aggMap = {};

    if (isMongoConnected) {
      const monthlyAgg = await Transaction.aggregate([
        { $match: { date: { $regex: `^${year}` } } },
        {
          $group: {
            _id: { $substr: ['$date', 5, 2] },
            income: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
            expense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
            count: { $sum: 1 },
          },
        },
      ]);
      for (const m of monthlyAgg) {
        aggMap[m._id] = m;
      }
    } else {
      for (const t of memTransactions) {
        if (!t.date || !t.date.startsWith(year)) continue;
        const m = t.date.slice(5, 7);
        if (!aggMap[m]) {
          aggMap[m] = { income: 0, expense: 0, count: 0 };
        }
        aggMap[m].count += 1;
        if (t.type === 'income') aggMap[m].income += Number(t.amount || 0);
        if (t.type === 'expense') aggMap[m].expense += Number(t.amount || 0);
      }
    }

    const trends = months.map((m, index) => {
      const data = aggMap[m];
      const inc = data ? data.income : 0;
      const exp = data ? data.expense : 0;
      return {
        monthKey: `${year}-${m}`,
        month: monthNames[index],
        income: inc,
        expense: exp,
        savings: inc - exp,
        transactionCount: data ? data.count : 0,
      };
    });

    res.json(trends);
  } catch (err) {
    res.status(500).json({ error: 'Failed to calculate monthly trend' });
  }
});

// CSV Export
app.get('/api/reports/export', async (req, res) => {
  try {
    let list = [];
    if (isMongoConnected) {
      list = await Transaction.find().sort({ date: -1 }).lean();
    } else {
      list = [...memTransactions].sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    const headers = ['Transaction ID', 'Date', 'Type', 'Category', 'Amount', 'Payment Mode', 'Recurring', 'Notes'];
    const rows = list.map((t) => [
      t.id,
      t.date,
      t.type.toUpperCase(),
      `"${(t.categoryName || '').replace(/"/g, '""')}"`,
      t.amount,
      `"${(t.paymentMode || '').replace(/"/g, '""')}"`,
      t.isRecurring ? 'Yes' : 'No',
      `"${(t.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions_report.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Recurring simulation
app.post('/api/recurring/process', async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);

    let recurringTemplates = [];
    if (isMongoConnected) {
      recurringTemplates = await Transaction.find({ isRecurring: true }).lean();
    } else {
      recurringTemplates = memTransactions.filter((t) => t.isRecurring);
    }

    let createdCount = 0;
    for (const t of recurringTemplates) {
      const searchNote = `[Recurring] ${t.note.replace(/^\[Recurring\]\s*/, '')}`;
      let exists = false;

      if (isMongoConnected) {
        exists = await Transaction.findOne({
          note: searchNote,
          date: { $regex: `^${currentMonth}` },
        });
      } else {
        exists = memTransactions.some(
          (mt) => mt.note === searchNote && mt.date && mt.date.startsWith(currentMonth)
        );
      }

      if (!exists) {
        const newRecord = {
          id: `tx-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          type: t.type,
          amount: t.amount,
          categoryId: t.categoryId,
          categoryName: t.categoryName,
          date: today,
          paymentMode: t.paymentMode,
          note: searchNote,
          isRecurring: true,
          recurrence: t.recurrence || 'monthly',
        };

        if (isMongoConnected) {
          await Transaction.create(newRecord);
        } else {
          memTransactions.unshift(newRecord);
        }
        createdCount++;
      }
    }

    res.json({
      message: `Recurring job executed successfully. Created ${createdCount} automated transactions for ${currentMonth}.`,
      createdCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to execute recurring transactions' });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`Finance backend server running on http://localhost:${PORT}`);
  await initStorage();
});
