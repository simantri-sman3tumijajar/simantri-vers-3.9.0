import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TeacherExamAssignment } from '../types';
import {
  Laptop,
  GraduationCap,
  Sparkles,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  Send,
  Zap,
  BarChart3,
  ExternalLink,
  Lock,
  Radio,
} from 'lucide-react';
import { CreateAssessmentModal } from './CreateAssessmentModal';
import { DSMartGuideAndSimulatorModal } from './DSMartGuideAndSimulatorModal';

interface TeacherCBTExamBoxProps {
  teacherId?: string;
  selectedTeacherId?: string;
  onSelectTeacher?: (teacherId: string) => void;
  className?: string;
  compact?: boolean;
}

export const TeacherCBTExamBox: React.FC<TeacherCBTExamBoxProps> = ({
  teacherId,
  selectedTeacherId,
  onSelectTeacher,
  className = '',
  compact = false,
}) => {
  const {
    state,
    currentUser,
    setCurrentView,
    setSelectedModule,
    saveTeacherExamAssignment,
    showToast,
  } = useApp();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGuideModalOpen, setIsGuideModalOpen] = useState(false);
  const [activePreFill, setActivePreFill] = useState<{
    jenis?: 'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade';
    mataPelajaran?: string;
    targetClasses?: string[];
    mcqCount?: number;
    assignmentId?: string;
  } | null>(null);

  // Target teacher resolution: prioritize selectedTeacherId -> teacherId -> currentUser (supports multi-role Admin/Operator who also teaches)
  const effectiveTeacherId = useMemo(() => {
    if (selectedTeacherId) return selectedTeacherId;
    if (teacherId) return teacherId;
    if (currentUser?.id) return currentUser.id;
    return state.teachers?.[0]?.id || '';
  }, [selectedTeacherId, teacherId, currentUser, state.teachers]);

  const effectiveTeacher = useMemo(() => {
    return state.teachers.find((t) => t.id === effectiveTeacherId) || currentUser;
  }, [state.teachers, effectiveTeacherId, currentUser]);

  // All assignments linked to this teacher account
  const myAssignments = useMemo(() => {
    const list = state.examManagement?.teacherAssignments || [];
    if (!effectiveTeacher) return [];

    return list.filter((a) => {
      // Match by teacher ID or exact name match
      const idMatch = a.teacherId && (a.teacherId === effectiveTeacher.id || a.teacherId === effectiveTeacherId);
      const nameMatch = a.teacherName && effectiveTeacher.nama && 
        a.teacherName.toLowerCase().trim() === effectiveTeacher.nama.toLowerCase().trim();
      return idMatch || nameMatch;
    });
  }, [state.examManagement?.teacherAssignments, effectiveTeacher, effectiveTeacherId]);

  // Calculate actual questions created by this teacher for each assignment (strictly real-time, pure 0 initial state, no mock data)
  const assignmentsWithLiveProgress = useMemo(() => {
    const teacherAssessments = state.assessments.filter((asm) => {
      return (
        asm.guruId === effectiveTeacher?.id ||
        (effectiveTeacher?.nama && (asm.guruPengampu || '').toLowerCase().trim() === effectiveTeacher.nama.toLowerCase().trim())
      );
    });

    return myAssignments.map((assign) => {
      // Priority 1: Match by direct assignmentId
      let matched = teacherAssessments.filter((asm) => asm.assignmentId && asm.assignmentId === assign.id);

      // Priority 2: Match by exact category, subject name, academic period, strictly created at or after the assignment was given
      if (matched.length === 0) {
        matched = teacherAssessments.filter((asm) => {
          const isCategoryMatch = 
            (assign.category === "Simulasi D'SMART Lampung" && asm.jenis === 'DSMART') ||
            ((assign.category === "Seleksi OSN/Olimpiade" || assign.category === "Olimpiade Sekolah") && asm.jenis === 'Olimpiade') ||
            (assign.category === 'ASTS' && asm.jenis === 'ASTS' && (asm.mataPelajaran || '').toLowerCase().trim() === (assign.subjectName || '').toLowerCase().trim()) ||
            (assign.category === 'ASAS' && asm.jenis === 'ASAS' && (asm.mataPelajaran || '').toLowerCase().trim() === (assign.subjectName || '').toLowerCase().trim());

          if (!isCategoryMatch) return false;

          const periodMatch = asm.tahunAjaran === state.schoolInfo.tahunAjaranAktif && asm.semester === state.schoolInfo.semesterAktif;
          if (!periodMatch) return false;

          if (assign.createdAt && asm.createdAt) {
            const asmTime = new Date(asm.createdAt).getTime();
            const asgnTime = new Date(assign.createdAt).getTime();
            if (asmTime < asgnTime - 2000) return false;
          } else if (assign.createdAt && !asm.createdAt) {
            return false;
          }

          return true;
        });
      }

      // Calculate strictly from matched assessments. If no assessment created yet, count is strictly 0!
      const totalCrafted = matched.length > 0 
        ? matched.reduce((acc, curr) => {
            const mcq = curr.mcqQuestions?.length || 0;
            const essay = curr.essayRubrik?.length || 0;
            return acc + (curr.jenis === 'ASTS' ? essay : mcq);
          }, 0)
        : 0;

      const targetQ = assign.targetQuestions || (assign.category === "Simulasi D'SMART Lampung" ? 50 : assign.category.includes('Olimpiade') ? 30 : assign.category === 'ASTS' ? 10 : 40);
      const progressPercent = Math.min(100, Math.round((totalCrafted / targetQ) * 100));

      // Automated real-time status:
      // 1. Kondisi Kosong (0%): "Belum Digarap"
      // 2. Kondisi Sedang Menggarap (1% - 99%): "Sedang Digarap"
      // 3. Kondisi Selesai (100%): "Selesai Digarap"
      const autoStatus: 'Belum Digarap' | 'Sedang Digarap' | 'Selesai Digarap' = 
        progressPercent >= 100 
          ? 'Selesai Digarap' 
          : (progressPercent > 0 ? 'Sedang Digarap' : 'Belum Digarap');

      return {
        ...assign,
        liveQuestionsCount: totalCrafted,
        targetQuestions: targetQ,
        progressPercent,
        autoStatus,
      };
    });
  }, [myAssignments, state.assessments, effectiveTeacher, state.schoolInfo]);

  const handleStartCrafting = (assign: typeof assignmentsWithLiveProgress[0]) => {
    const isDSmart = assign.category === "Simulasi D'SMART Lampung";
    const isOlimpiade = assign.category === "Seleksi OSN/Olimpiade" || assign.category === "Olimpiade Sekolah";
    const jenis: 'ASTS' | 'ASAS' | 'DSMART' | 'Olimpiade' = isDSmart ? 'DSMART' : isOlimpiade ? 'Olimpiade' : (assign.category === 'ASTS' ? 'ASTS' : 'ASAS');
    
    setActivePreFill({
      jenis,
      mataPelajaran: isDSmart
        ? "Simulasi D'SMART Lampung (4 Instrumen Utama: Literasi, Numerasi, Pra Kampus, Karakter)"
        : isOlimpiade
        ? `Seleksi OSN / Olimpiade (${assign.subjectName})`
        : assign.subjectName,
      targetClasses: assign.targetClasses,
      mcqCount: isDSmart ? 50 : isOlimpiade ? 30 : assign.targetQuestions,
      assignmentId: assign.id,
    });

    setIsCreateModalOpen(true);
  };

  return (
    <>
      <div
        className={`rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 border border-cyan-500/30 shadow-xl relative overflow-hidden ${className}`}
      >
        {/* Glow ambient background effects */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
              <Laptop className="w-6 h-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg text-white tracking-tight leading-snug">
                  Manajemen Ujian Khusus Guru Mapel (CBT)
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-400/20 text-cyan-300 border border-cyan-400/40 shrink-0 whitespace-nowrap">
                  SMAN 3 TUMIJAJAR
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Ruang kerja terdedikasi perancangan naskah soal CBT &amp; otomatis tersinkronisasi ke Administrator secara real-time.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold shadow-xs whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Terkoneksi Real-Time</span>
            </span>

            <button
              type="button"
              onClick={() => setIsGuideModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
              title="Buka panduan resmi keamanan, kartu login, hasil akhir, dan daftar hadir F4 D'SMART Lampung"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Panduan &amp; Hasil D&apos;SMART</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePreFill(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Rancang Soal Baru</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="relative z-10 pt-4 space-y-4">
          {/* KONEKSI AKUN GURU AKTIF KE SISTEM CBT */}
          <div className="p-4 rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="relative shrink-0">
                <div className="w-11 h-11 rounded-full overflow-hidden border-2 border-cyan-400/50 bg-slate-800 flex items-center justify-center shadow-xs">
                  {effectiveTeacher?.fotoUrl ? (
                    <img
                      src={effectiveTeacher.fotoUrl}
                      alt={effectiveTeacher.nama}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <GraduationCap className="w-5 h-5 text-cyan-300" />
                  )}
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 border-2 border-slate-900 rounded-full" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-extrabold text-sm text-white truncate max-w-sm">
                    {effectiveTeacher?.nama || 'Akun Guru'}
                  </h4>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 shrink-0 whitespace-nowrap">
                    {effectiveTeacher?.nip ? `NIP: ${effectiveTeacher.nip}` : 'Akun Terverifikasi'}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap text-xs text-slate-300">
                  <span className="text-slate-400 text-xs shrink-0">Mapel Ampuan:</span>
                  {(effectiveTeacher?.mataPelajaran || ['Semua Mapel']).slice(0, 3).map((m, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-white/10 text-cyan-200 text-[10.5px] font-bold border border-white/10 whitespace-nowrap truncate max-w-[220px]"
                      title={m}
                    >
                      {m}
                    </span>
                  ))}
                  {(effectiveTeacher?.mataPelajaran || []).length > 3 && (
                    <span className="text-[10px] text-cyan-300/80 font-bold whitespace-nowrap">
                      +{(effectiveTeacher?.mataPelajaran || []).length - 3} mapel
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap shrink-0 self-stretch sm:self-auto justify-end">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Otomatis Terkoneksi ke CBT</span>
              </span>

              {state.teachers.length > 1 && (
                <select
                  value={effectiveTeacherId}
                  onChange={(e) => onSelectTeacher && onSelectTeacher(e.target.value)}
                  className="px-3 py-1.5 bg-slate-800/95 hover:bg-slate-800 border border-white/20 rounded-xl text-xs font-bold text-slate-200 focus:outline-hidden cursor-pointer max-w-[240px] truncate"
                  title="Ganti tinjauan akun guru mapel"
                >
                  {state.teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* BANNER SESI AKTIF CBT DARI OPERATOR / ADMIN */}
          {state.examManagement?.activeExamType && state.examManagement.activeExamType !== 'SEMUA' && (
            <div
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                state.examManagement.activeExamType === 'Olimpiade'
                  ? 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-slate-900 border-amber-500/50 text-amber-200'
                  : state.examManagement.activeExamType === 'DSMART'
                  ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-slate-900 border-emerald-500/50 text-emerald-200'
                  : state.examManagement.activeExamType === 'ASTS'
                  ? 'bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-slate-900 border-indigo-500/50 text-indigo-200'
                  : 'bg-gradient-to-r from-sky-500/20 via-blue-500/20 to-slate-900 border-sky-500/50 text-sky-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Radio className="w-5 h-5 text-white animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white">
                      Target Ujian CBT Sekolah Aktif
                    </span>
                    <span className="font-black text-sm text-white">
                      {state.examManagement.activeExamName || state.examManagement.activeExamType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Operator/Admin menetapkan sesi ini sebagai prioritas penggarapan. Klik tombol di samping untuk mulai menyusun bank soal sesuai format sesi aktif secara langsung.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  const active = state.examManagement?.activeExamType;
                  if (active === 'Olimpiade') {
                    setActivePreFill({
                      jenis: 'Olimpiade',
                      mataPelajaran: effectiveTeacher?.mataPelajaran?.[0]
                        ? `Seleksi OSN / Olimpiade (${effectiveTeacher.mataPelajaran[0]})`
                        : 'Seleksi OSN / Olimpiade Sains',
                      mcqCount: 30,
                    });
                  } else if (active === 'DSMART') {
                    setActivePreFill({
                      jenis: 'DSMART',
                      mataPelajaran:
                        "Simulasi D'SMART Lampung (4 Instrumen Utama: Literasi, Numerasi, Pra Kampus, Karakter)",
                      mcqCount: 50,
                    });
                  } else if (active === 'ASTS') {
                    setActivePreFill({
                      jenis: 'ASTS',
                      mataPelajaran: effectiveTeacher?.mataPelajaran?.[0] || 'Mata Pelajaran ASTS',
                    });
                  } else if (active === 'ASAS') {
                    setActivePreFill({
                      jenis: 'ASAS',
                      mataPelajaran: effectiveTeacher?.mataPelajaran?.[0] || 'Mata Pelajaran ASAS',
                      mcqCount: 40,
                    });
                  }
                  setIsCreateModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer shrink-0 active:scale-95 flex items-center gap-1.5"
              >
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Garap Soal {state.examManagement.activeExamType}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Status Alert if Assignments exist */}
          {assignmentsWithLiveProgress.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  Mandat &amp; Penugasan Aktif dari Admin ({assignmentsWithLiveProgress.length} Tugas)
                </span>
                <span className="text-[11px] text-slate-400">
                  Guru: <strong className="text-white">{effectiveTeacher?.nama}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {assignmentsWithLiveProgress.map((assign) => {
                  const isDSmart = assign.category === "Simulasi D'SMART Lampung";
                  const isFinished = assign.status === 'Selesai Digarap' || assign.status === 'Telah Diverifikasi';

                  return (
                    <div
                      key={assign.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                        isDSmart
                          ? 'bg-gradient-to-br from-emerald-950/60 to-slate-900 border-emerald-500/40 hover:border-emerald-400'
                          : 'bg-white/5 border-white/10 hover:border-cyan-500/40'
                      }`}
                    >
                      <div>
                        {/* Top row badge and status */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[10.5px] font-black uppercase tracking-wider ${
                              isDSmart
                                ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/50'
                                : assign.category === 'ASAS'
                                ? 'bg-sky-500/30 text-sky-300 border border-sky-400/50'
                                : 'bg-indigo-500/30 text-indigo-300 border border-indigo-400/50'
                            }`}
                          >
                            {assign.category}
                          </span>

                          <div className="flex items-center gap-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                                assign.autoStatus === 'Selesai Digarap'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                  : assign.autoStatus === 'Sedang Digarap'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                                  : 'bg-slate-700/80 text-slate-300 border border-slate-600'
                              }`}
                            >
                              {assign.autoStatus === 'Selesai Digarap' ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : assign.autoStatus === 'Sedang Digarap' ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                              ) : (
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              )}
                              <span>{assign.autoStatus}</span>
                            </span>
                          </div>
                        </div>

                        {/* Subject Title */}
                        <h4 className="font-black text-sm text-white line-clamp-1">
                          {isDSmart ? "Simulasi D'SMART Lampung (4 Instrumen)" : assign.subjectName}
                        </h4>

                        {/* Special notification for D'SMART Lampung */}
                        {isDSmart && (
                          <div className="mt-1.5 p-2 rounded-xl bg-emerald-900/40 border border-emerald-500/30 text-[10.5px] text-emerald-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                            <span>
                              <strong>Otomatis 4 Instrumen:</strong> Literasi (15), Numerasi (15), Pra Kampus (10), Karakter (10). Mapel terkunci otomatis.
                            </span>
                          </div>
                        )}

                        {/* Meta info */}
                        <div className="mt-2 space-y-1 text-xs text-slate-300">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Target Kelas:</span>
                            <span className="font-bold text-slate-200">
                              {assign.targetClasses?.join(', ') || 'Semua Kelas'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Tenggat Waktu:</span>
                            <span className="font-bold text-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {assign.dueDate || 'Sesuai Jadwal CBT'}
                            </span>
                          </div>

                          {assign.notes && (
                            <p className="text-[10.5px] text-slate-400 italic bg-white/5 p-1.5 rounded-lg border border-white/5 mt-1">
                              Catatan Admin: &ldquo;{assign.notes}&rdquo;
                            </p>
                          )}
                        </div>

                        {/* Live progress bar */}
                        <div className="mt-3 pt-2.5 border-t border-white/10">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="text-slate-400">Progres Bank Soal:</span>
                            <span className="font-extrabold text-cyan-300">
                              {assign.liveQuestionsCount} / {assign.targetQuestions} Soal ({assign.progressPercent}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 ${
                                assign.progressPercent >= 100
                                  ? 'bg-emerald-400'
                                  : isDSmart
                                  ? 'bg-emerald-500'
                                  : 'bg-cyan-500'
                              }`}
                              style={{ width: `${Math.min(100, Math.max(assign.progressPercent > 0 ? 5 : 0, assign.progressPercent))}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Actions: Replaced manual status dropdown with automatic real-time tracker and dynamic button */}
                      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-400 font-medium">Status Tugas:</span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-black border transition-all ${
                              assign.autoStatus === 'Selesai Digarap'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 shadow-xs'
                                : assign.autoStatus === 'Sedang Digarap'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-xs'
                                : 'bg-slate-800/90 text-slate-300 border-slate-700 shadow-xs'
                            }`}
                          >
                            {assign.autoStatus === 'Selesai Digarap' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            ) : assign.autoStatus === 'Sedang Digarap' ? (
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-slate-400" />
                            )}
                            <span>{assign.autoStatus}</span>
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartCrafting(assign)}
                          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs transition-all active:scale-95 cursor-pointer shadow-md ${
                            assign.autoStatus === 'Selesai Digarap'
                              ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                              : isDSmart
                              ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950'
                              : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                          }`}
                        >
                          <span>
                            {assign.autoStatus === 'Selesai Digarap'
                              ? 'Periksa Naskah Soal'
                              : assign.liveQuestionsCount > 0
                              ? 'Lanjutkan Garap Soal'
                              : 'Mulai Garap Soal CBT'}
                          </span>
                          {assign.autoStatus === 'Selesai Digarap' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <ArrowRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Standby Card when no specific task assigned yet */
            <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs sm:text-sm text-white">
                    Akun Guru Siap Menggarap Soal CBT Mandiri
                  </h4>
                  <p className="text-[11.5px] text-slate-300 mt-0.5 leading-relaxed">
                    Belum ada tugas terjadwal khusus dari Admin. Anda tetap dapat langsung merancang bank soal CBT ASTS, ASAS, atau Simulasi D&apos;SMART Lampung kapan saja.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setActivePreFill({
                      jenis: 'DSMART',
                      mataPelajaran: "Simulasi D'SMART Lampung (4 Instrumen Utama: Literasi, Numerasi, Pra Kampus, Karakter)",
                      mcqCount: 50,
                    });
                    setIsCreateModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Garap D&apos;SMART Lampung</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActivePreFill({ jenis: 'ASAS', mcqCount: 40 });
                    setIsCreateModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 text-slate-950 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Buat Soal ASAS/ASTS</span>
                </button>
              </div>
            </div>
          )}

          {/* Quick Tools & Shortcuts Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
            <button
              type="button"
              onClick={() => {
                setActivePreFill({
                  jenis: 'DSMART',
                  mataPelajaran: "Simulasi D'SMART Lampung (4 Instrumen Utama: Literasi, Numerasi, Pra Kampus, Karakter)",
                  mcqCount: 50,
                });
                setIsCreateModalOpen(true);
              }}
              className="p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-emerald-300 font-black text-[11px] mb-0.5">
                <span>D&apos;SMART Lampung</span>
                <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-300">
                50 PG HOTS (Literasi, Numerasi, Pra Kampus &amp; Karakter)
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePreFill({ jenis: 'ASAS', mcqCount: 40 });
                setIsCreateModalOpen(true);
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-cyan-300 font-bold text-[11px] mb-0.5">
                <span>ASAS Pilihan Ganda</span>
                <BookOpen className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-300">
                Format 40-50 Soal PG CBT SMAN 3 Tumijajar
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePreFill({ jenis: 'ASTS' });
                setIsCreateModalOpen(true);
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-indigo-300 font-bold text-[11px] mb-0.5">
                <span>ASTS Soal Uraian</span>
                <FileText className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-300">
                10 Soal Essay &amp; Rubrik Kunci Jawaban Lengkap
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedModule('manajemen-ujian');
                setCurrentView('exam-token');
              }}
              className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-amber-300 font-bold text-[11px] mb-0.5">
                <span>Cek Token Ujian CBT</span>
                <Layers className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
              </div>
              <p className="text-[10px] text-slate-300">
                Token harian aktif &amp; status server ujian
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* Modal Rancang Soal CBT Pre-filled */}
      {isCreateModalOpen && (
        <CreateAssessmentModal
          onClose={() => {
            setIsCreateModalOpen(false);
            setActivePreFill(null);
          }}
          initialJenis={activePreFill?.jenis}
          initialMataPelajaran={activePreFill?.mataPelajaran}
          initialTargetClasses={activePreFill?.targetClasses}
          initialMcqCount={activePreFill?.mcqCount}
        />
      )}
      {/* Global DSMart Guide and Simulator Modal */}
      {isGuideModalOpen && (
        <DSMartGuideAndSimulatorModal
          isOpen={isGuideModalOpen}
          onClose={() => setIsGuideModalOpen(false)}
        />
      )}
    </>
  );
};
