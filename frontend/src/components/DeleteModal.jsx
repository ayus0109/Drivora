import React, { useState } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';

const DeleteModal = ({ isOpen, onClose, item, isFolder, onDelete }) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 flex-shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4">
          <h3 className="text-lg font-bold text-gray-900">
            Delete {isFolder ? 'Folder' : 'File'}?
          </h3>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Are you sure you want to permanently delete{' '}
            <span className="font-semibold text-gray-800">"{item.name}"</span>?
            {isFolder && (
              <span className="block mt-1 text-red-600 font-medium">
                ⚠️ All nested subfolders and files inside this folder will also be deleted.
              </span>
            )}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>{isSubmitting ? 'Deleting...' : 'Delete'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteModal;
