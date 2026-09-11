import React from 'react';
import { formatBytes } from '../utils/formatBytes';
import {
  X,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  FileCode,
  File as GenericFile,
  HardDrive,
  Calendar,
  Clock,
  ShieldCheck,
  Star,
  Download,
  Share2,
  FolderInput,
  Trash2,
  Lock,
  ExternalLink,
} from 'lucide-react';

const getFileIcon = (mimeType = '', name = '') => {
  const mime = mimeType.toLowerCase();
  const ext = name.split('.').pop()?.toLowerCase();

  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext)) {
    return <ImageIcon className="h-8 w-8 text-emerald-500" />;
  }
  if (mime.startsWith('video/') || ['mp4', 'webm', 'mkv', 'mov'].includes(ext)) {
    return <Film className="h-8 w-8 text-purple-500" />;
  }
  if (mime.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return <Music className="h-8 w-8 text-pink-500" />;
  }
  if (mime.includes('pdf') || ext === 'pdf') {
    return <FileText className="h-8 w-8 text-red-500" />;
  }
  if (mime.includes('word') || mime.includes('document') || ['doc', 'docx'].includes(ext)) {
    return <FileText className="h-8 w-8 text-blue-500" />;
  }
  if (mime.includes('sheet') || mime.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) {
    return <FileText className="h-8 w-8 text-emerald-600" />;
  }
  if (mime.includes('presentation') || ['ppt', 'pptx'].includes(ext)) {
    return <FileText className="h-8 w-8 text-amber-500" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
    return <Archive className="h-8 w-8 text-orange-500" />;
  }
  if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'json', 'py', 'java', 'cpp'].includes(ext)) {
    return <FileCode className="h-8 w-8 text-indigo-500" />;
  }
  return <GenericFile className="h-8 w-8 text-gray-400" />;
};

const FileDetailsDrawer = ({
  file,
  isOpen,
  onClose,
  onDownload,
  onShare,
  onStar,
  onMove,
  onTrash,
  folderName = 'My Drive',
}) => {
  if (!isOpen || !file) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const d = new Date(dateString);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isImage = (file.mimeType || '').startsWith('image/');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
      {/* Backdrop for mobile */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/20 backdrop-blur-2xs transition-opacity md:hidden pointer-events-auto"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10 pointer-events-auto">
        <aside className="w-screen max-w-sm sm:max-w-md bg-white border-l border-gray-200 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200 font-['Plus_Jakarta_Sans',sans-serif]">
          {/* Header */}
          <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                File Details
              </span>
              {file.isTrash && (
                <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold">
                  In Trash
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {onStar && !file.isTrash && (
                <button
                  type="button"
                  onClick={() => onStar(file)}
                  title={file.isStarred ? 'Remove from Starred' : 'Add to Starred'}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                >
                  <Star
                    className={`h-4 w-4 ${
                      file.isStarred ? 'fill-amber-400 text-amber-400' : ''
                    }`}
                  />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Drawer Body / Metadata */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Visual Thumbnail or Icon Preview */}
            <div className="flex flex-col items-center justify-center p-6 rounded-3xl bg-slate-50 border border-slate-100">
              <div className="p-4 rounded-2xl bg-white shadow-sm border border-slate-100 mb-3">
                {getFileIcon(file.mimeType, file.name)}
              </div>
              <h3 className="text-sm font-bold text-gray-900 text-center break-all max-w-full px-2">
                {file.name}
              </h3>
              <span className="text-xs text-gray-400 mt-1 font-mono">
                {formatBytes(file.sizeBytes)}
              </span>
            </div>

            {/* Actions Toolbar */}
            {!file.isTrash && (
              <div className="grid grid-cols-4 gap-2">
                {onDownload && (
                  <button
                    type="button"
                    onClick={() => onDownload(file)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 transition-all text-[11px] font-semibold group shadow-2xs"
                  >
                    <Download className="h-4 w-4 mb-1 text-gray-500 group-hover:text-blue-600" />
                    <span>Download</span>
                  </button>
                )}
                {onShare && (
                  <button
                    type="button"
                    onClick={() => onShare(file)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 transition-all text-[11px] font-semibold group shadow-2xs"
                  >
                    <Share2 className="h-4 w-4 mb-1 text-gray-500 group-hover:text-emerald-600" />
                    <span>Share</span>
                  </button>
                )}
                {onMove && (
                  <button
                    type="button"
                    onClick={() => onMove(file)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 transition-all text-[11px] font-semibold group shadow-2xs"
                  >
                    <FolderInput className="h-4 w-4 mb-1 text-gray-500 group-hover:text-amber-600" />
                    <span>Move</span>
                  </button>
                )}
                {onTrash && (
                  <button
                    type="button"
                    onClick={() => onTrash(file)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-red-50 active:scale-95 text-gray-700 transition-all text-[11px] font-semibold group shadow-2xs"
                  >
                    <Trash2 className="h-4 w-4 mb-1 text-gray-500 group-hover:text-red-600" />
                    <span className="group-hover:text-red-600">Trash</span>
                  </button>
                )}
              </div>
            )}

            {/* Properties Table */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                System Properties
              </h4>

              <div className="space-y-3 divide-y divide-gray-100 text-xs">
                {/* Type */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Type</span>
                  <span className="text-gray-900 font-semibold truncate max-w-[200px]" title={file.mimeType}>
                    {file.mimeType || 'Unknown'}
                  </span>
                </div>

                {/* Size */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Size</span>
                  <div className="text-right">
                    <span className="text-gray-900 font-bold">{formatBytes(file.sizeBytes)}</span>
                    <span className="text-gray-400 text-[10px] ml-1">
                      ({file.sizeBytes?.toLocaleString()} bytes)
                    </span>
                  </div>
                </div>

                {/* Storage Location */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Location</span>
                  <div className="flex items-center gap-1.5 text-blue-600 font-semibold truncate max-w-[200px]">
                    <HardDrive className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{folderName}</span>
                  </div>
                </div>

                {/* Created At */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Uploaded</span>
                  <span className="text-gray-800 font-medium">{formatDate(file.createdAt)}</span>
                </div>

                {/* Modified At */}
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Modified</span>
                  <span className="text-gray-800 font-medium">{formatDate(file.updatedAt)}</span>
                </div>

                {/* Trashed date if in trash */}
                {file.isTrash && file.trashedAt && (
                  <div className="pt-2 flex items-center justify-between text-red-600">
                    <span className="font-medium">Trashed on</span>
                    <span className="font-semibold">{formatDate(file.trashedAt)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Security & Encryption Verification */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100/80 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>Client-Side AES-256-GCM</span>
              </div>
              <p className="text-[11px] text-emerald-700/90 leading-relaxed">
                This file is encrypted before transit and securely stored in Firebase Storage isolated under your user ID.
              </p>
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-gray-100 bg-slate-50/50 flex items-center justify-between text-[11px] text-gray-400">
            <span>Drivora Cloud Engine</span>
            <span className="font-mono">ID: {file._id?.slice(-8)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default FileDetailsDrawer;
