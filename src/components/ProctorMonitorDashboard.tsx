import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { ExamActivityLogDoc, StudentExamStatus, AntiCheatColor } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Lock,
  Unlock,
  RotateCcw,
  Send,
  Smartphone,
  Laptop,
  CheckCircle2,
  Clock,
  WifiOff,
  Eye,
  X,
  Volume2,
  User,
  AlertCircle,
  FileX,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LiveDeviceWorkstationMonitor } from './LiveDeviceWorkstationMonitor';

interface ProctorMonitorDashboardProps {
  initialClassFilter?: string;
  initialExamTypeFilter?: 'ALL' | 'CBT' | 'LITNUM';
}

export const ProctorMonitorDashboard: React.FC<ProctorMonitorDashboardProps> = ({
  initialClassFilter = 'ALL',
  initialExamTypeFilter = 'ALL',
}) => {
  const { state, showToast, setCurrentView } = useApp();
  const students = state.students || [];
  const classes = state.classes || [];
  const schedules = state.examManagement?.schedules || [];

  const [logs, setLogs] = useState<ExamActivityLogDoc[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedClass, setSelectedClass] = useState<string>(initialClassFilter);
  const [examTypeFilter, setExamTypeFilter] = useState<string>(initialExamTypeFilter); // 'ALL' | 'CBT' | 'LITNUM'
  const [colorFilter, setColorFilter] = useState<string>('ALL'); // 'ALL' | 'RED' | 'YELLOW' | 'GREEN' | 'LEFT_BROWSER' | 'VIOLATION_3_PLUS' | 'LOCKED'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSessionFilter, setSelectedSessionFilter] = useState<string>('ALL');
  const [activeMonitorTab, setActiveMonitorTab] = useState<'DEVICE_GRID' | 'STUDENT_LIST'>('DEVICE_GRID');

  // Selected student for audit modal
  const [activeStudentDetail, setActiveStudentDetail] = useState<ExamActivityLogDoc | null>(null);

  // Warning Message Dialog state
  const [warningTarget, setWarningTarget] = useState<ExamActivityLogDoc | null>(null);
  const [customWarningText, setCustomWarningText] = useState<string>(
    'Peringatan: Tetap berada di halaman ujian dan jangan berpindah tab atau aplikasi!'
  );

  // Real-time listener on Firestore 'exam_activity_logs'
  useEffect(() => {
    if (!db) {
      setLoading(false);
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
          setLoading(false);
        },
        (error) => {
          console.warn('[ProctorMonitor] Firestore snapshot warning:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('[ProctorMonitor] Error setting up listener:', err);
      setLoading(false);
    }
  }, []);

  const [isResettingLogs, setIsResettingLogs] = useState(false);

  // Reset all live proctor logs from Firestore and local state to 0
  const handleResetAllProctorLogs = async () => {
    if (
      !window.confirm(
        'Reset Live Proktor ke 0 Peserta?\n\nSemua riwayat pemantauan real-time siswa akan dikosongkan. Layar proktor akan kembali ke 0 peserta aktif. Lanjutkan?'
      )
    ) {
      return;
    }
    setIsResettingLogs(true);
    try {
      if (db) {
        const logsRef = collection(db, 'exam_activity_logs');
        const snap = await getDocs(logsRef);
        const deletePromises = snap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deletePromises);
      }
      setLogs([]);
      showToast('Live Proktor Direset', 'Semua sesi pengawasan berhasil dikosongkan (0 peserta aktif).', 'success');
    } catch (err) {
      console.warn('Gagal menghapus log proktor dari Firestore:', err);
      setLogs([]);
      showToast('Live Proktor Direset', 'Tampilan live proktor berhasil dikosongkan ke 0 peserta.', 'info');
    } finally {
      setIsResettingLogs(false);
    }
  };

  // Combined students data: Authoritative real-time Firestore logs (0 active by default)
  const proctorList: ExamActivityLogDoc[] = useMemo(() => {
    return logs;
  }, [logs]);

  // Filtered & Sorted Proctor List (RED & YELLOW prioritized at top!)
  const filteredAndSortedList = useMemo(() => {
    const filtered = proctorList.filter((item) => {
      // Class filter
      if (selectedClass !== 'ALL' && item.className !== selectedClass) {
        return false;
      }
      // Exam Type filter (ASAJ, CBT, LITNUM)
      if (examTypeFilter !== 'ALL') {
        const itemType = (item.examType || 'CBT').toUpperCase();
        if (examTypeFilter === 'ASAJ' && !itemType.includes('ASAJ')) return false;
        if (examTypeFilter === 'LITNUM' && !itemType.includes('LITNUM')) return false;
        if (examTypeFilter === 'CBT' && (itemType.includes('LITNUM') || itemType.includes('ASAJ'))) return false;
      }

      // Sesi filter (Sesi 1, Sesi 2, Sesi 3, Non-Sesi)
      if (selectedSessionFilter !== 'ALL') {
        if (selectedSessionFilter === 'NON_SESSION') {
          if (item.sessionNumber && item.sessionNumber > 0) return false;
        } else {
          if (String(item.sessionNumber) !== selectedSessionFilter) return false;
        }
      }
      // Color & status filter
      if (colorFilter === 'RED') {
        if (item.antiCheatColor !== 'RED') return false;
      } else if (colorFilter === 'YELLOW') {
        if (item.antiCheatColor !== 'YELLOW') return false;
      } else if (colorFilter === 'GREEN') {
        if (item.antiCheatColor !== 'GREEN') return false;
      } else if (colorFilter === 'LEFT_BROWSER') {
        if (item.currentStatus !== 'LEFT_BROWSER') return false;
      } else if (colorFilter === 'VIOLATION_3_PLUS') {
        if ((item.violationCount || 0) < 3) return false;
      } else if (colorFilter === 'LOCKED') {
        if (!item.isLocked) return false;
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (item.studentName || '').toLowerCase().includes(q);
        const matchClass = (item.className || '').toLowerCase().includes(q);
        const matchDev = (item.deviceInfo || '').toLowerCase().includes(q);
        if (!matchName && !matchClass && !matchDev) return false;
      }
      return true;
    });

    // CRITICAL SORT: MERAH (RED) dan KUNING (YELLOW) otomatis diurutkan paling atas!
    return filtered.sort((a, b) => {
      // 1. Color priority: RED (3) > YELLOW (2) > GREEN (1)
      const colorWeight = (color?: AntiCheatColor) => {
        if (color === 'RED') return 3;
        if (color === 'YELLOW') return 2;
        return 1;
      };
      const wA = colorWeight(a.antiCheatColor);
      const wB = colorWeight(b.antiCheatColor);
      if (wA !== wB) return wB - wA;

      // 2. Currently left browser or split screen takes immediate top spot
      const activeAlertA = a.currentStatus === 'LEFT_BROWSER' || a.isSplitScreen ? 1 : 0;
      const activeAlertB = b.currentStatus === 'LEFT_BROWSER' || b.isSplitScreen ? 1 : 0;
      if (activeAlertA !== activeAlertB) return activeAlertB - activeAlertA;

      // 3. Violation count descending
      const vA = a.violationCount || 0;
      const vB = b.violationCount || 0;
      if (vA !== vB) return vB - vA;

      // 4. Alphabetical name
      return (a.studentName || '').localeCompare(b.studentName || '');
    });
  }, [proctorList, selectedClass, examTypeFilter, colorFilter, searchQuery]);

  // Live Summary Metrics
  const summaryMetrics = useMemo(() => {
    let total = proctorList.length;
    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;
    let currentlyLeft = 0;
    let submittedCount = 0;

    proctorList.forEach((item) => {
      if (item.antiCheatColor === 'RED' || item.isLocked) redCount++;
      else if (item.antiCheatColor === 'YELLOW') yellowCount++;
      else greenCount++;

      if (item.currentStatus === 'LEFT_BROWSER' || item.isSplitScreen) currentlyLeft++;
      if (item.currentStatus === 'SUBMITTED') submittedCount++;
    });

    return { total, greenCount, yellowCount, redCount, currentlyLeft, submittedCount };
  }, [proctorList]);

  // ACTION 1: Buka Kunci (Unlock) - Mengubah status dari MERAH kembali ke KUNING
  const handleUnlockStudent = async (docData: ExamActivityLogDoc) => {
    const targetDocId = docData.id;
    try {
      if (db) {
        const docRef = doc(db, 'exam_activity_logs', targetDocId);
        await updateDoc(docRef, {
          isLocked: false,
          isBlocked: false,
          lockStage: 0,
          antiCheatColor: 'YELLOW',
          currentStatus: 'ACTIVE',
          warningMessage: 'Kunci ujian telah dibuka oleh Proktor. Harap tetap fokus di lembar ujian!',
          updatedAt: new Date().toISOString(),
        });
      }
      showToast(
        'Ujian Berhasil Dibuka',
        `Status siswa ${docData.studentName} diubah ke Kuning agar dapat melanjutkan ujian.`,
        'success'
      );
    } catch (err) {
      console.warn('Error unlocking student:', err);
      showToast('Gagal Membuka Kunci', 'Pastikan koneksi internet proktor aktif.', 'error');
    }
  };

  // ACTION 2: Reset ke Hijau (False Alarm)
  const handleResetToGreen = async (docData: ExamActivityLogDoc) => {
    const targetDocId = docData.id;
    try {
      if (db) {
        const docRef = doc(db, 'exam_activity_logs', targetDocId);
        await updateDoc(docRef, {
          isLocked: false,
          isBlocked: false,
          lockStage: 0,
          antiCheatColor: 'GREEN',
          violationCount: 0,
          currentStatus: 'ACTIVE',
          isSplitScreen: false,
          warningMessage: null,
          updatedAt: new Date().toISOString(),
        });
      }
      showToast(
        'Status Direset ke Hijau & Buka Blokir',
        `Seluruh riwayat pelanggaran ${docData.studentName} telah dinolkan dan blokir dihapus.`,
        'success'
      );
    } catch (err) {
      console.warn('Error resetting to green:', err);
    }
  };

  // ACTION 4: Reset Ikatan Perangkat HP Android (Anti-Joki Rebind)
  const handleResetDeviceBinding = async (docData: ExamActivityLogDoc) => {
    const confirmReset = window.confirm(
      `Reset Ikatan Perangkat (Device Binding) Siswa "${docData.studentName}"?\n\nHP Android lama akan dilepas ikatannya sehingga siswa dapat login kembali menggunakan HP baru atau Chromebook cadangan. Lanjutkan?`
    );
    if (!confirmReset) return;

    try {
      if (db) {
        const docRef = doc(db, 'exam_activity_logs', docData.id);
        await updateDoc(docRef, {
          boundStudentId: null,
          boundStudentName: null,
          deviceFingerprint: null,
          deviceType: null,
          deviceDetails: 'Ikatan Perangkat Direset oleh Proktor',
          warningMessage: 'Ikatan perangkat telah direset oleh Proktor. Silakan login kembali di perangkat baru.',
          updatedAt: new Date().toISOString(),
        });
      }
      showToast(
        'Ikatan Perangkat Direset',
        `Perangkat HP untuk siswa ${docData.studentName} berhasil dilepas dari ikatan.`,
        'success'
      );
    } catch (err) {
      console.warn('Error resetting device binding:', err);
      showToast('Gagal Mereset Ikatan', 'Pastikan koneksi internet proktor aktif.', 'error');
    }
  };

  // ACTION 3: Force Submit (Paksa Selesai)
  const handleForceSubmit = async (docData: ExamActivityLogDoc) => {
    const confirmSubmit = window.confirm(
      `PERHATIAN: Apakah Anda yakin ingin mematikan/menghentikan ujian siswa "${docData.studentName}" secara permanen? Lembar jawaban akan langsung dikumpulkan dengan nilai seadanya.`
    );
    if (!confirmSubmit) return;

    const targetDocId = docData.id;
    try {
      if (db) {
        const docRef = doc(db, 'exam_activity_logs', targetDocId);
        await updateDoc(docRef, {
          forceSubmitted: true,
          isLocked: true,
          currentStatus: 'SUBMITTED',
          antiCheatColor: 'RED',
          warningMessage: 'Ujian Anda telah dihentikan secara permanen oleh Pengawas/Proktor Ruang.',
          updatedAt: new Date().toISOString(),
        });
      }
      showToast(
        'Ujian Dipaksa Selesai (Force Submit)',
        `Sesi pengerjaan ${docData.studentName} telah dihentikan secara permanen oleh Proktor.`,
        'warning'
      );
    } catch (err) {
      console.warn('Error force submitting:', err);
    }
  };

  // ACTION 4: Kirim Teguran Langsung ke Layar Siswa
  const handleSendWarning = async () => {
    if (!warningTarget) return;
    const targetDocId = warningTarget.id;
    try {
      if (db) {
        const docRef = doc(db, 'exam_activity_logs', targetDocId);
        await updateDoc(docRef, {
          warningMessage: customWarningText.trim(),
          updatedAt: new Date().toISOString(),
        });
      }
      showToast('Peringatan Terkirim', `Teguran langsung muncul di layar ${warningTarget.studentName}.`, 'success');
      setWarningTarget(null);
    } catch (err) {
      console.warn('Error sending warning:', err);
    }
  };

  // Indicator Badge Component
  const renderIndicatorBadge = (item: ExamActivityLogDoc) => {
    const isCurrentlyOut = item.currentStatus === 'LEFT_BROWSER' || item.isSplitScreen;

    if (item.isBlocked || item.lockStage === 2 || (item.violationCount || 0) >= 6) {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-700 text-white border border-rose-800 shadow-md ring-2 ring-rose-500/40"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <span>🔴 TERBLOKIR OTOMATIS (6/6)</span>
        </span>
      );
    }

    if (item.lockStage === 1 || item.currentStatus === 'LOCKED_PIN') {
      return (
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-500 text-white border border-amber-600 shadow-md animate-pulse"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>🟡 TERKUNCI PIN (SIKLUS 1)</span>
        </span>
      );
    }

    if (item.antiCheatColor === 'RED' || item.isLocked) {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-rose-600 text-white border border-rose-700 shadow-md ${
            isCurrentlyOut ? 'animate-pulse ring-4 ring-rose-500/40' : ''
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
          <span>🔴 MERAH: TERKUNCI</span>
        </span>
      );
    }

    if (item.antiCheatColor === 'YELLOW' || (item.violationCount || 0) > 0) {
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-amber-400 text-slate-950 border border-amber-500 shadow-xs ${
            isCurrentlyOut ? 'animate-pulse ring-2 ring-amber-400/50' : ''
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-900" />
          <span>🟡 KUNING ({item.violationCount || 1}/6)</span>
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>🟢 HIJAU: AMAN</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 selection:bg-indigo-600 selection:text-white">
      {/* Top Banner Dashboard */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-7 text-white shadow-xl border border-indigo-900/40">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-80 h-80 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>LIVE PROCTORING &amp; ANTI-CHEAT MONITORING (CBT &amp; LITNUM)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Sistem Deteksi Kecurangan HP Android &amp; Indikator Warna
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Pemantauan real-time status fokus siswa: 🟢 Hijau (Aman), 🟡 Kuning (Peringatan &amp; Cooldown 5s), 🔴 Merah (Auto-Freeze / Pelanggaran Berat). Dilengkapi deteksi Layar Belah (Split-Screen) dan keluar aplikasi &gt; 10 detik.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="px-3.5 py-2 rounded-2xl bg-white/10 border border-white/20 text-xs font-bold flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Real-Time Sync 1 Record/Siswa</span>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('exam-proctor-mobile')}
              className="px-3.5 py-2 rounded-2xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-500/40 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
              title="Buka Antarmuka Mobile HP Pengawas"
            >
              <Smartphone className="w-3.5 h-3.5 text-teal-300" />
              <span>Mode HP Pengawas</span>
            </button>
            <button
              type="button"
              onClick={handleResetAllProctorLogs}
              disabled={isResettingLogs}
              className="px-3.5 py-2 rounded-2xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all shadow-xs"
              title="Reset seluruh sesi live proktor ke 0"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-rose-300 ${isResettingLogs ? 'animate-spin' : ''}`} />
              <span>{isResettingLogs ? 'Mereset...' : 'Reset Sesi Proktor (0)'}</span>
            </button>
          </div>
        </div>

        {/* 3-Color Metric Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-800 text-xs">
          {/* Card 1: Total */}
          <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Total Siswa</p>
              <p className="text-lg font-black text-white">{summaryMetrics.total}</p>
            </div>
          </div>

          {/* Card 2: 🟢 Hijau */}
          <div
            onClick={() => setColorFilter(colorFilter === 'GREEN' ? 'ALL' : 'GREEN')}
            className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
              colorFilter === 'GREEN'
                ? 'bg-emerald-950/80 border-emerald-500 ring-2 ring-emerald-500'
                : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-300 font-bold uppercase">🟢 Hijau (Aman)</p>
              <p className="text-lg font-black text-emerald-400">{summaryMetrics.greenCount}</p>
            </div>
          </div>

          {/* Card 3: 🟡 Kuning */}
          <div
            onClick={() => setColorFilter(colorFilter === 'YELLOW' ? 'ALL' : 'YELLOW')}
            className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
              colorFilter === 'YELLOW'
                ? 'bg-amber-950/80 border-amber-500 ring-2 ring-amber-500'
                : 'bg-slate-800/80 border-slate-700/80 hover:bg-slate-800'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-amber-300 font-bold uppercase">🟡 Kuning (Peringatan)</p>
              <p className="text-lg font-black text-amber-400">{summaryMetrics.yellowCount}</p>
            </div>
          </div>

          {/* Card 4: 🔴 Merah */}
          <div
            onClick={() => setColorFilter(colorFilter === 'RED' ? 'ALL' : 'RED')}
            className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
              colorFilter === 'RED'
                ? 'bg-rose-950/90 border-rose-500 ring-2 ring-rose-500'
                : summaryMetrics.redCount > 0
                ? 'bg-rose-950/50 border-rose-700/80'
                : 'bg-slate-800/80 border-slate-700/80'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                summaryMetrics.redCount > 0 ? 'bg-rose-600 text-white animate-bounce' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-rose-300 font-bold uppercase">🔴 Merah (Terkunci)</p>
              <p className="text-lg font-black text-rose-400">{summaryMetrics.redCount}</p>
            </div>
          </div>

          {/* Card 5: Sedang Keluar / Split Screen */}
          <div
            onClick={() => setColorFilter(colorFilter === 'LEFT_BROWSER' ? 'ALL' : 'LEFT_BROWSER')}
            className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all col-span-2 sm:col-span-1 ${
              summaryMetrics.currentlyLeft > 0
                ? 'bg-rose-950/90 border-rose-500 ring-4 ring-rose-500/30'
                : 'bg-slate-800/80 border-slate-700/80'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                summaryMetrics.currentlyLeft > 0 ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-700 text-slate-300'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Sedang Keluar HP</p>
              <p className="text-lg font-black text-rose-400">{summaryMetrics.currentlyLeft}</p>
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher: Live Device Grid vs Student Log Table */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveMonitorTab('DEVICE_GRID')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeMonitorTab === 'DEVICE_GRID'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Peta Unit Workstation &amp; Kapasitas Lab (Grid)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMonitorTab('STUDENT_LIST')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeMonitorTab === 'STUDENT_LIST'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Tabel Log Peserta &amp; Anti-Cheat Real-Time</span>
          </button>
        </div>
        <span className="text-[11px] font-bold text-slate-500 hidden sm:inline px-3">
          {activeMonitorTab === 'DEVICE_GRID' ? 'Workstation Live Monitor' : `${filteredAndSortedList.length} Siswa Terpantau`}
        </span>
      </div>

      {activeMonitorTab === 'DEVICE_GRID' ? (
        <LiveDeviceWorkstationMonitor
          logs={logs}
          onResetStudent={handleResetToGreen}
          onUnlockStudent={handleUnlockStudent}
          onForceSubmit={handleForceSubmit}
        />
      ) : (
        <>
          {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, kelas, perangkat..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-indigo-600 focus:bg-white"
            />
          </div>

          {/* Class Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Kelas:</span>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.nama}>
                  {c.nama}
                </option>
              ))}
            </select>
          </div>

          {/* Exam Type Filter (CBT vs LitNum) */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Ujian:</span>
            <select
              value={examTypeFilter}
              onChange={(e) => setExamTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Jenis Ujian</option>
              <option value="ASAJ">ASAJ (Kelas XII)</option>
              <option value="CBT">Ujian CBT Reguler</option>
              <option value="LITNUM">Asesmen LitNum Mingguan</option>
            </select>
          </div>

          {/* Filter Sesi Ujian */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Sesi:</span>
            <select
              value={selectedSessionFilter}
              onChange={(e) => setSelectedSessionFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Sesi</option>
              <option value="1">Sesi 1 (Pagi)</option>
              <option value="2">Sesi 2 (Siang)</option>
              <option value="3">Sesi 3 (Sore)</option>
              <option value="NON_SESSION">Mode Non-Sesi (Serentak)</option>
            </select>
          </div>

          {/* Status & Color Filter */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-600">Indikator:</span>
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Indikator</option>
              <option value="RED">🔴 Status Merah (Terkunci)</option>
              <option value="YELLOW">🟡 Status Kuning (Peringatan)</option>
              <option value="GREEN">🟢 Status Hijau (Aman)</option>
              <option value="LEFT_BROWSER">⚠️ Sedang di Luar Aplikasi</option>
              <option value="VIOLATION_3_PLUS">⚠️ Pelanggaran &ge; 3x</option>
              <option value="LOCKED">🔒 Terkunci Proktor</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2 text-slate-500 font-bold text-[11px]">
          <span>
            Menampilkan <strong>{filteredAndSortedList.length}</strong> siswa
          </span>
          {colorFilter !== 'ALL' && (
            <button
              onClick={() => setColorFilter('ALL')}
              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Proctor Cards Grid - Sorted RED & YELLOW first */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredAndSortedList.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2">
            <ShieldCheck className="w-12 h-12 mx-auto text-slate-300" />
            <p className="font-black text-sm text-slate-700">Tidak ada peserta yang cocok dengan filter saat ini.</p>
            <p className="text-xs text-slate-500">
              Siswa yang mengerjakan ujian CBT atau LitNum akan muncul otomatis secara real-time.
            </p>
          </div>
        ) : (
          filteredAndSortedList.map((item) => {
            const isRed = item.antiCheatColor === 'RED' || item.isLocked;
            const isYellow = item.antiCheatColor === 'YELLOW';
            const isCurrentlyOut = item.currentStatus === 'LEFT_BROWSER' || item.isSplitScreen;

            return (
              <div
                key={item.id}
                className={`p-4 rounded-3xl border-2 transition-all flex flex-col justify-between space-y-3 relative overflow-hidden ${
                  isRed
                    ? 'bg-rose-50/90 border-rose-500 shadow-md ring-2 ring-rose-500/30'
                    : isYellow
                    ? 'bg-amber-50/70 border-amber-400 shadow-xs ring-1 ring-amber-400/20'
                    : 'bg-white hover:bg-slate-50/90 border-slate-200 shadow-xs'
                }`}
              >
                {/* Header Card: Name, Class, Exam Badge, & Color Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                        {item.className}
                      </span>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-200">
                        {item.examType || 'CBT'}
                      </span>
                      {item.isSplitScreen && (
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-purple-600 text-white animate-pulse">
                          SPLIT-SCREEN
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-slate-900 text-sm truncate" title={item.studentName}>
                      {item.studentName}
                    </h3>
                  </div>

                  {renderIndicatorBadge(item)}
                </div>

                {/* Device & Violation Metric with Real-Time Hardware Indicator */}
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/80">
                  <div className="flex items-center gap-1.5 text-slate-600 min-w-0">
                    {item.deviceType === 'chromebook' || (item.deviceInfo || '').toLowerCase().includes('chromebook') ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-blue-50 text-blue-800 border border-blue-200 truncate" title="Klien Lab Chromebook">
                        <Laptop className="w-3 h-3 text-blue-600 shrink-0" />
                        <span className="truncate">Chromebook Lab</span>
                      </span>
                    ) : item.deviceType === 'laptop' || (item.deviceInfo || '').toLowerCase().includes('laptop') || (item.deviceInfo || '').toLowerCase().includes('windows') ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-50 text-indigo-800 border border-indigo-200 truncate" title="Laptop / PC Client">
                        <Laptop className="w-3 h-3 text-indigo-600 shrink-0" />
                        <span className="truncate">Laptop/PC Lab</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 truncate" title={`HP Android Terikat: ${item.boundStudentName || item.studentName}`}>
                        <Smartphone className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">Android (Terikat)</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    <span className="font-medium text-slate-500">Pelanggaran:</span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-black text-[11px] ${
                        (item.violationCount || 0) >= 3
                          ? 'bg-rose-600 text-white'
                          : (item.violationCount || 0) > 0
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {item.violationCount || 0}x
                    </span>
                  </div>
                </div>

                {/* Latest Event Trail */}
                <div className="bg-white/80 rounded-2xl p-2.5 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>Aktivitas Terakhir:</span>
                    <span className="font-mono text-[9.5px]">
                      {item.lastStatusChange ? new Date(item.lastStatusChange).toLocaleTimeString('id-ID') : '-'}
                    </span>
                  </div>
                  {item.recentLogs && item.recentLogs.length > 0 ? (
                    <div className="text-[10.5px] font-semibold text-slate-800 line-clamp-1">
                      <strong className="text-indigo-900">[{item.recentLogs[item.recentLogs.length - 1].timestamp}]</strong>{' '}
                      {item.recentLogs[item.recentLogs.length - 1].action} - {item.recentLogs[item.recentLogs.length - 1].detail}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 italic">Belum ada catatan aktivitas.</div>
                  )}
                </div>

                {/* Action Buttons for Proctor */}
                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between gap-1.5 flex-wrap">
                  {/* Left: Audit detail */}
                  <button
                    type="button"
                    onClick={() => setActiveStudentDetail(item)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                    title="Audit 5 Log Terakhir"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-600" />
                    <span>Audit</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Action: Buka Kunci (Unlock) - Only when Red / Locked */}
                    {isRed ? (
                      <button
                        type="button"
                        onClick={() => handleUnlockStudent(item)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] shadow-sm transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Buka Kunci Ujian (Ubah status Merah kembali ke Kuning)"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Buka Kunci</span>
                      </button>
                    ) : (
                      /* Action: Reset ke Hijau */
                      <button
                        type="button"
                        onClick={() => handleResetToGreen(item)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Reset Pelanggaran ke Status Hijau (False Alarm)"
                      >
                        <RotateCcw className="w-3 h-3 text-slate-600" />
                        <span>Reset Hijau</span>
                      </button>
                    )}

                    {/* Action: Kirim Teguran */}
                    <button
                      type="button"
                      onClick={() => {
                        setWarningTarget(item);
                        setCustomWarningText(
                          `Peringatan untuk ${item.studentName}: Anda terdeteksi keluar dari layar ujian CBT. Ujian akan dikunci bila diulang!`
                        );
                      }}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] shadow-2xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                      title="Kirim Pesan Teguran Popup ke Layar Siswa"
                    >
                      <Send className="w-3 h-3" />
                      <span>Tegur</span>
                    </button>

                    {/* Action: Reset Ikatan Perangkat (Unbind) */}
                    <button
                      type="button"
                      onClick={() => handleResetDeviceBinding(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[10.5px] transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                      title="Reset Ikatan HP jika baterai habis atau siswa ganti perangkat"
                    >
                      <RotateCcw className="w-3 h-3 text-amber-700" />
                      <span>Reset HP</span>
                    </button>

                    {/* Action: Force Submit */}
                    <button
                      type="button"
                      onClick={() => handleForceSubmit(item)}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-[11px] shadow-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                      title="Paksa Selesai (Hentikan Ujian Siswa Permanen)"
                    >
                      <FileX className="w-3 h-3" />
                      <span>Paksa Selesai</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }))}
      </div>
    </>
  )}
      <AnimatePresence>
        {activeStudentDetail && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[calc(100dvh-2rem)] flex flex-col"
            >
              <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-md">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">{activeStudentDetail.studentName}</h3>
                    <p className="text-xs text-slate-500">
                      Kelas: <strong>{activeStudentDetail.className}</strong> • Perangkat: {activeStudentDetail.deviceInfo}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStudentDetail(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
                {/* Metric Summary */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Indikator Warna</span>
                    <div className="mt-1">{renderIndicatorBadge(activeStudentDetail)}</div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Pelanggaran</span>
                    <strong className="text-rose-600 text-sm mt-0.5 block font-black">
                      {activeStudentDetail.violationCount || 0} Kali
                    </strong>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">Status Kunci</span>
                    <strong
                      className={`text-xs mt-1 block font-black ${
                        activeStudentDetail.isLocked ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {activeStudentDetail.isLocked ? 'TERKUNCI' : 'AKTIF'}
                    </strong>
                  </div>
                </div>

                {/* Audit Trail Log List */}
                <div className="space-y-2">
                  <h4 className="font-black text-slate-800 text-xs flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Rekaman 5 Aktivitas Sensor Terakhir (FIFO):</span>
                  </h4>

                  <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden bg-white">
                    {activeStudentDetail.recentLogs && activeStudentDetail.recentLogs.length > 0 ? (
                      activeStudentDetail.recentLogs.map((log, idx) => (
                        <div key={idx} className="p-3 flex items-start gap-2.5 hover:bg-slate-50">
                          <span className="px-2 py-0.5 rounded-md font-mono text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                            {log.timestamp}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-slate-900 text-xs">{log.action}</p>
                            <p className="text-[11px] text-slate-600 font-medium">{log.detail}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-6 text-center text-slate-400 italic">Belum ada riwayat aktivitas yang tercatat.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-1.5">
                  {activeStudentDetail.isLocked && (
                    <button
                      type="button"
                      onClick={() => {
                        handleUnlockStudent(activeStudentDetail);
                        setActiveStudentDetail(null);
                      }}
                      className="px-3 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Buka Kunci Siswa</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      handleResetToGreen(activeStudentDetail);
                      setActiveStudentDetail(null);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset ke Hijau</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveStudentDetail(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-extrabold text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL KIRIM PERINGATAN KE LAYAR SISWA */}
      <AnimatePresence>
        {warningTarget && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4 my-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                  <Volume2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Kirim Peringatan Langsung</h3>
                  <p className="text-xs text-slate-500">
                    Pesan akan langsung popup di layar <strong>{warningTarget.studentName}</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Pesan Teguran:</label>
                <textarea
                  rows={3}
                  value={customWarningText}
                  onChange={(e) => setCustomWarningText(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-medium focus:outline-hidden focus:border-indigo-600"
                  placeholder="Ketik pesan teguran untuk siswa..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setWarningTarget(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSendWarning}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim ke Layar Siswa</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
