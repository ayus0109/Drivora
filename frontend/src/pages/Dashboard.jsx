import React, { useState, useEffect, useRef } from 'react';
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

import {
  HardDrive,
  FolderPlus,
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
} from 'lucide-react';

const FIFTEEN_GB = 16106127360; // 15 GB (Google Drive standard)

const Dashboard = () => {
  const { user, logout, refreshUser, updateUserStorage } = useAuth();

  // Navigation State
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

  // Mobile States
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isFabOpen, setIsFabOpen] = useState(false);

  // Modal States
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null); // { item, isFolder }
  const [deleteTarget, setDeleteTarget] = useState(null); // { item, isFolder }
  const [shareTarget, setShareTarget] = useState(null); // file to share
  const [previewTarget, setPreviewTarget] = useState(null); // { file, initialTab }
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);
  const [isActivityOpen, setIsActivityOpen] = useState(false);
  const [isVivaOpen, setIsVivaOpen] = useState(false);

  // Upload status tracking
  const [uploadStatus, setUploadStatus] = useState({
    isUploading: false,
    progress: 0,
    fileName: null,
    message: null,
    isError: false,
  });

  const uploadInputRef = useRef(null);

  // Fetch items whenever folder, sort, or search changes
  useEffect(() => {
    fetchData();
  }, [currentFolderId, sortBy, sortOrder, searchQuery]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const folderParam = currentFolderId || 'root';
      const folderRes = await api.get('/folders', {
        params: {
          parent: folderParam,
          search: searchQuery || undefined,
        },
      });

      const fileRes = await api.get('/files', {
        params: {
          folder: folderParam,
          search: searchQuery || undefined,
          sort: sortBy,
          order: sortOrder,
        },
      });

      setFolders(folderRes.data.folders || []);
      setFiles(fileRes.data.files || []);

      // Client-side fail-safe storage reconciliation (Google Drive standard):
      // If currently loaded files exceed the user state's usedStorageBytes, update in 0ms!
      const loadedBytes = (fileRes.data.files || []).reduce((sum, f) => sum + (f.sizeBytes || 0), 0);
      if (loadedBytes > (user?.usedStorageBytes || 0)) {
        updateUserStorage(loadedBytes, user?.quotaBytes || FIFTEEN_GB);
      }
      refreshUser();

      if (currentFolderId) {
        const pathRes = await api.get(`/folders/${currentFolderId}/path`);
        setBreadcrumbs([
          { _id: null, name: 'My Drive' },
          ...(pathRes.data.path || []),
        ]);
      } else {
        setBreadcrumbs([{ _id: null, name: 'My Drive' }]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Folder navigation
  const handleNavigate = (folderId) => {
    setCurrentFolderId(folderId);
    setSearchQuery('');
  };

  // File Upload
  const handleFileUpload = async (file) => {
    const totalGB = ((user?.quotaBytes || FIFTEEN_GB) / (1024 * 1024 * 1024)).toFixed(0);
    const availableBytes = (user?.quotaBytes || FIFTEEN_GB) - (user?.usedStorageBytes || 0);

    if (file.size > availableBytes) {
      setUploadStatus({
        isUploading: false,
        progress: 0,
        fileName: file.name,
        message: `Upload rejected: "${file.name}" (${formatBytes(file.size)}) exceeds your remaining storage quota (${formatBytes(availableBytes)}).`,
        isError: true,
      });
      return;
    }

    try {
      setUploadStatus({
        isUploading: true,
        progress: 0,
        fileName: file.name,
        message: 'Encrypting and uploading securely...',
        isError: false,
      });

      const formData = new FormData();
      formData.append('file', file);
      if (currentFolderId) {
        formData.append('folderId', currentFolderId);
      }

      const uploadRes = await api.post('/files/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadStatus((prev) => ({
              ...prev,
              progress: percentCompleted,
            }));
          }
        },
      });

      // MILLISECOND INSTANT STORAGE UPDATE (Zero wait time)
      if (uploadRes.data?.storage) {
        updateUserStorage(
          uploadRes.data.storage.usedStorageBytes,
          uploadRes.data.storage.quotaBytes
        );
      } else {
        updateUserStorage(
          (user?.usedStorageBytes || 0) + file.size,
          user?.quotaBytes || FIFTEEN_GB
        );
      }

      const savedName = uploadRes.data?.file?.name || file.name;
      setUploadStatus({
        isUploading: false,
        progress: 100,
        fileName: savedName,
        message: `"${savedName}" uploaded successfully!`,
        isError: false,
      });

      fetchData();
      refreshUser();

      setTimeout(() => {
        setUploadStatus((prev) => ({ ...prev, message: null }));
      }, 4000);
    } catch (err) {
      console.error('Upload error:', err);
      const errorMsg =
        err.response?.data?.message || 'Failed to upload file. Please try again.';

      setUploadStatus({
        isUploading: false,
        progress: 0,
        fileName: file.name,
        message: errorMsg,
        isError: true,
      });

      setTimeout(() => {
        setUploadStatus((prev) => ({ ...prev, message: null }));
      }, 5000);
    }
  };

  // Create Folder
  const handleCreateFolder = async (name) => {
    await api.post('/folders', {
      name,
      parentId: currentFolderId || 'root',
    });
    fetchData();
  };

  // Rename File or Folder
  const handleRename = async (item, newName) => {
    if (item.isFolder) {
      await api.patch(`/folders/${item._id}`, { name: newName });
    } else {
      await api.patch(`/files/${item._id}`, { name: newName });
    }
    fetchData();
  };

  // Delete File or Folder with millisecond quota update
  const handleDelete = async (item) => {
    try {
      if (item.isFolder) {
        const res = await api.delete(`/folders/${item._id}`);
        if (res.data?.storage) {
          updateUserStorage(
            res.data.storage.usedStorageBytes,
            res.data.storage.quotaBytes
          );
        }
      } else {
        const res = await api.delete(`/files/${item._id}`);
        if (res.data?.storage) {
          updateUserStorage(
            res.data.storage.usedStorageBytes,
            res.data.storage.quotaBytes
          );
        }
      }
      fetchData();
      refreshUser();
    } catch (err) {
      console.error('Delete error:', err);
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
      alert('Failed to download file.');
    }
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
    <div className="flex h-screen w-screen overflow-hidden bg-[#f8fafc] text-gray-900 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Hidden file input for "+ New" button */}
      <input
        ref={uploadInputRef}
        type="file"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFileUpload(e.target.files[0]);
            e.target.value = '';
          }
        }}
        className="hidden"
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

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => handleNavigate(null)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                currentFolderId === null
                  ? 'bg-blue-50 text-blue-700 shadow-2xs'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <HardDrive className="h-5 w-5 text-blue-600" />
                <span>My Drive</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100/70 text-blue-700 font-semibold">
                {files.length}
              </span>
            </button>
          </nav>
        </div>

        {/* Storage Bar & User Quota */}
        <div className="pt-4 border-t border-gray-100">
          <StorageBar
            usedBytes={user?.usedStorageBytes || 0}
            usedStorageBytes={user?.usedStorageBytes || 0}
            quotaBytes={user?.quotaBytes || 16106127360}
          />
        </div>
      </aside>

      {/* MOBILE DRAWER MODAL */}
      {isMobileDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Drawer Body */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full p-5 flex flex-col justify-between shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            <div>
              {/* Drawer Brand */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
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
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* User Pill */}
              <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 mb-4 flex items-center gap-2.5">
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
              <div className="space-y-2 mb-5">
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    uploadInputRef.current?.click();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-600/20"
                >
                  <Plus className="h-4 w-4 stroke-[2.5]" />
                  <span>Upload File</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsCreateFolderOpen(true);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white active:scale-95 text-gray-700 font-bold text-sm shadow-2xs"
                >
                  <FolderPlus className="h-4.5 w-4.5 text-gray-500" />
                  <span>New Folder</span>
                </button>
              </div>

              {/* Navigation Items in Drawer */}
              <nav className="space-y-1.5">
                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    handleNavigate(null);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-bold transition-all ${
                    currentFolderId === null
                      ? 'bg-blue-50 text-blue-700 shadow-2xs border border-blue-100/80'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <HardDrive className="h-5 w-5 text-blue-600" />
                    <span>My Drive</span>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">
                    {files.length} {files.length === 1 ? 'file' : 'files'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsVivaOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold text-purple-700 hover:bg-purple-50 transition-colors"
                >
                  <Layers className="h-5 w-5 text-purple-600" />
                  <span>Architecture & Viva Guide</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsSecurityOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  <ShieldCheck className="h-5 w-5 text-blue-600" />
                  <span>Privacy & Security</span>
                </button>

                <button
                  onClick={() => {
                    setIsMobileDrawerOpen(false);
                    setIsActivityOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <History className="h-5 w-5 text-gray-500" />
                  <span>Activity Trail</span>
                </button>
              </nav>
            </div>

            {/* Bottom Storage Bar & Sign Out */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <StorageBar
                usedBytes={user?.usedStorageBytes || 0}
                usedStorageBytes={user?.usedStorageBytes || 0}
                quotaBytes={user?.quotaBytes || 16106127360}
              />

              <button
                onClick={() => {
                  setIsMobileDrawerOpen(false);
                  logout();
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-xs font-bold hover:bg-red-100 transition-colors"
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
          {/* Mobile Hamburger + Brand / Desktop Logo */}
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

          {/* Search Bar - Responsive Desktop & Mobile */}
          <div className={`relative flex-1 max-w-xl ${isMobileSearchOpen ? 'flex' : 'hidden md:block'}`}>
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search files and folders..."
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
            {/* Mobile Search Toggle Icon */}
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="md:hidden p-2 rounded-xl text-gray-600 hover:bg-gray-100 touch-active"
              title="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Architecture & Viva Guide Button */}
            <button
              onClick={() => setIsVivaOpen(true)}
              title="Academic Architecture & Technical Viva Defense Guide"
              className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 rounded-xl border border-purple-200 bg-purple-50 text-xs font-bold text-purple-700 hover:bg-purple-100 touch-active transition-colors shadow-2xs"
            >
              <Layers className="h-4 w-4 text-purple-600" />
              <span className="hidden md:inline">Architecture & Viva</span>
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

        {/* SUB-HEADER TIER 1: LOCATION BAR & CONTROLS (Google Drive Standard) */}
        <div className="px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-gray-100 bg-white flex items-center justify-between gap-3 flex-shrink-0 shadow-2xs">
          {/* Breadcrumb / Location Path with Prominent "My Drive" */}
          <div className="flex-1 min-w-0">
            <Breadcrumbs path={breadcrumbs} onNavigate={handleNavigate} />
          </div>

          {/* View Toggle & Sort Controls */}
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
        <div className="px-3.5 sm:px-6 py-2 border-b border-gray-200/60 bg-[#fbfcfd] flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
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

        {/* MAIN BROWSER CONTENT */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 pb-32">
          {/* Drag & Drop Upload Zone */}
          <div className="mb-5 sm:mb-6">
            <UploadDropzone
              onUpload={handleFileUpload}
              uploadStatus={uploadStatus}
            />
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center text-gray-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-sm font-medium">Loading items...</span>
            </div>
          ) : folders.length === 0 && files.length === 0 ? (
            <EmptyState
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
                        onOpen={handleNavigate}
                        onRename={(folder) =>
                          setRenameTarget({ item: folder, isFolder: true })
                        }
                        onDelete={(folder) =>
                          setDeleteTarget({ item: folder, isFolder: true })
                        }
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
                      No files matching the "{fileTypeFilter}" filter in this folder.
                    </div>
                  ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {filteredFiles.map((file) => (
                        <FileCard
                          key={file._id}
                          file={file}
                          onDownload={handleDownload}
                          onShare={(f) => setShareTarget(f)}
                          onPreview={(f, tab) =>
                            setPreviewTarget({ file: f, initialTab: tab || 'preview' })
                          }
                          onRename={(f) =>
                            setRenameTarget({ item: f, isFolder: false })
                          }
                          onDelete={(f) =>
                            setDeleteTarget({ item: f, isFolder: false })
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-gray-200 bg-white shadow-xs overflow-visible min-h-[160px]">
                      {/* List Header */}
                      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider rounded-t-2xl">
                        <span className="flex-[2]">Name</span>
                        <span className="hidden sm:block flex-1">Last modified</span>
                        <span className="hidden md:block flex-1">File size</span>
                        <span className="w-24 text-right">Actions</span>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {filteredFiles.map((file) => (
                          <FileListRow
                            key={file._id}
                            file={file}
                            onDownload={handleDownload}
                            onShare={(f) => setShareTarget(f)}
                            onPreview={(f, tab) =>
                              setPreviewTarget({ file: f, initialTab: tab || 'preview' })
                            }
                            onRename={(f) =>
                              setRenameTarget({ item: f, isFolder: false })
                            }
                            onDelete={(f) =>
                              setDeleteTarget({ item: f, isFolder: false })
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* MOBILE FLOATING ACTION BUTTON (FAB) */}
      <div className="md:hidden fixed bottom-6 right-5 z-40">
        {isFabOpen && (
          <div className="flex flex-col gap-2.5 mb-3 animate-in fade-in slide-in-from-bottom-3 duration-150">
            <button
              onClick={() => {
                setIsFabOpen(false);
                setIsCreateFolderOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white text-gray-800 text-xs font-bold shadow-xl border border-gray-200 touch-active"
            >
              <FolderPlus className="h-4 w-4 text-amber-500" />
              <span>New Folder</span>
            </button>

            <button
              onClick={() => {
                setIsFabOpen(false);
                uploadInputRef.current?.click();
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-blue-600 text-white text-xs font-bold shadow-xl touch-active"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Upload File</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setIsFabOpen(!isFabOpen)}
          className="flex h-13 w-13 items-center justify-center rounded-full bg-blue-600 text-white shadow-xl shadow-blue-600/30 active:scale-95 transition-transform"
          aria-label="Create or upload"
        >
          <Plus
            className={`h-6 w-6 stroke-[2.5] transition-transform duration-200 ${
              isFabOpen ? 'rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* MODALS */}
      <CreateFolderModal
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        onCreate={handleCreateFolder}
      />

      <RenameModal
        isOpen={!!renameTarget}
        item={renameTarget?.item}
        onClose={() => setRenameTarget(null)}
        onRename={(item, newName) =>
          handleRename({ ...item, isFolder: renameTarget.isFolder }, newName)
        }
      />

      <DeleteModal
        isOpen={!!deleteTarget}
        item={deleteTarget?.item}
        isFolder={deleteTarget?.isFolder}
        onClose={() => setDeleteTarget(null)}
        onDelete={(item) =>
          handleDelete({ ...item, isFolder: deleteTarget.isFolder })
        }
      />

      <ShareModal
        isOpen={!!shareTarget}
        file={shareTarget}
        onClose={() => setShareTarget(null)}
      />

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

      <SecurityPrivacyModal
        isOpen={isSecurityOpen}
        onClose={() => setIsSecurityOpen(false)}
      />

      <ActivityDrawer
        isOpen={isActivityOpen}
        onClose={() => setIsActivityOpen(false)}
      />

      <TechnicalVivaModal
        isOpen={isVivaOpen}
        onClose={() => setIsVivaOpen(false)}
      />
    </div>
  );
};

export default Dashboard;
