import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Lock,
  AlertTriangle,
  X,
  ShieldAlert,
  CheckCircle2,
  FileCheck,
  UserCheck,
  Building,
  GraduationCap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { SubjectGradeRecapSheet } from '../types';

export interface PermanentLockConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheet: SubjectGradeRecapSheet;
  onConfirmLock: (note?: string) => Promise<boolean>;
  metrics: {
    totalStudents: number;
    filledCount: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
  };
}

export const PermanentLockConfirmModal: React.FC<PermanentLockConfirmModalProps> = ({
  isOpen,
  onClose,
  sheet,
  onConfirmLock,
  metrics,
}) => {
  const [agreementChecked, setAgreementChecked] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [finalNote, setFinalNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const isConfirmed = agreementChecked && confirmInput.trim().toUpperCase() === 'KUNCI FINAL';

  const handleLockSubmit = async () => {
    if (!isConfirmed || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const success = await onConfirmLock(finalNote);
      if (success) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-xl w-full overflow-hidden my-auto"
        >
          {/* Critical Header Banner */}
          <div className="bg-gradient-to-r from-rose-900 via-rose-800 to-red-950 text-white p-5 sm:p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-200 shrink-0 shadow-lg">
                  <ShieldAlert className="w-7 h-7 text-rose-300 animate-pulse" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-400/20 text-rose-200 border border-rose-400/30">
                    Konfirmasi Penting Sistem
                  </span>
                  <h3 className="text-lg font-black text-white mt-1">
                    KUNCI &amp; SIMPAN PERMANEN (FINAL)
                  </h3>
                  <p className="text-xs text-rose-100/90 mt-0.5">
                    Tindakan ini akan mengunci seluruh nilai secara mutlak
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Content */}
          <div className="p-5 sm:p-6 space-y-4">
            {/* Warning Callout Box */}
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs text-rose-900 space-y-1">
                <p className="font-bold">
                  Perhatian: Penguncian Nilai Tidak Dapat Dirubah Kembali
                </p>
                <p className="text-rose-800 leading-relaxed">
                  Setelah disimpan secara final, lembar rekapitulasi nilai ini akan berstatus{' '}
                  <span className="font-black text-rose-950 underline">TERSIMPAN PERMANEN</span>. Seluruh kolom nilai
                  (TP 1-6, PTS, PAS, Nilai Akhir Rapor, dan Capaian Kompetensi) akan terkunci dan tidak dapat diedit
                  kembali oleh Guru Pengampu.
                </p>
              </div>
            </div>

            {/* Audit Summary Card */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-indigo-600" />
                <span>Ringkasan Data yang Akan Dikunci</span>
              </h4>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block font-semibold">Mata Pelajaran</span>
                  <span className="font-black text-slate-800 truncate block">{sheet.mataPelajaran}</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block font-semibold">Kelas &amp; Fase</span>
                  <span className="font-black text-slate-800">{sheet.kelas} ({sheet.fase})</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block font-semibold">Guru Pengampu</span>
                  <span className="font-black text-slate-800 truncate block">{sheet.guruName}</span>
                </div>
                <div className="p-2.5 bg-white rounded-xl border border-slate-200/80">
                  <span className="text-[10px] text-slate-500 block font-semibold">Tahun &amp; Semester</span>
                  <span className="font-black text-slate-800">{sheet.tahunAjaran} ({sheet.semester})</span>
                </div>
              </div>

              {/* Stat Numbers */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div className="p-2 bg-indigo-50/70 rounded-xl border border-indigo-100">
                  <span className="text-[10px] text-indigo-600 font-bold block">Siswa Lengkap</span>
                  <span className="text-sm font-black text-indigo-900">{metrics.filledCount} / {metrics.totalStudents}</span>
                </div>
                <div className="p-2 bg-emerald-50/70 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-600 font-bold block">Rata-rata Kelas</span>
                  <span className="text-sm font-black text-emerald-900">{metrics.avgScore.toFixed(1)}</span>
                </div>
                <div className="p-2 bg-amber-50/70 rounded-xl border border-amber-100">
                  <span className="text-[10px] text-amber-600 font-bold block">Tertinggi / Terendah</span>
                  <span className="text-sm font-black text-amber-900">{metrics.highestScore} / {metrics.lowestScore}</span>
                </div>
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">
                Catatan Berita Acara Finalisasi (Opsional):
              </label>
              <input
                type="text"
                value={finalNote}
                onChange={(e) => setFinalNote(e.target.value)}
                placeholder="Contoh: Seluruh nilai telah diverifikasi bersama tim kurikulum."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-slate-800"
              />
            </div>

            {/* Security Check 1: Agreement Checkbox */}
            <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-100 border border-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreementChecked}
                onChange={(e) => setAgreementChecked(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800 leading-snug">
                Saya menyatakan dengan sadar bahwa seluruh nilai siswa pada lembar rekapitulasi ini telah selesai,
                diverifikasi kebenarannya, dan siap dikunci secara permanen menjadi dokumen resmi.
              </span>
            </label>

            {/* Security Check 2: Confirmation Word Input */}
            <div className="space-y-1.5 p-3.5 bg-rose-50/60 rounded-2xl border border-rose-200/80">
              <label className="text-xs font-black text-rose-900 block">
                Ketik teks <span className="px-1.5 py-0.5 rounded bg-rose-200 font-mono text-rose-950">KUNCI FINAL</span> di bawah untuk mengaktifkan tombol:
              </label>
              <input
                type="text"
                value={confirmInput}
                onChange={(e) => setConfirmInput(e.target.value)}
                placeholder="Ketik KUNCI FINAL disini..."
                className="w-full px-3 py-2 text-xs font-black tracking-wider uppercase bg-white border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-rose-900"
              />
            </div>
          </div>

          {/* Action Footer */}
          <div className="p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Batal &amp; Kembali
            </button>

            <button
              type="button"
              disabled={!isConfirmed || isSubmitting}
              onClick={handleLockSubmit}
              className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition-all shadow-md ${
                isConfirmed
                  ? 'bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 hover:from-rose-500 hover:to-red-600 text-white cursor-pointer active:scale-95'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{isSubmitting ? 'Mengunci Dokumen...' : 'Kunci & Simpan Permanen (Final)'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
