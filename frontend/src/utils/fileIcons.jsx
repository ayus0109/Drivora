import React from 'react';
import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileArchive,
  FileSpreadsheet,
  File as GenericFile,
} from 'lucide-react';

export function getFileIcon(mimeType = '', name = '') {
  const ext = name.split('.').pop()?.toLowerCase() || '';

  // PDFs
  if (mimeType.includes('pdf') || ext === 'pdf') {
    return {
      icon: <FileText className="h-6 w-6 text-red-500" />,
      color: 'bg-red-50 text-red-700',
      badge: 'PDF',
    };
  }

  // Images
  if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) {
    return {
      icon: <FileImage className="h-6 w-6 text-purple-500" />,
      color: 'bg-purple-50 text-purple-700',
      badge: 'IMAGE',
    };
  }

  // Video
  if (mimeType.startsWith('video/') || ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
    return {
      icon: <FileVideo className="h-6 w-6 text-rose-500" />,
      color: 'bg-rose-50 text-rose-700',
      badge: 'VIDEO',
    };
  }

  // Audio
  if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) {
    return {
      icon: <FileAudio className="h-6 w-6 text-amber-500" />,
      color: 'bg-amber-50 text-amber-700',
      badge: 'AUDIO',
    };
  }

  // Spreadsheets
  if (
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    ['xls', 'xlsx', 'csv'].includes(ext)
  ) {
    return {
      icon: <FileSpreadsheet className="h-6 w-6 text-emerald-500" />,
      color: 'bg-emerald-50 text-emerald-700',
      badge: 'SHEET',
    };
  }

  // Documents
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    ['doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)
  ) {
    return {
      icon: <FileText className="h-6 w-6 text-blue-500" />,
      color: 'bg-blue-50 text-blue-700',
      badge: 'DOC',
    };
  }

  // Archives / ZIP
  if (
    mimeType.includes('zip') ||
    mimeType.includes('tar') ||
    mimeType.includes('compressed') ||
    ['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)
  ) {
    return {
      icon: <FileArchive className="h-6 w-6 text-yellow-500" />,
      color: 'bg-yellow-50 text-yellow-700',
      badge: 'ZIP',
    };
  }

  // Code
  if (
    ['js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'sql'].includes(ext)
  ) {
    return {
      icon: <FileCode className="h-6 w-6 text-indigo-500" />,
      color: 'bg-indigo-50 text-indigo-700',
      badge: 'CODE',
    };
  }

  // Default Generic File
  return {
    icon: <GenericFile className="h-6 w-6 text-gray-400" />,
    color: 'bg-gray-50 text-gray-700',
    badge: ext.toUpperCase() || 'FILE',
  };
}
