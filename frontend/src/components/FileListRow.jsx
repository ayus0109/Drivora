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
  Star,
  FolderInput,
  RotateCcw,
  Info,
  Check,
} from 'lucide-react';

const FileListRow = ({
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
      onDoubleClick={() => !isTrashView && onPreview && onPreview(file, 'preview')}
      className={`group flex items-center justify-between px-4 py-3 border-b border-gray-100 transition-colors text-sm select-none ${
        isSelected
          ? 'bg-blue-50/80 border-blue-200'
          : 'hover:bg-blue-50/40 bg-white'
      }`}
    >
      {/* Selection Checkbox & Star & Name */}
      <div
        onClick={() => !isTrashView && onPreview && onPreview(file, 'preview')}
        className="flex items-center gap-3 min-w-0 flex-[2] cursor-pointer"
      >
        {/* Checkbox */}
        {onToggleSelect && !isTrashView && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(file, e);
            }}
            className={`h-4.5 w-4.5 rounded border flex items-center justify-center cursor-pointer transition-all flex-shrink-0 ${
              isSelected
                ? 'bg-blue-600 border-blue-600 text-white opacity-100'
                : 'border-gray-300 bg-white text-transparent group-hover:opacity-100 opacity-0 hover:border-blue-500'
            }`}
            title={isSelected ? 'Deselect file' : 'Select file'}
          >
            <Check className="h-3 w-3 stroke-[3]" />
          </div>
        )}

        {/* Star Button */}
        {!isTrashView && onToggleStar && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(file);
            }}
            title={file.isStarred ? 'Remove from Starred' : 'Add to Starred'}
            className={`p-1 rounded-md transition-colors flex-shrink-0 ${
              file.isStarred
                ? 'text-amber-400 hover:bg-amber-50'
                : 'text-gray-300 hover:text-amber-400 hover:bg-gray-100 opacity-0 group-hover:opacity-100'
            }`}
          >
            <Star className={`h-4 w-4 ${file.isStarred ? 'fill-amber-400' : ''}`} />
          </button>
        )}

        {/* File Icon & Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className="flex-shrink-0">{icon}</div>
          <span
            className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors block text-xs sm:text-sm"
            title={file.name}
          >
            {file.name}
          </span>
        </div>
      </div>

      {/* Date Modified */}
      <div
        onClick={() => !isTrashView && onPreview && onPreview(file, 'preview')}
        className="hidden sm:block flex-1 text-gray-500 text-xs font-medium truncate cursor-pointer px-2"
      >
        {formatDate(file.createdAt)}
      </div>

      {/* File Size */}
      <div
        onClick={() => !isTrashView && onPreview && onPreview(file, 'preview')}
        className="hidden md:block flex-1 text-gray-600 text-xs font-semibold truncate cursor-pointer font-mono px-2"
      >
        {formatBytes(file.sizeBytes)}
      </div>

      {/* Action Buttons */}
      <div
        className="flex items-center gap-1 flex-shrink-0 relative"
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
      >
        {isTrashView ? (
          <>
            <button
              onClick={() => onRestore && onRestore(file)}
              title="Restore file"
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={() => onPermanentDelete && onPermanentDelete(file)}
              title="Delete Forever"
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview && onPreview(file, 'preview');
              }}
              title="Preview"
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Eye className="h-4 w-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenDetails && onOpenDetails(file);
              }}
              title="File details"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Info className="h-4 w-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(file);
              }}
              title="Download"
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Download className="h-4 w-4" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              title="More options"
              className={`p-1.5 rounded-lg transition-colors ${
                menuOpen
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div
                className="absolute right-0 top-8 z-50 w-52 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10 border border-gray-100 text-sm animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
              >
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
                    onDownload(file);
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-xs font-semibold touch-active"
                >
                  <Download className="h-4 w-4 text-gray-500" />
                  <span>Download</span>
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onShare(file);
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-xs font-semibold touch-active"
                >
                  <Share2 className="h-4 w-4 text-purple-500" />
                  <span>Share link</span>
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
                    onRename(file);
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-xs font-semibold touch-active"
                >
                  <Edit2 className="h-4 w-4 text-gray-500" />
                  <span>Rename</span>
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onDelete(file);
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-xs font-semibold touch-active"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <span>Move to Trash</span>
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FileListRow;
