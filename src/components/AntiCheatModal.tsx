import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert,
  AlertTriangle,
  Lock,
  Volume2,
  VolumeX,
  KeyRound,
  CheckCircle2,
  XCircle,
  Smartphone,
  Info,
  ArrowRight,
  ShieldX,
  UserX,
  HelpCircle,
} from 'lucide-react';
import { AntiCheatWarningData } from '../hooks/useAntiCheatCBT';

export interface AntiCheatModalProps {
  // Modal visibility flags
  showWarningModal: boolean;
  warningData: AntiCheatWarningData | null;
  showLockModal: boolean;
  showBlockModal: boolean;
  isAlarmPlaying: boolean;

  // Actions
  onDismissWarning: () => void;
  onStopAlarm: () => void;
  onVerifyPin: (enteredPin: string) => { success: boolean; message: string };

  // Context info
  studentName?: string;
  studentClass?: string;
  nisn?: string;
  violationCount: number;
}

export const AntiCheatModal: React.FC<AntiCheatModalProps> = ({
  showWarningModal,
  warningData,
  showLockModal,
  showBlockModal,
  isAlarmPlaying,
  onDismissWarning,
  onStopAlarm,
  onVerifyPin,
  studentName = 'Peserta Ujian',
  studentClass = 'Kelas',
  nisn = '',
  violationCount,
}) => {
  // PIN input form state for Cycle 1
  const [isEnteringPin, setIsEnteringPin] = useState(false);
  const [pinDigits, setPinDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccess, setPinSuccess] = useState<string | null>(null);
  const [isSubmittingPin, setIsSubmittingPin] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Reset PIN form when modal opens
  useEffect(() => {
    if (showLockModal) {
      setIsEnteringPin(false);
      setPinDigits(['', '', '', '', '', '']);
      setPinError(null);
      setPinSuccess(null);
    }
  }, [showLockModal]);

  // Handle clicking "Masukkan PIN Pengawas" -> MUST stop alarm immediately!
  const handleOpenPinInput = () => {
    onStopAlarm(); // Immediately stop the siren audio!
    setIsEnteringPin(true);
    setPinError(null);
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 150);
  };

  // 6-digit input handlers
  const handleDigitChange = (index: number, val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(-1);
    const nextDigits = [...pinDigits];
    nextDigits[index] = cleaned;
    setPinDigits(nextDigits);
    setPinError(null);

    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pinDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const nextDigits = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) {
      nextDigits[i] = pasted[i];
    }
    setPinDigits(nextDigits);
    const nextFocusIdx = Math.min(pasted.length, 5);
    inputRefs.current[nextFocusIdx]?.focus();
  };

  const handleSubmitPin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullPin = pinDigits.join('');
    if (fullPin.length !== 6) {
      setPinError('Masukkan 6 digit angka PIN Pengawas secara lengkap.');
      return;
    }

    setIsSubmittingPin(true);
    setPinError(null);

    const result = onVerifyPin(fullPin);
    if (result.success) {
      setPinSuccess(result.message);
      setTimeout(() => {
        setIsSubmittingPin(false);
      }, 500);
    } else {
      setPinError(result.message);
      setIsSubmittingPin(false);
    }
  };

  // =========================================================================
  // VIEW 1: PERMANENT BLOCK SCREEN (STRIKE 6 - SIKLUS 2 HARD LOCK)
  // =========================================================================
  if (showBlockModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="bg-gradient-to-b from-rose-950 via-slate-900 to-slate-950 border-2 border-rose-600 rounded-3xl max-w-xl w-full p-6 sm:p-8 text-white shadow-2xl shadow-rose-950/60 relative overflow-hidden"
        >
          {/* Pulsing red badge */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col items-center text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-rose-600/25 border-2 border-rose-500 flex items-center justify-center shadow-lg shadow-rose-600/30 animate-bounce">
              <ShieldX className="w-10 h-10 text-rose-300" />
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-rose-600 text-white shadow-md">
              <UserX className="w-4 h-4" />
              <span>Hard Lock &bull; Terblokir Otomatis</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-rose-200 tracking-tight leading-snug">
              AKSES UJIAN &amp; LOGIN ANDA DIBLOKIR OTOMATIS
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Anda telah melanggar aturan keamanan ujian sebanyak <strong>2x3 kali (Total 6 Pelanggaran)</strong>. Sesuai protokol integritas asesmen, sesi pengerjaan dihentikan dan akun ujian Anda dikunci permanen.
            </p>

            {/* Student Data Card */}
            <div className="w-full bg-slate-900/90 border border-rose-900/60 rounded-2xl p-4 text-left space-y-2 text-xs">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">Nama Peserta:</span>
                <span className="font-black text-white uppercase">{studentName}</span>
              </div>
              <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                <span className="text-slate-400 font-bold">Kelas / Rombel:</span>
                <span className="font-black text-amber-300">{studentClass}</span>
              </div>
              {nisn && (
                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                  <span className="text-slate-400 font-bold">NISN:</span>
                  <span className="font-mono font-bold text-slate-200">{nisn}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold">Status Keamanan:</span>
                <span className="px-2 py-0.5 rounded-md font-black bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  BLOCKED_PERMANENT (6 Strikes)
                </span>
              </div>
            </div>

            {/* Critical Info Box */}
            <div className="w-full bg-rose-950/70 border border-rose-500/40 rounded-2xl p-4 text-left space-y-1.5 text-xs text-rose-200">
              <div className="flex items-center gap-2 font-black text-white text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>PIN Pengawas Ruang Tidak Berlaku Lagi!</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Pemblokiran ini telah disinkronkan ke server pusat. Hanya <strong>Admin, Operator, atau Proktor</strong> yang dapat membuka kembali akses Anda melalui <strong>Dashboard Pusat Manajemen Ujian</strong>.
              </p>
            </div>

            <div className="pt-2 text-[11px] text-slate-400 italic">
              Harap segera melapor dan menghadap ke Meja Proktor / Pengawas Ruang.
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: CYCLE 1 LOCKED MODAL (STRIKE 3 - ALARM + 6-DIGIT PIN INPUT)
  // =========================================================================
  if (showLockModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-white border-2 border-amber-400 rounded-3xl max-w-lg w-full overflow-hidden text-slate-900 shadow-2xl shadow-amber-950/50"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 p-5 sm:p-6 text-white relative">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-lg animate-pulse">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/25 text-white border border-white/30">
                    Siklus 1: Terkunci (3/3)
                  </span>
                  <h3 className="text-lg font-black text-white mt-0.5 leading-snug">
                    UJIAN TERKUNCI!
                  </h3>
                </div>
              </div>

              {/* Siren status badge */}
              {isAlarmPlaying && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/30 border border-white/30 text-white text-[11px] font-extrabold animate-pulse">
                  <Volume2 className="w-4 h-4 text-amber-200" />
                  <span>Sirine Aktif</span>
                </div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 space-y-4">
            {!isEnteringPin ? (
              // Initial State: Notification + Button to turn off siren & open PIN form
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-amber-950 space-y-2">
                  <div className="flex items-center justify-center gap-2 font-black text-amber-900 text-sm">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>3 KALI PELANGGARAN TERDETEKSI</span>
                  </div>
                  <p className="text-xs leading-relaxed font-semibold text-slate-700">
                    Anda telah melakukan 3 kali pelanggaran (keluar browser / layar terbelah). Layar ujian dikunci dan alarm sirine berbunyi di perangkat HP Anda.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 text-left space-y-1">
                  <span className="font-bold text-slate-800 block">Langkah Pembukaan Kunci:</span>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600">
                    <li>Klik tombol <strong>&ldquo;Masukkan PIN Pengawas&rdquo;</strong> di bawah untuk <strong>langsung mematikan bunyi alarm</strong>.</li>
                    <li>Minta <strong>6-digit PIN Pengawas</strong> resmi kepada Pengawas Ruang Anda.</li>
                    <li>Masukkan PIN untuk melanjutkan ujian.</li>
                  </ol>
                </div>

                <button
                  type="button"
                  onClick={handleOpenPinInput}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-700 text-white font-black text-sm shadow-xl shadow-amber-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                >
                  <KeyRound className="w-5 h-5" />
                  <span>Masukkan PIN Pengawas (Matikan Alarm)</span>
                </button>
              </div>
            ) : (
              // PIN Entry Form: Alarm stopped, 6-digit input
              <form onSubmit={handleSubmitPin} className="space-y-4">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <KeyRound className="w-4 h-4 text-amber-600" />
                    <span>Input 6-Digit PIN Pengawas:</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-bold">Alarm Dimatikan</span>
                </div>

                {/* 6 Digit Inputs */}
                <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                  {pinDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => {
                        inputRefs.current[idx] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      onPaste={handlePaste}
                      className="w-11 h-14 sm:w-12 sm:h-16 text-center text-xl sm:text-2xl font-black font-mono rounded-2xl border-2 border-slate-300 focus:border-amber-500 focus:bg-amber-50/50 outline-hidden transition-all shadow-inner text-slate-900"
                    />
                  ))}
                </div>

                {pinError && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{pinError}</span>
                  </motion.div>
                )}

                {pinSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{pinSuccess}</span>
                  </motion.div>
                )}

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    PIN 6-digit dibuat dan dikelola oleh Panitia / Pengawas Ruang pada Dashboard Manajemen Ujian.
                  </span>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={isSubmittingPin || pinDigits.some((d) => !d)}
                    className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmittingPin ? 'Memverifikasi...' : 'Buka Kunci Ujian'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 3: EARLY WARNING MODAL (STRIKES 1, 2, 4, 5)
  // =========================================================================
  if (showWarningModal && warningData) {
    const isCycle2 = warningData.cycle === 2;
    const remainingInCycle = isCycle2 ? 3 - warningData.cycleStrike : 3 - warningData.cycleStrike;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className={`bg-white border-2 rounded-3xl max-w-md w-full overflow-hidden text-slate-900 shadow-2xl ${
            isCycle2 ? 'border-rose-400 shadow-rose-950/40' : 'border-amber-300 shadow-amber-950/30'
          }`}
        >
          {/* Header Banner */}
          <div
            className={`p-5 text-white ${
              isCycle2
                ? 'bg-gradient-to-r from-rose-600 via-red-600 to-orange-600'
                : 'bg-gradient-to-r from-amber-600 to-orange-600'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/25 text-white border border-white/30">
                  {isCycle2
                    ? `Peringatan Kritis (Siklus 2: ${warningData.cycleStrike}/3)`
                    : `Peringatan Dini (${warningData.cycleStrike}/3)`}
                </span>
                <h3 className="text-base font-black text-white mt-0.5 leading-snug">
                  Peringatan Pelanggaran {warningData.strike}/6
                </h3>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 space-y-3.5 text-xs">
            <div
              className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                isCycle2
                  ? 'bg-rose-50 border-rose-200 text-rose-950'
                  : 'bg-amber-50 border-amber-200 text-amber-950'
              }`}
            >
              <div className="font-black text-xs flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{warningData.reason}</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-700">
                {warningData.detail}
              </p>
            </div>

            {/* Tolerance Tracker Box */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 text-slate-700">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold">Total Pelanggaran:</span>
                <span className="font-black text-slate-900">{warningData.strike} dari 6 kali</span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold">Sisa Toleransi Siklus:</span>
                <span
                  className={`font-black ${
                    remainingInCycle === 1 ? 'text-rose-600 animate-pulse' : 'text-amber-600'
                  }`}
                >
                  {remainingInCycle} kali lagi sebelum {isCycle2 ? 'BLOKIR PERMANEN' : 'KUNCI UJIAN'}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-1.5 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    isCycle2 ? 'bg-rose-600' : 'bg-amber-500'
                  }`}
                  style={{ width: `${(warningData.strike / 6) * 100}%` }}
                />
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed italic">
              Aktivitas ini tercatat secara otomatis pada log pengawasan Proktor. Harap tetap berada di halaman ujian penuh dan hindari tombol keluar atau membuka aplikasi lain!
            </p>

            <button
              type="button"
              onClick={onDismissWarning}
              className={`w-full py-3 px-4 rounded-xl font-black text-xs text-white shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                isCycle2
                  ? 'bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 shadow-rose-600/25'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 shadow-amber-600/25'
              }`}
            >
              <span>Saya Mengerti &amp; Kembali ke Ujian</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
};
