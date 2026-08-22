// ─── Core Transaction Types ──────────────────────────────────────────────────

export type TransactionType = 'expense' | 'income' | 'transfer';
export type TransactionSource = 'manual' | 'voice' | 'receipt';

/**
 * How the AI resolved the transaction date.
 * explicit_date  — date was clearly stated ("আগস্ট ৫", "on August 5")
 * relative_date  — date was relative ("গতকাল", "last Friday")
 * receipt_date   — date extracted from receipt image text
 * inferred_today — no date clue found; today used as fallback (shown as uncertain)
 */
export type DateSource = 'explicit_date' | 'relative_date' | 'inferred_today' | 'receipt_date';
export type CategoryType = 'expense' | 'income';
export type BudgetState = 'safe' | 'warning' | 'danger' | 'exceeded';

export interface Transaction {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  categoryId: string;
  categoryNameSnapshot: string;
  categoryIcon: string;
  categoryColor: string;
  comment: string;
  /**
   * THE FINANCIAL DATE — when money was actually spent/received.
   * Format: 'YYYY-MM-DD'
   * All monthly totals, daily history, charts, reports, budgets,
   * and calendar views MUST use this field. NEVER use createdAt for
   * any financial calculation.
   */
  transactionDate: string;
  /**
   * When the record was entered into the app.
   * Completely separate from transactionDate.
   * Used only for audit/display — NEVER for financial calculations.
   */
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  source: TransactionSource;
  paymentMethod?: string;

  receiptImage?: string;
  aiGenerated: boolean;
  aiConfidence?: number;
  timezone: string;
}

export interface Category {
  id: string;
  userId?: string; // undefined for default categories
  name: string;
  icon: string;
  color: string;
  type: CategoryType;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  createdAt?: string;
}

export interface Budget {
  id: string;
  userId: string;
  categoryId?: string;
  month: number; // 1-12
  year: number;
  amount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

// ─── AI Types ────────────────────────────────────────────────────────────────

/**
 * A single transaction produced by the AI parser.
 *
 * MANDATORY fields (AI must always provide all of these):
 *   categoryId       — must be an ID from the user's existing category list
 *   amount           — must come from audio/text; never invented
 *   comment          — English summary of what was said
 *   transactionDate  — resolved YYYY-MM-DD using client currentDate + timezone
 *   dateSource       — how the date was determined
 *   confidence       — 0–1 overall confidence
 *   source           — 'voice' | 'receipt'
 *
 * SAFETY RULES (enforced by backend Zod schema):
 *   - AI must NOT invent amounts. If unclear → transaction is omitted.
 *   - AI must NOT create new categories. categoryId must exist in categoryList.
 *   - If date is ambiguous → dateSource: 'inferred_today', uncertain: true.
 *   - uncertain: true triggers a visual warning in the Preview screen.
 */
export interface AITransaction {
  // MANDATORY
  categoryId: string;         // must match an existing category ID from categoryList
  categoryName: string;       // display name (snapshot)
  amount: number;
  currency: string;
  comment: string;
  transactionDate: string;    // 'YYYY-MM-DD' — resolved against client currentDate
  dateSource: DateSource;
  confidence: number;         // 0–1
  source: 'voice' | 'receipt';
  type: TransactionType;

  // OPTIONAL
  dateExpression?: string;    // original text, e.g. "গতকাল"

  paymentMethod?: string;

  // UNCERTAINTY FLAGS (set by AI when information is ambiguous)
  uncertain?: boolean;        // true → show warning in Preview, require user confirmation
  uncertainFields?: Array<'amount' | 'category' | 'date' | 'comment'>;
}

/** Context sent to AI so it can resolve dates and map categories */
export interface AIContext {
  timezone: string;           // e.g. 'Asia/Dhaka'
  currentDate: string;        // 'YYYY-MM-DD' from client device
  currentDateTime: string;    // ISO string from client device
  categoryList: CategoryForAI[];
}

/** Minimal category info sent to AI for category mapping */
export interface CategoryForAI {
  id: string;
  name: string;
  type: CategoryType;
}

export interface AIParseVoiceRequest {
  audioBase64: string;
  audioMimeType: string;       // 'audio/m4a' | 'audio/wav' | 'audio/webm'
  timezone: string;
  currentDate: string;         // 'YYYY-MM-DD'
  currentDateTime: string;     // ISO string
  categoryList: CategoryForAI[];
}

export interface AIParseReceiptRequest {
  imageBase64: string;
  imageMimeType: string;       // 'image/jpeg' | 'image/png'
  timezone: string;
  currentDate: string;
  currentDateTime: string;
  categoryList: CategoryForAI[];
}

export interface AIParseResponse {
  transactions: AITransaction[];
  rawTranscript?: string;      // voice only: what Gemini heard
  receiptDate?: string;        // receipt only: date found on receipt

  total?: number;
  processingNotes?: string;    // warnings, dropped transactions, etc.
  droppedCount?: number;       // how many AI transactions failed schema validation
}

// ─── Service Adapter Interfaces ──────────────────────────────────────────────

/**
 * AI service adapter interface.
 * Default implementation: GeminiAIService (gemini-2.5-flash)
 * Swap by changing GEMINI_MODEL env var or implementing a new class.
 */
export interface IAIService {
  parseVoiceAudio(
    audioBase64: string,
    mimeType: string,
    context: AIContext
  ): Promise<AIParseResponse>;

  parseReceiptText(
    ocrText: string,
    context: AIContext,
    receiptImageBase64?: string
  ): Promise<AIParseResponse>;

  generateInsights(
    transactions: Transaction[],
    summary: MonthlySummary
  ): Promise<string[]>;
}

/** OCR result from the OCR provider */
export interface OCRResult {
  text: string;
  confidence?: number;
  rawResponse?: unknown;
}

/**
 * OCR service adapter interface.
 * Default implementation: GoogleVisionOCRService (ADC / service-account)
 * Swap by changing OCR_PROVIDER env var or implementing a new class.
 */
export interface IOCRService {
  extractText(imageBase64: string, mimeType: string): Promise<OCRResult>;
}

// ─── Preview Types ───────────────────────────────────────────────────────────

export interface PreviewTransaction extends AITransaction {
  tempId: string;
  categoryNameSnapshot: string;
  categoryIcon: string;
  categoryColor: string;
  resolvedCategory?: Category;
}

// ─── Summary Types ───────────────────────────────────────────────────────────

export interface MonthlySummary {
  month: number;
  year: number;
  totalExpense: number;
  totalIncome: number;
  balance: number;
  transactionCount: number;
}

export interface DailySummary {
  date: string; // 'YYYY-MM-DD'
  dayName: string;
  totalExpense: number;
  totalIncome: number;
  transactions: Transaction[];
}

export interface CategorySummary {
  category: Category;
  total: number;
  transactionCount: number;
  percentage: number;
}

// ─── Budget Types ────────────────────────────────────────────────────────────

export interface BudgetStatus {
  budget: Budget | null;
  spent: number;
  remaining: number;
  percentage: number;
  state: BudgetState;
  dailyBudget: number;
  fixedDailyBudget: number;
  todaySpent: number;
  daysRemaining: number;
  isOverDailyBudget: boolean;
  dailyOverage: number;
}

// ─── API Response Types ──────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Store Types ─────────────────────────────────────────────────────────────

export interface TransactionFilters {
  type?: TransactionType;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  source?: TransactionSource;
  searchQuery?: string;
}

// ─── Onboarding ──────────────────────────────────────────────────────────────

export interface UserPreferences {
  currency: string;
  timezone: string;
  monthlyBudget?: number;
  hasCompletedOnboarding: boolean;
  defaultPaymentMethod?: string;
}
