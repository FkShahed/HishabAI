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
   * Get current latest active app version configuration
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
    this.saveVersion(DEFAULT_VERSION_INFO);
    return DEFAULT_VERSION_INFO;
  }

  /**
   * Get all version releases history
   */
  public static getHistory(): VersionHistoryItem[] {
    this.ensureDataDir();
    try {
      if (fs.existsSync(HISTORY_FILE)) {
        const raw = fs.readFileSync(HISTORY_FILE, 'utf-8');
        const list: VersionHistoryItem[] = JSON.parse(raw);
        return list;
      }
    } catch (error) {
      console.error('[VersionService] Error reading version-history.json:', error);
    }
    // If history is empty, populate with current version
    const current = this.getLatestVersion();
    const initialItem: VersionHistoryItem = {
      ...current,
      id: uuidv4(),
    };
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([initialItem], null, 2), 'utf-8');
    return [initialItem];
  }

  /**
   * Get single release by ID
   */
  public static getReleaseById(id: string): VersionHistoryItem | null {
    const history = this.getHistory();
    return history.find((h) => h.id === id) || null;
  }

  /**
   * Save / Publish Active Version
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
    this.appendHistory(updated);
    return updated;
  }

  /**
   * Create a new Release entry
   */
  public static createRelease(data: Partial<AppVersionInfo>, setAsActive: boolean = true): VersionHistoryItem {
    this.ensureDataDir();
    const newItem: VersionHistoryItem = {
      version: String(data.version || '1.0.0').trim(),
      buildNumber: Number(data.buildNumber) || 1,
      apkUrl: data.apkUrl ? String(data.apkUrl).trim() : '',
      releaseNotes: data.releaseNotes ? String(data.releaseNotes).trim() : '',
      forceUpdate: Boolean(data.forceUpdate),
      minVersion: data.minVersion ? String(data.minVersion).trim() : '1.0.0',
      releaseDate: data.releaseDate || new Date().toISOString().split('T')[0],
      fileSize: data.fileSize ? String(data.fileSize).trim() : '32.5 MB',
      updatedAt: new Date().toISOString(),
      id: uuidv4(),
    };

    const history = this.getHistory();
    const filtered = history.filter(
      (h) => !(h.version === newItem.version && h.buildNumber === newItem.buildNumber)
    );
    filtered.unshift(newItem);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(filtered.slice(0, 50), null, 2), 'utf-8');

    if (setAsActive) {
      const { id, ...versionInfo } = newItem;
      fs.writeFileSync(VERSION_FILE, JSON.stringify(versionInfo, null, 2), 'utf-8');
    }

    return newItem;
  }

  /**
   * Update an existing release in history by ID
   */
  public static updateRelease(id: string, updatedData: Partial<AppVersionInfo>, setAsActive: boolean = false): VersionHistoryItem {
    this.ensureDataDir();
    const history = this.getHistory();
    const index = history.findIndex((h) => h.id === id);

    if (index === -1) {
      throw new Error(`Release with ID "${id}" not found`);
    }

    const existing = history[index];
    const updatedItem: VersionHistoryItem = {
      ...existing,
      ...updatedData,
      updatedAt: new Date().toISOString(),
      id: existing.id,
    };

    history[index] = updatedItem;
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');

    // If marked active or if this was the currently active version
    const active = this.getLatestVersion();
    if (setAsActive || (active.version === existing.version && active.buildNumber === existing.buildNumber)) {
      const { id: _, ...versionInfo } = updatedItem;
      fs.writeFileSync(VERSION_FILE, JSON.stringify(versionInfo, null, 2), 'utf-8');
    }

    return updatedItem;
  }

  /**
   * Delete a release from history
   */
  public static deleteRelease(id: string): { success: boolean; deleted: VersionHistoryItem } {
    this.ensureDataDir();
    const history = this.getHistory();
    const index = history.findIndex((h) => h.id === id);

    if (index === -1) {
      throw new Error(`Release with ID "${id}" not found`);
    }

    if (history.length <= 1) {
      throw new Error('Cannot delete the only release. At least one version must exist.');
    }

    const deleted = history.splice(index, 1)[0];
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8');

    // If the deleted version was the active version, activate the most recent remaining version
    const active = this.getLatestVersion();
    if (active.version === deleted.version && active.buildNumber === deleted.buildNumber) {
      const nextActive = history[0];
      const { id: _, ...versionInfo } = nextActive;
      fs.writeFileSync(VERSION_FILE, JSON.stringify(versionInfo, null, 2), 'utf-8');
    }

    return { success: true, deleted };
  }

  /**
   * Activate / Set Live a specific release
   */
  public static activateRelease(id: string): AppVersionInfo {
    this.ensureDataDir();
    const history = this.getHistory();
    const target = history.find((h) => h.id === id);

    if (!target) {
      throw new Error(`Release with ID "${id}" not found`);
    }

    const { id: _, ...versionInfo } = target;
    const updated: AppVersionInfo = {
      ...versionInfo,
      updatedAt: new Date().toISOString(),
    };

    fs.writeFileSync(VERSION_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  }

  private static appendHistory(versionInfo: AppVersionInfo) {
    try {
      const history = this.getHistory();
      const existing = history.find(
        (h) => h.version === versionInfo.version && h.buildNumber === versionInfo.buildNumber
      );

      if (existing) {
        // Update existing item in history
        existing.apkUrl = versionInfo.apkUrl;
        existing.releaseNotes = versionInfo.releaseNotes;
        existing.forceUpdate = versionInfo.forceUpdate;
        existing.minVersion = versionInfo.minVersion;
        existing.fileSize = versionInfo.fileSize;
        existing.releaseDate = versionInfo.releaseDate;
        existing.updatedAt = new Date().toISOString();
      } else {
        const newItem: VersionHistoryItem = {
          ...versionInfo,
          id: uuidv4(),
        };
        history.unshift(newItem);
      }

      fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 50), null, 2), 'utf-8');
    } catch (e) {
      console.error('[VersionService] Failed to append history:', e);
    }
  }
}
