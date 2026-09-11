import React, { useState } from 'react';
import {
  X,
  Shield,
  Server,
  Database,
  Lock,
  Layers,
  HelpCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Key,
  FolderTree,
  FileCheck,
  Zap,
} from 'lucide-react';

const TechnicalVivaModal = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState('architecture'); // 'architecture' | 'privacy' | 'viva-qa'
  const [openFaq, setOpenFaq] = useState(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'Q1: If someone uploads personal data here, can the database or server administrator read it?',
      a: 'No. The system implements AES-256-GCM authenticated encryption at rest. Before any file is persisted to disk or cloud storage, it is encrypted in-memory using a 256-bit key and a random 96-bit Initialization Vector (IV). Even if a malicious actor or server administrator accesses the raw storage directory or database, they only see garbled .enc ciphertext with an integrity tag. The file can only be decrypted on-the-fly during an authenticated user session.',
    },
    {
      q: 'Q2: How does the system handle parallel uploads without breaking the 15 GB storage quota?',
      a: 'The system uses MongoDB atomic update operators ($inc). When an upload arrives, the file size is verified against the available quota (quotaBytes - usedStorageBytes). If valid, the file is encrypted and saved, and MongoDB atomically increments the user\'s usedStorageBytes. If multiple uploads finish concurrently, atomic database increments prevent race conditions.',
    },
    {
      q: 'Q3: What happens if a folder with nested subfolders and files is deleted?',
      a: 'The backend implements a recursive depth-first deletion algorithm. In routes/folders.js, the collectDescendants function recursively traverses the folder tree, accumulates all descendant folder and file IDs, purges all corresponding physical files from storage, reclaims the storage quota, and deletes all database records atomically in a batch.',
    },
    {
      q: 'Q4: How does public file sharing work without exposing private user credentials?',
      a: 'Public share links rely on cryptographically secure 32-character random tokens generated via crypto.randomBytes(16). The token maps to a ShareLink document in MongoDB. The public route /api/share/:token requires zero credentials, increments view/download metrics, and provides read-only access. When the owner revokes the link, isActive is set to false, immediately returning HTTP 404 to all subsequent requests.',
    },
    {
      q: 'Q5: Why did you choose AES-256-GCM over AES-256-CBC?',
      a: 'AES-GCM (Galois/Counter Mode) provides Authenticated Encryption with Associated Data (AEAD). Unlike CBC mode which only offers confidentiality and requires separate HMAC hashing to detect tampering, GCM produces a 128-bit authentication tag directly. This mathematically guarantees both confidentiality AND ciphertext integrity, preventing bit-flipping attacks.',
    },
    {
      q: 'Q6: How does the system recover if a file upload is interrupted midway?',
      a: 'The system uses atomic two-phase commit logic. Multer receives the file stream into memory; only after the file is successfully encrypted with AES-256-GCM and written to the underlying storage bucket does the database record get created. If an error occurs during upload or cipher generation, no orphaned database document is saved and the user quota remains untouched.',
    },
    {
      q: 'Q7: How are user passwords secured?',
      a: 'Passwords are never stored in plaintext. They are salted and hashed using bcryptjs with a cost factor of 10 rounds prior to being saved in MongoDB. Even with rainbow tables or brute-force dictionaries, password hashes cannot be reverse-engineered.',
    },
    {
      q: 'Q8: What compliance or audit logging is present?',
      a: 'Every critical operation (File Upload, Rename, Delete, Folder Creation, Share Link Generation) generates a tamper-evident audit record in the ActivityLog collection. This provides enterprise-level observability for compliance audits and security forensics.',
    },
    {
      q: 'Q9: How does Google Single Sign-On (SSO) and Just-In-Time (JIT) provisioning work?',
      a: 'The system integrates Google OAuth identity verification. If an existing email is detected, it links the Google identity without duplicating records or losing existing encrypted files. If a new user logs in via Google, JIT provisioning automatically verifies their identity and grants an enterprise 15 GB quota.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                System Architecture & Viva Defense Guide
              </h2>
              <p className="text-xs text-gray-500">
                Technical documentation, cryptographic design & evaluator Q&A for academic review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Section Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-gray-100 bg-white">
          <button
            onClick={() => setActiveSection('architecture')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'architecture'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Server className="h-3.5 w-3.5" />
            <span>Architecture & Data Flow</span>
          </button>

          <button
            onClick={() => setActiveSection('privacy')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'privacy'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Privacy & Cryptography</span>
          </button>

          <button
            onClick={() => setActiveSection('viva-qa')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'viva-qa'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Evaluator & Viva Q&A (8)</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSection === 'architecture' && (
            <div className="space-y-6 text-sm text-gray-700">
              {/* Architecture Diagram Box */}
              <div className="bg-gray-900 text-gray-100 rounded-xl p-5 font-mono text-xs overflow-x-auto shadow-inner">
                <div className="text-blue-400 font-bold mb-2">
                  === END-TO-END PIPELINE ARCHITECTURE ===
                </div>
                <div>
                  [Client: React + Vite + Tailwind]
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;│ (HTTP Multipart Upload / Streaming Download + JWT Bearer)
                  <br />
                  ▼
                  <br />
                  [Express API Gateway (Port 5000)]
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;├─ Auth Middleware (JWT Verification + User Extraction)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;├─ Quota Manager (15GB Quota Verification vs usedStorageBytes)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;├─ Cryptographic Engine (AES-256-GCM + 96-bit IV + Auth Tag)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;└─ Activity Logger (Audit Trail logging for compliance)
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;│
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├─────────────┬─────────────┐
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;▼
                  <br />
                  &nbsp;&nbsp;[MongoDB Atlas]&nbsp;&nbsp;&nbsp;[Local Vault]&nbsp;&nbsp;[Firebase Storage]
                  <br />
                  &nbsp;&nbsp;Metadata, Quotas,&nbsp;Encrypted .enc&nbsp;&nbsp;Encrypted Object
                  <br />
                  &nbsp;&nbsp;Auth & Audit Logs&nbsp;&nbsp;Filesystem&nbsp;&nbsp;&nbsp;&nbsp;Cloud Buckets
                </div>
              </div>

              {/* Grid of Key Components */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center gap-2 font-bold text-gray-900 mb-2">
                    <Database className="h-4 w-4 text-blue-600" />
                    <span>MongoDB Atlas</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Stores hierarchical folder trees with self-referential parentId pointers, file metadata (name, size, MIME type), and atomic user quota tracking.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center gap-2 font-bold text-gray-900 mb-2">
                    <Lock className="h-4 w-4 text-emerald-600" />
                    <span>Cryptographic Engine</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Uses Node.js native crypto module for hardware-accelerated AES-256-GCM encryption with randomized IVs to ensure zero plaintext on the host.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white">
                  <div className="flex items-center gap-2 font-bold text-gray-900 mb-2">
                    <Zap className="h-4 w-4 text-amber-600" />
                    <span>Streaming Engine</span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Downloads and in-browser previews use Node.js Readable streams piped into decipher streams, enabling instant streaming with low memory footprint.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className="space-y-5 text-sm text-gray-700">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <h4 className="font-bold flex items-center gap-2 text-sm mb-1">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  Zero-Knowledge & Data Privacy Model
                </h4>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  In traditional multi-tenant storage, administrators or operators can inspect uploaded files. In our Google Drive architecture, data privacy is cryptographically enforced rather than just policy-based.
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                  <h5 className="font-bold text-gray-900 flex items-center gap-2 text-xs">
                    <Key className="h-4 w-4 text-blue-600" />
                    1. Ciphertext Storage Architecture
                  </h5>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    When user files are written to disk, they are saved as <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-800">&lt;uuid&gt;_&lt;filename&gt;.enc</code>. Opening the file in any text editor, hex viewer, or operating system explorer reveals only high-entropy random bytes.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                  <h5 className="font-bold text-gray-900 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    2. Cryptographic Integrity Verification (Auth Tag)
                  </h5>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    AES-256-GCM appends a 16-byte authentication tag to every payload. If a rogue operator tampers with even a single bit of the file on disk, the GCM authentication check immediately fails during decryption, rejecting the corrupted payload.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-gray-200 bg-white space-y-2">
                  <h5 className="font-bold text-gray-900 flex items-center gap-2 text-xs">
                    <FileCheck className="h-4 w-4 text-purple-600" />
                    3. Ephemeral In-Memory Decryption
                  </h5>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Decryption is never written back to disk. It streams directly through memory buffers to the authenticated HTTP response channel, eliminating temporary file exposure.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'viva-qa' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-2">
                Click on any question below to see the exact technical explanation for viva defense:
              </p>
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden transition-all shadow-xs"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left font-semibold text-xs text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {openFaq === idx ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="p-4 pt-1 text-xs text-gray-600 border-t border-gray-100 bg-gray-50/50 leading-relaxed">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>Google Drive • Cloud Storage System</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

export default TechnicalVivaModal;
