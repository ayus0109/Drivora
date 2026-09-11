import React, { useState } from 'react';
import api from '../api/axios';
import { formatBytes } from '../utils/formatBytes';
import {
  Zap,
  HardDrive,
  X,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Layers,
  Database,
  ShieldCheck,
} from 'lucide-react';

const PRESETS = [
  {
    id: 'quick',
    name: 'Quick Test',
    count: 50,
    bytes: 500 * 1024 * 1024, // 500 MB
    desc: 'Generates 50 files (PDFs, Docs, Images) totaling 500 MB (~3.3% of 15 GB quota).',
    badge: 'Fast',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'scale',
    name: 'Scale Benchmark',
    count: 250,
    bytes: 2500 * 1024 * 1024, // 2.5 GB
    desc: 'Generates 250 files across all media types totaling 2.5 GB (~16.7% of quota).',
    badge: 'Recommended',
    badgeColor: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'capacity',
    name: 'High Capacity',
    count: 500,
    bytes: 5000 * 1024 * 1024, // 5.0 GB
    desc: 'Stress tests sorting, filtering & search with 500 files totaling 5.0 GB (~33.3% quota).',
    badge: 'Heavy Load',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'quota_fill',
    name: 'Max Quota Stress Test',
    count: 1000,
    bytes: 10000 * 1024 * 1024, // 10.0 GB
    desc: 'Simulates high-volume enterprise drive with 1,000 files totaling 10.0 GB (~66.7% quota).',
    badge: 'Enterprise',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
];

const BulkGeneratorModal = ({
  isOpen,
  onClose,
  currentFolderId,
  user,
  onSuccess,
}) => {
  const [selectedPreset, setSelectedPreset] = useState('scale');
  const [customCount, setCustomCount] = useState(100);
  const [customMb, setCustomMb] = useState(1000);
  const [isCustom, setIsCustom] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const availableBytes = (user?.quotaBytes || 16106127360) - (user?.usedStorageBytes || 0);

  const getTargetParams = () => {
    if (isCustom) {
      return {
        count: Math.max(1, Math.min(2000, Number(customCount) || 50)),
        targetBytes: Math.max(1024 * 1024, (Number(customMb) || 500) * 1024 * 1024),
      };
    }
    const preset = PRESETS.find((p) => p.id === selectedPreset) || PRESETS[0];
    return {
      count: preset.count,
      targetBytes: preset.bytes,
    };
  };

  const { count, targetBytes } = getTargetParams();
  const willExceed = targetBytes > availableBytes;

  const handleGenerate = async () => {
    if (willExceed) {
      setErrorMsg(`Target size (${formatBytes(targetBytes)}) exceeds available storage (${formatBytes(availableBytes)}).`);
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMsg(null);

      const res = await api.post('/files/benchmark-generate', {
        count,
        targetBytes,
        folderId: currentFolderId || null,
      });

      if (onSuccess) {
        onSuccess(res.data);
      }
      onClose();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to generate benchmark test files.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 shadow-xs">
              <Zap className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-gray-900">
                  Storage Fast-Fill & Scale Benchmark
                </h3>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 tracking-wide uppercase">
                  Enterprise
                </span>
              </div>
              <p className="text-xs text-gray-500 font-medium">
                Test Google/AWS-scale workloads (1,000–5,000 files) without manual uploading
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="rounded-xl p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Current Available Storage Pill */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-gray-200/80 mb-4 text-xs font-semibold text-gray-700">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-blue-600" />
            <span>Available Storage Quota:</span>
          </div>
          <span className="font-extrabold text-blue-700">
            {formatBytes(availableBytes)} remaining of {formatBytes(user?.quotaBytes || 16106127360)}
          </span>
        </div>

        {/* Presets List */}
        <div className="space-y-2.5 mb-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Select Benchmark Workload:
          </label>

          {PRESETS.map((p) => {
            const isSelected = !isCustom && selectedPreset === p.id;
            return (
              <div
                key={p.id}
                onClick={() => {
                  if (!isGenerating) {
                    setIsCustom(false);
                    setSelectedPreset(p.id);
                  }
                }}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/60'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-gray-900">{p.name}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${p.badgeColor}`}>
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="block text-sm font-extrabold text-gray-900">
                    {formatBytes(p.bytes)}
                  </span>
                  <span className="block text-[11px] font-semibold text-gray-400">
                    {p.count} files
                  </span>
                </div>
              </div>
            );
          })}

          {/* Custom Option */}
          <div
            onClick={() => !isGenerating && setIsCustom(true)}
            className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
              isCustom
                ? 'border-blue-500 bg-blue-50/70 shadow-xs ring-2 ring-blue-500/20'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50/60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-900">Custom Specification</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-gray-100 text-gray-700">
                Custom
              </span>
            </div>

            {isCustom && (
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-blue-200/60">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    Number of Files (1 – 2,000):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="2000"
                    value={customCount}
                    onChange={(e) => setCustomCount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 mb-1">
                    Target Total Size (MB):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="15000"
                    value={customMb}
                    onChange={(e) => setCustomMb(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium mb-4">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2.5 text-xs sm:text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || willExceed}
            className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating {count} Files...</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                <span>Generate & Fill Storage</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkGeneratorModal;
