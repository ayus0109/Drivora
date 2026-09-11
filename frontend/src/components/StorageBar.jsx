import React from 'react';
import { formatBytes } from '../utils/formatBytes';
import { Database, AlertCircle } from 'lucide-react';

const FIFTEEN_GB = 16106127360; // 15 GB (Google Drive standard)

const StorageBar = ({ usedBytes, usedStorageBytes, quotaBytes = FIFTEEN_GB }) => {
  // Support both prop naming conventions to prevent any undefined mismatch
  const bytes =
    usedBytes !== undefined
      ? Number(usedBytes)
      : usedStorageBytes !== undefined
      ? Number(usedStorageBytes)
      : 0;

  const quota = Number(quotaBytes) > 0 ? Number(quotaBytes) : FIFTEEN_GB;
  const rawPercentage = (bytes / quota) * 100;

  // Display percentage with professional micro-precision (Google Drive standard):
  // When bytes is 0: '0%'
  // When bytes > 0 and rawPercentage < 0.01: '< 0.01%'
  // When bytes > 0 and rawPercentage < 1: `${rawPercentage.toFixed(2)}%` (e.g. 7.34 MB on 15 GB displays 0.05%)
  // When rawPercentage >= 1: `${rawPercentage.toFixed(1)}%` (e.g. 150 MB on 15 GB displays 1.0%)
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
    <div className="rounded-2xl bg-white p-4 border border-gray-200/80 shadow-xs select-none">
      <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-2">
        <div className="flex items-center gap-1.5">
          <Database className="h-3.5 w-3.5 text-blue-600" />
          <span>Storage Usage</span>
        </div>
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
      </div>

      <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${visualBarWidth}%` }}
        ></div>
      </div>

      <p className="text-xs text-gray-500 mt-2 font-semibold">
        {formatBytes(bytes)} of {formatBytes(quota)} used
      </p>

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
