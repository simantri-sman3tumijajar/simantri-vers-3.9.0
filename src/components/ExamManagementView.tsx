import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Laptop,
  Key,
  Users,
  Calendar,
  UserCheck,
  RefreshCw,
  Printer,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  FileSpreadsheet,
  Download,
  BookOpen,
  GraduationCap,
  Sparkles,
  Lock,
  Unlock,
  QrCode,
  Send,
  Eye,
  EyeOff,
  Layers,
  ArrowRight,
  ExternalLink,
  Activity,
  Edit,
  Radio,
  Smartphone,
  DoorOpen,
  CalendarDays,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExamSchedule, TeacherExamAssignment, Student, isUserAdminOrOperator, isUserProctor } from '../types';
import { ProctorMonitorDashboard } from './ProctorMonitorDashboard';
import { LiveDeviceWorkstationMonitor } from './LiveDeviceWorkstationMonitor';
import { CbtTwoStageReviewPanel } from './CbtTwoStageReviewPanel';
import { ExamTokenView } from './ExamTokenView';
import { ExamSecurityManager } from './ExamSecurityManager';
import { ExamBroadcastIncidentPanel } from './ExamBroadcastIncidentPanel';
import { ExamMultiClassRoomsView } from './ExamMultiClassRoomsView';
import { ExamProctorScheduleView } from './ExamProctorScheduleView';
import { MobileProctorMonitorView } from './MobileProctorMonitorView';

export const ExamManagementView: React.FC = () => {
  const {
    state,
    currentUser,
    updateExamTokenConfig,
    generateStudentExamCredentials,
    resetSingleStudentExamCredential,
    saveExamSchedule,
    deleteExamSchedule,
    saveTeacherExamAssignment,
    deleteTeacherExamAssignment,
    showToast,
    setCurrentView,
    activeExamTab,
    setActiveExamTab,
    setActiveExamSession,
    toggleDisabledExamType,
    toggleAllExamsDisabled,
  } = useApp();

  const [localExamTab, setLocalExamTab] = useState<
    | 'token'
    | 'credentials'
    | 'assignments'
    | 'schedules'
    | 'rooms'
    | 'proctors'
    | 'proctor-mobile'
    | 'workstation'
    | 'proctor'
    | 'review'
    | 'security'
    | 'broadcast'
  >((activeExamTab as any) || 'token');

  const isPrivilegedProctorOrAdmin = isUserAdminOrOperator(currentUser) || isUserProctor(currentUser);

  // Enforce isolation: Guru Mapel without proctor mode cannot access supervisor tabs inside exam management
  const safeActiveTab = (!isPrivilegedProctorOrAdmin && ['rooms', 'proctors', 'proctor-mobile', 'proctor', 'security'].includes(localExamTab))
    ? 'assignments'
    : localExamTab;
  const activeTab = safeActiveTab;

  // Token Config
  const tokenConfig = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return (
      state.examManagement?.tokenConfig || {
        activeToken: 'SMAN3-9X2K',
        date: todayStr,
        isEnabled: true,
        generatedAt: new Date().toISOString(),
        history: [],
      }
    );
  }, [state.examManagement?.tokenConfig]);

  const [customTokenInput, setCustomTokenInput] = useState('');
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  // Student Credentials Filter
  const [credSearch, setCredSearch] = useState('');
  const [credClassFilter, setCredClassFilter] = useState('ALL');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [isGeneratingMass, setIsGeneratingMass] = useState(false);

  // Modal Cetak Kartu
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printClassFilter, setPrintClassFilter] = useState('ALL');

  // Modal Penugasan Guru
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    id: '',
    teacherId: '',
    subjectName: '',
    category: 'ASAS' as TeacherExamAssignment['category'],
    targetClasses: [] as string[],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    targetQuestions: 20,
    notes: '',
  });

  // Modal Jadwal Ujian
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    id: '',
    title: '',
    subjectName: '',
    category: 'ASAS' as ExamSchedule['category'],
    targetClasses: [] as string[],
    date: new Date().toISOString().split('T')[0],
    startTime: '07:30',
    endTime: '09:00',
    durationMinutes: 90,
    tokenRequired: true,
    roomName: 'Ruang CBT Utama',
  });

  const school = state.schoolInfo;
  const students = state.students || [];
  const teachers = state.teachers || [];
  const classes = state.classes || [];
  const subjects = state.subjects || [];

  const schedules = state.examManagement?.schedules || [];
  const teacherAssignments = state.examManagement?.teacherAssignments || [];

  const [scheduleStatusFilter, setScheduleStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SCHEDULED' | 'FINISHED'>('ALL');
  const [scheduleSearchQuery, setScheduleSearchQuery] = useState('');

  // 1-Click Toggle Exam Schedule Status
  const handleToggleScheduleStatus = async (sch: ExamSchedule) => {
    let nextStatus: ExamSchedule['status'] = 'Sedang Berlangsung';
    if (sch.status === 'Sedang Berlangsung') {
      nextStatus = 'Selesai';
    } else if (sch.status === 'Selesai') {
      nextStatus = 'Belum Dimulai';
    } else {
      nextStatus = 'Sedang Berlangsung';
    }
    const updated: ExamSchedule = { ...sch, status: nextStatus };
    await saveExamSchedule(updated);
    showToast('Status Sesi Diperbarui', `Sesi ${sch.title} diubah menjadi: ${nextStatus}`, 'success');
  };

  // 1-Click Toggle Token Required for Schedule
  const handleToggleScheduleToken = async (sch: ExamSchedule) => {
    const updated: ExamSchedule = { ...sch, tokenRequired: !sch.tokenRequired };
    await saveExamSchedule(updated);
    showToast('Pengaturan Token Diperbarui', `Sesi ${sch.title} sekarang: ${!sch.tokenRequired ? 'Wajib Token' : 'Bebas Token'}`, 'info');
  };

  // Filtered schedules for vertical stacked list
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      // Status filter
      if (scheduleStatusFilter === 'ACTIVE' && s.status !== 'Sedang Berlangsung') return false;
      if (scheduleStatusFilter === 'SCHEDULED' && s.status !== 'Belum Dimulai') return false;
      if (scheduleStatusFilter === 'FINISHED' && s.status !== 'Selesai') return false;

      // Search query
      if (scheduleSearchQuery.trim()) {
        const q = scheduleSearchQuery.toLowerCase();
        const matchTitle = (s.title || '').toLowerCase().includes(q);
        const matchSubject = (s.subjectName || '').toLowerCase().includes(q);
        const matchRoom = (s.roomName || '').toLowerCase().includes(q);
        const matchCategory = (s.category || '').toLowerCase().includes(q);
        if (!matchTitle && !matchSubject && !matchRoom && !matchCategory) return false;
      }
      return true;
    });
  }, [schedules, scheduleStatusFilter, scheduleSearchQuery]);

  // Filtered Students list with 8-digit credentials
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        (s.nama || '').toLowerCase().includes(credSearch.toLowerCase()) ||
        (s.nisn || '').includes(credSearch) ||
        (s.examUsername || '').includes(credSearch);

      const matchClass = credClassFilter === 'ALL' || s.kelas === credClassFilter;
      return matchSearch && matchClass;
    });
  }, [students, credSearch, credClassFilter]);

  // Statistics
  const stats = useMemo(() => {
    const totalSiswaWithCreds = students.filter((s) => s.examUsername && s.examUsername.length === 8).length;
    const totalGuruAssigned = teacherAssignments.length;
    const totalJadwalAktif = schedules.filter((s) => s.status === 'Belum Dimulai' || s.status === 'Sedang Berlangsung').length;

    return {
      totalSiswa: students.length,
      studentsReady: totalSiswaWithCreds,
      totalGuruAssigned,
      totalJadwalAktif,
      activeToken: tokenConfig.activeToken,
      isTokenEnabled: tokenConfig.isEnabled,
    };
  }, [students, teacherAssignments, schedules, tokenConfig]);

  // Handle Token Action
  const handleGenerateNewToken = async () => {
    setIsGeneratingToken(true);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let newToken = 'SMN3-';
    for (let i = 0; i < 4; i++) {
      newToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    await updateExamTokenConfig(newToken, true);
    setIsGeneratingToken(false);
  };

  const handleCustomTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTokenInput.trim()) return;
    await updateExamTokenConfig(customTokenInput.trim().toUpperCase(), true);
    setCustomTokenInput('');
  };

  // Handle Mass Credential Generation
  const handleGenerateMassCredentials = async () => {
    setIsGeneratingMass(true);
    await generateStudentExamCredentials({
      classFilter: credClassFilter,
      forceResetAll: true,
    });
    setIsGeneratingMass(false);
  };

  // Toggle Password visibility
  const togglePassVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Save Teacher Assignment
  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.teacherId || !assignForm.subjectName) {
      showToast('Form Belum Lengkap', 'Pilih Guru dan Mata Pelajaran.', 'warning');
      return;
    }

    const selectedTeacher = teachers.find((t) => t.id === assignForm.teacherId);
    const newAssignment: TeacherExamAssignment = {
      id: assignForm.id || `asgn-${Date.now()}`,
      teacherId: assignForm.teacherId,
      teacherName: selectedTeacher?.nama || 'Guru Pengampu',
      subjectName: assignForm.subjectName,
      category: assignForm.category,
      targetClasses: assignForm.targetClasses.length > 0 ? assignForm.targetClasses : ['Semua Kelas'],
      dueDate: assignForm.dueDate,
      targetQuestions: Number(assignForm.targetQuestions) || 40,
      currentQuestionsCount: 0,
      status: 'Progres Penggarapan',
      notes: assignForm.notes,
      createdAt: new Date().toISOString(),
    };

    await saveTeacherExamAssignment(newAssignment);
    setIsAssignModalOpen(false);
    setAssignForm({
      id: '',
      teacherId: '',
      subjectName: '',
      category: 'ASAS',
      targetClasses: [],
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      targetQuestions: 40,
      notes: '',
    });
  };

  // Save Exam Schedule
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.title || !scheduleForm.subjectName) {
      showToast('Form Belum Lengkap', 'Isi Nama Ujian dan Mata Pelajaran.', 'warning');
      return;
    }

    const newSchedule: ExamSchedule = {
      id: scheduleForm.id || `sch-${Date.now()}`,
      title: scheduleForm.title,
      subjectName: scheduleForm.subjectName,
      category: scheduleForm.category,
      targetClasses: scheduleForm.targetClasses.length > 0 ? scheduleForm.targetClasses : ['Semua Kelas'],
      date: scheduleForm.date,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      durationMinutes: Number(scheduleForm.durationMinutes) || 90,
      tokenRequired: scheduleForm.tokenRequired,
      status: 'Belum Dimulai',
      roomName: scheduleForm.roomName,
    };

    await saveExamSchedule(newSchedule);
    setIsScheduleModalOpen(false);
    setScheduleForm({
      id: '',
      title: '',
      subjectName: '',
      category: 'ASAS',
      targetClasses: [],
      date: new Date().toISOString().split('T')[0],
      startTime: '07:30',
      endTime: '09:00',
      durationMinutes: 90,
      tokenRequired: true,
      roomName: 'Ruang CBT Utama',
    });
  };

  // Print Cards Students List
  const printableStudents = useMemo(() => {
    return students.filter((s) => printClassFilter === 'ALL' || s.kelas === printClassFilter);
  }, [students, printClassFilter]);

  return (
    <div className="space-y-6 pb-12 selection:bg-cyan-600 selection:text-white">
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 p-6 sm:p-8 text-white shadow-xl shadow-slate-900/20 border border-slate-800">
        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -bottom-20 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-2xs">
              <Laptop className="w-3.5 h-3.5 text-cyan-400" />
              <span>Modul Manajemen Ujian &amp; CBT Terpadu</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Pusat Kendali Ujian &amp; Seleksi Real-Time
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Sistem manajemen terintegrasi Master Data: Jadwal pelaksanaan, token harian (1 hari 1 token), kredensial 8-digit acak siswa, hingga penggarapan bank soal guru mapel (ASAS, ASTS, Simulasi, &amp; Seleksi Olimpiade).
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsPrintModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/25 transition-all cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Kartu Ujian (8 Digit)</span>
            </button>
            <button
              onClick={() => setActiveExamTab('token')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer active:scale-95"
            >
              <Key className="w-4 h-4 text-amber-400" />
              <span>Token Hari Ini: <strong className="text-amber-300 font-mono tracking-wider">{stats.activeToken}</strong></span>
            </button>
          </div>
        </div>

        {/* Real-Time Master Data Connection Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Siswa Terdaftar</p>
              <p className="text-sm font-black text-white">
                {stats.studentsReady} / {stats.totalSiswa} <span className="text-[10px] font-bold text-emerald-400">(Siap CBT)</span>
              </p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Penugasan Guru</p>
              <p className="text-sm font-black text-white">{stats.totalGuruAssigned} Penggarap</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Jadwal Ujian</p>
              <p className="text-sm font-black text-white">{schedules.length} Sesi Terjadwal</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase">Status Token</p>
              <p className="text-sm font-black text-amber-300">
                {stats.isTokenEnabled ? 'Token Aktif Harian' : 'Token Divalidasi Off'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Selector Sesi Ujian CBT Aktif & Fitur Mematikan/Menonaktifkan Jenis Ujian */}
      {(() => {
        const activeType = state.examManagement?.activeExamType || 'SEMUA';
        const activeName = state.examManagement?.activeExamName || 'Semua Jenis Ujian CBT';
        const disabledExamTypes = state.examManagement?.disabledExamTypes || [];
        const allExamsDisabled = Boolean(state.examManagement?.allExamsDisabled);

        const examTypeList: Array<{ id: string; label: string; code: string }> = [
          { id: 'ASTS', label: 'ASTS (Essay)', code: 'ASTS' },
          { id: 'ASAS', label: 'ASAS (PG)', code: 'ASAS' },
          { id: 'DSMART', label: "Simulasi D'SMART", code: 'DSMART' },
          { id: 'SIMULASI', label: 'Simulasi CBT', code: 'SIMULASI' },
          { id: 'Olimpiade', label: 'Seleksi OSN / Olimpiade', code: 'Olimpiade' },
        ];

        return (
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className={`w-3 h-3 rounded-full ${allExamsDisabled ? 'bg-rose-500' : 'bg-emerald-500 animate-ping'}`} />
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">
                    Target Sesi Ujian CBT Aktif Sekolah
                  </span>
                  <span className="font-black text-sm text-slate-900">
                    {allExamsDisabled ? 'SEMUA UJIAN DINONAKTIFKAN (TIDAK ADA UJIAN)' : activeName}
                  </span>
                </div>
              </div>

              {/* Master Disable Toggle */}
              <button
                type="button"
                onClick={() => toggleAllExamsDisabled(!allExamsDisabled)}
                className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                  allExamsDisabled
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {allExamsDisabled ? <EyeOff className="w-4 h-4 text-white" /> : <Eye className="w-4 h-4 text-emerald-600" />}
                <span>{allExamsDisabled ? 'Status: Semua Ujian Dimatikan' : 'Matikan Semua Ujian (Hari Ini)'}</span>
              </button>
            </div>

            {/* Sub-section: Filter Active Session & Matikan Jenis Ujian Spesifik */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Matikan / Nonaktifkan Jenis Ujian Tertentu (Siswa akan melihat "Tidak Ada Ujian"):</span>
                </span>
                {disabledExamTypes.length > 0 && !allExamsDisabled && (
                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                    {disabledExamTypes.length} Jenis Ujian Dimatikan
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {examTypeList.map((ex) => {
                  const isDisabled = disabledExamTypes.includes(ex.id) || allExamsDisabled;
                  const isCurrentActiveSession = activeType === ex.id;

                  return (
                    <div
                      key={ex.id}
                      className={`p-3 rounded-2xl border transition-all flex flex-col justify-between space-y-2 relative overflow-hidden ${
                        isDisabled
                          ? 'bg-rose-50/70 border-rose-300 text-rose-950 shadow-2xs'
                          : isCurrentActiveSession
                          ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-black tracking-tight text-slate-900 truncate">
                          {ex.label}
                        </span>
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isDisabled ? 'bg-rose-600' : 'bg-emerald-500'
                          }`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] pt-1 border-t border-slate-200/60">
                        <span className={`font-mono font-bold ${isDisabled ? 'text-rose-700' : 'text-slate-600'}`}>
                          {isDisabled ? 'MATI' : 'AKTIF'}
                        </span>

                        <div className="flex items-center gap-1">
                          {!isDisabled && (
                            <button
                              type="button"
                              onClick={() => setActiveExamSession(ex.id as any)}
                              className={`px-1.5 py-0.5 rounded-md font-bold text-[9px] ${
                                isCurrentActiveSession
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                              }`}
                              title="Pilih sebagai sesi aktif utama"
                            >
                              {isCurrentActiveSession ? 'Pilihan' : 'Pilih'}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => toggleDisabledExamType(ex.id)}
                            className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] transition-all cursor-pointer ${
                              isDisabled
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                : 'bg-rose-600 text-white hover:bg-rose-700'
                            }`}
                          >
                            {isDisabled ? 'Aktifkan' : 'Matikan'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs Navigation Bar */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-wrap items-center gap-1 text-xs font-bold">
        <button
          onClick={() => {
            setLocalExamTab('token');
            setActiveExamTab('token');
          }}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'token'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>Token Ujian Harian</span>
        </button>

        <button
          onClick={() => {
            setLocalExamTab('credentials');
            setActiveExamTab('credentials');
          }}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'credentials'
              ? 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Kredensial Siswa (8 Digit)</span>
        </button>

        <button
          onClick={() => {
            setLocalExamTab('assignments');
            setActiveExamTab('assignments');
          }}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'assignments'
              ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Penugasan Guru Mapel</span>
        </button>

        <button
          onClick={() => {
            setLocalExamTab('schedules');
            setActiveExamTab('schedules');
          }}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'schedules'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Jadwal Pelaksanaan Ujian</span>
        </button>

        {isPrivilegedProctorOrAdmin && (
          <>
            <button
              onClick={() => {
                setLocalExamTab('rooms');
              }}
              className={`flex-1 min-w-[170px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'rooms'
                  ? 'bg-gradient-to-r from-teal-600 via-emerald-600 to-indigo-600 text-white shadow-md shadow-teal-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <DoorOpen className="w-4 h-4 text-emerald-300" />
              <span>Ruang Campuran &amp; No Peserta</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-950">
                Smart No
              </span>
            </button>

            <button
              onClick={() => {
                setLocalExamTab('proctors');
              }}
              className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'proctors'
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-700 text-white shadow-md shadow-violet-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <CalendarDays className="w-4 h-4 text-violet-300" />
              <span>Jadwal Pengawas (Multi-Hari)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-purple-100 text-purple-950">
                Anti-Bentrok
              </span>
            </button>

            <button
              onClick={() => {
                setLocalExamTab('proctor-mobile');
              }}
              className={`flex-1 min-w-[160px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'proctor-mobile'
                  ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-teal-300" />
              <span>Monitoring Pengawas (Mobile/PC)</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-teal-100 text-teal-950">
                PIN 482910
              </span>
            </button>
          </>
        )}

        <button
          onClick={() => {
            setLocalExamTab('workstation');
          }}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'workstation'
              ? 'bg-gradient-to-r from-sky-600 via-indigo-600 to-indigo-700 text-white shadow-md shadow-sky-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Laptop className="w-4 h-4 text-sky-400" />
          <span>Kapasitas &amp; Unit Lab</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-sky-100 text-sky-950 font-mono">
            {state.examManagement?.labCapacity?.totalQuota || 30} Unit
          </span>
        </button>

        {isPrivilegedProctorOrAdmin && (
          <>
            <button
              onClick={() => {
                setLocalExamTab('proctor');
              }}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'proctor'
                  ? 'bg-gradient-to-r from-emerald-600 to-indigo-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Live Monitor Pengawas</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-900">
                Sensor
              </span>
            </button>

            <button
              onClick={() => {
                setLocalExamTab('security');
              }}
              className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
                activeTab === 'security'
                  ? 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-300" />
              <span>Keamanan &amp; PIN Pengawas</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-900">
                6-Digit
              </span>
            </button>
          </>
        )}

        <button
          onClick={() => {
            setLocalExamTab('broadcast');
          }}
          className={`flex-1 min-w-[150px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'broadcast'
              ? 'bg-gradient-to-r from-rose-600 via-indigo-600 to-indigo-700 text-white shadow-md shadow-rose-600/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Radio className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>Pengumuman &amp; Kontrol Insiden</span>
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-100 text-rose-950">
            Realtime
          </span>
        </button>

        <button
          onClick={() => {
            setLocalExamTab('review');
          }}
          className={`flex-1 min-w-[140px] py-2.5 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === 'review'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-300" />
          <span>Tinjauan Nilai (Draf &rarr; Final)</span>
        </button>
      </div>

      {/* TAB PUSAT PENGUMUMAN & KONTROL INSIDEN */}
      {activeTab === 'broadcast' && (
        <ExamBroadcastIncidentPanel embedded={true} />
      )}

      {/* TAB KEAMANAN & PIN PENGAWAS */}
      {activeTab === 'security' && (
        <ExamSecurityManager />
      )}

      {/* TAB REVIEW: TINJAUAN & VERIFIKASI NILAI CBT (DRAF -> FINAL) */}
      {activeTab === 'review' && (
        <CbtTwoStageReviewPanel embedded={true} />
      )}

      {/* TAB 1: TOKEN UJIAN BERDASARKAN JENJANG KELAS (X, XI, XII) */}
      {activeTab === 'token' && (
        <ExamTokenView />
      )}

      {/* TAB 2: KREDENSIAL SISWA (USERNAME & PASSWORD 8 DIGIT) */}
      {activeTab === 'credentials' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                  Terintegrasi Real-Time Master Data Siswa
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Kredensial Login Ujian Siswa (8 Digit Angka Acak)
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Rule Sesuai Kebijakan: Username &amp; Password siswa berupa 8-digit angka acak yang sama. Kredensial dapat digenerate massal atau direset per siswa.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleGenerateMassCredentials}
                  disabled={isGeneratingMass}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <Sparkles className={`w-4 h-4 ${isGeneratingMass ? 'animate-spin' : ''}`} />
                  <span>Generate Massal (8 Digit Acak)</span>
                </button>

                <button
                  onClick={() => setIsPrintModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>Cetak Kartu Ujian (A4)</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  value={credSearch}
                  onChange={(e) => setCredSearch(e.target.value)}
                  placeholder="Cari Nama, NISN, Username..."
                  className="w-full pl-10 pr-3 py-2 bg-white border border-slate-300 focus:border-indigo-600 rounded-xl text-xs font-semibold focus:outline-hidden"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700">Filter Kelas:</span>
                <select
                  value={credClassFilter}
                  onChange={(e) => setCredClassFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-hidden"
                >
                  <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.nama}>
                      {c.nama} ({students.filter((s) => s.kelas === c.nama).length} Siswa)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Student Credential Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-100/80 text-slate-800 font-extrabold uppercase text-[10.5px] border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-center w-12">No</th>
                    <th className="p-3">Nama Siswa &amp; NISN</th>
                    <th className="p-3">Kelas / Rombel</th>
                    <th className="p-3">Username Ujian (8 Digit)</th>
                    <th className="p-3">Password Ujian (8 Digit)</th>
                    <th className="p-3 text-center">Status Akses</th>
                    <th className="p-3 text-center">Aksi Reset</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        Tidak ada data siswa ditemukan untuk filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((std, idx) => {
                      const hasCreds = std.examUsername && std.examUsername.length === 8;
                      const isPassVisible = showPasswords[std.id];

                      return (
                        <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-500">{idx + 1}</td>
                          <td className="p-3">
                            <p className="font-extrabold text-slate-900">{std.nama}</p>
                            <p className="text-[10.5px] text-slate-500 font-mono">NISN: {std.nisn || '-'}</p>
                          </td>
                          <td className="p-3">
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-black bg-slate-100 text-slate-800 border border-slate-200">
                              {std.kelas}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-mono text-sm font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                              {std.examUsername || 'Belum Set'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                                {isPassVisible ? std.examPassword : '••••••••'}
                              </span>
                              <button
                                onClick={() => togglePassVisibility(std.id)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="Lihat/Sembunyikan Password"
                              >
                                {isPassVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            {hasCreds ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                Siap Ujian
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 border border-amber-300">
                                Butuh Generate
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => resetSingleStudentExamCredential(std.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-extrabold text-[11px] border border-amber-300 transition-all cursor-pointer flex items-center justify-center gap-1 mx-auto"
                              title="Reset Username/Password 8 Digit Baru"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Reset 8-Digit</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PENUGASAN GURU MAPEL (PENGGARAPAN SOAL UJIAN) */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-cyan-100 text-cyan-900 border border-cyan-200">
                  Penggarapan Bank Soal &amp; Seleksi
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Penugasan Guru Mapel untuk Soal Ujian
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Plotting guru mapel untuk membuat soal Bahan Simulasi, Seleksi OSN, Olimpiade Sekolah, hingga ASAS/ASTS yang langsung terkoneksi ke bank soal.
                </p>
              </div>

              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95 flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Penugasan Guru</span>
              </button>
            </div>

            {/* Assignments Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-xs text-left text-slate-700">
                <thead className="bg-slate-100/80 text-slate-800 font-extrabold uppercase text-[10.5px] border-b border-slate-200">
                  <tr>
                    <th className="p-3">Guru Pengampu</th>
                    <th className="p-3">Mata Pelajaran</th>
                    <th className="p-3">Kategori Ujian</th>
                    <th className="p-3">Target Kelas</th>
                    <th className="p-3 text-center">Target Soal</th>
                    <th className="p-3">Tenggat Waktu</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {teacherAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        Belum ada penugasan penggarapan soal guru mapel. Klik tombol &quot;Tambah Penugasan Guru&quot; untuk memulai.
                      </td>
                    </tr>
                  ) : (
                    teacherAssignments.map((asgn) => (
                      <tr key={asgn.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-extrabold text-slate-900">{asgn.teacherName}</td>
                        <td className="p-3 font-bold text-indigo-700">{asgn.subjectName}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-cyan-100 text-cyan-900 border border-cyan-300">
                            {asgn.category}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-[11px] font-bold text-slate-700">
                            {Array.isArray(asgn.targetClasses) ? asgn.targetClasses.join(', ') : asgn.targetClasses}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-800">
                          {asgn.targetQuestions} Butir
                        </td>
                        <td className="p-3 font-bold text-slate-600">{asgn.dueDate}</td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            {asgn.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <button
                            onClick={() => deleteTeacherExamAssignment(asgn.id)}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Penugasan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: JADWAL PELAKSANAAN UJIAN (VERTICAL STACKED LIST WITH 1-CLICK TOGGLES) */}
      {activeTab === 'schedules' && (
        <div className="space-y-5">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                  Manajemen Sesi Ujian CBT
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  Jadwal Pelaksanaan Sesi Ujian (Vertical Stacked List)
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Pantau status sesi, aktifkan sesi dengan 1-klik toggle, atur wajib token, dan kelola alokasi ruang ujian.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setScheduleForm({
                    id: '',
                    title: '',
                    subjectName: '',
                    category: 'ASAS',
                    targetClasses: [],
                    date: new Date().toISOString().split('T')[0],
                    startTime: '07:30',
                    endTime: '09:00',
                    durationMinutes: 90,
                    tokenRequired: true,
                    roomName: 'Ruang CBT Utama',
                  });
                  setIsScheduleModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer active:scale-95 flex items-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Jadwal Ujian</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                <span className="font-bold text-slate-600">Filter Status:</span>
                <button
                  type="button"
                  onClick={() => setScheduleStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    scheduleStatusFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Semua ({schedules.length})
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleStatusFilter('ACTIVE')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    scheduleStatusFilter === 'ACTIVE'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Aktif ({schedules.filter((s) => s.status === 'Sedang Berlangsung').length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleStatusFilter('SCHEDULED')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    scheduleStatusFilter === 'SCHEDULED'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>Terjadwal ({schedules.filter((s) => s.status === 'Belum Dimulai' || !s.status).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScheduleStatusFilter('FINISHED')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    scheduleStatusFilter === 'FINISHED'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  Selesai ({schedules.filter((s) => s.status === 'Selesai').length})
                </button>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={scheduleSearchQuery}
                  onChange={(e) => setScheduleSearchQuery(e.target.value)}
                  placeholder="Cari Mata Pelajaran, Judul, Ruang..."
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:border-purple-600"
                />
              </div>
            </div>

            {/* Vertical Stacked List of Exam Schedules */}
            <div className="space-y-3">
              {filteredSchedules.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 rounded-3xl border border-slate-200 text-slate-400 space-y-2">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="font-bold text-sm text-slate-600">Tidak ada jadwal sesi ujian yang sesuai filter.</p>
                  <p className="text-xs">Klik tombol &quot;Tambah Jadwal Ujian&quot; untuk membuat sesi baru.</p>
                </div>
              ) : (
                filteredSchedules.map((sch) => {
                  const isActive = sch.status === 'Sedang Berlangsung';
                  const isScheduled = sch.status === 'Belum Dimulai' || !sch.status;
                  const isFinished = sch.status === 'Selesai';

                  return (
                    <div
                      key={sch.id}
                      className={`p-4 sm:p-5 rounded-3xl border-2 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                        isActive
                          ? 'bg-emerald-50/40 border-emerald-400 shadow-md ring-2 ring-emerald-500/20'
                          : isScheduled
                          ? 'bg-white hover:bg-slate-50/90 border-slate-200 shadow-xs'
                          : 'bg-slate-50/80 border-slate-200 text-slate-500 opacity-80'
                      }`}
                    >
                      {/* Left Block: Badges, Title & Meta */}
                      <div className="space-y-2 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Status Badge */}
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-2xs">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                              <span>Aktif / Berlangsung</span>
                            </span>
                          ) : isScheduled ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black bg-sky-100 text-sky-900 border border-sky-300">
                              <Clock className="w-3 h-3 text-sky-600" />
                              <span>Terjadwal</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10.5px] font-black bg-slate-200 text-slate-800 border border-slate-300">
                              <CheckCircle2 className="w-3 h-3 text-slate-600" />
                              <span>Nonaktif / Selesai</span>
                            </span>
                          )}

                          {/* Category Badge */}
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300">
                            {sch.category}
                          </span>

                          {/* Room Badge */}
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {sch.roomName || 'Ruang CBT Utama'}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-black text-slate-900 text-base sm:text-lg leading-tight">
                            {sch.title}
                          </h4>
                          <p className="text-xs font-bold text-indigo-700 mt-0.5">
                            {sch.subjectName}
                          </p>
                        </div>

                        {/* Metadata Details Row */}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-1">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-purple-600" />
                            <span>{sch.date}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-purple-600" />
                            <strong className="text-slate-800 font-mono">
                              {sch.startTime} - {sch.endTime}
                            </strong>{' '}
                            <span>({sch.durationMinutes} Menit)</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-purple-600" />
                            <span>
                              Target: <strong className="text-slate-800">{Array.isArray(sch.targetClasses) ? sch.targetClasses.join(', ') : sch.targetClasses}</strong>
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Right Block: 1-Click Interactive Toggles & Actions */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200">
                        {/* 1-Click Status Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleScheduleStatus(sch)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs ${
                            isActive
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              : isScheduled
                              ? 'bg-slate-100 hover:bg-emerald-50 text-slate-800 border border-slate-300 hover:border-emerald-400'
                              : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                          }`}
                          title="Klik untuk mengubah status sesi secara instan"
                        >
                          <div className="flex items-center justify-center">
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white animate-ping' : 'bg-slate-400'}`} />
                          </div>
                          <span>
                            {isActive
                              ? 'Status: Aktif'
                              : isScheduled
                              ? 'Klik: Aktifkan'
                              : 'Klik: Jadwalkan Ulang'}
                          </span>
                        </button>

                        {/* 1-Click Token Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleScheduleToken(sch)}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                            sch.tokenRequired
                              ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                          }`}
                          title="1-Klik toggle validasi token untuk sesi ini"
                        >
                          {sch.tokenRequired ? (
                            <>
                              <div className="flex items-center justify-center">
                                <Lock className="w-3.5 h-3.5 text-amber-700" />
                              </div>
                              <span>Wajib Token: <strong className="font-mono text-amber-950">{tokenConfig.activeToken}</strong></span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5 text-slate-500" />
                              <span>Bebas Token</span>
                            </>
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setScheduleForm({
                              id: sch.id,
                              title: sch.title,
                              subjectName: sch.subjectName,
                              category: sch.category,
                              targetClasses: Array.isArray(sch.targetClasses) ? sch.targetClasses : [sch.targetClasses],
                              date: sch.date,
                              startTime: sch.startTime,
                              endTime: sch.endTime,
                              durationMinutes: sch.durationMinutes,
                              tokenRequired: Boolean(sch.tokenRequired),
                              roomName: sch.roomName || 'Ruang CBT Utama',
                            });
                            setIsScheduleModalOpen(true);
                          }}
                          className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 transition-all cursor-pointer"
                          title="Edit Jadwal"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => deleteExamSchedule(sch.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer"
                          title="Hapus Sesi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: MANAJEMEN RUANG UJIAN CAMPURAN & SMART NO PESERTA */}
      {activeTab === 'rooms' && (
        <div className="space-y-6">
          <ExamMultiClassRoomsView />
        </div>
      )}

      {/* TAB: PENJADWALAN PENGAWAS UJIAN (MULTI-HARI & MULTI-SESI) */}
      {activeTab === 'proctors' && (
        <div className="space-y-6">
          <ExamProctorScheduleView />
        </div>
      )}

      {/* TAB: MONITORING PENGAWAS BERBASIS MOBILE-FIRST (HP GURU) */}
      {activeTab === 'proctor-mobile' && (
        <div className="space-y-6">
          <div className="max-w-2xl mx-auto">
            <MobileProctorMonitorView />
          </div>
        </div>
      )}

      {/* TAB: KAPASITAS & LIVE UNIT LAB (WORKSTATION MONITOR) */}
      {activeTab === 'workstation' && (
        <div className="space-y-6">
          <LiveDeviceWorkstationMonitor />
        </div>
      )}

      {/* TAB 5: LIVE MONITOR PENGAWAS (ANTI-CHEAT SENSOR) */}
      {activeTab === 'proctor' && (
        <div className="space-y-6">
          <ProctorMonitorDashboard />
        </div>
      )}

      {/* MODAL CETAK KARTU UJIAN SISWA (A4 PRINTABLE) */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Cetak Kartu Login Ujian Siswa (Format A4 Resmi)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Kartu login berisi Username &amp; Password 8 digit angka acak untuk peserta CBT.
                  </p>
                </div>
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 min-h-0 overscroll-contain">
                {/* Controls & Filter */}
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Pilih Kelas:</span>
                  <select
                    value={printClassFilter}
                    onChange={(e) => setPrintClassFilter(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
                  >
                    <option value="ALL">Semua Kelas ({students.length} Siswa)</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.nama}>
                        {c.nama} ({students.filter((s) => s.kelas === c.nama).length} Siswa)
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>Cetak Sekarang (Print)</span>
                </button>
              </div>

              {/* Printable Grid Preview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-2 bg-slate-100 rounded-2xl border border-slate-200 max-h-[500px] overflow-y-auto">
                {printableStudents.map((std) => (
                  <div key={std.id} className="p-4 bg-white rounded-2xl border border-slate-300 shadow-xs space-y-2 relative">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <img
                          src={school.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                          alt="Logo"
                          className="h-7 w-auto object-contain"
                        />
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-900 leading-tight">
                            KARTU UJIAN CBT
                          </p>
                          <p className="text-[9px] font-bold text-slate-600">
                            {school.namaSekolah || 'SMAN 3 TUMIJAJAR'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                        {std.kelas}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 pt-1">
                      <p className="font-extrabold text-slate-900">{std.nama}</p>
                      <p className="text-[10.5px] text-slate-600 font-mono">NISN: {std.nisn || '-'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Username (8 Digit)</p>
                        <p className="font-mono text-xs font-black text-indigo-700">{std.examUsername || '83920147'}</p>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                        <p className="text-[9px] font-bold text-slate-500 uppercase">Password (8 Digit)</p>
                        <p className="font-mono text-xs font-black text-slate-900">{std.examPassword || '83920147'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL TAMBAH PENUGASAN GURU */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden"
            >
              <div className="p-6 pb-4 border-b border-slate-100 shrink-0">
                <h3 className="text-lg font-black text-slate-900">
                  Tambah Penugasan Penggarapan Soal Guru
                </h3>
              </div>

              <form onSubmit={handleSaveAssignment} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-6 space-y-3 text-xs overflow-y-auto flex-1 min-h-0 overscroll-contain">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Pilih Guru Pengampu:</label>
                  <select
                    value={assignForm.teacherId}
                    onChange={(e) => setAssignForm({ ...assignForm, teacherId: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="">-- Pilih Guru --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nama} ({t.mataPelajaran?.join(', ') || 'Guru'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran:</label>
                  <select
                    value={assignForm.subjectName}
                    onChange={(e) => setAssignForm({ ...assignForm, subjectName: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {subjects.map((sbj) => (
                      <option key={sbj.id} value={sbj.nama}>
                        {sbj.nama} (Fase {sbj.fase})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Ujian:</label>
                  <select
                    value={assignForm.category}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setAssignForm({
                        ...assignForm,
                        category: cat,
                        targetQuestions: cat === "Simulasi D'SMART Lampung" ? 50 : assignForm.targetQuestions,
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="ASAS">Penyusunan ASAS (Sumatif Akhir Semester)</option>
                    <option value="ASTS">Penyusunan ASTS (Sumatif Tengah Semester)</option>
                    <option value="Simulasi D'SMART Lampung">Simulasi D'SMART Lampung (50 Soal PG HOTS)</option>
                    <option value="Simulasi CBT">Bahan Simulasi CBT</option>
                    <option value="Seleksi OSN/Olimpiade">Seleksi OSN / Olimpiade Sains</option>
                    <option value="Olimpiade Sekolah">Olimpiade Tingkat Sekolah</option>
                    <option value="Remedial/Susulan">Ujian Susulan &amp; Remedial</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Soal (Butir):</label>
                    <input
                      type="number"
                      value={assignForm.targetQuestions}
                      onChange={(e) => setAssignForm({ ...assignForm, targetQuestions: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tenggat Waktu:</label>
                    <input
                      type="date"
                      value={assignForm.dueDate}
                      onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-cyan-600 text-white font-black shadow-md cursor-pointer"
                  >
                    Simpan Penugasan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL TAMBAH JADWAL UJIAN */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden"
            >
              <div className="p-6 pb-4 border-b border-slate-100 shrink-0">
                <h3 className="text-lg font-black text-slate-900">
                  Tambah Jadwal Pelaksanaan Ujian
                </h3>
              </div>

              <form onSubmit={handleSaveSchedule} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-6 space-y-3 text-xs overflow-y-auto flex-1 min-h-0 overscroll-contain">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Sesi / Judul Ujian:</label>
                  <input
                    type="text"
                    required
                    value={scheduleForm.title}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                    placeholder="e.g. ASAS Ganjil Matematika Fase F"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran:</label>
                  <select
                    value={scheduleForm.subjectName}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, subjectName: e.target.value })}
                    required
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {subjects.map((sbj) => (
                      <option key={sbj.id} value={sbj.nama}>
                        {sbj.nama} (Fase {sbj.fase})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Ujian:</label>
                  <select
                    value={scheduleForm.category}
                    onChange={(e) => {
                      const cat = e.target.value as any;
                      setScheduleForm({
                        ...scheduleForm,
                        category: cat,
                        title: cat === "Simulasi D'SMART Lampung" && !scheduleForm.title ? "Simulasi D'SMART Lampung 2026" : scheduleForm.title,
                      });
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                  >
                    <option value="ASAS">ASAS (Sumatif Akhir Semester)</option>
                    <option value="ASTS">ASTS (Sumatif Tengah Semester)</option>
                    <option value="Simulasi D'SMART Lampung">Simulasi D'SMART Lampung (50 Soal PG HOTS)</option>
                    <option value="Simulasi CBT">Bahan Simulasi CBT</option>
                    <option value="Seleksi OSN/Olimpiade">Seleksi OSN / Olimpiade Sains</option>
                    <option value="Olimpiade Sekolah">Olimpiade Tingkat Sekolah</option>
                    <option value="Remedial/Susulan">Ujian Susulan &amp; Remedial</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tanggal Ujian:</label>
                    <input
                      type="date"
                      required
                      value={scheduleForm.date}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Durasi (Menit):</label>
                    <input
                      type="number"
                      value={scheduleForm.durationMinutes}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: Number(e.target.value) })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jam Mulai:</label>
                    <input
                      type="time"
                      value={scheduleForm.startTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jam Selesai:</label>
                    <input
                      type="time"
                      value={scheduleForm.endTime}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 text-white font-black shadow-md cursor-pointer"
                  >
                    Simpan Jadwal Ujian
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
