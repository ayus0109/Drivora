import React, { useState, useRef } from 'react';
import uploadQueue from '../utils/uploadQueue';
import { extractFilesFromDataTransfer, resolveFolderPath } from '../utils/fileTraversal';
import {
  UploadCloud,
  FolderPlus,
  FolderUp,
  CheckCircle2,
  AlertCircle,
  FileUp,
  Image as ImageIcon,
  ShieldCheck,
  Layers,
} from 'lucide-react';

const UploadDropzone = ({
  onUpload,
  onCreateFolder,
  currentFolderId = null,
  currentFolderName = 'My Drive',
  onToast,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const photoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
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
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle Drag & Drop with recursive directory traversal
  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    dragCounter.current = 0;

    try {
      const extractedEntries = await extractFilesFromDataTransfer(e.dataTransfer);
      if (!extractedEntries || extractedEntries.length === 0) return;

      const uploadPayload = [];

      for (const entry of extractedEntries) {
        if (entry.pathSegments && entry.pathSegments.length > 0) {
          const resolvedFolderId = await resolveFolderPath(entry.pathSegments, currentFolderId);
          uploadPayload.push({
            file: entry.file,
            folderId: resolvedFolderId,
            folderName: entry.pathSegments[entry.pathSegments.length - 1],
          });
        } else {
          uploadPayload.push({
            file: entry.file,
            folderId: currentFolderId,
            folderName: currentFolderName,
          });
        }
      }

      if (onToast) {
        onToast(`Preparing ${extractedEntries.length} file${extractedEntries.length > 1 ? 's' : ''} for upload...`, 'info');
      }

      uploadQueue.enqueue(uploadPayload);
    } catch (err) {
      console.error('Error handling dropped items:', err);
      // Fallback to legacy onUpload if available
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles && droppedFiles.length > 0) {
        Array.from(droppedFiles).forEach((f) => onUpload && onUpload(f));
      }
    }
  };

  // Handle regular file selection (Photos, Videos, Documents, or Any File)
  const handleFileSelect = (e) => {
    try {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      const filesArray = Array.from(selectedFiles);
      if (onToast) {
        onToast(
          `Received ${filesArray.length} item${filesArray.length > 1 ? 's' : ''}. Starting upload...`,
          'info'
        );
      }

      const payload = filesArray.map((file) => ({
        file,
        folderId: currentFolderId,
        folderName: currentFolderName,
      }));

      uploadQueue.enqueue(payload);
    } catch (err) {
      console.error('Mobile file selection error:', err);
      if (onToast) {
        onToast('Failed to process selected items: ' + err.message, 'error');
      }
    }
    // NOTE: NEVER reset e.target.value inside a setTimeout while files are in queue!
    // Clearing e.target.value revokes native file descriptors on mobile WebKit and Chromium.
    // Instead, e.currentTarget.value is reset safely in onClick before user picks.
  };

  // Handle native folder selection (webkitdirectory)
  const handleFolderSelect = async (e) => {
    try {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) return;

      const filesArray = Array.from(selectedFiles);
      if (onToast) {
        onToast(`Scanning ${filesArray.length} file${filesArray.length > 1 ? 's' : ''} in folder...`, 'info');
      }
      const uploadPayload = [];

      for (const file of filesArray) {
        // webkitRelativePath contains e.g. "Photos/2026/img.png"
        const relativePath = file.webkitRelativePath || '';
        const parts = relativePath.split('/').filter(Boolean);
        const folderSegments = parts.slice(0, -1);

        if (folderSegments.length > 0) {
          const resolvedFolderId = await resolveFolderPath(folderSegments, currentFolderId);
          uploadPayload.push({
            file,
            folderId: resolvedFolderId,
            folderName: folderSegments[folderSegments.length - 1],
          });
        } else {
          uploadPayload.push({
            file,
            folderId: currentFolderId,
            folderName: currentFolderName,
          });
        }
      }

      uploadQueue.enqueue(uploadPayload);
    } catch (err) {
      console.error('Folder upload error:', err);
      if (onToast) onToast('Failed to scan folder: ' + err.message, 'error');
    }
  };

  return (
    <div className="space-y-3">
      {/* 1. Dedicated Photos & Videos Input (Triggers Native iOS Photos & Android Photo Picker directly) */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFileSelect}
        onClick={(e) => {
          e.currentTarget.value = null;
        }}
        className="fixed -top-full -left-full opacity-0 w-1 h-1 pointer-events-none"
        aria-hidden="true"
        tabIndex="-1"
      />

      {/* 2. Generic Multi-File Input (All file formats) */}
      <input
        id="main-dropzone-file-input"
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        onClick={(e) => {
          e.currentTarget.value = null;
        }}
        className="fixed -top-full -left-full opacity-0 w-1 h-1 pointer-events-none"
        aria-hidden="true"
        tabIndex="-1"
      />

      {/* 3. Accessible Folder Input (Directory tree upload) */}
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory=""
        directory=""
        multiple
        onChange={handleFolderSelect}
        onClick={(e) => {
          e.currentTarget.value = null;
        }}
        className="fixed -top-full -left-full opacity-0 w-1 h-1 pointer-events-none"
        aria-hidden="true"
        tabIndex="-1"
      />

      {/* Main Dropzone Card */}
      <div className="rounded-2xl border border-gray-200/90 bg-white p-3.5 sm:p-4 shadow-xs">
        {/* Top Control Bar with Upload Photos & Videos, All Files, Upload Folder & New Folder */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Mobile/Desktop Action: Upload Photos & Videos */}
            <button
              type="button"
              onClick={() => photoInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all touch-active cursor-pointer"
              title="Select photos and videos from gallery or camera"
            >
              <ImageIcon className="h-4 w-4 stroke-[2.4]" />
              <span>Photos & Videos</span>
            </button>

            {/* Upload Files (PDF, Docs, Any Type) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:scale-[0.98] text-gray-700 font-bold text-xs sm:text-sm shadow-2xs transition-all touch-active cursor-pointer"
              title="Upload documents, PDFs, or any file"
            >
              <UploadCloud className="h-4 w-4 text-gray-500" />
              <span>All Files</span>
            </button>

            {/* Upload Folder Directory */}
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="hidden sm:flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100 text-blue-700 font-bold text-xs sm:text-sm shadow-2xs transition-all touch-active cursor-pointer"
              title="Upload entire folder directory structure"
            >
              <FolderUp className="h-4 w-4 text-blue-600" />
              <span>Upload Folder</span>
            </button>

            {onCreateFolder && (
              <button
                type="button"
                onClick={onCreateFolder}
                className="flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-700 font-bold text-xs sm:text-sm shadow-2xs transition-all touch-active cursor-pointer"
              >
                <FolderPlus className="h-4 w-4 text-gray-500" />
                <span>New Folder</span>
              </button>
            )}
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-[11px] text-gray-400 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>AES-256-GCM Encrypted (Concurrent Multi-Stream)</span>
          </div>
        </div>

        {/* Dedicated Visual Drag & Drop Box / Touch Target */}
        <label
          htmlFor="main-dropzone-file-input"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group relative block rounded-xl border-2 border-dashed transition-all cursor-pointer p-6 sm:p-8 text-center select-none overflow-hidden ${
            isDragOver
              ? 'border-blue-500 bg-blue-50/90 scale-[1.01] shadow-inner ring-4 ring-blue-500/10'
              : 'border-gray-200 hover:border-blue-400 bg-gray-50/60 hover:bg-blue-50/30'
          }`}
        >
          <div className="flex flex-col items-center justify-center">
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
                  Drop files or folders to upload to {currentFolderName}
                </p>
                <p className="text-xs text-blue-500 font-semibold">
                  Releasing will queue and encrypt files with enterprise concurrency
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                  Drag and drop files or folders here, or{' '}
                  <span className="text-blue-600 underline underline-offset-2">
                    browse from device
                  </span>
                </p>
                <p className="text-[11px] sm:text-xs text-gray-400 font-medium">
                  Supports batch uploads up to 500+ files from photo library & device (up to 100 MB per file)
                </p>
              </div>
            )}
          </div>
        </label>
      </div>
    </div>
  );
};

export default UploadDropzone;
