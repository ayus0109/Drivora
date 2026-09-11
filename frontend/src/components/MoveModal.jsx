import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import {
  X,
  Folder as FolderIcon,
  HardDrive,
  FolderInput,
  Check,
  Loader2,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

const MoveModal = ({
  isOpen,
  onClose,
  itemsToMove = [], // [{ _id, name, isFolder, currentFolderId }]
  onSuccess,
}) => {
  const [folders, setFolders] = useState([]);
  const [selectedTargetId, setSelectedTargetId] = useState('root');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedTargetId('root');
      setError('');
      fetchAvailableFolders();
    }
  }, [isOpen]);

  const fetchAvailableFolders = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/folders', { params: { all: 'true' } });
      setFolders(res.data.folders || []);
    } catch (err) {
      console.error('Failed to fetch folders for move:', err);
      setError('Failed to load folders.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMove = async () => {
    if (itemsToMove.length === 0) return;
    setIsSubmitting(true);
    setError('');

    try {
      // Move each item
      for (const item of itemsToMove) {
        if (item.isFolder) {
          await api.patch(`/folders/${item._id}/move`, {
            targetParentId: selectedTargetId === 'root' ? null : selectedTargetId,
          });
        } else {
          await api.patch(`/files/${item._id}/move`, {
            targetFolderId: selectedTargetId === 'root' ? null : selectedTargetId,
          });
        }
      }

      onSuccess && onSuccess(selectedTargetId);
      onClose();
    } catch (err) {
      console.error('Move failed:', err);
      setError(err.response?.data?.message || 'Failed to move items. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const itemNames = itemsToMove.map((i) => i.name).join(', ');
  const movingFolderIds = itemsToMove.filter((i) => i.isFolder).map((i) => i._id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-gray-100 font-['Plus_Jakarta_Sans',sans-serif] animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close"
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shadow-xs">
            <FolderInput className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <h3 className="text-base font-bold text-gray-900 truncate">
              Move to...
            </h3>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              Moving: <strong className="text-gray-700 font-semibold">{itemNames}</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 animate-in fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Folder List */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1 my-4 divide-y divide-gray-50 rounded-2xl border border-gray-100 p-2 bg-slate-50/50">
          {/* Root option (My Drive) */}
          <div
            onClick={() => setSelectedTargetId('root')}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
              selectedTargetId === 'root'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20'
                : 'hover:bg-white text-gray-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HardDrive
                className={`h-4 w-4 ${
                  selectedTargetId === 'root' ? 'text-white' : 'text-blue-600'
                }`}
              />
              <span className="text-xs font-bold">My Drive (Root directory)</span>
            </div>
            {selectedTargetId === 'root' && <Check className="h-4 w-4" />}
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Loading folders...</span>
            </div>
          ) : folders.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-400">
              No subfolders created yet. You can move items to My Drive root.
            </div>
          ) : (
            folders.map((folder) => {
              const isSelfOrChild = movingFolderIds.includes(folder._id);
              const isSelected = selectedTargetId === folder._id;

              return (
                <div
                  key={folder._id}
                  onClick={() => {
                    if (!isSelfOrChild) {
                      setSelectedTargetId(folder._id);
                    }
                  }}
                  className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                    isSelfOrChild
                      ? 'opacity-40 cursor-not-allowed text-gray-400 bg-gray-50/50'
                      : isSelected
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 cursor-pointer'
                      : 'hover:bg-white text-gray-700 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FolderIcon
                      className={`h-4 w-4 flex-shrink-0 ${
                        isSelected ? 'text-white' : 'text-amber-500 fill-amber-400/20'
                      }`}
                    />
                    <span className="text-xs font-semibold truncate">
                      {folder.name}
                    </span>
                  </div>
                  {isSelected && <Check className="h-4 w-4 shrink-0" />}
                </div>
              );
            })
          )}
        </div>

        {/* Buttons */}
        <div className="pt-3 flex items-center justify-between border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleMove}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Moving...</span>
              </>
            ) : (
              <span>Move Here</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MoveModal;
