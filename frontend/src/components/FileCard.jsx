import React, { useState, useRef, useEffect } from 'react';
import { getFileIcon } from '../utils/fileIcons';
import { formatBytes, formatDate } from '../utils/formatBytes';
import { Download, Share2, MoreVertical, Edit2, Trash2, Eye, ShieldCheck } from 'lucide-react';

const FileCard = ({
  file,
  onDownload,
  onShare,
  onRename,
  onDelete,
  onPreview,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const { icon, color, badge } = getFileIcon(file.mimeType, file.name);

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
      className="group relative flex flex-col justify-between p-4 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-md transition-all cursor-pointer select-none"
    >
      {/* Card Header: Icon & Options */}
      <div className="flex items-start justify-between mb-3">
        <div
          onClick={() => onPreview && onPreview(file, 'preview')}
          className="flex items-center gap-2.5 flex-1 min-w-0"
        >
          <div className="p-2 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg tracking-wide ${color}`}>
            {badge}
          </span>
        </div>

        <div className="relative flex-shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            title="Options"
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
                <span>Get Share Link</span>
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

      {/* File Name & Date */}
      <div
        onClick={() => onPreview && onPreview(file, 'preview')}
        className="mb-4 flex-1"
      >
        <h3
          className="text-sm sm:text-base font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors"
          title={file.name}
        >
          {file.name}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mt-1 font-medium">
          {formatBytes(file.sizeBytes)} • {formatDate(file.createdAt)}
        </p>
      </div>

      {/* Quick Action Footer */}
      <div
        className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPreview && onPreview(file, 'preview');
          }}
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>Preview</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDownload(file);
          }}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Download</span>
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare(file);
          }}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <Share2 className="h-3.5 w-3.5" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
};

export default FileCard;
