import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Download,
  Upload,
  RefreshCw,
  Search,
  Trash2,
  Calendar,
  PieChart as PieChartIcon,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CreditCard,
  Edit2,
  FileText,
  Printer,
  Target,
  ShieldCheck,
  Laptop,
  Plane,
  HeartPulse,
  Home,
  Wifi,
  Dumbbell,
  Film,
  Music,
  Code,
  Zap,
  Eye,
  Clock,
  ArrowRight,
  Lock,
  Mail,
  User,
  LogOut,
  ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

export default function App() {
  // Authentication State
  const [token, setToken] = useState(() => localStorage.getItem('finpulse_token') || null);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const u = localStorage.getItem('finpulse_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  });

  // Auth Form State
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // App Navigation & Selected Month
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [toast, setToast] = useState(null);

  // Global Core Data
  const [summary, setSummary] = useState({
    totalIncome: 0,
    totalExpense: 0,
    netSavings: 0,
    savingsRate: 0,
    lifetimeBalance: 0,
    transactionCount: 0,
  });
  const [categoryReport, setCategoryReport] = useState({ totalExpense: 0, categories: [] });
  const [monthlyTrends, setMonthlyTrends] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [goals, setGoals] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);

  // Transactions State
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  // Modals
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txForm, setTxForm] = useState({
    type: 'expense',
    amount: '',
    categoryId: '',
    categoryName: '',
    date: new Date().toISOString().slice(0, 10),
    paymentMode: 'UPI',
    note: '',
    isRecurring: false,
    recurrence: 'monthly',
    receiptUrl: null,
    receiptName: null,
  });

  const [inspectReceipt, setInspectReceipt] = useState(null);
  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ categoryId: '', name: '', limit: 0 });

  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    title: '',
    targetAmount: '',
    savedAmount: '',
    targetDate: '',
    category: 'General',
    color: '#10B981',
    icon: 'Target',
    note: '',
  });

  const [depositModal, setDepositModal] = useState({ open: false, goal: null, amount: '', type: 'deposit', note: '' });

  const [isAddSubOpen, setIsAddSubOpen] = useState(false);
  const [subForm, setSubForm] = useState({
    name: '',
    amount: '',
    billingCycle: 'monthly',
    dueDay: 5,
    category: 'Utilities',
    color: '#6366F1',
    icon: 'CreditCard',
    autoPay: true,
    reminderDays: 3,
  });

  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [csvImportData, setCsvImportData] = useState([]);
  const [csvFileName, setCsvFileName] = useState('');

  // Compound Interest Simulator State
  const [simInitial, setSimInitial] = useState(100000);
  const [simMonthly, setSimMonthly] = useState(15000);
  const [simRate, setSimRate] = useState(12);
  const [simYears, setSimYears] = useState(10);
  const [adjustInflation, setAdjustInflation] = useState(false);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Currency symbols
  const currencySymbol = useMemo(() => {
    switch (currentUser?.currency) {
      case 'USD': return '$';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'INR':
      default: return '₹';
    }
  }, [currentUser?.currency]);

  const formatMoney = useCallback((val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${num.toLocaleString('en-IN')}`;
  }, [currencySymbol]);

  // Auth fetch wrapper
  const authFetch = useCallback(async (url, options = {}) => {
    if (!token) return { ok: false, status: 401 };
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
    try {
      const res = await fetch(url, { ...options, headers });
      if (res.status === 401) {
        // Token expired
        localStorage.removeItem('finpulse_token');
        localStorage.removeItem('finpulse_user');
        setToken(null);
        setCurrentUser(null);
      }
      return res;
    } catch (e) {
      return { ok: false, status: 500 };
    }
  }, [token]);

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem('finpulse_token');
    localStorage.removeItem('finpulse_user');
    setToken(null);
    setCurrentUser(null);
    showToast('Signed out successfully');
  };

  // Handle Auth Login / Register
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);

    if (authMode === 'register' && authForm.password !== authForm.confirmPassword) {
      setAuthError('Passwords do not match');
      setAuthLoading(false);
      return;
    }

    const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
    const payload = authMode === 'login'
      ? { email: authForm.email, password: authForm.password }
      : { name: authForm.name, email: authForm.email, password: authForm.password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('finpulse_token', data.token);
        localStorage.setItem('finpulse_user', JSON.stringify(data.user));
        setToken(data.token);
        setCurrentUser(data.user);
        showToast(authMode === 'login' ? `Welcome back, ${data.user.name}!` : 'Account created! Welcome to FinPulse.');
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch {
      setAuthError('Network error. Please make sure backend is reachable.');
    } finally {
      setAuthLoading(false);
    }
  };

  // 1-Click Fast Demo Login
  const handleDemoLogin = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@finpulse.app', password: 'password123' }),
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('finpulse_token', data.token);
        localStorage.setItem('finpulse_user', JSON.stringify(data.user));
        setToken(data.token);
        setCurrentUser(data.user);
        showToast('Logged in as Demo User with full sample ledger!');
      } else {
        setAuthError(data.error || 'Demo login failed');
      }
    } catch {
      setAuthError('Network error connecting to backend.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Change Preferred Currency
  const handleCurrencyChange = async (newCurr) => {
    try {
      const res = await authFetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: newCurr }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCurrentUser(updated);
        localStorage.setItem('finpulse_user', JSON.stringify(updated));
        showToast(`Currency updated to ${newCurr}`);
      }
    } catch {
      showToast('Failed to update currency');
    }
  };

  // Icon mapping
  const renderIcon = (iconName, size = 16) => {
    switch (iconName) {
      case 'ShieldCheck': return <ShieldCheck size={size} />;
      case 'Laptop': return <Laptop size={size} />;
      case 'Plane': return <Plane size={size} />;
      case 'HeartPulse': return <HeartPulse size={size} />;
      case 'Home': return <Home size={size} />;
      case 'Wifi': return <Wifi size={size} />;
      case 'Dumbbell': return <Dumbbell size={size} />;
      case 'Film': return <Film size={size} />;
      case 'Music': return <Music size={size} />;
      case 'Code': return <Code size={size} />;
      case 'Zap': return <Zap size={size} />;
      case 'PiggyBank': return <PiggyBank size={size} />;
      default: return <Target size={size} />;
    }
  };

  // Data Loaders
  const loadCategories = useCallback(async () => {
    try {
      const res = await authFetch('/api/categories');
      if (res.ok) setCategories(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [authFetch]);

  const loadSummary = useCallback(async () => {
    try {
      const res = await authFetch(`/api/reports/summary?month=${selectedMonth}`);
      if (res.ok) setSummary(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [authFetch, selectedMonth]);

  const loadCategoryReport = useCallback(async () => {
    try {
      const res = await authFetch(`/api/reports/by-category?month=${selectedMonth}`);
      if (res.ok) setCategoryReport(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [authFetch, selectedMonth]);

  const loadMonthlyTrends = useCallback(async () => {
    try {
      const year = selectedMonth.split('-')[0] || '2026';
      const res = await authFetch(`/api/reports/monthly-trend?year=${year}`);
      if (res.ok) setMonthlyTrends(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [authFetch, selectedMonth]);

  const loadBudgets = useCallback(async () => {
    try {
      const res = await authFetch(`/api/budgets?month=${selectedMonth}`);
      if (res.ok) setBudgets(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [authFetch, selectedMonth]);

  const loadGoals = useCallback(async () => {
    try {
      const res = await authFetch('/api/goals');
      if (res.ok) setGoals(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [authFetch]);

  const loadSubscriptions = useCallback(async () => {
    try {
      const res = await authFetch('/api/subscriptions');
      if (res.ok) setSubscriptions(await res.json());
    } catch (e) {
      console.error(e);
    }
  }, [authFetch]);

  const loadTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(typeFilter !== 'all' && { type: typeFilter }),
        ...(categoryFilter !== 'all' && { category: categoryFilter }),
        ...(search && { search }),
      });
      const res = await authFetch(`/api/transactions?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
        setPagination(data.pagination || { page: 1, total: 0, totalPages: 1 });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authFetch, typeFilter, categoryFilter, search]);

  useEffect(() => {
    if (token) {
      loadCategories();
      loadGoals();
      loadSubscriptions();
    }
  }, [token, loadCategories, loadGoals, loadSubscriptions]);

  useEffect(() => {
    if (token) {
      loadSummary();
      loadCategoryReport();
      loadMonthlyTrends();
      loadBudgets();
    }
  }, [token, selectedMonth, loadSummary, loadCategoryReport, loadMonthlyTrends, loadBudgets]);

  useEffect(() => {
    if (token && (activeTab === 'transactions' || activeTab === 'dashboard')) {
      loadTransactions(1);
    }
  }, [token, activeTab, loadTransactions]);

  // Handle Receipt File Upload
  const handleReceiptFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('Receipt file must be under 8MB', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setTxForm((prev) => ({
        ...prev,
        receiptUrl: event.target.result,
        receiptName: file.name,
      }));
      showToast(`Receipt "${file.name}" attached`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Submit New Transaction
  const handleAddTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!txForm.amount || !txForm.categoryId) {
      showToast('Please provide an amount and select a category', 'error');
      return;
    }

    const matchedCat = categories.find((c) => c.id === txForm.categoryId);
    const payload = {
      ...txForm,
      amount: Number(txForm.amount),
      categoryName: matchedCat ? matchedCat.name : 'Other',
    };

    try {
      const res = await authFetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Transaction logged in your personal ledger!', 'success');
        setIsAddTxOpen(false);
        setTxForm({
          type: 'expense',
          amount: '',
          categoryId: '',
          categoryName: '',
          date: new Date().toISOString().slice(0, 10),
          paymentMode: 'UPI',
          note: '',
          isRecurring: false,
          recurrence: 'monthly',
          receiptUrl: null,
          receiptName: null,
        });
        loadSummary();
        loadCategoryReport();
        loadMonthlyTrends();
        loadBudgets();
        loadTransactions(1);
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to add transaction', 'error');
      }
    } catch {
      showToast('Network error while saving transaction', 'error');
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Delete this ledger record?')) return;
    try {
      const res = await authFetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Transaction deleted', 'success');
        loadSummary();
        loadCategoryReport();
        loadMonthlyTrends();
        loadBudgets();
        loadTransactions(pagination.page);
      }
    } catch {
      showToast('Failed to delete transaction', 'error');
    }
  };

  // Update Budget Limit
  const handleUpdateBudgetSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch(`/api/budgets/${budgetForm.categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetLimit: Number(budgetForm.limit) }),
      });
      if (res.ok) {
        showToast(`Budget limit updated for ${budgetForm.name}`, 'success');
        setIsEditBudgetOpen(false);
        loadBudgets();
        loadCategoryReport();
      }
    } catch {
      showToast('Failed to update budget limit', 'error');
    }
  };

  // Create Goal
  const handleCreateGoalSubmit = async (e) => {
    e.preventDefault();
    if (!goalForm.title || !goalForm.targetAmount || !goalForm.targetDate) {
      showToast('Please fill required goal fields', 'error');
      return;
    }

    try {
      const res = await authFetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(goalForm),
      });

      if (res.ok) {
        showToast('Savings Goal created!', 'success');
        setIsAddGoalOpen(false);
        setGoalForm({
          title: '',
          targetAmount: '',
          savedAmount: '',
          targetDate: '',
          category: 'General',
          color: '#10B981',
          icon: 'Target',
          note: '',
        });
        loadGoals();
      }
    } catch {
      showToast('Failed to create goal', 'error');
    }
  };

  // Deposit/Withdraw to Goal
  const handleGoalDepositSubmit = async (e) => {
    e.preventDefault();
    if (!depositModal.goal || !depositModal.amount) return;

    try {
      const res = await authFetch(`/api/goals/${depositModal.goal.id}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Number(depositModal.amount),
          type: depositModal.type,
          note: depositModal.note,
        }),
      });

      if (res.ok) {
        showToast(`Vault updated for ${depositModal.goal.title}`, 'success');
        setDepositModal({ open: false, goal: null, amount: '', type: 'deposit', note: '' });
        loadGoals();
      }
    } catch {
      showToast('Failed to process vault transaction', 'error');
    }
  };

  // Delete Goal
  const handleDeleteGoal = async (id) => {
    if (!window.confirm('Delete this savings vault?')) return;
    try {
      const res = await authFetch(`/api/goals/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Goal removed', 'success');
        loadGoals();
      }
    } catch {
      showToast('Failed to delete goal', 'error');
    }
  };

  // Create Subscription
  const handleCreateSubSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await authFetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subForm),
      });

      if (res.ok) {
        showToast('Bill tracked successfully!', 'success');
        setIsAddSubOpen(false);
        setSubForm({
          name: '',
          amount: '',
          billingCycle: 'monthly',
          dueDay: 5,
          category: 'Utilities',
          color: '#6366F1',
          icon: 'CreditCard',
          autoPay: true,
          reminderDays: 3,
        });
        loadSubscriptions();
      }
    } catch {
      showToast('Failed to track subscription', 'error');
    }
  };

  // Mark Subscription Paid
  const handlePaySubscription = async (sub) => {
    try {
      const res = await authFetch(`/api/subscriptions/${sub.id}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: selectedMonth }),
      });

      if (res.ok) {
        showToast(`Marked ${sub.name} as paid & logged in ledger`, 'success');
        loadSubscriptions();
        loadSummary();
        loadCategoryReport();
        loadTransactions(1);
      }
    } catch {
      showToast('Failed to mark bill as paid', 'error');
    }
  };

  // Delete Subscription
  const handleDeleteSubscription = async (id) => {
    if (!window.confirm('Stop tracking this subscription?')) return;
    try {
      const res = await authFetch(`/api/subscriptions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Subscription removed', 'success');
        loadSubscriptions();
      }
    } catch {
      showToast('Failed to remove subscription', 'error');
    }
  };

  // Parse CSV File for Bank Statement Import
  const handleCsvFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim() !== '');
      if (lines.length < 2) {
        showToast('CSV file is empty or invalid', 'error');
        return;
      }

      const rows = lines.slice(1);
      const parsed = [];

      for (const row of rows) {
        const parts = row.split(',').map((p) => p.trim().replace(/^"|"$/g, ''));
        if (parts.length >= 3) {
          const date = parts[0] || parts[1];
          const note = parts[1] || parts[2];
          const amountVal = parseFloat(parts[2]?.replace(/[^0-9.-]+/g, '') || parts[3]?.replace(/[^0-9.-]+/g, '') || '0');
          const type = parts[3]?.toLowerCase() === 'income' || amountVal > 0 && parts.some((p) => p.toLowerCase().includes('cr')) ? 'income' : 'expense';

          if (date && amountVal) {
            parsed.push({
              date: date.length === 10 ? date : new Date().toISOString().slice(0, 10),
              note: note || 'Bank Statement Entry',
              amount: Math.abs(amountVal),
              type,
              paymentMode: 'Bank Transfer',
              categoryName: 'Bank Import',
              categoryId: 'cat-other',
            });
          }
        }
      }

      setCsvImportData(parsed);
      showToast(`Parsed ${parsed.length} statement rows ready to import`, 'success');
    };
    reader.readAsText(file);
  };

  // Confirm Bulk Import
  const handleConfirmCsvImport = async () => {
    if (csvImportData.length === 0) return;
    try {
      const res = await authFetch('/api/transactions/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactions: csvImportData }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message, 'success');
        setCsvImportData([]);
        setCsvFileName('');
        loadSummary();
        loadCategoryReport();
        loadMonthlyTrends();
        loadBudgets();
        loadTransactions(1);
      }
    } catch {
      showToast('Failed to import bank statement', 'error');
    }
  };

  // Run Recurring Simulation
  const handleProcessRecurring = async () => {
    try {
      const res = await authFetch('/api/recurring/process', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message, 'success');
        loadSummary();
        loadCategoryReport();
        loadMonthlyTrends();
        loadBudgets();
        loadTransactions(1);
      }
    } catch {
      showToast('Failed to run recurring automation', 'error');
    }
  };

  // Export CSV with Authorization
  const handleExportCSV = async () => {
    try {
      const res = await authFetch('/api/reports/export');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'finpulse_statement.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast('Statement CSV exported');
      }
    } catch {
      showToast('Failed to export CSV');
    }
  };

  // Compound Interest Calculation Engine
  const simResults = useMemo(() => {
    const p = Number(simInitial) || 0;
    const pmt = Number(simMonthly) || 0;
    const r = (Number(simRate) || 0) / 100;
    const effRate = adjustInflation ? Math.max(0, r - 0.06) : r;
    const years = Math.max(1, Math.min(40, Number(simYears) || 10));

    let currentBalance = p;
    let totalInvested = p;
    const schedule = [];

    for (let y = 1; y <= years; y++) {
      for (let m = 1; m <= 12; m++) {
        currentBalance += pmt;
        totalInvested += pmt;
        const interest = currentBalance * (effRate / 12);
        currentBalance += interest;
      }

      schedule.push({
        year: `Yr ${y}`,
        totalInvested: Math.round(totalInvested),
        futureValue: Math.round(currentBalance),
        wealthGain: Math.round(Math.max(0, currentBalance - totalInvested)),
      });
    }

    return {
      totalInvested: Math.round(totalInvested),
      futureValue: Math.round(currentBalance),
      wealthGain: Math.round(Math.max(0, currentBalance - totalInvested)),
      schedule,
    };
  }, [simInitial, simMonthly, simRate, simYears, adjustInflation]);

  const filteredCategoriesForTx = categories.filter((c) => c.type === txForm.type);

  // Total monthly subscriptions burden
  const totalMonthlySubCost = subscriptions.reduce((sum, s) => {
    return sum + (s.active ? (s.billingCycle === 'yearly' ? s.amount / 12 : s.amount) : 0);
  }, 0);

  // =========================================================
  // AUTH VIEW (LOGIN / REGISTRATION)
  // =========================================================
  if (!token || !currentUser) {
    return (
      <>
        <div className="bg-subtle-grid" />
        <div className="auth-wrapper">
          <div className="auth-card">
            <div className="auth-header">
              <div className="auth-logo-box">
                <Sparkles size={24} />
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 700 }}>
                FinPulse
              </h1>
              <p style={{ fontSize: '0.825rem', color: '#94a3b8' }}>
                Your personal, private, and intelligent financial operating system.
              </p>
            </div>

            {/* Quick Demo Access Bar */}
            <div className="demo-login-box">
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#10b981' }}>Want a quick test drive?</div>
                <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Instant demo account with pre-filled mock data</div>
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleDemoLogin}
                disabled={authLoading}
              >
                1-Click Demo &rarr;
              </button>
            </div>

            {/* Auth Switcher Tabs */}
            <div className="auth-tabs">
              <button
                type="button"
                className={`auth-tab-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => { setAuthMode('login'); setAuthError(''); }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`auth-tab-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => { setAuthMode('register'); setAuthError(''); }}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div style={{ background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '0.65rem 0.85rem', borderRadius: '8px', color: '#fda4af', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertTriangle size={15} />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
              {authMode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arjun Makkar"
                      className="form-input"
                      style={{ paddingLeft: '2.1rem', width: '100%' }}
                      value={authForm.name}
                      onChange={(e) => setAuthForm({ ...authForm, name: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="email"
                    required
                    placeholder="name@example.com"
                    className="form-input"
                    style={{ paddingLeft: '2.1rem', width: '100%' }}
                    value={authForm.email}
                    onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="At least 6 characters"
                    className="form-input"
                    style={{ paddingLeft: '2.1rem', width: '100%' }}
                    value={authForm.password}
                    onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  />
                </div>
              </div>

              {authMode === 'register' && (
                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="Repeat password"
                      className="form-input"
                      style={{ paddingLeft: '2.1rem', width: '100%' }}
                      value={authForm.confirmPassword}
                      onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center', marginTop: '0.4rem', padding: '0.65rem' }}
                disabled={authLoading}
              >
                {authLoading ? 'Authenticating...' : authMode === 'login' ? 'Sign In to FinPulse' : 'Create My Personal Vault'}
              </button>
            </form>

            <div style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b' }}>
              Protected by isolated per-user tenancy & zero telemetry.
            </div>
          </div>
        </div>
      </>
    );
  }

  // =========================================================
  // AUTHENTICATED APPLICATION
  // =========================================================
  const initials = currentUser?.name
    ? currentUser.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <>
      <div className="bg-subtle-grid" />
      <div className="app-container">
        {/* Navigation Bar */}
        <header className="navbar">
          <div className="brand">
            <div className="brand-icon">
              <Sparkles size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="brand-title">FinPulse</span>
                <span className="brand-badge">Financial OS</span>
              </div>
            </div>
          </div>

          <nav className="nav-links">
            <button
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <BarChart3 size={15} /> Dashboard
            </button>
            <button
              className={`nav-btn ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              <CreditCard size={15} /> Ledger
            </button>
            <button
              className={`nav-btn ${activeTab === 'budgets' ? 'active' : ''}`}
              onClick={() => setActiveTab('budgets')}
            >
              <PiggyBank size={15} /> Budgets
            </button>
            <button
              className={`nav-btn ${activeTab === 'goals' ? 'active' : ''}`}
              onClick={() => setActiveTab('goals')}
            >
              <Target size={15} /> Savings Vaults
            </button>
            <button
              className={`nav-btn ${activeTab === 'subscriptions' ? 'active' : ''}`}
              onClick={() => setActiveTab('subscriptions')}
            >
              <Calendar size={15} /> Bill Calendar
            </button>
            <button
              className={`nav-btn ${activeTab === 'simulator' ? 'active' : ''}`}
              onClick={() => setActiveTab('simulator')}
            >
              <TrendingUp size={15} /> Wealth Simulator
            </button>
            <button
              className={`nav-btn ${activeTab === 'statements' ? 'active' : ''}`}
              onClick={() => setActiveTab('statements')}
            >
              <FileText size={15} /> Statements & CSV
            </button>
          </nav>

          <div className="nav-actions">
            <div className="month-picker-container">
              <Calendar size={14} style={{ color: '#94a3b8' }} />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>

            {/* Currency Switcher */}
            <select
              className="select-filter"
              style={{ padding: '0.35rem 0.55rem', fontSize: '0.8rem' }}
              value={currentUser?.currency || 'INR'}
              onChange={(e) => handleCurrencyChange(e.target.value)}
              title="Change Account Currency"
            >
              <option value="INR">₹ INR</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
            </select>

            {/* User Profile Pill & Logout */}
            <div className="user-profile-menu">
              <div className="user-avatar">{initials}</div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.785rem', fontWeight: 600, lineHeight: 1.2 }}>{currentUser?.name}</span>
                <span style={{ fontSize: '0.675rem', color: '#94a3b8', lineHeight: 1.1 }}>{currentUser?.email}</span>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                style={{ padding: '0.2rem 0.45rem', marginLeft: '0.25rem' }}
                onClick={handleLogout}
                title="Sign Out"
              >
                <LogOut size={12} />
              </button>
            </div>

            <button className="btn btn-primary" onClick={() => setIsAddTxOpen(true)}>
              <Plus size={15} /> Add Entry
            </button>
          </div>
        </header>

        {/* Global Key Metrics Header */}
        <section className="metrics-grid">
          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Lifetime Net Worth</span>
              <div className="metric-icon-box">
                <Wallet size={17} />
              </div>
            </div>
            <div className="metric-value">
              {formatMoney(summary.lifetimeBalance)}
            </div>
            <div className="metric-sub">
              Your cumulative financial balance
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Monthly Inflow</span>
              <div className="metric-icon-box" style={{ color: '#10b981' }}>
                <TrendingUp size={17} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#10b981' }}>
              +{formatMoney(summary.totalIncome)}
            </div>
            <div className="metric-sub">
              Earned in {selectedMonth}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Monthly Outflow</span>
              <div className="metric-icon-box" style={{ color: '#f43f5e' }}>
                <TrendingDown size={17} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#f43f5e' }}>
              -{formatMoney(summary.totalExpense)}
            </div>
            <div className="metric-sub">
              Across {summary.transactionCount || 0} personal records
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-header">
              <span className="metric-label">Net Saved & Rate</span>
              <div className="metric-icon-box" style={{ color: '#06b6d4' }}>
                <PiggyBank size={17} />
              </div>
            </div>
            <div className="metric-value">
              {formatMoney(summary.netSavings)}
            </div>
            <div className="metric-sub">
              <span className={`badge-tag ${summary.savingsRate >= 20 ? 'badge-emerald' : 'badge-amber'}`}>
                {summary.savingsRate || 0}% Savings Rate
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* TAB 1: EXECUTIVE DASHBOARD */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="charts-grid">
              {/* Cash Flow Bar Chart */}
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">
                    <BarChart3 size={17} style={{ color: '#6366f1' }} />
                    Month-over-Month Cash Flow ({selectedMonth.split('-')[0]})
                  </div>
                  <div className="panel-actions">
                    <button className="btn btn-secondary btn-sm" onClick={handleProcessRecurring} title="Execute scheduled bills">
                      <RefreshCw size={13} /> Run Recurring
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => setIsStatementModalOpen(true)}>
                      <Printer size={13} /> Print Statement
                    </button>
                  </div>
                </div>

                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `${currencySymbol}${v/1000}k`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#131722',
                          borderColor: '#21283b',
                          borderRadius: '8px',
                          color: '#f8fafc',
                        }}
                        formatter={(val) => [formatMoney(val), '']}
                      />
                      <Legend wrapperStyle={{ paddingTop: 8 }} />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expense Breakdown Donut */}
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">
                    <PieChartIcon size={17} style={{ color: '#10b981' }} />
                    Expense Distribution
                  </div>
                </div>

                {categoryReport.categories.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', fontSize: '0.85rem' }}>
                    No recorded expenses for {selectedMonth}
                  </div>
                ) : (
                  <div>
                    <div style={{ width: '100%', height: 170 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={categoryReport.categories}
                            dataKey="total"
                            nameKey="categoryName"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={72}
                            paddingAngle={3}
                          >
                            {categoryReport.categories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#131722',
                              borderColor: '#21283b',
                              borderRadius: '8px',
                              color: '#fff',
                            }}
                            formatter={(val) => [formatMoney(val), 'Spent']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ maxHeight: '150px', overflowY: 'auto', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        {categoryReport.categories.slice(0, 4).map((c) => (
                          <div key={c.categoryId} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color }} />
                                {c.categoryName}
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                                {formatMoney(c.total)} ({c.percentage}%)
                              </span>
                            </div>
                            <div className="progress-track" style={{ height: '5px' }}>
                              <div className="progress-bar" style={{ width: `${c.percentage}%`, background: c.color }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Glance at Active Vaults & Upcoming Bills */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
              {/* Top Savings Vaults */}
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">
                    <Target size={16} style={{ color: '#06b6d4' }} />
                    Active Savings Vaults
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('goals')}>
                    View All &rarr;
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {goals.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', padding: '1rem 0', textAlign: 'center' }}>
                      No active vaults yet. Click to create your first savings goal!
                    </div>
                  ) : (
                    goals.slice(0, 3).map((g) => {
                      const pct = Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100));
                      return (
                        <div key={g.id} style={{ background: '#0e111a', border: '1px solid #21283b', padding: '0.75rem 0.95rem', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.85rem' }}>
                            <span style={{ fontWeight: 600 }}>{g.title}</span>
                            <span style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>{pct}%</span>
                          </div>
                          <div className="progress-track" style={{ height: '6px', marginBottom: '0.4rem' }}>
                            <div className="progress-bar" style={{ width: `${pct}%`, background: g.color || '#10b981' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8' }}>
                            <span>Saved: {formatMoney(g.savedAmount)}</span>
                            <span>Target: {formatMoney(g.targetAmount)}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Upcoming Fixed Bills */}
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">
                    <Calendar size={16} style={{ color: '#f59e0b' }} />
                    Upcoming Bills & Subscriptions
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('subscriptions')}>
                    Open Calendar &rarr;
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {subscriptions.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: '#64748b', padding: '1rem 0', textAlign: 'center' }}>
                      No tracked subscriptions. Add a recurring bill to see it here!
                    </div>
                  ) : (
                    subscriptions.slice(0, 3).map((s) => {
                      const isPaid = s.paidMonths?.includes(selectedMonth);
                      return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0e111a', border: '1px solid #21283b', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span style={{ background: '#1c2233', width: 30, height: 30, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: s.color }}>
                              {renderIcon(s.icon, 14)}
                            </span>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{s.name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Due on Day {s.dueDay} of month</div>
                            </div>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>{formatMoney(s.amount)}</div>
                            {isPaid ? (
                              <span className="badge-tag badge-emerald" style={{ fontSize: '0.685rem' }}>Paid</span>
                            ) : (
                              <button className="btn btn-secondary btn-sm" style={{ padding: '0.15rem 0.45rem', fontSize: '0.7rem', marginTop: '0.15rem' }} onClick={() => handlePaySubscription(s)}>
                                Pay Now
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Recent Transactions Snippet */}
            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-title">
                  <CreditCard size={17} style={{ color: '#06b6d4' }} />
                  Recent Ledger Entries
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('transactions')}>
                  Full Ledger &rarr;
                </button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Description</th>
                      <th>Payment Mode</th>
                      <th>Receipt</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 5).map((t) => (
                      <tr key={t.id}>
                        <td style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{t.date}</td>
                        <td><strong>{t.categoryName}</strong></td>
                        <td>
                          {t.note || '—'}
                          {t.isRecurring && (
                            <span className="badge-tag badge-amber" style={{ marginLeft: '0.4rem' }}>Recurring</span>
                          )}
                        </td>
                        <td>
                          <span style={{ background: '#1c2233', padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.75rem' }}>
                            {t.paymentMode}
                          </span>
                        </td>
                        <td>
                          {t.receiptUrl ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem', gap: '0.25rem' }}
                              onClick={() => setInspectReceipt(t)}
                            >
                              <Eye size={12} /> View
                            </button>
                          ) : (
                            <span style={{ color: '#475569', fontSize: '0.75rem' }}>None</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge-tag ${t.type === 'income' ? 'badge-emerald' : 'badge-rose'}`}>
                            {t.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                            {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.25rem 0.45rem' }}
                            onClick={() => handleDeleteTransaction(t.id)}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: TRANSACTIONS & LEDGER */}
        {/* ========================================================= */}
        {activeTab === 'transactions' && (
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">
                <CreditCard size={17} style={{ color: '#6366f1' }} />
                Personal Financial Ledger
              </div>
              <div className="panel-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setIsStatementModalOpen(true)}>
                  <Printer size={13} /> Printable Statement
                </button>
                <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                  <Download size={13} /> Export CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setIsAddTxOpen(true)}>
                  <Plus size={13} /> Add Entry
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="filter-bar">
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search notes, payment mode, or category..."
                  className="search-input"
                  style={{ paddingLeft: '2.2rem', width: '100%' }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select className="select-filter" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">All Types</option>
                <option value="expense">Expenses Only</option>
                <option value="income">Income Only</option>
              </select>

              <select className="select-filter" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Category</th>
                    <th>Notes & Description</th>
                    <th>Mode</th>
                    <th>Receipt / Bill</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading ledger records...</td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No transactions recorded. Click "Add Entry" to log your first transaction!
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id}>
                        <td style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{t.date}</td>
                        <td><strong>{t.categoryName}</strong></td>
                        <td>
                          {t.note || '—'}
                          {t.isRecurring && (
                            <span className="badge-tag badge-amber" style={{ marginLeft: '0.4rem' }}>Recurring</span>
                          )}
                        </td>
                        <td>
                          <span style={{ background: '#1c2233', padding: '0.15rem 0.45rem', borderRadius: 4, fontSize: '0.75rem' }}>
                            {t.paymentMode}
                          </span>
                        </td>
                        <td>
                          {t.receiptUrl ? (
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '0.2rem 0.45rem', fontSize: '0.75rem', gap: '0.25rem' }}
                              onClick={() => setInspectReceipt(t)}
                            >
                              <Eye size={12} /> {t.receiptName ? t.receiptName.slice(0, 12) + '...' : 'Attached'}
                            </button>
                          ) : (
                            <span style={{ color: '#475569', fontSize: '0.75rem' }}>None</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge-tag ${t.type === 'income' ? 'badge-emerald' : 'badge-rose'}`}>
                            {t.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                            {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.25rem 0.45rem' }}
                            onClick={() => handleDeleteTransaction(t.id)}
                            title="Delete"
                          >
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="pagination">
              <div>
                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} entries)
              </div>
              <div className="pagination-controls">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadTransactions(pagination.page - 1)}
                >
                  <ChevronLeft size={13} /> Prev
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadTransactions(pagination.page + 1)}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: CATEGORY BUDGETS */}
        {/* ========================================================= */}
        {activeTab === 'budgets' && (
          <div>
            <div className="panel-card" style={{ marginBottom: '1.25rem' }}>
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <PiggyBank size={17} style={{ color: '#10b981' }} />
                    Category Spending Caps & Real-Time Tracking ({selectedMonth})
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Calculated in real-time. Alerts trigger when you reach 80% or exceed limits.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: '1rem' }}>
              {budgets.map((b) => {
                const isOver = b.status === 'exceeded';
                const isWarn = b.status === 'warning';

                return (
                  <div key={b.id} className="panel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '8px',
                              background: b.color || '#6366f1',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '0.9rem',
                            }}
                          >
                            {b.name?.charAt(0)}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{b.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Cap: {b.budgetLimit > 0 ? formatMoney(b.budgetLimit) : 'None'}</div>
                          </div>
                        </div>

                        <div>
                          {isOver && <span className="badge-tag badge-rose"><AlertTriangle size={11} style={{ marginRight: 3 }} /> Exceeded</span>}
                          {isWarn && <span className="badge-tag badge-amber">Warning (80%+)</span>}
                          {!isOver && !isWarn && <span className="badge-tag badge-emerald"><CheckCircle size={11} style={{ marginRight: 3 }} /> Safe</span>}
                        </div>
                      </div>

                      <div style={{ margin: '0.85rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.3rem' }}>
                          <span style={{ color: '#94a3b8' }}>Spent: {formatMoney(b.spent)}</span>
                          <span style={{ fontWeight: 600, color: isOver ? '#f43f5e' : '#f8fafc' }}>{b.percentage}%</span>
                        </div>
                        <div className="progress-track" style={{ height: '8px' }}>
                          <div
                            className="progress-bar"
                            style={{
                              width: `${Math.min(b.percentage, 100)}%`,
                              background: isOver ? '#f43f5e' : isWarn ? '#f59e0b' : '#10b981',
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ fontSize: '0.775rem', color: '#94a3b8' }}>
                        {b.budgetLimit > 0 ? (
                          isOver ? (
                            <span style={{ color: '#f43f5e' }}>Exceeded by {formatMoney(b.spent - b.budgetLimit)}</span>
                          ) : (
                            <span style={{ color: '#10b981' }}>{formatMoney(b.remaining)} remaining buffer</span>
                          )
                        ) : (
                          <span>No spending cap established</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '1rem', paddingTop: '0.65rem', borderTop: '1px solid #1f283b', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setBudgetForm({ categoryId: b.id, name: b.name, limit: b.budgetLimit });
                          setIsEditBudgetOpen(true);
                        }}
                      >
                        <Edit2 size={11} /> Set Limit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: FINANCIAL GOALS & SAVINGS VAULTS */}
        {/* ========================================================= */}
        {activeTab === 'goals' && (
          <div>
            <div className="panel-card" style={{ marginBottom: '1.25rem' }}>
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <Target size={17} style={{ color: '#10b981' }} />
                    Personal Savings Vaults & Targets
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Lock away savings for designated objectives. Track pace, projected timeline, and deposit/withdraw on demand.
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setIsAddGoalOpen(true)}>
                  <Plus size={13} /> New Savings Vault
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '1.25rem' }}>
              {goals.map((g) => {
                const pct = Math.min(100, Math.round(((g.savedAmount || 0) / g.targetAmount) * 100));
                const remaining = Math.max(0, g.targetAmount - (g.savedAmount || 0));

                const targetD = new Date(g.targetDate);
                const diffTime = targetD.getTime() - new Date().getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                const monthsLeft = Math.max(1, Math.round(diffDays / 30.5));
                const monthlyPace = remaining > 0 ? Math.round(remaining / monthsLeft) : 0;

                return (
                  <div key={g.id} className="panel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <span style={{ width: 34, height: 34, borderRadius: 8, background: '#1c2233', display: 'flex', alignItems: 'center', justifyContent: 'center', color: g.color || '#10b981' }}>
                            {renderIcon(g.icon, 18)}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{g.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Target: {g.targetDate} ({diffDays > 0 ? `${diffDays} days left` : 'Due'})</div>
                          </div>
                        </div>
                        <button
                          className="btn btn-danger btn-sm"
                          style={{ padding: '0.2rem 0.4rem' }}
                          onClick={() => handleDeleteGoal(g.id)}
                          title="Remove Goal"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Saved Balance</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 700, color: '#10b981' }}>
                            {formatMoney(g.savedAmount)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Target Cap</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 600, color: '#f8fafc' }}>
                            {formatMoney(g.targetAmount)}
                          </div>
                        </div>
                      </div>

                      <div className="progress-track" style={{ height: '9px', marginBottom: '0.65rem' }}>
                        <div className="progress-bar" style={{ width: `${pct}%`, background: g.color || '#10b981' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.785rem', color: '#94a3b8', marginBottom: '0.85rem' }}>
                        <span>{pct}% funded</span>
                        {remaining > 0 ? (
                          <span>{formatMoney(monthlyPace)}/mo needed</span>
                        ) : (
                          <span style={{ color: '#10b981', fontWeight: 600 }}>Goal Complete! 🎉</span>
                        )}
                      </div>

                      {g.note && (
                        <div style={{ fontSize: '0.75rem', color: '#64748b', background: '#0e111a', padding: '0.5rem 0.65rem', borderRadius: 6, fontStyle: 'italic' }}>
                          "{g.note}"
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #1f283b' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => setDepositModal({ open: true, goal: g, amount: '', type: 'withdraw', note: '' })}
                      >
                        Withdraw
                      </button>
                      <button
                        className="btn btn-primary btn-sm"
                        style={{ flex: 1, justifyContent: 'center' }}
                        onClick={() => setDepositModal({ open: true, goal: g, amount: '', type: 'deposit', note: '' })}
                      >
                        + Deposit Funds
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: BILLS & SUBSCRIPTION CALENDAR */}
        {/* ========================================================= */}
        {activeTab === 'subscriptions' && (
          <div>
            <div className="panel-card" style={{ marginBottom: '1.25rem' }}>
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <Calendar size={17} style={{ color: '#f59e0b' }} />
                    Monthly Recurring Bills & Subscription Timeline
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Plot recurring charges on their due date of the month. Never miss a billing cycle or incur penalty fees.
                  </p>
                </div>
                <div className="panel-actions">
                  <div style={{ textAlign: 'right', marginRight: '0.75rem' }}>
                    <div style={{ fontSize: '0.725rem', color: '#94a3b8' }}>Total Monthly Recurring Burden</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#f43f5e' }}>
                      {formatMoney(Math.round(totalMonthlySubCost))}/month
                    </div>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={() => setIsAddSubOpen(true)}>
                    <Plus size={13} /> Add Bill / Sub
                  </button>
                </div>
              </div>

              {/* Day of Month Calendar Grid (1 - 31) */}
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Billing Schedule ({selectedMonth})
                </div>

                <div className="calendar-days-grid">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                    const dueSubs = subscriptions.filter((s) => s.dueDay === day && s.active);
                    const todayDay = new Date().getDate();
                    const isToday = day === todayDay;

                    return (
                      <div key={`day-${day}`} className={`calendar-day-cell ${isToday ? 'today' : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="calendar-day-num">{day}</span>
                          {isToday && <span style={{ fontSize: '0.65rem', color: '#6366f1', fontWeight: 600 }}>Today</span>}
                        </div>

                        <div>
                          {dueSubs.map((s) => {
                            const isPaid = s.paidMonths?.includes(selectedMonth);
                            return (
                              <div
                                key={s.id}
                                className="calendar-bill-pill"
                                style={{
                                  background: isPaid ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                                  color: isPaid ? '#10b981' : '#f59e0b',
                                  border: `1px solid ${isPaid ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                                }}
                                title={`${s.name} - ${formatMoney(s.amount)} (${isPaid ? 'Paid' : 'Upcoming'})`}
                              >
                                <span>{s.name}</span>
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatMoney(s.amount)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Subscriptions Table */}
            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-title">
                  <CreditCard size={17} style={{ color: '#6366f1' }} />
                  Active Subscriptions & Direct Bill Payments
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Service / Bill Name</th>
                      <th>Category</th>
                      <th>Due Day</th>
                      <th>Cycle</th>
                      <th>Auto-Pay</th>
                      <th>Amount</th>
                      <th>Status ({selectedMonth})</th>
                      <th style={{ textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscriptions.map((s) => {
                      const isPaid = s.paidMonths?.includes(selectedMonth);
                      return (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: s.color }}>{renderIcon(s.icon, 15)}</span>
                              <strong>{s.name}</strong>
                            </div>
                          </td>
                          <td>{s.category}</td>
                          <td style={{ fontFamily: 'var(--font-mono)' }}>Day {s.dueDay}</td>
                          <td>
                            <span style={{ textTransform: 'capitalize' }}>{s.billingCycle}</span>
                          </td>
                          <td>
                            {s.autoPay ? (
                              <span className="badge-tag badge-emerald">Enabled</span>
                            ) : (
                              <span className="badge-tag badge-amber">Manual</span>
                            )}
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            {formatMoney(s.amount)}
                          </td>
                          <td>
                            {isPaid ? (
                              <span className="badge-tag badge-emerald">Paid for {selectedMonth}</span>
                            ) : (
                              <span className="badge-tag badge-rose">Due for {selectedMonth}</span>
                            )}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
                              {!isPaid && (
                                <button
                                  className="btn btn-primary btn-sm"
                                  style={{ padding: '0.2rem 0.5rem' }}
                                  onClick={() => handlePaySubscription(s)}
                                >
                                  Mark Paid
                                </button>
                              )}
                              <button
                                className="btn btn-danger btn-sm"
                                style={{ padding: '0.2rem 0.45rem' }}
                                onClick={() => handleDeleteSubscription(s.id)}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: COMPOUND INTEREST & NET WORTH SIMULATOR */}
        {/* ========================================================= */}
        {activeTab === 'simulator' && (
          <div>
            <div className="panel-card" style={{ marginBottom: '1.25rem' }}>
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <TrendingUp size={17} style={{ color: '#06b6d4' }} />
                    Net Worth Growth & Compound Interest Simulator
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Simulate how regular monthly SIP contributions compound into substantial long-term wealth over time.
                  </p>
                </div>
              </div>

              {/* Sliders and Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '0.5rem' }}>
                <div className="sim-control-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                    <span style={{ color: '#94a3b8' }}>Initial Principal</span>
                    <strong style={{ fontFamily: 'var(--font-mono)' }}>{formatMoney(simInitial)}</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2000000"
                    step="25000"
                    className="sim-slider"
                    value={simInitial}
                    onChange={(e) => setSimInitial(Number(e.target.value))}
                  />
                </div>

                <div className="sim-control-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                    <span style={{ color: '#94a3b8' }}>Monthly SIP Deposit</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>{formatMoney(simMonthly)}/mo</strong>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="200000"
                    step="1000"
                    className="sim-slider"
                    value={simMonthly}
                    onChange={(e) => setSimMonthly(Number(e.target.value))}
                  />
                </div>

                <div className="sim-control-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                    <span style={{ color: '#94a3b8' }}>Expected Annual Return</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: '#06b6d4' }}>{simRate}% p.a.</strong>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="25"
                    step="0.5"
                    className="sim-slider"
                    value={simRate}
                    onChange={(e) => setSimRate(Number(e.target.value))}
                  />
                  <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem' }}>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem' }} onClick={() => setSimRate(7)}>FD (7%)</button>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem' }} onClick={() => setSimRate(12)}>Nifty (12%)</button>
                    <button className="btn btn-secondary btn-sm" style={{ padding: '0.15rem 0.35rem', fontSize: '0.7rem' }} onClick={() => setSimRate(15)}>Midcap (15%)</button>
                  </div>
                </div>

                <div className="sim-control-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem' }}>
                    <span style={{ color: '#94a3b8' }}>Time Horizon</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: '#6366f1' }}>{simYears} Years</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    className="sim-slider"
                    value={simYears}
                    onChange={(e) => setSimYears(Number(e.target.value))}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                    <input
                      type="checkbox"
                      id="adjInf"
                      checked={adjustInflation}
                      onChange={(e) => setAdjustInflation(e.target.checked)}
                    />
                    <label htmlFor="adjInf" style={{ fontSize: '0.75rem', color: '#94a3b8', cursor: 'pointer' }}>
                      Adjust for 6% inflation
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Results KPI Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
              <div className="panel-card" style={{ borderLeft: '4px solid #64748b' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Principal Invested</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 700, margin: '0.25rem 0' }}>
                  {formatMoney(simResults.totalInvested)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Your hard-earned contributions</div>
              </div>

              <div className="panel-card" style={{ borderLeft: '4px solid #10b981' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Compound Wealth Gained</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 700, color: '#10b981', margin: '0.25rem 0' }}>
                  +{formatMoney(simResults.wealthGain)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pure exponential interest returns</div>
              </div>

              <div className="panel-card" style={{ borderLeft: '4px solid #06b6d4' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase' }}>Future Estimated Net Worth</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.65rem', fontWeight: 700, color: '#06b6d4', margin: '0.25rem 0' }}>
                  {formatMoney(simResults.futureValue)}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Portfolio value after {simYears} years</div>
              </div>
            </div>

            {/* Wealth Trajectory Area Chart */}
            <div className="panel-card" style={{ marginBottom: '1.25rem' }}>
              <div className="panel-header">
                <div className="panel-title">
                  <TrendingUp size={17} style={{ color: '#10b981' }} />
                  Compounding Trajectory Curve
                </div>
              </div>

              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <AreaChart data={simResults.schedule} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                    <XAxis dataKey="year" stroke="#64748b" tick={{ fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8' }} tickFormatter={(v) => `${currencySymbol}${v >= 10000000 ? (v/10000000).toFixed(1) + 'Cr' : (v/100000).toFixed(1) + 'L'}`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131722',
                        borderColor: '#21283b',
                        borderRadius: '8px',
                        color: '#f8fafc',
                      }}
                      formatter={(val) => [formatMoney(val), '']}
                    />
                    <Legend wrapperStyle={{ paddingTop: 8 }} />
                    <Area type="monotone" dataKey="futureValue" name="Total Net Worth" stroke="#06b6d4" fill="rgba(6, 182, 212, 0.15)" strokeWidth={2} />
                    <Area type="monotone" dataKey="totalInvested" name="Invested Principal" stroke="#64748b" fill="rgba(100, 116, 139, 0.15)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Annual Milestone Schedule Table */}
            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-title">
                  <Clock size={16} style={{ color: '#6366f1' }} />
                  Year-by-Year Wealth Progression
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Total Invested</th>
                      <th>Accumulated Wealth Growth</th>
                      <th style={{ textAlign: 'right' }}>Portfolio Net Worth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simResults.schedule.map((row, idx) => (
                      <tr key={`sim-row-${idx}`}>
                        <td><strong>{row.year}</strong></td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{formatMoney(row.totalInvested)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#10b981' }}>+{formatMoney(row.wealthGain)}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', textAlign: 'right', fontWeight: 600 }}>{formatMoney(row.futureValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: STATEMENTS & CSV IMPORT/EXPORT */}
        {/* ========================================================= */}
        {activeTab === 'statements' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Printable Bank Statement Launcher */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <Printer size={17} style={{ color: '#10b981' }} />
                    Download Monthly Banking Statement (PDF)
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Generate an official, branded financial account statement for {selectedMonth} suitable for audit, tax filing, or record-keeping.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => setIsStatementModalOpen(true)}>
                  <Printer size={15} /> Preview & Print Statement PDF
                </button>
              </div>
            </div>

            {/* Bank Statement CSV Import Engine */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <Upload size={17} style={{ color: '#6366f1' }} />
                    Bank Statement CSV Import
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Import transaction statements from HDFC, SBI, ICICI, or payment apps into your personal FinPulse ledger.
                  </p>
                </div>
                {csvImportData.length > 0 && (
                  <button className="btn btn-primary btn-sm" onClick={handleConfirmCsvImport}>
                    Confirm Import ({csvImportData.length} entries)
                  </button>
                )}
              </div>

              <div className="upload-drop-zone">
                <input
                  type="file"
                  accept=".csv"
                  id="csvFile"
                  style={{ display: 'none' }}
                  onChange={handleCsvFileUpload}
                />
                <label htmlFor="csvFile" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                  <Upload size={28} style={{ color: '#6366f1' }} />
                  <div style={{ fontWeight: 600 }}>{csvFileName || 'Click to select Bank Statement CSV'}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Format: Date, Description, Amount, Type</div>
                </label>
              </div>

              {csvImportData.length > 0 && (
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.825rem', fontWeight: 600, marginBottom: '0.5rem', color: '#10b981' }}>
                    Previewing {csvImportData.length} Parsed Transactions:
                  </div>
                  <div className="table-wrapper" style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Description</th>
                          <th>Type</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvImportData.slice(0, 10).map((row, i) => (
                          <tr key={`csv-${i}`}>
                            <td style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>{row.date}</td>
                            <td>{row.note}</td>
                            <td>
                              <span className={`badge-tag ${row.type === 'income' ? 'badge-emerald' : 'badge-rose'}`}>
                                {row.type}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{formatMoney(row.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Export CSV Section */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <Download size={17} style={{ color: '#06b6d4' }} />
                    Export Full Ledger Data
                  </div>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                    Download a raw spreadsheet of all categorized transactions with timestamps and payment modes.
                  </p>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                  <Download size={14} /> Download CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: ADD TRANSACTION & RECEIPT UPLOAD */}
        {/* ========================================================= */}
        {isAddTxOpen && (
          <div className="modal-overlay" onClick={() => setIsAddTxOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">New Financial Entry</div>
                <button className="modal-close" onClick={() => setIsAddTxOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddTransactionSubmit}>
                <div className="modal-body">
                  <div className="type-toggle-group">
                    <button
                      type="button"
                      className={`type-toggle-btn ${txForm.type === 'expense' ? 'active-expense' : ''}`}
                      onClick={() => setTxForm({ ...txForm, type: 'expense', categoryId: '' })}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      className={`type-toggle-btn ${txForm.type === 'income' ? 'active-income' : ''}`}
                      onClick={() => setTxForm({ ...txForm, type: 'income', categoryId: '' })}
                    >
                      Income
                    </button>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Amount ({currencySymbol})</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 2400"
                      className="form-input"
                      value={txForm.amount}
                      onChange={(e) => setTxForm({ ...txForm, amount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      required
                      value={txForm.categoryId}
                      onChange={(e) => setTxForm({ ...txForm, categoryId: e.target.value })}
                    >
                      <option value="">Select a category...</option>
                      {filteredCategoriesForTx.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Date</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={txForm.date}
                        onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Payment Mode</label>
                      <select
                        className="form-select"
                        value={txForm.paymentMode}
                        onChange={(e) => setTxForm({ ...txForm, paymentMode: e.target.value })}
                      >
                        <option value="UPI">UPI</option>
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                        <option value="Net Banking">Net Banking</option>
                        <option value="Cash">Cash</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Description / Merchant</label>
                    <input
                      type="text"
                      placeholder="e.g. Blue Tokai Coffee / AWS Hosting"
                      className="form-input"
                      value={txForm.note}
                      onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                    />
                  </div>

                  {/* Receipt & Invoice Attachment */}
                  <div className="form-group">
                    <label className="form-label">Attach Receipt / Invoice (Optional)</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        id="receiptUpload"
                        style={{ display: 'none' }}
                        onChange={handleReceiptFileChange}
                      />
                      <label htmlFor="receiptUpload" className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
                        <Upload size={13} /> {txForm.receiptName ? 'Change Receipt' : 'Upload Receipt'}
                      </label>
                      {txForm.receiptName && (
                        <span style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <CheckCircle size={13} /> {txForm.receiptName.slice(0, 16)}...
                        </span>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={txForm.isRecurring}
                      onChange={(e) => setTxForm({ ...txForm, isRecurring: e.target.checked })}
                    />
                    <label htmlFor="isRecurring" style={{ fontSize: '0.825rem', cursor: 'pointer', color: '#cbd5e1' }}>
                      Mark as recurring monthly expense / income
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddTxOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save to Ledger
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: RECEIPT INSPECTOR */}
        {/* ========================================================= */}
        {inspectReceipt && (
          <div className="modal-overlay" onClick={() => setInspectReceipt(null)}>
            <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">Receipt: {inspectReceipt.note || inspectReceipt.categoryName}</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    {inspectReceipt.date} • {formatMoney(inspectReceipt.amount)} ({inspectReceipt.paymentMode})
                  </div>
                </div>
                <button className="modal-close" onClick={() => setInspectReceipt(null)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ alignItems: 'center', justifyContent: 'center', background: '#090a0f', padding: '1.5rem' }}>
                {inspectReceipt.receiptUrl ? (
                  <img
                    src={inspectReceipt.receiptUrl}
                    alt="Receipt Attachment"
                    style={{ maxWidth: '100%', maxHeight: '480px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #21283b' }}
                  />
                ) : (
                  <div style={{ color: '#64748b' }}>No receipt image available.</div>
                )}
              </div>

              <div className="modal-footer">
                <a href={inspectReceipt.receiptUrl} download={`receipt-${inspectReceipt.id}.png`} className="btn btn-secondary btn-sm">
                  <Download size={13} /> Download File
                </a>
                <button className="btn btn-primary btn-sm" onClick={() => setInspectReceipt(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: PRINTABLE MONTHLY STATEMENT (PDF) */}
        {/* ========================================================= */}
        {isStatementModalOpen && (
          <div className="modal-overlay" onClick={() => setIsStatementModalOpen(false)}>
            <div className="modal-content printable-sheet" style={{ maxWidth: '780px' }} onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <div className="modal-title">Monthly Account Statement</div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                    Account Holder: <strong>{currentUser?.name}</strong> ({currentUser?.email}) • Period: {selectedMonth}
                  </div>
                </div>
                <button className="modal-close" onClick={() => setIsStatementModalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body" style={{ gap: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #21283b', paddingBottom: '1rem' }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 800 }}>FinPulse Wealth Operating System</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Official Ledger Summary Statement</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8' }}>
                    <div>Report Date: {new Date().toISOString().slice(0, 10)}</div>
                    <div>Account Currency: {currentUser?.currency || 'INR'} ({currencySymbol})</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: '#0e111a', border: '1px solid #21283b', padding: '0.75rem', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Inflows</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                      +{formatMoney(summary.totalIncome)}
                    </div>
                  </div>
                  <div style={{ background: '#0e111a', border: '1px solid #21283b', padding: '0.75rem', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Total Outflows</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f43f5e', fontFamily: 'var(--font-mono)' }}>
                      -{formatMoney(summary.totalExpense)}
                    </div>
                  </div>
                  <div style={{ background: '#0e111a', border: '1px solid #21283b', padding: '0.75rem', borderRadius: 8 }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>Net Surplus / Savings</div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#06b6d4', fontFamily: 'var(--font-mono)' }}>
                      {formatMoney(summary.netSavings)}
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.4rem', textTransform: 'uppercase' }}>Itemized Ledger Entries</div>
                  <div className="table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Category</th>
                          <th>Description</th>
                          <th>Payment Mode</th>
                          <th style={{ textAlign: 'right' }}>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t) => (
                          <tr key={`stmt-${t.id}`}>
                            <td style={{ fontFamily: 'var(--font-mono)' }}>{t.date}</td>
                            <td>{t.categoryName}</td>
                            <td>{t.note || '—'}</td>
                            <td>{t.paymentMode}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                              {t.type === 'income' ? '+' : '-'}{formatMoney(t.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsStatementModalOpen(false)}>
                  Close
                </button>
                <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                  <Printer size={14} /> Print / Save as PDF
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: CREATE SAVINGS VAULT / GOAL */}
        {/* ========================================================= */}
        {isAddGoalOpen && (
          <div className="modal-overlay" onClick={() => setIsAddGoalOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">New Savings Vault</div>
                <button className="modal-close" onClick={() => setIsAddGoalOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateGoalSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Goal Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Emergency Fund (6 Months)"
                      className="form-input"
                      value={goalForm.title}
                      onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Target Amount ({currencySymbol})</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 150000"
                        className="form-input"
                        value={goalForm.targetAmount}
                        onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Initial Seed ({currencySymbol})</label>
                      <input
                        type="number"
                        placeholder="e.g. 25000"
                        className="form-input"
                        value={goalForm.savedAmount}
                        onChange={(e) => setGoalForm({ ...goalForm, savedAmount: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Target Completion Date</label>
                      <input
                        type="date"
                        required
                        className="form-input"
                        value={goalForm.targetDate}
                        onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Icon / Theme</label>
                      <select
                        className="form-select"
                        value={goalForm.icon}
                        onChange={(e) => setGoalForm({ ...goalForm, icon: e.target.value })}
                      >
                        <option value="ShieldCheck">Shield (Emergency)</option>
                        <option value="Laptop">Laptop (Tech)</option>
                        <option value="Plane">Plane (Travel)</option>
                        <option value="HeartPulse">Heart (Health)</option>
                        <option value="Home">Home (Property)</option>
                        <option value="PiggyBank">Piggy Bank</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Notes & Purpose</label>
                    <input
                      type="text"
                      placeholder="e.g. Overnight liquid mutual fund allocation"
                      className="form-input"
                      value={goalForm.note}
                      onChange={(e) => setGoalForm({ ...goalForm, note: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddGoalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Vault
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: DEPOSIT / WITHDRAW TO GOAL VAULT */}
        {/* ========================================================= */}
        {depositModal.open && (
          <div className="modal-overlay" onClick={() => setDepositModal({ open: false, goal: null, amount: '', type: 'deposit', note: '' })}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">
                  {depositModal.type === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}: {depositModal.goal?.title}
                </div>
                <button className="modal-close" onClick={() => setDepositModal({ open: false, goal: null, amount: '', type: 'deposit', note: '' })}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleGoalDepositSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Action</label>
                    <div className="type-toggle-group">
                      <button
                        type="button"
                        className={`type-toggle-btn ${depositModal.type === 'deposit' ? 'active-income' : ''}`}
                        onClick={() => setDepositModal({ ...depositModal, type: 'deposit' })}
                      >
                        + Deposit to Vault
                      </button>
                      <button
                        type="button"
                        className={`type-toggle-btn ${depositModal.type === 'withdraw' ? 'active-expense' : ''}`}
                        onClick={() => setDepositModal({ ...depositModal, type: 'withdraw' })}
                      >
                        - Withdraw from Vault
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Amount ({currencySymbol})</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 10000"
                      className="form-input"
                      value={depositModal.amount}
                      onChange={(e) => setDepositModal({ ...depositModal, amount: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Note / Reference</label>
                    <input
                      type="text"
                      placeholder="e.g. November monthly surplus allocation"
                      className="form-input"
                      value={depositModal.note}
                      onChange={(e) => setDepositModal({ ...depositModal, note: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setDepositModal({ open: false, goal: null, amount: '', type: 'deposit', note: '' })}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Confirm {depositModal.type === 'deposit' ? 'Deposit' : 'Withdrawal'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: CREATE SUBSCRIPTION */}
        {/* ========================================================= */}
        {isAddSubOpen && (
          <div className="modal-overlay" onClick={() => setIsAddSubOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Track Recurring Bill / Subscription</div>
                <button className="modal-close" onClick={() => setIsAddSubOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateSubSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label className="form-label">Bill / Subscription Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Spotify Family / Electricity"
                      className="form-input"
                      value={subForm.name}
                      onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Amount ({currencySymbol})</label>
                      <input
                        type="number"
                        required
                        placeholder="e.g. 649"
                        className="form-input"
                        value={subForm.amount}
                        onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Due Day of Month (1 - 31)</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        required
                        className="form-input"
                        value={subForm.dueDay}
                        onChange={(e) => setSubForm({ ...subForm, dueDay: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select
                        className="form-select"
                        value={subForm.category}
                        onChange={(e) => setSubForm({ ...subForm, category: e.target.value })}
                      >
                        <option value="Entertainment">Entertainment</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Health">Health & Fitness</option>
                        <option value="Software">Software & Cloud</option>
                        <option value="Housing">Housing & Rent</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Icon</label>
                      <select
                        className="form-select"
                        value={subForm.icon}
                        onChange={(e) => setSubForm({ ...subForm, icon: e.target.value })}
                      >
                        <option value="Film">Film (Streaming)</option>
                        <option value="Music">Music</option>
                        <option value="Wifi">Wifi (Broadband)</option>
                        <option value="Zap">Zap (Power / Electric)</option>
                        <option value="Dumbbell">Dumbbell (Gym)</option>
                        <option value="Code">Code (SaaS / Tools)</option>
                        <option value="Home">Home (Rent)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="subAutoPay"
                      checked={subForm.autoPay}
                      onChange={(e) => setSubForm({ ...subForm, autoPay: e.target.checked })}
                    />
                    <label htmlFor="subAutoPay" style={{ fontSize: '0.825rem', cursor: 'pointer', color: '#cbd5e1' }}>
                      Auto-Debit is active on bank card
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddSubOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Start Tracking
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* MODAL: EDIT BUDGET */}
        {/* ========================================================= */}
        {isEditBudgetOpen && (
          <div className="modal-overlay" onClick={() => setIsEditBudgetOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Set Monthly Budget Limit</div>
                <button className="modal-close" onClick={() => setIsEditBudgetOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleUpdateBudgetSubmit}>
                <div className="modal-body">
                  <p style={{ fontSize: '0.835rem', color: '#94a3b8' }}>
                    Configure the monthly spending ceiling for <strong>{budgetForm.name}</strong>.
                  </p>

                  <div className="form-group">
                    <label className="form-label">Monthly Limit ({currencySymbol})</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g. 15000"
                      className="form-input"
                      value={budgetForm.limit}
                      onChange={(e) => setBudgetForm({ ...budgetForm, limit: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditBudgetOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update Budget
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Global Toast */}
        {toast && (
          <div className="toast-msg">
            <Sparkles size={15} style={{ color: '#10b981' }} />
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </>
  );
}
