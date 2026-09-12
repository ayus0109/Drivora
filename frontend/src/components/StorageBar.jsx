import React from 'react';
import { formatBytes } from '../utils/formatBytes';
import { Database, AlertCircle, ChevronRight, PieChart } from 'lucide-react';

const FIFTEEN_GB = 16106127360; // 15 GB (Google Drive standard)

const StorageBar = ({ usedBytes, usedStorageBytes, quotaBytes = FIFTEEN_GB, onClick }) => {
  // Support both prop naming conventions to prevent any undefined mismatch
  const bytes =
    usedBytes !== undefined
      ? Number(usedBytes)
      : usedStorageBytes !== undefined
      ? Number(usedStorageBytes)
      : 0;

  const quota = Number(quotaBytes) > 0 ? Number(quotaBytes) : FIFTEEN_GB;
  const rawPercentage = (bytes / quota) * 100;

  // Display percentage with professional micro-precision (Google Drive standard)
  const displayPercentage =
    bytes === 0
      ? '0%'
      : rawPercentage < 0.01
      ? '< 0.01%'
      : rawPercentage < 1
      ? `${rawPercentage.toFixed(2)}%`
      : `${rawPercentage.toFixed(1)}%`;

  // Visual bar: give a minimum of 2.5% if any bytes exist so the bar is visibly active
  const visualBarWidth =
    bytes === 0
      ? 0
      : Math.min(100, Math.max(2.5, parseFloat(rawPercentage.toFixed(2))));

  const isNearLimit = rawPercentage >= 75 && rawPercentage < 90;
  const isExceededOrCritical = rawPercentage >= 90;

  const barColor = isExceededOrCritical
    ? 'bg-red-500'
    : isNearLimit
    ? 'bg-amber-500'
    : 'bg-blue-600';

  return (
    <div
      onClick={onClick}
      className={`group rounded-2xl bg-white p-3.5 sm:p-4 border border-gray-200/90 shadow-xs select-none transition-all ${
        onClick
          ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm active:scale-[0.98] hover:bg-slate-50/60'
          : ''
      }`}
      title={onClick ? 'Click to view detailed storage breakdown' : undefined}
    >
      <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-2">
        <div className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-blue-600 shrink-0" />
          <span className="truncate">Storage Usage</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span
            className={`font-bold ${
              isExceededOrCritical
                ? 'text-red-600'
                : isNearLimit
                ? 'text-amber-600'
                : 'text-blue-600'
            }`}
          >
            {displayPercentage}
          </span>
          {onClick && (
            <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-600 transition-colors" />
          )}
        </div>
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2 sm:h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${visualBarWidth}%` }}
        ></div>
      </div>

      <div className="flex items-center justify-between mt-2 text-[11px] sm:text-xs">
        <p className="text-gray-500 font-semibold truncate mr-2">
          {formatBytes(bytes)} of {formatBytes(quota)}
        </p>
        {onClick && (
          <span className="shrink-0 inline-flex items-center gap-1 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <PieChart className="h-3 w-3" /> Breakdown
          </span>
        )}
      </div>

      {isExceededOrCritical && (
        <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-red-600 font-medium">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Storage quota almost full</span>
        </div>
      )}
    </div>
  );
};

export default StorageBar;
