import React from 'react';
import { FolderOpen, Star, Trash2, Search } from 'lucide-react';

const EmptyState = ({
  type = 'drive', // 'drive' | 'starred' | 'trash'
  isSearch = false,
  onUploadClick,
  onCreateFolderClick,
}) => {
  if (isSearch) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white border border-gray-100 shadow-2xs">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 mb-4">
          <Search className="h-8 w-8" />
        </div>
        <h3 className="text-base font-bold text-gray-800">No matching items found</h3>
        <p className="text-xs sm:text-sm text-gray-500 max-w-sm mt-1">
          Try checking for typos or searching for a different keyword or file extension.
        </p>
      </div>
    );
  }

  if (type === 'trash') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white border border-gray-100 shadow-2xs">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-500 mb-4">
          <Trash2 className="h-8 w-8" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-gray-800">Trash is empty</h3>
        <p className="text-xs sm:text-sm text-gray-500 max-w-sm mt-1">
          Items you move to trash will be stored here for 30 days before being deleted permanently.
        </p>
      </div>
    );
  }

  if (type === 'starred') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white border border-gray-100 shadow-2xs">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500 mb-4">
          <Star className="h-8 w-8 fill-amber-400" />
        </div>
        <h3 className="text-base sm:text-lg font-bold text-gray-800">No starred items</h3>
        <p className="text-xs sm:text-sm text-gray-500 max-w-sm mt-1">
          Star your most important files and folders to easily access them in one place.
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
