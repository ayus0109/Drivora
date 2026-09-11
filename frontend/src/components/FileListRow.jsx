import React, { useState, useRef, useEffect } from 'react';
import { getFileIcon } from '../utils/fileIcons';
import { formatBytes, formatDate } from '../utils/formatBytes';
import { Download, Share2, MoreVertical, Edit2, Trash2, Eye, ShieldCheck } from 'lucide-react';

const FileListRow = ({
  file,
  onDownload,
  onShare,
  onRename,
  onDelete,
  onPreview,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const { icon } = getFileIcon(file.mimeType, file.name);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      onDoubleClick={() => onPreview && onPreview(file, 'preview')}
      className="group flex items-center justify-between px-4 py-3 hover:bg-blue-50/50 border-b border-gray-100 transition-colors text-sm cursor-pointer select-none"
    >
      {/* Name & Icon */}
      <div
        onClick={() => onPreview && onPreview(file, 'preview')}
        className="flex items-center gap-3 min-w-0 flex-[2]"
      >
        <div className="flex-shrink-0">{icon}</div>
        <div className="min-w-0 flex-1">
          <span
            className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors block text-sm sm:text-base"
            title={file.name}
          >
            {file.name}
          </span>
          <div className="sm:hidden text-xs text-gray-500 font-medium mt-1">
            {formatBytes(file.sizeBytes)} • {formatDate(file.createdAt)}
          </div>
        </div>
      </div>

      {/* Date Modified */}
      <div
        onClick={() => onPreview && onPreview(file, 'preview')}
        className="hidden sm:block flex-1 text-gray-600 text-sm font-medium truncate"
      >
        {formatDate(file.createdAt)}
      </div>

      {/* File Size */}
      <div
        onClick={() => onPreview && onPreview(file, 'preview')}
        className="hidden md:block flex-1 text-gray-600 text-sm font-semibold truncate"
      >
        {formatBytes(file.sizeBytes)}
      </div>

      {/* Action Buttons */}
      <div
        className="flex items-center gap-1.5 flex-shrink-0 relative"
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview && onPreview(file, 'preview');
          }}
          title="Preview"
          className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Eye className="h-4.5 w-4.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(file);
          }}
          title="Download"
          className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Download className="h-4.5 w-4.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare(file);
          }}
          title="Share"
          className="p-2 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Share2 className="h-4.5 w-4.5" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          title="More options"
          className={`p-2 rounded-xl transition-colors ${
            menuOpen
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <MoreVertical className="h-4.5 w-4.5" />
        </button>

        {menuOpen && (
          <div
            className="absolute right-0 top-10 z-50 w-52 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10 border border-gray-100 text-sm animate-in fade-in zoom-in-95 duration-100"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => {
                setMenuOpen(false);
                onPreview && onPreview(file, 'preview');
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-semibold text-sm touch-active"
            >
              <Eye className="h-4.5 w-4.5 text-blue-500" />
              <span>Preview</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                onPreview && onPreview(file, 'details');
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 transition-colors font-semibold text-sm touch-active"
            >
              <ShieldCheck className="h-4.5 w-4.5 text-emerald-500" />
              <span>Details & Security</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                onDownload(file);
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold touch-active"
            >
              <Download className="h-4.5 w-4.5 text-gray-500" />
              <span>Download</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                onShare(file);
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold touch-active"
            >
              <Share2 className="h-4.5 w-4.5 text-purple-500" />
              <span>Share link</span>
            </button>

            <div className="my-1 border-t border-gray-100" />

            <button
              onClick={() => {
                setMenuOpen(false);
                onRename(file);
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold touch-active"
            >
              <Edit2 className="h-4.5 w-4.5 text-gray-500" />
              <span>Rename</span>
            </button>

            <button
              onClick={() => {
                setMenuOpen(false);
                onDelete(file);
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold touch-active"
            >
              <Trash2 className="h-4.5 w-4.5 text-red-500" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileListRow;
