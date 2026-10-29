import * as XLSX from 'xlsx';
import { LitNumRecord, Student, ClassItem } from '../types';

export type DeduplicationStrategy = 'highest_score' | 'latest_entry' | 'first_entry' | 'average';

export interface LitNumCapaianInfo {
  label: string;
  levelCode: 'L5_MAHIR' | 'L4_CAKAP' | 'L3_DASAR' | 'L2_INTERVENSI_AWAL' | 'L1_INTERVENSI_KHUSUS' | 'L0_SKOR_NOL';
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  barColor: string;
  indication: string;
  rekomendasiTindakan: string;
  description: string;
  isZeroScore: boolean;
  scoreRange: string;
}

/**
 * Enhanced Diagnostic Kemendikbudristek Rapor Pendidikan & ANBK Competency Category for LitNum
 * Detects score 0 (Abstain/Tidak Mengerjakan vs Jawaban Kosong) and 6-tier competency spectrum
 */
export function getLitNumCapaian(score: number, domain: 'literasi' | 'numerasi' = 'literasi'): LitNumCapaianInfo {
  const rounded = Math.round(isNaN(score) ? 0 : score);

  // DETEKSI OTOMATIS SKOR 0 (TIDAK MENGERJAKAN / ABSTAIN / JAWABAN KOSONG)
  if (rounded === 0) {
    return {
      label: 'Skor 0 (Kosong / Abstain)',
      levelCode: 'L0_SKOR_NOL',
      badgeBg: 'bg-slate-900',
      badgeText: 'text-amber-300',
      borderColor: 'border-slate-700',
      barColor: 'bg-slate-700',
      indication: 'Indikasi: Siswa Tidak Mengerjakan / Lembar Jawaban Kosong (Abstain) atau Belum Mengirimkan Form',
      rekomendasiTindakan: 'Verifikasi keikutsertaan siswa bersama Wali Kelas & BK, lalu berikan jadwal tes susulan terarah.',
      description: 'Peserta didik belum mengumpulkan jawaban atau seluruh soal dikosongkan.',
      isZeroScore: true,
      scoreRange: '0'
    };
  }

  // TIER 1: PERLU INTERVENSI KHUSUS (SKOR 1 - 39)
  if (rounded < 40) {
    return {
      label: 'Perlu Intervensi Khusus (1-39)',
      levelCode: 'L1_INTERVENSI_KHUSUS',
      badgeBg: 'bg-rose-100',
      badgeText: 'text-rose-950',
      borderColor: 'border-rose-300',
      barColor: 'bg-rose-600',
      indication: domain === 'literasi'
        ? 'Indikasi: Kesulitan Memahami Kosa Kata & Informasi Tersurat Sederhana dalam Teks'
        : 'Indikasi: Kesulitan Mengenali Simbol Kuantitatif & Operasi Perhitungan Dasar',
      rekomendasiTindakan: 'Pendampingan individual intensif (1-on-1) & matrikulasi konsep dasar.',
      description: 'Peserta didik belum mencapai kompetensi dasar minimum.',
      isZeroScore: false,
      scoreRange: '1 - 39'
    };
  }

  // TIER 2: INTERVENSI AWAL (SKOR 40 - 53)
  if (rounded < 54) {
    return {
      label: 'Intervensi Awal (40-53)',
      levelCode: 'L2_INTERVENSI_AWAL',
      badgeBg: 'bg-orange-100',
      badgeText: 'text-orange-950',
      borderColor: 'border-orange-300',
      barColor: 'bg-orange-500',
      indication: domain === 'literasi'
        ? 'Indikasi: Memahami Informasi Tersurat Sederhana, Namun Belum Mampu Menyimpulkan Ide Pokok Paragraf'
        : 'Indikasi: Menguasai Hitungan Dasar, Namun Belum Mampu Menerapkan Rumus ke Soal Cerita',
      rekomendasiTindakan: 'Latihan terbimbing (scaffolding) dengan panduan langkah demi langkah.',
      description: 'Tahap perintisan kompetensi dasar, membutuhkan bimbingan berkala.',
      isZeroScore: false,
      scoreRange: '40 - 53'
    };
  }

  // TIER 3: DASAR / KOMPETENSI MINIMUM (SKOR 54 - 70)
  if (rounded < 71) {
    return {
      label: 'Dasar (54-70)',
      levelCode: 'L3_DASAR',
      badgeBg: 'bg-amber-100',
      badgeText: 'text-amber-950',
      borderColor: 'border-amber-300',
      barColor: 'bg-amber-500',
      indication: domain === 'literasi'
        ? 'Indikasi: Memahami Wacana Utama & Ide Pokok, Namun Perlu Penguatan Analisis Ide Tersirat'
        : 'Indikasi: Memahami Operasi Hitung & Rumus Standar, Namun Perlu Penguatan Analisis Grafik/Tabel',
      rekomendasiTindakan: 'Pengayaan variasi soal sedang, latihan mandiri, & diskusi kelompok.',
      description: 'Capaian kompetensi dasar minimum tercapai.',
      isZeroScore: false,
      scoreRange: '54 - 70'
    };
  }

  // TIER 4: CAKAP / MEMENUHI STANDAR ANBK (SKOR 71 - 85)
  if (rounded < 86) {
    return {
      label: 'Cakap (71-85)',
      levelCode: 'L4_CAKAP',
      badgeBg: 'bg-emerald-100',
      badgeText: 'text-emerald-950',
      borderColor: 'border-emerald-300',
      barColor: 'bg-emerald-600',
      indication: domain === 'literasi'
        ? 'Indikasi: Mampu Memahami Ide Tersirat, Menganalisis Argumen Penulis, & Membandingkan Teks'
        : 'Indikasi: Mampu Mengolah Data Tabel/Grafik, Menerapkan Penalaran Matematika, & Memecahkan Soal Multilangkah',
      rekomendasiTindakan: 'Pemberian soal HOTS tingkat menengah, proyek literasi/sains, & problem solving.',
      description: 'Memenuhi standar kompetensi kelulusan nasional.',
      isZeroScore: false,
      scoreRange: '71 - 85'
    };
  }

  // TIER 5: MAHIR / UNGGUL (SKOR 86 - 100)
  return {
    label: 'Mahir (86-100)',
    levelCode: 'L5_MAHIR',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-950',
    borderColor: 'border-blue-300',
    barColor: 'bg-blue-600',
    indication: domain === 'literasi'
      ? 'Indikasi: Mampu Mengevaluasi Wacana Kritis, Membandingkan Berbagai Teks Kompleks, & Berpikir Analitis Unggul'
      : 'Indikasi: Mampu Menganalisis Model Matematika Kompleks, Mengintegrasikan Konsep Eksak, & Pemecahan Masalah Kritis',
    rekomendasiTindakan: 'Dilibatkan sebagai Tutor Sebaya, persiapan Olimpiade Sains/OSN, & penelitian ilmiah.',
    description: 'Capaian kompetensi sangat tinggi dan berada di atas standar nasional.',
    isZeroScore: false,
    scoreRange: '86 - 100'
  };
}

/**
 * Normalize student name to ensure case-insensitive, punctuation-free, and trimmed comparison
 * Handles: "ADEL JOVI", "adel jovi", "Adel  Jovi", "M. RIZKI SAPUTRA", "m rizki saputra"
 */
export function normalizeStudentName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/['"`\.,\-_/\\#@!~;:]/g, ' ') // replace symbols with spaces
    .replace(/\s+/g, ' ') // collapse multiple whitespace
    .trim();
}

/**
 * Levenshtein distance for fuzzy matching typos
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const d: number[][] = [];

  for (let i = 0; i <= m; i++) d[i] = [i];
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1, // deletion
        d[i][j - 1] + 1, // insertion
        d[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return d[m][n];
}

/**
 * Computes similarity ratio (0.0 - 1.0) between two strings
 */
function similarityScore(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  const maxLen = Math.max(s1.length, s2.length);
  if (maxLen === 0) return 1.0;
  const dist = levenshteinDistance(s1, s2);
  return 1.0 - dist / maxLen;
}

export type MatchMethodType =
  | 'exact_case'
  | 'case_insensitive'
  | 'normalized'
  | 'token_set'
  | 'fuzzy'
  | 'manual'
  | 'unmatched';

export interface ParsedGoogleFormRow {
  rowNumber: number;
  studentName: string;
  kelas: string;
  score: number;
  capaian: LitNumCapaianInfo;
  
  // Master Data Matching
  matchedStudentId?: string;
  matchedStudentName?: string; // Canonical name taken from Master Data
  matchedClass?: string;
  matchedNisn?: string;
  confidence: 'High' | 'Medium' | 'Low';
  matchMethod: MatchMethodType;
  matchScorePercent?: number;

  // Duplicate Tracking
  isDuplicate: boolean;
  duplicateGroupKey: string;
  duplicateCount: number;
  duplicateRank: number; // 1 = chosen/best row
  isChosenForFinal: boolean; // whether this row is chosen for final export
  duplicateNote?: string;

  rawRow: Record<string, any>;
}

export interface DuplicateGroupSummary {
  groupKey: string;
  canonicalName: string;
  kelas: string;
  matchedStudentId?: string;
  totalSubmissions: number;
  scores: number[];
  highestScore: number;
  lowestScore: number;
  chosenScore: number;
  chosenRowIndex: number;
}

export interface GoogleFormExcelParseResult {
  fileName: string;
  type: 'literasi' | 'numerasi';
  totalRows: number;
  uniqueStudentsCount: number;
  duplicateRowsCount: number;
  matchedCount: number;
  unmatchedCount: number;
  
  // Scoring Statistics
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  distribution: {
    zeroScore: number;
    perluIntervensi: number;
    intervensiAwal: number;
    dasar: number;
    cakap: number;
    mahir: number;
  };

  rows: ParsedGoogleFormRow[]; // All raw rows with metadata
  deduplicatedRows: ParsedGoogleFormRow[]; // Clean final rows ready to save
  duplicateGroups: DuplicateGroupSummary[];
  
  detectedColumns: {
    scoreCol: string;
    nameCol: string;
    classCol: string;
  };
}

/**
 * Parses Google Form Spreadsheet Excel output (.xlsx, .xls, .csv)
 * Performs:
 * 1. Multi-level Case-Insensitive & Spelling Normalization against Master Data Siswa
 * 2. Intelligent Duplicate Detection & Anti-Double Data Elimination
 * 3. Kemendikbudristek Rapor Pendidikan & ANBK Benchmark Categorization
 */
export async function parseGoogleFormExcel(
  file: File,
  type: 'literasi' | 'numerasi',
  registeredStudents: Student[] = [],
  registeredClasses: ClassItem[] = [],
  dedupStrategy: DeduplicationStrategy = 'highest_score'
): Promise<GoogleFormExcelParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

  if (!jsonData || jsonData.length === 0) {
    return {
      fileName: file.name,
      type,
      totalRows: 0,
      uniqueStudentsCount: 0,
      duplicateRowsCount: 0,
      matchedCount: 0,
      unmatchedCount: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      distribution: { zeroScore: 0, perluIntervensi: 0, intervensiAwal: 0, dasar: 0, cakap: 0, mahir: 0 },
      rows: [],
      deduplicatedRows: [],
      duplicateGroups: [],
      detectedColumns: { scoreCol: '', nameCol: '', classCol: '' }
    };
  }

  // Detect column names from the keys of the first row
  const firstRowKeys = Object.keys(jsonData[0]);

  let nameCol = '';
  let scoreCol = '';
  let classCol = '';

  for (const key of firstRowKeys) {
    const k = key.toLowerCase().trim();
    if (!nameCol && (k.includes('nama lengkap') || k.includes('nama siswa') || k.includes('nama') || k.includes('peserta'))) {
      nameCol = key;
    }
    if (!scoreCol && (k.includes('skor') || k.includes('score') || k.includes('nilai') || k.includes('total score'))) {
      scoreCol = key;
    }
    if (!classCol && (k.includes('kelas') || k.includes('rombel') || k.includes('ruang') || k.includes('fase'))) {
      classCol = key;
    }
  }

  // Fallbacks if not detected by exact keywords
  if (!nameCol) nameCol = firstRowKeys.find((k) => /nama/i.test(k)) || firstRowKeys[1] || firstRowKeys[0];
  if (!scoreCol) scoreCol = firstRowKeys.find((k) => /skor|score|nilai/i.test(k)) || firstRowKeys[2] || firstRowKeys[1];
  if (!classCol) classCol = firstRowKeys.find((k) => /kelas/i.test(k)) || firstRowKeys[3] || firstRowKeys[2];

  // Pre-index registered students for lightning fast O(1) lookups
  // 1. Direct lowercase map
  const exactLowerMap = new Map<string, Student>();
  // 2. Normalized alphanumeric map
  const normalizedMap = new Map<string, Student>();
  // 3. Token sorted map
  const tokenSortedMap = new Map<string, Student>();

  registeredStudents.forEach((st) => {
    if (!st.nama) return;
    const lower = st.nama.toLowerCase().trim();
    exactLowerMap.set(lower, st);

    const norm = normalizeStudentName(st.nama);
    normalizedMap.set(norm, st);

    const tokens = norm.split(' ').filter(Boolean).sort().join(' ');
    tokenSortedMap.set(tokens, st);
  });

  const parsedInitialRows: ParsedGoogleFormRow[] = [];
  let matchedCount = 0;
  let unmatchedCount = 0;

  jsonData.forEach((row, idx) => {
    const rawName = String(row[nameCol] || '').trim();
    const rawClass = String(row[classCol] || '').trim();
    const rawScore = String(row[scoreCol] || '').trim();

    if (!rawName) return; // Skip completely empty rows

    // Parse score from e.g. "80 / 100" or "80/100" or "85" or "85,5"
    let numericScore = 0;
    if (rawScore.includes('/')) {
      const parts = rawScore.split('/');
      const earned = parseFloat(parts[0].replace(',', '.'));
      const max = parseFloat(parts[1].replace(',', '.'));
      if (!isNaN(earned) && !isNaN(max) && max > 0) {
        numericScore = Math.round((earned / max) * 100);
      }
    } else {
      const parsed = parseFloat(rawScore.replace(',', '.'));
      if (!isNaN(parsed)) {
        numericScore = parsed > 100 ? 100 : parsed < 0 ? 0 : Math.round(parsed);
      }
    }

    // Matching against Master Data with intelligent multi-tier checks
    const rawLower = rawName.toLowerCase();
    const rawNorm = normalizeStudentName(rawName);
    const rawTokens = rawNorm.split(' ').filter(Boolean).sort().join(' ');

    let matchedStudent: Student | undefined;
    let matchMethod: MatchMethodType = 'unmatched';
    let confidence: 'High' | 'Medium' | 'Low' = 'Low';
    let matchScorePercent = 0;

    // Level 1: Exact Case-Insensitive
    if (exactLowerMap.has(rawLower)) {
      matchedStudent = exactLowerMap.get(rawLower);
      matchMethod = rawName === matchedStudent?.nama ? 'exact_case' : 'case_insensitive';
      confidence = 'High';
      matchScorePercent = 100;
    }
    // Level 2: Normalized Alphanumeric (ignores dots, extra spaces, accents, dashes)
    else if (normalizedMap.has(rawNorm)) {
      matchedStudent = normalizedMap.get(rawNorm);
      matchMethod = 'normalized';
      confidence = 'High';
      matchScorePercent = 98;
    }
    // Level 3: Token Sorted (e.g. "FAUZI, AHMAD" vs "AHMAD FAUZI")
    else if (tokenSortedMap.has(rawTokens)) {
      matchedStudent = tokenSortedMap.get(rawTokens);
      matchMethod = 'token_set';
      confidence = 'High';
      matchScorePercent = 95;
    }
    // Level 4: Fuzzy / Levenshtein & Substring fallback
    else {
      let bestFuzzyMatch: Student | undefined;
      let highestSimilarity = 0;

      for (const st of registeredStudents) {
        const stNorm = normalizeStudentName(st.nama);
        // Direct substring check
        if (stNorm.length > 5 && (rawNorm.includes(stNorm) || stNorm.includes(rawNorm))) {
          const sim = Math.min(stNorm.length, rawNorm.length) / Math.max(stNorm.length, rawNorm.length);
          if (sim > highestSimilarity && sim >= 0.75) {
            highestSimilarity = sim;
            bestFuzzyMatch = st;
          }
        } else {
          const sim = similarityScore(rawNorm, stNorm);
          if (sim > highestSimilarity && sim >= 0.82) {
            highestSimilarity = sim;
            bestFuzzyMatch = st;
          }
        }
      }

      if (bestFuzzyMatch && highestSimilarity >= 0.82) {
        matchedStudent = bestFuzzyMatch;
        matchMethod = 'fuzzy';
        confidence = highestSimilarity >= 0.90 ? 'High' : 'Medium';
        matchScorePercent = Math.round(highestSimilarity * 100);
      }
    }

    if (matchedStudent) {
      matchedCount++;
    } else {
      unmatchedCount++;
    }

    const capaian = getLitNumCapaian(numericScore, type);

    // Duplicate grouping key:
    // If matched to master data, use canonical student ID (or canonical normalized name)
    // If unmatched, use raw normalized name
    const duplicateGroupKey = matchedStudent
      ? `id_${matchedStudent.id}`
      : `name_${rawNorm}`;

    parsedInitialRows.push({
      rowNumber: idx + 1,
      studentName: rawName,
      kelas: rawClass || matchedStudent?.kelas || 'X-1',
      score: numericScore,
      capaian,
      matchedStudentId: matchedStudent?.id,
      matchedStudentName: matchedStudent?.nama, // CANONICAL NAME FROM MASTER DATA!
      matchedClass: matchedStudent?.kelas || rawClass,
      matchedNisn: matchedStudent?.nisn,
      confidence,
      matchMethod,
      matchScorePercent,
      isDuplicate: false,
      duplicateGroupKey,
      duplicateCount: 1,
      duplicateRank: 1,
      isChosenForFinal: true,
      rawRow: row
    });
  });

  // Group by duplicateGroupKey to detect and cleanly resolve duplicate submissions
  const groupMap = new Map<string, ParsedGoogleFormRow[]>();
  parsedInitialRows.forEach((row) => {
    const list = groupMap.get(row.duplicateGroupKey) || [];
    list.push(row);
    groupMap.set(row.duplicateGroupKey, list);
  });

  const duplicateGroups: DuplicateGroupSummary[] = [];
  const deduplicatedRows: ParsedGoogleFormRow[] = [];
  let totalDuplicateRowsCount = 0;

  groupMap.forEach((rowsInGroup, groupKey) => {
    const totalSubmissions = rowsInGroup.length;
    const scores = rowsInGroup.map((r) => r.score);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    if (totalSubmissions > 1) {
      totalDuplicateRowsCount += totalSubmissions - 1;

      // Sort rows in this group according to chosen strategy
      // For 'highest_score': sort descending by score
      // For 'latest_entry': sort descending by rowNumber (last row in spreadsheet first)
      // For 'first_entry': sort ascending by rowNumber
      rowsInGroup.sort((a, b) => {
        if (dedupStrategy === 'highest_score') {
          if (b.score !== a.score) return b.score - a.score;
          return b.rowNumber - a.rowNumber; // if scores are equal, take latest
        }
        if (dedupStrategy === 'latest_entry') {
          return b.rowNumber - a.rowNumber;
        }
        if (dedupStrategy === 'first_entry') {
          return a.rowNumber - b.rowNumber;
        }
        return b.score - a.score;
      });

      // Mark duplicate metadata on each row
      rowsInGroup.forEach((r, rankIdx) => {
        r.isDuplicate = true;
        r.duplicateCount = totalSubmissions;
        r.duplicateRank = rankIdx + 1;
        r.isChosenForFinal = rankIdx === 0;
        r.duplicateNote = rankIdx === 0
          ? `Entri Terpilih (${dedupStrategy === 'highest_score' ? `Skor Tertinggi ${highestScore}` : 'Entri Terakhir'}) dari ${totalSubmissions} pengumpulan`
          : `Duplikat diabaikan (Skor ${r.score}) — pengumpulan ke-${r.rowNumber}`;
      });

      // Chosen winner row
      const winnerRow = { ...rowsInGroup[0] };
      if (dedupStrategy === 'average') {
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        winnerRow.score = avg;
        winnerRow.capaian = getLitNumCapaian(avg, type);
      }
      deduplicatedRows.push(winnerRow);

      duplicateGroups.push({
        groupKey,
        canonicalName: winnerRow.matchedStudentName || winnerRow.studentName,
        kelas: winnerRow.matchedClass || winnerRow.kelas,
        matchedStudentId: winnerRow.matchedStudentId,
        totalSubmissions,
        scores,
        highestScore,
        lowestScore,
        chosenScore: winnerRow.score,
        chosenRowIndex: winnerRow.rowNumber
      });
    } else {
      // Single submission: no duplicate
      const row = rowsInGroup[0];
      row.isDuplicate = false;
      row.duplicateCount = 1;
      row.duplicateRank = 1;
      row.isChosenForFinal = true;
      deduplicatedRows.push(row);
    }
  });

  // Calculate statistics across final clean deduplicated dataset
  const finalScores = deduplicatedRows.map((r) => r.score);
  const totalClean = finalScores.length;
  const avgScore = totalClean > 0 ? Math.round(finalScores.reduce((a, b) => a + b, 0) / totalClean) : 0;
  const maxScore = totalClean > 0 ? Math.max(...finalScores) : 0;
  const minScore = totalClean > 0 ? Math.min(...finalScores) : 0;

  const distribution = {
    zeroScore: deduplicatedRows.filter((r) => r.capaian.isZeroScore).length,
    perluIntervensi: deduplicatedRows.filter((r) => r.capaian.levelCode === 'L1_INTERVENSI_KHUSUS').length,
    intervensiAwal: deduplicatedRows.filter((r) => r.capaian.levelCode === 'L2_INTERVENSI_AWAL').length,
    dasar: deduplicatedRows.filter((r) => r.capaian.levelCode === 'L3_DASAR').length,
    cakap: deduplicatedRows.filter((r) => r.capaian.levelCode === 'L4_CAKAP').length,
    mahir: deduplicatedRows.filter((r) => r.capaian.levelCode === 'L5_MAHIR').length,
  };

  return {
    fileName: file.name,
    type,
    totalRows: parsedInitialRows.length,
    uniqueStudentsCount: deduplicatedRows.length,
    duplicateRowsCount: totalDuplicateRowsCount,
    matchedCount,
    unmatchedCount,
    averageScore: avgScore,
    highestScore: maxScore,
    lowestScore: minScore,
    distribution,
    rows: parsedInitialRows,
    deduplicatedRows,
    duplicateGroups,
    detectedColumns: { scoreCol, nameCol, classCol }
  };
}

/**
 * Converts parsed Google Form rows into official LitNumRecord database entries
 * Uses the canonical studentName and studentId from Master Data Siswa
 * Guaranteed zero duplicate entries per student in the generated records
 */
export function convertGoogleFormRowsToRecords(
  parseResult: GoogleFormExcelParseResult,
  customDate?: string,
  useDeduplicatedOnly: boolean = true
): LitNumRecord[] {
  const dateStr = customDate || new Date().toISOString().split('T')[0];
  const targetRows = useDeduplicatedOnly ? parseResult.deduplicatedRows : parseResult.rows;

  return targetRows.map((row, idx) => ({
    id: `ln-gf-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
    type: parseResult.type,
    // Prioritize canonical Master Data values:
    studentId: row.matchedStudentId || `st-unmatched-${idx}`,
    studentName: row.matchedStudentName || row.studentName,
    kelas: row.matchedClass || row.kelas,
    score: row.score,
    date: dateStr,
    source: 'google_form_excel',
    fileName: parseResult.fileName,
    notes: row.isDuplicate
      ? `Terverifikasi Master Data (Anti-Ganda: skor terpilih ${row.score} dari ${row.duplicateCount} pengumpulan)`
      : row.matchedStudentId
      ? `Terverifikasi Master Data SMAN 3 Tumijajar (${row.matchMethod})`
      : 'Diimpor dari Google Form Excel',
    createdAt: new Date().toISOString()
  }));
}
