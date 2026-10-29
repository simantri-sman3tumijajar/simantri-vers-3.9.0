import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Compass,
  Award,
  BookOpen,
  Layers,
  CheckCircle2,
  HeartHandshake,
  ShieldCheck,
  Brain,
  Smile,
  Activity,
  FileText,
  Lock,
  GraduationCap,
  Users,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../context/AppContext';

interface DeepLearningGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeepLearningGuideModal: React.FC<DeepLearningGuideModalProps> = ({ isOpen, onClose }) => {
  const { currentUser } = useApp();

  const isGuruBK = Boolean(
    currentUser?.isGuruBK ||
    currentUser?.mataPelajaran?.some(
      (m) => m.toLowerCase().includes('bimbingan') || m.toLowerCase() === 'bk'
    )
  );

  const [activeTab, setActiveTab] = useState<'bk' | 'deep_learning'>(isGuruBK ? 'bk' : 'deep_learning');

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(isGuruBK ? 'bk' : 'deep_learning');
    }
  }, [isOpen, isGuruBK]);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // DATA: 7 JURUS GURU BK HEBAT (KEMENDIKDASMEN RI)
  // -------------------------------------------------------------
  const jurusBKList = [
    {
      no: '1',
      title: 'Jurus 1: Kenali Potensi Siswa',
      badge: 'Strength-Based',
      icon: Brain,
      color: 'from-purple-600 to-indigo-600',
      tagColor: 'bg-purple-100 text-purple-900 border-purple-200',
      desc: 'Asesmen diagnostik non-kognitif, modalitas gaya belajar (Visual, Auditori, Kinestetik, Multimodal), dan kecerdasan majemuk.',
      details: [
        'Fokus pada aset dan keunikan positif murid, bukan mencari kelemahan/defisit.',
        'Mengidentifikasi bakat alami, minat ekstrakurikuler, dan preferensi belajar.',
        'Membantu guru mata pelajaran menyesuaikan diferensiasi pembelajaran di kelas.',
      ],
    },
    {
      no: '2',
      title: 'Jurus 2: Kelola Emosi Siswa & Diri',
      badge: 'Framework EMC2',
      icon: Smile,
      color: 'from-emerald-600 to-teal-600',
      tagColor: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      desc: 'Pengembangan kompetensi sosial-emosional dengan kerangka EMC2 (Empathy, Mindfulness, Compassion, Critical Inquiry).',
      details: [
        'Emotion Check-In harian untuk memvalidasi suasana hati murid.',
        'Latihan kesadaran penuh (Mindfulness) dengan teknik pernapasan STOP.',
        'Pemanfaatan media reflektif "Roda Pilihan Solusi" untuk regulasi emosi mandiri.',
      ],
    },
    {
      no: '3',
      title: 'Jurus 3: Tumbuhkan Resiliensi Siswa',
      badge: 'Growth Mindset',
      icon: Lock,
      color: 'from-rose-600 to-pink-600',
      tagColor: 'bg-rose-100 text-rose-900 border-rose-200',
      desc: 'Membangun daya lenting (resiliensi) agar murid mampu bangkit dari tekanan sosial, stres akademik, dan kegagalan.',
      details: [
        'Ruang konseling individual yang aman, suportif, dan ramah anak.',
        'Menjunjung tinggi asas kerahasiaan profesi bimbingan konseling (Confidentiality).',
        'Penyusunan rencana aksi bangkit terukur (Resilience & Coping Action Plan).',
      ],
    },
    {
      no: '4',
      title: 'Jurus 4: Jaga Konsistensi Karakter',
      badge: '7 Kebiasaan Hebat',
      icon: TrendingUp,
      color: 'from-indigo-600 to-blue-600',
      tagColor: 'bg-indigo-100 text-indigo-900 border-indigo-200',
      desc: 'Pembiasaan karakter luhur anak Indonesia melalui pemantauan kebiasaan harian (Habit Tracker) terukur.',
      details: [
        '1. Bangun pagi & beribadah tepat waktu &bull; 2. Berpikir positif & tersenyum',
        '3. Literasi membaca 15 menit &bull; 4. Santun menghargai sesama',
        '5. Disiplin tugas &bull; 6. Jaga kebersihan raga &bull; 7. Refleksi syukur sebelum tidur',
      ],
    },
    {
      no: '5',
      title: 'Jurus 5: Petakan Tantangan & Deteksi Dini',
      badge: 'Peta Kerawanan',
      icon: AlertTriangle,
      color: 'from-amber-600 to-orange-600',
      tagColor: 'bg-amber-100 text-amber-900 border-amber-200',
      desc: 'Early warning system prediktif untuk memitigasi risiko putus sekolah, kecemasan akut, perundungan, dan kekerasan.',
      details: [
        'Tier 3 (Siaga Merah): Kasus mendesak memerlukan intervensi konseling intensif.',
        'Tier 2 (Waspada Kuning): Fluktuasi emosi & penurunan tren belajar yang perlu pendampingan.',
        'Tier 1 (Hijau): Kondisi stabil dengan bimbingan kelompok dan preventif universal.',
      ],
    },
    {
      no: '6',
      title: 'Jurus 6: Bangun Kolaborasi & Kemitraan',
      badge: 'Sistem MTSS',
      icon: Users,
      color: 'from-sky-600 to-cyan-600',
      tagColor: 'bg-sky-100 text-sky-900 border-sky-200',
      desc: 'Alur rujukan berjenjang Multi-Tiered System of Supports melibatkan wali kelas, guru mapel, orang tua, dan ahli luar.',
      details: [
        'Tiket rujukan kasus kolaboratif tanpa melabeli atau memberi stigma buruk pada murid.',
        'Komunikasi berkala bersama orang tua melalui konsultasi dan kunjungan rumah (Home Visit).',
        'Rujukan profesional ke psikolog klinis, psikiater, atau lembaga perlindungan anak bila diperlukan.',
      ],
    },
    {
      no: '7',
      title: 'Jurus 7: Evaluasi & Akuntabilitas Layanan',
      badge: 'Akuntabilitas A4',
      icon: CheckCircle2,
      color: 'from-emerald-600 to-green-700',
      tagColor: 'bg-emerald-100 text-emerald-900 border-emerald-200',
      desc: 'Penilaian ketercapaian program BK, refleksi mutu intervensi, dan pelaporan manajerial supervisi resmi.',
      details: [
        'Penyusunan rekapitulasi layanan formatif dan evaluasi dampak bimbingan.',
        'Laporan akuntabilitas resmi format cetak A4 untuk Kepala Sekolah dan Pengawas Pembina.',
        'Perbaikan berkelanjutan kurikulum layanan BK berbasis bukti data otentik.',
      ],
    },
  ];

  const pilarBK = [
    {
      title: '1. Dari "Polisi Sekolah" ke "Sahabat Bertumbuh"',
      desc: 'Guru BK bukan penghukum atau pencatat poin pelanggaran tata tertib, melainkan safe space dan pendamping psikologis (well-being) murid.',
    },
    {
      title: '2. Pendekatan Berbasis Kekuatan (Strength-Based)',
      desc: 'Fokus menggali dan menumbuhkan aset potensi positif murid, bukan melabeli atau mencari-cari kelemahan/kesalahan.',
    },
    {
      title: '3. Kemitraan Kolaboratif Berjenjang (MTSS)',
      desc: 'Tidak bekerja sendirian, melainkan berjejaring aktif bersama wali kelas, guru mapel, orang tua, dan tenaga ahli profesional.',
    },
  ];

  const bidangLayananBK = [
    { name: 'Bimbingan Pribadi', desc: 'Regulasi diri, kesehatan mental, pembentukan integritas, dan penerimaan diri.' },
    { name: 'Bimbingan Sosial', desc: 'Komunikasi asertif, pencegahan perundungan (anti-bullying), dan resolusi konflik.' },
    { name: 'Bimbingan Belajar', desc: 'Manajemen waktu belajar, mengatasi prokrastinasi, dan teknik asesmen efektif.' },
    { name: 'Bimbingan Karir & Studi', desc: 'Pemetaan kuota eligible SNBP, simulasi SNBT/UTBK, sekolah kedinasan, dan vokasi.' },
  ];

  // -------------------------------------------------------------
  // DATA: PEMBELAJARAN MENDALAM (DEEP LEARNING) UNTUK MAPEL / ADMIN
  // -------------------------------------------------------------
  const dimensiList = [
    { name: 'Keimanan & Ketakwaan', desc: 'Fokus pada nilai spiritual, etika ketuhanan, dan integritas nurani' },
    { name: 'Kewargaan', desc: 'Kesadaran norma sosial, hukum, cinta tanah air, dan pencegahan korupsi' },
    { name: 'Kreativitas', desc: 'Kemampuan eksplorasi solusi inovatif dan gagasan baru bermakna' },
    { name: 'Penalaran Kritis', desc: 'Analisis logis, pemecahan masalah kompleks, dan evaluasi data' },
    { name: 'Kolaborasi', desc: 'Bekerja sama secara sinergis, saling menghargai, dan sportif' },
    { name: 'Kemandirian', desc: 'Inisiatif belajar mandiri, disiplin waktu, dan ketekunan watak' },
    { name: 'Kesehatan', desc: 'Kesehatan fisik, mental, pengelolaan emosi, dan kendali diri' },
    { name: 'Komunikasi', desc: 'Penyampaian gagasan secara terstruktur, santun, dan efektif' },
  ];

  const prinsipList = [
    { title: 'Berkesadaran', desc: 'Pembelajaran disadari oleh siswa sebagai kebutuhan diri untuk bertumbuh, bukan sekadar hafalan mekanis.' },
    { title: 'Bermakna', desc: 'Materi terhubung dengan kehidupan nyata, pemecahan masalah kontekstual di lingkungan sekitar.' },
    { title: 'Menggembirakan', desc: 'Suasana asesmen yang menantang namun membangkitkan rasa ingin tahu dan kepuasan belajar.' },
  ];

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 md:p-8 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto text-slate-800 cursor-default"
        >
          {/* Header */}
          <div
            className={`p-6 text-white flex items-start justify-between shrink-0 ${
              activeTab === 'bk'
                ? 'bg-gradient-to-r from-purple-950 via-indigo-900 to-slate-900 border-b border-purple-800/40'
                : 'bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 border-b border-slate-800'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`p-2.5 rounded-2xl border shadow-inner ${
                  activeTab === 'bk'
                    ? 'bg-purple-500/20 border-purple-400/40 text-purple-300'
                    : 'bg-indigo-500/20 border-indigo-400/30 text-amber-400'
                }`}
              >
                {activeTab === 'bk' ? <HeartHandshake className="w-7 h-7" /> : <Sparkles className="w-7 h-7" />}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-black uppercase tracking-wider ${
                      activeTab === 'bk'
                        ? 'bg-purple-500/30 text-purple-200 border border-purple-400/40'
                        : 'bg-indigo-500/30 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {activeTab === 'bk' ? 'Sumber Resmi Kemendikdasmen RI' : 'Standar Kurikulum Merdeka'}
                  </span>
                  <span className="text-[11px] text-slate-300 font-mono">&bull; SMA Negeri 3 Tumijajar</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {activeTab === 'bk'
                    ? '7 Jurus Guru BK Hebat (Kemendikdasmen RI)'
                    : 'Kerangka Pembelajaran Mendalam (Deep Learning)'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {activeTab === 'bk'
                    ? 'Pedoman Resmi Bimbingan Konseling & Pendampingan Resiliensi Murid'
                    : 'Standar Asesmen ASTS & ASAS Fase E & F SMAN 3 Tumijajar'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tab Switcher (Memudahkan Guru BK melihat panduan resmi BK atau Pembelajaran Mendalam) */}
          <div className="bg-slate-100 p-2 border-b border-slate-200 flex items-center justify-between gap-2 px-6 shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('bk')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'bk'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <HeartHandshake className="w-3.5 h-3.5" />
                <span>7 Jurus Guru BK Hebat</span>
                <span className="text-[9.5px] px-1.5 py-0.2 bg-white/20 rounded font-bold">Kemendikdasmen</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('deep_learning')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                  activeTab === 'deep_learning'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Pembelajaran Mendalam (Mapel)</span>
                <span className="text-[9.5px] px-1.5 py-0.2 bg-white/20 rounded font-bold">8 Dimensi</span>
              </button>
            </div>

            <span className="hidden sm:inline-block text-[11px] font-bold text-slate-500">
              {activeTab === 'bk' ? 'Khusus Layanan Bimbingan Konseling' : 'Khusus Asesmen Mata Pelajaran'}
            </span>
          </div>

          {/* Modal Content Body */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 min-h-0 overscroll-contain">
            {activeTab === 'bk' ? (
              // ==============================================================
              // VIEW 1: 7 JURUS GURU BK HEBAT (KEMENDIKDASMEN RI)
              // ==============================================================
              <div className="space-y-6">
                {/* 3 Transformasi Paradigma BK */}
                <div className="p-5 rounded-2xl bg-purple-50/70 border border-purple-200 space-y-3">
                  <div className="flex items-center gap-2 text-purple-950 font-black text-sm">
                    <ShieldCheck className="w-5 h-5 text-purple-700" />
                    <span>3 Transformasi Paradigma Bimbingan Konseling (Kemendikdasmen RI)</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {pilarBK.map((p, idx) => (
                      <div key={idx} className="p-3.5 rounded-xl bg-white border border-purple-200/80 shadow-2xs space-y-1">
                        <h5 className="font-extrabold text-xs text-purple-900 leading-snug">{p.title}</h5>
                        <p className="text-[11px] text-slate-600 leading-relaxed">{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 7 Jurus Rinci Grid */}
                <div>
                  <h4 className="text-sm font-black text-slate-900 mb-3 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-purple-600" />
                    <span>Rincian 7 Jurus Guru BK Hebat Berdasarkan Sumber Resmi Kemendikdasmen:</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {jurusBKList.map((j) => {
                      const Icon = j.icon;
                      return (
                        <div
                          key={j.no}
                          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 shadow-2xs hover:shadow-xs transition-all space-y-2.5 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center font-black text-xs shrink-0">
                                  <Icon className="w-4 h-4" />
                                </div>
                                <h5 className="font-black text-xs text-slate-900">{j.title}</h5>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[9.5px] font-black border ${j.tagColor}`}>
                                {j.badge}
                              </span>
                            </div>

                            <p className="text-[11.5px] text-slate-600 leading-relaxed font-medium">
                              {j.desc}
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                            {j.details.map((dtl, i) => (
                              <div key={i} className="flex items-start gap-1.5 leading-snug">
                                <span className="text-purple-600 font-bold">&bull;</span>
                                <span dangerouslySetInnerHTML={{ __html: dtl }} />
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 4 Bidang Layanan & Kode Etik */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                    <h5 className="font-bold text-xs text-slate-900 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      <span>4 Bidang Layanan Pokok Bimbingan Konseling</span>
                    </h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {bidangLayananBK.map((b, i) => (
                        <div key={i} className="p-2.5 bg-white rounded-xl border border-slate-200">
                          <span className="font-bold text-slate-900 block text-[11.5px]">{b.name}</span>
                          <span className="text-[10px] text-slate-500 leading-tight mt-0.5 block">{b.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2.5">
                    <div className="flex items-center gap-2 text-rose-950 font-bold text-xs">
                      <Lock className="w-4 h-4 text-rose-600" />
                      <span>Kode Etik Kerahasiaan (Confidentiality Code)</span>
                    </div>
                    <p className="text-[11.5px] text-rose-900/90 leading-relaxed">
                      Catatan wawancara konseling pribadi bersifat sangat rahasia. Informasi hanya boleh dibagikan kepada wali kelas dalam bentuk rekomendasi umum (*general feedback*) tanpa membuka rahasia pribadi murid, kecuali ada indikasi bahaya keselamatan jiwa murid.
                    </p>
                    <div className="pt-2 flex items-center gap-2 text-[10.5px] font-bold text-rose-800">
                      <CheckCircle2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Perlindungan Privasi &amp; Kepercayaan Penuh Siswa Binaan</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // ==============================================================
              // VIEW 2: PEMBELAJARAN MENDALAM (DEEP LEARNING UNTUK MAPEL)
              // ==============================================================
              <div className="space-y-6">
                {/* Prinsip Banner */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-indigo-600" />
                    <span>3 Prinsip Utama Pembelajaran Mendalam</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {prinsipList.map((p, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="font-bold text-sm text-slate-900 mb-1 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                          {p.title}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{p.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 8 Dimensi Profil Lulusan */}
                <div>
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    <span>8 Dimensi Profil Lulusan Pembelajaran Mendalam</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {dimensiList.map((dim, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80">
                        <div className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{dim.name}</span>
                        </div>
                        <p className="text-[11px] text-amber-900/80 mt-1 leading-snug">{dim.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                {activeTab === 'bk'
                  ? 'Pedoman Resmi Kemendikdasmen RI untuk Bimbingan Konseling SMAN 3 Tumijajar'
                  : 'Pedoman Resmi Asesmen Sumatif Kurikulum Merdeka SMAN 3 Tumijajar'}
              </span>
            </div>

            <button
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs transition-colors shadow-xs cursor-pointer ${
                activeTab === 'bk'
                  ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              Tutup Panduan
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
