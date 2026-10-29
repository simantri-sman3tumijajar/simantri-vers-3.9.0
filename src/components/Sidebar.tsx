import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  CalendarDays,
  Archive,
  Calculator,
  UserCheck,
  CheckCircle2,
  FileQuestion,
  ScanEye,
  BarChart3,
  BookOpen,
  Key,
  Laptop,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  Bot,
  Megaphone,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  X,
  PanelLeftClose,
  ShieldCheck,
  Printer,
  Sparkles,
  Award,
  ArrowLeft,
  ArrowRightLeft,
  Compass,
  Smile,
  Activity,
  ShieldAlert,
  RefreshCw,
  FolderCog,
  BookOpenCheck,
  TrendingUp,
  FileSpreadsheet,
  UploadCloud,
  Clock,
  Lock,
  LockOpen,
  DoorOpen,
  Smartphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isUserAdminOrOperator, isUserProctor } from '../types';

interface SidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
  sidebarHidden?: boolean;
  onToggleSidebar?: () => void;
  onOpenSettings: () => void;
  onOpenDeepLearningGuide: () => void;
  onOpenTemplateGuide: () => void;
  onOpenResetConfirm: () => void;
  onInitiateChangeModule?: () => void;
  onInitiateLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mobileOpen,
  onCloseMobile,
  sidebarHidden = false,
  onToggleSidebar,
  onOpenSettings,
  onOpenDeepLearningGuide,
  onOpenTemplateGuide,
  onOpenResetConfirm,
  onInitiateChangeModule,
  onInitiateLogout,
}) => {
  const {
    currentView,
    setCurrentView,
    currentUser,
    state,
    selectedModule,
    setSelectedModule,
    activeExamTab,
    setActiveExamTab,
    activeLitNumTab,
    setActiveLitNumTab,
    activeSupervisiTab,
    setActiveSupervisiTab,
  } = useApp();
  const { t } = useLanguage();

  // Expanded categories state
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'cat-dashboard': true,
    'cat-0': true,
    'cat-1': true,
    'cat-2': true,
    'cat-3': true,
  });

  // Re-expand all categories when module changes
  useEffect(() => {
    setExpandedCategories({
      'cat-dashboard': true,
      'cat-0': true,
      'cat-1': true,
      'cat-2': true,
      'cat-3': true,
    });
  }, [selectedModule]);

  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const isOperator = currentUser.role === 'operator';
  const isKepalaSekolah = currentUser.role === 'kepala_sekolah';
  const isGuruBK = Boolean(
    currentUser.isGuruBK ||
    currentUser.mataPelajaran?.some(
      (m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'
    )
  );

  const toggleCategory = (catKey: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [catKey]: !prev[catKey],
    }));
  };

  const handleNavClick = (
    viewId: string,
    examTab?: 'token' | 'credentials' | 'assignments' | 'schedules' | 'cards',
    litnumTab?: 'dashboard' | 'analytics' | 'bank_soal' | 'upload_rapor' | 'upload_googleform' | 'rekap',
    supervisiTab?: 'ringkasan-eksekutif' | 'presensi-monitoring' | 'berita-acara' | 'guru-matrix' | 'asesmen-guru' | 'rekap-nilai' | 'bukti-otentik' | 'rapor-pendidikan' | 'bk-monitoring' | 'catatan'
  ) => {
    if (viewId === 'settings-direct') {
      onOpenSettings();
      onCloseMobile();
      return;
    }

    if (viewId === 'template-guide-direct') {
      if (onOpenTemplateGuide) onOpenTemplateGuide();
      onCloseMobile();
      return;
    }

    if (viewId === 'deep-learning-direct') {
      if (onOpenDeepLearningGuide) onOpenDeepLearningGuide();
      onCloseMobile();
      return;
    }

    if (examTab) {
      setActiveExamTab(examTab);
    }

    if (litnumTab) {
      setActiveLitNumTab(litnumTab);
    }

    if (supervisiTab) {
      setActiveSupervisiTab(supervisiTab);
    }

    setCurrentView(viewId);
    onCloseMobile();
  };

  const handleGoToPortal = () => {
    if (onInitiateChangeModule) {
      onInitiateChangeModule();
    } else {
      setSelectedModule('portal');
    }
    onCloseMobile();
  };

  interface SidebarItem {
    id: string;
    label: string;
    desc: string;
    icon: any;
    badge?: string;
    examTab?: 'token' | 'credentials' | 'assignments' | 'schedules' | 'cards';
    litnumTab?: 'dashboard' | 'analytics' | 'bank_soal' | 'upload_rapor' | 'upload_googleform' | 'rekap';
    supervisiTab?: 'ringkasan-eksekutif' | 'presensi-monitoring' | 'berita-acara' | 'guru-matrix' | 'asesmen-guru' | 'rekap-nilai' | 'bukti-otentik' | 'rapor-pendidikan' | 'bk-monitoring' | 'catatan';
  }

  interface SidebarCategory {
    key: string;
    title: string;
    icon: any;
    items: SidebarItem[];
  }

  // Generate Module-Specific Menu Configurations
  const getModuleConfig = () => {
    switch (selectedModule) {
      case 'supervisi': {
        const pendingBA = state.beritaAcaraList?.filter((b) => !b.verifiedByKepsek && b.verifiedStatus !== 'Verified').length || 0;
        const totalAssessments = state.assessments?.length || 0;
        const totalTeachers = state.teachers?.length || 0;
        const totalCatatan = state.supervisiCatatanList?.length || 0;

        return {
          title: 'Supervisi Kepala Sekolah',
          subtitle: 'Pusat Monitoring & Evaluasi Manajerial',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          categories: [
            {
              key: 'cat-dashboard',
              title: 'Dashboard Utama Eksekutif',
              icon: LayoutDashboard,
              items: [
                {
                  id: 'supervisi-dashboard',
                  supervisiTab: 'ringkasan-eksekutif',
                  label: 'Dashboard Utama Supervisi',
                  desc: 'Pusat komando eksekutif, KPI & ringkasan seluruh supervisi 360°',
                  icon: LayoutDashboard,
                  badge: 'Utama',
                },
              ],
            },
            {
              key: 'cat-0',
              title: 'Presensi Siswa & Berita Acara Ujian',
              icon: ShieldCheck,
              items: [
                {
                  id: 'supervisi-presensi',
                  supervisiTab: 'presensi-monitoring',
                  label: 'Monitoring Presensi Real-Time',
                  desc: 'Pantauan live absensi harian 10 rombel dari guru mapel',
                  icon: UserCheck,
                  badge: 'Live',
                },
                {
                  id: 'supervisi-berita-acara',
                  supervisiTab: 'berita-acara',
                  label: 'Audit & Verifikasi Berita Acara',
                  desc: 'Validasi digital laporan ruang ujian CBT & tanda tangan',
                  icon: ClipboardCheck,
                  badge: pendingBA > 0 ? `${pendingBA} Perlu Cek` : 'Sah',
                },
              ],
            },
            {
              key: 'cat-1',
              title: 'Supervisi Akademik & Kinerja Guru',
              icon: GraduationCap,
              items: [
                {
                  id: 'supervisi-guru',
                  supervisiTab: 'guru-matrix',
                  label: 'Matriks Pendidik & Beban Ajar',
                  desc: 'Monitoring kinerja, keaktifan & pembinaan guru',
                  icon: Users,
                  badge: `${totalTeachers} Guru`,
                },
                {
                  id: 'supervisi-asesmen',
                  supervisiTab: 'asesmen-guru',
                  label: 'Supervisi Bank Soal & CBT',
                  desc: 'Audit paket soal ASTS/ASAS, rubrik & 8 dimensi',
                  icon: FileQuestion,
                  badge: `${totalAssessments} Soal`,
                },
                {
                  id: 'supervisi-nilai',
                  supervisiTab: 'rekap-nilai',
                  label: 'Rekapitulasi Nilai & KKTP',
                  desc: 'Sebaran capaian belajar siswa & batas ketuntasan',
                  icon: Award,
                  badge: 'KKTP',
                },
                {
                  id: 'supervisi-bukti',
                  supervisiTab: 'bukti-otentik',
                  label: 'Bukti Otentik Koreksi AI',
                  desc: 'Audit lembar jawaban siswa & transparansi koreksi',
                  icon: ScanEye,
                  badge: 'AI Vision',
                },
              ],
            },
            {
              key: 'cat-2',
              title: 'Mutu Sekolah, LitNum & BK Hebat',
              icon: TrendingUp,
              items: [
                {
                  id: 'supervisi-rapor',
                  supervisiTab: 'rapor-pendidikan',
                  label: 'Rapor Pendidikan & Mutu 2026',
                  desc: 'Analisis indikator PBD, literasi & numerasi',
                  icon: TrendingUp,
                  badge: 'Mutu 2026',
                },
                {
                  id: 'supervisi-bk',
                  supervisiTab: 'bk-monitoring',
                  label: 'Kesejahteraan Murid & BK Hebat',
                  desc: 'Pantauan emosi siswa (EMC2), mitigasi kerawanan & karir',
                  icon: HeartHandshake,
                  badge: '7 Jurus',
                },
                {
                  id: 'supervisi-catatan',
                  supervisiTab: 'catatan',
                  label: 'Lembar Catatan & Ekspor PDF',
                  desc: 'Arsip pembinaan resmi Kepala Sekolah format F4',
                  icon: FileText,
                  badge: `${totalCatatan} Catatan`,
                },
              ],
            },
          ] as SidebarCategory[],
        };
      }

      case 'rekap-nilai':
        return {
          title: 'Rekapitulasi & Leger Nilai',
          subtitle: 'Kurikulum Merdeka (IKM)',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          categories: [
            {
              key: 'cat-dashboard',
              title: 'Dasbor & Ringkasan Eksekutif',
              icon: LayoutDashboard,
              items: [
                {
                  id: 'rekap-nilai-dashboard',
                  label: 'Dasbor Rekapitulasi Nilai',
                  desc: 'Ringkasan data nilai, kelengkapan rekap & metrik kelas',
                  icon: LayoutDashboard,
                  badge: 'Utama',
                },
              ],
            },
            {
              key: 'cat-1',
              title: 'Pengolahan Rekapitulasi Nilai',
              icon: Calculator,
              items: [
                {
                  id: 'rekap-nilai-leger',
                  label: 'Input Nilai Sumatif & Bobot TP',
                  desc: 'Pengisian nilai sumatif TP 1-6 & bobot penilaian',
                  icon: Calculator,
                  badge: 'TP 1-6',
                },
                {
                  id: 'rekap-nilai-olahranking',
                  label: 'Nilai Akhir Rapor & Leger Siswa',
                  desc: 'Olah STS, SAS, Nilai Akhir & pemeringkatan leger',
                  icon: BarChart3,
                  badge: 'Leger IKM',
                },
                {
                  id: 'rekap-nilai-erapor',
                  label: 'Format Resmi e-Rapor SMA',
                  desc: 'Ceklis TP optimal/perlu, validasi rumus & export XLSX',
                  icon: FileSpreadsheet,
                  badge: 'Format Resmi',
                },
              ],
            },
            {
              key: 'cat-2',
              title: 'Capaian & Pelaporan Resmi',
              icon: Award,
              items: [
                {
                  id: 'rekap-nilai-cp',
                  label: 'Capaian Kompetensi (CP)',
                  desc: 'Generator deskripsi otomatis TP tertinggi & terendah',
                  icon: Sparkles,
                  badge: 'Otomatis',
                },
                {
                  id: 'rekap-nilai-cetak',
                  label: 'Cetak & Ekspor Buku Leger',
                  desc: 'Cetak leger resmi, rapor nilai, PDF, dan Excel',
                  icon: Printer,
                  badge: 'Cetak F4',
                },
              ],
            },
          ] as SidebarCategory[],
        };

      case 'sumatif':
        return {
          title: 'Bank Asesmen & Koreksi',
          subtitle: 'Bank Soal, ASTS, ASAS & CBT',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          categories: [
            {
              key: 'cat-1',
              title: 'Bank Soal & Asesmen CBT',
              icon: FileQuestion,
              items: [
                {
                  id: 'assessments',
                  label: 'Manajemen Bank Asesmen',
                  desc: 'Kisi-kisi, paket soal CBT (ASTS, ASAS, DSMART, OSN)',
                  icon: FileQuestion,
                  badge: 'CBT & AI',
                },
                {
                  id: 'item-analysis',
                  label: 'Analisis Butir Soal',
                  desc: 'Tingkat kesukaran, pembeda & distraktor',
                  icon: BarChart3,
                },
                {
                  id: 'template-guide-direct',
                  label: 'Panduan Format & Template Soal',
                  desc: 'Format Word & Excel untuk impor butir soal',
                  icon: BookOpen,
                  badge: 'Panduan',
                },
                {
                  id: 'deep-learning-direct',
                  label: 'Pembelajaran Mendalam',
                  desc: '8 dimensi kelulusan & panduan soal HOTS',
                  icon: Sparkles,
                  badge: '8 Dimensi',
                },
              ],
            },
            {
              key: 'cat-2',
              title: 'Koreksi & Nilai Siswa',
              icon: ScanEye,
              items: [
                {
                  id: 'mass-grading',
                  label: 'Pengoreksian AI Vision Massal',
                  desc: 'Koreksi LJK & esai otomatis via kamera / scanner',
                  icon: ScanEye,
                  badge: 'AI Vision',
                },
                {
                  id: 'student-grades',
                  label: 'Daftar Nilai Siswa & Roster',
                  desc: 'Rekapitulasi nilai & ketuntasan siswa',
                  icon: Award,
                },
                {
                  id: 'raport-sts',
                  label: 'Cetak Rapor STS Resmi',
                  desc: 'Format rapor tengah semester Kemendikdasmen',
                  icon: FileText,
                  badge: 'Rapor',
                },
              ],
            },
            {
              key: 'cat-3',
              title: 'Administrasi Asesmen',
              icon: ClipboardCheck,
              items: [
                {
                  id: 'berita-acara',
                  label: 'Berita Acara Pelaksanaan Ujian',
                  desc: 'Laporan ruang ujian & verifikasi digital kepsek',
                  icon: ClipboardCheck,
                  badge: 'Resmi',
                },
              ],
            },
          ] as SidebarCategory[],
        };

      case 'tugas': {
        const isLocked = state?.schoolInfo?.formatifLocked ?? true;
        const isAdmin = currentUser?.role === 'admin';
        return {
          title: 'Tugas Harian & Formatif',
          subtitle: isLocked && !isAdmin ? 'Terkunci (Dalam Pengembangan)' : isLocked && isAdmin ? 'Admin Mode (Dev via Prompt)' : 'Portofolio & Deep Learning',
          badgeColor: isLocked ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          categories: [
            {
              key: 'cat-1',
              title: 'Tugas Harian Siswa',
              icon: BookOpen,
              items: [
                {
                  id: 'tugas',
                  label: 'Dasbor Tugas & Portofolio',
                  desc: 'Daftar tugas formatif & progres pengumpulan',
                  icon: isLocked && !isAdmin ? Lock : BookOpen,
                  badge: isLocked && !isAdmin ? 'Terkunci' : isLocked && isAdmin ? 'Prompt Dev' : 'Formatif',
                },
              ],
            },
            {
              key: 'cat-2',
              title: 'Penilaian & Deep Learning',
              icon: Sparkles,
              items: [
                {
                  id: 'tugas',
                  label: 'Rekapitulasi Nilai Formatif',
                  desc: 'Capaian belajar & umpan balik siswa per rombel',
                  icon: isLocked && !isAdmin ? Lock : Award,
                  badge: isLocked && !isAdmin ? 'Terkunci' : undefined,
                },
                {
                  id: 'tugas',
                  label: 'Rubrik 8 Dimensi Belajar',
                  desc: 'Panduan Pembelajaran Mendalam (Deep Learning)',
                  icon: Sparkles,
                  badge: '8 Dimensi',
                },
              ],
            },
          ] as SidebarCategory[],
        };
      }

      case 'manajemen-data':
        return {
          title: 'Master Data Sekolah',
          subtitle: 'Pangkalan Data & Tata Kelola',
          badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          categories: [
            {
              key: 'cat-0',
              title: 'Ringkasan & Dasbor Sistem',
              icon: LayoutDashboard,
              items: [
                {
                  id: 'dashboard',
                  label: 'Dasbor Utama Ringkasan',
                  desc: 'Ringkasan & analitik statistik seluruh data sistem',
                  icon: LayoutDashboard,
                  badge: 'Utama',
                },
              ],
            },
            {
              key: 'cat-1',
              title: 'Pangkalan Data Utama',
              icon: FolderCog,
              items: [
                {
                  id: 'students',
                  label: 'Master Data Siswa & NISN',
                  desc: 'Impor Excel, Foto AI, NISN & Rombel',
                  icon: Users,
                  badge: 'Master',
                },
                {
                  id: 'teachers',
                  label: 'Data Akun Guru & Akses',
                  desc: 'NIP, akun login & plotting mapel',
                  icon: GraduationCap,
                },
                {
                  id: 'classes-subjects',
                  label: 'Kelas & Mata Pelajaran',
                  desc: 'Rombel, wali kelas & nilai batas KKTP',
                  icon: Layers,
                },
              ],
            },
            {
              key: 'cat-2',
              title: 'Kalender & Pengumuman',
              icon: CalendarDays,
              items: [
                {
                  id: 'academic-calendar',
                  label: 'Kalender Pendidikan Sekolah',
                  desc: 'Jadwal, masa asesmen & kalender A4 resmi',
                  icon: CalendarDays,
                  badge: 'A4',
                },
                {
                  id: 'announcements',
                  label: 'Kelola Pengumuman Sekolah',
                  desc: 'Siaran pengumuman ke portal siswa & guru',
                  icon: Megaphone,
                },
              ],
            },
            {
              key: 'cat-3',
              title: 'Sistem & Rekap Lampau',
              icon: Archive,
              items: [
                {
                  id: 'archives',
                  label: 'Arsip Semester & TP Lampau',
                  desc: 'Audit rekapitulasi nilai tahun lampau',
                  icon: Archive,
                },
                {
                  id: 'feedback-center',
                  label: 'Pusat Aspirasi & Masukan Guru',
                  desc: 'Monitoring masukan & saran pendidik',
                  icon: HeartHandshake,
                  badge:
                    state.feedbacks && state.feedbacks.filter((f) => f.status === 'Baru').length > 0
                      ? `${state.feedbacks.filter((f) => f.status === 'Baru').length} Baru`
                      : undefined,
                },
                {
                  id: 'ai-studio-hub',
                  label: 'Kelola Prompt Google AI',
                  desc: 'Atur prompt Google AI Studio & vision engine',
                  icon: Bot,
                  badge: 'AI Engine',
                },
              ],
            },
          ] as SidebarCategory[],
        };

      case 'bk-hebat':
        return {
          title: 'Modul BK Hebat',
          subtitle: '7 Jurus Kemendikdasmen',
          badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          categories: [
            {
              key: 'cat-1',
              title: 'Layanan 7 Jurus BK',
              icon: HeartHandshake,
              items: [
                {
                  id: 'bimbingan-konseling',
                  label: 'Pusat 7 Jurus BK Hebat',
                  desc: 'Pusat kendali potensi, profil murid & asesmen BK',
                  icon: HeartHandshake,
                  badge: '7 Jurus',
                },
                {
                  id: 'bk-konseling',
                  label: 'Sesi Konseling & Resiliensi',
                  desc: 'Konseling individual, kelompok & konferensi kasus',
                  icon: UserCheck,
                  badge: 'Privat',
                },
                {
                  id: 'bk-kerawanan',
                  label: 'Peta Kerawanan & Mitigasi',
                  desc: 'Deteksi dini risiko akademik & perilaku murid',
                  icon: ShieldAlert,
                  badge: 'Mitigasi',
                },
                {
                  id: 'bk-karir',
                  label: 'Bimbingan Karir & SNBP',
                  desc: 'Pemetaan minat bakat karir & pemilihan jurusan PTN',
                  icon: Compass,
                  badge: 'SNBP',
                },
                {
                  id: 'bk-emosi',
                  label: 'Jurnal Emosi Harian (EMC2)',
                  desc: 'Pemantauan suasana hati & emosi harian siswa',
                  icon: Smile,
                  badge: 'Harian',
                },
                {
                  id: 'bk-rujukan',
                  label: 'Alur Rujukan MTSS Tier 1-3',
                  desc: 'Intervensi bertingkat & rujukan ahli',
                  icon: Activity,
                },
                {
                  id: 'bk-kebiasaan',
                  label: 'Habit Tracker Karakter',
                  desc: 'Pembiasaan karakter positif & refleksi diri',
                  icon: Sparkles,
                },
              ],
            },
            {
              key: 'cat-2',
              title: 'Siswa Binaan & Laporan',
              icon: Users,
              items: [
                {
                  id: 'bk-akuntabilitas',
                  label: 'Akuntabilitas & Laporan BK',
                  desc: 'Laporan resmi ketercapaian layanan BK',
                  icon: FileText,
                  badge: 'Resmi',
                },
              ],
            },
          ] as SidebarCategory[],
        };

      case 'manajemen-ujian':
        return {
          title: 'Manajemen Ujian CBT',
          subtitle: 'Infrastruktur & Administrasi Tes',
          badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
          categories: [
            {
              key: 'cat-1',
              title: 'CBT & Token Real-Time',
              icon: Laptop,
              items: [
                {
                  id: 'exam-token',
                  examTab: 'token',
                  label: 'Status Token Harian & Server',
                  desc: 'Aktivasi token harian (1 hari 1 token)',
                  icon: Key,
                  badge: 'Token',
                },
                {
                  id: 'exam-credentials',
                  examTab: 'credentials',
                  label: 'Status Akun & 8-Digit Acak',
                  desc: 'Generate username & sandi 8 digit acak siswa',
                  icon: UserCheck,
                  badge: '8 Digit',
                },
                {
                  id: 'exam-cards',
                  examTab: 'cards',
                  label: 'Pendaftaran & Cetak Kartu',
                  desc: 'Cetak kartu login ujian resmi siswa',
                  icon: Printer,
                },
              ],
            },
            {
              key: 'cat-2',
              title: isUserAdminOrOperator(currentUser) || isUserProctor(currentUser) ? 'Penjadwalan & Pengawas' : 'Penjadwalan & Penugasan Soal',
              icon: CalendarDays,
              items: [
                {
                  id: 'exam-schedules',
                  examTab: 'schedules',
                  label: 'Pengaturan Sesi & Ruang CBT',
                  desc: 'Atur sesi 1-3, durasi & ruang lab komputer',
                  icon: CalendarDays,
                },
                {
                  id: 'exam-assignments',
                  examTab: 'assignments',
                  label: 'Penugasan Guru Mapel Soal',
                  desc: 'Plotting guru penggarap soal CBT',
                  icon: GraduationCap,
                },
                ...((isUserAdminOrOperator(currentUser) || isUserProctor(currentUser))
                  ? [
                      {
                        id: 'exam-rooms',
                        label: 'Ruang Campuran & No Peserta',
                        desc: '2 Kelas per ruang & format 12-26-XX-XXX',
                        icon: DoorOpen,
                        badge: 'Smart No',
                      },
                      {
                        id: 'exam-proctor-schedules',
                        label: 'Jadwal Pengawas (Multi-Hari)',
                        desc: 'Distribusi adil pengawas & pencegah bentrok',
                        icon: CalendarDays,
                        badge: 'Anti-Bentrok',
                      },
                      {
                        id: 'exam-proctor-mobile',
                        label: 'Monitoring Pengawas (Mobile/PC)',
                        desc: 'Tampilan vertikal smartphone / PC & PIN 482910',
                        icon: Smartphone,
                        badge: 'Pengawas',
                      },
                      {
                        id: 'proctor-monitor',
                        label: 'Live Proctoring Anti-Cheat',
                        desc: 'Sensor HP Android, split-screen & alarm dual-tone',
                        icon: Activity,
                        badge: '🟢🟡🔴 Live',
                      },
                      {
                        id: 'exam-security',
                        label: 'Keamanan & PIN Pengawas',
                        desc: 'PIN 6-digit pengawas & unblock pelanggaran',
                        icon: ShieldAlert,
                        badge: '6-Digit',
                      },
                    ]
                  : []),
              ],
            },
            {
              key: 'cat-3',
              title: 'Dokumen Administrasi Tes',
              icon: ClipboardCheck,
              items: [
                {
                  id: 'berita-acara',
                  label: 'Berita Acara Pelaksanaan Ujian',
                  desc: 'Laporan resmi proktor, pengawas & kepsek',
                  icon: ClipboardCheck,
                  badge: 'Resmi',
                },
                {
                  id: 'exam-attendance',
                  label: 'Cetak Daftar Hadir Peserta',
                  desc: 'Presensi kehadiran ruang ujian CBT',
                  icon: Printer,
                },
              ],
            },
          ] as SidebarCategory[],
        };

      case 'litnum': {
        const isKoordinatorUser = Boolean(
          currentUser.isKoordinatorLitnum ||
          (currentUser.role as string) === 'koordinator_litnum' ||
          (currentUser.role as string) === 'koordinator'
        );
        const isKoordinatorOnly = isKoordinatorUser || (!isAdmin && !isOperator);
        return {
          title: 'Pengolahan LitNum',
          subtitle: 'Literasi & Numerasi Terpadu',
          badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          categories: [
            {
              key: 'cat-0',
              title: 'Dashboard Executive',
              icon: LayoutDashboard,
              items: [
                {
                  id: 'litnum-management',
                  litnumTab: 'dashboard',
                  label: 'Dashboard Ringkasan LitNum',
                  desc: 'Ringkasan executive & statistik seluruh data LitNum',
                  icon: LayoutDashboard,
                  badge: 'Dashboard',
                },
              ],
            },
            {
              key: 'cat-1',
              title: 'Bank Soal & Penjadwalan',
              icon: BookOpenCheck,
              items: [
                {
                  id: 'litnum-management',
                  litnumTab: 'bank_soal',
                  label: 'Olah Bank Soal & Wacana',
                  desc: 'Penyusunan butir soal & wacana bertingkat',
                  icon: BookOpenCheck,
                  badge: 'Selasa & Rabu',
                },
                {
                  id: 'litnum-management',
                  litnumTab: 'analytics',
                  label: 'Kontrol Jadwal & Sistem',
                  desc: 'Sakelar otomatis Selasa (Lit) & Rabu (Num)',
                  icon: Clock,
                  badge: 'Otomatis',
                },
              ],
            },
            ...(!isKoordinatorOnly
              ? [
                  {
                    key: 'cat-2',
                    title: 'Input & Ekstraksi Data',
                    icon: UploadCloud,
                    items: [
                      {
                        id: 'litnum-management',
                        litnumTab: 'upload_rapor',
                        label: 'Unggah Rapor Kemendikdasmen',
                        desc: 'Ekstraksi dokumen resmi Excel & PDF PBD',
                        icon: FileSpreadsheet,
                        badge: 'Kemendikdasmen',
                      },
                      {
                        id: 'litnum-management',
                        litnumTab: 'upload_googleform',
                        label: 'Impor Multi-File Google Form',
                        desc: 'Akumulasi form hari & bulan lalu',
                        icon: UploadCloud,
                        badge: 'Multi-File',
                      },
                    ],
                  },
                ]
              : []),
            {
              key: 'cat-3',
              title: 'Analisis & Rekapitulasi Nilai',
              icon: TrendingUp,
              items: [
                {
                  id: 'litnum-management',
                  litnumTab: 'analytics',
                  label: 'Analisis & Estimasi Rapor 2026',
                  desc: 'Grafik capaian & simulasi skor mutu 2026',
                  icon: TrendingUp,
                  badge: '2026',
                },
                {
                  id: 'litnum-management',
                  litnumTab: 'rekap',
                  label: 'Rekapitulasi Nilai Siswa',
                  desc: 'Database capaian murid per rombel & ekspor',
                  icon: Layers,
                  badge: `${state.litnumRecords?.length || 0} Data`,
                },
              ],
            },
          ] as SidebarCategory[],
        };
      }

      case 'kesiswaan':
        return {
          title: 'Presensi Siswa',
          subtitle: 'Layanan Absensi Harian SMAN 3 Tumijajar',
          badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          categories: [
            {
              key: 'cat-1',
              title: 'Layanan Presensi Siswa',
              icon: UserCheck,
              items: [
                {
                  id: 'kesiswaan-dashboard',
                  label: '1. Dasbor Beranda Absensi',
                  desc: 'Ringkasan eksekutif, metrik harian & status rombel',
                  icon: LayoutDashboard,
                  badge: 'Beranda',
                },
                {
                  id: 'kesiswaan-input',
                  label: '2. Input Absensi Harian Rombel',
                  desc: 'Lembar absensi kelas (H/S/I/A) real-time ke Kepsek',
                  icon: CheckCircle2,
                  badge: 'Guru Mapel',
                },
                {
                  id: 'kesiswaan-rekap',
                  label: '3. Rekapitulasi & Laporan',
                  desc: 'Analisis kehadiran semester & ekspor Excel/PDF',
                  icon: FileSpreadsheet,
                  badge: 'Excel/PDF',
                },
                {
                  id: 'kesiswaan-rawan',
                  label: '4. Siswa Rawan & Perhatian Khusus',
                  desc: 'Deteksi dini ketidakhadiran & rujukan BK Hebat',
                  icon: ShieldAlert,
                  badge: 'Rujukan BK',
                },
              ],
            },
          ] as SidebarCategory[],
        };

      default:
        // Default Fallback
        return {
          title: 'SiMantri Akademik',
          subtitle: 'Ekosistem Layanan Sekolah',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
          categories: [
            {
              key: 'cat-1',
              title: 'Menu Layanan',
              icon: Layers,
              items: [
                {
                  id: 'dashboard',
                  label: 'Dasbor Utama',
                  desc: 'Ringkasan analitik akademik',
                  icon: LayoutDashboard,
                },
              ],
            },
          ] as SidebarCategory[],
        };
    }
  };

  const moduleConfig = getModuleConfig();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 select-none overflow-hidden">
      {/* 1. Header Banner Bersih & Modern */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white p-1 border border-slate-700 flex items-center justify-center shadow-md shrink-0">
              <img
                src={state.schoolInfo?.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                alt={state.schoolInfo?.namaSekolah || 'Logo Sekolah'}
                className="w-full h-full object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://iili.io/n1vlf2t.png';
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-black text-xs uppercase tracking-wider text-white leading-tight break-words whitespace-normal text-wrap" title="SiMantri">
                SiMantri
              </h2>
              <p className="text-[10px] font-bold text-sky-400 leading-tight mt-0.5 break-words whitespace-normal text-wrap" title="Sistem Informasi & Manajemen Akademik SMAN 3 Tumijajar">
                Sistem Informasi &amp; Manajemen Akademik SMAN 3 Tumijajar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="hidden lg:flex p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Sembunyikan Bilah Samping"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active Module Indicator Badge */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
          <div className="min-w-0">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              Modul Aktif:
            </span>
            <span className={`inline-block px-2 py-0.5 rounded-md text-[10.5px] font-black border truncate max-w-[170px] ${moduleConfig.badgeColor}`}>
              {moduleConfig.title}
            </span>
          </div>

          {/* Quick Switch to Module Portal */}
          <button
            onClick={handleGoToPortal}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white text-[10px] font-bold transition-all border border-slate-700/80 hover:border-indigo-400 shrink-0 cursor-pointer shadow-2xs"
            title="Kembali ke Halaman Pilihan Modul"
          >
            <ArrowRightLeft className="w-3 h-3 text-sky-400" />
            <span>Pilih Modul</span>
          </button>
        </div>

        {/* 2. Top Quick Actions Bar (Hanya tampilkan tombol Dasbor Utama pada modul Master Data sesuai permintaan) */}
        <div className={`grid ${selectedModule === 'manajemen-data' ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 pt-1 border-t border-slate-800/80`}>
          {selectedModule === 'manajemen-data' && (
            <button
              onClick={() => {
                handleNavClick('dashboard');
              }}
              className={`py-1.5 px-2 rounded-lg text-[10px] sm:text-[10.5px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                currentView === 'dashboard'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-850 hover:bg-slate-800 text-slate-300'
              }`}
              title="Buka Beranda / Dasbor Utama SiMantri"
            >
              <LayoutDashboard className="w-3 h-3 text-sky-300 shrink-0" />
              <span className="truncate">Dasbor Utama</span>
            </button>
          )}

          <button
            onClick={() => handleNavClick('settings-direct')}
            className="py-1.5 px-2 rounded-lg text-[10.5px] font-bold bg-slate-850 hover:bg-slate-800 text-slate-300 flex items-center justify-center gap-1 transition-all cursor-pointer"
            title="Buka Pengaturan Sekolah & Kop"
          >
            <Settings className="w-3 h-3 text-amber-300" />
            <span>Pengaturan</span>
          </button>

          {/* Sesuai Permintaan: Tombol Keluar diganti menjadi Bersihkan */}
          <button
            onClick={() => {
              onOpenResetConfirm();
              onCloseMobile();
            }}
            className="py-1.5 px-2 rounded-lg text-[10.5px] font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center justify-center gap-1 transition-all cursor-pointer"
            title="Bersihkan Sampah Sistem, Cache & Panel Reset"
          >
            <RefreshCw className="w-3 h-3 text-amber-400" />
            <span>Bersihkan</span>
          </button>
        </div>
      </div>

      {/* 3. Identitas Sesi Pengguna */}
      <div className="px-4 py-2 bg-slate-850 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0">
        <div className="min-w-0">
          <span className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest block">
            {isAdmin
              ? 'Administrator'
              : isOperator
              ? 'Operator Sekolah'
              : isKepalaSekolah
              ? 'Kepala Sekolah'
              : currentUser?.isKoordinatorLitnum && selectedModule === 'litnum'
              ? 'Koordinator LitNum'
              : isGuruBK
              ? 'Guru BK'
              : 'Guru Mapel'}
          </span>
          <span className="font-extrabold text-white text-xs truncate block" title={currentUser.nama}>
            {currentUser.nama}
          </span>
        </div>
        <span className="px-2 py-0.5 text-[9px] font-black rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase shrink-0">
          Online
        </span>
      </div>

      {/* 4. Menu Utama Tree Structure Sesuai Modul Yang Dipilih */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
        <div className="px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
          <span>MENU MODUL {moduleConfig.title.toUpperCase()}</span>
        </div>

        {/* Tombol Dasbor / Beranda Utama - Hanya tampil di modul Master Data (sesuai instruksi: tombol beranda/dasbor utama dihapus di semua tombol kecuali master data) */}
        {selectedModule === 'manajemen-data' && (
          <button
            type="button"
            onClick={() => {
              handleNavClick('dashboard');
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black transition-all mb-2 cursor-pointer shadow-xs ${
              currentView === 'dashboard'
                ? 'bg-sky-600 text-white shadow-sky-600/30 ring-1 ring-sky-400'
                : 'bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white border border-slate-700/80'
            }`}
            title="Buka Beranda / Dasbor Utama SiMantri"
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className={`w-4 h-4 ${currentView === 'dashboard' ? 'text-white' : 'text-sky-400'}`} />
              <span>Beranda / Dasbor Utama</span>
            </div>
            {currentView === 'dashboard' ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        )}

        {/* Render Dynamic Categories for Active Module */}
        {moduleConfig.categories.map((cat) => {
          const isExpanded = Boolean(expandedCategories[cat.key]);
          const CatIcon = cat.icon;

          return (
            <div key={cat.key} className="pt-0.5">
              {/* Category Header Dropdown */}
              <button
                type="button"
                onClick={() => toggleCategory(cat.key)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-extrabold text-slate-200 hover:bg-slate-800 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2.5">
                  <CatIcon className="w-4 h-4 text-sky-400 group-hover:text-sky-300 transition-colors shrink-0" />
                  <span className="truncate">{cat.title}</span>
                </div>
                <div className="p-0.5 rounded text-slate-400 group-hover:text-white shrink-0">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </div>
              </button>

              {/* Sub-Items Tree Structure */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <div className="border-l-2 border-slate-700 ml-5 pl-2 my-1 space-y-0.5">
                      {cat.items.map((sub, sIdx) => {
                        const SubIcon = sub.icon;
                        const isSubActive =
                          (currentView === sub.id || (sub.supervisiTab && activeSupervisiTab === sub.supervisiTab && currentView.startsWith('supervisi-'))) &&
                          (!sub.examTab || activeExamTab === sub.examTab) &&
                          (!sub.litnumTab || activeLitNumTab === sub.litnumTab) &&
                          (!sub.supervisiTab || activeSupervisiTab === sub.supervisiTab);

                        return (
                          <button
                            key={`${sub.id}-${sub.examTab || sub.litnumTab || sub.supervisiTab || sIdx}`}
                            onClick={() => handleNavClick(sub.id, sub.examTab, sub.litnumTab, sub.supervisiTab)}
                            className={`w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg text-xs transition-all cursor-pointer group text-left ${
                              isSubActive
                                ? 'bg-sky-600/35 text-sky-200 font-extrabold border-l-2 border-sky-400 pl-2 shadow-2xs'
                                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 transition-colors ${
                                  isSubActive
                                    ? 'bg-sky-400 ring-2 ring-sky-400/40'
                                    : 'bg-slate-500 group-hover:bg-sky-400'
                                }`}
                              />
                              <span className="truncate text-[11.5px] leading-tight">
                                {sub.label}
                              </span>
                            </div>

                            {sub.badge && (
                              <span
                                className={`px-1.5 py-0.2 text-[9px] font-black rounded-md shrink-0 border ${
                                  isSubActive
                                    ? 'bg-sky-400 text-slate-950 border-sky-300'
                                    : 'bg-slate-800 text-sky-300 border-slate-700'
                                }`}
                              >
                                {sub.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* 5. Footer Navigasi: Ganti Modul & Keluar Akun Nyata */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Tombol Ganti Modul Cepat */}
          <button
            onClick={handleGoToPortal}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-700/80 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
            <span>Portal Modul</span>
          </button>

          {/* Tombol Keluar Akun Resmi */}
          <button
            onClick={() => {
              if (onInitiateLogout) {
                onInitiateLogout();
              }
              onCloseMobile();
            }}
            className="flex-1 py-1.5 px-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-200 text-[11px] font-bold border border-rose-800/40 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            title="Keluar dari Akun SiMantri"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Keluar Akun</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-900">
          <span className="flex items-center gap-1 font-bold text-slate-400">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>SiMantri v.3.9.0</span>
          </span>
          <span className="text-[9.5px]">SMAN 3 Tumijajar</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      {!sidebarHidden && (
        <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 border-r border-slate-800 shadow-xl z-30 fixed top-0 left-0 bottom-0 h-screen">
          {sidebarContent}
        </aside>
      )}

      {/* Mobile Drawer Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-80 max-w-[85vw] h-full shadow-2xl flex flex-col z-10"
            >
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
