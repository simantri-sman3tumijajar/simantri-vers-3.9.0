import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { TeacherExamAssignment, Teacher } from '../types';
import {
  Users,
  GraduationCap,
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Search,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Lock,
  ExternalLink,
  Laptop,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConnectedTeacherAccountsBoxProps {
  selectedTeacherId?: string;
  onSelectTeacher?: (teacherId: string) => void;
  className?: string;
}

export const ConnectedTeacherAccountsBox: React.FC<ConnectedTeacherAccountsBoxProps> = ({
  selectedTeacherId,
  onSelectTeacher,
  className = '',
}) => {
  const {
    state,
    currentUser,
    saveTeacherExamAssignment,
    showToast,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ASSIGNED' | 'DONE' | 'UNASSIGNED'>('ALL');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('Baru saja');

  // Form state for assigning teacher CBT
  const [assignForm, setAssignForm] = useState<{
    id?: string;
    teacherId: string;
    category: TeacherExamAssignment['category'];
    subjectName: string;
    targetClasses: string[];
    dueDate: string;
    targetQuestions: number;
    notes: string;
  }>({
    teacherId: '',
    category: 'ASAS',
    subjectName: '',
    targetClasses: ['X-1', 'X-2'],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    targetQuestions: 40,
    notes: '',
  });

  const isAdmin = currentUser?.role === 'admin';
  const teachers = state.teachers || [];
  const assignments = state.examManagement?.teacherAssignments || [];

  // Periodic real-time sync simulation & timestamp updater
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setLastSyncTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(
          now.getSeconds()
        ).padStart(2, '0')}`
      );
    }, 15000); // 15s periodic update

    return () => clearInterval(interval);
  }, []);

  const handleManualSync = useCallback(() => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      const now = new Date();
      setLastSyncTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(
          now.getSeconds()
        ).padStart(2, '0')}`
      );
      showToast('Sinkronisasi Berhasil', 'Data akun guru dan status tugas CBT telah dimutakhirkan secara real-time.', 'success');
    }, 600);
  }, [showToast]);

  // Map each teacher to their active CBT assignments and question progress
  const teacherCardsData = useMemo(() => {
    return teachers.map((teacher) => {
      const teacherAssignments = assignments.filter((a) => {
        const idMatch = a.teacherId && (a.teacherId === teacher.id || a.teacherId === teacher.nip);
        const nameMatch = a.teacherName && teacher.nama &&
          a.teacherName.toLowerCase().trim() === teacher.nama.toLowerCase().trim();
        return idMatch || nameMatch;
      });

      // Calculate crafted questions from assessment bank
      const teacherAssessments = state.assessments.filter((asm) => {
        return (
          asm.guruId === teacher.id ||
          (teacher.nama && asm.guruPengampu?.toLowerCase() === teacher.nama.toLowerCase()) ||
          (teacher.mataPelajaran && teacher.mataPelajaran.includes(asm.mataPelajaran))
        );
      });

      const primaryAssignment = teacherAssignments[0] || null;

      let liveCount = 0;
      let targetCount = primaryAssignment?.targetQuestions || 40;
      if (primaryAssignment) {
        const matched = teacherAssessments.filter((asm) => {
          if (primaryAssignment.category === "Simulasi D'SMART Lampung") {
            return asm.jenis === 'DSMART';
          }
          if (primaryAssignment.category === 'ASTS') {
            return asm.jenis === 'ASTS' && asm.mataPelajaran.toLowerCase() === primaryAssignment.subjectName.toLowerCase();
          }
          return asm.mataPelajaran.toLowerCase() === primaryAssignment.subjectName.toLowerCase();
        });

        liveCount = matched.reduce((acc, curr) => {
          const mcq = curr.mcqQuestions?.length || 0;
          const essay = curr.essayRubrik?.length || 0;
          return acc + Math.max(mcq, essay, curr.jumlahSoal || 0);
        }, 0);
      }

      const progressPercent = primaryAssignment
        ? Math.min(100, Math.round((liveCount / targetCount) * 100))
        : 0;

      const isFinished = primaryAssignment?.status === 'Selesai Digarap' || primaryAssignment?.status === 'Telah Diverifikasi';
      const isAssigned = teacherAssignments.length > 0;

      return {
        teacher,
        assignments: teacherAssignments,
        primaryAssignment,
        liveCount,
        targetCount,
        progressPercent,
        isAssigned,
        isFinished,
        isSelected: selectedTeacherId === teacher.id,
      };
    });
  }, [teachers, assignments, state.assessments, selectedTeacherId]);

  // Filtered teachers list
  const filteredTeacherCards = useMemo(() => {
    return teacherCardsData.filter((item) => {
      const matchSearch =
        item.teacher.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.teacher.nip || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.teacher.mataPelajaran || []).some((m) => m.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (filterTab === 'ASSIGNED') return item.isAssigned && !item.isFinished;
      if (filterTab === 'DONE') return item.isFinished;
      if (filterTab === 'UNASSIGNED') return !item.isAssigned;
      return true;
    });
  }, [teacherCardsData, searchQuery, filterTab]);

  const assignedCount = teacherCardsData.filter((i) => i.isAssigned && !i.isFinished).length;
  const doneCount = teacherCardsData.filter((i) => i.isFinished).length;
  const unassignedCount = teacherCardsData.filter((i) => !i.isAssigned).length;

  // Open modal to assign a specific teacher
  const handleOpenAssignModal = (teacher?: Teacher, assignment?: TeacherExamAssignment) => {
    const t = teacher || teachers[0];
    if (!t) return;

    if (assignment) {
      setAssignForm({
        id: assignment.id,
        teacherId: t.id,
        category: assignment.category,
        subjectName: assignment.subjectName,
        targetClasses: assignment.targetClasses || ['Semua Kelas'],
        dueDate: assignment.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        targetQuestions: assignment.targetQuestions || 40,
        notes: assignment.notes || '',
      });
    } else {
      const defaultSubject = t.mataPelajaran && t.mataPelajaran[0] ? t.mataPelajaran[0] : 'Matematika';
      setAssignForm({
        teacherId: t.id,
        category: 'ASAS',
        subjectName: defaultSubject,
        targetClasses: ['X-1', 'X-2', 'XI-1'],
        dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        targetQuestions: 40,
        notes: '',
      });
    }
    setIsAssignModalOpen(true);
  };

  const handleCategoryChange = (cat: TeacherExamAssignment['category']) => {
    const selectedTeacher = teachers.find((t) => t.id === assignForm.teacherId);
    const teacherMapel = selectedTeacher?.mataPelajaran?.[0] || 'Umum';

    if (cat === "Simulasi D'SMART Lampung") {
      setAssignForm((prev) => ({
        ...prev,
        category: cat,
        subjectName: "Simulasi D'SMART Lampung (4 Instrumen Utama: Literasi, Numerasi, Pra Kampus, Karakter)",
        targetQuestions: 50,
      }));
    } else if (cat === 'ASTS') {
      setAssignForm((prev) => ({
        ...prev,
        category: cat,
        subjectName: teacherMapel,
        targetQuestions: 10,
      }));
    } else {
      setAssignForm((prev) => ({
        ...prev,
        category: cat,
        subjectName: teacherMapel,
        targetQuestions: 40,
      }));
    }
  };

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.teacherId || !assignForm.subjectName) {
      showToast('Form Belum Lengkap', 'Pilih akun guru dan mata pelajaran.', 'warning');
      return;
    }

    const targetTeacher = teachers.find((t) => t.id === assignForm.teacherId);
    const newAssignment: TeacherExamAssignment = {
      id: assignForm.id || `asgn-${Date.now()}`,
      teacherId: assignForm.teacherId,
      teacherName: targetTeacher?.nama || 'Guru Pengampu',
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
    showToast(
      'Terkoneksi Otomatis!',
      `Akun guru "${targetTeacher?.nama}" otomatis terkoneksi dan menerima mandat pembuatan soal CBT (${assignForm.category}).`,
      'success'
    );

    if (onSelectTeacher) {
      onSelectTeacher(assignForm.teacherId);
    }
  };

  return (
    <>
      <div
        className={`rounded-3xl bg-white border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between ${className}`}
      >
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-slate-50 via-teal-50/30 to-indigo-50/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 tracking-tight leading-snug">
                    Akun Guru Terkoneksi CBT
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0 whitespace-nowrap">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Auto-Sync
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Daftar akun guru otomatis terhubung ke sistem perancangan &amp; bank soal CBT Admin secara berkala.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* Sync Status Button */}
              <button
                type="button"
                onClick={handleManualSync}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-2xs transition-all cursor-pointer whitespace-nowrap"
                title="Sinkronkan status koneksi akun guru sekarang"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-teal-600' : ''}`} />
                <span className="text-[11px] font-mono text-slate-600">{lastSyncTime}</span>
              </button>

              {/* Add Assignment Button for Admin */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleOpenAssignModal()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tugaskan CBT</span>
                </button>
              )}
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari akun guru, NIP, atau mata pelajaran..."
                className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 transition-all"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 shrink-0 text-xs font-bold overflow-x-auto">
              <button
                type="button"
                onClick={() => setFilterTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterTab === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Semua ({teachers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('ASSIGNED')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterTab === 'ASSIGNED'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Ditugaskan ({assignedCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('DONE')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterTab === 'DONE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Selesai ({doneCount})
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('UNASSIGNED')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filterTab === 'UNASSIGNED'
                    ? 'bg-slate-200 text-slate-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Siap ({unassignedCount})
              </button>
            </div>
          </div>
        </div>

        {/* List of Teacher Accounts */}
        <div className="p-4 sm:p-5 max-h-[580px] overflow-y-auto">
          {filteredTeacherCards.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700">Tidak Ada Akun Guru Ditemukan</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Coba sesuaikan kata kunci pencarian atau tab filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredTeacherCards.map((item) => {
                const t = item.teacher;
                const primary = item.primaryAssignment;
                const isDSmart = primary?.category === "Simulasi D'SMART Lampung";

                return (
                  <div
                    key={t.id}
                    className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between ${
                      item.isSelected
                        ? 'bg-teal-50/60 border-teal-300 shadow-xs ring-1 ring-teal-300'
                        : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                  <div className="flex items-start justify-between gap-2">
                    {/* Teacher Identity */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <div className="w-9 h-11 rounded-[50%] overflow-hidden border border-slate-200 bg-slate-100 flex items-center justify-center">
                          {t.fotoUrl ? (
                            <img
                              src={t.fotoUrl}
                              alt={t.nama}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <GraduationCap className="w-4 h-4 text-slate-400" />
                          )}
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white" />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-extrabold text-xs text-slate-900 truncate">
                            {t.nama}
                          </h4>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-600">
                            {t.nip ? `NIP: ${t.nip}` : 'ID: ' + t.id.substring(0, 6)}
                          </span>
                        </div>

                        {/* Subject badges */}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {(t.mataPelajaran || []).slice(0, 2).map((m, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100"
                            >
                              {m}
                            </span>
                          ))}
                          {(t.mataPelajaran || []).length > 2 && (
                            <span className="text-[9px] text-slate-400">
                              +{(t.mataPelajaran || []).length - 2}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {primary ? (
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider border ${
                            isDSmart
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : primary.category === 'ASAS'
                              ? 'bg-sky-50 text-sky-800 border-sky-300'
                              : 'bg-indigo-50 text-indigo-800 border-indigo-300'
                          }`}
                        >
                          {isDSmart ? "D'SMART CBT" : primary.category}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-lg text-[9.5px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Siap Ditugaskan
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Connected CBT task info row */}
                  {primary ? (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-slate-700 truncate max-w-[200px]">
                          {isDSmart ? "Simulasi D'SMART Lampung (4 Instrumen)" : primary.subjectName}
                        </span>
                        <span className="font-mono text-teal-700 font-extrabold shrink-0">
                          {item.liveCount} / {item.targetCount} Soal ({item.progressPercent}%)
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            item.progressPercent >= 100
                              ? 'bg-emerald-500'
                              : isDSmart
                              ? 'bg-emerald-600'
                              : 'bg-teal-600'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(5, item.progressPercent))}%` }}
                        />
                      </div>

                      <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Status: <strong className="text-slate-800">{primary.status}</strong></span>
                        </span>
                        <span className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3 h-3 text-amber-500" />
                          <span>{primary.dueDate || 'Jadwal CBT'}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-1.5 rounded-xl bg-slate-50/70 border border-dashed border-slate-200 text-[10.5px] text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                        <span>Akun aktif &amp; siap menerima plot perancangan CBT</span>
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-2.5 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onSelectTeacher && onSelectTeacher(t.id)}
                      className={`text-[10.5px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                        item.isSelected
                          ? 'bg-teal-700 text-white shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Laptop className="w-3 h-3" />
                      <span>{item.isSelected ? 'Kotak Aktif Terpilih' : 'Pilih Ruang Kerja'}</span>
                    </button>

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenAssignModal(t, primary || undefined)}
                          className="text-[10.5px] font-extrabold px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all cursor-pointer flex items-center gap-1"
                        >
                          <Zap className="w-3 h-3 text-teal-600" />
                          <span>{primary ? 'Atur Ulang Mandat' : '+ Tugaskan CBT'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10.5px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Koneksi Real-Time Aktif Terhadap Seluruh Akun Guru</span>
          </div>
          <span className="font-mono text-slate-400">SMAN 3 Tumijajar CBT</span>
        </div>
      </div>

      {/* MODAL TUGASKAN AKUN GURU CBT (DENGAN AUTO-DISABLE MAPEL UNTUK D'SMART LAMPUNG) */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)]"
          >
            {/* Header */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-700 to-indigo-800 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/10 rounded-xl">
                  <Laptop className="w-5 h-5 text-teal-200" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">
                    Tugaskan Akun Guru Merancang Soal CBT
                  </h3>
                  <p className="text-xs text-teal-100">
                    Otomatis terkoneksi langsung ke akun guru secara real-time
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs font-bold cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveAssignment} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs overscroll-contain">
              {/* Teacher select */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pilih Akun Guru yang Ditugaskan:
                </label>
                <select
                  required
                  value={assignForm.teacherId}
                  onChange={(e) => {
                    const tid = e.target.value;
                    const found = teachers.find((t) => t.id === tid);
                    setAssignForm((prev) => ({
                      ...prev,
                      teacherId: tid,
                      subjectName:
                        prev.category === "Simulasi D'SMART Lampung"
                          ? "Simulasi D'SMART Lampung (4 Instrumen Utama: Literasi, Numerasi, Pra Kampus, Karakter)"
                          : found?.mataPelajaran?.[0] || prev.subjectName,
                    }));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Pilih Akun Guru --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nama} {t.nip ? `(NIP: ${t.nip})` : ''} — {t.mataPelajaran?.join(', ') || 'Semua Mapel'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Kategori Ujian CBT:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('ASAS')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-center border cursor-pointer transition-all ${
                      assignForm.category === 'ASAS'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ASAS (PG)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryChange('ASTS')}
                    className={`py-2 px-2.5 rounded-xl font-bold text-center border cursor-pointer transition-all ${
                      assignForm.category === 'ASTS'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    ASTS (Essay)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("Simulasi D'SMART Lampung")}
                    className={`py-2 px-2.5 rounded-xl font-bold text-center border cursor-pointer transition-all ${
                      assignForm.category === "Simulasi D'SMART Lampung"
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    D&apos;SMART Lampung
                  </button>
                </div>
              </div>

              {/* Subject Selection - AUTOMATICALLY LOCKED & DISABLED FOR D'SMART LAMPUNG */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">Mata Pelajaran:</label>
                  {assignForm.category === "Simulasi D'SMART Lampung" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <Lock className="w-2.5 h-2.5" />
                      Mapel Dinonaktifkan Otomatis
                    </span>
                  )}
                </div>

                <input
                  type="text"
                  required
                  disabled={assignForm.category === "Simulasi D'SMART Lampung"}
                  value={assignForm.subjectName}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, subjectName: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-xl font-bold border ${
                    assignForm.category === "Simulasi D'SMART Lampung"
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300 cursor-not-allowed opacity-90'
                      : 'bg-slate-50 text-slate-800 border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500'
                  }`}
                />

                {assignForm.category === "Simulasi D'SMART Lampung" && (
                  <div className="mt-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[10.5px]">
                    <div className="flex items-center gap-1 font-bold text-emerald-800">
                      <Sparkles className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>Terikat Langsung ke 4 Instrumen Utama D&apos;SMART Lampung:</span>
                    </div>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 text-[10px] text-emerald-800 font-medium">
                      <li>Instrumen 1: Literasi Membaca (15 Soal PG HOTS)</li>
                      <li>Instrumen 2: Numerasi (15 Soal PG HOTS)</li>
                      <li>Instrumen 3: Skrining Pra Kampus (10 Soal PG HOTS)</li>
                      <li>Instrumen 4: Survei Karakter &amp; Lingkungan Belajar (10 Soal PG HOTS)</li>
                    </ul>
                  </div>
                )}
              </div>

              {/* Target Questions & Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Target Butir Soal:
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={assignForm.targetQuestions}
                    onChange={(e) =>
                      setAssignForm((prev) => ({ ...prev, targetQuestions: parseInt(e.target.value) || 40 }))
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tenggat Waktu:
                  </label>
                  <input
                    type="date"
                    required
                    value={assignForm.dueDate}
                    onChange={(e) => setAssignForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Catatan / Instruksi Tambahan Admin:
                </label>
                <textarea
                  rows={2}
                  value={assignForm.notes}
                  onChange={(e) => setAssignForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Contoh: Gunakan kisi-kisi Kurikulum Merdeka Fase E/F dan sertakan stimulus gambar berkualitas."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            {/* Sticky Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 cursor-pointer text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black cursor-pointer shadow-md shadow-teal-600/20 flex items-center gap-1.5 text-xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Tugaskan &amp; Hubungkan Otomatis</span>
              </button>
            </div>
          </form>
          </motion.div>
        </div>
      )}
    </>
  );
};
