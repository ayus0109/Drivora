import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { formatBytes } from '../utils/formatBytes';
import {
  X,
  PieChart,
  HardDrive,
  FileText,
  Image as ImageIcon,
  Film,
  Archive,
  File,
  Trash2,
  Loader2,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

const categoryIcons = {
  documents: <FileText className="h-4 w-4 text-blue-500" />,
  images: <ImageIcon className="h-4 w-4 text-emerald-500" />,
  media: <Film className="h-4 w-4 text-purple-500" />,
  archives: <Archive className="h-4 w-4 text-amber-500" />,
  others: <File className="h-4 w-4 text-slate-500" />,
  trash: <Trash2 className="h-4 w-4 text-red-500" />,
};

const StorageBreakdownModal = ({ isOpen, onClose, onEmptyTrash }) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen]);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      setError('');
      const res = await api.get('/users/storage-analytics');
      setData(res.data.analytics);
    } catch (err) {
      console.error('Failed to load storage analytics:', err);
      setError('Unable to load storage details.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const categories = data?.categories || {};
  const totalUsed = data?.totalUsedBytes || 0;
  const quota = data?.quotaBytes || 16106127360; // 15 GB
  const percentUsed = data?.percentUsed || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {/* Background backdrop dismiss */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full sm:max-w-lg max-h-[88dvh] sm:max-h-[84dvh] flex flex-col rounded-t-[28px] sm:rounded-3xl bg-white shadow-2xl border border-gray-100 font-['Plus_Jakarta_Sans',sans-serif] animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 overflow-hidden z-10">
        {/* Mobile drag pill */}
        <div className="sm:hidden pt-2.5 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Fixed Header: Always visible */}
        <div className="flex items-center justify-between px-5 sm:px-7 pt-2 sm:pt-6 pb-3.5 border-b border-gray-100 shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs shrink-0">
              <PieChart className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight leading-snug">
                Storage Breakdown & Quota
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-400">
                Google Drive standard 15 GB quota allocation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 active:scale-95 transition-colors shrink-0 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Center Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-7 py-4 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 animate-in fade-in">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-xs font-semibold">Calculating storage consumption...</span>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Top Summary & Segmented Progress Bar */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                      {formatBytes(totalUsed)}
                    </span>
                    <span className="text-xs text-gray-500 font-semibold ml-1.5">
                      used of {formatBytes(quota)}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    {percentUsed}% used
                  </span>
                </div>

                {/* Segmented Color Bar */}
                <div className="h-3 w-full rounded-full bg-gray-200 overflow-hidden flex">
                  {Object.entries(categories).map(([key, cat]) => {
                    if (!cat.bytes) return null;
                    const segmentPercent = Math.max(1, (cat.bytes / quota) * 100);
                    return (
                      <div
                        key={key}
                        style={{
                          width: `${segmentPercent}%`,
                          backgroundColor: cat.color,
                        }}
                        title={`${cat.label}: ${formatBytes(cat.bytes)}`}
                        className="h-full transition-all duration-300"
                      />
                    );
                  })}
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 pt-0.5">
                  <span>Free Space: <strong>{formatBytes(Math.max(0, quota - totalUsed))}</strong></span>
                  <span>Total Files: <strong>{data?.totalFileCount || 0}</strong></span>
                </div>
              </div>

              {/* Category Breakdown Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Category Distribution
                </h4>

                <div className="divide-y divide-gray-100 text-xs rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-2xs">
                  {Object.entries(categories).map(([key, cat]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between p-3 hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-1.5 rounded-xl bg-gray-50 border border-gray-100 shrink-0">
                          {categoryIcons[key]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 truncate">
                            {cat.label}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {cat.count} {cat.count === 1 ? 'item' : 'items'}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold text-gray-900 font-mono">
                          {formatBytes(cat.bytes)}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {((cat.bytes / (totalUsed || 1)) * 100).toFixed(1)}% of used
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trash Purge recommendation */}
              {categories.trash?.bytes > 0 && onEmptyTrash && (
                <div className="p-3.5 rounded-2xl bg-red-50/80 border border-red-200/80 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-red-900">
                      Trash contains {formatBytes(categories.trash.bytes)}
                    </p>
                    <p className="text-[11px] text-red-700/80">
                      Purge trash to permanently free up storage space.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onEmptyTrash();
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-xs transition-all shrink-0 cursor-pointer"
                  >
                    Empty Trash
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fixed Footer: Always visible */}
        <div className="shrink-0 px-5 sm:px-7 py-3 border-t border-gray-100 bg-gray-50/90 flex items-center justify-between text-[11px] text-gray-500 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center gap-1 text-emerald-700 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>Encrypted cloud storage quota</span>
          </div>
          <button
            type="button"
            onClick={fetchAnalytics}
            className="flex items-center gap-1 font-semibold text-blue-600 hover:underline cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StorageBreakdownModal;
