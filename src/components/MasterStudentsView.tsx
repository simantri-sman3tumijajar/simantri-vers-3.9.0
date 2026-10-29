import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Student } from '../types';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  Upload,
  ScanEye,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Save,
  X,
  Camera,
  Loader2,
  CheckSquare,
  Square,
  Zap,
  CheckCheck,
  UploadCloud,
  UserCheck,
  Calendar,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PaginationControls } from './PaginationControls';
import * as XLSX from 'xlsx';
import { downloadStudentTemplateExcel } from '../utils/excelExport';
import { optimizeDocumentForAI } from '../utils/imageCompressor';
import { AIProgressBar, ProgressStep } from './AIProgressBar';
import { UploadRaporSTSModal } from './UploadRaporSTSModal';

const OCR_STUDENT_STEPS: ProgressStep[] = [
  { title: 'Memindai Lembar Presensi / Buku Induk', description: 'Membaca citra foto resolusi tinggi, mengoreksi kemiringan & kontras' },
  { title: 'Menghubungkan ke Gemini AI Vision', description: 'Mengirim data ke model AI Vision Ultra-Tinggi' },
  { title: 'Mengekstrak No. Urut, NISN & Nama Siswa', description: 'Mengenali teks tulisan tangan maupun cetak secara presisi' },
  { title: 'Validasi & Normalisasi Data Rombel', description: 'Menyiapkan tabel pratinjau verifikasi akhir' },
];

export const MasterStudentsView: React.FC = () => {
  const {
    state,
    currentUser,
    saveStudent,
    saveStudentsBatch,
    deleteStudent,
    deleteStudentsBatch,
    setCurrentView,
    setSelectedModule,
    showToast,
  } = useApp();

  // Default to ALL so all registered students are immediately visible
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    return localStorage.getItem('smantri_last_student_class') || 'ALL';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applyClassToAllGroup, setApplyClassToAllGroup] = useState(false);
  const [applyAgamaToAllGroup, setApplyAgamaToAllGroup] = useState(false);

  // Bulk Selection & "Terapkan ke Semua" State
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkTargetClass, setBulkTargetClass] = useState<string>('');
  const [bulkTargetAgama, setBulkTargetAgama] = useState<string>('');
  const [bulkTargetGender, setBulkTargetGender] = useState<'L' | 'P' | ''>('');

  // AI OCR / Excel Import Preview Modal State
  const [previewStudents, setPreviewStudents] = useState<Student[]>([]);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewBulkClass, setPreviewBulkClass] = useState<string>('');
  const [previewBulkAgama, setPreviewBulkAgama] = useState<string>('');
  const [isUploadGradesModalOpen, setIsUploadGradesModalOpen] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [ocrProgressPercent, setOcrProgressPercent] = useState(10);
  const [ocrActiveStepIndex, setOcrActiveStepIndex] = useState(0);
  const [aiSourceType, setAiSourceType] = useState<'excel' | 'ocr'>('excel');

  // Live attendance aggregation per student from dailyAttendances (Master Data Connected)
  const studentAttendanceStats = useMemo(() => {
    const map: Record<string, { h: number; s: number; i: number; a: number; total: number; pct: number }> = {};
    (state.dailyAttendances || []).forEach((doc) => {
      doc.records.forEach((r) => {
        if (!map[r.studentId]) {
          map[r.studentId] = { h: 0, s: 0, i: 0, a: 0, total: 0, pct: 0 };
        }
        if (r.status === 'H') map[r.studentId].h++;
        else if (r.status === 'S') map[r.studentId].s++;
        else if (r.status === 'I') map[r.studentId].i++;
        else if (r.status === 'A') map[r.studentId].a++;
        map[r.studentId].total++;
      });
    });
    Object.values(map).forEach((item) => {
      item.pct = item.total > 0 ? Math.round((item.h / item.total) * 100) : 0;
    });
    return map;
  }, [state.dailyAttendances]);

  // Mode Edit Tabel Sekaligus (Batch Inline Edit)
  const [isBatchEditMode, setIsBatchEditMode] = useState(false);
  const [batchEditedStudentsMap, setBatchEditedStudentsMap] = useState<Record<string, Student>>({});

  const handleToggleBatchEditMode = () => {
    if (!isBatchEditMode) {
      const map: Record<string, Student> = {};
      filteredStudents.forEach((s) => {
        map[s.id] = { ...s };
      });
      setBatchEditedStudentsMap(map);
      setIsBatchEditMode(true);
    } else {
      setIsBatchEditMode(false);
      setBatchEditedStudentsMap({});
    }
  };

  const handleUpdateBatchStudentField = (id: string, field: keyof Student, value: any) => {
    setBatchEditedStudentsMap((prev) => {
      const existing = prev[id] || state.students.find((s) => s.id === id);
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

  const handleSaveAllBatchStudents = async () => {
    const listToSave = Object.values(batchEditedStudentsMap);
    if (listToSave.length === 0) return;

    await saveStudentsBatch(listToSave);
    setIsBatchEditMode(false);
    setBatchEditedStudentsMap({});
    showToast('Simpan Sekaligus Berhasil', `Berhasil menyimpan perubahan ${listToSave.length} data siswa secara bersamaan.`, 'success');
  };

  const handleSelectClass = (cls: string) => {
    setSelectedClass(cls);
    localStorage.setItem('smantri_last_student_class', cls);
    setSelectedStudentIds(new Set());
  };

  const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const findOfficialClassName = (rawName: string, classes: { nama: string }[]): string => {
    if (!rawName) return 'X.1';
    const rawCanonical = cleanCanonical(rawName);
    const found = classes.find((c) => cleanCanonical(c.nama) === rawCanonical);
    if (found) return found.nama;
    return rawName.toUpperCase().trim();
  };

  useEffect(() => {
    let progressTimer: any;
    if (isProcessingAI) {
      setOcrProgressPercent(15);
      setOcrActiveStepIndex(0);

      progressTimer = setInterval(() => {
        setOcrProgressPercent((prev) => {
          if (prev < 30) {
            setOcrActiveStepIndex(0);
            return prev + 6;
          } else if (prev < 65) {
            setOcrActiveStepIndex(1);
            return prev + 4;
          } else if (prev < 90) {
            setOcrActiveStepIndex(2);
            return prev + 2;
          }
          setOcrActiveStepIndex(3);
          return Math.min(96, prev + 0.5);
        });
      }, 250);
    } else {
      setOcrProgressPercent(100);
      setOcrActiveStepIndex(3);
    }
    return () => clearInterval(progressTimer);
  }, [isProcessingAI]);

  if (!state || !currentUser) return null;

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'operator';
  const isGuruBK = Boolean(
    currentUser.isGuruBK ||
    currentUser.mataPelajaran?.some(
      (m) => m.toLowerCase().includes('bimbingan konseling') || m.toLowerCase() === 'bk'
    )
  );

  const classList = Array.from(
    new Set([
      ...state.classes.map((c) => c.nama),
      ...state.students.map((s) => s.kelas).filter(Boolean),
    ])
  );

  const filteredStudents = state.students
    .filter((s) => {
      if (selectedClass === 'ALL') return true;
      if (!s.kelas) return false;
      return cleanCanonical(s.kelas) === cleanCanonical(selectedClass);
    })
    .filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (s.nama && s.nama.toLowerCase().includes(q)) ||
        (s.nisn && s.nisn.includes(q)) ||
        (s.kelas && s.kelas.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));

  // Table Pagination State
  const [studentPage, setStudentPage] = useState(1);
  const [studentPageSize, setStudentPageSize] = useState(25);

  // Reset page when search or class filter changes
  useEffect(() => {
    setStudentPage(1);
  }, [selectedClass, searchQuery]);

  const totalStudentPages = Math.ceil(filteredStudents.length / studentPageSize) || 1;
  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * studentPageSize;
    return filteredStudents.slice(start, start + studentPageSize);
  }, [filteredStudents, studentPage, studentPageSize]);

  const handleAddNew = () => {
    setEditingStudent({
      id: '',
      noUrut: filteredStudents.length + 1,
      nisn: '',
      nama: '',
      jenisKelamin: 'L',
      kelas: selectedClass === 'ALL' ? (state.classes[0]?.nama || 'X.1') : selectedClass,
    });
    setIsModalOpen(true);
  };

  const handleEdit = (s: Student) => {
    setEditingStudent({ ...s });
    setApplyClassToAllGroup(false);
    setApplyAgamaToAllGroup(false);
    setIsModalOpen(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    const studentToSave = { ...editingStudent };
    const officialKelas = findOfficialClassName(studentToSave.kelas, state.classes);
    const prevClass = state.students.find((s) => s.id === studentToSave.id)?.kelas || studentToSave.kelas;

    // Immediately close modal and update navigation (zero delay)
    setIsModalOpen(false);
    setEditingStudent(null);
    setSelectedClass(officialKelas);
    localStorage.setItem('smantri_last_student_class', officialKelas);
    setSearchQuery('');

    saveStudent({
      ...studentToSave,
      kelas: officialKelas,
    });

    // Apply to all other students in the group if teacher checked the options
    if (applyClassToAllGroup || applyAgamaToAllGroup) {
      const otherStudentsInGroup = state.students.filter(
        (s) => s.id !== studentToSave.id && cleanCanonical(s.kelas) === cleanCanonical(prevClass)
      );
      if (otherStudentsInGroup.length > 0) {
        const updatedBatch: Student[] = otherStudentsInGroup.map((s) => ({
          ...s,
          kelas: applyClassToAllGroup ? officialKelas : s.kelas,
          agama: applyAgamaToAllGroup ? (studentToSave.agama as any) : s.agama,
        }));
        saveStudentsBatch(updatedBatch);
        showToast(
          'Terapkan ke Semua Berhasil!',
          `Perubahan berhasil diterapkan serentak ke ${updatedBatch.length} siswa lainnya di kelas ${prevClass}.`,
          'success'
        );
      }
    }

    setApplyClassToAllGroup(false);
    setApplyAgamaToAllGroup(false);
  };

  // Bulk / "Terapkan ke Semua" Handlers
  const handleToggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenBulkModal = () => {
    setBulkTargetClass(selectedClass !== 'ALL' ? selectedClass : (state.classes[0]?.nama || 'X.1'));
    setBulkTargetAgama('');
    setBulkTargetGender('');
    setIsBulkModalOpen(true);
  };

  const handleApplyBulkChanges = async () => {
    if (selectedStudentIds.size === 0) return;
    const targetStudents = state.students.filter((s) => selectedStudentIds.has(s.id));
    if (targetStudents.length === 0) return;

    const updatedBatch: Student[] = targetStudents.map((s) => ({
      ...s,
      kelas: bulkTargetClass ? findOfficialClassName(bulkTargetClass, state.classes) : s.kelas,
      agama: bulkTargetAgama ? (bulkTargetAgama as any) : s.agama,
      jenisKelamin: bulkTargetGender ? (bulkTargetGender as 'L' | 'P') : s.jenisKelamin,
    }));

    setIsBulkModalOpen(false);
    setSelectedStudentIds(new Set());
    showToast(
      'Terapkan ke Semua Berhasil!',
      `${updatedBatch.length} siswa berhasil diperbarui sekaligus secara serentak.`,
      'success'
    );
    saveStudentsBatch(updatedBatch);
  };

  const handleBulkDelete = async () => {
    if (selectedStudentIds.size === 0) return;
    const count = selectedStudentIds.size;
    if (!window.confirm(`Yakin ingin menghapus ${count} data siswa yang dipilih sekaligus?`)) return;

    await deleteStudentsBatch(Array.from(selectedStudentIds));
    setSelectedStudentIds(new Set());
  };

  // Bulk Apply for Import Preview Rows
  const handleApplyBulkClassToPreview = () => {
    if (!previewBulkClass || previewStudents.length === 0) return;
    const updated = previewStudents.map((ps) => ({
      ...ps,
      kelas: previewBulkClass,
    }));
    setPreviewStudents(updated);
    showToast('Rombel Diterapkan', `Seluruh ${updated.length} calon siswa diset ke kelas ${previewBulkClass}.`, 'info');
  };

  const handleApplyBulkAgamaToPreview = () => {
    if (!previewBulkAgama || previewStudents.length === 0) return;
    const updated = previewStudents.map((ps) => ({
      ...ps,
      agama: previewBulkAgama as any,
    }));
    setPreviewStudents(updated);
    showToast('Agama Diterapkan', `Seluruh ${updated.length} calon siswa diset ke agama ${previewBulkAgama}.`, 'info');
  };

  // 1. Handle Excel File Import (.xlsx)
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Skip header row if contains strings
        const parsedList: Student[] = [];
        const startRow = data.length > 0 && typeof data[0][0] === 'string' && data[0][0].toLowerCase().includes('no') ? 1 : 0;
        const defaultTargetClass = selectedClass !== 'ALL' ? selectedClass : (state.classes[0]?.nama || 'X.1');

        for (let i = startRow; i < data.length; i++) {
          const row = data[i];
          if (!row || (!row[2] && !row[1])) continue;

          const rawKelas = String(row[4] || defaultTargetClass).trim();
          const officialKelas = findOfficialClassName(rawKelas, state.classes);
          
          const rawAgama = String(row[5] || '-').trim();
          const cleanAgama = (['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu'].find(
            (a) => a.toLowerCase() === rawAgama.toLowerCase()
          ) || '-') as any;

          parsedList.push({
            id: `std-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
            noUrut: Number(row[0]) || i + 1,
            nisn: String(row[1] || '-').trim(),
            nama: String(row[2] || row[1] || '').toUpperCase().trim(),
            jenisKelamin: (String(row[3] || 'L').toUpperCase().startsWith('P') ? 'P' : 'L') as 'L' | 'P',
            kelas: officialKelas,
            agama: cleanAgama,
          });
        }

        if (parsedList.length > 0) {
          setAiSourceType('excel');
          setPreviewStudents(parsedList);
          setIsPreviewModalOpen(true);
        } else {
          showToast('Format Tidak Sesuai', 'Tidak ditemukan baris data siswa yang valid di berkas Excel.', 'error');
        }
      } catch (err) {
        console.error('Excel parse error:', err);
        showToast('Gagal Membaca Excel', 'Pastikan file berekstensi .xlsx atau .xls standar.', 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // 2. Handle Photo / Scanned Image Upload via Gemini AI Vision OCR
  const handleImageOCRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingAI(true);
    showToast('Memproses Gambar...', 'Mengoptimalkan kontras & menjalankan AI Vision Ultra-Tinggi untuk mengenali tulisan...', 'info');

    try {
      // 1. Adaptive Low-light Preprocessing & Network-Aware Document Optimization
      const optimizedBase64 = await optimizeDocumentForAI(file);
      const defaultTargetClass = selectedClass !== 'ALL' ? selectedClass : (state.classes[0]?.nama || 'X.1');

      const res = await fetch('/api/gemini/ocr-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: optimizedBase64,
          mimeType: 'image/jpeg',
          targetKelas: defaultTargetClass,
        }),
      });

      const json = await res.json();
      if (json.success && json.students?.length > 0) {
        const mapped: Student[] = json.students.map((s: any, idx: number) => {
          const rawKelas = String(s.kelas || defaultTargetClass).trim();
          const officialKelas = findOfficialClassName(rawKelas, state.classes);
          return {
            id: `std-ocr-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            noUrut: Number(s.noUrut) || idx + 1,
            nisn: String(s.nisn || '-').trim(),
            nama: (s.nama || '').toUpperCase().trim(),
            jenisKelamin: String(s.jenisKelamin || 'L').toUpperCase().startsWith('P') ? 'P' : 'L',
            kelas: officialKelas,
          };
        });

        setAiSourceType('ocr');
        setPreviewStudents(mapped);
        setIsPreviewModalOpen(true);
        showToast(
          'Pembacaan Selesai!',
          `AI Vision berhasil mengenali ${mapped.length} data siswa dari foto lembar daftar hadir.`,
          'success'
        );
      } else {
        const userFriendlyMsg =
          json.message ||
          'AI Vision sedang mengalami antrian beban tinggi. Silakan coba kembali atau gunakan fitur Impor Excel.';
        showToast('Kendala AI Vision', userFriendlyMsg, 'warning');
      }
    } catch (err: any) {
      console.error('OCR Error:', err);
      showToast(
        'Kendala Koneksi AI',
        'Layanan AI Vision sedang dalam antrian beban tinggi. Silakan ulangi sesaat lagi atau gunakan opsi Impor Excel.',
        'warning'
      );
    } finally {
      setIsProcessingAI(false);
      e.target.value = '';
    }
  };

  const handleConfirmSaveBatch = () => {
    if (!previewStudents || previewStudents.length === 0) return;
    const studentsToSave = [...previewStudents];
    const uniqueClasses = Array.from(new Set(studentsToSave.map((s) => s.kelas).filter(Boolean)));
    
    // Instantly close modal and navigate (zero delay)
    setIsPreviewModalOpen(false);
    setPreviewStudents([]);
    if (uniqueClasses.length === 1 && uniqueClasses[0]) {
      setSelectedClass(uniqueClasses[0]);
      localStorage.setItem('smantri_last_student_class', uniqueClasses[0]);
    } else {
      setSelectedClass('ALL');
      localStorage.setItem('smantri_last_student_class', 'ALL');
    }
    setSearchQuery('');

    saveStudentsBatch(studentsToSave);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 flex-wrap">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>{isGuruBK && !isAdmin ? 'Direktori Siswa Binaan BK' : 'Master Data Peserta Didik'}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>UU No. 27/2022 Terlindungi</span>
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {isGuruBK && !isAdmin
              ? 'Daftar seluruh siswa binaan per rombel, identitas NISN, dan data murid asuh bimbingan konseling'
              : isAdmin
              ? 'Kelola data siswa, impor dari file Excel, atau pindai dokumen absensi via Gemini AI Vision'
              : 'Daftar nama dan identitas siswa yang terdaftar di sistem asesmen (Dikelola oleh Admin)'}
          </p>
        </div>

        {isAdmin && (
          <div className="flex flex-col gap-2 sm:items-end">
            {/* Baris Utama - Aksi Pengelolaan & Edit */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleAddNew}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>Tambah Siswa Manual</span>
              </button>

              <button
                type="button"
                onClick={handleToggleBatchEditMode}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95 ${
                  isBatchEditMode
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold ring-2 ring-amber-400'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
                title="Edit seluruh data siswa sekaligus langsung di tabel"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{isBatchEditMode ? 'Matikan Mode Edit Massal' : 'Edit Tabel Sekaligus'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedStudentIds.size === 0) {
                    setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)));
                  }
                  handleOpenBulkModal();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors"
                title="Terapkan perubahan kelas/agama/data serentak ke semua siswa tanpa edit satu per satu"
              >
                <Zap className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                <span>Terapkan Semua</span>
              </button>
            </div>

            {/* Baris Sekunder (Sub-Bar Diletakkan di Bawahnya) - AI OCR, Impor & Template */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 w-full sm:w-auto sm:justify-end">
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all">
                {isProcessingAI ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ScanEye className="w-3.5 h-3.5" />
                )}
                <span>{isProcessingAI ? 'Menganalisis...' : 'Pindai Foto Absensi (AI Vision)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isProcessingAI}
                  onChange={handleImageOCRUpload}
                  className="hidden"
                />
              </label>

              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-colors">
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Impor Excel (.xlsx)</span>
                <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="hidden" />
              </label>

              <motion.button
                type="button"
                whileHover={{ scale: 1.025, y: -1 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setIsUploadGradesModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                title="Unggah nilai rapor STS, SAS, formatif, atau SLM ke Daftar Nilai"
              >
                <UploadCloud className="w-3.5 h-3.5 text-sky-200" />
                <span>Upload Nilai Rapor &amp; Asesmen</span>
              </motion.button>

              <button
                type="button"
                onClick={downloadStudentTemplateExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                title="Unduh Format / Template File Excel Siswa"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Format Excel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-indigo-600" />
            Pilih Kelas:
          </span>
          <div className="flex gap-1.5 flex-wrap items-center">
            <button
              onClick={() => handleSelectClass('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedClass === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Kelas
            </button>
            {classList.map((cls) => (
              <button
                key={cls}
                onClick={() => handleSelectClass(cls)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  selectedClass === cls
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Kelas {cls}
              </button>
            ))}
          </div>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau NISN..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Floating Mode Edit Tabel Sekaligus Banner */}
      <AnimatePresence>
        {isBatchEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-900 text-white rounded-2xl shadow-xl border border-amber-400/50 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-sm">
                <Edit2 className="w-4 h-4 text-slate-950" />
              </span>
              <div>
                <span className="text-xs font-black text-amber-200 block">
                  Mode Edit Tabel Sekaligus Aktif ({filteredStudents.length} Siswa)
                </span>
                <span className="text-[11px] text-slate-200">
                  Ubah data di dalam tabel secara bebas, lalu klik "Simpan Semua Perubahan" untuk menyimpan seluruh data sekaligus.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSaveAllBatchStudents}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>Simpan Semua Perubahan ({filteredStudents.length} Siswa)</span>
              </button>

              <button
                type="button"
                onClick={handleToggleBatchEditMode}
                className="px-3 py-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-700"
              >
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Batch Action Bar ("Terapkan ke Semua") */}
      <AnimatePresence>
        {selectedStudentIds.size > 0 && !isBatchEditMode && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-sm">
                {selectedStudentIds.size}
              </span>
              <div>
                <span className="text-xs font-bold text-white block">
                  {selectedStudentIds.size} Siswa Terpilih
                </span>
                <span className="text-[11px] text-slate-400">
                  dari total {filteredStudents.length} siswa pada filter ini
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleOpenBulkModal}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span>Terapkan Pilihan ke Semua Terpilih</span>
              </button>

              <button
                type="button"
                onClick={handleBulkDelete}
                className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudentIds(new Set())}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer font-medium"
              >
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Students Table */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
              <tr>
                {isAdmin && (
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length}
                      onChange={handleToggleSelectAll}
                      title="Pilih Semua Siswa"
                      className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                    />
                  </th>
                )}
                <th className="py-3 px-3 w-12 text-center">No</th>
                <th className="py-3 px-4 w-32">NISN / NIS</th>
                <th className="py-3 px-4">Nama Lengkap Siswa</th>
                <th className="py-3 px-4 text-center w-24">L / P</th>
                <th className="py-3 px-4 w-28">Kelas</th>
                <th className="py-3 px-4 w-28">Agama</th>
                <th className="py-3 px-4 w-36 text-center">Presensi (Kehadiran)</th>
                {isAdmin && <th className="py-3 px-4 text-right w-24">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 9 : 7} className="py-12 text-center text-slate-500">
                    {state.students.length > 0 ? (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-8 h-8 text-amber-500" />
                        <p className="font-bold text-slate-700">
                          Tidak ada data siswa di filter kelas "{selectedClass}".
                        </p>
                        <p className="text-xs text-slate-400">
                          Terdapat {state.students.length} siswa terdaftar di rombel/kelas lainnya.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleSelectClass('ALL')}
                          className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          Tampilkan Semua Siswa ({state.students.length})
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Users className="w-8 h-8 text-slate-400" />
                        <p className="font-bold text-slate-700">Belum ada data peserta didik yang tersimpan.</p>
                        <p className="text-xs text-slate-400">
                          Gunakan tombol "Pindai Foto Lembar Siswa (AI Vision)", "Impor Excel", atau "Tambah Manual".
                        </p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((std, idx) => {
                  const isSelected = selectedStudentIds.has(std.id);
                  const curEdit = batchEditedStudentsMap[std.id] || std;
                  const realIndex = (studentPage - 1) * studentPageSize + idx + 1;

                  if (isBatchEditMode) {
                    return (
                      <tr key={std.id} className="bg-amber-50/40 hover:bg-amber-50/80 transition-colors border-b border-amber-200/60">
                        {isAdmin && (
                          <td className="py-2 px-3 text-center">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block animate-pulse" title="Siswa sedang di-edit massal" />
                          </td>
                        )}
                        <td className="py-1.5 px-2 text-center font-bold">
                          <input
                            type="number"
                            value={curEdit.noUrut || idx + 1}
                            onChange={(e) => handleUpdateBatchStudentField(std.id, 'noUrut', parseInt(e.target.value) || (idx + 1))}
                            className="w-12 text-center py-1 px-1 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden shadow-2xs"
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={curEdit.nisn || ''}
                            onChange={(e) => handleUpdateBatchStudentField(std.id, 'nisn', e.target.value)}
                            className="w-full py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden shadow-2xs"
                            placeholder="NISN..."
                          />
                        </td>
                        <td className="py-1.5 px-2">
                          <input
                            type="text"
                            value={curEdit.nama || ''}
                            onChange={(e) => handleUpdateBatchStudentField(std.id, 'nama', e.target.value)}
                            className="w-full py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden shadow-2xs"
                            placeholder="Nama Siswa..."
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <select
                            value={curEdit.jenisKelamin || 'L'}
                            onChange={(e) => handleUpdateBatchStudentField(std.id, 'jenisKelamin', e.target.value as any)}
                            className="py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-amber-500 focus:outline-hidden shadow-2xs"
                          >
                            <option value="L">Laki-laki (L)</option>
                            <option value="P">Perempuan (P)</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          <select
                            value={curEdit.kelas || 'X.1'}
                            onChange={(e) => handleUpdateBatchStudentField(std.id, 'kelas', e.target.value)}
                            className="w-full py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-amber-500 focus:outline-hidden shadow-2xs"
                          >
                            {classList.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-1.5 px-2">
                          <select
                            value={curEdit.agama || 'Islam'}
                            onChange={(e) => handleUpdateBatchStudentField(std.id, 'agama', e.target.value as any)}
                            className="w-full py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-hidden shadow-2xs"
                          >
                            <option value="Islam">Islam</option>
                            <option value="Kristen">Kristen</option>
                            <option value="Katolik">Katolik</option>
                            <option value="Hindu">Hindu</option>
                            <option value="Buddha">Buddha</option>
                            <option value="Khonghucu">Khonghucu</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded">
                            Terkunci
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="py-1.5 px-2 text-right">
                            <span className="text-[10px] text-amber-800 font-extrabold bg-amber-200/90 px-2 py-0.5 rounded shadow-2xs">
                              Siap Simpan
                            </span>
                          </td>
                        )}
                      </tr>
                    );
                  }

                  return (
                    <tr
                      key={std.id}
                      className={`transition-colors ${
                        isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      {isAdmin && (
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(std.id)}
                            className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                          />
                        </td>
                      )}
                      <td className="py-2.5 px-3 text-center font-bold text-slate-500">
                        {std.noUrut || idx + 1}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-semibold text-slate-400">
                        {(!std.nisn || std.nisn === '-') ? '' : std.nisn}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900">{std.nama}</td>
                      <td className="py-2.5 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            std.jenisKelamin === 'L'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-pink-50 text-pink-700 border border-pink-200'
                          }`}
                        >
                          {std.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                          {std.kelas}
                        </span>
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          std.agama && std.agama !== '-' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-slate-50 text-slate-500 border border-slate-200'
                        }`}>
                          {std.agama || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {(() => {
                          const att = studentAttendanceStats[std.id];
                          if (!att || att.total === 0) {
                            return (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200"
                                title="Belum ada catatan presensi (0 tercatat)"
                              >
                                0 Tercatat
                              </span>
                            );
                          }
                          return (
                            <div className="flex flex-col items-center">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black ${
                                  att.pct >= 90
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : att.pct >= 80
                                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                    : att.pct >= 70
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                                title={`Tingkat Kehadiran: ${att.pct}% | H:${att.h} S:${att.s} I:${att.i} A:${att.a}`}
                              >
                                {att.pct}% ({att.h}/{att.total})
                              </span>
                              {(att.s > 0 || att.i > 0 || att.a > 0) && (
                                <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                                  {att.s > 0 && `S:${att.s} `}
                                  {att.i > 0 && `I:${att.i} `}
                                  {att.a > 0 && `A:${att.a}`}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      {isAdmin && (
                        <td className="py-2.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(std)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                              title="Edit Siswa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteStudent(std.id)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Hapus Siswa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <PaginationControls
          currentPage={studentPage}
          totalPages={totalStudentPages}
          pageSize={studentPageSize}
          totalItems={filteredStudents.length}
          onPageChange={setStudentPage}
          onPageSizeChange={setStudentPageSize}
        />
      </div>

      {/* Bulk Update Modal ("Terapkan Pilihan ke Semua Siswa Terpilih") */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                    <Zap className="w-4 h-4 fill-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">
                      Terapkan ke Semua Siswa Terpilih
                    </h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Mengubah serentak {selectedStudentIds.size} siswa terpilih sekaligus
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBulkModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                {/* Pilih Kelas Baru */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>1. Pindahkan / Terapkan Rombel Kelas</span>
                    {bulkTargetClass && (
                      <span className="text-[10px] text-indigo-600 font-extrabold uppercase">
                        Akan diterapkan ke {selectedStudentIds.size} siswa
                      </span>
                    )}
                  </label>
                  <select
                    value={bulkTargetClass}
                    onChange={(e) => setBulkTargetClass(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="">-- Pertahankan Kelas Asal Masing-Masing --</option>
                    {classList.map((c) => (
                      <option key={c} value={c}>
                        Ganti ke Kelas {c}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pilih Agama Baru */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                    <span>2. Terapkan Agama (Pemisahan Pelajaran Agama)</span>
                    {bulkTargetAgama && (
                      <span className="text-[10px] text-indigo-600 font-extrabold uppercase">
                        Akan diterapkan ke {selectedStudentIds.size} siswa
                      </span>
                    )}
                  </label>
                  <select
                    value={bulkTargetAgama}
                    onChange={(e) => setBulkTargetAgama(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="">-- Pertahankan Agama Masing-Masing --</option>
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>

                {/* Pilih Jenis Kelamin Baru */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <label className="block font-bold text-slate-700 mb-1.5">
                    3. Terapkan Jenis Kelamin (Opsional)
                  </label>
                  <select
                    value={bulkTargetGender}
                    onChange={(e) => setBulkTargetGender(e.target.value as any)}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="">-- Pertahankan Jenis Kelamin Asal --</option>
                    <option value="L">Semua Laki-laki (L)</option>
                    <option value="P">Semua Perempuan (P)</option>
                  </select>
                </div>

                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 text-indigo-900 text-[11px] flex items-center gap-2">
                  <CheckCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>
                    Perubahan akan langsung diterapkan ke {selectedStudentIds.size} data siswa terpilih dan tersimpan otomatis.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsBulkModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBulkChanges}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>Terapkan ke {selectedStudentIds.size} Siswa</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Student Edit / Add Modal */}
      <AnimatePresence>
        {isModalOpen && editingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] overflow-y-auto flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base">
                  {editingStudent.id ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveStudent} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap Siswa</label>
                  <input
                    type="text"
                    required
                    value={editingStudent.nama}
                    onChange={(e) => setEditingStudent({ ...editingStudent, nama: e.target.value.toUpperCase() })}
                    placeholder="Contoh: AUREL ALTARIZHA AZZAHRA"
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold uppercase focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">NISN / Nomor Induk</label>
                    <input
                      type="text"
                      required
                      value={editingStudent.nisn}
                      onChange={(e) => setEditingStudent({ ...editingStudent, nisn: e.target.value })}
                      placeholder="008741201"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Absen</label>
                    <input
                      type="number"
                      required
                      value={editingStudent.noUrut}
                      onChange={(e) => setEditingStudent({ ...editingStudent, noUrut: Number(e.target.value) })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                    <select
                      value={editingStudent.jenisKelamin}
                      onChange={(e) => setEditingStudent({ ...editingStudent, jenisKelamin: e.target.value as any })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="L">Laki-laki (L)</option>
                      <option value="P">Perempuan (P)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Kelas</label>
                    <select
                      value={editingStudent.kelas}
                      onChange={(e) => setEditingStudent({ ...editingStudent, kelas: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      {classList.map((c) => (
                        <option key={c} value={c}>
                          Kelas {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Agama (Untuk Memisahkan Rombel Pelajaran Agama)</label>
                  <select
                    value={editingStudent.agama || '-'}
                    onChange={(e) => setEditingStudent({ ...editingStudent, agama: e.target.value as any })}
                    className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    <option value="-">- Belum Dipilih / Lainnya -</option>
                    <option value="Islam">Islam</option>
                    <option value="Kristen">Kristen</option>
                    <option value="Katolik">Katolik</option>
                    <option value="Hindu">Hindu</option>
                    <option value="Buddha">Buddha</option>
                    <option value="Khonghucu">Khonghucu</option>
                  </select>
                </div>

                {/* Opsi Terapkan ke Semua Siswa di Rombel Ini */}
                <div className="p-3.5 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl space-y-2">
                  <div className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
                    <span>Opsi Terapkan ke Semua (Tanpa Edit Satu per Satu):</span>
                  </div>
                  <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700 hover:text-indigo-900 select-none">
                    <input
                      type="checkbox"
                      checked={applyClassToAllGroup}
                      onChange={(e) => setApplyClassToAllGroup(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Terapkan pilihan <strong>Kelas ({editingStudent.kelas})</strong> ini ke SEMUA siswa di rombel ini</span>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700 hover:text-indigo-900 select-none">
                    <input
                      type="checkbox"
                      checked={applyAgamaToAllGroup}
                      onChange={(e) => setApplyAgamaToAllGroup(e.target.checked)}
                      className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Terapkan pilihan <strong>Agama ({editingStudent.agama || 'Islam'})</strong> ini ke SEMUA siswa di rombel ini</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    Simpan Siswa
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Preview Modal before Batch Saving (Excel / OCR Vision) */}
      <AnimatePresence>
        {isPreviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto text-slate-800"
            >
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  {aiSourceType === 'ocr' ? (
                    <ScanEye className="w-5 h-5 text-sky-400" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  )}
                  <div>
                    <h3 className="font-bold text-base">
                      Pratinjau Hasil Pembacaan {aiSourceType === 'ocr' ? 'Gemini AI Vision' : 'Excel'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Verifikasi {previewStudents.length} data siswa sebelum disimpan ke database
                    </p>
                  </div>
                </div>
                <button onClick={() => setIsPreviewModalOpen(false)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto space-y-3 overscroll-contain">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Sistem berhasil memvalidasi {previewStudents.length} calon siswa.</span>
                </div>

                {/* Bulk Apply Bar for Preview Rows */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700 flex items-center gap-1 text-[11px]">
                    <Zap className="w-3.5 h-3.5 text-indigo-600" />
                    Terapkan Serentak ke Seluruh Baris Pratinjau:
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1">
                      <select
                        value={previewBulkClass}
                        onChange={(e) => setPreviewBulkClass(e.target.value)}
                        className="py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden"
                      >
                        <option value="">Pilih Rombel Kelas</option>
                        {classList.map((c) => (
                          <option key={c} value={c}>
                            Kelas {c}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={handleApplyBulkClassToPreview}
                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Terapkan Kelas
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <select
                        value={previewBulkAgama}
                        onChange={(e) => setPreviewBulkAgama(e.target.value)}
                        className="py-1 px-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:outline-hidden"
                      >
                        <option value="">Pilih Agama</option>
                        <option value="Islam">Islam</option>
                        <option value="Kristen">Kristen</option>
                        <option value="Katolik">Katolik</option>
                        <option value="Hindu">Hindu</option>
                        <option value="Buddha">Buddha</option>
                        <option value="Khonghucu">Khonghucu</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleApplyBulkAgamaToPreview}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                      >
                        Terapkan Agama
                      </button>
                    </div>
                  </div>
                </div>

                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="p-2 text-center w-10">No</th>
                      <th className="p-2 w-28">NISN</th>
                      <th className="p-2">Nama Lengkap</th>
                      <th className="p-2 text-center w-16">L/P</th>
                      <th className="p-2 w-20">Kelas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewStudents.map((ps, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2 text-center font-semibold text-slate-500">{ps.noUrut || i + 1}</td>
                        <td className="p-2 font-mono text-slate-400">
                          {(!ps.nisn || ps.nisn === '-') ? '' : ps.nisn}
                        </td>
                        <td className="p-2 font-bold text-slate-900">{ps.nama}</td>
                        <td className="p-2 text-center font-bold">{ps.jenisKelamin}</td>
                        <td className="p-2 font-semibold text-indigo-700">{ps.kelas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                <button
                  onClick={() => setIsPreviewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batalkan
                </button>
                <button
                  onClick={handleConfirmSaveBatch}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan & Terapkan ({previewStudents.length} Siswa)</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Visual AI Progress Bar for OCR */}
      <AIProgressBar
        isOpen={isProcessingAI}
        title="Membaca Lembar Presensi Siswa"
        subtitle={`Mengekstrak data peserta didik kelas ${selectedClass} dengan Gemini AI Vision Ultra-Tinggi...`}
        steps={OCR_STUDENT_STEPS}
        activeStepIndex={ocrActiveStepIndex}
        progressPercent={ocrProgressPercent}
        estimatedSeconds={5}
      />

      {/* Modal Upload & Impor Nilai Asesmen & Rapor */}
      {isUploadGradesModalOpen && (
        <UploadRaporSTSModal
          isOpen={isUploadGradesModalOpen}
          onClose={() => setIsUploadGradesModalOpen(false)}
          defaultClass={selectedClass !== 'ALL' ? selectedClass : undefined}
          onSuccessSync={() => {
            showToast('Sinkronisasi Sukses', 'Nilai asesmen siswa berhasil terhubung ke Daftar Nilai.', 'success');
          }}
        />
      )}
    </div>
  );
};
