import React, { useState } from 'react';
import {
  ShieldCheck,
  HelpCircle,
  FileText,
  Phone,
  Mail,
  X,
  ExternalLink,
  Lock,
  HeartHandshake,
  Cpu,
  Database,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Sparkles,
  School,
  Calendar,
  Layers,
  Eye,
  Shield,
  FileCheck,
  Server,
  Key,
  Smile,
  BookOpen,
  Users,
  Scale,
  GraduationCap,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  Activity,
  Wifi,
  AlertCircle,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

export const FooterDisclaimer: React.FC = () => {
  const { state } = useApp();
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activePrivacyTab, setActivePrivacyTab] = useState<'hukum' | 'anak' | 'bk' | 'ai' | 'rbac' | 'hak'>('hukum');

  const school = state?.schoolInfo;

  return (
    <>
      {/* ========================================================================= */}
      {/* FOOTER UTAMA SISTEM */}
      {/* ========================================================================= */}
      <footer className="mt-auto bg-white border-t border-slate-200 py-6 px-4 sm:px-6 lg:px-8 text-slate-500 text-xs shrink-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left max-w-2xl">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="font-extrabold text-slate-800 text-sm">
                SiMantri &bull; SMA Negeri 3 Tumijajar
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-black text-[10px] tracking-wide">
                v.3.9.0
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold text-[10px] flex items-center gap-1 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>UU No. 27 Tahun 2022 Terjamin Penuh</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
              Ekosistem Digital Sekolah Terpadu: Presensi Siswa Terkini, Master Data 323 Siswa 10 Rombel, Bank Asesmen Merdeka, Koreksi AI Vision Ultra-Tinggi, Buku Rapor STS/SAS, Supervisi Manajerial Kepala Sekolah, Kalender Pendidikan, Literasi &amp; Numerasi Terjadwal, dan 7 Jurus Guru BK Hebat Kemendikdasmen RI dengan jaminan kepatuhan penuh regulasi Pelindungan Data Pribadi (UU PDP).
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-600">
            <button
              onClick={() => setShowPrivacyModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 transition-colors cursor-pointer shadow-2xs active:scale-95"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Kebijakan Privasi &amp; UU PDP 27/2022</span>
            </button>
            <span>&bull;</span>
            <button
              onClick={() => setShowHelpModal(true)}
              className="inline-flex items-center gap-1.5 hover:text-indigo-600 transition-colors cursor-pointer active:scale-95"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Bantuan &amp; Helpdesk IT</span>
            </button>
            <span>&bull;</span>
            <span className="text-slate-700 font-bold">
              &copy; 2026 SMAN 3 TUMIJAJAR
            </span>
          </div>
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* MODAL: KEBIJAKAN PRIVASI & JAMINAN PASTI UU NOMOR 27 TAHUN 2022 */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showPrivacyModal && (
          <div
            onClick={() => setShowPrivacyModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto text-slate-800 cursor-default"
            >
              {/* Header Modal */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-6 text-white flex items-start justify-between border-b border-slate-800">
                <div className="flex items-center gap-3.5">
                  <div className="p-3 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 shadow-inner">
                    <Scale className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        <span>Kepatuhan Resmi UU No. 27 Tahun 2022</span>
                      </span>
                      <span className="text-[11px] text-slate-300 font-mono">
                        Lembaran Negara RI No. 196 / Tambahan No. 6820
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      Kebijakan Privasi &amp; Jaminan Hukum Pelindungan Data Pribadi
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5 max-w-2xl leading-relaxed">
                      Jaminan pasti kepatuhan hukum atas pemrosesan data peserta didik, pendidik, dan wali murid di seluruh jaringan sistem SiMantri SMA Negeri 3 Tumijajar berdasarkan UU RI No. 27 Tahun 2022.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => window.print()}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer hidden sm:flex items-center gap-1.5 text-xs font-semibold"
                    title="Cetak Salinan Kebijakan Resmi"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Cetak</span>
                  </button>
                  <button
                    onClick={() => setShowPrivacyModal(false)}
                    className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Navigation Tabs Modal */}
              <div className="bg-slate-100 p-2 border-b border-slate-200 flex flex-wrap items-center gap-1 px-4 sm:px-6">
                <button
                  type="button"
                  onClick={() => setActivePrivacyTab('hukum')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePrivacyTab === 'hukum'
                      ? 'bg-indigo-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Scale className="w-3.5 h-3.5" />
                  <span>1. Jaminan Pasti UU PDP</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePrivacyTab('anak')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePrivacyTab === 'anak'
                      ? 'bg-emerald-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>2. Proteksi Data Anak (Ps. 25)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePrivacyTab('bk')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePrivacyTab === 'bk'
                      ? 'bg-purple-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <HeartHandshake className="w-3.5 h-3.5" />
                  <span>3. Rahasia BK &amp; Zero-Stigma</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePrivacyTab('ai')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePrivacyTab === 'ai'
                      ? 'bg-indigo-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" />
                  <span>4. Keamanan AI Vision &amp; Nilai</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePrivacyTab('rbac')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePrivacyTab === 'rbac'
                      ? 'bg-indigo-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>5. RBAC &amp; Enkripsi TLS 1.3</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePrivacyTab('hak')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    activePrivacyTab === 'hak'
                      ? 'bg-indigo-600 text-white shadow-xs font-black'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>6. Hak Subjek Data &amp; DPO</span>
                </button>
              </div>

              {/* Body Content Modal */}
              <div className="p-6 max-h-[70vh] overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed">
                {/* ============================================================== */}
                {/* TAB 1: JAMINAN PASTI UU NO. 27 TAHUN 2022 */}
                {/* ============================================================== */}
                {activePrivacyTab === 'hukum' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-950 font-black text-sm">
                        <Scale className="w-4 h-4 text-indigo-700" />
                        <span>Landasan Konstitusional &amp; Jaminan Pasti Hukum (UU No. 27 Tahun 2022)</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        Sesuai amanat <strong>Pasal 28G ayat (1), Pasal 28H ayat (4), dan Pasal 28J Undang-Undang Dasar Negara Republik Indonesia Tahun 1945</strong> serta diberlakukannya <strong>Undang-Undang Republik Indonesia Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)</strong>, seluruh operasional digital SMA Negeri 3 Tumijajar memberikan jaminan kepastian hukum atas pelindungan diri pribadi, kehormatan, martabat, dan hak konstitusional setiap warga sekolah.
                      </p>
                    </div>

                    {/* 8 Asas Pelindungan Data Pribadi (Pasal 3) */}
                    <div className="space-y-2">
                      <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-indigo-600" />
                        <span>Penerapan 8 Asas Pelindungan Data Pribadi (Pasal 3 UU PDP) di Seluruh Sistem:</span>
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <strong className="text-indigo-900 text-[11px] block font-extrabold">a. Asas Pelindungan</strong>
                          <p className="text-slate-600 text-[10.5px] mt-0.5">Menjamin data pribadi terlindungi dari penyalahgunaan di setiap jaringan pemrosesan.</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <strong className="text-indigo-900 text-[11px] block font-extrabold">b. Asas Kepastian Hukum</strong>
                          <p className="text-slate-600 text-[10.5px] mt-0.5">Pemrosesan data memiliki dasar hukum sah dan diakui secara legal di dalam/luar pengadilan.</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <strong className="text-indigo-900 text-[11px] block font-extrabold">c. Asas Kepentingan Umum</strong>
                          <p className="text-slate-600 text-[10.5px] mt-0.5">Mendukung penyelenggaraan pendidikan nasional dan akuntabilitas evaluasi belajar.</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <strong className="text-indigo-900 text-[11px] block font-extrabold">d. Asas Kemanfaatan</strong>
                          <p className="text-slate-600 text-[10.5px] mt-0.5">Meningkatkan mutu asesmen, bimbingan konseling, dan administrasi sekolah yang adil.</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <strong className="text-indigo-900 text-[11px] block font-extrabold">e. Asas Kehati-hatian</strong>
                          <p className="text-slate-600 text-[10.5px] mt-0.5">Mencegah kebocoran data dengan mitigasi risiko teknis dan operasional berlapis.</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <strong className="text-indigo-900 text-[11px] block font-extrabold">f. Asas Keseimbangan</strong>
                          <p className="text-slate-600 text-[10.5px] mt-0.5">Menyeimbangkan hak privasi individu dengan kewajiban pelaporan resmi Dapodik/Dinas.</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <strong className="text-indigo-900 text-[11px] block font-extrabold">g. Asas Akuntabilitas</strong>
                          <p className="text-slate-600 text-[10.5px] mt-0.5">Seluruh pemrosesan dapat dibuktikan, diaudit, dan dipertanggungjawabkan (Pasal 47).</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                          <strong className="text-indigo-900 text-[11px] block font-extrabold">h. Asas Kerahasiaan</strong>
                          <p className="text-slate-600 text-[10.5px] mt-0.5">Data terlindungi dari pihak yang tidak berhak dan akses yang tidak sah (Pasal 36).</p>
                        </div>
                      </div>
                    </div>

                    {/* Ketentuan Pidana & Sanksi Administratif (Pasal 57, 65-70) */}
                    <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-2">
                      <div className="flex items-center gap-2 text-rose-950 font-black text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Penegasan Sanksi Pidana &amp; Denda Hukum Pelanggaran Data Pribadi (Bab XIV UU PDP)</span>
                      </div>
                      <p className="text-rose-900 text-[11.5px] leading-relaxed">
                        Sistem SiMantri menegaskan larangan keras bagi siapapun melakukan tindakan melawan hukum terhadap data pribadi warga sekolah, dengan ancaman pidana langsung sesuai UU No. 27 Tahun 2022:
                      </p>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-rose-900">
                        <li className="p-2.5 bg-white/80 rounded-xl border border-rose-200">
                          <strong>Pasal 67 ayat (1):</strong> Memperoleh/mengumpulkan data pribadi bukan miliknya untuk untung diri/merugikan orang lain dipidana penjara paling lama <strong>5 tahun</strong> dan/atau denda paling banyak <strong>Rp 5.000.000.000 (5 Miliar Rupiah)</strong>.
                        </li>
                        <li className="p-2.5 bg-white/80 rounded-xl border border-rose-200">
                          <strong>Pasal 67 ayat (2):</strong> Mengungkapkan data pribadi yang bukan miliknya secara melawan hukum dipidana penjara paling lama <strong>4 tahun</strong> dan/atau denda paling banyak <strong>Rp 4.000.000.000 (4 Miliar Rupiah)</strong>.
                        </li>
                        <li className="p-2.5 bg-white/80 rounded-xl border border-rose-200">
                          <strong>Pasal 67 ayat (3):</strong> Menggunakan data pribadi yang bukan miliknya secara melawan hukum dipidana penjara paling lama <strong>5 tahun</strong> dan/atau denda paling banyak <strong>Rp 5.000.000.000 (5 Miliar Rupiah)</strong>.
                        </li>
                        <li className="p-2.5 bg-white/80 rounded-xl border border-rose-200">
                          <strong>Pasal 68:</strong> Membuat atau memalsukan data pribadi dengan maksud menguntungkan diri/merugikan orang lain dipidana penjara paling lama <strong>6 tahun</strong> dan/atau denda paling banyak <strong>Rp 6.000.000.000 (6 Miliar Rupiah)</strong>.
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* TAB 2: PROTEKSI KHUSUS DATA ANAK & KLASIFIKASI DATA (PS. 4 & 25) */}
                {/* ============================================================== */}
                {activePrivacyTab === 'anak' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-950 font-black text-sm">
                        <ShieldCheck className="w-4 h-4 text-emerald-700" />
                        <span>Kewajiban Khusus Pemrosesan Data Pribadi Anak (Pasal 25 UU No. 27/2022)</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        Mengingat peserta didik SMA Negeri 3 Tumijajar mayoritas berusia di bawah 18 (delapan belas) tahun yang tergolong sebagai <strong>anak</strong>, sistem SiMantri menerapkan pemenuhan mandat hukum <strong>Pasal 25 ayat (1) dan ayat (2) UU PDP</strong>:
                      </p>
                      <div className="p-3 bg-white rounded-xl border border-emerald-300 font-semibold text-emerald-900 text-xs">
                        &ldquo;Pemrosesan Data Pribadi anak diselenggarakan secara khusus (ayat 1). Pemrosesan Data Pribadi anak wajib mendapat persetujuan dari orang tua anak dan/atau wali anak sesuai dengan ketentuan peraturan perundang-undangan (ayat 2).&rdquo;
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {/* Data Spesifik */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
                          <Lock className="w-4 h-4 text-purple-600" />
                          <span>1. Data Pribadi Bersifat Spesifik (Pasal 4 ayat 2)</span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Meliputi data dan informasi kesehatan, data anak, dan catatan konseling/pembinaan:
                        </p>
                        <ul className="space-y-1 text-[11px] text-slate-600 list-disc list-inside">
                          <li><strong>Data Kesehatan &amp; Fisik:</strong> Riwayat penyakit, disabilitas, atau kendala medis peserta didik untuk pendampingan belajar ramah anak (Pasal 26).</li>
                          <li><strong>Catatan Bimbingan Konseling:</strong> Log wawancara pribadi, catatan penanganan perundungan (Permendikbudristek 46/2023), dan jurnal emosi.</li>
                          <li><strong>Proteksi Ekstra:</strong> Dikelola terenkripsi dan hanya dapat diakses eksklusif oleh Guru BK resmi dan Kepala Sekolah.</li>
                        </ul>
                      </div>

                      {/* Data Umum */}
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
                        <div className="flex items-center gap-2 text-slate-900 font-black text-xs">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span>2. Data Pribadi Bersifat Umum (Pasal 4 ayat 3)</span>
                        </div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">
                          Diproses secara terbatas, spesifik, sah secara hukum, dan transparan (Pasal 27):
                        </p>
                        <ul className="space-y-1 text-[11px] text-slate-600 list-disc list-inside">
                          <li><strong>Identitas Peserta Didik:</strong> Nama lengkap, NISN, NIP guru, jenis kelamin, kelas/rombel, agama, dan nomor urut presensi.</li>
                          <li><strong>Data Kombinasi Unik:</strong> Nomor telepon seluler dan alamat IP jaringan saat login sistem (Penjelasan Pasal 4 ayat 3 huruf f).</li>
                          <li><strong>Tujuan Terbatas:</strong> Digunakan murni untuk administrasi asesmen, pelaporan rapor, dan pembinaan kesiswaan.</li>
                        </ul>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-[11.5px] text-slate-600">
                      <strong>Jaminan Verifikasi Akurasi Data (Pasal 29):</strong> Operator Dapodik dan staf tata usaha sekolah wajib memverifikasi akurasi, kelengkapan, dan konsistensi data sebelum dicatat dalam buku induk atau rapor sekolah.
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* TAB 3: ASAS KERAHASIAAN MUTLAK LAYANAN BK (PASAL 36) */}
                {/* ============================================================== */}
                {activePrivacyTab === 'bk' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-purple-50/80 border border-purple-200 space-y-2">
                      <div className="flex items-center gap-2 text-purple-950 font-black text-sm">
                        <Lock className="w-4 h-4 text-purple-700" />
                        <span>Kewajiban Menjaga Kerahasiaan Data Konseling (Pasal 36 UU No. 27/2022)</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        Sesuai amanat <strong>Pasal 36 UU PDP</strong> (&ldquo;Dalam melakukan pemrosesan Data Pribadi, Pengendali Data Pribadi wajib menjaga kerahasiaan Data Pribadi&rdquo;) serta standar kode etik <strong>7 Jurus Guru BK Hebat Kemendikdasmen RI</strong>, seluruh informasi sensitif konseling murid dilindungi dalam status <strong>SANGAT RAHASIA (STRICT CONFIDENTIAL)</strong>.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                        <h5 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                          <Lock className="w-3.5 h-3.5 text-rose-600" />
                          <span>1. Notula Konseling Privat &amp; Logbook Resiliensi</span>
                        </h5>
                        <p className="text-slate-600 text-[11.5px]">
                          Wawancara konseling individual, konferensi kasus, dan berita acara *home visit* disimpan terisolasi dan hanya dapat diakses oleh Guru BK pengampu dan Kepala Sekolah. Guru mata pelajaran tidak memiliki hak membuka isi log konseling privat.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                        <h5 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                          <HeartHandshake className="w-3.5 h-3.5 text-purple-600" />
                          <span>2. Perlindungan Privasi dari Stigma (Zero-Stigma MTSS Tier 1-3)</span>
                        </h5>
                        <p className="text-slate-600 text-[11.5px]">
                          Alur rujukan berjenjang dikelola tanpa pemberian label negatif. Wali kelas dan guru mapel hanya menerima rekomendasi pendampingan belajar umum tanpa mengekspos latar belakang rahasia keluarga atau psikologis murid.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                        <h5 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                          <Smile className="w-3.5 h-3.5 text-emerald-600" />
                          <span>3. Jurnal Emosi Harian (EMC2) &amp; 7 Kebiasaan Anak Hebat</span>
                        </h5>
                        <p className="text-slate-600 text-[11.5px]">
                          Data perasaan suasana hati harian dan tracker kebiasaan digunakan murni untuk instrumen penguatan motivasi dan ketahanan mental murid. Dilarang keras digunakan sebagai dasar pengurangan nilai akademik atau sanksi hukuman.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1.5 shadow-2xs">
                        <h5 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>4. Batasan Pengecualian Demi Penyelamatan Jiwa (Pasal 33 huruf a)</span>
                        </h5>
                        <p className="text-slate-600 text-[11.5px]">
                          Kerahasiaan konseling hanya dapat dikoordinasikan secara tertutup kepada orang tua atau tenaga medis jika terdeteksi ancaman keselamatan jiwa murid atau kedaruratan kesehatan fisik/mental ekstrem demi keselamatan nyawa anak.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* TAB 4: KEAMANAN AI VISION & NILAI AKADEMIK (PASAL 35 & 39) */}
                {/* ============================================================== */}
                {activePrivacyTab === 'ai' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-950 font-black text-sm">
                        <Cpu className="w-4 h-4 text-indigo-700" />
                        <span>Keamanan Pemrosesan AI Vision &amp; Integritas Penilaian (Pasal 35 &amp; 39 UU PDP)</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        Sesuai <strong>Pasal 35 dan Pasal 39 UU No. 27 Tahun 2022</strong>, Pengendali Data wajib melindungi dan mencegah data pribadi diakses secara tidak sah dengan sistem keamanan andal, aman, dan bertanggung jawab. Sistem koreksi cerdas Google AI Studio Vision pada SiMantri diatur dengan parameter keamanan ketat.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                          <Lock className="w-4 h-4 text-indigo-600" />
                          <span>1. Tanpa Pelatihan Publik (No Public Training)</span>
                        </div>
                        <p className="text-slate-600 text-[11.5px]">
                          Foto lembar jawaban siswa dan hasil pindaian teks esai tidak pernah digunakan untuk melatih model AI publik dan tidak disimpan permanen di server luar. Pemrosesan berjalan secara *stateless inference*.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                          <Server className="w-4 h-4 text-indigo-600" />
                          <span>2. Jalur Proksi Server Tertutup (/api/*)</span>
                        </div>
                        <p className="text-slate-600 text-[11.5px]">
                          Kunci API rahasia dan komunikasi model diproses melalui server-side proxy route terisolasi. Tidak ada kredensial atau aliran data mentah siswa yang terpapar ke peramban publik.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                          <FileCheck className="w-4 h-4 text-emerald-600" />
                          <span>3. Validitas Matematis &amp; Anti-Manipulasi</span>
                        </div>
                        <p className="text-slate-600 text-[11.5px]">
                          Kalkulasi nilai rapor STS, analisis butir soal, dan pemetaan Capaian Pembelajaran (Taksonomi Bloom C1-C6) diproses secara matematis presisi tanpa pembulatan parsial liar demi keadilan peserta didik.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                        <div className="font-extrabold text-slate-900 text-xs flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-emerald-600" />
                          <span>4. Berita Acara Berverifikasi Digital</span>
                        </div>
                        <p className="text-slate-600 text-[11.5px]">
                          Pelaksanaan asesmen di ruang ujian terekam dalam Berita Acara ASTS/ASAS resmi dengan tanda tangan dan verifikasi Kepala Sekolah, menjadi arsip hukum otentik sekolah.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* TAB 5: HAK AKSES BERTINGKAT (RBAC) & ENKRIPSI JARINGAN */}
                {/* ============================================================== */}
                {activePrivacyTab === 'rbac' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-950 font-black text-sm">
                        <Key className="w-4 h-4 text-indigo-700" />
                        <span>Arsitektur Akses Bertingkat (RBAC) &amp; Enkripsi Multi-Jaringan (Pasal 31 &amp; 39)</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        SiMantri menerapkan pemisahan peran ketat (*role-based segregation*) serta perekaman audit log (Pasal 31 UU PDP) untuk memastikan data hanya dapat diakses oleh pihak yang sah secara hukum:
                      </p>
                    </div>

                    <div className="divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="p-3.5 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-xs shrink-0">
                          1
                        </div>
                        <div>
                          <strong className="text-slate-900 text-xs block">Administrator &amp; Operator Dapodik</strong>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Mengelola master data siswa (323 siswa 10 kelas), sinkronisasi rombel, pengaturan tahun ajaran/semester, backup/restore JSON, dan pemeliharaan server sekolah.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-black text-xs shrink-0">
                          2
                        </div>
                        <div>
                          <strong className="text-slate-900 text-xs block">Guru Bimbingan Konseling (BK) Hebat</strong>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Akses eksklusif modul 7 Jurus BK: direktori binaan, notula konseling privat, radar peta kerawanan (Tier 1-3), bimbingan karir SNBP, dan akuntabilitas A4.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs shrink-0">
                          3
                        </div>
                        <div>
                          <strong className="text-slate-900 text-xs block">Guru Mata Pelajaran &amp; Wali Kelas</strong>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Mengelola bank soal, koreksi jawaban siswa, buku nilai STS, input presensi harian kelas yang diampu, dan monitoring kehadiran rombel.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-black text-xs shrink-0">
                          4
                        </div>
                        <div>
                          <strong className="text-slate-900 text-xs block">Kepala Sekolah (Supervisi Manajerial)</strong>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Memiliki wewenang supervisi akademik, evaluasi kinerja guru, pengesahan berita acara ujian, persetujuan lembar presensi, dan penelaahan laporan resmi sekolah.
                          </p>
                        </div>
                      </div>

                      <div className="p-3.5 flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center font-black text-xs shrink-0">
                          5
                        </div>
                        <div>
                          <strong className="text-slate-900 text-xs block">Peserta Didik &amp; Orang Tua / Wali</strong>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Akses transparan atas capaian nilai, riwayat presensi harian pribadi, dan jadwal asesmen melalui NISN resmi tanpa wewenang mengubah master data.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5 text-[11px] text-slate-600">
                      <strong className="text-slate-800 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-indigo-600" />
                        Sinkronisasi Aman &amp; Enkripsi Multi-Lapis:
                      </strong>
                      <p>
                        Seluruh transmisi data dienkripsi dengan protokol Transport Layer Security <strong>TLS 1.3 / HTTPS</strong>. Data offline tersimpan dalam <strong>IndexedDB terenkripsi lokal</strong> berkapasitas besar tanpa kuota limit browser, dan tersinkronisasi otomatis ke cloud Firestore yang aman. Fitur <strong>Session-Isolated</strong> mencegah tab-jacking dan pembajakan sesi di lab komputer sekolah.
                      </p>
                    </div>
                  </div>
                )}

                {/* ============================================================== */}
                {/* TAB 6: HAK SUBJEK DATA, KOREKSI 3X24 JAM & DPO */}
                {/* ============================================================== */}
                {activePrivacyTab === 'hak' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-950 font-black text-sm">
                        <UserCheck className="w-4 h-4 text-indigo-700" />
                        <span>Hak-Hak Pasti Subjek Data Pribadi (Bab IV Pasal 5 s.d. Pasal 15 UU No. 27/2022)</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed">
                        Siswa, orang tua/wali, dan pendidik memiliki hak-hak hukum yang dilindungi penuh dan dapat dilaksanakan melalui permohonan tercatat secara elektronik ke sekolah (Pasal 14):
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                        <strong className="text-slate-900 text-xs block font-bold">1. Hak Transparansi &amp; Informasi (Ps. 5)</strong>
                        <p className="text-slate-600 text-[11px]">
                          Berhak mendapatkan kejelasan identitas pengendali, dasar hukum, tujuan pemrosesan, dan akuntabilitas pihak pengelola data.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                        <strong className="text-slate-900 text-xs block font-bold">2. Hak Koreksi Cepat (Ps. 6 &amp; Ps. 30)</strong>
                        <p className="text-slate-600 text-[11px]">
                          Berhak melengkapi atau memperbaiki kekeliruan data (NISN, Nama, Nilai) paling lambat <strong>3 x 24 jam</strong> sejak permohonan diterima.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                        <strong className="text-slate-900 text-xs block font-bold">3. Hak Akses &amp; Salinan Gratis (Ps. 7 &amp; Ps. 32)</strong>
                        <p className="text-slate-600 text-[11px]">
                          Berhak memperoleh salinan data dan rekam jejak penilaian secara cuma-cuma (*gratis*) paling lambat <strong>3 x 24 jam</strong>.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                        <strong className="text-slate-900 text-xs block font-bold">4. Hak Penghapusan (Ps. 8, Ps. 43-44)</strong>
                        <p className="text-slate-600 text-[11px]">
                          Berhak mengajukan penghapusan (*right to erasure*) atau pemusnahan data pribadi saat masa retensi berakhir atau tujuan tercapai.
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                        <strong className="text-slate-900 text-xs block font-bold">5. Hak Portabilitas Data (Ps. 13)</strong>
                        <p className="text-slate-600 text-[11px]">
                          Berhak memperoleh dan mentransfer data pribadi dalam format terstruktur yang lazim dibaca mesin (*machine-readable* JSON / Excel .xlsx).
                        </p>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs">
                        <strong className="text-slate-900 text-xs block font-bold">6. Notifikasi Kebocoran Data (Ps. 46)</strong>
                        <p className="text-slate-600 text-[11px]">
                          Sekolah wajib memberitahukan secara tertulis dalam waktu maksimal <strong>3 x 24 jam</strong> jika terjadi kegagalan keamanan data (*data breach*).
                        </p>
                      </div>
                    </div>

                    {/* Kontak DPO & Helpdesk */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h5 className="font-extrabold text-xs text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span>Pejabat Pelindungan Data Pribadi (Data Protection Officer - DPO) SMAN 3 Tumijajar</span>
                      </h5>
                      <p className="text-slate-600 text-[11.5px]">
                        Berdasarkan mandat <strong>Pasal 53 &amp; Pasal 54 UU No. 27 Tahun 2022</strong>, sekolah telah menunjuk tim pelaksana fungsi Pelindungan Data Pribadi untuk melayani pengaduan, verifikasi hak subjek data, dan pengawasan kepatuhan:
                      </p>
                      <div className="flex flex-wrap gap-4 pt-1 text-[11px] font-semibold text-slate-800">
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{school?.email || 'smantitumijajar@gmail.com'}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Helpdesk IT &amp; DPO: 0853-8006-4792</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                          <School className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{school?.namaSekolah || 'SMA Negeri 3 Tumijajar, Kab. Tulang Bawang Barat, Lampung'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer Modal */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Jaminan pasti UU No. 27 Tahun 2022 ini terintegrasi penuh ke seluruh modul SiMantri TA 2026/2027.
                  </span>
                </div>

                <button
                  onClick={() => setShowPrivacyModal(false)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-xs"
                >
                  Saya Mengerti &amp; Setuju
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: PUSAT BANTUAN, HELPDESK IT & KETERANGAN LAYANAN SISTEM TERBARU */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showHelpModal && (
          <div
            onClick={() => setShowHelpModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/75 backdrop-blur-xs cursor-pointer overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full p-6 text-slate-800 cursor-default my-auto max-h-[92vh] flex flex-col overflow-hidden"
            >
              {/* Header Helpdesk */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-700">
                    <HelpCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 inline-block mb-0.5">
                      Pusat Dukungan Teknis &amp; Layanan Terpadu
                    </span>
                    <h3 className="font-black text-lg text-slate-900">
                      Helpdesk IT &amp; Panduan Layanan SiMantri
                    </h3>
                  </div>
                </div>
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="space-y-4 text-xs text-slate-600 overflow-y-auto py-4 pr-1">
                {/* Kontak Resmi Card */}
                <div className="p-4 bg-gradient-to-br from-indigo-50/80 via-white to-slate-50 rounded-2xl border border-indigo-100 space-y-2.5 shadow-2xs">
                  <div className="text-xs font-black text-indigo-950 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-indigo-600" />
                    <span>Saluran Komunikasi Cepat Helpdesk IT Sekolah</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11.5px]">
                    <div className="flex items-center gap-2 font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-normal">WhatsApp / Telepon Helpdesk</span>
                        <span className="font-mono font-bold text-slate-900">0853-8006-4792</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 font-semibold text-slate-800 bg-white p-2.5 rounded-xl border border-slate-200/80">
                      <Mail className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <span className="text-[10px] text-slate-400 block font-normal">Email Resmi DPO &amp; Sekolah</span>
                        <span className="font-mono text-slate-900">{school?.email || 'smantitumijajar@gmail.com'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-1">
                    <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{school?.alamat || 'Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung 34692'}</span>
                  </div>
                </div>

                {/* ============================================================== */}
                {/* KETERANGAN DI LAYANAN DIBAWAHNYA SETELAH HELPDESK (DIROMBAK TOTAL) */}
                {/* ============================================================== */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <h4 className="font-black text-slate-900 text-xs flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" />
                      <span>Katalog &amp; Panduan Operasional Layanan SiMantri Terkini:</span>
                    </h4>
                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                      9 Modul Terintegrasi
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11.5px]">
                    {/* Layanan 1: Presensi Siswa Terpadu (Kesiswaan) */}
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs hover:border-rose-300 transition-colors">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-xs shrink-0">1</span>
                        <span>Presensi Siswa Terpadu &amp; Kesiswaan</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Input absensi harian kelas reaktif (Hadir, Sakit, Izin, Alpha) yang tersambung langsung dengan Master Data Siswa. Dilengkapi deteksi otomatis siswa butuh perhatian khusus (Alpha &ge; 3 hari) untuk rujukan BK, serta rekapitulasi semester dan cetak A4 bertanda tangan Kepala Sekolah.
                      </p>
                    </div>

                    {/* Layanan 2: Master Data Siswa & Rombel Digital */}
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs hover:border-indigo-300 transition-colors">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">2</span>
                        <span>Master Data Siswa &amp; Rombel Digital</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Pengelolaan terpusat 323 siswa aktif di 10 rombel Fase E &amp; F. Mendukung mode edit tabel massal (*Batch Edit Mode*), pengubahan serentak (*Apply to All*), impor Excel (.xlsx), serta AI Vision OCR untuk memindai lembar presensi/buku induk fisik.
                      </p>
                    </div>

                    {/* Layanan 3: Asesmen Kurikulum Merdeka & Bank Soal */}
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs hover:border-emerald-300 transition-colors">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">3</span>
                        <span>Asesmen Sumatif (ASTS/ASAS) &amp; Bank Soal</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Penyusunan asesmen berbasis Capaian Pembelajaran, token ujian terproteksi, kisi-kisi terstandar, kartu soal otomatis, dan berita acara pelaksanaan ruang ujian resmi berverifikasi digital Kepala Sekolah.
                      </p>
                    </div>

                    {/* Layanan 4: Koreksi AI Vision Ultra-Tinggi */}
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs hover:border-purple-300 transition-colors">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">4</span>
                        <span>Koreksi AI Vision Ultra-Tinggi (Google Gemini)</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Pemeriksaan otomatis lembar jawaban esai dan pilihan ganda berbasis citra foto resolusi tinggi melalui proksi server tertutup tanpa melatih model publik. Menyajikan umpan balik analitis dan rubrik Taksonomi Bloom (C1-C6).
                      </p>
                    </div>

                    {/* Layanan 5: Buku Rapor STS/SAS & Ledger Nilai */}
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs hover:border-amber-300 transition-colors">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">5</span>
                        <span>Buku Rapor STS/SAS &amp; Ledger Nilai</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Pengolahan nilai rapor terpadu otomatis tanpa pembulatan parsial liar. Dilengkapi cetak lembar rapor resmi berlogo SMAN 3 Tumijajar &amp; Provinsi Lampung, serta deskripsi Capaian Kompetensi (Tujuan Pembelajaran) Kurikulum Merdeka.
                      </p>
                    </div>

                    {/* Layanan 6: 7 Jurus Guru BK Hebat Kemendikdasmen RI */}
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs hover:border-purple-300 transition-colors">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">6</span>
                        <span>7 Jurus Guru BK Hebat (Zero-Stigma)</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Pendampingan psikologis murid bebas stigma: Jurnal Emosi Harian (EMC2), Habit Tracker 7 Kebiasaan Anak Hebat, radar kerawanan berjenjang (Tier 1-3 MTSS), Roda Pilihan Solusi, notula konseling privat, dan akuntabilitas A4.
                      </p>
                    </div>

                    {/* Layanan 7: Supervisi Manajerial Kepala Sekolah */}
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs hover:border-sky-300 transition-colors">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs shrink-0">7</span>
                        <span>Supervisi Manajerial Kepala Sekolah</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Instrumen evaluasi kinerja pendidik, observasi kelas, telaah perangkat ajar Kurikulum Merdeka, catatan pembinaan guru, serta pemantauan menyeluruh mutu pendidikan sekolah.
                      </p>
                    </div>

                    {/* Layanan 8: Literasi & Numerasi (LitNum) Terjadwal */}
                    <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-1.5 shadow-2xs hover:border-emerald-300 transition-colors">
                      <div className="font-extrabold text-slate-900 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">8</span>
                        <span>Literasi &amp; Numerasi (LitNum) Terjadwal</span>
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">
                        Program pembiasaan literasi dan numerasi harian yang terintegrasi jadwal otomatis real-time, bank latihan kompetensi dasar, dan pelaporan perkembangan literasi siswa.
                      </p>
                    </div>
                  </div>

                  {/* Layanan 9: Arsitektur Sinkronisasi Terenkripsi & Jaminan Keamanan */}
                  <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 border border-slate-800">
                    <div className="flex items-center gap-2 text-indigo-300 font-black text-xs">
                      <Wifi className="w-4 h-4 text-emerald-400" />
                      <span>9. Arsitektur Sinkronisasi Terenkripsi &amp; Ketahanan Jaringan (Pasal 39 UU PDP)</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      Sistem beroperasi dengan <strong>Triple-Layer Data Protection</strong>:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10.5px]">
                      <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
                        <strong className="text-emerald-300 block mb-0.5">a. Enkripsi Transmisi (TLS 1.3)</strong>
                        Semua komunikasi data terenkripsi HTTPS end-to-end tanpa risiko intersepsi pihak ketiga.
                      </div>
                      <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
                        <strong className="text-sky-300 block mb-0.5">b. Offline-First (IndexedDB)</strong>
                        Penyimpanan lokal berkapasitas besar menjaga data tetap tersimpan saat sinyal internet sekolah padam.
                      </div>
                      <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
                        <strong className="text-purple-300 block mb-0.5">c. Real-Time Cloud Sync</strong>
                        Sinkronisasi cloud Firestore aman dengan perlindungan isolasi sesi per-perangkat laboratorium.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Helpdesk */}
              <div className="pt-3 border-t border-slate-200 flex justify-end">
                <button
                  onClick={() => setShowHelpModal(false)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md"
                >
                  Tutup Pusat Bantuan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
