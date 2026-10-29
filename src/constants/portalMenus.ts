import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Layers,
  CalendarDays,
  Archive,
  Calculator,
  UserCheck,
  CheckCircle2,
  FileQuestion,
  ScanEye,
  BarChart3,
  BookOpen,
  Key,
  Laptop,
  ClipboardCheck,
  FileText,
  HeartHandshake,
  Bot,
  Megaphone,
  Settings,
  ShieldCheck,
  ShieldAlert,
  Printer,
  Sparkles,
  Award,
  Compass,
  Activity,
  FolderCog,
  BookOpenCheck,
  TrendingUp,
  FileSpreadsheet,
  Radio,
  DoorOpen,
  Smartphone,
} from 'lucide-react';

export interface PortalMenuItem {
  id: string;
  label: string;
  desc: string;
  icon: any;
  targetView: string;
  module: string;
  examTab?: 'token' | 'credentials' | 'assignments' | 'schedules' | 'cards' | 'broadcast';
  litnumTab?: 'dashboard' | 'analytics' | 'bank_soal' | 'upload_rapor' | 'upload_googleform' | 'rekap';
  supervisiTab?: string;
}

export interface PortalMenuCategory {
  key: string;
  title: string;
  icon: any;
  items: PortalMenuItem[];
}

/**
 * ADMIN & OPERATOR MENUS (Purple Theme Ecosystem)
 * Strictly isolated for Admin, Operator & Curriculum Managers.
 * Zero menu leaks to teacher personal workflows or student exam runners.
 */
export const ADMIN_MENUS: PortalMenuCategory[] = [
  {
    key: 'admin-core',
    title: 'Manajemen Sistem & Kurikulum',
    icon: ShieldCheck,
    items: [
      {
        id: 'admin-hub',
        label: 'Developer Hub & Sistem',
        desc: 'Konfigurasi cloud, database & integrasi sistem',
        icon: FolderCog,
        targetView: 'ai-studio-hub',
        module: 'manajemen-data',
      },
      {
        id: 'admin-settings',
        label: 'Pengaturan Sekolah & Akses',
        desc: 'Identitas madrasah/sekolah, kunci portal & TP aktif',
        icon: Settings,
        targetView: 'settings-direct',
        module: 'manajemen-data',
      },
      {
        id: 'admin-announcements',
        label: 'Pusat Pengumuman Sekolah',
        desc: 'Broadcast informasi resmi ke portal guru & siswa',
        icon: Megaphone,
        targetView: 'announcements',
        module: 'manajemen-data',
      },
    ],
  },
  {
    key: 'admin-master',
    title: 'Master Data Pokok Pendidikan',
    icon: Users,
    items: [
      {
        id: 'master-students',
        label: 'Master Data Peserta Didik',
        desc: 'Kelola NISN, rombel, akun CBT & status siswa',
        icon: Users,
        targetView: 'students',
        module: 'manajemen-data',
      },
      {
        id: 'master-teachers',
        label: 'Master Pendidik & Tenaga Kependidikan',
        desc: 'Data NIP, penugasan mapel, wali kelas & akun GTK',
        icon: GraduationCap,
        targetView: 'teachers',
        module: 'manajemen-data',
      },
      {
        id: 'master-classes',
        label: 'Rombongan Belajar & Mata Pelajaran',
        desc: 'Struktur kelas Fase E & F serta distribusi kurikulum',
        icon: Layers,
        targetView: 'classes-subjects',
        module: 'manajemen-data',
      },
      {
        id: 'master-calendar',
        label: 'Kalender Pendidikan & Jadwal',
        desc: 'Agenda akademik semester ganjil/genap SMAN 3 Tumijajar',
        icon: CalendarDays,
        targetView: 'academic-calendar',
        module: 'manajemen-data',
      },
    ],
  },
  {
    key: 'admin-exam',
    title: 'Pusat Asesmen & Ujian CBT',
    icon: Laptop,
    items: [
      {
        id: 'admin-cbt-mgmt',
        label: 'Manajemen Ujian CBT & Sesi',
        desc: 'Pengaturan ruang, sesi, token & jadwal asesmen',
        icon: Laptop,
        targetView: 'exam-management',
        module: 'manajemen-ujian',
      },
      {
        id: 'admin-exam-rooms',
        label: 'Ruang Ujian Campuran (2 Rombel)',
        desc: 'Plotting siswa 2 kelas per ruang & validasi kursi',
        icon: DoorOpen,
        targetView: 'exam-rooms',
        module: 'manajemen-ujian',
      },
      {
        id: 'admin-exam-proctor-schedules',
        label: 'Jadwal Pengawas (Multi-Hari)',
        desc: 'Distribusi tugas guru, rotasi ruang & deteksi bentrok',
        icon: CalendarDays,
        targetView: 'exam-proctor-schedules',
        module: 'manajemen-ujian',
      },
      {
        id: 'admin-exam-proctor-mobile',
        label: 'Monitoring Pengawas (Mobile/PC)',
        desc: 'Dashboard real-time pengawasan ruang ujian via smartphone, laptop & PC',
        icon: Smartphone,
        targetView: 'exam-proctor-mobile',
        module: 'manajemen-ujian',
      },
      {
        id: 'admin-exam-token',
        label: 'Generator Token Ujian Real-Time',
        desc: 'Rilis dan perpanjang token dinamis peserta',
        icon: Key,
        targetView: 'exam-token',
        module: 'manajemen-ujian',
        examTab: 'token',
      },
      {
        id: 'admin-exam-cards',
        label: 'Cetak Kartu Peserta Ujian',
        desc: 'Generate kartu tanda peserta CBT dengan QR otentik',
        icon: Printer,
        targetView: 'exam-cards',
        module: 'manajemen-ujian',
        examTab: 'cards',
      },
      {
        id: 'admin-exam-attendance',
        label: 'Daftar Hadir & Berita Acara',
        desc: 'Rekap kehadiran proktor, pengawas & peserta tes',
        icon: ClipboardCheck,
        targetView: 'exam-attendance',
        module: 'manajemen-ujian',
      },
      {
        id: 'admin-exam-broadcast',
        label: 'Pusat Pengumuman & Kontrol Insiden',
        desc: 'Broadcast darurat, kompensasi waktu, alihkan ke susulan & auto BAP',
        icon: Radio,
        targetView: 'exam-broadcast',
        module: 'manajemen-ujian',
        examTab: 'broadcast',
      },
      {
        id: 'admin-exam-security',
        label: 'Keamanan Anti-Cheat & PIN Pengawas',
        desc: '6-digit PIN pengawas, alarm Web Audio & monitoring blokir',
        icon: ShieldAlert,
        targetView: 'exam-security',
        module: 'manajemen-ujian',
      },
      {
        id: 'admin-litnum',
        label: 'Pengelolaan Literasi & Numerasi',
        desc: 'Bank soal LitNum mingguan & estimasi Rapor Pendidikan',
        icon: Sparkles,
        targetView: 'litnum-management',
        module: 'litnum',
      },
    ],
  },
  {
    key: 'admin-grades',
    title: 'Evaluasi & Leger Akademik',
    icon: Calculator,
    items: [
      {
        id: 'admin-leger',
        label: 'Leger Nilai & Rekapitulasi Rapor',
        desc: 'Kompilasi nilai akhir TP, ranking & cetak e-Rapor',
        icon: FileSpreadsheet,
        targetView: 'rekap-nilai-dashboard',
        module: 'rekap-nilai',
      },
      {
        id: 'admin-archives',
        label: 'Arsip & Pangkalan Data Nilai',
        desc: 'Penyimpanan permanen rekam jejak asesmen sekolah',
        icon: Archive,
        targetView: 'archives',
        module: 'manajemen-data',
      },
      {
        id: 'admin-supervisi',
        label: 'Monitoring & Supervisi Manajerial',
        desc: 'Pantauan pelaksanaan kurikulum & kinerja akademik',
        icon: Award,
        targetView: 'supervisi-dashboard',
        module: 'supervisi',
      },
    ],
  },
];

/**
 * GURU & GTK MENUS (Blue Theme Ecosystem)
 * Strictly isolated for Teachers, Homeroom Teachers, Counselors (BK), and Principal (Supervisi).
 * Zero menu leaks to Admin infrastructure hubs.
 */
export const GTK_MENUS: PortalMenuCategory[] = [
  {
    key: 'gtk-dashboard',
    title: 'Pusat Kerja Pendidik',
    icon: LayoutDashboard,
    items: [
      {
        id: 'gtk-home',
        label: 'Dashboard Overview Guru',
        desc: 'Ringkasan capaian mengajar, asesmen & jadwal aktif',
        icon: LayoutDashboard,
        targetView: 'dashboard',
        module: 'sumatif',
      },
      {
        id: 'gtk-proctor-mobile',
        label: 'Pengawasan Ujian CBT (Monitoring Pengawas)',
        desc: 'Monitoring peserta ujian, buka kunci PIN & berita acara ruang',
        icon: Smartphone,
        targetView: 'exam-proctor-mobile',
        module: 'manajemen-ujian',
      },
      {
        id: 'gtk-bank-soal',
        label: 'Bank Soal & Kisi-Kisi Asesmen',
        desc: 'Susun naskah soal ASTS/ASAS dengan bantuan AI SiMantri',
        icon: FileQuestion,
        targetView: 'assessments',
        module: 'sumatif',
      },
      {
        id: 'gtk-grading',
        label: 'Koreksi Massal & Lembar Jawab',
        desc: 'Penilaian instan LJK digital & esai terpadu',
        icon: ScanEye,
        targetView: 'mass-grading',
        module: 'sumatif',
      },
      {
        id: 'gtk-item-analysis',
        label: 'Analisis Butir Soal & Daya Pembeda',
        desc: 'Tingkat kesukaran, efektivitas distraktor & reliabilitas',
        icon: BarChart3,
        targetView: 'item-analysis',
        module: 'sumatif',
      },
    ],
  },
  {
    key: 'gtk-evaluasi',
    title: 'Penilaian & Rapor Siswa',
    icon: BookOpen,
    items: [
      {
        id: 'gtk-raport-sts',
        label: 'Cetak Rapor STS Resmi',
        desc: 'Rapor asesmen tengah semester kurikulum merdeka',
        icon: BookOpen,
        targetView: 'raport-sts',
        module: 'sumatif',
      },
      {
        id: 'gtk-student-grades',
        label: 'Daftar Buku Nilai Siswa',
        desc: 'Rekap nilai formatif, sumatif & capaian per KD/TP',
        icon: CheckCircle2,
        targetView: 'student-grades',
        module: 'sumatif',
      },
      {
        id: 'gtk-tugas',
        label: 'Tugas Harian & Portofolio',
        desc: 'Pemberian tugas mandiri dan monitoring pengumpulan',
        icon: BookOpenCheck,
        targetView: 'tugas',
        module: 'tugas',
      },
      {
        id: 'gtk-berita-acara',
        label: 'Berita Acara Pelaksanaan Asesmen',
        desc: 'Dokumentasi resmi ruang ujian untuk validasi kepala sekolah',
        icon: FileText,
        targetView: 'berita-acara',
        module: 'sumatif',
      },
    ],
  },
  {
    key: 'gtk-layanan',
    title: 'Layanan Siswa & Supervisi',
    icon: HeartHandshake,
    items: [
      {
        id: 'gtk-bk-hebat',
        label: 'Pusat BK Hebat Terpadu',
        desc: '7 Jurus Kemendikdasmen, peta kerawanan & konseling murid',
        icon: HeartHandshake,
        targetView: 'bimbingan-konseling',
        module: 'bk-hebat',
      },
      {
        id: 'gtk-kesiswaan',
        label: 'Kesiswaan & Presensi Harian',
        desc: 'Monitoring absensi kelas, keterlambatan & pembinaan',
        icon: UserCheck,
        targetView: 'kesiswaan',
        module: 'kesiswaan',
      },
      {
        id: 'gtk-supervisi-view',
        label: 'Supervisi Pembelajaran Kepsek',
        desc: 'Pemantauan dokumen ajar & evaluasi proses mengajar',
        icon: Award,
        targetView: 'supervisi-dashboard',
        module: 'supervisi',
      },
    ],
  },
];

/**
 * STUDENT MENUS (Orange Theme Ecosystem)
 * Clean, focused, zero badges.
 */
export const STUDENT_MENUS = [
  {
    id: 'student-cbt',
    label: 'Ruang Ujian CBT Siswa',
    desc: 'Pelaksanaan ujian sumatif, ASTS & ASAS resmi',
    icon: Laptop,
    path: '/portal-siswa',
  },
  {
    id: 'student-litnum',
    label: 'Asesmen CBT LitNum Mingguan',
    desc: 'Uji kemampuan literasi & numerasi Selasa & Rabu',
    icon: Sparkles,
    path: '/ujian-litnum',
  },
];
