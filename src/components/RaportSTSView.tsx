import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Assessment, Submission } from '../types';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Edit2,
  Trash2,
  Save,
  CheckCircle2,
  Sparkles,
  Share2,
  Loader2,
  RefreshCw,
  Award,
  Users,
  Target,
  GraduationCap,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { exportRaportToExcel } from '../utils/excelExport';
import { exportRaportToPDF } from '../utils/pdfExport';
import { exportRaportToWord } from '../utils/wordExport';
import { sanitizeCapaianKompetensi, generateBloomDeepLearningCK } from '../utils/capaianKompetensi';
import { getCorrectionDateFormatted } from '../utils/dateUtils';
import { formatAcademicTitles, getKKTPKategori } from '../utils/kktpHelper';
import { isClassMatch, getAssessmentClassesList, getSemesterNumber } from '../utils/classHelper';
import { DriveRedirectModal } from './DriveRedirectModal';
import { AuthenticProofModal } from './AuthenticProofModal';
import { UploadRaporSTSModal } from './UploadRaporSTSModal';
import { PaginationControls } from './PaginationControls';
import { FolderOpen, ExternalLink, ShieldCheck, UploadCloud } from 'lucide-react';

export const RaportSTSView: React.FC = () => {
  const { state, currentUser, selectedAssessmentId, setSelectedAssessmentId, saveAssessment, deleteSubmission, showToast } = useApp();

  // Editable Capaian Kompetensi Modal State
  const [editingSub, setEditingSub] = useState<{
    studentId: string;
    studentName: string;
    nilaiAkhir: number;
    capaianKompetensi: string;
  } | null>(null);
  const [selectedProofSub, setSelectedProofSub] = useState<{ submission: Submission; student: any } | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isUploadSTSModalOpen, setIsUploadSTSModalOpen] = useState(false);

  if (!state || !currentUser) return null;

  const isAdmin = currentUser.role === 'admin';

  // Available assessments strictly filtered by Admin-managed teacher subjects with double-lookup
  const assignedSubjects = useMemo(() => {
    const subs = new Set<string>();
    if (Array.isArray(currentUser.mataPelajaran)) {
      currentUser.mataPelajaran.forEach((m) => subs.add(m.toLowerCase().trim()));
    }
    if (Array.isArray(state.subjects)) {
      state.subjects.forEach((sbj) => {
        if (
          sbj.guruAssignments?.some(
            (ga) =>
              ga.teacherId === currentUser.id ||
              ga.teacherName.toLowerCase().trim() === currentUser.nama.toLowerCase().trim()
          )
        ) {
          subs.add(sbj.nama.toLowerCase().trim());
        }
      });
    }
    return Array.from(subs);
  }, [currentUser, state.subjects]);

  const baseAssessments = useMemo(() => {
    const periodAssessments = state.assessments.filter((a) => {
      // Filter strictly by active school year and semester
      if (a.tahunAjaran !== state.schoolInfo.tahunAjaranAktif || a.semester !== state.schoolInfo.semesterAktif) {
        return false;
      }
      if (isAdmin) return true;
      if (assignedSubjects.includes('semua mata pelajaran')) return true;
      return assignedSubjects.includes(a.mataPelajaran.toLowerCase().trim());
    });

    // Khusus untuk Rapor STS (Rapor Bayangan): Prioritaskan dan saring asesmen ASTS / STS
    const stsOnly = periodAssessments.filter((a) => a.jenis === 'ASTS');
    return stsOnly.length > 0 ? stsOnly : periodAssessments;
  }, [state.assessments, state.schoolInfo, isAdmin, assignedSubjects]);

  const flattenedOptions = useMemo(() => {
    const list: Array<{ assessment: Assessment; subClass: string; key: string }> = [];
    baseAssessments.forEach((a) => {
      const classes = getAssessmentClassesList(a.kelas);
      classes.forEach((cls) => {
        list.push({
          assessment: a,
          subClass: cls,
          key: `${a.id}:::${cls}`,
        });
      });
    });
    return list;
  }, [baseAssessments]);

  const [selectedOptionKey, setSelectedOptionKey] = useState<string>('');

  const activeOption = useMemo(() => {
    if (selectedOptionKey) {
      const found = flattenedOptions.find((o) => o.key === selectedOptionKey);
      if (found) return found;
    }
    if (selectedAssessmentId) {
      const found = flattenedOptions.find((o) => o.assessment.id === selectedAssessmentId);
      if (found) return found;
    }
    return flattenedOptions[0] || null;
  }, [flattenedOptions, selectedOptionKey, selectedAssessmentId]);

  const activeAssessment = activeOption?.assessment || null;
  const selectedSubClass = activeOption?.subClass || '';

  React.useEffect(() => {
    if (activeOption && selectedAssessmentId !== activeOption.assessment.id) {
      setSelectedAssessmentId(activeOption.assessment.id);
    }
  }, [activeOption, selectedAssessmentId, setSelectedAssessmentId]);

  // Single class students selection (this applies to screen, Excel and PDF exports!)
  const classStudents = useMemo(() => {
    if (!activeAssessment || !selectedSubClass) return [];
    const all = state.students.filter((s) => isClassMatch(selectedSubClass, s.kelas));
    if (activeAssessment.studentIds && activeAssessment.studentIds.length > 0) {
      const pSet = new Set(activeAssessment.studentIds);
      const filteredBySet = all.filter((s) => pSet.has(s.id));
      if (filteredBySet.length > 0) {
        return filteredBySet.sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));
      }
    }
    return all.sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));
  }, [state.students, activeAssessment, selectedSubClass]);

  // Pagination State (Tampilan Maksimal 10, 25, 50, 100, Semua Data)
  const [raportPage, setRaportPage] = useState<number>(1);
  const [raportPageSize, setRaportPageSize] = useState<number>(25);

  React.useEffect(() => {
    setRaportPage(1);
  }, [selectedOptionKey, selectedAssessmentId]);

  const isRaportAll = raportPageSize === -1 || raportPageSize >= classStudents.length;
  const totalRaportPages = isRaportAll ? 1 : Math.ceil(classStudents.length / raportPageSize) || 1;
  const safeRaportPage = isRaportAll ? 1 : Math.min(Math.max(1, raportPage), totalRaportPages);
  const paginatedClassStudents = useMemo(() => {
    if (isRaportAll) return classStudents;
    const start = (safeRaportPage - 1) * raportPageSize;
    return classStudents.slice(start, start + raportPageSize);
  }, [classStudents, safeRaportPage, raportPageSize, isRaportAll]);

  const handleExportExcel = async () => {
    if (!activeAssessment || !state?.schoolInfo) return;
    await exportRaportToExcel(activeAssessment, state.schoolInfo, classStudents, selectedSubClass);
    showToast('Ekspor Excel Berhasil', `File Nilai Rapor ${activeAssessment.jenis} Kelas ${selectedSubClass} telah diunduh.`, 'success');
  };

  const handleExportWord = async () => {
    if (!activeAssessment || !state?.schoolInfo) return;
    await exportRaportToWord(activeAssessment, state.schoolInfo, classStudents, selectedSubClass);
    showToast('Ekspor Word Berhasil', `File Nilai Rapor ${activeAssessment.jenis} Kelas ${selectedSubClass} telah diunduh (.doc).`, 'success');
  };

  const handleExportPDF = async () => {
    if (!activeAssessment || !state?.schoolInfo) return;
    await exportRaportToPDF(activeAssessment, state.schoolInfo, classStudents, selectedSubClass);
    showToast('Ekspor PDF Berhasil', `Dokumen resmi Rapor Kelas ${selectedSubClass} (Times New Roman) siap dicetak.`, 'success');
  };

  const handleSaveEditedSub = async () => {
    if (!editingSub || !activeAssessment) return;

    let subs = [...(activeAssessment.submissions || [])];
    const idx = subs.findIndex((s) => s.studentId === editingSub.studentId || s.studentName === editingSub.studentName);

    const isTuntas = Number(editingSub.nilaiAkhir) >= (activeAssessment.kktp || 75);
    const sanitizedCK = sanitizeCapaianKompetensi(
      editingSub.capaianKompetensi,
      editingSub.studentName,
      isTuntas,
      activeAssessment.mataPelajaran
    );

    const updatedSub: Submission = {
      id: idx >= 0 ? subs[idx].id : `sub-${Date.now()}`,
      studentId: editingSub.studentId,
      studentName: editingSub.studentName,
      nisn: '008741201',
      kelas: activeAssessment.kelas,
      nilaiAkhir: Number(editingSub.nilaiAkhir),
      tuntas: isTuntas,
      statusKoreksi: 'Sudah Diverifikasi Guru',
      waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
      capaianKompetensi: sanitizedCK,
    };

    if (idx >= 0) {
      subs[idx] = updatedSub;
    } else {
      subs.push(updatedSub);
    }

    const studentName = editingSub.studentName;
    setEditingSub(null);
    showToast('Tersimpan', `Nilai dan capaian kompetensi ${studentName} berhasil diperbarui.`, 'success');
    saveAssessment({ ...activeAssessment, submissions: subs });
  };

  const handleDeleteSub = async (studentId: string, studentName: string) => {
    if (!activeAssessment) return;
    await deleteSubmission(activeAssessment.id, studentId);
  };

  if (!activeAssessment) {
    return (
      <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
        <FileSpreadsheet className="w-12 h-12 text-slate-400 mx-auto mb-3" />
        <h3 className="font-bold text-base text-slate-800">Pilih Modul Asesmen</h3>
        <p className="text-xs text-slate-500 mt-1">Belum ada modul asesmen yang dipilih untuk ditampilkan dalam raport.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-md font-extrabold text-[10px] uppercase bg-indigo-100 text-indigo-800">
                RAPOR BAYANGAN STS (SUMATIF TENGAH SEMESTER)
              </span>
              <span className="text-xs font-bold text-slate-700">
                Kelas {activeAssessment.kelas} • {activeAssessment.fase}
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Rapor Bayangan STS: {activeAssessment.mataPelajaran}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Format resmi Rapor Bayangan / Sisipan Tengah Semester SMAN 3 Tumijajar dengan capaian kompetensi
            </p>
          </div>

          {/* Quick Upload Primary Action */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              type="button"
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsUploadSTSModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 transition-all cursor-pointer ring-1 ring-indigo-400"
              title="Unggah file Excel nilai rapor STS, SAS, formatif, atau SLM dan langsung sinkronkan ke Daftar Nilai & Rapor"
            >
              <UploadCloud className="w-4 h-4 text-sky-200" />
              <span>Upload Daftar Nilai &amp; Rapor</span>
            </motion.button>
          </div>
        </div>

        {/* Structured 2nd Tier Action Buttons (Tersusun Rapi di Bawah) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <span className="text-xs font-bold text-slate-600 shrink-0">Pilih Modul:</span>
            <select
              value={activeOption?.key || ''}
              onChange={(e) => setSelectedOptionKey(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden w-full max-w-sm"
            >
              {flattenedOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  [{opt.assessment.jenis}] {opt.assessment.mataPelajaran} - Kelas {opt.subClass}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Google Drive Tab Redirect Button */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setIsDriveModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 font-extrabold text-xs shadow-xs transition-all cursor-pointer"
              title="Buka Folder Google Drive Raport di Tab Baru"
            >
              <FolderOpen className="w-4 h-4 text-indigo-600" />
              <span>Folder Drive {activeAssessment?.jenis || 'STS'}</span>
              <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
            </motion.button>

            {/* Export to Excel */}
            <motion.button
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Excel (.xlsx)</span>
            </motion.button>

            {/* Export to Word */}
            <motion.button
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportWord}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Ekspor Word (.doc)</span>
            </motion.button>

            {/* Export to PDF */}
            <motion.button
              type="button"
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all duration-200"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>Cetak PDF Resmi</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Official Raport Document Sheet (Rendered exactly like sample PDF) */}
      <div className="p-6 sm:p-10 rounded-3xl bg-white border border-slate-300 shadow-lg font-tnr text-black">
        {/* Title */}
        <div className="text-center font-bold text-sm sm:text-base tracking-wide mb-6 uppercase">
          NILAI RAPORT {activeAssessment.jenis} KELAS {selectedSubClass || activeAssessment.kelas} SEMESTER {getSemesterNumber(selectedSubClass || activeAssessment.kelas, activeAssessment.semester)} T.A {activeAssessment.tahunAjaran}
        </div>

        {/* Metadata */}
        <div className="flex justify-between items-center text-xs sm:text-sm font-normal mb-1">
          <div>
            <span>KELAS : </span>
            <strong className="font-bold">{selectedSubClass || activeAssessment.kelas}</strong>
          </div>
          <div className="font-bold">
            {activeAssessment.fase.toUpperCase()}
          </div>
        </div>
        <div className="text-xs sm:text-sm font-normal mb-4">
          <span>MAPEL : </span>
          <strong className="font-bold">{activeAssessment.mataPelajaran}</strong>
        </div>

        {/* Table matching PDF style */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-black text-xs sm:text-sm">
            <thead>
              <tr className="bg-[#64d2ff] text-black font-bold text-center border-b border-black">
                <th className="border border-black py-2 px-2 w-12">NO</th>
                <th className="border border-black py-2 px-4 text-left w-64">NAMA</th>
                <th className="border border-black py-2 px-3 w-28">NILAI AKHIR</th>
                <th className="border border-black py-2 px-4 text-left">CAPAIAN KOMPETENSI</th>
                <th className="border border-black py-2 px-2 w-28 text-center no-print">BUKTI OTENTIK</th>
                <th className="border border-black py-2 px-2 w-14 no-print">EDIT</th>
              </tr>
            </thead>
            <tbody>
              {paginatedClassStudents.map((std, idx) => {
                const sub = activeAssessment.submissions.find(
                  (s) => s.studentId === std.id || s.studentName === std.nama
                );
                const realIndex = isRaportAll ? idx + 1 : (safeRaportPage - 1) * raportPageSize + idx + 1;

                const nilai = sub ? sub.nilaiAkhir : 0;
                const capaian = sub
                  ? sanitizeCapaianKompetensi(
                      sub.capaianKompetensi,
                      std.nama,
                      sub.tuntas,
                      activeAssessment.mataPelajaran,
                      nilai
                    )
                  : generateBloomDeepLearningCK(
                      0,
                      activeAssessment.kktp || 75,
                      activeAssessment.mataPelajaran
                    );

                return (
                  <tr key={std.id} className="hover:bg-slate-50 transition-colors">
                    <td className="border border-black py-2 px-2 text-center font-semibold">
                      {realIndex}
                    </td>
                    <td className="border border-black py-2 px-4 font-bold uppercase">
                      {std.nama}
                    </td>
                    <td className="border border-black py-2 px-3 text-center font-bold">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-base font-black">{nilai}</span>
                        {nilai > 0 && (() => {
                          const kktpInfo = getKKTPKategori(nilai);
                          return (
                            <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black border leading-none ${kktpInfo.badgeClass}`}>
                              {kktpInfo.kategori}
                            </span>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="border border-black py-2 px-4 text-justify leading-snug">
                      {capaian}
                    </td>
                    <td className="border border-black py-2 px-2 text-center no-print">
                      {sub ? (
                        <button
                          type="button"
                          onClick={() => setSelectedProofSub({ submission: sub, student: std })}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-extrabold border cursor-pointer transition-all ${
                            (sub.statusKoreksi?.includes('Draf') || sub.statusKoreksi?.includes('Draft')) && (!sub.nilaiAkhir || sub.nilaiAkhir === 0)
                              ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                          title="Buka Dokumen Resmi Bukti Otentik Lembar Jawaban & Rincian Butir"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{(sub.statusKoreksi?.includes('Draf') || sub.statusKoreksi?.includes('Draft')) && (!sub.nilaiAkhir || sub.nilaiAkhir === 0) ? 'Draf Sah' : 'Bukti Sah'}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Belum Ada</span>
                      )}
                    </td>
                    <td className="border border-black py-2 px-2 text-center no-print">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() =>
                            setEditingSub({
                              studentId: std.id,
                              studentName: std.nama,
                              nilaiAkhir: nilai,
                              capaianKompetensi: capaian,
                            })
                          }
                          className="p-1 text-slate-600 hover:text-indigo-600 rounded-md hover:bg-slate-100 cursor-pointer"
                          title="Sesuaikan Nilai & Capaian"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {sub && (
                          <button
                            onClick={() => handleDeleteSub(std.id, std.nama)}
                            className="p-1 text-rose-500 hover:text-rose-700 rounded-md hover:bg-rose-50 cursor-pointer"
                            title="Kosongkan Nilai Siswa Ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls (no-print) */}
        <div className="no-print mt-3">
          <PaginationControls
            currentPage={raportPage}
            totalPages={totalRaportPages}
            pageSize={raportPageSize}
            totalItems={classStudents.length}
            onPageChange={setRaportPage}
            onPageSizeChange={setRaportPageSize}
          />
        </div>

        {/* Footer Signature */}
        <div className="mt-8 flex justify-end">
          <div className="text-center text-xs sm:text-sm leading-tight pr-6">
            <p>Tumijajar, {getCorrectionDateFormatted(activeAssessment.submissions)}</p>
            <p className="mt-1 font-semibold">Guru Mapel</p>
            <div className="h-16" />
            <p className="font-bold underline">{formatAcademicTitles(activeAssessment.guruPengampu || 'Guru Mata Pelajaran')}</p>
          </div>
        </div>
      </div>

      {/* Edit Submission Modal */}
      <AnimatePresence>
        {editingSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-y-auto"
            >
              <h3 className="font-bold text-base text-slate-900 mb-1">
                Ubah Nilai & Capaian Raport: {editingSub.studentName}
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Penyesuaian capaian kompetensi sesuai dengan kaidah Pembelajaran Mendalam untuk buku raport
              </p>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nilai Akhir (0 - 100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editingSub.nilaiAkhir}
                    onChange={(e) =>
                      setEditingSub({ ...editingSub, nilaiAkhir: Number(e.target.value) })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-bold text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-semibold text-slate-700">
                      Narasi Capaian Kompetensi (Kaidah Taksonomi Bloom & KKTP)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const generated = generateBloomDeepLearningCK(
                          editingSub.nilaiAkhir,
                          activeAssessment.kktp || 75,
                          activeAssessment.mataPelajaran
                        );
                        setEditingSub({ ...editingSub, capaianKompetensi: generated });
                        showToast('Format Sesuai KKTP', 'Narasi diperbarui dengan formula awalan resmi KKTP tanpa nama.', 'info');
                      }}
                      className="inline-flex items-center gap-1 text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Format Otomatis Sesuai KKTP</span>
                    </button>
                  </div>
                  {(() => {
                    const kktpData = getKKTPKategori(editingSub.nilaiAkhir);
                    return (
                      <div className="mb-2 p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] flex items-center justify-between gap-2">
                        <span className="text-slate-600">
                          Rentang KKTP: <strong className="text-slate-900">{kktpData.rentang} ({kktpData.kategori})</strong>
                        </span>
                        <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-[10px]">
                          Awalan Wajib: "{kktpData.prefixCK} ..."
                        </span>
                      </div>
                    );
                  })()}
                  <textarea
                    rows={4}
                    value={editingSub.capaianKompetensi}
                    onChange={(e) => {
                      const sanitized = sanitizeCapaianKompetensi(
                        e.target.value,
                        editingSub.studentName,
                        Number(editingSub.nilaiAkhir) >= (activeAssessment.kktp || 75),
                        activeAssessment.mataPelajaran,
                        editingSub.nilaiAkhir
                      );
                      setEditingSub({ ...editingSub, capaianKompetensi: sanitized });
                    }}
                    placeholder="Contoh: Peserta didik sangat mampu / mampu / cukup mampu / kurang mampu..."
                    className="w-full p-2.5 border border-slate-300 rounded-xl leading-relaxed text-xs font-medium"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => setEditingSub(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleSaveEditedSub}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Google Drive Redirect & Guide Modal */}
      <DriveRedirectModal
        isOpen={isDriveModalOpen}
        url={
          activeAssessment?.jenis === 'ASAS'
            ? state.schoolInfo?.driveRaporUrlSAS || ''
            : state.schoolInfo?.driveRaporUrlSTS || ''
        }
        title={
          activeAssessment?.jenis === 'ASAS'
            ? 'Folder Raport & Nilai Siswa ASAS (Akhir Semester)'
            : 'Folder Raport & Nilai Siswa STS (Tengah Semester)'
        }
        menuName={activeAssessment?.jenis === 'ASAS' ? 'Rapor SAS' : 'Rapor STS'}
        onClose={() => setIsDriveModalOpen(false)}
      />

      {/* Authentic Proof Modal (Dokumen Bukti Otentik Penilaian Siswa) */}
      {selectedProofSub && activeAssessment && (
        <AuthenticProofModal
          submission={selectedProofSub.submission}
          assessment={activeAssessment}
          student={selectedProofSub.student}
          schoolInfo={state?.schoolInfo}
          onClose={() => setSelectedProofSub(null)}
        />
      )}

      {/* Modal Upload & Impor Nilai Rapor STS */}
      {isUploadSTSModalOpen && (
        <UploadRaporSTSModal
          isOpen={isUploadSTSModalOpen}
          onClose={() => setIsUploadSTSModalOpen(false)}
          defaultClass={selectedSubClass || activeAssessment.kelas}
          defaultSubject={activeAssessment.mataPelajaran}
          onSuccessSync={(subject, cls) => {
            const found = flattenedOptions.find(
              (o) =>
                o.assessment.mataPelajaran.toLowerCase() === subject.toLowerCase() &&
                o.subClass === cls
            );
            if (found) {
              setSelectedOptionKey(found.key);
            }
          }}
        />
      )}
    </div>
  );
};
