import React, { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import {
  X,
  KeyRound,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

const ForgotPasswordModal = ({ isOpen, onClose, initialEmail = '', onSuccess }) => {
  const [step, setStep] = useState('email'); // 'email' | 'reset'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [devCode, setDevCode] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const countdownTimerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setEmail(initialEmail || '');
      setStep('email');
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setDevCode('');
      setError('');
      setIsSubmitting(false);
      setResendTimer(0);
    }
  }, [isOpen, initialEmail]);

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

  // Step 1: Send Reset OTP
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError('Please enter your email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post('/auth/send-reset-otp', { email: trimmed });
      setDevCode(res.data.devCode || '');
      setStep('reset');
      setResendTimer(60);
      setCode('');
    } catch (err) {
      console.error('Send reset OTP failed:', err);
      const message =
        err.response?.data?.message ||
        'No account found with this email, or unable to send reset code.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;
    setError('');

    try {
      setIsResending(true);
      const res = await api.post('/auth/send-reset-otp', {
        email: email.trim().toLowerCase(),
      });
      setDevCode(res.data.devCode || '');
      setResendTimer(60);
    } catch (err) {
      console.error('Resend reset OTP failed:', err);
      setError(err.response?.data?.message || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  // Step 2: Submit Reset with OTP and New Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCode = code.trim().replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setIsSubmitting(true);
      const trimmed = email.trim().toLowerCase();
      await api.post('/auth/reset-password', {
        email: trimmed,
        code: cleanCode,
        newPassword,
      });

      onSuccess(trimmed);
      onClose();
    } catch (err) {
      console.error('Reset password failed:', err);
      const message =
        err.response?.data?.message || 'Invalid or expired code. Please try again.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
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

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-blue-50 border border-blue-100 mb-3 text-blue-600 shadow-2xs">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Reset your password
          </h2>
          <p className="mt-1 text-xs text-gray-500 font-medium">
            {step === 'email'
              ? 'Enter your registered email to receive a 6-digit recovery code'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200 animate-in fade-in">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Dev code helper when SMTP is not configured in local environment */}
        {devCode && step === 'reset' && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-600" />
              <span>
                Dev Code: <strong className="font-mono text-sm tracking-wider">{devCode}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setCode(devCode)}
              className="text-[11px] font-bold text-amber-800 bg-amber-200/70 hover:bg-amber-200 px-2 py-1 rounded-md transition-colors"
            >
              Fill Code
            </button>
          </div>
        )}

        {/* STEP 1: ENTER REGISTERED EMAIL */}
        {step === 'email' && (
          <form onSubmit={handleSendOtp} className="space-y-4 animate-in fade-in">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Registered Email address
              </label>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="Enter your registered email"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 py-2 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/25 transition-all disabled:opacity-60"
              >
                {isSubmitting ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <span>Send Code</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: ENTER OTP + NEW PASSWORD */}
        {step === 'reset' && (
          <form onSubmit={handleResetPassword} className="space-y-4 animate-in fade-in">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-gray-700">
                  6-Digit Verification Code
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError('');
                  }}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  Change email
                </button>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                autoFocus
                value={code}
                onChange={(e) => {
                  const clean = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCode(clean);
                  setError('');
                }}
                placeholder="• • • • • •"
                className="w-full text-center tracking-[0.75em] text-xl font-bold font-mono py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-gray-900 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:tracking-[0.4em]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-gray-700">
                  New Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || code.length !== 6}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl bg-blue-600 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-600/25 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isSubmitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Set New Password'
              )}
            </button>

            <div className="flex items-center justify-between pt-1 text-xs">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="font-semibold text-gray-500 hover:text-gray-800"
              >
                ← Back
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
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </button>
            </div>
          </form>
        )}

        {/* Security Footer */}
        <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-center gap-1.5 text-[11px] text-gray-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          <span>Encrypted password storage with bcrypt salt hashing</span>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordModal;
