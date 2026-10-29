import React, { useState } from 'react';
import { LogOut, AlertTriangle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LogoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const LogoutConfirmModal: React.FC<LogoutConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const [loggingOut, setLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleLogout = () => {
    setLoggingOut(true);
    setTimeout(() => {
      onConfirm();
      setLoggingOut(false);
    }, 150);
  };

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center my-auto text-slate-800 cursor-default max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto"
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4 ring-8 ring-rose-50/50">
            <LogOut className="w-7 h-7" />
          </div>

          <h3 className="text-base font-bold text-slate-900 mb-1">
            Konfirmasi Keluar Akun
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Apakah Anda yakin ingin keluar dari sistem SiMantri (Sistem Informasi Akademik SMAN 3 Tumijajar)? Pekerjaan terakhir Anda telah tersinkronisasi.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={loggingOut}
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={loggingOut}
              onClick={handleLogout}
              className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-md shadow-rose-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {loggingOut ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Proses Keluar...</span>
                </>
              ) : (
                <span>Ya, Keluar</span>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
