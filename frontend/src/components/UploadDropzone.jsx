import React, { useState, useRef } from 'react';
import { UploadCloud, FolderPlus, CheckCircle2, AlertCircle, FileUp, Sparkles, ShieldCheck } from 'lucide-react';

const UploadDropzone = ({
  onUpload,
  uploadStatus,
  onCreateFolder,
  currentFolderName = 'My Drive',
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles && droppedFiles.length > 0) {
      if (droppedFiles.length === 1) {
        onUpload(droppedFiles[0]);
      } else {
        // Upload each dropped file
        Array.from(droppedFiles).forEach((file) => onUpload(file));
      }
    }
  };

  const handleFileSelect = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      if (selectedFiles.length === 1) {
        onUpload(selectedFiles[0]);
      } else {
        Array.from(selectedFiles).forEach((file) => onUpload(file));
      }
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      {/* Hidden Multi-file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Main Dropzone Card */}
      <div className="rounded-2xl border border-gray-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
        {/* Top Control Bar with Upload File & New Folder */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 flex-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all touch-active"
            >
              <UploadCloud className="h-4 w-4 stroke-[2.4]" />
              <span>Upload File</span>
            </button>

            {onCreateFolder && (
              <button
                type="button"
                onClick={onCreateFolder}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] text-gray-700 font-bold text-xs sm:text-sm shadow-2xs transition-all touch-active"
              >
                <FolderPlus className="h-4 w-4 text-gray-500" />
                <span>New Folder</span>
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-gray-400 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>AES-256-GCM Encrypted</span>
          </div>
        </div>

        {/* Dedicated Visual Drag & Drop Box */}
        <div
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`group relative rounded-xl border-2 border-dashed transition-all cursor-pointer p-6 sm:p-8 flex flex-col items-center justify-center text-center select-none ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/90 scale-[1.01] shadow-inner ring-4 ring-blue-500/10'
              : 'border-gray-200 hover:border-blue-400 bg-gray-50/60 hover:bg-blue-50/30'
          }`}
        >
          <div
            className={`flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-2xl transition-transform duration-200 mb-3 ${
              isDragOver
                ? 'bg-blue-600 text-white scale-110 shadow-lg shadow-blue-500/30'
                : 'bg-blue-100/80 text-blue-600 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white'
            }`}
          >
            <FileUp className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.2]" />
          </div>

          {isDragOver ? (
            <div className="space-y-1 animate-in zoom-in-95 duration-100">
              <p className="text-sm sm:text-base font-bold text-blue-600">
                Drop files here to upload to {currentFolderName}
              </p>
              <p className="text-xs text-blue-500 font-semibold">
                Releasing will upload and encrypt your files immediately
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                Drag and drop your files here, or{' '}
                <span className="text-blue-600 underline underline-offset-2">
                  browse from device
                </span>
              </p>
              <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                Supports PDF, Docs, Images, Audio, Video & Archives (up to 100 MB per file)
              </p>
            </div>
          )}
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
