import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ExamReviewItem, StudentActivityLogItem } from '../types';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Eye,
  Filter,
  Search,
  CheckSquare,
  Square,
  Lock,
  Unlock,
  Layers,
  Sparkles,
  BookOpen,
  Calendar,
  X,
  Save,
  Check,
  HelpCircle,
  FileCheck2,
  FileText,
  User,
  School,
  AlertCircle,
  Award,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getScoreDiagnosis } from '../utils/litnumRealtimeHelper';
import { isClassMatch } from '../utils/classHelper';

interface CbtTwoStageReviewPanelProps {
  embedded?: boolean;
  filterExamType?: 'ALL' | 'CBT_REGULER' | 'CBT_LITNUM';
}

export const CbtTwoStageReviewPanel: React.FC<CbtTwoStageReviewPanelProps> = ({
  embedded = false,
  filterExamType = 'ALL',
}) => {
  const {
    state,
    currentUser,
    handleSaveDraftReview,
    handleFinalizeExamScores,
    showToast,
  } = useApp();

  // Role verification
  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin;
  const isOperator = currentUser?.role === 'operator' || currentUser?.isOperator;
  const isProktor =
    isAdmin ||
    isOperator ||
    currentUser?.role === 'guru' ||
    (currentUser?.roles || []).includes('admin') ||
    (currentUser?.roles || []).includes('operator');

  const reviewerRoleName: 'admin' | 'operator' | 'proktor' = isAdmin
    ? 'admin'
    : isOperator
    ? 'operator'
    : 'proktor';

  // Filters state
  const [statusTab, setStatusTab] = useState<'all' | 'draft' | 'final'>('draft');
  const [selectedExamType, setSelectedExamType] = useState<'ALL' | 'CBT_REGULER' | 'CBT_LITNUM'>(
    filterExamType
  );
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection for bulk finalization
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal Review Detail
  const [reviewModalItem, setReviewModalItem] = useState<ExamReviewItem | null>(null);
  const [reviewNoteInput, setReviewNoteInput] = useState('');

  // Critical Confirmation Modal state
  const [criticalModalOpen, setCriticalModalOpen] = useState(false);
  const [targetItemsToFinalize, setTargetItemsToFinalize] = useState<ExamReviewItem[]>([]);
  const [isAgreementChecked, setIsAgreementChecked] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Aggregate student submissions into normalized ExamReviewItem list
  const allReviewItems = useMemo<ExamReviewItem[]>(() => {
    const list: ExamReviewItem[] = [];

    // 1. Ingest CBT Reguler submissions from assessments
    (state.assessments || []).forEach((asm) => {
      (asm.submissions || []).forEach((sub) => {
        // If status is not explicitly set, check statusKoreksi: if includes 'Draf' or 'Terunggah', it's draft.
        const isSubDraft =
          sub.status === 'draft' ||
          !sub.status ||
          sub.statusKoreksi?.includes('Draf') ||
          sub.statusKoreksi?.includes('Draft') ||
          !sub.verifiedByTeacher;

        const resolvedStatus: 'draft' | 'final' = isSubDraft ? 'draft' : 'final';

        list.push({
          id: sub.id,
          studentId: sub.studentId,
          studentName: sub.studentName || sub.namaSiswa || 'Siswa',
          kelas: sub.kelas,
          nisn: sub.nisn,
          examType: 'CBT_REGULER',
          subjectOrDomain: asm.mataPelajaran,
          examTitle: asm.judul || `${asm.jenis} ${asm.mataPelajaran}`,
          score: typeof sub.nilaiAkhir === 'number' ? sub.nilaiAkhir : 0,
          totalQuestions: asm.jumlahSoal || (sub.studentAnswers ? sub.studentAnswers.length : 0),
          totalCorrect: sub.studentAnswers ? sub.studentAnswers.filter((a) => a.benar).length : 0,
          status: resolvedStatus,
          isLocked: Boolean(sub.isLocked || resolvedStatus === 'final'),
          submittedAt: sub.waktuKoreksi || asm.hariTanggal || new Date().toISOString(),
          reviewedBy: sub.reviewedBy,
          reviewerRole: sub.reviewerRole,
          finalizedAt: sub.finalizedAt,
          reviewNotes: sub.reviewNotes,
          answers: sub.studentAnswers,
          activityLogs: sub.activityLogs,
          assessmentId: asm.id,
        });
      });
    });

    // 2. Ingest CBT LitNum records
    (state.litnumRecords || []).forEach((rec) => {
      const isLitDraft = rec.status === 'draft' || (!rec.status && rec.source === 'cbt_system');
      const resolvedStatus: 'draft' | 'final' = isLitDraft ? 'draft' : 'final';

      list.push({
        id: rec.id,
        studentId: rec.studentId,
        studentName: rec.studentName,
        kelas: rec.kelas,
        examType: 'CBT_LITNUM',
        subjectOrDomain: rec.type === 'literasi' ? 'Literasi Membaca' : 'Numerasi Matematika',
        examTitle: `Asesmen LitNum Mingguan (${rec.type.toUpperCase()})`,
        score: rec.score,
        totalQuestions: rec.totalQuestions || 10,
        totalCorrect: rec.correctAnswers || 0,
        status: resolvedStatus,
        isLocked: Boolean(rec.isLocked || resolvedStatus === 'final'),
        submittedAt: rec.date || rec.createdAt || new Date().toISOString(),
        reviewedBy: rec.reviewedBy,
        reviewerRole: rec.reviewerRole,
        finalizedAt: rec.finalizedAt,
        reviewNotes: rec.reviewNotes,
      });
    });

    // Sort by submittedAt descending
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }, [state.assessments, state.litnumRecords]);

  // Statistics for counters
  const counts = useMemo(() => {
    const total = allReviewItems.length;
    const draftCount = allReviewItems.filter((i) => i.status === 'draft').length;
    const finalCount = allReviewItems.filter((i) => i.status === 'final').length;
    return { total, draftCount, finalCount };
  }, [allReviewItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allReviewItems.filter((item) => {
      // 1. Status Filter
      if (statusTab === 'draft' && item.status !== 'draft') return false;
      if (statusTab === 'final' && item.status !== 'final') return false;

      // 2. Exam Type Filter
      if (selectedExamType !== 'ALL' && item.examType !== selectedExamType) return false;

      // 3. Class Filter
      if (selectedClassFilter !== 'ALL' && !isClassMatch(item.kelas, selectedClassFilter)) return false;

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.studentName.toLowerCase().includes(q);
        const matchesClass = item.kelas.toLowerCase().includes(q);
        const matchesTitle = item.examTitle.toLowerCase().includes(q);
        const matchesSubject = item.subjectOrDomain.toLowerCase().includes(q);
        const matchesNisn = item.nisn ? item.nisn.includes(q) : false;
        if (!matchesName && !matchesClass && !matchesTitle && !matchesSubject && !matchesNisn) return false;
      }

      return true;
    });
  }, [allReviewItems, statusTab, selectedExamType, selectedClassFilter, searchQuery]);

  // Handle select all checkbox
  const handleToggleSelectAll = () => {
    const draftFiltered = filteredItems.filter((i) => i.status === 'draft');
    if (selectedIds.size === draftFiltered.length && draftFiltered.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(draftFiltered.map((i) => i.id)));
    }
  };

  const handleToggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Open review modal
  const handleOpenReviewModal = (item: ExamReviewItem) => {
    setReviewModalItem(item);
    setReviewNoteInput(item.reviewNotes || '');
  };

  // Save Draft Review note
  const handleSaveDraft = async () => {
    if (!reviewModalItem) return;
    await handleSaveDraftReview({
      id: reviewModalItem.id,
      examType: reviewModalItem.examType,
      reviewNotes: reviewNoteInput,
      assessmentId: reviewModalItem.assessmentId,
    });
    setReviewModalItem((prev) => (prev ? { ...prev, reviewNotes: reviewNoteInput } : null));
  };

  // Trigger Critical Confirmation Modal for a single item
  const handlePromptFinalizeSingle = (item: ExamReviewItem) => {
    setTargetItemsToFinalize([item]);
    setIsAgreementChecked(false);
    setCriticalModalOpen(true);
  };

  // Trigger Critical Confirmation Modal for selected bulk items
  const handlePromptFinalizeBulk = () => {
    const items = allReviewItems.filter((i) => selectedIds.has(i.id) && i.status === 'draft');
    if (items.length === 0) {
      showToast('Pilih Nilai Terlebih Dahulu', 'Silakan tandai minimal satu nilai berstatus Draf untuk difinalisasi.', 'warning');
      return;
    }
    setTargetItemsToFinalize(items);
    setIsAgreementChecked(false);
    setCriticalModalOpen(true);
  };

  // Execute Finalization after checkbox agreement
  const handleExecuteFinalize = async () => {
    if (!isAgreementChecked || targetItemsToFinalize.length === 0) return;
    setIsFinalizing(true);
    try {
      const reviewerName = currentUser?.nama || 'Administrator / Proktor';
      await handleFinalizeExamScores(
        targetItemsToFinalize.map((item) => ({
          id: item.id,
          examType: item.examType,
          assessmentId: item.assessmentId,
        })),
        reviewerName,
        reviewerRoleName
      );

      // Deselect finalized items and close modals
      setSelectedIds((prev) => {
        const next = new Set(prev);
        targetItemsToFinalize.forEach((i) => next.delete(i.id));
        return next;
      });
      setCriticalModalOpen(false);
      setReviewModalItem(null);
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <div className={`space-y-6 ${embedded ? '' : 'p-4 sm:p-6 bg-slate-50 min-h-screen'}`}>
      {/* Header Panel */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-7 rounded-3xl shadow-xl border border-indigo-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-44 h-44 text-indigo-300" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                Two-Stage Grading Workflow
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                Otoritas: {reviewerRoleName.toUpperCase()}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight">
              Tinjauan &amp; Verifikasi Nilai CBT (Draf &rarr; Final)
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/80 max-w-2xl leading-relaxed">
              Hasil pengerjaan ujian siswa masuk sebagai <strong>Draf (Menunggu Tinjauan)</strong>. Periksa lembar jawab dan log aktivitas sebelum mengunci nilai secara <strong>Final</strong> ke buku nilai resmi dan rapor pendidikan.
            </p>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[90px]">
              <span className="text-[10px] text-amber-300 font-extrabold uppercase block">Menunggu Draf</span>
              <span className="text-xl font-black text-amber-400">{counts.draftCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[90px]">
              <span className="text-[10px] text-emerald-300 font-extrabold uppercase block">Telah Final</span>
              <span className="text-xl font-black text-emerald-400">{counts.finalCount}</span>
            </div>
            <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center min-w-[90px]">
              <span className="text-[10px] text-indigo-200 font-extrabold uppercase block">Total Hasil</span>
              <span className="text-xl font-black text-white">{counts.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-5">
        {/* Navigation Tabs (Semua, Draf, Final) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusTab('draft')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                statusTab === 'draft'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Draf / Menunggu Tinjauan</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusTab === 'draft' ? 'bg-slate-950 text-amber-400' : 'bg-amber-100 text-amber-800'
              }`}>
                {counts.draftCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('final')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                statusTab === 'final'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Final / Tersimpan Permanen</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusTab === 'final' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {counts.finalCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusTab('all')}
              className={`px-4 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                statusTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Semua Status</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                statusTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}>
                {counts.total}
              </span>
            </button>
          </div>

          {/* Bulk Finalize Action Button (active when items selected) */}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={handlePromptFinalizeBulk}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <Lock className="w-4 h-4" />
              <span>Simpan Final / Kunci Nilai Terpilih ({selectedIds.size} Siswa)</span>
            </button>
          )}
        </div>

        {/* Toolbar Filters: Exam Type, Class, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Exam Type Filter */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
              Modul Ujian
            </label>
            <select
              value={selectedExamType}
              onChange={(e) => setSelectedExamType(e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Jenis Ujian (CBT Reguler &amp; LitNum)</option>
              <option value="CBT_REGULER">Ujian CBT Reguler (ASTS, ASAS, Simulasi)</option>
              <option value="CBT_LITNUM">Asesmen CBT LitNum (Literasi &amp; Numerasi)</option>
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
              Filter Rombel / Kelas
            </label>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Kelas ({state?.classes?.length || 0} Rombel)</option>
              {(state?.classes || []).map((c) => (
                <option key={c.id} value={c.nama}>
                  Kelas {c.nama} ({c.fase})
                </option>
              ))}
            </select>
          </div>

          {/* Search Bar */}
          <div>
            <label className="block text-[11px] font-extrabold text-slate-500 uppercase mb-1">
              Cari Nama / NISN / Mata Pelajaran
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama siswa atau mapel..."
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="cursor-pointer text-slate-600 hover:text-indigo-600"
                    title="Pilih Semua yang Berstatus Draf"
                  >
                    {selectedIds.size > 0 && selectedIds.size === filteredItems.filter((i) => i.status === 'draft').length ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3.5">Nama Siswa Resmi</th>
                <th className="p-3.5 w-20">Kelas</th>
                <th className="p-3.5">Nama Ujian / Mapel</th>
                <th className="p-3.5 w-24 text-center">Skor Akhir</th>
                <th className="p-3.5 w-32">Status Verifikasi</th>
                <th className="p-3.5 w-36">Waktu Pengumpulan</th>
                <th className="p-3.5 w-36 text-right">Aksi Tindakan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-600">
                      {statusTab === 'draft'
                        ? 'Semua nilai telah ditinjau dan berstatus Final!'
                        : 'Tidak ada data hasil ujian yang sesuai dengan kriteria filter.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, idx) => {
                  const isDraft = item.status === 'draft';
                  const isSelected = selectedIds.has(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-indigo-50/50' : ''
                      }`}
                    >
                      {/* Checkbox (only for draft items) */}
                      <td className="p-3.5 text-center">
                        {isDraft ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSelectItem(item.id)}
                            className="cursor-pointer text-slate-500 hover:text-indigo-600"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <span title="Terkunci Final" className="inline-block">
                            <Lock className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                          </span>
                        )}
                      </td>

                      {/* Student info */}
                      <td className="p-3.5">
                        <span className="font-extrabold text-slate-900 block">{item.studentName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          NISN: {item.nisn || '-'}
                        </span>
                      </td>

                      {/* Class */}
                      <td className="p-3.5 font-bold font-mono text-slate-700">{item.kelas}</td>

                      {/* Exam Title & Type */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${
                              item.examType === 'CBT_LITNUM'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-indigo-100 text-indigo-900 border border-indigo-200'
                            }`}
                          >
                            {item.examType === 'CBT_LITNUM' ? 'LitNum' : 'CBT Reguler'}
                          </span>
                          <span className="font-extrabold text-slate-800 truncate max-w-xs block">
                            {item.subjectOrDomain}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate">
                          {item.examTitle}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="p-3.5 text-center font-mono">
                        <span
                          className={`text-base font-black ${
                            item.score >= 75
                              ? 'text-emerald-600'
                              : item.score >= 60
                              ? 'text-amber-600'
                              : 'text-rose-600'
                          }`}
                        >
                          {item.score}
                        </span>
                        <span className="text-[10px] text-slate-400 block">/ 100</span>
                      </td>

                      {/* Status Badge */}
                      <td className="p-3.5">
                        {isDraft ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10.5px] font-black bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Draf / Perlu Ditinjau
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10.5px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              Final (Terkunci)
                            </span>
                            {item.reviewedBy && (
                              <span className="text-[9.5px] text-slate-400 block font-mono">
                                Oleh: {item.reviewedBy}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Submission Timestamp */}
                      <td className="p-3.5 text-slate-600 text-[11px] font-mono">
                        {item.submittedAt ? item.submittedAt.substring(0, 16).replace('T', ' ') : '-'}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReviewModal(item)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                            title="Tinjau Hasil Kerja &amp; Lembar Jawab"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Tinjau</span>
                          </button>

                          {isDraft && (
                            <button
                              type="button"
                              onClick={() => handlePromptFinalizeSingle(item)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Simpan Final &amp; Kunci Nilai"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Kunci</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* MODAL 1: TINJAU HASIL KERJA SISWA (DETAIL LEMBAR JAWAB & LOG)       */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {reviewModalItem && (
          <div
            onClick={() => setReviewModalItem(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 text-slate-800 cursor-default space-y-5 my-auto max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase ${
                        reviewModalItem.status === 'draft'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      }`}
                    >
                      {reviewModalItem.status === 'draft' ? 'Status: Draf (Belum Final)' : 'Status: Final (Terkunci)'}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-500">
                      Kelas {reviewModalItem.kelas}
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-slate-900">{reviewModalItem.studentName}</h3>
                  <p className="text-xs text-slate-500">
                    {reviewModalItem.subjectOrDomain} &bull; {reviewModalItem.examTitle}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setReviewModalItem(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {/* Score Summary Box */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-900 text-white">
                  <div className="text-center border-r border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Skor Ujian</span>
                    <span className="text-2xl font-black text-emerald-400">{reviewModalItem.score}</span>
                  </div>
                  <div className="text-center border-r border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Jawaban Benar</span>
                    <span className="text-xl font-black text-white">
                      {reviewModalItem.totalCorrect} / {reviewModalItem.totalQuestions}
                    </span>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Capaian</span>
                    <span className="text-xs font-black text-amber-300 mt-1 block">
                      {reviewModalItem.score >= 75 ? 'Optimal / Tuntas' : 'Perlu Bimbingan'}
                    </span>
                  </div>
                </div>

                {/* Sensor & Activity Logs */}
                {reviewModalItem.activityLogs && reviewModalItem.activityLogs.length > 0 && (
                  <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black text-rose-950">
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>Log Sensor Pengawasan &amp; Integritas ({reviewModalItem.activityLogs.length} Catatan):</span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                      {reviewModalItem.activityLogs.map((log, lIdx) => (
                        <div key={lIdx} className="text-[11px] text-rose-900 flex items-start justify-between font-mono">
                          <span>&bull; {log.action} - {log.detail}</span>
                          <span className="text-slate-400 text-[10px]">{log.timestamp.substring(11, 19)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Lembar Jawab Detail (if student answers exist) */}
                {reviewModalItem.answers && reviewModalItem.answers.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <FileCheck2 className="w-4 h-4 text-indigo-600" />
                      <span>Detail Lembar Jawaban Siswa</span>
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {reviewModalItem.answers.map((ans, aIdx) => (
                        <div
                          key={aIdx}
                          className={`p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between ${
                            ans.benar
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                              : 'bg-rose-50 border-rose-200 text-rose-950'
                          }`}
                        >
                          <div>
                            <span className="font-extrabold block">No. {ans.nomor || aIdx + 1}</span>
                            <span className="text-[10px] text-slate-500">
                              Jawab: <strong>{ans.jawabanSiswa || '-'}</strong>
                            </span>
                          </div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                              ans.benar ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                            }`}
                          >
                            {ans.benar ? 'BENAR' : 'SALAH'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviewer Notes Textarea */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Catatan Tinjauan Penilai ({reviewerRoleName.toUpperCase()}):</span>
                  </label>
                  <textarea
                    rows={3}
                    value={reviewNoteInput}
                    onChange={(e) => setReviewNoteInput(e.target.value)}
                    placeholder="Tuliskan catatan verifikasi, rekomendasi remedial, atau catatan pengawasan di sini..."
                    className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Save className="w-4 h-4 text-slate-600" />
                  <span>Simpan sebagai Draf</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewModalItem(null)}
                    className="px-4 py-2.5 rounded-xl text-slate-500 hover:text-slate-800 font-bold text-xs cursor-pointer"
                  >
                    Tutup
                  </button>

                  {reviewModalItem.status === 'draft' && (
                    <button
                      type="button"
                      onClick={() => handlePromptFinalizeSingle(reviewModalItem)}
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/25 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Simpan Final / Kunci Nilai</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ==================================================================== */}
      {/* MODAL 2: CRITICAL CONFIRMATION MODAL (MODAL KONFIRMASI PENTING)      */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {criticalModalOpen && targetItemsToFinalize.length > 0 && (
          <div
            onClick={() => !isFinalizing && setCriticalModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border-2 border-amber-500 max-w-lg w-full p-6 sm:p-7 text-slate-800 cursor-default space-y-5 my-auto"
            >
              {/* Warning Indicator */}
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-3xl bg-amber-100 border-2 border-amber-300 text-amber-700 flex items-center justify-center mx-auto shadow-md">
                  <ShieldAlert className="w-9 h-9 text-amber-600 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Konfirmasi Otorisasi Finalisasi Nilai Ujian
                </h3>
                <p className="text-xs font-semibold text-slate-500">
                  Tindakan ini memerlukan verifikasi otorisasi dari {reviewerRoleName.toUpperCase()}
                </p>
              </div>

              {/* Data Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Sasaran Nilai:</span>
                  <span className="font-black text-slate-900">
                    {targetItemsToFinalize.length === 1
                      ? targetItemsToFinalize[0].studentName
                      : `${targetItemsToFinalize.length} Siswa Terpilih`}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Tipe Ujian:</span>
                  <span className="font-black text-indigo-700">
                    {targetItemsToFinalize[0].examType === 'CBT_LITNUM' ? 'CBT LitNum' : 'CBT Reguler'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-600">Rata-Rata / Skor:</span>
                  <span className="font-mono font-black text-emerald-700">
                    {targetItemsToFinalize.length === 1
                      ? `${targetItemsToFinalize[0].score} / 100`
                      : `${Math.round(
                          targetItemsToFinalize.reduce((acc, i) => acc + i.score, 0) /
                            targetItemsToFinalize.length
                        )} (Rata-rata)`}
                  </span>
                </div>
              </div>

              {/* Strict Critical Warning Box */}
              <div className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-400/80 text-amber-950 text-xs space-y-2 leading-relaxed">
                <div className="font-black flex items-center gap-1.5 text-amber-900 text-[12.5px]">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Perhatian Penting: Anda akan menyimpan hasil ujian ini secara PERMANEN (FINAL).</span>
                </div>
                <div className="space-y-1.5 text-[11.5px] font-medium text-amber-950 pl-1">
                  <p>Setelah dikonfirmasi:</p>
                  <p>
                    1. Pada <strong>Ujian CBT Reguler</strong>, nilai akan langsung diterbitkan dan dikunci ke dalam <strong>Daftar Nilai Siswa</strong>.
                  </p>
                  <p>
                    2. Pada <strong>CBT LitNum</strong>, hasil capaian siswa akan langsung diintegrasikan ke dalam <strong>Perhitungan Tingkat Literasi &amp; Numerasi pada Estimasi Rapor Pendidikan</strong>.
                  </p>
                  <p className="text-amber-800 font-bold italic pt-0.5">
                    Data yang sudah berstatus Final tidak dapat diubah kembali melalui jalur reguler.
                  </p>
                </div>
              </div>

              {/* Mandatory Agreement Checkbox */}
              <label className="p-3.5 rounded-2xl bg-slate-100 hover:bg-slate-200/80 border border-slate-300 flex items-start gap-3 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isAgreementChecked}
                  onChange={(e) => setIsAgreementChecked(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                />
                <span className="text-xs font-bold text-slate-800 leading-snug">
                  Saya ({currentUser?.nama || reviewerRoleName.toUpperCase()}) telah meninjau hasil kerja siswa dan memastikan data sudah valid.
                </span>
              </label>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isFinalizing}
                  onClick={() => setCriticalModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs cursor-pointer transition-all disabled:opacity-50"
                >
                  Batal &amp; Periksa Kembali
                </button>

                <button
                  type="button"
                  disabled={!isAgreementChecked || isFinalizing}
                  onClick={handleExecuteFinalize}
                  className={`flex-1 py-3 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isAgreementChecked && !isFinalizing
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-emerald-600/30 active:scale-95'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isFinalizing ? 'Menyimpan Final...' : 'Ya, Simpan Secara Final'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
