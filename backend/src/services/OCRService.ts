import { ImageAnnotatorClient } from '@google-cloud/vision';
import { IOCRService, OCRResult } from '../types/index';

// ─── Google Cloud Vision OCR Service ─────────────────────────────────────────
//
// Uses Application Default Credentials (ADC) via GOOGLE_APPLICATION_CREDENTIALS
// env var pointing to a service-account JSON file.
//
// DO NOT use GOOGLE_CLOUD_VISION_API_KEY — ADC is the correct approach for
// backend service accounts. The Vision client automatically reads credentials
// from GOOGLE_APPLICATION_CREDENTIALS.
//
// To set up:
//   1. Go to Google Cloud Console → IAM → Service Accounts
//   2. Create a service account with Cloud Vision API User role
//   3. Download the JSON key file
//   4. Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

export class GoogleVisionOCRService implements IOCRService {
  private client: ImageAnnotatorClient;

  constructor() {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        this.client = new ImageAnnotatorClient({ credentials });
        console.log('[GoogleVisionOCRService] Initialized with GOOGLE_SERVICE_ACCOUNT_JSON');
        return;
      } catch (e) {
        console.warn('[GoogleVisionOCRService] Failed parsing GOOGLE_SERVICE_ACCOUNT_JSON:', e);
      }
    }
    this.client = new ImageAnnotatorClient();
    console.log('[GoogleVisionOCRService] Initialized with Application Default Credentials');
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

      // Estimate confidence from word-level confidence if available
      const confidence = detections[0].confidence ?? 0.9;

      return {
        text: fullText,
        confidence,
        rawResponse: result,
      };
    } catch (error) {
      console.error('[GoogleVisionOCRService] extractText error:', error);
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
  const hasCredentials = Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS);

  if (provider === 'mock' || !hasCredentials) {
    if (!hasCredentials && provider !== 'mock') {
      console.warn(
        '[OCRService] GOOGLE_APPLICATION_CREDENTIALS not set — using MockOCRService. ' +
        'Set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON path for real OCR.'
      );
    }
    return new MockOCRService();
  }

  return new GoogleVisionOCRService();
}
