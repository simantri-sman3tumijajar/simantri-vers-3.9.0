import { Teacher, AppState } from '../types';

/**
 * Pemetaan nama resmi modul ke tampilan teks ramah pengguna yang profesional
 */
export function getModuleDisplayName(moduleKey?: string): string {
  switch (moduleKey) {
    case 'sumatif':
      return 'Asesmen Sumatif & Koreksi AI';
    case 'rekap-nilai':
      return 'Rekap Nilai & Leger Rapor';
    case 'kesiswaan':
      return 'Presensi & Kesiswaan';
    case 'bk-hebat':
      return 'BK Hebat (Konseling)';
    case 'manajemen-ujian':
      return 'Pusat Ujian CBT';
    case 'pengawas':
      return 'Pengawas Ujian CBT';
    case 'supervisi':
      return 'Supervisi Akademik (Kepsek)';
    case 'litnum':
      return 'Literasi & Numerasi';
    case 'tugas':
    case 'tugas-harian':
      return 'Penugasan Harian Siswa';
    case 'manajemen-data':
      return 'Pangkalan Data Pokok';
    case 'kalender-akademik':
      return 'Kalender Pendidikan';
    case 'berita-acara':
      return 'Berita Acara Ujian';
    case 'arsip-digital':
      return 'Arsip Dokumen Sekolah';
    case 'portal':
    default:
      return 'Portal Layanan Terpadu';
  }
}

/**
 * Format selisih waktu aktivitas terakhir menjadi teks humanis dan real-time
 */
export function formatTeacherLastActive(lastActiveIso?: string): string {
  if (!lastActiveIso) return 'Aktif Hari Ini';
  try {
    const diffMs = Date.now() - new Date(lastActiveIso).getTime();
    if (diffMs < 0 || isNaN(diffMs)) return 'Baru saja aktif';
    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 45) return 'Baru saja aktif';
    if (diffSec < 120) return '1 menit lalu';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} menit lalu`;
    return new Date(lastActiveIso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return 'Aktif Hari Ini';
  }
}

/**
 * Mendapatkan deskripsi aktivitas real-time yang akurat dan detail berdasarkan tampilan (view),
 * informasi asesmen aktif, modul yang sedang dibuka, serta profil penugasan guru.
 */
export function getActivityDescription(
  view?: string,
  assessmentInfo?: string | null,
  module?: string,
  teacher?: Teacher | null,
  state?: AppState | null
): string {
  const infoSuffix = assessmentInfo ? ` (${assessmentInfo})` : '';

  // 1. Tangani halaman spesifik berdasarkan View
  switch (view) {
    case 'mass-grading':
      return assessmentInfo
        ? `Sedang Mengoreksi Esai Siswa${infoSuffix}`
        : 'Sedang Memeriksa & Mengoreksi Lembar Jawaban Siswa';

    case 'assessments':
      return assessmentInfo
        ? `Menyusun Bank Soal & Kisi-Kisi${infoSuffix}`
        : 'Mengelola Bank Soal & Kisi-Kisi Asesmen Sekolah';

    case 'item-analysis':
      return assessmentInfo
        ? `Menganalisis Daya Pembeda & Butir Soal${infoSuffix}`
        : 'Menganalisis Butir Soal & Statistik Tingkat Kesukaran';

    case 'raport-sts':
      return assessmentInfo
        ? `Mengolah Nilai & Menyiapkan Rapor STS${infoSuffix}`
        : 'Mengolah Capaian Nilai & Menyiapkan Format Rapor STS';

    case 'student-grades':
      return assessmentInfo
        ? `Memeriksa Roster Nilai Peserta Didik${infoSuffix}`
        : 'Memeriksa Rekapitulasi Roster Nilai Siswa';

    case 'rekap-nilai-leger':
      return 'Menginput Capaian TP & Leger Nilai Mata Pelajaran';

    case 'rekap-nilai-dashboard':
    case 'rekap-nilai-olahranking':
      return 'Meninjau Capaian Nilai & Rekapitulasi Leger Rapor';

    case 'rekap-nilai-erapor':
      return 'Sinkronisasi Data Nilai ke Format e-Rapor';

    case 'rekap-nilai-cp':
      return 'Menyelaraskan Capaian Pembelajaran (CP) & TP Mata Pelajaran';

    case 'rekap-nilai-cetak':
      return 'Menyiapkan & Mencetak Lembar Hasil Belajar Siswa';

    case 'student-attendance':
    case 'kesiswaan':
    case 'kesiswaan-input':
    case 'kesiswaan-rekap':
      return 'Mencatat & Memverifikasi Presensi Kehadiran Siswa Real-Time';

    case 'kesiswaan-ringkasan':
      return 'Memantau Ringkasan Kehadiran & Kedisiplinan Siswa Rombel';

    case 'bk-dashboard':
    case 'bimbingan-konseling':
    case 'bk-konseling':
      return 'Layanan Konseling & Pendampingan Siswa (BK Hebat 7 Jurus)';

    case 'bk-emosi':
      return 'Memantau Log Emosi & Kesejahteraan Psikologis Peserta Didik';

    case 'bk-kebiasaan':
      return 'Memantau Pembiasaan Karakter & Disiplin Positif Siswa';

    case 'bk-rujukan':
    case 'bk-kerawanan':
      return 'Menangani Rujukan Kasus & Pemetaan Kerawanan Peserta Didik';

    case 'bk-karir':
      return 'Layanan Konsultasi Minat, Bakat, & Perencanaan Karir Siswa';

    case 'proctor-monitor':
    case 'exam-proctor-mobile':
    case 'standalone-supervisor':
      return 'Live Monitoring Layar & Peserta Ujian CBT di Ruang Kelas';

    case 'exam-token':
      return 'Mengelola & Merilis Token Sesi Ujian CBT Aktif';

    case 'exam-credentials':
      return 'Verifikasi Kredensial Akun & Password Ujian Siswa';

    case 'exam-cards':
      return 'Memeriksa & Mencetak Kartu Peserta Ujian Siswa';

    case 'exam-schedules':
      return 'Meninjau Jadwal Pelaksanaan & Pembagian Sesi Ujian CBT';

    case 'exam-assignments':
      return 'Meninjau Penugasan Pembuatan Paket Soal CBT Guru';

    case 'exam-attendance':
      return 'Merekap Presensi & Berita Acara Ruang Ujian CBT';

    case 'exam-security':
      return 'Audit Keamanan Sistem & Protokol Anti-Curang CBT';

    case 'exam-rooms':
    case 'exam-multi-classes':
      return 'Konfigurasi Denah Ruang & Distribusi Meja Ujian CBT';

    case 'exam-proctor-schedules':
      return 'Menyelaraskan Jadwal Tugas Pengawas Ruang CBT';

    case 'exam-management':
    case 'exam-management-dashboard':
      return 'Pusat Kendali Pelaksanaan Asesmen CBT Terpadu';

    case 'litnum-management':
    case 'litnum':
      return 'Memantau Hasil & Analisis Asesmen Literasi-Numerasi Siswa';

    case 'tugas-harian':
      return 'Mengelola Penugasan Harian & Evaluasi Tugas Mandiri Siswa';

    case 'academic-calendar':
      return 'Meninjau Agenda Akademik & Kalender Pendidikan Sekolah';

    case 'berita-acara':
      return 'Menyusun & Menandatangani Berita Acara Pelaksanaan Ujian';

    case 'archives':
      return 'Mengakses Berkas Arsip Penilaian & Dokumen Sekolah';

    case 'teachers':
    case 'master-teachers':
      return 'Meninjau Pangkalan Data Dewan Guru & Sesi GTK';

    case 'students':
    case 'master-students':
      return 'Mengelola Data Pokok Peserta Didik & Rombongan Belajar';

    case 'classes-subjects':
    case 'master-classes':
      return 'Mengonfigurasi Rombel Kelas & Struktur Mata Pelajaran';

    case 'supervisi-kepsek':
    case 'supervisi-dashboard':
    case 'supervisi-guru':
    case 'supervisi-asesmen':
      return 'Supervisi Manajerial & Peninjauan Mutu Pembelajaran (Kepsek)';

    case 'feedback':
    case 'feedback-center':
      return 'Meninjau Pusat Aspirasi & Masukan Dewan Guru';

    case 'announcements':
      return 'Mengelola Papan Pengumuman & Informasi Sekolah';

    case 'ai-studio-hub':
      return 'Pemeliharaan Sistem & Status Layanan Server AI';

    case 'portal':
      return 'Navigasi Portal Layanan Terpadu SiMantri';
  }

  // 2. Jika berada di Beranda / Dashboard atau halaman umum, sesuaikan dengan modul aktif
  const effectiveMod = module || teacher?.activeModule || 'sumatif';
  if (effectiveMod === 'kesiswaan') {
    return 'Memantau Rekapitulasi Presensi & Kedisiplinan Siswa';
  }
  if (effectiveMod === 'bk-hebat') {
    return 'Layanan Konseling & Pemantauan Karakter Siswa (BK Hebat)';
  }
  if (effectiveMod === 'rekap-nilai') {
    return 'Memantau Ringkasan Capaian Nilai & Leger Rapor Sekolah';
  }
  if (effectiveMod === 'manajemen-ujian' || effectiveMod === 'pengawas') {
    return 'Pusat Kendali & Pemantauan Sesi Ujian CBT Sekolah';
  }
  if (effectiveMod === 'litnum') {
    return 'Memantau Capaian Literasi & Numerasi Peserta Didik';
  }
  if (effectiveMod === 'tugas' || effectiveMod === 'tugas-harian') {
    return 'Memantau Penugasan Harian & Evaluasi Tugas Siswa';
  }
  if (effectiveMod === 'supervisi') {
    return 'Supervisi Akademik & Peninjauan Kinerja Dewan Guru';
  }
  if (effectiveMod === 'manajemen-data') {
    return 'Pengelolaan Pangkalan Data Pokok Sekolah';
  }
  if (effectiveMod === 'portal') {
    return 'Navigasi Portal Layanan Terpadu SiMantri';
  }

  // 3. Untuk modul Sumatif / Default: periksa data autentik guru di state (draft / bank soal / penugasan)
  if (state && teacher) {
    const teacherAsms = (state.assessments || []).filter(
      (a) =>
        a.guruId === teacher.id ||
        (teacher.nama && a.guruPengampu?.toLowerCase() === teacher.nama.toLowerCase()) ||
        (teacher.mataPelajaran && teacher.mataPelajaran.includes(a.mataPelajaran))
    );

    // Cek apakah ada draf atau submission yang belum selesai dinilai
    const draftAsm = teacherAsms.find((a) => {
      const hasDraftSubmissions = Array.isArray(a.submissions) && a.submissions.some((s) => s && s.statusKoreksi?.toLowerCase().includes('draf'));
      const hasUnsubmitted = Array.isArray(a.studentIds) && a.studentIds.length > (a.submissions?.length || 0);
      return hasDraftSubmissions || (a.submissions && a.submissions.length > 0 && hasUnsubmitted);
    });

    if (draftAsm) {
      return `Sedang Mengoreksi Draf Jawaban (${draftAsm.mataPelajaran} • Kelas ${draftAsm.kelas})`;
    }

    // Cek penugasan CBT di Exam Management
    const teacherCbtAssign = (state.examManagement?.teacherAssignments || []).find((asn) => {
      return (
        asn.teacherId === teacher.id ||
        (teacher.nama && asn.teacherName?.toLowerCase() === teacher.nama.toLowerCase())
      );
    });

    if (teacherCbtAssign) {
      return `Penyusunan Paket Soal CBT ${teacherCbtAssign.category} (${teacherCbtAssign.subjectName})`;
    }

    // Cek asesmen yang sudah selesai dinilai
    const doneAsm = teacherAsms.find((a) => Array.isArray(a.submissions) && a.submissions.length > 0);
    if (doneAsm) {
      return `Meninjau Hasil Nilai Asesmen (${doneAsm.mataPelajaran} • Kelas ${doneAsm.kelas})`;
    }
  }

  // 4. Periksa peran khusus guru
  if (teacher?.isGuruBK || teacher?.mataPelajaran?.some((m) => m.toLowerCase().includes('bimbingan') || m.toLowerCase() === 'bk')) {
    return 'Layanan Bimbingan Konseling & Pendampingan Siswa';
  }
  if (teacher?.isTimKesiswaan || teacher?.role === 'kesiswaan') {
    return 'Monitoring Presensi Harian Siswa & Rekap Kehadiran';
  }
  if (teacher?.isKepalaSekolah || teacher?.role === 'kepala_sekolah') {
    return 'Supervisi Manajerial & Peninjauan Mutu Pembelajaran';
  }
  if (teacher?.isOperator || teacher?.role === 'operator') {
    return 'Pemutakhiran Data Pokok Siswa & Sistem Sekolah';
  }
  if (teacher?.isAdmin || teacher?.role === 'admin') {
    return 'Administrasi Sistem & Pengawasan Portal SiMantri';
  }
  if (teacher?.isProctor || teacher?.isProctorEnabled) {
    return 'Pengawas Ujian CBT Aktif di Ruang Ujian';
  }
  if (teacher?.isWaliKelas) {
    return `Wali Kelas ${teacher.waliKelasName || ''}: Memantau Capaian Belajar Siswa`;
  }
  if (teacher?.mataPelajaran && teacher.mataPelajaran.length > 0) {
    return `Guru Pengampu: Aktif di Portal Layanan (${teacher.mataPelajaran[0]})`;
  }

  return 'Sesi Terhubung Aktif • Standby di Sistem Sekolah';
}

export interface RealtimeTeacherActivityInfo {
  activity: string;
  moduleKey: string;
  moduleName: string;
  detailBadge?: string;
  isSelf: boolean;
  timeAgoText: string;
  isOnline: boolean;
}

/**
 * Resolver lengkap untuk menentukan aktivitas real-time guru tanpa teks palsu (anti-AI slop / anti-generic text).
 * Selaras dengan pantauan sebenarnya guru di seluruh modul aplikasi SiMantri.
 */
export function resolveTeacherRealtimeActivity(
  teacher: Teacher,
  state?: AppState | null,
  currentUser?: Teacher | null,
  currentLocalModule?: string,
  currentLocalView?: string
): RealtimeTeacherActivityInfo {
  const isOnline = teacher.status === 'online';
  const isSelf = Boolean(currentUser && currentUser.id === teacher.id);

  if (!isOnline) {
    return {
      activity: 'Sesi Tidak Aktif (Offline)',
      moduleKey: 'portal',
      moduleName: 'Offline',
      isSelf,
      timeAgoText: formatTeacherLastActive(teacher.lastActive),
      isOnline: false,
    };
  }

  // Jika ini adalah pengguna saat ini di tab ini: ambil data live 100% dari tab yang sedang aktif
  if (isSelf) {
    const liveModule = currentLocalModule || teacher.activeModule || 'sumatif';
    const liveView = currentLocalView || teacher.currentView || 'dashboard';
    const moduleName = getModuleDisplayName(liveModule);
    const activity = getActivityDescription(liveView, teacher.activeAssessmentInfo, liveModule, teacher, state);

    let detailBadge: string | undefined = undefined;
    if (teacher.activeAssessmentInfo) {
      detailBadge = teacher.activeAssessmentInfo;
    } else if (teacher.mataPelajaran && teacher.mataPelajaran.length > 0) {
      detailBadge = teacher.mataPelajaran[0];
    }

    return {
      activity,
      moduleKey: liveModule,
      moduleName,
      detailBadge,
      isSelf: true,
      timeAgoText: 'Sedang Aktif (Sesi Anda)',
      isOnline: true,
    };
  }

  // Jika ini akun rekan guru lain yang sedang online:
  const remoteModule = teacher.activeModule || 'sumatif';
  const moduleName = getModuleDisplayName(remoteModule);

  // Jika remote teacher sudah memiliki currentActivity tersimpan yang spesifik (bukan generic placeholder)
  const isGenericActivity =
    !teacher.currentActivity ||
    teacher.currentActivity.toLowerCase().includes('memantau dashboard asesmen') ||
    teacher.currentActivity.toLowerCase().includes('aktif di dashboard asesmen') ||
    teacher.currentActivity.toLowerCase().includes('memantau asesmen dan draf');

  let activity = teacher.currentActivity;
  if (!activity || isGenericActivity) {
    activity = getActivityDescription(teacher.currentView, teacher.activeAssessmentInfo, remoteModule, teacher, state);
  }

  let detailBadge: string | undefined = undefined;
  if (teacher.activeAssessmentInfo) {
    detailBadge = teacher.activeAssessmentInfo;
  } else if (teacher.isGuruBK) {
    detailBadge = 'Guru BK Hebat';
  } else if (teacher.isTimKesiswaan) {
    detailBadge = 'Tim Kesiswaan';
  } else if (teacher.isWaliKelas) {
    detailBadge = `Wali Kelas ${teacher.waliKelasName || ''}`;
  } else if (teacher.isProctor || teacher.isProctorEnabled) {
    detailBadge = 'Pengawas CBT';
  } else if (teacher.mataPelajaran && teacher.mataPelajaran.length > 0) {
    detailBadge = teacher.mataPelajaran[0];
  }

  return {
    activity,
    moduleKey: remoteModule,
    moduleName,
    detailBadge,
    isSelf: false,
    timeAgoText: formatTeacherLastActive(teacher.lastActive),
    isOnline: true,
  };
}
