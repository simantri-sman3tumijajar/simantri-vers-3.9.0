import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ClassItem, SubjectItem, TeacherSubjectAssignment } from '../types';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  BookOpen,
  Users,
  Check,
  FileSpreadsheet,
  Download,
  Upload,
  Sparkles,
  Zap,
  Search,
  UserCheck,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { downloadSubjectTemplateExcel, exportSubjectsToExcel } from '../utils/excelExport';
import { generateSubjectCode } from '../utils/subjectCodeGenerator';
import { isClassMatch } from '../utils/classHelper';

export const MasterClassSubjectView: React.FC = () => {
  const {
    state,
    saveClass,
    deleteClass,
    saveSubject,
    saveSubjectsBatch,
    replaceSubjectsAll,
    importSubjectsComplete,
    saveTeacher,
    deleteSubject,
    deleteSubjectsBatch,
    showToast,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'classes' | 'subjects'>('classes');
  const [searchQuery, setSearchQuery] = useState('');

  // Class Modal State
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null);
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);

  // Subject Modal State
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [selectedTeacherToAdd, setSelectedTeacherToAdd] = useState<string>('');
  const [expandedTeacherId, setExpandedTeacherId] = useState<string | null>(null);

  // Excel Import Preview Modal State
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [parsedExcelSubjects, setParsedExcelSubjects] = useState<SubjectItem[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [autoRegisterTeachers, setAutoRegisterTeachers] = useState(true);
  const [autoRegisterClasses, setAutoRegisterClasses] = useState(true);
  const [newTeachersFound, setNewTeachersFound] = useState<string[]>([]);
  const [newClassesFound, setNewClassesFound] = useState<string[]>([]);
  const [isApplyingImport, setIsApplyingImport] = useState(false);

  // Bulk Subject Selection State ("Terapkan ke Semua")
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [isBulkSubjectModalOpen, setIsBulkSubjectModalOpen] = useState(false);
  const [bulkKktpX, setBulkKktpX] = useState<number>(75);
  const [bulkKktpXI, setBulkKktpXI] = useState<number>(76);
  const [bulkKktpXII, setBulkKktpXII] = useState<number>(78);
  const [bulkApplyKktp, setBulkApplyKktp] = useState(true);
  const [bulkKelasAjarMode, setBulkKelasAjarMode] = useState<'all' | 'custom' | 'none'>('all');
  const [bulkKelasAjarList, setBulkKelasAjarList] = useState<string[]>([]);

  // Mode Edit Tabel Sekaligus (Classes & Subjects)
  const [isBatchEditClasses, setIsBatchEditClasses] = useState(false);
  const [batchClassesMap, setBatchClassesMap] = useState<Record<string, ClassItem>>({});

  const [isBatchEditSubjects, setIsBatchEditSubjects] = useState(false);
  const [batchSubjectsMap, setBatchSubjectsMap] = useState<Record<string, SubjectItem>>({});

  const handleToggleBatchEditClasses = () => {
    if (!isBatchEditClasses) {
      const map: Record<string, ClassItem> = {};
      state.classes.forEach((c) => {
        map[c.id] = { ...c };
      });
      setBatchClassesMap(map);
      setIsBatchEditClasses(true);
    } else {
      setIsBatchEditClasses(false);
      setBatchClassesMap({});
    }
  };

  const handleUpdateBatchClassField = (id: string, field: keyof ClassItem, value: any) => {
    setBatchClassesMap((prev) => {
      const existing = prev[id] || state.classes.find((c) => c.id === id);
      if (!existing) return prev;
      return {
        ...prev,
        [id]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleSaveAllBatchClasses = async () => {
    const listToSave = Object.values(batchClassesMap);
    if (listToSave.length === 0) return;
    for (const c of listToSave) {
      await saveClass(c);
    }
    setIsBatchEditClasses(false);
    setBatchClassesMap({});
    showToast('Simpan Sekaligus Berhasil', `Berhasil memperbarui data ${listToSave.length} rombel kelas secara bersamaan.`, 'success');
  };

  const handleToggleBatchEditSubjects = () => {
    if (!isBatchEditSubjects) {
      const map: Record<string, SubjectItem> = {};
      state.subjects.forEach((s) => {
        map[s.id] = { ...s };
      });
      setBatchSubjectsMap(map);
      setIsBatchEditSubjects(true);
    } else {
      setIsBatchEditSubjects(false);
      setBatchSubjectsMap({});
    }
  };

  const handleUpdateBatchSubjectField = (id: string, field: keyof SubjectItem, value: any) => {
    setBatchSubjectsMap((prev) => {
      const existing = prev[id] || state.subjects.find((s) => s.id === id);
      if (!existing) return prev;
      return {
        ...prev,
        [id]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  const handleSaveAllBatchSubjects = async () => {
    const listToSave = Object.values(batchSubjectsMap);
    if (listToSave.length === 0) return;
    await saveSubjectsBatch(listToSave);
    setIsBatchEditSubjects(false);
    setBatchSubjectsMap({});
    showToast('Simpan Sekaligus Berhasil', `Berhasil memperbarui data ${listToSave.length} mata pelajaran secara bersamaan.`, 'success');
  };

  if (!state) return null;

  const teacherNames = state.teachers.map((t) => t.nama);

  // Subject Excel Import Handler (Supports all templates, Dapodik, and custom Excel layouts)
  const handleImportSubjectsExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = file.name;
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // Find the worksheet with the most relevant data
        let targetWorksheet: XLSX.WorkSheet | null = null;
        let maxRows = 0;

        // Priority 1: Check by name
        for (const sheetName of workbook.SheetNames) {
          const lower = sheetName.toLowerCase();
          if (
            lower.includes('mapel') ||
            lower.includes('mata_pelajaran') ||
            lower.includes('mata pelajaran') ||
            lower.includes('kurikulum') ||
            lower.includes('jadwal') ||
            lower.includes('subject')
          ) {
            const ws = workbook.Sheets[sheetName];
            if (ws && ws['!ref']) {
              targetWorksheet = ws;
              break;
            }
          }
        }

        // Priority 2: Fallback to sheet with most rows
        if (!targetWorksheet) {
          for (const sheetName of workbook.SheetNames) {
            const ws = workbook.Sheets[sheetName];
            if (ws && ws['!ref']) {
              const range = XLSX.utils.decode_range(ws['!ref']);
              const rowsCount = range.e.r - range.s.r + 1;
              if (rowsCount > maxRows) {
                maxRows = rowsCount;
                targetWorksheet = ws;
              }
            }
          }
        }

        if (!targetWorksheet) {
          showToast('File Kosong', 'File Excel tidak memiliki lembar kerja yang berisi data.', 'error');
          return;
        }

        const jsonData: any[][] = XLSX.utils.sheet_to_json(targetWorksheet, { header: 1, defval: '' });

        if (!jsonData || jsonData.length === 0) {
          showToast('File Kosong', 'File Excel tidak berisi baris data mata pelajaran.', 'error');
          return;
        }

        // Score candidate header rows up to first 25 rows
        let headerRowIdx = -1;
        let bestScore = 0;

        for (let r = 0; r < Math.min(jsonData.length, 25); r++) {
          const row = jsonData[r];
          if (!row || !Array.isArray(row)) continue;

          const nonEmpty = row.filter((c) => c !== undefined && c !== null && String(c).trim().length > 0);
          if (nonEmpty.length < 2) continue;

          let score = 0;
          for (const cell of nonEmpty) {
            const s = String(cell).toUpperCase().trim();
            if (s === 'NO' || s === 'NOMOR' || s === 'NUM' || s === 'NO.') score += 2;
            if (s.includes('KODE') || s === 'KD' || s === 'CODE' || s.includes('SINGKAT')) score += 3;
            if (
              s.includes('MATA PELAJARAN') ||
              s.includes('NAMA MAPEL') ||
              s.includes('MATA_PELAJARAN') ||
              s === 'MAPEL' ||
              s.includes('BIDANG STUDI') ||
              s === 'SUBJECT' ||
              s === 'NAMA MATA PELAJARAN' ||
              s.includes('PELAJARAN')
            ) {
              score += 6;
            }
            if (
              s.includes('GURU') ||
              s.includes('PENGAJAR') ||
              s.includes('PENGAMPU') ||
              s.includes('PTK') ||
              s.includes('PENDIDIK') ||
              s.includes('TEACHER')
            ) {
              score += 4;
            }
            if (s.includes('KELAS') || s.includes('ROMBEL') || s.includes('TINGKAT')) score += 2;
            if (s.includes('KKTP') || s.includes('KKM') || s.includes('KBM')) score += 3;
          }

          if (score > bestScore) {
            bestScore = score;
            headerRowIdx = r;
          }
        }

        // Map column indices
        let kodeIdx = -1;
        let namaIdx = -1;
        let guruIdx = -1;
        let kelasIdx = -1;
        let kktpXIdx = -1;
        let kktpXIIdx = -1;
        let kktpXIIIdx = -1;
        let kktpIdx = -1;

        let startDataRowIdx = 1;

        if (headerRowIdx >= 0) {
          const headers = jsonData[headerRowIdx].map((h) => String(h || '').toUpperCase().trim());
          startDataRowIdx = headerRowIdx + 1;

          // Subject Name column
          namaIdx = headers.findIndex(
            (h) =>
              (h.includes('MATA') && h.includes('PELAJARAN')) ||
              h.includes('NAMA MAPEL') ||
              h.includes('NAMA MATA') ||
              h === 'MATA PELAJARAN' ||
              h === 'MATA_PELAJARAN' ||
              h === 'MAPEL' ||
              h === 'BIDANG STUDI' ||
              h === 'SUBJECT' ||
              h.includes('NAMA_MAPEL') ||
              h.includes('NAMA PELAJARAN')
          );

          if (namaIdx === -1) {
            namaIdx = headers.findIndex(
              (h) =>
                (h === 'NAMA' || h.includes('NAMA')) &&
                !h.includes('GURU') &&
                !h.includes('PENGAJAR') &&
                !h.includes('KELAS') &&
                !h.includes('SEKOLAH') &&
                !h.includes('PTK')
            );
          }

          if (namaIdx === -1) {
            namaIdx = headers.findIndex((h) => h.includes('PELAJARAN') && !h.includes('GURU'));
          }

          // Code column
          kodeIdx = headers.findIndex(
            (h) =>
              (h.includes('KODE') || h === 'KD' || h === 'CODE' || h.includes('SINGKAT')) &&
              !h.includes('SKOR') &&
              !h.includes('NILAI')
          );

          // Teacher column
          guruIdx = headers.findIndex(
            (h) =>
              h.includes('GURU') ||
              h.includes('PENGAJAR') ||
              h.includes('PENGAMPU') ||
              h.includes('TEACHER') ||
              h.includes('PTK') ||
              h.includes('PENDIDIK')
          );

          // Classes / Rombel column
          kelasIdx = headers.findIndex(
            (h) =>
              (h.includes('ROMBEL') ||
                h.includes('KELAS AJAR') ||
                h.includes('CAKUPAN KELAS') ||
                h.includes('SASARAN') ||
                (h.includes('KELAS') && !h.includes('KKTP') && !h.includes('KKM') && !h.includes('WALI')))
          );

          // Specific KKTP / KKM columns for X (10)
          kktpXIdx = headers.findIndex(
            (h) =>
              (h.includes('KKTP') || h.includes('KKM') || h.includes('KBM')) &&
              (h.includes('X') || h.includes('10') || h.includes('FASE E')) &&
              !h.includes('XI') &&
              !h.includes('XII')
          );

          // Specific KKTP / KKM columns for XI (11)
          kktpXIIdx = headers.findIndex(
            (h) =>
              (h.includes('KKTP') || h.includes('KKM') || h.includes('KBM')) &&
              (h.includes('XI') || h.includes('11')) &&
              !h.includes('XII')
          );

          // Specific KKTP / KKM columns for XII (12)
          kktpXIIIdx = headers.findIndex(
            (h) =>
              (h.includes('KKTP') || h.includes('KKM') || h.includes('KBM')) &&
              (h.includes('XII') || h.includes('12'))
          );

          // General KKTP / KKM
          kktpIdx = headers.findIndex(
            (h) =>
              h === 'KKTP' ||
              h === 'KKM' ||
              h === 'KBM' ||
              h.includes('STANDAR') ||
              h.includes('NILAI MINIMAL') ||
              h.includes('KKTP DEFAULT')
          );
        } else {
          // If no header scored, inspect row 0 as data
          startDataRowIdx = 0;
          const sampleRow = jsonData[0] || [];
          for (let c = 0; c < sampleRow.length; c++) {
            const val = String(sampleRow[c] || '').trim();
            if (val.length > 3 && isNaN(Number(val)) && namaIdx === -1) {
              namaIdx = c;
            }
          }
          if (namaIdx === -1) namaIdx = sampleRow.length > 1 ? 1 : 0;
          if (namaIdx > 0) kodeIdx = 0;
        }

        const defaultKktp = 75;
        const subjectsParsed: SubjectItem[] = [];
        const discoveredTeachers = new Set<string>();
        const discoveredClasses = new Set<string>();

        for (let i = startDataRowIdx; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || !Array.isArray(row) || row.length === 0) continue;

          // Check if row is purely subheader numbering row (e.g. ['1', '2', '3', '4', ...])
          const rowNonEmpty = row.filter((c) => c !== undefined && c !== null && String(c).trim().length > 0);
          if (rowNonEmpty.length === 0) continue;
          const isNumberingRow = rowNonEmpty.every((c) => !isNaN(Number(String(c).trim())));
          if (isNumberingRow && rowNonEmpty.length > 2 && i === startDataRowIdx) {
            continue; // Skip subheader row (1, 2, 3...)
          }

          // Extract subject name
          let rawNama = '';
          if (namaIdx >= 0 && row[namaIdx] !== undefined) {
            rawNama = String(row[namaIdx] || '').trim();
          } else {
            // Find first long non-numeric string column
            for (let c = 0; c < row.length; c++) {
              const val = String(row[c] || '').trim();
              if (
                val &&
                isNaN(Number(val)) &&
                val.length >= 2 &&
                !['NO', 'NUM', 'KD', 'KODE', 'MAPEL'].includes(val.toUpperCase())
              ) {
                rawNama = val;
                break;
              }
            }
          }

          if (!rawNama || rawNama.length < 2) continue;

          // Skip repeated header rows
          const upperNama = rawNama.toUpperCase();
          if (
            upperNama === 'MATA PELAJARAN' ||
            upperNama === 'MATA_PELAJARAN' ||
            upperNama === 'NAMA MAPEL' ||
            upperNama === 'NAMA MATA PELAJARAN' ||
            upperNama === 'NAMA' ||
            upperNama === 'SUBJECT' ||
            upperNama === 'MAPEL' ||
            upperNama === 'KODE' ||
            upperNama === 'NO' ||
            upperNama === 'NO.'
          ) {
            continue;
          }

          const nama = rawNama.trim();

          // Extract or generate subject code (preserve user code verbatim)
          let kode = kodeIdx >= 0 && row[kodeIdx] !== undefined ? String(row[kodeIdx]).trim() : '';
          if (!kode || kode === '-') {
            kode = generateSubjectCode(nama) || `MP-${subjectsParsed.length + 1}`;
          }
          kode = kode.toUpperCase();

          // Extract KKTP values - exactly matches uploaded values without fabricated +1 or +3
          let kktpRaw = kktpIdx >= 0 && Number(row[kktpIdx]) > 0 ? Number(row[kktpIdx]) : defaultKktp;
          let kX = kktpXIdx >= 0 && Number(row[kktpXIdx]) > 0 ? Number(row[kktpXIdx]) : kktpRaw;
          let kXI = kktpXIIdx >= 0 && Number(row[kktpXIIdx]) > 0 ? Number(row[kktpXIIdx]) : kktpRaw;
          let kXII = kktpXIIIdx >= 0 && Number(row[kktpXIIIdx]) > 0 ? Number(row[kktpXIIIdx]) : kktpRaw;

          // Extract Teachers
          let rowTeachers: string[] = [];
          if (guruIdx >= 0 && row[guruIdx]) {
            const rawGuru = String(row[guruIdx]).trim();
            if (
              rawGuru &&
              !['BELUM DITENTUKAN', '-', 'NONE', 'BELUM ADA', 'TIDAK ADA', 'NULL'].includes(rawGuru.toUpperCase())
            ) {
              rowTeachers = rawGuru
                .split(/[,;\n\r/]+/)
                .map((g) => g.trim())
                .filter((g) => g.length > 0 && g !== '-');

              rowTeachers.forEach((g) => {
                discoveredTeachers.add(g);
              });
            }
          }

          // Extract Classes
          let rowClasses: string[] = [];
          if (kelasIdx >= 0 && row[kelasIdx]) {
            const rawKelas = String(row[kelasIdx]).trim();
            if (rawKelas && rawKelas.toLowerCase() !== 'semua' && rawKelas.toLowerCase() !== 'all') {
              const parsedClasses = rawKelas
                .split(/[,;\n\r/]+/)
                .map((k) => k.trim())
                .filter((k) => k.length > 0 && k !== '-');
              if (parsedClasses.length > 0) {
                rowClasses = parsedClasses;
                parsedClasses.forEach((c) => discoveredClasses.add(c));
              }
            }
          }

          // Check if this subject already exists in parsed list to merge multi-row timetables
          const existingSubjectIdx = subjectsParsed.findIndex(
            (s) => s.nama.toLowerCase().trim() === nama.toLowerCase().trim() && s.kode === kode
          );

          if (existingSubjectIdx >= 0) {
            // Merge teachers and classes additively so zero rows are lost from Excel
            const existing = subjectsParsed[existingSubjectIdx];
            const mergedTeachers = Array.from(new Set([...(existing.guruPengampu || []), ...rowTeachers]));
            const mergedClasses = Array.from(new Set([...(existing.kelasAjar || []), ...rowClasses]));

            const existingAssignments = [...(existing.guruAssignments || [])];
            rowTeachers.forEach((tName) => {
              const existingAssign = existingAssignments.find(
                (ga) => ga.teacherName.toLowerCase().trim() === tName.toLowerCase().trim()
              );
              if (existingAssign) {
                if (rowClasses.length > 0) {
                  existingAssign.kelasAjar = Array.from(new Set([...(existingAssign.kelasAjar || []), ...rowClasses]));
                }
              } else {
                existingAssignments.push({
                  teacherId: tName,
                  teacherName: tName,
                  kktp: kX,
                  kktpX: kX,
                  kktpXI: kXI,
                  kktpXII: kXII,
                  kelasAjar: rowClasses.length > 0 ? rowClasses : (state.classes || []).map((c) => c.nama),
                });
              }
            });

            subjectsParsed[existingSubjectIdx] = {
              ...existing,
              guruPengampu: mergedTeachers,
              kelasAjar: mergedClasses,
              guruAssignments: existingAssignments,
            };
          } else {
            // Build initial assignments
            const guruAssignments: TeacherSubjectAssignment[] = rowTeachers.map((gName) => ({
              teacherId: gName,
              teacherName: gName,
              kktp: kX,
              kktpX: kX,
              kktpXI: kXI,
              kktpXII: kXII,
              kelasAjar: rowClasses.length > 0 ? rowClasses : state.classes.map((c) => c.nama),
            }));

            const subjectItem: SubjectItem = {
              id: `sbj-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
              kode,
              nama,
              kktp: kX,
              kktpX: kX,
              kktpXI: kXI,
              kktpXII: kXII,
              guruPengampu: rowTeachers,
              guruAssignments,
              kelasAjar: rowClasses,
            };

            subjectsParsed.push(subjectItem);
          }
        }

        if (subjectsParsed.length === 0) {
          showToast(
            'Gagal Impor',
            'Tidak ada baris mata pelajaran valid yang dapat dibaca dari file Excel tersebut.',
            'warning'
          );
          return;
        }

        // Determine new teachers and new classes
        const existingTeacherNames = new Set(state.teachers.map((t) => t.nama.toLowerCase().trim()));
        const newTeachers = Array.from(discoveredTeachers).filter(
          (name) => !existingTeacherNames.has(name.toLowerCase().trim())
        );

        const existingClassNames = new Set(state.classes.map((c) => c.nama.toLowerCase().trim()));
        const newClasses = Array.from(discoveredClasses).filter(
          (name) => !existingClassNames.has(name.toLowerCase().trim())
        );

        setParsedExcelSubjects(subjectsParsed);
        setNewTeachersFound(newTeachers);
        setNewClassesFound(newClasses);
        setImportFileName(fileName);
        setImportMode('replace'); // Default to Replace All so dummy data is completely replaced
        setAutoRegisterTeachers(true);
        setAutoRegisterClasses(true);
        setIsImportPreviewOpen(true);
      } catch (err) {
        console.error('Error importing subjects excel:', err);
        showToast('Gagal Membaca File', 'Terjadi kesalahan saat memproses file Excel mata pelajaran.', 'error');
      } finally {
        e.target.value = ''; // Reset file input so user can re-upload if needed
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Handler to Confirm and Apply Excel Import to System
  const handleConfirmApplyImport = async () => {
    if (parsedExcelSubjects.length === 0) return;
    setIsApplyingImport(true);

    try {
      await importSubjectsComplete(
        parsedExcelSubjects,
        importMode,
        autoRegisterTeachers,
        autoRegisterClasses,
        newTeachersFound,
        newClassesFound
      );

      setIsImportPreviewOpen(false);
      setParsedExcelSubjects([]);
    } catch (err) {
      console.error('Error applying imported subjects:', err);
      showToast('Gagal Menerapkan', 'Terjadi kendala saat menyimpan mata pelajaran ke sistem.', 'error');
    } finally {
      setIsApplyingImport(false);
    }
  };

  // Batch Auto-Generate Codes for All Subjects
  const handleRegenerateAllSubjectCodes = async () => {
    if (!state.subjects || state.subjects.length === 0) return;

    let updatedCount = 0;
    for (const sbj of state.subjects) {
      const newCode = generateSubjectCode(sbj.nama);
      if (newCode && newCode !== sbj.kode) {
        await saveSubject({
          ...sbj,
          kode: newCode,
        });
        updatedCount++;
      }
    }

    if (updatedCount > 0) {
      showToast(
        'Kode Berhasil Digenerate!',
        `${updatedCount} kode mata pelajaran otomatis diperbarui sesuai nama standar.`,
        'success'
      );
    } else {
      showToast('Kode Sudah Sesuai', 'Seluruh kode mata pelajaran sudah rapi dan sesuai format standar.', 'info');
    }
  };

  // Class Handlers
  const handleAddNewClass = () => {
    setEditingClass({
      id: '',
      nama: '',
      fase: 'Fase E',
      waliKelas: teacherNames[0] || 'Belum Ditentukan',
      totalSiswa: 0,
    });
    setIsClassModalOpen(true);
  };

  const handleEditClass = (cls: ClassItem) => {
    setEditingClass({ ...cls });
    setIsClassModalOpen(true);
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    const classToSave = { ...editingClass };
    setActiveTab('classes');
    setIsClassModalOpen(false);
    setEditingClass(null);
    saveClass(classToSave);
  };

  // Subject Handlers
  const handleAddNewSubject = () => {
    const defaultKktp = 75;
    setEditingSubject({
      id: '',
      kode: '',
      nama: '',
      kktp: defaultKktp,
      kktpX: defaultKktp,
      kktpXI: defaultKktp + 1,
      kktpXII: defaultKktp + 3,
      kelasAjar: state.classes.map((c) => c.nama),
      guruPengampu: [],
      guruAssignments: [],
    });
    setSelectedTeacherToAdd('');
    setIsSubjectModalOpen(true);
  };

  const handleEditSubject = (sbj: SubjectItem) => {
    const baseKktp = sbj.kktp || 75;
    
    // Normalize existing guruAssignments or migrate from guruPengampu
    let assignments: TeacherSubjectAssignment[] = sbj.guruAssignments ? [...sbj.guruAssignments] : [];
    if (assignments.length === 0 && sbj.guruPengampu && sbj.guruPengampu.length > 0) {
      assignments = sbj.guruPengampu.map((gName) => {
        const teacherObj = state.teachers.find((t) => t.nama.toLowerCase() === gName.toLowerCase() || t.id === gName);
        return {
          teacherId: teacherObj?.id || `t-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
          teacherName: teacherObj?.nama || gName,
          nip: teacherObj?.nip || '',
          kktp: baseKktp,
          kktpX: sbj.kktpX ?? baseKktp,
          kktpXI: sbj.kktpXI ?? baseKktp,
          kktpXII: sbj.kktpXII ?? baseKktp,
          kelasAjar: sbj.kelasAjar || state.classes.map((c) => c.nama),
        };
      });
    }

    setEditingSubject({
      ...sbj,
      kktp: baseKktp,
      kktpX: sbj.kktpX ?? baseKktp,
      kktpXI: sbj.kktpXI ?? baseKktp,
      kktpXII: sbj.kktpXII ?? baseKktp,
      kelasAjar: sbj.kelasAjar && sbj.kelasAjar.length > 0 ? sbj.kelasAjar : state.classes.map((c) => c.nama),
      guruPengampu: sbj.guruPengampu || assignments.map((a) => a.teacherName),
      guruAssignments: assignments,
    });
    setSelectedTeacherToAdd('');
    setIsSubjectModalOpen(true);
  };

  const handleAddTeacherAssignment = () => {
    if (!editingSubject || !selectedTeacherToAdd) return;
    const teacherObj = state.teachers.find((t) => t.id === selectedTeacherToAdd || t.nama === selectedTeacherToAdd);
    if (!teacherObj) return;

    const currentAssignments = editingSubject.guruAssignments || [];
    const alreadyExists = currentAssignments.some(
      (a) => a.teacherId === teacherObj.id || a.teacherName.toLowerCase() === teacherObj.nama.toLowerCase()
    );

    if (alreadyExists) {
      showToast('Sudah Ditambahkan', `${teacherObj.nama} sudah terdaftar sebagai guru pengampu mapel ini.`, 'warning');
      return;
    }

    const baseKktp = editingSubject.kktp || 75;
    const newAssignment: TeacherSubjectAssignment = {
      teacherId: teacherObj.id,
      teacherName: teacherObj.nama,
      nip: teacherObj.nip || '',
      kktp: baseKktp,
      kktpX: editingSubject.kktpX ?? baseKktp,
      kktpXI: editingSubject.kktpXI ?? baseKktp,
      kktpXII: editingSubject.kktpXII ?? baseKktp,
      kelasAjar: editingSubject.kelasAjar && editingSubject.kelasAjar.length > 0 ? [...editingSubject.kelasAjar] : state.classes.map((c) => c.nama),
    };

    const updatedAssignments = [...currentAssignments, newAssignment];
    const updatedGuruPengampu = Array.from(new Set([...(editingSubject.guruPengampu || []), teacherObj.nama]));

    setEditingSubject({
      ...editingSubject,
      guruAssignments: updatedAssignments,
      guruPengampu: updatedGuruPengampu,
    });
    setExpandedTeacherId(teacherObj.id);
    setSelectedTeacherToAdd('');
    showToast('Guru Ditambahkan', `${teacherObj.nama} berhasil ditambahkan dengan penentuan KKTP mandiri.`, 'success');
  };

  const handleRemoveTeacherAssignment = (teacherId: string) => {
    if (!editingSubject) return;
    const updatedAssignments = (editingSubject.guruAssignments || []).filter((a) => a.teacherId !== teacherId);
    const updatedGuruPengampu = updatedAssignments.map((a) => a.teacherName);

    setEditingSubject({
      ...editingSubject,
      guruAssignments: updatedAssignments,
      guruPengampu: updatedGuruPengampu,
    });
  };

  const handleUpdateTeacherKktp = (
    teacherId: string,
    field: 'kktpX' | 'kktpXI' | 'kktpXII' | 'kktp',
    value: number
  ) => {
    if (!editingSubject) return;
    const updatedAssignments = (editingSubject.guruAssignments || []).map((a) => {
      if (a.teacherId === teacherId) {
        return {
          ...a,
          [field]: value,
          kktp: field === 'kktpX' ? value : a.kktp,
        };
      }
      return a;
    });

    setEditingSubject({
      ...editingSubject,
      guruAssignments: updatedAssignments,
    });
  };

  const handleSyncTeacherKktpToSubject = (teacherId: string) => {
    if (!editingSubject) return;
    const updatedAssignments = (editingSubject.guruAssignments || []).map((a) => {
      if (a.teacherId === teacherId) {
        return {
          ...a,
          kktp: editingSubject.kktp || 75,
          kktpX: editingSubject.kktpX || 75,
          kktpXI: editingSubject.kktpXI || 76,
          kktpXII: editingSubject.kktpXII || 78,
        };
      }
      return a;
    });

    setEditingSubject({
      ...editingSubject,
      guruAssignments: updatedAssignments,
    });
    showToast('KKTP Disinkronkan', 'Nilai KKTP guru berhasil disesuaikan dengan Standar Mapel.', 'info');
  };

  const handleToggleTeacherClass = (teacherId: string, className: string) => {
    if (!editingSubject) return;
    const updatedAssignments = (editingSubject.guruAssignments || []).map((a) => {
      if (a.teacherId === teacherId) {
        const currentClasses = a.kelasAjar || [];
        const exists = currentClasses.includes(className);
        const updated = exists ? currentClasses.filter((c) => c !== className) : [...currentClasses, className];
        return {
          ...a,
          kelasAjar: updated,
        };
      }
      return a;
    });

    setEditingSubject({
      ...editingSubject,
      guruAssignments: updatedAssignments,
    });
  };

  const handleSelectAllTeacherClasses = (teacherId: string) => {
    if (!editingSubject) return;
    const allNames = state.classes.map((c) => c.nama);
    const updatedAssignments = (editingSubject.guruAssignments || []).map((a) => {
      if (a.teacherId === teacherId) {
        return { ...a, kelasAjar: allNames };
      }
      return a;
    });

    setEditingSubject({
      ...editingSubject,
      guruAssignments: updatedAssignments,
    });
  };

  const handleClearTeacherClasses = (teacherId: string) => {
    if (!editingSubject) return;
    const updatedAssignments = (editingSubject.guruAssignments || []).map((a) => {
      if (a.teacherId === teacherId) {
        return { ...a, kelasAjar: [] };
      }
      return a;
    });

    setEditingSubject({
      ...editingSubject,
      guruAssignments: updatedAssignments,
    });
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;

    const finalGuruPengampu = (editingSubject.guruAssignments || []).map((a) => a.teacherName);

    // Compute union of all teacher kelasAjar so subject knows all taught classes across teachers
    const unionClasses = new Set<string>();
    (editingSubject.guruAssignments || []).forEach((ga) => {
      if (Array.isArray(ga.kelasAjar)) {
        ga.kelasAjar.forEach((cls) => unionClasses.add(cls));
      }
    });

    const finalKelasAjar = unionClasses.size > 0
      ? Array.from(unionClasses)
      : (editingSubject.kelasAjar && editingSubject.kelasAjar.length > 0
          ? editingSubject.kelasAjar
          : state.classes.map((c) => c.nama));

    const subjectToSave: SubjectItem = {
      ...editingSubject,
      kktp: editingSubject.kktpX || editingSubject.kktp || 75,
      kktpX: editingSubject.kktpX || 75,
      kktpXI: editingSubject.kktpXI || 75,
      kktpXII: editingSubject.kktpXII || 75,
      kelasAjar: finalKelasAjar,
      guruPengampu: finalGuruPengampu,
      guruAssignments: editingSubject.guruAssignments || [],
    };

    setActiveTab('subjects');
    setSearchQuery('');
    setIsSubjectModalOpen(false);
    setEditingSubject(null);
    saveSubject(subjectToSave);
  };

  // Bulk Handlers for Subjects
  const handleToggleSelectAllSubjects = () => {
    if (selectedSubjectIds.size === state.subjects.length && state.subjects.length > 0) {
      setSelectedSubjectIds(new Set());
    } else {
      setSelectedSubjectIds(new Set(state.subjects.map((s) => s.id)));
    }
  };

  const handleToggleSelectOneSubject = (id: string) => {
    setSelectedSubjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenBulkSubjectModal = () => {
    const defaultKktp = 75;
    setBulkKktpX(defaultKktp);
    setBulkKktpXI(defaultKktp + 1);
    setBulkKktpXII(defaultKktp + 3);
    setBulkApplyKktp(true);
    setBulkKelasAjarMode('all');
    setBulkKelasAjarList(state.classes.map((c) => c.nama));
    setIsBulkSubjectModalOpen(true);
  };

  const handleApplyBulkSubjectChanges = async () => {
    if (selectedSubjectIds.size === 0) return;
    const targetSubjects = state.subjects.filter((s) => selectedSubjectIds.has(s.id));
    if (targetSubjects.length === 0) return;

    const batchToUpdate: SubjectItem[] = targetSubjects.map((sbj) => ({
      ...sbj,
      kktp: bulkApplyKktp ? bulkKktpX : sbj.kktp,
      kktpX: bulkApplyKktp ? bulkKktpX : (sbj.kktpX || sbj.kktp),
      kktpXI: bulkApplyKktp ? bulkKktpXI : (sbj.kktpXI || sbj.kktp),
      kktpXII: bulkApplyKktp ? bulkKktpXII : (sbj.kktpXII || sbj.kktp),
      kelasAjar:
        bulkKelasAjarMode === 'all'
          ? state.classes.map((c) => c.nama)
          : bulkKelasAjarMode === 'custom'
          ? bulkKelasAjarList
          : sbj.kelasAjar,
    }));

    await saveSubjectsBatch(batchToUpdate);
    setIsBulkSubjectModalOpen(false);
    setSelectedSubjectIds(new Set());
    showToast(
      'Pembaruan Massal Berhasil',
      `Berhasil memperbarui nilai KKTP (X: ${bulkKktpX}, XI: ${bulkKktpXI}, XII: ${bulkKktpXII}) untuk ${batchToUpdate.length} mata pelajaran.`,
      'success'
    );
  };

  const handleBulkDeleteSubjects = async () => {
    if (selectedSubjectIds.size === 0) return;
    const count = selectedSubjectIds.size;
    if (!window.confirm(`Yakin ingin menghapus ${count} mata pelajaran yang dipilih sekaligus?`)) return;

    await deleteSubjectsBatch(Array.from(selectedSubjectIds));
    setSelectedSubjectIds(new Set());
  };

  // Filtered subjects for search
  const filteredSubjects = state.subjects.filter((sbj) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchName = sbj.nama.toLowerCase().includes(q);
    const matchCode = sbj.kode.toLowerCase().includes(q);
    const matchTeacher =
      (sbj.guruPengampu && sbj.guruPengampu.some((g) => g.toLowerCase().includes(q))) ||
      (sbj.guruAssignments && sbj.guruAssignments.some((a) => a.teacherName.toLowerCase().includes(q)));
    return matchName || matchCode || matchTeacher;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Data Kelas, Mapel & KKTP
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manajemen Rombel, Alokasi Guru Pengampu & Penentuan KKTP per Tingkat Kelas (X, XI, XII)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'classes' ? (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleToggleBatchEditClasses}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all ${
                  isBatchEditClasses
                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold ring-2 ring-amber-400'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>{isBatchEditClasses ? 'Matikan Mode Edit Massal' : 'Edit Kelas Sekaligus'}</span>
              </button>

              <button
                onClick={handleAddNewClass}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Kelas Baru</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 sm:items-end">
              {/* Baris Utama - Tambah Mapel & Edit Massal */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAddNewSubject}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                >
                  <Plus className="w-4 h-4 text-indigo-400" />
                  <span>Tambah Mapel Baru</span>
                </button>

                <button
                  type="button"
                  onClick={handleToggleBatchEditSubjects}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all active:scale-95 ${
                    isBatchEditSubjects
                      ? 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-extrabold ring-2 ring-amber-400'
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <Zap className="w-4 h-4" />
                  <span>{isBatchEditSubjects ? 'Matikan Mode Edit Massal' : 'Edit Mapel Sekaligus'}</span>
                </button>
              </div>

              {/* Baris Sekunder (Diletakkan di Bawahnya) - Auto Kode, Impor/Ekspor & Template */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 w-full sm:w-auto sm:justify-end">
                <button
                  onClick={handleRegenerateAllSubjectCodes}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition-all cursor-pointer"
                  title="Generate otomatis seluruh kode mata pelajaran sesuai format standar"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Auto Kode Mapel</span>
                </button>

                <label
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                  title="Impor Data Mata Pelajaran dari Excel"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Impor Excel</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleImportSubjectsExcel}
                    className="hidden"
                  />
                </label>

                <button
                  onClick={() => exportSubjectsToExcel(state.subjects, state.schoolInfo.namaSekolah)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-all cursor-pointer"
                  title="Ekspor Seluruh Data Mata Pelajaran Aktif ke File Excel"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Ekspor Excel</span>
                </button>

                <button
                  onClick={downloadSubjectTemplateExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-all cursor-pointer"
                  title="Unduh Format / Template Excel Impor Data Mata Pelajaran"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Format Excel</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 gap-4 flex-wrap pb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'classes'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Kelas & Wali Kelas ({state.classes.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'subjects'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Mata Pelajaran ({state.subjects.length})</span>
          </button>
        </div>

        {activeTab === 'subjects' && (
          <div className="relative min-w-[240px] max-w-xs flex-1 mb-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari mapel, kode, atau guru pengampu..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Floating Mode Edit Kelas Sekaligus Banner */}
      <AnimatePresence>
        {activeTab === 'classes' && isBatchEditClasses && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-4 bg-gradient-to-r from-amber-600 via-amber-700 to-indigo-900 text-white rounded-2xl shadow-xl border border-amber-400/50 flex flex-wrap items-center justify-between gap-3 mb-4"
          >
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black text-xs shadow-sm">
                <Edit2 className="w-4 h-4 text-slate-950" />
              </span>
              <div>
                <span className="text-xs font-black text-amber-200 block">
                  Mode Edit Rombel Kelas Sekaligus Aktif ({state.classes.length} Kelas)
                </span>
                <span className="text-[11px] text-slate-200">
                  Ubah nama rombel, fase kurikulum, dan wali kelas secara langsung pada kartu di bawah ini.
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleSaveAllBatchClasses}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-black shadow-md cursor-pointer transition-all active:scale-95"
              >
                <Save className="w-4 h-4 text-slate-950" />
                <span>Simpan Semua Perubahan ({state.classes.length} Kelas)</span>
              </button>

              <button
                type="button"
                onClick={handleToggleBatchEditClasses}
                className="px-3.5 py-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors border border-slate-700"
              >
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB 1: Classes Grid */}
      {activeTab === 'classes' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.classes.map((cls) => {
            const studentCount = state.students.filter((s) => isClassMatch(cls.nama, s.kelas)).length;
            const curEdit = batchClassesMap[cls.id] || cls;

            if (isBatchEditClasses) {
              return (
                <div
                  key={cls.id}
                  className="p-5 rounded-3xl bg-amber-50/50 border-2 border-amber-300 shadow-md flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                      <span className="text-xs font-black text-amber-900 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Edit Kelas Massal
                      </span>
                      <span className="text-[10px] text-amber-800 font-bold">
                        {studentCount} Siswa Terdaftar
                      </span>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Nama Rombel / Kelas</label>
                      <input
                        type="text"
                        value={curEdit.nama || ''}
                        onChange={(e) => handleUpdateBatchClassField(cls.id, 'nama', e.target.value)}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Fase Kurikulum</label>
                      <select
                        value={curEdit.fase || 'Fase E'}
                        onChange={(e) => handleUpdateBatchClassField(cls.id, 'fase', e.target.value as any)}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      >
                        <option value="Fase E">Fase E (Kelas X)</option>
                        <option value="Fase F">Fase F (Kelas XI & XII)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold text-slate-700 uppercase">Wali Kelas</label>
                      <select
                        value={curEdit.waliKelas || ''}
                        onChange={(e) => handleUpdateBatchClassField(cls.id, 'waliKelas', e.target.value)}
                        className="w-full mt-0.5 px-2.5 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                      >
                        {teacherNames.map((tName, i) => (
                          <option key={i} value={tName}>
                            {tName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200 flex justify-end">
                    <span className="text-[10px] text-amber-900 font-extrabold bg-amber-200 px-2 py-0.5 rounded-md">
                      Siap Disimpan
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={cls.id}
                className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 leading-tight">
                        Kelas {cls.nama}
                      </h4>
                      <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {cls.fase} Pembelajaran Mendalam
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-slate-900">{studentCount}</span>
                      <span className="text-[10px] text-slate-500 block">Siswa</span>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1 my-3 border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Wali Kelas:</div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                      <span className="truncate">{cls.waliKelas || 'Belum Dipilih'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => handleEditClass(cls)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => deleteClass(cls.id)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl cursor-pointer"
                    title="Hapus Kelas"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Subjects Table */}
      {activeTab === 'subjects' && (
        <div className="space-y-3">
          {/* Floating Batch Action Bar for Subjects */}
          <AnimatePresence>
            {selectedSubjectIds.size > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="p-3.5 bg-slate-900 text-white rounded-2xl shadow-xl border border-indigo-500/40 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-indigo-600 flex items-center justify-center font-black text-xs text-white shadow-sm">
                    {selectedSubjectIds.size}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {selectedSubjectIds.size} Mata Pelajaran Terpilih
                    </span>
                    <span className="text-[11px] text-slate-400">
                      dari total {state.subjects.length} mata pelajaran terdaftar
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleOpenBulkSubjectModal}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                    <span>Terapkan KKTP / Rombel Massal</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBulkDeleteSubjects}
                    className="flex items-center gap-1 px-3 py-1.5 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-xs cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Terpilih</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedSubjectIds(new Set())}
                    className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer font-medium"
                  >
                    Batal
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Main Clean Responsive Table */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs text-slate-600 min-w-[860px]">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={state.subjects.length > 0 && selectedSubjectIds.size === state.subjects.length}
                        onChange={handleToggleSelectAllSubjects}
                        title="Pilih Semua Mata Pelajaran"
                        className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                      />
                    </th>
                    <th className="py-3 px-3 w-24">Kode</th>
                    <th className="py-3 px-4 w-72">Mata Pelajaran</th>
                    <th className="py-3 px-4 min-w-[220px]">Guru Pengampu</th>
                    <th className="py-3 px-4 w-52">Cakupan Rombel</th>
                    <th className="py-3 px-3 w-20 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredSubjects.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                        {searchQuery
                          ? 'Tidak ada mata pelajaran atau guru yang cocok dengan pencarian.'
                          : 'Belum ada data mata pelajaran. Klik "Tambah Mapel" atau "Impor Excel" untuk memulai.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSubjects.map((sbj) => {
                      const isSelected = selectedSubjectIds.has(sbj.id);
                      const teachersList = sbj.guruAssignments && sbj.guruAssignments.length > 0
                        ? sbj.guruAssignments
                        : (sbj.guruPengampu || []).map((name) => ({
                            teacherId: name,
                            teacherName: name,
                          }));

                      return (
                        <tr
                          key={sbj.id}
                          className={`transition-colors ${
                            isSelected ? 'bg-indigo-50/70 hover:bg-indigo-50' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <td className="py-3 px-3 text-center align-top pt-3.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectOneSubject(sbj.id)}
                              className="w-4 h-4 rounded-md text-indigo-600 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
                            />
                          </td>
                          <td className="py-3 px-3 align-top pt-3.5">
                            <span className="font-mono font-extrabold text-indigo-900 bg-indigo-50 px-2 py-1 rounded-md border border-indigo-200/80 text-[11px] inline-block shadow-2xs">
                              {sbj.kode}
                            </span>
                          </td>
                          <td className="py-3 px-4 align-top pt-3.5">
                            <div className="font-bold text-slate-900 text-xs leading-snug">{sbj.nama}</div>
                            {sbj.fase && (
                              <span className="text-[10px] text-slate-400 block font-normal mt-0.5">
                                {sbj.fase}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top pt-3">
                            {teachersList.length === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">
                                Belum ada guru ditentukan
                              </span>
                            ) : (
                              <div className="space-y-2">
                                {teachersList.map((t, idx) => {
                                  const tClasses = (t as any).kelasAjar || [];
                                  const isAll = tClasses.length === 0 || (state.classes.length > 0 && tClasses.length === state.classes.length);

                                  return (
                                    <div
                                      key={idx}
                                      className="p-2 bg-slate-50/90 border border-slate-200/80 rounded-xl text-[11px] space-y-1 shadow-2xs"
                                    >
                                      <div className="flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                                          <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-[9px] shrink-0 shadow-2xs">
                                            {t.teacherName.charAt(0).toUpperCase()}
                                          </div>
                                          <span className="truncate leading-tight font-extrabold text-slate-900">{t.teacherName}</span>
                                        </div>
                                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-800 font-extrabold text-[9.5px]">
                                          {isAll ? 'Semua Kelas' : `${tClasses.length} Kelas`}
                                        </span>
                                      </div>

                                      {/* Specific assigned classes per teacher */}
                                      <div className="flex flex-wrap gap-1 pt-0.5">
                                        {!isAll ? (
                                          tClasses.map((kName: string) => (
                                            <span
                                              key={kName}
                                              className="px-1.5 py-0.2 rounded bg-white text-indigo-700 font-bold text-[9px] border border-indigo-200 shadow-2xs"
                                            >
                                              Kelas {kName}
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[9.5px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                            Semua Rombel ({state.classes.length > 0 ? state.classes.length : 'Semua'} Kelas)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 align-top pt-3.5">
                            {!sbj.kelasAjar ||
                            sbj.kelasAjar.length === 0 ||
                            (state.classes.length > 0 && sbj.kelasAjar.length === state.classes.length) ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200 inline-block">
                                Semua Tingkat {state.classes.length > 0 ? `(${state.classes.length} Rombel)` : '(X, XI, XII)'}
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-1 max-w-[190px]">
                                {sbj.kelasAjar.map((k) => (
                                  <span
                                    key={k}
                                    className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-[9px] border border-indigo-200"
                                  >
                                    {k}
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 align-top pt-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleEditSubject(sbj)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                                title="Edit Mapel & Guru Pengampu"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-indigo-600" />
                              </button>
                              <button
                                onClick={() => deleteSubject(sbj.id)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer transition-colors"
                                title="Hapus Mapel"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Class Modal */}
      <AnimatePresence>
        {isClassModalOpen && editingClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden text-slate-800 my-auto"
            >
              {/* Pinned Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/20">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">
                      {editingClass.id ? 'Edit Data Rombel Kelas' : 'Tambah Rombel Kelas Baru'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Konfigurasi nama rombel, fase kurikulum, dan wali kelas
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsClassModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveClass} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1 min-h-0 overscroll-contain">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Kelas (Rombel)</label>
                    <input
                      type="text"
                      required
                      value={editingClass.nama}
                      onChange={(e) => setEditingClass({ ...editingClass, nama: e.target.value })}
                      placeholder="Contoh: X.1 atau XI.2"
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Fase Kurikulum</label>
                    <select
                      value={editingClass.fase}
                      onChange={(e) => setEditingClass({ ...editingClass, fase: e.target.value as any })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      <option value="Fase E">Fase E (Kelas X)</option>
                      <option value="Fase F">Fase F (Kelas XI & XII)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Pilih Wali Kelas (Dari Guru Terdaftar)</label>
                    <select
                      value={editingClass.waliKelas}
                      onChange={(e) => setEditingClass({ ...editingClass, waliKelas: e.target.value })}
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    >
                      {teacherNames.map((tName, i) => (
                        <option key={i} value={tName}>
                          {tName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Pinned Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsClassModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200/70 rounded-xl font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Kelas</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subject Modal */}
      <AnimatePresence>
        {isSubjectModalOpen && editingSubject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden text-slate-800 my-auto"
            >
              {/* Pinned Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/20">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm">
                      {editingSubject.id ? 'Edit Mata Pelajaran, KKTP & Guru Pengampu' : 'Tambah Mata Pelajaran Baru'}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Konfigurasi nama mapel, kode otomatis, KKTP per tingkat kelas, dan penentuan KKTP khusus guru pengampu
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSubjectModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveSubject} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Scrollable Form Body */}
                <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1 min-h-0 overscroll-contain">
                  {/* Basic Mapel Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Nama Mata Pelajaran</label>
                      <input
                        type="text"
                        required
                        value={editingSubject.nama}
                        onChange={(e) => {
                          const newName = e.target.value;
                          const autoCode = generateSubjectCode(newName);
                          setEditingSubject({
                            ...editingSubject,
                            nama: newName,
                            kode: autoCode || editingSubject.kode,
                          });
                        }}
                        placeholder="Contoh: Pendidikan Antikorupsi"
                        className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-semibold text-slate-700">Kode Mapel</label>
                        <button
                          type="button"
                          onClick={() => {
                            const autoCode = generateSubjectCode(editingSubject.nama);
                            setEditingSubject({ ...editingSubject, kode: autoCode });
                          }}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Generate Ulang</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        value={editingSubject.kode}
                        onChange={(e) => setEditingSubject({ ...editingSubject, kode: e.target.value })}
                        placeholder="Contoh: PAK, PJOK, MTK, INF"
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-extrabold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  {/* Section: Guru Pengampu Mata Pelajaran */}
                  <div className="p-4 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/40 border border-indigo-200 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <UserCheck className="w-4 h-4 text-indigo-600" />
                          <span>Guru Pengampu Mata Pelajaran</span>
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Tentukan guru yang bertanggung jawab mengampu mata pelajaran ini
                        </p>
                      </div>

                      {/* Dropdown to add teacher */}
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTeacherToAdd}
                          onChange={(e) => setSelectedTeacherToAdd(e.target.value)}
                          className="p-1.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">-- Pilih Guru dari Akun Terdaftar --</option>
                          {state.teachers.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.nama} {t.nip ? `(${t.nip})` : ''}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          disabled={!selectedTeacherToAdd}
                          onClick={handleAddTeacherAssignment}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed shadow-xs shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambahkan</span>
                        </button>
                      </div>
                    </div>

                    {/* List of Assigned Teachers with Per-Teacher Class Selection */}
                    {(!editingSubject.guruAssignments || editingSubject.guruAssignments.length === 0) ? (
                      <div className="p-3 bg-white border border-dashed border-indigo-200 rounded-xl text-center text-slate-400 text-[11px]">
                        Belum ada guru pengampu yang dialokasikan ke mata pelajaran ini. Pilih nama guru di atas untuk menambahkan.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {editingSubject.guruAssignments.map((ga) => {
                          const teacherClasses = ga.kelasAjar || [];
                          const isAllClasses = teacherClasses.length === state.classes.length && state.classes.length > 0;

                          return (
                            <div
                              key={ga.teacherId}
                              className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2.5"
                            >
                              <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs shrink-0">
                                    {ga.teacherName.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-900 text-xs block leading-tight">
                                      {ga.teacherName}
                                    </span>
                                    <span className="text-[10px] text-slate-400">
                                      {ga.nip ? `NIP: ${ga.nip}` : 'Guru Terdaftar'}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      isAllClasses
                                        ? handleClearTeacherClasses(ga.teacherId)
                                        : handleSelectAllTeacherClasses(ga.teacherId)
                                    }
                                    className="px-2 py-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
                                    title="Pilih atau kosongkan semua kelas untuk guru ini"
                                  >
                                    {isAllClasses ? 'Kosongkan Kelas' : 'Pilih Semua Kelas'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTeacherAssignment(ga.teacherId)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer transition-colors"
                                    title="Hapus Guru Pengampu Ini"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Per-Teacher Class Selector Grid */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-[10.5px] font-bold text-slate-700">
                                  <span>Pilihan Kelas Ajar khusus {ga.teacherName}:</span>
                                  <span className="text-indigo-600 font-extrabold">
                                    {teacherClasses.length > 0
                                      ? `${teacherClasses.length} dari ${state.classes.length} Rombel`
                                      : 'Belum Ada Kelas (Klik Pilihan Di Bawah)'}
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-32 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-xl">
                                  {state.classes.map((cls) => {
                                    const isSelected = teacherClasses.includes(cls.nama);
                                    return (
                                      <button
                                        key={cls.id}
                                        type="button"
                                        onClick={() => handleToggleTeacherClass(ga.teacherId, cls.nama)}
                                        className={`p-1.5 rounded-lg border text-left flex items-center justify-between transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs'
                                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 font-medium'
                                        }`}
                                      >
                                        <span className="text-[11px] truncate">Kelas {cls.nama}</span>
                                        {isSelected && <Check className="w-3 h-3 text-white shrink-0 ml-1" />}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 3. Target Peserta Didik per Guru (All Students vs Selected Students for Religious/Elective subjects) */}
                              <div className="space-y-2 pt-2 border-t border-slate-100">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-slate-700 text-[10.5px]">Target Peserta Didik:</span>
                                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updatedAssignments = (editingSubject.guruAssignments || []).map((a) =>
                                          a.teacherId === ga.teacherId
                                            ? { ...a, modeSiswa: 'SEMUA' as const, studentIds: [] }
                                            : a
                                        );
                                        setEditingSubject({ ...editingSubject, guruAssignments: updatedAssignments });
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold cursor-pointer transition-all ${
                                        (ga.modeSiswa || 'SEMUA') === 'SEMUA'
                                          ? 'bg-white text-slate-900 shadow-2xs'
                                          : 'text-slate-500 hover:text-slate-700'
                                      }`}
                                    >
                                      Semua Siswa di Kelas
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Auto-detect matches based on religion if religion matches subject name
                                        const subName = editingSubject.nama || '';
                                        let defaultAgama: any = 'ALL';
                                        if (subName.toLowerCase().includes('islam')) defaultAgama = 'Islam';
                                        else if (subName.toLowerCase().includes('kristen')) defaultAgama = 'Kristen';
                                        else if (subName.toLowerCase().includes('katolik')) defaultAgama = 'Katolik';
                                        else if (subName.toLowerCase().includes('hindu')) defaultAgama = 'Hindu';
                                        else if (subName.toLowerCase().includes('buddha')) defaultAgama = 'Buddha';
                                        else if (subName.toLowerCase().includes('khonghucu')) defaultAgama = 'Khonghucu';

                                        const autoSelectIds = state.students
                                          .filter((s) => teacherClasses.includes(s.kelas) && (defaultAgama === 'ALL' || s.agama === defaultAgama))
                                          .map((s) => s.id);

                                        const updatedAssignments = (editingSubject.guruAssignments || []).map((a) =>
                                          a.teacherId === ga.teacherId
                                            ? { ...a, modeSiswa: 'BEBERAPA' as const, targetAgama: defaultAgama, studentIds: autoSelectIds }
                                            : a
                                        );
                                        setEditingSubject({ ...editingSubject, guruAssignments: updatedAssignments });
                                      }}
                                      className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold cursor-pointer transition-all ${
                                        ga.modeSiswa === 'BEBERAPA'
                                          ? 'bg-indigo-600 text-white shadow-2xs'
                                          : 'text-slate-500 hover:text-slate-700'
                                      }`}
                                    >
                                      Siswa Tertentu (Agama / Selektif)
                                    </button>
                                  </div>
                                </div>

                                {ga.modeSiswa === 'BEBERAPA' && (
                                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-[11px] space-y-2.5">
                                    {/* Agama Auto-Filter Sorter */}
                                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                                      <span className="font-bold text-slate-600">Saring Agama:</span>
                                      <select
                                        value={ga.targetAgama || 'ALL'}
                                        onChange={(e) => {
                                          const newAgama = e.target.value as any;
                                          const autoSelectIds = state.students
                                            .filter((s) => teacherClasses.includes(s.kelas) && (newAgama === 'ALL' || s.agama === newAgama))
                                            .map((s) => s.id);

                                          const updatedAssignments = (editingSubject.guruAssignments || []).map((a) =>
                                            a.teacherId === ga.teacherId
                                              ? { ...a, targetAgama: newAgama, studentIds: autoSelectIds }
                                              : a
                                          );
                                          setEditingSubject({ ...editingSubject, guruAssignments: updatedAssignments });
                                          showToast('Filter Diterapkan', `Siswa agama ${newAgama} berhasil disaring otomatis.`, 'info');
                                        }}
                                        className="p-1 text-[10.5px] bg-white border border-slate-300 rounded-lg font-bold text-slate-800 focus:outline-hidden"
                                      >
                                        <option value="ALL">Semua Agama</option>
                                        {['Islam', 'Kristen', 'Katolik', 'Hindu', 'Buddha', 'Khonghucu'].map((ag) => (
                                          <option key={ag} value={ag}>{ag}</option>
                                        ))}
                                      </select>
                                    </div>

                                    {/* Student checkboxes */}
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                        <span>Daftar Siswa Kelas Terpilih ({state.students.filter(s => teacherClasses.includes(s.kelas)).length} total):</span>
                                        <span className="text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                          {(ga.studentIds || []).length} Siswa Terpilih
                                        </span>
                                      </div>

                                      <div className="max-h-36 overflow-y-auto bg-white p-2 rounded-lg border border-slate-200 divide-y divide-slate-100">
                                        {state.students
                                          .filter((s) => teacherClasses.includes(s.kelas))
                                          .map((student) => {
                                            const isStudentSelected = (ga.studentIds || []).includes(student.id);
                                            return (
                                              <label
                                                key={student.id}
                                                className={`flex items-center justify-between py-1.5 px-1 cursor-pointer transition-colors ${
                                                  isStudentSelected ? 'bg-indigo-50/40 font-bold' : 'hover:bg-slate-50'
                                                }`}
                                              >
                                                <div className="flex items-center gap-1.5">
                                                  <input
                                                    type="checkbox"
                                                    checked={isStudentSelected}
                                                    onChange={() => {
                                                      const currentIds = ga.studentIds || [];
                                                      const updatedIds = isStudentSelected
                                                        ? currentIds.filter((id) => id !== student.id)
                                                        : [...currentIds, student.id];

                                                      const updatedAssignments = (editingSubject.guruAssignments || []).map((a) =>
                                                        a.teacherId === ga.teacherId
                                                          ? { ...a, studentIds: updatedIds }
                                                          : a
                                                      );
                                                      setEditingSubject({ ...editingSubject, guruAssignments: updatedAssignments });
                                                    }}
                                                    className="accent-indigo-600 rounded w-3.5 h-3.5 cursor-pointer"
                                                  />
                                                  <span className="text-slate-800 text-[11px] truncate max-w-[180px]">{student.nama}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-mono">
                                                  {student.kelas} ({student.agama || '-'})
                                                </span>
                                              </label>
                                            );
                                          })}
                                        {state.students.filter(s => teacherClasses.includes(s.kelas)).length === 0 && (
                                          <p className="text-[10.5px] text-slate-400 italic text-center py-4">
                                            Tidak ada siswa ditemukan di kelas ajar terpilih.
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Standar Interval KKTP Kurikulum Merdeka Banner */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200/80 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Standar Interval KKTP Kurikulum Merdeka</span>
                    </div>
                    <p className="text-[11px] text-slate-700 leading-relaxed">
                      Sesuai regulasi Kurikulum Merdeka, KKTP tidak lagi menggunakan KKM angka kaku per mata pelajaran. KKTP digunakan sebagai interval acuan nasional saat mengoreksi jawaban siswa:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] font-semibold text-center">
                      <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
                        0 - 60: Kurang (Remedial)
                      </div>
                      <div className="p-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-300">
                        61 - 70: Cukup (Penguatan)
                      </div>
                      <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                        71 - 80: Baik (Tuntas)
                      </div>
                      <div className="p-2 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200">
                        81 - 100: Sangat Baik
                      </div>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block font-bold text-slate-700">
                        Pilih Cakupan Rombel Kelas ({editingSubject.kelasAjar?.length || 0} dari {state.classes.length} Rombel)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const allClassNames = state.classes.map((c) => c.nama);
                          const currentSelected = editingSubject.kelasAjar || [];
                          const isAllSelected = currentSelected.length === state.classes.length;
                          setEditingSubject({
                            ...editingSubject,
                            kelasAjar: isAllSelected ? [] : allClassNames,
                          });
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <Check className="w-3 h-3 text-indigo-600" />
                        <span>
                          {editingSubject.kelasAjar?.length === state.classes.length
                            ? 'Batalkan Pilih Semua'
                            : 'Pilih Semua Kelas'}
                        </span>
                      </button>
                    </div>

                    {state.classes.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
                        Belum ada data rombel kelas terdaftar. Silakan tambahkan data kelas pada tab Rombel Kelas terlebih dahulu.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-36 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-2xl">
                        {state.classes.map((cls) => {
                          const isSelected = (editingSubject.kelasAjar || []).includes(cls.nama);
                          return (
                            <button
                              key={cls.id}
                              type="button"
                              onClick={() => {
                                const current = editingSubject.kelasAjar || [];
                                const updated = isSelected
                                  ? current.filter((c) => c !== cls.nama)
                                  : [...current, cls.nama];
                                setEditingSubject({ ...editingSubject, kelasAjar: updated });
                              }}
                              className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs font-bold ring-2 ring-indigo-300'
                                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 font-medium'
                              }`}
                            >
                              <div className="min-w-0 pr-1">
                                <div className="text-xs truncate font-bold">Kelas {cls.nama}</div>
                                <div className={`text-[9px] ${isSelected ? 'text-indigo-200' : 'text-slate-400'}`}>
                                  {cls.fase}
                                </div>
                              </div>
                              {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Pinned Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSubjectModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200/70 rounded-xl font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>Simpan Mapel, KKTP & Guru</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Subject Edit Modal ("Terapkan ke Semua") */}
      <AnimatePresence>
        {isBulkSubjectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden text-slate-800 my-auto"
            >
              {/* Pinned Header */}
              <div className="p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/20">
                    <Zap className="w-5 h-5 fill-indigo-400 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">Terapkan Pengaturan ke Mata Pelajaran Terpilih</h3>
                    <p className="text-[10px] text-slate-400">
                      Perbarui nilai KKTP (X, XI, XII) atau cakupan rombel sekaligus ke {selectedSubjectIds.size} mapel
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsBulkSubjectModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Scrollable Body */}
                <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
                  {/* KKTP Batch Config */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bulkApplyKktp}
                          onChange={(e) => setBulkApplyKktp(e.target.checked)}
                          className="w-4 h-4 rounded-md text-indigo-600 accent-indigo-600 cursor-pointer"
                        />
                        <span>Terapkan Target KKTP per Tingkat Kelas</span>
                      </label>
                    </div>

                    {bulkApplyKktp && (
                      <div className="grid grid-cols-3 gap-2.5 pt-1">
                        <div className="p-2.5 bg-white border border-blue-200 rounded-xl shadow-2xs">
                          <div className="text-[10px] font-extrabold text-blue-900 mb-1">KKTP Kelas X</div>
                          <input
                            type="number"
                            min="50"
                            max="100"
                            value={bulkKktpX}
                            onChange={(e) => setBulkKktpX(Number(e.target.value))}
                            className="w-full p-2 bg-blue-50/50 border border-blue-200 rounded-lg text-xs font-black text-center text-blue-950 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                          />
                        </div>
                        <div className="p-2.5 bg-white border border-indigo-200 rounded-xl shadow-2xs">
                          <div className="text-[10px] font-extrabold text-indigo-900 mb-1">KKTP Kelas XI</div>
                          <input
                            type="number"
                            min="50"
                            max="100"
                            value={bulkKktpXI}
                            onChange={(e) => setBulkKktpXI(Number(e.target.value))}
                            className="w-full p-2 bg-indigo-50/50 border border-indigo-200 rounded-lg text-xs font-black text-center text-indigo-950 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                          />
                        </div>
                        <div className="p-2.5 bg-white border border-purple-200 rounded-xl shadow-2xs">
                          <div className="text-[10px] font-extrabold text-purple-900 mb-1">KKTP Kelas XII</div>
                          <input
                            type="number"
                            min="50"
                            max="100"
                            value={bulkKktpXII}
                            onChange={(e) => setBulkKktpXII(Number(e.target.value))}
                            className="w-full p-2 bg-purple-50/50 border border-purple-200 rounded-lg text-xs font-black text-center text-purple-950 focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Class Batch Config */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                    <label className="block font-bold text-slate-800">Atur Cakupan Rombel Kelas</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setBulkKelasAjarMode('all')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          bulkKelasAjarMode === 'all'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Semua Rombel ({state.classes.length} Kelas)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBulkKelasAjarMode('none')}
                        className={`p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          bulkKelasAjarMode === 'none'
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        Pertahankan Rombel Saat Ini
                      </button>
                    </div>
                  </div>
                </div>

                {/* Pinned Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsBulkSubjectModalOpen(false)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-200/70 rounded-xl font-semibold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyBulkSubjectChanges}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Terapkan ke {selectedSubjectIds.size} Mapel</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Pratinjau & Konfirmasi Impor Excel Mata Pelajaran */}
      <AnimatePresence>
        {isImportPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden my-auto"
            >
              {/* Header */}
              <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      Konfirmasi & Pratinjau Impor Mata Pelajaran
                    </h3>
                    <p className="text-xs text-emerald-100 flex items-center gap-1.5 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{importFileName}</span>
                      <span>•</span>
                      <span className="font-semibold">{parsedExcelSubjects.length} Mata Pelajaran Terbaca</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsImportPreviewOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-xl text-white transition-colors cursor-pointer"
                  disabled={isApplyingImport}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(92vh-150px)]">
                {/* Mode Selector */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                    Pilih Metode Penyimpanan ke Sistem:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label
                      className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                        importMode === 'replace'
                          ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        value="replace"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="mt-1 w-4 h-4 text-emerald-600 accent-emerald-600 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            Ganti Semua & Bersihkan Dummy
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-extrabold text-[9px]">
                            Direkomendasikan
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Hapus seluruh mata pelajaran lama/dummy dan simpan murni <strong>{parsedExcelSubjects.length} mapel</strong> dari file Excel ini. Data mapel di sistem akan 100% identik dengan file Anda.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 cursor-pointer transition-all ${
                        importMode === 'merge'
                          ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="importMode"
                        value="merge"
                        checked={importMode === 'merge'}
                        onChange={() => setImportMode('merge')}
                        className="mt-1 w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            Gabungkan & Perbarui (Merge)
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Pertahankan mata pelajaran yang sudah ada di sistem dan tambahkan mapel baru dari file Excel ini.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Additional Synchronization Options */}
                {(newTeachersFound.length > 0 || newClassesFound.length > 0) && (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Sinkronisasi Otomatis Terdeteksi:</span>
                    </div>

                    {newTeachersFound.length > 0 && (
                      <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoRegisterTeachers}
                          onChange={(e) => setAutoRegisterTeachers(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded-md text-amber-600 accent-amber-600 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-slate-900">
                            Daftarkan {newTeachersFound.length} Guru Pengampu baru ke Master Guru
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Nama terdeteksi: {newTeachersFound.slice(0, 4).join(', ')}
                            {newTeachersFound.length > 4 ? ` (+${newTeachersFound.length - 4} lainnya)` : ''}
                          </p>
                        </div>
                      </label>
                    )}

                    {newClassesFound.length > 0 && (
                      <label className="flex items-start gap-2.5 text-xs text-slate-700 cursor-pointer pt-1 border-t border-amber-200/60">
                        <input
                          type="checkbox"
                          checked={autoRegisterClasses}
                          onChange={(e) => setAutoRegisterClasses(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded-md text-amber-600 accent-amber-600 cursor-pointer"
                        />
                        <div>
                          <span className="font-bold text-slate-900">
                            Daftarkan {newClassesFound.length} Rombel/Kelas baru ke Master Kelas
                          </span>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Rombel terdeteksi: {newClassesFound.join(', ')}
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                )}

                {/* Table Preview */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">
                      Tabel Pratinjau Mata Pelajaran ({parsedExcelSubjects.length} Baris):
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Periksa nama, kode, dan guru pengampu sebelum menerapkan
                    </span>
                  </div>

                  <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                    <div className="max-h-72 overflow-y-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 uppercase tracking-wider text-[10px] border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 w-12 text-center">No</th>
                            <th className="py-2.5 px-3 w-20">Kode</th>
                            <th className="py-2.5 px-4">Nama Mata Pelajaran</th>
                            <th className="py-2.5 px-4">Guru Pengampu</th>
                            <th className="py-2.5 px-3">Rombel</th>
                            <th className="py-2.5 px-3 text-center">KKTP (X | XI | XII)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {parsedExcelSubjects.map((s, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/80">
                              <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}
                              </td>
                              <td className="py-2 px-3">
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-200 text-[10px]">
                                  {s.kode}
                                </span>
                              </td>
                              <td className="py-2 px-4 font-bold text-slate-900 text-xs">
                                {s.nama}
                              </td>
                              <td className="py-2 px-4">
                                {s.guruPengampu && s.guruPengampu.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {s.guruPengampu.map((g, gIdx) => (
                                      <span
                                        key={gIdx}
                                        className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[10px] font-semibold border border-slate-200"
                                      >
                                        {g}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 italic text-[10px]">Belum ditentukan</span>
                                )}
                              </td>
                              <td className="py-2 px-3">
                                {s.kelasAjar && s.kelasAjar.length > 0 ? (
                                  <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-semibold">
                                    {s.kelasAjar.join(', ')}
                                  </span>
                                ) : (
                                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-semibold">
                                    Semua Tingkat
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-center font-bold text-slate-700 text-[11px]">
                                {s.kktpX} | {s.kktpXI} | {s.kktpXII}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
                <span className="text-xs text-slate-500 hidden sm:inline">
                  {importMode === 'replace'
                    ? 'Mode: Ganti Semua (data lama dibersihkan)'
                    : 'Mode: Gabungkan (data lama dipertahankan)'}
                </span>

                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsImportPreviewOpen(false)}
                    disabled={isApplyingImport}
                    className="px-4 py-2.5 text-slate-600 hover:bg-slate-200/70 rounded-xl font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmApplyImport}
                    disabled={isApplyingImport || parsedExcelSubjects.length === 0}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-2 text-xs transition-all active:scale-95"
                  >
                    {isApplyingImport ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Menyimpan ke Sistem...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Simpan & Terapkan ({parsedExcelSubjects.length} Mapel)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
