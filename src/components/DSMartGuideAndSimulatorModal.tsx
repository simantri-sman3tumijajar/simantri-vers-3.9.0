import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  ShieldAlert,
  Smartphone,
  Printer,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Eye,
  BarChart3,
  Home,
  ChevronDown,
  ChevronUp,
  FileText,
  Lock,
  Unlock,
  Users,
  Award,
  Layers,
  ArrowRight,
  ExternalLink,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_DSMART_SAMPLE_RESULT } from '../utils/dsmartHelper';

interface DSMartGuideAndSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DSMartGuideAndSimulatorModal: React.FC<DSMartGuideAndSimulatorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { state, showToast, setCurrentView, setSelectedModule } = useApp();
  const school = state.schoolInfo;

  const [activeTab, setActiveTab] = useState<'SECURITY_AND_CARD' | 'FINAL_RESULT' | 'ATTENDANCE_F4'>('SECURITY_AND_CARD');
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const [activeDetailView, setActiveDetailView] = useState<'NONE' | 'PREVIEW' | 'ANALYSIS'>('NONE');

  // Interactive Proctor Reset Simulation State
  const [proctorSimStudents, setProctorSimStudents] = useState([
    {
      id: 'sim-1',
      name: 'NABILA ZAHRA ZAIN',
      nisn: '3091110048',
      noPeserta: '69955116-2026-0327',
      class: '11.3',
      violations: 3,
      logouts: 3,
      isBlocked: true,
    },
    {
      id: 'sim-2',
      name: 'AHMAD SIHABUDIN',
      nisn: '0086843414',
      noPeserta: '69955116-2026-0062',
      class: '12 S 2',
      violations: 2,
      logouts: 1,
      isBlocked: false,
    },
  ]);

  const handleProctorReset = (studentId: string, studentName: string) => {
    setProctorSimStudents((prev) =>
      prev.map((s) =>
        s.id === studentId
          ? { ...s, violations: 0, logouts: 0, isBlocked: false }
          : s
      )
    );
    showToast(
      'Reset Login Berhasil!',
      `Proktor berhasil mereset login peserta "${studentName}". Akun kembali aktif dan dapat login simulasi DSMART.`,
      'success'
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 10 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 10 }}
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] my-auto"
      >
        {/* Top Header */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-base sm:text-lg text-white">
                  Panduan Resmi &amp; Hasil Akhir Simulasi D&apos;SMART Lampung
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-400/20 text-emerald-200 border border-emerald-400/30">
                  Dinas Pendidikan Provinsi Lampung
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Standar operasional kartu login, protokol keamanan ujian, format presensi F4 landscape, dan hasil akhir pemetaan kemampuan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm font-bold cursor-pointer transition-all shrink-0"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap items-center gap-1.5 shrink-0 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('SECURITY_AND_CARD')}
            className={`flex-1 min-w-[160px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'SECURITY_AND_CARD'
                ? 'bg-white text-emerald-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <span>1. Keamanan Ujian &amp; Kartu Login</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FINAL_RESULT')}
            className={`flex-1 min-w-[160px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'FINAL_RESULT'
                ? 'bg-white text-emerald-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Smartphone className="w-4 h-4 text-emerald-600" />
            <span>2. Panduan Hasil Akhir (Mobile Siswa)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ATTENDANCE_F4')}
            className={`flex-1 min-w-[160px] py-2 px-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${
              activeTab === 'ATTENDANCE_F4'
                ? 'bg-white text-emerald-950 shadow-xs font-black'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>3. Daftar Hadir F4 Landscape</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0 overscroll-contain text-slate-800">
          {/* ======================================================== */}
          {/* TAB 1: PROTOKOL KEAMANAN UJIAN & KARTU PESERTA DSMART    */}
          {/* ======================================================== */}
          {activeTab === 'SECURITY_AND_CARD' && (
            <div className="space-y-6">
              {/* Row 1: Kartu Keamanan Ujian (Sesuai Gambar 1) */}
              <div className="p-6 rounded-3xl bg-white border-2 border-rose-300 shadow-md relative overflow-hidden">
                {/* Red pill header persis Gambar 1 */}
                <div className="inline-block px-5 py-2 rounded-2xl bg-rose-600 text-white font-black text-sm sm:text-base tracking-wide shadow-sm mb-4">
                  Keamanan Ujian
                </div>

                <p className="text-xs sm:text-sm font-bold text-slate-800 mb-3 leading-relaxed">
                  Untuk meningkatkan keamanan pelaksanaan, sistem akan menerapkan:
                </p>

                <ul className="space-y-2.5 text-xs sm:text-sm font-bold text-slate-800">
                  <li className="flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 mt-1.5" />
                    <span>
                      <strong className="text-rose-700">3x pelanggaran</strong> &rarr; peserta otomatis logout.
                    </span>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 mt-1.5" />
                    <span>
                      <strong className="text-rose-700">3x logout</strong> &rarr; akun peserta diblokir untuk login.
                    </span>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 mt-1.5" />
                    <span>
                      Jika akun terblokir, <strong className="text-indigo-900">Proktor harus melakukan reset login peserta</strong>.
                    </span>
                  </li>

                  <li className="flex items-start gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shrink-0 mt-1.5" />
                    <span>
                      Pastikan layar HP <strong className="text-slate-900">tidak mati/terkunci</strong> selama peserta mengerjakan.
                    </span>
                  </li>
                </ul>
              </div>

              {/* Row 2: Live Simulator Proktor: Reset Akun Siswa Terblokir */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-900">
                        Simulasi Proktor Ruang: Buka Blokir Akun Siswa Real-Time
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Uji coba mekanisme reset peserta jika siswa terblokir akibat 3x pelanggaran / logout
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {proctorSimStudents.map((sim) => (
                    <div
                      key={sim.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900">{sim.name}</span>
                          <span className="font-mono text-[10px] text-slate-500">({sim.noPeserta})</span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                            Kelas {sim.class}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] mt-1 text-slate-600">
                          <span>Pelanggaran: <strong className="text-rose-600">{sim.violations}x</strong></span>
                          <span>Logout: <strong className="text-rose-600">{sim.logouts}x</strong></span>
                          {sim.isBlocked ? (
                            <span className="inline-flex items-center gap-1 font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              <Lock className="w-3 h-3 text-rose-600" />
                              Akun Terblokir
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <Unlock className="w-3 h-3 text-emerald-600" />
                              Akun Aktif (Normal)
                            </span>
                          )}
                        </div>
                      </div>

                      {sim.isBlocked ? (
                        <button
                          type="button"
                          onClick={() => handleProctorReset(sim.id, sim.name)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto active:scale-95"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Login Peserta</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-bold self-start sm:self-auto">
                          Siap Mengerjakan
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Row 3: Contoh Kartu Peserta DSMART (Sesuai Gambar 2) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-extrabold text-xs text-slate-900">
                    Contoh Tampilan Kartu Peserta D&apos;SMART (Sesuai Gambar 2):
                  </h4>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    Format Resmi D&apos;SMART
                  </span>
                </div>

                <div className="max-w-md mx-auto bg-white border-2 border-slate-800 p-0 shadow-sm overflow-hidden text-xs">
                  {/* Kop Kartu */}
                  <div className="p-3 border-b-2 border-slate-800 flex items-center justify-between gap-2 bg-white">
                    <img
                      src={school.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                      alt="Logo Sekolah (Kiri)"
                      className="max-h-11 max-w-11 object-contain"
                    />
                    <div className="flex-1 text-center px-1">
                      <h4 className="font-black text-xs text-slate-950 uppercase leading-tight">
                        KARTU PESERTA DSMART
                      </h4>
                      <p className="font-bold text-[10px] text-slate-900 uppercase leading-tight mt-0.5">
                        DINAS PENDIDIKAN DAN KEBUDAYAAN
                      </p>
                      <p className="font-bold text-[10px] text-slate-900 uppercase leading-tight">
                        PROVINSI LAMPUNG
                      </p>
                    </div>
                    <img
                      src={school.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
                      alt="Logo Provinsi (Kanan)"
                      className="max-h-11 max-w-11 object-contain"
                    />
                  </div>

                  {/* Body Identitas */}
                  <div className="p-3 space-y-1 text-xs">
                    <div className="grid grid-cols-12 gap-1">
                      <span className="col-span-4 text-slate-700 font-semibold text-[11px]">Nomor Peserta</span>
                      <span className="col-span-1 text-center font-bold">:</span>
                      <span className="col-span-7 font-black font-mono text-slate-950">69955116-2026-0327</span>
                    </div>
                    <div className="grid grid-cols-12 gap-1">
                      <span className="col-span-4 text-slate-700 font-semibold text-[11px]">Kelompok</span>
                      <span className="col-span-1 text-center font-bold">:</span>
                      <span className="col-span-7 font-bold text-slate-900">11.3</span>
                    </div>
                    <div className="grid grid-cols-12 gap-1">
                      <span className="col-span-4 text-slate-700 font-semibold text-[11px]">Nama Peserta</span>
                      <span className="col-span-1 text-center font-bold">:</span>
                      <span className="col-span-7 font-black text-slate-950 uppercase">NABILA ZAHRA ZAIN</span>
                    </div>
                    <div className="grid grid-cols-12 gap-1">
                      <span className="col-span-4 text-slate-700 font-semibold text-[11px]">Sekolah</span>
                      <span className="col-span-1 text-center font-bold">:</span>
                      <span className="col-span-7 font-bold text-slate-950 uppercase">SMAN 3 TUMIJAJAR</span>
                    </div>
                    <div className="grid grid-cols-12 gap-1">
                      <span className="col-span-4 text-slate-700 font-semibold text-[11px]">Server Tes</span>
                      <span className="col-span-1 text-center font-bold">:</span>
                      <span className="col-span-7 text-slate-800 text-[11px]">Tanya proktor sekolah masing-masing</span>
                    </div>
                  </div>

                  {/* Table Credentials */}
                  <div className="p-3 pt-0">
                    <table className="w-full border-collapse border-2 border-slate-800 text-center text-xs">
                      <thead>
                        <tr className="bg-slate-100 font-black text-[10.5px]">
                          <th className="border-2 border-slate-800 py-1">Sesi &amp; Waktu</th>
                          <th className="border-2 border-slate-800 py-1">Username</th>
                          <th className="border-2 border-slate-800 py-1">Password</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="font-bold text-[11px]">
                          <td className="border-2 border-slate-800 py-1 font-mono">L&amp;N:1</td>
                          <td className="border-2 border-slate-800 py-1 font-mono">3091110048</td>
                          <td className="border-2 border-slate-800 py-1 font-mono font-black">T613002026</td>
                        </tr>
                      </tbody>
                    </table>
                    <p className="mt-1 text-[9px] italic text-slate-600">
                      Catatan: Kartu ini digunakan untuk login ke aplikasi DSMART.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PANDUAN HASIL AKHIR KETIKA SISWA SELESAI (GAMBAR 3)*/}
          {/* ======================================================== */}
          {activeTab === 'FINAL_RESULT' && (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                <p className="font-bold">
                  Tampilan Layar Smartphone Siswa Setelah Menuntaskan Simulasi D&apos;SMART:
                </p>
                <p className="mt-0.5 text-emerald-800">
                  Berikut adalah replika persis tampilan mobile siswa (sesuai foto ponsel pada Gambar 3) dengan lingkaran nilai grade besar, statistik butir terjawab dan benar, tombol aksi, serta pemetaan nilai per instrumen.
                </p>
              </div>

              {/* Smartphone Mockup Container (Sesuai Gambar 3) */}
              <div className="max-w-sm mx-auto bg-slate-950 p-3 sm:p-4 rounded-[40px] shadow-2xl border-4 border-slate-800">
                {/* Notch & Phone Header */}
                <div className="flex items-center justify-between px-3 pb-2 text-[11px] text-slate-400 font-mono border-b border-slate-800 mb-2">
                  <span>11.22</span>
                  <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto" />
                  <span>100%</span>
                </div>

                {/* Inner Screen */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 text-slate-900 space-y-4">
                  {/* Browser Bar title persis foto: Hasil Pemetaan Kemampuan */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs font-bold text-slate-700">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Hasil Pemetaan Kemampuan</span>
                    </span>
                    <span className="text-slate-400 text-[10px]">dsmart.lampung</span>
                  </div>

                  {/* Circular Score Gauge persis foto: 96.6 */}
                  <div className="py-4 text-center relative flex flex-col items-center justify-center">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      {/* Gauge Arch Background */}
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="#e2e8f0"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray="264"
                          strokeDashoffset="66"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="42"
                          stroke="#ef4444"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray="264"
                          strokeDashoffset="80"
                          strokeLinecap="round"
                        />
                      </svg>

                      {/* Number in Center */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl sm:text-5xl font-black text-rose-600 tracking-tight">
                          96.6
                        </span>
                      </div>
                    </div>

                    {/* Subtitle persis foto */}
                    <div className="mt-3 text-center">
                      <p className="text-xs text-slate-700 font-bold">
                        Nilai Grade Kamu dalam mengerjakan
                      </p>
                      <h4 className="text-sm font-black text-indigo-700 mt-0.5">
                        &ldquo;Literasi &amp; Numerasi 12&rdquo;
                      </h4>
                    </div>
                  </div>

                  {/* Dua Kotak Statistik persis foto: 160 Dikerjakan | 54/160 Benar */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <p className="text-xl sm:text-2xl font-black text-teal-700">160</p>
                      <p className="text-[10.5px] font-bold text-slate-500 mt-0.5 flex items-center justify-center gap-1">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>Dikerjakan</span>
                      </p>
                    </div>

                    <div className="p-2.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                      <p className="text-xl sm:text-2xl font-black text-amber-700">54/160</p>
                      <p className="text-[10.5px] font-bold text-amber-800 mt-0.5 flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-amber-600" />
                        <span>Benar</span>
                      </p>
                    </div>
                  </div>

                  {/* Tombol Aksi Persis Foto: Beranda | Preview Hasil | Analisa Jawaban */}
                  <div className="space-y-2 pt-1 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => showToast('Navigasi Beranda', 'Mengarahkan siswa kembali ke beranda modul.', 'info')}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Home className="w-4 h-4 text-slate-600" />
                      <span>Beranda</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDetailView('PREVIEW')}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                    >
                      <Eye className="w-4 h-4 text-white" />
                      <span>Preview Hasil</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveDetailView('ANALYSIS')}
                      className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shadow-amber-600/20 active:scale-95"
                    >
                      <BarChart3 className="w-4 h-4 text-white" />
                      <span>Analisa Jawaban</span>
                    </button>
                  </div>

                  {/* Accordion Gelap di Bawah: Pemetaan Hasil Nilai per Mapel (Persis Foto) */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAccordionOpen(!isAccordionOpen)}
                      className="w-full p-3 rounded-2xl bg-slate-900 text-white flex items-center justify-between cursor-pointer font-bold text-xs"
                    >
                      <span>Pemetaan Hasil Nilai per Mapel</span>
                      {isAccordionOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {isAccordionOpen && (
                      <div className="mt-2 p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
                        {DEFAULT_DSMART_SAMPLE_RESULT.instruments.map((inst, idx) => (
                          <div
                            key={idx}
                            className="p-2 bg-white rounded-xl border border-slate-200/90 flex items-center justify-between gap-2"
                          >
                            <div>
                              <p className="font-extrabold text-[11px] text-slate-900">{inst.name}</p>
                              <p className="text-[10px] text-emerald-700 font-semibold">{inst.category}</p>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-black text-indigo-700 text-xs">
                                {inst.score.toFixed(1)}
                              </span>
                              <p className="text-[9.5px] text-slate-400 font-mono">
                                {inst.correct}/{inst.total} Benar
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sub-Modal: Preview Hasil atau Analisa Jawaban */}
              {activeDetailView !== 'NONE' && (
                <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="font-black text-slate-900 flex items-center gap-1.5">
                      {activeDetailView === 'PREVIEW' ? (
                        <>
                          <Eye className="w-4 h-4 text-indigo-600" />
                          <span>Lembar Review Hasil Pengerjaan Siswa (Preview)</span>
                        </>
                      ) : (
                        <>
                          <BarChart3 className="w-4 h-4 text-amber-600" />
                          <span>Analisis Butir Jawaban &amp; Pembahasan Kunci</span>
                        </>
                      )}
                    </h5>
                    <button
                      type="button"
                      onClick={() => setActiveDetailView('NONE')}
                      className="text-slate-500 hover:text-slate-800 font-bold"
                    >
                      Tutup Review
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 bg-white rounded-xl border">
                      <span className="text-[10px] text-slate-500">Literasi</span>
                      <p className="font-black text-emerald-700 text-sm">95.0</p>
                    </div>
                    <div className="p-2 bg-white rounded-xl border">
                      <span className="text-[10px] text-slate-500">Numerasi</span>
                      <p className="font-black text-sky-700 text-sm">92.5</p>
                    </div>
                    <div className="p-2 bg-white rounded-xl border">
                      <span className="text-[10px] text-slate-500">Pra Kampus</span>
                      <p className="font-black text-indigo-700 text-sm">98.0</p>
                    </div>
                    <div className="p-2 bg-white rounded-xl border">
                      <span className="text-[10px] text-slate-500">Karakter</span>
                      <p className="font-black text-purple-700 text-sm">100.0</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: DAFTAR HADIR F4 LANDSCAPE (GAMBAR 4 & 5)           */}
          {/* ======================================================== */}
          {activeTab === 'ATTENDANCE_F4' && (
            <div className="space-y-4">
              <div className="p-4 bg-teal-50 rounded-2xl border border-teal-200 text-xs text-teal-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="font-bold">
                    Standar Dokumen Presensi D&apos;SMART: Kertas F4 / Folio Landscape (215 x 330 mm)
                  </p>
                  <p className="text-[11px] text-teal-900 mt-0.5">
                    Memuat kop dinas dan sekolah resmi, kolom nomor peserta berurutan kontinu, nomor tanda tangan zig-zag resmi, serta lembar tanda tangan pengawas dan proktor.
                  </p>
                </div>

                <div className="px-3.5 py-2 rounded-xl bg-teal-100 text-teal-800 font-bold text-xs flex items-center gap-1.5 shrink-0">
                  <Printer className="w-3.5 h-3.5" />
                  <span>Format Cetak Presensi CBT F4</span>
                </div>
              </div>

              {/* Sample Preview of F4 Table Structure (Images 4 & 5) */}
              <div className="p-4 bg-white border border-slate-300 rounded-2xl shadow-sm text-xs space-y-3">
                <div className="text-center border-b pb-2">
                  <h4 className="font-black uppercase text-slate-900">
                    DAFTAR HADIR DSMART ASSESMENT
                  </h4>
                  <p className="font-bold text-[10px] text-slate-700 uppercase">
                    DINAS PENDIDIKAN DAN KEBUDAYAAN PROVINSI LAMPUNG &bull; TAHUN 2026/2027
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 mt-1">
                    SESI: 1 | TINGKAT: 12 | KELOMPOK: 12 S 2 (Hal 1 dari 2)
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-slate-400 text-center text-[10.5px]">
                    <thead className="bg-slate-100 font-black">
                      <tr>
                        <th className="border border-slate-400 p-1.5 w-8">NO</th>
                        <th className="border border-slate-400 p-1.5 w-32">NO PESERTA</th>
                        <th className="border border-slate-400 p-1.5 w-24">NISN</th>
                        <th className="border border-slate-400 p-1.5 text-left pl-3">NAMA SISWA</th>
                        <th className="border border-slate-400 p-1.5 w-40">TANDA TANGAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      <tr>
                        <td className="border border-slate-400 p-1">1</td>
                        <td className="border border-slate-400 p-1 font-mono font-bold">69955116-2026-0062</td>
                        <td className="border border-slate-400 p-1 font-mono">0086843414</td>
                        <td className="border border-slate-400 p-1 text-left pl-3 font-bold">AHMAD SIHABUDIN</td>
                        <td className="border border-slate-400 p-1 text-left pl-2 text-[10px] text-slate-400 font-mono">1. ....................</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 p-1">2</td>
                        <td className="border border-slate-400 p-1 font-mono font-bold">69955116-2026-0063</td>
                        <td className="border border-slate-400 p-1 font-mono">0084481578</td>
                        <td className="border border-slate-400 p-1 text-left pl-3 font-bold">AKBAR NURIYADI</td>
                        <td className="border border-slate-400 p-1 text-right pr-2 text-[10px] text-slate-400 font-mono">2. ....................</td>
                      </tr>
                      <tr>
                        <td className="border border-slate-400 p-1">3</td>
                        <td className="border border-slate-400 p-1 font-mono font-bold">69955116-2026-0064</td>
                        <td className="border border-slate-400 p-1 font-mono">0088844131</td>
                        <td className="border border-slate-400 p-1 text-left pl-3 font-bold">ANDIKA SAPUTRA</td>
                        <td className="border border-slate-400 p-1 text-left pl-2 text-[10px] text-slate-400 font-mono">3. ....................</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-slate-600 border-t border-slate-100">
                  <span className="italic">* Lembar presensi dicetak menggunakan ukuran kertas F4 (Folio) dalam posisi Landscape.</span>
                  <span className="font-bold text-slate-800">SMAN 3 Tumijajar</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-slate-600 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Simulasi D&apos;SMART Lampung Terintegrasi Sistem CBT</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer transition-all"
          >
            Tutup Panduan
          </button>
        </div>
      </motion.div>
    </div>
  );
};
