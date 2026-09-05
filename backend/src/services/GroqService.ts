export class GroqSTTService {
  private apiKey: string | null;

  constructor() {
    this.apiKey = process.env.GROQ_API_KEY || null;
  }

  /**
   * Check if Groq API Key is present in environment.
   */
  public isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Transcribe raw audio buffer to text using Groq's whisper-large-v3-turbo model.
   * Typically completes in ~200ms with high accuracy for Bangla, English & Banglish.
   */
  public async transcribeAudio(
    audioBuffer: Buffer,
    mimeType: string = 'audio/m4a'
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    let ext = 'm4a';
    if (mimeType.includes('webm')) ext = 'webm';
    else if (mimeType.includes('wav')) ext = 'wav';
    else if (mimeType.includes('mp3') || mimeType.includes('mpeg')) ext = 'mp3';
    else if (mimeType.includes('mp4')) ext = 'mp4';

    const filename = `audio.${ext}`;

    const blob = new Blob([new Uint8Array(audioBuffer)], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const startTime = Date.now();
    try {
      const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: formData as any,
        signal: controller.signal,
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[GroqSTTService] Transcription failed (${response.status}):`, errText);
        throw new Error(`Groq STT failed with status ${response.status}: ${errText}`);
      }

      const data: any = await response.json();
      const transcript = (data.text || '').trim();
      console.log(`[GroqSTTService] Transcribed in ${elapsed}ms: "${transcript}"`);
      return transcript;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Fast-path transaction parser using Groq's ultra-fast LPU inference (openai/gpt-oss-20b).
   * Typically completes in ~300ms - 600ms with 100% structured JSON output.
   */
  public async parseTransactionPrompt(
    systemPrompt: string,
    userInput: string
  ): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000); // 6s max timeout

    const startTime = Date.now();
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userInput },
          ],
          response_format: { type: 'json_object' },
        }),
        signal: controller.signal,
      });

      const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`[GroqSTTService] Chat completion failed (${response.status}, ${elapsed}ms):`, errText);
        throw new Error(`Groq LLM failed with status ${response.status}: ${errText}`);
      }

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content || '';
      console.log(`[GroqSTTService] Parsed transaction JSON in ${elapsed}ms via openai/gpt-oss-20b`);
      return content;
    } finally {
      clearTimeout(timeout);
    }
  }
}

let groqInstance: GroqSTTService | null = null;
export function getGroqSTTService(): GroqSTTService {
  if (!groqInstance) {
    groqInstance = new GroqSTTService();
  }
  return groqInstance;
}
