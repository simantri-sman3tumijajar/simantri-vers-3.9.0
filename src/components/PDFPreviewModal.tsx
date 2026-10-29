import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Printer,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  FileText,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

import jsPDF from 'jspdf';

export interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  blobUrl: string | null;
  fileName?: string;
  doc?: jsPDF | null;
  onDownload?: () => void;
  onPrint?: () => void;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  blobUrl,
  fileName = 'Dokumen_Rekap_Nilai.pdf',
  doc,
  onDownload,
  onPrint,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (onPrint) {
      onPrint();
      return;
    }
    if (blobUrl) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = blobUrl;
      document.body.appendChild(iframe);
      iframe.onload = () => {
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 2000);
      };
    }
  };

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className={`bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden transition-all duration-300 ${
            isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-5xl h-[92vh]'
          }`}
        >
          {/* Header */}
          <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm sm:text-base text-white truncate">{title}</h3>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    Kop Resmi F4
                  </span>
                </div>
                {subtitle && <p className="text-xs text-indigo-200/80 truncate">{subtitle}</p>}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Cetak langsung dokumen PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cetak</span>
              </button>

              <button
                type="button"
                onClick={handleDownload}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Unduh file PDF ke komputer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Unduh PDF</span>
              </button>

              <button
                type="button"
                onClick={handleOpenNewTab}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                title="Buka pratinjau di tab baru"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer hidden md:flex items-center justify-center"
                title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 transition-all cursor-pointer ml-1"
                title="Tutup pratinjau"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* PDF Viewer Body */}
          <div className="flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden flex flex-col">
            {blobUrl ? (
              <iframe
                src={blobUrl}
                title={title}
                className="w-full h-full rounded-2xl border border-slate-200 shadow-inner bg-white"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400">
                <FileText className="w-12 h-12 text-slate-300 animate-pulse" />
                <p className="text-sm font-semibold">Sedang merender pratinjau dokumen PDF resmi...</p>
              </div>
            )}
          </div>

          {/* Footer Bar */}
          <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              <span className="font-medium text-slate-600">
                Format Standar F4 Resmi SMAN 3 Tumijajar (215.9 mm × 330.2 mm)
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>SiMantri Academic Suite</span>
              <span>•</span>
              <button
                type="button"
                onClick={onClose}
                className="font-bold text-slate-600 hover:text-indigo-600 transition-colors"
              >
                Tutup Jendela
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
