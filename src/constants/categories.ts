import { Category } from '../types';

// ─── Default Expense Categories ───────────────────────────────────────────────

export const DEFAULT_EXPENSE_CATEGORIES: Category[] = [
  { id: 'home',           name: 'Home',           icon: '🏠', color: '#10B981', type: 'expense', isActive: true, isDefault: true, sortOrder: 1 },
  { id: 'transportation', name: 'Transportation',  icon: '🚌', color: '#EC4899', type: 'expense', isActive: true, isDefault: true, sortOrder: 2 },
  { id: 'adda',           name: 'Adda',            icon: '🎮', color: '#84CC16', type: 'expense', isActive: true, isDefault: true, sortOrder: 3 },
  { id: 'food',           name: 'Food',            icon: '🍔', color: '#06B6D4', type: 'expense', isActive: true, isDefault: true, sortOrder: 4 },
  { id: 'shopping',       name: 'Shopping',        icon: '🛍️', color: '#EAB308', type: 'expense', isActive: true, isDefault: true, sortOrder: 5 },
  { id: 'restaurant',     name: 'Restaurant',      icon: '🍽️', color: '#F97316', type: 'expense', isActive: true, isDefault: true, sortOrder: 6 },
  { id: 'entertainment',  name: 'Entertainment',   icon: '🎬', color: '#22C55E', type: 'expense', isActive: true, isDefault: true, sortOrder: 7 },
  { id: 'phone',          name: 'Phone',           icon: '📱', color: '#F472B6', type: 'expense', isActive: true, isDefault: true, sortOrder: 8 },
  { id: 'lend',           name: 'Lend',            icon: '💸', color: '#3B82F6', type: 'expense', isActive: true, isDefault: true, sortOrder: 9 },
  { id: 'gifts',          name: 'Gifts',           icon: '🎁', color: '#EF4444', type: 'expense', isActive: true, isDefault: true, sortOrder: 10 },
  { id: 'cigarettes',     name: 'Cigarettes',      icon: '🚬', color: '#9CA3AF', type: 'expense', isActive: true, isDefault: true, sortOrder: 11 },
  { id: 'electronics',    name: 'Electronics',     icon: '💻', color: '#6366F1', type: 'expense', isActive: true, isDefault: true, sortOrder: 12 },
  { id: 'education',      name: 'Education',       icon: '📚', color: '#F97316', type: 'expense', isActive: true, isDefault: true, sortOrder: 13 },
  { id: 'beauty',         name: 'Beauty',          icon: '💇', color: '#FB7185', type: 'expense', isActive: true, isDefault: true, sortOrder: 14 },
  { id: 'sports',         name: 'Sports',          icon: '⚽', color: '#A855F7', type: 'expense', isActive: true, isDefault: true, sortOrder: 15 },
  { id: 'social',         name: 'Social',          icon: '👥', color: '#0EA5E9', type: 'expense', isActive: true, isDefault: true, sortOrder: 16 },
  { id: 'clothing',       name: 'Clothing',        icon: '👗', color: '#FCD34D', type: 'expense', isActive: true, isDefault: true, sortOrder: 17 },
  { id: 'car',            name: 'Car',             icon: '🚗', color: '#60A5FA', type: 'expense', isActive: true, isDefault: true, sortOrder: 18 },
  { id: 'alcohol',        name: 'Alcohol',         icon: '🍺', color: '#FBBF24', type: 'expense', isActive: true, isDefault: true, sortOrder: 19 },
  { id: 'travel',         name: 'Travel',          icon: '✈️', color: '#FDE68A', type: 'expense', isActive: true, isDefault: true, sortOrder: 20 },
  { id: 'health',         name: 'Health',          icon: '🏥', color: '#34D399', type: 'expense', isActive: true, isDefault: true, sortOrder: 21 },
  { id: 'pets',           name: 'Pets',            icon: '🐾', color: '#4ADE80', type: 'expense', isActive: true, isDefault: true, sortOrder: 22 },
  { id: 'repairs',        name: 'Repairs',         icon: '🔧', color: '#FB923C', type: 'expense', isActive: true, isDefault: true, sortOrder: 23 },
  { id: 'housing',        name: 'Housing',         icon: '🏘️', color: '#2DD4BF', type: 'expense', isActive: true, isDefault: true, sortOrder: 24 },
  { id: 'donations',      name: 'Donations',       icon: '❤️', color: '#F87171', type: 'expense', isActive: true, isDefault: true, sortOrder: 25 },
  { id: 'lottery',        name: 'Lottery',         icon: '🎲', color: '#C084FC', type: 'expense', isActive: true, isDefault: true, sortOrder: 26 },
  { id: 'snacks',         name: 'Snacks',          icon: '🍟', color: '#FCD34D', type: 'expense', isActive: true, isDefault: true, sortOrder: 27 },
  { id: 'kids',           name: 'Kids',            icon: '🧒', color: '#F9A8D4', type: 'expense', isActive: true, isDefault: true, sortOrder: 28 },
];

// ─── Default Income Categories ────────────────────────────────────────────────

export const DEFAULT_INCOME_CATEGORIES: Category[] = [
  { id: 'salary',        name: 'Salary',       icon: '💰', color: '#10B981', type: 'income', isActive: true, isDefault: true, sortOrder: 1 },
  { id: 'freelance',     name: 'Freelance',    icon: '💻', color: '#3B82F6', type: 'income', isActive: true, isDefault: true, sortOrder: 2 },
  { id: 'business',      name: 'Business',     icon: '🏢', color: '#6366F1', type: 'income', isActive: true, isDefault: true, sortOrder: 3 },
  { id: 'investment',    name: 'Investment',   icon: '📈', color: '#06B6D4', type: 'income', isActive: true, isDefault: true, sortOrder: 4 },
  { id: 'gift_income',   name: 'Gift',         icon: '🎁', color: '#EF4444', type: 'income', isActive: true, isDefault: true, sortOrder: 5 },
  { id: 'refund',        name: 'Refund',       icon: '↩️', color: '#9CA3AF', type: 'income', isActive: true, isDefault: true, sortOrder: 6 },
  { id: 'bonus',         name: 'Bonus',        icon: '🎉', color: '#EAB308', type: 'income', isActive: true, isDefault: true, sortOrder: 7 },
  { id: 'interest',      name: 'Interest',     icon: '💹', color: '#22C55E', type: 'income', isActive: true, isDefault: true, sortOrder: 8 },
  { id: 'other_income',  name: 'Other Income', icon: '➕', color: '#A855F7', type: 'income', isActive: true, isDefault: true, sortOrder: 9 },
];

export const ALL_DEFAULT_CATEGORIES = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
];

export const AVAILABLE_EXPENSE_ICONS = [
  '🏠', '🚌', '🎮', '🍔', '🛍️', '🍽️', '🎬', '📱', '💸', '🎁', 
  '🚬', '💻', '📚', '💇', '⚽', '👥', '👗', '🚗', '🍺', '✈️', 
  '🏥', '🐾', '🔧', '🏘️', '❤️', '🎲', '🍟', '🧒', '☕', '🍕', 
  '🍰', '🛒', '💳', '💡', '⛽', '🚕', '💊', '🎓', '🎧', '🎸', 
  '🍿', '🏕️', '🏋️', '🚲', '🎨', '🧾', '🧼', '👕', '👠', '⌚', 
  '💍', '🍼', '🛴', '🛵', '⛵', '🎟️', '🧘', '🩺', '🔬', '🏨', 
  '🏖️', '🌴', '🎯', '🎰'
];

export const AVAILABLE_INCOME_ICONS = [
  '💰', '🏢', '📈', '↩️', '🎉', '💹', '➕', '💼', '📊', '🏧', 
  '🏦', '💎', '🔑', '🏷️', '💵', '💳', '🏆', '🥇', '🎁', '🤝', 
  '🪙', '💶', '💷', '📱', '💻', '🚀', '⭐', '✨', '⚡'
];

export const AVAILABLE_CATEGORY_ICONS = [
  ...AVAILABLE_EXPENSE_ICONS,
  ...AVAILABLE_INCOME_ICONS,
];

export const getCategoryById = (id: string): Category | undefined =>
  ALL_DEFAULT_CATEGORIES.find((c) => c.id === id);
