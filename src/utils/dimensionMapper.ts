import { Assessment, Student } from '../types';

export interface DeepLearningDimension {
  id: string;
  label: string;
  color: string;
}

export const EIGHT_DIMENSIONS: DeepLearningDimension[] = [
  { id: 'dim-1', label: 'Keimanan & Ketakwaan', color: 'bg-emerald-500' },
  { id: 'dim-2', label: 'Kewargaan & Integritas', color: 'bg-sky-500' },
  { id: 'dim-3', label: 'Penalaran Kritis', color: 'bg-indigo-500' },
  { id: 'dim-4', label: 'Kreativitas', color: 'bg-purple-500' },
  { id: 'dim-5', label: 'Kolaborasi', color: 'bg-teal-500' },
  { id: 'dim-6', label: 'Kemandirian', color: 'bg-amber-500' },
  { id: 'dim-7', label: 'Komunikasi', color: 'bg-blue-500' },
  { id: 'dim-8', label: 'Kesehatan & Raga', color: 'bg-rose-500' },
];

/**
 * Automatically assigns 1, 2, or 3 relevant dimensions from the 8 Deep Learning Dimensions
 * based on the subject name so teachers do not need to manually choose them.
 */
export function getSubjectDimensions(mataPelajaran: string): string[] {
  if (!mataPelajaran) return ['Penalaran Kritis', 'Kreativitas'];

  const lower = mataPelajaran.toLowerCase();

  if (lower.includes('antikorupsi') || lower.includes('korupsi')) {
    return ['Keimanan & Ketakwaan', 'Kewargaan & Integritas', 'Penalaran Kritis'];
  }
  if (lower.includes('agama') || lower.includes('al-qur') || lower.includes('alkitab') || lower.includes('bp')) {
    return ['Keimanan & Ketakwaan', 'Kewargaan & Integritas'];
  }
  if (lower.includes('pancasila') || lower.includes('pkn') || lower.includes('kewarganegaraan')) {
    return ['Kewargaan & Integritas', 'Komunikasi', 'Penalaran Kritis'];
  }
  if (lower.includes('indonesia')) {
    return ['Komunikasi', 'Penalaran Kritis', 'Kreativitas'];
  }
  if (lower.includes('inggris') || lower.includes('asing') || lower.includes('jepang') || lower.includes('mandarin') || lower.includes('arab')) {
    return ['Komunikasi', 'Kolaborasi'];
  }
  if (lower.includes('matematika') || lower.includes('mtk') || lower.includes('kalkulus') || lower.includes('statistika')) {
    return ['Penalaran Kritis', 'Kemandirian'];
  }
  if (lower.includes('biologi') || lower.includes('fisika') || lower.includes('kimia') || lower.includes('ipa')) {
    return ['Penalaran Kritis', 'Kreativitas', 'Kemandirian'];
  }
  if (lower.includes('sejarah') || lower.includes('sosiologi') || lower.includes('geografi') || lower.includes('ekonomi') || lower.includes('ips')) {
    return ['Penalaran Kritis', 'Kewargaan & Integritas', 'Komunikasi'];
  }
  if (lower.includes('informatika') || lower.includes('komputer') || lower.includes('coding') || lower.includes('ai') || lower.includes('tik')) {
    return ['Kreativitas', 'Penalaran Kritis', 'Kemandirian'];
  }
  if (lower.includes('jasmani') || lower.includes('pjok') || lower.includes('olahraga') || lower.includes('kesehatan')) {
    return ['Kesehatan & Raga', 'Kolaborasi'];
  }
  if (lower.includes('seni') || lower.includes('prakarya') || lower.includes('musik') || lower.includes('tari') || lower.includes('rupa')) {
    return ['Kreativitas', 'Kolaborasi', 'Komunikasi'];
  }
  if (lower.includes('bk') || lower.includes('konseling') || lower.includes('bimbingan')) {
    return ['Kemandirian', 'Keimanan & Ketakwaan', 'Kesehatan & Raga'];
  }

  // Default fallback (2 dimensions)
  return ['Penalaran Kritis', 'Kreativitas'];
}

/**
 * Calculates dynamic progress percentage (starting at 0%) for each of the 8 Deep Learning Dimensions.
 * Progress is based on completed and graded student submissions for assessments linked to each dimension.
 */
export function calculateDimensionProgress(
  assessments: Assessment[] = [],
  students: Student[] = []
): { label: string; progress: number; color: string; gradedCount: number; targetCount: number }[] {
  // Map class name -> student count
  const classStudentCountMap: Record<string, number> = {};
  students.forEach((s) => {
    classStudentCountMap[s.kelas] = (classStudentCountMap[s.kelas] || 0) + 1;
  });

  return EIGHT_DIMENSIONS.map((dim) => {
    let dimGradedSubmissions = 0;
    let dimTargetStudents = 0;

    assessments.forEach((asm) => {
      // Determine if this assessment covers this dimension
      const asmDimensions = getSubjectDimensions(asm.mataPelajaran);
      let matchesAsm = asmDimensions.some((d) => d.toLowerCase().includes(dim.label.toLowerCase()) || dim.label.toLowerCase().includes(d.toLowerCase()));

      // Also check essay rubric dimensions if available
      if (!matchesAsm && asm.essayRubrik && asm.essayRubrik.length > 0) {
        matchesAsm = asm.essayRubrik.some((rub) =>
          rub.dimensiPembelajaran?.toLowerCase().includes(dim.label.toLowerCase())
        );
      }

      if (matchesAsm) {
        const gradedSubs = asm.submissions?.length || 0;
        const targetForClass = classStudentCountMap[asm.kelas] || 35;

        dimGradedSubmissions += gradedSubs;
        dimTargetStudents += targetForClass;
      }
    });

    // Calculate percentage based on corrected answer sheets vs target
    let progress = 0;
    if (dimTargetStudents > 0 && dimGradedSubmissions > 0) {
      progress = Math.min(100, Math.round((dimGradedSubmissions / dimTargetStudents) * 100));
    }

    return {
      label: dim.label,
      progress: progress, // Starts at 0% when no student answer sheets corrected yet
      color: dim.color,
      gradedCount: dimGradedSubmissions,
      targetCount: dimTargetStudents,
    };
  });
}
