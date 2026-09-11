import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { formatDate } from '../utils/formatBytes';
import {
  History,
  X,
  UploadCloud,
  FolderPlus,
  Share2,
  Trash2,
  Edit2,
  Loader2,
} from 'lucide-react';

const ActivityDrawer = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/activity');
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const getActionIcon = (action) => {
    switch (action) {
      case 'UPLOAD_FILE':
        return <UploadCloud className="h-4 w-4 text-blue-600" />;
      case 'CREATE_FOLDER':
        return <FolderPlus className="h-4 w-4 text-amber-500" />;
      case 'SHARE_FILE':
        return <Share2 className="h-4 w-4 text-purple-600" />;
      case 'REVOKE_SHARE':
        return <Trash2 className="h-4 w-4 text-orange-600" />;
      case 'DELETE_ITEM':
        return <Trash2 className="h-4 w-4 text-red-600" />;
      default:
        return <Edit2 className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col justify-between p-6 animate-in slide-in-from-right duration-200">
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
              <History className="h-5 w-5 text-blue-600" />
              <span>Activity Log</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="py-4 overflow-y-auto max-h-[calc(100vh-140px)]">
            {isLoading ? (
              <div className="flex h-40 items-center justify-center text-gray-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-xs">Loading activity...</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-xs">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div
                    key={log._id}
                    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs"
                  >
                    <div className="p-2 rounded-lg bg-white shadow-xs flex-shrink-0">
                      {getActionIcon(log.action)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">
                        {log.targetName}
                      </p>
                      {log.details && (
                        <p className="text-gray-500 text-[11px] truncate mt-0.5">
                          {log.details}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {formatDate(log.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 text-[11px] text-gray-400 text-center">
          Cryptographically audited activity trail
        </div>
      </div>
    </div>
  );
};

export default ActivityDrawer;
