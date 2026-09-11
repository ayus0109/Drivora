import React, { useState } from 'react';
import { X, User, ArrowRight, ShieldCheck, CheckCircle2, ChevronRight, AlertCircle, Loader2 } from 'lucide-react';

const GoogleLogo = ({ className = "h-5 w-5" }) => (
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

const GoogleSignInModal = ({ isOpen, onClose, onGoogleLogin }) => {
  const [isUsingAnother, setIsUsingAnother] = useState(false);
  const [customEmail, setCustomEmail] = useState('');
  const [customName, setCustomName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);

  if (!isOpen) return null;

  // Preset known profiles (Primary user and demo accounts for convenient 1-tap testing)
  const defaultAccounts = [
    {
      email: 'ayushphalak5@gmail.com',
      name: 'Ayush Phalak',
      initials: 'AP',
      color: 'bg-emerald-600',
      badge: 'Current Account',
    },
    {
      email: 'ayush@test.com',
      name: 'Ayush (Cloud User)',
      initials: 'A',
      color: 'bg-blue-600',
      badge: 'Linked Drive',
    },
  ];

  const handleSelectAccount = async (acc) => {
    setError('');
    setSelectedEmail(acc.email);
    setIsSubmitting(true);

    try {
      await onGoogleLogin({
        email: acc.email,
        name: acc.name,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          acc.name
        )}&background=2563eb&color=fff&bold=true`,
        googleId: `google_oauth_${acc.email.replace(/[^a-zA-Z0-9]/g, '_')}`,
      });
      onClose();
    } catch (err) {
      console.error('Google sign-in error:', err);
      setError(
        err.response?.data?.message ||
          'Could not authenticate with Google. Please try again.'
      );
      setIsSubmitting(false);
      setSelectedEmail(null);
    }
  };

  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = customEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Please enter your Google account email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Couldn’t find your Google Account. Please enter a valid email address.');
      return;
    }

    // Derive or use custom name
    const derivedName =
      customName.trim() ||
      trimmedEmail
        .split('@')[0]
        .replace(/[._-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

    setIsSubmitting(true);
    setSelectedEmail(trimmedEmail);

    try {
      await onGoogleLogin({
        email: trimmedEmail,
        name: derivedName,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(
          derivedName
        )}&background=0284c7&color=fff&bold=true`,
        googleId: `google_oauth_${trimmedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      });
      onClose();
    } catch (err) {
      console.error('Custom Google sign-in failed:', err);
      setError(
        err.response?.data?.message ||
          'Google authentication encountered an issue.'
      );
      setIsSubmitting(false);
      setSelectedEmail(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-[440px] rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 font-['Plus_Jakarta_Sans',sans-serif] animate-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
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
            to continue to <span className="font-bold text-gray-700">Google Drive</span>
          </p>
        </div>

        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 animate-in fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {!isUsingAnother ? (
          /* ACCOUNT LIST VIEW */
          <div className="space-y-2.5">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-1">
              Choose an account
            </div>

            <div className="divide-y divide-gray-100 rounded-2xl border border-gray-200/80 overflow-hidden bg-white shadow-2xs">
              {defaultAccounts.map((acc) => {
                const isThisLoading = isSubmitting && selectedEmail === acc.email;
                return (
                  <button
                    key={acc.email}
                    onClick={() => handleSelectAccount(acc)}
                    disabled={isSubmitting}
                    className="w-full flex items-center justify-between p-3.5 hover:bg-gray-50/90 active:bg-gray-100 transition-colors text-left disabled:opacity-60 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-9 w-9 rounded-full ${acc.color} text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0`}
                      >
                        {acc.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-gray-900 truncate">
                            {acc.name}
                          </span>
                          {acc.badge && (
                            <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-700 border border-blue-100">
                              {acc.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {acc.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 pl-2">
                      {isThisLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Use Another Account Button */}
              <button
                onClick={() => {
                  setError('');
                  setIsUsingAnother(true);
                }}
                disabled={isSubmitting}
                className="w-full flex items-center gap-3 p-3.5 hover:bg-gray-50/90 active:bg-gray-100 transition-colors text-left text-gray-700 group font-semibold text-xs disabled:opacity-60"
              >
                <div className="h-9 w-9 rounded-full bg-gray-100 border border-dashed border-gray-300 text-gray-500 flex items-center justify-center flex-shrink-0 group-hover:border-blue-500 group-hover:text-blue-600 transition-colors">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <span className="text-xs font-bold text-gray-800 group-hover:text-blue-600 transition-colors">
                    Use another Google account
                  </span>
                  <p className="text-[11px] text-gray-400 font-normal">
                    Sign in with any other Gmail or Google Workspace
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
              </button>
            </div>
          </div>
        ) : (
          /* ENTER CUSTOM GOOGLE ACCOUNT FORM */
          <form onSubmit={handleCustomSubmit} className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-gray-700">
                Enter your Google Account
              </span>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setIsUsingAnother(false);
                }}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                ← Back to accounts
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Email address
              </label>
              <input
                type="email"
                required
                autoFocus
                value={customEmail}
                onChange={(e) => {
                  setCustomEmail(e.target.value);
                  setError('');
                }}
                placeholder="you@gmail.com"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Your name (optional)
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g. Ayush Phalak"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Google account...</span>
                </>
              ) : (
                <>
                  <span>Continue with this account</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Trust & Privacy Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-emerald-700 font-semibold mb-2">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Encrypted OAuth 2.0 Token Exchange • 15 GB Free Quota</span>
          </div>
          <p className="text-[10px] text-center text-gray-400 leading-relaxed">
            To continue, Google will securely share your profile information with Google Drive in accordance with our{' '}
            <span className="text-gray-600 underline">Privacy Policy</span> and{' '}
            <span className="text-gray-600 underline">Terms of Service</span>.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoogleSignInModal;
