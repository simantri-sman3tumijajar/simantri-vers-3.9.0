import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Calendar,
  Sparkles,
  Settings,
  LogOut,
  User,
  Menu,
  MessageSquarePlus,
  HeartHandshake,
  Wrench,
  FolderCog,
  GraduationCap,
  PanelLeftOpen,
  ChevronDown,
  ArrowRightLeft,
  ShieldCheck,
  Laptop,
  LayoutDashboard,
  BookOpen,
  Cloud,
  RefreshCw,
  Calculator,
  UserCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PWAInstallButton } from './PWAInstallButton';
import { NetworkBandwidthBadge } from './NetworkBandwidthBadge';
import { NotificationBellDropdown } from './NotificationBellDropdown';
import { FeedbackModal } from './FeedbackModal';


interface HeaderProps {
  onOpenMobileMenu: () => void;
  sidebarHidden?: boolean;
  onToggleSidebar?: () => void;
  onOpenSettings: () => void;
  onOpenDeepLearningGuide: () => void;
  onOpenProfileModal: () => void;
  onInitiateLogout: () => void;
  onInitiateChangeModule?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileMenu,
  sidebarHidden = false,
  onToggleSidebar,
  onOpenSettings,
  onOpenDeepLearningGuide,
  onOpenProfileModal,
  onInitiateLogout,
  onInitiateChangeModule,
}) => {
  const {
    state,
    currentUser,
    currentView,
    setCurrentView,
    selectedModule,
    setSelectedModule,
    setActiveLitNumTab,
    toggleTeacherOnlineStatus,
    showToast,
    isSyncing,
    isOnline,
    lastSyncTime,
    forceCloudSync,
  } = useApp();
  const { t } = useLanguage();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown menu when clicking anywhere outside
  useEffect(() => {
    if (!showProfileMenu) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showProfileMenu]);

  if (!state || !currentUser) return null;

  const school = state.schoolInfo;
  const newFeedbackCount = state.feedbacks?.filter((f) => f.status === 'Baru').length || 0;
  const isAdminOrOperator = currentUser.role === 'admin' || currentUser.role === 'operator';
  const isGuruBK = Boolean(
    currentUser.isGuruBK ||
    currentUser.mataPelajaran?.some(
      (m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'
    )
  );

  const flashBroadcasts = (state.announcements || []).filter(
    (a) => a.isActive !== false && Boolean(a.isFlashBroadcast)
  );

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      {/* Top Urgent Flash Broadcast Alert Bar */}
      {flashBroadcasts.length > 0 && (
        <div className="bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white px-4 py-2 text-xs font-black shadow-md flex items-center justify-between gap-3 border-b border-rose-700 animate-pulse">
          <div className="flex items-center gap-2 truncate">
            <span className="px-2 py-0.5 rounded-md bg-white text-rose-950 font-black text-[10px] uppercase tracking-wider shrink-0 shadow-2xs">
              PENGUMUMAN MENDESAK
            </span>
            <span className="truncate text-white font-bold">
              {flashBroadcasts[0].judul} &mdash; {flashBroadcasts[0].isi}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedModule('manajemen-data');
              setCurrentView('announcements');
            }}
            className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-black text-[11px] underline shrink-0 cursor-pointer transition-all"
          >
            Lihat Detail
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-15 sm:h-16 gap-3 min-w-0">
          {/* SISI KIRI: Navigasi Sidebar, Logo Sekolah, dan Identitas Brand Bersih */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0 flex-1">
            {/* Tombol Buka Menu di Mobile */}
            <button
              onClick={onOpenMobileMenu}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-hidden shrink-0"
              aria-label="Buka Menu Navigasi"
              title="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Tombol Buka Sidebar di Desktop (hanya tampil jika sidebar sedang disembunyikan) */}
            {sidebarHidden && onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="hidden lg:flex p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/80 transition-colors focus:outline-hidden shrink-0"
                aria-label="Tampilkan Bilah Samping"
                title="Tampilkan Bilah Samping (Sidebar)"
              >
                <PanelLeftOpen className="w-4 h-4 text-slate-700" />
              </button>
            )}

            {/* Logo Sekolah SMAN 3 Tumijajar - Rapi & Proporsional (Klik untuk ke Beranda Modul Aktif) */}
            <button
              type="button"
              onClick={() => {
                if (selectedModule === 'litnum') {
                  setActiveLitNumTab('analytics');
                  setCurrentView('litnum-management');
                } else if (selectedModule === 'rekap-nilai') {
                  setCurrentView('rekap-nilai-dashboard');
                } else if (selectedModule === 'manajemen-ujian') {
                  setCurrentView('exam-management');
                } else if (selectedModule === 'bk-hebat') {
                  setCurrentView('bimbingan-konseling');
                } else if (selectedModule === 'tugas') {
                  setCurrentView('tugas');
                } else if (selectedModule === 'kesiswaan') {
                  setCurrentView('kesiswaan-input');
                } else if (selectedModule === 'manajemen-data') {
                  setCurrentView('students');
                } else if (selectedModule === 'sumatif') {
                  setCurrentView('assessments');
                } else {
                  setCurrentView('students');
                }
              }}
              className="flex items-center gap-2.5 sm:gap-3 text-left cursor-pointer group"
              title="Kembali ke Menu Modul Aktif"
            >
              <div className="relative flex items-center justify-center shrink-0">
                <div className="w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-xl bg-slate-50 border border-slate-200/80 p-1 flex items-center justify-center shadow-2xs group-hover:scale-105 group-hover:border-indigo-400 transition-all">
                  <img
                    src={school.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                    alt={school.namaSekolah || 'Logo SMAN 3 Tumijajar'}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://iili.io/n1vlf2t.png';
                    }}
                  />
                </div>
              </div>

              {/* Judul Utama & Indikator Modul Aktif Ringkas */}
              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors tracking-tight leading-tight shrink-0">
                    SiMantri
                  </span>

                  {/* Badge Konteks Modul Aktif (Rapi & Minimalis) */}
                  {selectedModule === 'rekap-nilai' ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
                      <Calculator className="w-3 h-3 text-emerald-600" />
                      <span>Rekap Nilai &amp; Leger</span>
                    </span>
                  ) : selectedModule === 'manajemen-ujian' ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-200/80 shrink-0">
                      <Laptop className="w-3 h-3 text-cyan-600" />
                      <span>Manajemen Ujian</span>
                    </span>
                  ) : selectedModule === 'manajemen-data' ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
                      <FolderCog className="w-3 h-3 text-emerald-600" />
                      <span>Manajemen Data</span>
                    </span>
                  ) : selectedModule === 'bk-hebat' ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80 shrink-0">
                      <HeartHandshake className="w-3 h-3 text-purple-600" />
                      <span>Layanan BK Hebat</span>
                    </span>
                  ) : selectedModule === 'litnum' ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shrink-0">
                      <BookOpen className="w-3 h-3 text-amber-600" />
                      <span>Pengolahan LitNum</span>
                    </span>
                  ) : selectedModule === 'kesiswaan' ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-rose-50 text-rose-800 border border-rose-200/80 shrink-0">
                      <UserCheck className="w-3 h-3 text-rose-600" />
                      <span>Presensi Siswa</span>
                    </span>
                  ) : selectedModule === 'tugas' ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shrink-0">
                      <BookOpen className="w-3 h-3 text-amber-600" />
                      <span>Tugas Harian</span>
                    </span>
                  ) : selectedModule === 'sumatif' ? (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/80 shrink-0">
                      <GraduationCap className="w-3 h-3 text-indigo-600" />
                      <span>Modul Asesmen</span>
                    </span>
                  ) : null}

                  {/* Indikator Mode Maintenance (hanya jika aktif dan untuk admin) */}
                  {school.maintenanceMode && currentUser.role === 'admin' && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenSettings();
                      }}
                      className="px-2 py-0.5 rounded-full text-[9px] font-black bg-amber-500 text-slate-950 border border-amber-400 animate-pulse flex items-center gap-1 cursor-pointer shrink-0"
                      title="Mode Pemeliharaan Aktif! Klik untuk Kelola di Pengaturan"
                    >
                      <Wrench className="w-2.5 h-2.5 text-slate-950" />
                      <span className="hidden md:inline">MAINTENANCE</span>
                    </span>
                  )}
                </div>

                {/* Sub-label Nama Sekolah */}
                <p className="text-[10px] sm:text-[11px] text-slate-500 font-medium leading-tight truncate mt-0.5">
                  {school.namaSekolah || 'SMAN 3 Tumijajar'}
                </p>
              </div>
            </button>
          </div>

          {/* SISI KANAN: Rapi, Minimalis & Elegan */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">

            {/* Badge Cloud Real-Time (Khusus Admin sebagai kendali) */}
            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => forceCloudSync()}
                disabled={isSyncing}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer btn-spring ${
                  !isOnline
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                    : isSyncing
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs'
                    : 'bg-emerald-50/90 hover:bg-emerald-100 text-emerald-800 border-emerald-200 shadow-2xs'
                }`}
                title={`Status: ${!isOnline ? 'Offline' : isSyncing ? 'Sedang Menyinkronkan...' : 'Cloud Real-Time Aktif'}. Terakhir: ${lastSyncTime || 'Baru saja'}. Klik untuk sinkronisasi paksa dari cloud.`}
              >
                {!isOnline ? (
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                ) : isSyncing ? (
                  <RefreshCw className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                ) : (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                )}
                <Cloud className={`w-3.5 h-3.5 ${!isOnline ? 'text-rose-500' : isSyncing ? 'text-indigo-600' : 'text-emerald-600'}`} />
                <span className="hidden sm:inline">
                  {!isOnline ? 'Offline' : isSyncing ? 'Menyinkronkan...' : 'Cloud Real-Time'}
                </span>
              </button>
            )}

            {/* Indikator Tahun Pelajaran (Tampil Utama & Konsisten) */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200/80 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>
                T.P {school.tahunAjaranAktif} ({school.semesterAktif})
              </span>
            </div>


            {/* Lonceng Notifikasi Real-Time Selektif & Anti-Spam */}
            <NotificationBellDropdown />

            {/* Profil Pengguna & Pusat Akses Lengkap Terpadu */}
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1.5 rounded-2xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
                aria-expanded={showProfileMenu}
                title="Buka Menu Profil & Pengaturan Akun"
              >
                {/* Foto Profil dengan Ring Status Sesi */}
                <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full shrink-0 aspect-square border-2 border-indigo-500/30 overflow-hidden bg-slate-100 flex items-center justify-center shadow-2xs">
                  {currentUser.fotoUrl ? (
                    <img
                      src={currentUser.fotoUrl}
                      alt={currentUser.nama}
                      className="w-full h-full rounded-full object-cover object-center aspect-square"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <User className="w-4 h-4 text-indigo-600" />
                  )}
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white ${
                      currentUser.status === 'online' ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                </div>

                {/* Nama & Peran Pengguna (Ringkas & Rapi) */}
                <div className="hidden md:block text-left">
                  <div className="text-xs font-bold text-slate-800 line-clamp-1 max-w-[130px]">
                    {currentUser.nama}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium capitalize flex items-center gap-1">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full ${
                        currentUser.role === 'admin'
                          ? 'bg-purple-600'
                          : currentUser.role === 'operator'
                          ? 'bg-cyan-600'
                          : currentUser.role === 'kepala_sekolah'
                          ? 'bg-amber-600'
                          : isGuruBK
                          ? 'bg-purple-600'
                          : currentUser.isTimKesiswaan
                          ? 'bg-rose-600'
                          : 'bg-emerald-600'
                      }`}
                    />
                    {currentUser.role === 'admin'
                      ? 'Administrator'
                      : currentUser.role === 'operator'
                      ? 'Operator'
                      : currentUser.role === 'kepala_sekolah'
                      ? 'Kepala Sekolah'
                      : isGuruBK
                      ? 'Guru BK'
                      : currentUser.isTimKesiswaan
                      ? 'Tim Kesiswaan'
                      : 'Guru Mapel'}
                  </div>
                </div>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    showProfileMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Menu Dropdown Profil Terpadu (Menampung Item Yang Dipindahkan Dari Header) */}
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.97 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-2xl p-2 z-50 text-slate-700"
                  >
                      {/* Kartu Profil Utama */}
                      <div className="p-3 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-xl mb-2 border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-full shrink-0 aspect-square border-2 border-indigo-500 overflow-hidden bg-slate-100 flex items-center justify-center shadow-xs">
                            {currentUser.fotoUrl ? (
                              <img
                                src={currentUser.fotoUrl}
                                alt={currentUser.nama}
                                className="w-full h-full rounded-full object-cover object-center aspect-square"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <User className="w-6 h-6 text-indigo-600" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {currentUser.nama}
                            </h4>
                            <p className="text-[11px] text-slate-500 truncate">
                              @{currentUser.username} {currentUser.nip ? `• NIP: ${currentUser.nip}` : ''}
                            </p>
                            <span
                              className={`inline-block mt-1 px-2 py-0.5 text-[9.5px] font-bold rounded-md ${
                                currentUser.role === 'admin'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                  : currentUser.role === 'operator'
                                  ? 'bg-cyan-100 text-cyan-800 border border-cyan-200'
                                  : currentUser.role === 'kepala_sekolah'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              }`}
                            >
                              {currentUser.role === 'admin'
                                ? 'Administrator Utama'
                                : currentUser.role === 'operator'
                                ? 'Operator Sekolah'
                                : currentUser.role === 'kepala_sekolah'
                                ? 'Kepala Sekolah'
                                : 'Guru Mata Pelajaran'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info Tahun Ajaran & Konteks Modul Terintegrasi */}
                      <div className="px-3 py-2 bg-slate-50/80 rounded-xl border border-slate-100 mb-2 space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 font-medium flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Tahun Pelajaran:</span>
                          </span>
                          <span className="font-bold text-slate-800">
                            {school.tahunAjaranAktif} ({school.semesterAktif})
                          </span>
                        </div>

                        {isAdminOrOperator && (
                          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-200/60">
                            <span className="text-slate-500 font-medium">Modul Aktif:</span>
                            <span className={`font-bold ${
                              selectedModule === 'rekap-nilai'
                                ? 'text-emerald-700'
                                : selectedModule === 'manajemen-ujian'
                                ? 'text-cyan-700'
                                : selectedModule === 'manajemen-data'
                                ? 'text-emerald-700'
                                : selectedModule === 'litnum'
                                ? 'text-amber-800'
                                : selectedModule === 'tugas'
                                ? 'text-amber-800'
                                : selectedModule === 'bk-hebat'
                                ? 'text-purple-700'
                                : 'text-indigo-700'
                            }`}>
                              {selectedModule === 'rekap-nilai'
                                ? 'Rekap Nilai & Leger'
                                : selectedModule === 'manajemen-ujian'
                                ? 'Manajemen Ujian'
                                : selectedModule === 'manajemen-data'
                                ? 'Manajemen Data'
                                : selectedModule === 'litnum'
                                ? 'Pengolahan LitNum'
                                : selectedModule === 'tugas'
                                ? 'Tugas Harian'
                                : selectedModule === 'bk-hebat'
                                ? 'Layanan BK Hebat'
                                : 'Bank Asesmen & Koreksi'}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tombol Toggle Status Sesi Online / Offline */}
                      <button
                        type="button"
                        onClick={async () => {
                          await toggleTeacherOnlineStatus(currentUser.id);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl mb-1.5 border transition-all cursor-pointer ${
                          currentUser.status === 'online'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                        }`}
                        title="Klik untuk mengubah status sesi akun Anda (Online / Offline)"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              currentUser.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                            }`}
                          />
                          <span>
                            Status Sesi:{' '}
                            <strong className={currentUser.status === 'online' ? 'text-emerald-700 font-bold' : 'text-slate-600 font-bold'}>
                              {currentUser.status === 'online' ? 'Online (Aktif)' : 'Offline'}
                            </strong>
                          </span>
                        </span>
                        <span className="text-[10px] font-semibold underline text-indigo-600">Ubah</span>
                      </button>

                      {/* DAFTAR MENU & FITUR YANG DIPINDAHKAN DARI HEADER AGAR HEADER TETAP RAPI */}
                      <div className="space-y-0.5 pt-1 border-t border-slate-100">
                        {/* Beranda / Dasbor Utama (Hanya tampil di modul Master Data sesuai instruksi) */}
                        {selectedModule === 'manajemen-data' && (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              setCurrentView('dashboard');
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                              currentView === 'dashboard'
                                ? 'bg-sky-50 text-sky-800'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <LayoutDashboard className="w-4 h-4 text-sky-600" />
                            <span>Beranda / Dasbor Utama</span>
                          </button>
                        )}

                        {/* Edit Profil & Foto Akun */}
                        <button
                          onClick={() => {
                            setShowProfileMenu(false);
                            onOpenProfileModal();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          <User className="w-4 h-4 text-slate-500" />
                          <span>{t('header.profile', 'Edit Profil & Foto')}</span>
                        </button>

                        {/* Panduan Pembelajaran Mendalam / 7 Jurus Guru BK Hebat */}
                        {isGuruBK ? (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              onOpenDeepLearningGuide();
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-purple-950 rounded-lg hover:bg-purple-50 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <HeartHandshake className="w-4 h-4 text-purple-600" />
                              <span>7 Jurus Guru BK Hebat</span>
                            </span>
                            <span className="text-[10px] font-black text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded-md border border-purple-200">
                              Kemendikdasmen
                            </span>
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              onOpenDeepLearningGuide();
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 rounded-lg hover:bg-amber-50/80 hover:text-amber-900 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <Sparkles className="w-4 h-4 text-amber-600" />
                              <span>{t('header.deep_learning', 'Pembelajaran Mendalam')}</span>
                            </span>
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              8 Dimensi
                            </span>
                          </button>
                        )}

                        {/* Umpan Balik & Aspirasi (Dipindahkan dari Tombol di Header) */}
                        {currentUser.role === 'admin' ? (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              setCurrentView('feedback-center');
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <span className="flex items-center gap-2.5">
                              <HeartHandshake className="w-4 h-4 text-indigo-600" />
                              <span>Pusat Aspirasi & Masukan Guru</span>
                            </span>
                            {newFeedbackCount > 0 && (
                              <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">
                                {newFeedbackCount} Baru
                              </span>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              setCurrentView('feedback');
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <MessageSquarePlus className="w-4 h-4 text-indigo-600" />
                            <span>{t('header.feedback', 'Kirim Umpan Balik & Saran')}</span>
                          </button>
                        )}

                        {/* Pengaturan Sekolah (Khusus Administrator) */}
                        {currentUser.role === 'admin' && (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              onOpenSettings();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <Settings className="w-4 h-4 text-slate-500" />
                            <span>{t('header.settings', 'Pengaturan Sekolah & Kop')}</span>
                          </button>
                        )}

                        {/* Ganti Modul / Kembali ke Portal Pilihan */}
                        {currentUser.role !== 'kepala_sekolah' && (
                          <button
                            onClick={() => {
                              setShowProfileMenu(false);
                              if (onInitiateChangeModule) {
                                onInitiateChangeModule();
                              } else {
                                setSelectedModule('portal');
                              }
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-indigo-700 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
                            <span>Kembali ke Portal Modul</span>
                          </button>
                        )}
                      </div>

                      {/* Garis Pemisah & Footer Sistem */}
                      <div className="h-px bg-slate-100 my-1.5" />

                      <div className="px-3 py-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>SiMantri v.3.9.0</span>
                        <span>SMAN 3 Tumijajar</span>
                      </div>

                      {/* Tombol Keluar Akun */}
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          onInitiateLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 mt-1 text-xs font-bold text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4 text-rose-500" />
                        <span>{t('header.logout', 'Keluar Akun')}</span>
                      </button>
                    </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
      {/* Modal Aspirasi & Masukan Pengguna Real-Time */}
      <FeedbackModal
        isOpen={isFeedbackModalOpen}
        onClose={() => setIsFeedbackModalOpen(false)}
      />
    </header>
  );
};
