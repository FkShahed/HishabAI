import { format, parseISO, subDays, startOfMonth, endOfMonth, getDaysInMonth, isSameDay, isSameMonth } from 'date-fns';
import { Transaction, MonthlySummary, DailySummary, CategorySummary, BudgetStatus, Budget, Category } from '../types';

// ─── Date Utilities ───────────────────────────────────────────────────────────

/** Get today's date as YYYY-MM-DD in local time */
export function getTodayString(): string {
  const now = new Date();
  return format(now, 'yyyy-MM-dd');
}

/** Get yesterday's date as YYYY-MM-DD */
export function getYesterdayString(): string {
  return format(subDays(new Date(), 1), 'yyyy-MM-dd');
}

/** Format YYYY-MM-DD for display: "Aug 13, 2026" */
export function formatDateDisplay(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy');
}

/** Format YYYY-MM-DD as short: "Aug 13" */
export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d');
}

/** Format YYYY-MM-DD as day name: "Thursday" */
export function formatDayName(dateStr: string): string {
  return format(parseISO(dateStr), 'EEEE');
}

/** Format YYYY-MM-DD as short day: "Thu" */
export function formatDayShort(dateStr: string): string {
  return format(parseISO(dateStr), 'EEE');
}

/** Get month label from month/year: "August 2026" */
export function getMonthLabel(month: number, year: number): string {
  const date = new Date(year, month - 1, 1);
  return format(date, 'MMMM yyyy');
}

/** Get short month label: "Aug" */
export function getMonthShort(month: number): string {
  const date = new Date(2000, month - 1, 1);
  return format(date, 'MMM');
}

/** Check if a YYYY-MM-DD string is today */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayString();
}

/** Check if a YYYY-MM-DD string is yesterday */
export function isYesterday(dateStr: string): boolean {
  return dateStr === getYesterdayString();
}

/** Get human-friendly date label: "Today", "Yesterday", or "Aug 13" */
export function getDateLabel(dateStr: string): string {
  if (isToday(dateStr)) return 'Today';
  if (isYesterday(dateStr)) return 'Yesterday';
  return formatDateShort(dateStr);
}

/** Get number of days remaining in the current month from today */
export function getDaysRemainingInMonth(): number {
  const now = new Date();
  const daysInMonth = getDaysInMonth(now);
  return daysInMonth - now.getDate() + 1; // include today
}

/** Check if date string belongs to given month/year */
export function isInMonth(dateStr: string, month: number, year: number): boolean {
  const date = parseISO(dateStr);
  return date.getMonth() + 1 === month && date.getFullYear() === year;
}

// ─── Currency Formatting ──────────────────────────────────────────────────────

export interface CurrencyItem {
  code: string;
  name: string;
  symbol: string;
}

export const SUPPORTED_CURRENCIES: CurrencyItem[] = [
  { code: 'BDT', name: 'Bangladeshi Taka', symbol: '৳' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: '﷼' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$' },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: '৳',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  CAD: 'CA$',
  AUD: 'A$',
  SAR: '﷼',
  AED: 'AED',
  MYR: 'RM',
  SGD: 'S$',
  JPY: '¥',
};

export function getCurrencySymbol(currency = 'BDT'): string {
  const code = (currency || 'BDT').toUpperCase();
  return CURRENCY_SYMBOLS[code] || code;
}

/** Format amount as ৳1,234 or $1,234 */
export function formatCurrency(amount: number, currency = 'BDT'): string {
  const symbol = getCurrencySymbol(currency);
  const num = Math.abs(amount || 0);
  const formatted = num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return `${symbol}${formatted}`;
}

/** Format signed amount: -৳500 for expense, +৳500 for income */
export function formatSignedAmount(amount: number, type: 'expense' | 'income' | 'transfer', currency = 'BDT'): string {
  const formatted = formatCurrency(amount, currency);
  if (type === 'expense') return `-${formatted}`;
  if (type === 'income') return `+${formatted}`;
  return formatted;
}

// ─── Transaction Grouping ─────────────────────────────────────────────────────

/**
 * Group transactions by transactionDate (NOT createdAt).
 * Returns sorted array of DailySummary objects, newest first.
 */
export function groupTransactionsByDate(transactions: Transaction[]): DailySummary[] {
  const map = new Map<string, Transaction[]>();

  for (const t of transactions) {
    const key = t.transactionDate; // Always use transactionDate
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(t);
  }

  const result: DailySummary[] = [];

  for (const [date, txns] of map) {
    const expenses = txns.filter((t) => t.type === 'expense');
    const incomes = txns.filter((t) => t.type === 'income');
    result.push({
      date,
      dayName: formatDayName(date),
      totalExpense: expenses.reduce((sum, t) => sum + t.amount, 0),
      totalIncome: incomes.reduce((sum, t) => sum + t.amount, 0),
      transactions: txns.sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    });
  }

  // Sort by date descending (newest first)
  return result.sort((a, b) => b.date.localeCompare(a.date));
}

// ─── Monthly Summary ──────────────────────────────────────────────────────────

/**
 * Calculate monthly summary.
 * Uses transactionDate exclusively — NEVER createdAt.
 */
export function calculateMonthlySummary(
  transactions: Transaction[],
  month: number,
  year: number
): MonthlySummary {
  const filtered = transactions.filter((t) => isInMonth(t.transactionDate, month, year));
  const expenses = filtered.filter((t) => t.type === 'expense');
  const incomes = filtered.filter((t) => t.type === 'income');

  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);

  return {
    month,
    year,
    totalExpense,
    totalIncome,
    balance: totalIncome - totalExpense,
    transactionCount: filtered.length,
  };
}

// ─── Category Summary ─────────────────────────────────────────────────────────

/**
 * Calculate spending per category.
 * Uses transactionDate — NEVER createdAt.
 */
export function calculateCategorySummary(
  transactions: Transaction[],
  categories: Category[],
  month?: number,
  year?: number
): CategorySummary[] {
  const filtered = (month && year)
    ? transactions.filter((t) => isInMonth(t.transactionDate, month, year) && t.type === 'expense')
    : transactions.filter((t) => t.type === 'expense');

  const total = filtered.reduce((s, t) => s + t.amount, 0);
  const map = new Map<string, number>();

  for (const t of filtered) {
    map.set(t.categoryId, (map.get(t.categoryId) ?? 0) + t.amount);
  }

  const summaries: CategorySummary[] = [];

  for (const [categoryId, amount] of map) {
    const category = categories.find((c) => c.id === categoryId);
    if (!category) continue;
    summaries.push({
      category,
      total: amount,
      transactionCount: filtered.filter((t) => t.categoryId === categoryId).length,
      percentage: total > 0 ? (amount / total) * 100 : 0,
    });
  }

  return summaries.sort((a, b) => b.total - a.total);
}

// ─── Budget Status ────────────────────────────────────────────────────────────

/**
 * Calculate budget status using transactionDate — NEVER createdAt.
 */
export function calculateBudgetStatus(
  transactions: Transaction[],
  budget: Budget | null,
  month: number,
  year: number
): BudgetStatus {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const isCurrentMonth = month === currentMonth && year === currentYear;

  const monthlyExpenses = transactions
    .filter((t) => t.type === 'expense' && isInMonth(t.transactionDate, month, year))
    .reduce((s, t) => s + t.amount, 0);

  const budgetAmount = budget?.amount ?? 0;
  const remaining = Math.max(0, budgetAmount - monthlyExpenses);
  const percentage = budgetAmount > 0 ? (monthlyExpenses / budgetAmount) * 100 : 0;

  let state: BudgetStatus['state'] = 'safe';
  if (percentage >= 100) state = 'exceeded';
  else if (percentage >= 90) state = 'danger';
  else if (percentage >= 70) state = 'warning';

  // Daily budget calculation (only makes sense for current month)
  const daysRemaining = isCurrentMonth ? getDaysRemainingInMonth() : 1;
  const dailyBudget = daysRemaining > 0 ? remaining / daysRemaining : 0;
  
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const fixedDailyBudget = budgetAmount > 0 ? budgetAmount / daysInMonth : 0;

  const todayStr = getTodayString();
  const todaySpent = transactions
    .filter((t) => t.type === 'expense' && t.transactionDate === todayStr)
    .reduce((s, t) => s + t.amount, 0);

  return {
    budget,
    spent: monthlyExpenses,
    remaining,
    percentage,
    state,
    dailyBudget,
    fixedDailyBudget,
    todaySpent,
    daysRemaining,
    isOverDailyBudget: todaySpent > dailyBudget && dailyBudget > 0,
    dailyOverage: Math.max(0, todaySpent - dailyBudget),
  };
}

// ─── Chart Data Helpers ───────────────────────────────────────────────────────

export interface BarChartDataPoint {
  value: number;
  label: string;
  date: string;
}

/**
 * Get daily spending for the current month as bar chart data.
 * Uses transactionDate — NEVER createdAt.
 */
export function getDailySpendingChartData(
  transactions: Transaction[],
  month: number,
  year: number
): BarChartDataPoint[] {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1));
  const result: BarChartDataPoint[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayTotal = transactions
      .filter((t) => t.type === 'expense' && t.transactionDate === dateStr)
      .reduce((s, t) => s + t.amount, 0);
    result.push({ value: dayTotal, label: String(day), date: dateStr });
  }

  return result;
}

/** Get monthly spending for last N months as bar chart data */
export function getMonthlyTrendData(
  transactions: Transaction[],
  monthsBack = 6
): BarChartDataPoint[] {
  const result: BarChartDataPoint[] = [];
  const now = new Date();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    const total = transactions
      .filter((t) => t.type === 'expense' && isInMonth(t.transactionDate, m, y))
      .reduce((s, t) => s + t.amount, 0);
    result.push({ value: total, label: getMonthShort(m), date: `${y}-${String(m).padStart(2, '0')}-01` });
  }

  return result;
}
