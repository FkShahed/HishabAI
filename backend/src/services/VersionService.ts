import { AppVersionInfo, VersionHistoryItem } from '../types';
import { v4 as uuidv4 } from 'uuid';

const RTDB_URL = process.env.FIREBASE_DATABASE_URL || 'https://hishab-ai-default-rtdb.asia-southeast1.firebasedatabase.app';

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

// In-memory cache for ultra-fast response
let cachedLatestVersion: AppVersionInfo = { ...DEFAULT_VERSION_INFO };
let cachedHistory: VersionHistoryItem[] = [
  { ...DEFAULT_VERSION_INFO, id: 'initial-v1-release-id' }
];

export class VersionService {
  /**
   * Get current latest active app version configuration
   */
  public static async getLatestVersion(): Promise<AppVersionInfo> {
    try {
      const res = await fetch(`${RTDB_URL}/releases/latest.json`);
      if (res.ok) {
        const data = (await res.json()) as AppVersionInfo | null;
        if (data && data.version) {
          cachedLatestVersion = data;
          return data;
        }
      }
    } catch (error) {
      console.warn('[VersionService] Error fetching latest version from RTDB:', error);
    }
    return cachedLatestVersion;
  }

  /**
   * Sync get latest version (uses cached latest)
   */
  public static getLatestVersionSync(): AppVersionInfo {
    return cachedLatestVersion;
  }

  /**
   * Get all version releases history
   */
  public static async getHistory(): Promise<VersionHistoryItem[]> {
    try {
      const res = await fetch(`${RTDB_URL}/releases/history.json`);
      if (res.ok) {
        const data = (await res.json()) as Record<string, VersionHistoryItem> | null;
        if (data) {
          const list: VersionHistoryItem[] = Object.values(data);
          list.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
          cachedHistory = list;
          return list;
        }
      }
    } catch (error) {
      console.warn('[VersionService] Error fetching history from RTDB:', error);
    }
    return cachedHistory;
  }


  /**
   * Get single release by ID
   */
  public static async getReleaseById(id: string): Promise<VersionHistoryItem | null> {
    const history = await this.getHistory();
    return history.find((h) => h.id === id) || null;
  }

  /**
   * Save / Publish Active Version
   */
  public static async saveVersion(info: Partial<AppVersionInfo>): Promise<AppVersionInfo> {
    const current = await this.getLatestVersion();
    const updated: AppVersionInfo = {
      ...current,
      ...info,
      updatedAt: new Date().toISOString(),
    };

    cachedLatestVersion = updated;

    try {
      await fetch(`${RTDB_URL}/releases/latest.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      await this.appendHistory(updated);
    } catch (e) {
      console.error('[VersionService] Error saving active version to RTDB:', e);
    }

    return updated;
  }

  /**
   * Create a new Release entry
   */
  public static async createRelease(data: Partial<AppVersionInfo>, setAsActive: boolean = true): Promise<VersionHistoryItem> {
    const id = uuidv4();
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
      id,
    };

    try {
      await fetch(`${RTDB_URL}/releases/history/${id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });

      if (setAsActive) {
        const { id: _, ...versionInfo } = newItem;
        cachedLatestVersion = versionInfo as AppVersionInfo;
        await fetch(`${RTDB_URL}/releases/latest.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(versionInfo),
        });
      }
    } catch (e) {
      console.error('[VersionService] Error creating release in RTDB:', e);
    }

    return newItem;
  }

  /**
   * Update an existing release in history by ID
   */
  public static async updateRelease(id: string, updatedData: Partial<AppVersionInfo>, setAsActive: boolean = false): Promise<VersionHistoryItem> {
    const history = await this.getHistory();
    const existing = history.find((h) => h.id === id);

    if (!existing) {
      throw new Error(`Release with ID "${id}" not found`);
    }

    const updatedItem: VersionHistoryItem = {
      ...existing,
      ...updatedData,
      updatedAt: new Date().toISOString(),
      id: existing.id,
    };

    try {
      await fetch(`${RTDB_URL}/releases/history/${id}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem),
      });

      const active = await this.getLatestVersion();
      if (setAsActive || (active.version === existing.version && active.buildNumber === existing.buildNumber)) {
        const { id: _, ...versionInfo } = updatedItem;
        cachedLatestVersion = versionInfo as AppVersionInfo;
        await fetch(`${RTDB_URL}/releases/latest.json`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(versionInfo),
        });
      }
    } catch (e) {
      console.error('[VersionService] Error updating release in RTDB:', e);
    }

    return updatedItem;
  }

  /**
   * Delete a release from history
   */
  public static async deleteRelease(id: string): Promise<{ success: boolean; deleted: VersionHistoryItem }> {
    const history = await this.getHistory();
    const existing = history.find((h) => h.id === id);

    if (!existing) {
      throw new Error(`Release with ID "${id}" not found`);
    }

    if (history.length <= 1) {
      throw new Error('Cannot delete the only release. At least one version must exist.');
    }

    try {
      await fetch(`${RTDB_URL}/releases/history/${id}.json`, {
        method: 'DELETE',
      });

      const active = await this.getLatestVersion();
      if (active.version === existing.version && active.buildNumber === existing.buildNumber) {
        const remaining = history.filter((h) => h.id !== id);
        if (remaining.length > 0) {
          const nextActive = remaining[0];
          const { id: _, ...versionInfo } = nextActive;
          cachedLatestVersion = versionInfo as AppVersionInfo;
          await fetch(`${RTDB_URL}/releases/latest.json`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(versionInfo),
          });
        }
      }
    } catch (e) {
      console.error('[VersionService] Error deleting release from RTDB:', e);
    }

    return { success: true, deleted: existing };
  }

  /**
   * Activate / Set Live a specific release
   */
  public static async activateRelease(id: string): Promise<AppVersionInfo> {
    const history = await this.getHistory();
    const target = history.find((h) => h.id === id);

    if (!target) {
      throw new Error(`Release with ID "${id}" not found`);
    }

    const { id: _, ...versionInfo } = target;
    const updated: AppVersionInfo = {
      ...versionInfo,
      updatedAt: new Date().toISOString(),
    };

    cachedLatestVersion = updated;

    try {
      await fetch(`${RTDB_URL}/releases/latest.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch (e) {
      console.error('[VersionService] Error activating release in RTDB:', e);
    }

    return updated;
  }

  private static async appendHistory(versionInfo: AppVersionInfo) {
    try {
      const history = await this.getHistory();
      const existing = history.find(
        (h) => h.version === versionInfo.version && h.buildNumber === versionInfo.buildNumber
      );

      const targetId = existing ? existing.id : uuidv4();
      const itemToSave: VersionHistoryItem = {
        ...versionInfo,
        id: targetId,
      };

      await fetch(`${RTDB_URL}/releases/history/${targetId}.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(itemToSave),
      });
    } catch (e) {
      console.error('[VersionService] Failed to append history:', e);
    }
  }
}
