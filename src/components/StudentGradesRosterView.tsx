import React, { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Student, Assessment, Submission, SchoolInfo } from '../types';
import { formatIndonesianDate } from '../utils/dateUtils';
import {
  Award,
  Trophy,
  Filter,
  Search,
  Download,
  Printer,
  Eye,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowUpDown,
  Calculator,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  CheckSquare,
  Square,
  Users,
  BookOpen,
  GraduationCap,
  Calendar,
  Layers,
  ChevronDown,
  X,
  FileText,
  Sparkles,
  Settings,
  Edit,
  Trash2,
  Save,
  UploadCloud,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLanguage } from '../context/LanguageContext';
import { drawOfficialKop, F4_PAPER_WIDTH_MM, F4_PAPER_HEIGHT_MM, MARGIN_LEFT_MM, RIGHT_EDGE_MM, PRINT_WIDTH_MM, CENTER_X_MM } from '../utils/pdfExport';
import { formatAcademicTitles, getKKTPKategori, KKTP_INTERVALS } from '../utils/kktpHelper';
import { isClassMatch, getAssessmentClassesList } from '../utils/classHelper';
import { formatMataPelajaran } from '../utils/subjectNormalization';
import { AuthenticProofModal } from './AuthenticProofModal';
import { TeacherPenaltyModal } from './TeacherPenaltyModal';
import { UploadRaporSTSModal } from './UploadRaporSTSModal';
import { PaginationControls } from './PaginationControls';

type ClassificationMode = 'by-class' | 'by-subject' | 'by-teacher' | 'all-classes' | 'by-assessment-type';
type SortField = 'rank-asc' | 'rank-desc' | 'avg-desc' | 'avg-asc' | 'name-asc' | 'name-desc' | 'no-asc' | 'class-asc';

interface GradeRow {
  student: Student;
  rank: number;
  scores: Record<string, number | null>; // key -> score
  totalScore: number;
  filledCount: number;
  averageScore: number;
  tuntas: boolean;
  bestProof?: { submission: Submission; assessment: Assessment } | null;
}

export const StudentGradesRosterView: React.FC = () => {
  const { state, currentUser, saveAssessment, deleteSubmission, showToast } = useApp();
  const { t } = useLanguage();

  if (!state || !currentUser) return null;

  const canManageAll =
    currentUser.role === 'admin' ||
    currentUser.role === 'kepala_sekolah' ||
    currentUser.role === 'operator';
  const isAdmin = currentUser.role === 'admin';
  const school = state.schoolInfo;

  // Master lists
  const availableClasses = useMemo(() => {
    return state.classes.map((c) => c.nama).sort();
  }, [state.classes]);

  const availableSubjects = useMemo(() => {
    if (canManageAll) {
      return state.subjects.map((s) => s.nama).sort();
    }
    
    // Double lookup for Admin-managed teacher subjects
    const subs = new Set<string>();
    if (Array.isArray(currentUser.mataPelajaran)) {
      currentUser.mataPelajaran.forEach((m) => {
        if (m && m !== 'Semua Mata Pelajaran') {
          subs.add(m.trim());
        }
      });
    }
    if (Array.isArray(state.subjects)) {
      state.subjects.forEach((sbj) => {
        if (
          sbj.guruAssignments?.some(
            (ga) =>
              ga.teacherId === currentUser.id ||
              ga.teacherName.toLowerCase().trim() === currentUser.nama.toLowerCase().trim()
          )
        ) {
          subs.add(sbj.nama.trim());
        }
      });
    }
    
    return Array.from(subs).sort();
  }, [state.subjects, canManageAll, currentUser]);

  const availableTeachers = useMemo(() => {
    if (canManageAll) {
      return state.teachers;
    }
    return state.teachers.filter((t) => t.id === currentUser.id);
  }, [state.teachers, canManageAll, currentUser]);

  // Classification State
  const [mode, setMode] = useState<ClassificationMode>('by-class');
  const [selectedClass, setSelectedClass] = useState<string>(() => availableClasses[0] || 'X.1');
  const [selectedSubject, setSelectedSubject] = useState<string>(() => availableSubjects[0] || 'Matematika');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>(() => availableTeachers[0]?.id || currentUser.id);
  const [selectedFase, setSelectedFase] = useState<string>('ALL');
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<'ALL' | 'ASTS' | 'ASAS'>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<'ALL' | 'Ganjil' | 'Genap'>(school.semesterAktif || 'Ganjil');

  // Search & Sort State
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortField>('avg-desc');

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedProofData, setSelectedProofData] = useState<{ submission: Submission; assessment: Assessment; student: Student } | null>(null);

  // Upload Rapor STS Modal State (Khusus Admin & Operator)
  const [isUploadSTSModalOpen, setIsUploadSTSModalOpen] = useState(false);

  const handleUploadSTSSuccess = useCallback((subject: string, className: string) => {
    setSelectedSubject(subject);
    setSelectedClass(className);
    setMode('by-class');
  }, []);

  // Grade Editing State
  const [selectedStudentForGrades, setSelectedStudentForGrades] = useState<Student | null>(null);
  const [editingAssessmentId, setEditingAssessmentId] = useState<string | null>(null);
  const [editingScoreInput, setEditingScoreInput] = useState<string>('');

  // Multi-student penalty selection
  const [selectedStudentIdsForPenalty, setSelectedStudentIdsForPenalty] = useState<Set<string>>(new Set());
  const [isRosterPenaltyModalOpen, setIsRosterPenaltyModalOpen] = useState<boolean>(false);

  // Pagination State
  const [rosterPage, setRosterPage] = useState<number>(1);
  const [rosterPageSize, setRosterPageSize] = useState<number>(25);

  const handleApplyRosterTeacherPenalty = useCallback((updatedList: Array<{
    studentId: string;
    nilaiMurni: number;
    aiPenaltyPercent: number;
    aiPenaltyDeduction: number;
    nilaiAkhir: number;
    tuntas: boolean;
    aiExplanation: string;
  }>) => {
    if (!state.assessments) return;

    // Iterate over matching assessments
    state.assessments.forEach((asm) => {
      let isAsmModified = false;
      const nextSubmissions = [...asm.submissions];

      updatedList.forEach((item) => {
        const std = state.students.find((s) => s.id === item.studentId);
        const subIdx = nextSubmissions.findIndex(
          (s) => s.studentId === item.studentId || (std && s.studentName === std.nama)
        );

        if (subIdx >= 0) {
          const existing = nextSubmissions[subIdx];
          nextSubmissions[subIdx] = {
            ...existing,
            nilaiMurni: item.nilaiMurni,
            aiPenaltyPercent: item.aiPenaltyPercent,
            aiPenaltyDeduction: item.aiPenaltyDeduction,
            nilaiAkhir: item.nilaiAkhir,
            tuntas: item.tuntas,
            aiExplanation: item.aiExplanation,
            statusKoreksi: 'Sudah Diverifikasi (Penalti Kebijakan Guru)',
          };
          isAsmModified = true;
        }
      });

      if (isAsmModified) {
        saveAssessment({
          ...asm,
          submissions: nextSubmissions,
        });
      }
    });

    setSelectedStudentIdsForPenalty(new Set());
    showToast(`Kebijakan pengurangan nilai berhasil diterapkan pada ${updatedList.length} siswa.`, 'success');
  }, [state.assessments, state.students, saveAssessment, showToast]);

  // Active Teacher Object (if relevant)
  const currentSelectedTeacher = useMemo(() => {
    return state.teachers.find((t) => t.id === selectedTeacherId) || currentUser;
  }, [state.teachers, selectedTeacherId, currentUser]);

  const activeTargetAssessment = useMemo(() => {
    if (!state.assessments || state.assessments.length === 0) return null;
    return (
      state.assessments.find(
        (a) => a.mataPelajaran === selectedSubject && isClassMatch(a.kelas, selectedClass)
      ) ||
      state.assessments.find((a) => a.mataPelajaran === selectedSubject) ||
      state.assessments[0]
    );
  }, [state.assessments, selectedSubject, selectedClass]);

  // List of assessments matching student's class and assigned teacher subject
  const studentAssessments = useMemo(() => {
    if (!selectedStudentForGrades || !state.assessments) return [];
    return state.assessments.filter((asm) => {
      const matchYear = asm.tahunAjaran === school.tahunAjaranAktif;
      const matchClass = isClassMatch(asm.kelas, selectedStudentForGrades.kelas);
      
      const isTeacherAdmin = canManageAll;
      const canEditSubject = isTeacherAdmin || availableSubjects.some(
        (s) => s.toLowerCase() === asm.mataPelajaran.toLowerCase()
      );
      
      return matchYear && matchClass && canEditSubject;
    });
  }, [selectedStudentForGrades, state.assessments, school.tahunAjaranAktif, currentUser, availableSubjects]);

  const handleUpdateScore = async (asmId: string, student: Student, newScore: number) => {
    if (isNaN(newScore) || newScore < 0 || newScore > 100) {
      showToast('Input Salah', 'Nilai harus berupa angka antara 0 dan 100.', 'warning');
      return;
    }

    const targetAsm = state.assessments.find((a) => a.id === asmId);
    if (!targetAsm) return;

    const existingSubIdx = (targetAsm.submissions || []).findIndex(
      (s) => s.studentId === student.id || s.studentName === student.nama
    );

    let updatedSubmissions = [...(targetAsm.submissions || [])];
    
    if (existingSubIdx >= 0) {
      const existingSub = updatedSubmissions[existingSubIdx];
      updatedSubmissions[existingSubIdx] = {
        ...existingSub,
        nilaiAkhir: newScore,
        nilaiMurni: newScore,
        statusKoreksi: 'Sudah Dikoreksi (Koreksi Guru)',
        waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
      };
    } else {
      updatedSubmissions.push({
        id: `sub-edit-${Date.now()}`,
        studentId: student.id,
        studentName: student.nama,
        nisn: student.nisn,
        kelas: student.kelas,
        nilaiAkhir: newScore,
        nilaiMurni: newScore,
        tuntas: newScore >= (state.subjects.find((s) => s.nama.toLowerCase() === targetAsm.mataPelajaran.toLowerCase())?.kktp || 75),
        statusKoreksi: 'Sudah Dikoreksi (Koreksi Guru)',
        waktuKoreksi: new Date().toISOString().replace('T', ' ').substring(0, 16),
        capaianKompetensi: 'Nilai diinput secara manual oleh Guru Mapel.',
      });
    }

    const updatedAssessment: Assessment = {
      ...targetAsm,
      submissions: updatedSubmissions,
    };

    setEditingAssessmentId(null);
    showToast('Berhasil', `Nilai ${student.nama} berhasil diperbarui menjadi ${newScore}.`, 'success');
    saveAssessment(updatedAssessment);
  };

  const handleDeleteScore = async (asmId: string, studentId: string, studentName: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus/mereset nilai siswa ${studentName}?`)) {
      return;
    }

    const success = await deleteSubmission(asmId, studentId);
    if (success) {
      showToast('Berhasil Dihapus', `Nilai ${studentName} berhasil direset/dihapus.`, 'success');
    } else {
      showToast('Gagal', 'Gagal menghapus nilai siswa.', 'error');
    }
  };

  // Determine dynamic columns based on Classification Mode
  const { columnKeys, columnLabels } = useMemo(() => {
    if (mode === 'by-subject') {
      // Columns are Assessments (e.g. ASTS, ASAS) for that subject
      const relatedAssessments = state.assessments.filter((a) => {
        const matchYear = a.tahunAjaran === school.tahunAjaranAktif;
        const matchSubj = a.mataPelajaran.toLowerCase() === selectedSubject.toLowerCase();
        const matchSem = selectedSemester === 'ALL' || a.semester === selectedSemester;
        return matchYear && matchSubj && matchSem;
      });

      // Distinct assessment tags/types
      const hasASTS = relatedAssessments.some((a) => a.jenis === 'ASTS');
      const hasASAS = relatedAssessments.some((a) => a.jenis === 'ASAS');

      const keys: string[] = [];
      const labels: Record<string, string> = {};

      if (hasASTS || !hasASAS) {
        keys.push('ASTS');
        labels['ASTS'] = `Nilai ASTS (Essay)`;
      }
      if (hasASAS || !hasASTS) {
        keys.push('ASAS');
        labels['ASAS'] = `Nilai ASAS (PG)`;
      }
      return { columnKeys: keys, columnLabels: labels };
    }

    if (mode === 'by-class') {
      // Columns are Subjects present in that class assessments or school subjects
      const classAssessments = state.assessments.filter((a) => {
        const matchYear = a.tahunAjaran === school.tahunAjaranAktif;
        const matchCls = isClassMatch(a.kelas, selectedClass);
        const matchSem = selectedSemester === 'ALL' || a.semester === selectedSemester;
        const matchType = selectedAssessmentType === 'ALL' || a.jenis === selectedAssessmentType;
        if (!isAdmin) {
          const isMySubj = availableSubjects.some((m) => m.toLowerCase() === a.mataPelajaran.toLowerCase());
          return matchYear && matchCls && matchSem && matchType && isMySubj;
        }
        return matchYear && matchCls && matchSem && matchType;
      });

      // Gather unique subjects
      let subjs = Array.from(new Set(classAssessments.map((a) => a.mataPelajaran)));
      if (subjs.length === 0) {
        subjs = isAdmin ? state.subjects.map((s) => s.nama).slice(0, 6) : availableSubjects;
      }

      const labels: Record<string, string> = {};
      subjs.forEach((s) => {
        labels[s] = s;
      });
      return { columnKeys: subjs, columnLabels: labels };
    }

    if (mode === 'by-teacher') {
      // Columns are subjects taught by this teacher
      const teacherMapels = currentSelectedTeacher.mataPelajaran.filter((m) => m !== 'Semua Mata Pelajaran');
      const subjs = teacherMapels.length > 0 ? teacherMapels : ['Mata Pelajaran Utama'];

      const labels: Record<string, string> = {};
      subjs.forEach((s) => {
        labels[s] = s;
      });
      return { columnKeys: subjs, columnLabels: labels };
    }

    if (mode === 'by-assessment-type') {
      // Columns are subjects for that assessment type
      const targetAssessments = state.assessments.filter((a) => {
        const matchYear = a.tahunAjaran === school.tahunAjaranAktif;
        const matchType = selectedAssessmentType === 'ALL' || a.jenis === selectedAssessmentType;
        const matchSem = selectedSemester === 'ALL' || a.semester === selectedSemester;
        if (!isAdmin) {
          const isMySubj = availableSubjects.some((m) => m.toLowerCase() === a.mataPelajaran.toLowerCase());
          return matchYear && matchType && matchSem && isMySubj;
        }
        return matchYear && matchType && matchSem;
      });

      let subjs = Array.from(new Set(targetAssessments.map((a) => a.mataPelajaran)));
      if (subjs.length === 0) {
        subjs = isAdmin ? state.subjects.map((s) => s.nama).slice(0, 6) : availableSubjects;
      }
      const labels: Record<string, string> = {};
      subjs.forEach((s) => {
        labels[s] = s;
      });
      return { columnKeys: subjs, columnLabels: labels };
    }

    // mode === 'all-classes'
    // Columns are the main subjects of the school
    const subjs = isAdmin
      ? state.subjects.map((s) => s.nama).slice(0, 8)
      : availableSubjects;

    const labels: Record<string, string> = {};
    subjs.forEach((s) => {
      labels[s] = s;
    });
    return { columnKeys: subjs, columnLabels: labels };
  }, [
    mode,
    selectedSubject,
    selectedClass,
    selectedTeacherId,
    selectedAssessmentType,
    selectedSemester,
    state.assessments,
    state.subjects,
    isAdmin,
    availableSubjects,
    currentSelectedTeacher,
  ]);

  const cleanCanonical = useCallback((str: string) => (str || '').toLowerCase().replace(/[^a-z0-9]/g, ''), []);

  // Determine students in scope
  const scopedStudents = useMemo(() => {
    let list: Student[] = [];

    if (mode === 'by-class') {
      const targetClass = cleanCanonical(selectedClass);
      list = state.students.filter((s) => cleanCanonical(s.kelas) === targetClass || isClassMatch(selectedClass, s.kelas));
    } else if (mode === 'all-classes') {
      if (selectedFase === 'ALL') {
        list = state.students;
      } else {
        const classesInFase = new Set(state.classes.filter((c) => c.fase === selectedFase).map((c) => cleanCanonical(c.nama)));
        list = state.students.filter((s) => classesInFase.has(cleanCanonical(s.kelas)));
      }
    } else if (mode === 'by-subject') {
      // If by subject, show all students or filtered by class
      if (selectedClass !== 'ALL') {
        const targetClass = cleanCanonical(selectedClass);
        list = state.students.filter((s) => cleanCanonical(s.kelas) === targetClass || isClassMatch(selectedClass, s.kelas));
      } else {
        list = state.students;
      }
    } else if (mode === 'by-teacher') {
      // Students in classes taught by this teacher
      const teacherMapels = (currentSelectedTeacher.mataPelajaran || []).map((m) => m.toLowerCase().trim());
      const teacherAssessments = state.assessments.filter(
        (a) => a.tahunAjaran === school.tahunAjaranAktif && (teacherMapels.includes(a.mataPelajaran.toLowerCase().trim()) || a.guruPengampu?.toLowerCase() === currentSelectedTeacher.nama?.toLowerCase())
      );

      if (teacherAssessments.length > 0) {
        list = state.students.filter((s) => teacherAssessments.some((a) => isClassMatch(a.kelas, s.kelas)));
      } else {
        list = state.students;
      }
    } else {
      // by-assessment-type
      if (selectedClass !== 'ALL') {
        list = state.students.filter((s) => isClassMatch(selectedClass, s.kelas));
      } else {
        list = state.students;
      }
    }

    return list;
  }, [
    mode,
    selectedClass,
    selectedFase,
    state.students,
    state.classes,
    state.assessments,
    currentSelectedTeacher,
  ]);

  // Active subject object if in by-subject mode
  const currentSubjectObj = useMemo(() => {
    return state.subjects.find(
      (s) => s.nama.toLowerCase() === selectedSubject.toLowerCase() || s.id === selectedSubject
    );
  }, [state.subjects, selectedSubject]);

  // Compute table rows with mathematically accurate aggregation
  const calculatedRows = useMemo(() => {
    const kktpStd = mode === 'by-subject' && currentSubjectObj?.kktp ? currentSubjectObj.kktp : 75;

    // Pre-index assessments & submissions for fast lookup
    // Key: studentId or studentName + subject + jenis
    const subMap: Record<string, number> = {};
    const proofMap: Record<string, { submission: Submission; assessment: Assessment }> = {};

    const cleanNum = (str?: string) => (str || '').replace(/[^0-9]/g, '');
    const activeYearClean = cleanNum(school.tahunAjaranAktif);

    const normalizeSem = (s?: string) => {
      if (!s) return '';
      const l = s.toLowerCase().trim();
      if (l === '1' || l.includes('ganjil')) return 'ganjil';
      if (l === '2' || l.includes('genap')) return 'genap';
      return l;
    };

    state.assessments.forEach((asm) => {
      const asmYearClean = cleanNum(asm.tahunAjaran);
      const yearMatch = !activeYearClean || !asmYearClean || asmYearClean === activeYearClean || asm.tahunAjaran === school.tahunAjaranAktif || cleanCanonical(asm.tahunAjaran) === cleanCanonical(school.tahunAjaranAktif);
      const semMatch = selectedSemester === 'ALL' || !asm.semester || normalizeSem(asm.semester) === normalizeSem(selectedSemester);
      if (!yearMatch || !semMatch) return;

      asm.submissions?.forEach((sub) => {
        const rawScore = typeof sub.nilaiAkhir === 'number' ? sub.nilaiAkhir : Number(sub.nilaiAkhir || 0);
        const score = isNaN(rawScore) ? 0 : rawScore;
        const isDraft = !!(sub.statusKoreksi?.includes('Draf') || sub.statusKoreksi?.includes('Draft') || sub.statusKoreksi?.includes('Citra Terunggah'));
        const isDraftZero = isDraft && score === 0;

        const candidateKeys = [
          sub.studentId,
          sub.studentName,
          sub.studentName ? sub.studentName.toLowerCase().trim() : '',
          sub.studentName ? cleanCanonical(sub.studentName) : '',
          sub.studentName ? cleanCanonical(sub.studentName.replace(/^[0-9]+[.\s-]+/, '')) : '',
        ].filter(Boolean) as string[];

        const mapelClean = (asm.mataPelajaran || '').toLowerCase().trim();
        const jenisClean = (asm.jenis || '').toUpperCase().trim();

        candidateKeys.forEach((key) => {
          // Key 1: by subject & jenis
          const k1 = `${key}_${mapelClean}_${jenisClean}`;
          // Key 2: by subject general (highest or latest)
          const genKey = `${key}_${mapelClean}`;
          // Key 3: by jenis only for the active subject
          const k3 = `${key}_${jenisClean}`;

          if (score > 0) {
            // Evaluated score: always register and retain highest score
            subMap[k1] = Math.max(subMap[k1] || 0, score);
            subMap[genKey] = Math.max(subMap[genKey] || 0, score);
            subMap[k3] = Math.max(subMap[k3] || 0, score);
          } else if (!isDraftZero) {
            // Truly evaluated score of 0
            if (subMap[k1] === undefined) subMap[k1] = 0;
            if (subMap[genKey] === undefined) subMap[genKey] = 0;
            if (subMap[k3] === undefined) subMap[k3] = 0;
          }

          // Store proof - prioritize authentic graded proof over zero-draft
          if (!proofMap[key] || (!isDraftZero && (proofMap[key].submission.statusKoreksi?.includes('Draf') || proofMap[key].submission.nilaiAkhir === 0))) {
            proofMap[key] = { submission: sub, assessment: asm };
          }
          if (mode === 'by-subject' && mapelClean === selectedSubject.toLowerCase().trim()) {
            if (!proofMap[`${key}_subj`] || (!isDraftZero && (proofMap[`${key}_subj`].submission.statusKoreksi?.includes('Draf') || proofMap[`${key}_subj`].submission.nilaiAkhir === 0))) {
              proofMap[`${key}_subj`] = { submission: sub, assessment: asm };
            }
          }
        });
      });
    });

    const rows: GradeRow[] = scopedStudents.map((std) => {
      const keysToLookup = [
        std.id,
        std.nama,
        std.nama ? std.nama.toLowerCase().trim() : '',
        std.nama ? cleanCanonical(std.nama) : '',
        std.nama ? cleanCanonical(std.nama.replace(/^[0-9]+[.\s-]+/, '')) : '',
      ].filter(Boolean) as string[];

      const scores: Record<string, number | null> = {};
      let total = 0;
      let filled = 0;

      columnKeys.forEach((colKey) => {
        let val: number | null = null;

        for (const k of keysToLookup) {
          if (mode === 'by-subject') {
            // colKey is 'ASTS' or 'ASAS'
            const specificVal = subMap[`${k}_${selectedSubject.toLowerCase().trim()}_${colKey.toUpperCase().trim()}`];
            if (specificVal !== undefined && specificVal !== null) {
              val = specificVal;
              break;
            }
          } else {
            // colKey is a subject name
            let specificVal = undefined;
            if (selectedAssessmentType !== 'ALL') {
              specificVal = subMap[`${k}_${colKey.toLowerCase().trim()}_${selectedAssessmentType.toUpperCase().trim()}`];
            }
            if (specificVal === undefined) {
              specificVal = subMap[`${k}_${colKey.toLowerCase().trim()}`];
            }
            if (specificVal !== undefined && specificVal !== null) {
              val = specificVal;
              break;
            }
          }
        }

        scores[colKey] = val;
        if (val !== null && !isNaN(val)) {
          total += val;
          filled += 1;
        }
      });

      // Mathematical exact calculation (average = total / filled count)
      const avg = filled > 0 ? Number((total / filled).toFixed(2)) : 0;
      const isTuntas = avg >= kktpStd && filled > 0;

      let bestProof: { submission: Submission; assessment: Assessment } | null = null;
      for (const k of keysToLookup) {
        if (mode === 'by-subject' && proofMap[`${k}_subj`]) {
          bestProof = proofMap[`${k}_subj`];
          break;
        } else if (proofMap[k]) {
          bestProof = proofMap[k];
          break;
        }
      }

      return {
        student: std,
        rank: 0, // Assigned after sorting
        scores,
        totalScore: Math.round(total * 100) / 100,
        filledCount: filled,
        averageScore: avg,
        tuntas: isTuntas,
        bestProof,
      };
    });

    // Sort initially by average score desc to calculate absolute ranks
    rows.sort((a, b) => {
      if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.student.nama.localeCompare(b.student.nama);
    });

    // Assign rank 1, 2, 3...
    rows.forEach((row, idx) => {
      row.rank = idx + 1;
    });

    return rows;
  }, [scopedStudents, columnKeys, mode, selectedSubject, selectedSemester, state.assessments, currentSubjectObj, cleanCanonical, school.tahunAjaranAktif]);

  // Apply Search & User Sorting
  const filteredAndSortedRows = useMemo(() => {
    let result = [...calculatedRows];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.student.nama.toLowerCase().includes(q) ||
          (r.student.nisn && r.student.nisn.includes(q)) ||
          r.student.kelas.toLowerCase().includes(q)
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortBy) {
        case 'rank-asc':
        case 'avg-desc':
          if (b.averageScore !== a.averageScore) return b.averageScore - a.averageScore;
          return b.totalScore - a.totalScore;
        case 'rank-desc':
        case 'avg-asc':
          if (a.averageScore !== b.averageScore) return a.averageScore - b.averageScore;
          return a.totalScore - b.totalScore;
        case 'name-asc':
          return a.student.nama.localeCompare(b.student.nama);
        case 'name-desc':
          return b.student.nama.localeCompare(a.student.nama);
        case 'no-asc':
          return (a.student.noUrut || 0) - (b.student.noUrut || 0);
        case 'class-asc':
          return a.student.kelas.localeCompare(b.student.kelas);
        default:
          return a.rank - b.rank;
      }
    });

    return result;
  }, [calculatedRows, searchQuery, sortBy]);

  const isRosterAll = rosterPageSize === -1 || rosterPageSize >= filteredAndSortedRows.length;
  const totalRosterPages = isRosterAll ? 1 : Math.ceil(filteredAndSortedRows.length / rosterPageSize) || 1;
  const safeRosterPage = isRosterAll ? 1 : Math.min(Math.max(1, rosterPage), totalRosterPages);
  const paginatedAndSortedRows = useMemo(() => {
    if (isRosterAll) return filteredAndSortedRows;
    const start = (safeRosterPage - 1) * rosterPageSize;
    return filteredAndSortedRows.slice(start, start + rosterPageSize);
  }, [filteredAndSortedRows, safeRosterPage, rosterPageSize, isRosterAll]);

  // Top 3 Podium Students (based on mathematical rank)
  const top3Students = useMemo(() => {
    return calculatedRows.slice(0, 3).filter((r) => r.filledCount > 0);
  }, [calculatedRows]);

  // Overall Statistics for current scope
  const summaryStats = useMemo(() => {
    const totalStudents = calculatedRows.length;
    const scoredStudents = calculatedRows.filter((r) => r.filledCount > 0);
    const scoredCount = scoredStudents.length;

    let sumAvg = 0;
    let tuntasCount = 0;

    scoredStudents.forEach((r) => {
      sumAvg += r.averageScore;
      if (r.tuntas) tuntasCount += 1;
    });

    const overallAvg = scoredCount > 0 ? Number((sumAvg / scoredCount).toFixed(2)) : 0;
    const tuntasPercent = scoredCount > 0 ? Math.round((tuntasCount / scoredCount) * 100) : 0;

    return {
      totalStudents,
      scoredCount,
      overallAvg,
      tuntasCount,
      tuntasPercent,
    };
  }, [calculatedRows]);

  // Export to Excel Function
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    const title1 = [`PEMERINTAH PROVINSI LAMPUNG`];
    const title2 = [`SMA NEGERI 3 TUMIJAJAR`];
    const title3 = [
      `DAFTAR REKAPITULASI NILAI DAN PERINGKAT HASIL ASESMEN PESERTA DIDIK`,
    ];
    const meta1 = [
      `Klasifikasi: ${
        mode === 'by-class'
          ? `Kelas ${selectedClass}`
          : mode === 'by-subject'
          ? `Mata Pelajaran ${selectedSubject}`
          : mode === 'by-teacher'
          ? `Guru Pengampu ${currentSelectedTeacher.nama}`
          : mode === 'all-classes'
          ? `Keseluruhan Kelas (${selectedFase})`
          : `Model Asesmen ${selectedAssessmentType}`
      }`,
      '',
      '',
      `Tahun Ajaran: ${school.tahunAjaranAktif} (${selectedSemester})`,
      '',
    ];
    const meta2 = [
      mode === 'by-subject' && currentSubjectObj?.kktp
        ? `KKTP Mapel: ${currentSubjectObj.kktp}`
        : 'KKTP: Ketentuan Per Mata Pelajaran',
      '',
      '',
      `Dicetak pada: ${new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`,
      '',
    ];
    const blankRow: any[] = [];

    // Header Row
    const headerRow: any[] = [
      'RANK',
      'NO. URUT',
      'NISN',
      'NAMA SISWA',
      'KELAS',
      'JK (L/P)',
      ...columnKeys.map((k) => columnLabels[k] || k),
      'TOTAL NILAI',
      'NILAI RATA-RATA',
      'STATUS KKTP',
    ];

    // Data Rows
    const dataRows = filteredAndSortedRows.map((r) => {
      const colValues = columnKeys.map((k) => (r.scores[k] !== null ? r.scores[k] : '-'));
      return [
        r.rank,
        r.student.noUrut || '-',
        r.student.nisn || '-',
        r.student.nama,
        r.student.kelas,
        r.student.jenisKelamin,
        ...colValues,
        r.totalScore,
        r.averageScore,
        r.tuntas ? 'Tuntas' : 'Belum Tuntas',
      ];
    });

    const signRow1 = ['', '', '', '', '', '', '', `Tumijajar, ${formatIndonesianDate(new Date())}`];
    const signRow2 = ['', '', '', 'Mengetahui,', '', '', '', 'Guru Pengampu / Wali Kelas,'];
    const signRow3 = ['', '', '', 'Kepala SMAN 3 Tumijajar,', '', '', '', ''];
    const signRow4 = ['', '', '', '', '', '', '', ''];
    const signRow5 = ['', '', '', '', '', '', '', ''];
    const signRow6 = [
      '',
      '',
      '',
      formatAcademicTitles(school.kepalaSekolah || 'Drs. Puji Astuti, M.Pd.'),
      '',
      '',
      '',
      formatAcademicTitles(mode === 'by-teacher' ? currentSelectedTeacher.nama : currentUser.nama),
    ];
    const signRow7 = [
      '',
      '',
      '',
      `NIP. ${school.nipKepalaSekolah || '-'}`,
      '',
      '',
      '',
      `NIP. ${mode === 'by-teacher' ? currentSelectedTeacher.nip || '-' : currentUser.nip || '-'}`,
    ];

    const wsData = [
      title1,
      title2,
      title3,
      blankRow,
      meta1,
      meta2,
      blankRow,
      headerRow,
      ...dataRows,
      blankRow,
      signRow1,
      signRow2,
      signRow3,
      signRow4,
      signRow5,
      signRow6,
      signRow7,
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge metadata & title cells across columns left-aligned so text is never cut off
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }, // Row 1 title
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } }, // Row 2 title
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } }, // Row 3 title
      { s: { r: 4, c: 0 }, e: { r: 4, c: 2 } }, // Row 5 Klasifikasi A5:C5 left-aligned
      { s: { r: 4, c: 3 }, e: { r: 4, c: 5 } }, // Row 5 TA D5:F5 left-aligned
      { s: { r: 5, c: 0 }, e: { r: 5, c: 2 } }, // Row 6 KKTP A6:C6 left-aligned
      { s: { r: 5, c: 3 }, e: { r: 5, c: 5 } }, // Row 6 Dicetak D6:F6 left-aligned
    ];

    // Auto column widths with dynamic padding to prevent text truncation
    ws['!cols'] = [
      { wch: 8 },  // Rank
      { wch: 9 },  // No
      { wch: 16 }, // NISN
      { wch: 38 }, // Nama
      { wch: 12 }, // Kelas
      { wch: 10 }, // JK
      ...columnKeys.map((k) => ({ wch: Math.max(18, (columnLabels[k] || k).length + 4) })),
      { wch: 16 }, // Total
      { wch: 18 }, // Rata-rata
      { wch: 16 }, // Status
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Daftar Nilai Siswa');
    const safeCls = (selectedClass || selectedFase || 'SEMUA').replace(/[^a-zA-Z0-9]/g, '_');
    const safeSbj = (selectedSubject || mode).replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(
      wb,
      `DAFTAR_NILAI_SMANTRI_${mode.toUpperCase()}_KELAS_${safeCls}_${safeSbj}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    showToast('Ekspor Berhasil', 'File Excel daftar nilai telah diunduh ke perangkat Anda.', 'success');
  };

  // Export to PDF Function (Official Landscape Standar F4 / Folio)
  const handleExportPDF = async () => {
    try {
      // Landscape F4: Width = 330.2 mm, Height = 215.9 mm
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [F4_PAPER_HEIGHT_MM, F4_PAPER_WIDTH_MM],
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginLeft = 20;
      const marginRight = 20;
      const centerPos = pageWidth / 2;
      const printWidth = pageWidth - marginLeft - marginRight;

      // Draw official kop surat aligned across the full landscape width
      const kopEndY = await drawOfficialKop(doc, school, 14, {
        pageWidth,
        marginLeft,
        marginRight,
      });

      let currentY = kopEndY + 3;

      // Document Title (Centered on Landscape Page)
      doc.setFont('times', 'bold');
      doc.setFontSize(12.5);
      doc.text('DAFTAR REKAPITULASI NILAI DAN PERINGKAT PESERTA DIDIK', centerPos, currentY, {
        align: 'center',
        maxWidth: printWidth,
      });
      currentY += 4.8;

      doc.setFontSize(10);
      doc.setFont('times', 'normal');
      const subTitle = `Tahun Ajaran ${school.tahunAjaranAktif} - Semester ${selectedSemester}${
        mode === 'by-subject' && currentSubjectObj?.kktp ? ` • KKTP Mapel: ${currentSubjectObj.kktp}` : ''
      }`;
      doc.text(subTitle, centerPos, currentY, { align: 'center', maxWidth: printWidth });
      currentY += 6;

      // Classification Metadata details
      let metaDesc = '';
      if (mode === 'by-class') metaDesc = `Rombongan Belajar: Kelas ${selectedClass}`;
      else if (mode === 'by-subject') metaDesc = `Mata Pelajaran: ${selectedSubject} (Kelas: ${selectedClass})`;
      else if (mode === 'by-teacher') metaDesc = `Guru Pengampu: ${currentSelectedTeacher.nama}`;
      else if (mode === 'all-classes') metaDesc = `Keseluruhan Kelas (${selectedFase})`;
      else metaDesc = `Model Asesmen: ${selectedAssessmentType}`;

      doc.setFont('times', 'bold');
      doc.setFontSize(9.5);
      doc.text(metaDesc, marginLeft, currentY);
      doc.setFont('times', 'normal');
      doc.text(`Total Peserta Didik: ${filteredAndSortedRows.length} Siswa`, pageWidth - marginRight, currentY, { align: 'right' });
      currentY += 3.5;

      // Prepare Autotable across full landscape print width
      const headColumns = [
        'RK',
        'NO',
        'NISN',
        'NAMA PESERTA DIDIK',
        'KELAS',
        'JK',
        ...columnKeys.map((k) => (columnLabels[k] ? columnLabels[k].replace('Nilai ', '') : k)),
        'TOTAL NILAI',
        'RATA-RATA',
        'STATUS',
      ];

      const bodyRows = filteredAndSortedRows.map((r) => [
        r.rank,
        r.student.noUrut || '-',
        r.student.nisn || '-',
        r.student.nama,
        r.student.kelas,
        r.student.jenisKelamin,
        ...columnKeys.map((k) => (r.scores[k] !== null ? r.scores[k] : '-')),
        r.totalScore,
        r.averageScore.toFixed(2),
        r.tuntas ? 'Tuntas' : 'Remedial',
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [headColumns],
        body: bodyRows,
        margin: { left: marginLeft, right: marginRight },
        tableWidth: printWidth,
        theme: 'grid',
        styles: {
          font: 'times',
          fontSize: columnKeys.length > 6 ? 7.5 : 8.5,
          cellPadding: 1.8,
          textColor: [20, 20, 20],
          lineColor: [40, 40, 40],
          lineWidth: 0.15,
        },
        headStyles: {
          fillColor: [220, 235, 252],
          textColor: [10, 20, 30],
          fontStyle: 'bold',
          halign: 'center',
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 10 },
          1: { halign: 'center', cellWidth: 9 },
          2: { halign: 'center', cellWidth: 18 },
          3: { halign: 'left', fontStyle: 'bold' },
          4: { halign: 'center', cellWidth: 13 },
          5: { halign: 'center', cellWidth: 8 },
        },
      });

      // Signature Block on Landscape page
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      let signY = finalY;

      if (signY > pageHeight - 40) {
        doc.addPage();
        signY = 25;
      }

      const leftSignX = marginLeft + 15;
      const rightSignX = pageWidth - marginRight - 65;

      doc.setFont('times', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Tumijajar, ${formatIndonesianDate(new Date())}`, rightSignX, signY);
      doc.text('Mengetahui,', leftSignX, signY + 4);
      doc.text('Kepala SMAN 3 Tumijajar,', leftSignX, signY + 8);
      doc.text('Guru Pengampu / Wali Kelas,', rightSignX, signY + 8);

      doc.setFont('times', 'bold');
      doc.text(formatAcademicTitles(school.kepalaSekolah || 'Drs. Puji Astuti, M.Pd.'), leftSignX, signY + 26);
      doc.text(formatAcademicTitles(mode === 'by-teacher' ? currentSelectedTeacher.nama : currentUser.nama), rightSignX, signY + 26);

      doc.setFont('times', 'normal');
      doc.setFontSize(8.5);
      doc.text(`NIP. ${school.nipKepalaSekolah || '-'}`, leftSignX, signY + 30);
      doc.text(`NIP. ${mode === 'by-teacher' ? currentSelectedTeacher.nip || '-' : currentUser.nip || '-'}`, rightSignX, signY + 30);

      const safeClsPdf = (selectedClass || selectedFase || 'SEMUA').replace(/[^a-zA-Z0-9]/g, '_');
      const safeSbjPdf = (selectedSubject || mode).replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`DAFTAR_NILAI_SMANTRI_${mode.toUpperCase()}_KELAS_${safeClsPdf}_${safeSbjPdf}_LANDSCAPE.pdf`);
      showToast('Ekspor PDF Berhasil', 'Dokumen PDF daftar nilai landscape telah diunduh.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal Ekspor PDF', 'Terjadi kendala saat menyusun berkas PDF.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              <Award className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t('Rekapitulasi Nilai & Peringkat Otentik Pembelajaran Mendalam', 'Rekapitulasi Nilai & Peringkat Otentik Pembelajaran Mendalam')}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              {t('roster.title', 'Daftar Nilai & Leaderboard Siswa')}
            </h2>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {t('roster.subtitle', 'Format penilaian resmi terintegrasi multi-klasifikasi: Guru Mapel, Mata Pelajaran, Kelas Rombel, dan Paralel Seluruh Kelas dengan kalkulasi matematis akurat.')}
            </p>
          </div>

          {/* Primary Quick Sync & Action */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              type="button"
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsUploadSTSModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 via-indigo-700 to-sky-600 hover:from-indigo-700 hover:to-sky-700 text-white rounded-xl text-xs font-black shadow-md shadow-indigo-600/30 transition-all cursor-pointer ring-1 ring-indigo-400"
              title="Unggah file Excel nilai rapor STS, SAS, formatif, atau SLM dan langsung sinkronkan ke Daftar Nilai"
            >
              <UploadCloud className="w-4 h-4 text-sky-200" />
              <span>Upload Daftar Nilai &amp; Rapor</span>
              <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[9.5px] font-black bg-white/20 text-white">
                STS • SAS • Formatif
              </span>
            </motion.button>
          </div>
        </div>

        {/* Structured 2nd Tier Action Buttons (Tersusun di Bawah Rapi) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
          <div className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
            <Calculator className="w-4 h-4 text-indigo-600" />
            <span>Dokumen Rekapitulasi &amp; Ekspor Cetak Resmi:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              type="button"
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
              title="Pratinjau lembar cetak ber-kop resmi sebelum diunduh"
            >
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>{t('action.preview', 'Pratinjau Cetak')}</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
              title="Ekspor seluruh tabel nilai ke file Microsoft Excel"
            >
              <Download className="w-4 h-4" />
              <span>{t('action.export_csv', 'Ekspor Excel (.xlsx)')}</span>
            </motion.button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.025, y: -1 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
              title="Cetak dokumen PDF ber-kop resmi standar F4/Folio"
            >
              <Printer className="w-4 h-4 text-indigo-400" />
              <span>{t('action.print', 'Cetak PDF Resmi (F4 Landscape)')}</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* KKTP Rentang Nilai & Indikator Ketuntasan Resmi Kurikulum Merdeka */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900">
                Sistem Penilaian Wajib KKTP & Rentang Ketuntasan Kurikulum Merdeka
              </h4>
              <p className="text-xs text-slate-500">
                Kriteria Ketercapaian Tujuan Pembelajaran (KKTP) berdasarkan 4 Interval Nilai Resmi
              </p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-xs font-black">
            Standar Penilaian Wajib
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {KKTP_INTERVALS.map((item) => (
            <div
              key={item.kategori}
              className={`p-3.5 rounded-2xl border ${item.badgeClass} flex flex-col justify-between space-y-1.5 shadow-2xs`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black flex items-center gap-1.5">
                  <span>{item.iconSymbol}</span>
                  <span>{item.kategori}</span>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/90 text-[10px] font-black border border-current shadow-2xs">
                  {item.rentang}
                </span>
              </div>
              <div className="text-[11px] leading-tight space-y-0.5">
                <strong className="block font-bold">{item.subLabel}</strong>
                <p className="text-[10.5px] italic font-medium opacity-90">{item.remedialInfo}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Accuracy Mathematical Disclaimer */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/70 to-indigo-50/50 border border-amber-200/80 shadow-2xs text-amber-950 flex items-start gap-3">
        <div className="p-2 rounded-xl bg-amber-500/20 text-amber-700 shrink-0 mt-0.5">
          <Calculator className="w-4 h-4" />
        </div>
        <div className="text-xs space-y-1">
          <h4 className="font-extrabold flex items-center gap-1.5 text-amber-900">
            <span>{t('Standar Akurasi Matematis Terverifikasi', 'Standar Akurasi Matematis Terverifikasi')}</span>
            <span className="px-1.5 py-0.2 rounded-md bg-amber-200/60 text-[10px] font-mono">100% Presisi</span>
          </h4>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            Perhitungan <strong>Total Nilai</strong> (∑xᵢ) dan <strong>Nilai Rata-rata</strong> (x̄ = ∑xᵢ / n) pada daftar nilai ini diproses secara matematis presisi tanpa pembulatan parsial acak, sesuai dengan kaidah Pembelajaran Mendalam & standar asesmen resmi SMAN 3 Tumijajar.
          </p>
        </div>
      </div>

      {/* Top 3 Visual Podium Highlight Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-900 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{t('roster.top3', 'Podium Top 3 Prestasi Siswa')}</span>
            <span className="text-xs text-slate-400 font-normal">
              (Berdasarkan {mode === 'by-class' ? `Kelas ${selectedClass}` : mode === 'by-subject' ? selectedSubject : 'Klasifikasi Terpilih'})
            </span>
          </h3>
          <span className="text-[11px] font-semibold text-slate-500">
            {mode === 'by-subject' && currentSubjectObj?.kktp ? (
              <>
                KKTP Mapel: <strong className="text-emerald-700 font-bold">{currentSubjectObj.kktp}</strong>
              </>
            ) : (
              <span className="text-slate-400 font-normal">{t('roster.kktp_note', 'KKTP Sesuai Ketentuan Tiap Mapel')}</span>
            )}
          </span>
        </div>

        {top3Students.length === 0 ? (
          <div className="p-6 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-xs text-slate-400">
            Belum ada nilai yang tercatat pada klasifikasi yang dipilih. Silakan lakukan penilaian di modul asesmen atau ubah filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {top3Students.map((item, idx) => {
              const isFirst = idx === 0;
              const isSecond = idx === 1;
              const isThird = idx === 2;

              return (
                <div
                  key={item.student.id}
                  className={`p-5 rounded-3xl border transition-all relative overflow-hidden flex flex-col justify-between ${
                    isFirst
                      ? 'bg-gradient-to-br from-amber-500/15 via-amber-50/60 to-white border-amber-300 shadow-md ring-1 ring-amber-400/30'
                      : isSecond
                      ? 'bg-gradient-to-br from-slate-200/50 via-slate-50/80 to-white border-slate-300 shadow-xs'
                      : 'bg-gradient-to-br from-orange-500/15 via-orange-50/60 to-white border-orange-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-sm ${
                          isFirst
                            ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300'
                            : isSecond
                            ? 'bg-slate-300 text-slate-800 ring-2 ring-slate-200'
                            : 'bg-amber-700 text-white ring-2 ring-amber-600/30'
                        }`}
                      >
                        {isFirst ? '#1' : isSecond ? '#2' : '#3'}
                      </div>
                      <div>
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider block ${
                            isFirst ? 'text-amber-700' : isSecond ? 'text-slate-600' : 'text-amber-800'
                          }`}
                        >
                          Peringkat {item.rank}
                        </span>
                        <h4 className="font-extrabold text-sm text-slate-900 line-clamp-1">
                          {item.student.nama}
                        </h4>
                        <span className="text-[11px] text-slate-500">
                          Kelas {item.student.kelas} • NISN: {item.student.nisn || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-white/80 backdrop-blur-xs rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs mt-2">
                    <div>
                      <span className="text-[10px] text-slate-500 font-semibold block">Rata-rata Nilai:</span>
                      <span className="text-base font-black text-indigo-700">
                        {item.averageScore.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-semibold block">Total Akumulasi:</span>
                      <span className="font-extrabold text-slate-800 text-xs">
                        {item.totalScore} Poin
                      </span>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.tuntas
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {item.tuntas ? 'Tuntas' : 'Remedial'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Classification & Filtering Controls Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
        {/* Classification Tabs (4 Required + Extras) */}
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
            Pilih Model Klasifikasi Pengelompokan:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            <button
              type="button"
              onClick={() => setMode('by-class')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                mode === 'by-class'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Users className="w-4 h-4 mb-1" />
              <div className="font-extrabold text-xs">1. Berdasarkan Kelas</div>
              <div className={`text-[10px] ${mode === 'by-class' ? 'text-indigo-200' : 'text-slate-400'}`}>
                Per rombongan belajar
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('by-subject')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                mode === 'by-subject'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <BookOpen className="w-4 h-4 mb-1" />
              <div className="font-extrabold text-xs">2. Berdasarkan Mapel</div>
              <div className={`text-[10px] ${mode === 'by-subject' ? 'text-indigo-200' : 'text-slate-400'}`}>
                ASTS, ASAS per mapel
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('by-teacher')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                mode === 'by-teacher'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className="w-4 h-4 mb-1" />
              <div className="font-extrabold text-xs">3. Berdasarkan Guru</div>
              <div className={`text-[10px] ${mode === 'by-teacher' ? 'text-indigo-200' : 'text-slate-400'}`}>
                Mapel yang diampu guru
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('all-classes')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                mode === 'all-classes'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-4 h-4 mb-1" />
              <div className="font-extrabold text-xs">4. Keseluruhan Kelas</div>
              <div className={`text-[10px] ${mode === 'all-classes' ? 'text-indigo-200' : 'text-slate-400'}`}>
                Rekap paralel seluruh siswa
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('by-assessment-type')}
              className={`p-3 rounded-2xl border text-left cursor-pointer transition-all ${
                mode === 'by-assessment-type'
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4 mb-1" />
              <div className="font-extrabold text-xs">5. Model Asesmen</div>
              <div className={`text-[10px] ${mode === 'by-assessment-type' ? 'text-indigo-200' : 'text-slate-400'}`}>
                Khusus ASTS / ASAS
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic Filters depending on active classification */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          {/* Filter 1: Conditional Selector */}
          {mode === 'by-class' && (
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Pilih Rombel Kelas:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                {availableClasses.map((c) => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'by-subject' && (
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Pilih Mata Pelajaran:</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                {availableSubjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'by-teacher' && (
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Pilih Guru Pengampu:</label>
              <select
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                disabled={!isAdmin}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                {availableTeachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nama} ({formatMataPelajaran(t.mataPelajaran) !== '-' ? formatMataPelajaran(t.mataPelajaran) : 'Semua'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {mode === 'all-classes' && (
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Filter Tingkat / Fase:</label>
              <select
                value={selectedFase}
                onChange={(e) => setSelectedFase(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Tingkat & Fase (X, XI, XII)</option>
                <option value="Fase E">Fase E (Kelas X)</option>
                <option value="Fase F">Fase F (Kelas XI & XII)</option>
              </select>
            </div>
          )}

          {mode === 'by-assessment-type' && (
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Jenis Model Asesmen:</label>
              <select
                value={selectedAssessmentType}
                onChange={(e) => setSelectedAssessmentType(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Asesmen (ASTS & ASAS)</option>
                <option value="ASTS">Khusus ASTS (Sumatif Tengah Semester)</option>
                <option value="ASAS">Khusus ASAS (Sumatif Akhir Semester)</option>
              </select>
            </div>
          )}

          {/* Filter 2: Semester */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Semester Penilaian:</label>
            <select
              value={selectedSemester}
              onChange={(e) => setSelectedSemester(e.target.value as any)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Semester</option>
              <option value="Ganjil">Semester Ganjil (1)</option>
              <option value="Genap">Semester Genap (2)</option>
            </select>
          </div>

          {/* Filter 3: Kelas Filter when in Subject Mode or Model Mode */}
          {(mode === 'by-subject' || mode === 'by-assessment-type') && (
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Saring Rombel Kelas:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Semua Kelas</option>
                {availableClasses.map((c) => (
                  <option key={c} value={c}>
                    Kelas {c}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort By Filter */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Urutkan / Sortir:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortField)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
            >
              <option value="rank-asc">Peringkat Tertinggi (Rank 1...)</option>
              <option value="rank-desc">Peringkat Terbawah (Rank Akhir)</option>
              <option value="avg-desc">Rata-rata Nilai Tertinggi (100 - 0)</option>
              <option value="avg-asc">Rata-rata Nilai Terendah (0 - 100)</option>
              <option value="name-asc">Nama Siswa (A - Z)</option>
              <option value="name-desc">Nama Siswa (Z - A)</option>
              <option value="no-asc">No. Urut Absensi Siswa</option>
              <option value="class-asc">Rombel Kelas (X.1, X.2...)</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <label className="text-[11px] font-bold text-slate-600 block mb-1">Cari Nama / NISN:</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik nama atau NISN..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Total Siswa Terdata</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">
            {summaryStats.totalStudents} Siswa
          </span>
          <span className="text-[10px] text-slate-400">{summaryStats.scoredCount} telah memiliki nilai</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Rata-rata Gabungan</span>
          <span className="text-xl font-extrabold text-indigo-700 mt-1 block">
            {summaryStats.overallAvg.toFixed(2)}
          </span>
          <span className="text-[10px] text-slate-400">
            {mode === 'by-subject' && currentSubjectObj?.kktp ? `KKTP Mapel: ${currentSubjectObj.kktp}` : 'KKTP Tiap Mapel Masing-Masing'}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Tingkat Ketuntasan</span>
          <span className="text-xl font-extrabold text-emerald-600 mt-1 block">
            {summaryStats.tuntasPercent}%
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold">{summaryStats.tuntasCount} siswa tuntas</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 block">Mata Pelajaran / Asesmen</span>
          <span className="text-xl font-extrabold text-slate-900 mt-1 block">
            {columnKeys.length} Kolom
          </span>
          <span className="text-[10px] text-slate-400">Pemetaan nilai aktif</span>
        </div>
      </div>

      {/* Keterangan Badge Indikator Rentang KKTP */}
      {/* Indikator Rentang KKTP Resmi */}
      <div className="p-4 bg-white border border-slate-200 rounded-3xl shadow-2xs space-y-2">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Award className="w-4 h-4 text-indigo-600" />
          <span>Panduan Rentang Nilai KKTP & Formula Kalimat Capaian Kompetensi:</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5" title="0 - 60: Peserta didik kurang mampu ...........................">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>0 - 60 : Peserta didik kurang mampu ...........................</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-300 text-xs font-bold flex items-center gap-1.5" title="61 - 70: Peserta didik cukup mampu ...........................">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>61 - 70 : Peserta didik cukup mampu ...........................</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5" title="71 - 80: Peserta didik mampu ...........................">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>71 - 80 : Peserta didik mampu ...........................</span>
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold flex items-center gap-1.5" title="81 - 100: Peserta didik sangat mampu ...........................">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span>81 - 100 : Peserta didik sangat mampu ...........................</span>
          </span>
        </div>
      </div>

      {/* Main Formatted Grades Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h4 className="font-extrabold text-sm text-slate-900">
              Tabel Rekapitulasi Nilai Siswa
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Menampilkan {filteredAndSortedRows.length} siswa sesuai filter aktif
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
            Tahun Ajaran {school.tahunAjaranAktif} • Semester {selectedSemester}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/90 text-slate-700 font-extrabold border-b border-slate-200">
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filteredAndSortedRows.length > 0 && selectedStudentIdsForPenalty.size === filteredAndSortedRows.length}
                    onChange={() => {
                      if (selectedStudentIdsForPenalty.size === filteredAndSortedRows.length) {
                        setSelectedStudentIdsForPenalty(new Set());
                      } else {
                        setSelectedStudentIdsForPenalty(new Set(filteredAndSortedRows.map((r) => r.student.id)));
                      }
                    }}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    title="Pilih semua siswa untuk kebijakan penalti kecurangan"
                  />
                </th>
                <th className="py-3 px-3 text-center w-12">Rank</th>
                <th className="py-3 px-3 text-center w-14">No / NISN</th>
                <th className="py-3 px-4 min-w-[200px]">Nama Peserta Didik</th>
                <th className="py-3 px-3 text-center w-16">Kelas</th>
                <th className="py-3 px-2 text-center w-10">L/P</th>

                {/* Dynamic Value Columns */}
                {columnKeys.map((colKey) => (
                  <th
                    key={colKey}
                    className="py-3 px-3 text-center font-bold text-slate-800 min-w-[100px] border-l border-slate-200/60"
                  >
                    {columnLabels[colKey] || colKey}
                  </th>
                ))}

                <th className="py-3 px-3 text-center font-extrabold text-slate-900 bg-slate-100/70 border-l border-slate-200 min-w-[110px]">
                  Total Nilai
                </th>
                <th className="py-3 px-3 text-center font-black text-indigo-900 bg-indigo-50/70 border-l border-indigo-200 min-w-[110px]">
                  Nilai Rata-rata
                </th>
                <th className="py-3 px-3 text-center font-bold text-slate-800 border-l border-slate-200 w-24">
                  Status KKTP
                </th>
                <th className="py-3 px-3 text-center font-bold text-slate-800 border-l border-slate-200 min-w-[110px]">
                  Bukti Otentik
                </th>
                <th className="py-3 px-3 text-center font-bold text-slate-800 border-l border-slate-200 w-20">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td colSpan={8 + columnKeys.length} className="py-12 text-center text-slate-400">
                    Tidak ada data siswa yang cocok dengan filter atau pencarian Anda.
                  </td>
                </tr>
              ) : (
                paginatedAndSortedRows.map((row) => {
                  const isTop1 = row.rank === 1;
                  const isTop2 = row.rank === 2;
                  const isTop3 = row.rank === 3;

                  return (
                    <tr
                      key={row.student.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        selectedStudentIdsForPenalty.has(row.student.id)
                          ? 'bg-amber-50/70 font-semibold'
                          : isTop1
                          ? 'bg-amber-50/30'
                          : isTop2
                          ? 'bg-slate-100/20'
                          : isTop3
                          ? 'bg-orange-50/20'
                          : ''
                      }`}
                    >
                      {/* Checkbox Column */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedStudentIdsForPenalty.has(row.student.id)}
                          onChange={() => {
                            setSelectedStudentIdsForPenalty((prev) => {
                              const next = new Set(prev);
                              if (next.has(row.student.id)) next.delete(row.student.id);
                              else next.add(row.student.id);
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>

                      {/* Rank Column with Rank badges */}
                      <td className="py-3 px-3 text-center font-extrabold">
                        {isTop1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500 text-slate-950 shadow-2xs text-[11px] font-bold">
                            1
                          </span>
                        ) : isTop2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-slate-300 text-slate-900 shadow-2xs text-[11px] font-bold">
                            2
                          </span>
                        ) : isTop3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-700 text-white shadow-2xs text-[11px] font-bold">
                            3
                          </span>
                        ) : (
                          <span className="text-slate-500">{row.rank}</span>
                        )}
                      </td>

                      {/* No / NISN */}
                      <td className="py-3 px-3 text-center text-[11px] text-slate-500 font-mono">
                        <div>{row.student.noUrut || '-'}</div>
                        <div className="text-[10px] text-slate-400">{row.student.nisn || '-'}</div>
                      </td>

                      {/* Student Name */}
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {row.student.nama}
                      </td>

                      {/* Class */}
                      <td className="py-3 px-3 text-center font-semibold text-slate-700">
                        {row.student.kelas}
                      </td>

                      {/* Gender */}
                      <td className="py-3 px-2 text-center text-slate-500 font-semibold">
                        {row.student.jenisKelamin}
                      </td>

                      {/* Dynamic Scores */}
                      {columnKeys.map((colKey) => {
                        const scoreVal = row.scores[colKey];
                        const isFilled = scoreVal !== null && !isNaN(scoreVal);
                        const kktpInfo = isFilled ? getKKTPKategori(scoreVal) : null;

                        return (
                          <td
                            key={colKey}
                            className="py-3 px-3 text-center border-l border-slate-100 font-semibold"
                          >
                            {isFilled && kktpInfo ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-extrabold text-slate-800">
                                  {scoreVal}
                                </span>
                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold border leading-none ${kktpInfo.badgeClass}`}>
                                  {kktpInfo.kategori} ({kktpInfo.rentang})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Total Score */}
                      <td className="py-3 px-3 text-center font-extrabold text-slate-900 bg-slate-50/50 border-l border-slate-200">
                        {row.totalScore > 0 ? row.totalScore : '-'}
                      </td>

                      {/* Mathematically Accurate Average */}
                      <td className="py-3 px-3 text-center border-l border-indigo-200 bg-indigo-50/20">
                        {row.averageScore > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className="font-black text-indigo-700 text-xs sm:text-sm">
                              {row.averageScore.toFixed(2)}
                            </span>
                            {(() => {
                              const avgKktp = getKKTPKategori(row.averageScore);
                              return (
                                <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black border leading-none ${avgKktp.badgeClass}`}>
                                  {avgKktp.kategori}
                                </span>
                              );
                            })()}
                          </div>
                        ) : '-'}
                      </td>

                      {/* KKTP Status */}
                      <td className="py-3 px-3 text-center border-l border-slate-200">
                        {row.averageScore > 0 ? (() => {
                          const avgKktp = getKKTPKategori(row.averageScore);
                          return (
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${avgKktp.badgeClass} shadow-2xs`}
                              title={`${avgKktp.kategori} (${avgKktp.rentang}): ${avgKktp.subLabel} - ${avgKktp.remedialInfo}`}
                            >
                              <span>{avgKktp.iconSymbol}</span>
                              <span>{avgKktp.shortBadge}</span>
                            </span>
                          );
                        })() : (
                          <span className="text-slate-300 text-xs">-</span>
                        )}
                      </td>

                      {/* Bukti Otentik Column */}
                      <td className="py-3 px-3 text-center border-l border-slate-200">
                        {row.bestProof ? (
                          <button
                            type="button"
                            onClick={() => setSelectedProofData({
                              submission: row.bestProof!.submission,
                              assessment: row.bestProof!.assessment,
                              student: row.student
                            })}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-extrabold border cursor-pointer transition-all shadow-2xs ${
                              (row.bestProof.submission.statusKoreksi?.includes('Draf') || row.bestProof.submission.statusKoreksi?.includes('Draft')) && (!row.bestProof.submission.nilaiAkhir || row.bestProof.submission.nilaiAkhir === 0)
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300'
                            }`}
                            title="Buka Dokumen Resmi Bukti Otentik Penilaian Siswa"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{(row.bestProof.submission.statusKoreksi?.includes('Draf') || row.bestProof.submission.statusKoreksi?.includes('Draft')) && (!row.bestProof.submission.nilaiAkhir || row.bestProof.submission.nilaiAkhir === 0) ? 'Bukti Draf' : 'Bukti Sah'}</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum Ada</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3 px-3 text-center border-l border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForGrades(row.student)}
                          className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] cursor-pointer inline-flex items-center gap-1 transition-all"
                          title={`Kelola Nilai untuk ${row.student.nama}`}
                        >
                          <Settings className="w-3.5 h-3.5" />
                          <span>Kelola</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <PaginationControls
          currentPage={rosterPage}
          totalPages={totalRosterPages}
          pageSize={rosterPageSize}
          totalItems={filteredAndSortedRows.length}
          onPageChange={setRosterPage}
          onPageSizeChange={setRosterPageSize}
        />
      </div>

      {/* Full Official Document Preview Modal (Landscape Standard F4 / Folio) */}
      <AnimatePresence>
        {isPreviewOpen && (
          <div 
            onClick={() => setIsPreviewOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-300 max-w-6xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden text-slate-900 cursor-default my-auto"
            >
              {/* Modal Top Bar */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <Printer className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-bold text-sm sm:text-base leading-tight">
                      Pratinjau Dokumen Cetak Resmi (Landscape Standar F4 / Folio)
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Ukuran kertas 33.02 cm × 21.59 cm (Panjang garis kop dan tabel proporsional penuh)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-white rounded-xl cursor-pointer transition-colors"
                    title="Tutup"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Document Sheet Simulation (Landscape Sheet) */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 font-tnr">
                <div className="w-full bg-white p-6 sm:p-10 rounded-2xl shadow-xl border border-slate-300 space-y-4">
                  {/* Kop Surat Header Simulation across Full Landscape Width */}
                  <div className="w-full">
                    <div className="flex items-center justify-between gap-4 pb-2">
                      {/* Logo Kiri: Provinsi Lampung */}
                      <img
                        src={school.logoProvinsiUrl || 'https://iili.io/n1vlpFS.png'}
                        alt="Logo Provinsi Lampung"
                        className="h-20 w-22 object-fill shrink-0 scale-x-110"
                      />

                      {/* Teks Kop Surat di Posisi Paling Tengah */}
                      <div className="text-center flex-1 px-4 leading-tight">
                        <div className="font-bold text-sm uppercase tracking-wide text-black">
                          {school.provinsiText || 'PEMERINTAH PROVINSI LAMPUNG'}
                        </div>
                        <div className="font-black text-base uppercase tracking-wider text-black mt-1">
                          {school.namaSekolah || 'SMA NEGERI 3 TUMIJAJAR'}
                        </div>
                        <div className="font-normal text-[11px] text-black mt-0.5">
                          NPSN : {school.npsn || '69955116'} - NSS: {school.nss || '30.1.1812.02.021'} - AKREDITASI ”{school.akreditasi || 'B'}”
                        </div>
                        <div className="text-[10px] text-black leading-tight mt-0.5">
                          {school.alamat || 'Alamat : Tiyuh Makarti Suku 3, Kec. Tumijajar, Kab. Tulang Bawang Barat, Lampung Kode Pos 34794'}
                        </div>
                        <div className="text-[10px] text-black mt-0.5">
                          E-mail : {school.email || 'smantitumijajar@gmail.com'} – Website : {school.website || 'https://sman3tumijajar.sch.id'}
                        </div>
                      </div>

                      {/* Logo Kanan: SMAN 3 Tumijajar */}
                      <img
                        src={school.logoSekolahUrl || 'https://iili.io/n1vlf2t.png'}
                        alt="Logo SMAN 3 Tumijajar"
                        className="h-20 w-auto object-contain shrink-0"
                      />
                    </div>

                    {/* Garis Pembatas Kop Ganda Sepanjang Lebar Kertas Landscape */}
                    <div className="border-b-[2.5px] border-black w-full" />
                    <div className="border-b-[1px] border-black w-full mt-[1.5px] mb-3" />
                  </div>

                  {/* Document Title (Centered on Landscape Sheet) */}
                  <div className="text-center pt-1">
                    <h3 className="font-bold text-sm uppercase underline tracking-wide text-black">
                      DAFTAR REKAPITULASI NILAI DAN PERINGKAT PESERTA DIDIK
                    </h3>
                    <p className="text-[11px] text-black mt-0.5">
                      Tahun Ajaran {school.tahunAjaranAktif} - Semester {selectedSemester}
                      {mode === 'by-subject' && currentSubjectObj?.kktp ? ` • KKTP Mapel: ${currentSubjectObj.kktp}` : ''}
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-black pt-2">
                      <span>
                        {mode === 'by-class'
                          ? `Rombongan Belajar: Kelas ${selectedClass}`
                          : mode === 'by-subject'
                          ? `Mata Pelajaran: ${selectedSubject} (Kelas ${selectedClass})`
                          : mode === 'by-teacher'
                          ? `Guru Pengampu: ${currentSelectedTeacher.nama}`
                          : mode === 'all-classes'
                          ? `Keseluruhan Kelas (${selectedFase})`
                          : `Model Asesmen: ${selectedAssessmentType}`}
                      </span>
                      <span>Total Peserta Didik: {filteredAndSortedRows.length} Siswa</span>
                    </div>
                  </div>

                  {/* Printable Table Simulation */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-black text-[10.5px] mt-2">
                      <thead>
                        <tr className="bg-slate-200 border-b border-black font-bold text-center">
                          <th className="border border-black p-1.5 w-10">RK</th>
                          <th className="border border-black p-1.5 w-12">NO</th>
                          <th className="border border-black p-1.5 w-24">NISN</th>
                          <th className="border border-black p-1.5 text-left">NAMA PESERTA DIDIK</th>
                          <th className="border border-black p-1.5 w-14">KLS</th>
                          <th className="border border-black p-1.5 w-10">JK</th>
                          {columnKeys.map((k) => (
                            <th key={k} className="border border-black p-1.5 min-w-[70px]">
                              {columnLabels[k] ? columnLabels[k].replace('Nilai ', '') : k}
                            </th>
                          ))}
                          <th className="border border-black p-1.5 w-20">TOTAL</th>
                          <th className="border border-black p-1.5 w-20">RATA2</th>
                          <th className="border border-black p-1.5 w-16">KET</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredAndSortedRows.slice(0, 30).map((r) => (
                          <tr key={r.student.id} className="text-center">
                            <td className="border border-black p-1 font-bold">{r.rank}</td>
                            <td className="border border-black p-1">{r.student.noUrut || '-'}</td>
                            <td className="border border-black p-1 font-mono text-[9.5px]">{r.student.nisn || '-'}</td>
                            <td className="border border-black p-1 text-left font-semibold">{r.student.nama}</td>
                            <td className="border border-black p-1">{r.student.kelas}</td>
                            <td className="border border-black p-1">{r.student.jenisKelamin}</td>
                            {columnKeys.map((k) => (
                              <td key={k} className="border border-black p-1 font-medium">
                                {r.scores[k] !== null ? r.scores[k] : '-'}
                              </td>
                            ))}
                            <td className="border border-black p-1 font-bold">{r.totalScore}</td>
                            <td className="border border-black p-1 font-black text-indigo-900">{r.averageScore.toFixed(2)}</td>
                            <td className="border border-black p-1 font-semibold">
                              {r.tuntas ? 'Tuntas' : 'Remedial'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {filteredAndSortedRows.length > 30 && (
                    <p className="text-[10px] text-slate-500 italic text-center pt-1">
                      ... dan {filteredAndSortedRows.length - 30} peserta didik lainnya disertakan lengkap pada dokumen cetak PDF.
                    </p>
                  )}

                  {/* Signatures on Landscape layout */}
                  <div className="pt-8 flex justify-between text-[11px] text-black">
                    <div className="text-left">
                      <div>Mengetahui,</div>
                      <div>Kepala SMAN 3 Tumijajar,</div>
                      <div className="h-16" />
                      <div className="font-bold underline">
                        {school.kepalaSekolah || 'Drs. Puji Astuti, M.Pd.'}
                      </div>
                      <div>NIP. {school.nipKepalaSekolah || '-'}</div>
                    </div>

                    <div className="text-right">
                      <div>Tumijajar, {formatIndonesianDate(new Date())}</div>
                      <div>Guru Pengampu / Wali Kelas,</div>
                      <div className="h-16" />
                      <div className="font-bold underline">
                        {mode === 'by-teacher' ? currentSelectedTeacher.nama : currentUser.nama}
                      </div>
                      <div>NIP. {mode === 'by-teacher' ? currentSelectedTeacher.nip || '-' : currentUser.nip || '-'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
                <p className="text-xs text-slate-500 font-medium">
                  Pratinjau Dokumen Rekapitulasi Roster Nilai Siswa (Landscape F4)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh PDF Landscape</span>
                  </button>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Kelola Nilai Modal (Manage Grades) */}
      <AnimatePresence>
        {selectedStudentForGrades && (
          <div
            onClick={() => {
              setSelectedStudentForGrades(null);
              setEditingAssessmentId(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden text-slate-800 cursor-default my-auto"
            >
              {/* Header */}
              <div className="bg-slate-900 p-4 text-white flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/20 shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm leading-tight">
                      Manajemen Nilai Peserta Didik
                    </h3>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">
                      {selectedStudentForGrades.nama} • Kelas {selectedStudentForGrades.kelas}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedStudentForGrades(null);
                    setEditingAssessmentId(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                <div className="bg-indigo-50/50 border border-indigo-100/80 rounded-2xl p-3.5 text-xs text-indigo-950 flex items-start gap-2.5">
                  <Award className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Informasi Akses Guru Mapel</p>
                    <p className="text-indigo-800/80 mt-0.5 leading-relaxed">
                      Anda hanya diperbolehkan mengedit atau menghapus nilai pada mata pelajaran yang ditugaskan kepada Anda. Administrator dapat mengelola seluruh mata pelajaran.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">
                    Daftar Paket Asesmen Tersedia ({studentAssessments.length})
                  </h4>

                  {studentAssessments.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-2xl">
                      Tidak ada paket asesmen aktif yang cocok atau dapat dikelola oleh akun Anda untuk kelas siswa ini.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {studentAssessments.map((asm) => {
                        const sub = (asm.submissions || []).find(
                          (s) => s.studentId === selectedStudentForGrades.id || s.studentName === selectedStudentForGrades.nama
                        );
                        const isGraded = sub && sub.nilaiAkhir !== undefined && sub.nilaiAkhir !== null;
                        const isEditing = editingAssessmentId === asm.id;

                        return (
                          <div
                            key={asm.id}
                            className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all flex flex-col gap-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black text-white ${
                                  asm.jenis === 'ASTS' ? 'bg-amber-500' : 'bg-indigo-600'
                                }`}>
                                  {asm.jenis}
                                </span>
                                <h5 className="font-extrabold text-slate-900 text-xs mt-1">
                                  {asm.mataPelajaran}
                                </h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  {asm.judul} • T.A. {asm.tahunAjaran} ({asm.semester})
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                                  Nilai Akhir
                                </span>
                                {isGraded ? (
                                  <span className="text-base font-black text-indigo-700 block mt-0.5">
                                    {sub.nilaiAkhir}
                                  </span>
                                ) : (
                                  <span className="text-xs font-semibold text-slate-400 block mt-0.5">
                                    Belum Ada
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Inline Editor or Actions */}
                            {isEditing ? (
                              <div className="pt-3 border-t border-slate-100/80 flex items-center gap-2">
                                <div className="flex-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={editingScoreInput}
                                    onChange={(e) => setEditingScoreInput(e.target.value)}
                                    placeholder="Skor 0-100"
                                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500"
                                    autoFocus
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateScore(asm.id, selectedStudentForGrades, parseInt(editingScoreInput))}
                                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>Simpan</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingAssessmentId(null)}
                                  className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2.5">
                                {sub ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedProofData({
                                      submission: sub,
                                      assessment: asm,
                                      student: selectedStudentForGrades
                                    })}
                                    className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"
                                    title="Lihat Dokumen Bukti Otentik Penilaian"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Bukti Otentik</span>
                                  </button>
                                ) : <span />}

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingAssessmentId(asm.id);
                                      setEditingScoreInput(isGraded ? String(sub.nilaiAkhir) : '');
                                    }}
                                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <Edit className="w-3.5 h-3.5" />
                                    <span>{isGraded ? 'Edit Nilai' : 'Beri Nilai'}</span>
                                  </button>

                                  {isGraded && (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteScore(asm.id, selectedStudentForGrades.id, selectedStudentForGrades.nama)}
                                      className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1.5 cursor-pointer ml-3"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Hapus</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-200 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentForGrades(null);
                    setEditingAssessmentId(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
                >
                  Tutup Manajemen
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Authentic Proof Modal (Dokumen Bukti Otentik Penilaian Siswa) */}
      {selectedProofData && (
        <AuthenticProofModal
          submission={selectedProofData.submission}
          assessment={selectedProofData.assessment}
          student={selectedProofData.student}
          schoolInfo={state.schoolInfo}
          onClose={() => setSelectedProofData(null)}
        />
      )}

      {/* Floating Action Bar for Selected Students Penalty */}
      {selectedStudentIdsForPenalty.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 inset-x-6 max-w-2xl mx-auto z-40 p-4 bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm block">
                {selectedStudentIdsForPenalty.size} Siswa Terpilih
              </span>
              <span className="text-[11px] text-slate-400">
                Opsi Kebijakan Pengurangan Nilai (Mencontek / Kecurangan)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedStudentIdsForPenalty(new Set())}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              Batalkan
            </button>

            <button
              type="button"
              onClick={() => setIsRosterPenaltyModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Terapkan Kebijakan Penalti</span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Teacher Policy Penalty Modal (Kecurangan / Mencontek) */}
      {isRosterPenaltyModalOpen && activeTargetAssessment && (
        <TeacherPenaltyModal
          isOpen={isRosterPenaltyModalOpen}
          onClose={() => setIsRosterPenaltyModalOpen(false)}
          assessment={activeTargetAssessment}
          submissions={activeTargetAssessment.submissions || []}
          classStudents={state.students.filter((s) => isClassMatch(s.kelas, selectedClass))}
          onApplyPenalty={handleApplyRosterTeacherPenalty}
          initialSelectedStudentIds={Array.from(selectedStudentIdsForPenalty)}
        />
      )}

      {/* Modal Upload & Impor Nilai Rapor STS */}
      {isUploadSTSModalOpen && (
        <UploadRaporSTSModal
          isOpen={isUploadSTSModalOpen}
          onClose={() => setIsUploadSTSModalOpen(false)}
          defaultClass={selectedClass !== 'ALL' ? selectedClass : state.classes[0]?.nama}
          defaultSubject={selectedSubject}
          onSuccessSync={handleUploadSTSSuccess}
        />
      )}
    </div>
  );
};
