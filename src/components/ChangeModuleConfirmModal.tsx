import React, { useState } from 'react';
import { ArrowRightLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChangeModuleConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const ChangeModuleConfirmModal: React.FC<ChangeModuleConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [switching, setSwitching] = useState(false);

  if (!isOpen) return null;

  const handleSwitch = () => {
    setSwitching(true);
    setTimeout(() => {
      onConfirm();
      setSwitching(false);
    }, 400);
  };

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center my-auto text-slate-800 cursor-default max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 ring-8 ring-indigo-50/50">
            <ArrowRightLeft className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-slate-900 mb-1">
            Konfirmasi Ganti Modul
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed mb-6">
            Apakah Anda yakin ingin keluar dari modul saat ini dan kembali ke Portal Pilihan Modul Utama? Seluruh data pengerjaan &amp; draf Anda tersimpan aman secara otomatis.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={switching}
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={switching}
              onClick={handleSwitch}
              className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              {switching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuka Portal...</span>
                </>
              ) : (
                <span>Ya, Ganti Modul</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
