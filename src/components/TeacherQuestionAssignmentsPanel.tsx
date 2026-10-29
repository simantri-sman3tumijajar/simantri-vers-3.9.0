import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TeacherExamAssignment } from '../types';
import {
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  FileQuestion,
  Layers,
  AlertTriangle,
  User,
  ShieldCheck,
  Search,
  Filter,
  Check,
  X,
  Edit2,
  Send,
  MessageSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TeacherQuestionAssignmentsPanelProps {
  onStartCrafting: (assignment: TeacherExamAssignment) => void;
  className?: string;
}

export const TeacherQuestionAssignmentsPanel: React.FC<TeacherQuestionAssignmentsPanelProps> = ({
  onStartCrafting,
  className = '',
}) => {
  const {
    state,
    currentUser,
    saveTeacherExamAssignment,
    deleteTeacherExamAssignment,
    showToast,
  } = useApp();

  const teacherAssignments = state.examManagement?.teacherAssignments || [];
  const teachers = state.teachers || [];
  const subjects = state.subjects || [];
  const classes = state.classes || [];

  const isAdminOrOperator = currentUser?.role === 'admin' || currentUser?.role === 'operator';

  // Multi-role teacher filter: by default show current user's tasks, or all if Admin chooses
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>(() => {
    return currentUser?.id || 'ALL';
  });

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Admin New Assignment Modal State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    teacherId: '',
    subjectName: '',
    category: 'ASAS' as TeacherExamAssignment['category'],
    targetClasses: [] as string[],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    targetQuestions: 40,
    notes: '',
  });

  // Revision Modal State
  const [revisionModalAssignment, setRevisionModalAssignment] = useState<TeacherExamAssignment | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  // Compute live progress purely from real stored assessments (Zero Mock Data)
  const assignmentsWithLiveProgress = useMemo(() => {
    return teacherAssignments.map((asgn) => {
      // Find assessments matching this assignment strictly
      let matched = (state.assessments || []).filter(
        (asm) => asm.assignmentId && asm.assignmentId === asgn.id
      );

      if (matched.length === 0) {
        matched = (state.assessments || []).filter((asm) => {
          const isCategoryMatch =
            (asgn.category === "Simulasi D'SMART Lampung" && asm.jenis === 'DSMART') ||
            ((asgn.category === 'Seleksi OSN/Olimpiade' || asgn.category === 'Olimpiade Sekolah') &&
              asm.jenis === 'Olimpiade') ||
            (asgn.category === 'ASTS' &&
              asm.jenis === 'ASTS' &&
              (asm.mataPelajaran || '').toLowerCase().trim() === (asgn.subjectName || '').toLowerCase().trim()) ||
            (asgn.category === 'ASAS' &&
              asm.jenis === 'ASAS' &&
              (asm.mataPelajaran || '').toLowerCase().trim() === (asgn.subjectName || '').toLowerCase().trim()) ||
            (asgn.category === 'ASAJ' &&
              (asm.jenis === ('ASAJ' as any) || (asm as any).isASAJ) &&
              (asm.mataPelajaran || '').toLowerCase().trim() === (asgn.subjectName || '').toLowerCase().trim());

          if (!isCategoryMatch) return false;

          const isTeacherMatch =
            asm.guruId === asgn.teacherId ||
            (asgn.teacherName &&
              (asm.guruPengampu || '').toLowerCase().trim() === asgn.teacherName.toLowerCase().trim());

          if (!isTeacherMatch) return false;

          if (asgn.createdAt && asm.createdAt) {
            const asmTime = new Date(asm.createdAt).getTime();
            const asgnTime = new Date(asgn.createdAt).getTime();
            if (asmTime < asgnTime - 2000) return false;
          } else if (asgn.createdAt && !asm.createdAt) {
            return false;
          }

          return true;
        });
      }

      // Pure dynamic calculation based on real stored questions in the database
      const totalCrafted =
        matched.length > 0
          ? matched.reduce((acc, curr) => {
              const mcq = curr.mcqQuestions?.length || 0;
              const essay = curr.essayRubrik?.length || 0;
              const gen = (curr as any).questions?.length || 0;
              return acc + Math.max(gen, mcq + essay);
            }, 0)
          : 0;

      const targetQ = asgn.targetQuestions || 40;
      const progressPercent = Math.min(100, Math.round((totalCrafted / targetQ) * 100));

      return {
        ...asgn,
        liveCount: totalCrafted,
        targetQuestions: targetQ,
        progressPercent,
        matchedAssessments: matched,
      };
    });
  }, [teacherAssignments, state.assessments]);

  // Filter based on user role and selection
  const filteredAssignments = useMemo(() => {
    return assignmentsWithLiveProgress.filter((asgn) => {
      // Role & Teacher Filter
      if (!isAdminOrOperator) {
        // Pure Guru: only see assignments assigned to currentUser
        const isOwner =
          asgn.teacherId === currentUser?.id ||
          (asgn.teacherName && currentUser?.nama && asgn.teacherName.toLowerCase().includes(currentUser.nama.toLowerCase()));
        if (!isOwner) return false;
      } else {
        // Admin or Operator
        if (selectedTeacherFilter !== 'ALL') {
          if (asgn.teacherId !== selectedTeacherFilter) return false;
        }
      }

      // Category filter
      if (categoryFilter !== 'ALL' && asgn.category !== categoryFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (asgn.subjectName || '').toLowerCase().includes(q);
        const matchTeacher = (asgn.teacherName || '').toLowerCase().includes(q);
        if (!matchTitle && !matchTeacher) return false;
      }

      return true;
    });
  }, [assignmentsWithLiveProgress, isAdminOrOperator, currentUser, selectedTeacherFilter, categoryFilter, searchQuery]);

  // Handler: Teacher submits assignment for verification
  const handleSubmitForVerification = async (asgn: any) => {
    await saveTeacherExamAssignment({
      ...asgn,
      status: 'Selesai Digarap',
      submittedAt: new Date().toISOString(),
    });
    showToast('Tugas Diserahkan', `Paket soal ${asgn.subjectName} berhasil diserahkan ke Admin untuk diverifikasi.`, 'success');
  };

  // Handler: Admin approves assignment
  const handleApprove = async (asgn: any) => {
    await saveTeacherExamAssignment({
      ...asgn,
      status: 'Telah Diverifikasi',
      verifiedAt: new Date().toISOString(),
      validationNotes: '',
    });
    showToast('Paket Soal Disetujui', `Paket soal ${asgn.subjectName} oleh ${asgn.teacherName} telah diverifikasi resmi.`, 'success');
  };

  // Handler: Admin returns for revision
  const handleConfirmRevision = async () => {
    if (!revisionModalAssignment) return;
    if (!revisionNotes.trim()) {
      showToast('Catatan Kosong', 'Mohon tuliskan catatan revisi untuk guru mapel.', 'warning');
      return;
    }

    await saveTeacherExamAssignment({
      ...revisionModalAssignment,
      status: 'Sedang Digarap',
      validationNotes: revisionNotes.trim(),
    });

    setRevisionModalAssignment(null);
    setRevisionNotes('');
    showToast('Revisi Dikirim', 'Catatan revisi telah dikirimkan ke guru mapel terkait.', 'info');
  };

  // Handler: Admin creates new assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.teacherId || !assignForm.subjectName) {
      showToast('Form Belum Lengkap', 'Pilih Guru Mapel dan Mata Pelajaran.', 'warning');
      return;
    }

    const teacher = teachers.find((t) => t.id === assignForm.teacherId);
    const newAssignment: TeacherExamAssignment = {
      id: `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      teacherId: assignForm.teacherId,
      teacherName: teacher?.nama || 'Guru Mapel',
      subjectName: assignForm.subjectName,
      category: assignForm.category,
      targetClasses: assignForm.targetClasses.length > 0 ? assignForm.targetClasses : ['XII-1', 'XII-2'],
      dueDate: assignForm.dueDate,
      targetQuestions: Number(assignForm.targetQuestions) || 40,
      currentQuestionsCount: 0, // Strict Zero Initialization
      status: 'Belum Digarap',
      notes: assignForm.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    await saveTeacherExamAssignment(newAssignment);
    setIsAssignModalOpen(false);
    setAssignForm({
      teacherId: '',
      subjectName: '',
      category: 'ASAS',
      targetClasses: [],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      targetQuestions: 40,
      notes: '',
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Action Header & Switcher */}
      <div className="p-5 sm:p-6 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span>Penugasan Pembuatan Paket Soal Guru Mapel</span>
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
              Zero Dummy Data &bull; Real Progress
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Alur kerja penyusunan paket soal: inisialisasi dari 0%, pantau butir soal riil tersimpan, serta serahkan untuk verifikasi.
          </p>
        </div>

        {/* Multi-role Button Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {isAdminOrOperator && (
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Beri Tugas Baru ke Guru</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar (Guru Mapel, Kategori, Search) */}
      <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Switcher Tampilan (Jika Admin / Operator) */}
          {isAdminOrOperator && (
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-xl border border-slate-200">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span className="font-bold text-slate-700">Tampilan Guru:</span>
              <select
                value={selectedTeacherFilter}
                onChange={(e) => setSelectedTeacherFilter(e.target.value)}
                className="bg-transparent font-extrabold text-indigo-600 focus:outline-hidden cursor-pointer"
              >
                <option value={currentUser?.id}>Tugas Saya Sendiri ({currentUser?.nama})</option>
                <option value="ALL">Semua Guru Mapel ({teacherAssignments.length} Tugas)</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Kategori Ujian Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-700 focus:outline-hidden"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="ASAS">ASAS (Sumatif Akhir Semester)</option>
            <option value="ASTS">ASTS (Sumatif Tengah Semester)</option>
            <option value="ASAJ">ASAJ (Sumatif Akhir Jenjang XII)</option>
            <option value="Simulasi D'SMART Lampung">Simulasi D'SMART</option>
            <option value="Seleksi OSN/Olimpiade">Seleksi Olimpiade</option>
          </select>
        </div>

        {/* Search Box */}
        <div className="relative min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari mapel atau nama guru..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 focus:outline-hidden focus:border-indigo-600 font-medium"
          />
        </div>
      </div>

      {/* Grid Kartu Penugasan */}
      {filteredAssignments.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
            <FileQuestion className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-800">Tidak Ada Penugasan Aktif</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md">
              {isAdminOrOperator
                ? 'Belum ada penugasan pembuatan soal untuk kriteria ini. Klik "Beri Tugas Baru ke Guru" untuk menugaskan.'
                : 'Anda saat ini belum memiliki penugasan paket soal dari Admin/Kurikulum.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredAssignments.map((asgn) => {
            const isZero = asgn.liveCount === 0;
            const isFull = asgn.progressPercent >= 100;
            const isApproved = asgn.status === 'Telah Diverifikasi';
            const isNeedsRevision = asgn.status === 'Sedang Digarap' && Boolean(asgn.validationNotes);
            const isSubmitted = asgn.status === 'Selesai Digarap';

            return (
              <div
                key={asgn.id}
                className={`p-5 rounded-3xl bg-white border transition-all shadow-xs flex flex-col justify-between space-y-4 ${
                  isApproved
                    ? 'border-emerald-300 ring-1 ring-emerald-400/20'
                    : isNeedsRevision
                    ? 'border-amber-300 ring-1 ring-amber-400/20'
                    : isSubmitted
                    ? 'border-teal-300 ring-1 ring-teal-400/20'
                    : 'border-slate-200 hover:border-indigo-300'
                }`}
              >
                {/* Header Kartu */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10.5px] font-black bg-indigo-50 text-indigo-800 border border-indigo-200">
                      {asgn.category}
                    </span>

                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 ${
                        isApproved
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          : isNeedsRevision
                          ? 'bg-amber-50 text-amber-900 border-amber-300 animate-pulse'
                          : isSubmitted
                          ? 'bg-teal-50 text-teal-800 border-teal-300'
                          : isZero
                          ? 'bg-slate-100 text-slate-700 border-slate-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}
                    >
                      {isApproved && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                      {isNeedsRevision && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                      {isSubmitted && <Sparkles className="w-3 h-3 text-teal-600" />}
                      <span>
                        {isApproved
                          ? 'Telah Diverifikasi'
                          : isNeedsRevision
                          ? 'Perlu Revisi'
                          : isSubmitted
                          ? 'Menunggu Verifikasi'
                          : isZero
                          ? 'Belum Digarap (0%)'
                          : 'Sedang Digarap'}
                      </span>
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 leading-snug line-clamp-1">
                      {asgn.subjectName}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{asgn.teacherName}</span>
                    </p>
                  </div>

                  {/* Target Kelas & Batas Waktu */}
                  <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 pt-1">
                    <span className="truncate">
                      Kelas: {asgn.targetClasses?.join(', ') || 'Semua Rombel'}
                    </span>
                    <span className="flex items-center gap-1 text-slate-600 shrink-0">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Tenggat: {asgn.dueDate}</span>
                    </span>
                  </div>
                </div>

                {/* Progress Bar Dinamis & Jumlah Soal Riil (Strict Zero Reset) */}
                <div className="space-y-1.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                    <span>Jumlah Soal Terbuat</span>
                    <span className="font-mono text-indigo-700 font-black">
                      {asgn.liveCount} / {asgn.targetQuestions} Soal ({asgn.progressPercent}%)
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 rounded-full ${
                        isFull
                          ? 'bg-emerald-500'
                          : isZero
                          ? 'bg-slate-300'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${asgn.progressPercent}%` }}
                    />
                  </div>

                  {/* Empty state alert jika 0 soal */}
                  {isZero && (
                    <p className="text-[10px] text-slate-500 italic text-center pt-0.5">
                      Daftar butir soal masih kosong. Klik tombol di bawah untuk mulai membuat.
                    </p>
                  )}
                </div>

                {/* Catatan Revisi jika ada */}
                {isNeedsRevision && asgn.validationNotes && (
                  <div className="p-2.5 rounded-2xl bg-amber-50/90 border border-amber-300 text-xs text-amber-950 space-y-1">
                    <div className="flex items-center gap-1 font-bold text-amber-800 text-[11px]">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Catatan Revisi dari Admin / Kurikulum:</span>
                    </div>
                    <p className="text-[11px] leading-relaxed italic">
                      "{asgn.validationNotes}"
                    </p>
                  </div>
                )}

                {/* Tombol Aksi Bawah */}
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  {/* Tombol Buat / Lanjutkan Soal */}
                  <button
                    type="button"
                    onClick={() => onStartCrafting(asgn)}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 border border-indigo-200/80"
                  >
                    <FileQuestion className="w-3.5 h-3.5" />
                    <span>{isZero ? 'Mulai Buat Soal' : 'Lanjutkan Buat Soal'}</span>
                  </button>

                  {/* Tombol Serahkan untuk Guru Mapel jika sudah 100% */}
                  {isFull && !isApproved && !isSubmitted && (
                    <button
                      type="button"
                      onClick={() => handleSubmitForVerification(asgn)}
                      className="w-full py-2 px-3 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Serahkan untuk Diverifikasi (100%)</span>
                    </button>
                  )}

                  {/* Tombol Verifikasi & Revisi Khusus Admin / Operator */}
                  {isAdminOrOperator && (
                    <div className="flex items-center gap-1.5 pt-1">
                      {!isApproved && (
                        <button
                          type="button"
                          onClick={() => handleApprove(asgn)}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
                          title="Setujui paket soal ini"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setRevisionModalAssignment(asgn);
                          setRevisionNotes(asgn.validationNotes || '');
                        }}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-[11px] transition-all flex items-center justify-center gap-1 cursor-pointer border border-amber-300"
                        title="Kembalikan paket soal untuk revisi"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Minta Revisi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteTeacherExamAssignment(asgn.id)}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Hapus penugasan ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Admin: Beri Tugas Baru */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">Penugasan Pembuatan Paket Soal</h3>
                    <p className="text-[11px] text-indigo-200/80">Inisialisasi target soal dari 0% untuk Guru Mapel</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateAssignment} className="p-5 space-y-4 text-xs">
                {/* Pilih Guru Mapel */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Pilih Guru Mapel Penerima Tugas <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={assignForm.teacherId}
                    onChange={(e) => {
                      const tId = e.target.value;
                      const teacher = teachers.find((t) => t.id === tId);
                      const defaultSubject =
                        teacher?.mataPelajaran && teacher.mataPelajaran.length > 0
                          ? teacher.mataPelajaran[0]
                          : subjects[0]?.nama || '';
                      setAssignForm({
                        ...assignForm,
                        teacherId: tId,
                        subjectName: defaultSubject,
                      });
                    }}
                    required
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                  >
                    <option value="">-- Pilih Guru Mapel --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama} ({t.role === 'admin' ? 'Admin / Guru' : 'Guru Mapel'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pilih Mata Pelajaran & Kategori */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Mata Pelajaran <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={assignForm.subjectName}
                      onChange={(e) => setAssignForm({ ...assignForm, subjectName: e.target.value })}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                    >
                      <option value="">-- Pilih Mapel --</option>
                      {subjects.map((s) => (
                        <option key={s.id} value={s.nama}>
                          {s.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Kategori Ujian <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={assignForm.category}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, category: e.target.value as any })
                      }
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                    >
                      <option value="ASAS">ASAS (Sumatif Akhir Semester)</option>
                      <option value="ASTS">ASTS (Sumatif Tengah Semester)</option>
                      <option value="ASAJ">ASAJ (Sumatif Akhir Jenjang XII)</option>
                      <option value="Simulasi D'SMART Lampung">Simulasi D'SMART</option>
                      <option value="Seleksi OSN/Olimpiade">Seleksi OSN/Olimpiade</option>
                      <option value="Remedial/Susulan">Remedial / Susulan</option>
                    </select>
                  </div>
                </div>

                {/* Target Jumlah Soal & Tenggat Waktu */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Target Jumlah Soal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={assignForm.targetQuestions}
                      onChange={(e) =>
                        setAssignForm({ ...assignForm, targetQuestions: Number(e.target.value) })
                      }
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">
                      Tenggat Waktu (Deadline) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={assignForm.dueDate}
                      onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                      required
                      className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium"
                    />
                  </div>
                </div>

                {/* Catatan / Instruksi Khusus */}
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Instruksi Khusus untuk Guru Mapel
                  </label>
                  <textarea
                    rows={2}
                    value={assignForm.notes}
                    onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                    placeholder="Contoh: Soal mencakup materi Bab 1 - 4 dengan 20% butir penalaran HOTS."
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium resize-none"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md shadow-indigo-600/20"
                  >
                    Kirim Penugasan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Admin: Catatan Revisi */}
      <AnimatePresence>
        {revisionModalAssignment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-4 bg-amber-500 text-slate-950 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-extrabold text-sm">Kembalikan untuk Revisi</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setRevisionModalAssignment(null)}
                  className="p-1 rounded-lg hover:bg-amber-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <p className="text-slate-600">
                  Tuliskan poin-poin yang perlu diperbaiki oleh{' '}
                  <strong className="text-slate-900">{revisionModalAssignment.teacherName}</strong> pada paket soal{' '}
                  <strong className="text-slate-900">{revisionModalAssignment.subjectName}</strong>:
                </p>

                <textarea
                  rows={4}
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="Contoh: Kunci jawaban nomor 14 dan 22 mohon diperiksa kembali..."
                  className="w-full p-3 rounded-xl border border-slate-200 bg-white font-medium resize-none leading-relaxed"
                  required
                />

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRevisionModalAssignment(null)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmRevision}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-xs"
                  >
                    Kirim Catatan Revisi
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
