import { SubjectItem } from '../types';

/**
 * Standard KKTP Interval Definitions sesuai Kebijakan Penilaian Kurikulum Merdeka & Pembelajaran Mendalam
 * Rentang Nilai Wajib:
 * - (0 - 60)   : Kurang (Belum mencapai ketuntasan, remedial di seluruh bagian)
 * - (61 - 70)  : Cukup (Mencapai ketuntasan standar minimal, remedial di bagian yang diperlukan)
 * - (71 - 80)  : Baik (Sudah mencapai ketuntasan, tidak perlu remedial)
 * - (81 - 100) : Sangat Baik (Melampaui ketuntasan, diberikan pengayaan)
 */
export type KKTPKategori = 'Kurang' | 'Cukup' | 'Baik' | 'Sangat Baik';

export interface KKTPIntervalInfo {
  kategori: KKTPKategori;
  rentang: string;
  min: number;
  max: number;
  label: string;
  subLabel: string;
  remedialInfo: string;
  badgeTag: string;
  shortBadge: string;
  predikat: 'D' | 'C' | 'B' | 'A';
  deskripsi: string;
  prefixCK: string; // Sesuai panduan resmi: 'Peserta didik kurang mampu' | 'Peserta didik cukup mampu' | 'Peserta didik mampu' | 'Peserta didik sangat mampu'
  panduanCK: string;
  tuntas: boolean;
  tuntasMinimal?: boolean;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  badgeClass: string;
  iconSymbol: string;
}

export const KKTP_INTERVALS: KKTPIntervalInfo[] = [
  {
    kategori: 'Kurang',
    rentang: '0 - 60',
    min: 0,
    max: 60,
    label: 'Kurang (Belum mencapai ketuntasan, remedial di seluruh bagian)',
    subLabel: 'Belum mencapai ketuntasan',
    remedialInfo: 'Remedial di seluruh bagian',
    badgeTag: 'Kurang (Remedial Total)',
    shortBadge: 'Kurang (Remedial Total)',
    predikat: 'D',
    deskripsi: 'Belum mencapai ketuntasan (0-60). Wajib mengikuti remedial di seluruh bagian.',
    prefixCK: 'Peserta didik kurang mampu',
    panduanCK: 'Peserta didik kurang mampu ...........................',
    tuntas: false,
    tuntasMinimal: false,
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-800',
    badgeBorder: 'border-rose-300',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-300 font-extrabold',
    iconSymbol: '',
  },
  {
    kategori: 'Cukup',
    rentang: '61 - 70',
    min: 61,
    max: 70,
    label: 'Cukup (Mencapai ketuntasan standar minimal, remedial di bagian yang diperlukan)',
    subLabel: 'Mencapai ketuntasan standar minimal',
    remedialInfo: 'Remedial di bagian yang diperlukan',
    badgeTag: 'Cukup (Tuntas Minimal)',
    shortBadge: 'Cukup (Tuntas Minimal)',
    predikat: 'C',
    deskripsi: 'Mencapai ketuntasan standar minimal (61-70). Remedial di bagian tertentu yang diperlukan.',
    prefixCK: 'Peserta didik cukup mampu',
    panduanCK: 'Peserta didik cukup mampu ...........................',
    tuntas: true,
    tuntasMinimal: true,
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-900',
    badgeBorder: 'border-amber-300',
    badgeClass: 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold',
    iconSymbol: '',
  },
  {
    kategori: 'Baik',
    rentang: '71 - 80',
    min: 71,
    max: 80,
    label: 'Baik (Sudah mencapai ketuntasan, tidak perlu remedial)',
    subLabel: 'Sudah mencapai ketuntasan',
    remedialInfo: 'Tidak perlu remedial',
    badgeTag: 'Baik (Tuntas Mandiri)',
    shortBadge: 'Baik (Tuntas)',
    predikat: 'B',
    deskripsi: 'Sudah mencapai ketuntasan tujuan pembelajaran secara mandiri (71-80). Tidak perlu remedial.',
    prefixCK: 'Peserta didik mampu',
    panduanCK: 'Peserta didik mampu ...........................',
    tuntas: true,
    tuntasMinimal: false,
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-300',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold',
    iconSymbol: '',
  },
  {
    kategori: 'Sangat Baik',
    rentang: '81 - 100',
    min: 81,
    max: 100,
    label: 'Sangat Baik (Melampaui ketuntasan, diberikan pengayaan)',
    subLabel: 'Melampaui ketuntasan',
    remedialInfo: 'Diberikan pengayaan',
    badgeTag: 'Sangat Baik (Pengayaan)',
    shortBadge: 'Sangat Baik (Pengayaan)',
    predikat: 'A',
    deskripsi: 'Melampaui ketuntasan (81-100) dengan penguasaan sangat baik. Diberikan pengayaan.',
    prefixCK: 'Peserta didik sangat mampu',
    panduanCK: 'Peserta didik sangat mampu ...........................',
    tuntas: true,
    tuntasMinimal: false,
    badgeBg: 'bg-indigo-50',
    badgeText: 'text-indigo-800',
    badgeBorder: 'border-indigo-300',
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-300 font-extrabold',
    iconSymbol: '',
  },
];

/**
 * Returns the exact Capaian Kompetensi prefix according to the KKTP guideline image:
 * 0 - 60   : "Peserta didik kurang mampu"
 * 61 - 70  : "Peserta didik cukup mampu"
 * 71 - 80  : "Peserta didik mampu"
 * 81 - 100 : "Peserta didik sangat mampu"
 */
export function getKKTPPrefix(nilai: number): string {
  const score = Math.max(0, Math.min(100, Math.round(Number(nilai) || 0)));
  if (score <= 60) return 'Peserta didik kurang mampu';
  if (score <= 70) return 'Peserta didik cukup mampu';
  if (score <= 80) return 'Peserta didik mampu';
  return 'Peserta didik sangat mampu';
}

/**
 * Returns complete KKTP interval metadata based on a numerical score (0-100)
 */
export function getKKTPKategori(nilai: number): KKTPIntervalInfo {
  const score = Math.max(0, Math.min(100, Math.round(Number(nilai) || 0)));
  if (score <= 60) return KKTP_INTERVALS[0];
  if (score <= 70) return KKTP_INTERVALS[1];
  if (score <= 80) return KKTP_INTERVALS[2];
  return KKTP_INTERVALS[3];
}

/**
 * Extracts the grade level ('X', 'XI', or 'XII') from class name strings like 'X.1', 'XI.3', 'XII.2'
 */
export function getGradeLevelFromClass(className: string): 'X' | 'XI' | 'XII' | null {
  if (!className) return null;
  const clean = className.trim().toUpperCase();
  if (clean.startsWith('XII.') || clean.startsWith('XII ') || clean === 'XII' || clean.startsWith('12.') || clean.startsWith('12 ') || clean === '12') {
    return 'XII';
  }
  if (clean.startsWith('XI.') || clean.startsWith('XI ') || clean === 'XI' || clean.startsWith('11.') || clean.startsWith('11 ') || clean === '11') {
    return 'XI';
  }
  if (clean.startsWith('X.') || clean.startsWith('X ') || clean === 'X' || clean.startsWith('10.') || clean.startsWith('10 ') || clean === '10') {
    return 'X';
  }
  return null;
}

/**
 * Resolves the accurate KKTP for a subject given the target class (Kelas X, XI, or XII),
 * prioritizing the specific teacher's customized KKTP determination if available.
 * Falls back to subject.kktpX/kktpXI/kktpXII or subject.kktp or defaultFallback.
 */
export function getSubjectKktpForClass(
  subject?: SubjectItem | null,
  className?: string,
  defaultFallback: number = 75,
  teacherNameOrId?: string
): number {
  if (!subject) return defaultFallback;
  const grade = getGradeLevelFromClass(className || '');
  
  // 1. Check if specific teacher has a customized KKTP determination for this subject
  if (teacherNameOrId && subject.guruAssignments && subject.guruAssignments.length > 0) {
    const cleanTeacher = teacherNameOrId.trim().toLowerCase();
    const assignment = subject.guruAssignments.find(
      (a) =>
        a.teacherId.toLowerCase() === cleanTeacher ||
        a.teacherName.toLowerCase() === cleanTeacher
    );

    if (assignment) {
      if (grade === 'X' && typeof assignment.kktpX === 'number' && assignment.kktpX > 0) {
        return assignment.kktpX;
      }
      if (grade === 'XI' && typeof assignment.kktpXI === 'number' && assignment.kktpXI > 0) {
        return assignment.kktpXI;
      }
      if (grade === 'XII' && typeof assignment.kktpXII === 'number' && assignment.kktpXII > 0) {
        return assignment.kktpXII;
      }
      if (typeof assignment.kktp === 'number' && assignment.kktp > 0) {
        return assignment.kktp;
      }
    }
  }

  // 2. Fall back to subject-level grade KKTP
  if (grade === 'X' && typeof subject.kktpX === 'number' && subject.kktpX > 0) {
    return subject.kktpX;
  }
  if (grade === 'XI' && typeof subject.kktpXI === 'number' && subject.kktpXI > 0) {
    return subject.kktpXI;
  }
  if (grade === 'XII' && typeof subject.kktpXII === 'number' && subject.kktpXII > 0) {
    return subject.kktpXII;
  }
  
  return typeof subject.kktp === 'number' && subject.kktp > 0 ? subject.kktp : defaultFallback;
}

/**
 * Formats academic titles/degrees from ALL CAPS (e.g. S.PD, M.PD, S.MAT, S.SOS) to proper casing (S.Pd, M.Pd, S.Mat, S.Sos)
 */
export function formatAcademicTitles(name: string): string {
  if (!name) return name;
  let formatted = name;
  
  const replacements: [RegExp, string][] = [
    [/\bS\.PD\.I\b/gi, 'S.Pd.I'],
    [/\bM\.PD\.I\b/gi, 'M.Pd.I'],
    [/\bS\.PD\.SD\b/gi, 'S.Pd.SD'],
    [/\bS\.PD\b/gi, 'S.Pd'],
    [/\bM\.PD\b/gi, 'M.Pd'],
    [/\bS\.MAT\b/gi, 'S.Mat'],
    [/\bS\.SOS\b/gi, 'S.Sos'],
    [/\bS\.KOM\b/gi, 'S.Kom'],
    [/\bM\.KOM\b/gi, 'M.Kom'],
    [/\bS\.SI\b/gi, 'S.Si'],
    [/\bM\.SI\b/gi, 'M.Si'],
    [/\bS\.AG\b/gi, 'S.Ag'],
    [/\bM\.AG\b/gi, 'M.Ag'],
    [/\bS\.PSI\b/gi, 'S.Psi'],
    [/\bM\.PSI\b/gi, 'M.Psi'],
    [/\bS\.IP\b/gi, 'S.Ip'],
    [/\bS\.H\b/gi, 'S.H'],
    [/\bM\.H\b/gi, 'M.H'],
    [/\bS\.E\b/gi, 'S.E'],
    [/\bM\.M\b/gi, 'M.M'],
    [/\bS\.S\b/gi, 'S.S'],
    [/\bS\.T\b/gi, 'S.T'],
    [/\bM\.T\b/gi, 'M.T'],
    [/\bS\.KH\b/gi, 'S.Kh'],
    [/\bS\.PI\b/gi, 'S.Pi'],
    [/\bS\.HUT\b/gi, 'S.Hut'],
    [/\bS\.PT\b/gi, 'S.Pt'],
    [/\bS\.TP\b/gi, 'S.Tp'],
    [/\bS\.KED\b/gi, 'S.Ked'],
    [/\bS\.KG\b/gi, 'S.Kg'],
    [/\bS\.KM\b/gi, 'S.Km'],
    [/\bDRA\b/gi, 'Dra'],
    [/\bDRS\b/gi, 'Drs'],
    [/\bDR\b/gi, 'Dr'],
    [/\bPROF\b/gi, 'Prof'],
  ];

  replacements.forEach(([regex, replacement]) => {
    formatted = formatted.replace(regex, replacement);
  });

  return formatted;
}
