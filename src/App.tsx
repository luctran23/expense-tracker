/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  PieChart as PieChartIcon, 
  LayoutDashboard, 
  List, 
  Settings as SettingsIcon,
  Trash2,
  Edit2,
  X,
  ChevronRight,
  TrendingUp,
  Wallet,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  LineChart, 
  Line,
  CartesianGrid,
  Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subDays, eachDayOfInterval } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

import { 
  Language, 
  Category, 
  Expense, 
  Budget, 
  Debt,
  translations, 
  Translations 
} from './types';
import { cn, CATEGORY_COLORS, formatCurrency } from './utils';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default function App() {
  // State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [budget, setBudget] = useState<Budget>({ amount: 0, month: format(new Date(), 'yyyy-MM') });
  const [language, setLanguage] = useState<Language>('en');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'expenses' | 'settings'>('dashboard');
  const [dashboardTimeframe, setDashboardTimeframe] = useState<'week' | 'month' | 'year'>('month');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isDebtFormOpen, setIsDebtFormOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetMessage, setBudgetMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });

  const t = translations[language];

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load expenses from Firebase
        const expensesCollection = collection(db, 'expenses');
        const expensesSnapshot = await getDocs(expensesCollection);
        const expensesData = expensesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Expense[];
        setExpenses(expensesData);

        // Load debts from Firebase
        const debtsCollection = collection(db, 'debts');
        const debtsSnapshot = await getDocs(debtsCollection);
        const debtsData = debtsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Debt[];
        setDebts(debtsData);

        // Load other data: try Firestore `budget` (doc id = current month), fallback to localStorage
        const savedLang = localStorage.getItem('language');
        const savedTimeframe = localStorage.getItem('dashboardTimeframe');

        try {
          const currentMonth = format(new Date(), 'yyyy-MM');
          const budgetDocRef = doc(db, 'budget', currentMonth);
          const budgetSnap = await getDoc(budgetDocRef);
          if (budgetSnap.exists()) {
            setBudget(budgetSnap.data() as Budget);
          } else {
            const savedBudget = localStorage.getItem('budget');
            if (savedBudget) setBudget(JSON.parse(savedBudget));
          }
        } catch (err) {
          console.error('Error fetching budget from Firestore:', err);
          const savedBudget = localStorage.getItem('budget');
          if (savedBudget) setBudget(JSON.parse(savedBudget));
        }

        if (savedLang) setLanguage(savedLang as Language);
        if (savedTimeframe) setDashboardTimeframe(savedTimeframe as 'week' | 'month' | 'year');
      } catch (error) {
        console.error('Error loading data:', error);
        // Fallback to localStorage
        const savedExpenses = localStorage.getItem('expenses');
        const savedBudget = localStorage.getItem('budget');
        const savedDebts = localStorage.getItem('debts');
        const savedLang = localStorage.getItem('language');
        const savedTimeframe = localStorage.getItem('dashboardTimeframe');

        if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
        if (savedBudget) setBudget(JSON.parse(savedBudget));
        if (savedDebts) setDebts(JSON.parse(savedDebts));
        if (savedLang) setLanguage(savedLang as Language);
        if (savedTimeframe) setDashboardTimeframe(savedTimeframe as 'week' | 'month' | 'year');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save data
  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('debts', JSON.stringify(debts));
  }, [debts]);

  // Explicit budget save handler — call when user clicks Save
  const saveBudgetToFirestore = async () => {
    setSavingBudget(true);
    setBudgetMessage(null);
    try {
      await setDoc(doc(db, 'budget', budget.month), budget);
      localStorage.removeItem('budget');
      setBudgetMessage({ type: 'success', text: language === 'vi' ? 'Lưu ngân sách thành công' : 'Budget saved' });
    } catch (error) {
      console.error('Error saving budget to Firestore, falling back to localStorage', error);
      localStorage.setItem('budget', JSON.stringify(budget));
      setBudgetMessage({ type: 'error', text: language === 'vi' ? 'Lưu ngân sách thất bại' : 'Failed to save budget' });
    } finally {
      setSavingBudget(false);
      // Auto-dismiss after 3s
      window.setTimeout(() => setBudgetMessage(null), 3000);
    }
  };

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem('dashboardTimeframe', dashboardTimeframe);
  }, [dashboardTimeframe]);

  // Derived data
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const matchesSearch = exp.note.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            t.categories[exp.category].toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
      const matchesDate = isWithinInterval(parseISO(exp.date), {
        start: parseISO(dateRange.start),
        end: parseISO(dateRange.end)
      });
      return matchesSearch && matchesCategory && matchesDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses, searchQuery, categoryFilter, dateRange, t]);

  const dashboardExpenses = useMemo(() => {
    const now = new Date();
    let start, end;

    if (dashboardTimeframe === 'week') {
      start = subDays(now, 6);
      end = now;
    } else if (dashboardTimeframe === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else {
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now.getFullYear(), 11, 31);
    }

    return expenses.filter(exp => isWithinInterval(parseISO(exp.date), { start, end }));
  }, [expenses, dashboardTimeframe]);

  const totalSpentInTimeframe = dashboardExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const spendingByCategory = useMemo(() => {
    const data: Record<string, number> = {};
    dashboardExpenses.forEach(exp => {
      data[exp.category] = (data[exp.category] || 0) + exp.amount;
    });
    return Object.entries(data).map(([category, amount]) => ({
      name: t.categories[category as Category],
      value: amount,
      category: category as Category
    })).sort((a, b) => b.value - a.value);
  }, [dashboardExpenses, t]);

  const highestCategory = spendingByCategory[0];

  const totalDebtsOwed = useMemo(() => debts.filter(d => d.type === 'owed').reduce((s, d) => s + d.amount, 0), [debts]);
  const totalDebtsLent = useMemo(() => debts.filter(d => d.type === 'lent').reduce((s, d) => s + d.amount, 0), [debts]);

  const trendData = useMemo(() => {
    const now = new Date();
    
    if (dashboardTimeframe === 'week') {
      const last7Days = eachDayOfInterval({
        start: subDays(now, 6),
        end: now
      });
      return last7Days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const amount = expenses
          .filter(exp => exp.date === dayStr)
          .reduce((sum, exp) => sum + exp.amount, 0);
        return {
          label: format(day, 'MMM dd', { locale: language === 'vi' ? vi : enUS }),
          amount
        };
      });
    } else if (dashboardTimeframe === 'month') {
      // Group by week of month
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const weeks = [];
      let current = start;
      while (current <= end) {
        const weekEnd = new Date(current);
        weekEnd.setDate(current.getDate() + 6);
        const actualEnd = weekEnd > end ? end : weekEnd;
        
        const amount = expenses
          .filter(exp => isWithinInterval(parseISO(exp.date), { start: current, end: actualEnd }))
          .reduce((sum, exp) => sum + exp.amount, 0);
        
        weeks.push({
          label: `${format(current, 'dd')} - ${format(actualEnd, 'dd')}`,
          amount
        });
        
        current = new Date(actualEnd);
        current.setDate(current.getDate() + 1);
      }
      return weeks;
    } else {
      // Group by month of year
      const months = [];
      for (let i = 0; i < 12; i++) {
        const monthStart = new Date(now.getFullYear(), i, 1);
        const monthEnd = endOfMonth(monthStart);
        const amount = expenses
          .filter(exp => isWithinInterval(parseISO(exp.date), { start: monthStart, end: monthEnd }))
          .reduce((sum, exp) => sum + exp.amount, 0);
        
        months.push({
          label: format(monthStart, 'MMM', { locale: language === 'vi' ? vi : enUS }),
          amount
        });
      }
      return months;
    }
  }, [expenses, dashboardTimeframe, language]);

  // Handlers
  const handleAddExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newExpense: Expense = {
      id: editingExpense?.id || crypto.randomUUID(),
      amount: Number(formData.get('amount')),
      category: formData.get('category') as Category,
      date: formData.get('date') as string,
      note: formData.get('note') as string,
    };

    try {
      if (editingExpense) {
        await setDoc(doc(db, 'expenses', newExpense.id), newExpense);
        setExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? newExpense : exp));
      } else {
        await setDoc(doc(db, 'expenses', newExpense.id), newExpense);
        setExpenses(prev => [...prev, newExpense]);
      }
      
      setIsFormOpen(false);
      setEditingExpense(null);
    } catch (error) {
      console.error('Error saving expense:', error);
      // Fallback to local state update
      if (editingExpense) {
        setExpenses(prev => prev.map(exp => exp.id === editingExpense.id ? newExpense : exp));
      } else {
        setExpenses(prev => [...prev, newExpense]);
      }
      setIsFormOpen(false);
      setEditingExpense(null);
    }
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm(language === 'vi' ? 'Bạn có chắc muốn xóa?' : 'Are you sure you want to delete?')) {
      setExpenses(prev => prev.filter(exp => exp.id !== id));
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  // Debt handlers
  const handleAddDebt = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const newDebt: Debt = {
      id: editingDebt?.id || crypto.randomUUID(),
      name: String(formData.get('name') || ''),
      amount: Number(formData.get('amount')),
      date: String(formData.get('date')),
      dueDate: formData.get('dueDate') ? String(formData.get('dueDate')) : null,
      type: (formData.get('type') as any) || 'owed',
      status: (formData.get('status') as any) || 'open',
      note: String(formData.get('note') || '')
    };

    try {
      if (editingDebt) {
        await setDoc(doc(db, 'debts', newDebt.id), newDebt);
        setDebts(prev => prev.map(d => d.id === editingDebt.id ? newDebt : d));
      } else {
        await setDoc(doc(db, 'debts', newDebt.id), newDebt);
        setDebts(prev => [...prev, newDebt]);
      }
      setIsDebtFormOpen(false);
      setEditingDebt(null);
    } catch (error) {
      console.error('Error saving debt:', error);
      if (editingDebt) {
        setDebts(prev => prev.map(d => d.id === editingDebt.id ? newDebt : d));
      } else {
        setDebts(prev => [...prev, newDebt]);
      }
      setIsDebtFormOpen(false);
      setEditingDebt(null);
    }
  };

  const handleDeleteDebt = (id: string) => {
    if (confirm(language === 'vi' ? 'Bạn có chắc muốn xóa?' : 'Are you sure you want to delete?')) {
      setDebts(prev => prev.filter(d => d.id !== id));
    }
  };

  const handleEditDebt = (debt: Debt) => {
    setEditingDebt(debt);
    setIsDebtFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      {loading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-slate-500">Loading...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-30 px-4 py-4">
            <div className="max-w-5xl mx-auto flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                  <TrendingUp size={24} />
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-800">{t.title}</h1>
              </div>

              {/* Debts summary */}
              <div className="mt-6 flex gap-4">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex-1">
                  <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{t.debts}</p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <p className="text-xs text-slate-500">{t.debtTypeOwed}</p>
                      <h3 className="text-lg font-bold">{formatCurrency(totalDebtsOwed, language)}</h3>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t.debtTypeLent}</p>
                      <h3 className="text-lg font-bold">{formatCurrency(totalDebtsLent, language)}</h3>
                    </div>
                  </div>
                </div>
              </div>
                <button 
                  onClick={() => {
                    if (activeTab === 'debts') {
                      setEditingDebt(null);
                      setIsDebtFormOpen(true);
                    } else {
                      setEditingExpense(null);
                      setIsFormOpen(true);
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-all shadow-md active:scale-95"
                >
                  <Plus size={20} />
                  <span className="hidden sm:inline font-medium">{activeTab === 'debts' ? t.addDebt : t.addExpense}</span>
                </button>
            </div>
          </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Budget save feedback toast */}
        <div className="fixed right-6 top-6 z-50">
          {budgetMessage && (
            <div className={cn(
              "px-4 py-2 rounded-lg shadow-md text-sm font-medium",
              budgetMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' : 'bg-rose-50 text-rose-800 border border-rose-100'
            )}>
              <div className="flex items-center gap-3">
                <span>{budgetMessage.text}</span>
                <button onClick={() => setBudgetMessage(null)} className="ml-2 text-xs text-slate-500 hover:text-slate-700">✕</button>
              </div>
            </div>
          )}
        </div>
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Timeframe Selector */}
              <div className="flex justify-center">
                <div className="bg-white p-1 rounded-2xl shadow-sm border border-slate-100 flex gap-1">
                  {(['week', 'month', 'year'] as const).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setDashboardTimeframe(tf)}
                      className={cn(
                        "px-6 py-2 rounded-xl text-sm font-bold transition-all",
                        dashboardTimeframe === tf 
                          ? "bg-indigo-600 text-white shadow-md" 
                          : "text-slate-500 hover:bg-slate-50"
                      )}
                    >
                      {t[tf]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{t.totalSpending}</p>
                    <h2 className="text-3xl font-bold mt-1 text-slate-800">{formatCurrency(totalSpentInTimeframe, language)}</h2>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-emerald-600 text-sm font-medium">
                    <Calendar size={16} />
                    <span>
                      {dashboardTimeframe === 'week' && (language === 'vi' ? '7 ngày qua' : 'Last 7 days')}
                      {dashboardTimeframe === 'month' && format(new Date(), 'MMMM yyyy', { locale: language === 'vi' ? vi : enUS })}
                      {dashboardTimeframe === 'year' && format(new Date(), 'yyyy')}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{t.budget}</p>
                    <h2 className="text-3xl font-bold mt-1 text-slate-800">{formatCurrency(budget.amount, language)}</h2>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between text-xs font-medium text-slate-500 mb-1">
                      <span>{Math.min(100, Math.round((totalSpentInTimeframe / (budget.amount || 1)) * 100))}% {t.used}</span>
                      <span>{formatCurrency(Math.max(0, budget.amount - totalSpentInTimeframe), language)} {t.remaining}</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (totalSpentInTimeframe / (budget.amount || 1)) * 100)}%` }}
                        className={cn(
                          "h-full transition-all",
                          (totalSpentInTimeframe / (budget.amount || 1)) > 0.9 ? "bg-rose-500" : "bg-indigo-500"
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between">
                  <div>
                    <p className="text-slate-500 text-sm font-medium uppercase tracking-wider">{t.highestCategory}</p>
                    <h2 className="text-3xl font-bold mt-1 text-slate-800">
                      {highestCategory ? highestCategory.name : '—'}
                    </h2>
                  </div>
                  {highestCategory && (
                    <div className="mt-4 flex items-center gap-2 text-slate-600 text-sm font-medium">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[highestCategory.category] }} />
                      <span>{formatCurrency(highestCategory.value, language)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold mb-6 text-slate-800">{t.spendingByCategory}</h3>
                  <div className="h-75">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={spendingByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {spendingByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value, language)}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <h3 className="text-lg font-bold mb-6 text-slate-800">
                    {dashboardTimeframe === 'week' && t.dailySpending}
                    {dashboardTimeframe === 'month' && t.weeklySpending}
                    {dashboardTimeframe === 'year' && t.monthlySpending}
                  </h3>
                  <div className="h-75">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                        <Tooltip 
                          formatter={(value: number) => formatCurrency(value, language)}
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                          cursor={{ fill: '#f8fafc' }}
                        />
                        <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'expenses' && (
            <motion.div 
              key="expenses"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Filters */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder={t.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                  </div>
                  <div className="flex gap-4">
                    <div className="relative">
                      <select 
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value as Category | 'all')}
                        className="appearance-none pl-4 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      >
                        <option value="all">{t.allCategories}</option>
                        {Object.entries(t.categories).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                      <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 items-center text-sm">
                  <span className="text-slate-500 font-medium">{t.date}:</span>
                  <input 
                    type="date" 
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-slate-400">→</span>
                  <input 
                    type="date" 
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* List */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                {filteredExpenses.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {filteredExpenses.map((exp) => (
                      <motion.div 
                        layout
                        key={exp.id}
                        className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-4">
                          <div 
                            className="w-6 h-6 rounded-2xl flex items-center justify-center text-white shadow-sm"
                            style={{ backgroundColor: CATEGORY_COLORS[exp.category] }}
                          >
                            <PieChartIcon size={12} />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">{exp.note || t.categories[exp.category]}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <span className="font-medium px-2 py-0.5 bg-slate-100 rounded-full">{t.categories[exp.category]}</span>
                              <span>•</span>
                              <span>{format(parseISO(exp.date), 'dd/MM/yyyy')}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-slate-800">{formatCurrency(exp.amount, language)}</span>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => handleEditExpense(exp)}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteExpense(exp.id)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <Search size={32} />
                    </div>
                    <p className="text-slate-500 font-medium">{t.noExpenses}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'debts' && (
            <motion.div 
              key="debts"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800">{t.debts}</h3>
                  <button
                    onClick={() => { setEditingDebt(null); setIsDebtFormOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-xl flex items-center gap-2"
                  >
                    <Plus size={16} />
                    <span className="hidden sm:inline">{t.addDebt}</span>
                  </button>
                </div>

                <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                  {debts.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {debts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((d) => (
                        <motion.div 
                          layout
                          key={d.id}
                          className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10">
                              <div className="text-sm font-medium text-slate-700">{d.name}</div>
                              <div className="text-xs text-slate-500">{format(parseISO(d.date), 'dd/MM/yyyy')}{d.dueDate ? ` • Due ${format(parseISO(d.dueDate), 'dd/MM/yyyy')}` : ''}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-lg font-bold text-slate-800">{formatCurrency(d.amount, language)}</div>
                            <div className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{d.type === 'owed' ? t.debtTypeOwed : t.debtTypeLent}</div>
                            <div className={cn("text-xs px-2 py-1 rounded-full font-medium", d.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : d.status === 'overdue' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600')}>{d.status === 'paid' ? t.debtStatusPaid : d.status === 'overdue' ? t.debtStatusOverdue : t.debtStatusOpen}</div>
                            <div className="flex items-center gap-1">
                              <button 
                                onClick={() => handleEditDebt(d)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={() => handleDeleteDebt(d.id)}
                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Wallet size={32} />
                      </div>
                      <p className="text-slate-500 font-medium">{t.noDebts}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                    <SettingsIcon size={24} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-800">{t.settings}</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t.language}</label>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setLanguage('en')}
                        className={cn(
                          "flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium flex items-center justify-center gap-2",
                          language === 'en' ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 hover:border-slate-200 text-slate-600"
                        )}
                      >
                        🇺🇸 English
                      </button>
                      <button 
                        onClick={() => setLanguage('vi')}
                        className={cn(
                          "flex-1 py-3 px-4 rounded-xl border-2 transition-all font-medium flex items-center justify-center gap-2",
                          language === 'vi' ? "border-indigo-600 bg-indigo-50 text-indigo-600" : "border-slate-100 hover:border-slate-200 text-slate-600"
                        )}
                      >
                        🇻🇳 Tiếng Việt
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <label className="block text-sm font-bold text-slate-700 mb-2">{t.setBudget}</label>
                    <div className="relative">
                      <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                      <input 
                        type="number" 
                        value={budget.amount || ''}
                        onChange={(e) => setBudget(prev => ({ ...prev, amount: Number(e.target.value) }))}
                        placeholder="0.00"
                        className="w-full pl-12 pr-24 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-lg"
                      />
                      <button
                        onClick={saveBudgetToFirestore}
                        disabled={savingBudget}
                        className={cn(
                          "absolute right-3 top-1/2 -translate-y-1/2 px-3 py-2 rounded-lg font-medium transition-colors",
                          savingBudget ? 'bg-indigo-300 text-white cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        )}
                      >
                        {savingBudget ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : t.save}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl px-2 py-2 flex items-center gap-1 z-40">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium",
            activeTab === 'dashboard' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-slate-100"
          )}
        >
          <LayoutDashboard size={20} />
          <span className="hidden sm:inline">{t.dashboard}</span>
        </button>
        <button 
          onClick={() => setActiveTab('expenses')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium",
            activeTab === 'expenses' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-slate-100"
          )}
        >
          <List size={20} />
          <span className="hidden sm:inline">{t.expenses}</span>
        </button>
        <button 
          onClick={() => setActiveTab('debts')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium",
            activeTab === 'debts' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-slate-100"
          )}
        >
          <Wallet size={20} />
          <span className="hidden sm:inline">{t.debts}</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium",
            activeTab === 'settings' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" : "text-slate-500 hover:bg-slate-100"
          )}
        >
          <SettingsIcon size={20} />
          <span className="hidden sm:inline">{t.settings}</span>
        </button>
      </nav>

      {/* Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingExpense ? t.editExpense : t.addExpense}
                </h3>
                <button 
                  onClick={() => setIsFormOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddExpense} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.amount}</label>
                  <input 
                    required
                    type="number" 
                    name="amount"
                    defaultValue={editingExpense?.amount}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.category}</label>
                  <select 
                    required
                    name="category"
                    defaultValue={editingExpense?.category || 'food'}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  >
                    {Object.entries(t.categories).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.date}</label>
                  <input 
                    required
                    type="date" 
                    name="date"
                    defaultValue={editingExpense?.date || format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.note}</label>
                  <textarea 
                    name="note"
                    defaultValue={editingExpense?.note}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 py-3 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isDebtFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDebtFormOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingDebt ? t.editDebt : t.addDebt}
                </h3>
                <button 
                  onClick={() => setIsDebtFormOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleAddDebt} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Name</label>
                  <input 
                    required
                    type="text"
                    name="name"
                    defaultValue={editingDebt?.name}
                    placeholder="Person or entity"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.amount}</label>
                  <input 
                    required
                    type="number" 
                    name="amount"
                    defaultValue={editingDebt?.amount}
                    placeholder="0.00"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.date}</label>
                  <input 
                    required
                    type="date" 
                    name="date"
                    defaultValue={editingDebt?.date || format(new Date(), 'yyyy-MM-dd')}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Due date (optional)</label>
                  <input 
                    type="date" 
                    name="dueDate"
                    defaultValue={editingDebt?.dueDate || ''}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Type</label>
                    <select name="type" defaultValue={editingDebt?.type || 'owed'} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <option value="owed">{t.debtTypeOwed}</option>
                      <option value="lent">{t.debtTypeLent}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">Status</label>
                    <select name="status" defaultValue={editingDebt?.status || 'open'} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl">
                      <option value="open">{t.debtStatusOpen}</option>
                      <option value="paid">{t.debtStatusPaid}</option>
                      <option value="overdue">{t.debtStatusOverdue}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.note}</label>
                  <textarea 
                    name="note"
                    defaultValue={editingDebt?.note}
                    rows={3}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsDebtFormOpen(false)}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    {t.cancel}
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 py-3 px-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95"
                  >
                    {t.save}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
    </div>
  );
}
