import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Lock,
  User,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  AlertCircle,
  Loader2,
  Wrench,
  Eye,
  EyeOff,
  Sparkles,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate, useLocation } from 'react-router-dom';
import { resolveRouteFromUrl, getPathnameFromModule } from '../utils/urlRouter';
import { LoginFooter } from './LoginFooter';

export const LoginGtkView: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, setCurrentUser, setSelectedModule, setCurrentView, showToast } = useApp();
  const { t } = useLanguage();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [redirectAction, setRedirectAction] = useState<{
    label: string;
    path: string;
  } | null>(null);

  // Auto-scroll to top on render
  useEffect(() => {
    const doScroll = () => {
      window.scrollTo({ top: 0, behavior: 'auto' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    doScroll();
    const t1 = setTimeout(doScroll, 50);
    return () => clearTimeout(t1);
  }, []);

  const school = state?.schoolInfo;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setRedirectAction(null);

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('Silakan masukkan Username atau NIP serta Password Akun Guru/GTK Anda.');
      return;
    }

    setIsLoading(true);

    try {
      // Direct real-time live lookup: fetch latest state from server to prevent stale state false negatives
      let currentTeachers: any[] = [];
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`/api/state?_t=${Date.now()}`, {
          cache: 'no-store',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeoutId);
        if (res.ok) {
          const json = await res.json();
          if (json && json.success && Array.isArray(json.data?.teachers)) {
            currentTeachers = json.data.teachers;
          }
        }
      } catch (fetchErr) {
        console.warn('GTK login state fetch timed out or offline, using local cache fallback:', fetchErr);
      }

      if (!currentTeachers || currentTeachers.length === 0) {
        const localCached = localStorage.getItem('smantri_cloud_state');
        if (localCached) {
          try {
            const parsed = JSON.parse(localCached);
            if (parsed && Array.isArray(parsed.teachers)) {
              currentTeachers = parsed.teachers;
            }
          } catch (e) {}
        }
      }

      if (!currentTeachers || currentTeachers.length === 0) {
        currentTeachers = state?.teachers || [];
      }

      const inputUser = cleanUsername.toLowerCase();
      const inputPass = cleanPassword;
      const cleanDigitsUser = cleanUsername.replace(/\D/g, '');

      // 1. REAL-TIME GUARD: DETECT STUDENT ATTEMPT ON GTK PORTAL
      const isStudentAttempt = (state?.students || []).some((s) => {
        const nisn = (s.nisn || '').trim();
        const u = (s.examUsername || '').toLowerCase().trim();
        const nama = (s.nama || '').toLowerCase().trim();
        return (
          (nisn && nisn === cleanUsername) ||
          (u && u === inputUser) ||
          (cleanDigitsUser.length >= 8 && nisn === cleanDigitsUser) ||
          (nama && nama === inputUser)
        );
      });

      if (isStudentAttempt) {
        // Abort session completely
        sessionStorage.removeItem('smantri_user_id');
        sessionStorage.removeItem('smantri_user_profile');
        localStorage.removeItem('smantri_user_id');
        localStorage.removeItem('smantri_user_profile');
        setErrorMsg('Akses Ditolak: Akun Siswa tidak dapat mengakses portal ini. Silakan masuk melalui Portal Peserta Ujian / Siswa.');
        setRedirectAction({
          label: 'Buka Portal Siswa (CBT & LitNum)',
          path: '/portal-siswa',
        });
        setIsLoading(false);
        return;
      }

      // 2. FIND CANDIDATE ACCOUNT
      const candidate = currentTeachers.find((t: any) => {
        const u = (t.username || '').toLowerCase().trim();
        const isAdmin = t.role === 'admin' || t.id === 'tch-admin';
        const teacherNipDigits = (t.nip || '').replace(/\D/g, '');

        const matchesUser =
          u === inputUser ||
          (cleanDigitsUser.length >= 8 && teacherNipDigits === cleanDigitsUser) ||
          (t.nama && t.nama.toLowerCase().trim() === inputUser) ||
          (isAdmin && (inputUser === 'adiel' || inputUser === 'admin'));

        return Boolean(matchesUser);
      });

      // 3. STRICT MUTUAL EXCLUSION CHECK:
      // If user is an Admin or Operator account without teacher roles, REJECT IMMEDIATELY!
      if (candidate) {
        const isStrictAdminOnly = Boolean(
          (candidate.id === 'tch-admin' || candidate.role === 'admin' || candidate.role === 'operator' || candidate.id === 'tch-operator') &&
          !candidate.isGuruMapel &&
          !candidate.isGuruBK &&
          !candidate.isTimKesiswaan &&
          !candidate.isWaliKelas
        );

        if (isStrictAdminOnly) {
          // Immediately purge session and local storage
          sessionStorage.removeItem('smantri_user_id');
          sessionStorage.removeItem('smantri_user_profile');
          localStorage.removeItem('smantri_user_id');
          localStorage.removeItem('smantri_user_profile');

          setErrorMsg('Akses Ditolak: Akun Admin/Operator tidak dapat masuk melalui portal Guru & GTK. Silakan gunakan halaman login khusus Admin.');
          setRedirectAction({
            label: 'Masuk melalui Portal Administrator',
            path: '/login-admin',
          });
          setIsLoading(false);
          return;
        }
      }

      // Also check if username entered is admin/adiel/operator without database match
      if (!candidate && (inputUser === 'admin' || inputUser === 'adiel' || inputUser === 'operator')) {
        sessionStorage.removeItem('smantri_user_id');
        sessionStorage.removeItem('smantri_user_profile');
        localStorage.removeItem('smantri_user_id');
        localStorage.removeItem('smantri_user_profile');

        setErrorMsg('Akses Ditolak: Akun Admin/Operator tidak dapat masuk melalui portal Guru & GTK. Silakan gunakan halaman login khusus Admin.');
        setRedirectAction({
          label: 'Masuk melalui Portal Administrator',
          path: '/login-admin',
        });
        setIsLoading(false);
        return;
      }

      // 4. VERIFY CREDENTIALS FOR GURU, GTK, & KEPSEK
      let user: any = null;

      if (candidate) {
        if (candidate.password && candidate.password.trim() !== '') {
          if (inputPass === candidate.password.trim()) {
            user = candidate;
          }
        } else {
          const isKepsek = candidate.role === 'kepala_sekolah' || candidate.id === 'tch-kepsek';
          if (isKepsek && (inputPass === 'kepsek123' || inputPass === '123456')) {
            user = candidate;
          } else if (inputPass === '123456') {
            user = candidate;
          }
        }
      } else {
        // Fallback default kepsek account if database not seeded
        if (inputUser === 'kepsek' || inputUser === 'erlita' || inputUser === 'kepalasekolah') {
          if (inputPass === 'kepsek123' || inputPass === '123456') {
            user = {
              id: 'tch-kepsek',
              nama: school?.kepalaSekolah || 'ERLITA YUANI PUTRI, M.Pd.',
              username: 'kepsek',
              role: 'kepala_sekolah',
              nip: school?.nipKepalaSekolah || '19850202 200804 2 003',
              status: 'online',
              mataPelajaran: ['Kepala Sekolah'],
            };
          }
        }
      }

      if (user) {
        window.scrollTo({ top: 0, behavior: 'smooth' });

        try {
          sessionStorage.setItem('smantri_user_id', user.id);
          sessionStorage.setItem('smantri_user_profile', JSON.stringify(user));
          localStorage.setItem('smantri_user_id', user.id);
          localStorage.setItem('smantri_user_profile', JSON.stringify(user));
        } catch (e) {}

        setCurrentUser(user);

        const fromState = (location.state as any)?.from?.pathname;
        const intendedPath = fromState || sessionStorage.getItem('smantri_intended_path');
        sessionStorage.removeItem('smantri_intended_path');

        const isKepsekUser = Boolean(
          user.role === 'kepala_sekolah' ||
          user.isKepalaSekolah ||
          user.roles?.includes('kepala_sekolah') ||
          user.id === 'tch-kepsek' ||
          user.username === 'kepsek'
        );

        if (isKepsekUser) {
          setSelectedModule('portal');
          setCurrentView('portal');
          navigate('/portal', { replace: true });
          showToast(
            'Selamat Datang, Kepala Sekolah!',
            `Berhasil masuk sebagai ${user.nama}. Silakan akses Portal Supervisi Kepala Sekolah.`,
            'success'
          );
        } else if (intendedPath && intendedPath !== '/welcome' && intendedPath !== '/portal-login' && intendedPath !== '/login' && intendedPath !== '/login-admin' && intendedPath !== '/login-gtk' && intendedPath !== '/portal') {
          const route = resolveRouteFromUrl(intendedPath);
          setSelectedModule(route.module);
          setCurrentView(route.view);
          const target = getPathnameFromModule(route.module, route.view);
          navigate(target, { replace: true });
          showToast('Selamat Datang!', `Berhasil masuk sebagai ${user.nama}.`, 'success');
        } else {
          setSelectedModule('portal');
          navigate('/portal', { replace: true });
          showToast('Selamat Datang!', `Berhasil masuk sebagai ${user.nama}. Silakan pilih modul layanan di portal.`, 'success');
        }
      } else {
        setErrorMsg('Username atau Password Guru/GTK salah. Periksa kembali atau hubungi Operator Sekolah.');
      }
    } catch (err: any) {
      console.error('Login GTK error:', err);
      setErrorMsg('Gagal memverifikasi akun. Periksa koneksi jaringan Anda.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-teal-950 flex flex-col justify-between items-center pt-6 sm:pt-8 pb-0 px-4 sm:px-6 lg:px-8 text-slate-100 relative selection:bg-cyan-600 selection:text-white">
      {/* Decorative Radiant Glows & Grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full blur-3xl bg-blue-600/25" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full blur-3xl bg-teal-600/25" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[650px] rounded-full blur-3xl bg-sky-600/10" />
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
          }}
        />
      </div>

      <div className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center relative z-10">
        {/* Top Back to Main Gateway Button */}
        <div className="flex justify-start mb-4">
          <button
            type="button"
            onClick={() => navigate('/welcome')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs shadow-xs border border-white/20 transition-all cursor-pointer active:scale-95 backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            <span>Kembali ke Beranda / Pilihan Portal</span>
          </button>
        </div>

        {/* Logos & School Title */}
        <div className="flex items-center justify-center gap-4 mb-4">
          <img
            src={school?.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
            alt="Logo Provinsi Lampung"
            className="h-14 w-auto object-contain drop-shadow-md"
          />
          <div className="h-10 w-px bg-white/30" />
          <img
            src={school?.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
            alt="Logo SMAN 3 Tumijajar"
            className="h-14 w-auto object-contain drop-shadow-md"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <div className="flex flex-wrap items-center justify-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-black bg-cyan-500/20 text-cyan-200 border border-cyan-400/30 shadow-xs backdrop-blur-xs">
              <GraduationCap className="w-4 h-4 text-cyan-300" />
              Portal Guru, Tenaga Kependidikan &amp; Kepala Sekolah
            </span>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-2xs">
              v.3.9.0
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            SiMantri
          </h2>
          <p className="mt-1 text-xs sm:text-sm font-bold text-slate-200 tracking-wide uppercase">
            {school?.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
          </p>
          <p className="text-xs text-cyan-300 font-bold mt-1">
            Pusat Asesmen Pembelajaran, Rapor STS &amp; Supervisi Akademik
          </p>
          <p className="text-[11px] text-slate-300 font-medium">
            Bank Soal CBT &amp; LitNum, Analisis Butir Soal, BK Hebat &amp; Koreksi Massal AI
          </p>
        </motion.div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25 }}
          className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl shadow-blue-950/40 rounded-3xl border border-blue-200/40 ring-1 ring-slate-900/10"
        >
          {school?.maintenanceMode && (
            <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex items-center gap-2.5 text-amber-900 text-xs">
              <Wrench className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
              <span className="font-bold">Mode Pemeliharaan Sistem Sedang Aktif</span>
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-50 border-2 border-rose-400 flex flex-col gap-2.5 text-rose-900 text-xs font-semibold leading-relaxed shadow-sm">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-extrabold">{errorMsg}</span>
              </div>
              {redirectAction && (
                <button
                  type="button"
                  onClick={() => navigate(redirectAction.path)}
                  className="mt-1 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs self-start"
                >
                  <span>{redirectAction.label}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Username / NIP Guru &amp; Tenaga Kependidikan
              </label>
              <div className="relative rounded-xl shadow-2xs group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-600 transition-colors">
                  <User className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Masukkan username atau NIP 18-digit..."
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-300 focus:border-cyan-600 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-600/20 transition-all shadow-2xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Password Akun
                </label>
              </div>
              <div className="relative rounded-xl shadow-2xs group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-cyan-600 transition-colors">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Masukkan password Anda..."
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-300 focus:border-cyan-600 rounded-xl text-sm font-semibold text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-cyan-600/20 transition-all shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                  title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm text-white active:scale-[0.99] focus:outline-hidden focus:ring-2 focus:ring-offset-2 bg-gradient-to-r from-blue-700 via-sky-700 to-teal-700 hover:from-blue-800 hover:to-teal-800 focus:ring-cyan-500 shadow-lg shadow-cyan-900/30 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi Akun Guru / GTK...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Portal Guru &amp; GTK</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Switch Helper for Misdirected Administrators */}
          <div className="mt-6 pt-4 border-t border-slate-200/80 text-center space-y-2">
            <p className="text-xs text-slate-600">
              Bukan Guru atau Tenaga Kependidikan?
            </p>
            <button
              type="button"
              onClick={() => navigate('/login-admin')}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-purple-700 text-xs font-bold transition-all cursor-pointer"
            >
              <span>Masuk via Portal Administrator &amp; Operator</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </div>

      <LoginFooter isDarkBg={true} />
    </div>
  );
};
