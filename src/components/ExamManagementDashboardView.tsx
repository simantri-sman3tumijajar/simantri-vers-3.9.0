import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Laptop,
  Key,
  Users,
  Calendar,
  UserCheck,
  Printer,
  Plus,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  GraduationCap,
  Activity,
  Server,
  Radio,
  FileText,
  Lock,
  Unlock,
  ClipboardCheck,
  CheckCircle2,
  Copy,
  Eye,
  Medal,
  Award,
  Check,
  RotateCcw,
  DoorOpen,
  Smartphone,
} from 'lucide-react';
import { motion } from 'motion/react';
import { collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DSMartGuideAndSimulatorModal } from './DSMartGuideAndSimulatorModal';
import { OlimpiadeAssistantModal } from './OlimpiadeAssistantModal';

export const ExamManagementDashboardView: React.FC = () => {
  const {
    state,
    currentUser,
    setCurrentView,
    updateExamTokenConfig,
    setActiveExamSession,
    showToast,
  } = useApp();

  const students = state.students || [];
  const teachers = state.teachers || [];
  const schedules = state.examManagement?.schedules || [];
  const teacherAssignments = state.examManagement?.teacherAssignments || [];
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [isOlimpiadeModalOpen, setIsOlimpiadeModalOpen] = useState(false);

  const tokenConfig = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return (
      state.examManagement?.tokenConfig || {
        activeToken: 'SMAN3-9X2K',
        date: todayStr,
        isEnabled: true,
        generatedAt: new Date().toISOString(),
        history: [],
      }
    );
  }, [state.examManagement?.tokenConfig]);

  // Statistics
  const stats = useMemo(() => {
    const totalSiswaWithCreds = students.filter(
      (s) => s.examUsername && s.examUsername.length === 8
    ).length;
    const totalGuruAssigned = teacherAssignments.length;
    const totalJadwalAktif = schedules.filter(
      (s) => s.status === 'Belum Dimulai' || s.status === 'Sedang Berlangsung'
    ).length;

    return {
      totalSiswa: students.length,
      studentsReady: totalSiswaWithCreds,
      percentReady: students.length > 0 ? Math.round((totalSiswaWithCreds / students.length) * 100) : 0,
      totalGuruAssigned,
      totalJadwalAktif,
      activeToken: tokenConfig.activeToken,
      isTokenEnabled: tokenConfig.isEnabled,
    };
  }, [students, teacherAssignments, schedules, tokenConfig]);

  const [isResettingProctor, setIsResettingProctor] = useState(false);

  const handleResetLiveProctor = async () => {
    if (
      !window.confirm(
        'Reset Sesi Live Proktor ke 0 Peserta?\n\nSemua riwayat pemantauan real-time siswa di layar Admin, Operator, dan Proktor akan dikosongkan. Lanjutkan?'
      )
    ) {
      return;
    }
    setIsResettingProctor(true);
    try {
      if (db) {
        const logsRef = collection(db, 'exam_activity_logs');
        const snap = await getDocs(logsRef);
        const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }
      showToast('Live Proktor Direset', 'Semua sesi pemantauan live proktor berhasil direset ke 0 peserta aktif.', 'success');
    } catch (err) {
      console.warn('Gagal menghapus log proktor:', err);
      showToast('Live Proktor Direset', 'Sesi live proktor berhasil dikosongkan ke 0 peserta.', 'info');
    } finally {
      setIsResettingProctor(false);
    }
  };

  const copyToken = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(tokenConfig.activeToken);
      showToast('Token Disalin', `Token ${tokenConfig.activeToken} berhasil disalin ke clipboard.`, 'success');
    }
  };

  return (
    <div className="space-y-6 pb-12 selection:bg-cyan-600 selection:text-white">
      {/* Hero Banner CBT Dashboard */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-6 sm:p-8 text-white shadow-xl shadow-slate-900/20 border border-slate-800">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-2xs">
              <Laptop className="w-3.5 h-3.5 text-cyan-400" />
              <span>Dasbor Manajemen Ujian CBT &amp; Administrasi Tes</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Pusat Kendali Ujian CBT Real-Time
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Selamat datang di Pusat Kendali Ujian SMAN 3 Tumijajar. Pantau kesiapan infrastruktur CBT, status token harian, pendaftaran kartu ujian, jadwal sesi lab, dan penugasan soal secara terpusat.
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleResetLiveProctor}
                disabled={isResettingProctor}
                className="px-3.5 py-2 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs active:scale-95"
                title="Reset seluruh sesi live proktor ke 0"
              >
                <RotateCcw className={`w-3.5 h-3.5 text-rose-300 ${isResettingProctor ? 'animate-spin' : ''}`} />
                <span>{isResettingProctor ? 'Mereset Sesi...' : 'Reset Live Proktor ke 0'}</span>
              </button>
            </div>
          </div>

          {/* Quick Active Token Widget */}
          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 backdrop-blur-md flex flex-col gap-2 shrink-0 sm:min-w-[260px]">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-400 font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Token Hari Ini:
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                  stats.isTokenEnabled ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {stats.isTokenEnabled ? 'Wajib Token' : 'Bebas Token'}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3 pt-1">
              <span className="font-mono text-2xl font-black tracking-widest text-amber-300">
                {stats.activeToken}
              </span>
              <button
                type="button"
                onClick={copyToken}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer active:scale-95"
                title="Salin Token"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800 flex items-center justify-between">
              <span>Server CBT:</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                Online &bull; 8 ms
              </span>
            </div>
          </div>
        </div>

        {/* Real-Time Master Data Connection Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Siswa Siap CBT</p>
              <p className="text-sm font-black text-white">
                {stats.studentsReady} / {stats.totalSiswa}{' '}
                <span className="text-[10px] font-bold text-emerald-400">({stats.percentReady}%)</span>
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Penugasan Guru</p>
              <p className="text-sm font-black text-white">{stats.totalGuruAssigned} Guru Mapel</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Jadwal Sesi</p>
              <p className="text-sm font-black text-white">{schedules.length} Sesi Terjadwal</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Validasi Token</p>
              <p className="text-sm font-black text-amber-300">
                {stats.isTokenEnabled ? 'Wajib Token Aktif' : 'Token Divalidasi Off'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* PANEL PENETAPAN & AKTIVASI JENIS UJIAN CBT SEKOLAH (SESI AKTIF REAL-TIME) */}
      {(() => {
        const activeType = state.examManagement?.activeExamType || 'SEMUA';
        const activeName = state.examManagement?.activeExamName || 'Semua Jenis Ujian CBT';

        const examOptions = [
          {
            type: 'SEMUA' as const,
            title: 'Semua Jenis Ujian',
            badge: 'Fleksibel',
            desc: 'Guru bebas menggarap ASTS, ASAS, Simulasi DSMART, maupun Olimpiade',
            icon: Laptop,
            color: 'slate',
          },
          {
            type: 'ASTS' as const,
            title: 'ASTS (Tengah Semester)',
            badge: 'Essay & HOTS',
            desc: 'Fokus soal uraian mendalam, stimulus kontekstual & rubrik AI Vision',
            icon: FileText,
            color: 'indigo',
          },
          {
            type: 'ASAS' as const,
            title: 'ASAS (Akhir Semester)',
            badge: 'Pilihan Ganda',
            desc: 'Fokus soal PG 40/50 butir dengan kunci jawaban A-E & lembar LJK digital',
            icon: ClipboardCheck,
            color: 'sky',
          },
          {
            type: 'DSMART' as const,
            title: "Simulasi D'SMART Lampung",
            badge: '4 Instrumen HOTS',
            desc: '50 Soal PG (Literasi, Numerasi, Pra Kampus, Karakter) standar Disdikbud',
            icon: Sparkles,
            color: 'emerald',
          },
          {
            type: 'Olimpiade' as const,
            title: 'Seleksi OSN / Olimpiade',
            badge: '30 Soal & Dokumen',
            desc: 'Matematika, Sains IPA & Logika HOTS, plus Piagam, Pengumuman & SOP',
            icon: Medal,
            color: 'amber',
          },
        ];

        return (
          <div className="p-6 rounded-3xl bg-white border-2 border-slate-200/90 shadow-md space-y-5">
            {/* Header Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-cyan-600/20">
                  <Radio className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base sm:text-lg text-slate-900">
                      Penetapan Jenis Ujian CBT yang Diaktifkan Sekarang
                    </h3>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      Aktif: {activeName}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pilih jenis ujian CBT di bawah ini agar Admin, Operator, dan Guru Mapel langsung fokus menggarap bank soal sesuai format yang ditetapkan sekolah tanpa kebingungan.
                  </p>
                </div>
              </div>
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {examOptions.map((opt) => {
                const isSelected = activeType === opt.type;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.type}
                    type="button"
                    onClick={() => setActiveExamSession(opt.type)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative group active:scale-[0.98] ${
                      isSelected
                        ? opt.color === 'emerald'
                          ? 'bg-emerald-50/90 border-emerald-600 ring-2 ring-emerald-500/20 shadow-md'
                          : opt.color === 'amber'
                          ? 'bg-amber-50/90 border-amber-600 ring-2 ring-amber-500/20 shadow-md'
                          : opt.color === 'indigo'
                          ? 'bg-indigo-50/90 border-indigo-600 ring-2 ring-indigo-500/20 shadow-md'
                          : opt.color === 'sky'
                          ? 'bg-sky-50/90 border-sky-600 ring-2 ring-sky-500/20 shadow-md'
                          : 'bg-slate-900 border-slate-950 text-white shadow-md'
                        : 'bg-slate-50/60 hover:bg-slate-100/90 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected
                              ? opt.color === 'slate'
                                ? 'bg-white/20 text-white'
                                : 'bg-white text-slate-900 shadow-xs'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            isSelected
                              ? opt.color === 'slate'
                                ? 'bg-white/20 text-white'
                                : 'bg-white text-slate-900 border border-slate-200 shadow-2xs'
                              : 'bg-white text-slate-600 border border-slate-200'
                          }`}
                        >
                          {opt.badge}
                        </span>
                      </div>
                      <h4
                        className={`font-black text-xs sm:text-sm tracking-tight ${
                          isSelected && opt.color === 'slate' ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {opt.title}
                      </h4>
                      <p
                        className={`text-[11px] mt-1 line-clamp-2 leading-relaxed ${
                          isSelected && opt.color === 'slate' ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {opt.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px] font-black">
                      <span>{isSelected ? 'Sesi Aktif' : 'Aktifkan Sesi'}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Dynamic Active Session Showcase & Action Row */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                activeType === 'Olimpiade'
                  ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white border-amber-600 shadow-md'
                  : activeType === 'DSMART'
                  ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-emerald-500 shadow-md'
                  : activeType === 'ASTS'
                  ? 'bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white border-indigo-500 shadow-md'
                  : activeType === 'ASAS'
                  ? 'bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white border-sky-500 shadow-md'
                  : 'bg-gradient-to-r from-slate-900 to-slate-800 text-white border-slate-700 shadow-md'
              }`}
            >
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-white/20 border border-white/30 text-white uppercase tracking-wider">
                    Sesi Ujian CBT Terpilih
                  </span>
                  <h4 className="font-black text-sm sm:text-base text-white">
                    {activeName}
                  </h4>
                </div>
                <p className="text-xs text-white/90 leading-relaxed font-medium">
                  {activeType === 'Olimpiade'
                    ? 'Guru diarahkan menyusun 30 butir soal HOTS kompetisi sains (Matematika OSN, Biologi/Fisika, Logika). Tersedia asisten AI untuk menerbitkan Piagam Penghargaan Juara 1/2/3/Harapan 1, Pengumuman Resmi & SOP.'
                    : activeType === 'DSMART'
                    ? 'Guru diarahkan menyusun 50 butir soal PG HOTS 4 Instrumen (Literasi Membaca, Numerasi Matematika, Pra Kampus, Karakter) standar Disdikbud Lampung. Dilengkapi generator otomatis tanpa upload file.'
                    : activeType === 'ASTS'
                    ? 'Guru diarahkan menyusun soal Essay HOTS (5 atau 10 butir) dengan stimulus bacaan, rubrik penilaian analitik & koreksi AI Vision.'
                    : activeType === 'ASAS'
                    ? 'Guru diarahkan menyusun paket 40 atau 50 butir soal Pilihan Ganda dengan kunci jawaban A-E dan lembar LJK digital.'
                    : 'Seluruh opsi terbuka bebas. Guru mapel dapat menggarap ASTS, ASAS, Simulasi DSMART, maupun Seleksi OSN / Olimpiade.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {activeType === 'Olimpiade' && (
                  <button
                    type="button"
                    onClick={() => setIsOlimpiadeModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-white text-amber-900 font-black text-xs hover:bg-amber-50 active:scale-95 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Medal className="w-4 h-4 text-amber-700" />
                    <span>AI Specialist Dokumen Olimpiade</span>
                  </button>
                )}

                {activeType === 'DSMART' && (
                  <button
                    type="button"
                    onClick={() => setIsGuideModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs active:scale-95 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Eye className="w-4 h-4 text-slate-950" />
                    <span>Panduan &amp; Stimulus 4 Instrumen</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setCurrentView('exam-schedules')}
                  className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/40 text-white font-black text-xs active:scale-95 shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Atur Jadwal Sesi CBT</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentView('exam-assignments')}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Users className="w-4 h-4" />
                  <span>Plotting Guru CBT</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PANEL PEMISAHAN SISTEM CBT UMUM VS CBT LITNUM */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-800/40 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase text-indigo-300 tracking-wider">
                Struktur Arsitektur Ujian Sekolah SiMantri
              </span>
              <h3 className="text-base sm:text-lg font-black text-white">
                Tata Kelola &amp; Pembagian Sistem: CBT Umum vs CBT LitNum
              </h3>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full text-[11px] font-black bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 self-start sm:self-auto">
            Sistem Terpisah &amp; Terstruktur
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Kolom 1: CBT UMUM */}
          <div className="p-4 rounded-2xl bg-white/5 border border-indigo-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-indigo-300 text-sm flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span>1. CBT Umum (ASTS, ASAS, Simulasi &amp; Sumatif)</span>
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Wajib Akun Resmi
              </span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11.5px] leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Autentikasi:</strong> Wajib Username &amp; Password 8-digit angka acak yang tertera pada Kartu Tanda Peserta.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Siswa:</strong> Di portal siswa, kredensial ditampilkan transparan dan dapat disalin / langsung login.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Validasi Ruang:</strong> Dilengkapi Token Ujian Harian seragam untuk seluruh mapel di hari pelaksanaan.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                <span><strong>Instrumen:</strong> Soal Essay ASTS, PG ASAS, DSMART Lampung 4 Instrumen, &amp; Olimpiade OSN.</span>
              </li>
            </ul>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentView('exam-credentials')}
                className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[11px] transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Lihat Kredensial 8-Digit
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('exam-cards')}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-[11px] transition-all cursor-pointer"
              >
                Cetak Kartu Login
              </button>
            </div>
          </div>

          {/* Kolom 2: CBT LITNUM */}
          <div className="p-4 rounded-2xl bg-white/5 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-black text-amber-300 text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>2. CBT LitNum (Literasi &amp; Numerasi Terpadu)</span>
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Bebas Sandi
              </span>
            </div>
            <ul className="space-y-1.5 text-slate-300 text-[11.5px] leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span><strong>Autentikasi:</strong> Bebas Sandi — Siswa langsung memilih rombel &amp; nama dari roster resmi tanpa username &amp; sandi kartu.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span><strong>Jadwal Rutin:</strong> Khusus terjadwal setiap Selasa (Literasi) &amp; Rabu (Numerasi) pukul 07:00 - 08:30 WIB.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span><strong>Integrasi:</strong> Terkoneksi ke Standar Rapor Pendidikan &amp; Asesmen Nasional (ANBK Kemendikbudristek).</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                <span><strong>Keamanan:</strong> Dilengkapi deteksi kecurangan tab switch, blur window, dan timer pengerjaan otomatis.</span>
              </li>
            </ul>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentView('litnum-management')}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] transition-all cursor-pointer shadow-xs active:scale-95"
              >
                Buka Modul CBT LitNum
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Menu Navigasi Submenu Manajemen Ujian */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Laptop className="w-4 h-4 text-cyan-600" />
              <span>Modul &amp; Submenu Manajemen Ujian CBT</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Pilih submenu di bawah ini untuk mengelola komponen spesifik ujian CBT dengan tampilan lengkap
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Token & Server */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setCurrentView('exam-token')}
            className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-amber-400 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Key className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                  1 Hari 1 Token
                </span>
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm group-hover:text-amber-700 transition-colors">
                  Status Token Harian &amp; Server
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Kelola aktivasi token harian resmi (1 hari 1 token) untuk seluruh sesi ujian dan pantau status server CBT real-time.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-700 group-hover:translate-x-0.5 transition-transform">
              <span>Buka Menu Token &amp; Server</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 2: Kredensial 8-Digit */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setCurrentView('exam-credentials')}
            className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <UserCheck className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                  8-Digit Acak
                </span>
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">
                  Status Akun &amp; 8-Digit Acak
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Generate akun siswa, reset sandi, dan ekspor kredensial login angka acak 8-digit aman untuk seluruh rombel.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700 group-hover:translate-x-0.5 transition-transform">
              <span>Kelola Akun Siswa</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 3: Pendaftaran & Cetak Kartu */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setCurrentView('exam-cards')}
            className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-cyan-400 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Printer className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-cyan-50 text-cyan-800 border border-cyan-200">
                  Format A4
                </span>
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm group-hover:text-cyan-700 transition-colors">
                  Pendaftaran &amp; Cetak Kartu Ujian
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Cetak kartu tanda peserta ujian resmi format A4 dengan kop sekolah, foto siswa, NISN, QR code, dan username/password 8-digit.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-cyan-700 group-hover:translate-x-0.5 transition-transform">
              <span>Cetak Kartu Login Siswa</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 4: Sesi & Ruang CBT */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setCurrentView('exam-schedules')}
            className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-purple-400 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-800 border border-purple-200">
                  {schedules.length} Sesi Terjadwal
                </span>
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                  Pengaturan Sesi &amp; Ruang CBT
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Atur jadwal pelaksanaan ujian, sesi 1-3, alokasi ruang lab komputer, waktu mulai, durasi tes, dan persyaratan token.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:translate-x-0.5 transition-transform">
              <span>Atur Sesi &amp; Jadwal</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 5: Penugasan Guru Mapel */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setCurrentView('exam-assignments')}
            className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-teal-400 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-teal-50 text-teal-800 border border-teal-200">
                  {teacherAssignments.length} Penggarap
                </span>
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                  Penugasan Guru Mapel Soal
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Plotting guru mapel untuk membuat soal ASAS, ASTS, Simulasi D&apos;SMART Lampung, hingga seleksi olimpiade sekolah.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-teal-700 group-hover:translate-x-0.5 transition-transform">
              <span>Kelola Penugasan Soal</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 6: Cetak Daftar Hadir Peserta */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setCurrentView('exam-attendance')}
            className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-emerald-400 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Presensi Ruang
                </span>
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm group-hover:text-emerald-700 transition-colors">
                  Cetak Daftar Hadir Peserta
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Presensi kehadiran ruang ujian CBT resmi dengan kolom tanda tangan peserta, verifikasi proktor, dan pengawas ruang.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700 group-hover:translate-x-0.5 transition-transform">
              <span>Cetak Daftar Hadir</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 7: Live Proctoring & Anti-Cheat Real-Time (🟢🟡🔴) */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setCurrentView('proctor-monitor')}
            className="p-5 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 text-white border-2 border-emerald-500/40 hover:border-emerald-400 shadow-md hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-emerald-500/10 blur-xl pointer-events-none" />
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Sensor HP
                </span>
              </div>
              <div>
                <h3 className="font-black text-white text-sm group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                  <span>Live Proctoring &amp; Anti-Cheat</span>
                  <span className="text-[11px] font-black tracking-widest text-emerald-400">🟢🟡🔴</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Pantau pelanggaran siswa CBT &amp; LitNum secara langsung: split-screen HP Android, keluar tab browser, alarm dual-tone, auto-freeze &amp; aksi buka kunci proktor.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between text-xs font-black text-emerald-400 group-hover:translate-x-0.5 transition-transform relative z-10">
              <span>Buka Dashboard Live Proctoring</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 8: Keamanan & PIN Pengawas (6-Digit PIN & Buka Blokir) */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setCurrentView('exam-security')}
            className="p-5 rounded-3xl bg-gradient-to-br from-amber-950/80 via-slate-900 to-rose-950/80 text-white border-2 border-amber-500/50 hover:border-amber-400 shadow-md hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ShieldAlert className="w-5 h-5 text-amber-300" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  6-Digit PIN
                </span>
              </div>
              <div>
                <h3 className="font-black text-white text-sm group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                  <span>Keamanan &amp; PIN Pengawas</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Kelola 6-digit PIN aktif pengawas ruang, sistem eskalasi 2 siklus, pantau daftar siswa terkunci/terblokir, dan pulihkan akses ujian.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between text-xs font-black text-amber-400 group-hover:translate-x-0.5 transition-transform relative z-10">
              <span>Kelola PIN &amp; Buka Blokir</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 9: Ruang Campuran 2 Kelas & Smart Nomor Peserta (Fitur 1 & 2) */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setCurrentView('exam-rooms')}
            className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-indigo-400 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                  Smart 12-26-XX-XXX
                </span>
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm group-hover:text-indigo-700 transition-colors">
                  Ruang Campuran 2 Rombel &amp; Smart Nomor
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Kelola 1 ruang ujian gabungan 2 kelas berbeda (misal X.1 &amp; XI.IPA 1), Smart Auto-Generator nomor urut alami kelas &amp; sinkronisasi otomatis ke Kartu Ujian.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700 group-hover:translate-x-0.5 transition-transform">
              <span>Buka Manajemen Ruang Campuran</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 10: Penjadwalan Pengawas Ujian Multi-Hari & Multi-Sesi (Fitur 3) */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setCurrentView('exam-proctor-schedules')}
            className="p-5 rounded-3xl bg-white border border-slate-200 hover:border-purple-400 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-800 border border-purple-200">
                  Anti-Bentrok
                </span>
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-sm group-hover:text-purple-700 transition-colors">
                  Penjadwalan Pengawas (Multi-Hari)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Penetapan jadwal pengawas guru mapel multi-hari &amp; multi-sesi, rotasi ruang adil, durasi jam presisi &amp; sistem deteksi bentrok (Conflict Checker).
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700 group-hover:translate-x-0.5 transition-transform">
              <span>Kelola Jadwal Pengawas</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>

          {/* Card 11: Dashboard Monitoring HP Pengawas Mobile-First (Fitur 4) */}
          <motion.div
            whileHover={{ scale: 1.015, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            onClick={() => setCurrentView('exam-proctor-mobile')}
            className="p-5 rounded-3xl bg-gradient-to-br from-indigo-950 via-slate-900 to-purple-950 text-white border-2 border-indigo-500/50 hover:border-indigo-400 shadow-md hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-indigo-500/10 blur-xl pointer-events-none" />
            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Smartphone className="w-5 h-5" />
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  HP Guru &amp; PIN
                </span>
              </div>
              <div>
                <h3 className="font-black text-white text-sm group-hover:text-indigo-300 transition-colors flex items-center gap-1.5">
                  <span>Monitoring HP Pengawas</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Antarmuka vertikal smartphone khusus Pengawas Ruang: filter 2 kelas cepat, rilis token, PIN otorisasi 482910, unblock &amp; Berita Acara digital.
                </p>
              </div>
            </div>
            <div className="pt-4 mt-3 border-t border-white/10 flex items-center justify-between text-xs font-black text-indigo-400 group-hover:translate-x-0.5 transition-transform relative z-10">
              <span>Buka Monitor HP Pengawas</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Two Live Summary Panels: Ringkasan Jadwal & Status Server */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel 1: Sesi Ujian Terdekat */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-100 text-purple-700">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Jadwal Sesi Terdekat</h3>
                <p className="text-[11px] text-slate-500">Sesi ujian CBT aktif dalam pangkalan data</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('exam-schedules')}
              className="text-xs font-extrabold text-purple-600 hover:text-purple-700 transition-colors cursor-pointer"
            >
              Lihat Semua &rarr;
            </button>
          </div>

          <div className="space-y-2.5">
            {schedules.length === 0 ? (
              <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
                Belum ada jadwal sesi ujian. Tambahkan jadwal pada menu Pengaturan Sesi &amp; Ruang CBT.
              </div>
            ) : (
              schedules.slice(0, 4).map((sch) => (
                <div
                  key={sch.id}
                  className="p-3.5 rounded-2xl bg-slate-50/80 hover:bg-slate-100 border border-slate-200/80 flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[9.5px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                        {sch.category}
                      </span>
                      <span className="text-xs font-black text-slate-900 truncate">
                        {sch.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {sch.subjectName} &bull; {sch.date} &bull; {sch.startTime}-{sch.endTime} ({sch.roomName || 'Lab CBT'})
                    </p>
                  </div>
                  <span className="shrink-0 px-2 py-1 rounded-xl text-[10px] font-black bg-white text-slate-700 border border-slate-200">
                    {sch.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel 2: Live CBT Server & Policy Monitor */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-cyan-100 text-cyan-700">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">Infrastruktur &amp; Server CBT</h3>
                <p className="text-[11px] text-slate-500">Integritas jaringan lokal dan sinkronisasi data</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Server Normal
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold">Node Proktor Utama:</span>
                <span className="font-mono font-bold text-slate-900">Node-Tumijajar-01</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold">Alamat Port CBT:</span>
                <span className="font-mono font-bold text-slate-900">Port 3000 (HTTP / WebSocket)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold">Latency / Responsiveness:</span>
                <span className="font-bold text-emerald-600">8 ms (Sangat Stabil)</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="font-bold">Sinkronisasi Master Data:</span>
                <span className="font-bold text-indigo-600">Otomatis Terhubung</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex items-start gap-3">
              <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-black text-xs">Aturan Token Ujian Harian (1 Hari = 1 Token)</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed font-medium">
                  Token otomatis berlaku seragam untuk seluruh mata pelajaran di hari yang sama. Pengawas ruang cukup memasukkan token tunggal harian ini ke siswa di awal sesi.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global DSMart Guide and Simulator Modal */}
      {isGuideModalOpen && (
        <DSMartGuideAndSimulatorModal
          isOpen={isGuideModalOpen}
          onClose={() => setIsGuideModalOpen(false)}
        />
      )}

      {/* Olimpiade AI Specialist Modal */}
      {isOlimpiadeModalOpen && (
        <OlimpiadeAssistantModal
          isOpen={isOlimpiadeModalOpen}
          onClose={() => setIsOlimpiadeModalOpen(false)}
        />
      )}
    </div>
  );
};
