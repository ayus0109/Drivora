import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
  HardDrive,
  Eye,
  EyeOff,
  AlertCircle,
  Mail,
  ArrowLeft,
  RefreshCw,
  KeyRound,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import GoogleSignInModal from '../components/GoogleSignInModal';

const Signup = () => {
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const hideTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);

  const { verifySignupOtp, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, []);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendTimer > 0) {
      countdownTimerRef.current = setTimeout(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (countdownTimerRef.current) clearTimeout(countdownTimerRef.current);
    };
  }, [resendTimer]);

  const handleTogglePassword = () => {
    const nextState = !showPassword;
    setShowPassword(nextState);

    if (nextState) {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        setShowPassword(false);
      }, 3000);
    }
  };

  // Step 1: Validate details & send 6-digit OTP to user email
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }

    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/auth/send-signup-otp', {
        email: trimmedEmail,
      });

      setDevCode(res.data.devCode || '');
      setSuccessMessage(
        res.data.message || `A 6-digit verification code has been sent to ${trimmedEmail}.`
      );
      setStep('otp');
      setResendTimer(60);
      setOtpCode('');
    } catch (err) {
      console.error('Request OTP failed:', err);
      const message =
        err.response?.data?.message ||
        'Failed to send verification code. Please check your email and try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Resend 6-digit OTP code
  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;
    setError('');
    setSuccessMessage('');

    try {
      setIsResending(true);
      const res = await api.post('/auth/send-signup-otp', {
        email: email.trim().toLowerCase(),
      });

      setDevCode(res.data.devCode || '');
      setSuccessMessage('A fresh verification code has been dispatched.');
      setResendTimer(60);
    } catch (err) {
      console.error('Resend OTP failed:', err);
      setError(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setIsResending(false);
    }
  };

  // Step 3: Verify OTP & finalize account creation
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');

    const cleanOtp = otpCode.trim().replace(/\D/g, '');
    if (cleanOtp.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    try {
      setIsSubmitting(true);
      const trimmedEmail = email.trim().toLowerCase();
      const displayName =
        name.trim() ||
        trimmedEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

      await verifySignupOtp(trimmedEmail, cleanOtp, password, displayName);
      navigate('/');
    } catch (err) {
      console.error('OTP verification failed:', err);
      const message =
        err.response?.data?.message ||
        'Invalid or expired verification code. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async (payload) => {
    const userData = await loginWithGoogle(payload);
    navigate('/');
    return userData;
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-12 sm:px-6 lg:px-8 font-['Plus_Jakarta_Sans',sans-serif]">
      <div className="w-full max-w-md space-y-6 rounded-3xl bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-gray-100">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4 shadow-sm">
            {step === 'form' ? (
              <HardDrive className="h-7 w-7" />
            ) : (
              <Mail className="h-7 w-7 text-blue-600 animate-bounce" />
            )}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-gray-900">
            {step === 'form' ? 'Create your Drivora account' : 'Verify your email'}
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-gray-500">
            {step === 'form'
              ? 'Get 15 GB of free encrypted cloud storage instantly'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-xl bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 border border-red-200/80 animate-in fade-in">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && step === 'otp' && (
          <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-3.5 text-xs sm:text-sm text-blue-800 border border-blue-200/80 animate-in fade-in">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-blue-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Development helper banner when SMTP is not configured in local environment */}
        {devCode && step === 'otp' && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-600" />
              <span>
                Dev Code: <strong className="font-mono text-sm tracking-wider">{devCode}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setOtpCode(devCode)}
              className="text-[11px] font-bold text-amber-800 bg-amber-200/70 hover:bg-amber-200 px-2 py-1 rounded-md transition-colors"
            >
              Fill Code
            </button>
          </div>
        )}

        {/* STEP 1: REGISTRATION FORM */}
        {step === 'form' && (
          <>
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
              <span>Sign up with Google</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-gray-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider absolute">
                or sign up with email
              </span>
            </div>

            <form className="mt-6 space-y-4" onSubmit={handleRequestOtp}>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Full Name <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ayush Phalak"
                  autoComplete="name"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 shadow-2xs placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your real email"
                  autoComplete="username email"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 shadow-2xs placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  A 6-digit verification code will be sent to verify your identity.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Password <span className="text-red-500">*</span>
                  </label>
                  {showPassword && (
                    <span className="text-[10px] text-blue-600 font-semibold animate-pulse">
                      Auto-masks in 3s
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => setShowPassword(false)}
                    placeholder="At least 6 characters"
                    autoComplete="new-password"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-2xs placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleTogglePassword}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => setShowPassword(false)}
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm text-gray-900 shadow-2xs placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center items-center py-3 px-4 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60 transition-all active:scale-[0.98]"
              >
                {isSubmitting ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  'Send Verification Code'
                )}
              </button>
            </form>
          </>
        )}

        {/* STEP 2: 6-DIGIT OTP VERIFICATION */}
        {step === 'otp' && (
          <form className="space-y-4 animate-in fade-in" onSubmit={handleVerifyOtp}>
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-gray-400 uppercase">Sending to</span>
                <p className="text-xs sm:text-sm font-bold text-gray-900 truncate">{email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError('');
                }}
                className="text-xs font-semibold text-blue-600 hover:underline shrink-0 flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Change
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 text-center">
                Enter 6-Digit Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                value={otpCode}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(cleaned);
                  setError('');
                }}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.75em] text-2xl font-bold font-mono py-3 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-gray-300 placeholder:tracking-[0.5em]"
              />
              <p className="mt-1.5 text-[11px] text-center text-gray-400">
                Code expires in 10 minutes.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || otpCode.trim().length !== 6}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl bg-blue-600 text-sm font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Verify & Create Account'
              )}
            </button>

            {/* Resend and timer */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setStep('form');
                  setError('');
                }}
                className="font-semibold text-gray-500 hover:text-gray-800"
              >
                ← Back to details
              </button>

              <button
                type="button"
                disabled={resendTimer > 0 || isResending}
                onClick={handleResendOtp}
                className={`font-semibold transition-colors flex items-center gap-1 ${
                  resendTimer > 0 || isResending
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-blue-600 hover:text-blue-700 hover:underline'
                }`}
              >
                <RefreshCw className={`h-3 w-3 ${isResending ? 'animate-spin' : ''}`} />
                {resendTimer > 0 ? `Resend code in ${resendTimer}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-bold text-blue-600 hover:text-blue-500 hover:underline"
          >
            Sign in
          </Link>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Email-verified accounts prevent bots & unauthorized registrations</span>
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

export default Signup;
