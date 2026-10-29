import React from 'react';
import {
  X,
  FileSpreadsheet,
  FileText,
  Download,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { motion } from 'motion/react';
import { downloadStudentTemplateExcel, downloadMCQTemplateExcel, downloadEssayTemplateExcel } from '../utils/excelExport';

interface TemplateGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TemplateGuideModal: React.FC<TemplateGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto text-slate-800 cursor-default"
      >
        {/* Header */}
        <div className="bg-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Panduan & Unduh Template Standar SMANTRI</h3>
              <p className="text-xs text-slate-400">Template seragam untuk impor soal dan data siswa</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 text-xs flex-1 min-h-0 overscroll-contain">
          {/* Card 1: ASTS Essay Template */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                  ASTS ESSAY
                </span>
                <h4 className="font-bold text-sm text-slate-900">Template Soal Uraian (5 / 10 Soal)</h4>
              </div>
              <p className="text-slate-600">
                Format kolom: <span className="font-mono text-slate-800">NO, SOAL_URAIAN, KUNCI_JAWABAN_RUBRIK, SKOR_MAKSIMAL, DIMENSI_PEMBELAJARAN_MENDALAM</span>
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Terintegrasi Rubrik & Standar Skor Otomatis</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() => downloadEssayTemplateExcel(5)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>5 Soal (.xlsx)</span>
              </button>
              <button
                onClick={() => downloadEssayTemplateExcel(10)}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-semibold shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>10 Soal (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Card 2: ASAS Pilihan Ganda Template */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-bold text-[10px]">
                  ASAS PILIHAN GANDA
                </span>
                <h4 className="font-bold text-sm text-slate-900">Template Pilihan Ganda (40 / 50 Soal)</h4>
              </div>
              <p className="text-slate-600">
                Format kolom: <span className="font-mono text-slate-800">NO, SOAL, OPSI_A, OPSI_B, OPSI_C, OPSI_D, OPSI_E, KUNCI_JAWABAN, SKOR</span>
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Format A-E standar asesmen sumatif akhir semester</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() => downloadMCQTemplateExcel(40)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-semibold shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-sky-600" />
                <span>40 Soal (.xlsx)</span>
              </button>
              <button
                onClick={() => downloadMCQTemplateExcel(50)}
                className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>50 Soal (.xlsx)</span>
              </button>
            </div>
          </div>

          {/* Card 3: Student Master Template */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  DATA SISWA
                </span>
                <h4 className="font-bold text-sm text-slate-900">Template Data Siswa Per Kelas</h4>
              </div>
              <p className="text-slate-600">
                Format kolom: <span className="font-mono text-slate-800">NO, NISN, NAMA_LENGKAP, JENIS_KELAMIN, KELAS</span>
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
                <span>Dapat juga diimpor langsung via Foto/OCR Gemini AI Vision.</span>
              </div>
            </div>

            <button
              onClick={downloadStudentTemplateExcel}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Template Siswa (.xlsx)</span>
            </button>
          </div>

          {/* AI Vision Note */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block">Fleksibilitas Unggah Dokumen:</span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Selain file Excel, Anda juga dapat mengunggah file dokumen Microsoft Word (.docx), file PDF, atau foto kertas soal langsung. Sistem Gemini AI Vision Ultra-Tinggi akan secara otomatis merapikan format butir soal sesuai template di atas.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </motion.div>
    </div>
  );
};
