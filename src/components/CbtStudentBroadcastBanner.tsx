import React, { useState, useEffect } from 'react';
import {
  Info,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  X,
  Volume2,
  Clock,
  ShieldAlert,
  Radio,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExamBroadcast } from '../types';
import { subscribeToActiveExamBroadcast, acknowledgeExamBroadcast } from '../utils/cbtBroadcastHelper';

interface CbtStudentBroadcastBannerProps {
  studentId: string;
  studentName?: string;
  examType?: 'CBT_UMUM' | 'CBT_LITNUM';
  sessionName?: string;
  roomName?: string;
  onTimeExtensionReceived?: (minutes: number) => void;
}

export const CbtStudentBroadcastBanner: React.FC<CbtStudentBroadcastBannerProps> = ({
  studentId,
  studentName,
  examType = 'CBT_UMUM',
  sessionName,
  roomName,
  onTimeExtensionReceived,
}) => {
  const [activeBroadcast, setActiveBroadcast] = useState<ExamBroadcast | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastAckId, setLastAckId] = useState<string>(() => {
    return localStorage.getItem(`simantri_ack_bc_${studentId}`) || '';
  });

  // Listener hemat kuota (1 dokumen Firestore)
  useEffect(() => {
    const unsubscribe = subscribeToActiveExamBroadcast((broadcast) => {
      if (!broadcast || !broadcast.isActive) {
        setActiveBroadcast(null);
        return;
      }

      // Filter target audiens apakah berlaku untuk siswa ini
      let isForThisStudent = true;
      if (broadcast.targetType === 'EXAM_TYPE' && broadcast.targetExamType && broadcast.targetExamType !== 'ALL') {
        if (broadcast.targetExamType !== examType) isForThisStudent = false;
      }
      if (broadcast.targetType === 'SESSION' && broadcast.targetSession && sessionName) {
        if (!sessionName.toLowerCase().includes(broadcast.targetSession.toLowerCase())) {
          isForThisStudent = false;
        }
      }
      if (broadcast.targetType === 'ROOM' && broadcast.targetRoom && roomName) {
        if (!roomName.toLowerCase().includes(broadcast.targetRoom.toLowerCase())) {
          isForThisStudent = false;
        }
      }
      if (broadcast.targetType === 'SPECIFIC_STUDENTS' && broadcast.targetStudentIds) {
        if (!broadcast.targetStudentIds.includes(studentId)) {
          isForThisStudent = false;
        }
      }

      if (isForThisStudent) {
        setActiveBroadcast(broadcast);
        setIsDismissed(false);

        // Jika ada kompensasi penambahan waktu
        if (broadcast.timeExtensionMinutes && broadcast.timeExtensionMinutes > 0) {
          const extKey = `simantri_bc_ext_applied_${broadcast.id}_${studentId}`;
          if (!localStorage.getItem(extKey)) {
            localStorage.setItem(extKey, 'true');
            onTimeExtensionReceived?.(broadcast.timeExtensionMinutes);
          }
        }
      } else {
        setActiveBroadcast(null);
      }
    });

    return () => unsubscribe();
  }, [studentId, examType, sessionName, roomName, onTimeExtensionReceived]);

  if (!activeBroadcast || !activeBroadcast.isActive) return null;

  const isEmergency = activeBroadcast.priority === 'DARURAT';
  const isWarning = activeBroadcast.priority === 'PERINGATAN';
  const isInfo = activeBroadcast.priority === 'INFO';

  // Jika siswa sudah konfirmasi modal darurat ini, jangan munculkan modal pop-up lagi
  const hasAcknowledgedEmergency = isEmergency && lastAckId === activeBroadcast.id;

  const handleAcknowledge = async () => {
    setLastAckId(activeBroadcast.id);
    localStorage.setItem(`simantri_ack_bc_${studentId}`, activeBroadcast.id);
    await acknowledgeExamBroadcast(studentId);
  };

  // 1. POP-UP MODAL DARURAT / KENDALA TEKNIS (Wajib Konfirmasi)
  if (isEmergency && !hasAcknowledgedEmergency) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/85 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="w-full max-w-xl bg-white rounded-3xl shadow-2xl border-4 border-rose-500 overflow-hidden relative"
          >
            {/* Header Merah Tegas Berkedip */}
            <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 p-5 sm:p-6 text-white text-center space-y-2">
              <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 text-white flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <AlertOctagon className="w-9 h-9 stroke-[2.5]" />
              </div>
              <span className="px-3.5 py-1 rounded-full text-[11px] font-black uppercase tracking-widest bg-white text-rose-950 inline-block shadow-sm">
                PEMBERITAHUAN DARURAT CBT
              </span>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                {activeBroadcast.title}
              </h2>
            </div>

            {/* Konten Pesan Darurat */}
            <div className="p-6 sm:p-7 space-y-5 text-slate-800">
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                <p className="text-xs sm:text-sm font-bold text-slate-900 leading-relaxed">
                  {activeBroadcast.message}
                </p>
              </div>

              {/* Jaminan Keamanan Data Siswa */}
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-xs font-bold text-emerald-900">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Jawaban Anda aman tersimpan di perangkat lokal. Jangan menutup browser atau mematikan perangkat Anda.
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium border-t border-slate-100 pt-3">
                <span>Pengirim: <strong>{activeBroadcast.createdByName}</strong> ({activeBroadcast.createdByRole.toUpperCase()})</span>
                <span className="font-mono">{new Date(activeBroadcast.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</span>
              </div>

              {/* Tombol Konfirmasi Wajib */}
              <button
                type="button"
                onClick={handleAcknowledge}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-sm shadow-xl shadow-rose-600/30 flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Saya Mengerti / Mengkonfirmasi Instruksi Ini</span>
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  // 2. FLOATING BANNER / MARQUEE DI ATAS LAYAR UNTUK INFO & PERINGATAN (Tidak menutupi lembar soal)
  if (isDismissed) {
    return (
      <div className="fixed top-3 right-4 z-40">
        <button
          type="button"
          onClick={() => setIsDismissed(false)}
          className={`px-3 py-1.5 rounded-xl font-black text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all active:scale-95 border ${
            isEmergency
              ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
              : isWarning
              ? 'bg-amber-400 text-slate-950 border-amber-500'
              : 'bg-indigo-600 text-white border-indigo-700'
          }`}
          title="Tampilkan kembali pengumuman proktor"
        >
          <Radio className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} />
          <span>Pengumuman Pengawas</span>
        </button>
      </div>
    );
  }

  const bgStyle = isEmergency
    ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white border-rose-500 shadow-rose-600/20'
    : isWarning
    ? 'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600 text-slate-950 border-amber-400 shadow-amber-500/20'
    : 'bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-700 text-white border-indigo-500 shadow-indigo-600/20';

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      className={`rounded-2xl border-2 p-3.5 sm:p-4 shadow-lg mb-4 transition-all relative overflow-hidden ${bgStyle}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              isWarning ? 'bg-slate-950/15 text-slate-950' : 'bg-white/20 text-white'
            }`}
          >
            {isEmergency ? (
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            ) : isWarning ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span
                className={`px-2 py-0.5 rounded-md text-[9.5px] font-black uppercase tracking-wider ${
                  isWarning ? 'bg-slate-950 text-amber-300' : 'bg-white text-slate-900'
                }`}
              >
                {activeBroadcast.priority} • PENGUMUMAN UJIAN
              </span>
              <span className="text-[10.5px] font-bold opacity-85 truncate">
                Oleh {activeBroadcast.createdByName} ({activeBroadcast.createdByRole.toUpperCase()})
              </span>
            </div>

            <h4 className="font-black text-xs sm:text-sm tracking-tight leading-snug">
              {activeBroadcast.title}
            </h4>

            {isExpanded && (
              <p
                className={`text-xs mt-1 leading-relaxed font-medium ${
                  isWarning ? 'text-slate-900' : 'text-slate-100'
                }`}
              >
                {activeBroadcast.message}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
            title={isExpanded ? 'Ringkaskan pesan' : 'Perluas pesan'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-1.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
            title="Sembunyikan ke pojok kanan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
