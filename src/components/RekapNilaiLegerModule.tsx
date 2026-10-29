import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import {
  Student,
  Assessment,
  Submission,
  SubjectGradeRecapSheet,
  StudentGradeRecord,
  TPConfig,
  SchoolInfo,
} from '../types';
import {
  Calculator,
  Filter,
  Save,
  Download,
  Printer,
  RefreshCw,
  Plus,
  Minus,
  Trash2,
  Settings,
  Sparkles,
  BookOpen,
  Award,
  FileSpreadsheet,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Layers,
  Search,
  Lock,
  LockOpen,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Building2,
  GraduationCap,
  X,
  Sliders,
  TrendingUp,
  Table,
  RotateCcw,
  Zap,
  Edit3,
  Check,
  BrainCircuit,
  Wand2,
  ClipboardPaste,
  Info,
  CheckCheck,
  Lightbulb,
  CheckSquare,
  Upload,
  FileDown,
  ShieldAlert,
  Eye,
  FileCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import confetti from 'canvas-confetti';
import { useLanguage } from '../context/LanguageContext';
import { drawOfficialKop, F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM, MARGIN_LEFT_MM } from '../utils/pdfExport';
import { formatAcademicTitles } from '../utils/kktpHelper';
import { formatMataPelajaran } from '../utils/subjectNormalization';
import { isClassMatch, cleanCanonicalClass } from '../utils/classHelper';
import { exportERaporSMAExcel, parseERaporSMATemplate, getColumnLetter } from '../utils/eraporExcelExport';
import { TablePagination } from './TablePagination';
import { downloadLegerExcelTemplate } from '../utils/legerTemplateGenerator';
import {
  generateTab1NilaiRaportPDF,
  generateTab2PengetahuanCompetencyPDF,
  generateTab3FormatifTPPDF,
  generateTabERaporValidasiPDF,
  generateTab4LegerKelasPDF,
  generateHistoricalLegerPDF,
} from '../utils/rekapNilaiPdfHelper';
import { PDFPreviewModal } from './PDFPreviewModal';
import { PermanentLockConfirmModal } from './PermanentLockConfirmModal';
import { HistoricalLegerImportModal } from './HistoricalLegerImportModal';
import { HistoricalLegerImportRecord } from '../types';

export type CompetencyStyleType = 'deep_learning' | 'kurikulum_merdeka' | 'narasi_rapor';

// Canonical string helper
const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

// Dictionary for subject acronyms and synonyms to guarantee accurate matching
const SUBJECT_SYNONYMS: Record<string, string[]> = {
  'pendidikan agama islam': ['pai', 'agama islam', 'pabp islam', 'islam'],
  'pendidikan agama kristen': ['pak', 'pakr', 'agama kristen', 'kristen', 'protestan'],
  'pendidikan agama katolik': ['pkat', 'agama katolik', 'katolik'],
  'pendidikan pancasila': ['ppkn', 'pkn', 'pancasila', 'kewarganegaraan'],
  'bahasa indonesia': ['b. indonesia', 'b indonesia', 'bindo', 'bin', 'bahasa indonesia'],
  'bahasa inggris': ['b. inggris', 'b inggris', 'bing', 'bahasa inggris', 'english'],
  'matematika': ['mtk', 'matematika umum', 'matematika wajib', 'math'],
  'matematika tingkat lanjut': ['mtk lanjut', 'matematika peminatan', 'mtk peminatan'],
  'pendidikan jasmani olahraga dan kesehatan': ['pjok', 'penjas', 'penjasorkes', 'olahraga'],
  'sejarah': ['sej', 'sejarah indonesia', 'sejarah umum'],
  'sejarah tingkat lanjut': ['sejarah peminatan', 'sej lanjut'],
  'seni budaya': ['seni', 'sbk', 'seni rupa', 'seni musik', 'seni tari', 'seni teater'],
  'bimbingan konseling': ['bk', 'bimbingan dan konseling'],
  'informatika': ['tik', 'komputer', 'informatika'],
  'prakarya dan kewirausahaan': ['pkwu', 'prakarya', 'kewirausahaan'],
  'biologi': ['bio', 'biologi tingkat lanjut'],
  'fisika': ['fis', 'fisika tingkat lanjut'],
  'kimia': ['kim', 'kimia tingkat lanjut'],
  'ekonomi': ['eko', 'ekonomi tingkat lanjut'],
  'geografi': ['geo', 'geografi tingkat lanjut'],
  'sosiologi': ['sos', 'sosiologi tingkat lanjut'],
  'antropologi': ['antropologi'],
};

// Check if an assessment subject matches target subject name
function isSubjectMatch(assessmentSubject: string, targetSubject: string, assessmentTitle?: string): boolean {
  if (!assessmentSubject && !assessmentTitle) return false;
  const cTarget = cleanCanonical(targetSubject);
  const cAsm = cleanCanonical(assessmentSubject);
  const cTitle = cleanCanonical(assessmentTitle || '');

  // 1. Exact or mutual inclusion
  if (cAsm === cTarget || cAsm.includes(cTarget) || cTarget.includes(cAsm)) return true;
  if (cTitle.includes(cTarget)) return true;

  // 2. Synonyms lookup
  for (const [canonicalKey, synonyms] of Object.entries(SUBJECT_SYNONYMS)) {
    const cKey = cleanCanonical(canonicalKey);
    const isTargetThisKey = cTarget === cKey || cTarget.includes(cKey) || cKey.includes(cTarget);
    if (isTargetThisKey) {
      if (synonyms.some((syn) => {
        const cSyn = cleanCanonical(syn);
        return cAsm === cSyn || cAsm.includes(cSyn) || cTitle.includes(cSyn);
      })) {
        return true;
      }
    }
  }

  return false;
}

export interface RekapNilaiLegerModuleProps {
  initialTab?: 'tab1' | 'tab2' | 'tab_erapor' | 'tab3' | 'tab4';
  initialClass?: string;
  initialSubject?: string;
  showTabs?: boolean;
}

export const RekapNilaiLegerModule: React.FC<RekapNilaiLegerModuleProps> = ({
  initialTab = 'tab1',
  initialClass,
  initialSubject,
  showTabs = false,
}) => {
  const {
    state,
    currentUser,
    showToast,
    saveGradeRecapSheet,
    lockGradeRecapSheetFinal,
    unlockGradeRecapSheetAdmin,
    saveHistoricalLegerRecord,
    deleteHistoricalLegerRecord,
    updateSchoolInfo,
  } = useApp();
  const school: SchoolInfo = state.schoolInfo || {};
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'operator' || currentUser?.roles?.includes('admin');

  // Available classes & subjects
  const availableClasses = useMemo(() => {
    const classList = state.classes.map((c) => c.nama).sort();
    return classList.length > 0 ? classList : ['X.1', 'X.2', 'XI.1', 'XI.2', 'XII.1', 'XII.2'];
  }, [state.classes]);

  const availableSubjects = useMemo(() => {
    if (isAdmin) {
      return state.subjects.map((s) => s.nama).sort();
    }
    const teacherSubjs = currentUser?.mataPelajaran || [];
    if (teacherSubjs.length > 0) {
      return teacherSubjs.filter((s) => s !== 'Semua Mata Pelajaran').sort();
    }
    return state.subjects.map((s) => s.nama).sort();
  }, [state.subjects, currentUser, isAdmin]);

  // Global Filter States
  const [tahunAjaran, setTahunAjaran] = useState<string>(school.tahunAjaranAktif || '2025/2026');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>(school.semesterAktif || 'Ganjil');
  const [selectedClass, setSelectedClass] = useState<string>(() => initialClass || availableClasses[0] || 'XII.1');
  const [selectedSubject, setSelectedSubject] = useState<string>(() => initialSubject || availableSubjects[0] || 'Pendidikan Agama Islam');
  const [activeTab, setActiveTab] = useState<'tab1' | 'tab2' | 'tab_erapor' | 'tab3' | 'tab4'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  // States for Historical Leger Import, Permanent Lock, & Interactive PDF Preview
  const [isHistoricalImportOpen, setIsHistoricalImportOpen] = useState(false);
  const [isPermanentLockModalOpen, setIsPermanentLockModalOpen] = useState(false);
  const [isPDFPreviewModalOpen, setIsPDFPreviewModalOpen] = useState(false);
  const [pdfPreviewData, setPdfPreviewData] = useState<{
    title: string;
    subtitle?: string;
    blobUrl: string | null;
    fileName: string;
    doc: jsPDF | null;
  }>({
    title: '',
    subtitle: '',
    blobUrl: null,
    fileName: 'Dokumen_Rekap.pdf',
    doc: null,
  });

  // Tab 4 view switcher: 'active_class' or 'historical_leger'
  const [tab4ViewMode, setTab4ViewMode] = useState<'active_class' | 'historical_leger'>('active_class');
  const [selectedHistoricalId, setSelectedHistoricalId] = useState<string>('');

  // Autosave tracking for draft
  const autosaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [lastAutosavedTime, setLastAutosavedTime] = useState<string>('');

  // Sync props when parent updates
  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialClass) setSelectedClass(initialClass);
  }, [initialClass]);

  useEffect(() => {
    if (initialSubject) setSelectedSubject(initialSubject);
  }, [initialSubject]);

  // e-Rapor Modal & Export Options State
  const [isERaporModalOpen, setIsERaporModalOpen] = useState(false);
  const [eRaporModalTab, setERaporModalTab] = useState<'export' | 'import'>('export');
  const [eRaporExportOption, setERaporExportOption] = useState<'standard' | 'blank_template' | 'visual_check'>('standard');
  const [isProcessingERapor, setIsProcessingERapor] = useState(false);
  const [isERaporTPManagerOpen, setIsERaporTPManagerOpen] = useState(false);
  const eRaporFileInputRef = useRef<HTMLInputElement>(null);

  // Capaian Kompetensi Style (Standar Kurikulum Merdeka, Deep Learning, Narasi)
  const [competencyStyle, setCompetencyStyle] = useState<CompetencyStyleType>('kurikulum_merdeka');

  // Lock status check
  const isLocked = Boolean(school.rekapNilaiLocked) && !isAdmin;

  // Derive class info and fase
  const classObj = useMemo(() => {
    return state.classes.find((c) => isClassMatch(c.nama, selectedClass));
  }, [state.classes, selectedClass]);

  const fase = useMemo(() => {
    const cUpper = selectedClass.toUpperCase();
    if (cUpper.startsWith('X.') || cUpper === 'X' || cUpper.startsWith('X-') || cUpper.startsWith('X ')) {
      return 'Fase E';
    }
    return 'Fase F';
  }, [selectedClass]);

  // Derive students in class with resilient matching
  const studentsInClass = useMemo(() => {
    return state.students
      .filter((s) => cleanCanonicalClass(s.kelas) === cleanCanonicalClass(selectedClass) || isClassMatch(s.kelas, selectedClass))
      .sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0) || a.nama.localeCompare(b.nama));
  }, [state.students, selectedClass]);

  // Derive Teacher name for current subject & class
  const teacherForSubject = useMemo(() => {
    const sbj = state.subjects.find((s) => s.nama.toLowerCase().trim() === selectedSubject.toLowerCase().trim());
    if (sbj && sbj.guruAssignments && sbj.guruAssignments.length > 0) {
      const match = sbj.guruAssignments.find((ga) => (ga.kelasAjar || []).some((c) => isClassMatch(c, selectedClass)));
      if (match) {
        return { name: match.teacherName, nip: match.nip || '' };
      }
    }
    if (currentUser?.mataPelajaran?.includes(selectedSubject)) {
      return { name: currentUser.nama, nip: currentUser.nip || '' };
    }
    return { name: currentUser?.nama || 'Guru Mata Pelajaran', nip: currentUser?.nip || '' };
  }, [state.subjects, selectedSubject, selectedClass, currentUser]);

  // Generate unique sheet ID
  const sheetId = useMemo(() => {
    return `${tahunAjaran}_${semester}_${selectedClass}_${selectedSubject}`.replace(/[^a-zA-Z0-9_]/g, '_');
  }, [tahunAjaran, semester, selectedClass, selectedSubject]);

  // Default TP Configurations (TP 1 to TP 6) with Deep Learning KKO
  const defaultTPConfigs: TPConfig[] = useMemo(() => [
    { code: 'TP-1', description: 'menganalisis dan memahami konsep esensial materi pembelajaran secara berkesadaran dan kontekstual' },
    { code: 'TP-2', description: 'menerapkan penalaran kritis dan pemahaman konseptual mendalam dalam memecahkan masalah nyata' },
    { code: 'TP-3', description: 'mengevaluasi data, fenomena, dan informasi pembelajaran secara mandiri dan bertanggung jawab' },
    { code: 'TP-4', description: 'merumuskan ide dan gagasan solutif secara kreatif berdasarkan prinsip materi yang bermakna' },
    { code: 'TP-5', description: 'mengomunikasikan argumentasi logis dan hasil observasi secara terstruktur dan reflektif' },
    { code: 'TP-6', description: 'mengkreasi karya atau kesimpulan holistik berlandaskan etika, integritas, dan kecakapan hidup' },
  ], []);

  // Sheet State (Local Sheet State with auto sync from/to AppState)
  const [sheet, setSheet] = useState<SubjectGradeRecapSheet>(() => {
    const existing = state.gradeRecapSheets?.find((s) => s.id === sheetId);
    if (existing) return existing;

    return {
      id: sheetId,
      tahunAjaran,
      semester,
      kelas: selectedClass,
      fase,
      mataPelajaran: selectedSubject,
      guruName: teacherForSubject.name,
      guruNip: teacherForSubject.nip,
      kktp: school.kktpDefault || 75,
      materiText: 'PEMBELAJARAN MENDALAM & PENALARAN KRITIS',
      capaianPembelajaranText: `Peserta didik mampu memahami, menganalisis, dan merefleksikan konsep mendalam pada mata pelajaran ${selectedSubject} secara berkesadaran dan kontekstual.`,
      weightTPPercent: 50,
      weightSemesterPercent: 50,
      weightPTSPercent: 50,
      weightPASPercent: 50,
      activeTPCount: 6,
      tanggalCetak: 'Desember 2026',
      tpConfigs: defaultTPConfigs,
      studentRecords: studentsInClass.map((st) => ({
        studentId: st.id,
        studentName: st.nama,
        kelas: st.kelas,
        nisn: st.nisn,
        tpScores: { 'TP-1': null, 'TP-2': null, 'TP-3': null, 'TP-4': null, 'TP-5': null, 'TP-6': null },
        tpAchievements: { 'TP-1': null, 'TP-2': null, 'TP-3': null, 'TP-4': null, 'TP-5': null, 'TP-6': null },
        ptsScore: null,
        pasScore: null,
      })),
      updatedAt: new Date().toISOString(),
    };
  });

  // Re-sync sheet state when filter parameters change or students change
  useEffect(() => {
    const existing = state.gradeRecapSheets?.find((s) => s.id === sheetId);
    if (existing) {
      // Merge new students if any student was added to class
      const recMap = new Map(existing.studentRecords.map((r) => [r.studentId, r]));
      const updatedRecords = studentsInClass.map((st) => {
        if (recMap.has(st.id)) {
          const rec = recMap.get(st.id)!;
          return {
            ...rec,
            studentName: st.nama,
            kelas: st.kelas,
            nisn: st.nisn || rec.nisn,
          };
        }
        return {
          studentId: st.id,
          studentName: st.nama,
          kelas: st.kelas,
          nisn: st.nisn,
          tpScores: { 'TP-1': null, 'TP-2': null, 'TP-3': null, 'TP-4': null, 'TP-5': null, 'TP-6': null },
          tpAchievements: { 'TP-1': null, 'TP-2': null, 'TP-3': null, 'TP-4': null, 'TP-5': null, 'TP-6': null },
          ptsScore: null,
          pasScore: null,
        };
      });

      setSheet({
        ...existing,
        activeTPCount: existing.activeTPCount || 6,
        tanggalCetak: existing.tanggalCetak || 'Desember 2026',
        studentRecords: updatedRecords,
        guruName: teacherForSubject.name,
        guruNip: teacherForSubject.nip,
      });
    } else {
      setSheet({
        id: sheetId,
        tahunAjaran,
        semester,
        kelas: selectedClass,
        fase,
        mataPelajaran: selectedSubject,
        guruName: teacherForSubject.name,
        guruNip: teacherForSubject.nip,
        kktp: school.kktpDefault || 75,
        materiText: 'PEMBELAJARAN MENDALAM & PENALARAN KRITIS',
        capaianPembelajaranText: `Peserta didik mampu memahami, menganalisis, dan merefleksikan konsep mendalam pada mata pelajaran ${selectedSubject} secara berkesadaran dan kontekstual.`,
        weightTPPercent: 50,
        weightSemesterPercent: 50,
        weightPTSPercent: 50,
        weightPASPercent: 50,
        activeTPCount: 6,
        tanggalCetak: 'Desember 2026',
        tpConfigs: defaultTPConfigs,
        studentRecords: studentsInClass.map((st) => ({
          studentId: st.id,
          studentName: st.nama,
          kelas: st.kelas,
          tpScores: { 'TP-1': null, 'TP-2': null, 'TP-3': null, 'TP-4': null, 'TP-5': null, 'TP-6': null },
          ptsScore: null,
          pasScore: null,
        })),
        updatedAt: new Date().toISOString(),
      });
    }
  }, [sheetId, tahunAjaran, semester, selectedClass, selectedSubject, studentsInClass, teacherForSubject, school.kktpDefault, fase, defaultTPConfigs]);

  // Modal States
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isManualBatchModalOpen, setIsManualBatchModalOpen] = useState(false);
  const [selectedAssessmentForSync, setSelectedAssessmentForSync] = useState<string>('');
  const [syncTargetColumn, setSyncTargetColumn] = useState<string>('TP-1');
  const [syncModeTab, setSyncModeTab] = useState<'auto_all' | 'single_custom' | 'excel_paste'>('auto_all');

  // Manual Batch Input state
  const [batchTargetCol, setBatchTargetCol] = useState<string>('TP-1');
  const [batchScoreVal, setBatchScoreVal] = useState<number>(75);
  const [pasteExcelText, setPasteExcelText] = useState<string>('');
  const [pasteTargetCol, setPasteTargetCol] = useState<string>('TP-1');

  // Active TP columns array based on activeTPCount (1 to 6)
  const activeTPCount = sheet.activeTPCount || 6;
  const activeTPKeys = useMemo(() => {
    return Array.from({ length: activeTPCount }, (_, i) => `TP-${i + 1}`);
  }, [activeTPCount]);

  // Lock status helpers
  const isSheetFinalLocked = Boolean(sheet.isFinalLocked);
  const isLockedOrFinal = isLocked || isSheetFinalLocked;

  // Helper Formulas & Calculation Functions
  const calculateStudentAverages = useCallback((record: StudentGradeRecord) => {
    // 1. NRS TP (Average of filled active TP scores only)
    const tpValues = activeTPKeys
      .map((k) => record.tpScores[k])
      .filter((v): v is number => typeof v === 'number' && !isNaN(v));

    const nrsTP = tpValues.length > 0 ? tpValues.reduce((a, b) => a + b, 0) / tpValues.length : null;

    // 2. NRS Semester (Average of filled PTS & PAS)
    let nrsSemester: number | null = null;
    const pts = record.ptsScore;
    const pas = record.pasScore;
    const wPTS = sheet.weightPTSPercent ?? 50;
    const wPAS = sheet.weightPASPercent ?? 50;

    if (typeof pts === 'number' && typeof pas === 'number') {
      const sumWeight = wPTS + wPAS;
      nrsSemester = sumWeight > 0 ? (pts * wPTS + pas * wPAS) / sumWeight : (pts + pas) / 2;
    } else if (typeof pts === 'number') {
      nrsSemester = pts;
    } else if (typeof pas === 'number') {
      nrsSemester = pas;
    }

    // 3. NA (Nilai Akhir) & NAR (Nilai Akhir Raport)
    let na: number | null = null;
    let nar: number | null = null;

    const wTP = sheet.weightTPPercent || 50;
    const wSem = sheet.weightSemesterPercent || 50;

    if (typeof nrsTP === 'number' && typeof nrsSemester === 'number') {
      const totalWeight = wTP + wSem;
      na = totalWeight > 0 ? (nrsTP * wTP + nrsSemester * wSem) / totalWeight : (nrsTP + nrsSemester) / 2;
      nar = Math.round(na);
    } else if (typeof nrsTP === 'number') {
      na = nrsTP;
      nar = Math.round(na);
    } else if (typeof nrsSemester === 'number') {
      na = nrsSemester;
      nar = Math.round(na);
    }

    // 4. Max & Min TP Identification (among active TP keys)
    let maxTPCode = '-';
    let minTPCode = '-';
    if (tpValues.length > 0) {
      let maxVal = -1;
      let minVal = 101;
      activeTPKeys.forEach((code) => {
        const score = record.tpScores[code];
        if (typeof score === 'number') {
          if (score > maxVal) {
            maxVal = score;
            maxTPCode = code;
          }
          if (score < minVal) {
            minVal = score;
            minTPCode = code;
          }
        }
      });
    }

    return { nrsTP, nrsSemester, na, nar, maxTPCode, minTPCode };
  }, [activeTPKeys, sheet.weightTPPercent, sheet.weightSemesterPercent, sheet.weightPTSPercent, sheet.weightPASPercent]);

  // Generator Capaian Kompetensi Otomatis (Kurikulum Merdeka & Pembelajaran Mendalam)
  const generateCompetencyText = useCallback((record: StudentGradeRecord, style: CompetencyStyleType = competencyStyle) => {
    if (record.manualCompetencyDesc && record.manualCompetencyDesc.trim().length > 0) {
      return record.manualCompetencyDesc;
    }

    const { nrsTP, maxTPCode, minTPCode } = calculateStudentAverages(record);
    if (nrsTP === null || maxTPCode === '-') {
      return '';
    }

    const tpConfigs = sheet.tpConfigs || defaultTPConfigs;
    const maxDesc = tpConfigs.find((t) => t.code === maxTPCode)?.description || '';
    const minDesc = tpConfigs.find((t) => t.code === minTPCode)?.description || '';

    if (!maxDesc && !minDesc) {
      return `Menunjukkan penguasaan konsep yang mendalam dan penalaran kritis dalam pembelajaran ${sheet.mataPelajaran}.`;
    }

    const minScore = record.tpScores[minTPCode] ?? 0;
    const kktp = sheet.kktp || 75;
    const isMinTuntas = minScore >= kktp;
    const isSingleOrEqual = maxTPCode === minTPCode || !minDesc;

    if (style === 'deep_learning') {
      if (isSingleOrEqual) {
        return `Menunjukkan penalaran kritis dan pemahaman konseptual yang sangat mendalam dalam ${maxDesc}.`;
      }
      if (isMinTuntas) {
        return `Menunjukkan penalaran kritis dan pemahaman materi yang sangat mendalam secara berkesadaran dalam ${maxDesc}, serta telah menunjukkan penguasaan konsep yang matang dan bermakna dalam ${minDesc}.`;
      } else {
        return `Menunjukkan penalaran kritis dan pemahaman materi yang sangat mendalam secara berkesadaran dalam ${maxDesc}, namun masih memerlukan pendampingan lebih lanjut dan penguatan konsep secara terarah dalam ${minDesc}.`;
      }
    }

    if (style === 'kurikulum_merdeka' || !style) {
      if (isSingleOrEqual) {
        return `Menunjukkan penguasaan yang baik dalam ${maxDesc}.`;
      }
      if (isMinTuntas) {
        return `Menunjukkan penguasaan yang sangat baik dalam ${maxDesc}, serta menunjukkan pemahaman yang baik dalam ${minDesc}.`;
      } else {
        return `Menunjukkan penguasaan yang sangat baik dalam ${maxDesc}, namun perlu bimbingan/peningkatan lebih lanjut dalam ${minDesc}.`;
      }
    }

    if (style === 'narasi_rapor') {
      if (isSingleOrEqual) {
        return `Peserta didik menunjukkan kemahiran analisis dan pemahaman kontekstual yang istimewa dalam ${maxDesc}.`;
      }
      if (isMinTuntas) {
        return `Peserta didik menunjukkan pencapaian istimewa dalam ${maxDesc}, serta mampu mengaplikasikan konsep dengan percaya diri dan mandiri pada ${minDesc}.`;
      } else {
        return `Peserta didik menunjukkan pencapaian istimewa dalam ${maxDesc}, serta memerlukan pendampingan berkala guna memantapkan kompetensi pada ${minDesc}.`;
      }
    }

    return `Menunjukkan pemahaman yang sangat mendalam dalam ${maxDesc}.`;
  }, [calculateStudentAverages, sheet.tpConfigs, sheet.mataPelajaran, sheet.kktp, defaultTPConfigs, competencyStyle]);

  // E-Rapor SMA Validation & Checkbox Management
  const getStudentERaporValidation = useCallback(
    (record: StudentGradeRecord) => {
      const { nar } = calculateStudentAverages(record);
      const nilai = nar ?? 0;
      const countT = activeTPKeys.filter((k) => record.tpAchievements?.[k] === 'T').length;
      const countR = activeTPKeys.filter((k) => record.tpAchievements?.[k] === 'R').length;

      if (nar === null) {
        return { isValid: false, reason: 'Nilai Rapor belum terisi' };
      }

      if (nilai === 100) {
        if (countR > 0) {
          return { isValid: false, reason: 'Nilai Rapor = 100 tidak boleh ada TP Perlu Peningkatan (R)' };
        }
        if (countT === 0) {
          return { isValid: false, reason: 'Nilai Rapor = 100 minimal pilih 1 TP Sangat Optimal (T)' };
        }
        return { isValid: true, reason: 'Valid' };
      } else {
        if (countR === 0) {
          return { isValid: false, reason: 'Nilai < 100 wajib ada minimal 1 TP Perlu Peningkatan (R)' };
        }
        if (countT === 0) {
          return { isValid: false, reason: 'Wajib ada minimal 1 TP Sangat Optimal (T)' };
        }
        return { isValid: true, reason: 'Valid' };
      }
    },
    [activeTPKeys, calculateStudentAverages]
  );

  // Sheet Summary Metrics for Audit & Locking Modal
  const sheetMetrics = useMemo(() => {
    let filledCount = 0;
    let scoresSum = 0;
    let highestScore = 0;
    let lowestScore = 100;
    const totalStudents = sheet.studentRecords?.length || 0;

    sheet.studentRecords?.forEach((r) => {
      const nar = calculateStudentAverages(r).nar;
      if (typeof nar === 'number' && !isNaN(nar)) {
        filledCount++;
        scoresSum += nar;
        if (nar > highestScore) highestScore = nar;
        if (nar < lowestScore) lowestScore = nar;
      }
    });

    const avgScore = filledCount > 0 ? scoresSum / filledCount : 0;
    if (filledCount === 0) lowestScore = 0;

    return { totalStudents, filledCount, avgScore, highestScore, lowestScore };
  }, [sheet.studentRecords, calculateStudentAverages]);

  // Debounced Autosave for Draft Status
  const triggerDebouncedAutosave = useCallback(
    (updatedSheet: SubjectGradeRecapSheet) => {
      if (updatedSheet.isFinalLocked) return;
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
      setIsAutosaving(true);
      autosaveTimerRef.current = setTimeout(async () => {
        try {
          const draftSheet = {
            ...updatedSheet,
            statusLock: 'DRAFT' as const,
            isDraftSaved: true,
            lastAutosavedAt: new Date().toISOString(),
          };
          await saveGradeRecapSheet(draftSheet, true);
          setLastAutosavedTime(new Date().toLocaleTimeString('id-ID'));
        } finally {
          setIsAutosaving(false);
        }
      }, 1500);
    },
    [saveGradeRecapSheet]
  );

  // Manual Draft Save Button Handler
  const handleSaveDraftManual = async () => {
    if (isSheetFinalLocked) {
      showToast('Sudah Final', 'Lembar nilai telah berstatus final dan terkunci permanen.', 'info');
      return;
    }
    const draftSheet = {
      ...sheet,
      statusLock: 'DRAFT' as const,
      isDraftSaved: true,
      lastAutosavedAt: new Date().toISOString(),
    };
    setSheet(draftSheet);
    await saveGradeRecapSheet(draftSheet, false);
    setLastAutosavedTime(new Date().toLocaleTimeString('id-ID'));
  };

  // Confirm Permanent Lock Handler
  const handleConfirmPermanentLock = async (note?: string): Promise<boolean> => {
    const success = await lockGradeRecapSheetFinal(sheet.id, note);
    if (success) {
      setSheet((prev) => ({
        ...prev,
        isFinalLocked: true,
        statusLock: 'FINAL',
        finalizedAt: new Date().toISOString(),
        finalizedBy: currentUser?.nama || 'Guru Pengampu',
        finalizedNote: note || '',
      }));
    }
    return success;
  };

  // Unlock Admin Override Handler
  const handleUnlockAdmin = async () => {
    if (!isAdmin) {
      showToast('Akses Ditolak', 'Hanya administrator yang dapat membuka kunci permanen.', 'error');
      return;
    }
    const confirmed = window.confirm(
      'PERHATIAN ADMINISTRATOR:\nApakah Anda yakin ingin membuka kembali kunci permanen lembar nilai ini?\nStatus akan kembali menjadi DRAFT dan dapat diedit oleh guru.'
    );
    if (!confirmed) return;
    const success = await unlockGradeRecapSheetAdmin(sheet.id);
    if (success) {
      setSheet((prev) => ({
        ...prev,
        isFinalLocked: false,
        statusLock: 'DRAFT',
      }));
    }
  };

  // Download Leger Excel Template Handler
  const handleDownloadLegerTemplate = () => {
    try {
      downloadLegerExcelTemplate({
        school,
        className: selectedClass,
        fase,
        tahunAjaran,
        semester,
        students: studentsInClass,
        subjects: state.subjects,
      });
      showToast('Format Leger Terunduh', `Format template Excel Leger kelas ${selectedClass} siap diisi.`, 'success');
    } catch (err: any) {
      showToast('Gagal Mengunduh Format', err?.message || 'Terjadi kesalahan.', 'error');
    }
  };

  // PDF Preview & Download Handlers
  // Tab 1: Nilai Raport
  const handleOpenTab1Preview = async () => {
    try {
      showToast('Menyiapkan Pratinjau', 'Sedang merender lembar PDF resmi...', 'info');
      const { doc, blobUrl } = await generateTab1NilaiRaportPDF(sheet, school);
      setPdfPreviewData({
        title: `Rekapitulasi Nilai Rapor - ${sheet.mataPelajaran} (${sheet.kelas})`,
        subtitle: `Tahun Pelajaran ${sheet.tahunAjaran} Semester ${sheet.semester}`,
        blobUrl,
        fileName: `Rekap_Nilai_Rapor_${sheet.mataPelajaran}_${sheet.kelas}.pdf`,
        doc,
      });
      setIsPDFPreviewModalOpen(true);
    } catch (e: any) {
      showToast('Gagal Render PDF', e?.message || 'Terjadi kendala saat merender PDF.', 'error');
    }
  };

  const handleDownloadTab1PDF = async () => {
    const { doc } = await generateTab1NilaiRaportPDF(sheet, school);
    doc.save(`Rekap_Nilai_Rapor_${sheet.mataPelajaran}_${sheet.kelas}.pdf`);
    showToast('PDF Diunduh', 'Dokumen PDF Rekap Nilai Rapor berhasil diunduh.', 'success');
  };

  // Tab 2: Capaian Kompetensi
  const handleOpenTab2Preview = async () => {
    try {
      showToast('Menyiapkan Pratinjau', 'Sedang merender lembar Capaian Kompetensi...', 'info');
      const { doc, blobUrl } = await generateTab2PengetahuanCompetencyPDF(sheet, school);
      setPdfPreviewData({
        title: `Capaian Kompetensi - ${sheet.mataPelajaran} (${sheet.kelas})`,
        subtitle: `Kurikulum Merdeka & Pembelajaran Mendalam (Deep Learning)`,
        blobUrl,
        fileName: `Capaian_Kompetensi_${sheet.mataPelajaran}_${sheet.kelas}.pdf`,
        doc,
      });
      setIsPDFPreviewModalOpen(true);
    } catch (e: any) {
      showToast('Gagal Render PDF', e?.message || 'Terjadi kendala saat merender PDF.', 'error');
    }
  };

  const handleDownloadTab2PDF = async () => {
    const { doc } = await generateTab2PengetahuanCompetencyPDF(sheet, school);
    doc.save(`Capaian_Kompetensi_${sheet.mataPelajaran}_${sheet.kelas}.pdf`);
    showToast('PDF Diunduh', 'Dokumen PDF Capaian Kompetensi berhasil diunduh.', 'success');
  };

  // Tab 3: Asesmen Harian TP
  const handleOpenTab3Preview = async () => {
    try {
      showToast('Menyiapkan Pratinjau', 'Sedang merender lembar Asesmen Harian TP...', 'info');
      const { doc, blobUrl } = await generateTab3FormatifTPPDF(sheet, school);
      setPdfPreviewData({
        title: `Asesmen Harian TP 1-6 - ${sheet.mataPelajaran} (${sheet.kelas})`,
        subtitle: `Tahun Pelajaran ${sheet.tahunAjaran} Semester ${sheet.semester}`,
        blobUrl,
        fileName: `Asesmen_Harian_TP_${sheet.mataPelajaran}_${sheet.kelas}.pdf`,
        doc,
      });
      setIsPDFPreviewModalOpen(true);
    } catch (e: any) {
      showToast('Gagal Render PDF', e?.message || 'Terjadi kendala saat merender PDF.', 'error');
    }
  };

  const handleDownloadTab3PDF = async () => {
    const { doc } = await generateTab3FormatifTPPDF(sheet, school);
    doc.save(`Asesmen_Harian_TP_${sheet.mataPelajaran}_${sheet.kelas}.pdf`);
    showToast('PDF Diunduh', 'Dokumen PDF Asesmen Harian berhasil diunduh.', 'success');
  };

  // Tab e-Rapor
  const handleOpenTabERaporPreview = async () => {
    try {
      showToast('Menyiapkan Pratinjau', 'Sedang merender lembar Validasi e-Rapor...', 'info');
      const { doc, blobUrl } = await generateTabERaporValidasiPDF(sheet, school);
      setPdfPreviewData({
        title: `Lembar Validasi Format e-Rapor SMA - ${sheet.mataPelajaran} (${sheet.kelas})`,
        subtitle: `Direktorat SMA Kemendikbudristek`,
        blobUrl,
        fileName: `Validasi_eRapor_${sheet.mataPelajaran}_${sheet.kelas}.pdf`,
        doc,
      });
      setIsPDFPreviewModalOpen(true);
    } catch (e: any) {
      showToast('Gagal Render PDF', e?.message || 'Terjadi kendala saat merender PDF.', 'error');
    }
  };

  const handleDownloadTabERaporPDF = async () => {
    const { doc } = await generateTabERaporValidasiPDF(sheet, school);
    doc.save(`Validasi_eRapor_${sheet.mataPelajaran}_${sheet.kelas}.pdf`);
    showToast('PDF Diunduh', 'Dokumen PDF Validasi e-Rapor berhasil diunduh.', 'success');
  };

  // Tab 4: Leger Kelas
  const handleOpenTab4LegerPreview = async () => {
    try {
      showToast('Menyiapkan Pratinjau', 'Sedang merender Leger Nilai Kompilasi...', 'info');
      const { doc, blobUrl } = await generateTab4LegerKelasPDF(
        legerData,
        school,
        selectedClass,
        tahunAjaran,
        semester,
        fase,
        classObj?.waliKelas
      );
      setPdfPreviewData({
        title: `Leger Rekapitulasi Nilai Siswa Kelas ${selectedClass}`,
        subtitle: `Kompilasi Seluruh Mata Pelajaran - TP ${tahunAjaran} Semester ${semester}`,
        blobUrl,
        fileName: `Leger_Nilai_Kelas_${selectedClass}_${tahunAjaran.replace('/', '_')}.pdf`,
        doc,
      });
      setIsPDFPreviewModalOpen(true);
    } catch (e: any) {
      showToast('Gagal Render PDF', e?.message || 'Terjadi kendala saat merender PDF.', 'error');
    }
  };

  const handleDownloadTab4LegerPDF = async () => {
    const { doc } = await generateTab4LegerKelasPDF(
      legerData,
      school,
      selectedClass,
      tahunAjaran,
      semester,
      fase,
      classObj?.waliKelas
    );
    doc.save(`Leger_Nilai_Kelas_${selectedClass}_${tahunAjaran.replace('/', '_')}.pdf`);
    showToast('PDF Diunduh', 'Dokumen PDF Leger Kelas berhasil diunduh.', 'success');
  };

  // Historical Leger Handlers
  const handleOpenHistoricalLegerPreview = async (record: HistoricalLegerImportRecord) => {
    try {
      showToast('Menyiapkan Pratinjau', 'Sedang merender Leger Historis...', 'info');
      const { doc, blobUrl } = await generateHistoricalLegerPDF(record, school);
      setPdfPreviewData({
        title: record.title,
        subtitle: `File Asal: ${record.sourceFileName} | Diimpor: ${new Date(record.importedAt).toLocaleDateString('id-ID')}`,
        blobUrl,
        fileName: `Leger_Historis_${record.kelasAsal}_${record.tahunAjaranAsal.replace('/', '_')}.pdf`,
        doc,
      });
      setIsPDFPreviewModalOpen(true);
    } catch (e: any) {
      showToast('Gagal Render PDF', e?.message || 'Terjadi kendala saat merender PDF.', 'error');
    }
  };

  const handleDownloadHistoricalLegerPDF = async (record: HistoricalLegerImportRecord) => {
    const { doc } = await generateHistoricalLegerPDF(record, school);
    doc.save(`Leger_Historis_${record.kelasAsal}_${record.tahunAjaranAsal.replace('/', '_')}.pdf`);
    showToast('PDF Diunduh', 'Dokumen PDF Leger Historis berhasil diunduh.', 'success');
  };

  // Adjust active TP count (+ / -)
  const handleAddTP = () => {
    if (isLockedOrFinal) {
      showToast('Akses Terkunci', isSheetFinalLocked ? 'Nilai telah berstatus FINAL permanen.' : 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }
    if (activeTPCount >= 6) {
      showToast('Batas Maksimal', 'Jumlah Tujuan Pembelajaran (TP) maksimal adalah 6 kolom.', 'info');
      return;
    }
    const updated = { ...sheet, activeTPCount: activeTPCount + 1, updatedAt: new Date().toISOString() };
    setSheet(updated);
    saveGradeRecapSheet(updated);
    showToast('TP Ditambahkan', `Kolom TP ${activeTPCount + 1} kini aktif.`, 'success');
  };

  const handleRemoveTP = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }
    if (activeTPCount <= 1) {
      showToast('Batas Minimal', 'Jumlah Tujuan Pembelajaran (TP) minimal adalah 1 kolom.', 'info');
      return;
    }
    const updated = { ...sheet, activeTPCount: activeTPCount - 1, updatedAt: new Date().toISOString() };
    setSheet(updated);
    saveGradeRecapSheet(updated);
    showToast('TP Dikurangi', `Kolom TP ${activeTPCount} dinonaktifkan.`, 'info');
  };

  const handleUpdateActiveTPCount = (count: number) => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }
    const safeCount = Math.max(1, Math.min(6, count));
    const updated = { ...sheet, activeTPCount: safeCount, updatedAt: new Date().toISOString() };
    setSheet(updated);
    saveGradeRecapSheet(updated);
    showToast('Jumlah TP Diperbarui', `Jumlah Tujuan Pembelajaran diatur menjadi ${safeCount} TP.`, 'success');
  };

  // Matching Assessments in system for the selected class and subject
  const matchingAssessments = useMemo(() => {
    return state.assessments.filter((a) => {
      if (!a) return false;
      const classMatches = isClassMatch(a.kelas, selectedClass);
      const subjectMatches = isSubjectMatch(a.mataPelajaran, selectedSubject, a.judul);
      return classMatches && subjectMatches;
    });
  }, [state.assessments, selectedClass, selectedSubject]);

  // Helper find submission for a student
  const findStudentSubmission = useCallback((asm: Assessment | undefined, record: StudentGradeRecord) => {
    if (!asm || !asm.submissions || asm.submissions.length === 0) return null;
    const recIdClean = cleanCanonical(record.studentId);
    const recNameClean = cleanCanonical(record.studentName);
    const studentObj = state.students.find((st) => st.id === record.studentId);
    const recNisnDigits = (studentObj?.nisn || '').replace(/\D/g, '');

    return asm.submissions.find((s) => {
      if (!s) return false;
      if (s.studentId && cleanCanonical(s.studentId) === recIdClean) return true;
      if (recNisnDigits && s.nisn && s.nisn.replace(/\D/g, '') === recNisnDigits) return true;
      const sNameClean = cleanCanonical(s.studentName || s.namaSiswa || '');
      if (sNameClean && recNameClean && (sNameClean === recNameClean || sNameClean.includes(recNameClean) || recNameClean.includes(sNameClean))) {
        return true;
      }
      return false;
    });
  }, [state.students]);

  // 1. SMART AUTO-SYNC ALL ASSESSMENTS (TARIK OTOMATIS SELURUH ASESMEN)
  const handleRunSmartAutoSyncAll = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }

    if (matchingAssessments.length === 0) {
      showToast(
        'Tidak Ada Asesmen Cocok',
        `Tidak ditemukan paket asesmen SiMantri untuk mata pelajaran ${selectedSubject} di kelas ${selectedClass}. Anda dapat menggunakan mode "Pemetaan Khusus Satuan" atau "Input Manual".`,
        'warning'
      );
      return;
    }

    let syncedStudentsCount = 0;
    const mappedLogs: string[] = [];

    // Separate matching assessments into ASTS, ASAS, and TP
    const astsAsm = matchingAssessments.find((a) => {
      const jClean = cleanCanonical(a.judul);
      return a.jenis === 'ASTS' || jClean.includes('asts') || jClean.includes('pts') || jClean.includes('tengah');
    });

    const asasAsm = matchingAssessments.find((a) => {
      const jClean = cleanCanonical(a.judul);
      return a.jenis === 'ASAS' || jClean.includes('asas') || jClean.includes('pas') || jClean.includes('akhir');
    });

    const tpAssessments = matchingAssessments.filter(
      (a) => a.id !== astsAsm?.id && a.id !== asasAsm?.id
    );

    const updatedRecords = sheet.studentRecords.map((record) => {
      let isRecordUpdated = false;
      let newPts = record.ptsScore;
      let newPas = record.pasScore;
      const newTpScores = { ...record.tpScores };
      const newSyncSources: Record<string, string> = { ...(record.syncSources || {}) };
      const newManualFlags: Record<string, boolean> = { ...(record.manualFlags || {}) };

      // 1. Sync PTS (ASTS)
      if (astsAsm) {
        const sub = findStudentSubmission(astsAsm, record);
        const scoreVal = sub && typeof sub.nilaiAkhir === 'number' ? sub.nilaiAkhir : sub && typeof sub.nilaiMurni === 'number' ? sub.nilaiMurni : null;
        if (scoreVal !== null) {
          newPts = Math.round(scoreVal);
          newSyncSources['PTS'] = astsAsm.judul;
          delete newManualFlags['PTS'];
          isRecordUpdated = true;
        }
      }

      // 2. Sync PAS (ASAS)
      if (asasAsm) {
        const sub = findStudentSubmission(asasAsm, record);
        const scoreVal = sub && typeof sub.nilaiAkhir === 'number' ? sub.nilaiAkhir : sub && typeof sub.nilaiMurni === 'number' ? sub.nilaiMurni : null;
        if (scoreVal !== null) {
          newPas = Math.round(scoreVal);
          newSyncSources['PAS'] = asasAsm.judul;
          delete newManualFlags['PAS'];
          isRecordUpdated = true;
        }
      }

      // 3. Sync TP 1 to activeTPCount
      tpAssessments.forEach((tpAsm, idx) => {
        if (idx < activeTPCount) {
          const tpKey = `TP-${idx + 1}`;
          const sub = findStudentSubmission(tpAsm, record);
          const scoreVal = sub && typeof sub.nilaiAkhir === 'number' ? sub.nilaiAkhir : sub && typeof sub.nilaiMurni === 'number' ? sub.nilaiMurni : null;
          if (scoreVal !== null) {
            newTpScores[tpKey] = Math.round(scoreVal);
            newSyncSources[tpKey] = tpAsm.judul;
            delete newManualFlags[tpKey];
            isRecordUpdated = true;
          }
        }
      });

      if (isRecordUpdated) syncedStudentsCount++;
      return {
        ...record,
        ptsScore: newPts,
        pasScore: newPas,
        tpScores: newTpScores,
        syncSources: newSyncSources,
        manualFlags: newManualFlags,
      };
    });

    if (astsAsm) mappedLogs.push(`ASTS -> PTS (${astsAsm.judul})`);
    if (asasAsm) mappedLogs.push(`ASAS -> PAS (${asasAsm.judul})`);
    tpAssessments.forEach((tpAsm, idx) => {
      if (idx < activeTPCount) mappedLogs.push(`Asesmen ${idx + 1} -> TP-${idx + 1} (${tpAsm.judul})`);
    });

    const updatedSheet = { ...sheet, studentRecords: updatedRecords, updatedAt: new Date().toISOString() };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
    setIsSyncModalOpen(false);

    showToast(
      'Sinkronisasi Otomatis Sukses!',
      `Berhasil menarik nilai untuk ${syncedStudentsCount} siswa dari ${mappedLogs.length} paket asesmen SiMantri.`,
      'success'
    );
  };

  // 2. SINGLE ASSESSMENT SYNC HANDLER (PEMETAAN KHUSUS SATUAN)
  const handleRunSingleSync = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }
    if (!selectedAssessmentForSync) {
      showToast('Pilih Asesmen', 'Silakan pilih salah satu asesmen SiMantri untuk ditarik nilainya.', 'warning');
      return;
    }

    const asm = state.assessments.find((a) => a.id === selectedAssessmentForSync);
    if (!asm || !asm.submissions || asm.submissions.length === 0) {
      showToast('Data Asesmen Kosong', 'Asesmen yang dipilih belum memiliki hasil pengerjaan siswa.', 'error');
      return;
    }

    let updatedCount = 0;
    const updatedRecords = sheet.studentRecords.map((record) => {
      const sub = findStudentSubmission(asm, record);
      const scoreVal = sub && typeof sub.nilaiAkhir === 'number' ? sub.nilaiAkhir : sub && typeof sub.nilaiMurni === 'number' ? sub.nilaiMurni : null;

      if (scoreVal !== null) {
        updatedCount++;
        const val = Math.round(scoreVal);
        const newSyncSources = { ...(record.syncSources || {}), [syncTargetColumn]: asm.judul };
        const newManualFlags = { ...(record.manualFlags || {}) };
        delete newManualFlags[syncTargetColumn];

        if (syncTargetColumn === 'PTS') {
          return { ...record, ptsScore: val, syncSources: newSyncSources, manualFlags: newManualFlags };
        } else if (syncTargetColumn === 'PAS') {
          return { ...record, pasScore: val, syncSources: newSyncSources, manualFlags: newManualFlags };
        } else {
          return {
            ...record,
            tpScores: {
              ...record.tpScores,
              [syncTargetColumn]: val,
            },
            syncSources: newSyncSources,
            manualFlags: newManualFlags,
          };
        }
      }
      return record;
    });

    const updatedSheet = { ...sheet, studentRecords: updatedRecords, updatedAt: new Date().toISOString() };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
    setIsSyncModalOpen(false);
    showToast(
      'Sinkronisasi Berhasil',
      `Berhasil menarik ${updatedCount} nilai dari asesmen "${asm.judul}" ke kolom ${syncTargetColumn}.`,
      'success'
    );
  };

  // 3. INLINE GRADE ENTRY HANDLER (MANUAL INPUT)
  const handleScoreChange = (studentId: string, field: string, value: string) => {
    if (isSheetFinalLocked || isLocked) {
      showToast(
        'Akses Terkunci',
        isSheetFinalLocked ? 'Lembar nilai ini telah berstatus FINAL dan dikunci permanen.' : 'Pengisian nilai sedang dikunci oleh Administrator.',
        'warning'
      );
      return;
    }

    const numVal = value.trim() === '' ? null : Math.max(0, Math.min(100, Number(value) || 0));

    const updatedRecords = sheet.studentRecords.map((r) => {
      if (r.studentId !== studentId) return r;
      const newManualFlags = { ...(r.manualFlags || {}), [field]: true };

      if (field === 'PTS') {
        return { ...r, ptsScore: numVal, manualFlags: newManualFlags };
      } else if (field === 'PAS') {
        return { ...r, pasScore: numVal, manualFlags: newManualFlags };
      } else if (field.startsWith('TP-') || field.startsWith('TP')) {
        const key = field.startsWith('TP-') ? field : `TP-${field.replace('TP', '').trim()}`;
        return {
          ...r,
          tpScores: {
            ...r.tpScores,
            [key]: numVal,
          },
          manualFlags: { ...newManualFlags, [key]: true },
        };
      }
      return r;
    });

    const updatedSheet = { ...sheet, studentRecords: updatedRecords, updatedAt: new Date().toISOString() };
    setSheet(updatedSheet);
    triggerDebouncedAutosave(updatedSheet);
  };

  // Keyboard navigation for spreadsheet cell inputs (Excel feel)
  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, rowIdx: number, colKey: string) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      const nextRow = rowIdx + 1;
      const nextInput = document.querySelector<HTMLInputElement>(`input[data-row="${nextRow}"][data-col="${colKey}"]`);
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevRow = rowIdx - 1;
      const prevInput = document.querySelector<HTMLInputElement>(`input[data-row="${prevRow}"][data-col="${colKey}"]`);
      if (prevInput) {
        prevInput.focus();
        prevInput.select();
      }
    }
  };

  // 4. MANUAL BATCH TOOLS: ISI NILAI SERAGAM & SALIN DARI EXCEL
  const handleApplyBatchScore = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }

    const val = Math.max(0, Math.min(100, Number(batchScoreVal) || 0));
    const updatedRecords = sheet.studentRecords.map((r) => {
      const newManualFlags = { ...(r.manualFlags || {}), [batchTargetCol]: true };
      if (batchTargetCol === 'PTS') {
        return { ...r, ptsScore: val, manualFlags: newManualFlags };
      } else if (batchTargetCol === 'PAS') {
        return { ...r, pasScore: val, manualFlags: newManualFlags };
      } else {
        return {
          ...r,
          tpScores: {
            ...r.tpScores,
            [batchTargetCol]: val,
          },
          manualFlags: newManualFlags,
        };
      }
    });

    const updatedSheet = { ...sheet, studentRecords: updatedRecords, updatedAt: new Date().toISOString() };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
    setIsManualBatchModalOpen(false);
    showToast('Isi Nilai Seragam Sukses', `Kolom ${batchTargetCol} berhasil diisi dengan nilai ${val} untuk seluruh siswa.`, 'success');
  };

  // Paste Column Values from Excel/Sheets
  const handleApplyPasteFromExcel = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }
    if (!pasteExcelText.trim()) {
      showToast('Data Kosong', 'Silakan tempel teks baris nilai dari Excel terlebih dahulu.', 'warning');
      return;
    }

    // Split text by lines and tabs
    const lines = pasteExcelText
      .split(/[\r\n]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const parsedScores = lines.map((line) => {
      const firstNum = line.split(/[\t,; ]+/).find((p) => !isNaN(Number(p)) && p.trim() !== '');
      if (firstNum !== undefined) {
        const val = Number(firstNum);
        return Math.max(0, Math.min(100, val));
      }
      return null;
    });

    let assignedCount = 0;
    const updatedRecords = sheet.studentRecords.map((r, idx) => {
      const val = parsedScores[idx];
      if (val !== undefined && val !== null) {
        assignedCount++;
        const newManualFlags = { ...(r.manualFlags || {}), [pasteTargetCol]: true };
        if (pasteTargetCol === 'PTS') {
          return { ...r, ptsScore: val, manualFlags: newManualFlags };
        } else if (pasteTargetCol === 'PAS') {
          return { ...r, pasScore: val, manualFlags: newManualFlags };
        } else {
          return {
            ...r,
            tpScores: {
              ...r.tpScores,
              [pasteTargetCol]: val,
            },
            manualFlags: newManualFlags,
          };
        }
      }
      return r;
    });

    const updatedSheet = { ...sheet, studentRecords: updatedRecords, updatedAt: new Date().toISOString() };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
    setPasteExcelText('');
    setIsManualBatchModalOpen(false);
    showToast(
      'Tempel Excel Berhasil',
      `Berhasil mengisi ${assignedCount} nilai siswa ke kolom ${pasteTargetCol} dari clipboard Excel.`,
      'success'
    );
  };

  const handleClearColumnScore = (colKey: string) => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }

    const updatedRecords = sheet.studentRecords.map((r) => {
      const newSyncSources = { ...(r.syncSources || {}) };
      const newManualFlags = { ...(r.manualFlags || {}) };
      delete newSyncSources[colKey];
      delete newManualFlags[colKey];

      if (colKey === 'PTS') {
        return { ...r, ptsScore: null, syncSources: newSyncSources, manualFlags: newManualFlags };
      } else if (colKey === 'PAS') {
        return { ...r, pasScore: null, syncSources: newSyncSources, manualFlags: newManualFlags };
      } else {
        return {
          ...r,
          tpScores: {
            ...r.tpScores,
            [colKey]: null,
          },
          syncSources: newSyncSources,
          manualFlags: newManualFlags,
        };
      }
    });

    const updatedSheet = { ...sheet, studentRecords: updatedRecords, updatedAt: new Date().toISOString() };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
    setIsManualBatchModalOpen(false);
    showToast('Kolom Dikosongkan', `Nilai pada kolom ${colKey} berhasil dikosongkan.`, 'info');
  };

  // Toggle Checkbox: 'T' (Optimal), 'R' (Perlu Peningkatan), or uncheck (null)
  const handleToggleTPAchievement = (
    studentId: string,
    tpKey: string,
    target: 'T' | 'R'
  ) => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }

    const updatedRecords = sheet.studentRecords.map((r) => {
      if (r.studentId !== studentId) return r;
      const currentAch = r.tpAchievements?.[tpKey] || null;
      const nextAch = currentAch === target ? null : target;
      const newMap = { ...(r.tpAchievements || {}), [tpKey]: nextAch };
      return { ...r, tpAchievements: newMap };
    });

    const updatedSheet = {
      ...sheet,
      studentRecords: updatedRecords,
      updatedAt: new Date().toISOString(),
    };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
  };

  // Ceklis Otomatis dari Nilai TP (Tertinggi = T, Terendah = R)
  const handleAutoAssignTPAchievements = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }

    const updatedRecords = sheet.studentRecords.map((r) => {
      const { nar, maxTPCode, minTPCode } = calculateStudentAverages(r);
      const newAchievements: Record<string, 'T' | 'R' | null> = {};

      activeTPKeys.forEach((k) => {
        newAchievements[k] = null;
      });

      if (nar === 100) {
        if (maxTPCode !== '-') {
          newAchievements[maxTPCode] = 'T';
        } else if (activeTPKeys.length > 0) {
          newAchievements[activeTPKeys[0]] = 'T';
        }
      } else {
        if (maxTPCode !== '-' && minTPCode !== '-' && maxTPCode !== minTPCode) {
          newAchievements[maxTPCode] = 'T';
          newAchievements[minTPCode] = 'R';
        } else if (activeTPKeys.length >= 2) {
          newAchievements[activeTPKeys[0]] = 'T';
          newAchievements[activeTPKeys[activeTPKeys.length - 1]] = 'R';
        } else if (activeTPKeys.length === 1) {
          newAchievements[activeTPKeys[0]] = 'T';
        }
      }

      return {
        ...r,
        tpAchievements: newAchievements,
      };
    });

    const updatedSheet = {
      ...sheet,
      studentRecords: updatedRecords,
      updatedAt: new Date().toISOString(),
    };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
    showToast('Ceklis Otomatis Selesai', 'Status ketercapaian TP berhasil diselaraskan otomatis dengan capaian nilai tertinggi (T) dan terendah (R).', 'success');
  };

  // Tandai Semua TP Optimal (T)
  const handleSetAllTPOptimal = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }

    const updatedRecords = sheet.studentRecords.map((r) => {
      const newAchievements: Record<string, 'T' | 'R' | null> = {};
      activeTPKeys.forEach((k) => {
        newAchievements[k] = 'T';
      });
      return { ...r, tpAchievements: newAchievements };
    });

    const updatedSheet = {
      ...sheet,
      studentRecords: updatedRecords,
      updatedAt: new Date().toISOString(),
    };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
    showToast('Semua TP Diatur Optimal', 'Seluruh kolom TP peserta didik telah diceklis Optimal (T).', 'success');
  };

  // Reset / Kosongkan Seluruh Ceklis TP
  const handleResetAllTPAchievements = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }

    const updatedRecords = sheet.studentRecords.map((r) => ({
      ...r,
      tpAchievements: {},
    }));

    const updatedSheet = {
      ...sheet,
      studentRecords: updatedRecords,
      updatedAt: new Date().toISOString(),
    };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
    showToast('Ceklis Dikosongkan', 'Seluruh pilihan ketercapaian TP telah dikosongkan.', 'info');
  };

  // Perbaiki Otomatis Siswa yang Belum Valid (1-Klik)
  const handleAutoFixInvalidStudents = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }

    let fixCount = 0;
    const updatedRecords = sheet.studentRecords.map((r) => {
      const validation = getStudentERaporValidation(r);
      if (validation.isValid) return r;

      fixCount++;
      const { nar, maxTPCode, minTPCode } = calculateStudentAverages(r);
      const newAchievements: Record<string, 'T' | 'R' | null> = { ...(r.tpAchievements || {}) };

      const score = nar ?? 85;
      if (score === 100) {
        // Clear all R
        activeTPKeys.forEach((k) => {
          if (newAchievements[k] === 'R') newAchievements[k] = null;
        });
        // Ensure at least 1 T
        const hasT = activeTPKeys.some((k) => newAchievements[k] === 'T');
        if (!hasT) {
          const tTarget = maxTPCode !== '-' ? maxTPCode : activeTPKeys[0];
          if (tTarget) newAchievements[tTarget] = 'T';
        }
      } else {
        // Needs at least 1 T and at least 1 R
        const hasT = activeTPKeys.some((k) => newAchievements[k] === 'T');
        const hasR = activeTPKeys.some((k) => newAchievements[k] === 'R');

        if (!hasT) {
          const tTarget = maxTPCode !== '-' ? maxTPCode : activeTPKeys[0];
          if (tTarget) newAchievements[tTarget] = 'T';
        }
        if (!hasR) {
          // Choose a TP different from T
          const rTarget = (minTPCode !== '-' && minTPCode !== maxTPCode && newAchievements[minTPCode] !== 'T')
            ? minTPCode
            : activeTPKeys.find((k) => newAchievements[k] !== 'T') || activeTPKeys[activeTPKeys.length - 1];
          if (rTarget) newAchievements[rTarget] = 'R';
        }
      }

      return {
        ...r,
        tpAchievements: newAchievements,
      };
    });

    const updatedSheet = {
      ...sheet,
      studentRecords: updatedRecords,
      updatedAt: new Date().toISOString(),
    };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
    showToast('Validasi Diperbaiki', `${fixCount} siswa yang sebelumnya belum valid telah diselaraskan agar memenuhi kaidah resmi e-Rapor SMA.`, 'success');
  };

  // Pangkas otomatis seluruh TP ke batas maksimal 100 karakter
  const handleAutoTrimAllTP = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }

    const updatedConfigs = (sheet.tpConfigs || defaultTPConfigs).map((t) => {
      const raw = t.description || '';
      return {
        ...t,
        description: raw.length > 100 ? raw.substring(0, 100) : raw,
      };
    });

    const updatedSheet = {
      ...sheet,
      tpConfigs: updatedConfigs,
      updatedAt: new Date().toISOString(),
    };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
    showToast('Pemangkasan Berhasil', 'Seluruh deskripsi Tujuan Pembelajaran telah diselaraskan ke batas maksimal 100 karakter.', 'success');
  };

  // Ceklis Massal Per Kolom TP
  const handleBatchCheckColumn = (tpKey: string, target: 'T' | 'R' | null) => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }

    const updatedRecords = sheet.studentRecords.map((r) => ({
      ...r,
      tpAchievements: {
        ...(r.tpAchievements || {}),
        [tpKey]: target,
      },
    }));

    const updatedSheet = {
      ...sheet,
      studentRecords: updatedRecords,
      updatedAt: new Date().toISOString(),
    };
    setSheet(updatedSheet);
    saveGradeRecapSheet(updatedSheet);
    showToast(
      'Ceklis Kolom Diperbarui',
      target === null
        ? `Seluruh ceklis pada ${tpKey} telah dikosongkan.`
        : `Seluruh siswa pada ${tpKey} ditandai ${target === 'T' ? 'Optimal (T)' : 'Perlu Peningkatan (R)'}.`,
      'info'
    );
  };

  // Handle Export e-Rapor
  const handleExecuteExportERapor = async (mode: 'standard' | 'blank_template' | 'visual_check') => {
    setIsProcessingERapor(true);
    try {
      // Validate TP lengths before export & automatically trim any over 100 chars
      const invalidTP = sheet.tpConfigs?.find((t) => (t.description || '').length > 100);
      let sheetToExport = sheet;
      if (invalidTP) {
        showToast(
          'Peringatan Panjang Karakter TP',
          `Deskripsi ${invalidTP.code} melebihi 100 karakter (${invalidTP.description.length} karakter). Sistem otomatis memangkas ke 100 karakter agar file tidak ditolak mesin e-Rapor SMA.`,
          'warning'
        );
        const trimmedConfigs = (sheet.tpConfigs || defaultTPConfigs).map((t) => ({
          ...t,
          description: (t.description || '').length > 100 ? (t.description || '').substring(0, 100) : (t.description || ''),
        }));
        sheetToExport = { ...sheet, tpConfigs: trimmedConfigs };
        setSheet(sheetToExport);
        saveGradeRecapSheet(sheetToExport);
      }

      await exportERaporSMAExcel(sheetToExport, {
        mode,
        studentsInSchool: state.students || [],
      });
      setIsERaporModalOpen(false);
      showToast(
        'Export e-Rapor SMA Berhasil',
        mode === 'blank_template'
          ? 'Template kosong resmi e-Rapor SMA telah berhasil diunduh.'
          : mode === 'visual_check'
          ? 'File e-Rapor SMA mode ceklis visual berhasil diunduh.'
          : 'File format import e-Rapor SMA resmi (T/R) berhasil diunduh.',
        'success'
      );
    } catch (err: any) {
      console.error('Error exporting e-Rapor SMA:', err);
      showToast('Gagal Export e-Rapor', err?.message || 'Terjadi kesalahan saat memproses file Excel e-Rapor.', 'error');
    } finally {
      setIsProcessingERapor(false);
    }
  };

  // Handle Upload / Sinkronisasi Template Asli e-Rapor
  const handleUploadERaporTemplateFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingERapor(true);
    try {
      const parsed = await parseERaporSMATemplate(file);

      const studentMap = new Map(sheet.studentRecords.map((s) => [s.studentName.toLowerCase().trim(), s]));
      const updatedRecords = parsed.studentRows.map((row) => {
        const existing = studentMap.get(row.nama.toLowerCase().trim());
        return {
          studentId: existing?.studentId || `std-${row.no}`,
          studentName: row.nama,
          kelas: sheet.kelas,
          nisn: row.nisn || existing?.nisn,
          tpScores: existing?.tpScores || { 'TP-1': null, 'TP-2': null, 'TP-3': null, 'TP-4': null, 'TP-5': null, 'TP-6': null },
          tpAchievements: row.tpAchievements || existing?.tpAchievements || {},
          ptsScore: existing?.ptsScore ?? null,
          pasScore: row.nilaiRapor ?? existing?.pasScore ?? null,
          manualCompetencyDesc: existing?.manualCompetencyDesc,
          anggotaRombelId: row.anggotaRombelId || existing?.anggotaRombelId,
          pembelajaranId: row.pembelajaranId || existing?.pembelajaranId,
          tingkatKode: row.tingkatKode || existing?.tingkatKode,
        };
      });

      const updatedSheet: SubjectGradeRecapSheet = {
        ...sheet,
        activeTPCount: Math.min(6, Math.max(1, parsed.tpConfigs.length || sheet.activeTPCount || 4)),
        tpConfigs: parsed.tpConfigs.length > 0 ? parsed.tpConfigs : sheet.tpConfigs,
        studentRecords: updatedRecords.length > 0 ? updatedRecords : sheet.studentRecords,
        eraporMetadata: {
          rombelPembelajaranId: parsed.rombelPembelajaranId,
          kodeMapel: parsed.kodeMapel,
          templateSyncedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      };

      setSheet(updatedSheet);
      saveGradeRecapSheet(updatedSheet);
      setIsERaporModalOpen(false);
      showToast(
        'Sinkronisasi Berhasil',
        `Template e-Rapor berhasil disinkronkan (${parsed.studentRows.length} siswa, ${parsed.tpConfigs.length} TP). UUID resmi tersimpan.`,
        'success'
      );
    } catch (err: any) {
      console.error('Error importing e-Rapor template:', err);
      showToast('Gagal Sinkronisasi', err?.message || 'File Excel tidak sesuai dengan format resmi e-Rapor SMA.', 'error');
    } finally {
      setIsProcessingERapor(false);
      if (e.target) e.target.value = '';
    }
  };

  // Reset manual competency override for one student
  const handleResetStudentCompetency = (studentId: string) => {
    const updatedRecords = sheet.studentRecords.map((r) =>
      r.studentId === studentId ? { ...r, manualCompetencyDesc: undefined } : r
    );
    const updated = { ...sheet, studentRecords: updatedRecords, updatedAt: new Date().toISOString() };
    setSheet(updated);
    saveGradeRecapSheet(updated);
    showToast('Deskripsi Direset', 'Capaian kompetensi kembali mengikuti kaidah generator otomatis.', 'info');
  };

  // Regenerate all competencies for entire class using chosen pedagogy style
  const handleRegenerateAllCompetencies = (chosenStyle?: CompetencyStyleType) => {
    const styleToUse = chosenStyle || competencyStyle;
    const updatedRecords = sheet.studentRecords.map((r) => ({
      ...r,
      manualCompetencyDesc: undefined,
    }));
    const updated = { ...sheet, studentRecords: updatedRecords, updatedAt: new Date().toISOString() };
    setSheet(updated);
    saveGradeRecapSheet(updated);
    showToast(
      'Regenerasi Berhasil',
      `Seluruh deskripsi capaian kompetensi telah diperbarui dengan kaidah ${
        styleToUse === 'deep_learning'
          ? 'Pembelajaran Mendalam (Deep Learning)'
          : styleToUse === 'kurikulum_merdeka'
          ? 'Standar Kurikulum Merdeka'
          : 'Narasi Komprehensif Rapor'
      }.`,
      'success'
    );
  };

  // Apply Deep Learning Bloom Verbs Template to TP 1-6
  const handleApplyDeepLearningTPTemplate = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }
    const cleanSubj = sheet.mataPelajaran;
    const newConfigs: TPConfig[] = [
      { code: 'TP-1', description: `menganalisis dan memahami konsep esensial materi ${cleanSubj} secara berkesadaran dan kontekstual` },
      { code: 'TP-2', description: `menerapkan penalaran kritis dan pemecahan masalah kompleks pada pembelajaran ${cleanSubj}` },
      { code: 'TP-3', description: `mengevaluasi fakta, bukti empiris, dan fenomena materi ${cleanSubj} secara mandiri dan reflektif` },
      { code: 'TP-4', description: `merumuskan ide solutif dan inovatif berlandaskan penguasaan konsep yang bermakna pada ${cleanSubj}` },
      { code: 'TP-5', description: `mengomunikasikan ide, sintesis materi, dan argumentasi logis secara kolaboratif dan efektif` },
      { code: 'TP-6', description: `mengkreasi karya nyata atau kesimpulan holistik berlandaskan integritas dan kecakapan hidup` },
    ];

    const updated = { ...sheet, tpConfigs: newConfigs, updatedAt: new Date().toISOString() };
    setSheet(updated);
    saveGradeRecapSheet(updated);
    showToast('Template TP Diterapkan', `Deskripsi TP 1-6 disesuaikan dengan Kata Kerja Operasional Pembelajaran Mendalam (Deep Learning).`, 'success');
  };

  // Apply Sample TP from Prompt Specification (HAM, Demokrasi, Talenta)
  const handleApplySampleTPFromPrompt = () => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }
    const sampleConfigs: TPConfig[] = [
      { code: 'TP-1', description: 'menganalisis dan memperjuangkan Hak Asasi Manusia sebagai anugerah Allah yang wajib dihormati' },
      { code: 'TP-2', description: 'menerapkan sikap demokrasi yang kritis dan damai berdasarkan nilai-nilai kasih Kristiani' },
      { code: 'TP-3', description: 'mengembangkan talenta secara bertanggung jawab untuk memuliakan Allah dan melayani sesama' },
      { code: 'TP-4', description: 'merumuskan ide solutif dalam mewujudkan keadilan sosial dan perdamaian di lingkungan' },
      { code: 'TP-5', description: 'mengomunikasikan keteladanan kasih dan kerukunan antarsesama secara reflektif' },
      { code: 'TP-6', description: 'mengkreasi karya nyata yang berdampak positif berlandaskan integritas dan nilai luhur' },
    ];

    const updated = {
      ...sheet,
      materiText: 'HAM, DEMOKRASI & TALENTA',
      capaianPembelajaranText: '12.1 Peserta didik mampu mewujudkan peran sebagai pembawa damai sejahtera dan menerapkan nilai kasih dalam kehidupan bermasyarakat.',
      tpConfigs: sampleConfigs,
      updatedAt: new Date().toISOString()
    };
    setSheet(updated);
    saveGradeRecapSheet(updated);
    showToast('Contoh Spesifikasi Diterapkan', 'Deskripsi TP 1-6 dan materi "HAM, DEMOKRASI & TALENTA" berhasil diterapkan.', 'success');
  };

  // Quick lookup for student NISN
  const studentNisnMap = useMemo(() => {
    const map = new Map<string, string>();
    state.students?.forEach((st) => {
      if (st.nisn) {
        map.set(st.id, st.nisn);
        map.set(st.nama.toLowerCase().trim(), st.nisn);
      }
    });
    return map;
  }, [state.students]);

  // Filtered Students for active Search Query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return sheet.studentRecords;
    const q = searchQuery.toLowerCase().trim();
    return sheet.studentRecords.filter((r) => r.studentName.toLowerCase().includes(q));
  }, [sheet.studentRecords, searchQuery]);

  // Save All Changes Button
  const handleSaveSheetManual = () => {
    saveGradeRecapSheet(sheet);
    showToast('Rekapitulasi Tersimpan', `Data rekap nilai ${sheet.mataPelajaran} kelas ${sheet.kelas} tersimpan aman di sistem.`, 'success');
  };

  // Excel Import Handler
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) {
      showToast('Akses Terkunci', 'Pengisian nilai sedang dikunci oleh Administrator.', 'warning');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json<any>(ws, { header: 1 });

        if (!data || data.length < 2) {
          showToast('File Kosong', 'Format file Excel tidak dapat terbaca.', 'error');
          return;
        }

        let updatedCount = 0;
        const updatedRecords = sheet.studentRecords.map((record) => {
          const row = data.find((r: any[]) =>
            r && Array.isArray(r) && r.some((c) => String(c).toLowerCase().trim() === record.studentName.toLowerCase().trim())
          );

          if (row && Array.isArray(row)) {
            const nums = row.map((val) => {
              const n = Number(val);
              return !isNaN(n) && n >= 0 && n <= 100 ? n : null;
            }).filter((n): n is number => n !== null);

            if (nums.length >= 1) {
              updatedCount++;
              const manualFlags = { ...(record.manualFlags || {}) };
              activeTPKeys.forEach((k, i) => {
                if (nums[i] !== undefined) manualFlags[k] = true;
              });
              if (nums[6] !== undefined) manualFlags['PTS'] = true;
              if (nums[7] !== undefined) manualFlags['PAS'] = true;

              return {
                ...record,
                tpScores: {
                  'TP-1': nums[0] ?? record.tpScores['TP-1'],
                  'TP-2': nums[1] ?? record.tpScores['TP-2'],
                  'TP-3': nums[2] ?? record.tpScores['TP-3'],
                  'TP-4': nums[3] ?? record.tpScores['TP-4'],
                  'TP-5': nums[4] ?? record.tpScores['TP-5'],
                  'TP-6': nums[5] ?? record.tpScores['TP-6'],
                },
                ptsScore: nums[6] ?? record.ptsScore,
                pasScore: nums[7] ?? record.pasScore,
                manualFlags,
              };
            }
          }
          return record;
        });

        const updatedSheet = { ...sheet, studentRecords: updatedRecords, updatedAt: new Date().toISOString() };
        setSheet(updatedSheet);
        saveGradeRecapSheet(updatedSheet);
        showToast('Import Excel Berhasil', `Berhasil mengimpor nilai untuk ${updatedCount} siswa dari file Excel.`, 'success');
      } catch (err) {
        showToast('Gagal Impor Excel', 'Terjadi kesalahan saat membaca file Excel.', 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Export Active Tab to Excel
  const handleExportExcel = () => {
    const rows = sheet.studentRecords.map((r, idx) => {
      const { nrsTP, nrsSemester, na, nar } = calculateStudentAverages(r);
      const cp = generateCompetencyText(r);
      const rowData: Record<string, any> = {
        NO: idx + 1,
        NAMA: r.studentName,
        KELAS: r.kelas,
      };

      activeTPKeys.forEach((key, i) => {
        rowData[`TP ${i + 1}`] = r.tpScores[key] ?? '-';
      });

      rowData['NRS TP'] = nrsTP !== null ? nrsTP.toFixed(1) : '-';
      rowData['PTS'] = r.ptsScore ?? '-';
      rowData['PAS'] = r.pasScore ?? '-';
      rowData['NRS SEMESTER'] = nrsSemester !== null ? nrsSemester.toFixed(1) : '-';
      rowData['NA'] = na !== null ? na.toFixed(1) : '-';
      rowData['NAR'] = nar !== null ? nar : '-';
      rowData['CAPAIAN KOMPETENSI'] = cp;

      return rowData;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap_${sheet.kelas}`);
    XLSX.writeFile(wb, `Rekap_Nilai_${sheet.mataPelajaran}_${sheet.kelas}_TP_${sheet.tahunAjaran.replace('/', '_')}.xlsx`);
    showToast('Export Excel Berhasil', 'Berkas Excel rekapitulasi nilai telah diunduh.', 'success');
  };

  // Print PDF Function (Tab 3: Final Nilai Raport)
  const handlePrintPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [F4_PAPER_HEIGHT_MM, F4_PAPER_WIDTH_MM], // F4 Landscape (330.2 x 215.9 mm)
    });

    const startY = await drawOfficialKop(doc, school, 10, { pageWidth: F4_PAPER_HEIGHT_MM });

    // Document Header
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.text(`NILAI RAPOT PAS KELAS ${sheet.kelas} SEMESTER ${sheet.semester.toUpperCase()} T.P ${sheet.tahunAjaran}`, F4_PAPER_HEIGHT_MM / 2, startY + 6, { align: 'center' });

    doc.setFont('times', 'normal');
    doc.setFontSize(9);
    doc.text(`MATA PELAJARAN : ${sheet.mataPelajaran.toUpperCase()}`, MARGIN_LEFT_MM, startY + 12);
    doc.text(`FASE : ${sheet.fase.toUpperCase()}`, F4_PAPER_HEIGHT_MM - 20, startY + 12, { align: 'right' });

    // Table Data
    const tableBody = sheet.studentRecords.map((r, idx) => {
      const { nar } = calculateStudentAverages(r);
      const cp = generateCompetencyText(r);
      return [idx + 1, r.studentName, nar !== null ? nar : '-', cp];
    });

    autoTable(doc, {
      startY: startY + 16,
      head: [['NO', 'NAMA SISWA', 'NILAI AKHIR', 'CAPAIAN KOMPETENSI']],
      body: tableBody,
      styles: { font: 'times', fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 65 },
        2: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 'auto' },
      },
    });

    // Signature Footer
    const finalY = (doc as any).lastAutoTable?.finalY || startY + 80;

    doc.setFontSize(9);
    doc.text('Mengetahui,', MARGIN_LEFT_MM + 10, finalY + 12);
    doc.text('Kepala SMAN 3 Tumijajar', MARGIN_LEFT_MM + 10, finalY + 16);
    doc.setFont('times', 'bold');
    doc.text(formatAcademicTitles(school.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.'), MARGIN_LEFT_MM + 10, finalY + 34);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${school.nipKepalaSekolah || '198502022008042014'}`, MARGIN_LEFT_MM + 10, finalY + 38);

    const tgl = sheet.tanggalCetak || 'Desember 2026';
    doc.text(`Tumijajar, ${tgl}`, F4_PAPER_HEIGHT_MM - 80, finalY + 12);
    doc.text('Guru Mata Pelajaran', F4_PAPER_HEIGHT_MM - 80, finalY + 16);
    doc.setFont('times', 'bold');
    doc.text(formatAcademicTitles(sheet.guruName || currentUser?.nama || 'Guru Mata Pelajaran'), F4_PAPER_HEIGHT_MM - 80, finalY + 34);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${sheet.guruNip || currentUser?.nip || '-'}`, F4_PAPER_HEIGHT_MM - 80, finalY + 38);

    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  // Leger Calculations for Tab 4 (Seluruh Mata Pelajaran)
  const legerData = useMemo(() => {
    const classSubjects = state.subjects.map((s) => s.nama).sort();

    const studentLeger = studentsInClass.map((student) => {
      const subjectScores: Record<string, number | null> = {};
      let total = 0;
      let filledCount = 0;
      let tuntasCount = 0;

      classSubjects.forEach((subj) => {
        const sid = `${tahunAjaran}_${semester}_${selectedClass}_${subj}`.replace(/[^a-zA-Z0-9_]/g, '_');
        const sSheet = state.gradeRecapSheets?.find((s) => s.id === sid);
        const sRecord = sSheet?.studentRecords.find((r) => r.studentId === student.id);

        let narVal: number | null = null;
        if (sRecord) {
          const tpVals = Object.values(sRecord.tpScores).filter((v): v is number => typeof v === 'number');
          const nrsTP = tpVals.length > 0 ? tpVals.reduce((a, b) => a + b, 0) / tpVals.length : null;
          let nrsSem: number | null = null;
          if (typeof sRecord.ptsScore === 'number' && typeof sRecord.pasScore === 'number') {
            nrsSem = (sRecord.ptsScore + sRecord.pasScore) / 2;
          } else if (typeof sRecord.ptsScore === 'number') {
            nrsSem = sRecord.ptsScore;
          } else if (typeof sRecord.pasScore === 'number') {
            nrsSem = sRecord.pasScore;
          }

          if (typeof nrsTP === 'number' && typeof nrsSem === 'number') {
            narVal = Math.round((nrsTP + nrsSem) / 2);
          } else if (typeof nrsTP === 'number') {
            narVal = Math.round(nrsTP);
          } else if (typeof nrsSem === 'number') {
            narVal = Math.round(nrsSem);
          }
        }

        subjectScores[subj] = narVal;
        if (typeof narVal === 'number') {
          total += narVal;
          filledCount++;
          if (narVal >= (sheet.kktp || 75)) tuntasCount++;
        }
      });

      const avg = filledCount > 0 ? total / filledCount : 0;
      return {
        student,
        subjectScores,
        total,
        filledCount,
        avg,
        tuntasCount,
        percentTuntas: classSubjects.length > 0 ? Math.round((tuntasCount / classSubjects.length) * 100) : 0,
        rank: 0,
      };
    });

    // Compute Rankings
    const sorted = [...studentLeger].sort((a, b) => b.total - a.total);
    sorted.forEach((item, index) => {
      const match = studentLeger.find((s) => s.student.id === item.student.id);
      if (match) match.rank = index + 1;
    });

    // Subject statistics
    const subjectStats: Record<string, { avg: number; max: number; min: number; tuntas: number }> = {};
    classSubjects.forEach((subj) => {
      const scores = studentLeger
        .map((s) => s.subjectScores[subj])
        .filter((sc): sc is number => typeof sc === 'number');

      if (scores.length > 0) {
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
        const max = Math.max(...scores);
        const min = Math.min(...scores);
        const tuntas = scores.filter((sc) => sc >= (sheet.kktp || 75)).length;
        subjectStats[subj] = { avg, max, min, tuntas };
      } else {
        subjectStats[subj] = { avg: 0, max: 0, min: 0, tuntas: 0 };
      }
    });

    return { classSubjects, studentLeger, subjectStats };
  }, [state.subjects, studentsInClass, tahunAjaran, semester, selectedClass, state.gradeRecapSheets, sheet.kktp]);

  // Export Leger to Excel
  const handleExportLegerExcel = () => {
    const rows = legerData.studentLeger.map((item, idx) => {
      const row: Record<string, any> = {
        NO: idx + 1,
        'NAMA SISWA': item.student.nama,
        NISN: item.student.nisn,
      };
      legerData.classSubjects.forEach((subj) => {
        row[subj] = item.subjectScores[subj] ?? '-';
      });
      row['TOTAL'] = item.total;
      row['RATA-RATA'] = item.avg.toFixed(1);
      row['PERINGKAT'] = item.rank;
      row['% TUNTAS'] = `${item.percentTuntas}%`;
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Leger_${selectedClass}`);
    XLSX.writeFile(wb, `Leger_Nilai_Kelas_${selectedClass}_${tahunAjaran.replace('/', '_')}_${semester}.xlsx`);
    showToast('Export Leger Berhasil', `File Excel Leger nilai kelas ${selectedClass} berhasil diunduh.`, 'success');
  };

  // Print Leger PDF
  const handlePrintLegerPDF = async () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [F4_PAPER_HEIGHT_MM, F4_PAPER_WIDTH_MM],
    });

    const startY = await drawOfficialKop(doc, school, 10, { pageWidth: F4_PAPER_HEIGHT_MM });

    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(`LEGER REKAPITULASI NILAI SISWA KELAS ${selectedClass}`, F4_PAPER_HEIGHT_MM / 2, startY + 5, { align: 'center' });
    doc.setFontSize(9);
    doc.setFont('times', 'normal');
    doc.text(`SEMESTER ${semester.toUpperCase()} TAHUN AJARAN ${tahunAjaran} - ${fase.toUpperCase()}`, F4_PAPER_HEIGHT_MM / 2, startY + 9, { align: 'center' });

    const headRow = [
      'NO',
      'NAMA SISWA',
      ...legerData.classSubjects.map((s) => s.length > 8 ? `${s.substring(0, 6)}..` : s),
      'TOTAL',
      'RATA',
      'RANK',
    ];

    const bodyRows = legerData.studentLeger.map((item, idx) => [
      idx + 1,
      item.student.nama,
      ...legerData.classSubjects.map((s) => item.subjectScores[s] ?? '-'),
      item.total,
      item.avg > 0 ? item.avg.toFixed(1) : '-',
      `#${item.rank}`,
    ]);

    autoTable(doc, {
      startY: startY + 13,
      head: [headRow],
      body: bodyRows,
      styles: { font: 'times', fontSize: 7, cellPadding: 1.5, halign: 'center' },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 45, halign: 'left' },
      },
    });

    const finalY = (doc as any).lastAutoTable?.finalY || startY + 80;

    doc.setFontSize(8);
    doc.text('Mengetahui,', MARGIN_LEFT_MM + 10, finalY + 8);
    doc.text('Kepala SMAN 3 Tumijajar', MARGIN_LEFT_MM + 10, finalY + 12);
    doc.setFont('times', 'bold');
    doc.text(formatAcademicTitles(school.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.'), MARGIN_LEFT_MM + 10, finalY + 28);
    doc.setFont('times', 'normal');
    doc.text(`NIP. ${school.nipKepalaSekolah || '198502022008042014'}`, MARGIN_LEFT_MM + 10, finalY + 32);

    doc.text(`Tumijajar, ${sheet.tanggalCetak || 'Desember 2026'}`, F4_PAPER_HEIGHT_MM - 75, finalY + 8);
    doc.text(`Wali Kelas ${selectedClass}`, F4_PAPER_HEIGHT_MM - 75, finalY + 12);
    doc.setFont('times', 'bold');
    doc.text(formatAcademicTitles(classObj?.waliKelas || teacherForSubject.name), F4_PAPER_HEIGHT_MM - 75, finalY + 28);
    doc.setFont('times', 'normal');
    doc.text(`NIP. -`, F4_PAPER_HEIGHT_MM - 75, finalY + 32);

    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  };

  // =========================================================================
  // PAGINATION CONTROLS (Tampilan Maksimal 10, 25, 50, 100, Semua Data)
  // =========================================================================
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Leger specific pagination
  const [legerPageSize, setLegerPageSize] = useState<number>(10);
  const [legerCurrentPage, setLegerCurrentPage] = useState<number>(1);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
    setLegerCurrentPage(1);
  }, [selectedClass, selectedSubject, searchQuery, tahunAjaran, semester]);

  // Paginated Student Records (Tab 1, Tab 2, Tab e-Rapor, Tab 3)
  const isAll = pageSize === -1 || pageSize >= filteredRecords.length;
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedRecords = useMemo(() => {
    if (isAll) return filteredRecords;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, safeCurrentPage, pageSize, isAll]);

  // Paginated Leger Students (Tab 4)
  const filteredLegerStudents = useMemo(() => {
    if (!searchQuery.trim()) return legerData.studentLeger;
    const q = searchQuery.toLowerCase().trim();
    return legerData.studentLeger.filter((item) => item.student.nama.toLowerCase().includes(q));
  }, [legerData.studentLeger, searchQuery]);

  const isLegerAll = legerPageSize === -1 || legerPageSize >= (filteredLegerStudents?.length || 0);
  const totalLegerPages = isLegerAll ? 1 : Math.max(1, Math.ceil((filteredLegerStudents?.length || 0) / legerPageSize));
  const safeLegerCurrentPage = Math.min(Math.max(1, legerCurrentPage), totalLegerPages);

  const paginatedLegerStudents = useMemo(() => {
    if (isLegerAll) return filteredLegerStudents;
    const start = (safeLegerCurrentPage - 1) * legerPageSize;
    return filteredLegerStudents.slice(start, start + legerPageSize);
  }, [filteredLegerStudents, safeLegerCurrentPage, legerPageSize, isLegerAll]);

  return (
    <div className="space-y-6 antialiased">
      {/* ========================================================================= */}
      {/* MODULE HEADER BANNER                                                      */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-indigo-900/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-xs">
                <Calculator className="w-4 h-4 text-amber-400" />
                MODUL REKAPITULASI NILAI &amp; LEGER SISWA
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1">
                <BrainCircuit className="w-3.5 h-3.5 text-indigo-400" />
                IKM Pembelajaran Mendalam (Deep Learning)
              </span>
            </div>

            {/* Admin Quick Lock/Unlock Controls */}
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-black border flex items-center gap-1.5 shadow-xs ${
                  school.rekapNilaiLocked
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                }`}>
                  {school.rekapNilaiLocked ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <LockOpen className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>{school.rekapNilaiLocked ? 'TERKUNCI GURU (ADMIN MODE)' : 'TERBUKA UNTUK GURU'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next = !school.rekapNilaiLocked;
                    updateSchoolInfo({
                      rekapNilaiLocked: next,
                      rekapNilaiLockReason: school.rekapNilaiLockReason || 'Pengisian nilai rekapitulasi raport & leger siswa saat ini sedang ditutup/dikunci oleh Administrator.',
                    });
                    showToast(
                      next ? 'Modul Dikunci' : 'Modul Dibuka',
                      next ? 'Akses pengisian nilai untuk guru mapel kini dikunci.' : 'Akses pengisian nilai kini dibuka untuk seluruh guru.',
                      next ? 'warning' : 'success'
                    );
                  }}
                  className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer"
                >
                  {school.rekapNilaiLocked ? 'Buka Kunci Guru' : 'Kunci Modul Guru'}
                </button>
              </div>
            ) : isLocked ? (
              <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-xs">
                <Lock className="w-3.5 h-3.5 text-rose-400" />
                DITUTUP BY ADMIN
              </span>
            ) : null}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
              <span>Rekapitulasi Nilai Raport &amp; Leger Rapor Kelas</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mt-1 max-w-4xl">
              Pusat pengolahan nilai sumatif TP, ASTS/PTS, ASAS/PAS dengan <strong>Dua Jalur Input Terintegrasi</strong>: (1) <strong>Tarik Otomatis dari Hasil Asesmen SiMantri</strong> &amp; (2) <strong>Input Manual Langsung (Inline Editing Spreadsheet &amp; Paste Excel)</strong>. Dilengkapi Generator Capaian Kompetensi Kurikulum Merdeka Pembelajaran Mendalam (Deep Learning) dan Leger Nilai Komprehensif.
            </p>
          </div>
        </div>
      </div>

      {/* Lock Warning Notice Banner if Locked */}
      {isLocked && (
        <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-2xl flex items-center gap-3 text-rose-900 text-xs shadow-xs">
          <Lock className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="flex-1 font-semibold">
            <span className="font-bold block text-sm text-rose-950">Pengisian Nilai Sedang Dikunci oleh Administrator:</span>
            <span>{school.rekapNilaiLockReason || 'Modul Rekapitulasi Nilai & Leger Siswa saat ini sedang dikunci oleh Administrator.'}</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* GLOBAL FILTER & CONTROL HEADER (TATA LETAK BERTINGKAT & TERTATA RAPI)     */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        {/* Top Header Row: Status & Primary Save Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-5 h-5 text-indigo-600 shrink-0" />
            <span className="font-extrabold text-slate-900 text-sm">FILTER GLOBAL &amp; PENGATURAN KELAS</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              {studentsInClass.length} Siswa Terdaftar
            </span>
            <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-300">
              Kelas {selectedClass} • {fase}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hidden md:inline-flex">
              {formatMataPelajaran(selectedSubject)}
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* Primary Action: Simpan Perubahan */}
            <button
              type="button"
              disabled={isLocked}
              onClick={handleSaveSheetManual}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Simpan seluruh perubahan nilai dan deskripsi capaian ke sistem"
            >
              <Save className="w-4 h-4 text-emerald-100" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>

        {/* Filter Inputs Grid (4 Kolom Teratur) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
          {/* Filter 1: Tahun Ajaran */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Tahun Ajaran</label>
            <select
              value={tahunAjaran}
              onChange={(e) => setTahunAjaran(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="2025/2026">2025/2026</option>
              <option value="2026/2027">2026/2027</option>
              <option value="2027/2028">2027/2028</option>
            </select>
          </div>

          {/* Filter 2: Semester */}
          <div className="space-y-1">
            <label className="font-bold text-slate-700 block">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value as 'Ganjil' | 'Genap')}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Ganjil">Ganjil (I)</option>
              <option value="Genap">Genap (II)</option>
            </select>
          </div>

          {/* Filter 3: Kelas & Fase Indicator */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700 block">Kelas / Rombel</label>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                {fase}
              </span>
            </div>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 4: Mata Pelajaran */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-2">
            <label className="font-bold text-slate-700 block">Mata Pelajaran</label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {availableSubjects.map((sbj) => (
                <option key={sbj} value={sbj}>
                  {formatMataPelajaran(sbj)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BILAH TOMBOL AKSI TERSTRUKTUR (3 SUSUNAN JALUR PRESISI & PROFESIONAL)     */}
        {/* ========================================================================= */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/90 space-y-3 shadow-xs">
          {/* JALUR 1: PENGISIAN NILAI, SINKRONISASI & IMPOR HISTORIS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 rounded-lg text-[10.5px]">Jalur 1: Input &amp; Impor</span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Pilih metode input nilai, sinkronisasi asesmen, atau impor riwayat</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Tarik Otomatis Asesmen SiMantri */}
              <button
                type="button"
                disabled={isLockedOrFinal}
                onClick={() => {
                  setSyncModeTab('auto_all');
                  setIsSyncModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                title="Tarik nilai langsung dari hasil asesmen/ujian SiMantri"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Tarik Asesmen SiMantri ({matchingAssessments.length})</span>
              </button>

              {/* Input Manual / Paste Excel */}
              <button
                type="button"
                disabled={isLockedOrFinal}
                onClick={() => setIsManualBatchModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold text-xs border border-purple-200 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                title="Fitur bantu input manual massal, paste Excel & kelola kolom"
              >
                <Edit3 className="w-3.5 h-3.5 text-purple-600" />
                <span>Input Manual / Paste Excel</span>
              </button>

              {/* FITUR BARU: Impor Leger Excel (Tahun & Kelas Sebelumnya) */}
              <button
                type="button"
                onClick={() => setIsHistoricalImportOpen(true)}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                title="Impor file Excel leger dari tahun ajaran atau kelas sebelumnya yang terhubung ke database siswa"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-200" />
                <span>Impor Leger Historis (Tahun/Kelas Sebelumnya)</span>
              </button>

              {/* Pengaturan Bobot & KKTP */}
              <button
                type="button"
                disabled={isLockedOrFinal}
                onClick={() => setIsWeightModalOpen(true)}
                className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                title="Atur persentase bobot TP, PTS, PAS & KKTP"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Bobot &amp; KKTP</span>
              </button>

              {/* Contoh TP Spesifikasi */}
              <button
                type="button"
                disabled={isLockedOrFinal}
                onClick={handleApplySampleTPFromPrompt}
                className="px-3 py-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-900 font-bold text-xs border border-sky-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                title="Terapkan contoh TP & materi HAM/Demokrasi/Talenta"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                <span>Contoh TP</span>
              </button>

              {/* 1-Klik Tarik Semua */}
              {matchingAssessments.length > 0 && (
                <button
                  type="button"
                  disabled={isLockedOrFinal}
                  onClick={handleRunSmartAutoSyncAll}
                  className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Tarik seluruh asesmen yang cocok dalam 1 klik"
                >
                  <Zap className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1-Klik Tarik</span>
                </button>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200/80 my-1" />

          {/* JALUR 2: OUTPUT DOKUMEN, FORMAT LEGER EXCEL, PREVIEW & EKSPOR PDF */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 rounded-lg text-[10.5px]">Jalur 2: Output &amp; Dokumen</span>
              <span className="text-slate-400 hidden sm:inline">•</span>
              <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Format e-Rapor, unduh format template leger Excel, pratinjau &amp; cetak PDF</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* FITUR BARU: Unduh Format Leger Excel Resmi */}
              <button
                type="button"
                onClick={handleDownloadLegerTemplate}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 btn-spring"
                title="Unduh format template Excel leger nilai siswa lengkap dengan daftar siswa kelas aktif dan rumus penjumlahan/rata-rata"
              >
                <FileDown className="w-4 h-4 text-emerald-600" />
                <span>Unduh Format Leger Excel</span>
              </button>

              {/* Format e-Rapor SMA */}
              <button
                type="button"
                onClick={() => {
                  setERaporModalTab('export');
                  setIsERaporModalOpen(true);
                }}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-700 to-indigo-800 hover:from-blue-800 hover:to-indigo-900 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Ekspor & Sinkronisasi Format Resmi e-Rapor SMA"
              >
                <CheckSquare className="w-3.5 h-3.5 text-cyan-300" />
                <span>Format e-Rapor SMA</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-400 text-slate-950 font-black uppercase">Resmi</span>
              </button>

              {/* Export Rekap Excel */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Unduh seluruh rekap nilai dalam file Microsoft Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export Rekap Excel</span>
              </button>

              {/* FITUR BARU: Pratinjau PDF Lembar Aktif */}
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'tab1') handleOpenTab1Preview();
                  else if (activeTab === 'tab2') handleOpenTab2Preview();
                  else if (activeTab === 'tab_erapor') handleOpenTabERaporPreview();
                  else if (activeTab === 'tab3') handleOpenTab3Preview();
                  else if (activeTab === 'tab4') handleOpenTab4LegerPreview();
                  else handleOpenTab1Preview();
                }}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-black text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Lihat pratinjau dokumen PDF resmi F4 di layar sebelum dicetak"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pratinjau PDF Resmi</span>
              </button>

              {/* Cetak / Ekspor PDF Resmi */}
              <button
                type="button"
                onClick={() => {
                  if (activeTab === 'tab1') handleDownloadTab1PDF();
                  else if (activeTab === 'tab2') handleDownloadTab2PDF();
                  else if (activeTab === 'tab_erapor') handleDownloadTabERaporPDF();
                  else if (activeTab === 'tab3') handleDownloadTab3PDF();
                  else if (activeTab === 'tab4') handleDownloadTab4LegerPDF();
                  else handlePrintPDF();
                }}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 border border-slate-300 font-bold text-xs shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                title="Cetak/ekspor dokumen resmi rekap nilai lengkap dengan kop kedinasan"
              >
                <Printer className="w-3.5 h-3.5 text-indigo-600" />
                <span>Ekspor PDF Dokumen</span>
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200/80 my-1" />

          {/* JALUR 3: STATUS DRAF OTOMATIS & PENGUNCIAN PERMANEN (FINAL) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-slate-200">
            <div className="flex items-center gap-3">
              {isSheetFinalLocked ? (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-300 flex items-center justify-center text-rose-600 shrink-0">
                    <Lock className="w-4 h-4 text-rose-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase text-rose-700 tracking-wider">
                        STATUS: DOKUMEN RESMI TERSIMPAN PERMANEN (FINAL)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 uppercase">
                        Terkunci Mutlak
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Dikunci oleh: <span className="font-bold text-slate-900">{sheet.finalizedBy || 'Guru Pengampu'}</span>
                      {sheet.finalizedAt && ` • ${new Date(sheet.finalizedAt).toLocaleString('id-ID')}`}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-300 flex items-center justify-center text-emerald-600 shrink-0">
                    <FileCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800">
                        {isAutosaving
                          ? 'Sistem sedang menyimpan draf nilai otomatis...'
                          : lastAutosavedTime
                          ? `Draf Tersimpan Otomatis (pukul ${lastAutosavedTime})`
                          : 'Draf Nilai Siswa Aktif (Dapat diedit bebas)'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Sistem mencatat setiap perubahan nilai secara real-time. Klik "Kunci Final" jika nilai sudah tuntas.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isSheetFinalLocked ? (
                isAdmin && (
                  <button
                    type="button"
                    onClick={handleUnlockAdmin}
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                    title="Buka kunci dokumen nilai (Wewenang Khusus Administrator)"
                  >
                    <LockOpen className="w-4 h-4" />
                    <span>Buka Kunci (Admin Override)</span>
                  </button>
                )
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleSaveDraftManual}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                    title="Simpan perubahan draf nilai saat ini"
                  >
                    <Save className="w-3.5 h-3.5 text-slate-600" />
                    <span>Simpan Draf Sekarang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPermanentLockModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 via-rose-700 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md active:scale-95"
                    title="Kunci seluruh nilai siswa secara permanen dengan modal konfirmasi penting"
                  >
                    <Lock className="w-3.5 h-3.5 text-rose-200" />
                    <span>Kunci &amp; Simpan Permanen (Final)</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB NAVIGATION BUTTONS (HANYA DITAMPILKAN JIKA showTabs = true)          */}
      {/* ========================================================================= */}
      {showTabs && (
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('tab1')}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tab1'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>REKAP NILAI RAPOR (SUMATIF &amp; AKHIR)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tab2')}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tab2'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>PENILAIAN PENGETAHUAN &amp; CAPAIAN KOMPETENSI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tab3')}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tab3'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>FINAL NILAI RAPOR (SIAP CETAK &amp; EKSPOR)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tab4')}
            className={`px-4 py-2.5 rounded-2xl font-black text-xs transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'tab4'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>LEGER NILAI SISWA (SELURUH MAPEL)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('tab_erapor')}
            className={`px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ml-auto ${
              activeTab === 'tab_erapor'
                ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-md ring-2 ring-blue-300'
                : 'bg-white text-blue-900 hover:bg-blue-50 border border-blue-200'
            }`}
          >
            <CheckSquare className="w-4 h-4 text-cyan-500" />
            <span>FORMAT RESMI E-RAPOR SMA</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-cyan-400 text-slate-950 uppercase">Kemendikbud</span>
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: REKAP NILAI RAPORT (Kalkulasi Sumatif & Akhir)                     */}
      {/* ========================================================================= */}
      {activeTab === 'tab1' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {/* Header Informasi 2 Kolom (Kiri & Kanan) */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-600 font-bold uppercase">MATA PELAJARAN :</span>
                <span className="font-extrabold text-slate-900">{sheet.mataPelajaran}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold uppercase">KELAS :</span>
                <span className="font-extrabold text-indigo-700">{sheet.kelas} ({fase})</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <span className="text-slate-600 font-bold uppercase">GURU :</span>
                <span className="font-extrabold text-slate-900">{formatAcademicTitles(sheet.guruName)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold uppercase">KKTP :</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    disabled={isLocked}
                    value={sheet.kktp}
                    onChange={(e) => {
                      const val = Number(e.target.value) || 75;
                      const updated = { ...sheet, kktp: val };
                      setSheet(updated);
                      saveGradeRecapSheet(updated);
                    }}
                    className="w-16 p-1 text-center bg-amber-100 border border-amber-300 rounded-lg font-black text-amber-950 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50"
                  />
                  <span className="text-slate-400 font-bold">/ 100</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sub-Header: Active TP Count Control, Mode Notice, and Manual Actions (Disusun 2 Baris Rapi) */}
          <div className="bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
            {/* Baris Atas: Pengaturan Jumlah TP & Status Mode Input */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-700">Jumlah Kolom TP:</span>
                  <div className="flex items-center gap-1 bg-amber-50 p-1 rounded-xl border border-amber-300">
                    <button
                      type="button"
                      disabled={isLocked || activeTPCount <= 1}
                      onClick={handleRemoveTP}
                      className="w-6 h-6 rounded-lg bg-white border border-amber-300 flex items-center justify-center font-bold text-amber-950 hover:bg-amber-100 disabled:opacity-40 cursor-pointer"
                      title="Kurangi kolom TP"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 font-black text-amber-950 text-xs">{activeTPCount} TP</span>
                    <button
                      type="button"
                      disabled={isLocked || activeTPCount >= 6}
                      onClick={handleAddTP}
                      className="w-6 h-6 rounded-lg bg-white border border-amber-300 flex items-center justify-center font-bold text-amber-950 hover:bg-amber-100 disabled:opacity-40 cursor-pointer"
                      title="Tambah kolom TP"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-slate-600 font-medium">
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold">
                    <Zap className="w-3 h-3 text-cyan-600" />
                    Tarik Otomatis
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-bold">
                    <Edit3 className="w-3 h-3 text-purple-600" />
                    Input Manual (Inline)
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => setIsManualBatchModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Buka form tempel data massal dari Excel"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-purple-700" />
                  <span>Tempel Excel Cepat</span>
                </button>
              </div>
            </div>

            {/* Baris Bawah: Pencarian Siswa & Impor File Excel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa pada kelas ini..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-xs shadow-2xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Impor File Excel</span>
                  <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" disabled={isLockedOrFinal} />
                </label>

                <button
                  type="button"
                  onClick={handleOpenTab1Preview}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Pratinjau dokumen PDF Rekap Nilai Rapor"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Pratinjau PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTab1PDF}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  title="Unduh file PDF Rekap Nilai Rapor"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-100" />
                  <span>Ekspor PDF</span>
                </button>

                {searchQuery.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table Spreadsheet View */}
          <div className="overflow-x-auto rounded-2xl border border-slate-300 shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-black text-center uppercase tracking-wider">
                  <th rowSpan={2} className="p-2.5 border border-slate-700 w-10">No</th>
                  <th rowSpan={2} className="p-2.5 border border-slate-700 min-w-[200px] text-left">Nama</th>
                  <th rowSpan={2} className="p-2.5 border border-slate-700 w-16">Kelas</th>
                  <th colSpan={activeTPCount} className="p-2 border border-slate-700 bg-amber-600/95 text-amber-100">
                    NILAI SUMATIF
                  </th>
                  <th rowSpan={2} className="p-2.5 border border-slate-700 bg-blue-700 text-white w-20" title="Nilai Rata-rata Sumatif TP (Lingkup Materi)">
                    NRS
                  </th>
                  <th colSpan={2} className="p-2 border border-slate-700 bg-indigo-700 text-indigo-100">
                    NS
                  </th>
                  <th rowSpan={2} className="p-2.5 border border-slate-700 bg-blue-700 text-white w-20" title="Nilai Rata-rata Sumatif Semester">
                    NRS
                  </th>
                  <th rowSpan={2} className="p-2.5 border border-slate-700 bg-orange-500 text-slate-950 font-black w-20" title="Nilai Akhir">
                    NA
                  </th>
                  <th rowSpan={2} className="p-2.5 border border-slate-700 bg-amber-400 text-slate-950 font-black w-20" title="Nilai Akhir Raport">
                    NAR
                  </th>
                </tr>
                <tr className="bg-slate-700 text-white font-bold text-center text-[11px]">
                  {activeTPKeys.map((k, i) => (
                    <th key={k} className="p-1.5 border border-slate-600 bg-amber-500/20 text-amber-200 w-16">
                      TP {i + 1}
                    </th>
                  ))}
                  <th className="p-1.5 border border-slate-600 bg-indigo-600/30 text-indigo-200 w-16">PTS</th>
                  <th className="p-1.5 border border-slate-600 bg-indigo-600/30 text-indigo-200 w-16">PAS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6 + activeTPCount} className="p-8 text-center text-slate-500 italic">
                      Tidak ada data siswa ditemukan untuk kelas {selectedClass}.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((r, idx) => {
                    const rowNumber = isAll ? idx + 1 : (safeCurrentPage - 1) * pageSize + idx + 1;
                    const { nrsTP, nrsSemester, na, nar } = calculateStudentAverages(r);
                    const kktp = sheet.kktp || 75;
                    const isBelowKKTP = typeof nar === 'number' && nar < kktp;

                    return (
                      <tr key={r.studentId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-2 text-center text-slate-500 border border-slate-200 font-bold">{rowNumber}</td>
                        <td className="p-2 border border-slate-200 font-bold text-slate-900">{r.studentName}</td>
                        <td className="p-2 text-center border border-slate-200 text-slate-600">{r.kelas}</td>

                        {/* Active TP Input Columns (Highlighted Soft Yellow) with keyboard nav & source badges */}
                        {activeTPKeys.map((tpKey) => {
                          const isManual = Boolean(r.manualFlags?.[tpKey]);
                          const syncSource = r.syncSources?.[tpKey];
                          return (
                            <td key={tpKey} className="p-1 text-center border border-slate-200 bg-amber-50/50 relative group">
                              <div className="relative flex items-center justify-center">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  disabled={isLockedOrFinal}
                                  data-row={rowNumber - 1}
                                  data-col={tpKey}
                                  value={r.tpScores[tpKey] ?? ''}
                                  onChange={(e) => handleScoreChange(r.studentId, tpKey, e.target.value)}
                                  onKeyDown={(e) => handleCellKeyDown(e, rowNumber - 1, tpKey)}
                                  placeholder="-"
                                  className="w-14 text-center py-1 bg-white border border-amber-300 rounded font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none disabled:opacity-50 text-xs"
                                />
                                {syncSource && !isManual && (
                                  <span
                                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-500 rounded-full border border-white shadow-2xs pointer-events-none"
                                    title={`Ditarik otomatis dari: ${syncSource}`}
                                  />
                                )}
                                {isManual && (
                                  <span
                                    className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full border border-white shadow-2xs pointer-events-none"
                                    title="Diinput/diedit secara manual"
                                  />
                                )}
                              </div>
                            </td>
                          );
                        })}

                        {/* NRS TP (Nilai Rata-rata Sumatif Lingkup Materi) */}
                        <td className="p-2 text-center border border-slate-200 bg-blue-50 font-black text-blue-900 text-xs">
                          {nrsTP !== null ? nrsTP.toFixed(1) : '-'}
                        </td>

                        {/* PTS Input */}
                        <td className="p-1 text-center border border-slate-200 bg-indigo-50/30">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              disabled={isLockedOrFinal}
                              data-row={rowNumber - 1}
                              data-col="PTS"
                              value={r.ptsScore ?? ''}
                              onChange={(e) => handleScoreChange(r.studentId, 'PTS', e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, rowNumber - 1, 'PTS')}
                              placeholder="-"
                              className="w-14 text-center py-1 bg-white border border-indigo-200 rounded font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 text-xs"
                            />
                            {r.syncSources?.['PTS'] && !r.manualFlags?.['PTS'] && (
                              <span
                                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-500 rounded-full border border-white shadow-2xs pointer-events-none"
                                title={`Ditarik otomatis dari: ${r.syncSources['PTS']}`}
                              />
                            )}
                            {r.manualFlags?.['PTS'] && (
                              <span
                                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full border border-white shadow-2xs pointer-events-none"
                                title="Diinput manual"
                              />
                            )}
                          </div>
                        </td>

                        {/* PAS Input */}
                        <td className="p-1 text-center border border-slate-200 bg-indigo-50/30">
                          <div className="relative flex items-center justify-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              disabled={isLockedOrFinal}
                              data-row={rowNumber - 1}
                              data-col="PAS"
                              value={r.pasScore ?? ''}
                              onChange={(e) => handleScoreChange(r.studentId, 'PAS', e.target.value)}
                              onKeyDown={(e) => handleCellKeyDown(e, rowNumber - 1, 'PAS')}
                              placeholder="-"
                              className="w-14 text-center py-1 bg-white border border-indigo-200 rounded font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50 text-xs"
                            />
                            {r.syncSources?.['PAS'] && !r.manualFlags?.['PAS'] && (
                              <span
                                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-500 rounded-full border border-white shadow-2xs pointer-events-none"
                                title={`Ditarik otomatis dari: ${r.syncSources['PAS']}`}
                              />
                            )}
                            {r.manualFlags?.['PAS'] && (
                              <span
                                className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-purple-500 rounded-full border border-white shadow-2xs pointer-events-none"
                                title="Diinput manual"
                              />
                            )}
                          </div>
                        </td>

                        {/* NRS Semester */}
                        <td className="p-2 text-center border border-slate-200 bg-blue-50 font-black text-blue-900 text-xs">
                          {nrsSemester !== null ? nrsSemester.toFixed(1) : '-'}
                        </td>

                        {/* NA (Nilai Akhir) */}
                        <td className="p-2 text-center border border-slate-200 bg-orange-50 font-black text-orange-950 text-xs">
                          {na !== null ? na.toFixed(1) : '-'}
                        </td>

                        {/* NAR (Nilai Akhir Raport) */}
                        <td className={`p-2 text-center border border-slate-200 font-black text-sm ${
                          isBelowKKTP ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-amber-300 text-slate-950'
                        }`}>
                          {nar !== null ? (
                            <span className="flex items-center justify-center gap-1">
                              <span>{nar}</span>
                              {isBelowKKTP && <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination for Tab 1 */}
          <TablePagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredRecords.length}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100, -1]}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: REKAP PENILAIAN PENGETAHUAN & GENERATOR CAPAIAN KOMPETENSI         */}
      {/* ========================================================================= */}
      {activeTab === 'tab2' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {/* Header Informasi & Kurikulum 2 Kolom (Kiri & Kanan) */}
          <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold">
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-amber-200 pb-1">
                <span className="text-slate-600 font-bold uppercase">NAMA GURU:</span>
                <span className="text-slate-900 font-extrabold">{formatAcademicTitles(sheet.guruName)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-amber-200 pb-1">
                <span className="text-slate-600 font-bold uppercase">MATA PELAJARAN:</span>
                <span className="text-amber-950 font-extrabold">{sheet.mataPelajaran}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600 font-bold uppercase">KELAS:</span>
                <span className="text-indigo-800 font-extrabold">{sheet.kelas}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-amber-200 pb-1">
                <span className="text-slate-600 font-bold uppercase">FASE:</span>
                <span className="px-2.5 py-0.5 rounded bg-amber-200 text-amber-950 font-black">{fase.replace('Fase ', '')}</span>
              </div>
              <div className="space-y-1">
                <label className="font-black text-slate-800 uppercase block">MATERI :</label>
                <input
                  type="text"
                  disabled={isLocked}
                  value={sheet.materiText || ''}
                  onChange={(e) => {
                    const updated = { ...sheet, materiText: e.target.value };
                    setSheet(updated);
                    saveGradeRecapSheet(updated);
                  }}
                  className="w-full p-2 bg-amber-100 border border-amber-300 rounded-xl font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                  placeholder='Contoh: "HAM, DEMOKRASI & TALENTA"'
                />
              </div>
            </div>
          </div>

          {/* Capaian Tujuan Pembelajaran Textarea */}
          <div className="space-y-1 text-xs">
            <label className="font-black text-slate-800 uppercase block">CAPAIAN TUJUAN PEMBELAJARAN :</label>
            <textarea
              disabled={isLocked}
              value={sheet.capaianPembelajaranText || ''}
              onChange={(e) => {
                const updated = { ...sheet, capaianPembelajaranText: e.target.value };
                setSheet(updated);
                saveGradeRecapSheet(updated);
              }}
              rows={2}
              className="w-full p-2.5 bg-amber-100 border border-amber-300 rounded-xl font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed disabled:opacity-50"
              placeholder='Contoh: "12.1 Peserta didik mampu mewujudkan peran sebagai pembawa damai sejahtera..."'
            />
          </div>

          {/* Generator Controls: Style Selector & One-Click Apply (Tertata Rapi Bertingkat) */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 via-sky-50 to-indigo-50 rounded-2xl border border-indigo-200 space-y-3 text-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-indigo-100">
              <span className="font-black text-indigo-950 flex items-center gap-1.5 text-sm">
                <BrainCircuit className="w-4 h-4 text-indigo-600" />
                <span>Kaidah Generator Capaian Kompetensi Kurikulum Merdeka Pembelajaran Mendalam</span>
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200 self-start md:self-auto">
                Kombinasi TP Max + TP Min
              </span>
            </div>
            
            <p className="text-[11.5px] text-slate-600 leading-relaxed">
              Menyusun kalimat deskripsi rapor otomatis dari <strong>TP Maksimal (tertinggi)</strong> dan <strong>TP Minimal (terendah)</strong> berdasarkan prinsip Pembelajaran Mendalam (Deep Learning: Berkesadaran/Mindful, Bermakna/Meaningful, Menyenangkan/Joyful, serta 8 Dimensi &amp; Penalaran Kritis).
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <span className="font-bold text-slate-700 shrink-0">Gaya Narasi:</span>
                <select
                  value={competencyStyle}
                  onChange={(e) => {
                    const newStyle = e.target.value as CompetencyStyleType;
                    setCompetencyStyle(newStyle);
                  }}
                  className="w-full p-2 bg-white border border-indigo-300 rounded-xl font-bold text-indigo-950 outline-none focus:ring-2 focus:ring-indigo-500 text-xs shadow-2xs cursor-pointer"
                >
                  <option value="kurikulum_merdeka">Standar Resmi Kurikulum Merdeka (IKM Kemendikdasmen)</option>
                  <option value="deep_learning">Pembelajaran Mendalam (Deep Learning - 8 Dimensi)</option>
                  <option value="narasi_rapor">Gaya Narasi Komprehensif (Rapor Akhir Semester)</option>
                </select>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={() => handleRegenerateAllCompetencies()}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Terapkan gaya kalimat ke seluruh siswa"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-300" />
                  <span>Generate Otomatis</span>
                </button>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleAutoTrimAllTP}
                  className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                  title="Pangkas deskripsi TP maksimal 100 karakter"
                >
                  <span>Pangkas 100 Karakter</span>
                </button>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleApplySampleTPFromPrompt}
                  className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
                  title="Terapkan contoh TP & materi sesuai panduan spesifikasi"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                  <span>Contoh TP Panduan</span>
                </button>
              </div>
            </div>
          </div>

          {/* Split Layout: Main Student Table (Left) & TP Reference Table (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Main Assessment Table */}
            <div className="lg:col-span-2 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 uppercase block">Tabel Utama Penilaian Pengetahuan</span>
                  <span className="text-slate-500 text-[11px]">*Nilai TP tersinkron otomatis 2 arah dengan lembar Rekap Nilai Rapor. Nilai, Max, Min, dan Capaian Kompetensi terhitung real-time.</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleOpenTab2Preview}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Pratinjau lembar Capaian Kompetensi PDF"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Pratinjau PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTab2PDF}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Unduh file PDF Capaian Kompetensi"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-100" />
                    <span>Ekspor PDF</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-300 shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-black text-center uppercase tracking-wider">
                      <th rowSpan={2} className="p-2 border border-slate-700 w-10">NO</th>
                      <th rowSpan={2} className="p-2 border border-slate-700 min-w-[150px] text-left">NAMA</th>
                      <th colSpan={activeTPCount} className="p-1.5 border border-slate-700 bg-amber-600 text-amber-100">
                        PENILAIAN
                      </th>
                      <th rowSpan={2} className="p-2 border border-slate-700 bg-blue-700 text-white w-14" title="Rata-rata Nilai TP Siswa">NILAI</th>
                      <th rowSpan={2} className="p-2 border border-slate-700 bg-emerald-700 text-white w-12" title="Kode TP Tertinggi">MAX</th>
                      <th rowSpan={2} className="p-2 border border-slate-700 bg-rose-700 text-white w-12" title="Kode TP Terendah">MIN</th>
                      <th rowSpan={2} className="p-2 border border-slate-700 min-w-[240px] text-left bg-indigo-900 text-indigo-100">
                        CAPAIAN KOMPETENSI
                      </th>
                    </tr>
                    <tr className="bg-slate-700 text-white font-bold text-center text-[10px]">
                      {activeTPKeys.map((k) => (
                        <th key={k} className="p-1 border border-slate-600 bg-amber-500/20">{k}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                    {paginatedRecords.length === 0 ? (
                      <tr>
                        <td colSpan={6 + activeTPCount} className="p-8 text-center text-slate-500 italic">
                          Tidak ada data siswa ditemukan untuk kelas {selectedClass}.
                        </td>
                      </tr>
                    ) : (
                      paginatedRecords.map((r, idx) => {
                        const rowNumber = isAll ? idx + 1 : (safeCurrentPage - 1) * pageSize + idx + 1;
                        const { nrsTP, maxTPCode, minTPCode } = calculateStudentAverages(r);
                        const generatedDesc = generateCompetencyText(r);
                        const hasManualOverride = Boolean(r.manualCompetencyDesc && r.manualCompetencyDesc.trim().length > 0);

                        return (
                          <tr key={r.studentId} className="hover:bg-slate-50/80">
                            <td className="p-2 text-center text-slate-500 border border-slate-200 font-bold">{rowNumber}</td>
                            <td className="p-2 border border-slate-200 font-bold text-slate-900">{r.studentName}</td>

                            {activeTPKeys.map((tpKey) => (
                              <td key={tpKey} className="p-1 text-center border border-slate-200 bg-amber-50/30">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  disabled={isLockedOrFinal}
                                  data-row={rowNumber - 1}
                                  data-col={`TAB2_${tpKey}`}
                                  value={r.tpScores[tpKey] ?? ''}
                                  onChange={(e) => handleScoreChange(r.studentId, tpKey, e.target.value)}
                                  placeholder="-"
                                  className="w-12 text-center py-0.5 bg-white border border-amber-300 rounded font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 outline-none text-[11px] disabled:opacity-50"
                                />
                              </td>
                            ))}

                            <td className="p-2 text-center border border-slate-200 bg-blue-100 font-black text-blue-950">
                              {nrsTP !== null ? nrsTP.toFixed(1) : '-'}
                            </td>

                            <td className="p-2 text-center border border-slate-200 bg-emerald-50 font-black text-emerald-800 text-[10px]">
                              {maxTPCode !== '-' ? <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 rounded font-black">{maxTPCode}</span> : '-'}
                            </td>

                            <td className="p-2 text-center border border-slate-200 bg-rose-50 font-black text-rose-800 text-[10px]">
                              {minTPCode !== '-' ? <span className="px-1.5 py-0.5 bg-rose-100 text-rose-900 rounded font-black">{minTPCode}</span> : '-'}
                            </td>

                            <td className="p-2 border border-slate-200 bg-indigo-50/30">
                              <div className="space-y-1">
                                <textarea
                                  disabled={isLockedOrFinal}
                                  value={r.manualCompetencyDesc ?? generatedDesc}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    const updatedRecs = sheet.studentRecords.map((rec) =>
                                      rec.studentId === r.studentId ? { ...rec, manualCompetencyDesc: val } : rec
                                    );
                                    const updated = { ...sheet, studentRecords: updatedRecs };
                                    setSheet(updated);
                                    triggerDebouncedAutosave(updated);
                                  }}
                                  rows={2}
                                  className="w-full p-1.5 bg-white border border-indigo-200 rounded-lg text-[11px] font-medium text-slate-800 leading-snug outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                />
                                {hasManualOverride && (
                                  <button
                                    type="button"
                                    onClick={() => handleResetStudentCompetency(r.studentId)}
                                    className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Kembalikan ke Narasi Otomatis</span>
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

              {/* Table Pagination for Tab 2 */}
              <TablePagination
                currentPage={safeCurrentPage}
                totalPages={totalPages}
                pageSize={pageSize}
                totalItems={filteredRecords.length}
                onPageChange={(p) => setCurrentPage(p)}
                onPageSizeChange={(s) => {
                  setPageSize(s);
                  setCurrentPage(1);
                }}
                pageSizeOptions={[10, 25, 50, 100, -1]}
              />
            </div>

            {/* Right Col: Tabel Referensi Tujuan Pembelajaran */}
            <div className="space-y-3">
              <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl font-black text-xs uppercase flex items-center justify-between shadow-2xs">
                <span>Tabel Referensi Tujuan Pembelajaran</span>
                <Sliders className="w-4 h-4" />
              </div>

              <div className="overflow-hidden rounded-2xl border border-amber-300 shadow-xs bg-white">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-amber-600 text-amber-100 font-bold uppercase text-[11px]">
                      <th className="p-2.5 border-b border-amber-500 w-20 text-center">KET TP</th>
                      <th className="p-2.5 border-b border-amber-500 bg-amber-500 text-slate-950 font-black">
                        Tujuan Pembelajaran :
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-200">
                    {(sheet.tpConfigs || defaultTPConfigs).slice(0, activeTPCount).map((tp, idx) => (
                      <tr key={tp.code} className="hover:bg-amber-50/50">
                        <td className="p-2.5 text-center font-black text-amber-950 align-top bg-amber-50/80 border-r border-amber-200">
                          <span className="px-2 py-0.5 rounded bg-amber-200 border border-amber-300 block text-xs">
                            {tp.code}
                          </span>
                        </td>
                        <td className="p-2 align-top bg-amber-50/40">
                          <textarea
                            maxLength={100}
                            disabled={isLocked}
                            value={tp.description}
                            onChange={(e) => {
                              const raw = e.target.value;
                              const trimmed = raw.length > 100 ? raw.substring(0, 100) : raw;
                              if (raw.length > 100) {
                                showToast('Batas Karakter', 'Deskripsi TP dibatasi maksimal 100 karakter untuk kesesuaian format resmi e-Rapor SMA.', 'warning');
                              }
                              const newConfigs = (sheet.tpConfigs || defaultTPConfigs).map((t) =>
                                t.code === tp.code ? { ...t, description: trimmed } : t
                              );
                              const updated = { ...sheet, tpConfigs: newConfigs, updatedAt: new Date().toISOString() };
                              setSheet(updated);
                              saveGradeRecapSheet(updated);
                            }}
                            rows={2}
                            className="w-full p-2 bg-amber-100 border border-amber-300 rounded-xl text-xs font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
                            placeholder={`Deskripsi ${tp.code} diawali huruf kecil (maks. 100 karakter)...`}
                          />
                          <div className="flex justify-end mt-0.5">
                            <span className="text-[10px] text-amber-800 font-bold">
                              {(tp.description || '').length}/100 karakter
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB E-RAPOR: TINGKAT KETERCAPAIAN TP & FORMAT IMPORT E-RAPOR SMA          */}
      {/* ========================================================================= */}
      {activeTab === 'tab_erapor' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {/* Header Card & Ringkasan Validasi */}
          <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl text-white shadow-md space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-cyan-400 text-slate-950 uppercase tracking-wider">
                    Format Resmi e-Rapor SMA
                  </span>
                  <span className="text-xs text-blue-200 font-semibold">
                    {sheet.mataPelajaran} • Kelas {sheet.kelas}
                  </span>
                </div>
                <h3 className="text-lg font-black tracking-tight text-white mt-1">
                  Tingkat Ketercapaian TP &amp; Validasi e-Rapor SMA
                </h3>
                <p className="text-xs text-slate-300 max-w-3xl leading-relaxed mt-0.5">
                  Pengisian ketercapaian TP menggunakan sistem Ceklis (Checkbox) cepat: <strong>Optimal (T)</strong> dan <strong>Perlu Peningkatan (R)</strong> dengan kalkulasi validasi real-time sebelum diekspor ke format resmi Excel e-Rapor SMA.
                </p>
              </div>

              {/* Main Modal Trigger Button */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setERaporModalTab('export');
                    setIsERaporModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95 btn-spring"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                  <span>Export Format e-Rapor</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setERaporModalTab('import');
                    setIsERaporModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
                  title="Sinkronkan dengan template Excel asli unduhan e-Rapor sekolah"
                >
                  <Upload className="w-4 h-4 text-cyan-300" />
                  <span>Sinkron Template</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenTabERaporPreview}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Pratinjau lembar validasi e-Rapor PDF"
                >
                  <Eye className="w-4 h-4 text-cyan-300" />
                  <span>Pratinjau PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadTabERaporPDF}
                  className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Unduh lembar validasi e-Rapor PDF"
                >
                  <Printer className="w-4 h-4 text-cyan-300" />
                  <span>Ekspor PDF</span>
                </button>
              </div>
            </div>

            {/* Validation Statistics Bar */}
            {(() => {
              const totalStudents = sheet.studentRecords.length;
              const validStudents = sheet.studentRecords.filter((r) => getStudentERaporValidation(r).isValid).length;
              const invalidStudents = totalStudents - validStudents;
              const validPercent = totalStudents > 0 ? Math.round((validStudents / totalStudents) * 100) : 0;

              return (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10.5px] text-slate-300 block">Total Peserta Didik</span>
                    <span className="text-lg font-black text-white">{totalStudents} Siswa</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                    <span className="text-[10.5px] text-emerald-200 block">Status Valid e-Rapor</span>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-lg font-black text-emerald-300">{validStudents} Siswa</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-400/30">
                    <span className="text-[10.5px] text-rose-200 block">Perlu Penyesuaian</span>
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                      <span className="text-lg font-black text-rose-300">{invalidStudents} Siswa</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[10.5px] text-slate-300 block">Kesiapan Validasi</span>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-cyan-300">{validPercent}%</span>
                      <div className="w-16 h-2 rounded-full bg-slate-700 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full transition-all duration-300"
                          style={{ width: `${validPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* TP Character Length Warning Banner (if any TP exceeds 100 chars) */}
          {(() => {
            const overlengthTPs = (sheet.tpConfigs || defaultTPConfigs).slice(0, activeTPCount).filter((t) => (t.description || '').length > 100);
            if (overlengthTPs.length === 0) return null;
            return (
              <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-black text-amber-950">
                      Peringatan Batas 100 Karakter Tujuan Pembelajaran (e-Rapor SMA)
                    </h4>
                    <p className="text-amber-800 text-[11px] mt-0.5">
                      Terdapat {overlengthTPs.length} TP ({overlengthTPs.map((t) => t.code).join(', ')}) yang deskripsinya melebihi 100 karakter. e-Rapor SMA resmi membatasi kalimat TP maksimal 100 karakter.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleAutoTrimAllTP}
                  className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shrink-0 cursor-pointer shadow-xs transition-all flex items-center gap-1.5"
                >
                  <Wand2 className="w-4 h-4 text-white" />
                  <span>Pangkas Otomatis ke 100 Karakter (1-Klik)</span>
                </button>
              </div>
            );
          })()}

          {/* Collapsible TP Management & Character Counter Card */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/70">
            <button
              type="button"
              onClick={() => setIsERaporTPManagerOpen(!isERaporTPManagerOpen)}
              className="w-full p-3.5 bg-slate-100 hover:bg-slate-200/80 transition-colors flex items-center justify-between text-xs font-black text-slate-800 cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Kelola Tujuan Pembelajaran (TP 1 - {activeTPCount}) — Batas Maksimal 100 Karakter</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold">
                  {activeTPCount} TP Aktif
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-500 text-[11px]">
                <span>{isERaporTPManagerOpen ? 'Sembunyikan Pengaturan TP' : 'Buka & Edit Deskripsi TP'}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isERaporTPManagerOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {isERaporTPManagerOpen && (
              <div className="p-4 space-y-4 border-t border-slate-200 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="font-bold text-slate-900 text-xs">Konfigurasi TP Resmi e-Rapor:</span>
                    <p className="text-[11px] text-slate-500">
                      Setiap TP memiliki kode resmi (misal: TP.1111) dan kalimat deskripsi kompetensi (maksimal 100 karakter termasuk spasi).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="font-bold text-slate-600">Jumlah TP:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <button
                            key={num}
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleUpdateActiveTPCount(num)}
                            className={`w-7 h-7 rounded-lg font-bold text-xs cursor-pointer transition-all ${
                              activeTPCount === num
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isLocked}
                      onClick={handleApplyDeepLearningTPTemplate}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
                      title="Terapkan kata kerja operasional Pembelajaran Mendalam (Deep Learning)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      <span>Template Deep Learning</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(sheet.tpConfigs || defaultTPConfigs).slice(0, activeTPCount).map((tp, idx) => {
                    const descLen = (tp.description || '').length;
                    return (
                      <div key={tp.code} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900 text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-200">
                              {tp.code}
                            </span>
                            <input
                              type="text"
                              disabled={isLocked}
                              value={tp.officialCode || `TP.${1111 + idx}`}
                              onChange={(e) => {
                                const newConfigs = (sheet.tpConfigs || defaultTPConfigs).map((t) =>
                                  t.code === tp.code ? { ...t, officialCode: e.target.value } : t
                                );
                                const updated = { ...sheet, tpConfigs: newConfigs, updatedAt: new Date().toISOString() };
                                setSheet(updated);
                                saveGradeRecapSheet(updated);
                              }}
                              className="w-20 px-1.5 py-0.5 bg-white border border-slate-300 rounded font-bold text-[10.5px] text-slate-800 text-center"
                              placeholder="TP.1111"
                              title="Kode resmi TP e-Rapor (Baris 6)"
                            />
                          </div>

                          {/* Real-time Character Counter Indicator */}
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-colors ${
                              descLen > 100
                                ? 'bg-rose-100 text-rose-800 border-rose-300 font-black animate-pulse'
                                : descLen === 100
                                ? 'bg-rose-50 text-rose-700 border-rose-300 font-black'
                                : descLen > 85
                                ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {descLen}/100 karakter
                          </span>
                        </div>

                        <textarea
                          maxLength={100}
                          disabled={isLocked}
                          value={tp.description || ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const trimmed = raw.length > 100 ? raw.substring(0, 100) : raw;
                            if (raw.length > 100) {
                              showToast('Batas Karakter', 'Deskripsi TP dibatasi maksimal 100 karakter untuk kesesuaian format resmi e-Rapor SMA.', 'warning');
                            }
                            const newConfigs = (sheet.tpConfigs || defaultTPConfigs).map((t) =>
                              t.code === tp.code ? { ...t, description: trimmed } : t
                            );
                            const updated = { ...sheet, tpConfigs: newConfigs, updatedAt: new Date().toISOString() };
                            setSheet(updated);
                            saveGradeRecapSheet(updated);
                          }}
                          rows={2}
                          className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                          placeholder={`Deskripsi kompetensi ${tp.code} (maksimal 100 karakter)...`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Tools & Bulk Checkbox Actions (Disusun 2 Baris Tertata Rapi) */}
          <div className="p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
            {/* Baris Atas: Tombol-tombol Ceklis Cepat Massal */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 text-[10.5px]">Aksi Ceklis Cepat:</span>
                <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">Penyelarasan status ketercapaian</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleAutoAssignTPAchievements}
                  className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                  title="Menentukan TP nilai tertinggi sebagai Optimal (T) dan terendah sebagai Perlu Peningkatan (R)"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ceklis Otomatis dari Nilai TP</span>
                </button>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleAutoFixInvalidStudents}
                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                  title="Otomatis menyelaraskan baris siswa yang belum valid agar langsung berstatus Valid sesuai aturan e-Rapor"
                >
                  <Wand2 className="w-3.5 h-3.5 text-purple-600" />
                  <span>Perbaiki yang Belum Valid (1-Klik)</span>
                </button>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleSetAllTPOptimal}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 disabled:opacity-50"
                  title="Tandai semua kolom TP menjadi Optimal (T)"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Set Semua Optimal (T)</span>
                </button>

                <button
                  type="button"
                  disabled={isLocked}
                  onClick={handleResetAllTPAchievements}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                  title="Kosongkan seluruh ceklis ketercapaian TP"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset Ceklis</span>
                </button>
              </div>
            </div>

            {/* Baris Bawah: Pencarian Siswa & Keterangan Kaidah */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa di e-Rapor..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500 text-xs shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span><strong className="text-emerald-800">T</strong> = Sangat Optimal</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span><strong className="text-rose-800">R</strong> = Perlu Peningkatan</span>
                </span>
              </div>
            </div>
          </div>

          {/* Table: Siswa, Nilai Rapor & Ketercapaian TP Checkboxes */}
          <div className="overflow-x-auto rounded-2xl border border-slate-300 shadow-xs">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-black text-center uppercase tracking-wider">
                  <th rowSpan={2} className="p-2 border border-slate-700 w-10">NO</th>
                  <th rowSpan={2} className="p-2 border border-slate-700 min-w-[100px]">NISN</th>
                  <th rowSpan={2} className="p-2 border border-slate-700 min-w-[170px] text-left">NAMA SISWA</th>
                  <th rowSpan={2} className="p-2 border border-slate-700 bg-indigo-900 text-white min-w-[90px]">
                    NILAI RAPOR
                  </th>
                  <th colSpan={activeTPCount} className="p-2 border border-slate-700 bg-blue-700 text-white">
                    TINGKAT KETERCAPAIAN TUJUAN PEMBELAJARAN (CEKLIS)
                  </th>
                  <th colSpan={3} className="p-2 border border-slate-700 bg-slate-900 text-cyan-300">
                    VALIDASI E-RAPOR
                  </th>
                </tr>
                <tr className="bg-slate-700 text-white font-bold text-center text-[10.5px]">
                  {activeTPKeys.map((k, i) => {
                    const tpCfg = sheet.tpConfigs?.[i];
                    return (
                      <th key={k} className="p-1.5 border border-slate-600 bg-blue-800/80 min-w-[125px]" title={tpCfg?.description}>
                        <div className="font-black text-cyan-200">{tpCfg?.officialCode || `TP.${1111 + i}`}</div>
                        <div className="text-[9.5px] font-normal text-slate-300 truncate max-w-[120px] mx-auto">
                          {tpCfg?.description || `TP ${i + 1}`}
                        </div>
                        {/* Quick column mass check buttons */}
                        <div className="flex items-center justify-center gap-1 mt-1 pt-1 border-t border-blue-700/60">
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleBatchCheckColumn(k, 'T')}
                            className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 border border-emerald-400/30 cursor-pointer"
                            title={`Ceklis semua siswa di ${tpCfg?.officialCode || k} sebagai Optimal (T)`}
                          >
                            +T
                          </button>
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleBatchCheckColumn(k, 'R')}
                            className="px-1.5 py-0.5 rounded text-[9px] bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-400/30 cursor-pointer"
                            title={`Ceklis semua siswa di ${tpCfg?.officialCode || k} sebagai Perlu Peningkatan (R)`}
                          >
                            +R
                          </button>
                          <button
                            type="button"
                            disabled={isLocked}
                            onClick={() => handleBatchCheckColumn(k, null)}
                            className="px-1 py-0.5 rounded text-[9px] bg-slate-600 hover:bg-slate-500 text-slate-300 cursor-pointer"
                            title={`Kosongkan ceklis kolom ${tpCfg?.officialCode || k}`}
                          >
                            ×
                          </button>
                        </div>
                      </th>
                    );
                  })}
                  <th className="p-1 border border-slate-600 bg-rose-950 text-rose-200 w-12" title="Jumlah TP Perlu Peningkatan (R)">TR</th>
                  <th className="p-1 border border-slate-600 bg-emerald-950 text-emerald-200 w-12" title="Jumlah TP Sangat Optimal (T)">OP</th>
                  <th className="p-1 border border-slate-600 bg-slate-800 text-white min-w-[120px]">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                {paginatedRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7 + activeTPCount} className="p-8 text-center text-slate-500 italic">
                      Tidak ada data siswa ditemukan untuk kelas {selectedClass}.
                    </td>
                  </tr>
                ) : (
                  paginatedRecords.map((r, idx) => {
                    const rowNumber = isAll ? idx + 1 : (safeCurrentPage - 1) * pageSize + idx + 1;
                    const { nar } = calculateStudentAverages(r);
                    const validation = getStudentERaporValidation(r);
                    const countT = activeTPKeys.filter((k) => r.tpAchievements?.[k] === 'T').length;
                    const countR = activeTPKeys.filter((k) => r.tpAchievements?.[k] === 'R').length;

                    return (
                      <tr key={r.studentId} className="hover:bg-slate-50/90 transition-colors">
                        <td className="p-2 text-center text-slate-500 border border-slate-200 font-bold">{rowNumber}</td>
                        <td className="p-2 text-center text-slate-600 font-mono text-[11px] border border-slate-200">
                          {r.nisn || studentNisnMap.get(r.studentId) || '-'}
                        </td>
                        <td className="p-2 font-bold text-slate-900 border border-slate-200">
                          {r.studentName}
                        </td>

                        {/* Nilai Rapor Bulat */}
                        <td className="p-2 text-center border border-slate-200 bg-indigo-50/60 font-black text-indigo-950 text-sm">
                          {nar !== null ? nar : '-'}
                        </td>

                        {/* TP Checkbox Cells */}
                        {activeTPKeys.map((tpKey) => {
                          const currentStatus = r.tpAchievements?.[tpKey] || null;

                          return (
                            <td key={tpKey} className="p-1.5 text-center border border-slate-200">
                              <div className="inline-flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                                {/* Checkbox Optimal (T) */}
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => handleToggleTPAchievement(r.studentId, tpKey, 'T')}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                                    currentStatus === 'T'
                                      ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300 ring-offset-1'
                                      : 'bg-white text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-slate-200'
                                  }`}
                                  title="Ceklis Sangat Optimal (T) - Klik untuk mengaktifkan/membatalkan"
                                >
                                  <Check className={`w-3.5 h-3.5 stroke-[3] ${currentStatus === 'T' ? 'text-white' : 'text-slate-400'}`} />
                                  <span>T</span>
                                </button>

                                {/* Checkbox Perlu Peningkatan (R) */}
                                <button
                                  type="button"
                                  disabled={isLocked}
                                  onClick={() => handleToggleTPAchievement(r.studentId, tpKey, 'R')}
                                  className={`px-2 py-1 rounded-lg text-[11px] font-black transition-all flex items-center gap-1 cursor-pointer ${
                                    currentStatus === 'R'
                                      ? 'bg-rose-600 text-white shadow-xs ring-2 ring-rose-300 ring-offset-1'
                                      : 'bg-white text-slate-500 hover:text-rose-700 hover:bg-rose-50 border border-slate-200'
                                  }`}
                                  title="Ceklis Perlu Peningkatan (R) - Klik untuk mengaktifkan/membatalkan"
                                >
                                  <X className={`w-3.5 h-3.5 stroke-[3] ${currentStatus === 'R' ? 'text-white' : 'text-slate-400'}`} />
                                  <span>R</span>
                                </button>
                              </div>
                            </td>
                          );
                        })}

                        {/* TR & OP Counters */}
                        <td className="p-2 text-center border border-slate-200 bg-rose-50/60 font-bold text-rose-900">
                          {countR}
                        </td>
                        <td className="p-2 text-center border border-slate-200 bg-emerald-50/60 font-bold text-emerald-900">
                          {countT}
                        </td>

                        {/* Status Validasi Real-time */}
                        <td className="p-2 text-center border border-slate-200">
                          {validation.isValid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                              <span>Valid</span>
                            </span>
                          ) : (
                            <div className="flex flex-col items-center gap-0.5">
                              <span
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-900 border border-rose-300 cursor-help"
                                title={validation.reason}
                              >
                                <AlertCircle className="w-3.5 h-3.5 text-rose-700" />
                                <span>Tidak Valid</span>
                              </span>
                              <span className="text-[9.5px] text-rose-600 font-medium text-center leading-tight">
                                {validation.reason}
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination for Tab e-Rapor */}
          <TablePagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={filteredRecords.length}
            onPageChange={(p) => setCurrentPage(p)}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 25, 50, 100, -1]}
          />

          {/* Catatan Validasi Resmi e-Rapor SMA */}
          <div className="p-4 bg-blue-50/60 rounded-2xl border border-blue-200 text-xs text-slate-800 space-y-2">
            <span className="font-black text-blue-950 flex items-center gap-1.5 text-sm">
              <Info className="w-4 h-4 text-blue-600" />
              <span>Panduan Resmi Validasi Ketercapaian TP (Kemendikdasmen e-Rapor SMA)</span>
            </span>
            <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
              <li>Jika Nilai Rapor Siswa kurang dari 100, pilihlah minimal 1 Tujuan Pembelajaran yang masih perlu peningkatan (R) dan minimal 1 Tujuan Pembelajaran yang sudah dicapai dengan sangat optimal (T).</li>
              <li>Jika Nilai Rapor Siswa = 100, pilih minimal 1 TP Sangat Optimal (T) dan tidak boleh memilih TP yang perlu peningkatan (R).</li>
              <li>Tidak mesti semua Tujuan Pembelajaran dipilih; minimal pilih satu yang paling optimal dan satu yang paling minimal.</li>
              <li>Setiap deskripsi kalimat TP resmi dibatasi maksimal 100 karakter (termasuk spasi dan tanda baca).</li>
            </ul>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: FINAL NILAI RAPORT (Siap Cetak & Ekspor)                           */}
      {/* ========================================================================= */}
      {activeTab === 'tab3' && (
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight">
                DOKUMEN NILAI RAPOT PAS KELAS {sheet.kelas}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Format resmi raport Kurikulum Merdeka Pembelajaran Mendalam siap cetak (Kop Surat, Nilai Akhir &amp; Capaian Kompetensi).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={handleOpenTab1Preview}
                className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-black text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                title="Lihat pratinjau lembar nilai resmi sebelum dicetak"
              >
                <Eye className="w-4 h-4 text-indigo-600" />
                <span>Pratinjau PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadTab1PDF}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                title="Unduh berkas PDF resmi F4 landscape"
              >
                <Printer className="w-4 h-4 text-amber-300" />
                <span>Cetak / Ekspor PDF</span>
              </button>
            </div>
          </div>

          {/* Document Preview Container (Kop Surat & Lembar Rapor) */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-300 space-y-6 max-w-5xl mx-auto shadow-inner text-slate-900">
            {/* Header Sekolah Resmi */}
            <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
              <h4 className="font-bold text-sm tracking-widest uppercase">PEMERINTAH PROVINSI LAMPUNG</h4>
              <h2 className="font-black text-lg tracking-wider uppercase">{school.namaSekolah || 'SMAN 3 TUMIJAJAR'}</h2>
              <p className="text-xs text-slate-600">{school.alamat || 'Jl. Raya Dayamurni, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung'}</p>
            </div>

            {/* Document Title */}
            <div className="text-center space-y-0.5">
              <h3 className="font-black text-base uppercase tracking-wide">
                NILAI RAPOT PAS KELAS {sheet.kelas} SEMESTER {sheet.semester === 'Ganjil' ? 'I' : 'II'} T.P {sheet.tahunAjaran}
              </h3>
            </div>

            {/* Metadata Info Bar (Sub-header Kiri & Kanan) */}
            <div className="flex items-end justify-between text-xs font-bold pt-2 border-t border-slate-200">
              <div className="space-y-1 text-left">
                <div className="text-slate-900 font-extrabold uppercase">KELAS : {sheet.kelas}</div>
                <div className="text-slate-900 font-extrabold uppercase">MAPEL : {sheet.mataPelajaran.toUpperCase()}</div>
              </div>
              <div className="font-black text-right text-sm text-slate-950 uppercase">
                FASE {fase.replace('Fase ', '').toUpperCase()}
              </div>
            </div>

            {/* Clean Official Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-400 bg-white shadow-2xs">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-black text-center uppercase tracking-wider">
                    <th className="p-2.5 border border-slate-800 w-12 text-center">NO</th>
                    <th className="p-2.5 border border-slate-800 min-w-[180px] text-left">NAMA</th>
                    <th className="p-2.5 border border-slate-800 w-28 text-center">NILAI AKHIR</th>
                    <th className="p-2.5 border border-slate-800 text-left">CAPAIAN KOMPETENSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 font-semibold text-slate-800">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-500 italic">
                        Tidak ada data siswa ditemukan untuk kelas {sheet.kelas}.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((r, idx) => {
                      const rowNumber = isAll ? idx + 1 : (safeCurrentPage - 1) * pageSize + idx + 1;
                      const { nar } = calculateStudentAverages(r);
                      const desc = generateCompetencyText(r);

                      return (
                        <tr key={r.studentId} className="hover:bg-slate-50">
                          <td className="p-2 text-center border border-slate-300 text-slate-500 font-bold">{rowNumber}</td>
                          <td className="p-2 border border-slate-300 font-bold text-slate-900">{r.studentName}</td>
                          <td className="p-2 text-center border border-slate-300 font-black text-indigo-900 bg-amber-50/50">
                            {nar !== null ? nar : '-'}
                          </td>
                          <td className="p-2 border border-slate-300 leading-relaxed text-slate-700">
                            {desc || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Pagination for Tab 3 Screen View */}
            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredRecords.length}
              onPageChange={(p) => setCurrentPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100, -1]}
            />

            {/* Official Signature Section */}
            <div className="grid grid-cols-2 pt-6 text-xs text-center font-medium">
              <div className="space-y-1">
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala SMAN 3 Tumijajar</p>
                <div className="h-16" />
                <p className="font-bold underline">{formatAcademicTitles(school.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.')}</p>
                <p>NIP. {school.nipKepalaSekolah || '198502022008042014'}</p>
              </div>

              <div className="space-y-1">
                <p>Tumijajar, {sheet.tanggalCetak || 'Desember 2026'}</p>
                <p className="font-bold">Guru Mata Pelajaran</p>
                <div className="h-16" />
                <p className="font-bold underline">{formatAcademicTitles(sheet.guruName || currentUser?.nama || 'Guru Mata Pelajaran')}</p>
                <p>NIP. {sheet.guruNip || currentUser?.nip || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: LEGER NILAI SISWA (Seluruh Mata Pelajaran & Riwayat Historis)     */}
      {/* ========================================================================= */}
      {activeTab === 'tab4' && (
        <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {/* Sub-Header & Mode Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-900 border border-amber-300">
                  Kompilasi Seluruh Mata Pelajaran
                </span>
                <span className="text-xs font-bold text-slate-400">•</span>
                <span className="text-xs text-slate-500 font-semibold">T.P {tahunAjaran} Semester {semester}</span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-tight mt-1">
                {tab4ViewMode === 'active_class'
                  ? `LEGER NILAI AKHIR SISWA KELAS ${selectedClass}`
                  : 'BANK RIWAYAT LEGER NILAI HISTORIS (TAHUN & KELAS SEBELUMNYA)'}
              </h3>
            </div>

            {/* Switch Mode: Kelas Aktif vs Riwayat Leger Historis */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setTab4ViewMode('active_class')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  tab4ViewMode === 'active_class'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table className="w-3.5 h-3.5 text-indigo-600" />
                <span>Leger Kelas {selectedClass}</span>
              </button>

              <button
                type="button"
                onClick={() => setTab4ViewMode('historical_leger')}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                  tab4ViewMode === 'historical_leger'
                    ? 'bg-white text-emerald-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                <span>Riwayat Leger Historis ({state.historicalLegers?.length || 0})</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE A: LEGER KELAS AKTIF */}
          {tab4ViewMode === 'active_class' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <p className="text-xs text-slate-500 font-medium">
                  Menampilkan kompilasi seluruh mata pelajaran pada semester berjalan, total skor, rata-rata dan peringkat siswa.
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadLegerTemplate}
                    className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    title="Unduh format template Excel resmi dengan rumus perhitungan"
                  >
                    <FileDown className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Format Leger Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportLegerExcel}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenTab4LegerPreview}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <Eye className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Pratinjau PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTab4LegerPDF}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-950" />
                    <span>Cetak / Ekspor PDF</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-300 shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black text-center uppercase tracking-wider">
                      <th className="p-2 border border-slate-800 w-10">NO</th>
                      <th className="p-2 border border-slate-800 min-w-[180px] text-left">NAMA</th>
                      {legerData.classSubjects.map((s) => (
                        <th key={s} className="p-2 border border-slate-800 min-w-[80px] text-center text-[10px]" title={s}>
                          {s.length > 12 ? `${s.substring(0, 10)}...` : s}
                        </th>
                      ))}
                      <th className="p-2 border border-slate-800 bg-amber-600 text-amber-100 w-20">TOTAL</th>
                      <th className="p-2 border border-slate-800 bg-blue-700 text-white w-20">RATA2</th>
                      <th className="p-2 border border-slate-800 bg-indigo-600 text-white w-16">RANK</th>
                      <th className="p-2 border border-slate-800 bg-emerald-700 text-white w-20">% TUNTAS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold text-slate-800">
                    {paginatedLegerStudents.length === 0 ? (
                      <tr>
                        <td colSpan={7 + legerData.classSubjects.length} className="p-8 text-center text-slate-500 italic">
                          Tidak ada data siswa ditemukan untuk kelas {selectedClass}.
                        </td>
                      </tr>
                    ) : (
                      paginatedLegerStudents.map((item, idx) => {
                        const rowNumber = isLegerAll ? idx + 1 : (safeLegerCurrentPage - 1) * legerPageSize + idx + 1;

                        return (
                          <tr key={item.student.id} className="hover:bg-slate-50">
                            <td className="p-2 text-center border border-slate-200 text-slate-500 font-bold">{rowNumber}</td>
                            <td className="p-2 border border-slate-200 font-bold text-slate-900">{item.student.nama}</td>

                            {legerData.classSubjects.map((s) => {
                              const score = item.subjectScores[s];
                              const isUnder = typeof score === 'number' && score < (sheet.kktp || 75);
                              return (
                                <td key={s} className={`p-2 text-center border border-slate-200 font-bold ${
                                  isUnder ? 'text-rose-600 bg-rose-50/50' : 'text-slate-800'
                                }`}>
                                  {score !== null ? score : '-'}
                                </td>
                              );
                            })}

                            <td className="p-2 text-center border border-slate-200 bg-amber-50 font-black text-amber-950 text-xs">
                              {item.total > 0 ? item.total : '-'}
                            </td>
                            <td className="p-2 text-center border border-slate-200 bg-blue-50 font-black text-blue-900 text-xs">
                              {item.avg > 0 ? item.avg.toFixed(1) : '-'}
                            </td>
                            <td className="p-2 text-center border border-slate-200 bg-indigo-100 font-black text-indigo-950 text-xs">
                              #{item.rank}
                            </td>
                            <td className="p-2 text-center border border-slate-200 bg-emerald-50 font-black text-emerald-900 text-xs">
                              {item.percentTuntas}%
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {/* Summary Statistics Footer */}
                  <tfoot>
                    <tr className="bg-slate-100 font-black text-slate-900 text-center border-t-2 border-slate-400">
                      <td colSpan={2} className="p-2 text-left uppercase">Rata-rata Kelas</td>
                      {legerData.classSubjects.map((s) => (
                        <td key={s} className="p-2 text-blue-900">
                          {legerData.subjectStats[s]?.avg > 0 ? legerData.subjectStats[s].avg.toFixed(1) : '-'}
                        </td>
                      ))}
                      <td colSpan={4} className="p-2 bg-slate-200 text-slate-600">-</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-700 text-center text-[11px]">
                      <td colSpan={2} className="p-2 text-left uppercase text-emerald-700">Nilai Tertinggi</td>
                      {legerData.classSubjects.map((s) => (
                        <td key={s} className="p-2 text-emerald-800 font-black">
                          {legerData.subjectStats[s]?.max > 0 ? legerData.subjectStats[s].max : '-'}
                        </td>
                      ))}
                      <td colSpan={4} className="p-2 bg-slate-100 text-slate-600">-</td>
                    </tr>
                    <tr className="bg-slate-50 font-bold text-slate-700 text-center text-[11px]">
                      <td colSpan={2} className="p-2 text-left uppercase text-rose-700">Nilai Terendah</td>
                      {legerData.classSubjects.map((s) => (
                        <td key={s} className="p-2 text-rose-800 font-black">
                          {legerData.subjectStats[s]?.min > 0 ? legerData.subjectStats[s].min : '-'}
                        </td>
                      ))}
                      <td colSpan={4} className="p-2 bg-slate-100 text-slate-600">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Table Pagination for Leger */}
              <TablePagination
                currentPage={safeLegerCurrentPage}
                totalPages={totalLegerPages}
                pageSize={legerPageSize}
                totalItems={filteredLegerStudents.length}
                onPageChange={(p) => setLegerCurrentPage(p)}
                onPageSizeChange={(s) => {
                  setLegerPageSize(s);
                  setLegerCurrentPage(1);
                }}
                pageSizeOptions={[10, 25, 50, 100, -1]}
              />
            </div>
          )}

          {/* VIEW MODE B: RIWAYAT LEGER HISTORIS (TAHUN / KELAS SEBELUMNYA) */}
          {tab4ViewMode === 'historical_leger' && (
            <div className="space-y-4">
              {!state.historicalLegers || state.historicalLegers.length === 0 ? (
                <div className="p-10 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-300 text-center space-y-3">
                  <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
                  <h4 className="text-base font-black text-slate-800">
                    Belum Ada Data Riwayat Leger Nilai yang Diimpor
                  </h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Anda dapat mengimpor berkas Excel leger dari tahun ajaran atau kelas sebelumnya untuk dihubungkan secara otomatis dengan profil siswa yang ada di sistem ini.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsHistoricalImportOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-black text-xs inline-flex items-center gap-2 shadow-md cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-emerald-200" />
                    <span>Impor File Excel Leger Historis Sekarang</span>
                  </button>
                </div>
              ) : (
                (() => {
                  const currentHistRecord =
                    state.historicalLegers.find((h) => h.id === selectedHistoricalId) ||
                    state.historicalLegers[0];

                  if (!currentHistRecord) return null;

                  return (
                    <div className="space-y-4">
                      {/* Historical Leger Header Selector & Actions */}
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600 block">
                            Pilih Berkas Leger Historis:
                          </label>
                          <select
                            value={currentHistRecord.id}
                            onChange={(e) => setSelectedHistoricalId(e.target.value)}
                            className="p-2 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            {state.historicalLegers.map((h) => (
                              <option key={h.id} value={h.id}>
                                {h.title} ({h.records.length} siswa, {h.totalMatchedStudents} terhubung)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsHistoricalImportOpen(true)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Upload className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Impor Leger Lain</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenHistoricalLegerPreview(currentHistRecord)}
                            className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-black text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Pratinjau PDF</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadHistoricalLegerPDF(currentHistRecord)}
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5 text-slate-950" />
                            <span>Ekspor PDF Leger</span>
                          </button>

                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`Hapus riwayat leger "${currentHistRecord.title}"?`)) {
                                  deleteHistoricalLegerRecord(currentHistRecord.id);
                                }
                              }}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-bold cursor-pointer transition-colors"
                              title="Hapus riwayat leger ini"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Summary Badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-semibold">Tahun Ajaran Asal</span>
                          <span className="font-black text-slate-800">{currentHistRecord.tahunAjaranAsal} ({currentHistRecord.semesterAsal})</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                          <span className="text-[10px] text-slate-500 block font-semibold">Kelas Asal</span>
                          <span className="font-black text-slate-800">{currentHistRecord.kelasAsal}</span>
                        </div>
                        <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                          <span className="text-[10px] text-emerald-700 block font-semibold">✓ Siswa Terhubung</span>
                          <span className="font-black text-emerald-800">
                            {currentHistRecord.totalMatchedStudents} / {currentHistRecord.totalStudentsImported} Siswa ({Math.round((currentHistRecord.totalMatchedStudents / (currentHistRecord.totalStudentsImported || 1)) * 100)}%)
                          </span>
                        </div>
                        <div className="p-2.5 bg-indigo-50 rounded-xl border border-indigo-200">
                          <span className="text-[10px] text-indigo-700 block font-semibold">Mapel Terdata</span>
                          <span className="font-black text-indigo-800">{currentHistRecord.subjectsDetected.length} Mata Pelajaran</span>
                        </div>
                      </div>

                      {/* Historical Students Table */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-300 shadow-xs max-h-96">
                        <table className="w-full text-xs text-left border-collapse">
                          <thead className="bg-slate-900 text-white font-bold sticky top-0 z-10 text-[11px] uppercase">
                            <tr>
                              <th className="p-2 text-center w-10">No</th>
                              <th className="p-2 w-28">NISN</th>
                              <th className="p-2 min-w-[160px]">Nama Siswa</th>
                              <th className="p-2 min-w-[130px]">Status Data Sistem</th>
                              {currentHistRecord.subjectsDetected.map((subj) => (
                                <th key={subj} className="p-2 text-center min-w-[70px]">
                                  {subj.length > 10 ? `${subj.substring(0, 8)}..` : subj}
                                </th>
                              ))}
                              <th className="p-2 text-center bg-amber-600 text-white w-16">TOTAL</th>
                              <th className="p-2 text-center bg-blue-700 text-white w-16">RATA</th>
                              <th className="p-2 text-center bg-indigo-600 text-white w-14">RANK</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 bg-white">
                            {currentHistRecord.records.map((r, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 font-semibold">
                                <td className="p-2 text-center text-slate-500 font-bold">{idx + 1}</td>
                                <td className="p-2 font-mono text-slate-600 text-[11px]">{r.nisn || '-'}</td>
                                <td className="p-2 font-black text-slate-800">{r.nama}</td>
                                <td className="p-2">
                                  {r.studentId ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Terhubung ({r.kelasSekarang || 'Aktif'})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
                                      Belum Terhubung
                                    </span>
                                  )}
                                </td>
                                {currentHistRecord.subjectsDetected.map((subj) => (
                                  <td key={subj} className="p-2 text-center text-slate-800 font-bold border-l border-slate-100">
                                    {r.scores[subj] !== null && r.scores[subj] !== undefined ? r.scores[subj] : '-'}
                                  </td>
                                ))}
                                <td className="p-2 text-center font-black bg-amber-50 text-amber-950 border-l border-slate-200">
                                  {r.totalScore ?? '-'}
                                </td>
                                <td className="p-2 text-center font-black bg-blue-50 text-blue-900 border-l border-slate-200">
                                  {r.averageScore ? r.averageScore.toFixed(1) : '-'}
                                </td>
                                <td className="p-2 text-center font-black bg-indigo-50 text-indigo-900 border-l border-slate-200">
                                  {r.rank ? `#${r.rank}` : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SINKRONISASI ASESMEN CERDAS (SMART AUTO-SYNC & SATUAN)            */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isSyncModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-slate-900 text-base">Sinkronisasi Nilai Asesmen SiMantri</h3>
                </div>
                <button onClick={() => setIsSyncModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Selector Tabs */}
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                <button
                  type="button"
                  onClick={() => setSyncModeTab('auto_all')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    syncModeTab === 'auto_all'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Tarik Otomatis Seluruh Asesmen ({matchingAssessments.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSyncModeTab('single_custom')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                    syncModeTab === 'single_custom'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Pemetaan Khusus Satuan</span>
                </button>
              </div>

              {/* TAB CONTENT A: TARIK OTOMATIS SELURUH ASESMEN */}
              {syncModeTab === 'auto_all' && (
                <div className="space-y-4 text-xs">
                  <p className="text-slate-600 leading-relaxed font-medium">
                    Sistem mendeteksi seluruh paket asesmen yang telah dikoreksi di SiMantri untuk kelas <strong>{selectedClass}</strong> pada mapel <strong>{selectedSubject}</strong>, lalu memetakannya secara otomatis ke kolom PTS, PAS, dan Sumatif TP:
                  </p>

                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 max-h-56 overflow-y-auto space-y-2">
                    {matchingAssessments.length === 0 ? (
                      <div className="p-4 text-center text-slate-500 italic">
                        Belum ada paket asesmen terdata untuk {selectedSubject} di kelas {selectedClass}. Anda dapat melakukan penginputan nilai secara manual atau memilih tab &quot;Pemetaan Khusus Satuan&quot;.
                      </div>
                    ) : (
                      matchingAssessments.map((a, i) => {
                        const jClean = cleanCanonical(a.judul);
                        const isAsts = a.jenis === 'ASTS' || jClean.includes('asts') || jClean.includes('pts') || jClean.includes('tengah');
                        const isAsas = a.jenis === 'ASAS' || jClean.includes('asas') || jClean.includes('pas') || jClean.includes('akhir');
                        const targetLabel = isAsts ? 'PTS' : isAsas ? 'PAS' : `TP ${Math.min(activeTPCount, i + 1)}`;

                        return (
                          <div key={a.id} className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 block">[{a.jenis}] {a.judul}</span>
                              <span className="text-[11px] text-slate-500">
                                {a.submissions?.length || 0} Siswa Selesai · T.P {a.tahunAjaran} ({a.semester})
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-[10px] text-slate-400 font-semibold">Petakan ke:</span>
                              <span className="px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-900 font-black text-xs border border-indigo-200">
                                {targetLabel}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">
                      *Nilai siswa dicocokkan otomatis berdasarkan ID, NISN, atau Nama Siswa.
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsSyncModalOpen(false)}
                        className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        disabled={matchingAssessments.length === 0}
                        onClick={handleRunSmartAutoSyncAll}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-300" />
                        <span>Tarik &amp; Petakan Semua Nilai</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT B: PEMETAAN KHUSUS SATUAN */}
              {syncModeTab === 'single_custom' && (
                <div className="space-y-4 text-xs">
                  <p className="text-slate-600 leading-relaxed font-medium">
                    Pilih salah satu paket soal / asesmen ujian SiMantri secara spesifik untuk diarahkan ke target kolom nilai yang Anda tentukan.
                  </p>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 block">Pilih Paket Asesmen SiMantri:</label>
                    <select
                      value={selectedAssessmentForSync}
                      onChange={(e) => setSelectedAssessmentForSync(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">-- Pilih Paket Asesmen --</option>
                      {state.assessments.map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.jenis}] {a.judul} - Kelas {a.kelas} ({a.submissions?.length || 0} Siswa Selesai)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-800 block">Mapping Target Kolom Nilai:</label>
                    <select
                      value={syncTargetColumn}
                      onChange={(e) => setSyncTargetColumn(e.target.value)}
                      className="w-full p-2.5 bg-amber-50 border border-amber-300 rounded-xl font-black text-amber-950 outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      {activeTPKeys.map((k, i) => (
                        <option key={k} value={k}>Kolom TP {i + 1}</option>
                      ))}
                      <option value="PTS">Kolom PTS (Penilaian Tengah Semester)</option>
                      <option value="PAS">Kolom PAS (Penilaian Akhir Semester)</option>
                    </select>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsSyncModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleRunSingleSync}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
                    >
                      Jalankan Sinkronisasi Satuan
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: ALAT BANTU INPUT MANUAL CEPAT (BATCH INPUT & SALIN EXCEL)        */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isManualBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-purple-600" />
                  <h3 className="font-black text-slate-900 text-base">Alat Bantu Penginputan Nilai Manual</h3>
                </div>
                <button onClick={() => setIsManualBatchModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-slate-600 leading-relaxed font-medium">
                  Fasilitas pengisian nilai cepat untuk memudahkan guru yang ingin melakukan input nilai massal, menempel data nilai dari Excel/Sheets, atau mengosongkan kolom.
                </p>

                {/* Section A: Tempel (Paste) dari Spreadsheet Excel */}
                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-purple-950 block text-xs uppercase flex items-center gap-1.5">
                      <ClipboardPaste className="w-4 h-4 text-purple-600" />
                      <span>1. Tempel Kolom Nilai dari Excel / Google Sheets</span>
                    </span>
                    <span className="text-[10px] bg-purple-200 text-purple-900 px-2 py-0.5 rounded-full font-bold">
                      {studentsInClass.length} Siswa Berurutan
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    Salin (Copy) satu kolom nilai dari berkas Excel/Sheets Anda, lalu tempel (Paste) ke kotak di bawah. Nilai akan dimasukkan secara berurutan sesuai urutan siswa di kelas.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="font-bold text-slate-700 block">Target Kolom:</label>
                      <select
                        value={pasteTargetCol}
                        onChange={(e) => setPasteTargetCol(e.target.value)}
                        className="w-full p-2 bg-white border border-purple-300 rounded-xl font-bold text-slate-900 text-xs"
                      >
                        {activeTPKeys.map((k, i) => (
                          <option key={k} value={k}>Kolom TP {i + 1}</option>
                        ))}
                        <option value="PTS">Kolom PTS</option>
                        <option value="PAS">Kolom PAS</option>
                      </select>
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <label className="font-bold text-slate-700 block">Tempel Teks Nilai:</label>
                      <textarea
                        value={pasteExcelText}
                        onChange={(e) => setPasteExcelText(e.target.value)}
                        placeholder="Contoh:&#10;80&#10;85&#10;90&#10;78"
                        rows={3}
                        className="w-full p-2 bg-white border border-purple-300 rounded-xl font-mono text-xs text-slate-900 outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyPasteFromExcel}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    <span>Terapkan Nilai Clipboard ke Kolom {pasteTargetCol}</span>
                  </button>
                </div>

                {/* Section B: Isi Nilai Seragam */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <span className="font-black text-slate-900 block text-xs uppercase">
                    2. Isi Nilai Seragam (Batch Uniform Fill)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Target Kolom:</label>
                      <select
                        value={batchTargetCol}
                        onChange={(e) => setBatchTargetCol(e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
                      >
                        {activeTPKeys.map((k, i) => (
                          <option key={k} value={k}>Kolom TP {i + 1}</option>
                        ))}
                        <option value="PTS">Kolom PTS</option>
                        <option value="PAS">Kolom PAS</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">Nilai Seragam (0-100):</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={batchScoreVal}
                        onChange={(e) => setBatchScoreVal(Number(e.target.value) || 0)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-xl font-black text-slate-950 text-center text-xs"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyBatchScore}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    Terapkan Nilai {batchScoreVal} ke Seluruh Siswa di {batchTargetCol}
                  </button>
                </div>

                {/* Section C: Kosongkan Kolom Tertentu */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <span className="font-black text-slate-900 block text-xs uppercase">
                    3. Kosongkan Nilai Kolom
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Klik salah satu tombol di bawah untuk menghapus seluruh nilai pada kolom tertentu:
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {activeTPKeys.map((k, i) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => handleClearColumnScore(k)}
                        className="px-2.5 py-1 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 rounded-lg font-bold text-xs cursor-pointer"
                      >
                        Hapus TP {i + 1}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => handleClearColumnScore('PTS')}
                      className="px-2.5 py-1 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Hapus PTS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleClearColumnScore('PAS')}
                      className="px-2.5 py-1 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Hapus PAS
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsManualBatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: PENGATURAN BOBOT & KKTP                                          */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isWeightModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-amber-600" />
                  <h3 className="font-black text-slate-900 text-base">Pengaturan Bobot &amp; KKTP</h3>
                </div>
                <button onClick={() => setIsWeightModalOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <div className="space-y-2">
                  <label className="font-bold text-slate-800 block">Bobot Kalkulasi Nilai Akhir (NA):</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-500 font-semibold block">% NRS TP (Lingkup Materi)</span>
                      <input
                        type="number"
                        value={sheet.weightTPPercent}
                        onChange={(e) => setSheet({ ...sheet, weightTPPercent: Number(e.target.value) || 50 })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-center text-sm"
                      />
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-500 font-semibold block">% NRS Semester</span>
                      <input
                        type="number"
                        value={sheet.weightSemesterPercent}
                        onChange={(e) => setSheet({ ...sheet, weightSemesterPercent: Number(e.target.value) || 50 })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-center text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-bold text-slate-800 block">Bobot Semester (PTS vs PAS):</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-500 font-semibold block">% PTS (ASTS)</span>
                      <input
                        type="number"
                        value={sheet.weightPTSPercent ?? 50}
                        onChange={(e) => setSheet({ ...sheet, weightPTSPercent: Number(e.target.value) || 50 })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-center text-sm"
                      />
                    </div>
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[11px] text-slate-500 font-semibold block">% PAS (ASAS)</span>
                      <input
                        type="number"
                        value={sheet.weightPASPercent ?? 50}
                        onChange={(e) => setSheet({ ...sheet, weightPASPercent: Number(e.target.value) || 50 })}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 text-center text-sm"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-800 block">Kriteria Ketercapaian Tujuan Pembelajaran (KKTP):</label>
                  <input
                    type="number"
                    value={sheet.kktp}
                    onChange={(e) => setSheet({ ...sheet, kktp: Number(e.target.value) || 75 })}
                    className="w-full p-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-center text-sm"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    saveGradeRecapSheet(sheet);
                    setIsWeightModalOpen(false);
                    showToast('Pengaturan Diterapkan', 'Konfigurasi bobot dan KKTP berhasil disimpan.', 'success');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs cursor-pointer shadow-md"
                >
                  Terapkan Pengaturan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 4: EXPORT FORMAT RESMI & SINKRONISASI E-RAPOR SMA                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isERaporModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 text-slate-800 space-y-5 max-h-[92vh] overflow-y-auto"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md">
                    <FileSpreadsheet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base">
                      Format Resmi Excel e-Rapor SMA (Kemendikdasmen)
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      SMAN 3 Tumijajar • 100% Presisi Struktur, Hidden Rows, Formula Validasi &amp; Ceklis TP
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsERaporModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setERaporModalTab('export')}
                  className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    eRaporModalTab === 'export'
                      ? 'bg-white text-blue-900 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileDown className="w-4 h-4 text-blue-600" />
                  <span>1. Unduh File Excel e-Rapor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setERaporModalTab('import')}
                  className={`flex-1 py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    eRaporModalTab === 'import'
                      ? 'bg-white text-indigo-900 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>2. Sinkron Template Asli e-Rapor</span>
                </button>
              </div>

              {/* TAB 1: EXPORT EXCEL E-RAPOR */}
              {eRaporModalTab === 'export' && (
                <div className="space-y-4 text-xs">
                  {/* Mode Selection Cards */}
                  <div className="space-y-2">
                    <label className="font-bold text-slate-800 block text-xs">
                      Pilih Format Penulisan Nilai &amp; Ceklis TP:
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Mode 1: Standar Mesin e-Rapor (Default) */}
                      <div
                        onClick={() => setERaporExportOption('standard')}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          eRaporExportOption === 'standard'
                            ? 'bg-blue-50/60 border-blue-600 ring-2 ring-blue-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-xs">Standar Mesin</span>
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-blue-100 text-blue-800">
                              Default Resmi
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Ceklis dikonversi menjadi huruf <strong>"T"</strong> dan <strong>"R"</strong>. Rumus <code className="bg-slate-100 px-1 rounded">=COUNTIF</code> terpasang presisi. Siap diimport ke server e-Rapor SMA.
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-blue-700 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>100% Kompatibel Parser e-Rapor</span>
                        </div>
                      </div>

                      {/* Mode 2: Template Kosong (Blank Template) */}
                      <div
                        onClick={() => setERaporExportOption('blank_template')}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          eRaporExportOption === 'blank_template'
                            ? 'bg-emerald-50/60 border-emerald-600 ring-2 ring-emerald-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-xs">Template Kosong</span>
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-emerald-100 text-emerald-800">
                              Tanpa Nilai
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Sel Nilai Rapor dan Ceklis TP <strong>dikosongkan (blank)</strong>. Data siswa, NISN, UUID, deskripsi TP (≤100 karakter), dan rumus validasi tetap lengkap.
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Siap Diisi Manual di Excel</span>
                        </div>
                      </div>

                      {/* Mode 3: Mode Simbol Ceklis Visual */}
                      <div
                        onClick={() => setERaporExportOption('visual_check')}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                          eRaporExportOption === 'visual_check'
                            ? 'bg-purple-50/60 border-purple-600 ring-2 ring-purple-300'
                            : 'bg-white border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-slate-900 text-xs">Ceklis Visual</span>
                            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-purple-100 text-purple-800">
                              Simbol ✓
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Ceklis diisi simbol <strong>"✓"</strong> di dalam sel Excel dengan penyesuaian formula COUNTIF dan Data Validation. Cocok untuk printout / arsip visual.
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-purple-700 font-bold">
                          <Check className="w-3.5 h-3.5" />
                          <span>Tampilan Centang Visual</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadata & Technical Specs Summary */}
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="font-black text-slate-900 block text-xs uppercase tracking-wider">
                      Struktur Presisi File Excel yang Akan Dihasilkan:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-500 block">Nama File Unduhan:</span>
                        <strong className="text-slate-900 font-mono break-all">
                          f_nilai_ {sheet.kelas.trim()} _{sheet.mataPelajaran.trim()}.xlsx
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-500 block">Nama Worksheet:</span>
                        <strong className="text-slate-900 font-mono">Worksheet</strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-500 block">Data Peserta Didik:</span>
                        <strong className="text-slate-900">
                          {sheet.studentRecords.length} Siswa (Baris 7 - {6 + sheet.studentRecords.length})
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-500 block">Kolom TP:</span>
                        <strong className="text-slate-900">
                          Kolom H s.d. {getColumnLetter(7 + activeTPCount)} ({activeTPCount} TP Aktif)
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-500 block">Hidden Rows &amp; Cols:</span>
                        <strong className="text-slate-900">
                          Baris 4 (id_tp), Baris 5 (Deskripsi ≤100), Col B-D, TR, OP
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-slate-200">
                        <span className="text-slate-500 block">UUID Rombel / Mapel:</span>
                        <strong className="text-slate-900 truncate block" title={sheet.eraporMetadata?.rombelPembelajaranId || 'Otomatis'}>
                          {sheet.eraporMetadata?.rombelPembelajaranId ? 'Tersinkron' : 'Default SiMantri'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Validation State Warning if Not 100% Valid */}
                  {(() => {
                    const validCount = sheet.studentRecords.filter((r) => getStudentERaporValidation(r).isValid).length;
                    const invalidCount = sheet.studentRecords.length - validCount;
                    if (invalidCount === 0 || eRaporExportOption === 'blank_template') return null;

                    return (
                      <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl flex items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="text-rose-800">
                            Terdapat <strong>{invalidCount} siswa</strong> yang belum memenuhi aturan validasi e-Rapor SMA. Anda tetap dapat mengunduh atau memperbaiki otomatis dengan 1-klik.
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleAutoFixInvalidStudents}
                          className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-2xs"
                        >
                          Perbaiki Otomatis
                        </button>
                      </div>
                    );
                  })()}

                  {/* Action Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                    <button
                      type="button"
                      disabled={isProcessingERapor}
                      onClick={() => handleExecuteExportERapor('blank_template')}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      title="Unduh template kosong e-Rapor resmi dengan sel nilai dan ceklis dikosongkan"
                    >
                      <Download className="w-4 h-4 text-slate-600" />
                      <span>Download Template Kosong (.xlsx)</span>
                    </button>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        type="button"
                        onClick={() => setIsERaporModalOpen(false)}
                        className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs cursor-pointer"
                      >
                        Batal
                      </button>

                      <button
                        type="button"
                        disabled={isProcessingERapor}
                        onClick={() => handleExecuteExportERapor(eRaporExportOption)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 hover:from-blue-600 hover:to-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50 btn-spring"
                      >
                        {isProcessingERapor ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        ) : (
                          <FileSpreadsheet className="w-4 h-4 text-cyan-300" />
                        )}
                        <span>
                          {eRaporExportOption === 'blank_template'
                            ? 'Download Template Kosong (.xlsx)'
                            : eRaporExportOption === 'visual_check'
                            ? 'Download Format Ceklis Visual (.xlsx)'
                            : 'Download Format Resmi e-Rapor (.xlsx)'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: SINKRONISASI TEMPLATE ASLI E-RAPOR */}
              {eRaporModalTab === 'import' && (
                <div className="space-y-4 text-xs">
                  {/* Explanatory Guide Card */}
                  <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-2 text-slate-800">
                    <span className="font-black text-indigo-950 flex items-center gap-1.5 text-xs">
                      <Info className="w-4 h-4 text-indigo-600" />
                      <span>Mengapa Perlu Sinkronisasi dengan Template Asli Sekolah?</span>
                    </span>
                    <p className="text-[11.5px] text-slate-600 leading-relaxed">
                      Sistem e-Rapor SMA menghasilkan UUID acak unik untuk setiap Rombongan Belajar (<code className="bg-white px-1 rounded">pembelajaran_id</code>), ID Anggota Siswa (<code className="bg-white px-1 rounded">anggota_rombel_id</code>), dan ID TP (<code className="bg-white px-1 rounded">id_tp</code> di Baris 4).
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-700 pl-1 font-medium">
                      <li>Unduh file template nilai kosong dari aplikasi e-Rapor SMA SMAN 3 Tumijajar.</li>
                      <li>Unggah file Excel tersebut melalui tombol di bawah.</li>
                      <li>SiMantri akan otomatis membaca seluruh UUID resmi, nama siswa, dan kode mapel.</li>
                      <li>Setelah terisi di SiMantri, file Excel yang diekspor akan 100% identik dengan server sekolah dan tidak akan error saat di-import kembali.</li>
                    </ol>
                  </div>

                  {/* Hidden File Input & Upload Dropzone */}
                  <input
                    ref={eRaporFileInputRef}
                    type="file"
                    accept=".xlsx"
                    onChange={handleUploadERaporTemplateFile}
                    className="hidden"
                  />

                  <div
                    onClick={() => eRaporFileInputRef.current?.click()}
                    className="p-8 border-2 border-dashed border-indigo-300 hover:border-indigo-500 bg-indigo-50/30 hover:bg-indigo-50/60 rounded-3xl transition-all cursor-pointer flex flex-col items-center justify-center text-center space-y-2"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-black text-indigo-950 text-sm block">
                        Klik untuk Memilih File Excel Template Resmi e-Rapor (.xlsx)
                      </span>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        File format resmi unduhan e-Rapor (nama berawalan <code>f_nilai_...</code>)
                      </p>
                    </div>
                  </div>

                  {/* Current Sync Status Card */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 text-xs">Status Sinkronisasi Metadata:</span>
                      {sheet.eraporMetadata?.templateSyncedAt ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Tersinkron dengan Server e-Rapor</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                          Menggunakan Default SiMantri
                        </span>
                      )}
                    </div>

                    {sheet.eraporMetadata?.templateSyncedAt && (
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200">
                        <div>
                          <span className="text-slate-500 block">Waktu Sinkronisasi:</span>
                          <strong className="text-slate-900">
                            {new Date(sheet.eraporMetadata.templateSyncedAt).toLocaleString('id-ID')}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Kode Mata Pelajaran:</span>
                          <strong className="text-slate-900 font-mono">
                            {sheet.eraporMetadata.kodeMapel || '-'}
                          </strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-500 block">UUID Rombel / Pembelajaran:</span>
                          <strong className="text-slate-900 font-mono text-[10px] break-all">
                            {sheet.eraporMetadata.rombelPembelajaranId || '-'}
                          </strong>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer for Tab 2 */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsERaporModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL PRATINJAU PDF INTERAKTIF (ZOOM, CETAK, UNDUH LANGSUNG)             */}
      {/* ========================================================================= */}
      <PDFPreviewModal
        isOpen={isPDFPreviewModalOpen}
        onClose={() => {
          setIsPDFPreviewModalOpen(false);
          if (pdfPreviewData.blobUrl) {
            URL.revokeObjectURL(pdfPreviewData.blobUrl);
          }
        }}
        title={pdfPreviewData.title}
        subtitle={pdfPreviewData.subtitle}
        blobUrl={pdfPreviewData.blobUrl}
        fileName={pdfPreviewData.fileName}
        doc={pdfPreviewData.doc}
      />

      {/* ========================================================================= */}
      {/* MODAL KONFIRMASI KUNCI PERMANEN (FINAL) MUTLAK                           */}
      {/* ========================================================================= */}
      <PermanentLockConfirmModal
        isOpen={isPermanentLockModalOpen}
        onClose={() => setIsPermanentLockModalOpen(false)}
        sheet={sheet}
        onConfirmLock={handleConfirmPermanentLock}
        metrics={{
          totalStudents: sheetMetrics.totalStudents,
          filledCount: sheetMetrics.filledCount,
          avgScore: sheetMetrics.avgScore,
          highestScore: sheetMetrics.highestScore,
          lowestScore: sheetMetrics.lowestScore,
        }}
      />

      {/* ========================================================================= */}
      {/* MODAL IMPOR LEGER HISTORIS EXCEL (TAHUN & KELAS SEBELUMNYA)               */}
      {/* ========================================================================= */}
      <HistoricalLegerImportModal
        isOpen={isHistoricalImportOpen}
        onClose={() => setIsHistoricalImportOpen(false)}
        currentClass={selectedClass}
        currentSubject={selectedSubject}
        onImportSuccess={(record: HistoricalLegerImportRecord) => {
          setSelectedHistoricalId(record.id);
          setTab4ViewMode('historical_leger');
          setActiveTab('tab4');
        }}
      />
    </div>
  );
};
