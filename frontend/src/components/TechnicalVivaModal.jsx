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
  HardDrive,
  UploadCloud,
  Share2,
} from 'lucide-react';

const TechnicalVivaModal = ({ isOpen, onClose }) => {
  const [activeSection, setActiveSection] = useState('faq'); // 'faq' | 'architecture'
  const [openFaq, setOpenFaq] = useState(0);

  if (!isOpen) return null;

  const faqs = [
    {
      q: 'How are my files and personal data protected?',
      a: 'All files are secured with enterprise-grade AES-256-GCM authenticated encryption at rest. Before any file touches disk or cloud storage, it is encrypted in memory using a 256-bit key and an unpredictable 96-bit Initialization Vector (IV). A 16-byte authentication tag guarantees that the file cannot be tampered with. Even database or server administrators cannot read your files.',
      icon: <Lock className="h-4 w-4 text-blue-600" />,
    },
    {
      q: 'How does the 15 GB storage quota work?',
      a: 'Every user is allocated 15 GB of cloud storage. When uploading, the backend verifies available quota and atomically updates your used storage using MongoDB $inc operators to prevent race conditions. When you permanently empty Trash or delete items, storage is reclaimed immediately.',
      icon: <HardDrive className="h-4 w-4 text-emerald-600" />,
    },
    {
      q: 'Can I upload up to 500 photos and videos at once from my phone or PC?',
      a: 'Yes! Drivora features a high-throughput concurrency upload queue. On desktop, it runs 4 concurrent upload streams; on mobile devices, it automatically optimizes to 2 streams to protect mobile bandwidth and battery. You can select up to 500 images, videos, or documents at once and track real-time progress via the floating Upload Manager drawer.',
      icon: <UploadCloud className="h-4 w-4 text-purple-600" />,
    },
    {
      q: 'Can I upload entire folders with nested subfolders and files?',
      a: 'Yes. You can drag and drop entire directory trees directly onto the upload dropzone, or click "Upload Folder" to select a folder from your device. Drivora uses the HTML5 Directory Traversal API to scan nested structures and reconstruct all subfolders in your drive automatically.',
      icon: <FolderTree className="h-4 w-4 text-amber-600" />,
    },
    {
      q: 'How does public file sharing work without exposing my password or account?',
      a: 'When you share a file, Drivora generates a cryptographically random 32-character token. Anyone with the public link can view or download the file in read-only mode without logging in. You can revoke access at any time with one click, which instantly deactivates the link.',
      icon: <Share2 className="h-4 w-4 text-indigo-600" />,
    },
    {
      q: 'What happens when I delete a folder with nested subfolders and files?',
      a: 'Drivora implements a recursive depth-first deletion engine. When you delete or permanently remove a folder, the system traverses all descendant subfolders, securely removes all associated encrypted files, and reclaims your storage quota in a single atomic database batch.',
      icon: <Shield className="h-4 w-4 text-rose-600" />,
    },
    {
      q: 'How does Google Sign-In (SSO) work with my account?',
      a: 'Drivora integrates Google OAuth 2.0. If you sign in with Google, your account is verified securely and linked to your email address. You never risk duplicate accounts or lost files, and your 15 GB quota is provisioned instantly.',
      icon: <CheckCircle2 className="h-4 w-4 text-teal-600" />,
    },
    {
      q: 'Is my data safe if an upload or network connection is interrupted midway?',
      a: 'Yes. Drivora uses atomic two-phase commit logic. Files are streamed and encrypted in-flight; database records and storage quotas are only committed after the encrypted file has been verified and stored. If an upload fails or disconnects midway, no broken records are created and your quota remains untouched.',
      icon: <FileCheck className="h-4 w-4 text-sky-600" />,
    },
    {
      q: 'Can I stream videos, audio, or preview files directly in the browser?',
      a: 'Yes. Built-in high-performance streaming deciphers encrypted files on the fly. You can preview high-resolution images, stream MP4/WebM videos, listen to MP3 audio, view PDF documents, and inspect code files directly in the modal without downloading them first.',
      icon: <Zap className="h-4 w-4 text-cyan-600" />,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="flex flex-col w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Frequently Asked Questions (FAQ) & System Guide
              </h2>
              <p className="text-xs text-gray-500">
                Quick answers about storage quotas, batch uploads, security, and cloud architecture
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
            onClick={() => setActiveSection('faq')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'faq'
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
            <span>Frequently Asked Questions ({faqs.length})</span>
          </button>

          <button
            onClick={() => setActiveSection('architecture')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeSection === 'architecture'
                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Server className="h-3.5 w-3.5 text-purple-600" />
            <span>System Architecture & Data Flow</span>
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

          {activeSection === 'faq' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500 mb-2">
                Click on any question below to see detailed answers:
              </p>
              {faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-gray-200 bg-white overflow-hidden transition-all shadow-2xs hover:border-gray-300"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-3.5 sm:p-4 text-left font-semibold text-xs sm:text-sm text-gray-800 hover:bg-gray-50/80 transition-colors gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0">
                        {faq.icon}
                      </div>
                      <span className="text-gray-900 font-bold">{faq.q}</span>
                    </div>
                    {openFaq === idx ? (
                      <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="p-4 pt-1 text-xs sm:text-sm text-gray-600 border-t border-gray-100 bg-gray-50/50 leading-relaxed pl-11">
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
          <span>Drivora • Cloud Storage System</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Close FAQ
          </button>
        </div>
      </div>
    </div>
  );
};

export default TechnicalVivaModal;
