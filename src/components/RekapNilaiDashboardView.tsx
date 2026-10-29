import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Calculator,
  FileSpreadsheet,
  BarChart3,
  Sparkles,
  Printer,
  CheckCircle2,
  AlertCircle,
  Users,
  GraduationCap,
  Layers,
  ChevronRight,
  Search,
  Filter,
  ArrowRight,
  TrendingUp,
  Award,
  Lock,
  LockOpen,
  Info,
  ShieldCheck,
  CheckCheck,
  BookOpen,
} from 'lucide-react';
import { motion } from 'motion/react';
import { SubjectGradeRecapSheet, StudentGradeRecord } from '../types';
import { TablePagination } from './TablePagination';

// Helper function to calculate Nilai Akhir Rapor (NAR) from StudentGradeRecord
const getRecordNAR = (
  record: StudentGradeRecord,
  weightTP: number = 50,
  weightSemester: number = 50
): number | null => {
  const tpScores = record.tpScores || {};
  const tpValues = Object.values(tpScores).filter((v): v is number => typeof v === 'number' && !isNaN(v));
  const nrsTP = tpValues.length > 0 ? tpValues.reduce((a, b) => a + b, 0) / tpValues.length : null;

  let semValues: number[] = [];
  if (typeof record.ptsScore === 'number' && !isNaN(record.ptsScore)) semValues.push(record.ptsScore);
  if (typeof record.pasScore === 'number' && !isNaN(record.pasScore)) semValues.push(record.pasScore);
  const nrsSemester = semValues.length > 0 ? semValues.reduce((a, b) => a + b, 0) / semValues.length : null;

  if (nrsTP === null && nrsSemester === null) return null;
  if (nrsTP !== null && nrsSemester === null) return Math.round(nrsTP);
  if (nrsTP === null && nrsSemester !== null) return Math.round(nrsSemester);

  const na = (nrsTP! * (weightTP / 100)) + (nrsSemester! * (weightSemester / 100));
  return Math.round(na);
};

// Helper for e-Rapor validation
const isRecordERaporValid = (record: StudentGradeRecord, nar: number | null): boolean => {
  const achs = record.tpAchievements || {};
  let opt = 0;
  let per = 0;
  Object.values(achs).forEach((v) => {
    if (v === 'T') opt++;
    if (v === 'R') per++;
  });

  const targetNa = typeof nar === 'number' ? nar : 0;
  if (targetNa >= 100) {
    return opt >= 1 && per === 0;
  } else if (targetNa > 0) {
    return opt >= 1 && per >= 1;
  }
  return false;
};

export const RekapNilaiDashboardView: React.FC = () => {
  const { state, currentUser, setCurrentView } = useApp();
  const school = state?.schoolInfo || {};
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'operator' || currentUser?.roles?.includes('admin');

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('ALL');

  // Available classes & subjects
  const availableClasses = useMemo(() => {
    const list = state.classes.map((c) => c.nama).sort();
    return list.length > 0 ? list : ['X.1', 'X.2', 'XI.1', 'XI.2', 'XII.1', 'XII.2'];
  }, [state.classes]);

  const availableSubjects = useMemo(() => {
    if (isAdmin) {
      return state.subjects.map((s) => s.nama).sort();
    }
    const teacherSubjs = currentUser?.mataPelajaran || [];
    if (teacherSubjs.length > 0) {
      return teacherSubjs.filter((s) => s !== 'Semua Mata Pelajaran').sort();
    }
    return state.subjects.map((s) => s.nama).sort();
  }, [state.subjects, currentUser, isAdmin]);

  // Grade recap sheets list
  const recapSheets: SubjectGradeRecapSheet[] = useMemo(() => {
    const all = state.gradeRecapSheets || [];
    if (isAdmin) return all;
    // Filter to teacher's subjects if not admin
    const teacherSubjs = currentUser?.mataPelajaran || [];
    if (teacherSubjs.length === 0) return all;
    return all.filter((s) =>
      teacherSubjs.some((ts) => ts.toLowerCase() === s.mataPelajaran.toLowerCase())
    );
  }, [state.gradeRecapSheets, isAdmin, currentUser]);

  // Aggregate Metrics Across Sheets
  const metrics = useMemo(() => {
    let totalStudentsCount = 0;
    let totalValidERaporCount = 0;
    let totalInvalidERaporCount = 0;
    let totalScoresSum = 0;
    let totalScoresCount = 0;
    let totalOptimalTPCount = 0;
    let totalPerluTPCount = 0;
    let highestScore = 0;
    let lowestScore = 100;

    recapSheets.forEach((sheet) => {
      sheet.studentRecords.forEach((record) => {
        totalStudentsCount += 1;

        const na = getRecordNAR(record, sheet.weightTPPercent, sheet.weightSemesterPercent);

        if (typeof na === 'number' && !isNaN(na)) {
          totalScoresSum += na;
          totalScoresCount += 1;
          if (na > highestScore) highestScore = na;
          if (na < lowestScore) lowestScore = na;
        }

        // Count TP achievements
        const achs = record.tpAchievements || {};
        Object.values(achs).forEach((v) => {
          if (v === 'T') totalOptimalTPCount += 1;
          else if (v === 'R') totalPerluTPCount += 1;
        });

        // e-Rapor validation
        const isValid = isRecordERaporValid(record, na);

        if (isValid) {
          totalValidERaporCount += 1;
        } else {
          totalInvalidERaporCount += 1;
        }
      });
    });

    const averageScore = totalScoresCount > 0 ? Math.round((totalScoresSum / totalScoresCount) * 10) / 10 : 0;
    const validPercent = totalStudentsCount > 0 ? Math.round((totalValidERaporCount / totalStudentsCount) * 100) : 0;

    return {
      totalSheets: recapSheets.length,
      totalStudentsCount,
      totalValidERaporCount,
      totalInvalidERaporCount,
      validPercent,
      averageScore,
      highestScore: totalScoresCount > 0 ? highestScore : 0,
      lowestScore: totalScoresCount > 0 ? lowestScore : 0,
      totalOptimalTPCount,
      totalPerluTPCount,
    };
  }, [recapSheets]);

  // Filtered sheets
  const filteredSheets = useMemo(() => {
    return recapSheets.filter((sheet) => {
      const matchSearch =
        searchQuery.trim() === '' ||
        sheet.mataPelajaran.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sheet.kelas.toLowerCase().includes(searchQuery.toLowerCase());

      const matchClass = selectedClassFilter === 'ALL' || sheet.kelas === selectedClassFilter;
      const matchSubject = selectedSubjectFilter === 'ALL' || sheet.mataPelajaran === selectedSubjectFilter;

      return matchSearch && matchClass && matchSubject;
    });
  }, [recapSheets, searchQuery, selectedClassFilter, selectedSubjectFilter]);

  // Pagination states for Lembar Rekap Nilai (10, 25, 50, 100, Semua Data)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const isAll = pageSize === -1 || pageSize >= filteredSheets.length;
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(filteredSheets.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedSheets = useMemo(() => {
    if (isAll) return filteredSheets;
    const start = (safeCurrentPage - 1) * pageSize;
    return filteredSheets.slice(start, start + pageSize);
  }, [filteredSheets, safeCurrentPage, pageSize, isAll]);

  // Grade distributions (A, B, C, D)
  const gradeDistribution = useMemo(() => {
    let a = 0;
    let b = 0;
    let c = 0;
    let d = 0;

    recapSheets.forEach((sheet) => {
      sheet.studentRecords.forEach((r) => {
        const val = getRecordNAR(r, sheet.weightTPPercent, sheet.weightSemesterPercent);
        if (typeof val === 'number') {
          if (val >= 90) a++;
          else if (val >= 80) b++;
          else if (val >= 70) c++;
          else d++;
        }
      });
    });

    const total = a + b + c + d;
    return {
      a,
      b,
      c,
      d,
      total,
      aPct: total > 0 ? Math.round((a / total) * 100) : 0,
      bPct: total > 0 ? Math.round((b / total) * 100) : 0,
      cPct: total > 0 ? Math.round((c / total) * 100) : 0,
      dPct: total > 0 ? Math.round((d / total) * 100) : 0,
    };
  }, [recapSheets]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner Eksekutif Modul Rekap Nilai */}
      <div className="p-6 sm:p-8 bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 rounded-3xl text-white shadow-xl relative overflow-hidden">
        {/* Decorative background glows */}
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-400 text-slate-950 uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-slate-950" />
                  <span>Modul Rekapitulasi Nilai &amp; Leger Siswa</span>
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-emerald-200 border border-white/15">
                  Tahun Ajaran {school.tahunAjaranAktif || '2025/2026'} ({school.semesterAktif || 'Ganjil'})
                </span>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Kurikulum Merdeka (IKM)
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Pusat Pengolahan Rekapitulasi Nilai &amp; Leger IKM
              </h1>
              <p className="text-sm text-slate-300 max-w-3xl leading-relaxed mt-1">
                Kelola rekap nilai sumatif Tujuan Pembelajaran (TP 1-6), kalkulasi Nilai Akhir Rapor, validasi Ceklis TP format resmi e-Rapor SMA, dan pencetakan buku Leger Kelas SMAN 3 Tumijajar.
              </p>
            </div>

            {/* Quick Actions Header */}
            <div className="flex items-center gap-2.5 flex-wrap shrink-0">
              <button
                type="button"
                onClick={() => setCurrentView('rekap-nilai-leger')}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 font-black text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Calculator className="w-4 h-4 text-slate-950" />
                <span>Buka Lembar Rekap Nilai</span>
              </button>

              <button
                type="button"
                onClick={() => setCurrentView('rekap-nilai-erapor')}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs border border-white/20 flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
                <span>Format e-Rapor SMA</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigasi Tab Akses Cepat Modul Rekap Nilai */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs">
        <span className="text-xs font-black text-slate-700 px-2 flex items-center gap-1.5 shrink-0">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Akses Cepat Pengolahan:</span>
        </span>

        <button
          type="button"
          onClick={() => setCurrentView('rekap-nilai-leger')}
          className="px-3.5 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-950 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-indigo-200"
        >
          <Calculator className="w-3.5 h-3.5" />
          <span>1. Input Nilai Sumatif (TP 1-6)</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('rekap-nilai-cp')}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>2. Capaian Kompetensi (CP)</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('rekap-nilai-olahranking')}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
          <span>3. Nilai Akhir Rapor &amp; Leger</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('rekap-nilai-cetak')}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
        >
          <Printer className="w-3.5 h-3.5 text-emerald-600" />
          <span>4. Cetak Leger Seluruh Mapel</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentView('rekap-nilai-erapor')}
          className="px-3.5 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-600 hover:text-white text-cyan-950 border border-cyan-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer ml-auto"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-600" />
          <span>5. Format e-Rapor SMA</span>
          <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-400 text-slate-950 font-black uppercase">Resmi</span>
        </button>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Lembar Rekap */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Lembar Rekap Nilai</span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.totalSheets}</div>
            <div className="text-[11.5px] text-slate-500 font-medium mt-0.5">
              Kelas &amp; Mata Pelajaran Aktif
            </div>
          </div>
        </div>

        {/* Card 2: Total Siswa Terekap */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Peserta Didik Terekap</span>
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.totalStudentsCount}</div>
            <div className="text-[11.5px] text-slate-500 font-medium mt-0.5">
              Siswa Terdata dalam Leger
            </div>
          </div>
        </div>

        {/* Card 3: Status Validasi e-Rapor SMA */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Validasi e-Rapor SMA</span>
            <div className="p-2.5 rounded-2xl bg-cyan-50 text-cyan-700 border border-cyan-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.validPercent}%</span>
              <span className="text-xs font-bold text-emerald-700">({metrics.totalValidERaporCount} Siswa)</span>
            </div>
            <div className="text-[11.5px] text-slate-500 font-medium mt-0.5">
              {metrics.totalInvalidERaporCount > 0 ? (
                <span className="text-rose-600 font-semibold">{metrics.totalInvalidERaporCount} siswa perlu penyesuaian</span>
              ) : (
                <span className="text-emerald-700 font-semibold">100% Siap Ekspor e-Rapor</span>
              )}
            </div>
          </div>
        </div>

        {/* Card 4: Rata-rata Nilai Siswa */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">Rata-rata Nilai</span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-700 border border-amber-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.averageScore || '-'}</div>
            <div className="text-[11.5px] text-slate-500 font-medium mt-0.5">
              Tertinggi: <strong className="text-slate-800">{metrics.highestScore}</strong> • Terendah: <strong className="text-slate-800">{metrics.lowestScore}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 3. e-Rapor Compliance Info Banner */}
      <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl text-white shadow-md space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-cyan-400 text-slate-950 shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white">
                Standar Ketercapaian TP &amp; Validasi Resmi Format Import e-Rapor SMA
              </h3>
              <p className="text-xs text-blue-100 max-w-4xl leading-relaxed">
                Aplikasi SiMantri mengintegrasikan sistem Ceklis (Checkbox) cepat yang otomatis terkonversi ke standar mesin e-Rapor SMA:
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCurrentView('rekap-nilai-erapor')}
            className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black text-xs shrink-0 cursor-pointer shadow-sm transition-all"
          >
            Buka Tab e-Rapor
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/10 text-xs text-slate-200">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-cyan-300 block">1. Nilai Rapor = 100</span>
            <p className="text-[11px] text-slate-300">
              Wajib minimal <strong>1 Ceklis Optimal (T)</strong> dan <strong>TIDAK BOLEH</strong> ada Ceklis Perlu Peningkatan (R).
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-cyan-300 block">2. Nilai Rapor &lt; 100</span>
            <p className="text-[11px] text-slate-300">
              Wajib minimal <strong>1 Ceklis Optimal (T)</strong> DAN minimal <strong>1 Ceklis Perlu Peningkatan (R)</strong>.
            </p>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-1">
            <span className="font-bold text-cyan-300 block">3. Batas Kalimat TP</span>
            <p className="text-[11px] text-slate-300">
              Kalimat Tujuan Pembelajaran (TP) dibatasi <strong>maksimal 100 karakter</strong> (termasuk spasi dan tanda baca).
            </p>
          </div>
        </div>
      </div>

      {/* 4. Quick Nav Feature Cards for Rekap Nilai Module */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Menu 1 */}
        <button
          type="button"
          onClick={() => setCurrentView('rekap-nilai-leger')}
          className="text-left p-5 rounded-3xl bg-white hover:bg-emerald-50/50 border-2 border-slate-200/90 hover:border-emerald-500 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 group-hover:text-emerald-900 text-sm">
                1. Input Nilai TP &amp; Bobot
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Pengisian nilai sumatif TP 1-6, inline editing, sinkron nilai CBT &amp; penetapan bobot nilai.
              </p>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-emerald-700">
            <span>Buka Input TP</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Menu 2 */}
        <button
          type="button"
          onClick={() => setCurrentView('rekap-nilai-olahranking')}
          className="text-left p-5 rounded-3xl bg-white hover:bg-indigo-50/50 border-2 border-slate-200/90 hover:border-indigo-500 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 group-hover:text-indigo-900 text-sm">
                2. Nilai Akhir &amp; Leger Siswa
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Perhitungan STS, SAS, Nilai Akhir Rapor, pemeringkatan ranking, dan analisis statistik kelas.
              </p>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-700">
            <span>Buka Leger Siswa</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Menu 3 */}
        <button
          type="button"
          onClick={() => setCurrentView('rekap-nilai-erapor')}
          className="text-left p-5 rounded-3xl bg-white hover:bg-blue-50/50 border-2 border-slate-200/90 hover:border-blue-500 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 group-hover:text-blue-900 text-sm">
                3. Format Resmi e-Rapor SMA
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Ceklis ketercapaian TP (Optimal / Perlu), validasi rumus real-time &amp; export Excel e-Rapor resmi.
              </p>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-700">
            <span>Buka e-Rapor</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>

        {/* Menu 4 */}
        <button
          type="button"
          onClick={() => setCurrentView('rekap-nilai-cetak')}
          className="text-left p-5 rounded-3xl bg-white hover:bg-purple-50/50 border-2 border-slate-200/90 hover:border-purple-500 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-slate-900 group-hover:text-purple-900 text-sm">
                4. Cetak &amp; Ekspor Dokumen
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-relaxed">
                Cetak buku leger IKM format F4, unduh PDF/Excel resmi dengan kop sekolah &amp; tanda tangan kepala sekolah.
              </p>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-purple-700">
            <span>Buka Cetak Leger</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </div>

      {/* 5. Daftar Lembar Rekap Nilai per Kelas & Mata Pelajaran */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900">
              Daftar Lembar Rekapitulasi Nilai Kelas &amp; Mapel
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Monitoring progres pengisian nilai, rata-rata kelas, dan status validasi e-Rapor per rombel
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCurrentView('rekap-nilai-leger')}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-xs transition-all shrink-0"
          >
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span>Kelola / Buat Lembar Rekap</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2 border-t border-slate-100">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari kelas atau mata pelajaran..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Semua Kelas</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>
                  Kelas {cls}
                </option>
              ))}
            </select>

            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 max-w-[200px]"
            >
              <option value="ALL">Semua Mapel</option>
              {availableSubjects.map((sbj) => (
                <option key={sbj} value={sbj}>
                  {sbj}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List of Sheets */}
        {filteredSheets.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-200/70 text-slate-500 flex items-center justify-center">
              <Calculator className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 text-sm">Belum Ada Lembar Rekap Nilai yang Cocok</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Silakan buka menu Input Nilai untuk menginisialisasi lembar rekap nilai kelas atau ganti filter pencarian.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentView('rekap-nilai-leger')}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Calculator className="w-4 h-4" />
              <span>Buka Menu Rekapitulasi Nilai</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedSheets.map((sheet) => {
                const totalStudents = sheet.studentRecords.length;
                let filledScoresCount = 0;
                let validERaporCount = 0;
                let sheetScoreSum = 0;

                sheet.studentRecords.forEach((r) => {
                  const na = getRecordNAR(r, sheet.weightTPPercent, sheet.weightSemesterPercent);

                  if (typeof na === 'number' && !isNaN(na)) {
                    filledScoresCount += 1;
                    sheetScoreSum += na;
                  }

                  if (isRecordERaporValid(r, na)) {
                    validERaporCount += 1;
                  }
                });

                const sheetAverage = filledScoresCount > 0 ? Math.round((sheetScoreSum / filledScoresCount) * 10) / 10 : 0;
                const fillPercent = totalStudents > 0 ? Math.round((filledScoresCount / totalStudents) * 100) : 0;
                const isERaporReady = totalStudents > 0 && validERaporCount === totalStudents;

                return (
                  <div
                    key={sheet.id}
                    className="p-5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/20 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider block">
                            Kelas {sheet.kelas} • {sheet.fase || 'Fase F'}
                          </span>
                          <h4 className="font-black text-slate-900 text-sm leading-snug">
                            {sheet.mataPelajaran}
                          </h4>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {sheet.isFinalLocked ? (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                              <Lock className="w-3 h-3 text-rose-600" />
                              <span>FINAL</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              DRAF
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-white text-slate-700 border border-slate-200">
                            {sheet.semester}
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar Pengisian Nilai */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
                          <span>Pengisian Nilai:</span>
                          <span className="font-bold text-slate-800">
                            {filledScoresCount}/{totalStudents} Siswa ({fillPercent}%)
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              fillPercent === 100 ? 'bg-emerald-500' : fillPercent > 50 ? 'bg-indigo-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${fillPercent}%` }}
                          />
                        </div>
                      </div>

                      {/* Meta stats */}
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/80 text-[11.5px]">
                        <div>
                          <span className="text-slate-500 block text-[10.5px]">Rata-rata:</span>
                          <span className="font-black text-slate-900">{sheetAverage || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10.5px]">Status e-Rapor:</span>
                          {isERaporReady ? (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>100% Valid</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-amber-700">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <span>{totalStudents - validERaporCount} Perlu Ceklis</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions Buttons inside Card */}
                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentView('rekap-nilai-leger')}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-emerald-600 hover:text-white border border-slate-300 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer shadow-2xs"
                      >
                        Input TP
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('rekap-nilai-erapor')}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-blue-600 hover:text-white border border-slate-300 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer shadow-2xs"
                      >
                        e-Rapor
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentView('rekap-nilai-olahranking')}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-white hover:bg-indigo-600 hover:text-white border border-slate-300 text-slate-700 text-xs font-bold transition-all text-center cursor-pointer shadow-2xs"
                      >
                        Leger
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Table Pagination for Sheets */}
            <TablePagination
              currentPage={safeCurrentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={filteredSheets.length}
              onPageChange={(p) => setCurrentPage(p)}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 25, 50, 100, -1]}
            />
          </div>
        )}
      </div>

      {/* 6. Panduan Alur Pengolahan Rekapitulasi Nilai */}
      <div className="p-6 bg-slate-100 rounded-3xl border border-slate-200 space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-700" />
          <h3 className="font-black text-slate-900 text-sm">
            Panduan 4 Langkah Pengolahan Rekapitulasi Nilai &amp; Leger Siswa (IKM)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-slate-700">
          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
            <span className="font-black text-indigo-700 text-sm">Langkah 1</span>
            <h5 className="font-bold text-slate-900">Input Nilai TP &amp; Bobot</h5>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Ketik nilai sumatif per TP (1-6) secara langsung atau tarik otomatis dari hasil CBT asesmen yang sudah dikoreksi di SiMantri.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
            <span className="font-black text-indigo-700 text-sm">Langkah 2</span>
            <h5 className="font-bold text-slate-900">Deskripsi Capaian Kompetensi</h5>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Sistem otomatis mendeteksi TP nilai tertinggi &amp; terendah dan menyusun kalimat Capaian Kompetensi (CP) dengan batas maksimal 100 karakter.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
            <span className="font-black text-indigo-700 text-sm">Langkah 3</span>
            <h5 className="font-bold text-slate-900">Format Resmi e-Rapor SMA</h5>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Ceklis TP Optimal (T) dan Perlu Peningkatan (R) dengan validasi real-time. Ekspor ke Excel (.xlsx) presisi format resmi e-Rapor SMA.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5">
            <span className="font-black text-indigo-700 text-sm">Langkah 4</span>
            <h5 className="font-bold text-slate-900">Cetak &amp; Ekspor Buku Leger</h5>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Cetak buku Leger Nilai resmi sekolah ukuran F4, ekspor ke PDF atau Excel lengkap dengan ranking dan statistik kelas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
