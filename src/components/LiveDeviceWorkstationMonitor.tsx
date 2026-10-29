import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ExamActivityLogDoc, LabCapacityConfig, WorkstationUnitStatus } from '../types';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  Laptop,
  Monitor,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Settings2,
  User,
  Sliders,
  Info,
  Clock,
  Sparkles,
  Layers,
  ChevronRight,
  RotateCcw,
  Unlock,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LiveDeviceWorkstationMonitorProps {
  logs?: ExamActivityLogDoc[];
  onResetStudent?: (log: ExamActivityLogDoc) => void;
  onUnlockStudent?: (log: ExamActivityLogDoc) => void;
  onForceSubmit?: (log: ExamActivityLogDoc) => void;
  className?: string;
}

export const LiveDeviceWorkstationMonitor: React.FC<LiveDeviceWorkstationMonitorProps> = ({
  logs = [],
  onResetStudent,
  onUnlockStudent,
  onForceSubmit,
  className = '',
}) => {
  const { state, updateExamManagementState, showToast } = useApp();
  const students = state.students || [];
  const schedules = state.examManagement?.schedules || [];

  // Lab Capacity Config
  const defaultQuota = state.examManagement?.labCapacity?.totalQuota || 30;
  const defaultRoomName = state.examManagement?.labCapacity?.roomName || 'Lab Komputer CBT Utama';
  const defaultPrefix = state.examManagement?.labCapacity?.prefix || 'CB-';
  const defaultDeviceType = state.examManagement?.labCapacity?.deviceTypeDefault || 'chromebook';

  const [totalQuota, setTotalQuota] = useState<number>(defaultQuota);
  const [roomName, setRoomName] = useState<string>(defaultRoomName);
  const [unitPrefix, setUnitPrefix] = useState<string>(defaultPrefix);
  const [deviceType, setDeviceType] = useState<'chromebook' | 'laptop'>(defaultDeviceType);

  const [internalLogs, setInternalLogs] = useState<ExamActivityLogDoc[]>([]);

  // Real-time listener for Firestore exam_activity_logs when standalone
  useEffect(() => {
    if (logs && logs.length > 0) return;
    if (!db) return;
    try {
      const logsRef = collection(db, 'exam_activity_logs');
      const unsubscribe = onSnapshot(logsRef, (snapshot) => {
        const list: ExamActivityLogDoc[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...(d.data() as any) });
        });
        setInternalLogs(list);
      });
      return () => unsubscribe();
    } catch (e) {
      console.warn('Live monitor snapshot error:', e);
    }
  }, [logs]);

  const effectiveLogs = (logs && logs.length > 0) ? logs : internalLogs;

  const handleResetAction = async (targetLog: ExamActivityLogDoc) => {
    if (onResetStudent) {
      onResetStudent(targetLog);
    } else if (db && targetLog.id) {
      try {
        await updateDoc(doc(db, 'exam_activity_logs', targetLog.id), {
          currentStatus: 'ACTIVE',
          examStatus: 'ACTIVE',
          antiCheatColor: 'GREEN',
          violationCount: 0,
          lockStage: 0,
          isBlocked: false,
          isLocked: false,
        });
        showToast('Siswa Direset', `${targetLog.studentName || 'Peserta'} dikembalikan ke status hijau.`, 'success');
      } catch (e) {}
    }
    setSelectedUnitDetail(null);
  };

  const handleUnlockAction = async (targetLog: ExamActivityLogDoc) => {
    if (onUnlockStudent) {
      onUnlockStudent(targetLog);
    } else if (db && targetLog.id) {
      try {
        await updateDoc(doc(db, 'exam_activity_logs', targetLog.id), {
          lockStage: 0,
          isLocked: false,
          antiCheatColor: 'YELLOW',
        });
        showToast('Kunci Dibuka', `Kunci layar ${targetLog.studentName || 'Peserta'} berhasil dibuka.`, 'success');
      } catch (e) {}
    }
    setSelectedUnitDetail(null);
  };

  const handleForceSubmitAction = async (targetLog: ExamActivityLogDoc) => {
    if (onForceSubmit) {
      onForceSubmit(targetLog);
    } else if (db && targetLog.id) {
      try {
        await updateDoc(doc(db, 'exam_activity_logs', targetLog.id), {
          forceSubmitted: true,
          currentStatus: 'SUBMITTED',
          examStatus: 'SUBMITTED',
        });
        showToast('Paksa Selesai', `Lembar jawab ${targetLog.studentName || 'Peserta'} dipaksa selesai.`, 'warning');
      } catch (e) {}
    }
    setSelectedUnitDetail(null);
  };

  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [searchUnit, setSearchUnit] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'WARNING' | 'STANDBY' | 'COMPLETED'>('ALL');
  const [selectedUnitDetail, setSelectedUnitDetail] = useState<{
    unitId: string;
    status: 'standby' | 'working' | 'warning' | 'completed';
    log?: ExamActivityLogDoc;
    studentName?: string;
    studentClass?: string;
    sessionNumber?: number;
    progressPercent?: number;
    isFullscreen?: boolean;
    violationCount?: number;
  } | null>(null);

  // Save updated quota config
  const handleSaveQuotaConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newConfig: LabCapacityConfig = {
      totalQuota,
      roomName,
      prefix: unitPrefix,
      deviceTypeDefault: deviceType,
    };

    const cur = state.examManagement || {};
    await updateExamManagementState({
      ...cur,
      labCapacity: newConfig,
    });
    setIsConfigOpen(false);
    showToast('Kapasitas Lab Diperbarui', `Kuota perangkat lab diatur ke ${totalQuota} unit (${unitPrefix}01 s/d ${unitPrefix}${String(totalQuota).padStart(2, '0')}).`, 'success');
  };

  // Find active ASAJ or Scheduled Exams for Capacity vs Session Validation
  const activeAsajSchedule = useMemo(() => {
    return schedules.find((s) => s.category === 'ASAJ' || s.category === 'ASAS' || s.title?.toUpperCase().includes('ASAJ'));
  }, [schedules]);

  // Session Capacity Calculation
  const capacityAnalysis = useMemo(() => {
    // Grade XII students count
    const grade12Students = students.filter((s) => {
      const u = (s.kelas || '').toUpperCase();
      return u.startsWith('XII') || u.includes('12');
    });
    const totalG12Count = grade12Students.length || 90; // Default fallback to 90 students (e.g. 3 classes of 30)

    const sessionCount = activeAsajSchedule?.sessions?.length || (activeAsajSchedule?.sessionMode === 'multi-session' ? 3 : 1);
    const studentsPerSession = Math.ceil(totalG12Count / Math.max(1, sessionCount));
    const isOverCapacity = studentsPerSession > totalQuota;
    const surplusCount = studentsPerSession - totalQuota;

    return {
      totalStudents: totalG12Count,
      sessionCount,
      studentsPerSession,
      isOverCapacity,
      surplusCount,
    };
  }, [students, activeAsajSchedule, totalQuota]);

  // Build Workstations Units Map
  const workstationUnits = useMemo(() => {
    const list = [];
    const activeWorkingLogs = effectiveLogs.filter((l) => l.currentStatus === 'ACTIVE' || l.examStatus === 'ACTIVE');

    for (let i = 1; i <= totalQuota; i++) {
      const unitNumStr = String(i).padStart(2, '0');
      const unitId = `${unitPrefix}${unitNumStr}`;

      // Try matching log by workstationId or pseudo-assign deterministic active logs
      let matchedLog = effectiveLogs.find((l) => l.workstationId === unitId);
      if (!matchedLog && activeWorkingLogs[i - 1]) {
        // Fallback mapping active students across workstations
        matchedLog = activeWorkingLogs[i - 1];
      }

      let status: 'standby' | 'working' | 'warning' | 'completed' = 'standby';
      let progressPercent = 0;
      let isFullscreen = true;
      let violationCount = 0;

      if (matchedLog) {
        violationCount = matchedLog.violationCount || 0;
        isFullscreen = matchedLog.isFullscreen !== false && !matchedLog.isSplitScreen;

        if (matchedLog.currentStatus === 'SUBMITTED' || matchedLog.examStatus === 'SUBMITTED') {
          status = 'completed';
          progressPercent = 100;
        } else if (
          matchedLog.antiCheatColor === 'RED' ||
          matchedLog.isLocked ||
          matchedLog.isBlocked ||
          !isFullscreen ||
          violationCount > 0
        ) {
          status = 'warning';
          progressPercent = Math.min(95, (violationCount * 15) + 30);
        } else {
          status = 'working';
          progressPercent = Math.min(100, Math.round(((matchedLog.lastSavedAnswersCount || 10) / 30) * 100));
        }
      }

      list.push({
        unitId,
        unitIndex: i,
        status,
        log: matchedLog,
        studentName: matchedLog?.studentName,
        studentClass: matchedLog?.className,
        sessionNumber: matchedLog?.sessionNumber || 1,
        progressPercent,
        isFullscreen,
        violationCount,
      });
    }

    return list;
  }, [totalQuota, unitPrefix, effectiveLogs]);

  // Filtered Workstation Units for Search & Status
  const filteredUnits = useMemo(() => {
    return workstationUnits.filter((u) => {
      const matchSearch =
        u.unitId.toLowerCase().includes(searchUnit.toLowerCase()) ||
        (u.studentName || '').toLowerCase().includes(searchUnit.toLowerCase()) ||
        (u.studentClass || '').toLowerCase().includes(searchUnit.toLowerCase());

      let matchStatus = true;
      if (statusFilter === 'ACTIVE') matchStatus = u.status === 'working';
      if (statusFilter === 'WARNING') matchStatus = u.status === 'warning';
      if (statusFilter === 'STANDBY') matchStatus = u.status === 'standby';
      if (statusFilter === 'COMPLETED') matchStatus = u.status === 'completed';

      return matchSearch && matchStatus;
    });
  }, [workstationUnits, searchUnit, statusFilter]);

  // Count Summary Metrics
  const metrics = useMemo(() => {
    const activeCount = workstationUnits.filter((u) => u.status === 'working').length;
    const warningCount = workstationUnits.filter((u) => u.status === 'warning').length;
    const completedCount = workstationUnits.filter((u) => u.status === 'completed').length;
    const standbyCount = workstationUnits.filter((u) => u.status === 'standby').length;
    const inUseTotal = activeCount + warningCount;

    return {
      totalQuota,
      inUseTotal,
      activeCount,
      warningCount,
      completedCount,
      standbyCount,
    };
  }, [workstationUnits, totalQuota]);

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Top Controls & Metrics Bar */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Monitor className="w-3.5 h-3.5 text-indigo-600" />
              <span>LIVE DEVICE MONITOR &bull; MANAJEMEN UNIT LAB</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Monitoring Real-Time Chromebook &amp; Laptop</span>
              <span className="text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-mono">
                {roomName}
              </span>
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-2xl">
              Memantau status interaktif workstation lab sekolah secara real-time: unit aktif, mode layar penuh (auto-kiosk), dan deteksi selesai ujian untuk rotasi sesi berikutnya.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsConfigOpen(!isConfigOpen)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border border-slate-200"
            >
              <Settings2 className="w-4 h-4 text-slate-600" />
              <span>Konfigurasi Kuota ({totalQuota} Unit)</span>
            </button>
          </div>
        </div>

        {/* Capacity Validation & Session Proportionality Banner */}
        <div
          className={`p-4 rounded-2xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            capacityAnalysis.isOverCapacity
              ? 'bg-amber-50/90 border-amber-300 text-amber-950'
              : 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
          }`}
        >
          <div className="flex items-start gap-3">
            {capacityAnalysis.isOverCapacity ? (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-extrabold text-xs">
                {capacityAnalysis.isOverCapacity
                  ? `⚠️ Peringatan Kapasitas: Peserta per Sesi Melebihi Kuota Perangkat Lab!`
                  : `🟢 Kapasitas Proporsional: Sesi Ujian Siap Berjalan Optimal`}
              </p>
              <p className="text-[11px] mt-0.5 leading-relaxed opacity-90">
                {capacityAnalysis.isOverCapacity ? (
                  <>
                    Total <strong>{capacityAnalysis.totalStudents} siswa Kelas XII</strong> dibagi{' '}
                    <strong>{capacityAnalysis.sessionCount} sesi</strong> ={' '}
                    <strong className="text-rose-700">{capacityAnalysis.studentsPerSession} siswa/sesi</strong>.
                    Melebihi kuota perangkat lab sekolah (<strong>{totalQuota} Unit</strong>) sebanyak{' '}
                    <strong>+{capacityAnalysis.surplusCount} peserta</strong>. Disarankan menambah 1 sesi lagi atau menyiapkan unit cadangan.
                  </>
                ) : (
                  <>
                    Total <strong>{capacityAnalysis.totalStudents} siswa Kelas XII</strong> dibagi{' '}
                    <strong>{capacityAnalysis.sessionCount} sesi</strong> ={' '}
                    <strong className="text-emerald-800">{capacityAnalysis.studentsPerSession} siswa/sesi</strong>.
                    Jumlah peserta per sesi seimbang dan mencukupi dengan kuota <strong>{totalQuota} Unit {deviceType === 'chromebook' ? 'Chromebook' : 'Laptop'}</strong>.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-[11px] font-black">
            <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-current shadow-2xs">
              {capacityAnalysis.studentsPerSession} Peserta / Sesi
            </span>
            <span>&bull;</span>
            <span className="px-2.5 py-1 rounded-lg bg-white/80 border border-current shadow-2xs">
              {totalQuota} Unit Kuota
            </span>
          </div>
        </div>

        {/* 4 Real-Time Metrics Counters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: Kuota Terdaftar */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
              <span>Total Kuota Unit</span>
              <Monitor className="w-4 h-4 text-slate-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {metrics.totalQuota}
              </span>
              <span className="text-xs text-slate-500 font-bold">Unit Terdaftar</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              Workstation {unitPrefix}01 - {unitPrefix}{String(totalQuota).padStart(2, '0')}
            </p>
          </div>

          {/* Card 2: Sedang Digunakan (Aktif) */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-bold">
              <span>Sedang Digunakan</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-emerald-800 font-mono">
                {metrics.activeCount}
              </span>
              <span className="text-xs text-emerald-700 font-bold">/ {metrics.totalQuota} Unit</span>
            </div>
            <p className="text-[10px] text-emerald-700 font-semibold truncate">
              🟢 Sedang Login &amp; Mengerjakan
            </p>
          </div>

          {/* Card 3: Peringatan Fokus */}
          <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-1">
            <div className="flex items-center justify-between text-rose-700 text-xs font-bold">
              <span>Peringatan Fokus / Layar</span>
              <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-rose-800 font-mono">
                {metrics.warningCount}
              </span>
              <span className="text-xs text-rose-700 font-bold">Unit Perhatian</span>
            </div>
            <p className="text-[10px] text-rose-700 font-semibold truncate">
              🔴 Keluar Fullscreen / Ganti Tab
            </p>
          </div>

          {/* Card 4: Tersedia / Standby */}
          <div className="p-4 rounded-2xl bg-slate-100/90 border border-slate-200 space-y-1">
            <div className="flex items-center justify-between text-slate-600 text-xs font-bold">
              <span>Tersedia (Standby)</span>
              <CheckCircle2 className="w-4 h-4 text-slate-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-800 font-mono">
                {metrics.standbyCount + metrics.completedCount}
              </span>
              <span className="text-xs text-slate-600 font-bold">Unit Siap Pakai</span>
            </div>
            <p className="text-[10px] text-slate-600 font-semibold truncate">
              ⚪ {metrics.completedCount > 0 ? `${metrics.completedCount} Baru Selesai & Rotasi` : 'Di Halaman Login'}
            </p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-600 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <span>Filter Status:</span>
            </span>
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({totalQuota})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Aktif Mengerjakan ({metrics.activeCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('WARNING')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'WARNING'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>Peringatan ({metrics.warningCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('STANDBY')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'STANDBY'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-slate-400" />
              <span>Standby ({metrics.standbyCount})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari Unit (CB-01) atau Siswa..."
              value={searchUnit}
              onChange={(e) => setSearchUnit(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Configuration Modal Drawer */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white p-6 rounded-3xl border-2 border-indigo-200 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-slate-900">
                      Pengaturan Kuota &amp; Identitas Workstation Lab
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Tentukan jumlah unit laptop/Chromebook yang tersedia di laboratorium komputer.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveQuotaConfig} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Kuota Unit:</label>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={totalQuota}
                    onChange={(e) => setTotalQuota(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Default rekomendasi: 30 Unit</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Prefix Penomoran:</label>
                  <select
                    value={unitPrefix}
                    onChange={(e) => setUnitPrefix(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="CB-">CB- (Chromebook Lab)</option>
                    <option value="LAPTOP-">LAPTOP- (Laptop Sekolah)</option>
                    <option value="PC-">PC- (Komputer PC Lab)</option>
                    <option value="UNIT-">UNIT- (Standar)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Format: {unitPrefix}01 s/d {unitPrefix}{totalQuota}</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Jenis Perangkat Default:</label>
                  <select
                    value={deviceType}
                    onChange={(e) => setDeviceType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="chromebook">Google Chromebook (ChromeOS)</option>
                    <option value="laptop">Laptop / Notebook Sekolah</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Shared Client Mode</span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nama Ruang Laboratorium:</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Lab CBT Utama"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Lokasi fisik ruang ujian</span>
                </div>

                <div className="sm:col-span-2 md:col-span-4 flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsConfigOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-md flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Terapkan Kuota &amp; Workstation ID</span>
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid Visual Status Perangkat (Unit 01 s/d Unit N) */}
      <div className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs text-slate-800">
              Peta Unit Workstation ({filteredUnits.length} dari {totalQuota} Unit Tampil)
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              &bull; Klik kotak unit untuk melihat detail telemetri atau kontrol proktor
            </span>
          </div>

          {/* Color Legend */}
          <div className="hidden lg:flex items-center gap-3 text-[11px] font-bold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-slate-100 border border-slate-300" />
              <span>Standby</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              <span>Online (Mengerjakan)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500 animate-pulse" />
              <span>Peringatan Fokus / Layar</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-sky-500" />
              <span>Selesai &amp; Siap Ganti Sesi</span>
            </span>
          </div>
        </div>

        {/* The Device Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filteredUnits.map((u) => {
            const isStandby = u.status === 'standby';
            const isWorking = u.status === 'working';
            const isWarning = u.status === 'warning';
            const isCompleted = u.status === 'completed';

            let cardBg = 'bg-slate-50/90 border-slate-200 text-slate-600 hover:bg-slate-100';
            let badgeBg = 'bg-slate-200 text-slate-700';

            if (isWarning) {
              cardBg = 'bg-rose-50/90 border-2 border-rose-500 text-rose-950 shadow-md ring-2 ring-rose-400/40 animate-pulse';
              badgeBg = 'bg-rose-600 text-white';
            } else if (isWorking) {
              cardBg = 'bg-emerald-50/90 border-2 border-emerald-500 text-emerald-950 shadow-sm';
              badgeBg = 'bg-emerald-600 text-white';
            } else if (isCompleted) {
              cardBg = 'bg-sky-50/90 border-2 border-sky-400 text-sky-950 shadow-xs';
              badgeBg = 'bg-sky-600 text-white';
            }

            return (
              <div
                key={u.unitId}
                onClick={() => setSelectedUnitDetail(u)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer active:scale-98 flex flex-col justify-between space-y-2.5 relative touch-manipulation ${cardBg}`}
              >
                {/* Header Unit Card */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 shrink-0 opacity-80" />
                    <span className="font-mono font-black text-xs tracking-tight">{u.unitId}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-black uppercase ${badgeBg}`}>
                    {isWarning ? 'PERINGATAN' : isWorking ? 'AKTIF' : isCompleted ? 'SELESAI' : 'STANDBY'}
                  </span>
                </div>

                {/* Body: Student details or Standby */}
                {u.studentName ? (
                  <div className="space-y-1">
                    <p className="font-extrabold text-[11px] leading-tight truncate text-slate-900" title={u.studentName}>
                      {u.studentName}
                    </p>
                    <div className="flex items-center justify-between text-[10px] opacity-80 font-medium">
                      <span>{u.studentClass || 'Kelas XII'}</span>
                      <span className="font-mono font-bold">Sesi {u.sessionNumber}</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-0.5 pt-1">
                      <div className="flex items-center justify-between text-[9px] font-bold">
                        <span>Progres Soal</span>
                        <span className="font-mono">{u.progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isWarning ? 'bg-rose-500' : isWorking ? 'bg-emerald-500' : 'bg-sky-500'
                          }`}
                          style={{ width: `${u.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Fullscreen Kiosk Mode Indicator */}
                    <div className="pt-0.5 flex items-center justify-between text-[9px] font-mono">
                      <span className="flex items-center gap-1">
                        <Maximize2 className="w-2.5 h-2.5" />
                        <span>Kiosk:</span>
                      </span>
                      <span className={`font-bold ${u.isFullscreen ? 'text-emerald-700' : 'text-rose-700 animate-pulse'}`}>
                        {u.isFullscreen ? 'Layar Penuh' : '⚠️ Non-Fullscreen'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-center space-y-1 opacity-70">
                    <div className="w-8 h-8 rounded-xl bg-slate-200/60 mx-auto flex items-center justify-center text-slate-500">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-600">Unit Siap Digunakan</p>
                    <p className="text-[9px] text-slate-400">Menunggu Login Sesi</p>
                  </div>
                )}

                {/* Footer status notice */}
                <div className="pt-1.5 border-t border-current/10 flex items-center justify-between text-[9.5px]">
                  <span className="opacity-70 font-mono text-[9px]">
                    {isWarning
                      ? `${u.violationCount}x Peringatan`
                      : isWorking
                      ? 'Tersinkronisasi'
                      : isCompleted
                      ? 'Siap Berganti'
                      : 'Halaman Login'}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal for Selected Unit */}
      <AnimatePresence>
        {selectedUnitDetail && (
          <div
            onClick={() => setSelectedUnitDetail(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 cursor-default space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900 leading-tight flex items-center gap-2">
                      <span>Workstation {selectedUnitDetail.unitId}</span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                        {roomName}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Shared Client Kiosk Mode &bull; {deviceType === 'chromebook' ? 'Google Chromebook Lab' : 'Laptop Sekolah'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUnitDetail(null)}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {/* Status details */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-bold">Status Workstation:</span>
                  <span className="font-mono font-black text-slate-900 uppercase">
                    {selectedUnitDetail.status}
                  </span>
                </div>

                {selectedUnitDetail.studentName ? (
                  <>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-bold">Siswa Aktif:</span>
                      <strong className="text-slate-950 font-bold">{selectedUnitDetail.studentName}</strong>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-bold">Kelas / Rombel:</span>
                      <span className="font-bold text-indigo-700">{selectedUnitDetail.studentClass || 'Kelas XII'}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-bold">Sesi Ujian:</span>
                      <span className="font-bold text-slate-800">Sesi {selectedUnitDetail.sessionNumber}</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-slate-500 font-bold">Mode Fullscreen:</span>
                      <span className={`font-mono font-black ${selectedUnitDetail.isFullscreen ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {selectedUnitDetail.isFullscreen ? '🟢 Terkunci Layar Penuh' : '🔴 Peringatan Keluar Layar Penuh'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-bold">Total Pelanggaran:</span>
                      <span className="font-mono font-black text-amber-700">
                        {selectedUnitDetail.violationCount || 0} Kali
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="py-2 text-center text-slate-500">
                    <p className="font-bold">Workstation ini dalam kondisi Standby.</p>
                    <p className="text-[11px] mt-0.5">Perangkat siap digunakan untuk peserta sesi berikutnya.</p>
                  </div>
                )}
              </div>

              {/* Proctors Controls */}
              {selectedUnitDetail.log && (
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <span className="text-xs font-black text-slate-800 block">Aksi Pengawasan Proktor:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUnlockAction(selectedUnitDetail.log!)}
                      className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Buka Kunci Layar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleResetAction(selectedUnitDetail.log!)}
                      className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reset Status Hijau</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleForceSubmitAction(selectedUnitDetail.log!)}
                      className="sm:col-span-2 p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Paksa Selesai (Force Submit Unit Ini)</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUnitDetail(null)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
