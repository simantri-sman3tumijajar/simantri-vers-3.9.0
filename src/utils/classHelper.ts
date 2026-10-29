/**
 * Helper utility for parsing and matching multi-class assessment specifications
 * e.g., "X.1, X.2, X.3" or "X.1 / X.2" or ["X.1", "X.2"]
 */

export function cleanCanonicalClass(str: string): string {
  return (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts list of individual class names from a multi-class string or array.
 * e.g., "X.1, X.2, X.3" -> ["X.1", "X.2", "X.3"]
 */
export function getAssessmentClassesList(kelasInput: string | string[]): string[] {
  if (!kelasInput) return [];
  if (Array.isArray(kelasInput)) {
    return kelasInput.map((c) => c.trim()).filter(Boolean);
  }
  return kelasInput
    .split(/[,;\/]+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * Checks if a target class (e.g., "X.2" or "ALL") matches an assessment's class specification.
 * If targetClass is "ALL", returns true.
 * If assessment has multi-classes (e.g., "X.1, X.2, X.3"), checks if targetClass is included.
 */
export function isClassMatch(assessmentKelas: string | string[], targetClass: string): boolean {
  if (!targetClass || targetClass === 'ALL') return true;
  if (!assessmentKelas) return false;

  const targetClean = cleanCanonicalClass(targetClass);
  const classesList = getAssessmentClassesList(assessmentKelas);

  return classesList.some((c) => cleanCanonicalClass(c) === targetClean);
}

/**
 * Formats multi-classes array/string into a clean display string.
 * e.g., ["X.1", "X.2", "X.3"] -> "X.1, X.2, X.3"
 */
export function formatClassesDisplay(kelasInput: string | string[]): string {
  const list = getAssessmentClassesList(kelasInput);
  if (list.length === 0) return '-';
  return list.join(', ');
}

/**
 * Determines the numeric semester (1-6) based on class level (X, XI, XII) and semester type (Ganjil / Genap).
 * - Kelas X: Semester 1 (Ganjil), Semester 2 (Genap)
 * - Kelas XI: Semester 3 (Ganjil), Semester 4 (Genap)
 * - Kelas XII: Semester 5 (Ganjil), Semester 6 (Genap)
 */
export function getSemesterNumber(kelasStr: string | string[], semesterType: string): string {
  const isGenap = /genap|2|4|6/i.test(semesterType || '');
  const cleanCls = (Array.isArray(kelasStr) ? kelasStr.join(' ') : (kelasStr || '')).toUpperCase();

  if (cleanCls.includes('XII') || /\b12\b/.test(cleanCls)) {
    return isGenap ? '6' : '5';
  }
  if (cleanCls.includes('XI') || /\b11\b/.test(cleanCls)) {
    return isGenap ? '4' : '3';
  }
  // Default to Kelas X / Grade 10
  return isGenap ? '2' : '1';
}

export function getSemesterDisplay(kelasStr: string | string[], semesterType: string): string {
  const num = getSemesterNumber(kelasStr, semesterType);
  const typeText = (semesterType || '').toLowerCase().includes('genap') || /2|4|6/.test(num) ? 'Genap' : 'Ganjil';
  return `${num} (${typeText})`;
}

