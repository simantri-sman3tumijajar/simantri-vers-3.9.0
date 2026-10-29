import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Sparkles,
  Smartphone,
  BadgeCheck,
  Power,
  Radio,
  ArrowRight,
  ShieldCheck,
  LogOut,
  GraduationCap,
  Calculator,
  BookOpen,
  Construction,
  Clock,
  ArrowLeft,
  Wifi,
  Activity,
  Cpu,
  Signal,
  FolderCog,
  Database,
  Sliders,
  Users,
  HeartHandshake,
  UserCheck,
  Compass,
  CalendarDays,
  Laptop,
  BookOpenCheck,
  TrendingUp,
  FileSpreadsheet,
  UploadCloud,
  Layers,
  Calendar,
  ChevronRight,
  Lock,
  LockOpen,
  AlertCircle,
  X,
  ShieldAlert,
  DoorOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminDeveloperHub } from './AdminDeveloperHub';
import { smartNetworkAdapter } from '../utils/networkAdapter';
import { AppModuleType } from '../utils/urlRouter';
import { evaluateLitNumSchedule } from '../utils/litnumScheduleHelper';
import { getActiveDutyForTeacher } from '../utils/examRoomAndNumberHelper';
import { LoginFooter } from './LoginFooter';
import { scrollToTop } from '../utils/scrollHelper';
import { isUserProctor } from '../types';

interface PortalSelectionViewProps {
  selectedModule: AppModuleType;
  onSelectModule: (module: AppModuleType) => void;
  onLogout: () => void;
}

export const PortalSelectionView: React.FC<PortalSelectionViewProps> = ({
  selectedModule,
  onSelectModule,
  onLogout,
}) => {
  const { state, currentUser, setCurrentView, setActiveLitNumTab, updateSchoolInfo, showToast, setSelectedModule } = useApp();
  const { t } = useLanguage();
  const school = state?.schoolInfo;

  // Real-time clock for live schedule evaluation every 30 seconds
  const [currentEvalTime, setCurrentEvalTime] = useState(() => new Date());
  useEffect(() => {
    scrollToTop({ smooth: true });
    const timer = setInterval(() => {
      setCurrentEvalTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const liveSchedule = evaluateLitNumSchedule(state?.litnumScheduleConfig, currentEvalTime);

  const isGlobalProctorActive = Boolean(state?.schoolInfo?.globalProctorMode);
  const liveCurrentUser = React.useMemo(() => {
    if (!currentUser) return null;
    return state?.teachers?.find((t) => t.id === currentUser.id) || currentUser;
  }, [state?.teachers, currentUser]);

  const isTeacherProctorEnabled = Boolean(liveCurrentUser?.isProctorEnabled || liveCurrentUser?.supervisorAccess);
  const isAdminOrOperator = Boolean(
    currentUser?.role === 'admin' ||
    currentUser?.role === 'operator' ||
    currentUser?.isAdmin ||
    currentUser?.isOperator
  );
  const isProctorRole = isUserProctor(liveCurrentUser);
  // Reactive State: Guru Mapel has access if Global Mode is ON OR individual permission is ON
  const canGuruAccessProctor = Boolean(isGlobalProctorActive || isTeacherProctorEnabled);

  const activeDutySlot = React.useMemo(() => {
    if (!liveCurrentUser?.id || !state?.examManagement?.proctorSchedules) return null;
    return getActiveDutyForTeacher(state.examManagement.proctorSchedules, liveCurrentUser.id, currentEvalTime);
  }, [state?.examManagement?.proctorSchedules, liveCurrentUser?.id, currentEvalTime]);

  const handleQuickToggleGlobalProctor = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdminOrOperator && !isProctorRole) {
      showToast('Akses Terbatas', 'Hanya Admin, Operator, dan Proktor yang berwenang mengubah izin pengawas.', 'warning');
      return;
    }
    const nextMode = !isGlobalProctorActive;
    await updateSchoolInfo({ globalProctorMode: nextMode });
    showToast(
      nextMode ? 'Izin Pengawas Ujian Diaktifkan' : 'Izin Pengawas Ujian Dinonaktifkan',
      nextMode
        ? 'Fitur Pengawas Ujian CBT berhasil diaktifkan. Tombol Portal Pengawas Ujian kini otomatis muncul secara real-time di seluruh akun Guru Mapel.'
        : 'Seluruh akses Portal Pengawas Ujian bagi akun Guru Mapel dinonaktifkan secara serentak.',
      nextMode ? 'success' : 'info'
    );
  };


  const isGuruBK = Boolean(
    currentUser?.isGuruBK ||
    currentUser?.mataPelajaran?.some(
      (m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'
    )
  );
  const isGuruMapel = Boolean(
    currentUser?.isGuruMapel ??
    (!isGuruBK || (currentUser?.mataPelajaran && currentUser?.mataPelajaran.filter((m) => !m.toLowerCase().includes('bimbingan')).length > 0))
  );

  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingTarget, setLoadingTarget] = useState<AppModuleType | null>(null);
  const [isFormatifLockedModalOpen, setIsFormatifLockedModalOpen] = useState(false);
  const [isRekapNilaiLockedModalOpen, setIsRekapNilaiLockedModalOpen] = useState(false);
  const [networkInfo, setNetworkInfo] = useState({
    rtt: 0,
    downlink: 0,
    effectiveType: 'unknown',
    measuredLatency: 0,
    connectionLabel: 'Mengukur koneksi...',
    speedLabel: 'Mengambil data...',
    simulatedDuration: 1500,
  });

  const handleModuleSelection = async (module: AppModuleType) => {
    setIsLoading(true);
    setLoadingProgress(0);
    setLoadingTarget(module);

    const startTime = performance.now();
    let measuredLatency = 100; // default

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      
      // Perform a real connection check by fetching an actual local resource with a cache buster
      await fetch('/index.html?cb=' + Date.now(), {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      measuredLatency = Math.round(performance.now() - startTime);
      smartNetworkAdapter.recordLatency(measuredLatency);
    } catch (e) {
      console.warn("Network ping failed, using estimated connection details:", e);
      measuredLatency = 250; // fallback slower latency
    }

    // Get navigator connection api
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const effectiveType = conn?.effectiveType || 'unknown';
    const downlink = conn?.downlink || 0; // Mbps

    let connectionLabel = 'Koneksi Jaringan Aktif';
    let speedLabel = 'Mengoptimalkan sinkronisasi...';
    let duration = 1200; // ms

    if (effectiveType === '4g' || downlink > 5 || measuredLatency < 120) {
      connectionLabel = 'Koneksi Sangat Cepat (LTE/Wi-Fi)';
      speedLabel = `${downlink ? `${downlink} Mbps · ` : ''}Latensi Jaringan: ${measuredLatency}ms (Sangat Responsif)`;
      duration = Math.max(900, Math.min(1300, measuredLatency * 3 + 400));
    } else if (effectiveType === '3g' || (downlink > 1 && downlink <= 5) || (measuredLatency >= 120 && measuredLatency < 350)) {
      connectionLabel = 'Koneksi Sedang (3G/HSPA)';
      speedLabel = `${downlink ? `${downlink} Mbps · ` : ''}Latensi Jaringan: ${measuredLatency}ms (Stabil)`;
      duration = Math.max(1600, Math.min(2200, measuredLatency * 2.5 + 700));
    } else if (effectiveType === '2g' || effectiveType === 'slow-2g' || (downlink > 0 && downlink <= 1) || measuredLatency >= 350) {
      connectionLabel = 'Koneksi Lambat (2G/EDGE)';
      speedLabel = `${downlink ? `${downlink} Mbps · ` : ''}Latensi Jaringan: ${measuredLatency}ms (Harap Tunggu)`;
      duration = Math.max(2600, Math.min(3800, measuredLatency * 2 + 1000));
    } else {
      // Offline/unknown fallback but successfully loaded page
      connectionLabel = 'Koneksi Terhubung';
      speedLabel = `Latensi Server: ${measuredLatency}ms`;
      duration = 1100;
    }

    setNetworkInfo({
      rtt: conn?.rtt || 0,
      downlink: downlink,
      effectiveType: effectiveType,
      measuredLatency,
      connectionLabel,
      speedLabel,
      simulatedDuration: duration
    });

    // Run animation interval
    const totalSteps = 25;
    const stepInterval = duration / totalSteps;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      // Nice progressive curve for loading bar
      const progress = Math.min(100, Math.round((currentStep / totalSteps) * 100));
      setLoadingProgress(progress);

      if (currentStep >= totalSteps) {
        clearInterval(timer);
        setTimeout(() => {
          setIsLoading(false);
          scrollToTop({ smooth: true });
          onSelectModule(module);
        }, 200);
      }
    }, stepInterval);
  };

  if (isLoading) {
    const targetName =
      loadingTarget === 'pengawas'
        ? 'Portal Pengawas Ujian CBT (Halaman Mandiri)'
        : loadingTarget === 'supervisi'
        ? 'Portal Supervisi & Monitoring Kepala Sekolah'
        : loadingTarget === 'rekap-nilai'
        ? 'Pusat Rekapitulasi Nilai & Leger Siswa IKM'
        : loadingTarget === 'sumatif'
        ? 'Manajemen Bank Asesmen & Koreksi Siswa'
        : loadingTarget === 'litnum'
        ? 'Manajemen & Pengolahan Literasi Numerasi'
        : loadingTarget === 'manajemen-data'
        ? 'Manajemen & Master Data Sekolah'
        : loadingTarget === 'manajemen-ujian'
        ? 'Modul Manajemen Ujian (CBT & Seleksi)'
        : loadingTarget === 'bk-hebat'
        ? 'Modul Bimbingan Konseling (BK) Hebat'
        : loadingTarget === 'kesiswaan'
        ? 'Presensi Siswa'
        : loadingTarget === 'tugas'
        ? 'Tugas Harian Siswa'
        : 'Presensi Siswa';

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/70 to-indigo-50/80 flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 text-slate-800 relative">
        {/* Animated background highlights */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-200/50 to-sky-200/40 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-sky-200/50 to-indigo-200/40 blur-3xl" />
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
          {/* SMAN 3 Logo Lockup */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <img
              src={school?.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
              alt="Logo Provinsi"
              className="h-12 w-auto object-contain drop-shadow-sm"
            />
            <div className="h-8 w-px bg-slate-300" />
            <img
              src={school?.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
              alt="Logo Sekolah"
              className="h-12 w-auto object-contain drop-shadow-sm"
            />
          </div>

          {/* Oval Loader Area */}
          <div className="relative flex flex-col items-center mb-8">
            {/* Pulsing Outer Glow */}
            <div className="absolute w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 animate-ping duration-[3000ms] pointer-events-none" />
            
            {/* Glassmorphic spinner container */}
            <div className="w-20 h-20 bg-white/95 border border-slate-200/90 rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200/80 relative z-10">
              <svg 
                className="animate-spin h-10 w-10 text-indigo-600" 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-20" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="3.5"
                />
                <path 
                  className="opacity-90" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div>
              <p className="text-[11px] font-black text-indigo-700 tracking-widest uppercase">MENYIAPKAN MODUL</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">{targetName}</h3>
            </div>

            {/* Custom high-fidelity progress bar */}
            <div className="space-y-3">
              <div className="w-full max-w-xs mx-auto bg-slate-200/90 border border-slate-300 rounded-full h-2.5 overflow-hidden p-0.5 shadow-inner">
                <motion.div 
                  className="bg-gradient-to-r from-indigo-600 to-sky-500 h-full rounded-full transition-all duration-150"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 font-semibold">
                Memproses konfigurasi sistem... {loadingProgress}%
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/70 to-indigo-50/80 flex flex-col justify-between items-center pt-5 sm:pt-6 pb-0 px-3 sm:px-6 lg:px-8 text-slate-800 relative selection:bg-indigo-600 selection:text-white">
      {/* Background Decorative Rings & Grid Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-200/50 to-sky-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-sky-200/50 to-indigo-200/40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full bg-indigo-100/35 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#1e1b4b 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col items-center justify-center my-auto py-3">
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Logos & School Title */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <img
            src={school?.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
            alt="Logo Provinsi Lampung"
            className="h-14 w-auto object-contain drop-shadow-sm"
          />
          <div className="h-10 w-px bg-slate-300/80" />
          <img
            src={school?.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
            alt="Logo SMAN 3 Tumijajar"
            className="h-14 w-auto object-contain drop-shadow-sm"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-100/90 text-indigo-800 border border-indigo-200 shadow-2xs mb-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Portal Layanan Akademik Terpadu
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            SiMantri
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-bold text-slate-700 tracking-wide uppercase">
            {school?.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
          </p>
          <p className="text-xs text-indigo-700 font-semibold mt-0.5">
            Sistem Informasi &amp; Manajemen Akademik SMAN 3 Tumijajar
          </p>
        </motion.div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-5xl lg:max-w-6xl xl:max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="bg-white/95 backdrop-blur-xl py-8 px-5 sm:px-8 shadow-xl shadow-slate-200/80 rounded-3xl border border-slate-200/90 ring-1 ring-slate-900/5"
        >
          {/* Welcome User Section */}
          <div className="text-center mb-8 pb-5 border-b border-slate-200/80">
            <h3 className="text-lg sm:text-xl font-black text-slate-900">
              Selamat Datang, {currentUser?.nama || 'Guru Mapel'}!
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-600 mt-2">
              <span>Status Akun:</span>
              {(currentUser?.role === 'admin' || currentUser?.isAdmin) && (
                <span className="font-bold text-purple-800 bg-purple-50 px-3 py-0.5 rounded-full border border-purple-200">
                  Administrator Utama
                </span>
              )}
              {(currentUser?.role === 'operator' || currentUser?.isOperator) && (
                <span className="font-bold text-cyan-800 bg-cyan-50 px-3 py-0.5 rounded-full border border-cyan-200">
                  Operator Sekolah
                </span>
              )}
              {(currentUser?.role === 'kepala_sekolah' || currentUser?.isKepalaSekolah) && (
                <span className="font-bold text-amber-800 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-200">
                  Kepala Sekolah (Supervisi)
                </span>
              )}
              {isGuruMapel && (
                <span className="font-bold text-emerald-800 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200">
                  Guru Mata Pelajaran
                </span>
              )}
              {isGuruBK && (
                <span className="font-bold text-purple-800 bg-purple-50 px-3 py-0.5 rounded-full border border-purple-300">
                  Guru BK (7 Jurus BK)
                </span>
              )}
              {currentUser?.isKoordinatorLitnum && (
                <span className="font-bold text-amber-900 bg-amber-100 px-3 py-0.5 rounded-full border border-amber-300">
                  Koordinator Literasi &amp; Numerasi
                </span>
              )}
              {(currentUser?.isTimKesiswaan || currentUser?.roles?.includes('kesiswaan')) && (
                <span className="font-bold text-rose-800 bg-rose-50 px-3 py-0.5 rounded-full border border-rose-300">
                  Tim Kesiswaan (Presensi Siswa)
                </span>
              )}
              {currentUser?.isWaliKelas && (
                <span className="font-bold text-blue-800 bg-blue-50 px-3 py-0.5 rounded-full border border-blue-200">
                  Wali Kelas {currentUser?.waliKelasName ? `(${currentUser.waliKelasName})` : ''}
                </span>
              )}
              {isProctorRole && (
                <span className="font-bold text-teal-900 bg-teal-100 px-3 py-0.5 rounded-full border border-teal-300">
                  Proktor Ujian CBT (Akses Operasional)
                </span>
              )}
              {!isAdminOrOperator && !isProctorRole && canGuruAccessProctor && (
                <span className="font-bold text-emerald-900 bg-emerald-100 px-3 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Izin Pengawas CBT: Aktif
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium mt-2">
              Pilih modul sistem yang ingin diakses di bawah ini:
            </p>
          </div>

          {/* Responsive Cards Grid */}
          {(() => {
            const role = currentUser?.role;
            const isKepsek = Boolean(
              role !== 'admin' &&
              role !== 'operator' &&
              (role === 'kepala_sekolah' ||
                currentUser?.isKepalaSekolah ||
                currentUser?.id === 'tch-kepsek' ||
                currentUser?.username === 'kepsek')
            );
            const isSpecialRole = role === 'admin' || role === 'operator' || isKepsek;
            const isPureGuruBK = Boolean(isGuruBK && !isGuruMapel && !isSpecialRole);
            const hasBKAccess = Boolean(isGuruBK || (role === 'admin' && currentUser?.isGuruBK));
            const isKoordinatorLitnum = Boolean(currentUser?.isKoordinatorLitnum);

            // Grid sizing: mobile 2-3 cols, tablet 3-4 cols, desktop 4-6 cols
            const gridClass = isKepsek
              ? 'grid-cols-1 max-w-xl mx-auto'
              : isPureGuruBK
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 max-w-7xl mx-auto'
              : (hasBKAccess && isSpecialRole) || (isSpecialRole && isKoordinatorLitnum)
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 max-w-7xl mx-auto'
              : hasBKAccess || isSpecialRole || isKoordinatorLitnum
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 max-w-7xl mx-auto'
              : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 max-w-6xl mx-auto';

            if (isPureGuruBK) {
              return (
                <div className={`grid ${gridClass} gap-3 sm:gap-4 md:gap-4.5`}>
                  {/* BK Card 1: Pusat BK Hebat 7 Jurus */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('bimbingan-konseling');
                      handleModuleSelection('bk-hebat');
                    }}
                    className="text-left p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-purple-50/40 border-2 border-slate-200/90 hover:border-purple-500 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500" />
                    <div>
                      <div className="flex items-center justify-between mb-2.5 gap-1.5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 border border-purple-200/80 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
                          <HeartHandshake className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-100/80 text-purple-900 border border-purple-300 shrink-0 whitespace-nowrap">
                          7 Jurus BK
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-purple-700 transition-colors tracking-tight leading-tight">
                        Modul BK Hebat
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug mt-1 line-clamp-2">
                        Pusat kendali 7 Jurus: Profil potensi siswa, jurnal emosi harian, habit tracker, &amp; akuntabilitas resmi.
                      </p>
                    </div>
                    <div className="pt-2 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-purple-700 group-hover:text-purple-800">
                      <span>Buka 7 Jurus</span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all">
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>

                  {/* BK Card 2: Sesi Konseling & Resiliensi */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('bk-konseling');
                      handleModuleSelection('bk-hebat');
                    }}
                    className="text-left p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-rose-50/40 border-2 border-slate-200/90 hover:border-rose-500 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
                    <div>
                      <div className="flex items-center justify-between mb-2.5 gap-1.5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs">
                          <UserCheck className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-100/80 text-rose-900 border border-rose-300 shrink-0 whitespace-nowrap">
                          Konseling
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-rose-700 transition-colors tracking-tight leading-tight">
                        Konseling &amp; Resiliensi
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug mt-1 line-clamp-2">
                        Konseling individual, kelompok, konferensi kasus, kode etik kerahasiaan &amp; rencana aksi.
                      </p>
                    </div>
                    <div className="pt-2 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-rose-700 group-hover:text-rose-800">
                      <span>Kelola Konseling</span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all">
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>

                  {/* BK Card 3: Bimbingan Karir & SNBP */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('bk-karir');
                      handleModuleSelection('bk-hebat');
                    }}
                    className="text-left p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-indigo-50/40 border-2 border-slate-200/90 hover:border-indigo-500 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-sky-500" />
                    <div>
                      <div className="flex items-center justify-between mb-2.5 gap-1.5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                          <Compass className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-100/80 text-indigo-900 border border-indigo-200 shrink-0 whitespace-nowrap">
                          SNBP &amp; PTN
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors tracking-tight leading-tight">
                        Karir, Bakat &amp; SNBP
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug mt-1 line-clamp-2">
                        Pemetaan minat bakat karir, pendampingan pemilihan jurusan PTN, SNBP, SNBT, &amp; ikatan dinas.
                      </p>
                    </div>
                    <div className="pt-2 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                      <span>Bimbingan Karir</span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>

                  {/* BK Card 4: Data Siswa Binaan & Agenda BK */}
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentView('students');
                      handleModuleSelection('bk-hebat');
                    }}
                    className="text-left p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-emerald-50/40 border-2 border-slate-200/90 hover:border-emerald-500 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
                    <div>
                      <div className="flex items-center justify-between mb-2.5 gap-1.5">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                          <Users className="w-5 h-5" />
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-100/80 text-emerald-800 border border-emerald-300 shrink-0 whitespace-nowrap">
                          Binaan
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors tracking-tight leading-tight">
                        Siswa Binaan &amp; Agenda
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-snug mt-1 line-clamp-2">
                        Direktori murid binaan, profil gaya belajar, kontak darurat orang tua &amp; jadwal layanan.
                      </p>
                    </div>
                    <div className="pt-2 mt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-emerald-700 group-hover:text-emerald-800">
                      <span>Lihat Murid Binaan</span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all">
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-10">
                {/* 1. BAGIAN MODUL UTAMA SEKOLAH */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-2.5 h-2.5 rounded-full ${isKepsek ? 'bg-amber-500 ring-4 ring-amber-100' : 'bg-indigo-600 ring-4 ring-indigo-100'}`} />
                      <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-800">
                        {isKepsek ? 'Portal Supervisi & Pengawasan Manajerial' : 'Modul Utama Layanan Akademik Sekolah'}
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {isKepsek ? 'Hak akses eksklusif Kepala Sekolah: monitoring real-time & audit supervisi' : 'Pilih tombol modul di bawah untuk mengakses sistem'}
                    </span>
                  </div>

                  <div className={`grid ${gridClass} gap-3 sm:gap-4 md:gap-4.5`}>
            
            {/* Box 0: Portal Supervisi Kepala Sekolah (Tampil Khusus Akun Kepala Sekolah) */}
            {isKepsek && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('supervisi-dashboard');
                  handleModuleSelection('supervisi');
                }}
                className="text-left rounded-2xl bg-gradient-to-br from-amber-500/10 via-white to-indigo-50/40 border-2 border-amber-400 hover:border-amber-500 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full p-4 sm:p-5 min-h-[190px]"
              >
                {/* Top Accent Gradient Pill */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600" />

                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition-all shadow-md font-black">
                      <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-black bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                        Portal Khusus Supervisi
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Live Terhubung
                      </span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-black text-slate-900 group-hover:text-amber-800 transition-colors tracking-tight break-words leading-tight flex items-center gap-1.5 text-sm sm:text-base">
                      <span>Portal Supervisi Kepala Sekolah</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    </h4>
                    <p className="text-slate-600 font-medium leading-relaxed mt-1 break-words whitespace-normal text-[11px] sm:text-xs line-clamp-3">
                      Pusat monitoring manajerial terpadu: pantauan presensi live 10 rombel, validasi digital Berita Acara, audit kinerja guru, bank soal, ketuntasan KKTP, serta evaluasi mutu Rapor Pendidikan.
                    </p>
                  </div>
                </div>

                <div className="pt-2.5 mt-2.5 border-t border-amber-200/80 flex items-center justify-between text-xs font-bold text-amber-900 group-hover:text-amber-950 gap-2">
                  <span className="break-words leading-tight flex-1">Buka Portal Supervisi</span>
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center group-hover:scale-110 transition-all shrink-0 shadow-2xs">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            )}

            
            {/* =========================================================================
                AKSES 2 (GURU MAPEL): PORTAL PENGAWAS UJIAN CBT (MANDIRI)
                HANYA tampil jika Izin Pengawas diaktifkan oleh Admin/Operator/Proktor.
                Langsung mengarahkan ke halaman mandiri terisolasi (StandaloneSupervisorPortal).
               ========================================================================= */}
            {!isKepsek && !isAdminOrOperator && !isProctorRole && canGuruAccessProctor && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('standalone-supervisor');
                  setSelectedModule('pengawas');
                  handleModuleSelection('pengawas');
                }}
                className="text-left p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-white via-amber-50/50 to-emerald-50/40 hover:bg-amber-50/80 border-2 border-amber-400 hover:border-amber-500 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[185px] ring-2 ring-amber-400/20"
              >
                {/* Top Accent Gradient Pill */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-emerald-500 to-indigo-600" />

                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition-all shadow-xs">
                      <ShieldCheck className="w-5 h-5 text-slate-950" />
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 text-center break-words leading-tight flex items-center gap-1 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Izin Pengawas: Aktif</span>
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-amber-800 transition-colors tracking-tight break-words leading-tight">
                        Portal Pengawas Ujian CBT
                      </h4>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                      Ruang kerja mandiri pengawas: pantauan live kehadiran &amp; progres siswa, verifikasi PIN anti-cheat, dan BAP digital.
                    </p>

                    {/* Active duty summary banner */}
                    {activeDutySlot ? (
                      <div className="mt-2.5 p-2 rounded-xl bg-amber-100/90 border border-amber-300 text-amber-950 text-[10.5px] font-bold flex items-center gap-1.5 shadow-2xs">
                        <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span className="truncate">
                          Tugas Aktif: <strong>{activeDutySlot.roomName}</strong> ({activeDutySlot.sessionName || "Sesi Ujian"})
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10.5px] font-semibold flex items-center gap-1.5">
                        <BadgeCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          ID Pengawas: <strong>{liveCurrentUser?.proctorId || 'PGW-Terdaftar'}</strong> (Siap Bertugas)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-amber-200/80 flex items-center justify-between text-[11px] sm:text-xs font-black text-amber-900 group-hover:text-amber-950 gap-1.5">
                  <span className="break-words leading-tight flex-1">Masuk Portal Pengawas Mandiri</span>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center group-hover:scale-110 transition-all shrink-0 shadow-2xs">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            )}

            {/* =========================================================================
                PORTAL MONITORING & KENDALI PENGAWAS UJIAN (KHUSUS ADMIN, OPERATOR, & PROKTOR)
                Dilengkapi dengan Quick Toggle Saklar Pengawas Guru & Akses Langsung ke Portal Mandiri
               ========================================================================= */}
            {!isKepsek && (isAdminOrOperator || isProctorRole) && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('standalone-supervisor');
                  setSelectedModule('pengawas');
                  handleModuleSelection('pengawas');
                }}
                className="text-left p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-white via-indigo-50/40 to-teal-50/50 hover:bg-indigo-50/70 border-2 border-indigo-300 hover:border-indigo-500 shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[185px]"
              >
                {/* Top Accent Gradient Pill */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-600 via-teal-500 to-emerald-500" />

                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 text-white flex items-center justify-center shrink-0 group-hover:scale-105 transition-all shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>

                    {/* Quick Toggle & Status Badge for Admin/Operator/Proktor */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black border text-center break-words leading-tight shadow-2xs ${
                          isGlobalProctorActive
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}
                      >
                        {isGlobalProctorActive ? 'Pengawas: AKTIF' : 'Pengawas: NONAKTIF'}
                      </span>

                      {/* Quick Toggle Button */}
                      <button
                        type="button"
                        onClick={handleQuickToggleGlobalProctor}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors cursor-pointer focus:outline-hidden ${
                          isGlobalProctorActive ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                        title={isGlobalProctorActive ? 'Klik untuk matikan izin pengawas guru' : 'Klik untuk aktifkan izin pengawas guru'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform duration-200 ${
                            isGlobalProctorActive ? 'translate-x-4.5' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-indigo-800 transition-colors tracking-tight break-words leading-tight">
                      Portal Pengawas Ujian CBT (Mandiri)
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-600 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                      Pusat kendali live ruang CBT mandiri, buka blokir peserta 6-digit PIN, kompensasi waktu, reset sesi, &amp; catat BAP.
                    </p>

                    <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[10.5px] font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>Izin Pengawas Guru Mapel:</span>
                      </span>
                      <strong className={`font-black ${isGlobalProctorActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                        {isGlobalProctorActive ? 'TERBUKA (ON)' : 'TERKUNCI (OFF)'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-indigo-200/80 flex items-center justify-between text-[11px] sm:text-xs font-black text-indigo-700 group-hover:text-indigo-900 gap-1.5">
                  <span className="break-words leading-tight flex-1">Buka Portal Pengawas Mandiri</span>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center group-hover:scale-110 transition-all shrink-0 shadow-2xs">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            )}


            {/* Box 1: Manajemen Bank Asesmen & Koreksi Card */}
            {!isKepsek && (
              <button
                type="button"
                onClick={() => handleModuleSelection('sumatif')}
                className="text-left p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-indigo-50/40 border-2 border-slate-200/90 hover:border-indigo-500 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
              >
                {/* Top Accent Gradient Pill */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-sky-500" />

                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-extrabold bg-indigo-100/80 text-indigo-800 border border-indigo-200 text-center break-words leading-tight">
                      Bank Soal &amp; Koreksi
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-indigo-700 transition-colors tracking-tight break-words leading-tight">
                      Manajemen Bank Asesmen &amp; Koreksi
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                      Kelola paket bank soal CBT (ASTS, ASAS, DSMART, OSN), pengoreksian AI Vision siswa, rekap nilai, &amp; cetak rapor.
                    </p>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-indigo-600 group-hover:text-indigo-700 gap-1.5">
                  <span className="break-words leading-tight flex-1">Buka Asesmen</span>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            )}

            
            {/* Box 1b: Modul Rekapitulasi Nilai & Leger Siswa */}
            {!isKepsek && (!school?.rekapNilaiHidden || currentUser?.role === 'admin') && (() => {
              const isRekapLocked = Boolean(school?.rekapNilaiLocked);
              const isAdmin = currentUser?.role === 'admin';
              const canAccessRekap = isAdmin || !isRekapLocked;

              if (!canAccessRekap) {
                return (
                  <button
                    type="button"
                    onClick={() => setIsRekapNilaiLockedModalOpen(true)}
                    className="text-left p-3.5 sm:p-4 rounded-2xl border-2 border-slate-300/90 bg-slate-50/80 hover:bg-slate-100/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-rose-500" />

                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 transition-all shadow-2xs group-hover:bg-rose-100">
                          <Lock className="w-5 h-5 text-rose-600" />
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-black bg-rose-100 text-rose-900 border border-rose-300 text-center break-words leading-tight flex items-center gap-1 shadow-2xs">
                          <Lock className="w-3 h-3 text-rose-600" />
                          <span>TERKUNCI</span>
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-black tracking-tight text-slate-800 break-words leading-tight">
                          Rekapitulasi Nilai &amp; Leger Siswa
                        </h4>
                        <p className="text-[11px] sm:text-xs font-medium text-slate-500 leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                          {school?.rekapNilaiLockReason || 'Modul Rekapitulasi Nilai & Leger Siswa saat ini dikunci oleh Administrator.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between text-[11px] sm:text-xs font-bold text-rose-700 gap-1.5">
                      <span className="break-words leading-tight flex-1 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Terkunci (Info)</span>
                      </span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center group-hover:bg-rose-200 transition-all shrink-0">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('rekap-nilai-dashboard');
                    handleModuleSelection('rekap-nilai');
                  }}
                  className="text-left p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-amber-50/40 border-2 border-slate-200/90 hover:border-amber-500 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600" />

                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-2">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-700 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-xs">
                        <Calculator className="w-5 h-5" />
                      </div>
                      <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-black bg-amber-100 text-amber-950 border border-amber-300 text-center break-words leading-tight shadow-2xs">
                        IKM &amp; Leger
                      </span>
                    </div>

                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-amber-800 transition-colors tracking-tight break-words leading-tight">
                        Rekapitulasi Nilai &amp; Leger Siswa
                      </h4>
                      <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                        Kelola nilai sumatif TP 1-6, PTS/PAS, sync otomatis, generator Capaian Kompetensi, Rapor &amp; Leger Kelas.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-amber-700 group-hover:text-amber-800 gap-1.5">
                    <span className="break-words leading-tight flex-1">Buka Rekap Nilai</span>
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shrink-0 shadow-2xs">
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </button>
              );
            })()}


            {/* Box 2: Formatif / Tugas Harian Card */}
            {!isKepsek && (() => {
              const isFormatifLocked = (school?.formatifLocked ?? true);
              const isAdmin = currentUser?.role === 'admin';
              const canAccessFormatif = isAdmin || !isFormatifLocked;

              if (!canAccessFormatif) {
                return (
                  <button
                    type="button"
                    onClick={() => setIsFormatifLockedModalOpen(true)}
                    className="text-left p-3.5 sm:p-4 rounded-2xl border-2 border-slate-300/90 bg-slate-50/80 hover:bg-slate-100/90 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
                  >
                    <div className="absolute top-0 left-0 right-0 h-1 bg-slate-300" />

                    <div>
                      <div className="flex items-start justify-between gap-1.5 mb-2">
                        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 flex items-center justify-center shrink-0 transition-all shadow-2xs group-hover:bg-rose-100">
                          <Lock className="w-5 h-5 text-rose-600" />
                        </div>
                        <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-black bg-rose-100 text-rose-900 border border-rose-300 text-center break-words leading-tight flex items-center gap-1 shadow-2xs">
                          <Lock className="w-3 h-3 text-rose-600" />
                          <span>TERKUNCI</span>
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xs sm:text-sm font-black tracking-tight text-slate-800 break-words leading-tight">
                          Tugas Harian Siswa
                        </h4>
                        <p className="text-[11px] sm:text-xs font-medium text-slate-500 leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                          {school?.formatifLockReason || 'Modul Tugas Formatif saat ini sedang dalam proses pengembangan & penyempurnaan oleh Administrator.'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 border-t border-slate-200 flex items-center justify-between text-[11px] sm:text-xs font-bold text-rose-700 gap-1.5">
                      <span className="break-words leading-tight flex-1 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>Terkunci (Info)</span>
                      </span>
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center group-hover:bg-rose-200 transition-all shrink-0">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </button>
                );
              }

              return (
                <button
                  type="button"
                  onClick={() => handleModuleSelection('tugas')}
                  className={`text-left p-3.5 sm:p-4 rounded-2xl border-2 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px] ${
                    isAdmin
                      ? 'bg-slate-900 hover:bg-slate-850 border-amber-400/90 hover:border-amber-300 text-white'
                      : 'bg-white hover:bg-amber-50/40 border-slate-200/90 hover:border-amber-500 text-slate-900'
                  }`}
                >
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600" />

                  <div>
                    <div className="flex items-start justify-between gap-1.5 mb-2">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center shrink-0 transition-all shadow-xs ${
                        isAdmin
                          ? 'bg-amber-400 text-slate-950 border-amber-300 group-hover:bg-amber-300'
                          : 'bg-amber-50 border-amber-200 text-amber-700 group-hover:bg-amber-500 group-hover:text-white'
                      }`}>
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black border text-center break-words leading-tight ${
                        isAdmin
                          ? 'bg-amber-400 text-slate-950 border-amber-300'
                          : 'bg-amber-100 text-amber-800 border-amber-200'
                      }`}>
                        {isAdmin && isFormatifLocked ? 'Admin Mode' : 'Formatif'}
                      </span>
                    </div>

                    <div>
                      <h4 className={`text-xs sm:text-sm font-black tracking-tight transition-colors break-words leading-tight ${
                        isAdmin ? 'text-white group-hover:text-amber-300' : 'text-slate-900 group-hover:text-amber-700'
                      }`}>
                        Tugas Harian Siswa
                      </h4>
                      <p className={`text-[11px] sm:text-xs font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2 ${
                        isAdmin ? 'text-slate-300' : 'text-slate-500'
                      }`}>
                        {isAdmin
                          ? 'Keleluasaan Admin: Prompt AI, skema tugas formatif, & pengujian sistem via prompt.'
                          : 'Pantau penugasan harian kelas, evaluasi formatif, kuis, dan progres siswa.'}
                      </p>
                    </div>
                  </div>

                  <div className={`pt-2 mt-2 border-t flex items-center justify-between text-[11px] sm:text-xs font-bold gap-1.5 ${
                    isAdmin
                      ? 'border-slate-800 text-amber-400 group-hover:text-amber-300'
                      : 'border-slate-100 text-amber-700 group-hover:text-amber-800'
                  }`}>
                    <span className="break-words leading-tight flex-1">{isAdmin ? 'Uji Modul' : 'Akses Modul'}</span>
                    <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all shrink-0 ${
                      isAdmin
                        ? 'bg-amber-400/20 text-amber-300 group-hover:bg-amber-400 group-hover:text-slate-950'
                        : 'bg-amber-50 text-amber-700 group-hover:bg-amber-500 group-hover:text-white'
                    }`}>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </button>
              );
            })()}

            {/* Box 3: Master Data Card (Khusus Admin & Operator) */}
            {!isKepsek && (currentUser?.role === 'admin' || currentUser?.role === 'operator') && (
              <button
                type="button"
                onClick={() => handleModuleSelection('manajemen-data')}
                className="text-left p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-emerald-50/40 border-2 border-slate-200/90 hover:border-emerald-500 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
              >
                {/* Top Accent Gradient Pill */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />

                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-700 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                      <FolderCog className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-extrabold bg-emerald-100/80 text-emerald-800 border border-emerald-200 text-center break-words leading-tight">
                      Master Data
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-emerald-700 transition-colors tracking-tight break-words leading-tight">
                      Master Data Sekolah
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                      Kelola siswa, akun guru, roster, rombel kelas, mapel, &amp; kalender pendidikan A4.
                    </p>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-emerald-700 group-hover:text-emerald-800 gap-1.5">
                  <span className="break-words leading-tight flex-1">Manajemen Data</span>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            )}

            {/* Box 4: Modul Bimbingan Konseling (BK) Hebat */}
            {!isKepsek && (isGuruBK || (currentUser?.role === 'admin' && currentUser?.isGuruBK)) && (
              <button
                type="button"
                onClick={() => handleModuleSelection('bk-hebat')}
                className="text-left p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-purple-50/40 border-2 border-slate-200/90 hover:border-purple-500 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
              >
                {/* Top Accent Gradient Pill */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500" />

                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-50 border border-purple-200/80 text-purple-600 flex items-center justify-center shrink-0 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
                      <HeartHandshake className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-black bg-purple-100/80 text-purple-900 border border-purple-300 text-center break-words leading-tight">
                      7 Jurus BK
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-purple-700 transition-colors tracking-tight break-words leading-tight">
                      Modul BK Hebat
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                      Profil potensi siswa, jurnal emosi (EMC2), mitigasi risiko, alur MTSS &amp; karir SNBP.
                    </p>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-purple-700 group-hover:text-purple-800 gap-1.5">
                  <span className="break-words leading-tight flex-1">Akses Modul BK</span>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-all shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            )}

            {/* Box 5: Modul Manajemen Ujian (Khusus Admin, Operator, & Proktor CBT) */}
            {!isKepsek && (currentUser?.role === 'admin' || currentUser?.role === 'operator' || isProctorRole) && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('exam-management');
                  handleModuleSelection('manajemen-ujian');
                }}
                className="text-left p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-cyan-50/40 border-2 border-slate-200/90 hover:border-cyan-500 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
              >
                {/* Top Accent Gradient Pill */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600" />

                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-50 border border-cyan-200/80 text-cyan-700 flex items-center justify-center shrink-0 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-xs">
                      <Laptop className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-black bg-cyan-100/90 text-cyan-900 border border-cyan-300 text-center break-words leading-tight">
                      {isProctorRole && !isAdminOrOperator ? 'Proktor CBT' : 'CBT & Token'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-cyan-700 transition-colors tracking-tight break-words leading-tight">
                      {isProctorRole && !isAdminOrOperator ? 'Pusat Kendali Proktor CBT' : 'Manajemen Ujian'}
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                      {isProctorRole && !isAdminOrOperator
                        ? 'Kelola sesi aktif, rilis token harian, distribusi PIN pengawas, & administrasi BAP.'
                        : 'Jadwal ujian, token harian, kredensial 8-digit siswa, & penugasan mapel CBT.'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-cyan-700 group-hover:text-cyan-800 gap-1.5">
                  <span className="break-words leading-tight flex-1">
                    {isProctorRole && !isAdminOrOperator ? 'Buka Kendali Proktor' : 'Kelola Ujian'}
                  </span>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-cyan-50 text-cyan-700 flex items-center justify-center group-hover:bg-cyan-600 group-hover:text-white transition-all shrink-0">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            )}

            {/* Box 6: Modul Manajemen Literasi dan Numerasi (Tampil Otomatis untuk Koordinator LitNum, Admin, & Operator) */}
            {!isKepsek && (currentUser?.isKoordinatorLitnum || currentUser?.role === 'admin' || currentUser?.role === 'operator') && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView('litnum-management');
                  setActiveLitNumTab('analytics');
                  handleModuleSelection('litnum');
                }}
                className="text-left p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-amber-50/50 border-2 border-amber-300 hover:border-amber-500 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
              >
                {/* Top Accent Gradient Pill */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600" />

                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0 group-hover:from-amber-500 group-hover:to-orange-500 group-hover:text-slate-950 transition-all shadow-xs">
                      <BookOpenCheck className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-black bg-gradient-to-r from-amber-100 to-orange-100 text-amber-950 border border-amber-300 text-center break-words leading-tight shadow-2xs">
                      {currentUser?.isKoordinatorLitnum ? 'Koordinator' : 'Pusat Mutu'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-amber-800 transition-colors tracking-tight break-words leading-tight">
                      Manajemen LitNum
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                      Bank soal &amp; wacana (Selasa/Rabu), sakelar jadwal, dokumen Rapor Pendidikan, &amp; estimasi mutu.
                    </p>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-amber-700 group-hover:text-amber-800 gap-1.5">
                  <span className="break-words leading-tight flex-1">Manajemen LitNum</span>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shrink-0 shadow-2xs">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            )}

            {/* Box 7: Modul Kesiswaan - Presensi Siswa (Hak Akses Guru Mapel, Kesiswaan & Wali Kelas) */}
            {!isKepsek && (
              <button
                type="button"
                onClick={() => {
                  setCurrentView(isGuruMapel ? 'kesiswaan-input' : 'kesiswaan');
                  handleModuleSelection('kesiswaan');
                }}
                className="text-left p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-rose-50/40 border-2 border-slate-200/90 hover:border-rose-500 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[170px]"
              >
                {/* Top Accent Gradient Pill */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500" />

                <div>
                  <div className="flex items-start justify-between gap-1.5 mb-2">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-600 flex items-center justify-center shrink-0 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-black bg-rose-100 text-rose-900 border border-rose-300 text-center break-words leading-tight shadow-2xs">
                      {currentUser?.isTimKesiswaan ? 'Kesiswaan' : isGuruMapel ? 'Guru Mapel' : currentUser?.isWaliKelas ? 'Wali Kelas' : 'Presensi'}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-rose-700 transition-colors tracking-tight break-words leading-tight">
                      Layanan Presensi Siswa
                    </h4>
                    <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                      Input absensi harian per kelas (H/S/I/A), live ke Kepala Sekolah, &amp; ekspor rekapitulasi.
                    </p>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-rose-700 group-hover:text-rose-800 gap-1.5">
                  <span className="break-words leading-tight flex-1">Input Absensi</span>
                  <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-rose-50 text-rose-700 flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all shrink-0 shadow-2xs">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </button>
            )}
                  </div>
                </div>

                {/* 2. KOTAK KHUSUS PENGOLAHAN LITERASI & NUMERASI (LITNUM) */}
                {/* Terpisah Rapi & Terstruktur dari Tombol-Tombol Modul Lain */}
                {!isKepsek && (currentUser?.role === 'admin' || currentUser?.role === 'operator' || currentUser?.isKoordinatorLitnum) && (
                  <div className="space-y-4 pt-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b-2 border-amber-300 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-amber-500 ring-4 ring-amber-100 animate-pulse" />
                        <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-950 flex flex-wrap items-center gap-2">
                          <span>Kotak Khusus Pengolahan Literasi &amp; Numerasi (LitNum)</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 uppercase shadow-2xs">
                            Menu Terpisah Khusus
                          </span>
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-100/80 px-2.5 py-0.5 rounded-lg border border-amber-200">
                        Pusat Pengolahan Data &amp; Rapor Mutu SMAN 3 Tumijajar
                      </span>
                    </div>

                    <div className="rounded-3xl bg-gradient-to-br from-white via-amber-50/50 to-orange-50/30 border-2 border-amber-300 shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden p-5 sm:p-7 lg:p-8 flex flex-col gap-6">
                      {/* Top Accent Gradient Bar */}
                      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600" />

                      {/* Header Kotak LitNum - Full Width, Solid & Never Squished */}
                      <div className="border-b border-amber-200/80 pb-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 flex items-center justify-center font-bold shadow-xs shrink-0 mt-0.5 sm:mt-0">
                              <BookOpen className="w-6 h-6" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300 shadow-2xs">
                                  Kotak Pengolahan Literasi &amp; Numerasi
                                </span>
                                <span className="text-slate-400 text-xs hidden sm:inline">·</span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                                  SMAN 3 Tumijajar
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-2xs">
                                  Koordinator LitNum
                                </span>
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-2xs">
                                  Standar Mutu 2026
                                </span>
                              </div>
                              <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                                Menu Khusus Pengolahan LitNum
                              </h3>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentView('litnum-management');
                                setActiveLitNumTab('analytics');
                                handleModuleSelection('litnum');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-100/90 hover:bg-amber-200 text-amber-950 font-bold text-xs border border-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                              title="Buka pengaturan jadwal dan sakelar sistem"
                            >
                              <Sliders className="w-3.5 h-3.5 text-amber-700" />
                              <span>Kelola Jadwal &amp; Sakelar</span>
                            </button>
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-4xl break-words whitespace-normal">
                          Pusat kendali operasional dan pengolahan data terpadu untuk menyusun bank soal terjadwal (Selasa &amp; Rabu), pembatasan otomatis waktu pengerjaan siswa, ekstraksi dokumen resmi Rapor Pendidikan Kemendikdasmen, akumulasi multi-file respons Google Form, serta analisis &amp; estimasi capaian mutu 2026.
                        </p>
                      </div>

                      {/* Live Schedule Status Card - UPGRADED TO WRAP NATURALLY AND NEVER CUT OFF */}
                      <div className={`w-full rounded-2xl border-2 p-4 sm:p-5 shadow-xs transition-all relative overflow-hidden ${
                        liveSchedule.isAllowed
                          ? 'bg-gradient-to-br from-emerald-50/95 via-teal-50/70 to-white border-emerald-300 text-emerald-950'
                          : 'bg-gradient-to-br from-amber-50/95 via-orange-50/60 to-white border-amber-300 text-amber-950'
                      }`}>
                        {/* Side color accent bar */}
                        <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                          liveSchedule.isAllowed ? 'bg-emerald-500' : 'bg-amber-500'
                        }`} />

                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 pl-2">
                          {/* Left Column: Live Status, Headline, and Wrapping Text */}
                          <div className="space-y-2 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-2xs shrink-0 ${
                                liveSchedule.isAllowed ? 'bg-emerald-600 text-white' : 'bg-amber-700 text-white'
                              }`}>
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                <span>{liveSchedule.isAllowed ? 'PENGERJAAN BUKA SESUAI JADWAL' : 'DITUTUP OTOMATIS SESUAI JADWAL'}</span>
                              </span>

                              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-white/95 border border-amber-300 text-slate-800 shadow-2xs shrink-0">
                                <CalendarDays className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{liveSchedule.dayName}, {liveSchedule.currentHHMM} WIB</span>
                              </span>

                              <span className="text-[11px] font-bold text-amber-900 bg-amber-100/90 px-2.5 py-0.5 rounded-md border border-amber-200/90 shrink-0">
                                {state?.litnumScheduleConfig?.scheduleMode === 'otomatis_resmi'
                                  ? 'Mode Otomatis Resmi Kemendikdasmen'
                                  : 'Mode Terjadwal Khusus'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h4 className="text-sm sm:text-base font-black text-slate-900 break-words leading-snug">
                                {liveSchedule.reasonTitle}
                              </h4>
                              {/* Responsive text size & fluid wrapping so text seamlessly flows down onto subsequent lines */}
                              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed break-words whitespace-normal max-w-3xl">
                                {liveSchedule.reasonMessage}
                              </p>
                            </div>
                          </div>

                          {/* Right Column: Operational Specs (Responsive, Never Cuts Off) */}
                          <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2.5 pt-3 lg:pt-0 lg:pl-6 border-t lg:border-t-0 lg:border-l border-amber-200/80 justify-between">
                            <div className="bg-white/95 rounded-xl p-3 border border-amber-200/80 shadow-2xs w-full sm:w-auto min-w-0 sm:min-w-[190px]">
                              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                                Jadwal Resmi Pengerjaan
                              </span>
                              <span className="text-xs font-extrabold text-slate-900 block mt-0.5 break-words whitespace-normal leading-tight">
                                Selasa (Lit) &amp; Rabu (Num)
                              </span>
                            </div>

                            <div className="bg-white/95 rounded-xl p-3 border border-amber-200/80 shadow-2xs w-full sm:w-auto min-w-0 sm:min-w-[190px]">
                              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider block">
                                Jam Operasional
                              </span>
                              <span className="text-xs font-mono font-black text-slate-900 block mt-0.5 break-words whitespace-normal leading-tight">
                                {liveSchedule.timeRangeText}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Susunan Menu Khusus Pengolahan LitNum (6 Menu Akurat & Komprehensif) */}
                      <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>Pilih Menu Pengolahan LitNum Sesuai Kebutuhan:</span>
                          </span>
                          <span className="text-[11px] text-slate-500 font-semibold break-words">
                            Tersusun khusus untuk Koordinator &amp; Operator LitNum (Terpisah dari Modul Lain)
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3 sm:gap-4">
                          {/* Item 1: Olah Bank Soal & Stimulus Wacana Bertingkat */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setCurrentView('litnum-management');
                              setActiveLitNumTab('bank_soal');
                              handleModuleSelection('litnum');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setCurrentView('litnum-management');
                                setActiveLitNumTab('bank_soal');
                                handleModuleSelection('litnum');
                              }
                            }}
                            className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-indigo-50/60 border-2 border-slate-200/90 hover:border-indigo-500 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-left h-full min-h-[165px]"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1.5 mb-2">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                                  <BookOpenCheck className="w-4.5 h-4.5" />
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200 text-center break-words leading-tight">
                                  Selasa/Rabu
                                </span>
                              </div>
                              <div>
                                <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-indigo-700 transition-colors break-words leading-tight">
                                  Olah Bank Soal &amp; Wacana
                                </h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                                  Penyusunan butir soal PG, PG Kompleks, Benar/Salah, stimulus wacana bertingkat, &amp; rumus.
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-indigo-700 group-hover:text-indigo-800 gap-1.5">
                              <span className="break-words leading-tight flex-1">Buka Bank Soal</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </div>
                          </div>

                          {/* Item 2: Kontrol Jadwal & Otomatisasi Sistem */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setCurrentView('litnum-management');
                              setActiveLitNumTab('analytics');
                              handleModuleSelection('litnum');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setCurrentView('litnum-management');
                                setActiveLitNumTab('analytics');
                                handleModuleSelection('litnum');
                              }
                            }}
                            className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-violet-50/60 border-2 border-slate-200/90 hover:border-violet-500 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-left h-full min-h-[165px]"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1.5 mb-2">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-50 text-violet-700 border border-violet-200 flex items-center justify-center group-hover:bg-violet-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                                  <Clock className="w-4.5 h-4.5" />
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-violet-100 text-violet-900 border border-violet-200 text-center break-words leading-tight">
                                  Otomatisasi
                                </span>
                              </div>
                              <div>
                                <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-violet-700 transition-colors break-words leading-tight">
                                  Kontrol Jadwal &amp; Sakelar
                                </h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                                  Sakelar master on/off pengerjaan, pembatasan otomatis Selasa/Rabu, &amp; bypass uji coba.
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-violet-700 group-hover:text-violet-800 gap-1.5">
                              <span className="break-words leading-tight flex-1">Atur Jadwal</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </div>
                          </div>

                          {/* Item 3: Unggah Dokumen Rapor Kemendikdasmen */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setCurrentView('litnum-management');
                              setActiveLitNumTab('upload_rapor');
                              handleModuleSelection('litnum');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setCurrentView('litnum-management');
                                setActiveLitNumTab('upload_rapor');
                                handleModuleSelection('litnum');
                              }
                            }}
                            className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-teal-50/60 border-2 border-slate-200/90 hover:border-teal-500 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-left h-full min-h-[165px]"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1.5 mb-2">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                                  <FileSpreadsheet className="w-4.5 h-4.5" />
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-teal-100 text-teal-900 border border-teal-200 text-center break-words leading-tight">
                                  Rapor Resmi
                                </span>
                              </div>
                              <div>
                                <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-teal-700 transition-colors break-words leading-tight">
                                  Unggah Rapor Kemendikdasmen
                                </h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                                  Ekstraksi Excel (.xlsx) dan PDF Rapor Pendidikan-PBD Kemendikdasmen.
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-teal-700 group-hover:text-teal-800 gap-1.5">
                              <span className="break-words leading-tight flex-1">Ekstraksi Dokumen</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </div>
                          </div>

                          {/* Item 4: Impor Multi-File Google Form */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setCurrentView('litnum-management');
                              setActiveLitNumTab('upload_googleform');
                              handleModuleSelection('litnum');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setCurrentView('litnum-management');
                                setActiveLitNumTab('upload_googleform');
                                handleModuleSelection('litnum');
                              }
                            }}
                            className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-sky-50/60 border-2 border-slate-200/90 hover:border-sky-500 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-left h-full min-h-[165px]"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1.5 mb-2">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                                  <UploadCloud className="w-4.5 h-4.5" />
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-sky-100 text-sky-900 border border-sky-200 text-center break-words leading-tight">
                                  Multi-Spreadsheet
                                </span>
                              </div>
                              <div>
                                <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-sky-700 transition-colors break-words leading-tight">
                                  Impor Multi-File G-Form
                                </h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                                  Akumulasi data riwayat pengerjaan siswa dari Google Form tanpa kehilangan rekap.
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-sky-700 group-hover:text-sky-800 gap-1.5">
                              <span className="break-words leading-tight flex-1">Impor Multi-File</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </div>
                          </div>

                          {/* Item 5: Analisis Capaian & Estimasi Rapor 2026 */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setCurrentView('litnum-management');
                              setActiveLitNumTab('analytics');
                              handleModuleSelection('litnum');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setCurrentView('litnum-management');
                                setActiveLitNumTab('analytics');
                                handleModuleSelection('litnum');
                              }
                            }}
                            className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-emerald-50/60 border-2 border-slate-200/90 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-left h-full min-h-[165px]"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1.5 mb-2">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                                  <TrendingUp className="w-4.5 h-4.5" />
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-emerald-100 text-emerald-900 border border-emerald-200 text-center break-words leading-tight">
                                  Mutu 2026
                                </span>
                              </div>
                              <div>
                                <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-emerald-700 transition-colors break-words leading-tight">
                                  Analisis &amp; Estimasi Rapor
                                </h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                                  Visualisasi persentase literasi &amp; numerasi siswa, grafik domain, &amp; estimasi 2026.
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-emerald-700 group-hover:text-emerald-800 gap-1.5">
                              <span className="break-words leading-tight flex-1">Lihat Analitik</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </div>
                          </div>

                          {/* Item 6: Rekapitulasi Nilai Siswa & Database Rombel */}
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setCurrentView('litnum-management');
                              setActiveLitNumTab('rekap');
                              handleModuleSelection('litnum');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                setCurrentView('litnum-management');
                                setActiveLitNumTab('rekap');
                                handleModuleSelection('litnum');
                              }
                            }}
                            className="p-3.5 sm:p-4 rounded-2xl bg-white hover:bg-amber-50/60 border-2 border-slate-200/90 hover:border-amber-500 shadow-xs hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between text-left h-full min-h-[165px]"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-1.5 mb-2">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all shadow-2xs shrink-0">
                                  <Layers className="w-4.5 h-4.5" />
                                </div>
                                <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-amber-100 text-amber-900 border border-amber-200 text-center break-words leading-tight">
                                  Rekap Nilai
                                </span>
                              </div>
                              <div>
                                <h4 className="font-black text-xs sm:text-sm text-slate-900 group-hover:text-amber-700 transition-colors tracking-tight break-words leading-tight">
                                  Rekapitulasi Nilai Siswa
                                </h4>
                                <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed mt-1 break-words whitespace-normal line-clamp-2">
                                  Pangkalan data akumulasi skor siswa per rombel, filter domain, batas KKTP, &amp; ekspor.
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] sm:text-xs font-bold text-amber-700 group-hover:text-amber-800 gap-1.5">
                              <span className="break-words leading-tight flex-1">Buka Rekap</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform shrink-0" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer Bar Kotak LitNum */}
                      <div className="pt-4 border-t border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <span className="text-slate-600 font-medium flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                          <span>Mode otomatisasi pengerjaan siswa: <strong>Selasa (Literasi)</strong> &amp; <strong>Rabu (Numerasi)</strong> pukul <strong>{liveSchedule.timeRangeText}</strong>.</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            setCurrentView('litnum-management');
                            handleModuleSelection('litnum');
                          }}
                          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 shrink-0"
                        >
                          <span>Buka Dasbor Lengkap Pengolahan LitNum</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Action logout */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Sesi terenkripsi &amp; aman
            </span>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar dari Akun</span>
            </button>
          </div>
        </motion.div>
      </div>
      </div>

      {/* Footer Info - Clean transparent footer with high contrast for light background */}
      <LoginFooter isDarkBg={false} />


      {/* MODAL PEMBERITAHUAN REKAP NILAI TERKUNCI */}
      <AnimatePresence>
        {isRekapNilaiLockedModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border-2 border-indigo-300 text-slate-800 space-y-4 my-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col shrink-0 overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-300 text-indigo-900 flex items-center justify-center shrink-0 shadow-xs">
                    <Lock className="w-6 h-6 text-indigo-700" />
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-950 border border-indigo-300 inline-block mb-1">
                      PEMBERITAHUAN SISTEM
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                      Modul Rekapitulasi Nilai &amp; Leger Terkunci
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setIsRekapNilaiLockedModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-indigo-50/80 rounded-2xl border border-indigo-200 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-xs">
                  <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>Pesan dari Administrator Sekolah:</span>
                </div>
                <p className="text-xs text-indigo-950 leading-relaxed font-semibold">
                  "{school?.rekapNilaiLockReason || 'Modul Rekapitulasi Nilai & Leger Siswa saat ini sedang dikunci oleh Administrator.'}"
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h5 className="font-bold text-slate-800">Status Akses &amp; Informasi:</h5>
                <ul className="space-y-1.5 text-[11.5px]">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong>Operator, Guru Mapel, &amp; Pendidik:</strong> Belum dapat mengedit atau merekap nilai sementara waktu.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span><strong>Administrator:</strong> Memiliki keleluasaan penuh untuk membuka atau mengunci modul kapan saja.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsRekapNilaiLockedModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Mengerti &amp; Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL PEMBERITAHUAN FORMATIF TERKUNCI (UNTUK OPERATOR, GURU, KEPSEK) */}
      <AnimatePresence>
        {isFormatifLockedModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border-2 border-amber-300 text-slate-800 space-y-4 my-auto max-h-[85vh] sm:max-h-[90vh] flex flex-col shrink-0 overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shrink-0 shadow-xs">
                    <Lock className="w-6 h-6 text-amber-700" />
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-950 border border-amber-300 inline-block mb-1">
                      PEMBERITAHUAN SISTEM
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                      Modul Tugas Formatif Sedang Terkunci
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setIsFormatifLockedModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Pesan dari Administrator Sekolah:</span>
                </div>
                <p className="text-xs text-amber-950 leading-relaxed font-semibold">
                  "{school?.formatifLockReason || 'Modul Tugas Formatif saat ini sedang dalam proses pengembangan & penyempurnaan via prompt oleh Administrator. Modul akan dibuka setelah seluruh sistem tugas formatif siap digunakan.'}"
                </p>
              </div>

              <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <h5 className="font-bold text-slate-800">Status Akses &amp; Informasi Pengembangan:</h5>
                <ul className="space-y-1.5 text-[11.5px]">
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span><strong>Operator, Guru Mapel, &amp; Kepala Sekolah:</strong> Belum dapat mengakses sementara waktu demi menjaga konsistensi data selama pengembangan.</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    <span><strong>Administrator:</strong> Memiliki keleluasaan penuh untuk merancang, menguji, dan mengembangkan modul via prompt.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsFormatifLockedModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Mengerti &amp; Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
