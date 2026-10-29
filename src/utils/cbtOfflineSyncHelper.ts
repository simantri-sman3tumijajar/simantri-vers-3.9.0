import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { ExamActivityLogDoc, BeritaAcaraItem, StudentExamStatus } from '../types';

export interface CbtBackupData {
  examId: string;
  studentId: string;
  studentName?: string;
  examTitle?: string;
  examType?: string;
  studentAnswers: Record<number, string>;
  raguQuestions: Record<number, boolean>;
  currentQuestionIdx: number;
  remainingTimeSeconds: number;
  lastSavedTimestamp: number;
  syncStatus: 'synced' | 'pending' | 'offline';
  isSusulan?: boolean;
  susulanReason?: string;
  multiAnswers?: Record<number, string[]>;
  essayAnswers?: Record<number, string>;
  targetEndTimestamp?: number;
  lastSavedAnswersCount?: number;
}

export const CBT_BACKUP_PREFIX = 'simantri_cbt_backup_';
export const CBT_CACHE_QUESTIONS_PREFIX = 'simantri_cbt_cache_questions_';

/**
 * 1. Simpan Seketika (0 ms delay) ke LocalStorage pada setiap klik opsi jawaban siswa
 */
export function saveCbtLocalBackup(
  examId: string,
  studentId: string,
  partialData: Partial<CbtBackupData>
): CbtBackupData {
  if (typeof window === 'undefined') return partialData as CbtBackupData;
  const storageKey = `${CBT_BACKUP_PREFIX}${examId || 'cbt'}_${studentId || 'anon'}`;

  let existing: Partial<CbtBackupData> = {};
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) existing = JSON.parse(raw);
  } catch (e) {
    console.warn('[CbtOffline] Gagal membaca backup lama:', e);
  }

  const updated: CbtBackupData = {
    examId: examId || existing.examId || 'cbt',
    studentId: studentId || existing.studentId || 'anon',
    studentName: partialData.studentName ?? existing.studentName ?? '',
    examTitle: partialData.examTitle ?? existing.examTitle ?? 'Ujian CBT',
    examType: partialData.examType ?? existing.examType ?? 'CBT',
    studentAnswers: {
      ...(existing.studentAnswers || {}),
      ...(partialData.studentAnswers || {}),
    },
    raguQuestions: {
      ...(existing.raguQuestions || {}),
      ...(partialData.raguQuestions || {}),
    },
    currentQuestionIdx: partialData.currentQuestionIdx ?? existing.currentQuestionIdx ?? 0,
    remainingTimeSeconds: partialData.remainingTimeSeconds ?? existing.remainingTimeSeconds ?? 3600,
    lastSavedTimestamp: Date.now(),
    syncStatus: partialData.syncStatus ?? 'pending',
    isSusulan: partialData.isSusulan ?? existing.isSusulan ?? false,
    susulanReason: partialData.susulanReason ?? existing.susulanReason ?? '',
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (e) {
    console.warn('[CbtOffline] LocalStorage write error:', e);
  }

  return updated;
}

/**
 * Muat backup pengerjaan siswa dari penyimpanan lokal (Device-First)
 */
export function loadCbtLocalBackup(examId: string, studentId: string): CbtBackupData | null {
  if (typeof window === 'undefined') return null;
  const storageKey = `${CBT_BACKUP_PREFIX}${examId || 'cbt'}_${studentId || 'anon'}`;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('[CbtOffline] Gagal memuat backup:', e);
  }
  return null;
}

/**
 * Hapus backup lokal setelah lembar jawaban resmi dikumpulkan dan terverifikasi
 */
export function clearCbtLocalBackup(examId: string, studentId: string): void {
  if (typeof window === 'undefined') return;
  const storageKey = `${CBT_BACKUP_PREFIX}${examId || 'cbt'}_${studentId || 'anon'}`;
  try {
    localStorage.removeItem(storageKey);
  } catch {}
}

/**
 * 2. Pre-Fetch & Cache Paket Soal Lengkap ke Perangkat Siswa
 */
export function cacheExamQuestions(examId: string, questions: any[]): void {
  if (typeof window === 'undefined' || !questions || questions.length === 0) return;
  const key = `${CBT_CACHE_QUESTIONS_PREFIX}${examId || 'cbt'}`;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        cachedAt: Date.now(),
        count: questions.length,
        questions,
      })
    );
  } catch (e) {
    console.warn('[CbtOffline] Gagal cache soal:', e);
  }
}

export function getCachedExamQuestions(examId: string): any[] | null {
  if (typeof window === 'undefined') return null;
  const key = `${CBT_CACHE_QUESTIONS_PREFIX}${examId || 'cbt'}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return parsed.questions;
      }
    }
  } catch (e) {
    console.warn('[CbtOffline] Gagal membaca cache soal:', e);
  }
  return null;
}

/**
 * 3. Log Otomatis ke Dokumen Berita Acara Pelaksanaan (BAP)
 */
export async function autoLogToBeritaAcara(params: {
  assessmentType?: 'ASTS' | 'ASAS';
  mataPelajaran: string;
  kelasRuang: string;
  petugasName: string;
  affectedStudents: Array<{
    nama: string;
    nisn?: string;
    nomorPeserta?: string;
    kelas?: string;
    sisaWaktuMenit?: number;
    jawabanMasuk?: number;
  }>;
  actionType: 'SUSULAN_KENDALA_TEKNIS' | 'KOMPENSASI_WAKTU';
  keterangan: string;
}): Promise<void> {
  if (!db) return;

  try {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const incidentEntries = params.affectedStudents.map((st) => ({
      nama: st.nama,
      nisn: st.nisn || '-',
      nomorPeserta: st.nomorPeserta || '-',
      kelas: st.kelas || params.kelasRuang,
      sisaWaktuMenit: st.sisaWaktuMenit || 0,
      jawabanMasuk: st.jawabanMasuk || 0,
      waktuKejadian: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB',
      keterangan: params.keterangan,
      petugas: params.petugasName,
      status: params.actionType,
    }));

    // Cek apakah sudah ada dokumen Berita Acara untuk sesi/mapel/kelas hari ini
    const bapRef = doc(db, 'system_state', 'master');
    const bapSnap = await getDoc(bapRef);

    if (bapSnap.exists()) {
      const data = bapSnap.data();
      const existingBapList: BeritaAcaraItem[] = data.beritaAcaraList || [];

      // Cari BAP yang cocok berdasarkan mapel & kelas/ruang
      const targetIdx = existingBapList.findIndex(
        (b) =>
          b.mataPelajaran.toLowerCase().trim() === params.mataPelajaran.toLowerCase().trim() ||
          b.kelasRuang.toLowerCase().trim() === params.kelasRuang.toLowerCase().trim()
      );

      const incidentNote = `[KENDALA TEKNIS ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB]: ${
        params.affectedStudents.length
      } peserta (${params.affectedStudents.map((s) => s.nama).join(', ')}) terdampak kendala teknis dan ${
        params.actionType === 'SUSULAN_KENDALA_TEKNIS' ? 'dialihkan ke Sesi Susulan' : 'diberikan kompensasi waktu'
      } oleh ${params.petugasName}. Sisa waktu & jawaban terakhir dibekukan.`;

      if (targetIdx >= 0) {
        const targetBap = existingBapList[targetIdx];
        const existingIncidents = targetBap.kendalaTeknisSiswa || [];
        const updatedCatatan = targetBap.catatanKejadianKhusus
          ? `${targetBap.catatanKejadianKhusus}\n\n${incidentNote}`
          : incidentNote;

        existingBapList[targetIdx] = {
          ...targetBap,
          kendalaTeknisSiswa: [...existingIncidents, ...incidentEntries],
          catatanKejadianKhusus: updatedCatatan,
        };
      } else {
        // Buat entri Berita Acara otomatis baru
        const newBap: BeritaAcaraItem = {
          id: `bap-auto-${Date.now()}`,
          assessmentType: params.assessmentType || 'ASAS',
          namaSekolah: 'SMA NEGERI 3 TUMIJAJAR',
          mataPelajaran: params.mataPelajaran || 'Ujian CBT',
          kelasRuang: params.kelasRuang || 'Ruang CBT',
          hariTanggal: todayStr,
          waktuPelaksanaan: 'Sesi Ujian Aktif',
          pengawas1: params.petugasName,
          jumlahPesertaSeharusnya: params.affectedStudents.length,
          jumlahPesertaHadir: params.affectedStudents.length,
          jumlahPesertaTidakHadir: 0,
          catatanKejadianKhusus: incidentNote,
          kendalaTeknisSiswa: incidentEntries,
          uploadedAt: new Date().toISOString(),
          verifiedStatus: 'Verified',
        };
        existingBapList.push(newBap);
      }

      await updateDoc(bapRef, {
        beritaAcaraList: existingBapList,
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('[CbtOffline] Gagal auto log ke Berita Acara:', err);
  }
}

/**
 * 4. Eksekusi "Alihkan ke Susulan (Kendala Teknis)" (Massal & Individu)
 */
export async function markStudentsAsSusulan(params: {
  studentLogs: ExamActivityLogDoc[];
  reason: string;
  petugasName: string;
  petugasRole: 'admin' | 'operator' | 'proktor';
  sessionOrRoom?: string;
  examType?: string;
  subjectName?: string;
}): Promise<{ successCount: number; studentNames: string[] }> {
  if (!db || params.studentLogs.length === 0) return { successCount: 0, studentNames: [] };

  const successNames: string[] = [];
  const affectedList: Array<{
    nama: string;
    nisn?: string;
    nomorPeserta?: string;
    kelas?: string;
    sisaWaktuMenit?: number;
    jawabanMasuk?: number;
  }> = [];

  for (const logItem of params.studentLogs) {
    try {
      const docRef = doc(db, 'exam_activity_logs', logItem.id);
      const remainingSec = logItem.remainingTimeSeconds || 1800;
      const sisaMenit = Math.round(remainingSec / 60);

      await updateDoc(docRef, {
        currentStatus: 'SUSULAN_KENDALA_TEKNIS' as StudentExamStatus,
        examStatus: 'SUSULAN_KENDALA_TEKNIS',
        isLocked: true,
        incidentReason: params.reason || 'Kendala Teknis Server/Jaringan',
        incidentReportedAt: new Date().toISOString(),
        incidentReportedBy: `${params.petugasName} (${params.petugasRole.toUpperCase()})`,
        warningMessage: `SESI DIALIHKAN KE SUSULAN: ${params.reason}. Sisa waktu Anda (${sisaMenit} menit) & lembar jawaban telah dibekukan dan dicatat resmi dalam Berita Acara.`,
        updatedAt: new Date().toISOString(),
      });

      // Simpan flag susulan ke LocalStorage jika diakses pada perangkat yang sama
      saveCbtLocalBackup(logItem.examId, logItem.studentId, {
        isSusulan: true,
        susulanReason: params.reason,
        remainingTimeSeconds: remainingSec,
      });

      successNames.push(logItem.studentName);
      affectedList.push({
        nama: logItem.studentName,
        nisn: (logItem as any).nisn || '-',
        nomorPeserta: (logItem as any).nomorPeserta || '-',
        kelas: logItem.className,
        sisaWaktuMenit: sisaMenit,
        jawabanMasuk: logItem.lastSavedAnswersCount || 0,
      });
    } catch (err) {
      console.warn(`[CbtOffline] Gagal update status susulan untuk ${logItem.studentName}:`, err);
    }
  }

  // Integrasi otomatis ke Berita Acara Pelaksanaan (BAP)
  if (affectedList.length > 0) {
    await autoLogToBeritaAcara({
      assessmentType: (params.examType?.includes('ASTS') ? 'ASTS' : 'ASAS') as any,
      mataPelajaran: params.subjectName || params.examType || 'Ujian CBT',
      kelasRuang: params.sessionOrRoom || params.studentLogs[0]?.className || 'Ruang CBT',
      petugasName: params.petugasName,
      affectedStudents: affectedList,
      actionType: 'SUSULAN_KENDALA_TEKNIS',
      keterangan: `Kendala Teknis - Diarahkan ke Sesi Susulan (${params.reason})`,
    });
  }

  return {
    successCount: successNames.length,
    studentNames: successNames,
  };
}

/**
 * 5. Eksekusi "Bekukan & Kompensasi Waktu" (+10, +15, atau Custom Menit)
 */
export async function extendExamTimeForStudents(params: {
  studentLogs: ExamActivityLogDoc[];
  extensionMinutes: number;
  reason?: string;
  petugasName: string;
  subjectName?: string;
  sessionOrRoom?: string;
}): Promise<{ successCount: number; studentNames: string[] }> {
  if (!db || params.studentLogs.length === 0) return { successCount: 0, studentNames: [] };

  const successNames: string[] = [];
  const addedSeconds = params.extensionMinutes * 60;
  const affectedList: Array<{
    nama: string;
    kelas?: string;
  }> = [];

  for (const logItem of params.studentLogs) {
    try {
      const docRef = doc(db, 'exam_activity_logs', logItem.id);
      const curRemaining = logItem.remainingTimeSeconds || 1800;
      const newRemaining = curRemaining + addedSeconds;
      const curTotalExtended = (logItem.extendedMinutesTotal || 0) + params.extensionMinutes;

      await updateDoc(docRef, {
        remainingTimeSeconds: newRemaining,
        extendedMinutesTotal: curTotalExtended,
        warningMessage: `Kompensasi Waktu: Waktu ujian Anda telah ditambahkan +${params.extensionMinutes} menit oleh Pengawas (${params.petugasName}).`,
        updatedAt: new Date().toISOString(),
      });

      // Update LocalStorage jika berada pada browser aktif siswa
      saveCbtLocalBackup(logItem.examId, logItem.studentId, {
        remainingTimeSeconds: newRemaining,
      });

      successNames.push(logItem.studentName);
      affectedList.push({
        nama: logItem.studentName,
        kelas: logItem.className,
      });
    } catch (err) {
      console.warn(`[CbtOffline] Gagal tambah waktu untuk ${logItem.studentName}:`, err);
    }
  }

  // Tulis catatan ke Berita Acara
  if (affectedList.length > 0) {
    await autoLogToBeritaAcara({
      mataPelajaran: params.subjectName || 'Ujian CBT',
      kelasRuang: params.sessionOrRoom || params.studentLogs[0]?.className || 'Ruang CBT',
      petugasName: params.petugasName,
      affectedStudents: affectedList.map((a) => ({
        nama: a.nama,
        kelas: a.kelas,
        sisaWaktuMenit: params.extensionMinutes,
      })),
      actionType: 'KOMPENSASI_WAKTU',
      keterangan: `Penambahan waktu kompensasi kendala jaringan/server +${params.extensionMinutes} menit`,
    });
  }

  return {
    successCount: successNames.length,
    studentNames: successNames,
  };
}
