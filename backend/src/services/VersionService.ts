import fs from 'fs';
import path from 'path';
import { AppVersionInfo, VersionHistoryItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

const DATA_DIR = path.resolve(__dirname, '../../data');
const VERSION_FILE = path.join(DATA_DIR, 'version-info.json');
const HISTORY_FILE = path.join(DATA_DIR, 'version-history.json');

// Default initial version
const DEFAULT_VERSION_INFO: AppVersionInfo = {
  version: '1.0.0',
  buildNumber: 1,
  apkUrl: '',
  releaseNotes: '• Initial release of HisabAI expense tracker\n• AI Voice transaction parsing with Gemini\n• Smart receipt scanner with Google Vision OCR\n• Interactive charts and dark/light theme\n• Firebase cloud sync & local backup',
  forceUpdate: false,
  minVersion: '1.0.0',
  releaseDate: new Date().toISOString().split('T')[0],
  fileSize: '32.5 MB',
  updatedAt: new Date().toISOString(),
};

export class VersionService {
  private static ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  /**
   * Get current latest app version configuration
   */
  public static getLatestVersion(): AppVersionInfo {
    this.ensureDataDir();
    try {
      if (fs.existsSync(VERSION_FILE)) {
        const raw = fs.readFileSync(VERSION_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (error) {
      console.error('[VersionService] Error reading version-info.json:', error);
    }
    // If file doesn't exist, create it with default
    this.saveVersion(DEFAULT_VERSION_INFO);
    return DEFAULT_VERSION_INFO;
  }

  /**
   * Update version info and append to history log
   */
  public static saveVersion(info: Partial<AppVersionInfo>): AppVersionInfo {
    this.ensureDataDir();
    const current = fs.existsSync(VERSION_FILE) 
      ? JSON.parse(fs.readFileSync(VERSION_FILE, 'utf-8')) 
      : DEFAULT_VERSION_INFO;

    const updated: AppVersionInfo = {
      ...current,
      ...info,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(VERSION_FILE, JSON.stringify(updated, null, 2), 'utf-8');

    // Also append to history
    this.appendHistory(updated);

    return updated;
  }

  /**
   * Get version history list
   */
  public static getHistory(): VersionHistoryItem[] {
    this.ensureDataDir();
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (error) {
      console.error('[VersionService] Error reading version-history.json:', error);
    }
    return [];
  }

  private static appendHistory(versionInfo: AppVersionInfo) {
    try {
      const history = this.getHistory();
      const newItem: VersionHistoryItem = {
        ...versionInfo,
        id: uuidv4(),
      };
      
      // Avoid immediate duplicate version & buildNumber in history
      const filtered = history.filter(
        (h) => !(h.version === newItem.version && h.buildNumber === newItem.buildNumber)
      );
      filtered.unshift(newItem); // newest first

      // Keep up to 20 history items
      const trimmed = filtered.slice(0, 20);
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmed, null, 2), 'utf-8');
    } catch (e) {
      console.error('[VersionService] Failed to append history:', e);
    }
  }
}
