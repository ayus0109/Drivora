import React, { useState, useRef, useEffect } from 'react';
import { Folder as FolderIcon, MoreVertical, Edit2, Trash2 } from 'lucide-react';

const FolderCard = ({ folder, onOpen, onRename, onDelete, viewMode = 'grid' }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  if (viewMode === 'list') {
    return (
      <div
        onDoubleClick={() => onOpen(folder._id)}
        className="group flex items-center justify-between px-4 py-3 rounded-lg hover:bg-blue-50/50 transition-colors border-b border-gray-100 cursor-pointer select-none"
      >
        <div
          onClick={() => onOpen(folder._id)}
          className="flex items-center gap-3 min-w-0 flex-1"
        >
          <FolderIcon className="h-5.5 w-5.5 text-amber-500 fill-amber-500/20 flex-shrink-0" />
          <span className="text-sm sm:text-base font-bold text-gray-800 truncate">
            {folder.name}
          </span>
        </div>

        <div className="flex items-center gap-2 relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            title="Folder options"
            className={`p-2 rounded-xl transition-colors ${
              menuOpen
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <MoreVertical className="h-4.5 w-4.5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-10 z-50 w-44 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10 border border-gray-100 text-sm animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onRename(folder);
                }}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold touch-active"
              >
                <Edit2 className="h-4.5 w-4.5 text-gray-500" />
                <span>Rename</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(false);
                  onDelete(folder);
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
  }

  // Grid View
  return (
    <div
      onDoubleClick={() => onOpen(folder._id)}
      className="group relative flex items-center justify-between p-3 sm:p-3.5 rounded-xl border border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer select-none touch-active"
    >
      <div
        onClick={() => onOpen(folder._id)}
        className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1"
      >
        <FolderIcon className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500 fill-amber-500/20 flex-shrink-0" />
        <span className="text-sm sm:text-base font-bold text-gray-800 truncate" title={folder.name}>
          {folder.name}
        </span>
      </div>

      <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMenuOpen(!menuOpen);
          }}
          title="Folder options"
          className={`p-2 rounded-xl transition-colors ${
            menuOpen
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <MoreVertical className="h-4.5 w-4.5" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-10 z-50 w-44 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10 border border-gray-100 text-sm animate-in fade-in zoom-in-95 duration-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onRename(folder);
              }}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold touch-active"
            >
              <Edit2 className="h-4.5 w-4.5 text-gray-500" />
              <span>Rename</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(false);
                onDelete(folder);
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

export default FolderCard;
