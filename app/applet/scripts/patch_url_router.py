import re

with open('src/utils/urlRouter.ts', 'r') as f:
    content = f.read()

# 1. Update PATH_TO_VIEW_MAP with all nested paths
new_paths = """  // Siswa Subpaths
  '/siswa': 'portal-siswa',
  '/siswa/dashboard': 'portal-siswa',
  '/siswa/cbt-umum': 'portal-siswa',
  '/siswa/litnum': 'ujian-litnum',
  '/siswa/profil': 'portal-siswa',
  '/siswa/login': 'siswa-login',

  // Pengawas Subpaths
  '/pengawas': 'exam-proctor-mobile',
  '/pengawas/dashboard': 'exam-proctor-mobile',
  '/pengawas/monitoring-ujian': 'exam-proctor-mobile',
  '/pengawas/berita-acara': 'berita-acara',
  '/pengawas/jadwal': 'exam-proctor-schedules',
  '/pengawas-cbt': 'exam-proctor-mobile',
  '/monitor-pengawas': 'exam-proctor-mobile',

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
  '/admin/developer-hub': 'ai-studio-hub',"""

# Replace the beginning of PATH_TO_VIEW_MAP
target_start = "export const PATH_TO_VIEW_MAP: Record<string, string> = {"
if target_start in content:
    # Check if '/admin/pengaturan-akun' is already in
    if "'/admin/pengaturan-akun'" not in content:
        content = content.replace(target_start, target_start + "\n" + new_paths)

# Update getModuleFromPathname
if "clean.startsWith('/siswa')" not in content:
    module_rule = """  if (clean.startsWith('/siswa') || clean === '/portal-siswa' || clean === '/cbt-online' || clean === '/ujian-litnum') {
    return 'portal';
  }
  if (clean.startsWith('/pengawas') || clean === '/pengawas-cbt' || clean === '/monitor-pengawas') {
    return 'manajemen-ujian';
  }
  if (clean === '/admin/manajemen-litnum') {
    return 'litnum';
  }
  if (clean === '/admin/pengaturan-akun') {
    return 'manajemen-data';
  }
  if (clean.startsWith('/admin/manajemen-cbt') || clean.startsWith('/admin/token') || clean.startsWith('/admin/jadwal') || clean.startsWith('/admin/kredensial') || clean.startsWith('/admin/kartu') || clean.startsWith('/admin/penugasan') || clean.startsWith('/admin/daftar-hadir') || clean.startsWith('/admin/berita-acara') || clean.startsWith('/admin/keamanan-pin') || clean.startsWith('/admin/ruang')) {
    return 'manajemen-ujian';
  }"""
    target_module_fn = "export function getModuleFromPathname(pathname: string): AppModuleType {\n  const clean = pathname.replace(/\\/$/, '') || '/';"
    content = content.replace(target_module_fn, target_module_fn + "\n" + module_rule)

# Update resolveRouteFromUrl
target_route_check = "const isStudentPortalRoute = clean === '/portal-siswa' || clean === '/cbt-online' || clean === '/siswa';"
replacement_route_check = "const isStudentPortalRoute = clean === '/portal-siswa' || clean === '/cbt-online' || clean === '/ujian-litnum' || clean.startsWith('/siswa');"
content = content.replace(target_route_check, replacement_route_check)

with open('src/utils/urlRouter.ts', 'w') as f:
    f.write(content)

print("Successfully patched src/utils/urlRouter.ts")
