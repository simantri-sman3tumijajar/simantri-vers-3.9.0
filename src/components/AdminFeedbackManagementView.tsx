import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { TeacherFeedback } from '../types';
import { formatIndonesianDate } from '../utils/dateUtils';
import {
  Inbox,
  MessageSquare,
  CheckCircle2,
  Clock,
  Trash2,
  Edit3,
  Search,
  Filter,
  Download,
  Star,
  User,
  Calendar,
  Sparkles,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Eye,
  Send,
  Copy,
  Layers,
  Wand2,
  FileText,
  ListChecks,
  ChevronRight,
  Loader2,
  ArrowRight,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../context/LanguageContext';
import { formatMataPelajaran } from '../utils/subjectNormalization';

interface KeyInsight {
  category: string;
  issue: string;
  requestedBy?: string;
  solution: string;
  urgency: string;
}

interface ActionRoadmapItem {
  stepNumber: number;
  title: string;
  description: string;
  priority: string;
}

interface SynthesisResult {
  title: string;
  executiveSummary: string;
  keyInsights: KeyInsight[];
  aiPromptDirective: string;
  actionRoadmap: ActionRoadmapItem[];
}

export const AdminFeedbackManagementView: React.FC = () => {
  const { state, updateFeedbackStatus, deleteFeedback, clearAllFeedbacks, toggleFeedbackBestTestimonial, showToast } = useApp();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'ALL' | 'Baru' | 'Ditinjau' | 'Ditindaklanjuti'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Multi-select state
  const [selectedFeedbackIds, setSelectedFeedbackIds] = useState<Set<string>>(new Set());

  // Modal response state
  const [selectedFeedbackForReply, setSelectedFeedbackForReply] = useState<TeacherFeedback | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyStatus, setReplyStatus] = useState<'Baru' | 'Ditinjau' | 'Ditindaklanjuti'>('Ditindaklanjuti');

  // Reset confirmation state
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // AI Feedback Synthesizer & Generator State
  const [isSynthesizerOpen, setIsSynthesizerOpen] = useState(false);
  const [manualUserNotes, setManualUserNotes] = useState('');
  const [isGeneratingSynthesis, setIsGeneratingSynthesis] = useState(false);
  const [synthesisResult, setSynthesisResult] = useState<SynthesisResult | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const feedbacks = state.feedbacks || [];

  // KPI Calculations
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const baruCount = feedbacks.filter((f) => f.status === 'Baru').length;
    const ditinjauCount = feedbacks.filter((f) => f.status === 'Ditinjau').length;
    const ditindaklanjutiCount = feedbacks.filter((f) => f.status === 'Ditindaklanjuti').length;

    let totalRating = 0;
    let ratedCount = 0;
    feedbacks.forEach((f) => {
      if (f.rating) {
        totalRating += f.rating;
        ratedCount++;
      }
    });

    const avgRating = ratedCount > 0 ? (totalRating / ratedCount).toFixed(1) : '-';
    const saranCount = feedbacks.filter((f) => f.kategori === 'Saran Pengembangan' || f.kategori === 'Saran Fitur').length;
    const kritikCount = feedbacks.filter((f) => f.kategori === 'Kritik / Laporan Kendala').length;
    const testimoniCount = feedbacks.filter((f) => f.kategori === 'Testimoni Penggunaan' || f.kategori === 'Apresiasi').length;
    const bestTestimonialCount = feedbacks.filter((f) => f.isBestTestimonial).length;

    return {
      total,
      baruCount,
      ditinjauCount,
      ditindaklanjutiCount,
      avgRating,
      saranCount,
      kritikCount,
      testimoniCount,
      bestTestimonialCount,
    };
  }, [feedbacks]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    feedbacks.forEach((f) => set.add(f.kategori));
    return Array.from(set);
  }, [feedbacks]);

  // Filtered feedbacks
  const filteredFeedbacks = useMemo(() => {
    return feedbacks.filter((f) => {
      if (activeTab !== 'ALL' && f.status !== activeTab) return false;
      if (selectedCategory === 'Testimoni Unggulan') {
        if (!f.isBestTestimonial) return false;
      } else if (selectedCategory !== 'ALL' && f.kategori !== selectedCategory) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = f.teacherName.toLowerCase().includes(q);
        const matchNip = f.teacherNip ? f.teacherNip.toLowerCase().includes(q) : false;
        const matchTitle = f.judul.toLowerCase().includes(q);
        const matchMessage = f.pesan.toLowerCase().includes(q);
        return matchName || matchNip || matchTitle || matchMessage;
      }
      return true;
    });
  }, [feedbacks, activeTab, selectedCategory, searchQuery]);

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedFeedbackIds.size === filteredFeedbacks.length && filteredFeedbacks.length > 0) {
      setSelectedFeedbackIds(new Set());
    } else {
      setSelectedFeedbackIds(new Set(filteredFeedbacks.map((f) => f.id)));
    }
  };

  const handleToggleSelectOne = (id: string) => {
    setSelectedFeedbackIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenReplyModal = (fb: TeacherFeedback) => {
    setSelectedFeedbackForReply(fb);
    setReplyText(fb.adminNote || '');
    setReplyStatus(fb.status === 'Baru' ? 'Ditinjau' : fb.status);
  };

  const handleSaveReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFeedbackForReply) return;

    const targetId = selectedFeedbackForReply.id;
    const text = replyText.trim();
    setSelectedFeedbackForReply(null);
    setReplyText('');
    updateFeedbackStatus(targetId, replyStatus, text);
  };

  // Batch Status Update
  const handleBatchMarkAs = async (targetStatus: 'Ditinjau' | 'Ditindaklanjuti') => {
    if (selectedFeedbackIds.size === 0) return;
    const ids = Array.from(selectedFeedbackIds);
    for (const id of ids) {
      await updateFeedbackStatus(id, targetStatus);
    }
    showToast(
      'Status Diperbarui Massal',
      `${ids.length} masukan berhasil diubah statusnya menjadi "${targetStatus}".`,
      'success'
    );
    setSelectedFeedbackIds(new Set());
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedFeedbackIds.size === 0) return;
    const count = selectedFeedbackIds.size;
    if (!window.confirm(`Yakin ingin menghapus ${count} umpan balik yang dipilih sekaligus?`)) return;

    for (const id of Array.from(selectedFeedbackIds)) {
      await deleteFeedback(id);
    }
    showToast('Masukan Dihapus', `${count} umpan balik berhasil dihapus.`, 'info');
    setSelectedFeedbackIds(new Set());
  };

  // Open AI Synthesizer Modal
  const handleOpenSynthesizer = () => {
    setSynthesisResult(null);
    setCopiedPrompt(false);
    setIsSynthesizerOpen(true);
  };

  // Run AI Synthesis & Prompt Generation
  const handleRunAiSynthesis = async () => {
    const targetFeedbacks = selectedFeedbackIds.size > 0
      ? feedbacks.filter((f) => selectedFeedbackIds.has(f.id))
      : filteredFeedbacks.length > 0
      ? filteredFeedbacks
      : feedbacks;

    if (targetFeedbacks.length === 0 && !manualUserNotes.trim()) {
      showToast(
        'Data Masukan Kosong',
        'Pilih beberapa tanggapan pada daftar atau tuliskan catatan masukan pengguna pada kolom teks.',
        'warning'
      );
      return;
    }

    setIsGeneratingSynthesis(true);
    try {
      const payload = {
        feedbacks: targetFeedbacks.map((f) => ({
          teacherName: f.teacherName,
          nip: f.teacherNip || '-',
          mataPelajaran: formatMataPelajaran(f.mataPelajaran),
          kategori: f.kategori,
          judul: f.judul,
          pesan: f.pesan,
          rating: f.rating || 5,
          status: f.status,
          tanggal: formatIndonesianDate(f.createdAt),
        })),
        rawNotes: manualUserNotes.trim(),
      };

      const res = await fetch('/api/gemini/synthesize-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.result) {
        setSynthesisResult(json.result);
        showToast(
          'Rangkaian Tanggapan Berhasil Dibuat!',
          'Gemini AI berhasil menyintesis seluruh masukan menjadi prompt arahan perbaikan terstruktur.',
          'success'
        );
      } else {
        showToast('Kendala AI Generator', json.message || 'Gagal merangkai masukan dengan AI.', 'error');
      }
    } catch (err: any) {
      console.error('Synthesize Error:', err);
      showToast('Kendala Koneksi', 'Gagal menghubungi generator AI. Silakan periksa koneksi internet.', 'error');
    } finally {
      setIsGeneratingSynthesis(false);
    }
  };

  // 1-Click Copy Prompt to Clipboard
  const handleCopyPromptToClipboard = () => {
    if (!synthesisResult?.aiPromptDirective) return;
    navigator.clipboard.writeText(synthesisResult.aiPromptDirective);
    setCopiedPrompt(true);
    showToast(
      'Prompt Tersalin ke Clipboard!',
      'Silakan tempelkan (paste) langsung ke chat AI Studio Build ini sebagai bahan instruksi perbaikan.',
      'success'
    );
    setTimeout(() => setCopiedPrompt(false), 3500);
  };

  const handleExportExcel = () => {
    if (feedbacks.length === 0) {
      showToast('Tidak Ada Data', 'Belum ada data umpan balik guru untuk diekspor.', 'warning');
      return;
    }

    const headers = [
      'NO',
      'TANGGAL',
      'NAMA_GURU',
      'NIP',
      'MATA_PELAJARAN',
      'KATEGORI',
      'JUDUL_SARAN',
      'ISI_MASUKAN',
      'RATING_KEPUASAN',
      'STATUS',
      'CATATAN_ADMINISTRATOR',
    ];

    const dataRows = feedbacks.map((fb, idx) => [
      idx + 1,
      new Date(fb.createdAt).toLocaleString('id-ID'),
      fb.teacherName,
      fb.teacherNip || '-',
      formatMataPelajaran(fb.mataPelajaran),
      fb.kategori,
      fb.judul,
      fb.pesan,
      fb.rating ? `${fb.rating}/5` : '-',
      fb.status,
      fb.adminNote || '-',
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 20 },
      { wch: 30 },
      { wch: 22 },
      { wch: 30 },
      { wch: 20 },
      { wch: 35 },
      { wch: 60 },
      { wch: 16 },
      { wch: 18 },
      { wch: 45 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Feedback_Guru');
    XLSX.writeFile(
      wb,
      `REKAP_FEEDBACK_GURU_SMANTRI_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    showToast('Ekspor Berhasil', 'Rekap data umpan balik guru berhasil diunduh ke format Excel.', 'success');
  };

  const handleResetAllFeedbacks = async () => {
    setIsResetting(true);
    try {
      const ok = await clearAllFeedbacks();
      if (ok) {
        setIsResetConfirmOpen(false);
        setSelectedFeedbackIds(new Set());
      }
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>{t('nav.feedback_center', 'Pusat Monitoring Umpan Balik Guru')}</span>
              {stats.baruCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950 animate-pulse">
                  {stats.baruCount} {t('Masukan Baru', 'Masukan Baru')}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('nav.feedback_center.desc', 'Kelola, telaah, rangkai tanggapan dengan AI, dan tindak lanjuti seluruh aspirasi pengguna')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* AI Feedback Synthesizer Button */}
          <button
            type="button"
            onClick={handleOpenSynthesizer}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-700 hover:from-indigo-700 hover:to-sky-700 text-white font-bold text-xs shadow-md shadow-indigo-500/25 cursor-pointer transition-all active:scale-95"
            title="Rangkai dan sintesis beberapa tanggapan guru menjadi prompt siap pakai untuk perbaikan sistem"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>Rangkai Tanggapan AI</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-indigo-600" />
            <span>{t('action.export_csv', 'Ekspor Excel')}</span>
          </button>

          {/* Reset / Kosongkan Umpan Balik Button */}
          <button
            type="button"
            onClick={() => setIsResetConfirmOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors cursor-pointer"
            title="Reset seluruh data umpan balik guru kembali ke semula"
          >
            <RotateCcw className="w-4 h-4 text-rose-600" />
            <span>Reset ke Semula</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500">{t('Total Masukan', 'Total Masukan')}</span>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <span className="text-[10px] text-slate-400">{t('Dari seluruh akun guru', 'Dari seluruh akun guru')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800">{t('Perlu Ditinjau (Baru)', 'Perlu Ditinjau (Baru)')}</span>
          <div className="text-2xl font-black text-amber-900 mt-1">{stats.baruCount}</div>
          <span className="text-[10px] text-amber-700 font-medium">{t('Belum ditanggapi', 'Belum ditanggapi')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 shadow-xs">
          <span className="text-[11px] font-bold text-sky-800">{t('Sedang Ditinjau', 'Sedang Ditinjau')}</span>
          <div className="text-2xl font-black text-sky-900 mt-1">{stats.ditinjauCount}</div>
          <span className="text-[10px] text-sky-700 font-medium">{t('Dalam proses evaluasi', 'Dalam proses evaluasi')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800">{t('Ditindaklanjuti', 'Ditindaklanjuti')}</span>
          <div className="text-2xl font-black text-emerald-900 mt-1">{stats.ditindaklanjutiCount}</div>
          <span className="text-[10px] text-emerald-700 font-medium">{t('Selesai dieksekusi', 'Selesai dieksekusi')}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs col-span-2 lg:col-span-1">
          <span className="text-[11px] font-semibold text-slate-500">{t('Rata-rata Rating', 'Rata-rata Rating')}</span>
          <div className="text-2xl font-black text-slate-900 mt-1 flex items-center gap-1">
            <span>{stats.avgRating}</span>
            <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
          </div>
          <span className="text-[10px] text-slate-400">{t('Skala kepuasan 1-5', 'Skala kepuasan 1-5')}</span>
        </div>
      </div>

      {/* Filter & Multi-Select Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'ALL', label: `Semua (${stats.total})` },
            { id: 'Baru', label: `Baru (${stats.baruCount})` },
            { id: 'Ditinjau', label: `Ditinjau (${stats.ditinjauCount})` },
            { id: 'Ditindaklanjuti', label: `Ditindaklanjuti (${stats.ditindaklanjutiCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search & Category Filter */}
        <div className="flex flex-wrap items-center gap-2">
          {categories.length > 0 && (
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            >
              <option value="ALL">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari guru, NIP, atau isi saran..."
              className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      <AnimatePresence>
        {selectedFeedbackIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-slate-900 text-white rounded-3xl shadow-xl border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-sm">
                {selectedFeedbackIds.size}
              </span>
              <div>
                <span className="text-xs font-bold text-white block">
                  {selectedFeedbackIds.size} Masukan Terpilih
                </span>
                <span className="text-[11px] text-slate-400">
                  Siap dirangkai dengan AI Generator atau diperbarui serentak
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleOpenSynthesizer}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-sky-500 hover:from-indigo-600 hover:to-sky-600 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Rangkai ({selectedFeedbackIds.size}) Masukan dengan AI</span>
              </button>

              <button
                type="button"
                onClick={() => handleBatchMarkAs('Ditindaklanjuti')}
                className="flex items-center gap-1 px-3 py-2 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Tandai 'Ditindaklanjuti'</span>
              </button>

              <button
                type="button"
                onClick={handleBatchDelete}
                className="p-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                title="Hapus Terpilih"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedFeedbackIds(new Set())}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Select All Toolbar */}
      {filteredFeedbacks.length > 0 && (
        <div className="flex items-center justify-between px-2 py-1 text-xs text-slate-500 font-semibold">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selectedFeedbackIds.size === filteredFeedbacks.length && filteredFeedbacks.length > 0}
              onChange={handleToggleSelectAll}
              className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
            <span>Pilih Semua Masukan yang Ditampilkan ({filteredFeedbacks.length})</span>
          </label>
          <span className="text-[11px] text-slate-400">
            {selectedFeedbackIds.size} terpilih
          </span>
        </div>
      )}

      {/* Feedback Feed List */}
      {filteredFeedbacks.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 space-y-2 shadow-xs">
          <Inbox className="w-10 h-10 mx-auto text-slate-300" />
          <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Masukan</h4>
          <p className="text-xs text-slate-400">
            {searchQuery || selectedCategory !== 'ALL' || activeTab !== 'ALL'
              ? 'Tidak ditemukan feedback yang sesuai filter pencarian.'
              : 'Belum ada guru yang mengirimkan umpan balik ke sistem.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredFeedbacks.map((fb) => {
            const isSelected = selectedFeedbackIds.has(fb.id);

            return (
              <div
                key={fb.id}
                className={`p-5 rounded-3xl bg-white border transition-all shadow-xs space-y-3.5 relative ${
                  isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/10'
                    : fb.status === 'Baru'
                    ? 'border-amber-300 bg-amber-50/15 ring-1 ring-amber-200'
                    : 'border-slate-200 hover:border-indigo-200'
                }`}
              >
                {/* Card Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(fb.id)}
                      className="w-4 h-4 rounded text-indigo-600 accent-indigo-600 focus:ring-indigo-500 cursor-pointer shrink-0"
                    />
                    <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900 text-sm">{fb.teacherName}</h4>
                        {fb.rating && (
                          <span className="flex items-center gap-1 text-amber-600 font-bold text-xs bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                            <span>{fb.rating} / 5</span>
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        NIP: {fb.teacherNip || '-'} • Mapel: {formatMataPelajaran(fb.mataPelajaran)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {fb.kategori}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        fb.status === 'Ditindaklanjuti'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : fb.status === 'Ditinjau'
                          ? 'bg-sky-100 text-sky-800 border border-sky-300'
                          : 'bg-amber-100 text-amber-900 border border-amber-300 font-black'
                      }`}
                    >
                      {fb.status === 'Ditindaklanjuti' && 'Selesai Ditindaklanjuti'}
                      {fb.status === 'Ditinjau' && 'Sedang Ditinjau'}
                      {fb.status === 'Baru' && 'Masukan Baru'}
                    </span>
                  </div>
                </div>

                {/* Title & Body */}
                <div>
                  <h3 className="font-bold text-slate-900 text-sm mb-1.5">{fb.judul}</h3>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                    {fb.pesan}
                  </div>
                </div>

                {/* Administrator Note if exists */}
                {fb.adminNote && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-xs text-indigo-950 space-y-1">
                    <div className="font-bold text-[11px] text-indigo-900 flex items-center gap-1.5 uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Tanggapan / Catatan Tindak Lanjut Administrator:</span>
                    </div>
                    <p className="leading-relaxed">{fb.adminNote}</p>
                  </div>
                )}

                {/* Card Footer Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs">
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>
                      Dikirim pada:{' '}
                      {new Date(fb.createdAt).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenReplyModal(fb)}
                      className="flex items-center gap-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Tindak Lanjut & Balas</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteFeedback(fb.id)}
                      className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer transition-colors"
                      title="Hapus Feedback"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Feedback Synthesizer & Prompt Generator Modal */}
      <AnimatePresence>
        {isSynthesizerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 text-slate-800 space-y-5 my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
                    <Sparkles className="w-6 h-6 text-amber-300" />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <span>Rangkai Tanggapan Pengguna (AI Generator)</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                        Gemini 2.5 Flash
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Sintesis masukan guru & hasilkan prompt arahan perbaikan siap pakai untuk AI Studio Build.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsSynthesizerOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body (Scrollable) */}
              <div className="space-y-4 overflow-y-auto pr-1 flex-1 min-h-0 overscroll-contain">
                {/* Source Feedbacks Indicator */}
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Sumber Tanggapan dari Database:</span>
                    </span>
                    <span className="text-[11px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                      {selectedFeedbackIds.size > 0
                        ? `${selectedFeedbackIds.size} Masukan Terpilih`
                        : `${feedbacks.length} Total Masukan Guru`}
                    </span>
                  </div>

                  {selectedFeedbackIds.size > 0 ? (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                      {feedbacks
                        .filter((f) => selectedFeedbackIds.has(f.id))
                        .map((f) => (
                          <span
                            key={f.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            <strong>{f.teacherName}:</strong> {f.judul}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">
                      Seluruh {feedbacks.length} masukan pada database akan otomatis diikutsertakan. (Atau Anda bisa mencentang masukan tertentu di tabel sebelum membuka menu ini).
                    </p>
                  )}
                </div>

                {/* Additional Manual Notes Textarea */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>Tambah Masukan / Catatan Pengguna Lainnya (Opsional)</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Bisa tempel chat WA, hasil rapat guru, atau catatan lisan
                    </span>
                  </label>
                  <textarea
                    rows={3}
                    value={manualUserNotes}
                    onChange={(e) => setManualUserNotes(e.target.value)}
                    placeholder="Contoh: Beberapa guru matematika meminta agar tampilan rumus LaTeX pada soal ASTS diperbesar. Guru bahasa Inggris meminta format tabel diperjelas saat diekspor ke Word."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Generate Button */}
                <button
                  type="button"
                  disabled={isGeneratingSynthesis}
                  onClick={handleRunAiSynthesis}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 via-sky-600 to-indigo-700 hover:from-indigo-700 hover:to-sky-700 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98 disabled:opacity-60"
                >
                  {isGeneratingSynthesis ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Sedang Merangkai & Menganalisis Tanggapan dengan Gemini AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{synthesisResult ? 'Generate Ulang Rangkuman & Prompt' : 'Mulai Rangkai & Generate Arahan Perbaikan AI'}</span>
                    </>
                  )}
                </button>

                {/* Result Display Section */}
                {synthesisResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4 pt-3 border-t border-slate-200"
                  >
                    {/* Executive Summary Box */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white shadow-md space-y-1.5">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-wider">
                        <Sparkles className="w-4 h-4" />
                        <span>Ringkasan Kebutuhan Utama Pengguna:</span>
                      </div>
                      <p className="text-xs text-slate-100 leading-relaxed font-medium">
                        {synthesisResult.executiveSummary}
                      </p>
                    </div>

                    {/* AI Prompt Directive Box (The core feature requested by user) */}
                    <div className="p-4 rounded-2xl bg-slate-900 border-2 border-indigo-500/50 shadow-xl space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                          <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">
                            Prompt Siap Pakai untuk AI Studio Build (Bahan Perbaikan):
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyPromptToClipboard}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm ${
                            copiedPrompt
                              ? 'bg-emerald-500 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95'
                          }`}
                        >
                          {copiedPrompt ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-white" />
                              <span>Tersalin! Siap Ditempel</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-amber-300" />
                              <span>Salin Prompt Perbaikan</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap select-all">
                        {synthesisResult.aiPromptDirective}
                      </div>

                      <p className="text-[11px] text-slate-400 flex items-center gap-1">
                        <ArrowRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>Klik tombol <strong>"Salin Prompt Perbaikan"</strong> di atas, lalu tempelkan (paste) langsung ke kolom obrolan ini untuk mengeksekusi perbaikan sistem.</span>
                      </p>
                    </div>

                    {/* Categorized Key Insights */}
                    {synthesisResult.keyInsights && synthesisResult.keyInsights.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <ListChecks className="w-4 h-4 text-indigo-600" />
                          <span>Temuan Masalah & Rekomendasi Solusi Teknis:</span>
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                          {synthesisResult.keyInsights.map((insight, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1.5 flex flex-col justify-between"
                            >
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-800">
                                    {insight.category}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      insight.urgency === 'Tinggi'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    Urgensi: {insight.urgency}
                                  </span>
                                </div>
                                <div className="font-bold text-slate-900 text-xs leading-snug">
                                  {insight.issue}
                                </div>
                                {insight.requestedBy && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Disampaikan oleh: {insight.requestedBy}
                                  </div>
                                )}
                              </div>

                              <div className="p-2 rounded-xl bg-white border border-slate-100 text-[11px] text-slate-700">
                                <span className="font-bold text-indigo-700 block mb-0.5">Solusi Teknis:</span>
                                {insight.solution}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Roadmap */}
                    {synthesisResult.actionRoadmap && synthesisResult.actionRoadmap.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Rencana Langkah Perbaikan Sistem:</span>
                        </h4>
                        <div className="space-y-1.5">
                          {synthesisResult.actionRoadmap.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white rounded-xl border border-slate-200 text-xs flex items-start gap-2.5 shadow-2xs"
                            >
                              <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                                {item.stepNumber || idx + 1}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-slate-900">{item.title}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                    {item.priority}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
                <span className="text-[11px] text-slate-400">
                  Ditenagai oleh Gemini 2.5 Flash Ultra-Fast
                </span>
                <div className="flex items-center gap-2">
                  {synthesisResult && (
                    <button
                      type="button"
                      onClick={handleCopyPromptToClipboard}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-amber-300" />
                      <span>{copiedPrompt ? 'Prompt Tersalin' : 'Salin Prompt'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsSynthesizerOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Administrator Single Reply & Status Modal */}
      <AnimatePresence>
        {selectedFeedbackForReply && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 text-slate-800 space-y-4 my-auto max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Tindak Lanjut Umpan Balik Guru
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pengirim: <strong className="text-slate-800 font-bold">{selectedFeedbackForReply.teacherName}</strong>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedFeedbackForReply(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-800">{selectedFeedbackForReply.judul}</div>
                <div className="text-slate-600 line-clamp-3 text-[11px] leading-relaxed">
                  "{selectedFeedbackForReply.pesan}"
                </div>
              </div>

              <form onSubmit={handleSaveReply} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Perbarui Status Evaluasi
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Baru', 'Ditinjau', 'Ditindaklanjuti'] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setReplyStatus(st)}
                        className={`py-2 px-2.5 rounded-xl font-bold text-center transition-all cursor-pointer ${
                          replyStatus === st
                            ? st === 'Ditindaklanjuti'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : st === 'Ditinjau'
                              ? 'bg-sky-600 text-white shadow-xs'
                              : 'bg-amber-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Catatan Tindak Lanjut / Jawaban untuk Guru
                  </label>
                  <textarea
                    rows={4}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Tuliskan konfirmasi, pembaruan fitur yang telah disesuaikan, atau tanggapan apresiasi untuk guru terkait..."
                    className="w-full p-3 bg-white border border-slate-300 rounded-2xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Catatan ini akan langsung dapat dibaca oleh guru pada menu Riwayat Masukan di akun mereka.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedFeedbackForReply(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-md cursor-pointer transition-all"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Modal Konfirmasi Reset Umpan Balik */}
        {isResetConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4 my-auto max-h-[calc(100dvh-2rem)] flex flex-col overflow-y-auto"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Reset Umpan Balik ke Semula
                  </h3>
                  <p className="text-xs text-slate-500">
                    Konfirmasi pembersihan seluruh data masukan guru
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 text-xs text-rose-900 leading-relaxed">
                Tindakan ini akan <strong>mengosongkan dan mereset seluruh data umpan balik guru</strong> yang tersimpan di sistem dan database Cloud. Halaman feedback akan kembali bersih seperti semula.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => setIsResetConfirmOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={handleResetAllFeedbacks}
                  className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/30 cursor-pointer transition-all"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sedang Mereset...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Ya, Reset ke Semula</span>
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

