import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Plus,
  Download,
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
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  CreditCard,
  Edit2
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
  Cell
} from 'recharts';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [toast, setToast] = useState(null);

  // Data states
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

  // Transactions list & filter states
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
  });

  const [isEditBudgetOpen, setIsEditBudgetOpen] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ categoryId: '', name: '', limit: 0 });

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Load Categories
  const loadCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Load Summary
  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/summary?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedMonth]);

  // Load Category Report
  const loadCategoryReport = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/by-category?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setCategoryReport(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedMonth]);

  // Load Monthly Trends
  const loadMonthlyTrends = useCallback(async () => {
    try {
      const year = selectedMonth.split('-')[0] || '2026';
      const res = await fetch(`/api/reports/monthly-trend?year=${year}`);
      if (res.ok) {
        const data = await res.json();
        setMonthlyTrends(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedMonth]);

  // Load Budgets
  const loadBudgets = useCallback(async () => {
    try {
      const res = await fetch(`/api/budgets?month=${selectedMonth}`);
      if (res.ok) {
        const data = await res.json();
        setBudgets(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedMonth]);

  // Load Transactions
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
      const res = await fetch(`/api/transactions?${params.toString()}`);
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
  }, [typeFilter, categoryFilter, search]);

  // Initial load
  useEffect(() => {
    loadCategories();
  }, []);

  // When selectedMonth changes
  useEffect(() => {
    loadSummary();
    loadCategoryReport();
    loadMonthlyTrends();
    loadBudgets();
  }, [selectedMonth, loadSummary, loadCategoryReport, loadMonthlyTrends, loadBudgets]);

  // When filters or tab change
  useEffect(() => {
    if (activeTab === 'transactions' || activeTab === 'dashboard') {
      loadTransactions(1);
    }
  }, [activeTab, loadTransactions]);

  // Handle Create Transaction
  const handleAddTransactionSubmit = async (e) => {
    e.preventDefault();
    if (!txForm.amount || !txForm.categoryId) {
      showToast('Please fill in amount and category', 'error');
      return;
    }

    const matchedCat = categories.find((c) => c.id === txForm.categoryId);
    const payload = {
      ...txForm,
      amount: Number(txForm.amount),
      categoryName: matchedCat ? matchedCat.name : 'Other',
    };

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Transaction recorded successfully!', 'success');
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
    } catch (err) {
      showToast('Network error while adding transaction', 'error');
    }
  };

  // Handle Delete Transaction
  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Delete this transaction?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Transaction deleted', 'success');
        loadSummary();
        loadCategoryReport();
        loadMonthlyTrends();
        loadBudgets();
        loadTransactions(pagination.page);
      }
    } catch (err) {
      showToast('Failed to delete transaction', 'error');
    }
  };

  // Handle Budget Update
  const handleUpdateBudgetSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/budgets/${budgetForm.categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ budgetLimit: Number(budgetForm.limit) }),
      });
      if (res.ok) {
        showToast(`Budget updated for ${budgetForm.name}`, 'success');
        setIsEditBudgetOpen(false);
        loadBudgets();
        loadCategoryReport();
      }
    } catch (err) {
      showToast('Failed to update budget limit', 'error');
    }
  };

  // Run Recurring Simulation
  const handleProcessRecurring = async () => {
    try {
      const res = await fetch('/api/recurring/process', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        showToast(data.message, 'success');
        loadSummary();
        loadCategoryReport();
        loadMonthlyTrends();
        loadBudgets();
        loadTransactions(1);
      }
    } catch (e) {
      showToast('Failed to execute recurring job', 'error');
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    window.open('/api/reports/export', '_blank');
  };

  const filteredCategoriesForTx = categories.filter((c) => c.type === txForm.type);

  return (
    <>
      <div className="bg-ambient" />
      <div className="app-container">
        {/* Navigation Bar */}
        <header className="navbar">
          <div className="brand">
            <div className="brand-icon">
              <Sparkles size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span className="brand-title">FinPulse</span>
                <span className="brand-badge">MongoDB v8</span>
              </div>
            </div>
          </div>

          <nav className="nav-links">
            <button
              className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <BarChart3 size={16} /> Dashboard
            </button>
            <button
              className={`nav-btn ${activeTab === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveTab('transactions')}
            >
              <CreditCard size={16} /> Transactions
            </button>
            <button
              className={`nav-btn ${activeTab === 'budgets' ? 'active' : ''}`}
              onClick={() => setActiveTab('budgets')}
            >
              <PiggyBank size={16} /> Budgets
            </button>
            <button
              className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <PieChartIcon size={16} /> Reports & Analytics
            </button>
          </nav>

          <div className="nav-actions">
            <div className="month-picker-container">
              <Calendar size={15} style={{ color: '#94a3b8' }} />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={() => setIsAddTxOpen(true)}>
              <Plus size={16} /> Add Transaction
            </button>
          </div>
        </header>

        {/* Global Key Financial Metrics Banner */}
        <section className="metrics-grid">
          <div className="metric-card" style={{ '--card-accent': '#6366f1' }}>
            <div className="metric-header">
              <span className="metric-label">Lifetime Balance</span>
              <div className="metric-icon-box">
                <Wallet size={19} />
              </div>
            </div>
            <div className="metric-value">
              ₹{summary.lifetimeBalance?.toLocaleString('en-IN') || 0}
            </div>
            <div className="metric-sub">
              Total cumulative net worth tracked
            </div>
          </div>

          <div className="metric-card" style={{ '--card-accent': '#10b981' }}>
            <div className="metric-header">
              <span className="metric-label">Monthly Income</span>
              <div className="metric-icon-box" style={{ color: '#10b981' }}>
                <TrendingUp size={19} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#10b981' }}>
              +₹{summary.totalIncome?.toLocaleString('en-IN') || 0}
            </div>
            <div className="metric-sub">
              For {selectedMonth}
            </div>
          </div>

          <div className="metric-card" style={{ '--card-accent': '#f43f5e' }}>
            <div className="metric-header">
              <span className="metric-label">Monthly Expenses</span>
              <div className="metric-icon-box" style={{ color: '#f43f5e' }}>
                <TrendingDown size={19} />
              </div>
            </div>
            <div className="metric-value" style={{ color: '#f43f5e' }}>
              -₹{summary.totalExpense?.toLocaleString('en-IN') || 0}
            </div>
            <div className="metric-sub">
              Across {summary.transactionCount || 0} transactions
            </div>
          </div>

          <div className="metric-card" style={{ '--card-accent': '#06b6d4' }}>
            <div className="metric-header">
              <span className="metric-label">Net Savings & Rate</span>
              <div className="metric-icon-box" style={{ color: '#06b6d4' }}>
                <PiggyBank size={19} />
              </div>
            </div>
            <div className="metric-value">
              ₹{summary.netSavings?.toLocaleString('en-IN') || 0}
            </div>
            <div className="metric-sub">
              <span className={`badge-tag ${summary.savingsRate >= 20 ? 'badge-emerald' : 'badge-amber'}`}>
                {summary.savingsRate || 0}% Savings Rate
              </span>
            </div>
          </div>
        </section>

        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div>
            <div className="charts-grid">
              {/* Monthly Cash Flow Chart */}
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">
                    <BarChart3 size={18} style={{ color: '#6366f1' }} />
                    Month-over-Month Cash Flow ({selectedMonth.split('-')[0]})
                  </div>
                  <div className="panel-actions">
                    <button className="btn btn-secondary btn-sm" onClick={handleProcessRecurring} title="Simulate monthly scheduled recurring bills">
                      <RefreshCw size={13} /> Run Recurring
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                      <Download size={13} /> Export CSV
                    </button>
                  </div>
                </div>

                <div style={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={monthlyTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                      <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                      <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(v) => `₹${v/1000}k`} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#121826',
                          borderColor: '#1f293d',
                          borderRadius: '10px',
                          color: '#f8fafc',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        }}
                        formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, '']}
                      />
                      <Legend wrapperStyle={{ paddingTop: 10 }} />
                      <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Category Breakdown Donut / Overview */}
              <div className="panel-card">
                <div className="panel-header">
                  <div className="panel-title">
                    <PieChartIcon size={18} style={{ color: '#10b981' }} />
                    Category Expense Distribution
                  </div>
                </div>

                {categoryReport.categories.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}>
                    No expense data found for {selectedMonth}
                  </div>
                ) : (
                  <div>
                    <div style={{ width: '100%', height: 180 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie
                            data={categoryReport.categories}
                            dataKey="total"
                            nameKey="categoryName"
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={75}
                            paddingAngle={4}
                          >
                            {categoryReport.categories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color || '#6366f1'} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#121826',
                              borderColor: '#1f293d',
                              borderRadius: '8px',
                              color: '#fff',
                            }}
                            formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, 'Spent']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div style={{ maxHeight: '160px', overflowY: 'auto', marginTop: '0.5rem' }}>
                      <div className="category-progress-list">
                        {categoryReport.categories.slice(0, 4).map((c) => (
                          <div key={c.categoryId} className="category-progress-item">
                            <div className="category-progress-meta">
                              <div className="category-name-group">
                                <span className="category-color-dot" style={{ backgroundColor: c.color }} />
                                <span>{c.categoryName}</span>
                              </div>
                              <span className="category-amounts">₹{c.total?.toLocaleString('en-IN')} ({c.percentage}%)</span>
                            </div>
                            <div className="progress-track">
                              <div
                                className="progress-bar"
                                style={{
                                  width: `${Math.min(c.percentage, 100)}%`,
                                  backgroundColor: c.color,
                                }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Transactions Snippet */}
            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-title">
                  <CreditCard size={18} style={{ color: '#06b6d4' }} />
                  Recent Transactions
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setActiveTab('transactions')}>
                  View All &rarr;
                </button>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Category</th>
                      <th>Note / Description</th>
                      <th>Payment Mode</th>
                      <th>Type</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                      <th style={{ textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.slice(0, 5).map((t) => (
                      <tr key={t.id}>
                        <td style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{t.date}</td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{t.categoryName}</span>
                        </td>
                        <td>
                          {t.note || '—'}
                          {t.isRecurring && (
                            <span className="badge-tag badge-amber" style={{ marginLeft: '0.5rem' }}>
                              Recurring
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ background: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                            {t.paymentMode}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-tag ${t.type === 'income' ? 'badge-emerald' : 'badge-rose'}`}>
                            {t.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                            {t.type === 'income' ? '+' : '-'}₹{t.amount?.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.25rem 0.5rem' }}
                            onClick={() => handleDeleteTransaction(t.id)}
                            title="Delete transaction"
                          >
                            <Trash2 size={13} />
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

        {/* TAB 2: TRANSACTIONS (CRUD, SEARCH, PAGINATION) */}
        {activeTab === 'transactions' && (
          <div className="panel-card">
            <div className="panel-header">
              <div className="panel-title">
                <CreditCard size={18} style={{ color: '#6366f1' }} />
                All Transactions
              </div>
              <div className="panel-actions">
                <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                  <Download size={13} /> Export CSV
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => setIsAddTxOpen(true)}>
                  <Plus size={13} /> Add New
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="filter-bar">
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  placeholder="Search by notes, payment mode, or category..."
                  className="search-input"
                  style={{ paddingLeft: '2.4rem', width: '100%' }}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <select
                className="select-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="expense">Expenses Only</option>
                <option value="income">Income Only</option>
              </select>

              <select
                className="select-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
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
                    <th>Notes</th>
                    <th>Payment Mode</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Amount</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2rem' }}>Loading transactions...</td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                        No transactions match your query.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((t) => (
                      <tr key={t.id}>
                        <td style={{ color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>{t.date}</td>
                        <td>
                          <span style={{ fontWeight: 600 }}>{t.categoryName}</span>
                        </td>
                        <td>
                          {t.note || '—'}
                          {t.isRecurring && (
                            <span className="badge-tag badge-amber" style={{ marginLeft: '0.5rem' }}>
                              Recurring
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ background: '#1e293b', padding: '0.2rem 0.5rem', borderRadius: '6px', fontSize: '0.8rem' }}>
                            {t.paymentMode}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-tag ${t.type === 'income' ? 'badge-emerald' : 'badge-rose'}`}>
                            {t.type.toUpperCase()}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                            {t.type === 'income' ? '+' : '-'}₹{t.amount?.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            className="btn btn-danger btn-sm"
                            style={{ padding: '0.3rem 0.6rem' }}
                            onClick={() => handleDeleteTransaction(t.id)}
                            title="Delete transaction"
                          >
                            <Trash2 size={13} />
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
                Showing page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} records)
              </div>
              <div className="pagination-controls">
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page <= 1}
                  onClick={() => loadTransactions(pagination.page - 1)}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => loadTransactions(pagination.page + 1)}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BUDGETS */}
        {activeTab === 'budgets' && (
          <div>
            <div className="panel-card" style={{ marginBottom: '1.5rem' }}>
              <div className="panel-header">
                <div>
                  <div className="panel-title">
                    <PiggyBank size={18} style={{ color: '#10b981' }} />
                    Monthly Category Budgets & Limit Controls ({selectedMonth})
                  </div>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                    Calculated in real-time via MongoDB Aggregation Pipelines (<code>$match</code> + <code>$group</code>).
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
              {budgets.map((b) => {
                const isOver = b.status === 'exceeded';
                const isWarn = b.status === 'warning';

                return (
                  <div key={b.id} className="panel-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              background: b.color || '#6366f1',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontWeight: 700,
                            }}
                          >
                            {b.name?.charAt(0)}
                          </span>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{b.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Limit: ₹{b.budgetLimit?.toLocaleString('en-IN') || 'None'}</div>
                          </div>
                        </div>

                        <div>
                          {isOver && (
                            <span className="badge-tag badge-rose" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <AlertTriangle size={12} /> Exceeded
                            </span>
                          )}
                          {isWarn && (
                            <span className="badge-tag badge-amber" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              Warning (80%+)
                            </span>
                          )}
                          {!isOver && !isWarn && (
                            <span className="badge-tag badge-emerald" style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                              <CheckCircle size={12} /> Safe
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div style={{ margin: '1rem 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                          <span style={{ color: '#94a3b8' }}>Spent: ₹{b.spent?.toLocaleString('en-IN')}</span>
                          <span style={{ fontWeight: 600, color: isOver ? '#f43f5e' : '#f8fafc' }}>{b.percentage}%</span>
                        </div>
                        <div className="progress-track" style={{ height: '10px' }}>
                          <div
                            className="progress-bar"
                            style={{
                              width: `${Math.min(b.percentage, 100)}%`,
                              background: isOver ? '#f43f5e' : isWarn ? '#f59e0b' : '#10b981',
                            }}
                          />
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                        {b.budgetLimit > 0 ? (
                          isOver ? (
                            <span style={{ color: '#f43f5e' }}>Over budget by ₹{(b.spent - b.budgetLimit).toLocaleString('en-IN')}</span>
                          ) : (
                            <span style={{ color: '#10b981' }}>₹{b.remaining?.toLocaleString('en-IN')} remaining</span>
                          )
                        ) : (
                          <span>No spending cap set</span>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid #1f293d', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          setBudgetForm({ categoryId: b.id, name: b.name, limit: b.budgetLimit });
                          setIsEditBudgetOpen(true);
                        }}
                      >
                        <Edit2 size={12} /> Set Budget Limit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: REPORTS & ANALYTICS */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-title">
                  <TrendingUp size={18} style={{ color: '#6366f1' }} />
                  Full Year Savings & Cash Flow Evolution
                </div>
                <button className="btn btn-secondary btn-sm" onClick={handleExportCSV}>
                  <Download size={13} /> Export Detailed CSV
                </button>
              </div>

              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={monthlyTrends} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f293d" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8' }} />
                    <YAxis stroke="#64748b" tick={{ fill: '#94a3b8' }} tickFormatter={(v) => `₹${v/1000}k`} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#121826',
                        borderColor: '#1f293d',
                        borderRadius: '10px',
                        color: '#f8fafc',
                      }}
                      formatter={(val) => [`₹${val.toLocaleString('en-IN')}`, '']}
                    />
                    <Legend wrapperStyle={{ paddingTop: 12 }} />
                    <Bar dataKey="income" name="Total Inflow" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Total Outflow" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="savings" name="Net Saved" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-header">
                <div className="panel-title">
                  <PieChartIcon size={18} style={{ color: '#f59e0b' }} />
                  Category Breakdown Table ({selectedMonth})
                </div>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Monthly Spend</th>
                      <th>Budget Limit</th>
                      <th>Share of Total</th>
                      <th>Transaction Count</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categoryReport.categories.map((c) => (
                      <tr key={c.categoryId}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <span className="category-color-dot" style={{ backgroundColor: c.color }} />
                            <strong>{c.categoryName}</strong>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>₹{c.total?.toLocaleString('en-IN')}</td>
                        <td style={{ fontFamily: 'var(--font-mono)', color: '#94a3b8' }}>
                          {c.budgetLimit > 0 ? `₹${c.budgetLimit.toLocaleString('en-IN')}` : 'Uncapped'}
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className="progress-track" style={{ width: '80px', height: '6px' }}>
                              <div className="progress-bar" style={{ width: `${c.percentage}%`, background: c.color }} />
                            </div>
                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{c.percentage}%</span>
                          </div>
                        </td>
                        <td>{c.count} txns</td>
                        <td>
                          {c.isOverBudget ? (
                            <span className="badge-tag badge-rose">Over Budget</span>
                          ) : (
                            <span className="badge-tag badge-emerald">Within Budget</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD TRANSACTION */}
        {isAddTxOpen && (
          <div className="modal-overlay" onClick={() => setIsAddTxOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">New Financial Entry</div>
                <button className="modal-close" onClick={() => setIsAddTxOpen(false)}>
                  <X size={20} />
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
                    <label className="form-label">Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 2500"
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
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
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
                    <label className="form-label">Description / Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Grocery shopping at DMart"
                      className="form-input"
                      value={txForm.note}
                      onChange={(e) => setTxForm({ ...txForm, note: e.target.value })}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.25rem' }}>
                    <input
                      type="checkbox"
                      id="isRecurring"
                      checked={txForm.isRecurring}
                      onChange={(e) => setTxForm({ ...txForm, isRecurring: e.target.checked })}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                    <label htmlFor="isRecurring" style={{ fontSize: '0.875rem', cursor: 'pointer', color: '#cbd5e1' }}>
                      Mark as recurring monthly expense / income
                    </label>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsAddTxOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Transaction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT BUDGET */}
        {isEditBudgetOpen && (
          <div className="modal-overlay" onClick={() => setIsEditBudgetOpen(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title">Set Monthly Budget Limit</div>
                <button className="modal-close" onClick={() => setIsEditBudgetOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateBudgetSubmit}>
                <div className="modal-body">
                  <p style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                    Configure the maximum monthly budget limit for <strong>{budgetForm.name}</strong>.
                  </p>

                  <div className="form-group">
                    <label className="form-label">Monthly Limit (₹)</label>
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

        {/* Toast Alert */}
        {toast && (
          <div className="toast-msg">
            <Sparkles size={16} style={{ color: '#6366f1' }} />
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </>
  );
}

