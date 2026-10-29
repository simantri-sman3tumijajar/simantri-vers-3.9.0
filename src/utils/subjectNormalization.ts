import { AppState, SubjectItem, Teacher, Assessment } from '../types';

/**
 * Clean up and normalize a subject reference for a teacher or assessment.
 * Respects official subjects registered in the system and applies explicit rename mappings.
 */
export function normalizeSingleSubject(
  rawName: string,
  officialSubjects: SubjectItem[],
  renameMap?: Record<string, string>
): string {
  if (!rawName || typeof rawName !== 'string') return '';
  const trimmed = rawName.trim();
  if (!trimmed) return '';

  // 1. Check if an explicit rename mapping exists
  if (renameMap) {
    if (renameMap[trimmed]) return renameMap[trimmed];
    const lower = trimmed.toLowerCase();
    for (const [oldKey, newTarget] of Object.entries(renameMap)) {
      if (oldKey.toLowerCase() === lower) {
        return newTarget;
      }
    }
  }

  // 2. Special case: All Subjects wildcard
  if (trimmed === 'Semua Mata Pelajaran' || trimmed.toLowerCase() === 'semua mata pelajaran') {
    return 'Semua Mata Pelajaran';
  }

  // 3. Exact or case-insensitive match against registered official subjects
  const lower = trimmed.toLowerCase();
  const officialMatch = officialSubjects.find(
    (s) => s.nama.trim().toLowerCase() === lower
  );
  if (officialMatch) {
    return officialMatch.nama;
  }

  // Fallback: return cleaned trimmed string as-is
  return trimmed;
}

/**
 * Normalizes and deduplicates a teacher's subject list so there are no duplicate entries.
 */
export function normalizeTeacherSubjectList(
  subjects: string[] | undefined | null,
  officialSubjects: SubjectItem[],
  renameMap?: Record<string, string>
): string[] {
  if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
    return [];
  }

  const normalizedSet = new Set<string>();

  for (const item of subjects) {
    const clean = normalizeSingleSubject(item, officialSubjects, renameMap);
    if (!clean) continue;

    if (clean === 'Semua Mata Pelajaran') {
      normalizedSet.add('Semua Mata Pelajaran');
      continue;
    }

    // Prefer official name if available
    const official = officialSubjects.find(
      (s) => s.nama.trim().toLowerCase() === clean.toLowerCase()
    );
    if (official) {
      normalizedSet.add(official.nama);
    } else {
      normalizedSet.add(clean);
    }
  }

  return Array.from(normalizedSet);
}

/**
 * Normalizes AppState safely:
 * - Preserves ALL registered subjects in state.subjects without deleting, mutating, or merging custom names
 * - Sanitizes subject data fields (kktp, kktpX, kktpXI, kktpXII, guruPengampu, guruAssignments, kelasAjar)
 * - Synchronizes teacher mataPelajaran when explicit renames occur
 * - Updates assessments if subject was renamed
 */
export function normalizeStateSubjects(
  state: AppState,
  renameMap?: Record<string, string>
): AppState {
  if (!state) return state;

  const defaultKktp = 75;
  const rawSubjects = Array.isArray(state.subjects) ? state.subjects : [];
  const dynamicRenameMap: Record<string, string> = { ...(renameMap || {}) };

  // 1. Sanitize registered subjects safely - DO NOT delete or merge user's subjects!
  const cleanedSubjects: SubjectItem[] = rawSubjects
    .filter((sbj) => sbj && typeof sbj === 'object' && sbj.nama && sbj.nama.trim().length > 0)
    .map((sbj, idx) => {
      const trimmedNama = sbj.nama.trim();
      const baseKktp = typeof sbj.kktp === 'number' && sbj.kktp > 0 ? sbj.kktp : defaultKktp;
      const kX = typeof sbj.kktpX === 'number' && sbj.kktpX > 0 ? sbj.kktpX : baseKktp;
      const kXI = typeof sbj.kktpXI === 'number' && sbj.kktpXI > 0 ? sbj.kktpXI : baseKktp;
      const kXII = typeof sbj.kktpXII === 'number' && sbj.kktpXII > 0 ? sbj.kktpXII : baseKktp;

      const safeId = sbj.id || `sbj-${Date.now()}-${idx}`;
      const safeKode = sbj.kode ? sbj.kode.trim() : `MP-${idx + 1}`;

      const guruPengampu = Array.isArray(sbj.guruPengampu)
        ? Array.from(new Set(sbj.guruPengampu.filter((g) => typeof g === 'string' && g.trim().length > 0)))
        : [];

      const guruAssignments = Array.isArray(sbj.guruAssignments)
        ? sbj.guruAssignments.filter((ga) => ga && typeof ga === 'object' && (ga.teacherName || ga.teacherId))
        : [];

      const kelasAjar = Array.isArray(sbj.kelasAjar)
        ? sbj.kelasAjar
        : (state.classes || []).map((c) => c.nama);

      return {
        ...sbj,
        id: safeId,
        kode: safeKode,
        nama: trimmedNama,
        kktp: baseKktp,
        kktpX: kX,
        kktpXI: kXI,
        kktpXII: kXII,
        guruPengampu,
        guruAssignments,
        kelasAjar,
      };
    });

  // 2. Normalize all teachers' subjects
  const updatedTeachers: Teacher[] = (state.teachers || []).map((t) => {
    const cleanSubs = normalizeTeacherSubjectList(t.mataPelajaran, cleanedSubjects, dynamicRenameMap);
    return {
      ...t,
      mataPelajaran: cleanSubs,
    };
  });

  // 3. Normalize all assessments' subject names
  const updatedAssessments: Assessment[] = (state.assessments || []).map((a) => {
    const cleanSubj = normalizeSingleSubject(a.mataPelajaran, cleanedSubjects, dynamicRenameMap);
    return {
      ...a,
      mataPelajaran: cleanSubj || a.mataPelajaran,
    };
  });

  // 4. Synchronize guruPengampu in subjects with teachers who explicitly teach this subject
  const finalSubjects: SubjectItem[] = cleanedSubjects.map((sbj) => {
    const currentName = dynamicRenameMap[sbj.nama] || sbj.nama;

    // Teachers who explicitly have this subject in their list (NEVER inject wildcard "Semua Mata Pelajaran" teachers into every specific subject)
    const teachersTeachingThis = updatedTeachers
      .filter((t) =>
        t.mataPelajaran.some(
          (m) =>
            typeof m === 'string' &&
            m.trim().length > 0 &&
            m !== 'Semua Mata Pelajaran' &&
            m.toLowerCase().trim() === currentName.toLowerCase().trim()
        )
      )
      .map((t) => t.nama);

    // Merge without dropping existing assigned teacher names
    const mergedGuru = Array.from(new Set([...(sbj.guruPengampu || []), ...teachersTeachingThis]));

    // Keep guruAssignments synchronized with guruPengampu
    const existingAssignmentNames = new Set(
      (sbj.guruAssignments || []).map((ga) => ga.teacherName.toLowerCase().trim())
    );
    const newAssignments = [...(sbj.guruAssignments || [])];
    mergedGuru.forEach((gName) => {
      if (!existingAssignmentNames.has(gName.toLowerCase().trim())) {
        newAssignments.push({
          teacherId: gName,
          teacherName: gName,
          kktp: sbj.kktp,
          kktpX: sbj.kktpX || sbj.kktp,
          kktpXI: sbj.kktpXI || sbj.kktp,
          kktpXII: sbj.kktpXII || sbj.kktp,
          kelasAjar: sbj.kelasAjar || (state.classes || []).map((c) => c.nama),
        });
      }
    });

    return {
      ...sbj,
      nama: currentName,
      guruPengampu: mergedGuru,
      guruAssignments: newAssignments,
    };
  });

  // 5. Normalize all feedbacks to ensure mataPelajaran is always a valid string array
  const updatedFeedbacks = (state.feedbacks || []).map((fb) => {
    let safeMapel: string[] = [];
    if (Array.isArray(fb.mataPelajaran)) {
      safeMapel = fb.mataPelajaran.map(String).map((s) => s.trim()).filter(Boolean);
    } else if (typeof fb.mataPelajaran === 'string' && (fb.mataPelajaran as string).trim()) {
      safeMapel = [(fb.mataPelajaran as string).trim()];
    }
    return {
      ...fb,
      mataPelajaran: safeMapel,
    };
  });

  return {
    ...state,
    subjects: finalSubjects,
    teachers: updatedTeachers,
    assessments: updatedAssessments,
    feedbacks: updatedFeedbacks,
  };
}

/**
 * Universal safe formatter for mataPelajaran that handles arrays, strings, null, and undefined.
 * Guarantees NO runtime `.join is not a function` error.
 */
export function formatMataPelajaran(mataPelajaran: unknown): string {
  if (!mataPelajaran) return '-';
  if (Array.isArray(mataPelajaran)) {
    const valid = mataPelajaran
      .map(String)
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    return valid.length > 0 ? valid.join(', ') : '-';
  }
  if (typeof mataPelajaran === 'string') {
    const trimmed = mataPelajaran.trim();
    return trimmed.length > 0 ? trimmed : '-';
  }
  return '-';
}

