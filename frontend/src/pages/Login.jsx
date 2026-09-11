import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HardDrive, Eye, EyeOff, AlertCircle, ShieldAlert, X, Check } from 'lucide-react';
import GoogleSignInModal from '../components/GoogleSignInModal';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [hasUserTyped, setHasUserTyped] = useState(false);
  const [privacyNotice, setPrivacyNotice] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const hideTimerRef = useRef(null);
  const passwordInputRef = useRef(null);

  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Reset form inputs completely on mount or when logging out
  useEffect(() => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setHasUserTyped(false);
    setPrivacyNotice('');
    setError('');

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [location.key]);

  // Clean up auto-mask timer
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setPrivacyNotice('');
    if (!e.target.value) {
      setHasUserTyped(false);
      setShowPassword(false);
    }
  };

  const handleKeyDown = () => {
    // Confirms user is manually typing with keyboard/touchpad
    setHasUserTyped(true);
    setPrivacyNotice('');
  };

  const handleTogglePassword = (e) => {
    e.preventDefault();

    // Security & Privacy Safeguard:
    // If the password was populated via browser autofill and not typed in this session,
    // prevent exposing the secret to shoulder-surfers or unauthorized phone holders.
    if (!hasUserTyped && password) {
      setPrivacyNotice(
        '🔒 Privacy Protection: Autofilled passwords cannot be unmasked to protect your credentials from unauthorized viewing. Type your password manually to inspect it.'
      );
      setShowPassword(false);
      return;
    }

    const nextState = !showPassword;
    setShowPassword(nextState);

    // Auto-mask after 3 seconds for privacy
    if (nextState) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setShowPassword(false);
      }, 3000);
    }
  };

  const handleClearPassword = (e) => {
    e.preventDefault();
    setPassword('');
    setShowPassword(false);
    setHasUserTyped(false);
    setPrivacyNotice('');
    passwordInputRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPrivacyNotice('');

    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      await login(email, password);
      navigate('/');
    } catch (err) {
      console.error('Login failed:', err);
      const message =
        err.response?.data?.message ||
        'Unable to log in. Please check your credentials.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async (payload) => {
    await loginWithGoogle(payload);
    navigate('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-gray-100">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-sm">
            <HardDrive className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            Sign in to Drivora
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-gray-500">
            Secure cloud storage for all your files & folders
          </p>
        </div>

        {/* Google SSO Button */}
        <button
          type="button"
          onClick={() => setIsGoogleModalOpen(true)}
          className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 active:scale-[0.98] text-xs sm:text-sm font-bold text-gray-700 shadow-2xs transition-all touch-active group"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
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
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-gray-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider absolute">
            or sign in with email
          </span>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 border border-red-200/80 animate-in fade-in">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {privacyNotice && (
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 p-3.5 text-xs text-amber-900 border border-amber-200 leading-relaxed animate-in fade-in">
            <ShieldAlert className="h-4 w-4 flex-shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">{privacyNotice}</div>
            <button
              onClick={() => setPrivacyNotice('')}
              className="text-amber-500 hover:text-amber-800 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <form className="mt-6 space-y-4" onSubmit={handleSubmit} autoComplete="off">
          {/* Email field */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="off"
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 shadow-2xs placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Password field with privacy safeguards */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-gray-700">
                Password
              </label>
              {hasUserTyped && showPassword && (
                <span className="text-[10px] text-blue-600 font-semibold animate-pulse">
                  Auto-masks in 3s
                </span>
              )}
            </div>

            <div className="relative">
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={handleKeyDown}
                onBlur={() => setShowPassword(false)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 pr-16 text-sm text-gray-900 shadow-2xs placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />

              <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 gap-1">
                {/* Clear button if input has characters */}
                {password && (
                  <button
                    type="button"
                    onClick={handleClearPassword}
                    title="Clear password field"
                    className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-200/50 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Show/Hide Eye Toggle */}
                <button
                  type="button"
                  onClick={handleTogglePassword}
                  title={
                    !hasUserTyped && password
                      ? 'Autofilled password protected'
                      : showPassword
                      ? 'Hide password'
                      : 'Show password'
                  }
                  className={`p-1.5 rounded-md transition-colors ${
                    !hasUserTyped && password
                      ? 'text-amber-500 hover:text-amber-700 hover:bg-amber-50'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex justify-center items-center py-3 px-4 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 transition-all active:scale-[0.98]"
          >
            {isSubmitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-bold text-blue-600 hover:text-blue-500 hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>

      {/* Interactive Google SSO Modal */}
      <GoogleSignInModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onGoogleLogin={handleGoogleLogin}
      />
    </div>
  );
};

export default Login;
