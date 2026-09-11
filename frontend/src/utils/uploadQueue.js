import api from '../api/axios';

/**
 * Enterprise Concurrency Upload Queue (Google Drive / AWS S3 Standard)
 * - Limits parallel HTTP connections to CONCURRENCY_LIMIT (4)
 * - Avoids browser socket starvation (ERR_INSUFFICIENT_RESOURCES)
 * - Tracks per-file progress & aggregate throughput
 * - Batches UI update callbacks to prevent database & DOM thrashing
 */

class UploadQueue {
  constructor(concurrency = 4) {
    this.concurrency = concurrency;
    this.queue = []; // Array of upload item objects
    this.activeCount = 0;
    this.listeners = new Set();
    this.onBatchCompleteCallback = null;
    this.completedSinceLastSync = 0;
    this.syncTimer = null;
  }

  // Subscribe to queue state updates (React state hooks)
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  notify() {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
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

    const newEntries = items.map((entry) => {
      const file = entry.file || entry;
      const folderId = entry.folderId || null;
      const folderName = entry.folderName || null;

      return {
        id: 'up_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        file,
        name: file.name,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        folderId,
        folderName,
        status: 'queued', // 'queued' | 'uploading' | 'completed' | 'error'
        progress: 0,
        error: null,
        cancelTokenSource: null,
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
      formData.append('file', item.file);
      if (item.folderId && item.folderId !== 'root') {
        formData.append('folderId', item.folderId);
      }

      const res = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            item.progress = percent;
            this.notify();
          }
        },
      });

      item.status = 'completed';
      item.progress = 100;
      item.uploadedFile = res.data?.file;
      this.completedSinceLastSync += 1;

      // Throttle DB syncs: batch sync every 4 completed files
      if (this.completedSinceLastSync >= 4) {
        this.triggerSync();
      }
    } catch (err) {
      item.status = 'error';
      item.error = err.response?.data?.message || err.message || 'Upload failed';
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.notify();
      this.processQueue();
    }
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
      this.notify();
    } else if (item.status === 'uploading') {
      // In Axios or fetch, mark as error
      item.status = 'error';
      item.error = 'Cancelled by user';
      this.activeCount = Math.max(0, this.activeCount - 1);
      this.notify();
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
    this.notify();
  }

  // Clear completed or error items from manager
  clearFinished() {
    this.queue = this.queue.filter((item) => item.status === 'queued' || item.status === 'uploading');
    this.notify();
  }

  // Fully reset
  reset() {
    this.queue = [];
    this.activeCount = 0;
    this.notify();
  }
}

// Global Singleton Instance
export const uploadQueue = new UploadQueue(4);
export default uploadQueue;
