import { CalendarEvent } from '../types';

export interface MonthCalendarData {
  year: number;
  monthIndex: number; // 0-based: 6 = Juli, 7 = Agustus, ... 5 = Juni
  monthName: string;
  semester: 'Ganjil' | 'Genap';
  hbeCount: number; // Hari Belajar Efektif
  weeks: Array<Array<{
    dayNumber: number | null;
    dateString: string | null; // YYYY-MM-DD
    isSunday: boolean;
    isFriday: boolean;
    events: CalendarEvent[];
  }>>;
}

export const DEFAULT_CALENDAR_EVENTS: CalendarEvent[] = [
  // --- SEMESTER GANJIL 2026/2027 ---
  {
    id: 'kaldik-01',
    title: 'Hari Pertama Masuk Sekolah & Pembukaan TP 2026/2027',
    description: 'Upacara pembukaan tahun pelajaran baru dan pengenalan program sekolah.',
    startDate: '2026-07-13',
    endDate: '2026-07-13',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#10b981', // Emerald
  },
  {
    id: 'kaldik-02',
    title: 'Masa Pengenalan Lingkungan Sekolah (MPLS) Peserta Didik Baru',
    description: 'Kegiatan orientasi penguatan karakter dan tata tertib SMAN 3 Tumijajar untuk siswa Kelas X.',
    startDate: '2026-07-13',
    endDate: '2026-07-15',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#059669',
  },
  {
    id: 'kaldik-03',
    title: 'Asesmen Awal Pembelajaran (Diagnostik Kognitif & Non-Kognitif)',
    description: 'Pemetaan kesiapan belajar, gaya belajar, dan kompetensi awal peserta didik.',
    startDate: '2026-07-16',
    endDate: '2026-07-20',
    category: 'asesmen_ujian',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#6366f1', // Indigo
  },
  {
    id: 'kaldik-04',
    title: 'HUT Ke-81 Kemerdekaan Republik Indonesia',
    description: 'Peringatan Hari Kemerdekaan RI dan Libur Nasional resmi.',
    startDate: '2026-08-17',
    endDate: '2026-08-17',
    category: 'libur_nasional',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#ef4444', // Red
  },
  {
    id: 'kaldik-05',
    title: 'Maulid Nabi Muhammad SAW 1448 H',
    description: 'Peringatan Maulid Nabi dan Libur Nasional.',
    startDate: '2026-08-25',
    endDate: '2026-08-25',
    category: 'libur_nasional',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#ef4444',
  },
  {
    id: 'kaldik-06',
    title: 'Deadline Penyerahan Naskah & Kisi-Kisi Soal ASTS Ganjil',
    description: 'Batas akhir guru pengampu menginput dan memvalidasi butir soal ASTS di sistem.',
    startDate: '2026-09-07',
    endDate: '2026-09-07',
    category: 'deadline',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#f97316', // Orange
  },
  {
    id: 'kaldik-07',
    title: 'Pelaksanaan Asesmen Sumatif Tengah Semester (ASTS) Ganjil',
    description: 'Asesmen berbasis essay dan pilihan ganda berbasis komputer/kertas untuk Kelas X, XI, XII.',
    startDate: '2026-09-14',
    endDate: '2026-09-19',
    category: 'asesmen_ujian',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#3b82f6', // Blue
  },
  {
    id: 'kaldik-08',
    title: 'Jeda Tengah Semester & Gelar Karya P5 (Projek Profil Pancasila)',
    description: 'Pameran kreasi dan pementasan projek penguatan profil pelajar Pancasila.',
    startDate: '2026-09-21',
    endDate: '2026-09-25',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#8b5cf6', // Violet
  },
  {
    id: 'kaldik-09',
    title: 'Batas Akhir Unggah Berita Acara ASTS Ganjil',
    description: 'Semua guru pengawas wajib mengunggah lembar berita acara pelaksanaan ujian.',
    startDate: '2026-09-22',
    endDate: '2026-09-22',
    category: 'deadline',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#ea580c',
  },
  {
    id: 'kaldik-10',
    title: 'Batas Akhir Input & Verifikasi Nilai Rapor Sisipan (STS) Ganjil',
    description: 'Batas akhir wali kelas dan guru mapel memfinalkan nilai rapor bayangan tengah semester.',
    startDate: '2026-09-28',
    endDate: '2026-09-28',
    category: 'deadline',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#f97316',
  },
  {
    id: 'kaldik-11',
    title: 'Pembagian Buku Rapor Sisipan (STS) Ganjil ke Orang Tua/Wali',
    description: 'Penyerahan laporan perkembangan belajar tengah semester ganjil.',
    startDate: '2026-10-02',
    endDate: '2026-10-02',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#10b981',
  },
  {
    id: 'kaldik-12',
    title: 'Peringatan Hari Sumpah Pemuda Ke-98',
    description: 'Upacara bendera dan kegiatan literasi kebangsaan sekolah.',
    startDate: '2026-10-28',
    endDate: '2026-10-28',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#0284c7',
  },
  {
    id: 'kaldik-13',
    title: 'Peringatan Hari Pahlawan Nasional',
    description: 'Upacara peringatan hari pahlawan dan penguatan karakter nasionalis.',
    startDate: '2026-11-10',
    endDate: '2026-11-10',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#0284c7',
  },
  {
    id: 'kaldik-14',
    title: 'Deadline Penyerahan Naskah Soal ASAS Ganjil',
    description: 'Batas akhir input paket soal Asesmen Sumatif Akhir Semester ke Bank Soal.',
    startDate: '2026-11-20',
    endDate: '2026-11-20',
    category: 'deadline',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#f97316',
  },
  {
    id: 'kaldik-15',
    title: 'Peringatan Hari Guru Nasional (HGN) & HUT PGRI',
    description: 'Apresiasi dedikasi pendidik dan tenaga kependidikan SMAN 3 Tumijajar.',
    startDate: '2026-11-25',
    endDate: '2026-11-25',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#ec4899',
  },
  {
    id: 'kaldik-16',
    title: 'Pelaksanaan Asesmen Sumatif Akhir Semester (ASAS) Ganjil',
    description: 'Asesmen komprehensif capaian pembelajaran semester ganjil seluruh jenjang kelas.',
    startDate: '2026-11-30',
    endDate: '2026-12-08',
    category: 'asesmen_ujian',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#2563eb',
  },
  {
    id: 'kaldik-17',
    title: 'Pekan Remedial, Pengayaan & Olah Nilai Semester Ganjil',
    description: 'Pelaksanaan program ketuntasan belajar dan rekap nilai akhir rapor.',
    startDate: '2026-12-09',
    endDate: '2026-12-14',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#6366f1',
  },
  {
    id: 'kaldik-18',
    title: 'Batas Akhir Finalisasi Nilai Rapor Semester Ganjil',
    description: 'Batas akhir sinkronisasi nilai akhir rapor dan deskripsi capaian pembelajaran.',
    startDate: '2026-12-15',
    endDate: '2026-12-15',
    category: 'deadline',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#dc2626',
  },
  {
    id: 'kaldik-19',
    title: 'Rapat Pleno Dewan Guru Evaluasi Semester Ganjil',
    description: 'Rapat dinas dewan guru penetapan hasil belajar peserta didik semester ganjil.',
    startDate: '2026-12-16',
    endDate: '2026-12-16',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#0f766e',
  },
  {
    id: 'kaldik-20',
    title: 'Pembagian Buku Laporan Hasil Belajar (Rapor) Semester Ganjil',
    description: 'Penyerahan rapor resmi semester ganjil kepada orang tua/wali siswa.',
    startDate: '2026-12-18',
    endDate: '2026-12-18',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#059669',
  },
  {
    id: 'kaldik-21',
    title: 'Libur Akhir Semester Ganjil & Libur Hari Raya Natal',
    description: 'Libur akhir semester ganjil bagi peserta didik SMAN 3 Tumijajar.',
    startDate: '2026-12-21',
    endDate: '2027-01-02',
    category: 'libur_nasional',
    level: 'sekolah',
    semester: 'Ganjil',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#ef4444',
  },

  // --- SEMESTER GENAP 2026/2027 ---
  {
    id: 'kaldik-22',
    title: 'Hari Pertama Masuk Sekolah Semester Genap TP 2026/2027',
    description: 'Awal KBM efektif semester genap dan koordinasi pembelajaran kelas.',
    startDate: '2027-01-04',
    endDate: '2027-01-04',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#10b981',
  },
  {
    id: 'kaldik-23',
    title: 'Isra Mi\'raj Nabi Muhammad SAW 1448 H',
    description: 'Hari besar keagamaan dan Libur Nasional.',
    startDate: '2027-01-15',
    endDate: '2027-01-15',
    category: 'libur_nasional',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#ef4444',
  },
  {
    id: 'kaldik-24',
    title: 'Tahun Baru Imlek 2578 Kongzili',
    description: 'Hari libur nasional perayaan Tahun Baru Imlek.',
    startDate: '2027-02-06',
    endDate: '2027-02-06',
    category: 'libur_nasional',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#ef4444',
  },
  {
    id: 'kaldik-25',
    title: 'Deadline Penyerahan Naskah Soal ASTS Genap',
    description: 'Batas akhir guru pengampu menginput naskah soal ASTS Genap ke sistem.',
    startDate: '2027-03-01',
    endDate: '2027-03-01',
    category: 'deadline',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#f97316',
  },
  {
    id: 'kaldik-26',
    title: 'Pelaksanaan Asesmen Sumatif Tengah Semester (ASTS) Genap',
    description: 'Asesmen tengah semester genap untuk seluruh tingkat kelas.',
    startDate: '2027-03-08',
    endDate: '2027-03-13',
    category: 'asesmen_ujian',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#3b82f6',
  },
  {
    id: 'kaldik-27',
    title: 'Jeda Tengah Semester & Pameran Seni Budaya / P5',
    description: 'Aktivitas jeda tengah semester dan pameran karya siswa.',
    startDate: '2027-03-15',
    endDate: '2027-03-19',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#8b5cf6',
  },
  {
    id: 'kaldik-28',
    title: 'Hari Raya Nyepi Tahun Baru Saka 1949 & Libur Idul Fitri 1448 H',
    description: 'Hari Libur Nasional Hari Raya Nyepi dan Rangkaian Idul Fitri serta Cuti Bersama.',
    startDate: '2027-03-22',
    endDate: '2027-03-29',
    category: 'libur_nasional',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#ef4444',
  },
  {
    id: 'kaldik-29',
    title: 'Pembagian Buku Rapor Sisipan (STS) Genap',
    description: 'Penyampaian rekapitulasi nilai tengah semester genap kepada orang tua.',
    startDate: '2027-04-02',
    endDate: '2027-04-02',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#10b981',
  },
  {
    id: 'kaldik-30',
    title: 'Asesmen Sumatif Akhir Jenjang (ASAJ / Ujian Sekolah) Kelas XII',
    description: 'Ujian akhir penentu kelulusan peserta didik jenjang Kelas XII SMAN 3 Tumijajar.',
    startDate: '2027-04-05',
    endDate: '2027-04-12',
    category: 'asesmen_ujian',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#dc2626',
  },
  {
    id: 'kaldik-31',
    title: 'Peringatan Hari Kartini',
    description: 'Peringatan emansipasi wanita dan unjuk bakat busana daerah.',
    startDate: '2027-04-21',
    endDate: '2027-04-21',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#ec4899',
  },
  {
    id: 'kaldik-32',
    title: 'Hari Buruh Internasional & Hari Pendidikan Nasional (Hardiknas)',
    description: 'Peringatan hari buruh dan upacara peringatan Hardiknas 2 Mei.',
    startDate: '2027-05-01',
    endDate: '2027-05-02',
    category: 'libur_nasional',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#ef4444',
  },
  {
    id: 'kaldik-33',
    title: 'Rapat Pleno Dewan Guru & Pengumuman Kelulusan Kelas XII',
    description: 'Penetapan dan publikasi surat keterangan kelulusan peserta didik Kelas XII.',
    startDate: '2027-05-05',
    endDate: '2027-05-05',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#0f766e',
  },
  {
    id: 'kaldik-34',
    title: 'Kenaikan Isa Almasih & Hari Raya Waisak 2571',
    description: 'Hari libur resmi keagamaan nasional.',
    startDate: '2027-05-06',
    endDate: '2027-05-20',
    category: 'libur_nasional',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#ef4444',
  },
  {
    id: 'kaldik-35',
    title: 'Deadline Penyerahan Naskah Soal ASAS Genap (Kenaikan Kelas)',
    description: 'Batas akhir input paket soal ASAS Genap untuk Kelas X dan Kelas XI.',
    startDate: '2027-05-24',
    endDate: '2027-05-24',
    category: 'deadline',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#f97316',
  },
  {
    id: 'kaldik-36',
    title: 'Hari Lahir Pancasila',
    description: 'Upacara peringatan hari lahir Pancasila dan Libur Nasional.',
    startDate: '2027-06-01',
    endDate: '2027-06-01',
    category: 'libur_nasional',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#ef4444',
  },
  {
    id: 'kaldik-37',
    title: 'Pelaksanaan Asesmen Sumatif Akhir Semester (ASAS) Genap',
    description: 'Asesmen penentu kenaikan kelas untuk peserta didik Kelas X dan XI.',
    startDate: '2027-06-07',
    endDate: '2027-06-15',
    category: 'asesmen_ujian',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#2563eb',
  },
  {
    id: 'kaldik-38',
    title: 'Pekan Remedial & Verifikasi Kenaikan Kelas',
    description: 'Program remedial bagi peserta didik yang belum tuntas mencapai KKTP.',
    startDate: '2027-06-16',
    endDate: '2027-06-19',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: false,
    color: '#6366f1',
  },
  {
    id: 'kaldik-39',
    title: 'Batas Akhir Input Nilai Rapor Semester Genap',
    description: 'Batas akhir penguncian nilai akhir tahun dan capaian kompetensi.',
    startDate: '2027-06-21',
    endDate: '2027-06-21',
    category: 'deadline',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#dc2626',
  },
  {
    id: 'kaldik-40',
    title: 'Rapat Pleno Dewan Guru Penetapan Kenaikan Kelas',
    description: 'Rapat pleno dewan guru penentuan kenaikan kelas peserta didik Fase E dan Fase F.',
    startDate: '2027-06-23',
    endDate: '2027-06-23',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#0f766e',
  },
  {
    id: 'kaldik-41',
    title: 'Pembagian Buku Rapor Semester Genap (Kenaikan Kelas)',
    description: 'Penyerahan buku rapor hasil belajar akhir tahun kepada orang tua/wali.',
    startDate: '2027-06-25',
    endDate: '2027-06-25',
    category: 'kegiatan_sekolah',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#059669',
  },
  {
    id: 'kaldik-42',
    title: 'Libur Akhir Semester Genap & Libur Akhir Tahun Pelajaran',
    description: 'Masa libur kenaikan kelas bagi seluruh peserta didik.',
    startDate: '2027-06-28',
    endDate: '2027-07-10',
    category: 'libur_nasional',
    level: 'sekolah',
    semester: 'Genap',
    tahunAjaran: '2026/2027',
    isImportant: true,
    color: '#ef4444',
  },
];

export const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/**
 * Check if a date string falls within range [startDate, endDate]
 */
export function isDateInRange(dateStr: string, startDate: string, endDate?: string): boolean {
  if (!dateStr || !startDate) return false;
  const target = new Date(dateStr).getTime();
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : start;
  return target >= start && target <= end;
}

/**
 * Generate monthly matrix structure for academic calendar
 */
export function buildMonthCalendar(
  year: number,
  monthIndex: number, // 0 to 11
  events: CalendarEvent[]
): MonthCalendarData {
  const firstDay = new Date(year, monthIndex, 1);
  const totalDays = new Date(year, monthIndex + 1, 0).getDate();
  const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday

  const monthName = MONTH_NAMES_ID[monthIndex];
  const semester: 'Ganjil' | 'Genap' = monthIndex >= 6 ? 'Ganjil' : 'Genap';

  const weeks: MonthCalendarData['weeks'] = [];
  let currentWeek: MonthCalendarData['weeks'][0] = [];
  let hbeCount = 0;

  // Leading empty cells
  for (let i = 0; i < startingDayOfWeek; i++) {
    currentWeek.push({
      dayNumber: null,
      dateString: null,
      isSunday: i === 0,
      isFriday: i === 5,
      events: [],
    });
  }

  for (let day = 1; day <= totalDays; day++) {
    const padMonth = String(monthIndex + 1).padStart(2, '0');
    const padDay = String(day).padStart(2, '0');
    const dateStr = `${year}-${padMonth}-${padDay}`;
    const dateObj = new Date(year, monthIndex, day);
    const dayOfWeek = dateObj.getDay();
    const isSunday = dayOfWeek === 0;
    const isFriday = dayOfWeek === 5;

    // Find events touching this date
    const dayEvents = events.filter((ev) => isDateInRange(dateStr, ev.startDate, ev.endDate));

    // Check if this is a holiday
    const isHoliday = isSunday || dayEvents.some((ev) => ev.category === 'libur_nasional');
    if (!isHoliday) {
      hbeCount++;
    }

    currentWeek.push({
      dayNumber: day,
      dateString: dateStr,
      isSunday,
      isFriday,
      events: dayEvents,
    });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Trailing empty cells
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push({
        dayNumber: null,
        dateString: null,
        isSunday: currentWeek.length === 0,
        isFriday: currentWeek.length === 5,
        events: [],
      });
    }
    weeks.push(currentWeek);
  }

  return {
    year,
    monthIndex,
    monthName,
    semester,
    hbeCount,
    weeks,
  };
}

/**
 * Get all 12 months for school year (Juli - Juni)
 */
export function buildAcademicYearCalendar(
  startYear: number = 2026,
  events: CalendarEvent[] = DEFAULT_CALENDAR_EVENTS
): MonthCalendarData[] {
  const result: MonthCalendarData[] = [];
  // Semester Ganjil: Juli (6) s.d. Desember (11) of startYear
  for (let m = 6; m <= 11; m++) {
    result.push(buildMonthCalendar(startYear, m, events));
  }
  // Semester Genap: Januari (0) s.d. Juni (5) of startYear + 1
  for (let m = 0; m <= 5; m++) {
    result.push(buildMonthCalendar(startYear + 1, m, events));
  }
  return result;
}
