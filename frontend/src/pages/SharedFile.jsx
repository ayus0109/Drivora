import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { getFileIcon } from '../utils/fileIcons';
import { formatBytes, formatDate } from '../utils/formatBytes';
import {
  Download,
  HardDrive,
  AlertTriangle,
  Loader2,
  Calendar,
  User,
  ShieldCheck,
  Eye,
  FileText,
  X,
} from 'lucide-react';

const SharedFile = () => {
  const { token } = useParams();

  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [textContent, setTextContent] = useState('');

  useEffect(() => {
    const fetchSharedFile = async () => {
      try {
        setIsLoading(true);
        // Direct public call (no auth token needed)
        const res = await axios.get(`/api/share/${token}`);
        setFile(res.data.file);
      } catch (err) {
        console.error('Shared file fetch error:', err);
        setError(
          err.response?.data?.message ||
            'This share link is invalid, expired, or has been revoked by the owner.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchSharedFile();
    }
  }, [token]);

  const handleDownload = async () => {
    if (!file) return;

    try {
      setIsDownloading(true);
      // Public download endpoint
      const response = await axios.get(`/api/share/${token}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download shared file.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleOpenPreview = async () => {
    if (!file) return;
    setIsPreviewOpen(true);

    if (previewBlobUrl) return;

    try {
      setIsPreviewLoading(true);
      const res = await axios.get(`/api/share/${token}/download?inline=true`, {
        responseType: 'blob',
      });

      const mime = (file.mimeType || '').toLowerCase();
      const name = (file.name || '').toLowerCase();

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

      if (isText) {
        const text = await res.data.text();
        setTextContent(text);
      }

      const url = window.URL.createObjectURL(res.data);
      setPreviewBlobUrl(url);
    } catch (err) {
      console.error('Shared preview fetch error:', err);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-gray-500">Loading shared file...</p>
        </div>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm border border-gray-100">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Link Unavailable</h2>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            {error || 'This link is no longer valid or has been revoked.'}
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow hover:bg-blue-700 transition-colors"
            >
              <HardDrive className="h-4 w-4" />
              <span>Go to Google Drive</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
            <HardDrive className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-900 tracking-tight leading-none">
              Google Drive
            </h1>
            <span className="text-[10px] font-medium text-blue-600">Public Share</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>AES-256 Encrypted Storage</span>
          </span>
        </div>
      </header>

      {/* Main Shared File Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-md border border-gray-200/80">
          {/* File Icon & Badge */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 border border-gray-100">
              {icon}
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-lg tracking-wider ${color}`}>
              {badge}
            </span>
          </div>

          {/* File Name & Size */}
          <div className="mb-6">
            <h2
              className="text-xl font-bold text-gray-900 break-words"
              title={file.name}
            >
              {file.name}
            </h2>
            <p className="text-sm text-gray-400 mt-1 font-medium">
              {formatBytes(file.sizeBytes)} • {file.mimeType}
            </p>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 py-4 border-y border-gray-100 mb-6 text-xs text-gray-600">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              <span className="truncate">By {file.sharedBy}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span>{formatDate(file.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2 col-span-2 text-gray-400 text-[11px]">
              <Eye className="h-3.5 w-3.5" />
              <span>Viewed {file.views} times</span>
            </div>
          </div>

          {/* Action Buttons: Preview & Download */}
          <div className="space-y-2.5">
            <button
              onClick={handleOpenPreview}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 hover:bg-blue-100 focus:outline-none transition-all"
            >
              <Eye className="h-4 w-4" />
              <span>Preview in Browser</span>
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 transition-all"
            >
              {isDownloading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Download className="h-5 w-5" />
              )}
              <span>{isDownloading ? 'Preparing Download...' : 'Download File'}</span>
            </button>
          </div>
        </div>
      </main>

      {/* Inline Preview Modal for Public Links */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gray-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex h-16 w-full items-center justify-between border-b border-gray-800 bg-gray-900/90 px-6 text-white flex-shrink-0">
            <div className="flex items-center gap-3 truncate mr-4">
              {icon}
              <span className="font-semibold text-sm truncate">{file.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download</span>
              </button>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden flex items-center justify-center p-4 sm:p-6">
            {isPreviewLoading ? (
              <div className="flex flex-col items-center gap-3 text-gray-300">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm font-medium">Decrypting & loading preview...</p>
              </div>
            ) : isPdf && previewBlobUrl ? (
              <div className="w-full h-full max-w-5xl rounded-xl overflow-hidden bg-white shadow-2xl">
                <iframe src={previewBlobUrl} className="w-full h-full border-0" title={file.name} />
              </div>
            ) : isImage && previewBlobUrl ? (
              <img
                src={previewBlobUrl}
                alt={file.name}
                className="max-h-[85vh] max-w-full object-contain rounded-xl shadow-2xl"
              />
            ) : isVideo && previewBlobUrl ? (
              <video controls autoPlay src={previewBlobUrl} className="max-h-[80vh] w-full rounded-xl shadow-2xl" />
            ) : isAudio && previewBlobUrl ? (
              <audio controls autoPlay src={previewBlobUrl} className="w-full max-w-md" />
            ) : isText ? (
              <pre className="max-w-4xl w-full max-h-[85vh] p-6 overflow-auto font-mono text-xs text-gray-200 bg-gray-900 rounded-xl border border-gray-800">
                <code>{textContent}</code>
              </pre>
            ) : (
              <div className="text-center p-8 bg-gray-900 rounded-2xl border border-gray-800 text-white max-w-md">
                <p className="text-sm text-gray-300 mb-4">Direct preview not available for this format.</p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white"
                >
                  Download File
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400">
        Google Drive — Cloud Storage System
      </footer>
    </div>
  );
};

export default SharedFile;
