import React, { useState, useRef } from 'react';
import { UploadCloud, FolderPlus, CheckCircle2, AlertCircle } from 'lucide-react';

const UploadDropzone = ({ onUpload, uploadStatus, onCreateFolder }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onUpload(files[0]);
    }
    // reset input value so re-uploading same file triggers event
    e.target.value = '';
  };

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Center Action Panel: Unified 1-Time Upload File & New Folder */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`rounded-2xl border transition-all p-3 sm:p-3.5 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
            : 'border-gray-200/90 bg-white shadow-2xs'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Action Buttons: 1 Clean Place in the Center */}
          <div className="flex items-center gap-2.5 flex-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all touch-active"
            >
              <UploadCloud className="h-4.5 w-4.5 stroke-[2.2]" />
              <span>Upload File</span>
            </button>

            {onCreateFolder && (
              <button
                type="button"
                onClick={onCreateFolder}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] text-gray-700 font-bold text-sm shadow-2xs transition-all touch-active"
              >
                <FolderPlus className="h-4.5 w-4.5 text-gray-500" />
                <span>New Folder</span>
              </button>
            )}
          </div>

          {/* Drag & Drop Hint for Desktop */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="cursor-pointer text-center sm:text-right text-xs text-gray-400 font-medium hover:text-blue-600 transition-colors py-0.5"
          >
            {isDragOver ? (
              <span className="text-blue-600 font-bold">Release to drop & upload files</span>
            ) : (
              <span className="hidden sm:inline">💡 Drag & drop files anywhere here (up to 100 MB)</span>
            )}
          </div>
        </div>
      </div>

      {/* Floating Progress Bar when Uploading */}
      {uploadStatus.isUploading && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 sm:w-96 rounded-2xl bg-white p-4 shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-800 truncate max-w-[200px]">
              Uploading {uploadStatus.fileName}...
            </span>
            <span className="text-xs font-bold text-blue-600">
              {uploadStatus.progress}%
            </span>
          </div>

          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-200"
              style={{ width: `${uploadStatus.progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Toast Alert for upload errors or successes */}
      {uploadStatus.message && (
        <div
          className={`fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-start gap-3 sm:w-96 rounded-2xl p-4 shadow-xl border animate-in slide-in-from-bottom-5 ${
            uploadStatus.isError
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-green-50 border-green-200 text-green-800'
          }`}
        >
          {uploadStatus.isError ? (
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
          )}
          <div className="flex-1 text-xs font-medium leading-relaxed">
            {uploadStatus.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDropzone;
