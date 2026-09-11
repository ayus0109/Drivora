import React, { useState, useRef, useEffect } from 'react';
import { getFileIcon } from '../utils/fileIcons';
import { formatBytes, formatDate } from '../utils/formatBytes';
import {
  Download,
  Share2,
  MoreVertical,
  Edit2,
  Trash2,
  Eye,
  ShieldCheck,
  Star,
  FolderInput,
  RotateCcw,
  Info,
  Check,
} from 'lucide-react';

const FileCard = ({
  file,
  onDownload,
  onShare,
  onRename,
  onDelete,
  onPreview,
  isSelected = false,
  onToggleSelect,
  onToggleStar,
  onMove,
  onOpenDetails,
  isTrashView = false,
  onRestore,
  onPermanentDelete,
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
      onDoubleClick={() => !isTrashView && onPreview && onPreview(file, 'preview')}
      className={`group relative flex flex-col justify-between p-4 rounded-2xl border transition-all select-none ${
        isSelected
          ? 'bg-blue-50/70 border-blue-500 shadow-md ring-1 ring-blue-500/30'
          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
      }`}
    >
      {/* Checkbox overlay for multi-select */}
      {onToggleSelect && !isTrashView && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(file, e);
          }}
          className={`absolute top-3.5 left-3.5 z-10 h-5 w-5 rounded-md border flex items-center justify-center cursor-pointer transition-all ${
            isSelected
              ? 'bg-blue-600 border-blue-600 text-white opacity-100 shadow-xs'
              : 'border-gray-300 bg-white/90 text-transparent group-hover:opacity-100 opacity-0 hover:border-blue-500'
          }`}
          title={isSelected ? 'Deselect file' : 'Select file'}
        >
          <Check className="h-3.5 w-3.5 stroke-[3]" />
        </div>
      )}

      {/* Card Header: Icon, Badge & Star / Options */}
      <div className="flex items-start justify-between mb-3">
        <div
          onClick={() => !isTrashView && onPreview && onPreview(file, 'preview')}
          className={`flex items-center gap-2.5 flex-1 min-w-0 ${
            onToggleSelect && !isTrashView ? 'pl-7' : ''
          }`}
        >
          <div className="p-2 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg tracking-wide ${color}`}>
            {badge}
          </span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          {/* Star Button */}
          {!isTrashView && onToggleStar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(file);
              }}
              title={file.isStarred ? 'Remove from Starred' : 'Add to Starred'}
              className={`p-1.5 rounded-lg transition-colors ${
                file.isStarred
                  ? 'text-amber-400 hover:bg-amber-50'
                  : 'text-gray-300 hover:text-amber-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100'
              }`}
            >
              <Star className={`h-4 w-4 ${file.isStarred ? 'fill-amber-400' : ''}`} />
            </button>
          )}

          {/* Options Menu Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            title="Options"
            className={`p-1.5 rounded-lg transition-colors ${
              menuOpen
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MoreVertical className="h-4.5 w-4.5" />
          </button>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div
              className="absolute right-0 top-9 z-50 w-52 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10 border border-gray-100 text-sm animate-in fade-in zoom-in-95 duration-100"
              onClick={(e) => e.stopPropagation()}
            >
              {isTrashView ? (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRestore && onRestore(file);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-emerald-700 hover:bg-emerald-50 transition-colors font-semibold text-xs touch-active"
                  >
                    <RotateCcw className="h-4 w-4 text-emerald-600" />
                    <span>Restore File</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onPermanentDelete && onPermanentDelete(file);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-semibold text-xs touch-active"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span>Delete Forever</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onPreview && onPreview(file, 'preview');
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors font-semibold text-xs touch-active"
                  >
                    <Eye className="h-4 w-4 text-blue-500" />
                    <span>Preview</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onOpenDetails && onOpenDetails(file);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-gray-700 hover:bg-slate-100 transition-colors font-semibold text-xs touch-active"
                  >
                    <Info className="h-4 w-4 text-slate-500" />
                    <span>File Details</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDownload && onDownload(file);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-xs font-semibold touch-active"
                  >
                    <Download className="h-4 w-4 text-gray-500" />
                    <span>Download</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onShare && onShare(file);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-xs font-semibold touch-active"
                  >
                    <Share2 className="h-4 w-4 text-purple-500" />
                    <span>Share Link</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onMove && onMove(file);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-xs font-semibold touch-active"
                  >
                    <FolderInput className="h-4 w-4 text-amber-500" />
                    <span>Move to...</span>
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRename && onRename(file);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-xs font-semibold touch-active"
                  >
                    <Edit2 className="h-4 w-4 text-gray-500" />
                    <span>Rename</span>
                  </button>

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete && onDelete(file);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-xs font-semibold touch-active"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                    <span>Move to Trash</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* File Name & Date */}
      <div
        onClick={() => !isTrashView && onPreview && onPreview(file, 'preview')}
        className="mb-4 flex-1 cursor-pointer"
      >
        <h3
          className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors"
          title={file.name}
        >
          {file.name}
        </h3>
        <p className="text-xs text-gray-400 mt-1 font-medium">
          {formatBytes(file.sizeBytes)} • {formatDate(file.createdAt)}
        </p>
      </div>

      {/* Quick Action Footer */}
      <div
        className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500"
        onClick={(e) => e.stopPropagation()}
      >
        {isTrashView ? (
          <>
            <button
              onClick={() => onRestore && onRestore(file)}
              className="flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-bold transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restore</span>
            </button>
            <button
              onClick={() => onPermanentDelete && onPermanentDelete(file)}
              className="flex items-center gap-1 text-red-600 hover:text-red-800 font-bold transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Forever</span>
            </button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview && onPreview(file, 'preview');
              }}
              className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold transition-colors"
            >
              <Eye className="h-3.5 w-3.5" />
              <span>Preview</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload && onDownload(file);
              }}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails && onOpenDetails(file);
              }}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors"
              title="Inspect file details"
            >
              <Info className="h-3.5 w-3.5" />
              <span>Details</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default FileCard;
