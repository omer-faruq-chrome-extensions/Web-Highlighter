// Simple Chrome Storage Sync - no complex file system permissions needed
class HighlightSync {
  constructor() {
    this.syncEnabled = true; // Always enabled via Chrome account
    this._ready = Promise.resolve();
  }

  async waitReady() {
    return this._ready;
  }

  // Check if user is signed in to Chrome/Edge
  async getSyncStatus() {
    try {
      // Try to get sync storage quota to check if sync is available
      const quota = await chrome.storage.sync.getBytesInUse();
      return {
        enabled: true,
        signedIn: true,
        message: 'Automatically syncing via your Chrome account'
      };
    } catch (e) {
      return {
        enabled: false,
        signedIn: false,
        message: 'Sign in to your Chrome/Edge account'
      };
    }
  }

  // No setup needed - sync is automatic via Chrome account
  async setupSync() {
    return {
      success: true,
      message: 'Sync is automatic via your Chrome account'
    };
  }

  async disableSync() {
    return {
      success: false,
      message: 'Auto sync cannot be disabled'
    };
  }

  async triggerExport() {
    return {
      success: true,
      message: 'Highlights are automatically syncing'
    };
  }
}

if (typeof window !== 'undefined') {
  window.highlightSync = new HighlightSync();
}
