import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatBytes } from '../utils/formatBytes';
import Breadcrumbs from '../components/Breadcrumbs';
import FolderCard from '../components/FolderCard';
import FileCard from '../components/FileCard';
import FileListRow from '../components/FileListRow';
import CreateFolderModal from '../components/CreateFolderModal';
import RenameModal from '../components/RenameModal';
import DeleteModal from '../components/DeleteModal';
import UploadDropzone from '../components/UploadDropzone';
import EmptyState from '../components/EmptyState';
import ShareModal from '../components/ShareModal';
import StorageBar from '../components/StorageBar';
import SecurityPrivacyModal from '../components/SecurityPrivacyModal';
import ActivityDrawer from '../components/ActivityDrawer';
import FilePreviewModal from '../components/FilePreviewModal';
import TechnicalVivaModal from '../components/TechnicalVivaModal';
import FileDetailsDrawer from '../components/FileDetailsDrawer';
import MoveModal from '../components/MoveModal';
import StorageBreakdownModal from '../components/StorageBreakdownModal';
import Toast from '../components/Toast';
import UploadManagerDrawer from '../components/UploadManagerDrawer';
import uploadQueue from '../utils/uploadQueue';
import { extractFilesFromDataTransfer, resolveFolderPath } from '../utils/fileTraversal';

import {
  HardDrive,
  FolderPlus,
  FolderUp,
  UploadCloud,
  LayoutGrid,
  List,
  Search,
  ArrowUpDown,
  LogOut,
  Plus,
  Loader2,
  Folder as FolderIcon,
  X,
  ShieldCheck,
  History,
  Layers,
  Menu,
  Star,
  Trash2,
  FolderInput,
  RotateCcw,
  CheckSquare,
  Square,
  Download,
  AlertTriangle,
  Check,
  Sparkles,
  HelpCircle,
  Image as ImageIcon,
} from 'lucide-react';

const FIFTEEN_GB = 16106127360; // 15 GB (Google Drive standard)

const Dashboard = () => {
  const { user, logout, refreshUser, updateUserStorage } = useAuth();

  // Primary Navigation View State: 'drive' | 'starred' | 'trash'
  const [activeTab, setActiveTab] = useState('drive');
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [breadcrumbs, setBreadcrumbs] = useState([{ _id: null, name: 'My Drive' }]);

  // Data State
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // View & Filter State
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt'); // 'name' | 'createdAt' | 'sizeBytes'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [fileTypeFilter, setFileTypeFilter] = useState('all'); // 'all' | 'documents' | 'images' | 'media'

  // Multi-Selection State
  const [selectedFileIds, setSelectedFileIds] = useState([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState([]);
  const [isZipping, setIsZipping] = useState(false);

  // Mobile States
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  // Modals & Drawers States
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null); // { item, isFolder }
  const [deleteTarget, setDeleteTarget] = useState(null); // { item, isFolder, isPermanent }
  const [shareTarget, setShareTarget] = useState(null); // file to share
  const [previewTarget, setPreviewTarget] = useState(null); // { file, initialTab }
  const [detailsFile, setDetailsFile] = useState(null); // file to inspect
  const [moveModalData, setMoveModalData] = useState({ isOpen: false, items: [] });
  const [isStorageBreakdownOpen, setIsStorageBreakdownOpen] = useState(false);
  const [isEmptyTrashConfirmOpen, setIsEmptyTrashConfirmOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isVivaOpen, setIsVivaOpen] = useState(false);
  const [visibleFileCount, setVisibleFileCount] = useState(100);

  const currentFolderIdRef = useRef(currentFolderId);
  currentFolderIdRef.current = currentFolderId;
  const breadcrumbsRef = useRef(breadcrumbs);
  breadcrumbsRef.current = breadcrumbs;

  // Toast System
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 4);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Upload status tracking (legacy fallback)
  const [uploadStatus, setUploadStatus] = useState({
    isUploading: false,
    progress: 0,
    fileName: null,
    message: null,
    isError: false,
  });

  const mobilePhotoInputRef = useRef(null);
  const uploadInputRef = useRef(null);
  const handleFileUploadRef = useRef(null);

  // Connect uploadQueue batch completion to dashboard refresh
  useEffect(() => {
    uploadQueue.setBatchCompleteCallback(() => {
      fetchData();
      refreshUser();
    });
  }, []);

  // Full-Window Drag and Drop for external files (Google Drive standard)
  const [isWindowDragOver, setIsWindowDragOver] = useState(false);
  const windowDragCounter = useRef(0);

  useEffect(() => {
    const handleDragEnter = (e) => {
      e.preventDefault();
      // Only activate for OS files, not for internal file-to-folder dragging
      if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        windowDragCounter.current += 1;
        setIsWindowDragOver(true);
      }
    };

    const handleDragLeave = (e) => {
      e.preventDefault();
      windowDragCounter.current -= 1;
      if (windowDragCounter.current <= 0) {
        windowDragCounter.current = 0;
        setIsWindowDragOver(false);
      }
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      if (e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e) => {
      e.preventDefault();
      windowDragCounter.current = 0;
      setIsWindowDragOver(false);

      try {
        const extracted = await extractFilesFromDataTransfer(e.dataTransfer);
        if (extracted && extracted.length > 0) {
          const payload = [];
          for (const item of extracted) {
            if (item.pathSegments && item.pathSegments.length > 0) {
              const fId = await resolveFolderPath(item.pathSegments, currentFolderIdRef.current);
              payload.push({
                file: item.file,
                folderId: fId,
                folderName: item.pathSegments[item.pathSegments.length - 1],
              });
            } else {
              payload.push({
                file: item.file,
                folderId: currentFolderIdRef.current,
                folderName: breadcrumbsRef.current[breadcrumbsRef.current.length - 1]?.name || 'My Drive',
              });
            }
          }
          uploadQueue.enqueue(payload);
        }
      } catch (err) {
        console.error('Window drop error:', err);
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  // Handle moving a file onto a folder via internal drag & drop
  const handleMoveFileToFolder = async (fileId, fileName, targetFolder) => {
    try {
      await api.patch(`/files/${fileId}/move`, { targetFolderId: targetFolder._id });
      addToast(`Moved "${fileName}" into "${targetFolder.name}".`, 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to move file.', 'error');
    }
  };

  // Fetch items whenever folder, tab, sort, or search changes
  useEffect(() => {
    clearSelection();
    fetchData();
  }, [currentFolderId, activeTab, sortBy, sortOrder, searchQuery]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      let folderParams = {};
      let fileParams = {
        search: searchQuery || undefined,
        sort: sortBy,
        order: sortOrder,
      };

      if (activeTab === 'trash') {
        folderParams = { trash: 'true', search: searchQuery || undefined };
        fileParams.trash = 'true';
        setBreadcrumbs([{ _id: null, name: 'Trash' }]);
      } else if (activeTab === 'starred') {
        folderParams = { starred: 'true', search: searchQuery || undefined };
        fileParams.starred = 'true';
        setBreadcrumbs([{ _id: null, name: 'Starred' }]);
      } else {
        const folderParam = currentFolderId || 'root';
        folderParams = {
          parent: folderParam,
          search: searchQuery || undefined,
        };
        fileParams.folder = folderParam;

        if (currentFolderId) {
          try {
            const pathRes = await api.get(`/folders/${currentFolderId}/path`);
            setBreadcrumbs([
              { _id: null, name: 'My Drive' },
              ...(pathRes.data.path || []),
            ]);
          } catch {
            setBreadcrumbs([{ _id: null, name: 'My Drive' }]);
          }
        } else {
          setBreadcrumbs([{ _id: null, name: 'My Drive' }]);
        }
      }

      const [folderRes, fileRes] = await Promise.all([
        api.get('/folders', { params: folderParams }),
        api.get('/files', { params: fileParams }),
      ]);

      setFolders(folderRes.data.folders || []);
      setFiles(fileRes.data.files || []);

      // Client-side storage reconciliation
      const loadedBytes = (fileRes.data.files || []).reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
      if (loadedBytes > (user?.usedStorageBytes || 0)) {
        updateUserStorage(loadedBytes, user?.quotaBytes || FIFTEEN_GB);
      }
      refreshUser();
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      addToast('Failed to load data. Please refresh.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch Tab
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setCurrentFolderId(null);
    setSearchQuery('');
    clearSelection();
  };

  // Folder navigation
  const handleNavigate = (folderId) => {
    if (activeTab !== 'drive') {
      setActiveTab('drive');
    }
    setCurrentFolderId(folderId);
    setSearchQuery('');
    clearSelection();
  };

  // Selection handlers
  const toggleSelectFile = (fileOrId) => {
    const id = typeof fileOrId === 'object' && fileOrId !== null ? fileOrId._id : fileOrId;
    if (!id) return;
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectFolder = (folderOrId) => {
    const id = typeof folderOrId === 'object' && folderOrId !== null ? folderOrId._id : folderOrId;
    if (!id) return;
    setSelectedFolderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedFileIds(filteredFiles.map((f) => f._id));
    setSelectedFolderIds(folders.map((f) => f._id));
  };

  const clearSelection = () => {
    setSelectedFileIds([]);
    setSelectedFolderIds([]);
  };

  const totalSelectedCount = selectedFileIds.length + selectedFolderIds.length;

  // File Upload - routes into enterprise concurrency queue
  const handleFileUpload = (file) => {
    uploadQueue.enqueue({
      file,
      folderId: currentFolderId,
      folderName: breadcrumbs[breadcrumbs.length - 1]?.name || 'My Drive',
    });
  };

  handleFileUploadRef.current = handleFileUpload;

  // Create Folder
  const handleCreateFolder = async (name) => {
    try {
      await api.post('/folders', {
        name,
        parentId: currentFolderId || 'root',
      });
      addToast(`Folder "${name}" created.`, 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create folder.', 'error');
    }
  };

  // Rename File or Folder
  const handleRename = async (item, newName) => {
    try {
      if (item.isFolder) {
        await api.patch(`/folders/${item._id}`, { name: newName });
      } else {
        await api.patch(`/files/${item._id}`, { name: newName });
      }
      addToast(`Renamed to "${newName}".`, 'success');
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to rename item.', 'error');
    }
  };

  // Single Item Star Toggle
  const handleToggleStarFile = async (fileOrId) => {
    const fileId = typeof fileOrId === 'object' && fileOrId !== null ? fileOrId._id : fileOrId;
    if (!fileId) return;
    try {
      const res = await api.patch(`/files/${fileId}/star`);
      addToast(res.data?.message || 'Starred updated.', 'info');
      // Update local state smoothly
      setFiles((prev) =>
        prev.map((f) => (f._id === fileId ? { ...f, isStarred: !f.isStarred } : f))
      );
      if (activeTab === 'starred') {
        fetchData();
      }
    } catch {
      addToast('Failed to toggle star.', 'error');
    }
  };

  const handleToggleStarFolder = async (folderOrId) => {
    const folderId = typeof folderOrId === 'object' && folderOrId !== null ? folderOrId._id : folderOrId;
    if (!folderId) return;
    try {
      const res = await api.patch(`/folders/${folderId}/star`);
      addToast(res.data?.message || 'Starred updated.', 'info');
      setFolders((prev) =>
        prev.map((f) => (f._id === folderId ? { ...f, isStarred: !f.isStarred } : f))
      );
      if (activeTab === 'starred') {
        fetchData();
      }
    } catch {
      addToast('Failed to toggle star.', 'error');
    }
  };

  // Soft Delete (Move to Trash)
  const handleMoveToTrash = async (item, isFolder) => {
    try {
      if (isFolder) {
        await api.patch(`/folders/${item._id}/trash`);
        addToast(`Folder "${item.name}" moved to Trash.`, 'info');
      } else {
        await api.patch(`/files/${item._id}/trash`);
        addToast(`"${item.name}" moved to Trash.`, 'info');
      }
      fetchData();
      refreshUser();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to move to Trash.', 'error');
    }
  };

  // Single Restore from Trash
  const handleRestoreItem = async (item, isFolder) => {
    try {
      if (isFolder) {
        await api.patch(`/folders/${item._id}/restore`);
        addToast(`Folder "${item.name}" restored.`, 'success');
      } else {
        await api.patch(`/files/${item._id}/restore`);
        addToast(`"${item.name}" restored.`, 'success');
      }
      fetchData();
      refreshUser();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to restore item.', 'error');
    }
  };

  // Permanent Delete Item
  const handlePermanentDelete = async (item, isFolder) => {
    try {
      if (isFolder) {
        const res = await api.delete(`/folders/${item._id}/permanent`);
        if (res.data?.storage) {
          updateUserStorage(
            res.data.storage.usedStorageBytes,
            res.data.storage.quotaBytes
          );
        }
        addToast(`Folder "${item.name}" permanently deleted.`, 'info');
      } else {
        const res = await api.delete(`/files/${item._id}/permanent`);
        if (res.data?.storage) {
          updateUserStorage(
            res.data.storage.usedStorageBytes,
            res.data.storage.quotaBytes
          );
        }
        addToast(`"${item.name}" permanently deleted.`, 'info');
      }
      fetchData();
      refreshUser();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete permanently.', 'error');
    }
  };

  // Empty Entire Trash
  const handleEmptyTrash = async () => {
    try {
      const res = await api.delete('/files/trash/empty');
      if (res.data?.storage) {
        updateUserStorage(
          res.data.storage.usedStorageBytes,
          res.data.storage.quotaBytes
        );
      }
      addToast(res.data?.message || 'Trash emptied permanently.', 'success');
      setIsEmptyTrashConfirmOpen(false);
      fetchData();
      refreshUser();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to empty Trash.', 'error');
    }
  };

  // Download File
  const handleDownload = async (file) => {
    try {
      const response = await api.get(`/files/${file._id}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      addToast('Failed to download file.', 'error');
    }
  };

  // Bulk ZIP Download using JSZip (Client-Side Google Drive Standard)
  const handleBulkDownloadZip = async () => {
    if (selectedFileIds.length === 0) {
      addToast('Select at least one file to download.', 'info');
      return;
    }

    const targetFiles = files.filter((f) => selectedFileIds.includes(f._id));
    if (targetFiles.length === 0) return;

    try {
      setIsZipping(true);
      addToast(`Bundling ${targetFiles.length} files into ZIP archive...`, 'info');

      const zip = new JSZip();

      for (const file of targetFiles) {
        try {
          const res = await api.get(`/files/${file._id}/download`, {
            responseType: 'blob',
          });
          zip.file(file.name, res.data);
        } catch (fileErr) {
          console.error(`Error archiving file ${file.name}:`, fileErr);
        }
      }

      const zipContent = await zip.generateAsync({ type: 'blob' });
      const url = window.URL.createObjectURL(zipContent);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Drivora_Archive_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      addToast(`Downloaded ${targetFiles.length} files as ZIP archive!`, 'success');
    } catch (zipErr) {
      console.error('ZIP generation error:', zipErr);
      addToast('Failed to generate ZIP archive.', 'error');
    } finally {
      setIsZipping(false);
    }
  };

  // Bulk Move to Trash (or Restore)
  const handleBulkTrash = async () => {
    try {
      if (selectedFileIds.length > 0) {
        await api.post('/files/bulk-trash', { fileIds: selectedFileIds });
      }
      for (const folderId of selectedFolderIds) {
        await api.patch(`/folders/${folderId}/trash`);
      }
      addToast(`Moved ${totalSelectedCount} items to Trash.`, 'info');
      clearSelection();
      fetchData();
      refreshUser();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to move items to Trash.', 'error');
    }
  };

  const handleBulkRestore = async () => {
    try {
      if (selectedFileIds.length > 0) {
        await api.post('/files/bulk-restore', { fileIds: selectedFileIds });
      }
      for (const folderId of selectedFolderIds) {
        await api.patch(`/folders/${folderId}/restore`);
      }
      addToast(`Restored ${totalSelectedCount} items.`, 'success');
      clearSelection();
      fetchData();
      refreshUser();
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to restore items.', 'error');
    }
  };

  // Bulk Star Toggle
  const handleBulkStar = async (shouldStar) => {
    try {
      if (selectedFileIds.length > 0) {
        await api.post('/files/bulk-star', {
          fileIds: selectedFileIds,
          isStarred: shouldStar,
        });
      }
      for (const folderId of selectedFolderIds) {
        const folderDoc = folders.find((f) => f._id === folderId);
        if (folderDoc && folderDoc.isStarred !== shouldStar) {
          await api.patch(`/folders/${folderId}/star`);
        }
      }
      addToast(
        shouldStar
          ? `Added ${totalSelectedCount} items to Starred.`
          : `Removed ${totalSelectedCount} items from Starred.`,
        'info'
      );
      clearSelection();
      fetchData();
    } catch (err) {
      addToast('Failed to update starred status.', 'error');
    }
  };

  // Open Move Modal (Single or Bulk)
  const handleOpenMoveSingle = (item, isFolder) => {
    setMoveModalData({
      isOpen: true,
      items: [
        {
          _id: item._id,
          name: item.name,
          isFolder,
          currentFolderId: isFolder ? item.parent : item.folder,
        },
      ],
    });
  };

  const handleOpenMoveBulk = () => {
    const items = [];
    selectedFolderIds.forEach((id) => {
      const f = folders.find((fol) => fol._id === id);
      if (f) items.push({ _id: f._id, name: f.name, isFolder: true, currentFolderId: f.parent });
    });
    selectedFileIds.forEach((id) => {
      const fil = files.find((fl) => fl._id === id);
      if (fil) items.push({ _id: fil._id, name: fil.name, isFolder: false, currentFolderId: fil.folder });
    });

    setMoveModalData({
      isOpen: true,
      items,
    });
  };

  // Filtered files based on fileTypeFilter
  const filteredFiles = files.filter((f) => {
    if (fileTypeFilter === 'all') return true;
    const mime = (f.mimeType || '').toLowerCase();
    const name = (f.name || '').toLowerCase();
    if (fileTypeFilter === 'documents') {
      return (
        mime.includes('pdf') ||
        mime.includes('word') ||
        mime.includes('text') ||
        mime.includes('document') ||
        mime.includes('presentation') ||
        mime.includes('sheet') ||
        name.match(/\.(pdf|doc|docx|txt|md|csv|xlsx|ppt|pptx)$/i)
      );
    }
    if (fileTypeFilter === 'images') {
      return (
        mime.startsWith('image/') ||
        name.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i)
      );
    }
    if (fileTypeFilter === 'media') {
      return (
        mime.startsWith('video/') ||
        mime.startsWith('audio/') ||
        name.match(/\.(mp4|webm|mkv|mp3|wav|ogg)$/i)
      );
    }
    return true;
  });

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-[#f8fafc] text-gray-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onDismiss={removeToast} />

      {/* 1. Accessible Photo & Video picker input (mobile native gallery/camera) */}
      <input
        ref={mobilePhotoInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={(e) => {
          try {
            const filesList = e.target.files;
            if (!filesList || filesList.length === 0) return;
            const selectedFiles = Array.from(filesList);
            addToast(`Received ${selectedFiles.length} item${selectedFiles.length > 1 ? 's' : ''}. Starting upload...`, 'info');
            const payload = selectedFiles.map((file) => ({
              file,
              folderId: currentFolderIdRef.current,
              folderName: breadcrumbsRef.current[breadcrumbsRef.current.length - 1]?.name || 'My Drive',
            }));
            uploadQueue.enqueue(payload);
          } catch (err) {
            console.error('Photo upload error:', err);
            addToast('Upload error: ' + err.message, 'error');
          }
        }}
        onClick={(e) => {
          e.currentTarget.value = null;
        }}
        className="fixed -top-full -left-full opacity-0 w-1 h-1"
        aria-hidden="true"
        tabIndex="-1"
      />

      {/* 2. Accessible multi-file input (All formats) */}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        onChange={(e) => {
          try {
            const filesList = e.target.files;
            if (!filesList || filesList.length === 0) return;
            const selectedFiles = Array.from(filesList);
            addToast(`Received ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}. Starting upload...`, 'info');
            const payload = selectedFiles.map((file) => ({
              file,
              folderId: currentFolderIdRef.current,
              folderName: breadcrumbsRef.current[breadcrumbsRef.current.length - 1]?.name || 'My Drive',
            }));
            uploadQueue.enqueue(payload);
          } catch (err) {
            console.error('File upload error:', err);
            addToast('Upload error: ' + err.message, 'error');
          }
        }}
        onClick={(e) => {
          e.currentTarget.value = null;
        }}
        className="fixed -top-full -left-full opacity-0 w-1 h-1"
        aria-hidden="true"
        tabIndex="-1"
      />

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-gray-200 bg-white flex-col justify-between p-4 select-none">
        <div>
          {/* App Logo */}
          <div className="flex items-center gap-3 px-2 py-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 tracking-tight leading-none">
                Drivora
              </h1>
              <span className="text-[10px] text-blue-600 font-semibold tracking-wide">
                15 GB Encrypted Cloud
              </span>
            </div>
          </div>

          {/* Action Buttons: New File & New Folder */}
          <div className="space-y-2 mb-6">
            <button
              onClick={() => uploadInputRef.current?.click()}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all"
            >
              <Plus className="h-5 w-5 stroke-[2.5]" />
              <span>Upload File</span>
            </button>

            <button
              onClick={() => setIsCreateFolderOpen(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] text-gray-700 font-semibold text-xs shadow-2xs transition-all"
            >
              <FolderPlus className="h-4 w-4 text-gray-500" />
              <span>New Folder</span>
            </button>
          </div>

          {/* Main Navigation Links */}
          <nav className="space-y-1.5">
            {/* My Drive */}
            <button
              onClick={() => handleTabChange('drive')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'drive'
                  ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-100/80'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <HardDrive className={`h-5 w-5 ${activeTab === 'drive' ? 'text-blue-600' : 'text-gray-500'}`} />
                <span>My Drive</span>
              </div>
              {activeTab === 'drive' && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-700 font-semibold">
                  {files.length}
                </span>
              )}
            </button>

            {/* Starred */}
            <button
              onClick={() => handleTabChange('starred')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'starred'
                  ? 'bg-amber-50 text-amber-800 shadow-2xs border border-amber-100/80'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Star
                  className={`h-5 w-5 ${
                    activeTab === 'starred'
                      ? 'text-amber-500 fill-amber-400'
                      : 'text-gray-400'
                  }`}
                />
                <span>Starred</span>
              </div>
            </button>

            {/* Trash */}
            <button
              onClick={() => handleTabChange('trash')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                activeTab === 'trash'
                  ? 'bg-red-50 text-red-700 shadow-2xs border border-red-100/80'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Trash2
                  className={`h-5 w-5 ${
                    activeTab === 'trash' ? 'text-red-600' : 'text-gray-400'
                  }`}
                />
                <span>Trash</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Storage Bar & User Quota (Clickable to open Storage Breakdown Modal) */}
        <div className="pt-4 border-t border-gray-100">
          <StorageBar
            usedBytes={user?.usedStorageBytes || 0}
            usedStorageBytes={user?.usedStorageBytes || 0}
            quotaBytes={user?.quotaBytes || FIFTEEN_GB}
            onClick={() => setIsStorageBreakdownOpen(true)}
          />
        </div>
      </aside>

      {/* MOBILE DRAWER MODAL */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          <div className="relative w-80 max-w-[86vw] bg-white h-[100dvh] max-h-[100dvh] flex flex-col shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {/* Fixed Drawer Header with iOS Safe Area Top */}
            <div className="shrink-0 px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-3.5 border-b border-gray-100 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                  <HardDrive className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-900 tracking-tight leading-none">
                    Drivora
                  </h2>
                  <span className="text-[10px] text-blue-600 font-semibold">
                    15 GB Encrypted Cloud
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Center: User info, Action buttons, Nav links */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 space-y-4">
              {/* User Pill */}
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 flex items-center gap-2.5">
                {user?.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name || user.email}
                    className="h-8 w-8 rounded-full border border-gray-200 object-cover shadow-2xs"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                    {(user?.name || user?.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Logged In As
                  </span>
                  <p className="text-xs font-bold text-gray-900 truncate mt-0.5">
                    {user?.name || user?.email}
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold">
                    {user?.authProvider === 'google' ? 'Google SSO' : '● 256-bit Encrypted'}
                  </span>
                </div>
              </div>

              {/* Action Buttons in Drawer */}
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setTimeout(() => mobilePhotoInputRef.current?.click(), 80);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <ImageIcon className="h-4 w-4 stroke-[2.4]" />
                  <span>Upload Photos & Videos</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setTimeout(() => uploadInputRef.current?.click(), 80);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-95 text-gray-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4 text-gray-500 stroke-[2.5]" />
                  <span>Upload Any File</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsCreateFolderOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 active:scale-95 text-gray-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
                >
                  <FolderPlus className="h-4 w-4 text-gray-500" />
                  <span>New Folder</span>
                </button>
              </div>

              {/* Navigation Items in Drawer */}
              <nav className="space-y-1">
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    handleTabChange('drive');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'drive'
                      ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-100/80'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-5 w-5 text-blue-600" />
                    <span>My Drive</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    handleTabChange('starred');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'starred'
                      ? 'bg-amber-50 text-amber-800 shadow-2xs border border-amber-100/80'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Star
                      className={`h-5 w-5 ${
                        activeTab === 'starred'
                          ? 'text-amber-500 fill-amber-400'
                          : 'text-gray-400'
                      }`}
                    />
                    <span>Starred</span>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    handleTabChange('trash');
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'trash'
                      ? 'bg-red-50 text-red-700 shadow-2xs border border-red-100/80'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="h-5 w-5 text-red-600" />
                    <span>Trash</span>
                  </div>
                </button>

                <div className="my-2 border-t border-gray-100" />

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsVivaOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                  <span>FAQ & Help</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsSecurityOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <span>Privacy & Security</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsActivityOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <History className="h-5 w-5 text-gray-500" />
                  <span>Activity Trail</span>
                </button>
              </nav>
            </div>

            {/* Fixed Sticky Footer with StorageBar & Sign Out + iOS Safe Area Bottom */}
            <div className="shrink-0 px-5 pt-3.5 pb-[max(1rem,calc(0.75rem+env(safe-area-inset-bottom)))] border-t border-gray-100 bg-white space-y-2.5 shadow-lg shadow-gray-200/50">
              <StorageBar
                usedBytes={user?.usedStorageBytes || 0}
                usedStorageBytes={user?.usedStorageBytes || 0}
                quotaBytes={user?.quotaBytes || FIFTEEN_GB}
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  setIsStorageBreakdownOpen(true);
                }}
              />

              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-red-200 bg-red-50 active:bg-red-100 text-red-700 text-xs font-bold transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP HEADER */}
        <header className="h-14 sm:h-16 border-b border-gray-200 bg-white px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 flex-shrink-0 shadow-2xs select-none">
          {/* Mobile Hamburger + Brand */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={() => setIsMobileDrawerOpen(true)}
              className="p-2 rounded-xl text-gray-600 hover:text-gray-900 hover:bg-gray-100 touch-active"
              aria-label="Open navigation drawer"
            >
              <Menu className="h-5 w-5" />
            </button>

            {!isMobileSearchOpen && (
              <div className="flex items-center gap-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white shadow-xs">
                  <HardDrive className="h-4 w-4" />
                </div>
                <span className="font-bold text-sm text-gray-900 tracking-tight">Drivora</span>
              </div>
            )}
          </div>

          {/* Search Bar */}
          <div className={`relative flex-1 max-w-xl ${isMobileSearchOpen ? 'flex' : 'hidden md:block'}`}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={`Search in ${activeTab === 'trash' ? 'Trash' : activeTab === 'starred' ? 'Starred' : 'Drive'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-1.5 sm:py-2 rounded-xl bg-gray-100 hover:bg-gray-100/90 focus:bg-white text-xs sm:text-sm placeholder-gray-400 border border-transparent focus:border-blue-500 focus:outline-none transition-all"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            ) : isMobileSearchOpen ? (
              <button
                onClick={() => setIsMobileSearchOpen(false)}
                className="md:hidden absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          {/* Header Controls */}
          <div className={`items-center gap-1.5 sm:gap-2.5 ${isMobileSearchOpen ? 'hidden md:flex' : 'flex'}`}>
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 touch-active"
              title="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* FAQ & System Guide Button */}
            <button
              onClick={() => setIsVivaOpen(true)}
              title="Frequently Asked Questions (FAQ) & System Guide"
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 text-xs font-bold text-blue-700 hover:bg-blue-100 touch-active transition-colors shadow-2xs"
            >
              <HelpCircle className="h-4 w-4 text-blue-600" />
              <span className="hidden md:inline">FAQ</span>
            </button>

            {/* Security & Privacy Trigger */}
            <button
              onClick={() => setIsSecurityOpen(true)}
              title="Security & Data Privacy Architecture"
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-blue-200 bg-blue-50 text-xs font-bold text-blue-700 hover:bg-blue-100 touch-active transition-colors shadow-2xs"
            >
              <ShieldCheck className="h-4 w-4 text-blue-600" />
              <span className="hidden md:inline">Security</span>
            </button>

            {/* Activity Log Trigger (Desktop) */}
            <button
              onClick={() => setIsActivityOpen(true)}
              title="Recent Activity Trail"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 touch-active transition-colors shadow-2xs"
            >
              <History className="h-4 w-4 text-gray-500" />
              <span className="hidden md:inline">Activity</span>
            </button>

            <div className="hidden lg:flex items-center gap-2.5 border-l border-gray-200 pl-3">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || user.email}
                  className="h-8 w-8 rounded-full border border-gray-200 object-cover shadow-2xs"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shadow-2xs">
                  {(user?.name || user?.email || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className="text-right">
                <span className="block text-xs font-bold text-gray-800 leading-tight">
                  {user?.name || user?.email}
                </span>
                <span className="block text-[10px] text-emerald-600 font-semibold">
                  {user?.authProvider === 'google' ? 'Google SSO • Encrypted' : '● 256-bit Encrypted'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign out"
              className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-gray-100 touch-active transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* SUB-HEADER TIER 1: LOCATION BAR & CONTROLS */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-gray-100 bg-white flex items-center justify-between gap-3 flex-shrink-0 shadow-2xs">
          <div className="flex-1 min-w-0">
            <Breadcrumbs
              path={breadcrumbs}
              onNavigate={(id) => {
                if (activeTab !== 'drive') {
                  handleTabChange('drive');
                } else {
                  handleNavigate(id);
                }
              }}
            />
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 bg-gray-100/90 hover:bg-gray-100 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm text-gray-700 font-bold shadow-2xs transition-colors">
              <ArrowUpDown className="h-4 w-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-transparent font-bold focus:outline-none cursor-pointer"
              >
                <option value="createdAt">Date</option>
                <option value="name">Name</option>
                <option value="sizeBytes">Size</option>
              </select>

              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="font-bold text-gray-600 hover:text-gray-900 px-1"
                title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>

            {/* Grid / List View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 shadow-2xs">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 sm:p-2 rounded-lg transition-all touch-active ${
                  viewMode === 'grid'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="h-4.5 w-4.5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 sm:p-2 rounded-lg transition-all touch-active ${
                  viewMode === 'list'
                    ? 'bg-white text-blue-600 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
                title="List view"
              >
                <List className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        </div>

        {/* SUB-HEADER TIER 2: QUICK CATEGORY FILTER PILLS BAR */}
        <div className="px-3.5 sm:px-6 py-2 border-b border-gray-200/60 bg-[#fbfcfd] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: `All (${files.length})` },
              { id: 'documents', label: 'Docs & PDFs' },
              { id: 'images', label: 'Images' },
              { id: 'media', label: 'Media' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFileTypeFilter(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all flex-shrink-0 touch-active shadow-2xs ${
                  fileTypeFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200/80'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Select-All / Clear for multi-select */}
          {(files.length > 0 || folders.length > 0) && (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={totalSelectedCount > 0 ? clearSelection : selectAll}
                className="text-xs font-bold text-gray-600 hover:text-blue-600 flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {totalSelectedCount > 0 ? (
                  <>
                    <X className="h-3.5 w-3.5" />
                    <span>Deselect All</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span>Select All</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* STICKY BULK ACTIONS BAR (Appears when items are selected) */}
        {totalSelectedCount > 0 && (
          <div className="bg-slate-900 text-white px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-lg border-b border-slate-800 animate-in slide-in-from-top-2 duration-150 z-30 flex-shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center h-6 px-2.5 rounded-full bg-blue-600 text-white text-xs font-bold">
                {totalSelectedCount} selected
              </span>
              <button
                onClick={clearSelection}
                className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-semibold"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {activeTab !== 'trash' ? (
                <>
                  {/* Download as ZIP */}
                  {selectedFileIds.length > 0 && (
                    <button
                      onClick={handleBulkDownloadZip}
                      disabled={isZipping}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
                      title="Download selected files as a ZIP archive"
                    >
                      {isZipping ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Download className="h-3.5 w-3.5" />
                      )}
                      <span>Download .zip ({selectedFileIds.length})</span>
                    </button>
                  )}

                  {/* Move to... */}
                  <button
                    onClick={handleOpenMoveBulk}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                    title="Move selected items to another folder"
                  >
                    <FolderInput className="h-3.5 w-3.5 text-slate-400" />
                    <span className="hidden sm:inline">Move</span>
                  </button>

                  {/* Star / Unstar */}
                  <button
                    onClick={() => handleBulkStar(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold transition-colors border border-slate-700"
                    title="Add selected to Starred"
                  >
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="hidden sm:inline">Star</span>
                  </button>

                  {/* Move to Trash */}
                  <button
                    onClick={handleBulkTrash}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-colors border border-red-500/30"
                    title="Move selected items to Trash"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Move to Trash</span>
                  </button>
                </>
              ) : (
                <>
                  {/* Restore Selected */}
                  <button
                    onClick={handleBulkRestore}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore ({totalSelectedCount})</span>
                  </button>

                  {/* Permanent Delete Selected */}
                  <button
                    onClick={() => {
                      setDeleteTarget({
                        item: { name: `${totalSelectedCount} selected item(s)` },
                        isBulk: true,
                        isPermanent: true,
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Forever</span>
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* MAIN BROWSER CONTENT */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-6 pb-[max(8rem,calc(6rem+env(safe-area-inset-bottom)))]">
          {/* TRASH NOTIFICATION BANNER */}
          {activeTab === 'trash' && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 text-amber-950 mb-6 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 flex-shrink-0">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold">
                    Items in trash are permanently deleted after 30 days.
                  </p>
                  <p className="text-[11px] text-amber-800">
                    Restoring an item returns it to its original folder location.
                  </p>
                </div>
              </div>

              {(files.length > 0 || folders.length > 0) && (
                <button
                  onClick={() => setIsEmptyTrashConfirmOpen(true)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-red-600/20 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Empty Trash</span>
                </button>
              )}
            </div>
          )}

          {/* STARRED HEADER BANNER */}
          {activeTab === 'starred' && (
            <div className="flex items-center gap-3 p-3.5 sm:p-4 rounded-2xl bg-amber-50/60 border border-amber-100 text-amber-900 mb-6 shadow-xs">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-600 flex-shrink-0">
                <Star className="h-5 w-5 fill-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-gray-900">Starred Items</h2>
                <p className="text-xs text-gray-600">
                  Quick access to files and folders you've starred across your drive.
                </p>
              </div>
            </div>
          )}

          {/* DROPZONE / UPLOAD PANEL (Only shown in 'drive' view) */}
          {activeTab === 'drive' && (
            <div className="mb-5 sm:mb-6">
              <UploadDropzone
                onUpload={handleFileUpload}
                uploadStatus={uploadStatus}
                onCreateFolder={() => setIsCreateFolderOpen(true)}
                currentFolderId={currentFolderId}
                currentFolderName={breadcrumbs[breadcrumbs.length - 1]?.name || 'My Drive'}
                onToast={addToast}
              />
            </div>
          )}

          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-gray-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-sm font-medium">Loading items...</span>
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <EmptyState
              type={activeTab}
              isSearch={!!searchQuery}
              onUploadClick={() => uploadInputRef.current?.click()}
              onCreateFolderClick={() => setIsCreateFolderOpen(true)}
            />
          ) : (
            <div className="space-y-6">
              {/* FOLDERS SECTION */}
              {folders.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    Folders ({folders.length})
                  </h3>

                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4'
                        : 'divide-y divide-gray-100 rounded-2xl border border-gray-200 bg-white shadow-xs overflow-visible'
                    }
                  >
                    {folders.map((f) => (
                      <FolderCard
                        key={f._id}
                        folder={f}
                        viewMode={viewMode}
                        isSelected={selectedFolderIds.includes(f._id)}
                        onToggleSelect={toggleSelectFolder}
                        onToggleStar={handleToggleStarFolder}
                        onOpen={handleNavigate}
                        onMove={(fol) => handleOpenMoveSingle(fol, true)}
                        onRename={(folder) =>
                          setRenameTarget({ item: folder, isFolder: true })
                        }
                        onDelete={(folder) => handleMoveToTrash(folder, true)}
                        isTrashView={activeTab === 'trash'}
                        onRestore={(folder) => handleRestoreItem(folder, true)}
                        onPermanentDelete={(folder) =>
                          setDeleteTarget({ item: folder, isFolder: true, isPermanent: true })
                        }
                        onDropFile={handleMoveFileToFolder}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* FILES SECTION */}
              {files.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                      Files ({filteredFiles.length} of {files.length})
                    </h3>
                  </div>

                  {filteredFiles.length === 0 ? (
                    <div className="text-center py-10 rounded-2xl border border-dashed border-gray-200 bg-white/50 text-xs text-gray-400">
                      No files matching the "{fileTypeFilter}" filter.
                    </div>
                  ) : viewMode === 'grid' ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                        {filteredFiles.slice(0, visibleFileCount).map((file) => (
                          <FileCard
                            key={file._id}
                            file={file}
                            isSelected={selectedFileIds.includes(file._id)}
                            onToggleSelect={toggleSelectFile}
                            onToggleStar={handleToggleStarFile}
                            onDownload={handleDownload}
                            onShare={(f) => setShareTarget(f)}
                            onMove={(f) => handleOpenMoveSingle(f, false)}
                            onOpenDetails={(f) => setDetailsFile(f)}
                            onPreview={(f, tab) =>
                              setPreviewTarget({ file: f, initialTab: tab || 'preview' })
                            }
                            onRename={(f) =>
                              setRenameTarget({ item: f, isFolder: false })
                            }
                            onDelete={(f) => handleMoveToTrash(f, false)}
                            isTrashView={activeTab === 'trash'}
                            onRestore={(f) => handleRestoreItem(f, false)}
                            onPermanentDelete={(f) =>
                              setDeleteTarget({ item: f, isFolder: false, isPermanent: true })
                            }
                          />
                        ))}
                      </div>

                      {filteredFiles.length > visibleFileCount && (
                        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
                          <span className="text-xs font-semibold text-gray-600">
                            Showing {Math.min(visibleFileCount, filteredFiles.length)} of {filteredFiles.length} files
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setVisibleFileCount((prev) => prev + 100)}
                              className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 shadow-2xs transition-all cursor-pointer"
                            >
                              Load Next 100 Files
                            </button>
                            <button
                              type="button"
                              onClick={() => setVisibleFileCount(filteredFiles.length)}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                            >
                              Show All ({filteredFiles.length})
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-visible min-h-[160px]">
                        {/* List Header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider rounded-t-2xl">
                          <span className="flex-[2]">Name</span>
                          <span className="hidden sm:block flex-1">Last modified</span>
                          <span className="hidden md:block flex-1">File size</span>
                          <span className="w-24 text-right">Actions</span>
                        </div>

                        <div className="divide-y divide-gray-100">
                          {filteredFiles.slice(0, visibleFileCount).map((file) => (
                            <FileListRow
                              key={file._id}
                              file={file}
                              isSelected={selectedFileIds.includes(file._id)}
                              onToggleSelect={toggleSelectFile}
                              onToggleStar={handleToggleStarFile}
                              onDownload={handleDownload}
                              onShare={(f) => setShareTarget(f)}
                              onMove={(f) => handleOpenMoveSingle(f, false)}
                              onOpenDetails={(f) => setDetailsFile(f)}
                              onPreview={(f, tab) =>
                                setPreviewTarget({ file: f, initialTab: tab || 'preview' })
                              }
                              onRename={(f) =>
                                setRenameTarget({ item: f, isFolder: false })
                              }
                              onDelete={(f) => handleMoveToTrash(f, false)}
                              isTrashView={activeTab === 'trash'}
                              onRestore={(f) => handleRestoreItem(f, false)}
                              onPermanentDelete={(f) =>
                                setDeleteTarget({ item: f, isFolder: false, isPermanent: true })
                              }
                            />
                          ))}
                        </div>
                      </div>

                      {filteredFiles.length > visibleFileCount && (
                        <div className="mt-5 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-gray-200 shadow-xs">
                          <span className="text-xs font-semibold text-gray-600">
                            Showing {Math.min(visibleFileCount, filteredFiles.length)} of {filteredFiles.length} files
                          </span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setVisibleFileCount((prev) => prev + 100)}
                              className="px-4 py-2 rounded-xl bg-gray-50 border border-gray-300 hover:bg-gray-100 text-xs font-bold text-gray-700 shadow-2xs transition-all cursor-pointer"
                            >
                              Load Next 100 Files
                            </button>
                            <button
                              type="button"
                              onClick={() => setVisibleFileCount(filteredFiles.length)}
                              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                            >
                              Show All ({filteredFiles.length})
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MODALS & DRAWERS */}
      {/* Create Folder Modal */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreate={handleCreateFolder}
      />

      {/* Rename Modal */}
      <RenameModal
        isOpen={!!renameTarget}
        item={renameTarget?.item}
        onClose={() => setRenameTarget(null)}
        onRename={(item, newName) =>
          handleRename({ ...item, isFolder: renameTarget.isFolder }, newName)
        }
      />

      {/* Delete / Permanent Delete Modal */}
      <DeleteModal
        isOpen={!!deleteTarget}
        item={deleteTarget?.item}
        isFolder={deleteTarget?.isFolder}
        isPermanent={deleteTarget?.isPermanent}
        onClose={() => setDeleteTarget(null)}
        onDelete={async (item) => {
          if (deleteTarget?.isBulk) {
            // Bulk permanent delete
            for (const fileId of selectedFileIds) {
              await api.delete(`/files/${fileId}/permanent`);
            }
            for (const folderId of selectedFolderIds) {
              await api.delete(`/folders/${folderId}/permanent`);
            }
            addToast('Selected items permanently deleted.', 'info');
            clearSelection();
            fetchData();
            refreshUser();
          } else if (deleteTarget?.isPermanent) {
            await handlePermanentDelete(item, deleteTarget.isFolder);
          } else {
            await handleMoveToTrash(item, deleteTarget.isFolder);
          }
        }}
      />

      {/* Empty Trash Confirmation Modal */}
      {isEmptyTrashConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Empty Trash?</h3>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              All items in the trash will be permanently deleted from the cloud and storage. This action cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsEmptyTrashConfirmOpen(false)}
                className="px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleEmptyTrash}
                className="px-5 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 rounded-xl shadow-md shadow-red-600/20 transition-all flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Empty Trash Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={!!shareTarget}
        file={shareTarget}
        onClose={() => setShareTarget(null)}
      />

      {/* File Preview Modal */}
      <FilePreviewModal
        isOpen={!!previewTarget?.file}
        file={previewTarget?.file}
        initialTab={previewTarget?.initialTab || 'preview'}
        onClose={() => setPreviewTarget(null)}
        onDownload={handleDownload}
        onShare={(f) => {
          setPreviewTarget(null);
          setShareTarget(f);
        }}
      />

      {/* File Details Drawer (Right Sliding Inspector) */}
      <FileDetailsDrawer
        isOpen={!!detailsFile}
        file={detailsFile}
        onClose={() => setDetailsFile(null)}
        onDownload={handleDownload}
        onShare={(f) => {
          setDetailsFile(null);
          setShareTarget(f);
        }}
        onStar={(f) => handleToggleStarFile(f._id)}
        onMove={(f) => {
          setDetailsFile(null);
          handleOpenMoveSingle(f, false);
        }}
        onTrash={(f) => {
          setDetailsFile(null);
          handleMoveToTrash(f, false);
        }}
      />

      {/* Move to Folder Modal */}
      <MoveModal
        isOpen={moveModalData.isOpen}
        itemsToMove={moveModalData.items}
        onClose={() => setMoveModalData({ isOpen: false, items: [] })}
        onSuccess={() => {
          addToast('Items moved successfully!', 'success');
          clearSelection();
          fetchData();
        }}
      />

      {/* Storage Breakdown Modal */}
      <StorageBreakdownModal
        isOpen={isStorageBreakdownOpen}
        onClose={() => setIsStorageBreakdownOpen(false)}
        onEmptyTrash={() => {
          setIsStorageBreakdownOpen(false);
          handleEmptyTrash();
        }}
      />

      {/* Security & Privacy Modal */}
      <SecurityPrivacyModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />

      {/* Activity Drawer */}
      <ActivityDrawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />

      {/* Technical Viva Defense Guide Modal */}
      <TechnicalVivaModal
        isOpen={isVivaOpen}
        onClose={() => setIsVivaOpen(false)}
      />

      {/* GLOBAL FULL-WINDOW DRAG & DROP OVERLAY (Google Drive standard) */}
      {isWindowDragOver && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsWindowDragOver(false);
          }}
          onDrop={async (e) => {
            e.preventDefault();
            setIsWindowDragOver(false);
            try {
              const extracted = await extractFilesFromDataTransfer(e.dataTransfer);
              if (extracted && extracted.length > 0) {
                const payload = [];
                for (const item of extracted) {
                  if (item.pathSegments && item.pathSegments.length > 0) {
                    const fId = await resolveFolderPath(item.pathSegments, currentFolderIdRef.current);
                    payload.push({
                      file: item.file,
                      folderId: fId,
                      folderName: item.pathSegments[item.pathSegments.length - 1],
                    });
                  } else {
                    payload.push({
                      file: item.file,
                      folderId: currentFolderIdRef.current,
                      folderName: breadcrumbsRef.current[breadcrumbsRef.current.length - 1]?.name || 'My Drive',
                    });
                  }
                }
                uploadQueue.enqueue(payload);
              }
            } catch (err) {
              console.error('Overlay drop error:', err);
            }
          }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-blue-900/60 backdrop-blur-sm animate-in fade-in duration-150 p-6 pointer-events-auto"
        >
          <div className="flex flex-col items-center justify-center p-10 sm:p-14 rounded-3xl border-4 border-dashed border-white bg-blue-600 text-white shadow-2xl max-w-lg w-full text-center scale-100 animate-in zoom-in-95 duration-150">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/20 mb-5 shadow-lg shadow-blue-700/50">
              <UploadCloud className="h-10 w-10 text-white animate-bounce" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Drop files to upload
            </h2>
            <p className="mt-2 text-sm sm:text-base text-blue-100 font-medium">
              Releasing will queue and encrypt files into{' '}
              <span className="font-bold underline text-white">
                {breadcrumbs[breadcrumbs.length - 1]?.name || 'My Drive'}
              </span>
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-xs text-blue-200 font-semibold border border-white/20">
              <ShieldCheck className="h-4 w-4 text-emerald-300" />
              <span>AES-256-GCM (4-Worker Parallel Queue)</span>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Style Floating Upload Manager Drawer */}
      <UploadManagerDrawer />
    </div>
  );
};

export default Dashboard;
