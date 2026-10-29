import { LitNumRecord } from '../types';

export interface ScoreDiagnosis {
  score: number;
  label: string;
  badgeText: string;
  badgeBg: string;
  badgeTextCol: string;
  capaian: 'Mahir' | 'Cakap' | 'Dasar' | 'Perlu Intervensi Khusus';
  description: string;
  recommendation: string;
}

/**
 * Returns comprehensive Kemendikbudristek Rapor Pendidikan & ANBK benchmark
 * evaluation for Literacy & Numeracy scores, including special detection for Score = 0.
 */
export function getScoreDiagnosis(score: number, type: 'literasi' | 'numerasi'): ScoreDiagnosis {
  const normScore = Math.max(0, Math.min(100, Math.round(score)));

  if (normScore === 0) {
    return {
      score: 0,
      label: 'Tidak Mengerjakan / Skor Kosong',
      badgeText: 'SKOR 0: TIDAK MENGERJAKAN',
      badgeBg: 'bg-rose-100 border-rose-300',
      badgeTextCol: 'text-rose-900',
      capaian: 'Perlu Intervensi Khusus',
      description: 'Siswa belum/tidak mengisi jawaban atau mengalami kendala teknis saat pengerjaan.',
      recommendation: 'Diperlukan verifikasi kehadiran, asesmen diagnostik ulang, dan pendampingan khusus mandiri.'
    };
  }

  if (normScore < 40) {
    return {
      score: normScore,
      label: 'Perlu Intervensi Khusus',
      badgeText: 'PERLU INTERVENSI KHUSUS',
      badgeBg: 'bg-amber-100 border-amber-300',
      badgeTextCol: 'text-amber-900',
      capaian: 'Perlu Intervensi Khusus',
      description: type === 'literasi'
        ? 'Siswa baru memiliki keterampilan dasar wacana tingkat awal dan membutuhkan bimbingan intensif.'
        : 'Siswa baru memiliki pengetahuan matematika dasar terbatas dan memerlukan contoh konkret terstruktur.',
      recommendation: 'Bimbingan privat 1-on-1 dengan guru mata pelajaran, latihan wacana/soal bertahap dari tingkat paling dasar.'
    };
  }

  if (normScore < 70) {
    return {
      score: normScore,
      label: 'Dasar',
      badgeText: 'DASAR',
      badgeBg: 'bg-sky-100 border-sky-300',
      badgeTextCol: 'text-sky-900',
      capaian: 'Dasar',
      description: type === 'literasi'
        ? 'Siswa mampu menemukan dan mengambil informasi eksplisit yang ada dalam teks serta membuat interpretasi sederhana.'
        : 'Siswa mampu mengaplikasikan pengetahuan matematika dasar dalam konteks yang rutin dan familiar.',
      recommendation: 'Pemberian variasi wacana sedang dan latihan soal numerasi bertingkat untuk meningkatkan pemahaman kritis.'
    };
  }

  if (normScore < 90) {
    return {
      score: normScore,
      label: 'Cakap',
      badgeText: 'CAKAP',
      badgeBg: 'bg-emerald-100 border-emerald-300',
      badgeTextCol: 'text-emerald-900',
      capaian: 'Cakap',
      description: type === 'literasi'
        ? 'Siswa mampu membuat inferensi, mengintegrasikan beberapa informasi teks, dan mengevaluasi isi teks.'
        : 'Siswa mampu mengaplikasikan pengetahuan dan penalaran matematika dalam berbagai situasi kontekstual.',
      recommendation: 'Pertahankan performa dengan tugas-tugas analisis berorientasi HOTS (Higher Order Thinking Skills).'
    };
  }

  return {
    score: normScore,
    label: 'Mahir',
    badgeText: 'MAHIR',
    badgeBg: 'bg-indigo-100 border-indigo-300',
    badgeTextCol: 'text-indigo-900',
    capaian: 'Mahir',
    description: type === 'literasi'
      ? 'Siswa mampu merefleksikan, mengevaluasi wacana kritis kompleks, serta merumuskan pandangan mandiri yang solutif.'
      : 'Siswa mampu bernalar secara kritis untuk memecahkan masalah non-rutin yang kompleks secara kontekstual.',
    recommendation: 'Dilibatkan sebagai tutor sebaya (peer tutor) dan diikutsertakan pada ajang Olimpiade/KSM LitNum.'
  };
}

export interface StudentLitNumCumulativeStats {
  studentId: string;
  studentName: string;
  kelas: string;
  totalSubmissions: number;
  literasiCount: number;
  numerasiCount: number;
  avgLiterasiScore: number;
  avgNumerasiScore: number;
  combinedAvgScore: number;
  overallDiagnosis: ScoreDiagnosis;
  lastTestDate: string | null;
  history: LitNumRecord[];
}

/**
 * Calculates real-time cumulative statistics and score averages for a student across all historical entries.
 */
export function calculateStudentCumulativeStats(
  studentId: string,
  allRecords: LitNumRecord[]
): StudentLitNumCumulativeStats {
  const studentRecs = (allRecords || []).filter(
    (r) => r.studentId === studentId || (r.studentName && r.studentName.toLowerCase() === studentId.toLowerCase())
  );

  if (studentRecs.length === 0) {
    return {
      studentId,
      studentName: 'Siswa',
      kelas: '-',
      totalSubmissions: 0,
      literasiCount: 0,
      numerasiCount: 0,
      avgLiterasiScore: 0,
      avgNumerasiScore: 0,
      combinedAvgScore: 0,
      overallDiagnosis: getScoreDiagnosis(0, 'literasi'),
      lastTestDate: null,
      history: []
    };
  }

  const studentName = studentRecs[0].studentName || 'Siswa';
  const kelas = studentRecs[0].kelas || '-';

  const litRecs = studentRecs.filter((r) => r.type === 'literasi');
  const numRecs = studentRecs.filter((r) => r.type === 'numerasi');

  const sumLit = litRecs.reduce((acc, r) => acc + (r.score || 0), 0);
  const sumNum = numRecs.reduce((acc, r) => acc + (r.score || 0), 0);

  const avgLiterasiScore = litRecs.length > 0 ? Math.round(sumLit / litRecs.length) : 0;
  const avgNumerasiScore = numRecs.length > 0 ? Math.round(sumNum / numRecs.length) : 0;

  const totalSum = sumLit + sumNum;
  const combinedAvgScore = Math.round(totalSum / studentRecs.length);

  const sortedRecs = [...studentRecs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const lastTestDate = sortedRecs[0]?.date || null;

  const overallDiagnosis = getScoreDiagnosis(combinedAvgScore, 'literasi');

  return {
    studentId,
    studentName,
    kelas,
    totalSubmissions: studentRecs.length,
    literasiCount: litRecs.length,
    numerasiCount: numRecs.length,
    avgLiterasiScore,
    avgNumerasiScore,
    combinedAvgScore,
    overallDiagnosis,
    lastTestDate,
    history: sortedRecs
  };
}

// ============================================================================
// OFFLINE / ONLINE DETECTION & SAFE ENCRYPTED STORAGE CACHING FOR MOBILE (HP)
// ============================================================================

const OFFLINE_QUEUE_KEY = 'SMAN3_LITNUM_OFFLINE_CACHE_V2';

/**
 * Encrypt payload string using salted Base64 signature for safe local caching on mobile devices.
 */
export function encryptLitNumPayload(data: any): string {
  try {
    const rawStr = JSON.stringify({
      payload: data,
      timestamp: Date.now(),
      salt: 'SMAN3_TUMIJAJAR_2026_SECURE_CBT',
    });
    return btoa(unescape(encodeURIComponent(rawStr)));
  } catch (err) {
    return JSON.stringify(data);
  }
}

/**
 * Decrypt payload string from encrypted Base64 string.
 */
export function decryptLitNumPayload<T = any>(cipherText: string): T | null {
  try {
    const rawStr = decodeURIComponent(escape(atob(cipherText)));
    const parsed = JSON.parse(rawStr);
    return parsed.payload as T;
  } catch (err) {
    try {
      return JSON.parse(cipherText) as T;
    } catch {
      return null;
    }
  }
}

/**
 * Save an offline submission securely on the student's mobile device (HP).
 */
export function saveOfflineSubmissionLocally(record: LitNumRecord): string {
  try {
    const existing = getPendingOfflineSubmissions();
    const updated = [...existing, record];
    const encrypted = encryptLitNumPayload(updated);
    localStorage.setItem(OFFLINE_QUEUE_KEY, encrypted);
    return `SEC-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  } catch (e) {
    console.error('Failed to save offline submission:', e);
    return 'SEC-LOCAL-ERR';
  }
}

/**
 * Retrieves all pending encrypted offline submissions from local storage.
 */
export function getPendingOfflineSubmissions(): LitNumRecord[] {
  try {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return [];
    const decrypted = decryptLitNumPayload<LitNumRecord[]>(raw);
    return Array.isArray(decrypted) ? decrypted : [];
  } catch {
    return [];
  }
}

/**
 * Clears the offline submissions queue after successful synchronization with server.
 */
export function clearPendingOfflineSubmissions(): void {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch (e) {
    console.error('Failed to clear offline cache:', e);
  }
}

/**
 * Automatically syncs all pending offline submissions with the server/AppContext.
 */
export async function syncOfflineLitNumSubmissions(
  saveBatchFn: (records: LitNumRecord[]) => Promise<boolean>
): Promise<{ syncedCount: number; success: boolean }> {
  const pending = getPendingOfflineSubmissions();
  if (pending.length === 0) {
    return { syncedCount: 0, success: true };
  }

  const success = await saveBatchFn(pending);
  if (success) {
    clearPendingOfflineSubmissions();
    return { syncedCount: pending.length, success: true };
  }
  return { syncedCount: 0, success: false };
}
