interface StoredFormData {
  url: string;
  data: { [fieldName: string]: string | boolean };
  timestamp: number;
}

interface Message {
  action: string;
  key?: string;
  data?: StoredFormData;
}

class BackgroundService {
  constructor() {
    this.setupMessageListener();
    this.setupStorageChangeListener();
  }

  private setupMessageListener() {
    chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
      this.handleMessage(message, sender)
        .then(response => sendResponse(response))
        .catch(error => {
          console.error('Background service error:', error);
          sendResponse({ error: error.message });
        });
      
      return true; // Keep message channel open for async response
    });
  }

  private async handleMessage(message: Message, sender: chrome.runtime.MessageSender): Promise<any> {
    switch (message.action) {
      case 'saveFormData':
        return this.saveFormData(message.key!, message.data!);
      
      case 'getFormData':
        return this.getFormData(message.key!);
      
      case 'getAllFormData':
        return this.getAllFormData();
      
      case 'deleteFormData':
        return this.deleteFormData(message.key!);
      
      case 'clearAllData':
        return this.clearAllData();
      
      default:
        throw new Error(`Unknown action: ${message.action}`);
    }
  }

  private async saveFormData(key: string, data: StoredFormData): Promise<{ success: boolean }> {
    try {
      // Check storage quota before saving
      const storageInfo = await chrome.storage.sync.getBytesInUse();
      const maxBytes = chrome.storage.sync.QUOTA_BYTES || 102400; // 100KB default
      
      if (storageInfo > maxBytes * 0.9) { // Use 90% as threshold
        console.warn('Storage quota nearly full, considering cleanup');
        await this.cleanupOldData();
      }

      await chrome.storage.sync.set({ [key]: data });
      console.log(`Form data saved with key: ${key}`);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to save form data:', error);
      
      // Try local storage as fallback
      try {
        await chrome.storage.local.set({ [key]: data });
        console.log(`Form data saved to local storage with key: ${key}`);
        return { success: true };
      } catch (localError) {
        console.error('Failed to save to local storage:', localError);
        throw new Error('Failed to save form data to both sync and local storage');
      }
    }
  }

  private async getFormData(key: string): Promise<{ data: StoredFormData | null }> {
    try {
      // Try sync storage first
      let result = await chrome.storage.sync.get(key);
      
      if (!result[key]) {
        // Fallback to local storage
        result = await chrome.storage.local.get(key);
      }

      return { data: result[key] || null };
    } catch (error) {
      console.error('Failed to get form data:', error);
      return { data: null };
    }
  }

  private async getAllFormData(): Promise<{ data: { [key: string]: StoredFormData } }> {
    try {
      const syncData = await chrome.storage.sync.get();
      const localData = await chrome.storage.local.get();
      
      // Merge both storages, with sync taking precedence
      const allData = { ...localData, ...syncData };
      
      // Filter out non-form data (if any other extension data exists)
      const formData: { [key: string]: StoredFormData } = {};
      
      for (const [key, value] of Object.entries(allData)) {
        if (this.isFormData(value)) {
          formData[key] = value as StoredFormData;
        }
      }

      return { data: formData };
    } catch (error) {
      console.error('Failed to get all form data:', error);
      return { data: {} };
    }
  }

  private async deleteFormData(key: string): Promise<{ success: boolean }> {
    try {
      await chrome.storage.sync.remove(key);
      await chrome.storage.local.remove(key); // Remove from both storages
      console.log(`Form data deleted with key: ${key}`);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete form data:', error);
      return { success: false };
    }
  }

  private async clearAllData(): Promise<{ success: boolean }> {
    try {
      // Get all form data keys first
      const { data } = await this.getAllFormData();
      const keys = Object.keys(data);
      
      // Remove only form-related data
      if (keys.length > 0) {
        await chrome.storage.sync.remove(keys);
        await chrome.storage.local.remove(keys);
      }
      
      console.log(`Cleared ${keys.length} form data entries`);
      return { success: true };
    } catch (error) {
      console.error('Failed to clear all data:', error);
      return { success: false };
    }
  }

  private async cleanupOldData(): Promise<void> {
    try {
      const { data } = await this.getAllFormData();
      const entries = Object.entries(data);
      
      // Sort by timestamp and remove oldest 25%
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toRemove = entries.slice(0, Math.floor(entries.length * 0.25));
      
      if (toRemove.length > 0) {
        const keysToRemove = toRemove.map(([key]) => key);
        await chrome.storage.sync.remove(keysToRemove);
        await chrome.storage.local.remove(keysToRemove);
        console.log(`Cleaned up ${keysToRemove.length} old form data entries`);
      }
    } catch (error) {
      console.error('Failed to cleanup old data:', error);
    }
  }

  private isFormData(value: any): boolean {
    return value && 
           typeof value === 'object' && 
           'url' in value && 
           'data' in value && 
           'timestamp' in value;
  }

  private setupStorageChangeListener() {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      console.log(`Storage changed in ${areaName}:`, Object.keys(changes));
      
      // Could implement additional logic here like:
      // - Sync between devices
      // - Notify content scripts of changes
      // - Update extension badge
    });
  }
}

// Initialize the background service
new BackgroundService();

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Form Memory extension installed/updated:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings or show welcome page
    console.log('Welcome to Form Memory!');
  } else if (details.reason === 'update') {
    // Handle extension updates
    console.log('Form Memory updated to version:', chrome.runtime.getManifest().version);
  }
});