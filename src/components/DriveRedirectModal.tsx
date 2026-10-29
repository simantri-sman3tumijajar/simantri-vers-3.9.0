import React, { useState, useEffect } from 'react';
import {
  ExternalLink,
  FolderCheck,
  FolderOpen,
  Plus,
  Upload,
  CheckCircle2,
  AlertTriangle,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { verifyGoogleDriveLink, DriveLinkVerificationResult } from '../utils/driveVerifier';

interface DriveRedirectModalProps {
  isOpen: boolean;
  url: string;
  title: string;
  menuName: string;
  onClose: () => void;
}

export const DriveRedirectModal: React.FC<DriveRedirectModalProps> = ({
  isOpen,
  url,
  title,
  menuName,
  onClose,
}) => {
  const [verification, setVerification] = useState<DriveLinkVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen && url) {
      setIsVerifying(true);
      verifyGoogleDriveLink(url).then((res) => {
        setVerification(res);
        setIsVerifying(false);
      });
    }
  }, [isOpen, url]);

  if (!isOpen) return null;

  const handleOpenTab = () => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-xs overflow-y-auto cursor-pointer"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden text-slate-800 my-auto cursor-default"
        >
          {/* Top Bar */}
          <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                <FolderOpen className="w-5 h-5 text-indigo-100" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  Google Drive Integrasi • {menuName}
                </span>
                <h3 className="text-sm sm:text-base font-extrabold text-white mt-0.5">
                  Konfirmasi Pengalihan & Panduan Unggah Google Drive
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 min-h-0 overscroll-contain">
            {/* Folder Title & Verification Status Badge */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-3">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                    Target Folder Google Drive
                  </span>
                  <h4 className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {title}
                  </h4>
                </div>

                {/* Status Badge */}
                {!url?.trim() ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Kosong (Belum Diatur)
                  </span>
                ) : isVerifying ? (
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 animate-pulse">
                    Memverifikasi Tautan...
                  </span>
                ) : verification?.isPublic ? (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Terverifikasi Publik (Siapa Saja yang Memiliki Link)</span>
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs w-fit">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Perlu Akses / Status Minta Akses</span>
                  </span>
                )}
              </div>

              {url?.trim() ? (
                <>
                  <div className="text-[11px] font-mono text-slate-600 bg-white p-2 rounded-xl border border-slate-200 truncate">
                    {url}
                  </div>
                  {verification && (
                    <p className={`text-[11px] font-medium leading-relaxed ${verification.isPublic ? 'text-emerald-700' : 'text-amber-800'}`}>
                      {verification.message}
                    </p>
                  )}
                </>
              ) : (
                <div className="space-y-2">
                  <div className="text-[11px] font-mono text-slate-400 bg-white p-3 rounded-xl border border-slate-200 border-dashed text-center">
                    (Kotak Tautan Kosong — Belum ada link Google Drive yang diisi oleh Administrator)
                  </div>
                  <p className="text-xs text-amber-800 font-medium bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    Tautan Google Drive untuk {menuName} belum diisi pada Pengaturan Sekolah. Apabila tautan resmi diisi oleh Administrator, tombol pengalihan akan aktif secara otomatis.
                  </p>
                </div>
              )}
            </div>

            {/* Step-by-Step Interactive Tutorial Matching Google Drive UI */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                Panduan Singkat Unggah File di Google Drive:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Step 1 */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5 hover:border-indigo-300 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span className="font-bold text-slate-900 text-xs">Pilih Folder & Subfolder</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Setelah halaman Google Drive terbuka, navigasikan ke folder <strong>Mata Pelajaran</strong> atau <strong>Kelas</strong> yang sesuai.
                  </p>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-[10px] font-semibold text-slate-700">
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="truncate">Google Drive &gt; SMANTRI_ASESMEN &gt; Folder Mapel</span>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5 hover:border-indigo-300 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <span className="font-bold text-slate-900 text-xs">Klik Tombol "+ Baru" (+ New)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Di pojok kiri atas tampilan Google Drive, klik tombol oval putih <strong>+ Baru</strong>.
                  </p>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-[10px] font-extrabold text-indigo-700">
                    <Plus className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Tombol "+ Baru" (Di Tampilan Google Drive)</span>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5 hover:border-indigo-300 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <span className="font-bold text-slate-900 text-xs">Pilih Menu "Unggah File"</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Pilih opsi <strong>Upload file (File Upload)</strong> dari menu drop-down Google Drive.
                  </p>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-[10px] font-semibold text-slate-700">
                    <Upload className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Pilih: Unggah file (File Upload)</span>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5 hover:border-indigo-300 transition-colors">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                      4
                    </span>
                    <span className="font-bold text-slate-900 text-xs">Pilih File Hasil Download</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">
                    Pilih file Bank Soal (Word/PDF) atau Rekap Nilai Raport (Excel) yang baru saja diunduh dari SMANTRI.
                  </p>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2 text-[10px] font-semibold text-indigo-900">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">File Excel Raport / Bank Soal Word PDF</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Final Security Notice */}
            <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-2xl flex items-center gap-2.5 text-xs">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Membuka tautan ini akan mengarahkan browser Anda ke Google Drive resmi pada <strong>Tab Baru</strong>. Pekerjaan Anda di website ini tetap tersimpan aman.
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs cursor-pointer transition-colors"
            >
              Batal
            </button>

            <button
              type="button"
              disabled={!url?.trim()}
              onClick={handleOpenTab}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                url?.trim()
                  ? 'bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-lg shadow-indigo-600/30 cursor-pointer'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <span>{url?.trim() ? 'Buka Google Drive di Tab Baru' : 'Tautan Belum Diatur'}</span>
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
