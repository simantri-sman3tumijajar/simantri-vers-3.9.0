import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useApp } from '../context/AppContext';
import { ExamActivityLogDoc, ExamSecurityConfig } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  RotateCcw,
  RefreshCw,
  Search,
  Filter,
  Lock,
  Unlock,
  AlertTriangle,
  UserCheck,
  UserX,
  Smartphone,
  Copy,
  Check,
  Eye,
  Info,
  Clock,
  Send,
  Zap,
  Activity,
  Layers,
  DoorOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_PIN = '482910';

export const ExamSecurityManager: React.FC = () => {
  const { state, currentUser, showToast, saveStudent, updateSchoolInfo, setCurrentView, setSelectedModule } = useApp();

  // Role validation: strictly admin, operator, proktor
  const isAuthorized = useMemo(() => {
    if (!currentUser) return false;
    const r = (currentUser.role || '').toLowerCase();
    const id = (currentUser.id || '').toLowerCase();
    return (
      r === 'admin' ||
      r === 'operator' ||
      currentUser.isAdmin === true ||
      currentUser.isOperator === true ||
      currentUser.isProctor === true ||
      Boolean(currentUser.roles?.includes('proctor')) ||
      id.includes('proktor') ||
      id.includes('admin') ||
      id.includes('operator')
    );
  }, [currentUser]);

  // Active PIN state
  const [activePin, setActivePin] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('smantri_proctor_security_pin')) || DEFAULT_PIN;
  });
  const [pinMetadata, setPinMetadata] = useState<{
    generatedAt?: string;
    updatedBy?: string;
    updatedByRole?: string;
  }>({});
  const [manualPinInput, setManualPinInput] = useState('');
  const [isCopiedPin, setIsCopiedPin] = useState(false);
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Real-time student activity logs from Firestore
  const [logs, setLogs] = useState<ExamActivityLogDoc[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BLOCKED' | 'LOCKED_PIN' | 'ACTIVE' | 'VIOLATION'>('ALL');
  const [classFilter, setClassFilter] = useState('ALL');

  // Action states
  const [processingId, setProcessingId] = useState<string | null>(null);

  // 1. Real-time listener on active 6-digit Security PIN
  useEffect(() => {
    if (!db) return;
    try {
      const pinDocRef = doc(db, 'exam_settings', 'security_pin');
      const unsubscribe = onSnapshot(
        pinDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as ExamSecurityConfig;
            if (data?.activePin && /^\d{6}$/.test(data.activePin.trim())) {
              const cleaned = data.activePin.trim();
              setActivePin(cleaned);
              setPinMetadata({
                generatedAt: data.generatedAt,
                updatedBy: data.updatedBy,
                updatedByRole: data.updatedByRole,
              });
              try {
                localStorage.setItem('smantri_proctor_security_pin', cleaned);
              } catch (e) {}
            }
          } else {
            // Document doesn't exist yet, bootstrap default
            setDoc(pinDocRef, {
              id: 'security_pin',
              activePin: DEFAULT_PIN,
              generatedAt: new Date().toISOString(),
              updatedBy: 'Sistem Pusat CBT',
              updatedByRole: 'system',
              isActive: true,
            }).catch(() => {});
          }
        },
        (err) => {
          console.warn('[ExamSecurityManager] PIN snapshot notice:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {}
  }, []);

  // 2. Real-time listener on exam_activity_logs collection
  useEffect(() => {
    if (!db) {
      setIsLoadingLogs(false);
      return;
    }
    try {
      const logsRef = collection(db, 'exam_activity_logs');
      const unsubscribe = onSnapshot(
        logsRef,
        (snapshot) => {
          const list: ExamActivityLogDoc[] = [];
          snapshot.forEach((d) => {
            list.push({ id: d.id, ...(d.data() as any) });
          });
          setLogs(list);
          setIsLoadingLogs(false);
        },
        (err) => {
          console.warn('[ExamSecurityManager] Logs listener notice:', err);
          setIsLoadingLogs(false);
        }
      );
      return () => unsubscribe();
    } catch (e) {
      setIsLoadingLogs(false);
    }
  }, []);

  // Generate 6 random numeric digits and save to Firestore
  const handleGenerateRandomPin = async () => {
    setIsUpdatingPin(true);
    // Generate 6 random digits between 100000 and 999999
    const newRandomPin = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      if (db) {
        const pinDocRef = doc(db, 'exam_settings', 'security_pin');
        await setDoc(
          pinDocRef,
          {
            id: 'security_pin',
            activePin: newRandomPin,
            generatedAt: new Date().toISOString(),
            updatedBy: currentUser?.nama || 'Admin CBT',
            updatedByRole: currentUser?.role || 'admin',
            isActive: true,
          },
          { merge: true }
        );
      }
      setActivePin(newRandomPin);
      localStorage.setItem('smantri_proctor_security_pin', newRandomPin);
      showToast('PIN Pengawas Baru Dibuat', `PIN 6-digit aktif: ${newRandomPin} (Berlaku instan real-time ke semua HP siswa).`, 'success');
    } catch (err) {
      console.warn('Gagal menyimpan PIN baru ke Firestore:', err);
      setActivePin(newRandomPin);
      localStorage.setItem('smantri_proctor_security_pin', newRandomPin);
      showToast('PIN Diperbarui (Lokal)', `PIN baru: ${newRandomPin}`, 'info');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  // Save manual 6-digit PIN
  const handleSaveManualPin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualPinInput.trim();
    if (!/^\d{6}$/.test(clean)) {
      showToast('Format PIN Tidak Valid', 'PIN Pengawas wajib terdiri dari tepat 6 digit angka numerik (contoh: 582910).', 'warning');
      return;
    }

    setIsUpdatingPin(true);
    try {
      if (db) {
        const pinDocRef = doc(db, 'exam_settings', 'security_pin');
        await setDoc(
          pinDocRef,
          {
            id: 'security_pin',
            activePin: clean,
            generatedAt: new Date().toISOString(),
            updatedBy: currentUser?.nama || 'Admin CBT',
            updatedByRole: currentUser?.role || 'admin',
            isActive: true,
          },
          { merge: true }
        );
      }
      setActivePin(clean);
      localStorage.setItem('smantri_proctor_security_pin', clean);
      setManualPinInput('');
      showToast('PIN Berhasil Diperbarui', `PIN Pengawas sekarang diatur ke: ${clean}`, 'success');
    } catch (err) {
      console.warn('Gagal menyimpan manual PIN ke Firestore:', err);
      setActivePin(clean);
      setManualPinInput('');
      showToast('PIN Diperbarui', `PIN aktif: ${clean}`, 'info');
    } finally {
      setIsUpdatingPin(false);
    }
  };

  // Copy PIN helper
  const handleCopyPin = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(activePin);
      setIsCopiedPin(true);
      setTimeout(() => setIsCopiedPin(false), 2000);
      showToast('PIN Disalin', `PIN Pengawas (${activePin}) telah disalin ke clipboard.`, 'info');
    }
  };

  // ACTION: Buka Blokir & Reset Akses Siswa (mengembalikan dari BLOCKED_PERMANENT atau LOCKED_PIN ke ACTIVE)
  const handleUnblockAndReset = async (item: ExamActivityLogDoc) => {
    setProcessingId(item.id);
    try {
      if (db) {
        const logDocRef = doc(db, 'exam_activity_logs', item.id);
        await updateDoc(logDocRef, {
          isBlocked: false,
          lockStage: 0,
          violationCount: 0,
          currentStatus: 'ACTIVE',
          antiCheatColor: 'GREEN',
          hasUsedPinUnlock: false,
          isLocked: false,
          warningMessage: 'Akses ujian dan login Anda telah dibuka kembali oleh Proktor/Admin Pusat.',
          updatedAt: new Date().toISOString(),
        });
      }

      // Also reset state in AppContext students if matching
      const foundStudent = (state.students || []).find((s) => s.id === item.studentId);
      if (foundStudent && foundStudent.isBlocked) {
        const updatedStudent = {
          ...foundStudent,
          isBlocked: false,
          blockedAt: undefined,
          blockedReason: undefined,
        };
        await saveStudent(updatedStudent);
      }

      // Clear local storage key if on this browser
      try {
        localStorage.removeItem(`simantri_blocked_${item.studentId}`);
        localStorage.removeItem(`simantri_anticheat_${item.studentId}_${item.examId}`);
      } catch (e) {}

      showToast(
        'Akses Berhasil Dibuka!',
        `Siswa ${item.studentName} (${item.className}) berhasil di-unblock dan pelanggaran direset ke 0. Siswa dapat login dan melanjutkan ujian kembali.`,
        'success'
      );
    } catch (err) {
      console.warn('Gagal membuka blokir siswa:', err);
      showToast('Gagal Membuka Blokir', 'Pastikan koneksi internet proktor aktif.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  // ACTION: Buka Kunci Siklus 1 Saja (Remote Unlock tanpa siswa mengetik PIN)
  const handleRemoteUnlockPin = async (item: ExamActivityLogDoc) => {
    setProcessingId(item.id);
    try {
      if (db) {
        const logDocRef = doc(db, 'exam_activity_logs', item.id);
        await updateDoc(logDocRef, {
          lockStage: 0,
          isLocked: false,
          currentStatus: 'ACTIVE',
          antiCheatColor: 'YELLOW',
          hasUsedPinUnlock: true,
          warningMessage: 'Kunci ujian Anda telah dibuka secara remote oleh Pengawas Ruang.',
          updatedAt: new Date().toISOString(),
        });
      }
      showToast(
        'Kunci Ujian Dibuka',
        `Kunci sementara siswa ${item.studentName} dibuka. Siswa masuk ke Siklus 2.`,
        'success'
      );
    } catch (err) {
      console.warn('Gagal remote unlock:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered & Sorted student list
  const filteredLogs = useMemo(() => {
    return logs
      .filter((item) => {
        // Class filter
        if (classFilter !== 'ALL' && item.className !== classFilter) return false;

        // Status filter
        if (statusFilter === 'BLOCKED') {
          if (!item.isBlocked && item.lockStage !== 2 && (item.violationCount || 0) < 6) return false;
        } else if (statusFilter === 'LOCKED_PIN') {
          if (item.lockStage !== 1 && item.currentStatus !== 'LOCKED_PIN') return false;
        } else if (statusFilter === 'ACTIVE') {
          if (item.isBlocked || item.lockStage === 1) return false;
        } else if (statusFilter === 'VIOLATION') {
          if ((item.violationCount || 0) === 0) return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = (item.studentName || '').toLowerCase().includes(q);
          const matchClass = (item.className || '').toLowerCase().includes(q);
          const matchDev = (item.deviceInfo || '').toLowerCase().includes(q);
          const matchReason = (item.lastViolationReason || '').toLowerCase().includes(q);
          if (!matchName && !matchClass && !matchDev && !matchReason) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Priority: BLOCKED (weight 3) > LOCKED_PIN (weight 2) > Violations > Name
        const getWeight = (i: ExamActivityLogDoc) => {
          if (i.isBlocked || i.lockStage === 2 || (i.violationCount || 0) >= 6) return 3;
          if (i.lockStage === 1 || i.currentStatus === 'LOCKED_PIN') return 2;
          return 1;
        };
        const wA = getWeight(a);
        const wB = getWeight(b);
        if (wA !== wB) return wB - wA;

        const vA = a.violationCount || 0;
        const vB = b.violationCount || 0;
        if (vA !== vB) return vB - vA;

        return (a.studentName || '').localeCompare(b.studentName || '');
      });
  }, [logs, classFilter, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    let total = logs.length;
    let safeCount = 0;
    let lockedPinCount = 0;
    let blockedCount = 0;

    logs.forEach((item) => {
      if (item.isBlocked || item.lockStage === 2 || (item.violationCount || 0) >= 6) {
        blockedCount++;
      } else if (item.lockStage === 1 || item.currentStatus === 'LOCKED_PIN') {
        lockedPinCount++;
      } else {
        safeCount++;
      }
    });

    return { total, safeCount, lockedPinCount, blockedCount };
  }, [logs]);

  // Access denial for unauthorized roles
  if (!isAuthorized) {
    return (
      <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4 max-w-lg mx-auto my-12 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Akses Terbatas: Khusus Admin, Operator &amp; Proktor</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Halaman Pengaturan PIN Pengawas dan Manajemen Anti-Cheat hanya dapat diakses oleh Administrator, Operator, atau Proktor Ujian yang berwenang.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 selection:bg-amber-600 selection:text-white">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-6 sm:p-8 text-white shadow-xl shadow-slate-950/20 border border-slate-800">
        <div className="absolute right-0 top-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              <span>Modul Anti-Cheat Multi-Level &amp; Manajemen PIN Pengawas</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Pusat Keamanan &amp; Protokol Integritas CBT
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
              Sistem eskalasi 2 siklus (6-strike) otomatis: deteksi keluar browser, split-screen, dan tombol back pada HP siswa, alarm Web Audio otomatis, manajemen PIN 6-digit ruang ujian, serta pemulihan blokir akses terpusat.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700 text-xs font-extrabold text-amber-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
              <span>Real-Time Sync Aktif</span>
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CARD 0: SAKELAR KONTROL AKSES PENGAWAS UJIAN CBT (REAL-TIME TOGGLE)
          Otoritas: Admin, Operator, dan Proktor
          ===================================================================== */}
      {(() => {
        const isSupervisorActive = Boolean(
          state?.schoolInfo?.cbtSupervisorConfig?.globalSupervisorActive ??
          state?.schoolInfo?.globalProctorMode ??
          true
        );

        const handleToggleGlobalSupervisor = async () => {
          const nextState = !isSupervisorActive;
          const currentConfig = state?.schoolInfo?.cbtSupervisorConfig || {
            globalSupervisorActive: true,
            allowForceSubmit: true,
            allowIncidentalTime: true,
            allowResetSession: true,
            requireProctorPinForUnlock: true,
          };
          await updateSchoolInfo({
            globalProctorMode: nextState,
            cbtSupervisorConfig: {
              ...currentConfig,
              globalSupervisorActive: nextState,
              updatedAt: new Date().toISOString(),
              updatedBy: currentUser?.nama || 'Proktor/Admin',
            },
          });
          showToast(
            nextState ? 'Izin Pengawas Diaktifkan (ON)' : 'Izin Pengawas Dinonaktifkan (OFF)',
            nextState
              ? 'Tombol "Portal Pengawas Ujian" kini otomatis tampil secara real-time di seluruh akun Guru Mapel.'
              : 'Tombol "Portal Pengawas Ujian" pada seluruh akun Guru Mapel kini disembunyikan dan akses dikunci.',
            nextState ? 'success' : 'info'
          );
        };

        return (
          <div className="bg-white rounded-3xl border-2 border-indigo-200 shadow-md p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-600" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                  isSupervisorActive
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-100 text-slate-600 border border-slate-300'
                }`}>
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                      Izin Pengawas Ujian CBT (Real-Time Control)
                    </h2>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      isSupervisorActive
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      {isSupervisorActive ? 'STATUS: AKTIF (ON)' : 'STATUS: NONAKTIF (OFF)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Otoritas Pengendali: <strong>Admin, Operator, &amp; Proktor</strong>. Kendalikan visibilitas tombol &amp; akses Portal Pengawas pada seluruh akun Guru Mapel.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleGlobalSupervisor}
                  className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer flex items-center gap-2 active:scale-95 shadow-sm ${
                    isSupervisorActive
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  }`}
                  title={isSupervisorActive ? 'Matikan Izin Pengawas Guru Mapel' : 'Aktifkan Izin Pengawas Guru Mapel'}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>{isSupervisorActive ? 'Tutup Izin Pengawas' : 'Buka Izin Pengawas'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentView('standalone-supervisor');
                    setSelectedModule('pengawas');
                  }}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95"
                >
                  <DoorOpen className="w-4 h-4" />
                  <span>Buka Portal Pengawas Mandiri</span>
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-medium">
                <span className={`w-2.5 h-2.5 rounded-full ${isSupervisorActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>
                  Perilaku Reaktif: Saat <strong>ON</strong>, kartu "Portal Pengawas Ujian" otomatis muncul di Portal Guru Mapel. Saat <strong>OFF</strong>, tombol hilang otomatis dan akses route langsung terkunci.
                </span>
              </span>
              <span className="text-[11px] font-mono font-semibold text-slate-500 shrink-0">
                Diperbarui: {state?.schoolInfo?.cbtSupervisorConfig?.updatedBy || 'Sistem SiMantri'}
              </span>
            </div>
          </div>
        );
      })()}

      {/* =====================================================================
          CARD 1: PANEL MANAJEMEN PIN 6-DIGIT PENGAWAS
          ===================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                Panel Manajemen PIN 6-Digit Pengawas
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                PIN aktif digunakan pengawas ruang untuk membuka kunci Siklus 1 (Pelanggaran ke-3) di HP siswa.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateRandomPin}
              disabled={isUpdatingPin}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white font-black text-xs shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <RotateCcw className={`w-4 h-4 ${isUpdatingPin ? 'animate-spin' : ''}`} />
              <span>Generate PIN Acak Baru</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Big Active PIN Card */}
          <div className="lg:col-span-6 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 p-6 rounded-3xl text-white shadow-xl shadow-amber-600/25 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-3">
              <div className="flex justify-between items-center">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/20 text-white border border-white/20">
                  PIN Pengawas Aktif Saat Ini
                </span>
                <span className="text-[10px] font-extrabold text-amber-100 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
              </div>

              {/* Huge 6-Digit Display */}
              <div className="flex items-center justify-between gap-3 bg-black/20 p-4 rounded-2xl border border-white/20">
                <div className="font-mono text-3xl sm:text-4xl font-black tracking-widest text-white drop-shadow-sm select-all">
                  {activePin}
                </div>

                <button
                  type="button"
                  onClick={handleCopyPin}
                  className="px-3.5 py-2 rounded-xl bg-white text-slate-900 hover:bg-amber-50 font-black text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-md shrink-0 active:scale-95"
                >
                  {isCopiedPin ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-700" />
                      <span>Salin PIN</span>
                    </>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-amber-100 flex flex-wrap items-center justify-between gap-2 pt-1">
                <span>
                  Diperbarui oleh: <strong>{pinMetadata.updatedBy || 'Administrator'}</strong>
                </span>
                {pinMetadata.generatedAt && (
                  <span>
                    {new Date(pinMetadata.generatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Manual PIN Form */}
          <div className="lg:col-span-6 bg-slate-50 border border-slate-200 p-5 rounded-3xl space-y-3">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Ubah PIN Manual (Kustom 6 Digit)
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Jika ingin menentukan angka PIN khusus untuk pengawas ruang tertentu, masukkan 6 digit angka numerik di bawah ini:
            </p>

            <form onSubmit={handleSaveManualPin} className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={manualPinInput}
                onChange={(e) => setManualPinInput(e.target.value.replace(/\D/g, ''))}
                placeholder="Misal: 739201"
                className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-300 focus:border-indigo-600 focus:bg-white bg-white text-sm font-mono font-black tracking-widest text-slate-900 outline-hidden transition-all"
              />
              <button
                type="submit"
                disabled={isUpdatingPin || manualPinInput.length !== 6}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Simpan PIN</span>
              </button>
            </form>

            <div className="p-3 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-500 flex items-start gap-2">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                Begitu PIN diubah (acak atau manual), seluruh HP siswa yang terkunci akan langsung memvalidasi terhadap PIN baru tersebut secara otomatis.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CARD 2: TABEL MONITORING KEAMANAN & BUKA BLOKIR REAL-TIME
          ===================================================================== */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
        {/* Header & Metrics Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 leading-snug">
                Monitoring Status Keamanan &amp; Buka Blokir Siswa
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Pantau siswa yang aktif, terkunci PIN (Siklus 1), atau terblokir otomatis (Siklus 2) secara real-time.
              </p>
            </div>
          </div>
        </div>

        {/* 3-Tier Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 space-y-1">
            <span className="text-[10px] text-emerald-700 font-black uppercase tracking-wider block">
              🟢 Aman / Aktif
            </span>
            <div className="text-2xl font-black text-emerald-950">
              {stats.safeCount} <span className="text-xs text-emerald-700 font-bold">Siswa</span>
            </div>
            <span className="text-[10px] text-emerald-600 block">0 s.d. 2 Pelanggaran</span>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-1">
            <span className="text-[10px] text-amber-700 font-black uppercase tracking-wider block">
              🟡 Terkunci PIN (Pengawas)
            </span>
            <div className="text-2xl font-black text-amber-950">
              {stats.lockedPinCount} <span className="text-xs text-amber-700 font-bold">Siswa</span>
            </div>
            <span className="text-[10px] text-amber-600 block">Siklus 1 (3 Pelanggaran)</span>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 space-y-1">
            <span className="text-[10px] text-rose-700 font-black uppercase tracking-wider block">
              🔴 TERBLOKIR OTOMATIS
            </span>
            <div className="text-2xl font-black text-rose-950">
              {stats.blockedCount} <span className="text-xs text-rose-700 font-bold">Siswa</span>
            </div>
            <span className="text-[10px] text-rose-600 block">Siklus 2 (6 Pelanggaran)</span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">
              Total Terpantau
            </span>
            <div className="text-2xl font-black text-slate-900">
              {stats.total} <span className="text-xs text-slate-500 font-bold">Peserta</span>
            </div>
            <span className="text-[10px] text-slate-400 block">Di Ruang Ujian</span>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Status Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('BLOCKED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'BLOCKED'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <UserX className="w-3.5 h-3.5" />
              <span>Terblokir ({stats.blockedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('LOCKED_PIN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 ${
                statusFilter === 'LOCKED_PIN'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Terkunci PIN ({stats.lockedPinCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('VIOLATION')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                statusFilter === 'VIOLATION'
                  ? 'bg-orange-600 text-white'
                  : 'bg-orange-50 text-orange-800 hover:bg-orange-100'
              }`}
            >
              Ada Pelanggaran
            </button>
          </div>

          {/* Search Input & Class Filter */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa / kelas / perangkat..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium focus:bg-white focus:border-amber-500 outline-hidden transition-all"
              />
            </div>

            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="py-2 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 focus:bg-white outline-hidden cursor-pointer"
            >
              <option value="ALL">Semua Kelas</option>
              {(state.classes || []).map((c) => (
                <option key={c.id} value={c.nama}>
                  {c.nama}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table of Monitored Students */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Peserta &amp; Kelas</th>
                  <th className="py-3 px-4">Perangkat HP</th>
                  <th className="py-3 px-4 text-center">Pelanggaran</th>
                  <th className="py-3 px-4">Pelanggaran Terakhir</th>
                  <th className="py-3 px-4 text-center">Status Keamanan</th>
                  <th className="py-3 px-4 text-right">Aksi Proktor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2 text-amber-500" />
                      Memuat data pengawasan real-time dari server...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      Tidak ada data siswa yang sesuai dengan filter.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => {
                    const isItemBlocked = item.isBlocked || item.lockStage === 2 || (item.violationCount || 0) >= 6;
                    const isItemLockedPin = !isItemBlocked && (item.lockStage === 1 || item.currentStatus === 'LOCKED_PIN');
                    const violations = item.violationCount || 0;

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isItemBlocked
                            ? 'bg-rose-50/70 hover:bg-rose-50'
                            : isItemLockedPin
                            ? 'bg-amber-50/60 hover:bg-amber-50'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Student Name & Class */}
                        <td className="py-3.5 px-4 font-medium">
                          <div className="font-black text-slate-900 uppercase">
                            {item.studentName || 'Peserta'}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
                            <span className="font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded-md">
                              {item.className || '-'}
                            </span>
                            <span>&bull; {item.examType || 'CBT'}</span>
                          </div>
                        </td>

                        {/* Device Info */}
                        <td className="py-3.5 px-4 text-slate-600">
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <Smartphone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[160px]">{item.deviceInfo || 'HP Siswa'}</span>
                          </div>
                        </td>

                        {/* Violation Count */}
                        <td className="py-3.5 px-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-black ${
                                violations >= 6
                                  ? 'bg-rose-600 text-white'
                                  : violations >= 3
                                  ? 'bg-amber-500 text-white'
                                  : violations > 0
                                  ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {violations} / 6
                            </span>
                          </div>
                        </td>

                        {/* Last Violation Reason */}
                        <td className="py-3.5 px-4 text-slate-600">
                          {violations > 0 ? (
                            <div className="space-y-0.5">
                              <span className="font-bold text-rose-700 text-xs block truncate max-w-[200px]">
                                {item.lastViolationReason || 'Keluar Halaman Ujian'}
                              </span>
                              {item.lastViolationTime && (
                                <span className="text-[10px] text-slate-400 block">
                                  Pukul {item.lastViolationTime} WIB
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">Belum ada pelanggaran</span>
                          )}
                        </td>

                        {/* Security Status Badge */}
                        <td className="py-3.5 px-4 text-center">
                          {isItemBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white shadow-xs">
                              <UserX className="w-3.5 h-3.5" />
                              <span>TERBLOKIR OTOMATIS</span>
                            </span>
                          ) : isItemLockedPin ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-500 text-white shadow-xs animate-pulse">
                              <Lock className="w-3.5 h-3.5" />
                              <span>Terkunci PIN (Siklus 1)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Aman / Aktif</span>
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isItemBlocked ? (
                              <button
                                type="button"
                                onClick={() => handleUnblockAndReset(item)}
                                disabled={processingId === item.id}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                <span>Buka Blokir &amp; Reset Akses</span>
                              </button>
                            ) : isItemLockedPin ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleRemoteUnlockPin(item)}
                                  disabled={processingId === item.id}
                                  className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                                  title="Buka kunci siswa tanpa harus mengetik PIN di HP"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Buka Kunci PIN</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUnblockAndReset(item)}
                                  disabled={processingId === item.id}
                                  className="px-2.5 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                                  title="Reset hitungan pelanggaran ke 0"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Reset 0</span>
                                </button>
                              </div>
                            ) : violations > 0 ? (
                              <button
                                type="button"
                                onClick={() => handleUnblockAndReset(item)}
                                disabled={processingId === item.id}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 active:scale-95 disabled:opacity-50"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset Pelanggaran</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Tidak ada tindakan</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
