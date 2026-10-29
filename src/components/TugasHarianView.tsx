import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Calendar,
  Users,
  Award,
  Sparkles,
  Download,
  Trash2,
  Edit3,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BarChart2,
  Check,
  X,
  Send,
  Bot,
  Lock,
  LockOpen,
  ShieldCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { QuestionFormattingToolbar } from './QuestionFormattingToolbar';

interface TugasItem {
  id: string;
  judul: string;
  mataPelajaran: string;
  kelas: string;
  fase: 'Fase E' | 'Fase F';
  jenisFormatif: 'Latihan Mandiri' | 'Proyek Kelompok' | 'Kuis Cepat' | 'Portofolio' | 'Refleksi Diri';
  tenggatWaktu: string;
  deskripsi: string;
  dimensiDeepLearning: string[];
  maxScore: number;
  totalSubmissions: number;
  totalSiswa: number;
  avgScore?: number;
  createdAt: string;
}

const DEFAULT_TUGAS: TugasItem[] = [
  {
    id: 'tgs-1',
    judul: 'Laporan Hasil Observasi Lingkungan Sekolah (Deep Learning)',
    mataPelajaran: 'Bahasa Indonesia',
    kelas: 'X-1',
    fase: 'Fase E',
    jenisFormatif: 'Portofolio',
    tenggatWaktu: '2026-10-25',
    deskripsi: 'Menyusun teks LHO dengan mengamati ekosistem kebun sains sekolah, menerapkan struktur deskripsi umum dan manfaat secara objektif.',
    dimensiDeepLearning: ['Berpikir Kritis', 'Komunikasi', 'Kreativitas'],
    maxScore: 100,
    totalSubmissions: 32,
    totalSiswa: 36,
    avgScore: 84.5,
    createdAt: '2026-10-10',
  },
  {
    id: 'tgs-2',
    judul: 'Eksplorasi Pemodelan Fungsi Kuadrat & Gerak Parabola',
    mataPelajaran: 'Matematika',
    kelas: 'X-2',
    fase: 'Fase E',
    jenisFormatif: 'Latihan Mandiri',
    tenggatWaktu: '2026-10-28',
    deskripsi: 'Menentukan titik optimum dan lintasan maksimum lemparan bola basket menggunakan formula kuadratik kontekstual.',
    dimensiDeepLearning: ['Penalaran Kritis', 'Kolaborasi'],
    maxScore: 100,
    totalSubmissions: 28,
    totalSiswa: 35,
    avgScore: 78.2,
    createdAt: '2026-10-12',
  },
  {
    id: 'tgs-3',
    judul: 'Mini Riset Dampak Sosial Informatika & Etika Kecerdasan Buatan',
    mataPelajaran: 'Informatika',
    kelas: 'XI-1',
    fase: 'Fase F',
    jenisFormatif: 'Proyek Kelompok',
    tenggatWaktu: '2026-11-05',
    deskripsi: 'Analisis studi kasus bias algoritma dan integritas digital dalam penyusunan tugas akademik sekolah.',
    dimensiDeepLearning: ['Kewarganegaraan Global', 'Karakter', 'Kolaborasi'],
    maxScore: 100,
    totalSubmissions: 18,
    totalSiswa: 36,
    avgScore: 88.0,
    createdAt: '2026-10-14',
  },
];

export const TugasHarianView: React.FC = () => {
  const { state, currentUser, showToast, updateSchoolInfo, setSelectedModule, setCurrentView } = useApp();
  const { t } = useLanguage();

  const isAdmin = currentUser?.role === 'admin';
  const isLocked = state.schoolInfo?.formatifLocked ?? true;

  const [tugasList, setTugasList] = useState<TugasItem[]>(() => {
    const saved = localStorage.getItem('smantri_tugas_harian_list');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return DEFAULT_TUGAS;
  });

  const [activeTab, setActiveTab] = useState<'daftar' | 'penilaian' | 'rubrik'>('daftar');
  const [selectedMapelFilter, setSelectedMapelFilter] = useState<string>('ALL');
  const [selectedKelasFilter, setSelectedKelasFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal create tugas state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newJudul, setNewJudul] = useState('');
  const [newMapel, setNewMapel] = useState(currentUser?.mataPelajaran?.[0] || 'Bahasa Indonesia');
  const [newKelas, setNewKelas] = useState('X-1');
  const [newJenis, setNewJenis] = useState<'Latihan Mandiri' | 'Proyek Kelompok' | 'Kuis Cepat' | 'Portofolio' | 'Refleksi Diri'>('Latihan Mandiri');
  const [newTenggat, setNewTenggat] = useState('');
  const [newDeskripsi, setNewDeskripsi] = useState('');
  const [selectedDimensi, setSelectedDimensi] = useState<string[]>(['Berpikir Kritis', 'Kreativitas']);

  // Selected tugas for grading preview
  const [selectedTugasForGrading, setSelectedTugasForGrading] = useState<TugasItem | null>(null);

  const availableMapel = Array.from(new Set(state.subjects?.map((s) => s.nama) || ['Bahasa Indonesia', 'Matematika', 'Informatika', 'Bahasa Inggris', 'Biologi', 'Fisika', 'Kimia']));
  const availableKelas = state.classes?.map((c) => c.nama) || ['X-1', 'X-2', 'X-3', 'XI-1', 'XI-2', 'XII-1'];

  const filteredTugas = tugasList.filter((item) => {
    const matchesMapel = selectedMapelFilter === 'ALL' || item.mataPelajaran === selectedMapelFilter;
    const matchesKelas = selectedKelasFilter === 'ALL' || item.kelas === selectedKelasFilter;
    const matchesSearch = !searchQuery || item.judul.toLowerCase().includes(searchQuery.toLowerCase()) || item.deskripsi.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesMapel && matchesKelas && matchesSearch;
  });

  const handleCreateTugas = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJudul.trim()) {
      showToast('Peringatan', 'Judul tugas wajib diisi!', 'warning');
      return;
    }

    const created: TugasItem = {
      id: `tgs-${Date.now()}`,
      judul: newJudul.trim(),
      mataPelajaran: newMapel,
      kelas: newKelas,
      fase: newKelas.startsWith('X-') ? 'Fase E' : 'Fase F',
      jenisFormatif: newJenis,
      tenggatWaktu: newTenggat || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      deskripsi: newDeskripsi.trim() || 'Kerjakan tugas sesuai petunjuk instruksional pembelajaran mendalam.',
      dimensiDeepLearning: selectedDimensi,
      maxScore: 100,
      totalSubmissions: 0,
      totalSiswa: state.students?.filter((s) => s.kelas === newKelas).length || 36,
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [created, ...tugasList];
    setTugasList(updated);
    localStorage.setItem('smantri_tugas_harian_list', JSON.stringify(updated));
    setIsCreateModalOpen(false);

    // Reset form
    setNewJudul('');
    setNewDeskripsi('');
    showToast('Tugas Baru Dibuat', `Tugas "${created.judul}" berhasil dipublikasikan untuk kelas ${created.kelas}.`, 'success');
  };

  const handleDeleteTugas = (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus tugas formatif ini?')) {
      const updated = tugasList.filter((t) => t.id !== id);
      setTugasList(updated);
      localStorage.setItem('smantri_tugas_harian_list', JSON.stringify(updated));
      showToast('Dihapus', 'Tugas formatif berhasil dihapus.', 'info');
    }
  };

  const handleExportExcel = () => {
    const dataToExport = filteredTugas.map((t, idx) => ({
      No: idx + 1,
      'Judul Tugas': t.judul,
      'Mata Pelajaran': t.mataPelajaran,
      Kelas: t.kelas,
      'Jenis Formatif': t.jenisFormatif,
      'Tenggat Waktu': t.tenggatWaktu,
      'Dimensi Deep Learning': t.dimensiDeepLearning.join(', '),
      'Pengumpulan / Total': `${t.totalSubmissions} / ${t.totalSiswa}`,
      'Rata-rata Nilai': t.avgScore || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Tugas Formatif');
    XLSX.writeFile(wb, `Rekap_Tugas_Formatif_SMANTRI_${new Date().toISOString().split('T')[0]}.xlsx`);
    showToast('Ekspor Berhasil', 'Rekap tugas harian berhasil diunduh dalam format Excel.', 'success');
  };

  const toggleDimensi = (dim: string) => {
    setSelectedDimensi((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]
    );
  };

  const DIMENSI_LIST = [
    'Berpikir Kritis',
    'Kreativitas',
    'Komunikasi',
    'Kolaborasi',
    'Karakter Mandiri',
    'Kewarganegaraan Global',
    'Penalaran Kritis',
    'Kesadaran Diri',
  ];

  if (!isAdmin && isLocked) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl w-full bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-300 shadow-xl space-y-5 text-center text-slate-800 my-auto"
        >
          <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-800 border-2 border-amber-300 flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-8 h-8 text-amber-700" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-300 inline-block shadow-2xs">
              AKSES TERKUNCI SEMENTARA
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
              Modul Tugas Formatif Sedang Dalam Pengembangan
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Sistem Informasi Akademik SMAN 3 Tumijajar
            </p>
          </div>

          <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200 text-left space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Pemberitahuan Resmi Administrator:</span>
            </div>
            <p className="text-xs text-amber-950 font-semibold leading-relaxed">
              "{state.schoolInfo?.formatifLockReason || 'Modul Tugas Formatif saat ini sedang dalam proses pengembangan & penyempurnaan via prompt oleh Administrator. Modul akan dibuka setelah seluruh sistem tugas formatif siap digunakan.'}"
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left space-y-2 text-xs">
            <span className="font-bold text-slate-800 block">Informasi Kebijakan Akses:</span>
            <p className="text-slate-600 leading-relaxed text-[11.5px]">
              Menu dan fitur tugas formatif saat ini terkunci khusus bagi akun <strong>Operator Sekolah</strong>, <strong>Guru Mapel</strong>, dan <strong>Kepala Sekolah</strong> demi menjaga integritas data dan konsistensi penilaian selama penyesuaian sistem berlangsung via prompt.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setSelectedModule('portal');
                setCurrentView('dashboard');
              }}
              className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Kembali ke Beranda Asesmen</span>
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Admin Formatif Control Bar */}
      {isAdmin && (
        <div className="p-4 rounded-2xl border-2 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white border-amber-400 shadow-md">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl shrink-0 ${isLocked ? 'bg-amber-500 text-slate-950' : 'bg-emerald-500 text-white'}`}>
              {isLocked ? <Lock className="w-5 h-5 stroke-[2.5]" /> : <LockOpen className="w-5 h-5 stroke-[2.5]" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                  KONTROL PENGATURAN ADMIN
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                  isLocked ? 'bg-amber-400/20 text-amber-300 border-amber-400/50' : 'bg-emerald-400/20 text-emerald-300 border-emerald-400/50'
                }`}>
                  {isLocked ? 'TERKUNCI UNTUK GURU & KEPSEK' : 'TERBUKA UNTUK SEMUA GURU'}
                </span>
              </div>
              <h4 className="font-extrabold text-sm text-white mt-0.5">
                Kunci Tombol &amp; Akses Modul Formatif (Dev Mode Aktif)
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {isLocked
                  ? 'Guru Mapel, Operator, dan Kepsek saat ini melihat status terkunci. Anda leluasa menguji & mengembangkan via prompt.'
                  : 'Sistem formatif telah dibuka untuk seluruh akun guru, operator, dan kepala sekolah.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={async () => {
                const nextState = !isLocked;
                await updateSchoolInfo({
                  formatifLocked: nextState,
                  formatifLockReason: state.schoolInfo?.formatifLockReason || 'Modul Tugas Formatif saat ini sedang dalam proses pengembangan & penyempurnaan via prompt oleh Administrator. Modul akan dibuka setelah seluruh sistem tugas formatif siap digunakan.',
                });
                showToast(
                  nextState ? 'Modul Formatif Dikunci!' : 'Modul Formatif Dibuka!',
                  nextState
                    ? 'Akses Tugas Formatif dikunci untuk Guru, Operator, dan Kepsek. Admin tetap leluasa mengelola via prompt.'
                    : 'Modul Tugas Formatif sekarang aktif dan dapat diakses oleh seluruh guru, operator, dan pengelola sekolah.',
                  nextState ? 'warning' : 'success'
                );
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black shadow-md transition-all flex items-center gap-2 cursor-pointer active:scale-95 ${
                isLocked
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
              }`}
            >
              {isLocked ? (
                <>
                  <LockOpen className="w-4 h-4 stroke-[2.5]" />
                  <span>Buka Akses Guru &amp; Kepsek</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4 stroke-[2.5]" />
                  <span>Kunci Modul Kembali</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Top Banner Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-600 via-orange-600 to-indigo-700 p-6 sm:p-8 text-white shadow-xl shadow-amber-900/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-amber-100 text-xs font-bold border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Modul Tugas Harian &amp; Asesmen Formatif</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300" />
              <span>Kurikulum Merdeka (Deep Learning)</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Tugas Harian &amp; Portofolio Siswa
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 leading-relaxed">
              Pusat perancangan tugas formatif berkala, pemantauan pengumpulan tugas siswa, asesmen berbasis rubrik 8 Dimensi Pembelajaran Mendalam, dan analisis progres capaian belajar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-amber-50 text-slate-900 font-extrabold text-xs shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-600" />
              <span>Buat Tugas Baru</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-900/90 text-white font-bold text-xs border border-white/20 backdrop-blur-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-amber-300" />
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Statistics Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Tugas Formatif</div>
            <div className="text-xl font-black text-slate-900">{tugasList.length} Tugas</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Rerata Ketuntasan</div>
            <div className="text-xl font-black text-emerald-600">
              {Math.round(
                (tugasList.reduce((acc, t) => acc + (t.totalSubmissions / Math.max(t.totalSiswa, 1)), 0) / Math.max(tugasList.length, 1)) * 100
              )}%
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Rerata Nilai Tugas</div>
            <div className="text-xl font-black text-indigo-700">
              {(
                tugasList.filter((t) => t.avgScore).reduce((acc, t) => acc + (t.avgScore || 0), 0) /
                Math.max(tugasList.filter((t) => t.avgScore).length, 1)
              ).toFixed(1)}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 border border-purple-200 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Dimensi Deep Learning</div>
            <div className="text-xl font-black text-purple-700">8 Dimensi</div>
          </div>
        </div>
      </div>

      {/* Filter and Navigation Tabs Bar */}
      <div className="p-3 rounded-2xl bg-white border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Navigation Pill Switcher */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-xs font-bold w-fit">
            <button
              onClick={() => setActiveTab('daftar')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'daftar'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Daftar Tugas Harian ({filteredTugas.length})
            </button>
            <button
              onClick={() => setActiveTab('penilaian')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'penilaian'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rekap &amp; Penilaian Siswa
            </button>
            <button
              onClick={() => setActiveTab('rubrik')}
              className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === 'rubrik'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Panduan Rubrik Deep Learning
            </button>
          </div>

          {/* Search Field */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari tugas atau petunjuk..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-semibold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filter:</span>
          </span>

          <select
            value={selectedMapelFilter}
            onChange={(e) => setSelectedMapelFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden"
          >
            <option value="ALL">Semua Mata Pelajaran</option>
            {availableMapel.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={selectedKelasFilter}
            onChange={(e) => setSelectedKelasFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 cursor-pointer focus:outline-hidden"
          >
            <option value="ALL">Semua Rombel Kelas</option>
            {availableKelas.map((k) => (
              <option key={k} value={k}>
                Kelas {k}
              </option>
            ))}
          </select>

          {(selectedMapelFilter !== 'ALL' || selectedKelasFilter !== 'ALL' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedMapelFilter('ALL');
                setSelectedKelasFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-rose-600 hover:underline cursor-pointer ml-auto"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'daftar' && (
        <div className="space-y-4">
          {filteredTugas.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">Belum Ada Tugas Formatif Sesuai Filter</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Silakan buat penugasan harian baru dengan tombol "Buat Tugas Baru" di atas untuk memulai evaluasi formatif.
              </p>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Tugas Sekarang</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredTugas.map((tugas) => {
                const submissionRate = Math.round((tugas.totalSubmissions / Math.max(tugas.totalSiswa, 1)) * 100);

                return (
                  <div
                    key={tugas.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-400 hover:shadow-lg transition-all flex flex-col justify-between group space-y-4 shadow-xs"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="px-2 py-0.5 rounded-lg text-[10.5px] font-black bg-amber-50 text-amber-800 border border-amber-200">
                          {tugas.mataPelajaran}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Kelas {tugas.kelas}
                          </span>
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {tugas.jenisFormatif}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-extrabold text-sm text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                        {tugas.judul}
                      </h3>

                      <p className="text-xs text-slate-500 font-medium mt-1.5 line-clamp-2 leading-relaxed">
                        {tugas.deskripsi}
                      </p>

                      {/* Dimensi Deep Learning Badges */}
                      <div className="flex flex-wrap gap-1 mt-3">
                        {tugas.dimensiDeepLearning.map((dim) => (
                          <span
                            key={dim}
                            className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60"
                          >
                            {dim}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      {/* Submission Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                          <span className="text-slate-600 flex items-center gap-1">
                            <Users className="w-3 h-3 text-slate-400" />
                            <span>Pengumpulan: {tugas.totalSubmissions}/{tugas.totalSiswa} Siswa</span>
                          </span>
                          <span className={submissionRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}>
                            {submissionRate}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/80">
                          <div
                            className={`h-full rounded-full transition-all ${
                              submissionRate >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                            style={{ width: `${submissionRate}%` }}
                          />
                        </div>
                      </div>

                      {/* Info Tenggat & Action */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Tenggat: {tugas.tenggatWaktu}</span>
                        </span>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedTugasForGrading(tugas);
                              setActiveTab('penilaian');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-700 text-xs font-bold transition-all cursor-pointer"
                          >
                            Lihat Siswa
                          </button>
                          <button
                            onClick={() => handleDeleteTugas(tugas.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Hapus Tugas"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Penilaian & Rekap Siswa */}
      {activeTab === 'penilaian' && (
        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Rekapitulasi Penilaian Formatif Siswa
              </h3>
              <p className="text-xs text-slate-500">
                {selectedTugasForGrading
                  ? `Menampilkan penilaian untuk: "${selectedTugasForGrading.judul}" (Kelas ${selectedTugasForGrading.kelas})`
                  : 'Pilih tugas di daftar atau pantau seluruh capaian formatif per rombel.'}
              </p>
            </div>

            {selectedTugasForGrading && (
              <button
                onClick={() => setSelectedTugasForGrading(null)}
                className="text-xs font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Lihat Semua Tugas
              </button>
            )}
          </div>

          {/* Roster Siswa Table Sample */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-extrabold border-b border-slate-200 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">NISN</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Status Pengumpulan</th>
                  <th className="py-3 px-4">Nilai Formatif</th>
                  <th className="py-3 px-4">Catatan Guru &amp; AI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {(state.students || [])
                  .filter((s) => !selectedTugasForGrading || s.kelas === selectedTugasForGrading.kelas)
                  .slice(0, 15)
                  .map((student, idx) => {
                    const sampleScore = 75 + ((idx * 7) % 25);
                    const isSubmitted = idx % 5 !== 4;

                    return (
                      <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-4 font-bold text-slate-500">{idx + 1}</td>
                        <td className="py-2.5 px-4 font-bold text-slate-900">{student.nama}</td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-500">{student.nisn || '-'}</td>
                        <td className="py-2.5 px-4">{student.kelas}</td>
                        <td className="py-2.5 px-4">
                          {isSubmitted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              Sudah Dinilai
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Belum Mengumpulkan
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4">
                          {isSubmitted ? (
                            <span className="font-extrabold text-sm text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                              {sampleScore}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-bold">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                          {isSubmitted
                            ? 'Mampu menganalisis fenomena secara kritis dan terstruktur.'
                            : 'Diingatkan melalui ketua kelas untuk penyerahan portofolio.'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Panduan Rubrik Deep Learning */}
      {activeTab === 'rubrik' && (
        <div className="p-6 bg-white rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 inline-block mb-1">
              Panduan Resmi Kemendikdasmen RI
            </span>
            <h3 className="text-lg font-black text-slate-900">
              Integrasi Rubrik 8 Dimensi Pembelajaran Mendalam (Deep Learning)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tugas formatif tidak sekadar mengukur hafalan rumus atau teks, melainkan mengasah kompetensi holistik siswa:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { dim: 'Berpikir Kritis', desc: 'Kemampuan menganalisis informasi, mengevaluasi bukti, dan menarik kesimpulan logis secara mandiri.' },
              { dim: 'Kreativitas', desc: 'Menghasilkan gagasan orisinal, solusi inovatif, dan ekspresi bermakna dalam pemecahan masalah.' },
              { dim: 'Komunikasi', desc: 'Menyampaikan gagasan secara efektif baik lisan, tulisan, maupun visual dengan argumen runtut.' },
              { dim: 'Kolaborasi', desc: 'Bekerja sama secara sinergis dalam kelompok, menghargai perbedaan, dan mencapai tujuan bersama.' },
              { dim: 'Karakter Mandiri', desc: 'Ketekunan, integritas akademik, disiplin pengerjaan, dan kesadaran etika dalam berkarya.' },
              { dim: 'Kewarganegaraan Global', desc: 'Kepedulian terhadap isu lingkungan, sosial, dan kontribusi nyata bagi masyarakat.' },
              { dim: 'Penalaran Kritis', desc: 'Mengaitkan konsep abstrak mata pelajaran dengan konteks kehidupan sehari-hari.' },
              { dim: 'Kesadaran Diri (Metakognisi)', desc: 'Mampu merefleksikan kelemahan dan kekuatan diri dalam proses belajar berkelanjutan.' },
            ].map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-xs">
                  {idx + 1}
                </span>
                <h4 className="font-extrabold text-xs text-slate-900">{item.dim}</h4>
                <p className="text-[11px] text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Buat Tugas Formatif Baru */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto"
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500 text-white">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-slate-900">Buat Tugas Formatif Baru</h3>
                    <p className="text-[11px] text-slate-500">Isi rincian penugasan harian dan dimensi pembelajaran.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateTugas} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <div className="p-5 space-y-4 text-xs flex-1 min-h-0 overflow-y-auto overscroll-contain">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Judul Tugas / Evaluasi Formatif</label>
                  <input
                    type="text"
                    required
                    value={newJudul}
                    onChange={(e) => setNewJudul(e.target.value)}
                    placeholder="Contoh: Laporan Eksplorasi Ekosistem Sains (Deep Learning)..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                    <select
                      value={newMapel}
                      onChange={(e) => setNewMapel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900 cursor-pointer focus:outline-hidden"
                    >
                      {availableMapel.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Kelas / Rombel</label>
                    <select
                      value={newKelas}
                      onChange={(e) => setNewKelas(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900 cursor-pointer focus:outline-hidden"
                    >
                      {availableKelas.map((k) => (
                        <option key={k} value={k}>
                          Kelas {k}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jenis Formatif</label>
                    <select
                      value={newJenis}
                      onChange={(e) => setNewJenis(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900 cursor-pointer focus:outline-hidden"
                    >
                      <option value="Latihan Mandiri">Latihan Mandiri</option>
                      <option value="Proyek Kelompok">Proyek Kelompok</option>
                      <option value="Kuis Cepat">Kuis Cepat</option>
                      <option value="Portofolio">Portofolio</option>
                      <option value="Refleksi Diri">Refleksi Diri</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tenggat Waktu</label>
                    <input
                      type="date"
                      value={newTenggat}
                      onChange={(e) => setNewTenggat(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-900 cursor-pointer focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700 text-xs">Deskripsi / Petunjuk Pengerjaan</label>
                  <QuestionFormattingToolbar
                    value={newDeskripsi}
                    onChange={(newVal) => setNewDeskripsi(newVal)}
                    placeholder="Tuliskan petunjuk pengerjaan dan kriteria penilaian (bisa diformat tebal Ctrl+B, miring Ctrl+I, garis bawah Ctrl+U, nomor berurutan 1., a., (1), (a), dan rumus/simbol)..."
                    minHeight="80px"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1.5">
                    Dimensi Pembelajaran Mendalam (Pilih yang relevan)
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DIMENSI_LIST.map((dim) => {
                      const isSelected = selectedDimensi.includes(dim);
                      return (
                        <button
                          key={dim}
                          type="button"
                          onClick={() => toggleDimensi(dim)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                          <span>{dim}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-all cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black shadow-md transition-all cursor-pointer active:scale-95"
                  >
                    Publikasikan Tugas
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
