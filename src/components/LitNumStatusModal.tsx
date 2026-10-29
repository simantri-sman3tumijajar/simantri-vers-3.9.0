import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Clock, CalendarDays, AlertTriangle, ShieldAlert, X, Check } from 'lucide-react';
import { LitNumAccessValidation } from '../utils/studentPortalLockHelper';

interface LitNumStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  validation: LitNumAccessValidation | null;
}

export const LitNumStatusModal: React.FC<LitNumStatusModalProps> = ({
  isOpen,
  onClose,
  validation,
}) => {
  if (!isOpen || !validation) return null;

  const isManualDisabled = validation.isManualDisabled;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border-2 border-amber-300 text-slate-800 space-y-5 my-auto max-h-[90vh] overflow-y-auto relative"
        >
          {/* Top Decorative Header Accent */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 rounded-t-3xl" />

          {/* Modal Title Bar */}
          <div className="flex items-start justify-between gap-3 pt-1 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                  isManualDisabled
                    ? 'bg-rose-50 border-rose-200 text-rose-600'
                    : 'bg-amber-50 border-amber-300 text-amber-700'
                }`}
              >
                {isManualDisabled ? (
                  <ShieldAlert className="w-6 h-6 text-rose-600" />
                ) : (
                  <Clock className="w-6 h-6 text-amber-700" />
                )}
              </div>
              <div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-block mb-1 border shadow-2xs ${
                    isManualDisabled
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : 'bg-amber-100 text-amber-950 border-amber-300'
                  }`}
                >
                  {validation.scheduleBadge}
                </span>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                  {validation.statusTitle}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
              title="Tutup dialog"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Dynamic Condition Message Box */}
          <div
            className={`p-4 rounded-2xl border space-y-2 ${
              isManualDisabled
                ? 'bg-rose-50/90 border-rose-200 text-rose-950'
                : 'bg-amber-50/90 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2 font-black text-xs">
              <AlertTriangle
                className={`w-4 h-4 shrink-0 ${
                  isManualDisabled ? 'text-rose-600' : 'text-amber-700'
                }`}
              />
              <span>Pemberitahuan Sistem Asesmen:</span>
            </div>
            <p className="text-xs sm:text-sm font-bold leading-relaxed">
              "{validation.modalMessage}"
            </p>
          </div>

          {/* Detailed Context & Schedule Guidance */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <h5 className="font-extrabold text-slate-800 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-600" />
              <span>Detail Informasi &amp; Jadwal Resmi:</span>
            </h5>
            <p className="text-slate-600 leading-relaxed text-[11.5px]">
              {validation.modalDetail}
            </p>

            <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-1 text-[11px] font-bold text-slate-500">
              <span>Hari: <strong>Selasa &amp; Rabu</strong></span>
              <span>Waktu: <strong>07:30 - 12:00 WIB</strong></span>
            </div>
          </div>

          {/* Action Button: Tutup / Mengerti */}
          <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Tutup / Mengerti</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
