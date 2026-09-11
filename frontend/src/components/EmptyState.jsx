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
    <div className="flex flex-col items-center justify-center p-10 sm:p-14 text-center rounded-2xl bg-white border border-gray-100 shadow-2xs">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 mb-4 shadow-xs">
        <FolderOpen className="h-8 w-8" />
      </div>
      <h3 className="text-base sm:text-lg font-bold text-gray-800">This folder is empty</h3>
      <p className="text-xs sm:text-sm text-gray-400 max-w-sm mt-1">
        Use the <span className="font-semibold text-gray-600">Upload File</span> or <span className="font-semibold text-gray-600">New Folder</span> buttons above to add items.
      </p>
    </div>
  );
};

export default EmptyState;
