import React from 'react';
import { FolderOpen, UploadCloud, FolderPlus } from 'lucide-react';

const EmptyState = ({ onUploadClick, onCreateFolderClick, isSearch }) => {
  if (isSearch) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-4">
          <FolderOpen className="h-8 w-8" />
        </div>
        <h3 className="text-base font-semibold text-gray-800">No matching files or folders</h3>
        <p className="text-sm text-gray-400 max-w-sm mt-1">
          Check the spelling or try searching for another keyword.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white border border-gray-100">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 mb-4">
        <FolderOpen className="h-8 w-8" />
      </div>
      <h3 className="text-base font-semibold text-gray-800">This folder is empty</h3>
      <p className="text-sm text-gray-400 max-w-sm mt-1 mb-6">
        Drop files here or use the buttons below to add files and folders.
      </p>

      <div className="flex items-center gap-3">
        <button
          onClick={onCreateFolderClick}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <FolderPlus className="h-4 w-4" />
          <span>New folder</span>
        </button>

        <button
          onClick={onUploadClick}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
        >
          <UploadCloud className="h-4 w-4" />
          <span>Upload file</span>
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
