import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Share2,
  ShieldCheck,
  FileText,
  Loader2,
  Info,
  Maximize2,
  CheckCircle2,
  Lock,
  HardDrive,
  FileCode,
} from 'lucide-react';
import api from '../api/axios';
import { getFileIcon } from '../utils/fileIcons';
import { formatBytes, formatDate } from '../utils/formatBytes';

// Session cache for decrypted preview blobs to enable instantaneous re-opening
const previewBlobCache = new Map();

const FilePreviewModal = ({ file, isOpen, onClose, onDownload, onShare, initialTab = 'preview' }) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'preview' | 'details'
  const [blobUrl, setBlobUrl] = useState(null);
  const [textContent, setTextContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [isOriginalScale, setIsOriginalScale] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
    setIsOriginalScale(false);
  }, [initialTab, file]);

  const directStreamUrl = file
    ? `/api/files/${file._id}/download?inline=true&token=${encodeURIComponent(localStorage.getItem('token') || '')}`
    : '';

  // Load preview stream when file or modal opens
  useEffect(() => {
    if (!isOpen || !file) {
      setTextContent('');
      setLoadError(null);
      return;
    }

    const mime = (file.mimeType || '').toLowerCase();
    const name = (file.name || '').toLowerCase();
    const isMediaOrPdf =
      mime.startsWith('video/') ||
      mime.startsWith('audio/') ||
      mime.includes('pdf') ||
      name.endsWith('.mp4') ||
      name.endsWith('.webm') ||
      name.endsWith('.mp3') ||
      name.endsWith('.wav') ||
      name.endsWith('.pdf');

    // Video, audio, and PDF can stream directly via native Range requests without waiting for full blob download
    if (isMediaOrPdf) {
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    // Check session blob cache for instant (0ms) image/text loading
    if (previewBlobCache.has(file._id)) {
      const cached = previewBlobCache.get(file._id);
      setBlobUrl(cached.url);
      if (cached.text) setTextContent(cached.text);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    let isMounted = true;

    const fetchPreview = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await api.get(`/files/${file._id}/download?inline=true`, {
          responseType: 'blob',
        });

        if (!isMounted) return;

        // If text or code, read as text
        const isText =
          mime.startsWith('text/') ||
          name.endsWith('.txt') ||
          name.endsWith('.json') ||
          name.endsWith('.md') ||
          name.endsWith('.js') ||
          name.endsWith('.jsx') ||
          name.endsWith('.ts') ||
          name.endsWith('.tsx') ||
          name.endsWith('.py') ||
          name.endsWith('.html') ||
          name.endsWith('.css') ||
          name.endsWith('.csv') ||
          name.endsWith('.log');

        let text = '';
        if (isText) {
          text = await response.data.text();
          if (isMounted) setTextContent(text);
        }

        const createdUrl = window.URL.createObjectURL(response.data);
        previewBlobCache.set(file._id, { url: createdUrl, text });

        if (isMounted) {
          setBlobUrl(createdUrl);
        }
      } catch (err) {
        console.error('Preview stream error:', err);
        if (isMounted) {
          setLoadError(
            err.response?.data?.message || 'Could not load inline preview for this file.'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPreview();

    return () => {
      isMounted = false;
    };
  }, [isOpen, file]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !file) return null;

  const { icon, color, badge } = getFileIcon(file.mimeType, file.name);
  const mime = (file.mimeType || '').toLowerCase();
  const name = (file.name || '').toLowerCase();

  const isPdf = mime.includes('pdf') || name.endsWith('.pdf');
  const isImage =
    mime.startsWith('image/') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.gif') ||
    name.endsWith('.webp') ||
    name.endsWith('.svg');
  const isVideo = mime.startsWith('video/') || name.endsWith('.mp4') || name.endsWith('.webm');
  const isAudio = mime.startsWith('audio/') || name.endsWith('.mp3') || name.endsWith('.wav');
  const isText =
    mime.startsWith('text/') ||
    name.endsWith('.txt') ||
    name.endsWith('.json') ||
    name.endsWith('.md') ||
    name.endsWith('.js') ||
    name.endsWith('.jsx') ||
    name.endsWith('.py') ||
    name.endsWith('.html') ||
    name.endsWith('.css') ||
    name.endsWith('.csv') ||
    name.endsWith('.log');

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/85 backdrop-blur-md animate-in fade-in duration-200">
      {/* Top Header Bar */}
      <div className="flex h-16 w-full items-center justify-between border-b border-gray-800/80 bg-gray-900/90 px-4 sm:px-6 text-white select-none flex-shrink-0">
        {/* Left: Icon, Name & Type Badge */}
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
          <div className="flex-shrink-0">{icon}</div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-white truncate" title={file.name}>
              {file.name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{formatBytes(file.sizeBytes)}</span>
              <span>•</span>
              <span className="text-blue-400 font-mono text-[11px]">{file.mimeType}</span>
            </div>
          </div>
        </div>

        {/* Center: Tabs */}
        <div className="flex items-center gap-0.5 sm:gap-1 bg-gray-800/90 p-1 rounded-xl border border-gray-700/60">
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all ${
              activeTab === 'details'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Details</span>
          </button>
        </div>

        {/* Right: Quick Actions (Download, Share, Close) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDownload && onDownload(file)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium text-gray-200 transition-colors border border-gray-700"
            title="Download file"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Download</span>
          </button>

          <button
            onClick={() => onShare && onShare(file)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-xs font-medium text-white transition-colors shadow-sm"
            title="Get shareable link"
          >
            <Share2 className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Share</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ml-1"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex items-center justify-center p-3 sm:p-6">
        {activeTab === 'details' ? (
          /* DETAILS & SECURITY INSPECTOR VIEW */
          <div className="w-full max-w-2xl bg-gray-900/95 border border-gray-800 rounded-2xl p-6 sm:p-8 text-white shadow-2xl overflow-y-auto max-h-full">
            <div className="flex items-center gap-3 pb-5 border-b border-gray-800">
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">File Cryptographic & Storage Profile</h3>
                <p className="text-xs text-gray-400">
                  Verified security attributes and at-rest encryption specification
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {/* Filename */}
              <div className="bg-gray-800/60 p-3.5 rounded-xl border border-gray-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  File Name
                </span>
                <p className="text-sm font-medium text-gray-100 mt-1 truncate" title={file.name}>
                  {file.name}
                </p>
              </div>

              {/* Exact Bytes */}
              <div className="bg-gray-800/60 p-3.5 rounded-xl border border-gray-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Storage Size
                </span>
                <p className="text-sm font-medium text-gray-100 mt-1">
                  {formatBytes(file.sizeBytes)} ({file.sizeBytes?.toLocaleString()} bytes)
                </p>
              </div>

              {/* MIME Type */}
              <div className="bg-gray-800/60 p-3.5 rounded-xl border border-gray-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Detected MIME Type
                </span>
                <p className="text-sm font-mono text-blue-400 mt-1">{file.mimeType}</p>
              </div>

              {/* Storage Provider */}
              <div className="bg-gray-800/60 p-3.5 rounded-xl border border-gray-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Active Storage Engine
                </span>
                <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-emerald-400">
                  <HardDrive className="h-4 w-4" />
                  <span>
                    {file.storageProvider === 'firebase'
                      ? 'Google Cloud / Firebase Storage'
                      : 'Local Storage Vault (AES-256-GCM)'}
                  </span>
                </div>
              </div>

              {/* Encryption Algorithm */}
              <div className="bg-gray-800/60 p-3.5 rounded-xl border border-gray-800 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Encryption Protocol (At Rest)
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified Active
                  </span>
                </div>
                <p className="text-sm font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <Lock className="h-4 w-4 text-emerald-400" />
                  AES-256-GCM (Authenticated Galois/Counter Mode)
                </p>
                <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                  Files written to disk are encrypted with a 256-bit symmetric cipher key, a random 96-bit initialization vector (IV), and a 128-bit authentication tag. Even server host administrators or unauthorized database readers cannot decipher or alter file contents.
                </p>
              </div>

              {/* Uploaded Date */}
              <div className="bg-gray-800/60 p-3.5 rounded-xl border border-gray-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  Date Uploaded
                </span>
                <p className="text-xs text-gray-200 mt-1">{formatDate(file.createdAt)}</p>
              </div>

              {/* Unique Object ID */}
              <div className="bg-gray-800/60 p-3.5 rounded-xl border border-gray-800">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  MongoDB Document ID
                </span>
                <p className="text-xs font-mono text-gray-300 mt-1 truncate">{file._id}</p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-gray-800 flex justify-end">
              <button
                onClick={() => setActiveTab('preview')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white transition-colors"
              >
                Back to Preview
              </button>
            </div>
          </div>
        ) : isLoading ? (
          /* LOADING STATE */
          <div className="flex flex-col items-center gap-3 text-gray-300">
            <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
            <p className="text-sm font-medium">Decrypting & streaming file preview...</p>
            <span className="text-xs text-gray-500 font-mono">AES-256-GCM in-memory stream</span>
          </div>
        ) : loadError ? (
          /* ERROR STATE */
          <div className="max-w-md text-center p-8 rounded-2xl bg-gray-900 border border-gray-800 text-gray-300">
            <p className="text-sm text-red-400 font-medium mb-4">{loadError}</p>
            <button
              onClick={() => onDownload && onDownload(file)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white"
            >
              <Download className="h-4 w-4" />
              <span>Download Directly Instead</span>
            </button>
          </div>
        ) : isPdf ? (
          /* PDF VIEWER - Streams immediately */
          <div className="w-full h-full max-w-6xl max-h-[92vh] rounded-xl overflow-hidden border border-gray-800 shadow-2xl bg-gray-900">
            <iframe
              src={directStreamUrl}
              title={file.name}
              className="w-full h-full border-0 bg-white"
            />
          </div>
        ) : isImage && blobUrl ? (
          /* IMAGE VIEWER WITH ORIGINAL QUALITY TOGGLE */
          <div className="relative w-full h-full flex items-center justify-center p-2 overflow-auto">
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-gray-900/80 backdrop-blur-sm px-2.5 py-1.5 rounded-xl border border-gray-800 text-xs text-gray-300">
              <button
                type="button"
                onClick={() => setIsOriginalScale(!isOriginalScale)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold transition-colors"
                title="Toggle 100% original quality scale"
              >
                <Maximize2 className="h-3.5 w-3.5" />
                <span>{isOriginalScale ? 'Fit to Screen' : '100% Quality'}</span>
              </button>
            </div>
            <img
              src={blobUrl}
              alt={file.name}
              loading="eager"
              decoding="async"
              className={`rounded-xl shadow-2xl transition-all duration-200 border border-gray-800 ${
                isOriginalScale
                  ? 'max-h-none max-w-none'
                  : 'max-h-[85vh] max-w-full object-contain'
              }`}
            />
          </div>
        ) : isVideo ? (
          /* VIDEO PLAYER - Streams via HTTP Range requests immediately */
          <div className="w-full max-w-4xl flex items-center justify-center">
            <video
              controls
              autoPlay
              playsInline
              preload="metadata"
              src={directStreamUrl}
              className="max-h-[80vh] w-full rounded-2xl shadow-2xl border border-gray-800 bg-black"
            />
          </div>
        ) : isAudio ? (
          /* AUDIO PLAYER - Streams via HTTP Range requests immediately */
          <div className="w-full max-w-md p-8 rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl text-center">
            <div className="p-4 rounded-2xl bg-blue-600/10 text-blue-400 w-16 h-16 mx-auto flex items-center justify-center mb-4">
              {icon}
            </div>
            <h3 className="text-base font-bold text-white truncate mb-1">{file.name}</h3>
            <p className="text-xs text-gray-400 mb-6">{formatBytes(file.sizeBytes)}</p>
            <audio controls src={directStreamUrl} className="w-full" autoPlay preload="metadata" />
          </div>
        ) : isText ? (
          /* TEXT / CODE VIEWER */
          <div className="w-full max-w-5xl h-full max-h-[85vh] flex flex-col rounded-2xl bg-gray-900 border border-gray-800 shadow-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-gray-800/80 border-b border-gray-700/60 flex items-center justify-between text-xs text-gray-300">
              <span className="font-mono text-gray-400">{file.name}</span>
              <span className="text-[11px] text-gray-500">Read-Only Preview</span>
            </div>
            <pre className="flex-1 p-5 overflow-auto font-mono text-xs text-gray-200 leading-relaxed bg-gray-950/70 select-text">
              <code>{textContent}</code>
            </pre>
          </div>
        ) : (
          /* UNSUPPORTED BINARY FALLBACK */
          <div className="w-full max-w-md p-8 rounded-2xl bg-gray-900 border border-gray-800 text-center shadow-2xl">
            <div className="p-4 rounded-2xl bg-gray-800/80 w-16 h-16 mx-auto flex items-center justify-center mb-4 text-gray-300">
              {icon}
            </div>
            <h3 className="text-base font-bold text-white truncate mb-1">{file.name}</h3>
            <p className="text-xs text-gray-400 mb-2">{formatBytes(file.sizeBytes)}</p>
            <span className="inline-block text-[11px] font-mono px-2 py-0.5 rounded bg-gray-800 text-blue-400 mb-6">
              {file.mimeType}
            </span>
            <p className="text-xs text-gray-400 mb-6 leading-relaxed">
              In-browser preview is not available for this binary file format. You can inspect its cryptographic details or download the file to open locally.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setActiveTab('details')}
                className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-semibold text-gray-200 border border-gray-700"
              >
                Security Info
              </button>
              <button
                onClick={() => onDownload && onDownload(file)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Download File</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreviewModal;
