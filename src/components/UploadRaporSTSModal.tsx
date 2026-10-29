import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Student, Assessment, Submission } from '../types';
import {
  UploadCloud,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  X,
  FileText,
  Search,
  Sparkles,
  HelpCircle,
  Layers,
  BookOpen,
  Users,
  Check,
  RefreshCw,
  Award,
  BookmarkCheck,
  GraduationCap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { generateBloomDeepLearningCK } from '../utils/capaianKompetensi';
import { getKKTPKategori } from '../utils/kktpHelper';

export type AssessmentUploadType = 'ASTS' | 'ASAS' | 'FORMATIF' | 'SLM';

interface ParsedGradeRow {
  no?: number;
  nisn: string;
  nama: string;
  kelas: string;
  nilai: number;
  capaianKompetensi?: string;
  matchedStudent?: Student;
  isValid: boolean;
  validationError?: string;
}

interface UploadRaporSTSModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClass?: string;
  defaultSubject?: string;
  defaultJenis?: AssessmentUploadType;
  onSuccessSync?: (subject: string, className: string, jenis?: string) => void;
}

const ASSESSMENT_TYPES: Array<{
  id: AssessmentUploadType;
  label: string;
  shortLabel: string;
  badge: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  activeColorClass: string;
}> = [
  {
    id: 'ASTS',
    label: 'Rapor STS (Tengah Semester)',
    shortLabel: 'Rapor STS',
    badge: 'Bayangan/Sisipan',
    description: 'Nilai Asesmen Sumatif Tengah Semester (ASTS) untuk rapor bayangan dan arsip.',
    icon: Award,
    colorClass: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    activeColorClass: 'bg-indigo-600 text-white shadow-indigo-600/30',
  },
  {
    id: 'ASAS',
    label: 'Rapor SAS / SAT (Akhir Semester)',
    shortLabel: 'Rapor SAS',
    badge: 'Akhir Semester',
    description: 'Nilai Asesmen Sumatif Akhir Semester (ASAS / SAT) penentu rapor penuh.',
    icon: BookmarkCheck,
    colorClass: 'text-sky-600 bg-sky-50 border-sky-200',
    activeColorClass: 'bg-sky-600 text-white shadow-sky-600/30',
  },
  {
    id: 'FORMATIF',
    label: 'Formatif / Penugasan Harian',
    shortLabel: 'Formatif',
    badge: 'Tugas Harian',
    description: 'Nilai tugas harian, kuis, latihan terstruktur, dan pemantauan formatif.',
    icon: BookOpen,
    colorClass: 'text-amber-600 bg-amber-50 border-amber-200',
    activeColorClass: 'bg-amber-600 text-white shadow-amber-600/30',
  },
  {
    id: 'SLM',
    label: 'Sumatif Lingkup Materi (SLM)',
    shortLabel: 'Lingkup Materi',
    badge: 'Per Modul',
    description: 'Nilai asesmen sumatif per bab/lingkup materi kurikulum merdeka.',
    icon: Layers,
    colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    activeColorClass: 'bg-emerald-600 text-white shadow-emerald-600/30',
  },
];

export const UploadRaporSTSModal: React.FC<UploadRaporSTSModalProps> = ({
  isOpen,
  onClose,
  defaultClass,
  defaultSubject,
  defaultJenis = 'ASTS',
  onSuccessSync,
}) => {
  const { state, currentUser, saveAssessment, showToast } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const school = state.schoolInfo;

  // Selected assessment type
  const [targetJenis, setTargetJenis] = useState<AssessmentUploadType>(defaultJenis);

  // Form Configuration
  const [targetSubject, setTargetSubject] = useState<string>(() => {
    return defaultSubject || state.subjects[0]?.nama || 'Pendidikan Antikorupsi';
  });
  const [targetClass, setTargetClass] = useState<string>(() => {
    return defaultClass || state.classes[0]?.nama || 'X.1';
  });
  const [targetSemester, setTargetSemester] = useState<'Ganjil' | 'Genap'>(() => {
    return school.semesterAktif || 'Ganjil';
  });
  const [targetTahunAjaran, setTargetTahunAjaran] = useState<string>(() => {
    return school.tahunAjaranAktif || '2026/2027';
  });
  const [kktpTarget, setKktpTarget] = useState<number>(() => {
    const sbj = state.subjects.find((s) => s.nama.toLowerCase() === targetSubject.toLowerCase());
    return sbj?.kktp ?? 75;
  });

  // Upload & Parse State
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [parsedRows, setParsedRows] = useState<ParsedGradeRow[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [searchPreview, setSearchPreview] = useState<string>('');
  const [autoGenerateCK, setAutoGenerateCK] = useState<boolean>(true);

  // Sync KKTP when target subject changes
  const handleSubjectChange = (subjectName: string) => {
    setTargetSubject(subjectName);
    const sbj = state.subjects.find((s) => s.nama.toLowerCase() === subjectName.toLowerCase());
    if (sbj?.kktp) {
      setKktpTarget(sbj.kktp);
    }
  };

  // Helper function to clean string
  const cleanCanonical = (str: string) =>
    (str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const activeJenisMeta = useMemo(() => {
    return ASSESSMENT_TYPES.find((t) => t.id === targetJenis) || ASSESSMENT_TYPES[0];
  }, [targetJenis]);

  // Download official Excel Template pre-populated with active class students
  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Get students in the target class
    const studentsInClass = state.students
      .filter((s) => cleanCanonical(s.kelas) === cleanCanonical(targetClass))
      .sort((a, b) => (a.noUrut || 0) - (b.noUrut || 0));

    // Fallback if class has no students
    const sampleStudents =
      studentsInClass.length > 0
        ? studentsInClass
        : state.students.slice(0, 10);

    const headers = [
      [`FORMAT RESMI NILAI ${activeJenisMeta.label.toUpperCase()} - SMAN 3 TUMIJAJAR`],
      [`Mata Pelajaran: ${targetSubject}`],
      [`Rombongan Belajar: Kelas ${targetClass}`],
      [`Tahun Ajaran: ${targetTahunAjaran} | Semester: ${targetSemester}`],
      [`KKTP Mapel: ${kktpTarget} | Kategori Asesmen: ${targetJenis}`],
      [''],
      ['NO', 'NISN', 'NAMA SISWA', 'KELAS', `NILAI_${targetJenis} (0-100)`, 'CAPAIAN_KOMPETENSI (OPSIONAL)'],
    ];

    const dataRows = sampleStudents.map((std, idx) => [
      idx + 1,
      std.nisn || '',
      std.nama,
      std.kelas || targetClass,
      85, // Sample value
      `Menunjukkan penguasaan sangat baik dalam capaian pembelajaran ${targetSubject}.`,
    ]);

    const wsData = [...headers, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Merge title rows
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 5 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 5 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 5 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 5 } },
      { s: { r: 4, c: 0 }, e: { r: 4, c: 5 } },
    ];

    // Column widths
    ws['!cols'] = [
      { wch: 6 },  // NO
      { wch: 18 }, // NISN
      { wch: 36 }, // NAMA
      { wch: 12 }, // KELAS
      { wch: 22 }, // NILAI
      { wch: 60 }, // CAPAIAN_KOMPETENSI
    ];

    const sheetName = `Nilai ${targetJenis}`;
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const fileName = `FORMAT_NILAI_${targetJenis}_${cleanCanonical(targetSubject).toUpperCase()}_KELAS_${cleanCanonical(targetClass).toUpperCase()}.xlsx`;
    XLSX.writeFile(wb, fileName);

    showToast(
      'Format Berhasil Diunduh',
      `File format Excel "${fileName}" telah diunduh. Silakan isi nilai lalu unggah kembali.`,
      'success'
    );
  };

  // Parse Uploaded File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setUploadedFileName(file.name);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('Data file kosong');

        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert sheet to json array of arrays
        const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          blankrows: false,
        });

        if (rawJson.length === 0) {
          throw new Error('Lembar kerja Excel tidak memiliki data.');
        }

        // Find header row containing keywords: nisn, nama, nilai
        let headerRowIndex = -1;
        let colIndexMap = {
          no: -1,
          nisn: -1,
          nama: -1,
          kelas: -1,
          nilai: -1,
          ck: -1,
        };

        for (let r = 0; r < Math.min(15, rawJson.length); r++) {
          const row = rawJson[r];
          if (!Array.isArray(row)) continue;

          row.forEach((cell: any, c: number) => {
            const str = String(cell || '').toLowerCase().trim();
            if (str === 'no' || str === 'nomor' || str === 'no.') colIndexMap.no = c;
            if (str.includes('nisn') || str.includes('nomor induk') || str === 'nis') colIndexMap.nisn = c;
            if (str.includes('nama') || str.includes('siswa') || str.includes('peserta')) colIndexMap.nama = c;
            if (str.includes('kelas') || str.includes('rombel')) colIndexMap.kelas = c;
            if (
              str.includes('nilai') ||
              str.includes('sts') ||
              str.includes('sas') ||
              str.includes('sat') ||
              str.includes('pts') ||
              str.includes('pas') ||
              str.includes('formatif') ||
              str.includes('slm') ||
              str.includes('harian') ||
              str.includes('tugas') ||
              str.includes('skor') ||
              str.includes('score') ||
              str.includes('angka')
            ) {
              colIndexMap.nilai = c;
            }
            if (str.includes('capaian') || str.includes('kompetensi') || str.includes('ck') || str.includes('catatan') || str.includes('deskripsi')) {
              colIndexMap.ck = c;
            }
          });

          if (colIndexMap.nama !== -1 && colIndexMap.nilai !== -1) {
            headerRowIndex = r;
            break;
          }
        }

        if (headerRowIndex === -1 || colIndexMap.nama === -1 || colIndexMap.nilai === -1) {
          // Fallback heuristic: assume standard columns if header not matched
          colIndexMap = {
            no: 0,
            nisn: 1,
            nama: 2,
            kelas: 3,
            nilai: 4,
            ck: 5,
          };
          headerRowIndex = 0;
        }

        // Parse student rows
        const parsed: ParsedGradeRow[] = [];
        const existingStudents = state.students || [];

        for (let r = headerRowIndex + 1; r < rawJson.length; r++) {
          const row = rawJson[r];
          if (!Array.isArray(row) || row.length === 0) continue;

          const rawNama = String(row[colIndexMap.nama] || '').trim();
          if (!rawNama || rawNama.toLowerCase() === 'nama siswa') continue;

          const rawNisn = String(row[colIndexMap.nisn] || '').trim().replace(/[^0-9]/g, '');
          const rawKelas = String(row[colIndexMap.kelas] || targetClass).trim();
          
          let rawNilai = row[colIndexMap.nilai];
          if (typeof rawNilai === 'string') {
            rawNilai = parseFloat(rawNilai.replace(',', '.'));
          }
          const numNilai = typeof rawNilai === 'number' && !isNaN(rawNilai) ? Math.min(100, Math.max(0, Math.round(rawNilai))) : 0;
          const rawCK = colIndexMap.ck !== -1 ? String(row[colIndexMap.ck] || '').trim() : '';

          // Match student against school database
          let matched: Student | undefined = undefined;
          if (rawNisn) {
            matched = existingStudents.find((s) => s.nisn && s.nisn === rawNisn);
          }
          if (!matched && rawNama) {
            const canonicalNama = cleanCanonical(rawNama);
            matched = existingStudents.find(
              (s) =>
                cleanCanonical(s.nama) === canonicalNama ||
                s.nama.toLowerCase().includes(rawNama.toLowerCase()) ||
                rawNama.toLowerCase().includes(s.nama.toLowerCase())
            );
          }

          parsed.push({
            no: parsed.length + 1,
            nisn: rawNisn || matched?.nisn || '',
            nama: matched?.nama || rawNama,
            kelas: matched?.kelas || rawKelas || targetClass,
            nilai: numNilai,
            capaianKompetensi: rawCK || (autoGenerateCK ? generateBloomDeepLearningCK(numNilai, kktpTarget, targetSubject) : ''),
            matchedStudent: matched,
            isValid: true,
          });
        }

        if (parsed.length === 0) {
          throw new Error('Tidak ada baris data nilai siswa yang berhasil dibaca. Pastikan format kolom sesuai petunjuk.');
        }

        setParsedRows(parsed);
        setIsParsing(false);
        showToast(
          'File Berhasil Diproses',
          `Terdeteksi ${parsed.length} baris nilai ${activeJenisMeta.shortLabel} siswa siap disinkronkan ke Daftar Nilai.`,
          'success'
        );
      } catch (err: any) {
        setIsParsing(false);
        console.error('Excel parse error:', err);
        showToast('Gagal Membaca File', err.message || 'Format file Excel tidak dikenali.', 'error');
      }
    };

    reader.readAsBinaryString(file);
    if (e.target) e.target.value = '';
  };

  // Inline edit score in preview table
  const handleScoreChange = (index: number, newScore: number) => {
    setParsedRows((prev) => {
      const copy = [...prev];
      const bounded = Math.min(100, Math.max(0, newScore));
      copy[index] = {
        ...copy[index],
        nilai: bounded,
        capaianKompetensi: autoGenerateCK
          ? generateBloomDeepLearningCK(bounded, kktpTarget, targetSubject)
          : copy[index].capaianKompetensi,
      };
      return copy;
    });
  };

  // Save & Sync to Assessment Bank and Daftar Nilai
  const handleSaveAndSync = async () => {
    if (parsedRows.length === 0) {
      showToast('Tidak Ada Data', 'Silakan unggah file Excel nilai terlebih dahulu.', 'warning');
      return;
    }

    setIsSaving(true);

    try {
      const mappedJenis: 'ASTS' | 'ASAS' = targetJenis === 'ASAS' ? 'ASAS' : 'ASTS';

      // Find if an assessment already exists for this subject, class, school year, semester, and assessment type
      const existingAsm = state.assessments.find(
        (a) =>
          a.jenis === mappedJenis &&
          cleanCanonical(a.mataPelajaran) === cleanCanonical(targetSubject) &&
          (cleanCanonical(a.kelas) === cleanCanonical(targetClass) ||
            cleanCanonical(a.kelas).includes(cleanCanonical(targetClass))) &&
          a.tahunAjaran === targetTahunAjaran &&
          a.semester === targetSemester
      );

      const assessmentId = existingAsm?.id || `asm-${targetJenis.toLowerCase()}-${Date.now()}`;
      const nowIsoTime = new Date().toISOString().replace('T', ' ').substring(0, 16);

      // Map parsed rows to Submission objects
      const existingSubmissions = existingAsm?.submissions ? [...existingAsm.submissions] : [];

      parsedRows.forEach((row, idx) => {
        const studentId = row.matchedStudent?.id || `std-sync-${cleanCanonical(row.nama)}-${idx}`;
        const score = row.nilai;
        const ckText =
          row.capaianKompetensi ||
          generateBloomDeepLearningCK(score, kktpTarget, targetSubject);

        const subIdx = existingSubmissions.findIndex(
          (s) =>
            (row.nisn && s.nisn === row.nisn) ||
            s.studentId === studentId ||
            cleanCanonical(s.studentName) === cleanCanonical(row.nama)
        );

        const newSub: Submission = {
          id: subIdx >= 0 ? existingSubmissions[subIdx].id : `sub-${targetJenis.toLowerCase()}-${Date.now()}-${idx}`,
          studentId,
          studentName: row.nama,
          nisn: row.nisn,
          kelas: row.kelas || targetClass,
          nilaiAkhir: score,
          nilaiMurni: score,
          statusKoreksi: `Sudah Diverifikasi (Impor ${activeJenisMeta.shortLabel} Admin)`,
          waktuKoreksi: nowIsoTime,
          tuntas: score >= kktpTarget,
          capaianKompetensi: ckText,
          verifiedByTeacher: true,
          verifiedAt: nowIsoTime,
          guruPengampu: currentUser?.nama || 'Administrator',
        };

        if (subIdx >= 0) {
          existingSubmissions[subIdx] = {
            ...existingSubmissions[subIdx],
            ...newSub,
          };
        } else {
          existingSubmissions.push(newSub);
        }
      });

      // Construct final Assessment
      const finalAssessment: Assessment = {
        id: assessmentId,
        judul: existingAsm?.judul || `${activeJenisMeta.label} - ${targetSubject}`,
        jenis: mappedJenis,
        mataPelajaran: targetSubject,
        kelas: targetClass,
        fase: targetClass.startsWith('X.') ? 'Fase E' : 'Fase F',
        hariTanggal: existingAsm?.hariTanggal || new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
        pukul: existingAsm?.pukul || '07:30 - 09:30 WIB',
        waktuMenit: existingAsm?.waktuMenit || 90,
        guruPengampu: existingAsm?.guruPengampu || currentUser?.nama || 'Administrator',
        guruId: existingAsm?.guruId || currentUser?.id,
        tahunAjaran: targetTahunAjaran,
        semester: targetSemester,
        kktp: kktpTarget,
        jumlahSoal: existingAsm?.jumlahSoal || 10,
        petunjukUmum: existingAsm?.petunjukUmum || 'Kerjakan seluruh soal dengan jujur dan teliti.',
        essayRubrik: existingAsm?.essayRubrik || [],
        mcqQuestions: existingAsm?.mcqQuestions || [],
        submissions: existingSubmissions,
      };

      // Save into AppContext & Persistent Cloud/LocalStorage
      saveAssessment(finalAssessment);

      // Trigger Confetti Celebration
      try {
        confetti({
          particleCount: 85,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {
        // Fallback gracefully
      }

      showToast(
        'Sinkronisasi Sukses!',
        `Data nilai ${activeJenisMeta.shortLabel} (${parsedRows.length} siswa) berhasil disimpan dan terintegrasi otomatis ke Daftar Nilai.`,
        'success'
      );

      if (onSuccessSync) {
        onSuccessSync(targetSubject, targetClass, targetJenis);
      }

      setIsSaving(false);
      onClose();
    } catch (err: any) {
      setIsSaving(false);
      console.error('Error saving assessment:', err);
      showToast('Gagal Menyimpan Data', err.message || 'Terjadi kesalahan saat menyimpan nilai.', 'error');
    }
  };

  // Preview filtering and analytics
  const filteredRows = useMemo(() => {
    if (!searchPreview.trim()) return parsedRows;
    const q = searchPreview.toLowerCase().trim();
    return parsedRows.filter(
      (r) =>
        r.nama.toLowerCase().includes(q) ||
        r.nisn.includes(q) ||
        r.kelas.toLowerCase().includes(q)
    );
  }, [parsedRows, searchPreview]);

  const summaryStats = useMemo(() => {
    if (parsedRows.length === 0) {
      return { total: 0, avg: 0, highest: 0, lowest: 0, tuntas: 0, tuntasPct: 0 };
    }
    const total = parsedRows.length;
    const scores = parsedRows.map((r) => r.nilai);
    const sum = scores.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / total);
    const highest = Math.max(...scores);
    const lowest = Math.min(...scores);
    const tuntas = parsedRows.filter((r) => r.nilai >= kktpTarget).length;
    const tuntasPct = Math.round((tuntas / total) * 100);

    return { total, avg, highest, lowest, tuntas, tuntasPct };
  }, [parsedRows, kktpTarget]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] sm:max-h-[calc(100dvh-3rem)] my-auto"
      >
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-sm shrink-0">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Upload &amp; Impor Nilai Asesmen &amp; Rapor
                </h3>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sinkron Otomatis ke Daftar Nilai
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Mendukung Rapor STS (Tengah Semester), Rapor SAS (Akhir Semester), Formatif Harian, dan Lingkup Materi.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 min-h-0 overscroll-contain scrollbar-thin">
          {/* Assessment Type Selector Bar */}
          <div>
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>1. Pilih Kategori &amp; Jenis Nilai yang Akan Diunggah:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ASSESSMENT_TYPES.map((type) => {
                const isSelected = targetJenis === type.id;
                const Icon = type.icon;
                return (
                  <motion.button
                    key={type.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setTargetJenis(type.id)}
                    className={`p-3 rounded-2xl border-2 text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? `${type.activeColorClass} border-transparent shadow-md`
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-white/20 text-white' : type.colorClass
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span
                          className={`text-[9.5px] font-black px-1.5 py-0.5 rounded-md ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {type.badge}
                        </span>
                      </div>
                      <div className={`text-xs font-extrabold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {type.label}
                      </div>
                    </div>
                    <div
                      className={`text-[10px] mt-2 font-medium line-clamp-2 ${
                        isSelected ? 'text-white/80' : 'text-slate-500'
                      }`}
                    >
                      {type.description}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Target Configuration Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/80">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>2. Parameter Target Kelas &amp; Mata Pelajaran:</span>
              </span>
              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDownloadTemplate}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-200 text-xs font-bold shadow-2xs transition-all cursor-pointer"
                title={`Unduh format Excel resmi untuk ${activeJenisMeta.shortLabel} Kelas ${targetClass}`}
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Unduh Format Excel Kelas {targetClass} ({targetJenis})</span>
              </motion.button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Mata Pelajaran */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mata Pelajaran:
                </label>
                <select
                  value={targetSubject}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {state.subjects.map((s) => (
                    <option key={s.id} value={s.nama}>
                      {s.nama} (KKTP: {s.kktp || 75})
                    </option>
                  ))}
                </select>
              </div>

              {/* Rombel Kelas */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Rombongan Belajar (Kelas):
                </label>
                <select
                  value={targetClass}
                  onChange={(e) => setTargetClass(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {state.classes.map((c) => (
                    <option key={c.id} value={c.nama}>
                      Kelas {c.nama} ({c.fase || 'Fase E'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Semester & Tahun Ajaran */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Semester &amp; Tahun Pelajaran:
                </label>
                <select
                  value={targetSemester}
                  onChange={(e) => setTargetSemester(e.target.value as any)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="Ganjil">Semester Ganjil ({targetTahunAjaran})</option>
                  <option value="Genap">Semester Genap ({targetTahunAjaran})</option>
                </select>
              </div>

              {/* KKTP Mapel */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  KKTP Kelulusan (Nilai):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={kktpTarget}
                  onChange={(e) => setKktpTarget(parseInt(e.target.value) || 75)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Upload Dropzone */}
          <div className="p-6 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/30 transition-all text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="hidden"
            />

            <div className="max-w-md mx-auto space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
                <FileSpreadsheet className="w-6 h-6" />
              </div>

              <div>
                <h4 className="text-sm font-extrabold text-slate-900">
                  Pilih atau Tarik File Excel Nilai {activeJenisMeta.shortLabel} (.xlsx / .xls)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Mendukung file Excel dari format download maupun rekap mandiri guru. Kolom yang dibaca: NISN, Nama, Nilai ({targetJenis}), dan Capaian Kompetensi.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{isParsing ? 'Membaca Data...' : 'Pilih File Excel'}</span>
                </motion.button>

                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-slate-500" />
                  <span>Download Format Excel</span>
                </button>
              </div>

              {uploadedFileName && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold mt-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>File Terunggah: <strong>{uploadedFileName}</strong> ({parsedRows.length} baris terbaca)</span>
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Table & Validation Results */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              {/* Analytics Header Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Total Siswa</span>
                  <span className="text-lg font-black text-slate-900">{summaryStats.total}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Rata-Rata Kelas</span>
                  <span className="text-lg font-black text-indigo-700">{summaryStats.avg}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Tertinggi / Terendah</span>
                  <span className="text-lg font-black text-slate-900">{summaryStats.highest} / {summaryStats.lowest}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-700 block uppercase">Tuntas KKTP (&ge;{kktpTarget})</span>
                  <span className="text-lg font-black text-emerald-700">{summaryStats.tuntas} ({summaryStats.tuntasPct}%)</span>
                </div>
                <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200">
                  <span className="text-[10px] font-bold text-rose-700 block uppercase">Perlu Remedial</span>
                  <span className="text-lg font-black text-rose-700">{summaryStats.total - summaryStats.tuntas}</span>
                </div>
              </div>

              {/* Table Toolbar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>Pratinjau Data Nilai ({parsedRows.length} Siswa)</span>
                  </span>
                  <label className="flex items-center gap-1 text-[11px] font-bold text-slate-600 cursor-pointer select-none ml-2">
                    <input
                      type="checkbox"
                      checked={autoGenerateCK}
                      onChange={(e) => setAutoGenerateCK(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Otomatisasi Capaian Bloom</span>
                  </label>
                </div>

                <div className="relative max-w-xs w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchPreview}
                    onChange={(e) => setSearchPreview(e.target.value)}
                    placeholder="Cari siswa di pratinjau..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Scrollable Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white max-h-72 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold z-10">
                    <tr>
                      <th className="py-2.5 px-3 w-10 text-center">No</th>
                      <th className="py-2.5 px-3 w-28">NISN</th>
                      <th className="py-2.5 px-3">Nama Siswa</th>
                      <th className="py-2.5 px-3 w-20 text-center">Kelas</th>
                      <th className="py-2.5 px-3 w-24 text-center">Nilai {targetJenis}</th>
                      <th className="py-2.5 px-3 w-24 text-center">Status</th>
                      <th className="py-2.5 px-3">Capaian Pembelajaran (CK)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRows.map((row, idx) => {
                      const isTuntas = row.nilai >= kktpTarget;
                      const originalIndex = parsedRows.findIndex(
                        (r) => (row.nisn && r.nisn === row.nisn) || r.nama === row.nama
                      );
                      const targetIdx = originalIndex >= 0 ? originalIndex : idx;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 text-center font-bold text-slate-400">
                            {row.no || idx + 1}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-slate-600">
                            {row.nisn || <span className="text-slate-400 italic">-</span>}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-extrabold text-slate-900 block">{row.nama}</span>
                            {row.matchedStudent ? (
                              <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                                <Check className="w-3 h-3" /> Terdaftar di Data Induk
                              </span>
                            ) : (
                              <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Siswa Baru / Nama Berbeda
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-3 text-center font-semibold text-slate-700">
                            {row.kelas}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={row.nilai}
                              onChange={(e) =>
                                handleScoreChange(targetIdx, parseInt(e.target.value) || 0)
                              }
                              className={`w-16 px-2 py-1 text-center rounded-lg border font-black text-xs outline-none focus:ring-2 focus:ring-indigo-500 ${
                                isTuntas
                                  ? 'bg-emerald-50/80 text-emerald-800 border-emerald-300'
                                  : 'bg-rose-50/80 text-rose-800 border-rose-300'
                              }`}
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                                isTuntas
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {isTuntas ? 'Tuntas' : 'Remedial'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600 text-[11px] leading-relaxed max-w-xs truncate">
                            {row.capaianKompetensi}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Nilai yang diunggah akan otomatis terhubung ke <strong>Daftar Nilai Siswa</strong> {targetJenis === 'ASTS' ? 'dan Rapor STS' : ''}.
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              Batal
            </button>

            <motion.button
              type="button"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleSaveAndSync}
              disabled={isSaving || parsedRows.length === 0}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/30 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Menyimpan &amp; Menyinkronkan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Simpan &amp; Sinkronkan Nilai {activeJenisMeta.shortLabel}</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
