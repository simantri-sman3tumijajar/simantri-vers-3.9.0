import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calendar,
  Smartphone,
  GraduationCap,
  Plus,
  Trash2,
  Clock,
  Laptop,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Key,
  Lock,
  Unlock,
  Edit,
  Power,
  Settings2,
  AlertCircle,
  X,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ExamSchedule } from '../types';

export const ExamSchedulesView: React.FC = () => {
  const {
    state,
    saveExamSchedule,
    deleteExamSchedule,
    showToast,
  } = useApp();

  const schedules = state.examManagement?.schedules || [];
  const subjects = state.subjects || [];
  const classes = state.classes || [];

  // Filter & Search states
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SCHEDULED' | 'INACTIVE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchSchedule, setSearchSchedule] = useState('');
  
  // Modal states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);

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
    activationMode: 'scheduled' as 'manual' | 'scheduled',
    isManuallyActive: false,
    roomName: 'Ruang CBT Utama',
    sessionMode: 'non-session' as 'non-session' | 'multi-session',
    sessions: [
      {
        sessionNumber: 1,
        sessionName: 'Sesi 1 (Pagi)',
        startTime: '07:30',
        endTime: '09:30',
        token: 'ASAJ01',
        roomName: 'Lab Komputer 1',
        assignedClasses: ['XII-1'],
      },
      {
        sessionNumber: 2,
        sessionName: 'Sesi 2 (Siang)',
        startTime: '09:45',
        endTime: '11:45',
        token: 'ASAJ02',
        roomName: 'Lab Komputer 1',
        assignedClasses: ['XII-2'],
      },
      {
        sessionNumber: 3,
        sessionName: 'Sesi 3 (Sore)',
        startTime: '13:00',
        endTime: '15:00',
        token: 'ASAJ03',
        roomName: 'Lab Komputer 1',
        assignedClasses: ['XII-3'],
      },
    ] as any[],
    devicePolicy: 'hybrid' as 'android_only' | 'lab_client_only' | 'hybrid',
  });

  // Filtered list
  const filteredSchedules = useMemo(() => {
    return schedules.filter((s) => {
      const isActive = s.status === 'Sedang Berlangsung' || s.isManuallyActive;
      const isScheduled = (s.status === 'Belum Dimulai' || !s.status) && !s.isManuallyActive;
      const isInactive = (s.status === 'Selesai' || s.status === 'Terkunci') && !s.isManuallyActive;

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && isActive) ||
        (statusFilter === 'SCHEDULED' && isScheduled) ||
        (statusFilter === 'INACTIVE' && isInactive);

      const matchCat = categoryFilter === 'ALL' || s.category === categoryFilter;

      const matchSearch =
        (s.title || '').toLowerCase().includes(searchSchedule.toLowerCase()) ||
        (s.subjectName || '').toLowerCase().includes(searchSchedule.toLowerCase()) ||
        (s.roomName || '').toLowerCase().includes(searchSchedule.toLowerCase());

      return matchStatus && matchCat && matchSearch;
    });
  }, [schedules, statusFilter, categoryFilter, searchSchedule]);

  // Counts for summary pills
  const counts = useMemo(() => {
    const active = schedules.filter((s) => s.status === 'Sedang Berlangsung' || s.isManuallyActive).length;
    const scheduled = schedules.filter((s) => (s.status === 'Belum Dimulai' || !s.status) && !s.isManuallyActive).length;
    const inactive = schedules.filter((s) => (s.status === 'Selesai' || s.status === 'Terkunci') && !s.isManuallyActive).length;
    return { all: schedules.length, active, scheduled, inactive };
  }, [schedules]);

  // Open modal for new schedule
  const handleOpenCreateModal = () => {
    setEditingScheduleId(null);
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
      activationMode: 'scheduled',
      isManuallyActive: false,
      roomName: 'Ruang CBT Utama',
      sessionMode: 'non-session',
      sessions: [],
      devicePolicy: 'hybrid',
    });
    setIsScheduleModalOpen(true);
  };

  // Open modal for editing schedule
  const handleOpenEditModal = (sch: ExamSchedule) => {
    setEditingScheduleId(sch.id);
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
      activationMode: sch.activationMode || 'scheduled',
      isManuallyActive: Boolean(sch.isManuallyActive),
      roomName: sch.roomName || 'Ruang CBT Utama',
      sessionMode: sch.sessionMode || 'non-session',
      sessions: sch.sessions || [],
      devicePolicy: sch.devicePolicy || 'hybrid',
    });
    setIsScheduleModalOpen(true);
  };

  // 1-Click Instant On/Off Toggle Switch
  const handleToggleInstantActive = async (sch: ExamSchedule) => {
    const currentlyActive = sch.status === 'Sedang Berlangsung' || sch.isManuallyActive;
    const nextStatus = currentlyActive ? 'Belum Dimulai' : 'Sedang Berlangsung';
    const nextManualActive = !currentlyActive;

    const updated: ExamSchedule = {
      ...sch,
      status: nextStatus,
      isManuallyActive: nextManualActive,
      activationMode: nextManualActive ? 'manual' : sch.activationMode || 'scheduled',
    };

    await saveExamSchedule(updated);
    showToast(
      nextManualActive ? 'Ujian Diaktifkan!' : 'Ujian Dinonaktifkan',
      `${sch.title} sekarang berstatus: ${nextManualActive ? 'AKTIF (Siswa dapat mengerjakan)' : 'NONAKTIF / TERJADWAL'}`,
      nextManualActive ? 'success' : 'info'
    );
  };

  // 1-Click Toggle Token Required
  const handleToggleTokenRequired = async (sch: ExamSchedule) => {
    const updated: ExamSchedule = { ...sch, tokenRequired: !sch.tokenRequired };
    await saveExamSchedule(updated);
    showToast(
      'Validasi Token Diperbarui',
      `Sesi ${sch.title} sekarang: ${!sch.tokenRequired ? 'Wajib Token Pengawas' : 'Bebas Token'}`,
      'info'
    );
  };

  // Save schedule form handler
  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleForm.title || !scheduleForm.subjectName) {
      showToast('Form Belum Lengkap', 'Harap isi Nama Ujian dan Mata Pelajaran.', 'warning');
      return;
    }

    const newSchedule: ExamSchedule = {
      id: scheduleForm.id || `sch-${Date.now()}`,
      title: scheduleForm.title.trim(),
      subjectName: scheduleForm.subjectName.trim(),
      category: scheduleForm.category,
      targetClasses: scheduleForm.targetClasses.length > 0 ? scheduleForm.targetClasses : ['Semua Kelas'],
      date: scheduleForm.date,
      startTime: scheduleForm.startTime,
      endTime: scheduleForm.endTime,
      durationMinutes: Number(scheduleForm.durationMinutes) || 90,
      tokenRequired: scheduleForm.tokenRequired,
      activationMode: scheduleForm.activationMode,
      isManuallyActive: scheduleForm.activationMode === 'manual' ? scheduleForm.isManuallyActive : false,
      status: scheduleForm.isManuallyActive ? 'Sedang Berlangsung' : 'Belum Dimulai',
      roomName: scheduleForm.roomName || 'Ruang CBT Utama',
      sessionMode: scheduleForm.sessionMode,
      sessions: scheduleForm.sessionMode === 'multi-session' ? scheduleForm.sessions : undefined,
      devicePolicy: scheduleForm.devicePolicy,
    };

    await saveExamSchedule(newSchedule);
    setIsScheduleModalOpen(false);
    showToast('Jadwal Disimpan', `Pengaturan sesi ${newSchedule.title} berhasil diperbarui.`, 'success');
  };

  const handleClassToggle = (className: string) => {
    setScheduleForm((prev) => {
      const exists = prev.targetClasses.includes(className);
      const updated = exists
        ? prev.targetClasses.filter((c) => c !== className)
        : [...prev.targetClasses, className];
      return { ...prev, targetClasses: updated };
    });
  };

  return (
    <div className="space-y-6 pb-12 selection:bg-purple-600 selection:text-white">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[11px] font-black uppercase text-purple-800 tracking-wider block">
                Pelaksanaan CBT &bull; Manajemen Jadwal
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Pengaturan Jadwal &amp; Status Aktif Ujian
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-2xl mt-1">
            Fokus mengelola pelaksanaan, sakelar instan (Aktif/Nonaktif 1-klik), alokasi ruang lab, durasi tes, dan token pengawas tanpa keterikatan editor bank soal.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreateModal}
          className="px-5 py-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-600/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 shrink-0"
        >
          <div className="flex items-center justify-center">
            <Plus className="w-4 h-4" />
          </div>
          <span>Tambah Jadwal Ujian Baru</span>
        </button>
      </div>

      {/* Quick Status Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          {/* Status Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>Semua</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono">
                {counts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                statusFilter === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Sedang Aktif</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono">
                {counts.active}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('SCHEDULED')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                statusFilter === 'SCHEDULED'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Terjadwal</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono">
                {counts.scheduled}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter('INACTIVE')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                statusFilter === 'INACTIVE'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Nonaktif / Selesai</span>
              <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px] font-mono">
                {counts.inactive}
              </span>
            </button>
          </div>

          {/* Search Input & Category Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-xs cursor-pointer"
            >
              <option value="ALL">Semua Jenis ({schedules.length})</option>
              <option value="ASAJ">ASAJ (Asesmen Sumatif Akhir Jenjang - Khusus Kelas XII)</option>
                        <option value="ASAS">ASAS (Akhir Semester)</option>
              <option value="ASTS">ASTS (Tengah Semester)</option>
              <option value="Simulasi D'SMART Lampung">Simulasi D&apos;SMART Lampung</option>
              <option value="Simulasi CBT">Simulasi CBT</option>
              <option value="Seleksi OSN/Olimpiade">Seleksi OSN / Olimpiade</option>
              <option value="Remedial/Susulan">Remedial / Susulan</option>
            </select>

            <div className="relative w-full sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari judul mapel / ruang..."
                value={searchSchedule}
                onChange={(e) => setSearchSchedule(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Vertical Stacked List of Exam Schedules */}
      <div className="space-y-3.5">
        {filteredSchedules.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-2">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="font-bold text-slate-800 text-sm">Tidak Ada Jadwal Ujian yang Sesuai</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Tidak ditemukan jadwal ujian pada filter ini. Ubah kata kunci pencarian atau klik &quot;Tambah Jadwal Ujian Baru&quot;.
            </p>
          </div>
        ) : (
          filteredSchedules.map((sch) => {
            const isActive = sch.status === 'Sedang Berlangsung' || sch.isManuallyActive;
            const isScheduled = (sch.status === 'Belum Dimulai' || !sch.status) && !sch.isManuallyActive;
            const isFinished = (sch.status === 'Selesai' || sch.status === 'Terkunci') && !sch.isManuallyActive;

            return (
              <div
                key={sch.id}
                className={`p-5 sm:p-6 rounded-3xl border-2 transition-all duration-200 flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                  isActive
                    ? 'bg-emerald-50/60 border-emerald-500 shadow-md ring-2 ring-emerald-500/20'
                    : isScheduled
                    ? 'bg-white hover:bg-slate-50/80 border-slate-200 shadow-xs'
                    : 'bg-slate-50/90 border-slate-200 text-slate-500 opacity-80'
                }`}
              >
                {/* Left Block: Identity, Badges, Subject & Timing */}
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Status Badge */}
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-950 border border-emerald-400 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <span>Aktif / Berlangsung</span>
                      </span>
                    ) : isScheduled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-sky-100 text-sky-900 border border-sky-300">
                        <Clock className="w-3.5 h-3.5 text-sky-600" />
                        <span>Terjadwal</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-slate-200 text-slate-700 border border-slate-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Nonaktif / Selesai</span>
                      </span>
                    )}

                    {/* Category Badge */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black border ${
                      sch.category === 'ASAJ'
                        ? 'bg-amber-100 text-amber-950 border-amber-300'
                        : 'bg-purple-100 text-purple-900 border-purple-200'
                    }`}>
                      {sch.category === 'ASAJ' ? 'ASAJ (Kelas XII)' : sch.category}
                    </span>

                    {/* Sesi Mode Badge */}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${
                      sch.sessionMode === 'multi-session'
                        ? 'bg-purple-50 text-purple-800 border-purple-300'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      {sch.sessionMode === 'multi-session' ? `Multi-Sesi (${sch.sessions?.length || 3} Sesi)` : 'Serentak (Non-Sesi)'}
                    </span>

                    {/* Device Policy Badge */}
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                      sch.devicePolicy === 'android_only'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : sch.devicePolicy === 'lab_client_only'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {sch.devicePolicy === 'android_only' ? (
                        <>
                          <Smartphone className="w-3 h-3 text-emerald-600" />
                          <span>BYOD HP Android</span>
                        </>
                      ) : sch.devicePolicy === 'lab_client_only' ? (
                        <>
                          <Laptop className="w-3 h-3 text-blue-600" />
                          <span>Klien Lab Chromebook</span>
                        </>
                      ) : (
                        <span>Hibrida</span>
                      )}
                    </span>

                    {/* Room Badge */}
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {sch.roomName || 'CBT Lab Utama'}
                    </span>

                    {/* Mode Aktivasi Badge */}
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Mode: {sch.activationMode === 'manual' ? 'Manual Instan' : 'Otomatis Jadwal'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight leading-snug">
                      {sch.title}
                    </h3>
                    <p className="text-xs font-bold text-indigo-700 mt-0.5">
                      {sch.subjectName}
                    </p>
                  </div>

                  {/* Metadata Row: Date, Time & Classes */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 pt-0.5">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-purple-600" />
                      <span>{sch.date}</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5 text-purple-600" />
                      <strong className="text-slate-900 font-mono">
                        {sch.startTime} - {sch.endTime}
                      </strong>{' '}
                      <span>({sch.durationMinutes} Menit)</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>
                        Target: <strong className="text-slate-900 font-bold">{Array.isArray(sch.targetClasses) ? sch.targetClasses.join(', ') : sch.targetClasses}</strong>
                      </span>
                    </span>
                  </div>
                </div>

                {/* Right Block: Dual Control (Instant On/Off Toggle Switch + Atur Jadwal) */}
                <div className="flex flex-wrap items-center gap-3 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-200 justify-end">
                  {/* SAKELAR INSTAN ON/OFF TOGGLE SWITCH */}
                  <div className="flex flex-col items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleInstantActive(sch)}
                      className={`relative w-28 h-10 rounded-full transition-colors duration-300 p-1 flex items-center cursor-pointer shadow-inner ${
                        isActive
                          ? 'bg-emerald-600 justify-end'
                          : 'bg-slate-300 hover:bg-slate-400 justify-start'
                      }`}
                      title={isActive ? 'Klik untuk mematikan ujian secara instan' : 'Klik untuk menyalakan ujian secara instan'}
                    >
                      {/* Sliding Puck with Centered Icon */}
                      <motion.div
                        layout
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className={`w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-xs font-black ${
                          isActive ? 'text-emerald-700' : 'text-slate-600'
                        }`}
                      >
                        <Power className="w-4 h-4 stroke-[2.5]" />
                      </motion.div>
                      <span className={`absolute text-[10px] font-black uppercase tracking-wider px-2 pointer-events-none ${
                        isActive ? 'left-2 text-white' : 'right-2 text-slate-700'
                      }`}>
                        {isActive ? 'AKTIF' : 'OFF'}
                      </span>
                    </button>
                    <span className="text-[9.5px] font-bold text-slate-500 text-center">
                      {isActive ? 'Sedang Dibuka' : 'Dinonaktifkan'}
                    </span>
                  </div>

                  <div className="h-8 w-px bg-slate-200 hidden sm:block mx-1" />

                  {/* 1-Click Token Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleTokenRequired(sch)}
                    className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                      sch.tokenRequired
                        ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
                    }`}
                    title="1-Klik toggle validasi token proktor"
                  >
                    <div className="flex items-center justify-center">
                      {sch.tokenRequired ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <Unlock className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                    <span>{sch.tokenRequired ? 'Wajib Token' : 'Bebas Token'}</span>
                  </button>

                  {/* Tombol Atur Jadwal (Modal & Settings) */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(sch)}
                    className="px-3.5 py-2 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shadow-2xs"
                    title="Atur parameter jadwal, durasi, dan ruang CBT"
                  >
                    <div className="flex items-center justify-center">
                      <Settings2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <span>Atur Jadwal</span>
                  </button>

                  {/* Tombol Hapus */}
                  <button
                    type="button"
                    onClick={() => deleteExamSchedule(sch.id)}
                    className="p-2.5 rounded-2xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-all cursor-pointer flex items-center justify-center active:scale-95"
                    title="Hapus Sesi Jadwal"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Atur Jadwal Sesi CBT (Clean & Focused) */}
      <AnimatePresence>
        {isScheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden"
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {editingScheduleId ? 'Atur Parameter Jadwal CBT' : 'Tambah Jadwal Sesi Ujian Baru'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      Atur waktu mulai, selesai, durasi, dan sakelar aktivasi
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveSchedule} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0 overscroll-contain">
                  {/* Mode Aktivasi Ujian */}
                  <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-2">
                    <label className="block font-black text-purple-950 text-xs">
                      Mode Aktivasi Pelaksanaan Ujian:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setScheduleForm({ ...scheduleForm, activationMode: 'scheduled' })}
                        className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                          scheduleForm.activationMode === 'scheduled'
                            ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Clock className="w-4 h-4 shrink-0" />
                        <div>
                          <span className="block leading-tight">Otomatis Sesuai Jadwal</span>
                          <span className="text-[10px] font-normal opacity-90">Buka jam mulai s/d selesai</span>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setScheduleForm({ ...scheduleForm, activationMode: 'manual', isManuallyActive: true })}
                        className={`p-2.5 rounded-xl border text-left font-bold text-xs transition-all cursor-pointer flex items-center gap-2 ${
                          scheduleForm.activationMode === 'manual'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <Power className="w-4 h-4 shrink-0" />
                        <div>
                          <span className="block leading-tight">Manual (Kapan Saja)</span>
                          <span className="text-[10px] font-normal opacity-90">Buka/tutup via sakelar 1-klik</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nama Sesi / Judul Ujian:</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: ASAS Ganjil Matematika Fase F Sesi 1..."
                      value={scheduleForm.title}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran:</label>
                      <select
                        required
                        value={scheduleForm.subjectName}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, subjectName: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Pilih Mata Pelajaran...</option>
                        {subjects.map((sbj) => (
                          <option key={sbj.id} value={sbj.nama}>
                            {sbj.nama}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Kategori Ujian:</label>
                      <select
                        value={scheduleForm.category}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, category: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="ASAS">ASAS (Akhir Semester)</option>
                        <option value="ASTS">ASTS (Tengah Semester)</option>
                        <option value="Simulasi D'SMART Lampung">Simulasi D&apos;SMART Lampung (50 Soal HOTS)</option>
                        <option value="Simulasi CBT">Simulasi CBT</option>
                        <option value="Seleksi OSN/Olimpiade">Seleksi OSN / Olimpiade</option>
                        <option value="Remedial/Susulan">Remedial / Susulan</option>
                      </select>
                    </div>
                  </div>

                  {/* Tanggal, Waktu Mulai & Waktu Selesai */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Tanggal Ujian:</label>
                      <input
                        type="date"
                        required
                        value={scheduleForm.date}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      >
                      </input>
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Jam Mulai (WIB):</label>
                      <input
                        type="time"
                        required
                        value={scheduleForm.startTime}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Jam Selesai (WIB):</label>
                      <input
                        type="time"
                        required
                        value={scheduleForm.endTime}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Durasi Pengerjaan (Menit):</label>
                      <input
                        type="number"
                        min={10}
                        max={300}
                        required
                        value={scheduleForm.durationMinutes}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: Number(e.target.value) })}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Alokasi Ruang Lab CBT:</label>
                      <input
                        type="text"
                        value={scheduleForm.roomName}
                        onChange={(e) => setScheduleForm({ ...scheduleForm, roomName: e.target.value })}
                        placeholder="Contoh: Lab Komputer 1, Ruang 03..."
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  {/* Target Kelas Selection */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Pilih Target Rombongan Belajar (Kelas):
                    </label>
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {scheduleForm.category === 'ASAJ' && (
                          <button
                            type="button"
                            onClick={() => {
                              const grade12 = classes.filter((c) => /XII|12/i.test(c.nama)).map((c) => c.nama);
                              setScheduleForm({ ...scheduleForm, targetClasses: grade12 });
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[11px] transition-colors shadow-2xs flex items-center gap-1"
                          >
                            <GraduationCap className="w-3.5 h-3.5" />
                            <span>Kunci Khusus Kelas XII ({classes.filter((c) => /XII|12/i.test(c.nama)).length} Rombel)</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, targetClasses: classes.map((c) => c.nama) })}
                          className="px-2.5 py-1 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-900 font-extrabold text-[11px] transition-colors"
                        >
                          Pilih Semua Kelas
                        </button>
                        <button
                          type="button"
                          onClick={() => setScheduleForm({ ...scheduleForm, targetClasses: [] })}
                          className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-[11px] transition-colors"
                        >
                          Bersihkan Pilihan
                        </button>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 max-h-36 overflow-y-auto">
                        {classes.map((cls) => {
                          const isChecked = scheduleForm.targetClasses.includes(cls.nama);
                          return (
                            <label
                              key={cls.id}
                              className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                                isChecked
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleClassToggle(cls.nama)}
                                className="hidden"
                              />
                              <div className={`w-4 h-4 rounded-md flex items-center justify-center border ${
                                isChecked ? 'bg-white text-purple-700 border-white' : 'border-slate-300'
                              }`}>
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <span className="truncate">{cls.nama}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Token Required Toggle */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-amber-950 block">Wajib Masukkan Token Ujian</span>
                      <span className="text-[11px] text-amber-800">Siswa wajib meminta token harian dari pengawas ruang untuk mulai tes.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={scheduleForm.tokenRequired}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, tokenRequired: e.target.checked })}
                      className="w-5 h-5 text-purple-600 focus:ring-purple-500 rounded-md cursor-pointer"
                    />
                  </div>
                </div>

                {/* Footer Modal Actions */}
                <div className="p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsScheduleModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs shadow-md shadow-purple-600/20 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Simpan Pengaturan Jadwal</span>
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
