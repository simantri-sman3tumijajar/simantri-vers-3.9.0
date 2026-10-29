import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  HeartHandshake,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Users,
  Compass,
  Smile,
  Meh,
  Frown,
  Activity,
  AlertTriangle,
  FileText,
  UserCheck,
  TrendingUp,
  Clock,
  CheckCircle2,
  Lock,
  Plus,
  Search,
  Filter,
  Calendar,
  Award,
  ChevronRight,
  BookOpen,
  Send,
  Download,
  Printer,
  X,
  Save,
  GraduationCap,
  Eye,
  EyeOff,
  PhoneCall,
  School,
  Brain,
  Zap,
  ArrowLeft,
  Pencil,
  Trash2,
  RotateCcw,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BKProfile, BKEmotionLog, BKReferral, BKCounselingLog, BKHabitLog, Student } from '../types';

interface BimbinganKonselingViewProps {
  activeTabFromParent?: string;
}

const DEFAULT_7_HABITS = [
  'Bangun Pagi & Beribadah Tepat Waktu',
  'Gemar Berpikir Positif & Tersenyum Ramah',
  'Literasi Membaca Minimal 15 Menit Sehari',
  'Bersikap Santun & Menghargai Sesama',
  'Disiplin Waktu Belajar & Tuntaskan Tugas',
  'Menjaga Kebersihan Lingkungan & Raga',
  'Refleksi Diri & Bersyukur Sebelum Tidur',
];

const PRESET_SOLUTIONS = [
  'Tarik Napas STOP (Mindfulness)',
  'Jurnal Refleksi Mandiri',
  'Bicara dengan Sahabat Terpercaya',
  'Konsultasi Santai Guru BK',
  'Jalan Santai & Relaksasi Otot',
  'Mendengarkan Musik Penenang',
  'Menulis 3 Hal yang Disyukuri',
  'Teknik Eisenhower Matrix (Manajemen Waktu)',
];

export const BimbinganKonselingView: React.FC<BimbinganKonselingViewProps> = ({
  activeTabFromParent,
}) => {
  const {
    state,
    currentUser,
    showToast,
    setSelectedModule,
    setCurrentView,
    saveBKProfile,
    deleteBKProfile,
    saveBKEmotionLog,
    deleteBKEmotionLog,
    saveBKReferral,
    deleteBKReferral,
    saveBKCounselingLog,
    deleteBKCounselingLog,
    saveBKHabitLog,
    deleteBKHabitLog,
    resetAllBKData,
  } = useApp();

  const school = state?.schoolInfo;
  const studentsList = state?.students || [];
  const teachersList = state?.teachers || [];

  // Data from state (Starts strictly from 0, completely persistent!)
  const profiles: BKProfile[] = state?.bkProfiles || [];
  const emotionLogs: BKEmotionLog[] = state?.bkEmotionLogs || [];
  const referrals: BKReferral[] = state?.bkReferrals || [];
  const counselingLogs: BKCounselingLog[] = state?.bkCounselingLogs || [];
  const habitLogs: BKHabitLog[] = state?.bkHabitLogs || [];

  // Active Main Tab
  const [activeMainTab, setActiveMainTab] = useState<'preventif' | 'intervensi' | 'karir' | 'akuntabilitas'>('preventif');

  // Preventif Sub-tab
  const [preventifSubTab, setPreventifSubTab] = useState<'potensi' | 'emosi' | 'kebiasaan'>('potensi');

  // Intervensi Sub-tab
  const [intervensiSubTab, setIntervensiSubTab] = useState<'kerawanan' | 'rujukan' | 'resiliensi'>('kerawanan');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState<string>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'MERAH' | 'KUNING' | 'HIJAU'>('ALL');

  // CRUD Modals State
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<BKProfile | null>(null);

  const [isEmotionModalOpen, setIsEmotionModalOpen] = useState(false);
  const [editingEmotion, setEditingEmotion] = useState<BKEmotionLog | null>(null);

  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [editingReferral, setEditingReferral] = useState<BKReferral | null>(null);

  const [isCounselingModalOpen, setIsCounselingModalOpen] = useState(false);
  const [editingCounseling, setEditingCounseling] = useState<BKCounselingLog | null>(null);

  const [isHabitModalOpen, setIsHabitModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<BKHabitLog | null>(null);

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'profile' | 'emotion' | 'referral' | 'counseling' | 'habit';
    id: string;
    title: string;
  } | null>(null);

  // Reset Confirmation State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Sync tab state when opened from specific sidebar / sub-navigation items
  useEffect(() => {
    if (!activeTabFromParent) return;
    if (activeTabFromParent === 'bk-konseling') {
      setActiveMainTab('intervensi');
      setIntervensiSubTab('resiliensi');
    } else if (activeTabFromParent === 'bk-kerawanan') {
      setActiveMainTab('intervensi');
      setIntervensiSubTab('kerawanan');
    } else if (activeTabFromParent === 'bk-rujukan') {
      setActiveMainTab('intervensi');
      setIntervensiSubTab('rujukan');
    } else if (activeTabFromParent === 'bk-karir') {
      setActiveMainTab('karir');
    } else if (activeTabFromParent === 'bk-emosi') {
      setActiveMainTab('preventif');
      setPreventifSubTab('emosi');
    } else if (activeTabFromParent === 'bk-kebiasaan') {
      setActiveMainTab('preventif');
      setPreventifSubTab('kebiasaan');
    } else if (activeTabFromParent === 'bk-akuntabilitas') {
      setActiveMainTab('akuntabilitas');
    } else if (activeTabFromParent === 'bimbingan-konseling') {
      setActiveMainTab('preventif');
      setPreventifSubTab('potensi');
    }
  }, [activeTabFromParent]);

  // Classes list for filter
  const classesList = useMemo(() => {
    const setCls = new Set<string>();
    studentsList.forEach((s) => {
      if (s.kelas) setCls.add(s.kelas);
    });
    return Array.from(setCls);
  }, [studentsList]);

  // Calculate Vulnerability List from Real Data (starts dynamically from 0)
  const vulnerabilityList = useMemo(() => {
    const map = new Map<string, { student: Student; riskScore: number; riskLevel: 'MERAH' | 'KUNING' | 'HIJAU'; triggers: string[] }>();

    // 1. Check from referrals
    referrals.forEach((ref) => {
      if (ref.status === 'selesai') return;
      const std: Student = studentsList.find((s) => s.id === ref.studentId) || {
        id: ref.studentId,
        nama: ref.studentName,
        nisn: '-',
        kelas: ref.kelas,
        noUrut: 0,
        jenisKelamin: 'L',
      };

      const existing: { student: Student; riskScore: number; riskLevel: 'MERAH' | 'KUNING' | 'HIJAU'; triggers: string[] } = map.get(ref.studentId) || {
        student: std,
        riskScore: 0,
        riskLevel: 'HIJAU',
        triggers: [] as string[],
      };

      if (ref.urgencyTier === 'tier_3') {
        existing.riskScore += 50;
        existing.triggers.push(`Rujukan Tier 3: ${ref.initialConcern}`);
      } else if (ref.urgencyTier === 'tier_2') {
        existing.riskScore += 30;
        existing.triggers.push(`Rujukan Tier 2: ${ref.initialConcern}`);
      } else {
        existing.riskScore += 15;
        existing.triggers.push(`Rujukan Tier 1: ${ref.initialConcern}`);
      }

      map.set(ref.studentId, existing);
    });

    // 2. Check from emotion logs with negative categories
    emotionLogs.forEach((emo) => {
      if (emo.emotionCategory === 'cemas' || emo.emotionCategory === 'marah' || emo.emotionCategory === 'sedih' || emo.emotionCategory === 'lelah') {
        const std: Student = studentsList.find((s) => s.id === emo.studentId) || {
          id: emo.studentId,
          nama: emo.studentName,
          nisn: '-',
          kelas: emo.kelas,
          noUrut: 0,
          jenisKelamin: 'L',
        };

        const existing: { student: Student; riskScore: number; riskLevel: 'MERAH' | 'KUNING' | 'HIJAU'; triggers: string[] } = map.get(emo.studentId) || {
          student: std,
          riskScore: 0,
          riskLevel: 'HIJAU',
          triggers: [] as string[],
        };

        existing.riskScore += 15;
        existing.triggers.push(`Emosi (${emo.emotionCategory}): ${emo.triggerNote || 'Suasana hati fluktuatif'}`);
        map.set(emo.studentId, existing);
      }
    });

    // Determine final levels
    const result: Array<{ student: Student; riskScore: number; riskLevel: 'MERAH' | 'KUNING' | 'HIJAU'; triggers: string[] }> = [];
    map.forEach((item) => {
      if (item.riskScore >= 50) {
        item.riskLevel = 'MERAH';
      } else if (item.riskScore >= 25) {
        item.riskLevel = 'KUNING';
      } else {
        item.riskLevel = 'HIJAU';
      }
      result.push(item);
    });

    // Sort: highest risk first
    return result.sort((a, b) => b.riskScore - a.riskScore);
  }, [studentsList, referrals, emotionLogs]);

  // Statistics (accurately reflects real zero-based state)
  const stats = useMemo(() => {
    const totalStudents = studentsList.length;
    const positiveEmotions = emotionLogs.filter((e) => e.emotionCategory === 'gembira' || e.emotionCategory === 'tenang').length;
    const totalEmotions = emotionLogs.length;
    const positivePercent = totalEmotions > 0 ? Math.round((positiveEmotions / totalEmotions) * 100) : 0;
    const merahCount = vulnerabilityList.filter((v) => v.riskLevel === 'MERAH').length;
    const kuningCount = vulnerabilityList.filter((v) => v.riskLevel === 'KUNING').length;
    const activeReferrals = referrals.filter((r) => r.status !== 'selesai').length;

    return {
      totalStudents,
      positivePercent,
      totalEmotions,
      merahCount,
      kuningCount,
      activeReferrals,
      totalProfiles: profiles.length,
      totalCounseling: counselingLogs.length,
      totalHabits: habitLogs.length,
    };
  }, [studentsList, emotionLogs, vulnerabilityList, referrals, profiles, counselingLogs, habitLogs]);

  // Execute confirmed delete
  const handleConfirmDelete = async () => {
    if (!deleteConfirmation) return;
    const { type, id } = deleteConfirmation;

    if (type === 'profile') {
      await deleteBKProfile(id);
    } else if (type === 'emotion') {
      await deleteBKEmotionLog(id);
    } else if (type === 'referral') {
      await deleteBKReferral(id);
    } else if (type === 'counseling') {
      await deleteBKCounselingLog(id);
    } else if (type === 'habit') {
      await deleteBKHabitLog(id);
    }

    setDeleteConfirmation(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Header & Breadcrumb / Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedModule('portal')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Kembali ke Portal</span>
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-black text-purple-900 flex items-center gap-1.5">
            <HeartHandshake className="w-4 h-4 text-purple-600" />
            <span>Modul Bimbingan Konseling (BK) Hebat &bull; 7 Jurus Kemendikdasmen</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Tombol Mulai dari 0 / Reset Data BK */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-colors cursor-pointer"
            title="Kosongkan seluruh data BK dan mulai dari 0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
            <span>Mulai dari 0 (Bersihkan Data BK)</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 text-xs font-bold transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-purple-700" />
            <span>Cetak Dokumen BK (A4)</span>
          </button>
        </div>
      </div>

      {/* Hero Branding & Framework Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white p-6 sm:p-8 shadow-2xl border border-purple-500/30">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-500/30 text-purple-200 border border-purple-400/40 flex items-center gap-1.5 shadow-xs">
                <HeartHandshake className="w-4 h-4 text-purple-300" />
                <span>Modul Bimbingan Konseling (BK) Hebat</span>
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>7 Jurus BK Kemendikdasmen RI</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Data Bersih &bull; Mulai dari 0 &bull; Fitur Lengkap CRUD
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Pusat Kendali Layanan BK &amp; Resiliensi Murid
            </h1>
            <p className="text-xs sm:text-sm text-purple-200 max-w-2xl leading-relaxed">
              Sistem pendampingan murid terpadu (*strength-based*), regulasi emosi mandiri (EMC2), mitigasi bertingkat MTSS, dan pembiasaan karakter 7 Kebiasaan Anak Indonesia Hebat.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 shrink-0">
            <div className="w-12 h-12 rounded-xl bg-purple-400 text-slate-950 flex items-center justify-center font-black text-lg shadow-md">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-300 block">Guru BK Pengampu</span>
              <h4 className="font-extrabold text-sm text-white">{currentUser?.nama || 'Guru BK Hebat'}</h4>
              <span className="text-[11px] text-slate-300 font-mono">NIP: {currentUser?.nip || '-'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick KPI Stat Counters (Accurately computed from 0) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* KPI 1 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] text-slate-500 font-bold block uppercase">Profil Potensi</span>
            <div className="text-xl font-black text-slate-900">{stats.totalProfiles} Terdata</div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <Smile className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] text-slate-500 font-bold block uppercase">Emosi Positif</span>
            <div className="text-xl font-black text-emerald-700">
              {stats.totalEmotions > 0 ? `${stats.positivePercent}%` : '0%'}
            </div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] text-slate-500 font-bold block uppercase">Radar Tier 3</span>
            <div className="text-xl font-black text-rose-700">{stats.merahCount} Siaga Merah</div>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] text-slate-500 font-bold block uppercase">Rujukan Aktif</span>
            <div className="text-xl font-black text-amber-700">{stats.activeReferrals} Kasus</div>
          </div>
        </div>

        {/* KPI 5 */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5 col-span-2 lg:col-span-1">
          <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10.5px] text-slate-500 font-bold block uppercase">Sesi Konseling</span>
            <div className="text-xl font-black text-purple-900">{stats.totalCounseling} Logbook</div>
          </div>
        </div>
      </div>

      {/* Main 4 Navigation Tabs */}
      <div className="bg-slate-200/90 p-1.5 rounded-2xl flex flex-wrap items-center gap-1.5 shadow-inner border border-slate-300">
        <button
          onClick={() => setActiveMainTab('preventif')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'preventif'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-300/80'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Fase 1: Preventif &amp; Pengembangan (Jurus 1, 2, 4)</span>
        </button>

        <button
          onClick={() => setActiveMainTab('intervensi')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'intervensi'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-300/80'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Fase 2: Intervensi &amp; Advokasi (Jurus 3, 5, 6)</span>
        </button>

        <button
          onClick={() => setActiveMainTab('karir')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'karir'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-300/80'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Bimbingan Karir &amp; Studi Lanjut (SNBP/PTN)</span>
        </button>

        <button
          onClick={() => setActiveMainTab('akuntabilitas')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeMainTab === 'akuntabilitas'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-700 hover:bg-slate-300/80'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Akuntabilitas &amp; Refleksi (Jurus 7)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PREVENTIF & PENGEMBANGAN */}
      {/* ========================================================================= */}
      {activeMainTab === 'preventif' && (
        <div className="space-y-6">
          {/* Sub-tab selection */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setPreventifSubTab('potensi')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                preventifSubTab === 'potensi'
                  ? 'bg-purple-100 text-purple-900 font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Brain className="w-4 h-4 text-purple-600" />
              <span>Jurus 1: Profil Potensi Murid ({profiles.length})</span>
            </button>

            <button
              onClick={() => setPreventifSubTab('emosi')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                preventifSubTab === 'emosi'
                  ? 'bg-purple-100 text-purple-900 font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Smile className="w-4 h-4 text-purple-600" />
              <span>Jurus 2: Emotion Check-In &bull; EMC2 ({emotionLogs.length})</span>
            </button>

            <button
              onClick={() => setPreventifSubTab('kebiasaan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                preventifSubTab === 'kebiasaan'
                  ? 'bg-purple-100 text-purple-900 font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span>Jurus 4: 7 Kebiasaan Anak Hebat ({habitLogs.length})</span>
            </button>
          </div>

          {/* JURUS 1: PROFIL KEKUATAN SISWA */}
          {preventifSubTab === 'potensi' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span>Jurus 1: Kenali Potensi &bull; Profil Kekuatan Murid (Strength-Based)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Modalitas gaya belajar, kecerdasan majemuk, dan portofolio bakat untuk mengoptimalkan potensi peserta didik.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari nama siswa / NISN..."
                      className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setEditingProfile(null);
                      setIsProfileModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Profil Siswa</span>
                  </button>
                </div>
              </div>

              {/* Grid of Profiles or Empty State */}
              {profiles.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border-2 border-dashed border-purple-200 space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto shadow-inner">
                    <Brain className="w-8 h-8" />
                  </div>
                  <h4 className="font-black text-slate-800 text-sm">Belum Ada Profil Potensi Siswa (Mulai dari 0)</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Data saat ini kosong bersih. Silakan catat profil diagnostik gaya belajar, bakat minat, dan cita-cita karir siswa pertama Anda.
                  </p>
                  <button
                    onClick={() => {
                      setEditingProfile(null);
                      setIsProfileModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Profil Pertama Sekarang</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {profiles
                    .filter((p) => p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || p.nisn.includes(searchQuery))
                    .map((prof) => (
                      <div
                        key={prof.id}
                        className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-purple-300 shadow-xs hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center font-black text-sm">
                                {prof.studentName.charAt(0)}
                              </div>
                              <div>
                                <h4 className="font-extrabold text-xs text-slate-900 leading-tight">{prof.studentName}</h4>
                                <span className="text-[11px] text-slate-500 font-mono">
                                  NISN: {prof.nisn} &bull; Kelas {prof.kelas}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                                prof.learningStyle === 'Visual'
                                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                  : prof.learningStyle === 'Auditori'
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                  : prof.learningStyle === 'Kinestetik'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                  : 'bg-purple-50 text-purple-800 border border-purple-200'
                              }`}
                            >
                              {prof.learningStyle}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100">
                            <div>
                              <span className="font-bold text-slate-700 text-[11px]">Kekuatan &amp; Talenta:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {prof.strengthAttributes.map((attr, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 text-[10px] font-medium border border-purple-200"
                                  >
                                    {attr}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="pt-1">
                              <span className="font-bold text-slate-700 text-[11px]">Aspirasi Karir:</span>
                              <p className="text-indigo-800 font-bold text-xs mt-0.5">{prof.careerAspiration}</p>
                            </div>

                            {prof.diagnosticNotes && (
                              <p className="text-[10.5px] text-slate-500 italic bg-slate-50 p-2 rounded-xl mt-1">
                                &ldquo;{prof.diagnosticNotes}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action buttons: Edit & Delete */}
                        <div className="flex items-center justify-end gap-1.5 pt-3 border-t border-slate-100">
                          <button
                            onClick={() => {
                              setEditingProfile(prof);
                              setIsProfileModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                            title="Edit Profil"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmation({
                                isOpen: true,
                                type: 'profile',
                                id: prof.id,
                                title: `Profil Potensi ${prof.studentName}`,
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Hapus Profil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* JURUS 2: EMOTION CHECK-IN & RODA PILIHAN */}
          {preventifSubTab === 'emosi' && (
            <div className="space-y-5">
              <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <Smile className="w-4 h-4 text-purple-600" />
                      <span>Jurus 2: Kelola Emosi &bull; Emotion Check-In Harian &amp; Framework EMC2</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Instrumen regulasi emosi mandiri (*Roda Pilihan*), pemantauan suasana hati harian, dan empati kolaboratif.
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      setEditingEmotion(null);
                      setIsEmotionModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all self-start sm:self-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Check-In Emosi</span>
                  </button>
                </div>

                {/* Framework EMC2 Highlights */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-1">
                    <span className="font-black text-indigo-900 text-xs">1. Empathy (Empati)</span>
                    <p className="text-[11px] text-slate-600">Mendengar tanpa menghakimi, memvalidasi perasaan murid.</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-sky-50/80 border border-sky-200 space-y-1">
                    <span className="font-black text-sky-900 text-xs">2. Mindfulness</span>
                    <p className="text-[11px] text-slate-600">Kesadaran penuh saat ini dengan teknik pernapasan STOP.</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-1">
                    <span className="font-black text-emerald-900 text-xs">3. Compassion</span>
                    <p className="text-[11px] text-slate-600">Tindakan peduli untuk saling meringankan beban kawan.</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-1">
                    <span className="font-black text-amber-900 text-xs">4. Critical Inquiry</span>
                    <p className="text-[11px] text-slate-600">Refleksi akar masalah secara logis dan terstruktur.</p>
                  </div>
                </div>

                {/* Live Emotion Logs Feed or Empty State */}
                {emotionLogs.length === 0 ? (
                  <div className="p-10 text-center bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                      <Smile className="w-6 h-6" />
                    </div>
                    <h5 className="font-bold text-xs text-slate-700">Belum Ada Catatan Check-In Emosi Siswa</h5>
                    <p className="text-[11px] text-slate-500">Mulai dari 0: Catat suasana hati siswa harian dan solusi Roda Pilihan.</p>
                    <button
                      onClick={() => {
                        setEditingEmotion(null);
                        setIsEmotionModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all"
                    >
                      Catat Check-In Pertama
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 pt-2">
                    {emotionLogs.map((log) => (
                      <div key={log.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black px-2 py-1 rounded-lg uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {log.emotionCategory}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-slate-900">{log.studentName}</span>
                              <span className="text-[10px] text-slate-500 font-mono">Kelas {log.kelas}</span>
                              <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                Energi: {log.energyLevel}/5
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5">{log.triggerNote || 'Tidak ada catatan pemicu.'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200 block">
                              Roda Pilihan: {log.chosenSolution || 'Teknik Relaksasi'}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">{log.date}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingEmotion(log);
                                setIsEmotionModalOpen(true);
                              }}
                              className="p-1 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                              title="Edit Log Emosi"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteConfirmation({
                                  isOpen: true,
                                  type: 'emotion',
                                  id: log.id,
                                  title: `Check-in Emosi ${log.studentName}`,
                                });
                              }}
                              className="p-1 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                              title="Hapus Log Emosi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* JURUS 4: HABIT TRACKER KARAKTER */}
          {preventifSubTab === 'kebiasaan' && (
            <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span>Jurus 4: Jaga Konsistensi &bull; Habit Tracker 7 Kebiasaan Anak Indonesia Hebat</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Penguatan konsistensi perilaku positif, disiplin belajar mandiri, dan refleksi mingguan terukur.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingHabit(null);
                    setIsHabitModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catat Pembiasaan Siswa</span>
                </button>
              </div>

              {/* 7 Standard Habits Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {DEFAULT_7_HABITS.map((hab, idx) => (
                  <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <span className="font-bold text-slate-800">{hab}</span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-800">
                      Butir {idx + 1}
                    </span>
                  </div>
                ))}
              </div>

              {/* User Logged Habit Records */}
              {habitLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                    <TrendingUp className="w-6 h-6" />
                  </div>
                  <h5 className="font-bold text-xs text-slate-700">Belum Ada Catatan Habit Tracker (Mulai dari 0)</h5>
                  <p className="text-[11px] text-slate-500">Gunakan tombol &quot;Catat Pembiasaan Siswa&quot; untuk mencatat kepatuhan 7 kebiasaan.</p>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">Rekam Jejak Pembiasaan Murid:</h5>
                  <div className="divide-y divide-slate-100">
                    {habitLogs.map((hbt) => (
                      <div key={hbt.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-slate-900">{hbt.studentName}</h4>
                            <span className="text-slate-500 font-mono">Kelas {hbt.kelas}</span>
                            <span className="text-[10px] text-slate-400">&bull; {hbt.date}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {hbt.habitsChecked.map((h, i) => (
                              <span key={i} className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold border border-emerald-200">
                                &bull; {h}
                              </span>
                            ))}
                          </div>
                          {hbt.weeklyReflection && (
                            <p className="text-[11px] text-slate-600 italic mt-1">&ldquo;{hbt.weeklyReflection}&rdquo;</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            onClick={() => {
                              setEditingHabit(hbt);
                              setIsHabitModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Edit Habit Log"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmation({
                                isOpen: true,
                                type: 'habit',
                                id: hbt.id,
                                title: `Habit Log ${hbt.studentName}`,
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Habit Log"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: PUSAT KENDALI INTERVENSI (TIER 2 & 3) */}
      {/* ========================================================================= */}
      {activeMainTab === 'intervensi' && (
        <div className="space-y-6">
          {/* Sub-tab selection */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setIntervensiSubTab('kerawanan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                intervensiSubTab === 'kerawanan'
                  ? 'bg-rose-100 text-rose-900 font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Jurus 5: Peta Kerawanan &amp; Deteksi Dini ({vulnerabilityList.length})</span>
            </button>

            <button
              onClick={() => setIntervensiSubTab('rujukan')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                intervensiSubTab === 'rujukan'
                  ? 'bg-rose-100 text-rose-900 font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 text-rose-600" />
              <span>Jurus 6: Alur Rujukan Kasus MTSS ({referrals.length})</span>
            </button>

            <button
              onClick={() => setIntervensiSubTab('resiliensi')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                intervensiSubTab === 'resiliensi'
                  ? 'bg-rose-100 text-rose-900 font-black'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Lock className="w-4 h-4 text-rose-600" />
              <span>Jurus 3: Buku Kasus &amp; Resiliensi ({counselingLogs.length})</span>
            </button>
          </div>

          {/* JURUS 5: PETA KERAWANAN SISWA */}
          {intervensiSubTab === 'kerawanan' && (
            <div className="space-y-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Jurus 5: Petakan Tantangan &bull; Radar Deteksi Dini &amp; Peta Kerawanan</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Deteksi risiko otomatis dari tiket rujukan berjenjang dan fluktuasi emosi harian murid.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setRiskFilter('ALL')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                        riskFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      Semua ({vulnerabilityList.length})
                    </button>
                    <button
                      onClick={() => setRiskFilter('MERAH')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                        riskFilter === 'MERAH' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-800'
                      }`}
                    >
                      Tier 3: Merah ({stats.merahCount})
                    </button>
                    <button
                      onClick={() => setRiskFilter('KUNING')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold cursor-pointer ${
                        riskFilter === 'KUNING' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-800'
                      }`}
                    >
                      Tier 2: Kuning ({stats.kuningCount})
                    </button>
                  </div>
                </div>

                {vulnerabilityList.length === 0 ? (
                  <div className="p-10 text-center bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h5 className="font-bold text-xs text-emerald-900">Kondisi Siswa Aman (0 Kerawanan Terdeteksi)</h5>
                    <p className="text-[11px] text-emerald-700">Tidak ada kasus rujukan merah atau indikator kecemasan aktif.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {vulnerabilityList
                      .filter((item) => riskFilter === 'ALL' || item.riskLevel === riskFilter)
                      .map((item, idx) => (
                        <div key={idx} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                                  item.riskLevel === 'MERAH'
                                    ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                    : item.riskLevel === 'KUNING'
                                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                    : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                }`}
                              >
                                {item.riskLevel === 'MERAH' ? 'TIER 3: SIAGA MERAH' : item.riskLevel === 'KUNING' ? 'TIER 2: WASPADA' : 'TIER 1: AMAN'}
                              </span>
                              <h4 className="font-extrabold text-sm text-slate-900">{item.student.nama}</h4>
                              <span className="text-[11px] text-slate-500 font-mono">NISN: {item.student.nisn} &bull; Kelas {item.student.kelas}</span>
                            </div>

                            {item.triggers.length > 0 ? (
                              <ul className="text-[11px] text-rose-700 list-disc pl-4 space-y-0.5">
                                {item.triggers.map((trig, i) => (
                                  <li key={i}>{trig}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[11px] text-emerald-700">Indikator emosi dan kehadiran stabil normal.</p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            <button
                              onClick={() => {
                                setEditingCounseling({
                                  id: '',
                                  studentId: item.student.id,
                                  studentName: item.student.nama,
                                  kelas: item.student.kelas || 'X.1',
                                  counselorId: currentUser?.id || 'tch-bk',
                                  counselorName: currentUser?.nama || 'Guru BK Hebat',
                                  counselingType: 'individu',
                                  sessionDate: new Date().toISOString().replace('T', ' ').slice(0, 16),
                                  caseCategory: item.triggers[0] || 'Pendampingan Khusus',
                                  counselingNotes: '',
                                  resiliencePlan: '',
                                  status: 'berjalan',
                                  createdAt: new Date().toISOString(),
                                });
                                setIsCounselingModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-bold transition-all cursor-pointer"
                            >
                              Tindak Lanjuti Konseling
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* JURUS 6: RUJUKAN KASUS MTSS */}
          {intervensiSubTab === 'rujukan' && (
            <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Users className="w-4 h-4 text-rose-600" />
                    <span>Jurus 6: Bangun Kolaborasi &bull; Alur Rujukan Kasus Berjenjang MTSS</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kolaborasi rujukan dari Guru Mapel, Wali Kelas, Orang Tua, dan Guru BK dengan proteksi privasi murid.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setEditingReferral(null);
                    setIsReferralModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Tiket Rujukan Baru</span>
                </button>
              </div>

              {/* Referrals List or Empty State */}
              {referrals.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                    <Users className="w-6 h-6" />
                  </div>
                  <h5 className="font-bold text-xs text-slate-700">Belum Ada Tiket Rujukan Kasus (Mulai dari 0)</h5>
                  <p className="text-[11px] text-slate-500">Buat tiket baru jika ada siswa yang memerlukan penanganan Tier 1, 2, atau 3.</p>
                  <button
                    onClick={() => {
                      setEditingReferral(null);
                      setIsReferralModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                  >
                    Buat Tiket Pertama
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {referrals.map((ref) => (
                    <div key={ref.id} className="py-4 space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-md font-black text-[10px] ${
                              ref.urgencyTier === 'tier_3'
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : ref.urgencyTier === 'tier_2'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                            }`}
                          >
                            {ref.urgencyTier.toUpperCase()}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900">{ref.studentName}</h4>
                          <span className="text-[11px] text-slate-500">Kelas {ref.kelas}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={ref.status}
                            onChange={(e) => {
                              saveBKReferral({ ...ref, status: e.target.value as any });
                            }}
                            className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-50 border border-slate-300 text-slate-800"
                          >
                            <option value="diajukan">Diajukan</option>
                            <option value="diterima">Diterima</option>
                            <option value="dalam_proses">Dalam Proses</option>
                            <option value="selesai">Selesai</option>
                            <option value="rujuk_ahli">Rujuk Ahli Luar</option>
                          </select>

                          <button
                            onClick={() => {
                              setEditingReferral(ref);
                              setIsReferralModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Edit Rujukan"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmation({
                                isOpen: true,
                                type: 'referral',
                                id: ref.id,
                                title: `Tiket Rujukan ${ref.studentName}`,
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Rujukan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-slate-700 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <strong>Gejala dari Pelapor ({ref.referrerTeacherName}):</strong> {ref.initialConcern}
                      </p>
                      {ref.feedbackNote && (
                        <p className="text-[11px] text-indigo-800 font-medium">
                          Catatan Tindak Lanjut Guru BK: {ref.feedbackNote}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* JURUS 3: RESILIENSI & BUKU KASUS RAHASIA */}
          {intervensiSubTab === 'resiliensi' && (
            <div className="p-5 rounded-3xl bg-white border border-slate-200 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                    <Lock className="w-4 h-4 text-purple-600" />
                    <span>Jurus 3: Tumbuhkan Resiliensi &bull; Buku Kasus &amp; Logbook Konseling Pribadi</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="px-2 py-0.2 rounded-md text-[9.5px] font-black bg-rose-100 text-rose-900 border border-rose-300">
                      SANGAT RAHASIA (CONFIDENTIAL)
                    </span>
                    <span className="text-xs text-slate-500">
                      Hanya dapat diakses oleh Guru BK Pengampu dan Kepala Sekolah.
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setEditingCounseling(null);
                    setIsCounselingModalOpen(true);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Catat Sesi Konseling Baru</span>
                </button>
              </div>

              {counselingLogs.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h5 className="font-bold text-xs text-slate-700">Belum Ada Sesi Konseling Tercatat (Mulai dari 0)</h5>
                  <p className="text-[11px] text-slate-500">Catat wawancara konseling individu, kelompok, home visit, atau konferensi kasus.</p>
                  <button
                    onClick={() => {
                      setEditingCounseling(null);
                      setIsCounselingModalOpen(true);
                    }}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs"
                  >
                    Catat Sesi Pertama
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {counselingLogs.map((log) => (
                    <div key={log.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-slate-200 text-slate-800">
                            {log.counselingType.toUpperCase()}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900">{log.studentName}</h4>
                          <span className="text-slate-500 font-mono">({log.kelas})</span>
                          <span className="text-purple-700 font-bold">&bull; {log.caseCategory}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400">{log.sessionDate}</span>
                          <button
                            onClick={() => {
                              setEditingCounseling(log);
                              setIsCounselingModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-white"
                            title="Edit Notula"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmation({
                                isOpen: true,
                                type: 'counseling',
                                id: log.id,
                                title: `Notula Konseling ${log.studentName}`,
                              });
                            }}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-white"
                            title="Hapus Notula"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-700 space-y-1">
                        <span className="font-black text-rose-900 text-[11px] flex items-center gap-1">
                          <Lock className="w-3 h-3" />
                          Notula Konseling Privat:
                        </span>
                        <p className="leading-relaxed">{log.counselingNotes}</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                        <strong className="block text-[11px] mb-0.5">Target Resiliensi (Growth-Mindset Plan):</strong>
                        <p className="text-[11.5px]">{log.resiliencePlan}</p>
                      </div>

                      {log.generalFeedback && (
                        <p className="text-[11px] text-slate-600 italic">
                          <strong>Rekomendasi Terbuka Guru/Wali Kelas:</strong> &ldquo;{log.generalFeedback}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KARIR, MINAT-BAKAT & SNBP */}
      {/* ========================================================================= */}
      {activeMainTab === 'karir' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <span>Pusat Kendali Karir &bull; Pemetaan Minat-Bakat, Kuota SNBP &amp; Studi Lanjut</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rekomendasi studi perguruan tinggi (PTN/PTS/Kedinasan), pemantauan kuota eligible SNBP, dan bimbingan karir masa depan.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingProfile(null);
                setIsProfileModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Aspirasi Siswa</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
              <span className="text-xs font-black text-indigo-900 block">Jalur SNBP (Prestasi Rapor)</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pemetaan kuota eligible 40% siswa SMAN 3 Tumijajar berdasarkan rekam nilai rapor semester 1 s.d. 5 dan portofolio prestasi.
              </p>
              <div className="pt-2">
                <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-indigo-600 text-white shadow-2xs">
                  Siswa Terdata Aspirasi: {profiles.filter((p) => p.careerAspiration).length} Siswa
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2">
              <span className="text-xs font-black text-sky-900 block">Jalur SNBT (Tes UTBK)</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Simulasi latihan penalaran umum, literasi bahasa, dan numerasi terintegrasi dengan modul evaluasi diagnostik.
              </p>
              <div className="pt-2">
                <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-sky-600 text-white shadow-2xs">
                  Modul Bimbingan Terpadu
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <span className="text-xs font-black text-emerald-900 block">Sekolah Kedinasan &amp; TNI/Polri</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Bimbingan persyaratan administrasi, tes psikologi, dan pemeliharaan kesehatan fisik bersama jejaring alumni SMA Negeri 3 Tumijajar.
              </p>
              <div className="pt-2">
                <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-600 text-white shadow-2xs">
                  Jejaring Alumni Aktif
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AKUNTABILITAS & REFLEKSI (JURUS 7) */}
      {/* ========================================================================= */}
      {activeMainTab === 'akuntabilitas' && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-black text-base text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Jurus 7: Evaluasi &amp; Refleksi &bull; Dasbor Akuntabilitas Kinerja BK</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Laporan akuntabilitas manajerial untuk Kepala Sekolah dan Pengawas Pembina SMA Negeri 3 Tumijajar.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
            >
              <Download className="w-4 h-4" />
              <span>Cetak Laporan Akuntabilitas BK</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Profil Siswa Terpetakan</span>
              <div className="text-2xl font-black text-slate-900">{profiles.length} Siswa</div>
              <span className="text-[10px] text-purple-700 font-bold">Diagnostik Minat Bakat</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Konseling Individu</span>
              <div className="text-2xl font-black text-slate-900">{stats.totalCounseling} Sesi</div>
              <span className="text-[10px] text-emerald-700 font-bold">100% Tercatat Resmi</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Rujukan Tertangani</span>
              <div className="text-2xl font-black text-slate-900">{referrals.filter((r) => r.status === 'selesai').length} Kasus</div>
              <span className="text-[10px] text-indigo-700 font-bold">Total Tiket: {referrals.length}</span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Catatan Pembiasaan</span>
              <div className="text-2xl font-black text-slate-900">{habitLogs.length} Entri</div>
              <span className="text-[10px] text-purple-700 font-bold">7 Karakter Anak Hebat</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TAMBAH / EDIT PROFIL POTENSI (JURUS 1) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isProfileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto p-6 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <span>{editingProfile ? 'Edit Profil Potensi Siswa' : 'Tambah Profil Potensi Siswa (Jurus 1)'}</span>
                </h4>
                <button onClick={() => setIsProfileModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const studentId = (form.elements.namedItem('studentId') as HTMLSelectElement).value;
                  const learningStyle = (form.elements.namedItem('learningStyle') as HTMLSelectElement).value as any;
                  const strengthsStr = (form.elements.namedItem('strengths') as HTMLInputElement).value;
                  const career = (form.elements.namedItem('career') as HTMLInputElement).value;
                  const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;

                  const std = studentsList.find((s) => s.id === studentId);
                  const studentName = std ? std.nama : (editingProfile?.studentName || 'Peserta Didik');
                  const nisn = std ? std.nisn : (editingProfile?.nisn || '-');
                  const kelas = std ? (std.kelas || 'X.1') : (editingProfile?.kelas || 'X.1');

                  const strengths = strengthsStr
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean);

                  const profToSave: BKProfile = {
                    id: editingProfile?.id || `bk-prof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    studentId,
                    studentName,
                    nisn,
                    kelas,
                    learningStyle,
                    strengthAttributes: strengths.length > 0 ? strengths : ['Analitis', 'Problem Solving'],
                    careerAspiration: career || 'Perguruan Tinggi Negeri',
                    diagnosticNotes: notes,
                    updatedAt: new Date().toISOString().split('T')[0],
                  };

                  saveBKProfile(profToSave);
                  setIsProfileModalOpen(false);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pilih Siswa</label>
                  <select
                    name="studentId"
                    defaultValue={editingProfile?.studentId || (studentsList[0]?.id || '')}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {studentsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kelas || 'X.1'}) - NISN: {s.nisn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gaya Belajar Dominan</label>
                  <select
                    name="learningStyle"
                    defaultValue={editingProfile?.learningStyle || 'Visual'}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="Visual">Visual (Spasial, Bagan &amp; Visual)</option>
                    <option value="Auditori">Auditori (Pendengaran &amp; Diskusi Verbal)</option>
                    <option value="Kinestetik">Kinestetik (Praktik, Gerak &amp; Eksperimen)</option>
                    <option value="Multimodal">Multimodal (Gabungan Fleksibel)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kekuatan &amp; Talenta (Pisahkan dengan koma)</label>
                  <input
                    type="text"
                    name="strengths"
                    defaultValue={editingProfile?.strengthAttributes?.join(', ') || 'Logis-Matematis, Analitis, Kepemimpinan'}
                    placeholder="Contoh: Logis-Matematis, Public Speaking, Fotografi"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Aspirasi Karir / Cita-Cita Studi Lanjut</label>
                  <input
                    type="text"
                    name="career"
                    defaultValue={editingProfile?.careerAspiration || ''}
                    placeholder="Contoh: Kedokteran (UNILA), Teknik Informatika (ITB), Akpol"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catatan Diagnostik BK (Opsional)</label>
                  <textarea
                    name="notes"
                    defaultValue={editingProfile?.diagnosticNotes || ''}
                    rows={2}
                    placeholder="Observasi motivasi, minat spesifik, atau saran pengembangan..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md cursor-pointer"
                  >
                    Simpan Profil
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: TAMBAH / EDIT CHECK-IN EMOSI (JURUS 2) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isEmotionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-y-auto my-auto p-6 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Smile className="w-4 h-4 text-purple-600" />
                  <span>{editingEmotion ? 'Edit Check-In Emosi Siswa' : 'Catat Check-In Emosi Siswa (Jurus 2)'}</span>
                </h4>
                <button onClick={() => setIsEmotionModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const studentId = (form.elements.namedItem('studentId') as HTMLSelectElement).value;
                  const emotionCategory = (form.elements.namedItem('emotionCategory') as HTMLSelectElement).value as any;
                  const energyLevel = parseInt((form.elements.namedItem('energyLevel') as HTMLSelectElement).value, 10);
                  const triggerNote = (form.elements.namedItem('triggerNote') as HTMLInputElement).value;
                  const solution = (form.elements.namedItem('solution') as HTMLSelectElement).value;

                  const std = studentsList.find((s) => s.id === studentId);
                  const studentName = std ? std.nama : (editingEmotion?.studentName || 'Peserta Didik');
                  const kelas = std ? (std.kelas || 'X.1') : (editingEmotion?.kelas || 'X.1');

                  const emotionToSave: BKEmotionLog = {
                    id: editingEmotion?.id || `bk-emo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    studentId,
                    studentName,
                    kelas,
                    date: new Date().toISOString().split('T')[0],
                    emotionCategory,
                    energyLevel: isNaN(energyLevel) ? 3 : energyLevel,
                    triggerNote,
                    chosenSolution: solution,
                    createdAt: new Date().toISOString(),
                  };

                  saveBKEmotionLog(emotionToSave);
                  setIsEmotionModalOpen(false);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peserta Didik</label>
                  <select
                    name="studentId"
                    defaultValue={editingEmotion?.studentId || (studentsList[0]?.id || '')}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {studentsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kelas || 'X.1'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kategori Emosi</label>
                    <select
                      name="emotionCategory"
                      defaultValue={editingEmotion?.emotionCategory || 'tenang'}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      <option value="gembira">Gembira / Bersemangat</option>
                      <option value="tenang">Tenang / Fokus</option>
                      <option value="cemas">Cemas / Khawatir</option>
                      <option value="sedih">Sedih / Galau</option>
                      <option value="marah">Marah / Kecewa</option>
                      <option value="lelah">Lelah / Kejenuhan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tingkat Energi (1-5)</label>
                    <select
                      name="energyLevel"
                      defaultValue={editingEmotion?.energyLevel || 3}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      <option value="5">5 - Sangat Berenergi</option>
                      <option value="4">4 - Aktif &amp; Siap</option>
                      <option value="3">3 - Sedang / Cukup</option>
                      <option value="2">2 - Mulai Turun</option>
                      <option value="1">1 - Sangat Rendah</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catatan Pemicu Suasana Hati</label>
                  <input
                    type="text"
                    name="triggerNote"
                    defaultValue={editingEmotion?.triggerNote || ''}
                    placeholder="Contoh: Menjelang asesmen sumatif, tugas kelompok, atau masalah pertemanan"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Solusi Terpilih (Roda Pilihan Solusi)</label>
                  <select
                    name="solution"
                    defaultValue={editingEmotion?.chosenSolution || PRESET_SOLUTIONS[0]}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {PRESET_SOLUTIONS.map((sol, idx) => (
                      <option key={idx} value={sol}>
                        {sol}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsEmotionModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md cursor-pointer"
                  >
                    Simpan Check-In
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: TAMBAH / EDIT TIKET RUJUKAN MTSS (JURUS 6) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isReferralModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-y-auto my-auto p-6 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-rose-600" />
                  <span>{editingReferral ? 'Edit Tiket Rujukan Kasus' : 'Buat Tiket Rujukan Kasus Siswa (MTSS)'}</span>
                </h4>
                <button onClick={() => setIsReferralModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const studentId = (form.elements.namedItem('studentId') as HTMLSelectElement).value;
                  const referrerName = (form.elements.namedItem('referrerName') as HTMLInputElement).value;
                  const concern = (form.elements.namedItem('concern') as HTMLTextAreaElement).value;
                  const tier = (form.elements.namedItem('tier') as HTMLSelectElement).value as any;
                  const status = (form.elements.namedItem('status') as HTMLSelectElement).value as any;
                  const feedback = (form.elements.namedItem('feedback') as HTMLInputElement).value;

                  const std = studentsList.find((s) => s.id === studentId);
                  const studentName = std ? std.nama : (editingReferral?.studentName || 'Peserta Didik');
                  const kelas = std ? (std.kelas || 'X.1') : (editingReferral?.kelas || 'X.1');

                  const refToSave: BKReferral = {
                    id: editingReferral?.id || `bk-ref-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    studentId,
                    studentName,
                    kelas,
                    referrerTeacherId: currentUser?.id || 'tch-ref',
                    referrerTeacherName: referrerName || currentUser?.nama || 'Guru Mapel / Wali Kelas',
                    bkCounselorId: currentUser?.id || 'tch-bk',
                    bkCounselorName: currentUser?.nama || 'Guru BK Hebat',
                    initialConcern: concern,
                    urgencyTier: tier,
                    status: status || 'diajukan',
                    feedbackNote: feedback,
                    createdAt: editingReferral?.createdAt || new Date().toISOString().split('T')[0],
                  };

                  saveBKReferral(refToSave);
                  setIsReferralModalOpen(false);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peserta Didik yang Dirujuk</label>
                  <select
                    name="studentId"
                    defaultValue={editingReferral?.studentId || (studentsList[0]?.id || '')}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {studentsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kelas || 'X.1'}) - NISN: {s.nisn}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Guru Pelapor / Pengusul</label>
                    <input
                      type="text"
                      name="referrerName"
                      defaultValue={editingReferral?.referrerTeacherName || currentUser?.nama || 'Wali Kelas / Guru Mapel'}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tingkat Urgensi MTSS</label>
                    <select
                      name="tier"
                      defaultValue={editingReferral?.urgencyTier || 'tier_2'}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      <option value="tier_1">Tier 1: Bimbingan Preventif / Kelompok Sebaya</option>
                      <option value="tier_2">Tier 2: Pendampingan Terarah Khusus</option>
                      <option value="tier_3">Tier 3: Konseling Intensif / Kasus Mendesak</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Rujukan</label>
                  <select
                    name="status"
                    defaultValue={editingReferral?.status || 'diajukan'}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="diajukan">Diajukan</option>
                    <option value="diterima">Diterima</option>
                    <option value="dalam_proses">Dalam Proses</option>
                    <option value="selesai">Selesai</option>
                    <option value="rujuk_ahli">Rujuk Ahli Luar (Psikolog/Medis)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Gejala Awal / Alasan Rujukan</label>
                  <textarea
                    name="concern"
                    defaultValue={editingReferral?.initialConcern || ''}
                    required
                    rows={3}
                    placeholder="Jelaskan observasi perubahan perilaku, absensi sering alpa, atau penurunan prestasi..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catatan Tindak Lanjut Guru BK (Opsional)</label>
                  <input
                    type="text"
                    name="feedback"
                    defaultValue={editingReferral?.feedbackNote || ''}
                    placeholder="Contoh: Sudah dijadwalkan sesi konseling santai hari Selasa jam ke-4"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsReferralModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black shadow-md cursor-pointer"
                  >
                    Simpan Tiket Rujukan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 4: TAMBAH / EDIT NOTULA KONSELING PRIBADI (JURUS 3) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCounselingModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-y-auto my-auto p-6 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-600" />
                  <span>{editingCounseling?.id ? 'Edit Notula Sesi Konseling' : 'Catat Sesi Konseling &amp; Resiliensi (Jurus 3)'}</span>
                </h4>
                <button onClick={() => setIsCounselingModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const studentId = (form.elements.namedItem('studentId') as HTMLSelectElement).value;
                  const type = (form.elements.namedItem('counselingType') as HTMLSelectElement).value as any;
                  const category = (form.elements.namedItem('category') as HTMLInputElement).value;
                  const notes = (form.elements.namedItem('notes') as HTMLTextAreaElement).value;
                  const plan = (form.elements.namedItem('plan') as HTMLTextAreaElement).value;
                  const feedback = (form.elements.namedItem('feedback') as HTMLTextAreaElement).value;
                  const status = (form.elements.namedItem('status') as HTMLSelectElement).value as any;

                  const std = studentsList.find((s) => s.id === studentId);
                  const studentName = std ? std.nama : (editingCounseling?.studentName || 'Peserta Didik');
                  const kelas = std ? (std.kelas || 'X.1') : (editingCounseling?.kelas || 'X.1');

                  const csToSave: BKCounselingLog = {
                    id: editingCounseling?.id || `bk-cs-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    studentId,
                    studentName,
                    kelas,
                    counselorId: currentUser?.id || 'tch-bk',
                    counselorName: currentUser?.nama || 'Guru BK Hebat',
                    counselingType: type || 'individu',
                    sessionDate: editingCounseling?.sessionDate || new Date().toISOString().replace('T', ' ').slice(0, 16),
                    caseCategory: category,
                    counselingNotes: notes,
                    resiliencePlan: plan,
                    generalFeedback: feedback,
                    status: status || 'selesai',
                    createdAt: editingCounseling?.createdAt || new Date().toISOString().split('T')[0],
                  };

                  saveBKCounselingLog(csToSave);
                  setIsCounselingModalOpen(false);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peserta Didik</label>
                  <select
                    name="studentId"
                    defaultValue={editingCounseling?.studentId || (studentsList[0]?.id || '')}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {studentsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kelas || 'X.1'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jenis Layanan Konseling</label>
                    <select
                      name="counselingType"
                      defaultValue={editingCounseling?.counselingType || 'individu'}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      <option value="individu">Konseling Individual</option>
                      <option value="kelompok">Konseling Kelompok</option>
                      <option value="konferensi_kasus">Konferensi Kasus</option>
                      <option value="home_visit">Kunjungan Rumah (Home Visit)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status Penanganan</label>
                    <select
                      name="status"
                      defaultValue={editingCounseling?.status || 'selesai'}
                      required
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                    >
                      <option value="berjalan">Masih Berjalan (Follow-up)</option>
                      <option value="selesai">Tuntas &amp; Selesai</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Topik / Kategori Konseling</label>
                  <input
                    type="text"
                    name="category"
                    defaultValue={editingCounseling?.caseCategory || ''}
                    required
                    placeholder="Contoh: Regulasi Diri, Kecemasan Belajar, Hubungan Sebaya"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Notula Konseling Privat <span className="text-rose-600 font-black">(Rahasia)</span>
                  </label>
                  <textarea
                    name="notes"
                    defaultValue={editingCounseling?.counselingNotes || ''}
                    required
                    rows={3}
                    placeholder="Isi wawancara konseling, dinamika perasaan, dan temuan kunci..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Resiliensi (*Growth-Mindset Plan*)</label>
                  <textarea
                    name="plan"
                    defaultValue={editingCounseling?.resiliencePlan || ''}
                    required
                    rows={2}
                    placeholder="Rencana aksi adaptasi, komitmen mandiri, dan target bangkit murid..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rekomendasi Terbuka untuk Wali Kelas (Opsional)</label>
                  <textarea
                    name="feedback"
                    defaultValue={editingCounseling?.generalFeedback || ''}
                    rows={2}
                    placeholder="Catatan dukungan umum yang boleh dibaca oleh wali kelas tanpa membuka rahasia pribadi..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsCounselingModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md cursor-pointer"
                  >
                    Simpan Notula Rahasia
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 5: TAMBAH / EDIT HABIT TRACKER (JURUS 4) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isHabitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-y-auto my-auto p-6 space-y-4 text-xs"
            >
              <div className="flex items-center justify-between border-b pb-3">
                <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  <span>{editingHabit ? 'Edit Catatan Kebiasaan Siswa' : 'Catat 7 Kebiasaan Anak Indonesia Hebat (Jurus 4)'}</span>
                </h4>
                <button onClick={() => setIsHabitModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const studentId = (form.elements.namedItem('studentId') as HTMLSelectElement).value;
                  const date = (form.elements.namedItem('date') as HTMLInputElement).value;
                  const reflection = (form.elements.namedItem('reflection') as HTMLTextAreaElement).value;

                  const checkedList: string[] = [];
                  DEFAULT_7_HABITS.forEach((_, idx) => {
                    const chk = form.elements.namedItem(`habit_${idx}`) as HTMLInputElement;
                    if (chk && chk.checked) {
                      checkedList.push(DEFAULT_7_HABITS[idx]);
                    }
                  });

                  const std = studentsList.find((s) => s.id === studentId);
                  const studentName = std ? std.nama : (editingHabit?.studentName || 'Peserta Didik');
                  const kelas = std ? (std.kelas || 'X.1') : (editingHabit?.kelas || 'X.1');

                  const habitToSave: BKHabitLog = {
                    id: editingHabit?.id || `bk-hbt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    studentId,
                    studentName,
                    kelas,
                    date: date || new Date().toISOString().split('T')[0],
                    habitsChecked: checkedList,
                    weeklyReflection: reflection,
                  };

                  saveBKHabitLog(habitToSave);
                  setIsHabitModalOpen(false);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peserta Didik</label>
                  <select
                    name="studentId"
                    defaultValue={editingHabit?.studentId || (studentsList[0]?.id || '')}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    {studentsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kelas || 'X.1'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Pemantauan</label>
                  <input
                    type="date"
                    name="date"
                    defaultValue={editingHabit?.date || new Date().toISOString().split('T')[0]}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">Centang 7 Kebiasaan yang Terpenuhi Rutin:</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    {DEFAULT_7_HABITS.map((hab, idx) => {
                      const isDefaultChecked = editingHabit ? editingHabit.habitsChecked.includes(hab) : true;
                      return (
                        <label key={idx} className="flex items-start gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            name={`habit_${idx}`}
                            defaultChecked={isDefaultChecked}
                            className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                          />
                          <span className="text-[11.5px] font-semibold text-slate-800">{hab}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Refleksi Karir / Refleksi Diri Murid (Opsional)</label>
                  <textarea
                    name="reflection"
                    defaultValue={editingHabit?.weeklyReflection || ''}
                    rows={2}
                    placeholder="Refleksi kemandirian dan rasa syukur murid selama seminggu terakhir..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <button
                    type="button"
                    onClick={() => setIsHabitModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black shadow-md cursor-pointer"
                  >
                    Simpan Pembiasaan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 6: KONFIRMASI HAPUS ITEM BK (SWEET ALERT) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deleteConfirmation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center space-y-4 my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
                <Trash2 className="w-7 h-7" />
              </div>

              <div>
                <h4 className="font-black text-slate-900 text-base">Hapus Data BK Ini?</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Apakah Anda yakin ingin menghapus <strong>&quot;{deleteConfirmation.title}&quot;</strong>? Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmation(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition-all active:scale-95"
                >
                  Ya, Hapus Sekarang
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 7: KONFIRMASI MULAI DARI 0 (RESET SEMUA DATA BK) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center space-y-4 my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto"
            >
              <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto shadow-inner">
                <RotateCcw className="w-8 h-8" />
              </div>

              <div>
                <h4 className="font-black text-slate-900 text-base">Mulai Semua Data BK dari 0?</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Semua profil potensi siswa, check-in emosi, tiket rujukan, buku kasus konseling, dan habit tracker akan dihapus bersih sehingga modul Bimbingan Konseling kosong dan siap digunakan dari awal.
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Data guru, siswa, kelas, dan asesmen sekolah tetap aman dan tidak akan terhapus. Hanya modul BK yang dikosongkan.
                </span>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await resetAllBKData();
                    setIsResetConfirmOpen(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition-all active:scale-95"
                >
                  Ya, Bersihkan &amp; Mulai dari 0
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
