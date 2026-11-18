import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import { Category } from './models/Category.js';
import { Transaction } from './models/Transaction.js';
import { Goal } from './models/Goal.js';
import { Subscription } from './models/Subscription.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/finpulse';

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// In-memory fallback state for standalone offline operation
let isMongoConnected = false;
let memCategories = [];
let memTransactions = [];
let memGoals = [];
let memSubscriptions = [];

async function loadLocalData() {
  try {
    const rawCategories = await fs.readFile(path.join(__dirname, 'data', 'categories.json'), 'utf-8');
    memCategories = JSON.parse(rawCategories);
    const rawTransactions = await fs.readFile(path.join(__dirname, 'data', 'transactions.json'), 'utf-8');
    memTransactions = JSON.parse(rawTransactions);

    try {
      const rawGoals = await fs.readFile(path.join(__dirname, 'data', 'goals.json'), 'utf-8');
      memGoals = JSON.parse(rawGoals);
    } catch {
      memGoals = [];
    }

    try {
      const rawSubs = await fs.readFile(path.join(__dirname, 'data', 'subscriptions.json'), 'utf-8');
      memSubscriptions = JSON.parse(rawSubs);
    } catch {
      memSubscriptions = [];
    }

    console.log(`[Local Mode] Loaded ${memCategories.length} categories, ${memTransactions.length} transactions, ${memGoals.length} goals, and ${memSubscriptions.length} subscriptions.`);
  } catch (err) {
    console.error('Failed to load local fallback data:', err.message);
  }
}

// Connect to MongoDB if available, otherwise cleanly use in-memory store
async function initStorage() {
  await loadLocalData();

  if (process.env.SKIP_MONGODB === 'true') {
    console.log('[FinPulse] SKIP_MONGODB is true. Running purely in local high-performance engine.');
    return;
  }

  try {
    // Attempt MongoDB connection with 1.5 second timeout
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 1500,
    });
    isMongoConnected = true;
    console.log(`[MongoDB] Connected successfully to ${MONGODB_URI}`);

    // Seed Categories
    const catCount = await Category.countDocuments();
    if (catCount === 0 && memCategories.length > 0) {
      await Category.insertMany(memCategories);
      console.log(`[MongoDB] Seeded ${memCategories.length} default categories into MongoDB.`);
    }

    // Seed Transactions
    const txCount = await Transaction.countDocuments();
    if (txCount === 0 && memTransactions.length > 0) {
      await Transaction.insertMany(memTransactions);
      console.log(`[MongoDB] Seeded ${memTransactions.length} initial transactions into MongoDB.`);
    }

    // Seed Goals
    const goalCount = await Goal.countDocuments();
    if (goalCount === 0 && memGoals.length > 0) {
      await Goal.insertMany(memGoals);
      console.log(`[MongoDB] Seeded ${memGoals.length} initial goals into MongoDB.`);
    }

    // Seed Subscriptions
    const subCount = await Subscription.countDocuments();
    if (subCount === 0 && memSubscriptions.length > 0) {
      await Subscription.insertMany(memSubscriptions);
      console.log(`[MongoDB] Seeded ${memSubscriptions.length} initial subscriptions into MongoDB.`);
    }
  } catch (err) {
    isMongoConnected = false;
    console.log(`[MongoDB] Notice: MongoDB not connected (${err.message}). FinPulse is running seamlessly in local mode.`);
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
// 3. Transactions CRUD, Paginated Query & Bulk Import
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
    const { type, amount, categoryId, categoryName, date, paymentMode, note, isRecurring, recurrence, receiptUrl, receiptName } = req.body;
    if (!type || !amount || (!categoryId && !categoryName)) {
      return res.status(400).json({ error: 'Missing required transaction fields' });
    }

    const matchedCat = memCategories.find((c) => c.id === categoryId || c.name === categoryName);

    const newTxData = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      amount: Number(amount),
      categoryId: matchedCat ? matchedCat.id : (categoryId || 'cat-custom'),
      categoryName: matchedCat ? matchedCat.name : (categoryName || 'Other'),
      date: date || new Date().toISOString().slice(0, 10),
      paymentMode: paymentMode || 'UPI',
      note: note || '',
      isRecurring: Boolean(isRecurring),
      recurrence: recurrence || (isRecurring ? 'monthly' : 'none'),
      receiptUrl: receiptUrl || null,
      receiptName: receiptName || null,
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

// Bulk Insert for Bank Statement CSV Import
app.post('/api/transactions/bulk', async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions provided' });
    }

    const prepared = transactions.map((t, idx) => {
      const matchedCat = memCategories.find((c) => c.id === t.categoryId || c.name === t.categoryName);
      return {
        id: `tx-import-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        type: t.type === 'income' ? 'income' : 'expense',
        amount: Math.abs(Number(t.amount) || 0),
        categoryId: matchedCat ? matchedCat.id : (t.categoryId || 'cat-other'),
        categoryName: matchedCat ? matchedCat.name : (t.categoryName || 'Other'),
        date: t.date || new Date().toISOString().slice(0, 10),
        paymentMode: t.paymentMode || 'Net Banking',
        note: t.note || 'Imported statement record',
        isRecurring: Boolean(t.isRecurring),
        recurrence: 'none',
        receiptUrl: null,
        receiptName: null,
      };
    });

    if (isMongoConnected) {
      await Transaction.insertMany(prepared);
    } else {
      memTransactions.unshift(...prepared);
      // Keep sorted
      memTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    res.status(201).json({
      message: `Successfully imported ${prepared.length} transactions from bank statement.`,
      count: prepared.length,
      inserted: prepared,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import bulk transactions' });
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
// 4. Financial Goals & Savings Vault API
// ==========================================
app.get('/api/goals', async (req, res) => {
  try {
    if (isMongoConnected) {
      const goals = await Goal.find().sort({ createdAt: -1 }).lean();
      return res.json(goals);
    }
    res.json(memGoals);
  } catch (err) {
    res.json(memGoals);
  }
});

app.post('/api/goals', async (req, res) => {
  try {
    const { title, targetAmount, savedAmount, targetDate, category, color, icon, note } = req.body;
    if (!title || !targetAmount || !targetDate) {
      return res.status(400).json({ error: 'Missing required goal fields (title, targetAmount, targetDate)' });
    }

    const newGoalData = {
      id: `goal-${Date.now()}`,
      title,
      targetAmount: Number(targetAmount),
      savedAmount: Number(savedAmount || 0),
      targetDate,
      category: category || 'General',
      color: color || '#10B981',
      icon: icon || 'PiggyBank',
      note: note || '',
      history: savedAmount > 0 ? [
        {
          id: `gh-${Date.now()}`,
          date: new Date().toISOString().slice(0, 10),
          type: 'deposit',
          amount: Number(savedAmount),
          note: 'Initial deposit',
        }
      ] : [],
    };

    if (isMongoConnected) {
      const g = new Goal(newGoalData);
      await g.save();
      return res.status(201).json(g);
    }

    memGoals.unshift(newGoalData);
    res.status(201).json(newGoalData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create goal' });
  }
});

app.put('/api/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, targetAmount, targetDate, category, color, icon, note } = req.body;

    if (isMongoConnected) {
      const updated = await Goal.findOneAndUpdate(
        { id },
        {
          ...(title && { title }),
          ...(targetAmount && { targetAmount: Number(targetAmount) }),
          ...(targetDate && { targetDate }),
          ...(category && { category }),
          ...(color && { color }),
          ...(icon && { icon }),
          ...(note !== undefined && { note }),
        },
        { new: true }
      );
      if (updated) return res.json(updated);
    }

    const goal = memGoals.find((g) => g.id === id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });
    if (title) goal.title = title;
    if (targetAmount) goal.targetAmount = Number(targetAmount);
    if (targetDate) goal.targetDate = targetDate;
    if (category) goal.category = category;
    if (color) goal.color = color;
    if (icon) goal.icon = icon;
    if (note !== undefined) goal.note = note;

    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// Deposit / Withdraw to/from Goal Vault
app.post('/api/goals/:id/deposit', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type = 'deposit', note = '' } = req.body;
    const numAmt = Number(amount);

    if (!numAmt || numAmt <= 0) {
      return res.status(400).json({ error: 'Invalid deposit/withdrawal amount' });
    }

    const delta = type === 'withdraw' ? -numAmt : numAmt;

    if (isMongoConnected) {
      const goal = await Goal.findOne({ id });
      if (!goal) return res.status(404).json({ error: 'Goal not found' });

      goal.savedAmount = Math.max(0, goal.savedAmount + delta);
      goal.history.unshift({
        id: `gh-${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        type,
        amount: numAmt,
        note: note || (type === 'deposit' ? 'Vault Contribution' : 'Vault Withdrawal'),
      });

      await goal.save();
      return res.json(goal);
    }

    const goal = memGoals.find((g) => g.id === id);
    if (!goal) return res.status(404).json({ error: 'Goal not found' });

    goal.savedAmount = Math.max(0, (goal.savedAmount || 0) + delta);
    if (!goal.history) goal.history = [];
    goal.history.unshift({
      id: `gh-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      type,
      amount: numAmt,
      note: note || (type === 'deposit' ? 'Vault Contribution' : 'Vault Withdrawal'),
    });

    res.json(goal);
  } catch (err) {
    res.status(500).json({ error: 'Failed to process vault deposit' });
  }
});

app.delete('/api/goals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      const deleted = await Goal.findOneAndDelete({ id });
      if (!deleted) return res.status(404).json({ error: 'Goal not found' });
      return res.json({ message: 'Goal removed successfully', id });
    }

    const idx = memGoals.findIndex((g) => g.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Goal not found' });
    memGoals.splice(idx, 1);
    res.json({ message: 'Goal removed successfully', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// ==========================================
// 5. Bills & Subscriptions API
// ==========================================
app.get('/api/subscriptions', async (req, res) => {
  try {
    if (isMongoConnected) {
      const subs = await Subscription.find().sort({ dueDay: 1 }).lean();
      return res.json(subs);
    }
    const sorted = [...memSubscriptions].sort((a, b) => a.dueDay - b.dueDay);
    res.json(sorted);
  } catch (err) {
    res.json(memSubscriptions);
  }
});

app.post('/api/subscriptions', async (req, res) => {
  try {
    const { name, amount, billingCycle, dueDay, category, color, icon, autoPay, reminderDays } = req.body;
    if (!name || !amount || !dueDay) {
      return res.status(400).json({ error: 'Missing required subscription fields' });
    }

    const newSubData = {
      id: `sub-${Date.now()}`,
      name,
      amount: Number(amount),
      billingCycle: billingCycle || 'monthly',
      dueDay: Math.min(31, Math.max(1, Number(dueDay))),
      category: category || 'General',
      color: color || '#6366F1',
      icon: icon || 'CreditCard',
      autoPay: Boolean(autoPay !== false),
      active: true,
      paidMonths: [],
      reminderDays: Number(reminderDays || 3),
    };

    if (isMongoConnected) {
      const s = new Subscription(newSubData);
      await s.save();
      return res.status(201).json(s);
    }

    memSubscriptions.push(newSubData);
    res.status(201).json(newSubData);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

app.put('/api/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, amount, billingCycle, dueDay, category, color, icon, autoPay, active, reminderDays } = req.body;

    if (isMongoConnected) {
      const updated = await Subscription.findOneAndUpdate(
        { id },
        {
          ...(name && { name }),
          ...(amount && { amount: Number(amount) }),
          ...(billingCycle && { billingCycle }),
          ...(dueDay && { dueDay: Number(dueDay) }),
          ...(category && { category }),
          ...(color && { color }),
          ...(icon && { icon }),
          ...(autoPay !== undefined && { autoPay: Boolean(autoPay) }),
          ...(active !== undefined && { active: Boolean(active) }),
          ...(reminderDays !== undefined && { reminderDays: Number(reminderDays) }),
        },
        { new: true }
      );
      if (updated) return res.json(updated);
    }

    const sub = memSubscriptions.find((s) => s.id === id);
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });
    if (name) sub.name = name;
    if (amount) sub.amount = Number(amount);
    if (billingCycle) sub.billingCycle = billingCycle;
    if (dueDay) sub.dueDay = Number(dueDay);
    if (category) sub.category = category;
    if (color) sub.color = color;
    if (icon) sub.icon = icon;
    if (autoPay !== undefined) sub.autoPay = Boolean(autoPay);
    if (active !== undefined) sub.active = Boolean(active);
    if (reminderDays !== undefined) sub.reminderDays = Number(reminderDays);

    res.json(sub);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Mark Bill as Paid for Month (and log transaction)
app.post('/api/subscriptions/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const month = req.body.month || new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().slice(0, 10);

    let sub = null;
    if (isMongoConnected) {
      sub = await Subscription.findOne({ id });
    } else {
      sub = memSubscriptions.find((s) => s.id === id);
    }

    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (!sub.paidMonths) sub.paidMonths = [];
    if (!sub.paidMonths.includes(month)) {
      sub.paidMonths.push(month);
    }

    // Auto-create ledger transaction
    const matchedCat = memCategories.find((c) => c.name.toLowerCase().includes(sub.category.toLowerCase()) || c.id === 'cat-utilities') || memCategories[0];
    const newTx = {
      id: `tx-bill-${Date.now()}`,
      type: 'expense',
      amount: sub.amount,
      categoryId: matchedCat ? matchedCat.id : 'cat-utilities',
      categoryName: sub.name,
      date: today,
      paymentMode: 'Auto-Debit',
      note: `Bill Paid: ${sub.name} (${month})`,
      isRecurring: true,
      recurrence: sub.billingCycle,
      receiptUrl: null,
      receiptName: null,
    };

    if (isMongoConnected) {
      await sub.save();
      await Transaction.create(newTx);
    } else {
      memTransactions.unshift(newTx);
    }

    res.json({ message: `Marked ${sub.name} as paid for ${month}`, subscription: sub, transaction: newTx });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process bill payment' });
  }
});

app.delete('/api/subscriptions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      const deleted = await Subscription.findOneAndDelete({ id });
      if (!deleted) return res.status(404).json({ error: 'Subscription not found' });
      return res.json({ message: 'Subscription removed', id });
    }

    const idx = memSubscriptions.findIndex((s) => s.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Subscription not found' });
    memSubscriptions.splice(idx, 1);
    res.json({ message: 'Subscription removed', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

// ==========================================
// 6. Reports, Summaries & Analytics
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

// CSV Export (with date filter)
app.get('/api/reports/export', async (req, res) => {
  try {
    const { from, to, type } = req.query;
    let list = [];
    if (isMongoConnected) {
      const query = {};
      if (from || to) {
        query.date = {};
        if (from) query.date.$gte = from;
        if (to) query.date.$lte = to;
      }
      if (type && type !== 'all') query.type = type;
      list = await Transaction.find(query).sort({ date: -1 }).lean();
    } else {
      list = [...memTransactions];
      if (from) list = list.filter((t) => t.date >= from);
      if (to) list = list.filter((t) => t.date <= to);
      if (type && type !== 'all') list = list.filter((t) => t.type === type);
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
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
    res.setHeader('Content-Disposition', 'attachment; filename="finpulse_statement.csv"');
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
          receiptUrl: null,
          receiptName: null,
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
