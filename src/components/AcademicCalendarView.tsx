import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarEvent } from '../types';
import { formatIndonesianDate } from '../utils/dateUtils';
import {
  DEFAULT_CALENDAR_EVENTS,
  buildAcademicYearCalendar,
  MONTH_NAMES_ID,
  DAY_NAMES_SHORT,
  isDateInRange,
} from '../data/defaultCalendarEvents';
import { exportAcademicCalendarPDF } from '../utils/pdfExport';
import {
  CalendarDays,
  FileDown,
  Printer,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Edit2,
  Trash2,
  X,
  FileText,
  Calendar as CalendarIcon,
  BookOpen,
  GraduationCap,
  Bell,
  Check,
  Star,
  ChevronLeft,
  ChevronRight,
  Settings,
  Copy,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Save,
  Calculator,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DEFAULT_LITNUM_SCHEDULE_CONFIG,
  evaluateLitNumSchedule,
} from '../utils/litnumScheduleHelper';

export const AcademicCalendarView: React.FC = () => {
  const {
    state,
    currentUser,
    saveCalendarEvent,
    deleteCalendarEvent,
    toggleCalendarEventComplete,
    saveCalendarEventsBatch,
    updateSchoolInfo,
    showToast,
    setSelectedModule,
    setCurrentView,
  } = useApp();

  // Active School Info
  const school = state.schoolInfo;
  const activeYear = school?.tahunAjaranAktif || '2026/2027';
  const isAdminOrOperator = currentUser?.role === 'admin' || currentUser?.role === 'operator';

  // LitNum Schedule Config Integration
  const litnumConfig = useMemo(() => {
    return {
      ...DEFAULT_LITNUM_SCHEDULE_CONFIG,
      ...(state?.litnumScheduleConfig || {}),
    };
  }, [state?.litnumScheduleConfig]);

  // Events list: fallback to default if empty
  const allEvents: CalendarEvent[] = useMemo(() => {
    if (state.calendarEvents && state.calendarEvents.length > 0) {
      return state.calendarEvents;
    }
    return DEFAULT_CALENDAR_EVENTS;
  }, [state.calendarEvents]);

  // View & Filter States
  const [activeTab, setActiveTab] = useState<'matrix' | 'agenda' | 'preview'>('matrix');
  const [semesterFilter, setSemesterFilter] = useState<'Semua' | 'Ganjil' | 'Genap'>('Semua');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Modal State for Events
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState('');
  const [formCategory, setFormCategory] = useState<CalendarEvent['category']>('pribadi_guru');
  const [formLevel, setFormLevel] = useState<'sekolah' | 'guru'>('guru');
  const [formSemester, setFormSemester] = useState<'Ganjil' | 'Genap' | 'Semua'>('Ganjil');
  const [formTahunAjaran, setFormTahunAjaran] = useState(activeYear);
  const [formIsImportant, setFormIsImportant] = useState(false);
  const [formTargetClass, setFormTargetClass] = useState('');
  const [formTargetSubject, setFormTargetSubject] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Admin & Operator Calendar Management Modal
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageTab, setManageTab] = useState<'settings' | 'official_events'>('settings');
  const [manageYearInput, setManageYearInput] = useState(activeYear);
  const [manageSemesterInput, setManageSemesterInput] = useState(school?.semesterAktif || 'Ganjil');
  const [manageNotification, setManageNotification] = useState<string | null>(null);

  // Mode Edit Agenda Sekaligus (Batch Inline Edit)
  const [isBatchEditEvents, setIsBatchEditEvents] = useState(false);
  const [batchEventsMap, setBatchEventsMap] = useState<Record<string, CalendarEvent>>({});

  const handleToggleBatchEditEvents = () => {
    if (!isBatchEditEvents) {
      const map: Record<string, CalendarEvent> = {};
      filteredEvents.forEach((ev) => {
        map[ev.id] = { ...ev };
      });
      setBatchEventsMap(map);
      setIsBatchEditEvents(true);
    } else {
      setIsBatchEditEvents(false);
      setBatchEventsMap({});
    }
  };

  const handleUpdateBatchEventField = (id: string, field: keyof CalendarEvent, value: any) => {
    setBatchEventsMap((prev) => {
      const existing = prev[id] || allEvents.find((e) => e.id === id);
      if (!existing) return prev;
      return {
        ...prev,
        [id]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleSaveAllBatchEvents = async () => {
    const listToSaveMap = { ...batchEventsMap };
    if (Object.keys(listToSaveMap).length === 0) return;

    const updatedAllEvents = allEvents.map((ev) => listToSaveMap[ev.id] || ev);
    await saveCalendarEventsBatch(updatedAllEvents);
    setIsBatchEditEvents(false);
    setBatchEventsMap({});
    showToast('Simpan Sekaligus Berhasil', `Berhasil memperbarui dan menyimpan ${Object.keys(listToSaveMap).length} agenda kalender pendidikan sekaligus.`, 'success');
  };

  // Check if current user has edit permission for a given event
  const canEditEvent = (ev: CalendarEvent): boolean => {
    if (isAdminOrOperator) return true;
    return ev.level === 'guru' && ev.createdBy === currentUser?.id;
  };

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return allEvents.filter((ev) => {
      // Semester filter
      if (semesterFilter !== 'Semua' && ev.semester && ev.semester !== 'Semua' && ev.semester !== semesterFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter === 'mine') {
        if (ev.level !== 'guru' || ev.createdBy !== currentUser?.id) return false;
      } else if (categoryFilter === 'sekolah') {
        if (ev.level !== 'sekolah') return false;
      } else if (categoryFilter !== 'all' && ev.category !== categoryFilter) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchDesc = (ev.description || '').toLowerCase().includes(q);
        const matchSubject = (ev.targetSubject || '').toLowerCase().includes(q);
        const matchClass = (ev.targetClass || '').toLowerCase().includes(q);
        if (!matchTitle && !matchDesc && !matchSubject && !matchClass) return false;
      }

      return true;
    });
  }, [allEvents, semesterFilter, categoryFilter, searchQuery, currentUser]);

  // Calendar Matrix Months
  const calendarMonths = useMemo(() => {
    const startYear = parseInt(activeYear.split('/')[0]) || 2026;
    const months = buildAcademicYearCalendar(startYear, allEvents);
    if (semesterFilter === 'Ganjil') {
      return months.filter((m) => m.semester === 'Ganjil');
    }
    if (semesterFilter === 'Genap') {
      return months.filter((m) => m.semester === 'Genap');
    }
    return months;
  }, [activeYear, allEvents, semesterFilter]);

  // Statistics
  const stats = useMemo(() => {
    const hbeTotal = calendarMonths.reduce((acc, m) => acc + m.hbeCount, 0);
    const examEventsCount = allEvents.filter((e) => e.category === 'asesmen_ujian').length;
    const deadlineEventsCount = allEvents.filter((e) => e.category === 'deadline').length;
    const myEventsCount = allEvents.filter((e) => e.level === 'guru' && e.createdBy === currentUser?.id).length;
    const schoolEventsCount = allEvents.filter((e) => e.level === 'sekolah').length;
    return { hbeTotal, examEventsCount, deadlineEventsCount, myEventsCount, schoolEventsCount };
  }, [calendarMonths, allEvents, currentUser]);

  // Open Create Modal
  const handleOpenCreateModal = (defaultDate?: string, defaultLevel?: 'sekolah' | 'guru') => {
    setEditingEvent(null);
    setFormTitle('');
    setFormDescription('');
    setFormStartDate(defaultDate || new Date().toISOString().split('T')[0]);
    setFormEndDate('');
    const targetLevel = defaultLevel || (isAdminOrOperator ? 'sekolah' : 'guru');
    setFormLevel(targetLevel);
    setFormCategory(targetLevel === 'sekolah' ? 'kegiatan_sekolah' : 'pribadi_guru');
    setFormSemester('Ganjil');
    setFormTahunAjaran(activeYear);
    setFormIsImportant(false);
    setFormTargetClass('');
    setFormTargetSubject(currentUser?.mataPelajaran?.[0] || '');
    setIsEventModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (ev: CalendarEvent) => {
    setEditingEvent(ev);
    setFormTitle(ev.title);
    setFormDescription(ev.description || '');
    setFormStartDate(ev.startDate);
    setFormEndDate(ev.endDate || '');
    setFormCategory(ev.category);
    setFormLevel(ev.level || 'guru');
    setFormSemester(ev.semester || 'Ganjil');
    setFormTahunAjaran(ev.tahunAjaran || activeYear);
    setFormIsImportant(!!ev.isImportant);
    setFormTargetClass(ev.targetClass || '');
    setFormTargetSubject(ev.targetSubject || '');
    setIsEventModalOpen(true);
  };

  // Handle Save Event (both teacher & school level)
  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formStartDate) return;

    let autoColor = '#6366f1';
    if (formCategory === 'libur_nasional') autoColor = '#ef4444';
    else if (formCategory === 'asesmen_ujian') autoColor = '#2563eb';
    else if (formCategory === 'deadline') autoColor = '#f59e0b';
    else if (formCategory === 'kegiatan_sekolah') autoColor = '#10b981';
    else if (formCategory === 'pribadi_guru') autoColor = '#8b5cf6';

    const eventPayload: CalendarEvent = {
      id: editingEvent ? editingEvent.id : `kaldik-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: formTitle.trim(),
      description: formDescription.trim(),
      startDate: formStartDate,
      endDate: formEndDate ? formEndDate : formStartDate,
      category: formCategory,
      level: isAdminOrOperator ? formLevel : 'guru',
      createdBy: editingEvent?.createdBy || currentUser?.id || 'admin',
      createdByName: editingEvent?.createdByName || currentUser?.nama || (isAdminOrOperator ? 'Kurikulum/Sekolah' : 'Guru'),
      semester: formSemester,
      tahunAjaran: formTahunAjaran || activeYear,
      isImportant: formIsImportant,
      isCompleted: editingEvent ? editingEvent.isCompleted : false,
      targetClass: formTargetClass.trim() || undefined,
      targetSubject: formTargetSubject.trim() || undefined,
      color: autoColor,
      updatedAt: new Date().toISOString(),
    };

    await saveCalendarEvent(eventPayload);
    setIsEventModalOpen(false);
  };

  // Handle Admin Year & Semester Configuration
  const handleSaveYearSemesterConfig = async () => {
    if (!manageYearInput.trim()) return;
    await updateSchoolInfo({
      tahunAjaranAktif: manageYearInput.trim(),
      semesterAktif: manageSemesterInput as any,
    });
    setManageNotification('Tahun Pelajaran dan Semester aktif kalender berhasil diperbarui!');
    setTimeout(() => setManageNotification(null), 4000);
  };

  // Duplicate events to next academic year
  const handleDuplicateForNextYear = async () => {
    const parts = activeYear.split('/');
    const startY = parseInt(parts[0]) || 2026;
    const nextAcademicYear = `${startY + 1}/${startY + 2}`;

    if (!window.confirm(`Salin seluruh agenda resmi sekolah dari TP ${activeYear} ke TP baru ${nextAcademicYear}? Tanggal akan otomatis dimajukan 1 tahun.`)) {
      return;
    }

    const schoolEvents = allEvents.filter((e) => e.level === 'sekolah');
    const newEvents: CalendarEvent[] = schoolEvents.map((e) => {
      // Shift dates by 1 year
      const shiftYear = (dateStr?: string) => {
        if (!dateStr) return dateStr;
        const [y, m, d] = dateStr.split('-');
        const nextY = parseInt(y) + 1;
        return `${nextY}-${m}-${d}`;
      };

      return {
        ...e,
        id: `kaldik-${nextAcademicYear.replace('/', '_')}-${Math.random().toString(36).substring(2, 7)}`,
        startDate: shiftYear(e.startDate) || e.startDate,
        endDate: shiftYear(e.endDate) || e.endDate,
        tahunAjaran: nextAcademicYear,
        updatedAt: new Date().toISOString(),
      };
    });

    // Merge existing non-overlapping events with new events
    const updatedBatch = [...allEvents, ...newEvents];
    await saveCalendarEventsBatch(updatedBatch);
    await updateSchoolInfo({
      tahunAjaranAktif: nextAcademicYear,
    });
    setManageYearInput(nextAcademicYear);
    setManageNotification(`Sukses! Agenda sekolah telah digandakan untuk TP ${nextAcademicYear} dan tahun ajaran aktif telah disinkronkan.`);
    setTimeout(() => setManageNotification(null), 5000);
  };

  // Reset to default calendar
  const handleResetDefaultCalendar = async () => {
    if (!window.confirm('PERINGATAN: Apakah Anda yakin ingin mereset seluruh agenda kalender ke template standar resmi SMAN 3 Tumijajar? Tindakan ini akan mengembalikan data default.')) {
      return;
    }
    await saveCalendarEventsBatch(DEFAULT_CALENDAR_EVENTS);
    setManageNotification('Kalender pendidikan berhasil direset ke standar resmi SMAN 3 Tumijajar.');
    setTimeout(() => setManageNotification(null), 4000);
  };

  // Handle Export PDF (A4 Landscape, Times New Roman)
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await exportAcademicCalendarPDF(school, allEvents, {
        semester: semesterFilter,
        teacherName: currentUser?.nama,
        teacherNip: currentUser?.nip,
        includeTeacherEvents: true,
        activeYear,
      });
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Print Document
  const handlePrint = () => {
    window.print();
  };

  // Events on selected date
  const eventsOnSelectedDate = useMemo(() => {
    if (!selectedDateStr) return [];
    return allEvents.filter((ev) => isDateInRange(selectedDateStr, ev.startDate, ev.endDate));
  }, [allEvents, selectedDateStr]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-500/20 text-indigo-300 text-xs font-semibold tracking-wide border border-indigo-400/30">
                <CalendarDays className="w-3.5 h-3.5" />
                Kalender Pendidikan Resmi SMAN 3 Tumijajar
              </span>
              <span className="text-xs text-slate-300 font-bold bg-slate-800/80 px-2.5 py-0.5 rounded-md border border-slate-700">
                T.P. {activeYear} • Semester {school?.semesterAktif || 'Ganjil'}
              </span>
              {isAdminOrOperator && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-400/30">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  Mode Kelola &amp; Edit Aktif
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Kalender Pendidikan &amp; Agenda Akademik
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Jadwal resmi pembelajaran, masa orientasi siswa, periode asesmen (ASTS, ASAS, ASAJ), serta tenggat waktu administrasi akademik bagi pendidik dan tenaga kependidikan.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 shrink-0 lg:items-end">
            {/* Baris Utama - Aksi Pengelolaan Agenda */}
            <div className="flex flex-wrap items-center gap-2">
              {isAdminOrOperator && (
                <button
                  onClick={() => setIsManageModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
                  title="Edit Tahun Ajaran, Semester, dan Kalender Sekolah"
                >
                  <Settings className="w-4 h-4 text-slate-950" />
                  <span>Kelola &amp; Edit Kalender</span>
                </button>
              )}

              <button
                onClick={() => handleOpenCreateModal()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>{isAdminOrOperator ? 'Tambah Agenda Baru' : 'Tambah Agenda Guru'}</span>
              </button>
            </div>

            {/* Baris Sekunder (Diletakkan di Bawahnya) - Ekspor & Cetak */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80 w-full lg:w-auto lg:justify-end">
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                title="Unduh Kalender Format Standar Kertas A4 Landscape Times New Roman"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>{isExporting ? 'Memproses PDF...' : 'Ekspor PDF Landscape A4'}</span>
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                title="Cetak Kalender Langsung"
              >
                <Printer className="w-3.5 h-3.5 text-slate-300" />
                <span>Cetak Kalender</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick KPI Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
              <span>Hari Belajar (HBE)</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {stats.hbeTotal} <span className="text-xs font-normal text-slate-400">Hari</span>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <GraduationCap className="w-3.5 h-3.5 text-blue-400" />
              <span>Periode Asesmen</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {stats.examEventsCount} <span className="text-xs font-normal text-slate-400">Agenda</span>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Tenggat Waktu</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {stats.deadlineEventsCount} <span className="text-xs font-normal text-slate-400">Batas Nilai</span>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
              <span>Agenda Sekolah</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {stats.schoolEventsCount} <span className="text-xs font-normal text-slate-400">Kegiatan</span>
            </div>
          </div>

          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/50">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
              <Star className="w-3.5 h-3.5 text-purple-400" />
              <span>Agenda Saya</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">
              {stats.myEventsCount} <span className="text-xs font-normal text-slate-400">Catatan</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Controls & Filters Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/80 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* View Tab Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('matrix')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'matrix'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Matriks Bulanan (12 Bulan)
            </button>
            <button
              onClick={() => setActiveTab('agenda')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'agenda'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Linimasa Agenda ({filteredEvents.length})
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pratinjau Cetak A4 Landscape (Times New Roman)
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari agenda, ujian, deadline..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filter Row: Semester & Categories */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
          {/* Semester Selector */}
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-semibold">Semester:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg">
              {(['Semua', 'Ganjil', 'Genap'] as const).map((sem) => (
                <button
                  key={sem}
                  onClick={() => setSemesterFilter(sem)}
                  className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    semesterFilter === sem
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {sem === 'Semua' ? '1 Tahun Penuh' : `Semester ${sem}`}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'all', label: 'Semua Agenda' },
              { id: 'litnum', label: 'Jadwal LitNum (Selasa & Rabu)' },
              { id: 'sekolah', label: 'Kegiatan Resmi Sekolah' },
              { id: 'asesmen_ujian', label: 'Asesmen & Ujian' },
              { id: 'deadline', label: 'Tenggat Waktu' },
              { id: 'libur_nasional', label: 'Hari Libur' },
              { id: 'mine', label: 'Agenda Saya' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-3 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Color Legend Bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
          <span className="font-bold text-slate-700">Kode Warna:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200"></span>
            <span className="font-bold text-amber-900">Jadwal LitNum (Selasa-Lit &amp; Rabu-Num)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-red-200"></span>
            <span>Libur Resmi / Nasional</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200"></span>
            <span>Asesmen (ASTS / ASAS / ASAJ)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200"></span>
            <span>Tenggat Waktu / Batas Nilai</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200"></span>
            <span>Kegiatan Sekolah / MPLS / Rapor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-200"></span>
            <span>Agenda Mandiri Guru</span>
          </div>
        </div>
      </div>

      {/* VIEW TAB 1: Matriks Kalender Bulanan (12 Bulan / Per Semester) */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          {/* Banner Integrasi Penjadwalan LitNum */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border-2 border-amber-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950 shadow-2xs">
                  TERINTEGRASI SISTEM LITNUM
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-700 border border-slate-200">
                  SMAN 3 Tumijajar
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  litnumConfig.isEnabled ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}>
                  Sakelar: {litnumConfig.isEnabled ? 'AKTIF' : 'TERKUNCI'}
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-600" />
                <span>Jadwal Resmi Asesmen Literasi &amp; Numerasi Terpenuhi di Kalender</span>
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Siswa mengerjakan otomatis setiap <strong>Selasa (Literasi Membaca)</strong> &amp; <strong>Rabu (Numerasi Matematika/Sains)</strong> pukul <strong>{litnumConfig.jamMulai} - {litnumConfig.jamSelesai} WIB</strong>. Tanggal-tanggal LitNum disorot otomatis dengan warna khusus di matriks bulanan di bawah.
              </p>
            </div>

            <div className="px-4 py-2.5 rounded-xl bg-amber-500/20 text-amber-900 border border-amber-500/30 font-extrabold text-xs flex items-center justify-center gap-1.5 shrink-0">
              <Sparkles className="w-4 h-4 text-amber-700" />
              <span>Sinkronisasi LitNum Otomatis</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {calendarMonths.map((month) => (
              <div
                key={`${month.year}-${month.monthIndex}`}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col hover:border-indigo-300 transition-all hover:shadow-md"
              >
                {/* Month Card Header */}
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200/80 flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                      {month.monthName} {month.year}
                    </h3>
                    <p className="text-[10.5px] text-slate-500 font-medium">
                      Semester {month.semester}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
                    {month.hbeCount} HBE
                  </span>
                </div>

                {/* Day Headers */}
                <div className="grid grid-cols-7 text-center py-2 bg-slate-50/50 border-b border-slate-100 text-[10.5px] font-bold">
                  {DAY_NAMES_SHORT.map((dName, idx) => (
                    <div
                      key={dName}
                      className={idx === 0 ? 'text-red-500' : idx === 5 ? 'text-emerald-600' : 'text-slate-600'}
                    >
                      {dName}
                    </div>
                  ))}
                </div>

                {/* Date Grid Cells */}
                <div className="p-2 space-y-1 flex-1">
                  {month.weeks.map((week, wIdx) => (
                    <div key={wIdx} className="grid grid-cols-7 gap-1">
                      {week.map((dayCell, dIdx) => {
                        if (!dayCell.dayNumber || !dayCell.dateString) {
                          return <div key={dIdx} className="h-8 rounded-lg"></div>;
                        }

                        const dStr = dayCell.dateString;
                        const dayEvs = dayCell.events;
                        const isSelected = selectedDateStr === dStr;

                        const cellDate = new Date(`${dStr}T00:00:00`);
                        const dayOfWeek = cellDate.getDay();
                        const isLitNumTue = dayOfWeek === 2 && (litnumConfig.scheduleMode === 'otomatis_resmi' || (litnumConfig.activeDaysLiterasi || [2]).includes(2));
                        const isLitNumWed = dayOfWeek === 3 && (litnumConfig.scheduleMode === 'otomatis_resmi' || (litnumConfig.activeDaysNumerasi || [3]).includes(3));

                        const hasHoliday = dayCell.isSunday || dayEvs.some((e) => e.category === 'libur_nasional');
                        const hasExam = dayEvs.some((e) => e.category === 'asesmen_ujian');
                        const hasDeadline = dayEvs.some((e) => e.category === 'deadline');
                        const hasSchool = dayEvs.some((e) => e.category === 'kegiatan_sekolah');
                        const hasTeacher = dayEvs.some((e) => e.category === 'pribadi_guru');

                        // Background priority styling
                        let cellBg = 'hover:bg-slate-100 text-slate-700';
                        let badgeColor = '';
                        let litNumPill = null;

                        if (hasHoliday && !dayCell.isSunday) {
                          cellBg = 'bg-red-50 hover:bg-red-100 text-red-700 font-bold border border-red-200';
                          badgeColor = 'bg-red-500';
                        } else if (hasExam) {
                          cellBg = 'bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200';
                          badgeColor = 'bg-blue-600';
                        } else if (hasDeadline) {
                          cellBg = 'bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200';
                          badgeColor = 'bg-amber-500';
                        } else if (isLitNumTue) {
                          cellBg = 'bg-amber-100/70 hover:bg-amber-100 text-amber-950 font-bold border-2 border-amber-300';
                          badgeColor = 'bg-amber-500';
                          litNumPill = 'Lit';
                        } else if (isLitNumWed) {
                          cellBg = 'bg-orange-100/70 hover:bg-orange-100 text-orange-950 font-bold border-2 border-orange-300';
                          badgeColor = 'bg-orange-500';
                          litNumPill = 'Num';
                        } else if (hasSchool) {
                          cellBg = 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold border border-emerald-200';
                          badgeColor = 'bg-emerald-600';
                        } else if (hasTeacher) {
                          cellBg = 'bg-purple-50 hover:bg-purple-100 text-purple-800 font-bold border border-purple-200';
                          badgeColor = 'bg-purple-500';
                        } else if (dayCell.isSunday) {
                          cellBg = 'text-red-500 hover:bg-red-50/50';
                        }

                        return (
                          <button
                            key={dIdx}
                            onClick={() => {
                              setSelectedDateStr(isSelected ? null : dStr);
                            }}
                            className={`h-8 rounded-lg text-xs flex flex-col items-center justify-center transition-all cursor-pointer relative ${cellBg} ${
                              isSelected ? 'ring-2 ring-indigo-600 shadow-md font-extrabold z-10' : ''
                            }`}
                            title={`${dStr}: ${isLitNumTue ? 'Jadwal LitNum Literasi' : isLitNumWed ? 'Jadwal LitNum Numerasi' : ''} ${dayEvs.map((e) => e.title).join(', ') || (dayCell.isSunday ? 'Hari Minggu' : 'Hari Belajar Efektif')}`}
                          >
                            <span>{dayCell.dayNumber}</span>
                            {litNumPill ? (
                              <span className="text-[8.5px] font-black leading-none px-1 rounded bg-amber-500 text-slate-950 -mt-0.5 shadow-2xs">
                                {litNumPill}
                              </span>
                            ) : dayEvs.length > 0 ? (
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${badgeColor || 'bg-indigo-600'} -mt-0.5`}
                              ></span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Card Footer: Active Month Agendas summary */}
                <div className="px-3 py-2 bg-slate-50/80 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>
                    {allEvents.filter((e) => {
                      const mIdx = new Date(e.startDate).getMonth();
                      const yr = new Date(e.startDate).getFullYear();
                      return mIdx === month.monthIndex && yr === month.year;
                    }).length}{' '}
                    agenda bulan ini
                  </span>
                  <button
                    onClick={() => {
                      const padM = String(month.monthIndex + 1).padStart(2, '0');
                      handleOpenCreateModal(`${month.year}-${padM}-01`);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Catat</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Drawer / Pop-up for Selected Date Events */}
          <AnimatePresence>
            {selectedDateStr && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="bg-white rounded-2xl border-2 border-indigo-200 shadow-xl p-5"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-extrabold text-base text-slate-900">
                      Agenda Tanggal {selectedDateStr}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenCreateModal(selectedDateStr)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      + Tambah Agenda Tanggal Ini
                    </button>
                    <button
                      onClick={() => setSelectedDateStr(null)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {/* Check if Selected Date is Tuesday or Wednesday LitNum Session */}
                  {(() => {
                    if (!selectedDateStr) return null;
                    const selDate = new Date(`${selectedDateStr}T00:00:00`);
                    const selDayOfWeek = selDate.getDay();
                    const isTue = selDayOfWeek === 2;
                    const isWed = selDayOfWeek === 3;

                    if (!isTue && !isWed) return null;

                    return (
                      <div className="mb-3 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-indigo-500/10 border-2 border-amber-300 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black text-[10px] uppercase shadow-2xs">
                              {isTue ? 'SESI LITERASI TERJADWAL' : 'SESI NUMERASI TERJADWAL'}
                            </span>
                            <span className="text-xs font-bold text-amber-900">
                              {isTue ? 'Selasa (Literasi Membaca)' : 'Rabu (Numerasi Matematika/Sains)'}
                            </span>
                          </div>
                          <h4 className="font-extrabold text-sm text-slate-900">
                            Asesmen {isTue ? 'Literasi Membaca' : 'Numerasi Matematika'} SMAN 3 Tumijajar
                          </h4>
                          <p className="text-xs text-slate-600 font-medium">
                            Jam Operasional Siswa: <strong>{litnumConfig.jamMulai} - {litnumConfig.jamSelesai} WIB</strong>.
                          </p>
                        </div>

                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 text-amber-950 font-bold text-xs shrink-0">
                          Jadwal LitNum Aktif
                        </span>
                      </div>
                    );
                  })()}

                  {eventsOnSelectedDate.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-xs">
                      Tidak ada agenda khusus pada tanggal ini (Hari Belajar Mengajar Efektif).
                    </div>
                  ) : (
                    eventsOnSelectedDate.map((ev) => (
                      <div
                        key={ev.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-slate-900">{ev.title}</h4>
                            {ev.level === 'sekolah' ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                Agenda Sekolah
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                Agenda Guru
                              </span>
                            )}
                            {ev.isImportant && (
                              <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[10px] font-bold">
                                Penting
                              </span>
                            )}
                            <span className="text-xs text-slate-500 font-medium">
                              (
                              {ev.category === 'asesmen_ujian'
                                ? 'Ujian / Asesmen'
                                : ev.category === 'deadline'
                                ? 'Tenggat Waktu'
                                : ev.category === 'libur_nasional'
                                ? 'Hari Libur'
                                : ev.category === 'pribadi_guru'
                                ? `Catatan ${ev.createdByName || 'Guru'}`
                                : 'Kegiatan Sekolah'}
                              )
                            </span>
                          </div>
                          {ev.description && (
                            <p className="text-xs text-slate-600">{ev.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                            <span>
                              Mulai: {ev.startDate}
                              {ev.endDate && ev.endDate !== ev.startDate && ` s.d. ${ev.endDate}`}
                            </span>
                            {ev.targetSubject && <span>• Mapel: {ev.targetSubject}</span>}
                            {ev.targetClass && <span>• Kelas: {ev.targetClass}</span>}
                          </div>
                        </div>

                        {canEditEvent(ev) && (
                          <div className="flex items-center gap-1.5 shrink-0">
                            {ev.level === 'guru' && (
                              <button
                                onClick={() => toggleCalendarEventComplete(ev.id)}
                                className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                                  ev.isCompleted
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                                title={ev.isCompleted ? 'Tandai Belum Selesai' : 'Tandai Selesai'}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditModal(ev)}
                              className="p-1.5 rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                              title="Edit Agenda Kalender"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Hapus agenda "${ev.title}"?`)) {
                                  deleteCalendarEvent(ev.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer"
                              title="Hapus Agenda"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* VIEW TAB 2: Daftar Linimasa Agenda & Tenggat Waktu (Timeline / Table) */}
      {activeTab === 'agenda' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden space-y-4">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">
                Linimasa Agenda Akademik &amp; Kalender Sekolah
              </h3>
              <p className="text-xs text-slate-500">
                Menampilkan {filteredEvents.length} agenda tersinkronisasi untuk Tahun Pelajaran {activeYear}.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isAdminOrOperator && (
                <button
                  type="button"
                  onClick={handleToggleBatchEditEvents}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all ${
                    isBatchEditEvents
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold ring-2 ring-amber-400'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                  title="Edit seluruh agenda kalender sekaligus"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isBatchEditEvents ? 'Matikan Mode Edit Massal' : 'Edit Agenda Sekaligus'}</span>
                </button>
              )}
              <button
                onClick={() => handleOpenCreateModal()}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isAdminOrOperator ? 'Tambah Agenda Baru' : 'Tambah Agenda Saya'}</span>
              </button>
            </div>
          </div>

          {/* Floating Banner Mode Edit Agenda Sekaligus */}
          <AnimatePresence>
            {isBatchEditEvents && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mx-4 p-4 bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-900 text-white rounded-2xl shadow-xl border border-amber-400/50 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-md">
                    <Edit2 className="w-5 h-5 text-slate-950" />
                  </span>
                  <div>
                    <span className="text-xs font-black text-amber-200 block">
                      Mode Edit Agenda Kalender Sekaligus Aktif ({filteredEvents.length} Agenda)
                    </span>
                    <span className="text-[11px] text-slate-200">
                      Ubah judul, kategori, tanggal mulai, tanggal selesai, semester, dan prioritas langsung di daftar bawah ini.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleSaveAllBatchEvents}
                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Save className="w-4 h-4 text-slate-950" />
                    <span>Simpan Semua Agenda ({filteredEvents.length} Agenda)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleToggleBatchEditEvents}
                    className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-700"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="divide-y divide-slate-100 overflow-x-auto">
            {filteredEvents.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Tidak ada agenda yang cocok dengan filter atau kata kunci pencarian.
              </div>
            ) : (
              filteredEvents.map((ev, index) => {
                const curEdit = batchEventsMap[ev.id] || ev;

                if (isBatchEditEvents) {
                  return (
                    <div key={ev.id} className="p-4 bg-amber-50/40 border-b border-amber-200/80 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                          Agenda #{index + 1} ({ev.id})
                        </span>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-1 text-[11px] font-bold text-slate-700 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!!curEdit.isImportant}
                              onChange={(e) => handleUpdateBatchEventField(ev.id, 'isImportant', e.target.checked)}
                              className="rounded text-red-600 focus:ring-red-500"
                            />
                            <span className="text-red-700">Penting / Prioritas</span>
                          </label>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Judul Agenda</label>
                          <input
                            type="text"
                            value={curEdit.title || ''}
                            onChange={(e) => handleUpdateBatchEventField(ev.id, 'title', e.target.value)}
                            className="w-full mt-0.5 px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Kategori Agenda</label>
                          <select
                            value={curEdit.category || 'kegiatan_sekolah'}
                            onChange={(e) => handleUpdateBatchEventField(ev.id, 'category', e.target.value as any)}
                            className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          >
                            <option value="kegiatan_sekolah">Kegiatan Sekolah</option>
                            <option value="asesmen_ujian">Ujian / Asesmen</option>
                            <option value="deadline">Tenggat Waktu</option>
                            <option value="libur_nasional">Hari Libur</option>
                            <option value="pribadi_guru">Agenda Mandiri Guru</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Tanggal Mulai</label>
                          <input
                            type="date"
                            value={curEdit.startDate || ''}
                            onChange={(e) => handleUpdateBatchEventField(ev.id, 'startDate', e.target.value)}
                            className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Tanggal Selesai</label>
                          <input
                            type="date"
                            value={curEdit.endDate || ''}
                            onChange={(e) => handleUpdateBatchEventField(ev.id, 'endDate', e.target.value)}
                            className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Semester</label>
                          <select
                            value={curEdit.semester || 'Ganjil'}
                            onChange={(e) => handleUpdateBatchEventField(ev.id, 'semester', e.target.value as any)}
                            className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          >
                            <option value="Ganjil">Semester Ganjil</option>
                            <option value="Genap">Semester Genap</option>
                            <option value="Semua">1 Tahun Penuh</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Level Agenda</label>
                          <select
                            value={curEdit.level || 'sekolah'}
                            onChange={(e) => handleUpdateBatchEventField(ev.id, 'level', e.target.value as any)}
                            className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                          >
                            <option value="sekolah">Resmi Sekolah</option>
                            <option value="guru">Catatan Guru</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                }

                let categoryBadge = 'bg-slate-100 text-slate-700';

                if (ev.category === 'libur_nasional') categoryBadge = 'bg-red-50 text-red-700 border border-red-200';
                else if (ev.category === 'asesmen_ujian') categoryBadge = 'bg-blue-50 text-blue-700 border border-blue-200';
                else if (ev.category === 'deadline') categoryBadge = 'bg-amber-50 text-amber-800 border border-amber-200';
                else if (ev.category === 'kegiatan_sekolah') categoryBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                else if (ev.category === 'pribadi_guru') categoryBadge = 'bg-purple-50 text-purple-700 border border-purple-200';

                return (
                  <div
                    key={ev.id}
                    className={`p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors ${
                      ev.isCompleted ? 'opacity-60 bg-slate-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Timeline Number / Status */}
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                        {index + 1}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={`font-bold text-sm text-slate-900 ${ev.isCompleted ? 'line-through text-slate-500' : ''}`}>
                            {ev.title}
                          </h4>
                          <span className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold ${categoryBadge}`}>
                            {ev.category === 'asesmen_ujian'
                              ? 'Ujian / Asesmen'
                              : ev.category === 'deadline'
                              ? 'Tenggat Waktu'
                              : ev.category === 'libur_nasional'
                              ? 'Hari Libur'
                              : ev.category === 'pribadi_guru'
                              ? `Agenda Guru (${ev.createdByName || 'Pribadi'})`
                              : 'Kegiatan Resmi'}
                          </span>
                          {ev.level === 'sekolah' ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                              Resmi Sekolah
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                              Mandiri Guru
                            </span>
                          )}
                          {ev.isImportant && (
                            <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-700 text-[10px] font-bold">
                              Prioritas Penting
                            </span>
                          )}
                          {ev.isCompleted && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              Selesai
                            </span>
                          )}
                        </div>

                        {ev.description && (
                          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                            {ev.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-1">
                          <span className="font-semibold text-slate-700">
                            {ev.startDate}
                            {ev.endDate && ev.endDate !== ev.startDate && ` s.d. ${ev.endDate}`}
                          </span>
                          <span>• Semester {ev.semester || 'Ganjil'}</span>
                          {ev.targetSubject && <span>• Mapel: {ev.targetSubject}</span>}
                          {ev.targetClass && <span>• Kelas: {ev.targetClass}</span>}
                          <span className="text-slate-500 font-medium">• Dibuat oleh: {ev.createdByName || 'Admin'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons for this item */}
                    <div className="flex items-center gap-2 shrink-0 md:self-center">
                      {canEditEvent(ev) && (
                        <>
                          {ev.level === 'guru' && (
                            <button
                              onClick={() => toggleCalendarEventComplete(ev.id)}
                              className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                ev.isCompleted
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{ev.isCompleted ? 'Selesai' : 'Tandai Selesai'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(ev)}
                            className="p-2 rounded-lg bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                            title="Edit Agenda Kalender"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Hapus agenda "${ev.title}"?`)) {
                                deleteCalendarEvent(ev.id);
                              }
                            }}
                            className="p-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 cursor-pointer"
                            title="Hapus Agenda"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* VIEW TAB 3: Pratinjau Dokumen Cetak A4 Landscape (Times New Roman Draft Preview) */}
      {activeTab === 'preview' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                <strong>Pratinjau Format Cetak Dokumen Resmi:</strong> Dokumen disusun dalam orientasi <strong>A4 Landscape (297 x 210 mm)</strong>, tipografi standar resmi <strong>Times New Roman</strong>, matriks 6 bulan horisontal, legenda warna, agenda kegiatan pokok, serta tanda tangan pengesahan resmi Kepala Sekolah &amp; Pendidik.
              </span>
            </div>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shrink-0 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <FileDown className="w-4 h-4" />
              <span>{isExporting ? 'Memproses PDF...' : 'Unduh PDF Landscape A4'}</span>
            </button>
          </div>

          {/* Paper Sheet Preview Container (A4 Landscape Proportions) */}
          <div className="bg-slate-200 p-3 sm:p-6 rounded-2xl flex justify-center overflow-x-auto">
            <div
              className="bg-white shadow-2xl p-6 sm:p-8 w-full max-w-[297mm] min-h-[200mm] text-slate-900 overflow-hidden"
              style={{ fontFamily: '"Times New Roman", Times, serif' }}
            >
              {/* Kop Surat Header Simulation in Landscape */}
              <div className="border-b-2 border-slate-900 pb-2.5 mb-3 text-center relative">
                <div className="flex items-center justify-between">
                  {school.logoProvinsiUrl && (
                    <img
                      src={school.logoProvinsiUrl}
                      alt="Logo Provinsi Lampung"
                      className="w-14 h-14 object-contain"
                    />
                  )}
                  <div className="flex-1 px-4">
                    <h2 className="text-xs sm:text-sm font-bold tracking-wide uppercase">
                      {school.provinsiText || 'PEMERINTAH PROVINSI LAMPUNG'}
                    </h2>
                    <h1 className="text-base sm:text-lg font-bold uppercase">
                      {school.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
                    </h1>
                    <p className="text-[10px]">
                      NPSN: {school.npsn || '69955116'} - NSS: {school.nss || '30.1.1812.02.021'} - AKREDITASI ”{school.akreditasi || 'B'}”
                    </p>
                    <p className="text-[9.5px]">
                      {school.alamat || 'Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung'}
                    </p>
                    <p className="text-[9.5px]">
                      Website: {school.website} | Email: {school.email}
                    </p>
                  </div>
                  {school.logoSekolahUrl && (
                    <img
                      src={school.logoSekolahUrl}
                      alt="Logo Sekolah"
                      className="w-14 h-14 object-contain"
                    />
                  )}
                </div>
              </div>

              {/* Document Title */}
              <div className="text-center mb-3">
                <h3 className="font-bold text-sm tracking-wide uppercase underline">
                  KALENDER PENDIDIKAN TAHUN PELAJARAN {activeYear}
                </h3>
                <p className="text-xs font-semibold uppercase mt-0.5">
                  SEMESTER {semesterFilter === 'Semua' ? 'GANJIL & GENAP' : semesterFilter.toUpperCase()} - SMA NEGERI 3 TUMIJAJAR
                </p>
              </div>

              {/* Landscape 6 Months Matrix Preview (Horizontal row of 6 columns) */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 mb-3 text-[10px]">
                {calendarMonths.slice(0, 6).map((month) => (
                  <div key={month.monthName} className="border border-slate-700 p-1.5 rounded-sm bg-slate-50/50">
                    <div className="font-bold text-center border-b border-slate-400 pb-0.5 mb-1 flex justify-between px-1 text-[9.5px]">
                      <span>{month.monthName}</span>
                      <span>{month.hbeCount} HBE</span>
                    </div>
                    <div className="grid grid-cols-7 text-center font-bold text-[8.5px] mb-0.5">
                      {['M', 'S', 'S', 'R', 'K', 'J', 'S'].map((d, i) => (
                        <span key={i} className={i === 0 ? 'text-red-600' : i === 5 ? 'text-emerald-700' : ''}>
                          {d}
                        </span>
                      ))}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 text-center text-[8px]">
                      {month.weeks.flatMap((w) => w).map((c, idx) => (
                        <span
                          key={idx}
                          className={`p-0.5 rounded-xs ${
                            c.dayNumber
                              ? c.isSunday
                                ? 'text-red-600 font-bold'
                                : c.events.some((e) => e.category === 'libur_nasional')
                                ? 'bg-red-100 text-red-700 font-bold'
                                : c.events.some((e) => e.category === 'asesmen_ujian')
                                ? 'bg-blue-100 text-blue-700 font-bold'
                                : c.events.some((e) => e.category === 'deadline')
                                ? 'bg-amber-100 text-amber-800 font-bold'
                                : c.events.some((e) => e.category === 'kegiatan_sekolah')
                                ? 'bg-emerald-100 text-emerald-800 font-bold'
                                : c.events.some((e) => e.category === 'pribadi_guru')
                                ? 'bg-purple-100 text-purple-800 font-bold'
                                : ''
                              : 'invisible'
                          }`}
                        >
                          {c.dayNumber || '-'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Color Legend Row in Preview */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[9px] pb-1 border-b border-slate-300">
                <span className="font-bold">Keterangan:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-red-200 border border-red-500 inline-block"></span> Libur Nasional / Semester
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-200 border border-blue-600 inline-block"></span> Asesmen &amp; Ujian
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-amber-200 border border-amber-600 inline-block"></span> Tenggat Waktu Guru
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-emerald-200 border border-emerald-600 inline-block"></span> Kegiatan Sekolah / Rapor
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-purple-200 border border-purple-600 inline-block"></span> Agenda Guru
                </span>
              </div>

              {/* Table of Key Dates & Agendas */}
              <div className="mb-4">
                <table className="w-full text-[9px] border-collapse border border-slate-700">
                  <thead>
                    <tr className="bg-slate-100">
                      <th className="border border-slate-700 p-1 text-center w-8">No</th>
                      <th className="border border-slate-700 p-1 text-left w-36">Tanggal / Waktu</th>
                      <th className="border border-slate-700 p-1 text-left">Agenda Kegiatan Pokok</th>
                      <th className="border border-slate-700 p-1 text-left w-32">Kategori</th>
                      <th className="border border-slate-700 p-1 text-left">Keterangan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.slice(0, 14).map((ev, i) => (
                      <tr key={ev.id}>
                        <td className="border border-slate-700 p-1 text-center font-semibold">{i + 1}</td>
                        <td className="border border-slate-700 p-1 font-bold">
                          {ev.startDate}
                          {ev.endDate && ev.endDate !== ev.startDate && ` s.d. ${ev.endDate}`}
                        </td>
                        <td className="border border-slate-700 p-1 font-semibold">{ev.title}</td>
                        <td className="border border-slate-700 p-1">
                          {ev.category === 'asesmen_ujian'
                            ? 'Asesmen & Ujian'
                            : ev.category === 'deadline'
                            ? 'Tenggat Waktu'
                            : ev.category === 'libur_nasional'
                            ? 'Hari Libur'
                            : ev.category === 'pribadi_guru'
                            ? `Agenda Guru`
                            : 'Kegiatan Sekolah'}
                        </td>
                        <td className="border border-slate-700 p-1">{ev.description || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Signatures & Summary Section in Landscape */}
              <div className="flex items-start justify-between text-xs pt-3 border-t border-slate-400">
                <div className="text-left space-y-8">
                  <div>
                    <p className="text-[10px] text-slate-700 font-bold">
                      * Total Hari Belajar Efektif (HBE): {stats.hbeTotal} Hari
                    </p>
                    <p className="mt-1">Mengetahui,</p>
                    <p className="font-semibold">Guru Pengampu Mata Pelajaran / Pendidik,</p>
                  </div>
                  <div>
                    <p className="font-bold underline">{currentUser?.nama || 'Guru Mata Pelajaran'}</p>
                    <p className="text-[10px]">NIP. {currentUser?.nip || '-'}</p>
                  </div>
                </div>

                <div className="text-right space-y-8">
                  <div>
                    <p>Tumijajar, {formatIndonesianDate(new Date())}</p>
                    <p className="font-semibold">Kepala SMA Negeri 3 Tumijajar,</p>
                  </div>
                  <div>
                    <p className="font-bold underline">{school.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.'}</p>
                    <p className="text-[10px]">NIP. {school.nipKepalaSekolah || '19750812 200212 1 001'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Agenda (Mandiri Guru & Resmi Sekolah) */}
      <AnimatePresence>
        {isEventModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                    {editingEvent
                      ? `Edit Agenda: ${editingEvent.title}`
                      : isAdminOrOperator
                      ? 'Tambah Agenda Kalender Pendidikan'
                      : 'Tambah Agenda Mandiri Guru'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsEventModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSaveForm} className="p-6 space-y-4">
                {/* Tingkat Agenda (Only for Admin/Operator) */}
                {isAdminOrOperator && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tingkat Agenda Kalender <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormLevel('sekolah')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                          formLevel === 'sekolah'
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Agenda Resmi Sekolah</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Tampak untuk seluruh guru, siswa, &amp; cetak PDF</p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFormLevel('guru')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                          formLevel === 'guru'
                            ? 'bg-purple-50 border-purple-500 text-purple-900 ring-2 ring-purple-500/20'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-bold">
                          <Star className="w-3.5 h-3.5 text-purple-600" />
                          <span>Agenda Mandiri Guru</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">Catatan persiapan &amp; tenggat nilai pribadi</p>
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Judul Agenda / Catatan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Contoh: Asesmen Sumatif Tengah Semester (ASTS), Pembagian Rapor, Libur Idul Fitri"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Mulai <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Tanggal Selesai (Opsional)
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Agenda</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="kegiatan_sekolah">Kegiatan Resmi Sekolah / MPLS</option>
                      <option value="asesmen_ujian">Periode Asesmen / Ujian (ASTS/ASAS/ASAJ)</option>
                      <option value="deadline">Tenggat Waktu / Batas Nilai</option>
                      <option value="libur_nasional">Libur Nasional &amp; Akhir Semester</option>
                      <option value="pribadi_guru">Agenda Mandiri Guru</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Semester</label>
                    <select
                      value={formSemester}
                      onChange={(e) => setFormSemester(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="Ganjil">Semester Ganjil</option>
                      <option value="Genap">Semester Genap</option>
                      <option value="Semua">Semua Semester</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Sasaran Kelas (Opsional)</label>
                    <input
                      type="text"
                      value={formTargetClass}
                      onChange={(e) => setFormTargetClass(e.target.value)}
                      placeholder="Contoh: X.1, XII.MIPA, Seluruh Siswa"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran (Opsional)</label>
                    <input
                      type="text"
                      value={formTargetSubject}
                      onChange={(e) => setFormTargetSubject(e.target.value)}
                      placeholder="Contoh: Fisika, Matematika"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi / Petunjuk Pelaksanaan</label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Tuliskan keterangan detail persiapan atau instruksi..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isImportantCheck"
                    checked={formIsImportant}
                    onChange={(e) => setFormIsImportant(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="isImportantCheck" className="text-xs font-semibold text-slate-700 cursor-pointer select-none">
                    Tandai agenda ini sebagai <strong>Prioritas Penting / Urgent</strong>
                  </label>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsEventModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 cursor-pointer"
                  >
                    {editingEvent ? 'Simpan Perubahan' : 'Tambahkan ke Kalender'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: KELOLA & EDIT KALENDER PENDIDIKAN (ADMIN & OPERATOR) */}
      <AnimatePresence>
        {isManageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-bold">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm sm:text-base tracking-tight">
                      Kelola &amp; Edit Kalender Pendidikan SMAN 3 Tumijajar
                    </h3>
                    <p className="text-xs text-slate-400">
                      Pengaturan Tahun Pelajaran, Semester, dan Pembaruan Jadwal Resmi Sekolah
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsManageModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Notification Banner */}
              {manageNotification && (
                <div className="px-6 py-2.5 bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{manageNotification}</span>
                </div>
              )}

              {/* Subtabs inside Management Modal */}
              <div className="px-6 pt-4 pb-2 border-b border-slate-200 flex items-center gap-2 shrink-0 bg-slate-50">
                <button
                  onClick={() => setManageTab('settings')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    manageTab === 'settings'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Konfigurasi Tahun Ajaran &amp; Template
                </button>
                <button
                  onClick={() => setManageTab('official_events')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    manageTab === 'official_events'
                      ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Daftar Agenda Resmi Sekolah ({stats.schoolEventsCount})
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {manageTab === 'settings' && (
                  <div className="space-y-6">
                    {/* Panel 1: Konfigurasi Tahun Pelajaran Aktif */}
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-extrabold text-sm text-slate-900">
                          Tahun Pelajaran &amp; Semester Aktif
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600">
                        Sesuaikan Tahun Pelajaran saat ini. Perubahan akan otomatis mengatur matriks bulan (Juli - Juni), penghitungan HBE, dan judul pada ekspor PDF resmi.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Tahun Pelajaran (Format: TTTT/TTTT)
                          </label>
                          <input
                            type="text"
                            value={manageYearInput}
                            onChange={(e) => setManageYearInput(e.target.value)}
                            placeholder="Contoh: 2026/2027"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Semester Aktif
                          </label>
                          <select
                            value={manageSemesterInput}
                            onChange={(e) => setManageSemesterInput(e.target.value as any)}
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          >
                            <option value="Ganjil">Semester Ganjil</option>
                            <option value="Genap">Semester Genap</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end">
                        <button
                          onClick={handleSaveYearSemesterConfig}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                        >
                          Simpan &amp; Sinkronkan Tahun Pelajaran
                        </button>
                      </div>
                    </div>

                    {/* Panel 2: Migrasi / Salin Template ke Tahun Ajaran Baru */}
                    <div className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <Copy className="w-4 h-4 text-amber-700" />
                        <h4 className="font-extrabold text-sm text-amber-950">
                          Gandakan Agenda ke Tahun Ajaran Baru (+1 Tahun)
                        </h4>
                      </div>
                      <p className="text-xs text-amber-900 leading-relaxed">
                        Fitur cerdas untuk peralihan tahun ajaran baru: menyalin seluruh agenda baku sekolah (MPLS, ASTS, ASAS, ASAJ, Rapor, Libur Semester) dan secara otomatis memajukan tanggalnya 1 tahun tanpa perlu mengetik ulang dari awal.
                      </p>
                      <button
                        onClick={handleDuplicateForNextYear}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Gandakan Agenda ke Tahun Pelajaran Baru</span>
                      </button>
                    </div>

                    {/* Panel 3: Reset Template */}
                    <div className="p-5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-3">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-4 h-4 text-rose-700" />
                        <h4 className="font-extrabold text-sm text-rose-950">
                          Reset ke Template Kalender Standar SMAN 3 Tumijajar
                        </h4>
                      </div>
                      <p className="text-xs text-rose-800 leading-relaxed">
                        Gunakan tombol ini jika Anda ingin mengembalikan kalender ke jadwal baku yang telah terverifikasi oleh Kurikulum SMAN 3 Tumijajar.
                      </p>
                      <button
                        onClick={handleResetDefaultCalendar}
                        className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Reset ke Kalender Baku Dinas</span>
                      </button>
                    </div>
                  </div>
                )}

                {manageTab === 'official_events' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-600">
                        Kelola dan edit langsung butir-butir kegiatan resmi sekolah:
                      </p>
                      <button
                        onClick={() => {
                          setIsManageModalOpen(false);
                          handleOpenCreateModal(undefined, 'sekolah');
                        }}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Tambah Agenda Resmi</span>
                      </button>
                    </div>

                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-[420px] overflow-y-auto">
                      {allEvents
                        .filter((e) => e.level === 'sekolah')
                        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                        .map((ev, idx) => (
                          <div key={ev.id} className="p-3 bg-white hover:bg-slate-50 flex items-center justify-between gap-3 text-xs">
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 truncate">{ev.title}</span>
                                <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                                  ({ev.semester})
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                {ev.startDate}{ev.endDate && ev.endDate !== ev.startDate ? ` s.d. ${ev.endDate}` : ''} • {ev.category}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => {
                                  setIsManageModalOpen(false);
                                  handleOpenEditModal(ev);
                                }}
                                className="p-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer"
                                title="Edit Agenda"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (window.confirm(`Hapus agenda sekolah "${ev.title}"?`)) {
                                    deleteCalendarEvent(ev.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer"
                                title="Hapus Agenda"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  onClick={() => setIsManageModalOpen(false)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
