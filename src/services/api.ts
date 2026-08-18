import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Live Production Backend URL hosted on Vercel
export const BACKEND_URL = 'https://hishab-ai-backend.vercel.app';
export const API_BASE_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 90000, // 90 seconds — allows up to 4 retry attempts with backoff
});

if (__DEV__) {
  console.log('[API] Connected to live backend:', API_BASE_URL);
}

/**
 * Formats low-level network, timeout, quota, or server errors into clean, user-friendly messages.
 */
export function getFriendlyErrorMessage(error: any): string {
  if (!error) return 'An unknown error occurred. Please try again.';

  // 1. Network Disconnection / Offline
  if (error.message === 'Network Error' || !error.response) {
    return 'Network connection issue. Please check your internet connection and try again.';
  }

  // 2. Timeout
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return 'Connection timed out. Please check your internet and try again.';
  }

  const status = error.response?.status;
  const serverMsg = error.response?.data?.error;

  // 3. Quota / Rate Limit Exceeded
  if (
    status === 429 || 
    error.response?.data?.code === 'RATE_LIMIT_EXCEEDED' ||
    serverMsg?.toLowerCase().includes('limit') || 
    serverMsg?.toLowerCase().includes('quota')
  ) {
    return 'AI daily usage limit reached. Please try again later.';
  }

  // 4. Server Busy / 503
  if (
    status === 503 || 
    error.response?.data?.code === 'SERVER_BUSY' ||
    serverMsg?.toLowerCase().includes('busy')
  ) {
    return 'AI service is temporarily busy. Please try again in a few seconds.';
  }

  // 5. Returned backend error string
  if (typeof serverMsg === 'string' && serverMsg.length > 0) {
    return serverMsg;
  }

  return error.message || 'Something went wrong. Please try again.';
}

export const AIServiceClient = {
  /**
   * Upload audio blob/file for voice parsing
   */
  async parseVoice(audioUri: string, categories: { id: string; name: string; type: string }[]) {
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      const res = await fetch(audioUri);
      const blob = await res.blob();
      console.log('[Web Upload] Fetched blob size:', blob.size, 'type:', blob.type);
      
      // Explicitly construct a File to ensure the MIME type is correctly set
      const file = new File([blob], 'voice_recording.webm', { 
        type: blob.type || 'audio/webm' 
      });
      
      formData.append('audio', file);
    } else {
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/m4a',
        name: 'voice_recording.m4a',
      } as any);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';

    formData.append('categoryList', JSON.stringify(categories));
    formData.append('currentDate', todayStr);
    formData.append('timezone', clientTimezone);
    formData.append('currentDateTime', new Date().toISOString());

    try {
      const response = await api.post('/ai/voice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      const friendlyMsg = getFriendlyErrorMessage(error);
      console.error('[API] parseVoice error:', friendlyMsg);
      throw new Error(friendlyMsg);
    }
  },

  /**
   * Send Base64 image for receipt parsing
   */
  async parseReceipt(imageBase64: string, categories: { id: string; name: string; type: string }[]) {
    const todayStr = new Date().toISOString().split('T')[0];
    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';

    try {
      const response = await api.post('/ai/receipt', {
        imageBase64,
        mimeType: 'image/jpeg',
        categoryList: categories,
        currentDate: todayStr,
        timezone: clientTimezone,
        currentDateTime: new Date().toISOString(),
      });
      return response.data;
    } catch (error: any) {
      const friendlyMsg = getFriendlyErrorMessage(error);
      console.error('[API] parseReceipt error:', friendlyMsg);
      throw new Error(friendlyMsg);
    }
  },

  /**
   * Fast path: Send extracted OCR text string directly (<1s response time)
   */
  async parseReceiptText(ocrText: string, categories: { id: string; name: string; type: string }[]) {
    const todayStr = new Date().toISOString().split('T')[0];
    const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Dhaka';

    try {
      const response = await api.post('/ai/receipt-text', {
        ocrText,
        categoryList: categories,
        currentDate: todayStr,
        timezone: clientTimezone,
        currentDateTime: new Date().toISOString(),
      });
      return response.data;
    } catch (error: any) {
      const friendlyMsg = getFriendlyErrorMessage(error);
      console.error('[API] parseReceiptText error:', friendlyMsg);
      throw new Error(friendlyMsg);
    }
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
