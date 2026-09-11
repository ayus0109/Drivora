import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, RotateCcw } from 'lucide-react';

const DeleteModal = ({
  isOpen,
  onClose,
  item,
  isFolder,
  onDelete,
  isPermanent = false,
  title,
  message,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !item) return null;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await onDelete(item);
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTitle = isPermanent
    ? `Delete ${isFolder ? 'Folder' : 'File'} Forever?`
    : `Move ${isFolder ? 'Folder' : 'File'} to Trash?`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 flex-shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-bold text-gray-900">
            {title || defaultTitle}
          </h3>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            {message ? (
              message
            ) : isPermanent ? (
              <>
                Are you sure you want to permanently delete{' '}
                <span className="font-bold text-gray-900">"{item.name}"</span>?
                This action cannot be undone.
              </>
            ) : (
              <>
                Move <span className="font-bold text-gray-900">"{item.name}"</span> to Trash?
                You can restore it anytime within 30 days.
              </>
            )}
            {isFolder && isPermanent && (
              <span className="block mt-2 text-xs text-red-600 font-semibold bg-red-50 p-2.5 rounded-xl border border-red-100">
                ⚠️ All nested subfolders and files inside will also be permanently deleted.
              </span>
            )}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl shadow-md shadow-red-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>
              {isSubmitting
                ? 'Processing...'
                : isPermanent
                ? 'Delete Forever'
                : 'Move to Trash'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
