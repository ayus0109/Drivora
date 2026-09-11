import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  Share2,
  Copy,
  Check,
  Trash2,
  X,
  Eye,
  Download,
  Globe,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const ShareModal = ({ isOpen, onClose, file }) => {
  const [shareData, setShareData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Fetch current share status when modal opens
  useEffect(() => {
    if (isOpen && file) {
      setError('');
      setCopied(false);
      fetchShareStatus();
    }
  }, [isOpen, file]);

  const fetchShareStatus = async () => {
    try {
      setIsLoading(true);
      const res = await api.get(`/share/file/${file._id}`);
      if (res.data.isShared) {
        setShareData(res.data.shareLink);
      } else {
        setShareData(null);
      }
    } catch (err) {
      console.error('Failed to get share status:', err);
      setError('Could not retrieve share status.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateShareLink = async () => {
    try {
      setIsGenerating(true);
      setError('');
      const res = await api.post(`/share/${file._id}`);
      setShareData(res.data.shareLink);
    } catch (err) {
      console.error('Create share link error:', err);
      setError(err.response?.data?.message || 'Failed to generate share link.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRevokeShareLink = async () => {
    if (!shareData?.token) return;
    try {
      setIsRevoking(true);
      setError('');
      await api.delete(`/share/${shareData.token}`);
      setShareData(null);
    } catch (err) {
      console.error('Revoke share link error:', err);
      setError(err.response?.data?.message || 'Failed to revoke link.');
    } finally {
      setIsRevoking(false);
    }
  };

  if (!isOpen || !file) return null;

  const fullShareUrl = shareData?.token
    ? `${window.location.origin}/share/${shareData.token}`
    : '';

  const handleCopy = () => {
    if (!fullShareUrl) return;
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Share File</h3>
              <p className="text-xs text-gray-400 truncate max-w-[280px]">
                {file.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-5">
          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-100">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex h-32 items-center justify-center text-gray-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Checking link status...</span>
            </div>
          ) : shareData ? (
            /* Active Share Link State */
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-green-50/70 border border-green-200/80 text-green-800">
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Globe className="h-4 w-4 text-green-600" />
                  <span>Public view-only link is active</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-green-200/60 px-2 py-0.5 rounded-full text-green-800">
                  Active
                </span>
              </div>

              {/* URL Input & Copy Button */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Anyone with this link can view & download this file
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={fullShareUrl}
                    className="flex-1 rounded-xl bg-gray-50 border border-gray-200 px-3.5 py-2 text-xs text-gray-800 font-mono focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Analytics Badges */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <div>
                    <span className="block text-xs font-bold text-gray-800">
                      {shareData.views || 0}
                    </span>
                    <span className="block text-[11px] text-gray-400">Total Views</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <Download className="h-4 w-4 text-emerald-500" />
                  <div>
                    <span className="block text-xs font-bold text-gray-800">
                      {shareData.downloads || 0}
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      Total Downloads
                    </span>
                  </div>
                </div>
              </div>

              {/* Revoke Button */}
              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">
                  Revoking will immediately disable this URL.
                </p>

                <button
                  onClick={handleRevokeShareLink}
                  disabled={isRevoking}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>{isRevoking ? 'Revoking...' : 'Revoke Link'}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Not Shared State */
            <div className="text-center py-4 space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
                <Globe className="h-6 w-6" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-800">
                  This file is not shared yet
                </h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto mt-1">
                  Generate a view-only link so anyone with the URL can preview and download this file without creating an account.
                </p>
              </div>

              <button
                onClick={handleCreateShareLink}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Share2 className="h-4 w-4" />
                )}
                <span>Create Public Share Link</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
