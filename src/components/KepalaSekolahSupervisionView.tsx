import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldCheck,
  ClipboardCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  Users,
  Search,
  Filter,
  Printer,
  Sparkles,
  Calendar,
  Building2,
  Clock,
  Eye,
  Edit3,
  Award,
  TrendingUp,
  ChevronRight,
  BookOpen,
  Send,
  Download,
  X,
  FileCheck,
  Check,
  Info,
  RefreshCw,
  FolderOpen,
  ArrowRight,
  UserCheck,
  User,
  GraduationCap,
  Layers,
  ChevronDown,
  Trash2,
  ExternalLink,
  LayoutDashboard,
  FileSpreadsheet,
  UploadCloud,
  Target,
  Sliders,
  ChevronUp,
  CalendarDays,
  Calculator,
  Activity,
  Lightbulb,
  HeartHandshake,
  Smile,
  ShieldAlert,
  Laptop,
  Key,
  Compass,
  FileQuestion,
  ScanEye,
  Zap,
  Radio,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FormattedQuestionText, renderInlineFormattedText } from './FormattedQuestionText';
import {
  BeritaAcaraItem,
  SupervisiCatatan,
  Assessment,
  Teacher,
  Student,
  Submission,
  RaporPendidikanDoc,
  RaporPendidikanIndicator,
  RaporPendidikanRekomendasi,
  BKProfile,
  BKEmotionLog,
  BKReferral,
  BKCounselingLog,
  BKHabitLog,
  TeacherExamAssignment,
  CalendarEvent,
} from '../types';
import { AuthenticProofModal } from './AuthenticProofModal';
import { getKKTPKategori, formatAcademicTitles } from '../utils/kktpHelper';
import { exportSupervisionReportPDF } from '../utils/pdfExport';
import { calculate2026RaporPendidikanEstimation } from '../utils/raportPendidikanEstimator';
import { cleanCanonicalClass } from '../utils/classHelper';

export type SupervisiTabType =
  | 'ringkasan-eksekutif'
  | 'presensi-monitoring'
  | 'berita-acara'
  | 'guru-matrix'
  | 'asesmen-guru'
  | 'rekap-nilai'
  | 'bukti-otentik'
  | 'rapor-pendidikan'
  | 'bk-monitoring'
  | 'catatan';

export const KepalaSekolahSupervisionView: React.FC = () => {
  const {
    state,
    verifyBeritaAcaraKepsek,
    saveSupervisiCatatan,
    deleteSupervisiCatatan,
    showToast,
    currentView,
    setCurrentView,
    setSelectedModule,
    setActiveLitNumTab,
    activeSupervisiTab,
    setActiveSupervisiTab,
  } = useApp();

  // Navigation Tabs for Executive Monitoring
  const activeTab: SupervisiTabType = (activeSupervisiTab as SupervisiTabType) || 'ringkasan-eksekutif';

  const tabToViewMap: Record<SupervisiTabType, string> = useMemo(() => ({
    'ringkasan-eksekutif': 'supervisi-dashboard',
    'presensi-monitoring': 'supervisi-presensi',
    'berita-acara': 'supervisi-berita-acara',
    'guru-matrix': 'supervisi-guru',
    'asesmen-guru': 'supervisi-asesmen',
    'rekap-nilai': 'supervisi-nilai',
    'bukti-otentik': 'supervisi-bukti',
    'rapor-pendidikan': 'supervisi-rapor',
    'bk-monitoring': 'supervisi-bk',
    'catatan': 'supervisi-catatan',
  }), []);

  const setActiveTab = (tab: SupervisiTabType) => {
    setActiveSupervisiTab(tab);
    const targetView = tabToViewMap[tab];
    if (targetView && currentView !== targetView) {
      setCurrentView(targetView);
    }
  };

  useEffect(() => {
    if (currentView === 'supervisi-dashboard' && activeTab !== 'ringkasan-eksekutif') {
      setActiveSupervisiTab('ringkasan-eksekutif');
    } else if (currentView === 'supervisi-presensi' && activeTab !== 'presensi-monitoring') {
      setActiveSupervisiTab('presensi-monitoring');
    } else if (currentView === 'supervisi-berita-acara' && activeTab !== 'berita-acara') {
      setActiveSupervisiTab('berita-acara');
    } else if (currentView === 'supervisi-guru' && activeTab !== 'guru-matrix') {
      setActiveSupervisiTab('guru-matrix');
    } else if (currentView === 'supervisi-asesmen' && activeTab !== 'asesmen-guru') {
      setActiveSupervisiTab('asesmen-guru');
    } else if (currentView === 'supervisi-nilai' && activeTab !== 'rekap-nilai') {
      setActiveSupervisiTab('rekap-nilai');
    } else if (currentView === 'supervisi-bukti' && activeTab !== 'bukti-otentik') {
      setActiveSupervisiTab('bukti-otentik');
    } else if (currentView === 'supervisi-rapor' && activeTab !== 'rapor-pendidikan') {
      setActiveSupervisiTab('rapor-pendidikan');
    } else if (currentView === 'supervisi-bk' && activeTab !== 'bk-monitoring') {
      setActiveSupervisiTab('bk-monitoring');
    } else if (currentView === 'supervisi-catatan' && activeTab !== 'catatan') {
      setActiveSupervisiTab('catatan');
    }
  }, [currentView, activeTab, setActiveSupervisiTab]);

  // Real-time Presence Monitoring Date State
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedMonitorDate, setSelectedMonitorDate] = useState<string>(todayStr);

  // Tab 1 (Berita Acara) States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'VERIFIED' | 'PENDING'>('ALL');
  const [selectedBA, setSelectedBA] = useState<BeritaAcaraItem | null>(null);
  const [selectedBAPreview, setSelectedBAPreview] = useState<BeritaAcaraItem | null>(null);
  const [kepsekNoteInput, setKepsekNoteInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Tab 2 (Guru Matrix) States & Modals
  const [teacherSearch, setTeacherSearch] = useState('');
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<Teacher | null>(null);
  const [teacherSpecificNote, setTeacherSpecificNote] = useState('');

  // Tab 3 (Asesmen Guru) States & Modals
  const [assessmentFilterGuru, setAssessmentFilterGuru] = useState<string>('ALL');
  const [assessmentFilterMapel, setAssessmentFilterMapel] = useState<string>('ALL');
  const [assessmentFilterJenis, setAssessmentFilterJenis] = useState<string>('ALL');
  const [selectedAssessmentForQuestions, setSelectedAssessmentForQuestions] = useState<Assessment | null>(null);
  const [selectedAssessmentForGrades, setSelectedAssessmentForGrades] = useState<Assessment | null>(null);
  const [assessmentSubTab, setAssessmentSubTab] = useState<'bank-soal' | 'penugasan-cbt'>('bank-soal');

  // Tab 4 (Rekap Nilai) States
  const [selectedGradeClass, setSelectedGradeClass] = useState<string>('ALL');
  const [selectedGradeMapel, setSelectedGradeMapel] = useState<string>('ALL');

  // Tab 5 (Bukti Otentik) States
  const [selectedProofData, setSelectedProofData] = useState<{ submission: Submission; assessment: Assessment; student?: Student } | null>(null);
  const [selectedAssessmentForProof, setSelectedAssessmentForProof] = useState<string>('ALL');

  // Tab BK Monitoring States
  const [bkSearchQuery, setBkSearchQuery] = useState('');
  const [bkFilterCategory, setBkFilterCategory] = useState<'ALL' | 'EMOSI' | 'KERAWANAN' | 'KONSELING' | 'RUJUKAN' | 'KARIR'>('ALL');
  const [selectedBKProfileForDetail, setSelectedBKProfileForDetail] = useState<BKProfile | null>(null);

  // Tab 6 (Catatan Supervisi) Form States
  const [catatanUmum, setCatatanUmum] = useState('');
  const [rekomendasi, setRekomendasi] = useState('');
  const [pembinaanGuru, setPembinaanGuru] = useState('');
  const [isSavingCatatan, setIsSavingCatatan] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Tab 7 (Rapor Pendidikan & Proyeksi Mutu 2026) States
  const [selectedRaporDocId, setSelectedRaporDocId] = useState<string>('LATEST');
  const [raporIndicatorCategory, setRaporIndicatorCategory] = useState<string>('ALL');
  const [raporIndicatorSearch, setRaporIndicatorSearch] = useState<string>('');
  const [raporActiveSubTab, setRaporActiveSubTab] = useState<'estimasi2026' | 'indikator' | 'rekomendasi'>('estimasi2026');
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number>(1); // Default: Realistis

  const school = state?.schoolInfo;
  const beritaAcaraList = state?.beritaAcaraList || [];
  const assessments = state?.assessments || [];
  const teachers = state?.teachers || [];
  const students = state?.students || [];
  const supervisiCatatanList = state?.supervisiCatatanList || [];
  const raportDocs = state?.raportPendidikanDocs || [];
  const litnumRecords = state?.litnumRecords || [];
  const bkProfiles = state?.bkProfiles || [];
  const bkEmotionLogs = state?.bkEmotionLogs || [];
  const bkReferrals = state?.bkReferrals || [];
  const bkCounselingLogs = state?.bkCounselingLogs || [];
  const bkHabitLogs = state?.bkHabitLogs || [];
  const examAssignments: TeacherExamAssignment[] = state?.examManagement?.teacherAssignments || [];
  const calendarEvents = state?.calendarEvents || [];

  // Aggregated BK Emotion Distribution
  const emotionDistribution = useMemo(() => {
    const counts = { senang: 0, tenang: 0, cemas: 0, sedih: 0, lelah: 0 };
    bkEmotionLogs.forEach((log) => {
      const e = (log.emotionCategory || '').toLowerCase();
      if (e.includes('gembira') || e.includes('senang') || e.includes('bahagia')) counts.senang++;
      else if (e.includes('tenang') || e.includes('damai')) counts.tenang++;
      else if (e.includes('cemas') || e.includes('marah')) counts.cemas++;
      else if (e.includes('sedih')) counts.sedih++;
      else if (e.includes('lelah')) counts.lelah++;
      else counts.tenang++;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return { counts, total };
  }, [bkEmotionLogs]);

  // Aggregated CBT Exam Assignments Metrics
  const examAssignmentMetrics = useMemo(() => {
    const list: TeacherExamAssignment[] = state?.examManagement?.teacherAssignments || [];
    const siap = list.filter((a: TeacherExamAssignment) => a.status === 'Selesai Digarap' || a.status === 'Telah Diverifikasi').length;
    const proses = list.filter((a: TeacherExamAssignment) => a.status === 'Progres Penggarapan').length;
    const belum = list.filter((a: TeacherExamAssignment) => a.status === 'Draft' || !a.status).length;
    return { total: list.length, siap, proses, belum, list };
  }, [state?.examManagement]);

  // Active Selected Rapor Pendidikan Document
  const activeRaporDoc = useMemo(() => {
    if (raportDocs.length === 0) return null;
    if (selectedRaporDocId === 'LATEST') {
      return [...raportDocs].sort((a, b) => b.tahun - a.tahun)[0];
    }
    return raportDocs.find((d) => d.id === selectedRaporDocId) || raportDocs[0];
  }, [raportDocs, selectedRaporDocId]);

  // Real-time Empirical Estimations & Projections for 2026 Kemendikdasmen Rapor Pendidikan
  const estimation2026 = useMemo(() => {
    return calculate2026RaporPendidikanEstimation(litnumRecords, raportDocs);
  }, [litnumRecords, raportDocs]);

  // Real-Time Presence Monitoring Data for Kepala Sekolah
  const presenceMonitoringData = useMemo(() => {
    const dailyList = state?.dailyAttendances || [];
    const docsForDate = dailyList.filter((a) => a.tanggal === selectedMonitorDate);

    let totalHadir = 0;
    let totalSakit = 0;
    let totalIzin = 0;
    let totalAlpha = 0;

    docsForDate.forEach((doc) => {
      doc.records?.forEach((r) => {
        if (r.status === 'H') totalHadir++;
        else if (r.status === 'S') totalSakit++;
        else if (r.status === 'I') totalIzin++;
        else if (r.status === 'A') totalAlpha++;
      });
    });

    const totalTercatat = totalHadir + totalSakit + totalIzin + totalAlpha;
    const totalSiswaSekolah = (state?.students || []).length || 323;
    const persenKehadiran = totalTercatat > 0 ? Math.round((totalHadir / totalTercatat) * 100) : 0;

    // Breakdown for all classes in school
    const classBreakdown = (state?.classes || []).map((cls) => {
      const targetClean = cleanCanonicalClass(cls.nama);
      const doc = docsForDate.find((a) => cleanCanonicalClass(a.kelas) === targetClean);
      const studentCount = (state?.students || []).filter(
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
        recordedBy: doc?.recordedBy || 'Belum diinput',
        updatedAt: doc?.updatedAt,
        studentCount,
        h,
        s,
        i,
        a,
        totalRec,
        pct,
      };
    });

    // At-Risk Students across all attendance documents
    const studentMap: Record<string, { student: Student; h: number; s: number; i: number; a: number }> = {};
    (state?.students || []).forEach((s) => {
      studentMap[s.id] = { student: s, h: 0, s: 0, i: 0, a: 0 };
    });

    dailyList.forEach((doc) => {
      doc.records?.forEach((r) => {
        if (studentMap[r.studentId]) {
          if (r.status === 'H') studentMap[r.studentId].h++;
          else if (r.status === 'S') studentMap[r.studentId].s++;
          else if (r.status === 'I') studentMap[r.studentId].i++;
          else if (r.status === 'A') studentMap[r.studentId].a++;
        }
      });
    });

    const atRiskStudents = Object.values(studentMap)
      .filter((item) => item.a >= 3 || (item.a + item.s + item.i >= 5 && item.a >= 2))
      .sort((a, b) => b.a - a.a || (b.s + b.i) - (a.s + a.i));

    return {
      totalSiswaSekolah,
      totalTercatat,
      totalHadir,
      totalSakit,
      totalIzin,
      totalAlpha,
      persenKehadiran,
      kelasTercatatCount: docsForDate.length,
      totalKelasCount: (state?.classes || []).length || 10,
      classBreakdown,
      atRiskStudents,
    };
  }, [state?.dailyAttendances, state?.students, state?.classes, selectedMonitorDate]);

  // Filtered Rapor Indicators
  const filteredRaporIndicators = useMemo(() => {
    if (!activeRaporDoc?.indicators) return [];
    return activeRaporDoc.indicators.filter((ind) => {
      const q = raporIndicatorSearch.toLowerCase();
      const matchesSearch =
        (ind.namaIndikator || '').toLowerCase().includes(q) ||
        (ind.code || '').toLowerCase().includes(q) ||
        (ind.kategori || '').toLowerCase().includes(q);

      if (!matchesSearch) return false;
      if (raporIndicatorCategory === 'ALL') return true;
      return (ind.kategori || '').toLowerCase().includes(raporIndicatorCategory.toLowerCase());
    });
  }, [activeRaporDoc, raporIndicatorSearch, raporIndicatorCategory]);

  // Metrics Calculations
  const totalAssessments = assessments.length;
  const totalBeritaAcara = beritaAcaraList.length;
  const verifiedBA = beritaAcaraList.filter((b) => b.verifiedByKepsek || b.verifiedStatus === 'Verified').length;
  const pendingBA = totalBeritaAcara - verifiedBA;

  // Total students present / absent from Berita Acara
  const totalHadirBA = beritaAcaraList.reduce((acc, b) => acc + (b.jumlahPesertaHadir || 0), 0);
  const totalSeharusnyaBA = beritaAcaraList.reduce((acc, b) => acc + (b.jumlahPesertaSeharusnya || 0), 0);
  const attendancePercentage = totalSeharusnyaBA > 0 ? Math.round((totalHadirBA / totalSeharusnyaBA) * 100) : 100;

  // School pass rate from Submissions
  let totalSubmissions = 0;
  let totalTuntas = 0;
  let totalScoreAll = 0;
  assessments.forEach((a) => {
    if (a.submissions && a.submissions.length > 0) {
      totalSubmissions += a.submissions.length;
      a.submissions.forEach((s) => {
        totalScoreAll += s.nilaiAkhir;
        if (s.tuntas) totalTuntas++;
      });
    }
  });
  const passedSubmissions = totalTuntas;
  const passRate = totalSubmissions > 0 ? Math.round((totalTuntas / totalSubmissions) * 100) : 100;
  const averageSchoolScore = totalSubmissions > 0 ? Math.round(totalScoreAll / totalSubmissions) : 78;

  // Teacher Matrix Data Preparation
  const teacherMatrix = useMemo(() => {
    return teachers.map((t) => {
      const teacherAssessments = assessments.filter(
        (a) =>
          a.guruId === t.id ||
          a.guruPengampu === t.nama ||
          (Array.isArray(t.mataPelajaran) &&
            t.mataPelajaran.some(
              (m) => m && m !== 'Semua Mata Pelajaran' && m.toLowerCase().trim() === a.mataPelajaran.toLowerCase().trim()
            ))
      );
      let teacherSubs = 0;
      let teacherTuntas = 0;
      let totalNilai = 0;

      teacherAssessments.forEach((a) => {
        if (a.submissions) {
          teacherSubs += a.submissions.length;
          a.submissions.forEach((s) => {
            totalNilai += s.nilaiAkhir;
            if (s.tuntas) teacherTuntas++;
          });
        }
      });

      const avgScore = teacherSubs > 0 ? Math.round(totalNilai / teacherSubs) : 0;
      const tPassRate = teacherSubs > 0 ? Math.round((teacherTuntas / teacherSubs) * 100) : 0;

      return {
        id: t.id,
        nama: t.nama,
        nip: t.nip,
        username: t.username,
        fotoUrl: t.fotoUrl,
        status: t.status,
        mataPelajaran: t.mataPelajaran,
        mapelStr: t.mataPelajaran && t.mataPelajaran.length > 0 ? t.mataPelajaran.join(', ') : 'Semua Mapel',
        totalSoal: teacherAssessments.length,
        totalKoreksi: teacherSubs,
        avgScore,
        passRate: tPassRate,
        assessments: teacherAssessments,
      };
    });
  }, [teachers, assessments]);

  // Filtered Berita Acara
  const filteredBA = useMemo(() => {
    return beritaAcaraList.filter((b) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        (b.mataPelajaran || '').toLowerCase().includes(q) ||
        (b.kelasRuang || '').toLowerCase().includes(q) ||
        (b.pengawas1 || '').toLowerCase().includes(q) ||
        (b.catatanKejadianKhusus || '').toLowerCase().includes(q);

      if (!matchesQuery) return false;
      if (statusFilter === 'VERIFIED') return b.verifiedByKepsek || b.verifiedStatus === 'Verified';
      if (statusFilter === 'PENDING') return !b.verifiedByKepsek && b.verifiedStatus !== 'Verified';
      return true;
    });
  }, [beritaAcaraList, searchQuery, statusFilter]);

  // Unique lists for filters
  const uniqueSubjects = useMemo(() => {
    const set = new Set<string>();
    assessments.forEach((a) => {
      if (a.mataPelajaran) set.add(a.mataPelajaran);
    });
    return Array.from(set).sort();
  }, [assessments]);

  const uniqueClasses = useMemo(() => {
    const set = new Set<string>();
    assessments.forEach((a) => {
      if (a.kelas) set.add(a.kelas);
    });
    students.forEach((s) => {
      if (s.kelas) set.add(s.kelas);
    });
    return Array.from(set).sort();
  }, [assessments, students]);

  // Handler: Verifikasi Berita Acara
  const handleOpenVerifyModal = (ba: BeritaAcaraItem) => {
    setSelectedBA(ba);
    setKepsekNoteInput(ba.catatanKepsek || '');
  };

  const handleSaveVerification = async (verifiedStatus: boolean) => {
    if (!selectedBA) return;
    setIsVerifying(true);
    await verifyBeritaAcaraKepsek(selectedBA.id, verifiedStatus, kepsekNoteInput);
    setIsVerifying(false);
    setSelectedBA(null);
  };

  // Handler: Simpan Catatan Supervisi Umum
  const handleSaveCatatanSupervisi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catatanUmum.trim() && !rekomendasi.trim()) {
      showToast('Form Kosong', 'Harap isi setidaknya catatan umum atau rekomendasi supervisi.', 'error');
      return;
    }
    setIsSavingCatatan(true);
    const newEntry: SupervisiCatatan = {
      id: `sup-${Date.now()}`,
      tanggal: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      tahunAjaran: school?.tahunAjaranAktif || '2025/2026',
      semester: school?.semesterAktif || 'Ganjil',
      catatanUmum,
      rekomendasi,
      pembinaanGuru,
      status: 'Diterbitkan',
      updatedAt: new Date().toISOString(),
    };
    await saveSupervisiCatatan(newEntry);
    setIsSavingCatatan(false);
    setCatatanUmum('');
    setRekomendasi('');
    setPembinaanGuru('');
  };

  // Handler: Simpan Catatan Supervisi Langsung untuk Guru Tertentu
  const handleSaveTeacherSpecificNote = async (teacher: Teacher) => {
    if (!teacherSpecificNote.trim()) {
      showToast('Catatan Kosong', 'Harap isi catatan pembinaan untuk guru ini.', 'error');
      return;
    }
    const newEntry: SupervisiCatatan = {
      id: `sup-guru-${Date.now()}`,
      tanggal: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      tahunAjaran: school?.tahunAjaranAktif || '2025/2026',
      semester: school?.semesterAktif || 'Ganjil',
      catatanUmum: `Supervisi Kinerja Akademik Guru: ${teacher.nama} (${teacher.mataPelajaran?.join(', ') || 'Semua Mapel'})`,
      rekomendasi: teacherSpecificNote,
      pembinaanGuru: `Ditujukan langsung kepada ${teacher.nama} (NIP: ${teacher.nip || '-'})`,
      status: 'Diterbitkan',
      updatedAt: new Date().toISOString(),
    };
    await saveSupervisiCatatan(newEntry);
    setTeacherSpecificNote('');
    showToast('Tersimpan', `Catatan supervisi untuk ${teacher.nama} berhasil diterbitkan.`, 'success');
  };

  // Handler: Export Laporan Supervisi Resmi PDF
  const handleExportSupervisionPDF = async () => {
    if (!school) return;
    try {
      setIsExportingPDF(true);
      await exportSupervisionReportPDF(
        school,
        {
          totalAssessments,
          passRate,
          attendancePercentage,
          totalBeritaAcara,
          verifiedBA,
          pendingBA,
          totalTeachers: teachers.length,
        },
        beritaAcaraList,
        teacherMatrix.map((t) => ({
          nama: t.nama,
          nip: t.nip,
          mapel: t.mapelStr,
          totalSoal: t.totalSoal,
          totalKoreksi: t.totalKoreksi,
          avgScore: t.avgScore,
          passRate: t.passRate,
        })),
        supervisiCatatanList
      );
      showToast('Ekspor Berhasil', 'Laporan supervisi resmi Kepala Sekolah berhasil diunduh.', 'success');
    } catch (err) {
      console.error('Supervision PDF export error:', err);
      showToast('Gagal Ekspor PDF', 'Terjadi kesalahan saat membuat file PDF supervisi.', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* MENU KHUSUS DASHBOARD UTAMA SUPERVISI EKSEKUTIF KEPALA SEKOLAH            */}
      {/* (Hanya tampil di Dashboard Utama sesuai permintaan presisi Screenshot 184) */}
      {/* ========================================================================= */}
      {activeTab === 'ringkasan-eksekutif' && (
        <div className="space-y-6">
          {/* Executive Header Banner - Khusus Tampil di Dashboard Utama (Screenshot 184) */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-indigo-900/50 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-6">
              {/* Bagian Atas: Identitas & Informasi Supervisi */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5 shadow-xs">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    DASHBOARD SUPERVISI EKSEKUTIF KEPALA SEKOLAH
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    T.P. {school?.tahunAjaranAktif || '2026/2027'} ({school?.semesterAktif || 'Ganjil'})
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Data Real-Time Terhubung 100%</span>
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  Supervisi Akademik &amp; Evaluasi Penilaian Ujian
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-4xl">
                  Pusat komando pengawasan langsung Kepala Sekolah: memonitor hasil kerja guru secara real-time, audit Berita Acara, evaluasi kualitas butir soal, presensi ujian, serta rekapitulasi capaian ketuntasan belajar {school?.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}.
                </p>

                <div className="pt-1 flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-300">
                  <div className="flex items-center gap-1.5 font-medium bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60">
                    <Building2 className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>Kepala Sekolah: <strong className="text-white">{formatAcademicTitles(school?.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.')}</strong></span>
                  </div>
                  <div className="flex items-center gap-1.5 font-medium bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60">
                    <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>NIP: <strong className="text-white">{school?.nipKepalaSekolah || '19850202 200804 2 003'}</strong></span>
                  </div>
                </div>
              </div>

              {/* Bagian Bawah: Susunan Tombol Aksi Rapi Terstruktur di Bawah (Tidak Terpotong) */}
              <div className="pt-5 border-t border-indigo-800/60">
                <div className="flex items-center justify-between mb-3 text-xs">
                  <span className="font-bold uppercase tracking-wider text-indigo-300 text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    TOMBOL AKSI &amp; DOKUMEN SUPERVISI RESMI
                  </span>
                  <span className="text-slate-400 text-[11px] hidden sm:inline">
                    Pintasan eksekutif Kepala Sekolah
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModule('portal');
                    }}
                    className="p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-750 text-slate-100 border border-slate-700/80 shadow-lg hover:border-sky-500/50 transition-all flex items-center gap-3 cursor-pointer active:scale-95 text-left group"
                    title="Kembali ke Portal Layanan Akademik"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                      <LayoutDashboard className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-white group-hover:text-sky-300 transition-colors">
                        Kembali ke Portal
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        Pilihan Modul Layanan
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('catatan')}
                    className="p-3.5 rounded-2xl bg-indigo-600/90 hover:bg-indigo-600 text-white border border-indigo-500/60 shadow-lg hover:border-indigo-400 transition-all flex items-center gap-3 cursor-pointer active:scale-95 text-left group"
                    title="Tulis Catatan Pembinaan Resmi Kepala Sekolah"
                  >
                    <div className="w-10 h-10 rounded-xl bg-white/20 text-white flex items-center justify-center shrink-0 group-hover:bg-white group-hover:text-indigo-600 transition-colors">
                      <Edit3 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-white">
                        Catatan Pembinaan
                      </div>
                      <div className="text-[11px] text-indigo-200 truncate">
                        Disposisi Resmi Kepsek
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportSupervisionPDF}
                    disabled={isExportingPDF}
                    className="p-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 border border-amber-400 shadow-lg transition-all flex items-center gap-3 cursor-pointer active:scale-95 disabled:opacity-50 text-left group"
                    title="Unduh Berkas Laporan Hasil Supervisi Kepala Sekolah Standar F4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-950/20 text-slate-950 flex items-center justify-center shrink-0 group-hover:bg-slate-950 group-hover:text-amber-400 transition-colors">
                      {isExportingPDF ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <Download className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-black text-xs text-slate-950">
                        {isExportingPDF ? 'Membuat PDF...' : 'Unduh Laporan PDF'}
                      </div>
                      <div className="text-[11px] text-slate-900/80 truncate">
                        Format Standar F4 Folio
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="p-3.5 rounded-2xl bg-white text-slate-900 hover:bg-slate-100 border border-slate-200 shadow-lg transition-all flex items-center gap-3 cursor-pointer active:scale-95 text-left group"
                    title="Cetak Langsung Laporan Supervisi"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <Printer className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-xs text-slate-900">
                        Cetak Dokumen
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        Cetak Lembar Resmi
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Stat Cards (6 Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
            {/* Stat 1: Total Soal */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Total Paket Ujian</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{totalAssessments} Soal</h3>
                <p className="text-[11px] text-indigo-600 font-medium mt-0.5 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" />
                  <span>ASTS &amp; ASAS</span>
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 2: Ketuntasan Belajar */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Ketuntasan Belajar</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{passRate}%</h3>
                <p className="text-[11px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  <span>Tuntas &gt;= KKTP</span>
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <Award className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 3: Kehadiran Peserta Ujian */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Kehadiran Peserta</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{attendancePercentage}%</h3>
                <p className="text-[11px] text-blue-600 font-medium mt-0.5 flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>Presensi Berita Acara</span>
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ClipboardCheck className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 4: Berita Acara Terverifikasi */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Berita Acara</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">
                  {verifiedBA} / {totalBeritaAcara}
                </h3>
                <p className="text-[11px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{pendingBA > 0 ? `${pendingBA} Perlu Verifikasi` : '100% Sah'}</span>
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 5: Total Guru Aktif */}
            <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Guru Terdaftar</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{teachers.length} Guru</h3>
                <p className="text-[11px] text-cyan-600 font-medium mt-0.5 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  <span>{teachers.filter((t) => t.status === 'online').length} Sesi Online</span>
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center shrink-0">
                <GraduationCap className="w-5 h-5" />
              </div>
            </div>

            {/* Stat 6: Rapor Pendidikan Mutu & Proyeksi 2026 */}
            <div
              onClick={() => setActiveTab('rapor-pendidikan')}
              className="p-4.5 rounded-2xl border-2 shadow-sm flex items-center justify-between cursor-pointer transition-all group bg-white hover:bg-amber-50/50 border-amber-300 hover:border-amber-400"
              title="Klik untuk melihat Laporan Lengkap Rapor Pendidikan & Estimasi 2026"
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-black uppercase text-amber-900 tracking-wider">Rapor Mutu &amp; LitNum</p>
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {activeRaporDoc ? `${activeRaporDoc.skorLiterasi} · ${activeRaporDoc.skorNumerasi}` : '70.0 · 68.5'}
                </h3>
                <p className="text-[11px] text-amber-800 font-bold mt-0.5 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-amber-600" />
                  <span>Est. '26: {estimation2026.literasiProjectedScore} &amp; {estimation2026.numerasiProjectedScore}</span>
                </p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all shadow-xs">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Status Sinkronisasi 6 Simpul Ekosistem Sekolah */}
          <div className="p-6 sm:p-7 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2.5">
              STATUS SINKRONISASI 6 SIMPUL EKOSISTEM AKADEMIK SMAN 3 TUMIJAJAR:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                  <span>Pangkalan Guru</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-base font-black text-white block">{teachers.length} Guru</span>
                <span className="text-[10px] text-emerald-400 font-semibold block">{teachers.filter((t) => t.status === 'online').length} Sesi Online</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                  <span>Peserta Didik</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-base font-black text-white block">{students.length} Siswa</span>
                <span className="text-[10px] text-slate-300 font-semibold block">10 Rombel Aktif</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                  <span>Presensi Live</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <span className="text-base font-black text-white block">{presenceMonitoringData.persenKehadiran}% Hadir</span>
                <span className="text-[10px] text-rose-300 font-semibold block">{presenceMonitoringData.kelasTercatatCount}/{presenceMonitoringData.totalKelasCount} Rombel Terinput</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                  <span>Bank Soal CBT</span>
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                </div>
                <span className="text-base font-black text-white block">{totalAssessments} Paket</span>
                <span className="text-[10px] text-indigo-300 font-semibold block">ASTS, ASAS, OSN</span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                  <span>Berita Acara</span>
                  {pendingBA > 0 ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  )}
                </div>
                <span className="text-base font-black text-white block">{verifiedBA}/{totalBeritaAcara} Sah</span>
                <span className={`text-[10px] font-bold block ${pendingBA > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                  {pendingBA > 0 ? `${pendingBA} Perlu Verifikasi` : '100% Selesai'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-1">
                <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold">
                  <span>Rapor Mutu '26</span>
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                </div>
                <span className="text-base font-black text-white block">{estimation2026.literasiProjectedScore} · {estimation2026.numerasiProjectedScore}</span>
                <span className="text-[10px] text-amber-300 font-semibold block">{estimation2026.spmStatusLiterasi}</span>
              </div>
            </div>
          </div>

          {/* 2. RADAR ATENSI & TINDAK LANJUT CEPAT (EXECUTIVE ACTION ALERTS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Alert 1: Berita Acara Pending */}
            <div className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
              pendingBA > 0
                ? 'bg-amber-50/70 border-amber-400 shadow-sm'
                : 'bg-white border-slate-200'
            }`}>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[10.5px] font-black ${
                    pendingBA > 0 ? 'bg-amber-200 text-amber-950' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {pendingBA > 0 ? `${pendingBA} Butuh Tanda Tangan` : 'Semua Sah'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Validasi Berita Acara Ujian</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {pendingBA > 0
                      ? `Terdapat ${pendingBA} dokumen Berita Acara pelaksanaan ujian sumatif CBT dari pengawas ruang yang menunggu audit & pengesahan Kepala Sekolah.`
                      : 'Seluruh Berita Acara ruang ujian yang diinput pengawas telah diverifikasi sah secara digital oleh Kepala Sekolah.'}
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Tindakan Kepsek</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('berita-acara')}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Buka Audit Berita Acara</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Alert 2: Siswa Rawan Absensi */}
            <div className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
              presenceMonitoringData.atRiskStudents.length > 0
                ? 'bg-rose-50/70 border-rose-400 shadow-sm'
                : 'bg-white border-slate-200'
            }`}>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-black">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[10.5px] font-black ${
                    presenceMonitoringData.atRiskStudents.length > 0 ? 'bg-rose-200 text-rose-950' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {presenceMonitoringData.atRiskStudents.length} Siswa Terdeteksi
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Radar Siswa Rawan Absensi</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    {presenceMonitoringData.atRiskStudents.length > 0
                      ? `Terdeteksi ${presenceMonitoringData.atRiskStudents.length} murid dengan akumulasi Alpha >= 3 hari yang memerlukan disposisi pemanggilan orang tua atau pembinaan BK.`
                      : 'Tingkat kehadiran siswa sangat prima. Tidak ada peserta didik dengan catatan Alpha >= 3 hari saat ini.'}
                  </p>
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Tindakan Kepsek</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('presensi-monitoring')}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Lihat Lembar Presensi</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Alert 3: Kesejahteraan Emosi Siswa & BK Hebat */}
            <div className="p-5 rounded-3xl border-2 border-purple-200 bg-white hover:border-purple-400 transition-all flex flex-col justify-between shadow-xs">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-[10.5px] font-black bg-purple-100 text-purple-900 border border-purple-200">
                    {emotionDistribution.total > 0 ? `${emotionDistribution.total} Respon` : '7 Jurus BK'}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">Kesejahteraan &amp; Emosi Murid</h4>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Pantauan suasana hati murid (EMC2), catatan sesi bimbingan konseling, kepatuhan 7 kebiasaan anak saleh, serta pemetaan karir lanjutan PTN.
                  </p>
                  <div className="flex items-center gap-2 mt-2 font-mono text-[11px]">
                    <span className="text-emerald-700 font-bold">Senang: {emotionDistribution.counts.senang}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-amber-700 font-bold">Cemas: {emotionDistribution.counts.cemas}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-rose-700 font-bold">Sedih: {emotionDistribution.counts.sedih}</span>
                  </div>
                </div>
              </div>
              <div className="pt-4 mt-3 border-t border-slate-200 flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Tindakan Kepsek</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('bk-monitoring')}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Buka Supervisi BK</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. MATRIKS 4 PILAR UTAMA PENGAWASAN MANAJERIAL SEKOLAH */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
                <h3 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                  Matriks 4 Pilar Pengawasan Supervisi Akademik &amp; Kesiswaan
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                Data teragregasi secara dinamis
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* PILAR 1: ASESMEN CBT & BANK SOAL */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-indigo-400 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 block">PILAR 1</span>
                      <h4 className="text-base font-black text-slate-900">Kesiapan Asesmen &amp; CBT</h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('asesmen-guru')}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Audit Paket Soal</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Total Paket Soal</span>
                    <span className="text-xl font-black text-slate-900 block mt-1">{totalAssessments} Paket</span>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">ASTS, ASAS, OSN</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] font-bold text-indigo-700 block uppercase">Ujian Terjadwal</span>
                    <span className="text-xl font-black text-indigo-900 block mt-1">{examAssignments.length || totalAssessments}</span>
                    <span className="text-[10px] text-indigo-600 font-semibold block mt-0.5">Ploting CBT</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 block uppercase">Berita Acara Sah</span>
                    <span className="text-xl font-black text-emerald-900 block mt-1">{verifiedBA} Ruang</span>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">{totalBeritaAcara} Total Ruang</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Supervisi paket soal mencakup pemenuhan 8 dimensi profil kelulusan, rubrik penilaian uraian, bobot skor butir, dan kesiapan token CBT ruang ujian.
                </p>
              </div>

              {/* PILAR 2: DISIPLIN PRESENSI 10 ROMBEL */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-rose-400 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center font-black">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 block">PILAR 2</span>
                      <h4 className="text-base font-black text-slate-900">Presensi &amp; Disiplin Belajar</h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('presensi-monitoring')}
                    className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Buka Lembar Presensi</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[9.5px] font-bold text-emerald-700 block uppercase">Hadir</span>
                    <span className="text-lg font-black text-emerald-900 block mt-0.5">{presenceMonitoringData.totalHadir}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-[9.5px] font-bold text-blue-700 block uppercase">Sakit</span>
                    <span className="text-lg font-black text-blue-900 block mt-0.5">{presenceMonitoringData.totalSakit}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-[9.5px] font-bold text-amber-700 block uppercase">Izin</span>
                    <span className="text-lg font-black text-amber-900 block mt-0.5">{presenceMonitoringData.totalIzin}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-[9.5px] font-bold text-rose-700 block uppercase">Alpha</span>
                    <span className="text-lg font-black text-rose-900 block mt-0.5">{presenceMonitoringData.totalAlpha}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <span className="text-slate-600 font-semibold">Tingkat Kehadiran Sekolah:</span>
                  <span className="font-black text-emerald-700 text-sm">{presenceMonitoringData.persenKehadiran}%</span>
                </div>
              </div>

              {/* PILAR 3: STANDAR KETUNTASAN BELAJAR & KKTP */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-emerald-400 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black">
                      <Award className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 block">PILAR 3</span>
                      <h4 className="text-base font-black text-slate-900">Ketuntasan &amp; Nilai KKTP</h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('rekap-nilai')}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Buka Rekap KKTP</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 block uppercase">Total Siswa Teruji</span>
                    <span className="text-xl font-black text-slate-900 block mt-1">{totalSubmissions} Siswa</span>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Lembar Masuk</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold text-emerald-800 block uppercase">Lulus KKTP</span>
                    <span className="text-xl font-black text-emerald-900 block mt-1">{passedSubmissions}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">Tuntas (&ge; KKTP)</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200">
                    <span className="text-[10px] font-bold text-amber-800 block uppercase">Rerata Sekolah</span>
                    <span className="text-xl font-black text-amber-900 block mt-1">{averageSchoolScore}</span>
                    <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">Skala 100</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Evaluasi ketercapaian kriteria ketuntasan tujuan pembelajaran (KKTP) berbasis standar mutu sekolah ({passRate}% tuntas).
                </p>
              </div>

              {/* PILAR 4: MUTU RAPOR PENDIDIKAN & LITNUM 2026 */}
              <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-amber-400 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-black">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 block">PILAR 4</span>
                      <h4 className="text-base font-black text-slate-900">Rapor Pendidikan &amp; Mutu 2026</h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('rapor-pendidikan')}
                    className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Analisis Proyeksi 2026</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-center text-xs">
                  <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] font-bold text-indigo-700 block uppercase">Kemampuan Literasi 2026</span>
                    <span className="text-xl font-black text-indigo-900 block mt-1">{estimation2026.literasiProjectedScore}</span>
                    <span className="text-[10px] text-indigo-600 font-bold block mt-0.5">{estimation2026.literasiProjectedBand}</span>
                  </div>
                  <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200">
                    <span className="text-[10px] font-bold text-teal-700 block uppercase">Kemampuan Numerasi 2026</span>
                    <span className="text-xl font-black text-teal-900 block mt-1">{estimation2026.numerasiProjectedScore}</span>
                    <span className="text-[10px] text-teal-600 font-bold block mt-0.5">{estimation2026.numerasiProjectedBand}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                  <span className="text-amber-900 font-bold">Status SPM Kemendikdasmen:</span>
                  <span className="font-black text-emerald-800">{estimation2026.spmStatusLiterasi}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4. PINTASAN CEPAT MENU SUPERVISI KEPALA SEKOLAH */}
          <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
              PINTASAN LANGSUNG KE SELURUH MENU SUPERVISI KEPALA SEKOLAH
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('presensi-monitoring')}
                className="p-3.5 rounded-2xl bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-left transition-all cursor-pointer shadow-2xs group"
              >
                <UserCheck className="w-5 h-5 text-rose-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-slate-900 block">Presensi Real-Time</span>
                <span className="text-[10px] text-slate-500 font-medium block">Live 10 rombel</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('berita-acara')}
                className="p-3.5 rounded-2xl bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-left transition-all cursor-pointer shadow-2xs group"
              >
                <ClipboardCheck className="w-5 h-5 text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-slate-900 block">Audit Berita Acara</span>
                <span className="text-[10px] text-slate-500 font-medium block">{pendingBA} butuh TTD</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('guru-matrix')}
                className="p-3.5 rounded-2xl bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-left transition-all cursor-pointer shadow-2xs group"
              >
                <Users className="w-5 h-5 text-sky-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-slate-900 block">Matriks Pendidik</span>
                <span className="text-[10px] text-slate-500 font-medium block">{teachers.length} Guru aktif</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('rekap-nilai')}
                className="p-3.5 rounded-2xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left transition-all cursor-pointer shadow-2xs group"
              >
                <Award className="w-5 h-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-slate-900 block">Rekapitulasi KKTP</span>
                <span className="text-[10px] text-slate-500 font-medium block">Sebaran nilai</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('bukti-otentik')}
                className="p-3.5 rounded-2xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-left transition-all cursor-pointer shadow-2xs group"
              >
                <ScanEye className="w-5 h-5 text-teal-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-slate-900 block">Bukti Otentik AI</span>
                <span className="text-[10px] text-slate-500 font-medium block">Audit LJK &amp; foto</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('catatan')}
                className="p-3.5 rounded-2xl bg-white hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-left transition-all cursor-pointer shadow-2xs group"
              >
                <FileText className="w-5 h-5 text-amber-600 mb-1.5 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black text-slate-900 block">Lembar Catatan F4</span>
                <span className="text-[10px] text-slate-500 font-medium block">{supervisiCatatanList.length} arsip resmi</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 0: MONITORING PRESENSI SISWA REAL-TIME (KHUSUS KEPALA SEKOLAH)       */}
      {/* ========================================================================= */}
      {activeTab === 'presensi-monitoring' && (
        <div className="space-y-6">
          {/* Header Panel Monitoring Presensi */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1.5 shadow-2xs">
                    <UserCheck className="w-4 h-4 text-rose-600" />
                    <span>Monitoring Presensi Harian Sekolah Real-Time</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Terhubung dengan Guru Mapel ({teachers.length} Guru)</span>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
                  Pantauan Kehadiran Peserta Didik SMAN 3 Tumijajar
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  Data kehadiran hasil input harian Guru Mata Pelajaran dan Kesiswaan dari 10 rombel kelas terpantau secara langsung, akurat, dan transparan.
                </p>
              </div>

              {/* Date Filter & Actions */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Tanggal Pemantauan
                  </label>
                  <input
                    type="date"
                    value={selectedMonitorDate}
                    onChange={(e) => setSelectedMonitorDate(e.target.value)}
                    className="px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="pt-5 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMonitorDate(todayStr)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Hari Ini
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModule('kesiswaan');
                      setCurrentView('kesiswaan');
                      showToast('Modul Kesiswaan', 'Membuka lembar absensi kesiswaan terpadu.', 'info');
                    }}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Buka Lembar Kesiswaan</span>
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 shadow-2xs">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Siswa</span>
                <span className="text-2xl font-black text-slate-900 block mt-1">{presenceMonitoringData.totalSiswaSekolah}</span>
                <span className="text-[10.5px] text-slate-400 font-semibold block mt-0.5">10 Rombel Kelas</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Siswa Hadir (H)</span>
                <span className="text-2xl font-black text-emerald-900 block mt-1">{presenceMonitoringData.totalHadir}</span>
                <span className="text-[10.5px] text-emerald-700 font-extrabold block mt-0.5">Tingkat Hadir: {presenceMonitoringData.persenKehadiran}%</span>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 shadow-2xs">
                <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Sakit (S)</span>
                <span className="text-2xl font-black text-blue-900 block mt-1">{presenceMonitoringData.totalSakit}</span>
                <span className="text-[10.5px] text-blue-700 font-semibold block mt-0.5">Surat Dokter/Keterangan</span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Izin (I)</span>
                <span className="text-2xl font-black text-amber-900 block mt-1">{presenceMonitoringData.totalIzin}</span>
                <span className="text-[10.5px] text-amber-700 font-semibold block mt-0.5">Izin Orang Tua/Wali</span>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-2xs">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Alpha (A)</span>
                <span className="text-2xl font-black text-rose-900 block mt-1">{presenceMonitoringData.totalAlpha}</span>
                <span className="text-[10.5px] text-rose-700 font-semibold block mt-0.5">Tanpa Keterangan</span>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-2xs">
                <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">Progress Input</span>
                <span className="text-2xl font-black text-white block mt-1">{presenceMonitoringData.kelasTercatatCount}/{presenceMonitoringData.totalKelasCount}</span>
                <span className="text-[10.5px] text-indigo-200 block mt-0.5 font-semibold">
                  {presenceMonitoringData.kelasTercatatCount === presenceMonitoringData.totalKelasCount ? '100% Rombel Terisi' : 'Sebagian Menunggu Input'}
                </span>
              </div>
            </div>
          </div>

          {/* Rombel Class Breakdown Table */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Status Penginputan Presensi Rombel Kelas (Tanggal: {selectedMonitorDate})</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-white px-3 py-1 rounded-xl border border-slate-200">
                Pembaruan Real-Time dari Guru Mapel
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50/50">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 w-28">Rombel Kelas</th>
                    <th className="py-3 px-4 w-40">Wali Kelas</th>
                    <th className="py-3 px-4 w-36 text-center">Status Input</th>
                    <th className="py-3 px-4">Diinput Oleh (Guru Mapel / Petugas)</th>
                    <th className="py-3 px-4 w-36 text-center">Rincian (H/S/I/A)</th>
                    <th className="py-3 px-4 w-32 text-center">% Kehadiran</th>
                    <th className="py-3 px-4 text-right w-28">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {presenceMonitoringData.classBreakdown.map((item, idx) => (
                    <tr key={item.cls.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                      <td className="py-3 px-4 font-black text-slate-900">
                        <span>Kelas {item.cls.nama}</span>
                        <span className="text-[10px] text-slate-400 block font-normal">{item.cls.fase || 'Fase E/F'}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-semibold">{item.cls.waliKelas || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        {item.hasRecorded ? (
                          <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Tersimpan</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-block shadow-2xs">
                            Belum Diisi (0)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-extrabold text-slate-900 block text-xs">{item.recordedBy}</span>
                        {item.updatedAt && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Jam: {new Date(item.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px]">
                        <span className="text-emerald-700 font-bold">H:{item.h}</span>{' '}
                        <span className="text-blue-700 font-semibold">S:{item.s}</span>{' '}
                        <span className="text-amber-700 font-semibold">I:{item.i}</span>{' '}
                        <span className="text-rose-700 font-bold">A:{item.a}</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center">
                          <span className={`font-black text-xs ${item.pct >= 90 ? 'text-emerald-700' : item.pct >= 80 ? 'text-blue-700' : 'text-rose-700'}`}>
                            {item.pct}% ({item.h}/{item.studentCount})
                          </span>
                          <div className="w-20 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                            <div style={{ width: `${item.pct}%` }} className="h-full bg-emerald-500" />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedModule('kesiswaan');
                            setCurrentView('kesiswaan-input');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                        >
                          <span>Cek Lembar</span>
                          <ArrowRight className="w-3 h-3 text-slate-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* At-Risk Students Panel (Alpha >= 3 Hari) */}
          <div className="rounded-3xl bg-white border border-rose-200 p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Radar Deteksi Siswa Rawan Ketidakhadiran (At-Risk Students)</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white shadow-2xs">
                      {presenceMonitoringData.atRiskStudents.length} Siswa Terdeteksi
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Siswa dengan akumulasi Alpha &ge; 3 hari yang membutuhkan tindak lanjut Disposisi Kepala Sekolah, Guru BK, dan Wali Kelas.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedModule('bk-hebat');
                  setCurrentView('bimbingan-konseling');
                  showToast('Modul BK Hebat', 'Membuka modul Bimbingan Konseling 7 Jurus BK Hebat.', 'info');
                }}
                className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 active:scale-95"
              >
                <HeartHandshake className="w-4 h-4 text-purple-700" />
                <span>Disposisi Penanganan ke BK Hebat</span>
              </button>
            </div>

            {presenceMonitoringData.atRiskStudents.length === 0 ? (
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
                      <th className="py-2.5 px-3">Rekomendasi Tindak Lanjut Kepala Sekolah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {presenceMonitoringData.atRiskStudents.map((item) => (
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
                            {item.a >= 5 ? 'Panggilan Orang Tua & Disposisi Konseling Khusus' : 'Surat Peringatan & Konseling BK'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: AUDIT & VERIFIKASI BERITA ACARA UJIAN                              */}
      {/* ========================================================================= */}
      {activeTab === 'berita-acara' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari mata pelajaran, ruang, pengawas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Filter Status:</span>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Semua ({totalBeritaAcara})
              </button>
              <button
                onClick={() => setStatusFilter('VERIFIED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'VERIFIED'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Disetujui ({verifiedBA})
              </button>
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Perlu Verifikasi ({pendingBA})
              </button>
            </div>
          </div>

          {/* List of Berita Acara */}
          {filteredBA.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <ClipboardCheck className="w-8 h-8" />
              </div>
              <h3 className="font-bold text-slate-800 text-base">Tidak Ada Berita Acara</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Belum ada data Berita Acara ujian ASTS/ASAS yang terdaftar sesuai kriteria pencarian ini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBA.map((ba) => {
                const isVerified = ba.verifiedByKepsek || ba.verifiedStatus === 'Verified';
                return (
                  <div
                    key={ba.id}
                    className={`bg-white rounded-2xl p-5 border transition-all space-y-4 shadow-sm hover:shadow-md ${
                      isVerified ? 'border-emerald-200 bg-emerald-50/20' : 'border-amber-200 bg-amber-50/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white">
                            {ba.assessmentType}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{ba.kelasRuang}</span>
                        </div>
                        <h4 className="font-extrabold text-slate-900 text-base mt-1">
                          {ba.mataPelajaran}
                        </h4>
                        <p className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ba.hariTanggal}</span>
                          <span>•</span>
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ba.waktuPelaksanaan}</span>
                        </p>
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold flex items-center gap-1 shrink-0 ${
                          isVerified
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {isVerified ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Disetujui Kepsek
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Perlu Verifikasi
                          </>
                        )}
                      </span>
                    </div>

                    {/* Proctors & Attendance metrics */}
                    <div className="bg-white p-3 rounded-xl border border-slate-200/80 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pengawas Ruang</p>
                        <p className="font-semibold text-slate-800 mt-0.5 truncate">1. {ba.pengawas1}</p>
                        {ba.pengawas2 && <p className="font-semibold text-slate-800 truncate">2. {ba.pengawas2}</p>}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Presensi Peserta</p>
                        <p className="font-semibold text-slate-800 mt-0.5">
                          Hadir: <span className="text-emerald-600 font-extrabold">{ba.jumlahPesertaHadir}</span> / {ba.jumlahPesertaSeharusnya}
                        </p>
                        {ba.jumlahPesertaTidakHadir > 0 && (
                          <p className="text-rose-600 font-bold text-[11px]">
                            Absen: {ba.jumlahPesertaTidakHadir} Siswa
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Incident Note if any */}
                    {ba.catatanKejadianKhusus && (
                      <div className="p-3 rounded-xl bg-slate-100 text-slate-700 text-xs border border-slate-200">
                        <span className="font-bold text-slate-900 block mb-0.5">Catatan Kejadian Khusus:</span>
                        <p className="italic">{ba.catatanKejadianKhusus}</p>
                      </div>
                    )}

                    {/* Kepsek Supervisory Note if exists */}
                    {ba.catatanKepsek && (
                      <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs space-y-0.5">
                        <span className="font-extrabold text-indigo-950 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          Catatan Supervisi Kepala Sekolah:
                        </span>
                        <p className="font-medium text-slate-800">{ba.catatanKepsek}</p>
                      </div>
                    )}

                    {/* Footer Actions */}
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedBAPreview(ba)}
                        className="px-3 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Lihat Pratinjau Dokumen Berita Acara Lengkap"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Pratinjau Dokumen</span>
                      </button>

                      <button
                        onClick={() => handleOpenVerifyModal(ba)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                          isVerified
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{isVerified ? 'Edit Verifikasi & Catatan' : 'Verifikasi Kepsek'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MATRIKS & MONITORING KINERJA GURU                                  */}
      {/* ========================================================================= */}
      {activeTab === 'guru-matrix' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-black text-slate-900 text-lg">Matriks Supervisi Kinerja Guru & Penilaian</h3>
              <p className="text-xs text-slate-500">
                Monitoring beban pembuatan soal, persentase koreksi jawaban, rata-rata nilai kelas, dan ketuntasan per guru pengampu.
              </p>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari guru, NIP, mapel..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                {teachers.length} Guru
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 text-xs uppercase font-extrabold border-b border-slate-200">
                  <th className="p-3">Guru & NIP</th>
                  <th className="p-3">Mata Pelajaran</th>
                  <th className="p-3 text-center">Paket Soal</th>
                  <th className="p-3 text-center">Total Lembar Koreksi</th>
                  <th className="p-3 text-center">Rerata Nilai</th>
                  <th className="p-3 text-center">% Ketuntasan</th>
                  <th className="p-3 text-center">Aksi Supervisi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {teacherMatrix
                  .filter((t) => {
                    const q = teacherSearch.toLowerCase();
                    return (
                      t.nama.toLowerCase().includes(q) ||
                      (t.nip || '').includes(q) ||
                      t.mapelStr.toLowerCase().includes(q)
                    );
                  })
                  .map((t) => (
                    <tr key={t.id} className="hover:bg-indigo-50/30 transition-colors">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={t.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                            alt={t.nama}
                            className="w-9 h-9 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <p className="font-extrabold text-slate-900 text-sm">{formatAcademicTitles(t.nama)}</p>
                            <p className="text-[11px] text-slate-500 font-mono">NIP: {t.nip || '-'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {t.mataPelajaran && t.mataPelajaran.length > 0 ? (
                            t.mataPelajaran.map((m, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-semibold text-slate-700 text-[10px]"
                              >
                                {m}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">Semua Mapel</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 text-center">
                        <span className="font-extrabold text-slate-800 text-sm">{t.totalSoal}</span>
                        <span className="text-[10px] text-slate-400 block">Paket Soal</span>
                      </td>

                      <td className="p-3 text-center font-extrabold text-slate-800 text-sm">
                        {t.totalKoreksi}
                      </td>

                      <td className="p-3 text-center">
                        <span className={`font-black text-sm ${t.avgScore >= 75 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {t.avgScore > 0 ? t.avgScore : '-'}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            t.passRate >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.passRate >= 60
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {t.totalKoreksi > 0 ? `${t.passRate}%` : 'Belum Ujian'}
                        </span>
                      </td>

                      <td className="p-3 text-center">
                        <button
                          onClick={() => {
                            const rawTeacher = teachers.find((tr) => tr.id === t.id);
                            if (rawTeacher) setSelectedTeacherForDetail(rawTeacher);
                          }}
                          className="px-3 py-1.5 rounded-xl font-bold text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer mx-auto shadow-2xs"
                          title="Inspeksi Detail Hasil Kerja & Penilaian Guru Ini"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Inspeksi Hasil Kerja</span>
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MONITORING BANK ASESMEN & PAKET SOAL GURU                          */}
      {/* ========================================================================= */}
      {activeTab === 'asesmen-guru' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-3 items-center justify-between">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Monitoring Paket Asesmen Guru</h3>
              <p className="text-xs text-slate-500">Pemeriksaan butir soal essay/PG, KKTP, kunci jawaban, dan status koreksi siswa</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={assessmentFilterJenis}
                onChange={(e) => setAssessmentFilterJenis(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Jenis (ASTS/ASAS)</option>
                <option value="ASTS">ASTS (Tengah Semester)</option>
                <option value="ASAS">ASAS (Akhir Semester)</option>
              </select>

              <select
                value={assessmentFilterMapel}
                onChange={(e) => setAssessmentFilterMapel(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Mata Pelajaran</option>
                {uniqueSubjects.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select
                value={assessmentFilterGuru}
                onChange={(e) => setAssessmentFilterGuru(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Guru Pengampu</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.nama}>{t.nama}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Assessment Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assessments
              .filter((a) => {
                if (assessmentFilterJenis !== 'ALL' && a.jenis !== assessmentFilterJenis) return false;
                if (assessmentFilterMapel !== 'ALL' && a.mataPelajaran !== assessmentFilterMapel) return false;
                if (assessmentFilterGuru !== 'ALL' && a.guruPengampu !== assessmentFilterGuru) return false;
                return true;
              })
              .map((asm) => {
                const subs = asm.submissions || [];
                const essayCount = Array.isArray(asm.essayRubrik) ? asm.essayRubrik.length : 0;
                const pgCount = Array.isArray(asm.mcqQuestions) ? asm.mcqQuestions.length : 0;
                const totalQuestions = essayCount + pgCount;
                let totalNilai = 0;
                let tuntasCount = 0;
                subs.forEach((s) => {
                  totalNilai += s.nilaiAkhir;
                  if (s.tuntas) tuntasCount++;
                });
                const avgScore = subs.length > 0 ? Math.round(totalNilai / subs.length) : 0;

                return (
                  <div key={asm.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-all">
                    <div>
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                          asm.jenis === 'ASTS' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'
                        }`}>
                          {asm.jenis}
                        </span>
                        <span className="text-xs font-bold text-slate-600">
                          Kelas {asm.kelas} ({asm.fase})
                        </span>
                      </div>

                      <h4 className="font-extrabold text-slate-900 text-base mt-2">{asm.mataPelajaran}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Guru Pengampu: <strong className="text-slate-700">{formatAcademicTitles(asm.guruPengampu || 'Guru Mapel')}</strong>
                      </p>

                      <div className="mt-3 p-3 bg-slate-50 rounded-xl grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">BUTIR SOAL</span>
                          <span className="font-extrabold text-slate-800">{totalQuestions} ({essayCount} E / {pgCount} PG)</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">KKTP</span>
                          <span className="font-extrabold text-slate-800">{asm.kktp || 75}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">RERATA NILAI</span>
                          <span className={`font-black ${avgScore >= (asm.kktp || 75) ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {subs.length > 0 ? avgScore : '-'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
                        <span>Status Koreksi:</span>
                        <strong className="text-slate-800">{subs.length} Lembar Dinilai</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => setSelectedAssessmentForQuestions(asm)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Pratinjau Butir Soal, Bobot & Kisi-Kisi"
                      >
                        <Eye className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Kisi & Butir Soal</span>
                      </button>

                      <button
                        onClick={() => setSelectedAssessmentForGrades(asm)}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                        title="Lihat Daftar Nilai Siswa pada Asesmen Ini"
                      >
                        <Award className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Rekap Nilai Siswa</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: REKAPITULASI NILAI & KETUNTASAN SISWA                              */}
      {/* ========================================================================= */}
      {activeTab === 'rekap-nilai' && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h3 className="font-black text-slate-900 text-lg">Rekapitulasi Nilai & Capaian Ketuntasan Siswa</h3>
              <p className="text-xs text-slate-500">Pemantauan distribusi nilai siswa per kelas dan mata pelajaran untuk audit kelulusan</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedGradeClass}
                onChange={(e) => setSelectedGradeClass(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Kelas ({uniqueClasses.length})</option>
                {uniqueClasses.map((c) => (
                  <option key={c} value={c}>Kelas {c}</option>
                ))}
              </select>

              <select
                value={selectedGradeMapel}
                onChange={(e) => setSelectedGradeMapel(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Mata Pelajaran ({uniqueSubjects.length})</option>
                {uniqueSubjects.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Submissions Roster Table */}
          {(() => {
            const allSubs: Array<{ sub: Submission; asm: Assessment }> = [];
            assessments.forEach((a) => {
              if (selectedGradeMapel !== 'ALL' && a.mataPelajaran !== selectedGradeMapel) return;
              if (selectedGradeClass !== 'ALL' && a.kelas !== selectedGradeClass) return;
              (a.submissions || []).forEach((s) => {
                allSubs.push({ sub: s, asm: a });
              });
            });

            if (allSubs.length === 0) {
              return (
                <div className="p-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                  Belum ada nilai siswa yang tersimpan untuk filter kelas/mapel ini.
                </div>
              );
            }

            const tuntasCount = allSubs.filter((x) => x.sub.tuntas).length;
            const avgVal = Math.round(allSubs.reduce((acc, x) => acc + x.sub.nilaiAkhir, 0) / allSubs.length);
            const passPct = Math.round((tuntasCount / allSubs.length) * 100);

            return (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold block">TOTAL SISWA DINILAI</span>
                    <span className="text-lg font-black text-slate-900">{allSubs.length} Siswa</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">RERATA NILAI KELAS</span>
                    <span className="text-lg font-black text-indigo-600">{avgVal}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block">TINGKAT KETUNTASAN</span>
                    <span className="text-lg font-black text-emerald-600">{passPct}% ({tuntasCount} Tuntas)</span>
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
                      <tr className="text-slate-700 font-extrabold uppercase">
                        <th className="p-2.5 text-center">No</th>
                        <th className="p-2.5">Nama Siswa</th>
                        <th className="p-2.5">Kelas</th>
                        <th className="p-2.5">Mata Pelajaran</th>
                        <th className="p-2.5 text-center">Nilai Akhir</th>
                        <th className="p-2.5 text-center">KKTP</th>
                        <th className="p-2.5 text-center">Status</th>
                        <th className="p-2.5 text-center">Bukti Otentik</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allSubs.slice(0, 100).map((item, idx) => {
                        const kktpInfo = getKKTPKategori(item.sub.nilaiAkhir);
                        const std = students.find((s) => s.id === item.sub.studentId || s.nama === item.sub.studentName);
                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-bold text-slate-800">{item.sub.studentName}</td>
                            <td className="p-2.5 text-slate-600">{item.sub.kelas || item.asm.kelas}</td>
                            <td className="p-2.5 text-slate-600">{item.asm.mataPelajaran}</td>
                            <td className="p-2.5 text-center font-black text-slate-900 text-sm">{item.sub.nilaiAkhir}</td>
                            <td className="p-2.5 text-center text-slate-500 font-bold">{item.asm.kktp || 75}</td>
                            <td className="p-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                item.sub.tuntas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.sub.tuntas ? 'Tuntas' : 'Perlu Bimbingan'}
                              </span>
                            </td>
                            <td className="p-2.5 text-center">
                              <button
                                onClick={() => setSelectedProofData({ submission: item.sub, assessment: item.asm, student: std })}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                              >
                                Inspeksi
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: SUPERVISI BUKTI OTENTIK LEMBAR JAWABAN SISWA                       */}
      {/* ========================================================================= */}
      {activeTab === 'bukti-otentik' && (
        <div className="space-y-5">
          {/* Header Card */}
          <div className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span>Audit & Pemeriksaan Bukti Otentik Nilai Siswa</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengawasan langsung Kepala Sekolah atas keabsahan lembar jawaban fisik, rubrik penilaian butir soal, dan draf nilai sah
              </p>
            </div>

            {/* Filter Paket Asesmen */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <select
                value={selectedAssessmentForProof}
                onChange={(e) => setSelectedAssessmentForProof(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Paket Asesmen ({assessments.length})</option>
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.jenis}] {a.mataPelajaran} - Kelas {a.kelas}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assessment Group Cards */}
          <div className="space-y-4">
            {assessments
              .filter((a) => selectedAssessmentForProof === 'ALL' || a.id === selectedAssessmentForProof)
              .map((asm) => {
                const subs = asm.submissions || [];
                const gradedSubs = subs.filter(
                  (s) =>
                    !s.statusKoreksi?.includes('Draf') &&
                    !s.statusKoreksi?.includes('Draft') &&
                    !s.statusKoreksi?.includes('Citra Terunggah')
                );
                const draftSubs = subs.filter(
                  (s) =>
                    s.statusKoreksi?.includes('Draf') ||
                    s.statusKoreksi?.includes('Draft') ||
                    s.statusKoreksi?.includes('Citra Terunggah')
                );

                return (
                  <div
                    key={asm.id}
                    className="p-5 bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4"
                  >
                    {/* Header Package */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black ${
                            asm.jenis === 'ASTS' ? 'bg-indigo-100 text-indigo-800' : 'bg-sky-100 text-sky-800'
                          }`}>
                            {asm.jenis}
                          </span>
                          <h4 className="font-extrabold text-sm text-slate-900">
                            {asm.mataPelajaran}
                          </h4>
                          <span className="text-xs font-bold text-slate-500">
                            Kelas {asm.kelas} ({asm.fase})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Guru Pengampu: <strong className="text-slate-800">{formatAcademicTitles(asm.guruPengampu || 'Guru Mapel')}</strong> • KKTP: <strong>{asm.kktp || 75}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto text-xs font-bold">
                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {gradedSubs.length} Terverifikasi
                        </span>
                        {draftSubs.length > 0 && (
                          <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
                            {draftSubs.length} Draf
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Submissions List */}
                    {subs.length === 0 ? (
                      <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                        Belum ada pekerjaan siswa atau draf yang tersimpan pada modul ujian ini.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {subs.map((sub, sIdx) => {
                          const isDraft =
                            sub.statusKoreksi?.includes('Draf') ||
                            sub.statusKoreksi?.includes('Draft') ||
                            sub.statusKoreksi?.includes('Citra Terunggah');
                          const kktpInfo = getKKTPKategori(sub.nilaiAkhir);
                          const std = students.find((s) => s.id === sub.studentId || s.nama.toLowerCase() === sub.studentName?.toLowerCase());

                          return (
                            <div
                              key={sub.id || sIdx}
                              className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between ${
                                isDraft
                                  ? 'bg-amber-50/40 border-amber-200 shadow-2xs'
                                  : 'bg-slate-50/60 border-slate-200 shadow-2xs hover:border-indigo-300'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200/80">
                                  <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${
                                    isDraft ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  }`}>
                                    {isDraft ? 'DRAF SAH' : 'TERVERIFIKASI'}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {sub.waktuKoreksi || 'Tersimpan'}
                                  </span>
                                </div>

                                <h5 className="font-bold text-xs text-slate-900 uppercase truncate">
                                  {sub.studentName}
                                </h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  NISN: {sub.nisn || std?.nisn || '-'} • No: {sub.noUrut || std?.noUrut || '-'}
                                </p>
                              </div>

                              <div className="mt-3 pt-2 border-t border-slate-200/80 flex items-center justify-between">
                                <div>
                                  <span className="text-[9px] text-slate-400 font-bold block uppercase">
                                    {isDraft ? 'Skor Draf' : 'Nilai Akhir'}
                                  </span>
                                  <div className="flex items-baseline gap-1 mt-0.5">
                                    <span className="text-lg font-black text-slate-900">{sub.nilaiAkhir}</span>
                                    <span className={`text-[8.5px] font-extrabold px-1.5 py-0.2 rounded border ${kktpInfo.badgeClass}`}>
                                      {kktpInfo.kategori}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => setSelectedProofData({ submission: sub, assessment: asm, student: std })}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 font-bold text-xs cursor-pointer transition-colors shadow-2xs"
                                  title="Inspeksi Bukti Otentik Lembar Jawaban & Rincian Butir"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                                  <span>Inspeksi Bukti</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: CATATAN & REKOMENDASI SUPERVISI KEPSEK                             */}
      {/* ========================================================================= */}
      {activeTab === 'catatan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Create Catatan */}
          <div className="lg:col-span-1 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                Input Catatan Supervisi Kepsek
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tambahkan hasil evaluasi resmi Kepala Sekolah untuk peningkatan mutu asesmen dan kinerja guru.
              </p>
            </div>

            <form onSubmit={handleSaveCatatanSupervisi} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Umum Evaluasi Ujian
                </label>
                <textarea
                  rows={3}
                  required
                  value={catatanUmum}
                  onChange={(e) => setCatatanUmum(e.target.value)}
                  placeholder="Misal: Pelaksanaan ASTS/ASAS berjalan tertib, presensi siswa 98%, koreksi AI berjalan lancar..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Rekomendasi Tindak Lanjut Akademik
                </label>
                <textarea
                  rows={3}
                  value={rekomendasi}
                  onChange={(e) => setRekomendasi(e.target.value)}
                  placeholder="Misal: Diberikan program pengayaan bagi kelas XII dan pembimbingan materi essay..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Catatan Pembinaan Guru (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={pembinaanGuru}
                  onChange={(e) => setPembinaanGuru(e.target.value)}
                  placeholder="Catatan apresiasi atau pembinaan khusus guru..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingCatatan}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>{isSavingCatatan ? 'Menyimpan...' : 'Terbitkan Catatan Supervisi'}</span>
              </button>
            </form>
          </div>

          {/* Historical Supervisi Entries */}
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-900 text-base">Riwayat Catatan Supervisi Kepala Sekolah</h3>
                <p className="text-xs text-slate-500">
                  Arsip resmi hasil supervisi dan instruksi tindak lanjut Kepala Sekolah.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {supervisiCatatanList.length} Catatan
              </span>
            </div>

            {supervisiCatatanList.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                <Info className="w-8 h-8 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  Belum ada catatan supervisi yang disimpan. Gunakan form di sebelah kiri untuk menambah catatan baru.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {supervisiCatatanList.map((sc) => (
                  <div key={sc.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 relative group">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <span className="font-extrabold text-indigo-900 text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        {sc.tanggal} • T.P {sc.tahunAjaran} ({sc.semester})
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {sc.status}
                        </span>
                        <button
                          onClick={() => {
                            if (confirm('Hapus catatan supervisi ini?')) {
                              deleteSupervisiCatatan(sc.id);
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
                          title="Hapus Catatan Ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-slate-500">Catatan Evaluasi:</p>
                      <p className="text-xs font-semibold text-slate-800 mt-0.5">{sc.catatanUmum}</p>
                    </div>

                    {sc.rekomendasi && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-500">Rekomendasi Tindak Lanjut:</p>
                        <p className="text-xs text-slate-700 mt-0.5">{sc.rekomendasi}</p>
                      </div>
                    )}

                    {sc.pembinaanGuru && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-500">Pembinaan Guru:</p>
                        <p className="text-xs text-slate-700 mt-0.5 italic">{sc.pembinaanGuru}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: MONITORING EKSEKUTIF RAPOR PENDIDIKAN & ESTIMASI MUTU 2026        */}
      {/* ========================================================================= */}
      {activeTab === 'rapor-pendidikan' && (
        <div className="space-y-6">
          {/* 1. Executive Top Hero Header & Document Selector */}
          <div className="p-6 bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-800 rounded-3xl text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/30 text-white backdrop-blur-xs flex items-center gap-1.5 shadow-2xs">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                      <span>SUPERVISI EKSEKUTIF KEPALA SEKOLAH</span>
                    </span>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-md">
                      RAPOR PENDIDIKAN &amp; ESTIMASI 2026
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Audit Rapor Pendidikan &amp; Proyeksi Mutu Kemendikdasmen 2026
                  </h2>
                  <p className="text-xs text-amber-100/90 leading-relaxed font-medium">
                    Pantau dokumen resmi RAPOR-PBD hasil evaluasi sistem, progres riil literasi &amp; numerasi peserta didik SMAN 3 Tumijajar, serta estimasi triangulasi capaian rapor tahun 2026.
                  </p>
                </div>

                {/* Direct Action Buttons for Kepala Sekolah */}
                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModule('litnum');
                      setCurrentView('litnum-management');
                      setActiveLitNumTab('upload_rapor');
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-white hover:bg-amber-50 text-slate-900 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <UploadCloud className="w-4 h-4 text-amber-600" />
                    <span>Unggah / Kelola Rapor Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModule('litnum');
                      setCurrentView('litnum-management');
                      setActiveLitNumTab('analytics');
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-slate-950" />
                    <span>Buka Modul LitNum</span>
                  </button>
                </div>
              </div>

              {/* Document Selector Pills (If multiple documents uploaded) */}
              <div className="pt-3 border-t border-white/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-amber-200 text-[11px]">Dokumen Aktif:</span>
                  {raportDocs.length > 0 ? (
                    raportDocs.map((doc) => (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedRaporDocId(doc.id)}
                        className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                          activeRaporDoc?.id === doc.id
                            ? 'bg-white text-slate-950 shadow-md ring-2 ring-amber-300'
                            : 'bg-white/15 text-white hover:bg-white/25 border border-white/20'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Rapor Tahun {doc.tahun}</span>
                        {activeRaporDoc?.id === doc.id && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        )}
                      </button>
                    ))
                  ) : (
                    <span className="px-3 py-1 rounded-xl bg-white/15 text-white text-[11px] font-semibold border border-white/20">
                      Baseline Baku Sekolah ({estimation2026.baselineYear}) — File Excel belum diunggah
                    </span>
                  )}
                </div>

                {activeRaporDoc && (
                  <div className="text-[11px] font-medium text-amber-100 flex items-center gap-2">
                    <span>File: <strong className="text-white font-mono">{activeRaporDoc.fileName}</strong></span>
                    <span>•</span>
                    <span>Diunggah: <strong className="text-white">{activeRaporDoc.uploadedAt}</strong></span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Sub-Navigation Tabs within Executive Suite */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
            <button
              type="button"
              onClick={() => setRaporActiveSubTab('estimasi2026')}
              className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                raporActiveSubTab === 'estimasi2026'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-amber-900 hover:bg-white/60'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              <span>Estimasi Proyeksi 2026 &amp; Real-Time</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9.5px] bg-amber-400 text-slate-950 font-black">
                Triangulasi
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRaporActiveSubTab('indikator')}
              className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                raporActiveSubTab === 'indikator'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-amber-900 hover:bg-white/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Indikator Mutu &amp; Spektrum</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9.5px] bg-slate-200 text-slate-800 font-bold">
                {activeRaporDoc?.indicators?.length || 0}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRaporActiveSubTab('rekomendasi')}
              className={`flex-1 min-w-[200px] py-2.5 px-4 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 ${
                raporActiveSubTab === 'rekomendasi'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-slate-700 hover:text-amber-900 hover:bg-white/60'
              }`}
            >
              <Target className="w-4 h-4" />
              <span>Akar Masalah &amp; Rekomendasi PBD</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9.5px] bg-slate-200 text-slate-800 font-bold">
                {activeRaporDoc?.rekomendasi?.length || 0}
              </span>
            </button>
          </div>

          {/* 3. SUB-TAB CONTENT: ESTIMASI 2026 */}
          {raporActiveSubTab === 'estimasi2026' && (
            <div className="space-y-6">
              {/* Executive Methodology Callout */}
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-300 text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 bg-amber-500 text-slate-950 rounded-xl shrink-0 mt-0.5 shadow-2xs">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-xs uppercase tracking-wide text-amber-950">
                      Metodologi Triangulasi Prediktif Rapor Pendidikan 2026
                    </h4>
                    <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                      Hasil proyeksi 2026 dihitung secara matematis dengan menggabungkan: (1) Baseline Rapor Pendidikan resmi ({estimation2026.baselineYear}), (2) Capaian riil {estimation2026.totalStudentsEvaluated} siswa pada {estimation2026.totalLitTests + estimation2026.totalNumTests} tes berkala di sistem ini, dan (3) Standar Pelayanan Minimal (SPM) Kemendikdasmen RI.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <span className="px-3 py-1 rounded-xl bg-white border border-amber-300 font-mono font-bold text-xs text-amber-950 shadow-2xs">
                    {estimation2026.totalStudentsEvaluated} Siswa Teruji
                  </span>
                </div>
              </div>

              {/* Dual Proyeksi Utama: Literasi vs Numerasi */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CARD 1: LITERASI 2026 */}
                <div className="p-6 bg-white rounded-3xl border-2 border-indigo-200 shadow-sm space-y-5">
                  <div className="flex items-start justify-between border-b border-indigo-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 block">
                          INDIKATOR PRIORITAS A.1
                        </span>
                        <h3 className="text-lg font-black text-slate-900">Kemampuan Literasi 2026</h3>
                        <span className="text-xs text-slate-500 font-semibold">{estimation2026.literasiProjectedBand}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-indigo-700 font-mono">
                        {estimation2026.literasiProjectedCompetencePercent}%
                      </div>
                      <span className="text-[10.5px] font-bold text-slate-500 block">Mencapai Kompetensi Min.</span>
                      <span className={`text-[11px] font-black inline-block mt-0.5 ${estimation2026.literasiGrowthDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {estimation2026.literasiGrowthDelta >= 0 ? `+${estimation2026.literasiGrowthDelta}%` : `${estimation2026.literasiGrowthDelta}%`} vs baseline
                      </span>
                    </div>
                  </div>

                  {/* Triangulation 3-Pillar Comparison */}
                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Baseline {estimation2026.baselineYear}</span>
                      <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">{estimation2026.baselineLitCompetencePercent}%</span>
                      <span className="text-[10px] text-slate-500 block font-semibold mt-0.5">Skor: {estimation2026.baselineLitScore}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase block">2. Siswa Riil</span>
                      <span className="text-base font-black text-indigo-900 font-mono mt-0.5 block">{estimation2026.litPassingRatePercent}%</span>
                      <span className="text-[10px] text-indigo-600 block font-semibold mt-0.5">Rata2: {estimation2026.avgStudentLitScore}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">3. Proyeksi 2026</span>
                      <span className="text-base font-black text-emerald-900 font-mono mt-0.5 block">{estimation2026.literasiProjectedCompetencePercent}%</span>
                      <span className="text-[10px] text-emerald-700 block font-semibold mt-0.5">Indeks: {estimation2026.literasiProjectedScore}</span>
                    </div>
                  </div>

                  {/* Spektrum Kemahiran 4 Tier */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Prediksi Sebaran Spektrum Kemahiran 2026:</span>
                      <span className="text-indigo-700 font-mono">100% Total Siswa</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200 flex shadow-inner">
                      <div style={{ width: `${estimation2026.literasiMahirPercent}%` }} className="bg-emerald-500 h-full rounded-l-full transition-all" title={`Mahir: ${estimation2026.literasiMahirPercent}%`} />
                      <div style={{ width: `${estimation2026.literasiCakapPercent}%` }} className="bg-sky-500 h-full transition-all" title={`Cakap: ${estimation2026.literasiCakapPercent}%`} />
                      <div style={{ width: `${estimation2026.literasiDasarPercent}%` }} className="bg-amber-400 h-full transition-all" title={`Dasar: ${estimation2026.literasiDasarPercent}%`} />
                      <div style={{ width: `${estimation2026.literasiIntervensiPercent}%` }} className="bg-rose-500 h-full rounded-r-full transition-all" title={`Intervensi: ${estimation2026.literasiIntervensiPercent}%`} />
                    </div>
                  </div>

                  {/* 4 Detail Grid Box Persentase */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[10.5px]">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-emerald-900">
                      <span className="text-[9.5px] uppercase block text-emerald-700">Mahir</span>
                      <span className="text-xs font-black font-mono">{estimation2026.literasiMahirPercent}%</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 font-bold text-sky-900">
                      <span className="text-[9.5px] uppercase block text-sky-700">Cakap</span>
                      <span className="text-xs font-black font-mono">{estimation2026.literasiCakapPercent}%</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-900">
                      <span className="text-[9.5px] uppercase block text-amber-700">Dasar</span>
                      <span className="text-xs font-black font-mono">{estimation2026.literasiDasarPercent}%</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 font-bold text-rose-900">
                      <span className="text-[9.5px] uppercase block text-rose-700">Intervensi</span>
                      <span className="text-xs font-black font-mono">{estimation2026.literasiIntervensiPercent}%</span>
                    </div>
                  </div>

                  {/* SPM Status Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Status SPM Kemendikdasmen:</span>
                    <span className="px-3 py-1 rounded-full font-black text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {estimation2026.spmStatusLiterasi}
                    </span>
                  </div>
                </div>

                {/* CARD 2: NUMERASI 2026 */}
                <div className="p-6 bg-white rounded-3xl border-2 border-teal-200 shadow-sm space-y-5">
                  <div className="flex items-start justify-between border-b border-teal-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                        <Calculator className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-teal-700 block">
                          INDIKATOR PRIORITAS A.2
                        </span>
                        <h3 className="text-lg font-black text-slate-900">Kemampuan Numerasi 2026</h3>
                        <span className="text-xs text-slate-500 font-semibold">{estimation2026.numerasiProjectedBand}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-black text-teal-700 font-mono">
                        {estimation2026.numerasiProjectedCompetencePercent}%
                      </div>
                      <span className="text-[10.5px] font-bold text-slate-500 block">Mencapai Kompetensi Min.</span>
                      <span className={`text-[11px] font-black inline-block mt-0.5 ${estimation2026.numerasiGrowthDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {estimation2026.numerasiGrowthDelta >= 0 ? `+${estimation2026.numerasiGrowthDelta}%` : `${estimation2026.numerasiGrowthDelta}%`} vs baseline
                      </span>
                    </div>
                  </div>

                  {/* Triangulation 3-Pillar Comparison */}
                  <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Baseline {estimation2026.baselineYear}</span>
                      <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">{estimation2026.baselineNumCompetencePercent}%</span>
                      <span className="text-[10px] text-slate-500 block font-semibold mt-0.5">Skor: {estimation2026.baselineNumScore}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-teal-50 border border-teal-200">
                      <span className="text-[10px] font-bold text-teal-700 uppercase block">2. Siswa Riil</span>
                      <span className="text-base font-black text-teal-900 font-mono mt-0.5 block">{estimation2026.numPassingRatePercent}%</span>
                      <span className="text-[10px] text-teal-600 block font-semibold mt-0.5">Rata2: {estimation2026.avgStudentNumScore}</span>
                    </div>
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-300">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">3. Proyeksi 2026</span>
                      <span className="text-base font-black text-emerald-900 font-mono mt-0.5 block">{estimation2026.numerasiProjectedCompetencePercent}%</span>
                      <span className="text-[10px] text-emerald-700 block font-semibold mt-0.5">Indeks: {estimation2026.numerasiProjectedScore}</span>
                    </div>
                  </div>

                  {/* Spektrum Kemahiran 4 Tier */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-bold text-slate-700">
                      <span>Prediksi Sebaran Spektrum Kemahiran 2026:</span>
                      <span className="text-teal-700 font-mono">100% Total Siswa</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200 flex shadow-inner">
                      <div style={{ width: `${estimation2026.numerasiMahirPercent}%` }} className="bg-emerald-500 h-full rounded-l-full transition-all" title={`Mahir: ${estimation2026.numerasiMahirPercent}%`} />
                      <div style={{ width: `${estimation2026.numerasiCakapPercent}%` }} className="bg-sky-500 h-full transition-all" title={`Cakap: ${estimation2026.numerasiCakapPercent}%`} />
                      <div style={{ width: `${estimation2026.numerasiDasarPercent}%` }} className="bg-amber-400 h-full transition-all" title={`Dasar: ${estimation2026.numerasiDasarPercent}%`} />
                      <div style={{ width: `${estimation2026.numerasiIntervensiPercent}%` }} className="bg-rose-500 h-full rounded-r-full transition-all" title={`Intervensi: ${estimation2026.numerasiIntervensiPercent}%`} />
                    </div>
                  </div>

                  {/* 4 Detail Grid Box Persentase */}
                  <div className="grid grid-cols-4 gap-2 text-center text-[10.5px]">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-emerald-900">
                      <span className="text-[9.5px] uppercase block text-emerald-700">Mahir</span>
                      <span className="text-xs font-black font-mono">{estimation2026.numerasiMahirPercent}%</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 font-bold text-sky-900">
                      <span className="text-[9.5px] uppercase block text-sky-700">Cakap</span>
                      <span className="text-xs font-black font-mono">{estimation2026.numerasiCakapPercent}%</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-900">
                      <span className="text-[9.5px] uppercase block text-amber-700">Dasar</span>
                      <span className="text-xs font-black font-mono">{estimation2026.numerasiDasarPercent}%</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 font-bold text-rose-900">
                      <span className="text-[9.5px] uppercase block text-rose-700">Intervensi</span>
                      <span className="text-xs font-black font-mono">{estimation2026.numerasiIntervensiPercent}%</span>
                    </div>
                  </div>

                  {/* SPM Status Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Status SPM Kemendikdasmen:</span>
                    <span className="px-3 py-1 rounded-full font-black text-[11px] bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {estimation2026.spmStatusNumerasi}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cohort Breakdown: Fase E (Kelas X) vs Fase F (Kelas XI & XII) */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-600" />
                      <span>Rincian Evaluasi Berdasarkan Fase Belajar (Kohort Siswa)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pemetaan ketuntasan literasi &amp; numerasi per jenjang untuk supervisi terarah Kepala Sekolah.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {estimation2026.cohortBreakdowns.map((cohort, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm text-slate-900">{cohort.tingkat}</span>
                        <span className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 text-slate-700">
                          {cohort.totalStudents} Siswa Terdaftar
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-white rounded-xl border border-indigo-100 space-y-1">
                          <span className="text-[10px] font-bold text-indigo-700 uppercase">Literasi</span>
                          <div className="text-lg font-black text-indigo-900 font-mono">
                            {cohort.avgLitScore} <span className="text-[10px] text-slate-500">rata-rata</span>
                          </div>
                          <span className="text-[11px] text-slate-600 block font-medium">
                            Ketuntasan: <strong>{cohort.litCompetenceRate}%</strong>
                          </span>
                        </div>

                        <div className="p-3 bg-white rounded-xl border border-teal-100 space-y-1">
                          <span className="text-[10px] font-bold text-teal-700 uppercase">Numerasi</span>
                          <div className="text-lg font-black text-teal-900 font-mono">
                            {cohort.avgNumScore} <span className="text-[10px] text-slate-500">rata-rata</span>
                          </div>
                          <span className="text-[11px] text-slate-600 block font-medium">
                            Ketuntasan: <strong>{cohort.numCompetenceRate}%</strong>
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Strategic What-If Simulation Scenarios */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-amber-600" />
                      <span>Matriks Skenario Intervensi Mutu 2026 (Simulasi Eksekutif)</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Pilih skenario kebijakan untuk melihat proyeksi skor mutu bila intervensi sekolah ditingkatkan.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {estimation2026.scenarios.map((sc, sIdx) => (
                    <div
                      key={sIdx}
                      onClick={() => setSelectedScenarioIdx(sIdx)}
                      className={`p-5 rounded-2xl border-2 transition-all cursor-pointer space-y-3 ${
                        selectedScenarioIdx === sIdx
                          ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-500/20'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10.5px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                          sIdx === 0
                            ? 'bg-slate-200 text-slate-800'
                            : sIdx === 1
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-emerald-200 text-emerald-950'
                        }`}>
                          {sc.scenarioName}
                        </span>
                        {selectedScenarioIdx === sIdx && (
                          <span className="text-[10.5px] font-bold text-amber-800 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Terpilih</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {sc.description}
                      </p>

                      <div className="pt-2 border-t border-slate-200 grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-500 block">Proyeksi Lit</span>
                          <span className="text-base font-black text-indigo-700 font-mono">{sc.projectedLitScore}</span>
                        </div>
                        <div className="p-2 bg-white rounded-xl border border-slate-200 text-center">
                          <span className="text-[10px] text-slate-500 block">Proyeksi Num</span>
                          <span className="text-base font-black text-teal-700 font-mono">{sc.projectedNumScore}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Official Disclaimer */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Catatan Integritas Data Supervisi:</strong> {estimation2026.disclaimer}
                </p>
              </div>
            </div>
          )}

          {/* 4. SUB-TAB CONTENT: RINCIAN INDIKATOR & SPEKTRUM */}
          {raporActiveSubTab === 'indikator' && (
            <div className="space-y-4">
              {/* Controls: Search & Category Filter */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Cari indikator (contoh: A.1, Literasi, Karakter)..."
                    value={raporIndicatorSearch}
                    onChange={(e) => setRaporIndicatorSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                  {['ALL', 'Literasi', 'Numerasi', 'Karakter', 'Iklim Keamanan', 'Kualitas Pembelajaran'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setRaporIndicatorCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                        raporIndicatorCategory === cat
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {cat === 'ALL' ? 'Semua Dimensi' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Indicators Table / Cards */}
              {filteredRaporIndicators.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
                  <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-slate-700 text-sm">Tidak ada indikator yang sesuai</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {activeRaporDoc
                      ? 'Coba sesuaikan kata kunci pencarian atau ubah filter dimensi.'
                      : 'Belum ada file Rapor Pendidikan yang diunggah ke sistem. Anda dapat mengunggah file Excel RAPOR-PBD melalui modul LitNum.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRaporIndicators.map((ind, iIdx) => (
                    <div key={iIdx} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {ind.code && (
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {ind.code}
                            </span>
                          )}
                          <span className="text-[10.5px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {ind.kategori}
                          </span>
                        </div>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black ${
                          ind.capaian === 'Sangat Baik'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : ind.capaian === 'Baik'
                            ? 'bg-teal-100 text-teal-800 border border-teal-300'
                            : ind.capaian === 'Sedang'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {ind.capaian}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-slate-900 text-sm leading-snug">{ind.namaIndikator}</h4>
                        {ind.definisi && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{ind.definisi}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Skor Capaian:</span>
                        <span className="font-black text-slate-900 font-mono text-base">{ind.skor}</span>
                      </div>

                      {/* 4-Tier Spectrum breakdown if available */}
                      {ind.detailDistribusi && (
                        <div className="space-y-1 pt-1">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
                            <div style={{ width: `${ind.detailDistribusi.mahirPercent || 0}%` }} className="bg-emerald-500 h-full" title={`Mahir: ${ind.detailDistribusi.mahirPercent}%`} />
                            <div style={{ width: `${ind.detailDistribusi.cakapPercent || 0}%` }} className="bg-sky-500 h-full" title={`Cakap: ${ind.detailDistribusi.cakapPercent}%`} />
                            <div style={{ width: `${ind.detailDistribusi.dasarPercent || 0}%` }} className="bg-amber-400 h-full" title={`Dasar: ${ind.detailDistribusi.dasarPercent}%`} />
                            <div style={{ width: `${ind.detailDistribusi.perluIntervensiPercent || 0}%` }} className="bg-rose-500 h-full" title={`Intervensi: ${ind.detailDistribusi.perluIntervensiPercent}%`} />
                          </div>
                          <div className="flex justify-between text-[9.5px] text-slate-400 font-mono">
                            <span>M: {ind.detailDistribusi.mahirPercent || 0}%</span>
                            <span>C: {ind.detailDistribusi.cakapPercent || 0}%</span>
                            <span>D: {ind.detailDistribusi.dasarPercent || 0}%</span>
                            <span>PI: {ind.detailDistribusi.perluIntervensiPercent || 0}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. SUB-TAB CONTENT: AKAR MASALAH & REKOMENDASI PBD */}
          {raporActiveSubTab === 'rekomendasi' && (
            <div className="space-y-4">
              {(!activeRaporDoc?.rekomendasi || activeRaporDoc.rekomendasi.length === 0) ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
                  <Target className="w-10 h-10 text-slate-400 mx-auto" />
                  <h4 className="font-bold text-slate-700 text-sm">Belum ada rincian rekomendasi PBD</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {activeRaporDoc
                      ? 'Dokumen Rapor ini tidak memiliki lembar rekomendasi atau seluruh rekomendasi sudah tertangani.'
                      : 'Unggah file Excel RAPOR-PBD Kemendikdasmen untuk memuat otomatis seluruh analisis akar masalah dan inspirasi benahi ARKAS.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeRaporDoc.rekomendasi.map((rek, rIdx) => (
                    <div key={rIdx} className="p-5 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-black bg-rose-50 text-rose-800 border border-rose-200">
                            {rek.prioritas || `Prioritas #${rIdx + 1}`}
                          </span>
                          <h4 className="font-extrabold text-slate-900 text-sm">{rek.indikator}</h4>
                        </div>
                        {rek.capaian && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 self-start sm:self-auto">
                            {rek.capaian} {rek.skor ? `(${rek.skor})` : ''}
                          </span>
                        )}
                      </div>

                      {rek.akarMasalah && (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <span className="font-bold text-slate-700 block mb-0.5">Identifikasi Akar Masalah:</span>
                          <p className="text-slate-600 leading-relaxed">{rek.akarMasalah}</p>
                        </div>
                      )}

                      {rek.inspirasiBenahi && rek.inspirasiBenahi.length > 0 && (
                        <div className="space-y-1.5 text-xs">
                          <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                            <span>Inspirasi Benahi &amp; Langkah Tindak Lanjut:</span>
                          </span>
                          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                            {rek.inspirasiBenahi.map((step, sIdx) => (
                              <li key={sIdx} className="leading-relaxed">{step}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rek.programKegiatanArkas && (
                        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
                          <span className="font-bold block mb-0.5">Rekomendasi Program Kegiatan ARKAS / BOS:</span>
                          <p className="font-medium">{rek.programKegiatanArkas}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: SUPERVISI KESEJAHTERAAN PESERTA DIDIK & 7 JURUS BK HEBAT           */}
      {/* ========================================================================= */}
      {activeTab === 'bk-monitoring' && (
        <div className="space-y-6">
          {/* 1. Header Panel Supervisi Kesejahteraan & BK Hebat */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-purple-100 text-purple-800 border border-purple-300 flex items-center gap-1.5 shadow-2xs">
                    <HeartHandshake className="w-4 h-4 text-purple-600" />
                    <span>Supervisi Bimbingan Konseling &amp; Kesejahteraan Peserta Didik</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Terhubung dengan Guru BK &amp; Wali Kelas (7 Jurus BK Hebat)</span>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight pt-1">
                  Radar Kesejahteraan, Emosi &amp; Pembinaan Karakter Murid
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                  Pantau kesehatan emosional peserta didik (EMC2), mitigasi dini kerawanan belajar, kepatuhan 7 kebiasaan anak saleh, serta pemetaan minat karir dan studi lanjut perguruan tinggi (SNBP/SNBT/Kedinasan).
                </p>
              </div>

              {/* Action to Jump to Full BK Module */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedModule('bk-hebat');
                    setCurrentView('bimbingan-konseling');
                    showToast('Modul BK Hebat', 'Membuka seluruh fitur ekosistem 7 Jurus BK Hebat.', 'info');
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <HeartHandshake className="w-4 h-4" />
                  <span>Buka Modul BK Hebat</span>
                </button>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 pt-2">
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 shadow-2xs">
                <span className="text-[10px] font-bold text-purple-800 uppercase tracking-wider block">Murid Terpantau</span>
                <span className="text-2xl font-black text-purple-950 block mt-1">{students.length} Siswa</span>
                <span className="text-[10.5px] text-purple-700 font-semibold block mt-0.5">10 Rombel Kelas</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-2xs">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Emosi Positif</span>
                <span className="text-2xl font-black text-emerald-900 block mt-1">
                  {emotionDistribution.counts.senang + emotionDistribution.counts.tenang}
                </span>
                <span className="text-[10.5px] text-emerald-700 font-extrabold block mt-0.5">
                  {emotionDistribution.total > 0
                    ? `${Math.round(((emotionDistribution.counts.senang + emotionDistribution.counts.tenang) / emotionDistribution.total) * 100)}% Senang/Tenang`
                    : '100% Kondusif'}
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-2xs">
                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Perlu Pendampingan</span>
                <span className="text-2xl font-black text-amber-900 block mt-1">
                  {emotionDistribution.counts.cemas + emotionDistribution.counts.sedih + emotionDistribution.counts.lelah}
                </span>
                <span className="text-[10.5px] text-amber-700 font-semibold block mt-0.5">Cemas, Sedih atau Lelah</span>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-2xs">
                <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">Rujukan / Kasus Aktif</span>
                <span className="text-2xl font-black text-rose-900 block mt-1">{bkReferrals.length}</span>
                <span className="text-[10.5px] text-rose-700 font-semibold block mt-0.5">
                  {bkReferrals.filter((r) => r.status === 'dalam_proses' || r.status === 'diajukan' || r.status === 'diterima').length} Dalam Penanganan
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 shadow-2xs">
                <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Sesi Konseling</span>
                <span className="text-2xl font-black text-indigo-900 block mt-1">{bkCounselingLogs.length}</span>
                <span className="text-[10.5px] text-indigo-700 font-semibold block mt-0.5">Individu &amp; Mediasi</span>
              </div>
            </div>
          </div>

          {/* 2. Visualisasi Spektrum Emosi EMC2 Siswa */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <span>Spektrum Suasana Hati Harian Murid (Metode EMC2)</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-900">
                    Live Check-in
                  </span>
                </h3>
                <p className="text-xs text-slate-500">
                  Pemetaan emosi berdasarkan check-in harian siswa: Empathy, Mindfulness, Compassion, and Critical Inquiry.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                Total {emotionDistribution.total} Respon Tercatat
              </span>
            </div>

            {/* Segmented Progress Bar */}
            <div className="space-y-2">
              <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden p-0.5 border border-slate-200 flex shadow-inner">
                <div
                  style={{
                    width: `${emotionDistribution.total > 0 ? (emotionDistribution.counts.senang / emotionDistribution.total) * 100 : 40}%`,
                  }}
                  className="bg-emerald-500 h-full rounded-l-full transition-all"
                  title={`Senang: ${emotionDistribution.counts.senang}`}
                />
                <div
                  style={{
                    width: `${emotionDistribution.total > 0 ? (emotionDistribution.counts.tenang / emotionDistribution.total) * 100 : 35}%`,
                  }}
                  className="bg-sky-500 h-full transition-all"
                  title={`Tenang: ${emotionDistribution.counts.tenang}`}
                />
                <div
                  style={{
                    width: `${emotionDistribution.total > 0 ? (emotionDistribution.counts.cemas / emotionDistribution.total) * 100 : 15}%`,
                  }}
                  className="bg-amber-400 h-full transition-all"
                  title={`Cemas: ${emotionDistribution.counts.cemas}`}
                />
                <div
                  style={{
                    width: `${emotionDistribution.total > 0 ? (emotionDistribution.counts.sedih / emotionDistribution.total) * 100 : 5}%`,
                  }}
                  className="bg-rose-400 h-full transition-all"
                  title={`Sedih: ${emotionDistribution.counts.sedih}`}
                />
                <div
                  style={{
                    width: `${emotionDistribution.total > 0 ? (emotionDistribution.counts.lelah / emotionDistribution.total) * 100 : 5}%`,
                  }}
                  className="bg-purple-400 h-full rounded-r-full transition-all"
                  title={`Lelah: ${emotionDistribution.counts.lelah}`}
                />
              </div>

              {/* 5 Indicator Legend */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-emerald-900">
                  <span className="text-[10px] uppercase block text-emerald-700">Senang / Bahagia</span>
                  <span className="text-sm font-black font-mono">{emotionDistribution.counts.senang} Siswa</span>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 font-bold text-sky-900">
                  <span className="text-[10px] uppercase block text-sky-700">Tenang / Fokus</span>
                  <span className="text-sm font-black font-mono">{emotionDistribution.counts.tenang} Siswa</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-900">
                  <span className="text-[10px] uppercase block text-amber-700">Cemas / Khawatir</span>
                  <span className="text-sm font-black font-mono">{emotionDistribution.counts.cemas} Siswa</span>
                </div>
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 font-bold text-rose-900">
                  <span className="text-[10px] uppercase block text-rose-700">Sedih / Kecewa</span>
                  <span className="text-sm font-black font-mono">{emotionDistribution.counts.sedih} Siswa</span>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 font-bold text-purple-900">
                  <span className="text-[10px] uppercase block text-purple-700">Lelah / Jenuh</span>
                  <span className="text-sm font-black font-mono">{emotionDistribution.counts.lelah} Siswa</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Filter & Direktori Pantauan Siswa Bimbingan Konseling */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden space-y-0">
            <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Daftar Pantauan &amp; Catatan Layanan BK:
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                  {students.length} Peserta Didik
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={bkSearchQuery}
                  onChange={(e) => setBkSearchQuery(e.target.value)}
                  placeholder="Cari siswa, NISN, kelas..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Table of Students & BK Records */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] bg-slate-50/50">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Nama Siswa &amp; NISN</th>
                    <th className="py-3 px-4 w-28">Rombel Kelas</th>
                    <th className="py-3 px-4 w-40 text-center">Status Emosi Harian</th>
                    <th className="py-3 px-4 w-36 text-center">Rujukan / Kasus</th>
                    <th className="py-3 px-4 w-44">Minat Karir / Studi Lanjut</th>
                    <th className="py-3 px-4 text-right w-32">Aksi Kepsek</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {students
                    .filter((s) => {
                      if (!bkSearchQuery) return true;
                      const q = bkSearchQuery.toLowerCase();
                      return (
                        s.nama.toLowerCase().includes(q) ||
                        (s.nisn && s.nisn.toLowerCase().includes(q)) ||
                        s.kelas.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 25)
                    .map((s, idx) => {
                      const latestEmotion = bkEmotionLogs.find((e) => e.studentId === s.id);
                      const referrals = bkReferrals.filter((r) => r.studentId === s.id);
                      const profile = bkProfiles.find((p) => p.studentId === s.id);

                      return (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <span className="font-extrabold text-slate-900 block">{s.nama}</span>
                            <span className="text-[10px] text-slate-400 font-mono">NISN: {s.nisn || '-'}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[11px]">
                              {s.kelas}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {latestEmotion ? (
                              <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                                <Smile className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{latestEmotion.emotionCategory}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">Kondusif</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {referrals.length > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 inline-block shadow-2xs">
                                {referrals.length} Rujukan Kasus
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold text-[11px]">Nihil Kerawanan</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs text-slate-800 font-bold block">
                              {profile?.careerAspiration || 'Perguruan Tinggi Negeri (SNBP)'}
                            </span>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {profile?.learningStyle ? `Gaya: ${profile.learningStyle}` : 'Peminatan Akademik'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedBKProfileForDetail(
                                  profile || {
                                    id: `bk-${s.id}`,
                                    studentId: s.id,
                                    studentName: s.nama,
                                    kelas: s.kelas,
                                    nisn: s.nisn || '',
                                    learningStyle: 'Visual',
                                    strengthAttributes: ['Disiplin', 'Kreatif'],
                                    careerAspiration: 'Perguruan Tinggi Negeri (SNBP) & Karir Masa Depan',
                                    diagnosticNotes: 'Perkembangan belajar aktif dan kondusif.',
                                  }
                                );
                              }}
                              className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-[11px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Detail &amp; Disposisi</span>
                              <ChevronRight className="w-3 h-3 text-purple-600" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: VERIFIKASI BERITA ACARA KEPSEK                                   */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedBA && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col p-4 sm:p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Verifikasi Berita Acara Kepsek</h3>
                    <p className="text-xs text-slate-500">{selectedBA.mataPelajaran} • {selectedBA.kelasRuang}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBA(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 my-3 pr-1">
                <div className="space-y-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tanggal Ujian:</span>
                    <span className="font-bold text-slate-800">{selectedBA.hariTanggal} ({selectedBA.waktuPelaksanaan})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pengawas Ruang:</span>
                    <span className="font-bold text-slate-800">{selectedBA.pengawas1}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kehadiran Peserta:</span>
                    <span className="font-bold text-slate-800">
                      {selectedBA.jumlahPesertaHadir} Hadir / {selectedBA.jumlahPesertaSeharusnya} Seharusnya
                    </span>
                  </div>
                  {selectedBA.catatanKejadianKhusus && (
                    <div>
                      <span className="text-slate-500 block font-bold">Catatan Kejadian Khusus:</span>
                      <p className="italic text-slate-700">{selectedBA.catatanKejadianKhusus}</p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan Supervisi Kepala Sekolah (Opsional)
                  </label>
                  <textarea
                    rows={3}
                    value={kepsekNoteInput}
                    onChange={(e) => setKepsekNoteInput(e.target.value)}
                    placeholder="Tuliskan saran/catatan supervisi Kepala Sekolah untuk berita acara ini..."
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200 shrink-0">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleSaveVerification(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all cursor-pointer"
                >
                  Tolak / Perlu Revisi
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedBA(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    disabled={isVerifying}
                    onClick={() => handleSaveVerification(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Setujui & Verifikasi</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 2: PRATINJAU DOKUMEN BERITA ACARA RESMI                             */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedBAPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-extrabold text-slate-900 text-base">Pratinjau Dokumen Berita Acara Resmi</h3>
                </div>
                <button
                  onClick={() => setSelectedBAPreview(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 text-xs">
                {/* Dokumen Format Resmi */}
                <div className="border border-slate-300 p-6 rounded-2xl bg-white space-y-4 shadow-2xs font-serif">
                  <div className="text-center border-b-2 border-slate-900 pb-3">
                    <h4 className="font-black text-sm uppercase">BERITA ACARA PELAKSANAAN ASESMEN SUMATIF</h4>
                    <p className="text-[11px] font-bold">SMAN 3 TUMIJAJAR • TAHUN PELAJARAN {school?.tahunAjaranAktif || '2025/2026'}</p>
                  </div>

                  <p className="text-justify leading-relaxed">
                    Pada hari ini <strong>{selectedBAPreview.hariTanggal}</strong>, telah diselenggarakan Asesmen Sumatif ({selectedBAPreview.assessmentType}) untuk mata pelajaran <strong>{selectedBAPreview.mataPelajaran}</strong> di ruang/kelas <strong>{selectedBAPreview.kelasRuang}</strong> mulai pukul <strong>{selectedBAPreview.waktuPelaksanaan}</strong>.
                  </p>

                  <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 font-sans">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-600">Jumlah Peserta Seharusnya:</span>
                      <span className="font-bold text-slate-900">{selectedBAPreview.jumlahPesertaSeharusnya} Siswa</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-600">Jumlah Peserta Hadir:</span>
                      <span className="font-bold text-emerald-600">{selectedBAPreview.jumlahPesertaHadir} Siswa</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-600">Jumlah Peserta Tidak Hadir:</span>
                      <span className="font-bold text-rose-600">{selectedBAPreview.jumlahPesertaTidakHadir} Siswa</span>
                    </div>
                  </div>

                  {selectedBAPreview.catatanKejadianKhusus && (
                    <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 font-sans">
                      <span className="font-bold text-amber-900 block">Catatan Kejadian Khusus Ujian:</span>
                      <p className="text-slate-700 italic mt-0.5">{selectedBAPreview.catatanKejadianKhusus}</p>
                    </div>
                  )}

                  {selectedBAPreview.catatanKepsek && (
                    <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 font-sans">
                      <span className="font-bold text-indigo-950 block">Catatan Pengesahan Kepala Sekolah:</span>
                      <p className="text-slate-800 mt-0.5">{selectedBAPreview.catatanKepsek}</p>
                    </div>
                  )}

                  <div className="pt-4 grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="font-sans text-[11px] text-slate-500">Pengawas Ruang 1</p>
                      <div className="h-12" />
                      <p className="font-bold underline">{selectedBAPreview.pengawas1}</p>
                    </div>
                    <div>
                      <p className="font-sans text-[11px] text-slate-500">Mengetahui Kepala Sekolah</p>
                      <div className="h-12" />
                      <p className="font-bold underline">{formatAcademicTitles(school?.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.')}</p>
                      <p className="font-sans text-[10px] text-slate-500">NIP. {school?.nipKepalaSekolah || '19750812 200212 1 001'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedBAPreview(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup Pratinjau
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 3: INSPEKSI DETAIL HASIL KERJA GURU (SUPERVISI KEPSEK)              */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedTeacherForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden text-slate-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <img
                    src={selectedTeacherForDetail.fotoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                    alt={selectedTeacherForDetail.nama}
                    className="w-12 h-12 rounded-full object-cover border-2 border-indigo-200 shadow-xs"
                  />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {formatAcademicTitles(selectedTeacherForDetail.nama)}
                    </h3>
                    <p className="text-xs text-slate-500">
                      NIP: {selectedTeacherForDetail.nip || '-'} • Mapel: {selectedTeacherForDetail.mataPelajaran?.join(', ') || 'Semua Mapel'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTeacherForDetail(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content Body */}
              <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 text-xs">
                {/* Assessments by this teacher */}
                <div>
                  <h4 className="font-bold text-slate-900 text-sm mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-600" />
                    <span>Daftar Paket Ujian & Asesmen yang Disusun:</span>
                  </h4>

                  {(() => {
                    const teacherAsms = assessments.filter(
                      (a) =>
                        a.guruId === selectedTeacherForDetail.id ||
                        a.guruPengampu === selectedTeacherForDetail.nama ||
                        (Array.isArray(selectedTeacherForDetail.mataPelajaran) &&
                          selectedTeacherForDetail.mataPelajaran.some(
                            (m) => m && m !== 'Semua Mata Pelajaran' && m.toLowerCase().trim() === a.mataPelajaran.toLowerCase().trim()
                          ))
                    );

                    if (teacherAsms.length === 0) {
                      return (
                        <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                          Guru ini belum membuat paket soal ujian ASTS / ASAS.
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        {teacherAsms.map((asm) => {
                          const subs = asm.submissions || [];
                          let totalNilai = 0;
                          let tuntas = 0;
                          subs.forEach((s) => {
                            totalNilai += s.nilaiAkhir;
                            if (s.tuntas) tuntas++;
                          });
                          const avg = subs.length > 0 ? Math.round(totalNilai / subs.length) : 0;
                          const tPass = subs.length > 0 ? Math.round((tuntas / subs.length) * 100) : 0;

                          return (
                            <div key={asm.id} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-100 text-indigo-800">
                                    {asm.jenis}
                                  </span>
                                  <span className="font-bold text-slate-900 text-sm">{asm.mataPelajaran}</span>
                                  <span className="text-slate-500 font-semibold">Kelas {asm.kelas}</span>
                                </div>
                                <span className="text-[11px] font-bold text-slate-600">
                                  KKTP: {asm.kktp || 75}
                                </span>
                              </div>

                              <div className="grid grid-cols-3 gap-2 py-1 text-[11px]">
                                <div>
                                  <span className="text-slate-400 block font-semibold">Lembar Dinilai:</span>
                                  <strong className="text-slate-800">{subs.length} Siswa</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-semibold">Rerata Nilai:</span>
                                  <strong className={avg >= (asm.kktp || 75) ? 'text-emerald-600' : 'text-amber-600'}>{avg > 0 ? avg : '-'}</strong>
                                </div>
                                <div>
                                  <span className="text-slate-400 block font-semibold">% Ketuntasan:</span>
                                  <strong className="text-slate-800">{subs.length > 0 ? `${tPass}%` : '-'}</strong>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                                <button
                                  onClick={() => setSelectedAssessmentForQuestions(asm)}
                                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  Pratinjau Butir Soal
                                </button>
                                <button
                                  onClick={() => setSelectedAssessmentForGrades(asm)}
                                  className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  Lihat Nilai Siswa
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

                {/* Form to submit direct supervision note for this teacher */}
                <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2">
                  <h4 className="font-extrabold text-indigo-950 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span>Kirim Catatan Supervisi Khusus Guru Ini:</span>
                  </h4>
                  <textarea
                    rows={3}
                    value={teacherSpecificNote}
                    onChange={(e) => setTeacherSpecificNote(e.target.value)}
                    placeholder={`Tuliskan saran pembinaan, arahan soal, atau apresiasi untuk ${selectedTeacherForDetail.nama}...`}
                    className="w-full p-2.5 bg-white border border-indigo-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleSaveTeacherSpecificNote(selectedTeacherForDetail)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Terbitkan Catatan untuk Guru Ini</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedTeacherForDetail(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 4: PRATINJAU BUTIR SOAL, BOBOT & KISI-KISI ASESMEN                  */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedAssessmentForQuestions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Naskah & Kisi-Kisi Butir Soal Ujian
                  </h3>
                  <p className="text-xs text-slate-500">
                    [{selectedAssessmentForQuestions.jenis}] {selectedAssessmentForQuestions.mataPelajaran} - Kelas {selectedAssessmentForQuestions.kelas}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAssessmentForQuestions(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 text-xs">
                {/* Essay Questions */}
                {selectedAssessmentForQuestions.essayRubrik && selectedAssessmentForQuestions.essayRubrik.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-2 text-indigo-700">
                      Bagian A: Soal Uraian / Essay ({selectedAssessmentForQuestions.essayRubrik.length} Soal)
                    </h4>
                    <div className="space-y-3">
                      {selectedAssessmentForQuestions.essayRubrik.map((q, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">Nomor {q.nomor || idx + 1}</span>
                            <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-extrabold text-[10px]">
                              Bobot: {q.skorMaks || 20} Poin
                            </span>
                          </div>
                          <FormattedQuestionText text={q.soal} className="text-slate-800" />
                          {q.kunciJawaban && (
                            <div className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600">
                              <span className="font-bold text-slate-800 block">Kunci Jawaban / Pedoman:</span>
                              <div className="mt-0.5">
                                <FormattedQuestionText text={q.kunciJawaban} />
                              </div>
                            </div>
                          )}
                          {q.catatanJawaban && (
                            <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800">
                              <span className="font-bold block">Catatan Guru:</span>
                              <div className="mt-0.5">
                                <FormattedQuestionText text={q.catatanJawaban} />
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Multiple Choice Questions */}
                {selectedAssessmentForQuestions.mcqQuestions && selectedAssessmentForQuestions.mcqQuestions.length > 0 && (
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm mb-2 text-sky-700">
                      Bagian B: Soal Pilihan Ganda ({selectedAssessmentForQuestions.mcqQuestions.length} Soal)
                    </h4>
                    <div className="space-y-3">
                      {selectedAssessmentForQuestions.mcqQuestions.map((q, idx) => (
                        <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-900">Nomor {q.nomor || idx + 1}</span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                              Kunci: {q.kunci || '-'}
                            </span>
                          </div>
                          <FormattedQuestionText text={q.soal} className="text-slate-800" />
                          {q.pilihan && (
                            <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600 pl-2">
                              {Object.entries(q.pilihan).map(([key, val]) => (
                                <div key={key}>
                                  <strong>{key}.</strong> {renderInlineFormattedText(String(val), `ks-opt-${idx}-${key}`)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(!selectedAssessmentForQuestions.essayRubrik || selectedAssessmentForQuestions.essayRubrik.length === 0) &&
                  (!selectedAssessmentForQuestions.mcqQuestions || selectedAssessmentForQuestions.mcqQuestions.length === 0) && (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      Belum ada butir soal yang diinputkan pada paket ujian ini.
                    </div>
                  )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedAssessmentForQuestions(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup Pratinjau Soal
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 5: REKAPITULASI NILAI SISWA PER PAKET ASESMEN                      */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedAssessmentForGrades && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden text-slate-800"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Daftar Nilai Siswa: {selectedAssessmentForGrades.mataPelajaran}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kelas {selectedAssessmentForGrades.kelas} • Guru: {selectedAssessmentForGrades.guruPengampu || '-'} • KKTP: {selectedAssessmentForGrades.kktp || 75}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedAssessmentForGrades(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto my-4 pr-1 text-xs">
                {(!selectedAssessmentForGrades.submissions || selectedAssessmentForGrades.submissions.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    Belum ada nilai siswa yang dikoreksi pada paket ujian ini.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 font-extrabold uppercase border-b border-slate-200">
                          <th className="p-2.5 text-center">No</th>
                          <th className="p-2.5">Nama Siswa</th>
                          <th className="p-2.5 text-center">Nilai Akhir</th>
                          <th className="p-2.5 text-center">Kategori</th>
                          <th className="p-2.5 text-center">Status</th>
                          <th className="p-2.5 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedAssessmentForGrades.submissions.map((sub, idx) => {
                          const kktpInfo = getKKTPKategori(sub.nilaiAkhir);
                          const std = students.find((s) => s.id === sub.studentId || s.nama === sub.studentName);
                          return (
                            <tr key={sub.id || idx} className="hover:bg-slate-50">
                              <td className="p-2.5 text-center text-slate-400">{idx + 1}</td>
                              <td className="p-2.5 font-bold text-slate-900">{sub.studentName}</td>
                              <td className="p-2.5 text-center font-black text-slate-900 text-sm">{sub.nilaiAkhir}</td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${kktpInfo.badgeClass}`}>
                                  {kktpInfo.kategori}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                  sub.tuntas ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {sub.tuntas ? 'Tuntas' : 'Belum Tuntas'}
                                </span>
                              </td>
                              <td className="p-2.5 text-center">
                                <button
                                  onClick={() => setSelectedProofData({ submission: sub, assessment: selectedAssessmentForGrades, student: std })}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                                >
                                  Inspeksi
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setSelectedAssessmentForGrades(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL 6: AUTHENTIC PROOF MODAL (LEMBAR JAWABAN FISIK & AI)                */}
      {/* ========================================================================= */}
      {selectedProofData && (
        <AuthenticProofModal
          submission={selectedProofData.submission}
          assessment={selectedProofData.assessment}
          student={selectedProofData.student}
          schoolInfo={state?.schoolInfo}
          onClose={() => setSelectedProofData(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: DETAIL PROFIL SISWA & DISPOSISI KEPSEK KE GURU BK                */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedBKProfileForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-200 my-auto overflow-hidden text-slate-800"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      Profil Binaan &amp; Disposisi Kepala Sekolah
                    </h3>
                    <p className="text-xs text-slate-500">
                      {selectedBKProfileForDetail.studentName} • Kelas {selectedBKProfileForDetail.kelas} • NISN: {selectedBKProfileForDetail.nisn || '-'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBKProfileForDetail(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto my-4 space-y-4 pr-1 text-xs">
                {/* Karir & Pilihan Lanjutan */}
                <div className="p-4 bg-purple-50/60 border border-purple-200 rounded-2xl space-y-2">
                  <h4 className="font-black text-purple-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-purple-600" />
                    <span>Peminatan Karir &amp; Rencana Studi Lanjut:</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-slate-700">
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Aspirasi Karir / PTN:</span>
                      <strong className="text-slate-900">{selectedBKProfileForDetail.careerAspiration || 'Perguruan Tinggi Negeri (SNBP)'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px] font-bold">Gaya Belajar:</span>
                      <strong className="text-slate-900">{selectedBKProfileForDetail.learningStyle || 'Visual & Kinestetik'}</strong>
                    </div>
                  </div>
                </div>

                {/* Catatan Riwayat Guru BK */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <HeartHandshake className="w-4 h-4 text-indigo-600" />
                    <span>Catatan Diagnostik &amp; Konseling Guru BK:</span>
                  </h4>
                  <p className="text-slate-700 leading-relaxed italic">
                    "{selectedBKProfileForDetail.diagnosticNotes || 'Peserta didik aktif dalam pembelajaran dan tidak memiliki catatan pelanggaran disiplin mayor.'}"
                  </p>
                </div>

                {/* Form Disposisi Kepala Sekolah */}
                <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-2.5">
                  <h4 className="font-black text-amber-950 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>Instruksi / Disposisi Resmi Kepala Sekolah untuk Guru BK:</span>
                  </h4>
                  <textarea
                    rows={3}
                    placeholder="Tuliskan arahan tindak lanjut kepala sekolah untuk guru BK (misal: Lakukan pendampingan pemilihan jurusan SNBP, berikan bimbingan motivasi belajar, hubungi orang tua...)"
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden text-slate-800"
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        showToast(
                          'Disposisi Diterbitkan',
                          `Arahan Kepala Sekolah untuk peserta didik ${selectedBKProfileForDetail.studentName} berhasil diteruskan ke Guru BK.`,
                          'success'
                        );
                        setSelectedBKProfileForDetail(null);
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Kirim Disposisi ke Guru BK</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedBKProfileForDetail(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
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
