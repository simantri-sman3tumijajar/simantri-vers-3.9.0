import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import {
  LayoutDashboard,
  BookOpen,
  Calculator,
  TrendingUp,
  Upload,
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BarChart3,
  PieChart as PieIcon,
  Sparkles,
  Info,
  Calendar,
  Layers,
  Search,
  Filter,
  Download,
  UploadCloud,
  FileCheck,
  RefreshCw,
  Image as ImageIcon,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Sliders,
  Shield,
  ShieldCheck,
  Users,
  ArrowUpRight,
  Target,
  Award,
  Activity,
  Clock,
  Cpu,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar, Legend, CartesianGrid, Cell } from 'recharts';
import { FormulaArabicHelper } from './FormulaArabicHelper';
import { QuestionFormattingToolbar } from './QuestionFormattingToolbar';
import { InlineFormattedInput } from './InlineFormattedInput';
import { DynamicQuestionEditor } from './DynamicQuestionEditor';
import { parseRaporPendidikanExcel } from '../utils/raportPendidikanParser';
import {
  parseGoogleFormExcel,
  convertGoogleFormRowsToRecords,
  GoogleFormExcelParseResult,
  ParsedGoogleFormRow,
  DeduplicationStrategy,
  getLitNumCapaian,
  normalizeStudentName,
} from '../utils/googleFormExcelImporter';
import { getScoreDiagnosis } from '../utils/litnumRealtimeHelper';
import { calculate2026RaporPendidikanEstimation } from '../utils/raportPendidikanEstimator';
import { MCQQuestionItem, ReadingPassage, Assessment, LitNumRecord, RaporPendidikanDoc, LitNumScheduleConfig } from '../types';
import {
  DEFAULT_LITNUM_SCHEDULE_CONFIG,
  evaluateLitNumSchedule,
  DAY_NAMES
} from '../utils/litnumScheduleHelper';

export const LitNumManagementView: React.FC = () => {
  const {
    state,
    currentUser,
    saveAssessment,
    saveLitNumRecordsBatch,
    deleteLitNumRecord,
    saveRaporPendidikanDoc,
    deleteRaporPendidikanDoc,
    saveLitNumScheduleConfig,
    showToast,
    activeLitNumTab,
    setActiveLitNumTab,
  } = useApp();

  const isAdmin = currentUser?.role === 'admin' || currentUser?.isAdmin;
  const isOperator = currentUser?.role === 'operator' || currentUser?.isOperator;
  const isKoordinatorUser = Boolean(
    currentUser?.isKoordinatorLitnum ||
    (currentUser?.role as string) === 'koordinator_litnum' ||
    (currentUser?.role as string) === 'koordinator'
  );
  const isKoordinatorOnly = isKoordinatorUser || (!isAdmin && !isOperator);

  const currentSchedule: LitNumScheduleConfig = {
    ...DEFAULT_LITNUM_SCHEDULE_CONFIG,
    ...(state?.litnumScheduleConfig || {})
  };

  const [scheduleState, setScheduleState] = useState<LitNumScheduleConfig>(currentSchedule);
  const liveScheduleEval = evaluateLitNumSchedule(scheduleState);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'bank_soal' | 'upload_rapor' | 'upload_googleform' | 'rekap'>(
    activeLitNumTab || 'dashboard'
  );

  useEffect(() => {
    if (activeLitNumTab && activeLitNumTab !== activeTab) {
      setActiveTab(activeLitNumTab);
    }
  }, [activeLitNumTab]);

  const handleSwitchTab = (tab: 'dashboard' | 'analytics' | 'bank_soal' | 'upload_rapor' | 'upload_googleform' | 'rekap') => {
    setActiveTab(tab);
    setActiveLitNumTab(tab);
  };

  // Multi-file Google Form Upload states
  const [googleFormType, setGoogleFormType] = useState<'literasi' | 'numerasi'>('literasi');
  const [parsedFormResults, setParsedFormResults] = useState<GoogleFormExcelParseResult[]>([]);
  const [isParsingForm, setIsParsingForm] = useState(false);
  const [customTestDate, setCustomTestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dedupStrategy, setDedupStrategy] = useState<DeduplicationStrategy>('highest_score');
  const [previewFilter, setPreviewFilter] = useState<'clean' | 'duplicates' | 'all' | 'unmatched'>('clean');
  const [previewSearchText, setPreviewSearchText] = useState<string>('');
  const [selectedFileIndex, setSelectedFileIndex] = useState<number>(0);
  const [manualMapModalRow, setManualMapModalRow] = useState<{ fileIdx: number; rowNumber: number; studentName: string } | null>(null);
  const [manualMapStudentSearch, setManualMapStudentSearch] = useState<string>('');
  const [cachedUploadedFiles, setCachedUploadedFiles] = useState<File[]>([]);

  // Rapor Pendidikan Upload states
  const [isParsingRapor, setIsParsingRapor] = useState(false);
  const [parsedRaporDoc, setParsedRaporDoc] = useState<RaporPendidikanDoc | null>(() => {
    return state?.raportPendidikanDocs && state.raportPendidikanDocs.length > 0
      ? state.raportPendidikanDocs[0]
      : null;
  });
  const [raporSubTab, setRaporSubTab] = useState<'indikator' | 'rekomendasi' | 'sheets'>('indikator');
  const [indicatorCategoryFilter, setIndicatorCategoryFilter] = useState<string>('all');
  const [indicatorSearchQuery, setIndicatorSearchQuery] = useState<string>('');
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState<number>(0);
  const [activeSheetPreview, setActiveSheetPreview] = useState<string | null>(null);
  const [editingYear, setEditingYear] = useState<boolean>(false);
  const [customYearInput, setCustomYearInput] = useState<string>('');

  useEffect(() => {
    if (!parsedRaporDoc && state?.raportPendidikanDocs && state.raportPendidikanDocs.length > 0) {
      setParsedRaporDoc(state.raportPendidikanDocs[0]);
    }
  }, [state?.raportPendidikanDocs, parsedRaporDoc]);

  // Bank Soal states
  const [selectedDay, setSelectedDay] = useState<'selasa' | 'rabu'>('selasa'); // Selasa = Literasi, Rabu = Numerasi
  const [assessmentTitle, setAssessmentTitle] = useState('Tes Literasi & Numerasi SMAN 3 Tumijajar');
  const [selectedClass, setSelectedClass] = useState('X-1');
  const [readingPassages, setReadingPassages] = useState<ReadingPassage[]>([
    {
      id: 'wacana-1',
      teks: 'Siswa SMAN 3 Tumijajar menggalakkan program literasi digital dan numerasi terapan melalui integrasi modul berbasis masalah kontekstual. Kegiatan ini bertujuan mengasah pemikiran kritis, analisis data kuantitatif, serta pemahaman wacana ilmiah untuk meningkatkan mutu pendidikan nasional.',
      nomorAwal: 1,
      nomorAkhir: 5,
      judul: 'Wacana Utama: Peningkatan Mutu Literasi & Numerasi'
    }
  ]);

  const [questions, setQuestions] = useState<MCQQuestionItem[]>([
    {
      nomor: 1,
      soal: 'Berdasarkan wacana di atas, apa tujuan utama dari penggalangan program literasi digital dan numerasi terapan di SMAN 3 Tumijajar?',
      modelSoal: 'PG',
      pilihan: {
        A: 'Meningkatkan nilai ujian semata tanpa pemahaman',
        B: 'Mengasah pemikiran kritis, analisis data kuantitatif, serta pemahaman wacana ilmiah',
        C: 'Menggantikan seluruh buku teks cetak dengan HP',
        D: 'Mengurangi jam pelajaran di sekolah',
        E: 'Membuat lomba antar kelas di hari Selasa dan Rabu'
      },
      kunci: 'B',
      skor: 20,
      penjelasan: 'Tujuan utama tertera jelas dalam wacana paragraf pertama, yaitu mengasah pemikiran kritis, analisis data kuantitatif, dan pemahaman wacana ilmiah.',
      domainLitNum: 'literasi'
    },
    {
      nomor: 2,
      soal: 'Suatu eksperimen fisika di SMAN 3 Tumijajar mengukur massa balok m = 4 kg dengan percepatan a = 2.5 m/s². Hitunglah gaya total F yang bekerja pada balok tersebut!',
      modelSoal: 'PG',
      pilihan: {
        A: '6.5 N',
        B: '8.0 N',
        C: '10.0 N',
        D: '12.5 N',
        E: '16.0 N'
      },
      kunci: 'C',
      skor: 20,
      penjelasan: 'Menggunakan rumus Hukum II Newton F = m · a = 4 kg × 2.5 m/s² = 10.0 N.',
      domainLitNum: 'numerasi'
    }
  ]);

  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);
  const [activeFormulaTarget, setActiveFormulaTarget] = useState<'soal' | 'penjelasan' | 'pilihan_A' | 'pilihan_B' | 'pilihan_C' | 'pilihan_D' | 'pilihan_E'>('soal');

  // Filter states for rekap
  const [rekapFilterClass, setRekapFilterClass] = useState<string>('SEMUA');
  const [rekapFilterType, setRekapFilterType] = useState<'SEMUA' | 'literasi' | 'numerasi'>('SEMUA');
  const [rekapSearchText, setRekapSearchText] = useState<string>('');

  const litnumRecords = state?.litnumRecords || [];
  const raportDocs = state?.raportPendidikanDocs || [];

  // Calculate 2026 Rapor Pendidikan estimation
  const estimation2026 = calculate2026RaporPendidikanEstimation(litnumRecords, raportDocs);

  // File input refs
  const googleFormFileRef = useRef<HTMLInputElement>(null);
  const raporFileRef = useRef<HTMLInputElement>(null);

  // Process uploaded files with given deduplication strategy
  const processUploadedExcelFiles = async (files: File[], strategy: DeduplicationStrategy) => {
    setIsParsingForm(true);
    const results: GoogleFormExcelParseResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const parsed = await parseGoogleFormExcel(
          file,
          googleFormType,
          state?.students || [],
          state?.classes || [],
          strategy
        );
        results.push(parsed);
      } catch (err) {
        console.error('Error parsing Google Form Excel:', file.name, err);
        showToast('Gagal Membaca File', `File ${file.name} tidak dapat dibaca sebagai format Excel yang valid.`, 'error');
      }
    }

    setParsedFormResults(results);
    setSelectedFileIndex(0);
    setIsParsingForm(false);

    const totalClean = results.reduce((acc, r) => acc + r.uniqueStudentsCount, 0);
    const totalDuplicates = results.reduce((acc, r) => acc + r.duplicateRowsCount, 0);

    showToast(
      'File Excel Berhasil Diterjemahkan',
      `Berhasil memproses ${results.length} file. Terdeteksi ${totalClean} siswa unik, ${totalDuplicates} pengumpulan ganda otomatis tereliminasi rapi.`,
      'success'
    );
  };

  // Handle Multi-File Google Form Upload
  const handleGoogleFormFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setCachedUploadedFiles(fileList);
    await processUploadedExcelFiles(fileList, dedupStrategy);
  };

  // Handle strategy change and re-evaluate
  const handleStrategyChange = async (newStrategy: DeduplicationStrategy) => {
    setDedupStrategy(newStrategy);
    if (cachedUploadedFiles.length > 0) {
      await processUploadedExcelFiles(cachedUploadedFiles, newStrategy);
    }
  };

  // Handle Manual Student Mapping for unmatched or corrected rows
  const handleManualMapStudent = (fileIdx: number, rowNumber: number, targetStudentId: string) => {
    const targetStudent = state?.students?.find((s) => s.id === targetStudentId);
    if (!targetStudent) return;

    setParsedFormResults((prev) => {
      const updated = [...prev];
      const targetRes = { ...updated[fileIdx] };

      targetRes.rows = targetRes.rows.map((row) => {
        if (row.rowNumber === rowNumber) {
          return {
            ...row,
            matchedStudentId: targetStudent.id,
            matchedStudentName: targetStudent.nama,
            matchedClass: targetStudent.kelas,
            matchedNisn: targetStudent.nisn,
            confidence: 'High' as const,
            matchMethod: 'manual' as const,
            matchScorePercent: 100,
          };
        }
        return row;
      });

      targetRes.deduplicatedRows = targetRes.deduplicatedRows.map((row) => {
        if (row.rowNumber === rowNumber) {
          return {
            ...row,
            matchedStudentId: targetStudent.id,
            matchedStudentName: targetStudent.nama,
            matchedClass: targetStudent.kelas,
            matchedNisn: targetStudent.nisn,
            confidence: 'High' as const,
            matchMethod: 'manual' as const,
            matchScorePercent: 100,
          };
        }
        return row;
      });

      targetRes.matchedCount = targetRes.rows.filter((r) => r.matchedStudentId).length;
      targetRes.unmatchedCount = targetRes.rows.filter((r) => !r.matchedStudentId).length;

      updated[fileIdx] = targetRes;
      return updated;
    });

    setManualMapModalRow(null);
    showToast('Pemetaan Disimpan', `Siswa berhasil dihubungkan ke data resmi: ${targetStudent.nama} (${targetStudent.kelas}).`, 'success');
  };

  // Confirm saving Google Form accumulated records into database (Anti-Double Guaranteed)
  const handleSaveAccumulatedFormRecords = async () => {
    if (parsedFormResults.length === 0) return;

    let allNewRecords: LitNumRecord[] = [];
    parsedFormResults.forEach((res) => {
      // Use deduplicated rows only to prevent double data
      const converted = convertGoogleFormRowsToRecords(res, customTestDate, true);
      allNewRecords = [...allNewRecords, ...converted];
    });

    if (allNewRecords.length === 0) {
      showToast('Data Kosong', 'Tidak ada baris nilai yang dapat disimpan.', 'warning');
      return;
    }

    const success = await saveLitNumRecordsBatch(allNewRecords);
    if (success) {
      setParsedFormResults([]);
      setCachedUploadedFiles([]);
      setActiveTab('rekap');
    }
  };

  // Handle Official Rapor Pendidikan File Upload
  const handleRaporFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsingRapor(true);
    try {
      const parsed = await parseRaporPendidikanExcel(file);
      const docData: RaporPendidikanDoc = {
        id: `rapor-doc-${parsed.tahun}-${Date.now()}`,
        tahun: parsed.tahun,
        candidateYears: parsed.candidateYears,
        namaSekolah: parsed.namaSekolah,
        npsn: parsed.npsn,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser?.nama || 'Operator LitNum',
        skorLiterasi: parsed.skorLiterasi,
        capaianLiterasi: parsed.capaianLiterasi,
        literasiMahirPercent: parsed.literasiMahirPercent,
        literasiCakapPercent: parsed.literasiCakapPercent,
        literasiDasarPercent: parsed.literasiDasarPercent,
        literasiPerluIntervensiPercent: parsed.literasiPerluIntervensiPercent,
        skorNumerasi: parsed.skorNumerasi,
        capaianNumerasi: parsed.capaianNumerasi,
        numerasiMahirPercent: parsed.numerasiMahirPercent,
        numerasiCakapPercent: parsed.numerasiCakapPercent,
        numerasiDasarPercent: parsed.numerasiDasarPercent,
        numerasiPerluIntervensiPercent: parsed.numerasiPerluIntervensiPercent,
        indicators: parsed.indicators,
        rekomendasi: parsed.rekomendasi,
        sheetNames: parsed.sheetNames,
        sheetSummaries: parsed.sheetSummaries,
        rawSummary: parsed.rawSummary
      };

      setParsedRaporDoc(docData);
      await saveRaporPendidikanDoc(docData);
      showToast(
        'Rapor Pendidikan Terdeteksi',
        `Berhasil membaca Rapor Pendidikan Kemendikdasmen Tahun ${parsed.tahun} secara lengkap (${parsed.indicators.length} indikator & ${parsed.rekomendasi?.length || 0} rekomendasi dari ${parsed.sheetNames.length} sheet).`,
        'success'
      );
    } catch (err) {
      console.error('Error parsing Rapor Pendidikan Excel:', err);
      showToast('Gagal Membaca File Rapor', 'Pastikan file yang diunggah berupa file Excel resmi RAPOR-PBD dari Kemendikdasmen.', 'error');
    } finally {
      setIsParsingRapor(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleUpdateRaporYear = async (newYear: number) => {
    if (!parsedRaporDoc || isNaN(newYear) || newYear < 2020 || newYear > 2035) return;
    const updated: RaporPendidikanDoc = {
      ...parsedRaporDoc,
      tahun: newYear
    };
    setParsedRaporDoc(updated);
    await saveRaporPendidikanDoc(updated);
    setEditingYear(false);
    showToast('Tahun Rapor Diperbarui', `Tahun Rapor Pendidikan telah diset ke Tahun ${newYear}.`, 'success');
  };

  const handleDeleteRaporDoc = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Hapus dokumen Rapor Pendidikan ini?')) return;
    await deleteRaporPendidikanDoc(id);
    const remaining = raportDocs.filter((d) => d.id !== id);
    setParsedRaporDoc(remaining.length > 0 ? remaining[0] : null);
    showToast('Rapor Dihapus', 'Dokumen Rapor Pendidikan berhasil dihapus.', 'info');
  };

  // Insert formula symbol to active question input
  const handleInsertFormulaSymbol = (val: string) => {
    if (editingQuestionIndex === null) return;

    const updated = [...questions];
    const q = { ...updated[editingQuestionIndex] };

    if (activeFormulaTarget === 'soal') {
      q.soal += val;
    } else if (activeFormulaTarget === 'penjelasan') {
      q.penjelasan = (q.penjelasan || '') + val;
    } else if (activeFormulaTarget.startsWith('pilihan_')) {
      const optKey = activeFormulaTarget.replace('pilihan_', '') as 'A' | 'B' | 'C' | 'D' | 'E';
      q.pilihan = {
        ...q.pilihan,
        [optKey]: q.pilihan[optKey] + val
      };
    }

    updated[editingQuestionIndex] = q;
    setQuestions(updated);
  };

  // Save bank soal as an active assessment
  const handleSaveBankSoal = async () => {
    const domainType = selectedDay === 'selasa' ? 'Literasi' : 'Numerasi';
    const newAssessment: Assessment = {
      id: `asm-litnum-${Date.now()}`,
      guruId: currentUser?.id,
      jenis: 'DSMART',
      judul: `Asesmen ${domainType} ${selectedDay === 'selasa' ? 'Selasa' : 'Rabu'} - ${selectedClass}`,
      mataPelajaran: `${domainType} SMAN 3 Tumijajar`,
      kelas: selectedClass,
      fase: selectedClass.startsWith('X') ? 'Fase E' : 'Fase F',
      tahunAjaran: state?.schoolInfo?.tahunAjaranAktif || '2026/2027',
      semester: state?.schoolInfo?.semesterAktif || 'Ganjil',
      hariTanggal: selectedDay === 'selasa' ? 'Selasa' : 'Rabu',
      pukul: '07:30 - 08:30 WIB',
      waktuMenit: 60,
      guruPengampu: currentUser?.nama || 'Koordinator Literasi Numerasi',
      kktp: 75,
      jumlahSoal: questions.length,
      petunjukUmum: `Asesmen harian ${domainType} SMAN 3 Tumijajar. Bacalah wacana dengan teliti dan pilih jawaban terbaik.`,
      essayRubrik: [],
      mcqQuestions: questions,
      readingPassages: readingPassages,
      submissions: []
    };

    const success = await saveAssessment(newAssessment);
    if (success) {
      showToast('Bank Soal Berhasil Disimpan', `Paket Soal ${domainType} telah diterbitkan dan siap dikerjakan siswa.`, 'success');
    }
  };

  // Prepare chart data for analytics
  const classAnalyticsMap: Record<string, { class: string; literasiAvg: number; numerasiAvg: number; count: number }> = {};
  (state?.classes || []).forEach((c) => {
    classAnalyticsMap[c.nama] = { class: c.nama, literasiAvg: 0, numerasiAvg: 0, count: 0 };
  });

  litnumRecords.forEach((r) => {
    if (!classAnalyticsMap[r.kelas]) {
      classAnalyticsMap[r.kelas] = { class: r.kelas, literasiAvg: 0, numerasiAvg: 0, count: 0 };
    }
  });

  const chartData = Object.values(classAnalyticsMap).map((item) => {
    const classLitRecords = litnumRecords.filter((r) => r.kelas === item.class && r.type === 'literasi');
    const classNumRecords = litnumRecords.filter((r) => r.kelas === item.class && r.type === 'numerasi');

    const litAvg = classLitRecords.length > 0 ? Math.round(classLitRecords.reduce((a, b) => a + b.score, 0) / classLitRecords.length) : 72;
    const numAvg = classNumRecords.length > 0 ? Math.round(classNumRecords.reduce((a, b) => a + b.score, 0) / classNumRecords.length) : 69;

    return {
      kelas: item.class,
      Literasi: litAvg,
      Numerasi: numAvg
    };
  });

  // Filtered Rekap List
  const filteredRecords = litnumRecords.filter((r) => {
    const matchesClass = rekapFilterClass === 'SEMUA' || r.kelas === rekapFilterClass;
    const matchesType = rekapFilterType === 'SEMUA' || r.type === rekapFilterType;
    const matchesSearch =
      !rekapSearchText.trim() ||
      r.studentName.toLowerCase().includes(rekapSearchText.toLowerCase()) ||
      r.kelas.toLowerCase().includes(rekapSearchText.toLowerCase());

    return matchesClass && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-16">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 12, scale: 0.995 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.995 }}
          transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-6"
        >
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Executive Overview Header Card */}
          <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl relative overflow-hidden border border-indigo-800/50">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <LayoutDashboard className="w-56 h-56 text-indigo-300" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-slate-950 uppercase tracking-wide flex items-center gap-1.5 shadow-xs">
                    <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                    <span>DASHBOARD RINGKASAN EXECUTIVE</span>
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-indigo-200 border border-white/20">
                    SMAN 3 Tumijajar
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                    liveScheduleEval.isAllowed ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {liveScheduleEval.isAllowed ? 'SESI AKTIF HARI INI' : 'SESI DITUTUP JADWAL'}
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Ringkasan Pangkalan Data Literasi &amp; Numerasi
                </h2>
                <p className="text-xs sm:text-sm text-indigo-200 max-w-2xl font-medium leading-relaxed">
                  Pusat kendali eksekutif menyajikan ringkasan indikator Rapor Pendidikan Kemendikdasmen RI, hasil CBT siswa terakumulasi, status bank soal, dan proyeksi skor mutu sekolah.
                </p>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSwitchTab('bank_soal')}
                  className="px-5 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Olah Bank Soal &amp; Wacana</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchTab('rekap')}
                  className="px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Layers className="w-4 h-4 text-indigo-300" />
                  <span>Lihat Rekap Data Siswa ({litnumRecords.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* Metrics Overview Cards (4 Grid Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Literasi Rapor Resmi */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                  RAPOR LITERASI RESMI
                </span>
                <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {parsedRaporDoc?.skorLiterasi || 90.1} <span className="text-sm font-bold text-slate-400">/ 100</span>
                </p>
                <p className="text-xs font-extrabold text-emerald-700 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{parsedRaporDoc?.capaianLiterasi || 'Tinggi (90.1% Tuntas Min.)'}</span>
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Dokumen Rapor:</span>
                <span className="font-bold text-slate-800">Tahun {parsedRaporDoc?.tahun || 2025}</span>
              </div>
            </div>

            {/* Card 2: Numerasi Rapor Resmi */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                  RAPOR NUMERASI RESMI
                </span>
                <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                  <Calculator className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {parsedRaporDoc?.skorNumerasi || 78.6} <span className="text-sm font-bold text-slate-400">/ 100</span>
                </p>
                <p className="text-xs font-extrabold text-sky-700 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                  <span>{parsedRaporDoc?.capaianNumerasi || 'Sedang (78.6% Tuntas Min.)'}</span>
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Dokumen Rapor:</span>
                <span className="font-bold text-slate-800">Tahun {parsedRaporDoc?.tahun || 2025}</span>
              </div>
            </div>

            {/* Card 3: Total Rekam Hasil Siswa */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                  REKAM DATA SISWA
                </span>
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">
                  {litnumRecords.length} <span className="text-sm font-bold text-slate-400">Entri Siswa</span>
                </p>
                <p className="text-xs font-extrabold text-indigo-700 mt-1">
                  Terakumulasi Anti-Ganda Real-Time
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Master Data Siswa:</span>
                <span className="font-bold text-slate-800">{state?.students?.length || 0} Terdaftar</span>
              </div>
            </div>

            {/* Card 4: Proyeksi Estimasi 2026 */}
            <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-black uppercase tracking-wider text-purple-800 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
                  PROYEKSI RAPOR 2026
                </span>
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>
              <div>
                <p className="text-2xl font-black text-slate-900 font-mono tracking-tight">
                  Lit: {estimation2026.literasiProjectedScore}%
                </p>
                <p className="text-xs font-extrabold text-purple-700 mt-0.5 font-mono">
                  Num: {estimation2026.numerasiProjectedScore}%
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span>Simulasi Mutu:</span>
                <span className="font-bold text-emerald-700">Meningkat +3.2%</span>
              </div>
            </div>
          </div>

          {/* Section: Dual Summary Panels */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Summary Panel 1: Rapor Pendidikan Kemendikdasmen RI */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-slate-900 text-base">Capaian Rapor Pendidikan Resmi</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
                  Tahun {parsedRaporDoc?.tahun || 2025}
                </span>
              </div>

              {parsedRaporDoc ? (
                <div className="space-y-4 text-xs">
                  {/* Literasi Progress Bar */}
                  <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-indigo-950 text-xs">Literasi Membaca (A.1):</span>
                      <span className="font-black text-indigo-700 text-sm font-mono">{parsedRaporDoc.skorLiterasi} / 100</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex shadow-inner">
                      <div style={{ width: `${parsedRaporDoc.literasiMahirPercent}%` }} className="bg-emerald-500 h-full" title={`Mahir: ${parsedRaporDoc.literasiMahirPercent}%`} />
                      <div style={{ width: `${parsedRaporDoc.literasiCakapPercent}%` }} className="bg-sky-500 h-full" title={`Cakap: ${parsedRaporDoc.literasiCakapPercent}%`} />
                      <div style={{ width: `${parsedRaporDoc.literasiDasarPercent}%` }} className="bg-amber-400 h-full" title={`Dasar: ${parsedRaporDoc.literasiDasarPercent}%`} />
                      <div style={{ width: `${parsedRaporDoc.literasiPerluIntervensiPercent}%` }} className="bg-rose-500 h-full" title={`PIK: ${parsedRaporDoc.literasiPerluIntervensiPercent}%`} />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 pt-1 font-mono">
                      <span className="text-emerald-700">Mahir: {parsedRaporDoc.literasiMahirPercent}%</span>
                      <span className="text-sky-700">Cakap: {parsedRaporDoc.literasiCakapPercent}%</span>
                      <span className="text-amber-800">Dasar: {parsedRaporDoc.literasiDasarPercent}%</span>
                      <span className="text-rose-700">PIK: {parsedRaporDoc.literasiPerluIntervensiPercent}%</span>
                    </div>
                  </div>

                  {/* Numerasi Progress Bar */}
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-amber-950 text-xs">Numerasi Sains &amp; Matematika (A.2):</span>
                      <span className="font-black text-amber-800 text-sm font-mono">{parsedRaporDoc.skorNumerasi} / 100</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden flex shadow-inner">
                      <div style={{ width: `${parsedRaporDoc.numerasiMahirPercent}%` }} className="bg-emerald-500 h-full" title={`Mahir: ${parsedRaporDoc.numerasiMahirPercent}%`} />
                      <div style={{ width: `${parsedRaporDoc.numerasiCakapPercent}%` }} className="bg-sky-500 h-full" title={`Cakap: ${parsedRaporDoc.numerasiCakapPercent}%`} />
                      <div style={{ width: `${parsedRaporDoc.numerasiDasarPercent}%` }} className="bg-amber-400 h-full" title={`Dasar: ${parsedRaporDoc.numerasiDasarPercent}%`} />
                      <div style={{ width: `${parsedRaporDoc.numerasiPerluIntervensiPercent}%` }} className="bg-rose-500 h-full" title={`PIK: ${parsedRaporDoc.numerasiPerluIntervensiPercent}%`} />
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-600 pt-1 font-mono">
                      <span className="text-emerald-700">Mahir: {parsedRaporDoc.numerasiMahirPercent}%</span>
                      <span className="text-sky-700">Cakap: {parsedRaporDoc.numerasiCakapPercent}%</span>
                      <span className="text-amber-800">Dasar: {parsedRaporDoc.numerasiDasarPercent}%</span>
                      <span className="text-rose-700">PIK: {parsedRaporDoc.numerasiPerluIntervensiPercent}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <p className="text-xs text-slate-600 font-medium">Dokumen Rapor Pendidikan resmi belum diunggah.</p>
                  {!isKoordinatorOnly && (
                    <button
                      type="button"
                      onClick={() => handleSwitchTab('upload_rapor')}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Unggah File Rapor Pendidikan</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Summary Panel 2: Ringkasan Hasil CBT Live & Akumulasi Siswa */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-black text-slate-900 text-base">Hasil CBT &amp; Akumulasi Nilai Siswa</h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-indigo-100 text-indigo-900 border border-indigo-200">
                  {litnumRecords.length} Rec
                </span>
              </div>

              {(() => {
                const litRecs = litnumRecords.filter((r) => r.type === 'literasi');
                const numRecs = litnumRecords.filter((r) => r.type === 'numerasi');
                const avgLit = litRecs.length > 0 ? Math.round(litRecs.reduce((a, b) => a + b.score, 0) / litRecs.length) : 0;
                const avgNum = numRecs.length > 0 ? Math.round(numRecs.reduce((a, b) => a + b.score, 0) / numRecs.length) : 0;
                const zeroCount = litnumRecords.filter((r) => r.score === 0).length;

                return (
                  <div className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-1 text-center">
                        <span className="text-[10px] font-bold text-indigo-700 uppercase">Rata-rata Literasi</span>
                        <p className="text-2xl font-black text-indigo-900 font-mono">{avgLit || '-'}</p>
                        <span className="text-[10px] text-slate-500 font-medium block">{litRecs.length} Siswa Tes</span>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 space-y-1 text-center">
                        <span className="text-[10px] font-bold text-amber-800 uppercase">Rata-rata Numerasi</span>
                        <p className="text-2xl font-black text-amber-950 font-mono">{avgNum || '-'}</p>
                        <span className="text-[10px] text-slate-500 font-medium block">{numRecs.length} Siswa Tes</span>
                      </div>
                    </div>

                    {zeroCount > 0 && (
                      <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-center justify-between text-xs">
                        <span className="font-extrabold flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span>Terdeteksi {zeroCount} Siswa Skor 0 (Tidak Mengerjakan)</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSwitchTab('rekap')}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10.5px] cursor-pointer"
                        >
                          Lihat Rekap
                        </button>
                      </div>
                    )}

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs block">Lihat Rekapitulasi Lengkap Per Rombel</span>
                        <span className="text-[11px] text-slate-500">Tersedia fitur ekspor Excel &amp; pencarian otomatis.</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('rekap')}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer transition-all shrink-0"
                      >
                        Buka Rekapitulasi
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Quick Module Launchpad Grid */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">Peluncur Modul &amp; Akses Fitur Manajemen</h3>
              <span className="text-xs text-slate-500 font-medium">SMAN 3 Tumijajar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Card 1: Bank Soal */}
              <div
                onClick={() => handleSwitchTab('bank_soal')}
                className="p-5 rounded-2xl border-2 border-indigo-100 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/90 transition-all cursor-pointer space-y-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-slate-900">Olah Bank Soal &amp; Penjadwalan</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Susun butir soal Pilihan Ganda &amp; Wacana bertingkat, kelola jadwal otomatis Selasa (Literasi) &amp; Rabu (Numerasi).
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 pt-1">
                  <span>Buka Editor Bank Soal</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>

              {/* Card 2: Proyeksi 2026 */}
              <div
                onClick={() => handleSwitchTab('analytics')}
                className="p-5 rounded-2xl border-2 border-purple-100 hover:border-purple-400 bg-purple-50/40 hover:bg-purple-50/90 transition-all cursor-pointer space-y-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-slate-900">Proyeksi &amp; Simulasi Rapor 2026</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Visualisasi grafik capaian, simulasi estimasi skor mutu 2026, dan pengaturan sakelar jadwal otomatis.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 pt-1">
                  <span>Lihat Proyeksi 2026</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>

              {/* Card 3: Rekap Data Siswa */}
              <div
                onClick={() => handleSwitchTab('rekap')}
                className="p-5 rounded-2xl border-2 border-emerald-100 hover:border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/90 transition-all cursor-pointer space-y-2 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="font-black text-sm text-slate-900">Rekapitulasi Data Hasil Siswa</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  Pangkalan rekam data siswa terakumulasi, bebas data ganda, filter per rombel, dan ekspor ke Excel.
                </p>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 pt-1">
                  <span>Buka Rekap Data Siswa</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>

              {/* Card 4: Unggah Rapor (Admin & Operator only) */}
              {!isKoordinatorOnly && (
                <>
                  <div
                    onClick={() => handleSwitchTab('upload_rapor')}
                    className="p-5 rounded-2xl border-2 border-sky-100 hover:border-sky-400 bg-sky-50/40 hover:bg-sky-50/90 transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h4 className="font-black text-sm text-slate-900">Unggah Rapor Pendidikan Kemendikdasmen</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Unggah file resmi Rapor Pendidikan PBD (.xlsx), pembacaan otomatis seluruh sheet indikator.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 pt-1">
                      <span>Buka Form Unggah</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>

                  <div
                    onClick={() => handleSwitchTab('upload_googleform')}
                    className="p-5 rounded-2xl border-2 border-amber-100 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50/90 transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <h4 className="font-black text-sm text-slate-900">Impor Multi-File Google Form Excel</h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      Pengolahan massal file Excel Google Form dengan mesin otomatis pembersih data ganda.
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 pt-1">
                      <span>Buka Impor Excel</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 1: ANALYTICS & PROYEKSI RAPOR PENDIDIKAN 2026 */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Card Sakelar Aktifkan / Matikan & Penjadwalan Otomatis LitNum */}
          <div className="p-6 bg-white border-2 border-indigo-200 rounded-3xl shadow-sm space-y-5">
            {/* Header: Judul & Sakelar Master */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
                    KONTROL &amp; OTOMATISASI PENJADWALAN LITNUM
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    SMAN 3 Tumijajar
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  <span>Pengaturan Jadwal Pelaksanaan &amp; Otomatisasi Sistem</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Pengerjaan diatur otomatis: <strong>Selasa untuk Literasi</strong> dan <strong>Rabu untuk Numerasi</strong>. Di luar hari dan jam terjadwal, sistem pengerjaan otomatis <strong>mati / terkunci</strong> bagi siswa.
                </p>
              </div>

              {/* Master Toggle Button */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const nextConfig = { ...scheduleState, isEnabled: !scheduleState.isEnabled };
                    setScheduleState(nextConfig);
                    saveLitNumScheduleConfig(nextConfig);
                  }}
                  className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                    scheduleState.isEnabled
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                  }`}
                >
                  <RefreshCw className={`w-4 h-4 ${scheduleState.isEnabled ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
                  <span>{scheduleState.isEnabled ? 'SAKELAR SISTEM: AKTIF' : 'SAKELAR SISTEM: NONAKTIF (MATI)'}</span>
                </button>
              </div>
            </div>

            {/* Live Real-time Status Card Preview */}
            <div className={`p-4 rounded-2xl border-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
              liveScheduleEval.isAllowed
                ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                : 'bg-amber-50/80 border-amber-300 text-amber-950'
            }`}>
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className={`p-2.5 rounded-xl text-white shrink-0 mt-0.5 ${
                  liveScheduleEval.isAllowed ? 'bg-emerald-600' : 'bg-amber-600'
                }`}>
                  <Activity className="w-5 h-5" />
                </div>
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-white/80 border border-current shadow-2xs shrink-0">
                      {liveScheduleEval.dayName}, {liveScheduleEval.currentHHMM} WIB
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shrink-0 ${
                      liveScheduleEval.isAllowed
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-700 text-white'
                    }`}>
                      {liveScheduleEval.isAllowed ? 'SEDANG BUKA / BISA DIKERJAKAN' : 'DITUTUP OTOMATIS'}
                    </span>
                    {scheduleState.bypassScheduleForTesting && (
                      <span className="text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 px-2 py-0.5 rounded-full shrink-0">
                        Mode Simulasi Proktor Aktif
                      </span>
                    )}
                  </div>
                  <h4 className="font-extrabold text-sm text-slate-900 break-words">{liveScheduleEval.reasonTitle}</h4>
                  <p className="text-xs opacity-90 leading-relaxed break-words whitespace-normal">{liveScheduleEval.reasonMessage}</p>
                </div>
              </div>

              {/* Quick Badge Info */}
              <div className="flex md:flex-col items-start md:items-end gap-1 text-[11px] font-semibold text-slate-600 shrink-0 border-t md:border-t-0 md:border-l border-slate-200/80 pt-2 md:pt-0 md:pl-4 w-full md:w-auto justify-between md:justify-start">
                <span>Jadwal Aktif: <strong>{liveScheduleEval.scheduledDaysText}</strong></span>
                <span>Rentang Jam: <strong>{liveScheduleEval.timeRangeText}</strong></span>
              </div>
            </div>

            {/* Schedule Mode Selector & Rules */}
            <div className="space-y-3 pt-1">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wide">
                Pilih Mode Pelaksanaan LitNum:
              </label>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Option 1: Otomatis Resmi Kemendikdasmen (Selasa Lit, Rabu Num) */}
                <div
                  onClick={() => setScheduleState({ ...scheduleState, scheduleMode: 'otomatis_resmi' })}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    (scheduleState.scheduleMode || 'otomatis_resmi') === 'otomatis_resmi'
                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-indigo-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Otomatis Resmi (Paten)</span>
                    </span>
                    <span className="text-[9.5px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded">
                      REKOMENDASI
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    <strong>Selasa = Literasi</strong>, <strong>Rabu = Numerasi</strong>. Hari selain Selasa &amp; Rabu sistem <strong>otomatis mati / terkunci</strong>.
                  </p>
                </div>

                {/* Option 2: Kustom Hari */}
                <div
                  onClick={() => setScheduleState({ ...scheduleState, scheduleMode: 'kustom_hari' })}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    scheduleState.scheduleMode === 'kustom_hari'
                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>Kustom Hari Pelaksanaan</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Tentukan sendiri hari apa saja untuk Literasi dan Numerasi (misal jika ada ujian susulan di hari Kamis/Jumat).
                  </p>
                </div>

                {/* Option 3: Bebas Setiap Hari */}
                <div
                  onClick={() => setScheduleState({ ...scheduleState, scheduleMode: 'bebas_setiap_hari' })}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    scheduleState.scheduleMode === 'bebas_setiap_hari'
                      ? 'bg-indigo-50/80 border-indigo-600 ring-2 ring-indigo-500/20'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-emerald-600" />
                      <span>Buka Setiap Hari</span>
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-snug">
                    Buka setiap hari selama jam operasional aktif (cocok untuk periode pekan asesmen serentak sekolah).
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Days Checkbox Row (if kustom_hari selected) */}
            {scheduleState.scheduleMode === 'kustom_hari' && (
              <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-200 space-y-3">
                <span className="text-xs font-black text-indigo-900 block">
                  Pengaturan Hari Khusus Literasi &amp; Numerasi:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-indigo-100 space-y-2">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Hari Aktif Literasi:</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5, 6].map((dayIdx) => {
                        const isSelected = (scheduleState.activeDaysLiterasi || [2]).includes(dayIdx);
                        return (
                          <button
                            key={`lit-day-${dayIdx}`}
                            type="button"
                            onClick={() => {
                              const cur = scheduleState.activeDaysLiterasi || [2];
                              const next = isSelected ? cur.filter((d) => d !== dayIdx) : [...cur, dayIdx];
                              setScheduleState({ ...scheduleState, activeDaysLiterasi: next });
                            }}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {DAY_NAMES[dayIdx]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-white border border-indigo-100 space-y-2">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                      <Calculator className="w-3.5 h-3.5 text-teal-600" />
                      <span>Hari Aktif Numerasi:</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {[1, 2, 3, 4, 5, 6].map((dayIdx) => {
                        const isSelected = (scheduleState.activeDaysNumerasi || [3]).includes(dayIdx);
                        return (
                          <button
                            key={`num-day-${dayIdx}`}
                            type="button"
                            onClick={() => {
                              const cur = scheduleState.activeDaysNumerasi || [3];
                              const next = isSelected ? cur.filter((d) => d !== dayIdx) : [...cur, dayIdx];
                              setScheduleState({ ...scheduleState, activeDaysNumerasi: next });
                            }}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[11px] border cursor-pointer transition-all ${
                              isSelected
                                ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {DAY_NAMES[dayIdx]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Jam Mulai & Jam Selesai Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Jam Mulai Pengerjaan (WIB):</span>
                </label>
                <input
                  type="time"
                  value={scheduleState.jamMulai}
                  onChange={(e) => setScheduleState({ ...scheduleState, jamMulai: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-rose-600" />
                  <span>Jam Selesai Pengerjaan (WIB):</span>
                </label>
                <input
                  type="time"
                  value={scheduleState.jamSelesai}
                  onChange={(e) => setScheduleState({ ...scheduleState, jamSelesai: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Domain Aktif Pengerjaan:</label>
                <select
                  value={scheduleState.activeDomain || 'otomatis_hari'}
                  onChange={(e) => setScheduleState({ ...scheduleState, activeDomain: e.target.value as any })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="otomatis_hari">Otomatis Sesuai Hari (Selasa: Literasi, Rabu: Numerasi)</option>
                  <option value="literasi">Paksa Khusus Literasi Saja</option>
                  <option value="numerasi">Paksa Khusus Numerasi Saja</option>
                  <option value="semua">Buka Keduanya Sekaligus</option>
                </select>
              </div>
            </div>

            {/* Testing / Bypass Mode Checkbox */}
            <div className="p-3 rounded-2xl bg-purple-50/70 border border-purple-200 flex items-center justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-extrabold text-purple-950 flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-purple-700" />
                  <span>Mode Simulasi Proktor / Bypass Jadwal Hari (Testing)</span>
                </span>
                <p className="text-[11px] text-purple-800">
                  Aktifkan ini jika ingin menguji coba pengerjaan CBT di luar hari Selasa/Rabu untuk memastikan soal siap dikerjakan.
                </p>
              </div>
              <input
                type="checkbox"
                checked={Boolean(scheduleState.bypassScheduleForTesting)}
                onChange={(e) => setScheduleState({ ...scheduleState, bypassScheduleForTesting: e.target.checked })}
                className="w-5 h-5 text-purple-600 rounded border-slate-300 cursor-pointer"
              />
            </div>

            {/* Pesan Kustom Pengumuman Ditutup */}
            <div>
              <label className="block font-bold text-slate-700 text-xs mb-1">
                Pesan Khusus Saat Pengerjaan Ditutup (Muncul di Layar Siswa):
              </label>
              <input
                type="text"
                value={scheduleState.pesanPengumuman || ''}
                onChange={(e) => setScheduleState({ ...scheduleState, pesanPengumuman: e.target.value })}
                placeholder="Contoh: Pengerjaan Literasi & Numerasi terjadwal setiap Selasa (Literasi) dan Rabu (Numerasi) pukul 07:30 - 12:00 WIB."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900"
              />
            </div>

            {/* Bottom Actions: Save */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium">
                Terakhir diperbarui: {scheduleState.updatedAt ? new Date(scheduleState.updatedAt).toLocaleString('id-ID') : 'Belum diatur'} • Oleh: {scheduleState.updatedBy || 'Koordinator LitNum'}
              </span>

              <button
                type="button"
                onClick={async () => {
                  const success = await saveLitNumScheduleConfig(scheduleState);
                  if (success) {
                    showToast('Jadwal LitNum Disimpan', 'Konfigurasi otomatisasi jadwal pengerjaan telah disinkronkan ke seluruh sistem.', 'success');
                  }
                }}
                className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Penjadwalan</span>
              </button>
            </div>
          </div>

          {/* Card Estimate Proyeksi 2026 Rapor Pendidikan */}
          <div className="p-6 sm:p-7 bg-gradient-to-br from-amber-50 via-amber-100/40 to-orange-50 border-2 border-amber-300 rounded-3xl shadow-md relative overflow-hidden space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-amber-200/80 pb-5">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-amber-200 text-amber-950 border border-amber-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-amber-800" />
                    <span>ESTIMASI ANALITIK INTERNAL SEKOLAH (PREDIKTIF 2026)</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-white text-slate-800 border border-amber-200 shadow-2xs">
                    {estimation2026.totalStudentsEvaluated} Siswa Terdata • {estimation2026.totalTestsEvaluated} Tes Pengerjaan Riil
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2.5">
                  <Award className="w-7 h-7 text-amber-600 shrink-0" />
                  <span>Proyeksi Estimasi Rapor Pendidikan SMAN 3 Tumijajar 2026</span>
                </h3>
                <p className="text-xs text-slate-600 font-medium leading-relaxed max-w-3xl">
                  Gambaran estimasi persentase ketercapaian literasi &amp; numerasi Rapor Pendidikan sekolah tahun 2026 berdasarkan integrasi analitik baseline resmi Kemendikdasmen dengan data riil pengerjaan asesmen siswa terkini apa adanya.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
                <div className="px-4 py-2.5 bg-white rounded-2xl border border-amber-300 shadow-2xs text-xs text-amber-950 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Baseline Rapor Acuan:</span>
                    <strong className="text-sm font-black text-slate-900">Tahun {estimation2026.baselineYear}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSwitchTab('upload_rapor')}
                    className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-[11px] transition-all cursor-pointer"
                  >
                    Buka Dokumen
                  </button>
                </div>
              </div>
            </div>

            {/* Official Disclaimer Banner */}
            <div className="p-3.5 rounded-2xl bg-amber-100/80 border border-amber-300/80 flex items-start gap-2.5 text-xs text-amber-950 font-medium">
              <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong>Catatan Resmi:</strong> Proyeksi estimasi Rapor Pendidikan 2026 ini merupakan kalkulasi analitik internal prediktif sekolah SMAN 3 Tumijajar yang menggabungkan baseline resmi Rapor-PBD Kemendikdasmen dengan data empiris asesmen siswa apa adanya. <em>Bukan sebagai hasil resmi karena hasil resmi ada pada yang dilaporkan dan dirilis resmi oleh Kemendikdasmen RI.</em>
              </p>
            </div>

            {/* Dual Core Domain Estimations: Literasi & Numerasi */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card Estimasi Literasi 2026 */}
              <div className="p-5 sm:p-6 bg-white rounded-3xl border-2 border-indigo-200 shadow-xs space-y-5">
                <div className="flex items-start justify-between border-b border-indigo-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10.5px] font-black uppercase tracking-wider text-indigo-700 block">INDIKATOR PRIORITAS A.1</span>
                      <h4 className="text-lg font-black text-slate-900">Kemampuan Literasi 2026</h4>
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

                {/* Triangulation Metrics Comparison */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Baseline {estimation2026.baselineYear}</span>
                    <span className="text-sm font-black text-slate-900 font-mono">{estimation2026.baselineLitCompetencePercent}%</span>
                    <span className="text-[10px] text-slate-500 block font-medium">Skor: {estimation2026.baselineLitScore}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase block">2. Siswa Riil</span>
                    <span className="text-sm font-black text-indigo-900 font-mono">{estimation2026.litPassingRatePercent}%</span>
                    <span className="text-[10px] text-indigo-600 block font-medium">Rata2: {estimation2026.avgStudentLitScore}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">3. Proyeksi 2026</span>
                    <span className="text-sm font-black text-emerald-900 font-mono">{estimation2026.literasiProjectedCompetencePercent}%</span>
                    <span className="text-[10px] text-emerald-700 block font-medium">Indeks: {estimation2026.literasiProjectedScore}</span>
                  </div>
                </div>

                {/* Sebaran Kemahiran 4 Spektrum 2026 */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Prediksi Sebaran Spektrum Kemahiran 2026:</span>
                    <span className="text-indigo-700">Total: 100%</span>
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
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-emerald-900">
                    <span className="text-[9.5px] uppercase block text-emerald-700">Mahir</span>
                    <span className="text-xs font-black font-mono">{estimation2026.literasiMahirPercent}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 font-bold text-sky-900">
                    <span className="text-[9.5px] uppercase block text-sky-700">Cakap</span>
                    <span className="text-xs font-black font-mono">{estimation2026.literasiCakapPercent}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-900">
                    <span className="text-[9.5px] uppercase block text-amber-700">Dasar</span>
                    <span className="text-xs font-black font-mono">{estimation2026.literasiDasarPercent}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 font-bold text-rose-900">
                    <span className="text-[9.5px] uppercase block text-rose-700">Intervensi</span>
                    <span className="text-xs font-black font-mono">{estimation2026.literasiIntervensiPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Card Estimasi Numerasi 2026 */}
              <div className="p-5 sm:p-6 bg-white rounded-3xl border-2 border-teal-200 shadow-xs space-y-5">
                <div className="flex items-start justify-between border-b border-teal-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20">
                      <Calculator className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10.5px] font-black uppercase tracking-wider text-teal-700 block">INDIKATOR PRIORITAS A.2</span>
                      <h4 className="text-lg font-black text-slate-900">Kemampuan Numerasi 2026</h4>
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

                {/* Triangulation Metrics Comparison */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block">1. Baseline {estimation2026.baselineYear}</span>
                    <span className="text-sm font-black text-slate-900 font-mono">{estimation2026.baselineNumCompetencePercent}%</span>
                    <span className="text-[10px] text-slate-500 block font-medium">Skor: {estimation2026.baselineNumScore}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-teal-50 border border-teal-200">
                    <span className="text-[10px] font-bold text-teal-700 uppercase block">2. Siswa Riil</span>
                    <span className="text-sm font-black text-teal-900 font-mono">{estimation2026.numPassingRatePercent}%</span>
                    <span className="text-[10px] text-teal-600 block font-medium">Rata2: {estimation2026.avgStudentNumScore}</span>
                  </div>
                  <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-300">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">3. Proyeksi 2026</span>
                    <span className="text-sm font-black text-emerald-900 font-mono">{estimation2026.numerasiProjectedCompetencePercent}%</span>
                    <span className="text-[10px] text-emerald-700 block font-medium">Indeks: {estimation2026.numerasiProjectedScore}</span>
                  </div>
                </div>

                {/* Sebaran Kemahiran 4 Spektrum 2026 */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Prediksi Sebaran Spektrum Kemahiran 2026:</span>
                    <span className="text-teal-700">Total: 100%</span>
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
                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 font-bold text-emerald-900">
                    <span className="text-[9.5px] uppercase block text-emerald-700">Mahir</span>
                    <span className="text-xs font-black font-mono">{estimation2026.numerasiMahirPercent}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-50 border border-sky-200 font-bold text-sky-900">
                    <span className="text-[9.5px] uppercase block text-sky-700">Cakap</span>
                    <span className="text-xs font-black font-mono">{estimation2026.numerasiCakapPercent}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 font-bold text-amber-900">
                    <span className="text-[9.5px] uppercase block text-amber-700">Dasar</span>
                    <span className="text-xs font-black font-mono">{estimation2026.numerasiDasarPercent}%</span>
                  </div>
                  <div className="p-2 rounded-xl bg-rose-50 border border-rose-200 font-bold text-rose-900">
                    <span className="text-[9.5px] uppercase block text-rose-700">Intervensi</span>
                    <span className="text-xs font-black font-mono">{estimation2026.numerasiIntervensiPercent}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulasi Skenario Intervensi Strategis 2026 */}
            <div className="p-5 sm:p-6 bg-white rounded-3xl border border-amber-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-600" />
                    <span>Simulasi Skenario Target Intervensi Sekolah 2026</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">Pilih skenario kebijakan untuk melihat dinamika estimasi persentase Rapor Pendidikan 2026.</p>
                </div>
                <span className="text-[11px] font-extrabold text-amber-800 bg-amber-100 px-3 py-1 rounded-full self-start sm:self-auto">
                  Skenario Aktif: #{selectedScenarioIdx + 1}
                </span>
              </div>

              {/* Scenario Toggle Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {estimation2026.scenarios.map((sc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedScenarioIdx(idx)}
                    className={`p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer space-y-1.5 ${
                      selectedScenarioIdx === idx
                        ? 'bg-amber-50/80 border-amber-500 ring-2 ring-amber-400/20 shadow-xs'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">{sc.scenarioName}</span>
                      {selectedScenarioIdx === idx && (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                      {sc.description}
                    </p>
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-mono font-bold">
                      <span className="text-indigo-700">Lit: {sc.projectedLitCompetencePercent}%</span>
                      <span className="text-teal-700">Num: {sc.projectedNumCompetencePercent}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Breakdown Kontribusi per Jenjang / Fase */}
            {estimation2026.cohortBreakdowns && estimation2026.cohortBreakdowns.length > 0 && (
              <div className="p-5 sm:p-6 bg-white rounded-3xl border border-amber-200 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    <span>Kontribusi Empiris Siswa Riil per Jenjang / Fase Menuju 2026</span>
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">Ketercapaian kompetensi minimum siswa riil berdasarkan pengerjaan asesmen di setiap tingkatan kelas SMAN 3 Tumijajar.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {estimation2026.cohortBreakdowns.map((coh, cIdx) => (
                    <div key={cIdx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">{coh.tingkat}</span>
                        <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                          {coh.totalStudents} Siswa
                        </span>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-white border border-indigo-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-indigo-700 font-bold">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Literasi:</span>
                          </div>
                          <div className="text-right font-mono font-black">
                            <span className="text-indigo-900">{coh.litCompetenceRate}%</span>
                            <span className="text-[10px] text-slate-400 block font-normal">Rata2: {coh.avgLitScore}</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-white border border-teal-100 flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-teal-700 font-bold">
                            <Calculator className="w-3.5 h-3.5" />
                            <span>Numerasi:</span>
                          </div>
                          <div className="text-right font-mono font-black">
                            <span className="text-teal-900">{coh.numCompetenceRate}%</span>
                            <span className="text-[10px] text-slate-400 block font-normal">Rata2: {coh.avgNumScore}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chart Per Rombel Kelas */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Analisis Perbandingan Tingkat Literasi &amp; Numerasi Per Kelas</h3>
                <p className="text-xs text-slate-500 font-medium">Persentase rata-rata ketercapaian siswa berdasarkan data tes terakumulasi SMAN 3 Tumijajar</p>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="kelas" tick={{ fontSize: 11, fontWeight: 700 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 700 }} />
                  <Bar dataKey="Literasi" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Numerasi" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BANK SOAL (HARI SELASA & RABU) */}
      {activeTab === 'bank_soal' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Kelola Bank Soal Literasi &amp; Numerasi</h3>
                <p className="text-xs text-slate-500 font-medium">Pengaturan otomatis: Hari Selasa = Literasi, Hari Rabu = Numerasi</p>
              </div>

              {/* Day Switcher */}
              <div className="p-1 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-1 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setSelectedDay('selasa')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    selectedDay === 'selasa' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Selasa: Literasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDay('rabu')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                    selectedDay === 'rabu' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>Rabu: Numerasi</span>
                </button>
              </div>
            </div>

            {/* Reading Passages Section for Literacy */}
            {selectedDay === 'selasa' && (
              <div className="p-5 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs text-indigo-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Wacana / Paragraf Literasi (Multi-Paragraf Lengkap)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setReadingPassages([
                        ...readingPassages,
                        {
                          id: `wacana-${Date.now()}`,
                          teks: 'Masukkan isi paragraf wacana tambahan di sini...',
                          nomorAwal: 6,
                          nomorAkhir: 10,
                          judul: 'Wacana Baru'
                        }
                      ]);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Paragraf Wacana</span>
                  </button>
                </div>

                {readingPassages.map((passage, idx) => (
                  <div key={passage.id} className="p-4 bg-white rounded-xl border border-indigo-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={passage.judul || ''}
                        onChange={(e) => {
                          const updated = [...readingPassages];
                          updated[idx].judul = e.target.value;
                          setReadingPassages(updated);
                        }}
                        placeholder="Judul Wacana Paragraf..."
                        className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 flex-1"
                      />
                      <span className="text-xs text-slate-500 font-bold">Untuk Soal No:</span>
                      <input
                        type="number"
                        value={passage.nomorAwal}
                        onChange={(e) => {
                          const updated = [...readingPassages];
                          updated[idx].nomorAwal = parseInt(e.target.value, 10) || 1;
                          setReadingPassages(updated);
                        }}
                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-center"
                      />
                      <span className="text-xs text-slate-500 font-bold">s/d</span>
                      <input
                        type="number"
                        value={passage.nomorAkhir}
                        onChange={(e) => {
                          const updated = [...readingPassages];
                          updated[idx].nomorAkhir = parseInt(e.target.value, 10) || 5;
                          setReadingPassages(updated);
                        }}
                        className="w-14 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-center"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <QuestionFormattingToolbar
                        value={passage.teks}
                        onChange={(newVal) => {
                          const updated = [...readingPassages];
                          updated[idx].teks = newVal;
                          setReadingPassages(updated);
                        }}
                        placeholder="Tuliskan stimulus wacana cerita/data di sini (bisa diformat tebal Ctrl+B, miring Ctrl+I, garis bawah Ctrl+U, penomoran berurutan)..."
                        minHeight="85px"
                        compact
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Math & Physics Formula Insertion Helper for Numeracy */}
            {selectedDay === 'rabu' && (
              <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-2xl space-y-2">
                <span className="font-extrabold text-xs text-sky-900 flex items-center gap-2">
                  <Calculator className="w-4 h-4 text-sky-600" />
                  <span>Bantuan Bantuan Rumus Matematika, Fisika &amp; Simbol Eksak</span>
                </span>
                <FormulaArabicHelper onInsert={handleInsertFormulaSymbol} />
              </div>
            )}

            {/* Questions List & Builder */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-slate-900">Daftar Butir Soal ({questions.length} Soal)</h4>
                <button
                  type="button"
                  onClick={() => {
                    const newNo = questions.length + 1;
                    setQuestions([
                      ...questions,
                      {
                        nomor: newNo,
                        soal: `Soal nomor ${newNo}...`,
                        modelSoal: 'PG',
                        pilihan: { A: 'Pilihan A', B: 'Pilihan B', C: 'Pilihan C', D: 'Pilihan D', E: 'Pilihan E' },
                        kunci: 'A',
                        skor: 20,
                        penjelasan: 'Penjelasan singkat jawaban.',
                        domainLitNum: selectedDay === 'selasa' ? 'literasi' : 'numerasi'
                      }
                    ]);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Butir Soal</span>
                </button>
              </div>

              {questions.map((q, qIdx) => {
                const matchingPassage = readingPassages.find(
                  (p) => q.nomor >= p.nomorAwal && q.nomor <= p.nomorAkhir
                );
                return (
                  <DynamicQuestionEditor
                    key={q.nomor}
                    question={q}
                    index={qIdx}
                    totalQuestions={questions.length}
                    subjectName={selectedDay === 'selasa' ? 'Literasi Bahasa & Membaca' : 'Numerasi Logika Matematika'}
                    domain={selectedDay === 'selasa' ? 'literasi' : 'numerasi'}
                    stimulusText={matchingPassage ? matchingPassage.teks : ''}
                    onChange={(updated) => {
                      const copy = [...questions];
                      copy[qIdx] = updated;
                      setQuestions(copy);
                    }}
                    onDelete={() => {
                      setQuestions(questions.filter((_, idx) => idx !== qIdx));
                    }}
                    showToast={showToast}
                  />
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={handleSaveBankSoal}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Simpan &amp; Terbitkan Bank Soal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: UNGGAH RAPOR PENDIDIKAN KEMENDIKDASMEN */}
      {activeTab === 'upload_rapor' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Unggah File Rapor Pendidikan (Kemendikdasmen RI)</h3>
                <p className="text-xs text-slate-500 font-medium">Unggah file EXCEL (.xlsx / .xls) resmi RAPOR-PBD yang diunduh langsung dari situs resmi Kemendikdasmen. Seluruh isi sheet, indikator, dan rekomendasi terbaca akurat secara otomatis.</p>
              </div>

              {parsedRaporDoc && (
                <button
                  type="button"
                  onClick={() => handleSwitchTab('analytics')}
                  className="px-4 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5 self-start sm:self-auto shrink-0"
                >
                  <TrendingUp className="w-4 h-4" />
                  <span>Lihat Estimasi Proyeksi 2026</span>
                </button>
              )}
            </div>

            {/* Document Year Selector / Switcher if multiple documents exist */}
            {raportDocs.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">Dokumen Rapor Tersimpan:</span>
                  {raportDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setParsedRaporDoc(doc)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                          parsedRaporDoc?.id === doc.id
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Tahun {doc.tahun}</span>
                        {parsedRaporDoc?.id === doc.id && (
                          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteRaporDoc(doc.id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                        title={`Hapus Rapor ${doc.tahun}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => raporFileRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Unggah Rapor File Lain</span>
                </button>
              </div>
            )}

            {/* Dropzone */}
            <div
              onClick={() => raporFileRef.current?.click()}
              className="p-8 border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-3xl bg-emerald-50/40 hover:bg-emerald-50/80 transition-all text-center cursor-pointer space-y-3"
            >
              <input
                type="file"
                ref={raporFileRef}
                onChange={handleRaporFileSelected}
                accept=".xlsx,.xls"
                className="hidden"
              />
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900">Klik atau seret file Excel RAPOR-PBD di sini</h4>
                <p className="text-xs text-slate-500 font-medium mt-1">Mendukung format resmi Excel Kemendikdasmen (.xlsx, .xls) — tahun laporan dan seluruh indikator langsung terdeteksi akurat.</p>
              </div>
            </div>

            {/* Parsed Rapor Comprehensive Dashboard Preview */}
            {parsedRaporDoc ? (
              <div className="space-y-6 pt-2">
                {/* 1. Header Banner Dokumen Resmi */}
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white shadow-lg relative overflow-hidden">
                  <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/30 text-white backdrop-blur-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                          <span>DOKUMEN RESMI RAPOR-PBD KEMENDIKDASMEN RI</span>
                        </span>

                        {/* Year Badge + Instant Inline Edit */}
                        <div className="flex items-center gap-1.5 bg-amber-400 text-slate-950 px-3 py-1 rounded-full shadow-md">
                          <span className="text-xs font-black uppercase tracking-wider">
                            TAHUN RAPOR {parsedRaporDoc.tahun}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingYear(!editingYear);
                              setCustomYearInput(String(parsedRaporDoc.tahun));
                            }}
                            className="p-0.5 hover:bg-amber-500 rounded text-slate-950 transition-colors cursor-pointer"
                            title="Klik untuk ubah tahun jika berbeda"
                          >
                            <Edit className="w-3 h-3" />
                          </button>
                        </div>

                        {editingYear && (
                          <div className="flex items-center gap-1.5 bg-white text-slate-900 px-2.5 py-1 rounded-xl shadow-md border border-slate-300">
                            <span className="text-[11px] font-bold">Pilih:</span>
                            {[2024, 2025, 2026, 2023].map((y) => (
                              <button
                                key={y}
                                type="button"
                                onClick={() => handleUpdateRaporYear(y)}
                                className={`px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer transition-all ${
                                  parsedRaporDoc.tahun === y
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                                }`}
                              >
                                {y}
                              </button>
                            ))}
                            <input
                              type="number"
                              value={customYearInput}
                              onChange={(e) => setCustomYearInput(e.target.value)}
                              className="w-16 px-1.5 py-0.5 border border-slate-300 rounded text-xs font-mono font-bold"
                              placeholder="Tahun"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateRaporYear(parseInt(customYearInput, 10))}
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] cursor-pointer"
                            >
                              Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingYear(false)}
                              className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        {/* Candidate Years Detected from File */}
                        {parsedRaporDoc.candidateYears && parsedRaporDoc.candidateYears.length > 1 && (
                          <div className="flex items-center gap-1 text-[11px] bg-white/10 px-2.5 py-1 rounded-full text-emerald-100 border border-white/20">
                            <span>Tahun di file:</span>
                            {parsedRaporDoc.candidateYears.map((cy) => (
                              <button
                                key={cy}
                                type="button"
                                onClick={() => handleUpdateRaporYear(cy)}
                                className={`px-1.5 py-0.5 rounded text-[10.5px] font-black underline cursor-pointer hover:text-white ${
                                  parsedRaporDoc.tahun === cy ? 'text-amber-300' : 'text-emerald-200'
                                }`}
                              >
                                {cy}
                              </button>
                            ))}
                          </div>
                        )}

                        <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-white/10 text-emerald-100 border border-white/20">
                          {parsedRaporDoc.indicators.length} Indikator Terbaca
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-white/10 text-emerald-100 border border-white/20">
                          {parsedRaporDoc.rekomendasi?.length || 0} Rekomendasi
                        </span>
                      </div>

                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                        {parsedRaporDoc.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
                      </h3>
                      <p className="text-xs text-emerald-100 font-medium">
                        NPSN: <strong className="text-white font-mono">{parsedRaporDoc.npsn || '10809544'}</strong> • File: <span className="font-mono text-white/90">{parsedRaporDoc.fileName}</span> • Diunggah: {new Date(parsedRaporDoc.uploadedAt).toLocaleString('id-ID')}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => raporFileRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Upload className="w-3.5 h-3.5 text-emerald-700" />
                        <span>Ganti File Excel Rapor</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSwitchTab('analytics')}
                        className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Buka Simulasi Estimasi 2026</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. Kartu Domain Utama: Literasi & Numerasi (Persentase Akurat Sesuai File Excel) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Kartu Literasi */}
                  <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-50/70 via-white to-sky-50/50 rounded-3xl border-2 border-indigo-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
                          <BookOpen className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[11px] font-black uppercase text-indigo-700 tracking-wider block">INDIKATOR PRIORITAS A.1</span>
                          <h4 className="text-lg font-black text-slate-900">Kemampuan Literasi</h4>
                          <span className="text-xs text-slate-500 font-semibold">{parsedRaporDoc.capaianLiterasi}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-indigo-700 font-mono">{parsedRaporDoc.skorLiterasi}</span>
                        <span className="text-[11px] font-bold text-slate-500 block">Skor Resmi {parsedRaporDoc.tahun}</span>
                        <span className="text-[11px] font-black text-emerald-700 block mt-0.5">
                          {Math.round((parsedRaporDoc.literasiMahirPercent + parsedRaporDoc.literasiCakapPercent) * 10) / 10}% Tuntas Min.
                        </span>
                      </div>
                    </div>

                    {/* Multi-tier Percentage Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Sebaran Kemahiran Literasi (Isi File Excel):</span>
                        <span className="text-indigo-700">Total: 100%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200 flex shadow-inner">
                        <div style={{ width: `${parsedRaporDoc.literasiMahirPercent}%` }} className="bg-emerald-500 h-full rounded-l-full transition-all" title={`Mahir: ${parsedRaporDoc.literasiMahirPercent}%`} />
                        <div style={{ width: `${parsedRaporDoc.literasiCakapPercent}%` }} className="bg-sky-500 h-full transition-all" title={`Cakap: ${parsedRaporDoc.literasiCakapPercent}%`} />
                        <div style={{ width: `${parsedRaporDoc.literasiDasarPercent}%` }} className="bg-amber-400 h-full transition-all" title={`Dasar: ${parsedRaporDoc.literasiDasarPercent}%`} />
                        <div style={{ width: `${parsedRaporDoc.literasiPerluIntervensiPercent}%` }} className="bg-rose-500 h-full rounded-r-full transition-all" title={`Intervensi: ${parsedRaporDoc.literasiPerluIntervensiPercent}%`} />
                      </div>
                    </div>

                    {/* 4 Detail Grid Box Persentase */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Mahir</span>
                        <span className="text-base font-black text-emerald-900 font-mono">{parsedRaporDoc.literasiMahirPercent}%</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200">
                        <span className="text-[10px] font-bold text-sky-800 uppercase block">Cakap</span>
                        <span className="text-base font-black text-sky-900 font-mono">{parsedRaporDoc.literasiCakapPercent}%</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">Dasar</span>
                        <span className="text-base font-black text-amber-900 font-mono">{parsedRaporDoc.literasiDasarPercent}%</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200">
                        <span className="text-[10px] font-bold text-rose-800 uppercase block">Intervensi</span>
                        <span className="text-base font-black text-rose-900 font-mono">{parsedRaporDoc.literasiPerluIntervensiPercent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Kartu Numerasi */}
                  <div className="p-5 sm:p-6 bg-gradient-to-br from-teal-50/70 via-white to-emerald-50/50 rounded-3xl border-2 border-teal-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-teal-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md shadow-teal-600/20 shrink-0">
                          <Calculator className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[11px] font-black uppercase text-teal-700 tracking-wider block">INDIKATOR PRIORITAS A.2</span>
                          <h4 className="text-lg font-black text-slate-900">Kemampuan Numerasi</h4>
                          <span className="text-xs text-slate-500 font-semibold">{parsedRaporDoc.capaianNumerasi}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-3xl font-black text-teal-700 font-mono">{parsedRaporDoc.skorNumerasi}</span>
                        <span className="text-[11px] font-bold text-slate-500 block">Skor Resmi {parsedRaporDoc.tahun}</span>
                        <span className="text-[11px] font-black text-emerald-700 block mt-0.5">
                          {Math.round((parsedRaporDoc.numerasiMahirPercent + parsedRaporDoc.numerasiCakapPercent) * 10) / 10}% Tuntas Min.
                        </span>
                      </div>
                    </div>

                    {/* Multi-tier Percentage Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span>Sebaran Kemahiran Numerasi (Isi File Excel):</span>
                        <span className="text-teal-700">Total: 100%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden p-0.5 border border-slate-200 flex shadow-inner">
                        <div style={{ width: `${parsedRaporDoc.numerasiMahirPercent}%` }} className="bg-emerald-500 h-full rounded-l-full transition-all" title={`Mahir: ${parsedRaporDoc.numerasiMahirPercent}%`} />
                        <div style={{ width: `${parsedRaporDoc.numerasiCakapPercent}%` }} className="bg-sky-500 h-full transition-all" title={`Cakap: ${parsedRaporDoc.numerasiCakapPercent}%`} />
                        <div style={{ width: `${parsedRaporDoc.numerasiDasarPercent}%` }} className="bg-amber-400 h-full transition-all" title={`Dasar: ${parsedRaporDoc.numerasiDasarPercent}%`} />
                        <div style={{ width: `${parsedRaporDoc.numerasiPerluIntervensiPercent}%` }} className="bg-rose-500 h-full rounded-r-full transition-all" title={`Intervensi: ${parsedRaporDoc.numerasiPerluIntervensiPercent}%`} />
                      </div>
                    </div>

                    {/* 4 Detail Grid Box Persentase */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Mahir</span>
                        <span className="text-base font-black text-emerald-900 font-mono">{parsedRaporDoc.numerasiMahirPercent}%</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-sky-50 border border-sky-200">
                        <span className="text-[10px] font-bold text-sky-800 uppercase block">Cakap</span>
                        <span className="text-base font-black text-sky-900 font-mono">{parsedRaporDoc.numerasiCakapPercent}%</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">Dasar</span>
                        <span className="text-base font-black text-amber-900 font-mono">{parsedRaporDoc.numerasiDasarPercent}%</span>
                      </div>
                      <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200">
                        <span className="text-[10px] font-bold text-rose-800 uppercase block">Intervensi</span>
                        <span className="text-base font-black text-rose-900 font-mono">{parsedRaporDoc.numerasiPerluIntervensiPercent}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Sub-Navigation Tabs untuk Data Mendalam Rapor Pendidikan */}
                <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
                    <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
                      <button
                        type="button"
                        onClick={() => setRaporSubTab('indikator')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                          raporSubTab === 'indikator'
                            ? 'bg-white text-indigo-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <BarChart3 className="w-4 h-4 text-indigo-600" />
                        <span>Seluruh Indikator ({parsedRaporDoc.indicators.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRaporSubTab('rekomendasi')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                          raporSubTab === 'rekomendasi'
                            ? 'bg-white text-indigo-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Rekomendasi PBD ({parsedRaporDoc.rekomendasi?.length || 0})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRaporSubTab('sheets')}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                          raporSubTab === 'sheets'
                            ? 'bg-white text-indigo-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Layers className="w-4 h-4 text-teal-600" />
                        <span>Sheet Excel ({parsedRaporDoc.sheetNames?.length || 0})</span>
                      </button>
                    </div>

                    <span className="text-xs text-slate-500 font-medium">
                      Data hasil ekstraksi mendalam resmi Kemendikdasmen RI
                    </span>
                  </div>

                  {/* Sub-Tab 1: Seluruh Indikator & Sub-Indikator Lengkap */}
                  {raporSubTab === 'indikator' && (
                    <div className="space-y-4">
                      {/* Search and Category Filter Toolbar */}
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-1 text-xs">
                          {['all', 'Literasi', 'Numerasi', 'Karakter', 'Kualitas Pembelajaran', 'Iklim Keamanan', 'Iklim Kebinekaan'].map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setIndicatorCategoryFilter(cat)}
                              className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-all ${
                                indicatorCategoryFilter === cat
                                  ? 'bg-indigo-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              }`}
                            >
                              {cat === 'all' ? 'Semua Kategori' : cat}
                            </button>
                          ))}
                        </div>

                        <div className="relative min-w-[220px]">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Cari indikator (A.1, numerasi...)"
                            value={indicatorSearchQuery}
                            onChange={(e) => setIndicatorSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Indikator Table */}
                      <div className="overflow-x-auto rounded-2xl border border-slate-200">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-extrabold uppercase text-[10.5px]">
                            <tr>
                              <th className="p-3 w-16">Kode</th>
                              <th className="p-3">Nama Indikator Resmi</th>
                              <th className="p-3 w-28">Kategori</th>
                              <th className="p-3 w-24 text-right">Skor Nilai</th>
                              <th className="p-3 w-36">Capaian</th>
                              <th className="p-3 w-32">Perubahan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {parsedRaporDoc.indicators
                              .filter((ind) => {
                                if (indicatorCategoryFilter !== 'all' && ind.kategori !== indicatorCategoryFilter) {
                                  return false;
                                }
                                if (indicatorSearchQuery.trim()) {
                                  const q = indicatorSearchQuery.toLowerCase();
                                  return (
                                    (ind.code && ind.code.toLowerCase().includes(q)) ||
                                    ind.namaIndikator.toLowerCase().includes(q) ||
                                    (ind.definisi && ind.definisi.toLowerCase().includes(q))
                                  );
                                }
                                return true;
                              })
                              .map((ind, iIdx) => (
                                <tr key={iIdx} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-3 font-mono font-bold text-indigo-700">{ind.code || `I-${iIdx + 1}`}</td>
                                  <td className="p-3">
                                    <span className="font-extrabold text-slate-900 block">{ind.namaIndikator}</span>
                                    {ind.definisi && (
                                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5 line-clamp-2">
                                        {ind.definisi}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 font-semibold text-slate-600">{ind.kategori}</td>
                                  <td className="p-3 text-right font-mono font-black text-slate-900 text-sm">
                                    {ind.skor}
                                  </td>
                                  <td className="p-3">
                                    <span className={`px-2.5 py-1 rounded-lg text-[10.5px] font-black inline-block ${
                                      ind.skor >= 80
                                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                        : ind.skor >= 60
                                        ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                        : ind.skor >= 40
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                        : 'bg-rose-100 text-rose-900 border border-rose-300'
                                    }`}>
                                      {ind.capaian}
                                    </span>
                                  </td>
                                  <td className="p-3 text-[11px] font-semibold text-slate-600">
                                    {ind.perubahan || 'Stabil'}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Sub-Tab 2: Rekomendasi PBD & Inspirasi Kegiatan Benahi */}
                  {raporSubTab === 'rekomendasi' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 font-medium leading-relaxed">
                        Berikut adalah daftar akar masalah dan inspirasi kegiatan benahi resmi Kemendikdasmen yang diekstraksi dari sheet <strong>Rekomendasi PBD / Prioritas Rekomendasi</strong> file Excel. Jadikan acuan utama dalam perencanaan berbasis data dan rencana kerja tahunan (RKT) sekolah.
                      </div>

                      <div className="space-y-4">
                        {(parsedRaporDoc.rekomendasi || []).map((rec, rIdx) => (
                          <div key={rec.id || rIdx} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-lg text-[10.5px] font-black bg-amber-200 text-amber-950">
                                  {rec.prioritas || `Prioritas ${rIdx + 1}`}
                                </span>
                                <h4 className="font-black text-sm text-slate-900">{rec.indikator}</h4>
                              </div>
                              {rec.skor && (
                                <span className="text-xs font-mono font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-200">
                                  Skor: {rec.skor} ({rec.capaian || 'Cakap'})
                                </span>
                              )}
                            </div>

                            {/* Akar Masalah */}
                            <div className="space-y-1">
                              <span className="text-[11px] font-black uppercase text-rose-700 tracking-wider block">
                                Identifikasi Akar Masalah:
                              </span>
                              <p className="text-xs font-bold text-slate-800 leading-relaxed bg-white p-3 rounded-xl border border-rose-100">
                                {rec.akarMasalah}
                              </p>
                            </div>

                            {/* Inspirasi Kegiatan Benahi */}
                            {rec.inspirasiBenahi && rec.inspirasiBenahi.length > 0 && (
                              <div className="space-y-1.5 pt-1">
                                <span className="text-[11px] font-black uppercase text-emerald-700 tracking-wider block">
                                  Inspirasi Kegiatan Benahi (Tindakan Nyata Sekolah):
                                </span>
                                <ul className="space-y-1.5 text-xs text-slate-700 font-medium">
                                  {rec.inspirasiBenahi.map((step, sIdx) => (
                                    <li key={sIdx} className="flex items-start gap-2 bg-white p-2.5 rounded-xl border border-slate-200/90">
                                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                      <span className="leading-relaxed">{step}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {/* Tautan PMM & Usulan ARKAS */}
                            {(rec.tautanReferensi || rec.programKegiatanArkas) && (
                              <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                {rec.programKegiatanArkas && (
                                  <span className="text-slate-600 font-semibold">
                                    Usulan ARKAS: <strong>{rec.programKegiatanArkas}</strong>
                                  </span>
                                )}
                                {rec.tautanReferensi && (
                                  <a
                                    href={rec.tautanReferensi}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                                  >
                                    <span>Buka Modul di PMM</span>
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sub-Tab 3: Ringkasan Seluruh Sheet Excel & Deep Table Preview */}
                  {raporSubTab === 'sheets' && (
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 text-xs text-teal-950 font-medium leading-relaxed">
                        Sistem SiMantri memindai dan mengekstraksi seluruh lembar kerja (<strong>{parsedRaporDoc.sheetNames?.length || 0} sheets</strong>) dari file Excel resmi Kemendikdasmen tanpa ada data yang terlewatkan. Klik pada kartu sheet untuk membuka pratinjau data baris terdalam.
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {(parsedRaporDoc.sheetSummaries || (parsedRaporDoc.sheetNames || []).map((n) => ({ name: n, rowCount: 50, columns: [] as string[], previewRows: [] }))).map((s, sIdx) => {
                          const isExpanded = activeSheetPreview === s.name;
                          return (
                            <div
                              key={sIdx}
                              onClick={() => setActiveSheetPreview(isExpanded ? null : s.name)}
                              className={`p-4 rounded-2xl border transition-all space-y-2 cursor-pointer ${
                                isExpanded
                                  ? 'bg-teal-50/80 border-teal-500 ring-2 ring-teal-400/20 shadow-sm'
                                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FileSpreadsheet className="w-4 h-4 text-teal-600 shrink-0" />
                                  <span className="font-extrabold text-xs text-slate-900 truncate" title={s.name}>{s.name}</span>
                                </div>
                                <span className="text-[10px] font-black text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full shrink-0">
                                  {s.rowCount} Baris
                                </span>
                              </div>

                              {s.columns && s.columns.length > 0 && (
                                <p className="text-[11px] text-slate-500 font-medium line-clamp-1">
                                  Kolom: {s.columns.slice(0, 4).join(', ')}{s.columns.length > 4 ? '...' : ''}
                                </p>
                              )}

                              <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] font-bold text-teal-700">
                                <span>{isExpanded ? 'Tutup Pratinjau' : 'Lihat Data Baris'}</span>
                                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Expanded Sheet Table Preview */}
                      {activeSheetPreview && (() => {
                        const activeSummary = parsedRaporDoc.sheetSummaries?.find((s) => s.name === activeSheetPreview);
                        const previewRows = activeSummary?.previewRows || [];
                        const columns = activeSummary?.columns || (previewRows.length > 0 ? Object.keys(previewRows[0]) : []);

                        return (
                          <div className="p-5 rounded-3xl bg-slate-50 border-2 border-teal-300 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                              <div className="flex items-center gap-2">
                                <FileSpreadsheet className="w-5 h-5 text-teal-600" />
                                <h4 className="font-black text-sm text-slate-900">
                                  Pratinjau Data Sheet: <span className="text-teal-700 font-mono">{activeSheetPreview}</span>
                                </h4>
                                <span className="text-xs text-slate-500 font-medium">({activeSummary?.rowCount || 0} baris)</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setActiveSheetPreview(null)}
                                className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                                <span>Tutup</span>
                              </button>
                            </div>

                            {previewRows.length > 0 ? (
                              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                                    <tr>
                                      <th className="p-2.5 w-12 text-center">#</th>
                                      {columns.map((c, cIdx) => (
                                        <th key={cIdx} className="p-2.5 whitespace-nowrap">{c}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {previewRows.map((row, rIdx) => (
                                      <tr key={rIdx} className="hover:bg-slate-50/80">
                                        <td className="p-2.5 text-center font-mono font-bold text-slate-400">{rIdx + 1}</td>
                                        {columns.map((c, cIdx) => (
                                          <td key={cIdx} className="p-2.5 font-medium text-slate-800 whitespace-nowrap max-w-xs truncate" title={String(row[c] || '')}>
                                            {String(row[c] || '')}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <div className="p-4 text-center text-xs text-slate-500 font-medium">
                                Seluruh baris data pada sheet ini telah berhasil diindeks ke dalam indikator dan rekomendasi resmi sistem.
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-500 space-y-2">
                <FileSpreadsheet className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold">Belum ada file Rapor Pendidikan yang diunggah. Unggah file Excel resmi Kemendikdasmen di atas.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: UNGGAH EXCEL MULTI-FILE GOOGLE FORM / SPREADSHEET DENGAN SISTEM ANTI-DATA GANDA */}
      {activeTab === 'upload_googleform' && (
        <div className="space-y-6">
          <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-6">
            {/* Header: Judul & Sakelar Domain */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
                    IMPOR EXCEL GOOGLE FORM DENGAN SISTEM ANTI-DATA GANDA
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Master Data Terhubung ({(state?.students || []).length} Siswa)</span>
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  <span>Unggah Hasil Tes Literasi &amp; Numerasi Siswa via Excel</span>
                </h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-4xl">
                  Sistem secara otomatis mendeteksi nama anak dengan ejaan yang sama (baik menggunakan <strong>huruf besar/kapital</strong>, <strong>huruf kecil</strong>, maupun kombinasi spasi), mencocokkannya ke <strong>Master Data Siswa resmi SMAN 3 Tumijajar</strong>, dan <strong>mengeliminasi pengumpulan ganda</strong> sehingga data tersimpan rapi, akurat, dan profesional.
                </p>
              </div>

              {/* Dual Upload Mode Selector (Literasi vs Numerasi) */}
              <div className="p-1 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-1 text-xs font-bold shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setGoogleFormType('literasi')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    googleFormType === 'literasi' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Upload Literasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGoogleFormType('numerasi')}
                  className={`px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    googleFormType === 'numerasi' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calculator className="w-4 h-4" />
                  <span>Upload Numerasi</span>
                </button>
              </div>
            </div>

            {/* Banner Fitur Cerdas Normalisasi Ejaan & Anti-Data Ganda */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 bg-gradient-to-br from-indigo-50/80 to-slate-50 rounded-2xl border border-indigo-200/90 flex items-start gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-2xs shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-extrabold text-xs text-indigo-950">Normalisasi Ejaan Huruf Kapital &amp; Kecil</h5>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
                    Nama seperti <code className="text-indigo-800 font-mono font-bold">"ADEL JOVI"</code>, <code className="text-indigo-800 font-mono font-bold">"adel jovi"</code>, atau <code className="text-indigo-800 font-mono font-bold">"Adel  Jovi"</code> otomatis diselaraskan ke nama resmi master data.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-gradient-to-br from-emerald-50/80 to-slate-50 rounded-2xl border border-emerald-200/90 flex items-start gap-3">
                <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs shrink-0 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-extrabold text-xs text-emerald-950">Anti-Data Ganda (Deduplication Otomatis)</h5>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
                    Jika anak mengirim form berkali-kali, sistem otomatis mendeteksi dan mengambil skor terbaik tanpa mengotori database dengan data kembar.
                  </p>
                </div>
              </div>

              <div className="p-3.5 bg-gradient-to-br from-amber-50/80 to-slate-50 rounded-2xl border border-amber-200/90 flex items-start gap-3">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-2xs shrink-0 mt-0.5">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h5 className="font-extrabold text-xs text-amber-950">Standar Capaian Rapor Pendidikan RI</h5>
                  <p className="text-[11px] text-slate-600 font-medium mt-0.5 leading-relaxed">
                    Otomatis mengelompokkan siswa ke 4 jenjang kompetensi Kemendikbudristek: <strong>Mahir</strong>, <strong>Cakap</strong>, <strong>Dasar</strong>, dan <strong>Perlu Intervensi</strong>.
                  </p>
                </div>
              </div>
            </div>

            {/* Dropzone Multi File & Tanggal Pelaksanaan */}
            <div className="space-y-4">
              <div
                onClick={() => googleFormFileRef.current?.click()}
                className="p-8 border-2 border-dashed border-indigo-300 hover:border-indigo-500 rounded-3xl bg-indigo-50/30 hover:bg-indigo-50/70 transition-all text-center cursor-pointer space-y-3 group"
              >
                <input
                  type="file"
                  ref={googleFormFileRef}
                  onChange={handleGoogleFormFilesSelected}
                  accept=".xlsx,.xls,.csv"
                  multiple
                  className="hidden"
                />
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 border border-indigo-200 text-indigo-700 flex items-center justify-center mx-auto shadow-xs group-hover:scale-105 transition-transform">
                  <UploadCloud className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    Klik atau Seret File Excel Hasil Tes {googleFormType.toUpperCase()} di Sini
                  </h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Mendukung multi-file sekaligus (.xlsx, .xls, .csv). Sistem akan membaca nama siswa, skor, dan rombel secara otomatis.
                  </p>
                </div>
              </div>

              {/* Baris Pengaturan Tanggal & Strategi Deduplikasi */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 shrink-0">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span>Tanggal Pelaksanaan Tes:</span>
                  </span>
                  <input
                    type="date"
                    value={customTestDate}
                    onChange={(e) => setCustomTestDate(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Strategi Penanganan Data Ganda */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1 shrink-0">
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Strategi Jika Ada Data Ganda:</span>
                  </span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => handleStrategyChange('highest_score')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        dedupStrategy === 'highest_score'
                          ? 'bg-indigo-600 text-white shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Ambil nilai tertinggi yang diraih siswa dari beberapa kali pengisian form"
                    >
                      Skor Tertinggi (Rekomendasi)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStrategyChange('latest_entry')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        dedupStrategy === 'latest_entry'
                          ? 'bg-indigo-600 text-white shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Gunakan pengumpulan terakhir yang tertera di baris Excel"
                    >
                      Entri Terakhir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStrategyChange('average')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                        dedupStrategy === 'average'
                          ? 'bg-indigo-600 text-white shadow-2xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                      title="Hitung rata-rata nilai siswa"
                    >
                      Rata-Rata
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* PREVIEW HASIL PEMBACAAN DAN PEMBERSIHAN DATA */}
            {parsedFormResults.length > 0 && (() => {
              const activeResult = parsedFormResults[selectedFileIndex] || parsedFormResults[0];
              const totalCleanAllFiles = parsedFormResults.reduce((acc, r) => acc + r.uniqueStudentsCount, 0);
              const totalDuplicatesAllFiles = parsedFormResults.reduce((acc, r) => acc + r.duplicateRowsCount, 0);
              const totalMatchedMaster = parsedFormResults.reduce((acc, r) => acc + r.matchedCount, 0);

              // Filter rows in active file based on filter state
              let displayedRows = previewFilter === 'clean'
                ? activeResult.deduplicatedRows
                : previewFilter === 'duplicates'
                ? activeResult.rows.filter((r) => r.isDuplicate)
                : previewFilter === 'unmatched'
                ? activeResult.rows.filter((r) => !r.matchedStudentId)
                : activeResult.rows;

              if (previewSearchText.trim()) {
                const q = previewSearchText.toLowerCase();
                displayedRows = displayedRows.filter(
                  (r) =>
                    r.studentName.toLowerCase().includes(q) ||
                    (r.matchedStudentName && r.matchedStudentName.toLowerCase().includes(q)) ||
                    r.kelas.toLowerCase().includes(q)
                );
              }

              return (
                <div className="space-y-5 pt-2">
                  {/* File Selector Tabs if multi-file */}
                  {parsedFormResults.length > 1 && (
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-100 rounded-2xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-600 px-2">Pilih File:</span>
                      {parsedFormResults.map((f, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedFileIndex(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                            selectedFileIndex === idx
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
                          }`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>{f.fileName}</span>
                          <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-mono">
                            {f.uniqueStudentsCount} siswa
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1">
                      <span className="text-[10.5px] font-bold text-slate-500 block uppercase">Total Baris File</span>
                      <div className="text-xl font-black text-slate-900 font-mono">{activeResult.totalRows}</div>
                      <span className="text-[10px] text-slate-500 font-medium block">Baris mentah Excel</span>
                    </div>

                    <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-1">
                      <span className="text-[10.5px] font-bold text-emerald-800 block uppercase">Siswa Bersih Siap Simpan</span>
                      <div className="text-xl font-black text-emerald-950 font-mono flex items-center gap-1">
                        <span>{activeResult.uniqueStudentsCount}</span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      </div>
                      <span className="text-[10px] text-emerald-800 font-bold block">100% Bebas Ganda</span>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl space-y-1">
                      <span className="text-[10.5px] font-bold text-amber-900 block uppercase">Data Ganda Dieliminasi</span>
                      <div className="text-xl font-black text-amber-950 font-mono">{activeResult.duplicateRowsCount}</div>
                      <span className="text-[10px] text-amber-800 font-bold block">
                        {activeResult.duplicateGroups.length} siswa submit &gt;1x
                      </span>
                    </div>

                    <div className="p-3 bg-indigo-50 border border-indigo-300 rounded-2xl space-y-1">
                      <span className="text-[10.5px] font-bold text-indigo-800 block uppercase">Cocok Master Siswa</span>
                      <div className="text-xl font-black text-indigo-950 font-mono">{activeResult.matchedCount}</div>
                      <span className="text-[10px] text-indigo-700 font-bold block">
                        {Math.round((activeResult.matchedCount / (activeResult.totalRows || 1)) * 100)}% Terverifikasi
                      </span>
                    </div>

                    <div className="p-3 bg-sky-50 border border-sky-300 rounded-2xl space-y-1">
                      <span className="text-[10.5px] font-bold text-sky-800 block uppercase">Rata-rata Skor</span>
                      <div className="text-xl font-black text-sky-950 font-mono">{activeResult.averageScore}</div>
                      <span className="text-[10px] text-sky-700 font-bold block">
                        Tertinggi: {activeResult.highestScore} • Min: {activeResult.lowestScore}
                      </span>
                    </div>

                    <div className="p-3 bg-purple-50 border border-purple-300 rounded-2xl space-y-1">
                      <span className="text-[10.5px] font-bold text-purple-900 block uppercase">Status Ejaan Kapital</span>
                      <div className="text-xs font-black text-purple-950 flex items-center gap-1 mt-1">
                        <Check className="w-3.5 h-3.5 text-purple-600" />
                        <span>Tersinkronisasi</span>
                      </div>
                      <span className="text-[10px] text-purple-800 font-medium block">Otomatis nama resmi</span>
                    </div>
                  </div>

                  {/* Visual Competency Distribution Bar (6-Tier Diagnostic Spectrum) */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-indigo-600" />
                        <span>Spektrum Diagnostik Taraf Kompetensi Kemendikbudristek RI ({activeResult.uniqueStudentsCount} Siswa):</span>
                      </span>
                      <span className="text-slate-500 font-mono text-[11px]">Rentang Skor 0 s.d 100</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                      {/* Skor 0 (Tidak Mengerjakan / Abstain) */}
                      <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-amber-300 block">0. Skor 0 (Abstain)</span>
                          <span className="text-sm font-black font-mono text-white mt-0.5 block">{activeResult.distribution.zeroScore} Siswa</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-300 mt-1 block">
                          {activeResult.uniqueStudentsCount ? Math.round((activeResult.distribution.zeroScore / activeResult.uniqueStudentsCount) * 100) : 0}% (Kosong)
                        </span>
                      </div>

                      {/* Tier 1: Perlu Intervensi Khusus (1-39) */}
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-950 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-rose-800 block">1. Intervensi (1-39)</span>
                          <span className="text-sm font-black font-mono text-rose-950 mt-0.5 block">{activeResult.distribution.perluIntervensi} Siswa</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-rose-700 mt-1 block">
                          {activeResult.uniqueStudentsCount ? Math.round((activeResult.distribution.perluIntervensi / activeResult.uniqueStudentsCount) * 100) : 0}% (Sangat Rendah)
                        </span>
                      </div>

                      {/* Tier 2: Intervensi Awal (40-53) */}
                      <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-950 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-orange-800 block">2. Intv. Awal (40-53)</span>
                          <span className="text-sm font-black font-mono text-orange-950 mt-0.5 block">{activeResult.distribution.intervensiAwal} Siswa</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-orange-700 mt-1 block">
                          {activeResult.uniqueStudentsCount ? Math.round((activeResult.distribution.intervensiAwal / activeResult.uniqueStudentsCount) * 100) : 0}% (Perintisan)
                        </span>
                      </div>

                      {/* Tier 3: Dasar (54-70) */}
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-amber-800 block">3. Dasar (54-70)</span>
                          <span className="text-sm font-black font-mono text-amber-950 mt-0.5 block">{activeResult.distribution.dasar} Siswa</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-amber-700 mt-1 block">
                          {activeResult.uniqueStudentsCount ? Math.round((activeResult.distribution.dasar / activeResult.uniqueStudentsCount) * 100) : 0}% (Standar Min)
                        </span>
                      </div>

                      {/* Tier 4: Cakap (71-85) */}
                      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-emerald-800 block">4. Cakap (71-85)</span>
                          <span className="text-sm font-black font-mono text-emerald-950 mt-0.5 block">{activeResult.distribution.cakap} Siswa</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-emerald-700 mt-1 block">
                          {activeResult.uniqueStudentsCount ? Math.round((activeResult.distribution.cakap / activeResult.uniqueStudentsCount) * 100) : 0}% (Standar ANBK)
                        </span>
                      </div>

                      {/* Tier 5: Mahir (86-100) */}
                      <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-blue-800 block">5. Mahir (86-100)</span>
                          <span className="text-sm font-black font-mono text-blue-950 mt-0.5 block">{activeResult.distribution.mahir} Siswa</span>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-blue-700 mt-1 block">
                          {activeResult.uniqueStudentsCount ? Math.round((activeResult.distribution.mahir / activeResult.uniqueStudentsCount) * 100) : 0}% (Unggul/HOTS)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Filter & Action Toolbar */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewFilter('clean')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                          previewFilter === 'clean'
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Data Bersih Siap Simpan ({activeResult.deduplicatedRows.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewFilter('duplicates')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                          previewFilter === 'duplicates'
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Kasus Duplikat ({activeResult.duplicateGroups.length} Siswa)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewFilter('all')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                          previewFilter === 'all'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <Layers className="w-3.5 h-3.5" />
                        <span>Semua Baris Mentah ({activeResult.rows.length})</span>
                      </button>

                      {activeResult.unmatchedCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setPreviewFilter('unmatched')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                            previewFilter === 'unmatched'
                              ? 'bg-rose-600 text-white shadow-xs'
                              : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                          }`}
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Perlu Pasangkan ({activeResult.unmatchedCount})</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="relative min-w-[200px]">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Cari nama atau kelas..."
                          value={previewSearchText}
                          onChange={(e) => setPreviewSearchText(e.target.value)}
                          className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>

                      {/* Main Save Button */}
                      <button
                        type="button"
                        onClick={handleSaveAccumulatedFormRecords}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all shrink-0 active:scale-95"
                      >
                        <Save className="w-4 h-4" />
                        <span>Simpan Data ({totalCleanAllFiles} Siswa Bersih)</span>
                      </button>
                    </div>
                  </div>

                  {/* Table of Parsed and Deduplicated Students */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="p-3 w-12 text-center">#</th>
                          <th className="p-3">Nama Siswa di Excel</th>
                          <th className="p-3">Nama Resmi di Master Data</th>
                          <th className="p-3 w-20">Kelas</th>
                          <th className="p-3 w-28 text-center">Skor Hasil</th>
                          <th className="p-3 w-40">Capaian Kemendikbud</th>
                          <th className="p-3">Status Anti-Data Ganda</th>
                          <th className="p-3 w-28 text-center">Tindakan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {displayedRows.length > 0 ? (
                          displayedRows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3 text-center font-mono text-slate-400 font-bold">
                                {row.rowNumber}
                              </td>

                              {/* Nama Siswa di Excel (Asli) */}
                              <td className="p-3">
                                <span className="font-extrabold text-slate-900 block font-mono text-[11.5px]">
                                  {row.studentName}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  Teks asli dari spreadsheet
                                </span>
                              </td>

                              {/* Nama Resmi di Master Data */}
                              <td className="p-3">
                                {row.matchedStudentName ? (
                                  <div className="space-y-0.5">
                                    <span className="font-extrabold text-indigo-950 block">
                                      {row.matchedStudentName}
                                    </span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9.5px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                                        <Check className="w-2.5 h-2.5 text-emerald-600" />
                                        <span>Master Terhubung</span>
                                      </span>
                                      {row.matchMethod === 'case_insensitive' && (
                                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                          Diselaraskan Kapital/Kecil
                                        </span>
                                      )}
                                      {row.matchMethod === 'normalized' && (
                                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                                          Spasi/Tanda Baca Normal
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-amber-800 font-bold text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                                    Belum Terhubung ke Master Siswa
                                  </span>
                                )}
                              </td>

                              {/* Kelas */}
                              <td className="p-3 font-bold text-slate-700 font-mono">
                                {row.matchedClass || row.kelas}
                              </td>

                              {/* Skor Hasil */}
                              <td className="p-3 text-center">
                                <span className="text-sm font-black font-mono text-slate-900 block">
                                  {row.score}
                                </span>
                                <div className="w-16 h-1.5 bg-slate-200 rounded-full mx-auto mt-1 overflow-hidden">
                                  <div
                                    className={`h-full ${row.capaian.barColor}`}
                                    style={{ width: `${Math.min(100, Math.max(5, row.score))}%` }}
                                  />
                                </div>
                              </td>

                              {/* Capaian & Indikasi Diagnostik Kemendikbud */}
                              <td className="p-3 max-w-xs">
                                <div className="space-y-1">
                                  <span className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-black inline-block border shadow-2xs ${row.capaian.badgeBg} ${row.capaian.badgeText} ${row.capaian.borderColor}`}>
                                    {row.capaian.label}
                                  </span>
                                  <p className="text-[10px] font-semibold text-slate-700 leading-tight">
                                    {row.capaian.indication}
                                  </p>
                                  <p className="text-[9.5px] font-medium text-indigo-700 leading-tight bg-indigo-50/80 p-1.5 rounded-md border border-indigo-100">
                                    <strong>Rekomendasi:</strong> {row.capaian.rekomendasiTindakan}
                                  </p>
                                </div>
                              </td>

                              {/* Status Anti-Data Ganda */}
                              <td className="p-3">
                                {row.isDuplicate ? (
                                  <div className="space-y-0.5">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                      <Shield className="w-3 h-3 text-amber-600" />
                                      <span>Pengumpulan Ganda ({row.duplicateCount}x)</span>
                                    </span>
                                    <p className="text-[10px] font-semibold text-slate-600 leading-tight">
                                      {row.duplicateNote}
                                    </p>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-flex items-center gap-1">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Tunggal &amp; Unik (1x pengumpulan)</span>
                                  </span>
                                )}
                              </td>

                              {/* Tindakan Pasangkan Manual */}
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualMapModalRow({
                                      fileIdx: selectedFileIndex,
                                      rowNumber: row.rowNumber,
                                      studentName: row.studentName,
                                    });
                                    setManualMapStudentSearch(row.studentName);
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-[10.5px] font-bold border border-slate-200 hover:border-indigo-300 transition-colors cursor-pointer"
                                  title="Pasangkan siswa ini secara manual ke Master Data Sekolah"
                                >
                                  {row.matchedStudentId ? 'Ubah Siswa' : 'Pasangkan'}
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                              Tidak ada data yang sesuai dengan filter pencarian.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Rincian Data Ganda Terdeteksi */}
                  {activeResult.duplicateGroups.length > 0 && (
                    <div className="p-4 bg-amber-50/70 border border-amber-300 rounded-2xl space-y-2">
                      <div className="flex items-center gap-2 text-xs font-black text-amber-950">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        <span>Rincian Pengumpulan Ganda yang Berhasil Dieliminasi ({activeResult.duplicateGroups.length} Siswa):</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {activeResult.duplicateGroups.map((grp, gIdx) => (
                          <div key={gIdx} className="p-2.5 bg-white rounded-xl border border-amber-200 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900 truncate" title={grp.canonicalName}>
                                {grp.canonicalName}
                              </span>
                              <span className="text-[10px] font-mono font-bold text-slate-500">{grp.kelas}</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px] text-slate-600">
                              <span>Total Submit: <strong>{grp.totalSubmissions}x</strong></span>
                              <span>Skor: {grp.scores.join(', ')}</span>
                            </div>
                            <div className="text-[10px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              Skor Terpilih Masuk Database: <strong>{grp.chosenScore}</strong> (Nilai Tertinggi)
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Modal Dialog Pasangkan Siswa Manual ke Master Data */}
            {manualMapModalRow && (
              <div
                onClick={() => setManualMapModalRow(null)}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-2xs cursor-pointer"
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200 cursor-default"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-black text-sm text-slate-900">
                        Pasangkan Siswa ke Master Data Resmi
                      </h4>
                      <p className="text-xs text-slate-500">
                        Nama di Excel: <strong className="text-indigo-700 font-mono">{manualMapModalRow.studentName}</strong>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManualMapModalRow(null)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Ketik nama siswa atau kelas untuk mencari..."
                      value={manualMapStudentSearch}
                      onChange={(e) => setManualMapStudentSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                    {(state?.students || [])
                      .filter((st) => {
                        if (!manualMapStudentSearch.trim()) return true;
                        const q = manualMapStudentSearch.toLowerCase();
                        return (
                          st.nama.toLowerCase().includes(q) ||
                          st.kelas.toLowerCase().includes(q) ||
                          (st.nisn && st.nisn.includes(q))
                        );
                      })
                      .slice(0, 30)
                      .map((st) => (
                        <div
                          key={st.id}
                          onClick={() => handleManualMapStudent(manualMapModalRow.fileIdx, manualMapModalRow.rowNumber, st.id)}
                          className="p-2.5 hover:bg-indigo-50 flex items-center justify-between cursor-pointer transition-colors"
                        >
                          <div>
                            <span className="font-extrabold text-xs text-slate-900 block">{st.nama}</span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              NISN: {st.nisn || '-'} • Rombel: {st.kelas}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                            Pilih Siswa
                          </span>
                        </div>
                      ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setManualMapModalRow(null)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: REKAPITULASI DATA SAKTI (HASIL TERAKUMULASI & BEBAS GANDA) */}
      {activeTab === 'rekap' && (
        <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900">Rekapitulasi Data Hasil Tes Siswa</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {filteredRecords.length} Data Terdaftar
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Pangkalan rekam data terintegrasi dari CBT Live, Google Form Excel (Anti-Ganda), dan data historis SMAN 3 Tumijajar.
              </p>
            </div>

            {/* Toolbar Filters & Export Button */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Search Box */}
              <div className="relative min-w-[180px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari siswa..."
                  value={rekapSearchText}
                  onChange={(e) => setRekapSearchText(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Class Filter */}
              <select
                value={rekapFilterClass}
                onChange={(e) => setRekapFilterClass(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="SEMUA">Semua Kelas</option>
                {(state?.classes || []).map((c) => (
                  <option key={c.id} value={c.nama}>{c.nama}</option>
                ))}
              </select>

              {/* Domain Filter */}
              <select
                value={rekapFilterType}
                onChange={(e) => setRekapFilterType(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 shadow-2xs outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="SEMUA">Semua Jenis (Lit/Num)</option>
                <option value="literasi">Literasi</option>
                <option value="numerasi">Numerasi</option>
              </select>

              {/* Export Excel Button */}
              <button
                type="button"
                onClick={() => {
                  if (filteredRecords.length === 0) {
                    showToast('Data Kosong', 'Tidak ada data rekap untuk diunduh.', 'warning');
                    return;
                  }
                  const exportData = filteredRecords.map((r, idx) => {
                    const c = getLitNumCapaian(r.score);
                    return {
                      'No': idx + 1,
                      'Nama Siswa': r.studentName,
                      'Kelas': r.kelas,
                      'Domain': r.type.toUpperCase(),
                      'Skor Hasil': r.score,
                      'Capaian Kemendikbud': c.label,
                      'Sumber Data': r.source === 'google_form_excel' ? `Google Form Excel (${r.fileName || ''})` : 'CBT System Live',
                      'Tanggal Pelaksanaan': r.date,
                      'Catatan Anti-Ganda': r.notes || '-'
                    };
                  });
                  const ws = XLSX.utils.json_to_sheet(exportData);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, 'Rekap LitNum Clean');
                  XLSX.writeFile(wb, `Rekap_Literasi_Numerasi_SMANTRI_${new Date().toISOString().split('T')[0]}.xlsx`);
                  showToast('Ekspor Berhasil', 'File Rekap Nilai Literasi & Numerasi berhasil diunduh.', 'success');
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Excel</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-extrabold uppercase border-b border-slate-200 text-[10.5px]">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3">Nama Siswa Resmi</th>
                  <th className="p-3 w-20">Kelas</th>
                  <th className="p-3 w-24">Jenis Tes</th>
                  <th className="p-3 w-24 text-center">Skor</th>
                  <th className="p-3 w-36">Capaian Kemendikbud</th>
                  <th className="p-3">Sumber Data &amp; Catatan</th>
                  <th className="p-3 w-28">Tanggal</th>
                  <th className="p-3 w-16 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredRecords.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      Belum ada rekam data hasil tes literasi / numerasi yang sesuai kriteria.
                    </td>
                  </tr>
                ) : (
                  filteredRecords.map((r, idx) => {
                    const diagnosis = getScoreDiagnosis(r.score, r.type);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                        <td className="p-3">
                          <span className="font-extrabold text-slate-900 block">{r.studentName}</span>
                          <span className="text-[10px] text-slate-500 font-mono">ID: {r.studentId}</span>
                        </td>
                        <td className="p-3 font-bold text-slate-700 font-mono">{r.kelas}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase ${
                            r.type === 'literasi' ? 'bg-indigo-100 text-indigo-900' : 'bg-sky-100 text-sky-900'
                          }`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`font-black text-sm font-mono block ${r.score === 0 ? 'text-rose-600' : 'text-indigo-700'}`}>
                            {r.score}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-black border ${diagnosis.badgeBg} ${diagnosis.badgeTextCol}`}>
                            {diagnosis.badgeText}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-slate-800 block text-[11px]">
                            {r.source === 'google_form_excel' ? `Excel (${r.fileName || 'Form'})` : 'CBT System Live'}
                          </span>
                          {r.notes && (
                            <span className="text-[10px] text-slate-500 block leading-tight font-medium">
                              {r.notes}
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600 font-mono text-[11px]">{r.date}</td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => deleteLitNumRecord(r.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus rekam data"
                          >
                            <Trash2 className="w-4 h-4" />
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
      )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
