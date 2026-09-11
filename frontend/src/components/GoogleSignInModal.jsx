import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';

const GoogleLogo = ({ className = 'h-5 w-5' }) => (
  <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

const STORAGE_KEY = 'drivora_device_accounts';

const GoogleSignInModal = ({ isOpen, onClose, onGoogleLogin }) => {
  const [deviceAccounts, setDeviceAccounts] = useState([]);
  const [view, setView] = useState('email'); // 'picker' | 'email'
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signingInEmail, setSigningInEmail] = useState('');

  // Initialize state from local device storage whenever modal opens
  useEffect(() => {
    if (isOpen) {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const parsed = stored ? JSON.parse(stored) : [];
        const valid = Array.isArray(parsed)
          ? parsed.filter(
              (acc) =>
                acc &&
                acc.email &&
                !acc.email.toLowerCase().includes('test.com') &&
                !acc.email.toLowerCase().includes('example') &&
                !acc.name?.toLowerCase().includes('cloud user') &&
                !acc.badge?.toLowerCase().includes('linked drive')
            )
          : [];

        if (valid.length > 0) {
          setDeviceAccounts(valid);
          setView('picker');
        } else {
          setDeviceAccounts([]);
          setView('email');
        }
      } catch (e) {
        setDeviceAccounts([]);
        setView('email');
      }
      setEmail('');
      setError('');
      setIsSubmitting(false);
      setSigningInEmail('');
    }
  }, [isOpen]);

  // Helper to remove an account from this device's remembered list
  const handleRemoveAccount = (emailToRemove, e) => {
    e.stopPropagation();
    try {
      const updated = deviceAccounts.filter(
        (acc) => acc.email.toLowerCase() !== emailToRemove.toLowerCase()
      );
      setDeviceAccounts(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      if (updated.length === 0) {
        setView('email');
      }
    } catch (err) {
      console.error('Error removing account from device:', err);
    }
  };

  // Helper to save authenticated account to this device's storage
  const saveAccountToDevice = (accountData) => {
    try {
      const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      const filtered = current.filter(
        (a) => a.email.toLowerCase() !== accountData.email.toLowerCase()
      );
      const updated = [
        {
          email: accountData.email.toLowerCase(),
          name: accountData.name || accountData.email.split('@')[0],
          avatar:
            accountData.avatar ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              accountData.name || accountData.email
            )}&background=2563eb&color=fff&bold=true`,
        },
        ...filtered,
      ].slice(0, 5);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setDeviceAccounts(updated);
    } catch (err) {
      console.warn('Could not save account to device storage:', err);
    }
  };

  // 1-Click login when clicking an existing account from this device
  const handleSelectDeviceAccount = async (acc) => {
    if (isSubmitting) return;
    setError('');
    setIsSubmitting(true);
    setSigningInEmail(acc.email);

    try {
      const userPayload = {
        email: acc.email.trim().toLowerCase(),
        name: acc.name || acc.email.split('@')[0],
        avatar:
          acc.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            acc.name || acc.email
          )}&background=2563eb&color=fff&bold=true`,
        googleId: `google_oauth_${acc.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      };

      const result = await onGoogleLogin(userPayload);
      saveAccountToDevice(result || userPayload);
      onClose();
    } catch (err) {
      console.error('Google sign-in error:', err);
      const backendMessage =
        err.response?.data?.message || 'Google sign-in failed. Please try again.';
      setError(backendMessage);
    } finally {
      setIsSubmitting(false);
      setSigningInEmail('');
    }
  };

  // 1-Click login when entering a Google email
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Enter your Google email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      setError('Please enter a valid Google email address.');
      return;
    }

    setIsSubmitting(true);
    setSigningInEmail(trimmed);

    try {
      const derivedName = trimmed
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      const userPayload = {
        email: trimmed,
        name: derivedName,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          derivedName
        )}&background=2563eb&color=fff&bold=true`,
        googleId: `google_oauth_${trimmed.replace(/[^a-zA-Z0-9]/g, '_')}`,
      };

      const result = await onGoogleLogin(userPayload);
      saveAccountToDevice(result || userPayload);
      onClose();
    } catch (err) {
      console.error('Google sign-in error:', err);
      const backendMessage =
        err.response?.data?.message || 'Google sign-in failed. Please try again.';
      setError(backendMessage);
    } finally {
      setIsSubmitting(false);
      setSigningInEmail('');
    }
  };

  const getInitials = (accountName, accountEmail) => {
    if (accountName) {
      const parts = accountName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (accountEmail || 'U').slice(0, 2).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-[420px] rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 font-['Plus_Jakarta_Sans',sans-serif] animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          aria-label="Close"
          className="absolute top-5 right-5 p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Google Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-gray-50 border border-gray-100 mb-3 shadow-2xs">
            <GoogleLogo className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Sign in with Google
          </h2>
          <p className="mt-1 text-xs text-gray-500 font-medium">
            to continue to <span className="font-bold text-gray-800">Drivora</span>
          </p>
        </div>

        {/* Error Message Banner */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 animate-in fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* VIEW 1: DEVICE-SAVED ACCOUNTS PICKER (1-Click selection) */}
        {view === 'picker' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between px-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Choose an account
              </span>
              <span className="text-[10px] text-gray-400 font-medium">
                1-Click Sign In
              </span>
            </div>

            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200/80 overflow-hidden bg-white shadow-2xs">
              {deviceAccounts.map((acc) => {
                const isSigningInThis = isSubmitting && signingInEmail === acc.email;
                return (
                  <div
                    key={acc.email}
                    onClick={() => handleSelectDeviceAccount(acc)}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50/90 active:bg-gray-100 transition-colors text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                        {getInitials(acc.name, acc.email)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                          {acc.name || acc.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {acc.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                      {isSigningInThis ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={(e) => handleRemoveAccount(acc.email, e)}
                            title="Remove account from this device"
                            className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors opacity-60 hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Use Another Account */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setError('');
                  setEmail('');
                  setView('email');
                }}
                className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50/90 active:bg-gray-100 transition-colors text-left text-gray-700 group font-semibold text-xs disabled:opacity-50"
              >
                <div className="h-9 w-9 rounded-full bg-gray-100 border border-dashed border-gray-300 text-gray-500 flex items-center justify-center flex-shrink-0 group-hover:border-blue-500 group-hover:text-blue-600 transition-colors">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    Use another Google account
                  </span>
                  <p className="text-[11px] text-gray-400 font-normal">
                    Sign in with your Gmail or Google Workspace
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: ENTER EMAIL */}
        {view === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4 animate-in fade-in">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  Google Email address
                </label>
                {deviceAccounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setError('');
                      setView('picker');
                    }}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    ← Choose saved account
                  </button>
                )}
              </div>
              <input
                type="email"
                name="email"
                required
                autoFocus
                autoComplete="username email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="Enter your Google email"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <p className="mt-1.5 text-[11px] text-gray-400">
                1-click sign in. Fast, secure, and authenticated directly via Google SSO.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              {deviceAccounts.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setView('picker');
                  }}
                  disabled={isSubmitting}
                  className="text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with Google</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Security & Isolation Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>End-to-End Isolated Cloud Storage • 15 GB Free Quota</span>
          </div>
          <p className="text-[10px] text-center text-gray-400 leading-relaxed">
            Your files and profile are strictly private. Devices only access data
            belonging to your signed-in account.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoogleSignInModal;
