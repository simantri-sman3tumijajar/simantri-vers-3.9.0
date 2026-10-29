import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Key,
  Lock,
  Unlock,
  RefreshCw,
  Copy,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  Radio,
  ShieldCheck,
  ChevronRight,
  Database,
  Layers,
  GraduationCap,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GradeExamToken } from '../types';

export const ExamTokenView: React.FC = () => {
  const {
    state,
    currentUser,
    updateExamTokenConfig,
    updateGradeExamToken,
    generateAllGradeTokens,
    showToast,
    setCurrentView,
  } = useApp();

  const tokenConfig = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const prev = state.examManagement?.tokenConfig;
    return (
      prev || {
        activeToken: 'K7X9M2',
        date: todayStr,
        isEnabled: true,
        generatedAt: new Date().toISOString(),
        gradeTokens: {
          X: { jenjang: 'X', token: 'K7X9M2', mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: new Date().toISOString() },
          XI: { jenjang: 'XI', token: '4B8RT5', mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: new Date().toISOString() },
          XII: { jenjang: 'XII', token: 'P9W3A7', mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: new Date().toISOString() },
        },
        history: [],
      }
    );
  }, [state.examManagement?.tokenConfig]);

  const schedules = state.examManagement?.schedules || [];

  // Active schedules per grade for auto-binding
  const gradeSchedules = useMemo(() => {
    const getActiveForGrade = (grade: 'X' | 'XI' | 'XII') => {
      return schedules.find((s) => {
        const matchesGrade = s.targetClasses.some((c) => {
          const norm = c.toUpperCase();
          if (grade === 'X') return norm.startsWith('X.') || norm.startsWith('X-') || norm === 'X';
          if (grade === 'XI') return norm.startsWith('XI.') || norm.startsWith('XI-') || norm === 'XI';
          if (grade === 'XII') return norm.startsWith('XII.') || norm.startsWith('XII-') || norm === 'XII';
          return false;
        });
        return matchesGrade;
      });
    };

    return {
      X: getActiveForGrade('X'),
      XI: getActiveForGrade('XI'),
      XII: getActiveForGrade('XII'),
    };
  }, [schedules]);

  const [generatingGrade, setGeneratingGrade] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);

  // Copy token helper
  const copyToken = (token: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(token);
      showToast('Token Disalin', `Token ${label} (${token}) berhasil disalin ke clipboard.`, 'success');
    }
  };

  const handleGeneratePerGrade = async (jenjang: 'X' | 'XI' | 'XII') => {
    setGeneratingGrade(jenjang);
    const activeSch = gradeSchedules[jenjang];
    await updateGradeExamToken(jenjang, undefined, {
      activeExamId: activeSch?.id,
      mapelAktif: activeSch?.subjectName || activeSch?.title || 'Bahasa Indonesia',
      activeSession: activeSch?.roomName || 'Sesi 1',
      isActive: true,
    });
    setGeneratingGrade(null);
  };

  const handleGenerateAll = async () => {
    setGeneratingAll(true);
    await generateAllGradeTokens();
    setGeneratingAll(false);
  };

  const gradeTokens = tokenConfig.gradeTokens || {
    X: { jenjang: 'X', token: tokenConfig.activeToken || 'K7X9M2', mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: tokenConfig.generatedAt },
    XI: { jenjang: 'XI', token: '4B8RT5', mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: tokenConfig.generatedAt },
    XII: { jenjang: 'XII', token: 'P9W3A7', mapelAktif: 'Bahasa Indonesia', activeSession: 'Sesi 1', isActive: true, updatedAt: tokenConfig.generatedAt },
  };

  return (
    <div className="space-y-6 pb-12 selection:bg-amber-600 selection:text-white">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2.5 rounded-2xl bg-amber-100 text-amber-800 shadow-xs">
              <Key className="w-5 h-5 text-amber-700" />
            </span>
            <div>
              <span className="text-[11px] font-black uppercase text-amber-800 tracking-wider block">
                Infrastruktur CBT &bull; Manajemen Token 3 Tingkatan
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Kontrol Token Ujian CBT (Kelas X, XI, XII)
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-2xl mt-1">
            Token 6 digit alfanumerik acak (tanpa karakter ambigu <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-amber-800 font-bold">O, I, 0, 1</code>), terikat sesi dan mata pelajaran aktif per jenjang kelas.
          </p>
        </div>

        {/* Global Action: Generate All 3 Grades */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleGenerateAll}
            disabled={generatingAll}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-lg shadow-amber-500/25 transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${generatingAll ? 'animate-spin' : ''}`} />
            <span>Generate Semua Jenjang Sekaligus</span>
          </button>
        </div>
      </div>

      {/* 3 Separate Cards for Kelas X, XI, and XII */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {(['X', 'XI', 'XII'] as const).map((jenjang) => {
          const item = gradeTokens[jenjang];
          const activeSch = gradeSchedules[jenjang];
          const tokenCode = item?.token || '------';
          const isCurrentActive = item?.isActive ?? true;

          const theme =
            jenjang === 'X'
              ? {
                  gradient: 'from-blue-600 via-indigo-600 to-indigo-800',
                  accentBg: 'bg-indigo-50',
                  accentText: 'text-indigo-800',
                  badgeBorder: 'border-indigo-400/40',
                  ring: 'ring-indigo-500/20',
                  btnBg: 'bg-indigo-600 hover:bg-indigo-700',
                }
              : jenjang === 'XI'
              ? {
                  gradient: 'from-emerald-600 via-teal-600 to-emerald-800',
                  accentBg: 'bg-emerald-50',
                  accentText: 'text-emerald-800',
                  badgeBorder: 'border-emerald-400/40',
                  ring: 'ring-emerald-500/20',
                  btnBg: 'bg-emerald-600 hover:bg-emerald-700',
                }
              : {
                  gradient: 'from-amber-600 via-orange-600 to-amber-800',
                  accentBg: 'bg-amber-50',
                  accentText: 'text-amber-800',
                  badgeBorder: 'border-amber-400/40',
                  ring: 'ring-amber-500/20',
                  btnBg: 'bg-amber-600 hover:bg-amber-700',
                };

          return (
            <motion.div
              key={jenjang}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden flex flex-col justify-between"
            >
              {/* Header Jenjang */}
              <div className={`p-5 bg-gradient-to-br ${theme.gradient} text-white relative overflow-hidden`}>
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10 blur-xl pointer-events-none" />
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-white/20 backdrop-blur-xs text-white">
                      <GraduationCap className="w-4 h-4" />
                    </span>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-white/80 block">
                        TINGKAT KELAS
                      </span>
                      <h3 className="text-lg font-black tracking-tight">KELAS {jenjang}</h3>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-[10.5px] font-black border backdrop-blur-xs flex items-center gap-1.5 ${
                      isCurrentActive
                        ? 'bg-emerald-500/30 text-emerald-100 border-emerald-400/50'
                        : 'bg-rose-500/30 text-rose-100 border-rose-400/50'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isCurrentActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                      }`}
                    />
                    <span>{isCurrentActive ? 'Token Aktif' : 'Nonaktif'}</span>
                  </span>
                </div>

                {/* Sesi & Mapel Info Banner */}
                <div className="p-3 rounded-2xl bg-black/20 border border-white/15 text-xs space-y-1 relative z-10 backdrop-blur-xs">
                  <div className="flex items-center justify-between text-[11px] text-white/90">
                    <span className="font-semibold text-white/70">Mapel Aktif:</span>
                    <strong className="font-bold truncate max-w-[170px]">
                      {activeSch?.subjectName || item?.mapelAktif || 'Bahasa Indonesia'}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-white/90">
                    <span className="font-semibold text-white/70">Sesi Ujian:</span>
                    <strong className="font-bold">
                      {activeSch?.roomName || item?.activeSession || 'Sesi 1'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Body: Token Display (Font Besar & Jelas) */}
              <div className="p-6 text-center space-y-5 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                    KODE TOKEN 6-DIGIT RESMI
                  </span>

                  <div className="py-4 px-3 rounded-2xl bg-slate-900 text-amber-400 font-mono font-black text-3xl sm:text-4xl tracking-widest border-2 border-slate-800 shadow-inner select-all flex items-center justify-center gap-2">
                    <span>{tokenCode}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-medium">
                    Diperbarui: {new Date(item?.updatedAt || Date.now()).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>

                {/* Tombol Aksi */}
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => copyToken(tokenCode, `Kelas ${jenjang}`)}
                      className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-600" />
                      <span>Salin Token</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateGradeExamToken(jenjang, item?.token, {
                          isActive: !isCurrentActive,
                        })
                      }
                      className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 ${
                        isCurrentActive
                          ? 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      {isCurrentActive ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-rose-600" />
                          <span>Hanguskan</span>
                        </>
                      ) : (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Aktifkan</span>
                        </>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={generatingGrade === jenjang}
                    onClick={() => handleGeneratePerGrade(jenjang)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-amber-400 ${
                        generatingGrade === jenjang ? 'animate-spin' : ''
                      }`}
                    />
                    <span>Generate Token Baru ({jenjang})</span>
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Security Protocol & Binding Notice */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2 text-slate-900 font-black">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Protokol Keamanan &amp; Masa Berlaku Token CBT:</span>
        </div>
        <ul className="list-disc list-inside space-y-1 text-slate-600 font-medium leading-relaxed pl-1 text-[11.5px]">
          <li>
            <strong>Terikat Sesi &amp; Jenjang:</strong> Siswa Kelas X hanya dapat masuk menggunakan Token Kelas X yang sedang aktif. Siswa Kelas XI dan XII tidak dapat saling bertukar token.
          </li>
          <li>
            <strong>Otomatis Hangus:</strong> Token lama otomatis hangus ketika sesi ujian berganti atau tombol <em>Generate Token Baru</em> ditekan oleh proktor.
          </li>
          <li>
            <strong>Siswa Sedang Ujian Aman:</strong> Siswa yang sudah berada di dalam lembar soal tidak akan terlempar keluar saat token diperbarui, hanya peserta baru yang login wajib memakai token terbaru.
          </li>
        </ul>
      </div>
    </div>
  );
};
