import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ toasts = [], onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isInfo = toast.type === 'info';
        const isSuccess = !isError && !isInfo;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 duration-200 ${
              isError
                ? 'bg-red-50/95 border-red-200 text-red-900'
                : isInfo
                ? 'bg-blue-50/95 border-blue-200 text-blue-900'
                : 'bg-emerald-50/95 border-emerald-200 text-emerald-900'
            }`}
          >
            {isError ? (
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500 mt-0.5" />
            ) : isInfo ? (
              <Info className="h-5 w-5 flex-shrink-0 text-blue-500 mt-0.5" />
            ) : (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600 mt-0.5" />
            )}

            <div className="flex-1 text-xs sm:text-sm font-medium leading-snug">
              {toast.message}
            </div>

            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 transition-colors -mr-1 -mt-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Toast;
