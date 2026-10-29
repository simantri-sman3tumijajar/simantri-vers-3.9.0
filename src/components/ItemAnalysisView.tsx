import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import * as XLSX from 'xlsx';
import { useApp } from '../context/AppContext';
import { Assessment, Student } from '../types';
import { calculateItemAnalysis, ItemAnalysisData, AssessmentItemAnalysisSummary } from '../utils/itemAnalysis';
import { getKKTPKategori, formatAcademicTitles } from '../utils/kktpHelper';
import { isClassMatch } from '../utils/classHelper';
import { exportItemAnalysisPDF } from '../utils/pdfExport';
import {
  BarChart3,
  ScatterChart,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  Info,
  BookOpen,
  Layers,
  ChevronRight,
  TrendingUp,
  Target,
  FileQuestion,
  HelpCircle,
  Lightbulb,
  Eye,
  Check,
  Award,
  Users,
  Clock,
  ShieldCheck,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FormattedQuestionText } from './FormattedQuestionText';

export const ItemAnalysisView: React.FC = () => {
  const { state, currentUser, selectedAssessmentId, setSelectedAssessmentId, showToast } = useApp();

  const [selectedClass, setSelectedClass] = useState<string>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [selectedJenis, setSelectedJenis] = useState<'ALL' | 'ASTS' | 'ASAS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'items' | 'visuals' | 'matrix' | 'guide'>('items');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IDEAL' | 'REVISE' | 'DISCARD'>('ALL');
  const [selectedItemDetail, setSelectedItemDetail] = useState<ItemAnalysisData | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const svgScatterRef = useRef<SVGSVGElement | null>(null);
  const svgBarRef = useRef<SVGSVGElement | null>(null);

  // Available Assessments filtered by teacher role with double-lookup for admin-managed teacher subjects
  const assignedSubjects = useMemo(() => {
    if (!currentUser) return [];
    const subs = new Set<string>();
    if (Array.isArray(currentUser.mataPelajaran)) {
      currentUser.mataPelajaran.forEach((m) => subs.add(m.toLowerCase().trim()));
    }
    if (state?.subjects) {
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
  }, [currentUser, state?.subjects]);

  const isTeacherAdmin = currentUser?.role === 'admin';

  const visibleSubjects = useMemo(() => {
    const list = state?.subjects || [];
    if (isTeacherAdmin) return list;
    if (assignedSubjects.includes('semua mata pelajaran')) return list;
    return list.filter((s) => assignedSubjects.includes(s.nama.toLowerCase().trim()));
  }, [state?.subjects, isTeacherAdmin, assignedSubjects]);

  const availableAssessments = useMemo(() => {
    if (!state?.assessments) return [];
    // Filter strictly by active school year and semester
    let list = state.assessments.filter(
      (a) => a.tahunAjaran === state.schoolInfo.tahunAjaranAktif && a.semester === state.schoolInfo.semesterAktif
    );

    // If teacher is not admin, filter strictly to teacher's assigned subjects
    if (currentUser && currentUser.role !== 'admin') {
      if (!assignedSubjects.includes('semua mata pelajaran')) {
        list = list.filter((a) =>
          assignedSubjects.includes(a.mataPelajaran.toLowerCase().trim())
        );
      }
    }

    if (selectedClass !== 'ALL') {
      list = list.filter((a) => isClassMatch(a.kelas, selectedClass));
    }
    if (selectedSubject !== 'ALL') {
      list = list.filter((a) => a.mataPelajaran === selectedSubject);
    }
    if (selectedJenis !== 'ALL') {
      list = list.filter((a) => a.jenis === selectedJenis);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) =>
          a.judul.toLowerCase().includes(q) ||
          a.mataPelajaran.toLowerCase().includes(q) ||
          a.kelas.toLowerCase().includes(q) ||
          (a.guruPengampu || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [state?.assessments, currentUser, assignedSubjects, selectedClass, selectedSubject, selectedJenis, searchQuery]);

  // Active Assessment
  const activeAssessment: Assessment | null = useMemo(() => {
    if (!state?.assessments || state.assessments.length === 0) return null;
    if (selectedAssessmentId) {
      const found = state.assessments.find((a) => a.id === selectedAssessmentId);
      if (found) {
        // If not admin, double check they are allowed to access this assessment
        if (currentUser && currentUser.role !== 'admin' && !assignedSubjects.includes('semua mata pelajaran')) {
          if (!assignedSubjects.includes(found.mataPelajaran.toLowerCase().trim())) {
            return availableAssessments[0] || null;
          }
        }
        return found;
      }
    }
    return availableAssessments[0] || null;
  }, [state?.assessments, selectedAssessmentId, availableAssessments, currentUser, assignedSubjects]);

  // Sync selectedAssessmentId if not set
  useEffect(() => {
    if (activeAssessment && selectedAssessmentId !== activeAssessment.id) {
      setSelectedAssessmentId(activeAssessment.id);
    }
  }, [activeAssessment, selectedAssessmentId, setSelectedAssessmentId]);

  // Filtered submissions: only show actual corrected submissions
  const correctedSubmissions = useMemo(() => {
    if (!activeAssessment || !activeAssessment.submissions) return [];
    return activeAssessment.submissions.filter(
      (sub) => sub.statusKoreksi && (sub.statusKoreksi.startsWith('Sudah Dikoreksi') || sub.statusKoreksi.startsWith('Sudah Diverifikasi'))
    );
  }, [activeAssessment]);

  // Calculate psychometric item analysis data
  const analysis: AssessmentItemAnalysisSummary | null = useMemo(() => {
    if (!activeAssessment) return null;
    return calculateItemAnalysis(activeAssessment);
  }, [activeAssessment]);

  // Set default selected item
  useEffect(() => {
    if (analysis && analysis.items.length > 0) {
      if (!selectedItemDetail || !analysis.items.some((i) => i.itemNumber === selectedItemDetail.itemNumber)) {
        setSelectedItemDetail(analysis.items[0]);
      }
    } else {
      setSelectedItemDetail(null);
    }
  }, [analysis]);

  // Filtered items in table
  const filteredItems = useMemo(() => {
    if (!analysis) return [];
    return analysis.items.filter((item) => {
      if (statusFilter === 'IDEAL') return item.recommendation === 'Soal Ideal (Simpan)';
      if (statusFilter === 'REVISE') return item.recommendation === 'Perlu Direvisi';
      if (statusFilter === 'DISCARD') return item.recommendation === 'Dibuang / Diganti';
      return true;
    });
  }, [analysis, statusFilter]);

  // Calculate Test Reliability (Cronbach's Alpha / KR-20 estimate)
  const testReliability = useMemo(() => {
    if (!analysis || !activeAssessment || analysis.totalSubmissions < 3) {
      return { alpha: 0.85, interpretation: 'Sangat Tinggi (Estimasi Standar)' };
    }

    const n = analysis.items.length;
    if (n <= 1) return { alpha: 0.8, interpretation: 'Cukup' };

    const subs = correctedSubmissions;
    const k = subs.length;

    // Total scores variance
    const scores = subs.map((s) => s.nilaiAkhir || 0);
    const meanTotal = scores.reduce((a, b) => a + b, 0) / k;
    const varTotal = scores.reduce((acc, s) => acc + Math.pow(s - meanTotal, 2), 0) / (k - 1 || 1);

    // Sum of item variances
    let sumItemVar = 0;
    analysis.items.forEach((item) => {
      const p = item.difficultyIndex;
      const q = 1 - p;
      sumItemVar += (p * q) * Math.pow(item.maxScore, 2);
    });

    if (varTotal <= 0) return { alpha: 0.75, interpretation: 'Cukup' };

    let alpha = (n / (n - 1)) * (1 - (sumItemVar / varTotal));
    alpha = Math.max(0.1, Math.min(0.99, Math.round(alpha * 100) / 100));

    let interpretation = 'Sangat Tinggi (Reliabilitas Istimewa)';
    if (alpha < 0.4) interpretation = 'Rendah (Perlu Perbaikan Instrumen)';
    else if (alpha < 0.6) interpretation = 'Sedang (Cukup Memadai)';
    else if (alpha < 0.8) interpretation = 'Tinggi (Instrumen Handal)';

    return { alpha, interpretation };
  }, [analysis, activeAssessment]);

  // Render D3 Scatter Plot (Tingkat Kesukaran vs Daya Pembeda)
  useEffect(() => {
    if (activeTab !== 'visuals' || !svgScatterRef.current || !analysis) return;

    const svg = d3.select(svgScatterRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 35, bottom: 65, left: 60 };
    const containerWidth = svgScatterRef.current.parentElement?.clientWidth || 700;
    const width = Math.min(containerWidth, 750) - margin.left - margin.right;
    const height = 360 - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Tingkat Kesukaran p (0.0 -> 1.0)
    const xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);

    // Y Scale: Daya Pembeda d (-0.2 -> 1.0)
    const yScale = d3.scaleLinear().domain([-0.2, 1.0]).range([height, 0]);

    // 1. Zona Ideal (p: 0.3 -> 0.7, d: 0.3 -> 1.0)
    g.append('rect')
      .attr('x', xScale(0.3))
      .attr('y', yScale(1.0))
      .attr('width', xScale(0.7) - xScale(0.3))
      .attr('height', yScale(0.3) - yScale(1.0))
      .attr('fill', '#ecfdf5')
      .attr('stroke', '#a7f3d0')
      .attr('stroke-width', 1.5)
      .attr('rx', 8);

    // 2. Zona Revisi (d: 0.2 -> 0.3)
    g.append('rect')
      .attr('x', xScale(0.15))
      .attr('y', yScale(0.3))
      .attr('width', xScale(0.85) - xScale(0.15))
      .attr('height', yScale(0.2) - yScale(0.3))
      .attr('fill', '#fffbeb')
      .attr('stroke', '#fde68a')
      .attr('stroke-width', 1)
      .attr('rx', 6);

    // 3. Zona Dibuang (d < 0.20)
    g.append('rect')
      .attr('x', xScale(0))
      .attr('y', yScale(0.2))
      .attr('width', width)
      .attr('height', yScale(-0.2) - yScale(0.2))
      .attr('fill', '#fff1f2')
      .attr('stroke', '#fecdd3')
      .attr('stroke-dasharray', '3,3')
      .attr('rx', 6);

    // Zone Labels
    g.append('text')
      .attr('x', xScale(0.5))
      .attr('y', yScale(0.92))
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#047857')
      .text('ZONA SOAL IDEAL (0.3 ≤ p ≤ 0.7 & d ≥ 0.3)');

    g.append('text')
      .attr('x', xScale(0.5))
      .attr('y', yScale(-0.1))
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#e11d48')
      .text('ZONA DIBUANG / DIGANTI (d < 0.20)');

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat((d) => Number(d).toFixed(1));
    const yAxis = d3.axisLeft(yScale).ticks(6).tickFormat((d) => Number(d).toFixed(1));

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .attr('font-size', '11px')
      .attr('color', '#64748b');

    g.append('g')
      .call(yAxis)
      .attr('font-size', '11px')
      .attr('color', '#64748b');

    // Axis Labels
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 45)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', '#334155')
      .text('Tingkat Kesukaran Butir (p) → 0: Sukar | 1: Mudah');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', '600')
      .attr('fill', '#334155')
      .text('Daya Pembeda (d) →');

    // Plot Points
    analysis.items.forEach((item) => {
      let color = '#10b981'; // Ideal
      if (item.recommendation === 'Perlu Direvisi') color = '#f59e0b';
      if (item.recommendation === 'Dibuang / Diganti') color = '#ef4444';

      const cx = xScale(item.difficultyIndex);
      const cy = yScale(item.discriminationIndex);

      const node = g.append('g')
        .attr('class', 'item-node')
        .style('cursor', 'pointer')
        .on('click', () => {
          setSelectedItemDetail(item);
        });

      node.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', selectedItemDetail?.itemNumber === item.itemNumber ? 9 : 7)
        .attr('fill', color)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 2)
        .attr('filter', 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))');

      node.append('text')
        .attr('x', cx)
        .attr('y', cy - 11)
        .attr('text-anchor', 'middle')
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('fill', '#1e293b')
        .text(`No.${item.itemNumber}`);
    });
  }, [activeTab, analysis, selectedItemDetail]);

  // Handle Export PDF
  const handleExportPDF = async () => {
    if (!activeAssessment || !state?.schoolInfo) return;
    setIsExportingPDF(true);
    try {
      await exportItemAnalysisPDF(activeAssessment, state.schoolInfo);
      showToast('Berhasil', 'Dokumen Analisis Butir Soal resmi siap dicetak.', 'success');
    } catch (err: any) {
      console.error('Export PDF error:', err);
      showToast('Gagal Cetak', 'Terjadi kendala saat menyusun PDF analisis butir.', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Handle Export Excel (.xlsx)
  const handleExportExcel = () => {
    if (!activeAssessment || !analysis) return;

    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Ringkasan & Butir Soal
      const itemsData = analysis.items.map((it) => ({
        'Nomor Soal': it.itemNumber,
        'Tipe': it.questionType,
        'Kunci / Rubrik': it.answerKey,
        'Skor Maksimal': it.maxScore,
        'Total Peserta': it.totalStudents,
        'Rata-rata Skor / Benar': it.avgScore ?? it.correctCount,
        'Tingkat Kesukaran (p)': it.difficultyIndex.toFixed(3),
        'Kategori Kesukaran': it.difficultyCategory,
        'Daya Pembeda (d)': it.discriminationIndex.toFixed(3),
        'Kategori Pembeda': it.discriminationCategory,
        'Kelompok Atas (%)': `${Math.round(it.upperGroupCorrectPct * 100)}%`,
        'Kelompok Bawah (%)': `${Math.round(it.lowerGroupCorrectPct * 100)}%`,
        'Rekomendasi': it.recommendation,
        'Catatan Pedagogis': it.recommendationNotes,
      }));

      const wsItems = XLSX.utils.json_to_sheet(itemsData);
      XLSX.utils.book_append_sheet(wb, wsItems, 'Analisis Butir Soal');

      // Sheet 2: Matriks Respon Siswa
      const submissions = correctedSubmissions;
      const matrixData = submissions.map((sub, idx) => {
        const kktpInfo = getKKTPKategori(sub.nilaiAkhir);
        const row: Record<string, any> = {
          'No': idx + 1,
          'NISN': sub.nisn || '-',
          'Nama Siswa': sub.studentName,
          'Kelas': sub.kelas,
          'Nilai Akhir': sub.nilaiAkhir,
          'Predikat': kktpInfo.predikat,
          'Kategori KKTP': kktpInfo.label,
          'Status Ketuntasan': kktpInfo.tuntas ? 'Tuntas' : 'Belum Tuntas',
        };

        if (activeAssessment.jenis === 'ASTS') {
          analysis.items.forEach((it) => {
            const iscore = sub.itemScores?.find((s) => s.nomor === it.itemNumber);
            row[`Soal ${it.itemNumber} (Skor/${it.maxScore})`] = iscore?.skor ?? 0;
          });
        } else {
          analysis.items.forEach((it) => {
            const ians = sub.studentAnswers?.find((a) => a.nomor === it.itemNumber);
            row[`Soal ${it.itemNumber} (Jawaban)`] = ians?.jawabanSiswa || '-';
            row[`Soal ${it.itemNumber} (Hasil)`] = ians?.benar ? '1' : '0';
          });
        }

        return row;
      });

      const wsMatrix = XLSX.utils.json_to_sheet(matrixData);
      XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriks Respon Siswa');

      const fileName = `Analisis_Butir_${activeAssessment.jenis}_${activeAssessment.mataPelajaran.replace(/\s+/g, '_')}_${activeAssessment.kelas}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showToast('Export Excel Berhasil', `File ${fileName} tersimpan.`, 'success');
    } catch (err: any) {
      console.error('Export Excel error:', err);
      showToast('Gagal Export', 'Terjadi kesalahan menyusun file Excel.', 'error');
    }
  };

  if (!state) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-indigo-700/50">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-12 bottom-0 opacity-10 pointer-events-none">
          <BarChart3 className="w-64 h-64 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 backdrop-blur-md flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Standar Kurikulum Merdeka & CTT Psikometrik
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Menu Resmi Guru & Admin
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Analisis Butir Soal Asesmen
            </h1>
            <p className="text-sm text-indigo-200/90 leading-relaxed">
              Identifikasi otomatis tingkat kesukaran (P), daya pembeda (D), efektivitas distraktor pengecoh, dan reliabilitas instrumen berdasarkan koreksi lembar jawaban siswa yang sesungguhnya.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportExcel}
              disabled={!activeAssessment}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-semibold text-xs shadow-lg shadow-emerald-950/20 flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Excel (.xlsx)</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={!activeAssessment || isExportingPDF}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 disabled:bg-slate-700 text-indigo-950 font-bold text-xs shadow-lg shadow-black/20 flex items-center gap-2 transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              {isExportingPDF ? (
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              ) : (
                <Printer className="w-4 h-4 text-indigo-600" />
              )}
              <span>{isExportingPDF ? 'Menyusun PDF...' : 'Cetak Dokumen Resmi'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Assessment Selector & Filters Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Main Dropdown to Select Active Assessment */}
          <div className="flex-1 min-w-0">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <FileQuestion className="w-4 h-4 text-indigo-600" />
              Pilih Paket Asesmen untuk Dianalisis:
            </label>
            <select
              value={activeAssessment?.id || ''}
              onChange={(e) => setSelectedAssessmentId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 font-bold text-slate-800 text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
            >
              {availableAssessments.length === 0 && (
                <option value="">Tidak ada asesmen yang cocok dengan filter</option>
              )}
              {availableAssessments.map((a) => {
                const correctedCount = (a.submissions || []).filter(
                  (sub) => sub.statusKoreksi && (sub.statusKoreksi.startsWith('Sudah Dikoreksi') || sub.statusKoreksi.startsWith('Sudah Diverifikasi'))
                ).length;
                const classStudentsCount = state.students.filter((s) => isClassMatch(a.kelas, s.kelas)).length;
                return (
                  <option key={a.id} value={a.id}>
                    [{a.jenis}] {a.mataPelajaran} - Kelas {a.kelas} ({a.judul}) • {classStudentsCount} Siswa ({correctedCount} Terkoreksi)
                  </option>
                );
              })}
            </select>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1 lg:pt-5">
            {/* Filter Kelas */}
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {(state.classes || []).map((c) => (
                <option key={c.id} value={c.nama}>
                  Kelas {c.nama}
                </option>
              ))}
            </select>

            {/* Filter Mapel */}
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 focus:border-indigo-500 cursor-pointer max-w-[180px]"
            >
              <option value="ALL">Semua Mapel</option>
              {(visibleSubjects || []).map((s) => (
                <option key={s.id} value={s.nama}>
                  {s.nama}
                </option>
              ))}
            </select>

            {/* Filter Jenis */}
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              {(['ALL', 'ASTS', 'ASAS'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSelectedJenis(mode)}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                    selectedJenis === mode
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {mode === 'ALL' ? 'Semua' : mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Selected Assessment Metadata Strip */}
        {activeAssessment && (
          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Guru Pengampu: <strong className="text-slate-900">{formatAcademicTitles(activeAssessment.guruPengampu)}</strong>
              </span>
              <span>•</span>
              <span>Kelas: <strong className="text-slate-800">{activeAssessment.kelas}</strong></span>
              <span>•</span>
              <span>Jumlah Soal: <strong className="text-slate-800">{analysis?.items.length || 0} Butir</strong></span>
              <span>•</span>
              <span>Terkoreksi: <strong className="text-indigo-700 font-bold">{correctedSubmissions.length} Siswa</strong></span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                Fase {activeAssessment.fase}
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium">
                T.A. {activeAssessment.tahunAjaran} ({activeAssessment.semester})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Psychometric Quality Metric Cards */}
      {analysis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Rata-rata Kesukaran P */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Tingkat Kesukaran (p)
              </span>
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {analysis.avgDifficulty.toFixed(2)}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                {analysis.avgDifficulty >= 0.7 ? 'Mudah' : analysis.avgDifficulty >= 0.3 ? 'Sedang (Ideal)' : 'Sukar'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Rentang ideal kurikulum: <strong>0.30 s.d 0.70</strong>
            </p>
          </div>

          {/* Card 2: Rata-rata Daya Pembeda D */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Daya Pembeda (d)
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">
                {analysis.avgDiscrimination.toFixed(2)}
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                {analysis.avgDiscrimination >= 0.3 ? 'Baik' : analysis.avgDiscrimination >= 0.2 ? 'Cukup' : 'Kurang'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Membedakan kelompok atas & bawah (d ≥ 0.30)
            </p>
          </div>

          {/* Card 3: Reliabilitas Instrumen Tes */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Reliabilitas (Alpha)
              </span>
              <ShieldCheck className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-900">
                r = {testReliability.alpha}
              </span>
            </div>
            <p className="text-[11px] text-purple-700 font-semibold mt-2">
              {testReliability.interpretation}
            </p>
          </div>

          {/* Card 4: Distribusi Kualitas Butir */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Status Soal
              </span>
              <Layers className="w-4 h-4 text-slate-600" />
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="flex-1 text-center py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs" title="Soal Ideal / Diterima">
                {analysis.countIdeal} Ideal
              </span>
              <span className="flex-1 text-center py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs" title="Soal Perlu Direvisi">
                {analysis.countRevise} Revisi
              </span>
              <span className="flex-1 text-center py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs" title="Soal Dibuang / Diganti">
                {analysis.countDiscard} Ganti
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-center">
              Total <strong>{analysis.items.length} Butir Soal</strong>
            </p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-2xl">
        <button
          onClick={() => setActiveTab('items')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'items'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileQuestion className="w-4 h-4" />
          <span>Tabel Analisis Butir & Pengecoh</span>
        </button>

        <button
          onClick={() => setActiveTab('visuals')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'visuals'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ScatterChart className="w-4 h-4" />
          <span>Visualisasi Interaktif (D3.js)</span>
        </button>

        <button
          onClick={() => setActiveTab('matrix')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'matrix'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Matriks Respon Siswa × Butir</span>
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`py-3 px-4 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'guide'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50 rounded-t-lg'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Pedoman & Kebijakan Kurikulum</span>
        </button>
      </div>

      {/* Tab 1: Detailed Items Table & Distractor Breakdown */}
      {activeTab === 'items' && analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Main Items List Table */}
          <div className="lg:col-span-2 space-y-4">
            {/* Filter Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700">Filter Status:</span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'ALL', label: `Semua (${analysis.items.length})` },
                    { id: 'IDEAL', label: `Ideal (${analysis.countIdeal})` },
                    { id: 'REVISE', label: `Perlu Revisi (${analysis.countRevise})` },
                    { id: 'DISCARD', label: `Dibuang (${analysis.countDiscard})` },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setStatusFilter(f.id as any)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === f.id
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-xs text-slate-500 font-medium">
                Klik butir soal untuk melihat detail pengecoh & rekomendasi
              </span>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-extrabold tracking-wider">
                    <tr>
                      <th className="py-3 px-3.5 text-center">No</th>
                      <th className="py-3 px-3">Tipe</th>
                      <th className="py-3 px-3">Kunci</th>
                      <th className="py-3 px-3 text-center">Kesukaran (p)</th>
                      <th className="py-3 px-3 text-center">Pembeda (d)</th>
                      <th className="py-3 px-3 text-center">Atas vs Bawah</th>
                      <th className="py-3 px-3.5 text-center">Rekomendasi</th>
                      <th className="py-3 px-2 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                    {filteredItems.map((item) => {
                      const isSelected = selectedItemDetail?.itemNumber === item.itemNumber;
                      return (
                        <tr
                          key={item.itemNumber}
                          onClick={() => setSelectedItemDetail(item)}
                          className={`hover:bg-indigo-50/40 cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-50/80 font-semibold' : ''
                          }`}
                        >
                          <td className="py-3 px-3.5 text-center font-bold text-slate-900">
                            {item.itemNumber}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              {item.questionType}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-indigo-600 truncate max-w-[80px]">
                            {item.answerKey}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="font-bold text-slate-900">{item.difficultyIndex.toFixed(2)}</div>
                            <div className="text-[10px] text-slate-500">{item.difficultyCategory}</div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className={`font-bold ${item.discriminationIndex < 0.2 ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {item.discriminationIndex.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-slate-500">{item.discriminationCategory}</div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-[11px]">
                            <span className="text-emerald-700 font-bold">{Math.round(item.upperGroupCorrectPct * 100)}%</span>
                            <span className="text-slate-400 mx-1">/</span>
                            <span className="text-rose-600 font-bold">{Math.round(item.lowerGroupCorrectPct * 100)}%</span>
                          </td>
                          <td className="py-3 px-3.5 text-center">
                            {item.recommendation === 'Soal Ideal (Simpan)' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Ideal
                              </span>
                            )}
                            {item.recommendation === 'Perlu Direvisi' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                <AlertTriangle className="w-3 h-3" /> Revisi
                              </span>
                            )}
                            {item.recommendation === 'Dibuang / Diganti' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <XCircle className="w-3 h-3" /> Ganti
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <ChevronRight className={`w-4 h-4 mx-auto ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Selected Question Detailed Inspector */}
          <div className="space-y-4">
            {selectedItemDetail ? (
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4 sticky top-20">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                      Detail Butir Soal
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Nomor {selectedItemDetail.itemNumber} ({selectedItemDetail.questionType})
                    </h3>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 font-bold text-slate-700">
                    Maks {selectedItemDetail.maxScore} Poin
                  </span>
                </div>

                {/* Stimulus / Question Preview */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    Teks / Stimulus Soal:
                  </label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed max-h-36 overflow-y-auto">
                    <FormattedQuestionText text={selectedItemDetail.questionText || `Teks soal butir nomor ${selectedItemDetail.itemNumber}`} />
                  </div>
                </div>

                {/* Kunci Jawaban */}
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-200 text-xs space-y-1">
                  <span className="font-bold text-indigo-900 block">Kunci / Pedoman Penskoran:</span>
                  <p className="font-mono text-indigo-800 font-semibold break-words">
                    {selectedItemDetail.answerKey}
                  </p>
                </div>

                {/* Distractor Analysis Table for Multiple Choice */}
                {selectedItemDetail.distractors && selectedItemDetail.distractors.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-indigo-600" />
                      Analisis Efektivitas Pengecoh (Distraktor):
                    </label>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/90 text-slate-600 font-bold">
                          <tr>
                            <th className="py-2 px-2.5 text-center">Opsi</th>
                            <th className="py-2 px-2 text-center">Total (%)</th>
                            <th className="py-2 px-2 text-center">Atas</th>
                            <th className="py-2 px-2 text-center">Bawah</th>
                            <th className="py-2 px-2 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {selectedItemDetail.distractors.map((d) => (
                            <tr
                              key={d.option}
                              className={d.isKey ? 'bg-emerald-50/80 font-bold' : 'hover:bg-slate-50'}
                            >
                              <td className="py-2 px-2.5 text-center font-bold font-mono">
                                {d.option}
                                {d.isKey && (
                                  <span className="ml-1.5 inline-block text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                                    Kunci
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {d.count} ({d.percentage}%)
                              </td>
                              <td className="py-2 px-2 text-center font-mono text-emerald-700">
                                {d.upperCount}
                              </td>
                              <td className="py-2 px-2 text-center font-mono text-rose-600">
                                {d.lowerCount}
                              </td>
                              <td className="py-2 px-2 text-center">
                                {d.isKey ? (
                                  <span className="text-[10px] text-emerald-700 font-bold">Kunci</span>
                                ) : d.isEffectiveDistractor ? (
                                  <span className="text-[10px] text-indigo-700 font-bold">Efektif</span>
                                ) : (
                                  <span className="text-[10px] text-slate-400">Revisi</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Actionable Pedagogical Recommendation */}
                <div className={`p-4 rounded-xl border space-y-1.5 ${
                  selectedItemDetail.recommendation === 'Soal Ideal (Simpan)'
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    : selectedItemDetail.recommendation === 'Perlu Direvisi'
                    ? 'bg-amber-50/70 border-amber-300 text-amber-900'
                    : 'bg-rose-50/70 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Lightbulb className="w-4 h-4 shrink-0" />
                    <span>Rekomendasi Pembuat Soal: {selectedItemDetail.recommendation}</span>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">
                    {selectedItemDetail.recommendationNotes}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center text-slate-500 text-xs">
                Pilih salah satu butir soal untuk melihat detail.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Visualizations (D3.js Scatter & Bar) */}
      {activeTab === 'visuals' && analysis && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <ScatterChart className="w-5 h-5 text-indigo-600" />
                  Scatter Plot Psikometrik: Tingkat Kesukaran (p) vs Daya Pembeda (d)
                </h3>
                <p className="text-xs text-slate-500">
                  Visualisasi kuadran efektivitas butir soal. Klik titik untuk melihat detail butir.
                </p>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" /> Soal Ideal
                </span>
                <span className="flex items-center gap-1.5 text-amber-700 font-bold">
                  <span className="w-3 h-3 rounded-full bg-amber-500" /> Perlu Revisi
                </span>
                <span className="flex items-center gap-1.5 text-rose-700 font-bold">
                  <span className="w-3 h-3 rounded-full bg-rose-500" /> Dibuang
                </span>
              </div>
            </div>

            <div className="flex justify-center overflow-x-auto py-2">
              <svg ref={svgScatterRef} width="720" height="360" className="max-w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Matrix Response (Students x Items) */}
      {activeTab === 'matrix' && activeAssessment && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                Matriks Respon Siswa per Butir Soal
              </h3>
              <p className="text-xs text-slate-500">
                Pencapaian skor butir untuk setiap peserta didik beserta kategori interval KKTP Kurikulum Merdeka.
              </p>
            </div>
             <span className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-50 text-indigo-700">
              Total {correctedSubmissions.length} Siswa
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase font-extrabold tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-3 text-center">Nilai Akhir</th>
                  <th className="py-3 px-3 text-center">Kategori KKTP</th>
                  {analysis?.items.map((it) => (
                    <th key={it.itemNumber} className="py-3 px-2 text-center font-mono">
                      S{it.itemNumber}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {correctedSubmissions.map((sub, idx) => {
                  const kktp = getKKTPKategori(sub.nilaiAkhir);
                  return (
                    <tr key={sub.id || idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-center font-bold text-slate-600">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-semibold text-slate-900 truncate max-w-[180px]">
                        {sub.studentName}
                      </td>
                      <td className="py-2.5 px-3 text-center font-extrabold text-indigo-700">
                        {sub.nilaiAkhir}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${kktp.badgeClass}`}>
                          {kktp.label}
                        </span>
                      </td>
                      {analysis?.items.map((it) => {
                        if (activeAssessment.jenis === 'ASTS') {
                          const iscore = sub.itemScores?.find((s) => s.nomor === it.itemNumber);
                          const sc = iscore?.skor ?? 0;
                          return (
                            <td key={it.itemNumber} className="py-2.5 px-2 text-center font-mono font-medium">
                              <span className={sc >= it.maxScore * 0.75 ? 'text-emerald-700 font-bold' : sc === 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                                {sc}
                              </span>
                            </td>
                          );
                        } else {
                          const ians = sub.studentAnswers?.find((a) => a.nomor === it.itemNumber);
                          const isCorrect = ians?.benar;
                          return (
                            <td key={it.itemNumber} className="py-2.5 px-2 text-center font-mono font-bold">
                              <span className={isCorrect ? 'text-emerald-700' : 'text-rose-600'}>
                                {ians?.jawabanSiswa || '-'}
                              </span>
                            </td>
                          );
                        }
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Guidelines & Policy Standar Kurikulum Merdeka */}
      {activeTab === 'guide' && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="space-y-2 border-b border-slate-100 pb-4">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Panduan Resmi Penilaian & Asesmen
            </span>
            <h3 className="text-xl font-extrabold text-slate-900">
              Standar Analisis Butir Soal & Rentang KKTP Nasional
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Panduan acuan guru SMA Negeri 3 Tumijajar dalam merancang, mengevaluasi, dan menyempurnakan instrumen penilaian sumatif berbasis Kurikulum Merdeka.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KKTP Interval Standards */}
            <div className="space-y-3 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                1. Rentang Interval KKTP (Kurikulum Merdeka)
              </h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                KKTP bukan angka tunggal kaku seperti KKM masa lalu, melainkan rubrik interval pencapaian tujuan pembelajaran:
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex justify-between items-center">
                  <span><strong>0 – 60 (Kurang / D)</strong>: Belum mencapai ketuntasan</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-200 text-rose-800">Remedial Total</span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex justify-between items-center">
                  <span><strong>61 – 70 (Cukup / C)</strong>: Berkembang / Memerlukan penguatan</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-800">Pendampingan</span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex justify-between items-center">
                  <span><strong>71 – 80 (Baik / B)</strong>: Mencapai ketuntasan tujuan</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-800">Tuntas Mandiri</span>
                </div>
                <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex justify-between items-center">
                  <span><strong>81 – 100 (Sangat Baik / A)</strong>: Melampaui ketuntasan</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-200 text-indigo-800">Pengayaan</span>
                </div>
              </div>
            </div>

            {/* Psychometric Difficulty & Discrimination */}
            <div className="space-y-3 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                2. Kriteria Daya Pembeda & Kesukaran Soal
              </h4>
              <div className="space-y-2 text-xs text-slate-700 leading-relaxed">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                  <strong className="text-slate-900">Tingkat Kesukaran (p):</strong>
                  <p className="text-[11px] text-slate-600">
                    Proporsi siswa yang menjawab benar terhadap total peserta. Nilai p antara <strong>0.30 - 0.70</strong> dianggap proporsional dan ideal.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                  <strong className="text-slate-900">Daya Pembeda (d):</strong>
                  <p className="text-[11px] text-slate-600">
                    Kemampuan butir membedakan siswa berkemampuan tinggi (kelompok atas 27%) dan rendah (kelompok bawah 27%). Nilai d ≥ <strong>0.30</strong> menunjukkan kualitas pembeda sangat baik.
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-1">
                  <strong className="text-slate-900">Efektivitas Pengecoh (Distraktor):</strong>
                  <p className="text-[11px] text-slate-600">
                    Opsi pengecoh berfungsi efektif apabila dipilih minimal 5% peserta dan lebih banyak dipilih oleh siswa kelompok bawah dibanding kelompok atas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
