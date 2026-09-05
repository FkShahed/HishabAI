import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system';

// Production Backend URL hosted on Vercel (or from environment variable)
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'https://hishab-ai-backend.vercel.app/api';
export const BACKEND_URL = API_BASE_URL.replace(/\/api\/?$/, '');

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90 seconds — allows up to 4 retry attempts with backoff
});

if (__DEV__) {
  console.log('[API] Connected to backend:', API_BASE_URL);
}

/**
 * Formats low-level network, timeout, quota, or server errors into clean, user-friendly messages.
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred. Please try again.';
  if (typeof error === 'string') return error;

  const status = error.response?.status;
  const serverMsg = error.response?.data?.error || error.response?.data?.message;

  // 1. Quota / Rate Limit Exceeded
  if (
    status === 429 || 
    error.response?.data?.code === 'RATE_LIMIT_EXCEEDED' ||
    serverMsg?.toLowerCase().includes('limit') || 
    serverMsg?.toLowerCase().includes('quota')
  ) {
    return 'AI daily usage limit reached. Please try again later.';
  }

  // 2. Server Busy / 503
  if (
    status === 503 || 
    error.response?.data?.code === 'SERVER_BUSY' ||
    serverMsg?.toLowerCase().includes('busy')
  ) {
    return 'AI service is temporarily busy. Please try again in a few seconds.';
  }

  // 3. Returned backend error string
  if (typeof serverMsg === 'string' && serverMsg.trim().length > 0) {
    return serverMsg.trim();
  }

  // 4. Timeout
  if (error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout')) {
    return 'Connection timed out. Please check your internet and try again.';
  }

  // 5. Explicit Network Disconnection / Offline
  const isExplicitNetworkError = 
    error.message === 'Network Error' || 
    error.code === 'ERR_NETWORK' ||
    error.message?.toLowerCase().includes('network error') ||
    error.message?.toLowerCase().includes('failed to fetch');

  if (isExplicitNetworkError) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }

  // 6. Return existing error message if available
  if (error.message && typeof error.message === 'string' && error.message.trim().length > 0) {
    return error.message;
  }

  return 'Something went wrong. Please try again.';
}

/**
 * Resilient POST helper: attempts Axios first, and seamlessly falls back to native fetch
 * if Axios experiences an Android socket reset or Network Error.
 */
async function postWithResilience(endpoint: string, body: any, timeoutMs = 35000): Promise<any> {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${cleanEndpoint}`;

  // 1. Primary: Axios
  try {
    const response = await api.post(cleanEndpoint, body, { timeout: timeoutMs });
    return response.data;
  } catch (axiosErr: any) {
    // If it's a real HTTP status response from server (400, 429, 500), don't retry, throw directly
    if (axiosErr.response?.status) {
      throw new Error(getFriendlyErrorMessage(axiosErr));
    }

    console.warn(`[API] Axios ${cleanEndpoint} network hiccup (${axiosErr.message}) — attempting native fetch fallback...`);
  }

  // 2. Fallback: Native fetch (uses native OS HTTP stack directly)
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const fetchRes = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!fetchRes.ok) {
      const errJson = await fetchRes.json().catch(() => null);
      const errMsg = errJson?.error || errJson?.message || `Server returned ${fetchRes.status}`;
      throw new Error(errMsg);
    }

    return await fetchRes.json();
  } catch (fetchErr: any) {
    console.error(`[API] Resilient fetch also failed for ${cleanEndpoint}:`, fetchErr.message);
    throw new Error(getFriendlyErrorMessage(fetchErr));
  }
}

export const AIServiceClient = {
  /**
   * Upload audio blob/file for voice parsing
   */
  async parseVoice(
    audioUri: string, 
    categories: { id: string; name: string; type: string }[], 
    sttModel?: 'gemini' | 'whisper'
  ) {
    const todayStr = new Date().toISOString().split('T')[0];
    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';

    let base64Audio = '';
    let mimeType = 'audio/m4a';

    // 1. Convert audio to Base64 for fast, reliable JSON upload (avoids Axios RN boundary bugs on mobile)
    try {
      if (Platform.OS === 'web') {
        const res = await fetch(audioUri);
        const blob = await res.blob();
        mimeType = blob.type || 'audio/webm';
        base64Audio = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const result = reader.result as string;
            const b64 = result.includes(',') ? result.split(',')[1] : result;
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } else {
        base64Audio = await FileSystem.readAsStringAsync(audioUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        mimeType = 'audio/m4a';
      }
    } catch (readErr) {
      console.warn('[API] Could not read audio as base64, will use FormData:', readErr);
    }

    if (base64Audio) {
      const voicePayload = {
        audioBase64: base64Audio,
        mimeType,
        categoryList: categories,
        currentDate: todayStr,
        timezone: clientTimezone,
        currentDateTime: new Date().toISOString(),
        sttModel: sttModel || 'whisper',
      };

      try {
        return await postWithResilience('/ai/voice', voicePayload, 45000);
      } catch (jsonErr: any) {
        console.warn('[API] Resilient JSON voice upload error, trying FormData fallback:', jsonErr?.message);
        // If server responded with a definitive business error, throw it
        if (jsonErr.message && !jsonErr.message.toLowerCase().includes('network')) {
          throw jsonErr;
        }
      }
    }

    // 2. Fallback: FormData
    const formData = new FormData();
    if (Platform.OS === 'web') {
      const res = await fetch(audioUri);
      const blob = await res.blob();
      const file = new File([blob], 'voice_recording.webm', { type: blob.type || 'audio/webm' });
      formData.append('audio', file);
    } else {
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'voice_recording.m4a',
      } as any);
    }

    formData.append('categoryList', JSON.stringify(categories));
    formData.append('currentDate', todayStr);
    formData.append('timezone', clientTimezone);
    formData.append('currentDateTime', new Date().toISOString());
    formData.append('sttModel', sttModel || 'whisper');

    try {
      const response = await api.post('/ai/voice', formData, {
        transformRequest: (data) => data,
        timeout: 45000,
      });
      return response.data;
    } catch (error: any) {
      const friendlyMsg = getFriendlyErrorMessage(error);
      console.error('[API] parseVoice error:', friendlyMsg);
      throw new Error(friendlyMsg);
    }
  },

  /**
   * Send raw text note directly for AI parsing (bypassing audio)
   */
  async parseText(text: string, categories: { id: string; name: string; type: string }[]) {
    const todayStr = new Date().toISOString().split('T')[0];
    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';

    const payload = {
      text,
      categoryList: categories,
      currentDate: todayStr,
      timezone: clientTimezone,
      currentDateTime: new Date().toISOString(),
    };

    return await postWithResilience('/ai/text', payload, 35000);
  },

  /**
   * Send Base64 image for receipt parsing
   */
  async parseReceipt(imageBase64: string, categories: { id: string; name: string; type: string }[]) {
    const todayStr = new Date().toISOString().split('T')[0];
    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';

    const payload = {
      imageBase64,
      mimeType: 'image/jpeg',
      categoryList: categories,
      currentDate: todayStr,
      timezone: clientTimezone,
      currentDateTime: new Date().toISOString(),
    };

    return await postWithResilience('/ai/receipt', payload, 45000);
  },

  /**
   * Fast path: Send extracted OCR text string directly (<1s response time)
   */
  async parseReceiptText(ocrText: string, categories: { id: string; name: string; type: string }[]) {
    const todayStr = new Date().toISOString().split('T')[0];
    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';

    const payload = {
      ocrText,
      categoryList: categories,
      currentDate: todayStr,
      timezone: clientTimezone,
      currentDateTime: new Date().toISOString(),
    };

    return await postWithResilience('/ai/receipt-text', payload, 25000);
  }
};

export interface AppVersionInfo {
  version: string;
  buildNumber: number;
  apkUrl: string;
  releaseNotes: string;
  forceUpdate: boolean;
  minVersion: string;
  releaseDate: string;
  fileSize?: string;
  updatedAt: string;
}

export interface CheckUpdateResult {
  hasUpdate: boolean;
  forceUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  latestBuildNumber: number;
  apkUrl: string;
  releaseNotes: string;
  fileSize?: string;
  releaseDate?: string;
}

function compareSemver(v1: string, v2: string): number {
  const clean1 = (v1 || '0.0.0').replace(/^v/i, '');
  const clean2 = (v2 || '0.0.0').replace(/^v/i, '');
  const p1 = clean1.split('.').map(n => parseInt(n, 10) || 0);
  const p2 = clean2.split('.').map(n => parseInt(n, 10) || 0);
  
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const num1 = p1[i] || 0;
    const num2 = p2[i] || 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

export const VersionServiceClient = {
  /**
   * Fetch the latest version info from backend
   */
  async getLatestVersion(): Promise<AppVersionInfo> {
    try {
      const response = await api.get('/version/latest');
      return response.data.data;
    } catch (error: any) {
      console.error('[API] Failed to get latest version:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Check if an update is available comparing against current app version and build
   */
  async checkUpdate(
    currentVersion: string = Constants.expoConfig?.version || '1.0.0',
    currentBuildNumber: number = 1
  ): Promise<CheckUpdateResult> {
    const latest = await this.getLatestVersion();
    
    const semverDiff = compareSemver(latest.version, currentVersion);
    const hasNewerVersion = semverDiff > 0;
    const hasNewerBuild = semverDiff === 0 && (latest.buildNumber || 1) > currentBuildNumber;

    // Web browsers load live web assets — disable APK update prompt in web view mode
    const isWeb = Platform.OS === 'web';
    const hasUpdate = !isWeb && (hasNewerVersion || hasNewerBuild) && Boolean(latest.apkUrl);

    // Force update if forceUpdate is true and user version is behind
    const isBelowMin = compareSemver(currentVersion, latest.minVersion || '1.0.0') < 0;
    const forceUpdate = hasUpdate && (latest.forceUpdate || isBelowMin);

    return {
      hasUpdate,
      forceUpdate,
      currentVersion,
      latestVersion: latest.version,
      latestBuildNumber: latest.buildNumber,
      apkUrl: latest.apkUrl,
      releaseNotes: latest.releaseNotes,
      fileSize: latest.fileSize,
      releaseDate: latest.releaseDate,
    };
  }
};

export default api;
