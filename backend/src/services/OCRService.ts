import { ImageAnnotatorClient } from '@google-cloud/vision';
import { IOCRService, OCRResult } from '../types/index';
import fs from 'fs';

// ─── Google Cloud Vision OCR Service ─────────────────────────────────────────

export class GoogleVisionOCRService implements IOCRService {
  private client: ImageAnnotatorClient;

  constructor() {
    const options: any = {};
    if (process.env.GOOGLE_CREDENTIALS_JSON) {
      try {
        options.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      } catch (e) {
        console.warn('[GoogleVisionOCRService] Failed to parse GOOGLE_CREDENTIALS_JSON:', e);
      }
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const creds = process.env.GOOGLE_APPLICATION_CREDENTIALS.trim();
      if (creds.startsWith('{')) {
        try {
          options.credentials = JSON.parse(creds);
        } catch (e) {}
      }
    }
    this.client = new ImageAnnotatorClient(options);
    console.log('[GoogleVisionOCRService] Initialized Google Vision client');
  }

  async extractText(imageBase64: string, _mimeType: string): Promise<OCRResult> {
    try {
      const [result] = await this.client.textDetection({
        image: {
          content: imageBase64,
        },
      });

      const detections = result.textAnnotations;
      if (!detections || detections.length === 0) {
        return { text: '', confidence: 0 };
      }

      // First annotation contains the full extracted text
      const fullText = detections[0].description ?? '';
      const confidence = detections[0].confidence ?? 0.9;

      return {
        text: fullText,
        confidence,
        rawResponse: result,
      };
    } catch (error) {
      console.warn('[GoogleVisionOCRService] Cloud Vision extraction notice:', (error as Error).message);
      throw new Error(`OCR extraction failed: ${(error as Error).message}`);
    }
  }
}

// ─── Mock OCR Service (for development without Cloud Vision credentials) ──────

export class MockOCRService implements IOCRService {
  async extractText(_imageBase64: string, _mimeType: string): Promise<OCRResult> {
    console.log('[MockOCRService] extractText called — returning mock OCR text');
    return {
      text: `Shajgoj Mart
Date: ${new Date().toLocaleDateString('en-GB')}

Rice (5kg)     ৳500
Potato (2kg)   ৳100
Onion (1kg)    ৳80
Soap           ৳50
Shampoo        ৳300
-----------------
Total:         ৳1,030

Thank you for shopping!`,
      confidence: 0.95,
    };
  }
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createOCRService(): IOCRService {
  const provider = process.env.OCR_PROVIDER ?? 'google_vision';
  const hasJsonCreds = Boolean(
    process.env.GOOGLE_CREDENTIALS_JSON || 
    (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.GOOGLE_APPLICATION_CREDENTIALS.trim().startsWith('{'))
  );
  const hasFileCreds = Boolean(
    process.env.GOOGLE_APPLICATION_CREDENTIALS && 
    !process.env.GOOGLE_APPLICATION_CREDENTIALS.trim().startsWith('{') &&
    fs.existsSync(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  );

  if (provider === 'mock' || (!hasJsonCreds && !hasFileCreds)) {
    return new MockOCRService();
  }

  try {
    return new GoogleVisionOCRService();
  } catch (err) {
    console.warn('[OCRService] Fallback to MockOCRService:', err);
    return new MockOCRService();
  }
}
