import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Assessment } from '../types';
import { useApp } from '../context/AppContext';
import { calculateItemAnalysis, ItemAnalysisData } from '../utils/itemAnalysis';
import { exportItemAnalysisPDF } from '../utils/pdfExport';
import {
  BarChart3,
  ScatterChart,
  X,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Layers,
  Search,
  Filter,
  Printer,
  BookOpen,
  HelpCircle,
  Lightbulb,
  Eye,
  Check,
  TrendingUp,
  Target,
  ArrowRight,
  SlidersHorizontal,
  ChevronRight,
  PieChart,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

interface ItemAnalysisD3ModalProps {
  isOpen: boolean;
  assessment: Assessment;
  onClose: () => void;
}

export const ItemAnalysisD3Modal: React.FC<ItemAnalysisD3ModalProps> = ({
  isOpen,
  assessment,
  onClose,
}) => {
  const { state } = useApp();
  const svgScatterRef = useRef<SVGSVGElement | null>(null);
  const svgBarRef = useRef<SVGSVGElement | null>(null);

  const [activeChartType, setActiveChartType] = useState<'scatter' | 'bar'>('scatter');
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IDEAL' | 'REVISE' | 'DISCARD'>('ALL');
  const [selectedItem, setSelectedItem] = useState<ItemAnalysisData | null>(null);

  const analysis = calculateItemAnalysis(assessment);

  // Auto select first item if none selected
  useEffect(() => {
    if (isOpen && analysis.items.length > 0 && !selectedItem) {
      setSelectedItem(analysis.items[0]);
    }
  }, [isOpen, analysis, selectedItem]);

  // Render D3 Scatter Plot (Tingkat Kesukaran vs Daya Pembeda)
  useEffect(() => {
    if (!isOpen || activeChartType !== 'scatter' || !svgScatterRef.current) return;

    const svg = d3.select(svgScatterRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = 680 - margin.left - margin.right;
    const height = 390 - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Difficulty (p) 0.0 -> 1.0
    const xScale = d3.scaleLinear().domain([0, 1]).range([0, width]);

    // Y Scale: Discrimination (d) -0.2 -> 1.0
    const yScale = d3.scaleLinear().domain([-0.2, 1.0]).range([height, 0]);

    // 1. Ideal Zone (p: 0.3 -> 0.7, d: 0.3 -> 1.0)
    g.append('rect')
      .attr('x', xScale(0.3))
      .attr('y', yScale(1.0))
      .attr('width', xScale(0.7) - xScale(0.3))
      .attr('height', yScale(0.3) - yScale(1.0))
      .attr('fill', '#ecfdf5')
      .attr('stroke', '#a7f3d0')
      .attr('stroke-width', 1.5)
      .attr('rx', 8);

    // 2. Revision Zone (d 0.2 -> 0.3)
    g.append('rect')
      .attr('x', xScale(0.15))
      .attr('y', yScale(0.3))
      .attr('width', xScale(0.85) - xScale(0.15))
      .attr('height', yScale(0.2) - yScale(0.3))
      .attr('fill', '#fffbeb')
      .attr('stroke', '#fde68a')
      .attr('stroke-width', 1)
      .attr('rx', 6);

    // 3. Discard Zone (d < 0.20)
    g.append('rect')
      .attr('x', xScale(0))
      .attr('y', yScale(0.2))
      .attr('width', width)
      .attr('height', yScale(-0.2) - yScale(0.2))
      .attr('fill', '#fff1f2')
      .attr('stroke', '#fecdd3')
      .attr('stroke-dasharray', '3,3')
      .attr('rx', 6);

    // Quadrant Label: Ideal Zone
    g.append('text')
      .attr('x', xScale(0.5))
      .attr('y', yScale(0.92))
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#047857')
      .text('ZONA SOAL IDEAL (0.3 ≤ p ≤ 0.7 & d ≥ 0.3)');

    // Quadrant Label: Discard Zone
    g.append('text')
      .attr('x', xScale(0.5))
      .attr('y', yScale(-0.1))
      .attr('text-anchor', 'middle')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#e11d48')
      .text('ZONA DIBUANG / PERLU DIGANTI (d < 0.20)');

    // Reference Lines
    g.append('line')
      .attr('x1', xScale(0.3))
      .attr('x2', xScale(0.3))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-dasharray', '4,4');

    g.append('line')
      .attr('x1', xScale(0.7))
      .attr('x2', xScale(0.7))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#cbd5e1')
      .attr('stroke-dasharray', '4,4');

    g.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yScale(0.3))
      .attr('y2', yScale(0.3))
      .attr('stroke', '#cbd5e1')
      .attr('stroke-dasharray', '4,4');

    // Axes
    const xAxis = d3.axisBottom(xScale).ticks(5).tickFormat((d) => `${Number(d) * 100}%`);
    const yAxis = d3.axisLeft(yScale).ticks(6);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .attr('font-size', '10px')
      .attr('color', '#64748b');

    g.append('g')
      .call(yAxis)
      .attr('font-size', '10px')
      .attr('color', '#64748b');

    // Axis Titles
    g.append('text')
      .attr('x', width / 2)
      .attr('y', height + 42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#334155')
      .text('Tingkat Kesukaran (p) → [Sukar < 30% | Sedang 30-70% | Mudah > 70%]');

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -42)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11px')
      .attr('font-weight', 'bold')
      .attr('fill', '#334155')
      .text('Daya Pembeda (d) → [Sangat Baik ≥ 0.40 | Baik 0.30-0.39 | Jelek < 0.20]');

    // Circles per Question Item
    const nodes = g
      .selectAll('.item-circle')
      .data(analysis.items)
      .enter()
      .append('g')
      .attr('class', 'item-circle')
      .attr('transform', (d) => `translate(${xScale(d.difficultyIndex)},${yScale(d.discriminationIndex)})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => setSelectedItem(d));

    // Outer Circle
    nodes
      .append('circle')
      .attr('r', (d) => (selectedItem?.itemNumber === d.itemNumber ? 19 : 15))
      .attr('fill', (d) => {
        if (d.recommendation === 'Soal Ideal (Simpan)') return '#10b981';
        if (d.recommendation === 'Perlu Direvisi') return '#f59e0b';
        return '#f43f5e';
      })
      .attr('fill-opacity', (d) => (selectedItem?.itemNumber === d.itemNumber ? 1.0 : 0.85))
      .attr('stroke', (d) => (selectedItem?.itemNumber === d.itemNumber ? '#1e1b4b' : '#ffffff'))
      .attr('stroke-width', (d) => (selectedItem?.itemNumber === d.itemNumber ? 3 : 2));

    // Inner Text (Soal #)
    nodes
      .append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.3em')
      .attr('font-size', '10px')
      .attr('font-weight', 'extrabold')
      .attr('fill', '#ffffff')
      .text((d) => `${d.itemNumber}`);

  }, [isOpen, activeChartType, analysis, selectedItem]);

  // Render D3 Dual-Bar Chart (Difficulty & Discrimination Side-by-Side per Item)
  useEffect(() => {
    if (!isOpen || activeChartType !== 'bar' || !svgBarRef.current) return;

    const svg = d3.select(svgBarRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 35, right: 30, bottom: 60, left: 50 };
    const width = 680 - margin.left - margin.right;
    const height = 390 - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x0 = d3
      .scaleBand()
      .domain(analysis.items.map((i) => `S${i.itemNumber}`))
      .rangeRound([0, width])
      .paddingInner(0.2);

    const x1 = d3
      .scaleBand()
      .domain(['difficulty', 'discrimination'])
      .rangeRound([0, x0.bandwidth()])
      .padding(0.05);

    const yScale = d3.scaleLinear().domain([-0.2, 1.0]).range([height, 0]);

    // X Axis
    g.append('g')
      .attr('transform', `translate(0,${yScale(0)})`)
      .call(d3.axisBottom(x0))
      .selectAll('text')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('color', '#475569');

    // Y Axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6))
      .attr('font-size', '10px')
      .attr('color', '#64748b');

    // Bars Group
    const itemGroups = g
      .selectAll('.item-bar-group')
      .data(analysis.items)
      .enter()
      .append('g')
      .attr('class', 'item-bar-group')
      .attr('transform', (d) => `translate(${x0(`S${d.itemNumber}`)},0)`);

    // Difficulty Bar (Indigo)
    itemGroups
      .append('rect')
      .attr('x', x1('difficulty') || 0)
      .attr('y', (d) => (d.difficultyIndex >= 0 ? yScale(d.difficultyIndex) : yScale(0)))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => Math.abs(yScale(d.difficultyIndex) - yScale(0)))
      .attr('fill', '#6366f1')
      .attr('rx', 3)
      .style('cursor', 'pointer')
      .on('click', (event, d) => setSelectedItem(d));

    // Discrimination Bar
    itemGroups
      .append('rect')
      .attr('x', x1('discrimination') || 0)
      .attr('y', (d) => (d.discriminationIndex >= 0 ? yScale(d.discriminationIndex) : yScale(0)))
      .attr('width', x1.bandwidth())
      .attr('height', (d) => Math.abs(yScale(d.discriminationIndex) - yScale(0)))
      .attr('fill', (d) => {
        if (d.discriminationIndex >= 0.3) return '#10b981';
        if (d.discriminationIndex >= 0.2) return '#f59e0b';
        return '#f43f5e';
      })
      .attr('rx', 3)
      .style('cursor', 'pointer')
      .on('click', (event, d) => setSelectedItem(d));

    // Legend
    const legend = svg
      .append('g')
      .attr('transform', `translate(${width - 200}, 10)`);

    legend
      .append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', '#6366f1')
      .attr('rx', 2);

    legend
      .append('text')
      .attr('x', 18)
      .attr('y', 10)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#334155')
      .text('Tingkat Kesukaran (p)');

    legend
      .append('rect')
      .attr('x', 120)
      .attr('y', 0)
      .attr('width', 12)
      .attr('height', 12)
      .attr('fill', '#10b981')
      .attr('rx', 2);

    legend
      .append('text')
      .attr('x', 138)
      .attr('y', 10)
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .attr('fill', '#334155')
      .text('Daya Pembeda (d)');
  }, [isOpen, activeChartType, analysis]);

  if (!isOpen) return null;

  // Filter Table Items
  const filteredItems = analysis.items.filter((item) => {
    if (searchFilter && !`soal ${item.itemNumber}`.includes(searchFilter.toLowerCase())) {
      return false;
    }
    if (statusFilter === 'IDEAL' && item.recommendation !== 'Soal Ideal (Simpan)') return false;
    if (statusFilter === 'REVISE' && item.recommendation !== 'Perlu Direvisi') return false;
    if (statusFilter === 'DISCARD' && item.recommendation !== 'Dibuang / Diganti') return false;
    return true;
  });

  const handleExportPDF = async () => {
    if (state?.schoolInfo) {
      await exportItemAnalysisPDF(assessment, state.schoolInfo);
    }
  };

  // Export Item Analysis Report to Excel
  const handleExportExcel = () => {
    const dataForSheet = analysis.items.map((item) => ({
      'Nomor Soal': `Soal #${item.itemNumber}`,
      'Tipe Soal': item.questionType,
      'Total Siswa Mengerjakan': item.totalStudents,
      'Jumlah Benar / Skor Maksimal': item.correctCount,
      'Tingkat Kesukaran (p)': (item.difficultyIndex * 100).toFixed(1) + '%',
      'Kategori Kesukaran': item.difficultyCategory,
      'Daya Pembeda (d)': item.discriminationIndex.toFixed(2),
      'Kategori Daya Pembeda': item.discriminationCategory,
      'Kelompok Atas (% Benar)': (item.upperGroupCorrectPct * 100).toFixed(1) + '%',
      'Kelompok Bawah (% Benar)': (item.lowerGroupCorrectPct * 100).toFixed(1) + '%',
      'Rekomendasi Analisis': item.recommendation,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analisis Butir Soal');

    const fileName = `ANALISIS_BUTIR_SOAL_${assessment.kelas}_${assessment.mataPelajaran.replace(/\s+/g, '_')}_${new Date().toISOString().substring(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Helper to get question details for selected item
  const getQuestionDetails = (itemNumber: number) => {
    const isASTS = assessment.jenis === 'ASTS';
    if (isASTS) {
      const q = assessment.essayRubrik?.find((r) => r.nomor === itemNumber);
      return {
        soal: q?.soal || `Butir soal uraian #${itemNumber}`,
        kunci: q?.kunciJawaban || 'Rubrik & Kunci Jawaban Essay',
        options: null,
      };
    } else {
      const q = assessment.mcqQuestions?.find((r) => r.nomor === itemNumber);
      return {
        soal: q?.soal || `Butir soal pilihan ganda #${itemNumber}`,
        kunci: q?.kunci || 'A',
        options: q?.pilihan || { A: 'Opsi A', B: 'Opsi B', C: 'Opsi C', D: 'Opsi D', E: 'Opsi E' },
      };
    }
  };

  // Option Distribution analysis for MCQ
  const getOptionDistribution = (itemNumber: number) => {
    if (assessment.jenis === 'ASTS') return null;
    const subs = assessment.submissions || [];
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
    let totalResp = 0;

    subs.forEach((s) => {
      const match = s.studentAnswers?.find((a) => a.nomor === itemNumber);
      if (match?.jawabanSiswa) {
        const ansKey = match.jawabanSiswa.toUpperCase();
        if (counts[ansKey] !== undefined) {
          counts[ansKey]++;
          totalResp++;
        }
      }
    });

    return { counts, totalResp };
  };

  const activeQuestionDetail = selectedItem ? getQuestionDetails(selectedItem.itemNumber) : null;
  const activeOptionDist = selectedItem ? getOptionDistribution(selectedItem.itemNumber) : null;

  return (
    <AnimatePresence>
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/80 backdrop-blur-md overflow-y-auto cursor-pointer"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-6xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto text-slate-800 cursor-default"
        >
          {/* Modal Header */}
          <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30">
                <BarChart3 className="w-5 h-5 text-indigo-100" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                    Modul Diagnosis Butir Soal (D3.js + AI Vision)
                  </span>
                  <span className="text-xs text-slate-300 font-semibold">
                    Kelas {assessment.kelas} ({assessment.fase}) • {assessment.mataPelajaran}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold text-white mt-0.5">
                  Analisis Tingkat Kesukaran, Daya Pembeda & Distribusi Jawaban
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0 overscroll-contain bg-slate-50/50">
            {/* Interactive Filter Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total Submissions */}
              <div 
                onClick={() => setStatusFilter('ALL')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold">Total Siswa</span>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <span className="text-xl font-black text-slate-900 block">
                  {analysis.totalSubmissions} <span className="text-xs font-semibold text-slate-500">Siswa</span>
                </span>
                <span className="text-[10px] font-extrabold text-indigo-600 block mt-1">
                  {analysis.items.length} Total Butir Soal
                </span>
              </div>

              {/* Soal Ideal */}
              <div 
                onClick={() => setStatusFilter('IDEAL')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  statusFilter === 'IDEAL'
                    ? 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-500/30 shadow-md'
                    : 'bg-emerald-50/80 border-emerald-200 hover:bg-emerald-100 text-emerald-900 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-extrabold">Soal Ideal (Simpan)</span>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span className="text-xl font-black block">
                  {analysis.countIdeal} <span className="text-xs font-semibold">Soal</span>
                </span>
                <span className="text-[10px] font-extrabold opacity-90 block mt-1">
                  {((analysis.countIdeal / (analysis.items.length || 1)) * 100).toFixed(0)}% Kualitas Baik
                </span>
              </div>

              {/* Perlu Direvisi */}
              <div 
                onClick={() => setStatusFilter('REVISE')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  statusFilter === 'REVISE'
                    ? 'bg-amber-500 text-white border-amber-600 ring-2 ring-amber-500/30 shadow-md'
                    : 'bg-amber-50/80 border-amber-200 hover:bg-amber-100 text-amber-900 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-extrabold">Perlu Direvisi</span>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <span className="text-xl font-black block">
                  {analysis.countRevise} <span className="text-xs font-semibold">Soal</span>
                </span>
                <span className="text-[10px] font-extrabold opacity-90 block mt-1">
                  Opsi Distraktor Perlu Dirapi
                </span>
              </div>

              {/* Dibuang / Diganti */}
              <div 
                onClick={() => setStatusFilter('DISCARD')}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  statusFilter === 'DISCARD'
                    ? 'bg-rose-500 text-white border-rose-600 ring-2 ring-rose-500/30 shadow-md'
                    : 'bg-rose-50/80 border-rose-200 hover:bg-rose-100 text-rose-900 shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-extrabold">Dibuang / Diganti</span>
                  <XCircle className="w-4 h-4" />
                </div>
                <span className="text-xl font-black block">
                  {analysis.countDiscard} <span className="text-xs font-semibold">Soal</span>
                </span>
                <span className="text-[10px] font-extrabold opacity-90 block mt-1">
                  Daya Pembeda Jelek (&lt;0.20)
                </span>
              </div>

              {/* Rerata Kesukaran */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold">Rerata Kesukaran (p)</span>
                  <Target className="w-3.5 h-3.5 text-indigo-600" />
                </div>
                <span className="text-xl font-black text-indigo-700 block">
                  {(analysis.avgDifficulty * 100).toFixed(1)}%
                </span>
                <span className="text-[10px] font-bold text-slate-500 block mt-1">
                  {analysis.avgDifficulty > 0.7 ? 'Kategori Mudah' : analysis.avgDifficulty < 0.3 ? 'Kategori Sukar' : 'Kategori Sedang (Ideal)'}
                </span>
              </div>

              {/* Rerata Daya Pembeda */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center justify-between text-slate-500 mb-1">
                  <span className="text-[11px] font-bold">Rerata Pembeda (d)</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-xl font-black text-emerald-700 block">
                  {analysis.avgDiscrimination.toFixed(2)}
                </span>
                <span className="text-[10px] font-bold text-slate-500 block mt-1">
                  {analysis.avgDiscrimination >= 0.4 ? 'Sangat Membedakan' : analysis.avgDiscrimination >= 0.3 ? 'Cukup Membedakan' : 'Perlu Peningkatan'}
                </span>
              </div>
            </div>

            {/* Main Content Layout: Left Chart Column + Right Interactive Question Pedagogy Inspection Card */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: D3 Charts (7 Cols) */}
              <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-indigo-600" />
                      Visualisasi Grafik Sebaran Butir Soal (D3.js)
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Klik bulatan nomor soal pada grafik untuk memeriksa naskah & pedoman kisi-kisi.
                    </p>
                  </div>

                  {/* Chart Type Toggle & Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200">
                      <button
                        onClick={() => setActiveChartType('scatter')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          activeChartType === 'scatter'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <ScatterChart className="w-3.5 h-3.5" />
                        <span>Quad Scatter</span>
                      </button>

                      <button
                        onClick={() => setActiveChartType('bar')}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                          activeChartType === 'bar'
                            ? 'bg-indigo-600 text-white shadow-2xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Dual-Bar</span>
                      </button>
                    </div>

                    <button
                      onClick={handleExportPDF}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Cetak Laporan Analisis PDF Resmi"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>PDF</span>
                    </button>

                    <button
                      onClick={handleExportExcel}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-xs flex items-center gap-1 cursor-pointer transition-colors"
                      title="Ekspor Data Analisis Ke Excel (.xlsx)"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>

                {/* D3 SVG Container */}
                <div className="w-full flex justify-center bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80 overflow-x-auto">
                  {activeChartType === 'scatter' ? (
                    <svg ref={svgScatterRef} width={680} height={390} className="max-w-full" />
                  ) : (
                    <svg ref={svgBarRef} width={680} height={390} className="max-w-full" />
                  )}
                </div>
              </div>

              {/* Right Column: In-Depth Question Pedagogy Inspection Card (5 Cols) */}
              <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    Rincian Pedagogi & Kunci Jawaban
                  </h4>
                  {selectedItem && (
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        selectedItem.recommendation === 'Soal Ideal (Simpan)'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : selectedItem.recommendation === 'Perlu Direvisi'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      {selectedItem.recommendation}
                    </span>
                  )}
                </div>

                {selectedItem ? (
                  <div className="space-y-4">
                    {/* Selected Item Indicator */}
                    <div className="p-3 bg-gradient-to-r from-indigo-50 via-slate-50 to-purple-50 rounded-2xl border border-indigo-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-indigo-950 uppercase tracking-wider">
                          Soal Nomor #{selectedItem.itemNumber} ({selectedItem.questionType})
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {selectedItem.totalStudents} Siswa Menjawab
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 line-clamp-3 leading-relaxed mt-1">
                        {activeQuestionDetail?.soal}
                      </p>
                    </div>

                    {/* Difficulty & Discrimination Meter Gauges */}
                    <div className="space-y-3">
                      {/* Difficulty Meter */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>Tingkat Kesukaran (p):</span>
                          <span className="text-indigo-700 font-black">
                            {(selectedItem.difficultyIndex * 100).toFixed(1)}% — {selectedItem.difficultyCategory}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, selectedItem.difficultyIndex * 100))}%` }}
                          />
                        </div>
                      </div>

                      {/* Discrimination Meter */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                          <span>Daya Pembeda (d):</span>
                          <span className={`${
                            selectedItem.discriminationIndex >= 0.3 ? 'text-emerald-700' : selectedItem.discriminationIndex >= 0.2 ? 'text-amber-700' : 'text-rose-700'
                          } font-black`}>
                            {selectedItem.discriminationIndex.toFixed(2)} — {selectedItem.discriminationCategory}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              selectedItem.discriminationIndex >= 0.3 ? 'bg-emerald-500' : selectedItem.discriminationIndex >= 0.2 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, selectedItem.discriminationIndex * 100))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Group Comparison Bar: Kelompok Atas (27%) vs Kelompok Bawah (27%) */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 block uppercase tracking-wider">
                        Komparasi Kelompok Atas vs Bawah (27% Sample)
                      </span>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl text-center">
                          <span className="text-[10px] text-emerald-800 font-bold block">Kelompok Atas (Top 27%)</span>
                          <span className="text-base font-black text-emerald-950 block mt-0.5">
                            {(selectedItem.upperGroupCorrectPct * 100).toFixed(1)}% Benar
                          </span>
                        </div>

                        <div className="p-2 bg-amber-50/80 border border-amber-200 rounded-xl text-center">
                          <span className="text-[10px] text-amber-800 font-bold block">Kelompok Bawah (Bottom 27%)</span>
                          <span className="text-base font-black text-amber-950 block mt-0.5">
                            {(selectedItem.lowerGroupCorrectPct * 100).toFixed(1)}% Benar
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Distractor Breakdown for MCQ / Option Distribution */}
                    {activeOptionDist && activeQuestionDetail?.options && (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                            <PieChart className="w-3.5 h-3.5 text-sky-600" />
                            <span>Analisis Pengecoh (Distraktor Opsi A-E)</span>
                          </span>
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                            Kunci: {activeQuestionDetail.kunci}
                          </span>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          {['A', 'B', 'C', 'D', 'E'].map((optKey) => {
                            const cnt = activeOptionDist.counts[optKey] || 0;
                            const pct = activeOptionDist.totalResp > 0 ? (cnt / activeOptionDist.totalResp) * 100 : 0;
                            const isKey = activeQuestionDetail.kunci?.toUpperCase() === optKey;

                            return (
                              <div key={optKey} className="flex items-center gap-2 text-xs">
                                <span className={`w-5 font-black text-center rounded ${isKey ? 'bg-emerald-600 text-white' : 'text-slate-600 bg-slate-200'}`}>
                                  {optKey}
                                </span>
                                <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={`h-full ${isKey ? 'bg-emerald-500' : 'bg-slate-400'}`}
                                    style={{ width: `${Math.min(100, pct)}%` }}
                                  />
                                </div>
                                <span className="text-[11px] font-bold text-slate-700 w-12 text-right">
                                  {cnt} ({pct.toFixed(0)}%)
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* AI / Pedagogical Recommendation Banner */}
                    <div className={`p-3 rounded-2xl border text-xs leading-relaxed space-y-1 ${
                      selectedItem.recommendation === 'Soal Ideal (Simpan)'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                        : selectedItem.recommendation === 'Perlu Direvisi'
                        ? 'bg-amber-50 border-amber-200 text-amber-950'
                        : 'bg-rose-50 border-rose-200 text-rose-950'
                    }`}>
                      <div className="font-bold flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Rekomendasi Tindak Lanjut Guru:</span>
                      </div>
                      <p className="text-[11px]">
                        {selectedItem.recommendation === 'Soal Ideal (Simpan)'
                          ? 'Soal memiliki tingkat kesukaran dan daya pembeda yang sangat seimbang. Sangat baik untuk disimpan di Bank Soal Sekolah.'
                          : selectedItem.recommendation === 'Perlu Direvisi'
                          ? 'Daya pembeda kurang maksimal (0.20 - 0.29). Disarankan merevisi opsi pilihan pengecoh (distraktor) atau memperjelas redaksi kalimat pertanyaan.'
                          : 'Daya pembeda jelek (< 0.20) atau bernilai negatif. Soal perlu diganti atau dibuang karena membingungkan siswa kelompok atas.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <HelpCircle className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="text-xs font-semibold">
                      Klik butir soal pada grafik atau tabel di bawah untuk melihat rincian kisi-kisi dan analisis pedagogi.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Full Matrix Table */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Matriks Lengkap Analisis Butir Soal ({filteredItems.length} Butir)
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Klik baris mana saja untuk melihat analisis mendalam dan rekomendasi per butir soal.
                  </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-48">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Cari nomor soal..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Rekomendasi</option>
                    <option value="IDEAL">Soal Ideal (Simpan)</option>
                    <option value="REVISE">Perlu Direvisi</option>
                    <option value="DISCARD">Dibuang / Diganti</option>
                  </select>
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead className="bg-slate-100/90 text-slate-800 font-black uppercase tracking-wider text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-3.5">No. Soal</th>
                      <th className="p-3.5">Tingkat Kesukaran (p)</th>
                      <th className="p-3.5">Daya Pembeda (d)</th>
                      <th className="p-3.5">Kelompok Atas (27%)</th>
                      <th className="p-3.5">Kelompok Bawah (27%)</th>
                      <th className="p-3.5 text-center">Status / Rekomendasi</th>
                      <th className="p-3.5 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {filteredItems.map((item) => {
                      const isSelected = selectedItem?.itemNumber === item.itemNumber;
                      return (
                        <tr
                          key={item.itemNumber}
                          onClick={() => setSelectedItem(item)}
                          className={`transition-colors cursor-pointer ${
                            isSelected ? 'bg-indigo-50/80 font-bold' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="p-3.5 font-extrabold text-slate-900">
                            Soal #{item.itemNumber}
                          </td>
                          <td className="p-3.5">
                            <span className="font-mono font-black text-indigo-700 block text-xs">
                              {(item.difficultyIndex * 100).toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">{item.difficultyCategory}</span>
                          </td>
                          <td className="p-3.5">
                            <span className={`font-mono font-black block text-xs ${
                              item.discriminationIndex >= 0.3 ? 'text-emerald-700' : item.discriminationIndex >= 0.2 ? 'text-amber-700' : 'text-rose-700'
                            }`}>
                              {item.discriminationIndex.toFixed(2)}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold">{item.discriminationCategory}</span>
                          </td>
                          <td className="p-3.5 font-bold text-emerald-800">
                            {(item.upperGroupCorrectPct * 100).toFixed(1)}% Benar
                          </td>
                          <td className="p-3.5 font-bold text-amber-800">
                            {(item.lowerGroupCorrectPct * 100).toFixed(1)}% Benar
                          </td>
                          <td className="p-3.5 text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-[10px] font-black ${
                                item.recommendation === 'Soal Ideal (Simpan)'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : item.recommendation === 'Perlu Direvisi'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              {item.recommendation}
                            </span>
                          </td>
                          <td className="p-3.5 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedItem(item);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-extrabold flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <span>Rincian</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500 text-xs font-semibold">
                          Tidak ada butir soal yang memenuhi kriteria filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
            <span className="text-slate-500 font-medium text-[11px]">
              Diagnosis Butir Soal D3.js • {assessment.mataPelajaran} ({assessment.kelas})
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer transition-colors text-xs"
            >
              Tutup Analisis
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
