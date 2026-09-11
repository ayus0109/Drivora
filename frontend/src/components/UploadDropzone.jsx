import React, { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, X } from 'lucide-react';

const UploadDropzone = ({ onUpload, uploadStatus }) => {
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

      {/* Upload Dropzone Banner */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-4 sm:p-6 text-center cursor-pointer transition-all touch-active ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/80 scale-[1.01]'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50/50'
        }`}
      >
        <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600 group-hover:scale-110 transition-transform mb-2 sm:mb-3">
          <UploadCloud className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <p className="text-xs sm:text-sm font-semibold text-gray-800">
          <span className="text-blue-600 underline decoration-blue-300 underline-offset-2">
            Tap to upload
          </span>{' '}
          or drag files here
        </p>
        <p className="text-[11px] sm:text-xs text-gray-400 mt-1">
          Any file up to 100 MB (PDF, Images, Video, Docs, Code)
        </p>
      </div>

      {/* Floating Progress Bar when Uploading */}
      {uploadStatus.isUploading && (
        <div className="fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 sm:w-96 rounded-2xl bg-white p-4 shadow-2xl border border-gray-100 animate-in slide-in-from-bottom-5">
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
          className={`fixed bottom-20 sm:bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-start gap-3 sm:w-96 rounded-2xl p-4 shadow-xl border animate-in slide-in-from-bottom-5 ${
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
