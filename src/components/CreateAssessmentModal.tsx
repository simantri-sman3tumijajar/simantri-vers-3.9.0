import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useAutosave } from '../context/AutosaveContext';
import { Assessment, EssayRubricItem, MCQQuestionItem, ReadingPassage } from '../types';
import {
  X,
  Sparkles,
  Upload,
  Save,
  FileText,
  FileSpreadsheet,
  FileQuestion,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Loader2,
  BookOpen,
  Camera,
  Calculator,
  Smartphone,
  Calendar,
  Clock,
  Layers,
  Download,
  Users,
  Copy,
  Check,
  FileCode,
  Medal,
  Award,
  GraduationCap,
  Shuffle,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { AIProgressBar, ProgressStep } from './AIProgressBar';
import { getSubjectDimensions } from '../utils/dimensionMapper';
import { safeSetItem, safeGetItem, safeRemoveItem } from '../utils/safeStorage';
import { CrossDeviceUploadModal } from './CrossDeviceUploadModal';
import { FormulaArabicHelper } from './FormulaArabicHelper';
import { QuestionFormattingToolbar } from './QuestionFormattingToolbar';
import { InlineFormattedInput } from './InlineFormattedInput';
import { DynamicQuestionEditor } from './DynamicQuestionEditor';
import { getSubjectKktpForClass, getGradeLevelFromClass } from '../utils/kktpHelper';
import { optimizeDocumentForAI } from '../utils/imageCompressor';
import { analyzeEssayFlexibility, generateTeacherNotesAndTolerance } from '../utils/essayTypeDetector';
import { getAssessmentClassesList, cleanCanonicalClass } from '../utils/classHelper';
import { generateDSMart50Questions } from '../utils/dsmartHelper';
import { generateOlimpiade30Questions } from '../utils/olimpiadeHelper';
import { OlimpiadeAssistantModal } from './OlimpiadeAssistantModal';
import { DSMART_LAMPUNG_SYSTEM_PROMPT, DSMART_STUDENT_SYNC_PAYLOAD, DSMART_BLUEPRINT_STRUCTURE } from '../data/dsmartPrompt';

interface CreateAssessmentModalProps {
  isOpen?: boolean;
  initialData?: Assessment | null;
  onClose: () => void;
  initialJenis?: 'ASTS' | 'ASAS' | 'ASAJ' | 'DSMART' | 'Olimpiade' | 'SIMULASI';
  initialMataPelajaran?: string;
  initialTargetClasses?: string[];
  initialMcqCount?: number;
  assignmentId?: string;
}

const AI_PARSE_STEPS: ProgressStep[] = [
  { title: 'Membaca & Memvalidasi Berkas', description: 'Memeriksa berkas Word / PDF / Gambar dan mengekstrak teks sumber' },
  { title: 'Menghubungkan ke Gemini AI Vision', description: 'Mengirim konten soal dengan pengenalan struktur dokumen' },
  { title: 'Menganalisis Butir Soal & Kunci Jawaban', description: 'Menyusun butir pertanyaan, rubrik penilaian, dan dimensi pembelajaran' },
  { title: 'Finalisasi & Verifikasi Format', description: 'Memastikan konsistensi nomor dan skor butir soal' },
];

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    if (!year || !month || !day) return dateStr;
    const d = new Date(year, month - 1, day);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const dayName = days[d.getDay()];
    const monthName = months[d.getMonth()];
    const formattedDay = String(day).padStart(2, '0');
    return `${dayName}, ${formattedDay} ${monthName} ${year}`;
  } catch (e) {
    return dateStr;
  }
}

export function parseIndonesianDateToISO(str: string): string {
  if (!str) return new Date().toISOString().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(str.trim())) return str.trim();
  const months: Record<string, string> = {
    januari: '01', februari: '02', maret: '03', april: '04',
    mei: '05', juni: '06', juli: '07', agustus: '08',
    september: '09', oktober: '10', november: '11', desember: '12'
  };
  const clean = str.replace(/^[A-Za-z]+,\s*/, '').trim();
  const parts = clean.split(/\s+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const m = months[parts[1].toLowerCase()];
    const year = parts[2];
    if (m && year && day) {
      return `${year}-${m}-${day}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

export function parseTimesFromPukul(pukulStr: string): { start: string; end: string } {
  if (!pukulStr) return { start: '07:30', end: '09:00' };
  const matches = pukulStr.match(/(\d{1,2})[.:](\d{2})/g);
  if (matches && matches.length >= 2) {
    const start = matches[0].replace('.', ':').padStart(5, '0');
    const end = matches[1].replace('.', ':').padStart(5, '0');
    return { start, end };
  } else if (matches && matches.length === 1) {
    const start = matches[0].replace('.', ':').padStart(5, '0');
    return { start, end: '09:00' };
  }
  return { start: '07:30', end: '09:00' };
}

export function calculateDurationMinutes(start: string, end: string): number {
  if (!start || !end) return 90;
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM)) return 90;
  let diff = (eH * 60 + eM) - (sH * 60 + sM);
  if (diff <= 0) diff += 24 * 60;
  return diff;
}

export function formatTimeRangeIndonesian(start: string, end: string): string {
  if (!start || !end) return '07.30 - 09.00 WIB';
  const sDot = start.replace(':', '.');
  const eDot = end.replace(':', '.');
  return `${sDot} - ${eDot} WIB`;
}

export function addMinutesToTime(start: string, minutes: number): string {
  if (!start) return '09:00';
  const [sH, sM] = start.split(':').map(Number);
  if (isNaN(sH) || isNaN(sM)) return '09:00';
  let totalMin = sH * 60 + sM + minutes;
  totalMin = totalMin % (24 * 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export const CreateAssessmentModal: React.FC<CreateAssessmentModalProps> = ({
  isOpen = true,
  initialData,
  onClose,
  initialJenis,
  initialMataPelajaran,
  initialTargetClasses,
  initialMcqCount,
  assignmentId,
}) => {
  const { state, currentUser, saveAssessment, saveAssessmentsBatch, saveSubject, saveTeacherExamAssignment, showToast } = useApp();
  const { saveDraft, getDraft, removeDraft, hasDraft } = useAutosave();

  const filteredSubjectsForTeacher = useMemo(() => {
    if (!state?.subjects) return [];
    if (!currentUser) return [];
    if (currentUser.role === 'admin') return state.subjects;
    
    const subs = new Set<string>();
    if (Array.isArray(currentUser.mataPelajaran)) {
      currentUser.mataPelajaran.forEach((m) => subs.add(m.toLowerCase().trim()));
    }
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

    if (subs.has('semua mata pelajaran')) return state.subjects;
    return state.subjects.filter((s) => subs.has(s.nama.toLowerCase().trim()));
  }, [state?.subjects, currentUser]);

  const prevIsOpenRef = useRef(false);
  const prevInitialDataIdRef = useRef<string | null | undefined>(undefined);

  const activeExamTypeFromState = state.examManagement?.activeExamType;
  const fallbackActive = activeExamTypeFromState && activeExamTypeFromState !== 'SEMUA' ? activeExamTypeFromState : 'ASTS';
  const effectiveInitialJenis = initialData?.jenis || initialJenis || fallbackActive;
  const [jenis, setJenis] = useState<'ASTS' | 'ASAS' | 'ASAJ' | 'DSMART' | 'Olimpiade' | 'SIMULASI'>(effectiveInitialJenis);
  // ASAJ Specific States
  const [paketUjian, setPaketUjian] = useState<'Utama' | 'Susulan'>(initialData?.paketUjian || 'Utama');
  const [randomizeQuestions, setRandomizeQuestions] = useState<boolean>(initialData?.randomizeQuestions ?? true);
  const [randomizeOptions, setRandomizeOptions] = useState<boolean>(initialData?.randomizeOptions ?? true);
  const [validationStatus, setValidationStatus] = useState<'Draft' | 'Siap Uji / Tervalidasi' | 'Terjadwal'>(initialData?.validationStatus || 'Siap Uji / Tervalidasi');
  const [weights, setWeights] = useState({
    pg: initialData?.questionWeights?.pg ?? 50,
    pgKompleks: initialData?.questionWeights?.pgKompleks ?? 20,
    menjodohkan: initialData?.questionWeights?.menjodohkan ?? 15,
    isian: initialData?.questionWeights?.isian ?? 5,
    uraian: initialData?.questionWeights?.uraian ?? 10,
  });
  const [isDSmartPromptModalOpen, setIsDSmartPromptModalOpen] = useState(false);
  const [copiedDSmartPrompt, setCopiedDSmartPrompt] = useState(false);
  const [copiedDSmartPayload, setCopiedDSmartPayload] = useState(false);
  const [isOlimpiadeModalOpen, setIsOlimpiadeModalOpen] = useState(false);
  const [olimpiadeModalMenu, setOlimpiadeModalMenu] = useState<'Piagam' | 'Pengumuman Juara' | 'Struktur Menu'>('Pengumuman Juara');

  const defaultSubj = useMemo(() => {
    if (initialData?.mataPelajaran) return initialData.mataPelajaran;
    if (effectiveInitialJenis === 'DSMART') {
      return "Simulasi D'SMART Lampung (4 Instrumen Utama: Literasi, Numerasi, Pra Kampus, Karakter)";
    }
    if (effectiveInitialJenis === 'Olimpiade') {
      return initialMataPelajaran || 'Seleksi OSN / Olimpiade Sains (Matematika & IPA)';
    }
    if (initialMataPelajaran) return initialMataPelajaran;
    return '';
  }, [initialData?.mataPelajaran, effectiveInitialJenis, initialMataPelajaran]);

  const [mataPelajaran, setMataPelajaran] = useState(defaultSubj);

  useEffect(() => {
    if (isOpen && !initialData && !mataPelajaran && filteredSubjectsForTeacher.length > 0 && jenis !== 'DSMART') {
      setMataPelajaran(filteredSubjectsForTeacher[0].nama);
    }
  }, [isOpen, initialData, mataPelajaran, filteredSubjectsForTeacher, jenis]);

  const [kelas, setKelas] = useState(initialData?.kelas || (initialTargetClasses?.[0] || 'X.1'));
  
  // Multi-Class Support State
  const [classSelectionMode, setClassSelectionMode] = useState<'single' | 'multi'>(() => {
    if (initialTargetClasses && initialTargetClasses.length > 1) return 'multi';
    return 'single';
  });
  const [selectedClasses, setSelectedClasses] = useState<string[]>(() => {
    if (initialData?.kelas) return [initialData.kelas];
    if (initialTargetClasses && initialTargetClasses.length > 0) return initialTargetClasses;
    return state?.classes && state.classes.length > 0 ? [state.classes[0].nama] : ['X.1'];
  });
  const [activeClassTab, setActiveClassTab] = useState<string>('ALL');

  const [fase, setFase] = useState<'Fase E' | 'Fase F'>(initialData?.fase || 'Fase E');
  const [tahunAjaran, setTahunAjaran] = useState(initialData?.tahunAjaran || state?.schoolInfo?.tahunAjaranAktif || '2026/2027');
  const [semester, setSemester] = useState<'Ganjil' | 'Genap'>(initialData?.semester || state?.schoolInfo?.semesterAktif || 'Ganjil');
  const [hariTanggal, setHariTanggal] = useState(initialData?.hariTanggal || '');
  const [pukul, setPukul] = useState(initialData?.pukul || '07.30 - 09.00 WIB');
  const [waktuMenit, setWaktuMenit] = useState(initialData?.waktuMenit || 90);
  const [guruPengampu, setGuruPengampu] = useState(initialData?.guruPengampu || currentUser?.nama || 'Guru Mata Pelajaran');
  const [kktp, setKktp] = useState(initialData?.kktp || 75);
  const [petunjukUmum, setPetunjukUmum] = useState(
    initialData?.petunjukUmum ||
      'Jawab dan jelaskan Soal berikut dengan tepat dan jelas!'
  );

  // Date and Time picker states
  const [tanggalISO, setTanggalISO] = useState<string>(() => {
    return parseIndonesianDateToISO(initialData?.hariTanggal || '');
  });
  const [jamMulai, setJamMulai] = useState<string>(() => {
    return parseTimesFromPukul(initialData?.pukul || '').start;
  });
  const [jamSelesai, setJamSelesai] = useState<string>(() => {
    return parseTimesFromPukul(initialData?.pukul || '').end;
  });

  // Questions state
  const [essayCount, setEssayCount] = useState<number>(initialData?.essayRubrik?.length || 10);
  const [essayRubrik, setEssayRubrik] = useState<EssayRubricItem[]>(
    initialData?.essayRubrik || []
  );

  const [mcqCount, setMcqCount] = useState<number>(
    initialData?.mcqQuestions?.length || initialMcqCount || (effectiveInitialJenis === 'DSMART' ? 50 : effectiveInitialJenis === 'Olimpiade' ? 30 : 40)
  );
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestionItem[]>(
    initialData?.mcqQuestions || []
  );

  const [readingPassages, setReadingPassages] = useState<ReadingPassage[]>(
    initialData?.readingPassages || []
  );

  // AI Generator / Parser Progress State
  const [promptTopic, setPromptTopic] = useState('');
  const [materialFiles, setMaterialFiles] = useState<
    Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      mimeType: string;
      textContent?: string;
      contentBase64?: string;
    }>
  >([]);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiProgressPercent, setAiProgressPercent] = useState(10);
  const [aiActiveStepIndex, setAiActiveStepIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>(
    initialData?.studentIds || []
  );
  const [isWebrtcModalOpen, setIsWebrtcModalOpen] = useState(false);
  const [hasSavedDraft, setHasSavedDraft] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);

  // Effective target class list based on mode
  const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const effectiveTargetClasses = classSelectionMode === 'single' ? [kelas] : (selectedClasses.length > 0 ? selectedClasses : [kelas]);
  const canonicalTargetClasses = new Set(effectiveTargetClasses.map(cleanCanonical));

  // Filter all students in the scope of selected classes
  const allScopedStudents = state.students.filter((s) => canonicalTargetClasses.has(cleanCanonical(s.kelas)));
  
  // Single class student list (for backward-compatible single views)
  const classStudents = state.students.filter((s) => cleanCanonical(s.kelas) === cleanCanonical(kelas));

  // Filter students displayed based on active class tab
  const displayedStudents = activeClassTab === 'ALL'
    ? allScopedStudents
    : allScopedStudents.filter((s) => cleanCanonical(s.kelas) === cleanCanonical(activeClassTab));

  // Helper to check if a subject matches a religion and auto-filter students across all target classes
  const getAutomaticSelectedIds = (targetClasses: string | string[], subjectName: string) => {
    const classList = Array.isArray(targetClasses) ? targetClasses : [targetClasses];
    const canonicalList = new Set(classList.map(cleanCanonical));
    const allInScope = state.students.filter((s) => canonicalList.has(cleanCanonical(s.kelas)));
    
    // Look up per-teacher explicit selective student targeting
    const foundSbj = state.subjects.find((s) => s.nama.toLowerCase() === subjectName.toLowerCase());
    if (foundSbj && currentUser) {
      const ga = foundSbj.guruAssignments?.find(
        (a) =>
          a.teacherId === currentUser.id ||
          a.teacherName.toLowerCase() === currentUser.nama.toLowerCase()
      );
      if (ga && ga.modeSiswa === 'BEBERAPA' && Array.isArray(ga.studentIds) && ga.studentIds.length > 0) {
        const selectiveSet = new Set(ga.studentIds);
        return allInScope.filter((s) => selectiveSet.has(s.id)).map((s) => s.id);
      }
    }

    const subLower = subjectName.toLowerCase();
    
    if (subLower.includes('agama islam') || subLower.includes('pendidikan agama islam')) {
      return allInScope.filter((s) => s.agama === 'Islam').map((s) => s.id);
    }
    if (subLower.includes('agama kristen') || subLower.includes('pendidikan agama kristen')) {
      return allInScope.filter((s) => s.agama === 'Kristen').map((s) => s.id);
    }
    if (subLower.includes('agama katolik') || subLower.includes('pendidikan agama katolik')) {
      return allInScope.filter((s) => s.agama === 'Katolik').map((s) => s.id);
    }
    if (subLower.includes('agama hindu') || subLower.includes('pendidikan agama hindu')) {
      return allInScope.filter((s) => s.agama === 'Hindu').map((s) => s.id);
    }
    if (subLower.includes('agama buddha') || subLower.includes('pendidikan agama buddha')) {
      return allInScope.filter((s) => s.agama === 'Buddha').map((s) => s.id);
    }
    if (subLower.includes('agama khonghucu') || subLower.includes('agama konghucu') || subLower.includes('pendidikan agama khonghucu')) {
      return allInScope.filter((s) => s.agama === 'Khonghucu').map((s) => s.id);
    }
    
    return allInScope.map((s) => s.id);
  };

  // Multi-Class selection toggles
  const handleToggleClass = (className: string) => {
    setSelectedClasses((prev) => {
      let next: string[];
      if (prev.includes(className)) {
        if (prev.length === 1) {
          showToast('Minimal 1 Kelas', 'Minimal satu kelas harus tetap dipilih.', 'warning');
          return prev;
        }
        next = prev.filter((c) => c !== className);
      } else {
        next = [...prev, className];
      }
      // Update auto selected students
      const autoIds = getAutomaticSelectedIds(next, mataPelajaran);
      setSelectedStudentIds(autoIds);
      return next;
    });
  };

  const handleSelectGradeClasses = (gradePrefix: 'X' | 'XI' | 'XII') => {
    const matching = state.classes
      .filter((c) => {
        const name = c.nama.toUpperCase();
        if (gradePrefix === 'X') return name.startsWith('X.') || name === 'X' || c.fase === 'Fase E';
        if (gradePrefix === 'XI') return name.startsWith('XI.') || name === 'XI';
        if (gradePrefix === 'XII') return name.startsWith('XII.') || name === 'XII';
        return false;
      })
      .map((c) => c.nama);

    if (matching.length === 0) return;

    setSelectedClasses((prev) => {
      const allMatchingSelected = matching.every((c) => prev.includes(c));
      let next: string[];
      if (allMatchingSelected) {
        next = prev.filter((c) => !matching.includes(c));
        if (next.length === 0) next = [matching[0]];
      } else {
        next = Array.from(new Set([...prev, ...matching]));
      }
      const autoIds = getAutomaticSelectedIds(next, mataPelajaran);
      setSelectedStudentIds(autoIds);
      return next;
    });
  };

  const handleSelectAllClasses = () => {
    const allNames = state.classes.map((c) => c.nama);
    if (allNames.length === 0) return;
    setSelectedClasses(allNames);
    const autoIds = getAutomaticSelectedIds(allNames, mataPelajaran);
    setSelectedStudentIds(autoIds);
  };

  // Handler when user selects date in <input type="date">
  const handleDateChange = (newIsoDate: string) => {
    setTanggalISO(newIsoDate);
    const formatted = formatIndonesianDate(newIsoDate);
    setHariTanggal(formatted);
  };

  // Handler when user changes start time
  const handleJamMulaiChange = (newStart: string) => {
    setJamMulai(newStart);
    const newEnd = addMinutesToTime(newStart, waktuMenit || 90);
    setJamSelesai(newEnd);
    const formattedPukul = formatTimeRangeIndonesian(newStart, newEnd);
    setPukul(formattedPukul);
  };

  // Handler when user changes end time
  const handleJamSelesaiChange = (newEnd: string) => {
    setJamSelesai(newEnd);
    const duration = calculateDurationMinutes(jamMulai, newEnd);
    setWaktuMenit(duration);
    const formattedPukul = formatTimeRangeIndonesian(jamMulai, newEnd);
    setPukul(formattedPukul);
  };

  // Handler when user changes duration
  const handleWaktuMenitChange = (minutes: number) => {
    const validMin = Math.max(15, Math.min(300, minutes));
    setWaktuMenit(validMin);
    const newEnd = addMinutesToTime(jamMulai, validMin);
    setJamSelesai(newEnd);
    const formattedPukul = formatTimeRangeIndonesian(jamMulai, newEnd);
    setPukul(formattedPukul);
  };

  // Single robust initialization effect on modal open or switching initialData
  useEffect(() => {
    const isOpening = isOpen && !prevIsOpenRef.current;
    const isSwitchingData = isOpen && initialData?.id !== prevInitialDataIdRef.current;

    if (isOpening || isSwitchingData) {
      prevIsOpenRef.current = isOpen;
      prevInitialDataIdRef.current = initialData?.id;

      if (initialData) {
        setJenis(initialData.jenis);
        setMataPelajaran(initialData.mataPelajaran);
        const parsedClasses = getAssessmentClassesList(initialData.kelas);
        setKelas(parsedClasses[0] || initialData.kelas || 'X.1');
        setSelectedClasses(parsedClasses.length > 0 ? parsedClasses : ['X.1']);
        if (parsedClasses.length > 1) {
          setClassSelectionMode('multi');
        } else {
          setClassSelectionMode('single');
        }
        setFase(initialData.fase);
        setTahunAjaran(initialData.tahunAjaran);
        setSemester(initialData.semester);
        setHariTanggal(initialData.hariTanggal);
        setPukul(initialData.pukul);
        setWaktuMenit(initialData.waktuMenit);
        setGuruPengampu(initialData.guruPengampu);
        setKktp(initialData.kktp);
        setPetunjukUmum(initialData.petunjukUmum);
        setSelectedStudentIds(initialData.studentIds || []);

        const parsedDate = parseIndonesianDateToISO(initialData.hariTanggal);
        setTanggalISO(parsedDate);
        const { start, end } = parseTimesFromPukul(initialData.pukul);
        setJamMulai(start);
        setJamSelesai(end);

        if (initialData.essayRubrik && initialData.essayRubrik.length > 0) {
          setEssayRubrik(initialData.essayRubrik);
          setEssayCount(initialData.essayRubrik.length);
        }
        if (initialData.mcqQuestions && initialData.mcqQuestions.length > 0) {
          setMcqQuestions(initialData.mcqQuestions);
          setMcqCount(initialData.mcqQuestions.length);
        }
      } else {
        // Resolve best matching subject
        let initialMapel = '';
        if (currentUser?.mataPelajaran && currentUser.mataPelajaran.length > 0 && currentUser.mataPelajaran[0] !== 'Semua Mata Pelajaran') {
          const teacherMapel = currentUser.mataPelajaran[0];
          const matched = state?.subjects.find((s) => s.nama.toLowerCase() === teacherMapel.toLowerCase());
          initialMapel = matched ? matched.nama : teacherMapel;
        } else if (state?.subjects && state.subjects.length > 0) {
          initialMapel = state.subjects[0].nama;
        } else {
          initialMapel = 'Bahasa Indonesia';
        }

        const initialClass = state?.classes[0]?.nama || 'X.1';
        const initialFase = state?.classes[0]?.fase || 'Fase E';
        const matchedSubject = state?.subjects.find((s) => s.nama.toLowerCase() === initialMapel.toLowerCase());
        const defaultKktp = matchedSubject?.kktp || 75;

        // Mode memilih tanggal: Default to today's date formatted into official Indonesian standard
        const todayIso = new Date().toISOString().split('T')[0];
        const formattedToday = formatIndonesianDate(todayIso);

        const targetJenis = effectiveInitialJenis || 'ASTS';
        setJenis(targetJenis);
        if (defaultSubj) {
          setMataPelajaran(defaultSubj);
        } else {
          setMataPelajaran(initialMapel);
        }
        if (initialTargetClasses && initialTargetClasses.length > 0) {
          setKelas(initialTargetClasses[0]);
          setSelectedClasses(initialTargetClasses);
          setClassSelectionMode(initialTargetClasses.length > 1 ? 'multi' : 'single');
        } else {
          setKelas(initialClass);
          setSelectedClasses([initialClass]);
          setClassSelectionMode('single');
        }
        setFase(initialFase);
        setTahunAjaran(state?.schoolInfo?.tahunAjaranAktif || '2026/2027');
        setSemester(state?.schoolInfo?.semesterAktif || 'Ganjil');
        setTanggalISO(todayIso);
        setHariTanggal(formattedToday);
        setJamMulai('07:30');
        setJamSelesai('09:00');
        setPukul('07.30 - 09.00 WIB');
        setWaktuMenit(90);
        setGuruPengampu(currentUser?.nama || 'Guru Mata Pelajaran');
        setKktp(defaultKktp);
        setEssayRubrik([]);
        setMcqQuestions([]);

        const autoIds = getAutomaticSelectedIds(initialClass, defaultSubj || initialMapel);
        setSelectedStudentIds(autoIds);

        // Check if there is an unsaved draft
        const savedDraft = getDraft('create_assessment') || localStorage.getItem('smantri_draft_create_assessment');
        if (savedDraft) {
          try {
            const parsed = typeof savedDraft === 'string' ? JSON.parse(savedDraft) : savedDraft;
            if (parsed && (parsed.promptTopic || (parsed.essayRubrik && parsed.essayRubrik.length > 0) || (parsed.mcqQuestions && parsed.mcqQuestions.length > 0))) {
              setHasSavedDraft(true);
              setDraftSavedAt(parsed.savedAt || null);
            }
          } catch (e) {}
        }
      }
    } else if (!isOpen) {
      prevIsOpenRef.current = false;
    }
  }, [isOpen, initialData?.id, getDraft]);

  // Automatic Background Autosave whenever teacher edits fields in Create Assessment Modal
  useEffect(() => {
    if (!isOpen || initialData) return; // Don't overwrite existing persisted assessment unless explicit

    const hasAnyContent = promptTopic.trim().length > 0 ||
      essayRubrik.some((r) => r.soal.trim().length > 0 || r.kunciJawaban.trim().length > 0) ||
      mcqQuestions.some((q) => q.soal.trim().length > 0);

    if (hasAnyContent) {
      const draftData = {
        jenis,
        mataPelajaran,
        kelas,
        fase,
        tahunAjaran,
        semester,
        hariTanggal,
        pukul,
        waktuMenit,
        guruPengampu,
        kktp,
        petunjukUmum,
        essayRubrik,
        essayCount,
        mcqQuestions,
        mcqCount,
        promptTopic,
        selectedStudentIds,
        savedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };

      saveDraft('create_assessment', `Modul Asesmen: ${mataPelajaran || 'Baru'} (${kelas})`, draftData);
      setDraftSavedAt(draftData.savedAt);
    }
  }, [
    isOpen,
    initialData,
    jenis,
    mataPelajaran,
    kelas,
    fase,
    tahunAjaran,
    semester,
    hariTanggal,
    pukul,
    waktuMenit,
    guruPengampu,
    kktp,
    petunjukUmum,
    essayRubrik,
    essayCount,
    mcqQuestions,
    mcqCount,
    promptTopic,
    selectedStudentIds,
    saveDraft,
  ]);

  if (!isOpen || !state || !currentUser) return null;

  const enrichEssayItemsWithNotes = (items: EssayRubricItem[]): EssayRubricItem[] => {
    return items.map((item) => {
      const generated = generateTeacherNotesAndTolerance(item.soal, item.kunciJawaban, item.skorMaks);
      return {
        ...item,
        essayType: item.essayType || generated.essayType,
        catatanKhususGuru: item.catatanKhususGuru || generated.catatanKhususGuru,
        toleransiJawaban: item.toleransiJawaban || generated.toleransiJawaban,
        variasiJawabanDiterima: item.variasiJawabanDiterima || generated.variasiJawabanDiterima,
        catatanJawaban: item.catatanJawaban || item.catatanKhususGuru || generated.catatanKhususGuru,
      };
    });
  };

  const handleAutoGenerateAllNotes = () => {
    const updated = enrichEssayItemsWithNotes(essayRubrik);
    setEssayRubrik(updated);
    showToast(
      'Toleransi & Catatan Guru Berhasil Dibuat!',
      `Telah merancang toleransi & catatan khusus untuk ${updated.length} soal essay berdasarkan Essay Terbuka vs Tertutup.`,
      'success'
    );
  };

  // Auto-generate using Gemini AI based on Deep Learning prompt
  const handleAIGenerate = async () => {
    setIsGeneratingAI(true);
    showToast('Menyusun Soal AI...', 'Gemini AI sedang merancang butir soal berdasarkan Pembelajaran Mendalam...', 'info');

    // If DSMART, populate the 50 HOTS questions across the 4 instruments instantly
    if (jenis === 'DSMART') {
      const dsmart50 = generateDSMart50Questions();
      setMcqQuestions(dsmart50);
      setMcqCount(50);
      // Auto select all classes
      setClassSelectionMode('multi');
      handleSelectAllClasses();
    }

    try {
      const endpoint = jenis === 'DSMART' ? '/api/gemini/generate-from-materials' : '/api/gemini/parse-exam';
      const bodyPayload = jenis === 'DSMART'
        ? {
            materials: materialFiles,
            examType: 'DSMART',
            subjectName: mataPelajaran || "Simulasi D'SMART Lampung",
            gradeLevel: 'X, XI, XII',
            targetQuestionCount: 50,
            promptTopic: promptTopic || "Simulasi D'SMART Lampung (Literasi, Numerasi, Pra Kampus, Karakter)",
          }
        : {
            rawText: `Topik Materi: ${promptTopic || mataPelajaran}\nMata Pelajaran: ${mataPelajaran}\nKelas: ${kelas} (${fase})\nKKTP: ${kktp}`,
            examType: jenis,
            targetQuestionCount: jenis === 'ASTS' ? essayCount : mcqCount,
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
      });

      const json = await res.json();
      if (json.success && json.result) {
        const r = json.result;
        if (jenis === 'ASTS' && r.essayRubrik?.length > 0) {
          const enriched = enrichEssayItemsWithNotes(r.essayRubrik);
          setEssayRubrik(enriched);
          setEssayCount(enriched.length);
        } else if ((jenis === 'ASAS' || jenis === 'DSMART') && r.mcqQuestions?.length > 0) {
          setMcqQuestions(r.mcqQuestions);
          setMcqCount(r.mcqQuestions.length);
        }
        showToast('Soal Berhasil Dibuat!', `AI telah menyusun 50 butir soal ${jenis} lengkap untuk 4 instrumen.`, 'success');
      } else {
        if (jenis === 'DSMART') {
          showToast('50 Soal DSMART Terpasang', "50 Soal Simulasi D'SMART Lampung (Literasi, Numerasi, Pra Kampus, Karakter) telah terpasang presisi.", 'success');
        } else {
          showToast('Gagal Membuat Soal', json.message || 'Respons AI tidak lengkap.', 'error');
        }
      }
    } catch (err: any) {
      console.error('AI Gen Error:', err);
      if (jenis === 'DSMART') {
        showToast('50 Soal DSMART Terpasang', "50 Soal Simulasi D'SMART Lampung (Literasi, Numerasi, Pra Kampus, Karakter) telah terpasang presisi.", 'success');
      } else {
        showToast('Gagal AI', 'Terjadi gangguan saat memanggil AI: ' + err.message, 'error');
      }
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Multi-File Material Upload Handler (Word, PDF, PowerPoint, Images, Text, etc.)
  const handleMultiMaterialUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    showToast('Memuat Berkas Materi...', `Membaca ${files.length} file materi pembelajaran...`, 'info');

    const newEntries: Array<{
      id: string;
      name: string;
      size: number;
      type: string;
      mimeType: string;
      textContent?: string;
      contentBase64?: string;
    }> = [];

    for (const file of files) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        if (
          file.type.startsWith('text/') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.csv')
        ) {
          reader.onload = (evt) => {
            const textContent = evt.target?.result as string;
            newEntries.push({
              id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              size: file.size,
              type: 'text',
              mimeType: file.type || 'text/plain',
              textContent,
            });
            resolve();
          };
          reader.readAsText(file);
        } else {
          reader.onloadend = () => {
            const base64 = reader.result as string;
            newEntries.push({
              id: `mat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              name: file.name,
              size: file.size,
              type: file.type.includes('pdf')
                ? 'pdf'
                : file.name.endsWith('.doc') || file.name.endsWith('.docx')
                ? 'word'
                : file.name.endsWith('.ppt') || file.name.endsWith('.pptx')
                ? 'ppt'
                : file.type.startsWith('image/')
                ? 'image'
                : 'file',
              mimeType: file.type || 'application/octet-stream',
              contentBase64: base64,
            });
            resolve();
          };
          reader.readAsDataURL(file);
        }
      });
    }

    setMaterialFiles((prev) => [...prev, ...newEntries]);
    showToast('Berkas Ditambahkan', `Berhasil menambahkan ${newEntries.length} berkas sumber materi.`, 'success');
    e.target.value = '';
  };

  const handleRemoveMaterialFile = (id: string) => {
    setMaterialFiles((prev) => prev.filter((m) => m.id !== id));
  };

  const handleGenerateFromMultiMaterials = async () => {
    if (materialFiles.length === 0 && !promptTopic) {
      showToast('Materi Kosong', 'Unggah minimal 1 berkas materi (Word, PDF, PowerPoint, Gambar) atau isi topik materi.', 'warning');
      return;
    }

    setIsGeneratingAI(true);
    showToast('Menganalisis Multi-Berkas...', 'Gemini AI sedang membaca seluruh materi sumber dan merancang butir soal...', 'info');

    try {
      const res = await fetch('/api/gemini/generate-from-materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materials: materialFiles,
          examType: jenis,
          subjectName: mataPelajaran || 'Bahasa Indonesia',
          gradeLevel: kelas,
          targetQuestionCount: jenis === 'ASTS' ? essayCount : mcqCount,
          promptTopic,
        }),
      });

      const json = await res.json();
      if (json.success && json.result) {
        const r = json.result;
        if (jenis === 'ASTS' && r.essayRubrik?.length > 0) {
          const enriched = enrichEssayItemsWithNotes(r.essayRubrik);
          setEssayRubrik(enriched);
          setEssayCount(enriched.length);
        } else if (jenis === 'ASAS' && r.mcqQuestions?.length > 0) {
          setMcqQuestions(r.mcqQuestions);
          setMcqCount(r.mcqQuestions.length);
        }
        showToast(
          'Soal Berhasil Dirancang!',
          `AI telah merancang soal ${jenis} sesuai seluruh berkas materi sumber yang diunggah.`,
          'success'
        );
      } else {
        showToast('Gagal Merancang Soal', json.message || 'Respons AI tidak lengkap.', 'error');
      }
    } catch (err: any) {
      showToast('Gagal AI', 'Terjadi kesalahan AI: ' + err.message, 'error');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Upload Word/PDF/Photo of questions
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsGeneratingAI(true);
    setAiProgressPercent(20);

    // Dynamic, realistic progress simulation during extraction
    const progressTimer = setInterval(() => {
      setAiProgressPercent((prev) => {
        if (prev < 88) return prev + 8;
        return prev;
      });
    }, 300);

    try {
      let base64 = '';
      if (file.type.startsWith('image/')) {
        base64 = await optimizeDocumentForAI(file);
      } else {
        base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string) || '');
          reader.readAsDataURL(file);
        });
      }

      setAiProgressPercent(75);

      if (base64) {
        const res = await fetch('/api/gemini/parse-exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            mimeType: file.type || 'image/jpeg',
            examType: jenis,
            targetQuestionCount: jenis === 'ASTS' ? essayCount : mcqCount,
          }),
        });

        const json = await res.json();
        clearInterval(progressTimer);
        setAiProgressPercent(100);

        if (json.success && json.result) {
          const r = json.result;
          if (jenis === 'ASTS' && r.essayRubrik?.length > 0) {
            const enriched = enrichEssayItemsWithNotes(r.essayRubrik);
            setEssayRubrik(enriched);
            setEssayCount(enriched.length);
          } else if (jenis === 'ASAS' && r.mcqQuestions?.length > 0) {
            setMcqQuestions(r.mcqQuestions);
            setMcqCount(r.mcqQuestions.length);
          }
          await new Promise((r) => setTimeout(r, 250));
          showToast('Dokumen Terverifikasi', 'Butir soal dan kunci berhasil diekstrak dan dirapikan.', 'success');
        }
      }
    } catch (err: any) {
      clearInterval(progressTimer);
      showToast('Gagal Membaca Berkas', err.message, 'error');
    } finally {
      clearInterval(progressTimer);
      setIsGeneratingAI(false);
      setAiProgressPercent(0);
      e.target.value = '';
    }
  };

  const handleWebRtcImageReceived = async (base64Image: string) => {
    setIsGeneratingAI(true);
    setAiProgressPercent(25);

    const progressTimer = setInterval(() => {
      setAiProgressPercent((prev) => {
        if (prev < 88) return prev + 10;
        return prev;
      });
    }, 300);

    try {
      setAiProgressPercent(70);
      const res = await fetch('/api/gemini/parse-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Image,
          mimeType: 'image/jpeg',
          examType: jenis,
          targetQuestionCount: jenis === 'ASTS' ? essayCount : mcqCount,
        }),
      });

      const json = await res.json();
      clearInterval(progressTimer);
      setAiProgressPercent(100);

      if (json.success && json.result) {
        const r = json.result;
        if (jenis === 'ASTS' && r.essayRubrik?.length > 0) {
          const enriched = enrichEssayItemsWithNotes(r.essayRubrik);
          setEssayRubrik(enriched);
          setEssayCount(enriched.length);
        } else if (jenis === 'ASAS' && r.mcqQuestions?.length > 0) {
          setMcqQuestions(r.mcqQuestions);
          setMcqCount(r.mcqQuestions.length);
        }
        await new Promise((r) => setTimeout(r, 250));
        showToast('Dokumen Terverifikasi', 'Butir soal dan kunci berhasil diterima dan diekstrak.', 'success');
      }
    } catch (err: any) {
      clearInterval(progressTimer);
      showToast('Gagal Membaca Berkas HP', err.message, 'error');
    } finally {
      clearInterval(progressTimer);
      setIsGeneratingAI(false);
      setAiProgressPercent(0);
    }
  };

  // Upload MCQ Excel Key and parse client-side
  const handleUploadMCQExcelKey = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const parsedKeys: Record<number, string> = {};
        data.forEach((row) => {
          if (!row || row.length === 0) return;
          const num = Number(row[0]) || Number(row[1]);
          const rawKey = String(row[1] || row[2] || '').trim().toUpperCase();
          const validKeys = ['A', 'B', 'C', 'D', 'E'];
          if (num && validKeys.includes(rawKey)) {
            parsedKeys[num] = rawKey;
          }
        });

        if (Object.keys(parsedKeys).length > 0) {
          const updated = [...mcqQuestions];
          Object.entries(parsedKeys).forEach(([numStr, key]) => {
            const num = Number(numStr);
            const idx = updated.findIndex((q) => q.nomor === num);
            if (idx >= 0) {
              updated[idx].kunci = key;
            } else {
              updated.push({
                nomor: num,
                soal: `Soal Nomor ${num}`,
                pilihan: { A: 'Opsi A', B: 'Opsi B', C: 'Opsi C', D: 'Opsi D', E: 'Opsi E' },
                kunci: key,
                skor: 2,
              });
            }
          });
          updated.sort((a, b) => a.nomor - b.nomor);
          setMcqQuestions(updated);
          setMcqCount(updated.length);
          showToast('Kunci Jawaban Diimpor', `Berhasil memuat ${Object.keys(parsedKeys).length} kunci jawaban dari file Excel.`, 'success');
        } else {
          showToast('Format Tidak Cocok', 'Pastikan kolom pertama berisi nomor soal (1, 2, 3...) dan kolom kedua berisi kunci jawaban (A, B, C, D, E).', 'warning');
        }
      } catch (err: any) {
        showToast('Gagal Membaca Excel', err.message, 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Upload Teacher Answer Key Photo / Document (OCR STEM Math/Physics/Chemistry)
  const handleUploadTeacherAnswerKey = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsGeneratingAI(true);
    setAiProgressPercent(25);

    const progressTimer = setInterval(() => {
      setAiProgressPercent((prev) => {
        if (prev < 88) return prev + 10;
        return prev;
      });
    }, 300);

    try {
      const base64List = await Promise.all(
        files.map((file) => optimizeDocumentForAI(file))
      );
      const validImages = base64List.filter(Boolean);

      if (validImages.length > 0) {
        const res = await fetch('/api/gemini/parse-answer-key', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imagesBase64: validImages,
            examType: jenis,
            subjectName: mataPelajaran,
          }),
        });

        const json = await res.json();
        clearInterval(progressTimer);
        setAiProgressPercent(100);

        if (json.success && json.result) {
          const r = json.result;
          if (jenis === 'ASTS' && r.essayRubrik?.length > 0) {
            setEssayRubrik(r.essayRubrik);
            setEssayCount(r.essayRubrik.length);
          } else if (jenis === 'ASAS' && r.mcqQuestions?.length > 0) {
            setMcqQuestions(r.mcqQuestions);
            setMcqCount(r.mcqQuestions.length);
          }
          await new Promise((r) => setTimeout(r, 250));
          showToast(
            'Kunci Jawaban Terbaca!',
            'Foto kunci jawaban & rumus-rumus STEM berhasil terbaca seketika dan dimasukkan ke butir soal.',
            'success'
          );
        } else {
          showToast('Gagal Membaca Kunci', json.message || 'Respons AI tidak lengkap.', 'error');
        }
      }
    } catch (err: any) {
      clearInterval(progressTimer);
      showToast('Gagal Membaca Foto Kunci', err.message, 'error');
    } finally {
      clearInterval(progressTimer);
      setIsGeneratingAI(false);
      setAiProgressPercent(0);
      e.target.value = '';
    }
  };

  const handleSaveDraftModule = () => {
    try {
      const draftData = {
        jenis,
        mataPelajaran,
        kelas,
        fase,
        tahunAjaran,
        semester,
        hariTanggal,
        pukul,
        waktuMenit,
        guruPengampu,
        kktp,
        petunjukUmum,
        essayRubrik,
        essayCount,
        mcqQuestions,
        mcqCount,
        promptTopic,
        selectedStudentIds,
        savedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      };
      saveDraft('create_assessment', `Modul Asesmen: ${mataPelajaran || 'Baru'} (${kelas})`, draftData, true);
      safeSetItem('smantri_draft_create_assessment', JSON.stringify(draftData));
      setDraftSavedAt(draftData.savedAt);
      setHasSavedDraft(true);
      showToast('Draf Modul Tersimpan', 'Pekerjaan perancangan modul soal berhasil disimpan sebagai draf.', 'info');
    } catch (e) {}
  };

  const handleRestoreDraftModule = () => {
    try {
      const raw = getDraft('create_assessment') || safeGetItem('smantri_draft_create_assessment');
      if (!raw) return;
      const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (d) {
        if (d.jenis) setJenis(d.jenis);
        if (d.mataPelajaran) setMataPelajaran(d.mataPelajaran);
        if (d.kelas) setKelas(d.kelas);
        if (d.fase) setFase(d.fase);
        if (d.tahunAjaran) setTahunAjaran(d.tahunAjaran);
        if (d.semester) setSemester(d.semester);
        if (d.hariTanggal) {
          setHariTanggal(d.hariTanggal);
          setTanggalISO(parseIndonesianDateToISO(d.hariTanggal));
        }
        if (d.pukul) {
          setPukul(d.pukul);
          const { start, end } = parseTimesFromPukul(d.pukul);
          setJamMulai(start);
          setJamSelesai(end);
        }
        if (d.waktuMenit) setWaktuMenit(d.waktuMenit);
        if (d.guruPengampu) setGuruPengampu(d.guruPengampu);
        if (d.kktp) setKktp(d.kktp);
        if (d.petunjukUmum) setPetunjukUmum(d.petunjukUmum);
        if (d.essayRubrik && d.essayRubrik.length > 0) {
          setEssayRubrik(d.essayRubrik);
          setEssayCount(d.essayRubrik.length);
        }
        if (d.mcqQuestions && d.mcqQuestions.length > 0) {
          setMcqQuestions(d.mcqQuestions);
          setMcqCount(d.mcqQuestions.length);
        }
        if (d.promptTopic) setPromptTopic(d.promptTopic);
        if (d.selectedStudentIds) setSelectedStudentIds(d.selectedStudentIds);
        showToast('Draf Dipulihkan', 'Pekerjaan pembuatan modul soal terakhir berhasil dipulihkan.', 'success');
        setHasSavedDraft(false);
      }
    } catch (e) {}
  };

  const handleDiscardDraft = () => {
    removeDraft('create_assessment');
    localStorage.removeItem('smantri_draft_create_assessment');
    setHasSavedDraft(false);
    showToast('Draf Dihapus', 'Draf modul sebelumnya telah dibersihkan.', 'info');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const targetClasses =
        classSelectionMode === 'multi' && selectedClasses.length > 0
          ? selectedClasses
          : [kelas];

      const combinedKelasString = targetClasses.join(', ');
      const primaryClass = targetClasses[0] || kelas;
      const foundClass = state.classes.find((c) => c.nama === primaryClass);
      const targetFase = foundClass?.fase || fase;

      // Filter students belonging to ANY of the target classes that were checked
      const matchedStudentIds = state.students
        .filter((s) => targetClasses.some((cls) => cleanCanonicalClass(cls) === cleanCanonicalClass(s.kelas)))
        .filter((s) => selectedStudentIds.length === 0 || selectedStudentIds.includes(s.id))
        .map((s) => s.id);

      const totalQuestionsInputted = mcqQuestions.length > 0 ? mcqQuestions.length : (essayRubrik.length > 0 ? essayRubrik.length : 0);

      const effectiveAsgnId = assignmentId || initialData?.assignmentId;

      const newAssessment: Assessment = {
        id: initialData?.id || `asm-${Date.now()}`,
        guruId: currentUser?.id,
        jenis,
        paketUjian: jenis === 'ASAJ' ? paketUjian : undefined,
        randomizeQuestions,
        randomizeOptions,
        validationStatus: jenis === 'ASAJ' ? validationStatus : undefined,
        questionWeights: jenis === 'ASAJ' ? weights : undefined,
        judul:
          initialData?.judul ||
          (jenis === 'ASAJ'
            ? `ASAJ KELAS XII (UJIAN SEKOLAH) ${paketUjian.toUpperCase()} - ${mataPelajaran.toUpperCase()} T.P ${tahunAjaran}`
            : (jenis as string) === 'DSMART'
            ? `SIMULASI D'SMART LAMPUNG - KELAS XII T.P ${tahunAjaran}`
            : jenis === 'Olimpiade'
            ? `SELEKSI OSN / OLIMPIADE - T.P ${tahunAjaran}`
            : jenis === 'ASTS'
            ? `SOAL URAIAN ESSAY / TUGAS ${semester.toUpperCase()} T.P ${tahunAjaran}`
            : `BANK SOAL ASESMEN SUMATIF ${semester.toUpperCase()} T.P ${tahunAjaran}`),
        mataPelajaran,
        kelas: combinedKelasString,
        fase: targetFase,
        tahunAjaran,
        semester,
        hariTanggal,
        pukul,
        waktuMenit: Number(waktuMenit),
        guruPengampu,
        kktp: Number(kktp),
        jumlahSoal: totalQuestionsInputted,
        petunjukUmum,
        essayRubrik: essayRubrik,
        mcqQuestions: mcqQuestions,
        readingPassages: readingPassages.length > 0 ? readingPassages : undefined,
        submissions: initialData?.submissions || [],
        studentIds: matchedStudentIds.length > 0 ? matchedStudentIds : undefined,
        assignmentId: effectiveAsgnId,
        createdAt: initialData?.createdAt || new Date().toISOString(),
      };

      // Clean up draft upon save
      removeDraft('create_assessment');
      localStorage.removeItem('smantri_draft_create_assessment');

      setSaving(false);
      onClose();

      saveAssessment(newAssessment);

      // Real-time synchronization to teacher's assignment record
      let targetAsgn = effectiveAsgnId && state.examManagement?.teacherAssignments
        ? state.examManagement.teacherAssignments.find((a) => a.id === effectiveAsgnId)
        : undefined;

      if (!targetAsgn && state.examManagement?.teacherAssignments) {
        // Auto-link to matching active assignment if teacher created assessment directly
        targetAsgn = state.examManagement.teacherAssignments.find((a) => {
          const isCategoryMatch = 
            (jenis === 'DSMART' && a.category === "Simulasi D'SMART Lampung") ||
            (jenis === 'Olimpiade' && (a.category === "Seleksi OSN/Olimpiade" || a.category === "Olimpiade Sekolah")) ||
            (jenis === 'ASTS' && a.category === 'ASTS' && (a.subjectName || '').toLowerCase().trim() === (mataPelajaran || '').toLowerCase().trim()) ||
            (jenis === 'ASAS' && a.category === 'ASAS' && (a.subjectName || '').toLowerCase().trim() === (mataPelajaran || '').toLowerCase().trim());

          const isTeacherMatch = a.teacherId === currentUser?.id || (currentUser?.nama && (a.teacherName || '').toLowerCase().trim() === currentUser.nama.toLowerCase().trim());
          return isCategoryMatch && isTeacherMatch;
        });
      }

      if (targetAsgn) {
        const target = targetAsgn.targetQuestions || (jenis === 'DSMART' ? 50 : jenis === 'Olimpiade' ? 30 : jenis === 'ASTS' ? 10 : 40);
        const newStatus = totalQuestionsInputted >= target ? 'Selesai Digarap' : (totalQuestionsInputted > 0 ? 'Sedang Digarap' : 'Belum Digarap');
        saveTeacherExamAssignment({
          ...targetAsgn,
          currentQuestionsCount: totalQuestionsInputted,
          status: newStatus,
        });
      }

      // Save/update Subject back to Master Data so teacher's chosen subject and KKTP persist across entire system
      const targetSubject = state.subjects.find((s) => s.nama.toLowerCase() === mataPelajaran.toLowerCase());
      if (targetSubject) {
        if (targetSubject.kktp !== Number(kktp)) {
          saveSubject({ ...targetSubject, kktp: Number(kktp) });
        }
      } else if (mataPelajaran) {
        saveSubject({
          id: `sbj-${Date.now()}`,
          nama: mataPelajaran,
          kode: mataPelajaran.replace(/[^A-Za-z0-9]/g, '').substring(0, 4).toUpperCase() || 'MAPEL',
          kktp: Number(kktp) || 75,
        });
      }
    } catch (err: any) {
      showToast('Gagal Menyimpan', err?.message || 'Terjadi kesalahan saat menyimpan asesmen.', 'error');
      setSaving(false);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto text-slate-800 cursor-default"
      >
        {/* Modal Header */}
        <div className="bg-slate-900 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-600/30 text-indigo-300">
              <FileQuestion className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">
                {initialData ? 'Edit Modul Asesmen' : 'Penyusunan Asesmen ASTS / ASAS Baru'}
              </h3>
              <p className="text-xs text-slate-400">
                Penyusunan format resmi SMAN 3 Tumijajar terintegrasi AI Vision
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6 text-xs overscroll-contain">
            {/* Draft Notification Banner */}
          {hasSavedDraft && (
            <div className="p-4 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold text-amber-900 block">
                    Ditemukan Draf Pembuatan Soal Terakhir {draftSavedAt ? `(Pukul ${draftSavedAt})` : ''}
                  </span>
                  <span className="text-[11px] text-amber-800">
                    Anda dapat melanjutkan perancangan modul soal dari pekerjaan sebelumnya tanpa harus mengulang.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleRestoreDraftModule}
                  className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  Lanjutkan Draf Terakhir
                </button>
                <button
                  type="button"
                  onClick={handleDiscardDraft}
                  className="px-2.5 py-1.5 text-slate-500 hover:text-slate-800 rounded-xl text-xs cursor-pointer"
                >
                  Abaikan
                </button>
              </div>
            </div>
          )}

          {/* Top Options: Format Bank Soal & Penentuan Jumlah Soal Manual */}
          <div className="space-y-3">
            {state.examManagement?.activeExamType && state.examManagement.activeExamType !== 'SEMUA' && (
              <div className="flex items-center justify-between p-2.5 px-3.5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    Sesi Ujian Aktif Sekolah:{' '}
                    <strong>{state.examManagement.activeExamName || state.examManagement.activeExamType}</strong>
                  </span>
                </div>
                {jenis !== state.examManagement.activeExamType && (
                  <button
                    type="button"
                    onClick={() => {
                      const active = state.examManagement?.activeExamType;
                      if (active === 'Olimpiade') {
                        setJenis('Olimpiade');
                        setMcqCount(30);
                        setMataPelajaran('Seleksi OSN / Olimpiade Sains');
                        const osn30 = generateOlimpiade30Questions();
                        setMcqQuestions(osn30);
                      } else if (active === 'DSMART') {
                        setJenis('DSMART');
                        setMcqCount(50);
                        setMataPelajaran(
                          "Simulasi D'SMART Lampung (4 Instrumen Utama: Literasi, Numerasi, Pra Kampus, Karakter)"
                        );
                        const dsmart50 = generateDSMart50Questions();
                        setMcqQuestions(dsmart50);
                        setClassSelectionMode('multi');
                        handleSelectAllClasses();
                      } else if (active === 'ASTS') {
                        setJenis('ASTS');
                      } else if (active === 'ASAS') {
                        setJenis('ASAS');
                      }
                    }}
                    className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950 cursor-pointer"
                  >
                    Beralih ke Sesi {state.examManagement.activeExamType}
                  </button>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 p-1.5 bg-slate-100 rounded-2xl">
              {/* Opsi ASAJ Khusus Kelas XII */}
              <button
                type="button"
                onClick={() => {
                  setJenis('ASAJ');
                  setFase('Fase F');
                  // Auto-lock to Grade XII classes
                  const grade12 = state.classes.filter((c) => /XII|12/i.test(c.nama)).map((c) => c.nama);
                  if (grade12.length > 0) {
                    setClassSelectionMode('multi');
                    setSelectedClasses(grade12);
                    setKelas(grade12[0]);
                  }
                  if (mataPelajaran.toLowerCase().includes("d'smart") || mataPelajaran.toLowerCase().includes("olimpiade")) {
                    setMataPelajaran(filteredSubjectsForTeacher[0]?.nama || '');
                  }
                  setPetunjukUmum("Pilihlah salah satu jawaban yang paling tepat (A, B, C, D, E) atau jawablah uraian dengan jelas dan cermat pada lembar jawaban CBT ASAJ Kelas XII SMAN 3 Tumijajar.");
                  showToast("Mode ASAJ Kelas XII", "Target rombel terkunci otomatis pada seluruh Kelas XII (Fase F).", "info");
                }}
                className={`py-3 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  jenis === 'ASAJ'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400'
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-amber-500" />
                <span>ASAJ Kelas XII</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setJenis('ASAS');
                  if (mataPelajaran.toLowerCase().includes("d'smart") || mataPelajaran.toLowerCase().includes("olimpiade")) {
                    setMataPelajaran(filteredSubjectsForTeacher[0]?.nama || '');
                  }
                }}
                className={`py-3 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  jenis === 'ASAS'
                    ? 'bg-sky-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Soal Objektif / ASAS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setJenis('ASTS');
                  if (mataPelajaran.toLowerCase().includes("d'smart") || mataPelajaran.toLowerCase().includes("olimpiade")) {
                    setMataPelajaran(filteredSubjectsForTeacher[0]?.nama || '');
                  }
                }}
                className={`py-3 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  jenis === 'ASTS'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Soal Uraian / ASTS</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setJenis('DSMART');
                  setMcqCount(50);
                  setMataPelajaran("Simulasi D'SMART Lampung (4 Instrumen Utama: Literasi, Numerasi, Pra Kampus, Karakter)");
                  setPromptTopic("Simulasi D'SMART Lampung (Literasi, Numerasi, Pra Kampus, Survei Karakter)");
                  setPetunjukUmum("Pilihlah salah satu jawaban yang paling tepat (A, B, C, D, E) pada lembar jawaban komputer/online SiMantri SMAN 3 Tumijajar.");
                  
                  // Instantly populate the 50 HOTS questions across the 4 instruments
                  const dsmart50 = generateDSMart50Questions();
                  setMcqQuestions(dsmart50);
                  
                  // Auto select all classes and all students
                  setClassSelectionMode('multi');
                  handleSelectAllClasses();
                  showToast("50 Soal DSMART Siap!", "50 Soal Simulasi D'SMART Lampung untuk 4 instrumen utama telah dibuat secara instan tanpa perlu unggah file.", "success");
                }}
                className={`py-3 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  jenis === 'DSMART'
                    ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-900'
                }`}
              >
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>Simulasi D'SMART</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setJenis('Olimpiade');
                  setMcqCount(30);
                  setMataPelajaran("Seleksi OSN / Olimpiade Sains");
                  setPromptTopic("Seleksi OSN / Olimpiade Sains SMAN 3 Tumijajar");
                  setPetunjukUmum("Pilihlah salah satu jawaban yang paling tepat (A, B, C, D, E) pada lembar jawaban CBT Olimpiade SiMantri SMAN 3 Tumijajar.");
                  
                  const osn30 = generateOlimpiade30Questions();
                  setMcqQuestions(osn30);
                  showToast("30 Soal Olimpiade Siap!", "30 Soal HOTS Kompetisi Seleksi OSN / Olimpiade Sains telah terpasang presisi.", "success");
                }}
                className={`py-3 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  jenis === 'Olimpiade'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400'
                    : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                }`}
              >
                <Medal className="w-4 h-4 text-amber-500" />
                <span>Seleksi OSN / Olimpiade</span>
              </button>
            </div>

            {/* Special Banner when Seleksi OSN / Olimpiade is Selected */}
            {jenis === 'Olimpiade' && (
              <div className="p-4 bg-gradient-to-br from-amber-950 via-slate-900 to-indigo-950 text-white rounded-2xl border border-amber-500/40 shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-400/40 shrink-0">
                      <Medal className="w-5 h-5 text-amber-300 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm text-white">
                          Mode Ujian CBT Olimpiade & Seleksi OSN
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-amber-500/30 text-amber-300 border border-amber-400/50">
                          30 Soal HOTS & Administrasi
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-100/80 font-medium mt-0.5">
                        Menu Tindakan Spesialis: Generasi Teks Piagam Penghargaan Resmi, Pengumuman Pemenang Juara (1, 2, 3, Harapan 1), &amp; Alur Navigasi Olimpiade.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const osn30 = generateOlimpiade30Questions();
                      setMcqQuestions(osn30);
                      setMcqCount(30);
                      showToast("Soal HOTS Olimpiade Diperbarui", "30 Soal HOTS Kompetisi OSN telah dimuat ke bank soal.", "success");
                    }}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Muat 30 Soal HOTS OSN</span>
                  </button>
                </div>

                {/* Sub-Menu Action Buttons for Olimpiade */}
                <div className="pt-2 border-t border-amber-500/20 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOlimpiadeModalMenu('Piagam');
                      setIsOlimpiadeModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Award className="w-4 h-4 text-amber-300" />
                    <span>1. Teks Piagam Penghargaan</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOlimpiadeModalMenu('Pengumuman Juara');
                      setIsOlimpiadeModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-4 h-4 text-amber-300" />
                    <span>2. Pengumuman Juara (1, 2, 3, H1)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setOlimpiadeModalMenu('Struktur Menu');
                      setIsOlimpiadeModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Layers className="w-4 h-4 text-amber-300" />
                    <span>3. Menu Navigasi Olimpiade</span>
                  </button>
                </div>
              </div>
            )}

            {/* Special Banner when Simulasi D'SMART Lampung is Selected */}
            {jenis === 'DSMART' && (
              <div className="p-4 bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-900 text-white rounded-2xl border border-emerald-500/40 shadow-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/40 shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-sm text-white">
                          Simulasi D'SMART Lampung (50 Soal PG HOTS)
                        </h4>
                        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-500/30 text-emerald-300 border border-emerald-400/50">
                          SMAN 3 TUMIJAJAR
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-200/80">
                        Standar Psikometri Nasional &amp; Konteks Lokal Tulang Bawang Barat (Nenemo: Nemen, Nedes, Nerimo).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const dsmartPrompt = `You are an expert psychometrician, curriculum developer, and Senior Test Item Writer for high-stakes national examinations in Indonesia. Your task is to generate a comprehensive, high-quality, and deeply contextualized Question Bank consisting of exactly 50 Multiple Choice Questions (Pilihan Ganda - 5 options: A, B, C, D, E) for "Simulasi D'SMART Lampung". 

This Question Bank will be uploaded to "SiMantri", the LMS of SMAN 3 Tumijajar, to prepare Grade 12 students for the official D'SMART evaluation.

---

### [CORE SPECIFICATIONS & CONTEXTUAL RULES]
1. Language: Written strictly in formal, academic Indonesian (Bahasa Indonesia baku yang komunikatif namun berbobot).
2. Contextualization: Integrate local contexts of Lampung and Tulang Bawang Barat (e.g., local commodities like cassava/rubber, agro-industry, multicultural dynamics, local wisdom like Nenemo: Nemen, Nedes, Nerimo) where applicable, especially in Numeracy and Character Survey.
3. Cognitive Level: Balance between Medium (Aplikasi) and High-Order Thinking Skills (HOTS - Analisis, Evaluasi, Kreasi). Avoid simple recall questions.
4. Structure per Item: Every single question must follow this strict metadata format:
   - Topic: [Specify the Sub-Topic]
   - Stimulus: [Text, data table, or descriptive graphic representation]
   - Question: [Clear, unambiguous stem]
   - Option A: [Text] -> Reason: [Why it is correct/incorrect]
   - Option B: [Text] -> Reason: [Why it is correct/incorrect]
   - Option C: [Text] -> Reason: [Why it is correct/incorrect]
   - Option D: [Text] -> Reason: [Why it is correct/incorrect]
   - Option E: [Text] -> Reason: [Why it is correct/incorrect]
   - Correct Answer: [A / B / C / D / E]
   - Hint: [A short, conceptual clue for students]

---

### [EXACT BLUEPRINT & DISTRIBUTION OF THE 50 QUESTIONS]

#### PART 1: LITERASI MEMBACA (15 Questions | Items 1 - 15)
Focus on evaluating the student's ability to understand, use, evaluate, and reflect on written texts.
- Items 1-5: Informational Texts (Scientific & Socio-humaniora). Themes: Green technology, renewable energy, digital economy, or modern sociology.
- Items 6-10: Literary Texts (Sastra & Culture). Themes: Reflection of moral values, philosophy, short stories, or essays on local/national heritage.
- Items 11-15: Critical Discourse Analysis & Evaluation. Assessing bias, underlying assumptions, logical fallacies, and structural intent of the author.

#### PART 2: NUMERASI (15 Questions | Items 16 - 30)
Focus on mathematical reasoning, formulas, and real-world problem-solving.
- Items 16-19: Algebra & Functions (Exponential growth, quadratic modeling, financial math, function transformations).
- Items 20-23: Data & Uncertainty (Descriptive statistics, weighted average, probability, reading complex matrices/graphs).
- Items 24-27: Geometry & Measurement (Spatial reasoning, trigonometry, coordinate boundaries, optimization of area/volume).
- Items 28-30: Number Systems & Logic (Patterns, numerical logic, sequences).

#### PART 3: PEMAHAMAN PRA KAMPUS (10 Questions | Items 31 - 40)
Focus on transition to higher education, national selection mechanisms, and scholarship readiness.
- Items 31-34: National Selection Literacy (SNBP portfolio strategies, UTBK-SNBT Scholastic Aptitude logic, Independent selection ethics).
- Items 35-37: Scholarship & Global Opportunities (Beasiswa Indonesia Maju/BIM, KIP-Kuliah, decoding Personal Statement criteria, motivation essay structure).
- Items 38-40: Academic Rigor & University Adaptation (Critical thinking in research, university-level citations, active learning, time-management under academic pressure).

#### PART 4: SURVEI KARAKTER (10 Questions | Items 41 - 50)
Focus on situational judgment tests evaluating character according to Profil Pelajar Pancasila and moral reasoning.
- Items 41-43: Global Diversity & Nationalism (Balancing local identity with global forces, responding to cultural shifts critically).
- Items 44-46: Integrity & Moral Reasoning (Anti-plagiarism dilemmas, academic honesty vs. peer pressure, high-level ethical decision making).
- Items 47-50: Social Collaboration & Civic Engagement (Mutual cooperation/Gotong Royong, resolving community conflicts using consensus, applying the Nenemo philosophy in daily conflicts).

---

### [GENERATION INSTRUCTION]
Generate all 50 questions step-by-step from Item 1 to Item 50. Do not summarize, do not skip items, and do not truncate the output. Ensure the distractors (incorrect options) are plausible and highly challenging. Begin generating now.

---

### [ADMIN DATA MAPPING & STUDENT LMS INTEGRATION RULES]
To ensure this generated question bank can be seamlessly imported by the Admin into the "SiMantri" database and automatically mapped to the Student Accounts, you must wrap the entire 50-question database layout with the technical administrative properties (Course Code: SMART-XII-2026, Target: ALL_GRADE_12_SMAN3TUMIJAJAR).`;
                        navigator.clipboard.writeText(dsmartPrompt);
                        showToast("Prompt Disalin!", "Prompt resmi Simulasi D'SMART Lampung berhasil disalin ke clipboard.", "success");
                      }}
                      className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer"
                    >
                      Salin Prompt Resmi
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingAI}
                      onClick={handleAIGenerate}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isGeneratingAI ? 'Menyusun...' : 'Generate 50 Soal AI'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-emerald-800/60 text-[11px]">
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-extrabold text-emerald-300 block">Part 1: Literasi</span>
                    <span className="text-slate-300 text-[10px]">15 Soal (Butir 1-15)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-extrabold text-teal-300 block">Part 2: Numerasi</span>
                    <span className="text-slate-300 text-[10px]">15 Soal (Butir 16-30)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-extrabold text-sky-300 block">Part 3: Pra Kampus</span>
                    <span className="text-slate-300 text-[10px]">10 Soal (Butir 31-40)</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-extrabold text-amber-300 block">Part 4: Karakter</span>
                    <span className="text-slate-300 text-[10px]">10 Soal (Butir 41-50)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Question Count & Auto-Sync Indicator */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl font-black shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">
                    Penentuan Jumlah Soal (Manual &amp; Otomatis Disesuaikan)
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Jumlah total soal bebas ditentukan secara manual dan otomatis tersinkronisasi dengan butir soal yang diinput.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-slate-600 font-bold text-xs">Target Soal:</span>
                <div className="flex items-center border border-slate-300 rounded-xl bg-white overflow-hidden shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      if (jenis === 'ASAS') {
                        setMcqCount((prev) => Math.max(1, prev - 5));
                      } else {
                        setEssayCount((prev) => Math.max(1, prev - 1));
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={jenis === 'ASAS' ? mcqCount : essayCount}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value) || 1);
                      if (jenis === 'ASAS') {
                        setMcqCount(val);
                      } else {
                        setEssayCount(val);
                      }
                    }}
                    className="w-14 text-center font-black text-indigo-700 text-xs py-1 focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (jenis === 'ASAS') {
                        setMcqCount((prev) => prev + 5);
                      } else {
                        setEssayCount((prev) => prev + 1);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all cursor-pointer"
                  >
                    +
                  </button>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-black rounded-lg text-[10.5px] border border-emerald-300">
                  {jenis === 'ASAS' ? mcqQuestions.length : essayRubrik.length} Soal Terinput
                </span>
              </div>
            </div>
          </div>

          {/* Document Upload Area (Soal & Kunci Jawaban Lengkap) */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 via-purple-50 to-sky-50 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                  Ekstraksi Otomatis Soal &amp; Kunci Jawaban (Gemini AI Vision)
                </span>
                <span className="text-[11px] text-slate-600 font-medium">
                  {jenis === 'ASTS'
                    ? 'Unggah naskah soal essay dan rubrik kunci jawaban lengkap (Word, PDF, Foto, atau Excel).'
                    : 'Unggah naskah soal pilihan ganda beserta kunci jawaban lengkap (Word, PDF, Foto, atau Excel).'}
                </span>
              </div>
            </div>

            <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl cursor-pointer font-extrabold shadow-md text-xs transition-all shrink-0">
              <FileText className="w-4 h-4 text-white" />
              <span>Unggah Soal &amp; Kunci Jawaban</span>
              <input
                type="file"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                disabled={isGeneratingAI}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 flex items-center gap-1.5">
                  <span>Mata Pelajaran</span>
                  {jenis === 'DSMART' && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Dinonaktifkan Otomatis
                    </span>
                  )}
                </label>
                {jenis !== 'DSMART' && state.subjects.length > 0 && (
                  <span className="text-[10px] text-slate-400 font-medium">
                    {state.subjects.length} Mapel Terdaftar
                  </span>
                )}
              </div>
              <select
                disabled={jenis === 'DSMART'}
                value={mataPelajaran}
                onChange={(e) => {
                  const selectedName = e.target.value;
                  setMataPelajaran(selectedName);
                  const found = state.subjects.find((s) => s.nama.toLowerCase() === selectedName.toLowerCase());
                  if (found) {
                    const defaultTeacher = (found.guruAssignments && found.guruAssignments.length > 0)
                      ? found.guruAssignments[0].teacherName
                      : (found.guruPengampu && found.guruPengampu.length > 0)
                      ? found.guruPengampu[0]
                      : guruPengampu;
                    
                    if (!guruPengampu && defaultTeacher) {
                      setGuruPengampu(defaultTeacher);
                    }

                    const resolvedKktp = getSubjectKktpForClass(
                      found,
                      classSelectionMode === 'single' ? kelas : (selectedClasses[0] || kelas),
                      75,
                      guruPengampu || defaultTeacher
                    );
                    setKktp(resolvedKktp);
                  }
                  // Auto religion pre-selection across effective classes
                  const targetClsList = classSelectionMode === 'single' ? [kelas] : selectedClasses;
                  const autoIds = getAutomaticSelectedIds(targetClsList, selectedName);
                  setSelectedStudentIds(autoIds);
                }}
                className={`w-full p-2.5 rounded-xl text-xs font-semibold focus:outline-hidden transition-all ${
                  jenis === 'DSMART'
                    ? 'bg-emerald-50/70 border border-emerald-300 text-emerald-950 font-bold cursor-not-allowed shadow-inner'
                    : 'bg-white border border-slate-300 text-slate-900 focus:ring-2 focus:ring-indigo-500'
                }`}
              >
                {!filteredSubjectsForTeacher.some((s) => s.nama.toLowerCase() === mataPelajaran.toLowerCase()) && mataPelajaran && (
                  <option value={mataPelajaran}>
                    {mataPelajaran}
                  </option>
                )}
                {filteredSubjectsForTeacher.map((s) => (
                  <option key={s.id} value={s.nama}>
                    {s.nama} ({s.kode})
                  </option>
                ))}
              </select>
              {jenis === 'DSMART' && (
                <div className="mt-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200/90 text-[10.5px] text-emerald-800 leading-tight">
                  <span className="font-bold">Otomatis Terkunci:</span> Pilihan mapel dinonaktifkan karena Simulasi D&apos;SMART Lampung terikat langsung dengan 4 instrumen utama (Literasi Membaca 15, Numerasi 15, Pra Kampus 10, dan Karakter 10).
                </div>
              )}
            </div>

            {/* Target Class & Multi-Class Selector */}
            <div className="sm:col-span-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <label className="font-bold text-slate-800 text-xs">Target Kelas</label>
                  {classSelectionMode === 'multi' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-700 border border-indigo-200">
                      {selectedClasses.length} Kelas Terpilih
                    </span>
                  )}
                </div>

                {/* Single vs Multi-Class Mode Switch */}
                <div className="flex p-0.5 bg-slate-200/80 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setClassSelectionMode('single');
                      if (selectedClasses.length > 0) {
                        setKelas(selectedClasses[0]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      classSelectionMode === 'single'
                        ? 'bg-white text-indigo-700 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    1 Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClassSelectionMode('multi');
                      if (!selectedClasses.includes(kelas)) {
                        setSelectedClasses([kelas]);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                      classSelectionMode === 'multi'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Multi-Kelas ({state.classes.length} Rombel)
                  </button>
                </div>
              </div>

              {classSelectionMode === 'single' ? (
                <select
                  value={kelas}
                  onChange={(e) => {
                    const selectedClass = e.target.value;
                    if (selectedClass === 'ALL_CLASSES') {
                      setClassSelectionMode('multi');
                      handleSelectAllClasses();
                      return;
                    }
                    setKelas(selectedClass);
                    setSelectedClasses([selectedClass]);
                    const foundClass = state.classes.find((c) => c.nama === selectedClass);
                    if (foundClass) setFase(foundClass.fase);

                    const foundSbj = state.subjects.find((s) => s.nama.toLowerCase() === mataPelajaran.toLowerCase());
                    if (foundSbj) {
                      const resolvedKktp = getSubjectKktpForClass(
                        foundSbj,
                        selectedClass,
                        75,
                        guruPengampu
                      );
                      setKktp(resolvedKktp);
                    }

                    const autoIds = getAutomaticSelectedIds(selectedClass, mataPelajaran);
                    setSelectedStudentIds(autoIds);
                  }}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                >
                  <option value="ALL_CLASSES" className="font-extrabold text-emerald-800 bg-emerald-50">
                    Semua Kelas (X, XI, XII - Seluruh Siswa SMAN 3 Tumijajar)
                  </option>
                  {state.classes.map((c) => (
                    <option key={c.id} value={c.nama}>
                      Kelas {c.nama} ({c.fase})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  {/* Quick Filter Buttons for Multi-Class */}
                  <div className="flex flex-wrap items-center gap-1.5 pb-1 border-b border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500">Pilih Cepat:</span>
                    <button
                      type="button"
                      onClick={handleSelectAllClasses}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-[10.5px] rounded-lg border border-emerald-500 shadow-xs transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>Semua Kelas (X, XI, XII)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectGradeClasses('X')}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-300 transition-all cursor-pointer"
                    >
                      Semua Kelas X
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectGradeClasses('XI')}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-300 transition-all cursor-pointer"
                    >
                      Semua Kelas XI
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectGradeClasses('XII')}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 active:scale-95 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-300 transition-all cursor-pointer"
                    >
                      Semua Kelas XII
                    </button>
                    <button
                      type="button"
                      onClick={handleSelectAllClasses}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 active:scale-95 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-200 transition-all cursor-pointer"
                    >
                      Pilih Semua
                    </button>
                  </div>

                  {/* Multi-Class Checklist Badges Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto p-1 bg-white rounded-xl border border-slate-200">
                    {state.classes.map((cls) => {
                      const isSelected = selectedClasses.includes(cls.nama);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleToggleClass(cls.nama)}
                          className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all cursor-pointer active:scale-95 ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 font-extrabold shadow-2xs ring-1 ring-indigo-400/40'
                              : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          <div className="truncate">
                            <span className="text-xs block leading-tight">Kelas {cls.nama}</span>
                            <span className="text-[9px] text-slate-400 block leading-tight font-normal">{cls.fase}</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 pointer-events-none"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Target Peserta Ujian (Siswa) Selection Section */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>Target Peserta Ujian (Siswa)</span>
                </h4>
                <p className="text-[10px] text-slate-500">
                  Tentukan apakah seluruh siswa di kelas mengikuti ujian ini, atau saring khusus siswa tertentu (sangat berguna untuk guru Agama / Mulok selektif)
                </p>
              </div>

              {/* Toggle Mode Button */}
              <div className="flex p-0.5 bg-slate-200/80 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentIds([]);
                    showToast('Mode Semua Siswa', 'Seluruh siswa di kelas target akan didaftarkan sebagai peserta ujian.', 'info');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                    selectedStudentIds.length === 0
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Semua Siswa di Rombel Kelas
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const autoIds = getAutomaticSelectedIds(effectiveTargetClasses, mataPelajaran);
                    setSelectedStudentIds(autoIds);
                    showToast('Mode Siswa Selektif', 'Saring siswa berdasarkan agama atau checklist manual.', 'info');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold transition-all cursor-pointer ${
                    selectedStudentIds.length > 0
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Siswa Pilihan / Selektif
                </button>
              </div>
            </div>

            {selectedStudentIds.length > 0 && (
              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-3">
                {/* Auto Religion Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                  <span className="font-bold text-slate-600">Saring Cepat Agama:</span>
                  {['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu'].map((ag) => {
                    const matchingIdsInClasses = allScopedStudents.filter((s) => s.agama === ag).map((s) => s.id);
                    const isAgamaFiltered = matchingIdsInClasses.length > 0 && matchingIdsInClasses.every(id => selectedStudentIds.includes(id));
                    
                    return (
                      <button
                        key={ag}
                        type="button"
                        onClick={() => {
                          const otherIds = selectedStudentIds.filter(id => {
                            const student = state.students.find(s => s.id === id);
                            return student ? student.agama !== ag : true;
                          });
                          if (isAgamaFiltered) {
                            setSelectedStudentIds(otherIds);
                            showToast(`Saringan Agama ${ag}`, `Batal memilih siswa agama ${ag}.`, 'info');
                          } else {
                            setSelectedStudentIds([...otherIds, ...matchingIdsInClasses]);
                            showToast(`Saringan Agama ${ag}`, `Siswa agama ${ag} otomatis dipilih sebagai peserta.`, 'success');
                          }
                        }}
                        className={`px-2 py-0.5 rounded-md border font-bold transition-all cursor-pointer active:scale-95 ${
                          isAgamaFiltered
                            ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {ag} ({allScopedStudents.filter((s) => s.agama === ag).length} Anak)
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = allScopedStudents.map((s) => s.id);
                      setSelectedStudentIds(allIds);
                    }}
                    className="ml-auto px-2 py-0.5 text-xs text-indigo-600 hover:underline font-bold"
                  >
                    Pilih Semua ({allScopedStudents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedStudentIds([]);
                    }}
                    className="px-2 py-0.5 text-xs text-rose-600 hover:underline font-bold"
                  >
                    Batal Saringan
                  </button>
                </div>

                {/* Checklist Grid */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>Nama Siswa Terpilih (Total {allScopedStudents.length} di rombel):</span>
                    <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {selectedStudentIds.length} Siswa Terdaftar Peserta Ujian
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    {allScopedStudents.map((student) => {
                      const isSelected = selectedStudentIds.includes(student.id);
                      return (
                        <label
                          key={student.id}
                          className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedStudentIds(selectedStudentIds.filter((id) => id !== student.id));
                                } else {
                                  setSelectedStudentIds([...selectedStudentIds, student.id]);
                                }
                              }}
                              className="accent-indigo-600 rounded w-3.5 h-3.5 cursor-pointer shrink-0"
                            />
                            <div className="truncate">
                              <span className="text-xs truncate block leading-tight">{student.nama}</span>
                              <span className="text-[9px] text-slate-400 block leading-tight font-normal">
                                No {student.noUrut || '-'} • {student.kelas}
                              </span>
                            </div>
                          </div>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0 font-medium">
                            {student.agama || '-'}
                          </span>
                        </label>
                      );
                    })}
                    {allScopedStudents.length === 0 && (
                      <p className="text-[10.5px] text-slate-400 italic text-center py-6 col-span-full">
                        Belum ada siswa ditemukan di kelas target yang dipilih.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Auto-Assigned Deep Learning Dimensions Banner */}
          <div className="p-3 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Dimensi Pembelajaran Mendalam Terintegrasi Otomatis:</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {getSubjectDimensions(mataPelajaran).map((dim, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 bg-white text-indigo-700 font-extrabold text-[11px] rounded-lg border border-indigo-200 shadow-2xs"
                >
                  {dim}
                </span>
              ))}
            </div>
          </div>

          {/* Guru Pengampu */}
          <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-800 text-xs">Guru Pengampu</label>
                {state.teachers.length > 0 && (
                  <span className="text-[10px] text-slate-400">Pilih / Ketik Nama Guru</span>
                )}
              </div>
              <input
                type="text"
                list="teachers-datalist"
                value={guruPengampu}
                onChange={(e) => {
                  const newTeacher = e.target.value;
                  setGuruPengampu(newTeacher);
                  const foundSbj = state.subjects.find((s) => s.nama.toLowerCase() === mataPelajaran.toLowerCase());
                  if (foundSbj) {
                    const resolvedKktp = getSubjectKktpForClass(
                      foundSbj,
                      kelas,
                      75,
                      newTeacher
                    );
                    setKktp(resolvedKktp);
                  }
                }}
                placeholder="Nama Guru Pengampu"
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <datalist id="teachers-datalist">
                {state.teachers.map((t) => (
                  <option key={t.id} value={t.nama}>
                    {t.nip ? `NIP: ${t.nip}` : ''}
                  </option>
                ))}
              </datalist>

              {/* Quick Assigned Teacher Buttons for active mapel */}
              {(() => {
                const foundSbj = state.subjects.find((s) => s.nama.toLowerCase() === mataPelajaran.toLowerCase());
                const assigned = foundSbj?.guruAssignments?.map((a) => a.teacherName) || foundSbj?.guruPengampu || [];
                if (assigned.length === 0) return null;
                return (
                  <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                    <span className="text-[9px] text-slate-400">Guru Terjadwal:</span>
                    {assigned.map((tName, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setGuruPengampu(tName);
                          if (foundSbj) {
                            const resolvedKktp = getSubjectKktpForClass(
                              foundSbj,
                              kelas,
                              75,
                              tName
                            );
                            setKktp(resolvedKktp);
                          }
                        }}
                        className={`text-[9px] px-1.5 py-0.5 rounded-md border font-semibold cursor-pointer transition-all ${
                          guruPengampu.toLowerCase() === tName.toLowerCase()
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                        {tName}
                      </button>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Questions Editor Section */}
          <div className="pt-2 border-t border-slate-200">
            {/* General Formula & Arabic Characters Helper Banner */}
            <div className="mb-4 p-3 bg-linear-to-r from-emerald-50 via-indigo-50 to-sky-50 border border-emerald-200/80 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div>
                    <h5 className="font-bold text-slate-900 text-xs">
                      Penulisan Huruf Arab (PAI) & Rumus STEM (Matematika, Fisika, Kimia)
                    </h5>
                    <p className="text-[10px] text-slate-500">
                      Gunakan papan karakter di bawah ini atau pada setiap butir soal untuk menyisipkan huruf hijaiyah, harakat, lafaz Islami, dan rumus sains.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Paragraf Wacana / Cerita Context (Untuk Soal Kelompok No. X s.d. Y) */}
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/90 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h4 className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Paragraf Wacana / Teks Cerita Context (Bahasa Indonesia, Inggris, Daerah, dll.)</span>
                  </h4>
                  <p className="text-[11px] text-amber-800/80 mt-0.5">
                    Tambahkan susunan cerita / paragraf penjelasan untuk kelompok soal nomor berapa s.d. berapa.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setReadingPassages((prev) => [
                      ...prev,
                      {
                        id: `pas-${Date.now()}`,
                        judul: '',
                        teks: '',
                        nomorAwal: 1,
                        nomorAkhir: 5,
                      },
                    ]);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tambah Paragraf Wacana</span>
                </button>
              </div>

              {readingPassages.length === 0 ? (
                <div className="p-3 bg-white/80 rounded-xl border border-amber-200 text-[11px] text-amber-800 italic">
                  Belum ada paragraf wacana. Klik "+ Tambah Paragraf Wacana" di atas jika soal memerlukan teks cerita/paragraf penjelas untuk kelompok nomor soal tertentu.
                </div>
              ) : (
                <div className="space-y-3">
                  {readingPassages.map((pas, pIdx) => (
                    <div key={pas.id || pIdx} className="p-3.5 bg-white rounded-xl border border-amber-300 space-y-2.5 relative">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                          <input
                            type="text"
                            value={pas.judul || ''}
                            onChange={(e) => {
                              const updated = [...readingPassages];
                              updated[pIdx].judul = e.target.value;
                              setReadingPassages(updated);
                            }}
                            placeholder="Judul Wacana / Teks Cerita (Opsional)..."
                            className="p-1.5 bg-amber-50/40 border border-amber-200 rounded-lg text-xs font-bold text-amber-900 flex-1 focus:bg-white"
                          />
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900 shrink-0">
                            <span>Untuk Soal No.</span>
                            <input
                              type="number"
                              min={1}
                              value={pas.nomorAwal}
                              onChange={(e) => {
                                const updated = [...readingPassages];
                                updated[pIdx].nomorAwal = Number(e.target.value) || 1;
                                setReadingPassages(updated);
                              }}
                              className="w-12 p-1 bg-amber-50 border border-amber-300 rounded text-center text-xs font-bold"
                            />
                            <span>s.d.</span>
                            <input
                              type="number"
                              min={pas.nomorAwal}
                              value={pas.nomorAkhir}
                              onChange={(e) => {
                                const updated = [...readingPassages];
                                updated[pIdx].nomorAkhir = Number(e.target.value) || pas.nomorAwal;
                                setReadingPassages(updated);
                              }}
                              className="w-12 p-1 bg-amber-50 border border-amber-300 rounded text-center text-xs font-bold"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReadingPassages((prev) => prev.filter((_, i) => i !== pIdx))}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Hapus Wacana Ini"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        <QuestionFormattingToolbar
                          value={pas.teks}
                          onChange={(newVal) => {
                            const updated = [...readingPassages];
                            updated[pIdx].teks = newVal;
                            setReadingPassages(updated);
                          }}
                          placeholder="Tuliskan beberapa paragraf susunan cerita / stimulus teks di sini (bisa diformat tebal Ctrl+B, miring Ctrl+I, garis bawah Ctrl+U, nomor berurutan)..."
                          minHeight="85px"
                          compact
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {jenis === 'ASTS' ? (
              // ASTS Essay Items
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    Daftar Butir Soal Uraian Essay ({essayRubrik.length} Soal)
                  </h4>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Tombol Unggah Soal & Kunci Jawaban ASTS */}
                    <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer">
                      <FileText className="w-3.5 h-3.5 text-white" />
                      <span>Unggah Soal &amp; Kunci Jawaban</span>
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        disabled={isGeneratingAI}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateAllNotes}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-extrabold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                      title="Otomatis hasilkan catatan khusus guru & toleransi kalimat/jenis jawaban lain sesuai Essay Terbuka vs Tertutup"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-100" />
                      <span>Auto-Generate Toleransi Guru</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEssayRubrik((prev) => [
                          ...prev,
                          {
                            nomor: prev.length + 1,
                            soal: '',
                            kunciJawaban: '',
                            skorMaks: 10,
                            dimensiPembelajaran: 'Penalaran Kritis, Berkesadaran',
                          },
                        ]);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold"
                    >
                      + Tambah Butir Soal
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {essayRubrik.map((item, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800">Nomor {item.nomor}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-xs">Skor Maks:</span>
                          <input
                            type="number"
                            value={item.skorMaks}
                            onChange={(e) => {
                              const updated = [...essayRubrik];
                              updated[idx].skorMaks = Number(e.target.value);
                              setEssayRubrik(updated);
                            }}
                            className="w-14 p-1 bg-white border border-slate-300 rounded-lg text-center font-bold text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setEssayRubrik(essayRubrik.filter((_, i) => i !== idx))}
                            className="p-1 text-rose-500 hover:bg-rose-100 rounded-lg cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[11px] font-bold text-slate-700">Pertanyaan Soal</label>
                          <span className="text-[10px] text-slate-400">Gaya Font, Simbol & Model Nomor Lengkap</span>
                        </div>
                        <QuestionFormattingToolbar
                          value={item.soal}
                          onChange={(newVal) => {
                            const updated = [...essayRubrik];
                            updated[idx].soal = newVal;
                            setEssayRubrik(updated);
                          }}
                          placeholder="Tuliskan butir soal uraian di sini (bisa diformat tebal Ctrl+B, miring Ctrl+I, garis bawah Ctrl+U, nomor berurutan 1., a., (1), (a), dan rumus/simbol)..."
                          minHeight="72px"
                        />

                        {/* Fitur Sisipkan Gambar ke Soal ("Perhatikan gambar di bawah ini!") */}
                        <div className="mt-2">
                          {item.gambarSoalUrl ? (
                            <div className="p-2.5 bg-slate-100 rounded-xl border border-slate-300 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                                  <Camera className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Gambar Terpasang pada Soal</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...essayRubrik];
                                    delete updated[idx].gambarSoalUrl;
                                    setEssayRubrik(updated);
                                  }}
                                  className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                                >
                                  Hapus Gambar Soal
                                </button>
                              </div>
                              <img
                                src={item.gambarSoalUrl}
                                alt="Gambar Soal"
                                className="max-h-36 rounded-lg border border-slate-300 shadow-xs object-contain"
                              />
                            </div>
                          ) : (
                            <label className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-700 cursor-pointer text-xs font-semibold w-fit transition-all">
                              <Camera className="w-3.5 h-3.5 text-indigo-600" />
                              <span>+ Sisipkan Gambar ke Soal ("Perhatikan gambar di bawah ini!")</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = (evt) => {
                                    const updated = [...essayRubrik];
                                    updated[idx].gambarSoalUrl = evt.target?.result as string;
                                    if (!updated[idx].soal.includes('Perhatikan gambar')) {
                                      updated[idx].soal = `Perhatikan gambar di bawah ini!\n${updated[idx].soal || ''}`.trim();
                                    }
                                    setEssayRubrik(updated);
                                  };
                                  reader.readAsDataURL(file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Fitur Kunci Jawaban Gambar Referensi Guru (Foto HP / File PC) */}
                      <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <label className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Kunci Jawaban Gambar / Diagram Referensi Guru (Foto HP / File Laptop/PC)</span>
                          </label>
                          {item.kunciGambarUrl && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...essayRubrik];
                                delete updated[idx].kunciGambarUrl;
                                updated[idx].isGambarDrawing = false;
                                setEssayRubrik(updated);
                              }}
                              className="text-[10px] text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                            >
                              Hapus Kunci Gambar
                            </button>
                          )}
                        </div>
                        {item.kunciGambarUrl ? (
                          <div className="space-y-2">
                            <div className="relative inline-block">
                              <img
                                src={item.kunciGambarUrl}
                                alt="Kunci Gambar Referensi"
                                className="max-h-36 rounded-lg border border-emerald-300 shadow-xs object-contain"
                              />
                              <span className="mt-1 inline-block bg-emerald-800 text-white text-[9.5px] font-bold px-2 py-0.5 rounded shadow-xs">
                                Kunci Gambar Referensi Guru Terpasang
                              </span>
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center justify-center gap-2 p-2.5 bg-white border-2 border-dashed border-emerald-300 rounded-xl hover:bg-emerald-50 cursor-pointer transition-all">
                            <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="text-xs font-semibold text-emerald-800">
                              Unggah Foto Kunci Jawaban Gambar / Diagram Referensi (HP / Laptop)
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = (evt) => {
                                  const updated = [...essayRubrik];
                                  updated[idx].kunciGambarUrl = evt.target?.result as string;
                                  updated[idx].isGambarDrawing = true;
                                  setEssayRubrik(updated);
                                };
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-[11px] font-bold text-slate-700">
                            Kunci Jawaban, Huruf Arab PAI, Rumus STEM & Pedoman Rubrik
                          </label>
                          <span className="text-[10px] text-slate-400">Pedoman AI Vision</span>
                        </div>
                        <QuestionFormattingToolbar
                          value={item.kunciJawaban}
                          onChange={(newVal) => {
                            const updated = [...essayRubrik];
                            updated[idx].kunciJawaban = newVal;
                            setEssayRubrik(updated);
                          }}
                          placeholder="Pedoman jawaban benar, ayat/lafal Arab, atau langkah rumus (Matematika/Fisika/Kimia) untuk AI Vision (dukung Bold Ctrl+B, Italic Ctrl+I, Underline Ctrl+U)..."
                          minHeight="72px"
                        />
                      </div>

                      {/* Catatan Khusus Guru & Toleransi Penilaian (Kunci Jawaban Utama) */}
                      <div>
                        <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                          <label className="block text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Catatan Khusus Guru & Toleransi Penilaian (Kunci Jawaban Utama)</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const res = generateTeacherNotesAndTolerance(item.soal, item.kunciJawaban, item.skorMaks);
                                const updated = [...essayRubrik];
                                updated[idx] = {
                                  ...item,
                                  essayType: res.essayType,
                                  catatanKhususGuru: res.catatanKhususGuru,
                                  toleransiJawaban: res.toleransiJawaban,
                                  variasiJawabanDiterima: res.variasiJawabanDiterima,
                                  catatanJawaban: res.catatanKhususGuru,
                                };
                                setEssayRubrik(updated);
                                showToast('Toleransi Dibuat', `Catatan khusus & toleransi Soal ${item.nomor} (${res.essayType === 'TERBUKA' ? 'Essay Terbuka' : 'Essay Tertutup'}) berhasil dibuat.`, 'info');
                              }}
                              className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-[10px] rounded-md border border-amber-300 cursor-pointer transition-all"
                              title="Generate otomatis toleransi & catatan khusus guru untuk soal ini"
                            >
                              Generate Toleransi Soal Ini
                            </button>
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-semibold border border-amber-200">
                              Disandingkan saat Koreksi AI
                            </span>
                          </div>
                        </div>
                        <textarea
                          rows={2.5}
                          dir="auto"
                          value={item.catatanKhususGuru || item.catatanJawaban || ''}
                          onChange={(e) => {
                            const updated = [...essayRubrik];
                            updated[idx].catatanKhususGuru = e.target.value;
                            updated[idx].catatanJawaban = e.target.value;
                            setEssayRubrik(updated);
                          }}
                          placeholder="Catatan khusus guru untuk disandingkan dengan kunci jawaban utama (misal: beri toleransi jika siswa menjelaskan dengan kalimat sendiri, sebutkan contoh lain yang relevan, atau toleransi typo ringan)..."
                          className="w-full p-2.5 bg-amber-50/40 border border-amber-200 rounded-xl font-sans text-xs focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                        />
                      </div>

                      {/* Auto-Detected Open/Closed Essay Badge & Tolerance Preview */}
                      {(() => {
                        const flexInfo = analyzeEssayFlexibility(item.soal, item.kunciJawaban, item.skorMaks);
                        const currentType = item.essayType || flexInfo.type;
                        return (
                          <div className={`p-3 rounded-xl border text-[11px] space-y-2 ${currentType === 'TERBUKA' ? 'bg-emerald-50/90 text-emerald-900 border-emerald-300' : 'bg-indigo-50/90 text-indigo-900 border-indigo-200'}`}>
                            <div className="flex items-center justify-between flex-wrap gap-1 font-bold">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5" />
                                Deteksi Model: {currentType === 'TERBUKA' ? 'Essay Terbuka (Penalaran & Toleransi Fleksibel)' : 'Essay Tertutup (Presisi Konsep)'}
                              </span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...essayRubrik];
                                    const nextType = currentType === 'TERBUKA' ? 'TERTUTUP' : 'TERBUKA';
                                    updated[idx].essayType = nextType;
                                    const res = generateTeacherNotesAndTolerance(updated[idx].soal, updated[idx].kunciJawaban, updated[idx].skorMaks);
                                    updated[idx].catatanKhususGuru = res.catatanKhususGuru;
                                    updated[idx].catatanJawaban = res.catatanKhususGuru;
                                    setEssayRubrik(updated);
                                  }}
                                  className="text-[9.5px] px-2 py-0.5 rounded bg-white hover:bg-slate-100 font-extrabold border border-current cursor-pointer shadow-2xs transition-all"
                                  title="Ubah tipe Essay Terbuka vs Tertutup secara manual"
                                >
                                  Ubah ke {currentType === 'TERBUKA' ? 'Essay Tertutup' : 'Essay Terbuka'}
                                </button>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-white/90 font-bold border border-current">
                                  Toleransi: {flexInfo.toleranceLevel}
                                </span>
                              </div>
                            </div>
                            <p className="text-[10.5px] leading-relaxed opacity-95">
                              {currentType === 'TERBUKA'
                                ? 'Soal ini membutuhkan penjelasan, analisis, atau contoh. AI Vision akan memberikan kelonggaran nilai bila siswa menjawab dengan struktur kalimat sendiri atau menyertakan contoh konkret relevan.'
                                : 'Soal ini meminta fakta, rumus, atau istilah spesifik. AI Vision berfokus pada presisi konsep utama, namun tetap memberikan toleransi bila terdapat typo ejaan ringan.'}
                            </p>
                            {flexInfo.extractedKeywords.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                <span className="font-bold opacity-80 text-[10px]">Kata Kunci Utama:</span>
                                {flexInfo.extractedKeywords.map((kw, kIdx) => (
                                  <span key={kIdx} className="px-1.5 py-0.2 rounded bg-white/90 font-mono font-bold text-[10px] border border-current/30">
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Multi-Model MCQ / Objective Questions Items */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-sky-50/70 p-3.5 rounded-2xl border border-sky-200/80">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4.5 h-4.5 text-sky-600 shrink-0" />
                      <span>Daftar Butir Soal Objektif ({mcqQuestions.length} Soal)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Mendukung 3 Model Soal: Pilihan Ganda, Benar/Salah, dan Pilihan Ganda Kompleks (Menceklis Beberapa Jawaban).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {/* Tombol Unggah Soal & Kunci Jawaban */}
                    <label className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer">
                      <FileText className="w-3.5 h-3.5 text-white" />
                      <span>Unggah Soal &amp; Kunci Jawaban</span>
                      <input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        disabled={isGeneratingAI}
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    {/* Tambah Soal PG Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setMcqQuestions((prev) => [
                          ...prev,
                          {
                            nomor: prev.length + 1,
                            soal: '',
                            modelSoal: 'PG',
                            pilihan: { A: '', B: '', C: '', D: '', E: '' },
                            kunci: 'A',
                            skor: 2,
                          },
                        ]);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-900 active:scale-95 text-white rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tambah Butir Soal</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {mcqQuestions.map((q, idx) => (
                    <DynamicQuestionEditor
                      key={idx}
                      question={q}
                      index={idx}
                      totalQuestions={mcqQuestions.length}
                      subjectName={mataPelajaran}
                      onChange={(updated) => {
                        const copy = [...mcqQuestions];
                        copy[idx] = updated;
                        setMcqQuestions(copy);
                      }}
                      onDelete={() => {
                        setMcqQuestions((prev) => {
                          const filtered = prev.filter((_, i) => i !== idx);
                          return filtered.map((item, i) => ({ ...item, nomor: i + 1 }));
                        });
                      }}
                      showToast={showToast}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

          {/* Sticky Modal Footer Action Buttons */}
          <div className="shrink-0 p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleSaveDraftModule}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-xs cursor-pointer text-xs"
              title="Simpan sementara kisi-kisi dan butir soal sebagai draf untuk dilanjutkan nanti"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Draf Modul</span>
            </button>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer text-xs"
              >
                Tutup
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all text-xs"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Modul Asesmen</span>
              </button>
            </div>
          </div>
        </form>
      </motion.div>

      {/* Visual AI Progress Bar */}
      <AIProgressBar
        isOpen={isGeneratingAI}
        title={promptTopic ? 'Menyusun Soal Berbasis Deep Learning' : 'Mengekstrak Soal & Rubrik Asesmen'}
        subtitle={`Memproses data ${jenis} ${mataPelajaran} dengan Gemini AI Vision Ultra-Tinggi...`}
        progressPercent={aiProgressPercent}
        estimatedSeconds={5}
      />

      <CrossDeviceUploadModal
        isOpen={isWebrtcModalOpen}
        onClose={() => setIsWebrtcModalOpen(false)}
        onImageReceived={handleWebRtcImageReceived}
        title="Ambil Foto Berkas Soal via HP"
        subtitle="Kirim berkas soal & kunci jawaban langsung dari kamera HP Anda secara real-time"
      />

      <OlimpiadeAssistantModal
        isOpen={isOlimpiadeModalOpen}
        onClose={() => setIsOlimpiadeModalOpen(false)}
        initialMenu={olimpiadeModalMenu}
        initialJenisKompetisi="Seleksi OSN"
        initialNamaAcara={mataPelajaran || "Dalam Rangka Seleksi OSN-K 2026 SMAN 3 Tumijajar"}
      />
    </div>
  );
};
