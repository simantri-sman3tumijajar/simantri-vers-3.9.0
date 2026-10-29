import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Wrench, RefreshCw, LogOut, ShieldCheck, Sparkles, Building, Lock } from 'lucide-react';
import { motion } from 'motion/react';

interface MaintenanceScreenProps {
  onLogout: () => void;
}

export const MaintenanceScreen: React.FC<MaintenanceScreenProps> = ({ onLogout }) => {
  const { state, currentUser, refreshState } = useApp();
  const [checking, setChecking] = useState(false);

  // Auto-scroll to top immediately when Maintenance Screen mounts
  useEffect(() => {
    const doScroll = () => {
      window.scrollTo({ top: 0, behavior: 'auto' });
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
      if (document.documentElement) {
        document.documentElement.scrollTo({ top: 0, behavior: 'auto' });
      }
      if (document.body) {
        document.body.scrollTo({ top: 0, behavior: 'auto' });
      }
    };
    doScroll();
    const t1 = setTimeout(doScroll, 50);
    const t2 = setTimeout(doScroll, 150);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const school = state?.schoolInfo;
  const message =
    school?.maintenanceMessage ||
    'Sistem SiMantri (Sistem Informasi Akademik SMAN 3 Tumijajar) sedang dalam pemeliharaan dan pembaruan sistem secara berkala oleh Administrator via Google AI Studio. Seluruh data nilai, soal, tugas, dan berita acara tetap aman dan tersimpan.';

  const handleCheckStatus = async () => {
    setChecking(true);
    await refreshState();
    setTimeout(() => {
      setChecking(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/40 to-indigo-50/60 text-slate-800 flex flex-col justify-between p-4 sm:p-6 md:p-8 relative font-sans">
      {/* Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[500px] h-96 sm:h-[500px] bg-amber-200/40 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl" />
      </div>

      {/* Top Bar Logo & School Brand */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between gap-4 z-10">
        <div className="flex items-center gap-3">
          <img
            src={school?.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
            alt="Logo Sekolah"
            className="h-10 w-auto object-contain drop-shadow-sm"
          />
          <div>
            <h1 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight">
              {school?.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
            </h1>
            <p className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>Sistem Asesmen & Koreksi Lembar Jawaban AI</span>
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 bg-white/90 px-3.5 py-1.5 rounded-full border border-amber-200 text-xs text-amber-900 font-bold shadow-xs">
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          <span>Akses Terkunci Sementara</span>
        </div>
      </div>

      {/* Main Maintenance Notice Card */}
      <div className="max-w-2xl w-full mx-auto my-auto py-8 z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="bg-white/95 backdrop-blur-xl border border-amber-200/90 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-slate-200/80 space-y-6 text-center relative overflow-hidden"
        >
          {/* Header Icon */}
          <div className="relative mx-auto w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white flex items-center justify-center shadow-xl shadow-amber-500/20">
            <Wrench className="w-10 h-10 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-white border-2 border-amber-500 flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            </div>
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black uppercase tracking-wider shadow-2xs">
              <Wrench className="w-3.5 h-3.5" />
              Pemeliharaan Sistem Aktif
            </span>

            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Sistem Sedang Dalam Pemeliharaan Berkala
            </h2>

            <p className="text-sm text-slate-800 leading-relaxed max-w-lg mx-auto pt-1 font-semibold">
              {message}
            </p>
          </div>

          {/* Info Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 space-y-1">
              <span className="text-[10px] text-slate-700 font-black uppercase tracking-wider block">Pengguna Aktif:</span>
              <p className="font-extrabold text-slate-950 text-sm truncate">{currentUser?.nama || 'Pengguna'}</p>
              <p className="text-[11px] text-amber-800 font-bold uppercase">{currentUser?.role?.replace('_', ' ')}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-100 border border-slate-300 space-y-1">
              <span className="text-[10px] text-slate-700 font-black uppercase tracking-wider block">Proteksi Data:</span>
              <p className="font-extrabold text-emerald-800 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Data Aman di Cloud</span>
              </p>
              <p className="text-[11px] text-slate-700 font-bold">Arsip &amp; rekap tetap utuh 100%</p>
            </div>
          </div>

          {/* Rules & Jaminan Layanan Pemeliharaan */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-700 text-left space-y-2 shadow-md">
            <span className="text-xs text-amber-300 font-black uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Rules Manajemen Pemeliharaan Sistem (Jaminan Keamanan):</span>
            </span>
            <ul className="text-xs text-slate-200 space-y-1.5 list-disc list-inside font-medium leading-relaxed">
              <li>Seluruh nilai rapor (ASTS/ASAS), bank soal, dan berita acara dijamin tersimpan aman dan tidak akan hilang (Zero Data Loss).</li>
              <li>Akses portal untuk Guru Mapel, Operator, dan Kepala Sekolah akan otomatis pulih seketika setelah Administrator menyelesaikan pembaruan sistem.</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
              <span>{checking ? 'Memeriksa Status...' : 'Cek Status Sistem Terbaru'}</span>
            </button>

            <button
              onClick={onLogout}
              className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm border border-slate-300 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar Sementara</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="max-w-4xl w-full mx-auto text-center text-xs text-slate-500 z-10 pt-4 border-t border-slate-200">
        <p>© 2026 SMAN 3 Tumijajar • Pemeliharaan Sistem Diselenggarakan Oleh Administrator Sekolah</p>
      </div>
    </div>
  );
};
