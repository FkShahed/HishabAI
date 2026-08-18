import express, { Request, Response } from 'express';
import multer from 'multer';
import { createAIService } from '../services/AIService';
import { createOCRService } from '../services/OCRService';

const router = express.Router();
const upload = multer();

let aiServiceInstance: ReturnType<typeof createAIService> | null = null;
function getAIService() {
  if (!process.env.GOOGLE_GEMINI_API_KEY) {
    throw new Error('GOOGLE_GEMINI_API_KEY is not set in backend/.env. Please configure your Gemini API key.');
  }
  if (!aiServiceInstance) {
    aiServiceInstance = createAIService();
  }
  return aiServiceInstance;
}

let ocrServiceInstance: ReturnType<typeof createOCRService> | null = null;
function getOCRService() {
  if (!ocrServiceInstance) {
    ocrServiceInstance = createOCRService();
  }
  return ocrServiceInstance;
}

// Temporary mock category list for AI context
const MOCK_CATEGORIES = [
  { id: 'food', name: 'Food & Dining', type: 'expense' as const },
  { id: 'transportation', name: 'Transportation', type: 'expense' as const },
  { id: 'shopping', name: 'Shopping', type: 'expense' as const },
  { id: 'salary', name: 'Salary', type: 'income' as const },
];

/**
 * POST /api/ai/voice
 * Expects multipart/form-data with an 'audio' file field.
 */
router.post('/voice', upload.single('audio'), async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No audio file provided' });
      return;
    }

    const { buffer, mimetype } = req.file;
    const { categoryList } = req.body;

    const categories = categoryList ? JSON.parse(categoryList) : MOCK_CATEGORIES;

    const context = {
      timezone: req.body.timezone || 'UTC',
      currentDate: req.body.currentDate || new Date().toISOString().split('T')[0],
      currentDateTime: req.body.currentDateTime || new Date().toISOString(),
      categoryList: categories,
    };

    const base64Audio = buffer.toString('base64');
    let effectiveMime = mimetype;
    if (!effectiveMime || effectiveMime === 'application/octet-stream') {
      effectiveMime = 'audio/mp4';
    }
    const result = await getAIService().parseVoiceAudio(base64Audio, effectiveMime, context);
    
    res.json({
      success: true,
      transactions: result.transactions,
      rawTranscript: result.rawTranscript,
      processingNotes: result.processingNotes,
    });
  } catch (error) {
    const err = error as any;
    console.error('[AI Route] Voice Error:', err.message || err);
    
    const isQuota = err.status === 429 || err.code === 'AI_ALL_MODELS_UNAVAILABLE' || err.message?.includes('429') || err.message?.includes('Quota');
    const isBusy = err.status === 503 || err.message?.includes('503') || err.message?.includes('busy');

    if (isQuota) {
      res.status(429).json({ 
        error: 'AI daily request limit reached. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
      return;
    }

    if (isBusy) {
      res.status(503).json({
        error: 'AI service is temporarily busy. Please try again in a few seconds.',
        code: 'SERVER_BUSY'
      });
      return;
    }

    res.status(500).json({ 
      error: err.message || 'Unable to process request. Please try again.',
      code: err.code || 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/ai/receipt
 * Expects { imageBase64: string, mimeType: string, categoryList: [...] }
 * Multimodal: Can use Cloud Vision OCR OR directly send receipt image to Gemini 2.5 Flash!
 */
router.post('/receipt', express.json({ limit: '10mb' }), async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageBase64, mimeType, categoryList } = req.body;

    if (!imageBase64) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    // expo-image-picker may return the base64 string WITH the data URI prefix if configured that way
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const categories = typeof categoryList === 'string' 
      ? JSON.parse(categoryList) 
      : (categoryList || MOCK_CATEGORIES);

    let ocrText = '';
    let confidence = 0.9;

    // 1. Try Cloud Vision OCR if configured
    const ocrStartTime = Date.now();
    try {
      const ocrResult = await getOCRService().extractText(cleanBase64, mimeType || 'image/jpeg');
      if (ocrResult.text && ocrResult.text.trim().length > 0) {
        ocrText = ocrResult.text;
        if (ocrResult.confidence !== undefined) {
          confidence = ocrResult.confidence;
        }
        console.log(`[AI Route] Cloud Vision OCR extracted text in ${Date.now() - ocrStartTime}ms: "${ocrText.replace(/\n/g, ' ').slice(0, 60)}..."`);
      } else {
        console.log(`[AI Route] Cloud Vision OCR returned no text (${Date.now() - ocrStartTime}ms)`);
      }
    } catch (ocrErr: any) {
      console.warn(`[AI Route] Cloud Vision OCR error (${Date.now() - ocrStartTime}ms):`, ocrErr.message || ocrErr);
    }

    const context = {
      timezone: req.body.timezone || 'UTC',
      currentDate: req.body.currentDate || new Date().toISOString().split('T')[0],
      currentDateTime: req.body.currentDateTime || new Date().toISOString(),
      categoryList: categories,
    };

    // 2. Fast Path: If OCR text was extracted, parse TEXT ONLY with Gemini (do NOT send 5MB image)
    if (ocrText && ocrText.trim().length > 0) {
      const geminiStartTime = Date.now();
      console.log('[AI Route] Mode: TEXT ONLY (Fast Path) — Sending 300-byte text string to Gemini (NO IMAGE)');
      const result = await getAIService().parseReceiptText(ocrText, context);
      console.log(`[AI Route] Gemini parsed text into transactions in ${Date.now() - geminiStartTime}ms`);
      
      res.json({
        success: true,
        transactions: result.transactions,
        processingNotes: result.processingNotes,
        confidence: confidence ?? 0.9,
      });
      return;
    }

    // 3. Fallback Path: Send raw image to Gemini Multimodal Vision ONLY if OCR failed/returned no text
    const geminiVisionStartTime = Date.now();
    console.log('[AI Route] Mode: MULTIMODAL IMAGE (Fallback Path) — Sending raw image binary to Gemini Vision');
    const result = await getAIService().parseReceiptText('Direct receipt image analysis', context, cleanBase64);
    console.log(`[AI Route] Gemini Multimodal Vision completed in ${Date.now() - geminiVisionStartTime}ms`);

    res.json({
      success: true,
      transactions: result.transactions,
      processingNotes: result.processingNotes,
      confidence: confidence ?? 0.9,
    });
  } catch (error) {
    const err = error as any;
    console.error('[AI Route] Receipt Error:', err.message || err);

    const isQuota = err.status === 429 || err.code === 'AI_ALL_MODELS_UNAVAILABLE' || err.message?.includes('429') || err.message?.includes('Quota');
    const isBusy = err.status === 503 || err.message?.includes('503') || err.message?.includes('busy');

    if (isQuota) {
      res.status(429).json({ 
        error: 'AI daily request limit reached. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
      return;
    }

    if (isBusy) {
      res.status(503).json({
        error: 'AI service is temporarily busy. Please try again in a few seconds.',
        code: 'SERVER_BUSY'
      });
      return;
    }

    res.status(500).json({ 
      error: err.message || 'Unable to process receipt. Please try again.',
      code: err.code || 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/ai/receipt-text
 * Fast endpoint for pre-extracted OCR text string (<1s response time).
 * Expects { ocrText: string, categoryList: [...] }
 */
router.post('/receipt-text', express.json({ limit: '1mb' }), async (req: Request, res: Response): Promise<void> => {
  try {
    const { ocrText, categoryList } = req.body;

    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim().length === 0) {
      res.status(400).json({ error: 'No ocrText provided' });
      return;
    }

    const categories = typeof categoryList === 'string'
      ? JSON.parse(categoryList)
      : (categoryList || MOCK_CATEGORIES);

    const context = {
      timezone: req.body.timezone || 'UTC',
      currentDate: req.body.currentDate || new Date().toISOString().split('T')[0],
      currentDateTime: req.body.currentDateTime || new Date().toISOString(),
      categoryList: categories,
    };

    const startTime = Date.now();
    const result = await getAIService().parseReceiptText(ocrText, context);
    console.log(`[AI Route] Fast receipt-text parsed in ${Date.now() - startTime}ms`);

    res.json({
      success: true,
      transactions: result.transactions,
      processingNotes: result.processingNotes,
      confidence: 0.95,
    });
  } catch (error) {
    const err = error as any;
    console.error('[AI Route] Receipt-Text Error:', err.message || err);

    const isQuota = err.status === 429 || err.code === 'AI_ALL_MODELS_UNAVAILABLE' || err.message?.includes('429') || err.message?.includes('Quota');
    const isBusy = err.status === 503 || err.message?.includes('503') || err.message?.includes('busy');

    if (isQuota) {
      res.status(429).json({
        error: 'AI daily request limit reached. Please try again later.',
        code: 'RATE_LIMIT_EXCEEDED'
      });
      return;
    }

    if (isBusy) {
      res.status(503).json({
        error: 'AI service is temporarily busy. Please try again in a few seconds.',
        code: 'SERVER_BUSY'
      });
      return;
    }

    res.status(500).json({
      error: err.message || 'Unable to process receipt text. Please try again.',
      code: err.code || 'INTERNAL_ERROR'
    });
  }
});

export default router;
