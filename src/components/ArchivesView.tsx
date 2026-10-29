import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { ArchivedState, Assessment, Student } from '../types';
import {
  Archive,
  Plus,
  Calendar,
  User,
  Trash2,
  Eye,
  Download,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  Clock,
  Award,
  Users,
  Search,
  BookOpen,
  ArrowUpDown,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportRaportToPDF } from '../utils/pdfExport';
import { exportRaportToExcel } from '../utils/excelExport';
import { isClassMatch, getAssessmentClassesList } from '../utils/classHelper';

export const ArchivesView: React.FC = () => {
  const { state, currentUser, createManualArchive, deleteArchive, showToast } = useApp();
  const { t } = useLanguage();

  const [selectedArchiveId, setSelectedArchiveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'raport' | 'roster' | 'assessments'>('raport');
  const [archiving, setArchiving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Read-only inspection state for selected archive
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubClass, setSelectedSubClass] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  if (!state || !currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const archivesList = state.archives || [];

  const activeArchive = useMemo(() => {
    if (!selectedArchiveId) return null;
    return archivesList.find((a) => a.id === selectedArchiveId) || null;
  }, [selectedArchiveId, archivesList]);

  // Assessments in active archive
  const archivedAssessments = useMemo(() => {
    if (!activeArchive) return [];
    return activeArchive.assessments || [];
  }, [activeArchive]);

  // Selected assessment inside the selected archive
  const activeAssessment = useMemo(() => {
    if (!activeArchive || archivedAssessments.length === 0) return null;
    const found = archivedAssessments.find((a) => a.id === selectedAssessmentId);
    return found || archivedAssessments[0];
  }, [archivedAssessments, selectedAssessmentId, activeArchive]);

  // Subclasses inside the active archived assessment
  const activeAssessmentClasses = useMemo(() => {
    if (!activeAssessment) return [];
    return getAssessmentClassesList(activeAssessment.kelas);
  }, [activeAssessment]);

  // Sync subclasses
  React.useEffect(() => {
    if (activeAssessmentClasses.length > 0) {
      setSelectedSubClass(activeAssessmentClasses[0]);
    } else {
      setSelectedSubClass('ALL');
    }
  }, [activeAssessmentClasses]);

  // Sync selected assessment ID when active archive changes
  React.useEffect(() => {
    if (archivedAssessments.length > 0) {
      setSelectedAssessmentId(archivedAssessments[0].id);
    } else {
      setSelectedAssessmentId('');
    }
  }, [archivedAssessments]);

  // Students in active archive matching assessment classes
  const allArchiveStudents = useMemo(() => {
    if (!activeArchive || !activeAssessment) return [];
    const all = (activeArchive.students || []).filter((s) => isClassMatch(activeAssessment.kelas, s.kelas));
    if (activeAssessment.studentIds && activeAssessment.studentIds.length > 0) {
      const pSet = new Set(activeAssessment.studentIds);
      const filteredBySet = all.filter((s) => pSet.has(s.id));
      if (filteredBySet.length > 0) {
        return filteredBySet.sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));
      }
    }
    return all.sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));
  }, [activeArchive, activeAssessment]);

  // Display-filtered class students based on selected sub-class filter
  const classStudents = useMemo(() => {
    if (!activeArchive || !activeAssessment) return [];
    const targetClass = selectedSubClass && selectedSubClass !== 'ALL' ? selectedSubClass : activeAssessment.kelas;
    const all = (activeArchive.students || []).filter((s) => isClassMatch(targetClass, s.kelas));
    if (activeAssessment.studentIds && activeAssessment.studentIds.length > 0) {
      const pSet = new Set(activeAssessment.studentIds);
      const filteredBySet = all.filter((s) => pSet.has(s.id));
      if (filteredBySet.length > 0) {
        return filteredBySet.sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));
      }
    }
    return all.sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));
  }, [activeArchive, activeAssessment, selectedSubClass]);

  const handleCreateArchive = async () => {
    setArchiving(true);
    await createManualArchive();
    setArchiving(false);
  };

  const handleDeleteArchive = async () => {
    if (!deleteConfirmId) return;
    await deleteArchive(deleteConfirmId);
    if (selectedArchiveId === deleteConfirmId) {
      setSelectedArchiveId(null);
    }
    setDeleteConfirmId(null);
  };

  const handleExportPDF = async () => {
    if (!activeAssessment || !activeArchive) return;
    await exportRaportToPDF(activeAssessment, activeArchive.schoolInfo, classStudents, selectedSubClass);
    showToast('Ekspor PDF Berhasil', 'Dokumen resmi arsip (Times New Roman) siap dicetak.', 'success');
  };

  const handleExportExcel = async () => {
    if (!activeAssessment || !activeArchive) return;
    await exportRaportToExcel(activeAssessment, activeArchive.schoolInfo, classStudents, selectedSubClass);
    showToast('Ekspor Excel Berhasil', 'File Nilai Raport arsip telah diunduh.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3.5 rounded-2xl bg-indigo-50 text-indigo-600">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Arsip Semester & Tahun Ajaran</h2>
            <p className="text-xs text-slate-500">Akses dan ekspor rekapitulasi data akademik dari masa lampau secara terarsip.</p>
          </div>
        </div>

        {isAdmin && (
          <button
            onClick={handleCreateArchive}
            disabled={archiving}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
          >
            {archiving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            <span>Buat Arsip Semester Sekarang</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Archive List (3 cols or full if none selected) */}
        <div className={`lg:col-span-4 space-y-4 ${selectedArchiveId ? '' : 'lg:col-span-12'}`}>
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Daftar Arsip Tersimpan</h3>

            {archivesList.length === 0 ? (
              <div className="text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 space-y-2">
                <Archive className="w-8 h-8 mx-auto opacity-40 text-slate-500" />
                <p className="text-xs font-medium">Belum ada arsip semester/tahun ajaran yang disimpan.</p>
                <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Arsip otomatis dibuat ketika Administrator mengganti Tahun Ajaran Aktif atau Semester Aktif di menu Pengaturan Sekolah.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {archivesList.map((arch) => {
                  const isSelected = selectedArchiveId === arch.id;
                  return (
                    <div
                      key={arch.id}
                      onClick={() => setSelectedArchiveId(arch.id)}
                      className={`group p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-50/80 border-indigo-200 shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2.5 rounded-xl ${isSelected ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                          <Calendar className="w-4.5 h-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors truncate">
                            T.P {arch.tahunAjaran} — {arch.semester}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />
                              {new Date(arch.archivedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 truncate">
                              <User className="w-3 h-3" />
                              {arch.archivedBy}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isAdmin && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirmId(arch.id);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Hapus Arsip ini"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300 group-hover:translate-x-0.5'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Archive Inspection Dashboard (8 cols, only shows if an archive is selected) */}
        {activeArchive ? (
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-6">
              {/* Active Archive Info Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <span className="px-2.5 py-0.5 text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 rounded-full">
                    Inspeksi Data Terarsip
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mt-1">
                    Tahun Ajaran {activeArchive.tahunAjaran} — Semester {activeArchive.semester}
                  </h3>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5 bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100/60 font-semibold text-indigo-700">
                    <Award className="w-4 h-4" />
                    <span>{archivedAssessments.length} Asesmen</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-emerald-50/50 px-3 py-1.5 rounded-xl border border-emerald-100/60 font-semibold text-emerald-700">
                    <Users className="w-4 h-4" />
                    <span>{(activeArchive.students || []).length} Siswa</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => setActiveTab('raport')}
                  className={`py-2.5 px-4 font-bold text-xs border-b-2 -mb-px transition-all flex items-center gap-1.5 ${
                    activeTab === 'raport'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Rapor STS Terarsip
                </button>
                <button
                  onClick={() => setActiveTab('roster')}
                  className={`py-2.5 px-4 font-bold text-xs border-b-2 -mb-px transition-all flex items-center gap-1.5 ${
                    activeTab === 'roster'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  Roster Nilai Ringkasan
                </button>
                <button
                  onClick={() => setActiveTab('assessments')}
                  className={`py-2.5 px-4 font-bold text-xs border-b-2 -mb-px transition-all flex items-center gap-1.5 ${
                    activeTab === 'assessments'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Daftar Soal & Struktur
                </button>
              </div>

              {/* Tab Contents */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-5"
                >
                  {/* TAB 1: Rapor STS & SAS Terarsip */}
                  {activeTab === 'raport' && (
                    <div className="space-y-4">
                      {archivedAssessments.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/80">
                          Tidak ada data asesmen dalam arsip semester ini.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Selector Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Asesmen Resmi</label>
                              <select
                                value={selectedAssessmentId}
                                onChange={(e) => setSelectedAssessmentId(e.target.value)}
                                className="w-full p-2 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                              >
                                {archivedAssessments.map((a) => (
                                  <option key={a.id} value={a.id}>
                                    [{a.jenis}] {a.mataPelajaran} — Kelas {a.kelas}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {activeAssessmentClasses.length > 1 && (
                              <div>
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pilih Kelas Spasial</label>
                                <div className="flex flex-wrap gap-1">
                                  {activeAssessmentClasses.map((cls) => (
                                    <button
                                      key={cls}
                                      onClick={() => setSelectedSubClass(cls)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                        selectedSubClass === cls
                                          ? 'bg-indigo-600 text-white'
                                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                                      }`}
                                    >
                                      Kelas {cls}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Action Buttons for report */}
                          {activeAssessment && (
                            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                              <div className="text-xs">
                                <p className="font-extrabold text-slate-900">Unduh Hasil Resmi Masa Lampau</p>
                                <p className="text-[10px] text-slate-500">Mencetak rekapitulasi penilaian resmi semester {activeArchive.semester} {activeArchive.tahunAjaran}.</p>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={handleExportExcel}
                                  className="px-3 py-2 bg-white hover:bg-slate-100 text-emerald-700 font-extrabold text-xs rounded-xl border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                  <span>Unduh (.xlsx)</span>
                                </button>
                                <button
                                  onClick={handleExportPDF}
                                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span>Cetak PDF Resmi</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Student score matrix screen preview */}
                          {activeAssessment && (
                            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                              <table className="w-full border-collapse text-left text-xs text-slate-800">
                                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-700">
                                  <tr>
                                    <th className="py-2.5 px-3 w-12 text-center">No</th>
                                    <th className="py-2.5 px-3">Nama Siswa</th>
                                    <th className="py-2.5 px-3">NISN</th>
                                    <th className="py-2.5 px-3 w-20 text-center">Nilai</th>
                                    <th className="py-2.5 px-3 text-center">Status</th>
                                    <th className="py-2.5 px-3">Capaian Kompetensi</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {classStudents.map((std, i) => {
                                    const sub = activeAssessment.submissions?.find((s) => s.studentId === std.id);
                                    return (
                                      <tr key={std.id} className="hover:bg-slate-50/50">
                                        <td className="py-2.5 px-3 text-center text-slate-400">{i + 1}</td>
                                        <td className="py-2.5 px-3 font-semibold text-slate-900">{std.nama}</td>
                                        <td className="py-2.5 px-3 font-mono text-slate-500">{std.nisn || '-'}</td>
                                        <td className="py-2.5 px-3 text-center font-bold text-slate-900">
                                          {sub?.nilaiAkhir !== undefined ? sub.nilaiAkhir : '-'}
                                        </td>
                                        <td className="py-2.5 px-3 text-center">
                                          {sub ? (
                                            sub.nilaiAkhir >= (activeAssessment.kktp || 75) ? (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">Tuntas</span>
                                            ) : (
                                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">Tidak</span>
                                            )
                                          ) : (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">Belum</span>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-600 text-[10px] leading-relaxed truncate max-w-xs" title={sub?.capaianKompetensi}>
                                          {sub?.capaianKompetensi || '-'}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: Roster Nilai Ringkasan */}
                  {activeTab === 'roster' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 text-amber-900 flex gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                        <div className="text-xs space-y-1">
                          <p className="font-bold">Mode Tinjauan Roster Arsip</p>
                          <p className="leading-relaxed">
                            Roster ini adalah representasi kumulatif nilai siswa untuk semester {activeArchive.semester} {activeArchive.tahunAjaran}. Seluruh data diarsipkan secara permanen dan dalam format *baca-saja (read-only)* untuk menjaga orisinalitas kelulusan dan kenaikan kelas.
                          </p>
                        </div>
                      </div>

                      {/* Display archive subjects structure */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-700">Daftar Nilai Kumulatif Per Mata Pelajaran</h4>
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {(activeArchive.subjects || []).map((sbj) => {
                            const related = archivedAssessments.filter((a) => a.mataPelajaran.toLowerCase() === sbj.nama.toLowerCase());
                            return (
                              <div key={sbj.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                                <div>
                                  <p className="font-bold text-slate-800 text-xs">{sbj.nama}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Kode: {sbj.kode} • KKM: {sbj.kktp}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                                    {related.length} Asesmen
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 3: Daftar Soal & Struktur */}
                  {activeTab === 'assessments' && (
                    <div className="space-y-4">
                      {archivedAssessments.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          Tidak ada instrumen soal yang diarsipkan.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {archivedAssessments.map((asm) => (
                            <div key={asm.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div>
                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${asm.jenis === 'ASTS' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'}`}>
                                  {asm.jenis}
                                </span>
                                <h4 className="text-xs font-bold text-slate-900 mt-1">{asm.judul}</h4>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Mapel: {asm.mataPelajaran} • KKM: {asm.kktp} • Jumlah Soal: {asm.jumlahSoal}
                                </p>
                              </div>

                              <div className="text-right text-[10px] text-slate-500 font-semibold shrink-0">
                                {asm.guruPengampu || 'Guru Utama'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        ) : (
          archivesList.length > 0 && (
            <div className="lg:col-span-8 flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-3 shadow-xs">
              <Archive className="w-12 h-12 text-slate-300 stroke-1" />
              <div className="text-center">
                <p className="text-sm font-bold text-slate-800">Pilih Arsip Semester</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">Select any archived period from the left menu to inspect grade rosters, print documents or download excel tables.</p>
              </div>
            </div>
          )
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 p-6 max-w-sm w-full text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-900 text-sm">Hapus Arsip Semester?</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Tindakan ini tidak dapat dibatalkan. Seluruh rekapitulasi nilai dan instrumen yang diarsipkan akan dihapus secara permanen.
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
                >
                  Batal
                </button>
                <button
                  onClick={handleDeleteArchive}
                  className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
                >
                  Ya, Hapus Permanen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
