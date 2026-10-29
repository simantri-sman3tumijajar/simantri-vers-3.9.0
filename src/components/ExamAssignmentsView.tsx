import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  GraduationCap,
  Plus,
  Trash2,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  FileQuestion,
  Layers,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TeacherExamAssignment } from '../types';

export const ExamAssignmentsView: React.FC = () => {
  const {
    state,
    saveTeacherExamAssignment,
    deleteTeacherExamAssignment,
    setCurrentView,
    showToast,
  } = useApp();

  const teacherAssignments = state.examManagement?.teacherAssignments || [];
  const teachers = state.teachers || [];
  const subjects = state.subjects || [];
  const classes = state.classes || [];

  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  const [assignForm, setAssignForm] = useState({
    id: '',
    teacherId: '',
    subjectName: '',
    category: 'ASAS' as TeacherExamAssignment['category'],
    targetClasses: [] as string[],
    dueDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    targetQuestions: 40,
    notes: '',
  });

  const assignmentsWithLiveProgress = useMemo(() => {
    const filtered = teacherAssignments.filter((asgn) => {
      const matchCat = categoryFilter === 'ALL' || asgn.category === categoryFilter;
      const matchSearch =
        (asgn.teacherName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (asgn.subjectName || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    return filtered.map((asgn) => {
      // Find assessments matching this assignment strictly
      let matched = (state.assessments || []).filter((asm) => asm.assignmentId && asm.assignmentId === asgn.id);

      if (matched.length === 0) {
        matched = (state.assessments || []).filter((asm) => {
          const isCategoryMatch = 
            (asgn.category === "Simulasi D'SMART Lampung" && asm.jenis === 'DSMART') ||
            ((asgn.category === "Seleksi OSN/Olimpiade" || asgn.category === "Olimpiade Sekolah") && asm.jenis === 'Olimpiade') ||
            (asgn.category === 'ASTS' && asm.jenis === 'ASTS' && (asm.mataPelajaran || '').toLowerCase().trim() === (asgn.subjectName || '').toLowerCase().trim()) ||
            (asgn.category === 'ASAS' && asm.jenis === 'ASAS' && (asm.mataPelajaran || '').toLowerCase().trim() === (asgn.subjectName || '').toLowerCase().trim());

          if (!isCategoryMatch) return false;

          const isTeacherMatch = 
            asm.guruId === asgn.teacherId ||
            (asgn.teacherName && (asm.guruPengampu || '').toLowerCase().trim() === asgn.teacherName.toLowerCase().trim());
          if (!isTeacherMatch) return false;

          if (asgn.createdAt && asm.createdAt) {
            const asmTime = new Date(asm.createdAt).getTime();
            const asgnTime = new Date(asgn.createdAt).getTime();
            if (asmTime < asgnTime - 2000) return false;
          } else if (asgn.createdAt && !asm.createdAt) {
            return false;
          }

          return true;
        });
      }

      // Pure data logic: if no assessment created yet, count is strictly 0
      const totalCrafted = matched.length > 0 
        ? matched.reduce((acc, curr) => {
            const mcq = curr.mcqQuestions?.length || 0;
            const essay = curr.essayRubrik?.length || 0;
            return acc + (curr.jenis === 'ASTS' ? essay : mcq);
          }, 0)
        : 0;

      const targetQ = asgn.targetQuestions || (asgn.category === "Simulasi D'SMART Lampung" ? 50 : asgn.category.includes('Olimpiade') ? 30 : asgn.category === 'ASTS' ? 10 : 40);
      const progressPercent = Math.min(100, Math.round((totalCrafted / targetQ) * 100));

      const autoStatus: 'Belum Digarap' | 'Sedang Digarap' | 'Selesai Digarap' = 
        progressPercent >= 100 
          ? 'Selesai Digarap' 
          : (progressPercent > 0 ? 'Sedang Digarap' : 'Belum Digarap');

      return {
        ...asgn,
        liveCount: totalCrafted,
        targetQuestions: targetQ,
        progressPercent,
        autoStatus,
      };
    });
  }, [teacherAssignments, categoryFilter, searchQuery, state.assessments]);

  const handleSaveAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.teacherId || !assignForm.subjectName) {
      showToast('Form Belum Lengkap', 'Pilih Guru dan Mata Pelajaran.', 'warning');
      return;
    }

    const selectedTeacher = teachers.find((t) => t.id === assignForm.teacherId);
    const targetQ =
      Number(assignForm.targetQuestions) ||
      (assignForm.category === "Simulasi D'SMART Lampung"
        ? 50
        : assignForm.category.includes('Olimpiade')
        ? 30
        : assignForm.category === 'ASTS'
        ? 10
        : 40);

    const newAssignment: TeacherExamAssignment = {
      id: assignForm.id || `asgn-${Date.now()}`,
      teacherId: assignForm.teacherId,
      teacherName: selectedTeacher?.nama || 'Guru Pengampu',
      subjectName: assignForm.subjectName,
      category: assignForm.category,
      targetClasses: assignForm.targetClasses.length > 0 ? assignForm.targetClasses : ['Semua Kelas'],
      dueDate: assignForm.dueDate,
      targetQuestions: targetQ,
      currentQuestionsCount: 0,
      status: 'Belum Digarap',
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
    showToast('Penugasan Disimpan', 'Penugasan pembuatan soal berhasil diterbitkan ke guru pengampu dengan progres awal 0%.', 'success');
  };

  const handleClassToggle = (className: string) => {
    setAssignForm((prev) => {
      const exists = prev.targetClasses.includes(className);
      const updated = exists
        ? prev.targetClasses.filter((c) => c !== className)
        : [...prev.targetClasses, className];
      return { ...prev, targetClasses: updated };
    });
  };

  return (
    <div className="space-y-6 pb-12 selection:bg-teal-600 selection:text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-teal-100 text-teal-800">
              <GraduationCap className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[11px] font-black uppercase text-teal-800 tracking-wider block">
                Penyusunan Bank Soal &bull; Plotting Penggarap
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Penugasan Guru Mapel Soal CBT
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-2xl mt-1">
            Plotting dan pemantauan penugasan guru mata pelajaran untuk menyusun butir soal ASAS, ASTS, Simulasi D&apos;SMART Lampung (50 Soal PG HOTS), hingga seleksi olimpiade sekolah.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => setIsAssignModalOpen(true)}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Penugasan Guru</span>
        </button>
      </div>

      {/* Toolbar Filter */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600">Kategori Ujian:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="ALL">Semua Kategori ({teacherAssignments.length})</option>
              <option value="ASAS">ASAS (Akhir Semester)</option>
              <option value="ASTS">ASTS (Tengah Semester)</option>
              <option value="Simulasi D'SMART Lampung">Simulasi D&apos;SMART Lampung (50 Soal HOTS)</option>
              <option value="Simulasi CBT">Simulasi CBT</option>
              <option value="Seleksi OSN/Olimpiade">Seleksi OSN / Olimpiade</option>
              <option value="Remedial/Susulan">Remedial / Susulan</option>
            </select>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari guru atau mata pelajaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <span className="text-[11px] font-bold text-slate-500 self-end sm:self-auto">
          Total Penugasan: <strong className="text-teal-700">{assignmentsWithLiveProgress.length}</strong> Guru
        </span>
      </div>

      {/* Table Penugasan Guru */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-100/80 text-slate-800 font-extrabold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3.5">Guru Pengampu</th>
                <th className="p-3.5">Mata Pelajaran</th>
                <th className="p-3.5">Kategori Ujian</th>
                <th className="p-3.5">Target Kelas</th>
                <th className="p-3.5 text-center">Progres Butir Soal</th>
                <th className="p-3.5">Tenggat Waktu</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {assignmentsWithLiveProgress.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    Belum ada penugasan guru penggarap soal pada kategori ini. Klik &quot;Tambah Penugasan Guru&quot; untuk memulai.
                  </td>
                </tr>
              ) : (
                assignmentsWithLiveProgress.map((asgn) => (
                  <tr key={asgn.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-xs shrink-0">
                          {asgn.teacherName ? asgn.teacherName.charAt(0) : 'G'}
                        </div>
                        <div>
                          <strong className="text-slate-900 block font-black">{asgn.teacherName}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">Pendidik SMAN 3</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-indigo-700">{asgn.subjectName}</td>
                    <td className="p-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-teal-100 text-teal-900 border border-teal-300">
                        {asgn.category}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <span className="text-[11px] font-bold text-slate-700">
                        {Array.isArray(asgn.targetClasses) ? asgn.targetClasses.join(', ') : asgn.targetClasses}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="font-black text-slate-900">
                        {asgn.liveCount} / {asgn.targetQuestions} Soal
                        <span className="text-slate-500 font-bold ml-1">({asgn.progressPercent}%)</span>
                      </div>
                      <div className="w-28 mx-auto bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            asgn.progressPercent >= 100
                              ? 'bg-emerald-500'
                              : asgn.progressPercent > 0
                              ? 'bg-amber-500'
                              : 'bg-slate-300'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(asgn.progressPercent > 0 ? 5 : 0, asgn.progressPercent))}%` }}
                        />
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-600">{asgn.dueDate}</td>
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          asgn.autoStatus === 'Selesai Digarap'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : asgn.autoStatus === 'Sedang Digarap'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}
                      >
                        {asgn.autoStatus === 'Selesai Digarap' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        ) : asgn.autoStatus === 'Sedang Digarap' ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        ) : (
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        )}
                        <span>{asgn.autoStatus}</span>
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => deleteTeacherExamAssignment(asgn.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

      {/* Modal Tambah Penugasan Guru */}
      <AnimatePresence>
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-6 pb-4 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Tambah Penugasan Penggarap Soal</h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Tugaskan guru mata pelajaran untuk menyusun butir soal ujian
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs cursor-pointer"
                >
                  Batal
                </button>
              </div>

              <form onSubmit={handleSaveAssignment} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0 overscroll-contain">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Guru Pengampu:</label>
                    <select
                      required
                      value={assignForm.teacherId}
                      onChange={(e) => {
                        const t = teachers.find((tch) => tch.id === e.target.value);
                        setAssignForm({
                          ...assignForm,
                          teacherId: e.target.value,
                          subjectName: t && t.mataPelajaran && t.mataPelajaran.length > 0 ? t.mataPelajaran[0] : assignForm.subjectName,
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    >
                      <option value="">Pilih Guru Pengampu...</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.nama}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-bold text-slate-700">Mata Pelajaran:</label>
                      {assignForm.category === "Simulasi D'SMART Lampung" && (
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Dinonaktifkan Otomatis
                        </span>
                      )}
                    </div>
                    <select
                      required
                      disabled={assignForm.category === "Simulasi D'SMART Lampung"}
                      value={assignForm.subjectName}
                      onChange={(e) => setAssignForm({ ...assignForm, subjectName: e.target.value })}
                      className={`w-full px-3.5 py-2.5 rounded-xl font-bold transition-all ${
                        assignForm.category === "Simulasi D'SMART Lampung"
                          ? 'bg-emerald-50 border border-emerald-300 text-emerald-950 cursor-not-allowed shadow-inner'
                          : 'bg-slate-50 border border-slate-200 text-slate-900'
                      }`}
                    >
                      <option value="">Pilih Mata Pelajaran...</option>
                      {assignForm.category === "Simulasi D'SMART Lampung" && (
                        <option value="Simulasi D'SMART Lampung (4 Instrumen Utama)">
                          Simulasi D&apos;SMART Lampung (4 Instrumen Utama: Literasi, Numerasi, Pra Kampus, Karakter)
                        </option>
                      )}
                      {subjects.map((sub) => (
                        <option key={sub.id} value={sub.nama}>
                          {sub.nama}
                        </option>
                      ))}
                    </select>
                    {assignForm.category === "Simulasi D'SMART Lampung" && (
                      <p className="mt-1 text-[10.5px] text-emerald-700 font-medium">
                        *Mapel dinonaktifkan otomatis: terikat langsung ke 4 instrumen D&apos;SMART (Literasi, Numerasi, Pra Kampus &amp; Karakter).
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Kategori Ujian:</label>
                    <select
                      value={assignForm.category}
                      onChange={(e) => {
                        const val = e.target.value as TeacherExamAssignment['category'];
                        const isDSmart = val === "Simulasi D'SMART Lampung";
                        const isOlimpiade = val === "Seleksi OSN/Olimpiade";
                        const isASTS = val === "ASTS";
                        setAssignForm({
                          ...assignForm,
                          category: val,
                          targetQuestions: isDSmart ? 50 : isOlimpiade ? 30 : isASTS ? 10 : 40,
                          subjectName: isDSmart ? "Simulasi D'SMART Lampung (4 Instrumen Utama)" : (assignForm.subjectName.includes("D'SMART") ? '' : assignForm.subjectName),
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    >
                      <option value="ASAS">ASAS (Asesmen Sumatif Akhir Semester)</option>
                      <option value="ASTS">ASTS (Asesmen Sumatif Tengah Semester)</option>
                      <option value="Simulasi D'SMART Lampung">Simulasi D&apos;SMART Lampung (50 Soal PG HOTS)</option>
                      <option value="Simulasi CBT">Simulasi CBT</option>
                      <option value="Seleksi OSN/Olimpiade">Seleksi OSN / Olimpiade</option>
                      <option value="Remedial/Susulan">Remedial / Susulan</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Jumlah Butir Soal:</label>
                    <input
                      type="number"
                      required
                      min={5}
                      max={100}
                      value={assignForm.targetQuestions}
                      onChange={(e) => setAssignForm({ ...assignForm, targetQuestions: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tenggat Waktu Penggarapan:</label>
                  <input
                    type="date"
                    required
                    value={assignForm.dueDate}
                    onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
                  />
                </div>

                {/* Pilih Target Kelas */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Target Kelas Sasaran:
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {classes.map((cls) => {
                      const selected = assignForm.targetClasses.includes(cls.nama);
                      return (
                        <button
                          key={cls.id}
                          type="button"
                          onClick={() => handleClassToggle(cls.nama)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            selected
                              ? 'bg-teal-600 text-white'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cls.nama}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Catatan Khusus / Kisi-kisi:</label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Soal berorientasi Deep Learning & HOTS, 5 opsi pilihan ganda..."
                    value={assignForm.notes}
                    onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-black shadow-md cursor-pointer"
                  >
                    Simpan Penugasan
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
