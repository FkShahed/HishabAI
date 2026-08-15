import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import {
  IAIService,
  AIContext,
  AIParseResponse,
  AITransactionInput,
  aiTransactionSchema,
  CategoryForAI,
} from '../types/index';

// ─── Gemini AI Service ────────────────────────────────────────────────────────
//
// Implements IAIService using Google Gemini.
// Model is configurable via GEMINI_MODEL env var (default: gemini-3.6-flash).
//
// Retry strategy:
//   - Retries up to 4 times with exponential backoff on 503 (high demand) or 429.
//
// Voice pipeline: sends raw audio bytes + system prompt to Gemini in a single
// API call. Gemini handles both transcription and structured JSON extraction.
// No separate Whisper/STT step is needed.

function isQuotaError(error: any): boolean {
  if (error?.status === 429) return true;
  const msg: string = error?.message ?? '';
  return msg.includes('429') || msg.includes('Quota exceeded') || msg.includes('Resource Exhausted');
}

function isTransient(error: any): boolean {
  if (error?.status === 503) return true;
  const msg: string = error?.message ?? '';
  return msg.includes('503') || msg.includes('Service Unavailable') || msg.includes('high demand');
}

export class GeminiAIService implements IAIService {
  private genAI: GoogleGenerativeAI;
  private models: { name: string; model: GenerativeModel }[] = [];

  constructor() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);

    const modelsEnv = process.env.GEMINI_MODELS || 'gemini-3.6-flash';
    const modelNames = modelsEnv.split(',').map(m => m.trim()).filter(Boolean);

    for (const name of modelNames) {
      this.models.push({
        name,
        model: this.genAI.getGenerativeModel({ model: name }),
      });
    }

    if (this.models.length > 0) {
      console.log(`[GeminiAIService] Configured models: ${this.models.map(m => m.name).join(', ')}`);
    } else {
      throw new Error('No Gemini models configured.');
    }
  }

  // ─── Retry Helper ──────────────────────────────────────────────────────────

  /**
   * getGeminiModelChain exposes the configured models.
   */
  public getGeminiModelChain() {
    return this.models;
  }

  /**
   * Executes a function with model fallback support.
   * - Retries 503 errors on the same model up to 4 times.
   * - Immediately falls back to the next model on 429 quota exhaustion.
   */
  private async executeWithModelFallback<T>(
    fn: (model: GenerativeModel) => Promise<T>,
    label: string
  ): Promise<T> {
    const MAX_RETRIES = 4;
    
    for (let modelIdx = 0; modelIdx < this.models.length; modelIdx++) {
      const currentModel = this.models[modelIdx];
      if (modelIdx === 0) {
        console.log(`[GeminiAIService] Using model: ${currentModel.name}`);
      } else {
        console.log(`[GeminiAIService] Switching to fallback model: ${currentModel.name}`);
      }

      let lastError: Error = new Error('Unknown error');

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const result = await fn(currentModel.model);
          if (modelIdx > 0) {
            console.log(`[GeminiAIService] Success using model: ${currentModel.name}`);
          }
          return result;
        } catch (error: any) {
          lastError = error;

          // 1. Quota Exhaustion (429) -> Immediate fallback attempt (break retry loop)
          if (isQuotaError(error)) {
            console.warn(`[GeminiAIService] Model quota exceeded: ${currentModel.name}`);
            break; // Break the attempt loop to move to the next model
          }

          // 2. Transient Errors (503) -> Exponential Backoff
          if (isTransient(error) && attempt < MAX_RETRIES) {
            const delay = Math.pow(2, attempt - 1) * 1000;
            console.warn(`[GeminiAIService] ${label} got transient error on ${currentModel.name} (attempt ${attempt}/${MAX_RETRIES}) — retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else if (attempt === MAX_RETRIES) {
            // Out of retries for this model, move to next model
            console.error(`[GeminiAIService] ${label} failed on ${currentModel.name} after ${MAX_RETRIES} attempts.`);
            break; // Break the attempt loop to move to the next model
          } else {
            // Non-transient, non-quota error -> throw immediately without fallback
            console.error(`[GeminiAIService] ${label} failed with unrecoverable error on ${currentModel.name}:`, error.message);
            throw error;
          }
        }
      }
      
      // If we got here, the model failed (either quota or max retries).
      // The outer loop will advance to the next model.
    }

    // If all models are exhausted, throw the requested error.
    const finalErr: any = new Error('AI is temporarily unavailable. Please try again later.');
    finalErr.code = 'AI_ALL_MODELS_UNAVAILABLE';
    throw finalErr;
  }



  // ─── Voice Parsing ─────────────────────────────────────────────────────────

  /**
   * Parse voice audio into structured transactions.
   *
   * Sends raw audio directly to Gemini — single API call handles both
   * transcription (what was said) and structured JSON extraction.
   * No separate STT step. The speech-to-text layer is fully internal.
   *
   * AI safety rules enforced here:
   * - categoryId must match an existing ID from context.categoryList
   * - amount must be clearly stated; if not → transaction is omitted
   * - date must be resolved from audio; if ambiguous → dateSource: 'inferred_today', uncertain: true
   * - All output validated by Zod before returning; invalid transactions dropped
   */
  async parseVoiceAudio(
    audioBase64: string,
    mimeType: string,
    context: AIContext
  ): Promise<AIParseResponse> {
    const systemPrompt = this.buildVoiceSystemPrompt(context);

    const audioPart = { inlineData: { data: audioBase64, mimeType } };
    const textPart  = { text: systemPrompt };

    const result = await this.executeWithModelFallback(
      (m) => m.generateContent([audioPart, textPart]),
      'parseVoiceAudio'
    );
    const responseText = result.response.text();
    return this.parseAndValidateResponse(responseText, 'voice', context);
  }

  // ─── Receipt Parsing ────────────────────────────────────────────────────────

  async parseReceiptText(
    ocrText: string,
    context: AIContext,
    receiptImageBase64?: string
  ): Promise<AIParseResponse> {
    const systemPrompt = this.buildReceiptSystemPrompt(ocrText, context);

    const parts: any[] = [{ text: systemPrompt }];

    // If image is available, include it for better accuracy (multimodal)
    if (receiptImageBase64) {
      parts.unshift({
        inlineData: { data: receiptImageBase64, mimeType: 'image/jpeg' },
      } as any);
    }

    const result = await this.executeWithModelFallback(
      (m) => m.generateContent(parts as any),
      'parseReceiptText'
    );
    const responseText = result.response.text();
    return this.parseAndValidateResponse(responseText, 'receipt', context);
  }

  // ─── Insights Generation ────────────────────────────────────────────────────

  async generateInsights(
    transactions: AITransactionInput[],
    context: { currentDate: string; currency: string }
  ): Promise<string[]> {
    if (transactions.length === 0) return [];

    const summary = this.summarizeTransactions(transactions, context.currency);
    const prompt = `You are a financial advisor analyzing personal finance data.
Based ONLY on the following real transaction data (do NOT fabricate any figures):

${summary}

Today: ${context.currentDate}
Currency: ${context.currency}

Generate 3-5 concise, actionable financial insights in plain English.
Focus on spending patterns, budget health, and trends.
Return a JSON array of strings: ["insight 1", "insight 2", ...]
Do not include markdown. Do not invent numbers not in the data.`;

    try {
      const result = await this.executeWithModelFallback(
        (m) => m.generateContent(prompt),
        'generateInsights'
      );
      const text = result.response.text().trim();
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const insights = JSON.parse(cleaned);
      if (!Array.isArray(insights)) return [];
      return insights.filter((i): i is string => typeof i === 'string').slice(0, 5);
    } catch (error) {
      console.error('[GeminiAIService] generateInsights failed:', error);
      return [];
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private buildVoiceSystemPrompt(context: AIContext): string {
    const categoryListStr = context.categoryList
      .map((c) => `  { "id": "${c.id}", "name": "${c.name}", "type": "${c.type}" }`)
      .join(',\n');

    return `You are a financial transaction parser for HisabAI, a personal finance app.
The user has spoken a voice note describing their expenses/income. Your job is to extract structured transactions from the audio.

TODAY'S DATE: ${context.currentDate}
USER TIMEZONE: ${context.timezone}
CURRENT DATETIME: ${context.currentDateTime}

AVAILABLE CATEGORIES (you MUST use IDs from this list exactly — do NOT invent new categories):
[
${categoryListStr}
]

MANDATORY RULES — violating any of these causes data corruption:
1. Extract ONLY transactions clearly mentioned in the audio. Never invent a transaction.
2. Extract ONLY amounts clearly stated in the audio. Never guess or estimate an amount.
3. categoryId MUST be one of the IDs from the AVAILABLE CATEGORIES list above. Never use a categoryId not in this list.
4. transactionDate MUST be resolved to YYYY-MM-DD using the TODAY'S DATE and USER TIMEZONE above.
   - "আজকে" / "আজ" / "today" → ${context.currentDate}
   - "গতকাল" / "গতকালকে" / "yesterday" → one day before ${context.currentDate}
   - "পরশু" / "day before yesterday" / "two days ago" → two days before ${context.currentDate}
   - "গত শুক্রবার" / "last Friday" → resolve to the most recent Friday before ${context.currentDate}
   - Specific dates like "আগস্ট ৫" / "August 5" → use the year from ${context.currentDate}
5. If the date is not explicitly specified or is ambiguous in the audio, you MUST default transactionDate to "${context.currentDate}" (today's date) and set dateSource to "inferred_today".
6. If the amount is unclear or ambiguous, OMIT the transaction entirely (do not include it).
7. comment must contain the name of the item, store, or person. If there is no specific item, leave it empty.
8. confidence: a number 0-1 representing how certain you are about this transaction.
9. uncertain: set to true if any field is ambiguous. List ambiguous fields in uncertainFields.
10. source must always be "voice".

LANGUAGE: The audio may be in Bangla, English, or Banglish (mixed). Understand all three.

RESPONSE FORMAT — return ONLY valid JSON, no markdown, no explanation:
{
  "rawTranscript": "what you heard in the audio (verbatim)",
  "transactions": [
    {
      "type": "expense" | "income" | "transfer",
      "categoryId": "<id from AVAILABLE CATEGORIES>",
      "categoryName": "<matching name>",
      "amount": <number>,
      "currency": "BDT",
      "comment": "<Item or Merchant name>",
      "transactionDate": "YYYY-MM-DD",
      "dateSource": "explicit_date" | "relative_date" | "inferred_today",
      "dateExpression": "<original date text if any>",
      "confidence": <0-1>,
      "source": "voice",
      "uncertain": <boolean>,
      "uncertainFields": []
    }
  ],
  "processingNotes": "<any warnings or notes>"
}`;
  }

  private buildReceiptSystemPrompt(ocrText: string, context: AIContext): string {
    const categoryListStr = context.categoryList
      .map((c) => `  { "id": "${c.id}", "name": "${c.name}", "type": "${c.type}" }`)
      .join(',\n');

    return `You are a receipt parser for HisabAI, a personal finance app.
Extract expense transactions from the following receipt OCR text.

TODAY'S DATE: ${context.currentDate}
USER TIMEZONE: ${context.timezone}

AVAILABLE CATEGORIES (use IDs from this list exactly — do NOT invent categories):
[
${categoryListStr}
]

RECEIPT OCR TEXT:
---
${ocrText}
---

MANDATORY RULES:
1. Extract ONLY items/totals clearly present in the receipt. Never invent items or amounts.
2. categoryId MUST match an ID from AVAILABLE CATEGORIES. Never use an ID not in this list.
3. If the receipt has a clear printed date, use it as transactionDate (dateSource: "receipt_date").
   If no date is found or unclear on the receipt, you MUST default transactionDate to "${context.currentDate}" (today's date) and set dateSource to "inferred_today".
4. Group related items into logical categories where sensible (e.g., food items → Food category).
5. Use the receipt TOTAL as the main transaction if individual items are unclear.
6. comment must contain the item name or store name.
7. source must always be "receipt".
8. IMPORTANT: Do NOT extract discounts, savings, or coupons as separate transactions (they are not income). Instead, deduct the discount from the relevant items or the total expense so the final amounts reflect the actual discounted price paid. Do NOT append text like "(adjusted for discount)" to the item name or comment.

RESPONSE FORMAT — return ONLY valid JSON, no markdown:
{
  "receiptDate": "YYYY-MM-DD or null",
  "total": <total amount if found>,
  "transactions": [
    {
      "type": "expense",
      "categoryId": "<id>",
      "categoryName": "<name>",
      "amount": <number>,
      "currency": "BDT",
      "comment": "<Item name>",
      "transactionDate": "YYYY-MM-DD",
      "dateSource": "receipt_date" | "inferred_today",
      "confidence": <0-1>,
      "source": "receipt",
      "uncertain": <boolean>,
      "uncertainFields": []
    }
  ],
  "processingNotes": "<warnings>"
}`;
  }

  /**
   * Parse AI JSON output and validate each transaction against the Zod schema.
   * Transactions that fail validation are dropped (not returned to client).
   * This is the safety net that enforces all AI rules.
   */
  private parseAndValidateResponse(
    rawText: string,
    source: 'voice' | 'receipt',
    context: AIContext
  ): AIParseResponse {
    // Strip markdown code fences if present
    const cleaned = rawText
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error('[GeminiAIService] Failed to parse AI JSON:', cleaned.slice(0, 200));
      return {
        transactions: [],
        processingNotes: 'AI returned invalid JSON',
        droppedCount: 0,
      };
    }

    const rawTransactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
    const validCategoryIds = new Set(context.categoryList.map((c) => c.id));

    const validTransactions: AITransactionInput[] = [];
    let droppedCount = 0;

    for (const raw of rawTransactions) {
      // Enforce source field
      raw.source = source;

      // Ensure transactionDate defaults to today if not provided, empty, or invalid
      if (!raw.transactionDate || typeof raw.transactionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.transactionDate)) {
        raw.transactionDate = context.currentDate;
        raw.dateSource = 'inferred_today';
      }

      // Safety: if categoryId not in user's list, mark uncertain
      if (typeof raw.categoryId === 'string' && !validCategoryIds.has(raw.categoryId)) {
        console.warn(`[GeminiAIService] AI returned unknown categoryId: ${raw.categoryId} — marking uncertain`);
        raw.uncertain = true;
        raw.uncertainFields = [...(raw.uncertainFields ?? []), 'category'];
        // Try to find a fallback category or drop
        // For now, drop the transaction to be safe
        droppedCount++;
        continue;
      }

      const result = aiTransactionSchema.safeParse(raw);
      if (result.success) {
        validTransactions.push(result.data);
      } else {
        console.warn('[GeminiAIService] Transaction dropped (schema validation):', result.error.issues);
        droppedCount++;
      }
    }

    return {
      transactions: validTransactions,
      rawTranscript: typeof parsed.rawTranscript === 'string' ? parsed.rawTranscript : undefined,
      receiptDate: typeof parsed.receiptDate === 'string' ? parsed.receiptDate : undefined,
      total: typeof parsed.total === 'number' ? parsed.total : undefined,
      processingNotes: typeof parsed.processingNotes === 'string' ? parsed.processingNotes : undefined,
      droppedCount,
    };
  }

  private summarizeTransactions(
    transactions: AITransactionInput[],
    currency: string
  ): string {
    const byCategory = new Map<string, number>();
    let totalExpense = 0;
    let totalIncome = 0;

    for (const t of transactions) {
      if (t.type === 'expense') {
        totalExpense += t.amount;
        byCategory.set(t.categoryName, (byCategory.get(t.categoryName) ?? 0) + t.amount);
      } else if (t.type === 'income') {
        totalIncome += t.amount;
      }
    }

    const lines = [
      `Total Expense: ${currency} ${totalExpense}`,
      `Total Income: ${currency} ${totalIncome}`,
      `Transaction Count: ${transactions.length}`,
      'By Category:',
      ...Array.from(byCategory.entries()).map(
        ([cat, amt]) => `  ${cat}: ${currency} ${amt}`
      ),
    ];

    return lines.join('\n');
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createAIService(): IAIService {
  const hasApiKey = Boolean(process.env.GOOGLE_GEMINI_API_KEY);

  if (!hasApiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not set. Real AI is required, mock service has been disabled.');
  }

  return new GeminiAIService();
}
