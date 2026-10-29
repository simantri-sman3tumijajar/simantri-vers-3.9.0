import { AppState, Student, ClassItem, SubjectItem, Teacher, Assessment } from '../types';

export const cleanCanonical = (str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const isValidRealNisn = (val: string) => {
  if (!val) return false;
  const clean = val.trim();
  if (clean === '' || clean === '-' || clean === '0' || clean.length < 8) return false;
  if (/^0+$/.test(clean) || clean.startsWith('0087412')) return false;
  return /^\d{8,12}$/.test(clean);
};

export const levDistance = (a: string, b: string): number => {
  if (!a || !b) return (a || b).length;
  if (a === b) return 0;
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
};

/**
 * Merges two submissions intelligently, preserving evaluations and scans.
 */
function mergeSubmissions(existing: any, incoming: any): any {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const existingImgs = Array.isArray(existing.scannedImages) && existing.scannedImages.length > 0
    ? existing.scannedImages
    : existing.scannedImage
    ? [existing.scannedImage]
    : [];

  const incomingImgs = Array.isArray(incoming.scannedImages) && incoming.scannedImages.length > 0
    ? incoming.scannedImages
    : incoming.scannedImage
    ? [incoming.scannedImage]
    : [];

  const mergedImgs: string[] = [];
  const imgSet = new Set<string>();
  existingImgs.forEach((img: any) => {
    if (img && typeof img === 'string' && !imgSet.has(img)) {
      imgSet.add(img);
      mergedImgs.push(img);
    }
  });
  incomingImgs.forEach((img: any) => {
    if (img && typeof img === 'string' && !imgSet.has(img)) {
      imgSet.add(img);
      mergedImgs.push(img);
    }
  });

  const isExistingGraded = !!(
    existing.statusKoreksi?.startsWith('Sudah Dikoreksi') ||
    existing.statusKoreksi?.startsWith('Sudah Diverifikasi') ||
    (existing.nilaiAkhir !== undefined && existing.nilaiAkhir > 0 && !existing.statusKoreksi?.includes('Draf'))
  );
  const isIncomingGraded = !!(
    incoming.statusKoreksi?.startsWith('Sudah Dikoreksi') ||
    incoming.statusKoreksi?.startsWith('Sudah Diverifikasi') ||
    (incoming.nilaiAkhir !== undefined && incoming.nilaiAkhir > 0 && !incoming.statusKoreksi?.includes('Draf'))
  );

  let baseObj = incoming;
  if (isExistingGraded && !isIncomingGraded) {
    baseObj = existing;
  }

  // Once a submission is graded and scored, purge bulky photo sheets to prevent storage overflow
  const isGradedOverall = isExistingGraded || isIncomingGraded || (baseObj.nilaiAkhir !== undefined && baseObj.nilaiAkhir > 0);

  return {
    ...existing,
    ...incoming,
    ...baseObj,
    scannedImages: isGradedOverall ? [] : mergedImgs,
    scannedImage: isGradedOverall ? undefined : (mergedImgs[0] || incoming.scannedImage || existing.scannedImage || undefined),
  };
}

/**
 * Deduplicates and guarantees strict consistency across AppState:
 * - Deduplicates students by (Name + Kelas, NISN, ID)
 * - Deduplicates assessments by (Mapel, Kelas, Jenis, Semester, Tahun)
 * - Deduplicates classes by canonical name and recalculates exact totalSiswa
 * - Deduplicates subjects and teachers
 * - Fixes all submission studentId references
 */
export function deduplicateAppState(state: AppState): AppState {
  if (!state || typeof state !== 'object') return state;

  const deletedSet = new Set<string>();
  if (Array.isArray(state.deletedIds)) {
    state.deletedIds.forEach((id) => id && typeof id === 'string' && deletedSet.add(id));
  }

  // 1. Sanitize & Deduplicate Assessments
  const usedStudentIds = new Set<string>();
  const rawAssessments = Array.isArray(state.assessments) ? state.assessments : [];
  const assessmentMap = new Map<string, Assessment>();

  rawAssessments.forEach((a, idx) => {
    if (!a || typeof a !== 'object' || !a.mataPelajaran || deletedSet.has(a.id)) return;
    const safeId = a.id || `asm-${Date.now()}-${idx}`;

    // Deduplicate submissions inside this assessment by student identifier (strictly 1 submission per student)
    const subMap = new Map<string, any>();
    (a.submissions || []).forEach((s) => {
      if (!s || typeof s !== 'object') return;
      // Key by studentId or canonical studentName first to avoid duplicate ghost drafts
      const subKey = s.studentId || (s.studentName ? cleanCanonical(s.studentName) : s.id);
      if (subKey) {
        // Auto-heal submissions that were graded or have scores but remained in draft status
        const isGradedWithScore = s.nilaiAkhir !== undefined && s.nilaiAkhir > 0;
        const normalizedSub = isGradedWithScore && (s.statusKoreksi?.includes('Draf') || s.statusKoreksi?.includes('Draft') || s.statusKoreksi?.includes('Citra Terunggah'))
          ? {
              ...s,
              statusKoreksi: 'Sudah Dikoreksi (Tuntas Dinilai)',
              scannedImages: [],
              scannedImage: undefined,
            }
          : s;

        if (!subMap.has(subKey)) {
          subMap.set(subKey, normalizedSub);
        } else {
          const ex = subMap.get(subKey);
          subMap.set(subKey, mergeSubmissions(ex, normalizedSub));
        }
      }
    });

    const safeAssessment: Assessment = {
      ...a,
      id: safeId,
      submissions: Array.from(subMap.values()),
    };

    const natKey = a.id
      ? `id_${a.id}`
      : `${cleanCanonical(a.mataPelajaran)}___${cleanCanonical(a.kelas)}___${(a.jenis || 'ASTS').toUpperCase()}___${cleanCanonical(a.semester || 'ganjil')}___${cleanCanonical(a.tahunAjaran || '2026/2027')}`;

    if (!assessmentMap.has(natKey)) {
      assessmentMap.set(natKey, safeAssessment);
    } else {
      const exAsm = assessmentMap.get(natKey)!;
      const mergedSubMap = new Map<string, any>();
      (exAsm.submissions || []).forEach((s) => {
        const k = s.studentId || (s.studentName ? cleanCanonical(s.studentName) : s.id);
        if (k) mergedSubMap.set(k, s);
      });
      (safeAssessment.submissions || []).forEach((s) => {
        const k = s.studentId || (s.studentName ? cleanCanonical(s.studentName) : s.id);
        if (k) {
          const exSub = mergedSubMap.get(k);
          mergedSubMap.set(k, exSub ? mergeSubmissions(exSub, s) : s);
        }
      });
      const preferEx = (exAsm.submissions?.length || 0) >= (safeAssessment.submissions?.length || 0);
      assessmentMap.set(natKey, {
        ...safeAssessment,
        ...exAsm,
        id: preferEx ? exAsm.id : safeAssessment.id,
        judul: preferEx ? exAsm.judul : safeAssessment.judul,
        submissions: Array.from(mergedSubMap.values()),
      });
    }
  });

  const cleanAssessments = Array.from(assessmentMap.values());
  cleanAssessments.forEach((a) => {
    (a.submissions || []).forEach((s) => {
      if (s && s.studentId) usedStudentIds.add(s.studentId);
    });
  });

  // 2. Sanitize & Deduplicate Students strictly (Preserve all uploaded JSON student records)
  const filteredStudents = (Array.isArray(state.students) ? state.students : []).filter(
    (s) => s && s.nama && !deletedSet.has(s.id)
  );

  const sortedRaw = [...filteredStudents].sort((a, b) => {
    const aUsed = usedStudentIds.has(a?.id) ? 1 : 0;
    const bUsed = usedStudentIds.has(b?.id) ? 1 : 0;
    if (aUsed !== bUsed) return bUsed - aUsed;
    const aClean = (a?.id || '').includes('1791421') ? 1 : 0;
    const bClean = (b?.id || '').includes('1791421') ? 1 : 0;
    if (aClean !== bClean) return bClean - aClean;
    return (b?.id || '').localeCompare(a?.id || '');
  });

  const studentMap = new Map<string, Student>();
  const idAliasMap = new Map<string, string>();
  const studentKeyToId = new Map<string, string>();

  sortedRaw.forEach((s, idx) => {
    if (!s || typeof s !== 'object' || !s.nama || !s.nama.trim()) return;
    const cleanNama = s.nama.trim().toUpperCase();
    const cleanKelas = (s.kelas || 'X.1').trim();
    const cleanNisn = (s.nisn || '-').trim();
    const safeId = s.id || `std-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`;

    const nameClassKey = `nc_${cleanCanonical(cleanNama)}_${cleanCanonical(cleanKelas)}`;
    const nisnKey = isValidRealNisn(cleanNisn) ? `nisn_${cleanNisn}` : null;

    let matchedId = studentKeyToId.get(safeId) ||
                    (nisnKey ? studentKeyToId.get(nisnKey) : null) ||
                    studentKeyToId.get(nameClassKey);

    const safeStudent: Student = {
      ...s,
      nama: cleanNama,
      nisn: cleanNisn,
      kelas: cleanKelas,
      noUrut: typeof s.noUrut === 'number' && s.noUrut > 0 ? s.noUrut : idx + 1,
      jenisKelamin: (s.jenisKelamin as 'L' | 'P') || 'L',
    };

    if (!matchedId) {
      matchedId = safeId;
      safeStudent.id = matchedId;
      studentMap.set(matchedId, safeStudent);
      studentKeyToId.set(safeId, matchedId);
      studentKeyToId.set(nameClassKey, matchedId);
      if (nisnKey) studentKeyToId.set(nisnKey, matchedId);
      idAliasMap.set(safeId, matchedId);
    } else {
      idAliasMap.set(safeId, matchedId);
      const ex = studentMap.get(matchedId);
      if (ex) {
        studentMap.set(matchedId, {
          ...safeStudent,
          ...ex,
          nisn: (!ex.nisn || ex.nisn === '-') && cleanNisn !== '-' ? cleanNisn : ex.nisn,
          id: matchedId,
        });
      }
    }
  });

  const cleanStudents = Array.from(studentMap.values());

  // Re-index noUrut cleanly 1..N per class
  const classStudentGroups: { [k: string]: Student[] } = {};
  cleanStudents.forEach((s) => {
    const k = cleanCanonical(s.kelas);
    classStudentGroups[k] = classStudentGroups[k] || [];
    classStudentGroups[k].push(s);
  });
  Object.keys(classStudentGroups).forEach((k) => {
    classStudentGroups[k].sort((a, b) => {
      if (typeof a.noUrut === 'number' && typeof b.noUrut === 'number' && a.noUrut !== b.noUrut) {
        return a.noUrut - b.noUrut;
      }
      return a.nama.localeCompare(b.nama);
    });
    classStudentGroups[k].forEach((s, i) => {
      s.noUrut = i + 1;
    });
  });

  // Remap submissions studentId to canonical student IDs
  cleanAssessments.forEach((a) => {
    (a.submissions || []).forEach((sub) => {
      let canonicalId = idAliasMap.get(sub.studentId) || sub.studentId;
      if (!studentMap.has(canonicalId)) {
        const name = cleanCanonical(sub.studentName || sub.namaSiswa || '');
        const targetInClass = cleanStudents.find((st) =>
          cleanCanonical(st.kelas) === cleanCanonical(a.kelas) &&
          (cleanCanonical(st.nama) === name || levDistance(cleanCanonical(st.nama), name) <= 2)
        );
        if (targetInClass) {
          canonicalId = targetInClass.id;
        }
      }
      if (studentMap.has(canonicalId)) {
        const canonicalStudent = studentMap.get(canonicalId)!;
        sub.studentId = canonicalId;
        sub.studentName = canonicalStudent.nama;
        sub.namaSiswa = canonicalStudent.nama;
        sub.kelas = canonicalStudent.kelas;
        sub.noUrut = canonicalStudent.noUrut;
      }
    });
  });

  // 3. Deduplicate Classes and recalculate exact totalSiswa
  const classMap = new Map<string, ClassItem>();
  const rawClasses = Array.isArray(state.classes) ? state.classes : [];
  rawClasses.forEach((c, idx) => {
    if (!c || typeof c !== 'object' || !c.nama || !c.nama.trim() || deletedSet.has(c.id)) return;
    const cleanNama = c.nama.trim();
    const canon = cleanCanonical(cleanNama);
    const studentCount = cleanStudents.filter((s) => cleanCanonical(s.kelas) === canon).length;
    const safeClass: ClassItem = {
      id: c.id || `cls-${Date.now()}-${idx}`,
      nama: cleanNama,
      fase: c.fase || (cleanNama.startsWith('X.') ? 'Fase E' : 'Fase F'),
      waliKelas: c.waliKelas || '-',
      totalSiswa: studentCount,
    };
    if (!classMap.has(canon)) {
      classMap.set(canon, safeClass);
    } else {
      const ex = classMap.get(canon)!;
      classMap.set(canon, { ...ex, ...safeClass, id: ex.id, totalSiswa: studentCount });
    }
  });

  // 4. Deduplicate Subjects
  const subjectMap = new Map<string, SubjectItem>();
  const rawSubjects = Array.isArray(state.subjects) ? state.subjects : [];
  rawSubjects.forEach((s, idx) => {
    if (!s || typeof s !== 'object' || !s.nama || !s.nama.trim() || deletedSet.has(s.id)) return;
    const canon = cleanCanonical(s.nama);
    const safeSub: SubjectItem = {
      ...s,
      id: s.id || `sbj-${Date.now()}-${idx}`,
      nama: s.nama.trim(),
    };
    if (!subjectMap.has(canon)) {
      subjectMap.set(canon, safeSub);
    } else {
      const ex = subjectMap.get(canon)!;
      subjectMap.set(canon, { ...ex, ...safeSub, id: ex.id });
    }
  });

  // 5. Deduplicate Teachers
  const teacherMap = new Map<string, Teacher>();
  const rawTeachers = Array.isArray(state.teachers) ? state.teachers : [];
  rawTeachers.forEach((t, idx) => {
    if (!t || typeof t !== 'object') return;
    const cleanNama = (t.nama || '').trim();
    const cleanUser = (t.username || '').trim().toLowerCase();
    const cleanNip = (t.nip || '').trim();
    if (deletedSet.has(t.id) && t.id !== 'tch-admin') return;

    const key = t.id === 'tch-admin' || cleanUser === 'adiel' || t.role === 'admin'
      ? 'admin_main'
      : (cleanNip && cleanNip !== '-' ? `nip_${cleanNip}` : `name_${cleanCanonical(cleanNama)}`);

    let safeTeacher: Teacher = {
      ...t,
      id: t.id || `tch-${Date.now()}-${idx}`,
      nama: cleanNama || 'Guru',
      username: cleanUser || 'guru',
      nip: cleanNip,
      role: t.role || 'guru',
      status: t.status || 'online',
    };

    if (key === 'admin_main') {
      safeTeacher = {
        ...safeTeacher,
        id: 'tch-admin',
        username: 'adiel',
        nama: safeTeacher.nama || 'Adiel (Administrator)',
        role: 'admin',
      };
    }

    if (!teacherMap.has(key)) {
      teacherMap.set(key, safeTeacher);
    } else {
      const ex = teacherMap.get(key)!;
      teacherMap.set(key, { ...ex, ...safeTeacher, id: ex.id });
    }
  });

  return {
    ...state,
    students: cleanStudents,
    assessments: cleanAssessments,
    classes: Array.from(classMap.values()),
    subjects: Array.from(subjectMap.values()),
    teachers: Array.from(teacherMap.values()),
    deletedIds: Array.from(deletedSet).slice(-1000),
  };
}
