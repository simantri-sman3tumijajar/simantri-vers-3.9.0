import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  UserCheck,
  Search,
  Filter,
  Sparkles,
  Printer,
  RefreshCw,
  Eye,
  EyeOff,
  Download,
  Users,
  CheckCircle2,
  AlertCircle,
  Info,
  Lock,
  LockOpen,
  Edit3,
  ShieldCheck,
  ShieldAlert,
  X,
  KeyRound,
  Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { Student } from '../types';
import { getStudentCbtCredentials, canManageCbtCredentials } from '../utils/cbtCredentialHelper';
import { CbtAccountLockModal } from './CbtAccountLockModal';

export const ExamCredentialsView: React.FC = () => {
  const {
    state,
    currentUser,
    generateStudentExamCredentials,
    resetSingleStudentExamCredential,
    lockStudentExamCredentials,
    unlockStudentExamCredentials,
    updateSingleStudentCredential,
    showToast,
    setCurrentView,
  } = useApp();

  const students = state.students || [];
  const classes = state.classes || [];

  // Check RBAC: only Admin, Operator, and Proktor can manage/modify accounts
  const isAuthorizedManager = useMemo(() => {
    return canManageCbtCredentials(currentUser);
  }, [currentUser]);

  const [credSearch, setCredSearch] = useState('');
  const [credClassFilter, setCredClassFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'LOCKED' | 'UNLOCKED'>('ALL');
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  // Confirmation Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('Konfirmasi Penting: Simpan & Kunci Akun CBT Siswa');
  const [modalClassScope, setModalClassScope] = useState('Semua Siswa');
  const [modalTargetCount, setModalTargetCount] = useState(0);
  const [modalStudentDetails, setModalStudentDetails] = useState<{ name: string; username: string; password: string } | undefined>(undefined);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);

  // Edit Single Student Modal State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  // Statistics
  const stats = useMemo(() => {
    const lockedCount = students.filter((s) => Boolean(s.isLocked)).length;
    const unlockedCount = students.length - lockedCount;
    const percentLocked = students.length > 0 ? Math.round((lockedCount / students.length) * 100) : 0;
    return {
      total: students.length,
      lockedCount,
      unlockedCount,
      percentLocked,
    };
  }, [students]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchSearch =
        (s.nama || '').toLowerCase().includes(credSearch.toLowerCase()) ||
        (s.nisn || '').includes(credSearch) ||
        (s.examUsername || '').includes(credSearch);

      const matchClass = credClassFilter === 'ALL' || s.kelas === credClassFilter;

      const isLocked = Boolean(s.isLocked);
      const matchStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'LOCKED'
          ? isLocked
          : !isLocked;

      return matchSearch && matchClass && matchStatus;
    });
  }, [students, credSearch, credClassFilter, statusFilter]);

  const targetClassStudents = useMemo(() => {
    return credClassFilter === 'ALL' ? students : students.filter((s) => s.kelas === credClassFilter);
  }, [students, credClassFilter]);

  const isCurrentFilterAllLocked = useMemo(() => {
    if (targetClassStudents.length === 0) return false;
    return targetClassStudents.every((s) => Boolean(s.isLocked));
  }, [targetClassStudents]);

  const togglePassVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Trigger Mass Lock & Save Action
  const handleTriggerMassLock = () => {
    if (!isAuthorizedManager) {
      showToast('Akses Ditolak', 'Hanya Admin, Operator, atau Proktor yang dapat mengunci akun.', 'warning');
      return;
    }
    const count = targetClassStudents.length;
    const scope = credClassFilter === 'ALL' ? 'Semua Siswa' : `Kelas ${credClassFilter}`;
    setModalTitle('Konfirmasi Penting: Simpan & Kunci Akun CBT Siswa');
    setModalClassScope(scope);
    setModalTargetCount(count);
    setModalStudentDetails(undefined);
    setPendingAction(() => async () => {
      await lockStudentExamCredentials(credClassFilter === 'ALL' ? undefined : credClassFilter);
    });
    setIsConfirmModalOpen(true);
  };

  // Trigger Mass Unlock Action
  const handleTriggerMassUnlock = () => {
    if (!isAuthorizedManager) {
      showToast('Akses Ditolak', 'Hanya Admin, Operator, atau Proktor yang dapat membuka kunci akun.', 'warning');
      return;
    }
    const count = targetClassStudents.length;
    const scope = credClassFilter === 'ALL' ? 'Semua Siswa' : `Kelas ${credClassFilter}`;
    setModalTitle('Buka Kunci Akun CBT Siswa (Untuk Pengeditan)');
    setModalClassScope(scope);
    setModalTargetCount(count);
    setModalStudentDetails(undefined);
    setPendingAction(() => async () => {
      await unlockStudentExamCredentials(credClassFilter === 'ALL' ? undefined : credClassFilter);
    });
    setIsConfirmModalOpen(true);
  };

  // Trigger Mass Generate Action (Prompts Confirmation Modal)
  const handleTriggerMassGenerate = () => {
    if (!isAuthorizedManager) {
      showToast('Akses Ditolak', 'Hanya Admin, Operator, atau Proktor yang dapat generate akun.', 'warning');
      return;
    }
    const count = targetClassStudents.length;
    const scope = credClassFilter === 'ALL' ? 'Semua Siswa' : `Kelas ${credClassFilter}`;
    setModalTitle('Konfirmasi Penting: Generate, Simpan & Kunci Akun CBT');
    setModalClassScope(scope);
    setModalTargetCount(count);
    setModalStudentDetails(undefined);
    setPendingAction(() => async () => {
      await generateStudentExamCredentials({
        classFilter: credClassFilter === 'ALL' ? undefined : credClassFilter,
        forceResetAll: true,
        autoLock: true,
      });
    });
    setIsConfirmModalOpen(true);
  };

  // Trigger Single Reset
  const handleTriggerSingleReset = (student: Student) => {
    if (!isAuthorizedManager) {
      showToast('Akses Ditolak', 'Hanya Admin, Operator, atau Proktor yang dapat mereset akun.', 'warning');
      return;
    }
    const creds = getStudentCbtCredentials(student);
    setModalTitle(`Konfirmasi Penting: Reset Kredensial ${student.nama}`);
    setModalClassScope(`Siswa: ${student.nama} (${student.kelas})`);
    setModalTargetCount(1);
    setModalStudentDetails({
      name: student.nama,
      username: '8-Digit Baru (Acak)',
      password: '8-Digit Baru (Acak)',
    });
    setPendingAction(() => async () => {
      await resetSingleStudentExamCredential(student.id);
    });
    setIsConfirmModalOpen(true);
  };

  // Open Edit Modal for Single Student
  const handleOpenEditStudentModal = (student: Student) => {
    if (!isAuthorizedManager) {
      showToast('Akses Ditolak', 'Hanya Admin, Operator, atau Proktor yang dapat mengedit kredensial akun.', 'warning');
      return;
    }
    const creds = getStudentCbtCredentials(student);
    setEditingStudent(student);
    setEditUsername(student.examUsername || creds.username);
    setEditPassword(student.examPassword || creds.password);
    setEditError(null);
  };

  // Submit Edit Student (Validates then prompts Important Confirmation Modal)
  const handleSubmitEditStudent = () => {
    if (!editingStudent) return;
    const cleanU = editUsername.trim();
    const cleanP = editPassword.trim();

    if (!cleanU || cleanU.length < 4) {
      setEditError('Username minimal terdiri dari 4 karakter/angka.');
      return;
    }
    if (!cleanP || cleanP.length < 4) {
      setEditError('Password minimal terdiri dari 4 karakter/angka.');
      return;
    }

    setModalTitle(`Konfirmasi Penting: Simpan Kredensial ${editingStudent.nama}`);
    setModalClassScope(`Siswa: ${editingStudent.nama} (${editingStudent.kelas})`);
    setModalTargetCount(1);
    setModalStudentDetails({
      name: editingStudent.nama,
      username: cleanU,
      password: cleanP,
    });

    const targetId = editingStudent.id;
    setPendingAction(() => async () => {
      await updateSingleStudentCredential(targetId, cleanU, cleanP, true);
      setEditingStudent(null);
    });
    setIsConfirmModalOpen(true);
  };

  const handleExecuteConfirmedAction = async () => {
    if (!pendingAction) return;
    try {
      setIsSubmittingModal(true);
      await pendingAction();
    } catch (e: any) {
      console.error('Action error:', e);
      showToast('Gagal Menjalankan Aksi', e?.message || 'Terjadi kesalahan sistem.', 'error');
    } finally {
      setIsSubmittingModal(false);
      setIsConfirmModalOpen(false);
      setPendingAction(null);
    }
  };

  const exportCredentialsCSV = () => {
    if (filteredStudents.length === 0) {
      showToast('Data Kosong', 'Tidak ada data siswa untuk diekspor.', 'warning');
      return;
    }

    const header = 'No,NISN,Nama Siswa,Kelas,Username CBT,Password CBT,Status Kredensial,Terkunci\n';
    const rows = filteredStudents
      .map((s, idx) => {
        const creds = getStudentCbtCredentials(s);
        const u = s.examUsername && s.examUsername.trim().length === 8 ? s.examUsername.trim() : creds.username;
        const p = s.examPassword && s.examPassword.trim().length >= 4 ? s.examPassword.trim() : creds.password;
        const status = s.isLocked ? 'Tersimpan & Terkunci' : 'Belum Terkunci';
        const lockFlag = s.isLocked ? 'YA' : 'TIDAK';
        return `${idx + 1},"${s.nisn}","${s.nama}","${s.kelas}","${u}","${p}","${status}","${lockFlag}"`;
      })
      .join('\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Kredensial_CBT_SMAN3Tumijajar_${credClassFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Ekspor Berhasil', 'File CSV daftar kredensial siswa berhasil diunduh.', 'success');
  };

  return (
    <div className="space-y-6 pb-12 selection:bg-indigo-600 selection:text-white">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-100 text-indigo-800">
              <UserCheck className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[11px] font-black uppercase text-indigo-800 tracking-wider block">
                Pangkalan Akun CBT Siswa &bull; Single Source of Truth
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900">
                Otentikasi &amp; Kunci Permanen Akun CBT Siswa
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-500 font-medium max-w-2xl mt-1">
            Pengelolaan kredensial akun login CBT siswa. Username dan Password yang telah dikunci tersimpan secara permanen ke database dan menjadi satu-satunya sumber data untuk <strong>Kartu Ujian</strong> serta <strong>Validasi Login Siswa</strong>.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportCredentialsCSV}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentView('exam-cards')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Cetak Kartu Ujian (A4)</span>
          </button>
        </div>
      </div>

      {/* Role Authority Indicator */}
      {isAuthorizedManager ? (
        <div className="p-4 bg-emerald-50/90 border border-emerald-200 rounded-3xl flex items-start gap-3 text-xs text-emerald-950 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-extrabold text-emerald-950">
              Hak Akses Manajemen Akun Aktif: Peran Terverifikasi ({currentUser?.role?.toUpperCase() || 'ADMIN / OPERATOR / PROKTOR'})
            </p>
            <p className="text-[11.5px] text-emerald-900 leading-relaxed font-medium">
              Anda berwenang mengunci, membuka kunci, mengedit manual, atau me-regenerasi akun CBT siswa setiap saat. Setiap perubahan permanen akan disinkronkan secara <em>real-time</em> ke sistem login dan Kartu Ujian.
            </p>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-amber-50/90 border border-amber-200 rounded-3xl flex items-start gap-3 text-xs text-amber-950 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-extrabold text-amber-950">
              Mode Lihat Saja (Read-Only)
            </p>
            <p className="text-[11.5px] text-amber-900 leading-relaxed font-medium">
              Fitur modifikasi akun (Kunci, Buka Kunci, Generate, Edit, Reset) hanya dapat diakses oleh pengguna dengan role <strong>Admin</strong>, <strong>Operator</strong>, dan <strong>Proktor</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Siswa Terdaftar</p>
            <p className="text-lg font-black text-slate-900">{stats.total} Murid</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Tersimpan &amp; Terkunci</p>
            <p className="text-lg font-black text-emerald-700">{stats.lockedCount} Akun</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <LockOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Belum Terkunci</p>
            <p className="text-lg font-black text-amber-700">{stats.unlockedCount} Akun</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Tingkat Penguncian</p>
            <p className="text-lg font-black text-cyan-700">{stats.percentLocked}% Terkunci</p>
          </div>
        </div>
      </div>

      {/* Main Content Area: Toolbar & Table */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-5">
        {/* Toolbar & Action Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, NISN, atau username..."
                value={credSearch}
                onChange={(e) => setCredSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Kelas */}
            <select
              value={credClassFilter}
              onChange={(e) => setCredClassFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Kelas ({students.length})</option>
              {classes.map((c) => (
                <option key={c.id} value={c.nama}>
                  {c.nama} ({students.filter((s) => s.kelas === c.nama).length})
                </option>
              ))}
            </select>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Status Akun</option>
              <option value="LOCKED">Tersimpan &amp; Terkunci</option>
              <option value="UNLOCKED">Belum Terkunci</option>
            </select>
          </div>

          {/* Mass Lock & Generate Buttons - Role Gated */}
          {isAuthorizedManager && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {isCurrentFilterAllLocked ? (
                <button
                  type="button"
                  onClick={handleTriggerMassUnlock}
                  className="px-3.5 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                  title="Buka kunci untuk memodifikasi atau regenerasi"
                >
                  <LockOpen className="w-4 h-4 text-amber-700" />
                  <span>Buka Kunci Akun ({credClassFilter === 'ALL' ? 'Semua' : credClassFilter})</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleTriggerMassLock}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                  title="Simpan permanen ke database dan kunci akun"
                >
                  <Lock className="w-4 h-4 text-emerald-100" />
                  <span>Simpan &amp; Kunci Akun ({credClassFilter === 'ALL' ? 'Semua' : credClassFilter})</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleTriggerMassGenerate}
                disabled={isCurrentFilterAllLocked}
                className={`px-4 py-2.5 rounded-xl text-white font-black text-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95 ${
                  isCurrentFilterAllLocked
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20'
                }`}
                title={
                  isCurrentFilterAllLocked
                    ? 'Akun telah terkunci permanen. Buka kunci terlebih dahulu jika ingin generate ulang.'
                    : 'Generate akun 8-digit acak baru'
                }
              >
                <Sparkles className="w-4 h-4 text-indigo-200" />
                <span>Generate Massal 8-Digit</span>
              </button>
            </div>
          )}
        </div>

        {/* Informative helper callout if accounts are locked */}
        {isCurrentFilterAllLocked && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-950">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-bold">
                Seluruh akun untuk {credClassFilter === 'ALL' ? 'semua siswa' : `kelas ${credClassFilter}`} telah berada dalam status <strong>Tersimpan &amp; Terkunci</strong>.
              </span>
            </div>
            {isAuthorizedManager && (
              <span className="text-[11px] text-emerald-800 font-semibold hidden sm:inline">
                Aksi generate acak dinonaktifkan untuk mencegah penimpaan kartu ujian. Gunakan &ldquo;Buka Kunci&rdquo; atau &ldquo;Edit&rdquo; jika ada perbaikan.
              </span>
            )}
          </div>
        )}

        {/* Table Kredensial Siswa */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-xs text-left text-slate-700">
            <thead className="bg-slate-100/80 text-slate-800 font-extrabold uppercase text-[10px] border-b border-slate-200">
              <tr>
                <th className="p-3.5 text-center w-12">No</th>
                <th className="p-3.5">Nama Siswa</th>
                <th className="p-3.5">NISN</th>
                <th className="p-3.5">Kelas</th>
                <th className="p-3.5">Username CBT (8 Digit)</th>
                <th className="p-3.5">Password CBT</th>
                <th className="p-3.5 text-center">Status Akun</th>
                <th className="p-3.5 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((std, idx) => {
                  const creds = getStudentCbtCredentials(std);
                  const displayUsername = std.examUsername && std.examUsername.trim().length === 8 ? std.examUsername.trim() : creds.username;
                  const displayPassword = std.examPassword && std.examPassword.trim().length >= 4 ? std.examPassword.trim() : creds.password;
                  const isPassVisible = showPasswords[std.id];
                  const isLocked = Boolean(std.isLocked);

                  return (
                    <tr key={std.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="p-3.5 font-extrabold text-slate-900">{std.nama}</td>
                      <td className="p-3.5 font-mono text-slate-600">{std.nisn || '-'}</td>
                      <td className="p-3.5">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {std.kelas}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <span className="font-extrabold text-indigo-900 tracking-wider bg-indigo-50/80 px-2.5 py-1 rounded-lg border border-indigo-200">
                          {displayUsername}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-800 tracking-wider">
                            {isPassVisible ? displayPassword : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePassVisibility(std.id)}
                            className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            title={isPassVisible ? 'Sembunyikan' : 'Lihat Sandi'}
                          >
                            {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Lock className="w-3 h-3 text-emerald-700" />
                            <span>Tersimpan &amp; Terkunci</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            <LockOpen className="w-3 h-3 text-amber-700" />
                            <span>Belum Terkunci</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-center">
                        {isAuthorizedManager ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditStudentModal(std)}
                              className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-[10.5px] transition-all cursor-pointer flex items-center gap-1"
                              title="Edit Manual Akun & Sandi"
                            >
                              <Edit3 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleTriggerSingleReset(std)}
                              className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10.5px] transition-all cursor-pointer flex items-center gap-1"
                              title="Reset 8-Digit Baru"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Reset</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Terkunci</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reusable Important Confirmation Modal */}
      <CbtAccountLockModal
        isOpen={isConfirmModalOpen}
        onClose={() => {
          if (!isSubmittingModal) {
            setIsConfirmModalOpen(false);
            setPendingAction(null);
          }
        }}
        onConfirm={handleExecuteConfirmedAction}
        title={modalTitle}
        classScope={modalClassScope}
        targetCount={modalTargetCount}
        isSubmitting={isSubmittingModal}
        studentDetails={modalStudentDetails}
      />

      {/* Edit Single Student Modal */}
      {editingStudent && (
        <AnimatePresence>
          <div
            onClick={() => setEditingStudent(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden my-auto text-slate-800 cursor-default"
            >
              {/* Header */}
              <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-400/30">
                    <Edit3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-white">Edit Kredensial CBT Siswa</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Khusus Admin, Operator &amp; Proktor</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="p-1 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 text-xs">
                {/* Student Info Box */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nama Siswa:</span>
                    <strong className="text-slate-900 uppercase font-black">{editingStudent.nama}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Kelas:</span>
                    <strong className="text-indigo-900 font-bold">{editingStudent.kelas}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">NISN:</span>
                    <span className="font-mono text-slate-700">{editingStudent.nisn || '-'}</span>
                  </div>
                </div>

                {editError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {/* Form Inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Username CBT (8-Digit Angka / Kustom):
                    </label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => {
                        setEditUsername(e.target.value);
                        setEditError(null);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Contoh: 81928374"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Password CBT:
                    </label>
                    <input
                      type="text"
                      value={editPassword}
                      onChange={(e) => {
                        setEditPassword(e.target.value);
                        setEditError(null);
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Contoh: 49201832"
                    />
                  </div>
                </div>

                <p className="text-[10.5px] text-slate-500 italic">
                  * Setelah disimpan, kredensial ini akan langsung terkunci permanen di database dan sinkron dengan kartu ujian serta sistem login CBT siswa.
                </p>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSubmitEditStudent}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Simpan &amp; Kunci Akun</span>
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};
