import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  DailyClassAttendance,
  DailyAttendanceRecord,
  AttendanceStatusCode,
  ATTENDANCE_STATUS,
  Student,
} from '../types';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  HeartPulse,
  Calendar,
  Search,
  Filter,
  Download,
  Printer,
  Save,
  CheckCheck,
  RotateCcw,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  HelpCircle,
  UserCheck,
  Check,
  Building2,
  GraduationCap,
  HeartHandshake,
  Loader2,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  LayoutDashboard,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { cleanCanonicalClass } from '../utils/classHelper';
import { PaginationControls } from './PaginationControls';

// Helper to convert image URL to base64 for jsPDF
async function getBase64Image(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.setAttribute('crossOrigin', 'anonymous');
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageUrl;
  });
}

export interface StudentAttendanceViewProps {
  initialTab?: 'ringkasan' | 'input' | 'rekap' | 'rawan';
}

export const StudentAttendanceView: React.FC<StudentAttendanceViewProps> = ({ initialTab = 'ringkasan' }) => {
  const {
    state,
    currentUser,
    saveDailyAttendance,
    deleteDailyAttendance,
    clearAllDailyAttendances,
    setCurrentView,
    setSelectedModule,
    showToast,
  } = useApp();

  // Role Checks
  const isSpecialAdminOrKepsek = currentUser?.role === 'admin' || currentUser?.role === 'operator' || currentUser?.role === 'kepala_sekolah';
  const isTimKesiswaan = Boolean(currentUser?.isTimKesiswaan || currentUser?.roles?.includes('kesiswaan'));
  const isPureGuruMapel = Boolean(
    (currentUser?.isGuruMapel || currentUser?.role === 'guru') &&
    !isSpecialAdminOrKepsek &&
    !isTimKesiswaan
  );
  const isKepalaSekolah = currentUser?.role === 'kepala_sekolah';

  // Active Sub-Feature Tab: 'ringkasan' | 'input' | 'rekap' | 'rawan'
  const [activeTab, setActiveTab] = useState<'ringkasan' | 'input' | 'rekap' | 'rawan'>(() => {
    if (isPureGuruMapel) return 'input';
    return initialTab || 'ringkasan';
  });

  useEffect(() => {
    if (isPureGuruMapel) {
      setActiveTab('input');
    } else if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isPureGuruMapel]);

  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Input Sheet States
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedClass, setSelectedClass] = useState<string>(() => {
    // If user is Wali Kelas, default to their class
    if (currentUser?.isWaliKelas && currentUser?.waliKelasName) {
      return currentUser.waliKelasName;
    }
    return state.classes?.[0]?.nama || 'X.1';
  });

  const [inputSearchQuery, setInputSearchQuery] = useState('');
  const [inputFilterStatus, setInputFilterStatus] = useState<'ALL' | AttendanceStatusCode | 'UNSET'>('ALL');
  const [isSaving, setIsSaving] = useState(false);

  // Local draft records for the current class and date: status can be null (belum dipilih / 0 tercatat)
  const [currentRecords, setCurrentRecords] = useState<Record<string, { status: AttendanceStatusCode | null; keterangan: string }>>({});

  // Rekapitulasi States
  const [rekapRangePreset, setRekapRangePreset] = useState<'today' | '7days' | 'month' | 'semester' | 'custom'>('month');
  const [rekapStartDate, setRekapStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(1); // awal bulan
    return d.toISOString().split('T')[0];
  });
  const [rekapEndDate, setRekapEndDate] = useState<string>(todayStr);
  const [rekapClassFilter, setRekapClassFilter] = useState<string>('ALL');
  const [rekapSearchQuery, setRekapSearchQuery] = useState('');

  // Pagination States for Tables
  const [inputPage, setInputPage] = useState(1);
  const [inputPageSize, setInputPageSize] = useState(25);

  const [rekapPage, setRekapPage] = useState(1);
  const [rekapPageSize, setRekapPageSize] = useState(25);

  const [rawanPage, setRawanPage] = useState(1);
  const [rawanPageSize, setRawanPageSize] = useState(10);

  // Update date ranges when preset changes
  useEffect(() => {
    const now = new Date();
    if (rekapRangePreset === 'today') {
      setRekapStartDate(todayStr);
      setRekapEndDate(todayStr);
    } else if (rekapRangePreset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      setRekapStartDate(d.toISOString().split('T')[0]);
      setRekapEndDate(todayStr);
    } else if (rekapRangePreset === 'month') {
      const d = new Date();
      d.setDate(1);
      setRekapStartDate(d.toISOString().split('T')[0]);
      setRekapEndDate(todayStr);
    } else if (rekapRangePreset === 'semester') {
      const d = new Date();
      const currentMonth = d.getMonth(); // 0-indexed
      if (currentMonth >= 6) {
        // Ganjil: Juli s.d Desember
        setRekapStartDate(`${d.getFullYear()}-07-01`);
        setRekapEndDate(`${d.getFullYear()}-12-31`);
      } else {
        // Genap: Januari s.d Juni
        setRekapStartDate(`${d.getFullYear()}-01-01`);
        setRekapEndDate(`${d.getFullYear()}-06-30`);
      }
    }
  }, [rekapRangePreset, todayStr]);

  // Students belonging to the currently selected class in Input Sheet (Linked directly to Master Data Siswa)
  const studentsInSelectedClass = useMemo(() => {
    const targetClean = cleanCanonicalClass(selectedClass);
    return (state.students || [])
      .filter((s) => cleanCanonicalClass(s.kelas) === targetClean)
      .sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0) || a.nama.localeCompare(b.nama));
  }, [state.students, selectedClass]);

  // Find existing DailyClassAttendance for selectedDate and selectedClass
  const existingAttendanceDoc = useMemo(() => {
    const attendanceList = state.dailyAttendances || [];
    const targetClean = cleanCanonicalClass(selectedClass);
    return attendanceList.find(
      (a) => a.tanggal === selectedDate && cleanCanonicalClass(a.kelas) === targetClean
    );
  }, [state.dailyAttendances, selectedDate, selectedClass]);

  // Sync currentRecords state whenever existing doc or student list changes
  useEffect(() => {
    const map: Record<string, { status: AttendanceStatusCode | null; keterangan: string }> = {};

    if (existingAttendanceDoc && existingAttendanceDoc.records) {
      existingAttendanceDoc.records.forEach((r) => {
        map[r.studentId] = {
          status: r.status,
          keterangan: r.keterangan || '',
        };
      });
      // Default any remaining student in master data to 'H' if document was previously saved
      studentsInSelectedClass.forEach((s) => {
        if (!map[s.id]) {
          map[s.id] = {
            status: 'H',
            keterangan: '',
          };
        }
      });
    } else {
      // PERMINTAAN USER: Jika belum diisi/disimpan, status awal dibuat 0 / belum diisi terlebih dahulu
      studentsInSelectedClass.forEach((s) => {
        map[s.id] = {
          status: null,
          keterangan: '',
        };
      });
    }

    setCurrentRecords(map);
  }, [existingAttendanceDoc, studentsInSelectedClass]);

  // Handle single student status toggle
  const handleSetStudentStatus = (studentId: string, status: AttendanceStatusCode) => {
    setCurrentRecords((prev) => {
      // Toggle off if clicked again
      const current = prev[studentId]?.status;
      const nextStatus = current === status ? null : status;
      return {
        ...prev,
        [studentId]: {
          ...(prev[studentId] || { keterangan: '' }),
          status: nextStatus,
        },
      };
    });
  };

  // Handle student notes change
  const handleSetStudentKeterangan = (studentId: string, keterangan: string) => {
    setCurrentRecords((prev) => ({
      ...prev,
      [studentId]: {
        status: prev[studentId]?.status || 'H',
        keterangan,
      },
    }));
  };

  // Mark all students present in selected class
  const handleMarkAllPresent = () => {
    const map: Record<string, { status: AttendanceStatusCode | null; keterangan: string }> = {};
    studentsInSelectedClass.forEach((s) => {
      map[s.id] = {
        status: 'H',
        keterangan: currentRecords[s.id]?.keterangan || '',
      };
    });
    setCurrentRecords(map);
    showToast('Semua Ditandai Hadir', `Seluruh ${studentsInSelectedClass.length} siswa kelas ${selectedClass} ditandai Hadir (H).`, 'info');
  };

  // Reset all statuses in selected class to 0 / null
  const handleResetStatuses = () => {
    const map: Record<string, { status: AttendanceStatusCode | null; keterangan: string }> = {};
    studentsInSelectedClass.forEach((s) => {
      map[s.id] = {
        status: null,
        keterangan: '',
      };
    });
    setCurrentRecords(map);
    showToast('Presensi Dikosongkan (0)', `Catatan keterangan dan pilihan kehadiran kelas ${selectedClass} direset ke 0.`, 'info');
  };

  // Clear all daily attendances across entire system (Reset Semua Data Absensi ke 0)
  const handleConfirmClearAll = async () => {
    setIsClearingAll(true);
    try {
      await clearAllDailyAttendances();
      setIsClearAllModalOpen(false);
    } catch (e) {
      showToast('Gagal Mengosongkan', 'Terjadi kesalahan saat mengosongkan data presensi.', 'error');
    } finally {
      setIsClearingAll(false);
    }
  };

  // Save attendance sheet
  const handleSaveAttendance = async () => {
    if (studentsInSelectedClass.length === 0) {
      showToast('Tidak Ada Siswa', `Tidak ada data siswa terdaftar di rombel ${selectedClass} pada Master Data Siswa.`, 'warning');
      return;
    }

    setIsSaving(true);
    try {
      // Map records linking directly to master data fields
      const records: DailyAttendanceRecord[] = studentsInSelectedClass.map((s) => {
        const item = currentRecords[s.id];
        // Jika belum dipilih, defaultkan ke 'H' saat tombol simpan ditekan
        const finalStatus = item?.status || 'H';
        return {
          studentId: s.id,
          nama: s.nama,
          noUrut: s.noUrut,
          nisn: s.nisn,
          jenisKelamin: s.jenisKelamin,
          status: finalStatus,
          keterangan: item?.keterangan?.trim() || undefined,
        };
      });

      const cleanClassId = cleanCanonicalClass(selectedClass);
      const docId = `${selectedDate}_${cleanClassId}`;

      const teacherMapelStr = currentUser?.mataPelajaran?.length ? ` (${currentUser.mataPelajaran.join(', ')})` : '';
      const recordedByTitle = isPureGuruMapel
        ? `${currentUser?.nama || 'Guru Mapel'}${teacherMapelStr}`
        : currentUser?.nama || 'Petugas Kesiswaan';

      const payload: DailyClassAttendance = {
        id: docId,
        tanggal: selectedDate,
        kelas: selectedClass,
        recordedBy: recordedByTitle,
        updatedAt: new Date().toISOString(),
        records,
      };

      await saveDailyAttendance(payload);
      showToast(
        'Presensi Disimpan & Tersinkron',
        `Kehadiran kelas ${selectedClass} berhasil disimpan oleh ${recordedByTitle} dan otomatis terhubung secara real-time ke akun Kepala Sekolah.`,
        'success'
      );
    } catch (e) {
      showToast('Gagal Menyimpan', 'Terjadi kendala saat menyimpan presensi ke server.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Quick stats summary for today (across all classes or recorded classes)
  const todaySummary = useMemo(() => {
    const attendances = (state.dailyAttendances || []).filter((a) => a.tanggal === todayStr);
    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpha = 0;

    attendances.forEach((doc) => {
      doc.records.forEach((r) => {
        if (r.status === 'H') totalHadir++;
        else if (r.status === 'S') totalSakit++;
        else if (r.status === 'I') totalIzin++;
        else if (r.status === 'A') totalAlpha++;
      });
    });

    const totalTercatat = totalHadir + totalSakit + totalIzin + totalAlpha;
    const totalSiswaSekolah = state.students?.length || 0;
    const persenKehadiran = totalTercatat > 0 ? Math.round((totalHadir / totalTercatat) * 100) : 0;

    return {
      totalSiswaSekolah,
      totalTercatat,
      totalHadir,
      totalSakit,
      totalIzin,
      totalAlpha,
      persenKehadiran,
      kelasTercatatCount: attendances.length,
      totalKelasCount: state.classes?.length || 0,
    };
  }, [state.dailyAttendances, state.students, state.classes, todayStr]);

  // At-Risk Students (Siswa Rawan Kehadiran: Alpha >= 3 or high absenteeism in recorded period)
  const atRiskStudents = useMemo(() => {
    const studentMap: Record<string, { student: Student; h: number; s: number; i: number; a: number }> = {};

    (state.students || []).forEach((s) => {
      studentMap[s.id] = { student: s, h: 0, s: 0, i: 0, a: 0 };
    });

    (state.dailyAttendances || []).forEach((doc) => {
      doc.records.forEach((r) => {
        if (studentMap[r.studentId]) {
          if (r.status === 'H') studentMap[r.studentId].h++;
          else if (r.status === 'S') studentMap[r.studentId].s++;
          else if (r.status === 'I') studentMap[r.studentId].i++;
          else if (r.status === 'A') studentMap[r.studentId].a++;
        }
      });
    });

    return Object.values(studentMap)
      .filter((item) => item.a >= 3 || (item.a + item.s + item.i >= 5 && item.a >= 2))
      .sort((a, b) => b.a - a.a || (b.s + b.i) - (a.s + a.i));
  }, [state.students, state.dailyAttendances]);

  // Class by class breakdown for selected date or overall (Master Data Connected)
  const classBreakdown = useMemo(() => {
    return (state.classes || []).map((cls) => {
      const targetClean = cleanCanonicalClass(cls.nama);
      const doc = (state.dailyAttendances || []).find(
        (a) => a.tanggal === selectedDate && cleanCanonicalClass(a.kelas) === targetClean
      );
      const studentCount = (state.students || []).filter(
        (s) => cleanCanonicalClass(s.kelas) === targetClean
      ).length;

      let h = 0, s = 0, i = 0, a = 0;
      if (doc && doc.records) {
        doc.records.forEach((r) => {
          if (r.status === 'H') h++;
          else if (r.status === 'S') s++;
          else if (r.status === 'I') i++;
          else if (r.status === 'A') a++;
        });
      }
      const totalRec = h + s + i + a;
      const pct = totalRec > 0 ? Math.round((h / totalRec) * 100) : 0;

      return {
        cls,
        hasRecorded: Boolean(doc),
        studentCount,
        h,
        s,
        i,
        a,
        totalRec,
        pct,
      };
    });
  }, [state.classes, state.students, state.dailyAttendances, selectedDate]);

  // Rekapitulasi Aggregated Data (Linked to Master Data Siswa)
  const rekapData = useMemo(() => {
    // 1. Filter daily attendances in range
    const filteredDocs = (state.dailyAttendances || []).filter((doc) => {
      const matchDate = doc.tanggal >= rekapStartDate && doc.tanggal <= rekapEndDate;
      const matchClass =
        rekapClassFilter === 'ALL' ||
        cleanCanonicalClass(doc.kelas) === cleanCanonicalClass(rekapClassFilter);
      return matchDate && matchClass;
    });

    // 2. Aggregate per student from Master Data
    const studentAggMap: Record<
      string,
      {
        student: Student;
        h: number;
        s: number;
        i: number;
        a: number;
        total: number;
        pct: number;
        datesRecorded: Set<string>;
      }
    > = {};

    // Get relevant students from Master Data Siswa
    const relevantStudents = (state.students || []).filter((s) => {
      const matchClass =
        rekapClassFilter === 'ALL' ||
        cleanCanonicalClass(s.kelas) === cleanCanonicalClass(rekapClassFilter);
      const matchSearch =
        !rekapSearchQuery ||
        s.nama.toLowerCase().includes(rekapSearchQuery.toLowerCase()) ||
        s.nisn.toLowerCase().includes(rekapSearchQuery.toLowerCase());
      return matchClass && matchSearch;
    });

    relevantStudents.forEach((s) => {
      studentAggMap[s.id] = {
        student: s,
        h: 0,
        s: 0,
        i: 0,
        a: 0,
        total: 0,
        pct: 0,
        datesRecorded: new Set(),
      };
    });

    filteredDocs.forEach((doc) => {
      doc.records.forEach((r) => {
        if (studentAggMap[r.studentId]) {
          studentAggMap[r.studentId].datesRecorded.add(doc.tanggal);
          if (r.status === 'H') studentAggMap[r.studentId].h++;
          else if (r.status === 'S') studentAggMap[r.studentId].s++;
          else if (r.status === 'I') studentAggMap[r.studentId].i++;
          else if (r.status === 'A') studentAggMap[r.studentId].a++;
        }
      });
    });

    // Compute totals and percentages (Starts at 0% if 0 recorded days)
    const list = Object.values(studentAggMap).map((item) => {
      const total = item.h + item.s + item.i + item.a;
      const pct = total > 0 ? Math.round((item.h / total) * 100) : 0;
      return {
        ...item,
        total,
        pct,
      };
    });

    list.sort((a, b) => {
      if (a.student.kelas !== b.student.kelas) {
        return a.student.kelas.localeCompare(b.student.kelas);
      }
      return (a.student.noUrut || 0) - (b.student.noUrut || 0) || a.student.nama.localeCompare(b.student.nama);
    });

    // Overview stats
    let sumH = 0, sumS = 0, sumI = 0, sumA = 0;
    list.forEach((l) => {
      sumH += l.h;
      sumS += l.s;
      sumI += l.i;
      sumA += l.a;
    });
    const grandTotal = sumH + sumS + sumI + sumA;
    const avgPct = grandTotal > 0 ? Math.round((sumH / grandTotal) * 100) : 0;

    const uniqueDates = new Set(filteredDocs.map((d) => d.tanggal));

    return {
      list,
      totalHariTercatat: uniqueDates.size,
      sumH,
      sumS,
      sumI,
      sumA,
      grandTotal,
      avgPct,
    };
  }, [state.dailyAttendances, state.students, rekapStartDate, rekapEndDate, rekapClassFilter, rekapSearchQuery]);

  // Input Sheet Paginated List
  const filteredInputStudents = useMemo(() => {
    return studentsInSelectedClass.filter((s) => {
      const matchSearch =
        !inputSearchQuery ||
        s.nama.toLowerCase().includes(inputSearchQuery.toLowerCase()) ||
        s.nisn.toLowerCase().includes(inputSearchQuery.toLowerCase());
      const currentStatus = currentRecords[s.id]?.status;
      const matchStatus =
        inputFilterStatus === 'ALL'
          ? true
          : inputFilterStatus === 'UNSET'
          ? !currentStatus
          : currentStatus === inputFilterStatus;
      return matchSearch && matchStatus;
    });
  }, [studentsInSelectedClass, inputSearchQuery, currentRecords, inputFilterStatus]);

  const totalInputPages = Math.ceil(filteredInputStudents.length / inputPageSize) || 1;
  const paginatedInputStudents = useMemo(() => {
    const start = (inputPage - 1) * inputPageSize;
    return filteredInputStudents.slice(start, start + inputPageSize);
  }, [filteredInputStudents, inputPage, inputPageSize]);

  // Rekapitulasi Paginated List
  const totalRekapPages = Math.ceil(rekapData.list.length / rekapPageSize) || 1;
  const paginatedRekapList = useMemo(() => {
    const start = (rekapPage - 1) * rekapPageSize;
    return rekapData.list.slice(start, start + rekapPageSize);
  }, [rekapData.list, rekapPage, rekapPageSize]);

  // Siswa Rawan Paginated List
  const totalRawanPages = Math.ceil(atRiskStudents.length / rawanPageSize) || 1;
  const paginatedRawanList = useMemo(() => {
    const start = (rawanPage - 1) * rawanPageSize;
    return atRiskStudents.slice(start, start + rawanPageSize);
  }, [atRiskStudents, rawanPage, rawanPageSize]);

  // Export to Excel handler
  const handleExportExcel = () => {
    if (rekapData.list.length === 0) {
      showToast('Tidak Ada Data', 'Tidak ada data rekapitulasi untuk rentang dan filter ini.', 'warning');
      return;
    }

    const schoolName = state.schoolInfo?.namaSekolah || 'SMAN 3 TUMIJAJAR';
    const headerTitle = [
      [`REKAPITULASI PRESENSI KEHADIRAN PESERTA DIDIK`],
      [`${schoolName.toUpperCase()}`],
      [`Tahun Ajaran: ${state.schoolInfo?.tahunAjaranAktif || '2026/2027'} · Semester ${state.schoolInfo?.semesterAktif || 'Ganjil'}`],
      [`Rentang Tanggal: ${rekapStartDate} s.d ${rekapEndDate} · Kelas: ${rekapClassFilter === 'ALL' ? 'Semua Kelas' : rekapClassFilter}`],
      [], // blank line
      ['No', 'NISN', 'Nama Siswa', 'Kelas', 'L/P', 'Hadir (H)', 'Sakit (S)', 'Izin (I)', 'Alpha (A)', 'Total Hari', 'Persentase Kehadiran (%)', 'Status Ketuntasan Kehadiran'],
    ];

    const dataRows = rekapData.list.map((item, idx) => [
      idx + 1,
      item.student.nisn || '-',
      item.student.nama,
      item.student.kelas,
      item.student.jenisKelamin,
      item.h,
      item.s,
      item.i,
      item.a,
      item.total,
      `${item.pct}%`,
      item.pct >= 90 ? 'Sangat Baik' : item.pct >= 80 ? 'Baik' : item.pct >= 70 ? 'Cukup' : 'Perlu Pembinaan',
    ]);

    const worksheetData = [...headerTitle, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-fit column widths
    ws['!cols'] = [
      { wch: 6 },
      { wch: 14 },
      { wch: 32 },
      { wch: 10 },
      { wch: 6 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 22 },
      { wch: 20 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Presensi');

    const fileName = `Rekap_Presensi_${schoolName.replace(/\s+/g, '_')}_${rekapClassFilter}_${rekapStartDate}_sd_${rekapEndDate}.xlsx`;
    XLSX.writeFile(wb, fileName);
    showToast('Ekspor Excel Berhasil', `File ${fileName} berhasil diunduh.`, 'success');
  };

  // Official PDF Export with Letterhead & Signatures
  const handleExportOfficialPDF = async () => {
    if (rekapData.list.length === 0) {
      showToast('Tidak Ada Data', 'Tidak ada data rekapitulasi untuk rentang dan filter ini.', 'warning');
      return;
    }

    setIsGeneratingPDF(true);
    showToast('Menyiapkan PDF', 'Menyusun dokumen rekapitulasi resmi standar kedinasan...', 'info');

    try {
      const schoolInfo = state.schoolInfo;
      const schoolName = schoolInfo?.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR';
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 210 mm
      const marginLeft = 15;
      const marginRight = 15;
      const centerX = pageWidth / 2;

      let logoProvBase64: string | null = null;
      let logoSekolahBase64: string | null = null;
      try {
        if (schoolInfo?.logoProvinsiUrl) {
          logoProvBase64 = await getBase64Image(schoolInfo.logoProvinsiUrl);
        }
        if (schoolInfo?.logoSekolahUrl) {
          logoSekolahBase64 = await getBase64Image(schoolInfo.logoSekolahUrl);
        }
      } catch (e) {
        // Continue even if logos fail to load
      }

      const drawHeader = (docInstance: jsPDF) => {
        const y = 8;
        if (logoProvBase64) {
          try { docInstance.addImage(logoProvBase64, 'PNG', marginLeft, y, 16, 17); } catch (e) {}
        }
        if (logoSekolahBase64) {
          try { docInstance.addImage(logoSekolahBase64, 'PNG', pageWidth - marginRight - 16, y, 16, 17); } catch (e) {}
        }

        docInstance.setFont('times', 'bold');
        docInstance.setFontSize(10.5);
        docInstance.setTextColor(15, 23, 42);
        docInstance.text((schoolInfo?.provinsiText || 'PEMERINTAH PROVINSI LAMPUNG').toUpperCase(), centerX, y + 4, { align: 'center' });

        docInstance.setFontSize(9.5);
        docInstance.text((schoolInfo?.dinasText || 'DINAS PENDIDIKAN DAN KEBUDAYAAN').toUpperCase(), centerX, y + 8.5, { align: 'center' });

        docInstance.setFontSize(13);
        docInstance.text(schoolName.toUpperCase(), centerX, y + 14, { align: 'center' });

        docInstance.setFont('times', 'normal');
        docInstance.setFontSize(7.5);
        docInstance.setTextColor(71, 85, 105);
        const address = schoolInfo?.alamat || 'Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung 34794';
        docInstance.text(address, centerX, y + 18, { align: 'center' });

        // Double line separator
        const lineY = y + 20;
        docInstance.setDrawColor(15, 23, 42);
        docInstance.setLineWidth(0.6);
        docInstance.line(marginLeft, lineY, pageWidth - marginRight, lineY);
        docInstance.setLineWidth(0.2);
        docInstance.line(marginLeft, lineY + 0.8, pageWidth - marginRight, lineY + 0.8);

        // Document Title & Metadata
        docInstance.setFont('times', 'bold');
        docInstance.setFontSize(11);
        docInstance.setTextColor(15, 23, 42);
        docInstance.text('LAPORAN REKAPITULASI PRESENSI KEHADIRAN SISWA', centerX, lineY + 6, { align: 'center' });

        docInstance.setFont('times', 'normal');
        docInstance.setFontSize(8.5);
        docInstance.setTextColor(51, 65, 85);
        const semText = `Tahun Ajaran ${schoolInfo?.tahunAjaranAktif || '2026/2027'} · Semester ${schoolInfo?.semesterAktif || 'Ganjil'}`;
        const filterText = `Kelas: ${rekapClassFilter === 'ALL' ? 'Semua Rombel' : rekapClassFilter} | Periode: ${rekapStartDate} s.d ${rekapEndDate} (${rekapData.totalHariTercatat} Hari Efektif)`;
        docInstance.text(`${semText} | ${filterText}`, centerX, lineY + 10.5, { align: 'center' });
      };

      const tableBody = rekapData.list.map((item, idx) => [
        idx + 1,
        item.student.nisn || '-',
        item.student.nama.toUpperCase(),
        item.student.kelas,
        item.student.jenisKelamin,
        item.h,
        item.s,
        item.i,
        item.a,
        item.total,
        `${item.pct}%`,
        item.pct >= 90 ? 'Sangat Baik' : item.pct >= 80 ? 'Baik' : item.pct >= 70 ? 'Cukup' : 'Perlu Perhatian',
      ]);

      autoTable(doc, {
        startY: 44,
        margin: { top: 44, left: marginLeft, right: marginRight, bottom: 25 },
        head: [
          [
            { content: 'NO', styles: { halign: 'center' } },
            { content: 'NISN', styles: { halign: 'center' } },
            { content: 'NAMA LENGKAP SISWA', styles: { halign: 'left' } },
            { content: 'KELAS', styles: { halign: 'center' } },
            { content: 'L/P', styles: { halign: 'center' } },
            { content: 'HADIR (H)', styles: { halign: 'center' } },
            { content: 'SAKIT (S)', styles: { halign: 'center' } },
            { content: 'IZIN (I)', styles: { halign: 'center' } },
            { content: 'ALPHA (A)', styles: { halign: 'center' } },
            { content: 'TOTAL', styles: { halign: 'center' } },
            { content: '% HADIR', styles: { halign: 'center' } },
            { content: 'STATUS', styles: { halign: 'center' } },
          ],
        ],
        body: tableBody,
        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: 8,
          cellPadding: 1.8,
          textColor: [30, 41, 59],
          lineColor: [203, 213, 225],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8.5,
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 26 },
          2: { cellWidth: 68, fontStyle: 'bold' },
          3: { halign: 'center', cellWidth: 18 },
          4: { halign: 'center', cellWidth: 12 },
          5: { halign: 'center', cellWidth: 20 },
          6: { halign: 'center', cellWidth: 18 },
          7: { halign: 'center', cellWidth: 18 },
          8: { halign: 'center', cellWidth: 18 },
          9: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
          10: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
          11: { halign: 'center', cellWidth: 21 },
        },
        didDrawPage: () => {
          drawHeader(doc);
        },
      });

      // Signature section on the last page
      let finalY = (doc as any).lastAutoTable.finalY + 8;
      if (finalY + 38 > pageHeight - 15) {
        doc.addPage();
        drawHeader(doc);
        finalY = 48;
      }

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);

      // Left signature: Kepala Sekolah
      const leftX = marginLeft + 15;
      doc.text('Mengetahui,', leftX, finalY);
      doc.text('Kepala SMAN 3 Tumijajar', leftX, finalY + 4);
      doc.setFont('times', 'bold');
      doc.text(schoolInfo?.kepalaSekolah || 'Drs. Puji Astuti, M.Pd.', leftX, finalY + 22);
      doc.setFont('times', 'normal');
      doc.setFontSize(7.5);
      doc.text('NIP. ' + (schoolInfo?.nipKepalaSekolah || '-'), leftX, finalY + 26);

      // Right signature: Tim Kesiswaan / Wali Kelas
      const rightX = pageWidth - marginRight - 75;
      const dateFormatted = new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text(`Tumijajar, ${dateFormatted}`, rightX, finalY);
      doc.text(currentUser?.isWaliKelas ? `Wali Kelas ${currentUser?.waliKelasName || ''}` : 'Koordinator Tim Kesiswaan / Guru Piket', rightX, finalY + 4);
      doc.setFont('times', 'bold');
      doc.text(currentUser?.nama || 'Petugas Kesiswaan', rightX, finalY + 22);
      doc.setFont('times', 'normal');
      doc.setFontSize(7.5);
      doc.text('NIP. ' + (currentUser?.nip || '-'), rightX, finalY + 26);

      // Footer page numbering
      const totalPages = (doc as any).getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('times', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `SiMantri - Rekap Presensi Siswa SMAN 3 Tumijajar (Halaman ${p} dari ${totalPages})`,
          pageWidth - marginRight,
          pageHeight - 6,
          { align: 'right' }
        );
      }

      const safeClass = rekapClassFilter.replace(/[\s\/\\]+/g, '_');
      const pdfFileName = `Rekap_Presensi_SMAN3Tumijajar_${safeClass}_${rekapStartDate}_sd_${rekapEndDate}.pdf`;
      doc.save(pdfFileName);
      showToast('Ekspor PDF Berhasil', `Dokumen resmi ${pdfFileName} telah diunduh.`, 'success');
    } catch (err: any) {
      console.error('PDF Export Error:', err);
      showToast('Gagal Membuat PDF', 'Terjadi kesalahan saat menyusun dokumen PDF.', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Print / Browser handler
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Modul Kesiswaan - Hanya Tampil di Dasbor / Beranda Absensi */}
      {activeTab === 'ringkasan' && (
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Kesiswaan &amp; Presensi Siswa</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-slate-300">
                  {state.schoolInfo?.namaSekolah || 'SMAN 3 TUMIJAJAR'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  TA {state.schoolInfo?.tahunAjaranAktif || '2026/2027'} ({state.schoolInfo?.semesterAktif || 'Ganjil'})
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  UU No. 27/2022 Terjamin (Ps. 25 Data Anak)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Presensi Siswa Terpadu
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                Pusat kendali kehadiran peserta didik: Ringkasan cepat kehadiran harian, lembar absensi kelas reaktif dengan toggle cepat, deteksi siswa rawan tindak lanjut, dan rekapitulasi semester resmi.
              </p>
            </div>

            {/* Quick Date Indicator */}
            <div className="shrink-0 bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4 backdrop-blur-xs">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-400 block">Hari Ini</span>
                <span className="text-sm font-black text-white">
                  {new Date().toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Unified Summary Header & Actions */}
          <div className="mt-8 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 font-extrabold text-xs border border-rose-500/30 flex items-center gap-2 shadow-2xs">
                <UserCheck className="w-4 h-4 text-rose-400" />
                <span>Ringkasan Dasbor Presensi Siswa Terpadu</span>
              </span>
              <span className="px-3 py-1.5 rounded-xl bg-white/10 text-emerald-300 font-bold text-[11px] border border-emerald-400/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Input Absensi, Metrik Kehadiran &amp; Ekspor Rekap</span>
              </span>
            </div>

            {/* Quick Shortcuts & Data Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-2 rounded-xl text-xs font-bold bg-white/10 text-indigo-200 border border-indigo-400/30 flex items-center gap-1.5 shadow-xs">
                <Users className="w-3.5 h-3.5 text-indigo-300" />
                <span>Total Terdaftar: {state.students?.length || 0} Siswa</span>
              </span>

              {(currentUser?.role === 'admin' || isTimKesiswaan) && (
                <button
                  type="button"
                  onClick={() => setIsClearAllModalOpen(true)}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Kosongkan seluruh data presensi siswa menjadi 0"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Kosongkan Presensi (0)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================
          SECTION 1: RINGKASAN KESISWAAN (METRIK UTAMA KEHADIRAN HARI INI)
          ============================================================================== */}
      {activeTab === 'ringkasan' && (
        <div className="space-y-6">
          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {/* Card 1: Total Siswa */}
            <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/90 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa</span>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-slate-900">
                  {todaySummary.totalSiswaSekolah}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Dari {todaySummary.totalKelasCount} rombel kelas
                </span>
              </div>
            </div>

            {/* Card 2: Hadir (H) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50/60 border border-emerald-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">Hadir (H)</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <Check className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-emerald-900">
                  {todaySummary.totalHadir}
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                  Tingkat hadir: {todaySummary.persenKehadiran}%
                </span>
              </div>
            </div>

            {/* Card 3: Sakit (S) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-blue-50/60 border border-blue-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold text-blue-800 uppercase tracking-wider">Sakit (S)</span>
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                  <HeartPulse className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-blue-900">
                  {todaySummary.totalSakit}
                </span>
                <span className="text-[10px] text-blue-700 font-semibold block mt-0.5">
                  Surat keterangan
                </span>
              </div>
            </div>

            {/* Card 4: Izin (I) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/60 border border-amber-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider">Izin (I)</span>
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-amber-900">
                  {todaySummary.totalIzin}
                </span>
                <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">
                  Izin tertulis
                </span>
              </div>
            </div>

            {/* Card 5: Alpha (A) */}
            <div className="p-4 sm:p-5 rounded-3xl bg-rose-50/60 border border-rose-200 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-extrabold text-rose-800 uppercase tracking-wider">Alpha (A)</span>
                <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-rose-900">
                  {todaySummary.totalAlpha}
                </span>
                <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">
                  Tanpa keterangan
                </span>
              </div>
            </div>

            {/* Card 6: Persentase Kehadiran */}
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">% Kehadiran</span>
                <div className="w-8 h-8 rounded-xl bg-white/10 text-indigo-300 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {todaySummary.persenKehadiran}%
                </span>
                <span className="text-[10px] text-indigo-200 block mt-0.5">
                  {todaySummary.kelasTercatatCount}/{todaySummary.totalKelasCount} rombel diinput
                </span>
              </div>
            </div>
          </div>

          {/* Alert Siswa Rawan / Perlu Perhatian Khusus (Alpha >= 3 Hari) */}
          <div className="rounded-3xl bg-white border border-rose-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Deteksi Dini Siswa Butuh Perhatian Khusus</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
                      {atRiskStudents.length} Siswa Terdeteksi
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Siswa dengan akumulasi Alpha &ge; 3 hari atau ketidakhadiran berulang yang memerlukan koordinasi Guru BK &amp; Wali Kelas.
                  </p>
                </div>
              </div>

              {/* Action Button: Rujuk ke BK */}
              <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold">
                <HeartHandshake className="w-4 h-4 text-purple-700" />
                <span>Integrasi Terpadu Layanan BK Hebat</span>
              </div>
            </div>

            {atRiskStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2 opacity-80" />
                <p className="text-sm font-bold text-slate-800">Kedisiplinan Kehadiran Sangat Baik!</p>
                <p className="text-xs text-slate-500 mt-0.5">Tidak ada peserta didik dengan catatan Alpha &ge; 3 hari saat ini.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3">Kelas</th>
                      <th className="py-2.5 px-3 text-center">Alpha (A)</th>
                      <th className="py-2.5 px-3 text-center">Sakit (S)</th>
                      <th className="py-2.5 px-3 text-center">Izin (I)</th>
                      <th className="py-2.5 px-3">Rekomendasi Tindak Lanjut</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {atRiskStudents.map((item) => (
                      <tr key={item.student.id} className="hover:bg-rose-50/30 transition-colors">
                        <td className="py-3 px-3">
                          <span className="font-extrabold text-slate-900 block">{item.student.nama}</span>
                          <span className="text-[10px] text-slate-400 font-mono">NISN: {item.student.nisn || '-'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-700 text-[11px]">
                            {item.student.kelas}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-900 border border-rose-300">
                            {item.a} Hari
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 font-semibold">{item.s}</td>
                        <td className="py-3 px-3 text-center text-slate-600 font-semibold">{item.i}</td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] font-semibold text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 inline-block">
                            {item.a >= 5 ? 'Panggilan Orang Tua & Home Visit' : item.a >= 3 ? 'Konseling Khusus & Rujukan BK' : 'Peringatan Wali Kelas'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedClass(item.student.kelas);
                              setActiveTab('input');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
                          >
                            <span>Cek Rombel</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Status Input Per Rombel / Kelas */}
          <div className="rounded-3xl bg-white border border-slate-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Status Pengisian Presensi Hari Ini ({selectedDate})
                </h3>
                <p className="text-xs text-slate-500">
                  Klik rombel mana saja untuk langsung mengisi atau meninjau lembar presensi kelas bersangkutan.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {classBreakdown.map(({ cls, hasRecorded, studentCount, h, s, i, a, pct }) => (
                <div
                  key={cls.id}
                  onClick={() => {
                    setSelectedClass(cls.nama);
                    setActiveTab('input');
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group hover:shadow-md active:scale-98 ${
                    hasRecorded
                      ? 'bg-emerald-50/30 border-emerald-200 hover:border-emerald-400'
                      : 'bg-slate-50/60 border-slate-200 hover:border-indigo-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-black text-sm text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {cls.nama}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        Wali: {cls.waliKelas || 'Belum Ditentukan'}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[9.5px] font-black ${
                        hasRecorded
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}
                    >
                      {hasRecorded ? 'Tersimpan' : 'Belum Input'}
                    </span>
                  </div>

                  <div className="space-y-1.5 mt-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                      <span>Kehadiran:</span>
                      <span className={pct >= 90 ? 'text-emerald-700' : pct >= 80 ? 'text-blue-700' : 'text-rose-700'}>
                        {pct}% ({h}/{studentCount} Siswa)
                      </span>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden flex">
                      <div style={{ width: `${pct}%` }} className="h-full bg-emerald-500" />
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-semibold">
                      <span>H: {h}</span>
                      <span>S: {s}</span>
                      <span>I: {i}</span>
                      <span>A: {a}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================
          SECTION 2: LEMBAR INPUT ABSENSI HARIAN PER KELAS (GURU MAPEL & KESISWAAN)
          ============================================================================== */}
      {activeTab === 'input' && (
        <div className="space-y-6">
          {/* Role Notification Banner */}
          {isPureGuruMapel && (
            <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-indigo-500/10 to-transparent border border-emerald-500/30 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-950 font-semibold shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <span className="font-black text-slate-900 block text-xs sm:text-sm">
                    Hak Akses Presensi Guru Mata Pelajaran Aktif
                  </span>
                  <span className="text-[11px] text-slate-600">
                    Silakan pilih rombel dan tandai kehadiran murid pada jam mengajar Anda. Setiap presensi yang disimpan otomatis terhubung langsung secara real-time ke akun Kepala Sekolah untuk monitoring akurat.
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-3 py-1.5 rounded-xl bg-emerald-100 text-emerald-800 font-extrabold text-[11px] border border-emerald-300 flex items-center gap-1.5 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Terhubung ke Dasbor Kepsek</span>
                </span>
              </div>
            </div>
          )}

          {isKepalaSekolah && (
            <div className="p-4 bg-gradient-to-r from-amber-500/15 via-indigo-500/10 to-transparent border border-amber-500/40 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-950 font-semibold shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <span className="font-black text-slate-900 block text-xs sm:text-sm">
                    Mode Supervisi Eksekutif Kepala Sekolah: Monitoring Presensi Real-Time
                  </span>
                  <span className="text-[11px] text-slate-600">
                    Anda sedang memantau rekam kehadiran seluruh peserta didik dari 10 rombel kelas yang diinput oleh Guru Mata Pelajaran dan Tim Kesiswaan secara langsung.
                  </span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/20 text-amber-900 border border-amber-500/30 rounded-xl text-xs font-bold shrink-0">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Sinkron Real-Time ke Supervisi</span>
              </div>
            </div>
          )}

          {/* Top Filter & Control Panel */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                {/* Date Picker */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tanggal Presensi
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Class / Rombel Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Pilihan Rombel / Kelas
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden min-w-[160px]"
                  >
                    {(state.classes || []).map((cls) => (
                      <option key={cls.id} value={cls.nama}>
                        {cls.nama} ({cls.fase || 'Fase E/F'})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Class Metadata Pill */}
                {(() => {
                  const currentClassObj = state.classes?.find(
                    (c) => c.nama.trim().toLowerCase() === selectedClass.trim().toLowerCase()
                  );
                  return (
                    <div className="pt-5 hidden sm:flex items-center gap-2">
                      <span className="px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">
                        Wali Kelas: <strong className="text-slate-900">{currentClassObj?.waliKelas || 'Belum Ditentukan'}</strong>
                      </span>
                      <span className="px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-800">
                        {studentsInSelectedClass.length} Siswa Terdaftar
                      </span>
                    </div>
                  );
                })()}
              </div>

              {/* Mass Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleMarkAllPresent}
                  className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
                >
                  <CheckCheck className="w-4 h-4 text-emerald-700" />
                  <span>Tandai Semua Hadir (H)</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetStatuses}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Reset Pilihan</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={isSaving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Menyimpan...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 text-white" />
                      <span>Simpan Presensi Rombel</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Search & Status Filters */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari siswa berdasarkan nama / NISN..."
                  value={inputSearchQuery}
                  onChange={(e) => setInputSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600 flex-wrap">
                {(['ALL', 'H', 'S', 'I', 'A', 'UNSET'] as const).map((code) => {
                  const label =
                    code === 'ALL'
                      ? 'Semua'
                      : code === 'H'
                      ? 'Hadir'
                      : code === 'S'
                      ? 'Sakit'
                      : code === 'I'
                      ? 'Izin'
                      : code === 'A'
                      ? 'Alpha'
                      : 'Belum Diisi (0)';
                  return (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setInputFilterStatus(code)}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        inputFilterStatus === code
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Count Pill per Rombel */}
            {(() => {
              let countH = 0, countS = 0, countI = 0, countA = 0, countUnset = 0;
              studentsInSelectedClass.forEach((s) => {
                const st = currentRecords[s.id]?.status;
                if (st === 'H') countH++;
                else if (st === 'S') countS++;
                else if (st === 'I') countI++;
                else if (st === 'A') countA++;
                else countUnset++;
              });
              return (
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Status Input Rombel:</span>
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold">
                      Hadir: {countH}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-900 border border-blue-300 font-extrabold">
                      Sakit: {countS}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-extrabold">
                      Izin: {countI}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300 font-extrabold">
                      Alpha: {countA}
                    </span>
                    {countUnset > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 font-extrabold">
                        Belum Diisi: {countUnset}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!existingAttendanceDoc ? (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        Status: Belum Diinput (0 Tercatat)
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Tersimpan di Cloud</span>
                      </span>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Attendance Table */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>Daftar Siswa Kelas {selectedClass}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">Tanggal: {selectedDate}</span>
              </div>
              {existingAttendanceDoc && (
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                  Tersimpan oleh: {existingAttendanceDoc.recordedBy} ({new Date(existingAttendanceDoc.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })})
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50/50">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 w-28">NISN</th>
                    <th className="py-3 px-4">Nama Lengkap Siswa</th>
                    <th className="py-3 px-4 w-16 text-center">L/P</th>
                    <th className="py-3 px-4 w-80 text-center">Status Kehadiran</th>
                    <th className="py-3 px-4 min-w-[200px]">Catatan / Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {studentsInSelectedClass.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-bold text-slate-800">Belum Ada Siswa Terdaftar di Rombel {selectedClass}</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                          Data siswa belum ditemukan untuk kelas {selectedClass} pada Master Data Siswa. Silakan tambahkan atau impor siswa di Master Data Siswa.
                        </p>
                        <p className="text-xs text-slate-400 italic mt-3">
                          Pengelolaan rombel &amp; siswa dapat diakses melalui portal Master Data Siswa.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedInputStudents.map((student, idx) => {
                      const item = currentRecords[student.id] || { status: null, keterangan: '' };
                      const realIndex = (inputPage - 1) * inputPageSize + idx + 1;
                      return (
                        <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-slate-400">
                            {student.noUrut || realIndex}
                          </td>
                          <td className="py-3 px-4 font-mono font-medium text-slate-600">
                            {student.nisn || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block text-xs">
                              {student.nama}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Master Siswa · Kelas {student.kelas}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                student.jenisKelamin === 'L'
                                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                                  : 'bg-pink-50 text-pink-800 border border-pink-200'
                              }`}
                            >
                              {student.jenisKelamin}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {/* Segmented Fast Toggle Button Group (H / S / I / A) */}
                            <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                              {(['H', 'S', 'I', 'A'] as const).map((code) => {
                                const isActive = item.status === code;
                                const config = ATTENDANCE_STATUS[code];
                                return (
                                  <button
                                    key={code}
                                    type="button"
                                    onClick={() => handleSetStudentStatus(student.id, code)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer active:scale-95 ${
                                      isActive
                                        ? config.activeClass
                                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                                    }`}
                                    title={`Tandai ${config.label} (${code})`}
                                  >
                                    <span>{code}</span>
                                    <span className="hidden sm:inline text-[10px] font-semibold ml-1">
                                      {code === 'H' ? 'Hadir' : code === 'S' ? 'Sakit' : code === 'I' ? 'Izin' : 'Alpha'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                            {!item.status && (
                              <span className="block text-[9.5px] text-slate-400 mt-0.5 font-medium">
                                Belum Diisi (0)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="relative">
                              <input
                                type="text"
                                placeholder={
                                  item.status === 'H'
                                    ? 'Keterangan opsional...'
                                    : item.status === 'S'
                                    ? 'Misal: Demam / Surat dokter terlampir'
                                    : item.status === 'I'
                                    ? 'Misal: Acara keluarga / Lomba'
                                    : item.status === 'A'
                                    ? 'Misal: Tanpa kabar / bolos'
                                    : 'Pilih status terlebih dahulu...'
                                }
                                value={item.keterangan || ''}
                                onChange={(e) => handleSetStudentKeterangan(student.id, e.target.value)}
                                className={`w-full px-3 py-1.5 rounded-xl text-xs border transition-colors focus:outline-hidden focus:ring-1 ${
                                  item.status === 'A'
                                    ? 'border-rose-300 bg-rose-50/30 focus:ring-rose-500'
                                    : item.status === 'S'
                                    ? 'border-blue-300 bg-blue-50/30 focus:ring-blue-500'
                                    : item.status === 'I'
                                    ? 'border-amber-300 bg-amber-50/30 focus:ring-amber-500'
                                    : 'border-slate-200 bg-white focus:ring-indigo-500'
                                }`}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Input Table */}
            <PaginationControls
              currentPage={inputPage}
              totalPages={totalInputPages}
              pageSize={inputPageSize}
              totalItems={filteredInputStudents.length}
              onPageChange={setInputPage}
              onPageSizeChange={setInputPageSize}
            />

            {/* Bottom Bar: Tally & Fast Save Action */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
                <span className="text-slate-500">Rekap Kelas {selectedClass}:</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Hadir: {Object.values(currentRecords).filter((r) => r.status === 'H').length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 border border-blue-300">
                  Sakit: {Object.values(currentRecords).filter((r) => r.status === 'S').length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-300">
                  Izin: {Object.values(currentRecords).filter((r) => r.status === 'I').length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 border border-rose-300">
                  Alpha: {Object.values(currentRecords).filter((r) => r.status === 'A').length}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-300">
                  Belum Dipilih: {Object.values(currentRecords).filter((r) => !r.status).length}
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-700">
                  Total: {studentsInSelectedClass.length} Siswa (Master Data)
                </span>
              </div>

              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={isSaving}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan ke Cloud...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 text-white" />
                    <span>Simpan Presensi Kelas {selectedClass}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================
          SECTION 3: REKAPITULASI & LAPORAN SEMESTER (EKSPOR EXCEL & PDF)
          ============================================================================== */}
      {activeTab === 'rekap' && (
        <div className="space-y-6">
          {/* Filter Panel & Preset Controls */}
          <div className="p-5 sm:p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Presets & Dates */}
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Rentang Waktu Laporan
                  </label>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
                    <button
                      type="button"
                      onClick={() => setRekapRangePreset('today')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        rekapRangePreset === 'today' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                      }`}
                    >
                      Hari Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setRekapRangePreset('7days')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        rekapRangePreset === '7days' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                      }`}
                    >
                      7 Hari
                    </button>
                    <button
                      type="button"
                      onClick={() => setRekapRangePreset('month')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        rekapRangePreset === 'month' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                      }`}
                    >
                      Bulan Ini
                    </button>
                    <button
                      type="button"
                      onClick={() => setRekapRangePreset('semester')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        rekapRangePreset === 'semester' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                      }`}
                    >
                      Semester
                    </button>
                    <button
                      type="button"
                      onClick={() => setRekapRangePreset('custom')}
                      className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                        rekapRangePreset === 'custom' ? 'bg-white text-slate-900 shadow-xs' : 'hover:text-slate-900'
                      }`}
                    >
                      Kustom
                    </button>
                  </div>
                </div>

                {/* Custom Date Inputs */}
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="date"
                    value={rekapStartDate}
                    onChange={(e) => {
                      setRekapStartDate(e.target.value);
                      setRekapRangePreset('custom');
                    }}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                  <span className="text-xs text-slate-400 font-bold">s.d</span>
                  <input
                    type="date"
                    value={rekapEndDate}
                    onChange={(e) => {
                      setRekapEndDate(e.target.value);
                      setRekapRangePreset('custom');
                    }}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Class Filter */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Filter Rombel / Kelas
                  </label>
                  <select
                    value={rekapClassFilter}
                    onChange={(e) => setRekapClassFilter(e.target.value)}
                    className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="ALL">Semua Rombel (Seluruh Sekolah)</option>
                    {(state.classes || []).map((cls) => (
                      <option key={cls.id} value={cls.nama}>
                        {cls.nama}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Functional Export Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
                  title="Unduh Rekapitulasi Presensi dalam Format Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                  <span>Ekspor Excel (.xlsx)</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportOfficialPDF}
                  disabled={isGeneratingPDF}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95 disabled:opacity-50"
                  title="Unduh Rekapitulasi Presensi dalam Format Dokumen PDF Resmi (.pdf)"
                >
                  {isGeneratingPDF ? (
                    <>
                      <Loader2 className="w-4 h-4 text-white animate-spin" />
                      <span>Menyusun PDF...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-white" />
                      <span>Unduh PDF Resmi (.pdf)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrintPDF}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
                  title="Cetak Laporan Langsung ke Printer Browser"
                >
                  <Printer className="w-4 h-4 text-white" />
                  <span>Cetak (Print)</span>
                </button>
              </div>
            </div>

            {/* Student Search in Rekap */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari nama atau NISN siswa..."
                  value={rekapSearchQuery}
                  onChange={(e) => setRekapSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="text-xs font-bold text-slate-500">
                Menampilkan <strong className="text-slate-900">{rekapData.list.length}</strong> data siswa dari{' '}
                <strong className="text-slate-900">{rekapData.totalHariTercatat}</strong> hari efektif tercatat
              </div>
            </div>
          </div>

          {/* Aggregate Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10.5px] font-bold text-slate-500 uppercase block">Rata-rata Kehadiran</span>
              <span className="text-2xl font-black text-indigo-900 mt-1 block">
                {rekapData.avgPct}%
              </span>
              <span className="text-[10px] text-slate-400">Total {rekapData.grandTotal} kehadiran</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-xs">
              <span className="text-[10.5px] font-bold text-emerald-800 uppercase block">Total Hadir (H)</span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">
                {rekapData.sumH}
              </span>
              <span className="text-[10px] text-emerald-700">Presensi hadir</span>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 shadow-xs">
              <span className="text-[10.5px] font-bold text-blue-800 uppercase block">Total Sakit (S)</span>
              <span className="text-2xl font-black text-blue-900 mt-1 block">
                {rekapData.sumS}
              </span>
              <span className="text-[10px] text-blue-700">Dengan surat</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs">
              <span className="text-[10.5px] font-bold text-amber-800 uppercase block">Total Izin (I)</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">
                {rekapData.sumI}
              </span>
              <span className="text-[10px] text-amber-700">Izin tertulis</span>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs">
              <span className="text-[10.5px] font-bold text-rose-800 uppercase block">Total Alpha (A)</span>
              <span className="text-2xl font-black text-rose-900 mt-1 block">
                {rekapData.sumA}
              </span>
              <span className="text-[10px] text-rose-700">Tanpa keterangan</span>
            </div>
          </div>

          {/* Printable Official Letterhead Header for Print Mode */}
          <div className="hidden print:block print:mb-6 border-b-2 border-black pb-4 text-center">
            <h2 className="text-lg font-black uppercase tracking-wide">
              {state.schoolInfo?.provinsiText || 'PEMERINTAH PROVINSI LAMPUNG'}
            </h2>
            <h3 className="text-base font-black uppercase">
              {state.schoolInfo?.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
            </h3>
            <p className="text-xs text-slate-700 mt-1">
              {state.schoolInfo?.alamat || 'Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung'}
            </p>
            <div className="mt-4 pt-2 border-t border-slate-300">
              <h4 className="text-sm font-black uppercase tracking-wider">
                LAPORAN REKAPITULASI KEHADIRAN SISWA
              </h4>
              <p className="text-xs text-slate-600">
                Tahun Ajaran: {state.schoolInfo?.tahunAjaranAktif || '2026/2027'} · Semester: {state.schoolInfo?.semesterAktif || 'Ganjil'} · Rentang: {rekapStartDate} s.d {rekapEndDate}
              </p>
            </div>
          </div>

          {/* Rekap Table */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-black uppercase text-[10px] bg-slate-50/80">
                    <th className="py-3 px-3 w-12 text-center">No</th>
                    <th className="py-3 px-3 w-28">NISN</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-3 w-20">Kelas</th>
                    <th className="py-3 px-3 w-12 text-center">L/P</th>
                    <th className="py-3 px-3 text-center bg-emerald-50/60 text-emerald-900">H (Hadir)</th>
                    <th className="py-3 px-3 text-center bg-blue-50/60 text-blue-900">S (Sakit)</th>
                    <th className="py-3 px-3 text-center bg-amber-50/60 text-amber-900">I (Izin)</th>
                    <th className="py-3 px-3 text-center bg-rose-50/60 text-rose-900">A (Alpha)</th>
                    <th className="py-3 px-3 text-center">Total Hari</th>
                    <th className="py-3 px-4 text-center">% Kehadiran</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rekapData.list.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-10 text-center text-slate-500 font-medium">
                        Tidak ada data rekapitulasi presensi ditemukan untuk filter dan rentang waktu ini.
                      </td>
                    </tr>
                  ) : (
                    paginatedRekapList.map((item, idx) => {
                      const realIndex = (rekapPage - 1) * rekapPageSize + idx + 1;
                      return (
                        <tr key={item.student.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                            {realIndex}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-600">
                            {item.student.nisn || '-'}
                          </td>
                          <td className="py-2.5 px-4 font-bold text-slate-900">
                            {item.student.nama}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700 text-[10.5px]">
                              {item.student.kelas}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-600">
                            {item.student.jenisKelamin}
                          </td>
                          <td className="py-2.5 px-3 text-center font-extrabold text-emerald-700 bg-emerald-50/20">
                            {item.h}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-blue-700 bg-blue-50/20">
                            {item.s}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-amber-700 bg-amber-50/20">
                            {item.i}
                          </td>
                          <td className="py-2.5 px-3 text-center font-extrabold text-rose-700 bg-rose-50/20">
                            {item.a}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                            {item.total}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span
                                className={`font-black text-xs ${
                                  item.pct >= 90
                                    ? 'text-emerald-700'
                                    : item.pct >= 80
                                    ? 'text-blue-700'
                                    : item.pct >= 70
                                    ? 'text-amber-700'
                                    : 'text-rose-700'
                                }`}
                              >
                                {item.pct}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                                item.total === 0
                                  ? 'bg-slate-100 text-slate-500 border border-slate-200'
                                  : item.pct >= 90
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.pct >= 80
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.pct >= 70
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.total === 0
                                ? 'Belum Ada Absensi (0)'
                                : item.pct >= 90
                                ? 'Sangat Baik'
                                : item.pct >= 80
                                ? 'Baik'
                                : item.pct >= 70
                                ? 'Cukup'
                                : 'Perlu Perhatian'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for Rekap Table */}
            <PaginationControls
              currentPage={rekapPage}
              totalPages={totalRekapPages}
              pageSize={rekapPageSize}
              totalItems={rekapData.list.length}
              onPageChange={setRekapPage}
              onPageSizeChange={setRekapPageSize}
            />

            {/* Print Signatures Block */}
            <div className="hidden print:grid grid-cols-2 gap-8 p-8 border-t border-black mt-8 text-center text-xs">
              <div>
                <p>Mengetahui,</p>
                <p className="font-bold">Kepala SMAN 3 Tumijajar</p>
                <div className="h-20" />
                <p className="font-bold underline">{state.schoolInfo?.kepalaSekolah || 'Drs. Puji Astuti, M.Pd.'}</p>
                <p className="text-[10px]">NIP. {state.schoolInfo?.nipKepalaSekolah || '-'}</p>
              </div>

              <div>
                <p>Tumijajar, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p className="font-bold">Koordinator Tim Kesiswaan / Guru Piket</p>
                <div className="h-20" />
                <p className="font-bold underline">{currentUser?.nama || 'Petugas Kesiswaan'}</p>
                <p className="text-[10px]">NIP. {currentUser?.nip || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==============================================================================
          SECTION 4: DETEKSI DINI & SISWA RAWAN KEHADIRAN (PERHATIAN KHUSUS & BK)
          ============================================================================== */}
      {activeTab === 'rawan' && (
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-rose-200 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 pb-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Deteksi Dini Siswa Butuh Perhatian Khusus &amp; Rujukan BK</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-rose-600 text-white">
                      {atRiskStudents.length} Siswa Terdeteksi
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Siswa dengan akumulasi Alpha &ge; 3 hari atau ketidakhadiran berulang yang memerlukan koordinasi Guru BK &amp; Wali Kelas.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3.5 py-2 bg-purple-50 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold">
                <HeartHandshake className="w-4 h-4 text-purple-700" />
                <span>Tindak Lanjut oleh Guru BK</span>
              </div>
            </div>

            {atRiskStudents.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-3 opacity-90" />
                <p className="text-base font-black text-slate-800">Kedisiplinan Kehadiran Sangat Baik!</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Tidak ada peserta didik dengan catatan Alpha &ge; 3 hari saat ini. Seluruh siswa terdaftar berstatus presensi normal.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-600 font-black uppercase text-[10px] bg-slate-50/80">
                        <th className="py-3 px-4 w-12 text-center">No</th>
                        <th className="py-3 px-4">Nama Siswa</th>
                        <th className="py-3 px-3 w-20">Kelas</th>
                        <th className="py-3 px-3 text-center bg-rose-50 text-rose-900">Alpha (A)</th>
                        <th className="py-3 px-3 text-center">Sakit (S)</th>
                        <th className="py-3 px-3 text-center">Izin (I)</th>
                        <th className="py-3 px-4">Rekomendasi Tindak Lanjut</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedRawanList.map((item, idx) => {
                        const realIndex = (rawanPage - 1) * rawanPageSize + idx + 1;
                        return (
                          <tr key={item.student.id} className="hover:bg-rose-50/30 transition-colors">
                            <td className="py-3 px-4 text-center font-bold text-slate-400">
                              {realIndex}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-slate-900 block">{item.student.nama}</span>
                              <span className="text-[10px] text-slate-400 font-mono">NISN: {item.student.nisn || '-'}</span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="px-2 py-0.5 rounded-lg bg-slate-100 font-bold text-slate-700 text-[11px]">
                                {item.student.kelas}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-100 text-rose-900 border border-rose-300">
                                {item.a} Hari
                              </span>
                            </td>
                            <td className="py-3 px-3 text-center text-slate-600 font-semibold">{item.s}</td>
                            <td className="py-3 px-3 text-center text-slate-600 font-semibold">{item.i}</td>
                            <td className="py-3 px-3">
                              <span className="text-xs font-bold text-rose-900 block">
                                {item.a >= 5 ? 'Panggilan Orang Tua & Home Visit' : item.a >= 3 ? 'Konseling Khusus & Rujukan BK' : 'Peringatan Wali Kelas'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedClass(item.student.kelas);
                                  setActiveTab('input');
                                }}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                              >
                                <span>Cek Rombel</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls for Rawan Table */}
                <PaginationControls
                  currentPage={rawanPage}
                  totalPages={totalRawanPages}
                  pageSize={rawanPageSize}
                  totalItems={atRiskStudents.length}
                  onPageChange={setRawanPage}
                  onPageSizeChange={setRawanPageSize}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Kosongkan Semua Presensi (Reset ke 0) */}
      <AnimatePresence>
        {isClearAllModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    Kosongkan Semua Data Absensi?
                  </h3>
                  <p className="text-xs text-slate-500">
                    Seluruh catatan presensi siswa akan direset ke 0.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 leading-relaxed space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Data Presensi Akan Dibuat 0</span>
                </p>
                <p className="text-[11px] text-rose-700">
                  Semua rekaman presensi kelas harian akan dikosongkan. Data siswa ({state.students?.length} siswa) dan kelas ({state.classes?.length} rombel) pada Master Data Siswa tetap terjaga aman, siap digunakan untuk input presensi baru.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClearAllModalOpen(false)}
                  disabled={isClearingAll}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAll}
                  disabled={isClearingAll}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isClearingAll ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengosongkan...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Ya, Kosongkan Semua (0)</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
