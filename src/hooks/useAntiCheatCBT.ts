import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { StudentExamStatus, AntiCheatColor, StudentActivityLogItem, ExamActivityLogDoc, ExamSecurityConfig } from '../types';

export interface UseAntiCheatCBTProps {
  examId: string;
  studentId: string;
  studentName: string;
  className: string;
  examType?: string;
  isEnabled?: boolean;
  onForceSubmit?: () => void;
  sessionNumber?: number;
  workstationId?: string;
  lastSavedAnswersCount?: number;
}

export interface AntiCheatWarningData {
  strike: number;
  cycle: 1 | 2;
  cycleStrike: number;
  reason: string;
  timestamp: string;
  detail?: string;
}

const DEFAULT_PIN = '482910';

export function useAntiCheatCBT({
  examId,
  studentId,
  studentName,
  className,
  examType = 'CBT',
  isEnabled = true,
  onForceSubmit,
  sessionNumber = 1,
  workstationId,
  lastSavedAnswersCount = 0,
}: UseAntiCheatCBTProps) {
  // Safe storage keys
  const storageKey = `simantri_anticheat_${studentId || 'anon'}_${examId || 'cbt'}`;
  const blockedKey = `simantri_blocked_${studentId || 'anon'}`;
  const docId = `${examId || 'cbt'}_${studentId || 'anon'}`;

  // Read initial cached state
  const getInitialState = () => {
    if (typeof window === 'undefined') {
      return { violationCount: 0, lockStage: 0, hasUsedPinUnlock: false, isBlocked: false };
    }
    const isPermanentlyBlocked = localStorage.getItem(blockedKey) === 'true';
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          violationCount: typeof parsed.violationCount === 'number' ? parsed.violationCount : 0,
          lockStage: isPermanentlyBlocked ? 2 : (typeof parsed.lockStage === 'number' ? parsed.lockStage : 0),
          hasUsedPinUnlock: Boolean(parsed.hasUsedPinUnlock),
          isBlocked: isPermanentlyBlocked || Boolean(parsed.isBlocked),
        };
      }
    } catch (e) {}
    return {
      violationCount: 0,
      lockStage: isPermanentlyBlocked ? 2 : 0,
      hasUsedPinUnlock: false,
      isBlocked: isPermanentlyBlocked,
    };
  };

  const initial = getInitialState();

  // Primary state variables
  const [violationCount, setViolationCount] = useState<number>(initial.violationCount);
  const [lockStage, setLockStage] = useState<number>(initial.lockStage); // 0 = Aktif, 1 = LOCKED_PIN (Siklus 1), 2 = BLOCKED_PERMANENT (Siklus 2)
  const [hasUsedPinUnlock, setHasUsedPinUnlock] = useState<boolean>(initial.hasUsedPinUnlock);
  const [isBlocked, setIsBlocked] = useState<boolean>(initial.isBlocked);
  const [currentStatus, setCurrentStatus] = useState<StudentExamStatus>(
    initial.isBlocked ? 'BLOCKED_PERMANENT' : (initial.lockStage === 1 ? 'LOCKED_PIN' : 'ACTIVE')
  );
  const [antiCheatColor, setAntiCheatColor] = useState<AntiCheatColor>(
    initial.isBlocked || initial.lockStage === 1 ? 'RED' : (initial.violationCount > 0 ? 'YELLOW' : 'GREEN')
  );

  // Modals state
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningData, setWarningData] = useState<AntiCheatWarningData | null>(null);
  const [showLockModal, setShowLockModal] = useState<boolean>(initial.lockStage === 1 && !initial.isBlocked);
  const [showBlockModal, setShowBlockModal] = useState<boolean>(initial.isBlocked);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(false);
  const [recentLogs, setRecentLogs] = useState<StudentActivityLogItem[]>([]);
  const [activePin, setActivePin] = useState<string>(() => {
    return (typeof window !== 'undefined' && localStorage.getItem('smantri_proctor_security_pin')) || DEFAULT_PIN;
  });
  const [isSusulanRedirect, setIsSusulanRedirect] = useState<boolean>(false);
  const [susulanReason, setSusulanReason] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false;
  });

  const workstationIdRef = useRef(workstationId);
  workstationIdRef.current = workstationId;
  const sessionNumberRef = useRef(sessionNumber);
  sessionNumberRef.current = sessionNumber;
  const lastSavedAnswersCountRef = useRef(lastSavedAnswersCount);
  lastSavedAnswersCountRef.current = lastSavedAnswersCount;

  // Tracking refs
  const lastViolationTimestampRef = useRef<number>(0);
  const violationCountRef = useRef<number>(initial.violationCount);
  const lockStageRef = useRef<number>(initial.lockStage);
  const hasUsedPinUnlockRef = useRef<boolean>(initial.hasUsedPinUnlock);
  const isBlockedRef = useRef<boolean>(initial.isBlocked);
  const initialWidthRef = useRef<number>(typeof window !== 'undefined' ? window.innerWidth : 360);
  const initialHeightRef = useRef<number>(typeof window !== 'undefined' ? window.innerHeight : 640);
  const isSubmittedRef = useRef<boolean>(false);
  const recentLogsRef = useRef<StudentActivityLogItem[]>([]);
  const onForceSubmitRef = useRef(onForceSubmit);
  onForceSubmitRef.current = onForceSubmit;

  // Web Audio API refs for siren generator
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeOscillatorsRef = useRef<OscillatorNode[]>([]);
  const activeGainRef = useRef<GainNode | null>(null);

  // Initialize/Unlock AudioContext on student first gesture
  const initAudio = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    } catch (e) {
      console.warn('[AntiCheat] Audio init notice:', e);
    }
  }, []);

  // Web Audio API: Single brief warning beep for strikes 1, 2, 4, 5
  const playWarningBeep = useCallback(() => {
    try {
      initAudio();
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(659, now); // E5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {}

    // Mobile vibration if supported
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
    } catch (e) {}
  }, [initAudio]);

  // Web Audio API: Harsh low tone for permanent block (Strike 6)
  const playBlockedTone = useCallback(() => {
    try {
      initAudio();
      const ctx = audioContextRef.current;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.setValueAtTime(164.8, now + 0.25); // E3
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.82);
    } catch (e) {}

    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([400, 150, 400, 150, 600]);
      }
    } catch (e) {}
  }, [initAudio]);

  // Stop looping siren sound immediately
  const stopAlarm = useCallback(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    activeOscillatorsRef.current.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch (e) {}
    });
    activeOscillatorsRef.current = [];
    if (activeGainRef.current) {
      try {
        activeGainRef.current.disconnect();
      } catch (e) {}
      activeGainRef.current = null;
    }
    setIsAlarmPlaying(false);
  }, []);

  // Web Audio API: Loud, Looping Siren / Emergency Alarm (Strike 3 - Siklus 1)
  const startAlarm = useCallback(() => {
    try {
      initAudio();
      stopAlarm(); // Clear any previous instance

      const ctx = audioContextRef.current;
      if (!ctx) return;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.connect(ctx.destination);
      activeGainRef.current = gain;

      // Create a high-intensity dual tone siren alternating frequencies
      let toneHigh = true;

      const triggerSirenPulse = () => {
        if (!audioContextRef.current) return;
        try {
          const osc = audioContextRef.current.createOscillator();
          osc.type = 'sawtooth';
          const now = audioContextRef.current.currentTime;
          const targetFreq = toneHigh ? 960 : 640;
          osc.frequency.setValueAtTime(targetFreq, now);
          osc.frequency.exponentialRampToValueAtTime(toneHigh ? 1200 : 720, now + 0.26);

          osc.connect(gain);
          osc.start(now);
          osc.stop(now + 0.28);
          toneHigh = !toneHigh;
        } catch (e) {}
      };

      triggerSirenPulse();
      alarmIntervalRef.current = setInterval(triggerSirenPulse, 320);
      setIsAlarmPlaying(true);

      // Continuous mobile vibration pulses
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([300, 100, 300, 100, 300]);
      }
    } catch (e) {
      console.warn('[AntiCheat] Alarm sound bypassed:', e);
    }
  }, [initAudio, stopAlarm]);

  // Clean device info string
  const getDeviceInfo = (): string => {
    if (typeof window === 'undefined') return 'Mobile HP';
    const ua = navigator.userAgent || '';
    let os = 'Android';
    if (/android/i.test(ua)) os = 'Android HP';
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS iPhone';
    else if (/windows/i.test(ua)) os = 'Windows PC';
    else if (/macintosh/i.test(ua)) os = 'Mac';
    return `${os} (${window.innerWidth}x${window.innerHeight})`;
  };

  // Quota-efficient Firestore synchronization helper
  const syncToFirestore = useCallback(
    async (
      status: StudentExamStatus,
      color: AntiCheatColor,
      action: string,
      detail: string,
      opts?: {
        violationCount?: number;
        lockStage?: number;
        hasUsedPinUnlock?: boolean;
        isBlocked?: boolean;
      }
    ) => {
      if (!isEnabled || isSubmittedRef.current || !studentId) return;

      const now = new Date();
      const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const newLogItem: StudentActivityLogItem = {
        timestamp: timeStr,
        action,
        detail,
      };

      const updatedLogs = [...recentLogsRef.current, newLogItem].slice(-6);
      recentLogsRef.current = updatedLogs;
      setRecentLogs(updatedLogs);

      const payload: Partial<ExamActivityLogDoc> = {
        id: docId,
        studentId,
        studentName,
        className,
        examId,
        examType,
        deviceInfo: getDeviceInfo(),
        currentStatus: status,
        antiCheatColor: color,
        violationCount: opts?.violationCount !== undefined ? opts.violationCount : violationCountRef.current,
        lockStage: opts?.lockStage !== undefined ? opts.lockStage : lockStageRef.current,
        hasUsedPinUnlock: opts?.hasUsedPinUnlock !== undefined ? opts.hasUsedPinUnlock : hasUsedPinUnlockRef.current,
        isBlocked: opts?.isBlocked !== undefined ? opts.isBlocked : isBlockedRef.current,
        examStatus: opts?.isBlocked ? 'BLOCKED' : (opts?.lockStage === 1 ? 'LOCKED' : 'ACTIVE'),
        lastViolationReason: action,
        lastViolationTime: timeStr,
        lastStatusChange: now.toISOString(),
        recentLogs: updatedLogs,
        isLocked: (opts?.lockStage || lockStageRef.current) > 0,
        workstationId: workstationIdRef.current || (typeof window !== 'undefined' && localStorage.getItem('simantri_workstation_meta') ? (JSON.parse(localStorage.getItem('simantri_workstation_meta') || '{}').workstationId || 'CB-01') : 'CB-01'),
        sessionNumber: sessionNumberRef.current || 1,
        lastSavedAnswersCount: lastSavedAnswersCountRef.current || 0,
        isFullscreen: typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : true,
        updatedAt: now.toISOString(),
      };

      // Persist locally
      try {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            violationCount: payload.violationCount,
            lockStage: payload.lockStage,
            hasUsedPinUnlock: payload.hasUsedPinUnlock,
            isBlocked: payload.isBlocked,
            lastViolationReason: action,
            lastViolationTime: timeStr,
          })
        );
        if (payload.isBlocked) {
          localStorage.setItem(blockedKey, 'true');
        } else {
          localStorage.removeItem(blockedKey);
        }
      } catch (e) {}

      // Push to Firestore with error resilience
      if (db) {
        try {
          const docRef = doc(db, 'exam_activity_logs', docId);
          await setDoc(docRef, payload, { merge: true });
        } catch (err) {
          console.warn('[AntiCheat] Firestore update notice:', err);
        }
      }
    },
    [docId, examId, studentId, studentName, className, examType, isEnabled, storageKey, blockedKey]
  );

  // Real-time listener for active 6-digit Proctor PIN
  useEffect(() => {
    if (!db) return;
    try {
      const pinDocRef = doc(db, 'exam_settings', 'security_pin');
      const unsubscribe = onSnapshot(
        pinDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as ExamSecurityConfig;
            if (data?.activePin && data.activePin.trim().length === 6) {
              const cleaned = data.activePin.trim();
              setActivePin(cleaned);
              try {
                localStorage.setItem('smantri_proctor_security_pin', cleaned);
              } catch (e) {}
            }
          }
        },
        (err) => {
          console.warn('[AntiCheat] PIN listener notice:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {}
  }, []);

  // Real-time listener on student's session log for remote Proktor unlock / reset
  useEffect(() => {
    if (!db || !studentId || !isEnabled) return;

    try {
      const sessionDocRef = doc(db, 'exam_activity_logs', docId);
      const unsubscribe = onSnapshot(
        sessionDocRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data() as ExamActivityLogDoc;
            if (!data) return;

            // Check remote Proktor Susulan Incident
            if (data.currentStatus === 'SUSULAN_KENDALA_TEKNIS' || data.examStatus === 'SUSULAN_KENDALA_TEKNIS') {
              setIsSusulanRedirect(true);
              setSusulanReason(data.incidentReason || data.warningMessage || 'Kendala Teknis Server/Jaringan');
              stopAlarm();
              return;
            }

            // Check remote Proktor Force Submit
            if (data.forceSubmitted && !isSubmittedRef.current) {
              isSubmittedRef.current = true;
              stopAlarm();
              onForceSubmitRef.current?.();
              return;
            }

            // Remote Proktor unblock / reset
            if (data.isBlocked === false && (data.lockStage === 0 || data.violationCount === 0)) {
              if (isBlockedRef.current || lockStageRef.current > 0) {
                // Proctor unlocked this student remotely!
                isBlockedRef.current = false;
                lockStageRef.current = 0;
                violationCountRef.current = data.violationCount || 0;
                hasUsedPinUnlockRef.current = Boolean(data.hasUsedPinUnlock);

                setIsBlocked(false);
                setLockStage(0);
                setViolationCount(data.violationCount || 0);
                setHasUsedPinUnlock(Boolean(data.hasUsedPinUnlock));
                setCurrentStatus('ACTIVE');
                setAntiCheatColor('GREEN');
                setShowLockModal(false);
                setShowBlockModal(false);
                setShowWarningModal(false);
                stopAlarm();

                try {
                  localStorage.removeItem(blockedKey);
                  localStorage.setItem(
                    storageKey,
                    JSON.stringify({
                      violationCount: data.violationCount || 0,
                      lockStage: 0,
                      hasUsedPinUnlock: Boolean(data.hasUsedPinUnlock),
                      isBlocked: false,
                    })
                  );
                } catch (e) {}
              }
            } else if (data.lockStage === 0 && lockStageRef.current === 1) {
              // Proctor unlocked cycle 1 remotely
              lockStageRef.current = 0;
              setLockStage(0);
              setCurrentStatus('ACTIVE');
              setAntiCheatColor('YELLOW');
              setShowLockModal(false);
              stopAlarm();
            }
          }
        },
        (err) => {
          console.warn('[AntiCheat] Student session snapshot notice:', err);
        }
      );
      return () => unsubscribe();
    } catch (e) {}
  }, [docId, studentId, isEnabled, stopAlarm, blockedKey, storageKey]);

  // Core Violation Recorder & 2-Cycle / 6-Strike Escalation Engine
  const recordViolation = useCallback(
    (reason: string, detail: string = '') => {
      if (!isEnabled || isSubmittedRef.current || !studentId) return;

      // Don't escalate if already permanently blocked
      if (isBlockedRef.current) {
        setShowBlockModal(true);
        return;
      }

      const now = Date.now();
      const COOLDOWN_MS = 2000; // Strict 2000ms cooldown to prevent double-count from mobile blur + visibilitychange

      if (now - lastViolationTimestampRef.current < COOLDOWN_MS) {
        return; // Ignore duplicate event within 2 seconds
      }
      lastViolationTimestampRef.current = now;

      // Determine next violation count (capped at 6)
      const prevCount = violationCountRef.current;
      const nextCount = Math.min(6, prevCount + 1);
      violationCountRef.current = nextCount;
      setViolationCount(nextCount);

      const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // =========================================================================
      // CYCLE 1: Pelanggaran 1 s.d. 3
      // =========================================================================
      if (nextCount <= 2) {
        // A. Pelanggaran 1 & 2 (Peringatan Dini)
        playWarningBeep();
        setWarningData({
          strike: nextCount,
          cycle: 1,
          cycleStrike: nextCount,
          reason,
          timestamp: timeStr,
          detail: detail || 'Terdeteksi keluar dari layar ujian atau membuka layar terbelah.',
        });
        setShowWarningModal(true);
        setAntiCheatColor('YELLOW');
        setCurrentStatus('ACTIVE');

        syncToFirestore(
          'ACTIVE',
          'YELLOW',
          `Pelanggaran ${nextCount}/3 (${reason})`,
          detail || `Peringatan dini ${nextCount}/3. Toleransi tersisa: ${3 - nextCount}x.`,
          { violationCount: nextCount, lockStage: 0 }
        );
      } else if (nextCount === 3) {
        // B. Pelanggaran 3 (Siklus 1: Kunci Sementara + Alarm Sirine + Form PIN 6-Digit)
        lockStageRef.current = 1;
        setLockStage(1);
        setCurrentStatus('LOCKED_PIN');
        setAntiCheatColor('RED');
        setShowWarningModal(false);
        setShowLockModal(true);
        startAlarm(); // Auto-start siren

        syncToFirestore(
          'LOCKED_PIN',
          'RED',
          `Kunci Ujian (Siklus 1) - ${reason}`,
          detail || 'Tercapai 3 kali pelanggaran. Ujian dikunci dan alarm sirine berbunyi. Membutuhkan PIN Pengawas.',
          { violationCount: nextCount, lockStage: 1 }
        );
      } else if (nextCount <= 5) {
        // =========================================================================
        // CYCLE 2: Pelanggaran 4 s.d. 6 (Setelah PIN Pengawas)
        // =========================================================================
        // C. Pelanggaran 4 & 5 (Peringatan Menuju Blokir Permanen)
        playWarningBeep();
        const cycleStrike = nextCount - 3; // 1 or 2 in cycle 2
        setWarningData({
          strike: nextCount,
          cycle: 2,
          cycleStrike,
          reason,
          timestamp: timeStr,
          detail: detail || `Peringatan Kritis! Pelanggaran ke-${nextCount} (Siklus 2: ${cycleStrike}/3). 1 lagi menuju blokir permanen.`,
        });
        setShowWarningModal(true);
        setAntiCheatColor('YELLOW');
        setCurrentStatus('ACTIVE');

        syncToFirestore(
          'ACTIVE',
          'YELLOW',
          `Peringatan Kritis ${nextCount}/6 (${reason})`,
          detail || `Pelanggaran ke-${nextCount} (Siklus 2: ${cycleStrike}/3). Ambang pemblokiran permanen.`,
          { violationCount: nextCount, lockStage: 0 }
        );
      } else if (nextCount >= 6) {
        // D. Pelanggaran 6 (Siklus 2: 3 Kali Pelanggaran Lagi Setelah PIN -> Hard Lock / Auto-Block)
        lockStageRef.current = 2;
        isBlockedRef.current = true;
        setLockStage(2);
        setIsBlocked(true);
        setCurrentStatus('BLOCKED_PERMANENT');
        setAntiCheatColor('RED');
        setShowWarningModal(false);
        setShowLockModal(false);
        setShowBlockModal(true);
        stopAlarm();
        playBlockedTone();

        syncToFirestore(
          'BLOCKED_PERMANENT',
          'RED',
          `AKSES DIBLOKIR OTOMATIS - ${reason}`,
          'Siswa melanggar aturan keamanan ujian sebanyak 2x3 kali (6 pelanggaran). Akses ujian dan login diblokir.',
          { violationCount: 6, lockStage: 2, isBlocked: true }
        );
      }
    },
    [isEnabled, studentId, playWarningBeep, startAlarm, stopAlarm, playBlockedTone, syncToFirestore]
  );

  // Verify 6-digit Proctor PIN to unlock Cycle 1
  const verifyProctorPin = useCallback(
    (enteredPin: string): { success: boolean; message: string } => {
      const cleanInput = (enteredPin || '').trim();
      const currentActive = (activePin || DEFAULT_PIN).trim();

      if (cleanInput.length !== 6 || !/^\d{6}$/.test(cleanInput)) {
        return { success: false, message: 'Harap masukkan 6 digit angka PIN Pengawas yang valid.' };
      }

      // Check against active PIN (or fallback master PIN '123456')
      if (cleanInput === currentActive || cleanInput === '123456' || cleanInput === DEFAULT_PIN) {
        stopAlarm();
        lockStageRef.current = 0;
        hasUsedPinUnlockRef.current = true;

        setLockStage(0);
        setHasUsedPinUnlock(true);
        setCurrentStatus('ACTIVE');
        setAntiCheatColor('YELLOW'); // Yellow to indicate 1 cycle used
        setShowLockModal(false);

        const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        syncToFirestore(
          'ACTIVE',
          'YELLOW',
          'Buka Kunci PIN Pengawas',
          `Kunci ujian berhasil dibuka oleh Pengawas dengan PIN valid pada ${timeStr}. Siklus 1 selesai, masuk siklus 2.`,
          { lockStage: 0, hasUsedPinUnlock: true }
        );

        return {
          success: true,
          message: 'PIN Valid! Kunci ujian dibuka. Anda sekarang berada di Siklus 2 (3 toleransi lagi sebelum blokir permanen).',
        };
      }

      return {
        success: false,
        message: 'PIN Pengawas salah atau tidak cocok! Mintalah 6-digit PIN aktif yang benar dari Pengawas Ruang Anda.',
      };
    },
    [activePin, stopAlarm, syncToFirestore]
  );

  // Manual Reset / Unblock (used by Admin/Operator/Proktor)
  const resetViolations = useCallback(async () => {
    stopAlarm();
    violationCountRef.current = 0;
    lockStageRef.current = 0;
    hasUsedPinUnlockRef.current = false;
    isBlockedRef.current = false;

    setViolationCount(0);
    setLockStage(0);
    setHasUsedPinUnlock(false);
    setIsBlocked(false);
    setCurrentStatus('ACTIVE');
    setAntiCheatColor('GREEN');
    setShowWarningModal(false);
    setShowLockModal(false);
    setShowBlockModal(false);

    try {
      localStorage.removeItem(blockedKey);
      localStorage.removeItem(storageKey);
    } catch (e) {}

    await syncToFirestore(
      'ACTIVE',
      'GREEN',
      'Reset Total oleh Pengawas',
      'Akses ujian dan pelanggaran di-reset kembali menjadi 0 oleh Pengawas/Admin.',
      { violationCount: 0, lockStage: 0, hasUsedPinUnlock: false, isBlocked: false }
    );
  }, [stopAlarm, blockedKey, storageKey, syncToFirestore]);

  // Request fullscreen mode helper
  const requestExamFullscreen = useCallback(async () => {
    try {
      initAudio();
      const docEl = document.documentElement as any;
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
      } else if (docEl.mozRequestFullScreen) {
        await docEl.mozRequestFullScreen();
      }
    } catch (e) {}
  }, [initAudio]);

  // Mark submission complete
  const markSubmitted = useCallback(async () => {
    isSubmittedRef.current = true;
    stopAlarm();
    setCurrentStatus('SUBMITTED');
    await syncToFirestore(
      'SUBMITTED',
      antiCheatColor,
      'Ujian Dikumpulkan',
      'Siswa telah menyelesaikan pengerjaan dan mengumpulkan lembar jawaban.'
    );
  }, [antiCheatColor, stopAlarm, syncToFirestore]);

  // Dismiss early warning modal (Strikes 1, 2, 4, 5)
  const dismissWarningModal = useCallback(() => {
    setShowWarningModal(false);
  }, []);

  // ===========================================================================
  // CLIENT-SIDE MOBILE HP DETECTORS
  // ===========================================================================

  // 1. Initial screen dimensions record
  useEffect(() => {
    if (typeof window !== 'undefined') {
      initialWidthRef.current = window.innerWidth;
      initialHeightRef.current = window.innerHeight;
    }
  }, []);

  // 2. Hardware / Gesture Back Button Guard (pushState & popstate)
  useEffect(() => {
    if (!isEnabled || isSubmittedRef.current || !studentId) return;

    // Push initial guard state
    window.history.pushState({ smantriAntiCheat: true }, '', window.location.href);

    const handlePopState = (e: PopStateEvent) => {
      // Prevent leaving by immediately re-pushing state
      window.history.pushState({ smantriAntiCheat: true }, '', window.location.href);
      recordViolation(
        'Tombol Kembali / Gesture Back HP Ditekan',
        'Mencoba meninggalkan halaman ujian menggunakan tombol kembali atau gesture swipe.'
      );
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isEnabled, studentId, recordViolation]);

  // 3. Visibility Change (Home, Recent Apps, Switch Tab, Screen Off) & Window Blur
  useEffect(() => {
    if (!isEnabled || isSubmittedRef.current || !studentId) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        recordViolation(
          'Keluar Aplikasi / Home / Recent Apps',
          'Layar ujian tidak terlihat (aplikasi beralih ke latar belakang atau layar terkunci).'
        );
      }
    };

    const handleWindowBlur = () => {
      // Don't trigger if already hidden (covered by visibilitychange)
      if (!document.hidden) {
        recordViolation(
          'Window Blur / Notifikasi / Floating App',
          'Fokus halaman ujian hilang (kemungkinan membuka notifikasi, floating window, atau tab lain).'
        );
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [isEnabled, studentId, recordViolation]);

  // 4. Split-Screen / Layar Terbelah & Floating Window Monitor (with Virtual Keyboard Guard)
  useEffect(() => {
    if (!isEnabled || isSubmittedRef.current || !studentId) return;

    const checkSplitScreen = () => {
      if (typeof window === 'undefined') return;

      // PENTING: Pencegahan False-Positive Virtual Keyboard pada HP!
      const activeEl = document.activeElement;
      const isTyping = activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );

      if (isTyping) {
        return; // Height shrink is caused by virtual keyboard, do NOT trigger split screen violation!
      }

      const screenH = initialHeightRef.current || window.screen.height || window.innerHeight;
      const currentH = window.innerHeight;
      const ratio = currentH / screenH;

      // When Split-Screen is engaged on Android/iOS, viewport height shrinks significantly (< 75%)
      if (ratio < 0.75) {
        recordViolation(
          'Split-Screen / Layar Terbelah Terdeteksi',
          `Tinggi layar menyusut ke ${Math.round(ratio * 100)}% dari ukuran penuh (indikasi mode Split-Screen / Layar Ganda).`
        );
      }
    };

    window.addEventListener('resize', checkSplitScreen);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkSplitScreen);
    }

    return () => {
      window.removeEventListener('resize', checkSplitScreen);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', checkSplitScreen);
      }
    };
  }, [isEnabled, studentId, recordViolation]);

  // 5. Fullscreen Kiosk Mode & Escape Key Guard for Chromebook & Laptop
  useEffect(() => {
    if (!isEnabled || isSubmittedRef.current || !studentId) return;

    const handleFullscreenChange = () => {
      const isFs = typeof document !== 'undefined' && Boolean(document.fullscreenElement);
      setIsFullscreen(isFs);
      if (!isFs && !isSubmittedRef.current) {
        recordViolation(
          'Keluar dari Mode Layar Penuh (Kiosk Mode / Esc)',
          'Siswa keluar dari tampilan layar penuh atau menekan tombol Esc/F11. Lembar soal terkunci otomatis.'
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'F11') {
        recordViolation(
          'Tombol Esc / F11 Ditekan',
          'Mencoba membatalkan mode layar penuh menggunakan tombol keyboard.'
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEnabled, studentId, recordViolation]);

  // Clean up audio on unmount
  useEffect(() => {
    return () => {
      stopAlarm();
    };
  }, [stopAlarm]);

  return {
    violationCount,
    lockStage,
    hasUsedPinUnlock,
    isBlocked,
    currentStatus,
    antiCheatColor,
    isAlarmPlaying,
    showWarningModal,
    warningData,
    showLockModal,
    showBlockModal,
    activePin,
    recentLogs,
    initAudio,
    startAlarm,
    stopAlarm,
    recordViolation,
    verifyProctorPin,
    resetViolations,
    dismissWarningModal,
    requestExamFullscreen,
    markSubmitted,
    isSusulanRedirect,
    susulanReason,
    isFullscreen,
  };
}
