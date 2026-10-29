import { Announcement } from '../types';

export const DEFAULT_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'anc-1',
    judul: 'Pelaksanaan Asesmen Sumatif Tengah Semester (ASTS) Tahun Ajaran 2026/2027',
    isi: 'Diberitahukan kepada seluruh Bapak/Ibu Guru Mata Pelajaran dan Peserta Didik SMAN 3 Tumijajar bahwa pelaksanaan ASTS Ganjil berlangsung mulai tanggal 19 s.d. 24 Oktober 2026. Mohon kepada seluruh guru untuk memastikan bank soal dan rubrik asesmen telah diperbarui di sistem SiMantri.',
    kategori: 'Ujian & Asesmen',
    targetRole: 'semua',
    penulis: 'Administrator SMAN 3 Tumijajar',
    isPin: true,
    isActive: true,
    createdAt: '12 Oktober 2026',
  },
  {
    id: 'anc-2',
    judul: 'Batas Akhir Penginputan & Koreksi Jawaban ASTS',
    isi: 'Batas akhir pengunggahan hasil scan/foto lembar jawaban dan pengoreksian otomatis AI Vision oleh Guru Mata Pelajaran adalah Sabtu, 31 Oktober 2026 pukul 23:59 WIB untuk penyusunan Rapor STS.',
    kategori: 'Penting',
    targetRole: 'guru',
    penulis: 'Tim Kurikulum & Operator Data',
    isPin: false,
    isActive: true,
    createdAt: '10 Oktober 2026',
  },
  {
    id: 'anc-3',
    judul: 'Akses Portal Peserta Didik & Cek Otentisitas Rapor',
    isi: 'Siswa dan orang tua/wali murid dapat memverifikasi bukti otentik lembar jawaban dan nilai rapor secara langsung dengan memindai QR Code atau memasukkan Kode Otentik pada Portal Peserta Didik SiMantri.',
    kategori: 'Info Sekolah',
    targetRole: 'siswa',
    penulis: 'Tim Teknologi & Informasi SMAN 3 Tumijajar',
    isPin: true,
    isActive: true,
    createdAt: '8 Oktober 2026',
  },
];
