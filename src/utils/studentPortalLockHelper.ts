import { SchoolInfo } from '../types';

export interface StudentLockPresetItem {
  id: 'di_luar_jadwal' | 'persiapan_soal' | 'ujian_selesai' | 'evaluasi_rekap' | 'kustom';
  label: string;
  badge: string;
  title: string;
  description: string;
}

export const STUDENT_LOCK_PRESETS: StudentLockPresetItem[] = [
  {
    id: 'di_luar_jadwal',
    label: 'Di Luar Jadwal Sesi Ujian',
    badge: 'Jadwal Ditutup',
    title: 'Akses Ujian CBT Belum Dibuka (Di Luar Jadwal Sesi)',
    description: 'Ruang ujian hanya dibuka sesuai jadwal mata pelajaran dan sesi yang berlangsung.',
  },
  {
    id: 'persiapan_soal',
    label: 'Persiapan & Sinkronisasi Naskah Soal',
    badge: 'Sterilisasi Sesi',
    title: 'Sterilisasi & Sinkronisasi Ruang Ujian CBT',
    description: 'Panitia sedang menyiapkan naskah soal dan token sesi asesmen berikutnya.',
  },
  {
    id: 'ujian_selesai',
    label: 'Ujian Telah Berakhir / Sesi Ditutup',
    badge: 'Sesi Selesai',
    title: 'Pelaksanaan Sesi Ujian CBT Telah Selesai',
    description: 'Seluruh sesi asesmen hari ini telah berakhir dan akses masuk siswa ditutup.',
  },
  {
    id: 'evaluasi_rekap',
    label: 'Evaluasi & Rekapitulasi Hasil Asesmen',
    badge: 'Rekap Nilai',
    title: 'Penutupan Akses Selama Rekapitulasi Nilai',
    description: 'Akses siswa ditutup sementara selama proses verifikasi dan pengolahan nilai oleh Guru & GTK.',
  },
  {
    id: 'kustom',
    label: 'Pesan Kustom Administrator',
    badge: 'Pesan Kustom',
    title: 'Akses Ruang Ujian & Asesmen CBT Sedang Ditutup',
    description: 'Saat ini tidak ada sesi ujian aktif atau menunggu pembukaan akses jadwal ujian oleh Panitia / Pengawas Ruang.',
  },
];

export function resolveStudentPortalLockInfo(school?: SchoolInfo | null) {
  const isLocked = Boolean(school?.studentPortalLocked ?? true);
  const presetKey = school?.studentPortalLockPreset || 'di_luar_jadwal';
  const foundPreset = STUDENT_LOCK_PRESETS.find((p) => p.id === presetKey) || STUDENT_LOCK_PRESETS[0];

  const title = (school?.studentPortalLockTitle || '').trim() || foundPreset.title;
  const description = (school?.studentPortalLockReason || '').trim() || foundPreset.description;
  const nextSessionInfo = (school?.studentPortalNextSessionInfo || '').trim();

  return {
    isLocked,
    presetKey,
    title,
    description,
    nextSessionInfo,
    badge: foundPreset.badge,
  };
}

export interface LitNumAccessValidation {
  canAccess: boolean;
  isManualDisabled: boolean;
  isOutsideSchedule: boolean;
  statusTitle: string;
  modalMessage: string;
  modalDetail: string;
  scheduleBadge: string;
}

/**
 * Validasi berlapis status akses Ujian LitNum (Manual disabled vs Di Luar Jadwal Selasa & Rabu)
 */
export function evaluateLitNumAccess(
  school?: SchoolInfo | null,
  litnumScheduleConfig?: any,
  currentTime: Date = new Date()
): LitNumAccessValidation {
  const isLocked = Boolean(school?.litnumModuleSettings?.isLocked);
  const isHidden = Boolean(school?.litnumModuleSettings?.isHidden);
  const visibilityMode = school?.litnumVisibilityMode || school?.litnumModuleSettings?.visibilityMode || 'auto';
  const isConfigEnabled = litnumScheduleConfig?.isEnabled !== false;
  const isTestingBypass = Boolean(litnumScheduleConfig?.bypassScheduleForTesting);

  // 1. Kondisi Mode Nonaktif Manual:
  // Jika Admin/Operator menyetel status LitNum ke mode Nonaktif di Pengaturan Akun
  if (isLocked || isHidden || visibilityMode === 'force_hide' || !isConfigEnabled) {
    const customReason = (school?.litnumModuleSettings?.maintenanceNotice || '').trim();
    return {
      canAccess: false,
      isManualDisabled: true,
      isOutsideSchedule: false,
      statusTitle: 'Ujian LitNum Dinonaktifkan',
      modalMessage: 'Ujian LitNum saat ini sedang dinonaktifkan oleh Administrator/Operator.',
      modalDetail:
        customReason ||
        'Akses asesmen literasi dan numerasi saat ini sedang dimatikan dari panel Pengaturan Akun / Manajemen Mutu oleh Admin.',
      scheduleBadge: 'STATUS: NONAKTIF',
    };
  }

  // 2. Mode Paksa Buka (Testing Bypass atau Force Show)
  if (visibilityMode === 'force_show' || isTestingBypass) {
    return {
      canAccess: true,
      isManualDisabled: false,
      isOutsideSchedule: false,
      statusTitle: 'Ujian LitNum Aktif',
      modalMessage: 'Ujian LitNum siap diakses peserta didik.',
      modalDetail: 'Mode akses dibuka penuh oleh Administrator.',
      scheduleBadge: 'STATUS: TERBUKA',
    };
  }

  // 3. Kondisi Mode Otomatis (Hari Terjadwal: Selasa & Rabu)
  const dayIndex = currentTime.getDay(); // 0 = Minggu, 1 = Senin, 2 = Selasa, 3 = Rabu, 4 = Kamis, 5 = Jumat, 6 = Sabtu
  const isTuesday = dayIndex === 2;
  const isWednesday = dayIndex === 3;

  const hours = currentTime.getHours().toString().padStart(2, '0');
  const minutes = currentTime.getMinutes().toString().padStart(2, '0');
  const currentHHMM = `${hours}:${minutes}`;
  const jamMulai = litnumScheduleConfig?.jamMulai || '07:30';
  const jamSelesai = litnumScheduleConfig?.jamSelesai || '12:00';

  const isScheduleDay = isTuesday || isWednesday;
  const isScheduleTime = currentHHMM >= jamMulai && currentHHMM <= jamSelesai;

  if (isScheduleDay && isScheduleTime) {
    return {
      canAccess: true,
      isManualDisabled: false,
      isOutsideSchedule: false,
      statusTitle: 'Sesi Ujian LitNum Aktif',
      modalMessage: `Sesi pengerjaan ${isTuesday ? 'Literasi' : 'Numerasi'} sedang berlangsung.`,
      modalDetail: `Jadwal resmi: ${isTuesday ? 'Selasa (Literasi)' : 'Rabu (Numerasi)'} pk ${jamMulai} - ${jamSelesai} WIB.`,
      scheduleBadge: 'SESI BERLANGSUNG',
    };
  }

  // Di luar jadwal pelaksanaan resmi
  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const todayName = dayNames[dayIndex];

  let scheduleDetail = `Hari ini adalah hari ${todayName} (${currentHHMM} WIB). Ujian LitNum hanya dapat diakses pada hari Selasa (Literasi) dan Rabu (Numerasi) pukul ${jamMulai} - ${jamSelesai} WIB sesuai jadwal yang ditetapkan.`;
  if (isScheduleDay && !isScheduleTime) {
    scheduleDetail = `Hari ini adalah hari ${todayName}, namun waktu saat ini (${currentHHMM} WIB) berada di luar rentang jam ujian resmi (${jamMulai} - ${jamSelesai} WIB).`;
  }

  return {
    canAccess: false,
    isManualDisabled: false,
    isOutsideSchedule: true,
    statusTitle: 'Di Luar Jadwal Pelaksanaan',
    modalMessage:
      'Ujian LitNum berada di luar jadwal pelaksanaan. Ujian hanya dapat diakses pada hari Selasa dan Rabu sesuai jadwal yang ditetapkan.',
    modalDetail: scheduleDetail,
    scheduleBadge: 'DI LUAR JADWAL',
  };
}

/**
 * Kontrol visibilitas tombol Ujian LitNum di Portal Siswa
 * Tombol tetap dimunculkan sesuai pengaturan visibilitas Admin/Operator (tidak disembunyikan diam-diam saat luar jadwal)
 */
export function shouldShowLitNumButton(
  school?: SchoolInfo | null,
  litnumScheduleConfig?: any,
  currentTime: Date = new Date()
): { show: boolean; reason: string } {
  // Cek pengaturan visibilitas Admin/Operator
  const mode = school?.litnumVisibilityMode || school?.litnumModuleSettings?.visibilityMode || 'auto';

  // Jika Admin secara eksplisit menyembunyikan tombol
  if (mode === 'force_hide' || school?.litnumModuleSettings?.isHidden) {
    return {
      show: false,
      reason: 'Modul LitNum disembunyikan oleh Administrator.',
    };
  }

  // Sesuai instruksi: Tombol Ujian LitNum tetap dimunculkan di dasbor sesuai pengaturan visibilitas
  return {
    show: true,
    reason: 'Tombol LitNum aktif sesuai pengaturan visibilitas.',
  };
}
