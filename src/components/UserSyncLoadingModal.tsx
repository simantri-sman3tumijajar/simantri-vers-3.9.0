import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Loader2, ShieldCheck, CheckCircle2, UserCheck, Sparkles, Cpu, Database, Activity } from 'lucide-react';

interface UserSyncLoadingModalProps {
  userProfile: {
    nama: string;
    role?: string;
    kelas?: string;
    username?: string;
    nisn?: string;
  };
  onComplete: () => void;
}

export const UserSyncLoadingModal: React.FC<UserSyncLoadingModalProps> = ({
  userProfile,
  onComplete,
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    'Memverifikasi otentikasi akun & hak akses...',
    'Menyinkronkan data profil pengguna & pangkalan data SMAN 3 Tumijajar...',
    'Mengunduh jadwal asesmen, bank soal & modul Literasi-Numerasi...',
    'Menyiapkan antarmuka portal layanan terpadu...'
  ];

  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 5;
      if (currentProgress >= 100) {
        setProgress(100);
        clearInterval(interval);
        setTimeout(() => {
          onComplete();
        }, 300);
      } else {
        setProgress(currentProgress);
        if (currentProgress > 75) {
          setCurrentStep(3);
        } else if (currentProgress > 50) {
          setCurrentStep(2);
        } else if (currentProgress > 25) {
          setCurrentStep(1);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 15 }}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-md w-full p-6 text-center relative overflow-hidden"
      >
        {/* Background decorative radiant glow */}
        <div className="absolute -top-24 -right-24 w-60 h-60 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 rounded-full bg-sky-500/10 blur-2xl pointer-events-none" />

        {/* Top Header Logo & Badges */}
        <div className="flex items-center justify-center gap-3 mb-5">
          <img
            src="https://iili.io/n1vlpFS.png"
            alt="Logo Provinsi"
            className="h-10 w-auto object-contain drop-shadow-2xs"
          />
          <div className="h-6 w-px bg-slate-200" />
          <img
            src="https://iili.io/n1vlf2t.png"
            alt="Logo SMAN 3 Tumijajar"
            className="h-10 w-auto object-contain drop-shadow-2xs"
          />
        </div>

        {/* Outer Circular Animated Spinner */}
        <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
          <div 
            className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"
            style={{ animationDuration: '1s' }}
          />
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shadow-xs">
            <UserCheck className="w-7 h-7" />
          </div>
        </div>

        {/* Welcome Name & Role Badge */}
        <div className="space-y-1 mb-5">
          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Sparkles className="w-3 h-3 text-indigo-600" />
            Sinkronisasi Profil Pengguna
          </span>
          <h3 className="text-lg font-black text-slate-900 tracking-tight leading-snug">
            {userProfile.nama}
          </h3>
          <p className="text-xs text-slate-500 font-bold">
            {userProfile.kelas ? `Siswa Kelas ${userProfile.kelas}` : userProfile.role ? `Role: ${userProfile.role}` : 'Pengguna Terverifikasi'}
          </p>
        </div>

        {/* Progress Bar & Step Text */}
        <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1.5 text-indigo-700">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>SINKRONISASI DATA</span>
            </span>
            <span className="font-mono font-black text-indigo-600">{progress}%</span>
          </div>

          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden p-0.5 shadow-inner">
            <motion.div
              className="bg-gradient-to-r from-indigo-600 via-sky-500 to-indigo-700 h-full rounded-full transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>

          <p className="text-[11.5px] text-slate-600 font-semibold leading-relaxed min-h-[36px] flex items-center justify-center">
            {steps[currentStep]}
          </p>
        </div>

        {/* Footer Security Badge */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10.5px] text-emerald-800 font-bold">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Sesi Akademik Resmi SMAN 3 Tumijajar</span>
        </div>
      </motion.div>
    </div>
  );
};
