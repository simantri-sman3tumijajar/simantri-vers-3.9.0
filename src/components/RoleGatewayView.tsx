import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ShieldCheck,
  GraduationCap,
  Users,
  Sparkles,
  ArrowRight,
  Clock,
  Loader2,
  Construction,
  X,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  FileCheck2,
  BookOpenCheck,
  Lock,
  Layers,
  Calendar,
  School,
  Info,
  Wrench,
  Key,
  BookOpen,
  FileSpreadsheet,
  HeartHandshake,
  Laptop,
  ListOrdered,
  WifiOff,
  QrCode,
  Award,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { scrollToTop } from '../utils/scrollHelper';
import { resolveStudentPortalLockInfo, shouldShowLitNumButton, evaluateLitNumAccess, LitNumAccessValidation } from '../utils/studentPortalLockHelper';
import { LitNumStatusModal } from './LitNumStatusModal';
import { evaluateLitNumSchedule } from '../utils/litnumScheduleHelper';
import { LoginFooter } from './LoginFooter';

interface RoleGatewayViewProps {
  onSelectRole?: (role: 'admin' | 'guru' | 'siswa', mode?: string) => void;
}

export const RoleGatewayView: React.FC<RoleGatewayViewProps> = ({ onSelectRole }) => {
  const navigate = useNavigate();
  const { state, showToast } = useApp();
  const { t } = useLanguage();
  const school = state?.schoolInfo;

  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [targetRole, setTargetRole] = useState<'admin' | 'guru' | 'siswa' | null>(null);
  const [isDevModalOpen, setIsDevModalOpen] = useState(false);

  // Live timer every 30s for automatic evaluation of LitNum schedule and lock status
  const [currentEvalTime, setCurrentEvalTime] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentEvalTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const lockInfo = resolveStudentPortalLockInfo(school);
  const isStudentPortalLocked = lockInfo.isLocked;
  const isStudentPortalHidden = Boolean(school?.studentPortalHidden ?? false);
  const { show: showLitNumButton } = shouldShowLitNumButton(
    school,
    state?.litnumScheduleConfig,
    currentEvalTime
  );
  const liveSchedule = evaluateLitNumSchedule(state?.litnumScheduleConfig, currentEvalTime);

  // Real-time system stats for dynamic card badging and up-to-date descriptions
  const totalStudents = state?.students?.length || 0;
  const totalTeachers = state?.teachers?.length || 0;
  const totalClasses = state?.classes?.length || 0;
  const totalAssessments = state?.assessments?.length || 0;
  const totalSchedules = state?.examManagement?.schedules?.length || 0;

    const [isLitNumStatusModalOpen, setIsLitNumStatusModalOpen] = useState(false);
  const [litNumValidationResult, setLitNumValidationResult] = useState<LitNumAccessValidation | null>(null);

  const handleLitNumButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const val = evaluateLitNumAccess(school, state?.litnumScheduleConfig, currentEvalTime);
    if (!val.canAccess) {
      setLitNumValidationResult(val);
      setIsLitNumStatusModalOpen(true);
      return;
    }
    handleRoleSelect('siswa', 'litnum');
  };

  const handleRoleSelect = (role: 'admin' | 'guru' | 'siswa', mode?: string) => {
    scrollToTop({ smooth: true });
    setIsLoading(true);
    setLoadingProgress(0);
    setTargetRole(role);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      setLoadingProgress(Math.min(progress, 100));
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsLoading(false);
          scrollToTop({ smooth: true });
          if (role === 'admin') {
            navigate('/login-admin');
          } else if (role === 'guru') {
            navigate('/login-gtk');
          } else if (role === 'siswa') {
            const storedStudent =
              typeof window !== 'undefined'
                ? sessionStorage.getItem('smantri_active_student') || localStorage.getItem('smantri_active_student')
                : null;

            if (storedStudent) {
              if (mode === 'litnum') {
                navigate('/siswa/litnum');
              } else {
                navigate('/siswa/dashboard');
              }
            } else {
              navigate('/siswa/login');
            }
          }
          onSelectRole?.(role, mode);
        }, 200);
      }
    }, 120);
  };

  const handleStudentClick = () => {
    if (isStudentPortalLocked) {
      setIsDevModalOpen(true);
    } else {
      handleRoleSelect('siswa');
    }
  };

  if (isLoading) {
    const roleTitle =
      targetRole === 'admin'
        ? 'Portal Administrator & Operator Sekolah'
        : targetRole === 'guru'
        ? 'Portal Guru, GTK & Kepala Sekolah'
        : 'Informasi Pengembangan Portal Siswa';

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/70 to-indigo-50/80 flex flex-col justify-center items-center py-10 px-4 sm:px-6 lg:px-8 text-slate-800 relative">
        {/* Decorative radiant backgrounds */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-200/50 to-sky-200/40 blur-3xl" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-sky-200/50 to-indigo-200/40 blur-3xl" />
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
          {/* Logo Lockup */}
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

          {/* Oval Glassmorphic Loader Area */}
          <div className="relative flex flex-col items-center mb-8">
            <div className="absolute w-24 h-24 rounded-full bg-indigo-500/10 border border-indigo-500/20 animate-ping duration-[3000ms] pointer-events-none" />
            
            <div className="w-20 h-20 bg-white/95 border border-slate-200/90 rounded-3xl flex items-center justify-center shadow-xl shadow-slate-200/80 relative z-10">
              <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div>
              <p className="text-[11px] font-black text-indigo-700 tracking-widest uppercase">MEMUAT LAYANAN PORTAL</p>
              <h3 className="text-xl font-black text-slate-900 mt-1">{roleTitle}</h3>
            </div>

            {/* High-fidelity progress bar */}
            <div className="space-y-3">
              <div className="w-full max-w-xs mx-auto bg-slate-200/90 border border-slate-300 rounded-full h-2.5 overflow-hidden p-0.5 shadow-inner">
                <motion.div 
                  className="bg-gradient-to-r from-indigo-600 to-sky-500 h-full rounded-full transition-all duration-150"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <p className="text-xs text-slate-600 font-semibold">
                Menyiapkan autentikasi &amp; sistem... {loadingProgress}%
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/60 to-indigo-50/70 flex flex-col justify-between pt-6 pb-0 px-4 sm:px-6 lg:px-8 text-slate-800 relative selection:bg-indigo-600 selection:text-white">
      {/* Background Decorative Radiant Glows & Grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-gradient-to-br from-indigo-200/50 to-sky-200/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-gradient-to-tr from-sky-200/50 to-indigo-200/40 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-indigo-100/35 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(#1e1b4b 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto w-full relative z-10 flex-1 flex flex-col justify-center my-auto">
        {/* Top Branding & Welcome Section */}
        <div className="text-center sm:mx-auto sm:w-full sm:max-w-3xl mb-8">
          {/* Official Logos */}
          <div className="flex items-center justify-center gap-4 mb-3">
            <img
              src={school?.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
              alt="Logo Provinsi Lampung"
              className="h-14 sm:h-16 w-auto object-contain drop-shadow-xs"
            />
            <div className="h-10 w-px bg-slate-300/80" />
            <img
              src={school?.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
              alt={school?.namaSekolah || 'Logo SMAN 3 Tumijajar'}
              style={{ transform: `scale(${(school?.logoSekolahScale || 100) / 100})` }}
              className="h-14 sm:h-16 w-auto object-contain drop-shadow-xs transition-transform"
            />
          </div>

          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Prominent Welcome Greeting at Very Top */}
            <div className="inline-block px-5 py-1.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-700 text-white shadow-md shadow-indigo-600/20 mb-3">
              <span className="text-xs sm:text-sm font-black tracking-wide uppercase flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Selamat Datang di SiMantri {school?.namaSekolah || 'SMAN 3 Tumijajar'}</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-indigo-100/90 text-indigo-800 border border-indigo-200 shadow-2xs">
                {t('header.deep_learning', 'Kurikulum Merdeka (Deep Learning)')}
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-xs font-bold bg-sky-100/90 text-sky-900 border border-sky-200 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-sky-600" />
                <span>T.A. {school?.tahunAjaranAktif || '2026/2027'} ({school?.semesterAktif || 'Ganjil'})</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100/90 text-emerald-800 border border-emerald-200 shadow-2xs">
                v.3.9.0
              </span>
            </div>

            {/* Maintenance Mode Banner on Welcome Screen */}
            {school?.maintenanceMode && (
              <div className="mt-3 mb-2 max-w-2xl mx-auto p-3.5 rounded-2xl bg-amber-500 text-slate-950 font-extrabold text-xs border-2 border-amber-400 shadow-md flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-950 text-amber-400 rounded-xl animate-pulse shrink-0">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-black text-xs uppercase tracking-wide text-slate-950 block">MODE PEMELIHARAAN SISTEM AKTIF</span>
                    <span className="text-[11px] text-slate-900 font-semibold">{school.maintenanceMessage || 'Sistem sedang dalam penyesuaian oleh Administrator.'}</span>
                  </div>
                </div>
              </div>
            )}

            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              SiMantri
            </h1>
            <p className="mt-0.5 text-xs sm:text-base font-extrabold text-slate-800 tracking-wide uppercase">
              {school?.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
            </p>
            <p className="text-xs sm:text-sm text-indigo-700 font-semibold mt-0.5">
              Sistem Informasi &amp; Manajemen Akademik
            </p>

            <div className="mt-3.5 inline-block px-4 py-1.5 rounded-2xl bg-white/90 backdrop-blur-xs border border-slate-200 text-xs text-slate-700 font-medium shadow-2xs">
              Silakan pilih jalur akses peran Anda untuk melanjutkan ke layanan sistem:
            </div>
          </motion.div>
        </div>

        {/* Role Gateway Cards: Admin, Guru, & Siswa (Siswa can be hidden or locked by Admin) */}
        <div
          className={`grid grid-cols-1 ${
            isStudentPortalHidden ? 'md:grid-cols-2 max-w-3xl' : 'md:grid-cols-3 max-w-6xl'
          } gap-5 sm:gap-6 lg:gap-8 mx-auto w-full transition-all duration-300`}
        >
          {/* Card 1: ADMIN */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="flex flex-col"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleRoleSelect('admin')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRoleSelect('admin'); }}
              className="text-left p-6 sm:p-7 rounded-3xl bg-white hover:bg-purple-50/30 border-2 border-slate-200 hover:border-purple-600 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[380px]"
            >
              {/* Top Gradient Highlight Bar */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-slate-800" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0 group-hover:bg-purple-700 group-hover:text-white transition-all shadow-xs">
                    <ShieldCheck className="w-7 h-7" />
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs">
                    Administrator
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-purple-700 transition-colors tracking-tight">
                  Admin Sistem
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Pengelola Sistem, Database &amp; Jadwal Ujian
                </p>

                {/* Feature Bullets Upgraded */}
                <ul className="mt-4 space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                    <span><strong>Manajemen Ujian CBT &amp; Token 6-Digit:</strong> Jadwal ASTS/ASAS, rilis token harian kelas X-XII &amp; reset login</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                    <span><strong>Master Data &amp; Kartu Peserta:</strong> Data Dapodik siswa/guru, cetak kartu ujian QR Code &amp; Berita Acara</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-600 mt-1.5 shrink-0" />
                    <span><strong>Keamanan, Firestore &amp; Dev Hub:</strong> Kontrol kunci portal siswa, mode pemeliharaan &amp; log aktivitas</span>
                  </li>
                </ul>
              </div>

              {/* Bottom Action Button Inside Box */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:text-purple-800">
                <span className="font-extrabold">Masuk sebagai Admin Sistem</span>
                <div className="w-9 h-9 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center group-hover:bg-purple-700 group-hover:text-white transition-all shadow-2xs">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: GURU & TENAGA KEPENDIDIKAN */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="flex flex-col"
          >
            <div
              role="button"
              tabIndex={0}
              onClick={() => handleRoleSelect('guru')}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleRoleSelect('guru'); }}
              className="text-left p-6 sm:p-7 rounded-3xl bg-white hover:bg-indigo-50/40 border-2 border-indigo-200 hover:border-indigo-600 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between cursor-pointer group active:scale-[0.98] relative overflow-hidden h-full min-h-[380px] ring-2 ring-indigo-500/10"
            >
              {/* Top Gradient Highlight Bar */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 via-sky-500 to-blue-600" />

              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                    <GraduationCap className="w-7 h-7" />
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-2xs">
                    Guru &amp; GTK
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-indigo-700 transition-colors tracking-tight">
                  Guru &amp; GTK
                </h3>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Pendidik, Wali Kelas, Guru BK &amp; Kepala Sekolah
                </p>

                {/* Feature Bullets Upgraded */}
                <ul className="mt-4 space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span><strong>Bank Soal CBT Multi-Model:</strong> Soal PG, PG Kompleks, Matrix, Menjodohkan &amp; Uraian AI</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span><strong>Koreksi Massal AI Vision:</strong> Pindai LJK kamera instan, pembobotan &amp; Analisis Butir D3</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span><strong>Pusat BK Hebat &amp; 7 Jurus:</strong> Jurnal emosi, pemetaan bakat SNBP &amp; pantauan murid binaan</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                    <span><strong>Rapor STS &amp; Supervisi Kepsek:</strong> Cetak Rapor QR Code, e-Rapor Leger &amp; audit manajerial</span>
                  </li>
                </ul>
              </div>

              {/* Bottom Action Button Inside Box */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700 group-hover:text-indigo-800">
                <span className="font-extrabold">Masuk sebagai Guru / GTK</span>
                <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-2xs">
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 3: PESERTA DIDIK (SISWA) - BISA DIBUKA / DIKUNCI / DISEMBUYIKAN BY ADMIN */}
          {!isStudentPortalHidden && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="flex flex-col"
            >
              <div
                className={`text-left p-6 sm:p-7 rounded-3xl border-2 shadow-md hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden h-full min-h-[380px] ${
                  isStudentPortalLocked
                    ? 'bg-white hover:bg-rose-50/30 border-slate-200 hover:border-rose-400'
                    : 'bg-white hover:bg-orange-50/40 border-orange-200 hover:border-orange-500 ring-2 ring-orange-500/10'
                }`}
              >
                {/* Top Gradient Highlight Bar */}
                <div
                  className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
                    isStudentPortalLocked
                      ? 'from-rose-500 via-amber-500 to-orange-500'
                      : 'from-orange-600 via-amber-500 to-yellow-500'
                  }`}
                />

                <div className="cursor-pointer" onClick={handleStudentClick}>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-14 h-14 rounded-2xl border flex items-center justify-center shrink-0 transition-all shadow-xs ${
                        isStudentPortalLocked
                          ? 'bg-rose-50 border-rose-200 text-rose-600 group-hover:bg-rose-600 group-hover:text-white'
                          : 'bg-orange-50 border-orange-200 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'
                      }`}
                    >
                      <Users className="w-7 h-7" />
                    </div>

                    {isStudentPortalLocked ? (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300 flex items-center gap-1 shadow-2xs">
                        <Lock className="w-3 h-3 text-rose-600" />
                        Akses Terkunci Admin
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl text-[10px] font-black bg-orange-100 text-orange-900 border border-orange-300 flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-orange-600" />
                        Akses Terbuka &amp; Aktif
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-orange-700 transition-colors tracking-tight">
                    Peserta Didik (Siswa)
                  </h3>
                  <p className="text-xs font-semibold text-slate-500 mt-0.5">
                    Portal Asesmen CBT &amp; Ujian Siswa SiMantri
                  </p>

                  {/* Feature Bullets tailored specifically for locked / unlocked state */}
                  <ul className="mt-4 space-y-2.5 text-xs text-slate-600 border-t border-slate-100 pt-3">
                    {isStudentPortalLocked ? (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-600 mt-1 shrink-0" />
                          <span className="font-black text-rose-700 leading-tight">
                            {lockInfo.title}
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
                          <span className="text-slate-700 font-medium leading-relaxed">
                            {lockInfo.description}
                          </span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-2 h-2 rounded-full bg-slate-400 mt-1 shrink-0" />
                          <span className="text-slate-500 italic leading-snug">
                            Klik kartu untuk rincian jadwal dan pengumuman resmi dari Administrator
                          </span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 shrink-0" />
                          <span><strong>Ruang Ujian CBT Fleksibel &amp; Responsif:</strong> Fitur sembunyikan/tampilkan daftar nomor soal agar layar lebih lega di HP &amp; laptop</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 shrink-0" />
                          <span><strong>Asesmen LitNum (Bebas Sandi):</strong> Ujian rutin literasi &amp; numerasi sains terhubung ke Rapor Pendidikan</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-1.5 shrink-0" />
                          <span><strong>Anti-Cheat &amp; Auto-Save Offline:</strong> Proteksi split-screen &amp; simpan jawaban otomatis jika sinyal terputus</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {/* Action Buttons Section */}
                <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                  {/* LitNum Button: ONLY shown if showLitNumButton is true (auto-hides when locked or outside schedule) */}
                  {showLitNumButton && (
                    <button
                      type="button"
                      onClick={handleLitNumButtonClick}
                      className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 text-white font-extrabold text-xs shadow-2xs flex items-center justify-between hover:scale-[1.01] transition-all cursor-pointer group/lit"
                    >
                      <div className="text-left space-y-0.5">
                        <div className="flex items-center gap-1.5 font-black text-xs">
                          <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                          <span>Asesmen CBT LitNum</span>
                        </div>
                        <p className="text-[10px] text-amber-100 font-medium leading-none">
                          Bebas Sandi • Jadwal Rutin Selasa &amp; Rabu
                        </p>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover/lit:translate-x-0.5">
                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                      </div>
                    </button>
                  )}

                  {/* Bottom Action Button Inside Box matching Admin & Guru Cards */}
                  <div
                    onClick={handleStudentClick}
                    className="flex items-center justify-between text-xs font-bold text-orange-700 group-hover:text-orange-800 cursor-pointer pt-1"
                  >
                    <span className="font-extrabold">
                      {isStudentPortalLocked ? 'Informasi Akses Ruang Ujian' : 'Masuk Ruang Ujian CBT Siswa'}
                    </span>
                    <div className="w-9 h-9 rounded-full bg-orange-50 text-orange-700 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-all shadow-2xs">
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

            {/* Modal Status Ujian LitNum Interaktif (Validasi Status Berlapis) */}
      <LitNumStatusModal
        isOpen={isLitNumStatusModalOpen}
        onClose={() => setIsLitNumStatusModalOpen(false)}
        validation={litNumValidationResult}
      />

      {/* Footer Info - Clean transparent footer with high contrast for light background */}
      <LoginFooter isDarkBg={false} />

      {/* MODAL PEMBERITAHUAN TAHAP PENGEMBANGAN SISTEM PORTAL SISWA */}
      <AnimatePresence>
        {isDevModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.25 }}
              className="bg-white rounded-3xl shadow-2xl border-2 border-amber-200/90 w-full max-w-3xl overflow-hidden relative my-auto max-h-[90vh] flex flex-col"
            >
              {/* Top Accent Strip */}
              <div className="h-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 shrink-0" />

              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex items-start justify-between gap-4 bg-slate-50/70 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
                    <Construction className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-700 animate-spin" style={{ animationDuration: '4s' }} />
                        Tahap Pengembangan Sistem
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200/80 text-slate-700">
                        SiMantri SMAN 3 Tumijajar
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 mt-1">
                      {lockInfo.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDevModalOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0 shadow-2xs"
                  title="Tutup pemberitahuan"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-700 text-xs sm:text-sm leading-relaxed">
                {/* Official Statement Banner */}
                <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-3">
                  <div className="flex items-center gap-2 font-black text-amber-900 text-xs sm:text-sm">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Pemberitahuan Resmi Pelaksanaan Asesmen CBT:</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white border border-amber-300 text-xs text-amber-950 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-black text-rose-700 text-xs">
                      <Lock className="w-3.5 h-3.5" />
                      <span>{lockInfo.title}</span>
                    </div>
                    <p className="font-semibold text-slate-700 leading-relaxed">
                      {lockInfo.description}
                    </p>
                  </div>

                  {lockInfo.nextSessionInfo && (
                    <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-200 text-xs flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <span className="font-extrabold text-indigo-900 block text-[11px]">JADWAL PEMBUKAAN SESI BERIKUTNYA:</span>
                        <span className="font-bold text-slate-800">{lockInfo.nextSessionInfo}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-xs leading-relaxed text-justify">
                    Akses masuk dan pengerjaan soal ujian CBT serta asesmen bagi peserta didik (siswa) di lingkungan <strong>SMA Negeri 3 Tumijajar</strong> dikontrol langsung oleh Panitia &amp; Administrator demi ketertiban serta kelancaran ujian.
                  </p>
                  <p className="text-xs leading-relaxed text-justify pt-1 border-t border-amber-200/60 font-medium text-slate-600">
                    Siswa dipersilakan menunggu arahan dari Pengawas Ruang atau Panitia CBT untuk token sesi dan pembukaan pintu ruang ujian.
                  </p>
                </div>

                {/* Section: Rencana Fitur Unggulan */}
                <div className="space-y-3">
                  <div className="border-b border-slate-100 pb-1.5 flex items-center gap-2 text-slate-900 font-extrabold text-xs sm:text-sm">
                    <Cpu className="w-4 h-4 text-indigo-600" />
                    <span>Rencana Fitur Unggulan yang Sedang Dipersiapkan</span>
                  </div>
                  <p className="text-[11.5px] text-slate-500">
                    Fitur-fitur modern yang akan segera hadir pada Portal Siswa SiMantri untuk menunjang pembelajaran di era Kurikulum Merdeka (Deep Learning):
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-indigo-600 shrink-0" />
                        <span className="font-extrabold text-xs text-slate-900">Autentikasi Terverifikasi NISN &amp; Token</span>
                      </div>
                      <span className="inline-block text-[9.5px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        Keamanan Berlapis
                      </span>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Peserta didik akan masuk menggunakan NISN resmi dan token ujian dinamis yang diterbitkan per sesi asesmen untuk memastikan validitas dan integritas pelaksanaan ujian.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center gap-2">
                        <BookOpenCheck className="w-4 h-4 text-sky-600 shrink-0" />
                        <span className="font-extrabold text-xs text-slate-900">Computer-Based Test (CBT) Mandiri</span>
                      </div>
                      <span className="inline-block text-[9.5px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                        Asesmen Sumatif Digital
                      </span>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Pelaksanaan ASTS dan ASAS secara digital dengan antarmuka yang bersih, responsif di HP/laptop, navigasi ragu-ragu, pengingat durasi waktu, dan mekanisme anti-kecurangan.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-extrabold text-xs text-slate-900">Integrasi Koreksi AI Vision Guru</span>
                      </div>
                      <span className="inline-block text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        Otomatisasi &amp; Validasi
                      </span>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Hasil pengerjaan lembar ujian akan langsung diproses dan disinkronkan dengan sistem koreksi massal AI Vision guru mapel, mempercepat publikasi dan verifikasi nilai akhir.
                      </p>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                      <div className="flex items-center gap-2">
                        <FileCheck2 className="w-4 h-4 text-purple-600 shrink-0" />
                        <span className="font-extrabold text-xs text-slate-900">Portofolio Rapor &amp; Bukti Otentik</span>
                      </div>
                      <span className="inline-block text-[9.5px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                        Transparansi Nilai
                      </span>
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Siswa dan wali murid dapat mengunduh dokumen bukti otentik penilaian dan Rapor Sumatif Tengah Semester (STS) lengkap dengan capaian kompetensi Pembelajaran Mendalam.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section: Prosedur Transisi */}
                <div className="space-y-2.5">
                  <div className="border-b border-slate-100 pb-1.5 flex items-center gap-2 text-slate-900 font-extrabold text-xs sm:text-sm">
                    <Info className="w-4 h-4 text-indigo-600" />
                    <span>Prosedur Akademik &amp; Pelaksanaan Ujian Selama Masa Transisi</span>
                  </div>
                  <p className="text-[11.5px] text-slate-500">
                    Pedoman bagi peserta didik dan orang tua/wali murid selama portal mandiri siswa dalam tahap finalisasi:
                  </p>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                        1
                      </span>
                      <div>
                        <strong className="text-slate-900 font-bold">Pelaksanaan Ujian Melalui Panitia &amp; Guru Mapel:</strong>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                          Seluruh jadwal dan pelaksanaan Asesmen Sumatif (ASTS / ASAS) dilaksanakan sesuai dengan instruksi Panitia Asesmen Sekolah dan Bapak/Ibu Guru Mata Pelajaran yang bertugas di ruang kelas.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                        2
                      </span>
                      <div>
                        <strong className="text-slate-900 font-bold">Pengolahan Nilai Berpusat di Portal Pendidik:</strong>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                          Pemeriksaan lembar jawaban, pembobotan nilai, deskripsi capaian kompetensi, serta berita acara penilaian dilakukan langsung oleh Bapak/Ibu Guru melalui Portal Guru SiMantri.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                        3
                      </span>
                      <div>
                        <strong className="text-slate-900 font-bold">Distribusi Hasil Belajar oleh Wali Kelas:</strong>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                          Laporan Hasil Belajar (Rapor STS / Rapor Semester) akan dicetak dan dibagikan secara resmi oleh Wali Kelas kepada peserta didik dan orang tua/wali murid pada tanggal yang telah ditetapkan kalender akademik.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                        4
                      </span>
                      <div>
                        <strong className="text-slate-900 font-bold">Sosialisasi Peluncuran Akun Siswa:</strong>
                        <p className="text-slate-600 text-[11px] mt-0.5 leading-relaxed">
                          Informasi mengenai aktivasi akun resmi, pembagian kartu login, dan petunjuk teknis aplikasi akan disosialisasikan secara resmi oleh pihak sekolah menjelang jadwal peluncuran umum.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Milestone */}
                <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-2.5">
                  <div className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">
                    MILESTONE PENGEMBANGAN SISTEM
                  </div>
                  <div className="font-extrabold text-xs">
                    Tahapan Rilis Layanan Siswa SiMantri SMAN 3 Tumijajar
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-slate-800/90 border border-emerald-500/30 space-y-1">
                      <div className="flex items-center justify-between text-emerald-400 font-bold text-[10px]">
                        <span>Tahap 1</span>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="font-bold text-white text-[11px]">Sinkronisasi Dapodik</div>
                      <span className="inline-block px-1.5 py-0.2 rounded text-[8.5px] font-black bg-emerald-500/20 text-emerald-300">
                        SELESAI
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-800/90 border border-amber-500/40 space-y-1">
                      <div className="flex items-center justify-between text-amber-400 font-bold text-[10px]">
                        <span>Tahap 2</span>
                        <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
                      </div>
                      <div className="font-bold text-white text-[11px]">Pengembangan Modul CBT</div>
                      <span className="inline-block px-1.5 py-0.2 rounded text-[8.5px] font-black bg-amber-500/20 text-amber-300">
                        SEDANG BERJALAN
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1">
                      <div className="text-slate-400 font-bold text-[10px]">Tahap 3</div>
                      <div className="font-bold text-white text-[11px]">Gladi Bersih &amp; Uji Beban</div>
                      <span className="inline-block px-1.5 py-0.2 rounded text-[8.5px] font-black bg-slate-700 text-slate-300">
                        SEGERA DATANG
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1">
                      <div className="text-slate-400 font-bold text-[10px]">Tahap 4</div>
                      <div className="font-bold text-white text-[11px]">Rilis Resmi Akses Siswa</div>
                      <span className="inline-block px-1.5 py-0.2 rounded text-[8.5px] font-black bg-slate-700 text-slate-300">
                        TAHAP AKHIR
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsDevModalOpen(false);
                    handleRoleSelect('siswa');
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition-all cursor-pointer shadow-2xs"
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Lihat Kalender &amp; Jadwal Ujian Lengkap</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDevModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95 ml-auto"
                >
                  Saya Mengerti &amp; Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
