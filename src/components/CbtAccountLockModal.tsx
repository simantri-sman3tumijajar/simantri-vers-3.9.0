import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  Lock,
  X,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  Users,
  Sparkles,
} from 'lucide-react';

export interface CbtAccountLockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  title?: string;
  targetCount?: number;
  classScope?: string;
  mode?: 'mass_lock' | 'single_lock' | 'unlock_edit';
  isSubmitting?: boolean;
  studentDetails?: {
    name: string;
    username: string;
    password: string;
  };
  customMessage?: string;
}

export const CbtAccountLockModal: React.FC<CbtAccountLockModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Konfirmasi Penting: Simpan & Kunci Akun CBT Siswa',
  targetCount = 0,
  classScope = 'Semua Siswa',
  mode = 'mass_lock',
  isSubmitting = false,
  studentDetails,
  customMessage,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto cursor-pointer"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl border-2 border-amber-300 max-w-lg w-full overflow-hidden my-auto text-slate-800 cursor-default"
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-amber-600 via-amber-500 to-orange-600 p-5 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <div className="relative z-10 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-lg">
                  <ShieldAlert className="w-7 h-7 text-amber-100 animate-pulse" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/25 text-white border border-white/30">
                    Konfirmasi Penting Sistem
                  </span>
                  <h3 className="text-base sm:text-lg font-black text-white mt-1 leading-snug">
                    {title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="p-1 rounded-xl bg-black/20 hover:bg-black/30 text-white transition-colors cursor-pointer shrink-0 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-5 sm:p-6 space-y-4 text-xs">
            {/* Highlight Alert Box */}
            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-black text-amber-900 text-xs sm:text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>PEMBERITAHUAN PENTING &amp; OTENTIKASI CBT</span>
              </div>
              <p className="text-xs leading-relaxed font-semibold text-slate-800">
                &ldquo;Username dan Password yang telah di-generate akan dikunci dan disimpan permanen ke sistem agar dapat digunakan siswa untuk login ujian CBT sesuai Kartu Ujian.&rdquo;
              </p>
            </div>

            {/* Target Scope Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Cakupan Target</span>
                <div className="flex items-center gap-1.5 mt-0.5 font-black text-slate-900 text-xs truncate">
                  <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span>{classScope}</span>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase block">Jumlah Akun</span>
                <div className="flex items-center gap-1.5 mt-0.5 font-black text-slate-900 text-xs">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{targetCount > 0 ? `${targetCount} Siswa` : 'Semua Terdaftar'}</span>
                </div>
              </div>
            </div>

            {/* Student Details Preview for Individual Edit / Reset */}
            {studentDetails && (
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-1.5">
                <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider block">
                  Detail Kredensial Siswa Yang Akan Disimpan:
                </span>
                <div className="text-xs text-slate-900">
                  <span className="text-slate-500">Nama:</span> <strong className="uppercase">{studentDetails.name}</strong>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-xs">
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-sans font-bold text-slate-500 block">Username CBT:</span>
                    <strong className="text-indigo-900 tracking-wider">{studentDetails.username}</strong>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-sans font-bold text-slate-500 block">Password CBT:</span>
                    <strong className="text-slate-900 tracking-wider">{studentDetails.password}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* Explanatory Bullet Points */}
            <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-[11px] text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Single Source of Truth:</strong> Kredensial permanen langsung sinkron dengan cetak Kartu Ujian dan validasi login siswa.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Perlindungan Akun:</strong> Mencegah penimpaan acak yang tidak disengaja setelah kartu peserta dibagikan.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Hak Akses Khusus:</strong> Admin, Operator, dan Proktor tetap dapat membuka kunci dan mengubah akun kapan saja jika diperlukan.</span>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 px-5 sm:px-6 py-4 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-extrabold text-xs transition-all cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={async () => {
                await onConfirm();
              }}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Lock className="w-4 h-4 text-emerald-200" />
              <span>{isSubmitting ? 'Menyimpan Permanen...' : 'Ya, Kunci & Simpan Permanen'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
