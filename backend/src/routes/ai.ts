import express, { Request, Response } from 'express';
import multer from 'multer';
import { createAIService } from '../services/AIService';
import { createOCRService } from '../services/OCRService';

const router = express.Router();
const upload = multer();

const aiService = createAIService();
const ocrService = createOCRService();

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
    const result = await aiService.parseVoiceAudio(base64Audio, mimetype, context);
    
    res.json({
      success: true,
      transactions: result.transactions,
      rawTranscript: result.rawTranscript,
    });
  } catch (error) {
    const err = error as any;
    res.status(500).json({ 
      error: err.message || 'Unknown error',
      code: err.code
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
    try {
      const ocrResult = await ocrService.extractText(cleanBase64, mimeType || 'image/jpeg');
      if (ocrResult.text) {
        ocrText = ocrResult.text;
        if (ocrResult.confidence !== undefined) {
          confidence = ocrResult.confidence;
        }
      }
    } catch {
      console.log('[AI Route] Cloud Vision OCR not active — using direct Gemini Multimodal vision');
    }

    const context = {
      timezone: req.body.timezone || 'UTC',
      currentDate: req.body.currentDate || new Date().toISOString().split('T')[0],
      currentDateTime: req.body.currentDateTime || new Date().toISOString(),
      categoryList: categories,
    };

    // 2. Parse image directly with Gemini 2.5 Flash Multimodal Vision
    const result = await aiService.parseReceiptText(ocrText || 'Direct receipt image analysis', context, cleanBase64);

    res.json({
      success: true,
      transactions: result.transactions,
      processingNotes: result.processingNotes,
      confidence: confidence ?? 0.9,
    });
  } catch (error) {
    const err = error as any;
    res.status(500).json({ 
      error: err.message || 'Unknown error',
      code: err.code
    });
  }
});

export default router;
