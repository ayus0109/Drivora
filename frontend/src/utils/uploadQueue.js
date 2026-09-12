import api from '../api/axios';

/**
 * Enterprise Concurrency Upload Queue (Google Drive / AWS S3 Standard)
 * - Limits parallel HTTP connections to CONCURRENCY_LIMIT (4)
 * - Avoids browser socket starvation (ERR_INSUFFICIENT_RESOURCES)
 * - Tracks per-file progress & aggregate throughput
 * - Batches UI update callbacks to prevent database & DOM thrashing
 */

const isMobileClient = () => {
  if (typeof window === 'undefined') return false;
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '')
  );
};

class UploadQueue {
  constructor(concurrency = null) {
    // 2 parallel workers on mobile links (avoids upstream cellular drops), 4 on desktop
    this.concurrency = concurrency !== null ? concurrency : (isMobileClient() ? 2 : 4);
    this.queue = []; // Array of upload item objects
    this.activeCount = 0;
    this.listeners = new Set();
    this.onBatchCompleteCallback = null;
    this.completedSinceLastSync = 0;
    this.syncTimer = null;
    this.notifyTimeout = null;
    this.lastNotifyTime = 0;
  }

  // Subscribe to queue state updates (React state hooks)
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  notify(immediate = true) {
    if (immediate) {
      if (this.notifyTimeout) {
        clearTimeout(this.notifyTimeout);
        this.notifyTimeout = null;
      }
      this.lastNotifyTime = Date.now();
      const snapshot = this.getSnapshot();
      for (const listener of this.listeners) {
        listener(snapshot);
      }
      return;
    }

    const now = Date.now();
    if (now - this.lastNotifyTime >= 100) {
      this.lastNotifyTime = now;
      const snapshot = this.getSnapshot();
      for (const listener of this.listeners) {
        listener(snapshot);
      }
    } else if (!this.notifyTimeout) {
      this.notifyTimeout = setTimeout(() => {
        this.notifyTimeout = null;
        this.lastNotifyTime = Date.now();
        const snapshot = this.getSnapshot();
        for (const listener of this.listeners) {
          listener(snapshot);
        }
      }, 100 - (now - this.lastNotifyTime));
    }
  }

  setBatchCompleteCallback(cb) {
    this.onBatchCompleteCallback = cb;
  }

  getSnapshot() {
    const total = this.queue.length;
    const completed = this.queue.filter((item) => item.status === 'completed').length;
    const uploading = this.queue.filter((item) => item.status === 'uploading').length;
    const queued = this.queue.filter((item) => item.status === 'queued').length;
    const error = this.queue.filter((item) => item.status === 'error').length;

    const totalBytes = this.queue.reduce((sum, item) => sum + (item.file?.size || 0), 0);
    const uploadedBytes = this.queue.reduce((sum, item) => {
      const itemSize = item.file?.size || 0;
      if (item.status === 'completed') return sum + itemSize;
      if (item.status === 'uploading') return sum + Math.round((itemSize * (item.progress || 0)) / 100);
      return sum;
    }, 0);

    const overallProgress = totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0;

    return {
      items: [...this.queue],
      total,
      completed,
      uploading,
      queued,
      error,
      totalBytes,
      uploadedBytes,
      overallProgress,
      isIdle: uploading === 0 && queued === 0,
      isProcessing: uploading > 0 || queued > 0,
    };
  }

  // Enqueue single or multiple files
  enqueue(filesWithMetadata) {
    const items = Array.isArray(filesWithMetadata) ? filesWithMetadata : [filesWithMetadata];
    if (items.length === 0) return;

    // Count name occurrences to disambiguate generic mobile camera names (e.g. image.jpg on iOS)
    const nameCounts = new Map();
    items.forEach((entry) => {
      const f = entry.file || entry;
      const rawName = f.name || 'photo.jpg';
      nameCounts.set(rawName, (nameCounts.get(rawName) || 0) + 1);
    });

    const seenIndices = new Map();

    const newEntries = items.map((entry) => {
      const file = entry.file || entry;
      const folderId = entry.folderId || null;
      const folderName = entry.folderName || null;
      const originalName = file.name || `photo_${Date.now()}.jpg`;

      let finalName = originalName;
      // If multiple items in this batch share the same name (common in mobile photo library pickers)
      if (nameCounts.get(originalName) > 1) {
        const idx = (seenIndices.get(originalName) || 0) + 1;
        seenIndices.set(originalName, idx);
        const lastDot = originalName.lastIndexOf('.');
        if (lastDot !== -1) {
          const base = originalName.substring(0, lastDot);
          const ext = originalName.substring(lastDot);
          finalName = `${base} (${idx})${ext}`;
        } else {
          finalName = `${originalName} (${idx})`;
        }
      }

      return {
        id: 'up_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '_' + Math.floor(Math.random() * 10000),
        file,
        name: finalName,
        size: file.size || 0,
        mimeType: file.type || 'application/octet-stream',
        folderId,
        folderName,
        status: 'queued', // 'queued' | 'uploading' | 'completed' | 'error'
        progress: 0,
        error: null,
        retries: 0,
      };
    });

    this.queue.push(...newEntries);
    this.notify();
    this.processQueue();
  }

  // Pick up next items from queue up to concurrency limit
  processQueue() {
    if (this.activeCount >= this.concurrency) return;

    const nextItem = this.queue.find((item) => item.status === 'queued');
    if (!nextItem) {
      if (this.activeCount === 0 && this.completedSinceLastSync > 0) {
        this.triggerSync();
      }
      return;
    }

    this.activeCount += 1;
    nextItem.status = 'uploading';
    this.notify();

    this.uploadItem(nextItem);
    this.processQueue(); // Check if another worker can start
  }

  async uploadItem(item) {
    try {
      const formData = new FormData();
      // Pass disambiguated file name as third argument so Multer preserves unique name
      formData.append('file', item.file, item.name);
      if (item.folderId && item.folderId !== 'root') {
        formData.append('folderId', item.folderId);
      }

      const res = await api.post('/files/upload', formData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            item.progress = percent;
            this.notify(false);
          }
        },
      });

      item.status = 'completed';
      item.progress = 100;
      item.uploadedFile = res.data?.file;
      this.completedSinceLastSync += 1;

      // Throttle DB syncs: batch sync based on concurrency
      if (this.completedSinceLastSync >= this.concurrency) {
        this.triggerSync();
      }
    } catch (err) {
      // Automatic retry for transient mobile network/cellular socket drops (up to 3 retries)
      item.retries = (item.retries || 0) + 1;
      const isQuotaError = err.response?.status === 413 || err.response?.data?.message?.toLowerCase().includes('quota');
      if (item.retries <= 3 && !isQuotaError) {
        item.status = 'queued';
        item.progress = 0;
        // Schedule next retry with progressive backoff
        setTimeout(() => this.processQueue(), 400 * item.retries);
        return;
      }

      item.status = 'error';
      item.error = err.response?.data?.message || err.message || 'Upload failed';
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.notify(true);
      this.processQueue();
    }
  }

  // Retry all failed uploads (Zero Data Loss)
  retryFailed() {
    let reQueuedCount = 0;
    for (const item of this.queue) {
      if (item.status === 'error' && item.error !== 'Cancelled') {
        item.status = 'queued';
        item.progress = 0;
        item.error = null;
        item.retries = 0;
        reQueuedCount += 1;
      }
    }
    if (reQueuedCount > 0) {
      this.notify(true);
      this.processQueue();
    }
    return reQueuedCount;
  }

  triggerSync() {
    this.completedSinceLastSync = 0;
    if (this.onBatchCompleteCallback) {
      this.onBatchCompleteCallback();
    }
  }

  // Cancel an individual queued or active item
  cancelItem(id) {
    const item = this.queue.find((i) => i.id === id);
    if (!item) return;

    if (item.status === 'queued') {
      item.status = 'error';
      item.error = 'Cancelled';
      this.notify(true);
    } else if (item.status === 'uploading') {
      // In Axios or fetch, mark as error
      item.status = 'error';
      item.error = 'Cancelled by user';
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.notify(true);
      this.processQueue();
    }
  }

  // Cancel all pending items
  cancelAll() {
    for (const item of this.queue) {
      if (item.status === 'queued' || item.status === 'uploading') {
        item.status = 'error';
        item.error = 'Cancelled';
      }
    }
    this.activeCount = 0;
    this.notify(true);
  }

  // Clear completed or error items from manager
  clearFinished() {
    this.queue = this.queue.filter((item) => item.status === 'queued' || item.status === 'uploading');
    this.notify(true);
  }

  // Fully reset
  reset() {
    this.queue = [];
    this.activeCount = 0;
    this.notify(true);
  }
}

// Global Singleton Instance (Dynamic 2 workers on mobile, 4 on desktop)
export const uploadQueue = new UploadQueue();
export default uploadQueue;
