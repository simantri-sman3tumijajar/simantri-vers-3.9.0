import React, { useState, useMemo, useCallback, useEffect, useRef, memo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { useAutosave } from '../context/AutosaveContext';
import { Assessment, Student, Submission, ItemScore } from '../types';
import {
  ScanEye,
  Camera,
  Upload,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Award,
  ChevronRight,
  RefreshCw,
  Save,
  FileSpreadsheet,
  Layers,
  Search,
  Eye,
  Loader2,
  ArrowRight,
  ExternalLink,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Smartphone,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Percent,
  Play,
  Pause,
  Square,
  CheckSquare,
  ListChecks,
  Users,
  UserCheck,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { optimizeDocumentForAI } from '../utils/imageCompressor';
import { analyzeEssayFlexibility } from '../utils/essayTypeDetector';
import { isClassMatch, getAssessmentClassesList } from '../utils/classHelper';
import { getKKTPKategori } from '../utils/kktpHelper';
import { AIProgressBar, ProgressStep } from './AIProgressBar';
import { CrossDeviceUploadModal } from './CrossDeviceUploadModal';
import { AuthenticProofModal } from './AuthenticProofModal';
import { TeacherPenaltyModal } from './TeacherPenaltyModal';
import { QuestionFormattingToolbar } from './QuestionFormattingToolbar';
import { FormattedQuestionText } from './FormattedQuestionText';
import { ensureAuthenticProofSubmission } from '../utils/authenticProofHelper';
import { webrtcSession } from '../utils/webrtcManager';
import {
  sanitizeCapaianKompetensi,
  generateBloomDeepLearningCK,
  generateDynamicReasoning,
} from '../utils/capaianKompetensi';
import { safeSetItem, safeGetItem } from '../utils/safeStorage';

const GRADING_STEPS: ProgressStep[] = [
  { title: 'Memindai Citra Lembar Jawaban', description: 'Memproses citra resolusi ultra-tinggi dan menangani kondisi tulisan gelap/miring' },
  { title: 'Menghubungkan ke Gemini AI Vision', description: 'Mengirim citra lembar jawaban ke mesin pemroses AI' },
  { title: 'Evaluasi Butir Soal & Kunci Jawaban', description: 'Menghitung skor tiap butir soal sesuai bobot rubrik asesmen' },
  { title: 'Menyusun Narasi Capaian Kompetensi', description: 'Merumuskan narasi hasil belajar otomatis untuk rapor' },
];

// Memoized individual student list item to prevent full list re-renders on search/click
interface StudentListItemProps {
  student: Student;
  index: number;
  isSelected: boolean;
  isChecked: boolean;
  hasPhotos: boolean;
  photoCount: number;
  submission?: Submission;
  isASAS?: boolean;
  asasAnswersCount?: number;
  maxQ?: number;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string, e: React.MouseEvent) => void;
  onOpenProof?: (id: string) => void;
}

const StudentListItem = memo<StudentListItemProps>(({
  student,
  index,
  isSelected,
  isChecked,
  hasPhotos,
  photoCount,
  submission,
  isASAS = false,
  asasAnswersCount = 0,
  maxQ = 40,
  onSelect,
  onToggleCheck,
  onOpenProof,
}) => {
  return (
    <div
      id={`std-item-${student.id}`}
      onClick={() => onSelect(student.id)}
      className={`w-full p-2.5 sm:p-3 text-left flex items-center justify-between transition-colors cursor-pointer ${
        isSelected
          ? 'bg-indigo-50/90 border-l-4 border-indigo-600'
          : 'hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0 pr-2">
        {/* Checkbox for batch selection */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleCheck(student.id, e);
          }}
          className="p-1 -m-1 cursor-pointer shrink-0"
          title="Centang untuk koreksi terpilih"
        >
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => {}}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600 shrink-0"
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 w-4">
              {student.noUrut || index + 1}.
            </span>
            <h4 className="text-xs font-bold text-slate-900 truncate">
              {student.nama}
            </h4>
          </div>

          <div className="flex items-center gap-2 ml-5 mt-0.5 flex-wrap">
            <span className="text-[10px] text-slate-400 font-mono">
              NISN: {student.nisn}
            </span>

            {/* Photo count indicator from HP / draft (ASTS only) */}
            {!isASAS && hasPhotos && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-indigo-100/80 text-indigo-800 border border-indigo-200">
                <Camera className="w-2.5 h-2.5 text-indigo-600" />
                <span>{photoCount} Lembar Foto</span>
              </span>
            )}
            {isASAS && asasAnswersCount > 0 && !submission && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-sky-100 text-sky-800 border border-sky-200">
                <span>{asasAnswersCount}/{maxQ} Terisi</span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="shrink-0 pl-2">
        {submission ? (
          submission.statusKoreksi?.includes('Draf') || submission.statusKoreksi?.includes('Draft') ? (
            <div className="text-right">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold border ${
                submission.nilaiAkhir && submission.nilaiAkhir > 0
                  ? getKKTPKategori(submission.nilaiAkhir).badgeClass
                  : 'bg-amber-100 text-amber-900 border-amber-300'
              } shadow-2xs`}>
                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>
                  {submission.nilaiAkhir && submission.nilaiAkhir > 0
                    ? `Draf: ${submission.nilaiAkhir}`
                    : 'Draf Tersimpan'}
                </span>
              </span>
              {submission.nilaiAkhir && submission.nilaiAkhir > 0 && (
                <div className="mt-0.5">
                  {(() => {
                    const kktpInfo = getKKTPKategori(submission.nilaiAkhir);
                    return (
                      <span className={`inline-block text-[8.5px] font-extrabold px-1.5 py-0.2 rounded border ${kktpInfo.badgeClass}`}>
                        {kktpInfo.kategori} ({kktpInfo.rentang})
                      </span>
                    );
                  })()}
                </div>
              )}
              <span className="block text-[9px] text-amber-800 font-bold mt-0.5">
                {isASAS ? 'Jawaban Tersimpan' : 'Foto / Jawaban Terunggah'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenProof?.(student.id);
                }}
                className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 transition-colors cursor-pointer"
                title="Lihat Bukti Otentik Lembar Jawaban & Rincian Butir"
              >
                <ShieldCheck className="w-2.5 h-2.5 text-indigo-600" />
                <span>Bukti Otentik</span>
              </button>
            </div>
          ) : (
            <div className="text-right">
              <div className="flex items-center justify-end gap-1">
                {!isASAS && submission.aiDetected && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title={`Terdeteksi AI: Penalti -${submission.aiPenaltyPercent}%`}>
                    AI ({submission.aiPenaltyPercent}%)
                  </span>
                )}
                {(() => {
                  const kktpInfo = getKKTPKategori(submission.nilaiAkhir);
                  return (
                    <span className={`px-2 py-0.5 rounded border text-[11px] font-black ${kktpInfo.badgeClass}`}>
                      {submission.nilaiAkhir}
                    </span>
                  );
                })()}
              </div>
              {(() => {
                const kktpInfo = getKKTPKategori(submission.nilaiAkhir);
                return (
                  <div className="mt-0.5 space-y-0.5">
                    <span className={`inline-block text-[8.5px] font-extrabold px-1.5 py-0.2 rounded border ${kktpInfo.badgeClass}`}>
                      {kktpInfo.iconSymbol} {kktpInfo.kategori} ({kktpInfo.rentang})
                    </span>
                    <span className="block text-[8.5px] text-slate-600 font-extrabold leading-none">
                      {kktpInfo.subLabel}
                    </span>
                  </div>
                );
              })()}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenProof?.(student.id);
                }}
                className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8.5px] font-extrabold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors cursor-pointer"
                title="Lihat Bukti Otentik Lembar Jawaban & Rincian Butir"
              >
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                <span>Bukti Sah</span>
              </button>
            </div>
          )
        ) : isASAS ? (
          asasAnswersCount > 0 ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              Jawaban ({asasAnswersCount}/{maxQ})
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
              Belum Diisi
            </span>
          )
        ) : hasPhotos ? (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
            Foto Siap
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
            Belum Ada Foto
          </span>
        )}
      </div>
    </div>
  );
});
StudentListItem.displayName = 'StudentListItem';

export const MassGradingView: React.FC = () => {
  const {
    state,
    currentUser,
    selectedAssessmentId,
    setSelectedAssessmentId,
    saveAssessment,
    deleteSubmission,
    showToast,
    setCurrentView,
  } = useApp();
  const { saveDraft, getDraft, removeDraft, hasDraft } = useAutosave();
  const { t } = useLanguage();

  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [searchStudent, setSearchStudent] = useState('');
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [previewZoomLevel, setPreviewZoomLevel] = useState<number>(100);
  const [isPenaltyModalOpen, setIsPenaltyModalOpen] = useState<boolean>(false);
  const [isGrading, setIsGrading] = useState(false);
  const [gradingProgressPercent, setGradingProgressPercent] = useState(10);
  const [gradingActiveStepIndex, setGradingActiveStepIndex] = useState(0);
  const [gradingResult, setGradingResult] = useState<any | null>(null);
  const [isWebrtcModalOpen, setIsWebrtcModalOpen] = useState(false);
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);
  const [proofStudentId, setProofStudentId] = useState<string | null>(null);

  // Toggle option to allow file uploads from laptop disk (prioritizes HP Android/Tablet by default)
  const [allowLaptopUpload, setAllowLaptopUpload] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('smantri_allow_laptop_upload') === 'true';
    }
    return false;
  });

  // Detect Android smartphones & tablets across any brand or specification
  const isAndroidOrTablet = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const isAndroid = /android/i.test(ua);
    const isTouchTablet = navigator.maxTouchPoints > 1 && window.innerWidth <= 1024;
    const isMobile = /mobile|ipad|iphone|ipod|tablet/i.test(ua);
    return isAndroid || isTouchTablet || isMobile;
  }, []);

  // Batch & Multi-Select Grading States
  const [selectedSubClassFilter, setSelectedSubClassFilter] = useState<string>('ALL');
  const [selectedStudentIdsForBatch, setSelectedStudentIdsForBatch] = useState<Set<string>>(new Set());
  const [studentFilterTab, setStudentFilterTab] = useState<'all' | 'ready' | 'ungraded' | 'completed'>('all');
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchQueue, setBatchQueue] = useState<Student[]>([]);
  const [batchCurrentIndex, setBatchCurrentIndex] = useState(0);
  const [batchIsRunning, setBatchIsRunning] = useState(false);
  const [batchIsPaused, setBatchIsPaused] = useState(false);
  const [batchResults, setBatchResults] = useState<Record<string, { status: 'waiting' | 'grading' | 'success' | 'failed' | 'skipped'; score?: number; note?: string }>>({});
  const batchCancelRef = useRef(false);
  const batchPauseRef = useRef(false);
  const batchActiveRowRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll mechanism: automatically scroll the active queue row into view when batchCurrentIndex changes
  useEffect(() => {
    if (isBatchModalOpen && batchIsRunning && batchActiveRowRef.current) {
      batchActiveRowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [batchCurrentIndex, isBatchModalOpen, batchIsRunning]);

  // ASAS A-E Dedicated States
  const [showAsasDraftModal, setShowAsasDraftModal] = useState<boolean>(false);
  const [tempAsasKeyInput, setTempAsasKeyInput] = useState<string>('');
  const [asasCorrectionScope, setAsasCorrectionScope] = useState<'single' | 'selected' | 'class' | 'all-classes'>('single');
  const [studentAsasAnswers, setStudentAsasAnswers] = useState<Record<string, string[]>>({});
  const [showBulkPasteModal, setShowBulkPasteModal] = useState<boolean>(false);
  const [bulkPasteText, setBulkPasteText] = useState<string>('');

  // Manual Correction Override Helpers: Allows teachers to modify AI graded items and recalculate values on the fly
  const handleItemScoreChange = (nomor: number, newScoreVal: number) => {
    if (!gradingResult || !activeAssessment) return;
    
    const rubrikItem = activeAssessment.essayRubrik?.find((r) => r.nomor === nomor);
    const maxScore = rubrikItem ? rubrikItem.skorMaks : 10;
    const cleanScore = Math.max(0, Math.min(maxScore, newScoreVal));

    const updatedItems = (gradingResult.itemScores || []).map((itm: any) => {
      if (itm.nomor === nomor) {
        // Automatically regenerate academic justification based on the newly updated score and transcribed student text
        const autoReason = generateDynamicReasoning(
          nomor,
          cleanScore,
          maxScore,
          itm.jawabanSiswa,
          rubrikItem?.kunciJawaban,
          rubrikItem?.catatanJawaban
        );
        return { ...itm, skor: cleanScore, feedback: autoReason };
      }
      return itm;
    });

    const totalMax = activeAssessment.essayRubrik?.reduce((sum, r) => sum + r.skorMaks, 0) || (updatedItems.length * 10);
    const totalObtained = updatedItems.reduce((sum: number, itm: any) => sum + itm.skor, 0);
    const rawScore = totalMax > 0 ? Math.round((totalObtained / totalMax) * 100) : 0;

    const penalty = gradingResult.aiPenaltyPercent || 0;
    const deduction = Math.round((rawScore * penalty) / 100);
    const finalScore = Math.max(0, rawScore - deduction);
    const isTuntas = finalScore >= (activeAssessment.kktp || 75);

    // Automatically recalculate Capaian Kompetensi according to Taksonomi Bloom (C1-C6) and Pembelajaran Mendalam
    const autoCK = generateBloomDeepLearningCK(finalScore, activeAssessment.kktp || 75, activeAssessment.mataPelajaran);
    const cleanCK = sanitizeCapaianKompetensi(autoCK, selectedStudent?.nama, isTuntas, activeAssessment.mataPelajaran, finalScore);

    setGradingResult({
      ...gradingResult,
      itemScores: updatedItems,
      nilaiMurni: rawScore,
      nilaiAkhir: finalScore,
      tuntas: isTuntas,
      capaianKompetensi: cleanCK,
    });
  };

  const handleItemAnswerTextChange = (nomor: number, newAnswerText: string) => {
    if (!gradingResult || !activeAssessment) return;

    const rubrikItem = activeAssessment.essayRubrik?.find((r) => r.nomor === nomor);
    const maxScore = rubrikItem ? rubrikItem.skorMaks : 10;

    const updatedItems = (gradingResult.itemScores || []).map((itm: any) => {
      if (itm.nomor === nomor) {
        // Automatically regenerate dynamic reasoning when student text is updated by teacher
        const autoReason = generateDynamicReasoning(
          nomor,
          itm.skor,
          maxScore,
          newAnswerText,
          rubrikItem?.kunciJawaban,
          rubrikItem?.catatanJawaban
        );
        return { ...itm, jawabanSiswa: newAnswerText, feedback: autoReason };
      }
      return itm;
    });

    setGradingResult({
      ...gradingResult,
      itemScores: updatedItems,
    });
  };

  const handleItemFeedbackChange = (nomor: number, newFeedback: string) => {
    if (!gradingResult) return;
    const updatedItems = (gradingResult.itemScores || []).map((itm: any) => {
      if (itm.nomor === nomor) {
        return { ...itm, feedback: newFeedback };
      }
      return itm;
    });
    setGradingResult({
      ...gradingResult,
      itemScores: updatedItems,
    });
  };

  const handleCapaianChange = (newNarasi: string) => {
    if (!gradingResult) return;
    setGradingResult({
      ...gradingResult,
      capaianKompetensi: newNarasi,
    });
  };

  const handleMCQAnswerChange = (nomor: number, newAns: string) => {
    if (!gradingResult || !activeAssessment) return;
    const updatedAnswers = (gradingResult.studentAnswers || []).map((ans: any) => {
      if (ans.nomor === nomor) {
        const q = activeAssessment.mcqQuestions?.find((mq) => mq.nomor === nomor);
        const correct = q ? q.kunci.toUpperCase() === newAns.toUpperCase() : false;
        return { ...ans, jawabanSiswa: newAns.toUpperCase(), benar: correct };
      }
      return ans;
    });

    const totalQuestions = activeAssessment.mcqQuestions?.length || updatedAnswers.length;
    const correctCount = updatedAnswers.filter((ans: any) => ans.benar).length;
    const rawScore = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

    const penalty = gradingResult.aiPenaltyPercent || 0;
    const deduction = Math.round((rawScore * penalty) / 100);
    const finalScore = Math.max(0, rawScore - deduction);
    const isTuntas = finalScore >= (activeAssessment.kktp || 75);

    // Automatically recalculate Capaian Kompetensi according to Taksonomi Bloom and Pembelajaran Mendalam
    const autoCK = generateBloomDeepLearningCK(finalScore, activeAssessment.kktp || 75, activeAssessment.mataPelajaran);
    const cleanCK = sanitizeCapaianKompetensi(autoCK, selectedStudent?.nama, isTuntas, activeAssessment.mataPelajaran, finalScore);

    setGradingResult({
      ...gradingResult,
      studentAnswers: updatedAnswers,
      nilaiMurni: rawScore,
      nilaiAkhir: finalScore,
      tuntas: isTuntas,
      capaianKompetensi: cleanCK,
    });
  };

  // AI Generator Detection Options
  const [enableAiDetection, setEnableAiDetection] = useState<boolean>(
    currentUser?.aiDetectionEnabled !== undefined ? currentUser.aiDetectionEnabled : true
  );
  const [aiPenaltyPercent, setAiPenaltyPercent] = useState<number>(
    currentUser?.defaultAiPenaltyPercent !== undefined ? currentUser.defaultAiPenaltyPercent : 25
  );

  useEffect(() => {
    let progressTimer: any;
    if (isGrading) {
      setGradingProgressPercent(15);
      setGradingActiveStepIndex(0);

      progressTimer = setInterval(() => {
        setGradingProgressPercent((prev) => {
          if (prev < 30) {
            setGradingActiveStepIndex(0);
            return prev + 5;
          } else if (prev < 60) {
            setGradingActiveStepIndex(1);
            return prev + 3;
          } else if (prev < 88) {
            setGradingActiveStepIndex(2);
            return prev + 2;
          }
          setGradingActiveStepIndex(3);
          return Math.min(96, prev + 0.5);
        });
      }, 250);
    } else {
      setGradingProgressPercent(100);
      setGradingActiveStepIndex(3);
    }
    return () => clearInterval(progressTimer);
  }, [isGrading]);

  const isAdmin = currentUser?.role === 'admin';

  // 1. Memoized accessible assessments strictly filtered by Admin-managed teacher subjects with double-lookup
  const availableAssessments = useMemo(() => {
    if (!state || !currentUser) return [];
    
    // Filter strictly by active school year and semester
    const activePeriodAssessments = (state.assessments || []).filter(
      (a) => a.tahunAjaran === state.schoolInfo.tahunAjaranAktif && a.semester === state.schoolInfo.semesterAktif
    );
    
    if (isAdmin) return activePeriodAssessments;
    
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
    const assignedSubjects = Array.from(subs);

    if (assignedSubjects.includes('semua mata pelajaran')) return activePeriodAssessments;
    return activePeriodAssessments.filter((a) =>
      assignedSubjects.includes(a.mataPelajaran.toLowerCase().trim())
    );
  }, [state?.assessments, state?.subjects, state?.schoolInfo, currentUser, isAdmin]);

  const activeAssessmentId = useMemo(() => {
    if (selectedAssessmentId && availableAssessments.some((a) => a.id === selectedAssessmentId)) {
      return selectedAssessmentId;
    }
    return availableAssessments[0]?.id || '';
  }, [selectedAssessmentId, availableAssessments]);

  const activeAssessment = useMemo(() => {
    if (!state) return undefined;
    return state.assessments.find((a) => a.id === activeAssessmentId);
  }, [state?.assessments, activeAssessmentId]);

  // Sub-classes list if assessment spans multiple classes (e.g. "X.1, X.2, X.3")
  const activeAssessmentClasses = useMemo(() => {
    if (!activeAssessment) return [];
    return getAssessmentClassesList(activeAssessment.kelas);
  }, [activeAssessment]);

  // 2. Memoized students in the active assessment's class (supports multi-class per-class division e.g. "X.1, X.2, X.3")
  const classStudents = useMemo(() => {
    if (!state || !activeAssessment) return [];
    let all = state.students.filter((s) => isClassMatch(activeAssessment.kelas, s.kelas));

    if (selectedSubClassFilter !== 'ALL') {
      all = all.filter((s) => isClassMatch(selectedSubClassFilter, s.kelas));
    }

    if (activeAssessment.studentIds && activeAssessment.studentIds.length > 0) {
      const pSet = new Set(activeAssessment.studentIds);
      const filteredBySet = all.filter((s) => pSet.has(s.id));
      if (filteredBySet.length > 0) {
        return filteredBySet.sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));
      }
    }
    return all.sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));
  }, [state?.students, activeAssessment, selectedSubClassFilter]);

  // All students across all classes for this assessment
  const allStudentsInAllClasses = useMemo(() => {
    if (!state || !activeAssessment) return [];
    const all = state.students.filter((s) => isClassMatch(activeAssessment.kelas, s.kelas));
    return all.sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));
  }, [state?.students, activeAssessment]);

  const activeSubClass = useMemo(() => {
    if (selectedSubClassFilter !== 'ALL') return selectedSubClassFilter;
    if (activeAssessmentClasses.length > 0) return activeAssessmentClasses[0];
    return activeAssessment?.kelas || '';
  }, [selectedSubClassFilter, activeAssessmentClasses, activeAssessment?.kelas]);

  const currentStudentId = useMemo(() => {
    return selectedStudentId || classStudents[0]?.id || '';
  }, [selectedStudentId, classStudents]);

  const selectedStudent = useMemo(() => {
    return classStudents.find((s) => s.id === currentStudentId);
  }, [classStudents, currentStudentId]);

  const activeAssessmentRef = useRef(activeAssessment);
  activeAssessmentRef.current = activeAssessment;

  const selectedStudentRef = useRef(selectedStudent);
  selectedStudentRef.current = selectedStudent;

  const classStudentsRef = useRef(classStudents);
  classStudentsRef.current = classStudents;

  const handleDownloadImageFile = useCallback((imgUrl: string, suffix = 'Lembar_Jawaban') => {
    try {
      const link = document.createElement('a');
      link.href = imgUrl;
      const stdName = (selectedStudent?.nama || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
      const clsName = (selectedStudent?.kelas || activeAssessment?.kelas || 'KELAS').replace(/[^a-zA-Z0-9_-]/g, '_');
      link.download = `${suffix}_KELAS_${clsName}_${stdName}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Foto lembar jawaban berhasil diunduh!', 'success');
    } catch (err) {
      window.open(imgUrl, '_blank');
    }
  }, [selectedStudent, activeAssessment, showToast]);

  const handleApplyTeacherPenalty = useCallback((updatedList: Array<{
    studentId: string;
    nilaiMurni: number;
    aiPenaltyPercent: number;
    aiPenaltyDeduction: number;
    nilaiAkhir: number;
    tuntas: boolean;
    aiExplanation: string;
  }>) => {
    if (!activeAssessment) return;

    const nextSubmissions = [...activeAssessment.submissions];

    updatedList.forEach((item) => {
      const std = classStudents.find((s) => s.id === item.studentId);
      const existingIdx = nextSubmissions.findIndex(
        (s) => s.studentId === item.studentId || (std && s.studentName === std.nama)
      );

      if (existingIdx >= 0) {
        const existing = nextSubmissions[existingIdx];
        nextSubmissions[existingIdx] = {
          ...existing,
          nilaiMurni: item.nilaiMurni,
          aiPenaltyPercent: item.aiPenaltyPercent,
          aiPenaltyDeduction: item.aiPenaltyDeduction,
          nilaiAkhir: item.nilaiAkhir,
          tuntas: item.tuntas,
          aiExplanation: item.aiExplanation,
          statusKoreksi: 'Sudah Diverifikasi (Penalti Kebijakan Guru)',
        };
      }
    });

    const updatedAssessment: Assessment = {
      ...activeAssessment,
      submissions: nextSubmissions,
    };

    saveAssessment(updatedAssessment);
    showToast(`Kebijakan pengurangan nilai berhasil diterapkan pada ${updatedList.length} siswa.`, 'success');
  }, [activeAssessment, classStudents, saveAssessment, showToast]);

  // Remember and restore last grading progress across sessions
  useEffect(() => {
    if (!activeAssessment || classStudents.length === 0) return;

    const savedLastStudentId = safeGetItem(`smantri_last_graded_student_${activeAssessment.id}`);
    if (savedLastStudentId && classStudents.some((s) => s.id === savedLastStudentId)) {
      if (!selectedStudentId) {
        setSelectedStudentId(savedLastStudentId);
      }
    }
  }, [activeAssessment?.id, classStudents, selectedStudentId]);

  useEffect(() => {
    if (selectedStudentId && activeAssessment) {
      safeSetItem(`smantri_last_graded_student_${activeAssessment.id}`, selectedStudentId);
      safeSetItem(`smantri_last_graded_assessment`, activeAssessment.id);
    }
  }, [selectedStudentId, activeAssessment?.id]);

  // Calculate completion and draft counts
  // Submissions O(1) hash map for ultra-fast lookup
  const submissionsMap = useMemo(() => {
    const map = new Map<string, Submission>();
    if (!activeAssessment?.submissions) return map;
    activeAssessment.submissions.forEach((sub) => {
      if (sub.studentId) map.set(sub.studentId, sub);
      if (sub.studentName) map.set(sub.studentName, sub);
    });
    return map;
  }, [activeAssessment?.submissions]);

  // =========================================================================
  // ASAS (MCQ) CORE ENGINES: QUESTION COUNT, KEYS, ANSWERS & AUTO GRADING
  // =========================================================================
  const currentMaxQ = useMemo(() => {
    if (!activeAssessment) return 40;
    if (activeAssessment.mcqQuestions && activeAssessment.mcqQuestions.length > 0) {
      return activeAssessment.mcqQuestions.length;
    }
    return activeAssessment.jumlahSoal || 40;
  }, [activeAssessment]);

  const getMCQKey = useCallback(
    (nomor: number): string => {
      if (!activeAssessment) return 'A';
      const found = activeAssessment.mcqQuestions?.find((q) => q.nomor === nomor);
      return (found?.kunci || 'A').toUpperCase();
    },
    [activeAssessment]
  );

  const validKeysCount = useMemo(() => {
    if (!activeAssessment?.mcqQuestions) return 0;
    return activeAssessment.mcqQuestions
      .slice(0, currentMaxQ)
      .filter((q) => q.kunci && q.kunci.trim() !== '').length;
  }, [activeAssessment?.mcqQuestions, currentMaxQ]);

  const getStudentAnswers = useCallback(
    (studentId: string, maxQ: number): string[] => {
      if (studentAsasAnswers[studentId] && studentAsasAnswers[studentId].length === maxQ) {
        return studentAsasAnswers[studentId];
      }
      const sub = submissionsMap.get(studentId);
      if (sub && Array.isArray(sub.studentAnswers) && sub.studentAnswers.length > 0) {
        const arr = Array.from({ length: maxQ }, (_, idx) => {
          const found = sub.studentAnswers?.find((sa) => sa.nomor === idx + 1);
          return found?.jawabanSiswa && found.jawabanSiswa !== '-' ? found.jawabanSiswa.toUpperCase() : '';
        });
        return arr;
      }
      return Array(maxQ).fill('');
    },
    [studentAsasAnswers, submissionsMap]
  );

  const activeStudentAnswersArray = useMemo(() => {
    if (!selectedStudent) return Array(currentMaxQ).fill('');
    return getStudentAnswers(selectedStudent.id, currentMaxQ);
  }, [selectedStudent, currentMaxQ, getStudentAnswers]);

  const activeStudentAnswerString = useMemo(() => {
    if (!selectedStudent) return '';
    return activeStudentAnswersArray.join('');
  }, [selectedStudent, activeStudentAnswersArray]);

  const activeStudentStats = useMemo(() => {
    if (!selectedStudent || !activeAssessment) {
      return { filled: 0, correct: 0, wrong: 0, empty: currentMaxQ, score: 0, isTuntas: false };
    }
    const maxQ = currentMaxQ;
    const stdAns = activeStudentAnswersArray;
    let filled = 0;
    let correct = 0;
    let wrong = 0;

    for (let i = 0; i < maxQ; i++) {
      const kChar = getMCQKey(i + 1);
      const aChar = stdAns[i] || '';
      if (aChar && aChar !== '-') {
        filled++;
        if (aChar === kChar) {
          correct++;
        } else {
          wrong++;
        }
      }
    }

    const score = maxQ > 0 ? Math.round((correct / maxQ) * 100) : 0;
    const isTuntas = score >= (activeAssessment.kktp || 75);
    return {
      filled,
      correct,
      wrong,
      empty: maxQ - filled,
      score,
      isTuntas,
    };
  }, [selectedStudent, activeAssessment, currentMaxQ, activeStudentAnswersArray, getMCQKey]);

  const handleSetMCQKey = (nomor: number, keyChar: string) => {
    if (!activeAssessment || !saveAssessment) return;
    const maxQ = currentMaxQ;
    const cleanKey = keyChar.toUpperCase().replace(/[^A-E]/g, '') || 'A';

    let updatedMCQs = [...(activeAssessment.mcqQuestions || [])];
    if (updatedMCQs.length < maxQ) {
      updatedMCQs = Array.from({ length: maxQ }, (_, idx) => {
        const qNum = idx + 1;
        const existing = activeAssessment.mcqQuestions?.find((m) => m.nomor === qNum);
        return (
          existing || {
            nomor: qNum,
            soal: `Soal Pilihan Ganda Nomor ${qNum}`,
            pilihan: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' },
            kunci: 'A',
            skor: 1,
          }
        );
      });
    }

    updatedMCQs = updatedMCQs.map((q) => (q.nomor === nomor ? { ...q, kunci: cleanKey } : q));

    const updated = {
      ...activeAssessment,
      mcqQuestions: updatedMCQs,
    };
    saveAssessment(updated);
  };

  const handleSaveASASKeyString = (keyString: string) => {
    if (!activeAssessment || !saveAssessment) return;
    const maxQ = currentMaxQ;
    const cleanKeys = keyString.toUpperCase().replace(/[^A-E]/g, '').substring(0, maxQ);

    const updatedMCQs = Array.from({ length: maxQ }, (_, idx) => {
      const qNum = idx + 1;
      const existing = activeAssessment.mcqQuestions?.find((m) => m.nomor === qNum);
      const kChar = cleanKeys[idx] || existing?.kunci || 'A';
      return {
        nomor: qNum,
        soal: existing?.soal || `Soal Pilihan Ganda Nomor ${qNum}`,
        pilihan: existing?.pilihan || { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' },
        kunci: kChar,
        skor: existing?.skor || 1,
      };
    });

    const updated = {
      ...activeAssessment,
      mcqQuestions: updatedMCQs,
    };

    saveAssessment(updated);
    showToast('Kunci Jawaban Disimpan', `Kunci jawaban ASAS berhasil diperbarui (${cleanKeys.length}/${maxQ} kunci terisi).`, 'success');
  };

  const handleAdjustQuestionCount = (newCount: number) => {
    if (!activeAssessment || !saveAssessment) return;
    const currentMCQs = activeAssessment.mcqQuestions || [];
    const updatedMCQs: any[] = [];

    for (let i = 1; i <= newCount; i++) {
      const existing = currentMCQs.find((m) => m.nomor === i);
      if (existing) {
        updatedMCQs.push(existing);
      } else {
        updatedMCQs.push({
          nomor: i,
          soal: `Soal Pilihan Ganda Nomor ${i}`,
          pilihan: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E' },
          kunci: 'A',
          skor: 1,
        });
      }
    }

    const updated: Assessment = {
      ...activeAssessment,
      jumlahSoal: newCount,
      mcqQuestions: updatedMCQs,
    };
    saveAssessment(updated);
    showToast('Jumlah Soal Diperbarui', `Jumlah butir soal ASAS disesuaikan menjadi ${newCount} butir.`, 'info');
  };

  const handleSetStudentAnswer = (studentId: string, nomor: number, ansChar: string) => {
    const maxQ = currentMaxQ;
    const current = [...getStudentAnswers(studentId, maxQ)];
    current[nomor - 1] = current[nomor - 1] === ansChar ? '' : ansChar;
    setStudentAsasAnswers((prev) => ({
      ...prev,
      [studentId]: current,
    }));
  };

  const handleSetStudentAnswerString = (studentId: string, inputString: string) => {
    const maxQ = currentMaxQ;
    const clean = inputString.toUpperCase().replace(/[^A-E]/g, '').substring(0, maxQ);
    const arr = Array.from({ length: maxQ }, (_, idx) => clean[idx] || '');
    setStudentAsasAnswers((prev) => ({
      ...prev,
      [studentId]: arr,
    }));
  };

  const handleClearStudentAnswers = (studentId: string) => {
    const maxQ = currentMaxQ;
    setStudentAsasAnswers((prev) => ({
      ...prev,
      [studentId]: Array(maxQ).fill(''),
    }));
    showToast('Jawaban Dikosongkan', 'Susunan jawaban siswa telah dikosongkan.', 'info');
  };

  const handleApplyBulkPaste = () => {
    if (!bulkPasteText.trim() || !classStudents.length) return;
    const maxQ = currentMaxQ;
    const lines = bulkPasteText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const updated: Record<string, string[]> = { ...studentAsasAnswers };

    let assignedCount = 0;
    lines.forEach((line, lineIdx) => {
      let ansPart = line;
      let matchedStudent: Student | undefined = undefined;

      if (lineIdx < classStudents.length) {
        matchedStudent = classStudents[lineIdx];
      }

      if (line.includes(':') || line.includes('\t') || line.includes('-')) {
        const parts = line.split(/[:\t\-]/);
        const prefix = parts[0].trim().toLowerCase();
        ansPart = parts.slice(1).join('').trim();
        const found = classStudents.find(
          (s) =>
            s.nama.toLowerCase().includes(prefix) ||
            (s.noUrut && prefix.includes(String(s.noUrut))) ||
            prefix.includes(s.nisn)
        );
        if (found) matchedStudent = found;
      }

      const cleanAns = ansPart.toUpperCase().replace(/[^A-E]/g, '').substring(0, maxQ);
      if (cleanAns.length > 0 && matchedStudent) {
        const arr = Array.from({ length: maxQ }, (_, idx) => cleanAns[idx] || '');
        updated[matchedStudent.id] = arr;
        assignedCount++;
      }
    });

    setStudentAsasAnswers(updated);
    setShowBulkPasteModal(false);
    setBulkPasteText('');
    showToast('Jawaban Terimpor', `${assignedCount} data susunan jawaban siswa berhasil diisi ke rombel kelas.`, 'success');
  };

  // Master ASAS Correction Executor (No images, No AI penalty, 100% accurate & instant)
  const handleRunASASCorrection = async (scope: 'single' | 'selected' | 'class' | 'all-classes') => {
    if (!activeAssessment || !saveAssessment) return;
    const maxQ = currentMaxQ;
    const keys = Array.from({ length: maxQ }, (_, idx) => getMCQKey(idx + 1));
    const kktpVal = activeAssessment.kktp || 75;
    const mapel = activeAssessment.mataPelajaran;

    let targets: Student[] = [];
    if (scope === 'single') {
      if (!selectedStudent) {
        showToast('Pilih Siswa', 'Pilih siswa yang akan dikoreksi.', 'warning');
        return;
      }
      targets = [selectedStudent];
    } else if (scope === 'selected') {
      targets = classStudents.filter((s) => selectedStudentIdsForBatch.has(s.id));
      if (targets.length === 0) {
        showToast('Pilih Siswa', 'Centang minimal satu siswa di daftar untuk dikoreksi.', 'warning');
        return;
      }
    } else if (scope === 'class') {
      targets = classStudents;
      if (targets.length === 0) {
        showToast('Kelas Kosong', 'Tidak ada siswa terdaftar pada kelas ini.', 'warning');
        return;
      }
    } else if (scope === 'all-classes') {
      targets = allStudentsInAllClasses.length > 0 ? allStudentsInAllClasses : classStudents;
      if (targets.length === 0) {
        showToast('Siswa Kosong', 'Tidak ada siswa terdaftar pada rombel yang diajar.', 'warning');
        return;
      }
    }

    if (scope !== 'single') {
      handleStartBatchGrading(targets);
      return;
    }

    const newSubmissions: Submission[] = [];
    targets.forEach((std) => {
      const studentAns = getStudentAnswers(std.id, maxQ);
      let correctCount = 0;
      let wrongCount = 0;
      let unansweredCount = 0;

      const studentAnswersCheck: any[] = [];
      const itemScores: any[] = [];

      for (let i = 0; i < maxQ; i++) {
        const qNum = i + 1;
        const keyChar = keys[i] || 'A';
        const ansChar = studentAns[i] || '';
        const isAnswered = ansChar !== '' && ansChar !== '-';
        const isCorrect = isAnswered && ansChar === keyChar;

        if (!isAnswered) unansweredCount++;
        else if (isCorrect) correctCount++;
        else wrongCount++;

        studentAnswersCheck.push({
          nomor: qNum,
          jawabanSiswa: isAnswered ? ansChar : '-',
          kunci: keyChar,
          benar: isCorrect,
        });

        itemScores.push({
          nomor: qNum,
          skor: isCorrect ? 1 : 0,
          feedback: !isAnswered
            ? `Tidak Dijawab (Kunci: ${keyChar})`
            : isCorrect
            ? `Benar (Pilihan ${ansChar})`
            : `Salah (Pilihan ${ansChar}, Kunci: ${keyChar})`,
          jawabanSiswa: isAnswered ? ansChar : '-',
        });
      }

      const rawScore = maxQ > 0 ? Math.round((correctCount / maxQ) * 100) : 0;
      const finalScore = rawScore; // NO AI PENALTY for ASAS!
      const isTuntas = finalScore >= kktpVal;

      const autoCK = generateBloomDeepLearningCK(finalScore, kktpVal, mapel);
      const cleanCK = sanitizeCapaianKompetensi(autoCK, std.nama, isTuntas, mapel, finalScore);

      const sub: Submission = {
        id: `sub-asas-${Date.now()}-${std.id}`,
        studentId: std.id,
        studentName: std.nama,
        nisn: std.nisn,
        kelas: std.kelas,
        nilaiAkhir: finalScore,
        nilaiMurni: rawScore,
        aiDetected: false,
        aiPenaltyPercent: 0,
        aiPenaltyDeduction: 0,
        tuntas: isTuntas,
        statusKoreksi: 'Sudah Dikoreksi (ASAS PG Kunci Otomatis)',
        waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
        capaianKompetensi: cleanCK,
        itemScores,
        studentAnswers: studentAnswersCheck,
        scannedImage: undefined, // Purge photo after successful correction
        scannedImages: [],      // Purge photos to safeguard storage
      };

      // Clean local draft for this student
      removeDraft(`grading_${activeAssessment.id}_${std.id}`);
      newSubmissions.push(sub);
    });

    let currentSubs = [...(activeAssessment.submissions || [])];
    newSubmissions.forEach((nSub) => {
      const idx = currentSubs.findIndex((s) => s.studentId === nSub.studentId || s.studentName === nSub.studentName);
      if (idx >= 0) {
        currentSubs[idx] = nSub;
      } else {
        currentSubs.push(nSub);
      }
    });

    const updatedAsm: Assessment = {
      ...activeAssessment,
      submissions: currentSubs,
    };

    await saveAssessment(updatedAsm);
    setCapturedImages([]);
    setIsGrading(false);

    if (newSubmissions[0]) {
      setGradingResult(newSubmissions[0]);
    }

    confetti({ particleCount: 65, spread: 70, origin: { y: 0.6 } });
    showToast(
      'Koreksi ASAS Berhasil!',
      `${newSubmissions.length} siswa berhasil dikoreksi secara teliti. Hasil telah masuk ke daftar nilai ASAS.`,
      'success'
    );
  };

  // Comprehensive tracking of student photos from WebRTC, uploads, drafts, and submissions
  const studentPhotoStatus = useMemo(() => {
    const map = new Map<string, { hasPhotos: boolean; count: number; isDraft: boolean; isGraded: boolean }>();
    if (!activeAssessment || !classStudents) return map;

    classStudents.forEach((std) => {
      const sub = submissionsMap.get(std.id) || submissionsMap.get(std.nama);
      const isGraded = !!(
        sub?.statusKoreksi?.startsWith('Sudah Dikoreksi') ||
        sub?.statusKoreksi?.startsWith('Sudah Diverifikasi') ||
        (sub?.nilaiAkhir !== undefined && sub.nilaiAkhir > 0)
      );

      const subImgs = sub
        ? (Array.isArray(sub.scannedImages) && sub.scannedImages.length > 0
            ? sub.scannedImages.length
            : sub.scannedImage ? 1 : 0)
        : 0;

      const draftKey = `grading_${activeAssessment.id}_${std.id}`;
      const draft = getDraft(draftKey);
      const draftImgs = (draft && Array.isArray(draft.capturedImages)) ? draft.capturedImages.length : 0;

      const memImgs = (std.id === selectedStudentId) ? capturedImages.length : 0;
      const count = Math.max(subImgs, draftImgs, memImgs);
      const isDraft = !isGraded && (count > 0 || hasDraft(draftKey) || !!(sub?.statusKoreksi?.includes('Draf') || sub?.statusKoreksi?.includes('Draft')));

      map.set(std.id, {
        hasPhotos: count > 0 || isDraft,
        count,
        isDraft,
        isGraded,
      });
    });

    return map;
  }, [activeAssessment, classStudents, submissionsMap, selectedStudentId, capturedImages, getDraft, hasDraft]);

  const completedCount = useMemo(() => {
    if (!classStudents) return 0;
    return classStudents.filter((std) => studentPhotoStatus.get(std.id)?.isGraded).length;
  }, [classStudents, studentPhotoStatus]);

  const readyStudents = useMemo(() => {
    return classStudents.filter((std) => !studentPhotoStatus.get(std.id)?.isGraded && studentPhotoStatus.get(std.id)?.hasPhotos);
  }, [classStudents, studentPhotoStatus]);

  const draftCount = useMemo(() => {
    return readyStudents.length;
  }, [readyStudents]);

  const ungradedStudents = useMemo(() => {
    return classStudents.filter((std) => {
      const status = studentPhotoStatus.get(std.id);
      return !status?.isGraded && !status?.hasPhotos;
    });
  }, [classStudents, studentPhotoStatus]);

  // Batch Selection Callbacks
  const handleToggleCheckStudent = useCallback((id: string, e: React.MouseEvent) => {
    setSelectedStudentIdsForBatch((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAllFiltered = useCallback((currentList: Student[]) => {
    setSelectedStudentIdsForBatch((prev) => {
      if (prev.size === currentList.length && currentList.length > 0) {
        return new Set();
      }
      return new Set(currentList.map((s) => s.id));
    });
  }, []);

  const handleSelectAllReady = useCallback(() => {
    const readyIds = readyStudents.map((s) => s.id);
    setSelectedStudentIdsForBatch(new Set(readyIds));
    showToast('Siswa Siap Dipilih', `${readyIds.length} siswa dengan foto/draf siap telah dicentang.`, 'info');
  }, [readyStudents, showToast]);

  // Master Batch AI Grading Runner: supports grading full class or multiple selected students
  const handleStartBatchGrading = useCallback(async (targetStudents: Student[]) => {
    if (!activeAssessment || targetStudents.length === 0) {
      showToast('Pilih Siswa', 'Tidak ada siswa yang dipilih untuk dikoreksi.', 'warning');
      return;
    }

    setBatchQueue(targetStudents);
    setBatchCurrentIndex(0);
    setBatchIsRunning(true);
    setBatchIsPaused(false);
    setIsBatchModalOpen(true);
    batchCancelRef.current = false;
    batchPauseRef.current = false;

    const initialResults: Record<string, { status: 'waiting' | 'grading' | 'success' | 'failed' | 'skipped'; score?: number; note?: string }> = {};
    targetStudents.forEach((std) => {
      initialResults[std.id] = { status: 'waiting' };
    });
    setBatchResults(initialResults);

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    let accumulatedAssessment: Assessment = { ...activeAssessment };

    for (let i = 0; i < targetStudents.length; i++) {
      if (batchCancelRef.current) {
        showToast('Koreksi Dibatalkan', 'Proses koreksi massal dihentikan.', 'info');
        break;
      }

      while (batchPauseRef.current) {
        await new Promise((r) => setTimeout(r, 400));
        if (batchCancelRef.current) break;
      }

      if (batchCancelRef.current) break;

      const std = targetStudents[i];
      setBatchCurrentIndex(i);

      setBatchResults((prev) => ({
        ...prev,
        [std.id]: { status: 'grading' },
      }));

      // Dedicated ASAS (MCQ) sequential correction flow
      if (activeAssessment.jenis === 'ASAS') {
        const maxQ = currentMaxQ;
        const keys = Array.from({ length: maxQ }, (_, idx) => getMCQKey(idx + 1));
        const kktpVal = activeAssessment.kktp || 75;
        const mapel = activeAssessment.mataPelajaran;
        const studentAns = getStudentAnswers(std.id, maxQ);

        let correctCount = 0;
        const studentAnswersCheck: any[] = [];
        const itemScores: any[] = [];

        for (let qIdx = 0; qIdx < maxQ; qIdx++) {
          const qNum = qIdx + 1;
          const keyChar = keys[qIdx] || 'A';
          const ansChar = studentAns[qIdx] || '';
          const isAnswered = ansChar !== '' && ansChar !== '-';
          const isCorrect = isAnswered && ansChar === keyChar;

          if (isCorrect) correctCount++;

          studentAnswersCheck.push({
            nomor: qNum,
            jawabanSiswa: isAnswered ? ansChar : '-',
            kunci: keyChar,
            benar: isCorrect,
          });

          itemScores.push({
            nomor: qNum,
            skor: isCorrect ? 1 : 0,
            feedback: !isAnswered
              ? `Tidak Dijawab (Kunci: ${keyChar})`
              : isCorrect
              ? `Benar (Pilihan ${ansChar})`
              : `Salah (Pilihan ${ansChar}, Kunci: ${keyChar})`,
            jawabanSiswa: isAnswered ? ansChar : '-',
          });
        }

        const rawScore = maxQ > 0 ? Math.round((correctCount / maxQ) * 100) : 0;
        const finalScore = rawScore;
        const isTuntas = finalScore >= kktpVal;

        const autoCK = generateBloomDeepLearningCK(finalScore, kktpVal, mapel);
        const cleanCK = sanitizeCapaianKompetensi(autoCK, std.nama, isTuntas, mapel, finalScore);

        const sub: Submission = {
          id: `sub-asas-${Date.now()}-${std.id}`,
          studentId: std.id,
          studentName: std.nama,
          nisn: std.nisn,
          kelas: std.kelas,
          nilaiAkhir: finalScore,
          nilaiMurni: rawScore,
          aiDetected: false,
          aiPenaltyPercent: 0,
          aiPenaltyDeduction: 0,
          tuntas: isTuntas,
          statusKoreksi: 'Sudah Dikoreksi (ASAS PG Kunci Otomatis)',
          waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
          capaianKompetensi: cleanCK,
          itemScores,
          studentAnswers: studentAnswersCheck,
          scannedImage: undefined,
          scannedImages: [],
        };

        const existingIdx = (accumulatedAssessment.submissions || []).findIndex(
          (s) => s.studentId === std.id || s.studentName === std.nama
        );

        let nextSubmissions = [...accumulatedAssessment.submissions];
        if (existingIdx >= 0) {
          nextSubmissions[existingIdx] = sub;
        } else {
          nextSubmissions.push(sub);
        }

        accumulatedAssessment = {
          ...accumulatedAssessment,
          submissions: nextSubmissions,
        };

        await saveAssessment(accumulatedAssessment);
        removeDraft(`grading_${activeAssessment.id}_${std.id}`);

        if (std.id === selectedStudentId) {
          setGradingResult(sub);
        }

        setBatchResults((prev) => ({
          ...prev,
          [std.id]: {
            status: 'success',
            score: finalScore,
            note: isTuntas ? 'Tuntas' : 'Remidi',
          },
        }));
        successCount++;
        await new Promise((r) => setTimeout(r, 200));
        continue;
      }

      // Gather student photos
      let studentImages: string[] = [];
      if (std.id === selectedStudentId && capturedImages.length > 0) {
        studentImages = [...capturedImages];
      } else {
        const draftKey = `grading_${activeAssessment.id}_${std.id}`;
        const draft = getDraft(draftKey);
        if (draft && Array.isArray(draft.capturedImages) && draft.capturedImages.length > 0) {
          studentImages = draft.capturedImages;
        } else {
          const sub = (accumulatedAssessment.submissions || []).find(
            (s) => s.studentId === std.id || s.studentName === std.nama
          );
          if (sub) {
            studentImages = Array.isArray(sub.scannedImages) && sub.scannedImages.length > 0
              ? sub.scannedImages
              : sub.scannedImage ? [sub.scannedImage] : [];
          }
        }
      }

      if (studentImages.length === 0) {
        // Auto-heal check: if student already has an evaluated score or saved draft score, finalize and promote them!
        const existingSub = (accumulatedAssessment.submissions || []).find(
          (s) => s.studentId === std.id || s.studentName === std.nama
        );
        const draftKey = `grading_${activeAssessment.id}_${std.id}`;
        const draft = getDraft(draftKey);
        const hasExistingScore = existingSub?.nilaiAkhir !== undefined && existingSub.nilaiAkhir > 0;
        const hasDraftScore = draft?.gradingResult?.nilaiAkhir !== undefined && draft.gradingResult.nilaiAkhir > 0;

        if (hasExistingScore || hasDraftScore) {
          const finalScore = hasExistingScore ? existingSub!.nilaiAkhir : draft!.gradingResult.nilaiAkhir;
          const isTuntas = finalScore >= (activeAssessment.kktp || 75);
          const finalSub: Submission = {
            ...(existingSub || {
              id: `sub-${Date.now()}-${std.id}`,
              studentId: std.id,
              studentName: std.nama,
              nisn: std.nisn,
              kelas: std.kelas,
            }),
            nilaiAkhir: finalScore,
            nilaiMurni: existingSub?.nilaiMurni || finalScore,
            tuntas: isTuntas,
            statusKoreksi: 'Sudah Dikoreksi (Tuntas Dinilai)',
            waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
            capaianKompetensi: existingSub?.capaianKompetensi || sanitizeCapaianKompetensi(
              generateBloomDeepLearningCK(finalScore, activeAssessment.kktp || 75, activeAssessment.mataPelajaran),
              std.nama,
              isTuntas,
              activeAssessment.mataPelajaran,
              finalScore
            ),
            scannedImages: [],
            scannedImage: undefined,
          };

          const exIdx = (accumulatedAssessment.submissions || []).findIndex(
            (s) => s.studentId === std.id || s.studentName === std.nama
          );
          let nextSubs = [...accumulatedAssessment.submissions];
          if (exIdx >= 0) {
            nextSubs[exIdx] = finalSub;
          } else {
            nextSubs.push(finalSub);
          }
          accumulatedAssessment = { ...accumulatedAssessment, submissions: nextSubs };
          await saveAssessment(accumulatedAssessment);
          removeDraft(draftKey);

          setBatchResults((prev) => ({
            ...prev,
            [std.id]: { status: 'success', score: finalScore, note: isTuntas ? 'Tuntas' : 'Remidi' },
          }));
          successCount++;
          continue;
        }

        setBatchResults((prev) => ({
          ...prev,
          [std.id]: { status: 'skipped', note: 'Belum ada foto lembar' },
        }));
        skippedCount++;
        continue;
      }

      try {
        const isASTS = activeAssessment.jenis === 'ASTS';
        const rubrikOrKeys = isASTS ? activeAssessment.essayRubrik : activeAssessment.mcqQuestions;

        const res = await fetch('/api/gemini/grade-sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imagesBase64: studentImages,
            studentName: std.nama,
            nisn: std.nisn,
            kelas: std.kelas,
            assessmentType: activeAssessment.jenis,
            rubrikOrKeys: rubrikOrKeys,
            kktp: activeAssessment.kktp || 75,
            enableAiDetection,
            aiPenaltyPercent,
          }),
        });

        const json = await res.json();
        if (json.success && json.result) {
          const resData = json.result;
          resData.capaianKompetensi = sanitizeCapaianKompetensi(
            resData.capaianKompetensi,
            std.nama,
            resData.tuntas,
            activeAssessment.mataPelajaran,
            resData.nilaiAkhir
          );

          const newSub: Submission = {
            id: `sub-${Date.now()}-${std.id}`,
            studentId: std.id,
            studentName: std.nama,
            nisn: std.nisn,
            kelas: std.kelas,
            nilaiAkhir: resData.nilaiAkhir,
            nilaiMurni: resData.nilaiMurni || resData.nilaiAkhir,
            aiDetected: resData.aiDetected || false,
            aiProbability: resData.aiProbability || 0,
            aiPenaltyPercent: resData.aiPenaltyPercent || 0,
            aiPenaltyDeduction: resData.aiPenaltyDeduction || 0,
            aiExplanation: resData.aiExplanation,
            tuntas: resData.tuntas,
            statusKoreksi: 'Sudah Dikoreksi (Gemini AI Vision)',
            waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
            capaianKompetensi: resData.capaianKompetensi,
            itemScores: resData.itemScores,
            studentAnswers: resData.studentAnswers,
            scannedImage: undefined, // Purge photo after successful correction
            scannedImages: [],      // Purge photo sheets to safeguard system storage
          };

          const existingIdx = (accumulatedAssessment.submissions || []).findIndex(
            (s) => s.studentId === std.id || s.studentName === std.nama
          );

          let nextSubmissions = [...accumulatedAssessment.submissions];
          if (existingIdx >= 0) {
            nextSubmissions[existingIdx] = newSub;
          } else {
            nextSubmissions.push(newSub);
          }

          accumulatedAssessment = {
            ...accumulatedAssessment,
            submissions: nextSubmissions,
          };

          // Save to database
          await saveAssessment(accumulatedAssessment);
          removeDraft(`grading_${activeAssessment.id}_${std.id}`);

          if (std.id === selectedStudentId) {
            setGradingResult(resData);
            setCapturedImages([]);
          }

          setBatchResults((prev) => ({
            ...prev,
            [std.id]: {
              status: 'success',
              score: resData.nilaiAkhir,
              note: resData.tuntas ? 'Tuntas' : 'Remidi',
            },
          }));
          successCount++;
        } else {
          setBatchResults((prev) => ({
            ...prev,
            [std.id]: { status: 'failed', note: json.message || 'AI gagal memproses' },
          }));
          failedCount++;
        }
      } catch (err: any) {
        setBatchResults((prev) => ({
          ...prev,
          [std.id]: { status: 'failed', note: err?.message || 'Gagal koneksi' },
        }));
        failedCount++;
      }

      await new Promise((r) => setTimeout(r, 350));
    }

    setBatchIsRunning(false);
    setCapturedImages([]);
    targetStudents.forEach((std) => {
      removeDraft(`grading_${activeAssessment.id}_${std.id}`);
    });

    if (successCount > 0) {
      confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } });
      showToast(
        'Koreksi Massal Selesai & Rapor Terkirim!',
        `${successCount} siswa berhasil dinilai secara massal. Nilai akhir beserta Capaian Kompetensi otomatis terkirim dan disimpan langsung ke Nilai Raport STS/SAS.`,
        'success'
      );
    } else if (!batchCancelRef.current) {
      showToast('Koreksi Selesai', 'Tidak ada siswa yang berhasil dinilai.', 'info');
    }
  }, [
    activeAssessment,
    selectedStudentId,
    capturedImages,
    enableAiDetection,
    aiPenaltyPercent,
    getDraft,
    saveAssessment,
    removeDraft,
    showToast,
  ]);

  const handleCleanAndFinalizeFinishedSubmissions = useCallback(async () => {
    if (!activeAssessment || !saveAssessment) return;
    const currentSubs = activeAssessment.submissions || [];
    let updatedCount = 0;
    let photoPurgedCount = 0;

    const updatedSubmissions = currentSubs.map((sub) => {
      let newSub = { ...sub };

      // 1. If graded or has score, purge bulky photos to safeguard system storage
      const isGraded = newSub.statusKoreksi?.startsWith('Sudah Dikoreksi') ||
        newSub.statusKoreksi?.startsWith('Sudah Diverifikasi') ||
        (newSub.nilaiAkhir !== undefined && newSub.nilaiAkhir > 0);

      if (isGraded) {
        if ((Array.isArray(newSub.scannedImages) && newSub.scannedImages.length > 0) || newSub.scannedImage) {
          newSub.scannedImages = [];
          newSub.scannedImage = undefined;
          photoPurgedCount++;
        }

        // 2. If it was stuck in draft status despite having a score, upgrade to official graded status
        if (newSub.statusKoreksi?.includes('Draf') || newSub.statusKoreksi?.includes('Draft') || newSub.statusKoreksi?.includes('Citra Terunggah')) {
          newSub.statusKoreksi = activeAssessment.jenis === 'ASAS'
            ? 'Sudah Dikoreksi (ASAS PG Kunci Otomatis)'
            : 'Sudah Dikoreksi (Gemini AI Vision)';
          updatedCount++;
        }

        // 3. Remove local storage draft entry
        removeDraft(`grading_${activeAssessment.id}_${newSub.studentId}`);
      }

      return newSub;
    });

    if (updatedCount > 0 || photoPurgedCount > 0) {
      await saveAssessment({
        ...activeAssessment,
        submissions: updatedSubmissions,
      });
      setCapturedImages([]);
      showToast(
        'Optimalisasi Penyimpanan Berhasil!',
        `${updatedCount} status draf telah dituntaskan ke nilai resmi & foto ${photoPurgedCount} lembar jawaban siswa berhasil dibersihkan dari penyimpanan.`,
        'success'
      );
    } else {
      showToast('Penyimpanan Optimal', 'Seluruh hasil koreksi sudah berstatus resmi dan bersih dari tumpukan file foto.', 'info');
    }
  }, [activeAssessment, saveAssessment, removeDraft, showToast]);

  const handleJumpToNextUngraded = useCallback(() => {
    if (!classStudents || classStudents.length === 0) return;

    const currentIndex = classStudents.findIndex((s) => s.id === selectedStudentId);

    // Always move to the immediate next student down the list
    let nextStudent = null;
    if (currentIndex >= 0 && currentIndex + 1 < classStudents.length) {
      nextStudent = classStudents[currentIndex + 1];
    }

    if (nextStudent) {
      setSelectedStudentId(nextStudent.id);
      setCapturedImages([]);
      setGradingResult(null);
      showToast('Pindah Ke Siswa Berikutnya', `Membuka lembar jawaban ${nextStudent.nama}.`, 'info');

      // Smooth auto-scroll to student item in roster list
      setTimeout(() => {
        const el = document.getElementById(`std-item-${nextStudent.id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 60);
    } else {
      showToast('Akhir Daftar', 'Sudah berada di siswa terakhir pada kelas ini.', 'warning');
    }
  }, [classStudents, selectedStudentId, showToast]);

  const existingSubmission = useMemo(() => {
    if (!selectedStudent) return undefined;
    return submissionsMap.get(selectedStudent.id) || submissionsMap.get(selectedStudent.nama);
  }, [selectedStudent, submissionsMap]);

  // Auto-heal on assessment load: ensure no scored submissions linger in 'Draf' status and purge bulky photos
  useEffect(() => {
    if (!activeAssessment || !Array.isArray(activeAssessment.submissions)) return;

    let hasChange = false;
    const healedSubs = activeAssessment.submissions.map((sub) => {
      const isGradedWithScore = sub.nilaiAkhir !== undefined && sub.nilaiAkhir > 0;
      const isDraftStatus = !!(sub.statusKoreksi?.includes('Draf') || sub.statusKoreksi?.includes('Draft') || sub.statusKoreksi?.includes('Citra Terunggah'));
      const hasBulkyPhotos = (Array.isArray(sub.scannedImages) && sub.scannedImages.length > 0) || !!sub.scannedImage;

      if (isGradedWithScore && (isDraftStatus || hasBulkyPhotos)) {
        hasChange = true;
        return {
          ...sub,
          statusKoreksi: isDraftStatus ? 'Sudah Dikoreksi (Tuntas Dinilai)' : sub.statusKoreksi,
          scannedImages: [],
          scannedImage: undefined,
        };
      }
      return sub;
    });

    if (hasChange) {
      saveAssessment({
        ...activeAssessment,
        submissions: healedSubs,
      });
    }
  }, [activeAssessment?.id, saveAssessment]);

  // Real-time synchronization of images and correction state across devices + Autosave Draft recovery!
  useEffect(() => {
    if (!selectedStudentId || !activeAssessmentId) {
      setCapturedImages([]);
      setGradingResult(null);
      return;
    }

    const autosaveKey = `grading_${activeAssessmentId}_${selectedStudentId}`;

    const isSubGraded = !!(
      existingSubmission && (
        existingSubmission.statusKoreksi?.startsWith('Sudah Dikoreksi') ||
        existingSubmission.statusKoreksi?.startsWith('Sudah Diverifikasi') ||
        (existingSubmission.nilaiAkhir !== undefined && existingSubmission.nilaiAkhir > 0 && !existingSubmission.statusKoreksi?.includes('Draf'))
      )
    );

    if (isSubGraded && existingSubmission) {
      // Graded student: photos are purged for storage safety
      setCapturedImages([]);
      removeDraft(autosaveKey);
      setGradingResult({
        nilaiAkhir: existingSubmission.nilaiAkhir,
        nilaiMurni: existingSubmission.nilaiMurni || existingSubmission.nilaiAkhir,
        tuntas: existingSubmission.tuntas,
        aiDetected: existingSubmission.aiDetected || false,
        aiProbability: existingSubmission.aiProbability || 0,
        aiPenaltyPercent: existingSubmission.aiPenaltyPercent || 0,
        aiPenaltyDeduction: existingSubmission.aiPenaltyDeduction || 0,
        aiExplanation: existingSubmission.aiExplanation || '',
        capaianKompetensi: existingSubmission.capaianKompetensi || '',
        itemScores: existingSubmission.itemScores || [],
        studentAnswers: existingSubmission.studentAnswers || [],
      });
      return;
    }

    // Check if there is an active local autosave draft for this student
    const localDraft = getDraft(autosaveKey);

    if (localDraft && (localDraft.gradingResult || (localDraft.capturedImages && localDraft.capturedImages.length > 0))) {
      if (localDraft.capturedImages && Array.isArray(localDraft.capturedImages)) {
        setCapturedImages(localDraft.capturedImages);
      }
      if (localDraft.gradingResult) {
        setGradingResult(localDraft.gradingResult);
        return;
      }
    }

    if (existingSubmission) {
      const allImgs: string[] = Array.isArray(existingSubmission.scannedImages) && existingSubmission.scannedImages.length > 0
        ? existingSubmission.scannedImages
        : existingSubmission.scannedImage
        ? [existingSubmission.scannedImage]
        : [];
      
      setCapturedImages(allImgs);

      if (existingSubmission.nilaiAkhir !== undefined && !existingSubmission.statusKoreksi?.includes('Draf') && !existingSubmission.statusKoreksi?.includes('Citra Terunggah')) {
        setGradingResult({
          nilaiAkhir: existingSubmission.nilaiAkhir,
          nilaiMurni: existingSubmission.nilaiMurni || existingSubmission.nilaiAkhir,
          tuntas: existingSubmission.tuntas,
          aiDetected: existingSubmission.aiDetected || false,
          aiProbability: existingSubmission.aiProbability || 0,
          aiPenaltyPercent: existingSubmission.aiPenaltyPercent || 0,
          aiPenaltyDeduction: existingSubmission.aiPenaltyDeduction || 0,
          aiExplanation: existingSubmission.aiExplanation || '',
          capaianKompetensi: existingSubmission.capaianKompetensi || '',
          itemScores: existingSubmission.itemScores || [],
          studentAnswers: existingSubmission.studentAnswers || [],
        });
      } else {
        setGradingResult(null);
      }
    } else {
      setCapturedImages([]);
      setGradingResult(null);
    }
  }, [
    selectedStudentId,
    activeAssessmentId,
    existingSubmission,
    getDraft,
    removeDraft
  ]);

  // Background Autosave whenever teacher edits grading results or attaches images for UNGRADED students
  useEffect(() => {
    if (!activeAssessment || !selectedStudent) return;

    const isSubGraded = !!(
      existingSubmission && (
        existingSubmission.statusKoreksi?.startsWith('Sudah Dikoreksi') ||
        existingSubmission.statusKoreksi?.startsWith('Sudah Diverifikasi') ||
        (existingSubmission.nilaiAkhir !== undefined && existingSubmission.nilaiAkhir > 0 && !existingSubmission.statusKoreksi?.includes('Draf'))
      )
    );
    if (isSubGraded) return; // Do not autosave draft for already graded student

    if (gradingResult || capturedImages.length > 0) {
      const autosaveKey = `grading_${activeAssessment.id}_${selectedStudent.id}`;
      saveDraft(
        autosaveKey,
        `Koreksi: ${selectedStudent.nama} (${activeAssessment.mataPelajaran})`,
        {
          gradingResult,
          capturedImages,
          savedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        }
      );
    }
  }, [gradingResult, capturedImages, activeAssessment, selectedStudent, existingSubmission, saveDraft]);

  // 4. Memoized filtered student list with filter tabs
  const filteredStudents = useMemo(() => {
    let list = classStudents;
    if (studentFilterTab === 'ready') {
      list = list.filter((s) => {
        const stat = studentPhotoStatus.get(s.id);
        return !stat?.isGraded && stat?.hasPhotos;
      });
    } else if (studentFilterTab === 'ungraded') {
      list = list.filter((s) => {
        const stat = studentPhotoStatus.get(s.id);
        return !stat?.isGraded && !stat?.hasPhotos;
      });
    } else if (studentFilterTab === 'completed') {
      list = list.filter((s) => studentPhotoStatus.get(s.id)?.isGraded);
    }

    if (!searchStudent.trim()) return list;
    const q = searchStudent.toLowerCase().trim();
    return list.filter(
      (s) => s.nama.toLowerCase().includes(q) || s.nisn.includes(q)
    );
  }, [classStudents, studentFilterTab, studentPhotoStatus, searchStudent]);

  // 5. Memoized Callbacks
  const handleSelectStudent = useCallback((id: string) => {
    setSelectedStudentId(id);
    setCapturedImages([]);
    setGradingResult(null);
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const optimizedImages: string[] = [];
      for (const file of files) {
        const optBase64 = await optimizeDocumentForAI(file);
        if (optBase64) {
          optimizedImages.push(optBase64);
        }
      }

      if (optimizedImages.length > 0) {
        // Incrementally append unlimited images to current student answer sheets
        const newCaptured = [...capturedImages, ...optimizedImages];
        setCapturedImages(newCaptured);
        setGradingResult(null);

        // Instant Real-Time Sync to Cloud Database!
        if (selectedStudent && activeAssessment) {
          const existingSubIdx = activeAssessment.submissions.findIndex(
            (s) => s.studentId === selectedStudent.id || s.studentName === selectedStudent.nama
          );

          let updatedSubmissions = [...activeAssessment.submissions];
          
          if (existingSubIdx >= 0) {
            const existingSub = updatedSubmissions[existingSubIdx];
            updatedSubmissions[existingSubIdx] = {
              ...existingSub,
              scannedImages: newCaptured,
              scannedImage: newCaptured[0] || undefined,
              statusKoreksi: (existingSub.statusKoreksi.startsWith('Sudah Dikoreksi') || existingSub.statusKoreksi.startsWith('Sudah Diverifikasi'))
                ? existingSub.statusKoreksi
                : 'Citra Terunggah via Cloud (Draft)',
            };
          } else {
            const newDraftSub: Submission = {
              id: `sub-imp-${Date.now()}`,
              studentId: selectedStudent.id,
              studentName: selectedStudent.nama,
              nisn: selectedStudent.nisn,
              kelas: selectedStudent.kelas,
              nilaiAkhir: 0,
              tuntas: false,
              statusKoreksi: 'Citra Terunggah via Cloud (Draft)',
              waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
              capaianKompetensi: 'Menunggu proses koreksi...',
              scannedImages: newCaptured,
              scannedImage: newCaptured[0] || undefined,
            };
            updatedSubmissions.push(newDraftSub);
          }

          const updatedAssessment: Assessment = {
            ...activeAssessment,
            submissions: updatedSubmissions,
          };
          
          await saveAssessment(updatedAssessment);
          showToast(
            'Foto Tersinkronisasi', 
            `Berhasil menambahkan ${optimizedImages.length} lembar foto (Total: ${newCaptured.length} lembar untuk ${selectedStudent.nama}).`, 
            'success'
          );
        }
      }
    } catch (err) {
      console.error('Error optimizing image:', err);
    } finally {
      e.target.value = ''; // Reset input to allow re-uploading same file if needed
    }
  }, [capturedImages, selectedStudent, activeAssessment, saveAssessment, showToast]);

  const handleWebRtcImagesReceived = useCallback(async (incomingImages: string | string[]) => {
    const imagesArr = Array.isArray(incomingImages) ? incomingImages : [incomingImages];
    if (imagesArr.length === 0) return;

    let currentStudent = selectedStudentRef.current;
    if (!currentStudent && classStudentsRef.current && classStudentsRef.current.length > 0) {
      currentStudent = classStudentsRef.current[0];
      setSelectedStudentId(currentStudent.id);
    }
    const currentAssessment = activeAssessmentRef.current;

    setCapturedImages((prev) => {
      const combinedImages = [...prev];
      for (const img of imagesArr) {
        combinedImages.push(img);
      }

      // Instant Real-Time Sync to Cloud Database upon receiving image!
      if (currentStudent && currentAssessment) {
        const existingSubIdx = currentAssessment.submissions.findIndex(
          (s: Submission) => s.studentId === currentStudent.id || s.studentName === currentStudent.nama
        );

        let updatedSubmissions = [...currentAssessment.submissions];
        if (existingSubIdx >= 0) {
          const existingSub = updatedSubmissions[existingSubIdx];
          const existingImages = Array.isArray(existingSub.scannedImages) && existingSub.scannedImages.length > 0
            ? existingSub.scannedImages
            : existingSub.scannedImage
            ? [existingSub.scannedImage]
            : [];
          
          const updatedImgs = [...existingImages];
          for (const img of imagesArr) {
            updatedImgs.push(img);
          }

          updatedSubmissions[existingSubIdx] = {
            ...existingSub,
            scannedImages: updatedImgs,
            scannedImage: updatedImgs[0] || undefined,
            statusKoreksi: (existingSub.statusKoreksi.startsWith('Sudah Dikoreksi') || existingSub.statusKoreksi.startsWith('Sudah Diverifikasi'))
              ? existingSub.statusKoreksi
              : 'Citra Terunggah via Cloud (Draft)',
          };
        } else {
          updatedSubmissions.push({
            id: `sub-${Date.now()}`,
            studentId: currentStudent.id,
            studentName: currentStudent.nama,
            nisn: currentStudent.nisn,
            kelas: currentStudent.kelas,
            statusKoreksi: 'Citra Terunggah via Cloud (Draft)',
            scannedImages: imagesArr,
            scannedImage: imagesArr[0],
            nilaiAkhir: 0,
            nilaiMurni: 0,
            tuntas: false,
            waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
            capaianKompetensi: 'Menunggu penilaian AI...',
          });
        }

        const updatedAssessment: Assessment = {
          ...currentAssessment,
          submissions: updatedSubmissions,
        };

        saveAssessment(updatedAssessment);
      }

      return combinedImages;
    });

    showToast(
      'Foto Diterima!',
      `Berhasil menambahkan ${imagesArr.length} foto lembar jawaban dari HP via WebRTC.`,
      'success'
    );
  }, [saveAssessment, showToast]);

  const handleWebRtcImageReceived = useCallback((base64Image: string) => {
    handleWebRtcImagesReceived([base64Image]);
  }, [handleWebRtcImagesReceived]);

  // Global persistent WebRTC subscription: ensures photos sent from HP are captured and saved in real-time even when modal is closed
  useEffect(() => {
    const unsubscribe = webrtcSession.subscribe({
      onImagesReceived: (imgs) => {
        handleWebRtcImagesReceived(imgs);
      },
      onImageReceived: (img) => {
        handleWebRtcImageReceived(img);
      },
    });
    return () => {
      unsubscribe();
    };
  }, [handleWebRtcImagesReceived, handleWebRtcImageReceived]);

  const handleRemoveImage = useCallback(async (indexToRemove: number) => {
    const newCaptured = capturedImages.filter((_, idx) => idx !== indexToRemove);
    setCapturedImages(newCaptured);

    // Instant Real-Time Sync to Cloud Database upon removing image!
    if (selectedStudent && activeAssessment) {
      const existingSubIdx = activeAssessment.submissions.findIndex(
        (s) => s.studentId === selectedStudent.id || s.studentName === selectedStudent.nama
      );

      let updatedSubmissions = [...activeAssessment.submissions];
      
      if (existingSubIdx >= 0) {
        const existingSub = updatedSubmissions[existingSubIdx];
        updatedSubmissions[existingSubIdx] = {
          ...existingSub,
          scannedImages: newCaptured,
          scannedImage: newCaptured[0] || undefined,
        };
      }
      
      const updatedAssessment: Assessment = {
        ...activeAssessment,
        submissions: updatedSubmissions,
      };
      
      await saveAssessment(updatedAssessment);
      showToast('Foto Dihapus', 'Foto lembar berhasil dihapus.', 'info');
    }
  }, [capturedImages, selectedStudent, activeAssessment, saveAssessment, showToast]);

  const handleRunAIGrading = useCallback(async () => {
    if (!activeAssessment || !selectedStudent) {
      showToast('Pilih Siswa', 'Silakan pilih siswa yang akan dinilai.', 'warning');
      return;
    }

    if (capturedImages.length === 0) {
      showToast('Unggah Lembar Jawaban', 'Silakan unggah minimal 1 lembar/foto jawaban siswa.', 'warning');
      return;
    }

    setIsGrading(true);
    showToast(
      'AI Vision Bekerja...',
      `Membaca & menggabungkan ${capturedImages.length} lembar jawaban siswa dengan ketajaman ultra-tinggi...`,
      'info'
    );

    try {
      const isASTS = activeAssessment.jenis === 'ASTS';
      const rubrikOrKeys = isASTS
        ? (activeAssessment.essayRubrik || []).map((r) => {
            const flex = analyzeEssayFlexibility(r.soal, r.kunciJawaban, r.skorMaks);
            return {
              ...r,
              tipeEssay: flex.type,
              kataKunciUtama: flex.extractedKeywords,
              aiGradingInstruction: flex.aiGradingInstruction,
            };
          })
        : activeAssessment.mcqQuestions;

      const res = await fetch('/api/gemini/grade-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagesBase64: capturedImages,
          studentName: selectedStudent.nama,
          nisn: selectedStudent.nisn,
          kelas: selectedStudent.kelas,
          assessmentType: activeAssessment.jenis,
          rubrikOrKeys: rubrikOrKeys,
          kktp: activeAssessment.kktp || 75,
          enableAiDetection,
          aiPenaltyPercent,
        }),
      });

      const json = await res.json();
      if (json.success && json.result) {
        // Enforce Taksonomi Bloom & KKTP Formula without student name
        json.result.capaianKompetensi = sanitizeCapaianKompetensi(
          json.result.capaianKompetensi,
          selectedStudent.nama,
          json.result.tuntas,
          activeAssessment.mataPelajaran,
          json.result.nilaiAkhir
        );

        const resData = json.result;
        setGradingResult(resData);

        // INSTANT AUTOMATIC SAVE TO DATABASE & NILAI RAPORT WITHOUT MANUAL SAVE
        const autoSub: Submission = {
          id: `sub-${Date.now()}`,
          studentId: selectedStudent.id,
          studentName: selectedStudent.nama,
          nisn: selectedStudent.nisn,
          kelas: selectedStudent.kelas,
          nilaiAkhir: resData.nilaiAkhir,
          nilaiMurni: resData.nilaiMurni || resData.nilaiAkhir,
          aiDetected: resData.aiDetected || false,
          aiProbability: resData.aiProbability || 0,
          aiPenaltyPercent: resData.aiPenaltyPercent || 0,
          aiPenaltyDeduction: resData.aiPenaltyDeduction || 0,
          aiExplanation: resData.aiExplanation,
          tuntas: resData.tuntas,
          statusKoreksi: 'Sudah Dikoreksi (Gemini AI Vision)',
          waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
          capaianKompetensi: resData.capaianKompetensi,
          itemScores: resData.itemScores,
          studentAnswers: resData.studentAnswers,
          scannedImage: undefined, // Purge photo after successful AI evaluation
          scannedImages: [],      // Purge photo sheets to safeguard system storage
        };

        const existingSubIdx = activeAssessment.submissions.findIndex(
          (s) => s.studentId === selectedStudent.id || s.studentName === selectedStudent.nama
        );

        let updatedSubmissions = [...activeAssessment.submissions];
        if (existingSubIdx >= 0) {
          updatedSubmissions[existingSubIdx] = autoSub;
        } else {
          updatedSubmissions.push(autoSub);
        }

        const updatedAssessment: Assessment = {
          ...activeAssessment,
          submissions: updatedSubmissions,
        };

        await saveAssessment(updatedAssessment);
        removeDraft(`grading_${activeAssessment.id}_${selectedStudent.id}`);
        setCapturedImages([]);

        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });

        showToast(
          'Koreksi Selesai & Rapor Terkirim!',
          `Nilai Akhir: ${resData.nilaiAkhir} (${resData.tuntas ? 'TUNTAS' : 'BELUM TUNTAS'}). Nilai & Capaian Pembelajaran otomatis terkirim & disimpan langsung ke Raport!`,
          'success'
        );
      } else {
        showToast('Gagal Koreksi', json.message || 'AI tidak dapat membaca lembar jawaban.', 'error');
      }
    } catch (err: any) {
      console.error('Grading error:', err);
      showToast('Kesalahan Server', 'Gagal memproses penilaian: ' + err.message, 'error');
    } finally {
      setIsGrading(false);
    }
  }, [
    activeAssessment,
    selectedStudent,
    capturedImages,
    enableAiDetection,
    aiPenaltyPercent,
    saveAssessment,
    removeDraft,
    showToast,
  ]);

  const handleSaveSubmission = useCallback(async () => {
    if (!activeAssessment || !selectedStudent || !gradingResult) return;

    const studentName = selectedStudent.nama;
    const finalScore = gradingResult.nilaiAkhir;
    const studentId = selectedStudent.id;

    // 1. Tampilkan notifikasi BERHASIL TERSIMPAN SECARA INSTAN TANPA DELAY
    showToast(
      'Nilai Berhasil Tersimpan!',
      `Nilai ${studentName} (${finalScore}) berhasil tersimpan dan langsung masuk ke format Nilai Raport STS.`,
      'success'
    );

    // 2. Langsung bersihkan draf lokal seketika
    removeDraft(`grading_${activeAssessment.id}_${studentId}`);

    // 3. Susun data hasil koreksi siswa
    const rawSub: Submission = {
      id: `sub-${Date.now()}`,
      studentId: studentId,
      studentName: studentName,
      nisn: selectedStudent.nisn,
      kelas: selectedStudent.kelas,
      nilaiAkhir: gradingResult.nilaiAkhir,
      nilaiMurni: gradingResult.nilaiMurni || gradingResult.nilaiAkhir,
      aiDetected: gradingResult.aiDetected || false,
      aiProbability: gradingResult.aiProbability || 0,
      aiPenaltyPercent: gradingResult.aiPenaltyPercent || 0,
      aiPenaltyDeduction: gradingResult.aiPenaltyDeduction || 0,
      aiExplanation: gradingResult.aiExplanation,
      tuntas: gradingResult.tuntas,
      statusKoreksi: 'Sudah Dikoreksi (Gemini AI Vision)',
      waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
      capaianKompetensi: sanitizeCapaianKompetensi(
        gradingResult.capaianKompetensi,
        studentName,
        gradingResult.tuntas,
        activeAssessment.mataPelajaran,
        gradingResult.nilaiAkhir
      ),
      itemScores: gradingResult.itemScores,
      studentAnswers: gradingResult.studentAnswers,
      scannedImage: undefined, // Purge photo after successful evaluation
      scannedImages: [],      // Purge photo sheets to safeguard system storage
    };
    const newSub = ensureAuthenticProofSubmission(rawSub, activeAssessment.id, activeAssessment.guruPengampu || currentUser?.nama);

    const existingSubIdx = activeAssessment.submissions.findIndex(
      (s) => s.studentId === studentId || s.studentName === studentName
    );

    let updatedSubmissions = [...activeAssessment.submissions];
    if (existingSubIdx >= 0) {
      updatedSubmissions[existingSubIdx] = newSub;
    } else {
      updatedSubmissions.push(newSub);
    }

    const updatedAssessment: Assessment = {
      ...activeAssessment,
      submissions: updatedSubmissions,
    };

    // 4. Langsung otomatis pindah ke siswa berikutnya secara instan (responsif tanpa freeze)
    const currentIdx = classStudents.findIndex((s) => s.id === studentId);
    if (currentIdx >= 0 && currentIdx + 1 < classStudents.length) {
      const nextId = classStudents[currentIdx + 1].id;
      setSelectedStudentId(nextId);
      setCapturedImages([]);
      setGradingResult(null);

      setTimeout(() => {
        const el = document.getElementById(`std-item-${nextId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }

    // 5. Simpan ke database di latar belakang secara asinkron (optimistic update)
    try {
      await saveAssessment(updatedAssessment);
    } catch (err: any) {
      console.error('Grading save error:', err);
      showToast('Kendala Sinkronisasi', 'Gagal menyinkronkan data ke cloud: ' + err.message, 'error');
    }
  }, [activeAssessment, selectedStudent, gradingResult, capturedImages, classStudents, saveAssessment, removeDraft, showToast]);

  const handleSaveDraftSubmission = useCallback(async () => {
    if (!activeAssessment || !selectedStudent) return;

    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    setDraftSavedTime(timeStr);
    localStorage.setItem(`smantri_last_graded_student_${activeAssessment.id}`, selectedStudent.id);
    localStorage.setItem(`smantri_last_graded_assessment`, activeAssessment.id);

    // Notifikasi draf langsung muncul seketika tanpa delay
    showToast(
      'Draf Pekerjaan Tersimpan!',
      `Progres koreksi ${selectedStudent.nama} berhasil disimpan sebagai Draf pada pukul ${timeStr}.`,
      'info'
    );

    saveDraft(
      `grading_${activeAssessment.id}_${selectedStudent.id}`,
      `Draf: ${selectedStudent.nama} (${activeAssessment.mataPelajaran})`,
      {
        gradingResult,
        capturedImages,
        savedAt: timeStr,
      },
      true
    );

    const rawDraftSub: Submission = {
      id: existingSubmission?.id || `sub-draft-${Date.now()}`,
      studentId: selectedStudent.id,
      studentName: selectedStudent.nama,
      nisn: selectedStudent.nisn,
      kelas: selectedStudent.kelas,
      nilaiAkhir: gradingResult ? gradingResult.nilaiAkhir : (existingSubmission?.nilaiAkhir || 0),
      nilaiMurni: gradingResult ? (gradingResult.nilaiMurni || gradingResult.nilaiAkhir) : (existingSubmission?.nilaiMurni || 0),
      aiDetected: gradingResult?.aiDetected || false,
      aiProbability: gradingResult?.aiProbability || 0,
      aiPenaltyPercent: gradingResult?.aiPenaltyPercent || 0,
      aiPenaltyDeduction: gradingResult?.aiPenaltyDeduction || 0,
      aiExplanation: gradingResult?.aiExplanation || '',
      tuntas: gradingResult ? gradingResult.tuntas : false,
      statusKoreksi: 'Draf Koreksi Guru (Belum Selesai)',
      waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
      capaianKompetensi: sanitizeCapaianKompetensi(
        gradingResult?.capaianKompetensi || existingSubmission?.capaianKompetensi,
        selectedStudent.nama,
        gradingResult ? gradingResult.tuntas : (existingSubmission ? existingSubmission.tuntas : false),
        activeAssessment.mataPelajaran,
        gradingResult ? gradingResult.nilaiAkhir : (existingSubmission?.nilaiAkhir || 0)
      ),
      itemScores: gradingResult?.itemScores || [],
      studentAnswers: gradingResult?.studentAnswers || [],
      scannedImage: capturedImages[0] || existingSubmission?.scannedImage || undefined,
      scannedImages: capturedImages.length > 0 ? capturedImages : (existingSubmission?.scannedImages || (existingSubmission?.scannedImage ? [existingSubmission.scannedImage] : [])),
    };
    const draftSub = ensureAuthenticProofSubmission(rawDraftSub, activeAssessment.id, activeAssessment.guruPengampu || currentUser?.nama);

    const existingSubIdx = activeAssessment.submissions.findIndex(
      (s) => s.studentId === selectedStudent.id || s.studentName === selectedStudent.nama
    );

    let updatedSubmissions = [...activeAssessment.submissions];
    if (existingSubIdx >= 0) {
      updatedSubmissions[existingSubIdx] = draftSub;
    } else {
      updatedSubmissions.push(draftSub);
    }

    const updatedAssessment: Assessment = {
      ...activeAssessment,
      submissions: updatedSubmissions,
    };

    try {
      await saveAssessment(updatedAssessment);
    } catch (err: any) {
      console.error('Draft save error:', err);
    }
  }, [activeAssessment, selectedStudent, gradingResult, existingSubmission, capturedImages, saveAssessment, saveDraft, showToast]);

  const handleDeleteSubmission = useCallback(async (stdId: string) => {
    if (!activeAssessment || !selectedStudent) return;
    removeDraft(`grading_${activeAssessment.id}_${stdId}`);
    setGradingResult(null);
    setCapturedImages([]);
    await deleteSubmission(activeAssessment.id, stdId);
  }, [activeAssessment, selectedStudent, deleteSubmission, removeDraft]);

  const handleAssessmentChange = useCallback((newId: string) => {
    setSelectedAssessmentId(newId);
    if (state) {
      const target = state.assessments.find((a) => a.id === newId);
      if (target) {
        const stds = state.students.filter((s) => isClassMatch(target.kelas, s.kelas));
        if (stds.length > 0) setSelectedStudentId(stds[0].id);
      }
    }
    setCapturedImages([]);
    setGradingResult(null);
  }, [state, setSelectedAssessmentId]);

  if (!state || !currentUser) return null;

  if (!activeAssessment) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-xs">
        <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="font-bold text-base text-slate-800">Belum Ada Modul Asesmen</h3>
        <p className="text-xs text-slate-500 mt-1">Silakan buat modul asesmen ASTS atau ASAS terlebih dahulu.</p>
        <button
          onClick={() => setCurrentView('assessments')}
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold cursor-pointer"
        >
          Ke Bank Asesmen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Selector Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase ${
                activeAssessment.jenis === 'ASTS'
                  ? 'bg-indigo-100 text-indigo-800'
                  : 'bg-sky-100 text-sky-800'
              }`}
            >
              {activeAssessment.jenis}
            </span>
            <span className="font-bold text-xs text-slate-700">
              Kelas {activeAssessment.kelas} ({activeAssessment.fase})
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Pengoreksian Jawaban {activeAssessment.jenis}: {activeAssessment.mataPelajaran}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeAssessment.jenis === 'ASAS'
              ? 'Pemeriksaan teliti pilihan ganda (5 opsi: A, B, C, D, E) disandingkan dengan susunan kunci jawaban'
              : 'Pengenalan tulisan tangan ultra-tinggi untuk lembar ujian essay siswa secara real-time'}
          </p>
        </div>

        {/* Assessment Switcher */}
        <div className="flex items-center gap-2">
          <select
            value={activeAssessmentId}
            onChange={(e) => handleAssessmentChange(e.target.value)}
            className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden cursor-pointer"
          >
            {availableAssessments.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.jenis}] {a.mataPelajaran} - Kelas {a.kelas}
              </option>
            ))}
          </select>

          <button
            onClick={() => setCurrentView('raport-sts')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Rapor Bayangan STS</span>
          </button>
        </div>
      </div>

      {/* Resume / Progress Tracking Banner with Flexible Correction Options */}
      <div className="p-4 sm:p-5 rounded-3xl bg-slate-900 text-white shadow-lg border border-slate-800 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white">
                Progres Penilaian: {completedCount} dari {classStudents.length} Siswa Selesai ({classStudents.length > 0 ? Math.round((completedCount / classStudents.length) * 100) : 0}%)
              </span>
              {activeAssessment.jenis !== 'ASAS' && readyStudents.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  {readyStudents.length} Berkas Draf/Foto Siap
                </span>
              )}
              {activeAssessment.jenis === 'ASAS' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-400/20 text-sky-300 border border-sky-400/30">
                  ASAS PG: Kunci {validKeysCount}/{currentMaxQ} Terisi
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {activeAssessment.jenis === 'ASAS'
                ? 'Mode Koreksi ASAS: Kunci jawaban di atas disandingkan dengan jawaban 5 huruf siswa.'
                : t('grading.subtitle', 'Pilih mode koreksi: 1 Kelas Sekaligus, Beberapa Siswa Terpilih, atau 1 Siswa Perorangan.')}
            </p>
          </div>
        </div>

        {/* Flexible Correction Mode Triggers */}
        <div className="flex flex-wrap items-center gap-2 self-start xl:self-auto">
          {activeAssessment.jenis === 'ASAS' ? (
            <>
              {/* ASAS Trigger 1: 1 Kelas Sekaligus */}
              <button
                type="button"
                onClick={() => handleRunASASCorrection('class')}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all hover:scale-102"
                title="Koreksi seluruh siswa 1 kelas ini sekaligus"
              >
                <Users className="w-4 h-4 text-emerald-200" />
                <span>Koreksi 1 Kelas Sekaligus ({classStudents.length} Siswa)</span>
              </button>

              {/* ASAS Trigger 2: Semua Kelas yang Diajar */}
              {activeAssessmentClasses.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRunASASCorrection('all-classes')}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all hover:scale-102"
                  title="Koreksi seluruh rombel kelas yang diajar sekaligus"
                >
                  <Layers className="w-4 h-4 text-indigo-200" />
                  <span>Koreksi Semua Kelas ({allStudentsInAllClasses.length} Siswa)</span>
                </button>
              )}

              {/* ASAS Trigger 3: Siswa Terpilih */}
              {selectedStudentIdsForBatch.size > 0 && (
                <button
                  type="button"
                  onClick={() => handleRunASASCorrection('selected')}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all hover:scale-102 animate-pulse"
                >
                  <CheckSquare className="w-4 h-4 text-sky-200" />
                  <span>Koreksi {selectedStudentIdsForBatch.size} Siswa Terpilih</span>
                </button>
              )}

              {/* Tombol Optimalisasi Penyimpanan & Bersihkan Foto Selesai */}
              <button
                type="button"
                onClick={handleCleanAndFinalizeFinishedSubmissions}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold border border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-colors"
                title="Bersihkan berkas foto lembar jawaban yang sudah dinilai demi efisiensi memori & pastikan status draf menjadi resmi"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Optimalkan Penyimpanan</span>
              </button>

              {/* Lanjut Siswa Berikutnya */}
              <button
                type="button"
                onClick={handleJumpToNextUngraded}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>Siswa Berikutnya</span>
              </button>
            </>
          ) : (
            <>
              {/* 1. Koreksi 1 Kelas / Semua Kelas Sekaligus */}
              {completedCount < classStudents.length && (
                <button
                  type="button"
                  onClick={() => {
                    const uncompleted = classStudents.filter((s) => !studentPhotoStatus.get(s.id)?.isGraded || studentPhotoStatus.get(s.id)?.isDraft);
                    const studentsToGrade = uncompleted.length > 0 ? uncompleted : classStudents;
                    handleStartBatchGrading(studentsToGrade);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all hover:scale-102"
                  title={activeAssessmentClasses.length > 1 && selectedSubClassFilter === 'ALL'
                    ? "Koreksi seluruh lembar jawaban semua kelas sekaligus"
                    : "Koreksi seluruh lembar jawaban satu kelas sekaligus"}
                >
                  <Users className="w-4 h-4 text-emerald-200" />
                  <span>
                    {activeAssessmentClasses.length > 1 && selectedSubClassFilter === 'ALL'
                      ? 'Koreksi Semua Kelas Sekaligus'
                      : 'Koreksi 1 Kelas Sekaligus'} ({classStudents.length - completedCount} Siswa Belum Dinilai)
                  </span>
                </button>
              )}

              {/* 2. Koreksi Beberapa Siswa Terpilih (jika ada checklist yang dicentang) */}
              {selectedStudentIdsForBatch.size > 0 && completedCount < classStudents.length && (
                <button
                  type="button"
                  onClick={() => {
                    const targetSelected = classStudents.filter((s) => selectedStudentIdsForBatch.has(s.id));
                    handleStartBatchGrading(targetSelected);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl text-xs font-extrabold shadow-md cursor-pointer transition-all hover:scale-102 animate-pulse"
                  title="Koreksi hanya siswa-siswa yang sedang dicentang"
                >
                  <CheckSquare className="w-4 h-4 text-indigo-200" />
                  <span>{t('grading.btn_selected', 'Koreksi Siswa Terpilih')} ({selectedStudentIdsForBatch.size})</span>
                </button>
              )}

              {/* Tombol Optimalisasi Penyimpanan & Bersihkan Foto Selesai */}
              <button
                type="button"
                onClick={handleCleanAndFinalizeFinishedSubmissions}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl text-xs font-bold border border-slate-700 hover:border-emerald-500/50 cursor-pointer transition-colors"
                title="Bersihkan berkas foto lembar jawaban yang sudah dinilai demi efisiensi memori & pastikan status draf menjadi resmi"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Optimalkan Penyimpanan</span>
              </button>

              {/* 3. Lanjut ke Siswa Berikutnya */}
              <button
                type="button"
                onClick={handleJumpToNextUngraded}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer transition-colors"
              >
                <ArrowRight className="w-3.5 h-3.5" />
                <span>{t('grading.next_student', 'Siswa Berikutnya')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Keterangan Badge Indikator Rentang KKTP */}
      <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-2xs space-y-2">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Award className="w-4 h-4 text-indigo-600" />
          <span>Panduan Rentang Nilai KKTP & Formula Kalimat Capaian Kompetensi:</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5" title="0 - 60: Peserta didik kurang mampu ...........................">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>0 - 60 : Peserta didik kurang mampu ...........................</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5" title="61 - 70: Peserta didik cukup mampu ...........................">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>61 - 70 : Peserta didik cukup mampu ...........................</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5" title="71 - 80: Peserta didik mampu ...........................">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>71 - 80 : Peserta didik mampu ...........................</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5" title="81 - 100: Peserta didik sangat mampu ...........................">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>81 - 100 : Peserta didik sangat mampu ...........................</span>
          </span>
        </div>
      </div>

      {/* Main 2-Column Workstation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Student Roster List with Tabs & Checkboxes (4 cols) */}
        <div className="lg:col-span-4 rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
              <span>Daftar Siswa Kelas {activeAssessment.kelas}</span>
              <span className="text-slate-500 font-normal">({classStudents.length})</span>
            </h3>
            <div className="flex items-center gap-1 text-[10px] font-bold">
              <span className="text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                {completedCount} Selesai
              </span>
              {draftCount > 0 && (
                <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                  {draftCount} Draf
                </span>
              )}
            </div>
          </div>

          {/* Sub-Class Division Tabs for Multi-Class Assessment */}
          {activeAssessmentClasses.length > 1 && (
            <div className="p-2.5 border-b border-indigo-100 bg-indigo-50/70 space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px] font-bold text-indigo-950">
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Bagi Per Kelas ({activeAssessmentClasses.length} Kelas):</span>
                </span>
                <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-indigo-200 text-indigo-900 font-extrabold">
                  Multi-Kelas
                </span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-thin">
                <button
                  type="button"
                  onClick={() => setSelectedSubClassFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                    selectedSubClassFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Semua Kelas ({activeAssessment.kelas})
                </button>
                {activeAssessmentClasses.map((subCls) => (
                  <button
                    key={subCls}
                    type="button"
                    onClick={() => setSelectedSubClassFilter(subCls)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ${
                      selectedSubClassFilter === subCls
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    Kelas {subCls}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter Tabs for Easy Triage */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-1 overflow-x-auto text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setStudentFilterTab('all')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                studentFilterTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Semua ({classStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setStudentFilterTab('ready')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                studentFilterTab === 'ready'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Draf/Foto Siap ({readyStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setStudentFilterTab('ungraded')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                studentFilterTab === 'ungraded'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Belum ({ungradedStudents.length})
            </button>
            <button
              type="button"
              onClick={() => setStudentFilterTab('completed')}
              className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer shrink-0 ${
                studentFilterTab === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-200/60'
              }`}
            >
              Selesai ({completedCount})
            </button>
          </div>

          {/* Search Box & Quick Checklist Controls */}
          <div className="p-3 border-b border-slate-100 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Cari nama atau NISN siswa..."
                className="w-full pl-8 pr-3 py-1.5 bg-slate-100 border-none rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <label className="flex items-center gap-1.5 font-bold text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={filteredStudents.length > 0 && selectedStudentIdsForBatch.size === filteredStudents.length}
                  onChange={() => handleSelectAllFiltered(filteredStudents)}
                  className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                />
                <span>Pilih Semua ({filteredStudents.length})</span>
              </label>

              {readyStudents.length > 0 && (
                <button
                  type="button"
                  onClick={handleSelectAllReady}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                >
                  Centang Semua Foto Siap ({readyStudents.length})
                </button>
              )}
            </div>

            {/* Quick Batch Bar when items are selected */}
            {selectedStudentIdsForBatch.size > 0 && (
              <div className="p-2 px-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-900">
                  {selectedStudentIdsForBatch.size} Siswa Dicentang
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIdsForBatch(new Set())}
                  className="text-[11px] font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Batalkan Pilihan
                </button>
              </div>
            )}
          </div>

          <div className="max-h-[550px] overflow-y-auto divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                Tidak ada siswa yang cocok dengan filter / pencarian.
              </div>
            ) : (
              filteredStudents.map((std, idx) => (
                <StudentListItem
                  key={std.id}
                  student={std}
                  index={idx}
                  isSelected={std.id === selectedStudentId}
                  isChecked={selectedStudentIdsForBatch.has(std.id)}
                  hasPhotos={studentPhotoStatus.get(std.id)?.hasPhotos || false}
                  photoCount={studentPhotoStatus.get(std.id)?.count || 0}
                  submission={submissionsMap.get(std.id) || submissionsMap.get(std.nama)}
                  onSelect={handleSelectStudent}
                  onToggleCheck={handleToggleCheckStudent}
                  onOpenProof={(id) => {
                    setSelectedStudentId(id);
                    setProofStudentId(id);
                    setIsProofModalOpen(true);
                  }}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Column: Scan & Evaluation Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Active Student Target Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Target Pemeriksaan Lembar Ujian
                </span>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {selectedStudent?.nama || 'Pilih Siswa'}
                </h3>
                <p className="text-xs text-slate-500">
                  No. Absen: {selectedStudent?.noUrut || '-'} • Kelas: {selectedStudent?.kelas || '-'}
                </p>
              </div>

              {existingSubmission && (
                <div className="flex items-center gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-bold uppercase block">
                      {existingSubmission.statusKoreksi?.includes('Draf') || existingSubmission.statusKoreksi?.includes('Draft')
                        ? 'Draf Tersimpan'
                        : 'Nilai Tersimpan'}
                    </span>
                    <span className="text-2xl font-black text-indigo-700">{existingSubmission.nilaiAkhir}</span>
                    <span className="text-[10px] text-slate-400 block">{existingSubmission.waktuKoreksi}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setProofStudentId(selectedStudent?.id || null);
                      setIsProofModalOpen(true);
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    title="Buka Dokumen Resmi Bukti Otentik Penilaian Siswa"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span className="hidden sm:inline">Bukti Otentik</span>
                  </button>

                  <button
                    onClick={() => selectedStudent && handleDeleteSubmission(selectedStudent.id)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
                    title="Hapus Nilai Siswa Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Workstation Body: Dedicated MCQ for ASAS vs Photo Upload & AI Vision for ASTS */}
            {activeAssessment.jenis === 'ASAS' ? (
              /* DEDICATED ASAS MCQ WORKSTATION */
              <div className="mt-5 space-y-6">
                {/* 1. Header & Quick Status */}
                <div className="p-4 rounded-2xl bg-sky-50/90 border border-sky-200 text-sky-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <ListChecks className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-xs">Pemeriksaan Pilihan Ganda ASAS: {activeAssessment.mataPelajaran}</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-200 text-sky-900 border border-sky-300">
                          {currentMaxQ} Butir Soal (Opsi A - E)
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Kunci Terisi: {validKeysCount}/{currentMaxQ}
                        </span>
                      </div>
                      <p className="text-[11px] text-sky-800/90 mt-0.5">
                        Susunan kunci jawaban di atas disandingkan langsung dengan 5 huruf jawaban (A, B, C, D, E) siswa: <strong>{selectedStudent?.nama || 'Siswa'}</strong>. Tanpa upload lembar & tanpa penalti AI.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                    <button
                      type="button"
                      onClick={() => setShowAsasDraftModal(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                      title="Lihat & edit butir teks soal draf lengkap"
                    >
                      <Eye className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Edit Soal & Kunci Draf</span>
                    </button>
                  </div>
                </div>

                {/* 2. BAGIAN ATAS: SUSUNAN KUNCI JAWABAN RESMI ASAS */}
                <div className="p-4.5 rounded-2xl bg-indigo-50/70 border-2 border-indigo-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                      <h4 className="font-extrabold text-xs text-indigo-950 uppercase tracking-wide">
                        1. Susunan Kunci Jawaban Resmi ASAS ({currentMaxQ} Butir Soal)
                      </h4>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                        validKeysCount === currentMaxQ
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {validKeysCount === currentMaxQ ? 'Lengkap 100%' : `${validKeysCount}/${currentMaxQ} Terisi`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-[11px] text-indigo-800 font-semibold hidden md:inline">Kunci Massal:</span>
                      <input
                        type="text"
                        maxLength={currentMaxQ}
                        value={tempAsasKeyInput || (activeAssessment.mcqQuestions || []).map((q) => q.kunci || 'A').join('')}
                        onChange={(e) => setTempAsasKeyInput(e.target.value.toUpperCase().replace(/[^A-E]/g, '').substring(0, currentMaxQ))}
                        placeholder={`Ketik urutan A-E (Max ${currentMaxQ})`}
                        className="w-48 sm:w-60 p-1.5 bg-white border border-indigo-300 rounded-xl font-mono font-extrabold text-xs uppercase tracking-widest text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const str = tempAsasKeyInput || (activeAssessment.mcqQuestions || []).map((q) => q.kunci || 'A').join('');
                          handleSaveASASKeyString(str);
                          setTempAsasKeyInput('');
                          showToast('Kunci Tersimpan', `Kunci jawaban massal (${str.length} butir) berhasil diperbarui.`, 'success');
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-2xs shrink-0"
                      >
                        Simpan Kunci
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Scrollable / Flow of Answer Keys */}
                  <div className="overflow-x-auto p-2 bg-white/90 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-1.5 min-w-max">
                      {Array.from({ length: currentMaxQ }, (_, idx) => {
                        const qNum = idx + 1;
                        const kChar = getMCQKey(qNum);
                        return (
                          <div
                            key={qNum}
                            className="flex flex-col items-center justify-center p-1.5 bg-indigo-50/50 hover:bg-indigo-100 rounded-lg border border-indigo-200/70 min-w-10 text-center transition-colors"
                            title={`Soal No. ${qNum} - Kunci: ${kChar}`}
                          >
                            <span className="text-[9px] font-bold text-slate-500">#{qNum}</span>
                            <span className="w-6 h-6 rounded-md bg-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-2xs mt-0.5">
                              {kChar}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-[10px] text-indigo-800 leading-relaxed italic">
                    * Kunci jawaban di atas menjadi patokan penilaian otomatis bagi setiap siswa pada modul ini.
                  </p>
                </div>

                {/* 3. BAGIAN TENGAH (DISANDINGKAN): SUSUNAN JAWABAN PILIHAN GANDA SISWA */}
                <div className="p-4.5 rounded-2xl bg-white border-2 border-slate-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                      <div>
                        <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wide flex items-center gap-2">
                          <span>2. Susunan Jawaban Pilihan Ganda Siswa:</span>
                          <span className="text-indigo-700 font-black">{selectedStudent?.nama || 'Pilih Siswa'}</span>
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Kelas {selectedStudent?.kelas || '-'} • No. Absen: {selectedStudent?.noUrut || '-'} • Diurutkan hingga pas {currentMaxQ} butir soal
                        </span>
                      </div>
                    </div>

                    {/* Progress summary stats */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-1 rounded-xl text-xs font-extrabold border ${
                        activeStudentStats.filled === currentMaxQ
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        Terisi: {activeStudentStats.filled} / {currentMaxQ} {activeStudentStats.filled === currentMaxQ ? '(Pas/Lengkap)' : ''}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Cocok: {activeStudentStats.correct}
                      </span>
                      <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                        Beda: {activeStudentStats.wrong}
                      </span>
                    </div>
                  </div>

                  {/* Kotak Utama: Susunan Jawaban Siswa Berbentuk Diketik Biasa (ABCDEABCDE...) */}
                  <div className="p-4 bg-gradient-to-br from-slate-50 to-indigo-50/40 rounded-2xl border-2 border-indigo-200/90 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-indigo-100">
                      <div>
                        <label className="text-xs font-black text-slate-900 flex items-center gap-2">
                          <ListChecks className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span>Susunan Jawaban Siswa (Diketik Biasa: ABCDEABCDE...):</span>
                        </label>
                        <p className="text-[11px] text-slate-700 mt-0.5 font-semibold">
                          Susunan jawaban siswa berbentuk diketik biasa, misalnya: <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-950 font-black rounded font-mono border border-indigo-200">ABCDEABCDE....</span> sampai dengan batas jumlah soal yang ditentukan ({currentMaxQ} butir soal).
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedStudent) return;
                            const pattern = 'ABCDE';
                            let str = '';
                            while (str.length < currentMaxQ) {
                              str += pattern;
                            }
                            str = str.substring(0, currentMaxQ);
                            handleSetStudentAnswerString(selectedStudent.id, str);
                            showToast('Pola ABCDE Diterapkan', `Susunan jawaban siswa terisi pola ABCDE berulang sampai pas ${currentMaxQ} butir soal.`, 'info');
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
                          title={`Isi otomatis contoh pola berulang ABCDEABCDE... sampai dengan batas ${currentMaxQ} soal`}
                        >
                          Isi Pola ABCDE... ({currentMaxQ} Soal)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedStudent) return;
                            const keyString = Array.from({ length: currentMaxQ }, (_, idx) => getMCQKey(idx + 1)).join('');
                            handleSetStudentAnswerString(selectedStudent.id, keyString);
                            showToast('Disalin dari Kunci', 'Seluruh jawaban siswa diisi sesuai kunci jawaban (100% Cocok).', 'info');
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 border border-indigo-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
                        >
                          Salin dari Kunci (100%)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!selectedStudent) return;
                            handleSetStudentAnswerString(selectedStudent.id, '');
                            showToast('Dibersihkan', 'Jawaban siswa dikosongkan.', 'info');
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg cursor-pointer transition-colors shadow-2xs"
                        >
                          Kosongkan
                        </button>
                      </div>
                    </div>

                    {/* Input Field Diketik Biasa */}
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={currentMaxQ}
                        value={activeStudentAnswerString}
                        onChange={(e) => {
                          if (!selectedStudent) return;
                          handleSetStudentAnswerString(selectedStudent.id, e.target.value);
                        }}
                        placeholder={`Contoh: ABCDEABCDE... (Diketik biasa tanpa spasi, otomatis pas berhenti di batas ${currentMaxQ} butir)`}
                        className="w-full p-3 sm:p-3.5 bg-white border-2 border-indigo-500 focus:border-indigo-600 rounded-xl font-mono font-black text-sm sm:text-base uppercase tracking-widest text-slate-900 focus:ring-4 focus:ring-indigo-500/20 focus:outline-hidden shadow-inner"
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-black tracking-normal border ${
                          activeStudentAnswerString.length === currentMaxQ
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300'
                        }`}>
                          {activeStudentAnswerString.length} / {currentMaxQ} {activeStudentAnswerString.length === currentMaxQ ? 'Pas Batas' : `(Sisa ${currentMaxQ - activeStudentAnswerString.length})`}
                        </span>
                      </div>
                    </div>

                    {/* Strip Sandingan Langsung Huruf Demi Huruf (Kunci di Atas, Siswa di Bawah) */}
                    <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-extrabold text-slate-700">
                        <span>Penyandingan Langsung: Kunci (Atas) vs Ketikan Siswa (Bawah)</span>
                        <span className="text-[10px] text-slate-500 font-normal">Geser ke kanan untuk melihat nomor berikutnya</span>
                      </div>

                      <div className="overflow-x-auto p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-1 min-w-max">
                          {Array.from({ length: currentMaxQ }, (_, idx) => {
                            const qNum = idx + 1;
                            const kChar = getMCQKey(qNum);
                            const sChar = activeStudentAnswersArray[idx] || '';
                            const isAnswered = sChar !== '' && sChar !== '-';
                            const isMatch = isAnswered && sChar === kChar;

                            return (
                              <div
                                key={qNum}
                                className={`flex flex-col items-center justify-center p-1 rounded-md border min-w-8 text-center transition-all ${
                                  !isAnswered
                                    ? 'bg-white border-slate-200 text-slate-400'
                                    : isMatch
                                    ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold'
                                    : 'bg-rose-50 border-rose-400 text-rose-950 font-bold'
                                }`}
                                title={`No. ${qNum} | Kunci: ${kChar} | Siswa: ${sChar || 'Belum diisi'}`}
                              >
                                <span className="text-[8px] font-mono font-bold text-slate-400">#{qNum}</span>
                                <span className="text-[10px] font-black text-indigo-700 bg-indigo-100/80 px-1 rounded my-0.5">
                                  {kChar}
                                </span>
                                <span className={`text-xs font-black px-1 rounded ${
                                  !isAnswered
                                    ? 'text-slate-300'
                                    : isMatch
                                    ? 'text-emerald-700 bg-emerald-100'
                                    : 'text-rose-700 bg-rose-100'
                                }`}>
                                  {sChar || '-'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sandingan Grid: Question by Question (Answer Key on Top, 5 Letters ABCDE below) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Rincian Butir Soal 1 s.d {currentMaxQ} (Disandingkan dengan Kunci):</span>
                      <span className="text-[11px] text-slate-500 font-normal">Klik huruf A, B, C, D, E untuk memilih/mengubah</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-80 overflow-y-auto p-2 bg-slate-50/70 rounded-2xl border border-slate-200">
                      {Array.from({ length: currentMaxQ }, (_, idx) => {
                        const qNum = idx + 1;
                        const kChar = getMCQKey(qNum);
                        const sAns = activeStudentAnswersArray[idx] || '';
                        const isAnswered = sAns !== '' && sAns !== '-';
                        const isMatch = isAnswered && sAns === kChar;

                        return (
                          <div
                            key={qNum}
                            className={`p-2.5 rounded-xl border text-xs space-y-2 transition-colors ${
                              !isAnswered
                                ? 'bg-white border-slate-200'
                                : isMatch
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 shadow-2xs'
                                : 'bg-rose-50/70 border-rose-300 text-rose-950 shadow-2xs'
                            }`}
                          >
                            {/* Question Header & Key */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-current/10">
                              <span className="font-extrabold text-slate-800">No. {qNum}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] font-bold text-slate-500">Kunci:</span>
                                <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white font-black text-[11px]">
                                  {kChar}
                                </span>
                              </div>
                            </div>

                            {/* 5 Letters ABCDE Options for Student */}
                            <div className="flex items-center justify-between gap-1">
                              {['A', 'B', 'C', 'D', 'E'].map((opt) => {
                                const isSelected = sAns === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                      if (!selectedStudent) return;
                                      handleSetStudentAnswer(selectedStudent.id, qNum, opt);
                                    }}
                                    className={`flex-1 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                                      isSelected
                                        ? opt === kChar
                                          ? 'bg-emerald-600 text-white shadow-xs scale-105'
                                          : 'bg-rose-600 text-white shadow-xs scale-105'
                                        : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Status label */}
                            <div className="flex items-center justify-between text-[10px] font-bold pt-0.5">
                              <span>Pilihan: {sAns || '-'}</span>
                              {!isAnswered ? (
                                <span className="text-slate-400">Belum diisi</span>
                              ) : isMatch ? (
                                <span className="text-emerald-700 flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> Cocok
                                </span>
                              ) : (
                                <span className="text-rose-700 flex items-center gap-0.5">
                                  <X className="w-3 h-3" /> Salah
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4. DYNAMIC CORRECTION ACTION BAR: TOMBOL KOREKSI YANG FLEKSIBEL & BERGANTI */}
                <div className="p-5 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-lg space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-400" />
                        <span>Eksekusi Koreksi Pilihan Ganda ASAS Teliti & Otomatis</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Sistem mendeteksi jawaban secara presisi, menghitung skor murni (0-100), KKTP, dan capaian kompetensi resmi ke daftar nilai.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentView('student-grades')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                        title="Buka menu Daftar Nilai Siswa untuk melihat rekapitulasi ASAS per kelas"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Ke Menu Daftar Nilai Siswa</span>
                      </button>
                    </div>
                  </div>

                  {/* Adaptive Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800">
                    {/* Button 1: Koreksi Siswa Ini */}
                    <button
                      type="button"
                      onClick={() => handleRunASASCorrection('single')}
                      disabled={isGrading || !selectedStudent}
                      className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer hover:scale-102 disabled:opacity-50"
                    >
                      {isGrading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Mengevaluasi Jawaban Siswa...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                          <span>Koreksi Siswa Ini ({selectedStudent?.nama || 'Siswa'})</span>
                        </>
                      )}
                    </button>

                    {/* Button 2: Koreksi Siswa Terpilih (jika ada checklist) */}
                    {selectedStudentIdsForBatch.size > 0 && (
                      <button
                        type="button"
                        onClick={() => handleRunASASCorrection('selected')}
                        disabled={isGrading}
                        className="flex-1 min-w-[200px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white font-extrabold text-xs shadow-md shadow-sky-600/30 transition-all cursor-pointer hover:scale-102 animate-pulse disabled:opacity-50"
                      >
                        <CheckSquare className="w-4 h-4 text-sky-200" />
                        <span>Koreksi {selectedStudentIdsForBatch.size} Siswa Terpilih</span>
                      </button>
                    )}

                    {/* Button 3: Koreksi 1 Kelas Sekaligus */}
                    <button
                      type="button"
                      onClick={() => handleRunASASCorrection('class')}
                      disabled={isGrading}
                      className="flex-1 min-w-[220px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer hover:scale-102 disabled:opacity-50"
                    >
                      <Users className="w-4 h-4 text-indigo-200" />
                      <span>Koreksi 1 Kelas Sekaligus ({classStudents.length} Siswa)</span>
                    </button>

                    {/* Button 4: Koreksi Semua Kelas yang Diajar (jika multi-rombel) */}
                    {activeAssessmentClasses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRunASASCorrection('all-classes')}
                        disabled={isGrading}
                        className="flex-1 min-w-[220px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs shadow-md shadow-purple-600/30 transition-all cursor-pointer hover:scale-102 disabled:opacity-50"
                        title={`Koreksi seluruh siswa pada rombel: ${activeAssessmentClasses.join(', ')}`}
                      >
                        <Layers className="w-4 h-4 text-purple-200" />
                        <span>Koreksi Semua Kelas yang Diajar ({allStudentsInAllClasses.length} Siswa)</span>
                      </button>
                    )}

                    {/* Button 5: Siswa Berikutnya */}
                    <button
                      type="button"
                      onClick={handleJumpToNextUngraded}
                      className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors cursor-pointer"
                    >
                      <span>Siswa Berikutnya</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 5. TABEL REKAPITULASI HASIL KOREKSI ASAS KELAS INI */}
                <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                        <Award className="w-4 h-4 text-indigo-600" />
                        <span>Daftar Nilai ASAS Siswa Kelas {activeAssessment.kelas} ({activeAssessment.mataPelajaran})</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Hasil koreksi otomatis tersimpan dan siap dipublikasikan ke daftar nilai serta laporan akhir semester.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentView('student-grades')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka Roster Lengkap di Daftar Nilai</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200">
                          <th className="p-3 w-12 text-center">No</th>
                          <th className="p-3">Nama Siswa</th>
                          <th className="p-3 text-center">Susunan Jawaban Siswa (Diketik Biasa)</th>
                          <th className="p-3 w-24 text-center">Nilai ASAS</th>
                          <th className="p-3 w-28 text-center">Status KKTP</th>
                          <th className="p-3">Capaian Kompetensi</th>
                          <th className="p-3 w-24 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {classStudents.map((std, idx) => {
                          const sub = submissionsMap.get(std.id) || submissionsMap.get(std.nama);
                          const isGraded = !!(sub?.statusKoreksi?.startsWith('Sudah Dikoreksi') || sub?.statusKoreksi?.startsWith('Sudah Diverifikasi'));
                          const stdAns = getStudentAnswers(std.id, currentMaxQ);
                          const filledCount = stdAns.filter((a) => a && a !== '-').length;
                          const typedAnsString = stdAns.join('');

                          return (
                            <tr
                              key={std.id}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                std.id === selectedStudentId ? 'bg-indigo-50/50 font-semibold' : ''
                              }`}
                            >
                              <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                                {std.noUrut || idx + 1}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{std.nama}</div>
                                <div className="text-[10px] text-slate-400">NISN: {std.nisn || '-'}</div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="font-mono text-xs font-black text-indigo-900 tracking-wider">
                                  {typedAnsString ? (
                                    <span className="bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">{typedAnsString}</span>
                                  ) : (
                                    <span className="text-slate-400 italic font-sans font-normal text-[11px]">Belum diketik</span>
                                  )}
                                </div>
                                <div className="mt-1">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                                    filledCount === currentMaxQ
                                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                      : filledCount > 0
                                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                                      : 'bg-slate-50 text-slate-500 border-slate-200'
                                  }`}>
                                    {filledCount}/{currentMaxQ} Soal {filledCount === currentMaxQ ? 'Pas' : ''}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                {isGraded && sub ? (
                                  <span className={`px-2.5 py-1 rounded-xl text-xs font-black text-white ${
                                    sub.nilaiAkhir >= (activeAssessment.kktp || 75)
                                      ? 'bg-emerald-600 shadow-2xs'
                                      : 'bg-rose-600 shadow-2xs'
                                  }`}>
                                    {sub.nilaiAkhir}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic text-[11px]">-</span>
                                )}
                              </td>
                              <td className="p-3 text-center">
                                {isGraded && sub ? (
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                                    sub.tuntas
                                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                      : 'bg-rose-100 text-rose-800 border-rose-200'
                                  }`}>
                                    {sub.tuntas ? 'Tuntas' : 'Remidi'}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 text-[10px]">Belum Dikoreksi</span>
                                )}
                              </td>
                              <td className="p-3 text-[11px] text-slate-600 max-w-xs truncate">
                                {sub?.capaianKompetensi || '-'}
                              </td>
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleSelectStudent(std.id)}
                                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 cursor-pointer transition-colors"
                                >
                                  Pilih
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              /* Photo Upload & Vision Capture Area for ASTS (Essay) */
              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Photo Input Area */}
                <div className="flex flex-col justify-between p-5 border-2 border-dashed border-indigo-200 rounded-3xl bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors">
                  {/* Header Information: Device Status */}
                  <div className="w-full pb-3 border-b border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-4 h-4 text-indigo-600" />
                      <span className="text-xs font-bold text-slate-800">
                        {isAndroidOrTablet ? 'Mode HP Android & Tablet' : 'Mode Pantau Progress Lembar Jawaban'}
                      </span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isAndroidOrTablet
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                    }`}>
                      {isAndroidOrTablet ? 'Perangkat HP / Tablet Aktif' : 'Prioritas HP Android & Tablet'}
                    </span>
                  </div>

                  {/* Received Images Status / Multi-Sheet Grid */}
                  {capturedImages.length > 0 ? (
                    <div className="w-full my-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Camera className="w-4 h-4 text-emerald-600" />
                          <span>{capturedImages.length} Lembar Jawaban Siswa Siap Dikoreksi</span>
                        </span>
                        <button
                          onClick={() => setCapturedImages([])}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 cursor-pointer"
                        >
                          Hapus Semua
                        </button>
                      </div>

                      {/* Thumbnail Grid for Multi-Page Answer Sheets */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto p-1 bg-white/70 rounded-2xl border border-indigo-100">
                        {capturedImages.map((imgUrl, idx) => (
                          <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-xs bg-white">
                            <img
                              src={imgUrl}
                              alt={`Lembar ${idx + 1}`}
                              onClick={() => setPreviewModalImage(imgUrl)}
                              className="h-28 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              title="Klik untuk memperbesar foto lembar jawaban"
                            />
                            <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-white font-extrabold text-[9px] pointer-events-none">
                              Lembar {idx + 1}
                            </span>
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                              <span className="p-1 bg-slate-900/80 text-white rounded-md text-[9px] font-bold">
                                Perbesar
                              </span>
                            </div>
                            <div className="absolute top-1 right-1 flex items-center gap-1 z-10">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadImageFile(imgUrl, `Lembar_${idx + 1}`);
                                }}
                                className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs cursor-pointer opacity-90 transition-opacity"
                                title="Unduh foto lembar ini"
                              >
                                <Download className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveImage(idx);
                                }}
                                className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer opacity-90 transition-opacity"
                                title="Hapus lembar ini"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add More Sheets from HP Android / Tablet Button */}
                      <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-indigo-100">
                        <button
                          type="button"
                          onClick={() => setIsWebrtcModalOpen(true)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                          <span>+ Foto Lembar Tambahan via HP Android</span>
                        </button>

                        {/* Direct camera if on mobile tablet */}
                        {isAndroidOrTablet && (
                          <label className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors">
                            <Camera className="w-3.5 h-3.5" />
                            <span>Kamera HP Ini</span>
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        )}

                        {/* Laptop direct upload buttons if checkbox is checked */}
                        {(!isAndroidOrTablet && allowLaptopUpload) && (
                          <label className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 text-indigo-600" />
                            <span>+ Tambah dari File Laptop</span>
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  ) : (existingSubmission && (
                      existingSubmission.statusKoreksi?.startsWith('Sudah Dikoreksi') ||
                      existingSubmission.statusKoreksi?.startsWith('Sudah Diverifikasi') ||
                      (existingSubmission.nilaiAkhir !== undefined && existingSubmission.nilaiAkhir > 0 && !existingSubmission.statusKoreksi?.includes('Draf'))
                    )) ? (
                    /* Pemberitahuan Jawaban Siswa Sudah Dikoreksi & Dinilai (Foto Dibersihkan Demi Kapasitas Penyimpanan) */
                    <div className="my-3 p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-white rounded-2xl border-2 border-emerald-300 shadow-sm space-y-3.5 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-600/30">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-extrabold text-sm text-emerald-950">
                              Jawaban Siswa Sudah Dikoreksi & Dinilai
                            </h4>
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-2xs">
                              Nilai: {existingSubmission.nilaiAkhir}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-800 font-medium mt-0.5 flex items-center gap-1.5">
                            <span className={`inline-block w-2 h-2 rounded-full ${existingSubmission.tuntas ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                            <span>{existingSubmission.tuntas ? 'Tuntas Standar KKTP' : 'Perlu Bimbingan / Remidi'}</span>
                            <span className="text-emerald-400">•</span>
                            <span className="text-slate-600 truncate">{existingSubmission.statusKoreksi}</span>
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 bg-white/95 rounded-xl border border-emerald-200/80 text-xs text-slate-700 leading-relaxed flex items-start gap-2.5 shadow-2xs">
                        <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-emerald-900 block mb-0.5">Optimalisasi Kapasitas Penyimpanan:</span>
                          Berkas foto lembar jawaban dari kamera HP telah dibersihkan secara otomatis setelah proses penilaian selesai, untuk mencegah memori penuh dan memastikan sistem tetap berjalan cepat tanpa error. Seluruh rincian jawaban, skor butir, dan capaian kompetensi siswa telah tersimpan permanen di <strong>Rapor Bayangan</strong> dan <strong>Daftar Nilai</strong>.
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-100 text-[11px] text-slate-500">
                        <span>Waktu Penilaian: {existingSubmission.waktuKoreksi || 'Tercatat Sah'}</span>
                        <button
                          type="button"
                          onClick={() => setIsWebrtcModalOpen(true)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-bold border border-indigo-200 transition-colors cursor-pointer"
                          title="Potret ulang jika ingin mengubah atau mengoreksi ulang jawaban siswa ini"
                        >
                          <Camera className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Ambil Foto Baru (Jika Ingin Koreksi Ulang)</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* No Images Yet Area (Ungraded) */
                    <div className="my-3 space-y-3 text-center">
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                        <Smartphone className="w-7 h-7" />
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-slate-900">
                          {isAndroidOrTablet
                            ? 'Potret Lembar Jawaban Siswa (Kamera HP Android & Tablet)'
                            : 'Pantau Progress Unggah Lembar Jawaban dari HP Android & Tablet'}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                          {isAndroidOrTablet
                            ? 'Gunakan kamera HP Android atau Tablet Anda untuk memotret lembar jawaban. Satu siswa dapat memiliki lebih dari 1 lembar foto.'
                            : 'Pemotretan lembar jawaban diprioritaskan menggunakan kamera HP Android & Tablet (Semua merk: Samsung, Xiaomi, Oppo, Vivo, Realme, Infinix, Tecno, Poco, dll., dan semua spesifikasi). Layar laptop ini untuk memantau progress foto secara langsung.'}
                        </p>
                      </div>

                      {/* Action buttons depending on device */}
                      <div className="flex flex-wrap justify-center gap-2 pt-1">
                        {isAndroidOrTablet ? (
                          <>
                            <label className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-colors">
                              <Camera className="w-3.5 h-3.5" />
                              <span>Buka Kamera HP Android</span>
                              <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>

                            <label className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors">
                              <Upload className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Pilih dari Galeri HP</span>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                                className="hidden"
                              />
                            </label>
                          </>
                        ) : (
                          <div className="w-full space-y-2">
                            <button
                              type="button"
                              onClick={() => setIsWebrtcModalOpen(true)}
                              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold shadow-md cursor-pointer transition-all hover:scale-102"
                            >
                              <Camera className="w-4 h-4 text-indigo-200" />
                              <span>Buka QR Code: Hubungkan HP Android / Tablet</span>
                            </button>

                            {allowLaptopUpload && (
                              <div className="pt-2">
                                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors">
                                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Pilih Berkas Foto dari Laptop (Bisa Lebih Dari 1 Lembar)</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="hidden"
                                  />
                                </label>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Laptop Checkbox Toggle Option (Khusus Laptop / PC) */}
                  {!isAndroidOrTablet && (
                    <div className="mt-3 p-3 bg-amber-50/90 border border-amber-200/90 rounded-2xl text-left">
                      <label className="flex items-start gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          id="toggleLaptopUploadOption"
                          checked={allowLaptopUpload}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setAllowLaptopUpload(val);
                            localStorage.setItem('smantri_allow_laptop_upload', val ? 'true' : 'false');
                          }}
                          className="w-4 h-4 mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                        />
                        <div>
                          <span className="font-bold text-amber-950 text-xs block">
                            Centang opsi unggah file foto dari laptop
                          </span>
                          <span className="text-[11px] text-amber-800 block mt-0.5 leading-relaxed">
                            Foto lembar jawaban siswa diprioritaskan menggunakan HP Android & Tablet. Centang opsi ini jika Anda ingin mengaktifkan tombol unggah berkas foto langsung dari penyimpanan lokal laptop/komputer ini.
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                </div>

                {/* Quick AI Trigger & Dimension Info */}
                <div className="flex flex-col justify-between p-5 bg-slate-900 text-white rounded-3xl border border-slate-800 shadow-md">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-amber-400" />
                        <h4 className="font-bold text-xs">
                          Deteksi Jawaban AI (ChatGPT / Gemini)
                        </h4>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableAiDetection}
                          onChange={(e) => setEnableAiDetection(e.target.checked)}
                          className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-indigo-300">
                          {enableAiDetection ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </label>
                    </div>

                    {enableAiDetection && (
                      <div className="p-3 bg-slate-950/80 rounded-2xl border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-300 font-semibold">Penalti Nilai Kebijakan Guru:</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={aiPenaltyPercent}
                              onChange={(e) => setAiPenaltyPercent(Math.max(0, Math.min(100, Number(e.target.value))))}
                              className="w-12 p-1 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-center text-amber-400 focus:outline-hidden"
                            />
                            <span className="font-bold text-amber-400">%</span>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex items-center gap-1.5 pt-1">
                          {[10, 20, 25, 50, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setAiPenaltyPercent(preset)}
                              className={`flex-1 py-1 rounded-lg text-[10px] font-extrabold cursor-pointer transition-colors ${
                                aiPenaltyPercent === preset
                                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                              }`}
                            >
                              -{preset}%
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Sistem terintegrasi Google Gemini AI akan membedah pola kata/kalimat. Jika terdeteksi (&ge;60%), nilai murni otomatis dipotong penalti <strong className="text-amber-300">{enableAiDetection ? `${aiPenaltyPercent}%` : '0%'}</strong>.
                    </p>
                  </div>


                </div>
              </div>
            )}
          </div>

          {/* AI Grading Results Display */}
          {gradingResult && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  {(() => {
                    const score = gradingResult.nilaiAkhir;
                    let gradClass = 'from-rose-600 to-rose-400 shadow-rose-500/20';
                    if (score > 60 && score <= 70) gradClass = 'from-amber-500 to-amber-400 shadow-amber-500/20';
                    else if (score > 70 && score <= 80) gradClass = 'from-emerald-600 to-emerald-400 shadow-emerald-500/20';
                    else if (score > 80) gradClass = 'from-indigo-600 to-indigo-400 shadow-indigo-500/20';
                    return (
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md bg-gradient-to-tr ${gradClass}`}
                      >
                        {score}
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm text-slate-900">
                        Hasil Koreksi: {gradingResult.nilaiAkhir}/100
                      </h3>
                      {(() => {
                        const kktpInfo = getKKTPKategori(gradingResult.nilaiAkhir);
                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${kktpInfo.badgeClass}`}>
                            <span>{kktpInfo.iconSymbol}</span>
                            <span>{kktpInfo.badgeTag}</span>
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
                      {(() => {
                        const kktpInfo = getKKTPKategori(gradingResult.nilaiAkhir);
                        return (
                          <span className="font-semibold text-slate-700">
                            • {kktpInfo.subLabel} ({kktpInfo.remedialInfo})
                          </span>
                        );
                      })()}
                      {draftSavedTime && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <CheckCircle2 className="w-3 h-3 text-amber-600" />
                          Draf otomatis tersimpan ({draftSavedTime})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
                  {/* Kebijakan Penalti Kecurangan Guru Mapel */}
                  <button
                    type="button"
                    onClick={() => setIsPenaltyModalOpen(true)}
                    className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    title="Terapkan kebijakan pengurangan nilai guru mapel jika ada indikasi kecurangan/mencontek"
                  >
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Kebijakan Penalti Kecurangan</span>
                  </button>

                  {/* Buka Bukti Otentik */}
                  <button
                    type="button"
                    onClick={() => {
                      setProofStudentId(selectedStudent?.id || null);
                      setIsProofModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                    title="Lihat Bukti Otentik Lembar Jawaban & Rincian Butir Soal"
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Lihat Bukti Otentik</span>
                  </button>

                  {/* Simpan Draf Terlebih Dahulu */}
                  <button
                    type="button"
                    onClick={handleSaveDraftSubmission}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                    title="Simpan sementara progres koreksi siswa ini agar bisa dilanjutkan nanti tanpa khawatir hilang"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Draf Pekerjaan</span>
                  </button>

                  {/* Simpan Final ke Raport */}
                  <button
                    type="button"
                    onClick={handleSaveSubmission}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/30 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Final & Lanjut</span>
                  </button>
                </div>
              </div>

              {/* AI Generator Detection Breakdown Box (Khusus ASTS Essay) */}
              {activeAssessment.jenis !== 'ASAS' && (gradingResult.aiDetected ? (
                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/90 text-amber-950 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <span className="font-extrabold text-xs text-amber-900 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                      Terdeteksi Salinan ChatGPT / Google Gemini ({gradingResult.aiProbability}% Indikasi AI)
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900 border border-amber-300 self-start sm:self-auto">
                      Penalti Kebijakan Guru: -{gradingResult.aiPenaltyPercent}% Dipotong
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-900/90 leading-relaxed italic">
                    "{gradingResult.aiExplanation || 'Pola kalimat dan struktur jawaban memiliki indikasi kuat disalin dari AI Generator (ChatGPT/Gemini).'}"
                  </p>

                  <div className="flex flex-wrap items-center justify-between pt-2 border-t border-amber-200/80 text-xs gap-2">
                    <div className="flex flex-wrap items-center gap-2 text-slate-800">
                      <span>Nilai Murni: <strong className="text-slate-900 font-extrabold">{gradingResult.nilaiMurni || gradingResult.nilaiAkhir}</strong></span>
                      <span>—</span>
                      <span className="text-rose-700 font-bold">Potongan Penalti AI: -{gradingResult.aiPenaltyDeduction || 0} Poin ({gradingResult.aiPenaltyPercent}%)</span>
                      <span>=</span>
                      <span className="font-black text-indigo-900 bg-indigo-100 px-2 py-0.5 rounded-md">Nilai Akhir: {gradingResult.nilaiAkhir}</span>
                    </div>

                    {/* Teacher Manual Penalty Adjustment */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-amber-900 font-bold">Ubah Penalti:</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={gradingResult.aiPenaltyPercent}
                        onChange={(e) => {
                          const newPenalty = Math.max(0, Math.min(100, Number(e.target.value)));
                          const rawScore = gradingResult.nilaiMurni || gradingResult.nilaiAkhir;
                          const newDeduction = Math.round((rawScore * newPenalty) / 100);
                          const newFinal = Math.max(0, rawScore - newDeduction);
                          setGradingResult({
                            ...gradingResult,
                            aiPenaltyPercent: newPenalty,
                            aiPenaltyDeduction: newDeduction,
                            nilaiAkhir: newFinal,
                            tuntas: newFinal >= (activeAssessment.kktp || 75),
                          });
                        }}
                        className="w-12 p-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-center text-amber-900 focus:outline-hidden"
                      />
                      <span className="text-xs font-bold text-amber-900">%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-emerald-900 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hasil Uji AI: Murni Karya Tulisan Tangan Siswa Sendiri</span>
                  </div>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-md">
                    0% Indikasi ChatGPT/Gemini
                  </span>
                </div>
              ))}

              {/* Capaian Kompetensi Box */}
              <div className="p-4 bg-sky-50/80 rounded-2xl border border-sky-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />
                    <div>
                      <span className="font-bold text-sky-950 text-xs block">
                        Capaian Kompetensi (Kaidah Taksonomi Bloom & Pembelajaran Mendalam)
                      </span>
                      <span className="text-[10px] text-sky-700 block">
                        Subjek otomatis <strong>"Peserta didik"</strong> (tanpa nama siswa) sesuai standar resmi raport.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const standardized = generateBloomDeepLearningCK(
                        gradingResult.nilaiAkhir,
                        activeAssessment.kktp || 75,
                        activeAssessment.mataPelajaran
                      );
                      handleCapaianChange(standardized);
                      showToast('Format Sesuai KKTP', 'Narasi diselaraskan dengan formula resmi rentang KKTP (Subjek: Peserta didik).', 'info');
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-sky-100 text-sky-800 border border-sky-300 rounded-lg text-[10px] font-bold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
                    title="Generate ulang narasi Capaian Kompetensi resmi berdasar nilai akhir siswa sesuai diagram rentang KKTP"
                  >
                    <Sparkles className="w-3 h-3 text-sky-600" />
                    <span>Format Ulang Sesuai KKTP</span>
                  </button>
                </div>
                <textarea
                  rows={2}
                  value={gradingResult.capaianKompetensi || ''}
                  onChange={(e) => {
                    const sanitizedInput = sanitizeCapaianKompetensi(
                      e.target.value,
                      selectedStudent?.nama,
                      gradingResult.tuntas,
                      activeAssessment.mataPelajaran,
                      gradingResult.nilaiAkhir
                    );
                    handleCapaianChange(sanitizedInput);
                  }}
                  placeholder="Contoh: Peserta didik sangat mampu / mampu / cukup mampu / kurang mampu..."
                  className="w-full p-2.5 bg-white border border-sky-200 rounded-xl text-xs font-semibold text-sky-950 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              {/* MCQ (ASAS) Quick Summary in Result Card */}
              {activeAssessment.jenis === 'ASAS' && gradingResult && (
                <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Hasil Deteksi Pilihan Ganda ASAS: {gradingResult.studentAnswers?.filter((a: any) => a.benar).length || 0} Benar, {gradingResult.studentAnswers?.filter((a: any) => !a.benar && a.jawabanSiswa !== '-').length || 0} Salah dari {currentMaxQ} Soal (Nilai Murni: {gradingResult.nilaiAkhir})</span>
                  </div>
                  <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full font-extrabold border border-emerald-300">
                    Otomatis 100% Akurat
                  </span>
                </div>
              )}

              {/* MCQ (ASAS) Question-by-Question Grid Breakdown */}
              {gradingResult.studentAnswers && gradingResult.studentAnswers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-slate-900">
                    Rincian Kunci & Jawaban Pilihan Ganda Siswa ({gradingResult.studentAnswers.length} Soal) - Bisa Diedit Kembali Manual
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-72 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
                    {gradingResult.studentAnswers.map((ans: any) => {
                      const qNum = ans.nomor;
                      const correctKey = activeAssessment.mcqQuestions?.find((q) => q.nomor === qNum)?.kunci || 'A';
                      const isCorrect = ans.benar;
                      return (
                        <div key={qNum} className={`p-2 bg-white rounded-xl border text-[11px] flex flex-col justify-between shadow-2xs gap-1 ${
                          isCorrect ? 'border-emerald-200 bg-emerald-50/10' : 'border-rose-200 bg-rose-50/10'
                        }`}>
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-slate-800">No. {qNum}</span>
                            <span className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>
                              Kunci: {correctKey}
                            </span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-1 mt-1">
                            <span className="text-[10px] text-slate-400 font-bold">Jawab:</span>
                            <select
                              value={ans.jawabanSiswa || '-'}
                              onChange={(e) => handleMCQAnswerChange(qNum, e.target.value)}
                              className={`p-1 font-bold text-center rounded-lg text-xs w-12 border ${
                                isCorrect
                                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                  : 'bg-rose-50 border-rose-300 text-rose-700'
                              } focus:outline-hidden cursor-pointer`}
                            >
                              <option value="-">-</option>
                              {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Question-by-Question Breakdown for ASTS (Essay) */}
              {gradingResult.itemScores && gradingResult.itemScores.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">
                        Rincian Butir Soal Uraian ({gradingResult.itemScores.length} Soal) & Transkripsi Hasil Scan AI Vision
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Transkripsi tulisan tangan siswa dapat dicek dan diedit kembali manual. Skor dan alasan akan otomatis tergenerate ulang.
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Gemini AI Vision Ultra-Tinggi
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-3.5 max-h-96 overflow-y-auto p-1 bg-slate-50/70 rounded-2xl border border-slate-200">
                    {gradingResult.itemScores.map((itm: any) => {
                      const rubrikItem = activeAssessment.essayRubrik?.find((r) => r.nomor === itm.nomor);
                      const maxScore = rubrikItem ? rubrikItem.skorMaks : 10;
                      return (
                        <div key={itm.nomor} className="p-4 bg-white rounded-2xl border border-slate-200 text-xs space-y-3 shadow-xs">
                          {/* Item Header & Score Controls */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                                {itm.nomor}
                              </span>
                              <h5 className="font-bold text-slate-900 text-xs">
                                Butir Soal Essay Nomor {itm.nomor}
                              </h5>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-500 font-semibold">{t('grading.score', 'Skor')}:</span>
                              <input
                                type="number"
                                min="0"
                                max={maxScore}
                                value={itm.skor}
                                onChange={(e) => handleItemScoreChange(itm.nomor, Number(e.target.value))}
                                className="w-14 p-1 text-center font-black text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                              />
                              <span className="text-xs text-slate-400 font-bold">/ {maxScore}</span>

                              {/* Quick Score Preset Buttons: 0, 50%, Max */}
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  type="button"
                                  onClick={() => handleItemScoreChange(itm.nomor, 0)}
                                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                  title="Beri skor 0"
                                >
                                  0
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleItemScoreChange(itm.nomor, Math.round(maxScore / 2))}
                                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                                  title="Beri skor separuh"
                                >
                                  50%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleItemScoreChange(itm.nomor, maxScore)}
                                  className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 cursor-pointer"
                                  title="Beri skor maksimal"
                                >
                                  100%
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Rubric Reference (if available) */}
                          {rubrikItem && (
                            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-700 space-y-1">
                              {rubrikItem.soal && (
                                <div className="font-semibold text-slate-800 leading-snug">
                                  <span className="text-slate-400 font-mono block text-[10px] uppercase font-bold mb-0.5">Soal:</span>
                                  <FormattedQuestionText text={rubrikItem.soal} />
                                </div>
                              )}
                              {rubrikItem.kunciJawaban && (
                                <div className="text-slate-600 leading-snug mt-1">
                                  <span className="text-emerald-700 font-bold block text-[10px] uppercase mb-0.5">{t('grading.rubric_reference', 'Kunci / Rubrik Acuan')}:</span>
                                  <FormattedQuestionText text={rubrikItem.kunciJawaban} />
                                </div>
                              )}
                              {rubrikItem.catatanJawaban && (
                                <p className="text-amber-800 leading-snug bg-amber-50/70 p-1.5 rounded-lg border border-amber-200/60 mt-1">
                                  <span className="text-amber-900 font-bold">Catatan Patokan Guru: </span>
                                  {rubrikItem.catatanJawaban}
                                </p>
                              )}

                              {/* Essay Flexibility & Open-Ended Badge */}
                              {(() => {
                                const flexInfo = analyzeEssayFlexibility(rubrikItem.soal, rubrikItem.kunciJawaban, maxScore);
                                return (
                                  <div className={`mt-1.5 p-2 rounded-lg border text-[10.5px] ${flexInfo.typeBadgeClass}`}>
                                    <span className="font-bold block">{flexInfo.typeLabel}</span>
                                    <span className="opacity-90 block mt-0.5">{flexInfo.typeDescription}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Transkripsi Tulisan Tangan Siswa Hasil AI Vision */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                                <ScanEye className="w-3.5 h-3.5 text-indigo-600" />
                                <span>{t('grading.transcription_title', 'Jawaban Siswa (Transkripsi Gemini AI Vision Ultra-Tinggi)')}:</span>
                              </span>
                              <span className="text-[10px] text-slate-400 italic">{t('grading.transcription_editable', 'Dapat dicek dan diedit manual')}</span>
                            </div>
                            <textarea
                              rows={2}
                              value={itm.jawabanSiswa || ''}
                              onChange={(e) => handleItemAnswerTextChange(itm.nomor, e.target.value)}
                              placeholder="Transkripsi tulisan tangan siswa dari foto scan..."
                              className="w-full p-2.5 bg-indigo-50/20 border border-indigo-200 rounded-xl text-xs text-slate-900 leading-relaxed font-sans focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                            />
                          </div>

                          {/* Alasan / Justifikasi Pemberian Skor */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                <span>{t('grading.reason_title', 'Alasan Pemberian Skor (Justifikasi & Umpan Balik Akademis)')}:</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const autoReason = generateDynamicReasoning(
                                    itm.nomor,
                                    itm.skor,
                                    maxScore,
                                    itm.jawabanSiswa,
                                    rubrikItem?.kunciJawaban,
                                    rubrikItem?.catatanJawaban
                                  );
                                  handleItemFeedbackChange(itm.nomor, autoReason);
                                }}
                                className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors cursor-pointer"
                              >
                                {t('grading.regenerate_reason', 'Regenerate Alasan Otomatis')}
                              </button>
                            </div>
                            <textarea
                              rows={2}
                              value={itm.feedback || ''}
                              onChange={(e) => handleItemFeedbackChange(itm.nomor, e.target.value)}
                              placeholder="Alasan justifikasi skor guru..."
                              className="w-full p-2.5 bg-amber-50/20 border border-amber-200 rounded-xl text-xs text-slate-700 leading-relaxed focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Visual AI Progress Bar for Single Student */}
      <AIProgressBar
        isOpen={isGrading}
        title={`Mengoreksi Lembar Jawaban ${selectedStudent?.nama || 'Siswa'}`}
        subtitle={`Menganalisis lembar jawaban ${activeAssessment.jenis} ${activeAssessment.mataPelajaran}...`}
        steps={GRADING_STEPS}
        activeStepIndex={gradingActiveStepIndex}
        progressPercent={gradingProgressPercent}
        estimatedSeconds={6}
      />

      {/* Batch Grading Progress & Interactive Control Modal */}
      <AnimatePresence>
        {isBatchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-2xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col my-auto"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-white">
                        Koreksi Massal Gemini AI Vision
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        batchIsRunning
                          ? batchIsPaused
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                            : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 animate-pulse'
                          : 'bg-indigo-400/20 text-indigo-300 border border-indigo-400/30'
                      }`}>
                        {batchIsRunning ? (batchIsPaused ? 'Dijeda' : 'Sedang Mengoreksi') : 'Selesai'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activeAssessment.mataPelajaran} - Kelas {activeAssessment.kelas} ({batchQueue.length} Siswa Diproses)
                    </p>
                  </div>
                </div>

                {!batchIsRunning && (
                  <button
                    onClick={() => setIsBatchModalOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0 overscroll-contain">
                {/* Progress Bar & Status Summary */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Progres: {batchCurrentIndex + (batchIsRunning ? 0 : (batchQueue.length > 0 ? 1 : 0))} dari {batchQueue.length} Siswa</span>
                    <span className="text-indigo-600 font-extrabold">
                      {batchQueue.length > 0 ? Math.round(((batchCurrentIndex + (batchIsRunning ? 0 : 1)) / batchQueue.length) * 100) : 0}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-indigo-600 to-sky-500 h-full transition-all duration-300 rounded-full"
                      style={{
                        width: `${batchQueue.length > 0 ? Math.min(100, Math.round(((batchCurrentIndex + (batchIsRunning ? 0 : 1)) / batchQueue.length) * 100)) : 0}%`,
                      }}
                    />
                  </div>

                  {batchIsRunning && batchQueue[batchCurrentIndex] && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1">
                      <Loader2 className="w-3.5 h-3.5 text-indigo-600 animate-spin" />
                      <span>
                        Memproses lembar jawaban <strong>{batchQueue[batchCurrentIndex].nama}</strong> (No. Absen {batchQueue[batchCurrentIndex].noUrut || batchCurrentIndex + 1})...
                      </span>
                    </p>
                  )}
                </div>

                {/* Queue Items Table */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center justify-between">
                    <span>Daftar Siswa Dalam Antrean</span>
                    <span className="text-[11px] text-slate-500 font-normal">
                      Nilai & Capaian Kompetensi tersimpan otomatis
                    </span>
                  </h4>

                  <div className="max-h-60 overflow-y-auto rounded-2xl border border-slate-200 divide-y divide-slate-100 bg-white">
                    {batchQueue.map((std, idx) => {
                      const res = batchResults[std.id];
                      const isCurrent = batchIsRunning && idx === batchCurrentIndex;
                      return (
                        <div
                          key={std.id}
                          ref={isCurrent ? batchActiveRowRef : null}
                          className={`p-3 flex items-center justify-between text-xs transition-all ${
                            isCurrent
                              ? 'bg-indigo-50/90 font-bold border-l-4 border-indigo-600 shadow-2xs'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0 pr-2">
                            <span className="text-slate-400 font-mono text-[10px] w-5">
                              {std.noUrut || idx + 1}.
                            </span>
                            <span className="truncate text-slate-900 font-medium">
                              {std.nama}
                            </span>
                          </div>

                          <div className="shrink-0">
                            {res?.status === 'grading' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 animate-pulse">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                Memproses AI...
                              </span>
                            ) : res?.status === 'success' ? (
                              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border shadow-2xs ${
                                res.note === 'Tuntas'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}>
                                <CheckCircle2 className={`w-3 h-3 ${res.note === 'Tuntas' ? 'text-emerald-600' : 'text-amber-600'}`} />
                                <span>Nilai {res.score} ({res.note})</span>
                              </span>
                            ) : res?.status === 'skipped' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                                {res.note || 'Dilewati (Tidak ada foto)'}
                              </span>
                            ) : res?.status === 'failed' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                                <AlertCircle className="w-3 h-3 text-rose-600" />
                                Gagal
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-400">
                                Menunggu antrean
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
                {batchIsRunning ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        batchPauseRef.current = !batchPauseRef.current;
                        setBatchIsPaused(batchPauseRef.current);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      {batchIsPaused ? (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Lanjutkan Koreksi</span>
                        </>
                      ) : (
                        <>
                          <Pause className="w-3.5 h-3.5 text-amber-600" />
                          <span>Jeda Sementara</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        batchCancelRef.current = true;
                        setBatchIsRunning(false);
                      }}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Square className="w-3.5 h-3.5" />
                      <span>Hentikan & Simpan Hasil</span>
                    </button>
                  </>
                ) : (
                  <div className="w-full flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-600">
                      Semua hasil penilaian telah otomatis diperbarui di database.
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsBatchModalOpen(false)}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                    >
                      Tutup & Kembali
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CrossDeviceUploadModal
        isOpen={isWebrtcModalOpen}
        onClose={() => setIsWebrtcModalOpen(false)}
        onImageReceived={handleWebRtcImageReceived}
        onImagesReceived={handleWebRtcImagesReceived}
        title="Ambil Foto Lembar Jawaban via HP"
        subtitle={`Kirim lembar jawaban langsung ke akun ${selectedStudent?.nama || 'Siswa'}`}
      />

      {/* Lightbox / Full-size photo viewer modal */}
      <AnimatePresence>
        {previewModalImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-sm select-none overflow-y-auto"
            onClick={() => {
              setPreviewModalImage(null);
              setPreviewZoomLevel(100);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-4xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col my-auto"
            >
              {/* Header Toolbar */}
              <div className="p-3.5 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between text-white flex-wrap gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-bold">
                    Pratinjau Lembar Jawaban - {selectedStudent?.nama || 'Siswa'}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  {/* Zoom Out (-) */}
                  <button
                    type="button"
                    onClick={() => setPreviewZoomLevel((prev) => Math.max(50, prev - 25))}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                    title="Perkecil Foto (-)"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>

                  {/* Zoom Percentage */}
                  <span className="text-xs font-black font-mono px-2 py-0.5 bg-slate-950 rounded-lg border border-slate-800 text-indigo-400">
                    {previewZoomLevel}%
                  </span>

                  {/* Zoom In (+) */}
                  <button
                    type="button"
                    onClick={() => setPreviewZoomLevel((prev) => Math.min(400, prev + 25))}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors cursor-pointer"
                    title="Perbesar Foto (+)"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>

                  {/* Reset Scale */}
                  <button
                    type="button"
                    onClick={() => setPreviewZoomLevel(100)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="Reset Skala Zoom ke 100%"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">100%</span>
                  </button>

                  <div className="h-4 w-px bg-slate-800 mx-1" />

                  {/* Download Image Button */}
                  <button
                    type="button"
                    onClick={() => handleDownloadImageFile(previewModalImage, 'Lembar_Jawaban_Pratinjau')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
                    title="Unduh Berkas Foto Lembar Jawaban Ini"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh Foto</span>
                  </button>

                  {/* Close Modal */}
                  <button
                    onClick={() => {
                      setPreviewModalImage(null);
                      setPreviewZoomLevel(100);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer ml-1"
                    title="Tutup Pratinjau"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Image Container with Dynamic Scale Transform */}
              <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/50 min-h-[55vh]">
                <div
                  className="transition-transform duration-200 ease-out flex items-center justify-center"
                  style={{ transform: `scale(${previewZoomLevel / 100})`, transformOrigin: 'center center' }}
                >
                  <img
                    src={previewModalImage}
                    alt="Enlarged Sheet"
                    className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ASAS Draft Questions & Answer Key Editor Modal */}
      <AnimatePresence>
        {showAsasDraftModal && activeAssessment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative max-w-4xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col my-auto"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
                    <FileSpreadsheet className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white flex items-center gap-2">
                      <span>Draf Soal & Kunci Jawaban ASAS ({activeAssessment.mcqQuestions?.length || 40} Soal)</span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-300 text-[10px] font-bold">
                        Modul {activeAssessment.mataPelajaran}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Edit butir soal, pilihan jawaban A-E, serta kunci jawaban resmi. Disimpan langsung ke draf modul.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAsasDraftModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body: List of all MCQ Questions */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 min-h-0 overscroll-contain">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <span>Jumlah Butir Soal: {activeAssessment.mcqQuestions?.length || 0} Soal</span>
                  <span className="text-emerald-700">
                    Kunci Terisi: {activeAssessment.mcqQuestions?.filter((q) => q.kunci && q.kunci.trim() !== '').length || 0} / {activeAssessment.mcqQuestions?.length || 0}
                  </span>
                </div>

                <div className="space-y-3">
                  {activeAssessment.mcqQuestions?.map((q) => (
                    <div key={q.nomor} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 text-xs space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-slate-900 bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-lg">
                          Soal No. {q.nomor}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-600 text-[11px]">Kunci Jawaban:</span>
                          <select
                            value={q.kunci || 'A'}
                            onChange={(e) => {
                              const newKunci = e.target.value;
                              const updated = (activeAssessment.mcqQuestions || []).map((mq) =>
                                mq.nomor === q.nomor ? { ...mq, kunci: newKunci } : mq
                              );
                              if (saveAssessment) {
                                saveAssessment({ ...activeAssessment, mcqQuestions: updated });
                              }
                            }}
                            className="p-1 font-black text-center text-xs bg-indigo-600 text-white rounded-lg cursor-pointer focus:outline-hidden"
                          >
                            {['A', 'B', 'C', 'D', 'E'].map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <QuestionFormattingToolbar
                          value={q.soal || ''}
                          onChange={(newSoal) => {
                            const updated = (activeAssessment.mcqQuestions || []).map((mq) =>
                              mq.nomor === q.nomor ? { ...mq, soal: newSoal } : mq
                            );
                            if (saveAssessment) {
                              saveAssessment({ ...activeAssessment, mcqQuestions: updated });
                            }
                          }}
                          placeholder={`Tuliskan teks butir soal nomor ${q.nomor} (bisa diformat tebal Ctrl+B, miring Ctrl+I, garis bawah Ctrl+U, nomor berurutan 1., a., (1), (a), dan rumus/simbol)...`}
                          minHeight="72px"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5 pt-1">
                        {['A', 'B', 'C', 'D', 'E'].map((optKey) => (
                          <div key={optKey} className="flex items-center gap-1 bg-white p-1.5 rounded-xl border border-slate-200">
                            <span className="font-black text-indigo-700 text-[10px] w-3 text-center">{optKey}</span>
                            <input
                              type="text"
                              value={(q.pilihan as any)?.[optKey] || ''}
                              onChange={(e) => {
                                const newOptionVal = e.target.value;
                                const updated = (activeAssessment.mcqQuestions || []).map((mq) => {
                                  if (mq.nomor === q.nomor) {
                                    return {
                                      ...mq,
                                      pilihan: { ...(mq.pilihan || {}), [optKey]: newOptionVal },
                                    };
                                  }
                                  return mq;
                                });
                                if (saveAssessment) {
                                  saveAssessment({ ...activeAssessment, mcqQuestions: updated });
                                }
                              }}
                              placeholder={`Opsi ${optKey}`}
                              className="w-full p-1 text-[11px] font-semibold text-slate-800 bg-transparent focus:outline-hidden"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                <span className="text-xs text-slate-500 font-medium">
                  Perubahan tersimpan secara otomatis ke draf modul ASAS.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setShowAsasDraftModal(false);
                    showToast('Draf Terbarui', 'Draf soal dan kunci jawaban ASAS telah tersimpan.', 'success');
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer transition-colors"
                >
                  Selesai Edit Draf
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Authentic Proof Modal (Dokumen Bukti Otentik Penilaian Siswa) */}
      {isProofModalOpen && activeAssessment && (
        <AuthenticProofModal
          submission={
            (activeAssessment.submissions || []).find(
              (s) =>
                s.studentId === (proofStudentId || selectedStudentId) ||
                s.studentName === (proofStudentId || selectedStudent?.nama)
            ) ||
            (gradingResult
              ? {
                  id: `sub-curr`,
                  studentId: selectedStudent?.id || '',
                  studentName: selectedStudent?.nama || '',
                  nisn: selectedStudent?.nisn || '',
                  kelas: selectedStudent?.kelas || '',
                  nilaiAkhir: gradingResult.nilaiAkhir,
                  nilaiMurni: gradingResult.nilaiMurni || gradingResult.nilaiAkhir,
                  tuntas: gradingResult.tuntas,
                  statusKoreksi: 'Sudah Dikoreksi (Gemini AI Vision)',
                  waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
                  capaianKompetensi: gradingResult.capaianKompetensi,
                  itemScores: gradingResult.itemScores,
                  studentAnswers: gradingResult.studentAnswers,
                  scannedImages: capturedImages,
                  scannedImage: capturedImages[0],
                }
              : existingSubmission || {
                  id: `sub-init`,
                  studentId: selectedStudent?.id || '',
                  studentName: selectedStudent?.nama || '',
                  nisn: selectedStudent?.nisn || '',
                  kelas: selectedStudent?.kelas || '',
                  nilaiAkhir: 0,
                  tuntas: false,
                  statusKoreksi: 'Draf Tersimpan',
                  waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
                  capaianKompetensi: 'Menunggu proses penilaian...',
                  scannedImages: capturedImages,
                  scannedImage: capturedImages[0],
                })
          }
          assessment={activeAssessment}
          student={classStudents.find((s) => s.id === (proofStudentId || selectedStudentId))}
          schoolInfo={state?.schoolInfo}
          onClose={() => {
            setIsProofModalOpen(false);
            setProofStudentId(null);
          }}
        />
      )}

      {/* Teacher Policy Penalty Modal (Kecurangan / Mencontek) */}
      {isPenaltyModalOpen && activeAssessment && (
        <TeacherPenaltyModal
          isOpen={isPenaltyModalOpen}
          onClose={() => setIsPenaltyModalOpen(false)}
          assessment={activeAssessment}
          submissions={activeAssessment.submissions || []}
          classStudents={classStudents}
          onApplyPenalty={handleApplyTeacherPenalty}
          initialSelectedStudentIds={selectedStudent ? [selectedStudent.id] : []}
        />
      )}
    </div>
  );
};
