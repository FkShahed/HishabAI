import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Auto-detect the correct backend URL:
// - Real Android/iOS phone over Wi-Fi → use PC's LAN IP (same network)
// - Android Emulator → use 10.0.2.2 (special alias for host machine localhost)
// - Web / no manifest → localhost
const getBaseUrl = () => {
  if (__DEV__) {
    // Expo provides the host machine's IP via manifest in Expo Go
    const expoHost = Constants.expoConfig?.hostUri?.split(':')[0];
    
    if (expoHost && expoHost !== 'localhost' && expoHost !== '127.0.0.1') {
      // Real device connected over Wi-Fi or Tunnel → use Expo host IP
      return `http://${expoHost}:3000/api`;
    }
    
    if (Platform.OS === 'android') {
      // Android Emulator uses this special alias for the host machine
      return 'http://10.0.2.2:3000/api';
    }
    
    return 'http://localhost:3000/api';
  }
  
  // Production URL
  return 'https://api.hisabai.com/api';
};

const api = axios.create({
  baseURL: getBaseUrl(),
  timeout: 90000, // 90 seconds — allows up to 4 retry attempts with backoff
});

// Log API base URL in dev mode
if (__DEV__) {
  console.log('[API] Backend URL:', getBaseUrl());
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

    formData.append('categoryList', JSON.stringify(categories));

    try {
      const response = await api.post('/ai/voice', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error: any) {
      console.error('[API] parseVoice error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to process voice command');
    }
  },

  /**
   * Send Base64 image for receipt parsing
   */
  async parseReceipt(imageBase64: string, categories: { id: string; name: string; type: string }[]) {
    try {
      const response = await api.post('/ai/receipt', {
        imageBase64,
        mimeType: 'image/jpeg',
        categoryList: categories,
      });
      return response.data;
    } catch (error: any) {
      console.error('[API] parseReceipt error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.error || 'Failed to process receipt');
    }
  }
};

export default api;
