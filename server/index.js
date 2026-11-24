import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

import { User } from './models/User.js';
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
const JWT_SECRET = process.env.JWT_SECRET || 'finpulse_jwt_secret_dev_key_89234823489';

app.use(cors());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// In-memory fallback state for standalone offline operation
let isMongoConnected = false;
let memUsers = [];
let memCategories = [];
let memTransactions = [];
let memGoals = [];
let memSubscriptions = [];

// Base template categories cloned for every new registered user
let templateCategories = [];

async function loadLocalData() {
  try {
    const rawCategories = await fs.readFile(path.join(__dirname, 'data', 'categories.json'), 'utf-8');
    templateCategories = JSON.parse(rawCategories);

    const rawTransactions = await fs.readFile(path.join(__dirname, 'data', 'transactions.json'), 'utf-8');
    const seedTransactions = JSON.parse(rawTransactions);

    let seedGoals = [];
    try {
      const rawGoals = await fs.readFile(path.join(__dirname, 'data', 'goals.json'), 'utf-8');
      seedGoals = JSON.parse(rawGoals);
    } catch {
      seedGoals = [];
    }

    let seedSubs = [];
    try {
      const rawSubs = await fs.readFile(path.join(__dirname, 'data', 'subscriptions.json'), 'utf-8');
      seedSubs = JSON.parse(rawSubs);
    } catch {
      seedSubs = [];
    }

    // Seed Demo User
    const demoPasswordHash = await bcrypt.hash('password123', 10);
    const demoUser = {
      id: 'usr_demo',
      name: 'Demo Account',
      email: 'demo@finpulse.app',
      passwordHash: demoPasswordHash,
      currency: 'INR',
      createdAt: new Date().toISOString(),
    };

    memUsers = [demoUser];
    memCategories = templateCategories.map((c) => ({ ...c, userId: 'usr_demo' }));
    memTransactions = seedTransactions.map((t) => ({ ...t, userId: 'usr_demo' }));
    memGoals = seedGoals.map((g) => ({ ...g, userId: 'usr_demo' }));
    memSubscriptions = seedSubs.map((s) => ({ ...s, userId: 'usr_demo' }));

    console.log(`[Local Mode] Seeded demo user with ${memCategories.length} categories, ${memTransactions.length} transactions, ${memGoals.length} goals, and ${memSubscriptions.length} subscriptions.`);
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

  const maskedUri = MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@');
  console.log(`[MongoDB] Connecting to ${maskedUri}...`);

  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: 'finpulse',
      serverSelectionTimeoutMS: 10000,
    });
    isMongoConnected = true;
    console.log(`[MongoDB] Connected successfully to ${maskedUri}`);

    // Seed Demo User if empty
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.insertMany(memUsers);
      await Category.insertMany(memCategories);
      await Transaction.insertMany(memTransactions);
      await Goal.insertMany(memGoals);
      await Subscription.insertMany(memSubscriptions);
      console.log(`[MongoDB] Initial cloud database seeded with default demo datasets.`);
    } else {
      console.log(`[MongoDB] Online database verified (${userCount} registered accounts found).`);
    }
  } catch (err) {
    isMongoConnected = false;
    console.error(`[MongoDB] Connection failed (${err.message}).`);
    console.log('[MongoDB Tip] If using MongoDB Atlas:');
    console.log('  1. Check Network Access in Atlas: ensure your IP or 0.0.0.0/0 (allow from anywhere) is whitelisted.');
    console.log('  2. Check Database Users: make sure the username & password in MONGODB_URI are correct.');
    console.log('  3. FinPulse will seamlessly fall back to local mode in the meantime.');
  }
}

// Helper: clone default categories for a new user
async function seedCategoriesForNewUser(userId) {
  const userCats = templateCategories.map((c) => ({
    ...c,
    userId,
  }));

  if (isMongoConnected) {
    await Category.insertMany(userCats);
  } else {
    memCategories.push(...userCats);
  }
}

// ==========================================
// AUTH MIDDLEWARE
// ==========================================
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

// ==========================================
// AUTH API (Register, Login, Me, Profile)
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Please provide name, email, and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing
    if (isMongoConnected) {
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
    } else {
      const existing = memUsers.find((u) => u.email === normalizedEmail);
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr_${Date.now()}`;
    const newUser = {
      id: userId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      currency: 'INR',
      createdAt: new Date().toISOString(),
    };

    if (isMongoConnected) {
      const u = new User(newUser);
      await u.save();
    } else {
      memUsers.push(newUser);
    }

    // Seed personalized categories for the user
    await seedCategoriesForNewUser(userId);

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account registered successfully',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        currency: newUser.currency,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter both email and password' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = null;

    if (isMongoConnected) {
      user = await User.findOne({ email: normalizedEmail }).lean();
    } else {
      user = memUsers.find((u) => u.email === normalizedEmail);
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency || 'INR',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Dedicated 1-Click Demo JWT Auth Endpoint
app.post('/api/auth/demo', async (req, res) => {
  try {
    let demoUser = null;
    if (isMongoConnected) {
      demoUser = await User.findOne({ email: 'demo@finpulse.app' }).lean();
      if (!demoUser) {
        const fallback = memUsers.find((u) => u.email === 'demo@finpulse.app');
        if (fallback) {
          const u = new User(fallback);
          await u.save();
          demoUser = fallback;
        }
      }
    } else {
      demoUser = memUsers.find((u) => u.email === 'demo@finpulse.app');
    }

    if (!demoUser) {
      return res.status(404).json({ error: 'Demo user account not available' });
    }

    const token = jwt.sign(
      { userId: demoUser.id, email: demoUser.email, name: demoUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Logged in as Demo User',
      token,
      user: {
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
        currency: demoUser.currency || 'USD',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Demo authentication failed' });
  }
});

// Verify active JWT token validity
app.get('/api/auth/verify', requireAuth, (req, res) => {
  res.json({
    valid: true,
    user: {
      userId: req.user.userId,
      email: req.user.email,
      name: req.user.name,
    },
  });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    let user = null;
    if (isMongoConnected) {
      user = await User.findOne({ id: req.userId }, '-passwordHash').lean();
    } else {
      user = memUsers.find((u) => u.id === req.userId);
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      currency: user.currency || 'INR',
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

app.put('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { name, currency } = req.body;

    if (isMongoConnected) {
      const updated = await User.findOneAndUpdate(
        { id: req.userId },
        {
          ...(name && { name }),
          ...(currency && { currency }),
        },
        { new: true }
      );
      return res.json({ id: updated.id, name: updated.name, email: updated.email, currency: updated.currency });
    }

    const u = memUsers.find((user) => user.id === req.userId);
    if (!u) return res.status(404).json({ error: 'User not found' });
    if (name) u.name = name;
    if (currency) u.currency = currency;

    res.json({ id: u.id, name: u.name, email: u.email, currency: u.currency });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// ==========================================
// 1. Categories API (Scoped to User)
// ==========================================
app.get('/api/categories', requireAuth, async (req, res) => {
  try {
    if (isMongoConnected) {
      const categories = await Category.find({ userId: req.userId }).lean();
      return res.json(categories);
    }
    const userCats = memCategories.filter((c) => c.userId === req.userId);
    res.json(userCats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.put('/api/categories/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, icon, color, budgetLimit } = req.body;

    if (isMongoConnected) {
      const updated = await Category.findOneAndUpdate(
        { id, userId: req.userId },
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

    const index = memCategories.findIndex((c) => c.id === id && c.userId === req.userId);
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
// 2. Budgets API (Scoped to User)
// ==========================================
app.get('/api/budgets', requireAuth, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    let categories = [];
    let spendMap = {};

    if (isMongoConnected) {
      categories = await Category.find({ userId: req.userId, type: 'expense' }).lean();
      const categoryExpenses = await Transaction.aggregate([
        {
          $match: {
            userId: req.userId,
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
      categories = memCategories.filter((c) => c.userId === req.userId && c.type === 'expense');
      for (const t of memTransactions) {
        if (t.userId === req.userId && t.type === 'expense' && t.date && t.date.startsWith(month)) {
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

app.put('/api/budgets/:categoryId', requireAuth, async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { budgetLimit } = req.body;

    if (isMongoConnected) {
      const updated = await Category.findOneAndUpdate(
        { id: categoryId, userId: req.userId },
        { budgetLimit: Number(budgetLimit || 0) },
        { new: true }
      );
      if (updated) return res.json(updated);
    }

    const cat = memCategories.find((c) => c.id === categoryId && c.userId === req.userId);
    if (!cat) return res.status(404).json({ error: 'Category not found' });
    cat.budgetLimit = Number(budgetLimit || 0);
    res.json(cat);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update budget limit' });
  }
});

// ==========================================
// 3. Transactions CRUD & Bulk (Scoped to User)
// ==========================================
app.get('/api/transactions', requireAuth, async (req, res) => {
  try {
    const { from, to, type, category, search, page = 1, limit = 15 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const pageSize = Math.max(1, parseInt(limit, 10));

    if (isMongoConnected) {
      const query = { userId: req.userId };
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

    // Local in-memory filtering for user
    let filtered = memTransactions.filter((t) => t.userId === req.userId);

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

app.post('/api/transactions', requireAuth, async (req, res) => {
  try {
    const { type, amount, categoryId, categoryName, date, paymentMode, note, isRecurring, recurrence, receiptUrl, receiptName } = req.body;
    if (!type || !amount || (!categoryId && !categoryName)) {
      return res.status(400).json({ error: 'Missing required transaction fields' });
    }

    const userCats = memCategories.filter((c) => c.userId === req.userId);
    const matchedCat = userCats.find((c) => c.id === categoryId || c.name === categoryName);

    const newTxData = {
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: req.userId,
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

app.post('/api/transactions/bulk', requireAuth, async (req, res) => {
  try {
    const { transactions } = req.body;
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'No transactions provided' });
    }

    const userCats = memCategories.filter((c) => c.userId === req.userId);

    const prepared = transactions.map((t, idx) => {
      const matchedCat = userCats.find((c) => c.id === t.categoryId || c.name === t.categoryName);
      return {
        id: `tx-import-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
        userId: req.userId,
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
      memTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    res.status(201).json({
      message: `Successfully imported ${prepared.length} transactions into your personal ledger.`,
      count: prepared.length,
      inserted: prepared,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import transactions' });
  }
});

app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    if (isMongoConnected) {
      const deleted = await Transaction.findOneAndDelete({ id, userId: req.userId });
      if (!deleted) return res.status(404).json({ error: 'Transaction not found' });
      return res.json({ message: 'Transaction deleted successfully', id });
    }

    const idx = memTransactions.findIndex((t) => t.id === id && t.userId === req.userId);
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
app.get('/api/goals', requireAuth, async (req, res) => {
  try {
    if (isMongoConnected) {
      const goals = await Goal.find({ userId: req.userId }).sort({ createdAt: -1 }).lean();
      return res.json(goals);
    }
    const userGoals = memGoals.filter((g) => g.userId === req.userId);
    res.json(userGoals);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch goals' });
  }
});

app.post('/api/goals', requireAuth, async (req, res) => {
  try {
    const { title, targetAmount, savedAmount, targetDate, category, color, icon, note } = req.body;
    if (!title || !targetAmount || !targetDate) {
      return res.status(400).json({ error: 'Missing required goal fields' });
    }

    const newGoalData = {
      id: `goal-${Date.now()}`,
      userId: req.userId,
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

app.post('/api/goals/:id/deposit', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type = 'deposit', note = '' } = req.body;
    const numAmt = Number(amount);

    if (!numAmt || numAmt <= 0) {
      return res.status(400).json({ error: 'Invalid deposit/withdrawal amount' });
    }

    const delta = type === 'withdraw' ? -numAmt : numAmt;

    if (isMongoConnected) {
      const goal = await Goal.findOne({ id, userId: req.userId });
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

    const goal = memGoals.find((g) => g.id === id && g.userId === req.userId);
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
    res.status(500).json({ error: 'Failed to deposit to vault' });
  }
});

app.delete('/api/goals/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      const deleted = await Goal.findOneAndDelete({ id, userId: req.userId });
      if (!deleted) return res.status(404).json({ error: 'Goal not found' });
      return res.json({ message: 'Goal removed successfully', id });
    }

    const idx = memGoals.findIndex((g) => g.id === id && g.userId === req.userId);
    if (idx === -1) return res.status(404).json({ error: 'Goal not found' });
    memGoals.splice(idx, 1);
    res.json({ message: 'Goal removed successfully', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete goal' });
  }
});

// ==========================================
// 5. Bills & Subscriptions API (Scoped to User)
// ==========================================
app.get('/api/subscriptions', requireAuth, async (req, res) => {
  try {
    if (isMongoConnected) {
      const subs = await Subscription.find({ userId: req.userId }).sort({ dueDay: 1 }).lean();
      return res.json(subs);
    }
    const userSubs = memSubscriptions
      .filter((s) => s.userId === req.userId)
      .sort((a, b) => a.dueDay - b.dueDay);
    res.json(userSubs);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.post('/api/subscriptions', requireAuth, async (req, res) => {
  try {
    const { name, amount, billingCycle, dueDay, category, color, icon, autoPay, reminderDays } = req.body;
    if (!name || !amount || !dueDay) {
      return res.status(400).json({ error: 'Missing required subscription fields' });
    }

    const newSubData = {
      id: `sub-${Date.now()}`,
      userId: req.userId,
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

app.post('/api/subscriptions/:id/pay', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const month = req.body.month || new Date().toISOString().slice(0, 7);
    const today = new Date().toISOString().slice(0, 10);

    let sub = null;
    if (isMongoConnected) {
      sub = await Subscription.findOne({ id, userId: req.userId });
    } else {
      sub = memSubscriptions.find((s) => s.id === id && s.userId === req.userId);
    }

    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (!sub.paidMonths) sub.paidMonths = [];
    if (!sub.paidMonths.includes(month)) {
      sub.paidMonths.push(month);
    }

    const newTx = {
      id: `tx-bill-${Date.now()}`,
      userId: req.userId,
      type: 'expense',
      amount: sub.amount,
      categoryId: 'cat-utilities',
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

    res.json({ message: `Marked ${sub.name} as paid for ${month}`, subscription: sub });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process bill payment' });
  }
});

app.delete('/api/subscriptions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      const deleted = await Subscription.findOneAndDelete({ id, userId: req.userId });
      if (!deleted) return res.status(404).json({ error: 'Subscription not found' });
      return res.json({ message: 'Subscription removed', id });
    }

    const idx = memSubscriptions.findIndex((s) => s.id === id && s.userId === req.userId);
    if (idx === -1) return res.status(404).json({ error: 'Subscription not found' });
    memSubscriptions.splice(idx, 1);
    res.json({ message: 'Subscription removed', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

// ==========================================
// 6. Reports & Analytics (Scoped to User)
// ==========================================
app.get('/api/reports/summary', requireAuth, async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);

    if (isMongoConnected) {
      const [currentMonthAgg] = (await Transaction.aggregate([
        { $match: { userId: req.userId, date: { $regex: `^${month}` } } },
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
        { $match: { userId: req.userId } },
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

    // Local in-memory summary for user
    const userTx = memTransactions.filter((t) => t.userId === req.userId);
    let totalIncome = 0;
    let totalExpense = 0;
    let txCount = 0;
    let lifeIncome = 0;
    let lifeExpense = 0;

    for (const t of userTx) {
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
app.get('/api/reports/by-category', requireAuth, async (req, res) => {
  try {
    const { from, to, month } = req.query;

    let aggResult = [];
    if (isMongoConnected) {
      const matchQuery = { userId: req.userId, type: 'expense' };
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
      const userTx = memTransactions.filter((t) => t.userId === req.userId);
      for (const t of userTx) {
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

    const userCats = memCategories.filter((c) => c.userId === req.userId);
    const catMap = {};
    for (const c of userCats) catMap[c.id] = c;

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
app.get('/api/reports/monthly-trend', requireAuth, async (req, res) => {
  try {
    const year = req.query.year || '2026';
    const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const aggMap = {};

    if (isMongoConnected) {
      const monthlyAgg = await Transaction.aggregate([
        { $match: { userId: req.userId, date: { $regex: `^${year}` } } },
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
      const userTx = memTransactions.filter((t) => t.userId === req.userId);
      for (const t of userTx) {
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
app.get('/api/reports/export', requireAuth, async (req, res) => {
  try {
    const { from, to, type } = req.query;
    let list = [];
    if (isMongoConnected) {
      const query = { userId: req.userId };
      if (from || to) {
        query.date = {};
        if (from) query.date.$gte = from;
        if (to) query.date.$lte = to;
      }
      if (type && type !== 'all') query.type = type;
      list = await Transaction.find(query).sort({ date: -1 }).lean();
    } else {
      list = memTransactions.filter((t) => t.userId === req.userId);
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
app.post('/api/recurring/process', requireAuth, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const currentMonth = today.slice(0, 7);

    let recurringTemplates = [];
    if (isMongoConnected) {
      recurringTemplates = await Transaction.find({ userId: req.userId, isRecurring: true }).lean();
    } else {
      recurringTemplates = memTransactions.filter((t) => t.userId === req.userId && t.isRecurring);
    }

    let createdCount = 0;
    for (const t of recurringTemplates) {
      const searchNote = `[Recurring] ${t.note.replace(/^\[Recurring\]\s*/, '')}`;
      let exists = false;

      if (isMongoConnected) {
        exists = await Transaction.findOne({
          userId: req.userId,
          note: searchNote,
          date: { $regex: `^${currentMonth}` },
        });
      } else {
        exists = memTransactions.some(
          (mt) => mt.userId === req.userId && mt.note === searchNote && mt.date && mt.date.startsWith(currentMonth)
        );
      }

      if (!exists) {
        const newRecord = {
          id: `tx-rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          userId: req.userId,
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
      message: `Recurring job executed. Created ${createdCount} automated transactions for ${currentMonth}.`,
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
