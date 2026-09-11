import React from 'react';
import {
  ShieldCheck,
  Lock,
  Key,
  Server,
  FileCheck,
  EyeOff,
  X,
  Database,
} from 'lucide-react';

const SecurityPrivacyModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const securityPillars = [
    {
      icon: <Lock className="h-5 w-5 text-blue-600" />,
      title: 'AES-256-GCM Storage Encryption',
      subtitle: 'Data Privacy at Rest',
      description:
        'Every uploaded file is passed through military-grade AES-256-GCM encryption before writing to disk or cloud storage. Even system administrators with direct server access see only encrypted ciphertext, not your raw files.',
    },
    {
      icon: <Key className="h-5 w-5 text-purple-600" />,
      title: 'Bcrypt Password Hashing & Salting',
      subtitle: 'Credential Security',
      description:
        'User passwords undergo 10 rounds of cryptographic salting and one-way hashing with bcrypt. Passwords are never stored in plaintext and cannot be reversed or decrypted.',
    },
    {
      icon: <EyeOff className="h-5 w-5 text-emerald-600" />,
      title: 'Multi-Tenant Data Isolation',
      subtitle: 'Strict User Privacy',
      description:
        'All folder trees and file queries in MongoDB are strictly scoped by cryptographically signed JWT user claims. User A can never query, inspect, or mutate User B’s data.',
    },
    {
      icon: <Server className="h-5 w-5 text-amber-600" />,
      title: '128-Bit Cryptographic Share Tokens',
      subtitle: 'Access Control',
      description:
        'Public view-only links utilize high-entropy pseudorandom tokens (3.4 × 10³⁸ combinations), preventing brute-force URL scanning. Owners can revoke access instantly with one click.',
    },
    {
      icon: <Database className="h-5 w-5 text-rose-600" />,
      title: 'Atomic Quota Protection',
      subtitle: 'Storage Reliability',
      description:
        'Storage allocation utilizes atomic MongoDB $inc operations with strict capacity checks to prevent race conditions and enforce the 15 GB user quota reliably.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Security & Data Privacy Architecture
              </h3>
              <p className="text-xs text-gray-500">
                Enterprise-grade privacy protections built into Google Drive
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pillars List */}
        <div className="mt-6 space-y-4">
          {securityPillars.map((p, idx) => (
            <div
              key={idx}
              className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50/70 border border-gray-100 hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all"
            >
              <div className="p-2.5 rounded-xl bg-white shadow-xs flex-shrink-0">
                {p.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-gray-900">{p.title}</h4>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {p.subtitle}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                  {p.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-green-600 font-medium flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            All Security Systems Active
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecurityPrivacyModal;
