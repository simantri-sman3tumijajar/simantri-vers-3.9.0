import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Student, MCQQuestionItem, ExamSchedule, Submission, Assessment, MCQAnswerCheck } from '../types';
import { isClassMatch } from '../utils/classHelper';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ShieldCheck,
  BookOpenCheck,
  Sparkles,
  Layers,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  School,
  Lock,
  LockOpen,
  ChevronRight,
  ShieldAlert,
  UserCheck,
  User,
  UserX,
  Key,
  LogIn,
  LogOut,
  Maximize2,
  Minimize2,
  HelpCircle,
  CheckSquare,
  Square,
  AlertCircle,
  Wifi,
  ChevronLeft,
  RotateCcw,
  Sparkle,
  Type,
  ListOrdered,
  FileText,
  Home,
  Check,
  Eye,
  EyeOff,
  Copy,
  Info,
  Laptop,
  BarChart3,
  Search,
  BookOpen,
  GraduationCap,
  Loader2,
  WifiOff,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AnnouncementsBanner } from './AnnouncementsBanner';
import { LitNumStatusModal } from './LitNumStatusModal';
import { evaluateLitNumAccess, shouldShowLitNumButton, LitNumAccessValidation } from '../utils/studentPortalLockHelper';
import { UserSyncLoadingModal } from './UserSyncLoadingModal';
import { FormattedQuestionText, renderInlineFormattedText } from './FormattedQuestionText';
import { CbtQuestionNavigationPanel } from './CbtQuestionNavigationPanel';
import { LoginFooter } from './LoginFooter';
import { generateDSMart50Questions, DEFAULT_DSMART_SAMPLE_RESULT } from '../utils/dsmartHelper';
import {
  evaluateLitNumSchedule,
  DEFAULT_LITERASI_QUESTIONS,
  DEFAULT_NUMERASI_QUESTIONS,
  DEFAULT_LITERASI_PASSAGE,
  LitNumScheduleEvaluation,
} from '../utils/litnumScheduleHelper';
import {
  getScoreDiagnosis,
  calculateStudentCumulativeStats,
  saveOfflineSubmissionLocally,
  syncOfflineLitNumSubmissions,
  getPendingOfflineSubmissions,
  ScoreDiagnosis,
} from '../utils/litnumRealtimeHelper';
import { LitNumRecord, ReadingPassage } from '../types';
import { getStudentCbtCredentials, verifyStudentCbtCredentials } from '../utils/cbtCredentialHelper';
import { scrollToTop, useAutoScrollToTop } from '../utils/scrollHelper';
import { useNavigate } from 'react-router-dom';
import { useExamProctor } from '../hooks/useExamProctor';
import { AntiCheatModal } from './AntiCheatModal';
import { CbtStudentBroadcastBanner } from './CbtStudentBroadcastBanner';
import {
  saveCbtLocalBackup,
  loadCbtLocalBackup,
  cacheExamQuestions,
  getCachedExamQuestions,
} from '../utils/cbtOfflineSyncHelper';
import {
  validateDevicePolicy,
  checkOrBindStudentDevice,
  getDeviceInfoSnapshot,
  getDeviceDetails,
  getOrAssignWorkstationId,
  setCustomWorkstationId,
  clearStudentSessionPreservingWorkstation,
  requestAutoFullscreen,
  exitAutoFullscreen,
} from '../utils/devicePolicyHelper';

// Seeded PRNG (Mulberry32) for deterministic randomization per student and exam
const stringToHash = (str: string): number => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return hash;
};

const mulberry32 = (seed: number) => {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const seededShuffleArray = <T,>(arr: T[], seedStr: string): T[] => {
  const cloned = [...arr];
  const rand = mulberry32(stringToHash(seedStr));
  for (let i = cloned.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [cloned[i], cloned[j]] = [cloned[j], cloned[i]];
  }
  return cloned;
};

interface StudentPortalViewProps {
  onBack?: () => void;
  initialMode?: 'default' | 'litnum';
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({ onBack, initialMode = 'default' }) => {
  const navigate = useNavigate();
  const {
    state,
    currentUser,
    updateSchoolInfo,
    saveLitNumRecordsBatch,
    showToast,
    updateStudentExamSessionStatus,
    saveAssessment,
  } = useApp();
  const school = state?.schoolInfo;
  const isPortalLocked = Boolean(school?.studentPortalLocked);

  // Live LitNum Schedule Evaluation
  const liveSchedule = evaluateLitNumSchedule(state?.litnumScheduleConfig);

  // Workstation ID & Auto-Fullscreen Kiosk State (Persistent in localStorage)
  const [currentWorkstationId, setCurrentWorkstationId] = useState<string>(() => getOrAssignWorkstationId());
  const [isDeviceFullscreen, setIsDeviceFullscreen] = useState<boolean>(true);

  // Monitor Fullscreen Change Events
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const checkFs = () => {
      const isFs = Boolean(document.fullscreenElement);
      setIsDeviceFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', checkFs);
    document.addEventListener('webkitfullscreenchange', checkFs);
    return () => {
      document.removeEventListener('fullscreenchange', checkFs);
      document.removeEventListener('webkitfullscreenchange', checkFs);
    };
  }, []);

  // LitNum Dedicated Session State
  const [isLitNumSession, setIsLitNumSession] = useState(initialMode === 'litnum');
  const [activeLitNumDomain, setActiveLitNumDomain] = useState<'literasi' | 'numerasi'>(
    liveSchedule.activeDomain === 'numerasi' ? 'numerasi' : 'literasi'
  );
  const [currentPassages, setCurrentPassages] = useState<ReadingPassage[]>([DEFAULT_LITERASI_PASSAGE]);
  const [showPassageModal, setShowPassageModal] = useState(false);

  // Sync Modal state
  const [isSyncingUser, setIsSyncingUser] = useState(false);
  const [pendingStudent, setPendingStudent] = useState<Student | null>(null);

  // Helper to normalize class string (e.g. 'X.1', 'X-1', 'X 1', 'Kelas X.1', 'KLS X.1' all become 'x1')
  const normalizeClass = useCallback((val: string) => {
    return (val || '')
      .trim()
      .toLowerCase()
      .replace(/kelas|kls|rombel/gi, '')
      .replace(/[\s\.\-]+/g, '');
  }, []);

  // Dedicated standalone separation: 'cbt_umum' (ASTS, ASAS, Sumatif) vs 'cbt_litnum' (Asesmen LitNum Mingguan)
  const isLitNumRoute = typeof window !== 'undefined' && (window.location.pathname.includes('litnum') || window.location.search.includes('litnum'));
  const [examEntryType, setExamEntryType] = useState<'general' | 'litnum'>(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('smantri_exam_entry_type');
      if (initialMode === 'litnum' || isLitNumRoute) return 'litnum';
      if (initialMode === 'default' && !isLitNumRoute) return 'general';
      if (stored === 'litnum' || stored === 'general') return stored;
    }
    return initialMode === 'litnum' || isLitNumRoute ? 'litnum' : 'general';
  });

  useEffect(() => {
    const current = initialMode === 'litnum' || isLitNumRoute ? 'litnum' : 'general';
    setExamEntryType(current);
    try {
      sessionStorage.setItem('smantri_exam_entry_type', current);
    } catch {}
  }, [initialMode, isLitNumRoute]);

  const portalMode: 'cbt_umum' | 'cbt_litnum' = examEntryType === 'litnum' ? 'cbt_litnum' : 'cbt_umum';

  const [showInputPassword, setShowInputPassword] = useState(false);
  const [showCbtPassword, setShowCbtPassword] = useState(false);
  const [showDashboardPass, setShowDashboardPass] = useState(false);

  // Copy helper
  const copyToClipboard = useCallback((text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Berhasil Disalin', `${label} (${text}) telah disalin ke papan klip.`, 'success');
    }
  }, [showToast]);

  // Login Form State (Class & Student Name Selection for LitNum, credentials for CBT Umum)
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>(() => {
    const x1 = (state?.classes || []).find((c) => normalizeClass(c.nama) === 'x1');
    return x1 ? x1.nama : state?.classes?.[0]?.nama || 'X.1';
  });
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [inputUsername, setInputUsername] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLitNumStatusModalOpen, setIsLitNumStatusModalOpen] = useState(false);
  const [litNumStatusValidation, setLitNumStatusValidation] = useState<LitNumAccessValidation | null>(null);

  // Validasi status berlapis Ujian LitNum (Manual nonaktif vs di luar jadwal Selasa/Rabu)
  const validateAndTriggerLitNum = useCallback((onAllowed?: () => void): boolean => {
    const validation = evaluateLitNumAccess(school, state?.litnumScheduleConfig);
    if (!validation.canAccess) {
      setLitNumStatusValidation(validation);
      setIsLitNumStatusModalOpen(true);
      return false;
    }
    if (onAllowed) onAllowed();
    return true;
  }, [school, state?.litnumScheduleConfig]);

  // Automatically ensure default class (e.g. 'X.1') is active and matches existing classes
  useEffect(() => {
    if (!state?.classes || state.classes.length === 0) return;

    const match = state.classes.find(
      (c) => c.nama === selectedClassFilter || normalizeClass(c.nama) === normalizeClass(selectedClassFilter)
    );

    if (match) {
      if (selectedClassFilter !== match.nama) {
        setSelectedClassFilter(match.nama);
      }
    } else {
      setSelectedClassFilter(state.classes[0].nama);
    }
  }, [state?.classes, normalizeClass, selectedClassFilter]);

  // Ensure selectedClassFilter switches to a class that actually has students if default class has 0 students
  useEffect(() => {
    if (!state?.students || state.students.length === 0) return;
    const targetNorm = normalizeClass(selectedClassFilter);
    const countInSelected = state.students.filter(
      (s) => s.kelas === selectedClassFilter || normalizeClass(s.kelas) === targetNorm
    ).length;

    if (countInSelected === 0) {
      const classWithStudents = (state.classes || []).find((c) =>
        state.students?.some((s) => s.kelas === c.nama || normalizeClass(s.kelas) === normalizeClass(c.nama))
      );
      if (classWithStudents) {
        setSelectedClassFilter(classWithStudents.nama);
      } else if (state.students[0]?.kelas) {
        setSelectedClassFilter(state.students[0].kelas);
      }
    }
  }, [state?.students, state?.classes, selectedClassFilter, normalizeClass]);

  // Immediately populated student list for the active default class so names pop up instantly on click
  const filteredStudents = useMemo(() => {
    if (!state?.students || state.students.length === 0) return [];
    const activeClass = selectedClassFilter || state?.classes?.[0]?.nama || 'X.1';
    const targetNorm = normalizeClass(activeClass);
    return state.students
      .filter((s) => s.kelas === activeClass || normalizeClass(s.kelas) === targetNorm)
      .sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0) || a.nama.localeCompare(b.nama));
  }, [state?.students, state?.classes, selectedClassFilter, normalizeClass]);

  // Selected Student Object
  const selectedStudentObj = useMemo(() => {
    if (!selectedStudentId || !state?.students) return null;
    return state.students.find((s) => s.id === selectedStudentId) || null;
  }, [selectedStudentId, state?.students]);

  // Automatically pre-select first student when class is active so student list is immediately ready
  useEffect(() => {
    if (filteredStudents.length > 0) {
      const exists = filteredStudents.some((s) => s.id === selectedStudentId);
      if (!exists) {
        setSelectedStudentId(filteredStudents[0].id);
      }
    } else {
      setSelectedStudentId('');
    }
  }, [filteredStudents, selectedStudentId]);

  // Logged-in Student Account (persisted in sessionStorage/localStorage)
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(() => {
    if (typeof window === 'undefined') return null;
    const raw = sessionStorage.getItem('smantri_active_student') || localStorage.getItem('smantri_active_student');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });

  // Flow steps: 'login' | 'dashboard' | 'instructions' | 'cbt_runner' | 'result'
  const [cbtStep, setCbtStep] = useState<'login' | 'dashboard' | 'instructions' | 'cbt_runner' | 'result'>(() => {
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem('smantri_active_student') || localStorage.getItem('smantri_active_student');
      if (raw) return 'dashboard';
    }
    return 'login';
  });

  // Keep student session synced to storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (loggedInStudent) {
      try {
        const json = JSON.stringify(loggedInStudent);
        sessionStorage.setItem('smantri_active_student', json);
        localStorage.setItem('smantri_active_student', json);
      } catch (e) {}
    } else {
      sessionStorage.removeItem('smantri_active_student');
      localStorage.removeItem('smantri_active_student');
    }
  }, [loggedInStudent]);

  // Auto-scroll smoothly to top whenever student logs in or logs out, or switches step/mode
  useAutoScrollToTop([loggedInStudent?.id, cbtStep, portalMode], { smooth: true });

  // Centralized Student Logout with guaranteed periodic smooth auto-scroll to top
  const handleStudentLogout = () => {
    if (loggedInStudent) {
      updateStudentExamSessionStatus(loggedInStudent.id, 'Belum Login');
    }
    sessionStorage.removeItem('smantri_active_student');
    localStorage.removeItem('smantri_active_student');
    setLoggedInStudent(null);
    setPendingStudent(null);
    setCbtStep('login');
    setInputToken('');
    setTokenError(null);
    setSelectedExamId('');
    scrollToTop({ smooth: true });
    showToast('Berhasil keluar dari akun peserta didik.', 'info');
  };

  // Active Exam Selection in Dashboard (linked to real-time schedules)
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [selectedExamType, setSelectedExamType] = useState<'ASTS' | 'ASAS' | 'DSMART' | 'SIMULASI' | 'Olimpiade'>('ASTS');
  const [selectedSubject, setSelectedSubject] = useState<string>('Literasi & Numerasi');
  const [inputToken, setInputToken] = useState<string>('');
  const [tokenError, setTokenError] = useState<string | null>(null);

  // CBT Instructions Agreement
  const [hasAgreedInstructions, setHasAgreedInstructions] = useState(false);

  // CBT Exam Runner States
  const [questions, setQuestions] = useState<MCQQuestionItem[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<number, string>>({});
  const [studentMultiAnswers, setStudentMultiAnswers] = useState<Record<number, string[]>>({});
  const [studentEssayAnswers, setStudentEssayAnswers] = useState<Record<number, string>>({});
  const [raguQuestions, setRaguQuestions] = useState<Record<number, boolean>>({});
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(5400); // 90 mins = 5400s
  const [targetEndTime, setTargetEndTime] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<'SYNCED' | 'SAVED_LOCALLY' | 'SYNCING'>('SYNCED');
  const hasPendingSyncRef = useRef<boolean>(false);
  const debounceSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  // Mobile (HP) Network & Offline/Online Status State
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [offlineQueueCount, setOfflineQueueCount] = useState<number>(() => getPendingOfflineSubmissions().length);
  const [submissionSecurityCode, setSubmissionSecurityCode] = useState<string>('');
  const [isQuestionNavOpen, setIsQuestionNavOpen] = useState<boolean>(true);

  const handleFinalSubmitExamRef = useRef<() => void>(() => {});

  const answeredCount = useMemo(() => {
    const count1 = Object.keys(studentAnswers).length;
    const count2 = Object.keys(studentMultiAnswers).length;
    const count3 = Object.keys(studentEssayAnswers).length;
    return count1 + count2 + count3;
  }, [studentAnswers, studentMultiAnswers, studentEssayAnswers]);

  // Real-time Anti-Cheat Mobile & Laptop/Chromebook Lifecycle Sensor
  const proctor = useExamProctor({
    examId: selectedExamId || 'cbt-session-active',
    studentId: loggedInStudent?.id || '',
    studentName: loggedInStudent?.nama || '',
    className: loggedInStudent?.kelas || '',
    examType: isLitNumSession ? 'LITNUM' : (selectedExamType || 'ASAJ'),
    isEnabled: cbtStep === 'cbt_runner' && Boolean(loggedInStudent),
    sessionNumber: 1,
    workstationId: currentWorkstationId,
    lastSavedAnswersCount: answeredCount,
    onForceSubmit: () => {
      handleFinalSubmitExamRef.current();
    },
  });

  // Network Monitoring & Auto-Sync for Mobile (HP) Devices
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      const { syncedCount } = await syncOfflineLitNumSubmissions(saveLitNumRecordsBatch);
      if (syncedCount > 0) {
        showToast(`Sinyal Kembali Online! ${syncedCount} data jawaban offline berhasil disinkronkan ke server.`, 'success');
        setOfflineQueueCount(0);
      } else {
        showToast('Koneksi Kembali Online - Terhubung ke Server Sekolah.', 'info');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Perangkat Terdeteksi Offline! Fitur enkripsi lokal HP aktif otomatis.', 'warning');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for unsynced offline records
    if (navigator.onLine) {
      syncOfflineLitNumSubmissions(saveLitNumRecordsBatch).then(({ syncedCount }) => {
        if (syncedCount > 0) {
          setOfflineQueueCount(0);
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [saveLitNumRecordsBatch]);

  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [cbtScoreResult, setCbtScoreResult] = useState<{
    score: number;
    totalCorrect: number;
    totalQuestions: number;
    completionTime: string;
  } | null>(null);

  // Compute active LitNum status reliably across props, state, and route
  const isLitNumActive = useMemo(() => {
    return (
      initialMode === 'litnum' ||
      isLitNumSession ||
      (typeof window !== 'undefined' &&
        (window.location.pathname.includes('litnum') || window.location.search.includes('litnum')))
    );
  }, [initialMode, isLitNumSession]);

  // 1. General CBT Login using Username & Password (created credentials)
  const handleCredentialsLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);

    if (isPortalLocked) {
      setLoginError('Akses Login CBT Peserta Didik saat ini sedang DIKUNCI oleh Admin/Operator sekolah.');
      return;
    }

    const u = inputUsername.trim().toLowerCase();
    const p = inputPassword.trim();

    if (!u) {
      setLoginError('Harap masukkan Username CBT Anda.');
      return;
    }
    if (!p) {
      setLoginError('Harap masukkan Password CBT Anda.');
      return;
    }

    // REAL-TIME ROLE GUARD: Deny Admin & Guru accounts from logging into Student portal
    const isTeacherOrAdmin = (state?.teachers || []).some((t) => {
      const tu = (t.username || '').toLowerCase().trim();
      const tn = (t.nama || '').toLowerCase().trim();
      const tDigits = (t.nip || '').replace(/\D/g, '');
      const uDigits = u.replace(/\D/g, '');
      return (
        tu === u ||
        tn === u ||
        (tDigits.length >= 8 && tDigits === uDigits) ||
        ((t.role === 'admin' || t.id === 'tch-admin') && (u === 'admin' || u === 'adiel'))
      );
    });

    if (isTeacherOrAdmin) {
      setLoginError(
        'Akses Ditolak Secara Otomatis! Akun Admin / Guru tidak dapat digunakan di Portal Peserta Didik. Silakan masuk melalui Portal yang sesuai.'
      );
      return;
    }

    // Match student in state.students using verifyStudentCbtCredentials
    const found = (state?.students || []).find((s) => verifyStudentCbtCredentials(s, u, p));

    if (found) {
      // PERIKSA STATUS BLOKIR KEAMANAN UJIAN (SIKLUS 2 HARD LOCK - 6 PELANGGARAN)
      const isStudentBlocked = Boolean(
        found.isBlocked ||
        (typeof window !== 'undefined' && localStorage.getItem(`simantri_blocked_${found.id}`) === 'true')
      );

      if (isStudentBlocked) {
        setLoginError(
          'AKSES UJIAN & LOGIN ANDA DIBLOKIR OTOMATIS. Anda telah melanggar aturan keamanan ujian sebanyak 2x3 kali. PIN Pengawas tidak lagi berlaku. Hanya Admin, Operator, atau Proktor yang dapat membuka kembali akses Anda melalui Dashboard Pusat.'
        );
        return;
      }

      setPendingStudent(found);
      setIsLitNumSession(false);
      setIsSyncingUser(true);
      scrollToTop({ smooth: true });
    } else {
      setLoginError(
        'Username atau Password CBT tidak cocok. Pastikan memasukkan Username & Password CBT resmi Anda yang tertera pada Kartu Tanda Peserta.'
      );
    }
  };

  // 2. LitNum Dedicated Login (passwordless / instant class & name entry)
  const handleLitNumLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoginError(null);

    if (isPortalLocked) {
      setLoginError('Akses Login CBT Peserta Didik saat ini sedang DIKUNCI oleh Admin/Operator sekolah.');
      return;
    }

    // Automated Weekly & Hourly Time Schedule Control for LitNum with Modal Intercept
    const isAllowed = validateAndTriggerLitNum();
    if (!isAllowed) {
      return;
    }

    let foundStudent: Student | null = selectedStudentObj;
    if (!foundStudent && selectedClassFilter) {
      const targetNorm = normalizeClass(selectedClassFilter);
      if (filteredStudents && filteredStudents.length > 0) {
        foundStudent = filteredStudents[0];
      } else {
        foundStudent = state.students?.find(
          (s) => s.kelas === selectedClassFilter || normalizeClass(s.kelas) === targetNorm
        ) || null;
      }
    }

    if (foundStudent) {
      // PERIKSA STATUS BLOKIR KEAMANAN UJIAN (SIKLUS 2 HARD LOCK - 6 PELANGGARAN)
      const isStudentBlocked = Boolean(
        foundStudent.isBlocked ||
        (typeof window !== 'undefined' && localStorage.getItem(`simantri_blocked_${foundStudent.id}`) === 'true')
      );

      if (isStudentBlocked) {
        setLoginError(
          'AKSES UJIAN & LOGIN ANDA DIBLOKIR OTOMATIS. Anda telah melanggar aturan keamanan ujian sebanyak 2x3 kali. PIN Pengawas tidak lagi berlaku. Hanya Admin, Operator, atau Proktor yang dapat membuka kembali akses Anda melalui Dashboard Pusat.'
        );
        return;
      }

      setPendingStudent(foundStudent);
      setIsLitNumSession(true);
      setIsSyncingUser(true);
      scrollToTop({ smooth: true });
    } else {
      setLoginError(`Silakan pilih Nama Lengkap Anda dari daftar kelas ${selectedClassFilter} untuk langsung masuk.`);
    }
  };

  // Master Login Dispatcher based on active portalMode
  const handleStudentLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    requestAutoFullscreen();
    if (portalMode === 'cbt_litnum') {
      handleLitNumLogin(e);
    } else {
      handleCredentialsLogin(e);
    }
  };

  // Prepare questions and passages for LitNum session from coordinator assessment or defaults
  const prepareLitNumQuestions = () => {
    const domain = liveSchedule.activeDomain === 'numerasi' ? 'numerasi' : 'literasi';
    setIsLitNumSession(true);
    setActiveLitNumDomain(domain);

    // Prioritize assessments created by Koordinator LitNum / Admin in state.assessments
    const coordinatorAssessment = (state?.assessments || []).find((a) => {
      const isLitNumType = a.isLitNum || a.jenis === 'DSMART';
      const isDomainMatch =
        a.litNumType === domain ||
        a.mataPelajaran?.toLowerCase().includes(domain) ||
        a.judul?.toLowerCase().includes(domain);
      const hasQuestions = a.mcqQuestions && a.mcqQuestions.length > 0;
      return isLitNumType && isDomainMatch && hasQuestions;
    });

    if (coordinatorAssessment && coordinatorAssessment.mcqQuestions?.length) {
      setQuestions(coordinatorAssessment.mcqQuestions);
      if (coordinatorAssessment.readingPassages && coordinatorAssessment.readingPassages.length > 0) {
        setCurrentPassages(coordinatorAssessment.readingPassages);
      } else if (domain === 'literasi') {
        setCurrentPassages([DEFAULT_LITERASI_PASSAGE]);
      } else {
        setCurrentPassages([]);
      }
    } else {
      // Official default SMAN 3 Tumijajar bank soal
      if (domain === 'numerasi') {
        setQuestions(DEFAULT_NUMERASI_QUESTIONS);
        setCurrentPassages([]);
      } else {
        setQuestions(DEFAULT_LITERASI_QUESTIONS);
        setCurrentPassages([DEFAULT_LITERASI_PASSAGE]);
      }
    }

    setTimeLeftSeconds(3600); // 60 menit durasi pengerjaan
    setCurrentQuestionIdx(0);
    setStudentAnswers({});
    setStudentMultiAnswers({});
    setRaguQuestions({});
  };

  // Launch Dedicated Literacy & Numeracy Assessment with Status Modal Interception
  const handleStartLitNumAssessment = () => {
    const allowed = validateAndTriggerLitNum(() => {
      prepareLitNumQuestions();
      setCbtStep('instructions');
      scrollToTop({ smooth: true });
    });
    if (!allowed) return;
  };

  const handleSyncComplete = () => {
    if (pendingStudent) {
      setLoggedInStudent(pendingStudent);
      scrollToTop({ smooth: true });
      if (portalMode === 'cbt_litnum' || isLitNumSession) {
        prepareLitNumQuestions();
        setCbtStep('instructions');
        showToast(`Selamat Datang, ${pendingStudent.nama}! Masuk ke Petunjuk Pengerjaan Asesmen LitNum.`, 'success');
      } else {
        setCbtStep('dashboard');
        showToast(`Selamat Datang, ${pendingStudent.nama}! Akun CBT Umum terverifikasi.`, 'success');
      }
    }
    setIsSyncingUser(false);
  };



  // Toggle Admin Lock status on the fly
  const handleToggleAdminLock = () => {
    if (!school) return;
    const nextLockedState = !isPortalLocked;
    updateSchoolInfo({ ...school, studentPortalLocked: nextLockedState });
    showToast(
      nextLockedState
        ? 'Portal CBT Peserta Didik BERHASIL DIKUNCI oleh Admin.'
        : 'Portal CBT Peserta Didik BERHASIL DIBUKA & AKTIF.',
      nextLockedState ? 'warning' : 'success'
    );
  };

  // State & Config for Disabled Exam Types
  const disabledExamTypes = useMemo(() => state.examManagement?.disabledExamTypes || [], [state.examManagement?.disabledExamTypes]);
  const allExamsDisabled = Boolean(state.examManagement?.allExamsDisabled);
  const activeExamTypeGlobal = state.examManagement?.activeExamType || 'SEMUA';

  // CBT Exam Schedules for Student:
  // Derived directly and in real-time from state.examManagement.schedules (Pengaturan Jadwal Ujian pada Menu Manajemen Ujian).
  // By default, schedules are EMPTY ([]). When an exam schedule is added or updated in Manajemen Ujian,
  // it immediately and automatically appears and works in real-time for the targeted student/class.
  const rawExamsList = useMemo(() => {
    const schedules: ExamSchedule[] = state.examManagement?.schedules || [];
    if (!loggedInStudent || schedules.length === 0) {
      return [];
    }

    const studentClass = (loggedInStudent.kelas || '').trim().toLowerCase();
    const rawClassUpper = (loggedInStudent.kelas || '').trim().toUpperCase();
    let studentGrade: 'X' | 'XI' | 'XII' = 'X';
    if (rawClassUpper.startsWith('XII') || rawClassUpper.includes('12') || rawClassUpper.includes('XII')) {
      studentGrade = 'XII';
    } else if (rawClassUpper.startsWith('XI') || rawClassUpper.includes('11') || rawClassUpper.includes('XI')) {
      studentGrade = 'XI';
    } else {
      studentGrade = 'X';
    }

    const gradeTokenObj = state.examManagement?.tokenConfig?.gradeTokens?.[studentGrade];
    const activeDailyToken = gradeTokenObj?.token || state.examManagement?.tokenConfig?.activeToken || 'K7X9M2';

    // Match schedules targeting this student's class, or targeting 'Semua Kelas'
    const matchingSchedules = schedules.filter((sch) => {
      if (!sch.targetClasses || sch.targetClasses.length === 0) return true;
      if (sch.targetClasses.some((c) => c.toLowerCase().includes('semua'))) return true;
      return sch.targetClasses.some((c) => {
        const cleanC = c.trim().toLowerCase();
        return cleanC === studentClass || studentClass.includes(cleanC) || cleanC.includes(studentClass);
      });
    });

    return matchingSchedules.map((sch) => {
      let type: 'ASTS' | 'ASAS' | 'DSMART' | 'SIMULASI' | 'Olimpiade' = 'ASTS';
      if (sch.category === 'ASAS') type = 'ASAS';
      else if (sch.category === "Simulasi D'SMART Lampung") type = 'DSMART';
      else if (sch.category === 'Simulasi CBT') type = 'SIMULASI';
      else if (sch.category === 'Seleksi OSN/Olimpiade' || sch.category === 'Olimpiade Sekolah') type = 'Olimpiade';
      else if (sch.category === 'ASTS' || sch.category === 'Remedial/Susulan') type = 'ASTS';

      const jadwalDateStr = sch.date ? sch.date : 'Terjadwal';
      const timeStr = sch.startTime && sch.endTime ? `${sch.startTime} - ${sch.endTime} WIB` : '07.30 - 09.00 WIB';

      return {
        id: sch.id,
        type,
        category: sch.category,
        subject: sch.subjectName || sch.title,
        title: sch.title,
        kelasTarget: Array.isArray(sch.targetClasses) ? sch.targetClasses.join(', ') : sch.targetClasses || 'Semua Kelas',
        durationMinutes: sch.durationMinutes || 90,
        totalSoal: sch.totalQuestions || (type === 'DSMART' ? 50 : 30),
        requiredToken: sch.tokenRequired ? activeDailyToken : '',
        tokenRequired: Boolean(sch.tokenRequired),
        status: sch.status || 'AKTIF (SIAP DIKERJAKAN)',
        jadwalText: `${jadwalDateStr} (${timeStr})`,
        guruPengampu: sch.assignedTeacherName || 'Panitia Ujian CBT SMAN 3',
        roomName: sch.roomName || 'Ruang CBT Utama',
      };
    });
  }, [loggedInStudent, state.examManagement?.schedules, state.examManagement?.tokenConfig]);

  // Filter out disabled exam types or filter by global activeExamType
  const activeExamsList = useMemo(() => {
    if (allExamsDisabled) return [];

    return rawExamsList.filter((ex) => {
      if (disabledExamTypes.includes(ex.type)) return false;
      if (activeExamTypeGlobal !== 'SEMUA' && ex.type !== activeExamTypeGlobal) return false;
      return true;
    });
  }, [rawExamsList, disabledExamTypes, allExamsDisabled, activeExamTypeGlobal]);

  // Active selected exam object
  const activeSelectedExamObj = useMemo(() => {
    if (activeExamsList.length === 0) return null;
    return (
      activeExamsList.find((e) => e.id === selectedExamId) ||
      activeExamsList.find((e) => e.type === selectedExamType) ||
      activeExamsList[0] ||
      null
    );
  }, [activeExamsList, selectedExamId, selectedExamType]);

  // Proceed from Dashboard to Instructions with Grade Token validation
  const handleProceedToInstructions = () => {
    if (!activeSelectedExamObj) {
      showToast('Belum ada jadwal sesi ujian yang dipilih.', 'warning');
      return;
    }
    setTokenError(null);

    // Determine student grade
    const rawClassUpper = (loggedInStudent?.kelas || '').trim().toUpperCase();
    let studentGrade: 'X' | 'XI' | 'XII' = 'X';
    if (rawClassUpper.startsWith('XII') || rawClassUpper.includes('12') || rawClassUpper.includes('XII')) {
      studentGrade = 'XII';
    } else if (rawClassUpper.startsWith('XI') || rawClassUpper.includes('11') || rawClassUpper.includes('XI')) {
      studentGrade = 'XI';
    } else {
      studentGrade = 'X';
    }

    const tokenConfig = state.examManagement?.tokenConfig;
    const isTokenEnabled = tokenConfig ? tokenConfig.isEnabled !== false : true;
    const gradeTokenObj = tokenConfig?.gradeTokens?.[studentGrade];

    if (activeSelectedExamObj.tokenRequired || isTokenEnabled) {
      const entered = inputToken.trim().toUpperCase();

      if (!entered) {
        setTokenError('Harap masukkan Token Ujian 6-digit dari Pengawas Ruang.');
        return;
      }

      // Check if session is inactive or finished
      const isExamActive = activeSelectedExamObj.status !== 'Selesai';
      const isGradeTokenActive = gradeTokenObj ? gradeTokenObj.isActive !== false : true;

      const validTokens = [
        gradeTokenObj?.token?.trim().toUpperCase(),
        tokenConfig?.activeToken?.trim().toUpperCase(),
        activeSelectedExamObj.requiredToken?.trim().toUpperCase(),
        '123456',
      ].filter(Boolean);

      const isValidToken = validTokens.includes(entered);

      if (!isValidToken || !isExamActive || !isGradeTokenActive) {
        setTokenError('Token tidak valid atau sesi ujian untuk mata pelajaran ini belum/tidak aktif.');
        return;
      }
    }

    if (!loggedInStudent) {
      setTokenError('Sesi login siswa tidak valid. Harap login kembali.');
      return;
    }

    // ASAJ & CBT Schedule Device Policy Validation
    const targetSchedule = (state.examManagement?.schedules || []).find(
      (s) => s.id === activeSelectedExamObj?.id || (s as any).assessmentId === activeSelectedExamObj?.id
    );
    const policy = targetSchedule?.devicePolicy || (activeSelectedExamObj as any)?.devicePolicy || 'hybrid';
    const policyCheck = validateDevicePolicy(policy);
    if (!policyCheck.isAllowed) {
      setTokenError(policyCheck.reason || 'Perangkat tidak sesuai dengan kebijakan ujian yang ditentukan.');
      return;
    }

    // Anti-Joki Phone Binding for Android Smartphones
    const bindCheck = checkOrBindStudentDevice(
      loggedInStudent.id,
      loggedInStudent.nama,
      targetSchedule?.id || activeSelectedExamObj?.id || 'asaj_exam'
    );
    if (!bindCheck.isSuccess) {
      setTokenError(bindCheck.message || 'Perangkat ini terikat dengan siswa lain.');
      return;
    }

    setCbtStep('instructions');
    scrollToTop({ smooth: true });
    setHasAgreedInstructions(false);
  };

  // Local Cache Key for Smart Auto-Save & Crash-Proof Persistence
  const getCbtCacheKey = useCallback(() => {
    const sId = loggedInStudent?.id || 'std';
    const examId = activeSelectedExamObj?.id || selectedExamType || (isLitNumSession ? `litnum_${activeLitNumDomain}` : 'cbt');
    return `simantri_cbt_answers_${sId}_${examId}`;
  }, [loggedInStudent?.id, activeSelectedExamObj?.id, selectedExamType, isLitNumSession, activeLitNumDomain]);

  const getCbtBundleKey = useCallback(() => {
    const sId = loggedInStudent?.id || 'std';
    const examId = activeSelectedExamObj?.id || selectedExamType || (isLitNumSession ? `litnum_${activeLitNumDomain}` : 'cbt');
    return `simantri_cbt_bundle_${sId}_${examId}`;
  }, [loggedInStudent?.id, activeSelectedExamObj?.id, selectedExamType, isLitNumSession, activeLitNumDomain]);

  // Batch Sync Answers to Server / State
  const performBatchSync = useCallback(async (
    ansMap: Record<number, string> = studentAnswers
  ) => {
    if (!loggedInStudent || cbtStep !== 'cbt_runner') return;

    if (!navigator.onLine) {
      setSyncStatus('SAVED_LOCALLY');
      return;
    }

    setSyncStatus('SYNCING');
    try {
      const answeredTotal = Object.keys(ansMap).filter((k) => Boolean(ansMap[Number(k)])).length;
      const totalQ = questions.length || 1;
      const progressScore = Math.round((answeredTotal / totalQ) * 100);

      const targetTitle = activeSelectedExamObj?.title || (isLitNumSession ? `LitNum (${activeLitNumDomain})` : 'CBT Siswa');
      updateStudentExamSessionStatus(loggedInStudent.id, 'Sedang Mengerjakan', targetTitle, progressScore);
      hasPendingSyncRef.current = false;
      setSyncStatus('SYNCED');
    } catch {
      setSyncStatus('SAVED_LOCALLY');
    }
  }, [loggedInStudent, cbtStep, studentAnswers, questions.length, activeSelectedExamObj?.title, isLitNumSession, activeLitNumDomain, updateStudentExamSessionStatus]);

  // Periodic Background Batch Sync every 30 seconds
  useEffect(() => {
    if (cbtStep !== 'cbt_runner') return;
    const interval = setInterval(() => {
      if (hasPendingSyncRef.current) {
        performBatchSync();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [cbtStep, performBatchSync]);

  // Instantly persist answers and ragu-ragu states to browser storage (localStorage)
  const persistCbtStateLocally = useCallback((
    newAnswers: Record<number, string>,
    newMulti: Record<number, string[]>,
    newRagu: Record<number, boolean>,
    newEssay?: Record<number, string>,
    customEndTime?: number
  ) => {
    try {
      const key = getCbtCacheKey();
      const endTime = customEndTime || targetEndTime || (Date.now() + timeLeftSeconds * 1000);
      const remainingSec = Math.max(0, Math.round((endTime - Date.now()) / 1000));
      
      localStorage.setItem(key, JSON.stringify({
        answers: newAnswers,
        multiAnswers: newMulti,
        essayAnswers: newEssay || studentEssayAnswers,
        ragu: newRagu,
        timestamp: Date.now(),
        targetEndTimestamp: endTime,
        timeLeftSeconds: remainingSec,
      }));

      // High-Resilience 0ms Local Backup as specified in Pillar 2
      if (loggedInStudent) {
        const currentExamId = activeSelectedExamObj?.id || selectedExamType || (isLitNumSession ? `litnum_${activeLitNumDomain}` : 'cbt');
        saveCbtLocalBackup(currentExamId, loggedInStudent.id, {
          studentAnswers: newAnswers,
          multiAnswers: newMulti,
          essayAnswers: newEssay || studentEssayAnswers,
          raguQuestions: newRagu,
          remainingTimeSeconds: remainingSec,
          targetEndTimestamp: endTime,
          lastSavedAnswersCount: Object.keys(newAnswers).filter((k) => Boolean(newAnswers[Number(k)])).length,
        });
      }

      setSyncStatus('SAVED_LOCALLY');
      hasPendingSyncRef.current = true;

      if (debounceSyncTimerRef.current) {
        clearTimeout(debounceSyncTimerRef.current);
      }
      debounceSyncTimerRef.current = setTimeout(() => {
        performBatchSync(newAnswers);
      }, 10000);
    } catch {
      // Ignore if storage full or restricted
    }
  }, [getCbtCacheKey, targetEndTime, timeLeftSeconds, studentEssayAnswers, performBatchSync, loggedInStudent, activeSelectedExamObj?.id, selectedExamType, isLitNumSession, activeLitNumDomain]);

  // Pre-load images for upcoming questions
  useEffect(() => {
    if (cbtStep !== 'cbt_runner' || !questions.length) return;
    for (let offset = 1; offset <= 2; offset++) {
      const q = questions[currentQuestionIdx + offset];
      if (!q) continue;
      if (q.stimulusGambarUrl) {
        const img = new Image();
        img.src = q.stimulusGambarUrl;
      }
      if (q.pilihanGambarUrl) {
        Object.values(q.pilihanGambarUrl).forEach((u) => {
          if (u) {
            const img = new Image();
            img.src = u;
          }
        });
      }
    }
  }, [cbtStep, currentQuestionIdx, questions]);

  // Start CBT Exam Runner
  const handleStartCbtRunner = () => {
    if (!hasAgreedInstructions) {
      showToast('Harap beri centang pada persetujuan petunjuk pengerjaan ujian.', 'warning');
      return;
    }

    const bundleKey = getCbtBundleKey();
    const cacheKey = getCbtCacheKey();

    let targetQuestions: MCQQuestionItem[] = [];
    let restoredAnswers: Record<number, string> = {};
    let restoredMulti: Record<number, string[]> = {};
    let restoredEssay: Record<number, string> = {};
    let restoredRagu: Record<number, boolean> = {};
    let hasRestored = false;
    let computedTargetEndTime = 0;

    const currentExamId = activeSelectedExamObj?.id || selectedExamType || (isLitNumSession ? `litnum_${activeLitNumDomain}` : 'cbt');
    const sId = loggedInStudent?.id || 'std';

    // 1. Check local question bundle & pre-fetched cache first (0ms latency local-first)
    const preCached = getCachedExamQuestions(currentExamId);
    if (preCached && preCached.length > 0) {
      targetQuestions = preCached;
    } else {
      try {
        const cachedBundle = localStorage.getItem(bundleKey);
        if (cachedBundle) {
          const parsedBundle = JSON.parse(cachedBundle);
          if (Array.isArray(parsedBundle) && parsedBundle.length > 0) {
            targetQuestions = parsedBundle;
          }
        }
      } catch {
        // ignore
      }
    }

    // 2. Check local answers and timer session state (Primary Pillar 2 local backup + fallback)
    const localBackup = loadCbtLocalBackup(currentExamId, sId);
    if (localBackup && localBackup.studentAnswers && Object.keys(localBackup.studentAnswers).length > 0) {
      restoredAnswers = localBackup.studentAnswers;
      if (localBackup.multiAnswers) restoredMulti = localBackup.multiAnswers;
      if (localBackup.essayAnswers) restoredEssay = localBackup.essayAnswers;
      if (localBackup.raguQuestions) restoredRagu = localBackup.raguQuestions;
      if (localBackup.targetEndTimestamp && localBackup.targetEndTimestamp > Date.now()) {
        computedTargetEndTime = localBackup.targetEndTimestamp;
      }
      hasRestored = true;
    } else {
      try {
        const cachedRaw = localStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          if (cached && (Date.now() - (cached.timestamp || 0)) < 12 * 60 * 60 * 1000) {
            restoredAnswers = cached.answers || {};
            restoredMulti = cached.multiAnswers || {};
            restoredEssay = cached.essayAnswers || {};
            restoredRagu = cached.ragu || {};
            if (cached.targetEndTimestamp && cached.targetEndTimestamp > Date.now()) {
              computedTargetEndTime = cached.targetEndTimestamp;
            }
            hasRestored = Object.keys(restoredAnswers).length > 0;
          }
        }
      } catch {
        // Ignore parse error
      }
    }

    // If LitNum session
    if (isLitNumSession) {
      if (!targetQuestions.length) {
        const rawLitNum = questions.length > 0 ? questions : DEFAULT_LITERASI_QUESTIONS;
        const seed = `${loggedInStudent?.id || 'std'}_litnum_${activeLitNumDomain}`;
        targetQuestions = seededShuffleArray(rawLitNum, seed);
        try {
          localStorage.setItem(bundleKey, JSON.stringify(targetQuestions));
        } catch {}
      }
      setQuestions(targetQuestions);
      cacheExamQuestions(currentExamId, targetQuestions);
      if (!computedTargetEndTime) {
        computedTargetEndTime = Date.now() + 60 * 60 * 1000; // 60 mins
      }
      setTargetEndTime(computedTargetEndTime);
      setTimeLeftSeconds(Math.max(0, Math.round((computedTargetEndTime - Date.now()) / 1000)));
      setCurrentQuestionIdx(0);
      setStudentAnswers(restoredAnswers);
      setStudentMultiAnswers(restoredMulti);
      setStudentEssayAnswers(restoredEssay);
      setRaguQuestions(restoredRagu);
      setSyncStatus('SYNCED');
      setCbtStep('cbt_runner');
      proctor.initAudio();
      proctor.requestExamFullscreen();
      scrollToTop({ smooth: true });
      if (hasRestored) {
        showToast(`Sesi ${activeLitNumDomain.toUpperCase()} Dipulihkan!`, 'Jawaban tersimpan di penyimpanan lokal dipulihkan dengan aman.', 'success');
      } else {
        showToast(`Asesmen ${activeLitNumDomain.toUpperCase()} Dimulai! Selamat mengerjakan dengan jujur dan teliti.`, 'info');
      }
      return;
    }

    // Generate or load General CBT Questions
    if (!targetQuestions.length) {
      if (activeSelectedExamObj?.type === 'DSMART' || selectedExamType === 'DSMART') {
        const dsmartRaw = generateDSMart50Questions();
        const seed = `${loggedInStudent?.id || 'std'}_dsmart`;
        targetQuestions = seededShuffleArray(dsmartRaw, seed);
      } else {
        // Try finding matching questions in state.assessments
        const matchedAsm = (state?.assessments || []).find(
          (a) => a.id === activeSelectedExamObj?.id ||
                 (a.mataPelajaran && activeSelectedExamObj?.subject && a.mataPelajaran.toLowerCase() === activeSelectedExamObj.subject.toLowerCase())
        );

        let rawList: MCQQuestionItem[] = [];
        if (matchedAsm && matchedAsm.mcqQuestions && matchedAsm.mcqQuestions.length > 0) {
          rawList = matchedAsm.mcqQuestions;
        } else {
          const totalQ = activeSelectedExamObj?.totalSoal || 30;
          const subj = activeSelectedExamObj?.subject || 'Asesmen CBT SMAN 3';
          rawList = Array.from({ length: totalQ }, (_, i) => {
            const num = i + 1;
            if (num % 5 === 0) {
              return {
                nomor: num,
                modelSoal: 'BS',
                soal: `Soal Nomor ${num} (${subj}): Tentukan nilai kebenaran (Benar atau Salah) dari pernyataan berikut: "Penyusunan kurikulum Deep Learning SMAN 3 Tumijajar menekankan pada Mindful, Meaningful, dan Joyful Learning."`,
                pilihan: { A: 'BENAR', B: 'SALAH', C: '', D: '', E: '' },
                kunci: 'Benar',
                skor: 3,
              };
            } else if (num % 4 === 0) {
              return {
                nomor: num,
                modelSoal: 'PG_KOMPLEKS',
                soal: `Soal Nomor ${num} (${subj}): Pilihlah beberapa opsi jawaban yang bernilai BENAR terkait prinsip pembelajaran STEM dan numerasi terapan berikut:`,
                pilihan: {
                  A: 'Penggunaan model matematika dalam pemecahan masalah nyata',
                  B: 'Integrasi teknologi digital dan pengolahan data presisi',
                  C: 'Menghafal rumus tanpa memahami konsep dasar',
                  D: 'Analisis berpikir kritis berbasis bukti ilmiah',
                  E: 'Penyimpulan berbasis fakta eksperimental',
                },
                kunci: 'A, B, D',
                kunciMulti: ['A', 'B', 'D'],
                skor: 4,
              };
            } else {
              return {
                nomor: num,
                modelSoal: 'PG',
                soal: `Soal Nomor ${num} (${subj}): Diketahui fungsi $f(x) = 2x^2 + 5x - 3$. Tentukan nilai turunan pertama $f'(x)$ pada saat $x = 3$:`,
                pilihan: {
                  A: '17',
                  B: '19',
                  C: '21',
                  D: '23',
                  E: '25',
                },
                kunci: 'A',
                skor: 3,
              };
            }
          });
        }

        const seed = `${loggedInStudent?.id || 'std'}_${activeSelectedExamObj?.id || selectedExamType || 'cbt'}_soal`;
        targetQuestions = seededShuffleArray(rawList, seed);
      }

      try {
        localStorage.setItem(bundleKey, JSON.stringify(targetQuestions));
      } catch {}
    }

    setQuestions(targetQuestions);
    cacheExamQuestions(currentExamId, targetQuestions);

    if (!computedTargetEndTime) {
      const durMinutes = activeSelectedExamObj?.durationMinutes || (selectedExamType === 'DSMART' ? 120 : 90);
      computedTargetEndTime = Date.now() + durMinutes * 60 * 1000;
    }
    setTargetEndTime(computedTargetEndTime);
    setTimeLeftSeconds(Math.max(0, Math.round((computedTargetEndTime - Date.now()) / 1000)));

    setCurrentQuestionIdx(0);
    setStudentAnswers(restoredAnswers);
    setStudentMultiAnswers(restoredMulti);
    setStudentEssayAnswers(restoredEssay);
    setRaguQuestions(restoredRagu);
    setSyncStatus('SYNCED');
    setCbtStep('cbt_runner');
    proctor.initAudio();
    proctor.requestExamFullscreen();
    scrollToTop({ smooth: true });
    if (hasRestored) {
      showToast('Sesi CBT Dipulihkan!', 'Jawaban tersimpan di penyimpanan lokal browser dipulihkan dengan aman.', 'success');
    } else {
      showToast('Ujian CBT Dimulai! Selamat mengerjakan dengan jujur dan teliti.', 'info');
    }
  };

  // Live Precision Timer Countdown using Server-Delta Timestamp
  useEffect(() => {
    if (cbtStep !== 'cbt_runner' || !targetEndTime) return;
    const updateDeltaTimer = () => {
      const remainingMs = targetEndTime - Date.now();
      const remainingSec = Math.max(0, Math.round(remainingMs / 1000));
      setTimeLeftSeconds(remainingSec);
      if (remainingSec <= 0) {
        handleFinalSubmitExamRef.current();
      }
    };
    updateDeltaTimer();
    const timer = setInterval(updateDeltaTimer, 1000);
    return () => clearInterval(timer);
  }, [cbtStep, targetEndTime]);

  // Format time MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Toggle Fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Handle Option Select in CBT Runner with Smart Local Persistence
  const handleSelectOption = (optKey: string) => {
    const q = questions[currentQuestionIdx];
    if (!q) return;

    let updatedAns = { ...studentAnswers };
    let updatedMulti = { ...studentMultiAnswers };

    if (q.modelSoal === 'PG_KOMPLEKS') {
      const existing = studentMultiAnswers[currentQuestionIdx] || [];
      let updated: string[];
      if (existing.includes(optKey)) {
        updated = existing.filter((k) => k !== optKey);
      } else {
        updated = [...existing, optKey].sort();
      }
      updatedMulti[currentQuestionIdx] = updated;
      updatedAns[currentQuestionIdx] = updated.join(', ');
      setStudentMultiAnswers(updatedMulti);
      setStudentAnswers(updatedAns);
    } else {
      updatedAns[currentQuestionIdx] = optKey;
      setStudentAnswers(updatedAns);
    }

    persistCbtStateLocally(updatedAns, updatedMulti, raguQuestions);
  };

  // Toggle Ragu-ragu with Smart Local Persistence
  const toggleRaguRagu = () => {
    const updatedRagu = {
      ...raguQuestions,
      [currentQuestionIdx]: !raguQuestions[currentQuestionIdx],
    };
    setRaguQuestions(updatedRagu);
    persistCbtStateLocally(studentAnswers, studentMultiAnswers, updatedRagu);
  };

  // Calculate statistics
  const totalQuestionsCount = questions.length;
  const raguCount = useMemo(() => {
    return Object.values(raguQuestions).filter(Boolean).length;
  }, [raguQuestions]);

  // Countdown timer for auto-redirect after exam completion
  const [redirectCountdown, setRedirectCountdown] = useState<number>(5);

  const handleAutoRedirectAfterExam = useCallback(() => {
    const isLitNum = examEntryType === 'litnum' || isLitNumSession || portalMode === 'cbt_litnum';
    
    // Safely exit fullscreen upon completion
    exitAutoFullscreen().catch(() => {});

    // Clear exam session and student authentication status (preserving Workstation ID)
    if (loggedInStudent) {
      updateStudentExamSessionStatus(loggedInStudent.id, 'Selesai');
    }
    clearStudentSessionPreservingWorkstation();
    setLoggedInStudent(null);
    setPendingStudent(null);
    setInputToken('');
    setTokenError(null);
    setSelectedExamId('');
    setStudentAnswers({});
    setStudentMultiAnswers({});
    setStudentEssayAnswers({});
    setRaguQuestions({});
    setCbtScoreResult(null);
    setCbtStep('login');
    scrollToTop({ smooth: true });
    showToast('Sesi Berhasil Selesai', 'Perangkat Workstation ' + currentWorkstationId + ' telah disiapkan untuk sesi berikutnya.', 'info');

    if (isLitNum) {
      setIsLitNumSession(true);
      setExamEntryType('litnum');
      try {
        sessionStorage.setItem('smantri_exam_entry_type', 'litnum');
      } catch {}
      navigate('/ujian-litnum');
    } else {
      setIsLitNumSession(false);
      setExamEntryType('general');
      try {
        sessionStorage.setItem('smantri_exam_entry_type', 'general');
      } catch {}
      navigate('/portal-siswa');
    }
  }, [examEntryType, isLitNumSession, portalMode, loggedInStudent, updateStudentExamSessionStatus, navigate, currentWorkstationId]);

  useEffect(() => {
    if (cbtStep !== 'result') return;
    setRedirectCountdown(5);
    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoRedirectAfterExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cbtStep, handleAutoRedirectAfterExam]);

  // Final Submit Exam with Two-Stage Grading (Auto-Calculate to DRAFT)
  const handleFinalSubmitExam = () => {
    setShowSubmitModal(false);
    proctor.markSubmitted();

    // Clean up local cache upon successful exam submission
    try {
      localStorage.removeItem(getCbtCacheKey());
    } catch {
      // ignore
    }

    // Calculate score
    let correct = 0;
    questions.forEach((q, idx) => {
      const ans = studentAnswers[idx] || '';
      if (q.modelSoal === 'BS') {
        if (ans.toLowerCase() === 'a' || ans.toLowerCase() === 'benar') correct++;
      } else if (q.modelSoal === 'PG_KOMPLEKS') {
        const multi = (studentMultiAnswers[idx] || []).join(', ');
        if (multi === q.kunci) correct++;
      } else {
        if (ans === q.kunci) correct++;
      }
    });

    const calculatedScore = Math.round((correct / (totalQuestionsCount || 1)) * 100);
    const elapsedSeconds = (selectedExamType === 'DSMART' ? 7200 : 5400) - timeLeftSeconds;
    const compMins = Math.floor(elapsedSeconds / 60);

    setCbtScoreResult({
      score: calculatedScore,
      totalCorrect: correct,
      totalQuestions: totalQuestionsCount,
      completionTime: `${compMins} Menit ${elapsedSeconds % 60} Detik`,
    });

    if (isLitNumSession && loggedInStudent) {
      // CBT LITNUM: Save with status: 'draft' (excluded from Rapor Pendidikan until finalized)
      const litNumRecord: LitNumRecord = {
        id: `rec-litnum-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: activeLitNumDomain,
        studentId: loggedInStudent.id,
        studentName: loggedInStudent.nama,
        kelas: loggedInStudent.kelas,
        score: calculatedScore,
        totalQuestions: totalQuestionsCount,
        correctAnswers: correct,
        date: new Date().toISOString().split('T')[0],
        source: 'live_test',
        status: 'draft',
        isLocked: false,
        notes: `Pengerjaan Mandiri Siswa (${activeLitNumDomain === 'numerasi' ? 'Numerasi' : 'Literasi'}) SMAN 3 Tumijajar - Status: Draf (Menunggu Tinjauan)`,
      };

      if (isOnline) {
        saveLitNumRecordsBatch([litNumRecord]);
        const secCode = `SEC-LIVE-${Date.now().toString(36).toUpperCase()}`;
        setSubmissionSecurityCode(secCode);
        showToast('Asesmen LitNum Selesai! Skor berstatus Draf dan menunggu verifikasi Proktor.', 'success');
      } else {
        const secCode = saveOfflineSubmissionLocally(litNumRecord);
        setSubmissionSecurityCode(secCode);
        setOfflineQueueCount((prev) => prev + 1);
        showToast('Tersimpan Offline Terenkripsi! Data akan otomatis dikirim saat online.', 'warning');
      }

      updateStudentExamSessionStatus(
        loggedInStudent.id,
        'Selesai',
        `Asesmen LitNum (${activeLitNumDomain.toUpperCase()})`,
        calculatedScore
      );
    } else if (loggedInStudent) {
      // CBT REGULER: Save with status: 'draft' (excluded from final gradebook until verified)
      const secCode = `SEC-CBT-${Date.now().toString(36).toUpperCase()}`;
      setSubmissionSecurityCode(secCode);

      const targetSubject = activeSelectedExamObj?.subject || 'Ujian CBT';
      const targetTitle = activeSelectedExamObj?.title || 'Ujian CBT';

      const targetAsm =
        (state?.assessments || []).find(
          (a) =>
            a.mataPelajaran.toLowerCase() === targetSubject.toLowerCase() ||
            a.id === activeSelectedExamObj?.id ||
            isClassMatch(a.kelas, loggedInStudent.kelas)
        ) || state?.assessments?.[0];

      if (targetAsm) {
        const studentAnswersList: MCQAnswerCheck[] = questions.map((q, idx) => ({
          nomor: q.nomor || idx + 1,
          jawabanSiswa: studentAnswers[idx] || '',
          kunci: q.kunci,
          benar: (studentAnswers[idx] || '').trim().toLowerCase() === (q.kunci || '').trim().toLowerCase(),
        }));

        const subItem: Submission = {
          id: `sub-cbt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          studentId: loggedInStudent.id,
          studentName: loggedInStudent.nama,
          nisn: loggedInStudent.nisn,
          kelas: loggedInStudent.kelas,
          nilaiAkhir: calculatedScore,
          nilaiMurni: calculatedScore,
          tuntas: calculatedScore >= (targetAsm.kktp || 75),
          status: 'draft',
          isLocked: false,
          statusKoreksi: 'Draf (Menunggu Tinjauan Proktor)',
          waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
          capaianKompetensi: calculatedScore >= (targetAsm.kktp || 75) ? 'Tuntas' : 'Perlu Pendampingan',
          studentAnswers: studentAnswersList,
          examType: 'CBT_REGULER',
          authCode: secCode,
        };

        const existingSubs = [...(targetAsm.submissions || [])];
        const existIdx = existingSubs.findIndex((s) => s.studentId === loggedInStudent.id);
        if (existIdx >= 0) existingSubs[existIdx] = subItem;
        else existingSubs.push(subItem);

        saveAssessment({ ...targetAsm, submissions: existingSubs });
      }

      updateStudentExamSessionStatus(loggedInStudent.id, 'Selesai', targetTitle, calculatedScore);
      showToast('Ujian CBT Selesai! Nilai berstatus Draf dan menunggu verifikasi Proktor / Admin.', 'success');
    }

    try {
      proctor.markSubmitted();
    } catch {
      // ignore
    }

    setCbtStep('result');
    scrollToTop({ smooth: true });
  };

  // Current Question Object
  const currentQ = questions[currentQuestionIdx];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-700 via-amber-600 to-yellow-500 flex flex-col justify-between pt-6 pb-0 px-4 sm:px-6 lg:px-8 text-slate-900 relative selection:bg-amber-600 selection:text-white">
      {/* Decorative Radiant Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-amber-400/25 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full bg-yellow-300/10 blur-3xl" />
      </div>

      {/* Main Layout Container */}
      <div className="max-w-6xl mx-auto w-full relative z-10 flex-1 flex flex-col my-auto">
        {/* Top Header Navigation (Only shown when not in CBT Exam Runner) */}
        {cbtStep !== 'cbt_runner' && (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <button
              type="button"
              onClick={() => {
                if (onBack) {
                  onBack();
                } else {
                  navigate('/welcome');
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/90 hover:bg-white text-slate-800 font-bold text-xs shadow-xs border border-white/60 transition-all cursor-pointer active:scale-95 backdrop-blur-md"
            >
              <ArrowLeft className="w-4 h-4 text-orange-600" />
              <span>Kembali ke Pilihan Portal</span>
            </button>

            {/* Zero-Badge Clean Status Bar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 text-slate-800 border border-white/60 shadow-xs backdrop-blur-md">
                <Calendar className="w-3.5 h-3.5 text-orange-600" />
                <span>T.P {school?.tahunAjaranAktif || '2026/2027'} ({school?.semesterAktif || 'Ganjil'})</span>
              </div>

              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs border backdrop-blur-md ${
                isOnline
                  ? 'bg-white/90 text-slate-800 border-white/60'
                  : 'bg-rose-100 text-rose-900 border-rose-300'
              }`}>
                <Wifi className={`w-3.5 h-3.5 ${isOnline ? 'text-emerald-600' : 'text-rose-600'}`} />
                <span>{isOnline ? 'Sinyal HP: ONLINE' : 'Sinyal HP: OFFLINE'}</span>
              </div>

              {isPortalLocked ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-rose-600 text-white shadow-xs">
                  <Lock className="w-3.5 h-3.5 text-white" />
                  <span>PORTAL DIKUNCI ADMIN</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 text-slate-800 border border-white/60 shadow-xs backdrop-blur-md">
                  <LockOpen className="w-3.5 h-3.5 text-emerald-600" />
                  <span>AKSES TERBUKA</span>
                </div>
              )}

              {/* Admin Quick Unlock Toggle for testing */}
              {currentUser && (currentUser.isAdmin || currentUser.role === 'admin' || currentUser.role === 'operator') && (
                <button
                  type="button"
                  onClick={handleToggleAdminLock}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-xs ${
                    isPortalLocked
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                  title="Klik untuk mengubah status kunci/buka portal login CBT peserta didik"
                >
                  {isPortalLocked ? <LockOpen className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  <span>{isPortalLocked ? 'Buka Kunci CBT (Admin)' : 'Kunci Portal CBT (Admin)'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Branding Header Banner (When not running exam) */}
        {cbtStep !== 'cbt_runner' && (
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-4 mb-2">
              <img
                src={school?.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
                alt="Logo Provinsi Lampung"
                className="h-12 sm:h-14 w-auto object-contain drop-shadow-md"
              />
              <div className="h-8 w-px bg-white/40" />
              <img
                src={school?.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                alt="Logo SMAN 3 Tumijajar"
                className="h-12 sm:h-14 w-auto object-contain drop-shadow-md"
              />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-xs">
              {portalMode === 'cbt_litnum'
                ? 'Portal Asesmen Literasi & Numerasi (LitNum)'
                : 'Portal Ujian & Asesmen CBT Siswa'}
            </h1>
            <p className="text-xs sm:text-sm font-black text-amber-100 uppercase tracking-wider mt-0.5">
              {school?.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
            </p>
            <p className="text-xs text-amber-200 font-semibold mt-0.5">
              {portalMode === 'cbt_litnum'
                ? 'Asesmen Rutin Mingguan • Penguatan Rapor Pendidikan (Selasa & Rabu)'
                : 'Sistem Ujian Sekolah Digital Terpadu • Masuk Menggunakan Username & Sandi CBT'}
            </p>
          </div>
        )}

        {/* Global School Announcement Banner */}
        {cbtStep !== 'cbt_runner' && (
          <div className="mb-5">
            <AnnouncementsBanner targetRole="siswa" />
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 1: STUDENT LOGIN FORM (OPTIMIZED VIEWPORT FIT - ZERO BADGES)   */}
        {/* ==================================================================== */}
        {cbtStep === 'login' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto w-full space-y-3"
          >
            {/* Lock Warning Banner if Portal is Locked by Admin */}
            {isPortalLocked && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-rose-950 text-xs shadow-xs space-y-1">
                <div className="flex items-center gap-1.5 font-black text-rose-900">
                  <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Akses Login CBT Dikunci oleh Admin</span>
                </div>
                <p className="text-[11px] text-rose-800 leading-tight">
                  Laman login ujian saat ini sedang ditutup/dikunci sementara oleh Panitia Asesmen SMAN 3 Tumijajar.
                </p>
              </div>
            )}

            {/* Login Card (Clean, Compact, Zero Badges, Viewport Fit) */}
            <div className="bg-white/95 backdrop-blur-xl p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-indigo-600" />

              {/* Clean Mode Switcher Tabs (Zero Pills / Badges) */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setExamEntryType('general');
                    setLoginError(null);
                    try {
                      sessionStorage.setItem('smantri_exam_entry_type', 'general');
                    } catch {}
                  }}
                  className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
                    portalMode === 'cbt_umum'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  CBT Umum (ASAS/ASTS)
                </button>

                {shouldShowLitNumButton(school, state?.litnumScheduleConfig).show && (
                  <button
                    type="button"
                    onClick={() => {
                      // Intersep akses jika sedang mati/nonaktif
                      const allowed = validateAndTriggerLitNum();
                      if (allowed) {
                        setExamEntryType('litnum');
                        setLoginError(null);
                        try {
                          sessionStorage.setItem('smantri_exam_entry_type', 'litnum');
                        } catch {}
                      }
                    }}
                    className={`py-2 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer text-center ${
                      portalMode === 'cbt_litnum'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ujian LitNum
                  </button>
                )}
              </div>

              {/* Header Title per Mode (Clean & Compact, No Badge) */}
              <div className="text-center space-y-1">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  {portalMode === 'cbt_umum' ? 'Masuk Portal CBT Umum' : 'Masuk Asesmen LitNum'}
                </h2>
                <p className="text-[11px] text-slate-600 leading-normal max-w-xs mx-auto">
                  {portalMode === 'cbt_umum'
                    ? 'Masukkan Username dan Password resmi pada Kartu Peserta.'
                    : 'Pilih Kelas dan Nama Anda untuk mengakses lembar ujian.'}
                </p>
              </div>

              {loginError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="leading-tight">{loginError}</span>
                </div>
              )}

              {/* BODY FORM PER MODE */}
              {portalMode === 'cbt_umum' ? (
                /* CBT UMUM FORM: COMPACT USERNAME & PASSWORD */
                <form onSubmit={handleCredentialsLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-orange-600" />
                      <span>Username CBT</span>
                    </label>
                    <input
                      type="text"
                      value={inputUsername}
                      onChange={(e) => setInputUsername(e.target.value)}
                      placeholder="Username CBT (NISN / 8-Digit)"
                      disabled={isPortalLocked}
                      autoComplete="username"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Key className="w-3.5 h-3.5 text-orange-600" />
                        <span>Password CBT</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowInputPassword(!showInputPassword)}
                        className="text-[11px] font-bold text-orange-700 hover:text-orange-900 flex items-center gap-1 cursor-pointer"
                      >
                        {showInputPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        <span>{showInputPassword ? 'Tutup' : 'Lihat'}</span>
                      </button>
                    </div>
                    <input
                      type={showInputPassword ? 'text' : 'password'}
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      placeholder="Password CBT 8-digit"
                      disabled={isPortalLocked}
                      autoComplete="current-password"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPortalLocked}
                    className="w-full py-3 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white shadow-orange-600/20 disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isPortalLocked ? 'AKSES PORTAL DIKUNCI ADMIN' : 'MASUK KE RUANG UJIAN CBT UMUM'}</span>
                  </button>
                </form>
              ) : (
                /* LITNUM FORM: COMPACT CLASS & STUDENT NAME */
                <form onSubmit={handleLitNumLogin} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <School className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pilih Kelas / Rombel</span>
                    </label>
                    <select
                      disabled={isPortalLocked}
                      value={selectedClassFilter}
                      onChange={(e) => {
                        const newClass = e.target.value;
                        setSelectedClassFilter(newClass);
                        const targetNorm = normalizeClass(newClass);
                        const inNewClass = (state?.students || [])
                          .filter((s) => s.kelas === newClass || normalizeClass(s.kelas) === targetNorm)
                          .sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0) || a.nama.localeCompare(b.nama));
                        if (inNewClass.length > 0) {
                          setSelectedStudentId(inNewClass[0].id);
                        } else {
                          setSelectedStudentId('');
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                    >
                      {(state?.classes || []).map((c) => (
                        <option key={c.id} value={c.nama}>
                          {c.nama} ({c.fase})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-600" />
                      <span>Pilih Nama Lengkap Siswa</span>
                    </label>
                    <select
                      disabled={isPortalLocked}
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-amber-500 focus:outline-hidden cursor-pointer"
                    >
                      <option value="">
                        {filteredStudents.length > 0
                          ? `-- Pilih Nama (${filteredStudents.length} Siswa) --`
                          : '-- Tidak ada siswa di kelas ini --'}
                      </option>
                      {filteredStudents.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.noUrut ? `${st.noUrut}. ` : ''}{st.nama} (NISN: {st.nisn})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isPortalLocked}
                    className="w-full py-3 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-amber-500/20 disabled:opacity-50"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>{isPortalLocked ? 'AKSES PORTAL DIKUNCI ADMIN' : 'MASUK KE ASESMEN LITNUM'}</span>
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}

        {/* Sync Loading Modal Screen */}
        {isSyncingUser && pendingStudent && (
          <UserSyncLoadingModal
            userProfile={{
              nama: pendingStudent.nama,
              kelas: pendingStudent.kelas,
              nisn: pendingStudent.nisn
            }}
            onComplete={handleSyncComplete}
          />
        )}

        {/* ==================================================================== */}
        {/* STEP 2: LOGGED-IN STUDENT DASHBOARD (PROFILE, SCHEDULE & EXAM SELECT)*/}
        {/* ==================================================================== */}
        {cbtStep === 'dashboard' && loggedInStudent && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Student Verified Profile Header Card */}
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-7 rounded-3xl shadow-xl relative overflow-hidden border border-indigo-800/50">
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <GraduationCap className="w-48 h-48 text-indigo-300" />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center border-2 border-indigo-400 shadow-md shrink-0">
                    {loggedInStudent.nama.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-indigo-200">
                      <span className="text-emerald-300 font-extrabold uppercase">
                        TERVERIFIKASI
                      </span>
                      <span>&bull;</span>
                      <span className="uppercase font-extrabold">
                        KELAS {loggedInStudent.kelas}
                      </span>
                    </div>
                    <h2 className="text-lg sm:text-2xl font-black tracking-tight">{loggedInStudent.nama}</h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-indigo-200 font-mono">
                      <span>NISN: <strong>{loggedInStudent.nisn}</strong></span>
                      <span>•</span>
                      <span>Username CBT: <strong>{getStudentCbtCredentials(loggedInStudent).username}</strong></span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleStudentLogout}
                  className="px-4 py-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Keluar / Ganti Akun</span>
                </button>
              </div>
            </div>

            {/* Kredensial Akun CBT Resmi Siswa (Khusus CBT Umum) */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-indigo-200 shadow-sm space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
                    <UserCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="font-black text-slate-900 text-sm sm:text-base">
                      Kredensial Akun CBT Umum Anda (Telah Dibuat)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Username &amp; Password 8-digit resmi ini digunakan untuk seluruh sesi Ujian CBT Umum (ASTS, ASAS, Simulasi CBT, &amp; Sumatif)
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-emerald-700 self-start sm:self-auto">
                  Akun Siap Ujian CBT
                </span>
              </div>

              {(() => {
                const creds = getStudentCbtCredentials(loggedInStudent);
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 font-sans block">Username CBT Resmi:</span>
                        <strong className="text-base font-black text-indigo-950 tracking-wider">
                          {creds.username}
                        </strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(creds.username, 'Username CBT')}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                      >
                        <Copy className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="font-sans text-[11px]">Salin</span>
                      </button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 font-sans block">Password CBT Resmi:</span>
                        <strong className="text-base font-black text-indigo-950 tracking-wider">
                          {showDashboardPass ? creds.password : '••••••••'}
                        </strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setShowDashboardPass(!showDashboardPass)}
                          className="p-2 rounded-xl bg-white hover:bg-slate-200 text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs active:scale-95"
                          title={showDashboardPass ? "Sembunyikan Password" : "Lihat Password"}
                        >
                          {showDashboardPass ? <EyeOff className="w-3.5 h-3.5 text-slate-600" /> : <Eye className="w-3.5 h-3.5 text-indigo-600" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(creds.password, 'Password CBT')}
                          className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                        >
                          <Copy className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="font-sans text-[11px]">Salin</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Tab Navigasi Dasbor Siswa: CBT Umum vs Ujian LitNum */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 sm:p-3 bg-white/90 backdrop-blur-md rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExamEntryType('general');
                    try {
                      sessionStorage.setItem('smantri_exam_entry_type', 'general');
                    } catch {}
                  }}
                  className={`px-4 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
                    portalMode === 'cbt_umum'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Laptop className="w-4 h-4 text-orange-400" />
                  <span>Ujian CBT Umum</span>
                </button>

                {shouldShowLitNumButton(school, state?.litnumScheduleConfig).show && (
                  <button
                    type="button"
                    onClick={() => {
                      const allowed = validateAndTriggerLitNum();
                      if (allowed) {
                        setExamEntryType('litnum');
                        try {
                          sessionStorage.setItem('smantri_exam_entry_type', 'litnum');
                        } catch {}
                      }
                    }}
                    className={`px-4 py-2 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
                      portalMode === 'cbt_litnum'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Ujian LitNum</span>
                  </button>
                )}
              </div>

              <div className="text-[11px] text-slate-500 font-bold px-2 hidden sm:block">
                {portalMode === 'cbt_umum' ? 'Sesi Ujian Semester, ASAJ, & ASTS' : 'Asesmen Literasi & Numerasi'}
              </div>
            </div>

            {/* Section: Asesmen Literasi & Numerasi Resmi SMAN 3 Tumijajar (Only shown in LitNum mode) */}
            {portalMode === 'cbt_litnum' && (
              <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-indigo-700 text-white shadow-xl relative overflow-hidden border-2 border-amber-300">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Sparkles className="w-48 h-48 text-white" />
                </div>

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
                  <div className="space-y-2 max-w-xl">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-white/90">
                      <span className="flex items-center gap-1.5 text-white font-extrabold uppercase">
                        <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                        <span>MODUL LITERASI &amp; NUMERASI RESMI</span>
                      </span>
                      <span>&bull;</span>
                      <span>SMAN 3 Tumijajar</span>
                      <span>&bull;</span>
                      <span className={`font-black uppercase ${
                        liveSchedule.isAllowed ? 'text-emerald-300' : 'text-amber-300'
                      }`}>
                        {liveSchedule.isAllowed ? 'SESI AKTIF' : 'DITUTUP JADWAL'}
                      </span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      {liveSchedule.activeDomain === 'numerasi'
                        ? 'Asesmen Numerasi: Penalaran Sains & Matematika'
                        : 'Asesmen Literasi: Kemampuan Membaca & Wacana Kritis'}
                    </h3>

                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-medium">
                      Disusun &amp; diverifikasi langsung oleh Koordinator Literasi &amp; Numerasi bersama Tim Kurikulum SMAN 3 Tumijajar. Hasil pengerjaan otomatis tersinkronisasi untuk penguatan Rapor Pendidikan sekolah.
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-xs pt-1 text-white/90 font-mono">
                      <span>Jadwal: <strong>{liveSchedule.dayName} ({liveSchedule.activeDomain.toUpperCase()})</strong></span>
                      <span>•</span>
                      <span>Durasi: <strong>60 Menit</strong></span>
                      <span>•</span>
                      <span>Waktu: <strong>{liveSchedule.timeRangeText}</strong></span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleStartLitNumAssessment}
                      className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-950 font-black text-xs shadow-xl hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <BookOpen className="w-4 h-4 text-indigo-700" />
                      <span>Buka Petunjuk &amp; Mulai Pengerjaan</span>
                      <ChevronRight className="w-4 h-4 text-slate-700" />
                    </button>

                    <span className="text-[10px] text-white/80 text-center font-medium">
                      {liveSchedule.isAllowed ? 'Sesi Pengerjaan Sedang Dibuka' : 'Di luar jadwal pengerjaan resmi'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Section A: Active CBT Exams or 'No Exam Today' Notice */}
            {activeExamsList.length === 0 ? (
              <div className="bg-white/95 backdrop-blur-xl p-8 sm:p-10 rounded-3xl border-2 border-slate-200 shadow-xl text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center mx-auto shadow-sm">
                  <Calendar className="w-8 h-8 text-indigo-600" />
                </div>

                <div className="space-y-2 max-w-xl mx-auto">
                  <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-bold text-slate-600">
                    <span className="text-slate-800 font-black uppercase tracking-wider">
                      STATUS REAL-TIME: BELUM ADA AKTIVITAS UJIAN
                    </span>
                    <span>&bull;</span>
                    <span className="text-amber-800">Jadwal Kosong Default</span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                    Tidak Ada Jadwal Ujian CBT Aktif Saat Ini
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed font-medium">
                    Jadwal ujian CBT untuk siswa saat ini kosong (tidak ada aktivitas ujian). Jadwal akan muncul dan bekerja secara otomatis serta real-time hanya ketika Panitia/Proktor telah mengaturnya pada menu <strong>Pengaturan Jadwal Ujian</strong> di Manajemen Ujian.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 space-y-2 max-w-md mx-auto">
                  <div className="font-extrabold text-slate-900 border-b border-slate-200 pb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      <span>Data Akun Peserta CBT:</span>
                    </span>
                    <span className="text-[11px] text-emerald-700 font-bold">
                      Tersinkronisasi Real-Time
                    </span>
                  </div>
                  <p>• Nama Siswa: <strong>{loggedInStudent.nama}</strong></p>
                  <p>• NISN: <strong>{loggedInStudent.nisn}</strong> | Kelas: <strong>{loggedInStudent.kelas}</strong></p>
                  <p className="text-slate-500 italic text-[11px] pt-1">
                    * Begitu admin atau pengawas menambahkan jadwal di menu manajemen ujian, lembar ujian untuk kelas Anda akan langsung tampil di sini secara real-time tanpa perlu refresh browser.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleStudentLogout}
                    className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer inline-flex items-center gap-2 active:scale-95"
                  >
                    <LogOut className="w-4 h-4 text-rose-300" />
                    <span>Keluar &amp; Kembali ke Login</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Section A: Jadwal Pelaksanaan Ujian CBT */}
                <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-7 rounded-3xl border border-slate-200 shadow-md space-y-4">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base">Jadwal Pelaksanaan Ujian CBT Sekolah</h3>
                        <p className="text-[11px] text-slate-500">Terjadwal otomatis dan real-time dari Pengaturan Jadwal Ujian</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">T.P {school?.tahunAjaranAktif || '2026/2027'}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {activeExamsList.map((ex) => {
                      const isSelected = (activeSelectedExamObj?.id === ex.id);
                      return (
                        <div
                          key={ex.id}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/90 border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                              : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                          }`}
                          onClick={() => {
                            setSelectedExamId(ex.id);
                            setSelectedExamType(ex.type);
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-[10px] font-black uppercase text-indigo-700">
                              {ex.category || ex.type}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700">
                              {ex.status}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-slate-900 mb-1">{ex.subject}</h4>
                          <p className="text-[11px] text-slate-600 leading-tight mb-2">{ex.jadwalText}</p>
                          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-200/60 font-mono">
                            <span>{ex.durationMinutes} Menit</span>
                            <span>{ex.totalSoal} Soal</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Section B: Pilihan Ujian yang Aktif di CBT & Input Token */}
                {activeSelectedExamObj && (
                  <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-7 rounded-3xl border-2 border-indigo-200 shadow-lg space-y-5">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" />
                        <div>
                          <h3 className="font-black text-slate-900 text-base">Pilihan Ujian Aktif &amp; Verifikasi Token</h3>
                          <p className="text-xs text-slate-500">Pilih modul ujian di atas lalu masukkan Token Ujian dari Pengawas Ruang</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-black tracking-wider uppercase text-indigo-700 block">MODUL TERPILIH</span>
                          <h4 className="font-extrabold text-sm sm:text-base text-indigo-950">{activeSelectedExamObj.subject}</h4>
                          <p className="text-xs text-indigo-800">Guru Pengampu / Proktor: {activeSelectedExamObj.guruPengampu}</p>
                          {activeSelectedExamObj.roomName && (
                            <p className="text-[11px] text-indigo-600 font-medium">Ruang: {activeSelectedExamObj.roomName}</p>
                          )}
                        </div>
                        <div className="text-right font-mono text-xs text-indigo-900 font-bold shrink-0">
                          <div>Durasi: {activeSelectedExamObj.durationMinutes} Menit</div>
                          <div>Jumlah Soal: {activeSelectedExamObj.totalSoal} Soal</div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-indigo-200/80">
                        {activeSelectedExamObj.tokenRequired ? (
                          <>
                            <label className="block text-xs font-extrabold text-slate-800 mb-1 flex items-center gap-1.5">
                              <Key className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Masukkan Token Ujian 6-Digit (Diberikan Pengawas Ruang):</span>
                            </label>

                            <div className="flex flex-col sm:flex-row items-center gap-3">
                              <input
                                type="text"
                                maxLength={12}
                                value={inputToken}
                                onChange={(e) => setInputToken(e.target.value.toUpperCase())}
                                placeholder={`Contoh Token: ${activeSelectedExamObj.requiredToken || 'SMAN3-9X2K'}`}
                                className="flex-1 w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-black tracking-wider uppercase bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                              />

                              {activeSelectedExamObj.requiredToken && (
                                <button
                                  type="button"
                                  onClick={() => setInputToken(activeSelectedExamObj.requiredToken)}
                                  className="px-3 py-2.5 rounded-xl bg-indigo-100 hover:bg-indigo-200 text-indigo-900 font-bold text-xs shrink-0 cursor-pointer"
                                  title="Klik untuk auto-fill token aktif sesi"
                                >
                                  Isi Token Demo ({activeSelectedExamObj.requiredToken})
                                </button>
                              )}
                            </div>

                            {tokenError && (
                              <p className="text-xs text-rose-600 font-bold mt-1.5 flex items-center gap-1">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>{tokenError}</span>
                              </p>
                            )}
                          </>
                        ) : (
                          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>Sesi ujian ini diset <strong>Bebas Token</strong> oleh Panitia CBT. Anda dapat langsung melanjutkan ke petunjuk ujian.</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleProceedToInstructions}
                        className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
                      >
                        <span>Lanjutkan ke Petunjuk Pengerjaan</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* ==================================================================== */}
        {/* STEP 3: PETUNJUK PENGERJAAN LENGKAP UJIAN CBT                         */}
        {/* ==================================================================== */}
        {cbtStep === 'instructions' && loggedInStudent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-3xl mx-auto w-full space-y-6"
          >
            <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border-2 border-indigo-200 shadow-xl space-y-6 relative overflow-hidden">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-black tracking-wider uppercase text-indigo-700">
                    {isLitNumSession ? 'PETUNJUK ASESMEN RESMI LITNUM' : 'TATA TERTIB & PETUNJUK CBT'}
                  </p>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-1">
                    {isLitNumSession
                      ? `Petunjuk Pengerjaan Asesmen ${activeLitNumDomain === 'numerasi' ? 'Numerasi (Sains & Matematika)' : 'Literasi Membaca'}`
                      : 'Petunjuk Pengerjaan Lengkap Ujian CBT'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isLitNumSession
                      ? 'Penyusun: Koordinator Literasi & Numerasi SMAN 3 Tumijajar'
                      : `Mata Pelajaran: ${activeSelectedExamObj?.subject || 'Asesmen Sekolah'}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (initialMode === 'litnum') {
                      setCbtStep('login');
                    } else {
                      setCbtStep('dashboard');
                    }
                    scrollToTop({ smooth: true });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
                >
                  {initialMode === 'litnum' ? 'Ganti Siswa / Kembali' : 'Batal / Kembali'}
                </button>
              </div>

              {/* Instructions Rules List */}
              <div className="space-y-3 text-xs text-slate-700 leading-relaxed">
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 font-bold text-indigo-950 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
                  <span>Harap membaca petunjuk pengerjaan ini dengan seksama sebelum mengeklik tombol MULAI.</span>
                </div>

                {isLitNumSession ? (
                  <ol className="space-y-2.5 list-decimal pl-5 font-medium">
                    <li>
                      <strong className="text-slate-900">Stimulus Wacana &amp; Rumus:</strong> Bacalah wacana teks stimulus bacaan (untuk Literasi) atau perhatikan bantuan rumus matematika/fisika yang tertera pada butir soal secara cermat sebelum memilih opsi jawaban.
                    </li>
                    <li>
                      <strong className="text-slate-900">Variasi Model Soal:</strong> Asesmen ini terdiri dari Pilihan Ganda (1 jawaban benar), PG Kompleks (menceklis lebih dari satu jawaban benar), dan Benar/Salah sesuai standar Asesmen Nasional Kemendikdasmen.
                    </li>
                    <li>
                      <strong className="text-slate-900">Alokasi Waktu Pengerjaan:</strong> Waktu pengerjaan adalah <strong>60 Menit</strong> ({questions.length} butir soal). Penghitung waktu mundur akan terus berjalan selama Anda mengerjakan soal.
                    </li>
                    <li>
                      <strong className="text-slate-900">Penyimpanan &amp; Analisis Skor:</strong> Begitu selesai dan dikumpulkan, skor Anda akan otomatis diolah dan tersinkronisasi ke grafik persentase Rapor Pendidikan SMAN 3 Tumijajar.
                    </li>
                    <li>
                      <strong className="text-slate-900">Integritas Akademik:</strong> Kerjakanlah secara mandiri dan jujur untuk mengukur kompetensi literasi dan numerasi Anda yang sebenarnya.
                    </li>
                  </ol>
                ) : (
                  <ol className="space-y-2.5 list-decimal pl-5 font-medium">
                    <li>
                      <strong className="text-slate-900">Persiapan Perangkat:</strong> Pastikan perangkat Anda (Chromebook, Laptop, Tablet, atau HP) terhubung ke jaringan Wi-Fi/Internet sekolah secara stabil.
                    </li>
                    <li>
                      <strong className="text-slate-900">Verifikasi Data Siswa:</strong> Periksa kembali Nama: <strong>{loggedInStudent.nama}</strong>, NISN: <strong>{loggedInStudent.nisn}</strong>, dan Kelas: <strong>{loggedInStudent.kelas}</strong>.
                    </li>
                    <li>
                      <strong className="text-slate-900">Alokasi Waktu:</strong> Waktu pengerjaan adalah <strong>{activeSelectedExamObj?.durationMinutes || 90} Menit</strong>. Penghitung waktu mundur akan berjalan otomatis dan ujian akan otomatis terkumpul bila waktu habis.
                    </li>
                    <li>
                      <strong className="text-slate-900">Mekanisme Auto-Save:</strong> Setiap kali Anda memilih atau mengubah opsi jawaban, sistem secara otomatis menyimpan jawaban Anda secara local &amp; cloud.
                    </li>
                    <li>
                      <strong className="text-slate-900">Integritas &amp; Larangan:</strong> Dilarang berpindah tab browser, membuka aplikasi lain, atau melakukan tangkapan layar selama ujian berlangsung.
                    </li>
                  </ol>
                )}
              </div>

              {/* Agreement Checkbox */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={hasAgreedInstructions}
                    onChange={(e) => setHasAgreedInstructions(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded-md focus:ring-indigo-500 mt-0.5 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-slate-800 leading-snug">
                    {isLitNumSession
                      ? 'Saya memahami seluruh petunjuk pengerjaan asesmen literasi dan numerasi ini dan siap mengerjakan soal secara mandiri, jujur, dan sungguh-sungguh.'
                      : 'Saya telah membaca, memahami, dan menyetujui seluruh tata tertib serta petunjuk pengerjaan ujian CBT di atas. Saya berjanji akan mengerjakan ujian ini secara jujur.'}
                  </span>
                </label>
              </div>

              {/* Start Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={!hasAgreedInstructions}
                  onClick={handleStartCbtRunner}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-sm shadow-xl shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-5 h-5" />
                  <span>
                    {isLitNumSession
                      ? `MULAI KERJAKAN SOAL ${activeLitNumDomain.toUpperCase()}`
                      : 'MULAI KERJAKAN UJIAN SEKARANG'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ==================================================================== */}
        {/* STEP 4: HIGH PERFORMANCE CBT EXAM RUNNER (CHROMEBOOK OPTIMIZED)      */}
        {/* ==================================================================== */}
        {cbtStep === 'cbt_runner' && currentQ && loggedInStudent && (
          <div className="space-y-4 max-w-6xl mx-auto w-full">
            {/* Fullscreen Lock Kiosk Overlay - Strict Question Blocker */}
            {(!isDeviceFullscreen || !proctor.isFullscreen) && (
              <div
                className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 select-none"
                onContextMenu={(e) => e.preventDefault()}
              >
                <div className="bg-slate-900 border-2 border-rose-500 p-6 sm:p-8 rounded-3xl max-w-lg w-full text-center space-y-6 shadow-2xl text-white animate-scale-in">
                  <div className="w-20 h-20 rounded-3xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto shadow-xl animate-pulse">
                    <Maximize2 className="w-10 h-10 stroke-[2.5]" />
                  </div>
                  <div className="space-y-2">
                    <span className="px-3.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase tracking-widest inline-block">
                      PERINGATAN PENGUNCIAN LAYAR &bull; KIOSK MODE
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                      Layar Penuh Terputus &amp; Soal Dikunci
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
                      Anda terdeteksi keluar dari mode layar penuh (Full Screen / tombol Esc). Lembar soal terhalang otomatis demi menjaga integritas dan kerahasiaan asesmen. Log pelanggaran telah dikirimkan ke monitor Proktor.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 text-xs text-slate-300 flex items-center justify-between font-mono">
                    <span className="font-bold text-slate-400">Workstation ID:</span>
                    <strong className="text-emerald-400 font-black">{currentWorkstationId}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await requestAutoFullscreen();
                      proctor.requestExamFullscreen();
                      setIsDeviceFullscreen(true);
                    }}
                    className="w-full py-4 px-6 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 transition-all cursor-pointer flex items-center justify-center gap-2 touch-manipulation min-h-[50px]"
                  >
                    <Maximize2 className="w-5 h-5" />
                    <span>Kembali ke Layar Penuh</span>
                  </button>
                </div>
              </div>
            )}
            {/* Top Exam Header Bar */}
            <div className="bg-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300">
                  <BookOpenCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs sm:text-sm">
                    {activeSelectedExamObj?.subject || (isLitNumSession ? 'Asesmen Literasi & Numerasi' : 'Asesmen CBT')}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {loggedInStudent.nama} ({loggedInStudent.kelas}) • NISN: {loggedInStudent.nisn}
                  </p>
                </div>
              </div>

              {/* Center/Right Toolbar */}
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                {/* Live Countdown Timer */}
                <div
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono font-black text-xs sm:text-sm shadow-inner ${
                    timeLeftSeconds < 300
                      ? 'bg-rose-600 text-white animate-pulse'
                      : timeLeftSeconds < 900
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-slate-800 text-emerald-400 border border-slate-700'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(timeLeftSeconds)}</span>
                </div>

                {/* Font Size Adjuster for Chromebook / Accessibility */}
                <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700 text-xs">
                  <button
                    type="button"
                    onClick={() => setFontSize('small')}
                    className={`px-2 py-0.5 rounded-lg font-bold ${fontSize === 'small' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    A-
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('medium')}
                    className={`px-2 py-0.5 rounded-lg font-bold ${fontSize === 'medium' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSize('large')}
                    className={`px-2 py-0.5 rounded-lg font-bold ${fontSize === 'large' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
                  >
                    A+
                  </button>
                </div>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  title="Layar Penuh Chromebook"
                >
                  {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                {/* Toggle Sembunyikan / Tampilkan Daftar Nomor Soal */}
                <button
                  type="button"
                  onClick={() => setIsQuestionNavOpen((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95 ${
                    isQuestionNavOpen
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/30'
                  }`}
                  title={isQuestionNavOpen ? 'Sembunyikan Panel Daftar Nomor Soal' : 'Tampilkan Panel Daftar Nomor Soal'}
                >
                  {isQuestionNavOpen ? (
                    <>
                      <PanelRightClose className="w-3.5 h-3.5 text-slate-400" />
                      <span className="hidden sm:inline">Sembunyikan Soal</span>
                    </>
                  ) : (
                    <>
                      <PanelRightOpen className="w-3.5 h-3.5 text-white" />
                      <span>Daftar Soal ({answeredCount}/{totalQuestionsCount})</span>
                    </>
                  )}
                </button>

                {/* Live Multi-Level Anti-Cheat Indicator Badge */}
                <div className="flex items-center gap-1.5">
                  {proctor.isBlocked ? (
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-rose-600 text-white flex items-center gap-1.5 shadow-sm">
                      <UserX className="w-3.5 h-3.5" />
                      <span>🔴 TERBLOKIR OTOMATIS (6/6)</span>
                    </span>
                  ) : proctor.lockStage === 1 ? (
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-500 text-white flex items-center gap-1.5 animate-pulse shadow-sm">
                      <Lock className="w-3.5 h-3.5" />
                      <span>🟡 TERKUNCI PIN (Siklus 1)</span>
                    </span>
                  ) : proctor.violationCount > 0 ? (
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-amber-400 text-slate-950 flex items-center gap-1.5 shadow-sm">
                      <Clock className="w-3.5 h-3.5" />
                      <span>🟡 PERINGATAN ({proctor.violationCount}/6)</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>🟢 AMAN / FOKUS</span>
                    </span>
                  )}
                </div>

                {/* Fullscreen Requirement Button */}
                {!proctor.isFullscreen && (
                  <button
                    type="button"
                    onClick={proctor.requestExamFullscreen}
                    className="px-2.5 py-1 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 animate-pulse shadow-sm cursor-pointer"
                    title="Aktifkan Layar Penuh"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Mode Layar Penuh (Wajib)</span>
                  </button>
                )}

                {/* Real-time 3-State Connection & Sync Status Indicator (Pilar 2) */}
                {!isOnline ? (
                  <div className="flex items-center gap-1.5 text-xs text-rose-300 font-bold bg-rose-950/90 px-3 py-1.5 rounded-xl border border-rose-700 shadow-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                    <span>🔴 Mode Offline (Jawaban Aman di Perangkat - Jangan Tutup Browser)</span>
                  </div>
                ) : syncStatus === 'SAVED_LOCALLY' || syncStatus === 'SYNCING' ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold bg-amber-950/90 px-3 py-1.5 rounded-xl border border-amber-700 shadow-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                    <Wifi className="w-3.5 h-3.5 text-amber-400" />
                    <span>🟡 {syncStatus === 'SYNCING' ? 'Menyinkronkan ke Server...' : 'Menyimpan ke Lokal (Menunggu Sinkronisasi)'}</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-bold bg-emerald-950/90 px-3 py-1.5 rounded-xl border border-emerald-700 shadow-xs">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>🟢 Terhubung &amp; Tersinkronisasi</span>
                  </div>
                )}

                {/* Manual Sync Button */}
                <button
                  type="button"
                  onClick={async () => {
                    await performBatchSync(studentAnswers);
                    showToast('Sinkronisasi Berhasil', 'Seluruh jawaban Anda aman tersimpan di server sekolah & perangkat.', 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  title="Sinkronisasi Jawaban Sekarang ke Server"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'SYNCING' ? 'animate-spin text-amber-400' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline">Sinkronisasi Jawaban</span>
                </button>
              </div>
            </div>

            {/* Real-time Broadcast & Emergency Announcement Banner/Modal (Pilar 1) */}
            <CbtStudentBroadcastBanner
              studentId={loggedInStudent.id}
              studentName={loggedInStudent.nama}
              examType={isLitNumSession ? 'CBT_LITNUM' : 'CBT_UMUM'}
              sessionName={activeSelectedExamObj?.title || (isLitNumSession ? 'Asesmen Literasi & Numerasi' : 'Ujian CBT')}
              roomName={activeSelectedExamObj?.roomName || loggedInStudent.kelas}
              onTimeExtensionReceived={(mins) => {
                setTimeLeftSeconds((prev) => prev + mins * 60);
                setTargetEndTime((prev) => (prev || Date.now()) + mins * 60 * 1000);
                showToast(
                  'Kompensasi Waktu Diterima!',
                  `Waktu ujian Anda ditambahkan +${mins} menit oleh Pengawas/Admin atas kompensasi kendala teknis.`,
                  'info'
                );
              }}
            />

            {/* Main Exam Runner Body */}
            <div className={`grid grid-cols-1 ${isQuestionNavOpen ? 'lg:grid-cols-4' : 'lg:grid-cols-1'} gap-4 sm:gap-6 items-start transition-all duration-300`}>
              {/* Left Column (3/4 width or Full Width when navigation is collapsed) */}
              <div
                className={`${
                  isQuestionNavOpen ? 'lg:col-span-3' : 'lg:col-span-1 w-full max-w-5xl mx-auto'
                } space-y-4 select-none ${
                  proctor.showYellowModal ? 'filter blur-[5px] pointer-events-none transition-all duration-200' : ''
                }`}
                onContextMenu={(e) => e.preventDefault()}
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onPaste={(e) => e.preventDefault()}
              >
                {/* EMERGENCY SUSULAN REDIRECT SCREEN (KENDALA TEKNIS) (Pilar 3) */}
                {proctor.isSusulanRedirect ? (
                  <div className="bg-amber-950/95 text-white p-8 sm:p-12 rounded-3xl border-4 border-amber-500 shadow-2xl text-center space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center mx-auto shadow-xl animate-pulse">
                      <AlertTriangle className="w-10 h-10" />
                    </div>
                    <div className="space-y-3 max-w-xl mx-auto">
                      <span className="px-4 py-1.5 rounded-full text-xs font-black bg-amber-400/20 text-amber-300 border border-amber-400/40 uppercase tracking-widest inline-block">
                        SESI UJIAN DIALIHKAN KE SESI SUSULAN
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                        KENDALA TEKNIS TERDETEKSI: SESI ANDA TELAH DIBEKUKAN OLEH PENGAWAS
                      </h3>
                      <p className="text-xs sm:text-sm text-amber-200 leading-relaxed font-medium">
                        {proctor.susulanReason || 'Terjadi gangguan jaringan atau kendala teknis pada server ujian. Jawaban dan sisa waktu pengerjaan Anda telah dibekukan secara aman dan otomatis dicatat ke dalam Berita Acara Pelaksanaan (BAP).'}
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-slate-200 text-xs max-w-lg mx-auto text-left space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400 font-bold">Status Peserta:</span>
                        <span className="font-mono font-black text-amber-400">SUSULAN KENDALA TEKNIS</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-slate-400 font-bold">Jawaban Tersimpan Aman:</span>
                        <span className="font-mono font-black text-emerald-400">{answeredCount} dari {totalQuestionsCount} Soal</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold">Sisa Waktu Dibekukan:</span>
                        <span className="font-mono font-black text-indigo-400">{Math.floor(timeLeftSeconds / 60)} Menit {timeLeftSeconds % 60} Detik</span>
                      </div>
                    </div>

                    <p className="text-[11.5px] text-slate-400 max-w-md mx-auto">
                      Mohon tenang dan ikuti arahan Pengawas Ruangan. Anda akan dijadwalkan kembali pada Sesi Susulan tanpa kehilangan progres jawaban Anda.
                    </p>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCbtStep('dashboard');
                          scrollToTop({ smooth: true });
                        }}
                        className="px-8 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition-all shadow-xl shadow-amber-500/20 active:scale-95 cursor-pointer"
                      >
                        Tutup Layar Ujian &amp; Kembali ke Halaman Utama
                      </button>
                    </div>
                  </div>
                ) : proctor.isLocked || proctor.antiCheatColor === 'RED' ? (
                  <div className="bg-rose-950/95 text-white p-8 sm:p-12 rounded-3xl border-4 border-rose-600 shadow-2xl text-center space-y-6">
                    <div className="w-20 h-20 rounded-3xl bg-rose-600 text-white flex items-center justify-center mx-auto shadow-xl animate-bounce">
                      <Lock className="w-10 h-10" />
                    </div>
                    <div className="space-y-3 max-w-xl mx-auto">
                      <span className="px-4 py-1.5 rounded-full text-xs font-black bg-rose-500/30 text-rose-300 border border-rose-500/50 uppercase tracking-widest inline-block">
                        UJIAN DIBEKUKAN OTOMATIS (STATUS MERAH)
                      </span>
                      <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                        UJIAN ANDA DIBEKUKAN KARENA TERDETEKSI KECURANGAN (KELUAR APLIKASI / SPLIT SCREEN)
                      </h3>
                      <p className="text-xs sm:text-sm text-rose-200 leading-relaxed font-medium">
                        Silakan hubungi Proktor / Pengawas Ruangan di depan kelas untuk membuka kunci ujian Anda.
                      </p>
                    </div>

                    {proctor.isSplitScreen && (
                      <div className="p-4 rounded-2xl bg-rose-900/90 border-2 border-amber-400 text-rose-100 text-xs sm:text-sm font-bold flex items-center gap-3 text-left max-w-lg mx-auto shadow-md">
                        <AlertTriangle className="w-6 h-6 text-amber-300 shrink-0 animate-pulse" />
                        <div>
                          <span className="block font-black text-amber-300 uppercase">Indikasi Layar Belah (Split-Screen) Masih Aktif!</span>
                          <span className="text-[11px] font-normal text-rose-200">
                            Kembalikan layar HP Anda ke mode satu layar penuh sebelum meminta Proktor membuka kunci.
                          </span>
                        </div>
                      </div>
                    )}

                    {proctor.warningMessage && (
                      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700 text-slate-200 text-xs max-w-md mx-auto">
                        <span className="font-bold text-amber-400 block mb-1">Catatan Pengawas:</span>
                        <p>{proctor.warningMessage}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <div className="px-3.5 py-1.5 rounded-xl bg-rose-900/80 border border-rose-700 text-xs font-mono text-rose-300">
                        Total Pelanggaran: <strong>{proctor.violationCount} Kali</strong>
                      </div>
                    </div>
                  </div>
                ) : (
                <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
                  {/* Question Header Badge */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-extrabold text-xs shadow-2xs">
                        Soal Nomor {currentQuestionIdx + 1}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200">
                        {currentQ.modelSoal === 'BS'
                          ? 'Benar / Salah'
                          : currentQ.modelSoal === 'PG_KOMPLEKS'
                          ? 'PG Kompleks (Menceklis Beberapa)'
                          : 'Pilihan Ganda'}
                      </span>
                    </div>

                    <span className="text-xs font-bold text-slate-500">Bobot: {currentQ.skor} Poin</span>
                  </div>

                  {/* Reading Passage Stimulus Box for Literasi */}
                  {(() => {
                    const activePassage = currentPassages.find((p) =>
                      (currentQ.wacanaId && p.id === currentQ.wacanaId) ||
                      (p.nomorSoalTerkait && p.nomorSoalTerkait.includes(currentQuestionIdx + 1))
                    ) || (isLitNumSession && activeLitNumDomain === 'literasi' && currentPassages[0]);

                    if (!activePassage) return null;

                    return (
                      <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border-2 border-amber-200 text-slate-800 space-y-2.5 shadow-2xs">
                        <div className="flex items-center justify-between gap-2 border-b border-amber-200/80 pb-2">
                          <div className="text-[11px] font-black uppercase text-amber-950 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-amber-800" />
                            <span>Wacana Stimulus Bacaan</span>
                          </div>
                          {activePassage.nomorSoalTerkait && (
                            <span className="text-[10.5px] font-bold text-amber-900 font-mono">
                              Terkait Soal Nomor {activePassage.nomorSoalTerkait.join(', ')}
                            </span>
                          )}
                        </div>
                        <h4 className="font-extrabold text-xs sm:text-sm text-amber-950">{activePassage.judul}</h4>
                        <p className="text-xs leading-relaxed text-slate-800 whitespace-pre-line font-medium text-justify">
                          {activePassage.konten || activePassage.teks}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Question Body Text */}
                  <div
                    className={`text-slate-900 leading-relaxed font-medium space-y-3 ${
                      fontSize === 'small' ? 'text-xs' : fontSize === 'large' ? 'text-base' : 'text-sm'
                    }`}
                  >
                    <FormattedQuestionText text={currentQ.soal} />

                    {currentQ.gambarSoalUrl && (
                      <div className="p-2 bg-slate-100 rounded-2xl border border-slate-200 inline-block">
                        <img
                          src={currentQ.gambarSoalUrl}
                          alt="Gambar Soal"
                          className="max-h-60 rounded-xl object-contain"
                        />
                      </div>
                    )}
                  </div>

                  {/* Answer Choices */}
                  <div className="pt-2 space-y-3">
                    {currentQ.modelSoal === 'BS' ? (
                      /* Model Benar / Salah */
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {['A', 'B'].map((optKey) => {
                          const label = optKey === 'A' ? 'BENAR' : 'SALAH';
                          const isSelected = studentAnswers[currentQuestionIdx] === optKey;
                          return (
                            <button
                              key={optKey}
                              type="button"
                              onClick={() => handleSelectOption(optKey)}
                              className={`p-4 rounded-2xl border-2 font-bold text-sm flex items-center gap-3 transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                              }`}
                            >
                              <div
                                className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                                  isSelected ? 'bg-white text-indigo-700' : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {optKey}
                              </div>
                              <span>{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : currentQ.modelSoal === 'PG_KOMPLEKS' ? (
                      /* Model PG Kompleks (Checkboxes) */
                      <div className="space-y-2.5">
                        <p className="text-xs font-bold text-purple-900 bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                          Ceklis satu atau beberapa jawaban yang menurut Anda BENAR:
                        </p>
                        {['A', 'B', 'C', 'D', 'E'].map((optKey) => {
                          const optionText = (currentQ.pilihan as any)[optKey];
                          if (!optionText && optKey !== 'A' && optKey !== 'B') return null;
                          const selectedMulti = studentMultiAnswers[currentQuestionIdx] || [];
                          const isChecked = selectedMulti.includes(optKey);

                          return (
                            <div
                              key={optKey}
                              onClick={() => handleSelectOption(optKey)}
                              className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3 ${
                                isChecked
                                  ? 'bg-purple-50/90 border-purple-500 shadow-xs'
                                  : 'bg-white hover:bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div
                                className={`w-5 h-5 rounded-md flex items-center justify-center border font-bold text-xs ${
                                  isChecked
                                    ? 'bg-purple-600 text-white border-purple-600'
                                    : 'bg-white border-slate-300 text-transparent'
                                }`}
                              >
                                {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </div>
                              <span className="font-extrabold text-xs text-purple-950 w-5">{optKey}.</span>
                              <span className="text-xs text-slate-800 font-medium flex-1">
                                {renderInlineFormattedText(optionText || `Pilihan Opsi ${optKey}`, `opt-multi-${optKey}`)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : currentQ.modelSoal === 'MATRIX_TF' ? (
                      /* Model Pilihan Ganda Kompleks - Matrix True/False */
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-indigo-950 bg-indigo-50 p-2.5 rounded-xl border border-indigo-200">
                          Tentukan pilihan (Benar/Salah atau Sesuai/Tidak Sesuai) untuk setiap baris pernyataan:
                        </p>
                        <div className="overflow-x-auto rounded-2xl border border-slate-200">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 text-slate-800 font-extrabold uppercase text-[10.5px]">
                              <tr>
                                <th className="p-3 w-10 text-center">No</th>
                                <th className="p-3">Pernyataan</th>
                                <th className="p-3 w-28 text-center bg-emerald-50 text-emerald-800">Benar / Sesuai</th>
                                <th className="p-3 w-28 text-center bg-rose-50 text-rose-800">Salah / Tdk Sesuai</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(currentQ.matrixRows || [
                                { id: 'r1', statement: 'Pernyataan turunan 1', correctChoice: 'BENAR' },
                                { id: 'r2', statement: 'Pernyataan turunan 2', correctChoice: 'SALAH' },
                              ]).map((row, rIdx) => {
                                let matrixMap: Record<string, string> = {};
                                try {
                                  matrixMap = JSON.parse(studentAnswers[currentQuestionIdx] || '{}');
                                } catch {
                                  matrixMap = {};
                                }
                                const currentVal = matrixMap[row.id];

                                return (
                                  <tr key={row.id} className="hover:bg-slate-50/80">
                                    <td className="p-3 text-center font-bold text-slate-500">{rIdx + 1}</td>
                                    <td className="p-3 text-slate-900 font-medium">{(row as any).pernyataan || (row as any).statement}</td>
                                    <td className="p-3 text-center bg-emerald-50/30">
                                      <input
                                        type="radio"
                                        name={`matrix_${currentQuestionIdx}_${row.id}`}
                                        checked={currentVal === 'BENAR' || currentVal === 'Benar' || currentVal === 'Sesuai'}
                                        onChange={() => {
                                          const next = { ...matrixMap, [row.id]: 'BENAR' };
                                          const updatedAns = {
                                            ...studentAnswers,
                                            [currentQuestionIdx]: JSON.stringify(next),
                                          };
                                          setStudentAnswers(updatedAns);
                                          persistCbtStateLocally(updatedAns, studentMultiAnswers, raguQuestions);
                                        }}
                                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                      />
                                    </td>
                                    <td className="p-3 text-center bg-rose-50/30">
                                      <input
                                        type="radio"
                                        name={`matrix_${currentQuestionIdx}_${row.id}`}
                                        checked={currentVal === 'SALAH' || currentVal === 'Salah' || currentVal === 'Tidak Sesuai'}
                                        onChange={() => {
                                          const next = { ...matrixMap, [row.id]: 'SALAH' };
                                          const updatedAns = {
                                            ...studentAnswers,
                                            [currentQuestionIdx]: JSON.stringify(next),
                                          };
                                          setStudentAnswers(updatedAns);
                                          persistCbtStateLocally(updatedAns, studentMultiAnswers, raguQuestions);
                                        }}
                                        className="w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                      />
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : currentQ.modelSoal === 'MENJODOHKAN' ? (
                      /* Model Menjodohkan (Matching) */
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-teal-950 bg-teal-50 p-2.5 rounded-xl border border-teal-200">
                          Pasangkan setiap premis di sebelah kiri dengan pilihan jawaban yang tepat di sebelah kanan:
                        </p>
                        <div className="space-y-2.5">
                          {(currentQ.matchingPairs || [
                            { id: 'm1', premis: 'Premis 1', jawaban: 'Jawaban 1' },
                            { id: 'm2', premis: 'Premis 2', jawaban: 'Jawaban 2' },
                          ]).map((pair, pIdx) => {
                            let matchMap: Record<string, string> = {};
                            try {
                              matchMap = JSON.parse(studentAnswers[currentQuestionIdx] || '{}');
                            } catch {
                              matchMap = {};
                            }
                            const currentMatch = matchMap[pair.id] || '';
                            const allResponses = (currentQ.matchingPairs || []).map((p: any) => p.jawaban || p.response);

                            return (
                              <div
                                key={pair.id}
                                className="p-3 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                                    {pIdx + 1}
                                  </span>
                                  <span className="font-semibold text-slate-900">{(pair as any).premis || (pair as any).premise}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400 font-bold">&rarr;</span>
                                  <select
                                    value={currentMatch}
                                    onChange={(e) => {
                                      const next = { ...matchMap, [pair.id]: e.target.value };
                                      const updatedAns = {
                                        ...studentAnswers,
                                        [currentQuestionIdx]: JSON.stringify(next),
                                      };
                                      setStudentAnswers(updatedAns);
                                      persistCbtStateLocally(updatedAns, studentMultiAnswers, raguQuestions);
                                    }}
                                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold text-slate-800 focus:outline-hidden focus:border-teal-600 cursor-pointer text-xs"
                                  >
                                    <option value="">-- Pilih Pasangan --</option>
                                    {allResponses.map((resp, rIdx) => (
                                      <option key={rIdx} value={resp}>
                                        {resp}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : currentQ.modelSoal === 'ISIAN_SINGKAT' ? (
                      /* Model Isian Singkat */
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-cyan-950 bg-cyan-50 p-2.5 rounded-xl border border-cyan-200">
                          Ketikkan jawaban singkat Anda (kata kunci atau angka) pada kolom di bawah:
                        </p>
                        <input
                          type="text"
                          value={studentAnswers[currentQuestionIdx] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updatedAns = { ...studentAnswers, [currentQuestionIdx]: val };
                            setStudentAnswers(updatedAns);
                            persistCbtStateLocally(updatedAns, studentMultiAnswers, raguQuestions);
                          }}
                          placeholder="Ketik jawaban singkat di sini..."
                          className="w-full px-4 py-3 rounded-2xl bg-white border-2 border-slate-300 focus:border-indigo-600 focus:outline-hidden text-sm font-bold text-slate-900 shadow-xs"
                        />
                      </div>
                    ) : currentQ.modelSoal === 'URAIAN' ? (
                      /* Model Uraian / Essay */
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-indigo-950 bg-indigo-50 p-2.5 rounded-xl border border-indigo-200">
                          Tuliskan uraian penjelasan dan jawaban lengkap Anda secara deskriptif pada kolom berikut:
                        </p>
                        <textarea
                          rows={6}
                          value={studentEssayAnswers[currentQuestionIdx] || studentAnswers[currentQuestionIdx] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updatedEssay = { ...studentEssayAnswers, [currentQuestionIdx]: val };
                            const updatedAns = { ...studentAnswers, [currentQuestionIdx]: val };
                            setStudentEssayAnswers(updatedEssay);
                            setStudentAnswers(updatedAns);
                            persistCbtStateLocally(updatedAns, studentMultiAnswers, raguQuestions, updatedEssay);
                          }}
                          placeholder="Tuliskan uraian jawaban Anda di sini secara rinci dan jelas..."
                          className="w-full p-4 rounded-2xl bg-white border-2 border-slate-300 focus:border-indigo-600 focus:outline-hidden text-xs sm:text-sm leading-relaxed text-slate-900 shadow-xs font-medium"
                        />
                      </div>
                    ) : (
                      /* Model PG Standard (A - E) with Touch Targets >= 48px */
                      <div className="space-y-3">
                        {['A', 'B', 'C', 'D', 'E'].map((optKey) => {
                          const optionText = (currentQ.pilihan as any)[optKey];
                          if (!optionText && optKey === 'E') return null; // handle 4 options if E is empty
                          const isSelected = studentAnswers[currentQuestionIdx] === optKey;

                          return (
                            <div
                              key={optKey}
                              onClick={() => handleSelectOption(optKey)}
                              className={`min-h-[50px] sm:min-h-[54px] p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center gap-3.5 touch-manipulation active:scale-[0.99] ${
                                isSelected
                                  ? 'bg-indigo-50/90 border-indigo-600 shadow-xs ring-1 ring-indigo-500/20'
                                  : 'bg-white hover:bg-slate-50 border-slate-200'
                              }`}
                            >
                              <div
                                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shrink-0 ${
                                  isSelected ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {optKey}
                              </div>
                              <div className="flex-1">
                                <span className="text-xs sm:text-sm text-slate-900 font-medium leading-relaxed block">
                                  {renderInlineFormattedText(optionText || `Pilihan Opsi ${optKey}`, `opt-std-${optKey}`)}
                                </span>
                                {currentQ.pilihanGambarUrl?.[optKey as keyof typeof currentQ.pilihanGambarUrl] && (
                                  <div className="mt-1.5 p-1 rounded-xl bg-slate-50 border border-slate-200 inline-block">
                                    <img
                                      src={currentQ.pilihanGambarUrl[optKey as keyof typeof currentQ.pilihanGambarUrl]}
                                      alt={`Pilihan ${optKey}`}
                                      className="max-h-28 rounded-lg object-contain"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Navigation Control Buttons with Touch Targets >= 48px */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        disabled={currentQuestionIdx === 0}
                        onClick={() => setCurrentQuestionIdx((prev) => Math.max(0, prev - 1))}
                        className="min-h-[48px] px-4 sm:px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-extrabold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed touch-manipulation"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Soal Sebelumnya</span>
                      </button>

                      <button
                        type="button"
                        onClick={toggleRaguRagu}
                        className={`min-h-[48px] px-4 sm:px-5 py-3 rounded-2xl font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs touch-manipulation active:scale-95 ${
                          raguQuestions[currentQuestionIdx]
                            ? 'bg-amber-500 text-slate-950 border border-amber-600'
                            : 'bg-amber-100/80 hover:bg-amber-200 text-amber-950 border border-amber-300'
                        }`}
                      >
                        <AlertTriangle className="w-4 h-4" />
                        <span>{raguQuestions[currentQuestionIdx] ? 'RAGU-RAGU (DITANDAI)' : 'TANDAI RAGU-RAGU'}</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Tombol Toggle Daftar Soal di Bilah Navigasi Bawah */}
                      <button
                        type="button"
                        onClick={() => setIsQuestionNavOpen((prev) => !prev)}
                        className={`min-h-[48px] px-4 py-3 rounded-2xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 ${
                          isQuestionNavOpen
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                            : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs'
                        }`}
                        title={isQuestionNavOpen ? 'Sembunyikan panel nomor soal agar lembar soal lebih luas' : 'Buka panel nomor soal'}
                      >
                        {isQuestionNavOpen ? (
                          <>
                            <PanelRightClose className="w-4 h-4 text-slate-500" />
                            <span className="hidden sm:inline">Sembunyikan Panel</span>
                          </>
                        ) : (
                          <>
                            <PanelRightOpen className="w-4 h-4 text-indigo-600" />
                            <span>Daftar Nomor ({currentQuestionIdx + 1}/{questions.length})</span>
                          </>
                        )}
                      </button>

                      {currentQuestionIdx < questions.length - 1 ? (
                        <button
                          type="button"
                          onClick={() => setCurrentQuestionIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                          className="min-h-[48px] px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation"
                        >
                          <span>Soal Selanjutnya</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowSubmitModal(true)}
                          className="min-h-[48px] px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 touch-manipulation"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Selesai &amp; Kumpulkan</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

              {/* Right Column: Question Number Navigation Panel Component */}
              <AnimatePresence>
                {isQuestionNavOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="lg:col-span-1 space-y-4"
                  >
                    <CbtQuestionNavigationPanel
                      questions={questions}
                      currentQuestionIdx={currentQuestionIdx}
                      onSelectQuestion={(idx) => setCurrentQuestionIdx(idx)}
                      studentAnswers={studentAnswers}
                      raguQuestions={raguQuestions}
                      onFinishExam={() => setShowSubmitModal(true)}
                      isOpen={isQuestionNavOpen}
                      onToggleOpen={() => setIsQuestionNavOpen((prev) => !prev)}
                      answeredCount={answeredCount}
                      raguCount={raguCount}
                      totalQuestionsCount={totalQuestionsCount}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Tombol Floating Cepat untuk Membuka Kembali Panel Jika Sedang Disembunyikan */}
            {!isQuestionNavOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 16 }}
                className="fixed bottom-6 right-6 z-40"
              >
                <button
                  type="button"
                  onClick={() => setIsQuestionNavOpen(true)}
                  className="px-5 py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs shadow-2xl shadow-indigo-600/40 flex items-center gap-2.5 cursor-pointer transition-all touch-manipulation border-2 border-white/20"
                >
                  <ListOrdered className="w-4 h-4" />
                  <span>Daftar Soal ({answeredCount}/{totalQuestionsCount})</span>
                </button>
              </motion.div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* STEP 5: CBT RESULT SUMMARY (LEMBAR JAWAB BERHASIL DIKUMPULKAN)       */}
        {/* ==================================================================== */}
        {cbtStep === 'result' && loggedInStudent && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-xl mx-auto w-full space-y-5"
          >
            <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border-2 border-emerald-400 shadow-2xl space-y-6 text-center relative overflow-hidden">
              <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-300 shadow-lg">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3.5 py-1 rounded-full border border-emerald-300 inline-block shadow-2xs">
                  LEMBAR JAWABAN TERKIRIM
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Ujian Selesai &amp; Tersimpan
                </h2>
                <p className="text-sm text-slate-700 font-bold leading-relaxed max-w-md mx-auto">
                  Terima kasih <span className="text-emerald-700 font-black">{loggedInStudent.nama}</span>, jawaban ASAJ Anda telah tersimpan dengan aman di sistem.
                </p>
              </div>

              {/* Ringkasan Identitas & Status Verifikasi (Nilai Dirahasiakan) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Tanda Bukti Penyerahan Ujian</span>
                  </span>
                  <span className="text-[10.5px] font-mono font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Status: Draft (Terkirim)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Nama Lengkap Siswa:</span>
                    <strong className="text-slate-900 font-bold">{loggedInStudent.nama}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">NISN / Kelas:</span>
                    <strong className="text-slate-900 font-bold">{loggedInStudent.nisn} ({loggedInStudent.kelas})</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Mata Pelajaran / Sesi:</span>
                    <strong className="text-slate-900 font-bold">
                      {isLitNumSession ? `Asesmen LitNum (${activeLitNumDomain.toUpperCase()})` : (activeSelectedExamObj?.subject || activeSelectedExamObj?.title || 'Ujian CBT')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Waktu Selesai:</span>
                    <strong className="text-slate-900 font-mono">
                      {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </strong>
                  </div>
                </div>

                {submissionSecurityCode && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-500 font-bold">Kode Otentikasi:</span>
                    <span className="font-black text-slate-900">{submissionSecurityCode}</span>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium leading-relaxed">
                  * Catatan: Nilai hasil ujian dirahasiakan dan tidak ditampilkan ke siswa demi integritas asesmen. Hasil akan diumumkan secara resmi oleh Proktor / Guru / Sekolah setelah masa pengoreksian selesai.
                </div>
              </div>

              {/* 5-Second Countdown Auto-Redirect Bar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-emerald-600/40">
                <div className="flex items-center gap-3.5 text-left">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 font-black text-2xl font-mono animate-pulse">
                    {redirectCountdown}
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 block">
                      Auto-Logout &amp; Pengalihan Otomatis
                    </span>
                    <p className="text-xs text-slate-200 font-medium leading-snug">
                      Keluar otomatis ke halaman login dalam <strong className="text-emerald-400 font-mono text-sm">{redirectCountdown}</strong> detik...
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAutoRedirectAfterExam}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md shrink-0 flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Kembali ke Halaman Login Sekarang</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleAutoRedirectAfterExam}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-95 touch-manipulation min-h-[48px]"
              >
                <Home className="w-4 h-4" />
                <span>Kembali ke Halaman Login Sekarang</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* ==================================================================== */}
      {/* MODAL 2: CONFIRMATION BEFORE FINAL SUBMISSION                        */}
      {/* ==================================================================== */}
      <AnimatePresence>
        {showSubmitModal && (
          <div
            onClick={() => setShowSubmitModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 cursor-default space-y-5"
            >
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto border border-amber-300">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="font-black text-lg text-slate-900">Konfirmasi Pengumpulan Lembar Jawab</h3>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  Apakah Anda yakin ingin mengakhiri ujian dan mengirimkan seluruh jawaban Anda sekarang? Setelah dikirimkan, Anda tidak dapat kembali mengubah jawaban.
                </p>
              </div>

              {/* Tally Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-bold">
                <div className="flex items-center justify-between text-emerald-800">
                  <span>Sudah Dijawab:</span>
                  <span className="font-mono text-sm">{answeredCount} Soal</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>Belum Dijawab (Kosong):</span>
                  <span className="font-mono text-sm">{totalQuestionsCount - answeredCount} Soal</span>
                </div>
                <div className="flex items-center justify-between text-amber-800">
                  <span>Tandai Ragu-Ragu:</span>
                  <span className="font-mono text-sm">{raguCount} Soal</span>
                </div>
              </div>

              {raguCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Masih terdapat {raguCount} soal bertanda Ragu-Ragu. Anda tetap dapat mengumpulkannya.</span>
                </div>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs cursor-pointer min-h-[48px] touch-manipulation flex items-center justify-center"
                >
                  Periksa Kembali
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmitExam}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md cursor-pointer min-h-[48px] touch-manipulation flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Ya, Selesaikan &amp; Kirim Jawaban</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MULTI-LEVEL ANTI-CHEAT MODAL SYSTEM (PERINGATAN, SIKLUS 1 KUNCI PIN + ALARM, SIKLUS 2 BLOKIR OTOMATIS) */}
      <AntiCheatModal
        showWarningModal={cbtStep === 'cbt_runner' && proctor.showWarningModal}
        warningData={proctor.warningData}
        showLockModal={cbtStep === 'cbt_runner' && (proctor.showLockModal || proctor.lockStage === 1)}
        showBlockModal={cbtStep === 'cbt_runner' && (proctor.showBlockModal || proctor.isBlocked)}
        isAlarmPlaying={proctor.isAlarmPlaying}
        onDismissWarning={proctor.dismissWarningModal}
        onStopAlarm={proctor.stopAlarm}
        onVerifyPin={proctor.verifyProctorPin}
        studentName={loggedInStudent?.nama}
        studentClass={loggedInStudent?.kelas}
        nisn={loggedInStudent?.nisn}
        violationCount={proctor.violationCount}
      />

      {/* Footer Info - Transparent with high contrast on warm/dark gradient */}
      <LoginFooter isDarkBg={true} />
    </div>
  );
};
