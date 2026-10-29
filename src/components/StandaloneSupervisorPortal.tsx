import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  ExamActivityLogDoc,
  ExamRoom,
  ProctorDutySlot,
  ExamSchedule,
  Student,
  isUserAdminOrOperator,
  isUserProctor,
} from '../types';
import { getActiveDutyForTeacher, generateMockExamRoomsAndProctors } from '../utils/examRoomAndNumberHelper';
import { collection, onSnapshot, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  Lock,
  Unlock,
  RotateCcw,
  Clock,
  Key,
  Users,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  FileText,
  Printer,
  ChevronDown,
  DoorOpen,
  LayoutGrid,
  ListOrdered,
  LogOut,
  Sparkles,
  Smartphone,
  Laptop,
  UserCheck,
  UserX,
  Radio,
  Send,
  Sliders,
  CheckCircle2,
  X,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scrollToTop } from '../utils/scrollHelper';

export interface StandaloneSupervisorPortalProps {
  onBackToPortal?: () => void;
}

export const StandaloneSupervisorPortal: React.FC<StandaloneSupervisorPortalProps> = ({ onBackToPortal }) => {
  const {
    state,
    currentUser,
    setCurrentUser,
    setCurrentView,
    setSelectedModule,
    updateSchoolInfo,
    showToast,
    saveBeritaAcara,
    resetStudentLoginSession,
  } = useApp();
  const navigate = useNavigate();

  const school = state?.schoolInfo;
  const rawRooms: ExamRoom[] = state.examManagement?.examRooms || [];
  const proctorSchedules: ProctorDutySlot[] = state.examManagement?.proctorSchedules || [];
  const students: Student[] = state.students || [];
  const schedules: ExamSchedule[] = state.examManagement?.schedules || [];

  // Live real-time clock updating every second
  const [currentTime, setCurrentTime] = useState(() => new Date());
  useEffect(() => {
    scrollToTop({ smooth: true });
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine user authorization
  const liveTeacher = useMemo(() => {
    if (!currentUser) return null;
    return state.teachers?.find((t) => t.id === currentUser.id) || currentUser;
  }, [state.teachers, currentUser]);

  const isProctorAdminOrOperator = isUserAdminOrOperator(liveTeacher);
  const isCbtProctorRole = isUserProctor(liveTeacher);
  const isGlobalProctorActive = Boolean(school?.globalProctorMode);

  // Active Today's Proctor Duty Detection
  const activeDutySlot = useMemo(() => {
    return getActiveDutyForTeacher(proctorSchedules, liveTeacher?.id || '', currentTime);
  }, [proctorSchedules, liveTeacher?.id, currentTime]);

  // Fallback mock rooms if empty for immediate live interactive preview
  const fallbackRooms = useMemo(() => {
    if (rawRooms.length > 0) return rawRooms;
    return generateMockExamRoomsAndProctors(students, state.teachers || []).rooms;
  }, [rawRooms, students, state.teachers]);

  const rooms = rawRooms.length > 0 ? rawRooms : fallbackRooms;

  // Selected Room Code
  const [selectedRoomCode, setSelectedRoomCode] = useState<string>(() => {
    return activeDutySlot?.roomCode || rooms[0]?.roomCode || '01';
  });

  const currentRoom = useMemo(() => {
    return rooms.find((r) => r.roomCode === selectedRoomCode) || rooms[0] || null;
  }, [rooms, selectedRoomCode]);

  // Official Proctor ID & Display Name
  const officialProctorId = useMemo(() => {
    return (
      activeDutySlot?.proctorId ||
      liveTeacher?.proctorId ||
      `PGW-12-${currentTime.getFullYear().toString().slice(-2)}-${selectedRoomCode || '01'}`
    );
  }, [activeDutySlot, liveTeacher, currentTime, selectedRoomCode]);

  const proctorDisplayName = liveTeacher?.nama || activeDutySlot?.teacherName || 'Guru Pengawas';

  // Active Token & Security PIN
  const activeToken =
    activeDutySlot?.token ||
    state.examManagement?.tokenConfig?.activeToken ||
    'SMAN3-9X2K';

  const [activePin, setActivePin] = useState<string>('482910');
  const [showPin, setShowPin] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  // Sync PIN from Firestore
  useEffect(() => {
    if (!db) return;
    try {
      const pinDocRef = doc(db, 'exam_settings', 'security_pin');
      const unsubscribe = onSnapshot(pinDocRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.activePin && /^\d{6}$/.test(data.activePin.trim())) {
            setActivePin(data.activePin.trim());
          }
        }
      });
      return () => unsubscribe();
    } catch (e) {}
  }, []);

  // Real-time Firestore logs for active students
  const [logs, setLogs] = useState<ExamActivityLogDoc[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoadingLogs(false);
      return;
    }
    try {
      const logsRef = collection(db, 'exam_activity_logs');
      const unsubscribe = onSnapshot(
        logsRef,
        (snapshot) => {
          const list: ExamActivityLogDoc[] = [];
          snapshot.forEach((docSnap) => {
            list.push({ id: docSnap.id, ...(docSnap.data() as any) });
          });
          setLogs(list);
          setLoadingLogs(false);
        },
        () => setLoadingLogs(false)
      );
      return () => unsubscribe();
    } catch (e) {
      setLoadingLogs(false);
    }
  }, []);

  // Room students list
  const roomStudents = useMemo(() => {
    if (!currentRoom) return [];
    const targetClasses = [
      currentRoom.primaryClass,
      currentRoom.secondaryClass,
      ...(currentRoom.assignedClasses || [])
    ].filter(Boolean) as string[];
    return students.filter((s) => targetClasses.includes(s.kelas));
  }, [currentRoom, students]);

  // Filters & View Mode
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'UNLOGGED' | 'WORKING' | 'VIOLATION' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'GRID' | 'TABLE'>('GRID');

  // Local simulated overrides for instant, tactile feedback on HP/PC actions
  const [simulatedOverrides, setSimulatedOverrides] = useState<
    Record<
      string,
      {
        statusCategory?: 'UNLOGGED' | 'WORKING' | 'VIOLATION' | 'COMPLETED';
        statusLabel?: string;
        violationDetail?: string;
        answeredCount?: number;
      }
    >
  >({});

  // Map room students to their real-time activity status
  const mappedParticipants = useMemo(() => {
    return roomStudents.map((s) => {
      const liveLog = logs.find(
        (l) =>
          l.studentId === s.id ||
          (l.studentName && l.studentName.toLowerCase().trim() === s.nama.toLowerCase().trim())
      );

      const localOverride = simulatedOverrides[s.id];

      // Default status category
      let category: 'UNLOGGED' | 'WORKING' | 'VIOLATION' | 'COMPLETED' = 'UNLOGGED';
      let label = 'Belum Masuk';
      let violationNote = '';
      let answered = 0;

      if (localOverride) {
        category = localOverride.statusCategory || 'WORKING';
        label = localOverride.statusLabel || 'Sedang Mengerjakan';
        violationNote = localOverride.violationDetail || '';
        answered = localOverride.answeredCount ?? 15;
      } else if (liveLog) {
        answered = liveLog.lastSavedAnswersCount || 0;
        if (liveLog.currentStatus === 'SUBMITTED' || liveLog.examStatus === 'SUBMITTED') {
          category = 'COMPLETED';
          label = 'Selesai';
        } else if (
          liveLog.isBlocked ||
          liveLog.antiCheatColor === 'RED' ||
          (liveLog.violationCount && liveLog.violationCount >= 3)
        ) {
          category = 'VIOLATION';
          label = liveLog.isBlocked ? 'Terkunci / Blokir' : 'Indikasi Pelanggaran';
          violationNote = liveLog.lastViolationReason || `Terdeteksi ${liveLog.violationCount || 1}x keluar tab`;
        } else if (liveLog.currentStatus === 'ACTIVE' || liveLog.examStatus === 'ACTIVE') {
          category = 'WORKING';
          label = 'Sedang Mengerjakan';
        } else {
          category = 'WORKING';
          label = 'Online / Aktif';
        }
      }

      return {
        student: s,
        log: liveLog,
        category,
        label,
        violationNote,
        answered,
      };
    });
  }, [roomStudents, logs, simulatedOverrides]);

  // Filtered participants
  const filteredParticipants = useMemo(() => {
    return mappedParticipants.filter((p) => {
      if (filterCategory !== 'ALL' && p.category !== filterCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.student.nama.toLowerCase().includes(q);
        const matchNisn = (p.student.nisn || '').includes(q);
        const matchUser = (p.student.examUsername || '').toLowerCase().includes(q);
        const matchClass = (p.student.kelas || '').toLowerCase().includes(q);
        if (!matchName && !matchNisn && !matchUser && !matchClass) return false;
      }
      return true;
    });
  }, [mappedParticipants, filterCategory, searchQuery]);

  // Statistics counters
  const counters = useMemo(() => {
    const total = mappedParticipants.length;
    const unlogged = mappedParticipants.filter((p) => p.category === 'UNLOGGED').length;
    const working = mappedParticipants.filter((p) => p.category === 'WORKING').length;
    const violation = mappedParticipants.filter((p) => p.category === 'VIOLATION').length;
    const completed = mappedParticipants.filter((p) => p.category === 'COMPLETED').length;
    return { total, unlogged, working, violation, completed };
  }, [mappedParticipants]);

  // Action Modals State
  const [selectedStudentForAction, setSelectedStudentForAction] = useState<{
    student: Student;
    log?: ExamActivityLogDoc;
    actionType: 'UNLOCK' | 'RESET' | 'COMPENSATION' | 'FORCE_SUBMIT';
  } | null>(null);

  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [compensationMinutes, setCompensationMinutes] = useState<number>(10);

  // Quick Berita Acara Modal State
  const [isBapModalOpen, setIsBapModalOpen] = useState(false);
  const [bapSubject, setBapSubject] = useState(schedules[0]?.subjectName || 'Semua Mata Pelajaran');
  const [bapNotes, setBapNotes] = useState('');
  const [bapAbsentStudents, setBapAbsentStudents] = useState<string[]>([]);

  // Presensi Kehadiran Modal State
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, 'Hadir' | 'Tidak Hadir' | 'Sakit' | 'Izin'>>({});

  // Initialize attendance records from unlogged participants
  const handleOpenAttendanceModal = () => {
    const map: Record<string, 'Hadir' | 'Tidak Hadir' | 'Sakit' | 'Izin'> = {};
    mappedParticipants.forEach((p) => {
      map[p.student.id] = p.category === 'UNLOGGED' ? 'Tidak Hadir' : 'Hadir';
    });
    setAttendanceRecords(map);
    setIsAttendanceModalOpen(true);
  };

  // Quick Toggle Global Proctor Mode (For Admin/Operator/Proktor)
  const handleToggleGlobalProctorMode = async () => {
    const nextVal = !isGlobalProctorActive;
    await updateSchoolInfo({ globalProctorMode: nextVal });
    showToast(
      nextVal ? 'Izin Pengawas Diaktifkan' : 'Izin Pengawas Dinonaktifkan',
      nextVal
        ? 'Seluruh akun Guru Mapel kini memiliki akses Portal Pengawas Ujian di halaman portal utama.'
        : 'Akses Portal Pengawas untuk akun Guru Mapel dinonaktifkan secara serentak.',
      nextVal ? 'success' : 'info'
    );
  };

  // Handle Action Execution
  const handleExecuteAction = async () => {
    if (!selectedStudentForAction) return;
    const { student, log, actionType } = selectedStudentForAction;

    if (actionType === 'UNLOCK') {
      if (enteredPin.trim() !== activePin.trim()) {
        setPinError('PIN Pengawas salah! Masukkan 6 digit PIN resmi yang valid.');
        return;
      }

      // Perform unlock
      if (db && log?.id) {
        try {
          await updateDoc(doc(db, 'exam_activity_logs', log.id), {
            isBlocked: false,
            color: 'GREEN',
            violationCount: 0,
            violationDetail: 'Dibuka oleh Pengawas: ' + proctorDisplayName,
            updatedAt: new Date().toISOString(),
          });
        } catch (e) {}
      }

      setSimulatedOverrides((prev) => ({
        ...prev,
        [student.id]: {
          statusCategory: 'WORKING',
          statusLabel: 'Sedang Mengerjakan (Unlocked)',
          violationDetail: '',
        },
      }));

      showToast(
        'Blokir Dibuka',
        `Siswa ${student.nama} berhasil dibuka blokirnya dan dapat melanjutkan ujian.`,
        'success'
      );
    } else if (actionType === 'RESET') {
      await resetStudentLoginSession(student.id);

      if (db && log?.id) {
        try {
          await updateDoc(doc(db, 'exam_activity_logs', log.id), {
            status: 'Belum Login',
            isBlocked: false,
            color: 'GREEN',
            deviceInfo: 'Sesi Direset Pengawas',
          });
        } catch (e) {}
      }

      setSimulatedOverrides((prev) => ({
        ...prev,
        [student.id]: {
          statusCategory: 'UNLOGGED',
          statusLabel: 'Belum Login (Sesi Direset)',
          violationDetail: '',
        },
      }));

      showToast(
        'Sesi Login Direset',
        `Perangkat siswa ${student.nama} telah dilepaskan. Siswa dapat login kembali pada perangkat ujian.`,
        'info'
      );
    } else if (actionType === 'COMPENSATION') {
      if (db && log?.id) {
        try {
          await updateDoc(doc(db, 'exam_activity_logs', log.id), {
            timeCompensationMinutes: compensationMinutes,
            compensationGrantedBy: proctorDisplayName,
            compensationAt: new Date().toISOString(),
          });
        } catch (e) {}
      }

      showToast(
        'Tambahan Waktu Diberikan',
        `Kompensasi waktu +${compensationMinutes} menit berhasil dicatat untuk ${student.nama}.`,
        'success'
      );
    } else if (actionType === 'FORCE_SUBMIT') {
      if (db && log?.id) {
        try {
          await updateDoc(doc(db, 'exam_activity_logs', log.id), {
            status: 'SELESAI',
            isCompleted: true,
            forceSubmittedBy: proctorDisplayName,
            completedAt: new Date().toISOString(),
          });
        } catch (e) {}
      }

      setSimulatedOverrides((prev) => ({
        ...prev,
        [student.id]: {
          statusCategory: 'COMPLETED',
          statusLabel: 'Selesai (Force Submit Pengawas)',
          violationDetail: '',
        },
      }));

      showToast(
        'Ujian Diselesaikan',
        `Jawaban siswa ${student.nama} berhasil disubmit secara permanen oleh pengawas.`,
        'warning'
      );
    }

    setSelectedStudentForAction(null);
    setEnteredPin('');
    setPinError(null);
  };

  // Save Berita Acara
  const handleSaveBAP = async (e: React.FormEvent) => {
    e.preventDefault();
    const absentDetails = mappedParticipants
      .filter((p) => p.category === 'UNLOGGED')
      .map((p) => ({
        nama: p.student.nama,
        nisn: p.student.nisn,
        nomorPeserta: p.student.nomorPeserta,
        kelas: p.student.kelas,
        alasan: 'Tidak hadir dalam sesi pengawasan',
      }));

    const bapItem = {
      id: `bap-${Date.now()}`,
      assessmentType: 'ASAS' as const,
      namaSekolah: school?.namaSekolah || 'SMAN 3 Tumijajar',
      mataPelajaran: bapSubject,
      kelasRuang: `Ruang ${selectedRoomCode} (${currentRoom?.roomName || 'Lab Komputer'})`,
      hariTanggal: currentTime.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      waktuPelaksanaan: `${currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
      pengawas1: proctorDisplayName,
      nipPengawas1: liveTeacher?.nip || officialProctorId,
      jumlahPesertaSeharusnya: counters.total,
      jumlahPesertaHadir: counters.working + counters.completed + counters.violation,
      jumlahPesertaTidakHadir: counters.unlogged,
      siswaTidakHadirDetail: absentDetails,
      catatanKejadianKhusus: bapNotes || 'Pelaksanaan ujian berlangsung tertib, aman, dan lancar sesuai tata tertib CBT.',
      uploadedAt: new Date().toISOString(),
      uploadedBy: proctorDisplayName,
      verifiedStatus: 'Pending' as const,
    };

    await saveBeritaAcara(bapItem);
    setIsBapModalOpen(false);
    setBapNotes('');
    showToast(
      'Berita Acara Disimpan',
      'Dokumen Berita Acara Pelaksanaan Ujian berhasil dicatat dan siap diverifikasi oleh Kepala Sekolah.',
      'success'
    );
  };

  // Copy helper
  const handleCopy = (text: string, isPin = false) => {
    navigator.clipboard.writeText(text);
    if (isPin) {
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
    showToast('Tersalin', `${text} berhasil disalin ke papan klip.`, 'info');
  };

  // Exit back to Landing Portal
  const handleReturnToPortal = () => {
    if (onBackToPortal) {
      onBackToPortal();
      return;
    }
    setSelectedModule('portal');
    setCurrentView('dashboard');
    navigate('/portal', { replace: true });
    scrollToTop({ smooth: true });
  };

  // Handle Logout
  const handleLogout = () => {
    sessionStorage.removeItem('smantri_user_id');
    sessionStorage.removeItem('smantri_user_profile');
    localStorage.removeItem('smantri_user_id');
    localStorage.removeItem('smantri_user_profile');
    setCurrentUser(null);
    setSelectedModule('portal');
    navigate('/welcome', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* =========================================================================
          TOP COMMAND HEADER: ISOLATED PROCTOR PORTAL
          ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Left: Branding & Active Supervisor ID */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleReturnToPortal}
                className="p-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0 active:scale-95 shadow-xs"
                title="Kembali ke Portal Utama"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Portal Utama</span>
              </button>

              <div className="h-6 w-px bg-slate-800 hidden sm:block" />

              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/25 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                      PORTAL PENGAWAS CBT
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <h1 className="text-sm sm:text-base font-black text-white truncate flex items-center gap-2">
                    <span>{proctorDisplayName}</span>
                    <span className="text-xs font-mono font-bold text-slate-400 font-normal">
                      ({officialProctorId})
                    </span>
                  </h1>
                </div>
              </div>
            </div>

            {/* Middle: Live Clock & Session Token / PIN */}
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 text-xs">
              {/* Digital Real-Time Clock */}
              <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-2 font-mono font-bold shadow-inner">
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>
                  {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB
                </span>
              </div>

              {/* Token Badge with Quick Copy */}
              <div className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2 font-bold shadow-2xs">
                <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Token: <strong className="font-mono text-white tracking-wider">{activeToken}</strong></span>
                <button
                  type="button"
                  onClick={() => handleCopy(activeToken, false)}
                  className="p-1 rounded-md hover:bg-amber-500/20 text-amber-300 hover:text-white transition-colors cursor-pointer"
                  title="Salin Token Ujian"
                >
                  {copiedToken ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {/* PIN Pengawas with Show/Hide & Copy */}
              <div className="px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 flex items-center gap-2 font-bold shadow-2xs">
                <Lock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span>PIN: <strong className="font-mono text-white tracking-widest">{showPin ? activePin : '••••••'}</strong></span>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="p-1 rounded-md hover:bg-indigo-500/20 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                  title={showPin ? 'Sembunyikan PIN' : 'Lihat PIN Pengawas'}
                >
                  {showPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(activePin, true)}
                  className="p-1 rounded-md hover:bg-indigo-500/20 text-indigo-300 hover:text-white transition-colors cursor-pointer"
                  title="Salin PIN Pengawas"
                >
                  {copiedPin ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>

              {/* Master Izin Pengawas Quick Toggle (Admin, Operator, Proktor ONLY) */}
              {isCbtProctorRole && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-850 border border-slate-700">
                  <span className="text-[11px] font-bold text-slate-300 hidden md:inline">Izin Pengawas:</span>
                  <button
                    type="button"
                    onClick={handleToggleGlobalProctorMode}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer flex items-center gap-1 ${
                      isGlobalProctorActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-700 text-slate-400 hover:text-white'
                    }`}
                    title="Klik untuk membuka/menutup saklar izin pengawas guru secara serentak"
                  >
                    <Radio className="w-3 h-3" />
                    <span>{isGlobalProctorActive ? 'DIBUKA' : 'DITUTUP'}</span>
                  </button>
                </div>
              )}

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-xl bg-slate-850 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-800 transition-colors cursor-pointer shrink-0"
                title="Keluar dari Akun"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN WORKSPACE BODY
          ========================================================================= */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 min-w-0">
        {/* ROOM SELECTION & BANNER CONTROLS */}
        <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Room Selector Dropdown / Pills */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4 text-indigo-400" />
                <span>Pilih Ruang Ujian:</span>
              </span>

              <div className="flex items-center gap-2 flex-wrap">
                {rooms.map((r) => {
                  const isSelected = r.roomCode === selectedRoomCode;
                  const class1 = r.primaryClass || r.assignedClasses?.[0] || 'Kelas A';
                  const class2 = r.secondaryClass || r.assignedClasses?.[1];
                  return (
                    <button
                      key={r.id || r.roomCode}
                      type="button"
                      onClick={() => {
                        setSelectedRoomCode(r.roomCode);
                        showToast('Ruang Diubah', `Beralih ke pemantauan Ruang ${r.roomCode} (${r.roomName || 'Lab'})`, 'info');
                      }}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                          : 'bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-800'
                      }`}
                    >
                      <span>Ruang {r.roomCode}</span>
                      <span className="text-[10px] font-mono opacity-80">({class1}{class2 ? ` & ${class2}` : ''})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons: Presensi & Berita Acara */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={handleOpenAttendanceModal}
                className="px-3.5 py-2 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-xs"
              >
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>Presensi Kehadiran</span>
              </button>

              <button
                type="button"
                onClick={() => setIsBapModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white font-black text-xs flex items-center gap-2 transition-all cursor-pointer active:scale-95 shadow-md shadow-indigo-600/25"
              >
                <FileText className="w-4 h-4" />
                <span>Pencatatan Berita Acara (BAP)</span>
              </button>
            </div>
          </div>

          {/* Active Room Information Card */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <DoorOpen className="w-5 h-5" />
              </div>
              <div>
                <p className="font-black text-sm text-white">
                  {currentRoom?.roomName || `Ruang ${selectedRoomCode}`} - SMAN 3 Tumijajar
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Rombel Terjadwal: <strong className="text-slate-200">{currentRoom?.primaryClass || currentRoom?.assignedClasses?.[0] || 'Umum'}</strong> {currentRoom?.secondaryClass || currentRoom?.assignedClasses?.[1] ? `dan ${currentRoom.secondaryClass || currentRoom.assignedClasses[1]}` : ''} · Kapasitas: <strong>{roomStudents.length} Peserta</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Monitoring Real-Time Sensor Anti-Cheat &amp; Heartbeat Aktif</span>
            </div>
          </div>
        </div>

        {/* METRICS COUNTER CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Total Peserta */}
          <button
            type="button"
            onClick={() => setFilterCategory('ALL')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              filterCategory === 'ALL'
                ? 'bg-slate-800/90 border-slate-600 ring-2 ring-indigo-500/30'
                : 'bg-slate-950 border-slate-850 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Total Siswa</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-white">{counters.total}</p>
            <span className="text-[10px] text-slate-400 font-medium">Dalam Ruang {selectedRoomCode}</span>
          </button>

          {/* Belum Login */}
          <button
            type="button"
            onClick={() => setFilterCategory('UNLOGGED')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              filterCategory === 'UNLOGGED'
                ? 'bg-slate-800/90 border-slate-600 ring-2 ring-slate-400/30'
                : 'bg-slate-950 border-slate-850 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Belum Login</span>
              <UserX className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-2xl font-black text-slate-300">{counters.unlogged}</p>
            <span className="text-[10px] text-slate-500 font-medium">Belum Akses Soal</span>
          </button>

          {/* Sedang Mengerjakan */}
          <button
            type="button"
            onClick={() => setFilterCategory('WORKING')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              filterCategory === 'WORKING'
                ? 'bg-emerald-950/40 border-emerald-600 ring-2 ring-emerald-500/30'
                : 'bg-slate-950 border-slate-850 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Mengerjakan</span>
              <Laptop className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400">{counters.working}</p>
            <span className="text-[10px] text-emerald-300/80 font-medium">Koneksi Normal (Hijau)</span>
          </button>

          {/* Pelanggaran / Keluar Tab */}
          <button
            type="button"
            onClick={() => setFilterCategory('VIOLATION')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              filterCategory === 'VIOLATION'
                ? 'bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/30'
                : 'bg-slate-950 border-slate-850 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-rose-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Pelanggaran</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400">{counters.violation}</p>
            <span className="text-[10px] text-rose-300/80 font-medium">Keluar Tab / Terblokir</span>
          </button>

          {/* Selesai */}
          <button
            type="button"
            onClick={() => setFilterCategory('COMPLETED')}
            className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
              filterCategory === 'COMPLETED'
                ? 'bg-sky-950/40 border-sky-600 ring-2 ring-sky-500/30'
                : 'bg-slate-950 border-slate-850 hover:bg-slate-900'
            }`}
          >
            <div className="flex items-center justify-between text-sky-400 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider">Selesai</span>
              <CheckCircle2 className="w-4 h-4 text-sky-400" />
            </div>
            <p className="text-2xl font-black text-sky-400">{counters.completed}</p>
            <span className="text-[10px] text-sky-300/80 font-medium">Jawaban Tersubmit</span>
          </button>
        </div>

        {/* SEARCH & CONTROLS TOOLBAR */}
        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, NISN, username 8-digit..."
              className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View Mode Toggle */}
            <div className="bg-slate-900 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('GRID')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'GRID' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Grid Kartu"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('TABLE')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'TABLE' ? 'bg-indigo-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                }`}
                title="Tampilan Tabel Rinci"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
            </div>

            <span className="text-xs text-slate-400 font-semibold px-2">
              Menampilkan {filteredParticipants.length} dari {roomStudents.length} peserta
            </span>
          </div>
        </div>

        {/* PARTICIPANTS DISPLAY */}
        {filteredParticipants.length === 0 ? (
          <div className="p-12 text-center bg-slate-950 rounded-3xl border border-slate-800 space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-bold text-slate-300">Tidak ada peserta yang cocok</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Periksa filter atau kata kunci pencarian Anda untuk menampilkan data peserta ujian.
            </p>
          </div>
        ) : viewMode === 'GRID' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredParticipants.map(({ student, log, category, label, violationNote, answered }) => {
              const isWorking = category === 'WORKING';
              const isViolation = category === 'VIOLATION';
              const isCompleted = category === 'COMPLETED';
              const isUnlogged = category === 'UNLOGGED';

              return (
                <div
                  key={student.id}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                    isViolation
                      ? 'bg-rose-950/30 border-rose-500 ring-2 ring-rose-500/20'
                      : isWorking
                      ? 'bg-slate-950 border-emerald-500/40 hover:border-emerald-500'
                      : isCompleted
                      ? 'bg-slate-950 border-sky-500/30 hover:border-sky-500'
                      : 'bg-slate-950 border-slate-850 hover:border-slate-700'
                  }`}
                >
                  {/* Top Status Accent Bar */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 ${
                      isViolation ? 'bg-rose-500' : isWorking ? 'bg-emerald-500' : isCompleted ? 'bg-sky-500' : 'bg-slate-700'
                    }`}
                  />

                  <div>
                    {/* Header: Class Badge & Status Pill */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-900 border border-slate-800 text-slate-300">
                        {student.kelas}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                          isViolation
                            ? 'bg-rose-500 text-white'
                            : isWorking
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isCompleted
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isViolation ? 'bg-white animate-ping' : isWorking ? 'bg-emerald-400' : isCompleted ? 'bg-sky-400' : 'bg-slate-500'
                          }`}
                        />
                        <span>{label}</span>
                      </span>
                    </div>

                    {/* Student Identity */}
                    <h4 className="text-sm font-black text-white leading-tight line-clamp-1">
                      {student.nama}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      NISN: {student.nisn || '-'} · User: {student.examUsername || student.id.slice(-6)}
                    </p>

                    {/* Violation Alert Banner */}
                    {isViolation && violationNote && (
                      <div className="mt-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10.5px] font-semibold flex items-start gap-1.5 leading-snug">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        <span>{violationNote}</span>
                      </div>
                    )}

                    {/* Progress Info */}
                    <div className="mt-3 pt-2.5 border-t border-slate-850 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Jawaban Masuk:</span>
                      <strong className={`font-mono ${isCompleted ? 'text-sky-300' : isWorking ? 'text-emerald-300' : 'text-slate-400'}`}>
                        {answered} Soal
                      </strong>
                    </div>
                  </div>

                  {/* Operational Action Buttons */}
                  <div className="pt-2 border-t border-slate-850 flex items-center justify-between gap-1.5">
                    {isViolation ? (
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForAction({ student, log, actionType: 'UNLOCK' })}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Buka Blokir (PIN)</span>
                      </button>
                    ) : isWorking ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForAction({ student, log, actionType: 'RESET' })}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Reset sesi jika perangkat bermasalah atau ganti laptop"
                        >
                          <RotateCcw className="w-3 h-3 text-amber-400" />
                          <span>Reset Login</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedStudentForAction({ student, log, actionType: 'COMPENSATION' })}
                          className="py-1 px-2 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold transition-colors cursor-pointer"
                          title="Beri tambahan waktu kendala teknis"
                        >
                          + Waktu
                        </button>
                      </div>
                    ) : isUnlogged ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSimulatedOverrides((prev) => ({
                            ...prev,
                            [student.id]: {
                              statusCategory: 'WORKING',
                              statusLabel: 'Sedang Mengerjakan',
                              answeredCount: 1,
                            },
                          }));
                          showToast('Simulasi Login', `Status ${student.nama} diubah ke Sedang Mengerjakan.`, 'info');
                        }}
                        className="w-full py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-[11px] font-semibold text-center transition-colors cursor-pointer"
                      >
                        Tandai Mulai
                      </button>
                    ) : (
                      <div className="w-full text-center py-1 text-[11px] text-sky-400 font-bold">
                        ✓ Terkirim Resmi
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 border-b border-slate-800 text-[11px] font-black uppercase text-slate-400">
                  <tr>
                    <th className="p-3 w-12 text-center">No</th>
                    <th className="p-3">Nama Siswa</th>
                    <th className="p-3">Kelas</th>
                    <th className="p-3 font-mono">NISN</th>
                    <th className="p-3 font-mono">Username</th>
                    <th className="p-3">Status Pengerjaan</th>
                    <th className="p-3 text-center">Jawaban</th>
                    <th className="p-3 text-right">Aksi Pengawas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 font-medium">
                  {filteredParticipants.map(({ student, log, category, label, violationNote, answered }, idx) => {
                    const isViolation = category === 'VIOLATION';
                    const isWorking = category === 'WORKING';
                    return (
                      <tr key={student.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-500">{idx + 1}</td>
                        <td className="p-3">
                          <span className="font-bold text-white block">{student.nama}</span>
                          {isViolation && violationNote && (
                            <span className="text-[10px] text-rose-400 font-semibold block mt-0.5">
                              ⚠️ {violationNote}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono">{student.kelas}</td>
                        <td className="p-3 font-mono text-slate-400">{student.nisn || '-'}</td>
                        <td className="p-3 font-mono text-indigo-300 font-bold">{student.examUsername || student.id.slice(-6)}</td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1 ${
                              isViolation
                                ? 'bg-rose-500 text-white'
                                : isWorking
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : category === 'COMPLETED'
                                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <span>{label}</span>
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-white">{answered}</td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isViolation ? (
                              <button
                                type="button"
                                onClick={() => setSelectedStudentForAction({ student, log, actionType: 'UNLOCK' })}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
                              >
                                Buka Blokir
                              </button>
                            ) : isWorking ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentForAction({ student, log, actionType: 'RESET' })}
                                  className="px-2 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-amber-300 border border-slate-700 text-xs font-bold"
                                  title="Reset Sesi Login"
                                >
                                  Reset
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentForAction({ student, log, actionType: 'COMPENSATION' })}
                                  className="px-2 py-1 rounded-lg bg-slate-850 hover:bg-slate-800 text-indigo-300 border border-slate-700 text-xs font-bold"
                                  title="Kompensasi Waktu"
                                >
                                  + Waktu
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedStudentForAction({ student, log, actionType: 'FORCE_SUBMIT' })}
                                  className="px-2 py-1 rounded-lg bg-slate-850 hover:bg-rose-900 text-rose-300 border border-slate-700 text-xs font-bold"
                                  title="Paksa Selesai"
                                >
                                  Submit
                                </button>
                              </>
                            ) : (
                              <span className="text-[11px] text-slate-500 italic">Tidak ada aksi</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL: PIN AUTHORIZATION & ACTION CONFIRMATION
          ========================================================================= */}
      <AnimatePresence>
        {selectedStudentForAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 rounded-3xl max-w-md w-full p-6 border border-slate-700 shadow-2xl text-slate-100 space-y-4 my-auto"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
                      selectedStudentForAction.actionType === 'UNLOCK'
                        ? 'bg-rose-600'
                        : selectedStudentForAction.actionType === 'RESET'
                        ? 'bg-amber-600'
                        : selectedStudentForAction.actionType === 'COMPENSATION'
                        ? 'bg-indigo-600'
                        : 'bg-red-700'
                    }`}
                  >
                    {selectedStudentForAction.actionType === 'UNLOCK' ? (
                      <Unlock className="w-5 h-5" />
                    ) : selectedStudentForAction.actionType === 'RESET' ? (
                      <RotateCcw className="w-5 h-5" />
                    ) : selectedStudentForAction.actionType === 'COMPENSATION' ? (
                      <Clock className="w-5 h-5" />
                    ) : (
                      <ShieldAlert className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">
                      {selectedStudentForAction.actionType === 'UNLOCK'
                        ? 'Buka Blokir Anti-Cheat'
                        : selectedStudentForAction.actionType === 'RESET'
                        ? 'Konfirmasi Reset Sesi Login'
                        : selectedStudentForAction.actionType === 'COMPENSATION'
                        ? 'Kompensasi Tambahan Waktu'
                        : 'Paksa Selesaikan Ujian'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Siswa: <strong className="text-white">{selectedStudentForAction.student.nama}</strong> ({selectedStudentForAction.student.kelas})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentForAction(null);
                    setPinError(null);
                    setEnteredPin('');
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {selectedStudentForAction.actionType === 'UNLOCK' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Siswa terdeteksi keluar dari aplikasi CBT atau membuka tab lain. Masukkan <strong>6-digit PIN Pengawas</strong> untuk membuka blokir dan mengizinkan siswa melanjutkan ujian:
                  </p>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                      Masukkan PIN Pengawas (6 Digit):
                    </label>
                    <input
                      type="password"
                      maxLength={6}
                      value={enteredPin}
                      onChange={(e) => {
                        setEnteredPin(e.target.value);
                        setPinError(null);
                      }}
                      placeholder="Contoh: 482910"
                      className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-center font-mono text-lg font-black tracking-widest text-white focus:outline-hidden focus:ring-2 focus:ring-rose-500"
                      autoFocus
                    />
                    {pinError && (
                      <p className="text-xs text-rose-400 font-semibold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{pinError}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {selectedStudentForAction.actionType === 'RESET' && (
                <p className="text-xs text-slate-300 leading-relaxed">
                  Reset sesi akan memutuskan koneksi login siswa saat ini. Gunakan fitur ini jika siswa mengalami kendala perangkat mati, browser membeku (hang), atau perlu berpindah ke unit cadangan.
                </p>
              )}

              {selectedStudentForAction.actionType === 'COMPENSATION' && (
                <div className="space-y-2">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Pilih durasi kompensasi tambahan waktu untuk siswa karena kendala teknis (mati lampu, jaringan lambat, dsb.):
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {[5, 10, 15].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setCompensationMinutes(mins)}
                        className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          compensationMinutes === mins
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        +{mins} Menit
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedStudentForAction.actionType === 'FORCE_SUBMIT' && (
                <p className="text-xs text-rose-300 leading-relaxed bg-rose-500/10 p-3 rounded-xl border border-rose-500/30">
                  <strong>Peringatan Fatal:</strong> Seluruh jawaban siswa akan dikunci dan dikirim ke server saat ini juga. Siswa tidak dapat melanjutkan pengerjaan kembali.
                </p>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentForAction(null);
                    setPinError(null);
                    setEnteredPin('');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
                >
                  Konfirmasi Aksi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL: BERITA ACARA PELAKSANAAN UJIAN (BAP)
          ========================================================================= */}
      <AnimatePresence>
        {isBapModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-700 shadow-2xl text-slate-100 space-y-4 my-auto max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Berita Acara Pelaksanaan Ujian (BAP)</h3>
                    <p className="text-xs text-slate-400">
                      Ruang {selectedRoomCode} · {currentTime.toLocaleDateString('id-ID', { dateStyle: 'full' })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBapModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveBAP} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3 bg-slate-950 p-3 rounded-2xl border border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Pengawas Ujian:</span>
                    <p className="font-bold text-white mt-0.5">{proctorDisplayName}</p>
                    <span className="text-[10px] font-mono text-slate-500">ID: {officialProctorId}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Ruang Pelaksanaan:</span>
                    <p className="font-bold text-white mt-0.5">Ruang {selectedRoomCode}</p>
                    <span className="text-[10px] text-slate-500">Total: {counters.total} Siswa</span>
                  </div>
                </div>

                {/* Kehadiran Summary */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-center">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Seharusnya</span>
                    <span className="text-base font-black text-white">{counters.total}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-center">
                    <span className="text-[10px] text-emerald-400 font-bold block uppercase">Hadir</span>
                    <span className="text-base font-black text-emerald-300">
                      {counters.working + counters.completed + counters.violation}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-center">
                    <span className="text-[10px] text-rose-400 font-bold block uppercase">Tidak Hadir</span>
                    <span className="text-base font-black text-rose-300">{counters.unlogged}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Mata Pelajaran Ujian:
                  </label>
                  <input
                    type="text"
                    value={bapSubject}
                    onChange={(e) => setBapSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                    placeholder="Contoh: Matematika Wajib"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-400 mb-1">
                    Catatan Kejadian Khusus Selama Ujian:
                  </label>
                  <textarea
                    rows={3}
                    value={bapNotes}
                    onChange={(e) => setBapNotes(e.target.value)}
                    placeholder="Tuliskan catatan kejadian khusus jika ada kendala perangkat, siswa sakit, atau pergantian unit..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsBapModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    Simpan Berita Acara
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL: PRESENSI KEHADIRAN RUANG UJIAN
          ========================================================================= */}
      <AnimatePresence>
        {isAttendanceModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-700 shadow-2xl text-slate-100 space-y-4 my-auto max-h-[90vh] overflow-y-auto flex flex-col"
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Presensi Kehadiran Peserta Ujian</h3>
                    <p className="text-xs text-slate-400">
                      Ruang {selectedRoomCode} · {roomStudents.length} Peserta Terdaftar
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto max-h-[50vh] pr-1">
                {mappedParticipants.map(({ student, category }, idx) => {
                  const currentStatus = attendanceRecords[student.id] || (category === 'UNLOGGED' ? 'Tidak Hadir' : 'Hadir');

                  return (
                    <div
                      key={student.id}
                      className="p-2.5 rounded-xl bg-slate-950 border border-slate-850 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-slate-500 w-6 text-center">{idx + 1}</span>
                        <div>
                          <p className="font-bold text-white truncate">{student.nama}</p>
                          <p className="text-[10.5px] font-mono text-slate-400">
                            {student.kelas} · {student.nisn || student.examUsername || '-'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {(['Hadir', 'Tidak Hadir', 'Sakit', 'Izin'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() =>
                              setAttendanceRecords((prev) => ({
                                ...prev,
                                [student.id]: st,
                              }))
                            }
                            className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                              currentStatus === st
                                ? st === 'Hadir'
                                  ? 'bg-emerald-600 text-white'
                                  : st === 'Tidak Hadir'
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-amber-600 text-white'
                                : 'bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAttendanceModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAttendanceModalOpen(false);
                    showToast('Presensi Disimpan', 'Data presensi kehadiran ruang ujian telah diperbarui.', 'success');
                  }}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md transition-all cursor-pointer active:scale-95"
                >
                  Simpan Presensi
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
