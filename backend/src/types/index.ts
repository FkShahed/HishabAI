import { z } from 'zod';

// ─── Shared Backend Types ────────────────────────────────────────────────────

export type TransactionType = 'expense' | 'income' | 'transfer';
export type TransactionSource = 'manual' | 'voice' | 'receipt';
export type CategoryType = 'expense' | 'income';

/**
 * How the AI resolved the transaction date.
 * explicit_date  — date was clearly stated ("আগস্ট ৫", "on August 5")
 * relative_date  — date was relative ("গতকাল", "last Friday")
 * receipt_date   — date extracted from receipt image
 * inferred_today — no date clue; today used as fallback → uncertain: true
 */
export type DateSource = 'explicit_date' | 'relative_date' | 'inferred_today' | 'receipt_date';

export interface CategoryForAI {
  id: string;
  name: string;
  type: CategoryType;
}

export interface AIContext {
  timezone: string;
  currentDate: string;       // 'YYYY-MM-DD' from client device
  currentDateTime: string;   // ISO string from client device
  categoryList: CategoryForAI[];
  sttModel?: 'gemini' | 'whisper';
}

// ─── Zod Schema for AI Transaction Output ───────────────────────────────────
// Backend validates all AI output against this schema before returning to client.
// Transactions that fail validation are dropped and counted in droppedCount.

export const aiTransactionSchema = z.object({
  // MANDATORY — AI must provide all of these
  categoryId: z.string().min(1, 'categoryId is required'),
  categoryName: z.string().min(1, 'categoryName is required'),
  amount: z.number().positive('amount must be a positive number'),
  currency: z.string().default('BDT'),
  comment: z.string().optional().default(''),
  transactionDate: z.string().regex(
    /^\d{4}-\d{2}-\d{2}$/,
    'transactionDate must be YYYY-MM-DD'
  ),
  dateSource: z.enum(['explicit_date', 'relative_date', 'inferred_today', 'receipt_date']),
  confidence: z.number().min(0).max(1),
  source: z.enum(['voice', 'receipt']),
  type: z.enum(['expense', 'income', 'transfer']),

  // OPTIONAL
  dateExpression: z.string().optional(),

  paymentMethod: z.string().optional(),

  // UNCERTAINTY FLAGS
  uncertain: z.boolean().optional(),
  uncertainFields: z.array(
    z.enum(['amount', 'category', 'date', 'comment'])
  ).optional(),
});

export type AITransactionInput = z.infer<typeof aiTransactionSchema>;

export const aiParseResponseSchema = z.object({
  transactions: z.array(aiTransactionSchema),
  rawTranscript: z.string().optional(),
  receiptDate: z.string().optional(),

  total: z.number().optional(),
  processingNotes: z.string().optional(),
});

// ─── Service Response Types ───────────────────────────────────────────────────

export interface AIParseResponse {
  transactions: AITransactionInput[];
  rawTranscript?: string;
  receiptDate?: string;

  total?: number;
  processingNotes?: string;
  droppedCount?: number;  // transactions dropped due to validation failure
  engineUsed?: string;
  sttEngine?: 'groq' | 'gemini';
}

export interface OCRResult {
  text: string;
  confidence?: number;
  rawResponse?: unknown;
}

// ─── Service Adapter Interfaces ───────────────────────────────────────────────

/**
 * AI service adapter.
 * Default: GeminiAIService (gemini-2.5-flash, configurable via GEMINI_MODEL env var).
 * Swap by implementing this interface and injecting a different instance.
 *
 * Voice pipeline: Single Gemini call with raw audio → structured JSON.
 * No separate speech-to-text step. The parseVoiceAudio method handles
 * both transcription and parsing internally.
 */
export interface IAIService {
  /**
   * Parse voice audio into structured transactions.
   * Sends audio directly to Gemini — no separate STT step.
   * Returns validated AITransactionInput[] (never auto-saves).
   */
  parseVoiceAudio(
    audioBase64: string,
    mimeType: string,
    context: AIContext
  ): Promise<AIParseResponse>;

  /**
   * Parse pre-transcribed text transcript into structured transactions.
   */
  parseVoiceText(
    transcriptText: string,
    context: AIContext
  ): Promise<AIParseResponse>;

  /**
   * Parse OCR text (from receipt) into structured transactions.
   * May optionally receive the original image for fallback vision parsing.
   */
  parseReceiptText(
    ocrText: string,
    context: AIContext,
    receiptImageBase64?: string
  ): Promise<AIParseResponse>;

  /**
   * Generate natural-language financial insights from transaction history.
   * Must only use real transaction data — never fabricate figures.
   */
  generateInsights(
    transactions: AITransactionInput[],
    context: { currentDate: string; currency: string }
  ): Promise<string[]>;
}

/**
 * OCR service adapter.
 * Default: GoogleVisionOCRService using Application Default Credentials.
 * Set GOOGLE_APPLICATION_CREDENTIALS env var to service-account JSON path.
 * Do NOT use GOOGLE_CLOUD_VISION_API_KEY — ADC is the correct approach.
 *
 * Swap by implementing this interface and setting OCR_PROVIDER env var.
 */
export interface IOCRService {
  extractText(imageBase64: string, mimeType: string): Promise<OCRResult>;
}

// ─── Request Body Types ───────────────────────────────────────────────────────

export interface ParseVoiceRequestBody {
  audioBase64: string;
  audioMimeType: string;
  timezone: string;
  currentDate: string;
  currentDateTime: string;
  categoryList: CategoryForAI[];
}

export interface ProcessReceiptRequestBody {
  imageBase64: string;
  imageMimeType: string;
  timezone: string;
  currentDate: string;
  currentDateTime: string;
  categoryList: CategoryForAI[];
}

// ─── Version Control & OTA Types ─────────────────────────────────────────────

export interface AppVersionInfo {
  version: string;             // e.g. "1.0.1"
  buildNumber: number;         // e.g. 2
  apkUrl: string;              // Direct download link or Expo EAS build URL
  releaseNotes: string;        // Markdown / bullet points of what's new
  forceUpdate: boolean;        // If true, older versions must update
  minVersion: string;          // Minimum supported version
  releaseDate: string;         // ISO date or formatted date
  fileSize?: string;           // e.g. "28.5 MB"
  updatedAt: string;           // ISO timestamp of last modification
}

export interface VersionHistoryItem extends AppVersionInfo {
  id: string;
}
