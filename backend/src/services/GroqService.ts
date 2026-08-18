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

    const blob = new Blob([audioBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, filename);
    formData.append('model', 'whisper-large-v3-turbo');
    formData.append('response_format', 'json');

    const startTime = Date.now();
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: formData as any,
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
  }
}

let groqInstance: GroqSTTService | null = null;
export function getGroqSTTService(): GroqSTTService {
  if (!groqInstance) {
    groqInstance = new GroqSTTService();
  }
  return groqInstance;
}
