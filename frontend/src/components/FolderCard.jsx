import React, { useState, useRef, useEffect } from 'react';
import {
  Folder as FolderIcon,
  MoreVertical,
  Edit2,
  Trash2,
  Star,
  FolderInput,
  RotateCcw,
  Check,
  FolderOpen,
  ArrowDownToLine,
} from 'lucide-react';

const FolderCard = ({
  folder,
  onOpen,
  onRename,
  onDelete,
  viewMode = 'grid',
  isSelected = false,
  onToggleSelect,
  onToggleStar,
  onMove,
  isTrashView = false,
  onRestore,
  onPermanentDelete,
  onDropFile,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDragOverFolder, setIsDragOverFolder] = useState(false);
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

  const handleCardClick = () => {
    if (isTrashView) return;
    onOpen(folder._id);
  };

  // Drag & Drop event handlers to receive dropped files
  const handleFolderDragOver = (e) => {
    if (isTrashView) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!isDragOverFolder) {
      setIsDragOverFolder(true);
    }
  };

  const handleFolderDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverFolder(false);
  };

  const handleFolderDrop = (e) => {
    if (isTrashView) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragOverFolder(false);

    try {
      const rawData = e.dataTransfer.getData('text/plain');
      if (rawData) {
        const data = JSON.parse(rawData);
        if (data.type === 'drivora-file' && data.fileId && onDropFile) {
          onDropFile(data.fileId, data.fileName, folder);
        }
      }
    } catch (err) {
      console.error('Folder drop error:', err);
    }
  };

  // LIST VIEW
  if (viewMode === 'list') {
    return (
      <div
        onDoubleClick={handleCardClick}
        onDragOver={handleFolderDragOver}
        onDragLeave={handleFolderDragLeave}
        onDrop={handleFolderDrop}
        className={`group flex items-center justify-between px-4 py-3 transition-all border-b border-gray-100 cursor-pointer select-none ${
          isDragOverFolder
            ? 'bg-blue-100/90 border-blue-400 ring-2 ring-blue-500 scale-[1.01]'
            : isSelected
            ? 'bg-blue-50/80 border-blue-200'
            : 'hover:bg-blue-50/50 bg-white'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Checkbox */}
          {onToggleSelect && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(folder._id);
              }}
              title={isSelected ? 'Deselect folder' : 'Select folder'}
              className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
                isSelected
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'border-gray-300 group-hover:border-gray-400 bg-white hover:bg-gray-50'
              }`}
            >
              {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
            </button>
          )}

          {/* Star Button */}
          {!isTrashView && onToggleStar && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar(folder._id);
              }}
              title={folder.isStarred ? 'Remove from Starred' : 'Star folder'}
              className="p-1 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-colors flex-shrink-0"
            >
              <Star
                className={`h-4 w-4 ${
                  folder.isStarred
                    ? 'text-amber-500 fill-amber-400'
                    : 'group-hover:text-gray-400'
                }`}
              />
            </button>
          )}

          <div
            onClick={handleCardClick}
            className="flex items-center gap-3 min-w-0 flex-1"
          >
            <FolderIcon className="h-5.5 w-5.5 text-amber-500 fill-amber-500/20 flex-shrink-0" />
            <span className="text-sm sm:text-base font-bold text-gray-800 truncate">
              {folder.name}
            </span>
            {isDragOverFolder && (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-200/80 px-2 py-0.5 rounded-full animate-pulse">
                <ArrowDownToLine className="h-3 w-3" /> Drop to move inside
              </span>
            )}
          </div>
        </div>

        {/* Actions Menu / Quick buttons */}
        <div className="flex items-center gap-1.5 relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          {isTrashView ? (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore && onRestore(folder);
                }}
                title="Restore folder"
                className="p-2 rounded-xl text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                <RotateCcw className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPermanentDelete && onPermanentDelete(folder);
                }}
                title="Delete forever"
                className="p-2 rounded-xl text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="h-4.5 w-4.5" />
              </button>
            </>
          ) : (
            <>
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
                <div className="absolute right-0 top-10 z-50 w-48 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10 border border-gray-100 text-sm animate-in fade-in zoom-in-95 duration-100">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onOpen(folder._id);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold"
                  >
                    <FolderOpen className="h-4.5 w-4.5 text-gray-500" />
                    <span>Open</span>
                  </button>

                  {onToggleStar && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onToggleStar(folder._id);
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold"
                    >
                      <Star
                        className={`h-4.5 w-4.5 ${
                          folder.isStarred ? 'text-amber-500 fill-amber-400' : 'text-gray-500'
                        }`}
                      />
                      <span>{folder.isStarred ? 'Remove Star' : 'Add to Starred'}</span>
                    </button>
                  )}

                  {onMove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                        onMove(folder);
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold"
                    >
                      <FolderInput className="h-4.5 w-4.5 text-gray-500" />
                      <span>Move to...</span>
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onRename(folder);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold"
                  >
                    <Edit2 className="h-4.5 w-4.5 text-gray-500" />
                    <span>Rename</span>
                  </button>

                  <div className="my-1 border-t border-gray-100" />

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete(folder);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold"
                  >
                    <Trash2 className="h-4.5 w-4.5 text-red-500" />
                    <span>Move to Trash</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // GRID VIEW
  return (
    <div
      onDoubleClick={handleCardClick}
      onDragOver={handleFolderDragOver}
      onDragLeave={handleFolderDragLeave}
      onDrop={handleFolderDrop}
      className={`group relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer select-none touch-active ${
        isDragOverFolder
          ? 'bg-blue-100/90 border-blue-500 ring-4 ring-blue-500/25 scale-105 shadow-lg'
          : isSelected
          ? 'bg-blue-50/70 border-blue-500 shadow-md ring-1 ring-blue-500/30'
          : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
      }`}
    >
      <div
        onClick={handleCardClick}
        className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1"
      >
        {/* Checkbox */}
        {onToggleSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(folder._id);
            }}
            title={isSelected ? 'Deselect folder' : 'Select folder'}
            className={`h-4.5 w-4.5 rounded-md border flex items-center justify-center transition-all flex-shrink-0 ${
              isSelected
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'border-gray-300 group-hover:border-gray-400 bg-white hover:bg-gray-50'
            }`}
          >
            {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
          </button>
        )}

        <FolderIcon className="h-6 w-6 sm:h-7 sm:w-7 text-amber-500 fill-amber-500/20 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <span
            className="text-sm sm:text-base font-bold text-gray-800 truncate block"
            title={folder.name}
          >
            {folder.name}
          </span>
          {isDragOverFolder && (
            <span className="text-[10px] font-bold text-blue-700 block animate-pulse">
              Drop to move here
            </span>
          )}
        </div>
      </div>

      {/* Star Indicator / Quick Controls */}
      <div className="flex items-center gap-1" ref={menuRef} onClick={(e) => e.stopPropagation()}>
        {!isTrashView && onToggleStar && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar(folder._id);
            }}
            title={folder.isStarred ? 'Remove from Starred' : 'Star folder'}
            className="p-1.5 rounded-lg text-gray-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
          >
            <Star
              className={`h-4 w-4 ${
                folder.isStarred
                  ? 'text-amber-500 fill-amber-400'
                  : 'opacity-0 group-hover:opacity-100 text-gray-400'
              }`}
            />
          </button>
        )}

        {isTrashView ? (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRestore && onRestore(folder);
              }}
              title="Restore folder"
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPermanentDelete && onPermanentDelete(folder);
              }}
              title="Delete forever"
              className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              title="Folder options"
              className={`p-1.5 rounded-xl transition-colors ${
                menuOpen
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-9 z-50 w-48 rounded-2xl bg-white p-2 shadow-2xl ring-1 ring-black/10 border border-gray-100 text-sm animate-in fade-in zoom-in-95 duration-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onOpen(folder._id);
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold"
                >
                  <FolderOpen className="h-4 w-4 text-gray-500" />
                  <span>Open</span>
                </button>

                {onToggleStar && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onToggleStar(folder._id);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold"
                  >
                    <Star
                      className={`h-4.5 w-4.5 ${
                        folder.isStarred ? 'text-amber-500 fill-amber-400' : 'text-gray-500'
                      }`}
                    />
                    <span>{folder.isStarred ? 'Remove Star' : 'Add to Starred'}</span>
                  </button>
                )}

                {onMove && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onMove(folder);
                    }}
                    className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold"
                  >
                    <FolderInput className="h-4 w-4 text-gray-500" />
                    <span>Move to...</span>
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onRename(folder);
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-700 hover:bg-gray-100 transition-colors text-sm font-semibold"
                >
                  <Edit2 className="h-4 w-4 text-gray-500" />
                  <span>Rename</span>
                </button>

                <div className="my-1 border-t border-gray-100" />

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(false);
                    onDelete(folder);
                  }}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors text-sm font-semibold"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                  <span>Move to Trash</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderCard;
