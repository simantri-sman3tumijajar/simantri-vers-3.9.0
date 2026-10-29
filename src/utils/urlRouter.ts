// URL Routing & Path Mapping Helper for Professional Browser History, Module Routing & Sub-paths

export const VIEW_TO_PATH_MAP: Record<string, string> = {
  'welcome': '/welcome',
  'login-admin': '/login-admin',
  'login-gtk': '/login-gtk',
  'proctor-monitor': '/manajemen-ujian/proctor',
  'dashboard': '/dashboard',
  'mass-grading': '/koreksi-massal',
  'assessments': '/bank-soal',
  'item-analysis': '/analisis-butir-soal',
  'raport-sts': '/raport-sts',
  'student-grades': '/daftar-nilai-siswa',
  'students': '/manajemen-siswa',
  'teachers': '/master-data/guru',
  'classes-subjects': '/master-data/kelas-mapel',
  'feedback': '/umpan-balik',
  'feedback-center': '/pusat-umpan-balik',
  'berita-acara': '/berita-acara',
  'academic-calendar': '/kalender-akademik',
  'archives': '/arsip',
  'ai-studio-hub': '/manajemen-data/ai-studio-hub',
  'announcements': '/manajemen-data/pengumuman',
  'bimbingan-konseling': '/bimbingan-konseling',
  'rekap-nilai-dashboard': '/rekap-nilai',
  'rekap-nilai-leger': '/rekap-nilai/input-tp',
  'rekap-nilai-olahranking': '/rekap-nilai/leger',
  'rekap-nilai-erapor': '/rekap-nilai/erapor',
  'rekap-nilai-cp': '/rekap-nilai/capaian-kompetensi',
  'rekap-nilai-cetak': '/rekap-nilai/cetak',
  'bk-konseling': '/bimbingan-konseling/konseling',
  'bk-kerawanan': '/bimbingan-konseling/kerawanan',
  'bk-karir': '/bimbingan-konseling/karir',
  'bk-emosi': '/bimbingan-konseling/emosi',
  'bk-rujukan': '/bimbingan-konseling/rujukan',
  'bk-kebiasaan': '/bimbingan-konseling/kebiasaan',
  'bk-akuntabilitas': '/bimbingan-konseling/akuntabilitas',
  'exam-token': '/manajemen-ujian/token',
  'exam-credentials': '/manajemen-ujian/kredensial',
  'exam-cards': '/manajemen-ujian/kartu',
  'exam-schedules': '/manajemen-ujian/jadwal',
  'exam-assignments': '/manajemen-ujian/penugasan',
  'exam-attendance': '/manajemen-ujian/daftar-hadir',
  'exam-security': '/manajemen-ujian/keamanan-pin',
  'exam-rooms': '/manajemen-ujian/ruang',
  'exam-proctor-schedules': '/manajemen-ujian/jadwal-pengawas',
  'exam-proctor-mobile': '/manajemen-ujian/monitor-mobile',
  'exam-management': '/manajemen-ujian',
  'litnum-management': '/manajemen-literasi-numerasi',
  'kesiswaan': '/kesiswaan',
  'kesiswaan-ringkasan': '/kesiswaan/ringkasan',
  'kesiswaan-input': '/kesiswaan/input',
  'kesiswaan-rekap': '/kesiswaan/rekap',
  'kesiswaan-rawan': '/kesiswaan/rawan',
  'supervisi-dashboard': '/supervisi/dashboard',
  'supervisi-presensi': '/supervisi/presensi',
  'supervisi-berita-acara': '/supervisi/berita-acara',
  'supervisi-guru': '/supervisi/guru',
  'supervisi-asesmen': '/supervisi/asesmen',
  'supervisi-nilai': '/supervisi/nilai',
  'supervisi-bukti': '/supervisi/bukti',
  'supervisi-rapor': '/supervisi/rapor',
  'supervisi-bk': '/supervisi/bk',
  'supervisi-catatan': '/supervisi/catatan',
  'supervisi-kepsek': '/supervisi/dashboard',
  'standalone-supervisor': '/portal-pengawas',
};

export const PATH_TO_VIEW_MAP: Record<string, string> = {
  // Siswa Subpaths
  '/siswa': 'portal-siswa',
  '/siswa/dashboard': 'portal-siswa',
  '/siswa/cbt-umum': 'portal-siswa',
  '/siswa/litnum': 'ujian-litnum',
  '/siswa/profil': 'portal-siswa',
  '/siswa/login': 'siswa-login',

  // Standalone Pengawas Subpaths
  '/portal-pengawas': 'standalone-supervisor',
  '/pengawas': 'standalone-supervisor',
  '/pengawas/dashboard': 'standalone-supervisor',
  '/pengawas/monitoring-ujian': 'standalone-supervisor',
  '/pengawas/berita-acara': 'berita-acara',
  '/pengawas/jadwal': 'exam-proctor-schedules',
  '/pengawas-cbt': 'standalone-supervisor',
  '/monitor-pengawas': 'standalone-supervisor',

  // Admin & Operator Subpaths
  '/admin': 'dashboard',
  '/admin/dashboard': 'dashboard',
  '/admin/pengaturan-akun': 'teachers',
  '/admin/manajemen-litnum': 'litnum-management',
  '/admin/manajemen-cbt': 'exam-management',
  '/admin/token': 'exam-token',
  '/admin/jadwal': 'exam-schedules',
  '/admin/kredensial': 'exam-credentials',
  '/admin/kartu': 'exam-cards',
  '/admin/penugasan': 'exam-assignments',
  '/admin/daftar-hadir': 'exam-attendance',
  '/admin/keamanan-pin': 'exam-security',
  '/admin/ruang': 'exam-rooms',
  '/admin/jadwal-pengawas': 'exam-proctor-schedules',
  '/admin/berita-acara': 'berita-acara',
  '/admin/bank-soal': 'assessments',
  '/admin/koreksi-massal': 'mass-grading',
  '/admin/analisis-butir-soal': 'item-analysis',
  '/admin/raport-sts': 'raport-sts',
  '/admin/rekap-nilai': 'rekap-nilai-dashboard',
  '/admin/users': 'teachers',
  '/admin/guru': 'teachers',
  '/admin/siswa': 'students',
  '/admin/master-data': 'classes-subjects',
  '/admin/pengaturan': 'dashboard',
  '/admin/umpan-balik': 'feedback-center',
  '/admin/announcements': 'announcements',
  '/admin/developer-hub': 'ai-studio-hub',
  '/welcome': 'welcome',
  '/login-admin': 'login-admin',
  '/login-gtk': 'login-gtk',
  '/login-guru': 'login-gtk',
  '/portal-login': 'login',
  '/login': 'login',
  '/portal-siswa': 'portal-siswa',
  '/cbt-online': 'portal-siswa',
  '/ujian-litnum': 'ujian-litnum',
  '/siswa/cbt': 'portal-siswa',
  '/siswa/ujian': 'portal-siswa',

  // Admin route mappings

  // Operator route mappings
  '/operator': 'dashboard',
  '/operator/dashboard': 'dashboard',
  '/operator/dapodik': 'students',
  '/operator/siswa': 'students',
  '/operator/guru': 'teachers',
  '/operator/sinkronisasi': 'rekap-nilai-dashboard',
  '/operator/erapor': 'rekap-nilai-erapor',

  // GTK / Guru route mappings
  '/gtk': 'dashboard',
  '/gtk/dashboard': 'dashboard',
  '/guru': 'dashboard',
  '/guru/dashboard': 'dashboard',
  '/gtk/kelas': 'classes-subjects',
  '/gtk/asesmen': 'assessments',
  '/gtk/bank-soal': 'assessments',
  '/gtk/koreksi': 'mass-grading',
  '/gtk/koreksi-massal': 'mass-grading',
  '/gtk/nilai': 'student-grades',
  '/gtk/rekap-nilai': 'rekap-nilai-dashboard',
  '/gtk/supervisi': 'supervisi-dashboard',
  '/gtk/bimbingan-konseling': 'bimbingan-konseling',
  '/gtk/kesiswaan': 'kesiswaan',
  '/gtk/tugas': 'tugas',

  '/manajemen-ujian/proctor': 'proctor-monitor',
  '/proctor': 'proctor-monitor',
  '/manajemen-siswa': 'students',
  '/supervisi': 'supervisi-dashboard',
  '/supervisi/dashboard': 'supervisi-dashboard',
  '/supervisi-dashboard': 'supervisi-dashboard',
  '/supervisi/presensi': 'supervisi-presensi',
  '/supervisi-presensi': 'supervisi-presensi',
  '/supervisi/berita-acara': 'supervisi-berita-acara',
  '/supervisi-berita-acara': 'supervisi-berita-acara',
  '/supervisi/guru': 'supervisi-guru',
  '/supervisi-guru': 'supervisi-guru',
  '/supervisi/asesmen': 'supervisi-asesmen',
  '/supervisi-asesmen': 'supervisi-asesmen',
  '/supervisi/nilai': 'supervisi-nilai',
  '/supervisi-nilai': 'supervisi-nilai',
  '/supervisi/bukti': 'supervisi-bukti',
  '/supervisi-bukti': 'supervisi-bukti',
  '/supervisi/rapor': 'supervisi-rapor',
  '/supervisi-rapor': 'supervisi-rapor',
  '/supervisi/bk': 'supervisi-bk',
  '/supervisi-bk': 'supervisi-bk',
  '/supervisi/catatan': 'supervisi-catatan',
  '/supervisi-catatan': 'supervisi-catatan',
  '/supervisi-kepsek': 'supervisi-dashboard',
  '/portal-supervisi': 'supervisi-dashboard',
  '/kepala-sekolah': 'supervisi-dashboard',
  '/monitoring-kepsek': 'supervisi-dashboard',
  '/kesiswaan': 'kesiswaan',
  '/kesiswaan/ringkasan': 'kesiswaan',
  '/kesiswaan/input': 'kesiswaan-input',
  '/kesiswaan/rekap': 'kesiswaan-rekap',
  '/kesiswaan/rawan': 'kesiswaan-rawan',
  '/presensi': 'kesiswaan',
  '/presensi-siswa': 'kesiswaan',
  '/absensi': 'kesiswaan',
  '/manajemen-literasi-numerasi': 'litnum-management',
  '/dashboard': 'dashboard',
  '/koreksi-massal': 'mass-grading',
  '/bank-soal': 'assessments',
  '/analisis-butir-soal': 'item-analysis',
  '/raport-sts': 'raport-sts',
  '/rekap-nilai-leger': 'rekap-nilai-leger',
  '/rekapitulasi-nilai': 'rekap-nilai-leger',
  '/daftar-nilai-siswa': 'student-grades',
  '/master-data/siswa': 'students',
  '/master-data/guru': 'teachers',
  '/master-data/kelas-mapel': 'classes-subjects',
  '/umpan-balik': 'feedback',
  '/pusat-umpan-balik': 'feedback-center',
  '/berita-acara': 'berita-acara',
  '/kalender-akademik': 'academic-calendar',
  '/kalender-pendidikan': 'academic-calendar',
  '/academic-calendar': 'academic-calendar',
  '/arsip': 'archives',
  '/ai-studio-hub': 'ai-studio-hub',
  '/pengumuman': 'announcements',
  '/bimbingan-konseling': 'bimbingan-konseling',
  '/bimbingan-konseling/konseling': 'bk-konseling',
  '/bimbingan-konseling/kerawanan': 'bk-kerawanan',
  '/bimbingan-konseling/karir': 'bk-karir',
  '/bimbingan-konseling/emosi': 'bk-emosi',
  '/bimbingan-konseling/rujukan': 'bk-rujukan',
  '/bimbingan-konseling/kebiasaan': 'bk-kebiasaan',
  '/bimbingan-konseling/akuntabilitas': 'bk-akuntabilitas',
  '/bk': 'bimbingan-konseling',
  '/bk-hebat': 'bimbingan-konseling',
  // Sumatif-prefixed path mappings
  '/sumatif': 'dashboard',
  '/sumatif/dashboard': 'dashboard',
  '/sumatif/koreksi-massal': 'mass-grading',
  '/sumatif/bank-soal': 'assessments',
  '/sumatif/analisis-butir-soal': 'item-analysis',
  '/sumatif/raport-sts': 'raport-sts',
  '/sumatif/rekap-nilai-leger': 'rekap-nilai-leger',
  '/sumatif/daftar-nilai-siswa': 'student-grades',
  '/sumatif/master-data/siswa': 'students',
  '/sumatif/master-data/guru': 'teachers',
  '/sumatif/master-data/kelas-mapel': 'classes-subjects',
  '/sumatif/umpan-balik': 'feedback',
  '/sumatif/pusat-umpan-balik': 'feedback-center',
  '/sumatif/berita-acara': 'berita-acara',
  '/sumatif/kalender-akademik': 'academic-calendar',
  '/sumatif/kalender-pendidikan': 'academic-calendar',
  '/sumatif/arsip': 'archives',
  // Manajemen Data path mappings
  '/manajemen-data': 'students',
  '/manajemen-data/siswa': 'students',
  '/manajemen-data/guru': 'teachers',
  '/manajemen-data/kelas-mapel': 'classes-subjects',
  '/manajemen-data/kalender-akademik': 'academic-calendar',
  '/manajemen-data/kalender-pendidikan': 'academic-calendar',
  '/manajemen-data/arsip': 'archives',
  '/manajemen-data/pusat-umpan-balik': 'feedback-center',
  '/manajemen-data/ai-studio-hub': 'ai-studio-hub',
  '/manajemen-data/pengumuman': 'announcements',
  // Manajemen Ujian path mappings
  '/manajemen-ujian': 'dashboard',
  '/manajemen-ujian/dashboard': 'dashboard',
  '/manajemen-ujian/token': 'exam-token',
  '/manajemen-ujian/kredensial': 'exam-credentials',
  '/manajemen-ujian/kartu': 'exam-cards',
  '/manajemen-ujian/jadwal': 'exam-schedules',
  '/manajemen-ujian/penugasan': 'exam-assignments',
  '/manajemen-ujian/berita-acara': 'berita-acara',
  '/manajemen-ujian/daftar-hadir': 'exam-attendance',
  '/manajemen-ujian/keamanan-pin': 'exam-security',
  '/manajemen-ujian/security': 'exam-security',
  '/manajemen-ujian/ruang': 'exam-rooms',
  '/manajemen-ujian/jadwal-pengawas': 'exam-proctor-schedules',
  '/manajemen-ujian/monitor-mobile': 'exam-proctor-mobile',
  '/cbt': 'dashboard',
  // Rekap Nilai Module & Sub-view mappings
  '/rekap-nilai': 'rekap-nilai-dashboard',
  '/rekap-nilai/dashboard': 'rekap-nilai-dashboard',
  '/rekap-nilai/input-tp': 'rekap-nilai-leger',
  '/rekap-nilai/leger': 'rekap-nilai-olahranking',
  '/rekap-nilai/erapor': 'rekap-nilai-erapor',
  '/rekap-nilai/capaian-kompetensi': 'rekap-nilai-cp',
  '/rekap-nilai/cetak': 'rekap-nilai-cetak',
};

export type AppModuleType = 'portal' | 'sumatif' | 'rekap-nilai' | 'supervisi' | 'tugas' | 'manajemen-data' | 'bk-hebat' | 'manajemen-ujian' | 'litnum' | 'kesiswaan' | 'pengawas';

/**
 * Determine active module ('portal', 'sumatif', 'rekap-nilai', 'supervisi', 'tugas', 'manajemen-data', 'bk-hebat', 'manajemen-ujian', 'litnum', 'kesiswaan', 'pengawas') from URL pathname
 */
export function getModuleFromPathname(pathname: string): AppModuleType {
  const clean = pathname.replace(/\/$/, '') || '/';
  if (clean.startsWith('/siswa') || clean === '/portal-siswa' || clean === '/cbt-online' || clean === '/ujian-litnum') {
    return 'portal';
  }
  if (clean === '/portal-pengawas' || clean === '/pengawas' || clean === '/pengawas-cbt' || clean === '/monitor-pengawas' || clean.startsWith('/pengawas/')) {
    return 'pengawas';
  }
  if (clean === '/admin/manajemen-litnum') {
    return 'litnum';
  }
  if (clean === '/admin/pengaturan-akun') {
    return 'manajemen-data';
  }
  if (clean.startsWith('/admin/manajemen-cbt') || clean.startsWith('/admin/token') || clean.startsWith('/admin/jadwal') || clean.startsWith('/admin/kredensial') || clean.startsWith('/admin/kartu') || clean.startsWith('/admin/penugasan') || clean.startsWith('/admin/daftar-hadir') || clean.startsWith('/admin/berita-acara') || clean.startsWith('/admin/keamanan-pin') || clean.startsWith('/admin/ruang')) {
    return 'manajemen-ujian';
  }

  if (
    clean === '/supervisi-kepsek' ||
    clean === '/supervisi' ||
    clean === '/portal-supervisi' ||
    clean === '/kepala-sekolah' ||
    clean === '/monitoring-kepsek' ||
    clean.startsWith('/supervisi/') ||
    clean.startsWith('/supervisi-')
  ) {
    return 'supervisi';
  }

  if (
    clean === '/portal' ||
    clean === '/pilih-modul' ||
    clean === '/modul' ||
    clean === '/portal-pilihan'
  ) {
    return 'portal';
  }

  if (
    clean === '/kesiswaan' ||
    clean === '/presensi-siswa' ||
    clean === '/absensi' ||
    clean === '/presensi' ||
    clean.startsWith('/kesiswaan/')
  ) {
    return 'kesiswaan';
  }

  if (
    clean === '/manajemen-literasi-numerasi' ||
    clean === '/litnum' ||
    clean === '/literasi-numerasi' ||
    clean.startsWith('/manajemen-literasi-numerasi/')
  ) {
    return 'litnum';
  }

  if (
    clean === '/manajemen-ujian' ||
    clean === '/cbt' ||
    clean.startsWith('/manajemen-ujian/')
  ) {
    return 'manajemen-ujian';
  }

  if (
    clean === '/bimbingan-konseling' ||
    clean === '/bk' ||
    clean === '/bk-hebat' ||
    clean.startsWith('/bimbingan-konseling/') ||
    clean.startsWith('/bk/')
  ) {
    return 'bk-hebat';
  }

  if (
    clean === '/tugas' ||
    clean === '/tugas-harian' ||
    clean === '/tugas-siswa'
  ) {
    return 'tugas';
  }

  if (
    clean === '/manajemen-data' ||
    clean === '/manajemen-siswa' ||
    clean === '/master-data/siswa' ||
    clean.startsWith('/manajemen-data/') ||
    clean.startsWith('/master-data/')
  ) {
    return 'manajemen-data';
  }

  if (
    clean === '/rekap-nilai' ||
    clean.startsWith('/rekap-nilai/') ||
    clean === '/rekap-nilai-leger' ||
    clean === '/rekap-nilai-dashboard'
  ) {
    return 'rekap-nilai';
  }

  if (
    clean === '/sumatif' ||
    clean.startsWith('/sumatif/') ||
    PATH_TO_VIEW_MAP[clean]
  ) {
    return 'sumatif';
  }

  // Fallback to storage or default to portal
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('smantri_selected_module');
    if (saved === 'supervisi' || saved === 'sumatif' || saved === 'rekap-nilai' || saved === 'tugas' || saved === 'portal' || saved === 'manajemen-data' || saved === 'bk-hebat' || saved === 'manajemen-ujian' || saved === 'litnum' || saved === 'kesiswaan' || saved === 'pengawas') {
      return saved as AppModuleType;
    }
  }

  return 'portal';
}

/**
 * Extract active view from URL pathname (for sumatif and manajemen-data sub-views)
 */
export function getViewFromPathname(pathname: string): string {
  const cleanPath = pathname.replace(/\/$/, '') || '/';
  if (
    cleanPath === '/' ||
    cleanPath === '/welcome' ||
    cleanPath === '/login' ||
    cleanPath === '/login-admin' ||
    cleanPath === '/login-gtk' ||
    cleanPath === '/login-guru' ||
    cleanPath === '/portal-login' ||
    cleanPath === '/portal' ||
    cleanPath === '/pilih-modul' ||
    cleanPath === '/tugas' ||
    cleanPath === '/tugas-harian'
  ) {
    return (typeof window !== 'undefined' && localStorage.getItem('smantri_last_view')) || 'dashboard';
  }
  return PATH_TO_VIEW_MAP[cleanPath] || (typeof window !== 'undefined' && localStorage.getItem('smantri_last_view')) || 'dashboard';
}

/**
 * Get canonical URL pathname from module and current view
 */
export function getPathnameFromModule(module: AppModuleType, currentView: string = 'dashboard'): string {
  if (module === 'portal') return '/portal';
  if (module === 'pengawas' || currentView === 'standalone-supervisor') return '/portal-pengawas';
  if (currentView === 'proctor-monitor' || currentView === 'exam-proctor-monitor') return '/manajemen-ujian/proctor';
  if (module === 'supervisi') {
    if (currentView === 'supervisi-presensi') return '/supervisi/presensi';
    if (currentView === 'supervisi-berita-acara') return '/supervisi/berita-acara';
    if (currentView === 'supervisi-guru') return '/supervisi/guru';
    if (currentView === 'supervisi-asesmen') return '/supervisi/asesmen';
    if (currentView === 'supervisi-nilai') return '/supervisi/nilai';
    if (currentView === 'supervisi-bukti') return '/supervisi/bukti';
    if (currentView === 'supervisi-rapor') return '/supervisi/rapor';
    if (currentView === 'supervisi-bk') return '/supervisi/bk';
    if (currentView === 'supervisi-catatan') return '/supervisi/catatan';
    if (currentView === 'academic-calendar') return '/kalender-akademik';
    if (currentView === 'students') return '/master-data/siswa';
    if (currentView === 'teachers') return '/master-data/guru';
    if (currentView === 'feedback-center') return '/pusat-umpan-balik';
    if (currentView === 'archives') return '/arsip';
    return '/supervisi/dashboard';
  }
  if (module === 'kesiswaan') {
    if (currentView === 'kesiswaan-input') return '/kesiswaan/input';
    if (currentView === 'kesiswaan-rekap') return '/kesiswaan/rekap';
    if (currentView === 'kesiswaan-rawan') return '/kesiswaan/rawan';
    return '/kesiswaan';
  }
  if (module === 'litnum') return '/manajemen-literasi-numerasi';
  if (module === 'manajemen-ujian') {
    if (currentView === 'exam-token') return '/manajemen-ujian/token';
    if (currentView === 'exam-credentials') return '/manajemen-ujian/kredensial';
    if (currentView === 'exam-cards') return '/manajemen-ujian/kartu';
    if (currentView === 'exam-schedules') return '/manajemen-ujian/jadwal';
    if (currentView === 'exam-assignments') return '/manajemen-ujian/penugasan';
    if (currentView === 'exam-attendance') return '/manajemen-ujian/daftar-hadir';
    if (currentView === 'berita-acara') return '/manajemen-ujian/berita-acara';
    return '/manajemen-ujian';
  }
  if (module === 'tugas') return '/tugas-harian';
  if (module === 'bk-hebat') return VIEW_TO_PATH_MAP[currentView] || '/bimbingan-konseling';
  if (module === 'manajemen-data') {
    if (currentView === 'teachers') return '/manajemen-data/guru';
    if (currentView === 'classes-subjects') return '/manajemen-data/kelas-mapel';
    if (currentView === 'academic-calendar') return '/manajemen-data/kalender-akademik';
    if (currentView === 'archives') return '/manajemen-data/arsip';
    if (currentView === 'feedback-center') return '/manajemen-data/pusat-umpan-balik';
    if (currentView === 'ai-studio-hub') return '/manajemen-data/ai-studio-hub';
    if (currentView === 'announcements') return '/manajemen-data/pengumuman';
    if (currentView === 'students') return '/manajemen-siswa';
    return '/manajemen-siswa';
  }
  if (module === 'rekap-nilai') {
    if (currentView === 'rekap-nilai-leger') return '/rekap-nilai/input-tp';
    if (currentView === 'rekap-nilai-olahranking') return '/rekap-nilai/leger';
    if (currentView === 'rekap-nilai-erapor') return '/rekap-nilai/erapor';
    if (currentView === 'rekap-nilai-cp') return '/rekap-nilai/capaian-kompetensi';
    if (currentView === 'rekap-nilai-cetak') return '/rekap-nilai/cetak';
    return '/rekap-nilai';
  }
  return VIEW_TO_PATH_MAP[currentView] || '/dashboard';
}

export function getPathnameFromView(view: string): string {
  return VIEW_TO_PATH_MAP[view] || '/dashboard';
}

/**
 * Check if the given pathname is the /portal path (which strictly requires account login)
 */
export function isPortalPath(pathname: string): boolean {
  const clean = pathname.replace(/\/$/, '') || '/';
  return (
    clean === '/portal' ||
    clean === '/pilih-modul' ||
    clean === '/modul' ||
    clean === '/portal-pilihan'
  );
}

/**
 * Extract active path from window location supporting direct pathname, query param fallback ?route=/..., or hash fallback #/...
 */
export function getActivePathFromWindow(): string {
  if (typeof window === 'undefined') return '/welcome';

  // 1. Query parameter fallback (?route=/manajemen-siswa)
  const urlParams = new URLSearchParams(window.location.search);
  const routeParam = urlParams.get('route');
  if (routeParam) {
    return routeParam.startsWith('/') ? routeParam : `/${routeParam}`;
  }

  // 2. Hash fallback (#/manajemen-siswa)
  if (window.location.hash && window.location.hash.length > 1) {
    const hashPath = window.location.hash.substring(1);
    return hashPath.startsWith('/') ? hashPath : `/${hashPath}`;
  }

  // 3. Direct window pathname
  return window.location.pathname || '/welcome';
}

/**
 * Resolve full app routing state from browser pathname
 */
export function resolveRouteFromUrl(pathname: string): {
  module: AppModuleType;
  view: string;
  isPortalRoute: boolean;
  isStudentPortalRoute: boolean;
} {
  let clean = pathname.replace(/\/$/, '') || '/';

  // Support query param ?route=... or hash #/...
  if (clean.includes('?route=')) {
    const routePart = clean.split('?route=')[1]?.split('&')[0];
    if (routePart) clean = decodeURIComponent(routePart).replace(/\/$/, '') || '/';
  } else if (clean.includes('#/')) {
    const hashPart = clean.split('#/')[1];
    if (hashPart) clean = `/${hashPart}`.replace(/\/$/, '') || '/';
  }

  const isPortalRoute = isPortalPath(clean);
  const isStudentPortalRoute = clean === '/portal-siswa' || clean === '/cbt-online' || clean === '/ujian-litnum' || clean.startsWith('/siswa');
  const module = getModuleFromPathname(clean);
  const view = getViewFromPathname(clean);

  return {
    module,
    view,
    isPortalRoute,
    isStudentPortalRoute,
  };
}

/**
 * Copy current browser path URL to clipboard
 */
export async function copyCurrentPageUrl(): Promise<string> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
  const queryOrHashPath = getActivePathFromWindow();

  let activePath = currentPath;
  if (activePath === '/' || activePath === '/welcome') {
    if (queryOrHashPath && queryOrHashPath !== '/welcome') {
      activePath = queryOrHashPath;
    }
  }

  const fullUrl = `${origin}${activePath}`;

  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(fullUrl);
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = fullUrl;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
  }
  return fullUrl;
}


