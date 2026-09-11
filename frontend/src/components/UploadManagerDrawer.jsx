import React, { useState, useEffect } from 'react';
import uploadQueue from '../utils/uploadQueue';
import { formatBytes } from '../utils/formatBytes';
import { getFileIcon } from '../utils/fileIcons';
import {
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  StopCircle,
  FileUp,
  Clock,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const UploadManagerDrawer = () => {
  const [snapshot, setSnapshot] = useState(() => uploadQueue.getSnapshot());
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    const unsubscribe = uploadQueue.subscribe((newSnapshot) => {
      setSnapshot(newSnapshot);
      // Automatically un-dismiss and open if new items arrive
      if (newSnapshot.total > 0 && newSnapshot.isProcessing) {
        setIsDismissed(false);
      }
    });
    return unsubscribe;
  }, []);

  if (snapshot.total === 0 || isDismissed) {
    return null;
  }

  const { items, total, completed, uploading, queued, error, totalBytes, uploadedBytes, overallProgress, isIdle } = snapshot;

  const headerTitle = isIdle
    ? error > 0
      ? `${completed} uploaded, ${error} failed`
      : `${total} ${total === 1 ? 'upload' : 'uploads'} complete`
    : `Uploading ${completed + uploading} of ${total} items`;

  return (
    <aside
      aria-label="Upload manager"
      className="fixed bottom-2 sm:bottom-4 inset-x-2 sm:inset-x-auto sm:right-6 sm:w-96 z-50 max-w-[calc(100vw-16px)] rounded-2xl bg-white shadow-2xl border border-gray-200/90 overflow-hidden select-none transition-all duration-300 animate-in slide-in-from-bottom-4"
    >
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3.5 bg-gray-900 text-white cursor-pointer hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {isIdle ? (
            error > 0 ? (
              <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            )
          ) : (
            <div className="relative flex items-center justify-center flex-shrink-0">
              <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-gray-100 truncate">
              {headerTitle}
            </h4>
            {!isIdle && (
              <p className="text-[11px] text-gray-400 font-medium">
                {overallProgress}% • {formatBytes(uploadedBytes)} of {formatBytes(totalBytes)}
              </p>
            )}
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg hover:bg-gray-700 text-gray-300 transition-colors"
            title={isExpanded ? 'Minimize drawer' : 'Expand drawer'}
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!isIdle) {
                if (window.confirm('Cancel all remaining uploads in queue?')) {
                  uploadQueue.cancelAll();
                  setIsDismissed(true);
                }
              } else {
                uploadQueue.reset();
                setIsDismissed(true);
              }
            }}
            className="p-1 rounded-lg hover:bg-gray-700 text-gray-300 hover:text-red-400 transition-colors"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Aggregate Progress Bar */}
      {!isIdle && (
        <div className="w-full bg-gray-200 h-1 overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}

      {/* Expandable Item List */}
      {isExpanded && (
        <div className="flex flex-col bg-white">
          {/* Sub-header Controls */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 bg-gray-50/70 text-[11px] font-semibold text-gray-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              AES-256-GCM Ingestion
            </span>
            <div className="flex items-center gap-2">
              {!isIdle && (
                <button
                  type="button"
                  onClick={() => uploadQueue.cancelAll()}
                  className="text-red-600 hover:text-red-700 font-bold hover:underline"
                >
                  Cancel remaining
                </button>
              )}
              {isIdle && (
                <button
                  type="button"
                  onClick={() => uploadQueue.clearFinished()}
                  className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                >
                  Clear list
                </button>
              )}
            </div>
          </div>

          {/* Scrollable File Items */}
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {items.slice(0, 35).map((item) => {
              const { icon } = getFileIcon(item.mimeType, item.name);

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between px-3.5 py-2.5 hover:bg-slate-50/80 transition-colors gap-3 text-xs"
                >
                  {/* File Icon & Name */}
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="p-1 rounded-lg bg-gray-100 flex-shrink-0">
                      {React.cloneElement(icon, { className: 'h-4 w-4' })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-800 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>{formatBytes(item.size)}</span>
                        {item.folderName && (
                          <span className="truncate max-w-[120px] text-gray-500">
                            📁 {item.folderName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.status === 'uploading' && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-12 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-200"
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-blue-600 w-7 text-right">
                          {item.progress}%
                        </span>
                      </div>
                    )}

                    {item.status === 'queued' && (
                      <div className="flex items-center gap-1 text-gray-400 text-[11px] font-medium">
                        <Clock className="h-3 w-3" />
                        <span>Queued</span>
                      </div>
                    )}

                    {item.status === 'completed' && (
                      <div className="flex items-center gap-1 text-emerald-600" title="Uploaded & Encrypted">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    )}

                    {item.status === 'error' && (
                      <div className="flex items-center gap-1 text-red-600" title={item.error || 'Upload error'}>
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-[10px] font-semibold truncate max-w-[80px]">
                          {item.error === 'Cancelled' ? 'Cancelled' : 'Failed'}
                        </span>
                      </div>
                    )}

                    {/* Single item cancel button */}
                    {(item.status === 'queued' || item.status === 'uploading') && (
                      <button
                        type="button"
                        onClick={() => uploadQueue.cancelItem(item.id)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                        title="Cancel this upload"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {items.length > 35 && (
              <div className="px-4 py-3 bg-gray-50/90 text-center text-xs font-semibold text-gray-500 border-t border-gray-100">
                + {items.length - 35} more items in upload pipeline
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
};

export default UploadManagerDrawer;
