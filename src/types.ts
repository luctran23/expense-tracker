import { format } from 'date-fns';

export type Language = 'en' | 'vi';

export type Category = 
  | 'food' 
  | 'transport' 
  | 'shopping' 
  | 'entertainment' 
  | 'bills' 
  | 'health' 
  | 'education' 
  | 'other';

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  date: string; // ISO string
  note: string;
}

export type DebtType = 'owed' | 'lent';

export interface Debt {
  id: string;
  name: string; // person or entity
  amount: number;
  date: string; // ISO string - when recorded
  dueDate?: string | null; // optional due date
  type: DebtType; // owed = you owe them, lent = they owe you
  status?: 'open' | 'paid' | 'overdue';
  note?: string;
}

export interface Budget {
  amount: number;
  month: string; // YYYY-MM
}

export interface Translations {
  title: string;
  addExpense: string;
  editExpense: string;
  amount: string;
  category: string;
  date: string;
  note: string;
  save: string;
  cancel: string;
  delete: string;
  search: string;
  filterByCategory: string;
  allCategories: string;
  dashboard: string;
  expenses: string;
  settings: string;
  language: string;
  budget: string;
  setBudget: string;
  spent: string;
  remaining: string;
  used: string;
  monthlySummary: string;
  totalSpending: string;
  highestCategory: string;
  noExpenses: string;
  categories: Record<Category, string>;
  trends: string;
  spendingByCategory: string;
  dailySpending: string;
  weeklySpending: string;
  monthlySpending: string;
  week: string;
  month: string;
  year: string;
  timeframe: string;
  debts: string;
  addDebt: string;
  editDebt: string;
  noDebts: string;
  debtTypeOwed: string;
  debtTypeLent: string;
  debtStatusOpen: string;
  debtStatusPaid: string;
  debtStatusOverdue: string;
}

export const translations: Record<Language, Translations> = {
  en: {
    title: 'Expense Tracker',
    addExpense: 'Add Expense',
    editExpense: 'Edit Expense',
    amount: 'Amount',
    category: 'Category',
    date: 'Date',
    note: 'Note',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    search: 'Search expenses...',
    filterByCategory: 'Filter by category',
    allCategories: 'All Categories',
    dashboard: 'Dashboard',
    expenses: 'Expenses',
    settings: 'Settings',
    language: 'Language',
    budget: 'Budget',
    setBudget: 'Set Monthly Budget',
    spent: 'Spent',
    remaining: 'Remaining',
    used: 'Used',
    monthlySummary: 'Monthly Summary',
    totalSpending: 'Total Spending',
    highestCategory: 'Highest Category',
    noExpenses: 'No expenses found.',
    categories: {
      food: 'Food',
      transport: 'Transport',
      shopping: 'Shopping',
      entertainment: 'Entertainment',
      bills: 'Bills',
      health: 'Health',
      education: 'Education',
      other: 'Other'
    },
    trends: 'Spending Trends',
    spendingByCategory: 'Spending by Category',
    dailySpending: 'Daily Spending',
    weeklySpending: 'Weekly Spending',
    monthlySpending: 'Monthly Spending',
    week: 'Week',
    month: 'Month',
    year: 'Year',
    timeframe: 'Timeframe'
    ,
    debts: 'Debts',
    addDebt: 'Add Debt',
    editDebt: 'Edit Debt',
    noDebts: 'No debts found.',
    debtTypeOwed: 'Owed',
    debtTypeLent: 'Lent',
    debtStatusOpen: 'Open',
    debtStatusPaid: 'Paid',
    debtStatusOverdue: 'Overdue'
  },
  vi: {
    title: 'Quản lý Chi tiêu',
    addExpense: 'Thêm chi tiêu',
    editExpense: 'Sửa chi tiêu',
    amount: 'Số tiền',
    category: 'Danh mục',
    date: 'Ngày',
    note: 'Ghi chú',
    save: 'Lưu',
    cancel: 'Hủy',
    delete: 'Xóa',
    search: 'Tìm kiếm chi tiêu...',
    filterByCategory: 'Lọc theo danh mục',
    allCategories: 'Tất cả danh mục',
    dashboard: 'Tổng quan',
    expenses: 'Danh sách chi tiêu',
    settings: 'Cài đặt',
    language: 'Ngôn ngữ',
    budget: 'Ngân sách',
    setBudget: 'Thiết lập ngân sách tháng',
    spent: 'Đã chi',
    remaining: 'Còn lại',
    used: 'Đã dùng',
    monthlySummary: 'Tóm tắt tháng',
    totalSpending: 'Tổng chi tiêu',
    highestCategory: 'Chi nhiều nhất',
    noExpenses: 'Không tìm thấy chi tiêu nào.',
    categories: {
      food: 'Ăn uống',
      transport: 'Di chuyển',
      shopping: 'Mua sắm',
      entertainment: 'Giải trí',
      bills: 'Hóa đơn',
      health: 'Sức khỏe',
      education: 'Giáo dục',
      other: 'Khác'
    },
    trends: 'Xu hướng chi tiêu',
    spendingByCategory: 'Chi tiêu theo danh mục',
    dailySpending: 'Chi tiêu hàng ngày',
    weeklySpending: 'Chi tiêu hàng tuần',
    monthlySpending: 'Chi tiêu hàng tháng',
    week: 'Tuần',
    month: 'Tháng',
    year: 'Năm',
    timeframe: 'Khoảng thời gian'
    ,
    debts: 'Công nợ',
    addDebt: 'Thêm công nợ',
    editDebt: 'Sửa công nợ',
    noDebts: 'Không tìm thấy công nợ nào.',
    debtTypeOwed: 'Nợ',
    debtTypeLent: 'Cho vay',
    debtStatusOpen: 'Mở',
    debtStatusPaid: 'Đã trả',
    debtStatusOverdue: 'Quá hạn'
  }
};
