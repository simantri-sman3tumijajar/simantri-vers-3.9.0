import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { AlertTriangle, Trash2, Loader2, X, RefreshCw, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ResetConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResetConfirmModal: React.FC<ResetConfirmModalProps> = ({ isOpen, onClose }) => {
  const { resetAllData, resetCorrectionData, cleanSystemGarbage } = useApp();
  const [resetType, setResetType] = useState<'cleanup' | 'submissions' | 'all'>('cleanup');
  const [confirmWord, setConfirmWord] = useState('');
  const [resetting, setResetting] = useState(false);

  if (!isOpen) return null;

  const handleReset = async () => {
    if (resetType === 'all' && confirmWord !== 'BERSIHKAN') return;
    
    setResetting(true);
    if (resetType === 'cleanup') {
      await cleanSystemGarbage();
    } else if (resetType === 'submissions') {
      await resetCorrectionData();
    } else {
      await resetAllData();
    }
    setResetting(false);
    setConfirmWord('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-xs overflow-y-auto cursor-pointer"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl border border-rose-200 max-w-lg w-full p-6 text-slate-800 my-auto cursor-default max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Panel Pembersihan & Reset Sistem
                </h3>
                <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">
                  Pemulihan, Pembersihan Sampah & Inisialisasi
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Middle Content */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3 overscroll-contain mb-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              Silakan pilih metode pembersihan atau pengaturan ulang di bawah ini. Anda dapat menghapus permanen sampah sistem bekas error atau merestart grafik nilai siswa.
            </p>

            {/* Reset Options Card */}
            <div className="space-y-2.5">
            {/* 1. Permanent System Cleanup (Safe, recommended) */}
            <button
              type="button"
              onClick={() => setResetType('cleanup')}
              className={`w-full p-3.5 text-left rounded-2xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
                resetType === 'cleanup'
                  ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded-full border-4 flex items-center justify-center ${
                resetType === 'cleanup' ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'
              }`}>
                {resetType === 'cleanup' && <div className="w-1 h-1 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">Bersihkan Sampah Sistem & Bekas Error</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                    100% Aman
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Menghapus permanen sampah sistem, cache error lama, sisa flag koneksi, dan mereset sesi WebRTC. <b>Data guru, siswa, kelas, dan modul soal tetap aman 100%.</b>
                </p>
              </div>
            </button>

            {/* 2. Submissions only (Recommended for starting new assessment session) */}
            <button
              type="button"
              onClick={() => setResetType('submissions')}
              className={`w-full p-3.5 text-left rounded-2xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
                resetType === 'submissions'
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded-full border-4 flex items-center justify-center ${
                resetType === 'submissions' ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300'
              }`}>
                {resetType === 'submissions' && <div className="w-1 h-1 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">Mulai Baru (Reset Nilai & Grafik ke 0)</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-100 text-indigo-700">
                    Sesi Baru
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Mengosongkan semua lembar jawaban terunggah, nilai siswa, diagram batang, garis, dan persentase ketuntasan kembali ke <span className="font-bold text-slate-700">0</span>.
                </p>
              </div>
            </button>

            {/* 3. Complete System Reset */}
            <button
              type="button"
              onClick={() => setResetType('all')}
              className={`w-full p-3.5 text-left rounded-2xl border-2 transition-all flex items-start gap-3 cursor-pointer ${
                resetType === 'all'
                  ? 'border-rose-600 bg-rose-50/40 shadow-xs'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`mt-0.5 w-4 h-4 rounded-full border-4 flex items-center justify-center ${
                resetType === 'all' ? 'border-rose-600 bg-rose-600' : 'border-slate-300'
              }`}>
                {resetType === 'all' && <div className="w-1 h-1 rounded-full bg-white" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-900">Reset Total Seluruh Sistem</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-100 text-rose-700">
                    Tindakan Ekstrim
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  Menghapus total seluruh data sistem dan mengembalikannya ke setelan pabrik awal.
                </p>
              </div>
            </button>
          </div>

          {/* Confirmation Password input for Complete Reset */}
          {resetType === 'all' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="overflow-hidden"
            >
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 mb-4 text-xs text-rose-800">
                Ketik kata <span className="font-mono font-bold text-rose-900">BERSIHKAN</span> pada kolom di bawah untuk konfirmasi reset total:
              </div>

              <input
                type="text"
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value)}
                placeholder="Ketik BERSIHKAN di sini..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold mb-4 focus:ring-2 focus:ring-rose-500 focus:outline-hidden"
              />
            </motion.div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 shrink-0">
            <button
              type="button"
              disabled={resetting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Batalkan
            </button>
            <button
              type="button"
              disabled={resetting || (resetType === 'all' && confirmWord !== 'BERSIHKAN')}
              onClick={handleReset}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                resetType === 'cleanup'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : resetType === 'submissions'
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {resetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sedang Diproses...</span>
                </>
              ) : (
                <>
                  {resetType === 'cleanup' ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Bersihkan Sampah Sistem Sekarang</span>
                    </>
                  ) : resetType === 'submissions' ? (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Kosongkan Hasil Koreksi (Mulai Baru)</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Reset Total Seluruh Sistem</span>
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
