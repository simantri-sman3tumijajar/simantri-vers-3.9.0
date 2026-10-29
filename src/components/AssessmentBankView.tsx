import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Assessment } from '../types';
import {
  GraduationCap,
  FileQuestion,
  Plus,
  Edit2,
  Trash2,
  FileText,
  FileSpreadsheet,
  Printer,
  Download,
  ScanEye,
  Sparkles,
  BookOpen,
  Calendar,
  CheckCircle2,
  Layers,
  ChevronRight,
  ExternalLink,
  BarChart3,
  CloudUpload,
  Eye,
  Settings,
  Save,
  ShieldCheck,
  Check,
  FolderCheck,
  FolderOpen,
  ClipboardCheck,
  Medal,
  Award,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportASTSSoalPDF, exportASASSoalPDF, exportItemAnalysisPDF } from '../utils/pdfExport';
import { exportASTSSoalWord, exportASASSoalWord } from '../utils/wordExport';
import { exportRaportToExcel } from '../utils/excelExport';
import { useLanguage } from '../context/LanguageContext';
import { CreateAssessmentModal } from './CreateAssessmentModal';
import { formatAcademicTitles } from '../utils/kktpHelper';
import { isClassMatch } from '../utils/classHelper';
import { ItemAnalysisD3Modal } from './ItemAnalysisD3Modal';
import { AssessmentDocumentPreviewModal } from './AssessmentDocumentPreviewModal';
import { DriveRedirectModal } from './DriveRedirectModal';
import { OlimpiadeAssistantModal } from './OlimpiadeAssistantModal';
import { UploadRaporSTSModal } from './UploadRaporSTSModal';
import { TemplateGuideModal } from './TemplateGuideModal';
import { TeacherQuestionAssignmentsPanel } from './TeacherQuestionAssignmentsPanel';

export const AssessmentBankView: React.FC = () => {
  const { state, currentUser, deleteAssessment, updateSchoolInfo, setCurrentView, setSelectedAssessmentId, showToast } = useApp();
  const { t } = useLanguage();

  const [bankTab, setBankTab] = useState<'PACKAGES' | 'ASSIGNMENTS'>('PACKAGES');
  const [filterType, setFilterType] = useState<'ALL' | 'ASTS' | 'ASAS' | 'ASAJ' | 'DSMART' | 'Olimpiade'>('ALL');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isUploadSTSModalOpen, setIsUploadSTSModalOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [analysisAssessment, setAnalysisAssessment] = useState<Assessment | null>(null);
  const [previewAssessment, setPreviewAssessment] = useState<Assessment | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isTemplateGuideOpen, setIsTemplateGuideOpen] = useState(false);
  const [isOlimpiadeModalOpen, setIsOlimpiadeModalOpen] = useState(false);
  const [selectedOlimpiadeTitle, setSelectedOlimpiadeTitle] = useState('');

  if (!state || !currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Role filtering with strict matching for Admin-managed teacher subjects with double-lookup
  const assignedSubjects = useMemo(() => {
    const subs = new Set<string>();
    if (Array.isArray(currentUser.mataPelajaran)) {
      currentUser.mataPelajaran.forEach((m) => subs.add(m.toLowerCase().trim()));
    }
    if (Array.isArray(state.subjects)) {
      state.subjects.forEach((sbj) => {
        if (
          sbj.guruAssignments?.some(
            (ga) =>
              ga.teacherId === currentUser.id ||
              ga.teacherName.toLowerCase().trim() === currentUser.nama.toLowerCase().trim()
          )
        ) {
          subs.add(sbj.nama.toLowerCase().trim());
        }
      });
    }
    return Array.from(subs);
  }, [currentUser, state.subjects]);

  const allList = state.assessments.filter((a) => {
    if (!a) return false;

    // Filter by period if user specifically selected 'ACTIVE'
    if (filterPeriod === 'ACTIVE') {
      const activeYear = state.schoolInfo.tahunAjaranAktif;
      const activeSem = state.schoolInfo.semesterAktif;
      const periodMatch = a.tahunAjaran === activeYear && a.semester === activeSem;
      const isOwner =
        a.guruId === currentUser.id ||
        (a.guruPengampu && currentUser.nama && a.guruPengampu.toLowerCase().includes(currentUser.nama.toLowerCase()));

      if (!periodMatch && !isOwner) {
        return false;
      }
    }

    if (isAdmin) return true;
    if (assignedSubjects.includes('semua mata pelajaran')) return true;
    if (a.guruId === currentUser.id) return true;
    if (a.guruPengampu && currentUser.nama && a.guruPengampu.toLowerCase().includes(currentUser.nama.toLowerCase())) return true;
    return assignedSubjects.includes((a.mataPelajaran || '').toLowerCase().trim());
  });

  const filtered = allList.filter((a) => {
    if (filterType !== 'ALL' && a.jenis !== filterType) return false;
    if (filterClass !== 'ALL' && !isClassMatch(a.kelas, filterClass)) return false;
    return true;
  });

  const handleCreateNew = () => {
    setEditingAssessment(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (asm: Assessment) => {
    setEditingAssessment(asm);
    setIsCreateModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    const targetId = deleteConfirmId;
    setDeleteConfirmId(null); // Instantly close modal (Optimistic UX)
    await deleteAssessment(targetId);
  };

  const handleExportPDF = async (asm: Assessment) => {
    if (asm.jenis === 'ASTS') {
      await exportASTSSoalPDF(asm, state.schoolInfo);
    } else {
      await exportASASSoalPDF(asm, state.schoolInfo);
    }
  };

  const handleExportWord = async (asm: Assessment) => {
    if (asm.jenis === 'ASTS') {
      await exportASTSSoalWord(asm, state.schoolInfo);
    } else {
      await exportASASSoalWord(asm, state.schoolInfo);
    }
  };

  const handleExportAnalysisPDF = async (asm: Assessment) => {
    if (state?.schoolInfo) {
      await exportItemAnalysisPDF(asm, state.schoolInfo);
    }
  };

  const handleOpenGrading = (asmId: string) => {
    setSelectedAssessmentId(asmId);
    setCurrentView('mass-grading');
  };

  const handleOpenRaport = (asmId: string) => {
    setSelectedAssessmentId(asmId);
    setCurrentView('raport-sts');
  };

  const activeExamType = state.examManagement?.activeExamType || 'SEMUA';
  const activeExamName = state.examManagement?.activeExamName || 'Semua Jenis Ujian CBT';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-indigo-600" />
              {t('bank.title', 'Manajemen Bank Asesmen & Koreksi (ASTS, ASAS, CBT)')}
            </h2>
            {activeExamType !== 'SEMUA' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sesi Aktif: {activeExamName}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500">
            {t(
              'bank.subtitle',
              'Penyusunan modul & paket bank soal CBT (ASTS, ASAS, Simulasi DSMART, Seleksi OSN / Olimpiade) serta koreksi AI Vision'
            )}
          </p>
        </div>

        <div className="flex flex-col gap-2 shrink-0 lg:items-end">
          {/* Baris Utama - Upload Daftar Nilai & Buat Asesmen Baru */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsUploadSTSModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
              title="Unggah file Excel daftar nilai siswa untuk ASTS, ASAS, Formatif, atau SLM"
            >
              <CloudUpload className="w-4 h-4 text-emerald-100" />
              <span>Upload Daftar Nilai</span>
            </button>

            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>{t('bank.btn_create', 'Buat / Unggah Soal Asesmen')}</span>
            </button>
          </div>

          {/* Baris Sekunder (Diletakkan di Bawahnya) - Akses Cepat Berita Acara, Panduan Template & Google Drive */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 w-full lg:w-auto lg:justify-end">
            <button
              type="button"
              onClick={() => setIsTemplateGuideOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 active:scale-95 text-amber-900 border border-amber-300 font-bold text-xs transition-all cursor-pointer shadow-2xs"
              title="Panduan Format Soal Word & Excel"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-600" />
              <span>Panduan Format Soal</span>
            </button>

            <button
              type="button"
              onClick={() => setCurrentView('berita-acara')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-900 border border-indigo-200 font-bold text-xs transition-all cursor-pointer shadow-2xs"
              title="Buka Menu Berita Acara ASTS & ASAS"
            >
              <ClipboardCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Berita Acara ASTS &amp; ASAS</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDriveModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 active:scale-95 text-emerald-800 border border-emerald-200 font-bold text-xs transition-all cursor-pointer shadow-2xs"
              title="Buka Folder Google Drive Bank Soal di Tab Baru"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Drive {filterType === 'ASAS' ? 'ASAS' : filterType === 'ASTS' ? 'ASTS' : 'Bank Soal'}</span>
              <ExternalLink className="w-3 h-3 text-emerald-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Tab Switcher: Paket Bank Soal vs Tugas Pembuatan Soal Guru (Multi-Role) */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80 w-fit">
        <button
          type="button"
          onClick={() => setBankTab('PACKAGES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            bankTab === 'PACKAGES'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-indigo-600" />
          <span>Paket Asesmen &amp; Bank Soal ({allList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setBankTab('ASSIGNMENTS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            bankTab === 'ASSIGNMENTS'
              ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Tugas Pembuatan Soal ({state.examManagement?.teacherAssignments?.length || 0})</span>
        </button>
      </div>

      {bankTab === 'ASSIGNMENTS' ? (
        <TeacherQuestionAssignmentsPanel
          onStartCrafting={(asgn) => {
            setEditingAssessment(null);
            setIsCreateModalOpen(true);
          }}
        />
      ) : (
        <>
            {/* Banner Sesi Ujian Aktif Ditetapkan Sekolah */}
      {activeExamType !== 'SEMUA' && (
        <div
          className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            activeExamType === 'Olimpiade'
              ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white border-amber-600 shadow-md'
              : activeExamType === 'DSMART'
              ? 'bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white border-emerald-500 shadow-md'
              : activeExamType === 'ASTS'
              ? 'bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white border-indigo-500 shadow-md'
              : 'bg-gradient-to-r from-sky-900 via-indigo-900 to-slate-900 text-white border-sky-500 shadow-md'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-white">
                  Sesi Ujian Aktif Sekolah
                </span>
                <span className="font-black text-sm text-white">{activeExamName}</span>
              </div>
              <p className="text-xs text-white/90 font-medium mt-0.5">
                {activeExamType === 'Olimpiade'
                  ? 'Admin/Operator menetapkan sesi Seleksi OSN / Olimpiade Sains. Ketika membuat bank soal baru, sistem otomatis menyesuaikan ke template 30 butir soal HOTS kompetisi sains.'
                  : activeExamType === 'DSMART'
                  ? "Admin/Operator menetapkan sesi Simulasi D'SMART Lampung. Pembuatan bank soal otomatis mengacu pada 50 butir soal HOTS 4 Instrumen Disdikbud."
                  : activeExamType === 'ASTS'
                  ? 'Admin/Operator menetapkan sesi ASTS. Pembuatan bank soal difokuskan pada format Essay HOTS & Rubrik Penilaian.'
                  : 'Admin/Operator menetapkan sesi ASAS. Pembuatan bank soal difokuskan pada format Pilihan Ganda 40/50 butir.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            {activeExamType === 'Olimpiade' && (
              <button
                type="button"
                onClick={() => setIsOlimpiadeModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white text-amber-900 font-black text-xs hover:bg-amber-50 active:scale-95 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Medal className="w-4 h-4 text-amber-700" />
                <span>Dokumen Olimpiade</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleCreateNew}
              className="px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 border border-white/40 text-white font-black text-xs active:scale-95 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Garap Soal Sesuai Sesi Aktif</span>
            </button>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-700">{t('action.filter', 'Filter Modul')}:</span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('action.all', 'Semua')} ({allList.length})
            </button>
            <button
              onClick={() => setFilterType('ASTS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'ASTS'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>ASTS (Essay)</span>
              {activeExamType === 'ASTS' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Sesi Aktif Sekolah" />
              )}
            </button>
            <button
              onClick={() => setFilterType('ASAS')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'ASAS'
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>ASAS (Pilihan Ganda)</span>
              {activeExamType === 'ASAS' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Sesi Aktif Sekolah" />
              )}
            </button>
            <button
              onClick={() => setFilterType('ASAJ')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'ASAJ'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>ASAJ (Kelas XII)</span>
            </button>
            <button
              onClick={() => setFilterType('DSMART')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'DSMART'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span>Simulasi D'SMART</span>
              {activeExamType === 'DSMART' && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" title="Sesi Aktif Sekolah" />
              )}
            </button>
            <button
              onClick={() => setFilterType('Olimpiade')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                filterType === 'Olimpiade'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              <span>Seleksi OSN / Olimpiade</span>
              {activeExamType === 'Olimpiade' && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" title="Sesi Aktif Sekolah" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">{t('assessment.class', 'Kelas')}:</span>
          <select
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            <option value="ALL">{t('Semua Kelas', 'Semua Kelas')}</option>
            {state.classes.map((c) => (
              <option key={c.id} value={c.nama}>
                {t('Kelas', 'Kelas')} {c.nama}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assessment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((asm) => {
          const isASTS = asm.jenis === 'ASTS';
          const totalQuestions = isASTS ? asm.essayRubrik?.length || 10 : asm.mcqQuestions?.length || 50;
          const subCount = asm.submissions?.length || 0;
          const draftCount = (asm.submissions || []).filter(
            (s) =>
              (s.statusKoreksi || '').toLowerCase().includes('draf') ||
              (s.statusKoreksi || '').toLowerCase().includes('draft')
          ).length;
          const verifiedCount = subCount - draftCount;

          return (
            <div
              key={asm.id}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wider ${
                        asm.jenis === 'DSMART'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : isASTS
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-sky-100 text-sky-800'
                      }`}
                    >
                      {asm.jenis === 'DSMART' ? "Simulasi D'SMART" : asm.jenis} • {totalQuestions} {asm.jenis === 'DSMART' ? 'PG HOTS' : isASTS ? 'Soal Essay' : 'Soal PG'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                      {asm.kelas} ({asm.fase})
                    </span>
                  </div>

                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full" title="Rentang Interval KKTP Kurikulum Merdeka: 0-60 (Kurang), 61-70 (Cukup), 71-80 (Baik), 81-100 (Sangat Baik)">
                    KKTP Merdeka
                  </span>
                </div>

                <h3 className="font-bold text-base text-slate-900 leading-snug mt-1">
                  {asm.mataPelajaran}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{asm.judul}</p>

                <div className="mt-4 p-3 bg-slate-50 rounded-2xl text-xs space-y-1.5 border border-slate-100 text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Guru Pengampu:</span>
                    <span className="font-bold text-slate-800">{formatAcademicTitles(asm.guruPengampu)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tahun Ajaran / Semester:</span>
                    <span className="font-semibold text-slate-700">
                      T.P {asm.tahunAjaran} ({asm.semester})
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Hasil Koreksi Tersimpan:</span>
                    <div className="text-right">
                      <span className="font-bold text-indigo-700">{subCount} Lembar Jawaban</span>
                      {draftCount > 0 && (
                        <span className="block text-[10px] text-amber-700 font-extrabold">({draftCount} draf koreksi tersimpan)</span>
                      )}
                    </div>
                  </div>
                  {subCount > 0 && (
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[10.5px]">
                      <span className="text-slate-500">Bukti Otentik:</span>
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {verifiedCount} Sah • {draftCount} Draf
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Toolbar */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex flex-col gap-2">
                {/* Top Row: Preview Naskah Lengkap & Kunci */}
                <button
                  type="button"
                  onClick={() => setPreviewAssessment(asm)}
                  className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-sm"
                  title="Pratinjau Naskah Soal & Kunci Jawaban Lengkap Standar F4"
                >
                  <Eye className="w-4 h-4 text-indigo-600" />
                  <span>{t('action.preview', 'Preview Naskah Lengkap & Kunci')}</span>
                </button>

                {(asm.jenis === 'Olimpiade' || (asm.mataPelajaran || '').toLowerCase().includes('olimpiade')) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedOlimpiadeTitle(asm.judul || asm.mataPelajaran);
                      setIsOlimpiadeModalOpen(true);
                    }}
                    className="w-full mt-2 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Medal className="w-3.5 h-3.5 text-amber-200" />
                    <span>Administrasi Olimpiade (Piagam, Pengumuman &amp; Menu)</span>
                  </button>
                )}

                {/* Bottom Row: Quick Exports & Tools */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <button
                      onClick={() => handleExportPDF(asm)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-semibold cursor-pointer"
                      title="Cetak / Ekspor PDF Naskah Soal Resmi Standar F4"
                    >
                      <Printer className="w-3 h-3 text-indigo-600" />
                      <span>PDF</span>
                    </button>

                    <button
                      onClick={() => handleExportWord(asm)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200/80 rounded-lg text-[11px] font-semibold cursor-pointer"
                      title="Unduh Naskah Soal Microsoft Word Standar F4 (Folio)"
                    >
                      <FileText className="w-3 h-3 text-sky-600" />
                      <span>Word</span>
                    </button>

                    <button
                      onClick={() => handleOpenRaport(asm.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-[11px] font-semibold cursor-pointer"
                      title="Buka Lembar Raport STS / SAS"
                    >
                      <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                      <span>{t('nav.raport', 'Raport')}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAnalysisAssessment(asm)}
                      className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-lg text-xs font-bold border border-amber-200/80 cursor-pointer"
                      title="Analisis Visual D3.js Tingkat Kesukaran & Daya Pembeda Soal"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-amber-600" />
                    </button>

                    <button
                      onClick={() => handleOpenGrading(asm.id)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold shadow-xs cursor-pointer"
                    >
                      <ScanEye className="w-3.5 h-3.5" />
                      <span>{t('Pindai AI', 'Pindai AI')}</span>
                    </button>

                    <button
                      onClick={() => handleEdit(asm)}
                      className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                      title="Edit Asesmen"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteConfirmId(asm.id)}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                      title="Hapus Asesmen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-sm w-full p-6 text-center text-slate-800 my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto"
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-slate-900 mb-1">{t('Hapus Modul Asesmen?', 'Hapus Modul Asesmen?')}</h4>
              <p className="text-xs text-slate-500 mb-5">
                {t('Modul soal beserta seluruh riwayat koreksi jawaban siswa untuk asesmen ini akan dihapus.', 'Modul soal beserta seluruh riwayat koreksi jawaban siswa untuk asesmen ini akan dihapus.')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 rounded-xl border border-slate-300 text-xs font-semibold cursor-pointer"
                >
                  {t('action.cancel', 'Batal')}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  {t('Ya, Hapus', 'Ya, Hapus')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        </>
      )}

      {/* Create / Edit Wizard Modal */}
      {isCreateModalOpen && (
        <CreateAssessmentModal
          isOpen={isCreateModalOpen}
          initialData={editingAssessment}
          initialJenis={
            editingAssessment?.jenis ||
            (activeExamType !== 'SEMUA' ? activeExamType : undefined)
          }
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingAssessment(null);
          }}
        />
      )}

      {/* Item Analysis D3.js Modal */}
      {analysisAssessment && (
        <ItemAnalysisD3Modal
          isOpen={Boolean(analysisAssessment)}
          assessment={analysisAssessment}
          onClose={() => setAnalysisAssessment(null)}
        />
      )}

      {/* Document Naskah Preview Modal */}
      {previewAssessment && (
        <AssessmentDocumentPreviewModal
          isOpen={Boolean(previewAssessment)}
          assessment={previewAssessment}
          schoolInfo={state.schoolInfo}
          onClose={() => setPreviewAssessment(null)}
        />
      )}

      {/* Google Drive Redirect & Guide Modal */}
      <DriveRedirectModal
        isOpen={isDriveModalOpen}
        url={
          filterType === 'ASAS'
            ? state.schoolInfo?.driveSoalUrlSAS || ''
            : state.schoolInfo?.driveSoalUrlSTS || ''
        }
        title={
          filterType === 'ASAS'
            ? 'Folder Bank Soal ASAS (Pilihan Ganda)'
            : filterType === 'ASTS'
            ? 'Folder Bank Soal ASTS (Essay)'
            : 'Folder Bank Soal ASTS (Essay)'
        }
        menuName={
          filterType === 'ASAS'
            ? 'Bank Soal ASAS'
            : 'Bank Soal ASTS'
        }
        onClose={() => setIsDriveModalOpen(false)}
      />

      <OlimpiadeAssistantModal
        isOpen={isOlimpiadeModalOpen}
        onClose={() => setIsOlimpiadeModalOpen(false)}
        initialJenisKompetisi="Seleksi OSN"
        initialNamaAcara={selectedOlimpiadeTitle || "Dalam Rangka Seleksi OSN-K 2026 SMAN 3 Tumijajar"}
      />

      {/* Upload Daftar Nilai & Asesmen Modal */}
      <UploadRaporSTSModal
        isOpen={isUploadSTSModalOpen}
        onClose={() => setIsUploadSTSModalOpen(false)}
        defaultJenis="ASTS"
      />

      {/* Panduan Format & Template Soal Modal */}
      <TemplateGuideModal
        isOpen={isTemplateGuideOpen}
        onClose={() => setIsTemplateGuideOpen(false)}
      />
    </div>
  );
};
